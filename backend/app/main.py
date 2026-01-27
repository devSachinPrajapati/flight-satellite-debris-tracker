"""
FastAPI Main Application - WITH SPATIAL INDEXING
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from contextlib import asynccontextmanager
import asyncio
from datetime import datetime

from app.config import settings
from app.routers import flights, satellites, airports, viewport
from app.services.flight_service import flight_service
from app.services.satellite_service import satellite_service
from app.services.websocket_manager import ws_manager
from app.services.spatial_service import spatial_service
from app.spatial.data_store import data_store


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Optimized startup with spatial indexing"""
    print("=" * 60)
    print("🚀 Starting Flight & Satellite Tracker (Spatial Edition)")
    print("=" * 60)
    
    # Initialize services
    init_tasks = [
        asyncio.create_task(flight_service.initialize()),
        asyncio.create_task(satellite_service.initialize()),
        asyncio.create_task(spatial_service.initialize())  # NEW
    ]
    
    # Start background tasks
    background_tasks = [
        asyncio.create_task(flight_service.background_update_loop()),
        asyncio.create_task(satellite_service.background_update_loop()),
        asyncio.create_task(ws_manager.broadcast_loop()),
        asyncio.create_task(spatial_service.background_refresh_loop()),  # NEW
        asyncio.create_task(spatial_service.background_celestrak_loop())  # NEW
    ]
    
    await asyncio.gather(*init_tasks)
    
    print("✅ All services initialized")
    print(f"📡 WebSocket broadcast: {settings.WEBSOCKET_BROADCAST_INTERVAL}s")
    print(f"✈️ Flight refresh: {settings.AIRLABS_FETCH_INTERVAL}s")
    print(f"🛰️ Satellite refresh: {settings.CELESTRAK_FETCH_INTERVAL}s")
    print("⚡ Server ready with spatial indexing!")
    print("=" * 60)
    
    yield
    
    print("\n🛑 Shutting down...")
    for task in background_tasks:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    print("✅ Shutdown complete")


app = FastAPI(
    title="Flight & Satellite Tracker API",
    description="Real-time tracking with spatial indexing",
    version="3.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Include routers
app.include_router(flights.router)
app.include_router(satellites.router)
app.include_router(airports.router)
app.include_router(viewport.router)  # NEW: Spatial viewport API


@app.get("/")
async def root():
    return {
        "name": "Flight & Satellite Tracker API",
        "version": "3.0.0",
        "features": ["spatial-indexing", "r-tree", "sub-200ms-queries"],
        "endpoints": {
            "flights": "/api/flights",
            "satellites": "/api/satellites",
            "airports": "/api/airports",
            "viewport": "/api/v1/viewport",  # NEW
            "health": "/api/health"
        }
    }


@app.get("/api/health")
async def health_check():
    """Enhanced health check with spatial stats"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "spatial": {
            "store": data_store.get_stats(),
            "index": spatial_service.get_stats() if spatial_service.is_ready else {"status": "initializing"}
        },
        "services": {
            "flights": flight_service.is_ready,
            "satellites": satellite_service.is_ready,
            "spatial": spatial_service.is_ready
        },
        "connections": len(ws_manager.active_connections)
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                await ws_manager.handle_client_message(websocket, data)
            except asyncio.TimeoutError:
                await websocket.send_text('{"type":"ping"}')
            except WebSocketDisconnect:
                break
    except Exception as e:
        print(f"⚠️ WebSocket error: {e}")
    finally:
        ws_manager.disconnect(websocket)