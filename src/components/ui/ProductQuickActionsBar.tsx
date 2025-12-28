/**
 * ProductQuickActionsBar - Unified floating quick actions for product pages
 * 
 * Provides context-aware quick actions that appear on all product-related pages
 * for common operations like navigation, AI assistance, and data management.
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import {
  HomeIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  MapIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  SparklesIcon,
  ArrowPathIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/solid';

// ============ Animations ============
const slideIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
`;

// ============ Styled Components ============
const BarContainer = styled.div<{ $isExpanded: boolean }>`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  animation: ${slideIn} 0.4s ease-out;
`;

const BarWrapper = styled.div<{ $isExpanded: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: ${({ $isExpanded }) => $isExpanded ? '12px 20px' : '8px 12px'};
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

const ActionButton = styled.button<{ $active?: boolean; $color?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 12px;
  background: ${({ $active, $color }) => 
    $active 
      ? ($color || 'linear-gradient(135deg, #6366f1, #8b5cf6)') 
      : 'rgba(248, 250, 252, 0.8)'};
  color: ${({ $active }) => $active ? 'white' : '#64748b'};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${({ $active, $color }) => 
      $active 
        ? ($color || 'linear-gradient(135deg, #4f46e5, #7c3aed)') 
        : 'rgba(99, 102, 241, 0.1)'};
    color: ${({ $active }) => $active ? 'white' : '#6366f1'};
    transform: translateY(-2px);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const AIButton = styled(ActionButton)`
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  color: white;
  animation: ${pulse} 2s infinite;

  &:hover {
    background: linear-gradient(135deg, #7c3aed, #9333ea);
  }
`;

const ToggleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.8);
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const Divider = styled.div`
  width: 1px;
  height: 24px;
  background: rgba(226, 232, 240, 0.8);
  margin: 0 4px;
`;

// ============ Types ============
interface ProductQuickActionsBarProps {
  productId: string;
  currentPage?: 'dashboard' | 'coverage' | 'forms' | 'pricing' | 'states' | 'rules';
  onAIAssist?: () => void;
  onRefresh?: () => void;
}

// ============ Component ============
export const ProductQuickActionsBar: React.FC<ProductQuickActionsBarProps> = ({
  productId,
  currentPage,
  onAIAssist,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  return (
    <BarContainer $isExpanded={isExpanded}>
      <BarWrapper $isExpanded={isExpanded}>
        <ToggleButton onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronDownIcon /> : <ChevronUpIcon />}
        </ToggleButton>

        {isExpanded && (
          <>
            <Divider />
            <ActionButton $active={currentPage === 'dashboard'} onClick={() => handleNavigate(`/product360/${productId}`)}>
              <ChartBarIcon /> Dashboard
            </ActionButton>
            <ActionButton $active={currentPage === 'coverage'} onClick={() => handleNavigate(`/coverage/${productId}`)}>
              <ShieldCheckIcon /> Coverage
            </ActionButton>
            <ActionButton $active={currentPage === 'forms'} onClick={() => handleNavigate(`/forms/${productId}`)}>
              <DocumentTextIcon /> Forms
            </ActionButton>
            <ActionButton $active={currentPage === 'pricing'} onClick={() => handleNavigate(`/pricing/${productId}`)}>
              <CurrencyDollarIcon /> Pricing
            </ActionButton>
            <ActionButton $active={currentPage === 'states'} onClick={() => handleNavigate(`/states/${productId}`)}>
              <MapIcon /> States
            </ActionButton>
            <ActionButton $active={currentPage === 'rules'} onClick={() => handleNavigate(`/rules/${productId}`)}>
              <Cog6ToothIcon /> Rules
            </ActionButton>
            <Divider />
            {onRefresh && (
              <ActionButton onClick={onRefresh}>
                <ArrowPathIcon /> Refresh
              </ActionButton>
            )}
            {onAIAssist && (
              <AIButton onClick={onAIAssist}>
                <SparklesIcon /> AI Assist
              </AIButton>
            )}
          </>
        )}
      </BarWrapper>
    </BarContainer>
  );
};

export default ProductQuickActionsBar;

