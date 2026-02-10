"""
R-tree Spatial Index Implementation
High-performance spatial queries for flight/satellite tracking
"""
from typing import List, Dict, Tuple, Optional, Set
from dataclasses import dataclass
import math
from collections import defaultdict


@dataclass
class BoundingBox:
    """Bounding box for spatial queries"""
    min_lat: float
    max_lat: float
    min_lng: float
    max_lng: float
    
    def intersects(self, other: 'BoundingBox') -> bool:
        """Check if this box intersects another"""
        return not (
            self.max_lat < other.min_lat or
            self.min_lat > other.max_lat or
            self.max_lng < other.min_lng or
            self.min_lng > other.max_lng
        )
    
    def contains_point(self, lat: float, lng: float) -> bool:
        """Check if point is inside box"""
        return (
            self.min_lat <= lat <= self.max_lat and
            self.min_lng <= lng <= self.max_lng
        )
    
    def area(self) -> float:
        """Calculate area of bounding box"""
        return (self.max_lat - self.min_lat) * (self.max_lng - self.min_lng)
    
    def expand_to_include(self, lat: float, lng: float) -> None:
        """Expand box to include a point"""
        self.min_lat = min(self.min_lat, lat)
        self.max_lat = max(self.max_lat, lat)
        self.min_lng = min(self.min_lng, lng)
        self.max_lng = max(self.max_lng, lng)
    
    @staticmethod
    def from_point(lat: float, lng: float) -> 'BoundingBox':
        """Create box from single point"""
        return BoundingBox(lat, lat, lng, lng)
    
    @staticmethod
    def union(boxes: List['BoundingBox']) -> 'BoundingBox':
        """Create box that contains all given boxes"""
        if not boxes:
            return BoundingBox(90, -90, 180, -180)
        
        min_lat = min(b.min_lat for b in boxes)
        max_lat = max(b.max_lat for b in boxes)
        min_lng = min(b.min_lng for b in boxes)
        max_lng = max(b.max_lng for b in boxes)
        
        return BoundingBox(min_lat, max_lat, min_lng, max_lng)


@dataclass
class SpatialObject:
    """Unified spatial object (flight or satellite)"""
    id: str
    object_type: str  # 'aircraft', 'satellite', 'debris'
    lat: float
    lng: float
    alt: float
    velocity: float
    heading: float
    name: str
    operator: Optional[str]
    timestamp: int
    source: str  # 'airlabs' or 'celestrak'
    extra: Dict  # Type-specific data


class RTreeNode:
    """Node in R-tree spatial index"""
    
    MAX_ENTRIES = 50
    MIN_ENTRIES = 20
    
    def __init__(self, is_leaf: bool = False):
        self.is_leaf = is_leaf
        self.bounds = BoundingBox(90, -90, 180, -180)
        self.children: List = []  # List[RTreeNode] or List[SpatialObject]
        self.parent: Optional['RTreeNode'] = None
    
    def update_bounds(self) -> None:
        """Recalculate bounds based on children"""
        if not self.children:
            self.bounds = BoundingBox(90, -90, 180, -180)
            return
        
        if self.is_leaf:
            # Children are SpatialObjects
            lats = [obj.lat for obj in self.children]
            lngs = [obj.lng for obj in self.children]
            self.bounds = BoundingBox(
                min(lats), max(lats),
                min(lngs), max(lngs)
            )
        else:
            # Children are RTreeNodes
            self.bounds = BoundingBox.union([child.bounds for child in self.children])


