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