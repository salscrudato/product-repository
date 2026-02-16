// src/types/table.ts
// Type definitions for scalable rate tables

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Table Status and Version Types
// ============================================================================

/** Status for table versions */
export type TableVersionStatus = 'draft' | 'published' | 'archived';

/** Validation rule types */
export type TableValidationType = 'required' | 'min' | 'max' | 'pattern' | 'enum';

// ============================================================================
// Core Table Types
// ============================================================================

/**
 * A rating/lookup table at the org level.
 * Path: orgs/{orgId}/tables/{tableId}
 */
export interface RatingTable {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  /** Number of dimensions (1D, 2D, 3D, etc.) */
  dimensionCount: number;
  /** Category for organization */
  category?: string;
  /** Tags for filtering */
  tags?: string[];
  createdAt: Timestamp | Date;
  createdBy: string;
  updatedAt: Timestamp | Date;
  updatedBy: string;
}

/**
 * A version of a rating table with full cell data.
 * Path: orgs/{orgId}/tables/{tableId}/versions/{versionId}
 */
export interface TableVersion {
  id: string;
  tableId: string;
  versionNumber: number;
  status: TableVersionStatus;
  
  /** Dimensions define the axes of the table */
  dimensions: TableDimension[];
  
  /** Cell storage - can be sparse or dense */
  cellStorage: CellStorage;
  
  /** Validation rules for cell values */
  validation?: TableValidation;
  
  /** Effective dating */
  effectiveStart?: Timestamp | Date;
  effectiveEnd?: Timestamp | Date;
  
  /** Audit fields */
  createdAt: Timestamp | Date;
  createdBy: string;
  updatedAt: Timestamp | Date;
  updatedBy: string;
  publishedAt?: Timestamp | Date;
  publishedBy?: string;
  
  /** Clone source info */
  clonedFrom?: {
    versionId: string;
    versionNumber: number;
  };
  
  /** Statistics for performance */
  stats?: {
    totalCells: number;
    populatedCells: number;
    minValue?: number;
    maxValue?: number;
  };
}

/**
 * A dimension of the table (row, column, or additional axis).
 * Each dimension maps to a data dictionary field code.
 */
export interface TableDimension {
  id: string;
  name: string;
  /** Data dictionary field code for this dimension */
  fieldCode: string;
  /** Position: 0 = row axis, 1 = column axis, 2+ = additional axes */
  position: number;
  /** Ordered values for this dimension */
  values: string[];
  /** Value type for the dimension */
  valueType: 'string' | 'number' | 'range';
  /** For range type: define ranges */
  ranges?: DimensionRange[];
}

/** Range definition for numeric dimension values */
export interface DimensionRange {
  label: string;
  min: number;
  max: number;
  inclusive: 'both' | 'min' | 'max' | 'neither';
}

// ============================================================================
// Cell Storage Types
// ============================================================================

/**
 * Cell storage supporting both sparse and dense representations.
 * Sparse is better for tables with many empty cells.
 * Dense is better for fully populated tables.
 */
export interface CellStorage {
  /** Storage mode */
  mode: 'sparse' | 'dense';
  
  /** For sparse mode: map of cell key to value */
  cells?: Record<string, TableCell>;
  
  /** For dense mode: flat array of values with dimension order */
  denseValues?: (number | null)[];
  
  /** Default value for empty cells */
  defaultValue?: number;
}

/**
 * Individual table cell (used in sparse storage).
 */
export interface TableCell {
  value: number | null;
  /** Optional cell-level metadata */
  note?: string;
  /** Validation error message if any */
  validationError?: string;
}

// ============================================================================
// Validation Types
// ============================================================================

/** Validation rules for table cells */
export interface TableValidation {
  required?: boolean;
  min?: number;
  max?: number;
  /** For decimal precision */
  decimalPlaces?: number;
  /** Custom validation pattern */
  pattern?: string;
  /** Allowed values (enum) */
  allowedValues?: number[];
}

// ============================================================================
// CSV Import/Export Types
// ============================================================================