class RTreeIndex:
    """R-tree spatial index for fast viewport queries"""
    
    def __init__(self):
        self.root = RTreeNode(is_leaf=True)
        self.size = 0
        self.depth = 1
    
    def bulk_load(self, objects: List[SpatialObject]) -> None:
        """
        Bulk load objects using Hilbert curve sorting
        Much faster than incremental insertion
        """
        if not objects:
            return
        
        print(f"🔄 Building R-tree from {len(objects)} objects...")
        
        # Sort by Hilbert curve value for spatial locality
        sorted_objects = sorted(objects, key=lambda obj: self._hilbert_value(obj.lat, obj.lng))
        
        # Build tree bottom-up
        self.root = self._build_tree(sorted_objects, 0)
        self.size = len(objects)
        self._calculate_depth()
        
        print(f"  R-tree built: {self.size} objects, depth {self.depth}")
    
    def query_viewport(
        self,
        viewport: BoundingBox,
        object_types: Optional[Set[str]] = None,
        min_alt: Optional[float] = None,
        max_alt: Optional[float] = None,
        limit: int = 2000
    ) -> List[SpatialObject]:
        """
        Query objects within viewport with optional filters
        Target: <100ms response time
        """
        results = []
        self._query_node(self.root, viewport, results, limit, object_types, min_alt, max_alt)
        return results[:limit]
    
    def _query_node(
        self,
        node: RTreeNode,
        viewport: BoundingBox,
        results: List[SpatialObject],
        limit: int,
        object_types: Optional[Set[str]],
        min_alt: Optional[float],
        max_alt: Optional[float]
    ) -> None:
        """Recursive viewport query"""
        # Early exit if limit reached
        if len(results) >= limit:
            return
        
        # Check if node intersects viewport
        if not node.bounds.intersects(viewport):
            return
        
        if node.is_leaf:
            # Check objects in leaf node
            for obj in node.children:
                if len(results) >= limit:
                    break
                
                # Check if object is in viewport
                if not viewport.contains_point(obj.lat, obj.lng):
                    continue
                
                # Apply filters
                if object_types and obj.object_type not in object_types:
                    continue
                
                if min_alt is not None and obj.alt < min_alt:
                    continue
                
                if max_alt is not None and obj.alt > max_alt:
                    continue
                
                results.append(obj)
        else:
            # Sort children by overlap area (optimization)
            children_with_overlap = []
            for child in node.children:
                if child.bounds.intersects(viewport):
                    overlap = self._calculate_overlap(child.bounds, viewport)
                    children_with_overlap.append((child, overlap))
            
            # Query children with most overlap first
            children_with_overlap.sort(key=lambda x: x[1], reverse=True)
            
            for child, _ in children_with_overlap:
                self._query_node(child, viewport, results, limit, object_types, min_alt, max_alt)
    
    def _calculate_overlap(self, box1: BoundingBox, box2: BoundingBox) -> float:
        """Calculate overlap area between two boxes"""
        lat_overlap = max(0, min(box1.max_lat, box2.max_lat) - max(box1.min_lat, box2.min_lat))
        lng_overlap = max(0, min(box1.max_lng, box2.max_lng) - max(box1.min_lng, box2.min_lng))
        return lat_overlap * lng_overlap
    
    def _build_tree(self, objects: List[SpatialObject], depth: int) -> RTreeNode:
        """Recursively build R-tree bottom-up"""
        if len(objects) <= RTreeNode.MAX_ENTRIES:
            # Create leaf node
            node = RTreeNode(is_leaf=True)
            node.children = objects
            node.update_bounds()
            return node
        
        # Create internal node
        node = RTreeNode(is_leaf=False)
        child_nodes = []
        
        # Split into chunks
        chunk_size = RTreeNode.MAX_ENTRIES
        for i in range(0, len(objects), chunk_size):
            chunk = objects[i:i + chunk_size]
            child_node = self._build_tree(chunk, depth + 1)
            child_node.parent = node
            child_nodes.append(child_node)
        
        node.children = child_nodes
        node.update_bounds()
        
        return node
    
    def _hilbert_value(self, lat: float, lng: float) -> int:
        """
        Calculate Hilbert curve value for spatial sorting
        Better spatial locality than simple coordinate sorting
        """
        # Normalize to [0, 1]
        x = (lng + 180) / 360
        y = (lat + 90) / 180
        
        # Convert to integer coordinates
        n = 16  # 16-bit precision
        x_int = int(x * (2**n - 1))
        y_int = int(y * (2**n - 1))
        
        # Calculate Hilbert index (simplified Z-order approximation)
        result = 0
        for i in range(n):
            result |= ((x_int & (1 << i)) << i) | ((y_int & (1 << i)) << (i + 1))
        
        return result
    
    def _calculate_depth(self) -> None:
        """Calculate tree depth"""
        depth = 0
        node = self.root
        
        while not node.is_leaf and node.children:
            node = node.children[0]
            depth += 1
        
        self.depth = depth + 1
    
    def get_stats(self) -> Dict:
        """Get index statistics"""
        return {
            "size": self.size,
            "depth": self.depth,
            "estimated_memory_mb": (self.size * 100) / (1024 * 1024)
        }