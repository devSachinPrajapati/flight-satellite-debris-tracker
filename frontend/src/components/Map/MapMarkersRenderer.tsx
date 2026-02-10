import { useEffect } from "react";
import type { Aircraft, SatelliteObject } from "../../types";

interface MapMarkersRendererProps {
  isMapLoaded: boolean;
  isZooming: boolean;
  currentZoom: number;
  viewMode: "all" | "aircraft" | "satellite" | "debris";
  filteredByViewport: {
    aircraft: Aircraft[];
    satellites: SatelliteObject[];
    debris: SatelliteObject[];
  };
  processBatchedMarkers: (objects: any[], zoom: number) => void;
}

const MapMarkersRenderer: React.FC<MapMarkersRendererProps> = ({
  isMapLoaded,
  isZooming,
  currentZoom,
  viewMode,
  filteredByViewport,
  processBatchedMarkers,
}) => {
  useEffect(() => {
    if (!isMapLoaded || isZooming) return;

    //   Log what we're about to render
    const totalToRender = 
      (viewMode === "all" || viewMode === "aircraft" ? filteredByViewport.aircraft.length : 0) +
      (viewMode === "all" || viewMode === "satellite" ? filteredByViewport.satellites.length : 0) +
      (viewMode === "all" || viewMode === "debris" ? filteredByViewport.debris.length : 0);

    console.log(`🎨 MapMarkersRenderer: Preparing to render ${totalToRender} objects at zoom ${currentZoom.toFixed(1)}`);

    // Prepare objects for rendering
    const objects: any[] = [];

    if (viewMode === "all" || viewMode === "aircraft") {
      filteredByViewport.aircraft.forEach((ac) => {
        objects.push({
          id: `aircraft-${ac.hex}`,
          lat: ac.lat,
          lng: ac.lng,
          type: 'aircraft' as const,
          data: ac,
        });
      });
    }

    if (viewMode === "all" || viewMode === "satellite") {
      filteredByViewport.satellites.forEach((sat) => {
        objects.push({
          id: `satellite-${sat.norad_id}`,
          lat: sat.lat,
          lng: sat.lng,
          type: 'satellite' as const,
          data: sat,
        });
      });
    }

    if (viewMode === "all" || viewMode === "debris") {
      filteredByViewport.debris.forEach((deb) => {
        objects.push({
          id: `debris-${deb.norad_id}`,
          lat: deb.lat,
          lng: deb.lng,
          type: 'debris' as const,
          data: deb,
        });
      });
    }

    //   Process with LOD + Pooling + Hard Limits
    const startTime = performance.now();
    processBatchedMarkers(objects, currentZoom);
    const elapsed = performance.now() - startTime;
    
    //   Log rendering performance
    if (elapsed > 100) {
      console.warn(`⚠️ Slow render: ${elapsed.toFixed(0)}ms for ${objects.length} objects`);
    } else if (Math.random() < 0.1) { // 10% sampling
      console.log(`⚡ Render: ${elapsed.toFixed(0)}ms for ${objects.length} objects`);
    }

  }, [
    filteredByViewport,
    viewMode,
    isMapLoaded,
    isZooming,
    currentZoom,
    processBatchedMarkers,
  ]);

  return null;
};

export default MapMarkersRenderer;