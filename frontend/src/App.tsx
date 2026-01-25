// /* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable react-hooks/exhaustive-deps */
// import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from "react";
// import * as maptilersdk from "@maptiler/sdk";
// import MainLayout from "./components/Layout/MainLayout";
// import MapContainer from "./components/Map/MapContainer";
// import ViewModeToggle from "./components/UI/ViewModeToggle";
// import StatsPanel from "./components/UI/StatsPanel";
// import ObjectDetailsCard from "./components/UI/ObjectDetailsCard";
// import { useAircraftData } from "./hooks/useAircraftData";
// import { useSatelliteData } from "./hooks/useSatelliteData";
// import { useMapControls } from "./hooks/useMapControls";
// import useFPS from "./hooks/useFPS";
// import type { Aircraft, SatelliteObject } from "./types";
// import MapViewToggle from "./components/UI/MapViewToggle";
// import ObjectsList from "./components/UI/ObjectsList";
// import SearchPanel from "./components/UI/SearchPanel";
// import { useSearch } from "./hooks/useSearch";
// import LoadingOverlay from "./components/Tracker/LoadingOverlay";

// // New IMPORTS for New Premium Features
// import { recordFlightPosition } from "./services/flightHistoryService";
// import { getFlightHistory } from "./services/flightHistoryService";
// import FlightReplayControl from "./components/FlightReplay/FlightReplayControl";
// import AirportLiveBoard from "./components/Airport/AirportLiveBoard";
// import NearbyFlightsPanel from "./components/Nearby/NearbyFlightsPanel";
// import PerformanceDashboard from "./components/Performance/PerformanceDashboard";
// import SatelliteEnhancedPanel from "./components/Satellite/SatelliteEnhancedPanel";
// import OrbitVisualizerPanel from "./components/Orbit/OrbitVisualizerPanel";


// // 🚀 NEW: Viewport Manager for Performance Optimization
// import { viewportManager } from "./utils/viewportManager";

// const mapStatus = (status: 'idle' | 'ok' | 'error'): 'idle' | 'ok' | 'error' => {
//   return status;
// };

// const App = () => {
//   const mapRef = useRef<maptilersdk.Map | null>(null);
//   const markersRef = useRef<Map<string, maptilersdk.Marker>>(new Map());

//   const [isGlobeView, setIsGlobeView] = useState(true);

//   // NEW STATE FOR FEATURES
//   const [showFlightReplay, setShowFlightReplay] = useState(false);
//   const [showAirportBoard, setShowAirportBoard] = useState(false);
//   const [showNearbyFlights, setShowNearbyFlights] = useState(false);
//   const [selectedFlightHex, setSelectedFlightHex] = useState<string | null>(null);
//   const [selectedAirportCode, setSelectedAirportCode] = useState("JFK");

//   const [replayMarker, setReplayMarker] = useState<maptilersdk.Marker | null>(null);
//   const [showAircraftPerformance, setShowAircraftPerformance] = useState(false);
//   const [showSatelliteTracker, setShowSatelliteTracker] = useState(false);
//   const [showOrbitVisualizer, setShowOrbitVisualizer] = useState(false);
//   const [selectedPerformanceAircraft, setSelectedPerformanceAircraft] =
//     useState<Aircraft | null>(null);
//   const [selectedSatelliteTracker, setSelectedSatelliteTracker] =
//     useState<SatelliteObject | null>(null);
//   const [selectedOrbitSatellite, setSelectedOrbitSatellite] =
//     useState<SatelliteObject | null>(null);

//   // ⚡ OPTIMIZATION: Separate loading states
//   const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
//   const [loadingMessage, setLoadingMessage] = useState("Connecting to tracking system...");

//   // 🚀 NEW: Performance monitoring state
//   const [renderStats, setRenderStats] = useState({
//     totalAircraft: 0,
//     totalSatellites: 0,
//     totalDebris: 0,
//     renderedAircraft: 0,
//     renderedSatellites: 0,
//     renderedDebris: 0,
//   });
//   const [currentZoom, setCurrentZoom] = useState(1.5);
//   const [isZooming, setIsZooming] = useState(false);

//   // Cleanup replay marker when closing replay
//   useEffect(() => {
//     if (!showFlightReplay && replayMarker) {
//       replayMarker.remove();
//       setReplayMarker(null);
//     }
//   }, [showFlightReplay, replayMarker]);

//   // Handle replay position updates
//   const handleReplayPositionUpdate = (
//     lat: number,
//     lng: number,
//     alt: number,
//     heading: number
//   ) => {
//     if (!mapRef.current) return;

//     const selectedAircraft = aircraft.find((a) => a.hex === selectedFlightHex);

//     if (!replayMarker) {
//       // Create custom replay marker element
//       const el = document.createElement("div");
//       el.className = "replay-marker";
//       el.style.cssText = `
//         width: 40px;
//         height: 40px;
//         background-color: #9333ea;
//         border: 3px solid white;
//         border-radius: 50%;
//         box-shadow: 0 4px 12px rgba(147, 51, 234, 0.4);
//         display: flex;
//         align-items: center;
//         justify-content: center;
//         cursor: pointer;
//         animation: pulse 2s infinite;
//         position: relative;
//       `;

//       // Add airplane icon
//       el.innerHTML = `
//         <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
//           <path d="M21,16v-2l-8-5V3.5C13,2.67,12.33,2,11.5,2S10,2.67,10,3.5V9l-8,5v2l8-2.5V19l-2,1.5V22l3.5-1l3.5,1v-1.5L13,19v-5.5L21,16z"/>
//         </svg>
//       `;

//       // Add rotation based on heading
//       el.style.transform = `rotate(${heading}deg)`;

//       // Create marker
//       const marker = new maptilersdk.Marker({
//         element: el,
//         anchor: "center",
//       })
//         .setLngLat([lng, lat])
//         .addTo(mapRef.current);

//       // Create popup
//       const popup = new maptilersdk.Popup({
//         offset: 30,
//         closeButton: false,
//         className: "replay-popup",
//       }).setHTML(`
//         <div style="padding: 8px; min-width: 180px;">
//           <div style="font-weight: bold; color: #9333ea; margin-bottom: 8px; font-size: 14px;">
//             🔄 REPLAY MODE
//           </div>
//           <div style="font-size: 13px; color: #1f2937; margin-bottom: 4px;">
//             <strong>Flight:</strong> ${selectedAircraft?.flight_icao || selectedFlightHex}
//           </div>
//           <div style="font-size: 12px; color: #6b7280; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
//             <div><strong>Alt:</strong> ${alt.toLocaleString()} ft</div>
//             <div><strong>Hdg:</strong> ${heading.toFixed(0)}°</div>
//             <div><strong>Type:</strong> ${selectedAircraft?.aircraft_icao || "N/A"}</div>
//             <div><strong>Airline:</strong> ${selectedAircraft?.airline_icao || "N/A"}</div>
//           </div>
//         </div>
//       `);

//       marker.setPopup(popup);
//       popup.addTo(mapRef.current);

