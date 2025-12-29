/**
 * Limit Option Templates
 * 
 * Pre-configured limit option sets for common P&C insurance coverages.
 * These templates can be used to quickly set up limit options.
 */

import {
  LimitOptionTemplate,
  CoverageLimitOption,
  LimitStructure,
  SplitLimitComponent
} from '../types';

// ============================================================================
// Property Limit Templates
// ============================================================================

export const PROPERTY_SINGLE_LIMITS: LimitOptionTemplate = {
  id: 'property-single',
  name: 'Property - Single Limits',
  description: 'Standard property coverage limits',
  category: 'Property',
  structure: 'single',
  options: [
    { label: '$100,000', structure: 'single', amount: 100000, isDefault: false, isEnabled: true, displayOrder: 0 },
    { label: '$250,000', structure: 'single', amount: 250000, isDefault: false, isEnabled: true, displayOrder: 1 },
    { label: '$500,000', structure: 'single', amount: 500000, isDefault: true, isEnabled: true, displayOrder: 2 },
    { label: '$1,000,000', structure: 'single', amount: 1000000, isDefault: false, isEnabled: true, displayOrder: 3 },
    { label: '$2,000,000', structure: 'single', amount: 2000000, isDefault: false, isEnabled: true, displayOrder: 4 },
    { label: '$5,000,000', structure: 'single', amount: 5000000, isDefault: false, isEnabled: true, displayOrder: 5 },
  ]
};

export const PROPERTY_SUBLIMITS: LimitOptionTemplate = {
  id: 'property-sublimits',
  name: 'Property - Common Sublimits',
  description: 'Sublimits for specific perils within property coverage',
  category: 'Property',
  structure: 'sublimit',
  options: [
    { label: '$25,000 – Theft', structure: 'sublimit', amount: 25000, sublimitTag: 'Theft', isDefault: false, isEnabled: true, displayOrder: 0 },
    { label: '$50,000 – Theft', structure: 'sublimit', amount: 50000, sublimitTag: 'Theft', isDefault: true, isEnabled: true, displayOrder: 1 },
    { label: '$25,000 – Water Damage', structure: 'sublimit', amount: 25000, sublimitTag: 'Water Damage', isDefault: false, isEnabled: true, displayOrder: 2 },
    { label: '$50,000 – Water Damage', structure: 'sublimit', amount: 50000, sublimitTag: 'Water Damage', isDefault: true, isEnabled: true, displayOrder: 3 },
    { label: '$10,000 – Outdoor Signs', structure: 'sublimit', amount: 10000, sublimitTag: 'Outdoor Signs', isDefault: true, isEnabled: true, displayOrder: 4 },
    { label: '$25,000 – EDP Equipment', structure: 'sublimit', amount: 25000, sublimitTag: 'EDP Equipment', isDefault: true, isEnabled: true, displayOrder: 5 },
  ]
};

// ============================================================================
// General Liability Templates
// ============================================================================

export const GL_OCC_AGG_LIMITS: LimitOptionTemplate = {
  id: 'gl-occ-agg',
  name: 'General Liability - Occ/Agg',
  description: 'Standard GL occurrence and aggregate limit pairs',
  category: 'Liability',
  structure: 'occAgg',
  options: [
    { label: '$500K / $1M', structure: 'occAgg', perOccurrence: 500000, aggregate: 1000000, isDefault: false, isEnabled: true, displayOrder: 0 },
    { label: '$1M / $2M', structure: 'occAgg', perOccurrence: 1000000, aggregate: 2000000, isDefault: true, isEnabled: true, displayOrder: 1 },
    { label: '$2M / $4M', structure: 'occAgg', perOccurrence: 2000000, aggregate: 4000000, isDefault: false, isEnabled: true, displayOrder: 2 },
    { label: '$3M / $5M', structure: 'occAgg', perOccurrence: 3000000, aggregate: 5000000, isDefault: false, isEnabled: true, displayOrder: 3 },
    { label: '$5M / $10M', structure: 'occAgg', perOccurrence: 5000000, aggregate: 10000000, isDefault: false, isEnabled: true, displayOrder: 4 },
  ]
};

// ============================================================================
// Auto Liability Templates
// ============================================================================

