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
  }

  /**
   * Start monitoring Firebase connection
   */
  startMonitoring() {
    if (this.unsubscribeConnectionListener) {
      logger.warn(LOG_CATEGORIES.FIREBASE, 'Connection monitor already running');
      return;
    }

    logger.info(LOG_CATEGORIES.FIREBASE, 'Starting Firebase connection monitor');

    // Use Firestore's built-in connection detection
    // Create a reference to a special connection document
    const connectedRef = doc(db, '.info/connected');

    try {
      this.unsubscribeConnectionListener = onSnapshot(
        connectedRef,
        (snapshot) => {
          const connected = snapshot.exists();
          this.handleConnectionChange(connected);
        },
        (error) => {
          // If we can't listen to .info/connected, fall back to network events
          logger.warn(
            LOG_CATEGORIES.FIREBASE,
            'Could not monitor .info/connected, using network events',
            { error: error.message }
          );
          this.setupNetworkMonitoring();
        }
      );
    } catch (error) {
      logger.error(
        LOG_CATEGORIES.FIREBASE,
        'Failed to start connection monitoring',
        {},
        error
      );
      this.setupNetworkMonitoring();
    }

    // Also monitor network status
    this.setupNetworkMonitoring();
  }

  /**
   * Setup network event monitoring as fallback
   */
  setupNetworkMonitoring() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      logger.info(LOG_CATEGORIES.NETWORK, 'Network online event detected');
      this.handleConnectionChange(true);
    });

    window.addEventListener('offline', () => {
      logger.info(LOG_CATEGORIES.NETWORK, 'Network offline event detected');
      this.handleConnectionChange(false);
    });

    // Initial check
    this.handleConnectionChange(navigator.onLine);
  }

  /**
   * Handle connection state change
   */
  handleConnectionChange(connected) {
    const wasConnected = this.isConnected;
    this.isConnected = connected;

    if (connected && !wasConnected) {
      // Connection restored
      logger.info(LOG_CATEGORIES.FIREBASE, '✅ Firebase connection restored');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 2000; // Reset delay
      this.notifyListeners('connected');
    } else if (!connected && wasConnected) {
      // Connection lost
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

    logger.info(
      LOG_CATEGORIES.FIREBASE,
      `Attempting reconnection in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
      { delay, attempt: this.reconnectAttempts }
    );

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
    logger.info(LOG_CATEGORIES.FIREBASE, 'Stopping Firebase connection monitor');

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
    logger.info(LOG_CATEGORIES.FIREBASE, 'Forcing reconnection attempt');
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

