// src/data/sampleEarnings.js
// Sample earnings data for top P&C insurers for fallback when API is unavailable

export const sampleEarnings = [
  {
    id: 'TRV-2024Q3',
    symbol: 'TRV',
    companyName: 'The Travelers Companies Inc.',
    sector: 'Property & Casualty',
    date: '2024-10-17',
    quarter: 'Q3 2024',

    // Financial metrics (in millions except EPS)
    revenue: 9200,
    netIncome: 1100,
    eps: 4.85,
    epsEstimated: 4.20,

    // Performance indicators
    revenueGrowth: 8.2,
    netIncomeGrowth: 15.3,
    epsGrowth: 18.5,

    // P&C specific metrics
    combinedRatio: 94.2,
    underwritingIncome: 534,
    catastropheLosses: 245,
    priorYearDevelopment: 89,

    // Metadata
    reportUrl: 'https://seekingalpha.com/symbol/TRV/earnings',
    filingDate: '2024-10-17',
    period: 'Q',
    
    // AI-enhanced summary
    aiSummary: 'TRV reported Q3 revenue of $9.2B (+8% YoY) with combined ratio of 94.2%, beating estimates on strong commercial lines growth and favorable prior year development of $89M.',
    aiEnhanced: true,
    lastUpdated: '2024-10-17T14:30:00Z'
  },
  
  {
    id: 'CB-2024-Q3',
    symbol: 'CB',
    companyName: 'Chubb Limited',
    sector: 'Property & Casualty',
    date: '2024-10-24',
    quarter: 'Q3 2024',
    
    revenue: 13100,
    netIncome: 1800,
    eps: 4.75,
    epsEstimated: 4.45,
    
    revenueGrowth: 12.1,
    netIncomeGrowth: 22.8,
    epsGrowth: 21.4,
    
    combinedRatio: 91.5,
    underwritingIncome: 1112,
    catastropheLosses: 180,
    priorYearDevelopment: 125,
    
    reportUrl: 'https://investors.chubb.com/investors/news-and-events/news-releases',
    filingDate: '2024-10-24',
    period: 'Q',
    
    aiSummary: 'CB delivered record quarterly net income of $1.8B driven by 12% premium growth and improved 91.5% combined ratio, raising full-year guidance on strong commercial and international performance.',
    aiEnhanced: true,
    lastUpdated: '2024-10-24T16:00:00Z'
  },
  
  {
    id: 'PGR-2024-Q3',
    symbol: 'PGR',
    companyName: 'Progressive Corporation',
    sector: 'Property & Casualty',
    date: '2024-10-15',
    quarter: 'Q3 2024',
    
    revenue: 13100,
    netIncome: 1200,
    eps: 2.45,
    epsEstimated: 2.20,
    
    revenueGrowth: 15.2,
    netIncomeGrowth: 28.5,
    epsGrowth: 25.6,
    
    combinedRatio: 90.8,
    underwritingIncome: 1205,
    catastropheLosses: 95,
    priorYearDevelopment: 45,
    
    reportUrl: 'https://investors.progressive.com/phoenix.zhtml?c=81824&p=irol-reportsannual',
    filingDate: '2024-10-15',
    period: 'Q',
    
    aiSummary: 'PGR posted 15% revenue growth to $13.1B with personal auto margins expanding as rate increases offset inflation, EPS of $2.45 vs $2.20 estimate.',
    aiEnhanced: true,
    lastUpdated: '2024-10-15T15:45:00Z'
  },
  
  {
    id: 'AIG-2024-Q3',
    symbol: 'AIG',
    companyName: 'American International Group Inc.',
    sector: 'Property & Casualty',
    date: '2024-11-01',
    quarter: 'Q3 2024',
    
    revenue: 11800,
    netIncome: 850,
    eps: 1.35,
    epsEstimated: 1.15,
    
    revenueGrowth: 6.8,
    netIncomeGrowth: 12.4,
    epsGrowth: 17.4,
    
    combinedRatio: 96.2,
    underwritingIncome: 448,
    catastropheLosses: 320,
    priorYearDevelopment: -25,
    
    reportUrl: 'https://www.aig.com/investors/news-and-events/news-releases',
    filingDate: '2024-11-01',
    period: 'Q',
    
    aiSummary: 'AIG reported Q3 net income of $850M with 96.2% combined ratio, benefiting from commercial lines rate increases despite elevated catastrophe losses of $320M.',
    aiEnhanced: true,
    lastUpdated: '2024-11-01T17:15:00Z'
  },
  
  {
    id: 'ALL-2024-Q3',
    symbol: 'ALL',
    companyName: 'Allstate Corporation',
    sector: 'Property & Casualty',
    date: '2024-10-31',
    quarter: 'Q3 2024',
    
    revenue: 13500,
    netIncome: 950,
    eps: 3.45,
    epsEstimated: 3.10,
    
    revenueGrowth: 9.5,
    netIncomeGrowth: 18.7,
    epsGrowth: 22.3,
    
    combinedRatio: 95.1,
    underwritingIncome: 661,
    catastropheLosses: 285,
    priorYearDevelopment: 78,
    
    reportUrl: 'https://www.allstateinvestors.com/news-and-events/news-releases',
    filingDate: '2024-10-31',
    period: 'Q',
    
    aiSummary: 'ALL achieved $950M net income with 95.1% combined ratio as auto insurance rate increases and improved claim trends offset property catastrophe losses.',
    aiEnhanced: true,
    lastUpdated: '2024-10-31T16:30:00Z'
  },
  
  {
    id: 'HIG-2024-Q3',
    symbol: 'HIG',
    companyName: 'Hartford Financial Services Group Inc.',
    sector: 'Property & Casualty',
    date: '2024-10-25',
    quarter: 'Q3 2024',
    
    revenue: 5400,
    netIncome: 485,
    eps: 1.95,
    epsEstimated: 1.75,
    
    revenueGrowth: 7.2,
    netIncomeGrowth: 14.8,
    epsGrowth: 16.7,
    
    combinedRatio: 93.8,
    underwritingIncome: 335,
    catastropheLosses: 125,
    priorYearDevelopment: 55,
    
    reportUrl: 'https://ir.thehartford.com/news-and-events/news-releases',
    filingDate: '2024-10-25',
    period: 'Q',
    
    aiSummary: 'HIG delivered strong Q3 results with 93.8% combined ratio and $485M net income, driven by commercial lines growth and disciplined underwriting.',
    aiEnhanced: true,
    lastUpdated: '2024-10-25T15:20:00Z'
  },
  
  {
    id: 'WRB-2024-Q3',
    symbol: 'WRB',
    companyName: 'W.R. Berkley Corporation',
    sector: 'Property & Casualty',
    date: '2024-10-22',
    quarter: 'Q3 2024',
    
    revenue: 2800,
    netIncome: 285,
    eps: 1.85,
    epsEstimated: 1.65,
    
    revenueGrowth: 11.8,
    netIncomeGrowth: 19.5,
    epsGrowth: 18.2,
    
    combinedRatio: 89.5,
    underwritingIncome: 294,
    catastropheLosses: 45,
    priorYearDevelopment: 35,
    
    reportUrl: 'https://www.berkley.com/investors/news-events',
    filingDate: '2024-10-22',
    period: 'Q',
    
    aiSummary: 'WRB posted exceptional 89.5% combined ratio with $285M net income, reflecting strong specialty lines performance and favorable reserve development.',
    aiEnhanced: true,
    lastUpdated: '2024-10-22T14:45:00Z'
  },
  
  {
    id: 'CINF-2024-Q3',
    symbol: 'CINF',
    companyName: 'Cincinnati Financial Corporation',
    sector: 'Property & Casualty',
    date: '2024-10-26',
    quarter: 'Q3 2024',
    
    revenue: 2100,
    netIncome: 195,
    eps: 1.25,
    epsEstimated: 1.10,
    
    revenueGrowth: 8.9,
    netIncomeGrowth: 16.2,
    epsGrowth: 13.6,
    
    combinedRatio: 92.4,
    underwritingIncome: 159,
    catastropheLosses: 85,
    priorYearDevelopment: 25,
    
    reportUrl: 'https://www.cinfin.com/investors/news-events',
    filingDate: '2024-10-26',
    period: 'Q',
    
    aiSummary: 'CINF reported solid Q3 performance with 92.4% combined ratio and $195M net income, supported by commercial lines growth and investment income.',
    aiEnhanced: true,
    lastUpdated: '2024-10-26T16:10:00Z'
  },
  
  {
    id: 'RLI-2024-Q3',
    symbol: 'RLI',
    companyName: 'RLI Corp.',
    sector: 'Property & Casualty',
    date: '2024-10-23',
    quarter: 'Q3 2024',
    
    revenue: 485,
    netIncome: 65,
    eps: 1.45,
    epsEstimated: 1.35,
    
    revenueGrowth: 12.5,
    netIncomeGrowth: 18.2,
    epsGrowth: 16.0,
    
    combinedRatio: 86.8,
    underwritingIncome: 64,
    catastropheLosses: 15,
    priorYearDevelopment: 12,
    
    reportUrl: 'https://www.rlicorp.com/investors/news-events',
    filingDate: '2024-10-23',
    period: 'Q',
    
    aiSummary: 'RLI achieved outstanding 86.8% combined ratio with $65M net income, demonstrating superior underwriting discipline in specialty insurance markets.',
    aiEnhanced: true,
    lastUpdated: '2024-10-23T15:55:00Z'
  }
];

// Earnings calendar data (upcoming earnings announcements)
export const sampleEarningsCalendar = [
  {
    symbol: 'BRK.A',
    companyName: 'Berkshire Hathaway Inc.',
    date: '2024-11-02',
    time: 'AMC',
    epsEstimate: null, // Berkshire doesn't provide EPS guidance
    revenueEstimate: 92000
  },
  {
    symbol: 'TRV',
    companyName: 'The Travelers Companies Inc.',
    date: '2025-01-18',
    time: 'BMO',
    epsEstimate: 4.15,
    revenueEstimate: 9100
  },
  {
    symbol: 'CB',
    companyName: 'Chubb Limited',
    date: '2025-01-30',
    time: 'BMO',
    epsEstimate: 4.25,
    revenueEstimate: 12800
  },
  {
    symbol: 'PGR',
    companyName: 'Progressive Corporation',
    date: '2025-01-15',
    time: 'AMC',
    epsEstimate: 2.35,
    revenueEstimate: 13500
  }
];

export default sampleEarnings;
