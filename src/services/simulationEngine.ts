/**
 * Simulation Engine
 * Deterministic rule evaluation and pricing calculation with trace
 */

import { z } from 'zod';
import logger, { LOG_CATEGORIES } from '../utils/logger';

// Trace entry for debugging
export interface TraceEntry {
  id: string;
  timestamp: number;
  type: 'rule' | 'calculation' | 'lookup' | 'condition' | 'result';
  name: string;
  input: Record<string, unknown>;
  output: unknown;
  duration: number;
  passed?: boolean;
  message?: string;
}

// Simulation context
export interface SimulationContext {
  productId: string;
  productName: string;
  state: string;
  effectiveDate: string;
  coverages: {
    id: string;
    name: string;
    selected: boolean;
    limit?: number;
    deductible?: number;
  }[];
  exposures: Record<string, number | string | boolean>;
  ratingFactors: Record<string, number>;
}

// Simulation result
export interface SimulationResult {
  success: boolean;
  premium: {
    base: number;
    adjustments: { name: string; amount: number; factor?: number }[];
    fees: { name: string; amount: number }[];
    taxes: { name: string; amount: number; rate: number }[];
    total: number;
  };
  coveragePremiums: {
    coverageId: string;
    coverageName: string;
    basePremium: number;
    adjustedPremium: number;
  }[];
  trace: TraceEntry[];
  errors: string[];
  warnings: string[];
  executionTime: number;
}

// Rule definition
export interface Rule {
  id: string;
  name: string;
  type: 'eligibility' | 'rating' | 'validation' | 'calculation';
  condition?: string;
  action: string;
  priority: number;
}

/**
 * Simulation Engine Class
 */
export class SimulationEngine {
  private trace: TraceEntry[] = [];
  private traceId = 0;
  
  constructor(private context: SimulationContext) {}
  
  /**
   * Add trace entry
   */
  private addTrace(
    type: TraceEntry['type'],
    name: string,
    input: Record<string, unknown>,
    output: unknown,
    duration: number,
    options?: { passed?: boolean; message?: string }
  ): void {
    this.trace.push({
      id: `trace-${++this.traceId}`,
      timestamp: Date.now(),
      type,
      name,
      input,
      output,
      duration,
      ...options,
    });
  }
  
  /**
   * Evaluate a condition expression
   */
  evaluateCondition(condition: string, variables: Record<string, unknown>): boolean {
    const start = performance.now();
    
    try {
      // Simple expression evaluator (in production, use a proper parser)
      const safeEval = new Function(
        ...Object.keys(variables),
        `return ${condition}`
      );
      const result = safeEval(...Object.values(variables));
      
      this.addTrace('condition', condition, variables, result, performance.now() - start, {
        passed: Boolean(result),
      });
      
      return Boolean(result);
    } catch (error) {
      this.addTrace('condition', condition, variables, false, performance.now() - start, {
        passed: false,
        message: (error as Error).message,
      });
      return false;
    }
  }
  
  /**
   * Evaluate rules and return applicable ones
   */
  evaluateRules(rules: Rule[], variables: Record<string, unknown>): Rule[] {
    const applicableRules: Rule[] = [];
    
    for (const rule of rules.sort((a, b) => a.priority - b.priority)) {
      const start = performance.now();
      
      if (!rule.condition || this.evaluateCondition(rule.condition, variables)) {
        applicableRules.push(rule);
        this.addTrace('rule', rule.name, { condition: rule.condition }, true, performance.now() - start, {
          passed: true,
        });
      } else {
        this.addTrace('rule', rule.name, { condition: rule.condition }, false, performance.now() - start, {
          passed: false,
        });
      }
    }
    
    return applicableRules;
  }
  
