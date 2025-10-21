/**
 * Summary Caching Utility
 * Cache and manage AI-generated article summaries
 */

import { Timestamp } from 'firebase/firestore';

export interface CachedSummary {
  id: string;
  articleId: string;
  articleTitle: string;
  articleLink: string;
  summary: string;
  keyPoints: string[];
  confidenceScore: number; // 0-100
  relevanceScore: number; // 0-100
  category: string;
  tags: string[];
  generatedAt: Timestamp | Date;
  expiresAt: Timestamp | Date;
  isExpired: boolean;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    processingTime?: number;
  };
}

export interface SummaryCache {
  [articleId: string]: CachedSummary;
}

/**
 * Create a cached summary
 */
export function createCachedSummary(
  articleId: string,
  articleTitle: string,
  articleLink: string,
  summary: string,
  keyPoints: string[],
  confidenceScore: number,
  relevanceScore: number,
  category: string,
  tags: string[] = [],
  ttlHours: number = 24
): CachedSummary {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

  return {
    id: `${articleId}_${Date.now()}`,
    articleId,
    articleTitle,
    articleLink,
    summary,
    keyPoints,
    confidenceScore,
    relevanceScore,
    category,
    tags,
    generatedAt: now,
    expiresAt,
    isExpired: false
  };
}

/**
 * Check if summary is expired
 */
export function isSummaryExpired(summary: CachedSummary): boolean {
  const expiresAt = summary.expiresAt instanceof Timestamp
    ? summary.expiresAt.toDate()
    : new Date(summary.expiresAt);

  return expiresAt < new Date();
}

/**
 * Get summary from cache
 */
export function getSummaryFromCache(
  cache: SummaryCache,
  articleId: string
): CachedSummary | null {
  const summary = cache[articleId];

  if (!summary) return null;

  // Check if expired
  if (isSummaryExpired(summary)) {
    return null;
  }

  return summary;
}

/**
 * Add summary to cache
 */
export function addSummaryToCache(
  cache: SummaryCache,
  summary: CachedSummary
): SummaryCache {
  return {
    ...cache,
    [summary.articleId]: summary
  };
}

/**
 * Remove summary from cache
 */
export function removeSummaryFromCache(
  cache: SummaryCache,
  articleId: string
): SummaryCache {
  const newCache = { ...cache };
  delete newCache[articleId];
  return newCache;
}

/**
 * Clear expired summaries from cache
 */
export function clearExpiredSummaries(cache: SummaryCache): SummaryCache {
  const newCache: SummaryCache = {};

  for (const [articleId, summary] of Object.entries(cache)) {
    if (!isSummaryExpired(summary)) {
      newCache[articleId] = summary;
    }
  }

  return newCache;
}

/**
 * Get cache statistics
 */
export function getCacheStats(cache: SummaryCache): {
  totalSummaries: number;
  expiredSummaries: number;
  validSummaries: number;
  averageConfidence: number;
  averageRelevance: number;
  cacheSize: number;
} {
  const summaries = Object.values(cache);
  const expiredCount = summaries.filter(s => isSummaryExpired(s)).length;
  const validCount = summaries.length - expiredCount;

  const avgConfidence = validCount > 0
    ? summaries
        .filter(s => !isSummaryExpired(s))
        .reduce((sum, s) => sum + s.confidenceScore, 0) / validCount
    : 0;

  const avgRelevance = validCount > 0
    ? summaries
        .filter(s => !isSummaryExpired(s))
        .reduce((sum, s) => sum + s.relevanceScore, 0) / validCount
    : 0;

  const cacheSize = JSON.stringify(cache).length;

  return {
    totalSummaries: summaries.length,
    expiredSummaries: expiredCount,
    validSummaries: validCount,
    averageConfidence: Math.round(avgConfidence),
    averageRelevance: Math.round(avgRelevance),
    cacheSize
  };
}

/**
 * Get summaries by category
 */
