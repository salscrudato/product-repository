/**
 * Form-Coverage Relationship Helper Utilities
 * 
 * These utilities provide a clean interface for managing the many-to-many
 * relationship between forms and coverages using the formCoverages junction table.
 * 
 * IMPORTANT: This is the SINGLE SOURCE OF TRUTH for form-coverage relationships.
 * Do NOT use form.coverageIds or coverage.formIds arrays.
 */

import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { FormCoverageMapping } from '../types';

/**
 * Fetch all forms linked to a coverage
 * 
 * @param coverageId - Coverage ID
 * @param productId - Product ID (for efficient querying)
 * @returns Array of form documents
 */
export async function getFormsForCoverage(
  coverageId: string,
  productId: string
): Promise<any[]> {
  try {
    // Get form IDs from junction table
    const mappingsSnap = await getDocs(
      query(
        collection(db, 'formCoverages'),
        where('coverageId', '==', coverageId),
        where('productId', '==', productId)
      )
    );
    
    const formIds = mappingsSnap.docs.map(doc => doc.data().formId);
    
    if (formIds.length === 0) return [];
    
    // Fetch actual form documents
    // Note: Firestore 'in' queries limited to 10 items, so batch them
    const forms = [];
    for (let i = 0; i < formIds.length; i += 10) {
      const batch = formIds.slice(i, i + 10);
      const formsSnap = await getDocs(
        query(
          collection(db, 'forms'),
          where('__name__', 'in', batch)
        )
      );
      forms.push(...formsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
    
    return forms;
  } catch (error) {
    console.error('Error fetching forms for coverage:', error);
    throw error;
  }
}

/**
 * Fetch all coverages linked to a form
 * 
 * @param formId - Form ID
 * @returns Array of form-coverage mapping documents (includes productId and coverageId)
 */
export async function getCoveragesForForm(formId: string): Promise<FormCoverageMapping[]> {
  try {
    const mappingsSnap = await getDocs(
      query(
        collection(db, 'formCoverages'),
        where('formId', '==', formId)
      )
    );
    
    return mappingsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FormCoverageMapping));
  } catch (error) {
    console.error('Error fetching coverages for form:', error);
    throw error;
  }
}

/**
 * Fetch all form-coverage mappings for a product
 * 
 * @param productId - Product ID
 * @returns Array of form-coverage mappings
 */
export async function getFormCoverageMappingsForProduct(
  productId: string
): Promise<FormCoverageMapping[]> {
  try {
    const mappingsSnap = await getDocs(
      query(
        collection(db, 'formCoverages'),
        where('productId', '==', productId)
      )
    );
    
    return mappingsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FormCoverageMapping));
  } catch (error) {
    console.error('Error fetching form-coverage mappings for product:', error);
    throw error;
  }
}

/**
 * Check if a form is linked to a coverage
 * 
 * @param formId - Form ID
 * @param coverageId - Coverage ID
 * @param productId - Product ID
 * @returns True if linked, false otherwise
 */
export async function isFormLinkedToCoverage(
  formId: string,
  coverageId: string,
  productId: string
): Promise<boolean> {
  try {
    const mappingsSnap = await getDocs(
      query(
        collection(db, 'formCoverages'),
        where('formId', '==', formId),
        where('coverageId', '==', coverageId),
        where('productId', '==', productId)
      )
    );
    
    return !mappingsSnap.empty;
  } catch (error) {
    console.error('Error checking form-coverage link:', error);
    throw error;
  }
}

/**
 * Link a form to multiple coverages
 * 
 * @param formId - Form ID
 * @param coverageIds - Array of coverage IDs to link
 * @param productId - Product ID
 * @returns Number of links created
 */
export async function linkFormToCoverages(
  formId: string,
  coverageIds: string[],
  productId: string
): Promise<number> {
  try {
    const batch = writeBatch(db);
    let count = 0;
    
    // Get existing links to avoid duplicates
    const existingSnap = await getDocs(
      query(
        collection(db, 'formCoverages'),
        where('formId', '==', formId),
        where('productId', '==', productId)
      )
    );
    
    const existingCoverageIds = new Set(
      existingSnap.docs.map(doc => doc.data().coverageId)
    );
    
    // Add new links
    for (const coverageId of coverageIds) {
      if (!existingCoverageIds.has(coverageId)) {
        const newRef = doc(collection(db, 'formCoverages'));
        batch.set(newRef, {
          formId,
          coverageId,
          productId,
          createdAt: serverTimestamp()
        });
        count++;
      }
    }
    
    if (count > 0) {
      await batch.commit();
    }
    
    return count;
  } catch (error) {
    console.error('Error linking form to coverages:', error);
    throw error;
  }
}

/**
 * Unlink a form from multiple coverages
 * 
 * @param formId - Form ID
 * @param coverageIds - Array of coverage IDs to unlink
 * @param productId - Product ID
 * @returns Number of links removed
 */
