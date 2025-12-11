from pydantic_settings import BaseSettings # type: ignore
from functools import lru_cache
from typing import Optional

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Flight Satellite Tracker"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/tracker_db"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # External APIs
    AIRLABS_API_KEY: str = ""
    AIRLABS_BASE_URL: str = "https://airlabs.co/api/v9"
    CELESTRAK_BASE_URL: str = "https://celestrak.org/NORAD/elements/gp.php"
    
    # Data Refresh Intervals (seconds)
    AIRCRAFT_REFRESH_INTERVAL: int = 10
    SATELLITE_TLE_REFRESH_INTERVAL: int = 21600  # 6 hours
    SATELLITE_POSITION_UPDATE_INTERVAL: int = 5
    
    # Data Retention (days)
    AIRCRAFT_DATA_RETENTION_DAYS: int = 1
    SATELLITE_DATA_RETENTION_DAYS: int = 7
    
    # Performance
    MAX_AIRCRAFT_RECORDS: int = 1000
    MAX_SATELLITE_RECORDS: int = 500
    
    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()