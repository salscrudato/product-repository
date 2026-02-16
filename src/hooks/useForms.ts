/**
 * useForms Hook - Fetch forms for a product
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, isAuthReady, safeOnSnapshot } from '../firebase';
import { normalizeFirestoreData } from '../utils/firestoreHelpers';
import type { FormTemplate, FormCoverageMapping } from '../types';
import logger, { LOG_CATEGORIES } from '../utils/logger';

interface UseFormsResult {
  forms: FormTemplate[];
  formMappings: FormCoverageMapping[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  getFormsForCoverage: (coverageId: string) => FormTemplate[];
}

export function useForms(productId: string | null | undefined): UseFormsResult {
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [formMappings, setFormMappings] = useState<FormCoverageMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  // Fetch forms and their mappings
  useEffect(() => {
    // Wait for auth to fully propagate before subscribing
    if (!isAuthReady() || !productId) {
      setForms([]);
      setFormMappings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe to forms collection
    const formsQuery = query(
      collection(db, 'forms'),
      where('productId', '==', productId)
    );

    const unsubscribeForms = safeOnSnapshot(
      formsQuery,
      async (snapshot) => {
        try {
          const formsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...normalizeFirestoreData(doc.data())
          } as FormTemplate));

          setForms(formsData);

          // Fetch form-coverage mappings
          const mappingsQuery = query(
            collection(db, 'formCoverages'),
            where('productId', '==', productId)
          );
          
          const mappingsSnapshot = await getDocs(mappingsQuery);
          const mappingsData = mappingsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as FormCoverageMapping));

          setFormMappings(mappingsData);
          setLoading(false);

          logger.debug(LOG_CATEGORIES.DATA, 'Forms fetched', { 
            productId, 
            formCount: formsData.length,
            mappingCount: mappingsData.length 
          });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to load forms';
          logger.error(LOG_CATEGORIES.ERROR, 'Forms fetch error', { productId }, err as Error);
          setError(errorMsg);
          setLoading(false);
        }
      },
      (err) => {
        const errorMsg = err.message || 'Failed to subscribe to forms';
        logger.error(LOG_CATEGORIES.ERROR, 'Forms subscription error', { productId }, err);
        setError(errorMsg);
        setLoading(false);
      }
    );

    return () => unsubscribeForms();
  }, [productId]);

  // Helper to get forms for a specific coverage
  const getFormsForCoverage = useCallback((coverageId: string): FormTemplate[] => {
    const mappingsForCoverage = formMappings.filter(m => m.coverageId === coverageId);
    const formIds = mappingsForCoverage.map(m => m.formId);
    return forms.filter(f => formIds.includes(f.id));
  }, [forms, formMappings]);

  return useMemo<UseFormsResult>(() => ({
    forms,
    formMappings,
    loading,
    error,
    refetch,
    getFormsForCoverage
  }), [forms, formMappings, loading, error, refetch, getFormsForCoverage]);
}

export default useForms;