//       setReplayMarker(marker);

//       // Pan map to replay position with animation
//       mapRef.current.easeTo({
//         center: [lng, lat],
//         zoom: 10,
//         duration: 1500,
//         essential: true,
//       });
//     } else {
//       // Update existing marker position
//       replayMarker.setLngLat([lng, lat]);

//       // Update marker rotation
//       const markerElement = replayMarker.getElement();
//       if (markerElement) {
//         markerElement.style.transform = `rotate(${heading}deg)`;
//       }

//       // Update popup content
//       const popup = replayMarker.getPopup();
//       if (popup) {
//         popup.setHTML(`
//           <div style="padding: 8px; min-width: 180px;">
//             <div style="font-weight: bold; color: #9333ea; margin-bottom: 8px; font-size: 14px;">
//               🔄 REPLAY MODE
//             </div>
//             <div style="font-size: 13px; color: #1f2937; margin-bottom: 4px;">
//               <strong>Flight:</strong> ${selectedAircraft?.flight_icao || selectedFlightHex}
//             </div>
//             <div style="font-size: 12px; color: #6b7280; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
//               <div><strong>Alt:</strong> ${alt.toLocaleString()} ft</div>
//               <div><strong>Hdg:</strong> ${heading.toFixed(0)}°</div>
//               <div><strong>Type:</strong> ${selectedAircraft?.aircraft_icao || "N/A"}</div>
//               <div><strong>Airline:</strong> ${selectedAircraft?.airline_icao || "N/A"}</div>
//             </div>
//           </div>
//         `);
//       }
//     }
//   };

//   // Handler to close replay
//   const handleCloseReplay = () => {
//     setShowFlightReplay(false);
//     if (replayMarker) {
//       replayMarker.remove();
//       setReplayMarker(null);
//     }
//   };

//   const toggleGlobeView = useCallback(() => {
//     if (mapRef.current) {
//       const newProjection = isGlobeView ? "mercator" : "globe";
//       mapRef.current.setProjection(
//         newProjection as maptilersdk.ProjectionSpecification
//       );
//       setIsGlobeView(!isGlobeView);
//       console.log(`🌍 Switched to ${newProjection} view`);
//     }
//   }, [isGlobeView]);

//   // ✅ Use WebSocket-powered hooks
//   const {
//     aircraft,
//     // isLoading: aircraftLoading,
//     lastFetchTime: aircraftLastFetch,
//     status: aircraftStatus,
//     refresh: refreshAircraft,
//     isConnected: aircraftConnected,
//   } = useAircraftData(5000);

//   const {
//     satellites,
//     debris,
//     // isLoading: satelliteLoading,
//     lastFetchTime,
//     status: satelliteStatus,
//     refresh: refreshSatellites,
//     isConnected: satelliteConnected,
//   } = useSatelliteData(2000);

//   // ⚡ OPTIMIZATION: Progressive loading UI updates
//   useEffect(() => {
//     if (aircraftConnected) {
//       setLoadingMessage("Loading flight data...");
//     }

//     if (aircraft.length > 0) {
//       setLoadingMessage("Loading satellite data...");
//     }

//     if (satellites.length > 0 || debris.length > 0) {
//       setLoadingMessage("Rendering map markers...");

//       // Hide loading after short delay to allow markers to render
//       setTimeout(() => {
//         setShowLoadingOverlay(false);
//       }, 500);
//     }
//   }, [aircraftConnected, aircraft.length, satellites.length, debris.length]);

//   // ⚡ OPTIMIZATION: Hide loading overlay once we have ANY data
//   useEffect(() => {
//     if (aircraft.length > 0 || satellites.length > 0) {
//       setTimeout(() => {
//         setShowLoadingOverlay(false);
//       }, 300);
//     }
//   }, [aircraft.length, satellites.length]);


//   // Log WebSocket connection status
//   useEffect(() => {
//     console.log('📡 WebSocket Status:', {
//       aircraft: aircraftConnected ? '✅ Connected' : '❌ Disconnected',
//       satellites: satelliteConnected ? '✅ Connected' : '❌ Disconnected',
//     });
//   }, [aircraftConnected, satelliteConnected]);

//   const { viewMode, selectedObject, handleViewModeChange, handleObjectSelect } =
//     useMapControls();

//   // NEW: Record flight positions for history
//   useEffect(() => {
//     aircraft.forEach((a) => recordFlightPosition(a));
//   }, [aircraft]);

//   // 🚀 OPTIMIZED: Progressive viewport filtering with debouncing
//   const filteredByViewport = useMemo(() => {
//     // Don't filter during zoom transitions to prevent flickering
//     if (isZooming) {
//       return {
//         aircraft: viewportManager.filterAircraft(aircraft),
//         satellites: viewportManager.filterSatellites(satellites),
//         debris: viewportManager.filterDebris(debris),
//       };
//     }

//     const visibleAircraft = viewportManager.filterAircraft(aircraft);
//     const visibleSatellites = viewportManager.filterSatellites(satellites);
//     const visibleDebris = viewportManager.filterDebris(debris);

//     setRenderStats({
//       totalAircraft: aircraft.length,
//       totalSatellites: satellites.length,
//       totalDebris: debris.length,
//       renderedAircraft: visibleAircraft.length,
//       renderedSatellites: visibleSatellites.length,
//       renderedDebris: visibleDebris.length,
//     });

//     return {
//       aircraft: visibleAircraft,
//       satellites: visibleSatellites,
//       debris: visibleDebris,
//     };
//   }, [aircraft, satellites, debris, currentZoom, isZooming]);


//   // Search & Filter
//   const { handleSearch, filteredAircraft, filteredSatellites, filteredDebris } =
//     useSearch(aircraft, satellites, debris);

//   // lightweight FPS
//   const fps = useFPS();

//   const [isMapLoaded, setIsMapLoaded] = useState(false);

//   const handleMapLoad = useCallback((map: maptilersdk.Map) => {
//     mapRef.current = map;
//     setIsMapLoaded(true);

//     // 🚀 NEW: Initialize viewport manager with map
//     viewportManager.setMap(map);

//     // 🚀 FIXED: Track zoom with debouncing
//     let zoomTimeout: ReturnType<typeof setTimeout> | null = null;

//     map.on('zoomstart', () => {
//       setIsZooming(true);
//     });

//     map.on('zoom', () => {
//       const newZoom = map.getZoom();
//       setCurrentZoom(newZoom);

//       // Clear existing timeout
//       if (zoomTimeout) {
//         clearTimeout(zoomTimeout);
//       }

//       // Set zooming flag to false after 300ms of no zoom changes
//       zoomTimeout = setTimeout(() => {
//         setIsZooming(false);
//       }, 300);
//     });

//     map.on('zoomend', () => {
//       setIsZooming(false);
//       setCurrentZoom(map.getZoom());
//     });

//     setCurrentZoom(map.getZoom());

//     console.log("✅ Map ready for markers");
//   }, []);

