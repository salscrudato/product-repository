/**
 * Redline Compare Engine
 *
 * Pure computation: two sets of ingested sections/chunks → diffs + impact candidates.
 * No Firestore or network calls — the service layer handles data loading.
 *
 * Matching strategy:
 *   1. Sections: matched by path (section heading). If path matches, compare
 *      constituent chunk hashes. If all hashes match → unchanged; else → modified.
 *      Unmatched sections on left → removed; unmatched on right → added.
 *   2. Chunks: matched by sectionPath + index position. Hash comparison determines
 *      unchanged vs modified. Unmatched → added/removed.
 *   3. Impact: form-use links and clause links are mapped to changed sections
 *      to produce downstream impact candidates.
 */

import type {
  FormIngestionSection,
  FormIngestionChunk,
  FormSectionType,
} from '../types/ingestion';
import type {
  SectionDiff,
  SectionDiffStatus,
  ChunkDiff,
  ChunkDiffStatus,
  ImpactCandidate,
  ImpactTargetType,
  RedlineComparisonResult,
  RedlineStats,
} from '../types/redline';
import type { FormUse } from '../types/form';
import type { ClauseLink } from '../types/clause';

// ════════════════════════════════════════════════════════════════════════
// Section diff
// ════════════════════════════════════════════════════════════════════════

export interface RedlineInput {
  formId: string;
  formNumber: string;
  formTitle: string;
  leftVersionId: string;
  leftEditionDate: string;
  rightVersionId: string;
  rightEditionDate: string;
  leftSections: FormIngestionSection[];
  rightSections: FormIngestionSection[];
  leftChunks: FormIngestionChunk[];
  rightChunks: FormIngestionChunk[];
  /** Form-use links for the form (any version) */
  formUses: FormUse[];
  /** Clause links for the form versions */
  clauseLinks: ClauseLink[];
}

/**
 * Compute section-level diffs.
 *
 * Matching key: section.path (the heading text).
 * - Exact path match → compare chunk hashes to decide unchanged vs modified.
 * - Left-only → removed.
 * - Right-only → added.
 */
export function diffSections(
  leftSections: FormIngestionSection[],
  rightSections: FormIngestionSection[],
  leftChunks: FormIngestionChunk[],
  rightChunks: FormIngestionChunk[],
): SectionDiff[] {
  const diffs: SectionDiff[] = [];

  // Index right sections by path for O(1) lookup
  const rightByPath = new Map<string, FormIngestionSection>();
  for (const s of rightSections) {
    rightByPath.set(s.path, s);
  }

  const matchedRightPaths = new Set<string>();

  // Walk left sections
  for (const ls of leftSections) {
    const rs = rightByPath.get(ls.path);
    if (rs) {
      matchedRightPaths.add(ls.path);

      // Compare chunk hashes
      const leftHashes = getChunkHashesForSection(ls, leftChunks);
      const rightHashes = getChunkHashesForSection(rs, rightChunks);
      const isIdentical = leftHashes.length === rightHashes.length &&
        leftHashes.every((h, i) => h === rightHashes[i]);

      const status: SectionDiffStatus = isIdentical ? 'unchanged' : 'modified';

      const changedChunkHashes = !isIdentical
        ? buildChangedChunkHashes(leftHashes, rightHashes)
        : undefined;

      diffs.push({
        matchKey: ls.path,
        status,
        leftSection: ls,
        rightSection: rs,
        sectionType: ls.type,
        title: ls.title,
        changedChunkHashes,
        leftPages: ls.pageRefs,
        rightPages: rs.pageRefs,
      });
    } else {
      // Left only → removed
      diffs.push({
        matchKey: ls.path,
        status: 'removed',
        leftSection: ls,
        rightSection: null,
        sectionType: ls.type,
        title: ls.title,
        leftPages: ls.pageRefs,
      });
    }
  }

  // Right-only → added
  for (const rs of rightSections) {
    if (!matchedRightPaths.has(rs.path)) {
      diffs.push({
        matchKey: rs.path,
        status: 'added',
        leftSection: null,
        rightSection: rs,
        sectionType: rs.type,
        title: rs.title,
        rightPages: rs.pageRefs,
      });
    }
  }

  return diffs;
}

function getChunkHashesForSection(
  section: FormIngestionSection,
  chunks: FormIngestionChunk[],
): string[] {
  // Match chunks by the section path
  return chunks
    .filter(c => c.sectionPath === section.path)
    .sort((a, b) => a.index - b.index)
    .map(c => c.hash);
}

