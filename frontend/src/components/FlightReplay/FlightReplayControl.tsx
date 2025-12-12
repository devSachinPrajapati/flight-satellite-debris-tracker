import React, { useState, useEffect, useCallback } from 'react';
import type { FlightHistory, ReplayState } from '../../types';
import { getFlightPositionAtTime } from '../../services/flightHistoryService';

interface FlightReplayControlProps {
  history: FlightHistory;
  onPositionUpdate: (lat: number, lng: number, alt: number, heading: number) => void;
  onClose: () => void;
}

const FlightReplayControl: React.FC<FlightReplayControlProps> = ({
  history,
  onPositionUpdate,
  onClose,
}) => {
  const [replayState, setReplayState] = useState<ReplayState>({
    isPlaying: false,
    currentTime: history.startTime,
    speed: 1,
  });

  const [progress, setProgress] = useState(0);

  const duration = history.endTime - history.startTime;

  useEffect(() => {
    const progressPercent =
      ((replayState.currentTime - history.startTime) / duration) * 100;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(Math.min(100, Math.max(0, progressPercent)));
  }, [replayState.currentTime, history.startTime, duration]);

  useEffect(() => {
    if (!replayState.isPlaying) return;

    const interval = setInterval(() => {
      setReplayState((prev) => {
        const timeStep = 1000 * prev.speed;
        const newTime = prev.currentTime + timeStep;

        if (newTime >= history.endTime) {
          return {
            ...prev,
            currentTime: history.endTime,
            isPlaying: false,
          };
        }

        return {
          ...prev,
          currentTime: newTime,
        };
      });
    }, 50);

    return () => clearInterval(interval);
  }, [replayState.isPlaying, replayState.speed, history.endTime]);

  useEffect(() => {
    const positionResult = getFlightPositionAtTime(
      history.hex,
      replayState.currentTime
    );

    if (positionResult.success && positionResult.data) {
      const pos = positionResult.data;
      onPositionUpdate(pos.lat, pos.lng, pos.alt, pos.dir);
    }
  }, [replayState.currentTime, history.hex, onPositionUpdate]);

  const handlePlayPause = useCallback(() => {
    setReplayState((prev) => ({
      ...prev,
      isPlaying: !prev.isPlaying,
    }));
  }, []);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setReplayState((prev) => ({
      ...prev,
      speed: newSpeed,
    }));
  }, []);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const percent = parseFloat(e.target.value);
      const newTime = history.startTime + (duration * percent) / 100;

      setReplayState((prev) => ({
        ...prev,
        currentTime: newTime,
        isPlaying: false,
      }));
    },
    [history.startTime, duration]
  );

  const handleRestart = useCallback(() => {
    setReplayState((prev) => ({
      ...prev,
      currentTime: history.startTime,
      isPlaying: true,
    }));
  }, [history.startTime]);

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 z-50 w-full max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Flight Replay
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {history.flight_icao || history.hex}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mb-4">
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          style={{
            background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${progress}%, #E5E7EB ${progress}%, #E5E7EB 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
          <span>{formatTime(history.startTime)}</span>
          <span>{formatTime(replayState.currentTime)}</span>
          <span>{formatTime(history.endTime)}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handleRestart}
          className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
          title="Restart"
        >
          <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        <button
          onClick={handlePlayPause}
          className="p-4 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors shadow-lg"
        >
          {replayState.isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="flex gap-2">
          {[1, 2, 4, 8].map((speed) => (
            <button
              key={speed}
              onClick={() => handleSpeedChange(speed)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                replayState.speed === speed
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Duration</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatDuration(duration)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Data Points</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {history.points.length}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Replay Speed</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {replayState.speed}x
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightReplayControl;