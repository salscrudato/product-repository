/**
 * Coverage Data Helpers
 * Utilities for dual-read support and data migration
 */

import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Coverage, CoverageLimit, CoverageDeductible } from '../types';

/**
 * Get limits for a coverage with dual-read support
 * Reads from subcollection first, falls back to string array if empty
 */
export async function getCoverageLimits(
  productId: string,
  coverageId: string,
  coverage?: Coverage
): Promise<{ limits: CoverageLimit[]; source: 'subcollection' | 'legacy' }> {
  try {
    // Try to read from subcollection first
    const limitsRef = collection(db, `products/${productId}/coverages/${coverageId}/limits`);
    const q = query(limitsRef, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const limits = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CoverageLimit[];
      
      return { limits, source: 'subcollection' };
    }

    // Fallback to legacy string array
    if (coverage?.limits && coverage.limits.length > 0) {
      // Convert string array to CoverageLimit objects for display
      const legacyLimits: CoverageLimit[] = coverage.limits.map((limitStr, index) => ({
        id: `legacy-${index}`,
        coverageId,
        productId,
        limitType: 'perOccurrence', // Default type
        amount: 0, // Would need parsing
        displayValue: limitStr,
        isDefault: index === 0,
        isRequired: false,
      }));

      return { limits: legacyLimits, source: 'legacy' };
    }

    return { limits: [], source: 'subcollection' };
  } catch (error) {
    console.error('Error getting coverage limits:', error);
    return { limits: [], source: 'subcollection' };
  }
}

/**
 * Get deductibles for a coverage with dual-read support
 * Reads from subcollection first, falls back to string array if empty
 */
export async function getCoverageDeductibles(
  productId: string,
  coverageId: string,
  coverage?: Coverage
): Promise<{ deductibles: CoverageDeductible[]; source: 'subcollection' | 'legacy' }> {
  try {
    // Try to read from subcollection first
    const deductiblesRef = collection(db, `products/${productId}/coverages/${coverageId}/deductibles`);
    const q = query(deductiblesRef, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const deductibles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CoverageDeductible[];
      
      return { deductibles, source: 'subcollection' };
    }

    // Fallback to legacy string array
    if (coverage?.deductibles && coverage.deductibles.length > 0) {
      // Convert string array to CoverageDeductible objects for display
      const legacyDeductibles: CoverageDeductible[] = coverage.deductibles.map((dedStr, index) => ({
        id: `legacy-${index}`,
        coverageId,
        productId,
        deductibleType: 'flat', // Default type
        amount: 0, // Would need parsing
        displayValue: dedStr,
        isDefault: index === 0,
        isRequired: false,
      }));

      return { deductibles: legacyDeductibles, source: 'legacy' };
    }

    return { deductibles: [], source: 'subcollection' };
  } catch (error) {
    console.error('Error getting coverage deductibles:', error);
    return { deductibles: [], source: 'subcollection' };
  }
}

/**
 * Check if a coverage has been migrated to new structure
 */
export async function isCoverageMigrated(
  productId: string,
  coverageId: string
): Promise<boolean> {
  try {
    const limitsRef = collection(db, `products/${productId}/coverages/${coverageId}/limits`);
    const deductiblesRef = collection(db, `products/${productId}/coverages/${coverageId}/deductibles`);
    
    const [limitsSnapshot, deductiblesSnapshot] = await Promise.all([
      getDocs(limitsRef),
      getDocs(deductiblesRef)
    ]);

    // Consider migrated if either subcollection has data
    return !limitsSnapshot.empty || !deductiblesSnapshot.empty;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
}

/**
 * Get migration status for all coverages in a product
 */
export async function getProductMigrationStatus(
  productId: string,
  coverages: Coverage[]
): Promise<{
  total: number;
  migrated: number;
  pending: number;
  percentage: number;
}> {
  const migrationChecks = await Promise.all(
    coverages.map(coverage => isCoverageMigrated(productId, coverage.id))
  );

  const migrated = migrationChecks.filter(Boolean).length;
  const total = coverages.length;
  const pending = total - migrated;
  const percentage = total > 0 ? Math.round((migrated / total) * 100) : 0;

  return {
    total,
    migrated,
    pending,
    percentage,
  };
}

/**
 * Parse dollar amount from string (e.g., "$1,000,000" -> 1000000)
 */
export function parseDollarAmount(str: string): number {
  const cleaned = str.replace(/[$,]/g, '');
  const match = cleaned.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * Parse percentage from string (e.g., "10%" -> 10)
 */
export function parsePercentage(str: string): number {
  const match = str.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * Format dollar amount for display (e.g., 1000000 -> "$1,000,000")
 */
export function formatDollarAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage for display (e.g., 10 -> "10%")
 */
export function formatPercentage(percentage: number): string {
  return `${percentage}%`;
}

/**
 * Determine limit type from string description
 */
export function inferLimitType(limitStr: string): 'perOccurrence' | 'aggregate' | 'perPerson' | 'perLocation' | 'sublimit' | 'combined' | 'split' {
  const lower = limitStr.toLowerCase();
  
  if (lower.includes('per occurrence') || lower.includes('each occurrence')) {
    return 'perOccurrence';
  }
  if (lower.includes('aggregate') || lower.includes('total')) {
    return 'aggregate';
  }
  if (lower.includes('per person') || lower.includes('each person')) {
    return 'perPerson';
  }
  if (lower.includes('per location') || lower.includes('each location')) {
    return 'perLocation';
  }
  if (lower.includes('sublimit')) {
    return 'sublimit';
  }
  if (lower.includes('combined')) {
    return 'combined';
  }
  if (lower.includes('split')) {
    return 'split';
  }
  
  // Default to per occurrence
  return 'perOccurrence';
}

/**
 * Determine deductible type from string description
 */
export function inferDeductibleType(dedStr: string): 'flat' | 'percentage' | 'franchise' | 'disappearing' | 'perOccurrence' | 'aggregate' | 'waiting' {
  const lower = dedStr.toLowerCase();
  
  if (lower.includes('%') || lower.includes('percent')) {
    return 'percentage';
  }
  if (lower.includes('franchise')) {
    return 'franchise';
  }
  if (lower.includes('disappearing')) {
    return 'disappearing';
  }
  if (lower.includes('per occurrence') || lower.includes('each occurrence')) {
    return 'perOccurrence';
  }
  if (lower.includes('aggregate') || lower.includes('annual')) {
    return 'aggregate';
  }
  if (lower.includes('waiting') || lower.includes('days')) {
    return 'waiting';
  }
  
  // Default to flat
  return 'flat';
}

/**
 * Get display name for limit type
 */
export function getLimitTypeDisplayName(limitType: string): string {
  const displayNames: Record<string, string> = {
    perOccurrence: 'Per Occurrence',
    aggregate: 'Aggregate',
    perPerson: 'Per Person',
    perLocation: 'Per Location',
    sublimit: 'Sublimit',
    combined: 'Combined Single Limit',
    split: 'Split Limit',
  };
  
  return displayNames[limitType] || limitType;
}

/**
 * Get display name for deductible type
 */
export function getDeductibleTypeDisplayName(deductibleType: string): string {
  const displayNames: Record<string, string> = {
    flat: 'Flat Amount',
    percentage: 'Percentage',
    franchise: 'Franchise',
    disappearing: 'Disappearing',
    perOccurrence: 'Per Occurrence',
    aggregate: 'Aggregate',
    waiting: 'Waiting Period',
  };
  
  return displayNames[deductibleType] || deductibleType;
}

