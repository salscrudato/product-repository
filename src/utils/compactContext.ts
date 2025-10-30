/**
 * Compact Context Builder
 * Builds minimal, efficient context for AI operations to reduce token usage
 */

import logger, { LOG_CATEGORIES } from './logger';

/**
 * Compact product summary
 */
export interface CompactProduct {
  id: string;
  name: string;
  coverageCount: number;
  formCount: number;
}

/**
 * Compact coverage summary
 */
export interface CompactCoverage {
  id: string;
  name: string;
  type: string;
  productId: string;
}

/**
 * Compact form summary
 */
export interface CompactForm {
  id: string;
  name: string;
  number: string;
}

/**
 * Compact context data
 */
export interface CompactContextData {
  products: CompactProduct[];
  coverages: CompactCoverage[];
  forms: CompactForm[];
  stats: {
    totalProducts: number;
    totalCoverages: number;
    totalForms: number;
    estimatedTokens: number;
  };
}

/**
 * Build compact context from full data
 */
export function buildCompactContext(
  products: Record<string, any>,
  coverages: any[],
  forms: any[]
): CompactContextData {
  const compactProducts: CompactProduct[] = Object.entries(products).map(([id, name]) => ({
    id,
    name: String(name),
    coverageCount: coverages.filter(c => c.productId === id).length,
    formCount: forms.filter(f => f.productId === id).length
  }));

  const compactCoverages: CompactCoverage[] = coverages.map(c => ({
    id: c.id,
    name: c.name || c.coverageName || 'Unnamed',
    type: c.type || c.coverageType || 'Unknown',
    productId: c.productId
  }));

  const compactForms: CompactForm[] = forms.map(f => ({
    id: f.id,
    name: f.name || f.formName || 'Unnamed',
    number: f.number || f.formNumber || 'N/A'
  }));

  const contextString = JSON.stringify({
    products: compactProducts,
    coverages: compactCoverages,
    forms: compactForms
  });

  const estimatedTokens = Math.ceil(contextString.length / 4);

  return {
    products: compactProducts,
    coverages: compactCoverages,
    forms: compactForms,
    stats: {
      totalProducts: compactProducts.length,
      totalCoverages: compactCoverages.length,
      totalForms: compactForms.length,
      estimatedTokens
    }
  };
}

/**
 * Format compact context for AI prompt
 */
export function formatCompactContext(context: CompactContextData): string {
  const lines: string[] = [
    'DATABASE CONTEXT:',
    `Products: ${context.stats.totalProducts}`,
    `Coverages: ${context.stats.totalCoverages}`,
    `Forms: ${context.stats.totalForms}`,
    ''
  ];

  if (context.products.length > 0) {
    lines.push('PRODUCTS:');
    context.products.forEach(p => {
      lines.push(`- ${p.name} (${p.coverageCount} coverages, ${p.formCount} forms)`);
    });
    lines.push('');
  }

  if (context.coverages.length > 0 && context.coverages.length <= 20) {
    lines.push('COVERAGES:');
    context.coverages.forEach(c => {
      lines.push(`- ${c.name} (${c.type})`);
    });
    lines.push('');
  }

  if (context.forms.length > 0 && context.forms.length <= 20) {
    lines.push('FORMS:');
    context.forms.forEach(f => {
      lines.push(`- ${f.name} (${f.number})`);
    });
  }

  return lines.join('\n');
}

/**
 * Estimate token count
 */
export function estimateTokenCount(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Truncate context to fit token limit
 */
export function truncateContextToTokenLimit(
  context: CompactContextData,
  maxTokens: number
): CompactContextData {
  const formatted = formatCompactContext(context);
  const currentTokens = estimateTokenCount(formatted);

  if (currentTokens <= maxTokens) {
    return context;
  }

  logger.warn(LOG_CATEGORIES.AI, 'Context exceeds token limit, truncating', {
    currentTokens,
    maxTokens,
    reduction: Math.round((1 - maxTokens / currentTokens) * 100)
  });

  // Truncate in order of priority
  const truncated: CompactContextData = {
    products: context.products.slice(0, Math.max(1, Math.floor(context.products.length * 0.7))),
    coverages: context.coverages.slice(0, Math.max(1, Math.floor(context.coverages.length * 0.5))),
    forms: context.forms.slice(0, Math.max(1, Math.floor(context.forms.length * 0.5))),
    stats: {
      totalProducts: context.stats.totalProducts,
      totalCoverages: context.stats.totalCoverages,
      totalForms: context.stats.totalForms,
      estimatedTokens: 0
    }
  };

  const truncatedFormatted = formatCompactContext(truncated);
  truncated.stats.estimatedTokens = estimateTokenCount(truncatedFormatted);

  return truncated;
}

/**
 * Build minimal context for quick queries
 */
export function buildMinimalContext(
  products: Record<string, any>,
  coverages: any[],
  forms: any[]
): string {
  const productCount = Object.keys(products).length;
  const coverageCount = coverages.length;
  const formCount = forms.length;

  return `Database: ${productCount} products, ${coverageCount} coverages, ${formCount} forms`;
}

/**
 * Build focused context for specific product
 */
export function buildProductFocusedContext(
  productId: string,
  productName: string,
  coverages: any[],
  forms: any[]
): string {
  const productCoverages = coverages.filter(c => c.productId === productId);
  const productForms = forms.filter(f => f.productId === productId);

  const lines: string[] = [
    `PRODUCT: ${productName}`,
    `Coverages: ${productCoverages.length}`,
    `Forms: ${productForms.length}`,
    ''
  ];

  if (productCoverages.length > 0) {
    lines.push('COVERAGES:');
    productCoverages.slice(0, 10).forEach(c => {
      lines.push(`- ${c.name || c.coverageName}`);
    });
    if (productCoverages.length > 10) {
      lines.push(`... and ${productCoverages.length - 10} more`);
    }
  }

  return lines.join('\n');
}

