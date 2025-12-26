/**
 * useRules - React hook for managing rules with real-time updates
 * 
 * Usage:
 *   const { rules, loading, error, addRule, updateRule, deleteRule, reload } = useRules(productId, coverageId);
 * 
 * - Subscribes in real-time via onSnapshot
 * - Filters by productId and optionally by coverageId
 * - Provides CRUD operations
 * - Includes caching for performance
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Rule, RuleType, RuleCategory, RuleStatus } from '../types';
import { CACHE } from '../config/constants';

interface UseRulesOptions {
  productId?: string;
  coverageId?: string;
  ruleType?: RuleType;
  ruleCategory?: RuleCategory;
  status?: RuleStatus;
  enableCache?: boolean;
}

interface UseRulesReturn {
  rules: Rule[];
  loading: boolean;
  error: Error | null;
  addRule: (ruleData: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateRule: (ruleId: string, updates: Partial<Rule>) => Promise<void>;
  deleteRule: (ruleId: string) => Promise<void>;
  bulkUpdateStatus: (ruleIds: string[], status: RuleStatus) => Promise<void>;
  bulkDelete: (ruleIds: string[]) => Promise<void>;
  reload: () => Promise<void>;
  getRulesByType: (type: RuleType) => Rule[];
  getRulesByCategory: (category: RuleCategory) => Rule[];
  getActiveRules: () => Rule[];
}

// Cache for rules data (uses centralized CACHE config)
const rulesCache = new Map<string, {
  data: Rule[];
  timestamp: number;
}>();

const CACHE_DURATION = CACHE.TTL_RULES;

export function useRules(options: UseRulesOptions = {}): UseRulesReturn {
  const {
    productId,
    coverageId,
    ruleType,
    ruleCategory,
    status,
    enableCache = true
  } = options;

  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Generate cache key based on filters
  const cacheKey = useMemo(() => {
    return `rules_${productId || 'all'}_${coverageId || 'all'}_${ruleType || 'all'}_${ruleCategory || 'all'}_${status || 'all'}`;
  }, [productId, coverageId, ruleType, ruleCategory, status]);

  // Build query based on options
  const buildQuery = useCallback(() => {
    let q = collection(db, 'rules');
    const constraints: any[] = [];

    if (productId) {
      constraints.push(where('productId', '==', productId));
    }

    if (ruleType) {
      constraints.push(where('ruleType', '==', ruleType));
    }

    if (ruleCategory) {
      constraints.push(where('ruleCategory', '==', ruleCategory));
    }

    if (status) {
      constraints.push(where('status', '==', status));
    }

    // Add ordering
    constraints.push(orderBy('name'));

    return constraints.length > 0 ? query(q, ...constraints) : query(q, orderBy('name'));
  }, [productId, ruleType, ruleCategory, status]);

  // Real-time listener
  useEffect(() => {
    // Check cache first
    if (enableCache) {
      const cached = rulesCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setRules(cached.data);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);

    const q = buildQuery();

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          let rulesList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Rule));

          // Client-side filter for coverageId (since we can't compound query on targetId)
          if (coverageId) {
            rulesList = rulesList.filter(rule => 
              rule.ruleType === 'Coverage' && rule.targetId === coverageId
            );
          }

          setRules(rulesList);
          setLoading(false);

          // Update cache
          if (enableCache) {
            rulesCache.set(cacheKey, {
              data: rulesList,
              timestamp: Date.now()
            });
          }
        } catch (err) {
          console.error('Error processing rules snapshot:', err);
          setError(err as Error);
          setLoading(false);
        }
      },
      (err) => {
        console.error('Rules subscription failed:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [buildQuery, coverageId, cacheKey, enableCache]);

  // Add rule
  const addRule = useCallback(async (ruleData: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, 'rules'), {
        ...ruleData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // Invalidate cache
      rulesCache.delete(cacheKey);

      return docRef.id;
    } catch (err) {
      console.error('Failed to add rule:', err);
      throw err;
    }
  }, [cacheKey]);

  // Update rule
  const updateRule = useCallback(async (ruleId: string, updates: Partial<Rule>): Promise<void> => {
    try {
      await updateDoc(doc(db, 'rules', ruleId), {
        ...updates,
        updatedAt: Timestamp.now()
      });

      // Invalidate cache
      rulesCache.delete(cacheKey);
    } catch (err) {
      console.error('Failed to update rule:', err);
      throw err;
    }
  }, [cacheKey]);

  // Delete rule
  const deleteRule = useCallback(async (ruleId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'rules', ruleId));

      // Invalidate cache
      rulesCache.delete(cacheKey);
    } catch (err) {
      console.error('Failed to delete rule:', err);
      throw err;
    }
  }, [cacheKey]);

  // Bulk update status
  const bulkUpdateStatus = useCallback(async (ruleIds: string[], newStatus: RuleStatus): Promise<void> => {
    try {
      const promises = ruleIds.map(ruleId =>
        updateDoc(doc(db, 'rules', ruleId), {
          status: newStatus,
          updatedAt: Timestamp.now()
        })
      );

      await Promise.all(promises);

      // Invalidate cache
      rulesCache.delete(cacheKey);
    } catch (err) {
      console.error('Failed to bulk update rules:', err);
      throw err;
    }
  }, [cacheKey]);

  // Bulk delete
  const bulkDelete = useCallback(async (ruleIds: string[]): Promise<void> => {
    try {
      const promises = ruleIds.map(ruleId =>
        deleteDoc(doc(db, 'rules', ruleId))
      );

      await Promise.all(promises);

      // Invalidate cache
      rulesCache.delete(cacheKey);
    } catch (err) {
      console.error('Failed to bulk delete rules:', err);
      throw err;
    }
  }, [cacheKey]);

  // Manual reload
  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const q = buildQuery();
      const snapshot = await getDocs(q);
      
      let rulesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Rule));

      // Client-side filter for coverageId
      if (coverageId) {
        rulesList = rulesList.filter(rule => 
          rule.ruleType === 'Coverage' && rule.targetId === coverageId
        );
      }

      setRules(rulesList);
      setLoading(false);

      // Update cache
      if (enableCache) {
        rulesCache.set(cacheKey, {
          data: rulesList,
          timestamp: Date.now()
        });
      }
    } catch (err) {
      console.error('Failed to reload rules:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, [buildQuery, coverageId, cacheKey, enableCache]);

  // Helper: Get rules by type
  const getRulesByType = useCallback((type: RuleType): Rule[] => {
    return rules.filter(rule => rule.ruleType === type);
  }, [rules]);

  // Helper: Get rules by category
  const getRulesByCategory = useCallback((category: RuleCategory): Rule[] => {
    return rules.filter(rule => rule.ruleCategory === category);
  }, [rules]);

  // Helper: Get active rules
  const getActiveRules = useCallback((): Rule[] => {
    return rules.filter(rule => rule.status === 'Active');
  }, [rules]);

  return {
    rules,
    loading,
    error,
    addRule,
    updateRule,
    deleteRule,
    bulkUpdateStatus,
    bulkDelete,
    reload,
    getRulesByType,
    getRulesByCategory,
    getActiveRules
  };
}

export default useRules;

