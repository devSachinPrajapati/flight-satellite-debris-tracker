/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback } from "react";
import type { FlightHistory } from "../types";
import {
  getFlightHistory,
  getAllFlightHistories,
} from "../services/flightHistoryService";

export const useFlightHistory = (aircraftHex?: string) => {
  const [history, setHistory] = useState<FlightHistory | null>(null);
  const [allHistories, setAllHistories] = useState<FlightHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (hex: string) => {
    setLoading(true);
    setError(null);

    const result = getFlightHistory(hex);

    if (result.success && result.data) {
      setHistory(result.data);
    } else {
      setError(result.error || "History not available");
      setHistory(null);
    }

    setLoading(false);
  }, []);

  const loadAllHistories = useCallback(() => {
    const result = getAllFlightHistories();

    if (result.success && result.data) {
      setAllHistories(result.data);
    }
  }, []);

  useEffect(() => {
    if (aircraftHex) {
      loadHistory(aircraftHex);
    }
  }, [aircraftHex, loadHistory]);

  useEffect(() => {
    loadAllHistories();
    const interval = setInterval(loadAllHistories, 30000);
    return () => clearInterval(interval);
  }, [loadAllHistories]);

  return {
    history,
    allHistories,
    loading,
    error,
    loadHistory,
    loadAllHistories,
  };
};
