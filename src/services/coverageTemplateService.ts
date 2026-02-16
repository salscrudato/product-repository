/**
 * Coverage Template Service
 *
 * CRUD for reusable coverage templates + "apply template" logic
 * that hydrates the wizard's coverage step.
 */

import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, Timestamp, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import logger, { LOG_CATEGORIES } from '../utils/logger';
import type {
  CoverageTemplate,
  TemplateCategoryTag,
  TemplateApplicationResult,
} from '../types/coverageTemplate';

// ════════════════════════════════════════════════════════════════════════
// Path helpers
// ════════════════════════════════════════════════════════════════════════

const templatesCol = (orgId: string) => collection(db, `orgs/${orgId}/coverageTemplates`);
const templateDoc = (orgId: string, id: string) => doc(db, `orgs/${orgId}/coverageTemplates/${id}`);

// ════════════════════════════════════════════════════════════════════════
// Read
// ════════════════════════════════════════════════════════════════════════

export async function getTemplate(orgId: string, templateId: string): Promise<CoverageTemplate | null> {
  const snap = await getDoc(templateDoc(orgId, templateId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as CoverageTemplate;
}

export async function listTemplates(
  orgId: string,
  filters?: { category?: TemplateCategoryTag; activeOnly?: boolean; search?: string },
): Promise<CoverageTemplate[]> {
  let q = query(templatesCol(orgId), orderBy('name', 'asc'));

  if (filters?.category) {
    q = query(q, where('category', '==', filters.category));
  }

  const snap = await getDocs(q);
  let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as CoverageTemplate));

  if (filters?.activeOnly !== false) {
    results = results.filter(t => t.isActive);
  }

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    results = results.filter(t =>
      t.name.toLowerCase().includes(s) ||
      t.description.toLowerCase().includes(s) ||
      t.tags.some(tag => tag.toLowerCase().includes(s)),
    );
  }

  return results;
}

// ════════════════════════════════════════════════════════════════════════
// Write
// ════════════════════════════════════════════════════════════════════════

export async function createTemplate(
  orgId: string,
  data: Omit<CoverageTemplate, 'id' | 'orgId' | 'usageCount' | 'lastAppliedAt' | 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt'>,
): Promise<CoverageTemplate> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const ref = doc(templatesCol(orgId));
  const now = serverTimestamp() as Timestamp;

  const template: Omit<CoverageTemplate, 'id'> = {
    orgId,
    ...data,
    usageCount: 0,
    lastAppliedAt: null,
    createdBy: user.uid,
    createdAt: now,
    updatedBy: user.uid,
    updatedAt: now,
  };

  await setDoc(ref, template);

  logger.info(LOG_CATEGORIES.DATA, 'Coverage template created', { templateId: ref.id, name: data.name });

  return { id: ref.id, ...template };
}

export async function updateTemplate(
  orgId: string,
  templateId: string,
  updates: Partial<Omit<CoverageTemplate, 'id' | 'orgId' | 'createdBy' | 'createdAt'>>,
): Promise<void> {
  const user = auth.currentUser;
  await updateDoc(templateDoc(orgId, templateId), {
    ...updates,
    updatedBy: user?.uid ?? '',
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTemplate(orgId: string, templateId: string): Promise<void> {
  await deleteDoc(templateDoc(orgId, templateId));
  logger.info(LOG_CATEGORIES.DATA, 'Coverage template deleted', { templateId });
}

// ════════════════════════════════════════════════════════════════════════
// Apply template → hydrate wizard
// ════════════════════════════════════════════════════════════════════════

export async function applyTemplate(
  orgId: string,
  templateId: string,
): Promise<TemplateApplicationResult> {
  const template = await getTemplate(orgId, templateId);
  if (!template) throw new Error('Template not found');

  // Build coverages from template blueprint
  const coverages: TemplateApplicationResult['coverages'] = [{
    name: template.name,
    coverageKind: template.coverageKind,
    coverageCode: template.coverageCode,
    isOptional: false,
    displayOrder: 0,
  }];

  // Resolve bundled endorsements
  const endorsements: TemplateApplicationResult['endorsements'] = [];
  for (let i = 0; i < template.bundledEndorsementIds.length; i++) {
    const eid = template.bundledEndorsementIds[i];
    try {
      const eSnap = await getDoc(doc(db, `orgs/${orgId}/endorsements/${eid}`));
      if (eSnap.exists()) {
        const eData = eSnap.data();
        endorsements.push({
          endorsementId: eid,
          title: eData.title || eid,
          endorsementCode: eData.endorsementCode || '',
          endorsementType: eData.endorsementType || 'broadening',
          enabled: true,
          displayOrder: i + 1,
        });
      }
    } catch {
      // endorsement not found — skip
    }
  }

  // Resolve bundled forms
  const forms: TemplateApplicationResult['forms'] = [];
  for (const fid of template.bundledFormIds) {
    try {
      const fSnap = await getDoc(doc(db, `orgs/${orgId}/forms/${fid}`));
      if (fSnap.exists()) {
        const fData = fSnap.data();
        forms.push({
          formId: fid,
          formTitle: fData.title || fData.formName || fid,
          formNumber: fData.formNumber || '',
        });
      }
    } catch {
      // form not found — skip
    }
  }

  // Bump usage count
  await updateDoc(templateDoc(orgId, templateId), {
    usageCount: (template.usageCount || 0) + 1,
    lastAppliedAt: serverTimestamp(),
  });

  return {
    templateId,
    templateName: template.name,
    coverages,
    endorsements,
    forms,
    limits: template.defaultLimits,
    deductibles: template.defaultDeductibles,
  };
}
