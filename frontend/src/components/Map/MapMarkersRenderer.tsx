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

    // ✅ Process with LOD + Pooling
    processBatchedMarkers(objects, currentZoom);

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