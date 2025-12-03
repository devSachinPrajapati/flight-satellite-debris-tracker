import { Plane, Satellite, Trash2, Globe } from "lucide-react";
import type { ViewMode } from "../../types";

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const ViewModeToggle = ({
  viewMode,
  onViewModeChange,
}: ViewModeToggleProps) => {
  const buttons = [
    { mode: "all" as ViewMode, icon: Globe, label: "All", color: "blue" },
    {
      mode: "aircraft" as ViewMode,
      icon: Plane,
      label: "Aircraft",
      color: "blue",
    },
    {
      mode: "satellite" as ViewMode,
      icon: Satellite,
      label: "Satellites",
      color: "green",
    },
    { mode: "debris" as ViewMode, icon: Trash2, label: "Debris", color: "red" },
  ];

  const getButtonClass = (mode: ViewMode, color: string) => {
    if (viewMode === mode) {
      return `bg-${color}-500 text-white`;
    }
    return "bg-gray-100 text-gray-700 hover:bg-gray-200";
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-2 absolute top-10 right-10 z-10">
      <div className="flex flex-col space-y-2">
        {buttons.map(({ mode, icon: Icon, label, color }) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={`flex items-center space-x-2 px-4 py-2 rounded transition cursor-pointer ${getButtonClass(
              mode,
              color
            )}`}
          >
            <Icon size={18} />
            <span className="font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ViewModeToggle;
