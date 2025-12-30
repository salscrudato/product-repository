/**
 * ProductHub Styled Components
 * Extracted from ProductHub.tsx for better organization and maintainability
 */

import styled from 'styled-components';

// ============ Header Action Buttons ============

export const HeaderActionButton = styled.button.withConfig({
  shouldForwardProp: (prop) => !['variant'].includes(prop),
})<{ variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${props => props.variant === 'secondary'
    ? 'rgba(255, 255, 255, 0.9)'
    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'};
  color: ${props => props.variant === 'secondary' ? '#6366f1' : '#ffffff'};
  border: ${props => props.variant === 'secondary' ? '1px solid rgba(99, 102, 241, 0.2)' : 'none'};
  border-radius: 12px;
  padding: 12px 20px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  box-shadow: ${props => props.variant === 'secondary'
    ? '0 2px 8px rgba(99, 102, 241, 0.1)'
    : '0 4px 16px rgba(99, 102, 241, 0.25)'};
  transition: all 0.3s ease;
  letter-spacing: -0.01em;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }

  &:hover {
    background: ${props => props.variant === 'secondary'
      ? 'rgba(99, 102, 241, 0.1)'
      : 'linear-gradient(135deg, #5b5bf6 0%, #7c3aed 100%)'};
    transform: translateY(-2px);
    box-shadow: ${props => props.variant === 'secondary'
      ? '0 4px 16px rgba(99, 102, 241, 0.2)'
      : '0 8px 24px rgba(99, 102, 241, 0.35)'};
    border-color: ${props => props.variant === 'secondary' ? 'rgba(99, 102, 241, 0.3)' : 'transparent'};

    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

// ============ Action Bar & Filter Bar ============

export const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  gap: 20px;
  flex-wrap: wrap;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  padding: 20px 24px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
`;

export const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  margin-bottom: 24px;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

export const FilterSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 8px;
  background: white;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #6366f1;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
  }

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

export const ClearFiltersButton = styled.button`
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.3);
  }
`;

export const ActionGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

// ============ Keyboard Hints ============

export const KeyboardHint = styled.div`
  display: flex;
  gap: 16px;
  padding: 12px 16px;
  background: rgba(99, 102, 241, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.1);
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 16px;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
`;

export const KeyboardShortcut = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;

  kbd {
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(226, 232, 240, 0.8);
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 11px;
    font-weight: 600;
    color: #374151;
  }
`;

// ============ Stats Bar ============

export const StatsBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  padding: 16px 24px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
  border-radius: 12px;
  border: 1px solid rgba(99, 102, 241, 0.1);
  margin-bottom: 24px;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 12px 16px;
  }
`;

export const StatBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  border: 1px solid rgba(226, 232, 240, 0.6);
`;

export const StatBoxValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #6366f1;
`;

export const StatBoxLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

// ============ Bulk Actions ============

export const BulkActionsToolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  margin-bottom: 16px;
  animation: slideDown 0.2s ease;

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export const BulkActionCount = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
`;

export const BulkActionButton = styled.button`
  padding: 8px 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

// ============ AI Suggestions Banner ============

export const SuggestionsBanner = styled.div`
  padding: 16px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  margin-bottom: 16px;
`;

export const SuggestionsTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #1e40af;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const SuggestionsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;

  li {
    font-size: 12px;
    color: #1e40af;
    padding-left: 20px;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      width: 16px;
      height: 16px;
      background: currentColor;
      mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18' /%3E%3C/svg%3E");
      mask-size: contain;
      mask-repeat: no-repeat;
    }
  }
`;

// ============ Toast Notifications ============

export const ToastContainer = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;

  @media (max-width: 640px) {
    bottom: 16px;
    right: 16px;
    left: 16px;
    max-width: none;
  }
`;

export const Toast = styled.div<{ $type?: 'success' | 'error' | 'info' }>`
  padding: 16px 20px;
  border-radius: 12px;
  background: ${props => {
    switch (props.$type) {
      case 'success': return '#dcfce7';
      case 'error': return '#fee2e2';
      case 'info': return '#dbeafe';
      default: return '#f3f4f6';
    }
  }};
  border: 1px solid ${props => {
    switch (props.$type) {
      case 'success': return '#86efac';
      case 'error': return '#fca5a5';
      case 'info': return '#93c5fd';
      default: return '#e5e7eb';
    }
  }};
  color: ${props => {
    switch (props.$type) {
      case 'success': return '#166534';
      case 'error': return '#991b1b';
      case 'info': return '#1e40af';
      default: return '#374151';
    }
  }};
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

// ============ Command Bar (Apple-inspired) ============

export const CommandBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 32px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 4px 12px rgba(0, 0, 0, 0.03),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 16px;
    padding: 1px;
    background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.2) 100%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
`;

export const CommandBarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const CommandBarCenter = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  max-width: 640px;
  min-width: 320px;
`;

export const CommandBarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;
