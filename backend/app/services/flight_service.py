"""
Flight Data Service - Real API Data Only (No Mock Data)
"""
import asyncio
import aiohttp
import math
import time
from datetime import datetime
from typing import Dict, List, Optional
from app.config import settings


class FlightService:
    def __init__(self):
        self.flights_cache: Dict[str, dict] = {}
        self.last_api_call: Optional[datetime] = None
        self.api_call_count = 0
        self.is_ready = False
        self._initial_fetch_task: Optional[asyncio.Task] = None
        
        # Performance tracking
        self.api_response_times: List[float] = []
        self.api_failure_count = 0
        self.last_error: Optional[str] = None
        self.last_error_time: Optional[datetime] = None
        
    async def initialize(self):
        """Initialize and fetch real data"""
        if self.is_ready:
            return
            
        print("⚡ Flight service initializing...")
        
        # Try to fetch real data immediately
        try:
            flights = await self.fetch_from_airlabs()
            if flights:
                self.update_cache_from_api(flights)
                print(f"✅ Flight service ready with {len(self.flights_cache)} real flights")
            else:
                print("⚠️ No flights received from API")
        except Exception as e:
            print(f"⚠️ Initial fetch failed: {e}")
        
        self.is_ready = True
    
    async def fetch_from_airlabs(self) -> List[dict]:
        """Fetch from AirLabs API with improved timeout handling"""
        if not settings.AIRLABS_API_KEY:
            print("❌ No API key configured")
            return []
        
        params = {"api_key": settings.AIRLABS_API_KEY}
        if settings.FLIGHT_BBOX:
            params["bbox"] = settings.FLIGHT_BBOX
        
        timeout = aiohttp.ClientTimeout(total=30, connect=5, sock_read=15)
        start_time = time.time()
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(settings.AIRLABS_FLIGHTS_URL, params=params, timeout=timeout) as resp:
                    elapsed = time.time() - start_time
                    
                    if resp.status == 200:
                        data = await resp.json()
                        self.api_call_count += 1
                        flights = data.get("response", [])
                        
                        self.api_response_times.append(elapsed)
                        if len(self.api_response_times) > 100:
                            self.api_response_times.pop(0)
                        
                        avg_time = sum(self.api_response_times) / len(self.api_response_times)
                        print(f"✅ AirLabs API: {len(flights)} flights in {elapsed:.2f}s (avg: {avg_time:.2f}s)")
                        
                        if len(flights) == 0:
                            print("⚠️ Airlabs returned 0 flights")
                        
                        return flights
                    else:
                        self.api_failure_count += 1
                        self.last_error = f"HTTP {resp.status}"
                        self.last_error_time = datetime.utcnow()
                        print(f"⚠️ Airlabs API error {resp.status} after {elapsed:.2f}s")
                        return []
                        
        except asyncio.TimeoutError:
            elapsed = time.time() - start_time
            self.api_failure_count += 1
            self.last_error = f"Timeout after {elapsed:.2f}s"
            self.last_error_time = datetime.utcnow()
            print(f"⚠️ Airlabs timeout after {elapsed:.2f}s")
            return []
            
        except Exception as e:
            elapsed = time.time() - start_time
            self.api_failure_count += 1
            self.last_error = f"Error: {str(e)}"
            self.last_error_time = datetime.utcnow()
            print(f"⚠️ Airlabs error after {elapsed:.2f}s: {e}")
            return []
    
    def calculate_bearing(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate bearing between two points"""
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        lng_diff = math.radians(lng2 - lng1)
        
        x = math.sin(lng_diff) * math.cos(lat2_rad)
        y = math.cos(lat1_rad) * math.sin(lat2_rad) - math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(lng_diff)
        
        bearing = math.degrees(math.atan2(x, y))
        return (bearing + 360) % 360
    
    def update_cache_from_api(self, api_response: List[dict]):
        """Store flight data from API"""
        self.last_api_call = datetime.utcnow()
        valid_count = 0
        skipped_count = 0
        
        for flight in api_response:
            flight_id = flight.get("hex") or flight.get("flight_icao")
            if not flight_id:
                skipped_count += 1
                continue
            
            try:
                lat = float(flight.get("lat", 0))
                lng = float(flight.get("lng", 0))
                
                if abs(lat) > 90 or abs(lng) > 180:
                    skipped_count += 1
                    continue
                
                # Store previous position for v_speed calculation
                prev_data = self.flights_cache.get(flight_id)
                current_time = self.last_api_call.timestamp()
                
                # Calculate v_speed if we have previous data
                v_speed = flight.get("v_speed")
                if v_speed is None and prev_data:
                    time_diff = current_time - prev_data["updated"]
                    if time_diff > 0 and time_diff < 300:  # Less than 5 minutes
                        alt_diff = float(flight.get("alt", 0)) - prev_data["alt"]
                        # Convert to ft/min
                        v_speed = (alt_diff / time_diff) * 60
                        print(f"🔧 Calculated v_speed for {flight_id}: {v_speed:.0f} ft/min")
                
                self.flights_cache[flight_id] = {
                    "hex": flight_id,
                    "flight_icao": flight.get("flight_icao"),
                    "flight_number": flight.get("flight_number"),
                    "reg_number": flight.get("reg_number"),
                    "lat": lat,
                    "lng": lng,
                    "alt": float(flight.get("alt", 0)),
                    "dir": float(flight.get("dir", 0)),
                    "speed": float(flight.get("speed", 0)),
                    "v_speed": v_speed,  # Use calculated or API value
                    "aircraft_icao": flight.get("aircraft_icao"),
                    "airline_icao": flight.get("airline_icao"),
                    "flag": flight.get("flag"),
                    "dep_iata": flight.get("dep_iata"),
                    "dep_icao": flight.get("dep_icao"),
                    "arr_iata": flight.get("arr_iata"),
                    "arr_icao": flight.get("arr_icao"),
                    "status": flight.get("status", "en-route"),
                    "updated": int(current_time),
                    "interpolated": False,
                    "seconds_since_update": 0,
                }
                valid_count += 1
                
            except (ValueError, TypeError) as e:
                print(f"⚠️ Error processing flight {flight_id}: {e}")
                skipped_count += 1
                continue
        
        if valid_count > 0:
            print(f"📊 Cached: {valid_count} flights ({skipped_count} skipped)")
    
    def interpolate_position(self, flight_id: str) -> Optional[dict]:
        """Calculate interpolated position for smooth animation"""
        if flight_id not in self.flights_cache:
            return None
        
        flight = self.flights_cache[flight_id]
        elapsed = datetime.utcnow().timestamp() - flight["updated"]
        
        # Remove stale data (older than 5 minutes)
        if elapsed > 300:
            return None
        
        # Don't interpolate if speed is 0 or very low
        if flight["speed"] < 50:
            return {**flight, "interpolated": False, "seconds_since_update": int(elapsed)}
        
        # Calculate new position based on speed and heading
        speed_ms = flight["speed"] * 1000 / 3600  # Convert knots to m/s
        distance_m = speed_ms * elapsed
        heading_rad = math.radians(flight["dir"])
        lat_rad = math.radians(flight["lat"])
        R = 6371000  # Earth radius in meters
        
        new_lat_rad = math.asin(
            math.sin(lat_rad) * math.cos(distance_m / R) +
            math.cos(lat_rad) * math.sin(distance_m / R) * math.cos(heading_rad)
        )
        
        new_lng_rad = math.radians(flight["lng"]) + math.atan2(
            math.sin(heading_rad) * math.sin(distance_m / R) * math.cos(lat_rad),
            math.cos(distance_m / R) - math.sin(lat_rad) * math.sin(new_lat_rad)
        )
        
        return {
            **flight,
            "lat": math.degrees(new_lat_rad),
            "lng": math.degrees(new_lng_rad),
            "interpolated": True,
            "seconds_since_update": int(elapsed)
        }
    
    def get_all_interpolated(self) -> List[dict]:
        """Get all current flight positions with interpolation"""
        positions = []
        stale_flights = []
        
        for flight_id in list(self.flights_cache.keys()):
            pos = self.interpolate_position(flight_id)
            if pos:
                positions.append(pos)
            else:
                stale_flights.append(flight_id)
        
        # Remove stale flights
        for flight_id in stale_flights:
            del self.flights_cache[flight_id]
        
        if stale_flights:
            print(f"🧹 Removed {len(stale_flights)} stale flights")
        
        return positions
    
    async def background_update_loop(self):
        """Background task to periodically fetch new data"""
        print("🚀 Flight update loop started")
        await self.initialize()
        
        while True:
            try:
                flights = await self.fetch_from_airlabs()
                if flights:
                    self.update_cache_from_api(flights)
                    if self.api_call_count % 5 == 0:
                        print(f"✅ Updated {len(self.flights_cache)} flights (API call #{self.api_call_count})")
            except Exception as e:
                print(f"❌ Flight update error: {e}")
            
            await asyncio.sleep(settings.AIRLABS_FETCH_INTERVAL)
    
    def get_service_stats(self) -> dict:
        """Get service statistics"""
        avg_response_time = (
            sum(self.api_response_times) / len(self.api_response_times)
            if self.api_response_times else 0
        )
        
        return {
            "is_ready": self.is_ready,
            "total_flights": len(self.flights_cache),
            "api_call_count": self.api_call_count,
            "api_failure_count": self.api_failure_count,
            "success_rate": (
                (self.api_call_count - self.api_failure_count) / self.api_call_count * 100
                if self.api_call_count > 0 else 0
            ),
            "avg_response_time": avg_response_time,
            "last_api_call": self.last_api_call.isoformat() if self.last_api_call else None,
            "last_error": self.last_error,
            "last_error_time": self.last_error_time.isoformat() if self.last_error_time else None,
        }


flight_service = FlightService()