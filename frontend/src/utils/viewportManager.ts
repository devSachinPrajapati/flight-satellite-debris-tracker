/**
 * Viewport Manager - PROGRESSIVE RENDERING OPTIMIZATION
 * 
 * Filters objects based on current map viewport and zoom level
 * to prevent rendering thousands of off-screen markers
 */
import type * as maptilersdk from '@maptiler/sdk';
import type { Aircraft, SatelliteObject } from '../types';

class ViewportManager {
  private map: maptilersdk.Map | null = null;
  private lastBounds: { north: number; south: number; east: number; west: number } | null = null;
  private lastZoom: number = 1.5;

  /**
   * Set the map instance
   */
  setMap(map: maptilersdk.Map) {
    this.map = map;
    this.updateBounds();
  }

  /**
   * Update cached viewport bounds
   */
  private updateBounds() {
    if (!this.map) return;

    const bounds = this.map.getBounds();
    this.lastBounds = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    };
    this.lastZoom = this.map.getZoom();
  }

  /**
   * Check if coordinates are within viewport
   */
  private isInViewport(lat: number, lng: number): boolean {
    if (!this.lastBounds) return true;

    const { north, south, east, west } = this.lastBounds;

    // Handle antimeridian crossing
    const lngInRange = west <= east
      ? lng >= west && lng <= east
      : lng >= west || lng <= east;

    return lat >= south && lat <= north && lngInRange;
  }

  /**
   * ✅ FIXED: Get TOTAL rendering limit based on zoom level
   * This is the TOTAL across ALL object types combined
   */
  private getTotalRenderLimit(): number {
    const zoom = this.lastZoom;

    if (zoom < 1.5) return 50;     // Very global view - minimal
    if (zoom < 2.5) return 120;    // Global - sparse (100 → 120 for better distribution)
    if (zoom < 3.5) return 250;    // Continental - moderate
    if (zoom < 4.5) return 400;    // Regional - balanced
    if (zoom < 5.5) return 600;    // Local - good
    if (zoom < 6.5) return 800;    // Detailed
    if (zoom < 7.5) return 1200;   // City
    return 10000;                   // Street - all
  }

  /**
   * ✅ NEW: Distribute total limit across object types
   * Aircraft: 45%, Satellites: 45%, Debris: 10%
   */
  private getObjectTypeQuota(type: 'aircraft' | 'satellite' | 'debris'): number {
    const totalLimit = this.getTotalRenderLimit();
    
    switch (type) {
      case 'aircraft':
        return Math.floor(totalLimit * 0.45);  // 45% of total
      case 'satellite':
        return Math.floor(totalLimit * 0.45);  // 45% of total
      case 'debris':
        return Math.floor(totalLimit * 0.10);  // 10% of total
      default:
        return totalLimit;
    }
  }

  /**
   * Filter aircraft by viewport and zoom
   */
  filterAircraft(aircraft: Aircraft[]): Aircraft[] {
    this.updateBounds();

    const limit = this.getObjectTypeQuota('aircraft');

    // Filter by viewport
    const inViewport = aircraft.filter(ac =>
      this.isInViewport(ac.lat, ac.lng)
    );

    // If still too many, prioritize by altitude (higher = more visible)
    if (inViewport.length > limit) {
      return inViewport
        .sort((a, b) => (b.alt || 0) - (a.alt || 0))
        .slice(0, limit);
    }

    return inViewport;
  }

  /**
   * Filter satellites by viewport and zoom
   */
  filterSatellites(satellites: SatelliteObject[]): SatelliteObject[] {
    this.updateBounds();

    const limit = this.getObjectTypeQuota('satellite');

    // Filter by viewport
    const inViewport = satellites.filter(sat =>
      this.isInViewport(sat.lat, sat.lng)
    );

    // If still too many, prioritize by altitude (lower = more visible)
    if (inViewport.length > limit) {
      return inViewport
        .sort((a, b) => (a.altitude || 0) - (b.altitude || 0))
        .slice(0, limit);
    }

    return inViewport;
  }

  /**
   * Filter debris by viewport and zoom
   */
  filterDebris(debris: SatelliteObject[]): SatelliteObject[] {
    this.updateBounds();

    const limit = this.getObjectTypeQuota('debris');

    // Filter by viewport
    const inViewport = debris.filter(deb =>
      this.isInViewport(deb.lat, deb.lng)
    );

    // Limit count based on quota
    if (inViewport.length > limit) {
      // Random sample for even distribution
      return inViewport
        .sort(() => Math.random() - 0.5)
        .slice(0, limit);
    }

    return inViewport;
  }

  /**
   * Get performance statistics
   */
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