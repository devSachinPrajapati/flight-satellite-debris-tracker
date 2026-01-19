"""
Configuration Management
"""
from pydantic_settings import BaseSettings # type: ignore
from typing import List


class Settings(BaseSettings):
    # API Keys
    AIRLABS_API_KEY: str = ""
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
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