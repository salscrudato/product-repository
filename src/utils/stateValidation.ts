/**
 * State Availability Validation Utilities
 * 
 * Ensures hierarchical state availability rules are enforced:
 * 1. Coverage states must be subset of product states
 * 2. Sub-coverage states must be subset of parent coverage states
 * 3. Form-coverage links should have overlapping states
 */

export interface StateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that coverage states are subset of product states
 * 
 * @param coverageStates - States selected for the coverage
 * @param productStates - States available for the product
 * @returns Validation result with errors and warnings
 */
export function validateCoverageStates(
  coverageStates: string[],
  productStates: string[]
): StateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if coverage states are subset of product states
  const invalidStates = coverageStates.filter(
    state => !productStates.includes(state)
  );
  
  if (invalidStates.length > 0) {
    errors.push(
      `Coverage includes states not available in product: ${invalidStates.join(', ')}`
    );
  }
  
  // Warn if no states selected
  if (coverageStates.length === 0 && productStates.length > 0) {
    warnings.push(
      'Coverage has no states selected. It will not be available in any state.'
    );
  }
  
  // Warn if product has no states
  if (productStates.length === 0) {
    warnings.push(
      'Product has no states configured. Please configure product states first.'
    );
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate that sub-coverage states are subset of parent coverage states
 * 
 * @param subCoverageStates - States selected for the sub-coverage
 * @param parentCoverageStates - States available for the parent coverage
 * @returns Validation result with errors and warnings
 */
export function validateSubCoverageStates(
  subCoverageStates: string[],
  parentCoverageStates: string[]
): StateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if sub-coverage states are subset of parent coverage states
  const invalidStates = subCoverageStates.filter(
    state => !parentCoverageStates.includes(state)
  );
  
  if (invalidStates.length > 0) {
    errors.push(
      `Sub-coverage includes states not available in parent coverage: ${invalidStates.join(', ')}`
    );
  }
  
  // Warn if no states selected
  if (subCoverageStates.length === 0 && parentCoverageStates.length > 0) {
    warnings.push(
      'Sub-coverage has no states selected. It will not be available in any state.'
    );
  }
  
  // Warn if parent has no states
  if (parentCoverageStates.length === 0) {
    warnings.push(
      'Parent coverage has no states configured. Please configure parent coverage states first.'
    );
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get available states for a coverage based on product and parent coverage
 * 
 * @param productStates - States available for the product
 * @param parentCoverageStates - States available for parent coverage (if sub-coverage)
 * @returns Array of available states
 */
export function getAvailableStatesForCoverage(
  productStates: string[],
  parentCoverageStates?: string[]
): string[] {
  if (parentCoverageStates && parentCoverageStates.length > 0) {
    // Sub-coverage: use parent coverage states
    return parentCoverageStates;
  }
  
  // Top-level coverage: use product states
  return productStates;
}

/**
 * Validate form-coverage state compatibility
 * 
 * @param formStates - States where form is approved
 * @param coverageStates - States where coverage is available
 * @returns Validation result with errors and warnings
 */
export function validateFormCoverageStates(
  formStates: string[],
  coverageStates: string[]
): StateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Find overlapping states
  const overlappingStates = formStates.filter(
    state => coverageStates.includes(state)
  );
  
  // Warn if no overlap
  if (overlappingStates.length === 0 && formStates.length > 0 && coverageStates.length > 0) {
    warnings.push(
      'Form and coverage have no overlapping states. This form-coverage combination will not be available in any state.'
    );
  }
  
  // Info about partial overlap
  if (overlappingStates.length > 0 && overlappingStates.length < Math.max(formStates.length, coverageStates.length)) {
    const formOnlyStates = formStates.filter(s => !coverageStates.includes(s));
    const coverageOnlyStates = coverageStates.filter(s => !formStates.includes(s));
    
    if (formOnlyStates.length > 0) {
      warnings.push(
        `Form is approved in states where coverage is not available: ${formOnlyStates.join(', ')}`
      );
    }
    
    if (coverageOnlyStates.length > 0) {
      warnings.push(
        `Coverage is available in states where form is not approved: ${coverageOnlyStates.join(', ')}`
      );
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get effective states for a form-coverage combination
 * 
 * @param formStates - States where form is approved
 * @param coverageStates - States where coverage is available
 * @returns Array of states where both form and coverage are available
 */
export function getEffectiveStates(
  formStates: string[],
  coverageStates: string[]
): string[] {
  return formStates.filter(state => coverageStates.includes(state));
}

/**
 * Validate state code format
 * 
 * @param stateCode - State code to validate (e.g., "CA", "NY")
 * @returns True if valid state code
 */
export function isValidStateCode(stateCode: string): boolean {
  const validStateCodes = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC'  // District of Columbia
  ];
  
  return validStateCodes.includes(stateCode.toUpperCase());
}

/**
 * Get all valid US state codes
 * 
 * @returns Array of all valid state codes
 */
export function getAllStateCodes(): string[] {
  return [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC'
  ];
}

/**
 * Get state name from state code
 * 
 * @param stateCode - Two-letter state code
 * @returns Full state name or undefined if not found
 */
export function getStateName(stateCode: string): string | undefined {
  const stateNames: Record<string, string> = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
  };
  
  return stateNames[stateCode.toUpperCase()];
}

/**
 * Format validation result for display
 * 
 * @param result - Validation result
 * @returns Formatted string for display
 */
export function formatValidationResult(result: StateValidationResult): string {
  const parts: string[] = [];
  
  if (result.errors.length > 0) {
    parts.push('ERRORS:\n' + result.errors.map(e => `  • ${e}`).join('\n'));
  }
  
  if (result.warnings.length > 0) {
    parts.push('WARNINGS:\n' + result.warnings.map(w => `  • ${w}`).join('\n'));
  }
  
  if (result.isValid && result.warnings.length === 0) {
    parts.push('✓ Validation passed');
  }
  
  return parts.join('\n\n');
}

