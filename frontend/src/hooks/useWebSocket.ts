/**
 * WebSocket Hook - PRODUCTION-READY WITH ROBUST RECONNECTION
 * 
 * Features:
 * ✅ Exponential backoff reconnection
 * ✅ Connection stability verification
 * ✅ Automatic reconnect attempt reset
 * ✅ Graceful degradation
 * ✅ User notifications on connection issues
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
  maxReconnectAttempts: 10,        // Increased from 5
  baseReconnectDelay: 1000,        // Start at 1 second
  maxReconnectDelay: 30000,        // Cap at 30 seconds
  connectionStabilityDelay: 2000,  // Wait 2s before considering connection stable
  heartbeatInterval: 30000,        // Ping every 30 seconds
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

  const finalConfig: WebSocketConfig = { ...DEFAULT_CONFIG, ...config };

  // Update message handler ref
  useEffect(() => {
    messageHandlerRef.current = onMessage;
  }, [onMessage]);

  /**
   * Calculate exponential backoff delay
   */
  const getReconnectDelay = useCallback((attempt: number): number => {
    const delay = Math.min(
      finalConfig.baseReconnectDelay * Math.pow(2, attempt),
      finalConfig.maxReconnectDelay
    );
    // Add jitter (±20%) to prevent thundering herd
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    return Math.floor(delay + jitter);
  }, [finalConfig]);

  /**
   * Start heartbeat monitoring
   */
  const startHeartbeat = useCallback(() => {
    // Clear existing heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          
          // Check if we've received a pong recently
          const timeSinceLastPong = Date.now() - lastPongTimeRef.current;
          if (timeSinceLastPong > finalConfig.heartbeatInterval * 2) {
            console.warn('⚠️ WebSocket heartbeat timeout - connection may be dead');
            setConnectionQuality('unstable');
            
            // Force reconnect if no pong for 2 heartbeat intervals
            if (wsRef.current) {
              wsRef.current.close();
            }
          }
        } catch (error) {
          console.error('❌ Failed to send heartbeat:', error);
        }
      }
    }, finalConfig.heartbeatInterval);
  }, [finalConfig.heartbeatInterval]);

  /**
   * Stop heartbeat monitoring
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  /**
   * Reset reconnect attempts after stable connection
   */
  const resetReconnectAttempts = useCallback(() => {
    console.log('✅ Connection stable - resetting reconnect counter');
    setReconnectAttempt(0);
    setConnectionQuality('good');
  }, []);

  /**
   * Schedule reconnection attempt
   */
  const scheduleReconnect = useCallback((attempt: number) => {
    // Clear existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Check if we've exceeded max attempts
    if (attempt >= finalConfig.maxReconnectAttempts) {
      console.error(`❌ Max reconnect attempts (${finalConfig.maxReconnectAttempts}) exceeded`);
      setConnectionQuality('lost');
      
      // Notify user
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('websocket-connection-failed', {
          detail: { attempts: attempt }
        });
        window.dispatchEvent(event);
      }
      return;
    }

    const delay = getReconnectDelay(attempt);
    console.log(`🔄 Scheduling reconnect attempt ${attempt + 1}/${finalConfig.maxReconnectAttempts} in ${delay}ms`);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (!isCleanupRef.current) {
        setReconnectAttempt(attempt + 1);
        connect();
      }
    }, delay);
  }, [finalConfig.maxReconnectAttempts, getReconnectDelay]);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    // Don't reconnect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('⚠️ WebSocket already connected');
      return;
    }

    // Don't reconnect during cleanup
    if (isCleanupRef.current) {
      console.log('⚠️ Skipping reconnect - component unmounting');
      return;
    }

    try {
      console.log(`🔌 Connecting to WebSocket: ${WS_URL}/ws (attempt ${reconnectAttempt + 1})`);
      const ws = new WebSocket(`${WS_URL}/ws`);

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setConnectionQuality('unstable'); // Start as unstable until verified

        // ✅ FIX #1: Don't reset attempts immediately - wait for stability
        // Clear any existing stability timeout
        if (stabilityTimeoutRef.current) {
          clearTimeout(stabilityTimeoutRef.current);
        }

        // ✅ FIX #2: Verify connection stability before resetting counter
        stabilityTimeoutRef.current = setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            resetReconnectAttempts();
            startHeartbeat();
          }
        }, finalConfig.connectionStabilityDelay);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle pong responses
          if (data.type === 'pong') {
            lastPongTimeRef.current = Date.now();
            setConnectionQuality('good');
            return;
          }

          // Handle ping requests from server
          if (data.type === 'ping') {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            }
            return;
          }

          // Pass message to handler
          messageHandlerRef.current(data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionQuality('unstable');
      };

      ws.onclose = (event) => {
        console.log(`🔌 WebSocket disconnected: ${event.code} ${event.reason || '(no reason)'}`);
        setIsConnected(false);
        stopHeartbeat();
        
        // Clear stability timeout
        if (stabilityTimeoutRef.current) {
          clearTimeout(stabilityTimeoutRef.current);
          stabilityTimeoutRef.current = null;
        }

        wsRef.current = null;

        // ✅ FIX #3: Only auto-reconnect if not a clean close and not during cleanup
        const isCleanClose = event.code === 1000 || event.code === 1001;
        if (!isCleanClose && !isCleanupRef.current) {
          setConnectionQuality('unstable');
          scheduleReconnect(reconnectAttempt);
        } else if (isCleanupRef.current) {
          console.log('✅ Clean shutdown - no reconnect');
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      scheduleReconnect(reconnectAttempt);
    }
  }, [reconnectAttempt, scheduleReconnect, resetReconnectAttempts, startHeartbeat, stopHeartbeat, finalConfig.connectionStabilityDelay]);

  /**
   * Send message with error handling
   */
  const sendMessage = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('❌ Failed to send message:', error);
        return false;
      }
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message');
      return false;
    }
  }, []);

  /**
   * Force reconnect
   */
  const forceReconnect = useCallback(() => {
    console.log('🔄 Force reconnecting...');
    if (wsRef.current) {
      wsRef.current.close();
    }
    setReconnectAttempt(0);
    connect();
  }, [connect]);

  // Initialize connection
  useEffect(() => {
    isCleanupRef.current = false;
    connect();

    // Cleanup
    return () => {
      console.log('🛑 WebSocket cleanup initiated');
      isCleanupRef.current = true;
      
      stopHeartbeat();
      
      if (stabilityTimeoutRef.current) {
        clearTimeout(stabilityTimeoutRef.current);
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
    };
  }, []); // Only run once on mount

  return {
    isConnected,
    connectionQuality,
    reconnectAttempt,
    sendMessage,
    forceReconnect,
  };
}