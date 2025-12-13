/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from "react";
import type { Aircraft, NearbyFlight, UserLocation } from "../../types";
import {
  findNearbyFlights,
  findLowestAltitudeAircraft,
  findFastestAircraft,
  findClosestAircraft,
  getUserLocation,
  formatDistance,
  bearingToCompass,
} from "../../services/nearbyFlightsService";

interface NearbyFlightsPanelProps {
  allAircraft: Aircraft[];
  onSelectFlight: (hex: string) => void;
  onClose?: () => void;
}

const NearbyFlightsPanel: React.FC<NearbyFlightsPanelProps> = ({
  allAircraft,
  onSelectFlight,
  onClose,
}) => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [nearbyFlights, setNearbyFlights] = useState<NearbyFlight[]>([]);
  const [radiusKm, setRadiusKm] = useState(500);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);

  const requestLocation = async () => {
    setIsRequestingLocation(true);
    setLocationError(null);

    const result = await getUserLocation();
    if (result.success && result.data) {
      setUserLocation(result.data);
      setLocationError(null);
    } else {
      setLocationError(result.error || "Location unavailable");
    }

    setIsRequestingLocation(false);
  };

  useEffect(() => {
    requestLocation();
  }, []);


  useEffect(() => {
    if (!userLocation) return;

    const result = findNearbyFlights(allAircraft, userLocation, radiusKm);
    if (result.success && result.data) {
      setNearbyFlights(result.data);
    }
  }, [userLocation, allAircraft, radiusKm]);

  if (locationError) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Location Required
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {locationError}
          </p>
          <button
            onClick={requestLocation}
            disabled={isRequestingLocation}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRequestingLocation ? 'Requesting...' : 'Request Location'}
          </button>
        </div>
      </div>
    );
  }

  const closest = findClosestAircraft(nearbyFlights);
  const fastest = findFastestAircraft(nearbyFlights);
  const lowest = findLowestAltitudeAircraft(nearbyFlights);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Nearby Flights
        </h2>
        <div className="flex items-center gap-2 cursor-pointer">
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 cursor-pointer"
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
          <select
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-100"
          >
            <option value={100}>100 km</option>
            <option value={250}>250 km</option>
            <option value={500}>500 km</option>
            <option value={1000}>1000 km</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
            CLOSEST
          </div>
          {closest && (
            <>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {formatDistance(closest.distance_km)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {closest.flight_icao || closest.hex}
              </div>
            </>
          )}
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">
            FASTEST
          </div>
          {fastest && (
            <>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {fastest.speed} kts
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {fastest.flight_icao || fastest.hex}
              </div>
            </>
          )}
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">
            LOWEST
          </div>
          {lowest && (
            <>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {lowest.alt.toLocaleString()} ft
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {lowest.flight_icao || lowest.hex}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {nearbyFlights.slice(0, 20).map((flight) => (
          <div
            key={flight.hex}
            onClick={() => onSelectFlight(flight.hex)}
            className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition"
          >
            <div className="flex-1">
              <div className="font-semibold text-gray-900 dark:text-white">
                {flight.flight_icao || flight.hex}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {flight.aircraft_icao} • {flight.airline_icao}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDistance(flight.distance_km)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {bearingToCompass(flight.bearing)}
              </div>
            </div>
            <div className="ml-4 text-right">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {flight.alt.toLocaleString()} ft
              </div>
              <div className="text-xs text-gray-500">{flight.speed} kts</div>
            </div>
          </div>
        ))}
      </div>

      {nearbyFlights.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No flights within {radiusKm} km
        </div>
      )}
    </div>
  );
};

export default NearbyFlightsPanel;
