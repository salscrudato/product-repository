/**
 * Rule Validation Utilities
 * Validates rule data before saving to ensure data integrity
 */

import { Rule, RuleType, RuleCategory, RuleStatus, RuleValidationResult } from '../types';

/**
 * Validate a rule object
 */
export function validateRule(rule: Partial<Rule>): RuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!rule.name || rule.name.trim().length === 0) {
    errors.push('Rule name is required');
  } else if (rule.name.length > 200) {
    errors.push('Rule name must be 200 characters or less');
  }

  if (!rule.productId || rule.productId.trim().length === 0) {
    errors.push('Product ID is required');
  }

  if (!rule.ruleType) {
    errors.push('Rule type is required');
  } else if (!isValidRuleType(rule.ruleType)) {
    errors.push(`Invalid rule type: ${rule.ruleType}`);
  }

  if (!rule.ruleCategory) {
    errors.push('Rule category is required');
  } else if (!isValidRuleCategory(rule.ruleCategory)) {
    errors.push(`Invalid rule category: ${rule.ruleCategory}`);
  }

  if (!rule.status) {
    errors.push('Rule status is required');
  } else if (!isValidRuleStatus(rule.status)) {
    errors.push(`Invalid rule status: ${rule.status}`);
  }

  if (!rule.condition || rule.condition.trim().length === 0) {
    errors.push('Rule condition is required');
  } else if (rule.condition.length > 1000) {
    errors.push('Rule condition must be 1000 characters or less');
  }

  if (!rule.outcome || rule.outcome.trim().length === 0) {
    errors.push('Rule outcome is required');
  } else if (rule.outcome.length > 1000) {
    errors.push('Rule outcome must be 1000 characters or less');
  }

  // Conditional validation: targetId required for non-Product rules
  if (rule.ruleType && rule.ruleType !== 'Product') {
    if (!rule.targetId || rule.targetId.trim().length === 0) {
      errors.push(`Target ID is required for ${rule.ruleType} rules`);
    }
  }

  // Warnings
  if (rule.reference && rule.reference.length > 500) {
    warnings.push('Reference is very long (>500 characters)');
  }

  if (rule.priority !== undefined && (rule.priority < 0 || rule.priority > 100)) {
    warnings.push('Priority should typically be between 0 and 100');
  }

  if (rule.status === 'Draft' && !rule.condition?.includes('[TODO]') && !rule.outcome?.includes('[TODO]')) {
    warnings.push('Draft rules typically contain [TODO] markers');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validate rule type
 */
export function isValidRuleType(ruleType: string): ruleType is RuleType {
  return ['Product', 'Coverage', 'Forms', 'Pricing'].includes(ruleType);
}

/**
 * Validate rule category
 */
export function isValidRuleCategory(category: string): category is RuleCategory {
  return ['Eligibility', 'Pricing', 'Compliance', 'Coverage', 'Forms'].includes(category);
}

/**
 * Validate rule status
 */
export function isValidRuleStatus(status: string): status is RuleStatus {
  return ['Active', 'Inactive', 'Draft', 'Under Review', 'Archived'].includes(status);
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(result: RuleValidationResult): string {
  if (result.isValid) {
    return '';
  }

  let message = 'Validation errors:\n';
  result.errors.forEach((error, index) => {
    message += `${index + 1}. ${error}\n`;
  });

  if (result.warnings && result.warnings.length > 0) {
    message += '\nWarnings:\n';
    result.warnings.forEach((warning, index) => {
      message += `${index + 1}. ${warning}\n`;
    });
  }

  return message;
}

/**
 * Sanitize rule data before saving
 */
export function sanitizeRule(rule: Partial<Rule>): Partial<Rule> {
  const sanitized: Partial<Rule> = { ...rule };

  // Trim string fields
  if (sanitized.name) {
    sanitized.name = sanitized.name.trim();
  }

  if (sanitized.condition) {
    sanitized.condition = sanitized.condition.trim();
  }

  if (sanitized.outcome) {
    sanitized.outcome = sanitized.outcome.trim();
  }

  if (sanitized.reference) {
    sanitized.reference = sanitized.reference.trim();
  }

  if (sanitized.productId) {
    sanitized.productId = sanitized.productId.trim();
  }

  if (sanitized.targetId) {
    sanitized.targetId = sanitized.targetId.trim();
  }

  // Remove targetId if rule type is Product
  if (sanitized.ruleType === 'Product') {
    delete sanitized.targetId;
  }

  // Set default values
  if (sanitized.proprietary === undefined) {
    sanitized.proprietary = false;
  }

  if (sanitized.status === undefined) {
    sanitized.status = 'Draft';
  }

  return sanitized;
}

/**
 * Check if a rule conflicts with existing rules
 */
export function checkRuleConflicts(
  newRule: Partial<Rule>,
  existingRules: Rule[]
): { hasConflict: boolean; conflicts: string[] } {
  const conflicts: string[] = [];

  // Check for duplicate names in same product
  const duplicateName = existingRules.find(
    rule => 
      rule.productId === newRule.productId &&
      rule.name.toLowerCase() === newRule.name?.toLowerCase() &&
      rule.id !== newRule.id
  );

  if (duplicateName) {
    conflicts.push(`A rule with the name "${newRule.name}" already exists for this product`);
  }

  // Check for identical conditions and outcomes
  const identicalRule = existingRules.find(
    rule =>
      rule.productId === newRule.productId &&
      rule.ruleType === newRule.ruleType &&
      rule.targetId === newRule.targetId &&
      rule.condition === newRule.condition &&
      rule.outcome === newRule.outcome &&
      rule.id !== newRule.id
  );

  if (identicalRule) {
    conflicts.push(`An identical rule already exists: "${identicalRule.name}"`);
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
}

/**
 * Validate rule before deletion
 */
export function validateRuleDeletion(rule: Rule): { canDelete: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Warn if deleting an active rule
  if (rule.status === 'Active') {
    warnings.push('This is an active rule. Deleting it may affect product behavior.');
  }

  // Warn if deleting a proprietary rule
  if (rule.proprietary) {
    warnings.push('This is a proprietary rule. Make sure you have a backup.');
  }

  // Warn if deleting a high-priority rule
  if (rule.priority !== undefined && rule.priority >= 80) {
    warnings.push('This is a high-priority rule. Verify it is safe to delete.');
  }

  return {
    canDelete: true,
    warnings
  };
}

/**
 * Get rule type display name
 */
export function getRuleTypeDisplayName(ruleType: RuleType): string {
  const displayNames: Record<RuleType, string> = {
    'Product': 'Product-Level Rule',
    'Coverage': 'Coverage-Specific Rule',
    'Forms': 'Form-Related Rule',
    'Pricing': 'Pricing Rule'
  };

  return displayNames[ruleType] || ruleType;
}

/**
 * Get rule category display name
 */
export function getRuleCategoryDisplayName(category: RuleCategory): string {
  const displayNames: Record<RuleCategory, string> = {
    'Eligibility': 'Eligibility Rule',
    'Pricing': 'Pricing Rule',
    'Compliance': 'Compliance Rule',
    'Coverage': 'Coverage Rule',
    'Forms': 'Forms Rule'
  };

  return displayNames[category] || category;
}

/**
 * Get rule status color
 */
export function getRuleStatusColor(status: RuleStatus): string {
  const colors: Record<RuleStatus, string> = {
    'Active': '#10b981',
    'Inactive': '#6b7280',
    'Draft': '#f59e0b',
    'Under Review': '#3b82f6',
    'Archived': '#9ca3af'
  };

  return colors[status] || '#6b7280';
}

/**
 * Get rule type color
 */
export function getRuleTypeColor(ruleType: RuleType): string {
  const colors: Record<RuleType, string> = {
    'Product': '#6366f1',
    'Coverage': '#10b981',
    'Forms': '#f59e0b',
    'Pricing': '#8b5cf6'
  };

  return colors[ruleType] || '#6b7280';
}

