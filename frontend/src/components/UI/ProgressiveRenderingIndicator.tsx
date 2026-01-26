interface ProgressiveRenderingIndicatorProps {
  currentZoom: number;
  renderStats: {
    totalAircraft: number;
    totalSatellites: number;
    totalDebris: number;
    renderedAircraft: number;
    renderedSatellites: number;
    renderedDebris: number;
  };
}

const ProgressiveRenderingIndicator: React.FC<ProgressiveRenderingIndicatorProps> = ({
  currentZoom,
  renderStats,
}) => {
  const totalObjects = renderStats.totalAircraft + renderStats.totalSatellites + renderStats.totalDebris;
  const renderedObjects = renderStats.renderedAircraft + renderStats.renderedSatellites + renderStats.renderedDebris;
  const optimizationPercentage = ((totalObjects - renderedObjects) / Math.max(1, totalObjects)) * 100;

  return (
    <div className="absolute bottom-43 left-40 z-10">
      <div className="mt-2 bg-gradient-to-r from-blue-500/10 to-green-500/10 border border-blue-500 rounded-lg p-2 text-xs">
        <div className="text-blue-400 font-semibold flex items-center gap-2">
          <span>🎯</span>
          <span>Progressive Rendering Active</span>
        </div>
        <div className="text-blue-300 mt-1 text-[11px]">
          Zoom: {currentZoom.toFixed(1)} | Showing {renderedObjects} of {totalObjects}
        </div>
        <div className="text-green-400 text-[10px] mt-1 font-semibold">
          {optimizationPercentage.toFixed(1)}% optimized
        </div>
        <div className="text-gray-400 text-[10px] mt-1">
          Zoom in to see more objects
        </div>
      </div>
    </div>
  );
};

export default ProgressiveRenderingIndicator;