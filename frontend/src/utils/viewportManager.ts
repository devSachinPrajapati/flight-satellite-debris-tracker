// /**
//  * Viewport Manager - FIXED CLUSTERING ISSUE
//  * 
//  * Key fixes:
//  * 1. Validate coordinates before filtering
//  * 2. Detect and prevent clustering at single points
//  * 3. Add spatial distribution checking
//  * 4. Better LOD (Level of Detail) system
//  */
// import type * as maptilersdk from '@maptiler/sdk';
// import type { Aircraft, SatelliteObject } from '../types';

// class ViewportManager {
//   private map: maptilersdk.Map | null = null;
//   private lastBounds: { north: number; south: number; east: number; west: number } | null = null;
//   private lastZoom: number = 1.5;
//   private debugMode: boolean = false; // Set to true to see debug logs

//   /**
//    * Set the map instance
//    */
//   setMap(map: maptilersdk.Map) {
//     this.map = map;
//     this.updateBounds();
//   }

//   /**
//    * Update cached viewport bounds
//    */
//   private updateBounds() {
//     if (!this.map) return;

//     const bounds = this.map.getBounds();
//     this.lastBounds = {
//       north: bounds.getNorth(),
//       south: bounds.getSouth(),
//       east: bounds.getEast(),
//       west: bounds.getWest(),
//     };
//     this.lastZoom = this.map.getZoom();
//   }

//   /**
//    * ✅ CRITICAL: Validate coordinates are real and not default/invalid
//    */
//   private isValidCoordinate(lat: number, lng: number): boolean {
//     // Check for NaN or undefined
//     if (lat === undefined || lng === undefined || 
//         isNaN(lat) || isNaN(lng) || 
//         !isFinite(lat) || !isFinite(lng)) {
//       return false;
//     }

//     // Check for valid ranges
//     if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
//       return false;
//     }

//     // ✅ CRITICAL: Reject default/null island coordinates (0, 0)
//     // This is a common issue where invalid data defaults to (0, 0)
//     if (lat === 0 && lng === 0) {
//       if (this.debugMode) {
//         console.warn('⚠️ Rejected (0, 0) coordinate - likely invalid data');
//       }
//       return false;
//     }

//     // ✅ Reject coordinates that are suspiciously close to 0,0
//     // (within 1 degree, unless explicitly in that region)
//     if (Math.abs(lat) < 0.1 && Math.abs(lng) < 0.1) {
//       if (this.debugMode) {
//         console.warn(`⚠️ Rejected near-zero coordinate: (${lat}, ${lng})`);
//       }
//       return false;
//     }

//     return true;
//   }

//   /**
//    * Check if coordinates are within viewport
//    */
//   private isInViewport(lat: number, lng: number): boolean {
//     if (!this.lastBounds) return true;

//     const { north, south, east, west } = this.lastBounds;

//     // Handle antimeridian crossing
//     const lngInRange = west <= east
//       ? lng >= west && lng <= east
//       : lng >= west || lng <= east;

//     return lat >= south && lat <= north && lngInRange;
//   }

//   /**
//    * Get TOTAL rendering limit based on zoom level
//    */
//   private getTotalRenderLimit(): number {
//     const zoom = this.lastZoom;

//     if (zoom < 1.5) return 50;     // Very global view - minimal
//     if (zoom < 2.5) return 120;    // Global - sparse
//     if (zoom < 3.5) return 250;    // Continental - moderate
//     if (zoom < 4.5) return 400;    // Regional - balanced
//     if (zoom < 5.5) return 600;    // Local - good
//     if (zoom < 6.5) return 800;    // Detailed
//     if (zoom < 7.5) return 1200;   // City
//     return 10000;                   // Street - all
//   }

//   /**
//    * Distribute total limit across object types
//    * Aircraft: 45%, Satellites: 45%, Debris: 10%
//    */
//   private getObjectTypeQuota(type: 'aircraft' | 'satellite' | 'debris'): number {
//     const totalLimit = this.getTotalRenderLimit();
    
//     switch (type) {
//       case 'aircraft':
//         return Math.floor(totalLimit * 0.45);
//       case 'satellite':
//         return Math.floor(totalLimit * 0.45);
//       case 'debris':
//         return Math.floor(totalLimit * 0.10);
//       default:
//         return totalLimit;
//     }
//   }

