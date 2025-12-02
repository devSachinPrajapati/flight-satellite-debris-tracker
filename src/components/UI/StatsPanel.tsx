import React from 'react';
import { RefreshCw } from 'lucide-react';

interface StatsPanelProps {
  aircraftCount: number;
  satelliteCount: number;
  debrisCount: number;
  lastUpdate?: Date;
  onRefresh?: () => void;
}

const StatsPanel: React.FC<StatsPanelProps> = ({
  aircraftCount,
  satelliteCount,
  debrisCount,
  lastUpdate,
  onRefresh,
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit' 
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Live Tracking Stats</h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-blue-500 hover:text-blue-700 transition cursor-pointer"
            title="Refresh data"
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-700">Aircraft</span>
          </div>
          <strong className="text-gray-900">{aircraftCount}</strong>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-700">Satellites</span>
          </div>
          <strong className="text-gray-900">{satelliteCount}</strong>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-700">Debris</span>
          </div>
          <strong className="text-gray-900">{debrisCount}</strong>
        </div>
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total Objects</span>
            <strong className="text-lg text-blue-600">
              {aircraftCount + satelliteCount + debrisCount}
            </strong>
          </div>
        </div>
        {lastUpdate && (
          <div className="pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Last TLE Update: {formatTime(lastUpdate)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsPanel;