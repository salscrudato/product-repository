/**
 * Custom hook for managing coverage deductibles
 * Handles fetching, creating, updating, and deleting deductibles from Firestore subcollection
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
import { CoverageDeductible } from '../types';

interface UseCoverageDeductiblesResult {
  deductibles: CoverageDeductible[];
  loading: boolean;
  error: string | null;
  addDeductible: (deductible: Omit<CoverageDeductible, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateDeductible: (deductibleId: string, updates: Partial<CoverageDeductible>) => Promise<void>;
  deleteDeductible: (deductibleId: string) => Promise<void>;
  setDefaultDeductible: (deductibleId: string) => Promise<void>;
}

export function useCoverageDeductibles(
  productId: string | undefined,
  coverageId: string | undefined
): UseCoverageDeductiblesResult {
  const [deductibles, setDeductibles] = useState<CoverageDeductible[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch deductibles with real-time updates
  useEffect(() => {
    if (!productId || !coverageId) {
      setDeductibles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const deductiblesRef = collection(
      db,
      `products/${productId}/coverages/${coverageId}/deductibles`
    );
    const q = query(deductiblesRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const deductiblesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as CoverageDeductible[];
        
        setDeductibles(deductiblesData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching deductibles:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [productId, coverageId]);

  // Add a new deductible
  const addDeductible = useCallback(
    async (deductibleData: Omit<CoverageDeductible, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!productId || !coverageId) {
        throw new Error('Product ID and Coverage ID are required');
      }

      try {
        const deductiblesRef = collection(
          db,
          `products/${productId}/coverages/${coverageId}/deductibles`
        );

        const newDeductible = {
          ...deductibleData,
          coverageId,
          productId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const docRef = await addDoc(deductiblesRef, newDeductible);
        return docRef.id;
      } catch (err: any) {
        console.error('Error adding deductible:', err);
        throw new Error(err.message || 'Failed to add deductible');
      }
    },
    [productId, coverageId]
  );

  // Update an existing deductible
  const updateDeductible = useCallback(
    async (deductibleId: string, updates: Partial<CoverageDeductible>) => {
      if (!productId || !coverageId) {
        throw new Error('Product ID and Coverage ID are required');
      }

      try {
        const deductibleRef = doc(
          db,
          `products/${productId}/coverages/${coverageId}/deductibles`,
          deductibleId
        );

        await updateDoc(deductibleRef, {
          ...updates,
          updatedAt: Timestamp.now(),
        });
      } catch (err: any) {
        console.error('Error updating deductible:', err);
        throw new Error(err.message || 'Failed to update deductible');
      }
    },
    [productId, coverageId]
  );

  // Delete a deductible
  const deleteDeductible = useCallback(
    async (deductibleId: string) => {
      if (!productId || !coverageId) {
        throw new Error('Product ID and Coverage ID are required');
      }

      try {
        const deductibleRef = doc(
          db,
          `products/${productId}/coverages/${coverageId}/deductibles`,
          deductibleId
        );

        await deleteDoc(deductibleRef);
      } catch (err: any) {
        console.error('Error deleting deductible:', err);
        throw new Error(err.message || 'Failed to delete deductible');
      }
    },
    [productId, coverageId]
  );

  // Set a deductible as default (and unset others)
  const setDefaultDeductible = useCallback(
    async (deductibleId: string) => {
      if (!productId || !coverageId) {
        throw new Error('Product ID and Coverage ID are required');
      }

      try {
        // First, unset all defaults
        const updatePromises = deductibles.map((deductible) => {
          if (deductible.id === deductibleId) {
            return updateDeductible(deductible.id, { isDefault: true });
          } else if (deductible.isDefault) {
            return updateDeductible(deductible.id, { isDefault: false });
          }
          return Promise.resolve();
        });

        await Promise.all(updatePromises);
      } catch (err: any) {
        console.error('Error setting default deductible:', err);
        throw new Error(err.message || 'Failed to set default deductible');
      }
    },
    [productId, coverageId, deductibles, updateDeductible]
  );

  return {
    deductibles,
    loading,
    error,
    addDeductible,
    updateDeductible,
    deleteDeductible,
    setDefaultDeductible,
  };
}

