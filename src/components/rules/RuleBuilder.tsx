/**
 * RuleBuilder – Visual IF / AND / OR condition builder
 *
 * Renders a recursive condition tree with:
 * - Drag-free add/remove for groups and leaves
 * - Field code selection from Data Dictionary
 * - Operator picker with context-appropriate options
 * - Live validation (red highlights for missing fields)
 * - Preview of the rule's outcome
 * - Scope editor (product version, state, coverage)
 */

import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  PlusIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import type {
  ConditionNode,
  ConditionGroup,
  ConditionLeaf,
  ConditionOperator,
  LogicalOperator,
  RuleOutcome,
  RuleAction,
  RuleSeverity,
  RuleScope,
  RuleValidationIssue,
} from '../../types/rulesEngine';
import {
  createEmptyLeaf,
  createEmptyGroup,
  generateConditionId,
} from '../../types/rulesEngine';
import { validateRuleVersion } from '../../engine/rulesEngine';
import type { DataDictionaryField } from '../../types/dataDictionary';
import { SupportingClauses } from '../tracing/SupportingClauses';
import type { Product } from '../../types';

// ============================================================================
// Styled Components
// ============================================================================

const BuilderContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const SectionCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  padding: 24px;
`;

const SectionTitle = styled.h3`
  font-size: 15px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const GroupBox = styled.div<{ $depth: number; $operator: string }>`
  border: 2px solid ${p => p.$operator === 'AND' ? '#c7d2fe' : '#fde68a'};
  border-radius: 12px;
  padding: 16px;
  background: ${p => p.$operator === 'AND' ? 'rgba(238, 242, 255, 0.4)' : 'rgba(254, 249, 195, 0.3)'};
  margin-left: ${p => p.$depth > 0 ? '24px' : '0'};
`;

const GroupHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
`;

const OperatorToggle = styled.button<{ $active: boolean }>`
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;
  border: 1px solid ${p => p.$active ? '#6366f1' : '#d1d5db'};
  background: ${p => p.$active ? '#6366f1' : 'white'};
  color: ${p => p.$active ? 'white' : '#6b7280'};
  transition: all 0.15s;

  &:hover {
    border-color: #6366f1;
  }
`;

const LeafRow = styled.div<{ $hasError: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: ${p => p.$hasError ? 'rgba(239, 68, 68, 0.05)' : 'white'};
  border: 1px solid ${p => p.$hasError ? '#fca5a5' : '#e5e7eb'};
  border-radius: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;

  &:last-child {
    margin-bottom: 0;
  }
`;

const StyledSelect = styled.select`
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  background: white;
  color: #374151;
  min-width: 140px;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const StyledInput = styled.input`
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  min-width: 120px;
  flex: 1;
  max-width: 200px;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const SmallButton = styled.button<{ $variant?: 'danger' | 'primary' | 'ghost' }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: none;

  ${p => {
    switch (p.$variant) {
      case 'danger':
        return 'background: #fef2f2; color: #dc2626; &:hover { background: #fee2e2; }';
      case 'primary':
        return 'background: #eef2ff; color: #6366f1; &:hover { background: #e0e7ff; }';
      default:
        return 'background: transparent; color: #6b7280; &:hover { background: #f3f4f6; }';
    }
  }}
`;

const AddButtonRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
`;

const OutcomeGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const FieldLabel = styled.label`
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 4px;
  display: block;
`;

const StyledTextarea = styled.textarea`
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 13px;
  resize: vertical;
  min-height: 60px;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const ValidationBanner = styled.div<{ $type: 'error' | 'warning' }>`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  background: ${p => p.$type === 'error' ? '#fef2f2' : '#fffbeb'};
  color: ${p => p.$type === 'error' ? '#991b1b' : '#92400e'};
  border: 1px solid ${p => p.$type === 'error' ? '#fecaca' : '#fde68a'};
  margin-bottom: 8px;

  svg { flex-shrink: 0; width: 16px; height: 16px; margin-top: 1px; }
