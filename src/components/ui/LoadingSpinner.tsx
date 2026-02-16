import React from 'react';
import styled, { css } from 'styled-components';
import { spin, pulseDots as pulse, fadeIn } from '@/styles/animations';
import { color, neutral, accent, space, radius, shadow, transition, z, reducedMotion } from '../../ui/tokens';
import { type as typeScale } from '../../ui/tokens';

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
  xs: { size: '12px', borderWidth: '1.5px', dotSize: '3px', gap: space[0.5] },
  sm: { size: space[4], borderWidth: '2px', dotSize: space[1], gap: space[0.5] },
  md: { size: space[6], borderWidth: '2.5px', dotSize: space[1], gap: space[1] },
  lg: { size: space[8], borderWidth: '3px', dotSize: space[1.5], gap: space[1] },
  xl: { size: space[12], borderWidth: '4px', dotSize: space[2], gap: space[1] },
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
  gap: ${space[3]};

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
  gap: ${space[4]};
  background: ${neutral[0]}d9;
  backdrop-filter: blur(4px);
  z-index: ${z.overlay};
  animation: ${fadeIn} 0.2s ease-out;

  @media ${reducedMotion} {
    animation: none;
  }
`;

const CircularSpinner = styled.div.withConfig({
  shouldForwardProp: (prop) => !['$size', '$color', '$borderWidth'].includes(prop),
})<{ $size: string; $color: string; $borderWidth: string }>`
  width: ${props => props.$size};
  height: ${props => props.$size};
  border: ${props => props.$borderWidth} solid ${neutral[200]};
  border-top-color: ${props => props.$color};
  border-radius: ${radius.full};
  animation: ${spin} 0.8s linear infinite;

  @media ${reducedMotion} {
    animation-duration: 1.5s;
  }
`;

const RingSpinner = styled.div.withConfig({
  shouldForwardProp: (prop) => !['$size', '$color', '$borderWidth'].includes(prop),
})<{ $size: string; $color: string; $borderWidth: string }>`
  width: ${props => props.$size};
  height: ${props => props.$size};
  border: ${props => props.$borderWidth} solid transparent;
  border-top-color: ${props => props.$color};
  border-bottom-color: ${props => props.$color};
  border-radius: ${radius.full};
  animation: ${spin} 1s linear infinite;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: ${space[0.5]};
    left: ${space[0.5]};
    right: ${space[0.5]};
    bottom: ${space[0.5]};
    border: ${props => props.$borderWidth} solid transparent;
    border-left-color: ${props => props.$color};
    border-right-color: ${props => props.$color};
    border-radius: ${radius.full};
    animation: ${spin} 0.5s linear infinite reverse;
    opacity: 0.6;
  }

  @media ${reducedMotion} {
    animation-duration: 1.5s;
    &::before { animation-duration: 1s; }
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
  border-radius: ${radius.full};
  animation: ${pulse} 1.4s ease-in-out infinite both;
  animation-delay: ${props => props.$delay};

  @media ${reducedMotion} {
    animation: none;
    opacity: 0.7;
  }
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
  border-radius: ${radius.xs};
  animation: ${pulse} 1.2s ease-in-out infinite;
  animation-delay: ${props => props.$delay};

  @media ${reducedMotion} {
    animation: none;
    opacity: 0.7;
  }
`;

const Label = styled.span`
  font-size: ${typeScale.bodySm.size};
  font-weight: ${typeScale.label.weight};
  color: ${color.textSecondary};
  text-align: center;
`;

/* ---------- Main Component ---------- */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  type = 'circular',
  size = 'md',
  color: spinnerColor = accent[500],
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
            <Dot $color={spinnerColor} $delay="0s" $size={sizeConfig.dotSize} />
            <Dot $color={spinnerColor} $delay="0.16s" $size={sizeConfig.dotSize} />
            <Dot $color={spinnerColor} $delay="0.32s" $size={sizeConfig.dotSize} />
          </DotsContainer>
        );

      case 'bars':
        return (
          <BarsContainer $size={sizeConfig.size} $gap={sizeConfig.gap}>
            <Bar $color={spinnerColor} $delay="0s" $width={sizeConfig.gap} />
            <Bar $color={spinnerColor} $delay="0.1s" $width={sizeConfig.gap} />
            <Bar $color={spinnerColor} $delay="0.2s" $width={sizeConfig.gap} />
            <Bar $color={spinnerColor} $delay="0.3s" $width={sizeConfig.gap} />
          </BarsContainer>
        );

      case 'ring':
        return (
          <RingSpinner
            $size={sizeConfig.size}
            $color={spinnerColor}
            $borderWidth={sizeConfig.borderWidth}
          />
        );

      case 'circular':
      default:
        return (
          <CircularSpinner
            $size={sizeConfig.size}
            $color={spinnerColor}
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
