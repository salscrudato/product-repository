/**
 * Rate Program Service
 * 
 * Client-side service for rate program CRUD and version management.
 * Manages rate programs, versions, and rating steps within org scope.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, safeOnSnapshot } from '../firebase';
import type {
  RateProgram,
  RateProgramVersion,
  RateProgramVersionStatus,
  RatingStep,
  RatingTestCase,
} from '../types/ratingEngine';
import { hashSteps } from '../engine/hashUtils';
import { validateDeterminism } from '../engine/ratingEngine';
import type { DeterminismValidationResult } from '../types/ratingEngine';

// ============================================================================
// Collection Paths
// ============================================================================

const getRateProgramsPath = (orgId: string) =>
  `orgs/${orgId}/ratePrograms`;

const getRateProgramVersionsPath = (orgId: string, rateProgramId: string) =>
  `orgs/${orgId}/ratePrograms/${rateProgramId}/versions`;

const getStepsPath = (orgId: string, rateProgramId: string, versionId: string) =>
  `orgs/${orgId}/ratePrograms/${rateProgramId}/versions/${versionId}/steps`;

const getTestCasesPath = (orgId: string, rateProgramId: string) =>
  `orgs/${orgId}/ratePrograms/${rateProgramId}/testCases`;

// ============================================================================
// Rate Program CRUD
// ============================================================================

export async function createRateProgram(
  orgId: string,
  data: Omit<RateProgram, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<string> {
  const colRef = collection(db, getRateProgramsPath(orgId));
  const now = Timestamp.now();
  
  const docRef = await addDoc(colRef, {
    ...data,
    orgId,
    status: 'active',
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
  });

  return docRef.id;
}

export async function getRateProgram(
  orgId: string,
  rateProgramId: string
): Promise<RateProgram | null> {
  const docRef = doc(db, getRateProgramsPath(orgId), rateProgramId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as RateProgram;
}

export async function getRatePrograms(
  orgId: string,
  status?: 'active' | 'inactive'
): Promise<RateProgram[]> {
  const colRef = collection(db, getRateProgramsPath(orgId));
  let q = query(colRef, orderBy('name'));
  
  if (status) {
    q = query(colRef, where('status', '==', status), orderBy('name'));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RateProgram));
}

export function subscribeToRatePrograms(
  orgId: string,
  callback: (programs: RateProgram[]) => void
): Unsubscribe {
  const colRef = collection(db, getRateProgramsPath(orgId));
  const q = query(colRef, orderBy('name'));
  
  return safeOnSnapshot(q, (snapshot) => {
    const programs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RateProgram));
    callback(programs);
  });
}

export async function updateRateProgram(
  orgId: string,
  rateProgramId: string,
  data: Partial<RateProgram>,
  userId: string
): Promise<void> {
  const docRef = doc(db, getRateProgramsPath(orgId), rateProgramId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
}

export async function deleteRateProgram(
  orgId: string,
  rateProgramId: string
): Promise<void> {
  const docRef = doc(db, getRateProgramsPath(orgId), rateProgramId);
  await deleteDoc(docRef);
}

// ============================================================================
// Rate Program Version CRUD
// ============================================================================

export async function createVersion(
  orgId: string,
  rateProgramId: string,
  userId: string
): Promise<string> {
  const colRef = collection(db, getRateProgramVersionsPath(orgId, rateProgramId));
  
  // Get the latest version number
  const existingVersions = await getDocs(
    query(colRef, orderBy('versionNumber', 'desc'))
  );
  const latestVersion = existingVersions.docs[0]?.data()?.versionNumber || 0;
  
  const now = Timestamp.now();
  const docRef = await addDoc(colRef, {
    rateProgramId,
    versionNumber: latestVersion + 1,
    status: 'draft' as RateProgramVersionStatus,
    createdAt: now,
    createdBy: userId,
  });

  return docRef.id;
}

export async function getVersion(
  orgId: string,
  rateProgramId: string,
  versionId: string
): Promise<RateProgramVersion | null> {
  const docRef = doc(db, getRateProgramVersionsPath(orgId, rateProgramId), versionId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as RateProgramVersion;
}

export async function getVersions(
  orgId: string,
  rateProgramId: string
): Promise<RateProgramVersion[]> {
  const colRef = collection(db, getRateProgramVersionsPath(orgId, rateProgramId));
  const q = query(colRef, orderBy('versionNumber', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RateProgramVersion));
}

export async function getPublishedVersion(
  orgId: string,
  rateProgramId: string,
  effectiveDate?: Date
): Promise<RateProgramVersion | null> {
  const colRef = collection(db, getRateProgramVersionsPath(orgId, rateProgramId));
  const q = query(
    colRef,
    where('status', '==', 'published'),
    orderBy('versionNumber', 'desc')
  );

  const snapshot = await getDocs(q);
  const versions = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RateProgramVersion));

  if (!effectiveDate) {
    return versions[0] || null;
  }

  // Find version effective on the given date
  for (const version of versions) {
    const start = version.effectiveStart instanceof Timestamp
      ? version.effectiveStart.toDate()
      : version.effectiveStart;
    const end = version.effectiveEnd instanceof Timestamp
      ? version.effectiveEnd.toDate()
      : version.effectiveEnd;

    if (start && effectiveDate >= start && (!end || effectiveDate <= end)) {
      return version;
    }
  }

  return null;
}

export async function updateVersion(
  orgId: string,
  rateProgramId: string,
  versionId: string,
  data: Partial<RateProgramVersion>
): Promise<void> {
  const docRef = doc(db, getRateProgramVersionsPath(orgId, rateProgramId), versionId);
  await updateDoc(docRef, data);
}

/**
 * Validate a rate program version for determinism issues.
 * Call this before publishing to ensure the program will produce
 * consistent results.
 */
