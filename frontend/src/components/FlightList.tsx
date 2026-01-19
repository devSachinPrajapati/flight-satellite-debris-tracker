/**
 * Flight List Component
 */
import { useState } from 'react';
import { FlightCard } from './FlightCard';

export function FlightList({ flights, isLoading, error }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [maxDisplay, setMaxDisplay] = useState(20);

  // Filter flights based on search
  const filteredFlights = flights.filter((flight: { callsign: string; id: string; aircraft: string; }) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      flight.callsign?.toLowerCase().includes(search) ||
      flight.id?.toLowerCase().includes(search) ||
      flight.aircraft?.toLowerCase().includes(search)
    );
  });

  const displayedFlights = filteredFlights.slice(0, maxDisplay);

  if (isLoading) {
    return (
      <div style={{
        background: '#f8fafc',
        padding: '40px',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>⏳</div>
        <p style={{ color: '#64748b' }}>Loading flights...</p>
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
        <h3 style={{ color: '#991b1b', marginTop: 0 }}>❌ Error Loading Flights</h3>
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
          ✈️ Flights ({filteredFlights.length})
        </h2>
        <input
          type="text"
          placeholder="Search flights..."
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
        {displayedFlights.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>
            {searchTerm ? 'No flights match your search' : 'No flights currently tracked'}
          </p>
        ) : (
          <>
            {displayedFlights.map((flight: { id: any; }, idx: any) => (
              <FlightCard key={flight.id || idx} flight={flight} />
            ))}

            {filteredFlights.length > maxDisplay && (
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
                Load More ({filteredFlights.length - maxDisplay} remaining)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}