//   /**
//    * ✅ NEW: Detect if objects are clustered at a single point
//    * Returns true if >80% of objects share the same coordinates
//    */
//   private detectClustering(objects: Array<{ lat: number; lng: number }>): boolean {
//     if (objects.length < 3) return false;

//     // Count unique coordinate pairs
//     const coordMap = new Map<string, number>();
//     objects.forEach(obj => {
//       const key = `${obj.lat.toFixed(4)},${obj.lng.toFixed(4)}`;
//       coordMap.set(key, (coordMap.get(key) || 0) + 1);
//     });

//     // Check if any single coordinate has >80% of objects
//     const maxCount = Math.max(...Array.from(coordMap.values()));
//     const clusterRatio = maxCount / objects.length;

//     if (clusterRatio > 0.8) {
//       const clusteredCoord = Array.from(coordMap.entries())
//         .find(([_, count]) => count === maxCount)?.[0];
//       console.error(`🔴 CLUSTERING DETECTED: ${(clusterRatio * 100).toFixed(0)}% at ${clusteredCoord}`);
//       return true;
//     }

//     return false;
//   }

//   /**
//    * ✅ NEW: Spatial distribution sampling
//    * Ensures objects are spread across the viewport, not clustered
//    */
//   private spatialSample<T extends { lat: number; lng: number }>(
//     objects: T[],
//     limit: number
//   ): T[] {
//     if (objects.length <= limit) return objects;

//     // Create spatial grid (divide viewport into cells)
//     const gridSize = Math.ceil(Math.sqrt(limit));
//     const cellWidth = 360 / gridSize;  // degrees
//     const cellHeight = 180 / gridSize; // degrees

//     // Assign objects to grid cells
//     const grid = new Map<string, T[]>();
//     objects.forEach(obj => {
//       const cellX = Math.floor((obj.lng + 180) / cellWidth);
//       const cellY = Math.floor((obj.lat + 90) / cellHeight);
//       const key = `${cellX},${cellY}`;
      
//       if (!grid.has(key)) {
//         grid.set(key, []);
//       }
//       grid.get(key)!.push(obj);
//     });

//     // Sample evenly from each cell
//     const objectsPerCell = Math.ceil(limit / grid.size);
//     const sampled: T[] = [];

//     grid.forEach(cellObjects => {
//       // Take up to objectsPerCell from this cell
//       sampled.push(...cellObjects.slice(0, objectsPerCell));
//     });

//     return sampled.slice(0, limit);
//   }

//   /**
//    * Filter aircraft by viewport and zoom - WITH VALIDATION
//    */
//   filterAircraft(aircraft: Aircraft[]): Aircraft[] {
//     this.updateBounds();

//     // ✅ STEP 1: Validate coordinates BEFORE filtering
//     const validAircraft = aircraft.filter(ac => {
//       if (!this.isValidCoordinate(ac.lat, ac.lng)) {
//         if (this.debugMode) {
//           console.warn(`⚠️ Invalid aircraft coordinates: ${ac.hex} at (${ac.lat}, ${ac.lng})`);
//         }
//         return false;
//       }
//       return true;
//     });

//     if (this.debugMode && validAircraft.length < aircraft.length) {
//       console.log(`🔍 Filtered out ${aircraft.length - validAircraft.length} aircraft with invalid coords`);
//     }

//     const limit = this.getObjectTypeQuota('aircraft');

//     // ✅ STEP 2: Filter by viewport
//     const inViewport = validAircraft.filter(ac =>
//       this.isInViewport(ac.lat, ac.lng)
//     );

//     // ✅ STEP 3: Check for clustering
//     if (this.detectClustering(inViewport)) {
//       console.error('🔴 Aircraft clustering detected - possible data issue');
//     }

//     // ✅ STEP 4: Apply LOD with spatial sampling
//     if (inViewport.length > limit) {
//       // Use spatial sampling instead of simple sorting
//       const sampled = this.spatialSample(inViewport, limit);
      
//       // Then sort by altitude within the sample
//       return sampled.sort((a, b) => (b.alt || 0) - (a.alt || 0));
//     }

//     return inViewport;
//   }

//   /**
//    * Filter satellites by viewport and zoom - WITH VALIDATION
//    */
//   filterSatellites(satellites: SatelliteObject[]): SatelliteObject[] {
//     this.updateBounds();

