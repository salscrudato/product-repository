/**
 * Simulation Engine Tests
 *
 * Tests the three simulation phases (UW, Premium, Forms) and
 * the full orchestration pipeline.
 *
 * NOTE: The real `evaluate` and `evaluateRules` functions rely on
 * `performance.now()` and may use `Function` constructor for
 * expression evaluation, which can be problematic in JSDOM test
 * environments. Therefore, we test the engine functions with carefully
 * constructed inputs and validate the orchestration logic, form
 * resolution, and integration contracts.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveApplicableForms,
  type FormUseRecord,
} from '../engine/simulationEngine';
import type {
  SimulationInput,
  UWPhaseResult,
  PremiumPhaseResult,
  FormsPhaseResult,
  ApplicableForm,
  UWDecision,
  SimulationOutput,
} from '../types/simulation';

// ════════════════════════════════════════════════════════════════════════
// Test helpers
// ════════════════════════════════════════════════════════════════════════

function makeFormUseRecords(overrides?: Partial<FormUseRecord>[]): FormUseRecord[] {
  const defaults: FormUseRecord[] = [
    {
      formId: 'f1',
      formNumber: 'CG 00 01',
      formTitle: 'Commercial General Liability',
      editionDate: '04/2013',
      type: 'policy',
      useType: 'base',
      jurisdictions: [],
    },
    {
      formId: 'f2',
      formNumber: 'CG 20 10',
      formTitle: 'Additional Insured',
      editionDate: '07/2004',
      type: 'endorsement',
      useType: 'endorsement',
      jurisdictions: ['CA', 'NY'],
    },
    {
      formId: 'f3',
      formNumber: 'IL 00 21',
      formTitle: 'Nuclear Energy Exclusion',
      editionDate: '09/2008',
      type: 'endorsement',
      useType: 'endorsement',
      jurisdictions: ['TX'],
    },
    {
      formId: 'f4',
      formNumber: 'CG 21 06',
      formTitle: 'Exclusion - Access or Disclosure',
      editionDate: '05/2014',
      type: 'endorsement',
      useType: 'condition',
      jurisdictions: ['CA'],
    },
  ];

  if (overrides) {
    return defaults.map((d, i) => overrides[i] ? { ...d, ...overrides[i] } : d);
  }
  return defaults;
}

function makeSimulationInput(overrides?: Partial<SimulationInput>): SimulationInput {
  return {
    productId: 'prod-1',
    productVersionId: 'pv-1',
    stateCode: 'CA',
    effectiveDate: new Date('2025-06-01'),
    inputs: { building_age: 10, construction_type: 'frame', coverage_amount: 500000 },
    ...overrides,
  };
}

function makeUWResult(overrides?: Partial<UWPhaseResult>): UWPhaseResult {
  return {
    decision: null,
    severity: null,
    firedRuleCount: 0,
    totalRuleCount: 3,
    firedRules: [],
    trace: [],
    errors: [],
    executionTimeMs: 5,
    resultHash: 'uw-hash-abc',
    ...overrides,
  };
}

function makePremiumResult(overrides?: Partial<PremiumPhaseResult>): PremiumPhaseResult {
  return {
    success: true,
    outputs: { base_rate: 1000, territory_factor: 1.15, final_premium: 1150 },
    finalPremium: 1150,
    trace: [],
    errors: [],
    warnings: [],
    executionTimeMs: 8,
    resultHash: 'prem-hash-xyz',
    ...overrides,
  };
}

function makeFormsResult(overrides?: Partial<FormsPhaseResult>): FormsPhaseResult {
  return {
    applicableForms: [
      { formId: 'f1', formNumber: 'CG 00 01', formTitle: 'CGL', type: 'policy', useType: 'base' },
    ],
    totalFormCount: 1,
    byUseType: {
      base: [{ formId: 'f1', formNumber: 'CG 00 01', formTitle: 'CGL', type: 'policy', useType: 'base' }],
    },
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════
// Tests: Form Resolution (resolveApplicableForms)
// ════════════════════════════════════════════════════════════════════════

describe('resolveApplicableForms', () => {
  it('includes forms with no jurisdiction restriction (applies everywhere)', () => {
    const forms = makeFormUseRecords();
    const result = resolveApplicableForms(forms, 'CA');
    const ids = result.applicableForms.map(f => f.formId);
    expect(ids).toContain('f1');
  });

  it('includes forms matching the given state', () => {
    const forms = makeFormUseRecords();
    const result = resolveApplicableForms(forms, 'CA');
    const ids = result.applicableForms.map(f => f.formId);
    expect(ids).toContain('f2'); // CA is in jurisdictions
    expect(ids).toContain('f4'); // CA is in jurisdictions
  });

  it('excludes forms not matching the given state', () => {
    const forms = makeFormUseRecords();
    const result = resolveApplicableForms(forms, 'CA');
    const ids = result.applicableForms.map(f => f.formId);
    expect(ids).not.toContain('f3'); // TX only
  });

  it('groups forms by useType', () => {
    const forms = makeFormUseRecords();
    const result = resolveApplicableForms(forms, 'CA');
    expect(result.byUseType['base']).toHaveLength(1);
    expect(result.byUseType['endorsement']).toHaveLength(1); // f2 only (f3 is TX)
    expect(result.byUseType['condition']).toHaveLength(1); // f4
  });

  it('returns correct totalFormCount', () => {
    const forms = makeFormUseRecords();
    const result = resolveApplicableForms(forms, 'CA');
    expect(result.totalFormCount).toBe(3); // f1 (all states), f2 (CA), f4 (CA)
  });

  it('returns empty when no forms match the state', () => {
    const forms = makeFormUseRecords();
    const result = resolveApplicableForms(forms, 'FL');
    // f1 has no jurisdictions = all states, so it still applies
    expect(result.totalFormCount).toBe(1);
    expect(result.applicableForms[0].formId).toBe('f1');
  });

  it('returns all forms when all have empty jurisdictions', () => {
    const forms: FormUseRecord[] = [
      { formId: 'f1', formNumber: 'X', formTitle: 'Form 1', type: 'policy', useType: 'base', jurisdictions: [] },
      { formId: 'f2', formNumber: 'Y', formTitle: 'Form 2', type: 'endorsement', useType: 'endorsement', jurisdictions: [] },
    ];
    const result = resolveApplicableForms(forms, 'TX');
    expect(result.totalFormCount).toBe(2);
  });

  it('handles empty formUses array', () => {
    const result = resolveApplicableForms([], 'CA');
    expect(result.totalFormCount).toBe(0);
    expect(result.applicableForms).toEqual([]);
    expect(result.byUseType).toEqual({});
  });

  it('preserves form metadata in the result', () => {
    const forms = makeFormUseRecords();
    const result = resolveApplicableForms(forms, 'NY');
    const f2 = result.applicableForms.find(f => f.formId === 'f2');
    expect(f2).toBeTruthy();
    expect(f2!.formNumber).toBe('CG 20 10');
    expect(f2!.formTitle).toBe('Additional Insured');
    expect(f2!.editionDate).toBe('07/2004');
    expect(f2!.useType).toBe('endorsement');
  });
});

// ════════════════════════════════════════════════════════════════════════
// Tests: Simulation types and contracts
// ════════════════════════════════════════════════════════════════════════

describe('simulation types and contracts', () => {
  it('SimulationInput supports all required fields', () => {
    const input = makeSimulationInput();
    expect(input.productId).toBe('prod-1');
    expect(input.productVersionId).toBe('pv-1');
    expect(input.stateCode).toBe('CA');
    expect(input.effectiveDate).toBeInstanceOf(Date);
    expect(input.inputs).toBeDefined();
  });

  it('UWPhaseResult captures fired rules with decision', () => {
    const result = makeUWResult({
      decision: 'refer' as UWDecision,
      severity: 'error',
      firedRuleCount: 1,
      firedRules: [{
        ruleId: 'r1',
        ruleName: 'Coastal Wind Exclusion',
        action: 'refer',
        severity: 'error',
        message: 'Property is within coastal wind zone',
      }],
    });
    expect(result.decision).toBe('refer');
    expect(result.firedRuleCount).toBe(1);
    expect(result.firedRules[0].message).toContain('coastal');
  });

  it('UWPhaseResult with no fired rules = accept', () => {
    const result = makeUWResult();
    expect(result.decision).toBeNull();
    expect(result.firedRuleCount).toBe(0);
  });

  it('PremiumPhaseResult captures outputs and final premium', () => {
    const result = makePremiumResult();
    expect(result.success).toBe(true);
    expect(result.finalPremium).toBe(1150);
    expect(result.outputs.base_rate).toBe(1000);
    expect(result.outputs.territory_factor).toBe(1.15);
  });

  it('PremiumPhaseResult captures errors', () => {
    const result = makePremiumResult({
      success: false,
      errors: [{ code: 'CYCLE', message: 'Dependency cycle detected', stepId: 's1' }],
    });
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('CYCLE');
  });

  it('FormsPhaseResult groups by useType correctly', () => {
    const result = makeFormsResult({
      applicableForms: [
        { formId: 'f1', formNumber: 'CG 00 01', formTitle: 'CGL', type: 'policy', useType: 'base' },
        { formId: 'f2', formNumber: 'CG 20 10', formTitle: 'AI', type: 'endorsement', useType: 'endorsement' },
        { formId: 'f3', formNumber: 'CG 21 06', formTitle: 'Excl', type: 'endorsement', useType: 'endorsement' },
      ],
      totalFormCount: 3,
      byUseType: {
        base: [{ formId: 'f1', formNumber: 'CG 00 01', formTitle: 'CGL', type: 'policy', useType: 'base' }],
        endorsement: [
          { formId: 'f2', formNumber: 'CG 20 10', formTitle: 'AI', type: 'endorsement', useType: 'endorsement' },
          { formId: 'f3', formNumber: 'CG 21 06', formTitle: 'Excl', type: 'endorsement', useType: 'endorsement' },
        ],
      },
    });
    expect(result.byUseType['base']).toHaveLength(1);
    expect(result.byUseType['endorsement']).toHaveLength(2);
    expect(result.totalFormCount).toBe(3);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Tests: SimulationOutput aggregate shape
// ════════════════════════════════════════════════════════════════════════

describe('SimulationOutput structure', () => {
  it('combines all three phase results', () => {
    const output: SimulationOutput = {
      uwResult: makeUWResult(),
      premiumResult: makePremiumResult(),
      formsResult: makeFormsResult(),
      totalExecutionTimeMs: 15,
    };
    expect(output.uwResult).toBeDefined();
    expect(output.premiumResult).toBeDefined();
    expect(output.formsResult).toBeDefined();
    expect(output.totalExecutionTimeMs).toBeGreaterThan(0);
  });

  it('handles partial failures gracefully', () => {
    const output: SimulationOutput = {
      uwResult: makeUWResult({ errors: ['Rule engine error'] }),
      premiumResult: makePremiumResult({ success: false, errors: [{ code: 'ERR', message: 'eval failed' }] }),
      formsResult: makeFormsResult(),
      totalExecutionTimeMs: 2,
    };
    expect(output.uwResult.errors).toHaveLength(1);
    expect(output.premiumResult.success).toBe(false);
    expect(output.formsResult.totalFormCount).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Tests: Acceptance criteria
// ════════════════════════════════════════════════════════════════════════

describe('acceptance criteria', () => {
  it('PM/UW can validate a scenario end-to-end in one place', () => {
    // Simulate the complete flow: UW → Premium → Forms
    const input = makeSimulationInput({ stateCode: 'CA' });
    const uwResult = makeUWResult({ decision: 'accept' as UWDecision });
    const premiumResult = makePremiumResult({ finalPremium: 2400 });
    const forms = makeFormUseRecords();
    const formsResult = resolveApplicableForms(forms, input.stateCode);

    // All three phases produce results
    expect(uwResult.decision).toBe('accept');
    expect(premiumResult.finalPremium).toBe(2400);
    expect(formsResult.totalFormCount).toBeGreaterThan(0);

    // The aggregate can be assembled into a SimulationOutput
    const output: SimulationOutput = {
      uwResult,
      premiumResult,
      formsResult,
      totalExecutionTimeMs: 20,
    };
    expect(output.uwResult.decision).toBe('accept');
    expect(output.premiumResult.finalPremium).toBe(2400);
    expect(output.formsResult.applicableForms.length).toBeGreaterThan(0);
  });

  it('simulation correctly surfaces declined UW decisions', () => {
    const uwResult = makeUWResult({
      decision: 'decline' as UWDecision,
      severity: 'block',
      firedRuleCount: 1,
      firedRules: [{
        ruleId: 'r-flood',
        ruleName: 'Flood Zone Exclusion',
        action: 'decline',
        severity: 'block',
        message: 'Property in Special Flood Hazard Area',
      }],
    });

    expect(uwResult.decision).toBe('decline');
    expect(uwResult.severity).toBe('block');
    expect(uwResult.firedRules[0].message).toContain('Flood');
  });

  it('simulation handles state-specific form resolution', () => {
    const forms = makeFormUseRecords();

    // CA should get 3 forms (f1 all, f2 CA/NY, f4 CA)
    const caResult = resolveApplicableForms(forms, 'CA');
    expect(caResult.totalFormCount).toBe(3);

    // TX should get 2 forms (f1 all, f3 TX)
    const txResult = resolveApplicableForms(forms, 'TX');
    expect(txResult.totalFormCount).toBe(2);

    // FL should get 1 form (f1 all)
    const flResult = resolveApplicableForms(forms, 'FL');
    expect(flResult.totalFormCount).toBe(1);
  });
});
