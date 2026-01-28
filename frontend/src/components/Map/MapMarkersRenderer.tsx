import { useEffect } from "react";
import type { Aircraft, SatelliteObject } from "../../types";

interface MapMarkersRendererProps {
  isMapLoaded: boolean;
  isZooming: boolean;
  viewMode: "all" | "aircraft" | "satellite" | "debris";
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
  removeInvalidMarkers: (validIds: Set<string>) => void;
  processBatchedMarkers: () => void;
}

const MapMarkersRenderer: React.FC<MapMarkersRendererProps> = ({
  isMapLoaded,
  isZooming,
  viewMode,
  filteredByViewport,
  queueMarkerForBatch,
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

    // Queue all markers
    if (viewMode === "all" || viewMode === "aircraft") {
      filteredByViewport.aircraft.forEach((ac: Aircraft) => {
        const id = `aircraft-${ac.hex}`;
        validIds.add(id);
        queueMarkerForBatch(id, ac.lat, ac.lng, "#3b82f6", "aircraft", ac);
      });
    }

    if (viewMode === "all" || viewMode === "satellite") {
      filteredByViewport.satellites.forEach((sat: SatelliteObject) => {
        const id = `satellite-${sat.norad_id}`;
        validIds.add(id);
        queueMarkerForBatch(id, sat.lat, sat.lng, "#10b981", "satellite", sat);
      });
    }

    if (viewMode === "all" || viewMode === "debris") {
      filteredByViewport.debris.forEach((deb: SatelliteObject) => {
        const id = `debris-${deb.norad_id}`;
        validIds.add(id);
        queueMarkerForBatch(id, deb.lat, deb.lng, "#ef4444", "debris", deb);
      });
    }

    removeInvalidMarkers(validIds);
    processBatchedMarkers();
  }, [
    filteredByViewport,
    viewMode,
    isMapLoaded,
    isZooming,
    queueMarkerForBatch,
    removeInvalidMarkers,
    processBatchedMarkers,
  ]);

  return null; // This component doesn't render anything
};

export default MapMarkersRenderer;
