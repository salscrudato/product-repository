// src/services/earningsApiService.js
// Service for fetching earnings reports from Financial Modeling Prep API

const EARNINGS_API_CONFIG = {
  BASE_URL: 'https://financialmodelingprep.com/api/v3',
  API_KEY: process.env.REACT_APP_FMP_API_KEY || 'demo', // Free tier demo key
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 second base delay
  FREE_TIER_LIMITS: {
    MAX_REQUESTS_PER_DAY: 250, // Free tier daily limit
    REQUESTS_PER_MINUTE: 5, // Conservative rate limit
    MIN_REQUEST_INTERVAL: 12000 // 12 seconds between requests
  }
};

// Top 10 P&C Insurance Companies by market cap
export const TOP_PC_INSURERS = [
  { symbol: 'BRK-A', name: 'Berkshire Hathaway Inc.', sector: 'Property & Casualty' },
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
let dailyRequestCount = 0;
let lastResetDate = new Date().toDateString();

/**
 * Enforce rate limiting for API requests
 */
async function enforceRateLimit() {
  const now = Date.now();
  const today = new Date().toDateString();
  
  // Reset daily counter if new day
  if (today !== lastResetDate) {
    dailyRequestCount = 0;
    lastResetDate = today;
  }
  
  // Check daily limit
  if (dailyRequestCount >= EARNINGS_API_CONFIG.FREE_TIER_LIMITS.MAX_REQUESTS_PER_DAY) {
    throw new Error('Daily API request limit exceeded');
  }
  
  // Check time-based rate limit
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < EARNINGS_API_CONFIG.FREE_TIER_LIMITS.MIN_REQUEST_INTERVAL) {
    const waitTime = EARNINGS_API_CONFIG.FREE_TIER_LIMITS.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    console.log(`⏳ Rate limiting: waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
  dailyRequestCount++;
}

/**
 * Make API request with error handling and retries
 */
async function makeApiRequest(endpoint, params = {}) {
  await enforceRateLimit();
  
  const url = new URL(`${EARNINGS_API_CONFIG.BASE_URL}${endpoint}`);
  url.searchParams.append('apikey', EARNINGS_API_CONFIG.API_KEY);
  
  // Add additional parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value.toString());
    }
  });
  
  for (let attempt = 0; attempt < EARNINGS_API_CONFIG.MAX_RETRIES; attempt++) {
    try {
      console.log(`🔄 Making FMP API request (attempt ${attempt + 1}/${EARNINGS_API_CONFIG.MAX_RETRIES}): ${endpoint}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), EARNINGS_API_CONFIG.TIMEOUT);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ProductHubApp/1.0 (P&C Insurance Earnings Tracker)'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('⚠️ Rate limited by FMP API');
          if (attempt < EARNINGS_API_CONFIG.MAX_RETRIES - 1) {
            await new Promise(resolve => setTimeout(resolve, EARNINGS_API_CONFIG.RETRY_DELAY * (attempt + 1)));
            continue;
          }
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Check for API error in response
      if (data.error || (Array.isArray(data) && data.length === 0 && endpoint.includes('earnings'))) {
        console.warn('⚠️ API returned error or empty data:', data.error || 'No earnings data');
        if (attempt < EARNINGS_API_CONFIG.MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, EARNINGS_API_CONFIG.RETRY_DELAY * (attempt + 1)));
          continue;
        }
      }
      
      console.log(`✅ FMP API request successful: ${endpoint}`);
      return data;
      
    } catch (error) {
      console.error(`❌ FMP API request failed (attempt ${attempt + 1}):`, error.message);
      
      if (attempt === EARNINGS_API_CONFIG.MAX_RETRIES - 1) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, EARNINGS_API_CONFIG.RETRY_DELAY * (attempt + 1)));
    }
  }
}

/**
 * Transform FMP earnings data to our standard format
 */
