// import { useRef, useCallback, useEffect } from "react";
// import * as maptilersdk from "@maptiler/sdk";
// import type { Aircraft, SatelliteObject } from "../types";

// interface MarkerQueueItem {
//   id: string;
//   lat: number;
//   lng: number;
//   color: string;
//   type: "aircraft" | "satellite" | "debris";
//   data: Aircraft | SatelliteObject;
// }

// export const useMarkerManager = (
//   mapRef: React.MutableRefObject<maptilersdk.Map | null>,
//   handleObjectSelect: (data: { type: "aircraft" | "satellite" | "debris"; data: Aircraft | SatelliteObject }) => void
// ) => {
//   const markersRef = useRef<Map<string, maptilersdk.Marker>>(new Map());
//   const markerBatchQueueRef = useRef<MarkerQueueItem[]>([]);
//   const isBatchProcessingRef = useRef(false);

//   // Create marker immediately
//   const createMarkerImmediate = useCallback((
//     id: string,
//     lat: number,
//     lng: number,
//     color: string,
//     type: "aircraft" | "satellite" | "debris",
//     data: Aircraft | SatelliteObject
//   ) => {
//     if (!mapRef.current) return;
//     if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;

//     const existingMarker = markersRef.current.get(id);
//     if (existingMarker) {
//       existingMarker.setLngLat([lng, lat]);
//       return;
//     }

//     const el = document.createElement("div");
//     const size = type === "debris" ? 16 : 24;
//     el.style.cssText = `
//       width: ${size}px;
//       height: ${size}px;
//       background-color: ${color};
//       border: 2px solid white;
//       border-radius: 50%;
//       cursor: pointer;
//       transition: transform 0.2s ease;
//       box-shadow: 0 2px 8px rgba(0,0,0,0.4);
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       font-size: ${type === "satellite" ? "10px" : "12px"};
//       pointer-events: auto;
//     `;
//     el.className = "custom-marker";

//     if (type === "aircraft") el.innerHTML = '<span style="pointer-events: none;">✈️</span>';
//     else if (type === "satellite") el.innerHTML = '<span style="pointer-events: none;">🛰️</span>';
//     else if (type === "debris") el.innerHTML = '<span style="pointer-events: none; font-size: 8px;">🔴</span>';

//     el.addEventListener("mouseenter", (e) => {
//       e.stopPropagation();
//       el.style.transform = "scale(1.3)";
//       el.style.zIndex = "1000";
//     });

//     el.addEventListener("mouseleave", (e) => {
//       e.stopPropagation();
//       el.style.transform = "scale(1)";
//       el.style.zIndex = "10";
//     });

//     el.addEventListener("mousedown", (e) => {
//       e.stopPropagation();
//       e.stopImmediatePropagation();
//     });

//     el.addEventListener("mouseup", (e) => {
//       e.stopPropagation();
//       e.stopImmediatePropagation();
//     });

//     el.addEventListener("click", (e) => {
//       e.preventDefault();
//       e.stopPropagation();
//       e.stopImmediatePropagation();
//       console.log(`🎯 Marker clicked: ${type} ${id}`);
//       handleObjectSelect({ type, data });
//     });

//     const marker = new maptilersdk.Marker({
//       element: el,
//       anchor: "center",
//       draggable: false,
//       offset: [0, 0]
//     })
//       .setLngLat([lng, lat])
//       .addTo(mapRef.current);

//     markersRef.current.set(id, marker);
//   }, [mapRef, handleObjectSelect]);

//   // Process batched markers
//   const processBatchedMarkers = useCallback(() => {
//     if (isBatchProcessingRef.current || markerBatchQueueRef.current.length === 0) {
//       return;
//     }

//     isBatchProcessingRef.current = true;
//     const BATCH_SIZE = 10;

//     const processNextBatch = () => {
//       const batch = markerBatchQueueRef.current.splice(0, BATCH_SIZE);

//       batch.forEach(({ id, lat, lng, color, type, data }) => {
//         createMarkerImmediate(id, lat, lng, color, type, data);
//       });

//       if (markerBatchQueueRef.current.length > 0) {
//         requestAnimationFrame(processNextBatch);
//       } else {
//         isBatchProcessingRef.current = false;
//       }
//     };

//     requestAnimationFrame(processNextBatch);
//   }, [createMarkerImmediate]);

//   // Queue marker for batch
//   const queueMarkerForBatch = useCallback((
//     id: string,
//     lat: number,
//     lng: number,
//     color: string,
//     type: "aircraft" | "satellite" | "debris",
//     data: Aircraft | SatelliteObject
//   ) => {
//     const existingMarker = markersRef.current.get(id);
//     if (existingMarker) {
//       existingMarker.setLngLat([lng, lat]);
//       return;
//     }

