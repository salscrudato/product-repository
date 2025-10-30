/**
 * Rules Engine Enums & Constants
 * Centralized definitions for business rules
 */

/**
 * Rule Types - Categories of business rules
 */
export enum RuleType {
  PRODUCT = 'Product',
  COVERAGE = 'Coverage',
  FORMS = 'Forms',
  PRICING = 'Pricing'
}

export const RULE_TYPE_LABELS: Record<RuleType, string> = {
  [RuleType.PRODUCT]: 'Product Rule',
  [RuleType.COVERAGE]: 'Coverage Rule',
  [RuleType.FORMS]: 'Forms Rule',
  [RuleType.PRICING]: 'Pricing Rule'
};

export const RULE_TYPE_COLORS: Record<RuleType, string> = {
  [RuleType.PRODUCT]: '#6366f1',
  [RuleType.COVERAGE]: '#10b981',
  [RuleType.FORMS]: '#f59e0b',
  [RuleType.PRICING]: '#8b5cf6'
};

export const RULE_TYPES = Object.values(RuleType);

/**
 * Rule Categories - Functional categories for rules
 */
export enum RuleCategory {
  ELIGIBILITY = 'Eligibility',
  PRICING = 'Pricing',
  COMPLIANCE = 'Compliance',
  COVERAGE = 'Coverage',
  FORMS = 'Forms'
}

export const RULE_CATEGORY_LABELS: Record<RuleCategory, string> = {
  [RuleCategory.ELIGIBILITY]: 'Eligibility',
  [RuleCategory.PRICING]: 'Pricing',
  [RuleCategory.COMPLIANCE]: 'Compliance',
  [RuleCategory.COVERAGE]: 'Coverage',
  [RuleCategory.FORMS]: 'Forms'
};

export const RULE_CATEGORIES = Object.values(RuleCategory);

/**
 * Rule Status - Lifecycle states for rules
 */
export enum RuleStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  DRAFT = 'Draft',
  UNDER_REVIEW = 'Under Review'
}

export const RULE_STATUS_LABELS: Record<RuleStatus, string> = {
  [RuleStatus.ACTIVE]: 'Active',
  [RuleStatus.INACTIVE]: 'Inactive',
  [RuleStatus.DRAFT]: 'Draft',
  [RuleStatus.UNDER_REVIEW]: 'Under Review'
};

export const RULE_STATUS_COLORS: Record<RuleStatus, string> = {
  [RuleStatus.ACTIVE]: '#10b981',
  [RuleStatus.INACTIVE]: '#6b7280',
  [RuleStatus.DRAFT]: '#f59e0b',
  [RuleStatus.UNDER_REVIEW]: '#3b82f6'
};

export const RULE_STATUSES = Object.values(RuleStatus);

/**
 * Sort Options - How to sort rules in lists
 */
export enum SortOption {
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
  TYPE_ASC = 'type_asc',
  TYPE_DESC = 'type_desc',
  STATUS_ASC = 'status_asc',
  STATUS_DESC = 'status_desc',
  CREATED_ASC = 'created_asc',
  CREATED_DESC = 'created_desc',
  UPDATED_ASC = 'updated_asc',
  UPDATED_DESC = 'updated_desc'
}

export const SORT_OPTION_LABELS: Record<SortOption, string> = {
  [SortOption.NAME_ASC]: 'Name (A-Z)',
  [SortOption.NAME_DESC]: 'Name (Z-A)',
  [SortOption.TYPE_ASC]: 'Type (A-Z)',
  [SortOption.TYPE_DESC]: 'Type (Z-A)',
  [SortOption.STATUS_ASC]: 'Status (A-Z)',
  [SortOption.STATUS_DESC]: 'Status (Z-A)',
  [SortOption.CREATED_ASC]: 'Oldest First',
  [SortOption.CREATED_DESC]: 'Newest First',
  [SortOption.UPDATED_ASC]: 'Least Recently Updated',
  [SortOption.UPDATED_DESC]: 'Most Recently Updated'
};

export const SORT_OPTIONS = Object.values(SortOption);

/**
 * Constraints & Limits
 */
export const RULES_CONSTRAINTS = {
  MAX_RULES_PER_PRODUCT: 1000,
  MAX_RULES_PER_COVERAGE: 500,
  MAX_RULES_PER_FORM: 100,
  MAX_RULE_NAME_LENGTH: 255,
  MAX_CONDITION_LENGTH: 2000,
  MAX_OUTCOME_LENGTH: 2000,
  MAX_REFERENCE_LENGTH: 500,
  MAX_BULK_OPERATIONS: 100,
  MAX_RULES_PER_BULK_UPDATE: 50
} as const;

/**
 * Validation Rules
 */
export const RULES_VALIDATION = {
  RULE_NAME_MIN_LENGTH: 1,
  RULE_NAME_MAX_LENGTH: 255,
  CONDITION_MIN_LENGTH: 1,
  CONDITION_MAX_LENGTH: 2000,
  OUTCOME_MIN_LENGTH: 1,
  OUTCOME_MAX_LENGTH: 2000,
  REFERENCE_MIN_LENGTH: 0,
  REFERENCE_MAX_LENGTH: 500,
  CHANGE_REASON_MIN_LENGTH: 10,
  CHANGE_REASON_MAX_LENGTH: 500
} as const;

/**
 * Filter Presets - Common filter combinations
 */
export const FILTER_PRESETS = {
  ACTIVE_ONLY: {
    status: [RuleStatus.ACTIVE],
    label: 'Active Rules'
  },
  DRAFT_ONLY: {
    status: [RuleStatus.DRAFT],
    label: 'Draft Rules'
  },
  UNDER_REVIEW: {
    status: [RuleStatus.UNDER_REVIEW],
    label: 'Under Review'
  },
  PRODUCT_RULES: {
    type: [RuleType.PRODUCT],
    label: 'Product Rules'
  },
  COVERAGE_RULES: {
    type: [RuleType.COVERAGE],
    label: 'Coverage Rules'
  },
  PRICING_RULES: {
    type: [RuleType.PRICING],
    label: 'Pricing Rules'
  },
  COMPLIANCE_RULES: {
    category: [RuleCategory.COMPLIANCE],
    label: 'Compliance Rules'
  }
} as const;

/**
 * Bulk Operation Types
 */
export enum BulkOperationType {
  ACTIVATE = 'activate',
  DEACTIVATE = 'deactivate',
  DELETE = 'delete',
  CHANGE_STATUS = 'change_status',
  CHANGE_CATEGORY = 'change_category',
  DUPLICATE = 'duplicate',
  EXPORT = 'export'
}

export const BULK_OPERATION_LABELS: Record<BulkOperationType, string> = {
  [BulkOperationType.ACTIVATE]: 'Activate',
  [BulkOperationType.DEACTIVATE]: 'Deactivate',
  [BulkOperationType.DELETE]: 'Delete',
  [BulkOperationType.CHANGE_STATUS]: 'Change Status',
  [BulkOperationType.CHANGE_CATEGORY]: 'Change Category',
  [BulkOperationType.DUPLICATE]: 'Duplicate',
  [BulkOperationType.EXPORT]: 'Export'
};

export const BULK_OPERATIONS = Object.values(BulkOperationType);

