/**
 * Natural Language Rule Parser
 * Converts natural language descriptions to structured business rules
 */

import type { Rule, RuleType, RuleCategory, RuleStatus } from '../types';

export interface ParsedRule {
  name: string;
  ruleType: RuleType;
  ruleCategory: RuleCategory;
  condition: string;
  outcome: string;
  status: RuleStatus;
  confidence: number;
  suggestions?: string[];
}

// Pattern definitions for rule parsing
const ELIGIBILITY_PATTERNS = [
  { pattern: /not\s+eligible|cannot\s+be\s+written|excluded|ineligible/i, category: 'Eligibility' as RuleCategory },
  { pattern: /must\s+have|requires?|need|minimum/i, category: 'Eligibility' as RuleCategory },
  { pattern: /if\s+.*\s+then\s+decline|reject\s+if/i, category: 'Eligibility' as RuleCategory },
];

const PRICING_PATTERNS = [
  { pattern: /rate|premium|charge|surcharge|discount|factor|debit|credit/i, category: 'Pricing' as RuleCategory },
  { pattern: /\d+%|\$[\d,]+|multiply|add|increase|decrease/i, category: 'Pricing' as RuleCategory },
];

const COVERAGE_PATTERNS = [
  { pattern: /coverage|limit|deductible|sub-?limit|aggregate/i, category: 'Coverage' as RuleCategory },
  { pattern: /include|exclude|covered|not\s+covered/i, category: 'Coverage' as RuleCategory },
];

const COMPLIANCE_PATTERNS = [
  { pattern: /state\s+(?:requires?|mandates?|law)/i, category: 'Compliance' as RuleCategory },
  { pattern: /regulation|filing|approved|mandatory/i, category: 'Compliance' as RuleCategory },
];

/**
 * Parse natural language text into a structured rule
 */
export function parseNaturalLanguageRule(text: string, productId: string): ParsedRule {
  const normalizedText = text.trim().toLowerCase();
  
  // Detect rule category
  const category = detectCategory(normalizedText);
  
  // Extract condition and outcome
  const { condition, outcome } = extractConditionAndOutcome(text);
  
  // Generate rule name
  const name = generateRuleName(text, category);
  
  // Calculate confidence
  const confidence = calculateConfidence(text, condition, outcome);
  
  // Generate suggestions if confidence is low
  const suggestions = confidence < 0.7 ? generateSuggestions(text, category) : undefined;
  
  return {
    name,
    ruleType: 'Coverage',
    ruleCategory: category,
    condition,
    outcome,
    status: 'Draft',
    confidence,
    suggestions
  };
}

function detectCategory(text: string): RuleCategory {
  for (const { pattern, category } of ELIGIBILITY_PATTERNS) {
    if (pattern.test(text)) return category;
  }
  for (const { pattern, category } of PRICING_PATTERNS) {
    if (pattern.test(text)) return category;
  }
  for (const { pattern, category } of COVERAGE_PATTERNS) {
    if (pattern.test(text)) return category;
  }
  for (const { pattern, category } of COMPLIANCE_PATTERNS) {
    if (pattern.test(text)) return category;
  }
  return 'Coverage';
}

function extractConditionAndOutcome(text: string): { condition: string; outcome: string } {
  // Try "if...then" pattern
  const ifThenMatch = text.match(/if\s+(.+?)\s+then\s+(.+)/i);
  if (ifThenMatch) {
    return { condition: ifThenMatch[1].trim(), outcome: ifThenMatch[2].trim() };
  }
  
  // Try "when...should" pattern
  const whenMatch = text.match(/when\s+(.+?)\s+(?:should|must|will)\s+(.+)/i);
  if (whenMatch) {
    return { condition: whenMatch[1].trim(), outcome: whenMatch[2].trim() };
  }
  
  // Try "for...apply" pattern
  const forMatch = text.match(/for\s+(.+?)\s+apply\s+(.+)/i);
  if (forMatch) {
    return { condition: forMatch[1].trim(), outcome: forMatch[2].trim() };
  }
  
  // Default: split by comma or period
  const parts = text.split(/[,.]/).filter(Boolean);
  if (parts.length >= 2) {
    return { condition: parts[0].trim(), outcome: parts.slice(1).join(', ').trim() };
  }
  
  return { condition: text, outcome: 'Action to be defined' };
}

function generateRuleName(text: string, category: RuleCategory): string {
  const words = text.split(/\s+/).slice(0, 5);
  const nameBase = words.join(' ');
  return `${category}: ${nameBase.substring(0, 50)}${nameBase.length > 50 ? '...' : ''}`;
}

function calculateConfidence(text: string, condition: string, outcome: string): number {
  let score = 0.5;
  
  // Has clear if/then structure
  if (/if\s+.+\s+then/i.test(text)) score += 0.2;
  
  // Contains specific values
  if (/\d+%|\$[\d,]+/.test(text)) score += 0.1;
  
  // Has clear action words
  if (/apply|charge|exclude|require|decline/i.test(outcome)) score += 0.1;
  
  // Reasonable length
  if (text.length > 20 && text.length < 500) score += 0.1;
  
  return Math.min(score, 1);
}

function generateSuggestions(text: string, category: RuleCategory): string[] {
  const suggestions: string[] = [];
  
  if (!/if\s+/i.test(text)) {
    suggestions.push('Try starting with "If [condition] then [outcome]"');
  }
  
  if (category === 'Pricing' && !/\d+/.test(text)) {
    suggestions.push('Consider adding specific numeric values (e.g., "15% surcharge")');
  }
  
  if (text.length < 20) {
    suggestions.push('Add more detail to improve rule clarity');
  }
  
  return suggestions;
}

/**
 * Convert parsed rule to Rule type for database storage
 */
export function toRule(parsed: ParsedRule, productId: string): Omit<Rule, 'id'> {
  return {
    productId,
    name: parsed.name,
    ruleType: parsed.ruleType,
    ruleCategory: parsed.ruleCategory,
    condition: parsed.condition,
    outcome: parsed.outcome,
    status: parsed.status
  };
}

