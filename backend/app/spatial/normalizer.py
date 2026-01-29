"""
Data Normalizers - FIXED VERSION
Proper altitude validation for all orbital regimes
"""
from typing import Dict, Any, Optional
from datetime import datetime
from app.spatial.rtree import SpatialObject
from skyfield.api import load, EarthSatellite, wgs84 #type: ignore
import math


# Initialize Skyfield timescale
timescale = load.timescale()


def normalize_airlabs_flight(raw_flight: Dict[str, Any]) -> Optional[SpatialObject]:
    """Convert AirLabs flight to SpatialObject with validation"""
    try:
        # Extract and validate coordinates
        lat = float(raw_flight.get('lat', 0))
        lng = float(raw_flight.get('lng', 0))
        alt = float(raw_flight.get('alt', 0)) * 0.3048  # feet to meters
        
        # ✅ Validate coordinates (aircraft altitude range)
        if not is_valid_aircraft_coordinate(lat, lng, alt):
            print(f"⚠️ Invalid coordinates for flight {raw_flight.get('hex')}: lat={lat}, lng={lng}, alt={alt}")
            return None
        
        return SpatialObject(
            id=f"air_{raw_flight.get('hex', 'UNKNOWN')}",
            object_type='aircraft',
            lat=lat,
            lng=lng,
            alt=alt,
            velocity=float(raw_flight.get('speed', 0)) * 0.514444,  # knots to m/s
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


def normalize_celestrak_object(tle_data: Dict[str, str]) -> Optional[SpatialObject]:
    """Convert Celestrak TLE to SpatialObject with proper validation for all orbital regimes"""
    try:
        # Create satellite from TLE
        satellite = EarthSatellite(
            tle_data['tle1'],
            tle_data['tle2'],
            tle_data['name'],
            timescale
        )
        
        # Propagate to current position
        t = timescale.now()
        geocentric = satellite.at(t)
        subpoint = wgs84.subpoint(geocentric)
        
        # Extract coordinates
        lat = float(subpoint.latitude.degrees)
        lng = float(subpoint.longitude.degrees)
        alt = float(subpoint.elevation.km)
        
        # ✅ CRITICAL FIX: Validate with proper satellite altitude ranges
        if not is_valid_satellite_coordinate(lat, lng, alt):
            print(f"⚠️ Invalid coordinates for {tle_data['name']}: lat={lat}, lng={lng}, alt={alt}")
            return None
        
        # Calculate velocity
        velocity = geocentric.velocity.km_per_s
        speed = float((velocity[0]**2 + velocity[1]**2 + velocity[2]**2)**0.5)
        
        # Validate velocity
        if not is_valid_number(speed) or speed < 0:
            print(f"⚠️ Invalid velocity for {tle_data['name']}: {speed}")
            return None
        
        # Determine object type
        object_type = classify_space_object(tle_data['name'], tle_data['tle2'])
        
        # Calculate orbital parameters safely
        inclination = float(satellite.model.inclo * 180 / 3.14159)
        period_minutes = float((2 * 3.14159) / satellite.model.no) if satellite.model.no != 0 else 0
        
        # Validate orbital parameters
        if not is_valid_number(inclination) or not is_valid_number(period_minutes):
            print(f"⚠️ Invalid orbital parameters for {tle_data['name']}")
            return None
        
        return SpatialObject(
            id=f"sat_{tle_data['norad_id']}",
            object_type=object_type,
            lat=lat,
            lng=lng,
            alt=alt,  # Already in km
            velocity=speed,  # Already in km/s
            heading=0,  # Not applicable for satellites
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
                'tle': {
                    'name': tle_data['name'],
                    'line1': tle_data['tle1'],
                    'line2': tle_data['tle2']
                }
            }
        )
    except Exception as e:
        print(f"⚠️ Error normalizing satellite {tle_data.get('name', 'UNKNOWN')}: {e}")
        return None


def is_valid_number(value: float) -> bool:
    """Check if a number is valid (not NaN or Inf)"""
    return not (math.isnan(value) or math.isinf(value))


def is_valid_aircraft_coordinate(lat: float, lng: float, alt: float) -> bool:
    """
    Validate aircraft coordinates
    Aircraft fly at -500m to 20km altitude
    """
    # Check for NaN and Inf
    if not is_valid_number(lat) or not is_valid_number(lng) or not is_valid_number(alt):
        return False
    
    # Check latitude range (-90 to 90)
    if lat < -90 or lat > 90:
        return False
    
    # Check longitude range (-180 to 180)
    if lng < -180 or lng > 180:
        return False
    
    # Check aircraft altitude range (-500m to 20km = 20,000m)
    if alt < -500 or alt > 20000:
        return False
    
    return True


def is_valid_satellite_coordinate(lat: float, lng: float, alt: float) -> bool:
    """
    Validate satellite coordinates
    
    Orbital Regimes:
    - LEO (Low Earth Orbit): 160-2,000 km
    - MEO (Medium Earth Orbit): 2,000-35,786 km (GPS, GLONASS)
    - GEO (Geostationary): ~35,786 km
    - HEO (Highly Elliptical): 500-200,000 km (MMS, THEMIS, scientific satellites)
    
    ✅ FIXED: Accept altitudes up to 250,000 km to include all valid orbits
    """
    # Check for NaN and Inf
    if not is_valid_number(lat) or not is_valid_number(lng) or not is_valid_number(alt):
        return False
    
    # Check latitude range (-90 to 90)
    if lat < -90 or lat > 90:
        return False
    
    # Check longitude range (-180 to 180)
    if lng < -180 or lng > 180:
        return False
    
    # ✅ CRITICAL FIX: Proper satellite altitude validation
    # Minimum: 150 km (below this, atmospheric drag prevents stable orbit)
    # Maximum: 250,000 km (beyond this is lunar orbit range, not Earth satellites)
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
    
    # Check eccentricity
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