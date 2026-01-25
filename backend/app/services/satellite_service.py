# """
# Satellite Data Service - WITH DEBRIS TRACKING
# """
# import asyncio
# import aiohttp # type: ignore
# from datetime import datetime
# from typing import Dict, List, Optional
# from skyfield.api import load, EarthSatellite, wgs84 # type: ignore
# from app.config import settings


# class SatelliteService:
#     def __init__(self):
#         self.tle_cache: Dict[str, dict] = {}
#         self.timescale = load.timescale()
#         self.last_api_call: Optional[datetime] = None
        
#     async def fetch_tle_data(self) -> List[str]:
#         """Fetch TLE data from CelesTrak - INCLUDING DEBRIS"""
#         urls = [
#             # Operational satellites
#             # ✅ SATELLITE SOURCES
#             settings.CELESTRAK_TLE_URLS1,
#             settings.CELESTRAK_TLE_URLS2,
#             settings.CELESTRAK_TLE_URLS3,
#             # ✅ DEBRIS SOURCES
#             settings.CELESTRAK_TLE_URLS4,
#             settings.CELESTRAK_TLE_URLS5,
#         ]
        
#         all_tle_data = []
        
#         try:
#             async with aiohttp.ClientSession() as session:
#                 for url in urls:
#                     try:
#                         async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
#                             if resp.status == 200:
#                                 text = await resp.text()
#                                 all_tle_data.append(text)
#                                 print(f"✅ Fetched TLE data from {url.split('GROUP=')[1].split('&')[0]}")
#                             else:
#                                 print(f"⚠️ CelesTrak returned status {resp.status} for {url}")
#                     except Exception as e:
#                         print(f"⚠️ Error fetching {url}: {e}")
#         except Exception as e:
#             print(f"❌ TLE fetch error: {e}")
        
#         return all_tle_data
    
#     def parse_tle(self, tle_text: str) -> Dict[str, dict]:
#         """Parse TLE format into satellite data with type classification"""
#         lines = tle_text.strip().split('\n')
#         satellites = {}
        
#         i = 0
#         while i < len(lines):
#             if i + 2 < len(lines):
#                 try:
#                     name = lines[i].strip()
#                     tle1 = lines[i + 1].strip()
#                     tle2 = lines[i + 2].strip()
                    
#                     if tle1.startswith('1 ') and tle2.startswith('2 '):
#                         norad_id = tle1.split()[1].rstrip('U')
                        
#                         # ✅ CLASSIFY AS SATELLITE OR DEBRIS
#                         object_type = self.classify_object(name, tle1, tle2)
                        
#                         satellites[norad_id] = {
#                             "norad_id": norad_id,
#                             "name": name,
#                             "tle1": tle1,
#                             "tle2": tle2,
#                             "object_type": object_type  # 'satellite' or 'debris'
#                         }
                    
#                     i += 3
#                 except Exception as e:
#                     print(f"⚠️ Error parsing TLE at line {i}: {e}")
#                     i += 1
#             else:
#                 i += 1
        
#         return satellites
    
#     def classify_object(self, name: str, tle1: str, tle2: str) -> str:
#         """Classify object as satellite or debris based on name and characteristics"""
#         name_lower = name.lower()
        
#         # Keywords that indicate debris
#         debris_keywords = [
#             'debris', 'deb', 'fragmt', 'fragment', 'rocket body', 'r/b',
#             'tank', 'stage', 'booster', 'payload adapter', 'shroud',
#             'cover', 'panel', 'antenna boom', 'unknown', 'analyst',
#             'uncorrelated', 'fengyun', 'cosmos', 'iridium'
#         ]
        
#         # Check name for debris indicators
#         for keyword in debris_keywords:
#             if keyword in name_lower:
#                 return 'debris'
        
#         # Check for very high or very low orbits (often debris)
#         try:
#             # Extract eccentricity (column 26-33 of line 2)
#             eccentricity = float('0.' + tle2[26:33].strip())
            
#             # High eccentricity often indicates debris or dead satellites
#             if eccentricity > 0.1:
#                 return 'debris'
#         except:
#             pass
        
#         # Default to satellite
#         return 'satellite'
    
#     def update_cache_from_tle(self, tle_data_list: List[str]):
#         """Update satellite cache from TLE data"""
#         self.last_api_call = datetime.utcnow()
        
#         for tle_text in tle_data_list:
#             satellites = self.parse_tle(tle_text)
#             self.tle_cache.update(satellites)
        
#         # Log counts
#         satellite_count = sum(1 for s in self.tle_cache.values() if s['object_type'] == 'satellite')
#         debris_count = sum(1 for s in self.tle_cache.values() if s['object_type'] == 'debris')
#         print(f"📊 Cached: {satellite_count} satellites, {debris_count} debris")
    
