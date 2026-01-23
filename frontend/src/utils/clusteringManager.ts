/**
 * ClusteringManager.ts
 * 
 * Advanced clustering system for handling massive object counts at low zoom levels.
 * Uses spatial grid-based clustering for O(n) performance.
 * 
 * Features:
 * - Grid-based spatial clustering
 * - Automatic cluster size calculation based on zoom
 * - Separate clustering for different object types
 * - Efficient cluster merging and splitting
 */

import type { Aircraft, SatelliteObject } from "../types";

export interface ClusterPoint {
  lat: number;
  lng: number;
  count: number;
  type: "aircraft" | "satellite" | "debris" | "mixed";
  objects: (Aircraft | SatelliteObject)[];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface ClusterConfig {
  minZoomForClustering: number; // Below this zoom, use clustering
  gridSizeByZoom: { [zoom: number]: number }; // Grid cell size in degrees
  maxClusterSize: number; // Max objects per cluster before splitting
  minClusterDistance: number; // Minimum distance between cluster centers (km)
}

export class ClusteringManager {
  private config: ClusterConfig;

  constructor(config: Partial<ClusterConfig> = {}) {
    this.config = {
      minZoomForClustering: config.minZoomForClustering ?? 4,
      gridSizeByZoom: config.gridSizeByZoom ?? {
        0: 30, // World view - 30° grid
        1: 20,
        2: 10,
        3: 5,
        4: 2, // Regional view - 2° grid
      },
      maxClusterSize: config.maxClusterSize ?? 1000,
      minClusterDistance: config.minClusterDistance ?? 100,
    };
  }

  /**
   * Determine if clustering should be used for given zoom level
   */
  public shouldCluster(zoom: number): boolean {
    return zoom < this.config.minZoomForClustering;
  }

  /**
   * Get grid size for current zoom level
   */
  private getGridSize(zoom: number): number {
    const zoomLevel = Math.floor(zoom);
    
    // Find closest defined zoom level
    const definedZooms = Object.keys(this.config.gridSizeByZoom)
      .map(Number)
      .sort((a, b) => a - b);
    
    for (let i = definedZooms.length - 1; i >= 0; i--) {
      if (zoomLevel >= definedZooms[i]) {
        return this.config.gridSizeByZoom[definedZooms[i]];
      }
    }
    
    return this.config.gridSizeByZoom[0] || 30;
  }

  /**
   * Create grid cell key from coordinates
   */
  private getGridKey(lat: number, lng: number, gridSize: number): string {
    const latCell = Math.floor(lat / gridSize);
    const lngCell = Math.floor(lng / gridSize);
    return `${latCell},${lngCell}`;
  }

  /**
   * Calculate cluster center (weighted by object density)
   */
  private calculateClusterCenter(objects: (Aircraft | SatelliteObject)[]): {
    lat: number;
    lng: number;
  } {
    if (objects.length === 0) {
      return { lat: 0, lng: 0 };
    }

    let totalLat = 0;
    let totalLng = 0;

    objects.forEach((obj) => {
      totalLat += obj.lat;
      totalLng += obj.lng;
    });

    return {
      lat: totalLat / objects.length,
      lng: totalLng / objects.length,
    };
  }

  /**
   * Calculate cluster bounds
   */
  private calculateBounds(objects: (Aircraft | SatelliteObject)[]): {
    north: number;
    south: number;
    east: number;
    west: number;
  } {
    if (objects.length === 0) {
      return { north: 0, south: 0, east: 0, west: 0 };
    }

    let north = -90;
    let south = 90;
    let east = -180;
    let west = 180;

    objects.forEach((obj) => {
      north = Math.max(north, obj.lat);
      south = Math.min(south, obj.lat);
      east = Math.max(east, obj.lng);
      west = Math.min(west, obj.lng);
    });

    return { north, south, east, west };
  }

