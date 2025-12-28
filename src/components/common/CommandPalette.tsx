/**
 * CommandPalette - Enhanced global command palette accessible via Cmd+K
 *
 * Features:
 * - Fuzzy search with highlighting
 * - Recent actions tracking
 * - Keyboard shortcuts display
 * - AI-powered suggestions section
 * - Grouped results by category
 * - Smooth animations and transitions
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import {
  MagnifyingGlassIcon,
  HomeIcon,
  CubeIcon,
  DocumentTextIcon,
  CircleStackIcon,
  CheckCircleIcon,
  WrenchIcon,
  CpuChipIcon,
  XMarkIcon,
  ClockIcon,
  SparklesIcon,
  ArrowRightIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 9999;
  animation: ${fadeIn} 0.15s ease-out;
`;

const PaletteContainer = styled.div`
  position: fixed;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 560px;
  background: ${({ theme }) => theme.colours.backgroundElevated};
  border-radius: ${({ theme }) => theme.radiusLg};
  box-shadow: ${({ theme }) => theme.shadowXl};
  overflow: hidden;
  z-index: 10000;
  animation: ${slideDown} 0.2s ease-out;
`;

const SearchWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colours.border};
`;

const SearchIconStyled = styled(MagnifyingGlassIcon)`
  width: 20px;
  height: 20px;
  color: ${({ theme }) => theme.colours.textMuted};
  flex-shrink: 0;
`;

const SearchInput = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  font-size: 16px;
  color: ${({ theme }) => theme.colours.text};
  outline: none;
  font-family: ${({ theme }) => theme.fontFamily};

  &::placeholder {
    color: ${({ theme }) => theme.colours.textMuted};
  }
`;

const CloseButton = styled.button`
  background: ${({ theme }) => theme.colours.backgroundSubtle};
  border: none;
  padding: 6px;
  border-radius: ${({ theme }) => theme.radiusSm};
  cursor: pointer;
  color: ${({ theme }) => theme.colours.textMuted};
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: ${({ theme }) => theme.colours.text};
    background: ${({ theme }) => theme.colours.hover};
  }
`;

const ResultsList = styled.div`
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
`;

const ResultItem = styled.button<{ $isSelected: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: none;
  background: ${({ theme, $isSelected }) => 
    $isSelected ? theme.colours.primaryLighter : 'transparent'};
  border-radius: ${({ theme }) => theme.radiusMd};
  cursor: pointer;
  text-align: left;
  transition: background 0.1s ease;

  &:hover {
    background: ${({ theme }) => theme.colours.hover};
  }

  svg {
    width: 18px;
    height: 18px;
    color: ${({ theme, $isSelected }) => 
      $isSelected ? theme.colours.primary : theme.colours.textMuted};
    flex-shrink: 0;
  }
`;

const ResultText = styled.div`
  flex: 1;
`;

const ResultTitle = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colours.text};
`;

const ResultDescription = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colours.textMuted};
  margin-top: 2px;
`;

const Shortcut = styled.kbd`
  font-size: 11px;
  padding: 3px 6px;
  background: ${({ theme }) => theme.colours.backgroundSubtle};
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: 4px;
  color: ${({ theme }) => theme.colours.textMuted};
  font-family: ${({ theme }) => theme.fontFamily};
`;

const NoResults = styled.div`
  padding: 32px 16px;
  text-align: center;
  color: ${({ theme }) => theme.colours.textMuted};
  font-size: 14px;
`;

// Category Section
const CategorySection = styled.div`
  &:not(:first-child) {
    margin-top: 8px;
    border-top: 1px solid ${({ theme }) => theme.colours.border};
    padding-top: 8px;
  }
`;

const CategoryLabel = styled.div`
  padding: 8px 16px 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colours.textMuted};
  display: flex;
  align-items: center;
  gap: 6px;

  svg {
    width: 12px;
    height: 12px;
  }
`;

// AI Suggestion Badge
const AISuggestionBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15));
  color: #6366f1;
  border-radius: 20px;
  margin-left: 8px;

  svg {
    width: 10px;
    height: 10px;
  }
`;

// Keyboard hint at bottom
const KeyboardHints = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  border-top: 1px solid ${({ theme }) => theme.colours.border};
  background: ${({ theme }) => theme.colours.backgroundSubtle};
  font-size: 12px;
  color: ${({ theme }) => theme.colours.textMuted};
`;

const KeyHint = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const KeyBadge = styled.kbd`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 500;
  background: ${({ theme }) => theme.colours.background};
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
`;

// Match highlighting
const HighlightedText = styled.span<{ $isMatch?: boolean }>`
  ${({ $isMatch }) => $isMatch && css`
    background: rgba(99, 102, 241, 0.2);
    color: #6366f1;
    border-radius: 2px;
    padding: 0 2px;
  `}
`;

// Fuzzy search helper
const fuzzyMatch = (text: string, query: string): { matches: boolean; indices: number[] } => {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const indices: number[] = [];
  let queryIndex = 0;

  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      indices.push(i);
      queryIndex++;
    }
  }

  return {
    matches: queryIndex === lowerQuery.length,
    indices
  };
};

const highlightMatches = (text: string, indices: number[]): React.ReactNode => {
  if (indices.length === 0) return text;

  const result: React.ReactNode[] = [];
  let lastIndex = 0;

  indices.forEach((idx, i) => {
    if (idx > lastIndex) {
      result.push(<span key={`text-${i}`}>{text.slice(lastIndex, idx)}</span>);
    }
    result.push(<HighlightedText key={`match-${i}`} $isMatch>{text[idx]}</HighlightedText>);
    lastIndex = idx + 1;
  });

  if (lastIndex < text.length) {
    result.push(<span key="text-end">{text.slice(lastIndex)}</span>);
  }

  return <>{result}</>;
};

// Recent actions storage key
const RECENT_ACTIONS_KEY = 'command-palette-recent';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
  category?: 'navigation' | 'action' | 'ai' | 'settings';
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  additionalCommands?: CommandItem[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  additionalCommands = []
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Load recent actions from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_ACTIONS_KEY);
      if (stored) setRecentIds(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Save recent action
  const saveRecentAction = useCallback((id: string) => {
    setRecentIds(prev => {
      const updated = [id, ...prev.filter(i => i !== id)].slice(0, 5);
      localStorage.setItem(RECENT_ACTIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const baseCommands: CommandItem[] = useMemo(() => [
    { id: 'home', title: 'Go to Home', description: 'Dashboard and AI assistant', icon: <HomeIcon style={{ width: 18, height: 18 }} />, action: () => navigate('/'), keywords: ['dashboard', 'main'], category: 'navigation', shortcut: '⌘1' },
    { id: 'products', title: 'Go to Products', description: 'Product management', icon: <CubeIcon style={{ width: 18, height: 18 }} />, action: () => navigate('/products'), keywords: ['product', 'insurance'], category: 'navigation', shortcut: '⌘2' },
    { id: 'builder', title: 'Open Builder', description: 'Build new products', icon: <WrenchIcon style={{ width: 18, height: 18 }} />, action: () => navigate('/builder'), keywords: ['create', 'new'], category: 'navigation' },
    { id: 'ai-builder', title: 'AI Builder', description: 'AI-powered product creation', icon: <CpuChipIcon style={{ width: 18, height: 18 }} />, action: () => navigate('/ai-builder'), keywords: ['ai', 'assistant'], category: 'ai' },
    { id: 'data-dictionary', title: 'Data Dictionary', description: 'Manage data definitions', icon: <CircleStackIcon style={{ width: 18, height: 18 }} />, action: () => navigate('/data-dictionary'), keywords: ['data', 'fields'], category: 'navigation' },
    { id: 'tasks', title: 'Task Management', description: 'View and manage tasks', icon: <CheckCircleIcon style={{ width: 18, height: 18 }} />, action: () => navigate('/tasks'), keywords: ['todo', 'work'], category: 'navigation' },
    { id: 'claims', title: 'Claims Analysis', description: 'Analyze claims data', icon: <DocumentTextIcon style={{ width: 18, height: 18 }} />, action: () => navigate('/claims-analysis'), keywords: ['claims', 'analysis'], category: 'navigation' },
    { id: 'analytics', title: 'View Analytics', description: 'Product performance metrics', icon: <ChartBarIcon style={{ width: 18, height: 18 }} />, action: () => navigate('/analytics'), keywords: ['metrics', 'reports'], category: 'navigation' },
    { id: 'settings', title: 'Settings', description: 'Application preferences', icon: <Cog6ToothIcon style={{ width: 18, height: 18 }} />, action: () => navigate('/settings'), keywords: ['preferences', 'config'], category: 'settings' },
    { id: 'docs', title: 'Documentation', description: 'Help and guides', icon: <BookOpenIcon style={{ width: 18, height: 18 }} />, action: () => window.open('/docs', '_blank'), keywords: ['help', 'guide'], category: 'action' },
    { id: 'ai-suggest', title: 'AI Suggestions', description: 'Get AI-powered recommendations', icon: <SparklesIcon style={{ width: 18, height: 18 }} />, action: () => navigate('/ai-builder'), keywords: ['recommend', 'smart'], category: 'ai' },
  ], [navigate]);

  const allCommands = useMemo(() => [...baseCommands, ...additionalCommands], [baseCommands, additionalCommands]);

  // Fuzzy search with scoring
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;

    const results = allCommands.map(cmd => {
      const titleMatch = fuzzyMatch(cmd.title, query);
      const descMatch = cmd.description ? fuzzyMatch(cmd.description, query) : { matches: false, indices: [] };
      const keywordMatch = cmd.keywords?.some(k => k.toLowerCase().includes(query.toLowerCase()));

      return {
        cmd,
        matches: titleMatch.matches || descMatch.matches || keywordMatch,
        titleIndices: titleMatch.indices,
        score: titleMatch.matches ? titleMatch.indices.length : (descMatch.matches ? descMatch.indices.length * 0.5 : 0)
      };
    }).filter(r => r.matches);

    // Sort by score (higher is better match)
    results.sort((a, b) => b.score - a.score);

    return results.map(r => ({ ...r.cmd, _titleIndices: r.titleIndices }));
  }, [query, allCommands]);

  // Get recent commands
  const recentCommands = useMemo(() => {
    if (query.trim()) return [];
    return recentIds.map(id => allCommands.find(c => c.id === id)).filter(Boolean) as CommandItem[];
  }, [query, recentIds, allCommands]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    if (query.trim()) return { all: filteredCommands };

    const groups: Record<string, CommandItem[]> = {
      recent: recentCommands,
      ai: allCommands.filter(c => c.category === 'ai'),
      navigation: allCommands.filter(c => c.category === 'navigation'),
      action: allCommands.filter(c => c.category === 'action'),
      settings: allCommands.filter(c => c.category === 'settings'),
    };

    return groups;
  }, [query, filteredCommands, recentCommands, allCommands]);

  // Flatten for keyboard navigation
  const flatCommands = useMemo(() => {
    if (query.trim()) return filteredCommands;
    return [...recentCommands, ...allCommands.filter(c => !recentIds.includes(c.id))];
  }, [query, filteredCommands, recentCommands, allCommands, recentIds]);

  // Reset selection when query changes
  useEffect(() => { setSelectedIndex(0); }, [query]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const executeCommand = useCallback((cmd: CommandItem) => {
    saveRecentAction(cmd.id);
    cmd.action();
    onClose();
  }, [saveRecentAction, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, flatCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && flatCommands[selectedIndex]) {
      e.preventDefault();
      executeCommand(flatCommands[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [flatCommands, selectedIndex, executeCommand, onClose]);

  const renderCommandItem = (cmd: CommandItem & { _titleIndices?: number[] }, _index: number, globalIndex: number) => (
    <ResultItem
      key={cmd.id}
      $isSelected={globalIndex === selectedIndex}
      onClick={() => executeCommand(cmd)}
      onMouseEnter={() => setSelectedIndex(globalIndex)}
    >
      {cmd.icon}
      <ResultText>
        <ResultTitle>
          {cmd._titleIndices ? highlightMatches(cmd.title, cmd._titleIndices) : cmd.title}
          {cmd.category === 'ai' && (
            <AISuggestionBadge>
              <SparklesIcon /> AI
            </AISuggestionBadge>
          )}
        </ResultTitle>
        {cmd.description && <ResultDescription>{cmd.description}</ResultDescription>}
      </ResultText>
      {cmd.shortcut && <Shortcut>{cmd.shortcut}</Shortcut>}
    </ResultItem>
  );

  if (!isOpen) return null;

  let globalIndex = 0;

  return (
    <>
      <Overlay onClick={onClose} />
      <PaletteContainer role="dialog" aria-modal="true" aria-label="Command palette" onKeyDown={handleKeyDown}>
        <SearchWrapper>
          <SearchIconStyled />
          <SearchInput ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Type a command or search..." autoComplete="off" />
          <CloseButton onClick={onClose} aria-label="Close"><XMarkIcon style={{ width: 16, height: 16 }} /></CloseButton>
        </SearchWrapper>
        <ResultsList>
          {query.trim() ? (
            // Search results
            filteredCommands.length > 0 ? (
              filteredCommands.map((cmd, index) => renderCommandItem(cmd as CommandItem & { _titleIndices?: number[] }, index, index))
            ) : (
              <NoResults>No commands found for "{query}"</NoResults>
            )
          ) : (
            // Grouped view
            <>
              {groupedCommands.recent && groupedCommands.recent.length > 0 && (
                <CategorySection>
                  <CategoryLabel><ClockIcon /> Recent</CategoryLabel>
                  {groupedCommands.recent.map((cmd, index) => {
                    const item = renderCommandItem(cmd, index, globalIndex);
                    globalIndex++;
                    return item;
                  })}
                </CategorySection>
              )}
              {groupedCommands.ai && groupedCommands.ai.length > 0 && (
                <CategorySection>
                  <CategoryLabel><SparklesIcon /> AI-Powered</CategoryLabel>
                  {groupedCommands.ai.filter(c => !recentIds.includes(c.id)).map((cmd, index) => {
                    const item = renderCommandItem(cmd, index, globalIndex);
                    globalIndex++;
                    return item;
                  })}
                </CategorySection>
              )}
              {groupedCommands.navigation && groupedCommands.navigation.length > 0 && (
                <CategorySection>
                  <CategoryLabel><ArrowRightIcon /> Navigation</CategoryLabel>
                  {groupedCommands.navigation.filter(c => !recentIds.includes(c.id)).map((cmd, index) => {
                    const item = renderCommandItem(cmd, index, globalIndex);
                    globalIndex++;
                    return item;
                  })}
                </CategorySection>
              )}
            </>
          )}
        </ResultsList>
        <KeyboardHints>
          <KeyHint><KeyBadge>↑↓</KeyBadge> Navigate</KeyHint>
          <KeyHint><KeyBadge>↵</KeyBadge> Select</KeyHint>
          <KeyHint><KeyBadge>esc</KeyBadge> Close</KeyHint>
        </KeyboardHints>
      </PaletteContainer>
    </>
  );
};

// Hook to manage command palette state with keyboard shortcut
export const useCommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) };
};

export default CommandPalette;

