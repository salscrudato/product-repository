/**
 * CoverageLibrary  (Design System v2)
 *
 * Route: /coverage-library
 *
 * Unified library for browsing, creating, and managing:
 *  - Coverage Templates (reusable blueprints)
 *  - First-class Endorsements (versioned endorsement entities)
 *
 * Features:
 *  - Faceted sidebar (All, Templates, Endorsements)
 *  - Category filters + search
 *  - "Create Template" + "Apply Template" actions
 *  - Endorsement toggle + ordering for wizard integration
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentDuplicateIcon,
  ShieldCheckIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  TagIcon,
  CheckCircleIcon,
  BookOpenIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  ClipboardDocumentListIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

import MainNavigation from '@/components/ui/Navigation';
import {
  color, neutral, accent, semantic,
  space, radius, shadow, fontFamily,
  type as t, border as borderTokens,
  duration, focusRingStyle, reducedMotion,
} from '@/ui/tokens';
import { PageShell, PageBody, PageHeader, PageHeaderLeft, PageHeaderRight, PageTitle, Badge, SectionCard, SectionTitle } from '@/ui/components';
import { useRoleContext } from '@/context/RoleContext';
import { listTemplates, deleteTemplate } from '@/services/coverageTemplateService';
import { listEndorsements, archiveEndorsement } from '@/services/endorsementService';
import type { CoverageTemplate, TemplateCategoryTag, OrgEndorsement, LibraryFacet, TEMPLATE_CATEGORY_LABELS } from '@/types/coverageTemplate';

// ════════════════════════════════════════════════════════════════════════
// Styled
// ════════════════════════════════════════════════════════════════════════

const fadeIn = keyframes`from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}`;

const Container = styled.div`max-width: 1200px; margin: 0 auto;`;

const Layout = styled.div`display: grid; grid-template-columns: 220px 1fr; gap: ${space[5]}; align-items: start;`;

/* ── Sidebar ── */

const Sidebar = styled.div`
  position: sticky; top: 80px;
  background: ${color.bg}; border: ${borderTokens.default};
  border-radius: ${radius.xl}; overflow: hidden;
`;

const SidebarTitle = styled.div`
  padding: ${space[3]} ${space[4]}; font-family: ${fontFamily.sans};
  font-size: ${t.overline.size}; font-weight: ${t.overline.weight};
  letter-spacing: ${t.overline.letterSpacing}; text-transform: uppercase;
  color: ${neutral[500]}; border-bottom: ${borderTokens.default};
`;

const FacetBtn = styled.button<{ $active?: boolean }>`
  display: flex; align-items: center; gap: ${space[2]}; width: 100%;
  padding: ${space[2.5]} ${space[4]}; border: none;
  background: ${({ $active }) => $active ? accent[50] : 'transparent'};
  color: ${({ $active }) => $active ? accent[700] : color.text};
  font-family: ${fontFamily.sans}; font-size: ${t.captionSm.size}; font-weight: 500;
  cursor: pointer; transition: all ${duration.fast} ease;
  &:hover { background: ${neutral[50]}; }
  &:focus-visible { ${focusRingStyle} }
  svg { width: 15px; height: 15px; }
`;

const FacetCount = styled.span`
  margin-left: auto; font-size: 11px; color: ${neutral[400]};
  background: ${neutral[100]}; padding: 1px ${space[1.5]}; border-radius: ${radius.full};
`;

/* ── Toolbar ── */

const Toolbar = styled.div`
  display: flex; align-items: center; gap: ${space[2]};
  margin-bottom: ${space[4]};
`;

const SearchBox = styled.div`
  position: relative; flex: 1;
  svg {
    position: absolute; left: ${space[2.5]}; top: 50%;
    transform: translateY(-50%); width: 14px; height: 14px; color: ${neutral[400]};
  }
`;

const SearchInput = styled.input`
  width: 100%; font-family: ${fontFamily.sans}; font-size: ${t.captionSm.size};
  padding: ${space[2]} ${space[2]} ${space[2]} ${space[8]};
  border: ${borderTokens.default}; border-radius: ${radius.md};
  background: ${color.bg}; color: ${color.text};
  &:focus { ${focusRingStyle} outline: none; }
  &::placeholder { color: ${neutral[400]}; }
`;

const CategoryChip = styled.button<{ $active?: boolean }>`
  display: inline-flex; align-items: center; gap: ${space[1]};
  padding: ${space[1]} ${space[2.5]}; border-radius: ${radius.full};
  border: 1px solid ${({ $active }) => $active ? accent[300] : neutral[200]};
  background: ${({ $active }) => $active ? accent[50] : 'white'};
  font-family: ${fontFamily.sans}; font-size: 11px; font-weight: 500;
  color: ${({ $active }) => $active ? accent[700] : neutral[600]};
  cursor: pointer; transition: all ${duration.fast} ease;
  &:hover { border-color: ${accent[300]}; }
  &:focus-visible { ${focusRingStyle} }
`;

const ActionBtn = styled.button<{ $primary?: boolean }>`
  display: flex; align-items: center; gap: ${space[1.5]};
  padding: ${space[2]} ${space[3]}; border-radius: ${radius.md};
  border: 1px solid ${({ $primary }) => $primary ? accent[500] : neutral[200]};
  background: ${({ $primary }) => $primary ? accent[500] : 'white'};
  color: ${({ $primary }) => $primary ? 'white' : color.text};
  font-family: ${fontFamily.sans}; font-size: ${t.captionSm.size}; font-weight: 500;
  cursor: pointer; transition: all ${duration.fast} ease;
  &:hover { background: ${({ $primary }) => $primary ? accent[600] : neutral[50]}; }
  &:focus-visible { ${focusRingStyle} }
  svg { width: 14px; height: 14px; }
`;

/* ── Cards ── */

const Grid = styled.div`display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: ${space[3]};`;

const ItemCard = styled.div`
  background: ${color.bg}; border: ${borderTokens.default};
  border-radius: ${radius.xl}; padding: ${space[4]};
  animation: ${fadeIn} ${duration.normal} ease;
  @media ${reducedMotion} { animation: none; }
  transition: box-shadow ${duration.fast} ease;
  &:hover { box-shadow: ${shadow.cardHover}; }
`;

const CardHeader = styled.div`display: flex; align-items: start; gap: ${space[2]}; margin-bottom: ${space[2]};`;

const CardIcon = styled.div<{ $color?: string }>`
  width: 36px; height: 36px; border-radius: ${radius.lg};
  display: grid; place-items: center;
  background: ${({ $color }) => $color || accent[50]};
  color: ${({ $color }) => $color ? 'white' : accent[500]};
  flex-shrink: 0;
  svg { width: 18px; height: 18px; }
`;

const CardTitle = styled.h3`
  margin: 0; font-family: ${fontFamily.sans};
  font-size: ${t.bodySm.size}; font-weight: 600; color: ${color.text};
`;

const CardDesc = styled.p`
  margin: 0 0 ${space[3]} 0; font-size: ${t.captionSm.size}; color: ${color.textMuted};
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
`;

const CardFooter = styled.div`
  display: flex; align-items: center; gap: ${space[2]}; flex-wrap: wrap;
`;

const SmallBtn = styled.button`
  display: flex; align-items: center; gap: ${space[1]};
  padding: ${space[1]} ${space[2]}; border-radius: ${radius.md};
  border: 1px solid ${neutral[200]}; background: ${color.bg};
  font-family: ${fontFamily.sans}; font-size: 11px; color: ${neutral[600]};
  cursor: pointer; transition: all ${duration.fast} ease;
  &:hover { border-color: ${accent[300]}; background: ${accent[50]}; color: ${accent[700]}; }
  &:focus-visible { ${focusRingStyle} }
  svg { width: 12px; height: 12px; }
`;

const EmptyState = styled.div`
  padding: ${space[12]} ${space[4]}; text-align: center;
  color: ${color.textMuted}; font-size: ${t.bodySm.size};
`;

const TagList = styled.div`display: flex; flex-wrap: wrap; gap: ${space[1]}; margin-bottom: ${space[2]};`;

// ════════════════════════════════════════════════════════════════════════
// Category labels
// ════════════════════════════════════════════════════════════════════════

const CATEGORY_LABELS: Record<string, string> = {
  general_liability: 'General Liability',
  commercial_property: 'Commercial Property',
  commercial_auto: 'Commercial Auto',
  workers_comp: 'Workers\' Comp',
  professional_liability: 'Professional Liability',
  umbrella_excess: 'Umbrella / Excess',
  inland_marine: 'Inland Marine',
  cyber: 'Cyber',
  custom: 'Custom',
};

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

