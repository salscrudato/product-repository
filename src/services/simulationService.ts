/**
 * Simulation Service
 *
 * Client-side Firestore service for persisting and retrieving simulations.
 *
 * Path: orgs/{orgId}/simulations/{simulationId}
 */

import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { orgSimulationsPath, simulationDocPath } from '../repositories/paths';
import type { Simulation, SimulationStatus } from '../types/simulation';

// ════════════════════════════════════════════════════════════════════════
// CRUD
// ════════════════════════════════════════════════════════════════════════

export async function createSimulation(
  orgId: string,
  data: Omit<Simulation, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>,
): Promise<Simulation> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');

  const now = Timestamp.now();
  const ref = await addDoc(collection(db, orgSimulationsPath(orgId)), {
    ...data,
    createdAt: now,
    createdBy: uid,
    updatedAt: now,
    updatedBy: uid,
  });

  return { id: ref.id, ...data, createdAt: now, createdBy: uid, updatedAt: now, updatedBy: uid };
}

export async function getSimulation(orgId: string, simId: string): Promise<Simulation | null> {
  const snap = await getDoc(doc(db, simulationDocPath(orgId, simId)));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Simulation;
}

export async function listSimulations(
  orgId: string,
  filters?: { productId?: string },
): Promise<Simulation[]> {
  let q = query(collection(db, orgSimulationsPath(orgId)), orderBy('createdAt', 'desc'));

  if (filters?.productId) {
    q = query(collection(db, orgSimulationsPath(orgId)),
      where('productId', '==', filters.productId),
      orderBy('createdAt', 'desc'));
  }

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Simulation));
}

export async function updateSimulation(
  orgId: string,
  simId: string,
  data: Partial<Omit<Simulation, 'id' | 'createdAt' | 'createdBy'>>,
): Promise<void> {
  const uid = auth.currentUser?.uid;
  await updateDoc(doc(db, simulationDocPath(orgId, simId)), {
    ...data,
    updatedAt: Timestamp.now(),
    updatedBy: uid || 'system',
  });
}

export async function deleteSimulation(orgId: string, simId: string): Promise<void> {
  await deleteDoc(doc(db, simulationDocPath(orgId, simId)));
}
