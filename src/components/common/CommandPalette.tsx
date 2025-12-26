/**
 * CommandPalette - Global command palette accessible via Cmd+K
 * 
 * Provides quick access to navigation, search, and actions
 * via keyboard shortcut similar to VS Code, Slack, etc.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import {
  MagnifyingGlassIcon,
  HomeIcon,
  CubeIcon,
  DocumentTextIcon,
  CircleStackIcon,
  CheckCircleIcon,
  WrenchIcon,
  CpuChipIcon,
  XMarkIcon
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

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
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
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const baseCommands: CommandItem[] = useMemo(() => [
    { id: 'home', title: 'Go to Home', description: 'Dashboard and AI assistant', icon: <HomeIcon style={{ width: 18, height: 18 }} />, action: () => navigate('/'), keywords: ['dashboard', 'main'] },
    { id: 'products', title: 'Go to Products', description: 'Product management', icon: <CubeIcon style={{ width: 18, height: 18 }} />, action: () => navigate('/products'), keywords: ['product', 'insurance'] },
    { id: 'builder', title: 'Open Builder', description: 'Build new products', icon: <WrenchIcon style={{ width: 18, height: 18 }} />, action: () => navigate('/builder'), keywords: ['create', 'new'] },
    { id: 'ai-builder', title: 'AI Builder', description: 'AI-powered product creation', icon: <CpuChipIcon style={{ width: 18, height: 18 }} />, action: () => navigate('/ai-builder'), keywords: ['ai', 'assistant'] },
    { id: 'data-dictionary', title: 'Data Dictionary', description: 'Manage data definitions', icon: <CircleStackIcon style={{ width: 18, height: 18 }} />, action: () => navigate('/data-dictionary'), keywords: ['data', 'fields'] },
    { id: 'tasks', title: 'Task Management', description: 'View and manage tasks', icon: <CheckCircleIcon style={{ width: 18, height: 18 }} />, action: () => navigate('/tasks'), keywords: ['todo', 'work'] },
    { id: 'claims', title: 'Claims Analysis', description: 'Analyze claims data', icon: <DocumentTextIcon style={{ width: 18, height: 18 }} />, action: () => navigate('/claims-analysis'), keywords: ['claims', 'analysis'] },
  ], [navigate]);

  const allCommands = useMemo(() => [...baseCommands, ...additionalCommands], [baseCommands, additionalCommands]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const lowerQuery = query.toLowerCase();
    return allCommands.filter(cmd =>
      cmd.title.toLowerCase().includes(lowerQuery) ||
      cmd.description?.toLowerCase().includes(lowerQuery) ||
      cmd.keywords?.some(k => k.includes(lowerQuery))
    );
  }, [query, allCommands]);

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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      e.preventDefault();
      filteredCommands[selectedIndex].action();
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

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
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, index) => (
              <ResultItem key={cmd.id} $isSelected={index === selectedIndex} onClick={() => { cmd.action(); onClose(); }} onMouseEnter={() => setSelectedIndex(index)}>
                {cmd.icon}
                <ResultText>
                  <ResultTitle>{cmd.title}</ResultTitle>
                  {cmd.description && <ResultDescription>{cmd.description}</ResultDescription>}
                </ResultText>
              </ResultItem>
            ))
          ) : (
            <NoResults>No commands found for "{query}"</NoResults>
          )}
        </ResultsList>
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

