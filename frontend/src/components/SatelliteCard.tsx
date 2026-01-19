/**
 * Satellite Card Component
 */

export function SatelliteCard({ satellite }: any) {
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
      <div style={{ marginBottom: '8px' }}>
        <strong style={{
          color: '#1e293b',
          fontSize: '16px',
          display: 'block',
          marginBottom: '4px'
        }}>
          {satellite.name || satellite.norad_id}
        </strong>
        <span style={{
          fontSize: '12px',
          color: '#94a3b8',
          fontFamily: 'monospace'
        }}>
          NORAD: {satellite.norad_id}
        </span>
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
          <span>{satellite.lat?.toFixed(4)}°, {satellite.lng?.toFixed(4)}°</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🛰️</span>
          <span>Altitude: {satellite.alt?.toFixed(0)} km</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>⚡</span>
          <span>Velocity: {satellite.velocity?.toFixed(2)} km/s</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🌍</span>
          <span style={{
            background: '#dbeafe',
            color: '#1e40af',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '12px'
          }}>
            Orbit: {satellite.alt > 2000 ? 'High' : satellite.alt > 500 ? 'Medium' : 'Low'} Earth
          </span>
        </div>
      </div>
    </div>
  );
}