//     markerBatchQueueRef.current.push({ id, lat, lng, color, type, data });
//   }, []);

//   // Remove invalid markers
//   const removeInvalidMarkers = useCallback((validIds: Set<string>) => {
//     const currentIds = Array.from(markersRef.current.keys());
//     currentIds.forEach((id) => {
//       if (!validIds.has(id)) {
//         const marker = markersRef.current.get(id);
//         if (marker) {
//           marker.remove();
//           markersRef.current.delete(id);
//         }
//       }
//     });
//   }, []);

//   // Cleanup excess markers
//   const cleanupExcessMarkers = useCallback(() => {
//     const markerCount = markersRef.current.size;

//     if (markerCount > 1500) {
//       console.warn(`⚠️ Too many markers (${markerCount}), forcing cleanup...`);

//       markersRef.current.forEach((marker) => marker.remove());
//       markersRef.current.clear();

//       markerBatchQueueRef.current = [];
//       isBatchProcessingRef.current = false;

//       console.log('✅ Markers cleaned up');
//     }
//   }, []);

//   // Periodic cleanup
//   useEffect(() => {
//     const cleanupInterval = setInterval(() => {
//       cleanupExcessMarkers();
//     }, 10000);

//     return () => clearInterval(cleanupInterval);
//   }, [cleanupExcessMarkers]);

//   // Cleanup all markers on unmount
//   useEffect(() => {
//     return () => {
//       markersRef.current.forEach((marker) => marker.remove());
//       markersRef.current.clear();
//     };
//   }, []);

//   return {
//     markersRef,
//     queueMarkerForBatch,
//     removeInvalidMarkers,
//     processBatchedMarkers,
//   };
// };



// **********

/**
 * useMarkerManager - FIXED VERSION WITH CLUSTER SUPPORT
 */

import { useRef, useCallback, useEffect } from "react";
import * as maptilersdk from "@maptiler/sdk";
import type { Aircraft, SatelliteObject } from "../types";

interface MarkerQueueItem {
  id: string;
  lat: number;
  lng: number;
  color: string;
  type: "aircraft" | "satellite" | "debris";
  data: Aircraft | SatelliteObject;
}

interface ClusterQueueItem {
  id: string;
  lat: number;
  lng: number;
  count: number;
  type: "aircraft" | "satellite" | "debris" | "mixed";
}

