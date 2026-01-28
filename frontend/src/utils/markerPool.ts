/**
 * High-Performance Marker Object Pool
 * Reuses marker instances to minimize GC pressure
 */

import type { Aircraft, SatelliteObject } from '../types';
import { LODLevel } from './lodManager';

export interface PooledMarker {
  id: string;
  element: HTMLElement;
  lodLevel: LODLevel;
  inUse: boolean;
  lastUpdate: number;
  objectType: 'aircraft' | 'satellite' | 'debris';
  data?: Aircraft | SatelliteObject;
}

export class MarkerPool {
  // Separate pools for each LOD level
  private pools: Map<LODLevel, PooledMarker[]> = new Map([
    [LODLevel.FAR, []],
    [LODLevel.MEDIUM, []],
    [LODLevel.NEAR, []],
    [LODLevel.CLOSE, []]
  ]);

  // Active markers (in viewport)
  private activeMarkers: Map<string, PooledMarker> = new Map();

  // Pool configuration
  private readonly POOL_CONFIG = {
    [LODLevel.FAR]: { initial: 500, max: 2000 },
    [LODLevel.MEDIUM]: { initial: 300, max: 1000 },
    [LODLevel.NEAR]: { initial: 200, max: 500 },
    [LODLevel.CLOSE]: { initial: 100, max: 300 }
  };

  // Statistics
  private stats = {
    totalCreated: 0,
    totalReused: 0,
    totalReleased: 0,
    cacheHitRate: 0
  };

  constructor() {
    this.initializePools();
  }

  /**
   * Pre-allocate marker pools
   */
  private initializePools(): void {
    Object.entries(this.POOL_CONFIG).forEach(([level, config]) => {
      const lodLevel = parseInt(level) as LODLevel;
      const pool = this.pools.get(lodLevel)!;
      
      for (let i = 0; i < config.initial; i++) {
        pool.push(this.createMarker(lodLevel));
      }
    });

    console.log('✅ Marker pools initialized:', {
      FAR: this.pools.get(LODLevel.FAR)!.length,
      MEDIUM: this.pools.get(LODLevel.MEDIUM)!.length,
      NEAR: this.pools.get(LODLevel.NEAR)!.length,
      CLOSE: this.pools.get(LODLevel.CLOSE)!.length
    });
  }

  /**
   * Create a new marker element for specific LOD
   */
  private createMarker(lodLevel: LODLevel): PooledMarker {
    const element = document.createElement('div');
    element.className = `marker lod-${lodLevel}`;
    element.style.position = 'absolute';
    element.style.pointerEvents = 'none'; // Will enable for interactive LODs
    
    this.stats.totalCreated++;

    return {
      id: '',
      element,
      lodLevel,
      inUse: false,
      lastUpdate: 0,
      objectType: 'aircraft'
    };
  }

  /**
   * Acquire marker from pool
   */
  public acquire(
    id: string,
    lodLevel: LODLevel,
    objectType: 'aircraft' | 'satellite' | 'debris',
    data: Aircraft | SatelliteObject
  ): PooledMarker {
    const pool = this.pools.get(lodLevel)!;
    
    // Try to find available marker in pool
    let marker = pool.find(m => !m.inUse);
    
    if (marker) {
      // Reuse existing marker
      this.stats.totalReused++;
    } else {
      // Create new marker if pool exhausted
      const config = this.POOL_CONFIG[lodLevel];
      if (pool.length < config.max) {
        marker = this.createMarker(lodLevel);
        pool.push(marker);
      } else {
        // Pool exhausted - log warning
        console.warn(`⚠️ Pool exhausted for LOD ${lodLevel}`);
        marker = this.createMarker(lodLevel);
      }
    }

    // Configure marker
    marker.id = id;
    marker.inUse = true;
    marker.lastUpdate = Date.now();
    marker.objectType = objectType;
    marker.data = data;

    // Store in active markers
    this.activeMarkers.set(id, marker);

    // Update cache hit rate
    this.updateCacheHitRate();

    return marker;
  }

