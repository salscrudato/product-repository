import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  Timestamp,
  where
} from 'firebase/firestore';
import { db, isAuthReady, safeOnSnapshot } from '../firebase';
import { CoveragePackage } from '../types';

/**
 * Custom hook for managing coverage packages
 * Handles CRUD operations for coverage packages collection
 */
export const useCoveragePackages = (productId: string | undefined) => {
  const [packages, setPackages] = useState<CoveragePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time listener for packages
  useEffect(() => {
    // Wait for auth to fully propagate before subscribing
    if (!isAuthReady() || !productId) {
      setPackages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const packagesRef = collection(db, 'products', productId, 'packages');
    const q = query(packagesRef, orderBy('name', 'asc'));

    const unsubscribe = safeOnSnapshot(
      q,
      (snapshot) => {
        const packagesList: CoveragePackage[] = [];
        snapshot.forEach((doc) => {
          packagesList.push({ id: doc.id, ...doc.data() } as CoveragePackage);
        });
        setPackages(packagesList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching packages:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [productId]);

  // Create a new package
  const createPackage = useCallback(
    async (packageData: Omit<CoveragePackage, 'id'>) => {
      if (!productId) {
        throw new Error('Product ID is required');
      }

      try {
        const packagesRef = collection(db, 'products', productId, 'packages');

        const docRef = await addDoc(packagesRef, {
          ...packageData,
          productId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        return docRef.id;
      } catch (err: any) {
        console.error('Error creating package:', err);
        throw new Error(`Failed to create package: ${err.message}`);
      }
    },
    [productId]
  );

  // Update a package
  const updatePackage = useCallback(
    async (packageId: string, updates: Partial<CoveragePackage>) => {
      if (!productId) {
        throw new Error('Product ID is required');
      }

      try {
        const packageRef = doc(db, 'products', productId, 'packages', packageId);

        await updateDoc(packageRef, {
          ...updates,
          updatedAt: Timestamp.now(),
        });
      } catch (err: any) {
        console.error('Error updating package:', err);
        throw new Error(`Failed to update package: ${err.message}`);
      }
    },
    [productId]
  );

  // Delete a package
  const deletePackage = useCallback(
    async (packageId: string) => {
      if (!productId) {
        throw new Error('Product ID is required');
      }

      try {
        const packageRef = doc(db, 'products', productId, 'packages', packageId);
        await deleteDoc(packageRef);
      } catch (err: any) {
        console.error('Error deleting package:', err);
        throw new Error(`Failed to delete package: ${err.message}`);
      }
    },
    [productId]
  );

  // Get packages by type
  const getPackagesByType = useCallback(
    (packageType: string) => {
      return packages.filter((pkg) => pkg.packageType === packageType);
    },
    [packages]
  );

  // Get packages containing a specific coverage
  const getPackagesWithCoverage = useCallback(
    (coverageId: string) => {
      return packages.filter((pkg) => pkg.coverageIds.includes(coverageId));
    },
    [packages]
  );

  return {
    packages,
    loading,
    error,
    createPackage,
    updatePackage,
    deletePackage,
    getPackagesByType,
    getPackagesWithCoverage,
  };
};

/**
 * Calculate package premium with discount
 */
export const calculatePackagePremium = (
  individualPremiums: number[],
  discountPercentage?: number
): number => {
  const totalPremium = individualPremiums.reduce((sum, premium) => sum + premium, 0);
  
  if (!discountPercentage || discountPercentage === 0) {
    return totalPremium;
  }
  
  const discount = totalPremium * (discountPercentage / 100);
  return totalPremium - discount;
};

/**
 * Validate package data
 */
export const validatePackage = (packageData: Partial<CoveragePackage>): string[] => {
  const errors: string[] = [];
  
  if (!packageData.name || packageData.name.trim() === '') {
    errors.push('Package name is required');
  }
  
  if (!packageData.packageType) {
    errors.push('Package type is required');
  }
  
  if (!packageData.coverageIds || packageData.coverageIds.length === 0) {
    errors.push('At least one coverage must be selected');
  }
  
  if (packageData.discountPercentage !== undefined) {
    if (packageData.discountPercentage < 0 || packageData.discountPercentage > 100) {
      errors.push('Discount percentage must be between 0 and 100');
    }
  }
  
  if (packageData.packagePremium !== undefined && packageData.packagePremium < 0) {
    errors.push('Package premium cannot be negative');
  }
  
  return errors;
};

/**
 * Generate package recommendations based on selected coverages
 */
export const generatePackageRecommendations = (
  selectedCoverageIds: string[],
  allPackages: CoveragePackage[]
): CoveragePackage[] => {
  if (selectedCoverageIds.length === 0) {
    return [];
  }
  
  // Find packages that contain any of the selected coverages
  const relevantPackages = allPackages.filter((pkg) => {
    const matchingCoverages = pkg.coverageIds.filter((id) => 
      selectedCoverageIds.includes(id)
    );
    return matchingCoverages.length > 0;
  });
  
  // Sort by relevance (number of matching coverages) and discount
  return relevantPackages.sort((a, b) => {
    const aMatches = a.coverageIds.filter((id) => selectedCoverageIds.includes(id)).length;
    const bMatches = b.coverageIds.filter((id) => selectedCoverageIds.includes(id)).length;
    
    if (aMatches !== bMatches) {
      return bMatches - aMatches; // More matches first
    }
    
    // If same matches, sort by discount
    const aDiscount = a.discountPercentage || 0;
    const bDiscount = b.discountPercentage || 0;
    return bDiscount - aDiscount; // Higher discount first
  });
};

