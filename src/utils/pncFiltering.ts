/**
 * P&C Insurance News Filtering Utility
 * Keyword-based filtering with relevance scoring
 */

export interface FilterResult {
  isRelevant: boolean;
  relevanceScore: number; // 0-100
  matchedKeywords: string[];
  category: string;
}

// P&C Insurance Keywords by Category
const PC_KEYWORDS = {
  homeowners: [
    'homeowners', 'home insurance', 'dwelling', 'HO-3', 'HO-4', 'HO-5', 'HO-6',
    'residential', 'house fire', 'water damage', 'theft', 'burglary', 'liability',
    'personal property', 'additional living expenses', 'ALE'
  ],
  auto: [
    'auto insurance', 'car insurance', 'vehicle', 'automobile', 'collision',
    'comprehensive', 'liability', 'uninsured motorist', 'UM', 'UIM', 'bodily injury',
    'property damage', 'medical payments', 'PIP', 'no-fault'
  ],
  commercial: [
    'commercial property', 'business insurance', 'general liability', 'CGL',
    'workers compensation', 'workers comp', 'WC', 'employment practices',
    'EPLI', 'professional liability', 'errors and omissions', 'E&O'
  ],
  claims: [
    'claims', 'claim settlement', 'claim denial', 'claim process', 'adjuster',
    'loss', 'damage assessment', 'coverage dispute', 'claim fraud', 'subrogation'
  ],
  underwriting: [
    'underwriting', 'underwriter', 'risk assessment', 'risk management',
    'policy issuance', 'premium', 'rating', 'actuarial', 'loss ratio'
  ],
  regulation: [
    'regulation', 'regulatory', 'compliance', 'filing', 'rate approval',
    'insurance commissioner', 'state insurance', 'NAIC', 'insurance law'
  ],
  catastrophe: [
    'hurricane', 'earthquake', 'flood', 'wildfire', 'tornado', 'hail',
    'catastrophe', 'CAT', 'natural disaster', 'weather', 'climate change'
  ],
  fraud: [
    'fraud', 'fraudulent', 'claim fraud', 'insurance fraud', 'arson',
    'staged accident', 'false claim', 'investigation'
  ],
  technology: [
    'insurtech', 'AI', 'artificial intelligence', 'machine learning', 'automation',
    'digital', 'mobile app', 'blockchain', 'telematics', 'IoT'
  ],
  market: [
    'market', 'industry', 'insurance market', 'market share', 'consolidation',
    'merger', 'acquisition', 'IPO', 'earnings', 'financial results'
  ]
};

// Negative keywords (reduce relevance)
const NEGATIVE_KEYWORDS = [
  'health insurance', 'medical', 'dental', 'vision', 'life insurance',
  'annuity', 'investment', 'mutual fund', 'stock', 'bond',
  'travel insurance', 'pet insurance', 'umbrella', 'unrelated'
];

// Keyword weights (importance multiplier)
const KEYWORD_WEIGHTS: Record<string, number> = {
  'claims': 1.2,
  'underwriting': 1.1,
  'regulation': 1.3,
  'catastrophe': 1.4,
  'fraud': 1.2,
  'technology': 1.0,
  'market': 0.9,
  'homeowners': 1.0,
  'auto': 1.0,
  'commercial': 1.0
};

/**
 * Filter article for P&C relevance
 */
export function filterForPCRelevance(
  title: string,
  description: string,
  minScore: number = 40
): FilterResult {
  const content = `${title} ${description}`.toLowerCase();
  const matchedKeywords: string[] = [];
  let relevanceScore = 0;
  let category = 'general';

  // Check each category
  for (const [cat, keywords] of Object.entries(PC_KEYWORDS)) {
    for (const keyword of keywords) {
      if (content.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        const weight = KEYWORD_WEIGHTS[cat] || 1.0;
        relevanceScore += 10 * weight;
        if (category === 'general') category = cat;
      }
    }
  }

  // Check negative keywords
  for (const negKeyword of NEGATIVE_KEYWORDS) {
    if (content.includes(negKeyword.toLowerCase())) {
      relevanceScore -= 15;
    }
  }

  // Normalize score to 0-100
  relevanceScore = Math.max(0, Math.min(100, relevanceScore));

  // Remove duplicates from matched keywords
  const uniqueKeywords = [...new Set(matchedKeywords)];

  return {
    isRelevant: relevanceScore >= minScore,
    relevanceScore,
    matchedKeywords: uniqueKeywords,
    category
  };
}

