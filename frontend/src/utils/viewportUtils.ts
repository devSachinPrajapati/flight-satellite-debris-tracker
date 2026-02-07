/**
 * Viewport Utilities - Efficient Bounds Checking
 * ✅ Prevents rendering markers outside visible area
 */

export interface ViewportBounds {
  north: number;  // Max latitude
  south: number;  // Min latitude
  east: number;   // Max longitude
  west: number;   // Min longitude
}

/**
 * Get current viewport bounds from MapTiler map
 */
export const getViewportBounds = (map: any): ViewportBounds | null => {
  if (!map) return null;

  try {
    const bounds = map.getBounds();
    
    return {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    };
  } catch (error) {
    console.error('Error getting viewport bounds:', error);
    return null;
  }
};

/**
 * Check if a coordinate is within viewport bounds
 * ✅ CRITICAL OPTIMIZATION: Prevents rendering off-screen markers
 */
export const isInViewport = (
  lat: number,
  lng: number,
  bounds: ViewportBounds
): boolean => {
  // Handle date line crossing (e.g., Pacific Ocean view)
  const inLatitude = lat >= bounds.south && lat <= bounds.north;
  
  let inLongitude: boolean;
  if (bounds.west > bounds.east) {
    // Date line crossing case
    inLongitude = lng >= bounds.west || lng <= bounds.east;
  } else {
    // Normal case
    inLongitude = lng >= bounds.west && lng <= bounds.east;
  }
  
  return inLatitude && inLongitude;
};

/**
 * ✅ OPTIMIZED: Add buffer zone around viewport for smooth panning
 * Markers just outside viewport are pre-rendered for smoother experience
 * 
 * @param bounds Current viewport bounds
 * @param bufferPercent Buffer zone as percentage of viewport size (default: 20%)
 */
export const expandBounds = (
  bounds: ViewportBounds,
  bufferPercent: number = 20
): ViewportBounds => {
  const latDelta = bounds.north - bounds.south;
  const lngDelta = bounds.east - bounds.west;
  
  const latBuffer = (latDelta * bufferPercent) / 100;
  const lngBuffer = (lngDelta * bufferPercent) / 100;
  
  return {
    north: Math.min(90, bounds.north + latBuffer),
    south: Math.max(-90, bounds.south - latBuffer),
    east: bounds.east + lngBuffer,
    west: bounds.west - lngBuffer,
  };
};

/**
 * Filter objects to only those in viewport
 * ✅ CRITICAL OPTIMIZATION: Reduces marker count by 60-90% typically
 */
export const filterByViewport = <T extends { lat: number; lng: number }>(
  objects: T[],
  bounds: ViewportBounds,
  useBuffer: boolean = true
): T[] => {
  const effectiveBounds = useBuffer ? expandBounds(bounds, 20) : bounds;
  
  return objects.filter(obj => 
    isInViewport(obj.lat, obj.lng, effectiveBounds)
  );
};

/**
 * Calculate approximate viewport area in square kilometers
 * Useful for dynamic marker density calculations
 */
export const getViewportArea = (bounds: ViewportBounds): number => {
  const R = 6371; // Earth radius in km
  
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  const latHeight = R * toRad(bounds.north - bounds.south);
  const avgLat = (bounds.north + bounds.south) / 2;
  const lngWidth = R * Math.cos(toRad(avgLat)) * toRad(bounds.east - bounds.west);
  
  return Math.abs(latHeight * lngWidth);
};

/**
 * ✅ SMART CULLING: Prioritize markers by distance from viewport center
 * Useful when marker count exceeds limit - keep closest ones
 */
export const prioritizeByProximity = <T extends { lat: number; lng: number }>(
  objects: T[],
  bounds: ViewportBounds,
  limit: number
): T[] => {
  const centerLat = (bounds.north + bounds.south) / 2;
  const centerLng = (bounds.east + bounds.west) / 2;
  
  // Calculate distance from center for each object
  const withDistance = objects.map(obj => ({
    obj,
    distance: Math.sqrt(
      Math.pow(obj.lat - centerLat, 2) + 
      Math.pow(obj.lng - centerLng, 2)
    ),
  }));
  
  // Sort by distance and take closest ones
  withDistance.sort((a, b) => a.distance - b.distance);
  
  return withDistance.slice(0, limit).map(item => item.obj);
};

/**
 * Debug helper: Log viewport statistics
 */
export const logViewportStats = (
  bounds: ViewportBounds,
  totalObjects: number,
  visibleObjects: number
): void => {
  const area = getViewportArea(bounds);
  const density = visibleObjects / area;
  
  console.log(`📍 Viewport Stats:
    Area: ${area.toFixed(0)} km²
    Total Objects: ${totalObjects}
    Visible: ${visibleObjects} (${((visibleObjects / totalObjects) * 100).toFixed(1)}%)
    Density: ${density.toFixed(3)} objects/km²
    Bounds: N${bounds.north.toFixed(2)} S${bounds.south.toFixed(2)} E${bounds.east.toFixed(2)} W${bounds.west.toFixed(2)}
  `);
};