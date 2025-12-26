/**
 * Rating Calculation Web Worker
 * Offloads heavy rating computations from the main thread
 */

// Type definitions for worker messages
export interface RatingWorkerInput {
  type: 'CALCULATE_RATING' | 'CALCULATE_ILF' | 'CALCULATE_EXPERIENCE_MOD' | 'CALCULATE_SCHEDULE_RATING' | 'BATCH_CALCULATE';
  payload: RatingCalculationPayload | ILFCalculationPayload | ExperienceModPayload | ScheduleRatingPayload | BatchCalculationPayload;
  requestId: string;
}

export interface RatingCalculationPayload {
  productId: string;
  state: string;
  coverageSelections: CoverageSelection[];
  riskFactors: Record<string, number>;
  baseRates: BaseRate[];
  ratingSteps: RatingStep[];
  applyScheduleRating?: boolean;
  applyExperienceMod?: boolean;
}

export interface ILFCalculationPayload {
  basicLimit: number;
  selectedLimit: number;
  lineOfBusiness: string;
  state: string;
  ilfTable: ILFTableEntry[];
  basePremium: number;
}

export interface ExperienceModPayload {
  classCode: string;
  payroll: number;
  lossHistory: LossRecord[];
  state: string;
  expectedLossRate: number;
  splitPointTable: SplitPointEntry[];
}

export interface ScheduleRatingPayload {
  basePremium: number;
  assessments: Record<string, { value: number; reason: string }>;
  categories: ScheduleCategory[];
}

export interface BatchCalculationPayload {
  calculations: RatingCalculationPayload[];
}

interface CoverageSelection {
  coverageId: string;
  limit: number;
  deductible?: number;
  selected: boolean;
}

interface BaseRate {
  coverageId: string;
  rate: number;
  basis: string;
}

interface RatingStep {
  id: string;
  type: 'BaseRate' | 'Multiply' | 'Add' | 'Subtract' | 'Lookup' | 'Conditional' | 'ILF' | 'ExpMod';
  config: Record<string, unknown>;
  order: number;
}

interface ILFTableEntry {
  limit: number;
  factor: number;
}

interface LossRecord {
  year: number;
  paidLoss: number;
  incurredLoss: number;
  claimCount: number;
}

interface SplitPointEntry {
  expectedLosses: number;
  splitPoint: number;
}

interface ScheduleCategory {
  name: string;
  maxCredit: number;
  maxDebit: number;
}

// Rating calculation logic
function calculateRating(payload: RatingCalculationPayload): { premium: number; breakdown: Record<string, number>; steps: { step: string; result: number }[] } {
  let premium = 0;
  const breakdown: Record<string, number> = {};
  const steps: { step: string; result: number }[] = [];

  // Process each coverage
  for (const coverage of payload.coverageSelections.filter(c => c.selected)) {
    const baseRate = payload.baseRates.find(r => r.coverageId === coverage.coverageId);
    if (!baseRate) continue;

    let coveragePremium = baseRate.rate;
    steps.push({ step: `Base rate for ${coverage.coverageId}`, result: coveragePremium });

    // Apply rating steps in order
    const sortedSteps = [...payload.ratingSteps].sort((a, b) => a.order - b.order);
    
    for (const step of sortedSteps) {
      switch (step.type) {
        case 'Multiply':
          const multiplier = payload.riskFactors[step.config.factorKey as string] || 1;
          coveragePremium *= multiplier;
          steps.push({ step: `Apply ${step.config.factorKey} (${multiplier})`, result: coveragePremium });
          break;
          
        case 'Add':
          const addend = Number(step.config.value) || 0;
          coveragePremium += addend;
          steps.push({ step: `Add ${step.config.label || 'fee'}`, result: coveragePremium });
          break;
          
        case 'Lookup':
          // Table lookup logic
          const lookupValue = payload.riskFactors[step.config.lookupKey as string];
          if (lookupValue !== undefined) {
            coveragePremium *= lookupValue;
            steps.push({ step: `Table lookup: ${step.config.lookupKey}`, result: coveragePremium });
          }
          break;
          
        case 'Conditional':
          // Conditional logic
          const condition = evaluateCondition(step.config.condition as string, payload.riskFactors);
          if (condition) {
            const adjustment = Number(step.config.adjustment) || 0;
            coveragePremium *= (1 + adjustment / 100);
            steps.push({ step: `Conditional: ${step.config.label}`, result: coveragePremium });
          }
          break;
      }
    }

    breakdown[coverage.coverageId] = Math.round(coveragePremium * 100) / 100;
    premium += coveragePremium;
  }

  return {
    premium: Math.round(premium * 100) / 100,
    breakdown,
    steps,
  };
}

function evaluateCondition(condition: string, factors: Record<string, number>): boolean {
  // Simple condition evaluation (can be enhanced)
  try {
    const parts = condition.split(' ');
    if (parts.length === 3) {
      const [key, operator, value] = parts;
      const factorValue = factors[key];
      if (factorValue === undefined) return false;
      
      switch (operator) {
        case '>': return factorValue > Number(value);
        case '<': return factorValue < Number(value);
        case '>=': return factorValue >= Number(value);
        case '<=': return factorValue <= Number(value);
        case '==': return factorValue === Number(value);
        default: return false;
      }
    }
  } catch {
    return false;
  }
  return false;
}

