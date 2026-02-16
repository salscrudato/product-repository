/**
 * ClauseTagging – inline component for form edition views
 *
 * Lets users tag ingested sections from a form edition to clauses in the library:
 *   - Shows detected sections from the ingestion pipeline
 *   - Allows linking each section to an existing clause or creating a new one
 *   - Creates clause links (clauseLinks) for tracking reuse
 *   - Shows which clauses are already linked
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  color, neutral, accent, space, radius, fontFamily,
  type as T, border, duration, focusRingStyle, semantic,
} from '../../ui/tokens';
import {
  getClauses, createClause, createClauseVersion, createClauseLink,
  getLinksForTarget, deleteClauseLink,
} from '../../services/clauseService';
import type { OrgClause, ClauseType, ClauseLink } from '../../types/clause';
import { CLAUSE_TYPE_CONFIG, CLAUSE_TYPE_OPTIONS } from '../../types/clause';
import type { FormIngestionSection } from '../../types/ingestion';
import { SECTION_TYPE_CONFIG } from '../../types/ingestion';

// ════════════════════════════════════════════════════════════════════════
// Props
// ════════════════════════════════════════════════════════════════════════

export interface ClauseTaggingProps {
  orgId: string;
  userId: string;
  formVersionId: string;
  /** Detected sections from the ingestion pipeline */
  sections: FormIngestionSection[];
  /** Form metadata for denormalisation */
  formNumber?: string;
  /** Called when a link is created or removed */
  onLinksChanged?: () => void;
}

// ════════════════════════════════════════════════════════════════════════
// Styled Components
// ════════════════════════════════════════════════════════════════════════

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space[3]};
`;

const SectionCard = styled.div<{ $linked: boolean }>`
  padding: ${space[3]} ${space[4]};
  border: 1px solid ${p => p.$linked ? `${semantic.success}50` : neutral[200]};
  border-radius: ${radius.md};
  background: ${p => p.$linked ? `${semantic.successLight}` : color.bg};
  transition: border-color ${duration.fast};
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[2]};
  margin-bottom: ${space[2]};
`;

const SectionTitle = styled.span`
  font-size: ${T.bodySm.size};
  font-weight: 600;
  color: ${color.text};
  flex: 1;
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

const PageRef = styled.span`
  font-family: ${fontFamily.mono};
  font-size: ${T.captionSm.size};
  color: ${color.textMuted};
`;

const LinkedClause = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[2]};
  padding: ${space[1.5]} ${space[3]};
  background: ${neutral[50]};
  border-radius: ${radius.sm};
  font-size: ${T.captionSm.size};
  margin-top: ${space[2]};
`;

const LinkedName = styled.span`
  font-weight: 600;
  color: ${accent[700]};
  flex: 1;
`;

const UnlinkBtn = styled.button`
  font-size: 10px;
  color: ${semantic.error};
  background: none;
  border: none;
  cursor: pointer;
  &:hover { text-decoration: underline; }
`;

const ActionRow = styled.div`
  display: flex;
  gap: ${space[2]};
  margin-top: ${space[2]};
  align-items: center;
`;

const SmallSelect = styled.select`
  padding: ${space[1]} ${space[2]};
  font-family: ${fontFamily.sans};
  font-size: ${T.captionSm.size};
  color: ${color.text};
  background: ${color.bg};
  border: ${border.default};
  border-radius: ${radius.xs};
  outline: none;
  flex: 1;
  max-width: 260px;
  &:focus { border-color: ${accent[500]}; }
`;

const SmallBtn = styled.button<{ $primary?: boolean }>`
  padding: ${space[1]} ${space[3]};
  font-family: ${fontFamily.sans};
  font-size: ${T.captionSm.size};
  font-weight: 600;
  border-radius: ${radius.xs};
  cursor: pointer;
  ${p => p.$primary
    ? `color: ${color.textInverse}; background: ${accent[600]}; border: none;`
    : `color: ${color.textSecondary}; background: transparent; border: ${border.default};`
  }
  &:hover { opacity: 0.85; }
`;

const NewClauseInline = styled.div`
  display: flex;
  gap: ${space[2]};
  margin-top: ${space[2]};
  flex-wrap: wrap;
`;

const SmallInput = styled.input`
  padding: ${space[1]} ${space[2]};
  font-family: ${fontFamily.sans};
  font-size: ${T.captionSm.size};
  color: ${color.text};
  background: ${color.bg};
  border: ${border.default};
  border-radius: ${radius.xs};
  outline: none;
  flex: 1;
  min-width: 160px;
  &:focus { border-color: ${accent[500]}; }
`;

const HintText = styled.span`
  font-size: ${T.captionSm.size};
  color: ${color.textMuted};
