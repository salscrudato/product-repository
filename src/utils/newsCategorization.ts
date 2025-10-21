/**
 * News Categorization Utility
 * Hierarchical categorization with AI-based classification
 */

export interface CategoryNode {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  weight: number;
  children?: CategoryNode[];
  color?: string;
  icon?: string;
}

export interface CategorizedArticle {
  title: string;
  description: string;
  primaryCategory: string;
  secondaryCategories: string[];
  confidenceScore: number;
}

// Hierarchical category structure
export const CATEGORY_HIERARCHY: CategoryNode = {
  id: 'root',
  name: 'Insurance News',
  description: 'All insurance news',
  keywords: [],
  weight: 1.0,
  children: [
    {
      id: 'products',
      name: 'Products & Coverage',
      description: 'Product launches, coverage updates, policy changes',
      keywords: ['product', 'coverage', 'policy', 'launch', 'new offering'],
      weight: 1.0,
      color: '#3b82f6',
      icon: '📦',
      children: [
        {
          id: 'homeowners',
          name: 'Homeowners',
          description: 'Homeowners insurance products and coverage',
          keywords: ['homeowners', 'home insurance', 'dwelling', 'residential'],
          weight: 1.0,
          color: '#60a5fa'
        },
        {
          id: 'auto',
          name: 'Auto Insurance',
          description: 'Auto and vehicle insurance products',
          keywords: ['auto', 'car insurance', 'vehicle', 'automobile'],
          weight: 1.0,
          color: '#60a5fa'
        },
        {
          id: 'commercial',
          name: 'Commercial',
          description: 'Commercial and business insurance',
          keywords: ['commercial', 'business insurance', 'CGL', 'workers comp'],
          weight: 1.0,
          color: '#60a5fa'
        }
      ]
    },
    {
      id: 'operations',
      name: 'Operations & Claims',
      description: 'Claims processing, operations, customer service',
      keywords: ['claims', 'operations', 'customer service', 'process'],
      weight: 1.1,
      color: '#10b981',
      icon: '⚙️',
      children: [
        {
          id: 'claims',
          name: 'Claims Management',
          description: 'Claims processing and settlement',
          keywords: ['claims', 'claim settlement', 'loss', 'damage', 'adjuster'],
          weight: 1.2,
          color: '#34d399'
        },
        {
          id: 'underwriting',
          name: 'Underwriting',
          description: 'Underwriting and risk assessment',
          keywords: ['underwriting', 'risk assessment', 'rating', 'premium'],
          weight: 1.1,
          color: '#34d399'
        }
      ]
    },
    {
      id: 'regulatory',
      name: 'Regulatory & Compliance',
      description: 'Regulations, compliance, rate approvals',
      keywords: ['regulation', 'compliance', 'filing', 'approval'],
      weight: 1.3,
      color: '#f59e0b',
      icon: '⚖️',
      children: [
        {
          id: 'rate-approval',
          name: 'Rate Approvals',
          description: 'Rate filings and approvals',
          keywords: ['rate approval', 'filing', 'rate increase', 'rate decrease'],
          weight: 1.3,
          color: '#fbbf24'
        },
        {
          id: 'compliance',
          name: 'Compliance',
          description: 'Regulatory compliance and requirements',
          keywords: ['compliance', 'regulation', 'requirement', 'law'],
          weight: 1.2,
          color: '#fbbf24'
        }
      ]
    },
    {
      id: 'risk',
      name: 'Risk & Catastrophe',
      description: 'Natural disasters, catastrophes, risk management',
      keywords: ['catastrophe', 'disaster', 'risk', 'weather'],
      weight: 1.4,
      color: '#ef4444',
      icon: '⚠️',
      children: [
        {
          id: 'catastrophe',
          name: 'Catastrophes',
          description: 'Natural disasters and catastrophic events',
          keywords: ['hurricane', 'earthquake', 'flood', 'wildfire', 'tornado'],
          weight: 1.4,
          color: '#f87171'
        },
        {
          id: 'risk-management',
          name: 'Risk Management',
          description: 'Risk management and mitigation',
          keywords: ['risk management', 'loss prevention', 'mitigation'],
          weight: 1.0,
          color: '#f87171'
        }
      ]
    },
    {
      id: 'fraud',
      name: 'Fraud & Investigation',
      description: 'Fraud detection, investigation, prevention',
      keywords: ['fraud', 'investigation', 'detection', 'prevention'],
      weight: 1.2,
      color: '#8b5cf6',
      icon: '🔍',
      children: [
        {
          id: 'fraud-detection',
          name: 'Fraud Detection',
          description: 'Fraud detection and prevention',
          keywords: ['fraud', 'fraudulent', 'detection', 'prevention'],
          weight: 1.2,
          color: '#a78bfa'
        }
      ]
    },
    {
      id: 'technology',
      name: 'Technology & Innovation',
      description: 'InsurTech, AI, automation, digital transformation',
      keywords: ['technology', 'AI', 'automation', 'digital', 'innovation'],
      weight: 1.0,
      color: '#06b6d4',
      icon: '🚀',
      children: [
        {
          id: 'insurtech',
          name: 'InsurTech',
          description: 'Insurance technology and startups',
          keywords: ['insurtech', 'startup', 'technology', 'innovation'],
          weight: 1.0,
          color: '#22d3ee'
        },
        {
          id: 'ai-ml',
          name: 'AI & Machine Learning',
          description: 'Artificial intelligence and machine learning',
          keywords: ['AI', 'machine learning', 'artificial intelligence', 'automation'],
          weight: 1.0,
          color: '#22d3ee'
        }
      ]
    },
    {
      id: 'market',
      name: 'Market & Business',
      description: 'Market trends, mergers, acquisitions, earnings',
      keywords: ['market', 'business', 'earnings', 'merger', 'acquisition'],
      weight: 0.9,
      color: '#6366f1',
      icon: '📈',
      children: [
        {
          id: 'market-trends',
          name: 'Market Trends',
          description: 'Market trends and analysis',
          keywords: ['market', 'trend', 'analysis', 'forecast'],
          weight: 0.9,
          color: '#818cf8'
        },
        {
          id: 'consolidation',
          name: 'M&A & Consolidation',
          description: 'Mergers, acquisitions, and consolidation',
          keywords: ['merger', 'acquisition', 'consolidation', 'IPO'],
          weight: 0.9,
          color: '#818cf8'
        }
      ]
    }
  ]
};

