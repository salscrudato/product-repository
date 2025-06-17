// src/services/newsApiService.js
// NewsData.io API integration service for fetching insurance industry news

const NEWS_API_CONFIG = {
  BASE_URL: 'https://newsdata.io/api/1/latest',
  API_KEY: process.env.REACT_APP_NEWSDATA_KEY || 'pub_7d848accaabc4b84953a4fcf9fc60d6f',
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 second base delay (increased for rate limiting)
  RATE_LIMIT_DELAY: 60000, // 1 minute delay for rate limit errors
  FREE_TIER_LIMITS: {
    MAX_QUERY_LENGTH: 100, // Strict limit for free tier
    MAX_RESULTS_PER_REQUEST: 10, // Free tier limit
    SUPPORTED_PARAMS: ['apikey', 'q', 'country', 'language', 'category', 'removeduplicate', 'size'],
    // Enhanced free tier optimization
    DAILY_REQUEST_LIMIT: 200, // Free tier daily limit
    REQUESTS_PER_HOUR: 50, // Conservative hourly limit
    MIN_REQUEST_INTERVAL: 5000 // 5 seconds between requests
  }
};

// Rate limiting state management
let lastRequestTime = 0;
let rateLimitResetTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // Minimum 1 second between requests

/**
 * Check if we're currently rate limited and need to wait
 * @returns {number} Milliseconds to wait, or 0 if ready to proceed
 */
function getRateLimitDelay() {
  const now = Date.now();

  // Check if we're in a rate limit cooldown period
  if (rateLimitResetTime > now) {
    return rateLimitResetTime - now;
  }

  // Check minimum interval between requests
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    return MIN_REQUEST_INTERVAL - timeSinceLastRequest;
  }

  return 0;
}

/**
 * Set rate limit cooldown period
 * @param {number} delayMs - Delay in milliseconds
 */
function setRateLimitCooldown(delayMs = NEWS_API_CONFIG.RATE_LIMIT_DELAY) {
  rateLimitResetTime = Date.now() + delayMs;
  console.warn(`🚫 Rate limit hit. Cooldown until ${new Date(rateLimitResetTime).toLocaleTimeString()}`);
}

/**
 * Build query parameters for NewsData.io API with simple insurance targeting
 * @param {Object} options - Query customization options
 * @returns {URLSearchParams} Configured query parameters
 */
function buildQueryParams(options = {}) {
  const {
    focusArea = 'commercial',
    size = 10
  } = options;

  // Simple, effective query that should return insurance-related news
  // NewsData.io works best with simple keywords rather than complex boolean queries
  let query = 'insurance';

  // Add specific terms based on focus area
  switch (focusArea) {
    case 'pc':
      query = 'insurance property casualty';
      break;
    case 'property':
      query = 'property insurance homeowners';
      break;
    case 'casualty':
      query = 'liability insurance workers compensation';
      break;
    case 'commercial':
      query = 'commercial insurance business regulatory compliance';
      break;
    case 'personal':
      query = 'auto insurance homeowners';
      break;
    default:
      query = 'insurance regulatory compliance';
  }

  // Respect free tier limits
  const maxSize = Math.min(size, NEWS_API_CONFIG.FREE_TIER_LIMITS.MAX_RESULTS_PER_REQUEST);

  // Build parameters according to NewsData.io API specification
  const params = new URLSearchParams({
    apikey: NEWS_API_CONFIG.API_KEY,
    q: query,
    country: 'us',
    language: 'en',
    category: 'business',
    removeduplicate: '1',
    size: maxSize.toString()
  });

  // Add domain filtering for better insurance content (if supported)
  // Focus on known insurance and business news sources
  const insuranceDomains = [
    'insurancejournal.com',
    'propertycasualty360.com',
    'insurancebusinessmag.com',
    'businessinsurance.com',
    'reuters.com',
    'bloomberg.com',
    'wsj.com'
  ].join(',');

  // Note: domain parameter might not be available in free tier
  // params.set('domain', insuranceDomains);

  console.log(`🔍 Query: "${query}" | Size: ${maxSize} | Country: US | Category: business`);

  return params;
}

