/**
 * WebSocket Hook - FINAL FIX FOR RECONNECTION LOOPS
 * 
 * Prevents React Strict Mode double-mounting issues
 * Stops unnecessary reconnections
 * Only reconnects on actual failures
 */
import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

interface WebSocketConfig {
  maxReconnectAttempts: number;
  baseReconnectDelay: number;
  maxReconnectDelay: number;
  connectionStabilityDelay: number;
  heartbeatInterval: number;
}

const DEFAULT_CONFIG: WebSocketConfig = {
  maxReconnectAttempts: 10,
  baseReconnectDelay: 1000,
  maxReconnectDelay: 30000,
  connectionStabilityDelay: 5000, // ✅ Increased to 5s
  heartbeatInterval: 20000, // ✅ 20s (less aggressive)
};

export function useWebSocket(onMessage: (data: any) => void, config: Partial<WebSocketConfig> = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'unstable' | 'lost'>('lost');
  
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stabilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messageHandlerRef = useRef(onMessage);
  const lastPongTimeRef = useRef<number>(Date.now());
  const isCleanupRef = useRef(false);
  const isConnectingRef = useRef(false);
  const missedPongsRef = useRef(0);
  const hasEverConnectedRef = useRef(false); // ✅ NEW: Track if we've ever connected

  const finalConfig: WebSocketConfig = { ...DEFAULT_CONFIG, ...config };

  useEffect(() => {
    messageHandlerRef.current = onMessage;
  }, [onMessage]);

  const getReconnectDelay = useCallback((attempt: number): number => {
    const delay = Math.min(
      finalConfig.baseReconnectDelay * Math.pow(2, attempt),
      finalConfig.maxReconnectDelay
    );
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    return Math.floor(delay + jitter);
  }, [finalConfig.baseReconnectDelay, finalConfig.maxReconnectDelay]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    lastPongTimeRef.current = Date.now();
    missedPongsRef.current = 0;

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          
          const timeSinceLastPong = Date.now() - lastPongTimeRef.current;
          
          // ✅ Very lenient timeout - 3x heartbeat interval
          if (timeSinceLastPong > finalConfig.heartbeatInterval * 3) {
            missedPongsRef.current++;
            
            // ✅ Only log occasionally to avoid spam
            if (missedPongsRef.current === 1) {
              console.warn(`⚠️ No pong for ${(timeSinceLastPong / 1000).toFixed(0)}s`);
            }
            
            if (connectionQuality === 'good') {
              setConnectionQuality('unstable');
            }
            
            // ✅ Only reconnect after 5 consecutive missed pongs
            if (missedPongsRef.current >= 5) {
              console.error('❌ 5 consecutive missed pongs - forcing reconnect');
              if (wsRef.current) {
                wsRef.current.close();
              }
            }
          } else {
            if (missedPongsRef.current > 0) {
              missedPongsRef.current = 0;
              if (connectionQuality !== 'good') {
                setConnectionQuality('good');
              }
            }
          }
        } catch (error) {
          console.error('❌ Failed to send heartbeat:', error);
        }
      }
    }, finalConfig.heartbeatInterval);
  }, [finalConfig.heartbeatInterval, connectionQuality]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    missedPongsRef.current = 0;
  }, []);

  const resetReconnectAttempts = useCallback(() => {
    console.log('✅ Connection stable - resetting reconnect counter');
    setReconnectAttempt(0);
    setConnectionQuality('good');
  }, []);

  const scheduleReconnect = useCallback((attempt: number) => {
    // ✅ Don't reconnect if we've never successfully connected
    // This prevents reconnection loops during React Strict Mode
    if (!hasEverConnectedRef.current && attempt > 3) {
      console.log('⚠️ Never successfully connected - stopping reconnect attempts');
      setConnectionQuality('lost');
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (attempt >= finalConfig.maxReconnectAttempts) {
      console.error(`❌ Max reconnect attempts (${finalConfig.maxReconnectAttempts}) exceeded`);
      setConnectionQuality('lost');
      return;
    }

    const delay = getReconnectDelay(attempt);
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${attempt + 1}/${finalConfig.maxReconnectAttempts})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (!isCleanupRef.current) {
        connectWithRetry(attempt + 1);
      }
    }, delay);
  }, [finalConfig.maxReconnectAttempts, getReconnectDelay]);

  const connectWithRetry = useCallback((attempt: number) => {
    // ✅ Prevent multiple simultaneous connections
    if (isConnectingRef.current) {
      return;
    }

    // ✅ Don't reconnect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // ✅ Don't reconnect during cleanup
    if (isCleanupRef.current) {
      return;
    }

    isConnectingRef.current = true;
    setReconnectAttempt(attempt);

    try {
      console.log(`🔌 Connecting to ${WS_URL}/ws (attempt ${attempt + 1})`);
      const ws = new WebSocket(`${WS_URL}/ws`);

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        isConnectingRef.current = false;
        setIsConnected(true);
        setConnectionQuality('unstable'); // Start as unstable
        hasEverConnectedRef.current = true; // ✅ Mark as successfully connected

        if (stabilityTimeoutRef.current) {
          clearTimeout(stabilityTimeoutRef.current);
        }

        // ✅ Wait longer before declaring stable (5s)
        stabilityTimeoutRef.current = setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN && !isCleanupRef.current) {
            resetReconnectAttempts();
            startHeartbeat();
          }
        }, finalConfig.connectionStabilityDelay);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'pong') {
            lastPongTimeRef.current = Date.now();
            missedPongsRef.current = 0;
            if (connectionQuality !== 'good') {
              setConnectionQuality('good');
            }
            return;
          }

          if (data.type === 'ping') {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            }
            return;
          }

          messageHandlerRef.current(data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        isConnectingRef.current = false;
        setConnectionQuality('unstable');
      };

      ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed: ${event.code} ${event.reason || '(no reason)'}`);
        isConnectingRef.current = false;
        setIsConnected(false);
        stopHeartbeat();
        
        if (stabilityTimeoutRef.current) {
          clearTimeout(stabilityTimeoutRef.current);
          stabilityTimeoutRef.current = null;
        }

        wsRef.current = null;

        // ✅ Only auto-reconnect on unexpected close
        const isCleanClose = event.code === 1000 || event.code === 1001;
        const isComponentUnmounting = event.reason === 'Component unmounting';
        
        if (!isCleanClose && !isCleanupRef.current && !isComponentUnmounting) {
          setConnectionQuality('unstable');
          scheduleReconnect(attempt);
        } else {
          console.log('✅ Clean shutdown - no reconnect');
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      isConnectingRef.current = false;
      scheduleReconnect(attempt);
    }
  }, [
    finalConfig.connectionStabilityDelay,
    connectionQuality,
    resetReconnectAttempts,
    startHeartbeat,
    stopHeartbeat,
    scheduleReconnect,
  ]);

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('❌ Failed to send message:', error);
        return false;
      }
    }
    return false;
  }, []);

  const forceReconnect = useCallback(() => {
    console.log('🔄 Force reconnecting...');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (stabilityTimeoutRef.current) {
      clearTimeout(stabilityTimeoutRef.current);
      stabilityTimeoutRef.current = null;
    }
    
    stopHeartbeat();
    
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    isConnectingRef.current = false;
    missedPongsRef.current = 0;
    connectWithRetry(0);
  }, [connectWithRetry, stopHeartbeat]);

  // ✅ Initialize connection ONCE
  useEffect(() => {
    isCleanupRef.current = false;
    
    // ✅ Only connect if not already connecting/connected
    if (!isConnectingRef.current && !wsRef.current) {
      connectWithRetry(0);
    }

    return () => {
      console.log('🛑 WebSocket cleanup initiated');
      isCleanupRef.current = true;
      isConnectingRef.current = false;
      
      stopHeartbeat();
      
      if (stabilityTimeoutRef.current) {
        clearTimeout(stabilityTimeoutRef.current);
        stabilityTimeoutRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
    };
  }, []); // ✅ Empty deps - only run once

  return {
    isConnected,
    connectionQuality,
    reconnectAttempt,
    sendMessage,
    forceReconnect,
  };
}