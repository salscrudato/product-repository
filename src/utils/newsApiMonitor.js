// src/utils/newsApiMonitor.js
// Free tier monitoring and optimization utilities for NewsData.io API

/**
 * Free Tier Usage Monitor
 * Tracks API usage to stay within NewsData.io free tier limits
 */
class NewsApiMonitor {
  constructor() {
    this.storageKey = 'newsdata_usage_monitor';
    this.resetUsageData();
  }

  /**
   * Initialize or reset usage tracking data
   */
  resetUsageData() {
    const today = new Date().toDateString();
    const stored = this.getStoredData();
    
    // Reset if it's a new day
    if (!stored || stored.date !== today) {
      this.usageData = {
        date: today,
        requestCount: 0,
        lastRequestTime: 0,
        rateLimitHits: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalArticlesFetched: 0,
        averageRelevanceScore: 0,
        queryOptimizations: 0
      };
      this.saveUsageData();
    } else {
      this.usageData = stored;
    }
  }

  /**
   * Get stored usage data from localStorage
   */
  getStoredData() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load usage data:', error);
      return null;
    }
  }

  /**
   * Save usage data to localStorage
   */
  saveUsageData() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.usageData));
    } catch (error) {
      console.warn('Failed to save usage data:', error);
    }
  }

  /**
   * Check if we can make a request within free tier limits
   */
  canMakeRequest() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.usageData.lastRequestTime;
    const dailyLimit = 200; // NewsData.io free tier daily limit
    const minInterval = 5000; // 5 seconds minimum between requests

    // Check daily limit
    if (this.usageData.requestCount >= dailyLimit) {
      return {
        allowed: false,
        reason: 'Daily limit reached',
        resetTime: this.getNextResetTime()
      };
    }

    // Check minimum interval
    if (timeSinceLastRequest < minInterval) {
      return {
        allowed: false,
        reason: 'Rate limiting',
        waitTime: minInterval - timeSinceLastRequest
      };
    }

    return { allowed: true };
  }

  /**
   * Record a successful API request
   */
  recordRequest(articleCount = 0, averageRelevance = 0) {
    this.usageData.requestCount++;
    this.usageData.lastRequestTime = Date.now();
    this.usageData.successfulRequests++;
    this.usageData.totalArticlesFetched += articleCount;
    
    // Update average relevance score
    if (averageRelevance > 0) {
      const totalRelevance = this.usageData.averageRelevanceScore * (this.usageData.successfulRequests - 1);
      this.usageData.averageRelevanceScore = (totalRelevance + averageRelevance) / this.usageData.successfulRequests;
    }

    this.saveUsageData();
  }

  /**
   * Record a failed API request
   */
  recordFailure(isRateLimit = false) {
    this.usageData.requestCount++;
    this.usageData.lastRequestTime = Date.now();
    this.usageData.failedRequests++;
    
    if (isRateLimit) {
      this.usageData.rateLimitHits++;
    }

    this.saveUsageData();
  }

  /**
   * Record query optimization
   */
  recordOptimization() {
    this.usageData.queryOptimizations++;
    this.saveUsageData();
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    const successRate = this.usageData.requestCount > 0 
      ? Math.round((this.usageData.successfulRequests / this.usageData.requestCount) * 100)
      : 0;

    const averageArticlesPerRequest = this.usageData.successfulRequests > 0
      ? Math.round(this.usageData.totalArticlesFetched / this.usageData.successfulRequests)
      : 0;

    return {
      ...this.usageData,
      successRate,
      averageArticlesPerRequest,
      remainingRequests: Math.max(0, 200 - this.usageData.requestCount),
      efficiency: this.calculateEfficiency()
    };
  }

  /**
   * Calculate API efficiency score
   */
  calculateEfficiency() {
    if (this.usageData.successfulRequests === 0) return 0;
    
    const relevanceWeight = this.usageData.averageRelevanceScore / 5; // Normalize to 0-1
    const successWeight = this.usageData.successfulRequests / this.usageData.requestCount;
    const articleWeight = Math.min(1, this.usageData.totalArticlesFetched / (this.usageData.successfulRequests * 10));
    
    return Math.round((relevanceWeight * 0.4 + successWeight * 0.3 + articleWeight * 0.3) * 100);
  }

  /**
   * Get next reset time (midnight)
   */
  getNextResetTime() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations() {
    const stats = this.getUsageStats();
    const recommendations = [];

    if (stats.successRate < 80) {
      recommendations.push({
        type: 'reliability',
        message: 'Consider extending cache duration to reduce failed requests',
        priority: 'high'
      });
    }

    if (stats.averageRelevanceScore < 2) {
      recommendations.push({
        type: 'relevance',
        message: 'Optimize queries for better P&C relevance',
        priority: 'medium'
      });
    }

    if (stats.rateLimitHits > 5) {
      recommendations.push({
        type: 'rate-limiting',
        message: 'Increase minimum request intervals',
        priority: 'high'
      });
    }

    if (stats.remainingRequests < 50) {
      recommendations.push({
        type: 'quota',
        message: 'Approaching daily limit - extend cache duration',
        priority: 'high'
      });
    }

    return recommendations;
  }
}

// Create singleton instance
const newsApiMonitor = new NewsApiMonitor();

export default newsApiMonitor;

/**
 * Utility functions for monitoring integration
 */
export const monitoringUtils = {
  /**
   * Check if request is allowed and get wait time if needed
   */
  checkRequestPermission: () => newsApiMonitor.canMakeRequest(),
  
  /**
   * Record successful request with metrics
   */
  recordSuccess: (articleCount, averageRelevance) => 
    newsApiMonitor.recordRequest(articleCount, averageRelevance),
  
  /**
   * Record failed request
   */
  recordFailure: (isRateLimit) => newsApiMonitor.recordFailure(isRateLimit),
  
  /**
   * Get current usage statistics
   */
  getStats: () => newsApiMonitor.getUsageStats(),
  
  /**
   * Get optimization recommendations
   */
  getRecommendations: () => newsApiMonitor.getOptimizationRecommendations()
};
