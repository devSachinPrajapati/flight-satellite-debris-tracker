// import { useEffect, useState } from 'react';

// interface LoadingOverlayProps {
//   isLoading: boolean;
//   message?: string;
//   progress?: number;
// }

// export default function LoadingOverlay({ 
//   isLoading, 
//   message = "Loading...",
//   progress 
// }: LoadingOverlayProps) {
//   const [dots, setDots] = useState('');

//   useEffect(() => {
//     if (!isLoading) return;
    
//     const interval = setInterval(() => {
//       setDots(prev => prev.length >= 3 ? '' : prev + '.');
//     }, 500);

//     return () => clearInterval(interval);
//   }, [isLoading]);

//   if (!isLoading) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
//       {/* Animated background */}
//       <div className="absolute inset-0 opacity-30 z-10">
//         <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 animate-pulse"></div>
//       </div>

//       {/* Content */}
//       <div className="relative z-10 text-center space-y-8 px-8">
//         {/* Logo/Icon */}
//         <div className="flex justify-center">
//           <div className="relative">
//             {/* Rotating ring */}
//             <div className="w-32 h-32 border-4 border-blue-500/30 rounded-full animate-spin">
//               <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"></div>
//             </div>
            
//             {/* Center icon */}
//             <div className="absolute inset-0 flex items-center justify-center">
//               <div className="text-6xl animate-bounce">
//                 🛰️
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Title */}
//         <div className="space-y-2">
//           <h1 className="text-4xl font-bold text-white">
//             Flight, Satellite & Debris Tracker
//           </h1>
//           <p className="text-xl text-blue-300">
//             Initializing tracking system{dots}
//           </p>
//         </div>

//         {/* Progress message */}
//         <div className="space-y-4">
//           <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/30 rounded-lg p-6 max-w-md mx-auto">
//             <div className="flex items-center gap-3 text-blue-200">
//               <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
//               <span className="text-lg">{message}</span>
//             </div>
            
//             {/* Progress bar */}
//             {progress !== undefined && (
//               <div className="mt-4">
//                 <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
//                   <div 
//                     className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300 ease-out"
//                     style={{ width: `${progress}%` }}
//                   ></div>
//                 </div>
//                 {/* <div className="text-sm text-blue-300 mt-2 text-center">
//                   {progress.toFixed(0)}%
//                 </div> */}
//               </div>
//             )}
//           </div>

//           {/* Loading steps */}
//           <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto text-sm">
//             {[
//               { icon: '🌐', label: 'Connecting', active: message.includes('Connecting') },
//               { icon: '✈️', label: 'Loading Flights', active: message.includes('flight') },
//               { icon: '🛰️', label: 'Loading Satellites and Debris', active: message.includes('satellite') },
//             ].map((step, index) => (
//               <div 
//                 key={index}
//                 className={`
//                   p-3 rounded-lg border transition-all duration-300
//                   ${step.active 
//                     ? 'bg-blue-500/20 border-blue-500 text-blue-200' 
//                     : 'bg-slate-800/30 border-slate-700 text-slate-500'
//                   }
//                 `}
//               >
//                 <div className="text-2xl mb-1">{step.icon}</div>
//                 <div className="text-xs">{step.label}</div>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Tip */}
//         <div className="text-slate-400 text-sm max-w-md mx-auto">
//           💡 Tip: Zoom in to see aircraft details or search for specific flights
//         </div>
//       </div>
//     </div>
//   );
// }


interface LoadingOverlayProps {
  isLoading: boolean;
}

const LoadingOverlay = ({ isLoading }: LoadingOverlayProps) => {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
      <div className="bg-white rounded-lg p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
        <p className="text-gray-700 font-medium">Loading tracker data...</p>
        <p className="text-gray-500 text-sm mt-2">
          Initializing live tracking system...
        </p>
      </div>
    </div>
  );
};

export default LoadingOverlay;