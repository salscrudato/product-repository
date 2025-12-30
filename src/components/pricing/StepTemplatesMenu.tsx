import React, { useState, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  PlusIcon,
  ChevronDownIcon,
  CurrencyDollarIcon,
  CalculatorIcon,
  AdjustmentsHorizontalIcon,
  ReceiptPercentIcon,
  DocumentPlusIcon,
  ArrowPathRoundedSquareIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import type { StepTemplate } from '../../types/pricing';

// ============================================================================
// Types
// ============================================================================

interface StepTemplatesMenuProps {
  onSelectTemplate: (template: StepTemplate) => void;
  onAddBlankStep: () => void;
}

interface TemplateOption {
  id: StepTemplate;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

// ============================================================================
// Template Definitions
// ============================================================================

const TEMPLATES: TemplateOption[] = [
  {
    id: 'base-rate',
    name: 'Base Rate',
    description: 'Starting premium rate per exposure unit',
    icon: <CurrencyDollarIcon />,
    color: '#6366f1',
  },
  {
    id: 'exposure-basis',
    name: 'Exposure Basis',
    description: 'Multiply by exposure (limit, payroll, etc.)',
    icon: <CalculatorIcon />,
    color: '#8b5cf6',
  },
  {
    id: 'factor',
    name: 'Factor',
    description: 'Multiplicative adjustment (e.g., 1.10)',
    icon: <AdjustmentsHorizontalIcon />,
    color: '#0ea5e9',
  },
  {
    id: 'modifier',
    name: 'Modifier',
    description: 'Credit/debit modifier (e.g., 0.95)',
    icon: <ReceiptPercentIcon />,
    color: '#10b981',
  },
  {
    id: 'fee-surcharge',
    name: 'Fee / Surcharge',
    description: 'Flat fee or percentage surcharge',
    icon: <DocumentPlusIcon />,
    color: '#f59e0b',
  },
  {
    id: 'minimum-premium',
    name: 'Minimum Premium',
    description: 'Floor for calculated premium',
    icon: <ShieldCheckIcon />,
    color: '#ef4444',
  },
  {
    id: 'rounding',
    name: 'Rounding',
    description: 'Round to nearest dollar/cent',
    icon: <ArrowPathRoundedSquareIcon />,
    color: '#64748b',
  },
];

// ============================================================================
// Animations
// ============================================================================

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-8px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div`
  position: relative;
  display: inline-block;
`;

const TriggerButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.35);
  }
  
  &:active { transform: translateY(0); }
  
  svg { width: 18px; height: 18px; }
`;

const Dropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 320px;
  background: white;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  overflow: hidden;
  display: ${({ $isOpen }) => $isOpen ? 'block' : 'none'};
  animation: ${fadeIn} 0.2s ease-out;
`;

const DropdownHeader = styled.div`
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.95) 100%);
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TemplateList = styled.div`
  max-height: 360px;
  overflow-y: auto;
  padding: 8px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(203, 213, 225, 0.5); border-radius: 3px; }
`;

const TemplateItem = styled.button<{ $color: string }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(248, 250, 252, 0.8);
    border-color: rgba(226, 232, 240, 0.6);
  }
`;

const TemplateIcon = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${({ $color }) => `${$color}15`};
  flex-shrink: 0;

  svg {
    width: 18px;
    height: 18px;
    color: ${({ $color }) => $color};
  }
`;

const TemplateInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const TemplateName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 2px;
`;

const TemplateDescription = styled.div`
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
`;

const Divider = styled.div`
  height: 1px;
  background: rgba(226, 232, 240, 0.6);
  margin: 8px 0;
`;

const BlankStepButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: calc(100% - 16px);
  margin: 8px;
  padding: 10px 12px;
  background: rgba(248, 250, 252, 0.8);
  border: 1px dashed rgba(203, 213, 225, 0.8);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(241, 245, 249, 1);
    border-color: #6366f1;
    color: #6366f1;
  }

  svg { width: 16px; height: 16px; }
`;

// ============================================================================
// Component
// ============================================================================

export const StepTemplatesMenuComponent: React.FC<StepTemplatesMenuProps> = ({
  onSelectTemplate,
  onAddBlankStep,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectTemplate = (template: StepTemplate) => {
    onSelectTemplate(template);
    setIsOpen(false);
  };

  const handleAddBlank = () => {
    onAddBlankStep();
    setIsOpen(false);
  };

  return (
    <Container ref={containerRef}>
      <TriggerButton onClick={() => setIsOpen(!isOpen)}>
        <PlusIcon />
        Add Step
        <ChevronDownIcon style={{ width: 14, height: 14, marginLeft: -4 }} />
      </TriggerButton>

      <Dropdown $isOpen={isOpen}>
        <DropdownHeader>Step Templates</DropdownHeader>

        <TemplateList>
          {TEMPLATES.map(template => (
            <TemplateItem
              key={template.id}
              $color={template.color}
              onClick={() => handleSelectTemplate(template.id)}
            >
              <TemplateIcon $color={template.color}>
                {template.icon}
              </TemplateIcon>
              <TemplateInfo>
                <TemplateName>{template.name}</TemplateName>
                <TemplateDescription>{template.description}</TemplateDescription>
              </TemplateInfo>
            </TemplateItem>
          ))}
        </TemplateList>

        <Divider />

        <BlankStepButton onClick={handleAddBlank}>
          <PlusIcon />
          Add Blank Step
        </BlankStepButton>
      </Dropdown>
    </Container>
  );
};

export default StepTemplatesMenuComponent;