/**
 * Transform NewsData.io API response with enhanced P&C relevance analysis
 * @param {Object} apiArticle - Raw article from NewsData.io
 * @param {number} index - Article index for ID generation
 * @returns {Object} Transformed article object with enhanced metadata
 */
function transformArticle(apiArticle, index) {
  // Generate a unique ID based on title hash and timestamp
  const id = `news_${Date.now()}_${index}`;

  // Simple transformation - just return the article with basic categorization
  return {
    id,
    title: apiArticle.title || 'Untitled Article',
    excerpt: apiArticle.description || 'No description available.',
    category: 'business', // Simple default category
    source: apiArticle.source_name || apiArticle.source_id || 'Unknown Source',
    publishedAt: apiArticle.pubDate || new Date().toISOString(),
    url: apiArticle.link || '#',
    pcRelevanceScore: 1, // Give all articles a basic relevance score
    productManagerRelevance: 1,
    businessImpact: 'medium',
    targetAudience: ['business-professionals'],
    originalData: {
      image_url: apiArticle.image_url,
      video_url: apiArticle.video_url,
      keywords: apiArticle.keywords,
      creator: apiArticle.creator,
      country: apiArticle.country,
      language: apiArticle.language
    }
  };
}

/**
 * Fetch P&C insurance news articles with enhanced filtering and curation
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} Array of curated, transformed news articles
 */
