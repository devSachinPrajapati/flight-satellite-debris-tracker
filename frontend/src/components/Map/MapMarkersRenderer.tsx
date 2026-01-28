// import { useEffect } from "react";
// import type { Aircraft, SatelliteObject } from "../../types";

// interface MapMarkersRendererProps {
//   isMapLoaded: boolean;
//   isZooming: boolean;
//   viewMode: "all" | "aircraft" | "satellite" | "debris";
//   filteredByViewport: {
//     aircraft: Aircraft[];
//     satellites: SatelliteObject[];
//     debris: SatelliteObject[];
//   };
//   queueMarkerForBatch: (
//     id: string,
//     lat: number,
//     lng: number,
//     color: string,
//     type: "aircraft" | "satellite" | "debris",
//     data: Aircraft | SatelliteObject
//   ) => void;
//   removeInvalidMarkers: (validIds: Set<string>) => void;
//   processBatchedMarkers: () => void;
// }

// const MapMarkersRenderer: React.FC<MapMarkersRendererProps> = ({
//   isMapLoaded,
//   isZooming,
//   viewMode,
//   filteredByViewport,
//   queueMarkerForBatch,
//   removeInvalidMarkers,
//   processBatchedMarkers,
// }) => {
//   useEffect(() => {
//     if (!isMapLoaded) return;

//     // Skip updates during zoom to prevent thrashing
//     if (isZooming) {
//       console.log('⏭️ Skipping marker update during zoom');
//       return;
//     }

//     const validIds = new Set<string>();

//     // Queue all markers
//     if (viewMode === "all" || viewMode === "aircraft") {
//       filteredByViewport.aircraft.forEach((ac: Aircraft) => {
//         const id = `aircraft-${ac.hex}`;
//         validIds.add(id);
//         queueMarkerForBatch(id, ac.lat, ac.lng, "#3b82f6", "aircraft", ac);
//       });
//     }

//     if (viewMode === "all" || viewMode === "satellite") {
//       filteredByViewport.satellites.forEach((sat: SatelliteObject) => {
//         const id = `satellite-${sat.norad_id}`;
//         validIds.add(id);
//         queueMarkerForBatch(id, sat.lat, sat.lng, "#10b981", "satellite", sat);
//       });
//     }

//     if (viewMode === "all" || viewMode === "debris") {
//       filteredByViewport.debris.forEach((deb: SatelliteObject) => {
//         const id = `debris-${deb.norad_id}`;
//         validIds.add(id);
//         queueMarkerForBatch(id, deb.lat, deb.lng, "#ef4444", "debris", deb);
//       });
//     }

//     removeInvalidMarkers(validIds);
//     processBatchedMarkers();
//   }, [
//     filteredByViewport,
//     viewMode,
//     isMapLoaded,
//     isZooming,
//     queueMarkerForBatch,
//     removeInvalidMarkers,
//     processBatchedMarkers,
//   ]);

//   return null; // This component doesn't render anything
// };

// export default MapMarkersRenderer;


/**
 * MapMarkersRenderer - FIXED VERSION WITH CLUSTERING
 * 
 * This component now properly uses:
 * 1. Clustering at low zoom (< 4)
 * 2. Viewport filtering at high zoom (>= 4)
 */

// *************************************************

import { useEffect } from "react";
import type { Aircraft, SatelliteObject } from "../../types";
import { clusteringManager } from "../../utils/clusteringManager";

interface MapMarkersRendererProps {
  isMapLoaded: boolean;
  isZooming: boolean;
  viewMode: "all" | "aircraft" | "satellite" | "debris";
  currentZoom: number;
  filteredByViewport: {
    aircraft: Aircraft[];
    satellites: SatelliteObject[];
    debris: SatelliteObject[];
  };
  queueMarkerForBatch: (
    id: string,
    lat: number,
    lng: number,
    color: string,
    type: "aircraft" | "satellite" | "debris",
    data: Aircraft | SatelliteObject
  ) => void;
  queueClusterForBatch: (
    id: string,
    lat: number,
    lng: number,
    count: number,
    type: "aircraft" | "satellite" | "debris" | "mixed"
  ) => void;
  removeInvalidMarkers: (validIds: Set<string>) => void;
  processBatchedMarkers: () => void;
}

