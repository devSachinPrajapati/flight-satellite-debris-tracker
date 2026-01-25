// // /**
// //  * ViewportManager.ts
// //  * 
// //  * Manages viewport-based object filtering for optimal rendering performance.
// //  * Only renders objects visible in the current map viewport + buffer zone.
// //  * 
// //  * Performance Impact:
// //  * - Reduces rendered objects from 50,000+ to ~1,000-2,000
// //  * - Achieves 60+ FPS consistently
// //  * - Efficient memory usage
// //  * - Smooth panning and zooming
// //  */

// // import * as maptilersdk from "@maptiler/sdk";
// // import type { Aircraft, SatelliteObject } from "../types";

// // export interface ViewportBounds {
// //   north: number;
// //   south: number;
// //   east: number;
// //   west: number;
// // }

// // export interface ViewportConfig {
// //   bufferPercent: number; // Buffer zone as percentage of viewport (e.g., 0.2 = 20%)
// //   maxObjects: number; // Maximum objects to render (safety limit)
// //   minZoomForClustering: number; // Zoom level below which clustering is enabled
// // }

// // export class ViewportManager {
// //   private map: maptilersdk.Map | null = null;
// //   private config: ViewportConfig;
// //   private currentBounds: ViewportBounds | null = null;
// //   private lastUpdate: number = 0;
// //   private updateThrottleMs: number = 100; // Throttle viewport updates

// //   constructor(config: Partial<ViewportConfig> = {}) {
// //     this.config = {
// //       bufferPercent: config.bufferPercent ?? 0.25, // 25% buffer zone
// //       maxObjects: config.maxObjects ?? 5000,
// //       minZoomForClustering: config.minZoomForClustering ?? 4,
// //     };
// //   }

// //   /**
// //    * Initialize with map instance
// //    */
// //   public setMap(map: maptilersdk.Map): void {
// //     this.map = map;
// //     this.updateViewportBounds();

// //     // Listen to map move events
// //     map.on("move", () => this.throttledUpdate());
// //     map.on("zoom", () => this.throttledUpdate());
// //   }

// //   /**
// //    * Throttled viewport update to prevent excessive calculations
// //    */
// //   private throttledUpdate(): void {
// //     const now = Date.now();
// //     if (now - this.lastUpdate < this.updateThrottleMs) {
// //       return;
// //     }
// //     this.lastUpdate = now;
// //     this.updateViewportBounds();
// //   }

// //   /**
// //    * Update current viewport bounds with buffer zone
// //    */
// //   private updateViewportBounds(): void {
// //     if (!this.map) return;

// //     const bounds = this.map.getBounds();
// //     const ne = bounds.getNorthEast();
// //     const sw = bounds.getSouthWest();

// //     // Calculate buffer zone
// //     const latRange = ne.lat - sw.lat;
// //     const lngRange = ne.lng - sw.lng;
// //     const latBuffer = latRange * this.config.bufferPercent;
// //     const lngBuffer = lngRange * this.config.bufferPercent;

// //     this.currentBounds = {
// //       north: Math.min(90, ne.lat + latBuffer),
// //       south: Math.max(-90, sw.lat - latBuffer),
// //       east: this.normalizeLongitude(ne.lng + lngBuffer),
// //       west: this.normalizeLongitude(sw.lng - lngBuffer),
// //     };
// //   }

// //   /**
// //    * Normalize longitude to [-180, 180] range
// //    */
// //   private normalizeLongitude(lng: number): number {
// //     while (lng > 180) lng -= 360;
// //     while (lng < -180) lng += 360;
// //     return lng;
// //   }

// //   /**
// //    * Check if a coordinate is within the viewport bounds
// //    */
// //   public isInViewport(lat: number, lng: number): boolean {
// //     if (!this.currentBounds) return true; // Render all if no bounds

// //     const { north, south, east, west } = this.currentBounds;

// //     // Check latitude
// //     if (lat < south || lat > north) return false;