export async function validateVersion(
  orgId: string,
  rateProgramId: string,
  versionId: string,
  availableFieldCodes: string[]
): Promise<DeterminismValidationResult> {
  const steps = await getSteps(orgId, rateProgramId, versionId);
  return validateDeterminism(steps, availableFieldCodes);
}

/**
 * Publish a rate program version.
 * @throws Error if the version fails determinism validation
 */
export async function publishVersion(
  orgId: string,
  rateProgramId: string,
  versionId: string,
  userId: string,
  effectiveStart: Date,
  effectiveEnd?: Date,
  availableFieldCodes: string[] = []
): Promise<void> {
  const versionRef = doc(db, getRateProgramVersionsPath(orgId, rateProgramId), versionId);

  // Get steps to compute hash and validate
  const steps = await getSteps(orgId, rateProgramId, versionId);

  // Validate determinism before publishing
  const validation = validateDeterminism(steps, availableFieldCodes);
  if (!validation.isValid) {
    const errorMessages = validation.errors.map(e => e.message).join('; ');
    throw new Error(`Cannot publish: determinism validation failed. ${errorMessages}`);
  }

  const stepsHash = hashSteps(steps as unknown as { id: string; [key: string]: unknown }[]);

  await updateDoc(versionRef, {
    status: 'published' as RateProgramVersionStatus,
    publishedAt: Timestamp.now(),
    publishedBy: userId,
    effectiveStart: Timestamp.fromDate(effectiveStart),
    effectiveEnd: effectiveEnd ? Timestamp.fromDate(effectiveEnd) : null,
    stepsHash,
    // Store validation results for audit
    validationWarnings: validation.warnings.length,
    lastValidatedAt: Timestamp.now(),
  });
}

// ============================================================================
// Rating Steps CRUD
// ============================================================================

export async function getSteps(
  orgId: string,
  rateProgramId: string,
  versionId: string
): Promise<RatingStep[]> {
  const colRef = collection(db, getStepsPath(orgId, rateProgramId, versionId));
  const q = query(colRef, orderBy('order'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RatingStep));
}

export function subscribeToSteps(
  orgId: string,
  rateProgramId: string,
  versionId: string,
  callback: (steps: RatingStep[]) => void
): Unsubscribe {
  const colRef = collection(db, getStepsPath(orgId, rateProgramId, versionId));
  const q = query(colRef, orderBy('order'));

  return safeOnSnapshot(q, (snapshot) => {
    const steps = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RatingStep));
    callback(steps);
  });
}

export async function addStep(
  orgId: string,
  rateProgramId: string,
  versionId: string,
  step: Omit<RatingStep, 'id' | 'rateProgramVersionId'>
): Promise<string> {
  const colRef = collection(db, getStepsPath(orgId, rateProgramId, versionId));
  const docRef = await addDoc(colRef, {
    ...step,
    rateProgramVersionId: versionId,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateStep(
  orgId: string,
  rateProgramId: string,
  versionId: string,
  stepId: string,
  data: Partial<RatingStep>
): Promise<void> {
  const docRef = doc(db, getStepsPath(orgId, rateProgramId, versionId), stepId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteStep(
  orgId: string,
  rateProgramId: string,
  versionId: string,
  stepId: string
): Promise<void> {
  const docRef = doc(db, getStepsPath(orgId, rateProgramId, versionId), stepId);
  await deleteDoc(docRef);
}

export async function reorderSteps(
  orgId: string,
  rateProgramId: string,
  versionId: string,
  stepIds: string[]
): Promise<void> {
  const batch = writeBatch(db);

  stepIds.forEach((stepId, index) => {
    const docRef = doc(db, getStepsPath(orgId, rateProgramId, versionId), stepId);
    batch.update(docRef, { order: index + 1 });
  });

  await batch.commit();
}

// ============================================================================
// Test Cases CRUD
// ============================================================================

export async function getTestCases(
  orgId: string,
  rateProgramId: string
): Promise<RatingTestCase[]> {
  const colRef = collection(db, getTestCasesPath(orgId, rateProgramId));
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RatingTestCase));
}

export async function addTestCase(
  orgId: string,
  rateProgramId: string,
  testCase: Omit<RatingTestCase, 'id'>
): Promise<string> {
  const colRef = collection(db, getTestCasesPath(orgId, rateProgramId));
  const docRef = await addDoc(colRef, testCase);
  return docRef.id;
}

export async function updateTestCase(
  orgId: string,
  rateProgramId: string,
  testCaseId: string,
  data: Partial<RatingTestCase>
): Promise<void> {
  const docRef = doc(db, getTestCasesPath(orgId, rateProgramId), testCaseId);
  await updateDoc(docRef, data);
}

export async function deleteTestCase(
  orgId: string,
  rateProgramId: string,
  testCaseId: string
): Promise<void> {
  const docRef = doc(db, getTestCasesPath(orgId, rateProgramId), testCaseId);
  await deleteDoc(docRef);
}

// ============================================================================
// Clone Version
// ============================================================================

export async function cloneVersion(
  orgId: string,
  rateProgramId: string,
  sourceVersionId: string,
  userId: string
): Promise<string> {
  // Create new version
  const newVersionId = await createVersion(orgId, rateProgramId, userId);

  // Copy all steps from source version
  const sourceSteps = await getSteps(orgId, rateProgramId, sourceVersionId);

  for (const step of sourceSteps) {
    const { id, rateProgramVersionId, createdAt, updatedAt, ...stepData } = step;
    await addStep(orgId, rateProgramId, newVersionId, stepData);
  }

  return newVersionId;
}
