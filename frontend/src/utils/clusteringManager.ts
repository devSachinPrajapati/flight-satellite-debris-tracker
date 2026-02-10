/**
 * 
 * Grid-based clustering optimized for 210-880 objects across zoom levels 1.5-9.5
 * Clustering active ONLY at zoom 2-4 where congestion occurs
 * 
 * Performance: O(n) complexity, <10ms clustering time
 */

import type { Aircraft, SatelliteObject } from "../types";
import { ZOOM_CONFIG, getClusterGridSize, shouldCluster } from '../config/zoom';

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
  minZoomForClustering: number; // Start clustering below this zoom
  maxZoomForClustering: number; // Stop clustering above this zoom
  gridSizeByZoom: { [zoom: number]: number }; // Grid cell size in degrees
  minClusterSize: number; // Minimum objects to form a cluster
  maxClusterSize: number; // Max objects per cluster before splitting
}

export class ClusteringManager {
  private config: ClusterConfig;

  constructor(config: Partial<ClusterConfig> = {}) {
    this.config = {
      minZoomForClustering: config.minZoomForClustering ?? ZOOM_CONFIG.THRESHOLDS.CLUSTERING_START,
      maxZoomForClustering: config.maxZoomForClustering ?? ZOOM_CONFIG.THRESHOLDS.CLUSTERING_END,
      gridSizeByZoom: config.gridSizeByZoom ?? ZOOM_CONFIG.CLUSTER_GRID_SIZES,
      minClusterSize: config.minClusterSize ?? 3,
      maxClusterSize: config.maxClusterSize ?? 500,
    };
  }


  public shouldCluster(zoom: number): boolean {
    return shouldCluster(zoom);  //   Use centralized function
  }

  /**
   * Get grid size for current zoom level with smooth interpolation
   */

  private getGridSize(zoom: number): number {
    return getClusterGridSize(zoom);  //   Use centralized function
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
   * Calculate cluster center (average position)
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

    // Count each type
    let aircraftCount = 0;
    let satelliteCount = 0;
    let debrisCount = 0;

    objects.forEach((obj) => {
      if ("hex" in obj) {
        aircraftCount++;
      } else if ("norad_id" in obj) {
        if ("object_type" in obj && obj.object_type === "debris") {
          debrisCount++;
        } else {
          satelliteCount++;
        }
      }
    });

    // Determine dominant type (>70% of cluster)
    const total = objects.length;
    const threshold = 0.7;

    if (aircraftCount / total > threshold) return "aircraft";
    if (satelliteCount / total > threshold) return "satellite";
    if (debrisCount / total > threshold) return "debris";

    return "mixed";
  }

  /**
   * Cluster aircraft objects
   */
  public clusterAircraft(aircraft: Aircraft[], zoom: number): ClusterPoint[] {
    if (!this.shouldCluster(zoom) || aircraft.length === 0) {
      return [];
    }

    return this.clusterObjects(aircraft, zoom, "aircraft");
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

    return this.clusterObjects(satellites, zoom, "satellite");
  }

  /**
   * Cluster debris objects
   */
  public clusterDebris(debris: SatelliteObject[], zoom: number): ClusterPoint[] {
    if (!this.shouldCluster(zoom) || debris.length === 0) {
      return [];
    }

    return this.clusterObjects(debris, zoom, "debris");
  }