// //     // Handle longitude wrapping around -180/180
// //     if (west <= east) {
// //       // Normal case: viewport doesn't cross antimeridian
// //       return lng >= west && lng <= east;
// //     } else {
// //       // Viewport crosses antimeridian (e.g., west=170, east=-170)
// //       return lng >= west || lng <= east;
// //     }
// //   }

// //   /**
// //    * Filter aircraft to only those in viewport
// //    */
// //   public filterAircraft(aircraft: Aircraft[]): Aircraft[] {
// //     if (!this.currentBounds || aircraft.length === 0) return aircraft;

// //     const filtered = aircraft.filter((ac) =>
// //       this.isInViewport(ac.lat, ac.lng)
// //     );

// //     // Apply max objects limit if needed
// //     if (filtered.length > this.config.maxObjects) {
// //       console.warn(
// //         `⚠️ Filtered aircraft (${filtered.length}) exceeds max (${this.config.maxObjects}). Sampling...`
// //       );
// //       return this.sampleObjects(filtered, this.config.maxObjects);
// //     }

// //     return filtered;
// //   }

// //   /**
// //    * Filter satellites to only those in viewport
// //    */
// //   public filterSatellites(satellites: SatelliteObject[]): SatelliteObject[] {
// //     if (!this.currentBounds || satellites.length === 0) return satellites;

// //     const filtered = satellites.filter((sat) =>
// //       this.isInViewport(sat.lat, sat.lng)
// //     );

// //     if (filtered.length > this.config.maxObjects) {
// //       console.warn(
// //         `⚠️ Filtered satellites (${filtered.length}) exceeds max (${this.config.maxObjects}). Sampling...`
// //       );
// //       return this.sampleObjects(filtered, this.config.maxObjects);
// //     }

// //     return filtered;
// //   }

// //   /**
// //    * Filter debris to only those in viewport
// //    */
// //   public filterDebris(debris: SatelliteObject[]): SatelliteObject[] {
// //     if (!this.currentBounds || debris.length === 0) return debris;

// //     const filtered = debris.filter((deb) =>
// //       this.isInViewport(deb.lat, deb.lng)
// //     );

// //     if (filtered.length > this.config.maxObjects) {
// //       return this.sampleObjects(filtered, this.config.maxObjects);
// //     }

// //     return filtered;
// //   }

// //   /**
// //    * Sample objects to reduce count (evenly distributed)
// //    */
// //   private sampleObjects<T>(objects: T[], maxCount: number): T[] {
// //     if (objects.length <= maxCount) return objects;

// //     const step = objects.length / maxCount;
// //     const sampled: T[] = [];

// //     for (let i = 0; i < objects.length && sampled.length < maxCount; i += step) {
// //       sampled.push(objects[Math.floor(i)]);
// //     }

// //     return sampled;
// //   }

// //   /**
// //    * Get current zoom level
// //    */
// //   public getZoom(): number {
// //     return this.map?.getZoom() ?? 0;
// //   }

// //   /**
// //    * Check if clustering should be enabled based on zoom
// //    */
// //   public shouldCluster(): boolean {
// //     return this.getZoom() < this.config.minZoomForClustering;
// //   }

// //   /**
// //    * Get viewport statistics for debugging
// //    */
// //   public getStats(
// //     totalAircraft: number,
// //     totalSatellites: number,
// //     totalDebris: number,
// //     filteredAircraft: number,
// //     filteredSatellites: number,
// //     filteredDebris: number
// //   ): string {
// //     const totalObjects = totalAircraft + totalSatellites + totalDebris;
// //     const filteredObjects =
// //       filteredAircraft + filteredSatellites + filteredDebris;
// //     const reductionPercent = (
// //       ((totalObjects - filteredObjects) / totalObjects) *
// //       100
// //     ).toFixed(1);

// //     return `
// // 📊 Viewport Optimization Stats:
// // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// // Total Objects: ${totalObjects.toLocaleString()}
// //   • Aircraft: ${totalAircraft.toLocaleString()}
// //   • Satellites: ${totalSatellites.toLocaleString()}
// //   • Debris: ${totalDebris.toLocaleString()}

