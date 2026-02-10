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