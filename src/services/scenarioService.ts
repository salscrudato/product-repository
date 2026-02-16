/**
 * Scenario Service
 *
 * Client-side Firestore service for managing QA scenarios and regression runs.
 *
 * Paths:
 *   orgs/{orgId}/scenarios/{scenarioId}
 *   orgs/{orgId}/qaRuns/{runId}
 */

import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, Timestamp, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  orgScenariosPath, scenarioDocPath,
  orgQARunsPath, qaRunDocPath,
} from '../repositories/paths';
import type {
  Scenario, ScenarioTag,
  QARun, QARunStatus, QARunScenarioResult,
} from '../types/scenario';

// ════════════════════════════════════════════════════════════════════════
// Scenario CRUD
// ════════════════════════════════════════════════════════════════════════

export async function createScenario(
  orgId: string,
  data: Omit<Scenario, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>,
): Promise<Scenario> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');

  const now = Timestamp.now();
  const ref = await addDoc(collection(db, orgScenariosPath(orgId)), {
    ...data,
    createdAt: now,
    createdBy: uid,
    updatedAt: now,
    updatedBy: uid,
  });

  return { id: ref.id, ...data, createdAt: now, createdBy: uid, updatedAt: now, updatedBy: uid };
}

export async function getScenario(orgId: string, scenarioId: string): Promise<Scenario | null> {
  const snap = await getDoc(doc(db, scenarioDocPath(orgId, scenarioId)));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Scenario;
}

export async function listScenarios(
  orgId: string,
  filters?: { rateProgramId?: string; tags?: ScenarioTag[]; activeOnly?: boolean },
): Promise<Scenario[]> {
  let q = query(collection(db, orgScenariosPath(orgId)), orderBy('name', 'asc'));

  if (filters?.rateProgramId) {
    q = query(collection(db, orgScenariosPath(orgId)),
      where('rateProgramId', '==', filters.rateProgramId),
      orderBy('name', 'asc'));
  }

  const snap = await getDocs(q);
  let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Scenario));

  if (filters?.activeOnly) {
    results = results.filter(s => s.isActive);
  }
  if (filters?.tags && filters.tags.length > 0) {
    results = results.filter(s => s.tags.some(t => filters.tags!.includes(t)));
  }

  return results;
}

export async function updateScenario(
  orgId: string,
  scenarioId: string,
  data: Partial<Omit<Scenario, 'id' | 'createdAt' | 'createdBy'>>,
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');

  await updateDoc(doc(db, scenarioDocPath(orgId, scenarioId)), {
    ...data,
    updatedAt: Timestamp.now(),
    updatedBy: uid,
  });
}

export async function deleteScenario(orgId: string, scenarioId: string): Promise<void> {
  await deleteDoc(doc(db, scenarioDocPath(orgId, scenarioId)));
}

// ════════════════════════════════════════════════════════════════════════
// QA Run CRUD
// ════════════════════════════════════════════════════════════════════════

export async function createQARun(
  orgId: string,
  data: Omit<QARun, 'id' | 'triggeredAt' | 'triggeredBy'>,
): Promise<QARun> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');

  const now = Timestamp.now();
  const ref = await addDoc(collection(db, orgQARunsPath(orgId)), {
    ...data,
    triggeredAt: now,
    triggeredBy: uid,
  });

  return { id: ref.id, ...data, triggeredAt: now, triggeredBy: uid };
}

export async function getQARun(orgId: string, runId: string): Promise<QARun | null> {
  const snap = await getDoc(doc(db, qaRunDocPath(orgId, runId)));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as QARun;
}

export async function listQARuns(
  orgId: string,
  filters?: { changeSetId?: string; rateProgramId?: string },
): Promise<QARun[]> {
  let q = query(collection(db, orgQARunsPath(orgId)), orderBy('triggeredAt', 'desc'));

  if (filters?.changeSetId) {
    q = query(collection(db, orgQARunsPath(orgId)),
      where('changeSetId', '==', filters.changeSetId),
      orderBy('triggeredAt', 'desc'));
  } else if (filters?.rateProgramId) {
    q = query(collection(db, orgQARunsPath(orgId)),
      where('rateProgramId', '==', filters.rateProgramId),
      orderBy('triggeredAt', 'desc'));
  }

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as QARun));
}

export async function updateQARun(
  orgId: string,
  runId: string,
  data: Partial<Omit<QARun, 'id' | 'triggeredAt' | 'triggeredBy'>>,
): Promise<void> {
  await updateDoc(doc(db, qaRunDocPath(orgId, runId)), data);
}

// ════════════════════════════════════════════════════════════════════════
// Latest passing run for a change set
// ════════════════════════════════════════════════════════════════════════

export async function getLatestPassingRun(
  orgId: string,
  changeSetId: string,
): Promise<QARun | null> {
  const runs = await listQARuns(orgId, { changeSetId });
  return runs.find(r => r.status === 'passed') || null;
}
