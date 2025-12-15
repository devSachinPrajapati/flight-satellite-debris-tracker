/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import type { SatelliteObject, OrbitalPrediction } from "../../types";
import { predictOrbitalPath } from "../../services/satelliteEnhancedService";

interface OrbitVisualizerProps {
  satellite: SatelliteObject;
  map: any;
  duration: number;
}

const OrbitVisualizer: React.FC<OrbitVisualizerProps> = ({
  satellite,
  map,
  duration,
}) => {
  const [prediction, setPrediction] = useState<OrbitalPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPrediction = () => {
      setLoading(true);
      const result = predictOrbitalPath(satellite, duration);

      if (result.success && result.data) {
        setPrediction(result.data);

        const coordinates = result.data.future_positions.map((pos) => [
          pos.lng,
          pos.lat,
        ]);

        if (map.getLayer("orbit-path")) {
          map.removeLayer("orbit-path");
        }
        if (map.getSource("orbit-path")) {
          map.removeSource("orbit-path");
        }

        map.addSource("orbit-path", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {
              norad_id: satellite.norad_id,
            },
            geometry: {
              type: "LineString",
              coordinates,
            },
          },
        });

        map.addLayer({
          id: "orbit-path",
          type: "line",
          source: "orbit-path",
          paint: {
            "line-color": "#10B981",
            "line-width": 2,
            "line-opacity": 0.7,
            "line-dasharray": [2, 2],
          },
        });
      }

      setLoading(false);
    };

    loadPrediction();

    return () => {
      if (map.getLayer("orbit-path")) {
        map.removeLayer("orbit-path");
      }
      if (map.getSource("orbit-path")) {
        map.removeSource("orbit-path");
      }
    };
  }, [satellite, map, duration]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!prediction) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
        Orbit Prediction
      </h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Satellite:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {satellite.name}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Orbit Type:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {prediction.orbit_type}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">
            Path Duration:
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {duration} minutes
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Positions:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {prediction.future_positions.length}
          </span>
        </div>

        {prediction.next_pass && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="font-medium text-gray-900 dark:text-white mb-2">
              Next Pass:
            </div>
            <div className="space-y-1 text-xs">
              {/* 
              AOS = Acquisition of Signal: This is the moment when the satellite first becomes visible to your ground station — i.e., it rises above the local horizon and you can start receiving its signal.
              LOS = Loss of Signal: This is the moment when the satellite is no longer visible — i.e., it sets below the horizon and the signal is lost. 
              Max Elevation → satellite reaches its highest point in the sky
              */}
              <div>
                AOS: {new Date(prediction.next_pass.aos).toLocaleTimeString()}
              </div>
              <div>
                LOS: {new Date(prediction.next_pass.los).toLocaleTimeString()}
              </div>
              <div>
                Max Elevation: {prediction.next_pass.max_elevation.toFixed(1)}°
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrbitVisualizer;
