/**
 * Clause Service
 *
 * Client-side Firestore service for the clause library:
 *   - Clause CRUD (orgs/{orgId}/clauses/{clauseId})
 *   - Clause version CRUD (orgs/{orgId}/clauses/{clauseId}/versions/{vId})
 *   - Clause link CRUD ("where used") (orgs/{orgId}/clauseLinks/{linkId})
 *   - Search / filter / where-used queries
 */

import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDoc, getDocs, query, where, orderBy,
  Timestamp, Unsubscribe,
} from 'firebase/firestore';
import { db, safeOnSnapshot } from '../firebase';
import {
  orgClausesPath, clauseDocPath, clauseVersionsPath,
  orgClauseLinksPath, clauseLinkDocPath,
} from '../repositories/paths';
import type {
  OrgClause, ClauseVersion, ClauseLink, ClauseType,
  ClauseWithStats, ClauseWhereUsedEntry, ClauseImpactResult,
  ClauseLinkTargetType,
} from '../types/clause';
import type { VersionStatus } from '../types/versioning';
import type { ContentAnchor } from '../types/ingestion';

// ════════════════════════════════════════════════════════════════════════
// Clause CRUD
// ════════════════════════════════════════════════════════════════════════

export async function createClause(
  orgId: string,
  data: {
    canonicalName: string;
    type: ClauseType;
    tags?: string[];
    description?: string;
  },
  userId: string,
): Promise<string> {
  const colRef = collection(db, orgClausesPath(orgId));
  const now = Timestamp.now();
  const docRef = await addDoc(colRef, {
    orgId,
    canonicalName: data.canonicalName,
    type: data.type,
    tags: data.tags || [],
    description: data.description || '',
    versionCount: 0,
    archived: false,
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
  });
  return docRef.id;
}

export async function getClause(orgId: string, clauseId: string): Promise<OrgClause | null> {
  const ref = doc(db, clauseDocPath(orgId, clauseId));
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } as OrgClause : null;
}

export async function getClauses(
  orgId: string,
  filters?: { type?: ClauseType; tag?: string; archived?: boolean },
): Promise<OrgClause[]> {
  const colRef = collection(db, orgClausesPath(orgId));
  let q = query(colRef, orderBy('canonicalName'));
  const snap = await getDocs(q);
  let clauses = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrgClause));

  if (filters?.archived !== undefined) {
    clauses = clauses.filter(c => c.archived === filters.archived);
  }
  if (filters?.type) {
    clauses = clauses.filter(c => c.type === filters.type);
  }
  if (filters?.tag) {
    clauses = clauses.filter(c => c.tags.includes(filters.tag!));
  }
  return clauses;
}

export function subscribeToClauses(
  orgId: string,
  onData: (clauses: OrgClause[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const colRef = collection(db, orgClausesPath(orgId));
  const q = query(colRef, orderBy('canonicalName'));
  return safeOnSnapshot(
    q,
    snap => {
      const clauses = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as OrgClause))
        .filter(c => !c.archived);
      onData(clauses);
    },
    err => onError?.(err),
  );
}