#     def propagate_satellite(self, norad_id: str) -> Optional[dict]:
#         """Calculate current position using SGP4 propagation"""
#         if norad_id not in self.tle_cache:
#             return None
        
#         try:
#             tle_data = self.tle_cache[norad_id]
#             satellite = EarthSatellite(
#                 tle_data["tle1"],
#                 tle_data["tle2"],
#                 tle_data["name"],
#                 self.timescale
#             )
            
#             t = self.timescale.now()
#             geocentric = satellite.at(t)
#             subpoint = wgs84.subpoint(geocentric)
            
#             velocity = geocentric.velocity.km_per_s
#             speed = (velocity[0]**2 + velocity[1]**2 + velocity[2]**2)**0.5
            
#             return {
#                 "norad_id": norad_id,
#                 "name": tle_data["name"],
#                 "lat": subpoint.latitude.degrees,
#                 "lng": subpoint.longitude.degrees,
#                 "alt": subpoint.elevation.km,
#                 "velocity": round(speed, 2),
#                 "object_type": tle_data["object_type"]  # ✅ Include type
#             }
#         except Exception as e:
#             # Silently skip propagation errors for invalid TLEs
#             return None
    
#     def get_all_propagated(self) -> List[dict]:
#         """Get current positions of all objects"""
#         positions = []
#         for norad_id in self.tle_cache.keys():
#             pos = self.propagate_satellite(norad_id)
#             if pos:
#                 positions.append(pos)
#         return positions
    
#     async def background_update_loop(self):
#         """Background task to fetch TLE data"""
#         print("🚀 Satellite update loop started")
        
#         # Fetch immediately on startup
#         try:
#             tle_data = await self.fetch_tle_data()
#             if tle_data:
#                 self.update_cache_from_tle(tle_data)
#         except Exception as e:
#             print(f"❌ Initial satellite fetch error: {e}")
        
#         # Then fetch periodically
#         while True:
#             await asyncio.sleep(settings.CELESTRAK_FETCH_INTERVAL)
            
#             try:
#                 tle_data = await self.fetch_tle_data()
#                 if tle_data:
#                     self.update_cache_from_tle(tle_data)
#             except Exception as e:
#                 print(f"❌ Satellite update error: {e}")


# satellite_service = SatelliteService()


"""
Satellite Data Service - OPTIMIZED WITH PARALLEL FETCHING
"""
import asyncio
import aiohttp
from datetime import datetime
from typing import Dict, List, Optional
from skyfield.api import load, EarthSatellite, wgs84
from app.config import settings


