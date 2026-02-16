/**
 * FormsStep - Wizard step for linking forms to coverage
 * ENHANCED: Better visual hierarchy, drag indicators, and premium styling
 */

import React, { useState, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  SparklesIcon,
  Bars3Icon,
  StarIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { FormTemplate } from '../../types';

interface FormsStepProps {
  forms: FormTemplate[];
  selectedFormIds: string[];
  onFormToggle: (formId: string) => void;
  onSelectAll: (formIds: string[]) => void;
  suggestedFormIds?: string[];
  isLoading?: boolean;
}

export const FormsStep: React.FC<FormsStepProps> = ({
  forms,
  selectedFormIds,
  onFormToggle,
  onSelectAll,
  suggestedFormIds = [],
  isLoading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'selected' | 'suggested'>('all');

  const filteredForms = useMemo(() => {
    let result = forms;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(f => 
        f.formName?.toLowerCase().includes(query) ||
        f.formNumber?.toLowerCase().includes(query) ||
        f.category?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (filterType === 'selected') {
      result = result.filter(f => selectedFormIds.includes(f.id));
    } else if (filterType === 'suggested') {
      result = result.filter(f => suggestedFormIds.includes(f.id));
    }

    return result;
  }, [forms, searchQuery, filterType, selectedFormIds, suggestedFormIds]);

  const suggestedForms = useMemo(() => 
    forms.filter(f => suggestedFormIds.includes(f.id)),
    [forms, suggestedFormIds]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Link Forms</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Select forms that apply to this coverage. The AI can suggest relevant forms based on coverage type.
        </p>
      </div>

      {/* AI Suggestions */}
      {suggestedForms.length > 0 && (
        <div
          className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20
                     rounded-xl p-4 border border-blue-200 dark:border-blue-800 animate-fade-in"
        >
          <div className="flex items-center gap-2 mb-3">
            <SparklesIcon className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              AI Suggested Forms ({suggestedForms.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedForms.map(form => (
              <button
                key={form.id}
                onClick={() => onFormToggle(form.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  selectedFormIds.includes(form.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-100'
                }`}
              >
                {selectedFormIds.includes(form.id) && <CheckIcon className="h-3.5 w-3.5" />}
                {form.formNumber || form.formName}
              </button>
            ))}
            <button
              onClick={() => onSelectAll(suggestedFormIds)}
              className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Add all suggested
            </button>
          </div>
        </div>
      )}

      {/* Search and filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search forms..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
          {(['all', 'selected', 'suggested'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-2 text-sm capitalize ${
                filterType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Forms list */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredForms.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? 'No forms match your search' : 'No forms available'}
          </div>
        ) : (
          filteredForms.map((form, index) => (
            <div
              key={form.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all animate-fade-in ${
                selectedFormIds.includes(form.id)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
              style={{ animationDelay: `${index * 30}ms` }}
              onClick={() => onFormToggle(form.id)}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                selectedFormIds.includes(form.id)
                  ? 'border-blue-600 bg-blue-600'
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {selectedFormIds.includes(form.id) && <CheckIcon className="h-3 w-3 text-white" />}
              </div>
              <DocumentTextIcon className="h-5 w-5 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {form.formName || 'Unnamed Form'}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {form.formNumber} • {form.category || 'Uncategorized'}
                </p>
              </div>
              {suggestedFormIds.includes(form.id) && (
                <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                  Suggested
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Selection summary */}
      <SelectionSummary>
        <SummaryIcon $hasSelection={selectedFormIds.length > 0}>
          {selectedFormIds.length > 0 ? <CheckCircleSolid /> : <DocumentTextIcon />}
        </SummaryIcon>
        <SummaryText>
          <strong>{selectedFormIds.length}</strong> form{selectedFormIds.length !== 1 ? 's' : ''} selected
          {suggestedFormIds.length > 0 && selectedFormIds.length < suggestedFormIds.length && (
            <SuggestionHint>
              • {suggestedFormIds.length - selectedFormIds.filter(id => suggestedFormIds.includes(id)).length} more suggested
            </SuggestionHint>
          )}
        </SummaryText>
      </SelectionSummary>
    </div>
  );
};

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

// Styled Components
const SelectionSummary = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: linear-gradient(135deg,
    ${({ theme }) => theme.colours.backgroundAlt},
    ${({ theme }) => theme.colours.background}
  );
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: 12px;
  animation: ${fadeIn} 0.3s ease-out;
`;

const SummaryIcon = styled.div<{ $hasSelection: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${({ $hasSelection }) =>
    $hasSelection
      ? 'linear-gradient(135deg, #10b981, #059669)'
      : 'rgba(156, 163, 175, 0.2)'
  };
  transition: all 0.3s ease;

  ${({ $hasSelection }) => $hasSelection && css`
    animation: ${pulse} 0.5s ease-out;
  `}

  svg {
    width: 16px;
    height: 16px;
    color: ${({ $hasSelection }) => $hasSelection ? 'white' : '#9ca3af'};
  }
`;

const SummaryText = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colours.text};

  strong {
    font-weight: 600;
    color: ${({ theme }) => theme.colours.primary};
  }
`;

const SuggestionHint = styled.span`
  color: ${({ theme }) => theme.colours.textMuted};
  margin-left: 4px;
`;

export default FormsStep;

