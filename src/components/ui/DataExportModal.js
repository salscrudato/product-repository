import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import {
  XMarkIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Button } from './Button';
import { Card, Input } from './Card';

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
  max-width: 600px;
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

const FormSection = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colours.text};
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => theme.isDarkMode 
    ? 'rgba(255, 255, 255, 0.1)' 
    : theme.colours.border
  };
  border-radius: ${({ theme }) => theme.radius};
  background: ${({ theme }) => theme.isDarkMode 
    ? 'rgba(255, 255, 255, 0.05)' 
    : theme.colours.background
  };
  color: ${({ theme }) => theme.colours.text};
  font-size: 14px;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colours.primary};
    box-shadow: ${({ theme }) => theme.isDarkMode 
      ? `0 0 0 3px rgba(139, 92, 246, 0.1)` 
      : `0 0 0 3px rgba(99, 102, 241, 0.1)`
    };
  }
`;

const CheckboxGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-top: 8px;
`;

const CheckboxItem = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.isDarkMode 
      ? 'rgba(255, 255, 255, 0.05)' 
      : '#f8fafc'
    };
  }
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: ${({ theme }) => theme.colours.primary};
`;

const PreviewSection = styled.div`
  background: ${({ theme }) => theme.isDarkMode 
    ? 'rgba(255, 255, 255, 0.05)' 
    : '#f8fafc'
  };
  border: 1px solid ${({ theme }) => theme.isDarkMode 
    ? 'rgba(255, 255, 255, 0.1)' 
    : theme.colours.border
  };
  border-radius: ${({ theme }) => theme.radius};
  padding: 16px;
  margin-bottom: 24px;
`;

const PreviewTitle = styled.h4`
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
`;

const PreviewStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
`;

const StatItem = styled.div`
  text-align: center;
  padding: 8px;
  background: ${({ theme }) => theme.isDarkMode 
    ? 'rgba(255, 255, 255, 0.05)' 
    : 'white'
  };
  border-radius: 6px;
`;

