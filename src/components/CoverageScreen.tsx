// src/components/CoverageScreen.tsx
import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useParams, useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  query,
  where
} from 'firebase/firestore';
import type { Coverage } from '../types';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase';
import useCoverages from '@hooks/useCoverages';
import { useCoverageFormCounts } from '@hooks/useCoverageFormCounts';
import useDebounce from '@hooks/useDebounce';

import MainNavigation from '../components/ui/Navigation';
import { PageContainer, PageContent } from '../components/ui/PageContainer';
import EnhancedHeader from '../components/ui/EnhancedHeader';
import { neutral, radius, shadow, space } from '../ui/tokens';

import { LimitOptionsModal } from '../components/limits/LimitOptionsModal';
import { DeductibleOptionsModal } from '../components/deductibles/DeductibleOptionsModal';
import { CoverageCopilotWizard } from '../components/wizard/CoverageCopilotWizard';

// Lazy-load LinkFormsModal for better code splitting
const LinkFormsModal = lazy(() => import('./coverage/LinkFormsModal'));

import { SupportingClauses } from './tracing/SupportingClauses';
import { useRoleContext } from '../context/RoleContext';

import {
  PencilIcon,
  PlusIcon,
  TrashIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
  MapIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ScaleIcon,
  ClipboardDocumentCheckIcon,
  BanknotesIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/solid';

// Import styled components from extracted styles file (form-related moved to LinkFormsModal)
import {
  CoverageGrid,
  CoverageGroup,
  SubCoverageContainer,
  CommandBar,
  CommandBarLeft,
  CommandBarCenter,
  CommandBarRight,
  SearchWrapper,
  SearchInputStyled,
  SearchIconWrapper,
  ToolbarLabel,
  CopilotButton,
  ParentCoverageCard,
  CoverageCard,
  CardHeader,
  CardHeaderRow,
  CardTitleGroup,
  CardTitle,
  CardCode,
  CardActions,
  IconButton,
  CoverageTypeBadge,
  CardMetrics,
  MetricItem,
  MetricLabel,
  MetricBadge,
  ExpandButton,
  CoverageAttributesRow,
  AttributeChip,
  AttributeLabel,
  AttributeValue,
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateText,
  EmptyStateButton,
  SkeletonCard,
  SkeletonLine
} from './coverage/CoverageScreen.styles';

/* ---------- main component ---------- */
export default function CoverageScreen() {
  const { productId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentOrgId, user } = useRoleContext();
  const [clausesCoverageId, setClausesCoverageId] = useState<string | null>(null);

  // nested path => parentCoverageId
  const segs = location.pathname.split('/').filter(Boolean);
  const parentCoverageId = segs.length > 2 ? segs[segs.length - 1] : null;

  /* --- realtime coverages hook --- */
  const {
    coverages,
    loading: coveragesLoading,
    error: coveragesError,
    reload: reloadCoverages
  } = useCoverages(productId);

  /* --- form counts from junction table --- */
  const formCounts = useCoverageFormCounts(
    productId,
    coverages.map(c => c.id)
  );

  // Type definitions for internal use
  type ParentInfo = { id: string; name: string; coverageCode?: string | undefined };
  type CoverageWithSub = Coverage & { subCount: number; parentInfo: ParentInfo | null };
  type FormData = { id: string; downloadUrl: string | null; coverageIds: string[]; formName?: string; formNumber?: string; [key: string]: unknown };
  type RuleData = { id: string; ruleType?: string; targetId?: string; [key: string]: unknown };
  type PricingStepData = { id: string; coverages?: string[]; stepType?: string; [key: string]: unknown };

  /* --- derived sub-counts & filtering --- */
  const coveragesWithSub = useMemo((): CoverageWithSub[] => {
    const counts: Record<string, number> = {};
    const parentMap: Record<string, ParentInfo> = {};

    // Build parent map and count children
    coverages.forEach(c => {
      if (c.parentCoverageId) {
        counts[c.parentCoverageId] = (counts[c.parentCoverageId] || 0) + 1;
        // Find parent coverage for name lookup
        const parent = coverages.find(p => p.id === c.parentCoverageId);
        if (parent) {
          const info: ParentInfo = {
            id: parent.id,
            name: parent.name
          };
          if (parent.coverageCode) {
            info.coverageCode = parent.coverageCode;
          }
          parentMap[c.id] = info;
        }
      }
    });

    return coverages.map(c => ({
      ...c,
      subCount: counts[c.id] || 0,
      parentInfo: parentMap[c.id] || null
    }));
  }, [coverages]);

  /* ---------------- UI/Meta state ---------------- */
  const [metaLoading, setMetaLoading] = useState(true);
  const [forms, setForms] = useState<FormData[]>([]);
  const [rules, setRules] = useState<RuleData[]>([]);
  const [pricingSteps, setPricingSteps] = useState<PricingStepData[]>([]);
  const [productName, setProductName] = useState('');
  const [parentCoverageName, setParentCoverageName] = useState('');

  const [rawSearch, setRawSearch] = useState('');
  const searchQuery = useDebounce(rawSearch, 250);

  // Filter state - typeFilter is used in filtering logic, setter reserved for future UI
  const [typeFilter, _setTypeFilter] = useState<'all' | 'required' | 'optional'>('all');
  void _setTypeFilter; // Suppress unused variable warning

  // Tree expand/collapse state
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const toggleExpand = (id: string) => {
    setExpandedIds(ids =>
      ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]
    );
  };

  // Sub-coverage add button state - reserved for future use
  const [_addingParentId, _setAddingParentId] = useState<string | null>(null);
  void _addingParentId; void _setAddingParentId; // Suppress unused variable warning

  // Coverage Copilot wizard state
  const [copilotWizardOpen, setCopilotWizardOpen] = useState(false);
  const [editingCoverageForWizard, setEditingCoverageForWizard] = useState<Partial<Coverage> | null>(null);

  // Tree structure generation for proper parent-child rendering
  const treeStructure = useMemo(() => {
    const childrenMap: Record<string, CoverageWithSub[]> = {};
    const parentCoverages: CoverageWithSub[] = [];

    // Build children map and identify parent coverages
    coveragesWithSub.forEach(c => {
      if (c.parentCoverageId) {
        (childrenMap[c.parentCoverageId] = childrenMap[c.parentCoverageId] || []).push(c);
      } else {
        parentCoverages.push(c);
      }
    });

    // Sort children arrays
    Object.values(childrenMap).forEach(arr =>
      arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    );

    // Sort parent coverages
    parentCoverages.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return { parentCoverages, childrenMap };
  }, [coveragesWithSub]);

  // Filter coverages by search and type
  const filteredTreeStructure = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const { parentCoverages, childrenMap } = treeStructure;
    const filteredParents: typeof parentCoverages = [];
    const filteredChildrenMap: typeof childrenMap = {};

    // Helper to check if coverage matches filters
    const matchesFilters = (coverage: typeof parentCoverages[0]) => {
      // Search filter
      const matchesSearch = !q ||
        (coverage.name || '').toLowerCase().includes(q) ||
        (coverage.coverageCode || '').toLowerCase().includes(q);

      // Type filter
      const matchesType = typeFilter === 'all' ||
        (typeFilter === 'required' && coverage.isOptional === false) ||
        (typeFilter === 'optional' && coverage.isOptional === true);

      return matchesSearch && matchesType;
    };

    parentCoverages.forEach(parent => {
      const parentMatches = matchesFilters(parent);
      const children = childrenMap[parent.id] || [];
      const matchingChildren = children.filter(matchesFilters);

      // Include parent if it matches or has matching children
      if (parentMatches || matchingChildren.length > 0) {
        filteredParents.push(parent);
        if (matchingChildren.length > 0) {
          filteredChildrenMap[parent.id] = matchingChildren;
        } else if (parentMatches && children.length > 0) {
          // When parent matches but no children match, still show all children
          filteredChildrenMap[parent.id] = children;
        }
      }
    });

    return { parentCoverages: filteredParents, childrenMap: filteredChildrenMap };
  }, [treeStructure, searchQuery, typeFilter]);

  // Get rule count for a specific coverage
  const getRuleCount = useCallback((coverageId: string) => {
    return rules.filter(rule =>
      rule.ruleType === 'Coverage' && rule.targetId === coverageId
    ).length;
  }, [rules]);

  // Get pricing step count for a specific coverage (by name)
  const getPricingStepCount = useCallback((coverageName: string) => {
    return pricingSteps.filter(step =>
      step.stepType === 'factor' && step.coverages?.includes(coverageName)
    ).length;
  }, [pricingSteps]);

  // Format P&C-specific attributes for display - reserved for future use
  const _formatCoverageTrigger = (trigger?: string) => {
    const triggerLabels: Record<string, string> = {
      'occurrence': 'Occurrence',
      'claimsMade': 'Claims-Made',
      'hybrid': 'Hybrid'
    };
    return triggerLabels[trigger || ''] || null;
  };
  void _formatCoverageTrigger; // Suppress unused variable warning

  const formatValuationMethod = (method?: string) => {
    const methodLabels: Record<string, string> = {
      'ACV': 'Actual Cash Value',
      'RC': 'Replacement Cost',
      'agreedValue': 'Agreed Value',
      'marketValue': 'Market Value',
      'functionalRC': 'Functional RC',
      'statedAmount': 'Stated Amount'
    };
    return methodLabels[method || ''] || null;
  };

  const formatTerritoryType = (type?: string) => {
    const typeLabels: Record<string, string> = {
      'worldwide': 'Worldwide',
      'USA': 'USA Only',
      'stateSpecific': 'State-Specific',
      'custom': 'Custom Territory'
    };
    return typeLabels[type || ''] || null;
  };

  // Check if coverage has any P&C attributes configured (excluding trigger)
  const hasPCAttributes = (coverage: Coverage | CoverageWithSub) => {
    return coverage.valuationMethod ||
           coverage.coinsurancePercentage || coverage.territoryType ||
           coverage.waitingPeriod;
  };

  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [deductibleModalOpen, setDeductibleModalOpen] = useState(false);
  const [currentCoverage, setCurrentCoverage] = useState<Coverage | null>(null);

  const [linkFormsModalOpen, setLinkFormsModalOpen] = useState(false);
  const [selectedCoverageForForms, setSelectedCoverageForForms] = useState<Coverage | null>(null);

  /* ---------- effect: load meta (forms + names + rules) ---------- */
  const loadMeta = useCallback(async () => {
    if (!productId) return;
    setMetaLoading(true);
    try {
      // forms - enrich with linked coverages from junction table
      const formsSnap = await getDocs(
        query(collection(db, 'forms'), where('productId', '==', productId))
      );

      // Fetch all form-coverage links for this product
      const linksSnap = await getDocs(
        query(collection(db, 'formCoverages'), where('productId', '==', productId))
      );
      const coveragesByForm: Record<string, string[]> = {};
      linksSnap.docs.forEach(linkDoc => {
        const { formId, coverageId } = linkDoc.data() as { formId: string; coverageId: string };
        if (!coveragesByForm[formId]) {
          coveragesByForm[formId] = [];
        }
        coveragesByForm[formId].push(coverageId);
      });

      const list: FormData[] = await Promise.all(
        formsSnap.docs.map(async d => {
          const data = d.data();
          let url: string | null = null;
          if (data.filePath) {
            try { url = await getDownloadURL(ref(storage, data.filePath)); } catch { /* ignore */ }
          }
          return {
            ...data,
            id: d.id,
            downloadUrl: url,
            coverageIds: coveragesByForm[d.id] || []
          } as FormData;
        })
      );
      setForms(list);

      // rules - fetch all rules for this product
      const rulesSnap = await getDocs(
        query(collection(db, 'rules'), where('productId', '==', productId))
      );
      const rulesList: RuleData[] = rulesSnap.docs.map(d => ({ id: d.id, ...d.data() } as RuleData));
      setRules(rulesList);

      // pricing steps - fetch all steps for this product
      const stepsSnap = await getDocs(collection(db, `products/${productId}/steps`));
      const stepsList: PricingStepData[] = stepsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PricingStepData));
      setPricingSteps(stepsList);

      // product / parent names
      const prodDoc = await getDoc(doc(db, 'products', productId));
      setProductName(prodDoc.exists() ? (prodDoc.data() as { name: string }).name : 'Unknown Product');

      if (parentCoverageId) {
        const parDoc = await getDoc(doc(db, `products/${productId}/coverages`, parentCoverageId));
        setParentCoverageName(parDoc.exists() ? (parDoc.data() as { name: string }).name : 'Unknown Coverage');
      } else {
        setParentCoverageName('');
      }
    } catch (err) {
      alert('Failed to load data: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setMetaLoading(false);
    }
  }, [productId, parentCoverageId]);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  /* ---------- helpers ---------- */
  // Open Coverage Copilot wizard for editing
  const openEditModal = (c: Coverage): void => {
    setEditingCoverageForWizard(c);
    setCopilotWizardOpen(true);
  };

  // Open Coverage Copilot wizard for adding new coverage
  const openAddModal = (parentId: string | null = null): void => {
    setEditingCoverageForWizard(parentId ? { parentCoverageId: parentId } : null);
    setCopilotWizardOpen(true);
  };

  /* ---------- Modal handlers ---------- */
  const openLimitModal = (c: Coverage): void => {
    setCurrentCoverage(c);
    setLimitModalOpen(true);
  };

  const openDeductibleModal = (c: Coverage): void => {
    setCurrentCoverage(c);
    setDeductibleModalOpen(true);
  };

  const openLinkFormsModal = (c: Coverage) => {
    setSelectedCoverageForForms(c);
    setLinkFormsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this coverage?')) return;
    try {
      await deleteDoc(doc(db, `products/${productId}/coverages`, id));
      await reloadCoverages();
    } catch (err) {
      alert('Delete failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  /* ---------- render guards ---------- */
  if (coveragesLoading || metaLoading) {
    return (
      <PageContainer>
        <MainNavigation />
        <PageContent>
          <EnhancedHeader
            title="Loading Coverages..."
            subtitle="Please wait while we fetch your data"
            icon={ShieldCheckIcon}
            showBackButton
            onBackClick={() => navigate(-1)}
          />

          {/* Skeleton Loading */}
          <CoverageGrid>
            {[1, 2, 3].map(i => (
              <SkeletonCard key={i}>
                <SkeletonLine $width="50%" $height="20px" />
                <SkeletonLine $width="80%" $height="14px" />
                <SkeletonLine $width="100%" $height="40px" />
              </SkeletonCard>
            ))}
          </CoverageGrid>
        </PageContent>
      </PageContainer>
    );
  }

  if (coveragesError) {
    return (
      <PageContainer>
        <MainNavigation />
        <PageContent>
          <EmptyState>
            <EmptyStateIcon>
              <ShieldCheckIcon />
            </EmptyStateIcon>
            <EmptyStateTitle>Error Loading Coverages</EmptyStateTitle>
            <EmptyStateText>There was an error loading the coverage data. Please try refreshing the page.</EmptyStateText>
            <EmptyStateButton onClick={() => window.location.reload()}>
              Refresh Page
            </EmptyStateButton>
          </EmptyState>
        </PageContent>
      </PageContainer>
    );
  }

  /* ---------- UI ---------- */
  return (
    <PageContainer>
      <MainNavigation />
      <PageContent>
        <EnhancedHeader
          title={parentCoverageId ? `${parentCoverageName} Coverages` : `${productName} - Coverages`}
          subtitle={`Manage ${filteredTreeStructure.parentCoverages.length} coverage option${filteredTreeStructure.parentCoverages.length !== 1 ? 's' : ''}`}
          icon={ShieldCheckIcon}
          showBackButton
          onBackClick={() => navigate(-1)}
        />

        {/* Command Bar with Search and Add */}
        <CommandBar>
          <CommandBarLeft>
            <ToolbarLabel>
              {filteredTreeStructure.parentCoverages.length} coverage{filteredTreeStructure.parentCoverages.length !== 1 ? 's' : ''}
              {searchQuery && ` matching "${searchQuery}"`}
            </ToolbarLabel>
          </CommandBarLeft>

          <CommandBarCenter>
            <SearchWrapper>
              <SearchIconWrapper>
                <MagnifyingGlassIcon />
              </SearchIconWrapper>
              <SearchInputStyled
                type="text"
                placeholder="Search coverages by name or code..."
                value={rawSearch}
                onChange={(e) => setRawSearch(e.target.value)}
                aria-label="Search coverages"
              />
            </SearchWrapper>
          </CommandBarCenter>

          <CommandBarRight>
            <CopilotButton onClick={() => setCopilotWizardOpen(true)}>
              <SparklesIcon />
              Coverage Copilot
            </CopilotButton>
          </CommandBarRight>
        </CommandBar>

        {/* Coverages Display */}
        {filteredTreeStructure.parentCoverages.length > 0 ? (
          <CoverageGrid>
	            {filteredTreeStructure.parentCoverages.map((parent, index) => {
	              const isExpanded = expandedIds.includes(parent.id);

	              return (
                  <CoverageGroup key={parent.id} style={{ animationDelay: `${index * 0.05}s` }}>
                    {/* Parent Coverage */}
                      <ParentCoverageCard>
                        <CardHeader>
                          <CardHeaderRow>
                            <CardTitleGroup>
                              <CardTitle>{parent.name}</CardTitle>
                              {parent.isOptional !== undefined && (
                                <CoverageTypeBadge $isOptional={parent.isOptional}>
                                  {parent.isOptional ? 'Optional' : 'Required'}
                                </CoverageTypeBadge>
                              )}
                              <CardCode>{parent.coverageCode}</CardCode>
                              {parent.subCount > 0 && (
                                <ExpandButton
                                  $expanded={isExpanded}
                                  onClick={() => toggleExpand(parent.id)}
                                  aria-label={isExpanded ? 'Collapse sub-coverages' : 'Expand sub-coverages'}
                                >
                                  <ChevronRightIcon />
                                </ExpandButton>
                              )}
                              <IconButton onClick={() => openAddModal(parent.id)} title="Add sub-coverage">
                                <PlusIcon width={16} />
                              </IconButton>
                            </CardTitleGroup>
                            <CardActions>
                              <IconButton onClick={() => openEditModal(parent)} title="Edit coverage">
                                <PencilIcon width={16} />
                              </IconButton>
                              <IconButton className="danger" onClick={() => handleDelete(parent.id)} title="Delete coverage">
                                <TrashIcon width={16} />
                              </IconButton>
                            </CardActions>
                          </CardHeaderRow>
                        </CardHeader>

                        <CardMetrics>
                            <MetricItem
                              $hasValue={((parent as any).limitsCount ?? parent.limitCount ?? 0) > 0}
                              onClick={() => openLimitModal(parent)}
                              title="Configure coverage limits"
                            >
                              <ChartBarIcon />
                              <MetricLabel>Limits</MetricLabel>
                              <MetricBadge $variant={((parent as any).limitsCount ?? parent.limitCount ?? 0) > 0 ? 'success' : 'default'}>
                                {(parent as any).limitsCount ?? parent.limitCount ?? 0}
                              </MetricBadge>
                            </MetricItem>
                            <MetricItem
                              $hasValue={((parent as any).deductiblesCount ?? parent.deductibleCount ?? 0) > 0}
                              onClick={() => openDeductibleModal(parent)}
                              title="Configure deductible options"
                            >
                              <ScaleIcon />
                              <MetricLabel>Deductibles</MetricLabel>
                              <MetricBadge $variant={((parent as any).deductiblesCount ?? parent.deductibleCount ?? 0) > 0 ? 'success' : 'default'}>
                                {(parent as any).deductiblesCount ?? parent.deductibleCount ?? 0}
                              </MetricBadge>
                            </MetricItem>
                            <MetricItem
                              $hasValue={(parent.states?.length ?? 0) > 0}
                              as={RouterLink}
                              to={`/coverage-states/${productId}/${parent.id}`}
                              title="Manage state availability"
                            >
                              <MapIcon />
                              <MetricLabel>States</MetricLabel>
                              <MetricBadge $variant={(parent.states?.length ?? 0) > 0 ? 'success' : 'default'}>
                                {parent.states?.length ?? 0}
                              </MetricBadge>
                            </MetricItem>
                            <MetricItem
                              $hasValue={(formCounts[parent.id] ?? 0) > 0}
                              onClick={() => openLinkFormsModal(parent)}
                              title="Link coverage forms and endorsements"
                            >
                              <ClipboardDocumentCheckIcon />
                              <MetricLabel>Forms</MetricLabel>
                              <MetricBadge $variant={(formCounts[parent.id] ?? 0) > 0 ? 'success' : 'default'}>
                                {formCounts[parent.id] ?? 0}
                              </MetricBadge>
                            </MetricItem>
                            <MetricItem
                              $hasValue={getPricingStepCount(parent.name) > 0}
                              onClick={() => navigate(`/pricing/${productId}?coverage=${encodeURIComponent(parent.name)}`)}
                              title="Configure pricing and rates"
                            >
                              <BanknotesIcon />
                              <MetricLabel>Pricing</MetricLabel>
                              <MetricBadge $variant={getPricingStepCount(parent.name) > 0 ? 'success' : 'default'}>
                                {getPricingStepCount(parent.name)}
                              </MetricBadge>
                            </MetricItem>
                            <MetricItem
                              $hasValue={getRuleCount(parent.id) > 0}
                              onClick={() => navigate(`/rules/${productId}/${parent.id}`)}
                              title="Manage business rules"
                            >
                              <Cog6ToothIcon />
                              <MetricLabel>Rules</MetricLabel>
                              <MetricBadge $variant={getRuleCount(parent.id) > 0 ? 'success' : 'default'}>
                                {getRuleCount(parent.id)}
                              </MetricBadge>
                            </MetricItem>
                            <MetricItem
                              $hasValue={false}
                              onClick={() => setClausesCoverageId(parent.id)}
                              title="View supporting clauses"
                            >
                              <DocumentTextIcon />
                              <MetricLabel>Clauses</MetricLabel>
                            </MetricItem>
                          </CardMetrics>

                        {/* P&C Attributes Row - Shows key coverage configuration */}
                        {hasPCAttributes(parent) && (
                          <CoverageAttributesRow>
                            {formatValuationMethod(parent.valuationMethod) && (
                              <AttributeChip $variant="valuation" title="Valuation Method">
                                <AttributeLabel>Valuation:</AttributeLabel>
                                <AttributeValue>{formatValuationMethod(parent.valuationMethod)}</AttributeValue>
                              </AttributeChip>
                            )}
                            {parent.coinsurancePercentage && (
                              <AttributeChip $variant="coinsurance" title="Coinsurance Requirement">
                                <AttributeLabel>Coinsurance:</AttributeLabel>
                                <AttributeValue>{parent.coinsurancePercentage}%</AttributeValue>
                              </AttributeChip>
                            )}
                            {formatTerritoryType(parent.territoryType) && (
                              <AttributeChip $variant="territory" title="Territory Coverage">
                                <AttributeLabel>Territory:</AttributeLabel>
                                <AttributeValue>{formatTerritoryType(parent.territoryType)}</AttributeValue>
                              </AttributeChip>
                            )}
                            {parent.waitingPeriod && (
                              <AttributeChip $variant="default" title="Waiting Period">
                                <AttributeLabel>Wait:</AttributeLabel>
                                <AttributeValue>{parent.waitingPeriod} {parent.waitingPeriodUnit || 'days'}</AttributeValue>
                              </AttributeChip>
                            )}
                          </CoverageAttributesRow>
                        )}
                      </ParentCoverageCard>
                    {/* Sub-Coverages */}
	                    {filteredTreeStructure.childrenMap[parent.id] && isExpanded && (
	                      <SubCoverageContainer $isExpanded={isExpanded}>
	                        {(filteredTreeStructure.childrenMap[parent.id] ?? []).map((child, childIndex) => (
	                            <CoverageCard key={child.id} $isSubCoverage $delay={childIndex}>
	                              <CardHeader>
	                                <CardHeaderRow>
	                                  <CardTitleGroup>
	                                    <CardTitle>{child.name}</CardTitle>
	                                    {child.isOptional !== undefined && (
	                                      <CoverageTypeBadge $isOptional={child.isOptional}>
	                                        {child.isOptional ? 'Optional' : 'Required'}
	                                      </CoverageTypeBadge>
	                                    )}
	                                    <CardCode>{child.coverageCode}</CardCode>
	                                  </CardTitleGroup>
	                                  <CardActions>
	                                    <IconButton onClick={() => openEditModal(child)} title="Edit coverage">
	                                      <PencilIcon width={16} />
	                                    </IconButton>
	                                    <IconButton className="danger" onClick={() => handleDelete(child.id)} title="Delete coverage">
	                                      <TrashIcon width={16} />
	                                    </IconButton>
	                                  </CardActions>
	                                </CardHeaderRow>
	                              </CardHeader>

                              <CardMetrics>
                                <MetricItem
                                  $hasValue={((child as any).limitsCount ?? child.limitCount ?? 0) > 0}
                                  onClick={() => openLimitModal(child)}
                                  title="Configure coverage limits"
                                >
                                  <ChartBarIcon />
                                  <MetricLabel>Limits</MetricLabel>
                                  <MetricBadge $variant={((child as any).limitsCount ?? child.limitCount ?? 0) > 0 ? 'success' : 'default'}>
                                    {(child as any).limitsCount ?? child.limitCount ?? 0}
                                  </MetricBadge>
                                </MetricItem>
                                <MetricItem
                                  $hasValue={((child as any).deductiblesCount ?? child.deductibleCount ?? 0) > 0}
                                  onClick={() => openDeductibleModal(child)}
                                  title="Configure deductible options"
                                >
                                  <ScaleIcon />
                                  <MetricLabel>Deductibles</MetricLabel>
                                  <MetricBadge $variant={((child as any).deductiblesCount ?? child.deductibleCount ?? 0) > 0 ? 'success' : 'default'}>
                                    {(child as any).deductiblesCount ?? child.deductibleCount ?? 0}
                                  </MetricBadge>
                                </MetricItem>
                                <MetricItem
                                  $hasValue={(child.states?.length ?? 0) > 0}
                                  as={RouterLink}
                                  to={`/coverage-states/${productId}/${child.id}`}
                                  title="Manage state availability"
                                >
                                  <MapIcon />
                                  <MetricLabel>States</MetricLabel>
                                  <MetricBadge $variant={(child.states?.length ?? 0) > 0 ? 'success' : 'default'}>
                                    {child.states?.length ?? 0}
                                  </MetricBadge>
                                </MetricItem>
                                <MetricItem
                                  $hasValue={(formCounts[child.id] ?? 0) > 0}
                                  onClick={() => openLinkFormsModal(child)}
                                  title="Link coverage forms"
                                >
                                  <ClipboardDocumentCheckIcon />
                                  <MetricLabel>Forms</MetricLabel>
                                  <MetricBadge $variant={(formCounts[child.id] ?? 0) > 0 ? 'success' : 'default'}>
                                    {formCounts[child.id] ?? 0}
                                  </MetricBadge>
                                </MetricItem>
                                <MetricItem
                                  $hasValue={getPricingStepCount(child.name) > 0}
                                  onClick={() => navigate(`/pricing/${productId}?coverage=${encodeURIComponent(child.name)}`)}
                                  title="Configure pricing"
                                >
                                  <BanknotesIcon />
                                  <MetricLabel>Pricing</MetricLabel>
                                  <MetricBadge $variant={getPricingStepCount(child.name) > 0 ? 'success' : 'default'}>
                                    {getPricingStepCount(child.name)}
                                  </MetricBadge>
                                </MetricItem>
                                <MetricItem
                                  $hasValue={getRuleCount(child.id) > 0}
                                  onClick={() => navigate(`/rules/${productId}/${child.id}`)}
                                  title="Manage business rules"
                                >
                                  <Cog6ToothIcon />
                                  <MetricLabel>Rules</MetricLabel>
                                  <MetricBadge $variant={getRuleCount(child.id) > 0 ? 'success' : 'default'}>
                                    {getRuleCount(child.id)}
                                  </MetricBadge>
                                </MetricItem>
	                              </CardMetrics>

	                              {/* P&C Attributes Row for sub-coverages */}
	                              {hasPCAttributes(child) && (
	                                <CoverageAttributesRow>
	                                  {formatValuationMethod(child.valuationMethod) && (
	                                    <AttributeChip $variant="valuation" title="Valuation Method">
	                                      <AttributeLabel>Valuation:</AttributeLabel>
	                                      <AttributeValue>{formatValuationMethod(child.valuationMethod)}</AttributeValue>
	                                    </AttributeChip>
	                                  )}
	                                  {child.coinsurancePercentage && (
	                                    <AttributeChip $variant="coinsurance" title="Coinsurance Requirement">
	                                      <AttributeLabel>Coinsurance:</AttributeLabel>
	                                      <AttributeValue>{child.coinsurancePercentage}%</AttributeValue>
	                                    </AttributeChip>
	                                  )}
	                                  {formatTerritoryType(child.territoryType) && (
	                                    <AttributeChip $variant="territory" title="Territory Coverage">
	                                      <AttributeLabel>Territory:</AttributeLabel>
	                                      <AttributeValue>{formatTerritoryType(child.territoryType)}</AttributeValue>
	                                    </AttributeChip>
	                                  )}
	                                  {child.waitingPeriod && (
	                                    <AttributeChip $variant="default" title="Waiting Period">
	                                      <AttributeLabel>Wait:</AttributeLabel>
	                                      <AttributeValue>{child.waitingPeriod} {child.waitingPeriodUnit || 'days'}</AttributeValue>
	                                    </AttributeChip>
	                                  )}
	                                </CoverageAttributesRow>
	                              )}
                          </CoverageCard>
	                        ))}
                      </SubCoverageContainer>
                    )}
                  </CoverageGroup>
                );
              })}
            </CoverageGrid>
        ) : (
          <EmptyState>
            <EmptyStateIcon>
              <ShieldCheckIcon />
            </EmptyStateIcon>
            <EmptyStateTitle>
              {searchQuery ? 'No matching coverages' : 'No coverages yet'}
            </EmptyStateTitle>
            <EmptyStateText>
              {searchQuery
                ? 'Try adjusting your search terms or clear the search to see all coverages.'
                : 'Build your coverage structure by adding coverages with limits, deductibles, and state-specific configurations. Each coverage can include sub-coverages, linked forms, and business rules for comprehensive policy management.'}
            </EmptyStateText>
            {!searchQuery && (
              <EmptyStateButton onClick={() => setCopilotWizardOpen(true)}>
                <SparklesIcon />
                Launch Coverage Copilot
              </EmptyStateButton>
            )}
          </EmptyState>
        )}

      </PageContent>

      {/* ----- Limits Modal (Enhanced - New Two-Pane Design) ----- */}
      {limitModalOpen && currentCoverage && productId && (
        <LimitOptionsModal
          isOpen={limitModalOpen}
          onClose={() => {
            setLimitModalOpen(false);
            reloadCoverages();
          }}
          productId={productId}
          coverageId={currentCoverage.id}
          coverageName={currentCoverage.name}
        />
      )}

      {/* ----- Deductibles Modal (Enhanced - New Two-Pane Design) ----- */}
      {deductibleModalOpen && currentCoverage && productId && (
        <DeductibleOptionsModal
          isOpen={deductibleModalOpen}
          onClose={() => {
            setDeductibleModalOpen(false);
            reloadCoverages();
          }}
          productId={productId}
          coverageId={currentCoverage.id}
          coverageName={currentCoverage.name}
        />
      )}

      {/* Coverage Copilot Wizard - Used for both add and edit */}
      {copilotWizardOpen && productId && (
        <CoverageCopilotWizard
          isOpen={copilotWizardOpen}
          onClose={() => {
            setCopilotWizardOpen(false);
            setEditingCoverageForWizard(null);
          }}
          productId={productId}
          existingCoverage={editingCoverageForWizard ?? undefined}
          onSave={async () => {
            setCopilotWizardOpen(false);
            setEditingCoverageForWizard(null);
            await reloadCoverages();
          }}
        />
      )}

      {/* Link Forms Modal - Lazy-loaded for better code splitting */}
      {linkFormsModalOpen && selectedCoverageForForms && productId && (
        <Suspense fallback={null}>
          <LinkFormsModal
            isOpen={linkFormsModalOpen}
            onClose={() => {
              setLinkFormsModalOpen(false);
              setSelectedCoverageForForms(null);
            }}
            coverage={selectedCoverageForForms}
            productId={productId}
            forms={forms}
            onSave={reloadCoverages}
          />
        </Suspense>
      )}
      {/* Supporting Clauses Modal */}
      {clausesCoverageId && currentOrgId && user && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => setClausesCoverageId(null)}
        >
          <div
            style={{
              background: neutral[0], borderRadius: 14, boxShadow: shadow.overlay,
              padding: parseInt(space[6]), width: 520, maxHeight: '80vh', overflowY: 'auto' as const,
            }}
            onClick={e => e.stopPropagation()}
          >
            <SupportingClauses
              orgId={currentOrgId}
              targetType="coverage_version"
              targetId={clausesCoverageId}
              targetLabel={coverages.find(c => c.id === clausesCoverageId)?.name || ''}
              userId={user.uid}
            />
            <div style={{ textAlign: 'right', marginTop: parseInt(space[4]) }}>
              <button
                style={{
                  padding: `${space[1.5]} 14px`, fontSize: 13, fontWeight: 500, color: neutral[700],
                  background: neutral[100], border: `1px solid ${neutral[200]}`, borderRadius: parseInt(radius.sm), cursor: 'pointer',
                }}
                onClick={() => setClausesCoverageId(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
