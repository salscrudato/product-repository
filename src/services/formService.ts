/**
 * Form Service
 *
 * Client-side Firestore service for org-scoped forms, form versions (editions),
 * and "where used" (formUses) CRUD and real-time subscriptions.
 *
 * Paths:
 *   orgs/{orgId}/forms/{formId}
 *   orgs/{orgId}/forms/{formId}/versions/{formVersionId}
 *   orgs/{orgId}/formUses/{useId}
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
  Unsubscribe,
} from 'firebase/firestore';
import { db, safeOnSnapshot } from '../firebase';
import { orgFormsPath, formVersionsPath, orgFormUsesPath } from '../repositories/paths';
import type {
  OrgForm,
  OrgFormVersion,
  FormUse,
  FormOrigin,
  FormType,
  FormUseType,
  FormWithStats,
  FormImpactResult,
  FormReadinessCheck,
} from '../types/form';
import type { VersionStatus } from '../types/versioning';

// ============================================================================
// Form CRUD
// ============================================================================

export async function createForm(
  orgId: string,
  data: {
    formNumber: string;
    title: string;
    isoOrManuscript: FormOrigin;
    type: FormType;
    description?: string;
    productIds?: string[];
  },
  userId: string,
): Promise<string> {
  const colRef = collection(db, orgFormsPath(orgId));
  const now = Timestamp.now();

  const docRef = await addDoc(colRef, {
    orgId,
    formNumber: data.formNumber,
    title: data.title,
    isoOrManuscript: data.isoOrManuscript,
    type: data.type,
    description: data.description || '',
    productIds: data.productIds || [],
    versionCount: 0,
    archived: false,
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
  });

  return docRef.id;
}

export async function getForm(
  orgId: string,
  formId: string,
): Promise<OrgForm | null> {
  const docRef = doc(db, orgFormsPath(orgId), formId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as OrgForm;
}

export async function getForms(
  orgId: string,
  filters?: { type?: FormType; origin?: FormOrigin; archived?: boolean },
): Promise<OrgForm[]> {
  const colRef = collection(db, orgFormsPath(orgId));
  let q = query(colRef, orderBy('formNumber'));

  if (filters?.type) {
    q = query(colRef, where('type', '==', filters.type), orderBy('formNumber'));
  }

  const snap = await getDocs(q);
  let forms = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrgForm));

  if (filters?.archived !== undefined) {
    forms = forms.filter(f => f.archived === filters.archived);
  }
  if (filters?.origin) {
    forms = forms.filter(f => f.isoOrManuscript === filters.origin);
  }

  return forms;
}

export async function updateForm(
  orgId: string,
  formId: string,
  data: Partial<Pick<OrgForm, 'formNumber' | 'title' | 'isoOrManuscript' | 'type' | 'description' | 'archived' | 'productIds'>>,
  userId: string,
): Promise<void> {
  const docRef = doc(db, orgFormsPath(orgId), formId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
}

export async function deleteForm(orgId: string, formId: string): Promise<void> {
  const docRef = doc(db, orgFormsPath(orgId), formId);
  await deleteDoc(docRef);
}

export function subscribeToForms(
  orgId: string,
  onData: (forms: OrgForm[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const colRef = collection(db, orgFormsPath(orgId));
  const q = query(colRef, orderBy('formNumber'));

  return safeOnSnapshot(
    q,
    (snap) => {
      const forms = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as OrgForm))
        .filter(f => !f.archived);
      onData(forms);
    },
    (err) => onError?.(err),
  );
}

// ============================================================================
// Form Version CRUD
// ============================================================================

export async function createFormVersion(
  orgId: string,
  formId: string,
  data: {
    editionDate: string;
    jurisdiction: string[];
    summary?: string;
    notes?: string;
    effectiveStart?: string | null;
    effectiveEnd?: string | null;
    storagePath?: string;
    checksum?: string;
  },
  userId: string,
): Promise<string> {
  // Get current version count
  const form = await getForm(orgId, formId);
  const versionNumber = (form?.versionCount ?? 0) + 1;

  const versionsRef = collection(db, formVersionsPath(orgId, formId));
  const now = Timestamp.now();

  const docRef = await addDoc(versionsRef, {
    formId,
    versionNumber,
    status: 'draft' as VersionStatus,
    editionDate: data.editionDate,
    jurisdiction: data.jurisdiction,
    effectiveStart: data.effectiveStart ?? null,
    effectiveEnd: data.effectiveEnd ?? null,
    storagePath: data.storagePath || '',
    checksum: data.checksum || '',
    extractedText: '',
    indexingStatus: 'pending',
    summary: data.summary || '',
    notes: data.notes || '',
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
  });

  // Update parent form version count and draft pointer
  const formRef = doc(db, orgFormsPath(orgId), formId);
  await updateDoc(formRef, {
    versionCount: versionNumber,
    latestDraftVersionId: docRef.id,
    updatedAt: now,
    updatedBy: userId,
  });

  return docRef.id;
}

export async function getFormVersion(
  orgId: string,
  formId: string,
  versionId: string,
): Promise<OrgFormVersion | null> {
  const docRef = doc(db, formVersionsPath(orgId, formId), versionId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as OrgFormVersion;
}

export async function getFormVersions(
  orgId: string,
  formId: string,
  status?: VersionStatus,
): Promise<OrgFormVersion[]> {
  const colRef = collection(db, formVersionsPath(orgId, formId));
  let q = query(colRef, orderBy('versionNumber', 'desc'));

  if (status) {
    q = query(colRef, where('status', '==', status), orderBy('versionNumber', 'desc'));
  }

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as OrgFormVersion));
}

export async function updateFormVersion(
  orgId: string,
  formId: string,
  versionId: string,
  data: Partial<Pick<
    OrgFormVersion,
    'editionDate' | 'jurisdiction' | 'summary' | 'notes' | 'effectiveStart' | 'effectiveEnd' | 'storagePath' | 'checksum'
  >>,
  userId: string,
): Promise<void> {
  const docRef = doc(db, formVersionsPath(orgId, formId), versionId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
}

export async function transitionFormVersion(
  orgId: string,
  formId: string,
  versionId: string,
  newStatus: VersionStatus,
  userId: string,
): Promise<void> {
  const docRef = doc(db, formVersionsPath(orgId, formId), versionId);
  const updates: Record<string, unknown> = {
    status: newStatus,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  };

  if (newStatus === 'published') {
    updates.publishedAt = Timestamp.now();
    updates.publishedBy = userId;
  }

  await updateDoc(docRef, updates);

  // Update parent quick-access pointers
  const formRef = doc(db, orgFormsPath(orgId), formId);
  if (newStatus === 'published') {
    await updateDoc(formRef, {
      latestPublishedVersionId: versionId,
      updatedAt: Timestamp.now(),
    });
  }
}

export async function cloneFormVersion(
  orgId: string,
  formId: string,
  sourceVersionId: string,
  userId: string,
): Promise<string> {
  const source = await getFormVersion(orgId, formId, sourceVersionId);
  if (!source) throw new Error('Source version not found');

  return createFormVersion(
    orgId,
    formId,
    {
      editionDate: source.editionDate,
      jurisdiction: [...source.jurisdiction],
      summary: `Cloned from v${source.versionNumber}`,
      effectiveStart: source.effectiveStart,
      effectiveEnd: source.effectiveEnd,
      storagePath: source.storagePath,
      checksum: source.checksum,
    },
    userId,
  );
}

export function subscribeToFormVersions(
  orgId: string,
  formId: string,
  onData: (versions: OrgFormVersion[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const colRef = collection(db, formVersionsPath(orgId, formId));
  const q = query(colRef, orderBy('versionNumber', 'desc'));

  return safeOnSnapshot(
    q,
    (snap) => {
      const versions = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrgFormVersion));
      onData(versions);
    },
    (err) => onError?.(err),
  );
}

// ============================================================================
// FormUse CRUD ("where used")
// ============================================================================

export async function createFormUse(
  orgId: string,
  data: {
    formId: string;
    formVersionId: string;
    productVersionId: string;
    coverageVersionId?: string;
    stateCode?: string;
    useType: FormUseType;
    formNumber?: string;
    formTitle?: string;
    productName?: string;
    coverageName?: string;
  },
  userId: string,
): Promise<string> {
  const colRef = collection(db, orgFormUsesPath(orgId));
  const now = Timestamp.now();

  const docRef = await addDoc(colRef, {
    orgId,
    formId: data.formId,
    formVersionId: data.formVersionId,
    productVersionId: data.productVersionId,
    coverageVersionId: data.coverageVersionId || null,
    stateCode: data.stateCode || null,
    useType: data.useType,
    formNumber: data.formNumber || '',
    formTitle: data.formTitle || '',
    productName: data.productName || '',
    coverageName: data.coverageName || '',
    createdAt: now,
    createdBy: userId,
  });

  return docRef.id;
}

export async function getFormUse(
  orgId: string,
  useId: string,
): Promise<FormUse | null> {
  const docRef = doc(db, orgFormUsesPath(orgId), useId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as FormUse;
}

export async function getFormUses(
  orgId: string,
  filters?: {
    formId?: string;
    formVersionId?: string;
    productVersionId?: string;
    stateCode?: string;
    coverageVersionId?: string;
    useType?: FormUseType;
  },
): Promise<FormUse[]> {
  const colRef = collection(db, orgFormUsesPath(orgId));
  let q = query(colRef, orderBy('createdAt', 'desc'));

  // Apply one filter at a time (Firestore limitation: one inequality per query)
  if (filters?.formId) {
    q = query(colRef, where('formId', '==', filters.formId), orderBy('createdAt', 'desc'));
  } else if (filters?.formVersionId) {
    q = query(colRef, where('formVersionId', '==', filters.formVersionId), orderBy('createdAt', 'desc'));
  } else if (filters?.productVersionId) {
    q = query(colRef, where('productVersionId', '==', filters.productVersionId), orderBy('createdAt', 'desc'));
  }

  const snap = await getDocs(q);
  let uses = snap.docs.map(d => ({ id: d.id, ...d.data() } as FormUse));

  // Client-side filter for additional fields
  if (filters?.stateCode) {
    uses = uses.filter(u => u.stateCode === filters.stateCode);
  }
  if (filters?.coverageVersionId) {
    uses = uses.filter(u => u.coverageVersionId === filters.coverageVersionId);
  }
  if (filters?.useType) {
    uses = uses.filter(u => u.useType === filters.useType);
  }
  // If we used a server filter above but also need formId, filter client-side
  if (filters?.formId && filters?.productVersionId) {
    uses = uses.filter(u => u.formId === filters.formId);
  }

  return uses;
}

export async function deleteFormUse(orgId: string, useId: string): Promise<void> {
  const docRef = doc(db, orgFormUsesPath(orgId), useId);
  await deleteDoc(docRef);
}

export function subscribeToFormUses(
  orgId: string,
  filters: { formId?: string; productVersionId?: string },
  onData: (uses: FormUse[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const colRef = collection(db, orgFormUsesPath(orgId));
  let q = query(colRef, orderBy('createdAt', 'desc'));

  if (filters.formId) {
    q = query(colRef, where('formId', '==', filters.formId), orderBy('createdAt', 'desc'));
  } else if (filters.productVersionId) {
    q = query(colRef, where('productVersionId', '==', filters.productVersionId), orderBy('createdAt', 'desc'));
  }

  return safeOnSnapshot(
    q,
    (snap) => {
      const uses = snap.docs.map(d => ({ id: d.id, ...d.data() } as FormUse));
      onData(uses);
    },
    (err) => onError?.(err),
  );
}

// ============================================================================
// Aggregation Helpers
// ============================================================================

/**
 * Load forms with aggregated stats (version count, usage count).
 */
export async function getFormsWithStats(orgId: string): Promise<FormWithStats[]> {
  const forms = await getForms(orgId, { archived: false });
  const allUses = await getFormUses(orgId);

  const result: FormWithStats[] = [];

  for (const form of forms) {
    const versions = await getFormVersions(orgId, form.id);
    const publishedVersions = versions.filter(v => v.status === 'published');
    const formUses = allUses.filter(u => u.formId === form.id);

    result.push({
      form,
      publishedVersionCount: publishedVersions.length,
      totalUses: formUses.length,
      latestEditionDate: versions.length > 0 ? versions[0].editionDate : undefined,
    });
  }

  return result;
}

/**
 * Get impact analysis for a specific form version change.
 * Returns all downstream artifacts that are affected.
 */
export async function getFormImpact(
  orgId: string,
  formId: string,
  formVersionId: string,
): Promise<FormImpactResult> {
  const form = await getForm(orgId, formId);
  const version = await getFormVersion(orgId, formId, formVersionId);
  if (!form || !version) throw new Error('Form or version not found');

  const uses = await getFormUses(orgId, { formVersionId });

  const affectedProductVersionIds = [...new Set(uses.map(u => u.productVersionId))];
  const affectedCoverageVersionIds = [...new Set(uses.filter(u => u.coverageVersionId).map(u => u.coverageVersionId!))];
  const affectedStates = [...new Set(uses.filter(u => u.stateCode).map(u => u.stateCode!))];

  return {
    formId,
    formVersionId,
    formNumber: form.formNumber,
    formTitle: form.title,
    editionDate: version.editionDate,
    affectedUses: uses,
    affectedProductVersionIds,
    affectedCoverageVersionIds,
    affectedStates,
    requiresReApproval: uses.length > 0,
  };
}

