import { RefreshCw } from "lucide-react";

interface StatsPanelProps {
  aircraftCount: number;
  satelliteCount: number;
  debrisCount: number;
  lastUpdate?: Date | null; // Accept both Date and null
  onRefresh?: () => void;

  aircraftStatus?: "idle" | "ok" | "error";
  satelliteStatus?: "idle" | "ok" | "error";
  debrisStatus?: "idle" | "ok" | "error";
  fps?: number;
  isConnected?: boolean; // WebSocket connection status
}

const StatsPanel = ({
  aircraftCount = 0,
  satelliteCount = 0,
  debrisCount = 0,
  lastUpdate,
  onRefresh,
  aircraftStatus = "idle",
  satelliteStatus = "idle",
  debrisStatus = "idle",
  fps,
  isConnected = false, // Default to false
}: StatsPanelProps) => {
  const formatTime = (date: Date | null | undefined) => {
    if (!date) return "Never";
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const renderStatus = (s?: "idle" | "ok" | "error") => {
    if (!s || s === "idle")
      return <span className="inline-block w-2 h-2 rounded-full bg-gray-300" />;
    if (s === "ok")
      return (
        <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
      );
    return <span className="inline-block w-2 h-2 rounded-full bg-red-500" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 w-72">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          Live Tracking Stats
          {/* WebSocket Connection Indicator */}
          {isConnected && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              WebSocket
            </span>
          )}
          {!isConnected && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              Offline
            </span>
          )}
        </h3>
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

      {/* Counts list */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-gray-700">Aircraft</span>
          </div>
          <strong className="text-gray-900">{aircraftCount ?? 0}</strong>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-gray-700">Satellites</span>
          </div>
          <strong className="text-gray-900">{satelliteCount ?? 0}</strong>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-gray-700">Debris</span>
          </div>
          <strong className="text-gray-900">{debrisCount ?? 0}</strong>
        </div>

        {/* Total Object */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total Objects</span>
            <strong className="text-lg text-blue-600">
              {aircraftCount + satelliteCount + debrisCount}
            </strong>
          </div>
        </div>

        {/* Status row */}
        <div className="pt-2 border-t border-gray-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-600">API Status</span>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                {renderStatus(aircraftStatus)}
                <span className="text-gray-500">Aircraft</span>
              </div>
              <div className="flex items-center space-x-1">
                {renderStatus(satelliteStatus)}
                <span className="text-gray-500">Satellites</span>
              </div>
              <div className="flex items-center space-x-1">
                {renderStatus(debrisStatus)}
                <span className="text-gray-500">Debris</span>
              </div>
            </div>
          </div>

          {/* FPS */}
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-gray-500">
              FPS:{" "}
              <span className="font-medium text-gray-700">{fps ?? "—"}</span>
            </div>
            <div />
          </div>
        </div>

        {/* Last update */}
        <div className="pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            Last Update: {formatTime(lastUpdate)}
          </div>
          {/* Show real-time indicator when connected */}
          {isConnected && (
            <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              Real-time updates active
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;