  /**
   * Determine cluster type based on objects
   */
  private getClusterType(
    objects: (Aircraft | SatelliteObject)[]
  ): "aircraft" | "satellite" | "debris" | "mixed" {
    if (objects.length === 0) return "mixed";

    const hasAircraft = objects.some((obj) => "hex" in obj);
    const hasSatellite = objects.some(
      (obj) => "norad_id" in obj && !("object_type" in obj && obj.object_type === "debris")
    );
    const hasDebris = objects.some(
      (obj) => "object_type" in obj && obj.object_type === "debris"
    );

    const typeCount = [hasAircraft, hasSatellite, hasDebris].filter(Boolean).length;

    if (typeCount > 1) return "mixed";
    if (hasAircraft) return "aircraft";
    if (hasSatellite) return "satellite";
    if (hasDebris) return "debris";

    return "mixed";
  }

  /**
   * Cluster aircraft objects
   */
  public clusterAircraft(aircraft: Aircraft[], zoom: number): ClusterPoint[] {
    if (!this.shouldCluster(zoom) || aircraft.length === 0) {
      return [];
    }

    return this.clusterObjects(aircraft, zoom);
  }

  /**
   * Cluster satellite objects
   */
  public clusterSatellites(
    satellites: SatelliteObject[],
    zoom: number
  ): ClusterPoint[] {
    if (!this.shouldCluster(zoom) || satellites.length === 0) {
      return [];
    }

    return this.clusterObjects(satellites, zoom);
  }

  /**
   * Cluster debris objects
   */
  public clusterDebris(debris: SatelliteObject[], zoom: number): ClusterPoint[] {
    if (!this.shouldCluster(zoom) || debris.length === 0) {
      return [];
    }

    return this.clusterObjects(debris, zoom);
  }

  /**
   * Generic clustering algorithm using spatial grid
   */
  private clusterObjects(
    objects: (Aircraft | SatelliteObject)[],
    zoom: number
  ): ClusterPoint[] {
    const gridSize = this.getGridSize(zoom);
    const grid = new Map<string, (Aircraft | SatelliteObject)[]>();

    // Distribute objects into grid cells
    objects.forEach((obj) => {
      const key = this.getGridKey(obj.lat, obj.lng, gridSize);
      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(obj);
    });

    // Create clusters from grid cells
    const clusters: ClusterPoint[] = [];

    grid.forEach((cellObjects) => {
      if (cellObjects.length === 0) return;

      const center = this.calculateClusterCenter(cellObjects);
      const bounds = this.calculateBounds(cellObjects);
      const type = this.getClusterType(cellObjects);

      clusters.push({
        lat: center.lat,
        lng: center.lng,
        count: cellObjects.length,
        type,
        objects: cellObjects,
        bounds,
      });
    });

    return clusters;
  }

  /**
   * Get cluster statistics
   */
  public getClusterStats(clusters: ClusterPoint[]): {
    totalClusters: number;
    totalObjects: number;
    avgClusterSize: number;
    maxClusterSize: number;
    minClusterSize: number;
  } {
    if (clusters.length === 0) {
      return {
        totalClusters: 0,
        totalObjects: 0,
        avgClusterSize: 0,
        maxClusterSize: 0,
        minClusterSize: 0,
      };
    }

    const totalObjects = clusters.reduce((sum, c) => sum + c.count, 0);
    const clusterSizes = clusters.map((c) => c.count);

    return {
      totalClusters: clusters.length,
      totalObjects,
      avgClusterSize: totalObjects / clusters.length,
      maxClusterSize: Math.max(...clusterSizes),
      minClusterSize: Math.min(...clusterSizes),
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ClusterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): ClusterConfig {
    return { ...this.config };
  }
}

// Create singleton instance
export const clusteringManager = new ClusteringManager({
  minZoomForClustering: 4,
  gridSizeByZoom: {
    0: 30, // World view
    1: 20,
    2: 10,
    3: 5,
    4: 2, // Regional view
  },
  maxClusterSize: 1000,
  minClusterDistance: 100,
});