// // Rendered Objects: ${filteredObjects.toLocaleString()}
// //   • Aircraft: ${filteredAircraft.toLocaleString()}
// //   • Satellites: ${filteredSatellites.toLocaleString()}
// //   • Debris: ${filteredDebris.toLocaleString()}

// // Performance Gain: ${reductionPercent}% reduction
// // Zoom Level: ${this.getZoom().toFixed(1)}
// // Buffer Zone: ${(this.config.bufferPercent * 100).toFixed(0)}%
// // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// //     `.trim();
// //   }

// //   /**
// //    * Get current bounds (for debugging)
// //    */
// //   public getCurrentBounds(): ViewportBounds | null {
// //     return this.currentBounds;
// //   }

// //   /**
// //    * Update configuration
// //    */
// //   public updateConfig(config: Partial<ViewportConfig>): void {
// //     this.config = { ...this.config, ...config };
// //     this.updateViewportBounds();
// //   }
// // }

// // // Create singleton instance
// // export const viewportManager = new ViewportManager({
// //   bufferPercent: 0.25, // 25% buffer zone
// //   maxObjects: 5000, // Safety limit
// //   minZoomForClustering: 4, // Enable clustering below zoom 4
// // });




// // /**
// //  * viewportManager.ts - FIXED VERSION
// //  * 
// //  * Manages viewport-based object filtering with zoom-aware density control.
// //  * 
// //  * KEY FIX: 
// //  * - Render ALL data to backend (for search, stats, etc.)
// //  * - Show ONLY important objects at low zoom
// //  * - Progressively show MORE objects as user zooms in
// //  * - Show ALL objects in viewport at high zoom
// //  * 
// //  * Zoom Strategy:
// //  * - Zoom 0-2: Show ~50-100 most important objects globally
// //  * - Zoom 3-5: Show ~200-500 objects in viewport
// //  * - Zoom 6-8: Show ~1,000-2,000 objects in viewport
// //  * - Zoom 9+: Show ALL objects in viewport (full detail)
// //  */

// import * as maptilersdk from "@maptiler/sdk";
// import type { Aircraft, SatelliteObject } from "../types";

// export interface ViewportBounds {
//   north: number;
//   south: number;
//   east: number;
//   west: number;
// }

// export interface ViewportConfig {
//   bufferPercent: number;
//   maxObjectsByZoom: { [zoom: number]: number };
// }

// export class ViewportManager {
//   private map: maptilersdk.Map | null = null;
//   private config: ViewportConfig;
//   private currentBounds: ViewportBounds | null = null;
//   private lastUpdate: number = 0;
//   private updateThrottleMs: number = 150;
//   private lastZoomLevel: number = 0;

//   constructor(config: Partial<ViewportConfig> = {}) {
//     this.config = {
//       bufferPercent: config.bufferPercent ?? 0.2,
//       maxObjectsByZoom: config.maxObjectsByZoom ?? {
//         0: 50,    // World view - only 50 most important
//         1: 80,
//         2: 100,
//         3: 200,
//         4: 300,
//         5: 500,
//         6: 800,
//         7: 1200,
//         8: 2000,
//         9: 3000,  // High zoom - show everything in viewport
//         10: 5000,
//         11: 10000,
//         12: 999999, // No limit at very high zoom
//       },
//     };
//   }

//   public setMap(map: maptilersdk.Map): void {
//     this.map = map;
//     this.updateViewportBounds();

//     map.on("move", () => this.throttledUpdate());
//     map.on("zoom", () => this.throttledUpdate());
//   }

//   private throttledUpdate(): void {
//     const now = Date.now();
//     if (now - this.lastUpdate < this.updateThrottleMs) {
//       return;
//     }
//     this.lastUpdate = now;
//     this.updateViewportBounds();
    
