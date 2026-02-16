/**
 * StateProgram Service
 * Handles CRUD operations, validation, and status transitions for State Programs
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db, safeOnSnapshot } from '@/firebase';
import {
  StateProgram,
  StateProgramStatus,
  STATE_PROGRAM_STATUS_TRANSITIONS,
  RequiredArtifacts,
  ValidationError,
  ValidationResult,
  StateMatrixRow,
} from '@/types/stateProgram';
import { VersionStatus } from '@/types/versioning';
import { US_STATES } from './stateAvailabilityService';
import logger, { LOG_CATEGORIES } from '@/utils/logger';

// ============================================================================
// Path Helpers
// ============================================================================

/**
 * Get the Firestore path for state programs collection
 */
export const getStateProgramsPath = (
  orgId: string,
  productId: string,
  productVersionId: string
): string => `orgs/${orgId}/products/${productId}/versions/${productVersionId}/statePrograms`;

/**
 * Get the Firestore path for a specific state program
 */
export const getStateProgramPath = (
  orgId: string,
  productId: string,
  productVersionId: string,
  stateCode: string
): string => `${getStateProgramsPath(orgId, productId, productVersionId)}/${stateCode}`;

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Fetch all state programs for a product version
 */
export const fetchStatePrograms = async (
  orgId: string,
  productId: string,
  productVersionId: string
): Promise<StateProgram[]> => {
  const path = getStateProgramsPath(orgId, productId, productVersionId);
  const q = query(collection(db, path), orderBy('stateCode', 'asc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    stateCode: doc.id,
  })) as StateProgram[];
};

/**
 * Fetch a single state program
 */
export const fetchStateProgram = async (
  orgId: string,
  productId: string,
  productVersionId: string,
  stateCode: string
): Promise<StateProgram | null> => {
  const path = getStateProgramPath(orgId, productId, productVersionId, stateCode);
  const docSnap = await getDoc(doc(db, path));
  
  if (!docSnap.exists()) return null;
  
  return {
    ...docSnap.data(),
    stateCode: docSnap.id,
  } as StateProgram;
};

/**
 * Create or update a state program
 */
export const saveStateProgram = async (
  orgId: string,
  productId: string,
  productVersionId: string,
  stateCode: string,
  data: Partial<StateProgram>,
  userId: string
): Promise<void> => {
  const path = getStateProgramPath(orgId, productId, productVersionId, stateCode);
  const stateName = US_STATES.find(s => s.code === stateCode)?.name || stateCode;
  
  const existing = await getDoc(doc(db, path));
  
  if (existing.exists()) {
    await updateDoc(doc(db, path), {
      ...data,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    });
  } else {
    const newProgram: Partial<StateProgram> = {
      stateCode,
      stateName,
      status: 'not_offered',
      requiredArtifacts: {
        formVersionIds: [],
        ruleVersionIds: [],
        rateProgramVersionIds: [],
      },
      validationErrors: [],
      ...data,
      createdAt: serverTimestamp() as unknown as Timestamp,
      createdBy: userId,
      updatedAt: serverTimestamp() as unknown as Timestamp,
      updatedBy: userId,
    };
    await setDoc(doc(db, path), newProgram);
  }
  
  logger.info(LOG_CATEGORIES.DATA, 'Saved state program', { orgId, productId, productVersionId, stateCode });
};

/**
 * Delete a state program
 */
export const deleteStateProgram = async (
  orgId: string,
  productId: string,
  productVersionId: string,
  stateCode: string
): Promise<void> => {
  const path = getStateProgramPath(orgId, productId, productVersionId, stateCode);
  await deleteDoc(doc(db, path));
  logger.info(LOG_CATEGORIES.DATA, 'Deleted state program', { orgId, productId, productVersionId, stateCode });
};

/**
 * Subscribe to state programs for real-time updates
 */
export const subscribeToStatePrograms = (
  orgId: string,
  productId: string,
  productVersionId: string,
  callback: (programs: StateProgram[]) => void
): Unsubscribe => {
  const path = getStateProgramsPath(orgId, productId, productVersionId);
  const q = query(collection(db, path), orderBy('stateCode', 'asc'));

  return safeOnSnapshot(q, (snapshot) => {
    const programs = snapshot.docs.map(doc => ({
      ...doc.data(),
      stateCode: doc.id,
    })) as StateProgram[];
    callback(programs);
  });
};

// ============================================================================
// Status Transitions
// ============================================================================

