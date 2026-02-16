/**
 * DataDictionaryPage - Enhanced org-scoped Data Dictionary management
 * Provides table view with search, filter by type/category, and CSV import/export
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { orgDataDictionaryService, CreateFieldInput } from '../services/orgDataDictionaryService';
import {
  DataDictionaryField,
  DataDictionaryFieldType,
  DataDictionaryCategory,
  DataDictionaryFieldStatus
} from '../types/dataDictionary';
import MainNavigation from '../components/ui/Navigation';
import EnhancedHeader from '../components/ui/EnhancedHeader';
import { PageContainer, PageContent } from '../components/ui/PageContainer';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';
import {
  BookOpenIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  FunnelIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/solid';
import styled from 'styled-components';

// ============================================================================
// Constants
// ============================================================================

const FIELD_TYPES: DataDictionaryFieldType[] = ['string', 'int', 'decimal', 'boolean', 'date', 'enum'];

const CATEGORIES: DataDictionaryCategory[] = [
  'property', 'liability', 'operations', 'claims', 'location', 'insured', 'policy', 'coverage', 'custom'
];

const CATEGORY_LABELS: Record<DataDictionaryCategory, string> = {
  property: 'Property',
  liability: 'Liability',
  operations: 'Operations',
  claims: 'Claims',
  location: 'Location',
  insured: 'Insured',
  policy: 'Policy',
  coverage: 'Coverage',
  custom: 'Custom'
};

const TYPE_LABELS: Record<DataDictionaryFieldType, string> = {
  string: 'String',
  int: 'Integer',
  decimal: 'Decimal',
  boolean: 'Boolean',
  date: 'Date',
  enum: 'Enum'
};

// ============================================================================
// Styled Components
// ============================================================================

const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
`;

const ActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  color: #374151;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const ActionButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 14px;
`;

const TableContainer = styled.div`
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  margin-bottom: 60px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const THead = styled.thead`
  background: #f8fafc;
`;

const Tr = styled.tr`
  border-bottom: 1px solid #e5e7eb;
  &:hover { background: #f9fafb; }
`;

const Th = styled.th<{ width?: string }>`
  padding: 14px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  width: ${props => props.width || 'auto'};
`;

const Td = styled.td<{ align?: string }>`
  padding: 14px 16px;
  font-size: 14px;
  color: #1f2937;
  text-align: ${props => props.align || 'left'};
  vertical-align: middle;
`;

const CodeBadge = styled.code`
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 13px;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 4px;
  color: #0f172a;
`;

const TypeBadge = styled.span<{ type: DataDictionaryFieldType }>`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: ${props => {
    switch (props.type) {
      case 'string': return '#e0f2fe';
      case 'int': return '#fef3c7';
      case 'decimal': return '#fce7f3';
      case 'boolean': return '#d1fae5';
      case 'date': return '#ede9fe';
      case 'enum': return '#fee2e2';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.type) {
      case 'string': return '#0369a1';
      case 'int': return '#b45309';
      case 'decimal': return '#be185d';
      case 'boolean': return '#059669';
      case 'date': return '#7c3aed';
      case 'enum': return '#dc2626';
      default: return '#6b7280';
    }
  }};
`;

const StatusBadge = styled.span<{ status: DataDictionaryFieldStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: ${props => props.status === 'active' ? '#d1fae5' : '#fef3c7'};
  color: ${props => props.status === 'active' ? '#059669' : '#b45309'};
`;

const CategoryBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
`;

const InlineInput = styled(TextInput)`
  padding: 6px 10px;
  font-size: 14px;
  min-width: 120px;
`;

const InlineSelect = styled(FilterSelect)`
  padding: 6px 10px;
  font-size: 14px;
  min-width: 100px;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border: none;
  background: transparent;
  color: #6b7280;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: #f3f4f6;
    color: #374151;
  }

  &.danger:hover {
    background: #fee2e2;
    color: #dc2626;
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

// ============================================================================
// Component
// ============================================================================

export default function DataDictionaryPage() {
  const { user, primaryOrgId } = useAuth();
  const [fields, setFields] = useState<DataDictionaryField[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<DataDictionaryFieldType | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<DataDictionaryCategory | ''>('');
  const [statusFilter, setStatusFilter] = useState<DataDictionaryFieldStatus | ''>('');

  // Subscribe to fields
  useEffect(() => {
    if (!primaryOrgId) return;

    setLoading(true);
    const unsubscribe = orgDataDictionaryService.subscribeToFields(
      primaryOrgId,
      (data) => {
        setFields(data);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to load fields:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [primaryOrgId]);

  // Filter fields
  const filteredFields = useMemo(() => {
    let result = fields;

    if (typeFilter) {
      result = result.filter(f => f.type === typeFilter);
    }
    if (categoryFilter) {
      result = result.filter(f => f.category === categoryFilter);
    }
    if (statusFilter) {
      result = result.filter(f => f.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f =>
        f.code.toLowerCase().includes(q) ||
        f.displayName.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [fields, typeFilter, categoryFilter, statusFilter, searchQuery]);

  // Add new field
  const handleAddField = async () => {
    if (!primaryOrgId || !user) return;

    const newField: CreateFieldInput = {
      code: `field_${Date.now()}`,
      displayName: 'New Field',
      category: 'custom',
      type: 'string'
    };

    try {
      await orgDataDictionaryService.createField(primaryOrgId, newField, user.uid);
    } catch (error) {
      console.error('Failed to create field:', error);
      alert('Failed to create field. Please try again.');
    }
  };

  // Update field
  const handleUpdateField = async (fieldId: string, updates: Partial<CreateFieldInput>) => {
    if (!primaryOrgId || !user) return;

    try {
      await orgDataDictionaryService.updateField(primaryOrgId, fieldId, updates, user.uid);
    } catch (error) {
      console.error('Failed to update field:', error);
      alert(error instanceof Error ? error.message : 'Failed to update field');
    }
  };

  // Delete field
  const handleDeleteField = async (fieldId: string) => {
    if (!primaryOrgId) return;
    if (!window.confirm('Delete this field? This cannot be undone.')) return;

    try {
      await orgDataDictionaryService.deleteField(primaryOrgId, fieldId);
    } catch (error) {
      console.error('Failed to delete field:', error);
      alert('Failed to delete field. Please try again.');
    }
  };

  // Export to CSV
  const handleExportCSV = useCallback(() => {
    const headers = ['code', 'displayName', 'type', 'category', 'status', 'description', 'unit', 'allowedValues'];
    const rows = filteredFields.map(f => [
      f.code,
      f.displayName,
      f.type,
      f.category,
      f.status,
      f.description || '',
      f.unit || '',
      f.allowedValues?.join(';') || ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-dictionary-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredFields]);

  // Import from CSV
  const handleImportCSV = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !primaryOrgId || !user) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

      const codeIdx = headers.indexOf('code');
      const nameIdx = headers.indexOf('displayName');
      const typeIdx = headers.indexOf('type');
      const catIdx = headers.indexOf('category');

      if (codeIdx === -1 || nameIdx === -1) {
        alert('CSV must have "code" and "displayName" columns');
        return;
      }

      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        const code = values[codeIdx];
        const displayName = values[nameIdx];

        if (!code || !displayName) continue;

        const fieldInput: CreateFieldInput = {
          code,
          displayName,
          type: (FIELD_TYPES.includes(values[typeIdx] as DataDictionaryFieldType)
            ? values[typeIdx] : 'string') as DataDictionaryFieldType,
          category: (CATEGORIES.includes(values[catIdx] as DataDictionaryCategory)
            ? values[catIdx] : 'custom') as DataDictionaryCategory
        };

        try {
          await orgDataDictionaryService.createField(primaryOrgId, fieldInput, user.uid);
          imported++;
        } catch {
          // Skip duplicates
        }
      }

      alert(`Imported ${imported} fields`);
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import CSV');
    }

    e.target.value = '';
  }, [primaryOrgId, user]);

  const clearFilters = () => {
    setTypeFilter('');
    setCategoryFilter('');
    setStatusFilter('');
    setSearchQuery('');
  };

  const hasFilters = typeFilter || categoryFilter || statusFilter || searchQuery;

  return (
    <PageContainer withOverlay>
      <MainNavigation />
      <PageContent>
        <Breadcrumb items={[{ label: 'Home', path: '/' }, { label: 'Data Dictionary' }]} />

        <EnhancedHeader
          title="Data Dictionary"
          subtitle={`${fields.length} field definitions • Enforceable input contract for Pricing, Rules & Tables`}
          icon={BookOpenIcon}
          searchProps={{
            placeholder: 'Search by code, name, or description...',
            value: searchQuery,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)
          }}
        />

        <ActionBar>
          <ActionGroup>
            <FunnelIcon width={16} height={16} style={{ color: '#6b7280' }} />
            <FilterSelect value={typeFilter} onChange={e => setTypeFilter(e.target.value as DataDictionaryFieldType | '')}>
              <option value="">All Types</option>
              {FIELD_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </FilterSelect>
            <FilterSelect value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as DataDictionaryCategory | '')}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </FilterSelect>
            <FilterSelect value={statusFilter} onChange={e => setStatusFilter(e.target.value as DataDictionaryFieldStatus | '')}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="deprecated">Deprecated</option>
            </FilterSelect>
            {hasFilters && (
              <IconButton onClick={clearFilters} title="Clear filters">
                <XMarkIcon width={16} height={16} />
              </IconButton>
            )}
          </ActionGroup>
          <ActionGroup>
            <HiddenFileInput type="file" accept=".csv" id="csv-import" onChange={handleImportCSV} />
            <ActionButton as="label" htmlFor="csv-import" style={{ cursor: 'pointer' }}>
              <ArrowUpTrayIcon width={16} height={16} />
              Import CSV
            </ActionButton>
            <ActionButton onClick={handleExportCSV}>
              <ArrowDownTrayIcon width={16} height={16} />
              Export CSV
            </ActionButton>
            <ActionButton onClick={handleAddField} style={{ background: '#6366f1', color: 'white' }}>
              <PlusIcon width={16} height={16} />
              Add Field
            </ActionButton>
          </ActionGroup>
        </ActionBar>

        {loading ? (
          <EmptyState>Loading...</EmptyState>
        ) : filteredFields.length === 0 ? (
          <EmptyState>
            {hasFilters ? 'No fields match your filters.' : 'No fields defined yet. Add your first field!'}
          </EmptyState>
        ) : (
          <TableContainer>
            <Table>
              <THead>
                <Tr>
                  <Th width="180px">Code</Th>
                  <Th>Display Name</Th>
                  <Th width="100px">Type</Th>
                  <Th width="120px">Category</Th>
                  <Th width="100px">Status</Th>
                  <Th width="80px" style={{ textAlign: 'center' }}>Actions</Th>
                </Tr>
              </THead>
              <tbody>
                {filteredFields.map(field => (
                  <Tr key={field.id}>
                    <Td>
                      <InlineInput
                        value={field.code}
                        onChange={e => handleUpdateField(field.id, { code: e.target.value })}
                        style={{ fontFamily: 'monospace' }}
                      />
                    </Td>
                    <Td>
                      <InlineInput
                        value={field.displayName}
                        onChange={e => handleUpdateField(field.id, { displayName: e.target.value })}
                      />
                    </Td>
                    <Td>
                      <InlineSelect
                        value={field.type}
                        onChange={e => handleUpdateField(field.id, { type: e.target.value as DataDictionaryFieldType })}
                      >
                        {FIELD_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                      </InlineSelect>
                    </Td>
                    <Td>
                      <InlineSelect
                        value={field.category}
                        onChange={e => handleUpdateField(field.id, { category: e.target.value as DataDictionaryCategory })}
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                      </InlineSelect>
                    </Td>
                    <Td>
                      <StatusBadge status={field.status}>
                        {field.status === 'active' ? (
                          <><CheckCircleIcon width={12} /> Active</>
                        ) : (
                          <><ExclamationTriangleIcon width={12} /> Deprecated</>
                        )}
                      </StatusBadge>
                    </Td>
                    <Td align="center">
                      <IconButton className="danger" onClick={() => handleDeleteField(field.id)} title="Delete">
                        <XMarkIcon width={16} height={16} />
                      </IconButton>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableContainer>
        )}
      </PageContent>
    </PageContainer>
  );
}

