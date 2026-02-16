/**
 * Rule Builder Service
 *
 * AI-powered service for converting plain English rule descriptions
 * into structured, programmable rule logic using the Rules DSL.
 */

import aiConfig from '../config/aiConfig';
const { AI_PROMPTS, AI_PARAMETERS } = aiConfig;
import {
  Rule,
  RuleDraft,
  RuleLogic,
  RuleAIMetadata,
} from '../types';
import {
  ConditionGroup,
  Condition,
  Action,
  isConditionGroup,
  isCondition,
} from '../types/rulesDsl';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';

// ============================================================================
// Types
// ============================================================================

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface RuleBuilderRequest {
  /** Plain English rule description */
  text: string;
  /** Product ID for context */
  productId: string;
  /** Optional target coverage/form ID */
  targetId?: string;
  /** Optional context about the product */
  productContext?: {
    name?: string;
    lineOfBusiness?: string;
    coverages?: Array<{ id: string; name: string }>;
    forms?: Array<{ id: string; name: string }>;
  };
  /** Conversation history for multi-turn chat */
  conversationHistory?: ConversationMessage[];
}

export interface RuleBuilderResponse {
  /** Whether the generation was successful */
  success: boolean;
  /** Generated rule draft (only when rule is complete) */
  draft?: RuleDraft;
  /** AI response message (for conversation) */
  message?: string;
  /** Error message if failed */
  error?: string;
  /** AI confidence score (0-100) */
  confidence?: number;
  /** Suggestions for improving the rule */
  suggestions?: string[];
  /** Whether the AI is asking for more information */
  needsMoreInfo?: boolean;
}

// ============================================================================
// AI Integration
// ============================================================================

/**
 * Generate a programmable rule through conversational AI
 * Supports multi-turn conversation for gathering rule requirements
 */
