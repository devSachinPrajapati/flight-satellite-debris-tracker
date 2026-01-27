"""
Viewport Query API - High-Performance Spatial Endpoint
"""
from fastapi import APIRouter, Query, HTTPException # type: ignore
from typing import Optional, List, Set
from pydantic import BaseModel # type: ignore
from datetime import datetime 
import time

from app.spatial.data_store import data_store
from app.spatial.rtree import BoundingBox
from app.services.spatial_service import spatial_service # type: ignore


router = APIRouter(prefix="/api/v1/viewport", tags=["viewport"])


class ViewportQuery(BaseModel):
    """Viewport query parameters"""
    min_lat: float
    max_lat: float
    min_lng: float
    max_lng: float
    types: Optional[List[str]] = None
    min_alt: Optional[float] = None
    max_alt: Optional[float] = None
    limit: int = 2000
    zoom: Optional[float] = None


class CompactObject(BaseModel):
    """Compact object format for minimal payload"""
    i: str  # id
    t: int  # type (0=aircraft, 1=satellite, 2=debris)
    p: List[float]  # [lat, lng, alt]
    v: List[float]  # [velocity, heading]
    n: str  # name
    o: Optional[str] = None  # operator
    x: Optional[dict] = None  # extra


class ViewportResponse(BaseModel):
    """Viewport query response"""
    objects: List[CompactObject]
    meta: dict


@router.get("/")
async def query_viewport(
    min_lat: float = Query(..., description="Minimum latitude"),
    max_lat: float = Query(..., description="Maximum latitude"),
    min_lng: float = Query(..., description="Minimum longitude"),
    max_lng: float = Query(..., description="Maximum longitude"),
    types: Optional[str] = Query(None, description="Comma-separated types (aircraft,satellite,debris)"),
    min_alt: Optional[float] = Query(None, description="Minimum altitude (meters)"),
    max_alt: Optional[float] = Query(None, description="Maximum altitude (meters)"),
    limit: int = Query(2000, description="Maximum results"),
    zoom: Optional[float] = Query(None, description="Client zoom level")
):
    """
    High-performance viewport query using R-tree spatial index
    Target response time: 50-150ms
    """
    start_time = time.time()
    
    # Validate bounds
    if not (-90 <= min_lat <= 90) or not (-90 <= max_lat <= 90):
        raise HTTPException(status_code=400, detail="Invalid latitude bounds")
    if not (-180 <= min_lng <= 180) or not (-180 <= max_lng <= 180):
        raise HTTPException(status_code=400, detail="Invalid longitude bounds")
    if min_lat >= max_lat:
        raise HTTPException(status_code=400, detail="min_lat must be less than max_lat")
    if min_lng >= max_lng:
        raise HTTPException(status_code=400, detail="min_lng must be less than max_lng")
    
    # Parse types filter
    object_types: Optional[Set[str]] = None
    if types:
        object_types = set(types.split(','))
        valid_types = {'aircraft', 'satellite', 'debris'}
        if not object_types.issubset(valid_types):
            raise HTTPException(status_code=400, detail=f"Invalid types. Must be subset of {valid_types}")
    
    # Create viewport bounding box
    viewport = BoundingBox(min_lat, max_lat, min_lng, max_lng)
    
    # Query spatial index
    try:
        objects = spatial_service.query_viewport(
            viewport=viewport,
            object_types=object_types,
            min_alt=min_alt,
            max_alt=max_alt,
            limit=limit
        )
    except Exception as e:
        print(f"❌ Spatial query error: {e}")
        raise HTTPException(status_code=500, detail="Spatial query failed")
    
    # Convert to compact format
    compact_objects = [_compactify(obj) for obj in objects]
    
    query_time_ms = (time.time() - start_time) * 1000
    
    # Build response
    response = ViewportResponse(
        objects=compact_objects,
        meta={
            "count": len(compact_objects),
            "truncated": len(objects) >= limit,
            "query_time_ms": round(query_time_ms, 2),
            "viewport": {
                "min_lat": min_lat,
                "max_lat": max_lat,
                "min_lng": min_lng,
                "max_lng": max_lng
            },
            "data_age": {
                "celestrak": (datetime.utcnow() - data_store.last_update['celestrak']).total_seconds(),
                "airlabs": (datetime.utcnow() - data_store.last_update['airlabs']).total_seconds()
            }
        }
    )
    
    # Performance warning
    if query_time_ms > 200:
        print(f"⚠️ Slow query: {query_time_ms:.2f}ms for {len(objects)} objects")
    
    return response


def _compactify(obj) -> CompactObject:
    """Convert SpatialObject to compact format (50% smaller payload)"""
    type_map = {'aircraft': 0, 'satellite': 1, 'debris': 2}
    
    return CompactObject(
        i=obj.id,
        t=type_map.get(obj.object_type, 0),
        p=[obj.lat, obj.lng, obj.alt],
        v=[obj.velocity, obj.heading],
        n=obj.name,
        o=obj.operator,
        x=obj.extra
    )


@router.get("/stats")
async def get_spatial_stats():
    """Get spatial index statistics"""
    return {
        "store": data_store.get_stats(),
        "index": spatial_service.get_stats(),
        "timestamp": datetime.utcnow().isoformat()
    }