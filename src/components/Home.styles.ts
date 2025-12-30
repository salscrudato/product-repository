/**
 * Home Page Styled Components
 * Extracted from Home.tsx for better organization and maintainability
 */

import styled from 'styled-components';
import { fadeInUp, slideInLeft, slideInRight, pulseGlow, typingDots } from '@/styles/animations';

// ============ Page Layout ============

export const Page = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
  display: flex;
  flex-direction: column;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 300px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%);
    opacity: 0.08;
    z-index: 0;
    pointer-events: none;
  }
`;

export const MainContent = styled.main<{ $isEmpty: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  padding: 0;
  height: calc(100vh - 64px);
  position: relative;
  z-index: 1;

  ${({ $isEmpty }) => $isEmpty && `
    justify-content: center;
    align-items: center;
    padding-top: 60px;
  `}

  @media (max-width: 768px) {
    height: calc(100vh - 56px);

    ${({ $isEmpty }: { $isEmpty: boolean }) => $isEmpty && `
      padding-top: 40px;
    `}
  }
`;

// ============ Chat Container ============

export const ChatContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 0;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0,0,0,0.15);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(0,0,0,0.25);
  }

  @media (max-width: 768px) {
    padding: 16px;
    gap: 16px;
  }
`;

// ============ Empty State ============

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px 24px;
  text-align: center;
  gap: 12px;
  width: 100%;
  max-width: 700px;

  svg {
    width: 48px;
    height: 48px;
    color: #94a3b8;
    margin-bottom: 4px;
  }

  h2 {
    font-size: 22px;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  p {
    font-size: 14px;
    color: #64748b;
    margin: 0;
    max-width: 480px;
    line-height: 1.6;
  }

  @media (max-width: 768px) {
    padding: 24px 16px 20px;

    svg {
      width: 40px;
      height: 40px;
    }

    h2 {
      font-size: 18px;
    }

    p {
      font-size: 13px;
    }
  }
`;

export const CenteredContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  width: 100%;
  max-width: 700px;
  padding: 0 24px;

  @media (max-width: 768px) {
    padding: 0 16px;
    gap: 24px;
  }
`;

// ============ Message Components ============

export const MessageGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`;

export const UserMessage = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 12px 0;
  animation: ${slideInRight} 0.3s ease-out;

  .content {
    max-width: 85%;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    padding: 14px 18px;
    border-radius: 20px 20px 4px 20px;
    font-size: 14px;
    line-height: 1.6;
    box-shadow: 0 2px 12px rgba(99, 102, 241, 0.25);
    white-space: pre-wrap;
    word-break: break-word;
  }

  @media (max-width: 768px) {
    .content {
      max-width: 90%;
      padding: 12px 16px;
      font-size: 14px;
    }
  }
`;

export const AssistantMessage = styled.div`
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 12px 0;
  animation: ${slideInLeft} 0.3s ease-out;

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);

    svg {
      width: 18px;
      height: 18px;
      color: white;
    }
  }

  .content {
    flex: 1;
    max-width: calc(100% - 50px);
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid #e2e8f0;
    border-radius: 4px 20px 20px 20px;
    padding: 16px 20px;
    font-size: 14px;
    line-height: 1.7;
    color: #1e293b;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    position: relative;
  }

  .message-actions {
    display: flex;
    gap: 6px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #f1f5f9;
  }

  @media (max-width: 768px) {
    gap: 10px;

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 10px;

      svg {
        width: 16px;
        height: 16px;
      }
    }

    .content {
      padding: 14px 16px;
      font-size: 14px;
    }
  }
`;

export const ActionButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: ${({ $active }) => $active ? '#dcfce7' : '#f8fafc'};
  color: ${({ $active }) => $active ? '#16a34a' : '#64748b'};
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    background: ${({ $active }) => $active ? '#dcfce7' : '#e2e8f0'};
    color: ${({ $active }) => $active ? '#16a34a' : '#475569'};
  }
`;

// ============ Input Components ============

export const InputContainer = styled.div<{ $isCentered?: boolean }>`
  padding: ${({ $isCentered }) => $isCentered ? '0' : '16px 16px 24px'};
  background: ${({ $isCentered }) => $isCentered ? 'transparent' : 'linear-gradient(to top, #f8fafc 0%, transparent 100%)'};
  width: 100%;
  max-width: ${({ $isCentered }) => $isCentered ? '700px' : 'none'};

  @media (max-width: 768px) {
    padding: ${({ $isCentered }) => $isCentered ? '0' : '12px 16px 20px'};
  }
`;

export const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

export const InputField = styled.textarea`
  width: 100%;
  padding: 14px 52px 14px 18px;
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  font-size: 14px;
  line-height: 1.5;
  color: #1e293b;
  background: #ffffff;
  resize: none;
  min-height: 48px;
  max-height: 200px;
  overflow-y: auto;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  &::placeholder {
    color: #94a3b8;
  }

  &:focus {
    outline: none;
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1), 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  &:disabled {
    background: #f8fafc;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    padding: 12px 48px 12px 16px;
    font-size: 16px;
    min-height: 44px;
  }
`;

export const SendButton = styled.button`
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #7c3aed;
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 2px 6px rgba(124, 58, 237, 0.3);

  svg {
    width: 16px;
    height: 16px;
    stroke-width: 2.5;
  }

  &:hover:not(:disabled) {
    background: #6d28d9;
    transform: translateY(-50%) scale(1.05);
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(-50%) scale(0.95);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: translateY(-50%);
    background: #cbd5e1;
    box-shadow: none;
  }

  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
    right: 6px;

    svg {
      width: 14px;
      height: 14px;
    }
  }
`;

export const ClearButton = styled.button`
  position: fixed;
  bottom: 100px;
  right: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    background: #f8fafc;
    transform: scale(1.05);
  }

  @media (max-width: 768px) {
    bottom: 80px;
    right: 16px;
    width: 44px;
    height: 44px;

    svg {
      width: 18px;
      height: 18px;
    }
  }
`;

// ============ Loading Indicator ============

export const LoadingIndicator = styled.div`
  display: flex;
  gap: 14px;
  align-items: flex-start;
  animation: ${fadeInUp} 0.3s ease-out;

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    animation: ${pulseGlow} 2s infinite;

    svg {
      width: 18px;
      height: 18px;
      color: white;
    }
  }

  .typing-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid #e2e8f0;
    border-radius: 4px 20px 20px 20px;
    padding: 16px 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  }

  .typing-text {
    font-size: 13px;
    color: #64748b;
    font-weight: 500;
  }

  .dots {
    display: flex;
    gap: 6px;

    span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      animation: ${typingDots} 1.4s infinite ease-in-out;

      &:nth-child(1) {
        animation-delay: 0s;
      }

      &:nth-child(2) {
        animation-delay: 0.2s;
      }

      &:nth-child(3) {
        animation-delay: 0.4s;
      }
    }
  }
`;
