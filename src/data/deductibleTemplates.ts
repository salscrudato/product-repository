/**
 * Deductible Option Templates
 * 
 * Pre-configured deductible option sets for common P&C insurance coverages.
 * These templates can be used to quickly set up deductible options.
 */

import {
  CoverageDeductibleOption,
  DeductibleStructure,
} from '../types/deductibleOptions';

export interface DeductibleOptionTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Property' | 'Liability' | 'Auto' | 'Workers Comp' | 'WC' | 'Professional' | 'Specialty';
  structure: DeductibleStructure;
  options: Partial<CoverageDeductibleOption>[];
}

// ============================================================================
// Property Deductible Templates
// ============================================================================

export const PROPERTY_FLAT_DEDUCTIBLES: DeductibleOptionTemplate = {
  id: 'property-flat',
  name: 'Property - Flat Deductibles',
  description: 'Standard flat dollar deductibles for property coverages',
  category: 'Property',
  structure: 'flat',
  options: [
    { label: '$500', structure: 'flat', amount: 500, isDefault: false, isEnabled: true, displayOrder: 0 },
    { label: '$1,000', structure: 'flat', amount: 1000, isDefault: true, isEnabled: true, displayOrder: 1 },
    { label: '$2,500', structure: 'flat', amount: 2500, isDefault: false, isEnabled: true, displayOrder: 2 },
    { label: '$5,000', structure: 'flat', amount: 5000, isDefault: false, isEnabled: true, displayOrder: 3 },
    { label: '$10,000', structure: 'flat', amount: 10000, isDefault: false, isEnabled: true, displayOrder: 4 },
    { label: '$25,000', structure: 'flat', amount: 25000, isDefault: false, isEnabled: true, displayOrder: 5 },
  ]
};

export const WIND_HAIL_PERCENTAGE: DeductibleOptionTemplate = {
  id: 'wind-hail-percent',
  name: 'Wind/Hail - Percentage',
  description: 'Percentage of TIV with min/max bounds for wind/hail',
  category: 'Property',
  structure: 'percentMinMax',
  options: [
    { label: '1% of TIV ($1K min)', structure: 'percentMinMax', percentage: 1, basis: 'TIV', minimumAmount: 1000, maximumAmount: 100000, isDefault: false, isEnabled: true, displayOrder: 0, applicability: { perils: ['WindHail'] } },
    { label: '2% of TIV ($2.5K min)', structure: 'percentMinMax', percentage: 2, basis: 'TIV', minimumAmount: 2500, maximumAmount: 250000, isDefault: true, isEnabled: true, displayOrder: 1, applicability: { perils: ['WindHail'] } },
    { label: '5% of TIV ($5K min)', structure: 'percentMinMax', percentage: 5, basis: 'TIV', minimumAmount: 5000, maximumAmount: 500000, isDefault: false, isEnabled: true, displayOrder: 2, applicability: { perils: ['WindHail'] } },
  ]
};

export const EARTHQUAKE_PERCENTAGE: DeductibleOptionTemplate = {
  id: 'earthquake-percent',
  name: 'Earthquake - Percentage',
  description: 'Percentage of TIV for earthquake coverage',
  category: 'Property',
  structure: 'percentMinMax',
  options: [
    { label: '5% of TIV ($10K min)', structure: 'percentMinMax', percentage: 5, basis: 'TIV', minimumAmount: 10000, maximumAmount: 500000, isDefault: false, isEnabled: true, displayOrder: 0, applicability: { perils: ['Earthquake'] } },
    { label: '10% of TIV ($25K min)', structure: 'percentMinMax', percentage: 10, basis: 'TIV', minimumAmount: 25000, maximumAmount: 1000000, isDefault: true, isEnabled: true, displayOrder: 1, applicability: { perils: ['Earthquake'] } },
    { label: '15% of TIV ($50K min)', structure: 'percentMinMax', percentage: 15, basis: 'TIV', minimumAmount: 50000, maximumAmount: 2000000, isDefault: false, isEnabled: true, displayOrder: 2, applicability: { perils: ['Earthquake'] } },
  ]
};

// ============================================================================
// Liability Deductible Templates
// ============================================================================

export const GL_DEDUCTIBLES: DeductibleOptionTemplate = {
  id: 'gl-flat',
  name: 'General Liability - Flat',
  description: 'Standard GL deductibles (often zero)',
  category: 'Liability',
  structure: 'flat',
  options: [
    { label: '$0 (No Deductible)', structure: 'flat', amount: 0, isDefault: true, isEnabled: true, displayOrder: 0 },
    { label: '$500', structure: 'flat', amount: 500, isDefault: false, isEnabled: true, displayOrder: 1 },
    { label: '$1,000', structure: 'flat', amount: 1000, isDefault: false, isEnabled: true, displayOrder: 2 },
    { label: '$2,500', structure: 'flat', amount: 2500, isDefault: false, isEnabled: true, displayOrder: 3 },
  ]
};

