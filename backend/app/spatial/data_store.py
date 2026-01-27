"""
In-Memory Data Store
Manages normalized objects from AirLabs and Celestrak
"""
from typing import Dict, List, Set, Optional
from datetime import datetime
from collections import defaultdict
from .rtree import SpatialObject


class InMemoryStore:
    """Primary in-memory storage for all tracked objects"""
    
    def __init__(self):
        self.objects: Dict[str, SpatialObject] = {}
        self.by_type: Dict[str, Set[str]] = defaultdict(set)
        self.last_update: Dict[str, datetime] = {
            'celestrak': datetime.min,
            'airlabs': datetime.min
        }
        self.estimated_memory_mb = 0
    
    def batch_insert(self, objects: List[SpatialObject]) -> None:
        """Atomic batch insert"""
        for obj in objects:
            self.objects[obj.id] = obj
            self.by_type[obj.object_type].add(obj.id)
        
        self._update_memory_estimate()
        print(f"📦 Stored {len(objects)} objects (Total: {len(self.objects)})")
    
    def get_all(self) -> List[SpatialObject]:
        """Get all objects for spatial indexing"""
        return list(self.objects.values())
    
    def get_by_type(self, object_type: str) -> List[SpatialObject]:
        """Get all objects of specific type"""
        ids = self.by_type.get(object_type, set())
        return [self.objects[oid] for oid in ids if oid in self.objects]
    
    def get_by_id(self, object_id: str) -> Optional[SpatialObject]:
        """Get single object by ID"""
        return self.objects.get(object_id)
    
    def clear(self) -> None:
        """Clear all data"""
        self.objects.clear()
        self.by_type.clear()
    
    def _update_memory_estimate(self) -> None:
        """Estimate memory usage"""
        # Rough estimate: 1KB per object average
        self.estimated_memory_mb = (len(self.objects) * 1024) / (1024 * 1024)
    
    def get_stats(self) -> Dict:
        """Get storage statistics"""
        return {
            "total": len(self.objects),
            "aircraft": len(self.by_type.get('aircraft', set())),
            "satellites": len(self.by_type.get('satellite', set())),
            "debris": len(self.by_type.get('debris', set())),
            "memory_mb": round(self.estimated_memory_mb, 2),
            "last_update": {
                source: timestamp.isoformat()
                for source, timestamp in self.last_update.items()
            }
        }


# Global singleton
data_store = InMemoryStore()