import "./App.css";
import { useState, useRef, useEffect } from "react";
import { Map, Marker } from "@maptiler/sdk";
import MainLayout from "./components/Layout/MainLayout";
import MapContainer from "./components/Map/MapContainer";
import ViewModeToggle from "./components/UI/ViewModeToggle";
import StatsPanel from "./components/UI/StatsPanel";
import ObjectDetailsCard from "./components/UI/ObjectDetailsCard";
import { useAircraftData } from "./hooks/useAircraftData";
import { useSatelliteData } from "./hooks/useSatelliteData";
import { useMapControls } from "./hooks/useMapControls";
import type { Aircraft, SatelliteObject } from "./types";

const App = () => {
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);

  const { aircraft, isLoading: aircraftLoading } = useAircraftData();
  const {
    satellites,
    debris,
    isLoading: satelliteLoading,
  } = useSatelliteData();
  const { viewMode, selectedObject, handleViewModeChange, handleObjectSelect } =
    useMapControls();

  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const handleMapLoad = (map: Map) => {
    mapRef.current = map;
    setIsMapLoaded(true);
  };

  // Update markers whenever data or view mode changes
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const createMarker = (
      lat: number,
      lng: number,
      color: string,
      type: "aircraft" | "satellite" | "debris",
      data: Aircraft | SatelliteObject
    ) => {
      const el = document.createElement("div");
      const size = type === "debris" ? "16px" : "24px";

      el.className = "marker";
      el.style.width = size;
      el.style.height = size;
      el.style.borderRadius = "50%";
      el.style.backgroundColor = color;
      el.style.border = "2px solid white";
      el.style.cursor = "pointer";
      el.style.transition = "transform 0.2s";
      el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";

      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.3)";
      });

      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
      });

      el.addEventListener("click", () => {
        handleObjectSelect({ type, data });
      });

      const marker = new Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    };

    // Add markers based on view mode
    if (viewMode === "all" || viewMode === "aircraft") {
      aircraft.forEach((ac) => {
        createMarker(ac.lat, ac.lng, "#3b82f6", "aircraft", ac);
      });
    }

    if (viewMode === "all" || viewMode === "satellite") {
      satellites.forEach((sat) => {
        createMarker(sat.lat, sat.lng, "#10b981", "satellite", sat);
      });
    }

    if (viewMode === "all" || viewMode === "debris") {
      debris.forEach((deb) => {
        createMarker(deb.lat, deb.lng, "#ef4444", "debris", deb);
      });
    }
  }, [aircraft, satellites, debris, viewMode, isMapLoaded, handleObjectSelect]);

  const isLoading = aircraftLoading || satelliteLoading;

  return (
    <MainLayout>
      <MapContainer onMapLoad={handleMapLoad} />

      {/* View Mode Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ViewModeToggle
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
      </div>

      {/* Stats Panel */}
      <div className="absolute top-4 left-4 z-10">
        <StatsPanel
          aircraftCount={aircraft.length}
          satelliteCount={satellites.length}
          debrisCount={debris.length}
        />
      </div>

      {/* Selected Object Details */}
      {selectedObject && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-10">
          <ObjectDetailsCard
            selectedObject={selectedObject}
            onClose={() => handleObjectSelect(null)}
          />
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-700 font-medium">Loading tracker data...</p>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default App;
