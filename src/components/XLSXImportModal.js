import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import {
  ArrowUpTrayIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ClockIcon
} from '@heroicons/react/24/solid';
import { processXLSXFile } from '../utils/xlsx';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
`;

const ModalTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    background: #f3f4f6;
    color: #374151;
  }
`;

const DropZone = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  background: #f9fafb;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 24px;
  
  &:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }
  
  &.dragover {
    border-color: #3b82f6;
    background: #eff6ff;
  }
`;

const DropZoneText = styled.div`
  text-align: center;
  color: #6b7280;
  
  .primary {
    font-size: 16px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 4px;
  }
  
  .secondary {
    font-size: 14px;
  }
`;

const ProcessingStatus = styled.div`
  background: #f3f4f6;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
`;

const StatusItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const StatusIcon = styled.div`
  width: 20px;
  height: 20px;
  
  &.success { color: #10b981; }
  &.warning { color: #f59e0b; }
  &.error { color: #ef4444; }
  &.processing { color: #3b82f6; }
`;

const StatusText = styled.span`
  font-size: 14px;
  color: #374151;
`;

const ResultsSection = styled.div`
  margin-top: 24px;
`;

const ResultsTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 16px;
`;

const ResultsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
`;

const ResultCard = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  
  .title {
    font-size: 14px;
    font-weight: 500;
    color: #6b7280;
    margin-bottom: 4px;
  }
  
  .value {
    font-size: 24px;
    font-weight: 600;
    color: #111827;
  }
`;

const ErrorList = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
  
  .error-title {
    font-size: 16px;
    font-weight: 600;
    color: #dc2626;
    margin-bottom: 12px;
  }
  
  .error-item {
    font-size: 14px;
    color: #7f1d1d;
    margin-bottom: 8px;
    padding-left: 16px;
    position: relative;
    
    &:before {
      content: "•";
      position: absolute;
      left: 0;
    }
  }
`;

const Button = styled.button`
  background: ${props => props.variant === 'secondary' ? '#f3f4f6' : '#3b82f6'};
  color: ${props => props.variant === 'secondary' ? '#374151' : 'white'};
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.variant === 'secondary' ? '#e5e7eb' : '#2563eb'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
`;

export default function XLSXImportModal({ open, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  if (!open) return null;

  const handleFileSelect = (selectedFile) => {
    if (selectedFile && (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls'))) {
      setFile(selectedFile);
      setResults(null);
    } else {
      alert('Please select a valid Excel file (.xlsx or .xls)');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleImport = async () => {
    if (!file) return;

    setProcessing(true);
    try {
      const importResults = await processXLSXFile(file, {
        continueOnError: true,
        skipValidation: false
      });
      
      setResults(importResults);
      
      if (importResults.errors.length === 0) {
        onSuccess?.(importResults);
      }
    } catch (error) {
      console.error('Import failed:', error);
      setResults({
        success: [],
        errors: [{ error: error.message, details: error.stack }],
        warnings: [],
        summary: {}
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResults(null);
    setProcessing(false);
    onClose();
  };

  const getTotalRecords = () => {
    if (!results) return 0;
    return results.success.reduce((total, sheet) => total + sheet.recordsCreated, 0);
  };

  return (
    <Overlay onClick={handleClose}>
      <Modal onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Import Excel Data</ModalTitle>
          <CloseButton onClick={handleClose}>×</CloseButton>
        </ModalHeader>

        {!processing && !results && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e.target.files[0])}
            />
            
            <DropZone
              htmlFor="file-input"
              className={dragOver ? 'dragover' : ''}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <ArrowUpTrayIcon width={48} height={48} style={{ color: '#9ca3af', marginBottom: 16 }} />
              <DropZoneText>
                <div className="primary">
                  {file ? file.name : 'Drop Excel file here or click to browse'}
                </div>
                <div className="secondary">
                  Supports .xlsx and .xls files with Product, Forms, Pricing, and Rules sheets
                </div>
              </DropZoneText>
            </DropZone>

            {file && (
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <DocumentTextIcon width={20} height={20} style={{ display: 'inline', marginRight: 8, color: '#3b82f6' }} />
                <span style={{ color: '#374151' }}>Ready to import: {file.name}</span>
              </div>
            )}
          </>
        )}

        {processing && (
          <ProcessingStatus>
            <StatusItem>
              <StatusIcon className="processing">
                <ClockIcon width={20} height={20} />
              </StatusIcon>
              <StatusText>Processing Excel file...</StatusText>
            </StatusItem>
          </ProcessingStatus>
        )}

        {results && (
          <ResultsSection>
            <ResultsTitle>Import Results</ResultsTitle>
            
            <ResultsGrid>
              <ResultCard>
                <div className="title">Total Records</div>
                <div className="value">{getTotalRecords()}</div>
              </ResultCard>
              <ResultCard>
                <div className="title">Sheets Processed</div>
                <div className="value">{results.success.length}</div>
              </ResultCard>
              <ResultCard>
                <div className="title">Errors</div>
                <div className="value" style={{ color: results.errors.length > 0 ? '#dc2626' : '#10b981' }}>
                  {results.errors.length}
                </div>
              </ResultCard>
              <ResultCard>
                <div className="title">Warnings</div>
                <div className="value" style={{ color: results.warnings.length > 0 ? '#f59e0b' : '#10b981' }}>
                  {results.warnings.length}
                </div>
              </ResultCard>
            </ResultsGrid>

            {results.success.length > 0 && (
              <div>
                <h4 style={{ color: '#10b981', marginBottom: 12 }}>Successfully Processed:</h4>
                {results.success.map((sheet, index) => (
                  <StatusItem key={index}>
                    <StatusIcon className="success">
                      <CheckCircleIcon width={20} height={20} />
                    </StatusIcon>
                    <StatusText>
                      {sheet.sheet}: {sheet.recordsCreated} records created
                    </StatusText>
                  </StatusItem>
                ))}
              </div>
            )}

            {results.errors.length > 0 && (
              <ErrorList>
                <div className="error-title">Errors:</div>
                {results.errors.map((error, index) => (
                  <div key={index} className="error-item">
                    {error.sheet ? `${error.sheet}: ` : ''}{error.error}
                  </div>
                ))}
              </ErrorList>
            )}
          </ResultsSection>
        )}

        <ButtonGroup>
          <Button variant="secondary" onClick={handleClose}>
            {results ? 'Close' : 'Cancel'}
          </Button>
          {file && !processing && !results && (
            <Button onClick={handleImport}>
              Import Data
            </Button>
          )}
        </ButtonGroup>
      </Modal>
    </Overlay>
  );
}

XLSXImportModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func
};
