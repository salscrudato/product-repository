/**
 * Rule Export/Import Utilities
 * Export rules to JSON and import them for reuse across products
 */

import { Rule } from '../types';
import { validateRule, sanitizeRule } from './ruleValidation';

/**
 * Export format for rules
 */
export interface RuleExport {
  version: string;
  exportDate: string;
  productId?: string;
  productName?: string;
  rules: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>[];
  metadata?: {
    totalRules: number;
    ruleTypes: Record<string, number>;
    ruleCategories: Record<string, number>;
  };
}

/**
 * Export rules to JSON
 */
export function exportRulesToJSON(
  rules: Rule[],
  options: {
    productId?: string;
    productName?: string;
    includeMetadata?: boolean;
  } = {}
): string {
  const { productId, productName, includeMetadata = true } = options;

  // Remove IDs and timestamps for portability
  const exportRules = rules.map(rule => {
    const { id, createdAt, updatedAt, ...ruleData } = rule;
    return ruleData;
  });

  const exportData: RuleExport = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    productId,
    productName,
    rules: exportRules
  };

  // Add metadata if requested
  if (includeMetadata) {
    const ruleTypes: Record<string, number> = {};
    const ruleCategories: Record<string, number> = {};

    rules.forEach(rule => {
      ruleTypes[rule.ruleType] = (ruleTypes[rule.ruleType] || 0) + 1;
      ruleCategories[rule.ruleCategory] = (ruleCategories[rule.ruleCategory] || 0) + 1;
    });

    exportData.metadata = {
      totalRules: rules.length,
      ruleTypes,
      ruleCategories
    };
  }

  return JSON.stringify(exportData, null, 2);
}

/**
 * Download rules as JSON file
 */
export function downloadRulesAsJSON(
  rules: Rule[],
  filename: string = 'rules-export.json',
  options?: {
    productId?: string;
    productName?: string;
    includeMetadata?: boolean;
  }
): void {
  const json = exportRulesToJSON(rules, options);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Parse imported rules JSON
 */
export function parseRulesJSON(jsonString: string): {
  success: boolean;
  data?: RuleExport;
  error?: string;
} {
  try {
    const data = JSON.parse(jsonString) as RuleExport;

    // Validate structure
    if (!data.version) {
      return { success: false, error: 'Invalid export format: missing version' };
    }

    if (!data.rules || !Array.isArray(data.rules)) {
      return { success: false, error: 'Invalid export format: missing or invalid rules array' };
    }

    if (data.version !== '1.0') {
      return { success: false, error: `Unsupported export version: ${data.version}` };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: `Failed to parse JSON: ${(error as Error).message}` };
  }
}

/**
 * Import rules from JSON with validation
 */
export function importRulesFromJSON(
  jsonString: string,
  targetProductId: string,
  options: {
    validateBeforeImport?: boolean;
    updateTargetIds?: boolean;
    preserveStatus?: boolean;
  } = {}
): {
  success: boolean;
  rules?: Partial<Rule>[];
  errors?: string[];
  warnings?: string[];
} {
  const {
    validateBeforeImport = true,
    updateTargetIds = false,
    preserveStatus = false
  } = options;

  // Parse JSON
  const parseResult = parseRulesJSON(jsonString);
  if (!parseResult.success || !parseResult.data) {
    return { success: false, errors: [parseResult.error || 'Unknown error'] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const importedRules: Partial<Rule>[] = [];

  // Process each rule
  parseResult.data.rules.forEach((ruleData, index) => {
    // Update product ID
    const rule: Partial<Rule> = {
      ...ruleData,
      productId: targetProductId
    };

    // Optionally clear target IDs (they may not exist in new product)
    if (updateTargetIds && rule.ruleType !== 'Product') {
      warnings.push(`Rule ${index + 1} (${rule.name}): Target ID cleared - please update manually`);
      delete rule.targetId;
    }

    // Optionally set status to Draft
    if (!preserveStatus) {
      rule.status = 'Draft';
      warnings.push(`Rule ${index + 1} (${rule.name}): Status set to Draft for review`);
    }

    // Sanitize
    const sanitized = sanitizeRule(rule);

    // Validate if requested
    if (validateBeforeImport) {
      const validation = validateRule(sanitized);
      if (!validation.isValid) {
        errors.push(`Rule ${index + 1} (${rule.name}): ${validation.errors.join(', ')}`);
        return; // Skip this rule
      }
      if (validation.warnings && validation.warnings.length > 0) {
        warnings.push(`Rule ${index + 1} (${rule.name}): ${validation.warnings.join(', ')}`);
      }
    }

    importedRules.push(sanitized);
  });

  // Add summary warnings
  if (parseResult.data.productId && parseResult.data.productId !== targetProductId) {
    warnings.unshift(
      `Rules were exported from product ${parseResult.data.productName || parseResult.data.productId} ` +
      `and are being imported to a different product. Review all rules carefully.`
    );
  }

  return {
    success: errors.length === 0,
    rules: importedRules,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Export rules to CSV format
 */
export function exportRulesToCSV(rules: Rule[]): string {
  const headers = [
    'Name',
    'Rule Type',
    'Rule Category',
    'Status',
    'Condition',
    'Outcome',
    'Reference',
    'Proprietary',
    'Priority'
  ];

  const rows = rules.map(rule => [
    rule.name,
    rule.ruleType,
    rule.ruleCategory,
    rule.status,
    rule.condition,
    rule.outcome,
    rule.reference || '',
    rule.proprietary ? 'Yes' : 'No',
    rule.priority?.toString() || ''
  ]);

  // Escape CSV values
  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Download rules as CSV file
 */
export function downloadRulesAsCSV(
  rules: Rule[],
  filename: string = 'rules-export.csv'
): void {
  const csv = exportRulesToCSV(rules);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Create a rule backup
 */
export function createRuleBackup(rules: Rule[], productName?: string): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `rules-backup-${productName || 'all'}-${timestamp}.json`;
  
  downloadRulesAsJSON(rules, filename, {
    productName,
    includeMetadata: true
  });
}

/**
 * Compare two rule sets
 */
export function compareRuleSets(
  oldRules: Rule[],
  newRules: Rule[]
): {
  added: Rule[];
  removed: Rule[];
  modified: Rule[];
  unchanged: Rule[];
} {
  const added: Rule[] = [];
  const removed: Rule[] = [];
  const modified: Rule[] = [];
  const unchanged: Rule[] = [];

  const oldRulesMap = new Map(oldRules.map(r => [r.id, r]));
  const newRulesMap = new Map(newRules.map(r => [r.id, r]));

  // Find added and modified
  newRules.forEach(newRule => {
    const oldRule = oldRulesMap.get(newRule.id);
    if (!oldRule) {
      added.push(newRule);
    } else {
      // Check if modified (compare key fields)
      const isModified = 
        oldRule.name !== newRule.name ||
        oldRule.condition !== newRule.condition ||
        oldRule.outcome !== newRule.outcome ||
        oldRule.status !== newRule.status ||
        oldRule.ruleType !== newRule.ruleType ||
        oldRule.ruleCategory !== newRule.ruleCategory;

      if (isModified) {
        modified.push(newRule);
      } else {
        unchanged.push(newRule);
      }
    }
  });

  // Find removed
  oldRules.forEach(oldRule => {
    if (!newRulesMap.has(oldRule.id)) {
      removed.push(oldRule);
    }
  });

  return { added, removed, modified, unchanged };
}

