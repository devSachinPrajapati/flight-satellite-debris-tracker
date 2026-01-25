# """
# FastAPI Main Application - OPTIMIZED FOR INSTANT STARTUP
# Real-time Flight & Satellite Tracking with WebSocket
# """
# from fastapi import FastAPI, WebSocket, WebSocketDisconnect # type: ignore
# from fastapi.middleware.cors import CORSMiddleware # type: ignore
# from contextlib import asynccontextmanager
# import asyncio
# from datetime import datetime

# from app.config import settings
# from app.routers import flights, satellites
# from app.services.flight_service import flight_service
# from app.services.satellite_service import satellite_service
# from app.services.websocket_manager import ws_manager


# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     """⚡ OPTIMIZED: Non-blocking startup - services initialize in parallel"""
#     print("=" * 60)
#     print("🚀 Starting Flight & Satellite Tracker (Optimized)")
#     print("=" * 60)
    
#     # ⚡ CRITICAL: Initialize services WITHOUT waiting for data
#     init_tasks = [
#         asyncio.create_task(flight_service.initialize()),
#         asyncio.create_task(satellite_service.initialize())
#     ]
    
#     # Start background tasks immediately
#     background_tasks = [
#         asyncio.create_task(flight_service.background_update_loop()),
#         asyncio.create_task(satellite_service.background_update_loop()),
#         asyncio.create_task(ws_manager.broadcast_loop())
#     ]
    
#     # Wait for service initialization (should be instant)
#     await asyncio.gather(*init_tasks)
    
#     print("✅ Services initialized (data loading in background)")
#     print(f"📡 WebSocket broadcast interval: {settings.WEBSOCKET_BROADCAST_INTERVAL}s")
#     print(f"✈️ Flight fetch interval: {settings.AIRLABS_FETCH_INTERVAL}s")
#     print(f"🛰️ Satellite fetch interval: {settings.CELESTRAK_FETCH_INTERVAL}s")
#     print("⚡ Server ready - clients can connect immediately!")
#     print("=" * 60)
    
#     yield
    
#     print("\n" + "=" * 60)
#     print("🛑 Shutting down...")
#     for task in background_tasks:
#         task.cancel()
#         try:
#             await task
#         except asyncio.CancelledError:
#             pass
#     print("✅ Background tasks stopped")
#     print("=" * 60)


# # Create FastAPI app
# app = FastAPI(
#     title="Flight & Satellite Tracker API",
#     description="Real-time tracking with WebSocket support (Optimized)",
#     version="2.0.1",
#     lifespan=lifespan
# )

# # CORS middleware
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
#     expose_headers=["*"]
# )

# # Include routers
# app.include_router(flights.router)
# app.include_router(satellites.router)


# @app.get("/")
# async def root():
#     """API information"""
#     return {
#         "name": "Flight & Satellite Tracker API",
#         "version": "2.0.1",
#         "status": "running",
#         "optimized": True,
#         "websocket": "/ws",
#         "endpoints": {
#             "flights": "/api/flights",
#             "satellites": "/api/satellites",
#             "health": "/api/health"
#         }
#     }


# @app.get("/api/health")
# async def health_check():
#     """System health status"""
#     return {
#         "status": "healthy",
#         "timestamp": datetime.utcnow().isoformat(),
#         "flights_cached": len(flight_service.flights_cache),
#         "satellites_cached": len(satellite_service.tle_cache),
#         "active_connections": len(ws_manager.active_connections),
#         "services_ready": {
#             "flights": flight_service.is_ready,
#             "satellites": satellite_service.is_ready
#         },
#         "last_flight_update": flight_service.last_api_call.isoformat() if flight_service.last_api_call else None,
#         "last_satellite_update": satellite_service.last_api_call.isoformat() if satellite_service.last_api_call else None,
#         "api_calls_made": flight_service.api_call_count,
#         "broadcasts_sent": ws_manager.broadcast_count
#     }


