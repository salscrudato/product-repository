/**
 * Typography - Unified typography components with design token integration
 * 
 * Provides consistent typography across the application with proper
 * semantic HTML, accessibility, and design system compliance.
 */

import React from 'react';
import styled, { css } from 'styled-components';

// Base styles shared across typography components
const baseStyles = css`
  margin: 0;
  font-family: ${({ theme }) => theme.fontFamily};
`;

// Heading variants
export const H1 = styled.h1`
  ${baseStyles}
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colours.text};
`;

export const H2 = styled.h2`
  ${baseStyles}
  font-size: 24px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colours.text};
`;

export const H3 = styled.h3`
  ${baseStyles}
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
  color: ${({ theme }) => theme.colours.text};
`;

export const H4 = styled.h4`
  ${baseStyles}
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  color: ${({ theme }) => theme.colours.text};
`;

// Body text variants
export const Body = styled.p`
  ${baseStyles}
  font-size: 14px;
  font-weight: 400;
  line-height: 1.6;
  color: ${({ theme }) => theme.colours.text};
`;

export const BodyLarge = styled.p`
  ${baseStyles}
  font-size: 16px;
  font-weight: 400;
  line-height: 1.6;
  color: ${({ theme }) => theme.colours.text};
`;

export const BodySmall = styled.p`
  ${baseStyles}
  font-size: 13px;
  font-weight: 400;
  line-height: 1.5;
  color: ${({ theme }) => theme.colours.textSecondary};
`;

// Secondary/muted text
export const TextMuted = styled.span`
  ${baseStyles}
  font-size: 14px;
  color: ${({ theme }) => theme.colours.textMuted};
`;

export const TextSecondary = styled.span`
  ${baseStyles}
  font-size: 14px;
  color: ${({ theme }) => theme.colours.textSecondary};
`;

// Labels
export const Label = styled.label`
  ${baseStyles}
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colours.text};
  margin-bottom: 6px;
`;

export const LabelSmall = styled.label`
  ${baseStyles}
  display: block;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colours.textMuted};
  margin-bottom: 4px;
`;

// Caption
export const Caption = styled.span`
  ${baseStyles}
  font-size: 12px;
  line-height: 1.4;
  color: ${({ theme }) => theme.colours.textMuted};
`;

// Code/mono text
export const Code = styled.code`
  ${baseStyles}
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  padding: 2px 6px;
  background: ${({ theme }) => theme.colours.backgroundSubtle};
  border-radius: ${({ theme }) => theme.radiusSm};
  color: ${({ theme }) => theme.colours.text};
`;

// Link styled as text
export const TextLink = styled.a`
  ${baseStyles}
  font-size: 14px;
  color: ${({ theme }) => theme.colours.primary};
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colours.primaryDark};
    text-decoration: underline;
  }
`;

// Error text
export const TextError = styled.span`
  ${baseStyles}
  font-size: 13px;
  color: ${({ theme }) => theme.colours.error};
`;

// Success text
export const TextSuccess = styled.span`
  ${baseStyles}
  font-size: 13px;
  color: ${({ theme }) => theme.colours.success};
`;

// Truncated text with ellipsis
export const TruncatedText = styled.span<{ $maxWidth?: string }>`
  ${baseStyles}
  display: inline-block;
  max-width: ${({ $maxWidth }) => $maxWidth || '200px'};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export default {
  H1, H2, H3, H4,
  Body, BodyLarge, BodySmall,
  TextMuted, TextSecondary, TextError, TextSuccess,
  Label, LabelSmall, Caption, Code, TextLink, TruncatedText
};

