/**
 * LOD-Optimized Markers Renderer Component
 */

import { useEffect } from 'react';
import type { Aircraft, SatelliteObject } from '../../types';
import { useLODRenderer } from '../../hooks/useLODRenderer';

interface LODMarkersRendererProps {
  isMapLoaded: boolean;
  currentZoom: number;
  isZooming: boolean;
  viewMode: 'all' | 'aircraft' | 'satellite' | 'debris';
  filteredByViewport: {
    aircraft: Aircraft[];
    satellites: SatelliteObject[];
    debris: SatelliteObject[];
  };
  mapRef: React.MutableRefObject<any>;
}

export default function LODMarkersRenderer({
  isMapLoaded,
  currentZoom,
  isZooming,
  viewMode,
  filteredByViewport,
  mapRef
}: LODMarkersRendererProps) {
  const { queueMarker, processQueue, clearOutsideViewport, getStats } = useLODRenderer(
    mapRef,
    currentZoom,
    isZooming
  );

  useEffect(() => {
    if (!isMapLoaded || isZooming) return;

    const validIds = new Set<string>();

    // Queue aircraft
    if (viewMode === 'all' || viewMode === 'aircraft') {
      filteredByViewport.aircraft.forEach((ac: Aircraft) => {
        const id = `aircraft-${ac.hex}`;
        validIds.add(id);
        queueMarker(id, ac, 'aircraft', ac.lat, ac.lng);
      });
    }

    // Queue satellites
    if (viewMode === 'all' || viewMode === 'satellite') {
      filteredByViewport.satellites.forEach((sat: SatelliteObject) => {
        const id = `satellite-${sat.norad_id}`;
        validIds.add(id);
        queueMarker(id, sat, 'satellite', sat.lat, sat.lng);
      });
    }

    // Queue debris
    if (viewMode === 'all' || viewMode === 'debris') {
      filteredByViewport.debris.forEach((deb: SatelliteObject) => {
        const id = `debris-${deb.norad_id}`;
        validIds.add(id);
        queueMarker(id, deb, 'debris', deb.lat, deb.lng);
      });
    }

    // Clear markers outside viewport
    clearOutsideViewport(validIds);

    // Process rendering queue
    processQueue();

    // Log stats periodically
    if (Math.random() < 0.05) {
      console.log('📊 LOD Stats:', getStats());
    }
  }, [
    isMapLoaded,
    isZooming,
    currentZoom,
    viewMode,
    filteredByViewport,
    queueMarker,
    processQueue,
    clearOutsideViewport,
    getStats
  ]);

  return null; // This component manages rendering imperatively
}