function buildChangedChunkHashes(
  leftHashes: string[],
  rightHashes: string[],
): { left: string; right: string }[] {
  const changes: { left: string; right: string }[] = [];
  const maxLen = Math.max(leftHashes.length, rightHashes.length);
  for (let i = 0; i < maxLen; i++) {
    const l = leftHashes[i] || '';
    const r = rightHashes[i] || '';
    if (l !== r) changes.push({ left: l, right: r });
  }
  return changes;
}

// ════════════════════════════════════════════════════════════════════════
// Chunk-level diff
// ════════════════════════════════════════════════════════════════════════

/**
 * Compute chunk-level diffs for drill-down.
 *
 * Matching key: sectionPath + chunk index within that section.
 */
export function diffChunks(
  leftChunks: FormIngestionChunk[],
  rightChunks: FormIngestionChunk[],
): ChunkDiff[] {
  const diffs: ChunkDiff[] = [];

  // Build keyed maps: "sectionPath::index"
  const keyOf = (c: FormIngestionChunk) => `${c.sectionPath}::${c.index}`;

  const rightByKey = new Map<string, FormIngestionChunk>();
  for (const c of rightChunks) rightByKey.set(keyOf(c), c);

  const matchedRightKeys = new Set<string>();

  for (const lc of leftChunks) {
    const key = keyOf(lc);
    // First try exact key match
    let rc = rightByKey.get(key);

    // If no exact key match, try matching by sectionPath alone for the same relative position
    if (!rc) {
      const rightInSection = rightChunks
        .filter(c => c.sectionPath === lc.sectionPath)
        .sort((a, b) => a.index - b.index);
      const leftInSection = leftChunks
        .filter(c => c.sectionPath === lc.sectionPath)
        .sort((a, b) => a.index - b.index);
      const posInLeft = leftInSection.findIndex(c => c.index === lc.index);
      if (posInLeft >= 0 && posInLeft < rightInSection.length) {
        rc = rightInSection[posInLeft];
      }
    }

    if (rc) {
      const rcKey = keyOf(rc);
      matchedRightKeys.add(rcKey);

      const status: ChunkDiffStatus = lc.hash === rc.hash ? 'unchanged' : 'modified';
      diffs.push({
        matchKey: key,
        status,
        leftChunk: lc,
        rightChunk: rc,
        leftText: lc.text,
        rightText: rc.text,
      });
    } else {
      diffs.push({
        matchKey: key,
        status: 'removed',
        leftChunk: lc,
        rightChunk: null,
        leftText: lc.text,
        rightText: '',
      });
    }
  }

  // Right-only
  for (const rc of rightChunks) {
    const key = keyOf(rc);
    if (!matchedRightKeys.has(key)) {
      diffs.push({
        matchKey: key,
        status: 'added',
        leftChunk: null,
        rightChunk: rc,
        leftText: '',
        rightText: rc.text,
      });
    }
  }

  return diffs;
}

// ════════════════════════════════════════════════════════════════════════
// Impact analysis
// ════════════════════════════════════════════════════════════════════════

/**
 * Derive downstream impact candidates from changed sections + form links.
 */
