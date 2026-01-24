"""
Flight Data Service - WITH AIRPORT CODES IN ALL RESPONSES
"""
import asyncio
import aiohttp # type: ignore
import math
import random
from datetime import datetime
from typing import Dict, List, Optional
from app.config import settings


class FlightService:
    def __init__(self):
        self.flights_cache: Dict[str, dict] = {}
        self.last_api_call: Optional[datetime] = None
        self.api_call_count = 0
        self.use_mock_data = False
        
    async def fetch_from_airlabs(self) -> List[dict]:
        """Fetch real flight data from Airlabs API"""
        if not settings.AIRLABS_API_KEY:
            print("⚠️ Airlabs API key not configured - using mock data")
            self.use_mock_data = True
            return self.generate_mock_flights()
        
        params = {"api_key": settings.AIRLABS_API_KEY}
        
        if settings.FLIGHT_BBOX:
            params["bbox"] = settings.FLIGHT_BBOX
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    # "https://airlabs.co/api/v9/flights",
                    settings.AIRLABS_FLIGHTS_URL,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        self.api_call_count += 1
                        
                        flights = data.get("response", [])
                        if len(flights) == 0:
                            print("⚠️ Airlabs returned 0 flights - using mock data")
                            self.use_mock_data = True
                            return self.generate_mock_flights()
                        
                        return flights
                    else:
                        print(f"⚠️ Airlabs API error {resp.status} - using mock data")
                        self.use_mock_data = True
                        return self.generate_mock_flights()
        except Exception as e:
            print(f"❌ Airlabs fetch error: {e} - using mock data")
            self.use_mock_data = True
            return self.generate_mock_flights()
    
    def generate_mock_flights(self) -> List[dict]:
        """Generate realistic mock flight data WITH COMPLETE AIRPORT CODES"""
        
        airports = [
            {"lat": 40.6413, "lng": -73.7781, "iata": "JFK", "icao": "KJFK", "city": "New York"},
            {"lat": 51.4700, "lng": -0.4543, "iata": "LHR", "icao": "EGLL", "city": "London"},
            {"lat": 35.5494, "lng": 139.7798, "iata": "NRT", "icao": "RJAA", "city": "Tokyo"},
            {"lat": 1.3644, "lng": 103.9915, "iata": "SIN", "icao": "WSSS", "city": "Singapore"},
            {"lat": 28.5562, "lng": 77.1000, "iata": "DEL", "icao": "VIDP", "city": "Delhi"},
            {"lat": 25.2532, "lng": 55.3657, "iata": "DXB", "icao": "OMDB", "city": "Dubai"},
            {"lat": 37.6213, "lng": -122.3790, "iata": "SFO", "icao": "KSFO", "city": "San Francisco"},
            {"lat": 33.9416, "lng": -118.4085, "iata": "LAX", "icao": "KLAX", "city": "Los Angeles"},
            {"lat": 41.9742, "lng": -87.9073, "iata": "ORD", "icao": "KORD", "city": "Chicago"},
            {"lat": 49.0097, "lng": 2.5479, "iata": "CDG", "icao": "LFPG", "city": "Paris"},
        ]
        
        airlines = [
            {"icao": "UAL", "name": "United"},
            {"icao": "DAL", "name": "Delta"},
            {"icao": "AAL", "name": "American"},
            {"icao": "BAW", "name": "British Airways"},
            {"icao": "JAL", "name": "Japan Airlines"},
            {"icao": "SIA", "name": "Singapore Airlines"},
            {"icao": "UAE", "name": "Emirates"},
            {"icao": "DLH", "name": "Lufthansa"},
        ]
        
        aircraft_types = ["B738", "A320", "B777", "A359", "B787", "A350"]
        
        flights = []
        
        for i in range(50):
            dep_airport = random.choice(airports)
            arr_airport = random.choice([a for a in airports if a["iata"] != dep_airport["iata"]])
            airline = random.choice(airlines)
            
            progress = random.uniform(0.2, 0.8)
            lat = dep_airport["lat"] + (arr_airport["lat"] - dep_airport["lat"]) * progress
            lng = dep_airport["lng"] + (arr_airport["lng"] - dep_airport["lng"]) * progress
            
            lat += (random.random() - 0.5) * 2
            lng += (random.random() - 0.5) * 2
            
            heading = self.calculate_bearing(lat, lng, arr_airport["lat"], arr_airport["lng"])
            flight_number = f"{airline['icao']}{random.randint(100, 9999)}"
            
            flight = {
                "flight_icao": flight_number,
                "hex": f"mock{i:03d}",
                "reg_number": f"N{i:05d}",
                "lat": lat,
                "lng": lng,
                "alt": random.randint(25000, 40000),
                "speed": random.randint(400, 550),
                "dir": heading,
                "aircraft_icao": random.choice(aircraft_types),
                "airline_icao": airline["icao"],
                "status": "en-route",
                # ✅ AIRPORT CODES
                "dep_iata": dep_airport["iata"],
                "dep_icao": dep_airport["icao"],
                "arr_iata": arr_airport["iata"],
                "arr_icao": arr_airport["icao"],
                "flag": "US",
            }
            flights.append(flight)
        
        return flights
    
    def calculate_bearing(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate bearing from point 1 to point 2"""
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        lng_diff = math.radians(lng2 - lng1)
        
        x = math.sin(lng_diff) * math.cos(lat2_rad)
        y = math.cos(lat1_rad) * math.sin(lat2_rad) - math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(lng_diff)
        
        bearing = math.degrees(math.atan2(x, y))
        return (bearing + 360) % 360
    
    def update_cache_from_api(self, api_response: List[dict]):
        """Store flight data in cache with airport codes"""
        self.last_api_call = datetime.utcnow()
        valid_count = 0
        skipped_count = 0
        
        for flight in api_response:
            flight_id = flight.get("flight_icao") or flight.get("hex") or flight.get("reg_number")
            if not flight_id:
                skipped_count += 1
                continue
            
            try:
                lat = flight.get("lat")
                lng = flight.get("lng")
                
                if lat is None or lng is None:
                    skipped_count += 1
                    continue
                
                lat_float = float(lat)
                lng_float = float(lng)
                alt_float = float(flight.get("alt") or 0)
                speed_float = float(flight.get("speed") or 0)
                heading_float = float(flight.get("dir") or 0)
                
                if abs(lat_float) > 90 or abs(lng_float) > 180:
                    skipped_count += 1
                    continue
                
                # ✅ PRESERVE ALL AIRPORT DATA
                self.flights_cache[flight_id] = {
                    "id": flight_id,
                    "callsign": flight.get("flight_icao"),
                    "lat": lat_float,
                    "lng": lng_float,
                    "alt": alt_float,
                    "speed": speed_float,
                    "heading": heading_float,
                    "aircraft": flight.get("aircraft_icao"),
                    "status": flight.get("status", "en-route"),
                    "updated_at": self.last_api_call,
                    "dep_iata": flight.get("dep_iata"),
                    "dep_icao": flight.get("dep_icao"),
                    "arr_iata": flight.get("arr_iata"),
                    "arr_icao": flight.get("arr_icao"),
                    "airline_icao": flight.get("airline_icao"),
                }
                valid_count += 1
                
            except (ValueError, TypeError) as e:
                if skipped_count < 5:
                    print(f"⚠️ Skipping invalid flight {flight_id}: {e}")
                skipped_count += 1
                continue
        
        if skipped_count > 0:
            print(f"📊 Processed: {valid_count} valid, {skipped_count} skipped")
    
    def interpolate_position(self, flight_id: str) -> Optional[dict]:
        """Calculate interpolated position - PRESERVES AIRPORT CODES"""
        if flight_id not in self.flights_cache:
            return None
        
        flight = self.flights_cache[flight_id]
        elapsed = (datetime.utcnow() - flight["updated_at"]).total_seconds()
        
        if elapsed > 300:
            return None
        
        speed_ms = flight["speed"] * 1000 / 3600
        distance_m = speed_ms * elapsed
        
        heading_rad = math.radians(flight["heading"])
        lat_rad = math.radians(flight["lat"])
        
        R = 6371000
        
        new_lat_rad = math.asin(
            math.sin(lat_rad) * math.cos(distance_m / R) +
            math.cos(lat_rad) * math.sin(distance_m / R) * math.cos(heading_rad)
        )
        
        new_lng_rad = math.radians(flight["lng"]) + math.atan2(
            math.sin(heading_rad) * math.sin(distance_m / R) * math.cos(lat_rad),
            math.cos(distance_m / R) - math.sin(lat_rad) * math.sin(new_lat_rad)
        )
        
        # ✅ RETURN ALL FIELDS INCLUDING AIRPORT CODES
        return {
            **flight,  # This includes dep_iata, arr_iata, etc.
            "lat": math.degrees(new_lat_rad),
            "lng": math.degrees(new_lng_rad),
            "interpolated": True,
            "seconds_since_update": int(elapsed)
        }
    
    def get_all_interpolated(self) -> List[dict]:
        """Get all flights with interpolated positions"""
        positions = []
        for flight_id in list(self.flights_cache.keys()):
            pos = self.interpolate_position(flight_id)
            if pos:
                positions.append(pos)
            else:
                del self.flights_cache[flight_id]
        return positions
    
    async def background_update_loop(self):
        """Background task to fetch data"""
        print("🚀 Flight update loop started")
        
        while True:
            try:
                flights = await self.fetch_from_airlabs()
                if flights:
                    self.update_cache_from_api(flights)
                    mode = "MOCK" if self.use_mock_data else "REAL"
                    print(f"✅ Cached {len(self.flights_cache)} {mode} flights (API calls: {self.api_call_count})")
                else:
                    print("⚠️ No flights returned")
            except Exception as e:
                print(f"❌ Flight update error: {e}")
            
            await asyncio.sleep(settings.AIRLABS_FETCH_INTERVAL)


flight_service = FlightService()