class SatelliteService:
    def __init__(self):
        self.tle_cache: Dict[str, dict] = {}
        self.timescale = load.timescale()
        self.last_api_call: Optional[datetime] = None
        self.is_ready = False  # ⚡ NEW: Track service readiness
        self._initial_fetch_task: Optional[asyncio.Task] = None
        
    async def initialize(self):
        """⚡ NON-BLOCKING: Initialize with minimal data, fetch rest in background"""
        if self.is_ready:
            return
            
        print("⚡ Satellite service initializing...")
        # Mark as ready immediately - data will stream in
        self.is_ready = True
        print("✅ Satellite service ready (fetching TLE data in background)")
        
        # Fetch TLE data in background (non-blocking)
        if not self._initial_fetch_task:
            self._initial_fetch_task = asyncio.create_task(self._fetch_tle_async())
    
    async def _fetch_tle_async(self):
        """⚡ Background task to fetch TLE data"""
        try:
            print("🔄 Fetching TLE data in background...")
            tle_data = await self.fetch_tle_data()
            if tle_data:
                self.update_cache_from_tle(tle_data)
                print(f"✅ TLE data loaded: {len(self.tle_cache)} objects")
        except Exception as e:
            print(f"⚠️ Background TLE fetch failed: {e}")
        
    async def fetch_tle_data(self) -> List[str]:
        """⚡ OPTIMIZED: Parallel fetching with reduced timeouts"""
        urls = [
            settings.CELESTRAK_TLE_URLS1,
            settings.CELESTRAK_TLE_URLS2,
            settings.CELESTRAK_TLE_URLS3,
            settings.CELESTRAK_TLE_URLS4,
            settings.CELESTRAK_TLE_URLS5,
        ]
        
        # ⚡ OPTIMIZED: Fetch all URLs in parallel
        async def fetch_single_url(session: aiohttp.ClientSession, url: str) -> Optional[str]:
            try:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status == 200:
                        text = await resp.text()
                        source = url.split('GROUP=')[1].split('&')[0] if 'GROUP=' in url else 'unknown'
                        print(f"✅ Fetched TLE: {source}")
                        return text
                    else:
                        print(f"⚠️ TLE fetch failed: {url} (status {resp.status})")
                        return None
            except asyncio.TimeoutError:
                print(f"⚠️ TLE timeout: {url}")
                return None
            except Exception as e:
                print(f"⚠️ TLE error: {url} - {e}")
                return None
        
        try:
            async with aiohttp.ClientSession() as session:
                # ⚡ Fetch all URLs concurrently
                tasks = [fetch_single_url(session, url) for url in urls]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Filter out None and exceptions
                all_tle_data = [r for r in results if isinstance(r, str) and r]
                
                return all_tle_data
        except Exception as e:
            print(f"❌ TLE fetch error: {e}")
            return []
    
    def parse_tle(self, tle_text: str) -> Dict[str, dict]:
        """Parse TLE format - UNCHANGED"""
        lines = tle_text.strip().split('\n')
        satellites = {}
        
        i = 0
        while i < len(lines):
            if i + 2 < len(lines):
                try:
                    name = lines[i].strip()
                    tle1 = lines[i + 1].strip()
                    tle2 = lines[i + 2].strip()
                    
                    if tle1.startswith('1 ') and tle2.startswith('2 '):
                        norad_id = tle1.split()[1].rstrip('U')
                        object_type = self.classify_object(name, tle1, tle2)
                        
                        satellites[norad_id] = {
                            "norad_id": norad_id,
                            "name": name,
                            "tle1": tle1,
                            "tle2": tle2,
                            "object_type": object_type
                        }
                    
                    i += 3
                except Exception as e:
                    if i < 10:  # Only log first few errors
                        print(f"⚠️ Error parsing TLE at line {i}: {e}")
                    i += 1
            else:
                i += 1
        
        return satellites
    
    def classify_object(self, name: str, tle1: str, tle2: str) -> str:
        """Classify object - UNCHANGED"""
        name_lower = name.lower()
        
        debris_keywords = [
            'debris', 'deb', 'fragmt', 'fragment', 'rocket body', 'r/b',
            'tank', 'stage', 'booster', 'payload adapter', 'shroud',
            'cover', 'panel', 'antenna boom', 'unknown', 'analyst',
            'uncorrelated', 'fengyun', 'cosmos', 'iridium'
        ]
        
        for keyword in debris_keywords:
            if keyword in name_lower:
                return 'debris'
        
        try:
            eccentricity = float('0.' + tle2[26:33].strip())
            if eccentricity > 0.1:
                return 'debris'
        except:
            pass
        
        return 'satellite'
    
    def update_cache_from_tle(self, tle_data_list: List[str]):
        """Update satellite cache - UNCHANGED"""
        self.last_api_call = datetime.utcnow()
        
        for tle_text in tle_data_list:
            satellites = self.parse_tle(tle_text)
            self.tle_cache.update(satellites)
        
        satellite_count = sum(1 for s in self.tle_cache.values() if s['object_type'] == 'satellite')
        debris_count = sum(1 for s in self.tle_cache.values() if s['object_type'] == 'debris')
        print(f"📊 Cached: {satellite_count} satellites, {debris_count} debris")
    
    def propagate_satellite(self, norad_id: str) -> Optional[dict]:
        """Calculate current position - UNCHANGED"""
        if norad_id not in self.tle_cache:
            return None
        
        try:
            tle_data = self.tle_cache[norad_id]
            satellite = EarthSatellite(
                tle_data["tle1"],
                tle_data["tle2"],
                tle_data["name"],
                self.timescale
            )
            
            t = self.timescale.now()
            geocentric = satellite.at(t)
            subpoint = wgs84.subpoint(geocentric)
            
            velocity = geocentric.velocity.km_per_s
            speed = (velocity[0]**2 + velocity[1]**2 + velocity[2]**2)**0.5
            
            return {
                "norad_id": norad_id,
                "name": tle_data["name"],
                "lat": subpoint.latitude.degrees,
                "lng": subpoint.longitude.degrees,
                "alt": subpoint.elevation.km,
                "velocity": round(speed, 2),
                "object_type": tle_data["object_type"]
            }
        except Exception:
            return None
    
    def get_all_propagated(self) -> List[dict]:
        """Get current positions - UNCHANGED"""
        positions = []
        for norad_id in self.tle_cache.keys():
            pos = self.propagate_satellite(norad_id)
            if pos:
                positions.append(pos)
        return positions
    
    async def background_update_loop(self):
        """⚡ OPTIMIZED: Non-blocking background updates"""
        print("🚀 Satellite update loop started")
        
        # Ensure initialized
        await self.initialize()
        
        # Wait for initial fetch to complete
        if self._initial_fetch_task:
            await self._initial_fetch_task
        
        # Then update periodically
        while True:
            await asyncio.sleep(settings.CELESTRAK_FETCH_INTERVAL)
            
            try:
                tle_data = await self.fetch_tle_data()
                if tle_data:
                    self.update_cache_from_tle(tle_data)
            except Exception as e:
                print(f"❌ Satellite update error: {e}")


satellite_service = SatelliteService()