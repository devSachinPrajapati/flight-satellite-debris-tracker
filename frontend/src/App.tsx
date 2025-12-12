/* eslint-disable @typescript-eslint/no-unused-vars */
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
import LoadingOverlay from "./components/Tracker/LoadingOverlay";

// ADD THESE IMPORTS AT THE TOP
import { recordFlightPosition } from "./services/flightHistoryService";
import { getFlightHistory } from "./services/flightHistoryService";
import FlightReplayControl from "./components/FlightReplay/FlightReplayControl";
import AirportLiveBoard from "./components/Airport/AirportLiveBoard";
import NearbyFlightsPanel from "./components/Nearby/NearbyFlightsPanel";

const App = () => {
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const markersRef = useRef<Map<string, maptilersdk.Marker>>(new Map());

  const [isGlobeView, setIsGlobeView] = useState(true);

  // NEW STATE FOR FEATURES
  const [showFlightReplay, setShowFlightReplay] = useState(false);
  const [showAirportBoard, setShowAirportBoard] = useState(false);
  const [showNearbyFlights, setShowNearbyFlights] = useState(false);
  const [selectedFlightHex, setSelectedFlightHex] = useState<string | null>(
    null
  );
  const [selectedAirportCode, _setSelectedAirportCode] = useState("JFK");

  const [replayMarker, setReplayMarker] = useState<maptilersdk.Marker | null>(
    null
  );
  const [showAircraftPerformance, setShowAircraftPerformance] = useState(false);
  const [showSatelliteTracker, setShowSatelliteTracker] = useState(false);
  const [showOrbitVisualizer, setShowOrbitVisualizer] = useState(false);

  // Cleanup replay marker when closing replay
  useEffect(() => {
    if (!showFlightReplay && replayMarker) {
      replayMarker.remove();
      setReplayMarker(null);
    }
  }, [showFlightReplay, replayMarker]);

  // Handle replay position updates
  const handleReplayPositionUpdate = (
    lat: number,
    lng: number,
    alt: number,
    heading: number
  ) => {
    if (!mapRef.current) return;

    const selectedAircraft = aircraft.find((a) => a.hex === selectedFlightHex);

    if (!replayMarker) {
      // Create custom replay marker element
      const el = document.createElement("div");
      el.className = "replay-marker";
      el.style.cssText = `
        width: 40px;
        height: 40px;
        background-color: #9333ea;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(147, 51, 234, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        animation: pulse 2s infinite;
        position: relative;
      `;

      // Add airplane icon
      el.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M21,16v-2l-8-5V3.5C13,2.67,12.33,2,11.5,2S10,2.67,10,3.5V9l-8,5v2l8-2.5V19l-2,1.5V22l3.5-1l3.5,1v-1.5L13,19v-5.5L21,16z"/>
        </svg>
      `;

      // Add rotation based on heading
      el.style.transform = `rotate(${heading}deg)`;

      // Create marker
      const marker = new maptilersdk.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);

      // Create popup
      const popup = new maptilersdk.Popup({
        offset: 30,
        closeButton: false,
        className: "replay-popup",
      }).setHTML(`
        <div style="padding: 8px; min-width: 180px;">
          <div style="font-weight: bold; color: #9333ea; margin-bottom: 8px; font-size: 14px;">
            🔄 REPLAY MODE
          </div>
          <div style="font-size: 13px; color: #1f2937; margin-bottom: 4px;">
            <strong>Flight:</strong> ${
              selectedAircraft?.flight_icao || selectedFlightHex
            }
          </div>
          <div style="font-size: 12px; color: #6b7280; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div><strong>Alt:</strong> ${alt.toLocaleString()} ft</div>
            <div><strong>Hdg:</strong> ${heading.toFixed(0)}°</div>
            <div><strong>Type:</strong> ${
              selectedAircraft?.aircraft_icao || "N/A"
            }</div>
            <div><strong>Airline:</strong> ${
              selectedAircraft?.airline_icao || "N/A"
            }</div>
          </div>
        </div>
      `);

      marker.setPopup(popup);
      popup.addTo(mapRef.current);

      setReplayMarker(marker);

      // Pan map to replay position with animation
      mapRef.current.easeTo({
        center: [lng, lat],
        zoom: 10,
        duration: 1500,
        essential: true,
      });
    } else {
      // Update existing marker position
      replayMarker.setLngLat([lng, lat]);

      // Update marker rotation
      const markerElement = replayMarker.getElement();
      if (markerElement) {
        markerElement.style.transform = `rotate(${heading}deg)`;
      }

      // Update popup content
      const popup = replayMarker.getPopup();
      if (popup) {
        popup.setHTML(`
          <div style="padding: 8px; min-width: 180px;">
            <div style="font-weight: bold; color: #9333ea; margin-bottom: 8px; font-size: 14px;">
              🔄 REPLAY MODE
            </div>
            <div style="font-size: 13px; color: #1f2937; margin-bottom: 4px;">
              <strong>Flight:</strong> ${
                selectedAircraft?.flight_icao || selectedFlightHex
              }
            </div>
            <div style="font-size: 12px; color: #6b7280; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
              <div><strong>Alt:</strong> ${alt.toLocaleString()} ft</div>
              <div><strong>Hdg:</strong> ${heading.toFixed(0)}°</div>
              <div><strong>Type:</strong> ${
                selectedAircraft?.aircraft_icao || "N/A"
              }</div>
              <div><strong>Airline:</strong> ${
                selectedAircraft?.airline_icao || "N/A"
              }</div>
            </div>
          </div>
        `);
      }

      // Smoothly pan map to follow (optional - enable if you want camera to follow)
      // mapRef.current.panTo([lng, lat], { duration: 100 });
    }
  };

  // Handler to close replay
  const handleCloseReplay = () => {
    setShowFlightReplay(false);
    if (replayMarker) {
      replayMarker.remove();
      setReplayMarker(null);
    }
  };

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

  // NEW: Record flight positions for history
  useEffect(() => {
    aircraft.forEach((a) => recordFlightPosition(a));
  }, [aircraft]);

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
    <>
      <MainLayout>
        <MapContainer onMapLoad={handleMapLoad} />

        {/* View Mode Toggle | top-[19rem]*/}
        <div className="absolute top-76 left-4 z-10">
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
          <div className="absolute top-4 bottom-24 left-1/2 transform -translate-x-1/2 z-10 max-w-xl">
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

        {/* Loading State */}
        <LoadingOverlay isLoading={isLoading} />
      </MainLayout>

      <div className="absolute bottom-20 left-[100px] flex flex-row gap-2 z-40">
        <button
          onClick={() => setShowNearbyFlights(!showNearbyFlights)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600 transition cursor-pointer"
        >
          📍 Nearby Flights
        </button>

        <button
          onClick={() => setShowAirportBoard(true)}
          className="px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg hover:bg-green-600 transition cursor-pointer"
        >
          ✈️ Airport Board
        </button>

        <button
          onClick={() => setShowAircraftPerformance(!showAircraftPerformance)}
          className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-200 transition cursor-pointer"
        >
          📊 Aircraft Performance
        </button>
        <button
          onClick={() => setShowSatelliteTracker(!showSatelliteTracker)}
          className="px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-200 transition cursor-pointer"
        >
          🛰️ Satellite Tracker
        </button>
        <button
          onClick={() => setShowOrbitVisualizer(!showOrbitVisualizer)}
          className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-200 transition cursor-pointer"
        >
          🪐 Orbit Visualizer
        </button>

        {selectedObject?.type === "aircraft" && (
          <button
            onClick={() => {
              const hex = (selectedObject.data as Aircraft).hex;
              const historyResult = getFlightHistory(hex);
              if (historyResult.success && historyResult.data) {
                setSelectedFlightHex(hex);
                setShowFlightReplay(true);
              } else {
                alert(
                  "Not enough history data. Wait 1-2 minutes and try again."
                );
              }
            }}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg shadow-lg hover:bg-purple-600 transition"
          >
            🔄 Replay Flight
          </button>
        )}
      </div>

      {/* NEW: Nearby Flights Panel */}
      {showNearbyFlights && (
        <div className="absolute left-[480px] top-16 z-40">
          <NearbyFlightsPanel
            allAircraft={aircraft}
            onSelectFlight={(hex) => {
              const flight = aircraft.find((a) => a.hex === hex);
              if (flight) {
                handleObjectSelect({ type: "aircraft", data: flight });
              }
            }}
            onClose={() => setShowNearbyFlights(false)}
          />
        </div>
      )}

      {/* NEW: Airport Live Board Modal */}
      {showAirportBoard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <AirportLiveBoard
            iataCode={selectedAirportCode}
            onClose={() => setShowAirportBoard(false)}
          />
        </div>
      )}

      {/* NEW: Flight Replay Control */}
      {showFlightReplay &&
        selectedFlightHex &&
        (() => {
          const historyResult = getFlightHistory(selectedFlightHex);
          if (historyResult.success && historyResult.data) {
            return (
              <FlightReplayControl
                history={historyResult.data}
                onPositionUpdate={handleReplayPositionUpdate}
                onClose={handleCloseReplay}
              />
            );
          }
          return null;
        })()}
    </>
  );
};

export default App;
