/**
 * State Availability Service
 * 
 * Manages coverage state availability with inheritance from product.
 * Supports state-specific overrides for limits, deductibles, and forms.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { CoverageStateAvailability, StateOverride } from '../types/coverageConfig';

// US States list
export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
];

// ============================================================================
// Collection Path Helpers
// ============================================================================

const getStateAvailabilityPath = (productId: string, coverageId: string) =>
  `products/${productId}/coverages/${coverageId}/stateAvailability`;

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Fetch state availability for a coverage
 */
export const fetchCoverageStateAvailability = async (
  productId: string,
  coverageId: string
): Promise<CoverageStateAvailability[]> => {
  const path = getStateAvailabilityPath(productId, coverageId);
  const q = query(collection(db, path), orderBy('stateCode', 'asc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as CoverageStateAvailability[];
};

/**
 * Get product-level state availability (inherited)
 */
export const fetchProductStateAvailability = async (
  productId: string
): Promise<string[]> => {
  const productDoc = await getDoc(doc(db, 'products', productId));
  if (!productDoc.exists()) return [];
  
  const data = productDoc.data();
  return data?.availableStates || [];
};

/**
 * Set state availability for a coverage
 */
export const setCoverageStateAvailability = async (
  productId: string,
  coverageId: string,
  stateCode: string,
  data: Omit<CoverageStateAvailability, 'id' | 'stateCode' | 'createdAt' | 'updatedAt'>
): Promise<void> => {
  const path = getStateAvailabilityPath(productId, coverageId);
  const docRef = doc(db, path, stateCode);
  
  await setDoc(docRef, {
    stateCode,
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

/**
 * Batch update state availability
 */
export const batchUpdateStateAvailability = async (
  productId: string,
  coverageId: string,
  updates: Array<{ stateCode: string; data: Partial<CoverageStateAvailability> }>
): Promise<void> => {
  const batch = writeBatch(db);
  const path = getStateAvailabilityPath(productId, coverageId);
  
  updates.forEach(({ stateCode, data }) => {
    const docRef = doc(db, path, stateCode);
    batch.set(docRef, {
      stateCode,
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
  
  await batch.commit();
};

/**
 * Remove state availability override
 */
export const removeStateAvailability = async (
  productId: string,
  coverageId: string,
  stateCode: string
): Promise<void> => {
  const path = getStateAvailabilityPath(productId, coverageId);
  await deleteDoc(doc(db, path, stateCode));
};

