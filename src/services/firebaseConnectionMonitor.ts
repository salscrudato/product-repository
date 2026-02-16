// src/services/firebaseConnectionMonitor.js
/**
 * Firebase Connection Monitor Service
 * Monitors Firebase connection state and provides reconnection logic
 */

import logger, { LOG_CATEGORIES } from '../utils/logger';

interface ConnectionState {
  state: string;
  isConnected: boolean;
  reconnectAttempts: number;
  timestamp: string | null;
}

type ConnectionListener = (state: ConnectionState) => void;

class FirebaseConnectionMonitor {
  isConnected: boolean;
  listeners: Set<ConnectionListener>;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  maxReconnectDelay: number;
  networkListenersAdded: boolean;

  constructor() {
    this.isConnected = true;
    this.listeners = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.maxReconnectDelay = 30000;
    this.networkListenersAdded = false;
  }

  /**
   * Start monitoring Firebase connection
   *
   * Uses the browser's online/offline events which are reliable and
   * don't require any Firestore reads (avoiding permission-denied errors
   * from dummy snapshot listeners).
   */
  startMonitoring() {
    if (this.networkListenersAdded) {
      return;
    }

    this.setupNetworkMonitoring();
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
  handleConnectionChange(connected: boolean) {
    const wasConnected = this.isConnected;
    this.isConnected = connected;

    if (connected && !wasConnected) {
      // Connection restored - only log if there were previous reconnect attempts
      if (this.reconnectAttempts > 0) {
        logger.info(LOG_CATEGORIES.FIREBASE, 'Firebase connection restored');
      }
      this.reconnectAttempts = 0;
      this.reconnectDelay = 2000; // Reset delay
      this.notifyListeners('connected');
    } else if (!connected && wasConnected) {
      // Connection lost - only log warning
      logger.warn(LOG_CATEGORIES.FIREBASE, 'Firebase connection lost');
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
   * Build a state snapshot for listeners
   */
  private buildStateSnapshot(state: string) {
    return {
      state,
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Add connection state listener
   */
  addListener(callback: ConnectionListener) {
    if (typeof callback !== 'function') {
      logger.error(LOG_CATEGORIES.FIREBASE, 'Connection listener must be a function');
      return () => {};
    }

    this.listeners.add(callback);

    // Immediately notify of current state
    const currentState = this.isConnected ? 'connected' : 'disconnected';
    try {
      callback(this.buildStateSnapshot(currentState));
    } catch { /* ignore */ }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of connection state change
   */
  notifyListeners(state: string) {
    const eventData = this.buildStateSnapshot(state);

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

