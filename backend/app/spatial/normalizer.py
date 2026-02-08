"""
Data Normalizers - TLE PRESERVATION FIXED
Ensures TLE data flows from satellite_service → normalizer → data_store → R-tree → WebSocket
"""
from typing import Dict, Any, Optional
from datetime import datetime
from app.spatial.rtree import SpatialObject
from skyfield.api import load, EarthSatellite, wgs84
import math

timescale = load.timescale()


def normalize_celestrak_object(tle_data: Dict[str, str]) -> Optional[SpatialObject]:
    """
    ✅ FIXED: Preserve TLE data through entire pipeline
    Convert Celestrak TLE to SpatialObject with proper validation
    """
    try:
        # Create satellite from TLE
        satellite = EarthSatellite(
            tle_data['tle1'],
            tle_data['tle2'],
            tle_data['name'],
            timescale
        )
        
        # Propagate to current position (or use pre-propagated from cache)
        if 'lat' in tle_data and 'lng' in tle_data and 'altitude' in tle_data:
            # ✅ Use pre-propagated position from satellite_service.position_cache
            lat = float(tle_data['lat'])
            lng = float(tle_data['lng'])
            alt = float(tle_data['altitude'])
        else:
            # Fallback: propagate now
            t = timescale.now()
            geocentric = satellite.at(t)
            subpoint = wgs84.subpoint(geocentric)
            
            lat = float(subpoint.latitude.degrees)
            lng = float(subpoint.longitude.degrees)
            alt = float(subpoint.elevation.km)
        
        # Validate coordinates
        if not is_valid_satellite_coordinate(lat, lng, alt):
            return None
        
        # Calculate velocity (or use cached)
        if 'velocity' in tle_data:
            speed = float(tle_data['velocity'])
        else:
            t = timescale.now()
            geocentric = satellite.at(t)
            velocity = geocentric.velocity.km_per_s
            speed = float((velocity[0]**2 + velocity[1]**2 + velocity[2]**2)**0.5)
        
        # Validate velocity
        if not is_valid_number(speed) or speed < 0:
            return None
        
        # Determine object type
        object_type = classify_space_object(tle_data['name'], tle_data['tle2'])
        
        # Calculate orbital parameters
        inclination = float(satellite.model.inclo * 180 / 3.14159)
        period_minutes = float((2 * 3.14159) / satellite.model.no) if satellite.model.no != 0 else 0
        
        # Validate orbital parameters
        if not is_valid_number(inclination) or not is_valid_number(period_minutes):
            return None
        
        # ✅ CRITICAL FIX: Always build TLE structure in extra
        tle_extra = {
            'name': str(tle_data['name']),
            'line1': str(tle_data['tle1']),
            'line2': str(tle_data['tle2']),
        }
        
        return SpatialObject(
            id=f"sat_{tle_data['norad_id']}",
            object_type=object_type,
            lat=lat,
            lng=lng,
            alt=alt,
            velocity=speed,
            heading=0,
            name=tle_data['name'],
            operator=extract_operator(tle_data['name']),
            timestamp=int(datetime.utcnow().timestamp() * 1000),
            source='celestrak',
            extra={
                'norad_id': tle_data['norad_id'],
                'object_type': object_type,
                'inclination': inclination,
                'period_minutes': period_minutes,
                'visible': bool(alt > 500),
                'tle': tle_extra,  # ✅ Always included!
            }
        )
    except Exception as e:
        print(f"⚠️ Error normalizing satellite {tle_data.get('name', 'UNKNOWN')}: {e}")
        return None


# ... rest of the file remains the same (is_valid_number, coordinate validators, etc.)

def is_valid_number(value: float) -> bool:
    """Check if a number is valid (not NaN or Inf)"""
    return not (math.isnan(value) or math.isinf(value))


def is_valid_aircraft_coordinate(lat: float, lng: float, alt: float) -> bool:
    """Validate aircraft coordinates"""
    if not is_valid_number(lat) or not is_valid_number(lng) or not is_valid_number(alt):
        return False
    
    if lat < -90 or lat > 90:
        return False
    
    if lng < -180 or lng > 180:
        return False
    
    if lat == 0 and lng == 0:
        return False
    
    if abs(lat) < 0.1 and abs(lng) < 0.1:
        return False
    
    if alt < -0.5 or alt > 20:
        return False
    
    return True


