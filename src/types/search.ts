/**
 * Search Types
 *
 * Defines the searchIndex document shape and related types
 * for the cross-artifact search system.
 *
 * Firestore path:  orgs/{orgId}/searchIndex/{docId}
 */

import { Timestamp } from 'firebase/firestore';

// ════════════════════════════════════════════════════════════════════════
// Artifact type union
// ════════════════════════════════════════════════════════════════════════

export type SearchableArtifactType =
  | 'product'
  | 'coverage'
  | 'form'
  | 'rule'
  | 'rateProgram'
  | 'table'
  | 'changeset'
  | 'task'
  | 'stateProgram';

// ════════════════════════════════════════════════════════════════════════
// Index document (what lives in Firestore)
// ════════════════════════════════════════════════════════════════════════

/**
 * A single document in the `orgs/{orgId}/searchIndex` collection.
 * One document per (artifactId, versionId?) combination.
 */
export interface SearchIndexDoc {
  /** The document type / artifact category */
  type: SearchableArtifactType;

  /** Primary artifact ID (productId, formId, ruleId, etc.) */
  artifactId: string;

  /** Optional version ID (null for top-level artifacts) */
  versionId?: string | null;

  /** Human-readable primary text (product name, form number, rule name, etc.) */
  title: string;

  /** Secondary line (code, status badge, effective date, etc.) */
  subtitle: string;

  /**
   * Lowercased, split, de-duped tokens for array-contains queries.
   * Generated from title + subtitle + any extra keywords.
   * Bounded to MAX_TOKENS_PER_DOC items.
   */
  tokens: string[];

  /**
   * Prefix strings for prefix-match (type-ahead).
   * Generated from each token: "c", "cp", "cp0", "cp00", "cp001", "cp0010"
   * Bounded to MAX_PREFIXES_PER_DOC items.
   */
  prefixes: string[];

  /** When this index entry was last refreshed */
  updatedAt: Timestamp;

  /** Optional: route path for deep-linking */
  route?: string;

  /** Optional: parent artifact info for "where used" context */
  parentId?: string;
  parentType?: SearchableArtifactType;
}

// ════════════════════════════════════════════════════════════════════════
// Query / result types (client-side)
// ════════════════════════════════════════════════════════════════════════

/** What the UI sends to the search service */
export interface SearchQuery {
  orgId: string;
  /** Raw user input (will be tokenised internally) */
  query: string;
  /** Optional: limit to specific types */
  types?: SearchableArtifactType[];
  /** Max results (default 25) */
  limit?: number;
}

/** A single result row returned to the UI */
export interface SearchResult {
  id: string;
  type: SearchableArtifactType;
  artifactId: string;
  versionId?: string | null;
  title: string;
  subtitle: string;
  route?: string;
  parentId?: string;
  parentType?: SearchableArtifactType;
}

// ════════════════════════════════════════════════════════════════════════
// Command palette action types
// ════════════════════════════════════════════════════════════════════════

export type CommandAction =
  | 'navigate'
  | 'createChangeSet'
  | 'createTask'
  | 'runScenario'
  | 'openFilingPackage'
  | 'switchChangeSet';

export interface CommandItem {
  id: string;
  label: string;
  /** Optional description below the label */
  description?: string;
  /** Icon component or null */
  icon?: React.ReactNode;
  /** Keyboard shortcut hint (display only) */
  shortcut?: string;
  /** What happens when selected */
  action: CommandAction;
  /** Route to navigate to (for 'navigate' action) */
  route?: string;
  /** Group header this belongs under */
  group: string;
}

// ════════════════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════════════════

/**
 * Max tokens stored per search index document.
 * Keeps Firestore document size bounded.
 */
export const MAX_TOKENS_PER_DOC = 30;

/**
 * Max prefix strings per document.
 * Each token generates up to 8 prefixes, capped globally.
 */
export const MAX_PREFIXES_PER_DOC = 80;

/**
 * Max prefix length (characters) generated per token.
 */
export const MAX_PREFIX_LENGTH = 8;

/**
 * Human-readable labels for each artifact type.
 */
export const ARTIFACT_TYPE_LABELS: Record<SearchableArtifactType, string> = {
  product: 'Product',
  coverage: 'Coverage',
  form: 'Form',
  rule: 'Rule',
  rateProgram: 'Rate Program',
  table: 'Table',
  changeset: 'Change Set',
  task: 'Task',
  stateProgram: 'State Program',
};
