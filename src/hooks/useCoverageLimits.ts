/**
 * Custom hook for managing coverage limits
 * Handles fetching, creating, updating, and deleting limits from Firestore subcollection
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { CoverageLimit } from '../types';

interface UseCoverageLimitsResult {
  limits: CoverageLimit[];
  loading: boolean;
  error: string | null;
  addLimit: (limit: Omit<CoverageLimit, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateLimit: (limitId: string, updates: Partial<CoverageLimit>) => Promise<void>;
  deleteLimit: (limitId: string) => Promise<void>;
  setDefaultLimit: (limitId: string) => Promise<void>;
}

export function useCoverageLimits(
  productId: string | undefined,
  coverageId: string | undefined
): UseCoverageLimitsResult {
  const [limits, setLimits] = useState<CoverageLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch limits with real-time updates
  useEffect(() => {
    if (!productId || !coverageId) {
      setLimits([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const limitsRef = collection(
      db,
      `products/${productId}/coverages/${coverageId}/limits`
    );
    const q = query(limitsRef);

    const unsubscribe = onSnapshot(
      q,
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

  // Add a new limit
  const addLimit = useCallback(
    async (limitData: Omit<CoverageLimit, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!productId || !coverageId) {
        throw new Error('Product ID and Coverage ID are required');
      }

      try {
        const limitsRef = collection(
          db,
          `products/${productId}/coverages/${coverageId}/limits`
        );

        const newLimit = {
          ...limitData,
          coverageId,
          productId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const docRef = await addDoc(limitsRef, newLimit);
        return docRef.id;
      } catch (err: any) {
        console.error('Error adding limit:', err);
        throw new Error(err.message || 'Failed to add limit');
      }
    },
    [productId, coverageId]
  );

  // Update an existing limit
  const updateLimit = useCallback(
    async (limitId: string, updates: Partial<CoverageLimit>) => {
      if (!productId || !coverageId) {
        throw new Error('Product ID and Coverage ID are required');
      }

      try {
        const limitRef = doc(
          db,
          `products/${productId}/coverages/${coverageId}/limits`,
          limitId
        );

        await updateDoc(limitRef, {
          ...updates,
          updatedAt: Timestamp.now(),
        });
      } catch (err: any) {
        console.error('Error updating limit:', err);
        throw new Error(err.message || 'Failed to update limit');
      }
    },
    [productId, coverageId]
  );

  // Delete a limit
  const deleteLimit = useCallback(
    async (limitId: string) => {
      if (!productId || !coverageId) {
        throw new Error('Product ID and Coverage ID are required');
      }

      try {
        const limitRef = doc(
          db,
          `products/${productId}/coverages/${coverageId}/limits`,
          limitId
        );

        await deleteDoc(limitRef);
      } catch (err: any) {
        console.error('Error deleting limit:', err);
        throw new Error(err.message || 'Failed to delete limit');
      }
    },
    [productId, coverageId]
  );

  // Set a limit as default (and unset others)
  const setDefaultLimit = useCallback(
    async (limitId: string) => {
      if (!productId || !coverageId) {
        throw new Error('Product ID and Coverage ID are required');
      }

      try {
        // First, unset all defaults
        const updatePromises = limits.map((limit) => {
          if (limit.id === limitId) {
            return updateLimit(limit.id, { isDefault: true });
          } else if (limit.isDefault) {
            return updateLimit(limit.id, { isDefault: false });
          }
          return Promise.resolve();
        });

        await Promise.all(updatePromises);
      } catch (err: any) {
        console.error('Error setting default limit:', err);
        throw new Error(err.message || 'Failed to set default limit');
      }
    },
    [productId, coverageId, limits, updateLimit]
  );

  return {
    limits,
    loading,
    error,
    addLimit,
    updateLimit,
    deleteLimit,
    setDefaultLimit,
  };
}

