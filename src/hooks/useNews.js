// src/hooks/useNews.js
// Custom hook for news data management with refresh functionality

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchNewsArticles,
  fetchPropertyInsuranceNews,
  fetchCasualtyInsuranceNews,
  fetchCommercialInsuranceNews,
  fetchPCInsuranceNews,
  validateNewsArticles,
  getFallbackNewsArticles,
  getPCFallbackNewsArticles
} from '../services/newsApiService';
import { generateBatchSummaries, getSummarizationStats } from '../services/newsAiService';
import { sampleNews } from '../data/sampleNews';

// Enhanced cache configuration for free tier optimization
const CACHE_KEY = 'phapp_news_cache';
const CACHE_DURATION = 45 * 60 * 1000; // 45 minutes (extended for free tier efficiency)
const MAX_CACHE_AGE = 3 * 60 * 60 * 1000; // 3 hours max (increased for better coverage)
const RATE_LIMIT_CACHE_EXTENSION = 90 * 60 * 1000; // 1.5 hour extension when rate limited
const PRIORITY_CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours for high-relevance articles

// Minimum interval between API requests (ms) to avoid burst‑rate 429
const MIN_FETCH_INTERVAL = 1500;  // NewsData free tier = ≤10 req/s

/**
 * Get cached news data if still valid
 * @param {boolean} allowStale - Allow stale cache when rate limited
 * @returns {Object|null} Cached data or null if expired/invalid
 */