const StatValue = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.primary};
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colours.textSecondary};
  margin-top: 2px;
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DataExportModal = ({
  isOpen,
  onClose,
  onExport,
  dataType,
  totalRecords = 0,
  availableFields = [],
  availableFormats = ['xlsx', 'csv', 'json'],
  filters = {},
  isExporting = false
}) => {
  const [exportConfig, setExportConfig] = useState({
    format: 'xlsx',
    filename: '',
    includeMetadata: true,
    selectedFields: [],
    dateRange: 'all',
    customStartDate: '',
    customEndDate: ''
  });

  const [previewStats, setPreviewStats] = useState({
    estimatedRecords: totalRecords,
    estimatedSize: '0 KB',
    estimatedTime: '< 1 min'
  });

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setExportConfig({
        format: 'xlsx',
        filename: `${dataType}_export_${new Date().toISOString().split('T')[0]}`,
        includeMetadata: true,
        selectedFields: availableFields.slice(0, 10), // Select first 10 fields by default
        dateRange: 'all',
        customStartDate: '',
        customEndDate: ''
      });
    }
  }, [isOpen, dataType, availableFields]);

  useEffect(() => {
    // Update preview stats when config changes
    const estimatedRecords = Math.min(totalRecords, 10000); // Cap for performance
    const avgRecordSize = exportConfig.format === 'json' ? 500 : 200; // bytes
    const estimatedBytes = estimatedRecords * avgRecordSize;
    const estimatedSize = estimatedBytes > 1024 * 1024 
      ? `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${(estimatedBytes / 1024).toFixed(0)} KB`;
    const estimatedTime = estimatedRecords > 5000 ? '2-3 min' : '< 1 min';

    setPreviewStats({
      estimatedRecords,
      estimatedSize,
      estimatedTime
    });
  }, [exportConfig, totalRecords]);

  const handleFieldToggle = (field) => {
    setExportConfig(prev => ({
      ...prev,
      selectedFields: prev.selectedFields.includes(field)
        ? prev.selectedFields.filter(f => f !== field)
        : [...prev.selectedFields, field]
    }));
  };

  const handleSelectAllFields = () => {
    setExportConfig(prev => ({
      ...prev,
      selectedFields: prev.selectedFields.length === availableFields.length 
        ? [] 
        : [...availableFields]
    }));
  };

  const handleExport = async () => {
    if (exportConfig.selectedFields.length === 0) {
      alert('Please select at least one field to export');
      return;
    }

    await onExport(exportConfig);
  };

  if (!isOpen) return null;

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <DocumentArrowDownIcon width={24} height={24} />
            Export {dataType.charAt(0).toUpperCase() + dataType.slice(1)}
          </ModalTitle>
          <CloseButton onClick={onClose}>
            <XMarkIcon width={20} height={20} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          <FormSection>
            <SectionTitle>Export Settings</SectionTitle>
            
            <FormGroup>
              <Label>File Format</Label>
              <Select
                value={exportConfig.format}
                onChange={e => setExportConfig(prev => ({ ...prev, format: e.target.value }))}
              >
                {availableFormats.map(format => (
                  <option key={format} value={format}>
                    {format.toUpperCase()} - {format === 'xlsx' ? 'Excel Spreadsheet' : 
                     format === 'csv' ? 'Comma Separated Values' : 'JSON Data'}
                  </option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>Filename</Label>
              <Input
                type="text"
                value={exportConfig.filename}
                onChange={e => setExportConfig(prev => ({ ...prev, filename: e.target.value }))}
                placeholder="Enter filename (without extension)"
              />
            </FormGroup>

            <CheckboxItem>
              <Checkbox
                type="checkbox"
                checked={exportConfig.includeMetadata}
                onChange={e => setExportConfig(prev => ({ ...prev, includeMetadata: e.target.checked }))}
              />
              Include metadata (export date, record count, etc.)
            </CheckboxItem>
          </FormSection>

          <FormSection>
            <SectionTitle>
              Fields to Export 
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSelectAllFields}
                style={{ marginLeft: 8 }}
              >
                {exportConfig.selectedFields.length === availableFields.length ? 'Deselect All' : 'Select All'}
              </Button>
            </SectionTitle>
            
            <CheckboxGroup>
              {availableFields.map(field => (
                <CheckboxItem key={field}>
                  <Checkbox
                    type="checkbox"
                    checked={exportConfig.selectedFields.includes(field)}
                    onChange={() => handleFieldToggle(field)}
                  />
                  {field}
                </CheckboxItem>
              ))}
            </CheckboxGroup>
          </FormSection>

          <PreviewSection>
            <PreviewTitle>Export Preview</PreviewTitle>
            <PreviewStats>
              <StatItem>
                <StatValue>{previewStats.estimatedRecords.toLocaleString()}</StatValue>
                <StatLabel>Records</StatLabel>
              </StatItem>
              <StatItem>
                <StatValue>{exportConfig.selectedFields.length}</StatValue>
                <StatLabel>Fields</StatLabel>
              </StatItem>
              <StatItem>
                <StatValue>{previewStats.estimatedSize}</StatValue>
                <StatLabel>Est. Size</StatLabel>
              </StatItem>
              <StatItem>
                <StatValue>{previewStats.estimatedTime}</StatValue>
                <StatLabel>Est. Time</StatLabel>
              </StatItem>
            </PreviewStats>
          </PreviewSection>

          <ButtonGroup>
            <Button variant="ghost" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting || exportConfig.selectedFields.length === 0}>
              {isExporting ? (
                <>
                  <LoadingSpinner />
                  Exporting...
                </>
              ) : (
                <>
                  <DocumentArrowDownIcon width={16} height={16} />
                  Export Data
                </>
              )}
            </Button>
          </ButtonGroup>
        </ModalBody>
      </Modal>
    </Overlay>
  );
};

DataExportModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
  dataType: PropTypes.string.isRequired,
  totalRecords: PropTypes.number,
  availableFields: PropTypes.arrayOf(PropTypes.string),
  availableFormats: PropTypes.arrayOf(PropTypes.string),
  filters: PropTypes.object,
  isExporting: PropTypes.bool
};

export default DataExportModal;
