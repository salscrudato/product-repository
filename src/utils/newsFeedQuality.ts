/**
 * News Feed Quality Utility
 * Duplicate detection, spam filtering, and data quality scoring
 */

export interface NewsArticle {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source?: string;
  guid?: string;
}

export interface QualityScore {
  score: number; // 0-100
  isDuplicate: boolean;
  isSpam: boolean;
  issues: string[];
}

// Spam keywords and patterns
const SPAM_KEYWORDS = [
  'viagra', 'cialis', 'casino', 'lottery', 'prize', 'winner',
  'click here', 'buy now', 'limited time', 'act now', 'urgent',
  'free money', 'make money fast', 'work from home', 'get rich',
  'crypto', 'bitcoin', 'forex', 'trading signals', 'stock tips'
];

const SPAM_PATTERNS = [
  /\b(?:viagra|cialis|casino|lottery)\b/gi,
  /(?:click|buy|act|call) (?:now|here|today)/gi,
  /(?:free|limited|urgent|exclusive) (?:offer|deal|opportunity)/gi,
  /\$\d+(?:,\d{3})*(?:\.\d{2})?/g, // Price patterns
  /(?:earn|make|get) \$?\d+/gi
];

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matrix: number[][] = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      const cost = s2.charAt(i - 1) === s1.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i][j - 1] + 1,
        matrix[i - 1][j] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - distance / maxLength;
}

/**
 * Detect if article is a duplicate
 */
export function isDuplicate(
  article: NewsArticle,
  existingArticles: NewsArticle[],
  threshold: number = 0.85
): boolean {
  return existingArticles.some(existing => {
    // Check exact match on link
    if (article.link === existing.link) return true;

    // Check exact match on GUID
    if (article.guid && existing.guid && article.guid === existing.guid) return true;

    // Check title similarity
    const titleSimilarity = calculateSimilarity(article.title, existing.title);
    if (titleSimilarity > threshold) return true;

    // Check combined title + description similarity
    const combinedSimilarity = calculateSimilarity(
      `${article.title} ${article.description}`,
      `${existing.title} ${existing.description}`
    );
    if (combinedSimilarity > threshold) return true;

    return false;
  });
}

/**
 * Detect if article is spam
 */
export function isSpam(article: NewsArticle): boolean {
  const content = `${article.title} ${article.description}`.toLowerCase();

  // Check for spam keywords
  for (const keyword of SPAM_KEYWORDS) {
    if (content.includes(keyword)) return true;
  }

  // Check for spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) return true;
  }

  // Check for excessive punctuation
  const punctuationCount = (content.match(/[!?]{2,}/g) || []).length;
  if (punctuationCount > 3) return true;

  // Check for excessive capitalization
  const capitalLetters = (content.match(/[A-Z]/g) || []).length;
  const capitalRatio = capitalLetters / content.length;
  if (capitalRatio > 0.3) return true;

  return false;
}

/**
 * Calculate quality score for an article
 */
export function calculateQualityScore(
  article: NewsArticle,
  existingArticles: NewsArticle[] = []
): QualityScore {
  const issues: string[] = [];
  let score = 100;

  // Check for duplicates
  const duplicate = isDuplicate(article, existingArticles);
  if (duplicate) {
    issues.push('Duplicate article');
    score -= 50;
  }

  // Check for spam
  const spam = isSpam(article);
  if (spam) {
    issues.push('Spam detected');
    score -= 40;
  }

  // Check title quality
  if (!article.title || article.title.trim().length === 0) {
    issues.push('Missing title');
    score -= 20;
  } else if (article.title.length < 10) {
    issues.push('Title too short');
    score -= 10;
  } else if (article.title.length > 200) {
    issues.push('Title too long');
    score -= 5;
  }

  // Check description quality
  if (!article.description || article.description.trim().length === 0) {
    issues.push('Missing description');
    score -= 15;
  } else if (article.description.length < 20) {
    issues.push('Description too short');
    score -= 10;
  }

  // Check link quality
  if (!article.link || !isValidUrl(article.link)) {
    issues.push('Invalid or missing link');
    score -= 30;
  }

  // Check date quality
  if (!article.pubDate || !isValidDate(article.pubDate)) {
    issues.push('Invalid or missing publication date');
    score -= 15;
  } else {
    // Penalize very old articles
    const articleDate = new Date(article.pubDate);
    const daysSincePublished = (Date.now() - articleDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePublished > 30) {
      issues.push('Article older than 30 days');
      score -= 10;
    }
  }

  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    isDuplicate: duplicate,
    isSpam: spam,
    issues
  };
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate date format
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Filter articles by quality score
 */
export function filterByQuality(
  articles: NewsArticle[],
  minScore: number = 60
): NewsArticle[] {
  const filtered: NewsArticle[] = [];

  for (const article of articles) {
    const quality = calculateQualityScore(article, filtered);
    if (quality.score >= minScore) {
      filtered.push(article);
    }
  }

  return filtered;
}

/**
 * Remove duplicates from articles
 */
export function removeDuplicates(articles: NewsArticle[]): NewsArticle[] {
  const unique: NewsArticle[] = [];

  for (const article of articles) {
    if (!isDuplicate(article, unique)) {
      unique.push(article);
    }
  }

  return unique;
}

/**
 * Score and rank articles
 */
export function scoreAndRankArticles(
  articles: NewsArticle[]
): Array<NewsArticle & { qualityScore: QualityScore }> {
  const scored = articles.map(article => ({
    ...article,
    qualityScore: calculateQualityScore(article, articles)
  }));

  return scored.sort((a, b) => b.qualityScore.score - a.qualityScore.score);
}

/**
 * Get quality statistics for a batch of articles
 */
export function getQualityStats(articles: NewsArticle[]): {
  totalArticles: number;
  averageScore: number;
  duplicateCount: number;
  spamCount: number;
  validArticles: number;
} {
  const scores = articles.map(a => calculateQualityScore(a, articles));

  return {
    totalArticles: articles.length,
    averageScore: scores.reduce((sum, s) => sum + s.score, 0) / articles.length,
    duplicateCount: scores.filter(s => s.isDuplicate).length,
    spamCount: scores.filter(s => s.isSpam).length,
    validArticles: scores.filter(s => s.score >= 60).length
  };
}

