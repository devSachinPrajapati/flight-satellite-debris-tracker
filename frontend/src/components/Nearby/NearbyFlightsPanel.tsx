/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useMemo, useRef } from "react";
import type { Aircraft, NearbyFlight } from "../../types";
import {
  findNearbyFlightsAroundAircraft,
  findLowestAltitudeAircraft,
  findFastestAircraft,
  findClosestAircraft,
  findSameDirectionFlights,
  findSimilarAltitudeFlights,
  bearingToCompass,
  getRelativePositionDescription,
} from "../../services/nearbyFlightsService";

interface NearbyFlightsPanelProps {
  selectedAircraft: Aircraft;
  allAircraft: Aircraft[];
  onSelectFlight: (hex: string) => void;
  onClose?: () => void;
}

// ✅ FIX: Helper function to convert km to nautical miles
const kmToNauticalMiles = (km: number): string => {
  const nm = km * 0.539957; // 1 km = 0.539957 nautical miles
  if (nm < 1) {
    return `${nm.toFixed(2)} nm`;
  } else if (nm < 10) {
    return `${nm.toFixed(1)} nm`;
  } else {
    return `${Math.round(nm)} nm`;
  }
};

const NearbyFlightsPanel = ({
  selectedAircraft,
  allAircraft,
  onSelectFlight,
  onClose,
}: NearbyFlightsPanelProps) => {
  const [nearbyFlights, setNearbyFlights] = useState<NearbyFlight[]>([]);
  const [radiusKm, setRadiusKm] = useState(500);
  const [showSameDirection, setShowSameDirection] = useState(false);
  const [showSimilarAltitude, setShowSimilarAltitude] = useState(false);
  
  // ✅ FIX: Use ref to persist displayLimit across re-renders
  const [displayLimit, setDisplayLimit] = useState(20);
  const displayLimitRef = useRef(20);
  
  // ✅ FIX: Track when filters change to reset pagination
  const prevFiltersRef = useRef({ radiusKm, showSameDirection, showSimilarAltitude });
  
  const ITEMS_PER_PAGE = 20;

  // Update nearby flights when selected aircraft or filters change
  useEffect(() => {
    const result = findNearbyFlightsAroundAircraft(
      allAircraft,
      selectedAircraft,
      radiusKm
    );

    if (result.success && result.data) {
      let filtered = result.data;

      // Apply direction filter
      if (showSameDirection) {
        filtered = findSameDirectionFlights(filtered, selectedAircraft, 30);
      }

      // Apply altitude filter
      if (showSimilarAltitude) {
        filtered = findSimilarAltitudeFlights(filtered, selectedAircraft, 2000);
      }

      // ✅ FIX: Only reset displayLimit when filters actually change
      const filtersChanged = 
        prevFiltersRef.current.radiusKm !== radiusKm ||
        prevFiltersRef.current.showSameDirection !== showSameDirection ||
        prevFiltersRef.current.showSimilarAltitude !== showSimilarAltitude;

      if (filtersChanged) {
        setDisplayLimit(ITEMS_PER_PAGE);
        displayLimitRef.current = ITEMS_PER_PAGE;
        prevFiltersRef.current = { radiusKm, showSameDirection, showSimilarAltitude };
      } else {
        // ✅ FIX: Preserve current displayLimit when only data updates
        // This prevents reset when WebSocket updates come in
        setDisplayLimit(prev => Math.min(prev, filtered.length || ITEMS_PER_PAGE));
      }

      setNearbyFlights(filtered);
    }
  }, [selectedAircraft, allAircraft, radiusKm, showSameDirection, showSimilarAltitude]);

  const closest = useMemo(() => findClosestAircraft(nearbyFlights), [nearbyFlights]);
  const fastest = useMemo(() => findFastestAircraft(nearbyFlights), [nearbyFlights]);
  const lowest = useMemo(() => findLowestAltitudeAircraft(nearbyFlights), [nearbyFlights]);

  const totalFlights = nearbyFlights.length;
  
  // ✅ Stable calculations - only depend on what actually changes
  const displayedFlights = useMemo(() => {
    return nearbyFlights.slice(0, displayLimit);
  }, [nearbyFlights, displayLimit]);
  
  const hasMore = displayLimit < totalFlights;

  const handleLoadMore = () => {
    setDisplayLimit(prev => {
      const newLimit = Math.min(prev + ITEMS_PER_PAGE, totalFlights);
      displayLimitRef.current = newLimit;
      return newLimit;
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[420px] flex flex-col max-h-[calc(100vh-10px)]">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Nearby Flights
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Around <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedAircraft.flight_icao || selectedAircraft.hex}</span>
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:dark:text-gray-200 transition cursor-pointer"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Selected Aircraft Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 border border-blue-200 dark:border-blue-800">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Position:</span>
              <div className="font-mono text-[10px] text-gray-900 dark:text-white truncate">
                {selectedAircraft.lat.toFixed(2)}°, {selectedAircraft.lng.toFixed(2)}°
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Altitude:</span>
              <div className="font-semibold text-gray-900 dark:text-white">
                {selectedAircraft.alt.toLocaleString()} ft
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Heading:</span>
              <div className="font-semibold text-gray-900 dark:text-white">
                {selectedAircraft.dir}° ({bearingToCompass(selectedAircraft.dir)})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
        {/* Radius Selector Row */}
        <div className="flex items-center justify-between mb-2">
          <select
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-blue-500 flex-1 mr-2"
          >
            {/* ✅ FIX: Show both km and nm for clarity */}
            <option value={100}>100 km (54 nm)</option>
            <option value={250}>250 km (135 nm)</option>
            <option value={500}>500 km (270 nm)</option>
            <option value={1000}>1000 km (540 nm)</option>
          </select>
          
          {/* Flight Count Badge */}
          <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium whitespace-nowrap">
            {totalFlights} flights
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={showSameDirection}
              onChange={(e) => setShowSameDirection(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-3 h-3"
            />
            <span className="select-none">Same direction</span>
          </label>

          <label className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={showSimilarAltitude}
              onChange={(e) => setShowSimilarAltitude(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-3 h-3"
            />
            <span className="select-none">Similar altitude</span>
          </label>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="flex-shrink-0 p-3 bg-white dark:bg-gray-800">
        <div className="grid grid-cols-3 gap-2">
          {/* ✅ FIX: CLOSEST now uses nautical miles (nm) */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 border border-blue-200 dark:border-blue-800">
            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mb-1">
              CLOSEST
            </div>
            {closest ? (
              <>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {kmToNauticalMiles(closest.distance_km)}
                </div>
                <div className="text-[10px] text-gray-600 dark:text-gray-400 truncate">
                  {closest.flight_icao || closest.hex}
                </div>
                <div className="text-[9px] text-gray-500 dark:text-gray-500">
                  {bearingToCompass(closest.bearing)}
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-500">None</div>
            )}
          </div>

          {/* ✅ FASTEST uses knots (kts) - already correct */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 border border-green-200 dark:border-green-800">
            <div className="text-[10px] text-green-600 dark:text-green-400 font-medium mb-1">
              FASTEST
            </div>
            {fastest ? (
              <>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {fastest.speed} kts
                </div>
                <div className="text-[10px] text-gray-600 dark:text-gray-400 truncate">
                  {fastest.flight_icao || fastest.hex}
                </div>
                <div className="text-[9px] text-gray-500 dark:text-gray-500">
                  {kmToNauticalMiles(fastest.distance_km)}
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-500">None</div>
            )}
          </div>

          {/* ✅ LOWEST uses feet (ft) - already correct */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 border border-purple-200 dark:border-purple-800">
            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium mb-1">
              LOWEST
            </div>
            {lowest ? (
              <>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {lowest.alt.toLocaleString()} ft
                </div>
                <div className="text-[10px] text-gray-600 dark:text-gray-400 truncate">
                  {lowest.flight_icao || lowest.hex}
                </div>
                <div className="text-[9px] text-gray-500 dark:text-gray-500">
                  {kmToNauticalMiles(lowest.distance_km)}
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-500">None</div>
            )}
          </div>
        </div>
      </div>

      {/* Flights List */}
      <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
        <div className="space-y-1.5">
          {displayedFlights.map((flight, index) => (
            <div
              key={`${flight.hex}-${index}`}
              onClick={() => onSelectFlight(flight.hex)}
              className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
            >
              <div className="flex-1 min-w-0 pr-2">
                <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                  {flight.flight_icao || flight.hex}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                  {flight.aircraft_icao} • {flight.airline_icao}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {getRelativePositionDescription(flight.bearing, flight.distance_km)}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                  {flight.alt.toLocaleString()} ft • {flight.speed} kts
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="mt-3 mb-2">
            <button
              onClick={handleLoadMore}
              className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer shadow-md active:scale-95"
            >
              Load More ({Math.min(ITEMS_PER_PAGE, totalFlights - displayLimit)} more)
            </button>
          </div>
        )}

        {/* Empty State */}
        {nearbyFlights.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {showSameDirection || showSimilarAltitude ? (
              <>
                <p className="font-medium text-sm">No flights match filters</p>
                <p className="text-xs mt-1">Try adjusting the radius or removing filters</p>
              </>
            ) : (
              <>
                <p className="font-medium text-sm">No flights within {radiusKm} km</p>
                <p className="text-xs mt-1">Try increasing the search radius</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
          {totalFlights === 0 ? (
            'No flights found'
          ) : hasMore ? (
            <>
              Showing {displayedFlights.length} • {totalFlights - displayLimit} more available
            </>
          ) : (
            <>
              All {totalFlights} flight{totalFlights !== 1 ? 's' : ''} shown
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NearbyFlightsPanel;