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
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // ✅ OPTIMIZATION: Load airport info ONCE on mount
  // ============================================
  useEffect(() => {
    const loadStaticAirportInfo = async () => {
      if (!iataCode || iataCode.trim().length === 0) {
        console.error("Invalid IATA code:", iataCode);
        setError("Invalid airport code");
        setLoading(false);
        return;
      }

      try {
        console.log("📍 Loading static airport info (cached)...");
        const airportRes = await fetchAirportByCode(iataCode, true); // ✅ Use cache

        if (airportRes.success && airportRes.data) {
          setAirport(airportRes.data);
        } else {
          setError("Airport not found");
        }
      } catch (err) {
        console.error("Error loading airport info:", err);
        setError("Failed to load airport info");
      }
    };

    loadStaticAirportInfo();
  }, [iataCode]); // ✅ Only runs when iataCode changes

  // ============================================
  // ✅ OPTIMIZATION: Refresh schedules/stats separately
  // ============================================
  useEffect(() => {
    const loadDynamicData = async () => {
      if (!iataCode || iataCode.trim().length === 0) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log("🔄 Refreshing schedules and stats...");
        
        // ✅ Only fetch dynamic data (schedules, delays, stats)
        const [arrivalsRes, departuresRes, delayedRes, statsData] =
          await Promise.all([
            fetchAirportSchedules(iataCode, "arrivals"),
            fetchAirportSchedules(iataCode, "departures"),
            fetchDelayedFlights(iataCode),
            calculateAirportStats(iataCode),
          ]);

        // ✅ Set all flight data
        if (arrivalsRes.success && arrivalsRes.data) {
          setArrivals(arrivalsRes.data);
          console.log(`✅ Loaded ${arrivalsRes.data.length} arrivals`);
        }

        if (departuresRes.success && departuresRes.data) {
          setDepartures(departuresRes.data);
          console.log(`✅ Loaded ${departuresRes.data.length} departures`);
        }

        if (delayedRes.success && delayedRes.data) {
          setDelayed(delayedRes.data);
          console.log(`✅ Loaded ${delayedRes.data.length} delayed flights`);
        }

        // ✅ Set stats from backend response
        setStats(statsData);
      } catch (err) {
        console.error("Error loading dynamic data:", err);
        setError("Failed to load flight data");
      } finally {
        setLoading(false);
      }
    };

    // ✅ Load immediately on mount
    loadDynamicData();

    // ✅ Auto-refresh ONLY schedules/stats every 60 seconds
    // Airport info is NOT refetched (uses cache)
    const interval = setInterval(() => {
      console.log("⏰ Auto-refresh triggered (60s interval)");
      loadDynamicData();
    }, 60000);

    return () => clearInterval(interval);
  }, [iataCode]);

  const renderScheduleRow = (schedule: AirportSchedule) => (
    <tr
      key={`${schedule.flight_icao}-${schedule.arr_time || schedule.dep_time}`}
      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      <td className="px-4 py-3">
        <div className="font-semibold text-gray-900 dark:text-white">
          {schedule.flight_icao}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {schedule.airline_icao}
        </div>
      </td>
      <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
        <div className="font-medium">
          {activeTab === "arrivals" ? schedule.dep_icao : schedule.arr_icao}
        </div>
      </td>
      <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
        {schedule.arr_time || schedule.dep_time
          ? new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }).format(new Date(schedule.arr_time || schedule.dep_time!))
          : "N/A"}
      </td>
      <td className="px-4 py-3">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${schedule.status === "active"
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            : schedule.status === "landed"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              : schedule.status === "cancelled"
                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
            }`}
        >
          {schedule.status}
        </span>
      </td>
      <td className="px-4 py-3">
        {schedule.delayed && schedule.delayed > 0 ? (
          <span className="text-red-600 dark:text-red-400 font-medium">
            +{schedule.delayed} min
          </span>
        ) : (
          <span className="text-green-600 dark:text-green-400">On Time</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
        {schedule.arr_gate || schedule.dep_gate || "TBA"}
      </td>
    </tr>
  );

  // ✅ Helper to get current tab data
  const getCurrentFlights = () => {
    switch (activeTab) {
      case "arrivals":
        return arrivals;
      case "departures":
        return departures;
      case "delayed":
        return delayed;
      default:
        return [];
    }
  };

  const currentFlights = getCurrentFlights();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-6xl w-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Loading airport data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-6xl w-full p-8">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {error}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Unable to load data for airport code: {iataCode}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4 flex-shrink-0">
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
            className="text-white hover:text-gray-200 transition-colors cursor-pointer"
            aria-label="Close"
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

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
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

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <button
          onClick={() => setActiveTab("arrivals")}
          className={`flex-1 px-6 py-3 text-sm font-medium transition-colors cursor-pointer ${activeTab === "arrivals"
            ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
            : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
        >
          Arrivals ({arrivals.length})
        </button>
        <button
          onClick={() => setActiveTab("departures")}
          className={`flex-1 px-6 py-3 text-sm font-medium transition-colors cursor-pointer ${activeTab === "departures"
            ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
            : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
        >
          Departures ({departures.length})
        </button>
        <button
          onClick={() => setActiveTab("delayed")}
          className={`flex-1 px-6 py-3 text-sm font-medium transition-colors cursor-pointer ${activeTab === "delayed"
            ? "border-b-2 border-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
            : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
        >
          Delayed ({delayed.length})
        </button>
      </div>

      {/* ✅ Scrollable table container - shows ALL flights */}
      <div className="overflow-auto flex-1" style={{ maxHeight: "500px" }}>
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Flight
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                {activeTab === "arrivals" ? "From" : "To"}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Delay
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Gate
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {/* ✅ Render ALL flights without limit */}
            {currentFlights.map(renderScheduleRow)}
          </tbody>
        </table>

        {/* Empty state */}
        {currentFlights.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-5xl mb-4">✈️</div>
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              No {activeTab} flights available
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
              Check back later for updated flight information
            </p>
          </div>
        )}
      </div>
      {/* ✅ Footer with flight count */}
      {currentFlights.length > 0 && (
        <>
          <div className="bg-gray-50 dark:bg-gray-800 px-6 py-3 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            Showing {currentFlights.length} {activeTab} flight
            {currentFlights.length !== 1 ? "s" : ""} • Updates every minute
          </div>
          
          {/* ✅ API Limitation Notice */}
          {currentFlights.length === 100 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-2 text-xs text-blue-700 dark:text-blue-300 border-t border-blue-200 dark:border-blue-800 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>Showing 100 flights (API limit). Additional flights may exist but are not displayed.</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AirportLiveBoard;