//   const handleRefresh = useCallback(() => {
//     console.log("🔄 Manual refresh triggered");
//     refreshAircraft();
//     refreshSatellites();
//   }, [refreshAircraft, refreshSatellites]);

//   // Environment check
//   useEffect(() => {
//     console.log("🔍 Environment Check:");
//     console.log(
//       "MapTiler Key:",
//       import.meta.env.VITE_MAPTILER_API_KEY ? "✅ Present" : "❌ Missing"
//     );
//     console.log(
//       "Backend URL:",
//       import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
//     );
//     console.log(
//       "WebSocket URL:",
//       import.meta.env.VITE_WS_URL || "ws://localhost:8000"
//     );
//   }, []);

//   // 🚀 Log viewport stats
//   useEffect(() => {
//     const interval = setInterval(() => {
//       if (renderStats.totalAircraft > 0 || renderStats.totalSatellites > 0) {
//         const stats = viewportManager.getStats(
//           renderStats.totalAircraft,
//           renderStats.totalSatellites,
//           renderStats.totalDebris,
//           renderStats.renderedAircraft,
//           renderStats.renderedSatellites,
//           renderStats.renderedDebris
//         );
//         console.log(stats);
//       }
//     }, 10000);

//     return () => clearInterval(interval);
//   }, [renderStats]);


//   const getAirportCodeFromAircraft = (aircraft: Aircraft): string | null => {
//     if (aircraft.arr_iata) return aircraft.arr_iata;
//     if (aircraft.dep_iata) return aircraft.dep_iata;
//     if (aircraft.arr_icao) return aircraft.arr_icao;
//     if (aircraft.dep_icao) return aircraft.dep_icao;
//     return null;
//   };

//   // Create or update marker
//   // FIXED: createOrUpdateMarker with proper event handling
//   const createOrUpdateMarker = useCallback((id: string, lat: number, lng: number, color: string, type: "aircraft" | "satellite" | "debris", data: Aircraft | SatelliteObject) => {
//     if (!mapRef.current) return;
//     if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
//       console.warn(`Invalid coordinates for ${id}: [${lat}, ${lng}]`);
//       return;
//     }

//     const existingMarker = markersRef.current.get(id);
//     if (existingMarker) {
//       existingMarker.setLngLat([lng, lat]);
//     } else {
//       const el = document.createElement("div");
//       const size = type === "debris" ? 16 : 24;
//       el.style.width = `${size}px`;
//       el.style.height = `${size}px`;
//       el.style.backgroundColor = color;
//       el.style.border = "2px solid white";
//       el.style.borderRadius = "50%";
//       el.style.cursor = "pointer";
//       el.style.transition = "transform 0.2s ease";
//       el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.4)";
//       el.style.display = "flex";
//       el.style.alignItems = "center";
//       el.style.justifyContent = "center";
//       el.style.fontSize = type === "satellite" ? "10px" : "12px";
//       el.className = "custom-marker";
//       el.style.pointerEvents = "auto";

//       if (type === "aircraft") el.innerHTML = '<span style="pointer-events: none;">✈️</span>';
//       else if (type === "satellite") el.innerHTML = '<span style="pointer-events: none;">🛰️</span>';
//       else if (type === "debris") el.innerHTML = '<span style="pointer-events: none; font-size: 8px;">🔴</span>';

//       // el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.3)"; el.style.zIndex = "1000"; });
//       // el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; el.style.zIndex = "1"; });
//       // el.addEventListener("mousedown", (e) => { e.stopPropagation(); });
//       // el.addEventListener("click", (e) => {
//       //   e.preventDefault();
//       //   e.stopPropagation();
//       //   e.stopImmediatePropagation();
//       //   console.log(`🎯 Marker clicked: ${type} ${id}`);
//       //   setTimeout(() => { handleObjectSelect({ type, data }); }, 50);
//       // });

//       // const marker = new maptilersdk.Marker({ element: el, anchor: "center", draggable: false }).setLngLat([lng, lat]).addTo(mapRef.current);
//       // markersRef.current.set(id, marker);
//       // if (Math.random() < 0.01) console.log(`✅ Created ${type} marker: ${id}`);
//        // 🚀 FIXED: Improved event handling
//     el.addEventListener("mouseenter", (e) => { 
//       e.stopPropagation();
//       el.style.transform = "scale(1.3)"; 
//       el.style.zIndex = "1000"; 
//     });

//     el.addEventListener("mouseleave", (e) => { 
//       e.stopPropagation();
//       el.style.transform = "scale(1)"; 
//       el.style.zIndex = "10"; 
//     });

//     // 🚀 CRITICAL FIX: Stop all event propagation for clicks
//     el.addEventListener("mousedown", (e) => { 
//       e.stopPropagation(); 
//       e.stopImmediatePropagation();
//     });

//     el.addEventListener("mouseup", (e) => { 
//       e.stopPropagation(); 
//       e.stopImmediatePropagation();
//     });

//     el.addEventListener("click", (e) => {
//       e.preventDefault();
//       e.stopPropagation();
//       e.stopImmediatePropagation();

//       console.log(`🎯 Marker clicked: ${type} ${id}`);

//       // Immediate selection without delay
//       handleObjectSelect({ type, data });
//     });

//     // 🚀 FIX: Set higher offset to prevent map interference
//     const marker = new maptilersdk.Marker({ 
//       element: el, 
//       anchor: "center",
//       draggable: false,
//       // Higher offset ensures markers are above map layers
//       offset: [0, 0]
//     })
//     .setLngLat([lng, lat])
//     .addTo(mapRef.current);

//     markersRef.current.set(id, marker);
//     }
//   }, [handleObjectSelect]);


//   // Remove markers that are no longer visible
//   const removeInvalidMarkers = useCallback((validIds: Set<string>) => {
//     const currentIds = Array.from(markersRef.current.keys());
//     currentIds.forEach((id) => {
//       if (!validIds.has(id)) {
//         const marker = markersRef.current.get(id);
//         if (marker) {
//           marker.remove();
//           markersRef.current.delete(id);
//         }
//       }
//     });
//   }, []);

//   // Update markers whenever data or view mode changes
//   // useEffect(() => {
//   //   if (!mapRef.current || !isMapLoaded) return;

//   //   const validIds = new Set<string>();

//   //   if (viewMode === "all" || viewMode === "aircraft") {
//   //     aircraft.forEach((ac) => {
//   //       const id = `aircraft-${ac.hex}`;
//   //       validIds.add(id);
//   //       createOrUpdateMarker(id, ac.lat, ac.lng, "#3b82f6", "aircraft", ac);
//   //     });
//   //   }

//   //   if (viewMode === "all" || viewMode === "satellite") {
//   //     satellites.forEach((sat) => {
//   //       const id = `satellite-${sat.norad_id}`;
//   //       validIds.add(id);
//   //       createOrUpdateMarker(id, sat.lat, sat.lng, "#10b981", "satellite", sat);
//   //     });
//   //   }

