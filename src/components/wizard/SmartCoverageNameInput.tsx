/**
 * SmartCoverageNameInput - AI-powered coverage name input with suggestions
 *
 * Features:
 * - Real-time AI-powered coverage name suggestions
 * - Auto-generated coverage codes
 * - Duplicate detection with visual feedback
 * - Premium animations and micro-interactions
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  SparklesIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  TagIcon,
  DocumentDuplicateIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { SparklesIcon as SparklesSolid } from '@heroicons/react/24/solid';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import { searchCoverages, suggestMissingCoverages, SearchResult } from '../../services/coverageSearch';

interface SmartCoverageNameInputProps {
  value: string;
  coverageCode: string;
  onChange: (name: string) => void;
  onCodeChange: (code: string) => void;
  existingCoverageNames?: string[];
  productLineOfBusiness?: string;
  isAutoCodeEnabled?: boolean;
  productId?: string;
}

// Match type icons
const getMatchTypeIcon = (matchType: SearchResult['matchType']) => {
  switch (matchType) {
    case 'exact':
      return <CheckCircleIcon />;
    case 'abbreviation':
      return <TagIcon />;
    case 'alias':
      return <DocumentDuplicateIcon />;
    case 'keyword':
      return <LinkIcon />;
    default:
      return <LightBulbIcon />;
  }
};

// Generate coverage code from name
const generateCoverageCode = (name: string): string => {
  if (!name) return '';
  const words = name.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 1) {
    return words[0].substring(0, 4).toUpperCase();
  }
  const initials = words.map(w => w[0]).join('').toUpperCase();
  return initials.substring(0, 4);
};

export const SmartCoverageNameInput: React.FC<SmartCoverageNameInputProps> = ({
  value,
  coverageCode,
  onChange,
  onCodeChange,
  existingCoverageNames = [],
  productLineOfBusiness = 'default',
  isAutoCodeEnabled = true,
  productId,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasUserEditedCode, setHasUserEditedCode] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Fetch AI suggestions when user types (for additional semantic context)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Only call AI for longer queries or when fuzzy search finds few results
    if (value && value.length >= 4) {
      const fuzzyResults = searchCoverages(value, {
        lineOfBusiness: productLineOfBusiness,
        maxResults: 8,
      });

      // Only call AI if we have few fuzzy results
      if (fuzzyResults.length < 3) {
        debounceRef.current = setTimeout(async () => {
          setIsLoadingAI(true);
          try {
            const suggestCoverageNames = httpsCallable<
              { query: string; lineOfBusiness: string; existingNames: string[] },
              { suggestions: string[] }
            >(functions, 'suggestCoverageNames');

            const result = await suggestCoverageNames({
              query: value,
              lineOfBusiness: productLineOfBusiness,
              existingNames: existingCoverageNames.slice(0, 20),
            });

            setAiSuggestions(result.data.suggestions || []);
          } catch (err) {
            console.error('AI suggestion error:', err);
            setAiSuggestions([]);
          } finally {
            setIsLoadingAI(false);
          }
        }, 500); // 500ms debounce for AI calls
      }
    } else {
      setAiSuggestions([]);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, productLineOfBusiness, existingCoverageNames]);

  // Intelligent fuzzy search with combined results
  const suggestions = useMemo((): SearchResult[] => {
    // Get fuzzy search results
    const fuzzyResults = searchCoverages(value, {
      lineOfBusiness: productLineOfBusiness,
      maxResults: 8,
      includeRelated: true,
    });

    // Filter out already existing coverages
    const filtered = fuzzyResults.filter(
      r => !existingCoverageNames.some(
        existing => existing.toLowerCase() === r.name.toLowerCase()
      )
    );

    // If few results and we have AI suggestions, merge them
    if (filtered.length < 5 && aiSuggestions.length > 0) {
      const aiResults: SearchResult[] = aiSuggestions
        .filter(ai => !filtered.some(f => f.name.toLowerCase() === ai.toLowerCase()))
        .map(ai => ({
          name: ai,
          score: 75,
          matchType: 'keyword' as const,
          category: 'AI Suggested',
        }));

      return [...filtered, ...aiResults].slice(0, 8);
    }

    // If still few results and user is typing, suggest missing coverages
    if (filtered.length < 4 && existingCoverageNames.length > 0) {
      const missing = suggestMissingCoverages(
        existingCoverageNames,
        productLineOfBusiness,
        5
      ).filter(m => !filtered.some(f => f.name === m.name));

      return [...filtered, ...missing].slice(0, 8);
    }

    return filtered.slice(0, 8);
  }, [value, productLineOfBusiness, existingCoverageNames, aiSuggestions]);

  // Check for duplicates
  const duplicateMatch = useMemo(() => {
    if (!value) return null;
    const valueLower = value.toLowerCase().trim();
    return existingCoverageNames.find(
      name => name.toLowerCase().trim() === valueLower
    );
  }, [value, existingCoverageNames]);

  // Similar names (partial matches)
  const similarNames = useMemo(() => {
    if (!value || value.length < 3) return [];
    const valueLower = value.toLowerCase();
    return existingCoverageNames
      .filter(name => {
        const nameLower = name.toLowerCase();
        return nameLower !== valueLower && 
          (nameLower.includes(valueLower) || valueLower.includes(nameLower));
      })
      .slice(0, 3);
  }, [value, existingCoverageNames]);

  // Auto-generate code when name changes
  useEffect(() => {
    if (isAutoCodeEnabled && !hasUserEditedCode && value) {
      const generated = generateCoverageCode(value);
      if (generated !== coverageCode) {
        onCodeChange(generated);
      }
    }
  }, [value, isAutoCodeEnabled, hasUserEditedCode, coverageCode, onCodeChange]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowSuggestions(true);
  }, [onChange]);

  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setHasUserEditedCode(true);
    onCodeChange(e.target.value.toUpperCase());
  }, [onCodeChange]);

  const handleSuggestionClick = useCallback((e: React.MouseEvent, suggestion: string) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(suggestion);
    setShowSuggestions(false);
    // Don't refocus - let the field stay filled
  }, [onChange]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setShowSuggestions(true);
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Check if the blur is going to a suggestion item
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget?.closest('[data-suggestion-item]')) {
      // Don't hide suggestions, the click handler will handle it
      return;
    }
    setIsFocused(false);
    // Longer delay to ensure click registers
    setTimeout(() => setShowSuggestions(false), 300);
  }, []);

  return (
    <Container>
      {/* Coverage Name Field */}
      <FieldGroup>
        <LabelRow>
          <Label>Coverage Name <Required>*</Required></Label>
        </LabelRow>

        <SimpleInputWrapper $isFocused={isFocused} $hasError={!!duplicateMatch}>
          <SimpleInput
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleNameChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="e.g., Building Coverage, General Liability..."
          />
        </SimpleInputWrapper>

        {/* Duplicate Warning */}
        {duplicateMatch && (
          <ErrorMessage><ExclamationTriangleIcon />This coverage name already exists</ErrorMessage>
        )}

        {/* Similar Names Info */}
        {similarNames.length > 0 && !duplicateMatch && (
          <InfoMessage><LightBulbIcon />Similar: {similarNames.slice(0, 2).join(', ')}</InfoMessage>
        )}

        {/* Suggestions Dropdown */}
        {showSuggestions && (suggestions.length > 0 || isLoadingAI) && (
          <SuggestionsDropdown ref={suggestionsRef}>
            <SuggestionsHeader>
              <SparklesSolid />
              {isLoadingAI ? 'AI is thinking...' : 'Smart Suggestions'}
              {isLoadingAI && <LoadingDots><span /><span /><span /></LoadingDots>}
            </SuggestionsHeader>
            {suggestions.map((suggestion, idx) => (
              <SuggestionItem
                key={suggestion.name}
                $delay={idx}
                $matchType={suggestion.matchType}
                data-suggestion-item
                onMouseDown={(e) => handleSuggestionClick(e, suggestion.name)}
                tabIndex={0}
              >
                <SuggestionIcon>{getMatchTypeIcon(suggestion.matchType)}</SuggestionIcon>
                <SuggestionContent>
                  <SuggestionName>{suggestion.name}</SuggestionName>
                  <SuggestionMeta>
                    <MatchScore $score={suggestion.score}>{suggestion.score}%</MatchScore>
                    <Category>{suggestion.category}</Category>
                  </SuggestionMeta>
                </SuggestionContent>
              </SuggestionItem>
            ))}
            {!isLoadingAI && suggestions.length === 0 && value && (
              <NoResults>
                <MagnifyingGlassIcon />
                No matches found. Try a different term or abbreviation.
              </NoResults>
            )}
          </SuggestionsDropdown>
        )}
      </FieldGroup>

      {/* Coverage Code Field */}
      <FieldGroup $isSecondary>
        <LabelRow>
          <Label>Coverage Code <Required>*</Required></Label>
        </LabelRow>
        <SimpleCodeInput
          type="text"
          value={coverageCode}
          onChange={handleCodeChange}
          placeholder="e.g., BLDG, GL"
          maxLength={10}
        />
      </FieldGroup>
    </Container>
  );
};

