/**
 * Command Palette Component
 * Cmd+K / Ctrl+K global search and quick actions
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { 
  MagnifyingGlassIcon, 
  DocumentIcon,
  CubeIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useProducts } from '../../hooks/queries';

// Types
interface CommandItem {
  id: string;
  type: 'product' | 'coverage' | 'form' | 'rule' | 'action' | 'navigation';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

// Styled Components
const Overlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
`;

const Dialog = styled.div`
  width: 100%;
  max-width: 640px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  gap: 12px;
`;

const SearchInput = styled.input`
  flex: 1;
  border: none;
  font-size: 18px;
  outline: none;
  background: transparent;
  
  &::placeholder {
    color: #94a3b8;
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
  background: ${props => props.$isSelected ? '#f1f5f9' : 'transparent'};
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
  
  &:hover {
    background: #f1f5f9;
  }
`;

const IconWrapper = styled.div<{ $type: string }>`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => {
    switch (props.$type) {
      case 'product': return '#dbeafe';
      case 'coverage': return '#dcfce7';
      case 'form': return '#fef3c7';
      case 'rule': return '#fce7f3';
      case 'action': return '#e0e7ff';
      default: return '#f1f5f9';
    }
  }};
  color: ${props => {
    switch (props.$type) {
      case 'product': return '#2563eb';
      case 'coverage': return '#16a34a';
      case 'form': return '#d97706';
      case 'rule': return '#db2777';
      case 'action': return '#4f46e5';
      default: return '#64748b';
    }
  }};
`;

const ResultContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ResultTitle = styled.div`
  font-weight: 500;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ResultSubtitle = styled.div`
  font-size: 13px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Shortcut = styled.kbd`
  padding: 4px 8px;
  background: #f1f5f9;
  border-radius: 4px;
  font-size: 12px;
  color: #64748b;
  font-family: inherit;
`;

const EmptyState = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: #64748b;
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 13px;
  color: #64748b;
`;

// Fuzzy search function
function fuzzyMatch(text: string, query: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  let queryIndex = 0;
  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === lowerQuery.length;
}

// Main Component
export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data: products = [] } = useProducts({ enabled: isOpen });

  // Quick actions
  const quickActions: CommandItem[] = useMemo(() => [
    {
      id: 'create-product',
      type: 'action',
      title: 'Create New Product',
      subtitle: 'Start building a new insurance product',
      icon: <PlusIcon width={20} />,
      action: () => navigate('/products'),
      keywords: ['new', 'add', 'create', 'product'],
    },
    {
      id: 'nav-products',
      type: 'navigation',
      title: 'Go to Products',
      subtitle: 'View all products',
      icon: <CubeIcon width={20} />,
      action: () => navigate('/products'),
      keywords: ['products', 'list', 'all'],
    },
    {
      id: 'nav-forms',
      type: 'navigation',
      title: 'Go to Forms',
      subtitle: 'Manage form documents',
      icon: <DocumentIcon width={20} />,
      action: () => navigate('/forms'),
      keywords: ['forms', 'documents', 'pdf'],
    },
  ], [navigate]);

  // Build search results
  const results = useMemo(() => {
    const items: CommandItem[] = [];

    // Add products
    products.forEach(product => {
      items.push({
        id: `product-${product.id}`,
        type: 'product',
        title: product.name,
        subtitle: product.productCode || 'Product',
        icon: <CubeIcon width={20} />,
        action: () => navigate(`/products/${product.id}`),
        keywords: [product.name, product.productCode || ''],
      });
    });

    // Add quick actions
    items.push(...quickActions);

    // Filter by query
    if (!query.trim()) {
      return items.slice(0, 10);
    }

    return items.filter(item =>
      fuzzyMatch(item.title, query) ||
      (item.subtitle && fuzzyMatch(item.subtitle, query)) ||
      item.keywords?.some(k => fuzzyMatch(k, query))
    ).slice(0, 10);
  }, [products, quickActions, query, navigate]);

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      results[selectedIndex].action();
      setIsOpen(false);
    }
  }, [results, selectedIndex]);

  const handleSelect = (item: CommandItem) => {
    item.action();
    setIsOpen(false);
  };

  return (
    <Overlay $isOpen={isOpen} onClick={() => setIsOpen(false)}>
      <Dialog onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <SearchContainer>
          <MagnifyingGlassIcon width={24} color="#94a3b8" />
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search products, forms, actions..."
            aria-label="Search"
          />
          <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <XMarkIcon width={20} color="#94a3b8" />
          </button>
        </SearchContainer>

        <ResultsList>
          {results.length === 0 ? (
            <EmptyState>No results found for "{query}"</EmptyState>
          ) : (
            results.map((item, index) => (
              <ResultItem
                key={item.id}
                $isSelected={index === selectedIndex}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <IconWrapper $type={item.type}>{item.icon}</IconWrapper>
                <ResultContent>
                  <ResultTitle>{item.title}</ResultTitle>
                  {item.subtitle && <ResultSubtitle>{item.subtitle}</ResultSubtitle>}
                </ResultContent>
                {index === selectedIndex && <Shortcut>↵</Shortcut>}
              </ResultItem>
            ))
          )}
        </ResultsList>

        <Footer>
          <span>Type to search</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Shortcut>↑↓</Shortcut> to navigate
            <Shortcut>↵</Shortcut> to select
            <Shortcut>esc</Shortcut> to close
          </div>
        </Footer>
      </Dialog>
    </Overlay>
  );
};

export default CommandPalette;

