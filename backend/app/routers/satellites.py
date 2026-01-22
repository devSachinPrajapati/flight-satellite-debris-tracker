"""
Satellite REST API Routes
"""
from fastapi import APIRouter # type: ignore
from app.services.satellite_service import satellite_service

router = APIRouter(prefix="/api/satellites", tags=["satellites"])


@router.get("/")
async def get_satellites():
    """
    Get current satellite positions (propagated from TLE)
    Used for initial data load only - use WebSocket for real-time updates
    """
    satellites = satellite_service.get_all_propagated()
    
    return {
        "satellites": satellites,
        "count": len(satellites),
        "last_update": satellite_service.last_api_call.isoformat() if satellite_service.last_api_call else None
    }


@router.get("/{norad_id}")
async def get_satellite(norad_id: str):
    """Get specific satellite by NORAD ID"""
    position = satellite_service.propagate_satellite(norad_id)
    
    if not position:
        return {"error": "Satellite not found"}
    
    return position
    