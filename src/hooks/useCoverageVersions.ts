import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { CoverageVersion, Coverage } from '../types';

/**
 * Custom hook for managing coverage versions
 * Handles CRUD operations for coverage versions subcollection
 */
export const useCoverageVersions = (productId: string | undefined, coverageId: string | undefined) => {
  const [versions, setVersions] = useState<CoverageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time listener for versions
  useEffect(() => {
    if (!productId || !coverageId) {
      setVersions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const versionsRef = collection(
      db,
      'products',
      productId,
      'coverages',
      coverageId,
      'versions'
    );

    const q = query(versionsRef, orderBy('effectiveDate', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const versionsList: CoverageVersion[] = [];
        snapshot.forEach((doc) => {
          versionsList.push({ id: doc.id, ...doc.data() } as CoverageVersion);
        });
        setVersions(versionsList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching versions:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [productId, coverageId]);

  // Create a new version
  const createVersion = useCallback(
    async (versionData: Omit<CoverageVersion, 'id'>) => {
      if (!productId || !coverageId) {
        throw new Error('Product ID and Coverage ID are required');
      }

      try {
        const versionsRef = collection(
          db,
          'products',
          productId,
          'coverages',
          coverageId,
          'versions'
        );

        const docRef = await addDoc(versionsRef, {
          ...versionData,
          coverageId,
          productId,
          createdAt: Timestamp.now(),
        });

        return docRef.id;
      } catch (err: any) {
        console.error('Error creating version:', err);
        throw new Error(`Failed to create version: ${err.message}`);
      }
    },
    [productId, coverageId]
  );

  // Update a version
  const updateVersion = useCallback(
    async (versionId: string, updates: Partial<CoverageVersion>) => {
      if (!productId || !coverageId) {
        throw new Error('Product ID and Coverage ID are required');
      }

      try {
        const versionRef = doc(
          db,
          'products',
          productId,
          'coverages',
          coverageId,
          'versions',
          versionId
        );

        await updateDoc(versionRef, updates);
      } catch (err: any) {
        console.error('Error updating version:', err);
        throw new Error(`Failed to update version: ${err.message}`);
      }
    },
    [productId, coverageId]
  );

  // Delete a version
  const deleteVersion = useCallback(
    async (versionId: string) => {
      if (!productId || !coverageId) {
        throw new Error('Product ID and Coverage ID are required');
      }

      try {
        const versionRef = doc(
          db,
          'products',
          productId,
          'coverages',
          coverageId,
          'versions',
          versionId
        );

        await deleteDoc(versionRef);
      } catch (err: any) {
        console.error('Error deleting version:', err);
        throw new Error(`Failed to delete version: ${err.message}`);
      }
    },
    [productId, coverageId]
  );

  // Get the latest version
  const getLatestVersion = useCallback(() => {
    if (versions.length === 0) return null;
    return versions[0]; // Already sorted by effectiveDate desc
  }, [versions]);

  // Get version by number
  const getVersionByNumber = useCallback(
    (versionNumber: string) => {
      return versions.find((v) => v.versionNumber === versionNumber);
    },
    [versions]
  );

  // Get active version (effective now)
  const getActiveVersion = useCallback(() => {
    const now = new Date();
    return versions.find((v) => {
      const effectiveDate = v.effectiveDate instanceof Timestamp 
        ? v.effectiveDate.toDate() 
        : new Date(v.effectiveDate);
      const expirationDate = v.expirationDate 
        ? (v.expirationDate instanceof Timestamp 
          ? v.expirationDate.toDate() 
          : new Date(v.expirationDate))
        : null;

      const isEffective = effectiveDate <= now;
      const notExpired = !expirationDate || expirationDate > now;

      return isEffective && notExpired;
    });
  }, [versions]);

  return {
    versions,
    loading,
    error,
    createVersion,
    updateVersion,
    deleteVersion,
    getLatestVersion,
    getVersionByNumber,
    getActiveVersion,
  };
};

/**
 * Utility function to create a version snapshot from current coverage
 */
export const createVersionSnapshot = (coverage: Coverage): any => {
  return {
    name: coverage.name,
    description: coverage.description,
    category: coverage.category,
    coverageType: coverage.coverageType,
    isOptional: coverage.isOptional,
    isPrimary: coverage.isPrimary,
    
    // Limits & Deductibles (legacy)
    limits: coverage.limits,
    deductibles: coverage.deductibles,
    
    // Exclusions & Conditions
    exclusions: coverage.exclusions,
    conditions: coverage.conditions,
    
    // Triggers & Periods
    coverageTrigger: coverage.coverageTrigger,
    waitingPeriod: coverage.waitingPeriod,
    waitingPeriodUnit: coverage.waitingPeriodUnit,
    allowRetroactiveDate: coverage.allowRetroactiveDate,
    extendedReportingPeriod: coverage.extendedReportingPeriod,
    
    // Valuation & Coinsurance
    valuationMethod: coverage.valuationMethod,
    depreciationMethod: coverage.depreciationMethod,
    coinsurancePercentage: coverage.coinsurancePercentage,
    hasCoinsurancePenalty: coverage.hasCoinsurancePenalty,
    insuredParticipation: coverage.insuredParticipation,
    
    // Underwriting
    requiresUnderwriterApproval: coverage.requiresUnderwriterApproval,
    eligibilityCriteria: coverage.eligibilityCriteria,
    prohibitedClasses: coverage.prohibitedClasses,
    requiredCoverages: coverage.requiredCoverages,
    incompatibleCoverages: coverage.incompatibleCoverages,
    
    // Claims
    claimsReportingPeriod: coverage.claimsReportingPeriod,
    proofOfLossDeadline: coverage.proofOfLossDeadline,
    hasSubrogationRights: coverage.hasSubrogationRights,
    hasSalvageRights: coverage.hasSalvageRights,
    
    // Territory
    territoryType: coverage.territoryType,
    excludedTerritories: coverage.excludedTerritories,
    includedTerritories: coverage.includedTerritories,
    
    // Endorsement
    modifiesCoverageId: coverage.modifiesCoverageId,
    endorsementType: coverage.endorsementType,
    supersedes: coverage.supersedes,
  };
};

/**
 * Utility function to generate next version number
 */
export const generateNextVersionNumber = (versions: CoverageVersion[]): string => {
  if (versions.length === 0) return '1.0';
  
  const latestVersion = versions[0]; // Already sorted by date
  const [major, minor] = latestVersion.versionNumber.split('.').map(Number);
  
  // Increment minor version
  return `${major}.${minor + 1}`;
};

/**
 * Utility function to compare two version snapshots
 */
export const compareVersions = (v1: any, v2: any): string[] => {
  const changes: string[] = [];
  
  const fields = [
    'name', 'description', 'category', 'coverageType', 'isOptional', 'isPrimary',
    'coverageTrigger', 'waitingPeriod', 'valuationMethod', 'depreciationMethod',
    'coinsurancePercentage', 'requiresUnderwriterApproval', 'territoryType'
  ];
  
  fields.forEach(field => {
    if (v1[field] !== v2[field]) {
      changes.push(`${field}: ${v1[field]} → ${v2[field]}`);
    }
  });
  
  return changes;
};

