import React, { useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import {
  XMarkIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from './Button';
import { Card } from './Card';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

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
  backdrop-filter: blur(4px);
`;

const Modal = styled(Card)`
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  margin: 0;
  padding: 0;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 0 24px;
  margin-bottom: 24px;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 6px;
  color: ${({ theme }) => theme.colours.textSecondary};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.isDarkMode 
      ? 'rgba(255, 255, 255, 0.1)' 
      : '#f1f5f9'
    };
    color: ${({ theme }) => theme.colours.text};
  }
`;

const ModalBody = styled.div`
  padding: 0 24px 24px 24px;
`;

const DropZone = styled.div`
  border: 2px dashed ${({ theme, isDragOver }) => 
    isDragOver 
      ? theme.colours.primary 
      : theme.isDarkMode 
        ? 'rgba(255, 255, 255, 0.2)' 
        : theme.colours.border
  };
  border-radius: ${({ theme }) => theme.radius};
  padding: 48px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${({ theme, isDragOver }) => 
    isDragOver 
      ? theme.isDarkMode 
        ? 'rgba(139, 92, 246, 0.1)' 
        : 'rgba(99, 102, 241, 0.05)'
      : theme.isDarkMode 
        ? 'rgba(255, 255, 255, 0.02)' 
        : '#fafbfc'
  };
  margin-bottom: 24px;
  
  &:hover {
    border-color: ${({ theme }) => theme.colours.primary};
    background: ${({ theme }) => theme.isDarkMode 
      ? 'rgba(139, 92, 246, 0.05)' 
      : 'rgba(99, 102, 241, 0.02)'
    };
  }
`;

const DropZoneIcon = styled.div`
  margin-bottom: 16px;
  color: ${({ theme }) => theme.colours.textSecondary};
`;

const DropZoneText = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: ${({ theme }) => theme.colours.text};
  margin-bottom: 8px;
`;

const DropZoneSubtext = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colours.textSecondary};
`;

const FileInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: ${({ theme }) => theme.isDarkMode 
    ? 'rgba(255, 255, 255, 0.05)' 
    : '#f8fafc'
  };
  border-radius: ${({ theme }) => theme.radius};
  margin-bottom: 24px;
`;

const FileDetails = styled.div`
  flex: 1;
`;

const FileName = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.colours.text};
  margin-bottom: 4px;
`;

const FileSize = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colours.textSecondary};
`;

const RemoveFileButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 6px;
  color: ${({ theme }) => theme.colours.textSecondary};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.isDarkMode 
      ? 'rgba(255, 255, 255, 0.1)' 
      : '#e2e8f0'
    };
    color: ${({ theme }) => theme.colours.danger};
  }
`;

const ValidationSection = styled.div`
  margin-bottom: 24px;
`;

const ValidationTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ValidationResults = styled.div`
  background: ${({ theme }) => theme.isDarkMode 
    ? 'rgba(255, 255, 255, 0.05)' 
    : '#f8fafc'
  };
  border-radius: ${({ theme }) => theme.radius};
  padding: 16px;
  max-height: 200px;
  overflow-y: auto;
`;

const ValidationItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const ValidationIcon = styled.div`
  margin-top: 2px;
  
  ${({ type }) => {
    switch (type) {
      case 'error':
        return 'color: #ef4444;';
      case 'warning':
        return 'color: #f59e0b;';
      case 'success':
        return 'color: #10b981;';
      default:
        return 'color: #6b7280;';
    }
  }}
`;

const ValidationMessage = styled.div`
  flex: 1;
  color: ${({ theme }) => theme.colours.text};
`;

const ImportOptions = styled.div`
  margin-bottom: 24px;
`;

const OptionsTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
`;

const CheckboxItem = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  cursor: pointer;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: ${({ theme }) => theme.colours.primary};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid ${({ theme }) => theme.isDarkMode 
    ? 'rgba(255, 255, 255, 0.1)' 
    : theme.colours.border
  };
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: ${({ theme }) => theme.isDarkMode 
    ? 'rgba(255, 255, 255, 0.1)' 
    : '#e5e7eb'
  };
  border-radius: 4px;
  overflow: hidden;
  margin: 16px 0;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  transition: width 0.3s ease;
  width: ${({ progress }) => progress}%;
