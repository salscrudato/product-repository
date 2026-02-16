/**
 * FormsRepository – First-class forms repository page
 *
 * Shows all forms with their editions (versions), active-by-state info,
 * and usage counts. Supports CRUD on forms and versions, with ChangeSet
 * integration for impact tracking.
 *
 * Layout:
 *  - Left sidebar: form list with search + filters
 *  - Right: editions table, jurisdiction badges, "where used" summary
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  color as tokenColor, neutral, accent, space, radius, shadow, semantic,
  border as borderToken, fontFamily, duration,
} from '../ui/tokens';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  XMarkIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  LinkIcon,
  FunnelIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import MainNavigation from '../components/ui/Navigation';
import { PageContainer, PageContent } from '../components/ui/PageContainer';
import EnhancedHeader from '../components/ui/EnhancedHeader';
import { Button } from '../components/ui/Button';
import { useRole } from '../hooks/useRole';
import useProducts from '../hooks/useProducts';
import { useFormImpact } from '../hooks/useFormImpact';
import { useChangeSet } from '../context/ChangeSetContext';
import {
  subscribeToForms,
  createForm,
  updateForm,
  deleteForm,
  createFormVersion,
  getFormVersions,
  updateFormVersion,
  transitionFormVersion,
  cloneFormVersion,
  getFormUses,
} from '../services/formService';
import type {
  OrgForm,
  OrgFormVersion,
  FormType,
  FormOrigin,
  FormUse,
  FormUseType,
} from '../types/form';
import {
  FORM_TYPE_LABELS,
  FORM_ORIGIN_LABELS,
  FORM_USE_TYPE_LABELS,
} from '../types/form';
import { VERSION_STATUS_CONFIG } from '../types/versioning';
import type { VersionStatus } from '../types/versioning';

// ============================================================================
// Styled Components
// ============================================================================

const fadeIn = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 24px;
  animation: ${fadeIn} 0.3s ease;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Sidebar = styled.aside`
  background: ${({ theme }) => theme.card.background};
  border: ${({ theme }) => theme.card.border};
  border-radius: ${({ theme }) => theme.card.borderRadius};
  box-shadow: ${({ theme }) => theme.card.shadow};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 200px);
`;

const SidebarHeader = styled.div`
  padding: ${space[5]};
  border-bottom: 1px solid ${neutral[200]};
  display: flex;
  flex-direction: column;
  gap: ${space[3]};
`;

const SidebarTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: ${tokenColor.text};
  display: flex;
  align-items: center;
  gap: ${space[2]};
`;

const SearchBox = styled.div`
  position: relative;
  svg {
    position: absolute;
    left: ${space[3]};
    top: 50%;
    transform: translateY(-50%);
    width: ${space[4]};
    height: ${space[4]};
    color: ${neutral[400]};
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: ${space[2.5]} ${space[3]} ${space[2.5]} 36px;
  border: 1.5px solid ${neutral[200]};
  border-radius: ${radius.md};
  font-size: 14px;
  font-family: ${fontFamily.sans};
  background: ${tokenColor.bg};
  color: ${tokenColor.text};
  transition: all ${duration.normal} ease;
  &:focus {
    outline: none;
    border-color: ${accent[500]};
    box-shadow: 0 0 0 3px ${accent[100]};
  }
`;

const FilterRow = styled.div`
  display: flex;
  gap: ${space[1.5]};
  flex-wrap: wrap;
`;

const FilterChip = styled.button<{ $active?: boolean }>`
  padding: ${space[1]} ${space[2.5]};
  border-radius: ${radius.md};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid ${({ $active }) => $active ? accent[500] : neutral[200]};
  background: ${({ $active }) => $active ? `${accent[500]}1a` : 'transparent'};
  color: ${({ $active }) => $active ? accent[600] : tokenColor.textSecondary};
  transition: all ${duration.fast} ease;
  &:hover {
    background: ${accent[50]};
    border-color: ${accent[500]};
  }
`;

const FormList = styled.ul`
  list-style: none;
  margin: 0;
  padding: ${space[2]};
  overflow-y: auto;
  flex: 1;
`;

const FormItem = styled.li<{ $selected?: boolean }>`
  padding: 14px ${space[4]};
  border-radius: ${radius.lg};
  cursor: pointer;
  transition: all ${duration.fast} ease;
  margin-bottom: ${space[1]};
  border: 1.5px solid ${({ $selected }) => $selected ? `${accent[500]}4d` : 'transparent'};
  background: ${({ $selected }) => $selected ? accent[50] : 'transparent'};

  &:hover {
    background: ${({ $selected }) => $selected ? accent[50] : neutral[50]};
  }
`;

const FormItemNumber = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${tokenColor.text};
  display: flex;
  align-items: center;
  gap: ${space[2]};
`;

const FormItemTitle = styled.div`
  font-size: 13px;
  color: ${tokenColor.textSecondary};
  margin-top: ${space[1]};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FormItemMeta = styled.div`
  display: flex;
  gap: ${space[2]};
  margin-top: ${space[1.5]};
  align-items: center;
`;

const Badge = styled.span<{ $color?: string }>`
  font-size: 11px;
  font-weight: 600;
  padding: 2px ${space[2]};
  border-radius: ${radius.sm};
  background: ${({ $color }) => $color ? `${$color}18` : `${neutral[500]}1a`};
  color: ${({ $color }) => $color || neutral[500]};
  text-transform: uppercase;
  letter-spacing: 0.02em;
`;

const UsageCount = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${neutral[400]};
  display: flex;
  align-items: center;
  gap: 3px;
  svg { width: 12px; height: 12px; }
`;

// Right panel
const MainPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space[5]};
`;

const Card = styled.div`
  background: ${tokenColor.bg};
  border: ${borderToken.default};
  border-radius: ${radius.xl};
  box-shadow: ${shadow.card};
  padding: ${space[5]};
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${space[4]};
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${tokenColor.text};
  display: flex;
  align-items: center;
  gap: ${space[2]};
  svg { width: ${space[5]}; height: ${space[5]}; color: ${accent[600]}; }
`;

const ActionRow = styled.div`
  display: flex;
  gap: ${space[2]};
  flex-wrap: wrap;
`;

const EditionsTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: ${space[2.5]} 14px;
    text-align: left;
    font-size: 13px;
    border-bottom: 1px solid ${neutral[200]};
  }

  th {
    font-weight: 600;
    color: ${tokenColor.textSecondary};
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.04em;
  }

  tbody tr {
    transition: background 0.15s ease;
    cursor: pointer;
    &:hover { background: rgba(99,102,241,0.03); }
  }
`;

const StatusDot = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
  }
`;

const JurisdictionBadges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${space[1]};
`;

const StateBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 2px ${space[1.5]};
  border-radius: ${radius.xs};
  background: ${semantic.info}1a;
  color: ${semantic.info};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${space[12]} ${space[6]};
  color: ${neutral[400]};
  svg { width: ${space[12]}; height: ${space[12]}; margin-bottom: ${space[3]}; opacity: 0.4; }
`;

const WhereUsedList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space[2]};
`;

const WhereUsedRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[3]};
  padding: ${space[2.5]} 14px;
  background: ${neutral[50]};
  border-radius: ${radius.md};
  font-size: 13px;
  transition: background ${duration.fast} ease;
  &:hover { background: ${accent[50]}; }
`;

const WhereUsedLabel = styled.span`
  flex: 1;
  font-weight: 500;
  color: ${tokenColor.text};
`;

const WhereUsedMeta = styled.span`
  font-size: 12px;
  color: ${neutral[400]};
`;

// Modals
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${tokenColor.overlay};
  backdrop-filter: blur(6px);
  z-index: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${fadeIn} ${duration.normal} ease;
`;

const Modal = styled.div`
  background: ${tokenColor.bg};
  border-radius: ${radius.xl};
  box-shadow: ${shadow.overlay};
  padding: 28px;
  width: 480px;
  max-width: 92vw;
  max-height: 85vh;
  overflow-y: auto;
`;

const ModalTitle = styled.h2`
  margin: 0 0 ${space[5]};
  font-size: 18px;
  font-weight: 600;
  color: ${tokenColor.text};
`;

const FormGroup = styled.div`
  margin-bottom: ${space[4]};
`;

const Label = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: ${tokenColor.textSecondary};
  margin-bottom: ${space[1.5]};
`;

const Input = styled.input`
  width: 100%;
  padding: ${space[2.5]} 14px;
  border: 1.5px solid ${neutral[200]};
  border-radius: ${radius.md};
  font-size: 14px;
  font-family: ${fontFamily.sans};
  background: ${tokenColor.bg};
  color: ${tokenColor.text};
  transition: border-color ${duration.normal};
  &:focus {
    outline: none;
    border-color: ${accent[500]};
    box-shadow: 0 0 0 3px ${accent[100]};
  }
`;

const Select = styled.select`
  width: 100%;
  padding: ${space[2.5]} 14px;
  border: 1.5px solid ${neutral[200]};
  border-radius: ${radius.md};
  font-size: 14px;
  background: ${tokenColor.bg};
  color: ${tokenColor.text};
  &:focus {
    outline: none;
    border-color: ${accent[500]};
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: ${space[2.5]} 14px;
  border: 1.5px solid ${neutral[200]};
  border-radius: ${radius.md};
  font-size: 14px;
  font-family: ${fontFamily.sans};
  background: ${tokenColor.bg};
  color: ${tokenColor.text};
  resize: vertical;
  min-height: 80px;
  &:focus {
    outline: none;
    border-color: ${accent[500]};
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: ${space[2.5]};
  justify-content: flex-end;
  margin-top: ${space[5]};
`;

const CheckboxList = styled.div`
  max-height: 180px;
  overflow-y: auto;
  border: 1.5px solid ${neutral[200]};
  border-radius: ${radius.md};
  padding: ${space[1.5]};
`;

const CheckboxItem = styled.label`
  display: flex;
  align-items: center;
  gap: ${space[2]};
  padding: 7px ${space[2.5]};
  border-radius: ${radius.sm};
  font-size: 13px;
  cursor: pointer;
  color: ${tokenColor.text};
  transition: background ${duration.fast};
  &:hover { background: ${accent[50]}; }
  input { accent-color: ${accent[500]}; }
`;

const ProductChip = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 10px;
  font-weight: 600;
  padding: 1px ${space[1.5]};
  border-radius: ${radius.xs};
  background: ${accent[50]};
  color: ${accent[600]};
  white-space: nowrap;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ProductChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${space[1]};
  margin-top: ${space[1]};
`;

const ProductFilterSelect = styled.select`
  width: 100%;
  padding: 7px ${space[2.5]};
  border: 1.5px solid ${neutral[200]};
  border-radius: ${radius.md};
  font-size: 12px;
  font-family: ${fontFamily.sans};
  background: ${tokenColor.bg};
  color: ${tokenColor.text};
  margin-top: ${space[2]};
  &:focus {
    outline: none;
    border-color: ${accent[500]};
  }
`;

const ImpactBanner = styled.div`
  background: ${semantic.warningLight};
  border: 1px solid ${semantic.warning}33;
  border-radius: ${radius.md};
  padding: 14px 18px;
  display: flex;
  align-items: flex-start;
  gap: ${space[3]};
  margin-bottom: ${space[4]};
  font-size: 13px;
  color: ${semantic.warningDark};
  svg { width: ${space[5]}; height: ${space[5]}; color: ${semantic.warning}; flex-shrink: 0; margin-top: 1px; }
`;

// ============================================================================
// Component
// ============================================================================

export default function FormsRepository() {
  const { currentOrg, user, canWriteProducts: canEdit } = useRole();
  const orgId = currentOrg?.id;
  const userId = user?.uid;
  const { trackFormChange, impact, analyseImpact, loading: impactLoading } = useFormImpact();

  // Form list
  const [forms, setForms] = useState<OrgForm[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FormType | null>(null);
  const [originFilter, setOriginFilter] = useState<FormOrigin | null>(null);
  const [productFilter, setProductFilter] = useState<string | null>(null);

  // Versions for selected form
  const [versions, setVersions] = useState<OrgFormVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // Where-used for selected form
  const [whereUsed, setWhereUsed] = useState<FormUse[]>([]);
  const [usageCounts, setUsageCounts] = useState<Map<string, number>>(new Map());

  // Modals
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCreateVersion, setShowCreateVersion] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  // Products list (for the product-assignment picker)
  const { data: products } = useProducts();

  // Form create/edit state
  const [formNumber, setFormNumber] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formOrigin, setFormOrigin] = useState<FormOrigin>('iso');
  const [formType, setFormType] = useState<FormType>('policy');
  const [formDescription, setFormDescription] = useState('');
  const [formProductIds, setFormProductIds] = useState<string[]>([]);

  // Version create state
  const [versionEdition, setVersionEdition] = useState('');
  const [versionJurisdiction, setVersionJurisdiction] = useState('');
  const [versionSummary, setVersionSummary] = useState('');
  const [versionEffStart, setVersionEffStart] = useState('');
  const [versionEffEnd, setVersionEffEnd] = useState('');

  // Loading / error
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Subscribe to forms ──
  useEffect(() => {
    if (!orgId) return;
    const unsub = subscribeToForms(orgId, setForms, (err) => setError(err.message));
    return () => unsub();
  }, [orgId]);

  // ── Load usage counts ──
  useEffect(() => {
    if (!orgId || forms.length === 0) return;
    (async () => {
      try {
        const uses = await getFormUses(orgId);
        const counts = new Map<string, number>();
        uses.forEach(u => counts.set(u.formId, (counts.get(u.formId) || 0) + 1));
        setUsageCounts(counts);
      } catch {
        // non-critical
      }
    })();
  }, [orgId, forms]);

  // ── Load versions when selected form changes ──
  useEffect(() => {
    if (!orgId || !selectedFormId) {
      setVersions([]);
      setWhereUsed([]);
      return;
    }
    setLoadingVersions(true);
    (async () => {
      try {
        const v = await getFormVersions(orgId, selectedFormId);
        setVersions(v);
        if (v.length > 0) setSelectedVersionId(v[0].id);
        else setSelectedVersionId(null);

        const uses = await getFormUses(orgId, { formId: selectedFormId });
        setWhereUsed(uses);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load versions');
      } finally {
        setLoadingVersions(false);
      }
    })();
  }, [orgId, selectedFormId]);

  // ── Product name lookup ──
  const productNameMap = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach(p => map.set(p.id, p.name));
    return map;
  }, [products]);

  // ── Filtered forms ──
  const filteredForms = useMemo(() => {
    let result = forms;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(f =>
        f.formNumber.toLowerCase().includes(q) ||
        f.title.toLowerCase().includes(q)
      );
    }
    if (typeFilter) result = result.filter(f => f.type === typeFilter);
    if (originFilter) result = result.filter(f => f.isoOrManuscript === originFilter);
    if (productFilter) result = result.filter(f => f.productIds?.includes(productFilter));
    return result;
  }, [forms, search, typeFilter, originFilter, productFilter]);

  const selectedForm = forms.find(f => f.id === selectedFormId) || null;
  const selectedVersion = versions.find(v => v.id === selectedVersionId) || null;

  // ── Handlers ──
  const handleCreateForm = useCallback(async () => {
    if (!orgId || !userId || !formNumber.trim() || !formTitle.trim()) return;
    try {
      const id = await createForm(orgId, {
        formNumber: formNumber.trim(),
        title: formTitle.trim(),
        isoOrManuscript: formOrigin,
        type: formType,
        description: formDescription,
        productIds: formProductIds,
      }, userId);
      setSelectedFormId(id);
      setShowCreateForm(false);
      resetFormFields();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create form');
    }
  }, [orgId, userId, formNumber, formTitle, formOrigin, formType, formDescription, formProductIds]);

  const handleUpdateForm = useCallback(async () => {
    if (!orgId || !userId || !selectedFormId) return;
    try {
      await updateForm(orgId, selectedFormId, {
        formNumber: formNumber.trim(),
        title: formTitle.trim(),
        isoOrManuscript: formOrigin,
        type: formType,
        description: formDescription,
        productIds: formProductIds,
      }, userId);
      setShowEditForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update form');
    }
  }, [orgId, userId, selectedFormId, formNumber, formTitle, formOrigin, formType, formDescription, formProductIds]);

  const handleDeleteForm = useCallback(async () => {
    if (!orgId || !selectedFormId) return;
    if (!window.confirm('Delete this form and all its versions? This cannot be undone.')) return;
    try {
      await deleteForm(orgId, selectedFormId);
      setSelectedFormId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete form');
    }
  }, [orgId, selectedFormId]);

  const handleCreateVersion = useCallback(async () => {
    if (!orgId || !userId || !selectedFormId || !versionEdition.trim()) return;
    try {
      const jurisdiction = versionJurisdiction
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
      const newId = await createFormVersion(orgId, selectedFormId, {
        editionDate: versionEdition.trim(),
        jurisdiction,
        summary: versionSummary,
        effectiveStart: versionEffStart || null,
        effectiveEnd: versionEffEnd || null,
      }, userId);
      // Reload versions
      const v = await getFormVersions(orgId, selectedFormId);
      setVersions(v);
      setSelectedVersionId(newId);
      setShowCreateVersion(false);
      resetVersionFields();

      // Track in Change Set
      if (selectedForm) {
        await trackFormChange(orgId, selectedFormId, newId, selectedForm.formNumber, 'create');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create version');
    }
  }, [orgId, userId, selectedFormId, versionEdition, versionJurisdiction, versionSummary, versionEffStart, versionEffEnd, selectedForm, trackFormChange]);

  const handleTransition = useCallback(async (versionId: string, newStatus: VersionStatus) => {
    if (!orgId || !userId || !selectedFormId) return;
    try {
      await transitionFormVersion(orgId, selectedFormId, versionId, newStatus, userId);
      const v = await getFormVersions(orgId, selectedFormId);
      setVersions(v);

      // Track update in Change Set
      if (selectedForm) {
        await trackFormChange(orgId, selectedFormId, versionId, selectedForm.formNumber, 'update');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transition version');
    }
  }, [orgId, userId, selectedFormId, selectedForm, trackFormChange]);

  const handleCloneVersion = useCallback(async (versionId: string) => {
    if (!orgId || !userId || !selectedFormId) return;
    try {
      const newId = await cloneFormVersion(orgId, selectedFormId, versionId, userId);
      const v = await getFormVersions(orgId, selectedFormId);
      setVersions(v);
      setSelectedVersionId(newId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone version');
    }
  }, [orgId, userId, selectedFormId]);

  const openEditForm = useCallback(() => {
    if (!selectedForm) return;
    setFormNumber(selectedForm.formNumber);
    setFormTitle(selectedForm.title);
    setFormOrigin(selectedForm.isoOrManuscript);
    setFormType(selectedForm.type);
    setFormDescription(selectedForm.description || '');
    setFormProductIds(selectedForm.productIds || []);
    setShowEditForm(true);
  }, [selectedForm]);

  const resetFormFields = () => {
    setFormNumber('');
    setFormTitle('');
    setFormOrigin('iso');
    setFormType('policy');
    setFormDescription('');
    setFormProductIds([]);
  };

  const resetVersionFields = () => {
    setVersionEdition('');
    setVersionJurisdiction('');
    setVersionSummary('');
    setVersionEffStart('');
    setVersionEffEnd('');
  };

  // ── Render ──
  return (
    <PageContainer>
      <MainNavigation />
      <PageContent id="main-content">
        <EnhancedHeader
          title="Forms Repository"
          subtitle="Manage form editions, jurisdictions, and track where each form is used"
          icon={DocumentTextIcon}
        />

        {error && (
          <ImpactBanner>
            <ExclamationTriangleIcon />
            <div style={{ flex: 1 }}>{error}</div>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <XMarkIcon style={{ width: 16, height: 16 }} />
            </button>
          </ImpactBanner>
        )}

        {impact && impact.requiresReApproval && (
          <ImpactBanner>
            <ExclamationTriangleIcon />
            <div>
              <strong>Impact detected:</strong> This form change affects{' '}
              {impact.affectedProductVersionIds.length} product(s)
              {impact.affectedStates.length > 0 && ` across ${impact.affectedStates.length} state(s)`}.
              Re-approval will be required via the Change Set workflow.
            </div>
          </ImpactBanner>
        )}

        <Layout>
          {/* ── Left Sidebar ── */}
          <Sidebar>
            <SidebarHeader>
              <SidebarTitle>
                <DocumentTextIcon style={{ width: 18, height: 18 }} />
                Forms ({filteredForms.length})
                {canEdit && (
                  <Button
                    variant="primary"
                    size="xs"
                    onClick={() => { resetFormFields(); setShowCreateForm(true); }}
                    style={{ marginLeft: 'auto' }}
                  >
                    <PlusIcon style={{ width: 14, height: 14 }} /> New
                  </Button>
                )}
              </SidebarTitle>

              <SearchBox>
                <MagnifyingGlassIcon />
                <SearchInput
                  placeholder="Search by form number or title..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </SearchBox>

              <FilterRow>
                <FilterChip $active={!typeFilter && !originFilter} onClick={() => { setTypeFilter(null); setOriginFilter(null); }}>
                  All
                </FilterChip>
                <FilterChip $active={originFilter === 'iso'} onClick={() => setOriginFilter(originFilter === 'iso' ? null : 'iso')}>
                  ISO
                </FilterChip>
                <FilterChip $active={originFilter === 'manuscript'} onClick={() => setOriginFilter(originFilter === 'manuscript' ? null : 'manuscript')}>
                  Manuscript
                </FilterChip>
                <FilterChip $active={typeFilter === 'endorsement'} onClick={() => setTypeFilter(typeFilter === 'endorsement' ? null : 'endorsement')}>
                  Endorsements
                </FilterChip>
              </FilterRow>

              {products.length > 0 && (
                <ProductFilterSelect
                  value={productFilter || ''}
                  onChange={e => setProductFilter(e.target.value || null)}
                >
                  <option value="">All Products</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </ProductFilterSelect>
              )}
            </SidebarHeader>

            <FormList>
              {filteredForms.length === 0 ? (
                <EmptyState>
                  <DocumentTextIcon />
                  <div>No forms found</div>
                </EmptyState>
              ) : (
                filteredForms.map(f => (
                  <FormItem
                    key={f.id}
                    $selected={f.id === selectedFormId}
                    onClick={() => setSelectedFormId(f.id)}
                  >
                    <FormItemNumber>
                      {f.formNumber}
                      <Badge $color={f.isoOrManuscript === 'iso' ? '#3b82f6' : '#8b5cf6'}>
                        {FORM_ORIGIN_LABELS[f.isoOrManuscript]}
                      </Badge>
                    </FormItemNumber>
                    <FormItemTitle>{f.title}</FormItemTitle>
                    <FormItemMeta>
                      <Badge>{FORM_TYPE_LABELS[f.type]}</Badge>
                      {(usageCounts.get(f.id) || 0) > 0 && (
                        <UsageCount>
                          <LinkIcon /> {usageCounts.get(f.id)} use{(usageCounts.get(f.id) || 0) > 1 ? 's' : ''}
                        </UsageCount>
                      )}
                    </FormItemMeta>
                    {f.productIds && f.productIds.length > 0 && (
                      <ProductChipRow>
                        {f.productIds.slice(0, 3).map(pid => (
                          <ProductChip key={pid}>{productNameMap.get(pid) || pid}</ProductChip>
                        ))}
                        {f.productIds.length > 3 && (
                          <ProductChip>+{f.productIds.length - 3}</ProductChip>
                        )}
                      </ProductChipRow>
                    )}
                  </FormItem>
                ))
              )}
            </FormList>
          </Sidebar>

          {/* ── Right Panel ── */}
          <MainPanel>
            {!selectedForm ? (
              <Card>
                <EmptyState>
                  <DocumentTextIcon />
                  <div>Select a form from the left to view its editions and usage</div>
                </EmptyState>
              </Card>
            ) : (
              <>
                {/* Form header card */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <DocumentTextIcon />
                      {selectedForm.formNumber} – {selectedForm.title}
                    </CardTitle>
                    {canEdit && (
                      <ActionRow>
                        <Button variant="ghost" size="sm" onClick={openEditForm}>
                          <PencilIcon style={{ width: 14, height: 14 }} /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleDeleteForm} style={{ color: '#ef4444' }}>
                          <TrashIcon style={{ width: 14, height: 14 }} /> Delete
                        </Button>
                      </ActionRow>
                    )}
                  </CardHeader>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
                    <Badge $color={selectedForm.isoOrManuscript === 'iso' ? '#3b82f6' : '#8b5cf6'}>
                      {FORM_ORIGIN_LABELS[selectedForm.isoOrManuscript]}
                    </Badge>
                    <Badge>{FORM_TYPE_LABELS[selectedForm.type]}</Badge>
                    <span style={{ color: '#64748b' }}>{versions.length} edition{versions.length !== 1 ? 's' : ''}</span>
                    <span style={{ color: '#64748b' }}>{whereUsed.length} usage{whereUsed.length !== 1 ? 's' : ''}</span>
                  </div>
                  {selectedForm.description && (
                    <p style={{ marginTop: 12, fontSize: 13, color: '#64748b' }}>{selectedForm.description}</p>
                  )}
                </Card>

                {/* Editions table */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <ArrowPathIcon />
                      Editions
                    </CardTitle>
                    {canEdit && (
                      <Button variant="primary" size="sm" onClick={() => { resetVersionFields(); setShowCreateVersion(true); }}>
                        <PlusIcon style={{ width: 14, height: 14 }} /> New Edition
                      </Button>
                    )}
                  </CardHeader>

                  {versions.length === 0 ? (
                    <EmptyState>
                      <ArrowPathIcon />
                      <div>No editions yet. Create the first edition above.</div>
                    </EmptyState>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <EditionsTable>
                        <thead>
                          <tr>
                            <th>V#</th>
                            <th>Edition Date</th>
                            <th>Status</th>
                            <th>Jurisdiction</th>
                            <th>Effective</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {versions.map(v => {
                            const statusCfg = VERSION_STATUS_CONFIG[v.status];
                            return (
                              <tr
                                key={v.id}
                                onClick={() => setSelectedVersionId(v.id)}
                                style={{ background: v.id === selectedVersionId ? 'rgba(99,102,241,0.04)' : undefined }}
                              >
                                <td style={{ fontWeight: 600 }}>v{v.versionNumber}</td>
                                <td>{v.editionDate}</td>
                                <td>
                                  <StatusDot $color={statusCfg.color}>{statusCfg.label}</StatusDot>
                                </td>
                                <td>
                                  <JurisdictionBadges>
                                    {v.jurisdiction.slice(0, 5).map(j => (
                                      <StateBadge key={j}>{j}</StateBadge>
                                    ))}
                                    {v.jurisdiction.length > 5 && (
                                      <StateBadge>+{v.jurisdiction.length - 5}</StateBadge>
                                    )}
                                  </JurisdictionBadges>
                                </td>
                                <td style={{ fontSize: 12, color: '#64748b' }}>
                                  {v.effectiveStart || '—'}{v.effectiveEnd ? ` → ${v.effectiveEnd}` : ''}
                                </td>
                                <td>
                                  <ActionRow>
                                    {v.status === 'draft' && canEdit && (
                                      <Button variant="primary" size="xs" onClick={(e) => { e.stopPropagation(); handleTransition(v.id, 'review'); }}>
                                        Submit
                                      </Button>
                                    )}
                                    {v.status === 'review' && canEdit && (
                                      <Button variant="success" size="xs" onClick={(e) => { e.stopPropagation(); handleTransition(v.id, 'approved'); }}>
                                        Approve
                                      </Button>
                                    )}
                                    {v.status === 'approved' && canEdit && (
                                      <Button variant="primary" size="xs" onClick={(e) => { e.stopPropagation(); handleTransition(v.id, 'published'); }}>
                                        Publish
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); handleCloneVersion(v.id); }}>
                                      <DocumentDuplicateIcon style={{ width: 13, height: 13 }} />
                                    </Button>
                                  </ActionRow>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </EditionsTable>
                    </div>
                  )}
                </Card>

                {/* Where Used */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <LinkIcon />
                      Where Used ({whereUsed.length})
                    </CardTitle>
                  </CardHeader>

                  {whereUsed.length === 0 ? (
                    <EmptyState style={{ padding: 24 }}>
                      <LinkIcon />
                      <div>This form is not yet linked to any products or coverages.</div>
                    </EmptyState>
                  ) : (
                    <WhereUsedList>
                      {whereUsed.map(u => (
                        <WhereUsedRow key={u.id}>
                          <LinkIcon style={{ width: 16, height: 16, color: '#6366f1', flexShrink: 0 }} />
                          <WhereUsedLabel>
                            {u.productName || u.productVersionId}
                            {u.coverageName && ` / ${u.coverageName}`}
                          </WhereUsedLabel>
                          {u.stateCode && <StateBadge>{u.stateCode}</StateBadge>}
                          <Badge $color={
                            u.useType === 'base' ? '#059669' :
                            u.useType === 'endorsement' ? '#8b5cf6' :
                            u.useType === 'notice' ? '#f59e0b' : '#6366f1'
                          }>
                            {FORM_USE_TYPE_LABELS[u.useType]}
                          </Badge>
                        </WhereUsedRow>
                      ))}
                    </WhereUsedList>
                  )}
                </Card>
              </>
            )}
          </MainPanel>
        </Layout>

        {/* ── Create Form Modal ── */}
        {showCreateForm && (
          <Overlay onClick={() => setShowCreateForm(false)}>
            <Modal onClick={e => e.stopPropagation()}>
              <ModalTitle>Create New Form</ModalTitle>
              <FormGroup>
                <Label>Form Number *</Label>
                <Input value={formNumber} onChange={e => setFormNumber(e.target.value)} placeholder="e.g. CG 00 01" />
              </FormGroup>
              <FormGroup>
                <Label>Title *</Label>
                <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Commercial General Liability Coverage Form" />
              </FormGroup>
              <FormGroup>
                <Label>Origin</Label>
                <Select value={formOrigin} onChange={e => setFormOrigin(e.target.value as FormOrigin)}>
                  <option value="iso">ISO</option>
                  <option value="manuscript">Manuscript</option>
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>Type</Label>
                <Select value={formType} onChange={e => setFormType(e.target.value as FormType)}>
                  {Object.entries(FORM_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>Description</Label>
                <TextArea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Optional description..." />
              </FormGroup>
              <FormGroup>
                <Label>Applies to Products</Label>
                {products.length === 0 ? (
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>No products found</span>
                ) : (
                  <CheckboxList>
                    {products.map(p => (
                      <CheckboxItem key={p.id}>
                        <input
                          type="checkbox"
                          checked={formProductIds.includes(p.id)}
                          onChange={() =>
                            setFormProductIds(prev =>
                              prev.includes(p.id)
                                ? prev.filter(id => id !== p.id)
                                : [...prev, p.id]
                            )
                          }
                        />
                        {p.name}
                      </CheckboxItem>
                    ))}
                  </CheckboxList>
                )}
              </FormGroup>
              <ModalActions>
                <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleCreateForm} disabled={!formNumber.trim() || !formTitle.trim()}>
                  Create Form
                </Button>
              </ModalActions>
            </Modal>
          </Overlay>
        )}

        {/* ── Edit Form Modal ── */}
        {showEditForm && selectedForm && (
          <Overlay onClick={() => setShowEditForm(false)}>
            <Modal onClick={e => e.stopPropagation()}>
              <ModalTitle>Edit Form</ModalTitle>
              <FormGroup>
                <Label>Form Number *</Label>
                <Input value={formNumber} onChange={e => setFormNumber(e.target.value)} />
              </FormGroup>
              <FormGroup>
                <Label>Title *</Label>
                <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} />
              </FormGroup>
              <FormGroup>
                <Label>Origin</Label>
                <Select value={formOrigin} onChange={e => setFormOrigin(e.target.value as FormOrigin)}>
                  <option value="iso">ISO</option>
                  <option value="manuscript">Manuscript</option>
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>Type</Label>
                <Select value={formType} onChange={e => setFormType(e.target.value as FormType)}>
                  {Object.entries(FORM_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>Description</Label>
                <TextArea value={formDescription} onChange={e => setFormDescription(e.target.value)} />
              </FormGroup>
              <FormGroup>
                <Label>Applies to Products</Label>
                {products.length === 0 ? (
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>No products found</span>
                ) : (
                  <CheckboxList>
                    {products.map(p => (
                      <CheckboxItem key={p.id}>
                        <input
                          type="checkbox"
                          checked={formProductIds.includes(p.id)}
                          onChange={() =>
                            setFormProductIds(prev =>
                              prev.includes(p.id)
                                ? prev.filter(id => id !== p.id)
                                : [...prev, p.id]
                            )
                          }
                        />
                        {p.name}
                      </CheckboxItem>
                    ))}
                  </CheckboxList>
                )}
              </FormGroup>
              <ModalActions>
                <Button variant="ghost" size="sm" onClick={() => setShowEditForm(false)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleUpdateForm} disabled={!formNumber.trim() || !formTitle.trim()}>
                  Save Changes
                </Button>
              </ModalActions>
            </Modal>
          </Overlay>
        )}

        {/* ── Create Version Modal ── */}
        {showCreateVersion && (
          <Overlay onClick={() => setShowCreateVersion(false)}>
            <Modal onClick={e => e.stopPropagation()}>
              <ModalTitle>New Edition</ModalTitle>
              <FormGroup>
                <Label>Edition Date *</Label>
                <Input value={versionEdition} onChange={e => setVersionEdition(e.target.value)} placeholder="e.g. 01/2024" />
              </FormGroup>
              <FormGroup>
                <Label>Jurisdiction (comma-separated state codes)</Label>
                <Input value={versionJurisdiction} onChange={e => setVersionJurisdiction(e.target.value)} placeholder="e.g. NY, CA, TX" />
              </FormGroup>
              <FormGroup>
                <Label>Effective Start</Label>
                <Input type="date" value={versionEffStart} onChange={e => setVersionEffStart(e.target.value)} />
              </FormGroup>
              <FormGroup>
                <Label>Effective End</Label>
                <Input type="date" value={versionEffEnd} onChange={e => setVersionEffEnd(e.target.value)} />
              </FormGroup>
              <FormGroup>
                <Label>Summary</Label>
                <TextArea value={versionSummary} onChange={e => setVersionSummary(e.target.value)} placeholder="Brief description of this edition..." />
              </FormGroup>
              <ModalActions>
                <Button variant="ghost" size="sm" onClick={() => setShowCreateVersion(false)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleCreateVersion} disabled={!versionEdition.trim()}>
                  Create Edition
                </Button>
              </ModalActions>
            </Modal>
          </Overlay>
        )}
      </PageContent>
    </PageContainer>
  );
}
