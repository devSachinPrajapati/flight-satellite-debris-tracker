/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useCallback, useState } from "react";
import MainLayout from "./components/Layout/MainLayout";
import MapContainer from "./components/Map/MapContainer";
import MapMarkersRenderer from "./components/Map/MapMarkersRenderer";
import ViewModeToggle from "./components/UI/ViewModeToggle";
import StatsPanel from "./components/UI/StatsPanel";
import ObjectDetailsCard from "./components/UI/ObjectDetailsCard";
import MapViewToggle from "./components/UI/MapViewToggle";
import ObjectsList from "./components/UI/ObjectsList";
import ProgressiveRenderingIndicator from "./components/UI/ProgressiveRenderingIndicator";
import ToastCloseButton from "./components/UI/ToastCloseButton";
import LoadingOverlay from "./components/Tracker/LoadingOverlay";
import FeatureButtons from "./components/Features/FeaturesButton";
import { useAircraftData } from "./hooks/useAircraftData";
import { useSatelliteData } from "./hooks/useSatelliteData";
import { useMapControls } from "./hooks/useMapControls";
import { useSearch } from "./hooks/useSearch";
import useFPS from "./hooks/useFPS";
import { useMapManager } from "./hooks/useMapManager";
import { useMarkerManager } from "./hooks/useMarkerManager";
import { useRenderStats } from "./hooks/useRenderStats";
import { type LoadingStatus } from "./types/index"; 

import { recordFlightPosition } from "./services/flightHistoryService";
import { mapStatus } from "./utils/mapStatus";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const App = () => {

  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>({
    flights_ready: false,
    flights_loading: true,
    satellites_ready: false,
    satellites_loading: true
  });

  // Map management
  const {
    mapRef,
    isMapLoaded,
    isGlobeView,
    currentZoom,
    isZooming,
    handleMapLoad,
    toggleGlobeView,
  } = useMapManager();

  // Data fetching
  const {
    aircraft,
    isLoading: aircraftLoading,
    lastFetchTime: aircraftLastFetch,
    status: aircraftStatus,
    refresh: refreshAircraft,
    isConnected: aircraftConnected,
  } = useAircraftData(5000);

  const {
    satellites,
    debris,
    lastFetchTime,
    isLoading: satelliteLoading,
    status: satelliteStatus,
    refresh: refreshSatellites,
    isConnected: satelliteConnected,
  } = useSatelliteData(2000);

  // Map controls and object selection
  const { viewMode, selectedObject, handleViewModeChange, handleObjectSelect } = useMapControls();

  const {
    processBatchedMarkers,
  } = useMarkerManager(mapRef, handleObjectSelect);


  // Render stats and viewport filtering
  const { renderStats, filteredByViewport } = useRenderStats(
    aircraft,
    satellites,
    debris,
    currentZoom,
    isZooming
  );

  // Search functionality
  const { filteredAircraft, filteredSatellites, filteredDebris } = useSearch(
    aircraft,
    satellites,
    debris
  );

  // FPS monitoring
  const fps = useFPS();

    // WebSocket connection for loading status (NEW)
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws');
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'initial_data' || message.type === 'position_update') {
        // Update loading status from backend
        setLoadingStatus(message.loading_status);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return () => ws.close();
  }, []);


  // Record flight positions for history
  useEffect(() => {
    aircraft.forEach((a) => recordFlightPosition(a));
  }, [aircraft]);

  // Log WebSocket connection status
  useEffect(() => {
    console.log('📡 WebSocket Status:', {
      aircraft: aircraftConnected ? '✅ Connected' : '❌ Disconnected',
      satellites: satelliteConnected ? '✅ Connected' : '❌ Disconnected',
    });
  }, [aircraftConnected, satelliteConnected]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    console.log("🔄 Manual refresh triggered");
    refreshAircraft();
    refreshSatellites();
  }, [refreshAircraft, refreshSatellites]);

  const isLoading =
    (aircraftLoading || satelliteLoading) &&
    aircraft.length === 0 &&
    satellites.length === 0;

  return (
    <>
       <LoadingOverlay 
        isLoading={isLoading}
        loadingStatus={loadingStatus}
        flightsCount={aircraft.length}
        satellitesCount={satellites.length}
      />

      <ToastContainer
        position="top-center"
        autoClose={2000}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        hideProgressBar={false}
        closeButton={ToastCloseButton}
        toastClassName={() =>
          "relative flex items-center px-4 py-3 rounded-xl shadow-lg bg-slate-100 text-blue-800 text-sm font-medium min-h-12 min-w-[250px] max-w-md"
        }
        className="flex items-center gap-3 w-full"
        progressClassName="
          bg-gradient-to-r from-indigo-400 via-blue-500 to-cyan-400
          h-1
          rounded-b-xl
        "
        style={{ marginTop: "1rem" }}
      />

      <MainLayout>
        <MapContainer onMapLoad={handleMapLoad} />

        <MapMarkersRenderer
          isMapLoaded={isMapLoaded}
          isZooming={isZooming}
          currentZoom={currentZoom}  // ✅ Add this
          viewMode={viewMode}
          filteredByViewport={filteredByViewport}
          processBatchedMarkers={processBatchedMarkers}
        />

        {/* View Mode Toggle */}
        <div className="absolute top-80 left-4 z-10">
          <ViewModeToggle viewMode={viewMode} onViewModeChange={handleViewModeChange} />
        </div>

        {/* Stats Panel */}
        <div className="absolute top-4 left-4 z-10">
          <StatsPanel
            aircraftCount={renderStats.renderedAircraft}
            satelliteCount={renderStats.renderedSatellites}
            debrisCount={renderStats.renderedDebris}
            lastUpdate={aircraftLastFetch ?? lastFetchTime}
            aircraftStatus={mapStatus(aircraftStatus)}
            satelliteStatus={mapStatus(satelliteStatus)}
            debrisStatus={mapStatus(satelliteStatus)}
            fps={fps}
            onRefresh={handleRefresh}
            isConnected={aircraftConnected || satelliteConnected}
          />
        </div>

        {/* Progressive Rendering Indicator */}
        <ProgressiveRenderingIndicator
          currentZoom={currentZoom}
          renderStats={renderStats}
        />

        {/* Object Details Card */}
        {selectedObject && (
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 max-w-xl">
            <ObjectDetailsCard
              selectedObject={selectedObject}
              onClose={() => handleObjectSelect(null)}
            />
          </div>
        )}

        {/* Map View Toggle */}
        <div className="absolute top-42 right-1 z-10 flex flex-col space-y-2 cursor-pointer">
          <MapViewToggle isGlobeView={isGlobeView} onToggle={toggleGlobeView} />
        </div>

        {/* Objects List */}
        <ObjectsList
          aircraft={filteredAircraft}
          satellites={filteredSatellites}
          debris={filteredDebris}
          onSelectObject={(data, type) => handleObjectSelect({ type, data })}
          selectedObject={selectedObject}
        />
      </MainLayout>

      {/* Feature Buttons */}
      <FeatureButtons
        selectedObject={selectedObject}
        aircraft={aircraft}
        mapRef={mapRef}
        onObjectSelect={handleObjectSelect}
      />
    </>
  );
};

export default App;