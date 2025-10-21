/**
 * Integrated Enhancement Service
 * Unified API for all enhancement services
 * Provides a single entry point for data management, UI/UX, accessibility, and performance
 */

import enhancedProductManagementService, { ProductCreationOptions, ProductSummary } from './enhancedProductManagementService';
import enhancedCoverageManagementService, { CoverageCreationOptions, CoverageHierarchyData } from './enhancedCoverageManagementService';
import enhancedFormManagementService, { FormCreationOptions, FormAssociationResult } from './enhancedFormManagementService';
import dataValidationService from './dataValidationService';
import uiEnhancementService, { UITheme, AnimationConfig } from './uiEnhancementService';
import accessibilityService, { AccessibilityConfig, A11yAuditResult } from './accessibilityService';
import performanceOptimizationService, { PerformanceMetrics } from './performanceOptimizationService';
import logger, { LOG_CATEGORIES } from '../utils/logger';

export interface EnhancementServiceConfig {
  enableDataValidation: boolean;
  enableUIEnhancements: boolean;
  enableAccessibility: boolean;
  enablePerformanceMonitoring: boolean;
  enableLogging: boolean;
}

class IntegratedEnhancementService {
  private config: EnhancementServiceConfig = {
    enableDataValidation: true,
    enableUIEnhancements: true,
    enableAccessibility: true,
    enablePerformanceMonitoring: true,
    enableLogging: true
  };

  constructor(config?: Partial<EnhancementServiceConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.initialize();
  }

  /**
   * Initialize all enhancement services
   */
  private initialize(): void {
    logger.info(LOG_CATEGORIES.DATA, 'Integrated Enhancement Service initialized', this.config);
  }

  /**
   * Product Management API
   */
  async createProduct(options: ProductCreationOptions) {
    return enhancedProductManagementService.createProduct(options);
  }

  async getProductSummary(productId: string): Promise<ProductSummary> {
    return enhancedProductManagementService.getProductSummary(productId);
  }

  async validateProductCompleteness(productId: string) {
    return enhancedProductManagementService.validateProductCompleteness(productId);
  }

  async updateProductStatus(productId: string, status: 'active' | 'inactive' | 'draft') {
    return enhancedProductManagementService.updateProductStatus(productId, status);
  }

  async cloneProduct(sourceProductId: string, newProductName: string): Promise<string> {
    return enhancedProductManagementService.cloneProduct(sourceProductId, newProductName);
  }

  /**
   * Coverage Management API
   */
  async createCoverage(options: CoverageCreationOptions) {
    return enhancedCoverageManagementService.createCoverage(options);
  }

  async getCoverageHierarchy(productId: string, coverageId: string): Promise<CoverageHierarchyData> {
    return enhancedCoverageManagementService.getCoverageHierarchy(productId, coverageId);
  }

  async updateCoverage(productId: string, coverageId: string, updates: any, cascadeToSubCoverages?: boolean) {
    return enhancedCoverageManagementService.updateCoverage(productId, coverageId, updates, cascadeToSubCoverages);
  }

  /**
   * Form Management API
   */
  async createForm(options: FormCreationOptions) {
    return enhancedFormManagementService.createForm(options);
  }

  async autoAssociateFormWithProduct(formId: string, productId: string, coverageIds?: string[]): Promise<FormAssociationResult> {
    return enhancedFormManagementService.autoAssociateFormWithProduct(formId, productId, coverageIds);
  }

  async getProductForms(productId: string) {
    return enhancedFormManagementService.getProductForms(productId);
  }

  async getFormsWithPDFs() {
    return enhancedFormManagementService.getFormsWithPDFs();
  }

  async updateForm(formId: string, updates: any, updateMappings?: boolean) {
    return enhancedFormManagementService.updateForm(formId, updates, updateMappings);
  }

  async deleteForm(formId: string) {
    return enhancedFormManagementService.deleteForm(formId);
  }

  /**
   * Data Validation API
   */
  async validateProduct(productId: string) {
    return dataValidationService.validateProduct(productId);
  }

  async validateCoverageHierarchy(productId: string, coverageId: string) {
    return dataValidationService.validateCoverageHierarchy(productId, coverageId);
  }

  async validateFormCoverageMappings(productId: string) {
    return dataValidationService.validateFormCoverageMappings(productId);
  }

  /**
   * UI Enhancement API
   */
  getUITheme(): UITheme {
    return uiEnhancementService.getTheme();
  }

  generateTransition(properties?: string[], config?: AnimationConfig): string {
    return uiEnhancementService.generateTransition(properties, config);
  }

  generateHoverEffect(intensity?: 'subtle' | 'moderate' | 'strong'): string {
    return uiEnhancementService.generateHoverEffect(intensity);
  }

  generateCardCSS(elevated?: boolean): string {
    return uiEnhancementService.generateCardCSS(elevated);
  }

  generateButtonCSS(variant?: 'primary' | 'secondary' | 'ghost'): string {
    return uiEnhancementService.generateButtonCSS(variant);
  }

  /**
   * Accessibility API
   */
  getAccessibilityConfig(): AccessibilityConfig {
    return accessibilityService.getConfig();
  }

  updateAccessibilityConfig(updates: Partial<AccessibilityConfig>): void {
    accessibilityService.updateConfig(updates);
  }

  generateAriaAttributes(role: string, label?: string, describedBy?: string, expanded?: boolean, disabled?: boolean) {
    return accessibilityService.generateAriaAttributes(role, label, describedBy, expanded, disabled);
  }

  auditComponentAccessibility(element: HTMLElement): A11yAuditResult {
    return accessibilityService.auditComponent(element);
  }

  /**
   * Performance Monitoring API
   */
  getWebVitals(): Partial<PerformanceMetrics> {
    return performanceOptimizationService.getWebVitals();
  }

  getMemoryUsage(): number | null {
    return performanceOptimizationService.getMemoryUsage();
  }

  generatePerformanceReport(): string {
    return performanceOptimizationService.generatePerformanceReport();
  }

  /**
   * Get configuration
   */
  getConfig(): EnhancementServiceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<EnhancementServiceConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info(LOG_CATEGORIES.DATA, 'Enhancement service config updated', this.config);
  }

  /**
   * Health check
   */
  healthCheck(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, boolean>;
  } {
    return {
      status: 'healthy',
      services: {
        productManagement: true,
        coverageManagement: true,
        formManagement: true,
        dataValidation: true,
        uiEnhancement: true,
        accessibility: true,
        performanceMonitoring: true
      }
    };
  }
}

export default new IntegratedEnhancementService();

