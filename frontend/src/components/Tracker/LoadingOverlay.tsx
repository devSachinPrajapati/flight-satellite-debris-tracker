// interface LoadingOverlayProps {
//   isLoading: boolean;
// }

// const LoadingOverlay = ({ isLoading }: LoadingOverlayProps) => {
//   if (!isLoading) return null;

//   return (
//     <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
//       <div className="bg-white rounded-lg p-6 text-center">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
//         <p className="text-gray-700 font-medium">Loading tracker data...</p>
//         <p className="text-gray-500 text-sm mt-2">
//           Initializing live tracking system...
//         </p>
//       </div>
//     </div>
//   );
// };

// export default LoadingOverlay;



// ============================================
// components/Tracker/LoadingOverlay.tsx
// ============================================
interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
}

const LoadingOverlay = ({ isLoading, message = "Loading tracker data..." }: LoadingOverlayProps) => {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-8 text-center shadow-2xl border border-blue-500/30 max-w-md">
        {/* Animated spinner */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-4 border-transparent border-t-green-500 rounded-full animate-spin" style={{ animationDuration: '1.5s' }}></div>
        </div>

        {/* Loading text */}
        <p className="text-white font-semibold text-lg mb-2">
          {message}
        </p>
        
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-1 mb-4">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>

        {/* Status messages */}
        <div className="text-gray-400 text-sm space-y-1">
          <p className="flex items-center justify-center gap-2">
            <span className="text-green-400">✓</span>
            <span>Connecting to tracking servers</span>
          </p>
          <p className="flex items-center justify-center gap-2 opacity-70">
            <span className="animate-pulse">⟳</span>
            <span>Fetching real-time data</span>
          </p>
        </div>

        {/* Performance tip */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-500">
            💡 Optimized for fast loading with progressive rendering
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;