export const useMarkerManager = (
  mapRef: React.MutableRefObject<maptilersdk.Map | null>,
  handleObjectSelect: (data: { type: "aircraft" | "satellite" | "debris"; data: Aircraft | SatelliteObject }) => void
) => {
  const markersRef = useRef<Map<string, maptilersdk.Marker>>(new Map());
  const markerBatchQueueRef = useRef<MarkerQueueItem[]>([]);
  const clusterBatchQueueRef = useRef<ClusterQueueItem[]>([]);
  const isBatchProcessingRef = useRef(false);

  // ========================================
  // CREATE INDIVIDUAL MARKER
  // ========================================
  const createMarkerImmediate = useCallback((
    id: string,
    lat: number,
    lng: number,
    color: string,
    type: "aircraft" | "satellite" | "debris",
    data: Aircraft | SatelliteObject
  ) => {
    if (!mapRef.current) return;
    if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;

    const existingMarker = markersRef.current.get(id);
    if (existingMarker) {
      existingMarker.setLngLat([lng, lat]);
      return;
    }

    const el = document.createElement("div");
    const size = type === "debris" ? 16 : 24;
    el.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      border: 2px solid white;
      border-radius: 50%;
      cursor: pointer;
      transition: transform 0.2s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${type === "satellite" ? "10px" : "12px"};
      pointer-events: auto;
    `;
    el.className = "custom-marker";

    if (type === "aircraft") el.innerHTML = '<span style="pointer-events: none;">✈️</span>';
    else if (type === "satellite") el.innerHTML = '<span style="pointer-events: none;">🛰️</span>';
    else if (type === "debris") el.innerHTML = '<span style="pointer-events: none; font-size: 8px;">🔴</span>';

    el.addEventListener("mouseenter", (e) => {
      e.stopPropagation();
      el.style.transform = "scale(1.3)";
      el.style.zIndex = "1000";
    });

    el.addEventListener("mouseleave", (e) => {
      e.stopPropagation();
      el.style.transform = "scale(1)";
      el.style.zIndex = "10";
    });

    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log(`🎯 Marker clicked: ${type} ${id}`);
      handleObjectSelect({ type, data });
    });

    const marker = new maptilersdk.Marker({
      element: el,
      anchor: "center",
      draggable: false,
      offset: [0, 0]
    })
      .setLngLat([lng, lat])
      .addTo(mapRef.current);

    markersRef.current.set(id, marker);
  }, [mapRef, handleObjectSelect]);

  // ========================================
  // CREATE CLUSTER MARKER (NEW!)
  // ========================================
  const createClusterImmediate = useCallback((
    id: string,
    lat: number,
    lng: number,
    count: number,
    type: "aircraft" | "satellite" | "debris" | "mixed"
  ) => {
    if (!mapRef.current) return;
    if (isNaN(lat) || isNaN(lng)) return;

    const existingMarker = markersRef.current.get(id);
    if (existingMarker) {
      existingMarker.setLngLat([lng, lat]);
      return;
    }

    // Choose color based on type
    let color = "#6b7280"; // gray for mixed
    if (type === "aircraft") color = "#3b82f6";
    else if (type === "satellite") color = "#10b981";
    else if (type === "debris") color = "#ef4444";

    // Calculate size based on count (20-60px)
    const size = Math.min(60, Math.max(20, 20 + Math.log10(count) * 10));

    const el = document.createElement("div");
    el.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${size > 40 ? "14px" : "12px"};
      font-weight: bold;
      color: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: transform 0.2s ease;
      pointer-events: auto;
    `;
    el.className = "cluster-marker";
    el.textContent = count.toString();

    el.addEventListener("mouseenter", () => {
      el.style.transform = "scale(1.2)";
      el.style.zIndex = "1000";
    });

    el.addEventListener("mouseleave", () => {
      el.style.transform = "scale(1)";
      el.style.zIndex = "10";
    });

    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Zoom into cluster
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [lng, lat],
          zoom: mapRef.current.getZoom() + 2,
          duration: 1000
        });
      }
    });

    const marker = new maptilersdk.Marker({
      element: el,
      anchor: "center",
      draggable: false,
      offset: [0, 0]
    })
      .setLngLat([lng, lat])
      .addTo(mapRef.current);

    markersRef.current.set(id, marker);
  }, [mapRef]);

  // ========================================
  // BATCH PROCESSING
  // ========================================
  const processBatchedMarkers = useCallback(() => {
    if (isBatchProcessingRef.current) return;
    
    const totalItems = markerBatchQueueRef.current.length + clusterBatchQueueRef.current.length;
    if (totalItems === 0) return;

    isBatchProcessingRef.current = true;
    const BATCH_SIZE = 10;

    const processNextBatch = () => {
      // Process clusters first (they're more important at low zoom)
      const clusterBatch = clusterBatchQueueRef.current.splice(0, BATCH_SIZE);
      clusterBatch.forEach(({ id, lat, lng, count, type }) => {
        createClusterImmediate(id, lat, lng, count, type);
      });

      // Then process individual markers
      const markerBatch = markerBatchQueueRef.current.splice(0, BATCH_SIZE);
      markerBatch.forEach(({ id, lat, lng, color, type, data }) => {
        createMarkerImmediate(id, lat, lng, color, type, data);
      });

      if (markerBatchQueueRef.current.length > 0 || clusterBatchQueueRef.current.length > 0) {
        requestAnimationFrame(processNextBatch);
      } else {
        isBatchProcessingRef.current = false;
      }
    };

    requestAnimationFrame(processNextBatch);
  }, [createMarkerImmediate, createClusterImmediate]);

  // Queue marker
  const queueMarkerForBatch = useCallback((
    id: string,
    lat: number,
    lng: number,
    color: string,
    type: "aircraft" | "satellite" | "debris",
    data: Aircraft | SatelliteObject
  ) => {
    const existingMarker = markersRef.current.get(id);
    if (existingMarker) {
      existingMarker.setLngLat([lng, lat]);
      return;
    }

    markerBatchQueueRef.current.push({ id, lat, lng, color, type, data });
  }, []);

  // Queue cluster (NEW!)
  const queueClusterForBatch = useCallback((
    id: string,
    lat: number,
    lng: number,
    count: number,
    type: "aircraft" | "satellite" | "debris" | "mixed"
  ) => {
    const existingMarker = markersRef.current.get(id);
    if (existingMarker) {
      existingMarker.setLngLat([lng, lat]);
      return;
    }

    clusterBatchQueueRef.current.push({ id, lat, lng, count, type });
  }, []);

  // Remove invalid markers
  const removeInvalidMarkers = useCallback((validIds: Set<string>) => {
    const currentIds = Array.from(markersRef.current.keys());
    currentIds.forEach((id) => {
      if (!validIds.has(id)) {
        const marker = markersRef.current.get(id);
        if (marker) {
          marker.remove();
          markersRef.current.delete(id);
        }
      }
    });
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
    };
  }, []);

  return {
    markersRef,
    queueMarkerForBatch,
    queueClusterForBatch,
    removeInvalidMarkers,
    processBatchedMarkers,
  };
};