# """
# Airport Data Service - Fetches airport info and schedules from AirLabs
# """
# import asyncio
# import aiohttp # type: ignore
# from datetime import datetime
# from typing import Dict, List, Optional
# from app.config import settings


# class AirportService:
#     def __init__(self):
#         self.airport_cache: Dict[str, dict] = {}
#         self.schedules_cache: Dict[str, dict] = {}
#         self.last_api_call: Optional[datetime] = None
#         self.api_call_count = 0
        
#     async def get_airport_info(self, airport_code: str) -> Optional[dict]:
#         """
#         Get airport information from AirLabs
#         Checks cache first, then fetches if needed
#         """
#         # Check cache (valid for 24 hours)
#         if airport_code in self.airport_cache:
#             cached = self.airport_cache[airport_code]
#             cache_age = (datetime.utcnow() - cached["cached_at"]).total_seconds()
#             if cache_age < 86400:  # 24 hours
#                 return cached["data"]
        
#         # Fetch from API
#         if not settings.AIRLABS_API_KEY:
#             return self._get_mock_airport(airport_code)
        
#         try:
#             async with aiohttp.ClientSession() as session:
#                 # Try IATA code first
#                 url = f"{settings.AIRLABS_BASE_URL}/airports"
#                 params = {
#                     "api_key": settings.AIRLABS_API_KEY,
#                     "iata_code": airport_code
#                 }
                
#                 async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp:
#                     if resp.status == 200:
#                         data = await resp.json()
#                         airports = data.get("response", [])
                        
#                         if airports and len(airports) > 0:
#                             airport_data = airports[0]
#                             self.airport_cache[airport_code] = {
#                                 "data": airport_data,
#                                 "cached_at": datetime.utcnow()
#                             }
#                             self.api_call_count += 1
#                             self.last_api_call = datetime.utcnow()
#                             return airport_data
                        
#                         # Try ICAO code if IATA failed
#                         params = {
#                             "api_key": settings.AIRLABS_API_KEY,
#                             "icao_code": airport_code
#                         }
                        
#                         async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp2:
#                             if resp2.status == 200:
#                                 data2 = await resp2.json()
#                                 airports2 = data2.get("response", [])
                                
#                                 if airports2 and len(airports2) > 0:
#                                     airport_data = airports2[0]
#                                     self.airport_cache[airport_code] = {
#                                         "data": airport_data,
#                                         "cached_at": datetime.utcnow()
#                                     }
#                                     self.api_call_count += 1
#                                     return airport_data
        
#         except Exception as e:
#             print(f"⚠️ Error fetching airport info: {e}")
        
#         return self._get_mock_airport(airport_code)
    
#     async def get_schedules(
#         self, 
#         airport_code: str, 
#         schedule_type: str = "arrivals",
#         limit: int = 50
#     ) -> List[dict]:
#         """
#         Get airport schedules (arrivals or departures) from AirLabs
#         """
#         cache_key = f"{airport_code}_{schedule_type}"
        
#         # Check cache (valid for 5 minutes)
#         if cache_key in self.schedules_cache:
#             cached = self.schedules_cache[cache_key]
#             cache_age = (datetime.utcnow() - cached["cached_at"]).total_seconds()
#             if cache_age < 300:  # 5 minutes
#                 return cached["data"][:limit]
        
#         # Fetch from API
#         if not settings.AIRLABS_API_KEY:
#             return self._get_mock_schedules(airport_code, schedule_type, limit)
        
#         try:
#             async with aiohttp.ClientSession() as session:
#                 url = f"{settings.AIRLABS_BASE_URL}/schedules"
                
#                 # Determine parameter based on schedule type
#                 if schedule_type == "arrivals":
#                     params = {
#                         "api_key": settings.AIRLABS_API_KEY,
#                         "arr_iata": airport_code
#                     }
#                 else:
#                     params = {
#                         "api_key": settings.AIRLABS_API_KEY,
#                         "dep_iata": airport_code
#                     }
                
#                 async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=15)) as resp:
#                     if resp.status == 200:
#                         data = await resp.json()
#                         schedules = data.get("response", [])
                        
#                         # Cache the results
#                         self.schedules_cache[cache_key] = {
#                             "data": schedules,
#                             "cached_at": datetime.utcnow()
#                         }
#                         self.api_call_count += 1
#                         self.last_api_call = datetime.utcnow()
                        
#                         print(f"✅ Fetched {len(schedules)} {schedule_type} for {airport_code}")
#                         return schedules[:limit]
#                     else:
#                         print(f"⚠️ Schedules API error {resp.status}")
        
#         except Exception as e:
#             print(f"⚠️ Error fetching schedules: {e}")
        
#         return self._get_mock_schedules(airport_code, schedule_type, limit)
    
#     async def get_delayed_flights(self, airport_code: str) -> List[dict]:
#         """
#         Get delayed flights for an airport
#         """
#         # Get both arrivals and departures
#         arrivals = await self.get_schedules(airport_code, "arrivals", limit=100)
#         departures = await self.get_schedules(airport_code, "departures", limit=100)
        
#         all_flights = arrivals + departures
        