//     // ✅ STEP 1: Validate coordinates
//     const validSatellites = satellites.filter(sat => {
//       if (!this.isValidCoordinate(sat.lat, sat.lng)) {
//         if (this.debugMode) {
//           console.warn(`⚠️ Invalid satellite coordinates: ${sat.name} at (${sat.lat}, ${sat.lng})`);
//         }
//         return false;
//       }
//       return true;
//     });

//     if (this.debugMode && validSatellites.length < satellites.length) {
//       console.log(`🔍 Filtered out ${satellites.length - validSatellites.length} satellites with invalid coords`);
//     }

//     const limit = this.getObjectTypeQuota('satellite');

//     // ✅ STEP 2: Filter by viewport
//     const inViewport = validSatellites.filter(sat =>
//       this.isInViewport(sat.lat, sat.lng)
//     );

//     // ✅ STEP 3: Check for clustering
//     if (this.detectClustering(inViewport)) {
//       console.error('🔴 Satellite clustering detected - check backend data');
//       console.error('First few satellites:', inViewport.slice(0, 3).map(s => ({
//         name: s.name,
//         lat: s.lat,
//         lng: s.lng,
//         alt: s.altitude
//       })));
//     }

//     // ✅ STEP 4: Apply LOD with spatial sampling
//     if (inViewport.length > limit) {
//       const sampled = this.spatialSample(inViewport, limit);
//       return sampled.sort((a, b) => (a.altitude || 0) - (b.altitude || 0));
//     }

//     return inViewport;
//   }

//   /**
//    * Filter debris by viewport and zoom - WITH VALIDATION
//    */
//   filterDebris(debris: SatelliteObject[]): SatelliteObject[] {
//     this.updateBounds();

//     // ✅ STEP 1: Validate coordinates
//     const validDebris = debris.filter(deb => {
//       if (!this.isValidCoordinate(deb.lat, deb.lng)) {
//         if (this.debugMode) {
//           console.warn(`⚠️ Invalid debris coordinates: ${deb.name} at (${deb.lat}, ${deb.lng})`);
//         }
//         return false;
//       }
//       return true;
//     });

//     if (this.debugMode && validDebris.length < debris.length) {
//       console.log(`🔍 Filtered out ${debris.length - validDebris.length} debris with invalid coords`);
//     }

//     const limit = this.getObjectTypeQuota('debris');

//     // ✅ STEP 2: Filter by viewport
//     const inViewport = validDebris.filter(deb =>
//       this.isInViewport(deb.lat, deb.lng)
//     );

//     // ✅ STEP 3: Check for clustering
//     if (this.detectClustering(inViewport)) {
//       console.error('🔴 Debris clustering detected - check backend data');
//     }

//     // ✅ STEP 4: Apply LOD with spatial sampling
//     if (inViewport.length > limit) {
//       return this.spatialSample(inViewport, limit);
//     }

//     return inViewport;
//   }

//   /**
//    * Enable/disable debug logging
//    */
//   setDebugMode(enabled: boolean) {
//     this.debugMode = enabled;
//     if (enabled) {
//       console.log('🔍 Viewport debug mode enabled');
//     }
//   }

//   /**
//    * Get performance statistics
//    */
//   getStats(
//     totalAircraft: number,
//     totalSatellites: number,
//     totalDebris: number,
//     renderedAircraft: number,
//     renderedSatellites: number,
//     renderedDebris: number
//   ): string {
//     const total = totalAircraft + totalSatellites + totalDebris;
//     const rendered = renderedAircraft + renderedSatellites + renderedDebris;
//     const optimized = ((total - rendered) / Math.max(1, total)) * 100;

//     return `
// 🎯 Viewport Rendering Stats:
//   Zoom: ${this.lastZoom.toFixed(1)}
//   Total Limit: ${this.getTotalRenderLimit()}
  
//   Aircraft: ${renderedAircraft}/${totalAircraft} (limit: ${this.getObjectTypeQuota('aircraft')})
//   Satellites: ${renderedSatellites}/${totalSatellites} (limit: ${this.getObjectTypeQuota('satellite')})
//   Debris: ${renderedDebris}/${totalDebris} (limit: ${this.getObjectTypeQuota('debris')})
  
//   Total Rendered: ${rendered}/${total}
//   Optimization: ${optimized.toFixed(1)}% culled
//     `.trim();
//   }
// }

