/**
 * Rule Logic Viewer Component
 * 
 * Displays programmable rule logic in a visual, tree-like format.
 * Shows conditions, operators, and actions in an easy-to-understand layout.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import {
  RuleLogic,
  ConditionGroup,
  Condition,
  Action,
  isConditionGroup,
  isCondition,
} from '../../types';

// ============================================================================
// Types
// ============================================================================

interface RuleLogicViewerProps {
  logic: RuleLogic;
  compact?: boolean;
}

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div`
  font-family: 'SF Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
`;

const Section = styled.div<{ $type: 'if' | 'then' | 'else' }>`
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 10px;
  background: ${({ $type }) => {
    switch ($type) {
      case 'if': return 'rgba(251, 191, 36, 0.1)';
      case 'then': return 'rgba(34, 197, 94, 0.1)';
      case 'else': return 'rgba(239, 68, 68, 0.1)';
    }
  }};
  border-left: 3px solid ${({ $type }) => {
    switch ($type) {
      case 'if': return '#f59e0b';
      case 'then': return '#22c55e';
      case 'else': return '#ef4444';
    }
  }};
`;

const SectionLabel = styled.div<{ $type: 'if' | 'then' | 'else' }>`
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  color: ${({ $type }) => {
    switch ($type) {
      case 'if': return '#b45309';
      case 'then': return '#15803d';
      case 'else': return '#dc2626';
    }
  }};
`;

const ConditionGroupContainer = styled.div<{ $nested?: boolean }>`
  ${({ $nested }) => $nested && `
    margin-left: 16px;
    padding-left: 12px;
    border-left: 2px dashed #d1d5db;
  `}
`;

const LogicalOperator = styled.span`
  display: inline-block;
  padding: 2px 8px;
  margin: 4px 0;
  border-radius: 4px;
  background: #e5e7eb;
  color: #374151;
  font-weight: 600;
  font-size: 11px;
`;

const ConditionRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 0;
`;

const FieldPath = styled.code`
  padding: 2px 8px;
  border-radius: 4px;
  background: #dbeafe;
  color: #1e40af;
  font-weight: 500;
`;

const Operator = styled.span`
  padding: 2px 8px;
  border-radius: 4px;
  background: #fef3c7;
  color: #92400e;
  font-weight: 600;
`;

const Value = styled.code`
  padding: 2px 8px;
  border-radius: 4px;
  background: #dcfce7;
  color: #166534;
  font-weight: 500;
`;

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 0;
`;

const ActionType = styled.span<{ $type: string }>`
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  background: ${({ $type }) => {
    switch ($type) {
      case 'block': return '#fee2e2';
      case 'require': return '#fef3c7';
      case 'applyFactor': return '#dbeafe';
      case 'attachForm': return '#e0e7ff';
      case 'addMessage': return '#f3e8ff';
      default: return '#f3f4f6';
    }
  }};
  color: ${({ $type }) => {
    switch ($type) {
      case 'block': return '#dc2626';
      case 'require': return '#d97706';
      case 'applyFactor': return '#2563eb';
      case 'attachForm': return '#4f46e5';
      case 'addMessage': return '#9333ea';
      default: return '#374151';
    }
  }};
`;

const ActionTarget = styled.code`
  padding: 2px 8px;
  border-radius: 4px;
  background: #f3f4f6;
  color: #374151;
`;

const ActionValue = styled.code`
  padding: 2px 8px;
  border-radius: 4px;
  background: #dcfce7;
  color: #166534;
`;

const Description = styled.span`
  color: #6b7280;
  font-style: italic;
  font-size: 12px;
  margin-left: 8px;
`;

// ============================================================================
// Helper Functions
// ============================================================================

const formatOperator = (op: string): string => {
  const operatorMap: Record<string, string> = {
    equals: '=',
    notEquals: '≠',
    in: 'IN',
    notIn: 'NOT IN',
    gt: '>',
    gte: '≥',
    lt: '<',
    lte: '≤',
    contains: 'CONTAINS',
    notContains: 'NOT CONTAINS',
    exists: 'EXISTS',
    notExists: 'NOT EXISTS',
    between: 'BETWEEN',
    startsWith: 'STARTS WITH',
    endsWith: 'ENDS WITH',
    matches: 'MATCHES',
  };
  return operatorMap[op] || op;
};

const formatValue = (value: unknown): string => {
  if (value === undefined || value === null) return '—';
  if (Array.isArray(value)) {
    if (value.length === 2 && typeof value[0] === 'number') {
      return `${value[0]} - ${value[1]}`;
    }
    return `[${value.join(', ')}]`;
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

// ============================================================================
// Sub-Components
// ============================================================================

const ConditionDisplay: React.FC<{ condition: Condition }> = ({ condition }) => (
  <ConditionRow>
    <FieldPath>{condition.field}</FieldPath>
    <Operator>{formatOperator(condition.operator)}</Operator>
    {condition.value !== undefined && (
      <Value>{formatValue(condition.value)}</Value>
    )}
    {condition.description && (
      <Description>// {condition.description}</Description>
    )}
  </ConditionRow>
);

const ConditionGroupDisplay: React.FC<{
  group: ConditionGroup;
  nested?: boolean;
}> = ({ group, nested = false }) => (
  <ConditionGroupContainer $nested={nested}>
    {group.conditions.map((item, index) => (
      <React.Fragment key={index}>
        {index > 0 && <LogicalOperator>{group.op}</LogicalOperator>}
        {isConditionGroup(item) ? (
          <ConditionGroupDisplay group={item} nested />
        ) : isCondition(item) ? (
          <ConditionDisplay condition={item} />
        ) : null}
      </React.Fragment>
    ))}
  </ConditionGroupContainer>
);

const ActionDisplay: React.FC<{ action: Action }> = ({ action }) => (
  <ActionRow>
    <ActionType $type={action.type}>{action.type}</ActionType>
    <ActionTarget>{action.target}</ActionTarget>
    {action.operator && <Operator>{action.operator}</Operator>}
    {action.value !== undefined && (
      <ActionValue>{formatValue(action.value)}</ActionValue>
    )}
    {action.message && (
      <span style={{ color: '#6b7280' }}>"{action.message}"</span>
    )}
    {action.description && (
      <Description>// {action.description}</Description>
    )}
  </ActionRow>
);

// ============================================================================
// Main Component
// ============================================================================

export const RuleLogicViewer = memo<RuleLogicViewerProps>(({ logic }) => {
  return (
    <Container>
      <Section $type="if">
        <SectionLabel $type="if">IF</SectionLabel>
        <ConditionGroupDisplay group={logic.if} />
      </Section>

      <Section $type="then">
        <SectionLabel $type="then">THEN</SectionLabel>
        {logic.then.map((action, index) => (
          <ActionDisplay key={index} action={action} />
        ))}
      </Section>

      {logic.else && logic.else.length > 0 && (
        <Section $type="else">
          <SectionLabel $type="else">ELSE</SectionLabel>
          {logic.else.map((action, index) => (
            <ActionDisplay key={index} action={action} />
          ))}
        </Section>
      )}
    </Container>
  );
});

RuleLogicViewer.displayName = 'RuleLogicViewer';

export default RuleLogicViewer;

