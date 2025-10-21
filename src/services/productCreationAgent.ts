/**
 * Product Creation Agent Service
 * Autonomous workflow for creating insurance products from PDF coverage forms
 */

import logger, { LOG_CATEGORIES } from '../utils/logger';
import { Coverage, Product } from '../types';

export interface ExtractionResult {
  productName: string;
  productDescription: string;
  productCode?: string;
  category?: string;
  coverages: CoverageExtraction[];
  metadata: Record<string, any>;
  confidence: number;
  extractionNotes: string;
}

export interface CoverageExtraction {
  name: string;
  description?: string;
  code?: string;
  limits?: string;
  deductibles?: string;
  perilsCovered?: string[];
  exclusions?: string[];
  conditions?: string[];
  parentCoverageName?: string;
  confidence: number;
}

export interface CreationProgress {
  step: 'upload' | 'extract' | 'validate' | 'create_product' | 'create_coverages' | 'upload_pdf' | 'complete';
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  message: string;
  progress: number; // 0-100
  error?: string;
  timestamp: Date;
}

/**
 * Adapt the PRODUCT_SUMMARY_SYSTEM prompt for autonomous product creation
 */
export function getAutonomousProductCreationPrompt(): string {
  return `
Persona: You are an expert in P&C insurance products with deep knowledge of policy language, coverage structures, and insurance terminology. Your task is to autonomously create a complete insurance product from a coverage form.

**Your Task:** Analyze the provided insurance document and extract ALL information needed to create a complete, production-ready insurance product.

**Key Definitions:**
- **Coverage**: A specific type of protection provided by the insurance policy
- **Sub-Coverage**: A coverage that is subordinate to or dependent on a parent coverage
- **Peril**: A specific cause of loss that is covered
- **Limit**: The maximum amount the insurer will pay for a covered loss
- **Deductible**: The amount the policyholder must pay before insurance coverage applies
- **Exclusion**: Specific situations, conditions, or types of losses that are not covered
- **Condition**: Requirements that must be met for coverage to apply

**Analysis Process:**
1. Identify the product type and create an appropriate product name
2. Extract all coverages, noting parent-child relationships (hierarchies)
3. For each coverage, identify: scope, limits, deductibles, covered perils, exclusions, conditions
4. Identify general conditions and exclusions that apply to the entire policy
5. Extract any product metadata (effective dates, states, etc.)
6. Assess confidence level for each extraction

**Output Format (JSON):**
{
  "productName": "Derived product name from document",
  "productDescription": "2-3 sentence description of the product",
  "productCode": "Suggested product code if identifiable",
  "category": "Product category (e.g., Commercial Property, Homeowners)",
  "coverages": [
    {
      "name": "Coverage name",
      "description": "Coverage description",
      "code": "Coverage code if available",
      "limits": "Limits description",
      "deductibles": "Deductible description",
      "perilsCovered": ["peril1", "peril2"],
      "exclusions": ["exclusion1", "exclusion2"],
      "conditions": ["condition1", "condition2"],
      "parentCoverageName": "Parent coverage name if sub-coverage",
      "confidence": 0-100
    }
  ],
  "metadata": {
    "effectiveDate": "Date if available",
    "states": ["State codes if available"],
    "lineOfBusiness": "Line of business if identifiable",
    "documentType": "Type of document analyzed"
  },
  "confidence": 0-100,
  "extractionNotes": "Any notes about extraction challenges or ambiguities"
}

**Few-Shot Example:**
Input: "Commercial Property form with building, contents, and business interruption coverage"
Output:
{
  "productName": "Commercial Property Package",
  "productDescription": "Comprehensive commercial property coverage protecting buildings, contents, and business income with flexible limits and deductibles.",
  "productCode": "CP-PKG-001",
  "category": "Commercial Property",
  "coverages": [
    {
      "name": "Building Coverage",
      "description": "Covers the structure of the building",
      "code": "CP-BLDG",
      "limits": "Up to policy limit",
      "deductibles": "$1,000 per occurrence",
      "perilsCovered": ["Fire", "Wind", "Hail"],
      "exclusions": ["Flood", "Earthquake"],
      "conditions": ["Property must be maintained"],
      "parentCoverageName": null,
      "confidence": 98
    }
  ],
  "metadata": {
    "effectiveDate": "2025-01-01",
    "states": ["CA", "NY", "TX"],
    "lineOfBusiness": "Commercial Property",
    "documentType": "Coverage Form"
  },
  "confidence": 95,
  "extractionNotes": "Standard commercial property form with clear coverage structure"
}

**Important:** 
- Extract ALL coverages including sub-coverages
- Derive a professional product name from the document content
- Flag any ambiguities or unclear language
- Provide confidence scores for all extractions
- Ensure the output is valid JSON that can be parsed
`;
}

/**
 * Create a progress tracker for the autonomous creation workflow
 */
export class ProgressTracker {
  private steps: CreationProgress[] = [];

  addStep(step: CreationProgress): void {
    this.steps.push(step);
    logger.info(LOG_CATEGORIES.DATA, `Product creation step: ${step.step}`, {
      status: step.status,
      progress: step.progress,
      message: step.message
    });
  }

  getProgress(): CreationProgress[] {
    return this.steps;
  }

  getCurrentProgress(): number {
    if (this.steps.length === 0) return 0;
    const completed = this.steps.filter(s => s.status === 'completed').length;
    return Math.round((completed / this.steps.length) * 100);
  }

  getLastStep(): CreationProgress | undefined {
    return this.steps[this.steps.length - 1];
  }
}

/**
 * Validate extracted data before product creation
 */
export function validateExtractionResult(result: ExtractionResult): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!result.productName || result.productName.trim().length === 0) {
    errors.push('Product name is required');
  }

  if (!result.coverages || result.coverages.length === 0) {
    errors.push('At least one coverage must be extracted');
  }

  if (result.confidence < 50) {
    errors.push('Extraction confidence is too low (< 50%)');
  }

  // Validate coverages
  result.coverages.forEach((coverage, index) => {
    if (!coverage.name || coverage.name.trim().length === 0) {
      errors.push(`Coverage ${index + 1}: name is required`);
    }
    if (coverage.confidence < 30) {
      errors.push(`Coverage ${index + 1}: confidence is too low (< 30%)`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  getAutonomousProductCreationPrompt,
  ProgressTracker,
  validateExtractionResult
};