/**
 * Check if a status transition is allowed
 */
export const canTransitionStateProgramStatus = (
  currentStatus: StateProgramStatus,
  targetStatus: StateProgramStatus
): boolean => {
  return STATE_PROGRAM_STATUS_TRANSITIONS[currentStatus].includes(targetStatus);
};

/**
 * Transition a state program to a new status
 */
export const transitionStateProgramStatus = async (
  orgId: string,
  productId: string,
  productVersionId: string,
  stateCode: string,
  targetStatus: StateProgramStatus,
  userId: string,
  additionalData?: Partial<StateProgram>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const program = await fetchStateProgram(orgId, productId, productVersionId, stateCode);

    if (!program) {
      return { success: false, error: 'State program not found' };
    }

    if (!canTransitionStateProgramStatus(program.status, targetStatus)) {
      return {
        success: false,
        error: `Cannot transition from ${program.status} to ${targetStatus}`
      };
    }

    // If transitioning to active, run validation first
    if (targetStatus === 'active') {
      const validation = await validateStateProgram(
        orgId, productId, productVersionId, stateCode
      );
      if (!validation.canActivate) {
        return {
          success: false,
          error: `Cannot activate: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }
    }

    const updateData: Partial<StateProgram> = {
      status: targetStatus,
      ...additionalData,
    };

    // Set date fields based on transition
    if (targetStatus === 'filed' && !program.filingDate) {
      updateData.filingDate = serverTimestamp() as unknown as Timestamp;
    }
    if (targetStatus === 'approved' && !program.approvalDate) {
      updateData.approvalDate = serverTimestamp() as unknown as Timestamp;
    }
    if (targetStatus === 'active' && !program.activationDate) {
      updateData.activationDate = serverTimestamp() as unknown as Timestamp;
    }
    if (targetStatus === 'withdrawn' && !program.withdrawalDate) {
      updateData.withdrawalDate = serverTimestamp() as unknown as Timestamp;
    }

    await saveStateProgram(orgId, productId, productVersionId, stateCode, updateData, userId);

    return { success: true };
  } catch (error) {
    logger.error(LOG_CATEGORIES.DATA, 'Error transitioning state program status',
      { orgId, productId, productVersionId, stateCode, targetStatus },
      error as Error
    );
    return { success: false, error: (error as Error).message };
  }
};

// ============================================================================
// Validation Engine
// ============================================================================

interface ArtifactVersion {
  id: string;
  name: string;
  status: VersionStatus;
}

/**
 * Fetch artifact versions to check their status
 */
const fetchArtifactVersions = async (
  orgId: string,
  productId: string,
  artifactType: 'form' | 'rule' | 'rateProgram',
  versionIds: string[]
): Promise<Map<string, ArtifactVersion>> => {
  const results = new Map<string, ArtifactVersion>();

  if (versionIds.length === 0) return results;

  // Determine collection path based on artifact type
  const getPath = (versionId: string) => {
    switch (artifactType) {
      case 'form':
        return `orgs/${orgId}/products/${productId}/forms`;
      case 'rule':
        return `orgs/${orgId}/products/${productId}/rules`;
      case 'rateProgram':
        return `orgs/${orgId}/products/${productId}/ratePrograms`;
    }
  };

  // For now, fetch each version doc - could be optimized with batch reads
  for (const versionId of versionIds) {
    try {
      // Try to find the version - this is simplified; real implementation
      // would need to query versions subcollections
      const basePath = getPath(versionId);
      const versionsPath = `${basePath}/${versionId.split('_')[0]}/versions/${versionId}`;
      const docSnap = await getDoc(doc(db, versionsPath));

      if (docSnap.exists()) {
        const data = docSnap.data();
        results.set(versionId, {
          id: versionId,
          name: data.data?.name || data.name || versionId,
          status: data.status || 'draft',
        });
      }
    } catch (error) {
      // Version not found - will be reported as missing
      logger.warn(LOG_CATEGORIES.DATA, `Artifact version not found: ${versionId}`);
    }
  }

  return results;
};

/**
 * Validate a state program for activation
 */
export const validateStateProgram = async (
  orgId: string,
  productId: string,
  productVersionId: string,
  stateCode: string
): Promise<ValidationResult> => {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  const program = await fetchStateProgram(orgId, productId, productVersionId, stateCode);

  if (!program) {
    return {
      isValid: false,
      canActivate: false,
      errors: [{
        type: 'missing_form',
        artifactType: 'form',
        message: 'State program not found',
      }],
      warnings: [],
    };
  }

  const { requiredArtifacts } = program;

  // Validate forms
  if (requiredArtifacts.formVersionIds.length > 0) {
    const formVersions = await fetchArtifactVersions(
      orgId, productId, 'form', requiredArtifacts.formVersionIds
    );

    for (const versionId of requiredArtifacts.formVersionIds) {
      const version = formVersions.get(versionId);
      if (!version) {
        errors.push({
          type: 'missing_form',
          artifactType: 'form',
          versionId,
          message: `Required form version not found: ${versionId}`,
          linkTo: `/products/${productId}/forms`,
        });
      } else if (!['approved', 'filed', 'published'].includes(version.status)) {
        errors.push({
          type: 'artifact_not_approved',
          artifactType: 'form',
          artifactId: versionId.split('_')[0],
          artifactName: version.name,
          versionId,
          message: `Form "${version.name}" is not approved (status: ${version.status})`,
          linkTo: `/products/${productId}/forms/${versionId.split('_')[0]}`,
        });
      }
    }
  } else {
    warnings.push('No forms are configured for this state');
  }

  // Validate rules
  if (requiredArtifacts.ruleVersionIds.length > 0) {
    const ruleVersions = await fetchArtifactVersions(
      orgId, productId, 'rule', requiredArtifacts.ruleVersionIds
    );

    for (const versionId of requiredArtifacts.ruleVersionIds) {
      const version = ruleVersions.get(versionId);
      if (!version) {
        errors.push({
          type: 'missing_rule',
          artifactType: 'rule',
          versionId,
          message: `Required rule version not found: ${versionId}`,
          linkTo: `/products/${productId}/rules`,
        });
      } else if (!['approved', 'filed', 'published'].includes(version.status)) {
        errors.push({
          type: 'artifact_not_approved',
          artifactType: 'rule',
          artifactId: versionId.split('_')[0],
          artifactName: version.name,
          versionId,
          message: `Rule "${version.name}" is not approved (status: ${version.status})`,
          linkTo: `/products/${productId}/rules/${versionId.split('_')[0]}`,
        });
      }
    }
  } else {
    warnings.push('No rules are configured for this state');
  }

  // Validate rate programs
  if (requiredArtifacts.rateProgramVersionIds.length > 0) {
    const rateVersions = await fetchArtifactVersions(
      orgId, productId, 'rateProgram', requiredArtifacts.rateProgramVersionIds
    );

    for (const versionId of requiredArtifacts.rateProgramVersionIds) {
      const version = rateVersions.get(versionId);
      if (!version) {
        errors.push({
          type: 'missing_rate',
          artifactType: 'rateProgram',
          versionId,
          message: `Required rate program version not found: ${versionId}`,
          linkTo: `/products/${productId}/pricing`,
        });
      } else if (!['approved', 'filed', 'published'].includes(version.status)) {
        errors.push({
          type: 'artifact_not_approved',
          artifactType: 'rateProgram',
          artifactId: versionId.split('_')[0],
          artifactName: version.name,
          versionId,
          message: `Rate program "${version.name}" is not approved (status: ${version.status})`,
          linkTo: `/products/${productId}/pricing/${versionId.split('_')[0]}`,
        });
      }
    }
  } else {
    warnings.push('No rate programs are configured for this state');
  }

  return {
    isValid: errors.length === 0,
    canActivate: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate and update validation errors on a state program
 */
export const runStateProgramValidation = async (
  orgId: string,
  productId: string,
  productVersionId: string,
  stateCode: string,
  userId: string
): Promise<ValidationResult> => {
  const result = await validateStateProgram(orgId, productId, productVersionId, stateCode);

  // Update the state program with validation results
  await saveStateProgram(orgId, productId, productVersionId, stateCode, {
    lastValidatedAt: serverTimestamp() as unknown as Timestamp,
    validationErrors: result.errors,
  }, userId);

  return result;
};

// ============================================================================
// State Matrix Helpers
// ============================================================================

/**
 * Build state matrix rows for display
 */
export const buildStateMatrixRows = async (
  orgId: string,
  productId: string,
  productVersionId: string
): Promise<StateMatrixRow[]> => {
  const programs = await fetchStatePrograms(orgId, productId, productVersionId);
  const programMap = new Map(programs.map(p => [p.stateCode, p]));

  const rows: StateMatrixRow[] = [];

  for (const state of US_STATES) {
    const program = programMap.get(state.code);

    if (program) {
      const validation = await validateStateProgram(
        orgId, productId, productVersionId, state.code
      );

      rows.push({
        stateCode: state.code,
        stateName: state.name,
        status: program.status,
        formCount: program.requiredArtifacts.formVersionIds.length,
        ruleCount: program.requiredArtifacts.ruleVersionIds.length,
        rateCount: program.requiredArtifacts.rateProgramVersionIds.length,
        lastApprovalDate: program.approvalDate,
        validationResult: validation,
        stateProgram: program,
      });
    } else {
      // State has no program - show as not offered
      rows.push({
        stateCode: state.code,
        stateName: state.name,
        status: 'not_offered',
        formCount: 0,
        ruleCount: 0,
        rateCount: 0,
        validationResult: {
          isValid: false,
          canActivate: false,
          errors: [],
          warnings: ['State program not configured'],
        },
      });
    }
  }

  return rows;
};

/**
 * Initialize state programs for all states (bulk create as not_offered)
 */
export const initializeStatePrograms = async (
  orgId: string,
  productId: string,
  productVersionId: string,
  userId: string
): Promise<void> => {
  const existing = await fetchStatePrograms(orgId, productId, productVersionId);
  const existingCodes = new Set(existing.map(p => p.stateCode));

  for (const state of US_STATES) {
    if (!existingCodes.has(state.code)) {
      await saveStateProgram(orgId, productId, productVersionId, state.code, {
        status: 'not_offered',
        requiredArtifacts: {
          formVersionIds: [],
          ruleVersionIds: [],
          rateProgramVersionIds: [],
        },
        validationErrors: [],
      }, userId);
    }
  }

  logger.info(LOG_CATEGORIES.DATA, 'Initialized state programs', {
    orgId, productId, productVersionId,
    newCount: US_STATES.length - existingCodes.size
  });
};

/**
 * Bulk update state program statuses
 */
export const bulkUpdateStateProgramStatus = async (
  orgId: string,
  productId: string,
  productVersionId: string,
  stateCodes: string[],
  targetStatus: StateProgramStatus,
  userId: string
): Promise<{ success: string[]; failed: { stateCode: string; error: string }[] }> => {
  const success: string[] = [];
  const failed: { stateCode: string; error: string }[] = [];

  for (const stateCode of stateCodes) {
    const result = await transitionStateProgramStatus(
      orgId, productId, productVersionId, stateCode, targetStatus, userId
    );

    if (result.success) {
      success.push(stateCode);
    } else {
      failed.push({ stateCode, error: result.error || 'Unknown error' });
    }
  }

  return { success, failed };
};

/**
 * Update required artifacts for a state program
 */
export const updateStateProgramArtifacts = async (
  orgId: string,
  productId: string,
  productVersionId: string,
  stateCode: string,
  requiredArtifacts: RequiredArtifacts,
  userId: string
): Promise<void> => {
  await saveStateProgram(orgId, productId, productVersionId, stateCode, {
    requiredArtifacts,
  }, userId);

  // Re-run validation after updating artifacts
  await runStateProgramValidation(orgId, productId, productVersionId, stateCode, userId);
};

/**
 * Get state programs summary for product readiness
 */
export const getStateProgramsSummary = async (
  orgId: string,
  productId: string,
  productVersionId: string
): Promise<{
  total: number;
  byStatus: Record<StateProgramStatus, number>;
  activeCount: number;
  readyToActivate: number;
  blockedCount: number;
}> => {
  const programs = await fetchStatePrograms(orgId, productId, productVersionId);

  const byStatus: Record<StateProgramStatus, number> = {
    not_offered: 0,
    draft: 0,
    pending_filing: 0,
    filed: 0,
    approved: 0,
    active: 0,
    withdrawn: 0,
  };

  let readyToActivate = 0;
  let blockedCount = 0;

  for (const program of programs) {
    byStatus[program.status]++;

    if (program.status === 'approved') {
      const validation = await validateStateProgram(
        orgId, productId, productVersionId, program.stateCode
      );
      if (validation.canActivate) {
        readyToActivate++;
      } else {
        blockedCount++;
      }
    }
  }

  return {
    total: programs.length,
    byStatus,
    activeCount: byStatus.active,
    readyToActivate,
    blockedCount,
  };
};

