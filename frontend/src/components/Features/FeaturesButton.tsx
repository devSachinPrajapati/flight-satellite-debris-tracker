import { useState, useCallback, useEffect, useRef } from "react";
import type { Aircraft, SatelliteObject, SelectedObject  } from "../../types";
import { infoToast, warningToast } from "../../utils/toast";
import AirportLiveBoard from "../Airport/AirportLiveBoard";
import NearbyFlightsPanel from "../Nearby/NearbyFlightsPanel";
import PerformanceDashboard from "../Performance/PerformanceDashboard";
import SatelliteEnhancedPanel from "../Satellite/SatelliteEnhancedPanel";
import OrbitVisualizerPanel from "../Orbit/OrbitVisualizerPanel";
import * as maptilersdk from "@maptiler/sdk";

interface FeatureButtonsProps {
  selectedObject: SelectedObject | null;
  aircraft: Aircraft[];
  mapRef: React.MutableRefObject<maptilersdk.Map | null>;
  onObjectSelect: (data: SelectedObject | null) => void;
}

// Feature type definition for better state management
type ActiveFeature = 'nearby' | 'airport' | 'performance' | 'satellite' | 'orbit' | null;

const FeatureButtons: React.FC<FeatureButtonsProps> = ({
  selectedObject,
  aircraft,
  mapRef,
  onObjectSelect,
}) => {
  //   Single active feature state (only one panel open at a time)
  const [activeFeature, setActiveFeature] = useState<ActiveFeature>(null);

  // Selected items for panels
  const [selectedAirportCode, setSelectedAirportCode] = useState("JFK");
  const [selectedPerformanceAircraft, setSelectedPerformanceAircraft] = useState<Aircraft | null>(null);
  const [selectedSatelliteTracker, setSelectedSatelliteTracker] = useState<SatelliteObject | null>(null);
  const [selectedOrbitSatellite, setSelectedOrbitSatellite] = useState<SatelliteObject | null>(null);
  //   NEW: Selected aircraft for nearby flights
  const [selectedNearbyAircraft, setSelectedNearbyAircraft] = useState<Aircraft | null>(null);

  //   Track previous selected object to detect changes
  const prevSelectedObjectRef = useRef<SelectedObject | null>(null);

  //   Auto-update feature panels when selected object changes
  useEffect(() => {
    const prevObject = prevSelectedObjectRef.current;
    const currentObject = selectedObject;

    // Update ref
    prevSelectedObjectRef.current = currentObject;

    // No active feature or no object selected - do nothing
    if (!activeFeature || !currentObject) return;

    // Check if object actually changed
    const objectChanged = 
      !prevObject ||
      prevObject.type !== currentObject.type ||
      (prevObject.type === 'aircraft' && currentObject.type === 'aircraft' && 
       (prevObject.data as Aircraft).hex !== (currentObject.data as Aircraft).hex) ||
      ((prevObject.type === 'satellite' || prevObject.type === 'debris') && 
       (currentObject.type === 'satellite' || currentObject.type === 'debris') &&
       (prevObject.data as SatelliteObject).norad_id !== (currentObject.data as SatelliteObject).norad_id);

    if (!objectChanged) return;

    console.log('🔄 Object changed, updating active feature:', activeFeature);

    //   Auto-update the active feature panel with new object
    switch (activeFeature) {
      case 'nearby':
        //   NEW: Update nearby flights when aircraft changes
        if (currentObject.type === 'aircraft') {
          setSelectedNearbyAircraft(currentObject.data as Aircraft);
          console.log('  Updated nearby flights center aircraft:', (currentObject.data as Aircraft).hex);
        } else {
          setActiveFeature(null);
          infoToast("Nearby flights requires aircraft selection.");
        }
        break;

      case 'airport':
        if (currentObject.type === 'aircraft') {
          const aircraft = currentObject.data as Aircraft;
          const airportCode = getAirportCodeFromAircraft(aircraft);
          if (airportCode) {
            setSelectedAirportCode(airportCode);
          } else {
            setActiveFeature(null);
            warningToast("No airport information available for this flight.");
          }
        } else {
          setActiveFeature(null);
          infoToast("Airport board requires aircraft selection.");
        }
        break;

      case 'performance':
        if (currentObject.type === 'aircraft') {
          setSelectedPerformanceAircraft(currentObject.data as Aircraft);
          console.log('  Updated performance aircraft:', (currentObject.data as Aircraft).hex);
        } else {
          setActiveFeature(null);
          infoToast("Performance dashboard requires aircraft selection.");
        }
        break;

      case 'satellite':
        if (currentObject.type === 'satellite') {
          setSelectedSatelliteTracker(currentObject.data as SatelliteObject);
        } else {
          setActiveFeature(null);
          infoToast("Satellite tracker requires satellite selection.");
        }
        break;

      case 'orbit':
        if (currentObject.type === 'satellite') {
          setSelectedOrbitSatellite(currentObject.data as SatelliteObject);
        } else {
          setActiveFeature(null);
          infoToast("Orbit visualizer requires satellite selection.");
        }
        break;
    }
  }, [selectedObject, activeFeature]);

  // Helper function to get airport code from aircraft
  const getAirportCodeFromAircraft = useCallback((aircraft: Aircraft): string | null => {
    if (aircraft.arr_iata) return aircraft.arr_iata;
    if (aircraft.dep_iata) return aircraft.dep_iata;
    if (aircraft.arr_icao) return aircraft.arr_icao;
    if (aircraft.dep_icao) return aircraft.dep_icao;
    return null;
  }, []);

  //   Button handlers
  const handleNearbyFlights = useCallback(() => {
    if (selectedObject?.type === 'aircraft') {
      setSelectedNearbyAircraft(selectedObject.data as Aircraft);
      setActiveFeature(activeFeature === 'nearby' ? null : 'nearby');
    } else {
      infoToast("Please select an aircraft first.");
    }
  }, [selectedObject, activeFeature]);

  const handleAirportBoard = useCallback(() => {
    if (selectedObject?.type === 'aircraft') {
      const selectedAircraft = selectedObject.data as Aircraft;
      const airportCode = getAirportCodeFromAircraft(selectedAircraft);
      if (airportCode) {
        setSelectedAirportCode(airportCode);
        setActiveFeature(activeFeature === 'airport' ? null : 'airport');
      } else {
        warningToast("No airport information available for this flight.");
      }
    } else {
      infoToast("Please select an aircraft first.");
    }
  }, [selectedObject, getAirportCodeFromAircraft, activeFeature]);

  const handlePerformance = useCallback(() => {
    if (selectedObject?.type === 'aircraft') {
      setSelectedPerformanceAircraft(selectedObject.data as Aircraft);
      setActiveFeature(activeFeature === 'performance' ? null : 'performance');
    } else {
      infoToast("Please select an aircraft first");
    }
  }, [selectedObject, activeFeature]);

  const handleSatelliteTracker = useCallback(() => {
    if (selectedObject?.type === 'satellite') {
      setSelectedSatelliteTracker(selectedObject.data as SatelliteObject);
      setActiveFeature(activeFeature === 'satellite' ? null : 'satellite');
    } else {
      infoToast("Please select a satellite first");
    }
  }, [selectedObject, activeFeature]);

  const handleOrbitVisualizer = useCallback(() => {
    if (selectedObject?.type === 'satellite') {
      setSelectedOrbitSatellite(selectedObject.data as SatelliteObject);
      setActiveFeature(activeFeature === 'orbit' ? null : 'orbit');
    } else {
      infoToast("Please select a satellite first");
    }
  }, [selectedObject, activeFeature]);

  //   Generic close handler
  const handleCloseFeature = useCallback(() => {
    setActiveFeature(null);
  }, []);

  return (
    <>
      {/* Feature Buttons - Bottom Center */}
      <div className="relative bottom-24 left-1/2 -translate-x-1/2 flex flex-row justify-center gap-2 z-40">
        <button
          onClick={handleNearbyFlights}
          className={`px-3 py-2 rounded-lg shadow-lg transition cursor-pointer ${
            activeFeature === 'nearby' 
              ? 'bg-blue-600 text-white' 
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          📍 Nearby Flights
        </button>

        <button
          onClick={handleAirportBoard}
          className={`px-3 py-2 rounded-lg shadow-lg transition cursor-pointer ${
            activeFeature === 'airport' 
              ? 'bg-green-600 text-white' 
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          ✈️ Airport Board
        </button>

        <button
          onClick={handlePerformance}
          className={`px-3 py-2 rounded-lg transition cursor-pointer ${
            activeFeature === 'performance' 
              ? 'bg-orange-600 text-white' 
              : 'bg-orange-500 text-white hover:bg-orange-600'
          }`}
        >
          📊 Aircraft Performance
        </button>

        <button
          onClick={handleSatelliteTracker}
          className={`px-3 py-2 rounded-lg transition cursor-pointer ${
            activeFeature === 'satellite' 
              ? 'bg-teal-600 text-white' 
              : 'bg-teal-500 text-white hover:bg-teal-600'
          }`}
        >
          🛰️ Satellite Tracker
        </button>

        <button
          onClick={handleOrbitVisualizer}
          className={`px-3 py-2 rounded-lg transition cursor-pointer ${
            activeFeature === 'orbit' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-indigo-500 text-white hover:bg-indigo-600'
          }`}
        >
          🪐 Orbit Visualizer
        </button>
      </div>

      {/*   FIXED: Feature Panels - Only one visible at a time */}
      {/*   NEW: NearbyFlightsPanel now requires selected aircraft */}
      {activeFeature === 'nearby' && selectedNearbyAircraft && (
        <div className="absolute left-[57rem] top-1 z-40">
          <NearbyFlightsPanel
            selectedAircraft={selectedNearbyAircraft}
            allAircraft={aircraft}
            onSelectFlight={(hex) => {
              const flight = aircraft.find((a) => a.hex === hex);
              if (flight) {
                onObjectSelect({ type: "aircraft", data: flight });
              }
            }}
            onClose={handleCloseFeature}
          />
        </div>
      )}

      {activeFeature === 'airport' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <AirportLiveBoard
            iataCode={selectedAirportCode}
            onClose={handleCloseFeature}
          />
        </div>
      )}

      {activeFeature === 'performance' && selectedPerformanceAircraft && (
        <PerformanceDashboard
          aircraft={selectedPerformanceAircraft}
          onClose={handleCloseFeature}
        />
      )}

      {activeFeature === 'satellite' && selectedSatelliteTracker && (
        <SatelliteEnhancedPanel
          satellite={selectedSatelliteTracker}
          onClose={handleCloseFeature}
        />
      )}

      {activeFeature === 'orbit' && selectedOrbitSatellite && (
        <OrbitVisualizerPanel
          satellite={selectedOrbitSatellite}
          map={mapRef.current}
          onClose={handleCloseFeature}
        />
      )}
    </>
  );
};

export default FeatureButtons;