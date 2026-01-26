import { useState, useEffect } from "react";

export const useLoadingState = (
  aircraftConnected: boolean,
  aircraftCount: number,
  satelliteCount: number,
  debrisCount: number
) => {
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Connecting to tracking system...");
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    if (aircraftConnected) {
      setLoadingMessage("Receiving flight data...");
      setLoadingProgress(33);
    }

    if (aircraftCount > 0) {
      setLoadingMessage("Loading satellite data...");
      setLoadingProgress(66);
    }

    if ((satelliteCount > 0 || debrisCount > 0) && aircraftCount > 0) {
      setLoadingMessage("Rendering map markers...");
      setLoadingProgress(90);

      setTimeout(() => {
        setLoadingProgress(100);
        setTimeout(() => setShowLoadingOverlay(false), 300);
      }, 500);
    }
  }, [aircraftConnected, aircraftCount, satelliteCount, debrisCount]);

  return {
    showLoadingOverlay,
    loadingMessage,
    loadingProgress,
  };
};