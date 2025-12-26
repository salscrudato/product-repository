/**
 * Select - Accessible dropdown select component
 */

import React, { useState, useRef, useCallback, useEffect, KeyboardEvent } from 'react';
import styled, { css } from 'styled-components';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/solid';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  label?: string;
  id?: string;
  className?: string;
}

const SelectContainer = styled.div`position: relative; width: 100%;`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colours.text};
  margin-bottom: 6px;
`;

const SelectButton = styled.button<{ $isOpen: boolean; $hasError: boolean; $hasValue: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 15px;
  font-family: inherit;
  text-align: left;
  color: ${({ theme, $hasValue }) => $hasValue ? theme.colours.text : theme.colours.textMuted};
  background: ${({ theme }) => theme.colours.background};
  border: 1.5px solid ${({ theme, $hasError, $isOpen }) => 
    $hasError ? theme.colours.error : $isOpen ? theme.colours.primary : theme.colours.border};
  border-radius: ${({ theme }) => theme.radiusMd};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) { border-color: ${({ theme, $hasError }) => $hasError ? theme.colours.error : theme.colours.primary}; }
  &:focus { outline: none; border-color: ${({ theme }) => theme.colours.primary}; box-shadow: ${({ theme }) => theme.shadowFocus}; }
  &:disabled { opacity: 0.6; cursor: not-allowed; background: ${({ theme }) => theme.colours.backgroundSubtle}; }
  
  svg { width: 20px; height: 20px; color: ${({ theme }) => theme.colours.textMuted}; transition: transform 0.2s ease;
    ${({ $isOpen }) => $isOpen && css`transform: rotate(180deg);`} }
`;

const SelectedContent = styled.span`display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;

const Dropdown = styled.ul<{ $isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 280px;
  overflow-y: auto;
  background: ${({ theme }) => theme.colours.background};
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: ${({ theme }) => theme.radiusMd};
  box-shadow: ${({ theme }) => theme.shadowLg};
  z-index: 1000;
  list-style: none;
  margin: 0;
  padding: 4px;
  opacity: ${({ $isOpen }) => $isOpen ? 1 : 0};
  visibility: ${({ $isOpen }) => $isOpen ? 'visible' : 'hidden'};
  transform: ${({ $isOpen }) => $isOpen ? 'translateY(0)' : 'translateY(-8px)'};
  transition: all 0.2s ease;
`;

const Option = styled.li<{ $isSelected: boolean; $isFocused: boolean; $isDisabled: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  font-size: 14px;
  border-radius: ${({ theme }) => theme.radiusSm};
  cursor: ${({ $isDisabled }) => $isDisabled ? 'not-allowed' : 'pointer'};
  color: ${({ theme, $isDisabled }) => $isDisabled ? theme.colours.textMuted : theme.colours.text};
  background: ${({ theme, $isSelected, $isFocused }) => 
    $isSelected ? theme.colours.primaryLight : $isFocused ? theme.colours.hover : 'transparent'};
  transition: background 0.15s ease;
  
  &:hover:not([aria-disabled="true"]) { background: ${({ theme, $isSelected }) => $isSelected ? theme.colours.primaryLight : theme.colours.hover}; }
`;

const OptionIcon = styled.span`display: flex; align-items: center; flex-shrink: 0; svg { width: 16px; height: 16px; }`;
const CheckMark = styled.span`margin-left: auto; color: ${({ theme }) => theme.colours.primary}; svg { width: 16px; height: 16px; }`;
const ErrorMessage = styled.span`display: block; font-size: 13px; color: ${({ theme }) => theme.colours.error}; margin-top: 4px;`;

export const Select: React.FC<SelectProps> = ({ options, value, onChange, placeholder = 'Select an option', disabled = false, error = false, errorMessage, label, id, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const selectedOption = options.find(opt => opt.value === value);
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case 'Enter': case ' ': e.preventDefault();
        if (!isOpen) { setIsOpen(true); setFocusedIndex(options.findIndex(opt => opt.value === value)); }
        else if (focusedIndex >= 0 && !options[focusedIndex]?.disabled) { onChange(options[focusedIndex].value); setIsOpen(false); }
        break;
      case 'ArrowDown': e.preventDefault();
        if (!isOpen) setIsOpen(true);
        else setFocusedIndex(prev => { let next = prev + 1; while (next < options.length && options[next]?.disabled) next++; return next < options.length ? next : prev; });
        break;
      case 'ArrowUp': e.preventDefault();
        if (isOpen) setFocusedIndex(prev => { let next = prev - 1; while (next >= 0 && options[next]?.disabled) next--; return next >= 0 ? next : prev; });
        break;
      case 'Escape': setIsOpen(false); buttonRef.current?.focus(); break;
      case 'Tab': setIsOpen(false); break;
    }
  }, [isOpen, focusedIndex, options, value, onChange]);
  
  const handleOptionClick = useCallback((optionValue: string, isDisabled?: boolean) => {
    if (isDisabled) return;
    onChange(optionValue); setIsOpen(false); buttonRef.current?.focus();
  }, [onChange]);
  
  return (
    <SelectContainer ref={containerRef} className={className}>
      {label && <Label htmlFor={selectId}>{label}</Label>}
      <SelectButton ref={buttonRef} id={selectId} type="button" role="combobox" aria-expanded={isOpen} aria-haspopup="listbox" aria-controls={`${selectId}-listbox`} aria-invalid={error} disabled={disabled} $isOpen={isOpen} $hasError={error} $hasValue={!!selectedOption} onClick={() => !disabled && setIsOpen(!isOpen)} onKeyDown={handleKeyDown}>
        <SelectedContent>{selectedOption?.icon && <OptionIcon>{selectedOption.icon}</OptionIcon>}{selectedOption?.label || placeholder}</SelectedContent>
        <ChevronDownIcon />
      </SelectButton>
      <Dropdown id={`${selectId}-listbox`} role="listbox" aria-labelledby={selectId} $isOpen={isOpen}>
        {options.map((option, index) => (
          <Option key={option.value} role="option" aria-selected={option.value === value} aria-disabled={option.disabled} $isSelected={option.value === value} $isFocused={index === focusedIndex} $isDisabled={!!option.disabled} onClick={() => handleOptionClick(option.value, option.disabled)} onMouseEnter={() => !option.disabled && setFocusedIndex(index)}>
            {option.icon && <OptionIcon>{option.icon}</OptionIcon>}{option.label}{option.value === value && <CheckMark><CheckIcon /></CheckMark>}
          </Option>
        ))}
      </Dropdown>
      {error && errorMessage && <ErrorMessage id={`${selectId}-error`} role="alert">{errorMessage}</ErrorMessage>}
    </SelectContainer>
  );
};

export default Select;