// ============================================================================
// Auto Deductible Templates
// ============================================================================

export const AUTO_PHYSICAL_DAMAGE: DeductibleOptionTemplate = {
  id: 'auto-pd',
  name: 'Auto Physical Damage',
  description: 'Comprehensive and collision deductibles',
  category: 'Auto',
  structure: 'flat',
  options: [
    { label: '$250', structure: 'flat', amount: 250, isDefault: false, isEnabled: true, displayOrder: 0 },
    { label: '$500', structure: 'flat', amount: 500, isDefault: true, isEnabled: true, displayOrder: 1 },
    { label: '$1,000', structure: 'flat', amount: 1000, isDefault: false, isEnabled: true, displayOrder: 2 },
    { label: '$2,500', structure: 'flat', amount: 2500, isDefault: false, isEnabled: true, displayOrder: 3 },
  ]
};

// ============================================================================
// Professional/Specialty Templates
// ============================================================================

export const PROFESSIONAL_DEDUCTIBLES: DeductibleOptionTemplate = {
  id: 'professional-flat',
  name: 'Professional Liability',
  description: 'E&O/Professional indemnity deductibles',
  category: 'Professional',
  structure: 'flat',
  options: [
    { label: '$1,000', structure: 'flat', amount: 1000, isDefault: false, isEnabled: true, displayOrder: 0 },
    { label: '$2,500', structure: 'flat', amount: 2500, isDefault: false, isEnabled: true, displayOrder: 1 },
    { label: '$5,000', structure: 'flat', amount: 5000, isDefault: true, isEnabled: true, displayOrder: 2 },
    { label: '$10,000', structure: 'flat', amount: 10000, isDefault: false, isEnabled: true, displayOrder: 3 },
    { label: '$25,000', structure: 'flat', amount: 25000, isDefault: false, isEnabled: true, displayOrder: 4 },
  ]
};

export const DISABILITY_WAITING: DeductibleOptionTemplate = {
  id: 'disability-waiting',
  name: 'Disability - Waiting Period',
  description: 'Elimination periods for disability coverage',
  category: 'Specialty',
  structure: 'waitingPeriod',
  options: [
    { label: '7 Days', structure: 'waitingPeriod', duration: 7, unit: 'days', isDefault: false, isEnabled: true, displayOrder: 0 },
    { label: '14 Days', structure: 'waitingPeriod', duration: 14, unit: 'days', isDefault: true, isEnabled: true, displayOrder: 1 },
    { label: '30 Days', structure: 'waitingPeriod', duration: 30, unit: 'days', isDefault: false, isEnabled: true, displayOrder: 2 },
    { label: '60 Days', structure: 'waitingPeriod', duration: 60, unit: 'days', isDefault: false, isEnabled: true, displayOrder: 3 },
    { label: '90 Days', structure: 'waitingPeriod', duration: 90, unit: 'days', isDefault: false, isEnabled: true, displayOrder: 4 },
  ]
};

export const WC_DEDUCTIBLES: DeductibleOptionTemplate = {
  id: 'wc-statutory',
  name: 'Workers Comp - Statutory',
  description: 'Workers compensation statutory requirements',
  category: 'Workers Comp',
  structure: 'flat',
  options: [
    { label: 'None (Statutory)', structure: 'flat', amount: 0, isDefault: true, isEnabled: true, displayOrder: 0 },
  ]
};

// ============================================================================
// All Templates Collection
// ============================================================================

export const ALL_DEDUCTIBLE_TEMPLATES: DeductibleOptionTemplate[] = [
  PROPERTY_FLAT_DEDUCTIBLES,
  WIND_HAIL_PERCENTAGE,
  EARTHQUAKE_PERCENTAGE,
  GL_DEDUCTIBLES,
  AUTO_PHYSICAL_DAMAGE,
  PROFESSIONAL_DEDUCTIBLES,
  DISABILITY_WAITING,
  WC_DEDUCTIBLES,
];

/**
 * Get templates by category
 */
export function getDeductibleTemplatesByCategory(category: DeductibleOptionTemplate['category']): DeductibleOptionTemplate[] {
  return ALL_DEDUCTIBLE_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get a template by ID
 */
export function getDeductibleTemplateById(id: string): DeductibleOptionTemplate | undefined {
  return ALL_DEDUCTIBLE_TEMPLATES.find(t => t.id === id);
}

/**
 * Get recommended deductible template IDs based on coverage category
 */
export function getRecommendedDeductibleTemplates(coverageCategory: string): string[] {
  switch (coverageCategory) {
    case 'property':
      return ['property-flat', 'wind-hail-percent', 'earthquake-percent'];
    case 'liability':
      return ['gl-flat'];
    case 'auto':
      return ['auto-pd'];
    case 'professional':
    case 'cyber':
      return ['professional-flat'];
    case 'workers_comp':
      return ['wc-statutory'];
    default:
      return ['property-flat', 'gl-flat'];
  }
}