`;

const TagsInput = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
`;

const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  background: #eef2ff;
  border-radius: 10px;
  font-size: 12px;
  color: #4338ca;
  border: 1px solid #c7d2fe;
`;

const ScopeGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME',
  'MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI',
  'SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

// ============================================================================
// Operator metadata
// ============================================================================

const OPERATORS: { value: ConditionOperator; label: string; types?: string[] }[] = [
  { value: 'eq', label: '=' },
  { value: 'ne', label: '≠' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '≥' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '≤' },
  { value: 'between', label: 'between' },
  { value: 'in', label: 'in list' },
  { value: 'notIn', label: 'not in list' },
  { value: 'contains', label: 'contains' },
  { value: 'isTrue', label: 'is true' },
  { value: 'isFalse', label: 'is false' },
];

const ACTIONS: { value: RuleAction; label: string }[] = [
  { value: 'accept', label: 'Accept' },
  { value: 'flag', label: 'Flag for review' },
  { value: 'require_docs', label: 'Require documents' },
  { value: 'refer', label: 'Refer to underwriter' },
  { value: 'decline', label: 'Decline' },
];

const SEVERITIES: { value: RuleSeverity; label: string; color: string }[] = [
  { value: 'info', label: 'Info', color: '#3b82f6' },
  { value: 'warning', label: 'Warning', color: '#f59e0b' },
  { value: 'error', label: 'Error', color: '#ef4444' },
  { value: 'block', label: 'Block', color: '#991b1b' },
];

// ============================================================================
// Props
// ============================================================================

interface RuleBuilderProps {
  conditions: ConditionGroup;
  outcome: RuleOutcome;
  scope: RuleScope;
  dictionaryFields: DataDictionaryField[];
  onChange: (update: {
    conditions?: ConditionGroup;
    outcome?: RuleOutcome;
    scope?: RuleScope;
  }) => void;
  validationIssues?: RuleValidationIssue[];
  readOnly?: boolean;
  /** For clause traceability — if provided, renders "Supporting Clauses" panel */
  orgId?: string;
  ruleVersionId?: string;
  ruleLabel?: string;
  userId?: string;
  /** Products list for scope editor – product version binding */
  products?: Product[];
}

// ============================================================================
// Component
// ============================================================================

export const RuleBuilder: React.FC<RuleBuilderProps> = ({
  conditions,
  outcome,
  scope,
  dictionaryFields,
  onChange,
  validationIssues = [],
  readOnly = false,
  orgId,
  ruleVersionId,
  ruleLabel,
  userId,
  products = [],
}) => {
  const [docInput, setDocInput] = useState('');

  // Index fields by code for quick lookup
  const fieldsByCode = useMemo(() => {
    const map = new Map<string, DataDictionaryField>();
    dictionaryFields.forEach(f => map.set(f.code, f));
    return map;
  }, [dictionaryFields]);

  // ── Mutation helpers (immutable updates) ──────────────────────────────

  const updateNode = useCallback(
    (root: ConditionGroup, targetId: string, updater: (node: ConditionNode) => ConditionNode): ConditionGroup => {
      function walk(node: ConditionNode): ConditionNode {
        if (node.id === targetId) return updater(node);
        if (node.kind === 'group') {
          return { ...node, conditions: node.conditions.map(walk) };
        }
        return node;
      }
      return walk(root) as ConditionGroup;
    },
    [],
  );

  const removeNode = useCallback(
    (root: ConditionGroup, targetId: string): ConditionGroup => {
      function walk(node: ConditionNode): ConditionNode | null {
        if (node.id === targetId) return null;
        if (node.kind === 'group') {
          const filtered = node.conditions.map(walk).filter(Boolean) as ConditionNode[];
          return { ...node, conditions: filtered };
        }
        return node;
      }
      return walk(root) as ConditionGroup;
    },
    [],
  );

  const addChild = useCallback(
    (root: ConditionGroup, parentId: string, child: ConditionNode): ConditionGroup => {
      return updateNode(root, parentId, (node) => {
        if (node.kind !== 'group') return node;
        return { ...node, conditions: [...node.conditions, child] };
      });
    },
    [updateNode],
  );

  // ── Condition event handlers ──────────────────────────────────────────

  const handleFieldChange = (leafId: string, fieldCode: string) => {
    const updated = updateNode(conditions, leafId, (node) => {
      if (node.kind !== 'leaf') return node;
      return { ...node, fieldCode };
    });
    onChange({ conditions: updated });
  };

  const handleOperatorChange = (leafId: string, operator: ConditionOperator) => {
    const updated = updateNode(conditions, leafId, (node) => {
      if (node.kind !== 'leaf') return node;
      return { ...node, operator, value: '', valueEnd: undefined };
    });
    onChange({ conditions: updated });
  };

  const handleValueChange = (leafId: string, value: string | number | boolean | (string | number)[]) => {
    const updated = updateNode(conditions, leafId, (node) => {
      if (node.kind !== 'leaf') return node;
      return { ...node, value };
    });
    onChange({ conditions: updated });
  };

  const handleValueEndChange = (leafId: string, valueEnd: number) => {
    const updated = updateNode(conditions, leafId, (node) => {
      if (node.kind !== 'leaf') return node;
      return { ...node, valueEnd };
    });
    onChange({ conditions: updated });
  };

  const handleToggleOperator = (groupId: string, op: LogicalOperator) => {
    const updated = updateNode(conditions, groupId, (node) => {
      if (node.kind !== 'group') return node;
      return { ...node, operator: op };
    });
    onChange({ conditions: updated });
  };

  const handleAddLeaf = (parentId: string) => {
    const updated = addChild(conditions, parentId, createEmptyLeaf());
    onChange({ conditions: updated });
  };

  const handleAddGroup = (parentId: string) => {
    const updated = addChild(conditions, parentId, createEmptyGroup('AND'));
    onChange({ conditions: updated });
  };

  const handleRemove = (nodeId: string) => {
    const updated = removeNode(conditions, nodeId);
    onChange({ conditions: updated });
  };

  // ── Outcome handlers ──────────────────────────────────────────────────

  const handleOutcomeChange = (field: keyof RuleOutcome, value: unknown) => {
    onChange({ outcome: { ...outcome, [field]: value } });
  };

  const handleAddDoc = () => {
    const trimmed = docInput.trim();
    if (!trimmed) return;
    const docs = [...(outcome.requiredDocs || []), trimmed];
    onChange({ outcome: { ...outcome, requiredDocs: docs } });
    setDocInput('');
  };

  const handleRemoveDoc = (idx: number) => {
    const docs = (outcome.requiredDocs || []).filter((_, i) => i !== idx);
    onChange({ outcome: { ...outcome, requiredDocs: docs } });
  };

  // ── Scope handlers ────────────────────────────────────────────────────

  const handleScopeChange = (field: keyof RuleScope, value: string | null) => {
    onChange({ scope: { ...scope, [field]: value || null } });
  };

  // ── Renderers ─────────────────────────────────────────────────────────

  const renderLeaf = (leaf: ConditionLeaf, depth: number) => {
    const field = fieldsByCode.get(leaf.fieldCode);
    const hasError = validationIssues.some(
      i => i.type === 'error' && i.fieldCode === leaf.fieldCode,
    ) || (!leaf.fieldCode && validationIssues.length > 0);
    const needsValue = !['isTrue', 'isFalse'].includes(leaf.operator);
    const isBetween = leaf.operator === 'between';
    const isList = leaf.operator === 'in' || leaf.operator === 'notIn';

    return (
      <LeafRow key={leaf.id} $hasError={hasError}>
        {/* Field picker */}
        <StyledSelect
          value={leaf.fieldCode}
          onChange={(e) => handleFieldChange(leaf.id, e.target.value)}
          disabled={readOnly}
        >
          <option value="">Select field…</option>
          {dictionaryFields.map(f => (
            <option key={f.code} value={f.code}>
              {f.displayName || f.code}
            </option>
          ))}
        </StyledSelect>

        {/* Operator */}
        <StyledSelect
          value={leaf.operator}
          onChange={(e) => handleOperatorChange(leaf.id, e.target.value as ConditionOperator)}
          disabled={readOnly}
          style={{ minWidth: 100 }}
        >
          {OPERATORS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </StyledSelect>

        {/* Value */}
        {needsValue && !isList && (
          <StyledInput
            type={field?.type === 'int' || field?.type === 'decimal' ? 'number' : 'text'}
            value={String(leaf.value ?? '')}
            placeholder={isBetween ? 'From' : 'Value'}
            onChange={(e) => {
              const val = field?.type === 'int' ? parseInt(e.target.value, 10) || 0
                : field?.type === 'decimal' ? parseFloat(e.target.value) || 0
                : e.target.value;
              handleValueChange(leaf.id, val);
            }}
            disabled={readOnly}
          />
        )}

        {isBetween && (
          <>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>to</span>
            <StyledInput
              type="number"
              value={leaf.valueEnd ?? ''}
              placeholder="To"
              onChange={(e) => handleValueEndChange(leaf.id, parseFloat(e.target.value) || 0)}
              disabled={readOnly}
            />
          </>
        )}

        {isList && (
          <StyledInput
            type="text"
            value={Array.isArray(leaf.value) ? leaf.value.join(', ') : String(leaf.value ?? '')}
            placeholder="Comma-separated values"
            onChange={(e) => {
              const parts = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
              handleValueChange(leaf.id, parts);
            }}
            disabled={readOnly}
          />
        )}

        {/* Remove button */}
        {!readOnly && (
          <SmallButton $variant="danger" onClick={() => handleRemove(leaf.id)} title="Remove condition">
            <TrashIcon style={{ width: 14, height: 14 }} />
          </SmallButton>
        )}
      </LeafRow>
    );
  };

  const renderGroup = (group: ConditionGroup, depth: number) => (
    <GroupBox key={group.id} $depth={depth} $operator={group.operator}>
      <GroupHeader>
        <OperatorToggle
          $active={group.operator === 'AND'}
          onClick={() => handleToggleOperator(group.id, 'AND')}
          disabled={readOnly}
        >
          AND
        </OperatorToggle>
        <OperatorToggle
          $active={group.operator === 'OR'}
          onClick={() => handleToggleOperator(group.id, 'OR')}
          disabled={readOnly}
        >
          OR
        </OperatorToggle>
        <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>
          {group.operator === 'AND' ? 'All conditions must match' : 'Any condition must match'}
        </span>
        {depth > 0 && !readOnly && (
          <SmallButton $variant="danger" onClick={() => handleRemove(group.id)} style={{ marginLeft: 'auto' }}>
            <TrashIcon style={{ width: 14, height: 14 }} />
            Remove group
          </SmallButton>
        )}
      </GroupHeader>

      {group.conditions.map(child =>
        child.kind === 'leaf'
          ? renderLeaf(child, depth)
          : renderGroup(child as ConditionGroup, depth + 1),
      )}

      {!readOnly && (
        <AddButtonRow>
          <SmallButton $variant="primary" onClick={() => handleAddLeaf(group.id)}>
            <PlusIcon style={{ width: 14, height: 14 }} />
            Add condition
          </SmallButton>
          <SmallButton $variant="ghost" onClick={() => handleAddGroup(group.id)}>
            <PlusIcon style={{ width: 14, height: 14 }} />
            Add group
          </SmallButton>
        </AddButtonRow>
      )}
    </GroupBox>
  );

  return (
    <BuilderContainer>
      {/* Validation Issues */}
      {validationIssues.length > 0 && (
        <div>
          {validationIssues.map((issue, i) => (
            <ValidationBanner key={i} $type={issue.type}>
              <ExclamationTriangleIcon />
              <span>{issue.message}</span>
            </ValidationBanner>
          ))}
        </div>
      )}

      {/* Conditions */}
      <SectionCard>
        <SectionTitle>IF (Conditions)</SectionTitle>
        {renderGroup(conditions, 0)}
      </SectionCard>

      {/* Outcome */}
      <SectionCard>
        <SectionTitle>THEN (Outcome)</SectionTitle>
        <OutcomeGrid>
          <div>
            <FieldLabel>Action</FieldLabel>
            <StyledSelect
              value={outcome.action}
              onChange={(e) => handleOutcomeChange('action', e.target.value)}
              disabled={readOnly}
              style={{ width: '100%' }}
            >
              {ACTIONS.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </StyledSelect>
          </div>
          <div>
            <FieldLabel>Severity</FieldLabel>
            <StyledSelect
              value={outcome.severity}
              onChange={(e) => handleOutcomeChange('severity', e.target.value)}
              disabled={readOnly}
              style={{ width: '100%' }}
            >
              {SEVERITIES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </StyledSelect>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <FieldLabel>Message</FieldLabel>
            <StyledTextarea
              value={outcome.message}
              onChange={(e) => handleOutcomeChange('message', e.target.value)}
              placeholder="Message shown when this rule fires…"
              disabled={readOnly}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <FieldLabel>Required Documents</FieldLabel>
            <TagsInput>
              {(outcome.requiredDocs || []).map((d, i) => (
                <Tag key={i}>
                  {d}
                  {!readOnly && (
                    <TrashIcon
                      style={{ width: 12, height: 12, cursor: 'pointer' }}
                      onClick={() => handleRemoveDoc(i)}
                    />
                  )}
                </Tag>
              ))}
              {!readOnly && (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <StyledInput
                    value={docInput}
                    onChange={(e) => setDocInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDoc(); } }}
                    placeholder="Add document…"
                    style={{ minWidth: 140, maxWidth: 200 }}
                  />
                  <SmallButton $variant="primary" onClick={handleAddDoc}>
                    <PlusIcon style={{ width: 14, height: 14 }} />
                  </SmallButton>
                </div>
              )}
            </TagsInput>
          </div>
        </OutcomeGrid>
      </SectionCard>

      {/* Scope */}
      <SectionCard>
        <SectionTitle>
          <AdjustmentsHorizontalIcon style={{ width: 18, height: 18 }} />
          Scope (Applicability)
        </SectionTitle>
        <ScopeGrid>
          <div>
            <FieldLabel>Product Version *</FieldLabel>
            <StyledSelect
              value={scope.productVersionId || ''}
              onChange={(e) => handleScopeChange('productVersionId', e.target.value)}
              disabled={readOnly}
              style={{ width: '100%' }}
            >
              <option value="">— Select product —</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </StyledSelect>
          </div>
          <div>
            <FieldLabel>State (optional)</FieldLabel>
            <StyledSelect
              value={scope.stateCode || ''}
              onChange={(e) => handleScopeChange('stateCode', e.target.value)}
              disabled={readOnly}
              style={{ width: '100%' }}
            >
              <option value="">All states</option>
              {US_STATES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </StyledSelect>
          </div>
          <div>
            <FieldLabel>Coverage (optional)</FieldLabel>
            <StyledInput
              value={scope.coverageVersionId || ''}
              onChange={(e) => handleScopeChange('coverageVersionId', e.target.value)}
              placeholder="Coverage version ID…"
              disabled={readOnly}
              style={{ maxWidth: 'none' }}
            />
          </div>
        </ScopeGrid>
      </SectionCard>

      {/* Supporting Clauses – clause → rule traceability */}
      {orgId && ruleVersionId && userId && (
        <SectionCard>
          <SupportingClauses
            orgId={orgId}
            targetType="rule_version"
            targetId={ruleVersionId}
            targetLabel={ruleLabel || 'Rule'}
            userId={userId}
            readOnly={readOnly}
          />
        </SectionCard>
      )}
    </BuilderContainer>
  );
};

export default RuleBuilder;
