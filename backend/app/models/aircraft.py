from sqlalchemy import Column, String, Float, Integer, DateTime, Boolean, Index # type: ignore
from sqlalchemy.sql import func # type: ignore
from app.database import Base


class Aircraft(Base):
    __tablename__ = "aircraft"
    
    id = Column(Integer, primary_key=True, index=True)
    hex = Column(String(10), unique=True, nullable=False, index=True)
    
    # Position
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float)  # feet
    
    # Flight Info
    flight_icao = Column(String(20))
    flight_number = Column(String(20))
    aircraft_icao = Column(String(10))
    airline_icao = Column(String(10))
    
    # Speed & Direction
    speed = Column(Float)  # knots
    heading = Column(Float)  # degrees
    vertical_speed = Column(Float)  # feet/min
    
    # Airport Info
    departure_iata = Column(String(5))
    departure_icao = Column(String(5))
    arrival_iata = Column(String(5))
    arrival_icao = Column(String(5))
    
    # Metadata
    flag = Column(String(5))
    is_active = Column(Boolean, default=True)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    data_source = Column(String(20), default="airlabs")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_aircraft_position', 'latitude', 'longitude'),
        Index('idx_aircraft_active', 'is_active', 'last_updated'),
        Index('idx_aircraft_flight', 'flight_icao'),
    )