/**
 * FieldCodeInput - Validated input for data dictionary field codes
 * Enforces that only valid dictionary field codes can be selected
 * Provides autocomplete and validation feedback
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { useFieldValidation } from '../../hooks/useFieldValidation';
import { DataDictionaryField } from '../../types/dataDictionary';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/solid';

// ============================================================================
// Types
// ============================================================================

interface FieldCodeInputProps {
  orgId: string;
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  showValidation?: boolean;
  allowEmpty?: boolean;
  className?: string;
}

// ============================================================================
// Styled Components
// ============================================================================

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  position: relative;
  width: 100%;
`;

const InputWrapper = styled.div<{ $status: 'valid' | 'invalid' | 'deprecated' | 'empty' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid ${({ $status }) => {
    switch ($status) {
      case 'valid': return '#10b981';
      case 'invalid': return '#ef4444';
      case 'deprecated': return '#f59e0b';
      default: return '#e2e8f0';
    }
  }};
  border-radius: 8px;
  background: white;
  transition: all 0.15s ease;

  &:focus-within {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const Input = styled.input`
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  background: transparent;
  color: #1f2937;

  &::placeholder {
    color: #9ca3af;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  &:disabled {
    color: #6b7280;
    cursor: not-allowed;
  }
`;

const StatusIcon = styled.div<{ $status: 'valid' | 'invalid' | 'deprecated' | 'empty' }>`
  display: flex;
  align-items: center;
  color: ${({ $status }) => {
    switch ($status) {
      case 'valid': return '#10b981';
      case 'invalid': return '#ef4444';
      case 'deprecated': return '#f59e0b';
      default: return '#9ca3af';
    }
  }};

  svg { width: 16px; height: 16px; }
`;

const DropdownButton = styled.button`
  display: flex;
  align-items: center;
  padding: 4px;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  border-radius: 4px;

  &:hover { background: #f3f4f6; color: #374151; }
  svg { width: 16px; height: 16px; }
`;

const Dropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
  max-height: 240px;
  overflow-y: auto;
  z-index: 100;
  animation: ${fadeIn} 0.15s ease-out;
`;

const DropdownItem = styled.button<{ $selected?: boolean; $deprecated?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: ${({ $selected }) => $selected ? 'rgba(99, 102, 241, 0.08)' : 'transparent'};
  text-align: left;
  cursor: pointer;
  transition: background 0.1s ease;
  opacity: ${({ $deprecated }) => $deprecated ? 0.6 : 1};

  &:hover { background: rgba(99, 102, 241, 0.08); }
  &:first-child { border-radius: 7px 7px 0 0; }
  &:last-child { border-radius: 0 0 7px 7px; }
`;

const FieldInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const FieldCode = styled.code`
  font-size: 13px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  color: #1f2937;
`;

const FieldName = styled.span`
  font-size: 11px;
  color: #6b7280;
`;

const TypeBadge = styled.span`
  font-size: 10px;
  padding: 2px 6px;
  background: #f1f5f9;
  border-radius: 4px;
  color: #64748b;
`;

const ValidationMessage = styled.div<{ $type: 'error' | 'warning' }>`
  font-size: 11px;
  margin-top: 4px;
  color: ${({ $type }) => $type === 'error' ? '#ef4444' : '#f59e0b'};
`;

const EmptyState = styled.div`
  padding: 16px;
  text-align: center;
  color: #6b7280;
  font-size: 13px;
`;

// ============================================================================
// Component
// ============================================================================

export const FieldCodeInput: React.FC<FieldCodeInputProps> = ({
  orgId,
  value,
  onChange,
  placeholder = 'Select or type field code...',
  disabled = false,
  required = false,
  showValidation = true,
  allowEmpty = false,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    validateFieldCode,
    isDeprecated,
    getDeprecationInfo,
    getSuggestions,
    loading
  } = useFieldValidation(orgId);

  // Sync input value with prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get suggestions based on input
  const suggestions = getSuggestions(inputValue);

  // Determine validation status
  const getStatus = useCallback((): 'valid' | 'invalid' | 'deprecated' | 'empty' => {
    if (!inputValue && allowEmpty) return 'empty';
    if (!inputValue && required) return 'invalid';
    if (!inputValue) return 'empty';
    if (isDeprecated(inputValue)) return 'deprecated';
    if (validateFieldCode(inputValue)) return 'valid';
    return 'invalid';
  }, [inputValue, allowEmpty, required, isDeprecated, validateFieldCode]);

  const status = getStatus();
  const deprecationInfo = status === 'deprecated' ? getDeprecationInfo(inputValue) : null;

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
  };

  // Handle blur - validate and commit
  const handleBlur = () => {
    // Only commit if valid or empty (when allowed)
    if (validateFieldCode(inputValue) || (allowEmpty && !inputValue)) {
      onChange(inputValue);
    } else if (isDeprecated(inputValue)) {
      // Allow deprecated fields with warning
      onChange(inputValue);
    } else {
      // Invalid - revert to original value
      setInputValue(value);
    }
  };

  // Handle dropdown selection
  const handleSelect = (field: DataDictionaryField) => {
    setInputValue(field.code);
    onChange(field.code);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Render status icon
  const renderStatusIcon = () => {
    if (!showValidation || loading) return null;

    switch (status) {
      case 'valid':
        return <CheckCircleIcon />;
      case 'invalid':
        return <XCircleIcon />;
      case 'deprecated':
        return <ExclamationTriangleIcon />;
      default:
        return null;
    }
  };

  return (
    <Container ref={containerRef} className={className}>
      <InputWrapper $status={showValidation ? status : 'empty'}>
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
        />
        {showValidation && (
          <StatusIcon $status={status}>
            {renderStatusIcon()}
          </StatusIcon>
        )}
        <DropdownButton
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <ChevronDownIcon />
        </DropdownButton>
      </InputWrapper>

      {isOpen && !disabled && (
        <Dropdown>
          {suggestions.length === 0 ? (
            <EmptyState>
              {loading ? 'Loading...' : 'No matching fields found'}
            </EmptyState>
          ) : (
            suggestions.map(field => (
              <DropdownItem
                key={field.id}
                onClick={() => handleSelect(field)}
                $selected={field.code === inputValue}
                $deprecated={field.status === 'deprecated'}
              >
                <FieldInfo>
                  <FieldCode>{field.code}</FieldCode>
                  <FieldName>{field.displayName}</FieldName>
                </FieldInfo>
                <TypeBadge>{field.type}</TypeBadge>
              </DropdownItem>
            ))
          )}
        </Dropdown>
      )}

      {showValidation && status === 'invalid' && inputValue && (
        <ValidationMessage $type="error">
          Field code "{inputValue}" does not exist in the data dictionary
        </ValidationMessage>
      )}

      {showValidation && status === 'deprecated' && deprecationInfo && (
        <ValidationMessage $type="warning">
          {deprecationInfo.message}
          {deprecationInfo.replacedBy && ` Use "${deprecationInfo.replacedBy}" instead.`}
        </ValidationMessage>
      )}
    </Container>
  );
};

export default FieldCodeInput;

