/**
 * Flight Card Component
 */

export function FlightCard({ flight }: any) {
  return (
    <div style={{
      background: 'white',
      padding: '12px',
      marginBottom: '10px',
      borderRadius: '6px',
      border: '1px solid #e2e8f0',
      transition: 'all 0.2s',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.transform = 'translateY(0)';
    }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <strong style={{ color: '#1e293b', fontSize: '16px' }}>
          {flight.callsign || flight.id || 'Unknown'}
        </strong>
        {flight.interpolated && (
          <span style={{
            background: '#fef3c7',
            color: '#92400e',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600'
          }}>
            Interpolated ({flight.seconds_since_update}s)
          </span>
        )}
      </div>

      {/* Details */}
      <div style={{
        fontSize: '14px',
        color: '#64748b',
        display: 'grid',
        gap: '4px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📍</span>
          <span>{flight.lat?.toFixed(4)}°, {flight.lng?.toFixed(4)}°</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>⬆️</span>
          <span>{flight.alt?.toFixed(0)} m</span>
          <span style={{ marginLeft: '10px' }}>🧭</span>
          <span>{flight.heading?.toFixed(0)}°</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>⚡</span>
          <span>{flight.speed?.toFixed(0)} km/h</span>
          <span style={{ marginLeft: '10px' }}>✈️</span>
          <span>{flight.aircraft || 'N/A'}</span>
        </div>
        {flight.status && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📊</span>
            <span style={{
              background: flight.status === 'en-route' ? '#dbeafe' : '#fef3c7',
              color: flight.status === 'en-route' ? '#1e40af' : '#92400e',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '12px'
            }}>
              {flight.status}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}