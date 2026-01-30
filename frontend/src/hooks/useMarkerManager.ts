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

export const useMarkerManager = (
  mapRef: React.MutableRefObject<maptilersdk.Map | null>,
  handleObjectSelect: (data: { type: "aircraft" | "satellite" | "debris"; data: Aircraft | SatelliteObject }) => void
) => {
  const markersRef = useRef<Map<string, maptilersdk.Marker>>(new Map());
  const markerBatchQueueRef = useRef<MarkerQueueItem[]>([]);
  const isBatchProcessingRef = useRef(false);

  // Create marker immediately
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

    el.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
    });

    el.addEventListener("mouseup", (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
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

  // Process batched markers
  const processBatchedMarkers = useCallback(() => {
    if (isBatchProcessingRef.current || markerBatchQueueRef.current.length === 0) {
      return;
    }

    isBatchProcessingRef.current = true;
    const BATCH_SIZE = 10;

    const processNextBatch = () => {
      const batch = markerBatchQueueRef.current.splice(0, BATCH_SIZE);

      batch.forEach(({ id, lat, lng, color, type, data }) => {
        createMarkerImmediate(id, lat, lng, color, type, data);
      });

      if (markerBatchQueueRef.current.length > 0) {
        requestAnimationFrame(processNextBatch);
      } else {
        isBatchProcessingRef.current = false;
      }
    };

    requestAnimationFrame(processNextBatch);
  }, [createMarkerImmediate]);

  // Queue marker for batch
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

  // Cleanup excess markers
  const cleanupExcessMarkers = useCallback(() => {
    const markerCount = markersRef.current.size;

    if (markerCount > 1500) {
      console.warn(`⚠️ Too many markers (${markerCount}), forcing cleanup...`);

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();

      markerBatchQueueRef.current = [];
      isBatchProcessingRef.current = false;

      console.log('✅ Markers cleaned up');
    }
  }, []);

  // Periodic cleanup
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      cleanupExcessMarkers();
    }, 10000);

    return () => clearInterval(cleanupInterval);
  }, [cleanupExcessMarkers]);

  // Cleanup all markers on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
    };
  }, []);

  return {
    markersRef,
    queueMarkerForBatch,
    removeInvalidMarkers,
    processBatchedMarkers,
  };
}