export async function fetchNewsArticles(options = {}) {
  const {
    focusArea = 'commercial',
    minRelevanceScore = 3,
    minProductManagerRelevance = 0,
    includeRegulatory = true,
    includeTechnology = true,
    includeMarketTrends = true,
    includeClaims = true,
    maxArticles = 15,
    businessImpactFilter = 'all', // 'high', 'medium', 'low', 'all'
    diversifyCategories = true
  } = options;

  const queryParams = buildQueryParams({
    focusArea,
    size: Math.min(maxArticles, 10) // Respect API limits
  });

  const url = `${NEWS_API_CONFIG.BASE_URL}?${queryParams.toString()}`;

  let lastError = null;

  // Check for rate limiting before starting
  const initialDelay = getRateLimitDelay();
  if (initialDelay > 0) {
    console.log(`⏳ Rate limit active. Waiting ${Math.round(initialDelay / 1000)}s before request...`);
    await new Promise(resolve => setTimeout(resolve, initialDelay));
  }

  for (let attempt = 0; attempt < NEWS_API_CONFIG.MAX_RETRIES; attempt++) {
    try {
      console.log(`🔄 Fetching P&C news articles (attempt ${attempt + 1}/${NEWS_API_CONFIG.MAX_RETRIES})`);
      console.log(`🎯 Focus: ${focusArea}, Min Relevance: ${minRelevanceScore}, Business Impact: ${businessImpactFilter}`);

      // Update last request time
      lastRequestTime = Date.now();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), NEWS_API_CONFIG.TIMEOUT);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ProductHubApp/1.0 (P&C Insurance News Aggregator)'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();

        // Handle rate limiting specifically
        if (response.status === 429) {
          setRateLimitCooldown();
          throw new Error(`Rate limit exceeded. Next request available at ${new Date(rateLimitResetTime).toLocaleTimeString()}`);
        }

        // Handle free tier access denied errors
        if (response.status === 403) {
          console.warn('🚫 Free tier limitation detected. Adjusting query parameters...');
          throw new Error(`Access denied - Free tier limitation: ${errorText}`);
        }

        throw new Error(`NewsData.io API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // Check for API-specific errors
      if (data.status === 'error') {
        throw new Error(`NewsData.io API error: ${data.results?.message || 'Unknown error'}`);
      }

      // Validate response structure
      if (!data.results || !Array.isArray(data.results)) {
        throw new Error('Invalid response format from NewsData.io API');
      }

      // Simple transformation - just return all articles from the API
      let transformedArticles = data.results
        .filter(article => article.title && article.description) // Only filter out incomplete articles
        .map((article, index) => transformArticle(article, index));

      console.log(`📰 Transformed ${transformedArticles.length} articles from API`);

      // Simple sorting by recency
      transformedArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

      // Limit to requested number of articles
      transformedArticles = transformedArticles.slice(0, maxArticles);

      console.log(`✅ Successfully returned ${transformedArticles.length} articles (${data.results.length} total from API)`);

      return transformedArticles;

    } catch (error) {
      lastError = error;

      if (error.name === 'AbortError') {
        console.warn(`⏰ News API request timeout (attempt ${attempt + 1})`);
      } else {
        console.warn(`❌ News API request failed (attempt ${attempt + 1}):`, error.message);
      }

      // Don't retry on the last attempt
      if (attempt < NEWS_API_CONFIG.MAX_RETRIES - 1) {
        let delay = NEWS_API_CONFIG.RETRY_DELAY * Math.pow(2, attempt);

        // For rate limit errors, use longer delay and check cooldown
        if (error.message.includes('Rate limit')) {
          const rateLimitDelay = getRateLimitDelay();
          delay = Math.max(delay, rateLimitDelay);
          console.log(`⏳ Rate limit retry in ${Math.round(delay / 1000)}s...`);
        } else {
          console.log(`⏳ Retrying in ${delay}ms...`);
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If all retries failed, throw the last error
  throw new Error(`Failed to fetch news after ${NEWS_API_CONFIG.MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Diversify article selection to ensure category variety
 * @param {Array} articles - Sorted articles array
 * @param {number} maxArticles - Maximum number of articles to return
 * @returns {Array} Diversified article selection
 */
function diversifyArticleSelection(articles, maxArticles) {
  const categories = [...new Set(articles.map(a => a.category))];
  const articlesPerCategory = Math.floor(maxArticles / categories.length);
  const remainder = maxArticles % categories.length;

  const diversified = [];
  const categoryCount = {};

  // Initialize category counts
  categories.forEach(cat => categoryCount[cat] = 0);

  // First pass: ensure each category gets at least one article
  for (const article of articles) {
    if (diversified.length >= maxArticles) break;

    const targetCount = articlesPerCategory + (categoryCount[article.category] < remainder ? 1 : 0);

    if (categoryCount[article.category] < targetCount) {
      diversified.push(article);
      categoryCount[article.category]++;
    }
  }

  // Second pass: fill remaining slots with highest-scoring articles
  for (const article of articles) {
    if (diversified.length >= maxArticles) break;
    if (!diversified.includes(article)) {
      diversified.push(article);
    }
  }

  return diversified.slice(0, maxArticles);
}

/**
 * Validate news article data structure
 * @param {Array} articles - Array of articles to validate
 * @returns {Array} Array of valid articles
 */
export function validateNewsArticles(articles) {
  if (!Array.isArray(articles)) {
    console.warn('Invalid articles data: not an array');
    return [];
  }
  
  return articles.filter(article => {
    const isValid = (
      article &&
      typeof article === 'object' &&
      article.id &&
      article.title &&
      article.excerpt &&
      article.category &&
      article.source &&
      article.publishedAt
    );
    
    if (!isValid) {
      console.warn('Invalid article data:', article);
    }
    
    return isValid;
  });
}

/**
 * Get sample/fallback news articles for development or when API fails
 * @returns {Array} Array of sample news articles
 */
export function getFallbackNewsArticles() {
  return [
    {
      id: `fallback_${Date.now()}_1`,
      title: "Insurance Industry Adapts to Digital Transformation Trends",
      excerpt: "Major insurance companies are investing heavily in digital technologies to improve customer experience and operational efficiency in response to changing market demands.",
      category: "technology",
      source: "Insurance Technology News",
      publishedAt: new Date().toISOString(),
      url: "#"
    },
    {
      id: `fallback_${Date.now()}_2`,
      title: "New Regulatory Framework Proposed for Cyber Insurance Coverage",
      excerpt: "Federal regulators are considering new guidelines for cyber insurance policies to ensure adequate protection for businesses facing increasing digital threats.",
      category: "regulation",
      source: "Regulatory Affairs Weekly",
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      url: "#"
    },
    {
      id: `fallback_${Date.now()}_3`,
      title: "Climate Risk Assessment Tools Launch for Property Insurers",
      excerpt: "A consortium of insurance companies has unveiled new climate risk assessment tools to help property insurers better evaluate and price environmental risks.",
      category: "market",
      source: "Climate Insurance Report",
      publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      url: "#"
    }
  ];
}

/**
 * Fetch property insurance specific news
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} Array of property insurance articles
 */
export async function fetchPropertyInsuranceNews(options = {}) {
  return fetchNewsArticles({
    ...options,
    focusArea: 'property',
    minRelevanceScore: 2
  });
}

/**
 * Fetch casualty insurance specific news
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} Array of casualty insurance articles
 */
export async function fetchCasualtyInsuranceNews(options = {}) {
  return fetchNewsArticles({
    ...options,
    focusArea: 'casualty',
    minRelevanceScore: 2
  });
}

/**
 * Fetch commercial lines insurance news
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} Array of commercial insurance articles
 */
export async function fetchCommercialInsuranceNews(options = {}) {
  return fetchNewsArticles({
    ...options,
    focusArea: 'commercial',
    minRelevanceScore: 1
  });
}

/**
 * Fetch combined Property & Casualty insurance news
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} Array of P&C insurance articles
 */
export async function fetchPCInsuranceNews(options = {}) {
  return fetchNewsArticles({
    ...options,
    focusArea: 'pc',
    minRelevanceScore: 2
  });
}

/**
 * Get P&C-specific fallback articles
 * @returns {Array} Array of P&C-focused sample articles
 */
export function getPCFallbackNewsArticles() {
  return [
    {
      id: `fallback_${Date.now()}_1`,
      title: "Major Property Insurer Launches Enhanced Wildfire Coverage Product",
      excerpt: "Leading property and casualty insurer introduces comprehensive wildfire protection coverage with advanced risk assessment tools and rapid claims processing for homeowners in high-risk areas.",
      category: "property",
      source: "Property Insurance Today",
      publishedAt: new Date().toISOString(),
      url: "#",
      pcRelevanceScore: 4
    },
    {
      id: `fallback_${Date.now()}_2`,
      title: "New Cyber Liability Insurance Product Targets Small Businesses",
      excerpt: "Insurance company unveils specialized cyber liability coverage designed for small and medium enterprises, featuring affordable premiums and comprehensive data breach protection.",
      category: "casualty",
      source: "Commercial Insurance Review",
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      url: "#",
      pcRelevanceScore: 3
    },
    {
      id: `fallback_${Date.now()}_3`,
      title: "State Insurance Commissioner Approves New Commercial Auto Rates",
      excerpt: "State regulatory approval granted for updated commercial auto insurance rates, reflecting improved safety technology and changing risk profiles in the transportation sector.",
      category: "regulation",
      source: "Insurance Regulatory News",
      publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      url: "#",
      pcRelevanceScore: 3
    },
    {
      id: `fallback_${Date.now()}_4`,
      title: "AI-Powered Underwriting Platform Launches for General Liability",
      excerpt: "Insurtech company introduces artificial intelligence-driven underwriting platform specifically designed for general liability insurance, promising faster decisions and improved risk assessment.",
      category: "technology",
      source: "InsurTech Innovation",
      publishedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
      url: "#",
      pcRelevanceScore: 2
    }
  ];
}

export default {
  fetchNewsArticles,
  fetchPropertyInsuranceNews,
  fetchCasualtyInsuranceNews,
  fetchCommercialInsuranceNews,
  fetchPCInsuranceNews,
  validateNewsArticles,
  getFallbackNewsArticles,
  getPCFallbackNewsArticles
};
