/**
 * Versioning Utilities
 * Handles version snapshots with hashing, overlap detection, and comparison
 */

import crypto from 'crypto';
import { Coverage, CoverageLimit, CoverageDeductible, CoverageVersion } from '@types';

/**
 * Generate a hash of an object for change detection
 */
export function generateHash(obj: any): string {
  const json = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash('sha256').update(json).digest('hex').substring(0, 16);
}

/**
 * Version snapshot with subcollection hashes
 */
export interface VersionSnapshot {
  // Coverage data
  coverage: Partial<Coverage>;
  
  // Subcollection hashes for change detection
  limitsHash: string;
  deductiblesHash: string;
  
  // Metadata
  createdAt: Date;
  snapshotHash: string;
}

/**
 * Create a version snapshot with subcollection hashes
 */
export function createVersionSnapshot(
  coverage: Coverage,
  limits: CoverageLimit[] = [],
  deductibles: CoverageDeductible[] = []
): VersionSnapshot {
  const limitsHash = generateHash(limits);
  const deductiblesHash = generateHash(deductibles);
  
  const snapshot: VersionSnapshot = {
    coverage: {
      name: coverage.name,
      description: coverage.description,
      coverageCode: coverage.coverageCode,
      coverageType: coverage.coverageType,
      isOptional: coverage.isOptional,
      isPrimary: coverage.isPrimary,
      exclusions: coverage.exclusions,
      conditions: coverage.conditions,
      scopeOfCoverage: coverage.scopeOfCoverage,
      coverageTrigger: coverage.coverageTrigger,
      waitingPeriod: coverage.waitingPeriod,
      valuationMethod: coverage.valuationMethod,
      depreciationMethod: coverage.depreciationMethod,
      coinsurancePercentage: coverage.coinsurancePercentage,
      requiresUnderwriterApproval: coverage.requiresUnderwriterApproval,
      territoryType: coverage.territoryType,
      modifiesCoverageId: coverage.modifiesCoverageId,
      endorsementType: coverage.endorsementType,
      supersedes: coverage.supersedes,
      states: coverage.states
    },
    limitsHash,
    deductiblesHash,
    createdAt: new Date(),
    snapshotHash: ''
  };
  
  // Generate snapshot hash
  snapshot.snapshotHash = generateHash(snapshot);
  
  return snapshot;
}

/**
 * Overlap detection result
 */
export interface OverlapDetectionResult {
  hasOverlap: boolean;
  overlappingVersions: Array<{
    versionId: string;
    versionNumber: string;
    effectiveDate: Date;
    expirationDate?: Date;
  }>;
  message: string;
}

/**
 * Detect version date overlaps
 * Prevents multiple active versions for the same coverage at the same time
 */
export function detectVersionOverlaps(
  newEffectiveDate: Date,
  newExpirationDate: Date | undefined,
  existingVersions: CoverageVersion[]
): OverlapDetectionResult {
  const overlappingVersions: OverlapDetectionResult['overlappingVersions'] = [];
  
  for (const version of existingVersions) {
    const versionEffective = version.effectiveDate instanceof Date 
      ? version.effectiveDate 
      : version.effectiveDate.toDate();
    const versionExpiration = version.expirationDate 
      ? (version.expirationDate instanceof Date 
          ? version.expirationDate 
          : version.expirationDate.toDate())
      : null;
    
    // Check for overlap
    const newStart = newEffectiveDate;
    const newEnd = newExpirationDate || new Date('2099-12-31');
    const versionStart = versionEffective;
    const versionEnd = versionExpiration || new Date('2099-12-31');
    
    // Overlap occurs if: newStart < versionEnd AND newEnd > versionStart
    if (newStart < versionEnd && newEnd > versionStart) {
      overlappingVersions.push({
        versionId: version.id,
        versionNumber: version.versionNumber,
        effectiveDate: versionEffective,
        expirationDate: versionExpiration || undefined
      });
    }
  }
  
  return {
    hasOverlap: overlappingVersions.length > 0,
    overlappingVersions,
    message: overlappingVersions.length > 0
      ? `Found ${overlappingVersions.length} overlapping version(s). Please set an expiration date for existing versions or adjust dates.`
      : 'No overlaps detected'
  };
}

/**
 * Compare two version snapshots
 */
export interface VersionComparison {
  changedFields: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  limitsChanged: boolean;
  deductiblesChanged: boolean;
  summary: string;
}

export function compareVersionSnapshots(
  snapshot1: VersionSnapshot,
  snapshot2: VersionSnapshot
): VersionComparison {
  const changedFields: VersionComparison['changedFields'] = [];
  
  // Compare coverage fields
  const coverage1 = snapshot1.coverage;
  const coverage2 = snapshot2.coverage;
  
  const fieldsToCompare = [
    'name', 'description', 'coverageCode', 'coverageType',
    'isOptional', 'isPrimary', 'exclusions', 'conditions', 'scopeOfCoverage',
    'coverageTrigger', 'waitingPeriod', 'valuationMethod', 'depreciationMethod',
    'coinsurancePercentage', 'requiresUnderwriterApproval', 'territoryType',
    'modifiesCoverageId', 'endorsementType', 'supersedes', 'states'
  ];
  
  fieldsToCompare.forEach(field => {
    const val1 = (coverage1 as any)[field];
    const val2 = (coverage2 as any)[field];
    
    if (JSON.stringify(val1) !== JSON.stringify(val2)) {
      changedFields.push({
        field,
        oldValue: val1,
        newValue: val2
      });
    }
  });
  
  const limitsChanged = snapshot1.limitsHash !== snapshot2.limitsHash;
  const deductiblesChanged = snapshot1.deductiblesHash !== snapshot2.deductiblesHash;
  
  const changes = [
    changedFields.length > 0 ? `${changedFields.length} field(s)` : null,
    limitsChanged ? 'limits' : null,
    deductiblesChanged ? 'deductibles' : null
  ].filter(Boolean);
  
  return {
    changedFields,
    limitsChanged,
    deductiblesChanged,
    summary: changes.length > 0 
      ? `Changed: ${changes.join(', ')}`
      : 'No changes detected'
  };
}

/**
 * Validate version dates
 */
export interface DateValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateVersionDates(
  effectiveDate: Date,
  expirationDate?: Date
): DateValidationResult {
  const errors: string[] = [];
  
  if (!effectiveDate) {
    errors.push('Effective date is required');
  }
  
  if (expirationDate && effectiveDate >= expirationDate) {
    errors.push('Expiration date must be after effective date');
  }
  
  const now = new Date();
  if (effectiveDate < now) {
    errors.push('Effective date cannot be in the past');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

