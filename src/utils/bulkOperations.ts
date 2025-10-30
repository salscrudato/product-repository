/**
 * Bulk Operations Utility
 * Handles batch operations on rules and pricing steps with progress tracking
 */

import {
  writeBatch,
  doc,
  deleteDoc,
  updateDoc,
  Timestamp,
  collection,
  addDoc
} from 'firebase/firestore';
import { db } from '@/firebase';
import logger, { LOG_CATEGORIES } from './logger';

export interface BulkOperationProgress {
  total: number;
  completed: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export interface BulkOperationResult {
  success: boolean;
  progress: BulkOperationProgress;
  message: string;
}

/**
 * Activate multiple rules
 */
export async function bulkActivateRules(
  ruleIds: string[],
  onProgress?: (progress: BulkOperationProgress) => void
): Promise<BulkOperationResult> {
  const progress: BulkOperationProgress = {
    total: ruleIds.length,
    completed: 0,
    failed: 0,
    errors: []
  };

  try {
    const BATCH_SIZE = 50;
    for (let i = 0; i < ruleIds.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = ruleIds.slice(i, i + BATCH_SIZE);

      for (const ruleId of chunk) {
        try {
          const ruleRef = doc(db, 'rules', ruleId);
          batch.update(ruleRef, {
            status: 'Active',
            updatedAt: Timestamp.now()
          });
          progress.completed++;
        } catch (err) {
          progress.failed++;
          progress.errors.push({
            id: ruleId,
            error: (err as Error).message
          });
        }
      }

      await batch.commit();
      onProgress?.(progress);
    }

    logger.info(LOG_CATEGORIES.DATA, 'Bulk activate rules completed', { progress });
    return {
      success: progress.failed === 0,
      progress,
      message: `Activated ${progress.completed} rules${progress.failed > 0 ? ` (${progress.failed} failed)` : ''}`
    };
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Bulk activate rules failed', {}, error as Error);
    return {
      success: false,
      progress,
      message: `Bulk activation failed: ${(error as Error).message}`
    };
  }
}

/**
 * Deactivate multiple rules
 */
export async function bulkDeactivateRules(
  ruleIds: string[],
  onProgress?: (progress: BulkOperationProgress) => void
): Promise<BulkOperationResult> {
  const progress: BulkOperationProgress = {
    total: ruleIds.length,
    completed: 0,
    failed: 0,
    errors: []
  };

  try {
    const BATCH_SIZE = 50;
    for (let i = 0; i < ruleIds.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = ruleIds.slice(i, i + BATCH_SIZE);

      for (const ruleId of chunk) {
        try {
          const ruleRef = doc(db, 'rules', ruleId);
          batch.update(ruleRef, {
            status: 'Inactive',
            updatedAt: Timestamp.now()
          });
          progress.completed++;
        } catch (err) {
          progress.failed++;
          progress.errors.push({
            id: ruleId,
            error: (err as Error).message
          });
        }
      }

      await batch.commit();
      onProgress?.(progress);
    }

    logger.info(LOG_CATEGORIES.DATA, 'Bulk deactivate rules completed', { progress });
    return {
      success: progress.failed === 0,
      progress,
      message: `Deactivated ${progress.completed} rules${progress.failed > 0 ? ` (${progress.failed} failed)` : ''}`
    };
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Bulk deactivate rules failed', {}, error as Error);
    return {
      success: false,
      progress,
      message: `Bulk deactivation failed: ${(error as Error).message}`
    };
  }
}

/**
 * Delete multiple rules
 */
export async function bulkDeleteRules(
  ruleIds: string[],
  onProgress?: (progress: BulkOperationProgress) => void
): Promise<BulkOperationResult> {
  const progress: BulkOperationProgress = {
    total: ruleIds.length,
    completed: 0,
    failed: 0,
    errors: []
  };

  try {
    const BATCH_SIZE = 50;
    for (let i = 0; i < ruleIds.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = ruleIds.slice(i, i + BATCH_SIZE);

      for (const ruleId of chunk) {
        try {
          const ruleRef = doc(db, 'rules', ruleId);
          batch.delete(ruleRef);
          progress.completed++;
        } catch (err) {
          progress.failed++;
          progress.errors.push({
            id: ruleId,
            error: (err as Error).message
          });
        }
      }

      await batch.commit();
      onProgress?.(progress);
    }

    logger.info(LOG_CATEGORIES.DATA, 'Bulk delete rules completed', { progress });
    return {
      success: progress.failed === 0,
      progress,
      message: `Deleted ${progress.completed} rules${progress.failed > 0 ? ` (${progress.failed} failed)` : ''}`
    };
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Bulk delete rules failed', {}, error as Error);
    return {
      success: false,
      progress,
      message: `Bulk deletion failed: ${(error as Error).message}`
    };
  }
}

/**
 * Change status for multiple rules
 */
export async function bulkChangeRuleStatus(
  ruleIds: string[],
  newStatus: string,
  onProgress?: (progress: BulkOperationProgress) => void
): Promise<BulkOperationResult> {
  const progress: BulkOperationProgress = {
    total: ruleIds.length,
    completed: 0,
    failed: 0,
    errors: []
  };

  try {
    const BATCH_SIZE = 50;
    for (let i = 0; i < ruleIds.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = ruleIds.slice(i, i + BATCH_SIZE);

      for (const ruleId of chunk) {
        try {
          const ruleRef = doc(db, 'rules', ruleId);
          batch.update(ruleRef, {
            status: newStatus,
            updatedAt: Timestamp.now()
          });
          progress.completed++;
        } catch (err) {
          progress.failed++;
          progress.errors.push({
            id: ruleId,
            error: (err as Error).message
          });
        }
      }

      await batch.commit();
      onProgress?.(progress);
    }

    logger.info(LOG_CATEGORIES.DATA, 'Bulk change rule status completed', { progress, newStatus });
    return {
      success: progress.failed === 0,
      progress,
      message: `Updated status for ${progress.completed} rules${progress.failed > 0 ? ` (${progress.failed} failed)` : ''}`
    };
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Bulk change rule status failed', {}, error as Error);
    return {
      success: false,
      progress,
      message: `Bulk status update failed: ${(error as Error).message}`
    };
  }
}

