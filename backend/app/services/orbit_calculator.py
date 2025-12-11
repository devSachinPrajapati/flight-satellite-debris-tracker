from sgp4.api import Satrec, jday # type: ignore
from datetime import datetime
from typing import Optional, Tuple, Dict
import math
from app.utils.logger import get_logger # type: ignore

logger = get_logger(__name__)


class OrbitCalculator:
    """Calculate satellite positions from TLE data using SGP4"""
    
    @staticmethod
    def calculate_position(
        tle_line1: str,
        tle_line2: str,
        time: Optional[datetime] = None
    ) -> Optional[Dict]:
        """
        Calculate satellite position from TLE
        
        Args:
            tle_line1: TLE line 1
            tle_line2: TLE line 2
            time: Time to calculate position (default: now)
        
        Returns:
            Dictionary with lat, lng, altitude, velocity
        """
        try:
            if time is None:
                time = datetime.utcnow()
            
            # Initialize satellite
            satellite = Satrec.twoline2rv(tle_line1, tle_line2)
            
            # Check for errors
            if satellite.error != 0:
                logger.warning(f"TLE initialization error: {satellite.error}")
                return None
            
            # Convert time to Julian date
            jd, fr = jday(
                time.year, time.month, time.day,
                time.hour, time.minute, time.second + time.microsecond / 1e6
            )
            
            # Propagate position
            error_code, position, velocity = satellite.sgp4(jd, fr)
            
            if error_code != 0:
                logger.warning(f"SGP4 propagation error: {error_code}")
                return None
            
            # Convert ECI to geographic coordinates
            lat, lng, alt = OrbitCalculator._eci_to_geodetic(
                position, time
            )
            
            # Validate coordinates
            if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
                return None
            
            # Calculate velocity magnitude
            vel_magnitude = math.sqrt(
                velocity[0]**2 + velocity[1]**2 + velocity[2]**2
            )
            
            # Extract orbital elements
            inclination = math.degrees(satellite.inclo)
            period = (2 * math.pi) / satellite.no  # minutes
            
            return {
                "latitude": lat,
                "longitude": lng,
                "altitude": alt,  # km
                "velocity": vel_magnitude,  # km/s
                "inclination": inclination,
                "period_minutes": period,
            }
            
        except Exception as e:
            logger.error(f"Error calculating position: {e}")
            return None
    
    @staticmethod
    def _eci_to_geodetic(
        position: Tuple[float, float, float],
        time: datetime
    ) -> Tuple[float, float, float]:
        """Convert ECI coordinates to geodetic (lat, lng, alt)"""
        x, y, z = position
        
        # Calculate GMST (Greenwich Mean Sidereal Time)
        gmst = OrbitCalculator._calculate_gmst(time)
        
        # Calculate longitude
        lng = math.atan2(y, x) - gmst
        lng = math.degrees(lng)
        
        # Normalize longitude to [-180, 180]
        while lng > 180:
            lng -= 360
        while lng < -180:
            lng += 360
        
        # Calculate latitude and altitude
        r = math.sqrt(x**2 + y**2)
        lat = math.atan2(z, r)
        lat = math.degrees(lat)
        
        # Altitude (simplified)
        alt = math.sqrt(x**2 + y**2 + z**2) - 6371  # Earth radius = 6371 km
        
        return lat, lng, alt
    
    @staticmethod
    def _calculate_gmst(time: datetime) -> float:
        """Calculate Greenwich Mean Sidereal Time in radians"""
        # Julian date
        jd, fr = jday(
            time.year, time.month, time.day,
            time.hour, time.minute, time.second
        )
        
        # Days since J2000.0
        t = (jd - 2451545.0) + fr
        
        # GMST in degrees
        gmst = 280.46061837 + 360.98564736629 * t
        gmst = gmst % 360
        
        # Convert to radians
        return math.radians(gmst)