function transformEarningsData(fmpData, companyInfo) {
  if (!fmpData || !Array.isArray(fmpData) || fmpData.length === 0) {
    return null;
  }
  
  const latestEarnings = fmpData[0]; // Most recent earnings
  
  return {
    id: `${companyInfo.symbol}-${latestEarnings.date}`,
    symbol: companyInfo.symbol,
    companyName: companyInfo.name,
    sector: companyInfo.sector,
    date: latestEarnings.date,
    quarter: `Q${Math.ceil(new Date(latestEarnings.date).getMonth() / 3)} ${new Date(latestEarnings.date).getFullYear()}`,
    
    // Financial metrics
    revenue: latestEarnings.revenue,
    netIncome: latestEarnings.netIncome,
    eps: latestEarnings.eps,
    epsEstimated: latestEarnings.epsEstimated,
    
    // Performance indicators
    revenueGrowth: calculateGrowthRate(fmpData, 'revenue'),
    netIncomeGrowth: calculateGrowthRate(fmpData, 'netIncome'),
    epsGrowth: calculateGrowthRate(fmpData, 'eps'),
    
    // Metadata
    reportUrl: `https://financialmodelingprep.com/financial-summary/${companyInfo.symbol}`,
    filingDate: latestEarnings.fillingDate || latestEarnings.date,
    period: latestEarnings.period || 'Q',
    
    // Additional context
    rawData: latestEarnings,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Calculate growth rate between current and previous period
 */
function calculateGrowthRate(earningsData, metric) {
  if (!earningsData || earningsData.length < 2) return null;
  
  const current = earningsData[0][metric];
  const previous = earningsData[1][metric];
  
  if (!current || !previous || previous === 0) return null;
  
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Fetch earnings data for a specific company
 */
export async function fetchCompanyEarnings(symbol) {
  try {
    const companyInfo = TOP_PC_INSURERS.find(company => company.symbol === symbol);
    if (!companyInfo) {
      throw new Error(`Company ${symbol} not found in top P&C insurers list`);
    }
    
    // Fetch earnings data (quarterly)
    const earningsData = await makeApiRequest(`/income-statement/${symbol}`, {
      period: 'quarter',
      limit: 4 // Get last 4 quarters for growth calculations
    });
    
    return transformEarningsData(earningsData, companyInfo);
    
  } catch (error) {
    console.error(`Failed to fetch earnings for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Fetch earnings data for all top P&C insurers
 */
export async function fetchAllPCInsurersEarnings() {
  const results = [];
  const errors = [];
  
  console.log('🏢 Fetching earnings for top P&C insurers...');
  
  for (const company of TOP_PC_INSURERS) {
    try {
      console.log(`📊 Fetching earnings for ${company.name} (${company.symbol})`);
      const earnings = await fetchCompanyEarnings(company.symbol);
      
      if (earnings) {
        results.push(earnings);
        console.log(`✅ Successfully fetched earnings for ${company.name}`);
      } else {
        console.warn(`⚠️ No earnings data available for ${company.name}`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to fetch earnings for ${company.name}:`, error.message);
      errors.push({
        symbol: company.symbol,
        name: company.name,
        error: error.message
      });
    }
  }
  
  console.log(`🎉 Earnings fetch complete: ${results.length}/${TOP_PC_INSURERS.length} successful`);
  
  if (errors.length > 0) {
    console.warn('⚠️ Some earnings requests failed:', errors);
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
    
    const calendarData = await makeApiRequest('/earning_calendar', {
      from,
      to
    });
    
    // Filter for P&C insurers only
    const pcInsurersSymbols = TOP_PC_INSURERS.map(company => company.symbol);
    const filteredCalendar = calendarData.filter(item => 
      pcInsurersSymbols.includes(item.symbol)
    );
    
    return filteredCalendar.map(item => ({
      symbol: item.symbol,
      date: item.date,
      time: item.time,
      epsEstimate: item.epsEstimate,
      revenueEstimate: item.revenueEstimate,
      companyName: TOP_PC_INSURERS.find(c => c.symbol === item.symbol)?.name || item.symbol
    }));
    
  } catch (error) {
    console.error('Failed to fetch earnings calendar:', error);
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
  // This will be implemented in the sample data file
  console.log('📋 Using fallback earnings data');
  return [];
}

export default {
  fetchCompanyEarnings,
  fetchAllPCInsurersEarnings,
  fetchEarningsCalendar,
  validateEarningsData,
  getFallbackEarningsData,
  TOP_PC_INSURERS
};
