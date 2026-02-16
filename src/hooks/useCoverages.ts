

/*
 * useCoverages – React hook to stream the coverages for a given product
 *
 * Usage:
 *   const { coverages, loading, error, reload } = useCoverages(productId);
 *
 * – Subscribes in real‑time via onSnapshot.
 * – Converts each doc to { id, ...data }.
 * – Provides a reload() helper if the caller wants a one‑off refresh
 *   (e.g. after an import) without waiting for the snapshot.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db, isAuthReady, safeOnSnapshot } from '../firebase';
import { Coverage } from '../types';
import logger, { LOG_CATEGORIES } from '../utils/logger';

/** True if the error is Firestore permission-denied (auth race or missing access). */
function isPermissionError(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  const msg = err instanceof Error ? err.message : String(err);
  return code === 'permission-denied' || msg.includes('Missing or insufficient permissions');
}

interface EnrichedCoverage extends Coverage {
  formIds: string[];
  limitsCount: number;
  deductiblesCount: number;
}

interface UseCoveragesResult {
  coverages: EnrichedCoverage[];
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

export default function useCoverages(productId: string | null | undefined): UseCoveragesResult {
  const [coverages, setCoverages] = useState<EnrichedCoverage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Helper function to enrich coverages with linked forms and subcollection counts
  const enrichCoveragesWithForms = useCallback(async (coveragesList: Coverage[]): Promise<EnrichedCoverage[]> => {
    try {
      // Fetch all form-coverage links for this product
      const linksSnap = await getDocs(
        query(
          collection(db, 'formCoverages'),
          where('productId', '==', productId)
        )
      );

      // Build a map of coverageId -> [formIds]
      const formsByCoverage: Record<string, string[]> = {};
      linksSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const coverageId = data.coverageId as string;
        const formId = data.formId as string;
        if (!formsByCoverage[coverageId]) {
          formsByCoverage[coverageId] = [];
        }
        formsByCoverage[coverageId].push(formId);
      });

      // Enrich each coverage with its linked form IDs and subcollection counts
      const enrichedCoverages = await Promise.all(
        coveragesList.map(async (coverage) => {
          try {
            let limitsCount = 0;
            let deductiblesCount = 0;

            // Count limits from new limitOptionSets structure
            const limitOptionSetsSnap = await getDocs(
              collection(db, `products/${productId}/coverages/${coverage.id}/limitOptionSets`)
            );

            // If we have option sets, count the options inside them
            if (!limitOptionSetsSnap.empty) {
              for (const setDoc of limitOptionSetsSnap.docs) {
                const optionsSnap = await getDocs(
                  collection(db, `products/${productId}/coverages/${coverage.id}/limitOptionSets/${setDoc.id}/options`)
                );
                limitsCount += optionsSnap.size;
              }
            } else {
              // Fallback: check legacy limits subcollection
              const legacyLimitsSnap = await getDocs(
                collection(db, `products/${productId}/coverages/${coverage.id}/limits`)
              );
              limitsCount = legacyLimitsSnap.size;
            }

            // Count deductibles from new deductibleOptionSets structure
            const deductibleOptionSetsSnap = await getDocs(
              collection(db, `products/${productId}/coverages/${coverage.id}/deductibleOptionSets`)
            );

            // If we have option sets, count the options inside them
            if (!deductibleOptionSetsSnap.empty) {
              for (const setDoc of deductibleOptionSetsSnap.docs) {
                const optionsSnap = await getDocs(
                  collection(db, `products/${productId}/coverages/${coverage.id}/deductibleOptionSets/${setDoc.id}/options`)
                );
                deductiblesCount += optionsSnap.size;
              }
            } else {
              // Fallback: check legacy deductibles subcollection
              const legacyDeductiblesSnap = await getDocs(
                collection(db, `products/${productId}/coverages/${coverage.id}/deductibles`)
              );
              deductiblesCount = legacyDeductiblesSnap.size;
            }

            return {
              ...coverage,
              formIds: formsByCoverage[coverage.id] || [],
              limitsCount,
              deductiblesCount
            };
          } catch (err) {
            // Permission errors are expected during auth propagation or when user lacks access; skip noisy logs
            if (!isPermissionError(err)) {
              logger.warn(LOG_CATEGORIES.DATA, `Error enriching coverage ${coverage.id}`, { error: String(err) });
            }
            return {
              ...coverage,
              formIds: formsByCoverage[coverage.id] || [],
              limitsCount: 0,
              deductiblesCount: 0
            };
          }
        })
      );

      return enrichedCoverages;
    } catch (err) {
      if (!isPermissionError(err)) {
        logger.warn(LOG_CATEGORIES.DATA, 'Error enriching coverages with forms', { error: String(err) });
      }
      // Return with default enrichment values when error occurs
      return coveragesList.map(c => ({
        ...c,
        formIds: [],
        limitsCount: 0,
        deductiblesCount: 0
      }));
    }
  }, [productId]);

  // real‑time listener
  useEffect(() => {
    // Wait for auth to fully propagate before subscribing
    if (!isAuthReady() || !productId) return;
    setLoading(true);

    const q = query(
      collection(db, `products/${productId}/coverages`),
      orderBy('coverageCode')      // stable sort
    );

    const unsub = safeOnSnapshot(
      q,
      async snap => {
        const baseCoverages = snap.docs.map(d => ({ id: d.id, ...d.data() } as Coverage));
        const enriched = await enrichCoveragesWithForms(baseCoverages);
        setCoverages(enriched);
        setLoading(false);
      },
      err => {
        logger.error(LOG_CATEGORIES.ERROR, 'Coverages snapshot failed', {}, err as Error);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [productId, enrichCoveragesWithForms]);

  /* manual reload helper ----------------------------------------- */
  const reload = useCallback(async (): Promise<void> => {
    if (!productId) return;
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, `products/${productId}/coverages`))
      );
      const baseCoverages = snap.docs.map(d => ({ id: d.id, ...d.data() } as Coverage));
      const enriched = await enrichCoveragesWithForms(baseCoverages);
      setCoverages(enriched);
      setLoading(false);
    } catch (err) {
      logger.error(LOG_CATEGORIES.ERROR, 'Coverages reload failed', {}, err as Error);
      setError(err as Error);
      setLoading(false);
    }
  }, [productId, enrichCoveragesWithForms]);

  return { coverages, loading, error, reload };
}