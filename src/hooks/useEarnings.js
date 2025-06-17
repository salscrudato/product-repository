// src/hooks/useEarnings.js
// Custom hook for earnings data management with refresh functionality

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchAllPCInsurersEarnings,
  fetchCompanyEarnings,
  fetchEarningsCalendar,
  validateEarningsData,
  getFallbackEarningsData
} from '../services/earningsApiService';
import { generateBatchEarningsSummaries, getSummarizationStats } from '../services/earningsAiService';
import { sampleEarnings, sampleEarningsCalendar } from '../data/sampleEarnings';

// Cache configuration
const CACHE_CONFIG = {
  EARNINGS_KEY: 'earnings_cache',
  CALENDAR_KEY: 'earnings_calendar_cache',
  CACHE_DURATION: 4 * 60 * 60 * 1000, // 4 hours (earnings don't change frequently)
  MAX_CACHE_SIZE: 50 // Maximum number of cached earnings reports
};

/**
 * Get cached earnings data
 */
function getCachedEarnings() {
  try {
    const cached = localStorage.getItem(CACHE_CONFIG.EARNINGS_KEY);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - data.timestamp > CACHE_CONFIG.CACHE_DURATION) {
      localStorage.removeItem(CACHE_CONFIG.EARNINGS_KEY);
      return null;
    }
    
    console.log('📋 Using cached earnings data');
    return data;
  } catch (error) {
    console.error('Error reading earnings cache:', error);
    localStorage.removeItem(CACHE_CONFIG.EARNINGS_KEY);
    return null;
  }
}

/**
 * Cache earnings data
 */
function cacheEarnings(earnings, source, stats = null) {
  try {
    const cacheData = {
      earnings,
      source,
      stats,
      timestamp: Date.now()
    };
    
    localStorage.setItem(CACHE_CONFIG.EARNINGS_KEY, JSON.stringify(cacheData));
    console.log(`💾 Cached ${earnings.length} earnings reports`);
  } catch (error) {
    console.error('Error caching earnings data:', error);
  }
}

/**
 * Get cached earnings calendar
 */
function getCachedEarningsCalendar() {
  try {
    const cached = localStorage.getItem(CACHE_CONFIG.CALENDAR_KEY);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    const now = Date.now();
    
    // Calendar cache expires faster (1 hour)
    if (now - data.timestamp > 60 * 60 * 1000) {
      localStorage.removeItem(CACHE_CONFIG.CALENDAR_KEY);
      return null;
    }
    
    return data.calendar;
  } catch (error) {
    console.error('Error reading earnings calendar cache:', error);
    localStorage.removeItem(CACHE_CONFIG.CALENDAR_KEY);
    return null;
  }
}

/**
 * Cache earnings calendar
 */
