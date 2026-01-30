// /**
//  * High-Performance Marker Object Pool
//  * Reuses marker instances to minimize GC pressure
//  */

// import type { Aircraft, SatelliteObject } from '../types';
// import { LODLevel } from './lodManager';

// export interface PooledMarker {
//   id: string;
//   element: HTMLElement;
//   lodLevel: LODLevel;
//   inUse: boolean;
//   lastUpdate: number;
//   objectType: 'aircraft' | 'satellite' | 'debris';
//   data?: Aircraft | SatelliteObject;
// }

// export class MarkerPool {
//   // Separate pools for each LOD level
//   private pools: Map<LODLevel, PooledMarker[]> = new Map([
//     [LODLevel.FAR, []],
//     [LODLevel.MEDIUM, []],
//     [LODLevel.NEAR, []],
//     [LODLevel.CLOSE, []]
//   ]);

//   // Active markers (in viewport)
//   private activeMarkers: Map<string, PooledMarker> = new Map();

//   // Pool configuration
//   private readonly POOL_CONFIG = {
//     [LODLevel.FAR]: { initial: 500, max: 2000 },
//     [LODLevel.MEDIUM]: { initial: 300, max: 1000 },
//     [LODLevel.NEAR]: { initial: 200, max: 500 },
//     [LODLevel.CLOSE]: { initial: 100, max: 300 }
//   };

//   // Statistics
//   private stats = {
//     totalCreated: 0,
//     totalReused: 0,
//     totalReleased: 0,
//     cacheHitRate: 0
//   };

//   constructor() {
//     this.initializePools();
//   }

//   /**
//    * Pre-allocate marker pools
//    */
//   private initializePools(): void {
//     Object.entries(this.POOL_CONFIG).forEach(([level, config]) => {
//       const lodLevel = parseInt(level) as LODLevel;
//       const pool = this.pools.get(lodLevel)!;
      
//       for (let i = 0; i < config.initial; i++) {
//         pool.push(this.createMarker(lodLevel));
//       }
//     });

//     console.log('✅ Marker pools initialized:', {
//       FAR: this.pools.get(LODLevel.FAR)!.length,
//       MEDIUM: this.pools.get(LODLevel.MEDIUM)!.length,
//       NEAR: this.pools.get(LODLevel.NEAR)!.length,
//       CLOSE: this.pools.get(LODLevel.CLOSE)!.length
//     });
//   }

//   /**
//    * Create a new marker element for specific LOD
//    */
//   private createMarker(lodLevel: LODLevel): PooledMarker {
//     const element = document.createElement('div');
//     element.className = `marker lod-${lodLevel}`;
//     element.style.position = 'absolute';
//     element.style.pointerEvents = 'none'; // Will enable for interactive LODs
    
//     this.stats.totalCreated++;

//     return {
//       id: '',
//       element,
//       lodLevel,
//       inUse: false,
//       lastUpdate: 0,
//       objectType: 'aircraft'
//     };
//   }

//   /**
//    * Acquire marker from pool
//    */
//   public acquire(
//     id: string,
//     lodLevel: LODLevel,
//     objectType: 'aircraft' | 'satellite' | 'debris',
//     data: Aircraft | SatelliteObject
//   ): PooledMarker {
//     const pool = this.pools.get(lodLevel)!;
    
//     // Try to find available marker in pool
//     let marker = pool.find(m => !m.inUse);
    
//     if (marker) {
//       // Reuse existing marker
//       this.stats.totalReused++;
//     } else {
//       // Create new marker if pool exhausted
//       const config = this.POOL_CONFIG[lodLevel];
//       if (pool.length < config.max) {
//         marker = this.createMarker(lodLevel);
//         pool.push(marker);
//       } else {
//         // Pool exhausted - log warning
//         console.warn(`⚠️ Pool exhausted for LOD ${lodLevel}`);
//         marker = this.createMarker(lodLevel);
//       }
//     }

//     // Configure marker
//     marker.id = id;
//     marker.inUse = true;
//     marker.lastUpdate = Date.now();
//     marker.objectType = objectType;
//     marker.data = data;

//     // Store in active markers
//     this.activeMarkers.set(id, marker);

//     // Update cache hit rate
//     this.updateCacheHitRate();

//     return marker;
//   }

//   /**
//    * Release marker back to pool
//    */
//   public release(id: string): void {
//     const marker = this.activeMarkers.get(id);
//     if (!marker) return;

//     // Remove from DOM if attached
//     if (marker.element.parentNode) {
//       marker.element.parentNode.removeChild(marker.element);
//     }