//   //   if (viewMode === "all" || viewMode === "debris") {
//   //     debris.forEach((deb) => {
//   //       const id = `debris-${deb.norad_id}`;
//   //       validIds.add(id);
//   //       createOrUpdateMarker(id, deb.lat, deb.lng, "#ef4444", "debris", deb);
//   //     });
//   //   }

//   //   removeInvalidMarkers(validIds);

//   //   if (Math.random() < 0.01) {
//   //     console.log(`📍 Active markers: ${markersRef.current.size} | View: ${viewMode}`);
//   //   }
//   // }, [aircraft, satellites, debris, viewMode, isMapLoaded, createOrUpdateMarker, removeInvalidMarkers]);

//   // 🚀 Update markers with smooth transitions
//   useEffect(() => {
//     if (!mapRef.current || !isMapLoaded) return;

//     const validIds = new Set<string>();

//     if (viewMode === "all" || viewMode === "aircraft") {
//       filteredByViewport.aircraft.forEach((ac: Aircraft) => {
//         const id = `aircraft-${ac.hex}`;
//         validIds.add(id);
//         createOrUpdateMarker(id, ac.lat, ac.lng, "#3b82f6", "aircraft", ac);
//       });
//     }

//     if (viewMode === "all" || viewMode === "satellite") {
//       filteredByViewport.satellites.forEach((sat: SatelliteObject) => {
//         const id = `satellite-${sat.norad_id}`;
//         validIds.add(id);
//         createOrUpdateMarker(id, sat.lat, sat.lng, "#10b981", "satellite", sat);
//       });
//     }

//     if (viewMode === "all" || viewMode === "debris") {
//       filteredByViewport.debris.forEach((deb: SatelliteObject) => {
//         const id = `debris-${deb.norad_id}`;
//         validIds.add(id);
//         createOrUpdateMarker(id, deb.lat, deb.lng, "#ef4444", "debris", deb);
//       });
//     }

//     removeInvalidMarkers(validIds);
//   }, [filteredByViewport, viewMode, isMapLoaded, createOrUpdateMarker, removeInvalidMarkers]);


//   // Clean up
//   useEffect(() => {
//     return () => {
//       markersRef.current.forEach((marker) => marker.remove());
//       markersRef.current.clear();
//     };
//   }, []);

//   // const isLoading =
//   //   (aircraftLoading || satelliteLoading) &&
//   //   aircraft.length === 0 &&
//   //   satellites.length === 0;

//   return (
//     <>
//     <Suspense fallback={null}>
//         {showLoadingOverlay && (
//           <LoadingOverlay isLoading={true} message={loadingMessage} />
//         )}
//     </Suspense>

//       <MainLayout>
//         <MapContainer onMapLoad={handleMapLoad} />

//         <div className="absolute top-80 left-4 z-10">
//           <ViewModeToggle
//             viewMode={viewMode}
//             onViewModeChange={handleViewModeChange}
//           />
//         </div>

//         {/* ✅ FIXED: Use mapStatus to ensure correct types */}
//         {/* <div className="absolute top-4 left-4 z-10">
//           <StatsPanel
//             aircraftCount={aircraft.length}
//             satelliteCount={satellites.length}
//             debrisCount={debris.length}
//             lastUpdate={aircraftLastFetch ?? lastFetchTime}
//             aircraftStatus={mapStatus(aircraftStatus)}
//             satelliteStatus={mapStatus(satelliteStatus)}
//             debrisStatus={mapStatus(satelliteStatus)}
//             fps={fps}
//             onRefresh={handleRefresh}
//             isConnected={aircraftConnected || satelliteConnected}
//           />
//         </div> */}

//         {/* 🚀 ENHANCED: Stats panel with progressive rendering info */}
//         <div className="absolute top-4 left-4 z-10">
//           <StatsPanel
//             aircraftCount={renderStats.renderedAircraft}
//             satelliteCount={renderStats.renderedSatellites}
//             debrisCount={renderStats.renderedDebris}
//             lastUpdate={aircraftLastFetch ?? lastFetchTime}
//             aircraftStatus={mapStatus(aircraftStatus)}
//             satelliteStatus={mapStatus(satelliteStatus)}
//             debrisStatus={mapStatus(satelliteStatus)}
//             fps={fps}
//             onRefresh={handleRefresh}
//             isConnected={aircraftConnected || satelliteConnected}
//           />
//         </div>

//         {/* 🚀 Progressive Rendering Indicator */}
//         <div className="absolute bottom-43 left-40 z-10">

//           <div className="mt-2 bg-gradient-to-r from-blue-500/10 to-green-500/10 border border-blue-500 rounded-lg p-2 text-xs">
//             <div className="text-blue-400 font-semibold flex items-center gap-2">
//               <span>🎯</span>
//               <span>Progressive Rendering Active</span>
//             </div>
//             <div className="text-blue-300 mt-1 text-[11px]">
//               Zoom: {currentZoom.toFixed(1)} | Showing {renderStats.renderedAircraft + renderStats.renderedSatellites + renderStats.renderedDebris} of {renderStats.totalAircraft + renderStats.totalSatellites + renderStats.totalDebris}
//             </div>
//             <div className="text-green-400 text-[10px] mt-1 font-semibold">
//               {(((renderStats.totalAircraft + renderStats.totalSatellites + renderStats.totalDebris -
//                 renderStats.renderedAircraft - renderStats.renderedSatellites - renderStats.renderedDebris) /
//                 Math.max(1, renderStats.totalAircraft + renderStats.totalSatellites + renderStats.totalDebris)) * 100).toFixed(1)}% optimized
//             </div>
//             <div className="text-gray-400 text-[10px] mt-1">
//               Zoom in to see more objects
//             </div>
//           </div>
//         </div>

//         {selectedObject && (
//           <div className="absolute top-4 bottom-24 left-1/2 transform -translate-x-1/2 z-10 max-w-xl">
//             <ObjectDetailsCard
//               selectedObject={selectedObject}
//               onClose={() => handleObjectSelect(null)}
//             />
//           </div>
//         )}

//         <div className="absolute top-42 right-1 z-10 flex flex-col space-y-2 cursor-pointer">
//           <MapViewToggle isGlobeView={isGlobeView} onToggle={toggleGlobeView} />
//         </div>

//         <SearchPanel onSearch={handleSearch} />

//         <ObjectsList
//           aircraft={filteredAircraft}
//           satellites={filteredSatellites}
//           debris={filteredDebris}
//           onSelectObject={(data, type) => handleObjectSelect({ type, data })}
//           selectedObject={selectedObject}
//         />

//         {/* <LoadingOverlay isLoading={isLoading} /> */}
//       </MainLayout>

//       <div className="absolute bottom-15 left-1/2 -translate-x-1/2 flex flex-row gap-2 z-40">
//         <button
//           onClick={() => setShowNearbyFlights(!showNearbyFlights)}
//           className="px-2 py-2 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600 transition cursor-pointer"
//         >
//           📍 Nearby Flights
//         </button>

