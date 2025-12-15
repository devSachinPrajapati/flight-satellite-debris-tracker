import { useState, useEffect, useCallback } from "react";
import type {
  SatelliteObject,
  SatelliteTrail,
  OrbitalPrediction,
  GroundFootprint,
} from "../types";
import {
  calculateSatelliteTrail,
  calculateGroundFootprint,
  predictOrbitalPath,
} from "../services/satelliteEnhancedService";

export const useSatelliteEnhanced = (satellite?: SatelliteObject) => {
  const [trail, setTrail] = useState<SatelliteTrail | null>(null);
  const [prediction, setPrediction] = useState<OrbitalPrediction | null>(null);
  const [footprint, setFootprint] = useState<GroundFootprint | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!satellite) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    const loadEnhancements = async () => {
      const trailResult = calculateSatelliteTrail(satellite, 90);
      if (trailResult.success && trailResult.data) {
        setTrail(trailResult.data);
      }

      const predictionResult = predictOrbitalPath(satellite, 90);
      if (predictionResult.success && predictionResult.data) {
        setPrediction(predictionResult.data);
      }

      const footprintResult = calculateGroundFootprint(satellite);
      if (footprintResult.success && footprintResult.data) {
        setFootprint(footprintResult.data);
      }

      setLoading(false);
    };

    loadEnhancements();
  }, [satellite]);

  const refreshEnhancements = useCallback(() => {
    if (satellite) {
      setLoading(true);
      setTrail(null);
      setPrediction(null);
      setFootprint(null);
    }
  }, [satellite]);

  return {
    trail,
    prediction,
    footprint,
    loading,
    refreshEnhancements,
  };
};
