/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Aircraft } from "../../types";
import { useAircraftPerformance } from "../../hooks/useAircraftPerformance";

interface PerformanceDashboardProps {
  aircraft: Aircraft;
  onClose: () => void;
}

const PerformanceDashboard = ({
  aircraft,
  onClose,
}: PerformanceDashboardProps) => {
  const { performance, recordPerformanceData, getCacheStats } = useAircraftPerformance(
    aircraft.hex
  );
  const [chartData, setChartData] = useState<any[]>([]);
  const [cacheStats, setCacheStats] = useState({ total_aircraft: 0, total_data_points: 0 });

  // Store the latest aircraft data in a ref so interval can access it
  const latestAircraftRef = useRef<Aircraft>(aircraft);
  const dataCollectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update the ref whenever aircraft prop changes
  useEffect(() => {
    latestAircraftRef.current = aircraft;
  }, [aircraft]);

  //   Set up interval-based data collection
  useEffect(() => {
    console.log('🎯 Setting up data collection for:', aircraft.hex);

    // Clear any existing interval
    if (dataCollectionIntervalRef.current) {
      clearInterval(dataCollectionIntervalRef.current);
    }

    // Record initial data point immediately
    recordPerformanceData(aircraft);

    // Set up interval to collect data every 1 second
    dataCollectionIntervalRef.current = setInterval(() => {
      const currentAircraft = latestAircraftRef.current;
      console.log('⏱️ Collecting data point for:', currentAircraft.hex, {
        speed: currentAircraft.speed,
        alt: currentAircraft.alt,
        v_speed: currentAircraft.v_speed,
      });
      recordPerformanceData(currentAircraft);
    }, 1000);

    // Cleanup on unmount or aircraft change
    return () => {
      console.log('🧹 Cleaning up interval for:', aircraft.hex);
      if (dataCollectionIntervalRef.current) {
        clearInterval(dataCollectionIntervalRef.current);
      }
    };
  }, [aircraft.hex]);

  //   Update chart data whenever performance changes
  useEffect(() => {
    if (performance && performance.data_points.length > 0) {
      const data = performance.data_points.map((point, index) => ({
        time: index,
        speed: point.speed,
        altitude: point.altitude / 100, // Scale down for chart visibility
        vSpeed: point.v_speed || 0,
      }));
      setChartData(data);
    } else {
      setChartData([]);
    }
  }, [performance]);

  // Update cache stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCacheStats(getCacheStats());
    }, 5000);
    return () => clearInterval(interval);
  }, [getCacheStats]);

  // Show loading state only if less than 2 points
  if (!performance || performance.data_points.length < 2) {
    return (
      <div className="fixed right-4 top-20 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-96 z-50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Aircraft Performance
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Collecting performance data...
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
            {aircraft.flight_icao || aircraft.hex}
          </p>
          {performance && (
            <p className="mt-2 text-xs text-gray-400">
              {performance.data_points.length} / 2 data points collected
            </p>
          )}
        </div>
      </div>
    );
  }

  // Calculate data collection duration
  const firstPoint = performance.data_points[0];
  const lastPoint = performance.data_points[performance.data_points.length - 1];
  const durationSeconds = (lastPoint.timestamp - firstPoint.timestamp) / 1000;
  const durationMinutes = Math.floor(durationSeconds / 60);
  const durationSecondsRemainder = Math.floor(durationSeconds % 60);

  return (
    <div className="fixed right-4 top-2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-[600px] max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Aircraft Performance
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {aircraft.flight_icao || aircraft.hex}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Tracking: {durationMinutes}m {durationSecondsRemainder}s • {performance.data_points.length} data points
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
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

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
            AVG SPEED
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {performance.avg_speed.toFixed(0)} kts
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Average of {performance.data_points.length} points
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">
            MAX SPEED
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {performance.max_speed.toFixed(0)} kts
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Peak recorded speed
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">
            AVG ALTITUDE
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {performance.avg_altitude.toLocaleString()} ft
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Average of {performance.data_points.length} points
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
          <div className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">
            MAX ALTITUDE
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {performance.max_altitude.toLocaleString()} ft
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Highest recorded altitude
          </div>
        </div>
      </div>

      {/* Current vs Historical Comparison */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">CURRENT VALUES</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Speed:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {aircraft.speed.toFixed(0)} kts
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Altitude:</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                {aircraft.alt.toLocaleString()} ft
              </span>
            </div>
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">VARIATION</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">vs Avg:</span>
              <span className={`font-semibold ${Math.abs(aircraft.speed - performance.avg_speed) < 1
                ? 'text-gray-600'
                : aircraft.speed > performance.avg_speed
                  ? 'text-green-600'
                  : 'text-red-600'
                }`}>
                {aircraft.speed > performance.avg_speed ? '+' : ''}
                {(aircraft.speed - performance.avg_speed).toFixed(1)} kts
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">vs Avg:</span>
              <span className={`font-semibold ${Math.abs(aircraft.alt - performance.avg_altitude) < 10
                ? 'text-gray-600'
                : aircraft.alt > performance.avg_altitude
                  ? 'text-green-600'
                  : 'text-red-600'
                }`}>
                {aircraft.alt > performance.avg_altitude ? '+' : ''}
                {(aircraft.alt - performance.avg_altitude).toFixed(0)} ft
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Speed Chart */}
      {chartData.length > 0 && (
        <>
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Speed Over Time
            </h3>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" hide />
                <YAxis domain={['dataMin - 20', 'dataMax + 20']} />
                <Tooltip
                  formatter={(value?: number) =>
                    value !== undefined ? `${value.toFixed(0)} kts` : '—'
                  }
                  labelFormatter={(label) => `Point ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="speed"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Altitude Chart */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Altitude Over Time (x100 ft)
            </h3>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" hide />
                <YAxis domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip
                  formatter={(value?: number) =>
                    value !== undefined ? `${(value * 100).toFixed(0)} ft` : '—'
                  }
                  labelFormatter={(label) => `Point ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="altitude"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Vertical Speed Display */}
      {performance.climb_rate_avg !== undefined &&
        performance.descent_rate_avg !== undefined && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                AVG CLIMB RATE
              </div>
              <div className={`text-lg font-bold ${performance.climb_rate_avg > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                {performance.climb_rate_avg > 0 ? '+' : ''}
                {performance.climb_rate_avg.toFixed(0)} ft/min
              </div>
              {performance.climb_rate_avg === 0 && (
                <div className="text-xs text-gray-500 mt-1">No significant climb detected</div>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                AVG DESCENT RATE
              </div>
              <div className={`text-lg font-bold ${performance.descent_rate_avg < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {performance.descent_rate_avg.toFixed(0)} ft/min
              </div>
              {performance.descent_rate_avg === 0 && (
                <div className="text-xs text-gray-500 mt-1">No significant descent detected</div>
              )}
            </div>
          </div>
        )}

      {/* Data Points Info */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div>
            <span className="font-semibold">Tracking:</span> {performance.data_points.length} data points
          </div>
          <div>
            <span className="font-semibold">Cache:</span> {cacheStats.total_aircraft} aircraft tracked
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;