#         # Filter for delayed flights
#         delayed = [
#             flight for flight in all_flights
#             if flight.get("delayed") and flight.get("delayed") > 0
#         ]
        
#         return delayed
    
#     async def get_airport_stats(self, airport_code: str) -> Optional[dict]:
#         """
#         Calculate airport statistics
#         """
#         arrivals = await self.get_schedules(airport_code, "arrivals", limit=200)
#         departures = await self.get_schedules(airport_code, "departures", limit=200)
        
#         all_flights = arrivals + departures
        
#         delayed_count = len([f for f in all_flights if f.get("delayed") and f.get("delayed") > 0])
#         cancelled_count = len([f for f in all_flights if f.get("status") == "cancelled"])
#         active_count = len([f for f in all_flights if f.get("status") == "active"])
        
#         return {
#             "total_arrivals_today": len(arrivals),
#             "total_departures_today": len(departures),
#             "delayed_flights": delayed_count,
#             "cancelled_flights": cancelled_count,
#             "active_flights": active_count
#         }
    
#     def _get_mock_airport(self, airport_code: str) -> dict:
#         """Generate mock airport data"""
#         mock_airports = {
#             "JFK": {
#                 "iata_code": "JFK",
#                 "icao_code": "KJFK",
#                 "name": "John F. Kennedy International Airport",
#                 "city": "New York",
#                 "country": "United States",
#                 "country_code": "US",
#                 "lat": 40.6413,
#                 "lng": -73.7781,
#                 "timezone": "America/New_York"
#             },
#             "LAX": {
#                 "iata_code": "LAX",
#                 "icao_code": "KLAX",
#                 "name": "Los Angeles International Airport",
#                 "city": "Los Angeles",
#                 "country": "United States",
#                 "country_code": "US",
#                 "lat": 33.9416,
#                 "lng": -118.4085,
#                 "timezone": "America/Los_Angeles"
#             },
#             "LHR": {
#                 "iata_code": "LHR",
#                 "icao_code": "EGLL",
#                 "name": "London Heathrow Airport",
#                 "city": "London",
#                 "country": "United Kingdom",
#                 "country_code": "GB",
#                 "lat": 51.4700,
#                 "lng": -0.4543,
#                 "timezone": "Europe/London"
#             }
#         }
        
#         return mock_airports.get(
#             airport_code.upper(),
#             {
#                 "iata_code": airport_code,
#                 "name": f"{airport_code} Airport",
#                 "city": "Unknown",
#                 "country": "Unknown",
#                 "lat": 0,
#                 "lng": 0
#             }
#         )
    
#     def _get_mock_schedules(self, airport_code: str, schedule_type: str, limit: int) -> List[dict]:
#         """Generate mock schedule data"""
#         import random
#         from datetime import timedelta
        
#         airlines = ["UAL", "DAL", "AAL", "BAW", "AFR", "DLH", "SIA", "UAE"]
#         statuses = ["scheduled", "active", "landed", "cancelled", "delayed"]
        
#         schedules = []
#         now = datetime.utcnow()
        
#         for i in range(min(limit, 20)):
#             offset = timedelta(minutes=random.randint(-120, 240))
#             time = now + offset
            
#             flight = {
#                 "flight_iata": f"{random.choice(airlines)}{random.randint(100, 9999)}",
#                 "flight_icao": f"{random.choice(airlines)}{random.randint(100, 9999)}",
#                 "airline_iata": random.choice(airlines)[:2],
#                 "airline_icao": random.choice(airlines),
#                 "status": random.choice(statuses),
#                 "delayed": random.randint(0, 60) if random.random() < 0.3 else 0,
#             }
            
#             if schedule_type == "arrivals":
#                 flight.update({
#                     "arr_iata": airport_code,
#                     "arr_time": time.isoformat(),
#                     "arr_terminal": str(random.randint(1, 5)),
#                     "arr_gate": f"{random.choice('ABCDEFG')}{random.randint(1, 50)}",
#                     "dep_iata": random.choice(["LAX", "SFO", "ORD", "ATL", "DFW"])
#                 })
#             else:
#                 flight.update({
#                     "dep_iata": airport_code,
#                     "dep_time": time.isoformat(),
#                     "dep_terminal": str(random.randint(1, 5)),
#                     "dep_gate": f"{random.choice('ABCDEFG')}{random.randint(1, 50)}",
#                     "arr_iata": random.choice(["LAX", "SFO", "ORD", "ATL", "DFW"])
#                 })
            
#             schedules.append(flight)
        
#         return schedules


# airport_service = AirportService()

"""
Airport Data Service - Fetches airport info and schedules from AirLabs
"""
import asyncio
import aiohttp # type: ignore
from datetime import datetime
from typing import Dict, List, Optional
from app.config import settings


