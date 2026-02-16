/**
 * SupportingClauses – "Supporting Clauses" panel
 *
 * Embeddable panel that displays the clause → implementation trace links
 * for a given target (rule version, coverage version, or rate program version).
 *
 * Used in:
 *   - RuleBuilder (UnderwritingRules page)
 *   - CoverageScreen (coverage cards)
 *
 * Features:
 *   - List of linked clauses with type badges and text snippets
 *   - "Link clause" action to create new trace links
 *   - Unlink (delete) action
 *   - Rationale display and edit
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  LinkIcon,
  TrashIcon,
  PlusIcon,
  DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  getSupportingClausesForTarget,
  createTraceLink,
  deleteTraceLink,
} from '../../services/traceLinkService';
import { getClauses, getClauseVersions } from '../../services/clauseService';
import type { TraceWithClause } from '../../types/traceLink';
import type { TraceLinkTargetType } from '../../types/traceLink';
import type { OrgClause, ClauseVersion } from '../../types/clause';
import { CLAUSE_TYPE_CONFIG } from '../../types/clause';

// ════════════════════════════════════════════════════════════════════════
// Props
// ════════════════════════════════════════════════════════════════════════

export interface SupportingClausesProps {
  orgId: string;
  targetType: TraceLinkTargetType;
  targetId: string;
  targetLabel: string;
  userId: string;
  readOnly?: boolean;
}

// ════════════════════════════════════════════════════════════════════════
// Styled Components
// ════════════════════════════════════════════════════════════════════════

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Title = styled.h4`
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const CountBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #6366f1;
  background: #eef2ff;
  padding: 1px 8px;
  border-radius: 99px;
`;

const LinkButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #4f46e5;
  background: none;
  border: 1px solid #c7d2fe;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  &:hover { background: #eef2ff; }
`;

const ClauseCard = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ClauseHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ClauseName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  flex: 1;
`;

const TypeBadge = styled.span<{ $color: string }>`
  font-size: 10px;
  font-weight: 600;
  color: ${p => p.$color};
  background: ${p => `${p.$color}14`};
  border: 1px solid ${p => `${p.$color}30`};
  padding: 1px 8px;
  border-radius: 99px;
`;

const VersionTag = styled.span`
  font-size: 11px;
  font-family: 'SF Mono', 'Menlo', monospace;
  color: #64748b;
`;

const Snippet = styled.p`
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Rationale = styled.div`
  font-size: 12px;
  color: #475569;
  background: #eff6ff;
  border-radius: 6px;
  padding: 6px 10px;
  font-style: italic;
`;

const RemoveBtn = styled.button`
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  &:hover { color: #ef4444; background: #fef2f2; }
`;

const Empty = styled.div`
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
  padding: 16px 0;
`;

/* ── Modal overlay ── */
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  padding: 24px;
  width: 480px;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px;
`;

const FieldLabel = styled.label`
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  display: block;
  margin-bottom: 4px;
