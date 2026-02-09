"""
WebSocket Manager - FIXED WITH PROPER PING/PONG HANDLING
Handles client ping requests
Sends pong responses
Prevents connection timeouts
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import asyncio
import json
import math
from datetime import datetime
import time

from app.services.spatial_service import spatial_service
from app.spatial.rtree import BoundingBox
from app.spatial.data_store import data_store


def is_valid_number(value) -> bool:
    """Check if number is valid for JSON"""
    if value is None:
        return True
    if not isinstance(value, (int, float)):
        return True
    return not (math.isnan(value) or math.isinf(value))


def validate_spatial_object(obj: Dict[str, Any]) -> bool:
    """Quick validation of spatial object data"""
    try:
        lat = float(obj.get('lat', 0))
        lng = float(obj.get('lng', 0))
        
        if not is_valid_number(lat) or not is_valid_number(lng):
            return False
        
        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            return False
        
        alt = float(obj.get('alt', 0) if 'alt' in obj else obj.get('altitude', 0))
        if not is_valid_number(alt):
            return False
            
        return True
    except:
        return False


class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.last_broadcast = datetime.utcnow()
        self.broadcast_interval = 2
        self.broadcast_count = 0
    
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
        """Send initial data from R-tree spatial index"""
        try:
            if not spatial_service.is_ready:
                await websocket.send_json({
                    "type": "initial_data",
                    "status": "loading",
                    "loading_status": {
                        "flights_ready": False,
                        "flights_loading": True,
                        "satellites_ready": False,
                        "satellites_loading": True
                    },
                    "data": {
                        "flights": [],
                        "satellites": []
                    },
                    "metadata": {
                        "flights_count": 0,
                        "satellites_count": 0,
                        "source": "waiting_for_spatial_index"
                    }
                })
                print("⏳ Spatial service not ready, sent loading status")
                return
            
            if not spatial_service.spatial_index:
                await websocket.send_json({
                    "type": "initial_data",
                    "status": "loading",
                    "loading_status": {
                        "flights_ready": False,
                        "flights_loading": True,
                        "satellites_ready": False,
                        "satellites_loading": True
                    },
                    "data": {
                        "flights": [],
                        "satellites": []
                    },
                    "metadata": {
                        "flights_count": 0,
                        "satellites_count": 0,
                        "source": "waiting_for_index_build"
                    }
                })
                print("⏳ Spatial index not built yet, sent loading status")
                return
            
            # Get data from R-tree spatial index
            flights_data = self._get_flights_from_rtree()
            
            # Retry logic for satellites
            satellites_data = []
            max_retries = 5
            retry_delay = 1.0
            
            for attempt in range(max_retries):
                satellites_data = self._get_satellites_from_rtree()
                
                if satellites_data or attempt == max_retries - 1:
                    if attempt > 0:
                        print(f"✅ Satellites loaded on attempt {attempt + 1}")
                    break
                
                if attempt == 0:
                    print(f"⏳ Waiting for satellites (will retry up to {max_retries} times)...")
                
                retry_delay = retry_delay * (1 + attempt * 0.5)
                await asyncio.sleep(retry_delay)
            
            flights_ready = len(flights_data) > 0
            satellites_ready = len(satellites_data) > 0
            
            message = {
                "type": "initial_data",
                "status": "ready" if (flights_ready and satellites_ready) else "loading",
                "loading_status": {
                    "flights_ready": flights_ready,
                    "flights_loading": not flights_ready,
                    "satellites_ready": satellites_ready,
                    "satellites_loading": not satellites_ready
                },
                "data": {
                    "flights": flights_data,
                    "satellites": satellites_data
                },
                "metadata": {
                    "flights_count": len(flights_data),
                    "satellites_count": len(satellites_data),
                    "source": "rtree_spatial_index",
                    "cache_stats": data_store.get_stats(),
                    "satellites_propagating": not satellites_ready,
                    "spatial_stats": spatial_service.get_stats()
                }
            }
            
            json_str = json.dumps(message)
            await websocket.send_text(json_str)
            
            print(f"📤 Sent initial data: {len(flights_data)} flights, {len(satellites_data)} satellites")
            
        except ValueError as e:
            print(f"❌ JSON error in initial data: {e}")
            await websocket.send_json({"type": "error", "message": "Data validation failed"})
        except Exception as e:
            print(f"❌ Error sending initial data: {e}")
            import traceback
            traceback.print_exc()
    
    def _get_flights_from_rtree(self) -> List[Dict[str, Any]]:
        """Get ALL flights from R-tree spatial index"""
        try:
            if not spatial_service.spatial_index:
                print("⚠️ Spatial index not available for flights query")
                return []
            
            global_bbox = BoundingBox(
                min_lat=-90.0,
                max_lat=90.0,
                min_lng=-180.0,
                max_lng=180.0
            )
            
            aircraft_objects = spatial_service.query_viewport(
                viewport=global_bbox,
                object_types={'aircraft'},
                min_alt=-0.5,
                max_alt=20.0,
                limit=10000
            )
            
            if not aircraft_objects:
                print("⚠️ R-tree returned no aircraft, checking data_store...")
                aircraft_objects = data_store.get_by_type('aircraft')
            
            flights = []
            for obj in aircraft_objects:
                flight_data = {
                    'hex': obj.id.replace('air_', ''),
                    'lat': obj.lat,
                    'lng': obj.lng,
                    'alt': obj.alt * 3.28084,
                    'dir': obj.heading,
                    'speed': obj.velocity / 0.514444,
                    'flight_icao': obj.name,
                }
                
                if obj.extra:
                    flight_data.update({
                        'flight_number': obj.extra.get('flight_number'),
                        'aircraft_icao': obj.extra.get('aircraft_icao'),
                        'airline_icao': obj.extra.get('airline_icao'),
                        'dep_iata': obj.extra.get('dep_iata'),
                        'dep_icao': obj.extra.get('dep_icao'),
                        'arr_iata': obj.extra.get('arr_iata'),
                        'arr_icao': obj.extra.get('arr_icao'),
                        'flag': obj.extra.get('flag'),
                        'v_speed': obj.extra.get('v_speed'),
                        'updated': obj.extra.get('updated', obj.timestamp // 1000),
                    })
                
                if validate_spatial_object(flight_data):
                    flights.append(flight_data)
            
            return flights
            
        except Exception as e:
            print(f"⚠️ Error getting flights from R-tree: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def _get_satellites_from_rtree(self) -> List[Dict[str, Any]]:
        """Get ALL satellites from R-tree with guaranteed TLE data"""
        try:
            if not spatial_service.spatial_index:
                print("⚠️ Spatial index not available for satellites query")
                return []
            
            global_bbox = BoundingBox(
                min_lat=-90.0,
                max_lat=90.0,
                min_lng=-180.0,
                max_lng=180.0
            )
            
            sat_objects = spatial_service.query_viewport(
                viewport=global_bbox,
                object_types={'satellite', 'debris'},
                min_alt=150.0,
                max_alt=250000.0,
                limit=20000
            )
            
            if not sat_objects:
                satellite_objects = data_store.get_by_type('satellite')
                debris_objects = data_store.get_by_type('debris')
                sat_objects = satellite_objects + debris_objects
            
            satellites = []
            for obj in sat_objects:
                sat_data = {
                    'norad_id': obj.id.replace('sat_', ''),
                    'name': obj.name,
                    'lat': obj.lat,
                    'lng': obj.lng,
                    'altitude': obj.alt,
                    'velocity': obj.velocity,
                    'object_type': obj.object_type,
                    'operator': obj.operator,
                    'visible': True,
                }
                
                # Always include TLE structure
                if obj.extra:
                    tle_data = obj.extra.get('tle')
                    if tle_data and isinstance(tle_data, dict):
                        sat_data['tle'] = {
                            'name': str(tle_data.get('name', obj.name)),
                            'line1': str(tle_data.get('line1', '')),
                            'line2': str(tle_data.get('line2', '')),
                        }
                    else:
                        sat_data['tle'] = {
                            'name': str(obj.name),
                            'line1': '',
                            'line2': '',
                        }
                    
                    sat_data.update({
                        'inclination': obj.extra.get('inclination'),
                        'period_minutes': obj.extra.get('period_minutes'),
                        'visible': obj.extra.get('visible', True),
                        'conjunction_risk': obj.extra.get('conjunction_risk', False),
                    })
                else:
                    sat_data['tle'] = {
                        'name': str(obj.name),
                        'line1': '',
                        'line2': '',
                    }
                
                if validate_spatial_object(sat_data):
                    satellites.append(sat_data)
            
            return satellites
            
        except Exception as e:
            print(f"⚠️ Error getting satellites from R-tree: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    async def broadcast_updates(self):
        """Broadcast updates using R-tree spatial index"""
        if not self.active_connections:
            return
        
        try:
            if not spatial_service.is_ready or not spatial_service.spatial_index:
                return
            
            flights_data = self._get_flights_from_rtree()
            satellites_data = self._get_satellites_from_rtree()
            
            flights_ready = len(flights_data) > 0
            satellites_ready = len(satellites_data) > 0
            
            message = {
                "type": "position_update",
                "status": "ready" if (flights_ready and satellites_ready) else "loading",
                "loading_status": {
                    "flights_ready": flights_ready,
                    "flights_loading": not flights_ready,
                    "satellites_ready": satellites_ready,
                    "satellites_loading": not satellites_ready
                },
                "data": {
                    "flights": flights_data,
                    "satellites": satellites_data
                },
                "meta": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "flights_count": len(flights_data),
                    "satellites_count": len(satellites_data),
                    "broadcast_number": self.broadcast_count,
                    "source": "rtree_spatial_index"
                }
            }
            
            json_str = json.dumps(message)
            
            disconnected = []
            for connection in self.active_connections:
                try:
                    await connection.send_text(json_str)
                except:
                    disconnected.append(connection)
            
            for conn in disconnected:
                self.disconnect(conn)
            
            self.last_broadcast = datetime.utcnow()
            self.broadcast_count += 1
            
            if self.broadcast_count % 30 == 0:
                print(f"📡 Broadcast #{self.broadcast_count}: {len(flights_data)} flights, {len(satellites_data)} satellites")
            
        except ValueError as e:
            print(f"❌ JSON error in broadcast: {e}")
        except Exception as e:
            print(f"❌ Broadcast error: {e}")
            import traceback
            traceback.print_exc()
    
    async def broadcast_loop(self):
        """Background broadcast loop"""
        print("🚀 Broadcast loop started (using R-tree spatial index)")
        while True:
            try:
                await asyncio.sleep(self.broadcast_interval)
                await self.broadcast_updates()
            except Exception as e:
                print(f"❌ Broadcast loop error: {e}")
                await asyncio.sleep(5)
    
    async def handle_client_message(self, websocket: WebSocket, message: str):
        """
        ✅ FIXED: Handle client messages including PING
        """
        try:
            data = json.loads(message)
            msg_type = data.get('type')
            
            # ✅ CRITICAL FIX: Respond to ping from client
            if msg_type == 'ping':
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": time.time()
                })
                return
            
            elif msg_type == 'pong':
                # Client responded to our ping
                pass
            
            elif msg_type == 'request_update':
                await self.send_initial_data(websocket)
            
            elif msg_type == 'get_cache_stats':
                stats = {
                    "type": "cache_stats",
                    "data_store": data_store.get_stats(),
                    "spatial_index": spatial_service.get_stats() if spatial_service.is_ready else None
                }
                await websocket.send_json(stats)
            
            elif msg_type == 'get_rtree_stats':
                if spatial_service.spatial_index:
                    rtree_stats = spatial_service.spatial_index.get_stats()
                    await websocket.send_json({
                        "type": "rtree_stats",
                        "stats": rtree_stats
                    })
                else:
                    await websocket.send_json({
                        "type": "rtree_stats",
                        "error": "R-tree not built yet"
                    })
        except json.JSONDecodeError:
            print(f"⚠️ Invalid JSON from client: {message[:100]}")
        except Exception as e:
            print(f"⚠️ Error handling client message: {e}")


ws_manager = WebSocketManager()