export function getSummariesByCategory(
  cache: SummaryCache,
  category: string
): CachedSummary[] {
  return Object.values(cache)
    .filter(s => !isSummaryExpired(s) && s.category === category)
    .sort((a, b) => {
      const aDate = a.generatedAt instanceof Timestamp
        ? a.generatedAt.toDate()
        : new Date(a.generatedAt);
      const bDate = b.generatedAt instanceof Timestamp
        ? b.generatedAt.toDate()
        : new Date(b.generatedAt);
      return bDate.getTime() - aDate.getTime();
    });
}

/**
 * Get summaries by tag
 */
export function getSummariesByTag(
  cache: SummaryCache,
  tag: string
): CachedSummary[] {
  return Object.values(cache)
    .filter(s => !isSummaryExpired(s) && s.tags.includes(tag))
    .sort((a, b) => b.confidenceScore - a.confidenceScore);
}

/**
 * Get high-confidence summaries
 */
export function getHighConfidenceSummaries(
  cache: SummaryCache,
  minConfidence: number = 80
): CachedSummary[] {
  return Object.values(cache)
    .filter(s => !isSummaryExpired(s) && s.confidenceScore >= minConfidence)
    .sort((a, b) => b.confidenceScore - a.confidenceScore);
}

/**
 * Get high-relevance summaries
 */
export function getHighRelevanceSummaries(
  cache: SummaryCache,
  minRelevance: number = 70
): CachedSummary[] {
  return Object.values(cache)
    .filter(s => !isSummaryExpired(s) && s.relevanceScore >= minRelevance)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Search summaries
 */
export function searchSummaries(
  cache: SummaryCache,
  query: string
): CachedSummary[] {
  const lowerQuery = query.toLowerCase();

  return Object.values(cache)
    .filter(s => {
      if (isSummaryExpired(s)) return false;

      return (
        s.articleTitle.toLowerCase().includes(lowerQuery) ||
        s.summary.toLowerCase().includes(lowerQuery) ||
        s.keyPoints.some(kp => kp.toLowerCase().includes(lowerQuery)) ||
        s.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    })
    .sort((a, b) => b.confidenceScore - a.confidenceScore);
}

/**
 * Get trending topics from summaries
 */
export function getTrendingTopics(
  cache: SummaryCache,
  limit: number = 10
): Array<{ topic: string; count: number; confidence: number }> {
  const topicMap: Record<string, { count: number; confidence: number }> = {};

  for (const summary of Object.values(cache)) {
    if (isSummaryExpired(summary)) continue;

    for (const tag of summary.tags) {
      if (!topicMap[tag]) {
        topicMap[tag] = { count: 0, confidence: 0 };
      }
      topicMap[tag].count++;
      topicMap[tag].confidence += summary.confidenceScore;
    }
  }

  return Object.entries(topicMap)
    .map(([topic, data]) => ({
      topic,
      count: data.count,
      confidence: Math.round(data.confidence / data.count)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Export cache to JSON
 */
export function exportCacheToJSON(cache: SummaryCache): string {
  return JSON.stringify(cache, null, 2);
}

/**
 * Import cache from JSON
 */
export function importCacheFromJSON(json: string): SummaryCache {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.error('Error importing cache:', error);
    return {};
  }
}

/**
 * Optimize cache (remove expired, limit size)
 */
export function optimizeCache(
  cache: SummaryCache,
  maxSize: number = 1000000 // 1MB
): SummaryCache {
  // First, remove expired summaries
  let optimized = clearExpiredSummaries(cache);

  // If still too large, remove oldest summaries
  let cacheSize = JSON.stringify(optimized).length;
  if (cacheSize > maxSize) {
    const summaries = Object.values(optimized)
      .sort((a, b) => {
        const aDate = a.generatedAt instanceof Timestamp
          ? a.generatedAt.toDate()
          : new Date(a.generatedAt);
        const bDate = b.generatedAt instanceof Timestamp
          ? b.generatedAt.toDate()
          : new Date(b.generatedAt);
        return aDate.getTime() - bDate.getTime();
      });

    optimized = {};
    for (const summary of summaries) {
      optimized[summary.articleId] = summary;
      cacheSize = JSON.stringify(optimized).length;
      if (cacheSize > maxSize) {
        break;
      }
    }
  }

  return optimized;
}