class AirportService:
    def __init__(self):
        self.airport_cache: Dict[str, dict] = {}
        self.schedules_cache: Dict[str, dict] = {}
        self.last_api_call: Optional[datetime] = None
        self.api_call_count = 0
        
    async def get_airport_info(self, airport_code: str) -> Optional[dict]:
        """
        Get airport information from AirLabs
        Checks cache first, then fetches if needed
        """
        # Check cache (valid for 24 hours)
        if airport_code in self.airport_cache:
            cached = self.airport_cache[airport_code]
            cache_age = (datetime.utcnow() - cached["cached_at"]).total_seconds()
            if cache_age < 86400:  # 24 hours
                return cached["data"]
        
        # Fetch from API
        if not settings.AIRLABS_API_KEY:
            print("❌ No AirLabs API key configured - cannot fetch airport data")
            return None
        
        try:
            async with aiohttp.ClientSession() as session:
                # Try IATA code first
                url = f"{settings.AIRLABS_BASE_URL}/airports"
                params = {
                    "api_key": settings.AIRLABS_API_KEY,
                    "iata_code": airport_code
                }
                
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        airports = data.get("response", [])
                        
                        if airports and len(airports) > 0:
                            airport_data = airports[0]
                            self.airport_cache[airport_code] = {
                                "data": airport_data,
                                "cached_at": datetime.utcnow()
                            }
                            self.api_call_count += 1
                            self.last_api_call = datetime.utcnow()
                            return airport_data
                        
                        # Try ICAO code if IATA failed
                        params = {
                            "api_key": settings.AIRLABS_API_KEY,
                            "icao_code": airport_code
                        }
                        
                        async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp2:
                            if resp2.status == 200:
                                data2 = await resp2.json()
                                airports2 = data2.get("response", [])
                                
                                if airports2 and len(airports2) > 0:
                                    airport_data = airports2[0]
                                    self.airport_cache[airport_code] = {
                                        "data": airport_data,
                                        "cached_at": datetime.utcnow()
                                    }
                                    self.api_call_count += 1
                                    return airport_data
                    else:
                        print(f"⚠️ AirLabs airport API error: {resp.status}")
        
        except Exception as e:
            print(f"⚠️ Error fetching airport info: {e}")
        
        print(f"⚠️ Airport not found: {airport_code}")
        return None
    
    async def get_schedules(
        self, 
        airport_code: str, 
        schedule_type: str = "arrivals",
        limit: int = 50
    ) -> List[dict]:
        """
        Get airport schedules (arrivals or departures) from AirLabs
        """
        cache_key = f"{airport_code}_{schedule_type}"
        
        # Check cache (valid for 5 minutes)
        if cache_key in self.schedules_cache:
            cached = self.schedules_cache[cache_key]
            cache_age = (datetime.utcnow() - cached["cached_at"]).total_seconds()
            if cache_age < 300:  # 5 minutes
                return cached["data"][:limit]
        
        # Fetch from API
        if not settings.AIRLABS_API_KEY:
            print("❌ No AirLabs API key configured - cannot fetch schedules")
            return []
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{settings.AIRLABS_BASE_URL}/schedules"
                
                # Determine parameter based on schedule type
                if schedule_type == "arrivals":
                    params = {
                        "api_key": settings.AIRLABS_API_KEY,
                        "arr_iata": airport_code
                    }
                else:
                    params = {
                        "api_key": settings.AIRLABS_API_KEY,
                        "dep_iata": airport_code
                    }
                
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        schedules = data.get("response", [])
                        
                        # Cache the results
                        self.schedules_cache[cache_key] = {
                            "data": schedules,
                            "cached_at": datetime.utcnow()
                        }
                        self.api_call_count += 1
                        self.last_api_call = datetime.utcnow()
                        
                        print(f"✅ Fetched {len(schedules)} {schedule_type} for {airport_code}")
                        return schedules[:limit]
                    else:
                        print(f"⚠️ Schedules API error {resp.status}")
        
        except Exception as e:
            print(f"⚠️ Error fetching schedules: {e}")
        
        print(f"⚠️ No schedules found for {airport_code}")
        return []
    
    async def get_delayed_flights(self, airport_code: str) -> List[dict]:
        """
        Get delayed flights for an airport
        """
        # Get both arrivals and departures
        arrivals = await self.get_schedules(airport_code, "arrivals", limit=100)
        departures = await self.get_schedules(airport_code, "departures", limit=100)
        
        all_flights = arrivals + departures
        
        # Filter for delayed flights
        delayed = [
            flight for flight in all_flights
            if flight.get("delayed") and flight.get("delayed") > 0
        ]
        
        return delayed
    
    async def get_airport_stats(self, airport_code: str) -> Optional[dict]:
        """
        Calculate airport statistics
        """
        arrivals = await self.get_schedules(airport_code, "arrivals", limit=200)
        departures = await self.get_schedules(airport_code, "departures", limit=200)
        
        all_flights = arrivals + departures
        
        delayed_count = len([f for f in all_flights if f.get("delayed") and f.get("delayed") > 0])
        cancelled_count = len([f for f in all_flights if f.get("status") == "cancelled"])
        active_count = len([f for f in all_flights if f.get("status") == "active"])
        
        return {
            "total_arrivals_today": len(arrivals),
            "total_departures_today": len(departures),
            "delayed_flights": delayed_count,
            "cancelled_flights": cancelled_count,
            "active_flights": active_count
        }


airport_service = AirportService()