// Animations
const fadeInUp = keyframes`from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); }`;
const pulse = keyframes`0%, 100% { opacity: 1; } 50% { opacity: 0.6; }`;
const shimmer = keyframes`0% { background-position: -200% 0; } 100% { background-position: 200% 0; }`;

// Styled Components
const Container = styled.div`display: flex; flex-direction: column; gap: 20px;`;

const FieldGroup = styled.div<{ $isSecondary?: boolean }>`
  position: relative;
  ${({ $isSecondary }) => $isSecondary && css`max-width: 240px;`}
`;

const LabelRow = styled.div`display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;`;

const Label = styled.label`font-size: 14px; font-weight: 500; color: ${({ theme }) => theme.colours.text};`;
const Required = styled.span`color: #ef4444; margin-left: 2px;`;

const AIBadge = styled.div`
  display: flex; align-items: center; gap: 4px; padding: 4px 10px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1));
  border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.2);
  svg { width: 12px; height: 12px; color: #8b5cf6; }
  span { font-size: 11px; font-weight: 600; color: #7c3aed; }
`;

const AutoBadge = styled.div`
  display: flex; align-items: center; gap: 4px; padding: 3px 8px;
  background: rgba(16, 185, 129, 0.1); border-radius: 10px;
  svg { width: 12px; height: 12px; color: #10b981; }
  font-size: 11px; font-weight: 500; color: #059669;
`;

