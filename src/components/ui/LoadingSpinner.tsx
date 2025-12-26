import React from 'react';
import styled, { keyframes, css } from 'styled-components';

/* ---------- Animations ---------- */
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

/* ---------- Types ---------- */
type SpinnerType = 'circular' | 'dots' | 'bars' | 'ring';
type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | string;

interface LoadingSpinnerProps {
  type?: SpinnerType;
  size?: SpinnerSize;
  color?: string;
  className?: string;
  label?: string;
  overlay?: boolean;
  fullScreen?: boolean;
  centered?: boolean;
}

/* ---------- Size Presets ---------- */
const sizePresets: Record<string, { size: string; borderWidth: string; dotSize: string; gap: string }> = {
  xs: { size: '12px', borderWidth: '1.5px', dotSize: '3px', gap: '2px' },
  sm: { size: '16px', borderWidth: '2px', dotSize: '4px', gap: '2px' },
  md: { size: '24px', borderWidth: '2.5px', dotSize: '5px', gap: '3px' },
  lg: { size: '32px', borderWidth: '3px', dotSize: '6px', gap: '4px' },
  xl: { size: '48px', borderWidth: '4px', dotSize: '8px', gap: '5px' },
};

const getSizeConfig = (size: SpinnerSize) => {
  if (typeof size === 'string' && sizePresets[size]) {
    return sizePresets[size];
  }
  // Custom size - calculate proportional values
  const numericSize = parseInt(size as string, 10) || 16;
  return {
    size: typeof size === 'string' && size.includes('px') ? size : `${numericSize}px`,
    borderWidth: `${Math.max(1.5, numericSize / 8)}px`,
    dotSize: `${Math.max(3, numericSize / 4)}px`,
    gap: `${Math.max(2, numericSize / 8)}px`,
  };
};