export async function generateRuleFromText(
  request: RuleBuilderRequest
): Promise<RuleBuilderResponse> {
  const { text, productId, targetId, productContext, conversationHistory = [] } = request;

  // Build context message for the first message
  let contextMessage = '';
  if (productContext && conversationHistory.length === 0) {
    contextMessage = `\n\nProduct Context:
- Product Name: ${productContext.name || 'Unknown'}
- Line of Business: ${productContext.lineOfBusiness || 'Unknown'}`;

    if (productContext.coverages?.length) {
      contextMessage += `\n- Available Coverages: ${productContext.coverages.map(c => `${c.name} (${c.id})`).join(', ')}`;
    }
    if (productContext.forms?.length) {
      contextMessage += `\n- Available Forms: ${productContext.forms.map(f => `${f.name} (${f.id})`).join(', ')}`;
    }
  }

  // Build messages array with conversation history
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: AI_PROMPTS.RULES_BUILDER_SYSTEM },
  ];

  // Add conversation history
  for (const msg of conversationHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Add current user message
  const userMessage = conversationHistory.length === 0
    ? `${text}${contextMessage}${targetId ? `\n\nTarget ID: ${targetId}` : ''}`
    : text;

  messages.push({ role: 'user', content: userMessage });

  try {
    // Use Firebase Cloud Function for AI chat (secure proxy to OpenAI)
    const generateChat = httpsCallable(functions, 'generateChatResponse');

    const result = await generateChat({
      messages,
      maxTokens: AI_PARAMETERS.RULES_BUILDER.max_tokens,
      temperature: AI_PARAMETERS.RULES_BUILDER.temperature,
    });

    const data = result.data as { success?: boolean; content?: string };
    const content = data.content || '';

    // Check if response contains a JSON rule (conversation complete)
    const jsonMatch = content.match(/\{[\s\S]*"logic"[\s\S]*\}/);

    if (jsonMatch) {
      // Try to parse as a complete rule
      try {
        const draft = JSON.parse(jsonMatch[0]) as RuleDraft;

        // Validate the draft structure
        const validation = validateRuleDraft(draft);
        if (validation.valid) {
          // Extract any conversational text before the JSON
          const messageBeforeJson = content.substring(0, content.indexOf('{')).trim();

          return {
            success: true,
            draft,
            message: messageBeforeJson || `I've created the rule "${draft.name}". Please review and save it.`,
            confidence: 85,
          };
        }
      } catch {
        // JSON parsing failed, treat as conversational response
      }
    }

    // No valid JSON found - this is a conversational response (asking for clarification)
    return {
      success: true,
      message: content,
      needsMoreInfo: true,
    };
  } catch (error) {
    console.error('Rule generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate a rule draft structure
 */
function validateRuleDraft(draft: RuleDraft): {
  valid: boolean;
  error?: string;
  suggestions?: string[];
} {
  if (!draft.name) {
    return { valid: false, error: 'Rule name is required' };
  }
  if (!draft.logic?.if?.conditions?.length) {
    return { valid: false, error: 'Rule must have at least one condition' };
  }
  if (!draft.logic?.then?.length) {
    return { valid: false, error: 'Rule must have at least one action' };
  }
  return { valid: true };
}

// ============================================================================
// Rule Persistence
// ============================================================================

/**
 * Save a rule draft as a new rule in Firestore
 */
export async function saveRuleFromDraft(
  productId: string,
  draft: RuleDraft,
  userId?: string
): Promise<{ success: boolean; ruleId?: string; error?: string }> {
  try {
    // Build rule data, omitting undefined/empty optional fields
    const ruleData: Record<string, unknown> = {
      productId,
      ruleType: draft.ruleType,
      ruleCategory: draft.ruleCategory,
      name: draft.name,
      condition: draft.conditionText || '',
      outcome: draft.outcomeText || '',
      proprietary: draft.proprietary ?? false,
      status: draft.status || 'Active',
      priority: draft.priority ?? 0,
      logic: draft.logic,
      sourceText: draft.sourceText || '',
      ai: {
        generated: true,
        confidence: 85,
        lastGeneratedAt: new Date(),
        refinementCount: 0,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Only add optional fields if they have values
    if (draft.targetId) ruleData.targetId = draft.targetId;
    if (draft.reference) ruleData.reference = draft.reference;
    if (userId) ruleData.createdBy = userId;
    if (userId) ruleData.updatedBy = userId;

    const docRef = await addDoc(collection(db, 'rules'), ruleData);

    return { success: true, ruleId: docRef.id };
  } catch (error) {
    console.error('Error saving rule:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save rule',
    };
  }
}

/**
 * Update an existing rule with new logic
 */
export async function updateRuleLogic(
  ruleId: string,
  logic: RuleLogic,
  conditionText: string,
  outcomeText: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const ruleRef = doc(db, 'rules', ruleId);
    await updateDoc(ruleRef, {
      logic,
      condition: conditionText,
      outcome: outcomeText,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
      'ai.refinementCount': (await import('firebase/firestore')).increment(1),
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating rule:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update rule',
    };
  }
}

// ============================================================================
// Rule Refinement
// ============================================================================

/**
 * Refine an existing rule with additional instructions
 */
export async function refineRule(
  currentDraft: RuleDraft,
  refinementInstructions: string
): Promise<RuleBuilderResponse> {
  const userMessage = `Refine this rule based on the following instructions:

Current Rule:
${JSON.stringify(currentDraft, null, 2)}

Refinement Instructions:
"${refinementInstructions}"

Respond with the updated rule as valid JSON matching the RuleDraft schema.`;

  try {
    // Use Firebase Cloud Function for AI chat (secure proxy to OpenAI)
    const generateChat = httpsCallable(functions, 'generateChatResponse');

    const result = await generateChat({
      messages: [
        { role: 'system', content: AI_PROMPTS.RULES_BUILDER_SYSTEM },
        { role: 'user', content: userMessage },
      ],
      maxTokens: AI_PARAMETERS.RULES_BUILDER.max_tokens,
      temperature: AI_PARAMETERS.RULES_BUILDER.temperature,
    });

    const data = result.data as { success?: boolean; content?: string };
    const content = data.content || '';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        error: 'Could not parse refined rule from AI response',
      };
    }

    const draft = JSON.parse(jsonMatch[0]) as RuleDraft;

    return {
      success: true,
      draft,
      confidence: 90,
    };
  } catch (error) {
    console.error('Rule refinement error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Rule Evaluation Engine
// ============================================================================

import {
  RuleEvaluationContext,
  RuleEvaluationResult,
  ConditionEvaluationResult,
  ConditionOperator,
  MessageSeverity,
} from '../types/rulesDsl';

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

/**
 * Evaluate a single condition against a context
 */
function evaluateCondition(
  condition: Condition,
  context: RuleEvaluationContext
): ConditionEvaluationResult {
  const actualValue = getNestedValue(context as Record<string, unknown>, condition.field);
  const expectedValue = condition.value;
  let matched = false;

  switch (condition.operator) {
    case 'equals':
      matched = actualValue === expectedValue;
      break;
    case 'notEquals':
      matched = actualValue !== expectedValue;
      break;
    case 'in':
      matched = Array.isArray(expectedValue) && expectedValue.includes(actualValue as never);
      break;
    case 'notIn':
      matched = Array.isArray(expectedValue) && !expectedValue.includes(actualValue as never);
      break;
    case 'gt':
      matched = typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue > expectedValue;
      break;
    case 'gte':
      matched = typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue >= expectedValue;
      break;
    case 'lt':
      matched = typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue < expectedValue;
      break;
    case 'lte':
      matched = typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue <= expectedValue;
      break;
    case 'contains':
      if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
        matched = actualValue.includes(expectedValue);
      } else if (Array.isArray(actualValue)) {
        matched = actualValue.includes(expectedValue);
      }
      break;
    case 'notContains':
      if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
        matched = !actualValue.includes(expectedValue);
      } else if (Array.isArray(actualValue)) {
        matched = !actualValue.includes(expectedValue);
      }
      break;
    case 'exists':
      matched = actualValue !== undefined && actualValue !== null;
      break;
    case 'notExists':
      matched = actualValue === undefined || actualValue === null;
      break;
    case 'between':
      if (typeof actualValue === 'number' && Array.isArray(expectedValue) && expectedValue.length === 2) {
        const low = typeof expectedValue[0] === 'number' ? expectedValue[0] : Number(expectedValue[0]);
        const high = typeof expectedValue[1] === 'number' ? expectedValue[1] : Number(expectedValue[1]);
        matched = actualValue >= low && actualValue <= high;
      }
      break;
    case 'startsWith':
      matched = typeof actualValue === 'string' && typeof expectedValue === 'string' && actualValue.startsWith(expectedValue);
      break;
    case 'endsWith':
      matched = typeof actualValue === 'string' && typeof expectedValue === 'string' && actualValue.endsWith(expectedValue);
      break;
    case 'matches':
      if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
        try {
          matched = new RegExp(expectedValue).test(actualValue);
        } catch {
          matched = false;
        }
      }
      break;
  }

  return {
    condition,
    matched,
    actualValue,
    expectedValue,
    fieldPath: condition.field,
  };
}

/**
 * Evaluate a condition group (AND/OR logic)
 */
function evaluateConditionGroup(
  group: ConditionGroup,
  context: RuleEvaluationContext
): { matched: boolean; results: ConditionEvaluationResult[] } {
  const results: ConditionEvaluationResult[] = [];

  for (const item of group.conditions) {
    if (isConditionGroup(item)) {
      const subResult = evaluateConditionGroup(item, context);
      results.push(...subResult.results);

      if (group.op === 'AND' && !subResult.matched) {
        return { matched: false, results };
      }
      if (group.op === 'OR' && subResult.matched) {
        return { matched: true, results };
      }
    } else if (isCondition(item)) {
      const result = evaluateCondition(item, context);
      results.push(result);

      if (group.op === 'AND' && !result.matched) {
        return { matched: false, results };
      }
      if (group.op === 'OR' && result.matched) {
        return { matched: true, results };
      }
    }
  }

  // For AND: all passed; for OR: none passed
  return { matched: group.op === 'AND', results };
}

/**
 * Evaluate a rule's logic against a context
 */
export function evaluateRule(
  logic: RuleLogic,
  context: RuleEvaluationContext
): RuleEvaluationResult {
  const { matched, results } = evaluateConditionGroup(logic.if, context);

  const applicableActions = matched ? logic.then : (logic.else || []);
  const messages: Array<{ message: string; severity: MessageSeverity }> = [];
  const contextDelta: Partial<RuleEvaluationContext> = {};
  let blocked = false;

  for (const action of applicableActions) {
    if (action.type === 'addMessage' && action.message) {
      messages.push({
        message: action.message,
        severity: action.severity || 'info',
      });
    }
    if (action.type === 'block') {
      blocked = true;
      if (action.message) {
        messages.push({
          message: action.message,
          severity: 'error',
        });
      }
    }
  }

  return {
    matched,
    conditionResults: results,
    applicableActions,
    messages,
    blocked,
    contextDelta,
  };
}

