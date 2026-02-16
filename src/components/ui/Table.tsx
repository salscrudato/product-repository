import styled, { css, keyframes } from 'styled-components';
import {
  color, neutral, accent, space, radius, shadow, border as borderToken,
  fontFamily, type as typeScale, transition, focusRingStyle,
  reducedMotion, z,
} from '../../ui/tokens';

/* ---------- Animations ---------- */
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

/* ---------- Table Types ---------- */
type TableVariant = 'default' | 'striped' | 'bordered' | 'compact';
type TableSize = 'sm' | 'md' | 'lg';

interface TableProps {
  $variant?: TableVariant;
  $size?: TableSize;
  $hoverable?: boolean;
  $stickyHeader?: boolean;
}

interface ThProps {
  align?: 'left' | 'center' | 'right';
  $sortable?: boolean;
  $sortDirection?: 'asc' | 'desc' | null;
  $width?: string;
}

interface TdProps {
  align?: 'left' | 'center' | 'right';
  $truncate?: boolean;
  $maxWidth?: string;
}

/* ---------- Size Styles — token-based ---------- */
const sizeStyles = {
  sm: css`
    th, td {
      padding: ${space[2]} ${space[3]};
      font-size: ${typeScale.caption.size};
    }
  `,
  md: css`
    th, td {
      padding: ${space[3]} ${space[4]};
      font-size: ${typeScale.bodySm.size};
    }
  `,
  lg: css`
    th, td {
      padding: ${space[4]} ${space[5]};
      font-size: ${typeScale.bodyMd.size};
    }
  `,
};

/* ---------- Variant Styles — token-based ---------- */
const variantStyles = {
  default: css`
    tr { border-bottom: 1px solid ${neutral[100]}; }
    tbody tr:last-child { border-bottom: none; }
  `,
  striped: css`
    tr { border-bottom: 1px solid ${neutral[100]}; }
    tbody tr:nth-child(even) { background: ${color.bgSubtle}; }
    tbody tr:last-child { border-bottom: none; }
  `,
  bordered: css`
    border: ${borderToken.default};
    th, td { border: 1px solid ${neutral[200]}; }
  `,
  compact: css`
    th, td {
      padding: ${space[1.5]} ${space[2.5]};
      font-size: ${typeScale.caption.size};
    }
    tr { border-bottom: 1px solid ${neutral[100]}; }
  `,
};

/* ---------- Table Wrapper for Responsive ---------- */
export const TableWrapper = styled.div<{ $maxHeight?: string }>`
  width: 100%;
  overflow-x: auto;
  overflow-y: ${({ $maxHeight }) => $maxHeight ? 'auto' : 'visible'};
  max-height: ${({ $maxHeight }) => $maxHeight || 'none'};
  border-radius: ${radius.lg};
  background: ${color.bg};
  border: ${borderToken.default};

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    height: 8px;
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${color.bgSubtle};
    border-radius: ${radius.xs};
  }

  &::-webkit-scrollbar-thumb {
    background: ${neutral[300]};
    border-radius: ${radius.xs};
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${neutral[400]};
  }

  @media (max-width: 768px) {
    border-radius: 0;
    margin: 0 -${space[4]};
    width: calc(100% + ${space[8]});
  }
`;

/* ---------- Main Table ---------- */
export const Table = styled.table<TableProps>`
  width: 100%;
  background: ${color.bg};
  border-collapse: collapse;
  border-spacing: 0;
  font-family: ${fontFamily.sans};

  ${({ $size = 'md' }) => sizeStyles[$size]}
  ${({ $variant = 'default' }) => variantStyles[$variant]}

  ${({ $hoverable }) => $hoverable && css`
    tbody tr {
      transition: background-color ${transition.fast};
      cursor: pointer;

      &:hover {
        background: ${color.bgSubtle};
      }

      &:active {
        background: ${color.bgMuted};
      }
    }
  `}

  ${({ $stickyHeader }) => $stickyHeader && css`
    thead {
      position: sticky;
      top: 0;
      z-index: ${z.sticky};
    }
  `}
`;

/* ---------- Table Head ---------- */
export const THead = styled.thead`
  background: ${color.bgSubtle};
  border-bottom: 1px solid ${neutral[200]};
`;

/* ---------- Table Body ---------- */
export const TBody = styled.tbody`
  tr {
    animation: ${fadeIn} 0.2s ease-out;
    @media ${reducedMotion} { animation: none; }
  }
`;

/* ---------- Table Row ---------- */
export const Tr = styled.tr<{ $selected?: boolean; $disabled?: boolean }>`
  transition: background-color ${transition.fast};

  ${({ $selected }) => $selected && css`
    background: ${accent[50]} !important;
    border-left: 3px solid ${accent[500]};
  `}

  ${({ $disabled }) => $disabled && css`
    opacity: 0.5;
    pointer-events: none;
  `}

  &:focus-within {
    ${focusRingStyle}
  }
`;