const CoverageLibrary: React.FC = () => {
  const { currentOrgId } = useRoleContext();
  const navigate = useNavigate();

  const [facet, setFacet] = useState<LibraryFacet>('all');
  const [templates, setTemplates] = useState<CoverageTemplate[]>([]);
  const [endorsements, setEndorsements] = useState<OrgEndorsement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // ── Load data ──

  useEffect(() => {
    if (!currentOrgId) return;
    setLoading(true);
    Promise.all([
      listTemplates(currentOrgId, { search }),
      listEndorsements(currentOrgId, { search }),
    ]).then(([t, e]) => {
      setTemplates(t);
      setEndorsements(e);
    }).catch(console.error).finally(() => setLoading(false));
  }, [currentOrgId, search]);

  // ── Derived data ──

  const filteredTemplates = useMemo(() => {
    let items = templates;
    if (categoryFilter) items = items.filter(t => t.category === categoryFilter);
    return items;
  }, [templates, categoryFilter]);

  const filteredEndorsements = useMemo(() => {
    let items = endorsements;
    if (categoryFilter) items = items.filter(e => e.compatibilityTags.includes(categoryFilter));
    return items;
  }, [endorsements, categoryFilter]);

  const showTemplates = facet === 'all' || facet === 'templates';
  const showEndorsements = facet === 'all' || facet === 'endorsements';

  const categories = useMemo(() => {
    const cats = new Set<string>();
    templates.forEach(t => cats.add(t.category));
    endorsements.forEach(e => e.compatibilityTags.forEach(t => cats.add(t)));
    return Array.from(cats).sort();
  }, [templates, endorsements]);

  // ── Handlers ──

  const handleDeleteTemplate = useCallback(async (id: string) => {
    if (!currentOrgId || !confirm('Delete this template?')) return;
    await deleteTemplate(currentOrgId, id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  }, [currentOrgId]);

  const handleArchiveEndorsement = useCallback(async (id: string) => {
    if (!currentOrgId || !confirm('Archive this endorsement?')) return;
    await archiveEndorsement(currentOrgId, id);
    setEndorsements(prev => prev.filter(e => e.id !== id));
  }, [currentOrgId]);

  return (
    <PageShell>
      <MainNavigation />
      <PageBody>
        <Container>
          <PageHeader>
            <PageHeaderLeft>
              <PageTitle>Coverage Library</PageTitle>
            </PageHeaderLeft>
            <PageHeaderRight>
              <ActionBtn onClick={() => navigate('/coverage-library/create-template')}>
                <PlusIcon /> Create Template
              </ActionBtn>
              <ActionBtn onClick={() => navigate('/coverage-library/create-endorsement')}>
                <PlusIcon /> New Endorsement
              </ActionBtn>
            </PageHeaderRight>
          </PageHeader>

          <Layout>
            {/* ── Sidebar ── */}
            <Sidebar>
              <SidebarTitle>Library</SidebarTitle>
              <FacetBtn $active={facet === 'all'} onClick={() => setFacet('all')}>
                <BookOpenIcon /> All
                <FacetCount>{templates.length + endorsements.length}</FacetCount>
              </FacetBtn>
              <FacetBtn $active={facet === 'templates'} onClick={() => setFacet('templates')}>
                <DocumentDuplicateIcon /> Templates
                <FacetCount>{templates.length}</FacetCount>
              </FacetBtn>
              <FacetBtn $active={facet === 'endorsements'} onClick={() => setFacet('endorsements')}>
                <AdjustmentsHorizontalIcon /> Endorsements
                <FacetCount>{endorsements.length}</FacetCount>
              </FacetBtn>
            </Sidebar>

            {/* ── Main content ── */}
            <div>
              <Toolbar>
                <SearchBox>
                  <MagnifyingGlassIcon />
                  <SearchInput
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search templates and endorsements…"
                  />
                </SearchBox>
                {categoryFilter && (
                  <CategoryChip $active onClick={() => setCategoryFilter(null)}>
                    {CATEGORY_LABELS[categoryFilter] || categoryFilter} ×
                  </CategoryChip>
                )}
              </Toolbar>

              {/* Category chips */}
              {categories.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: space[1], marginBottom: space[4] }}>
                  {categories.map(cat => (
                    <CategoryChip key={cat} $active={categoryFilter === cat} onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}>
                      {CATEGORY_LABELS[cat] || cat}
                    </CategoryChip>
                  ))}
                </div>
              )}

              {loading && <EmptyState>Loading library…</EmptyState>}

              {/* ── Templates Section ── */}
              {!loading && showTemplates && (
                <>
                  {filteredTemplates.length > 0 && (
                    <div style={{ marginBottom: space[6] }}>
                      <SectionTitle><DocumentDuplicateIcon /> Coverage Templates</SectionTitle>
                      <Grid>
                        {filteredTemplates.map(tpl => (
                          <ItemCard key={tpl.id}>
                            <CardHeader>
                              <CardIcon><ShieldCheckIcon /></CardIcon>
                              <div style={{ flex: 1 }}>
                                <CardTitle>{tpl.name}</CardTitle>
                                <Badge $variant="accent" $size="sm" style={{ marginTop: 4 }}>
                                  {CATEGORY_LABELS[tpl.category] || tpl.category}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardDesc>{tpl.description}</CardDesc>
                            <TagList>
                              {tpl.tags.slice(0, 4).map(tag => (
                                <Badge key={tag} $variant="neutral" $size="sm">{tag}</Badge>
                              ))}
                            </TagList>
                            <CardFooter>
                              <Badge $variant="neutral" $size="sm">
                                {tpl.bundledEndorsementIds.length} endorsement{tpl.bundledEndorsementIds.length !== 1 ? 's' : ''}
                              </Badge>
                              <Badge $variant="neutral" $size="sm">
                                {tpl.usageCount} use{tpl.usageCount !== 1 ? 's' : ''}
                              </Badge>
                              <span style={{ marginLeft: 'auto' }} />
                              <SmallBtn onClick={() => handleDeleteTemplate(tpl.id)}><TrashIcon /> Delete</SmallBtn>
                            </CardFooter>
                          </ItemCard>
                        ))}
                      </Grid>
                    </div>
                  )}
                </>
              )}

              {/* ── Endorsements Section ── */}
              {!loading && showEndorsements && (
                <>
                  {filteredEndorsements.length > 0 && (
                    <div>
                      <SectionTitle><AdjustmentsHorizontalIcon /> Endorsements</SectionTitle>
                      <Grid>
                        {filteredEndorsements.map(end => (
                          <ItemCard key={end.id}>
                            <CardHeader>
                              <CardIcon $color={
                                end.endorsementType === 'broadening' ? semantic.success :
                                end.endorsementType === 'restrictive' ? semantic.warning :
                                accent[500]
                              }>
                                <AdjustmentsHorizontalIcon />
                              </CardIcon>
                              <div style={{ flex: 1 }}>
                                <CardTitle>{end.title}</CardTitle>
                                <span style={{ fontSize: 11, color: neutral[400] }}>{end.endorsementCode}</span>
                              </div>
                            </CardHeader>
                            <CardDesc>{end.description || 'No description'}</CardDesc>
                            <TagList>
                              <Badge $variant={
                                end.endorsementType === 'broadening' ? 'success' :
                                end.endorsementType === 'restrictive' ? 'warning' :
                                end.endorsementType === 'additional' ? 'info' : 'neutral'
                              } $size="sm">
                                {end.endorsementType}
                              </Badge>
                              {end.compatibilityTags.slice(0, 3).map(tag => (
                                <Badge key={tag} $variant="neutral" $size="sm">{tag}</Badge>
                              ))}
                            </TagList>
                            <CardFooter>
                              <Badge $variant="neutral" $size="sm">
                                v{end.versionCount}
                              </Badge>
                              <Badge $variant="neutral" $size="sm">
                                {end.usageCount} use{end.usageCount !== 1 ? 's' : ''}
                              </Badge>
                              <span style={{ marginLeft: 'auto' }} />
                              <SmallBtn onClick={() => handleArchiveEndorsement(end.id)}>
                                <TrashIcon /> Archive
                              </SmallBtn>
                            </CardFooter>
                          </ItemCard>
                        ))}
                      </Grid>
                    </div>
                  )}
                </>
              )}

              {!loading && filteredTemplates.length === 0 && filteredEndorsements.length === 0 && (
                <EmptyState>
                  No {facet === 'templates' ? 'templates' : facet === 'endorsements' ? 'endorsements' : 'items'} found.
                  {search && ' Try adjusting your search.'}
                </EmptyState>
              )}
            </div>
          </Layout>
        </Container>
      </PageBody>
    </PageShell>
  );
};

export default CoverageLibrary;