/**
 * Check readiness of forms for product dashboard (Product 360).
 */
export async function checkFormReadiness(orgId: string): Promise<FormReadinessCheck> {
  const forms = await getForms(orgId, { archived: false });
  const allUses = await getFormUses(orgId);
  const issues: string[] = [];

  let publishedForms = 0;
  let draftForms = 0;
  const unpublishedFormIds: string[] = [];
  const draftFormsInUse: Array<{ formId: string; formNumber: string; productVersionIds: string[] }> = [];
  const orphanedForms: Array<{ formId: string; formNumber: string }> = [];

  for (const form of forms) {
    const versions = await getFormVersions(orgId, form.id);
    const hasPublished = versions.some(v => v.status === 'published');
    const hasDraft = versions.some(v => v.status === 'draft');
    const formUses = allUses.filter(u => u.formId === form.id);

    if (hasPublished) {
      publishedForms++;
    } else {
      unpublishedFormIds.push(form.id);
      issues.push(`Form "${form.formNumber}" has no published editions`);
    }

    if (hasDraft) {
      draftForms++;
    }

    // Check if draft forms are referenced in uses
    if (!hasPublished && formUses.length > 0) {
      draftFormsInUse.push({
        formId: form.id,
        formNumber: form.formNumber,
        productVersionIds: [...new Set(formUses.map(u => u.productVersionId))],
      });
      issues.push(`Form "${form.formNumber}" is used in products but has no published edition`);
    }

    // Check for orphaned forms (no uses)
    if (formUses.length === 0) {
      orphanedForms.push({ formId: form.id, formNumber: form.formNumber });
    }
  }

  return {
    totalForms: forms.length,
    publishedForms,
    draftForms,
    totalUses: allUses.length,
    unpublishedFormIds,
    draftFormsInUse,
    orphanedForms,
    issues,
    healthy: issues.length === 0,
  };
}
