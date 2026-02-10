import { Globe, Map as MapIcon } from "lucide-react";

interface MapViewToggleProps {
  isGlobeView: boolean;
  onToggle: () => void;
}

const MapViewToggle = ({ isGlobeView, onToggle }: MapViewToggleProps) => {
  return (
    <button
      onClick={onToggle}
      className="bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-all duration-200 cursor-pointer group relative"
      title={isGlobeView ? "Switch to Flat Map" : "Switch to Globe View"}
      aria-label={isGlobeView ? "Switch to Flat Map" : "Switch to Globe View"}
    >
      {/* Add visual feedback with animation */}
      <div className="relative">
        {isGlobeView ? (
          <MapIcon 
            size={20} 
            className="text-gray-700 group-hover:text-blue-500 transition-colors duration-200" 
          />
        ) : (
          <Globe 
            size={20} 
            className="text-blue-500 group-hover:text-blue-600 transition-colors duration-200" 
          />
        )}
        
        {/* Active indicator */}
        <div className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full transition-all duration-200 ${
          isGlobeView ? 'bg-blue-500' : 'bg-green-500'
        }`} />
      </div>
      
      {/* Tooltip on hover */}
      <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
        {isGlobeView ? "Switch to Flat Map" : "Switch to Globe View"}
      </div>
    </button>
  );
};

export default MapViewToggle;