// src/services/earningsAiService.js
// AI-powered earnings report summarization service

import { makeAIRequest, getSystemPrompt } from '../config/aiConfig';

/**
 * Generate AI-powered summary for a single earnings report
 * @param {Object} earnings - Earnings report object
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<Object>} Earnings with AI-generated summary
 */
export async function generateEarningsSummary(earnings, apiKey) {
  if (!earnings || !earnings.companyName || !earnings.revenue) {
    console.warn('Invalid earnings data for summarization:', earnings);
    return earnings;
  }

  try {
    // Prepare content for AI summarization
    const content = formatEarningsForAI(earnings);
    
    // Create messages for AI request
    const messages = [
      {
        role: 'system',
        content: getSystemPrompt('EARNINGS_SUMMARY_SYSTEM')
      },
      {
        role: 'user',
        content: content
      }
    ];

    // Generate AI summary
    const aiSummary = await makeAIRequest('EARNINGS_SUMMARY', messages, apiKey);
    
    // Return earnings with AI-enhanced summary
    return {
      ...earnings,
      aiSummary: aiSummary || generateFallbackSummary(earnings),
      originalSummary: earnings.aiSummary,
      aiEnhanced: true,
      summaryGeneratedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`Failed to generate AI summary for ${earnings.companyName}:`, error);
    
    // Return earnings with fallback summary
    return {
      ...earnings,
      aiSummary: generateFallbackSummary(earnings),
      aiEnhanced: false,
      summaryError: error.message
    };
  }
}

/**
 * Generate detailed AI analysis for earnings report
 * @param {Object} earnings - Earnings report object
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<Object>} Earnings with detailed AI analysis
 */
export async function generateEarningsAnalysis(earnings, apiKey) {
  if (!earnings || !earnings.companyName || !earnings.revenue) {
    console.warn('Invalid earnings data for analysis:', earnings);
    return earnings;
  }

  try {
    // Prepare detailed content for AI analysis
    const content = formatEarningsForDetailedAnalysis(earnings);
    
    // Create messages for AI request
    const messages = [
      {
        role: 'system',
        content: getSystemPrompt('EARNINGS_ANALYSIS_SYSTEM')
      },
      {
        role: 'user',
        content: content
      }
    ];

    // Generate AI analysis
    const aiAnalysis = await makeAIRequest('EARNINGS_ANALYSIS', messages, apiKey);
    
    // Return earnings with AI analysis
    return {
      ...earnings,
      aiAnalysis: aiAnalysis || 'Analysis unavailable',
      analysisGeneratedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`Failed to generate AI analysis for ${earnings.companyName}:`, error);
    return earnings;
  }
}

/**
 * Format earnings data for AI summarization
 */
function formatEarningsForAI(earnings) {
  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    return `$${(value / 1000).toFixed(1)}B`;
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return `Company: ${earnings.companyName} (${earnings.symbol})
Quarter: ${earnings.quarter}
Revenue: ${formatCurrency(earnings.revenue)} (${formatPercent(earnings.revenueGrowth)} YoY)
Net Income: ${formatCurrency(earnings.netIncome)} (${formatPercent(earnings.netIncomeGrowth)} YoY)
EPS: $${earnings.eps} vs Est. $${earnings.epsEstimated || 'N/A'} (${formatPercent(earnings.epsGrowth)} YoY)
Combined Ratio: ${earnings.combinedRatio || 'N/A'}%
Underwriting Income: ${formatCurrency(earnings.underwritingIncome)}
Catastrophe Losses: ${formatCurrency(earnings.catastropheLosses)}
Prior Year Development: ${earnings.priorYearDevelopment > 0 ? '+' : ''}${formatCurrency(earnings.priorYearDevelopment)}`;
}

/**
 * Format earnings data for detailed AI analysis
 */
function formatEarningsForDetailedAnalysis(earnings) {
  const basicInfo = formatEarningsForAI(earnings);
  
  return `${basicInfo}

Additional Context:
- Filing Date: ${earnings.filingDate}
- Report Period: ${earnings.period}
- Sector: ${earnings.sector}
- Last Updated: ${earnings.lastUpdated}

Please provide a comprehensive analysis covering performance highlights, underwriting results, growth drivers, and outlook & risks.`;
}

