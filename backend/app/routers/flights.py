"""
Flight REST API Routes
"""
from fastapi import APIRouter # type: ignore
from app.services.flight_service import flight_service

router = APIRouter(prefix="/api/flights", tags=["flights"])


@router.get("/")
async def get_flights():
    """
    Get current flight positions (interpolated)
    Used for initial data load only - use WebSocket for real-time updates
    """
    flights = flight_service.get_all_interpolated()
    
    return {
        "flights": flights,
        "count": len(flights),
        "last_update": flight_service.last_api_call.isoformat() if flight_service.last_api_call else None,
        "api_calls_made": flight_service.api_call_count
    }


@router.get("/{flight_id}")
async def get_flight(flight_id: str):
    """Get specific flight by ID"""
    position = flight_service.interpolate_position(flight_id)
    
    if not position:
        return {"error": "Flight not found"}
    
    return position