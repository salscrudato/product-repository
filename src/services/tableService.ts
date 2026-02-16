/**
 * Table Service
 * 
 * Client-side service for org-scoped rating tables with versioning.
 * Supports large tables with sparse/dense storage, CSV import/export,
 * version comparison, and clone-to-draft workflows.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, safeOnSnapshot } from '../firebase';
import type {
  RatingTable,
  TableVersion,
  TableVersionStatus,
  TableDimension,
  TableCell,
  CellStorage,
  TableValidation,
  TableVersionDiff,
  CSVImportResult,
  CSVImportError,
  CSVImportWarning,
  CSVExportOptions,
  generateCellKey,
  parseCellKey,
} from '../types/table';

// ============================================================================
// Collection Paths
// ============================================================================

const getTablesPath = (orgId: string) =>
  `orgs/${orgId}/tables`;

const getVersionsPath = (orgId: string, tableId: string) =>
  `orgs/${orgId}/tables/${tableId}/versions`;

// ============================================================================
// Rating Table CRUD
// ============================================================================

export async function createTable(
  orgId: string,
  data: Omit<RatingTable, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<string> {
  const colRef = collection(db, getTablesPath(orgId));
  const now = Timestamp.now();
  
  const docRef = await addDoc(colRef, {
    ...data,
    orgId,
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
  });

  return docRef.id;
}

export async function getTable(
  orgId: string,
  tableId: string
): Promise<RatingTable | null> {
  const docRef = doc(db, getTablesPath(orgId), tableId);
  const snapshot = await getDoc(docRef);
  
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as RatingTable;
}

export async function getTables(
  orgId: string
): Promise<RatingTable[]> {
  const colRef = collection(db, getTablesPath(orgId));
  const q = query(colRef, orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RatingTable));
}

export function subscribeTables(
  orgId: string,
  onData: (tables: RatingTable[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, getTablesPath(orgId));
  const q = query(colRef, orderBy('name'));
  
  return safeOnSnapshot(q, 
    (snapshot) => {
      const tables = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RatingTable));
      onData(tables);
    },
    (error) => onError?.(error)
  );
}

export async function updateTable(
  orgId: string,
  tableId: string,
  data: Partial<RatingTable>,
  userId: string
): Promise<void> {
  const docRef = doc(db, getTablesPath(orgId), tableId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
}

export async function deleteTable(
  orgId: string,
  tableId: string
): Promise<void> {
  const docRef = doc(db, getTablesPath(orgId), tableId);
  await deleteDoc(docRef);
}

// ============================================================================
// Table Version CRUD
// ============================================================================

export async function createVersion(
  orgId: string,
  tableId: string,
  data: Omit<TableVersion, 'id' | 'tableId' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<string> {
  const colRef = collection(db, getVersionsPath(orgId, tableId));
  const now = Timestamp.now();
  
  const docRef = await addDoc(colRef, {
    ...data,
    tableId,
    status: 'draft' as TableVersionStatus,
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
  });

  return docRef.id;
}

export async function getVersion(
  orgId: string,
  tableId: string,
  versionId: string
): Promise<TableVersion | null> {
  const docRef = doc(db, getVersionsPath(orgId, tableId), versionId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as TableVersion;
}

export async function getVersions(
  orgId: string,
  tableId: string,
  status?: TableVersionStatus
): Promise<TableVersion[]> {
  const colRef = collection(db, getVersionsPath(orgId, tableId));
  let q = query(colRef, orderBy('versionNumber', 'desc'));

  if (status) {
    q = query(colRef, where('status', '==', status), orderBy('versionNumber', 'desc'));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TableVersion));
}

export function subscribeVersions(
  orgId: string,
  tableId: string,
  onData: (versions: TableVersion[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, getVersionsPath(orgId, tableId));
  const q = query(colRef, orderBy('versionNumber', 'desc'));

  return safeOnSnapshot(q,
    (snapshot) => {
      const versions = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TableVersion));
      onData(versions);
    },
    (error) => onError?.(error)
  );
}

export async function updateVersion(
  orgId: string,
  tableId: string,
  versionId: string,
  data: Partial<TableVersion>,
  userId: string
): Promise<void> {
  const docRef = doc(db, getVersionsPath(orgId, tableId), versionId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
}

export async function publishVersion(
  orgId: string,
  tableId: string,
  versionId: string,
  userId: string,
  effectiveStart: Date,
  effectiveEnd?: Date
): Promise<void> {
  const docRef = doc(db, getVersionsPath(orgId, tableId), versionId);

  await updateDoc(docRef, {
    status: 'published' as TableVersionStatus,
    publishedAt: Timestamp.now(),
    publishedBy: userId,
    effectiveStart: Timestamp.fromDate(effectiveStart),
    effectiveEnd: effectiveEnd ? Timestamp.fromDate(effectiveEnd) : null,
  });
}

// ============================================================================
// Clone to Draft
// ============================================================================

export async function cloneVersionToDraft(
  orgId: string,
  tableId: string,
  sourceVersionId: string,
  userId: string
): Promise<string> {
  // Get source version
  const source = await getVersion(orgId, tableId, sourceVersionId);
  if (!source) {
    throw new Error('Source version not found');
  }

  // Get highest version number
  const versions = await getVersions(orgId, tableId);
  const maxVersion = versions.reduce((max, v) => Math.max(max, v.versionNumber), 0);

  // Create new draft
  const colRef = collection(db, getVersionsPath(orgId, tableId));
  const now = Timestamp.now();

  const docRef = await addDoc(colRef, {
    tableId,
    versionNumber: maxVersion + 1,
    status: 'draft' as TableVersionStatus,
    dimensions: source.dimensions,
    cellStorage: source.cellStorage,
    validation: source.validation,
    clonedFrom: {
      versionId: sourceVersionId,
      versionNumber: source.versionNumber,
    },
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
  });

  return docRef.id;
}

// ============================================================================
// Version Comparison
// ============================================================================

export async function compareVersions(
  orgId: string,
  tableId: string,
  sourceVersionId: string,
  targetVersionId: string
): Promise<TableVersionDiff> {
  const [source, target] = await Promise.all([
    getVersion(orgId, tableId, sourceVersionId),
    getVersion(orgId, tableId, targetVersionId),
  ]);

  if (!source || !target) {
    throw new Error('One or both versions not found');
  }

  const sourceCells = source.cellStorage.cells || {};
  const targetCells = target.cellStorage.cells || {};

  const added: Record<string, TableCell> = {};
  const removed: Record<string, TableCell> = {};
  const modified: Record<string, { before: TableCell; after: TableCell }> = {};

  const allKeys = new Set([...Object.keys(sourceCells), ...Object.keys(targetCells)]);
  let unchangedCount = 0;

  for (const key of allKeys) {
    const sourceCell = sourceCells[key];
    const targetCell = targetCells[key];

    if (!sourceCell && targetCell) {
      added[key] = targetCell;
    } else if (sourceCell && !targetCell) {
      removed[key] = sourceCell;
    } else if (sourceCell && targetCell) {
      if (sourceCell.value !== targetCell.value) {
        modified[key] = { before: sourceCell, after: targetCell };
      } else {
        unchangedCount++;
      }
    }
  }

  return {
    sourceVersion: sourceVersionId,
    targetVersion: targetVersionId,
    added,
    removed,
    modified,
    summary: {
      addedCount: Object.keys(added).length,
      removedCount: Object.keys(removed).length,
      modifiedCount: Object.keys(modified).length,
      unchangedCount,
    },
  };
}

// ============================================================================
// CSV Import/Export
// ============================================================================

/**
 * Parse a CSV string into table data.
 * First row is column headers, first column is row headers.
 * Returns dimensions and cell data with row-level validation.
 */