/**
 * Flatten category hierarchy for easier access
 */
export function flattenCategories(node: CategoryNode = CATEGORY_HIERARCHY): CategoryNode[] {
  const categories: CategoryNode[] = [];

  if (node.id !== 'root') {
    categories.push(node);
  }

  if (node.children) {
    for (const child of node.children) {
      categories.push(...flattenCategories(child));
    }
  }

  return categories;
}

/**
 * Get category by ID
 */
export function getCategoryById(id: string): CategoryNode | null {
  const categories = flattenCategories();
  return categories.find(cat => cat.id === id) || null;
}

/**
 * Categorize article
 */
export function categorizeArticle(
  title: string,
  description: string
): CategorizedArticle {
  const content = `${title} ${description}`.toLowerCase();
  const categories = flattenCategories();
  const scores: Record<string, number> = {};

  // Score each category
  for (const category of categories) {
    let score = 0;

    // Check keywords
    for (const keyword of category.keywords) {
      if (content.includes(keyword.toLowerCase())) {
        score += 10 * category.weight;
      }
    }

    // Title matches are worth more
    if (title.toLowerCase().includes(category.keywords[0]?.toLowerCase() || '')) {
      score += 5 * category.weight;
    }

    scores[category.id] = score;
  }

  // Get top categories
  const sortedCategories = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const primaryCategory = sortedCategories[0]?.[0] || 'market';
  const secondaryCategories = sortedCategories.slice(1).map(([id]) => id);
  const confidenceScore = Math.min(100, (sortedCategories[0]?.[1] || 0) / 10);

  return {
    title,
    description,
    primaryCategory,
    secondaryCategories,
    confidenceScore
  };
}

/**
 * Get category path (breadcrumb)
 */
export function getCategoryPath(categoryId: string): string[] {
  const path: string[] = [];

  function findPath(node: CategoryNode): boolean {
    if (node.id === categoryId) {
      path.push(node.id);
      return true;
    }

    if (node.children) {
      for (const child of node.children) {
        if (findPath(child)) {
          path.unshift(node.id);
          return true;
        }
      }
    }

    return false;
  }

  findPath(CATEGORY_HIERARCHY);
  return path;
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(categoryId: string): string {
  const category = getCategoryById(categoryId);
  return category?.name || categoryId;
}

/**
 * Get category color
 */
export function getCategoryColor(categoryId: string): string {
  const category = getCategoryById(categoryId);
  return category?.color || '#6b7280';
}

/**
 * Get category icon
 */
export function getCategoryIcon(categoryId: string): string {
  const category = getCategoryById(categoryId);
  return category?.icon || '📰';
}

/**
 * Get all top-level categories
 */
export function getTopLevelCategories(): CategoryNode[] {
  return CATEGORY_HIERARCHY.children || [];
}