// Simple clean input wrapper - just an outline border
const SimpleInputWrapper = styled.div<{ $isFocused: boolean; $hasError: boolean }>`
  position: relative;
  border: 1px solid ${({ $hasError, $isFocused, theme }) =>
    $hasError ? '#ef4444' : $isFocused ? theme.colours.primary : theme.colours.border};
  border-radius: 8px;
  transition: border-color 0.2s;
  background: ${({ theme }) => theme.colours.surface};
`;

const SimpleInput = styled.input`
  width: 100%;
  padding: 14px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 15px;
  color: ${({ theme }) => theme.colours.text};
  &:focus { outline: none; }
  &::placeholder { color: ${({ theme }) => theme.colours.textMuted}; }
`;

const SimpleCodeInput = styled.input`
  width: 100%;
  padding: 14px 16px;
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colours.surface};
  font-size: 15px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colours.text};
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colours.primary};
  }
`;

// Keep old components for backwards compatibility
const InputWrapper = styled.div<{ $isFocused: boolean; $hasError: boolean }>`
  position: relative; display: flex; align-items: center;
  background: ${({ theme }) => theme.colours.surface};
  border: 2px solid ${({ $hasError, $isFocused, theme }) =>
    $hasError ? '#ef4444' : $isFocused ? theme.colours.primary : theme.colours.border};
  border-radius: 12px; transition: all 0.2s;
  ${({ $isFocused }) => $isFocused && css`box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);`}
`;

const InputIcon = styled.div`
  padding-left: 14px; display: flex;
  svg { width: 18px; height: 18px; color: ${({ theme }) => theme.colours.textMuted}; }
`;

const Input = styled.input`
  flex: 1; padding: 14px 12px; border: none; background: transparent;
  font-size: 15px; color: ${({ theme }) => theme.colours.text};
  &:focus { outline: none; }
  &::placeholder { color: ${({ theme }) => theme.colours.textMuted}; }
`;

const ClearButton = styled.button`
  padding: 8px 12px; background: none; border: none; cursor: pointer;
  svg { width: 16px; height: 16px; color: ${({ theme }) => theme.colours.textMuted}; }
  &:hover svg { color: ${({ theme }) => theme.colours.text}; }
`;

const CodeInputWrapper = styled.div<{ $isAutoGenerated: boolean }>`
  ${({ $isAutoGenerated }) => $isAutoGenerated && css`
    background: linear-gradient(90deg, rgba(139, 92, 246, 0.05) 0%, rgba(99, 102, 241, 0.08) 50%, rgba(139, 92, 246, 0.05) 100%);
    background-size: 200% 100%; animation: ${shimmer} 3s ease-in-out infinite;
    border-radius: 12px;
  `}
`;

