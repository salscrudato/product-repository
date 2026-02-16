/**
 * Org-Scoped Data Dictionary Service
 * Manages the enforceable input contract for Pricing, Rules, and Tables
 * 
 * Path: orgs/{orgId}/dataDictionary/{fieldId}
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Unsubscribe,
  Timestamp
} from 'firebase/firestore';
import { db, safeOnSnapshot } from '../firebase';
import {
  DataDictionaryField,
  DataDictionaryFieldType,
  DataDictionaryFieldStatus,
  DataDictionaryCategory,
  FieldReferenceValidation,
  FieldReferenceError,
  FieldReferenceWarning
} from '../types/dataDictionary';
import logger, { LOG_CATEGORIES } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface DataDictionaryFilter {
  type?: DataDictionaryFieldType;
  category?: DataDictionaryCategory;
  status?: DataDictionaryFieldStatus;
  search?: string;
}

export interface CreateFieldInput {
  code: string;
  displayName: string;
  category: DataDictionaryCategory;
  description?: string;
  type: DataDictionaryFieldType;
  unit?: string;
  allowedValues?: string[];
  validation?: DataDictionaryField['validation'];
  required?: boolean;
  defaultValue?: string | number | boolean;
}

// ============================================================================
// Service Class
// ============================================================================

class OrgDataDictionaryService {
  private getCollectionPath(orgId: string) {
    return `orgs/${orgId}/dataDictionary`;
  }

  /**
   * Get all data dictionary fields for an organization
   */
  async getFields(orgId: string, filter?: DataDictionaryFilter): Promise<DataDictionaryField[]> {
    try {
      const colRef = collection(db, this.getCollectionPath(orgId));
      let q = query(colRef, orderBy('displayName'));

      if (filter?.type) {
        q = query(q, where('type', '==', filter.type));
      }
      if (filter?.category) {
        q = query(q, where('category', '==', filter.category));
      }
      if (filter?.status) {
        q = query(q, where('status', '==', filter.status));
      }

      const snapshot = await getDocs(q);
      let fields = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DataDictionaryField));

      // Client-side search filter
      if (filter?.search) {
        const searchLower = filter.search.toLowerCase();
        fields = fields.filter(f =>
          f.code.toLowerCase().includes(searchLower) ||
          f.displayName.toLowerCase().includes(searchLower) ||
          f.description?.toLowerCase().includes(searchLower)
        );
      }

      return fields;
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to fetch data dictionary fields', { orgId }, error as Error);
      throw error;
    }
  }

  /**
   * Subscribe to data dictionary fields (real-time)
   */
  subscribeToFields(
    orgId: string,
    onData: (fields: DataDictionaryField[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const colRef = collection(db, this.getCollectionPath(orgId));
    const q = query(colRef, orderBy('displayName'));

    return safeOnSnapshot(
      q,
      snapshot => {
        const fields = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as DataDictionaryField));
        onData(fields);
      },
      error => {
        logger.error(LOG_CATEGORIES.ERROR, 'Data dictionary subscription error', { orgId }, error);
        onError?.(error);
      }
    );
  }

  /**
   * Get a single field by ID
   */
  async getFieldById(orgId: string, fieldId: string): Promise<DataDictionaryField | null> {
    try {
      const docRef = doc(db, this.getCollectionPath(orgId), fieldId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      return { id: snapshot.id, ...snapshot.data() } as DataDictionaryField;
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to fetch field', { orgId, fieldId }, error as Error);
      throw error;
    }
  }

  /**
   * Get a field by its unique code
   */
  async getFieldByCode(orgId: string, code: string): Promise<DataDictionaryField | null> {
    try {
      const colRef = collection(db, this.getCollectionPath(orgId));
      const q = query(colRef, where('code', '==', code));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const docSnap = snapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as DataDictionaryField;
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to fetch field by code', { orgId, code }, error as Error);
      throw error;
    }
  }

  /**
   * Check if a field code exists
   */
  async codeExists(orgId: string, code: string, excludeId?: string): Promise<boolean> {
    const field = await this.getFieldByCode(orgId, code);
    if (!field) return false;
    if (excludeId && field.id === excludeId) return false;
    return true;
  }

  /**
   * Create a new data dictionary field
   */
  async createField(orgId: string, input: CreateFieldInput, userId: string): Promise<DataDictionaryField> {
    try {
      // Check for duplicate code
      const exists = await this.codeExists(orgId, input.code);
      if (exists) {
        throw new Error(`Field code "${input.code}" already exists`);
      }

      const fieldData: Omit<DataDictionaryField, 'id'> = {
        ...input,
        status: 'active',
        createdAt: serverTimestamp() as Timestamp,
        createdBy: userId,
        updatedAt: serverTimestamp() as Timestamp,
        updatedBy: userId
      };

      const colRef = collection(db, this.getCollectionPath(orgId));
      const docRef = await addDoc(colRef, fieldData);

      return { id: docRef.id, ...fieldData } as DataDictionaryField;
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to create field', { orgId, code: input.code }, error as Error);
      throw error;
    }
  }

  /**
   * Update a data dictionary field
   */
  async updateField(
    orgId: string,
    fieldId: string,
    updates: Partial<CreateFieldInput>,
    userId: string
  ): Promise<void> {
    try {
      // If code is being changed, check for duplicates
      if (updates.code) {
        const exists = await this.codeExists(orgId, updates.code, fieldId);
        if (exists) {
          throw new Error(`Field code "${updates.code}" already exists`);
        }
      }

      const docRef = doc(db, this.getCollectionPath(orgId), fieldId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: userId
      });
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to update field', { orgId, fieldId }, error as Error);
      throw error;
    }
  }

  /**
   * Deprecate a field (soft delete)
   */
  async deprecateField(
    orgId: string,
    fieldId: string,
    deprecationMessage: string,
    replacedBy: string | undefined,
    userId: string
  ): Promise<void> {
    try {
      const docRef = doc(db, this.getCollectionPath(orgId), fieldId);
      await updateDoc(docRef, {
        status: 'deprecated',
        deprecationMessage,
        replacedBy,
        updatedAt: serverTimestamp(),
        updatedBy: userId
      });
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to deprecate field', { orgId, fieldId }, error as Error);
      throw error;
    }
  }

  /**
   * Delete a field (hard delete - only if not used)
   */
  async deleteField(orgId: string, fieldId: string): Promise<void> {
    try {
      const docRef = doc(db, this.getCollectionPath(orgId), fieldId);
      await deleteDoc(docRef);
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to delete field', { orgId, fieldId }, error as Error);
      throw error;
    }
  }

  // ============================================================================
  // Field Reference Validation (CRITICAL for enforcement)
  // ============================================================================

  /**
   * Validate that all field codes exist in the data dictionary
   * This is the core enforcement mechanism
   */
  async validateFieldReferences(
    orgId: string,
    fieldCodes: string[],
    location: string
  ): Promise<FieldReferenceValidation> {
    try {
      const errors: FieldReferenceError[] = [];
      const warnings: FieldReferenceWarning[] = [];

      // Fetch all fields for this org
      const allFields = await this.getFields(orgId);
      const fieldMap = new Map(allFields.map(f => [f.code, f]));

      for (const code of fieldCodes) {
        const field = fieldMap.get(code);

        if (!field) {
          // Field doesn't exist - ERROR
          errors.push({
            fieldCode: code,
            location,
            message: `Field "${code}" does not exist in the data dictionary`,
            linkTo: '/data-dictionary'
          });
        } else if (field.status === 'deprecated') {
          // Field is deprecated - WARNING
          warnings.push({
            fieldCode: code,
            location,
            message: field.deprecationMessage || `Field "${code}" is deprecated`,
            suggestedReplacement: field.replacedBy
          });
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to validate field references', { orgId }, error as Error);
      throw error;
    }
  }

  /**
   * Get active field codes (for autocomplete/dropdowns)
   */
  async getActiveFieldCodes(orgId: string): Promise<string[]> {
    const fields = await this.getFields(orgId, { status: 'active' });
    return fields.map(f => f.code);
  }

  /**
   * Get field suggestions for autocomplete
   */
  async getFieldSuggestions(orgId: string, partial: string): Promise<DataDictionaryField[]> {
    const fields = await this.getFields(orgId, { status: 'active' });
    const lowerPartial = partial.toLowerCase();
    return fields.filter(f =>
      f.code.toLowerCase().includes(lowerPartial) ||
      f.displayName.toLowerCase().includes(lowerPartial)
    ).slice(0, 10);
  }
}

export const orgDataDictionaryService = new OrgDataDictionaryService();
export default orgDataDictionaryService;

