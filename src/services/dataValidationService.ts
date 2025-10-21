/**
 * Data Validation Service
 * Ensures data integrity, referential consistency, and business rule compliance
 * across all insurance product entities
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Product, Coverage, FormTemplate, Rule, PricingRule, StateApplicability } from '../types';
import logger, { LOG_CATEGORIES } from '../utils/logger';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: Record<string, unknown>;
}

export interface ReferentialIntegrityReport {
  orphanedCoverages: string[];
  orphanedForms: string[];
  orphanedRules: string[];
  brokenFormMappings: string[];
  invalidStateReferences: string[];
  totalIssues: number;
}

class DataValidationService {
  /**
   * Validate a product and all its relationships
   */
  async validateProduct(productId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check product exists
      const productDoc = await getDoc(doc(db, 'products', productId));
      if (!productDoc.exists()) {
        return {
          isValid: false,
          errors: [`Product ${productId} does not exist`],
          warnings: []
        };
      }

      const product = productDoc.data() as Product;

      // Validate product fields
      if (!product.name || product.name.trim().length === 0) {
        errors.push('Product name is required and cannot be empty');
      }

      if (product.effectiveDate && product.expirationDate) {
        const effectiveDate = product.effectiveDate instanceof Timestamp 
          ? product.effectiveDate.toDate() 
          : new Date(product.effectiveDate);
        const expirationDate = product.expirationDate instanceof Timestamp 
          ? product.expirationDate.toDate() 
          : new Date(product.expirationDate);
        
        if (effectiveDate >= expirationDate) {
          errors.push('Product effective date must be before expiration date');
        }
      }

      // Validate coverages exist
      const coveragesSnap = await getDocs(
        collection(db, `products/${productId}/coverages`)
      );
      if (coveragesSnap.empty) {
        warnings.push('Product has no coverages defined');
      }

      // Validate state availability
      if (product.states && product.states.length > 0) {
        const validStates = await this.validateStateReferences(product.states);
        if (validStates.length < product.states.length) {
          warnings.push(`Some state codes may be invalid: ${product.states.join(', ')}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: {
          productId,
          coverageCount: coveragesSnap.size,
          validatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Product validation failed', { productId }, error as Error);
      return {
        isValid: false,
        errors: [`Validation error: ${(error as Error).message}`],
        warnings: []
      };
    }
  }

  /**
   * Validate coverage hierarchy and relationships
   */
  async validateCoverageHierarchy(productId: string, coverageId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const coverageDoc = await getDoc(
        doc(db, `products/${productId}/coverages/${coverageId}`)
      );

      if (!coverageDoc.exists()) {
        return {
          isValid: false,
          errors: [`Coverage ${coverageId} does not exist in product ${productId}`],
          warnings: []
        };
      }

      const coverage = coverageDoc.data() as Coverage;

      // Validate parent coverage if this is a sub-coverage
      if (coverage.parentCoverageId) {
        const parentDoc = await getDoc(
          doc(db, `products/${productId}/coverages/${coverage.parentCoverageId}`)
        );
        if (!parentDoc.exists()) {
          errors.push(`Parent coverage ${coverage.parentCoverageId} does not exist`);
        }
      }

      // Validate required/incompatible coverage references
      if (coverage.requiredCoverages && coverage.requiredCoverages.length > 0) {
        for (const requiredId of coverage.requiredCoverages) {
          const requiredDoc = await getDoc(
            doc(db, `products/${productId}/coverages/${requiredId}`)
          );
          if (!requiredDoc.exists()) {
            errors.push(`Required coverage ${requiredId} does not exist`);
          }
        }
      }

      if (coverage.incompatibleCoverages && coverage.incompatibleCoverages.length > 0) {
        for (const incompatibleId of coverage.incompatibleCoverages) {
          const incompatibleDoc = await getDoc(
            doc(db, `products/${productId}/coverages/${incompatibleId}`)
          );
          if (!incompatibleDoc.exists()) {
            errors.push(`Incompatible coverage ${incompatibleId} does not exist`);
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: {
          productId,
          coverageId,
          isSubCoverage: !!coverage.parentCoverageId,
          validatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Coverage hierarchy validation failed', 
        { productId, coverageId }, error as Error);
      return {
        isValid: false,
        errors: [`Validation error: ${(error as Error).message}`],
        warnings: []
      };
    }
  }

  /**
   * Check referential integrity across all entities
   */
  async checkReferentialIntegrity(productId: string): Promise<ReferentialIntegrityReport> {
    const report: ReferentialIntegrityReport = {
      orphanedCoverages: [],
      orphanedForms: [],
      orphanedRules: [],
      brokenFormMappings: [],
      invalidStateReferences: [],
      totalIssues: 0
    };

    try {
      // Check form-coverage mappings
      const mappingsSnap = await getDocs(
        query(collection(db, 'formCoverages'), where('productId', '==', productId))
      );

      for (const mappingDoc of mappingsSnap.docs) {
        const mapping = mappingDoc.data();
        const coverageDoc = await getDoc(
          doc(db, `products/${productId}/coverages/${mapping.coverageId}`)
        );
        if (!coverageDoc.exists()) {
          report.brokenFormMappings.push(mappingDoc.id);
        }
      }

      // Check state applicability references
      const stateAppSnap = await getDocs(
        query(collection(db, 'stateApplicability'), where('productId', '==', productId))
      );

      for (const stateDoc of stateAppSnap.docs) {
        const stateApp = stateDoc.data() as StateApplicability;
        if (stateApp.entityType === 'coverage') {
          const coverageDoc = await getDoc(
            doc(db, `products/${productId}/coverages/${stateApp.entityId}`)
          );
          if (!coverageDoc.exists()) {
            report.invalidStateReferences.push(stateDoc.id);
          }
        }
      }

      report.totalIssues = 
        report.orphanedCoverages.length +
        report.orphanedForms.length +
        report.orphanedRules.length +
        report.brokenFormMappings.length +
        report.invalidStateReferences.length;

      logger.info(LOG_CATEGORIES.DATA, 'Referential integrity check completed', {
        productId,
        totalIssues: report.totalIssues
      });

      return report;
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Referential integrity check failed', 
        { productId }, error as Error);
      throw error;
    }
  }

  /**
   * Validate state code references
   */
  private async validateStateReferences(states: string[]): Promise<string[]> {
    const validUSStates = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
      'DC', 'PR', 'VI', 'GU', 'AS', 'MP'
    ];
    return states.filter(state => validUSStates.includes(state.toUpperCase()));
  }

  /**
   * Validate form-coverage mappings
   */
  async validateFormCoverageMappings(productId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const mappingsSnap = await getDocs(
        query(collection(db, 'formCoverages'), where('productId', '==', productId))
      );

      for (const mappingDoc of mappingsSnap.docs) {
        const mapping = mappingDoc.data();

        // Validate form exists
        const formDoc = await getDoc(doc(db, 'forms', mapping.formId));
        if (!formDoc.exists()) {
          errors.push(`Form ${mapping.formId} referenced in mapping ${mappingDoc.id} does not exist`);
        }

        // Validate coverage exists
        const coverageDoc = await getDoc(
          doc(db, `products/${productId}/coverages/${mapping.coverageId}`)
        );
        if (!coverageDoc.exists()) {
          errors.push(`Coverage ${mapping.coverageId} referenced in mapping ${mappingDoc.id} does not exist`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: {
          productId,
          mappingsChecked: mappingsSnap.size,
          validatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Form-coverage mapping validation failed',
        { productId }, error as Error);
      return {
        isValid: false,
        errors: [`Validation error: ${(error as Error).message}`],
        warnings: []
      };
    }
  }
}

export default new DataValidationService();

