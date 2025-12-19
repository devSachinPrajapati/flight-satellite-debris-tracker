
import { useEffect, useState } from 'react';
import type { SatelliteObject, OrbitalPrediction } from '../../types';
import { predictOrbitalPath } from '../../services/satelliteEnhancedService';
import * as maptilersdk from '@maptiler/sdk';

interface OrbitVisualizerPanelProps {
  satellite: SatelliteObject;
  map: maptilersdk.Map | null;
  onClose: () => void;
}

const OrbitVisualizerPanel = ({
  satellite,
  map,
  onClose,
}: OrbitVisualizerPanelProps) => {
  const [prediction, setPrediction] = useState<OrbitalPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(90);

  useEffect(() => {
    const loadPrediction = () => {
      setLoading(true);
      const result = predictOrbitalPath(satellite, duration);

      if (result.success && result.data) {
        setPrediction(result.data);

        if (map) {
          const coordinates = result.data.future_positions.map((pos) => [
            pos.lng,
            pos.lat,
          ]);

          const sourceId = `orbit-path-${satellite.norad_id}`;
          const layerId = `${sourceId}-layer`;

          if (map.getLayer(layerId)) {
            map.removeLayer(layerId);
          }
          if (map.getSource(sourceId)) {
            map.removeSource(sourceId);
          }

          // Add new source and layer
          map.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {
                norad_id: satellite.norad_id,
              },
              geometry: {
                type: 'LineString',
                coordinates,
              },
            },
          });

          map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#10B981',
              'line-width': 2,
              'line-opacity': 0.7,
              'line-dasharray': [2, 2],
            },
          });
        }
      }

      setLoading(false);
    };

    loadPrediction();

    return () => {
      if (map) {
        const sourceId = `orbit-path-${satellite.norad_id}`;
        const layerId = `${sourceId}-layer`;

        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      }
    };
  }, [satellite, map, duration]);

  if (loading) {
    return (
      <div className="fixed right-4 top-20 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Calculating orbital path...
          </p>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return null;
  }

  return (
    <div className="fixed right-16 top-24 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-96">

      {/* Header Part */}
      <div className="bg-linear-to-r from-indigo-600 to-indigo-800 px-6 py-4 rounded-t-lg">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white">Orbit Visualizer</h2>
            <p className="text-indigo-100 text-sm">{satellite.name}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200 cursor-pointer">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">

        {/* Orbit Type */}
        <div className="bg-linear-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
          <div className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">ORBIT TYPE</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {prediction.orbit_type}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {prediction.orbit_type === 'LEO' && 'Low Earth Orbit (160-2000 km)'}
            {prediction.orbit_type === 'MEO' && 'Medium Earth Orbit (2000-35786 km)'}
            {prediction.orbit_type === 'GEO' && 'Geostationary Orbit (~35786 km)'}
            {prediction.orbit_type === 'HEO' && 'High Earth Orbit (>35786 km)'}
          </div>
        </div>

        {/* Duration Control */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Prediction Duration
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value={30}>30 minutes</option>
            <option value={60}>60 minutes</option>
            <option value={90}>90 minutes</option>
            <option value={120}>2 hours</option>
            <option value={180}>3 hours</option>
          </select>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">Positions</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {prediction.future_positions.length}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">Duration</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {duration} min
            </div>
          </div>
        </div>

        {/* Orbit Info */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Current Altitude:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {satellite.altitude.toFixed(0)} km
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Velocity:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {satellite.velocity.toFixed(2)} km/s
            </span>
          </div>

          {satellite.inclination && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Inclination:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {satellite.inclination.toFixed(2)}°
              </span>
            </div>
          )}

          {satellite.period_minutes && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Orbital Period:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {satellite.period_minutes.toFixed(1)} min
              </span>
            </div>
          )}
        </div>

        {/* Next Pass Info */}
        {prediction.next_pass && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
              Next Pass
            </div>
            <div className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
              <div className="flex justify-between">
                <span>AOS:</span>
                <span className="font-mono">
                  {new Date(prediction.next_pass.aos).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>LOS:</span>
                <span className="font-mono">
                  {new Date(prediction.next_pass.los).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Max Elevation:</span>
                <span className="font-mono">
                  {prediction.next_pass.max_elevation.toFixed(1)}°
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Info Note */}
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded p-3">
          💡 The dashed green line on the map shows the predicted orbital path for the next{' '}
          {duration} minutes.
        </div>
      </div>
    </div>
  );
};

export default OrbitVisualizerPanel;