import { useState, useRef, useEffect, useCallback } from "react";
import * as maptilersdk from "@maptiler/sdk";
import MainLayout from "./components/Layout/MainLayout";
import MapContainer from "./components/Map/MapContainer";
import ViewModeToggle from "./components/UI/ViewModeToggle";
import StatsPanel from "./components/UI/StatsPanel";
import ObjectDetailsCard from "./components/UI/ObjectDetailsCard";
import { useAircraftData } from "./hooks/useAircraftData";
import { useSatelliteData } from "./hooks/useSatelliteData";
import { useMapControls } from "./hooks/useMapControls";
import useFPS from "./hooks/useFPS";
import type { Aircraft, SatelliteObject } from "./types";
import MapViewToggle from "./components/UI/MapViewToggle";
import ObjectsList from "./components/UI/ObjectsList";
import SearchPanel from "./components/UI/SearchPanel";
import { useSearch } from "./hooks/useSearch";

const App = () => {
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const markersRef = useRef<Map<string, maptilersdk.Marker>>(new Map());

  const [isGlobeView, setIsGlobeView] = useState(true);

  const toggleGlobeView = useCallback(() => {
    if (mapRef.current) {
      const newProjection = isGlobeView ? "mercator" : "globe";
      mapRef.current.setProjection(
        newProjection as maptilersdk.ProjectionSpecification
      );
      setIsGlobeView(!isGlobeView);
      console.log(`🌍 Switched to ${newProjection} view`);
    }
  }, [isGlobeView]);



  const {
    aircraft,
    isLoading: aircraftLoading,
    lastFetchTime: aircraftLastFetch, // timestamp
    status: aircraftStatus, // 'idle' | 'ok' | 'error'
    refresh: refreshAircraft,
  } = useAircraftData(5000);

  const {
    satellites,
    debris,
    isLoading: satelliteLoading,
    lastFetchTime,
    status: satelliteStatus,
    refresh: refreshSatellites,
  } = useSatelliteData(2000); // Update positions every 2 seconds

  const { viewMode, selectedObject, handleViewModeChange, handleObjectSelect } =
    useMapControls();

  // Search & Filter
  const { handleSearch, filteredAircraft, filteredSatellites, filteredDebris } =
    useSearch(aircraft, satellites, debris);

  // lightweight FPS
  const fps = useFPS();

  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const handleMapLoad = useCallback((map: maptilersdk.Map) => {
    mapRef.current = map;
    setIsMapLoaded(true);
    console.log("✅ Map ready for markers");
  }, []);

  const handleRefresh = useCallback(() => {
    console.log("🔄 Manual refresh triggered");
    refreshAircraft();
    refreshSatellites();
  }, [refreshAircraft, refreshSatellites]);

  // Environment check
  useEffect(() => {
    console.log("🔍 Environment Check:");
    console.log(
      "MapTiler Key:",
      import.meta.env.VITE_MAPTILER_API_KEY ? "✅ Present" : "❌ Missing"
    );
    console.log(
      "AirLabs Key:",
      import.meta.env.VITE_AIRLABS_API_KEY ? "✅ Present" : "❌ Missing"
    );
  }, []);

  // Create or update marker
  const createOrUpdateMarker = useCallback(
    (
      id: string,
      lat: number,
      lng: number,
      color: string,
      type: "aircraft" | "satellite" | "debris",
      data: Aircraft | SatelliteObject
    ) => {
      if (!mapRef.current) return;

      // Validate coordinates
      if (
        isNaN(lat) ||
        isNaN(lng) ||
        Math.abs(lat) > 90 ||
        Math.abs(lng) > 180
      ) {
        return;
      }

      const existingMarker = markersRef.current.get(id);

      if (existingMarker) {
        // Update existing marker position
        existingMarker.setLngLat([lng, lat]);
      } else {
        // Create new marker
        const el = document.createElement("div");
        el.style.width = "0px";
        el.style.height = "0px";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";

        const size = type === "debris" ? 16 : 24;

        el.className = "marker";
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.borderRadius = "50%";
        el.style.backgroundColor = color;
        el.style.border = "2px solid white";
        el.style.cursor = "pointer";
        el.style.transition = "all 0.3s ease";
        el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.4)";

        if (type === "aircraft") {
          el.innerHTML =
            '<div style="font-size: 12px; text-align: center; line-height: 20px;">✈️</div>';
        } else if (type === "satellite") {
          el.innerHTML =
            '<div style="font-size: 10px; text-align: center; line-height: 20px;">🛰️</div>';
        }

        el.addEventListener("mouseenter", () => {
          el.style.transform = "scale(1.5)";
          el.style.zIndex = "1000";
        });

        el.addEventListener("mouseleave", () => {
          el.style.transform = "scale(1)";
          el.style.zIndex = "1";
        });

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          handleObjectSelect({ type, data });
        });

        const marker = new maptilersdk.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(mapRef.current);

        markersRef.current.set(id, marker);
      }
    },
    [handleObjectSelect]
  );

  // Remove markers that are no longer visible
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

  // Update markers whenever data or view mode changes
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) {
      return;
    }

    const validIds = new Set<string>();

    // Add aircraft markers
    if (viewMode === "all" || viewMode === "aircraft") {
      aircraft.forEach((ac) => {
        const id = `aircraft-${ac.hex}`;
        validIds.add(id);
        createOrUpdateMarker(id, ac.lat, ac.lng, "#3b82f6", "aircraft", ac);
      });
    }

    // Add satellite markers
    if (viewMode === "all" || viewMode === "satellite") {
      satellites.forEach((sat) => {
        const id = `satellite-${sat.norad_id}`;
        validIds.add(id);
        createOrUpdateMarker(id, sat.lat, sat.lng, "#10b981", "satellite", sat);
      });
    }

    // Add debris markers
    if (viewMode === "all" || viewMode === "debris") {
      debris.forEach((deb) => {
        const id = `debris-${deb.norad_id}`;
        validIds.add(id);
        createOrUpdateMarker(id, deb.lat, deb.lng, "#ef4444", "debris", deb);
      });
    }

    // Remove markers not in current view
    removeInvalidMarkers(validIds);

    console.log(`📍 Active markers: ${markersRef.current.size}`);
  }, [
    aircraft,
    satellites,
    debris,
    viewMode,
    isMapLoaded,
    createOrUpdateMarker,
    removeInvalidMarkers,
  ]);

  // Clean up
  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      // eslint-disable-next-line react-hooks/exhaustive-deps
      markersRef.current.clear();
    };
  }, []);

  const isLoading =
    (aircraftLoading || satelliteLoading) &&
    aircraft.length === 0 &&
    satellites.length === 0;

  return (
    <MainLayout>
      <MapContainer onMapLoad={handleMapLoad} />

      {/* View Mode Toggle */}
      <div className="absolute top-[19rem] left-4 z-10">
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
          lastUpdate={aircraftLastFetch ?? lastFetchTime}
          aircraftStatus={aircraftStatus}
          satelliteStatus={satelliteStatus}
          debrisStatus={satelliteStatus} // or debrisStatus if available
          fps={fps}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Selected Object Details */}
      {selectedObject && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-10 max-w-xl">
          <ObjectDetailsCard
            selectedObject={selectedObject}
            onClose={() => handleObjectSelect(null)}
          />
        </div>
      )}

      <div className="absolute top-42 right-1 z-10 flex flex-col space-y-2 cursor-pointer">
        <MapViewToggle isGlobeView={isGlobeView} onToggle={toggleGlobeView} />
      </div>

      {/* Search Panel */}
      <SearchPanel onSearch={handleSearch} />

      {/* Objects List Sidebar */}
      <ObjectsList
        aircraft={filteredAircraft}
        satellites={filteredSatellites}
        debris={filteredDebris}
        onSelectObject={(data, type) => handleObjectSelect({ type, data })}
        selectedObject={selectedObject}
      />

      {/* Selected Object Details */}
      {selectedObject && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-10 max-w-xl">
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
            <p className="text-gray-500 text-sm mt-2">
              Initializing live tracking system...
            </p>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default App;