export function parseCSV(
  csvContent: string,
  validation?: TableValidation
): CSVImportResult {
  const errors: CSVImportError[] = [];
  const warnings: CSVImportWarning[] = [];

  // Parse lines
  const lines = csvContent.trim().split('\n').map(line =>
    line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
  );

  if (lines.length < 2) {
    return {
      success: false,
      totalRows: lines.length,
      importedRows: 0,
      errors: [{ row: 0, message: 'CSV must have at least 2 rows (header + data)' }],
      warnings: [],
    };
  }

  // First row is column headers (skip first cell which is the corner)
  const headerRow = lines[0];
  const colValues = headerRow.slice(1);

  if (colValues.length === 0) {
    return {
      success: false,
      totalRows: lines.length,
      importedRows: 0,
      errors: [{ row: 0, message: 'No column headers found' }],
      warnings: [],
    };
  }

  // Extract row values from first column
  const rowValues: string[] = [];
  const cells: Record<string, TableCell> = {};
  let importedRows = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

    const rowValue = row[0];
    if (!rowValue) {
      errors.push({ row: i, message: 'Missing row header' });
      continue;
    }

    rowValues.push(rowValue);
    let rowValid = true;

    for (let j = 1; j < row.length && j <= colValues.length; j++) {
      const cellValue = row[j];
      const colValue = colValues[j - 1];
      const cellKey = `${rowValue}|${colValue}`;

      // Parse numeric value
      let numericValue: number | null = null;
      if (cellValue !== '' && cellValue !== undefined) {
        numericValue = parseFloat(cellValue);
        if (isNaN(numericValue)) {
          errors.push({
            row: i,
            column: j,
            message: `Invalid number: "${cellValue}"`,
            value: cellValue,
          });
          rowValid = false;
          continue;
        }

        // Validate against rules
        if (validation) {
          if (validation.min !== undefined && numericValue < validation.min) {
            errors.push({
              row: i,
              column: j,
              message: `Value ${numericValue} is below minimum ${validation.min}`,
              value: cellValue,
            });
            rowValid = false;
          }
          if (validation.max !== undefined && numericValue > validation.max) {
            errors.push({
              row: i,
              column: j,
              message: `Value ${numericValue} is above maximum ${validation.max}`,
              value: cellValue,
            });
            rowValid = false;
          }
        }
      } else if (validation?.required) {
        errors.push({
          row: i,
          column: j,
          message: 'Required value is missing',
        });
        rowValid = false;
      }

      cells[cellKey] = { value: numericValue };
    }

    if (rowValid) importedRows++;
  }

  // Create dimensions
  const dimensions: TableDimension[] = [
    {
      id: 'row',
      name: 'Row',
      fieldCode: '',
      position: 0,
      values: rowValues,
      valueType: 'string',
    },
    {
      id: 'col',
      name: 'Column',
      fieldCode: '',
      position: 1,
      values: colValues,
      valueType: 'string',
    },
  ];

  return {
    success: errors.length === 0,
    totalRows: lines.length - 1,
    importedRows,
    errors,
    warnings,
    data: {
      dimensions,
      cells,
    },
  };
}

