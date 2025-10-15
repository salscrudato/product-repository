// src/services/firebaseConnectionMonitor.js
/**
 * Firebase Connection Monitor Service
 * Monitors Firebase connection state and provides reconnection logic
 */

import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import logger, { LOG_CATEGORIES } from '../utils/logger';

class FirebaseConnectionMonitor {
  constructor() {
    this.isConnected = true;
    this.listeners = new Set();
    this.connectionCheckInterval = null;
    this.unsubscribeConnectionListener = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // Start with 2 seconds
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.networkListenersAdded = false;
  }

  /**
   * Start monitoring Firebase connection
   */
  startMonitoring() {
    if (this.unsubscribeConnectionListener) {
      // Connection monitor already running (reduced logging noise)
      return;
    }

    // Starting Firebase connection monitor (reduced logging noise)

    // Firestore doesn't have a .info/connected path like Realtime Database
    // Instead, we'll use network events and onSnapshot error handling
    // to detect connection state

    // Setup network monitoring as primary detection method
    this.setupNetworkMonitoring();

    // Also use a dummy snapshot listener to detect Firestore connectivity
    // This will fail gracefully if there's no connection
    try {
      // Create a minimal listener that will error if disconnected
      const dummyRef = doc(db, '_connection_test_', 'status');

      this.unsubscribeConnectionListener = onSnapshot(
        dummyRef,
        () => {
          // Successfully listening means we're connected
          if (!this.isConnected) {
            this.handleConnectionChange(true);
          }
        },
        (error) => {
          // Snapshot error might indicate connection issues
          // But don't treat all errors as disconnection
          // Suppress permission errors - they're expected for guest users
          if (error.code !== 'permission-denied') {
            logger.warn(
              LOG_CATEGORIES.FIREBASE,
              'Firestore snapshot listener error (may indicate connection issue)',
              { error: error.message }
            );
          }
        }
      );
    } catch (error) {
      logger.warn(
        LOG_CATEGORIES.FIREBASE,
        'Could not setup Firestore connection listener, using network events only',
        { error: error.message }
      );
    }
  }

  /**
   * Setup network event monitoring as fallback
   */
  setupNetworkMonitoring() {
    if (typeof window === 'undefined') return;

    // Only add listeners once
    if (this.networkListenersAdded) return;
    this.networkListenersAdded = true;

    window.addEventListener('online', () => {
      // Network online event detected (reduced logging noise)
      this.handleConnectionChange(true);
    });

    window.addEventListener('offline', () => {
      // Network offline event detected (reduced logging noise)
      this.handleConnectionChange(false);
    });

    // Initial check - assume connected unless proven otherwise
    // This prevents false "disconnected" warnings on page load
    const initialState = navigator.onLine !== false; // Default to true if undefined
    if (initialState) {
      this.isConnected = true;
      this.notifyListeners('connected');
    }
  }

  /**
   * Handle connection state change
   */
  handleConnectionChange(connected) {
    const wasConnected = this.isConnected;
    this.isConnected = connected;

    if (connected && !wasConnected) {
      // Connection restored - only log if there were previous reconnect attempts
      if (this.reconnectAttempts > 0) {
        logger.info(LOG_CATEGORIES.FIREBASE, '✅ Firebase connection restored');
      }
      this.reconnectAttempts = 0;
      this.reconnectDelay = 2000; // Reset delay
      this.notifyListeners('connected');
    } else if (!connected && wasConnected) {
      // Connection lost - only log warning
      logger.warn(LOG_CATEGORIES.FIREBASE, '⚠️ Firebase connection lost');
      this.notifyListeners('disconnected');
      this.attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(
        LOG_CATEGORIES.FIREBASE,
        'Max reconnection attempts reached',
        { attempts: this.reconnectAttempts }
      );
      this.notifyListeners('reconnect-failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    // Attempting reconnection (reduced logging noise - only log on errors)

    setTimeout(() => {
      if (!this.isConnected) {
        this.notifyListeners('reconnecting');
        // The actual reconnection is handled by Firebase SDK
        // We just need to check if we're back online
        if (navigator.onLine) {
          this.handleConnectionChange(true);
        } else {
          this.attemptReconnect();
        }
      }
    }, delay);
  }

  /**
   * Add connection state listener
   */
  addListener(callback) {
    if (typeof callback !== 'function') {
      logger.error(LOG_CATEGORIES.FIREBASE, 'Connection listener must be a function');
      return () => {};
    }

    this.listeners.add(callback);

    // Immediately notify of current state
    callback({
      state: this.isConnected ? 'connected' : 'disconnected',
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    });

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of connection state change
   */
  notifyListeners(state) {
    const eventData = {
      state,
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      timestamp: new Date().toISOString()
    };

    this.listeners.forEach(listener => {
      try {
        listener(eventData);
      } catch (error) {
        logger.error(
          LOG_CATEGORIES.FIREBASE,
          'Error in connection listener',
          {},
          error
        );
      }
    });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    // Stopping Firebase connection monitor (reduced logging noise)

    if (this.unsubscribeConnectionListener) {
      this.unsubscribeConnectionListener();
      this.unsubscribeConnectionListener = null;
    }

    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }

    this.listeners.clear();
  }

  /**
   * Get current connection state
   */
  getConnectionState() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      hasListeners: this.listeners.size > 0
    };
  }

  /**
   * Force reconnection attempt
   */
  forceReconnect() {
    // Forcing reconnection attempt (reduced logging noise)
    this.reconnectAttempts = 0;
    this.attemptReconnect();
  }
}

// Create singleton instance
const connectionMonitor = new FirebaseConnectionMonitor();

// Auto-start monitoring in browser environment
if (typeof window !== 'undefined') {
  connectionMonitor.startMonitoring();
}

export default connectionMonitor;

