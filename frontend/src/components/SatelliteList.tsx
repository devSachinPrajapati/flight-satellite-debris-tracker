/**
 * Satellite List Component
 */
import { useState } from 'react';
import { SatelliteCard } from './SatelliteCard';

export function SatelliteList({ satellites, isLoading, error }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [maxDisplay, setMaxDisplay] = useState(20);

  // Filter satellites based on search
  const filteredSatellites = satellites.filter((satellite: { name: string; norad_id: string; }) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      satellite.name?.toLowerCase().includes(search) ||
      satellite.norad_id?.toLowerCase().includes(search)
    );
  });

  const displayedSatellites = filteredSatellites.slice(0, maxDisplay);

  if (isLoading) {
    return (
      <div style={{
        background: '#f8fafc',
        padding: '40px',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>⏳</div>
        <p style={{ color: '#64748b' }}>Loading satellites...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: '#fee2e2',
        border: '2px solid #ef4444',
        padding: '20px',
        borderRadius: '8px'
      }}>
        <h3 style={{ color: '#991b1b', marginTop: 0 }}>❌ Error Loading Satellites</h3>
        <p style={{ color: '#7f1d1d' }}>{error.message}</p>
      </div>
    );
  }

  return (
    <div style={{
      background: '#f8fafc',
      padding: '20px',
      borderRadius: '8px',
      border: '2px solid #e2e8f0'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h2 style={{ margin: 0 }}>
          🛰️ Satellites ({filteredSatellites.length})
        </h2>
        <input
          type="text"
          placeholder="Search satellites..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '14px',
            width: '200px'
          }}
        />
      </div>

      <div style={{
        maxHeight: '600px',
        overflowY: 'auto',
        paddingRight: '5px'
      }}>
        {displayedSatellites.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>
            {searchTerm ? 'No satellites match your search' : 'No satellites currently tracked'}
          </p>
        ) : (
          <>
            {displayedSatellites.map((satellite: { norad_id: any; }, idx: any) => (
              <SatelliteCard key={satellite.norad_id || idx} satellite={satellite} />
            ))}

            {filteredSatellites.length > maxDisplay && (
              <button
                onClick={() => setMaxDisplay(prev => prev + 20)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Load More ({filteredSatellites.length - maxDisplay} remaining)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}