//     // Force update on significant zoom changes
//     if (this.map) {
//       const currentZoom = Math.floor(this.map.getZoom());
//       if (this.lastZoomLevel !== currentZoom) {
//         this.lastZoomLevel = currentZoom;
//         console.log(`🔍 Zoom changed to ${currentZoom} - updating filters`);
//       }
//     }
//   }

//   // private lastZoomLevel: number = 0;

//   private updateViewportBounds(): void {
//     if (!this.map) return;

//     const bounds = this.map.getBounds();
//     const ne = bounds.getNorthEast();
//     const sw = bounds.getSouthWest();

//     const latRange = ne.lat - sw.lat;
//     const lngRange = ne.lng - sw.lng;
//     const latBuffer = latRange * this.config.bufferPercent;
//     const lngBuffer = lngRange * this.config.bufferPercent;

//     this.currentBounds = {
//       north: Math.min(90, ne.lat + latBuffer),
//       south: Math.max(-90, sw.lat - latBuffer),
//       east: this.normalizeLongitude(ne.lng + lngBuffer),
//       west: this.normalizeLongitude(sw.lng - lngBuffer),
//     };
//   }

//   private normalizeLongitude(lng: number): number {
//     while (lng > 180) lng -= 360;
//     while (lng < -180) lng += 360;
//     return lng;
//   }

//   public isInViewport(lat: number, lng: number): boolean {
//     if (!this.currentBounds) return true;

//     const { north, south, east, west } = this.currentBounds;

//     if (lat < south || lat > north) return false;

//     if (west <= east) {
//       return lng >= west && lng <= east;
//     } else {
//       return lng >= west || lng <= east;
//     }
//   }

//   public getZoom(): number {
//     return this.map?.getZoom() ?? 0;
//   }

//   /**
//    * Get max objects allowed for current zoom level
//    */
//   private getMaxObjectsForZoom(zoom: number): number {
//     const zoomLevel = Math.floor(zoom);
    
//     // Find the limit for current zoom
//     for (let z = zoomLevel; z >= 0; z--) {
//       if (this.config.maxObjectsByZoom[z] !== undefined) {
//         return this.config.maxObjectsByZoom[z];
//       }
//     }
    
//     return this.config.maxObjectsByZoom[0] || 50;
//   }

//   /**
//    * Calculate importance score for aircraft
//    * Higher score = more important to show
//    */
//   private getAircraftImportance(aircraft: Aircraft): number {
//     let score = 0;
    
//     // Higher altitude = more important (visible to more people)
//     score += (aircraft.alt || 0) / 1000;
    
//     // Higher speed = more important (active flight)
//     score += (aircraft.speed || 0) / 100;
    
//     // Has flight number = more important (commercial flight)
//     if (aircraft.flight_icao) score += 50;
    
//     // Has airline = more important
//     if (aircraft.airline_icao) score += 30;
    
//     // Has route info = more important
//     if (aircraft.dep_iata || aircraft.arr_iata) score += 20;
    
//     return score;
//   }

//   /**
//    * Calculate importance score for satellites
//    */
//   private getSatelliteImportance(satellite: SatelliteObject): number {
//     let score = 0;
    
//     // Lower altitude = more important (easier to see)
//     const alt = satellite.altitude || 0;
//     if (alt < 1000) score += 100; // LEO satellites
//     else if (alt < 10000) score += 50; // MEO satellites
//     else score += 20; // GEO satellites
    
//     // Has name = more important
//     if (satellite.name && !satellite.name.includes('UNKNOWN')) score += 30;
    
//     // Higher velocity = more important (active)
//     score += (satellite.velocity || 0);
    
//     return score;
//   }

//   /**
//    * Calculate importance score for debris
//    */
//   private getDebrisImportance(debris: SatelliteObject): number {
//     let score = 0;
    
//     // Lower altitude = more important (potential hazard)
//     const alt = debris.altitude || 0;
//     if (alt < 500) score += 100;
//     else if (alt < 1000) score += 50;
//     else score += 10;
    
//     return score;
//   }

//   /**
//    * FIXED: Filter aircraft with zoom-based importance
//    */
//   public filterAircraft(aircraft: Aircraft[]): Aircraft[] {
//     if (aircraft.length === 0) return aircraft;
    
