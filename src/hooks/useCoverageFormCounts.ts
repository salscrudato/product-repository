/**
 * useCoverageFormCounts Hook
 * Fetches form counts for coverages from the junction table
 */

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import logger, { LOG_CATEGORIES } from '@utils/logger';

interface FormCountMap {
  [coverageId: string]: number;
}

/**
 * Get form counts for multiple coverages
 * Reads from formCoverages junction table
 */
export function useCoverageFormCounts(
  productId: string | undefined,
  coverageIds: string[] | undefined
): FormCountMap {
  const [counts, setCounts] = useState<FormCountMap>({});

  useEffect(() => {
    if (!productId || !coverageIds || coverageIds.length === 0) {
      setCounts({});
      return;
    }

    const fetchCounts = async () => {
      try {
        const linksSnap = await getDocs(
          query(
            collection(db, 'formCoverages'),
            where('productId', '==', productId)
          )
        );

        const countMap: FormCountMap = {};
        coverageIds.forEach(id => {
          countMap[id] = 0;
        });

        linksSnap.docs.forEach(doc => {
          const { coverageId } = doc.data();
          if (coverageIds.includes(coverageId)) {
            countMap[coverageId] = (countMap[coverageId] || 0) + 1;
          }
        });

        setCounts(countMap);
      } catch (error) {
        logger.error(LOG_CATEGORIES.ERROR, 'Failed to fetch form counts', {
          productId,
          coverageCount: coverageIds.length,
        }, error as Error);
        setCounts({});
      }
    };

    fetchCounts();
  }, [productId, coverageIds?.join(',')]);  // Use join to create stable dependency

  return counts;
}

/**
 * Get form count for a single coverage
 */
export function useCoverageFormCount(
  productId: string | undefined,
  coverageId: string | undefined
): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!productId || !coverageId) {
      setCount(0);
      return;
    }

    const fetchCount = async () => {
      try {
        const linksSnap = await getDocs(
          query(
            collection(db, 'formCoverages'),
            where('productId', '==', productId),
            where('coverageId', '==', coverageId)
          )
        );
        setCount(linksSnap.docs.length);
      } catch (error) {
        logger.error(LOG_CATEGORIES.ERROR, 'Failed to fetch form count', {
          productId,
          coverageId,
        }, error as Error);
        setCount(0);
      }
    };

    fetchCount();
  }, [productId, coverageId]);

  return count;
}

