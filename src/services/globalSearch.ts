/**
 * Global Search Service
 * Unified search across products, coverages, forms, and rules
 */

import { db } from '../firebase';
import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';
import type { Product, Coverage, FormTemplate, Rule } from '../types';

export type SearchResultType = 'product' | 'coverage' | 'form' | 'rule';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  description?: string;
  path: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface SearchOptions {
  types?: SearchResultType[];
  productId?: string;
  maxResults?: number;
}

const DEFAULT_MAX_RESULTS = 20;

/**
 * Perform a global search across all entity types
 */
export async function globalSearch(
  searchTerm: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { 
    types = ['product', 'coverage', 'form', 'rule'],
    productId,
    maxResults = DEFAULT_MAX_RESULTS 
  } = options;
  
  const normalizedTerm = searchTerm.toLowerCase().trim();
  if (!normalizedTerm) return [];

  const searchPromises: Promise<SearchResult[]>[] = [];
  
  if (types.includes('product')) {
    searchPromises.push(searchProducts(normalizedTerm, maxResults));
  }
  if (types.includes('coverage')) {
    searchPromises.push(searchCoverages(normalizedTerm, productId, maxResults));
  }
  if (types.includes('form')) {
    searchPromises.push(searchForms(normalizedTerm, productId, maxResults));
  }
  if (types.includes('rule')) {
    searchPromises.push(searchRules(normalizedTerm, productId, maxResults));
  }

  const allResults = await Promise.all(searchPromises);
  const flatResults = allResults.flat();
  
  // Sort by score and limit
  return flatResults
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

async function searchProducts(term: string, max: number): Promise<SearchResult[]> {
  const snapshot = await getDocs(collection(db, 'products'));
  const results: SearchResult[] = [];
  
  snapshot.docs.forEach(doc => {
    const data = doc.data() as Product;
    const score = calculateScore(term, [
      data.name,
      data.productCode,
      data.description,
      data.category
    ]);
    
    if (score > 0) {
      results.push({
        id: doc.id,
        type: 'product',
        title: data.name,
        subtitle: data.productCode,
        description: data.description,
        path: `/products/${doc.id}`,
        score,
        metadata: { status: data.status, category: data.category }
      });
    }
  });
  
  return results.slice(0, max);
}

async function searchCoverages(term: string, productId: string | undefined, max: number): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  // If productId is specified, search within that product
  if (productId) {
    const snapshot = await getDocs(collection(db, `products/${productId}/coverages`));
    snapshot.docs.forEach(doc => {
      const data = doc.data() as Coverage;
      const score = calculateScore(term, [data.name, data.coverageCode, data.description, data.type]);
      if (score > 0) {
        results.push({
          id: doc.id,
          type: 'coverage',
          title: data.name,
          subtitle: data.coverageCode,
          description: data.description,
          path: `/products/${productId}/coverages/${doc.id}`,
          score,
          metadata: { type: data.type, isOptional: data.isOptional }
        });
      }
    });
  } else {
    // Search all products' coverages (limited for performance)
    const productsSnap = await getDocs(query(collection(db, 'products'), limit(50)));
    for (const productDoc of productsSnap.docs) {
      const coveragesSnap = await getDocs(collection(db, `products/${productDoc.id}/coverages`));
      coveragesSnap.docs.forEach(doc => {
        const data = doc.data() as Coverage;
        const score = calculateScore(term, [data.name, data.coverageCode, data.description]);
        if (score > 0) {
          results.push({
            id: doc.id,
            type: 'coverage',
            title: data.name,
            subtitle: `${productDoc.data().name} › ${data.coverageCode || ''}`,
            path: `/products/${productDoc.id}/coverages/${doc.id}`,
            score
          });
        }
      });
      if (results.length >= max) break;
    }
  }
  
  return results.slice(0, max);
}

async function searchForms(term: string, productId: string | undefined, max: number): Promise<SearchResult[]> {
  const q = productId 
    ? query(collection(db, 'forms'), where('productId', '==', productId))
    : query(collection(db, 'forms'), limit(100));
  
  const snapshot = await getDocs(q);
  const results: SearchResult[] = [];
  
  snapshot.docs.forEach(doc => {
    const data = doc.data() as FormTemplate;
    const score = calculateScore(term, [data.formNumber, data.formName, data.description, data.type]);
    if (score > 0) {
      results.push({
        id: doc.id,
        type: 'form',
        title: data.formNumber,
        subtitle: data.formName,
        description: data.description,
        path: `/forms/${doc.id}`,
        score,
        metadata: { type: data.type, edition: data.formEditionDate }
      });
    }
  });
  
  return results.slice(0, max);
}

async function searchRules(term: string, productId: string | undefined, max: number): Promise<SearchResult[]> {
  const q = productId
    ? query(collection(db, 'rules'), where('productId', '==', productId))
    : query(collection(db, 'rules'), limit(100));
  
  const snapshot = await getDocs(q);
  const results: SearchResult[] = [];
  
  snapshot.docs.forEach(doc => {
    const data = doc.data() as Rule;
    const score = calculateScore(term, [data.name, data.condition, data.outcome, data.ruleCategory]);
    if (score > 0) {
      results.push({
        id: doc.id,
        type: 'rule',
        title: data.name,
        subtitle: data.ruleCategory,
        description: data.condition,
        path: `/products/${data.productId}/rules/${doc.id}`,
        score,
        metadata: { status: data.status, category: data.ruleCategory }
      });
    }
  });
  
  return results.slice(0, max);
}

function calculateScore(term: string, fields: (string | undefined)[]): number {
  let score = 0;
  const termLower = term.toLowerCase();
  
  for (const field of fields) {
    if (!field) continue;
    const fieldLower = field.toLowerCase();
    
    // Exact match
    if (fieldLower === termLower) {
      score += 100;
    }
    // Starts with
    else if (fieldLower.startsWith(termLower)) {
      score += 75;
    }
    // Contains
    else if (fieldLower.includes(termLower)) {
      score += 50;
    }
    // Word match
    else if (fieldLower.split(/\s+/).some(word => word.startsWith(termLower))) {
      score += 25;
    }
  }
  
  return score;
}

/**
 * Get recent searches from local storage
 */
export function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem('recentSearches');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save a search term to recent searches
 */
export function saveRecentSearch(term: string): void {
  try {
    const recent = getRecentSearches().filter(t => t !== term);
    recent.unshift(term);
    localStorage.setItem('recentSearches', JSON.stringify(recent.slice(0, 10)));
  } catch {
    // Ignore storage errors
  }
}