`;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DataImportModal = ({
  isOpen,
  onClose,
  onImport,
  onValidate,
  dataType,
  isImporting = false,
  validationResults = null,
  importProgress = 0
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importOptions, setImportOptions] = useState({
    replaceExisting: false,
    continueOnError: true,
    validateOnly: false
  });
  
  const fileInputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file && isValidFileType(file)) {
      setSelectedFile(file);
      if (onValidate) {
        onValidate(file);
      }
    } else {
      alert('Please select a valid file (.xlsx, .xls, .csv, or .json)');
    }
  }, [onValidate]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && isValidFileType(file)) {
      setSelectedFile(file);
      if (onValidate) {
        onValidate(file);
      }
    } else {
      alert('Please select a valid file (.xlsx, .xls, .csv, or .json)');
    }
  };

  const isValidFileType = (file) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/json'
    ];
    const validExtensions = /\.(xlsx|xls|csv|json)$/i;
    
    return validTypes.includes(file.type) || validExtensions.test(file.name);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    
    await onImport(selectedFile, importOptions);
  };

  const handleValidateOnly = async () => {
    if (!selectedFile || !onValidate) return;
    
    await onValidate(selectedFile);
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getValidationIcon = (type) => {
    switch (type) {
      case 'error':
        return <ExclamationCircleIcon width={16} height={16} />;
      case 'warning':
        return <ExclamationTriangleIcon width={16} height={16} />;
      case 'success':
        return <CheckCircleIcon width={16} height={16} />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <ArrowUpTrayIcon width={24} height={24} />
            Import {dataType.charAt(0).toUpperCase() + dataType.slice(1)}
          </ModalTitle>
          <CloseButton onClick={onClose}>
            <XMarkIcon width={20} height={20} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          {!selectedFile ? (
            <>
              <HiddenFileInput
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.json"
                onChange={handleFileSelect}
              />
              
              <DropZone
                isDragOver={isDragOver}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <DropZoneIcon>
                  <ArrowUpTrayIcon width={48} height={48} />
                </DropZoneIcon>
                <DropZoneText>
                  Drop your file here or click to browse
                </DropZoneText>
                <DropZoneSubtext>
                  Supports Excel (.xlsx, .xls), CSV, and JSON files up to 10MB
                </DropZoneSubtext>
              </DropZone>
            </>
          ) : (
            <>
              <FileInfo>
                <DocumentTextIcon width={24} height={24} color="#6b7280" />
                <FileDetails>
                  <FileName>{selectedFile.name}</FileName>
                  <FileSize>{formatFileSize(selectedFile.size)}</FileSize>
                </FileDetails>
                <RemoveFileButton onClick={removeFile}>
                  <XMarkIcon width={20} height={20} />
                </RemoveFileButton>
              </FileInfo>

              {validationResults && (
                <ValidationSection>
                  <ValidationTitle>
                    {validationResults.errors?.length > 0 ? (
                      <ExclamationCircleIcon width={20} height={20} color="#ef4444" />
                    ) : validationResults.warnings?.length > 0 ? (
                      <ExclamationTriangleIcon width={20} height={20} color="#f59e0b" />
                    ) : (
                      <CheckCircleIcon width={20} height={20} color="#10b981" />
                    )}
                    Validation Results
                  </ValidationTitle>
                  
                  <ValidationResults>
                    {validationResults.errors?.map((error, index) => (
                      <ValidationItem key={`error-${index}`}>
                        <ValidationIcon type="error">
                          {getValidationIcon('error')}
                        </ValidationIcon>
                        <ValidationMessage>{error}</ValidationMessage>
                      </ValidationItem>
                    ))}
                    
                    {validationResults.warnings?.map((warning, index) => (
                      <ValidationItem key={`warning-${index}`}>
                        <ValidationIcon type="warning">
                          {getValidationIcon('warning')}
                        </ValidationIcon>
                        <ValidationMessage>{warning}</ValidationMessage>
                      </ValidationItem>
                    ))}
                    
                    {(!validationResults.errors?.length && !validationResults.warnings?.length) && (
                      <ValidationItem>
                        <ValidationIcon type="success">
                          {getValidationIcon('success')}
                        </ValidationIcon>
                        <ValidationMessage>File validation passed successfully</ValidationMessage>
                      </ValidationItem>
                    )}
                  </ValidationResults>
                </ValidationSection>
              )}

              <ImportOptions>
                <OptionsTitle>Import Options</OptionsTitle>
                
                <CheckboxItem>
                  <Checkbox
                    type="checkbox"
                    checked={importOptions.replaceExisting}
                    onChange={e => setImportOptions(prev => ({ 
                      ...prev, 
                      replaceExisting: e.target.checked 
                    }))}
                  />
                  Replace existing records with matching IDs
                </CheckboxItem>
                
                <CheckboxItem>
                  <Checkbox
                    type="checkbox"
                    checked={importOptions.continueOnError}
                    onChange={e => setImportOptions(prev => ({ 
                      ...prev, 
                      continueOnError: e.target.checked 
                    }))}
                  />
                  Continue import even if some records fail
                </CheckboxItem>
              </ImportOptions>

              {isImporting && importProgress > 0 && (
                <div>
                  <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                    Import Progress: {importProgress}%
                  </div>
                  <ProgressBar>
                    <ProgressFill progress={importProgress} />
                  </ProgressBar>
                </div>
              )}
            </>
          )}

          <ButtonGroup>
            <Button variant="ghost" onClick={onClose} disabled={isImporting}>
              Cancel
            </Button>
            
            {selectedFile && onValidate && !validationResults && (
              <Button variant="ghost" onClick={handleValidateOnly}>
                <CheckCircleIcon width={16} height={16} />
                Validate Only
              </Button>
            )}
            
            {selectedFile && (
              <Button 
                onClick={handleImport} 
                disabled={isImporting || (validationResults?.errors?.length > 0 && !importOptions.continueOnError)}
              >
                {isImporting ? (
                  <>
                    <LoadingSpinner />
                    Importing...
                  </>
                ) : (
                  <>
                    <ArrowUpTrayIcon width={16} height={16} />
                    Import Data
                  </>
                )}
              </Button>
            )}
          </ButtonGroup>
        </ModalBody>
      </Modal>
    </Overlay>
  );
};

DataImportModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onImport: PropTypes.func.isRequired,
  onValidate: PropTypes.func,
  dataType: PropTypes.string.isRequired,
  isImporting: PropTypes.bool,
  validationResults: PropTypes.shape({
    errors: PropTypes.arrayOf(PropTypes.string),
    warnings: PropTypes.arrayOf(PropTypes.string)
  }),
  importProgress: PropTypes.number
};

export default DataImportModal;
