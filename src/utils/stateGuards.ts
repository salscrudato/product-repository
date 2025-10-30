/**
 * State Guards & Save Protection
 * Handles dirty state tracking, unsaved changes detection, and save confirmations
 */

/**
 * Dirty state tracker for form changes
 */
export interface DirtyState {
  isDirty: boolean;
  originalValue: any;
  currentValue: any;
  changedFields: string[];
}

/**
 * Create initial dirty state
 */
export function createDirtyState(initialValue: any): DirtyState {
  return {
    isDirty: false,
    originalValue: JSON.parse(JSON.stringify(initialValue)),
    currentValue: JSON.parse(JSON.stringify(initialValue)),
    changedFields: []
  };
}

/**
 * Update dirty state when value changes
 */
export function updateDirtyState(
  state: DirtyState,
  newValue: any,
  fieldName?: string
): DirtyState {
  const isDirty = JSON.stringify(state.originalValue) !== JSON.stringify(newValue);
  const changedFields = fieldName && isDirty && !state.changedFields.includes(fieldName)
    ? [...state.changedFields, fieldName]
    : state.changedFields;

  return {
    isDirty,
    originalValue: state.originalValue,
    currentValue: newValue,
    changedFields
  };
}

/**
 * Reset dirty state
 */
export function resetDirtyState(state: DirtyState): DirtyState {
  return {
    isDirty: false,
    originalValue: JSON.parse(JSON.stringify(state.currentValue)),
    currentValue: JSON.parse(JSON.stringify(state.currentValue)),
    changedFields: []
  };
}

/**
 * Get change summary
 */
export interface ChangeSummary {
  added: string[];
  removed: string[];
  unchanged: string[];
  total: number;
}

export function getChangeSummary(
  originalStates: string[],
  currentStates: string[]
): ChangeSummary {
  const added = currentStates.filter(s => !originalStates.includes(s));
  const removed = originalStates.filter(s => !currentStates.includes(s));
  const unchanged = currentStates.filter(s => originalStates.includes(s));

  return {
    added,
    removed,
    unchanged,
    total: currentStates.length
  };
}

/**
 * Format change summary for display
 */
export function formatChangeSummary(summary: ChangeSummary): string {
  const lines: string[] = [];

  if (summary.added.length > 0) {
    lines.push(`Added: ${summary.added.join(', ')}`);
  }

  if (summary.removed.length > 0) {
    lines.push(`Removed: ${summary.removed.join(', ')}`);
  }

  if (summary.unchanged.length > 0) {
    lines.push(`Unchanged: ${summary.unchanged.length} state(s)`);
  }

  return lines.join('\n');
}

/**
 * Build save confirmation message
 */
export function buildSaveConfirmation(
  originalStates: string[],
  currentStates: string[],
  entityName: string = 'Coverage'
): string {
  const summary = getChangeSummary(originalStates, currentStates);

  let message = `Save changes to ${entityName}?\n\n`;

  if (summary.added.length > 0) {
    message += `✓ Add ${summary.added.length} state(s): ${summary.added.join(', ')}\n`;
  }

  if (summary.removed.length > 0) {
    message += `✗ Remove ${summary.removed.length} state(s): ${summary.removed.join(', ')}\n`;
  }

  if (summary.added.length === 0 && summary.removed.length === 0) {
    message += 'No changes detected.';
  }

  return message;
}

/**
 * Validate state subset relationship
 */
export interface SubsetValidationResult {
  isValid: boolean;
  isSubset: boolean;
  invalidStates: string[];
  message: string;
}

export function validateStateSubset(
  childStates: string[],
  parentStates: string[],
  childName: string = 'Child',
  parentName: string = 'Parent'
): SubsetValidationResult {
  const invalidStates = childStates.filter(s => !parentStates.includes(s));

  if (invalidStates.length > 0) {
    return {
      isValid: false,
      isSubset: false,
      invalidStates,
      message: `${childName} includes states not available in ${parentName}: ${invalidStates.join(', ')}`
    };
  }

  return {
    isValid: true,
    isSubset: true,
    invalidStates: [],
    message: `${childName} is a valid subset of ${parentName}`
  };
}

/**
 * Validate state coverage (at least one state selected)
 */
export interface CoverageValidationResult {
  isValid: boolean;
  hasCoverage: boolean;
  message: string;
}

export function validateStateCoverage(
  selectedStates: string[],
  minRequired: number = 1
): CoverageValidationResult {
  if (selectedStates.length < minRequired) {
    return {
      isValid: false,
      hasCoverage: false,
      message: `At least ${minRequired} state(s) must be selected`
    };
  }

  return {
    isValid: true,
    hasCoverage: true,
    message: `${selectedStates.length} state(s) selected`
  };
}

/**
 * Validate state consistency across related entities
 */
export interface ConsistencyValidationResult {
  isValid: boolean;
  inconsistencies: Array<{
    entity: string;
    issue: string;
  }>;
  message: string;
}

export function validateStateConsistency(
  productStates: string[],
  coverageStates: string[],
  formStates: string[]
): ConsistencyValidationResult {
  const inconsistencies: ConsistencyValidationResult['inconsistencies'] = [];

  // Check coverage is subset of product
  const invalidCoverageStates = coverageStates.filter(s => !productStates.includes(s));
  if (invalidCoverageStates.length > 0) {
    inconsistencies.push({
      entity: 'Coverage',
      issue: `Includes states not in product: ${invalidCoverageStates.join(', ')}`
    });
  }

  // Check form is subset of product
  const invalidFormStates = formStates.filter(s => !productStates.includes(s));
  if (invalidFormStates.length > 0) {
    inconsistencies.push({
      entity: 'Form',
      issue: `Includes states not in product: ${invalidFormStates.join(', ')}`
    });
  }

  // Check form-coverage overlap
  const formCoverageOverlap = formStates.filter(s => coverageStates.includes(s));
  if (formStates.length > 0 && coverageStates.length > 0 && formCoverageOverlap.length === 0) {
    inconsistencies.push({
      entity: 'Form-Coverage',
      issue: 'No overlapping states between form and coverage'
    });
  }

  return {
    isValid: inconsistencies.length === 0,
    inconsistencies,
    message: inconsistencies.length === 0
      ? 'All state relationships are consistent'
      : `Found ${inconsistencies.length} inconsistency(ies)`
  };
}

/**
 * Build unsaved changes warning
 */
export function buildUnsavedChangesWarning(
  isDirty: boolean,
  entityName: string = 'this page'
): string {
  if (!isDirty) return '';
  return `You have unsaved changes on ${entityName}. Are you sure you want to leave?`;
}

