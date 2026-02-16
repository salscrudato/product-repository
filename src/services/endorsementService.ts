/**
 * Endorsement Service
 *
 * CRUD for first-class endorsements with versioning.
 * Endorsements are org-scoped and can be attached to any coverage or template.
 */

import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, Timestamp, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import logger, { LOG_CATEGORIES } from '../utils/logger';
import type { OrgEndorsement, OrgEndorsementVersion } from '../types/coverageTemplate';
import type { VersionStatus } from '../types/versioning';

// ════════════════════════════════════════════════════════════════════════
// Path helpers
// ════════════════════════════════════════════════════════════════════════

const endorsementsCol = (orgId: string) => collection(db, `orgs/${orgId}/endorsements`);
const endorsementDoc = (orgId: string, id: string) => doc(db, `orgs/${orgId}/endorsements/${id}`);
const versionsCol = (orgId: string, endorsementId: string) =>
  collection(db, `orgs/${orgId}/endorsements/${endorsementId}/versions`);
const versionDoc = (orgId: string, endorsementId: string, versionId: string) =>
  doc(db, `orgs/${orgId}/endorsements/${endorsementId}/versions/${versionId}`);

// ════════════════════════════════════════════════════════════════════════
// Endorsement CRUD
// ════════════════════════════════════════════════════════════════════════

export async function getEndorsement(orgId: string, id: string): Promise<OrgEndorsement | null> {
  const snap = await getDoc(endorsementDoc(orgId, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as OrgEndorsement;
}

export async function listEndorsements(
  orgId: string,
  filters?: { activeOnly?: boolean; type?: string; search?: string },
): Promise<OrgEndorsement[]> {
  let q = query(endorsementsCol(orgId), orderBy('displayOrder', 'asc'));

  const snap = await getDocs(q);
  let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrgEndorsement));

  if (filters?.activeOnly !== false) {
    results = results.filter(e => e.isActive && !e.archived);
  }

  if (filters?.type) {
    results = results.filter(e => e.endorsementType === filters.type);
  }

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    results = results.filter(e =>
      e.title.toLowerCase().includes(s) ||
      e.endorsementCode.toLowerCase().includes(s) ||
      e.description?.toLowerCase().includes(s) ||
      e.compatibilityTags.some(t => t.toLowerCase().includes(s)),
    );
  }

  return results;
}

export async function createEndorsement(
  orgId: string,
  data: Omit<OrgEndorsement, 'id' | 'orgId' | 'versionCount' | 'usageCount' | 'archived' | 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt'>,
): Promise<OrgEndorsement> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const ref = doc(endorsementsCol(orgId));
  const now = serverTimestamp() as Timestamp;

  const endorsement: Omit<OrgEndorsement, 'id'> = {
    orgId,
    ...data,
    versionCount: 0,
    usageCount: 0,
    archived: false,
    createdBy: user.uid,
    createdAt: now,
    updatedBy: user.uid,
    updatedAt: now,
  };

  await setDoc(ref, endorsement);
  logger.info(LOG_CATEGORIES.DATA, 'Endorsement created', { endorsementId: ref.id, title: data.title });
  return { id: ref.id, ...endorsement };
}

export async function updateEndorsement(
  orgId: string,
  id: string,
  updates: Partial<Omit<OrgEndorsement, 'id' | 'orgId' | 'createdBy' | 'createdAt'>>,
): Promise<void> {
  const user = auth.currentUser;
  await updateDoc(endorsementDoc(orgId, id), {
    ...updates,
    updatedBy: user?.uid ?? '',
    updatedAt: serverTimestamp(),
  });
}

export async function archiveEndorsement(orgId: string, id: string): Promise<void> {
  await updateEndorsement(orgId, id, { archived: true, isActive: false });
  logger.info(LOG_CATEGORIES.DATA, 'Endorsement archived', { endorsementId: id });
}

// ════════════════════════════════════════════════════════════════════════
// Endorsement Version CRUD
// ════════════════════════════════════════════════════════════════════════

export async function getEndorsementVersions(
  orgId: string,
  endorsementId: string,
): Promise<OrgEndorsementVersion[]> {
  const snap = await getDocs(
    query(versionsCol(orgId, endorsementId), orderBy('versionNumber', 'desc')),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as OrgEndorsementVersion));
}

export async function getEndorsementVersion(
  orgId: string,
  endorsementId: string,
  versionId: string,
): Promise<OrgEndorsementVersion | null> {
  const snap = await getDoc(versionDoc(orgId, endorsementId, versionId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as OrgEndorsementVersion;
}

export async function createEndorsementVersion(
  orgId: string,
  endorsementId: string,
  data: Omit<OrgEndorsementVersion, 'id' | 'endorsementId' | 'versionNumber' | 'status' | 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt'>,
): Promise<OrgEndorsementVersion> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  // Determine next version number
  const existing = await getEndorsementVersions(orgId, endorsementId);
  const nextNum = existing.length > 0 ? Math.max(...existing.map(v => v.versionNumber)) + 1 : 1;

  const ref = doc(versionsCol(orgId, endorsementId));
  const now = serverTimestamp() as Timestamp;

  const version: Omit<OrgEndorsementVersion, 'id'> = {
    endorsementId,
    versionNumber: nextNum,
    status: 'draft',
    ...data,
    createdBy: user.uid,
    createdAt: now,
    updatedBy: user.uid,
    updatedAt: now,
  };

  await setDoc(ref, version);

  // Update parent endorsement
  await updateDoc(endorsementDoc(orgId, endorsementId), {
    latestDraftVersionId: ref.id,
    versionCount: nextNum,
    updatedAt: serverTimestamp(),
  });

  logger.info(LOG_CATEGORIES.DATA, 'Endorsement version created', {
    endorsementId, versionId: ref.id, versionNumber: nextNum,
  });

  return { id: ref.id, ...version };
}

export async function transitionEndorsementVersion(
  orgId: string,
  endorsementId: string,
  versionId: string,
  targetStatus: VersionStatus,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const updates: Record<string, unknown> = {
    status: targetStatus,
    updatedBy: user.uid,
    updatedAt: serverTimestamp(),
  };

  if (targetStatus === 'published') {
    updates.publishedBy = user.uid;
    updates.publishedAt = serverTimestamp();
  }

  await updateDoc(versionDoc(orgId, endorsementId, versionId), updates);

  // Update parent pointers
  if (targetStatus === 'published') {
    await updateDoc(endorsementDoc(orgId, endorsementId), {
      latestPublishedVersionId: versionId,
      updatedAt: serverTimestamp(),
    });
  }

  logger.info(LOG_CATEGORIES.DATA, 'Endorsement version transitioned', {
    endorsementId, versionId, targetStatus,
  });
}