//         <button
//           onClick={() => {
//             if (selectedObject?.type === "aircraft") {
//               const selectedAircraft = selectedObject.data as Aircraft;
//               const airportCode = getAirportCodeFromAircraft(selectedAircraft);

//               if (airportCode) {
//                 setSelectedAirportCode(airportCode);
//                 setShowAirportBoard(true);
//               } else {
//                 alert("No airport information available for this flight.");
//               }
//             } else {
//               alert("Please select an aircraft first.");
//             }
//           }}
//           className="px-2 py-2 bg-green-500 text-white rounded-lg shadow-lg hover:bg-green-600 transition cursor-pointer"
//         >
//           ✈️ Airport Board
//         </button>

//         <button
//           onClick={() => {
//             if (selectedObject?.type === "aircraft") {
//               setSelectedPerformanceAircraft(selectedObject.data as Aircraft);
//               setShowAircraftPerformance(!showAircraftPerformance);
//             } else {
//               alert("Please select an aircraft first");
//             }
//           }}
//           className="px-2 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition cursor-pointer"
//         >
//           📊 Performance
//         </button>

//         <button
//           onClick={() => {
//             if (selectedObject?.type === "satellite") {
//               setSelectedSatelliteTracker(selectedObject.data as SatelliteObject);
//               setShowSatelliteTracker(!showSatelliteTracker);
//             } else {
//               alert("Please select a satellite first");
//             }
//           }}
//           className="px-2 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition cursor-pointer"
//         >
//           🛰️ Sat Tracker
//         </button>

//         <button
//           onClick={() => {
//             if (selectedObject?.type === "satellite") {
//               setSelectedOrbitSatellite(selectedObject.data as SatelliteObject);
//               setShowOrbitVisualizer(!showOrbitVisualizer);
//             } else {
//               alert("Please select a satellite first");
//             }
//           }}
//           className="px-2 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition cursor-pointer"
//         >
//           🪐 Orbit
//         </button>

//         {selectedObject?.type === "aircraft" && (
//           <button
//             onClick={() => {
//               const hex = (selectedObject.data as Aircraft).hex;
//               const historyResult = getFlightHistory(hex);
//               if (historyResult.success && historyResult.data) {
//                 setSelectedFlightHex(hex);
//                 setShowFlightReplay(true);
//               } else {
//                 alert("Not enough history data. Wait 1-2 minutes and try again.");
//               }
//             }}
//             className="px-2 py-2 bg-purple-500 text-white rounded-lg shadow-lg hover:bg-purple-600 transition cursor-pointer"
//           >
//             🔄 Replay Flight
//           </button>
//         )}
//       </div>

//       {showNearbyFlights && (
//         <div className="absolute left-[480px] top-16 z-40">
//           <NearbyFlightsPanel
//             allAircraft={aircraft}
//             onSelectFlight={(hex) => {
//               const flight = aircraft.find((a) => a.hex === hex);
//               if (flight) {
//                 handleObjectSelect({ type: "aircraft", data: flight });
//               }
//             }}
//             onClose={() => setShowNearbyFlights(false)}
//           />
//         </div>
//       )}

//       {showAirportBoard && (
//         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
//           <AirportLiveBoard
//             iataCode={selectedAirportCode}
//             onClose={() => setShowAirportBoard(false)}
//           />
//         </div>
//       )}

//       {showAircraftPerformance && selectedPerformanceAircraft && (
//         <PerformanceDashboard
//           aircraft={selectedPerformanceAircraft}
//           onClose={() => setShowAircraftPerformance(false)}
//         />
//       )}

//       {showSatelliteTracker && selectedSatelliteTracker && (
//         <SatelliteEnhancedPanel
//           satellite={selectedSatelliteTracker}
//           onClose={() => setShowSatelliteTracker(false)}
//         />
//       )}

//       {showOrbitVisualizer && selectedOrbitSatellite && (
//         <OrbitVisualizerPanel
//           satellite={selectedOrbitSatellite}
//           map={mapRef.current}
//           onClose={() => setShowOrbitVisualizer(false)}
//         />
//       )}

//       {showFlightReplay &&
//         selectedFlightHex &&
//         (() => {
//           const historyResult = getFlightHistory(selectedFlightHex);
//           if (historyResult.success && historyResult.data) {
//             return (
//               <FlightReplayControl
//                 history={historyResult.data}
//                 onPositionUpdate={handleReplayPositionUpdate}
//                 onClose={handleCloseReplay}
//               />
//             );
//           }
//           return null;
//         })()}
//     </>
//   );
// };

// export default App;


/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from "react";
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
import { recordFlightPosition, getFlightHistory } from "./services/flightHistoryService";
import FlightReplayControl from "./components/FlightReplay/FlightReplayControl";
import AirportLiveBoard from "./components/Airport/AirportLiveBoard";
import NearbyFlightsPanel from "./components/Nearby/NearbyFlightsPanel";
import PerformanceDashboard from "./components/Performance/PerformanceDashboard";
import SatelliteEnhancedPanel from "./components/Satellite/SatelliteEnhancedPanel";
import OrbitVisualizerPanel from "./components/Orbit/OrbitVisualizerPanel";
import { viewportManager } from "./utils/viewportManager";

const mapStatus = (status: 'idle' | 'ok' | 'error'): 'idle' | 'ok' | 'error' => status;

