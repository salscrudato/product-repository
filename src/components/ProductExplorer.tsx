/**
 * Product Explorer – Dependency-driven navigation
 *
 * Provides a two-panel layout:
 *  LEFT  – hierarchical tree browser (Products → Coverages → Forms/Rules)
 *  RIGHT – version-aware detail panel with upstream/downstream, where-used,
 *          impact analysis, version picker, compare-to-published, and deep-link actions.
 *
 * Deep-linking support: /product-explorer?type={nodeType}&id={nodeId}&pid={parentId}
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, collectionGroup } from 'firebase/firestore';
import { db } from '../firebase';
import styled, { keyframes, css } from 'styled-components';
import {
  MapIcon,
  ChevronRightIcon,
  CubeIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  BoltIcon,
  GlobeAltIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
  ArrowsPointingOutIcon,
  ArrowsRightLeftIcon,
  FolderIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import {
  CubeIcon as CubeSolid,
  ShieldCheckIcon as ShieldSolid,
  DocumentTextIcon as DocSolid,
} from '@heroicons/react/24/solid';
import MainNavigation from './ui/Navigation';
import { PageContainer, PageContent } from './ui/PageContainer';
import { Breadcrumb } from './ui/Breadcrumb';
import { useRoleContext } from '../context/RoleContext';
import { versioningService } from '../services/versioningService';
import {
  ExplorerNode,
  ExplorerNodeType,
  DependencyGraph,
  ImpactResult,
  loadProducts,
  loadCoverages,
  loadForms,
  loadRatePrograms,
  loadFormUses,
  loadStatePrograms,
  getDependencyGraph,
  computeImpact,
} from '../services/dependencyService';
import {
  color,
  neutral,
  accent,
  space,
  radius,
  fontFamily,
  type as typeScale,
  shadow,
  border as borderTokens,
  duration,
  easing,
  transition,
  focusRingStyle,
  reducedMotion,
  semantic,
  layout,
} from '../ui/tokens';
import type { VersionedDocument, VersionStatus } from '../types/versioning';
import { VERSION_STATUS_CONFIG } from '../types/versioning';
import { formatVersionNumber } from '../utils/versioningUtils';

// ════════════════════════════════════════════════════════════════════════
// Animations
// ════════════════════════════════════════════════════════════════════════

const fadeIn = keyframes`from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}`;
const spin = keyframes`0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}`;
const slideInRight = keyframes`from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}`;

// ════════════════════════════════════════════════════════════════════════
// Layout
// ════════════════════════════════════════════════════════════════════════

const ExplorerLayout = styled.div`
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: ${space[5]};
  min-height: calc(100vh - 200px);
  @media (max-width: 1024px) { grid-template-columns: 1fr; }
`;

const TreePanel = styled.div`
  background: ${color.bg};
  border: ${borderTokens.default};
  border-radius: ${radius.xl};
  box-shadow: ${shadow.card};
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const TreeHeader = styled.div`
  padding: ${space[4]} ${space[5]};
  border-bottom: ${borderTokens.default};
  display: flex;
  flex-direction: column;
  gap: ${space[3]};
`;

const TreeTitle = styled.h3`
  margin: 0;
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.headingSm.size};
  font-weight: ${typeScale.headingSm.weight};
  color: ${color.text};
  display: flex;
  align-items: center;
  gap: ${space[2]};
  svg { width: 18px; height: 18px; color: ${accent[500]}; }
`;

const SearchBox = styled.div`
  position: relative;
  svg { position: absolute; left: ${space[3]}; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: ${neutral[400]}; }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: ${space[2]} ${space[3]} ${space[2]} ${space[9]};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.bodySm.size};
  border: ${borderTokens.default};
  border-radius: ${radius.md};
  background: ${neutral[50]};
  color: ${color.text};
  outline: none;
  transition: border-color ${transition.fast}, box-shadow ${transition.fast};
  box-sizing: border-box;
  &:focus { border-color: ${accent[500]}; box-shadow: 0 0 0 3px ${accent[500]}40; }
  &::placeholder { color: ${neutral[400]}; }
`;

const TreeBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${space[2]};
`;

const TreeSection = styled.div`
  margin-bottom: ${space[1]};
`;

const TreeSectionHeader = styled.button<{ $expanded?: boolean }>`
  all: unset;
  display: flex;
  align-items: center;
  gap: ${space[2]};
  width: 100%;
  padding: ${space[2]} ${space[3]};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.labelSm.size};
  font-weight: 600;
  color: ${neutral[500]};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  cursor: pointer;
  border-radius: ${radius.md};
  box-sizing: border-box;
  transition: color ${transition.fast}, background ${transition.fast};
  &:hover { color: ${accent[600]}; background: ${accent[50]}; }
  &:focus-visible { ${focusRingStyle} }
  svg:first-child {
    width: 14px; height: 14px;
    transform: rotate(${({ $expanded }) => $expanded ? '90deg' : '0deg'});
    transition: transform ${transition.fast};
  }
`;

const TreeItem = styled.button<{ $selected?: boolean; $depth?: number }>`
  all: unset;
  display: flex;
  align-items: center;
  gap: ${space[2]};
  width: 100%;
  padding: ${space[2]} ${space[3]};
  padding-left: ${({ $depth = 0 }) => `${12 + $depth * 16}px`};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.bodySm.size};
  color: ${({ $selected }) => $selected ? accent[700] : color.text};
  cursor: pointer;
  border-radius: ${radius.md};
  box-sizing: border-box;
  transition: all ${transition.fast};
  background: ${({ $selected }) => $selected ? accent[50] : 'transparent'};
  border-left: 2px solid ${({ $selected }) => $selected ? accent[500] : 'transparent'};

  &:hover { background: ${({ $selected }) => $selected ? accent[50] : neutral[50]}; }
  &:focus-visible { ${focusRingStyle} }

  svg { width: 16px; height: 16px; flex-shrink: 0; color: ${({ $selected }) => $selected ? accent[500] : neutral[400]}; }
`;

const TreeItemLabel = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TreeItemBadge = styled.span<{ $color?: string }>`
  font-size: ${typeScale.captionSm.size};
  font-weight: 500;
  padding: 1px ${space[2]};
  border-radius: ${radius.full};
  background: ${({ $color }) => $color ? `${$color}15` : neutral[100]};
  color: ${({ $color }) => $color || neutral[500]};
  flex-shrink: 0;
`;

// ════════════════════════════════════════════════════════════════════════
// Detail Panel
// ════════════════════════════════════════════════════════════════════════

const DetailPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space[5]};
  animation: ${slideInRight} ${duration.normal} ${easing.out};
`;

const DetailCard = styled.div<{ $delay?: number }>`
  background: ${color.bg};
  border: ${borderTokens.default};
  border-radius: ${radius.xl};
  box-shadow: ${shadow.card};
  padding: ${space[6]};
  animation: ${fadeIn} ${duration.normal} ${easing.out} ${({ $delay }) => ($delay ?? 0) * 60}ms backwards;
  @media ${reducedMotion} { animation: none; }
`;

const DetailHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${space[4]};
  margin-bottom: ${space[5]};
`;

const DetailTitle = styled.h2`
  margin: 0;
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.headingLg.size};
  font-weight: ${typeScale.headingLg.weight};
  letter-spacing: ${typeScale.headingLg.letterSpacing};
  color: ${color.text};
  display: flex;
  align-items: center;
  gap: ${space[3]};
  svg { width: 24px; height: 24px; color: ${accent[500]}; }
`;

const DetailMeta = styled.div`
  display: flex;
  gap: ${space[2]};
  flex-wrap: wrap;
  margin-bottom: ${space[4]};
`;

const MetaBadge = styled.span<{ $variant?: 'accent' | 'success' | 'warning' | 'neutral' }>`
  display: inline-flex;
  align-items: center;
  gap: ${space[1]};
  padding: ${space[1]} ${space[2.5]};
  border-radius: ${radius.full};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.captionSm.size};
  font-weight: 500;
  ${({ $variant = 'neutral' }) => {
    switch ($variant) {
      case 'accent':  return css`background: ${accent[50]}; color: ${accent[700]}; border: 1px solid ${accent[200]};`;
      case 'success': return css`background: ${semantic.successLight}; color: ${semantic.successDark}; border: 1px solid ${semantic.success}33;`;
      case 'warning': return css`background: ${semantic.warningLight}; color: ${semantic.warningDark}; border: 1px solid ${semantic.warning}33;`;
      default:        return css`background: ${neutral[100]}; color: ${neutral[600]}; border: 1px solid ${neutral[200]};`;
    }
  }}
  svg { width: 12px; height: 12px; }
`;

const ActionBar = styled.div`
  display: flex;
  gap: ${space[2]};
  flex-wrap: wrap;
`;

const ActionBtn = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  all: unset;
  display: inline-flex;
  align-items: center;
  gap: ${space[1.5]};
  padding: ${space[2]} ${space[3]};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.caption.size};
  font-weight: 500;
  border-radius: ${radius.md};
  cursor: pointer;
  transition: all ${transition.fast};
  ${({ $variant = 'secondary' }) => $variant === 'primary'
    ? css`
        background: ${accent[500]}; color: white;
        &:hover { background: ${accent[600]}; }
      `
    : css`
        background: ${neutral[100]}; color: ${neutral[700]};
        border: 1px solid ${neutral[200]};
        &:hover { background: ${accent[50]}; color: ${accent[700]}; border-color: ${accent[200]}; }
      `}
  &:focus-visible { ${focusRingStyle} }
  svg { width: 14px; height: 14px; }
`;

const SectionTitle = styled.h3`
  margin: 0 0 ${space[3]};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.headingSm.size};
  font-weight: ${typeScale.headingSm.weight};
  color: ${color.text};
  display: flex;
  align-items: center;
  gap: ${space[2]};
  svg { width: 16px; height: 16px; color: ${accent[500]}; }
`;

const DepList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space[1.5]};
`;

const DepItem = styled.button`
  all: unset;
  display: flex;
  align-items: center;
  gap: ${space[2]};
  padding: ${space[2]} ${space[3]};
  border-radius: ${radius.md};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.bodySm.size};
  color: ${color.text};
  cursor: pointer;
  transition: all ${transition.fast};
  border: 1px solid transparent;
  box-sizing: border-box;

  &:hover { background: ${accent[50]}; border-color: ${accent[200]}; }
  &:focus-visible { ${focusRingStyle} }

  svg { width: 16px; height: 16px; color: ${neutral[400]}; flex-shrink: 0; }
`;

const DepItemLabel = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${space[12]} ${space[6]};
  text-align: center;
  color: ${neutral[400]};
  font-family: ${fontFamily.sans};
  svg { width: 48px; height: 48px; margin-bottom: ${space[4]}; }
  p { margin: 0; font-size: ${typeScale.bodySm.size}; max-width: 320px; }
`;

const EmptyTitle = styled.h3`
  margin: 0 0 ${space[2]};
  font-size: ${typeScale.headingSm.size};
  font-weight: 600;
  color: ${neutral[500]};
`;

const Spinner = styled.div`
  width: 32px; height: 32px; border-radius: 50%;
  border: 3px solid ${neutral[200]}; border-top-color: ${accent[500]};
  animation: ${spin} 0.8s linear infinite;
  margin: ${space[6]} auto;
`;

// ════════════════════════════════════════════════════════════════════════
// Version picker (inline)
// ════════════════════════════════════════════════════════════════════════

const VersionPickerInline = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[2]};
  flex-wrap: wrap;
`;

const VersionChip = styled.button<{ $selected?: boolean; $statusColor?: string }>`
  all: unset;
  display: inline-flex;
  align-items: center;
  gap: ${space[1]};
  padding: ${space[1]} ${space[2.5]};
  border-radius: ${radius.full};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.captionSm.size};
  font-weight: 600;
  cursor: pointer;
  transition: all ${transition.fast};
  ${({ $selected, $statusColor }) => $selected
    ? css`
        background: ${$statusColor || accent[500]};
        color: white;
        box-shadow: 0 0 0 2px ${$statusColor || accent[500]}40;
      `
    : css`
        background: ${$statusColor ? `${$statusColor}15` : neutral[100]};
        color: ${$statusColor || neutral[600]};
        &:hover { background: ${$statusColor ? `${$statusColor}25` : neutral[200]}; }
      `}
  &:focus-visible { ${focusRingStyle} }
`;

// ════════════════════════════════════════════════════════════════════════
// Impact section
// ════════════════════════════════════════════════════════════════════════

const ImpactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: ${space[3]};
`;

const ImpactStat = styled.div<{ $color?: string }>`
  background: ${({ $color }) => $color ? `${$color}08` : neutral[50]};
  border: 1px solid ${({ $color }) => $color ? `${$color}25` : neutral[200]};
  border-radius: ${radius.lg};
  padding: ${space[4]};
  text-align: center;
`;

const ImpactValue = styled.div`
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.displaySm.size};
  font-weight: 700;
  color: ${color.text};
  line-height: 1;
  margin-bottom: ${space[1]};
`;

const ImpactLabel = styled.div`
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.captionSm.size};
  color: ${color.textMuted};
  font-weight: 500;
`;

const PageHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${space[5]};
`;

const PageTitleText = styled.h1`
  margin: 0;
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.displaySm.size};
  font-weight: ${typeScale.displaySm.weight};
  letter-spacing: ${typeScale.displaySm.letterSpacing};
  color: ${color.text};
  display: flex;
  align-items: center;
  gap: ${space[3]};
  svg { width: 28px; height: 28px; color: ${accent[500]}; }
`;

const PageSubtitleText = styled.p`
  margin: ${space[1]} 0 0;
  font-size: ${typeScale.bodySm.size};
  color: ${color.textSecondary};
`;

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

const NODE_ICONS: Record<ExplorerNodeType, React.ReactNode> = {
  product: <CubeIcon />,
  coverage: <ShieldCheckIcon />,
  form: <DocumentTextIcon />,
  rule: <BoltIcon />,
  rateProgram: <ClipboardDocumentListIcon />,
  table: <FolderIcon />,
  stateProgram: <GlobeAltIcon />,
  endorsement: <DocumentDuplicateIcon />,
};

const NODE_LABELS: Record<ExplorerNodeType, string> = {
  product: 'Product',
  coverage: 'Coverage',
  form: 'Form',
  rule: 'Rule',
  rateProgram: 'Rate Program',
  table: 'Table',
  stateProgram: 'State Program',
  endorsement: 'Endorsement',
};

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

export default function ProductExplorer() {
  const { currentOrgId: orgId } = useRoleContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tree data
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ExplorerNode[]>([]);
  const [forms, setForms] = useState<ExplorerNode[]>([]);
  const [coveragesByProduct, setCoveragesByProduct] = useState<Record<string, ExplorerNode[]>>({});
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['products', 'forms']));
  const [searchQuery, setSearchQuery] = useState('');

  // Selection
  const [selectedNode, setSelectedNode] = useState<ExplorerNode | null>(null);

  // Detail panel data
  const [depGraph, setDepGraph] = useState<DependencyGraph | null>(null);
  const [impact, setImpact] = useState<ImpactResult | null>(null);
  const [versions, setVersions] = useState<VersionedDocument<unknown>[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ──────────────────────────────────────────────────────────────────────
  // Load tree data
  // ──────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        setLoading(true);
        const [prods, frms] = await Promise.all([
          loadProducts(orgId),
          loadForms(orgId),
        ]);
        setProducts(prods);
        setForms(frms);
      } catch (err) {
        console.error('Explorer: failed to load tree data', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId]);

  // ──────────────────────────────────────────────────────────────────────
  // Expand product → load coverages
  // ──────────────────────────────────────────────────────────────────────

  const toggleProduct = useCallback(async (productId: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });

    if (!coveragesByProduct[productId] && orgId) {
      const covs = await loadCoverages(orgId, productId);
      setCoveragesByProduct(prev => ({ ...prev, [productId]: covs }));
    }
  }, [orgId, coveragesByProduct]);

  // ──────────────────────────────────────────────────────────────────────
  // Select a node → load deps, versions, impact
  // ──────────────────────────────────────────────────────────────────────

  const selectNode = useCallback(async (node: ExplorerNode) => {
    setSelectedNode(node);
    setDepGraph(null);
    setImpact(null);
    setVersions([]);
    setSelectedVersionId(null);

    // Update URL for deep-linking
    const params = new URLSearchParams();
    params.set('type', node.type);
    params.set('id', node.id);
    if (node.parentId) params.set('pid', node.parentId);
    setSearchParams(params, { replace: true });

    if (!orgId) return;
    setDetailLoading(true);

    try {
      // Load dependency graph
      const graph = await getDependencyGraph(orgId, node);
      setDepGraph(graph);

      // Load impact analysis
      const impactResult = await computeImpact(orgId, node, products);
      setImpact(impactResult);

      // Load versions (if versioned entity)
      const versionedTypes: ExplorerNodeType[] = ['product', 'coverage', 'form', 'rule', 'rateProgram', 'table'];
      if (versionedTypes.includes(node.type)) {
        try {
          const vers = await versioningService.getVersions(
            orgId,
            node.type as any,
            node.id,
            node.parentId,
          );
          setVersions(vers);
          // Select latest version by default
          if (vers.length > 0) {
            setSelectedVersionId(vers[0].id);
          }
        } catch {
          // Versions may not exist for all entities
        }
      }
    } catch (err) {
      console.error('Explorer: failed to load detail data', err);
    } finally {
      setDetailLoading(false);
    }
  }, [orgId, products, setSearchParams]);

  // ──────────────────────────────────────────────────────────────────────
  // Restore from deep-link on mount
  // ──────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (loading) return;
    const type = searchParams.get('type') as ExplorerNodeType | null;
    const id = searchParams.get('id');
    const pid = searchParams.get('pid');

    if (!type || !id) return;

    // Find the node in the tree
    let found: ExplorerNode | null = null;

    if (type === 'product') {
      found = products.find(p => p.id === id) || null;
    } else if (type === 'form') {
      found = forms.find(f => f.id === id) || null;
    } else if (type === 'coverage' && pid) {
      const covs = coveragesByProduct[pid];
      if (covs) {
        found = covs.find(c => c.id === id) || null;
      } else if (orgId) {
        // Load coverages for this product to find the node
        loadCoverages(orgId, pid).then(covs => {
          setCoveragesByProduct(prev => ({ ...prev, [pid]: covs }));
          setExpandedProducts(prev => new Set(prev).add(pid));
          const node = covs.find(c => c.id === id);
          if (node) selectNode(node);
        });
        return;
      }
    }

    if (found && (!selectedNode || selectedNode.id !== found.id)) {
      selectNode(found);
      // Auto-expand parent if needed
      if (pid) setExpandedProducts(prev => new Set(prev).add(pid));
    }
  }, [loading, searchParams, products, forms, coveragesByProduct, orgId]);

  // ──────────────────────────────────────────────────────────────────────
  // Search filtering
  // ──────────────────────────────────────────────────────────────────────

  const searchLower = searchQuery.toLowerCase();

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    return products.filter(p => p.name.toLowerCase().includes(searchLower));
  }, [products, searchLower, searchQuery]);

  const filteredForms = useMemo(() => {
    if (!searchQuery) return forms;
    return forms.filter(f => f.name.toLowerCase().includes(searchLower));
  }, [forms, searchLower, searchQuery]);

  // ──────────────────────────────────────────────────────────────────────
  // Navigation actions
  // ──────────────────────────────────────────────────────────────────────

  const openInProduct360 = useCallback(() => {
    if (!selectedNode) return;
    if (selectedNode.type === 'product') {
      navigate(`/product/${selectedNode.id}/360`);
    }
  }, [selectedNode, navigate]);

  const openInChangeSet = useCallback(() => {
    if (!selectedNode) return;
    navigate(`/changesets?artifact=${selectedNode.type}:${selectedNode.id}`);
  }, [selectedNode, navigate]);

  const openFormDetail = useCallback(() => {
    if (!selectedNode || selectedNode.type !== 'form') return;
    navigate(`/forms/${selectedNode.id}`);
  }, [selectedNode, navigate]);

  // ──────────────────────────────────────────────────────────────────────
  // Render tree
  // ──────────────────────────────────────────────────────────────────────

  const renderTree = () => {
    if (loading) return <Spinner />;

    return (
      <>
        {/* Products section */}
        <TreeSection>
          <TreeSectionHeader
            $expanded={expandedSections.has('products')}
            onClick={() => setExpandedSections(prev => {
              const next = new Set(prev);
              next.has('products') ? next.delete('products') : next.add('products');
              return next;
            })}
          >
            <ChevronRightIcon />
            <CubeIcon style={{ width: 14, height: 14 }} />
            Products ({filteredProducts.length})
          </TreeSectionHeader>

          {expandedSections.has('products') && filteredProducts.map(product => (
            <React.Fragment key={product.id}>
              <TreeItem
                $selected={selectedNode?.id === product.id}
                $depth={1}
                onClick={() => {
                  selectNode(product);
                  toggleProduct(product.id);
                }}
              >
                {expandedProducts.has(product.id)
                  ? <CubeSolid style={{ width: 16, height: 16 }} />
                  : <CubeIcon />}
                <TreeItemLabel>{product.name}</TreeItemLabel>
                {product.meta.coverageCount != null && (
                  <TreeItemBadge>{product.meta.coverageCount as number}</TreeItemBadge>
                )}
              </TreeItem>

              {expandedProducts.has(product.id) && (
                coveragesByProduct[product.id]?.filter(c =>
                  !searchQuery || c.name.toLowerCase().includes(searchLower)
                ).map(cov => (
                  <TreeItem
                    key={cov.id}
                    $selected={selectedNode?.id === cov.id}
                    $depth={2}
                    onClick={() => selectNode(cov)}
                  >
                    <ShieldCheckIcon />
                    <TreeItemLabel>{cov.name}</TreeItemLabel>
                    {cov.meta.coverageKind && cov.meta.coverageKind !== 'coverage' && (
                      <TreeItemBadge $color={accent[500]}>
                        {cov.meta.coverageKind as string}
                      </TreeItemBadge>
                    )}
                  </TreeItem>
                ))
              )}
            </React.Fragment>
          ))}
        </TreeSection>

        {/* Forms section */}
        <TreeSection>
          <TreeSectionHeader
            $expanded={expandedSections.has('forms')}
            onClick={() => setExpandedSections(prev => {
              const next = new Set(prev);
              next.has('forms') ? next.delete('forms') : next.add('forms');
              return next;
            })}
          >
            <ChevronRightIcon />
            <DocumentTextIcon style={{ width: 14, height: 14 }} />
            Forms ({filteredForms.length})
          </TreeSectionHeader>

          {expandedSections.has('forms') && filteredForms.map(form => (
            <TreeItem
              key={form.id}
              $selected={selectedNode?.id === form.id}
              $depth={1}
              onClick={() => selectNode(form)}
            >
              <DocumentTextIcon />
              <TreeItemLabel>{form.name}</TreeItemLabel>
              {form.meta.formNumber && (
                <TreeItemBadge>{form.meta.formNumber as string}</TreeItemBadge>
              )}
            </TreeItem>
          ))}
        </TreeSection>
      </>
    );
  };

  // ──────────────────────────────────────────────────────────────────────
  // Render detail panel
  // ──────────────────────────────────────────────────────────────────────

  const renderDetailPanel = () => {
    if (!selectedNode) {
      return (
        <DetailCard>
          <EmptyState>
            <MapIcon />
            <EmptyTitle>Select an artifact</EmptyTitle>
            <p>Choose a product, coverage, or form from the tree to view its dependencies, versions, and impact.</p>
          </EmptyState>
        </DetailCard>
      );
    }

    return (
      <DetailPanel key={selectedNode.id}>
        {/* Header card */}
        <DetailCard $delay={0}>
          <DetailHeader>
            <div>
              <DetailTitle>
                {NODE_ICONS[selectedNode.type]}
                {selectedNode.name}
              </DetailTitle>
              {selectedNode.parentName && (
                <PageSubtitleText>
                  Part of {selectedNode.parentName}
                </PageSubtitleText>
              )}
            </div>
          </DetailHeader>

          <DetailMeta>
            <MetaBadge $variant="accent">{NODE_LABELS[selectedNode.type]}</MetaBadge>
            {selectedNode.meta.category && (
              <MetaBadge>{selectedNode.meta.category as string}</MetaBadge>
            )}
            {selectedNode.meta.formNumber && (
              <MetaBadge>{selectedNode.meta.formNumber as string}</MetaBadge>
            )}
            {selectedNode.meta.coverageKind && selectedNode.meta.coverageKind !== 'coverage' && (
              <MetaBadge $variant="warning">{selectedNode.meta.coverageKind as string}</MetaBadge>
            )}
            {selectedNode.meta.status && (
              <MetaBadge $variant="success">{selectedNode.meta.status as string}</MetaBadge>
            )}
          </DetailMeta>

          <ActionBar>
            {selectedNode.type === 'product' && (
              <ActionBtn $variant="primary" onClick={openInProduct360}>
                <EyeIcon /> View in Product 360
              </ActionBtn>
            )}
            {selectedNode.type === 'form' && (
              <ActionBtn $variant="primary" onClick={openFormDetail}>
                <ArrowTopRightOnSquareIcon /> Open Form Detail
              </ActionBtn>
            )}
            <ActionBtn onClick={openInChangeSet}>
              <ClipboardDocumentListIcon /> Open in Change Set
            </ActionBtn>
            <ActionBtn onClick={() => {
              const url = `${window.location.origin}/product-explorer?type=${selectedNode.type}&id=${selectedNode.id}${selectedNode.parentId ? `&pid=${selectedNode.parentId}` : ''}`;
              navigator.clipboard.writeText(url);
            }}>
              <DocumentDuplicateIcon /> Copy Link
            </ActionBtn>
          </ActionBar>
        </DetailCard>

        {/* Version picker */}
        {versions.length > 0 && (
          <DetailCard $delay={1}>
            <SectionTitle>
              <ArrowsRightLeftIcon /> Version History
            </SectionTitle>
            <VersionPickerInline>
              {versions.map(v => {
                const cfg = VERSION_STATUS_CONFIG[v.status];
                return (
                  <VersionChip
                    key={v.id}
                    $selected={v.id === selectedVersionId}
                    $statusColor={cfg.color}
                    onClick={() => setSelectedVersionId(v.id)}
                    title={`${cfg.label} – ${v.summary || ''}`}
                  >
                    v{v.versionNumber} – {cfg.label}
                  </VersionChip>
                );
              })}
            </VersionPickerInline>
            {selectedVersionId && (() => {
              const sel = versions.find(v => v.id === selectedVersionId);
              const pub = versions.find(v => v.status === 'published');
              if (!sel) return null;
              return (
                <div style={{ marginTop: space[3] }}>
                  <div style={{ display: 'flex', gap: space[3], flexWrap: 'wrap' }}>
                    <MetaBadge $variant={sel.status === 'published' ? 'success' : sel.status === 'draft' ? 'neutral' : 'warning'}>
                      {VERSION_STATUS_CONFIG[sel.status].label}
                    </MetaBadge>
                    {sel.effectiveStart && <MetaBadge>Effective: {sel.effectiveStart}</MetaBadge>}
                    {sel.summary && <MetaBadge>{sel.summary}</MetaBadge>}
                  </div>
                  {pub && sel.id !== pub.id && (
                    <ActionBtn
                      style={{ marginTop: space[2] }}
                      onClick={() => {
                        navigate(`/product-explorer?type=${selectedNode.type}&id=${selectedNode.id}${selectedNode.parentId ? `&pid=${selectedNode.parentId}` : ''}&compare=${pub.id}&to=${sel.id}`);
                      }}
                    >
                      <ArrowsRightLeftIcon /> Compare to Published
                    </ActionBtn>
                  )}
                </div>
              );
            })()}
          </DetailCard>
        )}

        {/* Dependency graph */}
        {detailLoading ? (
          <DetailCard $delay={2}><Spinner /></DetailCard>
        ) : depGraph && (
          <>
            {/* Upstream */}
            {depGraph.upstream.length > 0 && (
              <DetailCard $delay={2}>
                <SectionTitle><ArrowUpIcon /> Upstream ({depGraph.upstream.length})</SectionTitle>
                <DepList>
                  {depGraph.upstream.map(u => (
                    <DepItem key={u.id} onClick={() => selectNode(u)}>
                      {NODE_ICONS[u.type]}
                      <DepItemLabel>{u.name}</DepItemLabel>
                      <MetaBadge>{NODE_LABELS[u.type]}</MetaBadge>
                    </DepItem>
                  ))}
                </DepList>
              </DetailCard>
            )}

            {/* Downstream */}
            {depGraph.downstream.length > 0 && (
              <DetailCard $delay={3}>
                <SectionTitle><ArrowDownIcon /> Downstream ({depGraph.downstream.length})</SectionTitle>
                <DepList>
                  {depGraph.downstream.map(d => (
                    <DepItem key={`${d.type}-${d.id}`} onClick={() => selectNode(d)}>
                      {NODE_ICONS[d.type]}
                      <DepItemLabel>{d.name}</DepItemLabel>
                      <MetaBadge>{NODE_LABELS[d.type]}</MetaBadge>
                    </DepItem>
                  ))}
                </DepList>
              </DetailCard>
            )}

            {/* Where used */}
            {depGraph.whereUsed.length > 0 && (
              <DetailCard $delay={4}>
                <SectionTitle><ArrowsPointingOutIcon /> Where Used ({depGraph.whereUsed.length})</SectionTitle>
                <DepList>
                  {depGraph.whereUsed.map(w => (
                    <DepItem key={`${w.type}-${w.id}`} onClick={() => selectNode(w)}>
                      {NODE_ICONS[w.type]}
                      <DepItemLabel>
                        {w.name}
                        {w.parentName && <span style={{ color: neutral[400], fontSize: '12px', marginLeft: space[1] }}>in {w.parentName}</span>}
                      </DepItemLabel>
                      <MetaBadge>{NODE_LABELS[w.type]}</MetaBadge>
                    </DepItem>
                  ))}
                </DepList>
              </DetailCard>
            )}
          </>
        )}

        {/* Impact analysis */}
        {impact && impact.totalImpacted > 0 && (
          <DetailCard $delay={5}>
            <SectionTitle><ExclamationTriangleIcon /> Impact Analysis</SectionTitle>
            <ImpactGrid>
              <ImpactStat $color={accent[500]}>
                <ImpactValue>{impact.impactedProducts.length}</ImpactValue>
                <ImpactLabel>Products</ImpactLabel>
              </ImpactStat>
              <ImpactStat $color={semantic.warning}>
                <ImpactValue>{impact.impactedCoverages.length}</ImpactValue>
                <ImpactLabel>Coverages</ImpactLabel>
              </ImpactStat>
              <ImpactStat $color={semantic.info}>
                <ImpactValue>{impact.impactedStates.length}</ImpactValue>
                <ImpactLabel>States</ImpactLabel>
              </ImpactStat>
              <ImpactStat $color={semantic.success}>
                <ImpactValue>{impact.impactedForms.length}</ImpactValue>
                <ImpactLabel>Forms</ImpactLabel>
              </ImpactStat>
            </ImpactGrid>

            {/* Impacted items list */}
            {impact.impactedProducts.length > 0 && (
              <div style={{ marginTop: space[4] }}>
                <div style={{ fontSize: typeScale.caption.size, fontWeight: 600, color: neutral[500], marginBottom: space[2] }}>
                  Impacted Products
                </div>
                <DepList>
                  {impact.impactedProducts.map(p => (
                    <DepItem key={p.id} onClick={() => selectNode(p)}>
                      <CubeIcon />
                      <DepItemLabel>{p.name}</DepItemLabel>
                    </DepItem>
                  ))}
                </DepList>
              </div>
            )}

            {impact.impactedStates.length > 0 && (
              <div style={{ marginTop: space[4] }}>
                <div style={{ fontSize: typeScale.caption.size, fontWeight: 600, color: neutral[500], marginBottom: space[2] }}>
                  Impacted States
                </div>
                <DepList>
                  {impact.impactedStates.map(s => (
                    <DepItem key={`${s.type}-${s.id}`} onClick={() => selectNode(s)}>
                      <GlobeAltIcon />
                      <DepItemLabel>{s.name}</DepItemLabel>
                    </DepItem>
                  ))}
                </DepList>
              </div>
            )}
          </DetailCard>
        )}

        {/* Empty dependencies state */}
        {!detailLoading && depGraph
          && depGraph.upstream.length === 0
          && depGraph.downstream.length === 0
          && depGraph.whereUsed.length === 0
          && impact?.totalImpacted === 0 && (
          <DetailCard $delay={2}>
            <EmptyState>
              <ArrowsPointingOutIcon />
              <EmptyTitle>No dependencies found</EmptyTitle>
              <p>This artifact has no upstream or downstream dependencies tracked in the system.</p>
            </EmptyState>
          </DetailCard>
        )}
      </DetailPanel>
    );
  };

  // ──────────────────────────────────────────────────────────────────────
  // Main render
  // ──────────────────────────────────────────────────────────────────────

  return (
    <PageContainer withOverlay={true}>
      <MainNavigation />
      <PageContent>
        <Breadcrumb
          items={[
            { label: 'Home', path: '/' },
            { label: 'Explorer' },
          ]}
        />

        <PageHeaderRow>
          <div>
            <PageTitleText>
              <MapIcon /> Product Explorer
            </PageTitleText>
            <PageSubtitleText>
              Navigate dependencies, trace impact, and inspect versions across your product repository
            </PageSubtitleText>
          </div>
        </PageHeaderRow>

        <ExplorerLayout>
          {/* Left: Tree browser */}
          <TreePanel>
            <TreeHeader>
              <TreeTitle><FolderIcon /> Artifact Tree</TreeTitle>
              <SearchBox>
                <MagnifyingGlassIcon />
                <SearchInput
                  placeholder="Search products, coverages, forms…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </SearchBox>
            </TreeHeader>
            <TreeBody>
              {renderTree()}
            </TreeBody>
          </TreePanel>

          {/* Right: Detail panel */}
          <div>
            {renderDetailPanel()}
          </div>
        </ExplorerLayout>
      </PageContent>
    </PageContainer>
  );
}
