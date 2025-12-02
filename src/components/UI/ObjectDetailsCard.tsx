import { X, Plane, Satellite, Trash2 } from "lucide-react";
import type { SelectedObject, Aircraft, SatelliteObject } from "../../types";

interface ObjectDetailsCardProps {
  selectedObject: SelectedObject;
  onClose: () => void;
}

const ObjectDetailsCard = ({
  selectedObject,
  onClose,
}: ObjectDetailsCardProps) => {
  const { type, data } = selectedObject;

  const renderAircraftDetails = (aircraft: Aircraft) => (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Plane size={24} className="text-blue-500" />
          <h3 className="text-lg font-bold text-gray-800">Aircraft Details</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 transition"
        >
          <X size={20} />
        </button>
      </div>
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-gray-600 block">Flight Number</span>
            <span className="font-semibold text-gray-900">
              {aircraft.flight_icao || aircraft.flight_number || "N/A"}
            </span>
          </div>
          <div>
            <span className="text-gray-600 block">Aircraft Type</span>
            <span className="font-semibold text-gray-900">
              {aircraft.aircraft_icao || "N/A"}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-gray-600 block">Airline</span>
            <span className="font-semibold text-gray-900">
              {aircraft.airline_icao || "N/A"}
            </span>
          </div>
          <div>
            <span className="text-gray-600 block">Hex Code</span>
            <span className="font-semibold text-gray-900">{aircraft.hex}</span>
          </div>
        </div>
        <div className="border-t pt-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-gray-600 block">Altitude</span>
              <span className="font-semibold text-blue-600">
                {aircraft.alt ? `${aircraft.alt.toLocaleString()} ft` : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-gray-600 block">Speed</span>
              <span className="font-semibold text-blue-600">
                {aircraft.speed ? `${aircraft.speed} knots` : "N/A"}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-gray-600 block">Heading</span>
            <span className="font-semibold text-gray-900">
              {aircraft.dir ? `${aircraft.dir}°` : "N/A"}
            </span>
          </div>
          <div>
            <span className="text-gray-600 block">Vertical Speed</span>
            <span className="font-semibold text-gray-900">
              {aircraft.v_speed ? `${aircraft.v_speed} ft/min` : "N/A"}
            </span>
          </div>
        </div>
        {(aircraft.dep_iata || aircraft.arr_iata) && (
          <div className="border-t pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-600 block">Departure</span>
                <span className="font-semibold text-gray-900">
                  {aircraft.dep_iata || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-gray-600 block">Arrival</span>
                <span className="font-semibold text-gray-900">
                  {aircraft.arr_iata || "N/A"}
                </span>
              </div>
            </div>
          </div>
        )}
        <div className="border-t pt-3 bg-gray-50 -mx-4 px-4 -mb-4 pb-4 rounded-b-lg">
          <span className="text-gray-600 block text-xs mb-1">Position</span>
          <span className="font-mono text-xs text-gray-900">
            {aircraft.lat.toFixed(6)}°, {aircraft.lng.toFixed(6)}°
          </span>
        </div>
      </div>
    </>
  );

  const renderSatelliteDetails = (obj: SatelliteObject) => {
    const Icon = obj.object_type === "satellite" ? Satellite : Trash2;
    const iconColor =
      obj.object_type === "satellite" ? "text-green-500" : "text-red-500";

    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Icon size={24} className={iconColor} />
            <h3 className="text-lg font-bold text-gray-800">
              {obj.object_type === "satellite" ? "Satellite" : "Space Debris"}{" "}
              Details
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-gray-600 block">Name</span>
            <span className="font-semibold text-gray-900">{obj.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-gray-600 block">NORAD ID</span>
              <span className="font-semibold text-gray-900">
                {obj.norad_id}
              </span>
            </div>
            {obj.operator && (
              <div>
                <span className="text-gray-600 block">Operator</span>
                <span className="font-semibold text-gray-900">
                  {obj.operator}
                </span>
              </div>
            )}
          </div>
          <div className="border-t pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-600 block">Altitude</span>
                <span className="font-semibold text-green-600">
                  {obj.altitude} km
                </span>
              </div>
              <div>
                <span className="text-gray-600 block">Velocity</span>
                <span className="font-semibold text-green-600">
                  {obj.velocity} km/s
                </span>
              </div>
            </div>
          </div>
          {obj.inclination && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-600 block">Inclination</span>
                <span className="font-semibold text-gray-900">
                  {obj.inclination.toFixed(2)}°
                </span>
              </div>
              {obj.period_minutes && (
                <div>
                  <span className="text-gray-600 block">Orbital Period</span>
                  <span className="font-semibold text-gray-900">
                    {obj.period_minutes.toFixed(2)} min
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Visibility Status</span>
            <span
              className={`font-semibold ${
                obj.visible ? "text-green-600" : "text-red-600"
              }`}
            >
              {obj.visible ? "● Visible" : "● Not Visible"}
            </span>
          </div>
          {obj.conjunction_risk !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Conjunction Risk</span>
              <span
                className={`font-semibold ${
                  obj.conjunction_risk ? "text-red-600" : "text-green-600"
                }`}
              >
                {obj.conjunction_risk ? "⚠ High Risk" : "✓ Low Risk"}
              </span>
            </div>
          )}
          <div className="border-t pt-3 bg-gray-50 -mx-4 px-4 -mb-4 pb-4 rounded-b-lg">
            <span className="text-gray-600 block text-xs mb-1">Position</span>
            <span className="font-mono text-xs text-gray-900">
              {obj.lat.toFixed(6)}°, {obj.lng.toFixed(6)}°
            </span>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full animate-fadeIn">
      {type === "aircraft"
        ? renderAircraftDetails(data as Aircraft)
        : renderSatelliteDetails(data as SatelliteObject)}
    </div>
  );
};

export default ObjectDetailsCard;
