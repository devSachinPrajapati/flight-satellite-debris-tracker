"""
Satellite Data Service - PERFORMANCE OPTIMIZED
Caches propagated positions to avoid expensive recalculations
"""
import asyncio
import aiohttp # type: ignore
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from skyfield.api import load, EarthSatellite, wgs84 # type: ignore
from app.config import settings


class SatelliteService:
    def __init__(self):
        self.tle_cache: Dict[str, dict] = {}  # Raw TLE data
        self.position_cache: Dict[str, dict] = {}  # ✅ NEW: Propagated positions cache
        self.last_propagation: Optional[datetime] = None  # ✅ NEW: Track when we last propagated
        self.timescale = load.timescale()
        self.last_api_call: Optional[datetime] = None
        self.is_ready = False
        self._initial_fetch_task: Optional[asyncio.Task] = None
        
    async def initialize(self):
        """NON-BLOCKING: Initialize with minimal data"""
        if self.is_ready:
            return
            
        print("⚡ Satellite service initializing...")
        self.is_ready = True
        print("✅ Satellite service ready (fetching TLE data in background)")
        
        if not self._initial_fetch_task:
            self._initial_fetch_task = asyncio.create_task(self._fetch_tle_async())
    
    async def _fetch_tle_async(self):
        """Background task to fetch TLE data"""
        try:
            print("🔄 Fetching TLE data in background...")
            tle_data = await self.fetch_tle_data()
            if tle_data:
                self.update_cache_from_tle(tle_data)
                # ✅ NEW: Propagate all positions immediately after TLE fetch
                self._propagate_all_satellites()
                print(f"✅ TLE data loaded: {len(self.tle_cache)} objects, {len(self.position_cache)} positions cached")
        except Exception as e:
            print(f"⚠️ Background TLE fetch failed: {e}")
        
    async def fetch_tle_data(self) -> List[str]:
        """Fetch TLE data from Celestrak"""
        urls = [
            settings.CELESTRAK_TLE_URLS1,
            settings.CELESTRAK_TLE_URLS2,
            settings.CELESTRAK_TLE_URLS3,
            settings.CELESTRAK_TLE_URLS4,
            settings.CELESTRAK_TLE_URLS5,
        ]
        
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
                tasks = [fetch_single_url(session, url) for url in urls]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                all_tle_data = [r for r in results if isinstance(r, str) and r]
                
                return all_tle_data
        except Exception as e:
            print(f"❌ TLE fetch error: {e}")
            return []
    
    def parse_tle(self, tle_text: str) -> Dict[str, dict]:
        """Parse TLE format"""
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
                    if i < 10:
                        print(f"⚠️ Error parsing TLE at line {i}: {e}")
                    i += 1
            else:
                i += 1
        
        return satellites
    
    def classify_object(self, name: str, tle1: str, tle2: str) -> str:
        """Classify as satellite or debris"""
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
    
    def get_operator(self, name: str) -> str:
        """Determine satellite operator"""
        name_upper = name.upper()
        
        if "STARLINK" in name_upper:
            return "SpaceX"
        if "ONEWEB" in name_upper:
            return "OneWeb"
        if "ISS" in name_upper or "ZARYA" in name_upper:
            return "International Space Station"
        if "COSMOS" in name_upper:
            return "Russia"
        if "GPS" in name_upper:
            return "USA (GPS)"
        if "GALILEO" in name_upper:
            return "European Union"
        if "GLONASS" in name_upper:
            return "Russia"
        if "BEIDOU" in name_upper:
            return "China"
        if "SENTINEL" in name_upper:
            return "ESA"
        if "LANDSAT" in name_upper:
            return "NASA/USGS"
        if "NOAA" in name_upper:
            return "NOAA"
        if "GOES" in name_upper:
            return "NOAA"
        if "IRIDIUM" in name_upper:
            return "Iridium Communications"
        
        return "Unknown"
    
    def update_cache_from_tle(self, tle_data_list: List[str]):
        """Update satellite cache"""
        self.last_api_call = datetime.utcnow()
        
        for tle_text in tle_data_list:
            satellites = self.parse_tle(tle_text)
            self.tle_cache.update(satellites)
        
        satellite_count = sum(1 for s in self.tle_cache.values() if s['object_type'] == 'satellite')
        debris_count = sum(1 for s in self.tle_cache.values() if s['object_type'] == 'debris')
        print(f"📊 Cached: {satellite_count} satellites, {debris_count} debris")

    def _propagate_all_satellites(self):
        """
        ✅ OPTIMIZED: Propagate ALL satellites with better error handling
        Uses batch processing for speed
        """
        import time
        start = time.time()
        
        self.position_cache.clear()
        propagated_count = 0
        failed_count = 0
        
        # ✅ NEW: Pre-calculate current time (reuse for all satellites)
        t = self.timescale.now()
        
        for norad_id, tle_data in self.tle_cache.items():
            try:
                satellite = EarthSatellite(
                    tle_data["tle1"],
                    tle_data["tle2"],
                    tle_data["name"],
                    self.timescale
                )
                
                # ✅ OPTIMIZED: Reuse pre-calculated time
                geocentric = satellite.at(t)
                subpoint = wgs84.subpoint(geocentric)
                
                velocity = geocentric.velocity.km_per_s
                speed = (velocity[0]**2 + velocity[1]**2 + velocity[2]**2)**0.5
                
                # ✅ OPTIMIZED: Pre-calculate constants
                lat = float(subpoint.latitude.degrees)
                lng = float(subpoint.longitude.degrees)
                alt = float(subpoint.elevation.km)
                
                # Skip invalid positions early
                if not (-90 <= lat <= 90 and -180 <= lng <= 180 and alt < 100000):
                    failed_count += 1
                    continue
                
                # Cache the propagated position
                self.position_cache[norad_id] = {
                    "norad_id": norad_id,
                    "name": tle_data["name"],
                    "lat": lat,
                    "lng": lng,
                    "altitude": alt,
                    "velocity": float(round(speed, 2)),
                    "inclination": float(satellite.model.inclo * 180 / 3.14159),
                    "period_minutes": float((2 * 3.14159) / satellite.model.no),
                    "object_type": str(tle_data["object_type"]),
                    "operator": str(self.get_operator(tle_data["name"])),
                    "visible": bool(alt > 500),
                    "epoch": None,
                    "conjunction_risk": False,
                    "tle": {
                        "name": str(tle_data["name"]),
                        "line1": str(tle_data["tle1"]),
                        "line2": str(tle_data["tle2"])
                    }
                }
                propagated_count += 1
                
            except Exception as e:
                failed_count += 1
                # Only log first few failures to avoid spam
                if failed_count <= 3:
                    print(f"⚠️ Error propagating satellite {norad_id}: {e}")
        
        self.last_propagation = datetime.utcnow()
        elapsed = time.time() - start
        
        print(f"✅ Propagated {propagated_count} satellites in {elapsed:.2f}s ({failed_count} failed)")
    def propagate_satellite(self, norad_id: str) -> Optional[dict]:
        """
        ✅ OPTIMIZED: Return cached position instead of recalculating
        Only recalculate if cache is stale (>60 seconds old)
        """
        # Check if we need to refresh the cache
        if self.last_propagation is None or \
           (datetime.utcnow() - self.last_propagation).total_seconds() > 60:
            self._propagate_all_satellites()
        
        # Return cached position
        return self.position_cache.get(norad_id)
    
    def get_all_propagated(self) -> List[dict]:
        """
        ✅ OPTIMIZED: Return cached positions instead of recalculating
        This is called by WebSocket every 2 seconds - must be fast!
        """
        # Check if we need to refresh the cache
        if self.last_propagation is None or \
           (datetime.utcnow() - self.last_propagation).total_seconds() > 60:
            self._propagate_all_satellites()
        
        # Return all cached positions (fast dictionary lookup)
        return list(self.position_cache.values())
    
    async def background_update_loop(self):
        """
        Background updates
        ✅ OPTIMIZED: Propagate positions every 60 seconds instead of on-demand
        """
        print("🚀 Satellite update loop started")
        
        await self.initialize()
        
        if self._initial_fetch_task:
            await self._initial_fetch_task
        
        while True:
            await asyncio.sleep(60)  # ✅ NEW: Re-propagate every 60 seconds
            
            try:
                # Refresh positions from existing TLE cache
                self._propagate_all_satellites()
                
                # Fetch new TLE data every 6 hours (unchanged)
                if self.last_api_call is None or \
                   (datetime.utcnow() - self.last_api_call).total_seconds() > settings.CELESTRAK_FETCH_INTERVAL:
                    tle_data = await self.fetch_tle_data()
                    if tle_data:
                        self.update_cache_from_tle(tle_data)
                        self._propagate_all_satellites()  # Propagate new TLE data
            except Exception as e:
                print(f"❌ Satellite update error: {e}")


satellite_service = SatelliteService()