/**
 * ExportCenter Page  (Design System v2)
 *
 * Route: /filings
 *
 * Lists all filing packages across change sets with filters,
 * status indicators, and download links.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import logger, { LOG_CATEGORIES } from '../utils/logger';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import {
  DocumentArrowDownIcon,
  FunnelIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  LinkIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import {
  color, neutral, accent, semantic,
  space, radius, shadow, fontFamily,
  type as t, border as borderTokens,
  duration, focusRingStyle, reducedMotion,
} from '@/ui/tokens';
import {
  PageShell, PageBody,
  PageHeader, PageHeaderLeft, PageHeaderRight,
  PageTitle, Badge,
} from '@/ui/components';
import MainNavigation from '@/components/ui/Navigation';
import { useRoleContext } from '@/context/RoleContext';
import { listFilingPackages, getPackageDownloadUrl } from '@/services/filingPackageService';
import type { FilingPackage, FilingPackageStatus } from '@/types/filingPackage';

// ════════════════════════════════════════════════════════════════════════
// Styled
// ════════════════════════════════════════════════════════════════════════

const fadeIn = keyframes`from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}`;

const Container = styled.div`max-width: 1200px; margin: 0 auto;`;

const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${space[2]};
  margin-bottom: ${space[4]};
  padding: ${space[3]} ${space[4]};
  background: ${neutral[50]};
  border: ${borderTokens.default};
  border-radius: ${radius.xl};
`;

const FilterLabel = styled.span`
  font-family: ${fontFamily.sans};
  font-size: ${t.captionSm.size};
  font-weight: 600;
  color: ${neutral[500]};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  gap: ${space[1]};

  svg { width: 14px; height: 14px; }
`;

const Chip = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${space[1]};
  padding: ${space[1]} ${space[2.5]};
  border-radius: ${radius.full};
  border: 1px solid ${({ $active }) => $active ? accent[300] : neutral[200]};
  background: ${({ $active }) => $active ? accent[50] : 'white'};
  cursor: pointer;
  font-family: ${fontFamily.sans};
  font-size: ${t.captionSm.size};
  font-weight: 500;
  color: ${({ $active }) => $active ? accent[700] : neutral[600]};
  transition: all ${duration.fast} ease;

  &:hover { border-color: ${accent[300]}; }
  &:focus-visible { ${focusRingStyle} }
`;

const ProductSelect = styled.select`
  padding: ${space[1.5]} ${space[3]};
  font-family: ${fontFamily.sans};
  font-size: ${t.captionSm.size};
  color: ${color.text};
  background: ${neutral[0]};
  border: ${borderTokens.default};
  border-radius: ${radius.md};
  cursor: pointer;
  &:focus { outline: none; border-color: ${accent[500]}; }
`;

const SearchBox = styled.div`
  margin-left: auto;
  position: relative;
  svg {
    position: absolute;
    left: ${space[2]};
    top: 50%;
    transform: translateY(-50%);
    width: 14px; height: 14px;
    color: ${neutral[400]};
  }
`;

const SearchInput = styled.input`
  font-family: ${fontFamily.sans};
  font-size: ${t.captionSm.size};
  padding: ${space[1]} ${space[2]} ${space[1]} ${space[7]};
  border: 1px solid ${neutral[200]};
  border-radius: ${radius.md};
  background: white;
  color: ${color.text};
  width: 200px;

  &:focus { ${focusRingStyle} outline: none; }
  &::placeholder { color: ${neutral[400]}; }
`;

const Table = styled.div`
  border: ${borderTokens.default};
  border-radius: ${radius.xl};
  overflow: hidden;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 100px 80px 80px 100px;
  gap: ${space[2]};
  padding: ${space[2]} ${space[4]};
  background: ${neutral[50]};
  border-bottom: ${borderTokens.default};
  font-family: ${fontFamily.sans};
  font-size: 11px;
  font-weight: 600;
  color: ${neutral[500]};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 100px 80px 80px 100px;
  gap: ${space[2]};
  align-items: center;
  padding: ${space[2.5]} ${space[4]};
  border-bottom: 1px solid ${neutral[100]};
  background: ${color.bg};
  animation: ${fadeIn} ${duration.normal} ease;
  @media ${reducedMotion} { animation: none; }

  &:last-child { border-bottom: none; }
  &:hover { background: ${neutral[50]}; }
`;

const CellPrimary = styled.div`
  font-family: ${fontFamily.sans};
  font-size: ${t.captionSm.size};
  font-weight: 500;
  color: ${color.text};
`;

const CellMeta = styled.div`
  font-size: 11px;
  color: ${color.textMuted};
  margin-top: 1px;
`;

const CellText = styled.div`
  font-size: ${t.captionSm.size};
  color: ${color.text};
`;

const LinkBtn = styled.button`
  display: flex;
  align-items: center;
  gap: ${space[1]};
  padding: ${space[1]} ${space[2]};
  border-radius: ${radius.md};
  border: 1px solid ${neutral[200]};
  background: ${color.bg};
  color: ${color.text};
  font-family: ${fontFamily.sans};
  font-size: 11px;
  cursor: pointer;
  transition: all ${duration.fast} ease;

  &:hover { border-color: ${accent[300]}; background: ${accent[50]}; }
  &:focus-visible { ${focusRingStyle} }

  svg { width: 12px; height: 12px; }
`;

const DownloadBtn = styled(LinkBtn)`
  border-color: ${accent[300]};
  background: ${accent[50]};
  color: ${accent[700]};
  &:hover { background: ${accent[100]}; }
`;

const EmptyState = styled.div`
  padding: ${space[12]} ${space[4]};
  text-align: center;
  color: ${color.textMuted};
  font-size: ${t.bodySm.size};
`;

// ════════════════════════════════════════════════════════════════════════
// Config
// ════════════════════════════════════════════════════════════════════════

const STATUS_BADGE: Record<FilingPackageStatus, { variant: 'neutral' | 'warning' | 'success' | 'error'; label: string }> = {
  queued:   { variant: 'neutral', label: 'Queued' },
  building: { variant: 'warning', label: 'Building' },
  complete: { variant: 'success', label: 'Complete' },
  failed:   { variant: 'error',   label: 'Failed' },
};

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

const ExportCenter: React.FC = () => {
  const { currentOrgId } = useRoleContext();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<FilingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FilingPackageStatus[]>([]);
  const [productFilter, setProductFilter] = useState('');
  const [search, setSearch] = useState('');

  // Fetch packages
  useEffect(() => {
    if (!currentOrgId) return;
    setLoading(true);
    listFilingPackages(currentOrgId, {
      status: statusFilter.length > 0 ? statusFilter : undefined,
    })
      .then(setPackages)
      .catch(err => logger.warn(LOG_CATEGORIES.DATA, 'Failed to load filing packages', { error: String(err) }))
      .finally(() => setLoading(false));
  }, [currentOrgId, statusFilter]);

  const toggleStatus = useCallback((s: FilingPackageStatus) => {
    setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }, []);

  const uniqueProducts = useMemo(() => {
    const map = new Map<string, string>();
    packages.forEach(p => {
      if (p.productId && p.productName) map.set(p.productId, p.productName);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [packages]);

  const filtered = useMemo(() => {
    let result = packages;
    if (productFilter) result = result.filter(p => p.productId === productFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.changeSetName.toLowerCase().includes(q) ||
        (p.stateCode && p.stateCode.toLowerCase().includes(q)) ||
        (p.stateName && p.stateName.toLowerCase().includes(q)) ||
        (p.productName && p.productName.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [packages, search, productFilter]);

  const handleDownload = useCallback(async (pkg: FilingPackage) => {
    if (!pkg.storagePath) return;
    try {
      const url = await getPackageDownloadUrl(pkg.storagePath);
      window.open(url, '_blank');
    } catch (err) {
      logger.warn(LOG_CATEGORIES.DATA, 'Download failed', { error: String(err) });
    }
  }, []);

  return (
    <PageShell>
      <MainNavigation />
      <PageBody>
        <Container>
          <PageHeader>
            <PageHeaderLeft>
              <PageTitle>Export Center</PageTitle>
            </PageHeaderLeft>
          </PageHeader>

          <FilterBar>
            <FilterLabel><FunnelIcon /> Status</FilterLabel>
            {(['queued', 'building', 'complete', 'failed'] as FilingPackageStatus[]).map(s => (
              <Chip key={s} $active={statusFilter.includes(s)} onClick={() => toggleStatus(s)}>
                {STATUS_BADGE[s].label}
              </Chip>
            ))}
            {uniqueProducts.length > 0 && (
              <ProductSelect
                value={productFilter}
                onChange={e => setProductFilter(e.target.value)}
                aria-label="Filter by product"
              >
                <option value="">All Products</option>
                {uniqueProducts.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </ProductSelect>
            )}
            <SearchBox>
              <MagnifyingGlassIcon />
              <SearchInput
                placeholder="Search packages…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="Search filing packages"
              />
            </SearchBox>
          </FilterBar>

          <Table>
            <TableHeader>
              <div>Package</div>
              <div>Product</div>
              <div>Change Set</div>
              <div>Status</div>
              <div>Artifacts</div>
              <div>Effective</div>
              <div>Actions</div>
            </TableHeader>

            {loading && <EmptyState>Loading filing packages…</EmptyState>}

            {!loading && filtered.length === 0 && (
              <EmptyState>No filing packages match current filters</EmptyState>
            )}

            {filtered.map(pkg => {
              const sb = STATUS_BADGE[pkg.status];
              return (
                <Row key={pkg.id}>
                  <div>
                    <CellPrimary>
                      {pkg.scope === 'state' && pkg.stateName
                        ? `${pkg.stateName} (${pkg.stateCode})`
                        : 'Full Package'}
                    </CellPrimary>
                    <CellMeta>
                      {pkg.exhibits.length} exhibit{pkg.exhibits.length !== 1 ? 's' : ''}
                      {pkg.buildDurationMs ? ` · ${(pkg.buildDurationMs / 1000).toFixed(1)}s` : ''}
                    </CellMeta>
                  </div>

                  <CellText>{pkg.productName || '—'}</CellText>

                  <div>
                    <CellText>{pkg.changeSetName}</CellText>
                  </div>

                  <Badge $variant={sb.variant} $size="sm">{sb.label}</Badge>

                  <CellText>{pkg.artifactCount}</CellText>

                  <CellText>{pkg.effectiveStart || '—'}</CellText>

                  <div style={{ display: 'flex', gap: space[1] }}>
                    <LinkBtn
                      onClick={() => navigate(`/changesets/${pkg.changeSetId}`)}
                      aria-label="Go to change set"
                    >
                      <LinkIcon /> CS
                    </LinkBtn>
                    {pkg.status === 'complete' && pkg.storagePath && (
                      <DownloadBtn onClick={() => handleDownload(pkg)} aria-label="Download package">
                        <DocumentArrowDownIcon />
                      </DownloadBtn>
                    )}
                  </div>
                </Row>
              );
            })}
          </Table>
        </Container>
      </PageBody>
    </PageShell>
  );
};

export default ExportCenter;
