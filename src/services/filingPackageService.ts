/**
 * Filing Package Service
 *
 * Client-side Firestore + Storage + Cloud Function layer for filing packages.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, storage, functions, safeOnSnapshot } from '../firebase';
import logger, { LOG_CATEGORIES } from '../utils/logger';
import type {
  FilingPackage,
  FilingPackageStatus,
  BuildFilingPackageRequest,
  BuildFilingPackageResponse,
  FilingPackageScope,
} from '../types/filingPackage';

// ════════════════════════════════════════════════════════════════════════
// Path helpers
// ════════════════════════════════════════════════════════════════════════

const packagesCol = (orgId: string) => collection(db, `orgs/${orgId}/filingPackages`);
const packageDoc = (orgId: string, pkgId: string) => doc(db, `orgs/${orgId}/filingPackages/${pkgId}`);

// ════════════════════════════════════════════════════════════════════════
// Read
// ════════════════════════════════════════════════════════════════════════

export async function getFilingPackage(orgId: string, pkgId: string): Promise<FilingPackage | null> {
  const snap = await getDoc(packageDoc(orgId, pkgId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as FilingPackage;
}

export async function listFilingPackages(
  orgId: string,
  filters?: { changeSetId?: string; status?: FilingPackageStatus[]; stateCode?: string },
): Promise<FilingPackage[]> {
  let q = query(packagesCol(orgId), orderBy('requestedAt', 'desc'));

  if (filters?.changeSetId) {
    q = query(q, where('changeSetId', '==', filters.changeSetId));
  }
  if (filters?.status?.length) {
    q = query(q, where('status', 'in', filters.status));
  }

  const snap = await getDocs(q);
  let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as FilingPackage));

  if (filters?.stateCode) {
    results = results.filter(p => p.stateCode === filters.stateCode || p.scope === 'full');
  }

  return results;
}

/**
 * Real-time subscription to packages for a change set.
 */
export function subscribeToChangeSetPackages(
  orgId: string,
  changeSetId: string,
  callback: (packages: FilingPackage[]) => void,
): Unsubscribe {
  const q = query(
    packagesCol(orgId),
    where('changeSetId', '==', changeSetId),
    orderBy('requestedAt', 'desc'),
  );
  return safeOnSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as FilingPackage)));
  });
}

/**
 * Subscribe to a single package for build progress tracking.
 */
export function subscribeToPackage(
  orgId: string,
  pkgId: string,
  callback: (pkg: FilingPackage | null) => void,
): Unsubscribe {
  return safeOnSnapshot(packageDoc(orgId, pkgId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } as FilingPackage : null);
  });
}

// ════════════════════════════════════════════════════════════════════════
// Build
// ════════════════════════════════════════════════════════════════════════

/**
 * Request a new filing package build via Cloud Function.
 */
export async function requestBuild(
  orgId: string,
  changeSetId: string,
  scope: FilingPackageScope,
  stateCode?: string,
): Promise<BuildFilingPackageResponse> {
  const callable = httpsCallable<BuildFilingPackageRequest, BuildFilingPackageResponse>(
    functions,
    'buildFilingPackage',
  );
  const result = await callable({ orgId, changeSetId, scope, stateCode });
  logger.info(LOG_CATEGORIES.DATA, 'Filing package build requested', {
    changeSetId, scope, stateCode, packageId: result.data.packageId,
  });
  return result.data;
}

// ════════════════════════════════════════════════════════════════════════
// Download
// ════════════════════════════════════════════════════════════════════════

/**
 * Get a fresh download URL for a completed package.
 */
export async function getPackageDownloadUrl(storagePath: string): Promise<string> {
  const storageRef = ref(storage, storagePath);
  return getDownloadURL(storageRef);
}
