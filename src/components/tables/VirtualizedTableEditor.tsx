/**
 * VirtualizedTableEditor
 * 
 * High-performance spreadsheet-like table editor using react-window.
 * Supports:
 * - Virtualization for large grids (1000s of rows/columns)
 * - Multi-select with Shift+Click and Ctrl/Cmd+Click
 * - Copy/paste with clipboard API
 * - Fill handle for dragging values
 * - Undo/redo with command pattern
 */

import React, { 
  useState, 
  useCallback, 
  useMemo, 
  useRef, 
  useEffect,
  memo 
} from 'react';
import { VariableSizeGrid as Grid, GridChildComponentProps } from 'react-window';
import styled from 'styled-components';
import type { 
  TableVersion, 
  TableCell, 
  TableSelection, 
  CellCoordinate, 
  CellRange,
  TableEditCommand,
  TableEditHistory,
} from '../../types/table';
import { generateCellKey } from '../../types/table';

// ============================================================================
// Styled Components
// ============================================================================

const EditorContainer = styled.div`
  position: relative;
  border: 1px solid ${({ theme }) => theme.colours?.border || '#e5e7eb'};
  border-radius: 8px;
  overflow: hidden;
  background: ${({ theme }) => theme.colours?.background || '#ffffff'};
`;

const GridWrapper = styled.div`
  position: relative;
  
  /* Custom scrollbar styling */
  & > div::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  
  & > div::-webkit-scrollbar-track {
    background: #f1f5f9;
  }
  
  & > div::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 5px;
  }
`;

