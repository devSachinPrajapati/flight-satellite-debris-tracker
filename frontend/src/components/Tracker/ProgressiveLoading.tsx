/**
 * Progressive Loader Component
 * Shows detailed loading progress instead of blank screen
 */

import { useEffect, useState } from 'react';

interface LoadingStage {
  name: string;
  status: 'pending' | 'loading' | 'complete' | 'error';
  progress?: number;
  count?: number;
}

interface ProgressiveLoaderProps {
  aircraftCount: number;
  satelliteCount: number;
  debrisCount: number;
  aircraftLoading: boolean;
  satelliteLoading: boolean;
  isMapReady: boolean;
}

const ProgressiveLoader = ({
  aircraftCount,
  satelliteCount,
  debrisCount,
  aircraftLoading,
  satelliteLoading,
  isMapReady,
}: ProgressiveLoaderProps) => {
  const [stages, setStages] = useState<LoadingStage[]>([
    { name: 'Initializing Map', status: 'loading' },
    { name: 'Loading Aircraft Data', status: 'pending' },
    { name: 'Loading Satellite Data', status: 'pending' },
    { name: 'Building Spatial Index', status: 'pending' },
    { name: 'Rendering Objects', status: 'pending' },
  ]);

  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    setStages(prev => {
      const newStages = [...prev];

      // Map initialization
      if (isMapReady) {
        newStages[0] = { ...newStages[0], status: 'complete', progress: 100 };
        if (newStages[1].status === 'pending') {
          newStages[1] = { ...newStages[1], status: 'loading' };
        }
      }

      // Aircraft loading
      if (aircraftCount > 0) {
        newStages[1] = {
          ...newStages[1],
          status: aircraftLoading ? 'loading' : 'complete',
          count: aircraftCount,
          progress: aircraftLoading ? 75 : 100,
        };
        if (!aircraftLoading && newStages[2].status === 'pending') {
          newStages[2] = { ...newStages[2], status: 'loading' };
        }
      }

      // Satellite loading
      if (satelliteCount > 0) {
        newStages[2] = {
          ...newStages[2],
          status: satelliteLoading ? 'loading' : 'complete',
          count: satelliteCount + debrisCount,
          progress: satelliteLoading ? 75 : 100,
        };
        if (!satelliteLoading && newStages[3].status === 'pending') {
          newStages[3] = { ...newStages[3], status: 'loading' };
          // Spatial index builds quickly
          setTimeout(() => {
            setStages(s => {
              const updated = [...s];
              updated[3] = { ...updated[3], status: 'complete', progress: 100 };
              updated[4] = { ...updated[4], status: 'loading' };
              return updated;
            });
          }, 500);
        }
      }

      // Rendering
      if (aircraftCount > 0 && satelliteCount > 0 && !aircraftLoading && !satelliteLoading) {
        setTimeout(() => {
          setStages(s => {
            const updated = [...s];
            updated[4] = { ...updated[4], status: 'complete', progress: 100 };
            return updated;
          });
        }, 1000);
      }

      return newStages;
    });
  }, [isMapReady, aircraftCount, satelliteCount, debrisCount, aircraftLoading, satelliteLoading]);

  // Calculate overall progress
  useEffect(() => {
    const completed = stages.filter(s => s.status === 'complete').length;
    const total = stages.length;
    const progress = (completed / total) * 100;
    setOverallProgress(progress);
  }, [stages]);

  const getStatusIcon = (status: LoadingStage['status']) => {
    switch (status) {
      case 'complete':
        return '✅';
      case 'loading':
        return '⏳';
      case 'error':
        return '❌';
      default:
        return '⚪';
    }
  };

  const getStatusColor = (status: LoadingStage['status']) => {
    switch (status) {
      case 'complete':
        return 'text-green-400';
      case 'loading':
        return 'text-blue-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-500';
    }
  };

  // Don't show if everything is loaded
  if (overallProgress >= 100) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 z-50 flex items-center justify-center">
      <div className="max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4 animate-bounce">🛰️</div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Flight & Satellite Tracker
          </h1>
          <p className="text-blue-300 text-lg">
            Initializing real-time tracking system...
          </p>
        </div>

        {/* Overall Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white font-semibold">Overall Progress</span>
            <span className="text-blue-300 font-mono">{overallProgress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500 ease-out"
              style={{ width: `${overallProgress}%` }}
            >
              <div className="h-full w-full animate-pulse opacity-50 bg-white"></div>
            </div>
          </div>
        </div>

        {/* Stages */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 shadow-2xl border border-slate-700">
          <div className="space-y-4">
            {stages.map((stage, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">{getStatusIcon(stage.status)}</span>
                  <div className="flex-1">
                    <div className={`font-medium ${getStatusColor(stage.status)}`}>
                      {stage.name}
                      {stage.count !== undefined && (
                        <span className="ml-2 text-sm text-gray-400">
                          ({stage.count.toLocaleString()} objects)
                        </span>
                      )}
                    </div>
                    {stage.progress !== undefined && stage.status === 'loading' && (
                      <div className="mt-2 w-full bg-slate-600 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-blue-400 transition-all duration-300"
                          style={{ width: `${stage.progress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8 text-center">
          <div className="inline-block bg-blue-500/20 border border-blue-500/30 rounded-lg px-6 py-3">
            <p className="text-blue-200 text-sm">
              💡 <strong>Tip:</strong> Use the view toggle to switch between aircraft, satellites, and debris
            </p>
          </div>
        </div>

        {/* Stats Preview */}
        {(aircraftCount > 0 || satelliteCount > 0) && (
          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div className="bg-blue-500/20 rounded-lg p-3 border border-blue-500/30">
              <div className="text-2xl font-bold text-blue-300">{aircraftCount.toLocaleString()}</div>
              <div className="text-xs text-blue-200">Aircraft</div>
            </div>
            <div className="bg-green-500/20 rounded-lg p-3 border border-green-500/30">
              <div className="text-2xl font-bold text-green-300">{satelliteCount.toLocaleString()}</div>
              <div className="text-xs text-green-200">Satellites</div>
            </div>
            <div className="bg-red-500/20 rounded-lg p-3 border border-red-500/30">
              <div className="text-2xl font-bold text-red-300">{debrisCount.toLocaleString()}</div>
              <div className="text-xs text-red-200">Debris</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressiveLoader;