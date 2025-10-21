/**
 * Enhanced Product Management Service
 * Comprehensive service for product lifecycle management with validation and auto-population
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
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Product, Coverage, FormTemplate } from '../types';
import logger, { LOG_CATEGORIES } from '../utils/logger';
import dataValidationService from './dataValidationService';
import enhancedCoverageManagementService from './enhancedCoverageManagementService';
import enhancedFormManagementService from './enhancedFormManagementService';

export interface ProductCreationOptions {
  name: string;
  description?: string;
  category?: string;
  status?: 'active' | 'inactive' | 'draft';
  states?: string[];
  effectiveDate?: Date;
  expirationDate?: Date;
  coverageIds?: string[];
  formIds?: string[];
}

export interface ProductSummary {
  id: string;
  name: string;
  status: string;
  coverageCount: number;
  formCount: number;
  stateCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

class EnhancedProductManagementService {
  /**
   * Create a new product with comprehensive setup
   */
  async createProduct(options: ProductCreationOptions): Promise<Product> {
    try {
      logger.info(LOG_CATEGORIES.DATA, 'Creating new product', {
        name: options.name,
        states: options.states?.length || 0
      });

      const productData: Partial<Product> = {
        name: options.name,
        description: options.description,
        category: options.category,
        status: options.status || 'draft',
        states: options.states,
        effectiveDate: options.effectiveDate,
        expirationDate: options.expirationDate,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const productRef = await addDoc(collection(db, 'products'), productData);
      const productId = productRef.id;

      // Auto-associate forms if provided
      if (options.formIds && options.formIds.length > 0) {
        for (const formId of options.formIds) {
          await enhancedFormManagementService.autoAssociateFormWithProduct(
            formId,
            productId,
            options.coverageIds
          );
        }
      }

      logger.info(LOG_CATEGORIES.DATA, 'Product created successfully', {
        productId,
        name: options.name
      });

      return {
        id: productId,
        ...productData
      } as Product;
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Product creation failed', 
        { name: options.name }, error as Error);
      throw error;
    }
  }

  /**
   * Get complete product summary with all related data counts
   */
  async getProductSummary(productId: string): Promise<ProductSummary> {
    try {
      const productDoc = await getDoc(doc(db, 'products', productId));

      if (!productDoc.exists()) {
        throw new Error(`Product ${productId} not found`);
      }

      const product = productDoc.data() as Product;

      // Count coverages
      const coveragesSnap = await getDocs(
        collection(db, `products/${productId}/coverages`)
      );

      // Count forms
      const formsSnap = await getDocs(
        query(collection(db, 'formCoverages'), where('productId', '==', productId))
      );
      const formIds = [...new Set(formsSnap.docs.map(doc => doc.data().formId))];

      return {
        id: productId,
        name: product.name,
        status: product.status || 'draft',
        coverageCount: coveragesSnap.size,
        formCount: formIds.length,
        stateCount: product.states?.length || 0,
        createdAt: product.createdAt instanceof Date 
          ? product.createdAt 
          : product.createdAt?.toDate?.(),
        updatedAt: product.updatedAt instanceof Date 
          ? product.updatedAt 
          : product.updatedAt?.toDate?.()
      };
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to get product summary', 
        { productId }, error as Error);
      throw error;
    }
  }

  /**
   * Validate product completeness
   */
  async validateProductCompleteness(productId: string): Promise<{
    isComplete: boolean;
    issues: string[];
    warnings: string[];
  }> {
    try {
      const issues: string[] = [];
      const warnings: string[] = [];

      // Validate product exists and has required fields
      const productValidation = await dataValidationService.validateProduct(productId);
      if (!productValidation.isValid) {
        issues.push(...productValidation.errors);
      }
      warnings.push(...productValidation.warnings);

      // Validate coverage hierarchy
      const coveragesSnap = await getDocs(
        collection(db, `products/${productId}/coverages`)
      );

      if (coveragesSnap.empty) {
        issues.push('Product must have at least one coverage');
      }

      for (const coverageDoc of coveragesSnap.docs) {
        const coverageValidation = await dataValidationService.validateCoverageHierarchy(
          productId,
          coverageDoc.id
        );
        if (!coverageValidation.isValid) {
          issues.push(...coverageValidation.errors);
        }
      }

      // Validate form-coverage mappings
      const mappingValidation = await dataValidationService.validateFormCoverageMappings(productId);
      if (!mappingValidation.isValid) {
        issues.push(...mappingValidation.errors);
      }

      return {
        isComplete: issues.length === 0,
        issues,
        warnings
      };
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Product completeness validation failed', 
        { productId }, error as Error);
      throw error;
    }
  }

  /**
   * Update product status
   */
  async updateProductStatus(
    productId: string,
    status: 'active' | 'inactive' | 'draft'
  ): Promise<void> {
    try {
      // Validate product is complete before activating
      if (status === 'active') {
        const validation = await this.validateProductCompleteness(productId);
        if (!validation.isComplete) {
          throw new Error(`Cannot activate product: ${validation.issues.join(', ')}`);
        }
      }

      await updateDoc(doc(db, 'products', productId), {
        status,
        updatedAt: serverTimestamp()
      });

      logger.info(LOG_CATEGORIES.DATA, 'Product status updated', {
        productId,
        status
      });
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Product status update failed', 
        { productId, status }, error as Error);
      throw error;
    }
  }

  /**
   * Clone a product with all its coverages and forms
   */
  async cloneProduct(sourceProductId: string, newProductName: string): Promise<string> {
    try {
      logger.info(LOG_CATEGORIES.DATA, 'Cloning product', {
        sourceProductId,
        newProductName
      });

      const sourceProduct = await getDoc(doc(db, 'products', sourceProductId));
      if (!sourceProduct.exists()) {
        throw new Error(`Source product ${sourceProductId} not found`);
      }

      const sourceData = sourceProduct.data() as Product;

      // Create new product
      const newProduct = await this.createProduct({
        name: newProductName,
        description: sourceData.description,
        category: sourceData.category,
        status: 'draft',
        states: sourceData.states
      });

      // Clone coverages
      const coveragesSnap = await getDocs(
        collection(db, `products/${sourceProductId}/coverages`)
      );

      for (const coverageDoc of coveragesSnap.docs) {
        const coverage = coverageDoc.data() as Coverage;
        await enhancedCoverageManagementService.createCoverage({
          productId: newProduct.id,
          name: coverage.name,
          description: coverage.description,
          coverageCode: coverage.coverageCode,
          category: coverage.category,
          isOptional: coverage.isOptional,
          states: coverage.states,
          basePremium: coverage.basePremium
        });
      }

      logger.info(LOG_CATEGORIES.DATA, 'Product cloned successfully', {
        sourceProductId,
        newProductId: newProduct.id
      });

      return newProduct.id;
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Product cloning failed', 
        { sourceProductId, newProductName }, error as Error);
      throw error;
    }
  }
}

export default new EnhancedProductManagementService();

