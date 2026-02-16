/**
 * CommandPalette  (Design System v2)
 *
 * Global ⌘K / Ctrl+K command palette with:
 *  - Cross-artifact search (type-ahead)
 *  - Quick actions (Create Change Set, Switch Change Set, etc.)
 *  - Grouped results with keyboard navigation
 *  - Deep-linking to any artifact
 *
 * Accessibility:
 *  - role="dialog" aria-modal
 *  - Escape to close
 *  - Arrow keys + Enter for navigation
 *  - Focus trap inside overlay
 *  - Scroll lock while open
 *  - prefers-reduced-motion respected
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import {
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  TableCellsIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  PlusIcon,
  BoltIcon,
  ArrowsRightLeftIcon,
  MapPinIcon,
  FolderIcon,
  BeakerIcon,
  HashtagIcon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import {
  color, neutral, accent, semantic,
  space, radius, shadow, fontFamily,
  type as t, border as borderTokens,
  duration, easing, transition, z, focusRingStyle, reducedMotion,
} from '@/ui/tokens';
import { searchArtifacts, routeForResult } from '@/services/searchService';
import { useRoleContext } from '@/context/RoleContext';
import type {
  SearchResult,
  SearchableArtifactType,
  CommandItem,
} from '@/types/search';

// ════════════════════════════════════════════════════════════════════════
// Animations
// ════════════════════════════════════════════════════════════════════════

const fadeIn = keyframes`from{opacity:0}to{opacity:1}`;
const scaleIn = keyframes`from{opacity:0;transform:translateY(-16px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}`;

// ════════════════════════════════════════════════════════════════════════
// Styled components
// ════════════════════════════════════════════════════════════════════════

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${z.modal + 50};
  background: ${color.overlay};
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 15vh ${space[4]} ${space[4]};
  animation: ${fadeIn} ${duration.fast} ${easing.out};

  @media ${reducedMotion} { animation: none; }
`;

const PaletteBox = styled.div`
  width: 100%;
  max-width: 640px;
  background: ${color.bg};
  border-radius: ${radius.xl};
  box-shadow: ${shadow.overlay};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 70vh;
  animation: ${scaleIn} ${duration.normal} ${easing.springCalm};

  @media ${reducedMotion} { animation: none; }
`;

const InputRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[3]};
  padding: ${space[4]} ${space[5]};
  border-bottom: ${borderTokens.default};

  svg { width: 20px; height: 20px; color: ${neutral[400]}; flex-shrink: 0; }
`;

const SearchInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  font-family: ${fontFamily.sans};
  font-size: ${t.bodyLg.size};
  font-weight: 400;
  color: ${color.text};
  background: transparent;
  letter-spacing: ${t.bodyLg.letterSpacing};

  &::placeholder { color: ${neutral[400]}; }
`;

const Kbd = styled.kbd`
  display: inline-flex;
  align-items: center;
  padding: ${space[0.5]} ${space[1.5]};
  background: ${neutral[100]};
  border: 1px solid ${neutral[200]};
  border-radius: ${radius.sm};
  font-family: ${fontFamily.sans};
  font-size: 11px;
  font-weight: 500;
  color: ${neutral[500]};
  line-height: 1;
`;

const ResultsArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${space[2]} 0;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: ${neutral[200]}; border-radius: 3px; }
`;

const GroupLabel = styled.div`
  padding: ${space[1.5]} ${space[5]} ${space[1]};
  font-family: ${fontFamily.sans};
  font-size: ${t.overline.size};
  font-weight: ${t.overline.weight};
  letter-spacing: ${t.overline.letterSpacing};
  color: ${neutral[400]};
  text-transform: uppercase;
`;

const ResultRow = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${space[3]};
  padding: ${space[2]} ${space[5]};
  cursor: pointer;
  transition: background ${duration.fast} ease;

  ${({ $active }) => $active && css`
    background: ${accent[50]};
  `}

  &:hover { background: ${neutral[100]}; }

  @media ${reducedMotion} { transition: none; }
`;

const IconBox = styled.div<{ $color?: string }>`
  width: 32px; height: 32px;
  border-radius: ${radius.md};
  display: grid; place-items: center;
  background: ${({ $color }) => $color || neutral[100]};
  flex-shrink: 0;

  svg { width: 16px; height: 16px; color: ${({ $color }) => $color ? color.textInverse : neutral[500]}; }
`;

const ResultText = styled.div`
  flex: 1; min-width: 0;
`;

const ResultTitle = styled.div`
  font-family: ${fontFamily.sans};
  font-size: ${t.bodySm.size};
  font-weight: 500;
  color: ${color.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ResultSubtitle = styled.div`
  font-size: ${t.captionSm.size};
  color: ${color.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ShortcutHint = styled.span`
  font-size: ${t.captionSm.size};
  color: ${neutral[400]};
  flex-shrink: 0;
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[4]};
  padding: ${space[2.5]} ${space[5]};
  border-top: ${borderTokens.default};
  background: ${neutral[50]};
`;

const FooterHint = styled.span`
  font-size: ${t.captionSm.size};
  color: ${neutral[400]};
  display: inline-flex;
  align-items: center;
  gap: ${space[1]};
`;

const EmptyText = styled.div`
  text-align: center;
  padding: ${space[10]} ${space[5]};
  color: ${color.textMuted};
  font-size: ${t.bodySm.size};
`;

const TypeBadge = styled.span`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px ${space[1.5]};
  border-radius: ${radius.xs};
  background: ${neutral[100]};
  color: ${neutral[500]};
  flex-shrink: 0;
`;

// ════════════════════════════════════════════════════════════════════════
// Icon / colour map for artifact types
// ════════════════════════════════════════════════════════════════════════

const TYPE_META: Record<
  SearchableArtifactType,
  { icon: React.ReactNode; bg: string; label: string }
> = {
  product:      { icon: <ShieldCheckIcon />,          bg: accent[500],         label: 'Product' },
  coverage:     { icon: <FolderIcon />,               bg: '#8b5cf6',           label: 'Coverage' },
  form:         { icon: <DocumentTextIcon />,         bg: semantic.info,       label: 'Form' },
  rule:         { icon: <Cog6ToothIcon />,            bg: semantic.warning,    label: 'Rule' },
  rateProgram:  { icon: <CurrencyDollarIcon />,       bg: semantic.success,    label: 'Rate Program' },
  table:        { icon: <TableCellsIcon />,           bg: '#06b6d4',           label: 'Table' },
  changeset:    { icon: <ClipboardDocumentListIcon />, bg: '#f97316',          label: 'Change Set' },
  task:         { icon: <HashtagIcon />,              bg: neutral[600],        label: 'Task' },
  stateProgram: { icon: <MapPinIcon />,               bg: '#ec4899',           label: 'State' },
};

// ════════════════════════════════════════════════════════════════════════
// Quick actions
// ════════════════════════════════════════════════════════════════════════

const QUICK_ACTIONS: CommandItem[] = [
  {
    id: 'action-create-cs',
    label: 'Create Change Set',
    description: 'Start a new governed change set',
    icon: <PlusIcon />,
    action: 'createChangeSet',
    group: 'Actions',
  },
  {
    id: 'action-switch-cs',
    label: 'Switch Active Change Set',
    description: 'Change which change set receives edits',
    icon: <ArrowsRightLeftIcon />,
    action: 'switchChangeSet',
    group: 'Actions',
  },
  {
    id: 'action-scenario',
    label: 'Run Scenario',
    description: 'Execute a rating scenario',
    icon: <BeakerIcon />,
    action: 'runScenario',
    group: 'Actions',
  },
  {
    id: 'action-filing',
    label: 'Open Filing Package',
    description: 'Navigate to filing packages',
    icon: <DocumentTextIcon />,
    action: 'navigate',
    route: '/filings',
    group: 'Actions',
  },
  {
    id: 'action-data-dictionary',
    label: 'Data Dictionary',
    description: 'Browse insurance terminology and field definitions',
    icon: <DocumentTextIcon />,
    action: 'navigate',
    route: '/data-dictionary',
    group: 'Go to',
  },
  {
    id: 'action-simulate',
    label: 'Simulate',
    description: 'End-to-end simulator: UW decision, premium, and forms',
    icon: <BeakerIcon />,
    action: 'navigate',
    route: '/simulate',
    group: 'Go to',
  },
  {
    id: 'action-ai-builder',
    label: 'AI Builder',
    description: 'AI-powered product builder',
    icon: <SparklesIcon />,
    action: 'navigate',
    route: '/ai-builder',
    group: 'Go to',
  },
  {
    id: 'action-explorer',
    label: 'Product Explorer',
    description: 'Explore product hierarchies and relationships',
    icon: <MagnifyingGlassIcon />,
    action: 'navigate',
    route: '/product-explorer',
    group: 'Go to',
  },
];

// ════════════════════════════════════════════════════════════════════════
// Grouped result type
// ════════════════════════════════════════════════════════════════════════

type PaletteItem =
  | { kind: 'result'; data: SearchResult; idx: number }
  | { kind: 'action'; data: CommandItem; idx: number };

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { currentOrgId } = useRoleContext();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Reset on open ──
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // ── Scroll lock ──
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ── Escape ──
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // ── Debounced search ──
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchArtifacts({ orgId: currentOrgId, query, limit: 20 });
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, currentOrgId, open]);

  // ── Build flat item list (actions + results, grouped) ──
  const flatItems = useMemo((): PaletteItem[] => {
    const items: PaletteItem[] = [];
    let idx = 0;

    // Quick actions (only when no query or query matches action label)
    const matchingActions = query.trim()
      ? QUICK_ACTIONS.filter(a => a.label.toLowerCase().includes(query.toLowerCase()))
      : QUICK_ACTIONS;

    for (const a of matchingActions) {
      items.push({ kind: 'action', data: a, idx: idx++ });
    }

    // Search results grouped by type
    const grouped = new Map<string, SearchResult[]>();
    for (const r of results) {
      const group = TYPE_META[r.type]?.label || r.type;
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group)!.push(r);
    }

    for (const [, groupResults] of grouped) {
      for (const r of groupResults) {
        items.push({ kind: 'result', data: r, idx: idx++ });
      }
    }

    return items;
  }, [results, query]);

  // ── Keep activeIdx in bounds ──
  useEffect(() => {
    if (activeIdx >= flatItems.length) setActiveIdx(Math.max(0, flatItems.length - 1));
  }, [flatItems.length, activeIdx]);

  // ── Scroll active item into view ──
  useEffect(() => {
    if (!resultsRef.current) return;
    const activeEl = resultsRef.current.querySelector(`[data-idx="${activeIdx}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIdx]);

  // ── Execute item ──
  const executeItem = useCallback((item: PaletteItem) => {
    onClose();

    if (item.kind === 'result') {
      const route = routeForResult(item.data);
      navigate(route);
    } else {
      const action = item.data;
      switch (action.action) {
        case 'navigate':
          if (action.route) navigate(action.route);
          break;
        case 'createChangeSet':
          navigate('/changesets');
          break;
        case 'switchChangeSet':
          navigate('/changesets');
          break;
        case 'runScenario':
          // Navigate to first product's pricing or a dedicated scenario page
          navigate('/products');
          break;
        case 'openFilingPackage':
          navigate('/filing');
          break;
        default:
          break;
      }
    }
  }, [navigate, onClose]);

  // ── Keyboard navigation ──
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIdx(i => Math.min(i + 1, flatItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatItems[activeIdx]) executeItem(flatItems[activeIdx]);
        break;
      case 'Tab':
        e.preventDefault(); // trap focus
        break;
    }
  }, [flatItems, activeIdx, executeItem]);

  if (!open) return null;

  // ── Group labels helper ──
  const prevGroup = (idx: number): string | null => {
    for (let i = idx - 1; i >= 0; i--) {
      const item = flatItems[i];
      if (item.kind === 'action') return item.data.group;
      return TYPE_META[item.data.type]?.label || item.data.type;
    }
    return null;
  };

  const currentGroup = (item: PaletteItem): string => {
    if (item.kind === 'action') return item.data.group;
    return TYPE_META[item.data.type]?.label || item.data.type;
  };

  return (
    <Overlay onClick={onClose}>
      <PaletteBox
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* ── Input ── */}
        <InputRow>
          <MagnifyingGlassIcon />
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
            placeholder="Search artifacts, or type a command…"
            aria-label="Search"
            autoComplete="off"
            spellCheck={false}
          />
          <Kbd>esc</Kbd>
        </InputRow>

        {/* ── Results ── */}
        <ResultsArea ref={resultsRef}>
          {flatItems.length === 0 && !loading && query.trim() && (
            <EmptyText>No results for "{query}"</EmptyText>
          )}

          {flatItems.length === 0 && !query.trim() && !loading && (
            <EmptyText>Type to search products, forms, rules, tables…</EmptyText>
          )}

          {flatItems.map((item, i) => {
            const group = currentGroup(item);
            const showGroupLabel = i === 0 || group !== prevGroup(i);

            return (
              <React.Fragment key={item.kind === 'result' ? item.data.id : item.data.id}>
                {showGroupLabel && <GroupLabel>{group}</GroupLabel>}

                {item.kind === 'action' ? (
                  <ResultRow
                    $active={i === activeIdx}
                    data-idx={i}
                    onClick={() => executeItem(item)}
                    onMouseEnter={() => setActiveIdx(i)}
                  >
                    <IconBox $color={accent[500]}>
                      {item.data.icon}
                    </IconBox>
                    <ResultText>
                      <ResultTitle>{item.data.label}</ResultTitle>
                      {item.data.description && (
                        <ResultSubtitle>{item.data.description}</ResultSubtitle>
                      )}
                    </ResultText>
                    {item.data.shortcut && <ShortcutHint>{item.data.shortcut}</ShortcutHint>}
                  </ResultRow>
                ) : (
                  <ResultRow
                    $active={i === activeIdx}
                    data-idx={i}
                    onClick={() => executeItem(item)}
                    onMouseEnter={() => setActiveIdx(i)}
                  >
                    <IconBox $color={TYPE_META[item.data.type]?.bg}>
                      {TYPE_META[item.data.type]?.icon}
                    </IconBox>
                    <ResultText>
                      <ResultTitle>{item.data.title}</ResultTitle>
                      <ResultSubtitle>{item.data.subtitle}</ResultSubtitle>
                    </ResultText>
                    <TypeBadge>{TYPE_META[item.data.type]?.label}</TypeBadge>
                  </ResultRow>
                )}
              </React.Fragment>
            );
          })}

          {loading && (
            <EmptyText>Searching…</EmptyText>
          )}
        </ResultsArea>

        {/* ── Footer ── */}
        <Footer>
          <FooterHint><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</FooterHint>
          <FooterHint><Kbd>↵</Kbd> open</FooterHint>
          <FooterHint><Kbd>esc</Kbd> close</FooterHint>
        </Footer>
      </PaletteBox>
    </Overlay>
  );
};

// ════════════════════════════════════════════════════════════════════════
// Hook: useCommandPalette
// ════════════════════════════════════════════════════════════════════════

/**
 * Hook to manage command palette open state + global ⌘K listener.
 * Usage:
 *   const { open, setOpen } = useCommandPalette();
 *   <CommandPalette open={open} onClose={() => setOpen(false)} />
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return { open, setOpen };
}

export default CommandPalette;
