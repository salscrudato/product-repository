// src/services/earningsApiService.js
// Service for fetching earnings reports from Seeking Alpha API via RapidAPI

import axios from 'axios';
import logger, { LOG_CATEGORIES } from '../utils/logger';

const EARNINGS_API_CONFIG = {
  BASE_URL: 'https://seeking-alpha.p.rapidapi.com',
  API_KEY: 'q3srG9vyqtmshCiLcbTI88yk87zup1kTyEwjsnIWX3kc6b26Fi',
  HOST: 'seeking-alpha.p.rapidapi.com',
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 second base delay
  RATE_LIMITS: {
    REQUESTS_PER_MINUTE: 100, // RapidAPI typical limit
    MIN_REQUEST_INTERVAL: 600 // 0.6 seconds between requests
  }
};

// Top 10 P&C Insurance Companies by market cap
export const TOP_PC_INSURERS = [
  { symbol: 'BRK.A', name: 'Berkshire Hathaway Inc.', sector: 'Property & Casualty' },
  { symbol: 'TRV', name: 'The Travelers Companies Inc.', sector: 'Property & Casualty' },
  { symbol: 'CB', name: 'Chubb Limited', sector: 'Property & Casualty' },
  { symbol: 'AIG', name: 'American International Group Inc.', sector: 'Property & Casualty' },
  { symbol: 'PGR', name: 'Progressive Corporation', sector: 'Property & Casualty' },
  { symbol: 'ALL', name: 'Allstate Corporation', sector: 'Property & Casualty' },
  { symbol: 'HIG', name: 'Hartford Financial Services Group Inc.', sector: 'Property & Casualty' },
  { symbol: 'WRB', name: 'W.R. Berkley Corporation', sector: 'Property & Casualty' },
  { symbol: 'CINF', name: 'Cincinnati Financial Corporation', sector: 'Property & Casualty' },
  { symbol: 'RLI', name: 'RLI Corp.', sector: 'Property & Casualty' }
];

// Rate limiting state
let lastRequestTime = 0;
let requestCount = 0;

/**
 * Enforce rate limiting for API requests
 */
async function enforceRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  // Check time-based rate limit
  if (timeSinceLastRequest < EARNINGS_API_CONFIG.RATE_LIMITS.MIN_REQUEST_INTERVAL) {
    const waitTime = EARNINGS_API_CONFIG.RATE_LIMITS.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    logger.info(`⏳ Rate limiting: waiting ${waitTime}ms`, LOG_CATEGORIES.API);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
  requestCount++;
}

/**
 * Make API request to Seeking Alpha via RapidAPI
 */
async function makeSeekingAlphaRequest(endpoint, params = {}) {
  await enforceRateLimit();

  const options = {
    method: 'GET',
    url: `${EARNINGS_API_CONFIG.BASE_URL}${endpoint}`,
    headers: {
      'x-rapidapi-key': EARNINGS_API_CONFIG.API_KEY,
      'x-rapidapi-host': EARNINGS_API_CONFIG.HOST
    },
    params,
    timeout: EARNINGS_API_CONFIG.TIMEOUT
  };

  for (let attempt = 0; attempt < EARNINGS_API_CONFIG.MAX_RETRIES; attempt++) {
    try {
      logger.info(`🔄 Making Seeking Alpha API request (attempt ${attempt + 1}/${EARNINGS_API_CONFIG.MAX_RETRIES}): ${endpoint}`, LOG_CATEGORIES.API);

      const response = await axios.request(options);

      logger.info(`✅ Seeking Alpha API request successful: ${endpoint}`, LOG_CATEGORIES.API);
      return response.data;

    } catch (error) {
      logger.error(`❌ Seeking Alpha API request failed (attempt ${attempt + 1}):`, error.message, LOG_CATEGORIES.API);

      if (error.response?.status === 429) {
        logger.warn('⚠️ Rate limited by Seeking Alpha API', LOG_CATEGORIES.API);
        if (attempt < EARNINGS_API_CONFIG.MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, EARNINGS_API_CONFIG.RETRY_DELAY * (attempt + 1)));
          continue;
        }
      }

      if (attempt === EARNINGS_API_CONFIG.MAX_RETRIES - 1) {
        throw error;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, EARNINGS_API_CONFIG.RETRY_DELAY * (attempt + 1)));
    }
  }
}

