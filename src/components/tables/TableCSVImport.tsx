/**
 * TableCSVImport
 * 
 * CSV import component with:
 * - Drag-and-drop file upload
 * - Row-level validation and error reporting
 * - Progress indicator for large files
 * - Preview before import
 */

import React, { useState, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { parseCSV } from '../../services/tableService';
import type { 
  CSVImportResult, 
  CSVImportError, 
  TableValidation,
  TableDimension,
  TableCell,
} from '../../types/table';

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div`
  padding: 24px;
  background: ${({ theme }) => theme.colours?.background || '#fff'};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colours?.border || '#e5e7eb'};
`;

const Title = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
`;

const DropZone = styled.div<{ $isDragging: boolean; $hasFile: boolean }>`
  border: 2px dashed ${({ $isDragging, $hasFile }) => 
    $isDragging ? '#6366f1' : 
    $hasFile ? '#10b981' : '#d1d5db'};
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  background: ${({ $isDragging, $hasFile }) => 
    $isDragging ? '#eef2ff' : 
    $hasFile ? '#ecfdf5' : '#f9fafb'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #6366f1;
    background: #f5f3ff;
  }
`;

const DropIcon = styled.div`
  font-size: 48px;
  margin-bottom: 12px;
`;

const DropText = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin: 0;
`;

const FileName = styled.p`
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  margin: 8px 0 0 0;
`;

const HiddenInput = styled.input`
  display: none;
`;

const ValidationSection = styled.div`
  margin-top: 20px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
`;

const SectionTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
`;

const ValidationFields = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
`;

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const Checkbox = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
`;

const ResultSection = styled.div<{ $success: boolean }>`
  margin-top: 20px;
  padding: 16px;
  border-radius: 8px;
  background: ${({ $success }) => $success ? '#ecfdf5' : '#fef2f2'};
  border: 1px solid ${({ $success }) => $success ? '#10b981' : '#ef4444'};
`;

const ResultTitle = styled.div<{ $success: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ $success }) => $success ? '#059669' : '#dc2626'};
  margin-bottom: 8px;
`;

const Stats = styled.div`
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 12px;
`;

const ErrorList = styled.div`
  max-height: 200px;
  overflow-y: auto;
  font-size: 12px;
  font-family: monospace;
`;

const ErrorItem = styled.div`
  padding: 4px 8px;
  background: #fff;
  border-radius: 4px;
  margin-bottom: 4px;
  color: #dc2626;
`;

const PreviewSection = styled.div`
  margin-top: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
`;

const PreviewTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
`;

const PreviewTh = styled.th`
  background: #f8fafc;
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
  border-bottom: 1px solid #e5e7eb;
  color: #374151;
`;

const PreviewTd = styled.td`
  padding: 8px 12px;
  border-bottom: 1px solid #f3f4f6;
  color: #6b7280;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 20px;
  justify-content: flex-end;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;

  ${({ $variant }) => $variant === 'primary' ? `
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: white;
    border: none;

    &:hover {
      background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  ` : `
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;

    &:hover {
      background: #f9fafb;
    }
  `}
`;

// ============================================================================
// Types
// ============================================================================

interface TableCSVImportProps {
  onImport: (data: { dimensions: TableDimension[]; cells: Record<string, TableCell> }) => void;
  onCancel: () => void;
  existingValidation?: TableValidation;
}

// ============================================================================
// Component
// ============================================================================

export const TableCSVImport: React.FC<TableCSVImportProps> = ({
  onImport,
  onCancel,
  existingValidation,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [result, setResult] = useState<CSVImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Validation options
  const [validation, setValidation] = useState<TableValidation>({
    required: existingValidation?.required ?? false,
    min: existingValidation?.min,
    max: existingValidation?.max,
    decimalPlaces: existingValidation?.decimalPlaces,
  });

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      handleFile(droppedFile);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  }, []);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(f);
  }, []);

  // Parse CSV
  const handleParse = useCallback(() => {
    if (!csvContent) return;

    setIsProcessing(true);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const parseResult = parseCSV(csvContent, validation);
      setResult(parseResult);
      setIsProcessing(false);
    }, 10);
  }, [csvContent, validation]);

  // Import data
  const handleImport = useCallback(() => {
    if (result?.success && result.data) {
      onImport(result.data);
    }
  }, [result, onImport]);

  // Preview data (first 5 rows)
  const previewRows = result?.data ?
    result.data.dimensions[0].values.slice(0, 5) : [];
  const previewCols = result?.data ?
    result.data.dimensions[1].values.slice(0, 5) : [];

  return (
    <Container>
      <Title>Import CSV</Title>

      <DropZone
        $isDragging={isDragging}
        $hasFile={!!file}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <DropIcon>{file ? '✅' : '📄'}</DropIcon>
        <DropText>
          {file
            ? 'File loaded successfully'
            : 'Drop a CSV file here or click to browse'}
        </DropText>
        {file && <FileName>{file.name}</FileName>}
        <HiddenInput
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInput}
        />
      </DropZone>

      {file && (
        <ValidationSection>
          <SectionTitle>Validation Rules</SectionTitle>
          <ValidationFields>
            <FieldGroup>
              <Label>Minimum Value</Label>
              <Input
                type="number"
                value={validation.min ?? ''}
                onChange={(e) => setValidation(v => ({
                  ...v,
                  min: e.target.value ? parseFloat(e.target.value) : undefined
                }))}
                placeholder="No minimum"
              />
            </FieldGroup>
            <FieldGroup>
              <Label>Maximum Value</Label>
              <Input
                type="number"
                value={validation.max ?? ''}
                onChange={(e) => setValidation(v => ({
                  ...v,
                  max: e.target.value ? parseFloat(e.target.value) : undefined
                }))}
                placeholder="No maximum"
              />
            </FieldGroup>
            <FieldGroup>
              <Label>Decimal Places</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={validation.decimalPlaces ?? ''}
                onChange={(e) => setValidation(v => ({
                  ...v,
                  decimalPlaces: e.target.value ? parseInt(e.target.value) : undefined
                }))}
                placeholder="Any"
              />
            </FieldGroup>
          </ValidationFields>
          <div style={{ marginTop: 12 }}>
            <Checkbox>
              <input
                type="checkbox"
                checked={validation.required}
                onChange={(e) => setValidation(v => ({ ...v, required: e.target.checked }))}
              />
              Require all cells to have values
            </Checkbox>
          </div>
        </ValidationSection>
      )}

      {result && (
        <ResultSection $success={result.success}>
          <ResultTitle $success={result.success}>
            {result.success ? '✓ Validation Passed' : '✗ Validation Failed'}
          </ResultTitle>
          <Stats>
            {result.importedRows} of {result.totalRows} rows valid
            {result.errors.length > 0 && ` • ${result.errors.length} errors`}
          </Stats>
          {result.errors.length > 0 && (
            <ErrorList>
              {result.errors.slice(0, 20).map((err, idx) => (
                <ErrorItem key={idx}>
                  Row {err.row}{err.column ? `, Col ${err.column}` : ''}: {err.message}
                </ErrorItem>
              ))}
              {result.errors.length > 20 && (
                <ErrorItem>...and {result.errors.length - 20} more errors</ErrorItem>
              )}
            </ErrorList>
          )}
        </ResultSection>
      )}

      {result?.success && result.data && (
        <PreviewSection>
          <PreviewTable>
            <thead>
              <tr>
                <PreviewTh></PreviewTh>
                {previewCols.map(col => (
                  <PreviewTh key={col}>{col}</PreviewTh>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map(row => (
                <tr key={row}>
                  <PreviewTd style={{ fontWeight: 500 }}>{row}</PreviewTd>
                  {previewCols.map(col => {
                    const key = `${row}|${col}`;
                    const cell = result.data!.cells[key];
                    return (
                      <PreviewTd key={col}>
                        {cell?.value ?? ''}
                      </PreviewTd>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </PreviewTable>
        </PreviewSection>
      )}

      <ButtonGroup>
        <Button $variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        {!result && file && (
          <Button $variant="primary" onClick={handleParse} disabled={isProcessing}>
            {isProcessing ? 'Validating...' : 'Validate'}
          </Button>
        )}
        {result?.success && (
          <Button $variant="primary" onClick={handleImport}>
            Import {result.importedRows} Rows
          </Button>
        )}
      </ButtonGroup>
    </Container>
  );
};

export default TableCSVImport;