export const AUTO_SPLIT_LIMITS: LimitOptionTemplate = {
  id: 'auto-split',
  name: 'Auto Liability - Split Limits',
  description: 'BI per person / BI per accident / PD split limits',
  category: 'Auto',
  structure: 'split',
  options: [
    {
      label: '25/50/25',
      structure: 'split',
      components: [
        { key: 'biPerPerson', label: 'BI Per Person', amount: 25000, order: 0 },
        { key: 'biPerAccident', label: 'BI Per Accident', amount: 50000, order: 1 },
        { key: 'pd', label: 'Property Damage', amount: 25000, order: 2 }
      ],
      isDefault: false, isEnabled: true, displayOrder: 0
    },
    {
      label: '50/100/50',
      structure: 'split',
      components: [
        { key: 'biPerPerson', label: 'BI Per Person', amount: 50000, order: 0 },
        { key: 'biPerAccident', label: 'BI Per Accident', amount: 100000, order: 1 },
        { key: 'pd', label: 'Property Damage', amount: 50000, order: 2 }
      ],
      isDefault: false, isEnabled: true, displayOrder: 1
    },
    {
      label: '100/300/100',
      structure: 'split',
      components: [
        { key: 'biPerPerson', label: 'BI Per Person', amount: 100000, order: 0 },
        { key: 'biPerAccident', label: 'BI Per Accident', amount: 300000, order: 1 },
        { key: 'pd', label: 'Property Damage', amount: 100000, order: 2 }
      ],
      isDefault: true, isEnabled: true, displayOrder: 2
    },
    {
      label: '250/500/100',
      structure: 'split',
      components: [
        { key: 'biPerPerson', label: 'BI Per Person', amount: 250000, order: 0 },
        { key: 'biPerAccident', label: 'BI Per Accident', amount: 500000, order: 1 },
        { key: 'pd', label: 'Property Damage', amount: 100000, order: 2 }
      ],
      isDefault: false, isEnabled: true, displayOrder: 3
    },
    {
      label: '500/500/500',
      structure: 'split',
      components: [
        { key: 'biPerPerson', label: 'BI Per Person', amount: 500000, order: 0 },
        { key: 'biPerAccident', label: 'BI Per Accident', amount: 500000, order: 1 },
        { key: 'pd', label: 'Property Damage', amount: 500000, order: 2 }
      ],
      isDefault: false, isEnabled: true, displayOrder: 4
    }
  ]
};

export const AUTO_CSL_LIMITS: LimitOptionTemplate = {
  id: 'auto-csl',
  name: 'Auto Liability - CSL',
  description: 'Combined Single Limit auto liability options',
  category: 'Auto',
  structure: 'csl',
  options: [
    { label: '$100,000 CSL', structure: 'csl', amount: 100000, isDefault: false, isEnabled: true, displayOrder: 0 },
    { label: '$300,000 CSL', structure: 'csl', amount: 300000, isDefault: false, isEnabled: true, displayOrder: 1 },
    { label: '$500,000 CSL', structure: 'csl', amount: 500000, isDefault: true, isEnabled: true, displayOrder: 2 },
    { label: '$1,000,000 CSL', structure: 'csl', amount: 1000000, isDefault: false, isEnabled: true, displayOrder: 3 },
  ]
};

// ============================================================================
// Inland Marine / Scheduled Templates
// ============================================================================

export const SCHEDULED_EQUIPMENT: LimitOptionTemplate = {
  id: 'scheduled-equipment',
  name: 'Scheduled Equipment',
  description: 'Per-item limits for scheduled equipment coverage',
  category: 'Specialty',
  structure: 'scheduled',
  options: [
    { label: 'Up to $10,000 per item', structure: 'scheduled', perItemMax: 10000, isDefault: false, isEnabled: true, displayOrder: 0 },
    { label: 'Up to $25,000 per item', structure: 'scheduled', perItemMax: 25000, isDefault: true, isEnabled: true, displayOrder: 1 },
    { label: 'Up to $50,000 per item', structure: 'scheduled', perItemMax: 50000, isDefault: false, isEnabled: true, displayOrder: 2 },
    { label: 'Up to $100,000 per item', structure: 'scheduled', perItemMax: 100000, isDefault: false, isEnabled: true, displayOrder: 3 },
  ]
};

// ============================================================================
// All Templates Collection
// ============================================================================

export const ALL_LIMIT_TEMPLATES: LimitOptionTemplate[] = [
  PROPERTY_SINGLE_LIMITS,
  PROPERTY_SUBLIMITS,
  GL_OCC_AGG_LIMITS,
  AUTO_SPLIT_LIMITS,
  AUTO_CSL_LIMITS,
  SCHEDULED_EQUIPMENT
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: LimitOptionTemplate['category']): LimitOptionTemplate[] {
  return ALL_LIMIT_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get templates by structure
 */
export function getTemplatesByStructure(structure: LimitStructure): LimitOptionTemplate[] {
  return ALL_LIMIT_TEMPLATES.filter(t => t.structure === structure);
}

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): LimitOptionTemplate | undefined {
  return ALL_LIMIT_TEMPLATES.find(t => t.id === id);
}

/**
 * Generate options from a template with unique IDs
 */
export function generateOptionsFromTemplate(
  template: LimitOptionTemplate
): Omit<CoverageLimitOption, 'id' | 'createdAt' | 'updatedAt'>[] {
  return template.options.map((opt, index) => ({
    ...opt,
    displayOrder: index
  }));
}

/**
 * Get split limit component definitions for a structure
 */
export function getSplitComponentsForTemplate(templateId: string): Omit<SplitLimitComponent, 'amount'>[] {
  const template = getTemplateById(templateId);
  if (!template || template.structure !== 'split') return [];

  const firstOption = template.options[0];
  if (firstOption.structure !== 'split' || !firstOption.components) return [];

  return firstOption.components.map(c => ({
    key: c.key,
    label: c.label,
    order: c.order
  }));
}

