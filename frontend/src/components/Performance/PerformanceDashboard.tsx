/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Aircraft} from '../../types';
import { useAircraftPerformance } from '../../hooks/useAircraftPerformance';

interface PerformanceDashboardProps {
  aircraft: Aircraft;
  onClose: () => void;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  aircraft,
  onClose,
}) => {
  const { performance, recordPerformanceData } = useAircraftPerformance(aircraft.hex);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    recordPerformanceData(aircraft);
  }, [aircraft, recordPerformanceData]);

  useEffect(() => {
    if (performance && performance.data_points.length > 0) {
      const data = performance.data_points.map((point, index) => ({
        time: index,
        speed: point.speed,
        altitude: point.altitude / 100, // Scale down for better visualization
        vSpeed: point.v_speed || 0,
      }));
      setChartData(data);
    }
  }, [performance]);

  if (!performance) {
    return (
      <div className="fixed right-4 top-20 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Collecting performance data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed right-4 top-20 z-30 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-[600px] max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Aircraft Performance
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {aircraft.flight_icao || aircraft.hex}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">AVG SPEED</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {performance.avg_speed.toFixed(0)} kts
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="text-xs text-green-600 dark:text-green-400 font-medium">MAX SPEED</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {performance.max_speed.toFixed(0)} kts
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">AVG ALTITUDE</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {performance.avg_altitude.toLocaleString()} ft
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
          <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">MAX ALTITUDE</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {performance.max_altitude.toLocaleString()} ft
          </div>
        </div>
      </div>

      {/* Speed Chart */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Speed Over Time
        </h3>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" hide />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="speed" stroke="#3b82f6" strokeWidth={2} dot={false} />
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
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="altitude" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Vertical Speed */}
      {performance.climb_rate_avg !== undefined && performance.descent_rate_avg !== undefined && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-xs text-gray-600 dark:text-gray-400">AVG CLIMB RATE</div>
            <div className="text-lg font-bold text-green-600">
              +{performance.climb_rate_avg.toFixed(0)} ft/min
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-xs text-gray-600 dark:text-gray-400">AVG DESCENT RATE</div>
            <div className="text-lg font-bold text-red-600">
              {performance.descent_rate_avg.toFixed(0)} ft/min
            </div>
          </div>
        </div>
      )}

      {/* Data Points Info */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Tracking {performance.data_points.length} data points
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;