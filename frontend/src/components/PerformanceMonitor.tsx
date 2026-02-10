/**
 * PerformanceMonitor.tsx
 * 
 * Real-time performance monitoring dashboard that shows:
 * - FPS (Frames Per Second)
 * - Object counts (total vs rendered)
 * - Memory usage
 * - Viewport optimization stats
 * - Rendering performance metrics
 */

import React, { useState, useEffect } from "react";

interface PerformanceMonitorProps {
  fps: number;
  totalAircraft: number;
  totalSatellites: number;
  totalDebris: number;
  renderedAircraft: number;
  renderedSatellites: number;
  renderedDebris: number;
  markerCount: number;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  fps,
  totalAircraft,
  totalSatellites,
  totalDebris,
  renderedAircraft,
  renderedSatellites,
  renderedDebris,
  markerCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [memoryUsage, setMemoryUsage] = useState<number | undefined>();
  const [fpsHistory, setFpsHistory] = useState<number[]>([]);

  // Track memory usage if available
  useEffect(() => {
    const updateMemory = () => {
      if ('memory' in performance) {
        const mem = (performance as any).memory;
        const usedMB = mem.usedJSHeapSize / 1048576;
        setMemoryUsage(usedMB);
      }
    };

    updateMemory();
    const interval = setInterval(updateMemory, 1000);
    return () => clearInterval(interval);
  }, []);

  // Track FPS history for mini graph
  useEffect(() => {
    setFpsHistory((prev) => {
      const updated = [...prev, fps];
      return updated.slice(-30); // Keep last 30 samples
    });
  }, [fps]);

  const totalObjects = totalAircraft + totalSatellites + totalDebris;
  const renderedObjects = renderedAircraft + renderedSatellites + renderedDebris;
  const reductionPercent =
    totalObjects > 0
      ? ((totalObjects - renderedObjects) / totalObjects) * 100
      : 0;

  const getFpsColor = (fps: number): string => {
    if (fps >= 55) return "text-green-400";
    if (fps >= 30) return "text-yellow-400";
    return "text-red-400";
  };

  const getFpsStatus = (fps: number): string => {
    if (fps >= 55) return "Excellent";
    if (fps >= 30) return "Good";
    return "Poor";
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Compact View */}
      {!isExpanded && (
        <div
          onClick={() => setIsExpanded(true)}
          className="bg-gray-900/95 border border-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-800/95 transition-all shadow-xl"
        >
          <div className="flex items-center gap-3">
            <div className="text-2xl">📊</div>
            <div>
              <div className={`text-xl font-bold ${getFpsColor(fps)}`}>
                {fps} FPS
              </div>
              <div className="text-xs text-gray-400">
                {renderedObjects.toLocaleString()} / {totalObjects.toLocaleString()} objects
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <div className="bg-gray-900/98 border border-gray-700 rounded-lg p-4 shadow-2xl w-80">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <h3 className="text-white font-bold">Performance Monitor</h3>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-white transition"
            >
              ✕
            </button>
          </div>

          {/* FPS Section */}
          <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300 text-sm">Frame Rate</span>
              <span className={`text-2xl font-bold ${getFpsColor(fps)}`}>
                {fps} FPS
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">Status</span>
              <span className={`text-xs font-semibold ${getFpsColor(fps)}`}>
                {getFpsStatus(fps)}
              </span>
            </div>
            
            {/* Mini FPS Graph */}
            <div className="mt-2 h-8 flex items-end gap-[2px]">
              {fpsHistory.map((fpsValue, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t ${
                    fpsValue >= 55
                      ? "bg-green-500"
                      : fpsValue >= 30
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{
                    height: `${Math.max(10, (fpsValue / 60) * 100)}%`,
                    opacity: 0.3 + (i / fpsHistory.length) * 0.7,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Object Counts */}
          <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
            <div className="text-gray-300 text-sm font-semibold mb-2">
              Object Rendering
            </div>
            
            <div className="space-y-2 text-xs">
              {/* Aircraft */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">✈️ Aircraft</span>
                <span className="text-blue-400 font-mono">
                  {renderedAircraft.toLocaleString()} / {totalAircraft.toLocaleString()}
                </span>
              </div>

              {/* Satellites */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">🛰️ Satellites</span>
                <span className="text-green-400 font-mono">
                  {renderedSatellites.toLocaleString()} / {totalSatellites.toLocaleString()}
                </span>
              </div>

              {/* Debris */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">🔴 Debris</span>
                <span className="text-red-400 font-mono">
                  {renderedDebris.toLocaleString()} / {totalDebris.toLocaleString()}
                </span>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                <span className="text-white font-semibold">Total</span>
                <span className="text-white font-mono font-bold">
                  {renderedObjects.toLocaleString()} / {totalObjects.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Optimization Stats */}
          <div className="mb-4 p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
            <div className="text-green-400 text-sm font-semibold mb-2">
              🚀 Viewport Optimization
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Objects Culled</span>
                <span className="text-green-400 font-mono">
                  {(totalObjects - renderedObjects).toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Reduction</span>
                <span className="text-green-400 font-mono font-bold">
                  {reductionPercent.toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-300">Active Markers</span>
                <span className="text-green-400 font-mono">
                  {markerCount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Performance Bar */}
            <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                style={{ width: `${Math.min(100, reductionPercent)}%` }}
              />
            </div>
          </div>

          {/* Memory Usage (if available) */}
          {memoryUsage !== undefined && (
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Memory Usage</span>
                <span className="text-purple-400 font-mono text-sm">
                  {memoryUsage.toFixed(1)} MB
                </span>
              </div>
            </div>
          )}

          {/* Performance Tips */}
          {fps < 30 && (
            <div className="mt-4 p-2 bg-yellow-900/20 border border-yellow-700/30 rounded text-xs text-yellow-300">
              💡 Tip: Zoom in to reduce visible objects and improve performance
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;