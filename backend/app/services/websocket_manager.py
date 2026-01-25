# """
# WebSocket Manager - WITH PROPER JSON SERIALIZATION
# """
# import asyncio
# import json
# from datetime import datetime
# from typing import List
# from fastapi import WebSocket # type: ignore
# from app.config import settings
# from app.services.flight_service import flight_service
# from app.services.satellite_service import satellite_service


# # ✅ CUSTOM JSON ENCODER FOR DATETIME
# class DateTimeEncoder(json.JSONEncoder):
#     def default(self, obj):
#         if isinstance(obj, datetime):
#             return obj.isoformat()
#         return super().default(obj)


# class WebSocketManager:
#     def __init__(self):
#         self.active_connections: List[WebSocket] = []
#         self.broadcast_count = 0
        
#     async def connect(self, websocket: WebSocket):
#         """Accept new WebSocket connection"""
#         try:
#             await websocket.accept()
#             self.active_connections.append(websocket)
#             print(f"✅ New WebSocket connection (Total: {len(self.active_connections)})")
            
#             # Send initial data immediately
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
#         """
#         Convert datetime objects to ISO strings for JSON serialization
#         """
#         sanitized = []
#         for item in data:
#             clean_item = {}
#             for key, value in item.items():
#                 if isinstance(value, datetime):
#                     clean_item[key] = value.isoformat()
#                 else:
#                     clean_item[key] = value
#             sanitized.append(clean_item)
#         return sanitized
    
#     async def send_initial_data(self, websocket: WebSocket):
#         """Send initial data to newly connected client"""
#         try:
#             flights = flight_service.get_all_interpolated()
#             satellites = satellite_service.get_all_propagated()
            
#             # ✅ FIXED: Sanitize data before JSON serialization
#             flights_clean = self.sanitize_data(flights)
#             satellites_clean = self.sanitize_data(satellites)
            
#             message = {
#                 "type": "initial_data",
#                 "timestamp": datetime.utcnow().isoformat(),  # ✅ Convert to string
#                 "data": {
#                     "flights": flights_clean,
#                     "satellites": satellites_clean
#                 }
#             }
            
#             # ✅ Use custom encoder as fallback
#             await websocket.send_text(json.dumps(message, cls=DateTimeEncoder))
#             print(f"📤 Sent initial data: {len(flights)} flights, {len(satellites)} satellites")
#         except Exception as e:
#             print(f"❌ Error sending initial data: {e}")
#             import traceback
#             traceback.print_exc()
#             self.disconnect(websocket)
    
#     async def broadcast_positions(self):
#         """Broadcast position updates to all connected clients"""
#         if not self.active_connections:
#             return
        
#         try:
#             flights = flight_service.get_all_interpolated()
#             satellites = satellite_service.get_all_propagated()
            
#             # ✅ FIXED: Sanitize data before JSON serialization
#             flights_clean = self.sanitize_data(flights)
#             satellites_clean = self.sanitize_data(satellites)
            
#             message_dict = {
#                 "type": "position_update",
#                 "timestamp": datetime.utcnow().isoformat(),  # ✅ Convert to string
#                 "data": {
#                     "flights": flights_clean,
#                     "satellites": satellites_clean
#                 }
#             }
            
#             # ✅ Use custom encoder as fallback
#             message = json.dumps(message_dict, cls=DateTimeEncoder)
            
#             # ✅ Better error handling for disconnected clients
#             disconnected = []
#             for connection in self.active_connections:
#                 try:
#                     await asyncio.wait_for(
#                         connection.send_text(message),
#                         timeout=5.0
#                     )
#                 except asyncio.TimeoutError:
#                     print(f"⚠️ Send timeout for client")
#                     disconnected.append(connection)
#                 except Exception as e:
#                     print(f"⚠️ Error sending to client: {e}")
#                     disconnected.append(connection)
            
#             for conn in disconnected:
#                 self.disconnect(conn)
            
#             self.broadcast_count += 1
            
#             if self.broadcast_count % 30 == 0:
#                 print(f"📡 Broadcast #{self.broadcast_count}: {len(flights)} flights, {len(satellites)} satellites to {len(self.active_connections)} clients")
#         except Exception as e:
#             print(f"❌ Broadcast error: {e}")
#             import traceback
#             traceback.print_exc()
    
#     async def broadcast_loop(self):
#         """Background task to broadcast updates"""
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
#                     "timestamp": datetime.utcnow().isoformat()  # ✅ Convert to string
#                 }))
#             elif msg_type == "request_update":
#                 await self.send_initial_data(websocket)
#         except Exception as e:
#             print(f"⚠️ Error handling client message: {e}")


# ws_manager = WebSocketManager()


"""
WebSocket Manager - OPTIMIZED WITH PROGRESSIVE DATA STREAMING
"""
import asyncio
import json
from datetime import datetime
from typing import List
from fastapi import WebSocket
from app.config import settings
from app.services.flight_service import flight_service
from app.services.satellite_service import satellite_service


