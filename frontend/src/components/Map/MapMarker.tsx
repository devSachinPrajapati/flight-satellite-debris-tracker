interface MapMarkerProps {
  type: "aircraft" | "satellite" | "debris";
  onClick: () => void;
}

const MapMarker = ({ type, onClick }: MapMarkerProps) => {
  const getMarkerColor = () => {
    switch (type) {
      case "aircraft":
        return "#3b82f6";
      case "satellite":
        return "#10b981";
      case "debris":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getMarkerSize = () => {
    return type === "debris" ? "16px" : "24px";
  };
  
  return (
    <div
      onClick={onClick}
      className="marker cursor-pointer transition-transform hover:scale-125"
      style={{
        width: getMarkerSize(),
        height: getMarkerSize(),
        borderRadius: "50%",
        backgroundColor: getMarkerColor(),
        border: "2px solid white",
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
      }}
    />
  );
};

export default MapMarker;
