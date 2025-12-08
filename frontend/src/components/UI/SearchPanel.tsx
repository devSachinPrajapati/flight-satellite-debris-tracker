import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';

export interface FilterOptions {
  minAltitude?: number;
  maxAltitude?: number;
  objectType?: 'aircraft' | 'satellite' | 'debris' | 'all';
  operator?: string;
  minSpeed?: number;
}

interface SearchPanelProps {
  onSearch: (query: string, filters: FilterOptions) => void;
}

const SearchPanel = ({ onSearch } : SearchPanelProps) => {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    objectType: 'all'
  });

  const handleSearch = () => {
    onSearch(query, filters);
  };

  const handleClearFilters = () => {
    setFilters({ objectType: 'all' });
    setQuery('');
    onSearch('', { objectType: 'all' });
  };

  return (
    <div className="absolute top-2 right-16 z-10 bg-white rounded-lg shadow-lg p-4 w-80">
      {/* Search Input */}
      <div className="mb-3">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
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
                  setQuery('');
                  onSearch('', filters);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition ${
              showFilters ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
            }`}
          >
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="space-y-3 border-t pt-3 animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Advanced Filters</span>
            <button
              onClick={handleClearFilters}
              className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
            >
              Clear All
            </button>
          </div>

          {/* Object Type Filter */}
          <div>
            <label className="text-xs text-gray-600 block mb-1">Object Type</label>
            <select
              value={filters.objectType || 'all'}
              onChange={(e) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const newFilters = { ...filters, objectType: e.target.value as any };
                setFilters(newFilters);
                onSearch(query, newFilters);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Objects</option>
              <option value="aircraft">Aircraft Only</option>
              <option value="satellite">Satellites Only</option>
              <option value="debris">Debris Only</option>
            </select>
          </div>

          {/* Altitude Range */}
          <div>
            <label className="text-xs text-gray-600 block mb-1">Altitude Range (km)</label>
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.minAltitude || ''}
                onChange={(e) => {
                  const newFilters = { ...filters, minAltitude: Number(e.target.value) || undefined };
                  setFilters(newFilters);
                }}
                className="w-1/2 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.maxAltitude || ''}
                onChange={(e) => {
                  const newFilters = { ...filters, maxAltitude: Number(e.target.value) || undefined };
                  setFilters(newFilters);
                }}
                className="w-1/2 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Operator Filter */}
          <div>
            <label className="text-xs text-gray-600 block mb-1">Operator</label>
            <select
              value={filters.operator || ''}
              onChange={(e) => {
                const newFilters = { ...filters, operator: e.target.value || undefined };
                setFilters(newFilters);
                onSearch(query, newFilters);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
            <label className="text-xs text-gray-600 block mb-1">Min Speed (km/s)</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g., 7.0"
              value={filters.minSpeed || ''}
              onChange={(e) => {
                const newFilters = { ...filters, minSpeed: Number(e.target.value) || undefined };
                setFilters(newFilters);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleSearch}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition text-sm font-medium"
          >
            Apply Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchPanel;