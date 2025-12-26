/**
 * Icon - Unified icon component with accessibility and consistent sizing
 * 
 * Provides a wrapper for Heroicons (or any SVG icon) with:
 * - Consistent sizing scale
 * - Accessibility support (aria-label, aria-hidden)
 * - Color theming
 * - Optional animation
 */

import React from 'react';
import styled, { css, keyframes } from 'styled-components';

// Icon size scale
const sizeMap = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
} as const;

type IconSize = keyof typeof sizeMap;

interface IconProps {
  /** The icon component to render (e.g., PlusIcon from Heroicons) */
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /** Size of the icon */
  size?: IconSize;
  /** Custom size in pixels (overrides size prop) */
  customSize?: number;
  /** Color of the icon (theme color key or CSS color) */
  color?: string;
  /** Accessible label - required when icon is standalone (not decorative) */
  label?: string;
  /** Additional CSS class */
  className?: string;
  /** Animation variant */
  animation?: 'spin' | 'pulse' | 'bounce' | 'none';
  /** Click handler */
  onClick?: () => void;
}

// Animations
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
`;

const getAnimation = (animation: IconProps['animation']) => {
  switch (animation) {
    case 'spin':
      return css`animation: ${spin} 1s linear infinite;`;
    case 'pulse':
      return css`animation: ${pulse} 1.5s ease-in-out infinite;`;
    case 'bounce':
      return css`animation: ${bounce} 1s ease-in-out infinite;`;
    default:
      return '';
  }
};

const IconWrapper = styled.span<{
  $size: number;
  $color?: string;
  $animation?: IconProps['animation'];
  $clickable?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  flex-shrink: 0;
  color: ${({ $color, theme }) => {
    if (!$color) return 'currentColor';
    // Check if it's a theme color key
    if ($color in (theme.colours || {})) {
      return (theme.colours as Record<string, string>)[$color];
    }
    return $color;
  }};
  ${({ $animation }) => $animation && getAnimation($animation)}
  ${({ $clickable }) => $clickable && css`
    cursor: pointer;
    transition: opacity 0.2s ease, transform 0.2s ease;
    
    &:hover {
      opacity: 0.8;
    }
    
    &:active {
      transform: scale(0.95);
    }
  `}

  svg {
    width: 100%;
    height: 100%;
  }
`;

/**
 * Icon component for rendering icons with consistent sizing and accessibility
 * 
 * @example
 * // Decorative icon (aria-hidden automatically applied)
 * <Icon icon={CheckIcon} size="md" color="success" />
 * 
 * @example
 * // Accessible standalone icon
 * <Icon icon={PlusIcon} size="lg" label="Add item" onClick={handleAdd} />
 */
export const Icon: React.FC<IconProps> = ({
  icon: IconComponent,
  size = 'md',
  customSize,
  color,
  label,
  className,
  animation = 'none',
  onClick,
}) => {
  const pixelSize = customSize ?? sizeMap[size];
  const isInteractive = !!onClick;
  const isDecorative = !label;

  return (
    <IconWrapper
      $size={pixelSize}
      $color={color}
      $animation={animation}
      $clickable={isInteractive}
      className={className}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={label}
      aria-hidden={isDecorative}
      onKeyDown={isInteractive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
    >
      <IconComponent />
    </IconWrapper>
  );
};

export default Icon;
export { sizeMap as iconSizes };
export type { IconSize, IconProps };