# @app.websocket("/ws")
# async def websocket_endpoint(websocket: WebSocket):
#     """⚡ OPTIMIZED: WebSocket endpoint - accepts connections immediately"""
#     await ws_manager.connect(websocket)
    
#     try:
#         while True:
#             try:
#                 data = await asyncio.wait_for(
#                     websocket.receive_text(),
#                     timeout=30.0
#                 )
#                 await ws_manager.handle_client_message(websocket, data)
#             except asyncio.TimeoutError:
#                 try:
#                     await websocket.send_text('{"type":"ping"}')
#                 except:
#                     break
#             except WebSocketDisconnect:
#                 break
#             except Exception as e:
#                 print(f"⚠️ WebSocket message error: {e}")
#                 break
                
#     except Exception as e:
#         print(f"⚠️ WebSocket error: {e}")
#     finally:
#         ws_manager.disconnect(websocket)


"""
FastAPI Main Application - OPTIMIZED FOR INSTANT STARTUP
Real-time Flight & Satellite Tracking with WebSocket + Airport Data
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from datetime import datetime

from app.config import settings
from app.routers import flights, satellites, airports  # ✅ Added airports
from app.services.flight_service import flight_service
from app.services.satellite_service import satellite_service
from app.services.websocket_manager import ws_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """OPTIMIZED: Non-blocking startup - services initialize in parallel"""
    print("=" * 60)
    print("🚀 Starting Flight & Satellite Tracker (Optimized)")
    print("=" * 60)
    
    # Initialize services WITHOUT waiting for data
    init_tasks = [
        asyncio.create_task(flight_service.initialize()),
        asyncio.create_task(satellite_service.initialize())
    ]
    
    # Start background tasks immediately
    background_tasks = [
        asyncio.create_task(flight_service.background_update_loop()),
        asyncio.create_task(satellite_service.background_update_loop()),
        asyncio.create_task(ws_manager.broadcast_loop())
    ]
    
    # Wait for service initialization (should be instant)
    await asyncio.gather(*init_tasks)
    
    print("✅ Services initialized (data loading in background)")
    print(f"📡 WebSocket broadcast interval: {settings.WEBSOCKET_BROADCAST_INTERVAL}s")
    print(f"✈️ Flight fetch interval: {settings.AIRLABS_FETCH_INTERVAL}s")
    print(f"🛰️ Satellite fetch interval: {settings.CELESTRAK_FETCH_INTERVAL}s")
    print("⚡ Server ready - clients can connect immediately!")
    print("=" * 60)
    
    yield
    
    print("\n" + "=" * 60)
    print("🛑 Shutting down...")
    for task in background_tasks:
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
    description="Real-time tracking with WebSocket support + Airport Data",
    version="2.1.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include routers
app.include_router(flights.router)
app.include_router(satellites.router)
app.include_router(airports.router)  # ✅ NEW: Airport data endpoints


@app.get("/")
async def root():
    """API information"""
    return {
        "name": "Flight & Satellite Tracker API",
        "version": "2.1.0",
        "status": "running",
        "optimized": True,
        "websocket": "/ws",
        "endpoints": {
            "flights": "/api/flights",
            "satellites": "/api/satellites",
            "airports": "/api/airports",  # ✅ NEW
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
        "services_ready": {
            "flights": flight_service.is_ready,
            "satellites": satellite_service.is_ready
        },
        "last_flight_update": flight_service.last_api_call.isoformat() if flight_service.last_api_call else None,
        "last_satellite_update": satellite_service.last_api_call.isoformat() if satellite_service.last_api_call else None,
        "api_calls_made": flight_service.api_call_count,
        "broadcasts_sent": ws_manager.broadcast_count
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """OPTIMIZED: WebSocket endpoint - accepts connections immediately"""
    await ws_manager.connect(websocket)
    
    try:
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30.0
                )
                await ws_manager.handle_client_message(websocket, data)
            except asyncio.TimeoutError:
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