`;

const Select = styled.select`
  width: 100%;
  padding: 8px 10px;
  font-size: 13px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #374151;
  margin-bottom: 12px;
  &:focus { border-color: #6366f1; outline: none; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15); }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 8px 10px;
  font-size: 13px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #374151;
  min-height: 60px;
  resize: vertical;
  margin-bottom: 12px;
  font-family: inherit;
  &:focus { border-color: #6366f1; outline: none; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15); }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const BtnSecondary = styled.button`
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  &:hover { background: #e2e8f0; }
`;

const BtnPrimary = styled.button<{ disabled?: boolean }>`
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: ${p => p.disabled ? '#94a3b8' : '#4f46e5'};
  border: none;
  border-radius: 6px;
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  &:hover:not(:disabled) { background: #4338ca; }
`;

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

export const SupportingClauses: React.FC<SupportingClausesProps> = ({
  orgId, targetType, targetId, targetLabel, userId, readOnly = false,
}) => {
  const [traces, setTraces] = useState<TraceWithClause[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showLink, setShowLink] = useState(false);
  const [allClauses, setAllClauses] = useState<OrgClause[]>([]);
  const [clauseVersions, setClauseVersions] = useState<ClauseVersion[]>([]);
  const [selectedClauseId, setSelectedClauseId] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [rationale, setRationale] = useState('');
  const [saving, setSaving] = useState(false);

  const loadTraces = useCallback(async () => {
    if (!orgId || !targetId) return;
    setLoading(true);
    try {
      const data = await getSupportingClausesForTarget(orgId, targetType, targetId);
      setTraces(data);
    } catch (e) {
      console.error('Failed to load supporting clauses:', e);
    }
    setLoading(false);
  }, [orgId, targetType, targetId]);

  useEffect(() => { loadTraces(); }, [loadTraces]);

  // Load clauses for modal
  const openLinkModal = useCallback(async () => {
    setShowLink(true);
    try {
      const clauses = await getClauses(orgId, { archived: false });
      setAllClauses(clauses);
    } catch (e) {
      console.error('Failed to load clauses:', e);
    }
  }, [orgId]);

  // Load clause versions when clause selected
  useEffect(() => {
    if (!selectedClauseId) { setClauseVersions([]); return; }
    (async () => {
      const vs = await getClauseVersions(orgId, selectedClauseId);
      setClauseVersions(vs);
      // Auto-select latest published or first
      const pub = vs.find(v => v.status === 'published');
      setSelectedVersionId(pub?.id || vs[0]?.id || '');
    })();
  }, [orgId, selectedClauseId]);

  const handleCreate = async () => {
    if (!selectedClauseId || !selectedVersionId || !rationale.trim()) return;
    setSaving(true);
    try {
      const clause = allClauses.find(c => c.id === selectedClauseId);
      await createTraceLink(orgId, {
        clauseId: selectedClauseId,
        clauseVersionId: selectedVersionId,
        targetType,
        ...(targetType === 'rule_version' ? { ruleVersionId: targetId } : {}),
        ...(targetType === 'coverage_version' ? { coverageVersionId: targetId } : {}),
        ...(targetType === 'rate_program_version' ? { rateProgramVersionId: targetId } : {}),
        rationale: rationale.trim(),
        clauseName: clause?.canonicalName,
        clauseType: clause?.type,
        targetLabel,
      }, userId);
      setShowLink(false);
      setSelectedClauseId('');
      setSelectedVersionId('');
      setRationale('');
      await loadTraces();
    } catch (e) {
      console.error('Failed to create trace link:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (traceId: string) => {
    if (!window.confirm('Remove this clause trace link?')) return;
    try {
      await deleteTraceLink(orgId, traceId);
      await loadTraces();
    } catch (e) {
      console.error('Failed to delete trace link:', e);
    }
  };

  return (
    <Container>
      <Header>
        <Title>
          <DocumentTextIcon style={{ width: 16, height: 16, color: '#6366f1' }} />
          Supporting Clauses
          <CountBadge>{traces.length}</CountBadge>
        </Title>
        {!readOnly && (
          <LinkButton onClick={openLinkModal}>
            <PlusIcon style={{ width: 14, height: 14 }} />
            Link Clause
          </LinkButton>
        )}
      </Header>

      {loading && <Empty>Loading...</Empty>}

      {!loading && traces.length === 0 && (
        <Empty>No supporting clauses linked yet</Empty>
      )}

      {traces.map(tw => {
        const cfg = CLAUSE_TYPE_CONFIG[tw.clauseType] || CLAUSE_TYPE_CONFIG.other;
        return (
          <ClauseCard key={tw.traceLink.id}>
            <ClauseHeader>
              <TypeBadge $color={cfg.color}>{cfg.label}</TypeBadge>
              <ClauseName>{tw.clauseName}</ClauseName>
              <VersionTag>v{tw.clauseVersionNumber}</VersionTag>
              {!readOnly && (
                <RemoveBtn onClick={() => handleDelete(tw.traceLink.id)} title="Remove trace link">
                  <TrashIcon style={{ width: 14, height: 14 }} />
                </RemoveBtn>
              )}
            </ClauseHeader>
            {tw.clauseTextSnippet && <Snippet>{tw.clauseTextSnippet}</Snippet>}
            {tw.traceLink.rationale && <Rationale>{tw.traceLink.rationale}</Rationale>}
          </ClauseCard>
        );
      })}

      {/* ── Link clause modal ── */}
      {showLink && (
        <Overlay onClick={() => setShowLink(false)}>
          <Modal onClick={e => e.stopPropagation()}>
            <ModalTitle>Link Supporting Clause</ModalTitle>

            <FieldLabel>Clause</FieldLabel>
            <Select value={selectedClauseId} onChange={e => setSelectedClauseId(e.target.value)}>
              <option value="">Select clause...</option>
              {allClauses.map(c => (
                <option key={c.id} value={c.id}>{c.canonicalName} ({CLAUSE_TYPE_CONFIG[c.type]?.label})</option>
              ))}
            </Select>

            {selectedClauseId && (
              <>
                <FieldLabel>Version</FieldLabel>
                <Select value={selectedVersionId} onChange={e => setSelectedVersionId(e.target.value)}>
                  <option value="">Select version...</option>
                  {clauseVersions.map(v => (
                    <option key={v.id} value={v.id}>v{v.versionNumber} – {v.status}</option>
                  ))}
                </Select>
              </>
            )}

            <FieldLabel>Rationale</FieldLabel>
            <TextArea
              value={rationale}
              onChange={e => setRationale(e.target.value)}
              placeholder="Why does this clause justify this configuration? (required)"
            />

            <ModalActions>
              <BtnSecondary onClick={() => setShowLink(false)}>Cancel</BtnSecondary>
              <BtnPrimary
                onClick={handleCreate}
                disabled={saving || !selectedClauseId || !selectedVersionId || !rationale.trim()}
              >
                {saving ? 'Linking...' : 'Link Clause'}
              </BtnPrimary>
            </ModalActions>
          </Modal>
        </Overlay>
      )}
    </Container>
  );
};

export default SupportingClauses;