/**
 * Generate fallback summary when AI is unavailable
 */
function generateFallbackSummary(earnings) {
  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    return `$${(value / 1000).toFixed(1)}B`;
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined) return '';
    return ` (${value > 0 ? '+' : ''}${value.toFixed(1)}% YoY)`;
  };

  const epsComparison = earnings.epsEstimated ? 
    ` vs est. $${earnings.epsEstimated}` : '';

  return `${earnings.companyName} reported ${earnings.quarter} revenue of ${formatCurrency(earnings.revenue)}${formatPercent(earnings.revenueGrowth)} and EPS of $${earnings.eps}${epsComparison}${formatPercent(earnings.epsGrowth)}.`;
}

/**
 * Process earnings reports in batches with AI enhancement
 * @param {Array} earnings - Array of earnings objects
 * @param {number} batchSize - Number of earnings to process per batch
 * @param {number} delay - Delay between batches in milliseconds
 * @returns {Promise<Array>} Array of AI-enhanced earnings
 */
export async function generateBatchEarningsSummaries(earnings, batchSize = 3, delay = 2000) {
  if (!earnings || earnings.length === 0) {
    return [];
  }

  const apiKey = process.env.REACT_APP_OPENAI_KEY;
  if (!apiKey) {
    console.warn('⚠️ OpenAI API key not found, skipping AI enhancement');
    return earnings.map(earning => ({
      ...earning,
      aiSummary: generateFallbackSummary(earning),
      aiEnhanced: false
    }));
  }

  const summarizedEarnings = [];
  
  console.log(`🤖 Starting AI summarization for ${earnings.length} earnings reports...`);
  
  for (let i = 0; i < earnings.length; i += batchSize) {
    const batch = earnings.slice(i, i + batchSize);
    
    try {
      console.log(`📊 Processing earnings batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(earnings.length / batchSize)}`);
      
      // Process batch in parallel
      const batchPromises = batch.map(earning => 
        generateEarningsSummary(earning, apiKey)
      );
      
      const batchResults = await Promise.all(batchPromises);
      summarizedEarnings.push(...batchResults);
      
      console.log(`✅ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(earnings.length / batchSize)}`);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < earnings.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      console.error(`Batch processing failed for earnings ${i}-${i + batchSize - 1}:`, error);
      
      // Add original earnings without AI enhancement
      summarizedEarnings.push(...batch.map(earning => ({ 
        ...earning, 
        aiSummary: generateFallbackSummary(earning),
        aiEnhanced: false, 
        summaryError: error.message 
      })));
    }
  }
  
  const successCount = summarizedEarnings.filter(e => e.aiEnhanced).length;
  console.log(`🎉 AI summarization complete: ${successCount}/${earnings.length} earnings enhanced`);
  
  return summarizedEarnings;
}

/**
 * Get summarization statistics
 * @param {Array} earnings - Array of earnings objects
 * @returns {Object} Statistics about AI enhancement
 */
export function getSummarizationStats(earnings) {
  if (!earnings || earnings.length === 0) {
    return null;
  }

  const enhanced = earnings.filter(e => e.aiEnhanced).length;
  const total = earnings.length;
  const errors = earnings.filter(e => e.summaryError).length;

  return {
    total,
    enhanced,
    errors,
    enhancementRate: Math.round((enhanced / total) * 100),
    errorRate: Math.round((errors / total) * 100)
  };
}

/**
 * Check if earnings report needs AI summarization
 * @param {Object} earnings - Earnings report object
 * @returns {boolean} True if earnings should be summarized
 */
export function shouldSummarizeEarnings(earnings) {
  // Skip if already AI-enhanced
  if (earnings.aiEnhanced) {
    return false;
  }
  
  // Skip if missing essential data
  if (!earnings.revenue || !earnings.netIncome || !earnings.eps) {
    return false;
  }
  
  // Always summarize earnings reports for consistency
  return true;
}

export default {
  generateEarningsSummary,
  generateEarningsAnalysis,
  generateBatchEarningsSummaries,
  getSummarizationStats,
  shouldSummarizeEarnings
};
