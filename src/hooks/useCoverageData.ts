/**
 * Unified Coverage Data Hook
 * Consolidates useCoverageLimits and useCoverageDeductibles into a single, efficient hook
 * 
 * Handles fetching, creating, updating, and deleting both limits and deductibles
 * from Firestore subcollections with real-time updates and caching.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  query,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp
} from 'firebase/firestore';
import { db, isAuthReady, safeOnSnapshot } from '../firebase';
import { CoverageLimit, CoverageDeductible } from '../types';

interface UseCoverageDataResult {
  // Limits
  limits: CoverageLimit[];
  addLimit: (limit: Omit<CoverageLimit, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateLimit: (limitId: string, updates: Partial<CoverageLimit>) => Promise<void>;
  deleteLimit: (limitId: string) => Promise<void>;
  setDefaultLimit: (limitId: string) => Promise<void>;

  // Deductibles
  deductibles: CoverageDeductible[];
  addDeductible: (deductible: Omit<CoverageDeductible, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateDeductible: (deductibleId: string, updates: Partial<CoverageDeductible>) => Promise<void>;
  deleteDeductible: (deductibleId: string) => Promise<void>;
  setDefaultDeductible: (deductibleId: string) => Promise<void>;

  // State
  loading: boolean;
  error: string | null;
}

/**
 * Unified hook for managing coverage limits and deductibles
 * Reduces code duplication and improves maintainability
 */
