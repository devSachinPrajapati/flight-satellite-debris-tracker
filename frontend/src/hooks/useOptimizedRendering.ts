/**
 * useOptimizedRendering.ts
 * 
 * Custom hook that combines viewport filtering and clustering for optimal performance.
 * Automatically switches between full rendering, viewport filtering, and clustering
 * based on zoom level and object count.
 * 
 * Performance Strategy:
 * - Zoom 0-3: Clustering (50,000 objects → ~100-500 clusters)
 * - Zoom 4-8: Viewport filtering + clustering (if needed)
 * - Zoom 9+: Full viewport filtering only
 */

import { useMemo, useEffect, useState } from "react";
import type { Aircraft, SatelliteObject } from "../types";
import { viewportManager } from "../utils/viewportManager";
import { clusteringManager, type ClusterPoint } from "../utils/clusteringManager";

export interface OptimizedRenderingResult {
  // Filtered data ready for rendering
  visibleAircraft: Aircraft[];
  visibleSatellites: SatelliteObject[];
  visibleDebris: SatelliteObject[];

  // Clusters (if clustering is active)
  aircraftClusters: ClusterPoint[];
  satelliteClusters: ClusterPoint[];
  debrisClusters: ClusterPoint[];

  // Rendering mode
  useClustering: boolean;
  useViewportFiltering: boolean;

  // Statistics
  stats: {
    totalObjects: number;
    renderedObjects: number;
    totalClusters: number;
    reductionPercent: number;
    currentZoom: number;
    renderMode: "full" | "viewport" | "clustered" | "viewport+clustered";
  };
}

export function useOptimizedRendering(
  aircraft: Aircraft[],
  satellites: SatelliteObject[],
  debris: SatelliteObject[],
  currentZoom: number
): OptimizedRenderingResult {
  const [forceUpdate, setForceUpdate] = useState(0);

  // Force re-calculation when viewport changes
  useEffect(() => {
    const interval = setInterval(() => {
      setForceUpdate((prev) => prev + 1);
    }, 200); // Update every 200ms during map movement

    return () => clearInterval(interval);
  }, []);

  const result = useMemo(() => {
    const totalObjects = aircraft.length + satellites.length + debris.length;
    const shouldCluster = clusteringManager.shouldCluster(currentZoom);
    const useViewportFiltering = currentZoom >= 4; // Always filter by viewport at zoom 4+

    let visibleAircraft: Aircraft[] = [];
    let visibleSatellites: SatelliteObject[] = [];
    let visibleDebris: SatelliteObject[] = [];

    let aircraftClusters: ClusterPoint[] = [];
    let satelliteClusters: ClusterPoint[] = [];
    let debrisClusters: ClusterPoint[] = [];

    let renderMode: "full" | "viewport" | "clustered" | "viewport+clustered" = "full";

    // STRATEGY 1: Low zoom (0-3) - Use clustering only
    if (shouldCluster && !useViewportFiltering) {
      aircraftClusters = clusteringManager.clusterAircraft(aircraft, currentZoom);
      satelliteClusters = clusteringManager.clusterSatellites(satellites, currentZoom);
      debrisClusters = clusteringManager.clusterDebris(debris, currentZoom);
      renderMode = "clustered";
    }
    // STRATEGY 2: Medium zoom (4-8) - Viewport filtering + optional clustering
    else if (shouldCluster && useViewportFiltering) {
      // First filter by viewport
      const viewportFiltered = {
        aircraft: viewportManager.filterAircraft(aircraft),
        satellites: viewportManager.filterSatellites(satellites),
        debris: viewportManager.filterDebris(debris),
      };

      // If still too many objects, cluster them
      const filteredCount =
        viewportFiltered.aircraft.length +
        viewportFiltered.satellites.length +
        viewportFiltered.debris.length;

      if (filteredCount > 2000) {
        aircraftClusters = clusteringManager.clusterAircraft(
          viewportFiltered.aircraft,
          currentZoom
        );
        satelliteClusters = clusteringManager.clusterSatellites(
          viewportFiltered.satellites,
          currentZoom
        );
        debrisClusters = clusteringManager.clusterDebris(
          viewportFiltered.debris,
          currentZoom
        );
        renderMode = "viewport+clustered";
      } else {
        visibleAircraft = viewportFiltered.aircraft;
        visibleSatellites = viewportFiltered.satellites;
        visibleDebris = viewportFiltered.debris;
        renderMode = "viewport";
      }
    }
    // STRATEGY 3: High zoom (9+) - Viewport filtering only
    else {
      visibleAircraft = viewportManager.filterAircraft(aircraft);
      visibleSatellites = viewportManager.filterSatellites(satellites);
      visibleDebris = viewportManager.filterDebris(debris);
      renderMode = "viewport";
    }

    // Calculate statistics
    const totalClusters =
      aircraftClusters.length + satelliteClusters.length + debrisClusters.length;

    const renderedObjects =
      renderMode.includes("clustered")
        ? totalClusters
        : visibleAircraft.length + visibleSatellites.length + visibleDebris.length;

    const reductionPercent =
      totalObjects > 0 ? ((totalObjects - renderedObjects) / totalObjects) * 100 : 0;

    return {
      visibleAircraft,
      visibleSatellites,
      visibleDebris,
      aircraftClusters,
      satelliteClusters,
      debrisClusters,
      useClustering: shouldCluster,
      useViewportFiltering,
      stats: {
        totalObjects,
        renderedObjects,
        totalClusters,
        reductionPercent,
        currentZoom,
        renderMode,
      },
    };
  }, [aircraft, satellites, debris, currentZoom, forceUpdate]);

  // Log performance stats periodically
  useEffect(() => {
    if (Math.random() < 0.1) {
      // Log 10% of the time
      console.log(`
🚀 Optimized Rendering Stats:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mode: ${result.stats.renderMode.toUpperCase()}
Zoom: ${result.stats.currentZoom.toFixed(1)}
Total Objects: ${result.stats.totalObjects.toLocaleString()}
Rendered: ${result.stats.renderedObjects.toLocaleString()}
Reduction: ${result.stats.reductionPercent.toFixed(1)}%
Clusters: ${result.stats.totalClusters}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    }
  }, [result.stats]);

  return result;
}

export default useOptimizedRendering;