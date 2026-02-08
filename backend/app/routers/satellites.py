"""
Satellite API Router
Just fixes the AttributeError without changing too much
"""
from fastapi import APIRouter, HTTPException # type: ignore
from typing import Dict, Any
from datetime import datetime
import math

from app.services.satellite_service import satellite_service

router = APIRouter(prefix="/api/satellites", tags=["satellites"])


def is_json_safe(value) -> bool:
    """Check if value is JSON-safe"""
    if value is None:
        return True
    if not isinstance(value, (int, float)):
        return True
    if isinstance(value, bool):
        return True
    return not (math.isnan(value) or math.isinf(value))


def safe_float(value, default=0.0):
    """Convert to safe float"""
    try:
        f = float(value)
        if math.isnan(f) or math.isinf(f):
            return default
        # Reject extreme altitudes
        if abs(f) > 100000:
            return None  # Signal to reject
        return f
    except (ValueError, TypeError):
        return default


@router.get("")
async def get_all_satellites():
    """Get all satellites and debris - SAFE VERSION"""
    
    if not satellite_service.is_ready:
        raise HTTPException(status_code=503, detail="Satellite service not ready")
    
    all_satellites = []
    rejected = 0
    
    for norad_id, tle_data in satellite_service.tle_cache.items():
        try:
            # Validate coordinates
            lat = safe_float(tle_data.get('lat', 0))
            lng = safe_float(tle_data.get('lng', 0))
            alt = safe_float(tle_data.get('altitude', 0))
            
            # Skip if any coordinate is None (invalid/extreme)
            if lat is None or lng is None or alt is None:
                rejected += 1
                continue
            
            # Validate ranges
            if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
                rejected += 1
                continue
            
            # Skip satellites with extreme altitudes (>100,000 km)
            if alt > 100000:
                rejected += 1
                continue
            
            # Build safe satellite object
            sat_obj = {
                'norad_id': norad_id,
                'name': tle_data.get('name', 'Unknown'),
                'lat': lat,
                'lng': lng,
                'altitude': alt,
                'velocity': safe_float(tle_data.get('velocity', 0)),
                'inclination': safe_float(tle_data.get('inclination')),
                'period_minutes': safe_float(tle_data.get('period_minutes')),
                'operator': tle_data.get('operator'),
                'object_type': tle_data.get('object_type', 'satellite'),
                'visible': bool(tle_data.get('visible', False)),
                'epoch': tle_data.get('epoch'),
                'conjunction_risk': bool(tle_data.get('conjunction_risk', False)),
                'tle': tle_data.get('tle')
            }
            
            all_satellites.append(sat_obj)
            
        except Exception as e:
            rejected += 1
            print(f"⚠️ Error processing satellite {norad_id}: {e}")
            continue
    
    # Separate by type
    satellites = [s for s in all_satellites if s.get('object_type') == 'satellite']
    debris_list = [s for s in all_satellites if s.get('object_type') == 'debris']
    
    print(f"✅ Satellite API: {len(satellites)} satellites, {len(debris_list)} debris ({rejected} rejected)")
    
    return {
        "satellites": satellites + debris_list,
        "count": len(satellites) + len(debris_list),
        "satellite_count": len(satellites),
        "debris_count": len(debris_list),
        "rejected_count": rejected,
        "last_update": datetime.utcnow().isoformat()  # ✅ FIXED: Use datetime.utcnow() directly
    }


@router.get("/{norad_id}")
async def get_satellite(norad_id: str):
    """Get specific satellite by NORAD ID"""
    
    if not satellite_service.is_ready:
        raise HTTPException(status_code=503, detail="Satellite service not ready")
    
    tle_data = satellite_service.tle_cache.get(norad_id)
    
    if not tle_data:
        raise HTTPException(status_code=404, detail=f"Satellite {norad_id} not found")
    
    # Validate and build safe object
    lat = safe_float(tle_data.get('lat', 0))
    lng = safe_float(tle_data.get('lng', 0))
    alt = safe_float(tle_data.get('altitude', 0))
    
    if lat is None or lng is None or alt is None:
        raise HTTPException(status_code=422, detail="Satellite has invalid coordinates")
    
    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
        raise HTTPException(status_code=422, detail="Satellite has out-of-range coordinates")
    
    if alt > 100000:
        raise HTTPException(status_code=422, detail="Satellite altitude too high (>100,000 km)")
    
    sat_obj = {
        'norad_id': norad_id,
        'name': tle_data.get('name', 'Unknown'),
        'lat': lat,
        'lng': lng,
        'altitude': alt,
        'velocity': safe_float(tle_data.get('velocity', 0)),
        'inclination': safe_float(tle_data.get('inclination')),
        'period_minutes': safe_float(tle_data.get('period_minutes')),
        'operator': tle_data.get('operator'),
        'object_type': tle_data.get('object_type', 'satellite'),
        'visible': bool(tle_data.get('visible', False)),
        'epoch': tle_data.get('epoch'),
        'conjunction_risk': bool(tle_data.get('conjunction_risk', False)),
        'tle': tle_data.get('tle')
    }
    
    return sat_obj