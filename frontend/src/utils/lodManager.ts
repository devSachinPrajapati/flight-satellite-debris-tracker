// /**
//  * LOD (Level of Detail) Manager
//  * Determines rendering complexity based on zoom level
//  */

// export const LODLevel = {
//   FAR: 0,      // Zoom 0-3: Minimal dots
//   MEDIUM: 1,   // Zoom 4-6: Small icons
//   NEAR: 2,     // Zoom 7-9: Icons + labels
//   CLOSE: 3     // Zoom 10+: Full details
// } as const;

// export type LODLevel = typeof LODLevel[keyof typeof LODLevel];

// // Helper function to get LOD level name
// const LOD_LEVEL_NAMES: Record<LODLevel, string> = {
//   [LODLevel.FAR]: 'FAR',
//   [LODLevel.MEDIUM]: 'MEDIUM',
//   [LODLevel.NEAR]: 'NEAR',
//   [LODLevel.CLOSE]: 'CLOSE'
// };

// function getLODLevelName(level: LODLevel): string {
//   return LOD_LEVEL_NAMES[level];
// }

// export interface LODConfig {
//   level: LODLevel;
//   markerSize: number;
//   showIcon: boolean;
//   showLabel: boolean;
//   showDetails: boolean;
//   batchSize: number;
//   enableInteraction: boolean;
// }

// export class LODManager {
//   private currentZoom: number = 1.5;
//   private currentLOD: LODLevel = LODLevel.FAR;

//   // LOD transition thresholds
//   private readonly LOD_THRESHOLDS = {
//     [LODLevel.FAR]: { min: 0, max: 3 },
//     [LODLevel.MEDIUM]: { min: 3, max: 6 },
//     [LODLevel.NEAR]: { min: 6, max: 9 },
//     [LODLevel.CLOSE]: { min: 9, max: 20 }
//   };

//   // LOD configurations
//   private readonly LOD_CONFIGS: Record<LODLevel, LODConfig> = {
//     [LODLevel.FAR]: {
//       level: LODLevel.FAR,
//       markerSize: 4,
//       showIcon: false,
//       showLabel: false,
//       showDetails: false,
//       batchSize: 100,  // Larger batches for simple markers
//       enableInteraction: false
//     },
//     [LODLevel.MEDIUM]: {
//       level: LODLevel.MEDIUM,
//       markerSize: 16,
//       showIcon: true,
//       showLabel: false,
//       showDetails: false,
//       batchSize: 50,
//       enableInteraction: false
//     },
//     [LODLevel.NEAR]: {
//       level: LODLevel.NEAR,
//       markerSize: 24,
//       showIcon: true,
//       showLabel: true,
//       showDetails: false,
//       batchSize: 30,
//       enableInteraction: true
//     },
//     [LODLevel.CLOSE]: {
//       level: LODLevel.CLOSE,
//       markerSize: 32,
//       showIcon: true,
//       showLabel: true,
//       showDetails: true,
//       batchSize: 20,
//       enableInteraction: true
//     }
//   };

//   /**
//    * Update zoom level and determine if LOD changed
//    */
//   public updateZoom(zoom: number): { changed: boolean; newLOD: LODLevel } {
//     this.currentZoom = zoom;
//     const newLOD = this.determineLOD(zoom);
//     const changed = newLOD !== this.currentLOD;

//     if (changed) {
//       console.log(`🔄 LOD transition: ${getLODLevelName(this.currentLOD)} → ${getLODLevelName(newLOD)}`);
//       this.currentLOD = newLOD;
//     }

//     return { changed, newLOD };
//   }

//   /**
//    * Determine LOD level from zoom
//    */
//   private determineLOD(zoom: number): LODLevel {
//     if (zoom <= 3) return LODLevel.FAR;
//     if (zoom <= 6) return LODLevel.MEDIUM;
//     if (zoom <= 9) return LODLevel.NEAR;
//     return LODLevel.CLOSE;
//   }

//   /**
//    * Get current LOD configuration
//    */
//   public getCurrentConfig(): LODConfig {
//     return this.LOD_CONFIGS[this.currentLOD];
//   }

//   /**
//    * Get LOD for specific zoom
//    */
//   public getLODForZoom(zoom: number): LODLevel {
//     return this.determineLOD(zoom);
//   }

//   /**
//    * Check if transition should be smooth
//    */
//   public shouldSmoothTransition(fromLOD: LODLevel, toLOD: LODLevel): boolean {
//     // Only smooth transition between adjacent LOD levels
//     return Math.abs(fromLOD - toLOD) === 1;
//   }

//   /**
//    * Get performance metrics for current LOD
//    */
//   public getPerformanceMetrics(): {
//     estimatedNodesPerMarker: number;
//     cpuCost: string;
//     memoryFootprint: string;
//   } {
//     const config = this.getCurrentConfig();