  /**
   * Calculate premium for a coverage
   */
  calculateCoveragePremium(
    coverageId: string,
    coverageName: string,
    baseRate: number,
    factors: Record<string, number>
  ): { basePremium: number; adjustedPremium: number } {
    const start = performance.now();
    
    const basePremium = baseRate;
    let adjustedPremium = basePremium;
    
    for (const [factorName, factorValue] of Object.entries(factors)) {
      adjustedPremium *= factorValue;
      this.addTrace('calculation', `${coverageName} - ${factorName}`, 
        { premium: adjustedPremium / factorValue, factor: factorValue },
        adjustedPremium,
        0
      );
    }
    
    this.addTrace('result', `${coverageName} Premium`, 
      { baseRate, factors },
      { basePremium, adjustedPremium },
      performance.now() - start
    );
    
    return { basePremium, adjustedPremium };
  }

  /**
   * Run full simulation
   */
  async runSimulation(
    rules: Rule[],
    baseRates: Record<string, number>
  ): Promise<SimulationResult> {
    const startTime = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Build variables from context
      const variables: Record<string, unknown> = {
        state: this.context.state,
        effectiveDate: this.context.effectiveDate,
        ...this.context.exposures,
        ...this.context.ratingFactors,
      };

      // Evaluate eligibility rules
      const eligibilityRules = rules.filter(r => r.type === 'eligibility');
      const passedEligibility = this.evaluateRules(eligibilityRules, variables);

      if (passedEligibility.length < eligibilityRules.length) {
        const failedRules = eligibilityRules.filter(r => !passedEligibility.includes(r));
        errors.push(...failedRules.map(r => `Eligibility failed: ${r.name}`));
      }

      // Calculate coverage premiums
      const coveragePremiums: SimulationResult['coveragePremiums'] = [];
      let totalBase = 0;
      let totalAdjusted = 0;

      for (const coverage of this.context.coverages.filter(c => c.selected)) {
        const baseRate = baseRates[coverage.id] || 100;
        const result = this.calculateCoveragePremium(
          coverage.id,
          coverage.name,
          baseRate,
          this.context.ratingFactors
        );

        coveragePremiums.push({
          coverageId: coverage.id,
          coverageName: coverage.name,
          ...result,
        });

        totalBase += result.basePremium;
        totalAdjusted += result.adjustedPremium;
      }

      // Calculate fees and taxes
      const fees = [
        { name: 'Policy Fee', amount: 25 },
        { name: 'Inspection Fee', amount: 15 },
      ];

      const taxRate = 0.03; // 3% tax
      const taxes = [
        { name: 'State Premium Tax', amount: totalAdjusted * taxRate, rate: taxRate },
      ];

      const feesTotal = fees.reduce((sum, f) => sum + f.amount, 0);
      const taxesTotal = taxes.reduce((sum, t) => sum + t.amount, 0);

      const result: SimulationResult = {
        success: errors.length === 0,
        premium: {
          base: totalBase,
          adjustments: [],
          fees,
          taxes,
          total: totalAdjusted + feesTotal + taxesTotal,
        },
        coveragePremiums,
        trace: this.trace,
        errors,
        warnings,
        executionTime: performance.now() - startTime,
      };

      logger.info(LOG_CATEGORIES.PERFORMANCE, 'Simulation completed', {
        productId: this.context.productId,
        totalPremium: result.premium.total,
        executionTime: result.executionTime,
        traceEntries: this.trace.length,
      });

      return result;
    } catch (error) {
      logger.error(LOG_CATEGORIES.PERFORMANCE, 'Simulation failed', {
        productId: this.context.productId,
      }, error as Error);

      return {
        success: false,
        premium: { base: 0, adjustments: [], fees: [], taxes: [], total: 0 },
        coveragePremiums: [],
        trace: this.trace,
        errors: [(error as Error).message],
        warnings,
        executionTime: performance.now() - startTime,
      };
    }
  }

  /**
   * Get trace entries
   */
  getTrace(): TraceEntry[] {
    return this.trace;
  }

  /**
   * Clear trace
   */
  clearTrace(): void {
    this.trace = [];
    this.traceId = 0;
  }
}

/**
 * Create and run a simulation
 */
export async function runPricingSimulation(
  context: SimulationContext,
  rules: Rule[],
  baseRates: Record<string, number>
): Promise<SimulationResult> {
  const engine = new SimulationEngine(context);
  return engine.runSimulation(rules, baseRates);
}