`;

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

const ClauseTagging: React.FC<ClauseTaggingProps> = ({
  orgId, userId, formVersionId, sections, formNumber, onLinksChanged,
}) => {
  const [allClauses, setAllClauses] = useState<OrgClause[]>([]);
  const [existingLinks, setExistingLinks] = useState<ClauseLink[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState<string | null>(null);
  const [newClauseName, setNewClauseName] = useState('');
  const [selectedClauseIds, setSelectedClauseIds] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    const [clauses, links] = await Promise.all([
      getClauses(orgId, { archived: false }),
      getLinksForTarget(orgId, 'form_version', formVersionId),
    ]);
    setAllClauses(clauses);
    setExistingLinks(links);
  }, [orgId, formVersionId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Map: sectionTitle → linked clauses
  const sectionLinkMap = new Map<string, ClauseLink[]>();
  for (const link of existingLinks) {
    // We store the section title in targetLabel
    const key = link.targetLabel || '';
    if (!sectionLinkMap.has(key)) sectionLinkMap.set(key, []);
    sectionLinkMap.get(key)!.push(link);
  }

  const handleLinkExisting = async (section: FormIngestionSection) => {
    const clauseId = selectedClauseIds[section.id];
    if (!clauseId) return;
    const clause = allClauses.find(c => c.id === clauseId);
    await createClauseLink(orgId, {
      clauseId,
      clauseVersionId: clause?.latestPublishedVersionId || clause?.latestDraftVersionId || '',
      targetType: 'form_version',
      formVersionId,
      clauseName: clause?.canonicalName,
      clauseType: clause?.type,
      targetLabel: section.title,
    }, userId);
    await loadData();
    onLinksChanged?.();
    setExpandedSection(null);
  };

  const handleCreateAndLink = async (section: FormIngestionSection) => {
    if (!newClauseName.trim()) return;

    // Map section type to clause type
    const typeMap: Record<string, ClauseType> = {
      coverage: 'coverage', exclusion: 'exclusion', condition: 'condition',
      definition: 'definition', endorsement: 'endorsement', schedule: 'schedule',
    };
    const clauseType = typeMap[section.type] || 'other';

    // Create clause + version
    const clauseId = await createClause(orgId, {
      canonicalName: newClauseName.trim(),
      type: clauseType,
      tags: formNumber ? [formNumber.toLowerCase().replace(/\s+/g, '-')] : [],
    }, userId);

    // Use the section summary as initial version text
    const text = sections.find(s => s.id === section.id)?.summary || section.title;
    const versionId = await createClauseVersion(orgId, clauseId, {
      text,
      sourceFormVersionId: formVersionId,
      sourceFormNumber: formNumber,
    }, userId);

    // Link it
    await createClauseLink(orgId, {
      clauseId,
      clauseVersionId: versionId,
      targetType: 'form_version',
      formVersionId,
      clauseName: newClauseName.trim(),
      clauseType,
      targetLabel: section.title,
    }, userId);

    setNewClauseName('');
    setCreateMode(null);
    await loadData();
    onLinksChanged?.();
  };

  const handleUnlink = async (linkId: string) => {
    await deleteClauseLink(orgId, linkId);
    await loadData();
    onLinksChanged?.();
  };

  return (
    <Container>
      {sections.length === 0 && (
        <HintText>No sections detected. Run ingestion first to detect form structure.</HintText>
      )}
      {sections.map(section => {
        const sectionCfg = SECTION_TYPE_CONFIG[section.type] || SECTION_TYPE_CONFIG.general;
        const links = sectionLinkMap.get(section.title) || [];
        const isExpanded = expandedSection === section.id;
        const isCreating = createMode === section.id;

        return (
          <SectionCard key={section.id} $linked={links.length > 0}>
            <SectionHeader>
              <TypeBadge $color={sectionCfg.color}>{sectionCfg.label}</TypeBadge>
              <SectionTitle>{section.title}</SectionTitle>
              <PageRef>
                {section.pageRefs.length === 1
                  ? `p.${section.pageRefs[0]}`
                  : `p.${Math.min(...section.pageRefs)}-${Math.max(...section.pageRefs)}`}
              </PageRef>
            </SectionHeader>

            {/* Existing links */}
            {links.map(link => (
              <LinkedClause key={link.id}>
                {link.clauseType && (
                  <TypeBadge $color={CLAUSE_TYPE_CONFIG[link.clauseType]?.color || '#94A3B8'}>
                    {CLAUSE_TYPE_CONFIG[link.clauseType]?.label || link.clauseType}
                  </TypeBadge>
                )}
                <LinkedName>{link.clauseName || link.clauseId}</LinkedName>
                <UnlinkBtn onClick={() => handleUnlink(link.id)}>unlink</UnlinkBtn>
              </LinkedClause>
            ))}

            {/* Tag actions */}
            {!isExpanded ? (
              <ActionRow>
                <SmallBtn onClick={() => { setExpandedSection(section.id); setCreateMode(null); }}>
                  + Tag to clause
                </SmallBtn>
              </ActionRow>
            ) : (
              <>
                <ActionRow>
                  <SmallSelect
                    value={selectedClauseIds[section.id] || ''}
                    onChange={e => setSelectedClauseIds(prev => ({ ...prev, [section.id]: e.target.value }))}
                  >
                    <option value="">Select existing clause...</option>
                    {allClauses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.canonicalName} ({CLAUSE_TYPE_CONFIG[c.type].label})
                      </option>
                    ))}
                  </SmallSelect>
                  <SmallBtn
                    $primary
                    onClick={() => handleLinkExisting(section)}
                    style={{ opacity: selectedClauseIds[section.id] ? 1 : 0.4 }}
                  >
                    Link
                  </SmallBtn>
                  <SmallBtn onClick={() => setCreateMode(section.id)}>or create new</SmallBtn>
                  <SmallBtn onClick={() => setExpandedSection(null)}>cancel</SmallBtn>
                </ActionRow>

                {isCreating && (
                  <NewClauseInline>
                    <SmallInput
                      placeholder="Clause name..."
                      value={newClauseName}
                      onChange={e => setNewClauseName(e.target.value)}
                    />
                    <SmallBtn $primary onClick={() => handleCreateAndLink(section)}>
                      Create & Link
                    </SmallBtn>
                  </NewClauseInline>
                )}
              </>
            )}
          </SectionCard>
        );
      })}
    </Container>
  );
};

export default ClauseTagging;
