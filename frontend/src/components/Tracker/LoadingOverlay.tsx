interface LoadingOverlayProps {
  isLoading: boolean;
  loadingStatus?: {
    flights_ready: boolean;
    flights_loading: boolean;
    satellites_ready: boolean;
    satellites_loading: boolean;
  };
  flightsCount?: number;
  satellitesCount?: number;
}

const LoadingOverlay = ({ 
  isLoading, 
  loadingStatus,
  flightsCount = 0,
  satellitesCount = 0
}: LoadingOverlayProps) => {
  if (!isLoading) return null;

  // Show progressive loading if we have loading status
  const showProgressiveLoading = loadingStatus && (loadingStatus.flights_loading || loadingStatus.satellites_loading);

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
      <div className="bg-white rounded-lg p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
        <p className="text-gray-700 font-medium">Loading tracker data...</p>
        <p className="text-gray-500 text-sm mt-2">
          Initializing live tracking system...
        </p>

        {/* Progressive loading indicators */}
        {showProgressiveLoading && (
          <div className="mt-4 space-y-2">
            {loadingStatus.flights_loading && (
              <div className="text-sm text-gray-600 bg-blue-50 rounded px-3 py-2">
                Loading flights... ({flightsCount} loaded)
              </div>
            )}
            
            {loadingStatus.satellites_loading && (
              <div className="text-sm text-gray-600 bg-blue-50 rounded px-3 py-2">
                Loading satellites... ({satellitesCount} loaded)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;