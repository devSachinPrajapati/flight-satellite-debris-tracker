/**
 * Connection Status Component
 */

export function ConnectionStatus({ isConnected, lastUpdate }: any) {
  const formatTime = (timestamp: string | number | Date) => {
    if (!timestamp) return 'Waiting...';
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch {
      return 'Invalid time';
    }
  };

  return (
    <div style={{
      display: 'flex',
      gap: '20px',
      flexWrap: 'wrap',
      marginBottom: '20px'
    }}>
      {/* Connection Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontWeight: 'bold', color: '#475569' }}>WebSocket:</span>
        <span style={{
          background: isConnected ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'white',
            animation: isConnected ? 'pulse 2s infinite' : 'none'
          }}></span>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Last Update */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontWeight: 'bold', color: '#475569' }}>Last Update:</span>
        <span style={{
          background: '#3b82f6',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          {formatTime(lastUpdate)}
        </span>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}