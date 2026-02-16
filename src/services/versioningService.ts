/**
 * Versioning Service
 * Handles all version-related operations for versioned entities
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
  limit,
  Timestamp,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import {
  VersionStatus,
  VersionMetadata,
  VersionedDocument,
  VersionedEntityType,
  VersionComparisonResult,
} from '@/types/versioning';
import {
  isVersionEditable,
  isVersionImmutable,
  canTransitionTo,
  getNextVersionNumber,
  compareVersions,
  cloneForNewVersion,
} from '@/utils/versioningUtils';
import logger, { LOG_CATEGORIES } from '@/utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface CreateVersionParams<T> {
  orgId: string;
  entityType: VersionedEntityType;
  entityId: string;
  data: T;
  userId: string;
  summary?: string;
  notes?: string;
  effectiveStart?: string;
  effectiveEnd?: string;
}

export interface UpdateVersionParams<T> {
  orgId: string;
  entityType: VersionedEntityType;
  entityId: string;
  versionId: string;
  data: Partial<T>;
  userId: string;
}

export interface TransitionVersionParams {
  orgId: string;
  entityType: VersionedEntityType;
  entityId: string;
  versionId: string;
  targetStatus: VersionStatus;
  userId: string;
}

export interface CloneVersionParams {
  orgId: string;
  entityType: VersionedEntityType;
  entityId: string;
  sourceVersionId: string;
  userId: string;
  summary?: string;
}

// ============================================================================
// Path Resolver
// ============================================================================

function getVersionsCollectionPath(
  orgId: string,
  entityType: VersionedEntityType,
  entityId: string,
  parentId?: string
): string {
  switch (entityType) {
    case 'product':
      return `orgs/${orgId}/products/${entityId}/versions`;
    case 'coverage':
      if (!parentId) throw new Error('Coverage requires parentId (productId)');
      return `orgs/${orgId}/products/${parentId}/coverages/${entityId}/versions`;
    case 'form':
      return `orgs/${orgId}/forms/${entityId}/versions`;
    case 'rule':
      return `orgs/${orgId}/rules/${entityId}/versions`;
    case 'rateProgram':
      return `orgs/${orgId}/ratePrograms/${entityId}/versions`;
    case 'table':
      return `orgs/${orgId}/tables/${entityId}/versions`;
    case 'dataDictionary':
      if (!parentId) throw new Error('DataDictionary requires parentId (productId)');
      return `orgs/${orgId}/products/${parentId}/dataDictionary/${entityId}/versions`;
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

// ============================================================================
// Service Class
// ============================================================================

class VersioningService {
  /**
   * Get all versions for an entity
   */
  async getVersions<T>(
    orgId: string,
    entityType: VersionedEntityType,
    entityId: string,
    parentId?: string
  ): Promise<VersionedDocument<T>[]> {
    const path = getVersionsCollectionPath(orgId, entityType, entityId, parentId);
    const versionsRef = collection(db, path);
    const q = query(versionsRef, orderBy('versionNumber', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as VersionedDocument<T>));
  }

  /**
   * Get a specific version
   */
  async getVersion<T>(
    orgId: string,
    entityType: VersionedEntityType,
    entityId: string,
    versionId: string,
    parentId?: string
  ): Promise<VersionedDocument<T> | null> {
    const path = getVersionsCollectionPath(orgId, entityType, entityId, parentId);
    const versionRef = doc(db, path, versionId);
    const snapshot = await getDoc(versionRef);
    
    if (!snapshot.exists()) return null;
    
    return { id: snapshot.id, ...snapshot.data() } as VersionedDocument<T>;
  }

  /**
   * Get the latest version (draft preferred, else published)
   */
  async getLatestVersion<T>(
    orgId: string,
    entityType: VersionedEntityType,
    entityId: string,
    parentId?: string
  ): Promise<VersionedDocument<T> | null> {
    const path = getVersionsCollectionPath(orgId, entityType, entityId, parentId);
    const versionsRef = collection(db, path);
    
    // First try to get latest draft
    let q = query(versionsRef, where('status', '==', 'draft'), orderBy('versionNumber', 'desc'), limit(1));
    let snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as VersionedDocument<T>;
    }
    
    // Fall back to latest published
    q = query(versionsRef, where('status', '==', 'published'), orderBy('versionNumber', 'desc'), limit(1));
    snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as VersionedDocument<T>;
    }
    
    return null;
  }

  /**
   * Create a new version (always starts as draft)
   */
  async createVersion<T extends Record<string, unknown>>(
    params: CreateVersionParams<T>,
    parentId?: string
  ): Promise<VersionedDocument<T>> {
    const { orgId, entityType, entityId, data, userId, summary, notes, effectiveStart, effectiveEnd } = params;
    const path = getVersionsCollectionPath(orgId, entityType, entityId, parentId);

    // Get existing versions to determine next version number
    const existingVersions = await this.getVersions<T>(orgId, entityType, entityId, parentId);
    const versionNumbers = existingVersions.map(v => v.versionNumber);
    const nextVersionNumber = getNextVersionNumber(versionNumbers);

    const versionRef = doc(collection(db, path));
    const now = serverTimestamp() as Timestamp;

    const versionDoc: Omit<VersionedDocument<T>, 'id'> = {
      entityId,
      versionNumber: nextVersionNumber,
      status: 'draft',
      effectiveStart: effectiveStart || null,
      effectiveEnd: effectiveEnd || null,
      createdAt: now,
      createdBy: userId,
      updatedAt: now,
      updatedBy: userId,
      summary: summary || `Version ${nextVersionNumber}`,
      notes,
      data,
    };

    await setDoc(versionRef, versionDoc);

    logger.info(LOG_CATEGORIES.DATA, 'Version created', {
      entityType, entityId, versionId: versionRef.id, versionNumber: nextVersionNumber
    });

    return { id: versionRef.id, ...versionDoc } as VersionedDocument<T>;
  }

  /**
   * Update a draft version
   */
  async updateVersion<T extends Record<string, unknown>>(
    params: UpdateVersionParams<T>,
    parentId?: string
  ): Promise<void> {
    const { orgId, entityType, entityId, versionId, data, userId } = params;
    const path = getVersionsCollectionPath(orgId, entityType, entityId, parentId);

    // Get current version to check status
    const current = await this.getVersion<T>(orgId, entityType, entityId, versionId, parentId);
    if (!current) throw new Error('Version not found');
    if (!isVersionEditable(current.status)) {
      throw new Error(`Cannot edit version with status: ${current.status}`);
    }

    const versionRef = doc(db, path, versionId);
    await updateDoc(versionRef, {
      data: { ...current.data, ...data },
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    });

    logger.info(LOG_CATEGORIES.DATA, 'Version updated', { entityType, entityId, versionId });
  }

  /**
   * Transition a version to a new status
   */
  async transitionVersion(params: TransitionVersionParams, parentId?: string): Promise<void> {
    const { orgId, entityType, entityId, versionId, targetStatus, userId } = params;
    const path = getVersionsCollectionPath(orgId, entityType, entityId, parentId);

    const current = await this.getVersion(orgId, entityType, entityId, versionId, parentId);
    if (!current) throw new Error('Version not found');

    if (!canTransitionTo(current.status, targetStatus)) {
      throw new Error(`Cannot transition from ${current.status} to ${targetStatus}`);
    }

    const updates: Record<string, unknown> = {
      status: targetStatus,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    };

    if (targetStatus === 'published') {
      updates.publishedAt = serverTimestamp();
      updates.publishedBy = userId;
    }

    const versionRef = doc(db, path, versionId);
    await updateDoc(versionRef, updates);

    logger.info(LOG_CATEGORIES.DATA, 'Version transitioned', {
      entityType, entityId, versionId, from: current.status, to: targetStatus
    });
  }

  /**
   * Clone a published version to create a new draft
   */
  async cloneVersion<T extends Record<string, unknown>>(
    params: CloneVersionParams,
    parentId?: string
  ): Promise<VersionedDocument<T>> {
    const { orgId, entityType, entityId, sourceVersionId, userId, summary } = params;

    const source = await this.getVersion<T>(orgId, entityType, entityId, sourceVersionId, parentId);
    if (!source) throw new Error('Source version not found');

    const clonedData = cloneForNewVersion(source.data as Record<string, unknown>) as T;

    return this.createVersion<T>({
      orgId,
      entityType,
      entityId,
      data: clonedData,
      userId,
      summary: summary || `Draft from v${source.versionNumber}`,
      notes: `Cloned from version ${source.versionNumber}`,
      effectiveStart: source.effectiveStart,
      effectiveEnd: source.effectiveEnd,
    }, parentId);
  }

  /**
   * Compare two versions
   */
  async compareVersions<T extends Record<string, unknown>>(
    orgId: string,
    entityType: VersionedEntityType,
    entityId: string,
    leftVersionId: string,
    rightVersionId: string,
    parentId?: string
  ): Promise<VersionComparisonResult> {
    const [leftVersion, rightVersion] = await Promise.all([
      this.getVersion<T>(orgId, entityType, entityId, leftVersionId, parentId),
      this.getVersion<T>(orgId, entityType, entityId, rightVersionId, parentId),
    ]);

    if (!leftVersion || !rightVersion) {
      throw new Error('One or both versions not found');
    }

    return compareVersions(
      leftVersionId,
      leftVersion.data as Record<string, unknown>,
      rightVersionId,
      rightVersion.data as Record<string, unknown>
    );
  }
}

export const versioningService = new VersioningService();
export default versioningService;

