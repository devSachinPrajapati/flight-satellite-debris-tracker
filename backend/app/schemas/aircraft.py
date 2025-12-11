from pydantic import BaseModel, Field # type: ignore
from datetime import datetime
from typing import Optional


class AircraftBase(BaseModel):
    hex: str = Field(..., description="Aircraft ICAO hex code")
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    altitude: Optional[float] = Field(None, description="Altitude in feet")
    speed: Optional[float] = Field(None, description="Speed in knots")
    heading: Optional[float] = Field(None, ge=0, le=360)
    vertical_speed: Optional[float] = None


class AircraftCreate(AircraftBase):
    flight_icao: Optional[str] = None
    flight_number: Optional[str] = None
    aircraft_icao: Optional[str] = None
    airline_icao: Optional[str] = None
    departure_iata: Optional[str] = None
    arrival_iata: Optional[str] = None
    flag: Optional[str] = None


class AircraftResponse(AircraftBase):
    id: int
    flight_icao: Optional[str]
    flight_number: Optional[str]
    aircraft_icao: Optional[str]
    airline_icao: Optional[str]
    departure_iata: Optional[str]
    arrival_iata: Optional[str]
    is_active: bool
    last_updated: datetime
    
    class Config:
        from_attributes = True


class AircraftGeoJSON(BaseModel):
    type: str = "Feature"
    properties: dict
    geometry: dict