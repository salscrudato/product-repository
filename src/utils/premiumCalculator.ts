/**
 * Premium Calculator for P&C Insurance
 * Provides real-time premium calculation with rate modifiers
 * Supports multiple calculation methodologies
 */

import logger, { LOG_CATEGORIES } from './logger';

/**
 * Rate modifier
 */
export interface RateModifier {
  name: string;
  factor: number; // Multiplier (1.0 = no change, 1.1 = 10% increase)
  description?: string;
  category?: string;
}

/**
 * Coverage pricing
 */
export interface CoveragePricing {
  coverageId: string;
  coverageName: string;
  baseRate: number;
  limit?: number;
  deductible?: number;
  modifiers?: RateModifier[];
}

/**
 * Premium calculation result
 */
export interface PremiumCalculation {
  baseTotal: number;
  modifiedTotal: number;
  breakdown: {
    coverage: string;
    baseAmount: number;
    modifiers: Array<{ name: string; factor: number; amount: number }>;
    total: number;
  }[];
  totalModifiers: number;
  effectiveRate: number;
  currency: string;
}

/**
 * Premium calculator
 */
export class PremiumCalculator {
  private static readonly DEFAULT_CURRENCY = 'USD';

  /**
   * Calculate premium for a single coverage
   */
  static calculateCoveragePremium(
    coverage: CoveragePricing,
    currency: string = this.DEFAULT_CURRENCY
  ): { base: number; modified: number; modifiers: Array<{ name: string; amount: number }> } {
    let base = coverage.baseRate;

    // Apply limit adjustment if provided
    if (coverage.limit) {
      base = this.adjustForLimit(base, coverage.limit);
    }

    // Apply deductible adjustment if provided
    if (coverage.deductible) {
      base = this.adjustForDeductible(base, coverage.deductible);
    }

    // Apply modifiers
    let modified = base;
    const appliedModifiers: Array<{ name: string; factor: number; amount: number }> = [];

    if (coverage.modifiers && coverage.modifiers.length > 0) {
      for (const modifier of coverage.modifiers) {
        const modifierAmount = modified * (modifier.factor - 1);
        modified *= modifier.factor;
        appliedModifiers.push({
          name: modifier.name,
          factor: modifier.factor,
          amount: modifierAmount,
        });
      }
    }

    return {
      base,
      modified,
      modifiers: appliedModifiers,
    };
  }

  /**
   * Calculate total premium for multiple coverages
   */
  static calculateTotalPremium(
    coverages: CoveragePricing[],
    globalModifiers?: RateModifier[],
    currency: string = this.DEFAULT_CURRENCY
  ): PremiumCalculation {
    const breakdown: PremiumCalculation['breakdown'] = [];
    let baseTotal = 0;
    let modifiedTotal = 0;

    // Calculate each coverage
    for (const coverage of coverages) {
      const { base, modified, modifiers } = this.calculateCoveragePremium(coverage, currency);

      baseTotal += base;
      modifiedTotal += modified;

      breakdown.push({
        coverage: coverage.coverageName,
        baseAmount: base,
        modifiers: modifiers.map(m => ({
          name: m.name,
          factor: m.factor,
          amount: m.amount,
        })),
        total: modified,
      });
    }

    // Apply global modifiers
    let finalTotal = modifiedTotal;
    let totalModifierFactor = 1;

    if (globalModifiers && globalModifiers.length > 0) {
      for (const modifier of globalModifiers) {
        finalTotal *= modifier.factor;
        totalModifierFactor *= modifier.factor;
      }
    }

    const effectiveRate = baseTotal > 0 ? (finalTotal / baseTotal) : 1;

    return {
      baseTotal,
      modifiedTotal: finalTotal,
      breakdown,
      totalModifiers: totalModifierFactor,
      effectiveRate,
      currency,
    };
  }

  /**
   * Adjust premium based on limit
   */
  private static adjustForLimit(baseRate: number, limit: number): number {
    // Higher limits typically have lower per-unit rates
    // This is a simplified adjustment; actual calculation would be more complex
    const limitFactor = Math.log(limit / 100000) / Math.log(2); // Logarithmic scaling
    return baseRate * (1 + limitFactor * 0.1); // 10% adjustment per log scale
  }

  /**
   * Adjust premium based on deductible
   */
  private static adjustForDeductible(baseRate: number, deductible: number): number {
    // Higher deductibles reduce premium
    // Typical reduction: 5% per $1000 of deductible
    const deductibleReduction = (deductible / 1000) * 0.05;
    return baseRate * Math.max(0.5, 1 - deductibleReduction); // Minimum 50% of base
  }

  /**
   * Calculate premium with annual adjustments
   */
  static calculateAnnualPremium(
    basePremium: number,
    annualAdjustments: Array<{ year: number; factor: number }>,
    currentYear: number = new Date().getFullYear()
  ): number {
    let premium = basePremium;

    for (const adjustment of annualAdjustments) {
      if (adjustment.year <= currentYear) {
        premium *= adjustment.factor;
      }
    }

    return premium;
  }

  /**
   * Calculate premium with loss history adjustment
   */
  static calculateWithLossHistory(
    basePremium: number,
    claimsCount: number,
    totalLosses: number,
    exposureBase: number = 100000
  ): { premium: number; lossRatio: number; adjustment: number } {
    const lossRatio = totalLosses / exposureBase;
    
    // Experience modification factor (simplified)
    // Typical range: 0.7 to 1.5
    let adjustment = 1;
    
    if (lossRatio < 0.05) {
      adjustment = 0.85; // 15% credit
    } else if (lossRatio < 0.10) {
      adjustment = 0.95; // 5% credit
    } else if (lossRatio > 0.20) {
      adjustment = 1.25; // 25% surcharge
    } else if (lossRatio > 0.15) {
      adjustment = 1.15; // 15% surcharge
    }

    // Additional adjustment for claim frequency
    if (claimsCount > 3) {
      adjustment *= 1.1; // 10% additional surcharge per claim over 3
    }

    return {
      premium: basePremium * adjustment,
      lossRatio,
      adjustment,
    };
  }

  /**
   * Generate premium quote
   */
  static generateQuote(
    quoteId: string,
    coverages: CoveragePricing[],
    globalModifiers?: RateModifier[],
    currency: string = this.DEFAULT_CURRENCY
  ): {
    quoteId: string;
    calculation: PremiumCalculation;
    generatedAt: Date;
    expiresAt: Date;
  } {
    const calculation = this.calculateTotalPremium(coverages, globalModifiers, currency);
    const generatedAt = new Date();
    const expiresAt = new Date(generatedAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    logger.debug(LOG_CATEGORIES.DATA, 'Premium quote generated', {
      quoteId,
      baseTotal: calculation.baseTotal,
      modifiedTotal: calculation.modifiedTotal,
      coverageCount: coverages.length,
    });

    return {
      quoteId,
      calculation,
      generatedAt,
      expiresAt,
    };
  }

  /**
   * Compare premiums
   */
  static comparePremiums(
    quote1: PremiumCalculation,
    quote2: PremiumCalculation
  ): {
    difference: number;
    percentChange: number;
    cheaper: 'quote1' | 'quote2';
  } {
    const difference = quote2.modifiedTotal - quote1.modifiedTotal;
    const percentChange = (difference / quote1.modifiedTotal) * 100;

    return {
      difference,
      percentChange,
      cheaper: difference < 0 ? 'quote2' : 'quote1',
    };
  }
}

export default PremiumCalculator;

