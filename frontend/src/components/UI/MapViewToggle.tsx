import { Globe, Map as MapIcon } from "lucide-react";

interface MapViewToggleProps {
  isGlobeView: boolean;
  onToggle: () => void;
}

const MapViewToggle = ({ isGlobeView, onToggle }: MapViewToggleProps) => {
  return (
    <button
      onClick={onToggle}
      className="bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer"
      title={isGlobeView ? "Switch to Flat Map" : "Switch to Globe View"}
    >
      {isGlobeView ? (
        <MapIcon size={20} className="text-gray-700" />
      ) : (
        <Globe size={20} className="text-blue-500" />
      )}
    </button>
  );
};

export default MapViewToggle;