class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.broadcast_count = 0
        
    async def connect(self, websocket: WebSocket):
        """⚡ OPTIMIZED: Accept connection immediately, send data progressively"""
        try:
            await websocket.accept()
            self.active_connections.append(websocket)
            print(f"✅ WebSocket connected (Total: {len(self.active_connections)})")
            
            # ⚡ Send initial data immediately (even if minimal)
            await self.send_initial_data(websocket)
        except Exception as e:
            print(f"❌ Error accepting WebSocket: {e}")
            raise
    
    def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"❌ WebSocket disconnected (Total: {len(self.active_connections)})")
    
    def sanitize_data(self, data: List[dict]) -> List[dict]:
        """Convert datetime objects to ISO strings"""
        sanitized = []
        for item in data:
            clean_item = {}
            for key, value in item.items():
                if isinstance(value, datetime):
                    clean_item[key] = value.isoformat()
                else:
                    clean_item[key] = value
            sanitized.append(clean_item)
        return sanitized
    
    async def send_initial_data(self, websocket: WebSocket):
        """⚡ OPTIMIZED: Send whatever data is available immediately"""
        try:
            # Get current data (may be empty or partial during startup)
            flights = flight_service.get_all_interpolated()
            satellites = satellite_service.get_all_propagated()
            
            flights_clean = self.sanitize_data(flights)
            satellites_clean = self.sanitize_data(satellites)
            
            message = {
                "type": "initial_data",
                "timestamp": datetime.utcnow().isoformat(),
                "data": {
                    "flights": flights_clean,
                    "satellites": satellites_clean
                },
                "metadata": {
                    "flights_count": len(flights_clean),
                    "satellites_count": len(satellites_clean),
                    "is_loading": not (flight_service.is_ready and satellite_service.is_ready),
                    "using_mock_flights": flight_service.use_mock_data
                }
            }
            
            await websocket.send_text(json.dumps(message, cls=DateTimeEncoder))
            
            # ⚡ Log with context
            data_status = "loading" if message["metadata"]["is_loading"] else "ready"
            print(f"📤 Sent initial data ({data_status}): {len(flights)} flights, {len(satellites)} satellites")
        except Exception as e:
            print(f"❌ Error sending initial data: {e}")
            import traceback
            traceback.print_exc()
            self.disconnect(websocket)
    
    async def broadcast_positions(self):
        """⚡ OPTIMIZED: Broadcast with better error handling"""
        if not self.active_connections:
            return
        
        try:
            flights = flight_service.get_all_interpolated()
            satellites = satellite_service.get_all_propagated()
            
            flights_clean = self.sanitize_data(flights)
            satellites_clean = self.sanitize_data(satellites)
            
            message_dict = {
                "type": "position_update",
                "timestamp": datetime.utcnow().isoformat(),
                "data": {
                    "flights": flights_clean,
                    "satellites": satellites_clean
                }
            }
            
            message = json.dumps(message_dict, cls=DateTimeEncoder)
            
            # ⚡ OPTIMIZED: Batch disconnect handling
            disconnected = []
            send_tasks = []
            
            for connection in self.active_connections:
                send_tasks.append(
                    self._safe_send(connection, message, disconnected)
                )
            
            # Send to all clients concurrently
            await asyncio.gather(*send_tasks, return_exceptions=True)
            
            # Clean up disconnected clients
            for conn in disconnected:
                self.disconnect(conn)
            
            self.broadcast_count += 1
            
            # ⚡ Reduced logging frequency
            if self.broadcast_count % 30 == 0:
                print(f"📡 Broadcast #{self.broadcast_count}: {len(flights)} flights, {len(satellites)} satellites → {len(self.active_connections)} clients")
        except Exception as e:
            print(f"❌ Broadcast error: {e}")
    
    async def _safe_send(self, connection: WebSocket, message: str, disconnected: List[WebSocket]):
        """⚡ Helper to safely send with timeout"""
        try:
            await asyncio.wait_for(
                connection.send_text(message),
                timeout=3.0  # Reduced timeout
            )
        except (asyncio.TimeoutError, Exception):
            disconnected.append(connection)
    
    async def broadcast_loop(self):
        """⚡ OPTIMIZED: Start broadcasting immediately"""
        print("🚀 Broadcast loop started")
        
        while True:
            await self.broadcast_positions()
            await asyncio.sleep(settings.WEBSOCKET_BROADCAST_INTERVAL)
    
    async def handle_client_message(self, websocket: WebSocket, message: str):
        """Handle messages from clients"""
        try:
            data = json.loads(message)
            msg_type = data.get("type")
            
            if msg_type == "ping":
                await websocket.send_text(json.dumps({
                    "type": "pong",
                    "timestamp": datetime.utcnow().isoformat()
                }))
            elif msg_type == "request_update":
                await self.send_initial_data(websocket)
        except Exception as e:
            print(f"⚠️ Error handling client message: {e}")


ws_manager = WebSocketManager()