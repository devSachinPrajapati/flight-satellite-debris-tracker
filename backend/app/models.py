"""
Data Models - ALIGNED WITH FRONTEND TYPES
"""
from pydantic import BaseModel # type: ignore
from typing import Optional
from datetime import datetime


class FlightPosition(BaseModel):
    """Matches frontend Aircraft interface exactly"""
    # Primary identifiers
    hex: str
    flight_icao: Optional[str] = None
    flight_number: Optional[str] = None
    
    # Position data
    lat: float
    lng: float
    alt: float
    dir: float  # heading in degrees
    speed: float
    v_speed: Optional[float] = None
    
    # Aircraft info
    aircraft_icao: Optional[str] = None
    airline_icao: Optional[str] = None
    reg_number: Optional[str] = None
    flag: Optional[str] = None
    
    # Route info (CRITICAL: Airport codes)
    dep_iata: Optional[str] = None
    dep_icao: Optional[str] = None
    arr_iata: Optional[str] = None
    arr_icao: Optional[str] = None
    
    # Status
    status: Optional[str] = "en-route"
    
    # Metadata
    updated: int  # Unix timestamp
    interpolated: bool = False
    seconds_since_update: int = 0


class TLEData(BaseModel):
    """Two-Line Element data for satellites"""
    name: str
    line1: str
    line2: str


class SatellitePosition(BaseModel):
    """Matches frontend SatelliteObject interface exactly"""
    norad_id: str
    name: str
    
    # Position
    lat: float
    lng: float
    altitude: float  # in km (not 'alt')
    velocity: float  # in km/s
    
    # Orbital parameters
    inclination: Optional[float] = None
    period_minutes: Optional[float] = None
    
    # Classification
    object_type: str  # "satellite" or "debris"
    operator: Optional[str] = None
    
    # Visibility
    visible: bool = True
    epoch: Optional[str] = None
    conjunction_risk: Optional[bool] = False
    
    # TLE data for orbit calculations
    tle: Optional[TLEData] = None


class WebSocketMessage(BaseModel):
    type: str
    timestamp: str
    data: dict


class HealthResponse(BaseModel):
    status: str
    flights_cached: int
    satellites_cached: int
    active_connections: int
    last_flight_update: Optional[str] = None
    last_satellite_update: Optional[str] = None