import { useState, useCallback } from "react";
import type { Aircraft, SatelliteObject, SelectedObject  } from "../../types";
import { getFlightHistory } from "../../services/flightHistoryService";
import { errorToast, infoToast, warningToast } from "../../utils/toast";
// import FlightReplayControl from "../FlightReplay/FlightReplayControl";
import AirportLiveBoard from "../Airport/AirportLiveBoard";
import NearbyFlightsPanel from "../Nearby/NearbyFlightsPanel";
import PerformanceDashboard from "../Performance/PerformanceDashboard";
import SatelliteEnhancedPanel from "../Satellite/SatelliteEnhancedPanel";
import OrbitVisualizerPanel from "../Orbit/OrbitVisualizerPanel";
import * as maptilersdk from "@maptiler/sdk";

// type ObjectType = "aircraft" | "satellite" | "debris";

// interface SelectedObject {
//   type: ObjectType;
//   data: Aircraft | SatelliteObject;
// }

interface FeatureButtonsProps {
  selectedObject: SelectedObject | null;
  aircraft: Aircraft[];
  mapRef: React.MutableRefObject<maptilersdk.Map | null>;
  onObjectSelect: (data: SelectedObject | null) => void;
  replayMarker: maptilersdk.Marker | null;
  setReplayMarker: (marker: maptilersdk.Marker | null) => void;
  // onReplayPositionUpdate: (lat: number, lng: number, alt: number, heading: number) => void;
}