/**
 * Get all P&C keywords
 */
export function getAllPCKeywords(): string[] {
  const allKeywords: string[] = [];
  for (const keywords of Object.values(PC_KEYWORDS)) {
    allKeywords.push(...keywords);
  }
  return [...new Set(allKeywords)];
}

/**
 * Get keywords by category
 */
export function getKeywordsByCategory(category: string): string[] {
  return PC_KEYWORDS[category as keyof typeof PC_KEYWORDS] || [];
}

/**
 * Get all categories
 */
export function getAllCategories(): string[] {
  return Object.keys(PC_KEYWORDS);
}

/**
 * Calculate keyword density
 */
export function calculateKeywordDensity(
  content: string,
  keywords: string[]
): Record<string, number> {
  const density: Record<string, number> = {};
  const lowerContent = content.toLowerCase();
  const words = lowerContent.split(/\s+/);
  const totalWords = words.length;

  for (const keyword of keywords) {
    const keywordWords = keyword.toLowerCase().split(/\s+/);
    let count = 0;

    // Count occurrences
    let searchIndex = 0;
    while ((searchIndex = lowerContent.indexOf(keyword.toLowerCase(), searchIndex)) !== -1) {
      count++;
      searchIndex += keyword.length;
    }

    density[keyword] = totalWords > 0 ? (count / totalWords) * 100 : 0;
  }

  return density;
}

/**
 * Expand keywords with synonyms
 */
export function expandKeywords(keywords: string[]): string[] {
  const synonyms: Record<string, string[]> = {
    'homeowners': ['home insurance', 'residential', 'dwelling'],
    'auto': ['car insurance', 'vehicle', 'automobile'],
    'commercial': ['business insurance', 'commercial property'],
    'claims': ['claim settlement', 'loss', 'damage'],
    'underwriting': ['risk assessment', 'rating', 'premium'],
    'regulation': ['regulatory', 'compliance', 'filing'],
    'catastrophe': ['natural disaster', 'weather', 'CAT'],
    'fraud': ['fraudulent', 'false claim', 'investigation'],
    'technology': ['insurtech', 'AI', 'automation'],
    'market': ['industry', 'consolidation', 'merger']
  };

  const expanded = new Set(keywords);

  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();
    if (synonyms[keywordLower]) {
      synonyms[keywordLower].forEach(syn => expanded.add(syn));
    }
  }

  return Array.from(expanded);
}

/**
 * Score relevance with AI-based weighting
 */
export function scoreRelevanceWithWeighting(
  title: string,
  description: string,
  keywords: string[]
): number {
  const content = `${title} ${description}`.toLowerCase();
  let score = 0;

  // Title matches are worth more
  const titleLower = title.toLowerCase();
  for (const keyword of keywords) {
    if (titleLower.includes(keyword.toLowerCase())) {
      score += 15;
    }
  }

  // Description matches
  for (const keyword of keywords) {
    if (content.includes(keyword.toLowerCase())) {
      score += 5;
    }
  }

  // Keyword density bonus
  const density = calculateKeywordDensity(content, keywords);
  const avgDensity = Object.values(density).reduce((a, b) => a + b, 0) / keywords.length;
  if (avgDensity > 0.5) {
    score += 20;
  } else if (avgDensity > 0.2) {
    score += 10;
  }

  // Normalize to 0-100
  return Math.min(100, score);
}

/**
 * Filter articles by P&C relevance
 */
export function filterArticlesByRelevance(
  articles: Array<{ title: string; description: string }>,
  minScore: number = 40
): Array<{ title: string; description: string; relevanceScore: number }> {
  return articles
    .map(article => ({
      ...article,
      relevanceScore: filterForPCRelevance(article.title, article.description, 0).relevanceScore
    }))
    .filter(article => article.relevanceScore >= minScore)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