/**
 * Transform Seeking Alpha earnings data to our standard format
 */
function transformSeekingAlphaData(saData, companyInfo) {
  if (!saData || !saData.data || saData.data.length === 0) {
    return null;
  }

  const latestEarnings = saData.data[0]; // Most recent earnings

  // Extract quarter and year from the period
  const periodMatch = latestEarnings.period?.match(/(\d{4})Q(\d)/);
  const year = periodMatch ? periodMatch[1] : new Date().getFullYear();
  const quarter = periodMatch ? periodMatch[2] : '1';

  return {
    id: `${companyInfo.symbol}-${latestEarnings.period || Date.now()}`,
    symbol: companyInfo.symbol,
    companyName: companyInfo.name,
    sector: companyInfo.sector,
    date: latestEarnings.report_date || new Date().toISOString().split('T')[0],
    quarter: `Q${quarter} ${year}`,

    // Financial metrics (convert from millions if needed)
    revenue: latestEarnings.revenue || latestEarnings.total_revenue || 0,
    netIncome: latestEarnings.net_income || latestEarnings.earnings || 0,
    eps: latestEarnings.eps_actual || latestEarnings.eps || 0,
    epsEstimated: latestEarnings.eps_estimate || latestEarnings.eps_consensus || 0,

    // Performance indicators
    revenueGrowth: latestEarnings.revenue_growth || calculateGrowthFromData(saData.data, 'revenue'),
    netIncomeGrowth: latestEarnings.earnings_growth || calculateGrowthFromData(saData.data, 'net_income'),
    epsGrowth: latestEarnings.eps_growth || calculateGrowthFromData(saData.data, 'eps_actual'),

    // Metadata
    reportUrl: `https://seekingalpha.com/symbol/${companyInfo.symbol}/earnings`,
    filingDate: latestEarnings.report_date || new Date().toISOString().split('T')[0],
    period: 'Q',

    // Additional context
    rawData: latestEarnings,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Calculate growth rate from Seeking Alpha data
 */
function calculateGrowthFromData(earningsData, metric) {
  if (!earningsData || earningsData.length < 2) return null;

  const current = earningsData[0][metric] || earningsData[0][`${metric}_actual`];
  const previous = earningsData[1][metric] || earningsData[1][`${metric}_actual`];

  if (!current || !previous || previous === 0) return null;

  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Fetch earnings data for a specific company using Seeking Alpha API
 */
export async function fetchCompanyEarnings(symbol) {
  try {
    const companyInfo = TOP_PC_INSURERS.find(company => company.symbol === symbol);
    if (!companyInfo) {
      throw new Error(`Company ${symbol} not found in top P&C insurers list`);
    }

    // Fetch earnings estimates/actuals from Seeking Alpha
    const earningsData = await makeSeekingAlphaRequest('/symbols/get-estimates', {
      symbol: symbol,
      data_type: 'eps',
      period_type: 'quarterly',
      limit: 4 // Get last 4 quarters for growth calculations
    });

    return transformSeekingAlphaData(earningsData, companyInfo);

  } catch (error) {
    logger.error(`Failed to fetch earnings for ${symbol}:`, error.message, LOG_CATEGORIES.API);
    throw error;
  }
}

/**
 * Fetch earnings data for all top P&C insurers
 */
export async function fetchAllPCInsurersEarnings() {
  const results = [];
  const errors = [];

  logger.info('🏢 Fetching earnings for top P&C insurers...', LOG_CATEGORIES.API);

  for (const company of TOP_PC_INSURERS) {
    try {
      logger.info(`📊 Fetching earnings for ${company.name} (${company.symbol})`, LOG_CATEGORIES.API);
      const earnings = await fetchCompanyEarnings(company.symbol);

      if (earnings) {
        results.push(earnings);
        logger.info(`✅ Successfully fetched earnings for ${company.name}`, LOG_CATEGORIES.API);
      } else {
        logger.warn(`⚠️ No earnings data available for ${company.name}`, LOG_CATEGORIES.API);
      }

    } catch (error) {
      logger.error(`❌ Failed to fetch earnings for ${company.name}:`, error.message, LOG_CATEGORIES.API);
      errors.push({
        symbol: company.symbol,
        name: company.name,
        error: error.message
      });
    }
  }

  logger.info(`🎉 Earnings fetch complete: ${results.length}/${TOP_PC_INSURERS.length} successful`, LOG_CATEGORIES.API);

  if (errors.length > 0) {
    logger.warn('⚠️ Some earnings requests failed:', errors, LOG_CATEGORIES.API);
  }

  return {
    earnings: results,
    errors,
    totalRequested: TOP_PC_INSURERS.length,
    successful: results.length,
    failed: errors.length
  };
}

/**
 * Get earnings calendar (upcoming earnings announcements)
 */
export async function fetchEarningsCalendar(fromDate = null, toDate = null) {
  try {
    const today = new Date();
    const from = fromDate || today.toISOString().split('T')[0];
    const to = toDate || new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days ahead

    // Fetch earnings calendar from Seeking Alpha
    const symbols = TOP_PC_INSURERS.map(company => company.symbol).join(',');
    const calendarData = await makeSeekingAlphaRequest('/symbols/get-earnings-calendar', {
      symbols: symbols,
      from: from,
      to: to
    });

    if (!calendarData || !calendarData.data) {
      return [];
    }

    return calendarData.data.map(item => ({
      symbol: item.symbol,
      date: item.report_date || item.date,
      time: item.time || 'AMC',
      epsEstimate: item.eps_estimate || item.eps_consensus,
      revenueEstimate: item.revenue_estimate,
      companyName: TOP_PC_INSURERS.find(c => c.symbol === item.symbol)?.name || item.symbol
    }));

  } catch (error) {
    logger.error('Failed to fetch earnings calendar:', error.message, LOG_CATEGORIES.API);
    throw error;
  }
}

/**
 * Validate earnings data structure
 */
export function validateEarningsData(earnings) {
  if (!earnings || typeof earnings !== 'object') {
    return false;
  }

  const requiredFields = ['id', 'symbol', 'companyName', 'date', 'revenue', 'netIncome', 'eps'];
  return requiredFields.every(field => earnings.hasOwnProperty(field) && earnings[field] !== null);
}

/**
 * Get fallback earnings data when API is unavailable
 */
export function getFallbackEarningsData() {
  // Import sample data for fallback
  logger.info('📋 Using fallback earnings data', LOG_CATEGORIES.API);

  // Import sample data dynamically to avoid circular dependencies
  try {
    const { sampleEarnings } = require('../data/sampleEarnings');
    return sampleEarnings || [];
  } catch (error) {
    logger.error('Failed to load sample earnings data:', error.message, LOG_CATEGORIES.API);
    return [];
  }
}

/**
 * Fetch earnings for multiple symbols at once (batch request)
 */
export async function fetchEarningsBatch(symbols = []) {
  try {
    const symbolsString = symbols.join(',');
    const earningsData = await makeSeekingAlphaRequest('/symbols/get-estimates', {
      symbols: symbolsString,
      data_type: 'eps',
      period_type: 'quarterly',
      limit: 1
    });

    if (!earningsData || !earningsData.data) {
      return [];
    }

    return earningsData.data.map(item => {
      const companyInfo = TOP_PC_INSURERS.find(company => company.symbol === item.symbol);
      return transformSeekingAlphaData({ data: [item] }, companyInfo);
    }).filter(Boolean);

  } catch (error) {
    logger.error('Failed to fetch earnings batch:', error.message, LOG_CATEGORIES.API);
    throw error;
  }
}

export default {
  fetchCompanyEarnings,
  fetchAllPCInsurersEarnings,
  fetchEarningsCalendar,
  fetchEarningsBatch,
  validateEarningsData,
  getFallbackEarningsData,
  TOP_PC_INSURERS
};
