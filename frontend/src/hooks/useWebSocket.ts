// /**
//  * WebSocket Hook - Manages WebSocket connection
//  */
// import { useEffect, useState, useCallback, useRef } from 'react';
// import { io, Socket } from 'socket.io-client';

// const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8000';

// interface WebSocketMessage {
//   type: 'initial_data' | 'position_update' | 'pong';
//   timestamp: string;
//   data?: {
//     flights?: any[];
//     satellites?: any[];
//   };
// }

// export function useWebSocket(onMessage: (message: WebSocketMessage) => void) {
//   const [socket, setSocket] = useState<Socket | null>(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const [lastUpdate, setLastUpdate] = useState<string | null>(null);
//   const reconnectAttempts = useRef(0);
//   const onMessageRef = useRef(onMessage);

//   // Update the callback ref when it changes
//   useEffect(() => {
//     onMessageRef.current = onMessage;
//   }, [onMessage]);

//   useEffect(() => {
//     console.log('🔌 Initializing WebSocket connection to:', WS_URL);

//     // Create WebSocket connection
//     const newSocket = io(WS_URL, {
//       transports: ['websocket', 'polling'],
//       reconnection: true,
//       reconnectionDelay: 1000,
//       reconnectionDelayMax: 5000,
//       reconnectionAttempts: 10,
//       timeout: 20000,
//     });

//     // Connection opened
//     newSocket.on('connect', () => {
//       console.log('✅ WebSocket connected');
//       setIsConnected(true);
//       reconnectAttempts.current = 0;
//     });

//     // Connection closed
//     newSocket.on('disconnect', (reason) => {
//       console.log('❌ WebSocket disconnected:', reason);
//       setIsConnected(false);
//     });

//     // Receive messages
//     newSocket.on('message', (data: string | WebSocketMessage) => {
//       try {
//         const message: WebSocketMessage = typeof data === 'string' ? JSON.parse(data) : data;
//         setLastUpdate(message.timestamp);
//         onMessageRef.current(message);
        
//         // Log only for initial data, not every update (too verbose)
//         if (message.type === 'initial_data') {
//           console.log('📡 Received initial data from WebSocket');
//         }
//       } catch (error) {
//         console.error('Error parsing WebSocket message:', error);
//       }
//     });

//     // Error handling
//     newSocket.on('connect_error', (error) => {
//       console.error('WebSocket connection error:', error.message);
//       reconnectAttempts.current += 1;
      
//       if (reconnectAttempts.current > 5) {
//         console.warn('⚠️ Multiple connection failures. Check if backend is running on', WS_URL);
//       }
//     });

//     // Reconnection attempt
//     newSocket.on('reconnect_attempt', (attemptNumber) => {
//       console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
//     });

//     // Reconnection success
//     newSocket.on('reconnect', (attemptNumber) => {
//       console.log(`✅ Reconnected after ${attemptNumber} attempts`);
//     });

//     setSocket(newSocket);

//     // Cleanup on unmount
//     return () => {
//       console.log('🔌 Closing WebSocket connection');
//       newSocket.disconnect();
//     };
//   }, []); // Empty deps - only run once

//   // Send message to server
//   const sendMessage = useCallback((message: any) => {
//     if (socket && isConnected) {
//       socket.emit('message', JSON.stringify(message));
//     }
//   }, [socket, isConnected]);

//   // Request immediate update
//   const requestUpdate = useCallback(() => {
//     sendMessage({ type: 'request_update' });
//   }, [sendMessage]);

//   // Send ping
//   const sendPing = useCallback(() => {
//     sendMessage({ type: 'ping' });
//   }, [sendMessage]);

//   return {
//     socket,
//     isConnected,
//     lastUpdate,
//     sendMessage,
//     requestUpdate,
//     sendPing
//   };
// }


/**
 * WebSocket Hook - Manages WebSocket connection (Native WebSocket)
 */
import { useEffect, useState, useCallback, useRef } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

interface WebSocketMessage {
  type: 'initial_data' | 'position_update' | 'pong';
  timestamp: string;
  data?: {
    flights?: any[];
    satellites?: any[];
  };
}

export function useWebSocket(onMessage: (message: WebSocketMessage) => void) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const onMessageRef = useRef(onMessage);

  // Update the callback ref when it changes
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    // Construct WebSocket URL - note the /ws endpoint
    const wsUrl = WS_URL.replace('http://', 'ws://').replace('https://', 'wss://');
    const fullUrl = wsUrl.endsWith('/ws') ? wsUrl : `${wsUrl}/ws`;
    
    console.log('🔌 Connecting to WebSocket:', fullUrl);

    try {
      const newSocket = new WebSocket(fullUrl);

      newSocket.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      newSocket.onclose = (event) => {
        console.log('❌ WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Attempt reconnection with exponential backoff
        if (reconnectAttempts.current < 10) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`🔄 Reconnecting in ${delay}ms... (Attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current += 1;
            connect();
          }, delay);
        } else {
          console.error('⚠️ Max reconnection attempts reached');
        }
      };

      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      newSocket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastUpdate(message.timestamp);
          onMessageRef.current(message);
          
          // Log only for initial data
          if (message.type === 'initial_data') {
            console.log('📡 Received initial data from WebSocket');
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      setSocket(newSocket);
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, [WS_URL]);

  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      console.log('🔌 Closing WebSocket connection');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        socket.close();
      }
    };
  }, [connect]);

  // Send message to server
  const sendMessage = useCallback((message: any) => {
    if (socket && isConnected && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, [socket, isConnected]);

  // Request immediate update
  const requestUpdate = useCallback(() => {
    sendMessage({ type: 'request_update' });
  }, [sendMessage]);

  // Send ping
  const sendPing = useCallback(() => {
    sendMessage({ type: 'ping' });
  }, [sendMessage]);

  return {
    socket,
    isConnected,
    lastUpdate,
    sendMessage,
    requestUpdate,
    sendPing
  };
}