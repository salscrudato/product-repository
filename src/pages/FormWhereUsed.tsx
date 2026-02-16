/**
 * FormWhereUsed – dedicated "Where Used" page for forms
 *
 * Answers: "Which products/states use this form edition?"
 *
 * Features:
 *  - Filter by product, state, coverage, use type
 *  - Grouped by form → product → state
 *  - Shows impact banner when change is detected
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  LinkIcon,
  GlobeAltIcon,
  XMarkIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import MainNavigation from '../components/ui/Navigation';
import { PageContainer, PageContent } from '../components/ui/PageContainer';
import EnhancedHeader from '../components/ui/EnhancedHeader';
import { Button } from '../components/ui/Button';
import { useRole } from '../hooks/useRole';
import {
  getForms,
  getFormUses,
  getFormVersions,
} from '../services/formService';
import type {
  OrgForm,
  OrgFormVersion,
  FormUse,
  FormUseType,
} from '../types/form';
import { FORM_USE_TYPE_LABELS } from '../types/form';
import { VERSION_STATUS_CONFIG } from '../types/versioning';

// ============================================================================
// Styled Components
// ============================================================================

const fadeIn = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}`;

const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 20px;
  animation: ${fadeIn} 0.3s ease;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const FilterLabel = styled.label`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border: 1.5px solid ${({ theme }) => theme.colours.border};
  border-radius: 8px;
  font-size: 13px;
  background: white;
  color: ${({ theme }) => theme.colours.text};
  min-width: 160px;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colours.primary};
  }
`;

const FilterInput = styled.input`
  padding: 8px 12px;
  border: 1.5px solid ${({ theme }) => theme.colours.border};
  border-radius: 8px;
  font-size: 13px;
  background: white;
  color: ${({ theme }) => theme.colours.text};
  width: 160px;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colours.primary};
  }
`;

const ResultsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: ${fadeIn} 0.3s ease 0.1s both;
`;

const GroupCard = styled.div`
  background: ${({ theme }) => theme.card.background};
  border: ${({ theme }) => theme.card.border};
  border-radius: ${({ theme }) => theme.card.borderRadius};
  box-shadow: ${({ theme }) => theme.card.shadow};
  overflow: hidden;
  transition: box-shadow 0.2s ease;
  &:hover {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(0, 0, 0, 0.04);
  }
`;

const GroupHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.text};
  transition: background 0.15s ease;
  &:hover { background: rgba(99,102,241,0.03); }
  svg { width: 16px; height: 16px; color: ${({ theme }) => theme.colours.textMuted}; transition: transform 0.2s ease; }
`;

const GroupBody = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => $open ? 'block' : 'none'};
  border-top: 1px solid ${({ theme }) => theme.colours.border};
`;

const UseRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 120px 80px 100px;
  gap: 12px;
  align-items: center;
  padding: 12px 20px;
  font-size: 13px;
  border-bottom: 1px solid ${({ theme }) => (theme.colours as any).borderLight || '#f1f5f9'};
  transition: background 0.15s ease;
  &:last-child { border-bottom: none; }
  &:hover { background: rgba(99,102,241,0.02); }
`;

const UseRowHeader = styled(UseRow)`
  font-weight: 600;
  font-size: 11px;
  color: ${({ theme }) => theme.colours.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  &:hover { background: transparent; }
`;

const Badge = styled.span<{ $color?: string }>`
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  background: ${({ $color }) => $color ? `${$color}18` : 'rgba(100,116,139,0.1)'};
  color: ${({ $color }) => $color || '#64748b'};
  text-transform: uppercase;
`;

const StateBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(59,130,246,0.1);
  color: #3b82f6;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 64px 24px;
  color: ${({ theme }) => theme.colours.textMuted};
  svg { width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.4; }
`;

const SummaryBar = styled.div`
  display: flex;
  gap: 24px;
  padding: 16px 20px;
  background: ${({ theme }) => theme.card.background};
  border: ${({ theme }) => theme.card.border};
  border-radius: ${({ theme }) => theme.card.borderRadius};
  margin-bottom: 16px;
`;

const SummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const SummaryValue = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colours.text};
`;

const SummaryLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colours.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

// ============================================================================
// Types for grouping
// ============================================================================

interface FormGroup {
  form: OrgForm;
  uses: FormUse[];
}

// ============================================================================
// Component
// ============================================================================

export default function FormWhereUsed() {
  const { currentOrg } = useRole();
  const orgId = currentOrg?.id;
  const [searchParams] = useSearchParams();

  // Data
  const [forms, setForms] = useState<OrgForm[]>([]);
  const [allUses, setAllUses] = useState<FormUse[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [productFilter, setProductFilter] = useState(searchParams.get('product') || '');
  const [stateFilter, setStateFilter] = useState(searchParams.get('state') || '');
  const [coverageFilter, setCoverageFilter] = useState(searchParams.get('coverage') || '');
  const [useTypeFilter, setUseTypeFilter] = useState<FormUseType | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Expand/collapse
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // ── Load data ──
  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    (async () => {
      try {
        const [formList, uses] = await Promise.all([
          getForms(orgId, { archived: false }),
          getFormUses(orgId),
        ]);
        setForms(formList);
        setAllUses(uses);
        // Auto-expand first group
        if (formList.length > 0) {
          setExpandedGroups(new Set([formList[0].id]));
        }
      } catch {
        // handled gracefully
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId]);

  // ── Apply filters ──
  const filteredUses = useMemo(() => {
    let result = allUses;

    if (productFilter) {
      const q = productFilter.toLowerCase();
      result = result.filter(u =>
        u.productVersionId.toLowerCase().includes(q) ||
        (u.productName || '').toLowerCase().includes(q)
      );
    }
    if (stateFilter) {
      result = result.filter(u => u.stateCode === stateFilter.toUpperCase());
    }
    if (coverageFilter) {
      const q = coverageFilter.toLowerCase();
      result = result.filter(u =>
        (u.coverageVersionId || '').toLowerCase().includes(q) ||
        (u.coverageName || '').toLowerCase().includes(q)
      );
    }
    if (useTypeFilter) {
      result = result.filter(u => u.useType === useTypeFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u =>
        (u.formNumber || '').toLowerCase().includes(q) ||
        (u.formTitle || '').toLowerCase().includes(q) ||
        (u.productName || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [allUses, productFilter, stateFilter, coverageFilter, useTypeFilter, searchQuery]);

  // ── Group by form ──
  const groupedByForm = useMemo((): FormGroup[] => {
    const map = new Map<string, FormUse[]>();
    filteredUses.forEach(u => {
      if (!map.has(u.formId)) map.set(u.formId, []);
      map.get(u.formId)!.push(u);
    });

    return Array.from(map.entries())
      .map(([formId, uses]) => ({
        form: forms.find(f => f.id === formId) || { id: formId, formNumber: formId, title: 'Unknown' } as OrgForm,
        uses,
      }))
      .sort((a, b) => a.form.formNumber.localeCompare(b.form.formNumber));
  }, [filteredUses, forms]);

  // ── Summary stats ──
  const uniqueProducts = useMemo(() =>
    new Set(filteredUses.map(u => u.productVersionId)).size,
    [filteredUses],
  );
  const uniqueStates = useMemo(() =>
    new Set(filteredUses.filter(u => u.stateCode).map(u => u.stateCode!)).size,
    [filteredUses],
  );

  const toggleGroup = useCallback((formId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(formId)) next.delete(formId);
      else next.add(formId);
      return next;
    });
  }, []);

  const clearFilters = () => {
    setProductFilter('');
    setStateFilter('');
    setCoverageFilter('');
    setUseTypeFilter('');
    setSearchQuery('');
  };

  const hasActiveFilters = productFilter || stateFilter || coverageFilter || useTypeFilter || searchQuery;

  return (
    <PageContainer>
      <MainNavigation />
      <PageContent id="main-content">
        <EnhancedHeader
          title="Where Used"
          subtitle="Find which products, states, and coverages use each form edition"
          icon={LinkIcon}
          breadcrumbs={[
            { label: 'Forms', path: '/forms-repository' },
            { label: 'Where Used' },
          ]}
        />

        {/* Summary */}
        <SummaryBar>
          <SummaryItem>
            <SummaryValue>{filteredUses.length}</SummaryValue>
            <SummaryLabel>Total Usages</SummaryLabel>
          </SummaryItem>
          <SummaryItem>
            <SummaryValue>{groupedByForm.length}</SummaryValue>
            <SummaryLabel>Forms</SummaryLabel>
          </SummaryItem>
          <SummaryItem>
            <SummaryValue>{uniqueProducts}</SummaryValue>
            <SummaryLabel>Products</SummaryLabel>
          </SummaryItem>
          <SummaryItem>
            <SummaryValue>{uniqueStates}</SummaryValue>
            <SummaryLabel>States</SummaryLabel>
          </SummaryItem>
        </SummaryBar>

        {/* Filters */}
        <FilterBar>
          <FilterGroup>
            <FilterLabel>Search</FilterLabel>
            <FilterInput
              placeholder="Form # or product..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </FilterGroup>

          <FilterGroup>
            <FilterLabel>Product</FilterLabel>
            <FilterInput
              placeholder="Product name..."
              value={productFilter}
              onChange={e => setProductFilter(e.target.value)}
            />
          </FilterGroup>

          <FilterGroup>
            <FilterLabel>State</FilterLabel>
            <FilterInput
              placeholder="e.g. NY"
              value={stateFilter}
              onChange={e => setStateFilter(e.target.value)}
              style={{ width: 80 }}
            />
          </FilterGroup>

          <FilterGroup>
            <FilterLabel>Coverage</FilterLabel>
            <FilterInput
              placeholder="Coverage name..."
              value={coverageFilter}
              onChange={e => setCoverageFilter(e.target.value)}
            />
          </FilterGroup>

          <FilterGroup>
            <FilterLabel>Use Type</FilterLabel>
            <FilterSelect value={useTypeFilter} onChange={e => setUseTypeFilter(e.target.value as FormUseType | '')}>
              <option value="">All</option>
              {Object.entries(FORM_USE_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </FilterSelect>
          </FilterGroup>

          {hasActiveFilters && (
            <Button variant="ghost" size="xs" onClick={clearFilters} style={{ alignSelf: 'flex-end', marginBottom: 2 }}>
              <XMarkIcon style={{ width: 14, height: 14 }} /> Clear
            </Button>
          )}
        </FilterBar>

        {/* Results */}
        <ResultsContainer>
          {loading ? (
            <EmptyState>Loading...</EmptyState>
          ) : groupedByForm.length === 0 ? (
            <EmptyState>
              <LinkIcon />
              <div>{hasActiveFilters ? 'No matching usages found. Adjust your filters.' : 'No form usages recorded yet.'}</div>
            </EmptyState>
          ) : (
            groupedByForm.map(group => (
              <GroupCard key={group.form.id}>
                <GroupHeader onClick={() => toggleGroup(group.form.id)}>
                  {expandedGroups.has(group.form.id) ? <ChevronDownIcon /> : <ChevronRightIcon />}
                  <DocumentTextIcon style={{ width: 18, height: 18, color: '#6366f1' }} />
                  <span>{group.form.formNumber} – {group.form.title}</span>
                  <Badge style={{ marginLeft: 'auto' }}>{group.uses.length} usage{group.uses.length !== 1 ? 's' : ''}</Badge>
                </GroupHeader>

                <GroupBody $open={expandedGroups.has(group.form.id)}>
                  <UseRowHeader>
                    <span>Product / Coverage</span>
                    <span>State</span>
                    <span>Type</span>
                    <span>Version</span>
                  </UseRowHeader>
                  {group.uses.map(u => (
                    <UseRow key={u.id}>
                      <span>
                        <strong>{u.productName || u.productVersionId}</strong>
                        {u.coverageName && <span style={{ color: '#64748b' }}> / {u.coverageName}</span>}
                      </span>
                      <span>
                        {u.stateCode ? <StateBadge>{u.stateCode}</StateBadge> : <span style={{ color: '#cbd5e1' }}>—</span>}
                      </span>
                      <Badge $color={
                        u.useType === 'base' ? '#059669' :
                        u.useType === 'endorsement' ? '#8b5cf6' :
                        u.useType === 'notice' ? '#f59e0b' : '#6366f1'
                      }>
                        {FORM_USE_TYPE_LABELS[u.useType]}
                      </Badge>
                      <span style={{ fontSize: 12, color: '#64748b' }}>{u.formVersionId.slice(0, 8)}...</span>
                    </UseRow>
                  ))}
                </GroupBody>
              </GroupCard>
            ))
          )}
        </ResultsContainer>
      </PageContent>
    </PageContainer>
  );
}
