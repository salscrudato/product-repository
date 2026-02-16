/**
 * ClauseBrowser – /clauses
 *
 * Two-panel layout:
 *   Left:  Clause list with search, type filter, tag filter
 *   Right: Clause detail with versions, text preview, "where used"
 *
 * Supports creating new clauses and linking them to products/forms.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import logger, { LOG_CATEGORIES } from '../utils/logger';
import {
  color, neutral, accent, space, radius, shadow, fontFamily,
  type as T, border, duration, focusRingStyle, semantic,
} from '../ui/tokens';
import { useRoleContext } from '../context/RoleContext';
import useProducts from '../hooks/useProducts';
import {
  getClausesWithStats, getClauses, createClause, updateClause,
  getClauseVersions, createClauseVersion, transitionClauseVersion,
  getClauseWhereUsed, getAllClauseTags, getClauseLinks, deleteClauseLink,
} from '../services/clauseService';
import { getImplementedByForClause } from '../services/traceLinkService';
import type { TraceWithTarget } from '../types/traceLink';
import { TRACE_LINK_TARGET_CONFIG } from '../types/traceLink';
import type {
  OrgClause, ClauseVersion, ClauseWithStats, ClauseWhereUsedEntry, ClauseType,
} from '../types/clause';
import { CLAUSE_TYPE_CONFIG, CLAUSE_TYPE_OPTIONS } from '../types/clause';
import { VERSION_STATUS_CONFIG } from '../types/versioning';
import MainNavigation from '../components/ui/Navigation';

// ════════════════════════════════════════════════════════════════════════
// Styled Components
// ════════════════════════════════════════════════════════════════════════

const fadeIn = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}`;

const Page = styled.main`
  min-height: 100vh;
  background: ${neutral[50]};
  padding: ${space[8]} ${space[8]} ${space[16]};
`;

const Container = styled.div`max-width: 1400px; margin: 0 auto;`;

const PageHeader = styled.header`margin-bottom: ${space[6]};`;

const Title = styled.h1`
  font-family: ${fontFamily.sans};
  font-size: ${T.displaySm.size};
  font-weight: ${T.displaySm.weight};
  letter-spacing: ${T.displaySm.letterSpacing};
  color: ${color.text};
  margin: 0 0 ${space[1]};
`;

const Subtitle = styled.p`
  font-size: ${T.bodyMd.size};
  color: ${color.textSecondary};
  margin: 0;
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: ${space[5]};
  animation: ${fadeIn} 0.3s ease;
  @media (max-width: 1000px) { grid-template-columns: 1fr; }
`;

const Panel = styled.section`
  background: ${color.bg};
  border: ${border.default};
  border-radius: ${radius.lg};
  box-shadow: ${shadow.card};
  overflow: hidden;
`;

const PanelHeader = styled.div`
  padding: ${space[4]} ${space[5]};
  border-bottom: ${border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space[3]};
`;

const PanelTitle = styled.h2`
  font-family: ${fontFamily.sans};
  font-size: ${T.headingSm.size};
  font-weight: ${T.headingSm.weight};
  color: ${color.text};
  margin: 0;
`;

const PanelBody = styled.div`
  padding: ${space[4]} ${space[5]};
  overflow-y: auto;
  max-height: calc(100vh - 280px);
`;

const SearchInput = styled.input`
  width: 100%;
  padding: ${space[2]} ${space[3]};
  font-family: ${fontFamily.sans};
  font-size: ${T.bodySm.size};
  color: ${color.text};
  background: ${neutral[50]};
  border: ${border.default};
  border-radius: ${radius.sm};
  outline: none;
  &:focus { border-color: ${accent[500]}; ${focusRingStyle} }
  &::placeholder { color: ${color.textMuted}; }
`;

const FilterRow = styled.div`
  display: flex; gap: ${space[2]}; margin-top: ${space[3]}; flex-wrap: wrap;
`;

const FilterChip = styled.button<{ $active: boolean; $color?: string }>`
  padding: ${space[0.5]} ${space[2.5]};
  font-size: ${T.captionSm.size};
  font-weight: 600;
  color: ${p => p.$active ? (p.$color || accent[700]) : color.textSecondary};
  background: ${p => p.$active ? `${p.$color || accent[500]}14` : 'transparent'};
  border: 1px solid ${p => p.$active ? `${p.$color || accent[500]}40` : neutral[200]};
  border-radius: ${radius.full};
  cursor: pointer;
  transition: all ${duration.fast};
  &:hover { border-color: ${p => p.$color || accent[400]}; }
`;

const TagChip = styled.span`
  display: inline-flex;
  padding: 1px ${space[2]};
  font-size: 10px;
  font-weight: 600;
  color: ${accent[700]};
  background: ${accent[50]};
  border: 1px solid ${accent[200]};
  border-radius: ${radius.full};
`;

const ClauseProductChip = styled.span`
  display: inline-flex;
  padding: 1px ${space[2]};
  font-size: 10px;
  font-weight: 600;
  color: ${accent[600]};
  background: ${accent[50]};
  border-radius: ${radius.sm};
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ClauseProductFilter = styled.select`
  width: calc(100% - ${space[4]} - ${space[4]});
  margin: ${space[2]} ${space[4]} 0;
  padding: ${space[1.5]} ${space[3]};
  font-family: ${fontFamily.sans};
  font-size: ${T.captionSm.size};
  color: ${color.text};
  background: ${neutral[0]};
  border: ${border.default};
  border-radius: ${radius.sm};
  &:focus { outline: none; border-color: ${accent[500]}; }
`;

const ClauseRow = styled.button<{ $selected: boolean }>`
  width: 100%;
  padding: ${space[3]} ${space[4]};
  display: flex;
  flex-direction: column;
  gap: ${space[1]};
  text-align: left;
  background: ${p => p.$selected ? accent[50] : 'transparent'};
  border: none;
  border-bottom: ${border.light};
  cursor: pointer;
  transition: background ${duration.fast};
  &:hover { background: ${p => p.$selected ? accent[50] : neutral[50]}; }
`;

const ClauseName = styled.div`
  font-size: ${T.bodySm.size};
  font-weight: 600;
  color: ${color.text};
`;

const ClauseMeta = styled.div`
  font-size: ${T.captionSm.size};
  color: ${color.textSecondary};
  display: flex;
  align-items: center;
  gap: ${space[2]};
`;

const TypeBadge = styled.span<{ $color: string }>`
  padding: 1px ${space[2]};
  font-size: 10px;
  font-weight: 600;
  color: ${p => p.$color};
  background: ${p => `${p.$color}14`};
  border: 1px solid ${p => `${p.$color}30`};
  border-radius: ${radius.full};
`;

const StatusBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  padding: 1px ${space[2]};
  font-size: 10px;
  font-weight: 600;
  color: ${p => p.$color};
  background: ${p => `${p.$color}14`};
  border: 1px solid ${p => `${p.$color}30`};
  border-radius: ${radius.full};
`;

const EmptyState = styled.div`
  padding: ${space[10]} ${space[6]};
  text-align: center;
  color: ${color.textMuted};
  font-size: ${T.bodySm.size};
`;

const TextPreview = styled.pre`
  padding: ${space[3]} ${space[4]};
  font-family: ${fontFamily.mono};
  font-size: ${T.captionSm.size};
  color: ${color.textSecondary};
  background: ${neutral[50]};
  border: ${border.light};
  border-radius: ${radius.md};
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 240px;
  overflow-y: auto;
  margin: ${space[3]} 0;
`;

const SectionLabel = styled.div`
  font-size: ${T.overline.size};
  font-weight: ${T.overline.weight};
  letter-spacing: ${T.overline.letterSpacing};
  color: ${color.textMuted};
  text-transform: uppercase;
  margin: ${space[5]} 0 ${space[2]};
`;

const WhereUsedRow = styled.div`
  padding: ${space[2]} ${space[3]};
  border-bottom: ${border.light};
  display: flex;
  align-items: center;
  gap: ${space[3]};
  font-size: ${T.bodySm.size};
  &:last-child { border-bottom: none; }
`;

const WhereUsedType = styled.span`
  font-size: ${T.captionSm.size};
  font-weight: 600;
  color: ${color.textMuted};
  width: 60px;
`;

const WhereUsedLabel = styled.span`
  flex: 1;
  color: ${color.text};
`;

const VersionRow = styled.div<{ $selected: boolean }>`
  padding: ${space[2]} ${space[3]};
  border-bottom: ${border.light};
  display: flex;
  align-items: center;
  gap: ${space[2]};
  font-size: ${T.bodySm.size};
  cursor: pointer;
  background: ${p => p.$selected ? accent[50] : 'transparent'};
  &:hover { background: ${neutral[50]}; }
  &:last-child { border-bottom: none; }
`;

const Btn = styled.button<{ $variant?: 'primary' | 'ghost' }>`
  padding: ${space[1.5]} ${space[4]};
  font-family: ${fontFamily.sans};
  font-size: ${T.label.size};
  font-weight: 600;
  border-radius: ${radius.sm};
  cursor: pointer;
  transition: all ${duration.fast};
  ${p => p.$variant === 'primary'
    ? `color: ${color.textInverse}; background: ${accent[600]}; border: none; &:hover { background: ${accent[700]}; }`
    : `color: ${color.textSecondary}; background: transparent; border: ${border.default}; &:hover { border-color: ${accent[400]}; color: ${accent[600]}; }`
  }
  &:focus-visible { ${focusRingStyle} }
`;

const FormField = styled.div`margin-bottom: ${space[3]};`;
const FormLabel = styled.label`
  display: block;
  font-size: ${T.captionSm.size};
  font-weight: 600;
  color: ${color.textSecondary};
  margin-bottom: ${space[1]};
`;
const FormInput = styled.input`
  width: 100%;
  padding: ${space[2]} ${space[3]};
  font-family: ${fontFamily.sans};
  font-size: ${T.bodySm.size};
  color: ${color.text};
  background: ${color.bg};
  border: ${border.default};
  border-radius: ${radius.sm};
  outline: none;
  &:focus { border-color: ${accent[500]}; }
`;
const FormTextarea = styled.textarea`
  width: 100%;
  padding: ${space[2]} ${space[3]};
  font-family: ${fontFamily.mono};
  font-size: ${T.captionSm.size};
  color: ${color.text};
  background: ${color.bg};
  border: ${border.default};
  border-radius: ${radius.sm};
  outline: none;
  resize: vertical;
  min-height: 120px;
  &:focus { border-color: ${accent[500]}; }
`;
const FormSelect = styled.select`
  padding: ${space[2]} ${space[3]};
  font-family: ${fontFamily.sans};
  font-size: ${T.bodySm.size};
  color: ${color.text};
  background: ${color.bg};
  border: ${border.default};
  border-radius: ${radius.sm};
  outline: none;
  &:focus { border-color: ${accent[500]}; }
`;

const Spinner = styled.div`
  display: flex; align-items: center; justify-content: center;
  padding: ${space[10]}; color: ${color.textMuted};
`;

const StateRow = styled.span`
  font-family: ${fontFamily.mono};
  font-size: ${T.captionSm.size};
  color: ${color.textMuted};
`;

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

const ClauseBrowser: React.FC = () => {
  const { currentOrgId, user } = useRoleContext();
  const currentUserId = user?.uid || '';
  const { data: products } = useProducts();

  // ── List state ──
  const [clauseList, setClauseList] = useState<ClauseWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ClauseType | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  // ── Detail state ──
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [versions, setVersions] = useState<ClauseVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [whereUsed, setWhereUsed] = useState<ClauseWhereUsedEntry[]>([]);
  const [implementedBy, setImplementedBy] = useState<TraceWithTarget[]>([]);

  // ── Create form ──
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ClauseType>('coverage');
  const [newTags, setNewTags] = useState('');
  const [newText, setNewText] = useState('');

  // ── Load clauses ──
  const loadData = useCallback(async () => {
    if (!currentOrgId) return;
    setLoading(true);
    try {
      const [stats, tags] = await Promise.all([
        getClausesWithStats(currentOrgId),
        getAllClauseTags(currentOrgId),
      ]);
      setClauseList(stats);
      setAllTags(tags);
    } catch { /* ignore */ }
    setLoading(false);
  }, [currentOrgId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Load detail ──
  useEffect(() => {
    if (!currentOrgId || !selectedClauseId) {
      setVersions([]);
      setWhereUsed([]);
      setImplementedBy([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [vs, wu, ib] = await Promise.all([
          getClauseVersions(currentOrgId, selectedClauseId),
          getClauseWhereUsed(currentOrgId, selectedClauseId),
          getImplementedByForClause(currentOrgId, selectedClauseId),
        ]);
        if (cancelled) return;
        setVersions(vs);
        setWhereUsed(wu);
        setImplementedBy(ib);
        if (vs.length > 0 && !selectedVersionId) setSelectedVersionId(vs[0].id);
      } catch (err) {
        if (!cancelled) {
          logger.warn(LOG_CATEGORIES.DATA, 'Failed to load clause detail', { clauseId: selectedClauseId, error: String(err) });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [currentOrgId, selectedClauseId]);

  const productNameMap = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach(p => map.set(p.id, p.name));
    return map;
  }, [products]);

  // ── Filtered list ──
  const filtered = useMemo(() => {
    let list = clauseList;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.clause.canonicalName.toLowerCase().includes(q) ||
        c.clause.tags.some(t => t.toLowerCase().includes(q)) ||
        c.latestVersionText?.toLowerCase().includes(q),
      );
    }
    if (typeFilter) list = list.filter(c => c.clause.type === typeFilter);
    if (tagFilter) list = list.filter(c => c.clause.tags.includes(tagFilter));
    if (productFilter) list = list.filter(c => c.clause.productIds?.includes(productFilter));
    return list;
  }, [clauseList, search, typeFilter, tagFilter, productFilter]);

  const selectedClause = clauseList.find(c => c.clause.id === selectedClauseId);
  const selectedVersion = versions.find(v => v.id === selectedVersionId);

  // ── Handlers ──
  const handleCreate = async () => {
    if (!currentOrgId || !currentUserId || !newName.trim()) return;
    const clauseId = await createClause(currentOrgId, {
      canonicalName: newName.trim(),
      type: newType,
      tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
    }, currentUserId);

    if (newText.trim()) {
      await createClauseVersion(currentOrgId, clauseId, { text: newText.trim() }, currentUserId);
    }

    setShowCreate(false);
    setNewName(''); setNewTags(''); setNewText('');
    await loadData();
    setSelectedClauseId(clauseId);
  };

  if (loading) return <Page><Spinner>Loading clause library...</Spinner></Page>;

  return (
    <Page id="main-content">
      <MainNavigation />
      <Container>
        <PageHeader>
          <Title>Clause Library</Title>
          <Subtitle>Browse, tag, and reuse clauses across forms, endorsements, and products</Subtitle>
        </PageHeader>

        <Layout>
          {/* ── Left panel: clause list ── */}
          <Panel>
            <PanelHeader>
              <PanelTitle>Clauses ({filtered.length})</PanelTitle>
              <Btn $variant="primary" onClick={() => setShowCreate(true)}>+ New</Btn>
            </PanelHeader>
            <PanelBody>
              <SearchInput
                placeholder="Search clauses..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />

              {/* Type filter */}
              <FilterRow>
                <FilterChip $active={!typeFilter} onClick={() => setTypeFilter(null)}>All</FilterChip>
                {CLAUSE_TYPE_OPTIONS.map(opt => (
                  <FilterChip
                    key={opt.value}
                    $active={typeFilter === opt.value}
                    $color={opt.color}
                    onClick={() => setTypeFilter(typeFilter === opt.value ? null : opt.value)}
                  >
                    {opt.label}
                  </FilterChip>
                ))}
              </FilterRow>

              {/* Tag filter */}
              {allTags.length > 0 && (
                <FilterRow>
                  {tagFilter && (
                    <FilterChip $active={false} onClick={() => setTagFilter(null)}>
                      Clear tag
                    </FilterChip>
                  )}
                  {allTags.slice(0, 12).map(tag => (
                    <FilterChip
                      key={tag}
                      $active={tagFilter === tag}
                      onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                    >
                      {tag}
                    </FilterChip>
                  ))}
                </FilterRow>
              )}

              {/* Product filter */}
              {products.length > 0 && (
                <ClauseProductFilter
                  value={productFilter || ''}
                  onChange={e => setProductFilter(e.target.value || null)}
                >
                  <option value="">All Products</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </ClauseProductFilter>
              )}

              {/* Clause list */}
              {filtered.length === 0 ? (
                <EmptyState>No clauses found</EmptyState>
              ) : (
                filtered.map(({ clause, publishedVersionCount, linkCount }) => {
                  const cfg = CLAUSE_TYPE_CONFIG[clause.type] ?? CLAUSE_TYPE_CONFIG.other;
                  return (
                    <ClauseRow
                      key={clause.id}
                      $selected={clause.id === selectedClauseId}
                      onClick={() => { setSelectedClauseId(clause.id); setSelectedVersionId(null); }}
                    >
                      <ClauseName>{clause.canonicalName}</ClauseName>
                      <ClauseMeta>
                        <TypeBadge $color={cfg.color}>{cfg.label}</TypeBadge>
                        <span>{publishedVersionCount} published</span>
                        <span>{linkCount} uses</span>
                      </ClauseMeta>
                      {clause.tags.length > 0 && (
                        <ClauseMeta>
                          {clause.tags.slice(0, 4).map(t => <TagChip key={t}>{t}</TagChip>)}
                          {clause.tags.length > 4 && <span>+{clause.tags.length - 4}</span>}
                        </ClauseMeta>
                      )}
                      {clause.productIds && clause.productIds.length > 0 && (
                        <ClauseMeta>
                          {clause.productIds.slice(0, 3).map(pid => (
                            <ClauseProductChip key={pid}>{productNameMap.get(pid) || pid}</ClauseProductChip>
                          ))}
                          {clause.productIds.length > 3 && <span>+{clause.productIds.length - 3}</span>}
                        </ClauseMeta>
                      )}
                    </ClauseRow>
                  );
                })
              )}
            </PanelBody>
          </Panel>

          {/* ── Right panel: detail ── */}
          <Panel>
            {!selectedClause ? (
              <EmptyState>Select a clause to view details</EmptyState>
            ) : (
              <>
                <PanelHeader>
                  <div>
                    <PanelTitle>{selectedClause.clause.canonicalName}</PanelTitle>
                    <ClauseMeta style={{ marginTop: space[1] }}>
                      <TypeBadge $color={(CLAUSE_TYPE_CONFIG[selectedClause.clause.type] ?? CLAUSE_TYPE_CONFIG.other).color}>
                        {(CLAUSE_TYPE_CONFIG[selectedClause.clause.type] ?? CLAUSE_TYPE_CONFIG.other).label}
                      </TypeBadge>
                      {selectedClause.clause.tags.map(t => <TagChip key={t}>{t}</TagChip>)}
                    </ClauseMeta>
                  </div>
                </PanelHeader>
                <PanelBody>
                  {/* Versions */}
                  <SectionLabel>Versions ({versions.length})</SectionLabel>
                  {versions.length === 0 ? (
                    <EmptyState>No versions yet</EmptyState>
                  ) : (
                    versions.map(v => {
                      const statusCfg = VERSION_STATUS_CONFIG[v.status] ?? VERSION_STATUS_CONFIG.draft;
                      return (
                        <VersionRow
                          key={v.id}
                          $selected={v.id === selectedVersionId}
                          onClick={() => setSelectedVersionId(v.id)}
                        >
                          <span style={{ fontFamily: fontFamily.mono, fontSize: T.captionSm.size, width: 24 }}>
                            v{v.versionNumber}
                          </span>
                          <StatusBadge $color={statusCfg.color}>{statusCfg.label}</StatusBadge>
                          {v.sourceFormNumber && <StateRow>from {v.sourceFormNumber}</StateRow>}
                          <span style={{ flex: 1 }} />
                          <StateRow>
                            {v.effectiveStart || ''}{v.effectiveEnd ? ` – ${v.effectiveEnd}` : ''}
                          </StateRow>
                        </VersionRow>
                      );
                    })
                  )}

                  {/* Text preview */}
                  {selectedVersion && (
                    <>
                      <SectionLabel>Clause Text (v{selectedVersion.versionNumber})</SectionLabel>
                      <TextPreview>{selectedVersion.text}</TextPreview>
                    </>
                  )}

                  {/* Where used */}
                  <SectionLabel>Where Used ({whereUsed.length})</SectionLabel>
                  {whereUsed.length === 0 ? (
                    <EmptyState>Not linked to any targets</EmptyState>
                  ) : (
                    whereUsed.map(wu => (
                      <WhereUsedRow key={wu.link.id}>
                        <WhereUsedType>{wu.targetTypeLabel}</WhereUsedType>
                        <WhereUsedLabel>{wu.targetLabel}</WhereUsedLabel>
                        {wu.link.stateCode && <StateRow>{wu.link.stateCode}</StateRow>}
                      </WhereUsedRow>
                    ))
                  )}

                  {/* Implemented by – trace links to rules/coverages/rate programs */}
                  <SectionLabel>Implemented By ({implementedBy.length})</SectionLabel>
                  {implementedBy.length === 0 ? (
                    <EmptyState>No rules or coverages traced to this clause</EmptyState>
                  ) : (
                    implementedBy.map(ib => {
                      const cfg = TRACE_LINK_TARGET_CONFIG[ib.traceLink.targetType];
                      return (
                        <WhereUsedRow key={ib.traceLink.id}>
                          <WhereUsedType style={{ color: cfg.color, background: `${cfg.color}14`, border: `1px solid ${cfg.color}30` }}>
                            {ib.targetTypeLabel}
                          </WhereUsedType>
                          <WhereUsedLabel>{ib.targetLabel}</WhereUsedLabel>
                          {ib.traceLink.rationale && (
                            <StateRow title={ib.traceLink.rationale}>
                              {ib.traceLink.rationale.length > 40
                                ? ib.traceLink.rationale.slice(0, 40) + '...'
                                : ib.traceLink.rationale}
                            </StateRow>
                          )}
                        </WhereUsedRow>
                      );
                    })
                  )}
                </PanelBody>
              </>
            )}
          </Panel>
        </Layout>

        {/* ── Create modal ── */}
        {showCreate && (
          <div
            style={{
              position: 'fixed', inset: 0, background: color.overlay, display: 'flex',
              alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            }}
            onClick={() => setShowCreate(false)}
          >
            <div
              style={{
                background: color.bg, borderRadius: radius.lg, boxShadow: shadow.xl,
                padding: space[6], width: 520, maxHeight: '80vh', overflowY: 'auto',
              }}
              onClick={e => e.stopPropagation()}
            >
              <PanelTitle style={{ marginBottom: space[4] }}>New Clause</PanelTitle>
              <FormField>
                <FormLabel>Canonical Name</FormLabel>
                <FormInput value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Additional Insured – Managers or Lessors" />
              </FormField>
              <FormField>
                <FormLabel>Type</FormLabel>
                <FormSelect value={newType} onChange={e => setNewType(e.target.value as ClauseType)}>
                  {CLAUSE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </FormSelect>
              </FormField>
              <FormField>
                <FormLabel>Tags (comma-separated)</FormLabel>
                <FormInput value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="gl, additional-insured, premises" />
              </FormField>
              <FormField>
                <FormLabel>Initial Version Text (optional)</FormLabel>
                <FormTextarea value={newText} onChange={e => setNewText(e.target.value)} placeholder="Paste clause text..." />
              </FormField>
              <div style={{ display: 'flex', gap: space[3], justifyContent: 'flex-end' }}>
                <Btn onClick={() => setShowCreate(false)}>Cancel</Btn>
                <Btn $variant="primary" onClick={handleCreate}>Create Clause</Btn>
              </div>
            </div>
          </div>
        )}
      </Container>
    </Page>
  );
};

export default ClauseBrowser;
