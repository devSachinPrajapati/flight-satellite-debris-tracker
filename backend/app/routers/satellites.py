"""
Satellite API Router - TLE DATA INCLUSION
Ensures TLE data is always present in responses
"""
from fastapi import APIRouter, HTTPException
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
        if abs(f) > 100000:
            return None
        return f
    except (ValueError, TypeError):
        return default


def build_satellite_response(norad_id: str, sat_data: dict) -> dict:
    """
    Build satellite response with guaranteed TLE data
    Always includes TLE structure, even if empty
    """
    # Validate coordinates
    lat = safe_float(sat_data.get('lat', 0))
    lng = safe_float(sat_data.get('lng', 0))
    alt = safe_float(sat_data.get('altitude', 0))
    
    if lat is None or lng is None or alt is None:
        raise ValueError(f"Invalid coordinates for satellite {norad_id}")
    
    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
        raise ValueError(f"Out-of-range coordinates for satellite {norad_id}")
    
    if alt > 100000:
        raise ValueError(f"Invalid altitude for satellite {norad_id}: {alt} km")
    
    # Always build TLE structure
    tle_data = sat_data.get('tle')
    if tle_data and isinstance(tle_data, dict):
        # TLE data exists - use it
        tle_response = {
            'name': str(tle_data.get('name', sat_data.get('name', 'Unknown'))),
            'line1': str(tle_data.get('line1', '')),
            'line2': str(tle_data.get('line2', '')),
        }
    else:
        # NO TLE DATA - Return empty structure (not None!)
        # This ensures frontend always has a TLE object to check
        tle_response = {
            'name': str(sat_data.get('name', 'Unknown')),
            'line1': '',
            'line2': '',
        }
        print(f"⚠️ No TLE data for satellite {norad_id}, using empty structure")
    
    # Build full response
    return {
        'norad_id': str(norad_id),
        'name': str(sat_data.get('name', 'Unknown')),
        'lat': lat,
        'lng': lng,
        'altitude': alt,
        'velocity': safe_float(sat_data.get('velocity', 0)),
        'inclination': safe_float(sat_data.get('inclination')),
        'period_minutes': safe_float(sat_data.get('period_minutes')),
        'operator': sat_data.get('operator'),
        'object_type': str(sat_data.get('object_type', 'satellite')),
        'visible': bool(sat_data.get('visible', False)),
        'epoch': sat_data.get('epoch'),
        'conjunction_risk': bool(sat_data.get('conjunction_risk', False)),
        'tle': tle_response,  # Always present, never None
    }


@router.get("")
async def get_all_satellites():
    """Get all satellites and debris - USES POSITION CACHE"""
    
    if not satellite_service.is_ready:
        raise HTTPException(status_code=503, detail="Satellite service not ready")
    
    all_satellites = []
    rejected = 0
    
    # Use position_cache (already propagated positions)
    for norad_id, sat_data in satellite_service.position_cache.items():
        try:
            sat_obj = build_satellite_response(norad_id, sat_data)
            all_satellites.append(sat_obj)
        except (ValueError, Exception) as e:
            rejected += 1
            if rejected <= 3:
                print(f"⚠️ Error processing satellite {norad_id}: {e}")
            continue
    
    # Separate by type
    satellites = [s for s in all_satellites if s.get('object_type') == 'satellite']
    debris_list = [s for s in all_satellites if s.get('object_type') == 'debris']
    
    print(f" Satellite API: {len(satellites)} satellites, {len(debris_list)} debris ({rejected} rejected)")
    
    return {
        "satellites": satellites + debris_list,
        "count": len(satellites) + len(debris_list),
        "satellite_count": len(satellites),
        "debris_count": len(debris_list),
        "rejected_count": rejected,
        "last_update": datetime.utcnow().isoformat(),
    }


@router.get("/{norad_id}")
async def get_satellite(norad_id: str):
    """Get specific satellite by NORAD ID"""
    
    if not satellite_service.is_ready:
        raise HTTPException(status_code=503, detail="Satellite service not ready")
    
    #   Get from position_cache (has TLE data)
    sat_data = satellite_service.position_cache.get(norad_id)
    
    if not sat_data:
        raise HTTPException(status_code=404, detail=f"Satellite {norad_id} not found")
    
    try:
        sat_obj = build_satellite_response(norad_id, sat_data)
        return sat_obj
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))