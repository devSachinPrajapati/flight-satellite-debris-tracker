import { useState } from "react";
import type { SatelliteObject } from "../../types";
import { useSatelliteEnhanced } from "../../hooks/useSatelliteEnhanced";

interface SatelliteEnhancedPanelProps {
  satellite: SatelliteObject;
  onClose: () => void;
}

const SatelliteEnhancedPanel = ({
  satellite,
  onClose,
}: SatelliteEnhancedPanelProps) => {
  const { trail, footprint, loading } = useSatelliteEnhanced(satellite);
  const [selectedTab, setSelectedTab] = useState<
    "info" | "trail" | "footprint"
  >("info");

  if (loading) {
    return (
      <div className="fixed right-4 top-20 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading satellite data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed right-16 top-1 z-90 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[500px] max-h-[100vh] overflow-hidden">
      {/* Header */}
      <div className="bg-linear-to-r from-teal-600 to-teal-800 px-6 py-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white">{satellite.name}</h2>
            <p className="text-teal-100 text-sm">
              NORAD ID: {satellite.norad_id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 cursor-pointer"
          >
            <svg
              className="w-6 h-6"
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
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white/10 backdrop-blur rounded-lg p-2">
            <div className="text-white text-lg font-bold">
              {satellite.altitude.toFixed(0)} km
            </div>
            <div className="text-teal-100 text-xs">Altitude</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-2">
            <div className="text-white text-lg font-bold">
              {satellite.velocity.toFixed(1)} km/s
            </div>
            <div className="text-teal-100 text-xs">Velocity</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-2">
            <div className="text-white text-lg font-bold">
              {satellite.inclination?.toFixed(1) || "N/A"}°
            </div>
            <div className="text-teal-100 text-xs">Inclination</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setSelectedTab("info")}
          className={`flex-1 px-4 py-3 text-sm font-medium cursor-pointer ${
            selectedTab === "info"
              ? "border-b-2 border-teal-500 text-teal-600"
              : "text-gray-600 hover:text-gray-200 dark:text-gray-400"
          }`}
        >
          Info
        </button>
        <button
          onClick={() => setSelectedTab("trail")}
          className={`flex-1 px-4 py-3 text-sm font-medium cursor-pointer ${
            selectedTab === "trail"
              ? "border-b-2 border-teal-500 text-teal-600"
              : "text-gray-600 hover:text-gray-200 dark:text-gray-400"
          }`}
        >
          Trail
        </button>
        <button
          onClick={() => setSelectedTab("footprint")}
          className={`flex-1 px-4 py-3 text-sm font-medium cursor-pointer ${
            selectedTab === "footprint"
              ? "border-b-2 border-teal-500 text-teal-600"
              : "text-gray-600 hover:text-gray-200 dark:text-gray-400"
          }`}
        >
          Footprint
        </button>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto" style={{ maxHeight: "500px" }}>
        {selectedTab === "info" && (
          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Operator
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {satellite.operator || "Unknown"}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Object Type
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {satellite.object_type}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Orbital Period
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {satellite.period_minutes?.toFixed(1) || "N/A"} minutes
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Visibility
              </div>
              <div className="text-sm font-medium mt-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    satellite.visible
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {satellite.visible ? "Visible" : "Not Visible"}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Position
              </div>
              <div className="text-sm font-mono text-gray-900 dark:text-white">
                Lat: {satellite.lat.toFixed(4)}°<br />
                Lng: {satellite.lng.toFixed(4)}°
              </div>
            </div>

            {satellite.conjunction_risk && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium text-red-800 dark:text-red-200">
                    Conjunction Risk Detected
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedTab === "trail" && trail && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Orbital trail showing {trail.positions.length} positions over the
              last 90 minutes
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="text-xs text-gray-100 dark:text-gray-400 mb-2">
                Trail Statistics
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-100">
                  <span>Total Points:</span>
                  <span className="font-medium">{trail.positions.length}</span>
                </div>
                <div className="flex justify-between text-gray-100">
                  <span>Time Span:</span>
                  <span className="font-medium">90 minutes</span>
                </div>
                <div className="flex justify-between text-gray-100">
                  <span>Update Interval:</span>
                  <span className="font-medium">30 seconds</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              The trail is rendered on the map as a dashed line showing the
              satellite's past trajectory.
            </div>
          </div>
        )}

        {selectedTab === "footprint" && footprint && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Ground coverage area for this satellite
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                COVERAGE RADIUS
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {footprint.radius_km.toFixed(0)} km
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="text-xs text-green-600 dark:text-green-400 mb-2">
                COVERAGE AREA
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {footprint.coverage_area_km2.toLocaleString()} km²
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                CENTER POSITION
              </div>
              <div className="text-sm font-mono text-gray-900 dark:text-white">
                Lat: {footprint.center.lat.toFixed(4)}°<br />
                Lng: {footprint.center.lng.toFixed(4)}°
              </div>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              The ground footprint represents the area on Earth's surface that
              can be covered by the satellite's sensors or communication
              systems.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SatelliteEnhancedPanel;