  /**
   * Release marker back to pool
   */
  public release(id: string): void {
    const marker = this.activeMarkers.get(id);
    if (!marker) return;

    // Remove from DOM if attached
    if (marker.element.parentNode) {
      marker.element.parentNode.removeChild(marker.element);
    }

    // Reset marker state
    marker.inUse = false;
    marker.id = '';
    marker.data = undefined;
    marker.element.innerHTML = ''; // Clear content
    marker.element.style.display = 'none';
    marker.element.style.pointerEvents = 'none';

    // Remove from active
    this.activeMarkers.delete(id);
    
    this.stats.totalReleased++;
  }

  /**
   * Batch release multiple markers
   */
  public batchRelease(ids: string[]): void {
    ids.forEach(id => this.release(id));
  }

  /**
   * Get active marker by ID
   */
  public get(id: string): PooledMarker | undefined {
    return this.activeMarkers.get(id);
  }

  /**
   * Check if marker is active
   */
  public isActive(id: string): boolean {
    return this.activeMarkers.has(id);
  }

  /**
   * Clear all active markers (viewport change)
   */
  public clearAll(): void {
    const ids = Array.from(this.activeMarkers.keys());
    this.batchRelease(ids);
  }

  /**
   * Migrate marker to different LOD level
   */
  public migrateLOD(id: string, newLOD: LODLevel): PooledMarker | null {
    const oldMarker = this.activeMarkers.get(id);
    if (!oldMarker || !oldMarker.data) return null;

    // Release old marker
    this.release(id);

    // Acquire new marker at different LOD
    return this.acquire(id, newLOD, oldMarker.objectType, oldMarker.data);
  }

  /**
   * Batch migrate markers to new LOD
   */
  public batchMigrateLOD(ids: string[], newLOD: LODLevel): PooledMarker[] {
    return ids.map(id => this.migrateLOD(id, newLOD)).filter(Boolean) as PooledMarker[];
  }

  /**
   * Update cache hit rate
   */
  private updateCacheHitRate(): void {
    const total = this.stats.totalReused + this.stats.totalCreated;
    this.stats.cacheHitRate = total > 0 ? (this.stats.totalReused / total) * 100 : 0;
  }

  /**
   * Get pool statistics
   */
  public getStats(): {
    poolSizes: Record<LODLevel, number>;
    activeMarkers: number;
    totalCreated: number;
    totalReused: number;
    cacheHitRate: number;
    memoryEstimateMB: number;
  } {
    const poolSizes = {
      [LODLevel.FAR]: this.pools.get(LODLevel.FAR)!.length,
      [LODLevel.MEDIUM]: this.pools.get(LODLevel.MEDIUM)!.length,
      [LODLevel.NEAR]: this.pools.get(LODLevel.NEAR)!.length,
      [LODLevel.CLOSE]: this.pools.get(LODLevel.CLOSE)!.length
    };

    // Estimate memory (rough calculation)
    const memoryEstimateMB = (
      (poolSizes[LODLevel.FAR] * 100 +
       poolSizes[LODLevel.MEDIUM] * 300 +
       poolSizes[LODLevel.NEAR] * 600 +
       poolSizes[LODLevel.CLOSE] * 1024) / (1024 * 1024)
    );

    return {
      poolSizes,
      activeMarkers: this.activeMarkers.size,
      totalCreated: this.stats.totalCreated,
      totalReused: this.stats.totalReused,
      cacheHitRate: this.stats.cacheHitRate,
      memoryEstimateMB
    };
  }

  /**
   * Prune excess markers from pools (memory optimization)
   */
  public pruneExcessMarkers(): void {
    Object.entries(this.POOL_CONFIG).forEach(([level, config]) => {
      const lodLevel = parseInt(level) as LODLevel;
      const pool = this.pools.get(lodLevel)!;
      
      const unusedMarkers = pool.filter(m => !m.inUse);
      const excess = unusedMarkers.length - config.initial;
      
      if (excess > 0) {
        // Remove oldest unused markers
        const toRemove = unusedMarkers
          .sort((a, b) => a.lastUpdate - b.lastUpdate)
          .slice(0, excess);
        
        toRemove.forEach(marker => {
          const index = pool.indexOf(marker);
          if (index > -1) {
            pool.splice(index, 1);
          }
        });
        
        console.log(`🧹 Pruned ${toRemove.length} markers from LOD ${lodLevel}`);
      }
    });
  }
}

// Singleton instance
export const markerPool = new MarkerPool();