export function useCoverageData(
  productId: string | undefined,
  coverageId: string | undefined
): UseCoverageDataResult {
  const [limits, setLimits] = useState<CoverageLimit[]>([]);
  const [deductibles, setDeductibles] = useState<CoverageDeductible[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time listener for limits
  useEffect(() => {
    // Wait for auth to fully propagate before subscribing
    if (!isAuthReady() || !productId || !coverageId) {
      setLimits([]);
      return;
    }

    const limitsRef = collection(db, `products/${productId}/coverages/${coverageId}/limits`);
    const unsubscribe = safeOnSnapshot(
      query(limitsRef),
      (snapshot) => {
        const limitsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as CoverageLimit[];
        setLimits(limitsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching limits:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [productId, coverageId]);

  // Real-time listener for deductibles
  useEffect(() => {
    // Wait for auth to fully propagate before subscribing
    if (!isAuthReady() || !productId || !coverageId) {
      setDeductibles([]);
      return;
    }

    const deductiblesRef = collection(db, `products/${productId}/coverages/${coverageId}/deductibles`);
    const unsubscribe = safeOnSnapshot(
      query(deductiblesRef),
      (snapshot) => {
        const deductiblesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as CoverageDeductible[];
        setDeductibles(deductiblesData);
      },
      (err) => {
        console.error('Error fetching deductibles:', err);
        setError(err.message);
      }
    );

    return () => unsubscribe();
  }, [productId, coverageId]);

  // Generic add function for both limits and deductibles
  const addItem = useCallback(
    async <T extends CoverageLimit | CoverageDeductible>(
      itemData: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
      type: 'limits' | 'deductibles'
    ): Promise<string> => {
      if (!productId || !coverageId) {
        throw new Error('Product ID and Coverage ID are required');
      }

      try {
        const collectionPath = `products/${productId}/coverages/${coverageId}/${type}`;
        const itemRef = collection(db, collectionPath);
        const newItem = {
          ...itemData,
          coverageId,
          productId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        const docRef = await addDoc(itemRef, newItem);
        return docRef.id;
      } catch (err: any) {
        console.error(`Error adding ${type}:`, err);
        throw new Error(err.message || `Failed to add ${type}`);
      }
    },
    [productId, coverageId]
  );

  // Generic update function
  const updateItem = useCallback(
    async <T extends CoverageLimit | CoverageDeductible>(
      itemId: string,
      updates: Partial<T>,
      type: 'limits' | 'deductibles'
    ): Promise<void> => {
      if (!productId || !coverageId) {
        throw new Error('Product ID and Coverage ID are required');
      }

      try {
        const itemRef = doc(db, `products/${productId}/coverages/${coverageId}/${type}`, itemId);
        await updateDoc(itemRef, {
          ...updates,
          updatedAt: Timestamp.now(),
        });
      } catch (err: any) {
        console.error(`Error updating ${type}:`, err);
        throw new Error(err.message || `Failed to update ${type}`);
      }
    },
    [productId, coverageId]
  );

  // Generic delete function
  const deleteItem = useCallback(
    async (itemId: string, type: 'limits' | 'deductibles'): Promise<void> => {
      if (!productId || !coverageId) {
        throw new Error('Product ID and Coverage ID are required');
      }

      try {
        const itemRef = doc(db, `products/${productId}/coverages/${coverageId}/${type}`, itemId);
        await deleteDoc(itemRef);
      } catch (err: any) {
        console.error(`Error deleting ${type}:`, err);
        throw new Error(err.message || `Failed to delete ${type}`);
      }
    },
    [productId, coverageId]
  );

  // Generic set default function
  const setDefaultItem = useCallback(
    async (itemId: string, items: any[], type: 'limits' | 'deductibles'): Promise<void> => {
      if (!productId || !coverageId) {
        throw new Error('Product ID and Coverage ID are required');
      }

      try {
        const updatePromises = items.map((item) => {
          if (item.id === itemId) {
            return updateItem(item.id, { isDefault: true } as any, type);
          } else if (item.isDefault) {
            return updateItem(item.id, { isDefault: false } as any, type);
          }
          return Promise.resolve();
        });
        await Promise.all(updatePromises);
      } catch (err: any) {
        console.error(`Error setting default ${type}:`, err);
        throw new Error(err.message || `Failed to set default ${type}`);
      }
    },
    [productId, coverageId, updateItem]
  );

  // Memoized callbacks for limits
  const addLimit = useCallback(
    (limit: Omit<CoverageLimit, 'id' | 'createdAt' | 'updatedAt'>) =>
      addItem(limit, 'limits'),
    [addItem]
  );

  const updateLimitCb = useCallback(
    (limitId: string, updates: Partial<CoverageLimit>) =>
      updateItem(limitId, updates, 'limits'),
    [updateItem]
  );

  const deleteLimitCb = useCallback(
    (limitId: string) => deleteItem(limitId, 'limits'),
    [deleteItem]
  );

  const setDefaultLimitCb = useCallback(
    (limitId: string) => setDefaultItem(limitId, limits, 'limits'),
    [setDefaultItem, limits]
  );

  // Memoized callbacks for deductibles
  const addDeductible = useCallback(
    (deductible: Omit<CoverageDeductible, 'id' | 'createdAt' | 'updatedAt'>) =>
      addItem(deductible, 'deductibles'),
    [addItem]
  );

  const updateDeductibleCb = useCallback(
    (deductibleId: string, updates: Partial<CoverageDeductible>) =>
      updateItem(deductibleId, updates, 'deductibles'),
    [updateItem]
  );

  const deleteDeductibleCb = useCallback(
    (deductibleId: string) => deleteItem(deductibleId, 'deductibles'),
    [deleteItem]
  );

  const setDefaultDeductibleCb = useCallback(
    (deductibleId: string) => setDefaultItem(deductibleId, deductibles, 'deductibles'),
    [setDefaultItem, deductibles]
  );

  return useMemo(
    () => ({
      limits,
      addLimit,
      updateLimit: updateLimitCb,
      deleteLimit: deleteLimitCb,
      setDefaultLimit: setDefaultLimitCb,
      deductibles,
      addDeductible,
      updateDeductible: updateDeductibleCb,
      deleteDeductible: deleteDeductibleCb,
      setDefaultDeductible: setDefaultDeductibleCb,
      loading,
      error,
    }),
    [
      limits,
      addLimit,
      updateLimitCb,
      deleteLimitCb,
      setDefaultLimitCb,
      deductibles,
      addDeductible,
      updateDeductibleCb,
      deleteDeductibleCb,
      setDefaultDeductibleCb,
      loading,
      error,
    ]
  );
}

export default useCoverageData;