/**
 * Export table data to CSV string.
 */
export function exportToCSV(
  version: TableVersion,
  options: CSVExportOptions = {
    includeHeaders: true,
    decimalSeparator: '.',
    valueDelimiter: ',',
    includeEmptyCells: true,
  }
): string {
  const { includeHeaders, valueDelimiter, includeEmptyCells } = options;
  const rows: string[] = [];

  if (version.dimensions.length < 2) {
    throw new Error('Table must have at least 2 dimensions for CSV export');
  }

  const rowDim = version.dimensions.find(d => d.position === 0);
  const colDim = version.dimensions.find(d => d.position === 1);

  if (!rowDim || !colDim) {
    throw new Error('Missing row or column dimension');
  }

  // Header row
  if (includeHeaders) {
    const headerRow = ['', ...colDim.values].join(valueDelimiter);
    rows.push(headerRow);
  }

  // Data rows
  const cells = version.cellStorage.cells || {};
  const defaultValue = version.cellStorage.defaultValue;

  for (const rowValue of rowDim.values) {
    const rowCells: string[] = [rowValue];

    for (const colValue of colDim.values) {
      const cellKey = `${rowValue}|${colValue}`;
      const cell = cells[cellKey];

      if (cell?.value !== null && cell?.value !== undefined) {
        rowCells.push(cell.value.toString());
      } else if (defaultValue !== undefined && includeEmptyCells) {
        rowCells.push(defaultValue.toString());
      } else if (includeEmptyCells) {
        rowCells.push('');
      }
    }

    rows.push(rowCells.join(valueDelimiter));
  }

  return rows.join('\n');
}

// ============================================================================
// Cell Operations
// ============================================================================

/**
 * Update multiple cells in a version (batch update).
 */
export async function updateCells(
  orgId: string,
  tableId: string,
  versionId: string,
  cellUpdates: Record<string, TableCell>,
  userId: string
): Promise<void> {
  const version = await getVersion(orgId, tableId, versionId);
  if (!version) {
    throw new Error('Version not found');
  }

  if (version.status !== 'draft') {
    throw new Error('Cannot modify published version');
  }

  // Merge with existing cells
  const existingCells = version.cellStorage.cells || {};
  const newCells = { ...existingCells, ...cellUpdates };

  // Calculate stats
  const populatedCells = Object.values(newCells).filter(c => c.value !== null).length;
  let minValue: number | undefined;
  let maxValue: number | undefined;

  for (const cell of Object.values(newCells)) {
    if (cell.value !== null) {
      if (minValue === undefined || cell.value < minValue) minValue = cell.value;
      if (maxValue === undefined || cell.value > maxValue) maxValue = cell.value;
    }
  }

  const docRef = doc(db, getVersionsPath(orgId, tableId), versionId);
  await updateDoc(docRef, {
    'cellStorage.cells': newCells,
    'stats.populatedCells': populatedCells,
    'stats.minValue': minValue,
    'stats.maxValue': maxValue,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
}

/**
 * Clear specific cells in a version.
 */
export async function clearCells(
  orgId: string,
  tableId: string,
  versionId: string,
  cellKeys: string[],
  userId: string
): Promise<void> {
  const version = await getVersion(orgId, tableId, versionId);
  if (!version) {
    throw new Error('Version not found');
  }

  if (version.status !== 'draft') {
    throw new Error('Cannot modify published version');
  }

  const existingCells = { ...(version.cellStorage.cells || {}) };
  for (const key of cellKeys) {
    delete existingCells[key];
  }

  const docRef = doc(db, getVersionsPath(orgId, tableId), versionId);
  await updateDoc(docRef, {
    'cellStorage.cells': existingCells,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
}