//     const metrics = {
//       [LODLevel.FAR]: {
//         estimatedNodesPerMarker: 1,
//         cpuCost: 'Minimal',
//         memoryFootprint: '~100 bytes'
//       },
//       [LODLevel.MEDIUM]: {
//         estimatedNodesPerMarker: 2,
//         cpuCost: 'Low',
//         memoryFootprint: '~300 bytes'
//       },
//       [LODLevel.NEAR]: {
//         estimatedNodesPerMarker: 4,
//         cpuCost: 'Medium',
//         memoryFootprint: '~600 bytes'
//       },
//       [LODLevel.CLOSE]: {
//         estimatedNodesPerMarker: 6,
//         cpuCost: 'High',
//         memoryFootprint: '~1KB'
//       }
//     };

//     return metrics[config.level];
//   }
// }

// // Singleton instance
// export const lodManager = new LODManager();

// /**
//  * LOD (Level of Detail) Manager
//  * Simplifies marker rendering based on distance/zoom
//  */

// export type LODLevel = 'high' | 'medium' | 'low' | 'minimal';

// export interface LODConfig {
//   high: number;    // Zoom threshold for high detail
//   medium: number;  // Zoom threshold for medium detail
//   low: number;     // Zoom threshold for low detail
// }

// export interface SimplifiedMarker {
//   id: string;
//   lat: number;
//   lng: number;
//   type: 'aircraft' | 'satellite' | 'debris';
//   lodLevel: LODLevel;
//   // High detail fields
//   label?: string;
//   icon?: string;
//   // Medium detail fields
//   color?: string;
//   // Low detail - just a dot
//   isCluster?: boolean;
//   count?: number;
// }

// export class LODManager {
//   private config: LODConfig = {
//     high: 6,      // Zoom >= 6: Full detail (labels, icons, data)
//     medium: 4,    // Zoom 4-6: Medium (icons, colors, no labels)
//     low: 2,       // Zoom 2-4: Low (simple dots with colors)
//     // Zoom < 2: Minimal (tiny dots, clustering)
//   };

//   /**
//    * Determine LOD level for current zoom
//    */
//   getLODLevel(zoom: number): LODLevel {
//     if (zoom >= this.config.high) return 'high';
//     if (zoom >= this.config.medium) return 'medium';
//     if (zoom >= this.config.low) return 'low';
//     return 'minimal';
//   }

//   /**
//    * Simplify aircraft for rendering
//    */
//   simplifyAircraft(
//     aircraft: any,
//     zoom: number,
//     // distanceFromCenter?: number
//   ): SimplifiedMarker {
//     const lodLevel = this.getLODLevel(zoom);
    
//     const base: SimplifiedMarker = {
//       id: `aircraft-${aircraft.hex}`,
//       lat: aircraft.lat,
//       lng: aircraft.lng,
//       type: 'aircraft',
//       lodLevel,
//     };

//     switch (lodLevel) {
//       case 'high':
//         return {
//           ...base,
//           label: aircraft.flight_icao || aircraft.hex,
//           icon: '✈️',
//           color: '#3b82f6',
//         };
      
//       case 'medium':
//         return {
//           ...base,
//           icon: '✈️',
//           color: '#3b82f6',
//         };
      
//       case 'low':
//         return {
//           ...base,
//           color: '#3b82f6',
//         };
      
//       case 'minimal':
//         return base;
//     }
//   }

//   /**
//    * Simplify satellite for rendering
//    */
//   simplifySatellite(
//     satellite: any,
//     zoom: number
//   ): SimplifiedMarker {
//     const lodLevel = this.getLODLevel(zoom);
    
//     const base: SimplifiedMarker = {
//       id: `satellite-${satellite.norad_id}`,
//       lat: satellite.lat,
//       lng: satellite.lng,
//       type: 'satellite',
//       lodLevel,
//     };

//     switch (lodLevel) {
//       case 'high':
//         return {
//           ...base,
//           label: satellite.name,
//           icon: '🛰️',
//           color: '#10b981',
//         };
      
//       case 'medium':
//         return {
//           ...base,
//           icon: '🛰️',
//           color: '#10b981',
//         };
      
//       case 'low':
//       case 'minimal':
//         return {
//           ...base,
//           color: '#10b981',
//         };
//     }
//   }

//   /**
//    * Batch simplify objects
//    */
//   simplifyBatch(
//     objects: any[],
//     type: 'aircraft' | 'satellite' | 'debris',
//     zoom: number
//   ): SimplifiedMarker[] {
//     return objects.map(obj => {
//       if (type === 'aircraft') {
//         return this.simplifyAircraft(obj, zoom);
//       } else {
//         return this.simplifySatellite(obj, zoom);
//       }
//     });
//   }

//   /**
//    * Check if object needs update based on LOD change
//    */
//   needsUpdate(
//     currentZoom: number,
//     previousZoom: number
//   ): boolean {
//     return this.getLODLevel(currentZoom) !== this.getLODLevel(previousZoom);
//   }
// }

// export const lodManager = new LODManager();

/**
 * LOD (Level of Detail) Manager
 * Simplifies marker rendering based on distance/zoom
 */

export type LODLevel = 'high' | 'medium' | 'low' | 'minimal';