/* ---------- Styled Components ---------- */
const SpinnerContainer = styled.div<{ $centered?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;

  ${({ $centered }) => $centered && css`
    width: 100%;
    height: 100%;
    min-height: 120px;
  `}
`;

const OverlayContainer = styled.div<{ $fullScreen?: boolean }>`
  position: ${({ $fullScreen }) => $fullScreen ? 'fixed' : 'absolute'};
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 16px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(4px);
  z-index: ${({ theme }) => theme.zIndex?.overlay || 300};
  animation: ${fadeIn} 0.2s ease-out;
`;

const CircularSpinner = styled.div.withConfig({
  shouldForwardProp: (prop) => !['$size', '$color', '$borderWidth'].includes(prop),
})<{ $size: string; $color: string; $borderWidth: string }>`
  width: ${props => props.$size};
  height: ${props => props.$size};
  border: ${props => props.$borderWidth} solid rgba(0, 0, 0, 0.1);
  border-top-color: ${props => props.$color};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const RingSpinner = styled.div.withConfig({
  shouldForwardProp: (prop) => !['$size', '$color', '$borderWidth'].includes(prop),
})<{ $size: string; $color: string; $borderWidth: string }>`
  width: ${props => props.$size};
  height: ${props => props.$size};
  border: ${props => props.$borderWidth} solid transparent;
  border-top-color: ${props => props.$color};
  border-bottom-color: ${props => props.$color};
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    right: 2px;
    bottom: 2px;
    border: ${props => props.$borderWidth} solid transparent;
    border-left-color: ${props => props.$color};
    border-right-color: ${props => props.$color};
    border-radius: 50%;
    animation: ${spin} 0.5s linear infinite reverse;
    opacity: 0.6;
  }
`;

const DotsContainer = styled.div<{ $gap: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${props => props.$gap};
`;

const Dot = styled.div.withConfig({
  shouldForwardProp: (prop) => !['$color', '$delay', '$size'].includes(prop),
})<{ $color: string; $delay: string; $size: string }>`
  width: ${props => props.$size};
  height: ${props => props.$size};
  background-color: ${props => props.$color};
  border-radius: 50%;
  animation: ${pulse} 1.4s ease-in-out infinite both;
  animation-delay: ${props => props.$delay};
`;

const BarsContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => !['$size', '$gap'].includes(prop),
})<{ $size: string; $gap: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${props => props.$gap};
  height: ${props => props.$size};
`;

const Bar = styled.div.withConfig({
  shouldForwardProp: (prop) => !['$color', '$delay', '$width'].includes(prop),
})<{ $color: string; $delay: string; $width: string }>`
  width: ${props => props.$width};
  height: 100%;
  background-color: ${props => props.$color};
  border-radius: 2px;
  animation: ${pulse} 1.2s ease-in-out infinite;
  animation-delay: ${props => props.$delay};
`;

const Label = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  text-align: center;
`;

/* ---------- Main Component ---------- */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  type = 'circular',
  size = 'md',
  color = '#6366f1',
  className = '',
  label,
  overlay = false,
  fullScreen = false,
  centered = false,
}) => {
  const sizeConfig = getSizeConfig(size);

  const renderSpinner = () => {
    switch (type) {
      case 'dots':
        return (
          <DotsContainer $gap={sizeConfig.gap}>
            <Dot $color={color} $delay="0s" $size={sizeConfig.dotSize} />
            <Dot $color={color} $delay="0.16s" $size={sizeConfig.dotSize} />
            <Dot $color={color} $delay="0.32s" $size={sizeConfig.dotSize} />
          </DotsContainer>
        );

      case 'bars':
        return (
          <BarsContainer $size={sizeConfig.size} $gap={sizeConfig.gap}>
            <Bar $color={color} $delay="0s" $width={sizeConfig.gap} />
            <Bar $color={color} $delay="0.1s" $width={sizeConfig.gap} />
            <Bar $color={color} $delay="0.2s" $width={sizeConfig.gap} />
            <Bar $color={color} $delay="0.3s" $width={sizeConfig.gap} />
          </BarsContainer>
        );

      case 'ring':
        return (
          <RingSpinner
            $size={sizeConfig.size}
            $color={color}
            $borderWidth={sizeConfig.borderWidth}
          />
        );

      case 'circular':
      default:
        return (
          <CircularSpinner
            $size={sizeConfig.size}
            $color={color}
            $borderWidth={sizeConfig.borderWidth}
          />
        );
    }
  };

  const spinnerContent = (
    <>
      {renderSpinner()}
      {label && <Label>{label}</Label>}
    </>
  );

  // Overlay variant
  if (overlay || fullScreen) {
    return (
      <OverlayContainer
        $fullScreen={fullScreen}
        role="status"
        aria-live="polite"
        aria-label={label || 'Loading'}
      >
        {spinnerContent}
      </OverlayContainer>
    );
  }

  return (
    <SpinnerContainer
      className={className}
      $centered={centered}
      role="status"
      aria-live="polite"
      aria-label={label || 'Loading'}
    >
      {spinnerContent}
    </SpinnerContainer>
  );
};

/* ---------- Page Loading Spinner - Full page overlay ---------- */
export const PageLoadingSpinner: React.FC<{ label?: string }> = ({ label = 'Loading...' }) => (
  <LoadingSpinner
    type="ring"
    size="lg"
    fullScreen
    label={label}
  />
);

/* ---------- Inline Loading Spinner - For buttons and inline content ---------- */
export const InlineSpinner: React.FC<{ size?: SpinnerSize; color?: string }> = ({
  size = 'sm',
  color = 'currentColor'
}) => (
  <LoadingSpinner type="circular" size={size} color={color} />
);

/* ---------- Content Loading Spinner - For content areas ---------- */
export const ContentLoadingSpinner: React.FC<{ label?: string }> = ({ label }) => (
  <LoadingSpinner type="dots" size="md" centered label={label} />
);

export default LoadingSpinner;