//     const zoom = this.getZoom();
//     const maxObjects = this.getMaxObjectsForZoom(zoom);
    
//     // Step 1: Filter by viewport (always)
//     let filtered = aircraft.filter((ac) => this.isInViewport(ac.lat, ac.lng));
    
//     // Step 2: If still too many, apply importance-based sampling
//     if (filtered.length > maxObjects) {
//       // Calculate importance for each
//       const withImportance = filtered.map(ac => ({
//         aircraft: ac,
//         importance: this.getAircraftImportance(ac)
//       }));
      
//       // Sort by importance (highest first)
//       withImportance.sort((a, b) => b.importance - a.importance);
      
//       // Take top N most important
//       filtered = withImportance.slice(0, maxObjects).map(item => item.aircraft);
//     }
    
//     return filtered;
//   }

//   /**
//    * FIXED: Filter satellites with zoom-based importance
//    */
//   public filterSatellites(satellites: SatelliteObject[]): SatelliteObject[] {
//     if (satellites.length === 0) return satellites;
    
//     const zoom = this.getZoom();
//     const maxObjects = this.getMaxObjectsForZoom(zoom);
    
//     let filtered = satellites.filter((sat) => this.isInViewport(sat.lat, sat.lng));
    
//     if (filtered.length > maxObjects) {
//       const withImportance = filtered.map(sat => ({
//         satellite: sat,
//         importance: this.getSatelliteImportance(sat)
//       }));
      
//       withImportance.sort((a, b) => b.importance - a.importance);
//       filtered = withImportance.slice(0, maxObjects).map(item => item.satellite);
//     }
    
//     return filtered;
//   }

//   /**
//    * FIXED: Filter debris with zoom-based importance
//    */
//   public filterDebris(debris: SatelliteObject[]): SatelliteObject[] {
//     if (debris.length === 0) return debris;
    
//     const zoom = this.getZoom();
//     const maxObjects = this.getMaxObjectsForZoom(zoom);
    
//     let filtered = debris.filter((deb) => this.isInViewport(deb.lat, deb.lng));
    
//     if (filtered.length > maxObjects) {
//       const withImportance = filtered.map(deb => ({
//         debris: deb,
//         importance: this.getDebrisImportance(deb)
//       }));
      
//       withImportance.sort((a, b) => b.importance - a.importance);
//       filtered = withImportance.slice(0, maxObjects).map(item => item.debris);
//     }
    
//     return filtered;
//   }

//   public getStats(
//     totalAircraft: number,
//     totalSatellites: number,
//     totalDebris: number,
//     filteredAircraft: number,
//     filteredSatellites: number,
//     filteredDebris: number
//   ): string {
//     const totalObjects = totalAircraft + totalSatellites + totalDebris;
//     const filteredObjects = filteredAircraft + filteredSatellites + filteredDebris;
//     const reductionPercent = totalObjects > 0 
//       ? (((totalObjects - filteredObjects) / totalObjects) * 100).toFixed(1)
//       : "0.0";
    
//     const zoom = this.getZoom();
//     const maxAllowed = this.getMaxObjectsForZoom(zoom);

//     return `
// 🚀 Viewport Optimization Stats:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Zoom Level: ${zoom.toFixed(1)}
// Max Objects Allowed: ${maxAllowed.toLocaleString()}

// Total Objects: ${totalObjects.toLocaleString()}
//   • Aircraft: ${totalAircraft.toLocaleString()}
//   • Satellites: ${totalSatellites.toLocaleString()}
//   • Debris: ${totalDebris.toLocaleString()}

// Rendered Objects: ${filteredObjects.toLocaleString()}
//   • Aircraft: ${filteredAircraft.toLocaleString()}
//   • Satellites: ${filteredSatellites.toLocaleString()}
//   • Debris: ${filteredDebris.toLocaleString()}

// Performance Gain: ${reductionPercent}% reduction
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//     `.trim();
//   }

