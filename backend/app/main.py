"""
FastAPI Main Application - CORRECTED
Real-time Flight & Satellite Tracking with WebSocket
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from contextlib import asynccontextmanager
import asyncio
from datetime import datetime

from app.config import settings
from app.routers import flights, satellites
from app.services.flight_service import flight_service
from app.services.satellite_service import satellite_service
from app.services.websocket_manager import ws_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown events"""
    print("=" * 60)
    print("🚀 Starting Flight & Satellite Tracker")
    print("=" * 60)
    
    tasks = [
        asyncio.create_task(flight_service.background_update_loop()),
        asyncio.create_task(satellite_service.background_update_loop()),
        asyncio.create_task(ws_manager.broadcast_loop())
    ]
    
    print("✅ Background tasks started")
    print(f"📡 WebSocket broadcast interval: {settings.WEBSOCKET_BROADCAST_INTERVAL}s")
    print(f"✈️ Flight fetch interval: {settings.AIRLABS_FETCH_INTERVAL}s")
    print(f"🛰️ Satellite fetch interval: {settings.CELESTRAK_FETCH_INTERVAL}s")
    print("=" * 60)
    
    yield
    
    print("\n" + "=" * 60)
    print("🛑 Shutting down...")
    for task in tasks:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    print("✅ Background tasks stopped")
    print("=" * 60)


# Create FastAPI app
app = FastAPI(
    title="Flight & Satellite Tracker API",
    description="Real-time tracking with WebSocket support",
    version="2.0.0",
    lifespan=lifespan
)

# ✅ FIXED: Enhanced CORS middleware with WebSocket support
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)


# Include routers
app.include_router(flights.router)
app.include_router(satellites.router)


@app.get("/")
async def root():
    """API information"""
    return {
        "name": "Flight & Satellite Tracker API",
        "version": "2.0.0",
        "status": "running",
        "websocket": "/ws",
        "endpoints": {
            "flights": "/api/flights",
            "satellites": "/api/satellites",
            "health": "/api/health"
        }
    }


@app.get("/api/health")
async def health_check():
    """System health status"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "flights_cached": len(flight_service.flights_cache),
        "satellites_cached": len(satellite_service.tle_cache),
        "active_connections": len(ws_manager.active_connections),
        "last_flight_update": flight_service.last_api_call.isoformat() if flight_service.last_api_call else None,
        "last_satellite_update": satellite_service.last_api_call.isoformat() if satellite_service.last_api_call else None,
        "api_calls_made": flight_service.api_call_count,
        "broadcasts_sent": ws_manager.broadcast_count
    }


# ✅ FIXED: WebSocket endpoint with proper error handling
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time position updates"""
    await ws_manager.connect(websocket)
    
    try:
        while True:
            try:
                # Receive messages from client with timeout
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30.0
                )
                await ws_manager.handle_client_message(websocket, data)
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                try:
                    await websocket.send_text('{"type":"ping"}')
                except:
                    break
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"⚠️ WebSocket message error: {e}")
                break
                
    except Exception as e:
        print(f"⚠️ WebSocket error: {e}")
    finally:
        ws_manager.disconnect(websocket)