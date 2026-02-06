"""
Airport REST API Routes - Airport Board Support
"""
from fastapi import APIRouter, HTTPException # type: ignore
from app.services.airport_service import airport_service # type: ignore

router = APIRouter(prefix="/api/airports", tags=["airports"])


@router.get("/{airport_code}")
async def get_airport_info(airport_code: str):
    """
    Get airport information by IATA or ICAO code
    Returns airport details like name, location, timezone, etc.
    """
    result = await airport_service.get_airport_info(airport_code)
    
    if not result:
        raise HTTPException(status_code=404, detail="Airport not found")
    
    return result


@router.get("/{airport_code}/schedules/arrivals")
async def get_airport_arrivals(airport_code: str, limit: int = None):
    """
    Get arrival schedules for an airport
    Returns list of arriving flights with times, gates, status, etc.
    """
    schedules = await airport_service.get_schedules(
        airport_code, 
        schedule_type="arrivals",
        limit=None
    )
    
    return {
        "airport_code": airport_code,
        "type": "arrivals",
        "schedules": schedules,
        "count": len(schedules),
        "last_update": airport_service.last_api_call.isoformat() if airport_service.last_api_call else None
    }


@router.get("/{airport_code}/schedules/departures")
async def get_airport_departures(airport_code: str, limit: int = None):
    """
    Get departure schedules for an airport
    Returns list of departing flights with times, gates, status, etc.
    """
    schedules = await airport_service.get_schedules(
        airport_code, 
        schedule_type="departures",
        limit=None
    )
    
    return {
        "airport_code": airport_code,
        "type": "departures",
        "schedules": schedules,
        "count": len(schedules),
        "last_update": airport_service.last_api_call.isoformat() if airport_service.last_api_call else None
    }


@router.get("/{airport_code}/delays")
async def get_airport_delays(airport_code: str):
    """
    Get delayed flights for an airport
    Returns flights with significant delays
    """
    delays = await airport_service.get_delayed_flights(airport_code)
    
    return {
        "airport_code": airport_code,
        "delayed_flights": delays,
        "count": len(delays),
        "last_update": airport_service.last_api_call.isoformat() if airport_service.last_api_call else None
    }


@router.get("/{airport_code}/stats")
async def get_airport_stats(airport_code: str):
    """
    Get airport statistics (arrivals, departures, delays, etc.)
    """
    stats = await airport_service.get_airport_stats(airport_code)
    
    if not stats:
        raise HTTPException(status_code=404, detail="Stats not available")
    
    return stats