export async function updateClause(
  orgId: string,
  clauseId: string,
  data: Partial<Pick<OrgClause, 'canonicalName' | 'type' | 'tags' | 'description' | 'archived'>>,
  userId: string,
): Promise<void> {
  const ref = doc(db, clauseDocPath(orgId, clauseId));
  await updateDoc(ref, {
    ...data,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
}

export async function deleteClause(orgId: string, clauseId: string): Promise<void> {
  const ref = doc(db, clauseDocPath(orgId, clauseId));
  await deleteDoc(ref);
}

// ════════════════════════════════════════════════════════════════════════
// Clause Version CRUD
// ════════════════════════════════════════════════════════════════════════

export async function createClauseVersion(
  orgId: string,
  clauseId: string,
  data: {
    text: string;
    anchors?: ContentAnchor[];
    sourceFormVersionId?: string;
    sourceFormNumber?: string;
    effectiveStart?: string | null;
    effectiveEnd?: string | null;
    summary?: string;
    notes?: string;
  },
  userId: string,
): Promise<string> {
  const clause = await getClause(orgId, clauseId);
  const versionNumber = (clause?.versionCount ?? 0) + 1;
  const versionsRef = collection(db, clauseVersionsPath(orgId, clauseId));
  const now = Timestamp.now();

  const docRef = await addDoc(versionsRef, {
    clauseId,
    versionNumber,
    text: data.text,
    anchors: data.anchors || [],
    sourceFormVersionId: data.sourceFormVersionId || null,
    sourceFormNumber: data.sourceFormNumber || null,
    status: 'draft' as VersionStatus,
    effectiveStart: data.effectiveStart ?? null,
    effectiveEnd: data.effectiveEnd ?? null,
    summary: data.summary || '',
    notes: data.notes || '',
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
  });

  // Update parent clause
  const clauseRef = doc(db, clauseDocPath(orgId, clauseId));
  await updateDoc(clauseRef, {
    versionCount: versionNumber,
    latestDraftVersionId: docRef.id,
    updatedAt: now,
    updatedBy: userId,
  });

  return docRef.id;
}

export async function getClauseVersion(
  orgId: string, clauseId: string, versionId: string,
): Promise<ClauseVersion | null> {
  const ref = doc(db, clauseVersionsPath(orgId, clauseId), versionId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } as ClauseVersion : null;
}

export async function getClauseVersions(
  orgId: string, clauseId: string, status?: VersionStatus,
): Promise<ClauseVersion[]> {
  const colRef = collection(db, clauseVersionsPath(orgId, clauseId));
  let q = query(colRef, orderBy('versionNumber', 'desc'));
  if (status) {
    q = query(colRef, where('status', '==', status), orderBy('versionNumber', 'desc'));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ClauseVersion));
}

export async function transitionClauseVersion(
  orgId: string, clauseId: string, versionId: string,
  newStatus: VersionStatus, userId: string,
): Promise<void> {
  const ref = doc(db, clauseVersionsPath(orgId, clauseId), versionId);
  const updates: Record<string, unknown> = {
    status: newStatus,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  };
  if (newStatus === 'published') {
    updates.publishedAt = Timestamp.now();
    updates.publishedBy = userId;
  }
  await updateDoc(ref, updates);

  // Update parent pointer
  if (newStatus === 'published') {
    const clauseRef = doc(db, clauseDocPath(orgId, clauseId));
    await updateDoc(clauseRef, {
      latestPublishedVersionId: versionId,
      updatedAt: Timestamp.now(),
    });
  }
}

// ════════════════════════════════════════════════════════════════════════
// Clause Links (where-used)
// ════════════════════════════════════════════════════════════════════════

export async function createClauseLink(
  orgId: string,
  data: {
    clauseId: string;
    clauseVersionId: string;
    targetType: ClauseLinkTargetType;
    productVersionId?: string;
    coverageVersionId?: string;
    ruleVersionId?: string;
    formVersionId?: string;
    stateCode?: string;
    clauseName?: string;
    clauseType?: ClauseType;
    targetLabel?: string;
  },
  userId: string,
): Promise<string> {
  const colRef = collection(db, orgClauseLinksPath(orgId));
  const docRef = await addDoc(colRef, {
    orgId,
    ...data,
    createdAt: Timestamp.now(),
    createdBy: userId,
  });
  return docRef.id;
}

export async function deleteClauseLink(orgId: string, linkId: string): Promise<void> {
  const ref = doc(db, clauseLinkDocPath(orgId, linkId));
  await deleteDoc(ref);
}

export async function getClauseLinks(orgId: string, clauseId: string): Promise<ClauseLink[]> {
  const colRef = collection(db, orgClauseLinksPath(orgId));
  const q = query(colRef, where('clauseId', '==', clauseId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ClauseLink));
}

export async function getClauseLinksByVersion(
  orgId: string, clauseVersionId: string,
): Promise<ClauseLink[]> {
  const colRef = collection(db, orgClauseLinksPath(orgId));
  const q = query(colRef, where('clauseVersionId', '==', clauseVersionId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ClauseLink));
}

export async function getLinksForTarget(
  orgId: string,
  targetType: ClauseLinkTargetType,
  targetId: string,
): Promise<ClauseLink[]> {
  const colRef = collection(db, orgClauseLinksPath(orgId));
  const fieldMap: Record<ClauseLinkTargetType, string> = {
    product_version: 'productVersionId',
    coverage_version: 'coverageVersionId',
    rule_version: 'ruleVersionId',
    form_version: 'formVersionId',
  };
  const field = fieldMap[targetType];
  const q = query(colRef, where(field, '==', targetId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ClauseLink));
}

// ════════════════════════════════════════════════════════════════════════
// Aggregate queries
// ════════════════════════════════════════════════════════════════════════

export async function getClausesWithStats(orgId: string): Promise<ClauseWithStats[]> {
  const [clauses, allLinks] = await Promise.all([
    getClauses(orgId, { archived: false }),
    getDocs(collection(db, orgClauseLinksPath(orgId))),
  ]);

  const linksMap = new Map<string, number>();
  allLinks.docs.forEach(d => {
    const cid = d.data().clauseId as string;
    linksMap.set(cid, (linksMap.get(cid) || 0) + 1);
  });

  const results: ClauseWithStats[] = [];
  for (const clause of clauses) {
    let publishedVersionCount = 0;
    let latestVersionText: string | undefined;
    try {
      const versions = await getClauseVersions(orgId, clause.id);
      publishedVersionCount = versions.filter(v => v.status === 'published').length;
      latestVersionText = versions[0]?.text?.slice(0, 200);
    } catch { /* ignore */ }

    results.push({
      clause,
      publishedVersionCount,
      linkCount: linksMap.get(clause.id) || 0,
      latestVersionText,
    });
  }
  return results;
}

export async function getClauseWhereUsed(
  orgId: string, clauseId: string,
): Promise<ClauseWhereUsedEntry[]> {
  const links = await getClauseLinks(orgId, clauseId);

  const TARGET_TYPE_LABELS: Record<ClauseLinkTargetType, string> = {
    product_version: 'Product',
    coverage_version: 'Coverage',
    rule_version: 'Rule',
    form_version: 'Form',
  };

  return links.map(link => ({
    link,
    targetLabel: link.targetLabel || link.productVersionId || link.formVersionId || 'Unknown',
    targetTypeLabel: TARGET_TYPE_LABELS[link.targetType],
  }));
}

export async function getClauseImpact(
  orgId: string, clauseId: string, clauseVersionId: string,
): Promise<ClauseImpactResult> {
  const clause = await getClause(orgId, clauseId);
  const links = await getClauseLinksByVersion(orgId, clauseVersionId);

  const productVersionIds = [...new Set(links.map(l => l.productVersionId).filter(Boolean) as string[])];
  const states = [...new Set(links.map(l => l.stateCode).filter(Boolean) as string[])];

  return {
    clauseId,
    clauseVersionId,
    clauseName: clause?.canonicalName || '',
    clauseType: clause?.type || 'other',
    affectedLinks: links,
    affectedProductVersionIds: productVersionIds,
    affectedStates: states,
    totalTargets: links.length,
  };
}

// ════════════════════════════════════════════════════════════════════════
// Tag helpers
// ════════════════════════════════════════════════════════════════════════

/** Collect all unique tags across org clauses */
export async function getAllClauseTags(orgId: string): Promise<string[]> {
  const clauses = await getClauses(orgId, { archived: false });
  const tagSet = new Set<string>();
  for (const c of clauses) {
    for (const t of c.tags) tagSet.add(t);
  }
  return [...tagSet].sort();
}
