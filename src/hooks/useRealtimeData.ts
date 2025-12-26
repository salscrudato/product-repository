/**
 * Real-Time Data Hooks
 * Firestore real-time subscription hooks with caching and offline support
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  doc, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  DocumentSnapshot,
  QuerySnapshot,
  QueryConstraint,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase';
import logger, { LOG_CATEGORIES } from '@utils/logger';
import type { Product } from '../types';

// Generic real-time document hook
export function useRealtimeDocument<T>(
  collectionName: string,
  documentId: string | undefined,
  options?: {
    includeMetadata?: boolean;
    onError?: (error: Error) => void;
  }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    if (!documentId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const docRef = doc(db, collectionName, documentId);
    
    unsubscribeRef.current = onSnapshot(
      docRef,
      { includeMetadataChanges: options?.includeMetadata ?? true },
      (snapshot: DocumentSnapshot) => {
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() } as T);
          setIsFromCache(snapshot.metadata.fromCache);
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        logger.error(LOG_CATEGORIES.ERROR, 'Realtime document error', {
          collection: collectionName,
          documentId,
          error: err.message,
        });
        setError(err);
        setLoading(false);
        options?.onError?.(err);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [collectionName, documentId, options?.includeMetadata]);

  return { data, loading, error, isFromCache };
}

// Generic real-time collection hook
export function useRealtimeCollection<T>(
  collectionName: string,
  constraints?: QueryConstraint[],
  options?: {
    enabled?: boolean;
    onError?: (error: Error) => void;
  }
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    if (options?.enabled === false) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const collectionRef = collection(db, collectionName);
    const q = constraints ? query(collectionRef, ...constraints) : query(collectionRef);

    unsubscribeRef.current = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot: QuerySnapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        setData(items);
        setIsFromCache(snapshot.metadata.fromCache);
        setLoading(false);
      },
      (err) => {
        logger.error(LOG_CATEGORIES.ERROR, 'Realtime collection error', {
          collection: collectionName,
          error: err.message,
        });
        setError(err);
        setLoading(false);
        options?.onError?.(err);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [collectionName, JSON.stringify(constraints), options?.enabled]);

  return { data, loading, error, isFromCache };
}

// Specialized hook for real-time product
export function useRealtimeProduct(productId: string | undefined) {
  return useRealtimeDocument<Product>('products', productId);
}

// Real-time workitems for underwriting
export function useRealtimeWorkitems(filters?: { 
  status?: string; 
  assignedTo?: string;
  queue?: string;
}) {
  const constraints: QueryConstraint[] = [orderBy('receivedAt', 'desc')];
  
  if (filters?.status) {
    constraints.push(where('status', '==', filters.status));
  }
  if (filters?.assignedTo) {
    constraints.push(where('assignedTo', '==', filters.assignedTo));
  }

  return useRealtimeCollection('underwritingWorkitems', constraints);
}

// Real-time compliance status
export function useRealtimeComplianceStatus(productId: string | undefined) {
  const constraints = productId 
    ? [where('productId', '==', productId)]
    : undefined;

  return useRealtimeCollection('complianceStatus', constraints, {
    enabled: !!productId,
  });
}

export default {
  useRealtimeDocument,
  useRealtimeCollection,
  useRealtimeProduct,
  useRealtimeWorkitems,
  useRealtimeComplianceStatus,
};