const App = () => {
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const markersRef = useRef<Map<string, maptilersdk.Marker>>(new Map());

  const [isGlobeView, setIsGlobeView] = useState(true);

  // Feature states
  const [showFlightReplay, setShowFlightReplay] = useState(false);
  const [showAirportBoard, setShowAirportBoard] = useState(false);
  const [showNearbyFlights, setShowNearbyFlights] = useState(false);
  const [selectedFlightHex, setSelectedFlightHex] = useState<string | null>(null);
  const [selectedAirportCode, setSelectedAirportCode] = useState("JFK");
  const [replayMarker, setReplayMarker] = useState<maptilersdk.Marker | null>(null);
  const [showAircraftPerformance, setShowAircraftPerformance] = useState(false);
  const [showSatelliteTracker, setShowSatelliteTracker] = useState(false);
  const [showOrbitVisualizer, setShowOrbitVisualizer] = useState(false);
  const [selectedPerformanceAircraft, setSelectedPerformanceAircraft] = useState<Aircraft | null>(null);
  const [selectedSatelliteTracker, setSelectedSatelliteTracker] = useState<SatelliteObject | null>(null);
  const [selectedOrbitSatellite, setSelectedOrbitSatellite] = useState<SatelliteObject | null>(null);

  // ⚡ OPTIMIZED: Progressive loading state
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Connecting to tracking system...");
  const [loadingProgress, setLoadingProgress] = useState(0);

  // ⚡ OPTIMIZED: Performance monitoring
  const [renderStats, setRenderStats] = useState({
    totalAircraft: 0,
    totalSatellites: 0,
    totalDebris: 0,
    renderedAircraft: 0,
    renderedSatellites: 0,
    renderedDebris: 0,
  });
  const [currentZoom, setCurrentZoom] = useState(1.5);
  const [isZooming, setIsZooming] = useState(false);

  // ⚡ OPTIMIZED: Marker batch rendering state
  const markerBatchQueueRef = useRef<Array<{
    id: string;
    lat: number;
    lng: number;
    color: string;
    type: "aircraft" | "satellite" | "debris";
    data: Aircraft | SatelliteObject;
  }>>([]);
  const isBatchProcessingRef = useRef(false);

  const toggleGlobeView = useCallback(() => {
    if (mapRef.current) {
      const newProjection = isGlobeView ? "mercator" : "globe";
      mapRef.current.setProjection(newProjection as maptilersdk.ProjectionSpecification);
      setIsGlobeView(!isGlobeView);
      console.log(`🌍 Switched to ${newProjection} view`);
    }
  }, [isGlobeView]);

  // ✅ Use WebSocket-powered hooks
  const {
    aircraft,
    lastFetchTime: aircraftLastFetch,
    status: aircraftStatus,
    refresh: refreshAircraft,
    isConnected: aircraftConnected,
  } = useAircraftData(5000);

  const {
    satellites,
    debris,
    lastFetchTime,
    status: satelliteStatus,
    refresh: refreshSatellites,
    isConnected: satelliteConnected,
  } = useSatelliteData(2000);

  // ⚡ OPTIMIZED: Progressive loading UI updates
  useEffect(() => {
    if (aircraftConnected) {
      setLoadingMessage("Receiving flight data...");
      setLoadingProgress(33);
    }

    if (aircraft.length > 0) {
      setLoadingMessage("Loading satellite data...");
      setLoadingProgress(66);
    }

    if ((satellites.length > 0 || debris.length > 0) && aircraft.length > 0) {
      setLoadingMessage("Rendering map markers...");
      setLoadingProgress(90);

      setTimeout(() => {
        setLoadingProgress(100);
        setTimeout(() => setShowLoadingOverlay(false), 300);
      }, 500);
    }
  }, [aircraftConnected, aircraft.length, satellites.length, debris.length]);

  // Log WebSocket connection status
  useEffect(() => {
    console.log('📡 WebSocket Status:', {
      aircraft: aircraftConnected ? '✅ Connected' : '❌ Disconnected',
      satellites: satelliteConnected ? '✅ Connected' : '❌ Disconnected',
    });
  }, [aircraftConnected, satelliteConnected]);

  const { viewMode, selectedObject, handleViewModeChange, handleObjectSelect } = useMapControls();

  // Record flight positions for history
  useEffect(() => {
    aircraft.forEach((a) => recordFlightPosition(a));
  }, [aircraft]);

  // ⚡ OPTIMIZED: Progressive viewport filtering with debouncing
  const filteredByViewport = useMemo(() => {
    // Don't filter during zoom transitions to prevent flickering
    if (isZooming) {
      return {
        aircraft: viewportManager.filterAircraft(aircraft),
        satellites: viewportManager.filterSatellites(satellites),
        debris: viewportManager.filterDebris(debris),
      };
    }

    const visibleAircraft = viewportManager.filterAircraft(aircraft);
    const visibleSatellites = viewportManager.filterSatellites(satellites);
    const visibleDebris = viewportManager.filterDebris(debris);

    setRenderStats({
      totalAircraft: aircraft.length,
      totalSatellites: satellites.length,
      totalDebris: debris.length,
      renderedAircraft: visibleAircraft.length,
      renderedSatellites: visibleSatellites.length,
      renderedDebris: visibleDebris.length,
    });

    return {
      aircraft: visibleAircraft,
      satellites: visibleSatellites,
      debris: visibleDebris,
    };
  }, [aircraft, satellites, debris, currentZoom, isZooming]);

  // Search & Filter
  const { handleSearch, filteredAircraft, filteredSatellites, filteredDebris } = useSearch(aircraft, satellites, debris);

  const fps = useFPS();
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // ⚡ CRITICAL: Map load handler with viewport manager
  const handleMapLoad = useCallback((map: maptilersdk.Map) => {
    mapRef.current = map;
    setIsMapLoaded(true);

    // 🚀 Initialize viewport manager with map
    viewportManager.setMap(map);

    // 🚀 Track zoom with debouncing
    let zoomTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastZoomUpdate = Date.now();

    map.on('zoomstart', () => {
      setIsZooming(true);
    });

    map.on('zoom', () => {
      const now = Date.now();

      // CRITICAL: Only update zoom every 500ms to prevent thrashing
      if (now - lastZoomUpdate < 500) return;

      lastZoomUpdate = now;
      const newZoom = map.getZoom();
      setCurrentZoom(newZoom);

      if (zoomTimeout) {
        clearTimeout(zoomTimeout);
      }

      zoomTimeout = setTimeout(() => {
        setIsZooming(false);
      }, 800);
    });

    map.on('zoomend', () => {
      setIsZooming(false);
      setCurrentZoom(map.getZoom());
    });

    setCurrentZoom(map.getZoom());
    console.log("✅ Map ready for markers");
  }, []);

  const handleRefresh = useCallback(() => {
    console.log("🔄 Manual refresh triggered");
    refreshAircraft();
    refreshSatellites();
  }, [refreshAircraft, refreshSatellites]);

  // ⚡ OPTIMIZED: Batched marker creation using requestAnimationFrame
  const processBatchedMarkers = useCallback(() => {
    if (isBatchProcessingRef.current || markerBatchQueueRef.current.length === 0) {
      return;
    }

    isBatchProcessingRef.current = true;
    const BATCH_SIZE = 10; // Process 10 markers per frame for 60 FPS

    const processNextBatch = () => {
      const batch = markerBatchQueueRef.current.splice(0, BATCH_SIZE);

      batch.forEach(({ id, lat, lng, color, type, data }) => {
        createMarkerImmediate(id, lat, lng, color, type, data);
      });

      if (markerBatchQueueRef.current.length > 0) {
        requestAnimationFrame(processNextBatch);
      } else {
        isBatchProcessingRef.current = false;
      }
    };

    requestAnimationFrame(processNextBatch);
  }, []);

  // 3. AGGRESSIVE MARKER CLEANUP (add this new function)
  const cleanupExcessMarkers = useCallback(() => {
    const markerCount = markersRef.current.size;

    // ⚡ CRITICAL: If more than 1500 markers, force cleanup
    if (markerCount > 1500) {
      console.warn(`⚠️ Too many markers (${markerCount}), forcing cleanup...`);

      // Remove all markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();

      // Clear batch queue
      markerBatchQueueRef.current = [];
      isBatchProcessingRef.current = false;

      console.log('✅ Markers cleaned up');
    }
  }, []);

  // 4. PERIODIC CLEANUP CHECK (add this useEffect)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      cleanupExcessMarkers();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(cleanupInterval);
  }, [cleanupExcessMarkers]);

  // ⚡ OPTIMIZED: Immediate marker creation (no validation delays)
  const createMarkerImmediate = useCallback((
    id: string,
    lat: number,
    lng: number,
    color: string,
    type: "aircraft" | "satellite" | "debris",
    data: Aircraft | SatelliteObject
  ) => {
    if (!mapRef.current) return;
    if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;

    const existingMarker = markersRef.current.get(id);
    if (existingMarker) {
      existingMarker.setLngLat([lng, lat]);
      return;
    }

    const el = document.createElement("div");
    const size = type === "debris" ? 16 : 24;
    el.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      border: 2px solid white;
      border-radius: 50%;
      cursor: pointer;
      transition: transform 0.2s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${type === "satellite" ? "10px" : "12px"};
      pointer-events: auto;
    `;
    el.className = "custom-marker";

    if (type === "aircraft") el.innerHTML = '<span style="pointer-events: none;">✈️</span>';
    else if (type === "satellite") el.innerHTML = '<span style="pointer-events: none;">🛰️</span>';
    else if (type === "debris") el.innerHTML = '<span style="pointer-events: none; font-size: 8px;">🔴</span>';

    // 🚀 FIXED: Improved event handling
    el.addEventListener("mouseenter", (e) => {
      e.stopPropagation();
      el.style.transform = "scale(1.3)";
      el.style.zIndex = "1000";
    });

    el.addEventListener("mouseleave", (e) => {
      e.stopPropagation();
      el.style.transform = "scale(1)";
      el.style.zIndex = "10";
    });

    el.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
    });

    el.addEventListener("mouseup", (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
    });

    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log(`🎯 Marker clicked: ${type} ${id}`);
      handleObjectSelect({ type, data });
    });

    const marker = new maptilersdk.Marker({
      element: el,
      anchor: "center",
      draggable: false,
      offset: [0, 0]
    })
      .setLngLat([lng, lat])
      .addTo(mapRef.current);

    markersRef.current.set(id, marker);
  }, [handleObjectSelect]);

  // ⚡ OPTIMIZED: Queue markers for batched creation
  const queueMarkerForBatch = useCallback((
    id: string,
    lat: number,
    lng: number,
    color: string,
    type: "aircraft" | "satellite" | "debris",
    data: Aircraft | SatelliteObject
  ) => {
    const existingMarker = markersRef.current.get(id);
    if (existingMarker) {
      // Update position immediately for existing markers
      existingMarker.setLngLat([lng, lat]);
      return;
    }

    // Queue new marker for batch processing
    markerBatchQueueRef.current.push({ id, lat, lng, color, type, data });
  }, []);

  // Remove invalid markers
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

  // ⚡ OPTIMIZED: Update markers with batched rendering
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    // ⚠️ Skip updates during zoom to prevent thrashing
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
  }, [filteredByViewport, viewMode, isMapLoaded, queueMarkerForBatch, removeInvalidMarkers, processBatchedMarkers]);

  // Cleanup markers
  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
    };
  }, []);

  // 🚀 Log viewport stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (renderStats.totalAircraft > 0 || renderStats.totalSatellites > 0) {
        const stats = viewportManager.getStats(
          renderStats.totalAircraft,
          renderStats.totalSatellites,
          renderStats.totalDebris,
          renderStats.renderedAircraft,
          renderStats.renderedSatellites,
          renderStats.renderedDebris
        );
        console.log(stats);
        // ⚠️ Performance warning
        const totalRendered = renderStats.renderedAircraft +
          renderStats.renderedSatellites +
          renderStats.renderedDebris;

        if (totalRendered > 1000) {
          console.warn(`⚠️ Performance warning: Rendering ${totalRendered} objects!`);
        }

        // 🔥 Critical warning
        if (totalRendered > 2000) {
          console.error(`🔥 CRITICAL: Rendering ${totalRendered} objects - expect lag!`);
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [renderStats]);

  // Cleanup replay marker
  useEffect(() => {
    if (!showFlightReplay && replayMarker) {
      replayMarker.remove();
      setReplayMarker(null);
    }
  }, [showFlightReplay, replayMarker]);

  // Handle replay position updates
  const handleReplayPositionUpdate = (lat: number, lng: number, alt: number, heading: number) => {
    if (!mapRef.current) return;
    const selectedAircraft = aircraft.find((a) => a.hex === selectedFlightHex);

    if (!replayMarker) {
      const el = document.createElement("div");
      el.className = "replay-marker";
      el.style.cssText = `
        width: 40px; height: 40px; background-color: #9333ea;
        border: 3px solid white; border-radius: 50%;
        box-shadow: 0 4px 12px rgba(147, 51, 234, 0.4);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; animation: pulse 2s infinite; position: relative;
      `;
      el.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
        <path d="M21,16v-2l-8-5V3.5C13,2.67,12.33,2,11.5,2S10,2.67,10,3.5V9l-8,5v2l8-2.5V19l-2,1.5V22l3.5-1l3.5,1v-1.5L13,19v-5.5L21,16z"/>
      </svg>`;
      el.style.transform = `rotate(${heading}deg)`;

      const marker = new maptilersdk.Marker({ element: el, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);

      const popup = new maptilersdk.Popup({ offset: 30, closeButton: false, className: "replay-popup" })
        .setHTML(`<div style="padding: 8px; min-width: 180px;">
          <div style="font-weight: bold; color: #9333ea; margin-bottom: 8px; font-size: 14px;">🔄 REPLAY MODE</div>
          <div style="font-size: 13px; color: #1f2937; margin-bottom: 4px;">
            <strong>Flight:</strong> ${selectedAircraft?.flight_icao || selectedFlightHex}
          </div>
          <div style="font-size: 12px; color: #6b7280; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div><strong>Alt:</strong> ${alt.toLocaleString()} ft</div>
            <div><strong>Hdg:</strong> ${heading.toFixed(0)}°</div>
            <div><strong>Type:</strong> ${selectedAircraft?.aircraft_icao || "N/A"}</div>
            <div><strong>Airline:</strong> ${selectedAircraft?.airline_icao || "N/A"}</div>
          </div>
        </div>`);

      marker.setPopup(popup);
      popup.addTo(mapRef.current);
      setReplayMarker(marker);
      mapRef.current.easeTo({ center: [lng, lat], zoom: 10, duration: 1500, essential: true });
    } else {
      replayMarker.setLngLat([lng, lat]);
      const markerElement = replayMarker.getElement();
      if (markerElement) markerElement.style.transform = `rotate(${heading}deg)`;
      const popup = replayMarker.getPopup();
      if (popup) {
        popup.setHTML(`<div style="padding: 8px; min-width: 180px;">
          <div style="font-weight: bold; color: #9333ea; margin-bottom: 8px; font-size: 14px;">🔄 REPLAY MODE</div>
          <div style="font-size: 13px; color: #1f2937; margin-bottom: 4px;">
            <strong>Flight:</strong> ${selectedAircraft?.flight_icao || selectedFlightHex}
          </div>
          <div style="font-size: 12px; color: #6b7280; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div><strong>Alt:</strong> ${alt.toLocaleString()} ft</div>
            <div><strong>Hdg:</strong> ${heading.toFixed(0)}°</div>
            <div><strong>Type:</strong> ${selectedAircraft?.aircraft_icao || "N/A"}</div>
            <div><strong>Airline:</strong> ${selectedAircraft?.airline_icao || "N/A"}</div>
          </div>
        </div>`);
      }
    }
  };

  const handleCloseReplay = () => {
    setShowFlightReplay(false);
    if (replayMarker) {
      replayMarker.remove();
      setReplayMarker(null);
    }
  };

  const getAirportCodeFromAircraft = (aircraft: Aircraft): string | null => {
    if (aircraft.arr_iata) return aircraft.arr_iata;
    if (aircraft.dep_iata) return aircraft.dep_iata;
    if (aircraft.arr_icao) return aircraft.arr_icao;
    if (aircraft.dep_icao) return aircraft.dep_icao;
    return null;
  };

  return (
    <>
      <Suspense fallback={null}>
        {showLoadingOverlay && (
          <LoadingOverlay
            isLoading={true}
            message={loadingMessage}
            progress={loadingProgress}
          />
        )}
      </Suspense>

      <MainLayout>
        <MapContainer onMapLoad={handleMapLoad} />

        <div className="absolute top-80 left-4 z-10">
          <ViewModeToggle viewMode={viewMode} onViewModeChange={handleViewModeChange} />
        </div>

        {/* ⚡ ENHANCED: Stats panel with progressive rendering info */}
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

        {/* 🚀 Progressive Rendering Indicator */}
        <div className="absolute bottom-43 left-40 z-10">
          <div className="mt-2 bg-gradient-to-r from-blue-500/10 to-green-500/10 border border-blue-500 rounded-lg p-2 text-xs">
            <div className="text-blue-400 font-semibold flex items-center gap-2">
              <span>🎯</span>
              <span>Progressive Rendering Active</span>
            </div>
            <div className="text-blue-300 mt-1 text-[11px]">
              Zoom: {currentZoom.toFixed(1)} | Showing {renderStats.renderedAircraft + renderStats.renderedSatellites + renderStats.renderedDebris} of {renderStats.totalAircraft + renderStats.totalSatellites + renderStats.totalDebris}
            </div>
            <div className="text-green-400 text-[10px] mt-1 font-semibold">
              {(((renderStats.totalAircraft + renderStats.totalSatellites + renderStats.totalDebris -
                renderStats.renderedAircraft - renderStats.renderedSatellites - renderStats.renderedDebris) /
                Math.max(1, renderStats.totalAircraft + renderStats.totalSatellites + renderStats.totalDebris)) * 100).toFixed(1)}% optimized
            </div>
            <div className="text-gray-400 text-[10px] mt-1">
              Zoom in to see more objects
            </div>
          </div>
        </div>

        {selectedObject && (
          <div className="absolute top-2 bottom-12 left-1/2 transform -translate-x-1/2 z-10 max-w-xl">
            <ObjectDetailsCard selectedObject={selectedObject} onClose={() => handleObjectSelect(null)} />
          </div>
        )}
 

        <div className="absolute top-42 right-1 z-10 flex flex-col space-y-2 cursor-pointer">
          <MapViewToggle isGlobeView={isGlobeView} onToggle={toggleGlobeView} />
        </div>

        <SearchPanel onSearch={handleSearch} />

        <ObjectsList
          aircraft={filteredAircraft}
          satellites={filteredSatellites}
          debris={filteredDebris}
          onSelectObject={(data, type) => handleObjectSelect({ type, data })}
          selectedObject={selectedObject}
        />
      </MainLayout>

      {/* Feature Buttons */}
      <div className="relative bottom-24 left-1/2 -translate-x-1/2 flex flex-row justify-center gap-2 z-40">
        <button onClick={() => setShowNearbyFlights(!showNearbyFlights)}
          className="px-3 py-2 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600 transition cursor-pointer">
          📍 Nearby Flights
        </button>

        <button onClick={() => {
          if (selectedObject?.type === "aircraft") {
            const selectedAircraft = selectedObject.data as Aircraft;
            const airportCode = getAirportCodeFromAircraft(selectedAircraft);
            if (airportCode) {
              setSelectedAirportCode(airportCode);
              setShowAirportBoard(true);
            } else alert("No airport information available for this flight.");
          } else alert("Please select an aircraft first.");
        }} className="px-3 py-2 bg-green-500 text-white rounded-lg shadow-lg hover:bg-green-600 transition cursor-pointer">
          ✈️ Airport Board
        </button>

        <button onClick={() => {
          if (selectedObject?.type === "aircraft") {
            setSelectedPerformanceAircraft(selectedObject.data as Aircraft);
            setShowAircraftPerformance(!showAircraftPerformance);
          } else alert("Please select an aircraft first");
        }} className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition cursor-pointer">
          📊 Performance
        </button>

        <button onClick={() => {
          if (selectedObject?.type === "satellite") {
            setSelectedSatelliteTracker(selectedObject.data as SatelliteObject);
            setShowSatelliteTracker(!showSatelliteTracker);
          } else alert("Please select a satellite first");
        }} className="px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition cursor-pointer">
          🛰️ Sat Tracker
        </button>

        <button onClick={() => {
          if (selectedObject?.type === "satellite") {
            setSelectedOrbitSatellite(selectedObject.data as SatelliteObject);
            setShowOrbitVisualizer(!showOrbitVisualizer);
          } else alert("Please select a satellite first");
        }} className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition cursor-pointer">
          🪐 Orbit
        </button>

        {selectedObject?.type === "aircraft" && (
          <button onClick={() => {
            const hex = (selectedObject.data as Aircraft).hex;
            const historyResult = getFlightHistory(hex);
            if (historyResult.success && historyResult.data) {
              setSelectedFlightHex(hex);
              setShowFlightReplay(true);
            } else alert("Not enough history data. Wait 1-2 minutes and try again.");
          }} className="px-3 py-2 bg-purple-500 text-white rounded-lg shadow-lg hover:bg-purple-600 transition cursor-pointer">
            🔄 Replay Flight
          </button>
        )}
      </div>

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

      {showAirportBoard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <AirportLiveBoard
            iataCode={selectedAirportCode}
            onClose={() => setShowAirportBoard(false)}
          />
        </div>
      )}

      {showAircraftPerformance && selectedPerformanceAircraft && (
        <PerformanceDashboard
          aircraft={selectedPerformanceAircraft}
          onClose={() => setShowAircraftPerformance(false)}
        />
      )}

      {showSatelliteTracker && selectedSatelliteTracker && (
        <SatelliteEnhancedPanel
          satellite={selectedSatelliteTracker}
          onClose={() => setShowSatelliteTracker(false)}
        />
      )}

      {showOrbitVisualizer && selectedOrbitSatellite && (
        <OrbitVisualizerPanel
          satellite={selectedOrbitSatellite}
          map={mapRef.current}
          onClose={() => setShowOrbitVisualizer(false)}
        />
      )}

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