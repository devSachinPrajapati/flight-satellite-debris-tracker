# """
# Configuration Management
# """
# from pydantic_settings import BaseSettings # type: ignore
# from typing import List


# class Settings(BaseSettings):
#     # API Keys
#     AIRLABS_API_KEY: str = ""
    
#     # Server
#     HOST: str = "0.0.0.0"
#     PORT: int = 8000

#     # External URLs
#     AIRLABS_FLIGHTS_URL: str = "https://airlabs.co/api/v9/flights"
#     CELESTRAK_TLE_URLS1: str = "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle"
#     CELESTRAK_TLE_URLS2: str = "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle"
#     CELESTRAK_TLE_URLS3: str = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle"
#     CELESTRAK_TLE_URLS4: str = "https://celestrak.org/NORAD/elements/gp.php?GROUP=analyst&FORMAT=tle"
#     CELESTRAK_TLE_URLS5: str = "https://celestrak.org/NORAD/elements/gp.php?GROUP=2023-177&FORMAT=tle"
    
#     # CORS
#     CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    
#     # Fetch Intervals (seconds)
#     AIRLABS_FETCH_INTERVAL: int = 60
#     CELESTRAK_FETCH_INTERVAL: int = 21600  # 6 hours
#     WEBSOCKET_BROADCAST_INTERVAL: int = 2
    
#     # Filtering
#     FLIGHT_BBOX: str = ""  # Optional bounding box
    
#     # Debug
#     DEBUG: bool = True
    
#     class Config:
#         env_file = ".env"
#         case_sensitive = True
    
#     @property
#     def cors_origins_list(self) -> List[str]:
#         return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


# settings = Settings()


"""
Configuration Management
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # API Keys
    AIRLABS_API_KEY: str = ""
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # External URLs
    AIRLABS_BASE_URL: str = "https://airlabs.co/api/v9"
    AIRLABS_FLIGHTS_URL: str = "https://airlabs.co/api/v9/flights"
    CELESTRAK_TLE_URLS1: str = "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle"
    CELESTRAK_TLE_URLS2: str = "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle"
    CELESTRAK_TLE_URLS3: str = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle"
    CELESTRAK_TLE_URLS4: str = "https://celestrak.org/NORAD/elements/gp.php?GROUP=analyst&FORMAT=tle"
    CELESTRAK_TLE_URLS5: str = "https://celestrak.org/NORAD/elements/gp.php?GROUP=2023-177&FORMAT=tle"
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    
    # Fetch Intervals (seconds)
    AIRLABS_FETCH_INTERVAL: int = 60
    CELESTRAK_FETCH_INTERVAL: int = 21600  # 6 hours
    WEBSOCKET_BROADCAST_INTERVAL: int = 2
    
    # Filtering
    FLIGHT_BBOX: str = ""  # Optional bounding box
    
    # Debug
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


settings = Settings()