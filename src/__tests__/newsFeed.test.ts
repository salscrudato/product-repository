/**
 * News Feed Utilities Test Suite
 * Comprehensive tests for all news feed functionality
 */

import {
  isDuplicate,
  isSpam,
  calculateQualityScore,
  filterByQuality,
  removeDuplicates,
  scoreAndRankArticles,
  getQualityStats
} from '../utils/newsFeedQuality';

import {
  filterForPCRelevance,
  getAllPCKeywords,
  getKeywordsByCategory,
  expandKeywords,
  filterArticlesByRelevance
} from '../utils/pncFiltering';

import {
  categorizeArticle,
  getCategoryById,
  getCategoryPath,
  getCategoryDisplayName,
  getTopLevelCategories
} from '../utils/newsCategorization';

import {
  calculatePaginationState,
  getPaginatedItems,
  getPageRange,
  isNearBottom
} from '../utils/pagination';

import {
  createCachedSummary,
  isSummaryExpired,
  getSummaryFromCache,
  addSummaryToCache,
  clearExpiredSummaries,
  getCacheStats
} from '../utils/summaryCaching';

import {
  generateEmailShareContent,
  generateTwitterShareText,
  createEmailShareUrl,
  exportFavoritesAsJSON
} from '../utils/articleSharing';

import {
  prefersReducedMotion,
  generateArticleAriaLabel,
  getContrastRatio,
  checkWCAGCompliance
} from '../utils/accessibility';

// Mock article data
const mockArticles = [
  {
    title: 'New Homeowners Insurance Policy Launched',
    description: 'Major insurer launches new homeowners coverage with enhanced protection',
    link: 'https://example.com/article1',
    pubDate: new Date().toISOString(),
    source: 'Insurance Journal',
    guid: 'article1'
  },
  {
    title: 'Auto Insurance Rates Increase in California',
    description: 'State approves rate increases for auto insurance companies',
    link: 'https://example.com/article2',
    pubDate: new Date().toISOString(),
    source: 'Claims Journal',
    guid: 'article2'
  },
  {
    title: 'Hurricane Season Impacts Property Insurance',
    description: 'Catastrophic losses from hurricane season affect insurance market',
    link: 'https://example.com/article3',
    pubDate: new Date().toISOString(),
    source: 'Risk & Insurance',
    guid: 'article3'
  }
];

describe('News Feed Quality Tests', () => {
  test('should detect duplicate articles by title', () => {
    const article1 = mockArticles[0];
    const article2 = { ...mockArticles[0], link: 'https://example.com/different' };

    expect(isDuplicate(article2, [article1])).toBe(true);
  });

  test('should detect duplicate articles by link', () => {
    const article1 = mockArticles[0];
    const article2 = { ...mockArticles[0], title: 'Different Title' };

    expect(isDuplicate(article2, [article1])).toBe(true);
  });

  test('should not flag legitimate articles as duplicates', () => {
    const article1 = mockArticles[0];
    const article2 = mockArticles[1];

    expect(isDuplicate(article2, [article1])).toBe(false);
  });

  test('should detect spam articles', () => {
    const spamArticle = {
      title: 'CLICK HERE NOW!!! Make $5000 Fast!!!',
      description: 'Buy viagra and cialis online',
      link: 'https://spam.com',
      pubDate: new Date().toISOString()
    };

    expect(isSpam(spamArticle)).toBe(true);
  });

  test('should calculate quality score', () => {
    const article = mockArticles[0];
    const quality = calculateQualityScore(article);

    expect(quality.score).toBeGreaterThan(0);
    expect(quality.score).toBeLessThanOrEqual(100);
    expect(quality.isDuplicate).toBe(false);
    expect(quality.isSpam).toBe(false);
  });

  test('should filter articles by quality', () => {
    const filtered = filterByQuality(mockArticles, 60);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThanOrEqual(mockArticles.length);
  });

  test('should remove duplicates', () => {
    const articlesWithDuplicates = [
      mockArticles[0],
      { ...mockArticles[0], link: 'https://example.com/dup' },
      mockArticles[1]
    ];

    const unique = removeDuplicates(articlesWithDuplicates);
    expect(unique.length).toBe(2);
  });

  test('should get quality statistics', () => {
    const stats = getQualityStats(mockArticles);

    expect(stats.totalArticles).toBe(mockArticles.length);
    expect(stats.averageScore).toBeGreaterThan(0);
    expect(stats.validArticles).toBeGreaterThanOrEqual(0);
  });
});

describe('P&C Filtering Tests', () => {
  test('should filter for P&C relevance', () => {
    const result = filterForPCRelevance(
      mockArticles[0].title,
      mockArticles[0].description
    );

    expect(result.isRelevant).toBe(true);
    expect(result.relevanceScore).toBeGreaterThan(0);
    expect(result.matchedKeywords.length).toBeGreaterThan(0);
  });

  test('should get all P&C keywords', () => {
    const keywords = getAllPCKeywords();
    expect(keywords.length).toBeGreaterThan(0);
    expect(keywords).toContain('homeowners');
    expect(keywords).toContain('auto');
  });

  test('should get keywords by category', () => {
    const keywords = getKeywordsByCategory('homeowners');
    expect(keywords.length).toBeGreaterThan(0);
  });

  test('should expand keywords with synonyms', () => {
    const expanded = expandKeywords(['homeowners']);
    expect(expanded.length).toBeGreaterThan(1);
  });

  test('should filter articles by relevance', () => {
    const filtered = filterArticlesByRelevance(mockArticles, 40);
    expect(filtered.length).toBeGreaterThan(0);
  });
});

