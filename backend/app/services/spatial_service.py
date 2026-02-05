"""
Spatial Service Manager - FOR 23K+ OBJECTS
Ensures R-tree index is properly used by WebSocket
"""
import asyncio
from typing import List, Optional, Set
from datetime import datetime

from app.spatial.data_store import data_store
from app.spatial.rtree import RTreeIndex, SpatialObject, BoundingBox
from app.spatial.normalizer import normalize_airlabs_flight, normalize_celestrak_object
from app.services.flight_service import flight_service
from app.services.satellite_service import satellite_service
from app.config import settings


class SpatialService:
    """
    Manages spatial indexing and data synchronization
    OPTIMIZED Handles 23K+ objects efficiently
    """
    
    def __init__(self):
        self.spatial_index: Optional[RTreeIndex] = None
        self.is_ready = False
        self.rebuild_in_progress = False
        self.last_rebuild_time: Optional[datetime] = None
        self.stats = {
            'total_processed': 0,
            'total_rejected': 0,
            'rejection_reasons': {},
            'last_flights_count': 0,
            'last_satellites_count': 0,
        }
    
    async def initialize(self):
        """Initialize spatial index with initial data"""
        print("⚡ Initializing spatial service...")
        
        # Create empty index
        self.spatial_index = RTreeIndex()
        self.is_ready = True
        
        # Trigger background data load
        asyncio.create_task(self._initial_data_load())
        
        print("✅ Spatial service ready (loading data in background)")
    
    async def _initial_data_load(self):
        """Load initial data from both sources"""
        try:
            print("🔄 Loading initial spatial data...")
            
            # Wait for services to be ready
            max_wait = 30  # 30 seconds max wait
            wait_time = 0
            while (not flight_service.is_ready or not satellite_service.is_ready) and wait_time < max_wait:
                await asyncio.sleep(1)
                wait_time += 1
                if wait_time % 5 == 0:
                    print(f"⏳ Waiting for services... ({wait_time}s)")
            
            if wait_time >= max_wait:
                print("⚠️ Services not ready after 30s, proceeding anyway")
            
            # Fetch from both sources in parallel
            await asyncio.gather(
                self._refresh_airlabs(),
                self._refresh_celestrak()
            )
            
            # Build spatial index
            await self._rebuild_index()
            
            print("✅ Initial spatial data loaded")
            print(f"📊 Stats: {self.stats['total_processed']} accepted, {self.stats['total_rejected']} rejected")
        except Exception as e:
            print(f"❌ Initial data load failed: {e}")
    
    async def _refresh_airlabs(self):
        """
        Fetch and normalize AirLabs data from flight_service cache
        No direct API calls - uses service's cached data
        """
        print("📡 Fetching AirLabs data from flight_service cache...")
        
        try:
            # Get data from flight_service's cache (not API)
            raw_flights = flight_service.flights_cache
            
            if not raw_flights:
                print("⚠️ No flight data in cache yet")
                return
            
            # Normalize to SpatialObjects with validation
            spatial_objects = []
            rejected = 0
            
            for flight_id, flight_data in raw_flights.items():
                try:
                    self.stats['total_processed'] += 1
                    obj = normalize_airlabs_flight(flight_data)
                    
                    if obj is None:
                        rejected += 1
                        self.stats['total_rejected'] += 1
                        reason = 'invalid_aircraft_coordinates'
                        self.stats['rejection_reasons'][reason] = self.stats['rejection_reasons'].get(reason, 0) + 1
                        continue
                    
                    spatial_objects.append(obj)
                except Exception as e:
                    rejected += 1
                    self.stats['total_rejected'] += 1
                    if rejected <= 3:
                        print(f"⚠️ Error normalizing flight {flight_id}: {e}")
            
            # Store in data store (only valid objects)
            if spatial_objects:
                data_store.batch_insert(spatial_objects)
                data_store.last_update['airlabs'] = datetime.utcnow()
                self.stats['last_flights_count'] = len(spatial_objects)
                print(f"✅ Cached {len(spatial_objects)} aircraft in data_store ({rejected} rejected)")
            else:
                print(f"⚠️ No valid aircraft data (all {rejected} rejected)")
        
        except Exception as e:
            print(f"❌ AirLabs refresh failed: {e}")
    
    async def _refresh_celestrak(self):
        """
        Fetch and normalize Celestrak data from satellite_service cache
        No direct API calls - uses service's cached data
        """
        print("📡 Fetching Celestrak data from satellite_service cache...")
        
        try:
            # Use position_cache instead of tle_cache for propagated positions
            position_cache = satellite_service.position_cache
            
            if not position_cache:
                print("⚠️ No satellite position data in cache yet")
                return
            
            # Parse and normalize all cached positions
            spatial_objects = []
            rejected = 0
            rejection_details = {
                'invalid_coordinates': 0,
                'invalid_altitude': 0,
                'invalid_velocity': 0
            }
            
            for norad_id, sat_data in position_cache.items():
                try:
                    self.stats['total_processed'] += 1
                    
                    # Convert position_cache format to normalizer input format
                    # The position_cache already has propagated coordinates
                    tle_data = {
                        'norad_id': norad_id,
                        'name': sat_data.get('name', 'Unknown'),
                        'tle1': sat_data.get('tle', {}).get('line1', ''),
                        'tle2': sat_data.get('tle', {}).get('line2', ''),
                        'object_type': sat_data.get('object_type', 'satellite'),
                        # Use pre-propagated position from cache
                        'lat': sat_data.get('lat'),
                        'lng': sat_data.get('lng'),
                        'altitude': sat_data.get('altitude'),
                        'velocity': sat_data.get('velocity'),
                        'inclination': sat_data.get('inclination'),
                        'period_minutes': sat_data.get('period_minutes'),
                        'operator': sat_data.get('operator'),
                        'visible': sat_data.get('visible', True),
                        'conjunction_risk': sat_data.get('conjunction_risk', False),
                    }
                    
                    obj = normalize_celestrak_object(tle_data)
                    
                    if obj is None:
                        rejected += 1
                        self.stats['total_rejected'] += 1
                        reason = 'invalid_coordinates'
                        rejection_details[reason] += 1
                        self.stats['rejection_reasons'][reason] = self.stats['rejection_reasons'].get(reason, 0) + 1
                        continue
                    
                    spatial_objects.append(obj)
                except Exception as e:
                    rejected += 1
                    self.stats['total_rejected'] += 1
                    if rejected <= 3:
                        print(f"⚠️ Error normalizing satellite {norad_id}: {e}")
            
            # Store in data store (only valid objects)
            if spatial_objects:
                data_store.batch_insert(spatial_objects)
                data_store.last_update['celestrak'] = datetime.utcnow()
                
                satellite_count = sum(1 for obj in spatial_objects if obj.object_type == 'satellite')
                debris_count = sum(1 for obj in spatial_objects if obj.object_type == 'debris')
                self.stats['last_satellites_count'] = len(spatial_objects)
                
                print(f"✅ Cached {satellite_count} satellites, {debris_count} debris in data_store ({rejected} rejected)")
                
                if rejected > 0:
                    print(f"📊 Rejection breakdown: {rejection_details}")
            else:
                print(f"⚠️ No valid satellite data (all {rejected} rejected)")
        
        except Exception as e:
            print(f"❌ Celestrak refresh failed: {e}")
    
    async def _rebuild_index(self):
        """
        OPTIMIZED Rebuild spatial index from data store
        Handles 23K+ objects efficiently
        """
        if self.rebuild_in_progress:
            print("⏭️ Index rebuild already in progress")
            return
        
        self.rebuild_in_progress = True
        
        try:
            print("🔄 Rebuilding spatial index...")
            
            # Get all objects from store
            all_objects = data_store.get_all()
            
            if not all_objects:
                print("⚠️ No objects to index")
                self.rebuild_in_progress = False
                return
            
            # Filter out invalid objects before indexing
            valid_objects = [
                obj for obj in all_objects
                if self._is_valid_spatial_object(obj)
            ]
            
            if len(valid_objects) < len(all_objects):
                print(f"⚠️ Filtered out {len(all_objects) - len(valid_objects)} invalid objects before indexing")
            
            # OPTIMIZED: Bulk load for 23K+ objects (O(n log n) complexity)
            new_index = RTreeIndex()
            new_index.bulk_load(valid_objects)
            
            # Atomically swap indices
            self.spatial_index = new_index
            self.last_rebuild_time = datetime.utcnow()
            
            stats = new_index.get_stats()
            print(f"✅ Spatial index rebuilt: {stats['size']} objects, depth {stats['depth']}")
            print(f"📊 Memory estimate: {stats['estimated_memory_mb']:.2f} MB")
        
        except Exception as e:
            print(f"❌ Index rebuild failed: {e}")
        finally:
            self.rebuild_in_progress = False
    
    def _is_valid_spatial_object(self, obj: SpatialObject) -> bool:
        """
        Validate spatial object has valid coordinates
        """
        import math
        
        # Check for NaN or Inf
        if math.isnan(obj.lat) or math.isinf(obj.lat):
            return False
        if math.isnan(obj.lng) or math.isinf(obj.lng):
            return False
        if math.isnan(obj.alt) or math.isinf(obj.alt):
            return False
        
        # Check lat/lng ranges
        if obj.lat < -90 or obj.lat > 90:
            return False
        if obj.lng < -180 or obj.lng > 180:
            return False
        
        # Different altitude ranges for different object types
        if obj.object_type == 'aircraft':
            # Aircraft: -500m to 20km
            if obj.alt < -0.5 or obj.alt > 20:
                return False
        else:  # satellite or debris
            # Satellites: 150km to 250,000km
            if obj.alt < 150 or obj.alt > 250000:
                return False
        
        return True
    
    def query_viewport(
        self,
        viewport: BoundingBox,
        object_types: Optional[Set[str]] = None,
        min_alt: Optional[float] = None,
        max_alt: Optional[float] = None,
        limit: int = 2000
    ) -> List[SpatialObject]:
        """Query objects in viewport using spatial index"""
        if not self.spatial_index:
            return []
        
        results = self.spatial_index.query_viewport(
            viewport=viewport,
            object_types=object_types,
            min_alt=min_alt,
            max_alt=max_alt,
            limit=limit
        )
        
        # Final validation
        valid_results = [obj for obj in results if self._is_valid_spatial_object(obj)]
        
        if len(valid_results) < len(results):
            print(f"⚠️ Filtered {len(results) - len(valid_results)} invalid objects from query results")
        
        return valid_results
    
    def get_stats(self) -> dict:
        """Get spatial service statistics"""
        if not self.spatial_index:
            return {"error": "Index not initialized"}
        
        index_stats = self.spatial_index.get_stats()
        
        return {
            **index_stats,
            'processing': {
                'total_processed': self.stats['total_processed'],
                'total_rejected': self.stats['total_rejected'],
                'rejection_rate': f"{(self.stats['total_rejected'] / max(1, self.stats['total_processed'])) * 100:.2f}%",
                'rejection_reasons': self.stats['rejection_reasons'],
                'last_flights_count': self.stats['last_flights_count'],
                'last_satellites_count': self.stats['last_satellites_count'],
            },
            'last_rebuild': self.last_rebuild_time.isoformat() if self.last_rebuild_time else None,
        }
    
    async def background_refresh_loop(self):
        """
        Background task to refresh data periodically
        Uses flight_service and satellite_service caches
        """
        print("🚀 Spatial refresh loop started")
        
        while not self.is_ready:
            await asyncio.sleep(1)
        
        await asyncio.sleep(10)
        
        while True:
            try:
                # Refresh from service caches (not APIs)
                await self._refresh_airlabs()
                await self._rebuild_index()
                await asyncio.sleep(settings.AIRLABS_FETCH_INTERVAL)
            except Exception as e:
                print(f"❌ Background refresh error: {e}")
                await asyncio.sleep(60)
    
    async def background_celestrak_loop(self):
        """
        Background task to refresh Celestrak
        Uses satellite_service cache
        """
        print("🚀 Celestrak refresh loop started")
        
        while not self.is_ready:
            await asyncio.sleep(1)
        
        await asyncio.sleep(10)
        
        while True:
            try:
                # ✅ Refresh from service cache (not API)
                await self._refresh_celestrak()
                await self._rebuild_index()
                await asyncio.sleep(120)  # Every 2 minutes (satellite positions update)
            except Exception as e:
                print(f"❌ Celestrak refresh error: {e}")
                await asyncio.sleep(60)


# Global singleton
spatial_service = SpatialService()