/** Result of CSV import operation */
export interface CSVImportResult {
  success: boolean;
  /** Total rows processed */
  totalRows: number;
  /** Successfully imported rows */
  importedRows: number;
  /** Row-level errors */
  errors: CSVImportError[];
  /** Warnings (non-fatal issues) */
  warnings: CSVImportWarning[];
  /** The imported data if successful */
  data?: {
    dimensions: TableDimension[];
    cells: Record<string, TableCell>;
  };
}

/** CSV import error for a specific row */
export interface CSVImportError {
  row: number;
  column?: number;
  message: string;
  value?: string;
}

/** CSV import warning */
export interface CSVImportWarning {
  row?: number;
  column?: number;
  message: string;
}

/** CSV export options */
export interface CSVExportOptions {
  includeHeaders: boolean;
  decimalSeparator: '.' | ',';
  valueDelimiter: ',' | ';' | '\t';
  includeEmptyCells: boolean;
}

// ============================================================================
// Undo/Redo Types
// ============================================================================

/** Types of table edit operations */
export type TableEditOperation =
  | 'SET_CELL'
  | 'SET_CELLS'
  | 'FILL_RANGE'
  | 'PASTE'
  | 'CLEAR_CELLS'
  | 'ADD_ROW'
  | 'ADD_COLUMN'
  | 'DELETE_ROW'
  | 'DELETE_COLUMN'
  | 'IMPORT_CSV';

/** A single edit command for undo/redo */
export interface TableEditCommand {
  id: string;
  operation: TableEditOperation;
  timestamp: Date;
  /** Data before the operation */
  before: Record<string, TableCell>;
  /** Data after the operation */
  after: Record<string, TableCell>;
  /** Affected cell keys */
  affectedCells: string[];
  /** Description for UI */
  description: string;
}

/** Undo/Redo stack state */
export interface TableEditHistory {
  undoStack: TableEditCommand[];
  redoStack: TableEditCommand[];
  maxSize: number;
}

// ============================================================================
// Selection Types
// ============================================================================

/** Selection state for the table editor */
export interface TableSelection {
  /** Currently selected cells (keys) */
  cells: Set<string>;
  /** Anchor cell for range selection */
  anchor?: CellCoordinate;
  /** Current focus cell */
  focus?: CellCoordinate;
  /** Selection mode */
  mode: 'single' | 'range' | 'multi';
}

/** Cell coordinate */
export interface CellCoordinate {
  row: number;
  col: number;
}

/** Selection range */
export interface CellRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

// ============================================================================
// Version Comparison Types
// ============================================================================

/** Result of comparing two table versions */
export interface TableVersionDiff {
  sourceVersion: string;
  targetVersion: string;
  /** Cells that were added */
  added: Record<string, TableCell>;
  /** Cells that were removed */
  removed: Record<string, TableCell>;
  /** Cells that were modified */
  modified: Record<string, { before: TableCell; after: TableCell }>;
  /** Summary statistics */
  summary: {
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    unchangedCount: number;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

/** Cell key generator type */
export type CellKeyGenerator = (rowIndex: number, colIndex: number) => string;

/** Parse a cell key into row/col values */
export type CellKeyParser = (key: string) => { rowValue: string; colValue: string };

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a cell key from dimension values.
 * For 2D tables: "rowValue|colValue"
 * For nD tables: "dim0|dim1|dim2|..."
 */
export function generateCellKey(dimensionValues: string[]): string {
  return dimensionValues.join('|');
}

/**
 * Parse a cell key back into dimension values.
 */
export function parseCellKey(key: string): string[] {
  return key.split('|');
}

/**
 * Get cell key from coordinates and dimension values.
 */
export function getCellKeyFromCoordinates(
  rowIndex: number,
  colIndex: number,
  rowValues: string[],
  colValues: string[]
): string {
  return generateCellKey([rowValues[rowIndex], colValues[colIndex]]);
}

/**
 * Calculate total cell count for given dimensions.
 */
export function calculateTotalCells(dimensions: TableDimension[]): number {
  return dimensions.reduce((total, dim) => total * dim.values.length, 1);
}

