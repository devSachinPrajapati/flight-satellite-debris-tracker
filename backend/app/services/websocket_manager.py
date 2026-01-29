# """
# WebSocket Manager - FIXED NUMPY TYPE SERIALIZATION
# """
# import asyncio
# import json
# from datetime import datetime
# from typing import List
# from fastapi import WebSocket # type: ignore
# from app.config import settings
# from app.services.flight_service import flight_service
# from app.services.satellite_service import satellite_service
# import numpy as np # type: ignore


# class DateTimeEncoder(json.JSONEncoder):
#     """✅ FIXED: Handle datetime AND numpy types"""
#     def default(self, obj):
#         if isinstance(obj, datetime):
#             return obj.isoformat()
#         # ✅ CRITICAL FIX: Handle numpy types
#         if isinstance(obj, np.integer):
#             return int(obj)
#         if isinstance(obj, np.floating):
#             return float(obj)
#         if isinstance(obj, np.bool_):
#             return bool(obj)
#         if isinstance(obj, np.ndarray):
#             return obj.tolist()
#         return super().default(obj)


# class WebSocketManager:
#     def __init__(self):
#         self.active_connections: List[WebSocket] = []
#         self.broadcast_count = 0
        
#     async def connect(self, websocket: WebSocket):
#         """Accept connection immediately, send data progressively"""
#         try:
#             await websocket.accept()
#             self.active_connections.append(websocket)
#             print(f"✅ WebSocket connected (Total: {len(self.active_connections)})")
            
#             await self.send_initial_data(websocket)
#         except Exception as e:
#             print(f"❌ Error accepting WebSocket: {e}")
#             raise
    
#     def disconnect(self, websocket: WebSocket):
#         """Remove WebSocket connection"""
#         if websocket in self.active_connections:
#             self.active_connections.remove(websocket)
#             print(f"❌ WebSocket disconnected (Total: {len(self.active_connections)})")
    
#     def sanitize_data(self, data: List[dict]) -> List[dict]:
#         """✅ FIXED: Convert datetime AND numpy types to JSON-serializable formats"""
#         sanitized = []
#         for item in data:
#             clean_item = {}
#             for key, value in item.items():
#                 # Convert datetime
#                 if isinstance(value, datetime):
#                     clean_item[key] = value.isoformat()
#                 # ✅ CRITICAL FIX: Convert numpy types
#                 elif isinstance(value, np.integer):
#                     clean_item[key] = int(value)
#                 elif isinstance(value, np.floating):
#                     clean_item[key] = float(value)
#                 elif isinstance(value, np.bool_):
#                     clean_item[key] = bool(value)
#                 elif isinstance(value, np.ndarray):
#                     clean_item[key] = value.tolist()
#                 # Handle nested dicts (like TLE data)
#                 elif isinstance(value, dict):
#                     clean_item[key] = self._sanitize_dict(value)
#                 else:
#                     clean_item[key] = value
#             sanitized.append(clean_item)
#         return sanitized
    
#     def _sanitize_dict(self, data: dict) -> dict:
#         """Helper to sanitize nested dictionaries"""
#         clean = {}
#         for key, value in data.items():
#             if isinstance(value, datetime):
#                 clean[key] = value.isoformat()
#             elif isinstance(value, np.integer):
#                 clean[key] = int(value)
#             elif isinstance(value, np.floating):
#                 clean[key] = float(value)
#             elif isinstance(value, np.bool_):
#                 clean[key] = bool(value)
#             elif isinstance(value, np.ndarray):
#                 clean[key] = value.tolist()
#             elif isinstance(value, dict):
#                 clean[key] = self._sanitize_dict(value)
#             else:
#                 clean[key] = value
#         return clean
    
#     async def send_initial_data(self, websocket: WebSocket):
#         """Send initial data with proper type conversion"""
#         try:
#             flights = flight_service.get_all_interpolated()
#             satellites = satellite_service.get_all_propagated()
            
#             flights_clean = self.sanitize_data(flights)
#             satellites_clean = self.sanitize_data(satellites)
            