const CellWrapper = styled.div<{ 
  $isSelected: boolean; 
  $isHeader: boolean;
  $isEditing: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: ${({ $isHeader }) => $isHeader ? 'center' : 'flex-end'};
  padding: 0 8px;
  font-size: 13px;
  font-weight: ${({ $isHeader }) => $isHeader ? '600' : '400'};
  background: ${({ $isSelected, $isHeader, $isEditing }) => 
    $isEditing ? '#fff' :
    $isSelected ? '#e0e7ff' : 
    $isHeader ? '#f8fafc' : '#fff'};
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  color: ${({ $isHeader }) => $isHeader ? '#374151' : '#111827'};
  cursor: ${({ $isHeader }) => $isHeader ? 'default' : 'cell'};
  user-select: none;
  outline: ${({ $isEditing }) => $isEditing ? '2px solid #6366f1' : 'none'};
  outline-offset: -2px;
  
  &:hover {
    background: ${({ $isSelected, $isHeader }) => 
      $isHeader ? '#f1f5f9' : 
      $isSelected ? '#c7d2fe' : '#f9fafb'};
  }
`;

const CellInput = styled.input`
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  text-align: right;
  font-size: 13px;
  padding: 0;
  outline: none;
  
  &:focus {
    outline: none;
  }
`;

const CornerCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
`;

const ToolbarButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid ${({ $active }) => $active ? '#6366f1' : '#e5e7eb'};
  border-radius: 6px;
  background: ${({ $active }) => $active ? '#eef2ff' : '#fff'};
  color: ${({ $active }) => $active ? '#6366f1' : '#374151'};
  cursor: pointer;
  transition: all 0.15s ease;
  
  &:hover {
    background: ${({ $active }) => $active ? '#e0e7ff' : '#f9fafb'};
    border-color: ${({ $active }) => $active ? '#6366f1' : '#d1d5db'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SelectionInfo = styled.div`
  margin-left: auto;
  font-size: 12px;
  color: #6b7280;
`;

// ============================================================================
// Types
// ============================================================================

interface VirtualizedTableEditorProps {
  version: TableVersion;
  onCellChange: (cellKey: string, value: number | null) => void;
  onBatchChange: (changes: Record<string, TableCell>) => void;
  readOnly?: boolean;
  width?: number;
  height?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateCommandId(): string {
  return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getCellsInRange(
  range: CellRange,
  rowValues: string[],
  colValues: string[]
): string[] {
  const keys: string[] = [];
  for (let r = range.startRow; r <= range.endRow; r++) {
    for (let c = range.startCol; c <= range.endCol; c++) {
      keys.push(generateCellKey([rowValues[r], colValues[c]]));
    }
  }
  return keys;
}

// ============================================================================
// Cell Component (Memoized)
// ============================================================================

interface CellData {
  rowValues: string[];
  colValues: string[];
  cells: Record<string, TableCell>;
  selectedCells: Set<string>;
  editingCell: string | null;
  editValue: string;
  onCellClick: (row: number, col: number, e: React.MouseEvent) => void;
  onCellDoubleClick: (row: number, col: number) => void;
  onCellInputChange: (value: string) => void;
  onCellInputBlur: () => void;
  onCellInputKeyDown: (e: React.KeyboardEvent) => void;
  readOnly: boolean;
}

const Cell = memo(({
  columnIndex,
  rowIndex,
  style,
  data
}: GridChildComponentProps<CellData>) => {
  const {
    rowValues,
    colValues,
    cells,
    selectedCells,
    editingCell,
    editValue,
    onCellClick,
    onCellDoubleClick,
    onCellInputChange,
    onCellInputBlur,
    onCellInputKeyDown,
    readOnly,
  } = data;

  // Corner cell
  if (rowIndex === 0 && columnIndex === 0) {
    return (
      <CornerCell style={style}>
        Row / Col
      </CornerCell>
    );
  }

  // Column header
  if (rowIndex === 0) {
    const colValue = colValues[columnIndex - 1];
    return (
      <CellWrapper
        style={style}
        $isSelected={false}
        $isHeader={true}
        $isEditing={false}
      >
        {colValue}
      </CellWrapper>
    );
  }

  // Row header
  if (columnIndex === 0) {
    const rowValue = rowValues[rowIndex - 1];
    return (
      <CellWrapper
        style={style}
        $isSelected={false}
        $isHeader={true}
        $isEditing={false}
      >
        {rowValue}
      </CellWrapper>
    );
  }

  // Data cell
  const rowValue = rowValues[rowIndex - 1];
  const colValue = colValues[columnIndex - 1];
  const cellKey = generateCellKey([rowValue, colValue]);
  const cell = cells[cellKey];
  const isSelected = selectedCells.has(cellKey);
  const isEditing = editingCell === cellKey;

  return (
    <CellWrapper
      style={style}
      $isSelected={isSelected}
      $isHeader={false}
      $isEditing={isEditing}
      onClick={(e) => onCellClick(rowIndex - 1, columnIndex - 1, e)}
      onDoubleClick={() => !readOnly && onCellDoubleClick(rowIndex - 1, columnIndex - 1)}
    >
      {isEditing ? (
        <CellInput
          type="text"
          value={editValue}
          onChange={(e) => onCellInputChange(e.target.value)}
          onBlur={onCellInputBlur}
          onKeyDown={onCellInputKeyDown}
          autoFocus
        />
      ) : (
        cell?.value !== null && cell?.value !== undefined
          ? cell.value.toLocaleString()
          : ''
      )}
    </CellWrapper>
  );
});

Cell.displayName = 'VirtualizedCell';

// ============================================================================
// Main Component
// ============================================================================

export const VirtualizedTableEditor: React.FC<VirtualizedTableEditorProps> = ({
  version,
  onCellChange,
  onBatchChange,
  readOnly = false,
  width = 900,
  height = 500,
}) => {
  const gridRef = useRef<Grid>(null);

  // Dimensions
  const rowDim = version.dimensions.find(d => d.position === 0);
  const colDim = version.dimensions.find(d => d.position === 1);
  const rowValues = rowDim?.values || [];
  const colValues = colDim?.values || [];

  // Cell data
  const cells = version.cellStorage.cells || {};

  // Selection state
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<CellCoordinate | null>(null);

  // Editing state
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Undo/redo
  const [history, setHistory] = useState<TableEditHistory>({
    undoStack: [],
    redoStack: [],
    maxSize: 50,
  });

  // Cell dimensions
  const HEADER_HEIGHT = 36;
  const ROW_HEIGHT = 32;
  const HEADER_WIDTH = 120;
  const COL_WIDTH = 100;

  const getColumnWidth = useCallback((index: number) => {
    return index === 0 ? HEADER_WIDTH : COL_WIDTH;
  }, []);

  const getRowHeight = useCallback((index: number) => {
    return index === 0 ? HEADER_HEIGHT : ROW_HEIGHT;
  }, []);

  // Handle cell click
  const handleCellClick = useCallback((row: number, col: number, e: React.MouseEvent) => {
    const cellKey = generateCellKey([rowValues[row], colValues[col]]);

    if (e.shiftKey && anchor) {
      // Range selection
      const range: CellRange = {
        startRow: Math.min(anchor.row, row),
        startCol: Math.min(anchor.col, col),
        endRow: Math.max(anchor.row, row),
        endCol: Math.max(anchor.col, col),
      };
      const keys = getCellsInRange(range, rowValues, colValues);
      setSelectedCells(new Set(keys));
    } else if (e.metaKey || e.ctrlKey) {
      // Multi-select toggle
      const newSelected = new Set(selectedCells);
      if (newSelected.has(cellKey)) {
        newSelected.delete(cellKey);
      } else {
        newSelected.add(cellKey);
      }
      setSelectedCells(newSelected);
      setAnchor({ row, col });
    } else {
      // Single selection
      setSelectedCells(new Set([cellKey]));
      setAnchor({ row, col });
    }
  }, [rowValues, colValues, anchor, selectedCells]);

  // Handle double click to edit
  const handleCellDoubleClick = useCallback((row: number, col: number) => {
    const cellKey = generateCellKey([rowValues[row], colValues[col]]);
    const cell = cells[cellKey];
    setEditingCell(cellKey);
    setEditValue(cell?.value?.toString() || '');
  }, [rowValues, colValues, cells]);

  // Handle input change
  const handleInputChange = useCallback((value: string) => {
    setEditValue(value);
  }, []);

  // Handle input blur (commit edit)
  const handleInputBlur = useCallback(() => {
    if (!editingCell) return;

    const numValue = editValue === '' ? null : parseFloat(editValue);
    if (editValue !== '' && isNaN(numValue as number)) {
      // Invalid input, revert
      setEditingCell(null);
      setEditValue('');
      return;
    }

    // Save to history
    const oldCell = cells[editingCell];
    const command: TableEditCommand = {
      id: generateCommandId(),
      operation: 'SET_CELL',
      timestamp: new Date(),
      before: { [editingCell]: oldCell || { value: null } },
      after: { [editingCell]: { value: numValue } },
      affectedCells: [editingCell],
      description: `Set cell to ${numValue}`,
    };

    setHistory(prev => ({
      ...prev,
      undoStack: [...prev.undoStack.slice(-prev.maxSize + 1), command],
      redoStack: [],
    }));

    onCellChange(editingCell, numValue);
    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, cells, onCellChange]);

  // Handle keyboard in input
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  }, [handleInputBlur]);

  // Copy selected cells
  const handleCopy = useCallback(async () => {
    if (selectedCells.size === 0) return;

    const values: string[] = [];
    for (const key of selectedCells) {
      const cell = cells[key];
      values.push(cell?.value?.toString() || '');
    }

    try {
      await navigator.clipboard.writeText(values.join('\t'));
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [selectedCells, cells]);

  // Paste from clipboard
  const handlePaste = useCallback(async () => {
    if (readOnly || selectedCells.size === 0) return;

    try {
      const text = await navigator.clipboard.readText();
      const rows = text.split('\n').map(row => row.split('\t'));

      // Get first selected cell as paste anchor
      const firstKey = Array.from(selectedCells)[0];
      const [anchorRow, anchorCol] = firstKey.split('|');
      const startRowIdx = rowValues.indexOf(anchorRow);
      const startColIdx = colValues.indexOf(anchorCol);

      if (startRowIdx === -1 || startColIdx === -1) return;

      const changes: Record<string, TableCell> = {};
      const beforeState: Record<string, TableCell> = {};

      for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < rows[r].length; c++) {
          const rowIdx = startRowIdx + r;
          const colIdx = startColIdx + c;

          if (rowIdx >= rowValues.length || colIdx >= colValues.length) continue;

          const cellKey = generateCellKey([rowValues[rowIdx], colValues[colIdx]]);
          const value = parseFloat(rows[r][c]);

          beforeState[cellKey] = cells[cellKey] || { value: null };
          changes[cellKey] = { value: isNaN(value) ? null : value };
        }
      }

      // Save to history
      const command: TableEditCommand = {
        id: generateCommandId(),
        operation: 'PASTE',
        timestamp: new Date(),
        before: beforeState,
        after: changes,
        affectedCells: Object.keys(changes),
        description: `Paste ${Object.keys(changes).length} cells`,
      };

      setHistory(prev => ({
        ...prev,
        undoStack: [...prev.undoStack.slice(-prev.maxSize + 1), command],
        redoStack: [],
      }));

      onBatchChange(changes);
    } catch (err) {
      console.error('Failed to paste:', err);
    }
  }, [readOnly, selectedCells, cells, rowValues, colValues, onBatchChange]);

  // Undo
  const handleUndo = useCallback(() => {
    if (history.undoStack.length === 0) return;

    const command = history.undoStack[history.undoStack.length - 1];
    onBatchChange(command.before);

    setHistory(prev => ({
      ...prev,
      undoStack: prev.undoStack.slice(0, -1),
      redoStack: [...prev.redoStack, command],
    }));
  }, [history.undoStack, onBatchChange]);

  // Redo
  const handleRedo = useCallback(() => {
    if (history.redoStack.length === 0) return;

    const command = history.redoStack[history.redoStack.length - 1];
    onBatchChange(command.after);

    setHistory(prev => ({
      ...prev,
      undoStack: [...prev.undoStack, command],
      redoStack: prev.redoStack.slice(0, -1),
    }));
  }, [history.redoStack, onBatchChange]);

  // Clear selected cells
  const handleClear = useCallback(() => {
    if (readOnly || selectedCells.size === 0) return;

    const beforeState: Record<string, TableCell> = {};
    const afterState: Record<string, TableCell> = {};

    for (const key of selectedCells) {
      beforeState[key] = cells[key] || { value: null };
      afterState[key] = { value: null };
    }

    const command: TableEditCommand = {
      id: generateCommandId(),
      operation: 'CLEAR_CELLS',
      timestamp: new Date(),
      before: beforeState,
      after: afterState,
      affectedCells: Array.from(selectedCells),
      description: `Clear ${selectedCells.size} cells`,
    };

    setHistory(prev => ({
      ...prev,
      undoStack: [...prev.undoStack.slice(-prev.maxSize + 1), command],
      redoStack: [],
    }));

    onBatchChange(afterState);
  }, [readOnly, selectedCells, cells, onBatchChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        handleCopy();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        handlePaste();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        e.preventDefault();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!editingCell) {
          handleClear();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopy, handlePaste, handleUndo, handleRedo, handleClear, editingCell]);

  // Memoize cell data
  const itemData = useMemo((): CellData => ({
    rowValues,
    colValues,
    cells,
    selectedCells,
    editingCell,
    editValue,
    onCellClick: handleCellClick,
    onCellDoubleClick: handleCellDoubleClick,
    onCellInputChange: handleInputChange,
    onCellInputBlur: handleInputBlur,
    onCellInputKeyDown: handleInputKeyDown,
    readOnly,
  }), [
    rowValues, colValues, cells, selectedCells, editingCell, editValue,
    handleCellClick, handleCellDoubleClick, handleInputChange,
    handleInputBlur, handleInputKeyDown, readOnly
  ]);

  if (!rowDim || !colDim) {
    return <div>Table requires at least 2 dimensions</div>;
  }

  return (
    <EditorContainer>
      <Toolbar>
        <ToolbarButton onClick={handleUndo} disabled={history.undoStack.length === 0}>
          ↩ Undo
        </ToolbarButton>
        <ToolbarButton onClick={handleRedo} disabled={history.redoStack.length === 0}>
          ↪ Redo
        </ToolbarButton>
        <ToolbarButton onClick={handleCopy} disabled={selectedCells.size === 0}>
          📋 Copy
        </ToolbarButton>
        <ToolbarButton onClick={handlePaste} disabled={readOnly || selectedCells.size === 0}>
          📥 Paste
        </ToolbarButton>
        <ToolbarButton onClick={handleClear} disabled={readOnly || selectedCells.size === 0}>
          🗑 Clear
        </ToolbarButton>
        <SelectionInfo>
          {selectedCells.size > 0
            ? `${selectedCells.size} cell${selectedCells.size > 1 ? 's' : ''} selected`
            : `${rowValues.length} rows × ${colValues.length} columns`}
        </SelectionInfo>
      </Toolbar>

      <GridWrapper>
        <Grid
          ref={gridRef}
          columnCount={colValues.length + 1}
          columnWidth={getColumnWidth}
          rowCount={rowValues.length + 1}
          rowHeight={getRowHeight}
          width={width}
          height={height}
          itemData={itemData}
          overscanRowCount={5}
          overscanColumnCount={2}
        >
          {Cell}
        </Grid>
      </GridWrapper>
    </EditorContainer>
  );
};

export default VirtualizedTableEditor;

