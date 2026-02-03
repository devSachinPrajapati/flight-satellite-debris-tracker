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
    console.log(this.lastLODLevel, lodLevel);    
    
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