//     // Reset marker state
//     marker.inUse = false;
//     marker.id = '';
//     marker.data = undefined;
//     marker.element.innerHTML = ''; // Clear content
//     marker.element.style.display = 'none';
//     marker.element.style.pointerEvents = 'none';

//     // Remove from active
//     this.activeMarkers.delete(id);
    
//     this.stats.totalReleased++;
//   }

//   /**
//    * Batch release multiple markers
//    */
//   public batchRelease(ids: string[]): void {
//     ids.forEach(id => this.release(id));
//   }

//   /**
//    * Get active marker by ID
//    */
//   public get(id: string): PooledMarker | undefined {
//     return this.activeMarkers.get(id);
//   }

//   /**
//    * Check if marker is active
//    */
//   public isActive(id: string): boolean {
//     return this.activeMarkers.has(id);
//   }

//   /**
//    * Clear all active markers (viewport change)
//    */
//   public clearAll(): void {
//     const ids = Array.from(this.activeMarkers.keys());
//     this.batchRelease(ids);
//   }

//   /**
//    * Migrate marker to different LOD level
//    */
//   public migrateLOD(id: string, newLOD: LODLevel): PooledMarker | null {
//     const oldMarker = this.activeMarkers.get(id);
//     if (!oldMarker || !oldMarker.data) return null;

//     // Release old marker
//     this.release(id);

//     // Acquire new marker at different LOD
//     return this.acquire(id, newLOD, oldMarker.objectType, oldMarker.data);
//   }

//   /**
//    * Batch migrate markers to new LOD
//    */
//   public batchMigrateLOD(ids: string[], newLOD: LODLevel): PooledMarker[] {
//     return ids.map(id => this.migrateLOD(id, newLOD)).filter(Boolean) as PooledMarker[];
//   }

//   /**
//    * Update cache hit rate
//    */
//   private updateCacheHitRate(): void {
//     const total = this.stats.totalReused + this.stats.totalCreated;
//     this.stats.cacheHitRate = total > 0 ? (this.stats.totalReused / total) * 100 : 0;
//   }

//   /**
//    * Get pool statistics
//    */
//   public getStats(): {
//     poolSizes: Record<LODLevel, number>;
//     activeMarkers: number;
//     totalCreated: number;
//     totalReused: number;
//     cacheHitRate: number;
//     memoryEstimateMB: number;
//   } {
//     const poolSizes = {
//       [LODLevel.FAR]: this.pools.get(LODLevel.FAR)!.length,
//       [LODLevel.MEDIUM]: this.pools.get(LODLevel.MEDIUM)!.length,
//       [LODLevel.NEAR]: this.pools.get(LODLevel.NEAR)!.length,
//       [LODLevel.CLOSE]: this.pools.get(LODLevel.CLOSE)!.length
//     };

//     // Estimate memory (rough calculation)
//     const memoryEstimateMB = (
//       (poolSizes[LODLevel.FAR] * 100 +
//        poolSizes[LODLevel.MEDIUM] * 300 +
//        poolSizes[LODLevel.NEAR] * 600 +
//        poolSizes[LODLevel.CLOSE] * 1024) / (1024 * 1024)
//     );

//     return {
//       poolSizes,
//       activeMarkers: this.activeMarkers.size,
//       totalCreated: this.stats.totalCreated,
//       totalReused: this.stats.totalReused,
//       cacheHitRate: this.stats.cacheHitRate,
//       memoryEstimateMB
//     };
//   }

//   /**
//    * Prune excess markers from pools (memory optimization)
//    */
//   public pruneExcessMarkers(): void {
//     Object.entries(this.POOL_CONFIG).forEach(([level, config]) => {
//       const lodLevel = parseInt(level) as LODLevel;
//       const pool = this.pools.get(lodLevel)!;
      
//       const unusedMarkers = pool.filter(m => !m.inUse);
//       const excess = unusedMarkers.length - config.initial;
      
//       if (excess > 0) {
//         // Remove oldest unused markers
//         const toRemove = unusedMarkers
//           .sort((a, b) => a.lastUpdate - b.lastUpdate)
//           .slice(0, excess);
        
//         toRemove.forEach(marker => {
//           const index = pool.indexOf(marker);
//           if (index > -1) {
//             pool.splice(index, 1);
//           }
//         });
        
//         console.log(`🧹 Pruned ${toRemove.length} markers from LOD ${lodLevel}`);
//       }
//     });
//   }
// }

// // Singleton instance
// export const markerPool = new MarkerPool();


