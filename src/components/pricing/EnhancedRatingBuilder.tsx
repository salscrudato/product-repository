import React, { useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import type { RatingStep } from './RatingAlgorithmBuilder';
import type {
  ValidationIssue,
  StepTemplate,
} from '../../types/pricing';
import { ValidationIssuesComponent } from './ValidationIssues';
import { StepTemplatesMenuComponent } from './StepTemplatesMenu';

// ============================================================================
// Types
// ============================================================================

interface EnhancedRatingBuilderProps {
  steps: RatingStep[];
  onAddStep: (template?: StepTemplate) => void;
  children: React.ReactNode; // The existing RatingAlgorithmBuilder
}

// ============================================================================
// Animations
// ============================================================================

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 700px;
  animation: ${fadeIn} 0.3s ease-out;

  @media (max-width: 1400px) {
    gap: 20px;
  }
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const MainColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const TopBarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const TopBarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const BuilderCanvas = styled.div`
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

// ============================================================================
// Validation Engine
// ============================================================================

const validateSteps = (steps: RatingStep[]): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  const factorSteps = steps.filter(s => s.stepType === 'factor');

  if (factorSteps.length === 0) {
    issues.push({
      id: 'no-steps',
      severity: 'warning',
      message: 'No rating steps defined',
      code: 'EMPTY_ALGORITHM',
    });
  }

  factorSteps.forEach((step, index) => {
    if (!step.stepName?.trim()) {
      issues.push({
        id: `missing-name-${step.id}`,
        severity: 'error',
        message: `Step ${index + 1} has no name`,
        stepId: step.id,
        code: 'MISSING_NAME',
      });
    }

    if (step.value === undefined || step.value === null) {
      issues.push({
        id: `missing-value-${step.id}`,
        severity: 'warning',
        message: `"${step.stepName || `Step ${index + 1}`}" has no value`,
        stepId: step.id,
        code: 'MISSING_VALUE',
      });
    }

    if (step.minCap !== undefined && step.maxCap !== undefined && step.minCap > step.maxCap) {
      issues.push({
        id: `invalid-caps-${step.id}`,
        severity: 'error',
        message: `"${step.stepName}" has min cap > max cap`,
        stepId: step.id,
        code: 'INVALID_CAPS',
      });
    }
  });

  return issues;
};

// ============================================================================
// Component
// ============================================================================

export const EnhancedRatingBuilder: React.FC<EnhancedRatingBuilderProps> = ({
  steps,
  onAddStep,
  children,
}) => {
  // Validation
  const validationIssues = useMemo(() => validateSteps(steps), [steps]);

  // Handlers
  const handleIssueClick = useCallback((stepId: string) => {
    // Just focus the step in the builder - could scroll to it
    // TODO: Scroll to or highlight the problematic step
  }, []);

  const handleSelectTemplate = useCallback((template: StepTemplate) => {
    onAddStep(template);
  }, [onAddStep]);

  const handleAddBlankStep = useCallback(() => {
    onAddStep();
  }, [onAddStep]);

  return (
    <Container>
      <MainColumn>
        {/* Validation Issues Strip */}
        <ValidationIssuesComponent
          issues={validationIssues}
          onIssueClick={handleIssueClick}
        />

        {/* Builder Canvas (existing RatingAlgorithmBuilder) */}
        <BuilderCanvas>
          {children}
        </BuilderCanvas>
      </MainColumn>
    </Container>
  );
};

export default EnhancedRatingBuilder;

