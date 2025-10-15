/**
 * Rule Templates
 * Pre-defined rule templates for common insurance scenarios
 */

import { RuleTemplate, RuleType, RuleCategory } from '../types';

/**
 * Built-in rule templates for quick rule creation
 */
export const RULE_TEMPLATES: RuleTemplate[] = [
  // ========== Eligibility Rules ==========
  {
    id: 'eligibility-age',
    name: 'Age Eligibility',
    description: 'Restrict coverage based on age requirements',
    ruleType: 'Coverage',
    ruleCategory: 'Eligibility',
    conditionTemplate: 'Applicant age is between [MIN_AGE] and [MAX_AGE] years',
    outcomeTemplate: 'Coverage is [AVAILABLE/NOT AVAILABLE] for this age group',
    isBuiltIn: true
  },
  {
    id: 'eligibility-business-class',
    name: 'Business Class Eligibility',
    description: 'Restrict coverage based on business classification',
    ruleType: 'Coverage',
    ruleCategory: 'Eligibility',
    conditionTemplate: 'Business class code is [CLASS_CODE] or falls within [CLASS_RANGE]',
    outcomeTemplate: 'Coverage is [AVAILABLE/NOT AVAILABLE] for this business class',
    isBuiltIn: true
  },
  {
    id: 'eligibility-state',
    name: 'State Availability',
    description: 'Restrict coverage based on state',
    ruleType: 'Coverage',
    ruleCategory: 'Eligibility',
    conditionTemplate: 'Risk is located in state [STATE_CODE]',
    outcomeTemplate: 'Coverage is [AVAILABLE/NOT AVAILABLE] in this state',
    isBuiltIn: true
  },
  {
    id: 'eligibility-prior-loss',
    name: 'Prior Loss History',
    description: 'Eligibility based on loss history',
    ruleType: 'Product',
    ruleCategory: 'Eligibility',
    conditionTemplate: 'Applicant has [NUMBER] or fewer losses in the past [YEARS] years',
    outcomeTemplate: '[ACCEPT/REFER TO UNDERWRITER/DECLINE] application',
    isBuiltIn: true
  },

  // ========== Pricing Rules ==========
  {
    id: 'pricing-territory',
    name: 'Territory Rating',
    description: 'Apply territory-based pricing factor',
    ruleType: 'Pricing',
    ruleCategory: 'Pricing',
    conditionTemplate: 'Risk is located in territory [TERRITORY_CODE]',
    outcomeTemplate: 'Apply territory factor of [FACTOR] to base premium',
    isBuiltIn: true
  },
  {
    id: 'pricing-deductible-credit',
    name: 'Deductible Credit',
    description: 'Apply credit for higher deductible',
    ruleType: 'Coverage',
    ruleCategory: 'Pricing',
    conditionTemplate: 'Deductible selected is $[DEDUCTIBLE_AMOUNT]',
    outcomeTemplate: 'Apply [PERCENTAGE]% credit to coverage premium',
    isBuiltIn: true
  },
  {
    id: 'pricing-limit-charge',
    name: 'Limit Surcharge',
    description: 'Apply surcharge for higher limits',
    ruleType: 'Coverage',
    ruleCategory: 'Pricing',
    conditionTemplate: 'Limit selected exceeds $[THRESHOLD_AMOUNT]',
    outcomeTemplate: 'Apply [PERCENTAGE]% surcharge to coverage premium',
    isBuiltIn: true
  },
  {
    id: 'pricing-multi-policy-discount',
    name: 'Multi-Policy Discount',
    description: 'Discount for multiple policies',
    ruleType: 'Product',
    ruleCategory: 'Pricing',
    conditionTemplate: 'Insured has [NUMBER] or more active policies',
    outcomeTemplate: 'Apply [PERCENTAGE]% discount to total premium',
    isBuiltIn: true
  },
  {
    id: 'pricing-claims-free-discount',
    name: 'Claims-Free Discount',
    description: 'Discount for claims-free history',
    ruleType: 'Product',
    ruleCategory: 'Pricing',
    conditionTemplate: 'No claims in the past [YEARS] years',
    outcomeTemplate: 'Apply [PERCENTAGE]% claims-free discount',
    isBuiltIn: true
  },

  // ========== Compliance Rules ==========
  {
    id: 'compliance-minimum-limit',
    name: 'Minimum Limit Requirement',
    description: 'Enforce minimum limit requirements',
    ruleType: 'Coverage',
    ruleCategory: 'Compliance',
    conditionTemplate: 'State [STATE_CODE] requires minimum limit of $[MINIMUM_LIMIT]',
    outcomeTemplate: 'Limit must be at least $[MINIMUM_LIMIT] or coverage cannot be issued',
    isBuiltIn: true
  },
  {
    id: 'compliance-mandatory-coverage',
    name: 'Mandatory Coverage',
    description: 'Require specific coverage by law',
    ruleType: 'Coverage',
    ruleCategory: 'Compliance',
    conditionTemplate: 'State [STATE_CODE] requires [COVERAGE_NAME] coverage',
    outcomeTemplate: 'Coverage must be included and cannot be declined',
    isBuiltIn: true
  },
  {
    id: 'compliance-filing-requirement',
    name: 'Form Filing Requirement',
    description: 'Ensure form is filed in state',
    ruleType: 'Forms',
    ruleCategory: 'Compliance',
    conditionTemplate: 'Form [FORM_NUMBER] is used in state [STATE_CODE]',
    outcomeTemplate: 'Form must have valid filing number [FILING_NUMBER] for this state',
    isBuiltIn: true
  },
  {
    id: 'compliance-underwriter-approval',
    name: 'Underwriter Approval Required',
    description: 'Require underwriter approval for specific scenarios',
    ruleType: 'Coverage',
    ruleCategory: 'Compliance',
    conditionTemplate: '[CONDITION] exceeds underwriting authority',
    outcomeTemplate: 'Refer to underwriter for approval before binding',
    isBuiltIn: true
  },

  // ========== Coverage Rules ==========
  {
    id: 'coverage-sublimit',
    name: 'Sublimit Application',
    description: 'Apply sublimit to specific perils',
    ruleType: 'Coverage',
    ruleCategory: 'Coverage',
    conditionTemplate: 'Loss is caused by [PERIL]',
    outcomeTemplate: 'Maximum coverage is limited to $[SUBLIMIT_AMOUNT]',
    isBuiltIn: true
  },
  {
    id: 'coverage-coinsurance',
    name: 'Coinsurance Requirement',
    description: 'Apply coinsurance clause',
    ruleType: 'Coverage',
    ruleCategory: 'Coverage',
    conditionTemplate: 'Property is insured to at least [PERCENTAGE]% of replacement cost',
    outcomeTemplate: 'Full coverage applies; otherwise coinsurance penalty applies',
    isBuiltIn: true
  },
  {
    id: 'coverage-waiting-period',
    name: 'Waiting Period',
    description: 'Apply waiting period before coverage begins',
    ruleType: 'Coverage',
    ruleCategory: 'Coverage',
    conditionTemplate: 'Coverage effective date is [DATE]',
    outcomeTemplate: 'Coverage for [PERIL] begins [DAYS] days after effective date',
    isBuiltIn: true
  },
  {
    id: 'coverage-exclusion-buyback',
    name: 'Exclusion Buyback',
    description: 'Allow buyback of standard exclusion',
    ruleType: 'Coverage',
    ruleCategory: 'Coverage',
    conditionTemplate: 'Insured purchases [ENDORSEMENT_NAME] endorsement',
    outcomeTemplate: 'Exclusion for [EXCLUDED_PERIL] is removed with additional premium of $[AMOUNT]',
    isBuiltIn: true
  },

  // ========== Forms Rules ==========
  {
    id: 'forms-edition-date',
    name: 'Form Edition Date',
    description: 'Ensure correct form edition is used',
    ruleType: 'Forms',
    ruleCategory: 'Forms',
    conditionTemplate: 'Policy effective date is on or after [DATE]',
    outcomeTemplate: 'Use form edition dated [EDITION_DATE]',
    isBuiltIn: true
  },
  {
    id: 'forms-mandatory-endorsement',
    name: 'Mandatory Endorsement',
    description: 'Require specific endorsement',
    ruleType: 'Forms',
    ruleCategory: 'Forms',
    conditionTemplate: '[COVERAGE_NAME] is selected',
    outcomeTemplate: 'Endorsement [ENDORSEMENT_NUMBER] must be attached',
    isBuiltIn: true
  },
  {
    id: 'forms-state-specific',
    name: 'State-Specific Form',
    description: 'Use state-specific form version',
    ruleType: 'Forms',
    ruleCategory: 'Forms',
    conditionTemplate: 'Risk is located in state [STATE_CODE]',
    outcomeTemplate: 'Use state-specific form [FORM_NUMBER] instead of standard form',
    isBuiltIn: true
  }
];

