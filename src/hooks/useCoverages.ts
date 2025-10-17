

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
  onSnapshot,
  getDocs,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../firebase';

export default function useCoverages(productId) {
  const [coverages, setCoverages] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  // Helper function to enrich coverages with linked forms
  const enrichCoveragesWithForms = useCallback(async (coveragesList) => {
    try {
      // Fetch all form-coverage links for this product
      const linksSnap = await getDocs(
        query(
          collection(db, 'formCoverages'),
          where('productId', '==', productId)
        )
      );

      // Build a map of coverageId -> [formIds]
      const formsByCoverage = {};
      linksSnap.docs.forEach(doc => {
        const { coverageId, formId } = doc.data();
        if (!formsByCoverage[coverageId]) {
          formsByCoverage[coverageId] = [];
        }
        formsByCoverage[coverageId].push(formId);
      });

      // Enrich each coverage with its linked form IDs
      return coveragesList.map(coverage => ({
        ...coverage,
        formIds: formsByCoverage[coverage.id] || []
      }));
    } catch (err) {
      console.error('Error enriching coverages with forms:', err);
      return coveragesList;
    }
  }, [productId]);

  // real‑time listener
  useEffect(() => {
    if (!productId) return;      // guard for first render
    setLoading(true);

    const q = query(
      collection(db, `products/${productId}/coverages`),
      orderBy('coverageCode')      // stable sort
    );

    const unsub = onSnapshot(
      q,
      async snap => {
        const baseCoverages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const enriched = await enrichCoveragesWithForms(baseCoverages);
        setCoverages(enriched);
        setLoading(false);
      },
      err => {
        console.error('Coverages snapshot failed:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [productId, enrichCoveragesWithForms]);

  /* manual reload helper ----------------------------------------- */
  const reload = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, `products/${productId}/coverages`))
      );
      const baseCoverages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const enriched = await enrichCoveragesWithForms(baseCoverages);
      setCoverages(enriched);
      setLoading(false);
    } catch (err) {
      console.error('Coverages reload failed:', err);
      setError(err);
      setLoading(false);
    }
  }, [productId, enrichCoveragesWithForms]);

  return { coverages, loading, error, reload };
}