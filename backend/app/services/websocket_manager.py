"""
WebSocket Manager - FIXED VERSION
Properly gets propagated satellite positions instead of raw TLE data
"""
from fastapi import WebSocket, WebSocketDisconnect #type: ignore
from typing import List, Dict, Any
import asyncio
import json
import math
from datetime import datetime

from app.services.flight_service import flight_service
from app.services.satellite_service import satellite_service


def is_valid_number(value) -> bool:
    """Check if number is valid for JSON"""
    if value is None:
        return True
    if not isinstance(value, (int, float)):
        return True
    return not (math.isnan(value) or math.isinf(value))


def validate_flight(flight: Dict[str, Any]) -> bool:
    """Quick validation of flight data"""
    try:
        lat = float(flight.get('lat', 0))
        lng = float(flight.get('lng', 0))
        
        if not is_valid_number(lat) or not is_valid_number(lng):
            return False
        
        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            return False
        
        return True
    except:
        return False


def validate_satellite(sat: Dict[str, Any]) -> bool:
    """Quick validation of satellite data"""
    try:
        lat = float(sat.get('lat', 0))
        lng = float(sat.get('lng', 0))
        alt = float(sat.get('altitude', 0))
        
        if not is_valid_number(lat) or not is_valid_number(lng) or not is_valid_number(alt):
            return False
        
        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            return False
        
        # Reject extreme altitudes
        if alt > 100000:
            return False
        
        return True
    except:
        return False


class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.last_broadcast = datetime.utcnow()
        self.broadcast_interval = 2
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"✅ WebSocket connected (Total: {len(self.active_connections)})")
        await self.send_initial_data(websocket)
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"❌ WebSocket disconnected (Total: {len(self.active_connections)})")
    
    async def send_initial_data(self, websocket: WebSocket):
        """Send initial data with validation - FIXED"""
        if not flight_service.is_ready or not satellite_service.is_ready:
            await websocket.send_json({
                "type": "initial_data",
                "status": "loading"
            })
            return
        
        try:
            # ✅ FIX: Get and validate flights from cache
            flights = [
                f for f in flight_service.flights_cache.values()
                if validate_flight(f)
            ]
            
            # ✅ CRITICAL FIX: Get propagated satellites, not raw TLE data
            satellites_raw = satellite_service.get_all_propagated()
            satellites = [
                s for s in satellites_raw
                if validate_satellite(s)
            ]
            
            message = {
                "type": "initial_data",
                "status": "ready",
                "data": {
                    "flights": flights,
                    "satellites": satellites
                }
            }
            
            # Test JSON serialization
            json_str = json.dumps(message)
            await websocket.send_text(json_str)
            
            print(f"📤 Sent initial data (ready): {len(flights)} flights, {len(satellites)} satellites")
            
        except ValueError as e:
            print(f"❌ JSON error in initial data: {e}")
            await websocket.send_json({"type": "error", "message": "Data validation failed"})
        except Exception as e:
            print(f"❌ Error sending initial data: {e}")
            import traceback
            traceback.print_exc()
    
    async def broadcast_updates(self):
        """Broadcast with validation - FIXED"""
        if not self.active_connections:
            return
        
        if not flight_service.is_ready or not satellite_service.is_ready:
            return
        
        try:
            # ✅ FIX: Validate flight data
            flights = [
                f for f in flight_service.flights_cache.values()
                if validate_flight(f)
            ]
            
            # ✅ CRITICAL FIX: Get propagated satellites
            satellites_raw = satellite_service.get_all_propagated()
            satellites = [
                s for s in satellites_raw
                if validate_satellite(s)
            ]
            
            message = {
                "type": "position_update",
                "data": {
                    "flights": flights,
                    "satellites": satellites
                },
                "meta": {
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
            
            # Test JSON
            json_str = json.dumps(message)
            
            # Send to all
            disconnected = []
            for connection in self.active_connections:
                try:
                    await connection.send_text(json_str)
                except:
                    disconnected.append(connection)
            
            for conn in disconnected:
                self.disconnect(conn)
            
            self.last_broadcast = datetime.utcnow()
            
        except ValueError as e:
            print(f"❌ JSON error in broadcast: {e}")
        except Exception as e:
            print(f"❌ Broadcast error: {e}")
            import traceback
            traceback.print_exc()
    
    async def broadcast_loop(self):
        """Background broadcast loop"""
        print("🚀 Broadcast loop started")
        while True:
            try:
                await asyncio.sleep(self.broadcast_interval)
                await self.broadcast_updates()
            except Exception as e:
                print(f"❌ Broadcast error: {e}")
                await asyncio.sleep(5)
    
    async def handle_client_message(self, websocket: WebSocket, message: str):
        """Handle client messages"""
        try:
            data = json.loads(message)
            if data.get('type') == 'pong':
                pass
            elif data.get('type') == 'request_update':
                await self.send_initial_data(websocket)
        except:
            pass


# Global instance
ws_manager = WebSocketManager()