function getCachedNews(allowStale = false) {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached);
    const age = Date.now() - data.timestamp;

    // Return cached data if within cache duration
    if (age < CACHE_DURATION && data.articles && Array.isArray(data.articles)) {
      console.log(`📰 Using cached news data (${Math.round(age / 1000)}s old)`);
      return data;
    }

    // If allowing stale cache (e.g., when rate limited), extend acceptable age
    if (allowStale && age < (CACHE_DURATION + RATE_LIMIT_CACHE_EXTENSION) && data.articles && Array.isArray(data.articles)) {
      console.log(`📰 Using stale cached news data due to rate limiting (${Math.round(age / 1000)}s old)`);
      return { ...data, isStale: true };
    }

    // Clear expired cache
    if (age > MAX_CACHE_AGE) {
      localStorage.removeItem(CACHE_KEY);
    }

    return null;
  } catch (error) {
    console.warn('Failed to read news cache:', error);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

/**
 * Cache news data to localStorage
 * @param {Array} articles - Articles to cache
 * @param {Object} metadata - Additional metadata
 */
function cacheNews(articles, metadata = {}) {
  try {
    const cacheData = {
      articles: validateNewsArticles(articles),
      timestamp: Date.now(),
      source: metadata.source || 'api',
      stats: metadata.stats || null
    };
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    console.log(`💾 Cached ${articles.length} news articles`);
  } catch (error) {
    console.warn('Failed to cache news data:', error);
  }
}

/**
 * Custom hook for news data management
 * @param {Object} options - Configuration options
 * @returns {Object} News state and actions
 */
export function useNews(options = {}) {
  const {
    enableAI = true,
    enableCache = true,
    autoRefresh = false,
    refreshInterval = 30 * 60 * 1000, // 30 minutes
    fallbackToSample = true,
    // Ultra-strict P&C‑specific options
    focusArea = 'pc', // 'pc' (combined), 'property', 'casualty', 'commercial', 'personal'
    minRelevanceScore = 3, // Increased minimum for ultra-strict P&C focus
    includeRegulatory = true,
    includeTechnology = true,
    maxArticles = 15
  } = options;

  // Create stable reference to options to prevent infinite re-renders
  const optionsRef = useRef({
    enableAI,
    enableCache,
    fallbackToSample,
    focusArea,
    minRelevanceScore,
    includeRegulatory,
    includeTechnology,
    maxArticles
  });

  // Update options ref when they change
  useEffect(() => {
    optionsRef.current = {
      enableAI,
      enableCache,
      fallbackToSample,
      focusArea,
      minRelevanceScore,
      includeRegulatory,
      includeTechnology,
      maxArticles
    };
  }, [enableAI, enableCache, fallbackToSample, focusArea, minRelevanceScore, includeRegulatory, includeTechnology, maxArticles]);

  // State management
  const [state, setState] = useState({
    articles: [],
    loading: true,
    refreshing: false,
    error: null,
    lastUpdated: null,
    source: 'cache', // 'cache', 'api', 'sample', 'fallback'
    stats: null
  });

  // Refs for cleanup and control
  const abortControllerRef = useRef(null);
  // Tracks the timestamp of the last successful/attempted fetch
  const lastFetchRef = useRef(0);
  const refreshTimeoutRef = useRef(null);
  const mountedRef = useRef(true);

  /**
   * Update state safely (only if component is still mounted)
   */
  const safeSetState = useCallback((updater) => {
    if (mountedRef.current) {
      setState(updater);
    }
  }, []);

  /**
   * Clear all cached news data
   */
  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(CACHE_KEY);
      console.log('🗑️ News cache cleared');
    } catch (error) {
      console.warn('Failed to clear news cache:', error);
    }
  }, []);

  /**
   * Fetch fresh news articles from API with AI summarization
   */
  const fetchFreshNews = useCallback(async (isRefresh = false) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Throttle to respect burst limits
    const now = Date.now();
    if (now - lastFetchRef.current < MIN_FETCH_INTERVAL) {
      console.warn('🛑 Throttled fetch – called too quickly');
      return;
    }
    lastFetchRef.current = now;

    abortControllerRef.current = new AbortController();

    try {
      // Get current options from stable ref first
      const currentOptions = optionsRef.current;

      safeSetState(prev => ({
        ...prev,
        [isRefresh ? 'refreshing' : 'loading']: true,
        error: null
      }));

      console.log(`🔄 ${isRefresh ? 'Refreshing' : 'Loading'} ${currentOptions.focusArea.toUpperCase()} insurance news articles...`);

      if (!process.env.REACT_APP_NEWSDATA_KEY) {
        throw new Error('Missing NewsData API key');
      }

      // Choose appropriate fetch function based on focus area
      let fetchFunction = fetchNewsArticles;
      switch (currentOptions.focusArea) {
        case 'pc':
          fetchFunction = fetchPCInsuranceNews;
          break;
        case 'property':
          fetchFunction = fetchPropertyInsuranceNews;
          break;
        case 'casualty':
          fetchFunction = fetchCasualtyInsuranceNews;
          break;
        case 'commercial':
          fetchFunction = fetchCommercialInsuranceNews;
          break;
        default:
          fetchFunction = fetchNewsArticles;
      }

      // Fetch articles with P&C-specific options
      let articles = await fetchFunction({
        apiKey: process.env.REACT_APP_NEWSDATA_KEY, // explicit key → avoids phantom 429
        focusArea: currentOptions.focusArea,
        minRelevanceScore: currentOptions.minRelevanceScore,
        includeRegulatory: currentOptions.includeRegulatory,
        includeTechnology: currentOptions.includeTechnology,
        maxArticles: currentOptions.maxArticles
      });

      // Validate articles
      articles = validateNewsArticles(articles);

      if (articles.length === 0) {
        throw new Error('No valid articles received from API');
      }

      let stats = null;

      // Generate AI summaries if enabled
      if (currentOptions.enableAI && process.env.REACT_APP_OPENAI_KEY) {
        console.log('🤖 Generating AI summaries...');

        const progressCallback = (completed, total) => {
          safeSetState(prev => ({
            ...prev,
            stats: { ...prev.stats, aiProgress: Math.round((completed / total) * 100) }
          }));
        };

        articles = await generateBatchSummaries(
          articles,
          process.env.REACT_APP_OPENAI_KEY,
          progressCallback
        );

        stats = getSummarizationStats(articles);
        console.log('📊 AI Summarization stats:', stats);
      }

      // Cache the results
      if (currentOptions.enableCache) {
        cacheNews(articles, { source: 'api', stats });
      }

      safeSetState(prev => ({
        ...prev,
        articles,
        loading: false,
        refreshing: false,
        error: null,
        lastUpdated: new Date().toISOString(),
        source: 'api',
        stats
      }));

      console.log(`✅ Successfully loaded ${articles.length} news articles`);

    } catch (error) {
      console.error('Failed to fetch news:', error);

      // Respect Retry‑After header when genuinely rate‑limited
      const retryAfter = error?.response?.headers?.get?.('retry-after');
      if (error.message.includes('429') && retryAfter) {
        const delay = (parseInt(retryAfter, 10) || 15) * 1000;
        console.warn(`🔁 Retrying after ${delay / 1000}s due to 429`);
        setTimeout(() => fetchFreshNews(isRefresh), delay);
        return;
      }

      // Get current options from stable ref
      const currentOptions = optionsRef.current;

      // Try fallback options with special handling for rate limiting
      let fallbackArticles = [];
      let fallbackSource = 'error';

      // If rate limited, try to use stale cache first
      if (error.message.includes('Rate limit') && currentOptions.enableCache) {
        const staleCache = getCachedNews(true);
        if (staleCache) {
          safeSetState(prev => ({
            ...prev,
            articles: staleCache.articles,
            loading: false,
            refreshing: false,
            error: 'Rate limited - using cached data',
            lastUpdated: new Date(staleCache.timestamp).toISOString(),
            source: 'cache',
            stats: staleCache.stats
          }));
          return;
        }
      }

      if (currentOptions.fallbackToSample) {
        // First try P&C-specific fallback articles
        try {
          fallbackArticles = getPCFallbackNewsArticles();
          fallbackSource = 'fallback';
          console.log('📰 Using P&C-specific fallback news articles');
        } catch (fallbackError) {
          // Second try: general fallback articles
          try {
            fallbackArticles = getFallbackNewsArticles();
            fallbackSource = 'fallback';
            console.log('📰 Using general fallback news articles');
          } catch (generalFallbackError) {
            // Last resort: use sample data
            fallbackArticles = sampleNews;
            fallbackSource = 'sample';
            console.log('📰 Using sample news data');
          }
        }
      }

      safeSetState(prev => ({
        ...prev,
        articles: fallbackArticles,
        loading: false,
        refreshing: false,
        error: error.message,
        source: fallbackSource,
        stats: null
      }));
    }
  }, [safeSetState]);

  /**
   * Load news data (from cache or API)
   */
  const loadNews = useCallback(async () => {
    // Try cache first if enabled
    if (enableCache) {
      const cached = getCachedNews();
      if (cached) {
        safeSetState(prev => ({
          ...prev,
          articles: cached.articles,
          loading: false,
          lastUpdated: new Date(cached.timestamp).toISOString(),
          source: cached.source,
          stats: cached.stats
        }));
        return;
      }
    }

    // No valid cache, fetch fresh data
    await fetchFreshNews(false);
  }, [enableCache, fetchFreshNews, safeSetState]);

  /**
   * Refresh news data (clear cache and fetch fresh)
   */
  const refresh = useCallback(async () => {
    console.log('🔄 Manual news refresh triggered');
    
    // Clear cache to force fresh fetch
    if (enableCache) {
      clearCache();
    }
    
    await fetchFreshNews(true);
  }, [enableCache, clearCache, fetchFreshNews]);

  /**
   * Setup auto-refresh if enabled
   */
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshTimeoutRef.current = setInterval(() => {
        console.log('⏰ Auto-refresh triggered');
        refresh();
      }, refreshInterval);

      return () => {
        if (refreshTimeoutRef.current) {
          clearInterval(refreshTimeoutRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, refresh]);

  /**
   * Initial data load
   */
  useEffect(() => {
    loadNews();
  }, [loadNews]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      if (refreshTimeoutRef.current) {
        clearInterval(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Data
    articles: state.articles,
    
    // Status
    loading: state.loading,
    refreshing: state.refreshing,
    error: state.error,
    
    // Metadata
    lastUpdated: state.lastUpdated,
    source: state.source,
    stats: state.stats,
    
    // Actions
    refresh,
    clearCache,
    
    // Computed properties
    isEmpty: state.articles.length === 0,
    isFromCache: state.source === 'cache',
    isFromAPI: state.source === 'api',
    hasError: !!state.error
  };
}

export { MIN_FETCH_INTERVAL };

export default useNews;