export async function unlinkFormFromCoverages(
  formId: string,
  coverageIds: string[],
  productId: string
): Promise<number> {
  try {
    const batch = writeBatch(db);
    let count = 0;
    
    // Get existing links
    const existingSnap = await getDocs(
      query(
        collection(db, 'formCoverages'),
        where('formId', '==', formId),
        where('productId', '==', productId)
      )
    );
    
    // Delete matching links
    for (const docSnap of existingSnap.docs) {
      if (coverageIds.includes(docSnap.data().coverageId)) {
        batch.delete(docSnap.ref);
        count++;
      }
    }
    
    if (count > 0) {
      await batch.commit();
    }
    
    return count;
  } catch (error) {
    console.error('Error unlinking form from coverages:', error);
    throw error;
  }
}

/**
 * Update form-coverage links for a form (replaces all existing links)
 * 
 * @param formId - Form ID
 * @param coverageIds - Array of coverage IDs (new complete set)
 * @param productId - Product ID
 * @returns Object with counts of added and removed links
 */
export async function updateFormCoverageLinks(
  formId: string,
  coverageIds: string[],
  productId: string
): Promise<{ added: number; removed: number }> {
  try {
    const batch = writeBatch(db);
    const desired = new Set(coverageIds);
    let added = 0;
    let removed = 0;
    
    // Get existing links
    const existingSnap = await getDocs(
      query(
        collection(db, 'formCoverages'),
        where('formId', '==', formId),
        where('productId', '==', productId)
      )
    );
    
    // Remove links that are no longer desired
    const existingIds = new Set<string>();
    for (const docSnap of existingSnap.docs) {
      const coverageId = docSnap.data().coverageId;
      existingIds.add(coverageId);
      
      if (!desired.has(coverageId)) {
        batch.delete(docSnap.ref);
        removed++;
      }
    }
    
    // Add new links
    for (const coverageId of coverageIds) {
      if (!existingIds.has(coverageId)) {
        const newRef = doc(collection(db, 'formCoverages'));
        batch.set(newRef, {
          formId,
          coverageId,
          productId,
          createdAt: serverTimestamp()
        });
        added++;
      }
    }
    
    if (added > 0 || removed > 0) {
      await batch.commit();
    }
    
    return { added, removed };
  } catch (error) {
    console.error('Error updating form-coverage links:', error);
    throw error;
  }
}

/**
 * Update coverage-form links for a coverage (replaces all existing links)
 * 
 * @param coverageId - Coverage ID
 * @param formIds - Array of form IDs (new complete set)
 * @param productId - Product ID
 * @returns Object with counts of added and removed links
 */
export async function updateCoverageFormLinks(
  coverageId: string,
  formIds: string[],
  productId: string
): Promise<{ added: number; removed: number }> {
  try {
    const batch = writeBatch(db);
    const desired = new Set(formIds);
    let added = 0;
    let removed = 0;
    
    // Get existing links
    const existingSnap = await getDocs(
      query(
        collection(db, 'formCoverages'),
        where('coverageId', '==', coverageId),
        where('productId', '==', productId)
      )
    );
    
    // Remove links that are no longer desired
    const existingIds = new Set<string>();
    for (const docSnap of existingSnap.docs) {
      const formId = docSnap.data().formId;
      existingIds.add(formId);
      
      if (!desired.has(formId)) {
        batch.delete(docSnap.ref);
        removed++;
      }
    }
    
    // Add new links
    for (const formId of formIds) {
      if (!existingIds.has(formId)) {
        const newRef = doc(collection(db, 'formCoverages'));
        batch.set(newRef, {
          formId,
          coverageId,
          productId,
          createdAt: serverTimestamp()
        });
        added++;
      }
    }
    
    if (added > 0 || removed > 0) {
      await batch.commit();
    }
    
    return { added, removed };
  } catch (error) {
    console.error('Error updating coverage-form links:', error);
    throw error;
  }
}

/**
 * Delete all form-coverage links for a form
 * 
 * @param formId - Form ID
 * @returns Number of links deleted
 */
export async function deleteAllLinksForForm(formId: string): Promise<number> {
  try {
    const batch = writeBatch(db);
    
    const existingSnap = await getDocs(
      query(
        collection(db, 'formCoverages'),
        where('formId', '==', formId)
      )
    );
    
    existingSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    if (existingSnap.docs.length > 0) {
      await batch.commit();
    }
    
    return existingSnap.docs.length;
  } catch (error) {
    console.error('Error deleting all links for form:', error);
    throw error;
  }
}

/**
 * Delete all form-coverage links for a coverage
 * 
 * @param coverageId - Coverage ID
 * @param productId - Product ID
 * @returns Number of links deleted
 */
export async function deleteAllLinksForCoverage(
  coverageId: string,
  productId: string
): Promise<number> {
  try {
    const batch = writeBatch(db);
    
    const existingSnap = await getDocs(
      query(
        collection(db, 'formCoverages'),
        where('coverageId', '==', coverageId),
        where('productId', '==', productId)
      )
    );
    
    existingSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    if (existingSnap.docs.length > 0) {
      await batch.commit();
    }
    
    return existingSnap.docs.length;
  } catch (error) {
    console.error('Error deleting all links for coverage:', error);
    throw error;
  }
}

