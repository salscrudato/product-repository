/**
 * Data Dictionary Service
 * Manages rating input field definitions and validation
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { DataDictionaryField, RatingInput } from '../types/pricing';
import logger, { LOG_CATEGORIES } from '../utils/logger';

class DataDictionaryService {
  /**
   * Get all data dictionary fields for a product
   */
  async getProductFields(productId: string): Promise<DataDictionaryField[]> {
    try {
      const q = query(
        collection(db, `products/${productId}/dataDictionary`),
        where('productId', '==', productId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DataDictionaryField));
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to fetch data dictionary fields', 
        { productId }, error as Error);
      throw error;
    }
  }

  /**
   * Create a new data dictionary field
   */
  async createField(productId: string, field: Omit<DataDictionaryField, 'id' | 'productId' | 'createdAt' | 'updatedAt'>): Promise<DataDictionaryField> {
    try {
      const fieldData = {
        ...field,
        productId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const ref = await addDoc(
        collection(db, `products/${productId}/dataDictionary`),
        fieldData
      );

      return {
        id: ref.id,
        ...fieldData
      } as DataDictionaryField;
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to create data dictionary field', 
        { productId, fieldName: field.name }, error as Error);
      throw error;
    }
  }

  /**
   * Validate rating inputs against data dictionary
   */
  async validateInputs(productId: string, inputs: RatingInput): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const fields = await this.getProductFields(productId);
      const errors: string[] = [];

      for (const field of fields) {
        if (field.required && (inputs[field.name] === undefined || inputs[field.name] === null)) {
          errors.push(`${field.label} is required`);
          continue;
        }

        const value = inputs[field.name];
        if (value === undefined || value === null) continue;

        // Type validation
        if (field.type === 'number' && typeof value !== 'number') {
          errors.push(`${field.label} must be a number`);
        }
        if (field.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`${field.label} must be a boolean`);
        }

        // Range validation
        if (field.type === 'number' && typeof value === 'number') {
          if (field.min !== undefined && value < field.min) {
            errors.push(`${field.label} must be at least ${field.min}`);
          }
          if (field.max !== undefined && value > field.max) {
            errors.push(`${field.label} must be at most ${field.max}`);
          }
        }

        // Enum validation
        if (field.type === 'enum' && field.enumOptions && !field.enumOptions.includes(String(value))) {
          errors.push(`${field.label} must be one of: ${field.enumOptions.join(', ')}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to validate inputs', 
        { productId }, error as Error);
      throw error;
    }
  }

  /**
   * Coerce input values to correct types
   */
  coerceInputs(fields: DataDictionaryField[], inputs: RatingInput): RatingInput {
    const coerced: RatingInput = {};

    for (const field of fields) {
      const value = inputs[field.name];
      if (value === undefined || value === null) continue;

      if (field.type === 'number') {
        coerced[field.name] = Number(value);
      } else if (field.type === 'boolean') {
        coerced[field.name] = value === true || value === 'true';
      } else {
        coerced[field.name] = value;
      }
    }

    return coerced;
  }
}

export default new DataDictionaryService();