/**
 * Object Pool for Map Markers
 * Reuses DOM elements instead of creating/destroying
 */

export interface PooledMarker {
  element: HTMLDivElement;
  marker: any; // maptilersdk.Marker
  inUse: boolean;
  id?: string;
}

export class MarkerPool {
  private pool: PooledMarker[] = [];
  private maxPoolSize: number = 2000;
  private createdCount: number = 0;

  /**
   * Get a marker from pool or create new one
   */
  acquire(type: 'aircraft' | 'satellite' | 'debris'): PooledMarker {
    // Try to find unused marker of same type
    const available = this.pool.find(
      m => !m.inUse && m.element.dataset.type === type
    );

    if (available) {
      available.inUse = true;
      return available;
    }

    // Create new marker if pool not at max
    if (this.pool.length < this.maxPoolSize) {
      const pooled = this.createMarker(type);
      this.pool.push(pooled);
      this.createdCount++;
      return pooled;
    }

    // Reuse least recently used marker
    const lru = this.pool.find(m => !m.inUse);
    if (lru) {
      lru.inUse = true;
      this.resetMarker(lru, type);
      return lru;
    }

    // Fallback: force create (shouldn't happen often)
    console.warn('⚠️ Marker pool exhausted, force creating');
    const pooled = this.createMarker(type);
    return pooled;
  }

  /**
   * Return marker to pool
   */
  release(pooled: PooledMarker): void {
    pooled.inUse = false;
    pooled.id = undefined;
    
    // Hide marker instead of removing
    if (pooled.marker) {
      pooled.element.style.display = 'none';
    }
  }

  /**
   * Create new marker element
   */
  private createMarker(type: 'aircraft' | 'satellite' | 'debris'): PooledMarker {
    const el = document.createElement('div');
    el.className = 'pooled-marker';
    el.dataset.type = type;
    
    // Base styles
    el.style.cssText = `
      position: absolute;
      border-radius: 50%;
      border: 2px solid white;
      cursor: pointer;
      transition: transform 0.2s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    return {
      element: el,
      marker: null, // Will be set when added to map
      inUse: true,
      id: undefined,
    };
  }

  /**
   * Reset marker for reuse
   */
  private resetMarker(
    pooled: PooledMarker,
    type: 'aircraft' | 'satellite' | 'debris'
  ): void {
    pooled.element.dataset.type = type;
    pooled.element.innerHTML = '';
    pooled.element.style.display = 'flex';
  }

  /**
   * Update marker appearance based on LOD
   */
  updateMarkerLOD(
    pooled: PooledMarker,
    simplified: any,
    lodLevel: 'high' | 'medium' | 'low' | 'minimal'
  ): void {
    const el = pooled.element;
    
    // Update size based on LOD
    const sizes = {
      high: 32,
      medium: 24,
      low: 16,
      minimal: 13,
    };
    
    const size = sizes[lodLevel];
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    
    // Update background color
    el.style.backgroundColor = simplified.color || '#6b7280';
    
    // Update content based on LOD
    if (lodLevel === 'high' || lodLevel === 'medium') {
      el.innerHTML = `<span style="pointer-events: none; font-size: ${size * 0.5}px">${simplified.icon || '•'}</span>`;
    } else {
      el.innerHTML = ''; // Just a colored dot
    }
    
    // Show/hide based on lodLevel
    el.style.display = 'flex';
  }

  

  /**
   * Get pool statistics
   */
  getStats(): {
    total: number;
    inUse: number;
    available: number;
    created: number;
  } {
    const inUse = this.pool.filter(m => m.inUse).length;
    
    return {
      total: this.pool.length,
      inUse,
      available: this.pool.length - inUse,
      created: this.createdCount,
    };
  }

  /**
   * Clear entire pool (use sparingly)
   */
  clear(): void {
    this.pool.forEach(pooled => {
      if (pooled.marker) {
        pooled.marker.remove();
      }
    });
    this.pool = [];
    console.log('🗑️ Marker pool cleared');
  }

  /**
   * Trim pool to remove excess unused markers
   */
  trim(targetSize: number = 500): void {
    const unused = this.pool.filter(m => !m.inUse);
    
    if (unused.length > targetSize) {
      const toRemove = unused.slice(targetSize);
      toRemove.forEach(pooled => {
        if (pooled.marker) {
          pooled.marker.remove();
        }
      });
      
      this.pool = this.pool.filter(m => !toRemove.includes(m));
      console.log(`✂️ Trimmed ${toRemove.length} markers from pool`);
    }
  }
}

export const markerPool = new MarkerPool();