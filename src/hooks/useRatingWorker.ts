/**
 * Rating Worker Hook
 * Provides an interface for offloading rating calculations to a Web Worker
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { RatingWorkerInput } from '../workers/ratingWorker';

interface WorkerResult<T> {
  type: 'SUCCESS' | 'ERROR';
  requestId: string;
  result?: T;
  error?: string;
}

interface UseRatingWorkerOptions {
  onError?: (error: string) => void;
}

export function useRatingWorker<T>(options?: UseRatingWorkerOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const pendingRequests = useRef<Map<string, { resolve: (value: T) => void; reject: (error: Error) => void }>>(new Map());

  // Initialize worker
  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL('../workers/ratingWorker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = (event: MessageEvent<WorkerResult<T>>) => {
        const { type, requestId, result, error: errorMsg } = event.data;
        const pending = pendingRequests.current.get(requestId);
        
        if (pending) {
          pendingRequests.current.delete(requestId);
          
          if (type === 'SUCCESS' && result !== undefined) {
            pending.resolve(result);
          } else {
            pending.reject(new Error(errorMsg || 'Unknown worker error'));
          }
        }
      };

      workerRef.current.onerror = (event) => {
        const errorMessage = event.message || 'Worker error';
        setError(errorMessage);
        options?.onError?.(errorMessage);
        
        // Reject all pending requests
        pendingRequests.current.forEach((pending) => {
          pending.reject(new Error(errorMessage));
        });
        pendingRequests.current.clear();
      };
    } catch (err) {
      // Worker not supported or failed to load
      setError('Web Workers not supported');
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const calculate = useCallback(<R>(input: Omit<RatingWorkerInput, 'requestId'>): Promise<R> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      pendingRequests.current.set(requestId, {
        resolve: resolve as (value: T) => void,
        reject,
      });

      setLoading(true);
      setError(null);

      workerRef.current.postMessage({
        ...input,
        requestId,
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingRequests.current.has(requestId)) {
          pendingRequests.current.delete(requestId);
          setLoading(false);
          reject(new Error('Calculation timeout'));
        }
      }, 30000);
    }).finally(() => setLoading(false));
  }, []);

  const calculateRating = useCallback(
    (payload: RatingWorkerInput['payload']) => 
      calculate<{ premium: number; breakdown: Record<string, number>; steps: { step: string; result: number }[] }>({
        type: 'CALCULATE_RATING',
        payload,
      }),
    [calculate]
  );

  const calculateILF = useCallback(
    (payload: RatingWorkerInput['payload']) =>
      calculate<{ ilf: number; basicLimitPremium: number; increasedLimitPremium: number }>({
        type: 'CALCULATE_ILF',
        payload,
      }),
    [calculate]
  );

  const calculateExperienceMod = useCallback(
    (payload: RatingWorkerInput['payload']) =>
      calculate<{ experienceMod: number; expectedLosses: number; actualPrimary: number }>({
        type: 'CALCULATE_EXPERIENCE_MOD',
        payload,
      }),
    [calculate]
  );

  const calculateScheduleRating = useCallback(
    (payload: RatingWorkerInput['payload']) =>
      calculate<{ totalScheduleCredit: number; modifiedPremium: number }>({
        type: 'CALCULATE_SCHEDULE_RATING',
        payload,
      }),
    [calculate]
  );

  return {
    loading,
    error,
    calculateRating,
    calculateILF,
    calculateExperienceMod,
    calculateScheduleRating,
    isWorkerAvailable: !!workerRef.current,
  };
}

export default useRatingWorker;

