/**
 * Rule Conflict Detector
 * Identifies conflicts in business rules (overlapping windows, cyclic dependencies, etc.)
 */

import { Rule } from '../types';
import { Timestamp } from 'firebase/firestore';

export interface RuleConflict {
  type: 'overlappingWindow' | 'cyclicDependency' | 'priorityTie' | 'incompatibleOutcome';
  ruleIds: string[];
  description: string;
  severity: 'warning' | 'error';
}

export interface ConflictDetectionResult {
  conflicts: RuleConflict[];
  hasErrors: boolean;
  hasWarnings: boolean;
}

/**
 * Detect conflicts in a set of rules
 */
export function detectRuleConflicts(rules: Rule[]): ConflictDetectionResult {
  const conflicts: RuleConflict[] = [];

  // Check for overlapping effective windows
  conflicts.push(...detectOverlappingWindows(rules));

  // Check for cyclic dependencies
  conflicts.push(...detectCyclicDependencies(rules));

  // Check for priority ties
  conflicts.push(...detectPriorityTies(rules));

  return {
    conflicts,
    hasErrors: conflicts.some(c => c.severity === 'error'),
    hasWarnings: conflicts.some(c => c.severity === 'warning')
  };
}

/**
 * Detect rules with overlapping effective date windows
 */
function detectOverlappingWindows(rules: Rule[]): RuleConflict[] {
  const conflicts: RuleConflict[] = [];
  const activeRules = rules.filter(r => r.status === 'Active');

  for (let i = 0; i < activeRules.length; i++) {
    for (let j = i + 1; j < activeRules.length; j++) {
      const rule1 = activeRules[i];
      const rule2 = activeRules[j];

      // Only check rules with same target
      if (rule1.targetId !== rule2.targetId) continue;

      const start1 = toDate(rule1.effectiveDate);
      const end1 = toDate(rule1.expirationDate);
      const start2 = toDate(rule2.effectiveDate);
      const end2 = toDate(rule2.expirationDate);

      if (start1 && start2 && end1 && end2) {
        if (!(end1 < start2 || end2 < start1)) {
          // Windows overlap
          conflicts.push({
            type: 'overlappingWindow',
            ruleIds: [rule1.id, rule2.id],
            description: `Rules ${rule1.name} and ${rule2.name} have overlapping effective windows`,
            severity: 'warning'
          });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Detect cyclic dependencies in rules
 */
function detectCyclicDependencies(rules: Rule[]): RuleConflict[] {
  const conflicts: RuleConflict[] = [];
  const ruleMap = new Map(rules.map(r => [r.id, r]));

  for (const rule of rules) {
    if (!rule.dependsOnRuleId || rule.dependsOnRuleId.length === 0) continue;

    const visited = new Set<string>();
    const path: string[] = [rule.id];

    if (hasCycle(rule.id, ruleMap, visited, path)) {
      conflicts.push({
        type: 'cyclicDependency',
        ruleIds: path,
        description: `Cyclic dependency detected: ${path.join(' -> ')}`,
        severity: 'error'
      });
    }
  }

  return conflicts;
}

/**
 * Check if a rule has cyclic dependencies
 */
function hasCycle(
  ruleId: string,
  ruleMap: Map<string, Rule>,
  visited: Set<string>,
  path: string[]
): boolean {
  if (visited.has(ruleId)) {
    return true;
  }

  visited.add(ruleId);
  const rule = ruleMap.get(ruleId);

  if (rule && rule.dependsOnRuleId) {
    for (const depId of rule.dependsOnRuleId) {
      path.push(depId);
      if (hasCycle(depId, ruleMap, visited, path)) {
        return true;
      }
      path.pop();
    }
  }

  visited.delete(ruleId);
  return false;
}

/**
 * Detect rules with same priority
 */
function detectPriorityTies(rules: Rule[]): RuleConflict[] {
  const conflicts: RuleConflict[] = [];
  const priorityMap = new Map<number, Rule[]>();

  for (const rule of rules) {
    if (rule.priority === undefined) continue;
    if (!priorityMap.has(rule.priority)) {
      priorityMap.set(rule.priority, []);
    }
    priorityMap.get(rule.priority)!.push(rule);
  }

  for (const [priority, rulesWithPriority] of priorityMap) {
    if (rulesWithPriority.length > 1) {
      conflicts.push({
        type: 'priorityTie',
        ruleIds: rulesWithPriority.map(r => r.id),
        description: `${rulesWithPriority.length} rules have the same priority (${priority})`,
        severity: 'warning'
      });
    }
  }

  return conflicts;
}

/**
 * Convert Timestamp or Date to Date object
 */
function toDate(value: Timestamp | Date | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

