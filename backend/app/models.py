"""
Data Models
"""
from pydantic import BaseModel # type: ignore
from typing import Optional
from datetime import datetime


class FlightPosition(BaseModel):
    id: str
    callsign: Optional[str] = None
    lat: float
    lng: float
    alt: float
    speed: float
    heading: float
    aircraft: Optional[str] = None
    status: Optional[str] = "en-route"
    interpolated: bool = False
    seconds_since_update: int = 0
    updated_at: datetime


class SatellitePosition(BaseModel):
    norad_id: str
    name: str
    lat: float
    lng: float
    alt: float
    velocity: float


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