#             message = {
#                 "type": "initial_data",
#                 "timestamp": datetime.utcnow().isoformat(),
#                 "data": {
#                     "flights": flights_clean,
#                     "satellites": satellites_clean
#                 },
#                 "metadata": {
#                     "flights_count": len(flights_clean),
#                     "satellites_count": len(satellites_clean),
#                     "is_loading": not (flight_service.is_ready and satellite_service.is_ready),
#                     "using_mock_flights": flight_service.use_mock_data
#                 }
#             }
            
#             await websocket.send_text(json.dumps(message, cls=DateTimeEncoder))
            
#             data_status = "loading" if message["metadata"]["is_loading"] else "ready"
#             print(f"📤 Sent initial data ({data_status}): {len(flights)} flights, {len(satellites)} satellites")
#         except Exception as e:
#             print(f"❌ Error sending initial data: {e}")
#             import traceback
#             traceback.print_exc()
#             self.disconnect(websocket)
    
#     async def broadcast_positions(self):
#         """Broadcast with proper type conversion"""
#         if not self.active_connections:
#             return
        
#         try:
#             flights = flight_service.get_all_interpolated()
#             satellites = satellite_service.get_all_propagated()
            
#             flights_clean = self.sanitize_data(flights)
#             satellites_clean = self.sanitize_data(satellites)
            
#             message_dict = {
#                 "type": "position_update",
#                 "timestamp": datetime.utcnow().isoformat(),
#                 "data": {
#                     "flights": flights_clean,
#                     "satellites": satellites_clean
#                 }
#             }
            
#             message = json.dumps(message_dict, cls=DateTimeEncoder)
            
#             disconnected = []
#             send_tasks = []
            
#             for connection in self.active_connections:
#                 send_tasks.append(
#                     self._safe_send(connection, message, disconnected)
#                 )
            
#             await asyncio.gather(*send_tasks, return_exceptions=True)
            
#             for conn in disconnected:
#                 self.disconnect(conn)
            
#             self.broadcast_count += 1
            
#             if self.broadcast_count % 30 == 0:
#                 print(f"📡 Broadcast #{self.broadcast_count}: {len(flights)} flights, {len(satellites)} satellites → {len(self.active_connections)} clients")
#         except Exception as e:
#             print(f"❌ Broadcast error: {e}")
    
#     async def _safe_send(self, connection: WebSocket, message: str, disconnected: List[WebSocket]):
#         """Helper to safely send with timeout"""
#         try:
#             await asyncio.wait_for(
#                 connection.send_text(message),
#                 timeout=3.0
#             )
#         except (asyncio.TimeoutError, Exception):
#             disconnected.append(connection)
    
#     async def broadcast_loop(self):
#         """Start broadcasting immediately"""
#         print("🚀 Broadcast loop started")
        
#         while True:
#             await self.broadcast_positions()
#             await asyncio.sleep(settings.WEBSOCKET_BROADCAST_INTERVAL)
    
#     async def handle_client_message(self, websocket: WebSocket, message: str):
#         """Handle messages from clients"""
#         try:
#             data = json.loads(message)
#             msg_type = data.get("type")
            
#             if msg_type == "ping":
#                 await websocket.send_text(json.dumps({
#                     "type": "pong",
#                     "timestamp": datetime.utcnow().isoformat()
#                 }))
#             elif msg_type == "request_update":
#                 await self.send_initial_data(websocket)
#         except Exception as e:
#             print(f"⚠️ Error handling client message: {e}")


# ws_manager = WebSocketManager()

"""
WebSocket Manager - MINIMAL FIX
Just adds validation without major refactoring
"""
from fastapi import WebSocket, WebSocketDisconnect
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
        """Send initial data with validation"""
        if not flight_service.is_ready or not satellite_service.is_ready:
            await websocket.send_json({
                "type": "initial_data",
                "status": "loading"
            })
            return
        
        try:
            # Get and validate flights
            flights = [
                f for f in flight_service.flights_cache.values()
                if validate_flight(f)
            ]
            
            # Get and validate satellites
            satellites = [
                s for s in satellite_service.tle_cache.values()
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
    
    async def broadcast_updates(self):
        """Broadcast with validation"""
        if not self.active_connections:
            return
        
        if not flight_service.is_ready or not satellite_service.is_ready:
            return
        
        try:
            # Validate data before sending
            flights = [
                f for f in flight_service.flights_cache.values()
                if validate_flight(f)
            ]
            
            satellites = [
                s for s in satellite_service.tle_cache.values()
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