from pydantic import BaseModel, Field # type: ignore
from datetime import datetime
from typing import Optional


class SatelliteBase(BaseModel): # type: ignore
    norad_id: str = Field(..., description="NORAD catalog number") # type: ignore
    name: str
    latitude: float = Field(..., ge=-90, le=90) # type: ignore
    longitude: float = Field(..., ge=-180, le=180) # type: ignore
    altitude: float = Field(..., description="Altitude in km") # type: ignore
    velocity: float = Field(..., description="Velocity in km/s") # type: ignore


class SatelliteCreate(SatelliteBase):
    inclination: Optional[float] = None
    period_minutes: Optional[float] = None
    eccentricity: Optional[float] = None
    tle_line1: Optional[str] = None
    tle_line2: Optional[str] = None
    operator: Optional[str] = None
    object_type: str = "satellite"


class SatelliteResponse(SatelliteBase):
    id: int
    inclination: Optional[float]
    period_minutes: Optional[float]
    operator: Optional[str]
    object_type: str
    is_visible: bool
    conjunction_risk: bool
    position_updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class SatelliteGeoJSON(BaseModel): # type: ignore
    type: str = "Feature"
    properties: dict # type: ignore
    geometry: dict # type: ignore