function cacheEarningsCalendar(calendar) {
  try {
    const cacheData = {
      calendar,
      timestamp: Date.now()
    };
    
    localStorage.setItem(CACHE_CONFIG.CALENDAR_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error caching earnings calendar:', error);
  }
}

/**
 * Custom hook for earnings data management
 * @param {Object} options - Configuration options
 * @returns {Object} Earnings state and actions
 */
export function useEarnings(options = {}) {
  const {
    enableAI = true,
    enableCache = true,
    autoRefresh = false,
    refreshInterval = 4 * 60 * 60 * 1000, // 4 hours
    fallbackToSample = true,
    includeCalendar = false
  } = options;

  // Create stable reference to options
  const optionsRef = useRef({
    enableAI,
    enableCache,
    fallbackToSample,
    includeCalendar
  });

  // Update options ref when they change
  useEffect(() => {
    optionsRef.current = {
      enableAI,
      enableCache,
      fallbackToSample,
      includeCalendar
    };
  }, [enableAI, enableCache, fallbackToSample, includeCalendar]);

  // State management
  const [state, setState] = useState({
    earnings: [],
    calendar: [],
    loading: true,
    refreshing: false,
    error: null,
    lastUpdated: null,
    source: 'cache', // 'cache', 'api', 'sample', 'fallback'
    stats: null
  });

  // Refs for cleanup
  const mountedRef = useRef(true);
  const refreshIntervalRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  /**
   * Safe state setter that checks if component is still mounted
   */
  const safeSetState = useCallback((updater) => {
    if (mountedRef.current) {
      setState(updater);
    }
  }, []);

  /**
   * Fetch fresh earnings data from API
   */
  const fetchFreshEarnings = useCallback(async (isRefresh = false) => {
    const currentOptions = optionsRef.current;
    
    if (!isRefresh) {
      safeSetState(prev => ({ ...prev, loading: true, error: null }));
    } else {
      safeSetState(prev => ({ ...prev, refreshing: true, error: null }));
    }

    try {
      console.log('🏢 Fetching fresh earnings data...');
      
      // Fetch earnings data
      const result = await fetchAllPCInsurersEarnings();
      let earnings = result.earnings || [];
      
      // Validate earnings data
      earnings = earnings.filter(validateEarningsData);
      
      if (earnings.length === 0) {
        throw new Error('No valid earnings data received from API');
      }

      // Enhance with AI summaries if enabled
      let stats = null;
      if (currentOptions.enableAI && earnings.length > 0) {
        console.log('🤖 Generating AI summaries for earnings...');
        try {
          earnings = await generateBatchEarningsSummaries(earnings);
          stats = getSummarizationStats(earnings);
        } catch (aiError) {
          console.warn('⚠️ AI enhancement failed:', aiError.message);
          // Continue without AI enhancement
        }
      }

      // Fetch earnings calendar if requested
      let calendar = [];
      if (currentOptions.includeCalendar) {
        try {
          calendar = await fetchEarningsCalendar();
          cacheEarningsCalendar(calendar);
        } catch (calendarError) {
          console.warn('⚠️ Failed to fetch earnings calendar:', calendarError.message);
          calendar = getCachedEarningsCalendar() || sampleEarningsCalendar;
        }
      }

      // Cache the results
      if (currentOptions.enableCache) {
        cacheEarnings(earnings, 'api', stats);
      }

      safeSetState(prev => ({
        ...prev,
        earnings,
        calendar,
        loading: false,
        refreshing: false,
        error: null,
        lastUpdated: new Date().toISOString(),
        source: 'api',
        stats
      }));

      console.log(`✅ Successfully loaded ${earnings.length} earnings reports`);

    } catch (error) {
      console.error('❌ Failed to fetch earnings data:', error);
      
      // Try fallback options
      let fallbackEarnings = [];
      let fallbackSource = 'error';
      
      if (currentOptions.fallbackToSample) {
        console.log('📋 Using sample earnings data as fallback');
        fallbackEarnings = sampleEarnings;
        fallbackSource = 'sample';
      } else if (currentOptions.enableCache) {
        const cached = getCachedEarnings();
        if (cached) {
          fallbackEarnings = cached.earnings;
          fallbackSource = 'cache';
        }
      }

      safeSetState(prev => ({
        ...prev,
        earnings: fallbackEarnings,
        calendar: currentOptions.includeCalendar ? (getCachedEarningsCalendar() || sampleEarningsCalendar) : [],
        loading: false,
        refreshing: false,
        error: error.message,
        source: fallbackSource,
        stats: null
      }));
    }
  }, [safeSetState]);

  /**
   * Refresh earnings data
   */
  const refresh = useCallback(async () => {
    await fetchFreshEarnings(true);
  }, [fetchFreshEarnings]);

  /**
   * Load earnings data (from cache or API)
   */
  const loadEarnings = useCallback(async () => {
    // Try cache first if enabled
    if (enableCache) {
      const cached = getCachedEarnings();
      if (cached) {
        const calendar = includeCalendar ? (getCachedEarningsCalendar() || sampleEarningsCalendar) : [];
        
        safeSetState(prev => ({
          ...prev,
          earnings: cached.earnings,
          calendar,
          loading: false,
          lastUpdated: new Date(cached.timestamp).toISOString(),
          source: cached.source,
          stats: cached.stats
        }));
        return;
      }
    }

    // No valid cache, fetch fresh data
    await fetchFreshEarnings(false);
  }, [enableCache, includeCalendar, fetchFreshEarnings, safeSetState]);

  // Initial load
  useEffect(() => {
    loadEarnings();
  }, [loadEarnings]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        console.log('🔄 Auto-refreshing earnings data...');
        refresh();
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, refresh]);

  // Computed properties
  const isEmpty = state.earnings.length === 0;
  const isFromAPI = state.source === 'api';
  const hasError = !!state.error;

  return {
    earnings: state.earnings,
    calendar: state.calendar,
    loading: state.loading,
    refreshing: state.refreshing,
    error: state.error,
    source: state.source,
    stats: state.stats,
    lastUpdated: state.lastUpdated,
    refresh,
    isEmpty,
    isFromAPI,
    hasError
  };
}

export default useEarnings;
