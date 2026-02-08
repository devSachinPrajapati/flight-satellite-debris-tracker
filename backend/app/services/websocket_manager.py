"""
WebSocket Manager - USES R-TREE SPATIAL INDEX 
Queries spatial_service R-tree with global bounds
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import asyncio
import json
import math
from datetime import datetime

# Import spatial_service and BoundingBox
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
        
        # Check altitude based on object type
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
        """
        Get initial data from R-tree spatial index
        Uses global bounds to get all cached objects
        """
        try:
            # Check if spatial service is ready
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
            
            # Check if spatial index exists
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
            
            # Get data from R-tree spatial index (not data_store)
            flights_data = self._get_flights_from_rtree()
            # satellites_data = self._get_satellites_from_rtree()
            
             # ✅ FIX #2: Retry logic for satellites (may take 3-4 seconds to propagate)
            satellites_data = []
            max_retries = 5
            retry_delay = 1.0
            
            for attempt in range(max_retries):
                satellites_data = self._get_satellites_from_rtree()
                
                if satellites_data or attempt == max_retries - 1:
                    # if satellites_data:
                    # Only log if it took more than 1 attempt (interesting case)
                    if attempt > 0:
                        print(f"✅ Satellites loaded on attempt {attempt + 1}")
                    break
                if attempt == max_retries - 1:
                    print(f"⏳ Satellites not ready, retrying in {retry_delay}s (attempt {attempt + 1}/{max_retries})")
                    break
                # await asyncio.sleep(retry_delay)
                # Calculate exponential backoff: 1s, 1.5s, 2s, 2.5s, 3s
                retry_delay = retry_delay * (1 + attempt * 0.5)
                
                # Only log first retry to reduce noise
                if attempt == 0:
                    print(f"⏳ Waiting for satellites (will retry up to {max_retries} times)...")
                
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
            
            # Test JSON serialization
            json_str = json.dumps(message)
            await websocket.send_text(json_str)
            
            print(f"📤 Sent initial data from R-tree: {len(flights_data)} flights, {len(satellites_data)} satellites")
            
        except ValueError as e:
            print(f"❌ JSON error in initial data: {e}")
            await websocket.send_json({"type": "error", "message": "Data validation failed"})
        except Exception as e:
            print(f"❌ Error sending initial data: {e}")
    
    def _get_flights_from_rtree(self) -> List[Dict[str, Any]]:
        """
        Get ALL flights from R-tree spatial index using global bounds
        Altitude passed as separate parameters, NOT in BoundingBox
        """
        try:
            if not spatial_service.spatial_index:
                print("⚠️ Spatial index not available for flights query")
                return []
            
            # BoundingBox only takes lat/lng, not altitude
            global_bbox = BoundingBox(
                min_lat=-90.0,
                max_lat=90.0,
                min_lng=-180.0,
                max_lng=180.0
            )
            
            # Pass altitude as separate min_alt/max_alt parameters
            aircraft_objects = spatial_service.query_viewport(
                viewport=global_bbox,
                object_types={'aircraft'},
                min_alt=-0.5,      # Aircraft min altitude in km
                max_alt=20.0,      # Aircraft max altitude in km
                limit=10000
            )
            
            if not aircraft_objects:
                # Try fallback to data_store if R-tree returns empty
                print("⚠️ R-tree returned no aircraft, checking data_store...")
                aircraft_objects = data_store.get_by_type('aircraft')
            
            flights = []
            for obj in aircraft_objects:
                # Convert SpatialObject to frontend format
                flight_data = {
                    'hex': obj.id.replace('air_', ''),
                    'lat': obj.lat,
                    'lng': obj.lng,
                    'alt': obj.alt * 3.28084,  # Convert km to feet for frontend
                    'dir': obj.heading,
                    'speed': obj.velocity / 0.514444,  # Convert m/s to knots
                    'flight_icao': obj.name,
                }
                
                # Add extra fields if available
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
                
                # Validate before including
                if validate_spatial_object(flight_data):
                    flights.append(flight_data)
            
            return flights
            
        except Exception as e:
            print(f"⚠️ Error getting flights from R-tree: {e}")
            # Fallback to data_store
            try:
                print("⚠️ Attempting fallback to data_store for flights...")
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
            except Exception as fallback_error:
                print(f"⚠️ Fallback also failed: {fallback_error}")
                return []
    
    def _get_satellites_from_rtree(self) -> List[Dict[str, Any]]:
        """
        Get ALL satellites from R-tree spatial index using global bounds
        Altitude passed as separate parameters, NOT in BoundingBox
        """
        try:
            if not spatial_service.spatial_index:
                print("⚠️ Spatial index not available for satellites query")
                return []
            
            # BoundingBox only takes lat/lng, not altitude
            global_bbox = BoundingBox(
                min_lat=-90.0,
                max_lat=90.0,
                min_lng=-180.0,
                max_lng=180.0
            )
            
            # Pass altitude as separate min_alt/max_alt parameters
            sat_objects = spatial_service.query_viewport(
                viewport=global_bbox,
                object_types={'satellite', 'debris'},
                min_alt=150.0,      # Satellite min altitude in km
                max_alt=250000.0,   # Satellite max altitude in km
                limit=20000
            )
            
            if not sat_objects:
                # Try fallback to data_store if R-tree returns empty
                # print("⚠️ R-tree returned no satellites, checking data_store...")
                satellite_objects = data_store.get_by_type('satellite')
                debris_objects = data_store.get_by_type('debris')
                sat_objects = satellite_objects + debris_objects
            
            satellites = []
            for obj in sat_objects:
                # Convert SpatialObject to frontend format
                sat_data = {
                    'norad_id': obj.id.replace('sat_', ''),
                    'name': obj.name,
                    'lat': obj.lat,
                    'lng': obj.lng,
                    'altitude': obj.alt,  # Already in km
                    'velocity': obj.velocity,  # Already in km/s
                    'object_type': obj.object_type,
                    'operator': obj.operator,
                    'visible': True,
                }
                
                # Add extra fields if available
                if obj.extra:
                    sat_data.update({
                        'inclination': obj.extra.get('inclination'),
                        'period_minutes': obj.extra.get('period_minutes'),
                        'visible': obj.extra.get('visible', True),
                        'conjunction_risk': obj.extra.get('conjunction_risk', False),
                        'tle': obj.extra.get('tle'),
                    })
                
                # Validate before including
                if validate_spatial_object(sat_data):
                    satellites.append(sat_data)
            
            return satellites
            
        except Exception as e:
            print(f"⚠️ Error getting satellites from R-tree: {e}")
            # Fallback to data_store
            try:
                print("⚠️ Attempting fallback to data_store for satellites...")
                satellite_objects = data_store.get_by_type('satellite')
                debris_objects = data_store.get_by_type('debris')
                all_objects = satellite_objects + debris_objects
                
                satellites = []
                for obj in all_objects:
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
                    if obj.extra:
                        sat_data.update({
                            'inclination': obj.extra.get('inclination'),
                            'period_minutes': obj.extra.get('period_minutes'),
                            'visible': obj.extra.get('visible', True),
                            'conjunction_risk': obj.extra.get('conjunction_risk', False),
                            'tle': obj.extra.get('tle'),
                        })
                    if validate_spatial_object(sat_data):
                        satellites.append(sat_data)
                return satellites
            except Exception as fallback_error:
                print(f"⚠️ Fallback also failed: {fallback_error}")
                return []
    
    async def broadcast_updates(self):
        """
        Broadcast updates using R-tree spatial index
        Queries with global bounds to get all cached objects
        """
        if not self.active_connections:
            return
        
        try:
            # Check if spatial service is ready
            if not spatial_service.is_ready:
                return
            
            # Check if spatial index exists
            if not spatial_service.spatial_index:
                return
            
            # Get data from R-tree spatial index
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
            
            # Test JSON serialization
            json_str = json.dumps(message)
            
            # Send to all connected clients
            disconnected = []
            for connection in self.active_connections:
                try:
                    await connection.send_text(json_str)
                except:
                    disconnected.append(connection)
            
            # Clean up disconnected clients
            for conn in disconnected:
                self.disconnect(conn)
            
            self.last_broadcast = datetime.utcnow()
            self.broadcast_count += 1
            
            # Log every 30 broadcasts (1 minute at 2s interval)
            if self.broadcast_count % 30 == 0:
                print(f"📡 Broadcast #{self.broadcast_count} from R-tree: {len(flights_data)} flights, {len(satellites_data)} satellites")
            
        except ValueError as e:
            print(f"❌ JSON error in broadcast: {e}")
        except Exception as e:
            print(f"❌ Broadcast error: {e}")
    
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
        """Handle client messages"""
        try:
            data = json.loads(message)
            if data.get('type') == 'pong':
                pass
            elif data.get('type') == 'request_update':
                await self.send_initial_data(websocket)
            elif data.get('type') == 'get_cache_stats':
                stats = {
                    "type": "cache_stats",
                    "data_store": data_store.get_stats(),
                    "spatial_index": spatial_service.get_stats() if spatial_service.is_ready else None
                }
                await websocket.send_json(stats)
            elif data.get('type') == 'get_rtree_stats':
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
        except:
            pass


# Global instance
ws_manager = WebSocketManager()