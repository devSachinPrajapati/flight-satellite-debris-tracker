from sqlalchemy import Column, String, Float, Integer, DateTime, Boolean, Text, Index # type: ignore
from sqlalchemy.sql import func # type: ignore
from app.database import Base


class Satellite(Base):
    __tablename__ = "satellites"
    
    id = Column(Integer, primary_key=True, index=True)
    norad_id = Column(String(10), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    
    # Current Position (calculated from TLE)
    latitude = Column(Float)
    longitude = Column(Float)
    altitude = Column(Float)  # km
    velocity = Column(Float)  # km/s
    
    # Orbital Elements
    inclination = Column(Float)  # degrees
    period_minutes = Column(Float)
    eccentricity = Column(Float)
    
    # TLE Data
    tle_line1 = Column(Text)
    tle_line2 = Column(Text)
    tle_epoch = Column(DateTime(timezone=True))
    
    # Classification
    object_type = Column(String(20), default="satellite")  # satellite/debris
    operator = Column(String(100))
    
    # Status
    is_visible = Column(Boolean, default=True)
    conjunction_risk = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    position_updated_at = Column(DateTime(timezone=True))
    tle_updated_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_satellite_position', 'latitude', 'longitude'),
        Index('idx_satellite_type', 'object_type', 'is_active'),
        Index('idx_satellite_tle_epoch', 'tle_epoch'),
    )