export function computeImpact(
  sectionDiffs: SectionDiff[],
  formUses: FormUse[],
  clauseLinks: ClauseLink[],
): ImpactCandidate[] {
  const changedKeys = sectionDiffs
    .filter(d => d.status !== 'unchanged')
    .map(d => d.matchKey);

  if (changedKeys.length === 0) return [];

  const candidates: ImpactCandidate[] = [];
  const seen = new Set<string>();

  // Severity based on section type
  const sectionSeverity = (d: SectionDiff): 'high' | 'medium' | 'low' => {
    const highTypes: FormSectionType[] = ['coverage', 'exclusion', 'insuring_agreement', 'limits'];
    const medTypes: FormSectionType[] = ['condition', 'definition', 'deductibles'];
    if (highTypes.includes(d.sectionType)) return 'high';
    if (medTypes.includes(d.sectionType)) return 'medium';
    return 'low';
  };

  const changedDiffs = sectionDiffs.filter(d => d.status !== 'unchanged');
  const maxSeverity = changedDiffs.reduce<'high' | 'medium' | 'low'>((best, d) => {
    const s = sectionSeverity(d);
    if (s === 'high') return 'high';
    if (s === 'medium' && best !== 'high') return 'medium';
    return best;
  }, 'low');

  // Impact from formUses → products, coverages, states
  for (const use of formUses) {
    // Products
    if (use.productVersionId) {
      const key = `product::${use.productVersionId}`;
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push({
          targetType: 'product',
          targetId: use.productVersionId,
          targetLabel: use.productName || use.productVersionId,
          reason: `Form is attached to this product (${use.useType})`,
          affectedSectionKeys: changedKeys,
          severity: maxSeverity,
        });
      }
    }

    // Coverages
    if (use.coverageVersionId) {
      const key = `coverage::${use.coverageVersionId}`;
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push({
          targetType: 'coverage',
          targetId: use.coverageVersionId,
          targetLabel: use.coverageName || use.coverageVersionId,
          reason: `Form scoped to this coverage (${use.useType})`,
          affectedSectionKeys: changedKeys,
          severity: maxSeverity,
        });
      }
    }

    // States
    if (use.stateCode) {
      const key = `state::${use.stateCode}`;
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push({
          targetType: 'state',
          targetId: use.stateCode,
          targetLabel: use.stateCode,
          reason: `Form has state-specific usage`,
          affectedSectionKeys: changedKeys,
          severity: 'low',
        });
      }
    }
  }

  // Impact from clauseLinks → clauses, rules, rate programs
  for (const link of clauseLinks) {
    if (link.ruleVersionId) {
      const key = `rule::${link.ruleVersionId}`;
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push({
          targetType: 'rule',
          targetId: link.ruleVersionId,
          targetLabel: link.targetLabel || link.ruleVersionId,
          reason: `Clause "${link.clauseName || link.clauseId}" is linked to this rule`,
          affectedSectionKeys: changedKeys,
          severity: 'medium',
        });
      }
    }

    if (link.clauseId) {
      const key = `clause::${link.clauseId}`;
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push({
          targetType: 'clause',
          targetId: link.clauseId,
          targetLabel: link.clauseName || link.clauseId,
          reason: `Clause is sourced from this form edition`,
          affectedSectionKeys: changedKeys,
          severity: 'medium',
        });
      }
    }
  }

  return candidates;
}

// ════════════════════════════════════════════════════════════════════════
// Statistics
// ════════════════════════════════════════════════════════════════════════

export function computeStats(
  sectionDiffs: SectionDiff[],
  chunkDiffs: ChunkDiff[],
  impactCandidates: ImpactCandidate[],
): RedlineStats {
  return {
    totalSections: sectionDiffs.length,
    unchangedSections: sectionDiffs.filter(d => d.status === 'unchanged').length,
    modifiedSections: sectionDiffs.filter(d => d.status === 'modified').length,
    addedSections: sectionDiffs.filter(d => d.status === 'added').length,
    removedSections: sectionDiffs.filter(d => d.status === 'removed').length,

    totalChunks: chunkDiffs.length,
    unchangedChunks: chunkDiffs.filter(d => d.status === 'unchanged').length,
    modifiedChunks: chunkDiffs.filter(d => d.status === 'modified').length,
    addedChunks: chunkDiffs.filter(d => d.status === 'added').length,
    removedChunks: chunkDiffs.filter(d => d.status === 'removed').length,

    impactCandidateCount: impactCandidates.length,
  };
}

// ════════════════════════════════════════════════════════════════════════
// Full comparison pipeline
// ════════════════════════════════════════════════════════════════════════

/**
 * Run the complete redline comparison.
 * Pure function: ingested data in → comparison result out.
 */
export function runRedlineComparison(input: RedlineInput): RedlineComparisonResult {
  const sectionDiffs = diffSections(
    input.leftSections,
    input.rightSections,
    input.leftChunks,
    input.rightChunks,
  );

  const chunkDiffs = diffChunks(input.leftChunks, input.rightChunks);

  const impactCandidates = computeImpact(sectionDiffs, input.formUses, input.clauseLinks);

  const stats = computeStats(sectionDiffs, chunkDiffs, impactCandidates);

  return {
    formId: input.formId,
    formNumber: input.formNumber,
    formTitle: input.formTitle,
    leftVersionId: input.leftVersionId,
    leftEditionDate: input.leftEditionDate,
    rightVersionId: input.rightVersionId,
    rightEditionDate: input.rightEditionDate,
    sectionDiffs,
    chunkDiffs,
    impactCandidates,
    stats,
  };
}
