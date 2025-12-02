interface StatsPanelProps {
  aircraftCount: number;
  satelliteCount: number;
  debrisCount: number;
}

const StatsPanel = ({
  aircraftCount,
  satelliteCount,
  debrisCount,
}: StatsPanelProps) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Live Tracking Stats
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-700">Aircraft</span>
          </div>
          <strong className="text-gray-900">{aircraftCount}</strong>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-700">Satellites</span>
          </div>
          <strong className="text-gray-900">{satelliteCount}</strong>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-700">Debris</span>
          </div>
          <strong className="text-gray-900">{debrisCount}</strong>
        </div>
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total Objects</span>
            <strong className="text-lg text-blue-600">
              {aircraftCount + satelliteCount + debrisCount}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;
