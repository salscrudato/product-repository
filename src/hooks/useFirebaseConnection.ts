// src/hooks/useFirebaseConnection.js
/**
 * React Hook for Firebase Connection Monitoring
 * Provides real-time connection state and reconnection controls
 */

import { useState, useEffect } from 'react';
import connectionMonitor from '../services/firebaseConnectionMonitor';

/**
 * Hook to monitor Firebase connection state
 * @returns {Object} Connection state and controls
 */
export const useFirebaseConnection = () => {
  const [connectionState, setConnectionState] = useState({
    isConnected: true,
    state: 'connected',
    reconnectAttempts: 0,
    timestamp: null
  });

  useEffect(() => {
    // Subscribe to connection state changes
    const unsubscribe = connectionMonitor.addListener((state) => {
      setConnectionState(state);
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  // Force reconnection
  const forceReconnect = () => {
    connectionMonitor.forceReconnect();
  };

  return {
    ...connectionState,
    forceReconnect,
    isOnline: connectionState.isConnected,
    isOffline: !connectionState.isConnected,
    isReconnecting: connectionState.state === 'reconnecting'
  };
};

export default useFirebaseConnection;

