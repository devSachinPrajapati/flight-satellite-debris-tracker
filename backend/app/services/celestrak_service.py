import httpx # type: ignore
from typing import List, Dict, Optional
from datetime import datetime
from app.config import get_settings
from app.utils.logger import get_logger # type: ignore

settings = get_settings()
logger = get_logger(__name__)


class CelesTrakService:
    def __init__(self):
        self.base_url = settings.CELESTRAK_BASE_URL
        self.client = httpx.AsyncClient(timeout=60.0)
    
    async def fetch_tle_data(self, group: str) -> List[Dict]:
        """
        Fetch TLE data from CelesTrak
        
        Args:
            group: CelesTrak group name (e.g., 'stations', 'starlink', 'active')
        
        Returns:
            List of TLE data dictionaries
        """
        try:
            url = f"{self.base_url}?GROUP={group}&FORMAT=TLE"
            
            logger.info(f"Fetching TLE data for group: {group}")
            response = await self.client.get(url)
            response.raise_for_status()
            
            tle_text = response.text
            tle_objects = self._parse_tle_text(tle_text)
            
            logger.info(f"✅ Fetched {len(tle_objects)} TLE entries from {group}")
            return tle_objects
            
        except httpx.HTTPError as e:
            logger.error(f"❌ HTTP error fetching TLE for {group}: {e}")
            return []
        except Exception as e:
            logger.error(f"❌ Error fetching TLE for {group}: {e}")
            return []
    
    async def fetch_all_satellite_tle(self) -> Dict[str, List[Dict]]:
        """Fetch TLE data from multiple CelesTrak groups"""
        groups = {
            "stations": "stations",
            "starlink": "starlink",
            "active": "active",
            "debris": "cosmos-2251-debris"
        }
        
        results = {}
        for key, group in groups.items():
            tle_data = await self.fetch_tle_data(group)
            results[key] = tle_data
        
        return results
    
    def _parse_tle_text(self, tle_text: str) -> List[Dict]:
        """Parse TLE text format into structured data"""
        lines = tle_text.strip().split('\n')
        tle_objects = []
        
        for i in range(0, len(lines), 3):
            if i + 2 >= len(lines):
                break
            
            name = lines[i].strip()
            line1 = lines[i + 1].strip()
            line2 = lines[i + 2].strip()
            
            if line1.startswith('1 ') and line2.startsWith('2 '): # type: ignore
                tle_objects.append({
                    "name": name,
                    "line1": line1,
                    "line2": line2,
                    "norad_id": line2[2:7].strip(),
                })
        
        return tle_objects
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose() 