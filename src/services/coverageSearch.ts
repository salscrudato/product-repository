/**
 * Coverage Search Service
 * 
 * Intelligent fuzzy search for coverage names using Fuse.js
 * Features:
 * - Typo tolerance
 * - Abbreviation expansion
 * - Synonym matching
 * - Line of business filtering
 * - Relevance scoring
 */

import Fuse, { IFuseOptions } from 'fuse.js';
import { COVERAGE_DATABASE, CoverageEntry } from '../data/coverageDatabase';

export interface SearchResult {
  name: string;
  score: number; // 0-100, higher is better
  matchType: 'exact' | 'abbreviation' | 'alias' | 'keyword' | 'fuzzy';
  category: string;
  description?: string;
  commonlyPairedWith?: string[];
}

// Configure Fuse.js for optimal fuzzy matching
const fuseOptions: IFuseOptions<CoverageEntry> = {
  // Keys to search with weights
  keys: [
    { name: 'name', weight: 1.0 },           // Primary name - highest weight
    { name: 'abbreviations', weight: 0.9 },   // Abbreviations - very high
    { name: 'aliases', weight: 0.85 },        // Alternative names - high
    { name: 'keywords', weight: 0.6 },        // Related keywords - medium
    { name: 'description', weight: 0.3 },     // Description - lower
  ],
  
  // Fuzzy matching settings
  threshold: 0.4,        // 0 = exact, 1 = match anything (0.4 is balanced)
  distance: 100,         // How far to search for matches
  minMatchCharLength: 2, // Minimum characters to trigger search
  
  // Include score and match info
  includeScore: true,
  includeMatches: true,
  
  // Use extended search for advanced patterns
  useExtendedSearch: true,
  
  // Ignore field length normalization for better short-term matching
  ignoreFieldNorm: false,
  fieldNormWeight: 1,
};

// Create Fuse instance
const fuse = new Fuse(COVERAGE_DATABASE, fuseOptions);

/**
 * Search for coverages matching the query
 */
export function searchCoverages(
  query: string,
  options: {
    lineOfBusiness?: string;
    maxResults?: number;
    includeRelated?: boolean;
  } = {}
): SearchResult[] {
  const { lineOfBusiness, maxResults = 10, includeRelated = true } = options;
  
  if (!query || query.length < 1) {
    // Return popular coverages when no query
    return getPopularCoverages(lineOfBusiness, maxResults);
  }

  const normalizedQuery = query.trim().toUpperCase();
  
  // Check for exact abbreviation match first
  const exactAbbrevMatch = COVERAGE_DATABASE.find(c => 
    c.abbreviations?.some(abbr => abbr.toUpperCase() === normalizedQuery)
  );
  
  if (exactAbbrevMatch) {
    // Return abbreviation match first, then fuzzy results
    const results: SearchResult[] = [{
      name: exactAbbrevMatch.name,
      score: 100,
      matchType: 'abbreviation',
      category: exactAbbrevMatch.category,
      description: exactAbbrevMatch.description,
      commonlyPairedWith: exactAbbrevMatch.commonlyPairedWith,
    }];
    
    // Add related coverages if requested
    if (includeRelated && exactAbbrevMatch.commonlyPairedWith) {
      exactAbbrevMatch.commonlyPairedWith.forEach(related => {
        const relatedCoverage = COVERAGE_DATABASE.find(c => c.name === related);
        if (relatedCoverage) {
          results.push({
            name: relatedCoverage.name,
            score: 75,
            matchType: 'keyword',
            category: relatedCoverage.category,
            description: relatedCoverage.description,
          });
        }
      });
    }
    
    return results.slice(0, maxResults);
  }

  // Perform fuzzy search
  const fuseResults = fuse.search(query);
  
  // Filter by line of business if specified
  let filtered = fuseResults;
  if (lineOfBusiness) {
    const lobLower = lineOfBusiness.toLowerCase();
    filtered = fuseResults.filter(r => 
      r.item.lineOfBusiness.some(lob => 
        lob.toLowerCase().includes(lobLower) || lobLower.includes(lob.toLowerCase())
      )
    );
    
    // If filtering removes too many, add some back
    if (filtered.length < 3) {
      filtered = [...filtered, ...fuseResults.filter(r => !filtered.includes(r)).slice(0, 5)];
    }
  }

  // Convert to SearchResult format
  const results: SearchResult[] = filtered.slice(0, maxResults).map(result => {
    const fuseScore = result.score || 0;
    // Convert Fuse score (0 = perfect, 1 = worst) to our score (100 = perfect, 0 = worst)
    const score = Math.round((1 - fuseScore) * 100);
    
    // Determine match type based on which field matched
    let matchType: SearchResult['matchType'] = 'fuzzy';
    if (result.matches) {
      const matchedKey = result.matches[0]?.key;
      if (matchedKey === 'name') matchType = score > 90 ? 'exact' : 'fuzzy';
      else if (matchedKey === 'abbreviations') matchType = 'abbreviation';
      else if (matchedKey === 'aliases') matchType = 'alias';
      else if (matchedKey === 'keywords') matchType = 'keyword';
    }

    return {
      name: result.item.name,
      score,
      matchType,
      category: result.item.category,
      description: result.item.description,
      commonlyPairedWith: result.item.commonlyPairedWith,
    };
  });

  return results;
}