const CodeInput = styled.input`
  width: 100%; padding: 12px 16px; border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: 12px; background: ${({ theme }) => theme.colours.surface};
  font-size: 15px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colours.text};
  &:focus { outline: none; border-color: ${({ theme }) => theme.colours.primary}; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
`;

const HelpText = styled.p`margin: 6px 0 0; font-size: 12px; color: ${({ theme }) => theme.colours.textMuted};`;

// Enhanced validation hint with P&C context
const ValidationHint = styled.div<{ $type: 'success' | 'warning' | 'info' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.4;
  animation: ${fadeInUp} 0.2s ease-out;

  ${({ $type }) => {
    switch ($type) {
      case 'success':
        return css`
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.05));
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #059669;
        `;
      case 'warning':
        return css`
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(217, 119, 6, 0.05));
          border: 1px solid rgba(245, 158, 11, 0.2);
          color: #d97706;
        `;
      case 'error':
        return css`
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(220, 38, 38, 0.05));
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #dc2626;
        `;
      default:
        return css`
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(79, 70, 229, 0.05));
          border: 1px solid rgba(99, 102, 241, 0.2);
          color: #4f46e5;
        `;
    }
  }}

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`;

const ValidationIcon = styled.div<{ $type: 'success' | 'warning' | 'info' | 'error' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;

  ${({ $type }) => {
    switch ($type) {
      case 'success':
        return css`background: rgba(16, 185, 129, 0.15);`;
      case 'warning':
        return css`background: rgba(245, 158, 11, 0.15);`;
      case 'error':
        return css`background: rgba(239, 68, 68, 0.15);`;
      default:
        return css`background: rgba(99, 102, 241, 0.15);`;
    }
  }}
`;

const ValidationContent = styled.div`
  flex: 1;

  strong {
    display: block;
    font-weight: 600;
    margin-bottom: 2px;
  }

  span {
    opacity: 0.9;
    font-size: 12px;
  }
`;

const ErrorMessage = styled.div`
  display: flex; align-items: center; gap: 6px; margin-top: 8px; padding: 8px 12px;
  background: #fef2f2; border-radius: 8px; font-size: 13px; color: #dc2626;
  svg { width: 16px; height: 16px; flex-shrink: 0; }
`;

const InfoMessage = styled.div`
  display: flex; align-items: center; gap: 6px; margin-top: 8px;
  font-size: 12px; color: ${({ theme }) => theme.colours.textMuted};
  svg { width: 14px; height: 14px; color: #f59e0b; }
`;

const SuggestionsDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  margin-top: 8px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  animation: ${fadeInUp} 0.25s ease-out;
  max-height: 380px;
  overflow-y: auto;
`;

const SuggestionsHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6b7280;
  position: sticky;
  top: 0;
  z-index: 1;
  svg { width: 14px; height: 14px; color: #8b5cf6; }
`;

const LoadingDots = styled.div`
  display: flex;
  gap: 3px;
  margin-left: auto;

  span {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #8b5cf6;
    animation: ${pulse} 1.4s ease-in-out infinite;

    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
`;

const SuggestionItem = styled.button<{ $delay: number; $matchType?: string }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  background: #ffffff;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
  animation: ${fadeInUp} 0.2s ease-out;
  animation-delay: ${({ $delay }) => $delay * 40}ms;
  animation-fill-mode: both;

  &:hover {
    background: #f5f3ff;
  }

  &:not(:last-child) {
    border-bottom: 1px solid #f3f4f6;
  }
`;

const SuggestionIcon = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.15));
  border-radius: 8px;
  flex-shrink: 0;

  svg {
    width: 16px;
    height: 16px;
    color: #8b5cf6;
  }
`;

const SuggestionContent = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const SuggestionName = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
`;

const SuggestionMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const MatchScore = styled.span<{ $score: number }>`
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${({ $score }) =>
    $score >= 90 ? 'rgba(34, 197, 94, 0.15)' :
    $score >= 70 ? 'rgba(139, 92, 246, 0.15)' :
    'rgba(156, 163, 175, 0.15)'
  };
  color: ${({ $score }) =>
    $score >= 90 ? '#16a34a' :
    $score >= 70 ? '#7c3aed' :
    '#6b7280'
  };
`;

const Category = styled.span`
  font-size: 11px;
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const NoResults = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 18px;
  text-align: center;
  color: #6b7280;
  font-size: 13px;
  background: #ffffff;

  svg {
    width: 24px;
    height: 24px;
    opacity: 0.5;
  }
`;

export default SmartCoverageNameInput;

