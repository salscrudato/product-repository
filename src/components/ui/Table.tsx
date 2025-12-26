import styled, { css, keyframes } from 'styled-components';

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

/* ---------- Size Styles ---------- */
const sizeStyles = {
  sm: css`
    th, td { padding: 8px 12px; font-size: 13px; }
  `,
  md: css`
    th, td { padding: 12px 16px; font-size: 14px; }
  `,
  lg: css`
    th, td { padding: 16px 20px; font-size: 15px; }
  `,
};

/* ---------- Variant Styles ---------- */
const variantStyles = {
  default: css`
    tr { border-bottom: 1px solid ${({ theme }) => theme.colours.border}; }
    tbody tr:last-child { border-bottom: none; }
  `,
  striped: css`
    tr { border-bottom: 1px solid ${({ theme }) => theme.colours.border}; }
    tbody tr:nth-child(even) { background: ${({ theme }) => theme.colours.backgroundAlt}; }
    tbody tr:last-child { border-bottom: none; }
  `,
  bordered: css`
    border: 1px solid ${({ theme }) => theme.colours.border};
    th, td { border: 1px solid ${({ theme }) => theme.colours.border}; }
  `,
  compact: css`
    th, td { padding: 6px 10px; font-size: 13px; }
    tr { border-bottom: 1px solid ${({ theme }) => theme.colours.borderLight}; }
  `,
};

/* ---------- Table Wrapper for Responsive ---------- */
export const TableWrapper = styled.div<{ $maxHeight?: string }>`
  width: 100%;
  overflow-x: auto;
  overflow-y: ${({ $maxHeight }) => $maxHeight ? 'auto' : 'visible'};
  max-height: ${({ $maxHeight }) => $maxHeight || 'none'};
  border-radius: ${({ theme }) => theme.radius};
  background: ${({ theme }) => theme.colours.background};
  box-shadow: ${({ theme }) => theme.shadow};

  /* Custom scrollbar for table */
  &::-webkit-scrollbar {
    height: 8px;
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colours.backgroundAlt};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colours.border};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colours.textSecondary};
  }

  @media (max-width: 768px) {
    border-radius: 0;
    margin: 0 -16px;
    width: calc(100% + 32px);
  }
`;

/* ---------- Main Table ---------- */
export const Table = styled.table<TableProps>`
  width: 100%;
  background: ${({ theme }) => theme.colours.background};
  border-radius: ${({ theme }) => theme.radius};
  border-collapse: collapse;
  border-spacing: 0;

  ${({ $size = 'md' }) => sizeStyles[$size]}
  ${({ $variant = 'default' }) => variantStyles[$variant]}

  ${({ $hoverable }) => $hoverable && css`
    tbody tr {
      transition: background-color 0.15s ease;
      cursor: pointer;

      &:hover {
        background: ${({ theme }) => theme.colours.hover};
      }

      &:active {
        background: ${({ theme }) => theme.colours.backgroundAlt};
      }
    }
  `}

  ${({ $stickyHeader }) => $stickyHeader && css`
    thead {
      position: sticky;
      top: 0;
      z-index: 10;
    }
  `}
`;

/* ---------- Table Head ---------- */
export const THead = styled.thead`
  background: ${({ theme }) => theme.colours.tableHeader};
  border-bottom: 2px solid ${({ theme }) => theme.colours.border};
`;

/* ---------- Table Body ---------- */
export const TBody = styled.tbody`
  /* Animation for rows */
  tr {
    animation: ${fadeIn} 0.2s ease-out;
  }
`;

/* ---------- Table Row ---------- */
export const Tr = styled.tr<{ $selected?: boolean; $disabled?: boolean }>`
  transition: background-color 0.15s ease;

  ${({ $selected, theme }) => $selected && css`
    background: ${theme.colours.primaryLight} !important;
    border-left: 3px solid ${theme.colours.primary};
  `}

  ${({ $disabled }) => $disabled && css`
    opacity: 0.5;
    pointer-events: none;
  `}

  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.colours.primary};
    outline-offset: -2px;
  }
`;