/**
 * Get popular coverages for a line of business
 */
export function getPopularCoverages(
  lineOfBusiness?: string,
  maxResults: number = 8
): SearchResult[] {
  let coverages = COVERAGE_DATABASE;

  if (lineOfBusiness) {
    const lobLower = lineOfBusiness.toLowerCase();
    coverages = COVERAGE_DATABASE.filter(c =>
      c.lineOfBusiness.some(lob =>
        lob.toLowerCase().includes(lobLower) || lobLower.includes(lob.toLowerCase())
      )
    );
  }

  // Return top coverages by category diversity
  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const coverage of coverages) {
    if (!seen.has(coverage.category)) {
      results.push({
        name: coverage.name,
        score: 80,
        matchType: 'keyword',
        category: coverage.category,
        description: coverage.description,
        commonlyPairedWith: coverage.commonlyPairedWith,
      });
      seen.add(coverage.category);
    }
    if (results.length >= maxResults) break;
  }

  // Fill remaining slots with more coverages
  if (results.length < maxResults) {
    for (const coverage of coverages) {
      if (!results.some(r => r.name === coverage.name)) {
        results.push({
          name: coverage.name,
          score: 70,
          matchType: 'keyword',
          category: coverage.category,
          description: coverage.description,
        });
      }
      if (results.length >= maxResults) break;
    }
  }

  return results;
}

/**
 * Get coverages commonly paired with a given coverage
 */
export function getRelatedCoverages(
  coverageName: string,
  maxResults: number = 5
): SearchResult[] {
  const coverage = COVERAGE_DATABASE.find(
    c => c.name.toLowerCase() === coverageName.toLowerCase()
  );

  if (!coverage?.commonlyPairedWith) return [];

  return coverage.commonlyPairedWith
    .map(related => {
      const relatedCoverage = COVERAGE_DATABASE.find(c => c.name === related);
      if (!relatedCoverage) return null;

      return {
        name: relatedCoverage.name,
        score: 85,
        matchType: 'keyword' as const,
        category: relatedCoverage.category,
        description: relatedCoverage.description,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .slice(0, maxResults);
}

/**
 * Suggest coverages that might be missing based on existing coverages
 */
export function suggestMissingCoverages(
  existingCoverageNames: string[],
  lineOfBusiness?: string,
  maxResults: number = 5
): SearchResult[] {
  const existing = new Set(existingCoverageNames.map(n => n.toLowerCase()));
  const suggestions: SearchResult[] = [];
  const seen = new Set<string>();

  // Find coverages commonly paired with existing ones
  for (const existingName of existingCoverageNames) {
    const related = getRelatedCoverages(existingName, 10);
    for (const r of related) {
      if (!existing.has(r.name.toLowerCase()) && !seen.has(r.name)) {
        suggestions.push({
          ...r,
          score: 90, // High score for gap-filling suggestions
          matchType: 'keyword',
        });
        seen.add(r.name);
      }
    }
  }

  // Filter by line of business if specified
  let filtered = suggestions;
  if (lineOfBusiness) {
    const lobLower = lineOfBusiness.toLowerCase();
    filtered = suggestions.filter(s => {
      const coverage = COVERAGE_DATABASE.find(c => c.name === s.name);
      return coverage?.lineOfBusiness.some(lob =>
        lob.toLowerCase().includes(lobLower)
      );
    });
  }

  return filtered.slice(0, maxResults);
}

/**
 * Get all unique categories
 */
export function getCategories(): string[] {
  return [...new Set(COVERAGE_DATABASE.map(c => c.category))].sort();
}

/**
 * Get coverages by category
 */
export function getCoveragesByCategory(category: string): CoverageEntry[] {
  return COVERAGE_DATABASE.filter(c => c.category === category);
}