/**
 * Get templates by rule type
 */
export function getTemplatesByType(ruleType: RuleType): RuleTemplate[] {
  return RULE_TEMPLATES.filter(template => template.ruleType === ruleType);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: RuleCategory): RuleTemplate[] {
  return RULE_TEMPLATES.filter(template => template.ruleCategory === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): RuleTemplate | undefined {
  return RULE_TEMPLATES.find(template => template.id === id);
}

/**
 * Apply template to create rule data
 */
export function applyTemplate(
  template: RuleTemplate,
  replacements: Record<string, string>
): { condition: string; outcome: string } {
  let condition = template.conditionTemplate;
  let outcome = template.outcomeTemplate;

  // Replace placeholders with actual values
  Object.entries(replacements).forEach(([key, value]) => {
    const placeholder = `[${key}]`;
    condition = condition.replace(new RegExp(placeholder, 'g'), value);
    outcome = outcome.replace(new RegExp(placeholder, 'g'), value);
  });

  return { condition, outcome };
}

/**
 * Extract placeholders from template
 */
export function extractPlaceholders(template: RuleTemplate): string[] {
  const placeholders = new Set<string>();
  const regex = /\[([A-Z_]+)\]/g;

  let match;
  while ((match = regex.exec(template.conditionTemplate)) !== null) {
    placeholders.add(match[1]);
  }
  while ((match = regex.exec(template.outcomeTemplate)) !== null) {
    placeholders.add(match[1]);
  }

  return Array.from(placeholders);
}

/**
 * Get template categories
 */
export function getTemplateCategories(): RuleCategory[] {
  const categories = new Set<RuleCategory>();
  RULE_TEMPLATES.forEach(template => categories.add(template.ruleCategory));
  return Array.from(categories);
}

/**
 * Search templates
 */
export function searchTemplates(searchTerm: string): RuleTemplate[] {
  const term = searchTerm.toLowerCase();
  return RULE_TEMPLATES.filter(template =>
    template.name.toLowerCase().includes(term) ||
    template.description.toLowerCase().includes(term) ||
    template.conditionTemplate.toLowerCase().includes(term) ||
    template.outcomeTemplate.toLowerCase().includes(term)
  );
}

