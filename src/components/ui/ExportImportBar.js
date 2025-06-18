import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { Button } from './Button';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const ExportImportContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid ${({ theme }) => theme.isDarkMode 
    ? 'rgba(255, 255, 255, 0.1)' 
    : theme.colours.border
  };
  margin-bottom: 24px;
`;

const ActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ExportButton = styled(Button)`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  font-size: 14px;
  padding: 10px 16px;
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }
`;

const ImportButton = styled(Button)`
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  font-size: 14px;
  padding: 10px 16px;
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
`;

const TemplateButton = styled(Button)`
  background: ${({ theme }) => theme.isDarkMode 
    ? 'rgba(255, 255, 255, 0.1)' 
    : '#f8fafc'
  };
  color: ${({ theme }) => theme.colours.text};
  border: 1px solid ${({ theme }) => theme.isDarkMode 
    ? 'rgba(255, 255, 255, 0.2)' 
    : theme.colours.border
  };
  font-size: 14px;
  padding: 10px 16px;
  
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.isDarkMode 
      ? 'rgba(255, 255, 255, 0.15)' 
      : '#e2e8f0'
    };
    transform: translateY(-1px);
  }
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  
  ${({ status, theme }) => {
    switch (status) {
      case 'processing':
        return `
          background: ${theme.isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe'};
          color: ${theme.isDarkMode ? '#60a5fa' : '#2563eb'};
        `;
      case 'success':
        return `
          background: ${theme.isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5'};
          color: ${theme.isDarkMode ? '#34d399' : '#059669'};
        `;
      case 'error':
        return `
          background: ${theme.isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'};
          color: ${theme.isDarkMode ? '#f87171' : '#dc2626'};
        `;
      case 'warning':
        return `
          background: ${theme.isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7'};
          color: ${theme.isDarkMode ? '#fbbf24' : '#d97706'};
        `;
      default:
        return `
          background: ${theme.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#f1f5f9'};
          color: ${theme.colours.textSecondary};
        `;
    }
  }}
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Universal Export/Import Bar Component
 * Provides consistent export/import functionality across all data screens
 */
const ExportImportBar = ({
  dataType,
  onExport,
  onImport,
  onDownloadTemplate,
  exportFormats = ['xlsx', 'csv', 'json'],
  disabled = false,
  status = 'idle',
  statusMessage = '',
  recordCount = 0,
  showRecordCount = true,
  customActions = []
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleExport = async (format = 'xlsx') => {
    if (disabled || isExporting) return;
    
    setIsExporting(true);
    try {
      await onExport(format);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file || disabled || isImporting) return;
    
    setIsImporting(true);
    try {
      await onImport(file);
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadTemplate = async () => {
    if (disabled || !onDownloadTemplate) return;
    
    try {
      await onDownloadTemplate();
    } catch (error) {
      console.error('Template download failed:', error);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <LoadingSpinner />;
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      default:
        return null;
    }
  };

  return (
    <ExportImportContainer>
      <ActionGroup>
        <ExportButton
          onClick={() => handleExport('xlsx')}
          disabled={disabled || isExporting}
          title="Export data to Excel"
        >
          {isExporting ? (
            <LoadingSpinner />
          ) : (
            <ArrowDownTrayIcon width={16} height={16} />
          )}
          Export
        </ExportButton>

        <ImportButton
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isImporting}
          title="Import data from file"
        >
          {isImporting ? (
            <LoadingSpinner />
          ) : (
            <ArrowUpTrayIcon width={16} height={16} />
          )}
          Import
        </ImportButton>

        <HiddenFileInput
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.json"
          onChange={handleImport}
        />

        {onDownloadTemplate && (
          <TemplateButton
            onClick={handleDownloadTemplate}
            disabled={disabled}
            title="Download import template"
          >
            <DocumentTextIcon width={16} height={16} />
            Template
          </TemplateButton>
        )}

        {customActions.map((action, index) => (
          <Button
            key={index}
            onClick={action.onClick}
            disabled={disabled}
            variant={action.variant || 'ghost'}
            title={action.title}
          >
            {action.icon && <action.icon width={16} height={16} />}
            {action.label}
          </Button>
        ))}
      </ActionGroup>

      {(status !== 'idle' || showRecordCount) && (
        <ActionGroup style={{ marginLeft: 'auto' }}>
          {showRecordCount && recordCount > 0 && (
            <StatusIndicator>
              {recordCount.toLocaleString()} records
            </StatusIndicator>
          )}
          
          {status !== 'idle' && (
            <StatusIndicator status={status}>
              {getStatusIcon()}
              {statusMessage}
            </StatusIndicator>
          )}
        </ActionGroup>
      )}
    </ExportImportContainer>
  );
};

ExportImportBar.propTypes = {
  dataType: PropTypes.string.isRequired,
  onExport: PropTypes.func.isRequired,
  onImport: PropTypes.func.isRequired,
  onDownloadTemplate: PropTypes.func,
  exportFormats: PropTypes.arrayOf(PropTypes.string),
  disabled: PropTypes.bool,
  status: PropTypes.oneOf(['idle', 'processing', 'success', 'error', 'warning']),
  statusMessage: PropTypes.string,
  recordCount: PropTypes.number,
  showRecordCount: PropTypes.bool,
  customActions: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    icon: PropTypes.elementType,
    variant: PropTypes.string,
    title: PropTypes.string
  }))
};

export default ExportImportBar;
