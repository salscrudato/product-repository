/**
 * Transaction Manager for Firestore
 * Provides safe multi-document operations with rollback support
 * Ensures data consistency across related entities
 */

import {
  writeBatch,
  transaction,
  runTransaction,
  Transaction,
  WriteBatch,
  DocumentReference,
  CollectionReference,
  Query,
  doc,
  collection,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import logger, { LOG_CATEGORIES } from './logger';

/**
 * Transaction operation type
 */
export interface TransactionOp {
  type: 'set' | 'update' | 'delete';
  ref: DocumentReference;
  data?: any;
}

/**
 * Transaction result
 */
export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  operationsCount?: number;
}

/**
 * Batch operation manager
 * Groups multiple writes into a single batch for atomicity
 */
export class BatchOperationManager {
  private batch: WriteBatch;
  private operations: TransactionOp[] = [];
  private maxBatchSize = 500; // Firestore limit

  constructor() {
    this.batch = writeBatch(db);
  }

  /**
   * Add set operation to batch
   */
  addSet(ref: DocumentReference, data: any): this {
    if (this.operations.length >= this.maxBatchSize) {
      throw new Error(`Batch size limit (${this.maxBatchSize}) exceeded`);
    }
    this.batch.set(ref, data);
    this.operations.push({ type: 'set', ref, data });
    return this;
  }

  /**
   * Add update operation to batch
   */
  addUpdate(ref: DocumentReference, data: any): this {
    if (this.operations.length >= this.maxBatchSize) {
      throw new Error(`Batch size limit (${this.maxBatchSize}) exceeded`);
    }
    this.batch.update(ref, data);
    this.operations.push({ type: 'update', ref, data });
    return this;
  }

  /**
   * Add delete operation to batch
   */
  addDelete(ref: DocumentReference): this {
    if (this.operations.length >= this.maxBatchSize) {
      throw new Error(`Batch size limit (${this.maxBatchSize}) exceeded`);
    }
    this.batch.delete(ref);
    this.operations.push({ type: 'delete', ref });
    return this;
  }

  /**
   * Commit all operations atomically
   */
  async commit(): Promise<TransactionResult<void>> {
    try {
      await this.batch.commit();
      logger.debug(LOG_CATEGORIES.DATA, 'Batch committed successfully', {
        operationsCount: this.operations.length
      });
      return { success: true, operationsCount: this.operations.length };
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Batch commit failed', {}, error as Error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Get number of operations in batch
   */
  getOperationCount(): number {
    return this.operations.length;
  }

  /**
   * Reset batch
   */
  reset(): void {
    this.batch = writeBatch(db);
    this.operations = [];
  }
}

/**
 * Transaction manager for complex multi-document operations
 */
export class TransactionManager {
  /**
   * Execute a transaction with automatic rollback on error
   */
  static async executeTransaction<T>(
    operation: (txn: Transaction) => Promise<T>,
    context: string = 'Transaction'
  ): Promise<TransactionResult<T>> {
    try {
      const result = await runTransaction(db, operation);
      logger.debug(LOG_CATEGORIES.DATA, `${context} completed successfully`, {
        context
      });
      return { success: true, data: result };
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, `${context} failed`, { context }, error as Error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Cascade delete - delete document and all related subcollections
   */
  static async cascadeDelete(
    docRef: DocumentReference,
    subcollections: string[] = []
  ): Promise<TransactionResult<void>> {
    try {
      const batch = new BatchOperationManager();

      // Delete subcollection documents
      for (const subcollectionName of subcollections) {
        const subcollectionRef = collection(docRef, subcollectionName);
        const snapshot = await getDocs(subcollectionRef);
        
        for (const doc of snapshot.docs) {
          batch.addDelete(doc.ref);
        }
      }

      // Delete main document
      batch.addDelete(docRef);

      const result = await batch.commit();
      logger.debug(LOG_CATEGORIES.DATA, 'Cascade delete completed', {
        docPath: docRef.path,
        subcollectionsCount: subcollections.length
      });

      return result;
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Cascade delete failed', {}, error as Error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Update related documents atomically
   * Ensures consistency when updating parent and child documents
   */
  static async updateRelated(
    updates: Array<{ ref: DocumentReference; data: any }>,
    context: string = 'Related update'
  ): Promise<TransactionResult<void>> {
    try {
      const batch = new BatchOperationManager();

      for (const { ref, data } of updates) {
        batch.addUpdate(ref, data);
      }

      const result = await batch.commit();
      logger.debug(LOG_CATEGORIES.DATA, `${context} completed`, {
        updatesCount: updates.length
      });

      return result;
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, `${context} failed`, {}, error as Error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Atomic increment operation
   */
  static async atomicIncrement(
    ref: DocumentReference,
    field: string,
    increment: number = 1
  ): Promise<TransactionResult<number>> {
    return this.executeTransaction(async (txn) => {
      const doc = await txn.get(ref);
      const currentValue = doc.get(field) || 0;
      const newValue = currentValue + increment;
      txn.update(ref, { [field]: newValue });
      return newValue;
    }, `Atomic increment on ${field}`);
  }

  /**
   * Conditional update - only update if condition is met
   */
  static async conditionalUpdate(
    ref: DocumentReference,
    condition: (data: any) => boolean,
    updates: any,
    context: string = 'Conditional update'
  ): Promise<TransactionResult<boolean>> {
    return this.executeTransaction(async (txn) => {
      const doc = await txn.get(ref);
      if (!doc.exists()) {
        throw new Error('Document does not exist');
      }

      if (condition(doc.data())) {
        txn.update(ref, updates);
        return true;
      }
      return false;
    }, context);
  }
}

export default {
  BatchOperationManager,
  TransactionManager,
};

