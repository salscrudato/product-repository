/**
 * Unified Entity Management Service
 * Consolidates coverage and form management into a single, efficient service
 * Reduces code duplication and provides consistent CRUD operations
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Coverage, CoverageLimit, CoverageDeductible, FormTemplate } from '../types';
import logger, { LOG_CATEGORIES } from '../utils/logger';

// ============================================================================
// Generic Entity Operations
// ============================================================================

/**
 * Generic create operation for any entity type
 */
export async function createEntity<T extends Record<string, any>>(
  collectionPath: string,
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
  context: string = 'Entity'
): Promise<T> {
  try {
    const entityData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const ref = await addDoc(collection(db, collectionPath), entityData);
    logger.info(LOG_CATEGORIES.DATA, `${context} created successfully`, { id: ref.id });

    return {
      id: ref.id,
      ...entityData
    } as T;
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, `${context} creation failed`, {}, error as Error);
    throw error;
  }
}

/**
 * Generic update operation for any entity
 */
export async function updateEntity<T extends Record<string, any>>(
  collectionPath: string,
  entityId: string,
  updates: Partial<T>,
  context: string = 'Entity'
): Promise<void> {
  try {
    const ref = doc(db, collectionPath, entityId);
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    logger.info(LOG_CATEGORIES.DATA, `${context} updated successfully`, { id: entityId });
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, `${context} update failed`, { id: entityId }, error as Error);
    throw error;
  }
}

/**
 * Generic delete operation for any entity
 */
export async function deleteEntity(
  collectionPath: string,
  entityId: string,
  context: string = 'Entity'
): Promise<void> {
  try {
    const ref = doc(db, collectionPath, entityId);
    await deleteDoc(ref);
    logger.info(LOG_CATEGORIES.DATA, `${context} deleted successfully`, { id: entityId });
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, `${context} deletion failed`, { id: entityId }, error as Error);
    throw error;
  }
}

/**
 * Generic fetch operation for any entity
 */
export async function fetchEntity<T extends Record<string, any>>(
  collectionPath: string,
  entityId: string,
  context: string = 'Entity'
): Promise<T | null> {
  try {
    const ref = doc(db, collectionPath, entityId);
    const snapshot = await getDoc(ref);
    
    if (!snapshot.exists()) {
      logger.warn(LOG_CATEGORIES.DATA, `${context} not found`, { id: entityId });
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data()
    } as T;
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, `${context} fetch failed`, { id: entityId }, error as Error);
    throw error;
  }
}

/**
 * Generic batch create operation for nested entities (limits, deductibles)
 */
export async function batchCreateNestedEntities<T extends Record<string, any>>(
  parentPath: string,
  nestedCollectionName: string,
  items: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[],
  context: string = 'Nested Entity'
): Promise<void> {
  if (!items || items.length === 0) return;

  try {
    const batch = writeBatch(db);
    
    for (let i = 0; i < items.length; i++) {
      const ref = doc(collection(db, `${parentPath}/${nestedCollectionName}`));
      batch.set(ref, {
        ...items[i],
        displayOrder: i,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    await batch.commit();
    logger.info(LOG_CATEGORIES.DATA, `${context} batch created`, { count: items.length });
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, `${context} batch creation failed`, {}, error as Error);
    throw error;
  }
}

/**
 * Generic batch update operation
 */
export async function batchUpdateEntities(
  collectionPath: string,
  updates: Array<{ id: string; data: Record<string, any> }>,
  context: string = 'Entity'
): Promise<void> {
  if (!updates || updates.length === 0) return;

  try {
    const batch = writeBatch(db);
    
    for (const { id, data } of updates) {
      const ref = doc(db, collectionPath, id);
      batch.update(ref, {
        ...data,
        updatedAt: serverTimestamp()
      });
    }

    await batch.commit();
    logger.info(LOG_CATEGORIES.DATA, `${context} batch updated`, { count: updates.length });
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, `${context} batch update failed`, {}, error as Error);
    throw error;
  }
}

/**
 * Generic batch delete operation
 */
export async function batchDeleteEntities(
  collectionPath: string,
  entityIds: string[],
  context: string = 'Entity'
): Promise<void> {
  if (!entityIds || entityIds.length === 0) return;

  try {
    const batch = writeBatch(db);
    
    for (const id of entityIds) {
      const ref = doc(db, collectionPath, id);
      batch.delete(ref);
    }

    await batch.commit();
    logger.info(LOG_CATEGORIES.DATA, `${context} batch deleted`, { count: entityIds.length });
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, `${context} batch deletion failed`, {}, error as Error);
    throw error;
  }
}

/**
 * Fetch all entities matching a query with automatic pagination
 * Adds default limit of 1000 if not specified to prevent large dataset fetches
 */
export async function fetchEntitiesByQuery<T extends Record<string, any>>(
  collectionPath: string,
  constraints: any[],
  context: string = 'Entity',
  maxResults: number = 1000
): Promise<T[]> {
  try {
    // Check if limit is already in constraints
    const hasLimit = constraints.some(c => c._key?.path?.segments?.[0] === 'limit');

    // Add default limit if not present
    if (!hasLimit) {
      constraints = [...constraints, limit(maxResults)];
    }

    const q = query(collection(db, collectionPath), ...constraints);
    const snapshot = await getDocs(q);

    logger.debug(LOG_CATEGORIES.DATA, `${context} query completed`, {
      collectionPath,
      resultCount: snapshot.docs.length,
      maxResults
    });

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as T[];
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, `${context} query failed`, { collectionPath }, error as Error);
    throw error;
  }
}

// ============================================================================
// Specialized Operations
// ============================================================================

/**
 * Set an item as default (unset others)
 */
export async function setDefaultItem(
  collectionPath: string,
  itemId: string,
  allItems: any[],
  context: string = 'Item'
): Promise<void> {
  try {
    const updates = allItems.map(item => ({
      id: item.id,
      data: { isDefault: item.id === itemId }
    }));

    await batchUpdateEntities(collectionPath, updates, context);
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, `Failed to set default ${context}`, {}, error as Error);
    throw error;
  }
}

export default {
  createEntity,
  updateEntity,
  deleteEntity,
  fetchEntity,
  batchCreateNestedEntities,
  batchUpdateEntities,
  batchDeleteEntities,
  fetchEntitiesByQuery,
  setDefaultItem
};

