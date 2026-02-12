/**
 * AI Copilot Component
 * Side panel for AI-assisted changes with diff view and undo
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import {
  SparklesIcon,
  XMarkIcon,
  CheckIcon,
  ArrowUturnLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { callAIGatewayStructured } from '../../services/aiGatewayService';
import { z } from 'zod';

// Types
export interface CopilotChange {
  id: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
}

export interface CopilotProposal {
  id: string;
  title: string;
  description: string;
  changes: CopilotChange[];
  status: 'pending' | 'applied' | 'rejected';
  createdAt: Date;
}

interface AICopilotProps {
  isOpen: boolean;
  onClose: () => void;
  context: {
    type: 'coverage' | 'pricing' | 'rule' | 'form';
    productId: string;
    entityId?: string;
    currentData: Record<string, unknown>;
  };
  onApplyChanges: (changes: CopilotChange[]) => Promise<void>;
}

// Styled Components
const Panel = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  width: 420px;
  height: 100vh;
  background: white;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  transform: translateX(${props => props.$isOpen ? '0' : '100%'});
  transition: transform 0.3s ease;
  z-index: 1000;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
`;

const Title = styled.h2`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  color: white;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
`;

const PromptSection = styled.div`
  margin-bottom: 24px;
`;

const PromptTextarea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const GenerateButton = styled.button`
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
  
  &:hover {
    opacity: 0.9;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ProposalCard = styled.div`
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
`;

const ProposalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const ProposalTitle = styled.h3`
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
`;

const ChangeItem = styled.div`
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid #e2e8f0;
`;

const ChangeField = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 8px;
`;

const DiffView = styled.div`
  font-family: monospace;
  font-size: 12px;
`;

const DiffOld = styled.div`
  background: #fee2e2;
  color: #991b1b;
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 4px;
  
  &::before {
    content: '- ';
  }
`;

const DiffNew = styled.div`
  background: #dcfce7;
  color: #166534;
  padding: 4px 8px;
  border-radius: 4px;

  &::before {
    content: '+ ';
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`;

const ActionButton = styled.button<{ $variant: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  ${props => props.$variant === 'primary' ? `
    background: #6366f1;
    color: white;
    border: none;

    &:hover { background: #4f46e5; }
  ` : `
    background: white;
    color: #64748b;
    border: 1px solid #e2e8f0;

    &:hover { background: #f8fafc; }
  `}
`;

// Main Component
export const AICopilot: React.FC<AICopilotProps> = ({
  isOpen,
  onClose,
  context,
  onApplyChanges,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [proposals, setProposals] = useState<CopilotProposal[]>([]);
  const [appliedChanges, setAppliedChanges] = useState<CopilotChange[]>([]);

  const generateProposal = useCallback(async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      const schema = z.object({
        title: z.string(),
        description: z.string(),
        changes: z.array(z.object({
          field: z.string(),
          newValue: z.unknown(),
          reason: z.string(),
        })),
      });

      const result = await callAIGatewayStructured({
        prompt: `Based on this request: "${prompt}"

Current ${context.type} data:
${JSON.stringify(context.currentData, null, 2)}

Suggest specific changes to improve this ${context.type}. For each change, specify the field name, new value, and reason.`,
        systemPrompt: `You are an insurance product expert helping to improve ${context.type} configurations. Suggest practical, compliant changes.`,
        schema,
        context: {
          productId: context.productId,
          feature: `copilot-${context.type}`,
        },
      });

      const proposal: CopilotProposal = {
        id: result.requestId,
        title: result.data.title,
        description: result.data.description,
        changes: result.data.changes.map((c, i) => ({
          id: `${result.requestId}-${i}`,
          field: c.field,
          oldValue: context.currentData[c.field],
          newValue: c.newValue,
          reason: c.reason,
        })),
        status: 'pending',
        createdAt: new Date(),
      };

      setProposals(prev => [proposal, ...prev]);
      setPrompt('');
    } catch (error) {
      console.error('Failed to generate proposal:', error);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, context]);

  const handleApply = async (proposal: CopilotProposal) => {
    try {
      await onApplyChanges(proposal.changes);
      setAppliedChanges(prev => [...prev, ...proposal.changes]);
      setProposals(prev =>
        prev.map(p => p.id === proposal.id ? { ...p, status: 'applied' } : p)
      );
    } catch (error) {
      console.error('Failed to apply changes:', error);
    }
  };

  const handleUndo = async (proposal: CopilotProposal) => {
    // Revert changes by applying old values
    const revertChanges = proposal.changes.map(c => ({
      ...c,
      newValue: c.oldValue,
      oldValue: c.newValue,
    }));

    try {
      await onApplyChanges(revertChanges);
      setAppliedChanges(prev =>
        prev.filter(c => !proposal.changes.some(pc => pc.id === c.id))
      );
      setProposals(prev =>
        prev.map(p => p.id === proposal.id ? { ...p, status: 'pending' } : p)
      );
    } catch (error) {
      console.error('Failed to undo changes:', error);
    }
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <Panel $isOpen={isOpen}>
      <Header>
        <Title>
          <SparklesIcon width={20} />
          AI Copilot
        </Title>
        <CloseButton onClick={onClose}>
          <XMarkIcon width={20} />
        </CloseButton>
      </Header>

      <Content>
        <PromptSection>
          <PromptTextarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={`Describe what you want to change about this ${context.type}...`}
          />
          <GenerateButton onClick={generateProposal} disabled={isLoading || !prompt.trim()}>
            <SparklesIcon width={18} />
            {isLoading ? 'Generating...' : 'Generate Suggestions'}
          </GenerateButton>
        </PromptSection>

        {proposals.map(proposal => (
          <ProposalCard key={proposal.id}>
            <ProposalHeader>
              <ProposalTitle>{proposal.title}</ProposalTitle>
            </ProposalHeader>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 12px' }}>
              {proposal.description}
            </p>

            {proposal.changes.map(change => (
              <ChangeItem key={change.id}>
                <ChangeField>{change.field}</ChangeField>
                <DiffView>
                  <DiffOld>{formatValue(change.oldValue)}</DiffOld>
                  <DiffNew>{formatValue(change.newValue)}</DiffNew>
                </DiffView>
                <p style={{ fontSize: 12, color: '#64748b', margin: '8px 0 0' }}>
                  {change.reason}
                </p>
              </ChangeItem>
            ))}

            <ActionButtons>
              {proposal.status === 'applied' ? (
                <ActionButton $variant="secondary" onClick={() => handleUndo(proposal)}>
                  <ArrowUturnLeftIcon width={16} />
                  Undo
                </ActionButton>
              ) : (
                <>
                  <ActionButton $variant="primary" onClick={() => handleApply(proposal)}>
                    <CheckIcon width={16} />
                    Apply
                  </ActionButton>
                  <ActionButton
                    $variant="secondary"
                    onClick={() => setProposals(prev => prev.filter(p => p.id !== proposal.id))}
                  >
                    Dismiss
                  </ActionButton>
                </>
              )}
            </ActionButtons>
          </ProposalCard>
        ))}
      </Content>
    </Panel>
  );
};

export default AICopilot;

