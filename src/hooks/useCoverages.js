

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
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';

export default function useCoverages(productId) {
  const [coverages, setCoverages] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

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
      snap => {
        setCoverages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      err => {
        console.error('Coverages snapshot failed:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [productId]);

  /* manual reload helper ----------------------------------------- */
  const reload = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, `products/${productId}/coverages`))
      );
      setCoverages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    } catch (err) {
      console.error('Coverages reload failed:', err);
      setError(err);
      setLoading(false);
    }
  }, [productId]);

  return { coverages, loading, error, reload };
}