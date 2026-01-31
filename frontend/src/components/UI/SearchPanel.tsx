import { useState } from "react";
import { Search, Filter, X } from "lucide-react";

export interface FilterOptions {
  minAltitude?: number;
  maxAltitude?: number;
  objectType?: "aircraft" | "satellite" | "debris" | "all";
  operator?: string;
  minSpeed?: number;
}

interface SearchPanelProps {
  onSearch: (query: string, filters: FilterOptions) => void;
}

const SearchPanel = ({ onSearch }: SearchPanelProps) => {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    objectType: "all",
  });

  const handleSearch = () => {
    onSearch(query, filters);
  };

  const handleClearFilters = () => {
    const clearedFilters = { objectType: "all" as const };
    setFilters(clearedFilters);
    setQuery("");
    onSearch("", clearedFilters);
  };

  // Helper function to update filters and trigger search immediately
  const updateFiltersAndSearch = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    onSearch(query, newFilters);
  };

  return (
    <>
      <div className="relative top-0 right-0 z-10 bg-white rounded-lg shadow-lg p-3 w-80">
        {/* Search Input */}
        <div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition ${
                showFilters
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
              }`}
            >
              <Filter size={18} />
            </button>
            
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  onSearch(e.target.value, filters);
                }}
                placeholder="Search by name, ID, or flight..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery("");
                    onSearch("", filters);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Centered Filter Modal */}
      {showFilters && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-white bg-opacity-50 z-[9998]"
            onClick={() => setShowFilters(false)}
          />
          
          {/* Centered Modal - Positioned in the center of viewport */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] w-full max-w-md p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
                <h2 className="text-lg font-semibold text-gray-800">
                  Advanced Filters
                </h2>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleClearFilters}
                    className="text-sm text-red-500 hover:text-red-700 font-medium cursor-pointer"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Filter Content */}
              <div className="p-6 space-y-4">
                {/* Object Type Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Object Type
                  </label>
                  <select
                    value={filters.objectType || "all"}
                    onChange={(e) => {
                      const newFilters = {
                        ...filters,
                        objectType: e.target.value as FilterOptions["objectType"],
                      };
                      updateFiltersAndSearch(newFilters);
                    }}
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Objects</option>
                    <option value="aircraft">Aircraft Only</option>
                    <option value="satellite">Satellites Only</option>
                    <option value="debris">Debris Only</option>
                  </select>
                </div>

                {/* Altitude Range */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Altitude Range (km)
                  </label>
                  <div className="flex space-x-3">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minAltitude || ""}
                      onChange={(e) => {
                        const newFilters = {
                          ...filters,
                          minAltitude: e.target.value ? Number(e.target.value) : undefined,
                        };
                        setFilters(newFilters);
                      }}
                      onBlur={() => onSearch(query, filters)}
                      className="w-1/2 px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxAltitude || ""}
                      onChange={(e) => {
                        const newFilters = {
                          ...filters,
                          maxAltitude: e.target.value ? Number(e.target.value) : undefined,
                        };
                        setFilters(newFilters);
                      }}
                      onBlur={() => onSearch(query, filters)}
                      className="w-1/2 px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Operator Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Operator
                  </label>
                  <select
                    value={filters.operator || ""}
                    onChange={(e) => {
                      const newFilters = {
                        ...filters,
                        operator: e.target.value || undefined,
                      };
                      updateFiltersAndSearch(newFilters);
                    }}
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Operators</option>
                    <option value="SpaceX">SpaceX</option>
                    <option value="International Space Station">ISS</option>
                    <option value="NASA/USGS">NASA/USGS</option>
                    <option value="ESA">ESA</option>
                    <option value="Russia">Russia</option>
                    <option value="China">China</option>
                  </select>
                </div>

                {/* Speed Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Min Speed (km/s)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g., 7.0"
                    value={filters.minSpeed || ""}
                    onChange={(e) => {
                      const newFilters = {
                        ...filters,
                        minSpeed: e.target.value ? Number(e.target.value) : undefined,
                      };
                      setFilters(newFilters);
                    }}
                    onBlur={() => onSearch(query, filters)}
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Footer with Apply Button */}
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
                <button
                  onClick={() => {
                    handleSearch();
                    setShowFilters(false);
                  }}
                  className="w-full cursor-pointer bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition text-sm font-semibold shadow-sm"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default SearchPanel;