describe('Categorization Tests', () => {
  test('should categorize article', () => {
    const categorized = categorizeArticle(
      mockArticles[0].title,
      mockArticles[0].description
    );

    expect(categorized.primaryCategory).toBeTruthy();
    expect(categorized.confidenceScore).toBeGreaterThan(0);
  });

  test('should get category by ID', () => {
    const category = getCategoryById('homeowners');
    expect(category).toBeTruthy();
    expect(category?.name).toBe('Homeowners');
  });

  test('should get category path', () => {
    const path = getCategoryPath('homeowners');
    expect(path.length).toBeGreaterThan(0);
  });

  test('should get category display name', () => {
    const name = getCategoryDisplayName('homeowners');
    expect(name).toBe('Homeowners');
  });

  test('should get top-level categories', () => {
    const categories = getTopLevelCategories();
    expect(categories.length).toBeGreaterThan(0);
  });
});

describe('Pagination Tests', () => {
  test('should calculate pagination state', () => {
    const state = calculatePaginationState(1, 10, 100);

    expect(state.currentPage).toBe(1);
    expect(state.pageSize).toBe(10);
    expect(state.totalPages).toBe(10);
    expect(state.hasNextPage).toBe(true);
    expect(state.hasPreviousPage).toBe(false);
  });

  test('should get paginated items', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    const paginated = getPaginatedItems(items, 1, 10);

    expect(paginated.length).toBe(10);
    expect(paginated[0].id).toBe(0);
  });

  test('should get page range', () => {
    const range = getPageRange(5, 10, 5);
    expect(range.length).toBeLessThanOrEqual(5);
    expect(range).toContain(5);
  });

  test('should detect near bottom', () => {
    const element = document.createElement('div');
    element.scrollHeight = 1000;
    element.clientHeight = 500;
    element.scrollTop = 900;

    expect(isNearBottom(element, 200)).toBe(true);
  });
});

describe('Summary Caching Tests', () => {
  test('should create cached summary', () => {
    const summary = createCachedSummary(
      'article1',
      'Title',
      'Description',
      'https://example.com',
      'Source',
      'homeowners',
      'Summary text',
      ['tag1', 'tag2']
    );

    expect(summary.articleId).toBe('article1');
    expect(summary.summary).toBe('Summary text');
    expect(summary.tags).toContain('tag1');
  });

  test('should check if summary is expired', () => {
    const summary = createCachedSummary(
      'article1',
      'Title',
      'Description',
      'https://example.com',
      'Source',
      'homeowners',
      'Summary',
      [],
      -1 // Expired 1 hour ago
    );

    expect(isSummaryExpired(summary)).toBe(true);
  });

  test('should manage summary cache', () => {
    let cache = {};
    const summary = createCachedSummary(
      'article1',
      'Title',
      'Description',
      'https://example.com',
      'Source',
      'homeowners'
    );

    cache = addSummaryToCache(cache, summary);
    expect(getSummaryFromCache(cache, 'article1')).toBeTruthy();
  });

  test('should get cache statistics', () => {
    let cache = {};
    const summary = createCachedSummary(
      'article1',
      'Title',
      'Description',
      'https://example.com',
      'Source',
      'homeowners',
      'Summary',
      [],
      24
    );

    cache = addSummaryToCache(cache, summary);
    const stats = getCacheStats(cache);

    expect(stats.totalSummaries).toBe(1);
    expect(stats.validSummaries).toBe(1);
  });
});

describe('Article Sharing Tests', () => {
  test('should generate email share content', () => {
    const { subject, body } = generateEmailShareContent(
      'Article Title',
      'Article description',
      'https://example.com'
    );

    expect(subject).toContain('Article Title');
    expect(body).toContain('https://example.com');
  });

  test('should generate Twitter share text', () => {
    const text = generateTwitterShareText('Article Title', 'https://example.com');
    expect(text).toContain('Article Title');
    expect(text).toContain('https://example.com');
  });

  test('should create email share URL', () => {
    const url = createEmailShareUrl('test@example.com', 'Subject', 'Body');
    expect(url).toContain('mailto:');
    expect(url).toContain('test@example.com');
  });

  test('should export favorites as JSON', () => {
    const favorites = [];
    const json = exportFavoritesAsJSON(favorites);
    expect(json).toBe('[]');
  });
});

describe('Accessibility Tests', () => {
  test('should generate article ARIA label', () => {
    const label = generateArticleAriaLabel(
      'Article Title',
      'Source',
      'Category',
      '2025-10-21'
    );

    expect(label).toContain('Article Title');
    expect(label).toContain('Source');
    expect(label).toContain('Category');
  });

  test('should check WCAG compliance', () => {
    const compliance = checkWCAGCompliance('#000000', '#FFFFFF');
    expect(compliance.AA).toBe(true);
    expect(compliance.AAA).toBe(true);
  });

  test('should calculate contrast ratio', () => {
    const ratio = getContrastRatio('#000000', '#FFFFFF');
    expect(ratio).toBeGreaterThan(7);
  });
});

