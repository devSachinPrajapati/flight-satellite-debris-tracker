import { useState, useEffect } from "react";
import type { Airport, AirportSchedule, AirportStats } from "../../types";
import {
  fetchAirportByCode,
  fetchAirportSchedules,
  fetchDelayedFlights,
  calculateAirportStats,
} from "../../services/airportService";

interface AirportLiveBoardProps {
  iataCode: string;
  onClose: () => void;
}

const AirportLiveBoard = ({ iataCode, onClose }: AirportLiveBoardProps) => {
  const [airport, setAirport] = useState<Airport | null>(null);
  const [arrivals, setArrivals] = useState<AirportSchedule[]>([]);
  const [departures, setDepartures] = useState<AirportSchedule[]>([]);
  const [delayed, setDelayed] = useState<AirportSchedule[]>([]);
  const [stats, setStats] = useState<AirportStats>({
    total_arrivals_today: 0,
    total_departures_today: 0,
    delayed_flights: 0,
    cancelled_flights: 0,
    active_flights: 0,
  });
  const [activeTab, setActiveTab] = useState<
    "arrivals" | "departures" | "delayed"
  >("arrivals");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAirportData = async () => {
      // ✅ Validate iataCode before making requests
      if (!iataCode || iataCode.trim().length === 0) {
        console.error("Invalid IATA code:", iataCode);
        setLoading(false);
        return;
      }

      setLoading(true);

      // ✅ Fetch all data including stats from backend
      const [airportRes, arrivalsRes, departuresRes, delayedRes, statsData] =
        await Promise.all([
          fetchAirportByCode(iataCode),
          fetchAirportSchedules(iataCode, "arrivals"),
          fetchAirportSchedules(iataCode, "departures"),
          fetchDelayedFlights(iataCode),
          calculateAirportStats(iataCode), // ✅ Now correctly passing only iataCode
        ]);

      if (airportRes.success && airportRes.data) {
        setAirport(airportRes.data);
      }

      if (arrivalsRes.success && arrivalsRes.data) {
        setArrivals(arrivalsRes.data);
      }

      if (departuresRes.success && departuresRes.data) {
        setDepartures(departuresRes.data);
      }

      if (delayedRes.success && delayedRes.data) {
        setDelayed(delayedRes.data);
      }

      // ✅ Set stats from backend response
      setStats(statsData);

      setLoading(false);
    };

    loadAirportData();
    const interval = setInterval(loadAirportData, 60000);

    return () => clearInterval(interval);
  }, [iataCode]);

  const renderScheduleRow = (schedule: AirportSchedule) => (
    <tr
      key={schedule.flight_icao}
      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-white"
    >
      <td className="px-4 py-3">
        <div className="font-semibold text-gray-100 dark:text-white">
          {schedule.flight_icao}
        </div>
        <div className="text-xs text-gray-100">{schedule.airline_icao}</div>
      </td>
      <td className="px-4 py-3">
        {activeTab === "arrivals" ? schedule.dep_icao : schedule.arr_icao}
      </td>
      <td className="px-4 py-3">
        {schedule.arr_time || schedule.dep_time
          ? new Date(
              schedule.arr_time || schedule.dep_time!
            ).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "N/A"}
      </td>
      <td className="px-4 py-3">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            schedule.status === "active"
              ? "bg-green-100 text-green-800"
              : schedule.status === "landed"
              ? "bg-blue-100 text-blue-800"
              : schedule.status === "cancelled"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {schedule.status}
        </span>
      </td>
      <td className="px-4 py-3">
        {schedule.delayed && schedule.delayed > 0 ? (
          <span className="text-red-600 font-medium">
            +{schedule.delayed} min
          </span>
        ) : (
          <span className="text-green-600">On Time</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-100">
        {schedule.arr_gate || schedule.dep_gate || "TBA"}
      </td>
    </tr>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {airport?.name || iataCode}
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              {airport?.city}, {airport?.country} • {iataCode}/
              {airport?.icao_code}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 cursor-pointer"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* ✅ Stats cards - now properly accessing state */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <div className="text-white text-2xl font-bold">
              {stats.total_arrivals_today}
            </div>
            <div className="text-blue-100 text-xs">Arrivals Today</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <div className="text-white text-2xl font-bold">
              {stats.total_departures_today}
            </div>
            <div className="text-blue-100 text-xs">Departures Today</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <div className="text-white text-2xl font-bold">
              {stats.active_flights}
            </div>
            <div className="text-blue-100 text-xs">Active Flights</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <div className="text-white text-2xl font-bold">
              {stats.delayed_flights}
            </div>
            <div className="text-blue-100 text-xs">Delayed</div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("arrivals")}
          className={`flex-1 px-6 py-3 text-sm font-medium cursor-pointer ${
            activeTab === "arrivals"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          }`}
        >
          Arrivals ({arrivals.length})
        </button>
        <button
          onClick={() => setActiveTab("departures")}
          className={`flex-1 px-6 py-3 text-sm font-medium cursor-pointer ${
            activeTab === "departures"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          }`}
        >
          Departures ({departures.length})
        </button>
        <button
          onClick={() => setActiveTab("delayed")}
          className={`flex-1 px-6 py-3 text-sm font-medium cursor-pointer ${
            activeTab === "delayed"
              ? "border-b-2 border-red-500 text-red-600 dark:text-red-400"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          }`}
        >
          Delayed ({delayed.length})
        </button>
      </div>

      <div className="overflow-auto" style={{ maxHeight: "500px" }}>
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                Flight
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                {activeTab === "arrivals" ? "From" : "To"}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                Delay
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                Gate
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900">
            {activeTab === "arrivals" && arrivals.map(renderScheduleRow)}
            {activeTab === "departures" && departures.map(renderScheduleRow)}
            {activeTab === "delayed" && delayed.map(renderScheduleRow)}
          </tbody>
        </table>

        {((activeTab === "arrivals" && arrivals.length === 0) ||
          (activeTab === "departures" && departures.length === 0) ||
          (activeTab === "delayed" && delayed.length === 0)) && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No {activeTab} flights available
          </div>
        )}
      </div>
    </div>
  );
};

export default AirportLiveBoard;