/* ---------- Table Header Cell ---------- */
export const Th = styled.th.withConfig({
  shouldForwardProp: (prop) => !['align', '$sortable', '$sortDirection', '$width'].includes(prop as string),
})<ThProps>`
  text-align: ${({ align = 'left' }) => align};
  font-weight: 600;
  color: ${({ theme }) => theme.colours.textSecondary};
  white-space: nowrap;
  position: relative;
  user-select: none;
  width: ${({ $width }) => $width || 'auto'};

  ${({ $sortable }) => $sortable && css`
    cursor: pointer;
    padding-right: 28px;
    transition: color 0.15s ease, background-color 0.15s ease;

    &:hover {
      color: ${({ theme }) => theme.colours.text};
      background: rgba(0, 0, 0, 0.02);
    }

    &:focus-visible {
      outline: 2px solid ${({ theme }) => theme.colours.primary};
      outline-offset: -2px;
    }
  `}

  ${({ $sortDirection }) => $sortDirection && css`
    color: ${({ theme }) => theme.colours.primary};
    font-weight: 700;
  `}
`;

/* ---------- Sort Indicator ---------- */
export const SortIndicator = styled.span<{ $direction: 'asc' | 'desc' | null; $active?: boolean }>`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  opacity: ${({ $active }) => $active ? 1 : 0.3};
  transition: opacity 0.15s ease;

  &::before,
  &::after {
    content: '';
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
  }

  &::before {
    border-bottom: 4px solid ${({ $direction, $active, theme }) =>
      $active && $direction === 'asc' ? theme.colours.primary : 'currentColor'};
    opacity: ${({ $direction }) => $direction === 'asc' ? 1 : 0.4};
  }

  &::after {
    border-top: 4px solid ${({ $direction, $active, theme }) =>
      $active && $direction === 'desc' ? theme.colours.primary : 'currentColor'};
    opacity: ${({ $direction }) => $direction === 'desc' ? 1 : 0.4};
  }
`;

/* ---------- Table Data Cell ---------- */
export const Td = styled.td.withConfig({
  shouldForwardProp: (prop) => !['align', '$truncate', '$maxWidth'].includes(prop as string),
})<TdProps>`
  text-align: ${({ align = 'left' }) => align};
  color: ${({ theme }) => theme.colours.text};
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
  padding: 48px 24px !important;
  color: ${({ theme }) => theme.colours.textSecondary};
  font-size: 14px;
`;

/* ---------- Loading State for Table ---------- */
export const TableLoadingState = styled.td`
  text-align: center;
  padding: 48px 24px !important;
`;

/* ---------- Modal & Overlay ---------- */
export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${({ theme }) => theme.zIndex?.overlay || 300};
  animation: ${fadeIn} 0.2s ease-out;
  padding: 16px;
`;

export const Modal = styled.div<{ $size?: 'sm' | 'md' | 'lg' | 'xl' }>`
  position: relative;
  z-index: ${({ theme }) => theme.zIndex?.modal || 400};
  background: #ffffff;
  border-radius: ${({ theme }) => theme.radiusLg};
  padding: 24px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: ${slideUp} 0.3s cubic-bezier(0.4, 0, 0.2, 1);

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
  margin-bottom: 20px;
  gap: 16px;
`;

export const ModalTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
  line-height: 1.3;
`;

export const ModalBody = styled.div`
  margin-bottom: 24px;
`;

export const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid ${({ theme }) => theme.colours.border};
`;

export const CloseBtn = styled.button`
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: ${({ theme }) => theme.colours.textSecondary};
  border-radius: 8px;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${({ theme }) => theme.colours.hover};
    color: ${({ theme }) => theme.colours.text};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colours.primary};
    outline-offset: 2px;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;