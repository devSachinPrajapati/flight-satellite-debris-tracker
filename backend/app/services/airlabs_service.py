import httpx # type: ignore
from typing import List, Dict, Optional
from app.config import get_settings
from app.utils.logger import get_logger # type: ignore

settings = get_settings()
logger = get_logger(__name__)


class AirLabsService:
    def __init__(self):
        self.base_url = settings.AIRLABS_BASE_URL
        self.api_key = settings.AIRLABS_API_KEY
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def fetch_flights(
        self,
        bbox: Optional[tuple] = None,
        limit: int = 1000
    ) -> List[Dict]:
        """
        Fetch live flight data from AirLabs API
        
        Args:
            bbox: Bounding box (min_lat, min_lon, max_lat, max_lon)
            limit: Maximum number of flights to return
        
        Returns:
            List of flight dictionaries
        """
        try:
            url = f"{self.base_url}/flights"
            params = {"api_key": self.api_key}
            
            # Add bounding box if provided
            if bbox:
                min_lat, min_lon, max_lat, max_lon = bbox
                params.update({
                    "bbox": f"{min_lat},{min_lon},{max_lat},{max_lon}"
                })
            
            logger.info(f"Fetching flights from AirLabs API...")
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            flights = data.get("response", [])
            
            # Filter and validate
            valid_flights = []
            for flight in flights[:limit]:
                if self._validate_flight_data(flight):
                    valid_flights.append(self._normalize_flight_data(flight))
            
            logger.info(f"✅ Fetched {len(valid_flights)} valid flights")
            return valid_flights
            
        except httpx.HTTPError as e:
            logger.error(f"❌ HTTP error fetching flights: {e}")
            return []
        except Exception as e:
            logger.error(f"❌ Error fetching flights: {e}")
            return []
    
    def _validate_flight_data(self, flight: Dict) -> bool:
        """Validate flight data has required fields"""
        required_fields = ["hex", "lat", "lng"]
        return all(
            field in flight and flight[field] is not None
            for field in required_fields
        )
    
    def _normalize_flight_data(self, flight: Dict) -> Dict:
        """Normalize flight data to standard format"""
        return {
            "hex": flight.get("hex"),
            "latitude": float(flight.get("lat")), # type: ignore
            "longitude": float(flight.get("lng")), # type: ignore
            "altitude": flight.get("alt"),
            "speed": flight.get("speed"),
            "heading": flight.get("dir"),
            "vertical_speed": flight.get("v_speed"),
            "flight_icao": flight.get("flight_icao"),
            "flight_number": flight.get("flight_number"),
            "aircraft_icao": flight.get("aircraft_icao"),
            "airline_icao": flight.get("airline_icao"),
            "departure_iata": flight.get("dep_iata"),
            "arrival_iata": flight.get("arr_iata"),
            "flag": flight.get("flag"),
        }
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()