//   public getCurrentBounds(): ViewportBounds | null {
//     return this.currentBounds;
//   }

//   public updateConfig(config: Partial<ViewportConfig>): void {
//     this.config = { ...this.config, ...config };
//     this.updateViewportBounds();
//   }
// }

// // Create singleton instance
// export const viewportManager = new ViewportManager({
//   bufferPercent: 0.2,
//   maxObjectsByZoom: {
//     0: 50,     // World view - critical objects only
//     1: 80,
//     2: 100,
//     3: 200,    // Continental view
//     4: 300,
//     5: 500,    // Regional view
//     6: 800,
//     7: 1200,
//     8: 2000,   // City view
//     9: 3000,
//     10: 5000,  // Local view
//     11: 10000,
//     12: 999999, // Street view - show everything
//   },
// });


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
   * Get rendering limit based on zoom level
   * Zoom 1-3 (global): 50 objects
   * Zoom 3-5 (continental): 200 objects  
   * Zoom 5-8 (regional): 500 objects
   * Zoom 8+ (local): 1000+ objects
   */
private getRenderLimit(): number {
    const zoom = this.lastZoom;
    
    if (zoom < 2) return 100;   // Global - show meaningful sample
    if (zoom < 4) return 400;  // Continental - show regional density
    if (zoom < 6) return 700;  // Regional - show most objects
    if (zoom < 8) return 1000;  // Local - dense coverage
    return 10000;                 // City - show everything visible
  }

  /**
   * Filter aircraft by viewport and zoom
   */
  filterAircraft(aircraft: Aircraft[]): Aircraft[] {
    this.updateBounds();
    
    const limit = this.getRenderLimit();
    
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
    
    const limit = this.getRenderLimit();
    
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
  // filterDebris(debris: SatelliteObject[]): SatelliteObject[] {
  //   this.updateBounds();
    
  //   // Debris gets lower priority - only show at higher zoom
  //   const zoom = this.lastZoom;
  //   if (zoom < 4) return []; // Don't show debris at global view

  //   const limit = Math.floor(this.getRenderLimit() * 0.5); // 50% of normal limit
    
  //   // Filter by viewport
  //   const inViewport = debris.filter(deb => 
  //     this.isInViewport(deb.lat, deb.lng)
  //   );

  //   // Limit count
  //   if (inViewport.length > limit) {
  //     return inViewport.slice(0, limit);
  //   }

  //   return inViewport;
  // }

  filterDebris(debris: SatelliteObject[]): SatelliteObject[] {
    this.updateBounds();
    
    const zoom = this.lastZoom;
    
    // ✅ FIXED: Show debris at all zoom levels, just with different quotas
    let debrisQuota: number;
    
    if (zoom < 2) {
      // Global view: Show 10% of debris
      debrisQuota = Math.floor(this.getRenderLimit() * 0.1);
    } else if (zoom < 4) {
      // Continental view: Show 20% of debris
      debrisQuota = Math.floor(this.getRenderLimit() * 0.2);
    } else {
      // Regional/Local view: Show 30% of debris
      debrisQuota = Math.floor(this.getRenderLimit() * 0.3);
    }
    
    // Filter by viewport
    const inViewport = debris.filter(deb => 
      this.isInViewport(deb.lat, deb.lng)
    );

    // Limit count based on zoom-adjusted quota
    if (inViewport.length > debrisQuota) {
      // Prioritize debris with lower altitude (more visible)
      return inViewport
        .sort(() => Math.random() - 0.5) // Random sample for even distribution
        .slice(0, debrisQuota);
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
  Limit: ${this.getRenderLimit()}
  
  Aircraft: ${renderedAircraft}/${totalAircraft}
  Satellites: ${renderedSatellites}/${totalSatellites}
  Debris: ${renderedDebris}/${totalDebris}
  
  Total Rendered: ${rendered}/${total}
  Optimization: ${optimized.toFixed(1)}% culled
    `.trim();
  }
}

export const viewportManager = new ViewportManager();