const MapMarkersRenderer: React.FC<MapMarkersRendererProps> = ({
  isMapLoaded,
  isZooming,
  viewMode,
  currentZoom,
  filteredByViewport,
  queueMarkerForBatch,
  queueClusterForBatch,
  removeInvalidMarkers,
  processBatchedMarkers,
}) => {
  useEffect(() => {
    if (!isMapLoaded) return;

    // Skip updates during zoom to prevent thrashing
    if (isZooming) {
      console.log('⏭️ Skipping marker update during zoom');
      return;
    }

    const validIds = new Set<string>();
    // const shouldCluster = clusteringManager.shouldCluster(currentZoom);
    const shouldCluster = false; // TEMP DISABLE CLUSTERING FOR TESTING

    console.log(`🎯 Rendering mode: ${shouldCluster ? 'CLUSTERED' : 'INDIVIDUAL'} (zoom: ${currentZoom.toFixed(1.5)})`);

    // ========================================
    // CLUSTERING MODE (zoom < 4)
    // ========================================
    if (shouldCluster) {
      console.log(`📦 Clustering ${filteredByViewport.aircraft.length} aircraft, ${filteredByViewport.satellites.length} satellites, ${filteredByViewport.debris.length} debris`);

      // Cluster aircraft
      if (viewMode === "all" || viewMode === "aircraft") {
        const aircraftClusters = clusteringManager.clusterAircraft(
          filteredByViewport.aircraft,
          currentZoom
        );

        aircraftClusters.forEach((cluster) => {
          // ✅ FIX: Validate cluster has valid coordinates
          if (!cluster || typeof cluster.lat !== 'number' || typeof cluster.lng !== 'number') {
            console.warn('⚠️ Invalid aircraft cluster:', cluster);
            return;
          }

          const id = `cluster-aircraft-${cluster.lat.toFixed(2)}-${cluster.lng.toFixed(2)}`;
          validIds.add(id);
          queueClusterForBatch(
            id,
            cluster.lat,
            cluster.lng,
            cluster.count,
            cluster.type
          );
        });

        console.log(`✅ Created ${aircraftClusters.length} aircraft clusters`);
      }

      // Cluster satellites
      if (viewMode === "all" || viewMode === "satellite") {
        const satelliteClusters = clusteringManager.clusterSatellites(
          filteredByViewport.satellites,
          currentZoom
        );

        satelliteClusters.forEach((cluster) => {
          // ✅ FIX: Validate cluster has valid coordinates
          if (!cluster || typeof cluster.lat !== 'number' || typeof cluster.lng !== 'number') {
            console.warn('⚠️ Invalid satellite cluster:', cluster);
            return;
          }

          const id = `cluster-satellite-${cluster.lat.toFixed(2)}-${cluster.lng.toFixed(2)}`;
          validIds.add(id);
          queueClusterForBatch(
            id,
            cluster.lat,
            cluster.lng,
            cluster.count,
            cluster.type
          );
        });

        console.log(`✅ Created ${satelliteClusters.length} satellite clusters`);
      }

      // Cluster debris
      if (viewMode === "all" || viewMode === "debris") {
        const debrisClusters = clusteringManager.clusterDebris(
          filteredByViewport.debris,
          currentZoom
        );

        debrisClusters.forEach((cluster) => {
          // ✅ FIX: Validate cluster has valid coordinates
          if (!cluster || typeof cluster.lat !== 'number' || typeof cluster.lng !== 'number') {
            console.warn('⚠️ Invalid debris cluster:', cluster);
            return;
          }

          const id = `cluster-debris-${cluster.lat.toFixed(2)}-${cluster.lng.toFixed(2)}`;
          validIds.add(id);
          queueClusterForBatch(
            id,
            cluster.lat,
            cluster.lng,
            cluster.count,
            cluster.type
          );
        });

        console.log(`✅ Created ${debrisClusters.length} debris clusters`);
      }
    }
    // ========================================
    // INDIVIDUAL MODE (zoom >= 4)
    // ========================================
    else {
      console.log(`📍 Rendering individual markers (zoom: ${currentZoom.toFixed(1)})`);

      // Render individual aircraft
      if (viewMode === "all" || viewMode === "aircraft") {
        filteredByViewport.aircraft.forEach((ac: Aircraft) => {
          const id = `aircraft-${ac.hex}`;
          validIds.add(id);
          queueMarkerForBatch(id, ac.lat, ac.lng, "#3b82f6", "aircraft", ac);
        });
      }

      // Render individual satellites
      if (viewMode === "all" || viewMode === "satellite") {
        filteredByViewport.satellites.forEach((sat: SatelliteObject) => {
          const id = `satellite-${sat.norad_id}`;
          validIds.add(id);
          queueMarkerForBatch(id, sat.lat, sat.lng, "#10b981", "satellite", sat);
        });
      }

      // Render individual debris
      if (viewMode === "all" || viewMode === "debris") {
        filteredByViewport.debris.forEach((deb: SatelliteObject) => {
          const id = `debris-${deb.norad_id}`;
          validIds.add(id);
          queueMarkerForBatch(id, deb.lat, deb.lng, "#ef4444", "debris", deb);
        });
      }

      console.log(`✅ Queued ${validIds.size} individual markers`);
    }

    // Remove old markers/clusters
    removeInvalidMarkers(validIds);
    
    // Process batch
    processBatchedMarkers();

    // Log final stats
    console.log(`📊 Final: ${validIds.size} ${shouldCluster ? 'clusters' : 'markers'} rendered`);
  }, [
    filteredByViewport,
    viewMode,
    currentZoom,
    isMapLoaded,
    isZooming,
    queueMarkerForBatch,
    queueClusterForBatch,
    removeInvalidMarkers,
    processBatchedMarkers,
  ]);

  return null; // This component doesn't render anything
};

export default MapMarkersRenderer;