export interface LODConfig {
  high: number;    // Zoom threshold for high detail
  medium: number;  // Zoom threshold for medium detail
  low: number;     // Zoom threshold for low detail
}

export interface SimplifiedMarker {
  id: string;
  lat: number;
  lng: number;
  type: 'aircraft' | 'satellite' | 'debris';
  lodLevel: LODLevel;
  // High detail fields
  label?: string;
  icon?: string;
  // Medium detail fields
  color?: string;
  // Low detail - just a dot
  isCluster?: boolean;
  count?: number;
}

export class LODManager {
  private config: LODConfig = {
    high: 6,      // Zoom >= 6: Full detail (labels, icons, data)
    medium: 4,    // Zoom 4-6: Medium (icons, colors, no labels)
    low: 2,       // Zoom 2-4: Low (simple dots with colors)
    // Zoom < 2: Minimal (tiny dots, clustering)
  };

  private lastLODLevel: LODLevel | null = null;
  

  /**
   * Determine LOD level for current zoom
   */
  getLODLevel(zoom: number): LODLevel {
    if (zoom >= this.config.high) return 'high';
    if (zoom >= this.config.medium) return 'medium';
    if (zoom >= this.config.low) return 'low';
    return 'minimal';
  }

  /**
   * Simplify aircraft for rendering
   */
  simplifyAircraft(
    aircraft: any,
    zoom: number,
  ): SimplifiedMarker {
    const lodLevel = this.getLODLevel(zoom);
    
    const base: SimplifiedMarker = {
      id: `aircraft-${aircraft.hex}`,
      lat: aircraft.lat,
      lng: aircraft.lng,
      type: 'aircraft',
      lodLevel,
    };

    switch (lodLevel) {
      case 'high':
        return {
          ...base,
          label: aircraft.flight_icao || aircraft.hex,
          icon: '✈️',
          color: '#3b82f6',
        };
      
      case 'medium':
        return {
          ...base,
          icon: '✈️',
          color: '#3b82f6',
        };
      
      case 'low':
        return {
          ...base,
          color: '#3b82f6',
        };
      
      case 'minimal':
        return {
          ...base,
          color: '#60a5fa',
        };
    }
  }

  /**
   * Simplify satellite for rendering
   */
  simplifySatellite(
    satellite: any,
    zoom: number
  ): SimplifiedMarker {
    const lodLevel = this.getLODLevel(zoom);
    
    const base: SimplifiedMarker = {
      id: `satellite-${satellite.norad_id}`,
      lat: satellite.lat,
      lng: satellite.lng,
      type: 'satellite',
      lodLevel,
    };

    switch (lodLevel) {
      case 'high':
        return {
          ...base,
          label: satellite.name,
          icon: '🛰️',
          color: '#10b981',
        };
      
      case 'medium':
        return {
          ...base,
          icon: '🛰️',
          color: '#10b981',
        };
      
      case 'low':
      case 'minimal':
        return {
          ...base,
          color: '#10b981',
        };
    }
  }

  /**
   * ✅ NEW: Simplify debris for rendering
   */
  simplifyDebris(
    debris: any,
    zoom: number
  ): SimplifiedMarker {
    const lodLevel = this.getLODLevel(zoom);
    
    const base: SimplifiedMarker = {
      id: `debris-${debris.norad_id}`,
      lat: debris.lat,
      lng: debris.lng,
      type: 'debris',
      lodLevel,
    };

    switch (lodLevel) {
      case 'high':
        return {
          ...base,
          label: debris.name || `Debris ${debris.norad_id}`,
          icon: '🗑️',
          color: '#ef4444',
        };
      
      case 'medium':
        return {
          ...base,
          icon: '•',
          color: '#ef4444',
        };
      
      case 'low':
      case 'minimal':
        return {
          ...base,
          color: '#ef4444',
        };
    }
  }

  /**
   * Batch simplify objects
   */
  simplifyBatch(
    objects: any[],
    type: 'aircraft' | 'satellite' | 'debris',
    zoom: number
  ): SimplifiedMarker[] {
    return objects.map(obj => {
      if (type === 'aircraft') {
        return this.simplifyAircraft(obj, zoom);
      } else if (type === 'debris') {
        return this.simplifyDebris(obj, zoom);
      } else {
        return this.simplifySatellite(obj, zoom);
      }
    });
  }

  /**
   * ✅ FIXED: Check if LOD level actually changed (not just zoom value)
   */
  needsUpdate(
    currentZoom: number,
    previousZoom: number
  ): boolean {
    const currentLOD = this.getLODLevel(currentZoom);
    const previousLOD = this.getLODLevel(previousZoom);
    
    const changed = currentLOD !== previousLOD;
    
    if (changed) {
      console.log(`🔄 LOD changed: ${previousLOD} → ${currentLOD}`);
    }
    
    return changed;
  }

  /**
   * Reset tracking
   */
  resetTracking(): void {
    this.lastLODLevel = null;
  }
}

export const lodManager = new LODManager();