def is_valid_satellite_coordinate(lat: float, lng: float, alt: float) -> bool:
    """Validate satellite coordinates"""
    if not is_valid_number(lat) or not is_valid_number(lng) or not is_valid_number(alt):
        return False
    
    if lat < -90 or lat > 90:
        return False
    
    if lng < -180 or lng > 180:
        return False
    
    if lat == 0 and lng == 0 and alt == 0:
        return False
    
    if lat == 0 and lng == 0 and alt < 150:
        return False
    
    if alt < 150 or alt > 250000:
        return False
    
    return True


def classify_space_object(name: str, tle2: str) -> str:
    """Classify as satellite or debris"""
    name_lower = name.lower()
    
    debris_keywords = [
        'debris', 'deb', 'fragmt', 'fragment', 'rocket body', 'r/b',
        'tank', 'stage', 'booster', 'payload adapter', 'shroud',
        'cover', 'panel', 'antenna boom', 'unknown', 'analyst'
    ]
    
    for keyword in debris_keywords:
        if keyword in name_lower:
            return 'debris'
    
    try:
        eccentricity = float('0.' + tle2[26:33].strip())
        if eccentricity > 0.1:
            return 'debris'
    except:
        pass
    
    return 'satellite'


def extract_operator(name: str) -> Optional[str]:
    """Extract operator from satellite name"""
    name_upper = name.upper()
    
    operators = {
        'STARLINK': 'SpaceX',
        'ONEWEB': 'OneWeb',
        'ISS': 'International Space Station',
        'COSMOS': 'Russia',
        'GPS': 'USA (GPS)',
        'GALILEO': 'European Union',
        'GLONASS': 'Russia',
        'BEIDOU': 'China',
        'SENTINEL': 'ESA',
        'LANDSAT': 'NASA/USGS',
        'NOAA': 'NOAA',
        'GOES': 'NOAA',
        'IRIDIUM': 'Iridium Communications',
        'MMS': 'NASA (Magnetospheric Multiscale)',
        'THEMIS': 'NASA (THEMIS)',
        'CXO': 'NASA (Chandra X-ray)',
        'CLUSTER': 'ESA',
        'POLAR': 'NASA',
    }
    
    for keyword, operator in operators.items():
        if keyword in name_upper:
            return operator
    
    return 'Unknown'


# Aircraft normalizer remains unchanged
def normalize_airlabs_flight(raw_flight: Dict[str, Any]) -> Optional[SpatialObject]:
    """Convert AirLabs flight to SpatialObject with validation"""
    try:
        lat = float(raw_flight.get('lat', 0))
        lng = float(raw_flight.get('lng', 0))
        
        alt_feet = float(raw_flight.get('alt', 0))
        alt_km = alt_feet * 0.3048 / 1000
        
        if not is_valid_aircraft_coordinate(lat, lng, alt_km):
            return None
        
        speed_knots = float(raw_flight.get('speed', 0))
        speed_kms = speed_knots * 1.852 / 3600
        
        return SpatialObject(
            id=f"air_{raw_flight.get('hex', 'UNKNOWN')}",
            object_type='aircraft',
            lat=lat,
            lng=lng,
            alt=alt_km,
            velocity=speed_kms,
            heading=float(raw_flight.get('dir', 0)),
            name=raw_flight.get('flight_icao') or raw_flight.get('hex', 'UNKNOWN'),
            operator=raw_flight.get('airline_icao'),
            timestamp=int(datetime.utcnow().timestamp() * 1000),
            source='airlabs',
            extra={
                'hex': raw_flight.get('hex'),
                'flight_icao': raw_flight.get('flight_icao'),
                'flight_number': raw_flight.get('flight_number'),
                'aircraft_icao': raw_flight.get('aircraft_icao'),
                'airline_icao': raw_flight.get('airline_icao'),
                'dep_iata': raw_flight.get('dep_iata'),
                'dep_icao': raw_flight.get('dep_icao'),
                'arr_iata': raw_flight.get('arr_iata'),
                'arr_icao': raw_flight.get('arr_icao'),
                'flag': raw_flight.get('flag'),
                'v_speed': raw_flight.get('v_speed'),
                'updated': raw_flight.get('updated', int(datetime.utcnow().timestamp()))
            }
        )
    except Exception as e:
        print(f"⚠️ Error normalizing flight {raw_flight.get('hex', 'UNKNOWN')}: {e}")
        return None