// export const viewportManager = new ViewportManager();


/**
 * Viewport Manager - FIXED FOR STABLE ZOOM
 * Objects remain visible when zooming in, new objects are added progressively
 */
import type * as maptilersdk from '@maptiler/sdk';
import type { Aircraft, SatelliteObject } from '../types';

class ViewportManager {
  private map: maptilersdk.Map | null = null;
  private lastBounds: { north: number; south: number; east: number; west: number } | null = null;
  private lastZoom: number = 1.5;
  private debugMode: boolean = false;
  
  // ✅ NEW: Cache of selected objects for stable rendering
  private selectedObjectIds = {
    aircraft: new Set<string>(),
    satellites: new Set<string>(),
    debris: new Set<string>(),
  };

  setMap(map: maptilersdk.Map) {
    this.map = map;
    this.updateBounds();
  }

  private updateBounds() {
    if (!this.map) return;

    const bounds = this.map.getBounds();
    const newZoom = this.map.getZoom();
    
    // ✅ NEW: Clear cache when zooming OUT (fewer objects)
    if (newZoom < this.lastZoom - 0.5) {
      this.selectedObjectIds.aircraft.clear();
      this.selectedObjectIds.satellites.clear();
      this.selectedObjectIds.debris.clear();
    }
    
    this.lastBounds = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    };
    this.lastZoom = newZoom;
  }

  private isValidCoordinate(lat: number, lng: number): boolean {
    if (lat === undefined || lng === undefined || 
        isNaN(lat) || isNaN(lng) || 
        !isFinite(lat) || !isFinite(lng)) {
      return false;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return false;
    }

    if (lat === 0 && lng === 0) {
      return false;
    }

    if (Math.abs(lat) < 0.1 && Math.abs(lng) < 0.1) {
      return false;
    }

    return true;
  }

  private isInViewport(lat: number, lng: number): boolean {
    if (!this.lastBounds) return true;

    const { north, south, east, west } = this.lastBounds;

    const lngInRange = west <= east
      ? lng >= west && lng <= east
      : lng >= west || lng <= east;

    return lat >= south && lat <= north && lngInRange;
  }

  private getTotalRenderLimit(): number {
    const zoom = this.lastZoom;

    if (zoom < 1.5) return 50;
    if (zoom < 2.5) return 120;
    if (zoom < 3.5) return 250;
    if (zoom < 4.5) return 400;
    if (zoom < 5.5) return 600;
    if (zoom < 6.5) return 800;
    if (zoom < 7.5) return 1200;
    return 2000;
  }

  private getObjectTypeQuota(type: 'aircraft' | 'satellite' | 'debris'): number {
    const totalLimit = this.getTotalRenderLimit();
    
    switch (type) {
      case 'aircraft':
        return Math.floor(totalLimit * 0.45);
      case 'satellite':
        return Math.floor(totalLimit * 0.45);
      case 'debris':
        return Math.floor(totalLimit * 0.10);
      default:
        return totalLimit;
    }
  }

  /**
   * ✅ NEW: Stable object selection with priority scoring
   * Previously selected objects get priority, new objects fill remaining slots
   */
  private selectObjectsStable<T extends { lat: number; lng: number }>(
    objects: T[],
    limit: number,
    getId: (obj: T) => string,
    selectedIds: Set<string>
  ): T[] {
    if (objects.length <= limit) return objects;

    // Split into previously selected and new candidates
    const previouslySelected: T[] = [];
    const newCandidates: T[] = [];

    objects.forEach(obj => {
      const id = getId(obj);
      if (selectedIds.has(id)) {
        previouslySelected.push(obj);
      } else {
        newCandidates.push(obj);
      }
    });

    // Calculate how many new objects we can add
    const slotsRemaining = limit - previouslySelected.length;

    if (slotsRemaining <= 0) {
      // We have too many previously selected objects, keep the closest ones
      return this.spatialSample(previouslySelected, limit);
    }

    // Add new objects using spatial sampling to fill remaining slots
    const newObjects = this.spatialSample(newCandidates, slotsRemaining);

    // Update selected IDs
    const result = [...previouslySelected, ...newObjects];
    selectedIds.clear();
    result.forEach(obj => selectedIds.add(getId(obj)));

    return result;
  }

  /**
   * Spatial distribution sampling (unchanged)
   */
  private spatialSample<T extends { lat: number; lng: number }>(
    objects: T[],
    limit: number
  ): T[] {
    if (objects.length <= limit) return objects;

    const gridSize = Math.ceil(Math.sqrt(limit));
    const cellWidth = 360 / gridSize;
    const cellHeight = 180 / gridSize;

    const grid = new Map<string, T[]>();
    objects.forEach(obj => {
      const cellX = Math.floor((obj.lng + 180) / cellWidth);
      const cellY = Math.floor((obj.lat + 90) / cellHeight);
      const key = `${cellX},${cellY}`;
      
      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(obj);
    });

    const objectsPerCell = Math.ceil(limit / grid.size);
    const sampled: T[] = [];

    grid.forEach(cellObjects => {
      sampled.push(...cellObjects.slice(0, objectsPerCell));
    });

    return sampled.slice(0, limit);
  }

  /**
   * ✅ FIXED: Filter aircraft with stable selection
   */
  filterAircraft(aircraft: Aircraft[]): Aircraft[] {
    this.updateBounds();

    const validAircraft = aircraft.filter(ac => {
      if (!this.isValidCoordinate(ac.lat, ac.lng)) {
        return false;
      }
      return true;
    });

    const limit = this.getObjectTypeQuota('aircraft');

    const inViewport = validAircraft.filter(ac =>
      this.isInViewport(ac.lat, ac.lng)
    );

    // ✅ NEW: Use stable selection
    return this.selectObjectsStable(
      inViewport,
      limit,
      (ac) => ac.hex,
      this.selectedObjectIds.aircraft
    );
  }

  /**
   * ✅ FIXED: Filter satellites with stable selection
   */
  filterSatellites(satellites: SatelliteObject[]): SatelliteObject[] {
    this.updateBounds();

    const validSatellites = satellites.filter(sat => {
      if (!this.isValidCoordinate(sat.lat, sat.lng)) {
        return false;
      }
      return true;
    });

    const limit = this.getObjectTypeQuota('satellite');

    const inViewport = validSatellites.filter(sat =>
      this.isInViewport(sat.lat, sat.lng)
    );

    // ✅ NEW: Use stable selection
    return this.selectObjectsStable(
      inViewport,
      limit,
      (sat) => sat.norad_id,
      this.selectedObjectIds.satellites
    );
  }

  /**
   * ✅ FIXED: Filter debris with stable selection
   */
  filterDebris(debris: SatelliteObject[]): SatelliteObject[] {
    this.updateBounds();

    const validDebris = debris.filter(deb => {
      if (!this.isValidCoordinate(deb.lat, deb.lng)) {
        return false;
      }
      return true;
    });

    const limit = this.getObjectTypeQuota('debris');

    const inViewport = validDebris.filter(deb =>
      this.isInViewport(deb.lat, deb.lng)
    );

    // ✅ NEW: Use stable selection
    return this.selectObjectsStable(
      inViewport,
      limit,
      (deb) => deb.norad_id,
      this.selectedObjectIds.debris
    );
  }

  setDebugMode(enabled: boolean) {
    this.debugMode = enabled;
  }

  getStats(
    totalAircraft: number,
    totalSatellites: number,
    totalDebris: number,
    renderedAircraft: number,
    renderedSatellites: number,
    renderedDebris: number
  ): string {
    const total = totalAircraft + totalSatellites + totalDebris;
    const rendered = renderedAircraft + renderedSatellites + renderedDebris;
    const optimized = ((total - rendered) / Math.max(1, total)) * 100;

    return `
🎯 Viewport Rendering Stats:
  Zoom: ${this.lastZoom.toFixed(1)}
  Total Limit: ${this.getTotalRenderLimit()}
  
  Aircraft: ${renderedAircraft}/${totalAircraft} (limit: ${this.getObjectTypeQuota('aircraft')})
  Satellites: ${renderedSatellites}/${totalSatellites} (limit: ${this.getObjectTypeQuota('satellite')})
  Debris: ${renderedDebris}/${totalDebris} (limit: ${this.getObjectTypeQuota('debris')})
  
  Total Rendered: ${rendered}/${total}
  Optimization: ${optimized.toFixed(1)}% culled
    `.trim();
  }
}

export const viewportManager = new ViewportManager();