/* ---------- Table Header Cell ---------- */
export const Th = styled.th.withConfig({
  shouldForwardProp: (prop) => !['align', '$sortable', '$sortDirection', '$width'].includes(prop as string),
})<ThProps>`
  text-align: ${({ align = 'left' }) => align};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.labelSm.size};
  font-weight: ${typeScale.labelSm.weight};
  line-height: ${typeScale.labelSm.lineHeight};
  letter-spacing: ${typeScale.labelSm.letterSpacing};
  color: ${color.textSecondary};
  white-space: nowrap;
  position: relative;
  user-select: none;
  width: ${({ $width }) => $width || 'auto'};

  ${({ $sortable }) => $sortable && css`
    cursor: pointer;
    padding-right: ${space[7]};
    transition: color ${transition.fast}, background-color ${transition.fast};

    &:hover {
      color: ${color.text};
      background: ${neutral[100]};
    }

    &:focus-visible {
      ${focusRingStyle}
    }
  `}

  ${({ $sortDirection }) => $sortDirection && css`
    color: ${accent[600]};
    font-weight: 700;
  `}
`;

/* ---------- Sort Indicator ---------- */
export const SortIndicator = styled.span<{ $direction: 'asc' | 'desc' | null; $active?: boolean }>`
  position: absolute;
  right: ${space[2]};
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  opacity: ${({ $active }) => $active ? 1 : 0.3};
  transition: opacity ${transition.fast};

  &::before,
  &::after {
    content: '';
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
  }

  &::before {
    border-bottom: 4px solid ${({ $direction, $active }) =>
      $active && $direction === 'asc' ? accent[500] : 'currentColor'};
    opacity: ${({ $direction }) => $direction === 'asc' ? 1 : 0.4};
  }

  &::after {
    border-top: 4px solid ${({ $direction, $active }) =>
      $active && $direction === 'desc' ? accent[500] : 'currentColor'};
    opacity: ${({ $direction }) => $direction === 'desc' ? 1 : 0.4};
  }
`;

/* ---------- Table Data Cell ---------- */
export const Td = styled.td.withConfig({
  shouldForwardProp: (prop) => !['align', '$truncate', '$maxWidth'].includes(prop as string),
})<TdProps>`
  text-align: ${({ align = 'left' }) => align};
  color: ${color.text};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.bodySm.size};
  line-height: ${typeScale.bodySm.lineHeight};
  letter-spacing: ${typeScale.bodySm.letterSpacing};
  vertical-align: middle;

  ${({ $truncate, $maxWidth }) => $truncate && css`
    max-width: ${$maxWidth || '200px'};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `}
`;

/* ---------- Empty State for Table ---------- */
export const TableEmptyState = styled.td`
  text-align: center;
  padding: ${space[12]} ${space[6]} !important;
  color: ${color.textSecondary};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.bodySm.size};
`;

/* ---------- Loading State for Table ---------- */
export const TableLoadingState = styled.td`
  text-align: center;
  padding: ${space[12]} ${space[6]} !important;
`;

/* ---------- Modal & Overlay ---------- */
export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${color.overlay};
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${z.overlay};
  animation: ${fadeIn} 0.2s ease-out;
  padding: ${space[4]};
`;

export const Modal = styled.div<{ $size?: 'sm' | 'md' | 'lg' | 'xl' }>`
  position: relative;
  z-index: ${z.modal};
  background: ${color.bg};
  border-radius: ${radius.xl};
  padding: ${space[6]};
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: ${shadow.overlay};
  animation: ${slideUp} 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  @media ${reducedMotion} { animation: none; }

  max-width: ${({ $size }) => {
    switch ($size) {
      case 'sm': return '400px';
      case 'lg': return '800px';
      case 'xl': return '1000px';
      default: return '600px';
    }
  }};

  &:focus {
    outline: none;
  }
`;

export const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${space[5]};
  gap: ${space[4]};
`;

export const ModalTitle = styled.h3`
  margin: 0;
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.headingMd.size};
  font-weight: ${typeScale.headingMd.weight};
  line-height: ${typeScale.headingMd.lineHeight};
  letter-spacing: ${typeScale.headingMd.letterSpacing};
  color: ${color.text};
`;

export const ModalBody = styled.div`
  margin-bottom: ${space[6]};
`;

export const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${space[3]};
  padding-top: ${space[4]};
  border-top: ${borderToken.light};
`;

export const CloseBtn = styled.button`
  background: none;
  border: none;
  padding: ${space[2]};
  cursor: pointer;
  color: ${color.textSecondary};
  border-radius: ${radius.md};
  transition: background-color ${transition.fast}, color ${transition.fast};
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${color.bgMuted};
    color: ${color.text};
  }

  &:focus-visible {
    ${focusRingStyle}
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;
