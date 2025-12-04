import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plane, Satellite, Trash2 } from 'lucide-react';
import type { Aircraft, SatelliteObject } from '../../types';

interface ObjectsListProps {
  aircraft: Aircraft[];
  satellites: SatelliteObject[];
  debris: SatelliteObject[];
  onSelectObject: (data: Aircraft | SatelliteObject, type: 'aircraft' | 'satellite' | 'debris') => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedObject: any;
}

const ObjectsList: React.FC<ObjectsListProps> = ({
  aircraft,
  satellites,
  debris,
  onSelectObject,
  selectedObject
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'aircraft' | 'satellites' | 'debris'>('satellites');

  const renderAircraftItem = (ac: Aircraft) => (
    <div
      key={ac.hex}
      onClick={() => onSelectObject(ac, 'aircraft')}
      className={`p-3 hover:bg-blue-50 cursor-pointer border-b transition ${
        selectedObject?.data?.hex === ac.hex ? 'bg-blue-100 border-l-4 border-blue-500' : ''
      }`}
    >
      <div className="flex items-start space-x-2">
        <Plane size={16} className="text-blue-500 mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">
            {ac.flight_icao || ac.hex}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {ac.aircraft_icao || 'Unknown'} • {ac.airline_icao || 'N/A'}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Alt: {ac.alt ? `${Math.round(ac.alt / 3.281)} km` : 'N/A'} • 
            Speed: {ac.speed || 'N/A'} kts
          </div>
        </div>
      </div>
    </div>
  );

  const renderSatelliteItem = (sat: SatelliteObject) => (
    <div
      key={sat.norad_id}
      onClick={() => onSelectObject(sat, 'satellite')}
      className={`p-3 hover:bg-green-50 cursor-pointer border-b transition ${
        selectedObject?.data?.norad_id === sat.norad_id ? 'bg-green-100 border-l-4 border-green-500' : ''
      }`}
    >
      <div className="flex items-start space-x-2">
        <Satellite size={16} className="text-green-500 mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{sat.name}</div>
          <div className="text-xs text-gray-500 mt-1">
            ID: {sat.norad_id} • {sat.operator || 'Unknown'}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Alt: {sat.altitude.toFixed(0)} km • 
            Vel: {sat.velocity.toFixed(2)} km/s
          </div>
        </div>
      </div>
    </div>
  );

  const renderDebrisItem = (deb: SatelliteObject) => (
    <div
      key={deb.norad_id}
      onClick={() => onSelectObject(deb, 'debris')}
      className={`p-3 hover:bg-red-50 cursor-pointer border-b transition ${
        selectedObject?.data?.norad_id === deb.norad_id ? 'bg-red-100 border-l-4 border-red-500' : ''
      }`}
    >
      <div className="flex items-start space-x-2">
        <Trash2 size={16} className="text-red-500 mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{deb.name}</div>
          <div className="text-xs text-gray-500 mt-1">
            ID: {deb.norad_id}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Alt: {deb.altitude.toFixed(0)} km • 
            {deb.conjunction_risk && <span className="text-red-600 font-semibold">⚠ Risk</span>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderList = () => {
    let items: React.ReactNode[] = [];
    
    if (selectedTab === 'aircraft') {
      items = aircraft.slice(0, 50).map(renderAircraftItem);
    } else if (selectedTab === 'satellites') {
      items = satellites.slice(0, 50).map(renderSatelliteItem);
    } else {
      items = debris.slice(0, 50).map(renderDebrisItem);
    }

    return (
      <div className="overflow-y-auto max-h-[calc(100vh-250px)]">
        {items.length > 0 ? items : (
          <div className="p-4 text-center text-gray-500 text-sm">
            No objects found
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`absolute right-0 top-0 h-full z-10 transition-transform duration-300 ${
      isExpanded ? 'translate-x-0' : 'translate-x-full'
    }`}>
      <div className="h-full bg-white shadow-2xl flex">
        {/* Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute -left-10 bottom-12 cursor-pointer transform -translate-y-1/2 bg-white rounded-l-lg shadow-lg p-3 hover:bg-gray-50 transition"
        >
          {isExpanded ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        {/* Sidebar Content */}
        <div className="w-80 flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-bold text-lg">Tracked Objects</h3>
            <p className="text-xs text-gray-600 mt-1">
              {aircraft.length + satellites.length + debris.length} objects tracked
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setSelectedTab('aircraft')}
              className={`flex-1 py-3 text-sm font-medium transition ${
                selectedTab === 'aircraft'
                  ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col items-center space-y-1 cursor-pointer">
                <Plane size={18} />
                <span>Aircraft</span>
                <span className="text-xs">({aircraft.length})</span>
              </div>
            </button>
            
            <button
              onClick={() => setSelectedTab('satellites')}
              className={`flex-1 py-3 text-sm font-medium transition ${
                selectedTab === 'satellites'
                  ? 'border-b-2 border-green-500 text-green-600 bg-green-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col items-center space-y-1 cursor-pointer">
                <Satellite size={18} />
                <span>Satellites</span>
                <span className="text-xs">({satellites.length})</span>
              </div>
            </button>
            
            <button
              onClick={() => setSelectedTab('debris')}
              className={`flex-1 py-3 text-sm font-medium transition ${
                selectedTab === 'debris'
                  ? 'border-b-2 border-red-500 text-red-600 bg-red-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col items-center space-y-1 cursor-pointer">
                <Trash2 size={18} />
                <span>Debris</span>
                <span className="text-xs">({debris.length})</span>
              </div>
            </button>
          </div>

          {/* List */}
          {renderList()}
        </div>
      </div>
    </div>
  );
};

export default ObjectsList;