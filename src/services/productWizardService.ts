/**
 * Product Assembly Wizard Service
 *
 * Handles manifest persistence, version creation, CS item linkage,
 * state program drafting, readiness validation, and audit events.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import logger, { LOG_CATEGORIES } from '../utils/logger';
import { addItemToChangeSet } from './changeSetService';
import { versioningService } from './versioningService';
import type {
  WizardManifest,
  WizardManifestStatus,
  WizardStepId,
  WizardCoverageItem,
  WizardRateAttachment,
  WizardRuleAttachment,
  WizardFormAttachment,
  ReadinessResult,
  ReadinessCheckItem,
  ReadinessLevel,
  StepValidation,
  StepValidationMap,
  WizardTemplateChoice,
} from '../types/productWizard';
import type { Product } from '../types/index';

// ════════════════════════════════════════════════════════════════════════
// Path helpers
// ════════════════════════════════════════════════════════════════════════

const manifestsCol = (orgId: string) => collection(db, `orgs/${orgId}/wizardManifests`);
const manifestDoc = (orgId: string, id: string) => doc(db, `orgs/${orgId}/wizardManifests/${id}`);
const productsCol = (orgId: string) => collection(db, `orgs/${orgId}/products`);
const productDoc = (orgId: string, productId: string) => doc(db, `orgs/${orgId}/products/${productId}`);
const auditCol = (orgId: string) => collection(db, `orgs/${orgId}/auditLog`);

// ════════════════════════════════════════════════════════════════════════
// Manifest CRUD
// ════════════════════════════════════════════════════════════════════════

export async function createManifest(
  orgId: string,
  changeSetId: string,
  changeSetName: string,
  effectiveStart: string | null,
  effectiveEnd: string | null,
): Promise<WizardManifest> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const ref = doc(manifestsCol(orgId));
  const now = serverTimestamp() as Timestamp;

  const manifest: Omit<WizardManifest, 'id'> = {
    orgId,
    productId: null,
    productName: '',
    productDescription: '',
    productCategory: '',
    productVersionId: null,
    changeSetId,
    changeSetName,
    currentStep: 'template',
    status: 'in_progress',
    templateChoice: null,
    coverages: [],
    ratePrograms: [],
    rules: [],
    forms: [],
    selectedStates: [],
    readinessResult: null,
    effectiveStart,
    effectiveEnd,
    createdBy: user.uid,
    createdAt: now,
    updatedBy: user.uid,
    updatedAt: now,
    completedAt: null,
  };

  await setDoc(ref, manifest);

  logger.info(LOG_CATEGORIES.DATA, 'Wizard manifest created', { manifestId: ref.id, changeSetId });

  return { id: ref.id, ...manifest };
}

export async function getManifest(orgId: string, manifestId: string): Promise<WizardManifest | null> {
  const snap = await getDoc(manifestDoc(orgId, manifestId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as WizardManifest;
}

export async function updateManifest(
  orgId: string,
  manifestId: string,
  updates: Partial<Omit<WizardManifest, 'id' | 'orgId' | 'createdBy' | 'createdAt'>>,
): Promise<void> {
  const user = auth.currentUser;
  await updateDoc(manifestDoc(orgId, manifestId), {
    ...updates,
    updatedBy: user?.uid ?? '',
    updatedAt: serverTimestamp(),
  });
}

export async function listManifests(
  orgId: string,
  changeSetId?: string,
): Promise<WizardManifest[]> {
  let q = query(manifestsCol(orgId), orderBy('createdAt', 'desc'));
  if (changeSetId) {
    q = query(q, where('changeSetId', '==', changeSetId));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as WizardManifest));
}

// ════════════════════════════════════════════════════════════════════════
// Step validation
// ════════════════════════════════════════════════════════════════════════

export function validateStep(manifest: WizardManifest, step: WizardStepId): StepValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (step) {
    case 'template':
      if (!manifest.productName.trim()) errors.push('Product name is required');
      if (!manifest.templateChoice) errors.push('Select a starting point (scratch or template)');
      break;

    case 'coverages':
      if (manifest.coverages.length === 0) errors.push('At least one coverage is required');
      {
        const coverages = manifest.coverages.filter(c => c.coverageKind === 'coverage');
        if (coverages.length === 0) errors.push('At least one base coverage (not just endorsements) is required');
      }
      {
        const endorsements = manifest.coverages.filter(c => c.coverageKind === 'endorsement');
        endorsements.forEach(e => {
          if (e.modifiesCoverageId && !manifest.coverages.find(c => c.coverageId === e.modifiesCoverageId)) {
            warnings.push(`Endorsement "${e.name}" references a coverage not in this product`);
          }
        });
      }
      break;

    case 'attachments':
      if (manifest.ratePrograms.length === 0) warnings.push('No rate programs attached – rating will not be available');
      if (manifest.forms.length === 0) warnings.push('No forms attached – filing packages may be incomplete');
      break;

    case 'states':
      if (manifest.selectedStates.length === 0) errors.push('At least one target state is required');
      break;

    case 'review':
      // Review step validates all previous steps
      for (const s of ['template', 'coverages', 'attachments', 'states'] as WizardStepId[]) {
        const sv = validateStep(manifest, s);
        errors.push(...sv.errors.map(e => `[${s}] ${e}`));
        warnings.push(...sv.warnings.map(w => `[${s}] ${w}`));
      }
      if (!manifest.changeSetId) errors.push('No Change Set linked');
      break;
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateAllSteps(manifest: WizardManifest): StepValidationMap {
  return {
    template: validateStep(manifest, 'template'),
    coverages: validateStep(manifest, 'coverages'),
    attachments: validateStep(manifest, 'attachments'),
    states: validateStep(manifest, 'states'),
    review: validateStep(manifest, 'review'),
  };
}

// ════════════════════════════════════════════════════════════════════════
// Readiness computation
// ════════════════════════════════════════════════════════════════════════

export function computeReadiness(manifest: WizardManifest): ReadinessResult {
  const checks: ReadinessCheckItem[] = [];

  // Product basics
  checks.push({
    id: 'product-name',
    category: 'product',
    label: 'Product name',
    description: manifest.productName ? `"${manifest.productName}"` : 'Not set',
    level: manifest.productName.trim() ? 'pass' : 'fail',
  });

  checks.push({
    id: 'product-category',
    category: 'product',
    label: 'Product category',
    description: manifest.productCategory || 'Not set',
    level: manifest.productCategory ? 'pass' : 'warning',
  });

  // Coverages
  const baseCovs = manifest.coverages.filter(c => c.coverageKind === 'coverage');
  checks.push({
    id: 'coverage-count',
    category: 'coverage',
    label: 'Base coverages',
    description: `${baseCovs.length} coverage${baseCovs.length !== 1 ? 's' : ''} selected`,
    level: baseCovs.length > 0 ? 'pass' : 'fail',
  });

  const endorsements = manifest.coverages.filter(c => c.coverageKind === 'endorsement');
  checks.push({
    id: 'endorsement-count',
    category: 'coverage',
    label: 'Endorsements',
    description: `${endorsements.length} endorsement${endorsements.length !== 1 ? 's' : ''}`,
    level: 'pass',
  });

  // Coverage ordering
  const hasOrdering = manifest.coverages.every((c, i) => c.displayOrder === i);
  checks.push({
    id: 'coverage-ordering',
    category: 'coverage',
    label: 'Coverage ordering',
    description: hasOrdering ? 'Order verified' : 'Gaps in display order',
    level: hasOrdering ? 'pass' : 'warning',
  });

  // Rate programs
  checks.push({
    id: 'rate-programs',
    category: 'rate',
    label: 'Rate programs',
    description: `${manifest.ratePrograms.length} attached`,
    level: manifest.ratePrograms.length > 0 ? 'pass' : 'warning',
  });

  // Rules
  checks.push({
    id: 'rules',
    category: 'rule',
    label: 'Underwriting rules',
    description: `${manifest.rules.length} attached`,
    level: manifest.rules.length > 0 ? 'pass' : 'warning',
  });

  // Forms
  checks.push({
    id: 'forms',
    category: 'form',
    label: 'Policy forms',
    description: `${manifest.forms.length} attached`,
    level: manifest.forms.length > 0 ? 'pass' : 'warning',
  });

  // States
  checks.push({
    id: 'states',
    category: 'state',
    label: 'Target states',
    description: `${manifest.selectedStates.length} state${manifest.selectedStates.length !== 1 ? 's' : ''} selected`,
    level: manifest.selectedStates.length > 0 ? 'pass' : 'fail',
  });

  // Change Set
  checks.push({
    id: 'change-set',
    category: 'product',
    label: 'Change Set',
    description: manifest.changeSetName || 'Not linked',
    level: manifest.changeSetId ? 'pass' : 'fail',
  });

  const passCount = checks.filter(c => c.level === 'pass').length;
  const warnCount = checks.filter(c => c.level === 'warning').length;
  const failCount = checks.filter(c => c.level === 'fail').length;

  const overall: ReadinessLevel = failCount > 0 ? 'fail' : warnCount > 0 ? 'warning' : 'pass';

  return { overall, checks, passCount, warnCount, failCount };
}

// ════════════════════════════════════════════════════════════════════════
// Finalize: create Product, version, state programs, CS items
// ════════════════════════════════════════════════════════════════════════

export async function finalizeWizard(
  orgId: string,
  manifestId: string,
): Promise<{ productId: string; versionId: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const manifest = await getManifest(orgId, manifestId);
  if (!manifest) throw new Error('Manifest not found');

  // Final validation gate
  const readiness = computeReadiness(manifest);
  if (readiness.overall === 'fail') {
    throw new Error(`Cannot finalize: ${readiness.failCount} failing check(s)`);
  }

  const batch = writeBatch(db);
  const now = serverTimestamp() as Timestamp;

  // 1. Create or update the Product document
  let productId = manifest.productId;
  if (!productId) {
    const prodRef = doc(productsCol(orgId));
    productId = prodRef.id;
    const productData: Partial<Product> = {
      name: manifest.productName,
      description: manifest.productDescription || undefined,
      category: manifest.productCategory || undefined,
      status: 'draft',
      coverageCount: manifest.coverages.length,
      formCount: manifest.forms.length,
      ruleCount: manifest.rules.length,
      states: manifest.selectedStates,
      createdAt: now,
      createdBy: user.uid,
      updatedAt: now,
      updatedBy: user.uid,
    };
    batch.set(prodRef, productData);
  }

  // 2. Create ProductVersion (draft)
  const versionData: Record<string, unknown> = {
    productName: manifest.productName,
    productDescription: manifest.productDescription,
    productCategory: manifest.productCategory,
    coverages: manifest.coverages,
    ratePrograms: manifest.ratePrograms,
    rules: manifest.rules,
    forms: manifest.forms,
    selectedStates: manifest.selectedStates,
    wizardManifestId: manifestId,
  };

  // Commit the product first
  await batch.commit();

  // Now create version through the versioning service (needs the product to exist)
  const version = await versioningService.createVersion<Record<string, unknown>>({
    orgId,
    entityType: 'product',
    entityId: productId!,
    data: versionData,
    userId: user.uid,
    summary: `Product assembled via wizard: ${manifest.productName}`,
    effectiveStart: manifest.effectiveStart || undefined,
    effectiveEnd: manifest.effectiveEnd || undefined,
  });

  // 3. Create StateProgram drafts for selected states
  const spBatch = writeBatch(db);
  for (const stateCode of manifest.selectedStates) {
    const spRef = doc(
      db,
      `orgs/${orgId}/products/${productId}/versions/${version.id}/statePrograms/${stateCode}`,
    );
    spBatch.set(spRef, {
      stateCode,
      productId,
      productVersionId: version.id,
      status: 'draft',
      filingStatus: 'not_filed',
      requiredArtifacts: {
        formsRequired: true,
        ratesRequired: true,
        rulesRequired: false,
      },
      createdAt: now,
      updatedAt: now,
      createdBy: user.uid,
      updatedBy: user.uid,
    });
  }
  await spBatch.commit();

  // 4. Add items to the Change Set
  // Add the product version
  await addItemToChangeSet(orgId, manifest.changeSetId, {
    artifactType: 'product',
    artifactId: productId!,
    artifactName: manifest.productName,
    versionId: version.id,
    action: manifest.templateChoice?.source === 'scratch' ? 'create' : 'update',
  });

  // Add state programs
  for (const stateCode of manifest.selectedStates) {
    await addItemToChangeSet(orgId, manifest.changeSetId, {
      artifactType: 'stateProgram',
      artifactId: `${productId}__${stateCode}`,
      artifactName: `State Program – ${stateCode}`,
      versionId: version.id,
      action: 'create',
    });
  }

  // 5. Log audit event
  const auditRef = doc(auditCol(orgId));
  await setDoc(auditRef, {
    actorUserId: user.uid,
    action: 'CREATE',
    entityType: 'product',
    entityId: productId,
    entityName: manifest.productName,
    versionId: version.id,
    changeSetId: manifest.changeSetId,
    metadata: {
      source: 'product_assembly_wizard',
      manifestId,
      coverageCount: manifest.coverages.length,
      stateCount: manifest.selectedStates.length,
      rateCount: manifest.ratePrograms.length,
      ruleCount: manifest.rules.length,
      formCount: manifest.forms.length,
    },
    createdAt: now,
  });

  // 6. Update manifest to completed
  await updateManifest(orgId, manifestId, {
    productId,
    productVersionId: version.id,
    readinessResult: readiness,
    status: 'completed',
    completedAt: now,
  });

  logger.info(LOG_CATEGORIES.DATA, 'Wizard finalized', {
    manifestId, productId, versionId: version.id, changeSetId: manifest.changeSetId,
  });

  return { productId: productId!, versionId: version.id };
}