// ILF calculation
function calculateILF(payload: ILFCalculationPayload): { ilf: number; basicLimitPremium: number; increasedLimitPremium: number } {
  const { basicLimit, selectedLimit, ilfTable, basePremium } = payload;

  const basicFactor = interpolateFactor(ilfTable, basicLimit);
  const selectedFactor = interpolateFactor(ilfTable, selectedLimit);
  const ilf = selectedFactor / basicFactor;

  return {
    ilf,
    basicLimitPremium: basePremium,
    increasedLimitPremium: Math.round(basePremium * ilf * 100) / 100,
  };
}

function interpolateFactor(table: ILFTableEntry[], limit: number): number {
  const sorted = [...table].sort((a, b) => a.limit - b.limit);
  const exact = sorted.find(e => e.limit === limit);
  if (exact) return exact.factor;

  // Find surrounding entries for interpolation
  const lower = sorted.filter(e => e.limit < limit).pop();
  const upper = sorted.find(e => e.limit > limit);

  if (!lower) return upper?.factor || 1;
  if (!upper) return lower.factor;

  // Linear interpolation
  const ratio = (limit - lower.limit) / (upper.limit - lower.limit);
  return lower.factor + ratio * (upper.factor - lower.factor);
}

// Experience modification calculation (NCCI-style)
function calculateExperienceMod(payload: ExperienceModPayload): {
  experienceMod: number;
  expectedLosses: number;
  actualPrimary: number;
  ballast: number;
  splitPoint: number;
} {
  const { payroll, lossHistory, expectedLossRate, splitPointTable } = payload;

  // Calculate expected losses
  const expectedLosses = (payroll / 100) * expectedLossRate;

  // Get split point
  const splitPoint = getSplitPoint(expectedLosses, splitPointTable);

  // Split actual losses into primary and excess
  let actualPrimary = 0;
  let actualExcess = 0;

  for (const loss of lossHistory) {
    const primaryLoss = Math.min(loss.incurredLoss, splitPoint);
    actualPrimary += primaryLoss;
    actualExcess += Math.max(0, loss.incurredLoss - splitPoint);
  }

  // Calculate ballast (weighting) value
  const ballast = expectedLosses * 0.07; // Simplified ballast

  // Expected primary losses
  const expectedPrimary = expectedLosses * 0.70; // Primary ratio (simplified)

  // Calculate mod
  const excessWeight = 0.30; // Excess losses weighted at 30%
  const stabilizing = ballast + expectedPrimary;

  const mod = (actualPrimary + (actualExcess * excessWeight) + stabilizing) /
              (expectedPrimary + stabilizing);

  // Cap the mod (typically between 0.75 and 2.0)
  const cappedMod = Math.max(0.75, Math.min(2.0, mod));

  return {
    experienceMod: Math.round(cappedMod * 100) / 100,
    expectedLosses: Math.round(expectedLosses),
    actualPrimary: Math.round(actualPrimary),
    ballast: Math.round(ballast),
    splitPoint,
  };
}

function getSplitPoint(expectedLosses: number, table: SplitPointEntry[]): number {
  const sorted = [...table].sort((a, b) => a.expectedLosses - b.expectedLosses);
  const entry = sorted.find(e => expectedLosses <= e.expectedLosses);
  return entry?.splitPoint || sorted[sorted.length - 1]?.splitPoint || 5000;
}

// Schedule rating calculation
function calculateScheduleRating(payload: ScheduleRatingPayload): {
  totalScheduleCredit: number;
  appliedCredits: { category: string; credit: number; justification: string }[];
  modifiedPremium: number;
} {
  const { basePremium, assessments, categories } = payload;

  let totalModification = 0;
  const appliedCredits: { category: string; credit: number; justification: string }[] = [];

  for (const category of categories) {
    const assessment = assessments[category.name];
    if (assessment) {
      // Ensure credit is within bounds
      const credit = Math.max(category.maxCredit, Math.min(category.maxDebit, assessment.value));
      totalModification += credit;
      appliedCredits.push({
        category: category.name,
        credit,
        justification: assessment.reason,
      });
    }
  }

  return {
    totalScheduleCredit: totalModification,
    appliedCredits,
    modifiedPremium: Math.round(basePremium * (1 + totalModification / 100) * 100) / 100,
  };
}

// Batch calculation
function batchCalculate(payload: BatchCalculationPayload) {
  return payload.calculations.map(calc => calculateRating(calc));
}

// Worker message handler
self.onmessage = (event: MessageEvent<RatingWorkerInput>) => {
  const { type, payload, requestId } = event.data;

  try {
    let result: unknown;

    switch (type) {
      case 'CALCULATE_RATING':
        result = calculateRating(payload as RatingCalculationPayload);
        break;
      case 'CALCULATE_ILF':
        result = calculateILF(payload as ILFCalculationPayload);
        break;
      case 'CALCULATE_EXPERIENCE_MOD':
        result = calculateExperienceMod(payload as ExperienceModPayload);
        break;
      case 'CALCULATE_SCHEDULE_RATING':
        result = calculateScheduleRating(payload as ScheduleRatingPayload);
        break;
      case 'BATCH_CALCULATE':
        result = batchCalculate(payload as BatchCalculationPayload);
        break;
      default:
        throw new Error(`Unknown calculation type: ${type}`);
    }

    self.postMessage({
      type: 'SUCCESS',
      requestId,
      result,
    });
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export {};

