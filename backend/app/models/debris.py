from sqlalchemy import Column, String, Float, Integer, DateTime, Boolean, Text, Index # type: ignore
from sqlalchemy.sql import func # type: ignore
from app.database import Base


class Debris(Base):
    __tablename__ = "debris"
    
    id = Column(Integer, primary_key=True, index=True)
    norad_id = Column(String(10), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    
    # Current Position
    latitude = Column(Float)
    longitude = Column(Float)
    altitude = Column(Float)  # km
    velocity = Column(Float)  # km/s
    
    # Orbital Elements
    inclination = Column(Float)
    period_minutes = Column(Float)
    
    # TLE Data
    tle_line1 = Column(Text)
    tle_line2 = Column(Text)
    tle_epoch = Column(DateTime(timezone=True))
    
    # Risk Assessment
    conjunction_risk = Column(Boolean, default=False)
    risk_score = Column(Float, default=0.0)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    position_updated_at = Column(DateTime(timezone=True))
    tle_updated_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_debris_position', 'latitude', 'longitude'),
        Index('idx_debris_risk', 'conjunction_risk', 'risk_score'),
        Index('idx_debris_tle_epoch', 'tle_epoch'),
    )