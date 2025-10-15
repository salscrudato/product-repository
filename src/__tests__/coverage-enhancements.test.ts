/**
 * Coverage Enhancements Test Suite
 * Tests for Phase 1-3 coverage data model enhancements
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  Coverage,
  CoverageLimit,
  CoverageDeductible,
  CoverageExclusion,
  CoverageCondition,
  LimitType,
  DeductibleType,
  ExclusionType,
  ConditionType,
  CoverageTrigger,
  ValuationMethod,
  DepreciationMethod,
  TerritoryType,
  EndorsementType,
} from '../types';

describe('Coverage Type Definitions', () => {
  it('should create a valid CoverageLimit', () => {
    const limit: CoverageLimit = {
      id: 'limit-1',
      coverageId: 'cov-1',
      productId: 'prod-1',
      limitType: 'perOccurrence',
      amount: 1000000,
      displayValue: '$1,000,000',
      isDefault: true,
      isRequired: true,
    };

    expect(limit.limitType).toBe('perOccurrence');
    expect(limit.amount).toBe(1000000);
    expect(limit.isDefault).toBe(true);
  });

  it('should create a valid CoverageDeductible', () => {
    const deductible: CoverageDeductible = {
      id: 'ded-1',
      coverageId: 'cov-1',
      productId: 'prod-1',
      deductibleType: 'percentage',
      amount: 10,
      displayValue: '10%',
      isDefault: true,
    };

    expect(deductible.deductibleType).toBe('percentage');
    expect(deductible.amount).toBe(10);
  });

  it('should create a valid CoverageExclusion', () => {
    const exclusion: CoverageExclusion = {
      id: 'exc-1',
      name: 'War and Military Action',
      type: 'absolute',
      description: 'Coverage does not apply to war, invasion, or military action',
      isStandard: true,
    };

    expect(exclusion.type).toBe('absolute');
    expect(exclusion.isStandard).toBe(true);
  });

  it('should create a valid CoverageCondition', () => {
    const condition: CoverageCondition = {
      id: 'cond-1',
      name: 'Prompt Notice',
      type: 'duties',
      description: 'Insured must provide prompt notice of loss',
      isRequired: true,
      isSuspending: false,
    };

    expect(condition.type).toBe('duties');
    expect(condition.isRequired).toBe(true);
    expect(condition.isSuspending).toBe(false);
  });
});

describe('Enhanced Coverage Interface', () => {
  it('should create a coverage with Phase 1 fields', () => {
    const coverage: Partial<Coverage> = {
      name: 'General Liability',
      coverageCode: 'GL-001',
      category: 'Base Coverage',
      exclusions: [
        {
          id: 'exc-1',
          name: 'Intentional Acts',
          type: 'absolute',
          description: 'Intentional acts are excluded',
          isStandard: true,
        },
      ],
      conditions: [
        {
          id: 'cond-1',
          name: 'Cooperation',
          type: 'duties',
          description: 'Insured must cooperate with investigation',
          isRequired: true,
          isSuspending: false,
        },
      ],
    };

    expect(coverage.exclusions).toHaveLength(1);
    expect(coverage.conditions).toHaveLength(1);
    expect(coverage.exclusions![0].type).toBe('absolute');
  });

  it('should create a coverage with Phase 2 fields', () => {
    const coverage: Partial<Coverage> = {
      name: 'Property Coverage',
      coverageCode: 'PROP-001',
      basePremium: 5000,
      premiumBasis: 'perThousand',
      coinsurancePercentage: 80,
      hasCoinsurancePenalty: true,
      coverageTrigger: 'occurrence',
      waitingPeriod: 30,
      waitingPeriodUnit: 'days',
      valuationMethod: 'RC',
      depreciationMethod: 'straightLine',
    };

    expect(coverage.basePremium).toBe(5000);
    expect(coverage.coinsurancePercentage).toBe(80);
    expect(coverage.coverageTrigger).toBe('occurrence');
    expect(coverage.valuationMethod).toBe('RC');
  });

  it('should create a coverage with Phase 3 fields', () => {
    const coverage: Partial<Coverage> = {
      name: 'Professional Liability',
      coverageCode: 'PL-001',
      requiresUnderwriterApproval: true,
      eligibilityCriteria: [
        'Must have 5+ years experience',
        'No prior claims in last 3 years',
      ],
      requiredCoverages: ['GL-001'],
      incompatibleCoverages: ['WC-001'],
      claimsReportingPeriod: 60,
      hasSubrogationRights: true,
      territoryType: 'USA',
      modifiesCoverageId: 'BASE-001',
      endorsementType: 'broadening',
    };

    expect(coverage.requiresUnderwriterApproval).toBe(true);
    expect(coverage.eligibilityCriteria).toHaveLength(2);
    expect(coverage.territoryType).toBe('USA');
    expect(coverage.endorsementType).toBe('broadening');
  });
});

describe('Enum Types', () => {
  it('should validate LimitType values', () => {
    const validTypes: LimitType[] = [
      'perOccurrence',
      'aggregate',
      'perPerson',
      'perLocation',
      'sublimit',
      'combined',
      'split',
    ];

    validTypes.forEach(type => {
      const limit: Partial<CoverageLimit> = { limitType: type };
      expect(limit.limitType).toBe(type);
    });
  });

  it('should validate DeductibleType values', () => {
    const validTypes: DeductibleType[] = [
      'flat',
      'percentage',
      'franchise',
      'disappearing',
      'perOccurrence',
      'aggregate',
      'waiting',
    ];

    validTypes.forEach(type => {
      const deductible: Partial<CoverageDeductible> = { deductibleType: type };
      expect(deductible.deductibleType).toBe(type);
    });
  });

  it('should validate ExclusionType values', () => {
    const validTypes: ExclusionType[] = [
      'named',
      'general',
      'conditional',
      'absolute',
      'buyback',
    ];

    validTypes.forEach(type => {
      const exclusion: Partial<CoverageExclusion> = { type };
      expect(exclusion.type).toBe(type);
    });
  });

  it('should validate ConditionType values', () => {
    const validTypes: ConditionType[] = [
      'eligibility',
      'claims',
      'duties',
      'general',
      'suspension',
      'cancellation',
    ];

    validTypes.forEach(type => {
      const condition: Partial<CoverageCondition> = { type };
      expect(condition.type).toBe(type);
    });
  });

  it('should validate CoverageTrigger values', () => {
    const validTriggers: CoverageTrigger[] = [
      'occurrence',
      'claimsMade',
      'hybrid',
    ];

    validTriggers.forEach(trigger => {
      const coverage: Partial<Coverage> = { coverageTrigger: trigger };
      expect(coverage.coverageTrigger).toBe(trigger);
    });
  });

  it('should validate ValuationMethod values', () => {
    const validMethods: ValuationMethod[] = [
      'ACV',
      'RC',
      'agreedValue',
      'marketValue',
      'functionalRC',
      'statedAmount',
    ];

    validMethods.forEach(method => {
      const coverage: Partial<Coverage> = { valuationMethod: method };
      expect(coverage.valuationMethod).toBe(method);
    });
  });

  it('should validate DepreciationMethod values', () => {
    const validMethods: DepreciationMethod[] = [
      'straightLine',
      'decliningBalance',
      'unitsOfProduction',
      'sumOfYearsDigits',
    ];

    validMethods.forEach(method => {
      const coverage: Partial<Coverage> = { depreciationMethod: method };
      expect(coverage.depreciationMethod).toBe(method);
    });
  });

  it('should validate TerritoryType values', () => {
    const validTypes: TerritoryType[] = [
      'worldwide',
      'USA',
      'stateSpecific',
      'custom',
    ];

    validTypes.forEach(type => {
      const coverage: Partial<Coverage> = { territoryType: type };
      expect(coverage.territoryType).toBe(type);
    });
  });

  it('should validate EndorsementType values', () => {
    const validTypes: EndorsementType[] = [
      'broadening',
      'restrictive',
      'clarifying',
      'additional',
    ];

    validTypes.forEach(type => {
      const coverage: Partial<Coverage> = { endorsementType: type };
      expect(coverage.endorsementType).toBe(type);
    });
  });
});

describe('Backward Compatibility', () => {
  it('should support deprecated limits array', () => {
    const coverage: Partial<Coverage> = {
      name: 'Test Coverage',
      limits: ['$1,000,000 per occurrence', '$2,000,000 aggregate'],
    };

    expect(coverage.limits).toHaveLength(2);
    expect(coverage.limits![0]).toBe('$1,000,000 per occurrence');
  });

  it('should support deprecated deductibles array', () => {
    const coverage: Partial<Coverage> = {
      name: 'Test Coverage',
      deductibles: ['$1,000 flat', '10% of loss'],
    };

    expect(coverage.deductibles).toHaveLength(2);
    expect(coverage.deductibles![0]).toBe('$1,000 flat');
  });

  it('should allow both old and new formats simultaneously', () => {
    const coverage: Partial<Coverage> = {
      name: 'Test Coverage',
      limits: ['$1,000,000 per occurrence'], // Old format
      exclusions: [
        {
          id: 'exc-1',
          name: 'War',
          type: 'absolute',
          description: 'War exclusion',
          isStandard: true,
        },
      ], // New format
    };

    expect(coverage.limits).toBeDefined();
    expect(coverage.exclusions).toBeDefined();
  });
});

describe('Complex Coverage Scenarios', () => {
  it('should create a comprehensive property coverage', () => {
    const coverage: Partial<Coverage> = {
      name: 'Commercial Property',
      coverageCode: 'CP-001',
      category: 'Base Coverage',
      description: 'Covers direct physical loss to commercial property',
      basePremium: 10000,
      premiumBasis: 'perThousand',
      coinsurancePercentage: 80,
      hasCoinsurancePenalty: true,
      coverageTrigger: 'occurrence',
      valuationMethod: 'RC',
      depreciationMethod: 'straightLine',
      territoryType: 'USA',
      exclusions: [
        {
          id: 'exc-1',
          name: 'Flood',
          type: 'named',
          description: 'Flood damage is excluded',
          isStandard: true,
        },
        {
          id: 'exc-2',
          name: 'Earthquake',
          type: 'buyback',
          description: 'Earthquake damage (can be bought back)',
          isStandard: false,
        },
      ],
      conditions: [
        {
          id: 'cond-1',
          name: 'Vacancy Clause',
          type: 'suspension',
          description: 'Coverage suspended if property vacant > 60 days',
          isRequired: true,
          isSuspending: true,
        },
      ],
    };

    expect(coverage.coinsurancePercentage).toBe(80);
    expect(coverage.exclusions).toHaveLength(2);
    expect(coverage.conditions![0].isSuspending).toBe(true);
  });

  it('should create a comprehensive endorsement coverage', () => {
    const coverage: Partial<Coverage> = {
      name: 'Equipment Breakdown',
      coverageCode: 'EB-001',
      category: 'Endorsement Coverage',
      modifiesCoverageId: 'CP-001',
      endorsementType: 'additional',
      basePremium: 2500,
      requiresUnderwriterApproval: true,
      eligibilityCriteria: [
        'Equipment must be less than 10 years old',
        'Regular maintenance records required',
      ],
      requiredCoverages: ['CP-001'],
      claimsReportingPeriod: 30,
      hasSubrogationRights: true,
      territoryType: 'USA',
    };

    expect(coverage.endorsementType).toBe('additional');
    expect(coverage.modifiesCoverageId).toBe('CP-001');
    expect(coverage.requiresUnderwriterApproval).toBe(true);
    expect(coverage.eligibilityCriteria).toHaveLength(2);
  });
});

