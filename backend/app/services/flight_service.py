"""
Flight Data Service - Real API Data Only
"""
import asyncio
import aiohttp
import math
import time
from datetime import datetime
from typing import Dict, List, Optional
from app.config import settings


def safe_float(value, default: float = 0.0) -> float:
    """Safely convert API values to float (handles None/null)"""
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


class FlightService:
    def __init__(self):
        self.flights_cache: Dict[str, dict] = {}
        self.last_api_call: Optional[datetime] = None
        self.api_call_count = 0
        self.is_ready = False

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
        """Fetch from AirLabs API"""
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
                async with session.get(
                    settings.AIRLABS_FLIGHTS_URL,
                    params=params,
                    timeout=timeout,
                ) as resp:
                    elapsed = time.time() - start_time

                    if resp.status == 200:
                        data = await resp.json()
                        self.api_call_count += 1
                        flights = data.get("response", [])

                        self.api_response_times.append(elapsed)
                        if len(self.api_response_times) > 100:
                            self.api_response_times.pop(0)

                        avg_time = sum(self.api_response_times) / len(self.api_response_times)
                        print(
                            f"✅ AirLabs API: {len(flights)} flights "
                            f"in {elapsed:.2f}s (avg: {avg_time:.2f}s)"
                        )

                        return flights

                    self.api_failure_count += 1
                    self.last_error = f"HTTP {resp.status}"
                    self.last_error_time = datetime.utcnow()
                    print(f"⚠️ AirLabs API error {resp.status} after {elapsed:.2f}s")
                    return []

        except asyncio.TimeoutError:
            elapsed = time.time() - start_time
            self.api_failure_count += 1
            self.last_error = f"Timeout after {elapsed:.2f}s"
            self.last_error_time = datetime.utcnow()
            print(f"⚠️ AirLabs timeout after {elapsed:.2f}s")
            return []

        except Exception as e:
            elapsed = time.time() - start_time
            self.api_failure_count += 1
            self.last_error = str(e)
            self.last_error_time = datetime.utcnow()
            print(f"⚠️ AirLabs error after {elapsed:.2f}s: {e}")
            return []

    def update_cache_from_api(self, api_response: List[dict]):
        """Store flight data from API"""
        self.last_api_call = datetime.utcnow()
        now_ts = int(self.last_api_call.timestamp())

        valid_count = 0
        skipped_count = 0

        for flight in api_response:
            flight_id = flight.get("hex") or flight.get("flight_icao")
            if not flight_id:
                skipped_count += 1
                continue

            lat = safe_float(flight.get("lat"))
            lng = safe_float(flight.get("lng"))

            # Reject invalid coordinates
            if abs(lat) > 90 or abs(lng) > 180 or (lat == 0 and lng == 0):
                skipped_count += 1
                continue

            prev = self.flights_cache.get(flight_id)

            alt = safe_float(flight.get("alt"))
            speed = safe_float(flight.get("speed"))
            direction = safe_float(flight.get("dir"))

            # Vertical speed
            v_speed = flight.get("v_speed")
            if v_speed is not None:
                v_speed = safe_float(v_speed)
            elif prev:
                time_diff = now_ts - prev["updated"]
                if 0 < time_diff < 300:
                    v_speed = (alt - prev["alt"]) / time_diff * 60
                else:
                    v_speed = 0.0
            else:
                v_speed = 0.0

            self.flights_cache[flight_id] = {
                "hex": flight_id,
                "flight_icao": flight.get("flight_icao"),
                "flight_number": flight.get("flight_number"),
                "reg_number": flight.get("reg_number"),
                "lat": lat,
                "lng": lng,
                "alt": alt,
                "dir": direction,
                "speed": speed,
                "v_speed": v_speed,
                "aircraft_icao": flight.get("aircraft_icao"),
                "airline_icao": flight.get("airline_icao"),
                "flag": flight.get("flag"),
                "dep_iata": flight.get("dep_iata"),
                "dep_icao": flight.get("dep_icao"),
                "arr_iata": flight.get("arr_iata"),
                "arr_icao": flight.get("arr_icao"),
                "status": flight.get("status", "en-route"),
                "updated": now_ts,
                "interpolated": False,
                "seconds_since_update": 0,
            }

            valid_count += 1

        if valid_count:
            print(f"📊 Cached: {valid_count} flights ({skipped_count} skipped)")

    def interpolate_position(self, flight_id: str) -> Optional[dict]:
        """Interpolate position for smooth animation"""
        flight = self.flights_cache.get(flight_id)
        if not flight:
            return None

        elapsed = datetime.utcnow().timestamp() - flight["updated"]
        if elapsed > 300:
            return None

        if flight["speed"] < 50:
            return {**flight, "interpolated": False, "seconds_since_update": int(elapsed)}

        speed_ms = flight["speed"] * 1000 / 3600
        distance_m = speed_ms * elapsed
        heading = math.radians(flight["dir"])
        lat_rad = math.radians(flight["lat"])
        R = 6371000

        new_lat = math.asin(
            math.sin(lat_rad) * math.cos(distance_m / R)
            + math.cos(lat_rad) * math.sin(distance_m / R) * math.cos(heading)
        )

        new_lng = math.radians(flight["lng"]) + math.atan2(
            math.sin(heading) * math.sin(distance_m / R) * math.cos(lat_rad),
            math.cos(distance_m / R) - math.sin(lat_rad) * math.sin(new_lat),
        )

        return {
            **flight,
            "lat": math.degrees(new_lat),
            "lng": math.degrees(new_lng),
            "interpolated": True,
            "seconds_since_update": int(elapsed),
        }

    def get_all_interpolated(self) -> List[dict]:
        """Return all current aircraft positions"""
        results = []
        stale = []

        for fid in list(self.flights_cache.keys()):
            pos = self.interpolate_position(fid)
            if pos:
                results.append(pos)
            else:
                stale.append(fid)

        for fid in stale:
            del self.flights_cache[fid]

        if stale:
            print(f"🧹 Removed {len(stale)} stale flights")

        return results

    async def background_update_loop(self):
        """Periodic background update"""
        print("🚀 Flight update loop started")
        await self.initialize()

        while True:
            try:
                flights = await self.fetch_from_airlabs()
                if flights:
                    self.update_cache_from_api(flights)
            except Exception as e:
                print(f"❌ Flight update error: {e}")

            await asyncio.sleep(settings.AIRLABS_FETCH_INTERVAL)

    def get_service_stats(self) -> dict:
        avg_time = (
            sum(self.api_response_times) / len(self.api_response_times)
            if self.api_response_times
            else 0
        )

        return {
            "is_ready": self.is_ready,
            "total_flights": len(self.flights_cache),
            "api_call_count": self.api_call_count,
            "api_failure_count": self.api_failure_count,
            "success_rate": (
                (self.api_call_count - self.api_failure_count)
                / self.api_call_count
                * 100
                if self.api_call_count
                else 0
            ),
            "avg_response_time": avg_time,
            "last_api_call": self.last_api_call.isoformat() if self.last_api_call else None,
            "last_error": self.last_error,
            "last_error_time": self.last_error_time.isoformat()
            if self.last_error_time
            else None,
        }

flight_service = FlightService()