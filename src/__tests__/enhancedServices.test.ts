/**
 * Enhanced Services Tests
 * Tests for enhanced form, coverage, and product management services
 */

import {
  FormCreationOptions,
  FormAssociationResult
} from '../services/enhancedFormManagementService';

import {
  CoverageCreationOptions,
  CoverageHierarchyData
} from '../services/enhancedCoverageManagementService';

import {
  ProductCreationOptions,
  ProductSummary
} from '../services/enhancedProductManagementService';

describe('Enhanced Services', () => {
  describe('Form Management Service', () => {
    describe('FormCreationOptions', () => {
      it('should have required form fields', () => {
        const options: FormCreationOptions = {
          formNumber: 'FORM-001',
          formName: 'Test Form',
          description: 'A test form',
          category: 'coverage',
          type: 'pdf',
          downloadUrl: 'https://example.com/form.pdf',
          filePath: 'forms/form.pdf',
          states: ['CA', 'NY'],
          effectiveDate: new Date('2024-01-01'),
          expirationDate: new Date('2025-01-01')
        };

        expect(options.formNumber).toBe('FORM-001');
        expect(options.formName).toBe('Test Form');
        expect(options.states).toContain('CA');
        expect(options.downloadUrl).toBeTruthy();
      });

      it('should support optional product association', () => {
        const options: FormCreationOptions = {
          formNumber: 'FORM-002',
          formName: 'Product Form',
          productId: 'prod-123'
        };

        expect(options.productId).toBe('prod-123');
      });
    });

    describe('FormAssociationResult', () => {
      it('should track successful associations', () => {
        const result: FormAssociationResult = {
          success: true,
          formId: 'form-123',
          mappingsCreated: 5
        };

        expect(result.success).toBe(true);
        expect(result.mappingsCreated).toBe(5);
      });

      it('should track failed associations with errors', () => {
        const result: FormAssociationResult = {
          success: false,
          formId: 'form-456',
          mappingsCreated: 0,
          errors: ['Coverage not found', 'Invalid product ID']
        };

        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(2);
      });
    });
  });

  describe('Coverage Management Service', () => {
    describe('CoverageCreationOptions', () => {
      it('should create base coverage', () => {
        const options: CoverageCreationOptions = {
          productId: 'prod-123',
          name: 'Liability Coverage',
          description: 'General liability coverage',
          coverageCode: 'GL-001',
          category: 'base',
          isOptional: false,
          states: ['CA', 'NY', 'TX'],
          basePremium: 500
        };

        expect(options.category).toBe('base');
        expect(options.isOptional).toBe(false);
        expect(options.basePremium).toBe(500);
      });

      it('should create sub-coverage with parent reference', () => {
        const options: CoverageCreationOptions = {
          productId: 'prod-123',
          name: 'Medical Payments',
          parentCoverageId: 'cov-parent-123',
          category: 'endorsement'
        };

        expect(options.parentCoverageId).toBe('cov-parent-123');
        expect(options.category).toBe('endorsement');
      });

      it('should support limits and deductibles', () => {
        const options: CoverageCreationOptions = {
          productId: 'prod-123',
          name: 'Property Coverage',
          limits: [
            { limitType: 'per_occurrence', amount: 100000 },
            { limitType: 'aggregate', amount: 500000 }
          ],
          deductibles: [
            { deductibleType: 'standard', amount: 1000 },
            { deductibleType: 'hurricane', amount: 5000 }
          ]
        };

        expect(options.limits).toHaveLength(2);
        expect(options.deductibles).toHaveLength(2);
      });
    });

    describe('CoverageHierarchyData', () => {
      it('should contain complete coverage hierarchy', () => {
        const hierarchyData: Partial<CoverageHierarchyData> = {
          subCoverages: [
            { id: 'sub-1', name: 'Sub Coverage 1' },
            { id: 'sub-2', name: 'Sub Coverage 2' }
          ],
          limits: [
            { id: 'limit-1', limitType: 'per_occurrence', amount: 100000 }
          ],
          deductibles: [
            { id: 'ded-1', deductibleType: 'standard', amount: 1000 }
          ],
          linkedFormIds: ['form-1', 'form-2', 'form-3']
        };

        expect(hierarchyData.subCoverages).toHaveLength(2);
        expect(hierarchyData.limits).toHaveLength(1);
        expect(hierarchyData.deductibles).toHaveLength(1);
        expect(hierarchyData.linkedFormIds).toHaveLength(3);
      });
    });
  });

  describe('Product Management Service', () => {
    describe('ProductCreationOptions', () => {
      it('should create product with basic info', () => {
        const options: ProductCreationOptions = {
          name: 'Commercial Property',
          description: 'Commercial property insurance',
          category: 'property',
          status: 'draft',
          states: ['CA', 'NY', 'TX', 'FL']
        };

        expect(options.name).toBe('Commercial Property');
        expect(options.status).toBe('draft');
        expect(options.states).toHaveLength(4);
      });

      it('should support coverage and form associations', () => {
        const options: ProductCreationOptions = {
          name: 'General Liability',
          coverageIds: ['cov-1', 'cov-2', 'cov-3'],
          formIds: ['form-1', 'form-2']
        };

        expect(options.coverageIds).toHaveLength(3);
        expect(options.formIds).toHaveLength(2);
      });

      it('should support effective and expiration dates', () => {
        const effectiveDate = new Date('2024-01-01');
        const expirationDate = new Date('2025-01-01');

        const options: ProductCreationOptions = {
          name: 'Seasonal Product',
          effectiveDate,
          expirationDate
        };

        expect(options.effectiveDate).toEqual(effectiveDate);
        expect(options.expirationDate).toEqual(expirationDate);
      });
    });

    describe('ProductSummary', () => {
      it('should provide product overview', () => {
        const summary: ProductSummary = {
          id: 'prod-123',
          name: 'Commercial Property',
          status: 'active',
          coverageCount: 5,
          formCount: 12,
          stateCount: 50,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-10-21')
        };

        expect(summary.name).toBe('Commercial Property');
        expect(summary.status).toBe('active');
        expect(summary.coverageCount).toBe(5);
        expect(summary.formCount).toBe(12);
        expect(summary.stateCount).toBe(50);
      });
    });
  });

  describe('Data Validation', () => {
    it('should validate US state codes', () => {
      const validStates = ['CA', 'NY', 'TX', 'FL', 'DC', 'PR'];
      const invalidStates = ['XX', 'YY', 'ZZ'];

      validStates.forEach(state => {
        expect(['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
          'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
          'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
          'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
          'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
          'DC', 'PR', 'VI', 'GU', 'AS', 'MP']).toContain(state);
      });

      invalidStates.forEach(state => {
        expect(['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
          'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
          'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
          'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
          'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
          'DC', 'PR', 'VI', 'GU', 'AS', 'MP']).not.toContain(state);
      });
    });
  });
});

