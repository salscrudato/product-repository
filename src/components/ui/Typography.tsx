import styled from 'styled-components';

// Heading components with consistent styling
export const H1 = styled.h1`
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
  color: #1f2937;
  margin: 0 0 16px 0;
  letter-spacing: -0.02em;

  @media (max-width: 768px) {
    font-size: 28px;
  }
`;

export const H2 = styled.h2`
  font-size: 24px;
  font-weight: 600;
  line-height: 1.3;
  color: #1f2937;
  margin: 0 0 12px 0;
  letter-spacing: -0.01em;

  @media (max-width: 768px) {
    font-size: 22px;
  }
`;

export const H3 = styled.h3`
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
  color: #1f2937;
  margin: 0 0 12px 0;
  letter-spacing: -0.01em;

  @media (max-width: 768px) {
    font-size: 18px;
  }
`;

export const H4 = styled.h4`
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  color: #1f2937;
  margin: 0 0 8px 0;

  @media (max-width: 768px) {
    font-size: 16px;
  }
`;

export const H5 = styled.h5`
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
  color: #1f2937;
  margin: 0 0 8px 0;
`;

export const H6 = styled.h6`
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: #1f2937;
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

// Gradient heading for hero sections
export const GradientHeading = styled(H1)`
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

// Body text components
export const Body = styled.p`
  font-size: 15px;
  font-weight: 400;
  line-height: 1.6;
  color: #4b5563;
  margin: 0 0 16px 0;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const BodyLarge = styled(Body)`
  font-size: 16px;
  line-height: 1.7;
`;

export const BodySmall = styled.p`
  font-size: 13px;
  font-weight: 400;
  line-height: 1.5;
  color: #6b7280;
  margin: 0 0 12px 0;

  &:last-child {
    margin-bottom: 0;
  }
`;

// Label component for form labels and metadata
export const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
  letter-spacing: -0.01em;
`;

export const Caption = styled.span`
  font-size: 12px;
  font-weight: 400;
  color: #9ca3af;
  line-height: 1.4;
`;

// Specialized text components for insurance context
export const PolicyNumber = styled.span`
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  background: rgba(99, 102, 241, 0.05);
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid rgba(99, 102, 241, 0.1);
`;

export const CurrencyAmount = styled.span<{ $large?: boolean }>`
  font-size: ${props => props.$large ? '24px' : '16px'};
  font-weight: 700;
  color: #047857;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
`;

export const PercentageValue = styled.span<{ $positive?: boolean }>`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.$positive ? '#047857' : '#dc2626'};
  font-variant-numeric: tabular-nums;
`;

// Link component
export const Link = styled.a`
  color: #6366f1;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  cursor: pointer;

  &:hover {
    color: #4f46e5;
    text-decoration: underline;
  }

  &:active {
    color: #4338ca;
  }
`;

// Muted text for secondary information
export const Muted = styled.span`
  color: #9ca3af;
  font-size: 14px;
`;

// Strong emphasis
export const Strong = styled.strong`
  font-weight: 600;
  color: #1f2937;
`;

// Code/monospace text
export const Code = styled.code`
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  color: #1f2937;
`;

// Section heading with underline
export const SectionHeading = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #e5e7eb;
  letter-spacing: -0.01em;
`;

// Subsection heading
export const SubsectionHeading = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 13px;
`;

// Helper text for forms
export const HelperText = styled.p`
  font-size: 13px;
  color: #6b7280;
  margin: 6px 0 0 0;
  line-height: 1.5;
`;

// Error text for forms
export const ErrorText = styled.p`
  font-size: 13px;
  color: #dc2626;
  margin: 6px 0 0 0;
  line-height: 1.5;
  font-weight: 500;
`;

// Success text
export const SuccessText = styled.p`
  font-size: 13px;
  color: #047857;
  margin: 6px 0 0 0;
  line-height: 1.5;
  font-weight: 500;
`;

// Truncated text with ellipsis
export const TruncatedText = styled.span<{ $maxWidth?: string }>`
  display: inline-block;
  max-width: ${props => props.$maxWidth || '200px'};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
`;