  /**
   * Generic clustering algorithm using spatial grid
   * Performance: O(n) where n is number of objects
   */
  private clusterObjects(
    objects: (Aircraft | SatelliteObject)[],
    zoom: number,
    defaultType: "aircraft" | "satellite" | "debris" | "mixed"
  ): ClusterPoint[] {
    const gridSize = this.getGridSize(zoom);
    
    // Early exit if no clustering needed
    if (gridSize === 0) {
      return [];
    }

    const grid = new Map<string, (Aircraft | SatelliteObject)[]>();

    // Single pass to distribute objects into grid cells
    objects.forEach((obj) => {
      const key = this.getGridKey(obj.lat, obj.lng, gridSize);
      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(obj);
    });

    // Create clusters only for cells with enough objects
    const clusters: ClusterPoint[] = [];

    grid.forEach((cellObjects) => {
      // Skip if below minimum cluster size
      if (cellObjects.length < this.config.minClusterSize) {
        return;
      }

      const center = this.calculateClusterCenter(cellObjects);
      const bounds = this.calculateBounds(cellObjects);
      const type = this.getClusterType(cellObjects);

      clusters.push({
        lat: center.lat,
        lng: center.lng,
        count: cellObjects.length,
        type: type === "mixed" ? defaultType : type, // Fallback to default type
        objects: cellObjects,
        bounds,
      });
    });

    return clusters;
  }

  /**
   * Cluster all objects together (mixed clustering)
   */
  public clusterAll(
    aircraft: Aircraft[],
    satellites: SatelliteObject[],
    debris: SatelliteObject[],
    zoom: number
  ): ClusterPoint[] {
    if (!this.shouldCluster(zoom)) {
      return [];
    }

    // Combine all objects
    const allObjects: (Aircraft | SatelliteObject)[] = [
      ...aircraft,
      ...satellites,
      ...debris,
    ];

    if (allObjects.length === 0) {
      return [];
    }

    return this.clusterObjects(allObjects, zoom, "mixed");
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
    clusteringEfficiency: number; // Percentage reduction
  } {
    if (clusters.length === 0) {
      return {
        totalClusters: 0,
        totalObjects: 0,
        avgClusterSize: 0,
        maxClusterSize: 0,
        minClusterSize: 0,
        clusteringEfficiency: 0,
      };
    }

    const totalObjects = clusters.reduce((sum, c) => sum + c.count, 0);
    const clusterSizes = clusters.map((c) => c.count);
    const efficiency = ((totalObjects - clusters.length) / totalObjects) * 100;

    return {
      totalClusters: clusters.length,
      totalObjects,
      avgClusterSize: totalObjects / clusters.length,
      maxClusterSize: Math.max(...clusterSizes),
      minClusterSize: Math.min(...clusterSizes),
      clusteringEfficiency: efficiency,
    };
  }

  /**
   * Get render strategy recommendation
   */
  public getRenderStrategy(
    totalObjects: number,
    zoom: number
  ): "individual" | "clustered" | "hybrid" {
    if (zoom < this.config.minZoomForClustering) {
      return "individual"; // Too zoomed out, show individuals
    }
    
    if (zoom > this.config.maxZoomForClustering) {
      return "individual"; // Zoomed in enough, show all
    }

    // In clustering range
    if (totalObjects < 200) {
      return "individual"; // Few objects, no need to cluster
    } else if (totalObjects < 600) {
      return "hybrid"; // Moderate objects, cluster dense areas only
    } else {
      return "clustered"; // Many objects, cluster aggressively
    }
  }

  /**
   * Update configuration dynamically
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

  /**
   * Debug info for optimization
   */
  public getDebugInfo(zoom: number): string {
    return `
🎯 Clustering Configuration:
  Zoom: ${zoom.toFixed(1)}
  Should Cluster: ${this.shouldCluster(zoom)}
  Grid Size: ${this.getGridSize(zoom)}°
  Min Cluster Size: ${this.config.minClusterSize}
  Active Range: ${this.config.minZoomForClustering}-${this.config.maxZoomForClustering}
    `.trim();
  }
}

// Create singleton with YOUR calibrated settings
export const clusteringManager = new ClusteringManager({
  minZoomForClustering: ZOOM_CONFIG.THRESHOLDS.CLUSTERING_START,
  maxZoomForClustering: ZOOM_CONFIG.THRESHOLDS.CLUSTERING_END,
  gridSizeByZoom: ZOOM_CONFIG.CLUSTER_GRID_SIZES,
  minClusterSize: 3,
  maxClusterSize: 500,
});