const FeatureButtons: React.FC<FeatureButtonsProps> = ({
  selectedObject,
  aircraft,
  mapRef,
  onObjectSelect,
  // replayMarker,
  // setReplayMarker,
  // onReplayPositionUpdate,
}) => {
  // Feature panel states
  const [showNearbyFlights, setShowNearbyFlights] = useState(false);
  const [showAirportBoard, setShowAirportBoard] = useState(false);
  const [showAircraftPerformance, setShowAircraftPerformance] = useState(false);
  const [showSatelliteTracker, setShowSatelliteTracker] = useState(false);
  const [showOrbitVisualizer, setShowOrbitVisualizer] = useState(false);
  const [showFlightReplay, setShowFlightReplay] = useState(false);

  // Selected items for panels
  const [selectedAirportCode, setSelectedAirportCode] = useState("JFK");
  const [selectedPerformanceAircraft, setSelectedPerformanceAircraft] = useState<Aircraft | null>(null);
  const [selectedSatelliteTracker, setSelectedSatelliteTracker] = useState<SatelliteObject | null>(null);
  const [selectedOrbitSatellite, setSelectedOrbitSatellite] = useState<SatelliteObject | null>(null);
  const [selectedFlightHex, setSelectedFlightHex] = useState<string | null>(null);

  console.log(`FeatureButtons render ${showFlightReplay} ${selectedFlightHex}`);
  // Helper function to get airport code from aircraft
  const getAirportCodeFromAircraft = useCallback((aircraft: Aircraft): string | null => {
    if (aircraft.arr_iata) return aircraft.arr_iata;
    if (aircraft.dep_iata) return aircraft.dep_iata;
    if (aircraft.arr_icao) return aircraft.arr_icao;
    if (aircraft.dep_icao) return aircraft.dep_icao;
    return null;
  }, []);

  // Button Handlers
  const handleNearbyFlights = useCallback(() => {
    setShowNearbyFlights(!showNearbyFlights);
  }, [showNearbyFlights]);

  const handleAirportBoard = useCallback(() => {
    if (selectedObject?.type === "aircraft") {
      const selectedAircraft = selectedObject.data as Aircraft;
      const airportCode = getAirportCodeFromAircraft(selectedAircraft);
      if (airportCode) {
        setSelectedAirportCode(airportCode);
        setShowAirportBoard(true);
      } else {
        warningToast("No airport information available for this flight.");
      }
    } else {
      infoToast("Please select an aircraft first.");
    }
  }, [selectedObject, getAirportCodeFromAircraft]);

  const handlePerformance = useCallback(() => {
    if (selectedObject?.type === "aircraft") {
      setSelectedPerformanceAircraft(selectedObject.data as Aircraft);
      setShowAircraftPerformance(!showAircraftPerformance);
    } else {
      infoToast("Please select an aircraft first");
    }
  }, [selectedObject, showAircraftPerformance]);

  const handleSatelliteTracker = useCallback(() => {
    if (selectedObject?.type === "satellite") {
      setSelectedSatelliteTracker(selectedObject.data as SatelliteObject);
      setShowSatelliteTracker(!showSatelliteTracker);
    } else {
      infoToast("Please select a satellite first");
    }
  }, [selectedObject, showSatelliteTracker]);

  const handleOrbitVisualizer = useCallback(() => {
    if (selectedObject?.type === "satellite") {
      setSelectedOrbitSatellite(selectedObject.data as SatelliteObject);
      setShowOrbitVisualizer(!showOrbitVisualizer);
    } else {
      infoToast("Please select a satellite first");
    }
  }, [selectedObject, showOrbitVisualizer]);

  const handleReplayFlight = useCallback(() => {
    if (selectedObject?.type === "aircraft") {
      const hex = (selectedObject.data as Aircraft).hex;
      const historyResult = getFlightHistory(hex);
      if (historyResult.success && historyResult.data) {
        setSelectedFlightHex(hex);
        setShowFlightReplay(true);
      } else {
        errorToast("Not enough history data. Wait 1–2 minutes and try again.");
      }
    }
  }, [selectedObject]);

  // const handleCloseReplay = useCallback(() => {
  //   setShowFlightReplay(false);
  //   if (replayMarker) {
  //     replayMarker.remove();
  //     setReplayMarker(null);
  //   }
  // }, [replayMarker, setReplayMarker]);

  return (
    <>
      {/* Feature Buttons - Bottom Center */}
      <div className="relative bottom-24 left-1/2 -translate-x-1/2 flex flex-row justify-center gap-2 z-40">
        <button
          onClick={handleNearbyFlights}
          className="px-3 py-2 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600 transition cursor-pointer"
        >
          📍 Nearby Flights
        </button>

        <button
          onClick={handleAirportBoard}
          className="px-3 py-2 bg-green-500 text-white rounded-lg shadow-lg hover:bg-green-600 transition cursor-pointer"
        >
          ✈️ Airport Board
        </button>

        <button
          onClick={handlePerformance}
          className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition cursor-pointer"
        >
          📊 Performance
        </button>

        <button
          onClick={handleSatelliteTracker}
          className="px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition cursor-pointer"
        >
          🛰️ Sat Tracker
        </button>

        <button
          onClick={handleOrbitVisualizer}
          className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition cursor-pointer"
        >
          🪐 Orbit
        </button>

        {selectedObject?.type === "aircraft" && (
          <button
            onClick={handleReplayFlight}
            className="px-3 py-2 bg-purple-500 text-white rounded-lg shadow-lg hover:bg-purple-600 transition cursor-pointer"
          >
            🔄 Replay Flight
          </button>
        )}
      </div>

      {/* Feature Panels */}
      {showNearbyFlights && (
        <div className="absolute left-[480px] top-16 z-40">
          <NearbyFlightsPanel
            allAircraft={aircraft}
            onSelectFlight={(hex) => {
              const flight = aircraft.find((a) => a.hex === hex);
              if (flight) {
                onObjectSelect({ type: "aircraft", data: flight });
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

      {/* {showFlightReplay &&
        selectedFlightHex &&
        (() => {
          const historyResult = getFlightHistory(selectedFlightHex);
          if (historyResult.success && historyResult.data) {
            return (
              <FlightReplayControl
                history={historyResult.data}
                onPositionUpdate={onReplayPositionUpdate}
                onClose={handleCloseReplay}
              />
            );
          }
          return null;
        })()} */}
    </>
  );
};

export default FeatureButtons;