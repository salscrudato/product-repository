/**
 * KeyboardNavigableTable - Wrapper that adds keyboard navigation to tables
 * 
 * Provides arrow key navigation between table rows for improved accessibility.
 * Use this wrapper around any table that displays navigable data.
 */

import React, { useCallback, useRef, useEffect, useState } from 'react';
import styled from 'styled-components';

const TableContainer = styled.div`
  width: 100%;
  
  /* Ensure rows are focusable */
  table tbody tr {
    cursor: pointer;
    
    &:focus {
      outline: 2px solid ${({ theme }) => theme.colours.primary};
      outline-offset: -2px;
      background: ${({ theme }) => theme.colours.primaryLighter};
    }
    
    &:focus-visible {
      outline: 2px solid ${({ theme }) => theme.colours.primary};
      outline-offset: -2px;
    }
  }
`;

const ScreenReaderInstructions = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

interface KeyboardNavigableTableProps {
  children: React.ReactNode;
  onRowSelect?: (rowIndex: number) => void;
  onRowActivate?: (rowIndex: number) => void; // Enter/Space
  className?: string;
  ariaLabel?: string;
}

export const KeyboardNavigableTable: React.FC<KeyboardNavigableTableProps> = ({
  children,
  onRowSelect,
  onRowActivate,
  className,
  ariaLabel = 'Data table'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);

  // Get all focusable rows
  const getRows = useCallback((): HTMLTableRowElement[] => {
    if (!containerRef.current) return [];
    const table = containerRef.current.querySelector('table');
    if (!table) return [];
    const tbody = table.querySelector('tbody');
    if (!tbody) return [];
    return Array.from(tbody.querySelectorAll('tr'));
  }, []);

  // Focus a specific row
  const focusRow = useCallback((index: number) => {
    const rows = getRows();
    if (index >= 0 && index < rows.length) {
      rows[index].focus();
      setFocusedRowIndex(index);
      onRowSelect?.(index);
    }
  }, [getRows, onRowSelect]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const rows = getRows();
    const currentIndex = focusedRowIndex;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < rows.length - 1) {
          focusRow(currentIndex + 1);
        } else if (currentIndex === -1 && rows.length > 0) {
          focusRow(0);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          focusRow(currentIndex - 1);
        }
        break;

      case 'Home':
        e.preventDefault();
        if (rows.length > 0) {
          focusRow(0);
        }
        break;

      case 'End':
        e.preventDefault();
        if (rows.length > 0) {
          focusRow(rows.length - 1);
        }
        break;

      case 'Enter':
      case ' ':
        if (currentIndex >= 0) {
          e.preventDefault();
          onRowActivate?.(currentIndex);
        }
        break;
    }
  }, [getRows, focusedRowIndex, focusRow, onRowActivate]);

  // Set tabindex on rows after mount/update
  useEffect(() => {
    const rows = getRows();
    rows.forEach((row, index) => {
      row.setAttribute('tabindex', '0');
      row.setAttribute('role', 'row');
    });
  }, [getRows, children]);

  // Track focus changes from clicks
  const handleFocus = useCallback((e: React.FocusEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'TR') {
      const rows = getRows();
      const index = rows.indexOf(target as HTMLTableRowElement);
      if (index >= 0) {
        setFocusedRowIndex(index);
        onRowSelect?.(index);
      }
    }
  }, [getRows, onRowSelect]);

  return (
    <TableContainer
      ref={containerRef}
      className={className}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      role="grid"
      aria-label={ariaLabel}
    >
      <ScreenReaderInstructions id="table-keyboard-instructions">
        Use arrow keys to navigate between rows. Press Enter or Space to select a row.
      </ScreenReaderInstructions>
      {children}
    </TableContainer>
  );
};

export default KeyboardNavigableTable;

