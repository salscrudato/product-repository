// src/services/newsAiService.js
// AI-powered news article summarization service

import { makeAIRequest, getSystemPrompt } from '../config/aiConfig';

/**
 * Generate AI-powered summary for a single news article
 * @param {Object} article - News article object
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<Object>} Article with AI-generated summary
 */
export async function generateArticleSummary(article, apiKey) {
  if (!article || !article.title || !article.excerpt) {
    console.warn('Invalid article data for summarization:', article);
    return article;
  }

  try {
    // Prepare content for AI summarization
    const content = `Title: ${article.title}\n\nContent: ${article.excerpt}`;
    
    // Create messages for AI request
    const messages = [
      {
        role: 'system',
        content: getSystemPrompt('NEWS_SUMMARY_SYSTEM')
      },
      {
        role: 'user',
        content: content
      }
    ];

    // Generate AI summary
    const aiSummary = await makeAIRequest('NEWS_SUMMARY', messages, apiKey);
    
    // Return article with AI-enhanced excerpt
    return {
      ...article,
      excerpt: aiSummary || article.excerpt,
      originalExcerpt: article.excerpt,
      aiEnhanced: true,
      summaryGeneratedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.warn(`Failed to generate AI summary for article ${article.id}:`, error.message);
    
    // Return original article if AI summarization fails
    return {
      ...article,
      aiEnhanced: false,
      summaryError: error.message
    };
  }
}

/**
 * Generate AI summaries for multiple articles with batch processing
 * @param {Array} articles - Array of news articles
 * @param {string} apiKey - OpenAI API key
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<Array>} Articles with AI-generated summaries
 */
export async function generateBatchSummaries(articles, apiKey, onProgress = null) {
  if (!Array.isArray(articles) || articles.length === 0) {
    console.warn('No articles provided for batch summarization');
    return [];
  }

  if (!apiKey) {
    console.warn('No OpenAI API key provided for summarization');
    return articles.map(article => ({ ...article, aiEnhanced: false }));
  }

  console.log(`🤖 Starting AI summarization for ${articles.length} articles`);
  
  const summarizedArticles = [];
  const batchSize = 3; // Process 3 articles at a time to avoid rate limits
  const delay = 1000; // 1 second delay between batches
  
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    
    try {
      // Process batch concurrently
      const batchPromises = batch.map(article => 
        generateArticleSummary(article, apiKey)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Extract successful results and handle failures
      const processedBatch = batchResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.warn(`Failed to summarize article ${batch[index].id}:`, result.reason);
          return { ...batch[index], aiEnhanced: false, summaryError: result.reason?.message };
        }
      });
      
      summarizedArticles.push(...processedBatch);
      
      // Report progress
      if (onProgress) {
        onProgress(summarizedArticles.length, articles.length);
      }
      
      console.log(`✅ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(articles.length / batchSize)}`);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < articles.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      console.error(`Batch processing failed for articles ${i}-${i + batchSize - 1}:`, error);
      
      // Add original articles without AI enhancement
      summarizedArticles.push(...batch.map(article => ({ 
        ...article, 
        aiEnhanced: false, 
        summaryError: error.message 
      })));
    }
  }
  
  const successCount = summarizedArticles.filter(a => a.aiEnhanced).length;
  console.log(`🎉 AI summarization complete: ${successCount}/${articles.length} articles enhanced`);
  
  return summarizedArticles;
}

/**
 * Validate and clean AI-generated summary
 * @param {string} summary - AI-generated summary text
 * @param {Object} originalArticle - Original article for fallback
 * @returns {string} Cleaned and validated summary
 */
export function validateSummary(summary, originalArticle) {
  if (!summary || typeof summary !== 'string') {
    return originalArticle.excerpt || 'No summary available.';
  }
  
  // Clean up the summary
  let cleaned = summary
    .trim()
    .replace(/^(Summary:|Article Summary:)/i, '') // Remove common prefixes
    .replace(/\n{2,}/g, '\n') // Normalize line breaks
    .replace(/\s{2,}/g, ' ') // Normalize spaces
    .trim();
  
  // Ensure reasonable length (50-500 characters)
  if (cleaned.length < 50) {
    return originalArticle.excerpt || 'No summary available.';
  }
  
  if (cleaned.length > 500) {
    // Truncate at sentence boundary
    const sentences = cleaned.split(/[.!?]+/);
    let truncated = '';
    
    for (const sentence of sentences) {
      if ((truncated + sentence).length > 450) {
        break;
      }
      truncated += sentence + '.';
    }
    
    cleaned = truncated || cleaned.substring(0, 450) + '...';
  }
  
  return cleaned;
}

/**
 * Check if article needs AI summarization
 * @param {Object} article - News article object
 * @returns {boolean} True if article should be summarized
 */
export function shouldSummarizeArticle(article) {
  // Skip if already AI-enhanced
  if (article.aiEnhanced) {
    return false;
  }
  
  // Skip if excerpt is too short (likely already a summary)
  if (article.excerpt && article.excerpt.length < 100) {
    return false;
  }
  
  // Skip if excerpt is too long (needs summarization)
  if (article.excerpt && article.excerpt.length > 300) {
    return true;
  }
  
  // Default: summarize for consistency
  return true;
}

/**
 * Get summarization statistics for a batch of articles
 * @param {Array} articles - Array of processed articles
 * @returns {Object} Statistics object
 */
export function getSummarizationStats(articles) {
  const total = articles.length;
  const enhanced = articles.filter(a => a.aiEnhanced).length;
  const failed = articles.filter(a => a.summaryError).length;
  const skipped = total - enhanced - failed;
  
  return {
    total,
    enhanced,
    failed,
    skipped,
    successRate: total > 0 ? Math.round((enhanced / total) * 100) : 0
  };
}

export default {
  generateArticleSummary,
  generateBatchSummaries,
  validateSummary,
  shouldSummarizeArticle,
  getSummarizationStats
};
