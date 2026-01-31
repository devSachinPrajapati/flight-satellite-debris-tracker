import { useRef, useCallback, useEffect } from "react";
import * as maptilersdk from "@maptiler/sdk";
import type { Aircraft, SatelliteObject } from "../types";
import { lodManager } from "../utils/lodManager";
import { markerPool } from "../utils/markerPool";

export const useMarkerManager = (
  mapRef: React.MutableRefObject<maptilersdk.Map | null>,
  handleObjectSelect: (data: any) => void
) => {
  const activeMarkersRef = useRef<Map<string, any>>(new Map());
  const currentZoomRef = useRef<number>(1.5);
  const isUpdatingRef = useRef<boolean>(false);
  // const pendingRenderRef = useRef<any[]>([]);
  const renderFrameRef = useRef<number | null>(null);

  /**
   * ✅ FIXED: Get HARD LIMIT for total markers based on zoom
   */
  const getMarkerLimit = useCallback((zoom: number): number => {
    if (zoom < 1.5) return 50;
    if (zoom < 2.5) return 120;
    if (zoom < 3.5) return 250;
    if (zoom < 4.5) return 400;
    if (zoom < 5.5) return 600;
    if (zoom < 6.5) return 800;
    if (zoom < 7.5) return 1200;
    return 2000; // Max at high zoom
  }, []);

  /**
   * ✅ OPTIMIZED: Create/update marker with LOD and pooling
   */
  const createOrUpdateMarker = useCallback((
    id: string,
    lat: number,
    lng: number,
    type: 'aircraft' | 'satellite' | 'debris',
    data: Aircraft | SatelliteObject,
    zoom: number
  ) => {
    if (!mapRef.current) return;

    // 1. Get simplified version based on LOD
    const simplified = type === 'aircraft'
      ? lodManager.simplifyAircraft(data, zoom)
      : type === 'debris'
      ? lodManager.simplifyDebris(data, zoom)
      : lodManager.simplifySatellite(data, zoom);

    // ✅ NEW: Skip rendering at minimal LOD for distant objects
    if (simplified.lodLevel === 'minimal' && zoom < 2) {
      // At extreme zoom out, only render 1 in every 5 objects
      if (Math.random() > 0.2) {
        return; // Skip 80% of markers
      }
    }

    // 2. Check if marker already exists
    let existingMarker = activeMarkersRef.current.get(id);

    if (existingMarker) {
      // Update position
      existingMarker.marker.setLngLat([lng, lat]);
      
      // Only update appearance if LOD level actually changed
      if (existingMarker.lodLevel !== simplified.lodLevel) {
        markerPool.updateMarkerLOD(
          existingMarker.pooled,
          simplified,
          simplified.lodLevel
        );
        existingMarker.lodLevel = simplified.lodLevel;
      }
      
      return;
    }

    // 3. Acquire marker from pool
    const pooled = markerPool.acquire(type);
    pooled.id = id;

    // 4. Update marker appearance
    markerPool.updateMarkerLOD(pooled, simplified, simplified.lodLevel);

    // 5. Add click handler (use passive event listener)
    pooled.element.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleObjectSelect({ type, data });
    };

    // 6. Create MapTiler marker
    const marker = new maptilersdk.Marker({
      element: pooled.element,
      anchor: 'center',
    })
      .setLngLat([lng, lat])
      .addTo(mapRef.current);

    pooled.marker = marker;

    // 7. Store reference
    activeMarkersRef.current.set(id, {
      marker,
      pooled,
      type,
      lodLevel: simplified.lodLevel,
    });

  }, [mapRef, handleObjectSelect]);

  /**
   * ✅ FIXED: Remove invalid markers and return to pool
   */
  const removeInvalidMarkers = useCallback((validIds: Set<string>) => {
    const currentIds = Array.from(activeMarkersRef.current.keys());
    let removedCount = 0;
    
    currentIds.forEach((id) => {
      if (!validIds.has(id)) {
        const markerData = activeMarkersRef.current.get(id);
        
        if (markerData) {
          // Remove from map
          markerData.marker.remove();
          
          // Return to pool
          markerPool.release(markerData.pooled);
          
          // Remove from active markers
          activeMarkersRef.current.delete(id);
          removedCount++;
        }
      }
    });

    if (removedCount > 0) {
      console.log(`🗑️ Removed ${removedCount} stale markers`);
    }
  }, []);

  /**
   * ✅ OPTIMIZED: Update all markers when zoom changes (LOD update)
   * Only updates if LOD level actually changed
   */
  const updateMarkersForZoom = useCallback((newZoom: number) => {
    if (isUpdatingRef.current) return;
    
    const previousZoom = currentZoomRef.current;
    currentZoomRef.current = newZoom;

    // Check if LOD level changed (not just zoom value)
    if (!lodManager.needsUpdate(newZoom, previousZoom)) {
      return; // No LOD change, skip update
    }

    isUpdatingRef.current = true;

    const newLOD = lodManager.getLODLevel(newZoom);
    let updatedCount = 0;

    // Update all active markers
    activeMarkersRef.current.forEach((markerData, id) => {
      console.log(id);
      
      if (markerData.lodLevel !== newLOD) {
        // Get fresh simplified data
        let simplified;
        if (markerData.type === 'aircraft') {
          simplified = lodManager.simplifyAircraft(markerData.pooled.element.dataset, newZoom);
        } else if (markerData.type === 'debris') {
          simplified = lodManager.simplifyDebris(markerData.pooled.element.dataset, newZoom);
        } else {
          simplified = lodManager.simplifySatellite(markerData.pooled.element.dataset, newZoom);
        }
        
        markerPool.updateMarkerLOD(markerData.pooled, simplified, newLOD);
        markerData.lodLevel = newLOD;
        updatedCount++;
      }
    });

    console.log(`✨ Updated ${updatedCount} markers to LOD: ${newLOD}`);
    
    isUpdatingRef.current = false;
  }, []);

  /**
   * ✅ NEW: Progressive rendering using requestIdleCallback
   * Spreads marker creation across multiple frames to avoid blocking
   */
  const renderProgressively = useCallback((
    objects: Array<{
      id: string;
      lat: number;
      lng: number;
      type: 'aircraft' | 'satellite' | 'debris';
      data: Aircraft | SatelliteObject;
    }>,
    zoom: number,
    validIds: Set<string>
  ) => {
    // Cancel any pending render
    if (renderFrameRef.current) {
      cancelIdleCallback(renderFrameRef.current);
    }

    const BATCH_SIZE = 20; // Render 20 markers per frame
    let index = 0;

    const renderBatch = (deadline: IdleDeadline) => {
      // Render as many as we can in this frame (up to BATCH_SIZE)
      while (index < objects.length && deadline.timeRemaining() > 1) {
        const obj = objects[index];
        createOrUpdateMarker(obj.id, obj.lat, obj.lng, obj.type, obj.data, zoom);
        index++;

        // Stop after batch size even if we have time left
        if (index % BATCH_SIZE === 0) {
          break;
        }
      }

      // Schedule next batch if we have more to render
      if (index < objects.length) {
        renderFrameRef.current = requestIdleCallback(renderBatch, { timeout: 16 });
      } else {
        // All done - now remove stale markers
        removeInvalidMarkers(validIds);
        renderFrameRef.current = null;
        
        console.log(`✅ Progressive render complete: ${objects.length} objects in ${Math.ceil(objects.length / BATCH_SIZE)} batches`);
      }
    };

    // Start progressive rendering
    renderFrameRef.current = requestIdleCallback(renderBatch, { timeout: 16 });
  }, [createOrUpdateMarker, removeInvalidMarkers]);

  /**
   * ✅ FIXED: Batch process markers WITH HARD LIMIT ENFORCEMENT + PROGRESSIVE RENDERING
   */
  const processBatchedMarkers = useCallback((
    objects: Array<{
      id: string;
      lat: number;
      lng: number;
      type: 'aircraft' | 'satellite' | 'debris';
      data: Aircraft | SatelliteObject;
    }>,
    zoom: number
  ) => {
    const validIds = new Set<string>();
    
    // ✅ CRITICAL FIX: Enforce hard limit BEFORE processing
    const markerLimit = getMarkerLimit(zoom);
    const objectsToRender = objects.slice(0, markerLimit);
    
    if (objects.length > markerLimit) {
      console.log(`⚡ Hard limit: Rendering ${markerLimit}/${objects.length} objects at zoom ${zoom.toFixed(1)}`);
    }

    // Collect valid IDs
    objectsToRender.forEach(({ id }) => {
      validIds.add(id);
    });

    // ✅ NEW: Use progressive rendering for better performance
    if (objectsToRender.length > 50) {
      renderProgressively(objectsToRender, zoom, validIds);
    } else {
      // For small batches, render immediately
      objectsToRender.forEach(({ id, lat, lng, type, data }) => {
        createOrUpdateMarker(id, lat, lng, type, data, zoom);
      });
      removeInvalidMarkers(validIds);
    }

    // Update LOD if zoom changed (only if LOD level changed)
    updateMarkersForZoom(zoom);

  }, [createOrUpdateMarker, removeInvalidMarkers, updateMarkersForZoom, getMarkerLimit, renderProgressively]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up all markers');
      
      // Cancel pending renders
      if (renderFrameRef.current) {
        cancelIdleCallback(renderFrameRef.current);
      }

      activeMarkersRef.current.forEach(({ marker, pooled }) => {
        marker.remove();
        markerPool.release(pooled);
      });
      activeMarkersRef.current.clear();
    };
  }, []);

  /**
   * ✅ OPTIMIZED: Less frequent pool maintenance
   */
  useEffect(() => {
    const interval = setInterval(() => {
      // Only trim if pool is getting large
      const stats = markerPool.getStats();
      
      if (stats.available > 1000) {
        markerPool.trim(500);
        console.log(`✂️ Trimmed pool: ${stats.available} → 500 available`);
      }
      
      // Log stats less frequently
      if (stats.inUse > 0) {
        console.log(`📊 Pool: ${stats.inUse}/${stats.total} in use`);
      }
    }, 60000); // Every 60s (was 30s)

    return () => clearInterval(interval);
  }, []);

  return {
    processBatchedMarkers,
    updateMarkersForZoom,
    getPoolStats: () => markerPool.getStats(),
    getActiveMarkersCount: () => activeMarkersRef.current.size,
  };
};