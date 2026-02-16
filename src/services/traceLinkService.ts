/**
 * Trace Link Service
 *
 * Client-side Firestore service for clause → implementation trace links.
 *
 *   orgs/{orgId}/traceLinks/{traceId}
 *
 * Provides:
 *   - CRUD operations on trace links
 *   - Query by clause (for "Implemented By" panel)
 *   - Query by target (for "Supporting Clauses" panel)
 *   - Enriched views with clause text and target labels
 */

import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDoc, getDocs, query, where, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { orgTraceLinksPath, traceLinkDocPath } from '../repositories/paths';
import { clauseDocPath, clauseVersionsPath } from '../repositories/paths';
import type {
  TraceLink, TraceLinkTargetType, TraceWithClause, TraceWithTarget,
} from '../types/traceLink';
import type { ClauseType } from '../types/clause';

// ════════════════════════════════════════════════════════════════════════
// CRUD
// ════════════════════════════════════════════════════════════════════════

export async function createTraceLink(
  orgId: string,
  data: {
    clauseId: string;
    clauseVersionId: string;
    targetType: TraceLinkTargetType;
    ruleVersionId?: string;
    coverageVersionId?: string;
    rateProgramVersionId?: string;
    rationale: string;
    clauseName?: string;
    clauseType?: ClauseType;
    targetLabel?: string;
  },
  userId: string,
): Promise<string> {
  const colRef = collection(db, orgTraceLinksPath(orgId));
  const docRef = await addDoc(colRef, {
    orgId,
    ...data,
    createdAt: Timestamp.now(),
    createdBy: userId,
  });
  return docRef.id;
}

export async function updateTraceLink(
  orgId: string, traceId: string,
  data: Partial<Pick<TraceLink, 'rationale' | 'targetLabel'>>,
  userId: string,
): Promise<void> {
  const ref = doc(db, traceLinkDocPath(orgId, traceId));
  await updateDoc(ref, {
    ...data,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
}

export async function deleteTraceLink(orgId: string, traceId: string): Promise<void> {
  const ref = doc(db, traceLinkDocPath(orgId, traceId));
  await deleteDoc(ref);
}

export async function getTraceLink(orgId: string, traceId: string): Promise<TraceLink | null> {
  const ref = doc(db, traceLinkDocPath(orgId, traceId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as TraceLink;
}

// ════════════════════════════════════════════════════════════════════════
// Query: by clause (→ "Implemented By" panel on ClauseBrowser)
// ════════════════════════════════════════════════════════════════════════

/**
 * Get all trace links originating from a given clause.
 */
export async function getTraceLinksByClause(
  orgId: string, clauseId: string,
): Promise<TraceLink[]> {
  const colRef = collection(db, orgTraceLinksPath(orgId));
  const q = query(colRef, where('clauseId', '==', clauseId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TraceLink));
}

/**
 * Get all trace links for a specific clause version.
 */
export async function getTraceLinksByClauseVersion(
  orgId: string, clauseVersionId: string,
): Promise<TraceLink[]> {
  const colRef = collection(db, orgTraceLinksPath(orgId));
  const q = query(colRef, where('clauseVersionId', '==', clauseVersionId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TraceLink));
}

/**
 * Enriched view: trace links with target labels for the "Implemented By" panel.
 */
export async function getImplementedByForClause(
  orgId: string, clauseId: string,
): Promise<TraceWithTarget[]> {
  const links = await getTraceLinksByClause(orgId, clauseId);

  const TARGET_TYPE_LABELS: Record<TraceLinkTargetType, string> = {
    rule_version: 'Rule',
    coverage_version: 'Coverage',
    rate_program_version: 'Rate Program',
  };

  return links.map(link => ({
    traceLink: link,
    targetLabel: link.targetLabel || link.ruleVersionId || link.coverageVersionId || link.rateProgramVersionId || 'Unknown',
    targetTypeLabel: TARGET_TYPE_LABELS[link.targetType],
  }));
}

// ════════════════════════════════════════════════════════════════════════
// Query: by target (→ "Supporting Clauses" panel on Rule/Coverage editor)
// ════════════════════════════════════════════════════════════════════════

/**
 * Get all trace links pointing to a given target.
 */
export async function getTraceLinksByTarget(
  orgId: string,
  targetType: TraceLinkTargetType,
  targetId: string,
): Promise<TraceLink[]> {
  const colRef = collection(db, orgTraceLinksPath(orgId));
  const fieldMap: Record<TraceLinkTargetType, string> = {
    rule_version: 'ruleVersionId',
    coverage_version: 'coverageVersionId',
    rate_program_version: 'rateProgramVersionId',
  };
  const field = fieldMap[targetType];
  const q = query(colRef, where(field, '==', targetId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TraceLink));
}

/**
 * Enriched view: trace links with clause text snippets for the
 * "Supporting Clauses" panel on rule builder and coverage editor.
 */
export async function getSupportingClausesForTarget(
  orgId: string,
  targetType: TraceLinkTargetType,
  targetId: string,
): Promise<TraceWithClause[]> {
  const links = await getTraceLinksByTarget(orgId, targetType, targetId);
  if (links.length === 0) return [];

  const results: TraceWithClause[] = [];

  for (const link of links) {
    let clauseName = link.clauseName || '';
    let clauseType: ClauseType = link.clauseType || 'other';
    let clauseTextSnippet = '';
    let clauseVersionNumber = 0;

    // Try to enrich from Firestore
    try {
      if (!clauseName) {
        const clauseSnap = await getDoc(doc(db, clauseDocPath(orgId, link.clauseId)));
        if (clauseSnap.exists()) {
          const data = clauseSnap.data() as any;
          clauseName = data.canonicalName || '';
          clauseType = data.type || 'other';
        }
      }

      const versionsSnap = await getDocs(
        query(collection(db, clauseVersionsPath(orgId, link.clauseId)), where('__name__', '==', link.clauseVersionId)),
      );
      if (!versionsSnap.empty) {
        const vData = versionsSnap.docs[0].data() as any;
        clauseTextSnippet = (vData.text || '').slice(0, 200);
        clauseVersionNumber = vData.versionNumber || 0;
      }
    } catch {
      // Gracefully degrade — show what we have from denormalized fields
    }

    results.push({
      traceLink: link,
      clauseName: clauseName || link.clauseId,
      clauseType,
      clauseTextSnippet,
      clauseVersionNumber,
    });
  }

  return results;
}

// ════════════════════════════════════════════════════════════════════════
// Aggregate helpers
// ════════════════════════════════════════════════════════════════════════

/**
 * Get all trace links in an org (for analytics/reporting).
 */
export async function getAllTraceLinks(orgId: string): Promise<TraceLink[]> {
  const colRef = collection(db, orgTraceLinksPath(orgId));
  const snap = await getDocs(colRef);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TraceLink));
}

/**
 * Count trace links for a target (for badge display).
 */
export async function countTracesForTarget(
  orgId: string, targetType: TraceLinkTargetType, targetId: string,
): Promise<number> {
  const links = await getTraceLinksByTarget(orgId, targetType, targetId);
  return links.length;
}
