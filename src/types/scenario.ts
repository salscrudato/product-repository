/**
 * Scenario & QA Run Types
 *
 * Data model:
 *   orgs/{orgId}/scenarios/{scenarioId}           — saved test scenarios
 *   orgs/{orgId}/qaRuns/{runId}                   — regression run results
 *
 * A Scenario is a deterministic rating test case that captures:
 *  - input values, expected outputs, and the rate program version context
 *
 * A QA Run executes a batch of scenarios against the current (draft) rate
 * program version, diffs against the baseline (published version), and
 * produces a pass/fail result with tolerance-based comparison.
 */

import { Timestamp } from 'firebase/firestore';
import type { EvaluationResult, StepTraceEntry } from './ratingEngine';

// ════════════════════════════════════════════════════════════════════════
// Scenario
// ════════════════════════════════════════════════════════════════════════

export type ScenarioTag = 'regression' | 'edge_case' | 'boundary' | 'smoke' | 'acceptance' | 'custom';

export const SCENARIO_TAG_LABELS: Record<ScenarioTag, string> = {
  regression: 'Regression',
  edge_case: 'Edge Case',
  boundary: 'Boundary',
  smoke: 'Smoke Test',
  acceptance: 'Acceptance',
  custom: 'Custom',
};

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  /** Rate program this scenario targets */
  rateProgramId: string;
  rateProgramName?: string;
  /** Input values keyed by field code */
  inputs: Record<string, string | number | boolean | null>;
  /** State code for state-scoped evaluation */
  stateCode?: string;
  /** Expected outputs keyed by field code */
  expectedOutputs: Record<string, number>;
  /** Absolute tolerance for numeric comparison (default 0.01) */
  tolerance: number;
  /** Tags for filtering and categorization */
  tags: ScenarioTag[];
  /** Whether this scenario is required for QA gating */
  isRequired: boolean;
  /** Whether this scenario is active (inactive ones are skipped) */
  isActive: boolean;
  /** Provenance */
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ════════════════════════════════════════════════════════════════════════
// QA Run
// ════════════════════════════════════════════════════════════════════════

export type QARunStatus = 'running' | 'passed' | 'failed' | 'error';

export const QA_RUN_STATUS_CONFIG: Record<QARunStatus, { label: string; color: string }> = {
  running: { label: 'Running', color: '#3B82F6' },
  passed:  { label: 'Passed',  color: '#10B981' },
  failed:  { label: 'Failed',  color: '#EF4444' },
  error:   { label: 'Error',   color: '#F59E0B' },
};

export interface QARunScenarioResult {
  scenarioId: string;
  scenarioName: string;
  /** 'pass' = all outputs within tolerance; 'fail' = at least one diff; 'error' = eval error */
  status: 'pass' | 'fail' | 'error';
  /** Actual outputs from the draft evaluation */
  actualOutputs: Record<string, number>;
  /** Expected outputs from the scenario definition */
  expectedOutputs: Record<string, number>;
  /** Per-field diffs (only for fields that differ beyond tolerance) */
  diffs: ScenarioFieldDiff[];
  /** Baseline outputs from the published version (for compare) */
  baselineOutputs?: Record<string, number>;
  /** Error message if evaluation failed */
  errorMessage?: string;
  /** Execution time in ms */
  executionTimeMs: number;
  /** Result hash from the engine */
  resultHash?: string;
}

export interface ScenarioFieldDiff {
  fieldCode: string;
  expected: number;
  actual: number;
  delta: number;
  /** Absolute difference */
  absDelta: number;
  /** Percentage change from expected */
  pctChange: number;
  /** Whether this diff is within tolerance */
  withinTolerance: boolean;
}

export interface QARun {
  id: string;
  /** Change set that triggered this run (if any) */
  changeSetId?: string;
  changeSetName?: string;
  /** Rate program being tested */
  rateProgramId: string;
  rateProgramName?: string;
  /** Version IDs used */
  draftVersionId: string;
  baselineVersionId?: string;
  /** Overall status */
  status: QARunStatus;
  /** Counts */
  totalScenarios: number;
  passedCount: number;
  failedCount: number;
  errorCount: number;
  /** Individual scenario results */
  results: QARunScenarioResult[];
  /** Total execution time */
  totalExecutionTimeMs: number;
  /** Provenance */
  triggeredAt: Timestamp;
  triggeredBy: string;
  completedAt?: Timestamp;
}

// ════════════════════════════════════════════════════════════════════════
// QA Gating Configuration
// ════════════════════════════════════════════════════════════════════════

export type QAGateMode = 'required' | 'advisory' | 'disabled';

export const QA_GATE_MODE_LABELS: Record<QAGateMode, string> = {
  required: 'Required – blocks publish',
  advisory: 'Advisory – warns but allows publish',
  disabled: 'Disabled – no QA check',
};

export interface QAGateConfig {
  /** Gate mode for rate-change change sets */
  mode: QAGateMode;
  /** Minimum pass rate (0-1) for the run to be considered "passing" */
  minPassRate: number;
  /** Whether to require all "isRequired" scenarios to pass */
  requireMandatoryPass: boolean;
  /** Auto-run QA when a change set is submitted for review */
  autoRunOnReview: boolean;
}

export const DEFAULT_QA_GATE_CONFIG: QAGateConfig = {
  mode: 'required',
  minPassRate: 1.0,
  requireMandatoryPass: true,
  autoRunOnReview: true,
};

// ════════════════════════════════════════════════════════════════════════
// Preflight integration
// ════════════════════════════════════════════════════════════════════════

export interface QAPreflightResult {
  /** Whether QA gate is satisfied */
  passed: boolean;
  /** Gate mode in effect */
  mode: QAGateMode;
  /** Latest QA run (if any) */
  latestRun?: QARun;
  /** Issues for the preflight check */
  issues: { type: 'error' | 'warning'; message: string }[];
}
