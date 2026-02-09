/* 
 * FIXED: Progressive Rendering with Smart Updates
 * 
 * Changes:
 * 1. Tracks object signatures to detect actual changes
 * 2. Allows batch completion before restarting
 * 3. Implements delta updates for position changes
 * 4. Debounces rapid updates
 */

import { useRef, useCallback, useEffect } from "react";
import * as maptilersdk from "@maptiler/sdk";
import type { Aircraft, SatelliteObject } from "../types";
import { lodManager } from "../utils/lodManager";
import { markerPool } from "../utils/markerPool";
import {
  getViewportBounds,
  filterByViewport,
  prioritizeByProximity,
  type ViewportBounds,
} from "../utils/viewportUtils";

export const useMarkerManager = (
  mapRef: React.MutableRefObject<maptilersdk.Map | null>,
  handleObjectSelect: (data: any) => void
) => {
  const activeMarkersRef = useRef<Map<string, any>>(new Map());
  const currentZoomRef = useRef<number>(1.5);
  const currentBoundsRef = useRef<ViewportBounds | null>(null);
  const isUpdatingRef = useRef<boolean>(false);
  const renderFrameRef = useRef<number | null>(null);

  // ✅ NEW: Track rendering state
  const renderStateRef = useRef({
    isRendering: false,
    currentBatchIndex: 0,
    totalBatches: 0,
    lastObjectSignature: '',
    lastUpdateTime: 0,
    pendingUpdate: null as any,
  });

  /**
   * ✅ FIXED: Generate signature with reduced position precision
   * Uses 2 decimal places (~1.1km precision) to avoid triggering on micro-movements
   */
  const getObjectSignature = useCallback((objects: Array<{ id: string; lat: number; lng: number }>) => {
    // Sort IDs for consistent comparison
    const ids = objects.map(obj => obj.id).sort().join(',');
    
    // ✅ CRITICAL FIX: Use 2 decimal places instead of 3
    // This ignores micro-movements (<1.1km)
    // 3 decimals = 111m precision (too sensitive, triggers on GPS jitter)
    // 2 decimals = 1.1km precision (perfect for actual movement detection)
    const positions = objects
      .map(obj => `${obj.lat.toFixed(2)},${obj.lng.toFixed(2)}`)
      .join('|');
    
    return `${ids}::${positions}`;
  }, []);

  /**
   * ✅ ENHANCED: Check if objects changed significantly with threshold
   */
  const hasSignificantChange = useCallback((newSignature: string): boolean => {
    const oldSignature = renderStateRef.current.lastObjectSignature;
    
    if (!oldSignature) return true; // First render
    
    // Split signature into IDs and positions
    const [oldIds, oldPositions] = oldSignature.split('::');
    const [newIds, newPositions] = newSignature.split('::');
    
    // ✅ CRITICAL: Check if object IDs changed
    if (oldIds !== newIds) {
      const oldIdArray = oldIds.split(',').filter(Boolean);
      const newIdArray = newIds.split(',').filter(Boolean);
      
      // Count how many objects added/removed
      const addedCount = newIdArray.filter(id => !oldIdArray.includes(id)).length;
      const removedCount = oldIdArray.filter(id => !newIdArray.includes(id)).length;
      
      // Only significant if >5% of objects changed
      const totalObjects = Math.max(oldIdArray.length, newIdArray.length);
      const changePercent = totalObjects > 0 
        ? ((addedCount + removedCount) / totalObjects) * 100 
        : 0;
      
      if (changePercent > 5) {
        console.log(`🔄 Significant change: ${changePercent.toFixed(1)}% of objects changed (+${addedCount} -${removedCount})`);
        return true;
      } else {
        console.log(`⚡ Minor change: ${changePercent.toFixed(1)}% - using delta update`);
        return false;
      }
    }
    
    // ✅ ENHANCED: Check if positions changed significantly
    if (oldPositions !== newPositions) {
      // Positions changed, but IDs same = just movement
      // This is handled by delta update (not significant)
      return false;
    }
    
    // No changes at all
    return false;
  }, []);

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
    return 2000;
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

    const simplified = type === 'aircraft'
      ? lodManager.simplifyAircraft(data, zoom)
      : type === 'debris'
        ? lodManager.simplifyDebris(data, zoom)
        : lodManager.simplifySatellite(data, zoom);

    if (simplified.lodLevel === 'minimal' && zoom < 2) {
      if (Math.random() > 0.2) return;
    }

    let existingMarker = activeMarkersRef.current.get(id);

    if (existingMarker) {
      // ✅ OPTIMIZATION: Just update position, don't recreate
      existingMarker.marker.setLngLat([lng, lat]);

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

    const pooled = markerPool.acquire(type);
    pooled.id = id;

    markerPool.updateMarkerLOD(pooled, simplified, simplified.lodLevel);

    pooled.element.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleObjectSelect({ type, data });
    };

    const marker = new maptilersdk.Marker({
      element: pooled.element,
      anchor: 'center',
    })
      .setLngLat([lng, lat])
      .addTo(mapRef.current);

    pooled.marker = marker;

    activeMarkersRef.current.set(id, {
      marker,
      pooled,
      type,
      lodLevel: simplified.lodLevel,
      lat,
      lng,
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
          markerData.marker.remove();
          markerPool.release(markerData.pooled);
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
   * ✅ OPTIMIZED: Update all markers when zoom changes
   */
  const updateMarkersForZoom = useCallback((newZoom: number) => {
    if (isUpdatingRef.current) return;

    const previousZoom = currentZoomRef.current;
    currentZoomRef.current = newZoom;

    if (!lodManager.needsUpdate(newZoom, previousZoom)) {
      return;
    }

    isUpdatingRef.current = true;

    const newLOD = lodManager.getLODLevel(newZoom);
    let updatedCount = 0;

    activeMarkersRef.current.forEach((markerData, id) => {
      console.log(id);

      if (markerData.lodLevel !== newLOD) {
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
   * ✅ NEW: Delta update for existing markers (position changes only)
   * Much faster than full progressive render
   */
  const updateExistingMarkers = useCallback((
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
    let updatedCount = 0;
    let createdCount = 0;

    objects.forEach(({ id, lat, lng, type, data }) => {
      validIds.add(id);
      
      const existingMarker = activeMarkersRef.current.get(id);
      
      if (existingMarker) {
        // ✅ Just update position
        existingMarker.marker.setLngLat([lng, lat]);
        existingMarker.lat = lat;
        existingMarker.lng = lng;
        updatedCount++;
      } else {
        // ✅ Create new marker immediately (not in batch)
        createOrUpdateMarker(id, lat, lng, type, data, zoom);
        createdCount++;
      }
    });

    // Remove markers that no longer exist
    removeInvalidMarkers(validIds);

    console.log(`⚡ Delta update: ${updatedCount} updated, ${createdCount} created`);
  }, [createOrUpdateMarker, removeInvalidMarkers]);

  /**
   * ✅ FIXED: Progressive rendering with completion tracking
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
    // ✅ Mark as rendering
    renderStateRef.current.isRendering = true;
    renderStateRef.current.currentBatchIndex = 0;
    
    const BATCH_SIZE = 20;
    let index = 0;
    const totalBatches = Math.ceil(objects.length / BATCH_SIZE);
    renderStateRef.current.totalBatches = totalBatches;

    // Cancel any pending render
    if (renderFrameRef.current) {
      cancelIdleCallback(renderFrameRef.current);
    }

    // Clean up BEFORE rendering new batch
    if (index === 0) {
      removeInvalidMarkers(validIds);
    }

    const renderBatch = (deadline: IdleDeadline) => {
      // Render as many as we can in this frame
      while (index < objects.length && deadline.timeRemaining() > 1) {
        const obj = objects[index];
        createOrUpdateMarker(obj.id, obj.lat, obj.lng, obj.type, obj.data, zoom);
        index++;

        if (index % BATCH_SIZE === 0) {
          renderStateRef.current.currentBatchIndex++;
          break;
        }
      }

      // Schedule next batch if we have more to render
      if (index < objects.length) {
        // ✅ Check if a new update is pending
        const now = Date.now();
        if (renderStateRef.current.pendingUpdate && 
            now - renderStateRef.current.lastUpdateTime > 100) {
          // New update waited patiently, pause and let it take over
          console.log(`⏸️ Pausing progressive render at batch ${renderStateRef.current.currentBatchIndex}/${totalBatches} for new update`);
          renderStateRef.current.isRendering = false;
          
          // Process pending update
          const pending = renderStateRef.current.pendingUpdate;
          renderStateRef.current.pendingUpdate = null;
          processBatchedMarkers(pending.objects, pending.zoom);
          return;
        }
        
        renderFrameRef.current = requestIdleCallback(renderBatch, { timeout: 16 });
      } else {
        // ✅ Rendering complete
        const currentMarkers = new Set(activeMarkersRef.current.keys());
        const orphaned = [...currentMarkers].filter(id => !validIds.has(id));
        orphaned.forEach(id => {
          const markerData = activeMarkersRef.current.get(id);
          if (markerData) {
            markerData.marker.remove();
            markerPool.release(markerData.pooled);
            activeMarkersRef.current.delete(id);
          }
        });
        
        renderStateRef.current.isRendering = false;
        console.log(`✅ Progressive render complete: ${objects.length} objects in ${totalBatches} batches`);
      }
    };

    // Start progressive rendering
    renderFrameRef.current = requestIdleCallback(renderBatch, { timeout: 16 });
  }, [createOrUpdateMarker, removeInvalidMarkers]);

  /**
   * ✅ CRITICAL FIX: Smart batched marker processing
   * Detects type of update and chooses optimal strategy
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
    const bounds = getViewportBounds(mapRef.current);
    
    if (!bounds) {
      console.warn('⚠️ Could not get viewport bounds, skipping render');
      return;
    }

    currentBoundsRef.current = bounds;

    // ✅ Filter to visible objects
    const visibleObjects = filterByViewport(objects, bounds, true);
    
    const culledCount = objects.length - visibleObjects.length;
    if (culledCount > 0) {
      console.log(`✂️ Viewport culling: ${visibleObjects.length}/${objects.length} visible`);
    }

    // ✅ Apply hard limit
    const markerLimit = getMarkerLimit(zoom);
    let objectsToRender = visibleObjects;

    if (visibleObjects.length > markerLimit) {
      objectsToRender = prioritizeByProximity(visibleObjects, bounds, markerLimit);
      console.log(`⚡ Rendering ${markerLimit}/${visibleObjects.length} closest objects`);
    }

    // ✅ Generate signature
    const newSignature = getObjectSignature(objectsToRender);
    const now = Date.now();

    // ✅ DECISION TREE: Choose rendering strategy

    // Strategy 1: Progressive render is already running
    if (renderStateRef.current.isRendering) {
      const timeSinceLastUpdate = now - renderStateRef.current.lastUpdateTime;
      
      // If update is very recent (< 100ms), ignore it (debounce)
      if (timeSinceLastUpdate < 100) {
        console.log('⏭️ Skipping update (debounce)');
        return;
      }
      
      // If objects didn't change significantly, just store as pending
      if (!hasSignificantChange(newSignature)) {
        console.log(`⏳ Progressive render in progress (batch ${renderStateRef.current.currentBatchIndex}/${renderStateRef.current.totalBatches}), queuing position update`);
        renderStateRef.current.pendingUpdate = { objects: objectsToRender, zoom };
        renderStateRef.current.lastUpdateTime = now;
        return;
      }
      
      // Objects changed significantly, stop current render
      console.log('🛑 Stopping progressive render - significant object change detected');
      if (renderFrameRef.current) {
        cancelIdleCallback(renderFrameRef.current);
        renderFrameRef.current = null;
      }
      renderStateRef.current.isRendering = false;
    }

    // Strategy 2: Only positions changed (delta update - FAST)
    if (!hasSignificantChange(newSignature) && renderStateRef.current.lastObjectSignature) {
      console.log('⚡ Delta update (positions only)');
      updateExistingMarkers(objectsToRender, zoom);
      renderStateRef.current.lastUpdateTime = now;
      return;
    }

    // Strategy 3: Significant change - full progressive render
    console.log('🔄 Full progressive render (object list changed)');
    renderStateRef.current.lastObjectSignature = newSignature;
    renderStateRef.current.lastUpdateTime = now;
    
    const validIds = new Set<string>();
    objectsToRender.forEach(({ id }) => validIds.add(id));

    if (objectsToRender.length > 50) {
      renderProgressively(objectsToRender, zoom, validIds);
    } else {
      // Small batch - render immediately
      objectsToRender.forEach(({ id, lat, lng, type, data }) => {
        createOrUpdateMarker(id, lat, lng, type, data, zoom);
      });
      removeInvalidMarkers(validIds);
      renderStateRef.current.lastObjectSignature = newSignature;
    }

    updateMarkersForZoom(zoom);

  }, [
    mapRef,
    createOrUpdateMarker,
    removeInvalidMarkers,
    updateMarkersForZoom,
    getMarkerLimit,
    renderProgressively,
    getObjectSignature,
    hasSignificantChange,
    updateExistingMarkers,
  ]);

  /**
   * Handle viewport changes
   */
  const handleViewportChange = useCallback(() => {
    const bounds = getViewportBounds(mapRef.current);
    
    if (!bounds || !currentBoundsRef.current) {
      return;
    }

    const latDelta = Math.abs(bounds.north - currentBoundsRef.current.north);
    const lngDelta = Math.abs(bounds.east - currentBoundsRef.current.east);
    const threshold = 0.1;

    const latRange = bounds.north - bounds.south;
    const lngRange = bounds.east - bounds.west;

    if (latDelta > latRange * threshold || lngDelta > lngRange * threshold) {
      console.log('📍 Viewport moved significantly');
    }
  }, [mapRef]);

  /**
   * Track map move events
   */
  useEffect(() => {
    if (!mapRef.current) return;

    const handleMoveEnd = () => {
      handleViewportChange();
    };

    mapRef.current.on('moveend', handleMoveEnd);

    return () => {
      if (mapRef.current) {
        mapRef.current.off('moveend', handleMoveEnd);
      }
    };
  }, [mapRef, handleViewportChange]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up all markers');

      if (renderFrameRef.current) {
        cancelIdleCallback(renderFrameRef.current);
      }

      activeMarkersRef.current.forEach(({ marker, pooled }) => {
        marker.remove();
        markerPool.release(pooled);
      });
      activeMarkersRef.current.clear();
      
      // ✅ Reset render state
      renderStateRef.current = {
        isRendering: false,
        currentBatchIndex: 0,
        totalBatches: 0,
        lastObjectSignature: '',
        lastUpdateTime: 0,
        pendingUpdate: null,
      };
    };
  }, []);

  /**
   * Pool maintenance
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = markerPool.getStats();

      if (stats.available > 1000) {
        markerPool.trim(500);
        console.log(`✂️ Trimmed pool: ${stats.available} → 500 available`);
      }

      if (stats.inUse > 0) {
        console.log(`📊 Pool: ${stats.inUse}/${stats.total} in use | Rendering: ${renderStateRef.current.isRendering ? `Batch ${renderStateRef.current.currentBatchIndex}/${renderStateRef.current.totalBatches}` : 'Idle'}`);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return {
    processBatchedMarkers,
    updateMarkersForZoom,
    getPoolStats: () => markerPool.getStats(),
    getActiveMarkersCount: () => activeMarkersRef.current.size,
    getCurrentBounds: () => currentBoundsRef.current,
    // ✅ NEW: Expose render state for debugging
    getRenderState: () => ({
      isRendering: renderStateRef.current.isRendering,
      currentBatch: renderStateRef.current.currentBatchIndex,
      totalBatches: renderStateRef.current.totalBatches,
    }),
  };
};