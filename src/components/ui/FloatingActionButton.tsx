/**
 * FloatingActionButton - Mobile-first FAB component
 * 
 * Provides a floating action button with optional speed dial menu,
 * responsive positioning, and smooth animations.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/solid';

// ============ Animations ============
const scaleIn = keyframes`
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`;

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(45deg); }
`;

// ============ Types ============
export interface FABAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface FloatingActionButtonProps {
  icon?: React.ReactNode;
  onClick?: () => void;
  actions?: FABAction[];
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary';
  label?: string;
  disabled?: boolean;
  className?: string;
}

// ============ Styled Components ============
const FABContainer = styled.div<{ $position: string }>`
  position: fixed;
  z-index: 1000;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 12px;
  
  ${({ $position }) => {
    switch ($position) {
      case 'bottom-left': return css`bottom: 24px; left: 24px;`;
      case 'bottom-center': return css`bottom: 24px; left: 50%; transform: translateX(-50%);`;
      default: return css`bottom: 24px; right: 24px;`;
    }
  }}
  
  @media (max-width: 768px) {
    bottom: 16px;
    ${({ $position }) => $position === 'bottom-right' && css`right: 16px;`}
    ${({ $position }) => $position === 'bottom-left' && css`left: 16px;`}
  }
`;

const MainButton = styled.button<{ $size: string; $color: string; $isOpen: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${({ theme }) => theme.shadowPrimary};
  
  ${({ $size }) => {
    switch ($size) {
      case 'sm': return css`width: 48px; height: 48px; svg { width: 20px; height: 20px; }`;
      case 'lg': return css`width: 72px; height: 72px; svg { width: 32px; height: 32px; }`;
      default: return css`width: 56px; height: 56px; svg { width: 24px; height: 24px; }`;
    }
  }}
  
  ${({ $color, theme }) => $color === 'secondary' ? css`
    background: ${theme.colours.background};
    color: ${theme.colours.primary};
    border: 2px solid ${theme.colours.primary};
  ` : css`
    background: ${theme.colours.gradient};
    color: ${theme.colours.textInverse};
  `}
  
  &:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: ${({ theme }) => theme.shadowPrimaryHover};
  }
  
  &:active:not(:disabled) { transform: scale(0.95); }
  
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px ${({ theme }) => theme.colours.focusRing}, ${({ theme }) => theme.shadowPrimary};
  }
  
  &:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  
  svg {
    transition: transform 0.3s ease;
    ${({ $isOpen }) => $isOpen && css`transform: rotate(45deg);`}
  }
`;

const ActionsContainer = styled.div<{ $isOpen: boolean }>`
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  opacity: ${({ $isOpen }) => $isOpen ? 1 : 0};
  visibility: ${({ $isOpen }) => $isOpen ? 'visible' : 'hidden'};
  transform: ${({ $isOpen }) => $isOpen ? 'translateY(0)' : 'translateY(20px)'};
  transition: all 0.3s ease;
`;

const ActionItem = styled.div<{ $delay: number }>`
  display: flex;
  align-items: center;
  gap: 12px;
  animation: ${scaleIn} 0.2s ease forwards;
  animation-delay: ${({ $delay }) => $delay}ms;
  opacity: 0;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: ${({ theme }) => theme.colours.background};
  color: ${({ theme }) => theme.colours.primary};
  box-shadow: ${({ theme }) => theme.shadowMd};
  cursor: pointer;
  transition: all 0.2s ease;
  
  svg { width: 20px; height: 20px; }
  
  &:hover:not(:disabled) { background: ${({ theme }) => theme.colours.primaryLight}; transform: scale(1.1); }
  &:focus-visible { outline: none; box-shadow: 0 0 0 3px ${({ theme }) => theme.colours.focusRing}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ActionLabel = styled.span`
  padding: 6px 12px;
  background: ${({ theme }) => theme.colours.text};
  color: ${({ theme }) => theme.colours.textInverse};
  font-size: 13px;
  font-weight: 500;
  border-radius: ${({ theme }) => theme.radiusSm};
  white-space: nowrap;
  box-shadow: ${({ theme }) => theme.shadowSm};
`;

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ icon, onClick, actions, position = 'bottom-right', size = 'md', color = 'primary', label, disabled = false, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasActions = actions && actions.length > 0;
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleMainClick = useCallback(() => {
    if (hasActions) setIsOpen(prev => !prev);
    else onClick?.();
  }, [hasActions, onClick]);
  
  const handleActionClick = useCallback((action: FABAction) => {
    action.onClick();
    setIsOpen(false);
  }, []);
  
  return (
    <FABContainer ref={containerRef} $position={position} className={className}>
      <MainButton type="button" $size={size} $color={color} $isOpen={isOpen} disabled={disabled} onClick={handleMainClick} aria-label={label || (hasActions ? 'Open actions menu' : 'Action button')} aria-expanded={hasActions ? isOpen : undefined} aria-haspopup={hasActions ? 'menu' : undefined}>
        {icon || <PlusIcon />}
      </MainButton>
      {hasActions && (
        <ActionsContainer $isOpen={isOpen} role="menu">
          {actions.map((action, index) => (
            <ActionItem key={action.id} $delay={index * 50}>
              <ActionLabel>{action.label}</ActionLabel>
              <ActionButton type="button" role="menuitem" disabled={action.disabled} onClick={() => handleActionClick(action)} aria-label={action.label}>{action.icon}</ActionButton>
            </ActionItem>
          ))}
        </ActionsContainer>
      )}
    </FABContainer>
  );
};

export default FloatingActionButton;

