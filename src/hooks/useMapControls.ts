import { useState, useCallback } from "react";
import type { ViewMode, SelectedObject } from "../types";

export const useMapControls = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [selectedObject, setSelectedObject] = useState<SelectedObject | null>(
    null
  );

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setSelectedObject(null); 
  }, []);

  const handleObjectSelect = useCallback((object: SelectedObject | null) => {
    setSelectedObject(object);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedObject(null);
  }, []);

  return {
    viewMode,
    selectedObject,
    handleViewModeChange,
    handleObjectSelect,
    clearSelection,
  };
};
