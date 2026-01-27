"""
Spatial Service Manager - FIXED VERSION
Coordinates data fetching, normalization, and spatial indexing
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
    """Manages spatial indexing and data synchronization"""
    
    def __init__(self):
        self.spatial_index: Optional[RTreeIndex] = None
        self.is_ready = False
        self.rebuild_in_progress = False
    
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
            
            # Fetch from both sources in parallel
            await asyncio.gather(
                self._refresh_airlabs(),
                self._refresh_celestrak()
            )
            
            # Build spatial index
            await self._rebuild_index()
            
            print("✅ Initial spatial data loaded")
        except Exception as e:
            print(f"❌ Initial data load failed: {e}")
    
    async def _refresh_airlabs(self):
        """Fetch and normalize AirLabs data - FIXED"""
        print("📡 Fetching AirLabs data...")
        
        try:
            # FIXED: Access the flights_cache directly since fetch happens in background
            # The flight_service already has background_update_loop that fetches data
            raw_flights = flight_service.flights_cache
            
            if not raw_flights:
                print("⚠️ No flight data available yet")
                return
            
            # Normalize to SpatialObjects
            spatial_objects = []
            for flight_id, flight_data in raw_flights.items():
                try:
                    obj = normalize_airlabs_flight(flight_data)
                    spatial_objects.append(obj)
                except Exception as e:
                    print(f"⚠️ Error normalizing flight {flight_id}: {e}")
            
            # Store in data store
            if spatial_objects:
                data_store.batch_insert(spatial_objects)
                data_store.last_update['airlabs'] = datetime.utcnow()
                print(f"✅ Stored {len(spatial_objects)} aircraft")
        
        except Exception as e:
            print(f"❌ AirLabs refresh failed: {e}")
    
    async def _refresh_celestrak(self):
        """Fetch and normalize Celestrak data"""
        print("📡 Fetching Celestrak data...")
        
        try:
            # Use the cached TLE data from satellite_service
            tle_cache = satellite_service.tle_cache
            
            if not tle_cache:
                print("⚠️ No TLE data available yet")
                return
            
            # Parse and normalize all TLE data
            spatial_objects = []
            for norad_id, tle_obj in tle_cache.items():
                try:
                    obj = normalize_celestrak_object(tle_obj)
                    if obj:
                        spatial_objects.append(obj)
                except Exception as e:
                    print(f"⚠️ Error normalizing satellite {norad_id}: {e}")
            
            # Store in data store
            if spatial_objects:
                data_store.batch_insert(spatial_objects)
                data_store.last_update['celestrak'] = datetime.utcnow()
                
                satellite_count = sum(1 for obj in spatial_objects if obj.object_type == 'satellite')
                debris_count = sum(1 for obj in spatial_objects if obj.object_type == 'debris')
                print(f"✅ Stored {satellite_count} satellites, {debris_count} debris")
        
        except Exception as e:
            print(f"❌ Celestrak refresh failed: {e}")
    
    async def _rebuild_index(self):
        """Rebuild spatial index from data store"""
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
            
            # Build new index
            new_index = RTreeIndex()
            new_index.bulk_load(all_objects)
            
            # Atomically swap indices
            self.spatial_index = new_index
            
            stats = new_index.get_stats()
            print(f"✅ Spatial index rebuilt: {stats['size']} objects, depth {stats['depth']}")
        
        except Exception as e:
            print(f"❌ Index rebuild failed: {e}")
        finally:
            self.rebuild_in_progress = False
    
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
        
        return self.spatial_index.query_viewport(
            viewport=viewport,
            object_types=object_types,
            min_alt=min_alt,
            max_alt=max_alt,
            limit=limit
        )
    
    def get_stats(self) -> dict:
        """Get spatial service statistics"""
        if not self.spatial_index:
            return {"error": "Index not initialized"}
        
        return self.spatial_index.get_stats()
    
    async def background_refresh_loop(self):
        """Background task to refresh data periodically"""
        print("🚀 Spatial refresh loop started")
        
        # Wait for initialization
        while not self.is_ready:
            await asyncio.sleep(1)
        
        # Wait for initial data to load
        await asyncio.sleep(10)
        
        while True:
            try:
                # AirLabs refresh (every 60 seconds)
                await self._refresh_airlabs()
                await self._rebuild_index()
                
                # Wait before next refresh
                await asyncio.sleep(settings.AIRLABS_FETCH_INTERVAL)
            
            except Exception as e:
                print(f"❌ Background refresh error: {e}")
                await asyncio.sleep(60)
    
    async def background_celestrak_loop(self):
        """Background task to refresh Celestrak (every 6 hours)"""
        print("🚀 Celestrak refresh loop started")
        
        while not self.is_ready:
            await asyncio.sleep(1)
        
        # Wait for initial data to load
        await asyncio.sleep(10)
        
        while True:
            try:
                await self._refresh_celestrak()
                await self._rebuild_index()
                
                # Wait 6 hours
                await asyncio.sleep(settings.CELESTRAK_FETCH_INTERVAL)
            
            except Exception as e:
                print(f"❌ Celestrak refresh error: {e}")
                await asyncio.sleep(3600)


# Global singleton
spatial_service = SpatialService()