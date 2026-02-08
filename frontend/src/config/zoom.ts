/**
 * Centralized Zoom Configuration
 * Single source of truth for all zoom-related logic
 */

export const ZOOM_CONFIG = {
  // Map bounds
  MIN_ZOOM: 1.5,
  MAX_ZOOM: 7.5,
  DEFAULT_ZOOM: 1.5,
  
  // Zoom thresholds
  THRESHOLDS: {
    CLUSTERING_START: 2,      // Start clustering below this
    CLUSTERING_END: 4.5,      // Stop clustering above this
    LOD_HIGH: 6,              // High detail rendering
    LOD_MEDIUM: 4,            // Medium detail
    LOD_LOW: 2,               // Low detail
  },
  
  // Render limits per zoom level
  RENDER_LIMITS: {
    1.5: 120,   // World view
    2.5: 250,   // Continental
    3.5: 400,   // Regional
    4.5: 600,   // Local
    5.5: 800,   // City
    6.5: 1200,  // District
    7.5: 2000,  // Street
  },
  
  // Clustering grid sizes
  CLUSTER_GRID_SIZES: {
    1.5: 35,    // Removed zoom 0 and 1
    2.0: 20,
    3.0: 12,
    4.0: 6,
    5.0: 0,     // No clustering beyond this
  },
} as const;

/**
 * Get render limit for a given zoom level
 */
export function getRenderLimit(zoom: number): number {
  // Clamp zoom to valid range
  const clampedZoom = Math.max(ZOOM_CONFIG.MIN_ZOOM, Math.min(zoom, ZOOM_CONFIG.MAX_ZOOM));
  
  // Find the nearest threshold
  const thresholds = Object.keys(ZOOM_CONFIG.RENDER_LIMITS)
    .map(Number)
    .sort((a, b) => a - b);
  
  for (let i = 0; i < thresholds.length; i++) {
    if (clampedZoom <= thresholds[i]) {
      return ZOOM_CONFIG.RENDER_LIMITS[thresholds[i] as keyof typeof ZOOM_CONFIG.RENDER_LIMITS];
    }
  }
  
  return ZOOM_CONFIG.RENDER_LIMITS[7.5];
}

/**
 * Get cluster grid size for a given zoom level
 */
export function getClusterGridSize(zoom: number): number {
  const clampedZoom = Math.max(ZOOM_CONFIG.MIN_ZOOM, Math.min(zoom, ZOOM_CONFIG.MAX_ZOOM));
  
  const thresholds = Object.keys(ZOOM_CONFIG.CLUSTER_GRID_SIZES)
    .map(Number)
    .sort((a, b) => a - b);
  
  for (let i = 0; i < thresholds.length; i++) {
    if (clampedZoom <= thresholds[i]) {
      return ZOOM_CONFIG.CLUSTER_GRID_SIZES[thresholds[i] as keyof typeof ZOOM_CONFIG.CLUSTER_GRID_SIZES];
    }
  }
  
  return 0; // No clustering at high zoom
}

/**
 * Check if clustering should be active at this zoom
 */
export function shouldCluster(zoom: number): boolean {
  return zoom >= ZOOM_CONFIG.THRESHOLDS.CLUSTERING_START && 
         zoom <= ZOOM_CONFIG.THRESHOLDS.CLUSTERING_END;
}

/**
 * Get LOD level for rendering
 */
export function getLODLevel(zoom: number): 'high' | 'medium' | 'low' | 'minimal' {
  if (zoom >= ZOOM_CONFIG.THRESHOLDS.LOD_HIGH) return 'high';
  if (zoom >= ZOOM_CONFIG.THRESHOLDS.LOD_MEDIUM) return 'medium';
  if (zoom >= ZOOM_CONFIG.THRESHOLDS.LOD_LOW) return 'low';
  return 'minimal';
}

/**
 * Validate zoom value
 */
export function isValidZoom(zoom: number): boolean {
  return zoom >= ZOOM_CONFIG.MIN_ZOOM && zoom <= ZOOM_CONFIG.MAX_ZOOM;
}

/**
 * Clamp zoom to valid range
 */
export function clampZoom(zoom: number): number {
  return Math.max(ZOOM_CONFIG.MIN_ZOOM, Math.min(zoom, ZOOM_CONFIG.MAX_ZOOM));
}