/**
 * News Feed API
 * Cloud Functions for fetching and processing insurance news feeds
 */

const functions = require('firebase-functions');
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');
const { withErrorHandling } = require('../middleware/errorHandler');
const { rateLimitAI } = require('../middleware/rateLimit');
const { logger } = require('../utils/logger');
const admin = require('firebase-admin');

const db = admin.firestore();

// RSS Feed sources for P&C insurance news
const RSS_FEEDS = [
  {
    name: 'Insurance Journal',
    url: 'https://www.insurancejournal.com/feed/news/',
    category: 'General'
  },
  {
    name: 'PropertyShark',
    url: 'https://www.propertyshark.com/feed/',
    category: 'Property'
  },
  {
    name: 'Claims Journal',
    url: 'https://www.claimsjournal.com/feed/',
    category: 'Claims'
  },
  {
    name: 'Risk & Insurance',
    url: 'https://www.riskandinsurance.com/feed/',
    category: 'Risk'
  },
  {
    name: 'Insurance News Net',
    url: 'https://www.insurancenewsnet.com/feed/',
    category: 'General'
  }
];

/**
 * Fetch news from RSS feeds with CORS proxy
 * This function acts as a backend proxy to avoid CORS issues
 */
const fetchNewsFeed = functions.https.onCall(
  withErrorHandling(async (data, context) => {
    requireAuth(context);
    rateLimitAI(context);

    const { feedUrl, limit = 20, useCache = true } = data;

    logger.info('Fetching news feed', {
      userId: context.auth.uid,
      feedUrl,
      limit
    });

    try {
      // Check cache first
      if (useCache) {
        const cachedFeed = await getCachedFeed(feedUrl);
        if (cachedFeed) {
          logger.info('Returning cached feed', { feedUrl });
          return {
            success: true,
            articles: cachedFeed.articles.slice(0, limit),
            source: 'cache',
            timestamp: cachedFeed.timestamp
          };
        }
      }

      // Fetch from RSS feed
      const articles = await fetchRSSFeed(feedUrl, limit);

      // Cache the results
      await cacheFeed(feedUrl, articles);

      return {
        success: true,
        articles,
        source: 'live',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error fetching news feed:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to fetch news feed: ${error.message}`
      );
    }
  })
);

/**
 * Fetch all available news feeds
 */
const fetchAllNewsFeeds = functions.https.onCall(
  withErrorHandling(async (data, context) => {
    requireAuth(context);
    rateLimitAI(context);

    const { limit = 10 } = data;

    logger.info('Fetching all news feeds', {
      userId: context.auth.uid,
      feedCount: RSS_FEEDS.length
    });

    try {
      const allArticles = [];

      // Fetch from all feeds in parallel
      const feedPromises = RSS_FEEDS.map(feed =>
        fetchRSSFeed(feed.url, limit)
          .then(articles => articles.map(a => ({ ...a, source: feed.name, category: feed.category })))
          .catch(error => {
            logger.warn(`Failed to fetch ${feed.name}:`, error.message);
            return [];
          })
      );

      const results = await Promise.all(feedPromises);
      results.forEach(articles => allArticles.push(...articles));

      // Sort by date and limit
      const sortedArticles = allArticles
        .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
        .slice(0, limit * 2);

      return {
        success: true,
        articles: sortedArticles,
        feedCount: RSS_FEEDS.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error fetching all news feeds:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to fetch news feeds: ${error.message}`
      );
    }
  })
);

/**
 * Fetch RSS feed and parse articles
 */
async function fetchRSSFeed(feedUrl, limit = 20) {
  try {
    const response = await axios.get(feedUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Parse RSS/Atom feed (simplified - in production use xml2js or similar)
    const articles = parseRSSFeed(response.data);
    return articles.slice(0, limit);
  } catch (error) {
    logger.error(`Error fetching RSS feed ${feedUrl}:`, error.message);
    throw error;
  }
}

/**
 * Parse RSS feed XML (simplified parser)
 */
function parseRSSFeed(xmlData) {
  const articles = [];

  // Extract items using regex (simplified - use proper XML parser in production)
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xmlData)) !== null) {
    const itemXml = match[1];

    const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(itemXml);
    const descriptionMatch = /<description>([\s\S]*?)<\/description>/.exec(itemXml);
    const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(itemXml);
    const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(itemXml);

    if (titleMatch) {
      articles.push({
        title: cleanXML(titleMatch[1]),
        description: cleanXML(descriptionMatch?.[1] || ''),
        link: cleanXML(linkMatch?.[1] || ''),
        pubDate: cleanXML(pubDateMatch?.[1] || new Date().toISOString()),
        guid: cleanXML(linkMatch?.[1] || titleMatch[1])
      });
    }
  }

  return articles;
}

/**
 * Clean XML entities
 */
function cleanXML(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, '')
    .trim();
}

/**
 * Get cached feed
 */
async function getCachedFeed(feedUrl) {
  try {
    const cacheRef = db.collection('newsFeedCache').doc(feedUrl);
    const cacheSnap = await cacheRef.get();

    if (!cacheSnap.exists) return null;

    const cache = cacheSnap.data();
    const cacheAge = Date.now() - cache.timestamp.toMillis();
    const cacheTTL = 3600000; // 1 hour

    if (cacheAge > cacheTTL) {
      await cacheRef.delete();
      return null;
    }

    return cache;
  } catch (error) {
    logger.warn('Error getting cached feed:', error.message);
    return null;
  }
}

/**
 * Cache feed results
 */
async function cacheFeed(feedUrl, articles) {
  try {
    await db.collection('newsFeedCache').doc(feedUrl).set({
      articles,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      feedUrl
    });
  } catch (error) {
    logger.warn('Error caching feed:', error.message);
  }
}

/**
 * Clear old cache entries
 */
const clearOldCache = functions.pubsub.schedule('every 2 hours').onRun(async () => {
  try {
    const cacheDocs = await db.collection('newsFeedCache').get();
    const now = Date.now();
    const cacheTTL = 3600000; // 1 hour

    for (const doc of cacheDocs.docs) {
      const cacheAge = now - doc.data().timestamp.toMillis();
      if (cacheAge > cacheTTL) {
        await doc.ref.delete();
      }
    }

    logger.info('Cache cleanup completed');
  } catch (error) {
    logger.error('Error clearing cache:', error);
  }
});

module.exports = {
  fetchNewsFeed,
  fetchAllNewsFeeds,
  clearOldCache
};

