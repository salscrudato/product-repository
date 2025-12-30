/**
 * Coverage Type Detector
 * 
 * Analyzes coverage names to detect their type/category for
 * intelligent AI suggestions of limits and deductibles.
 */

export type CoverageCategory = 
  | 'property'
  | 'liability' 
  | 'auto'
  | 'workers_comp'
  | 'professional'
  | 'cyber'
  | 'marine'
  | 'umbrella'
  | 'unknown';

export interface CoverageDetectionResult {
  category: CoverageCategory;
  confidence: number; // 0-1
  subType?: string;
  keywords: string[];
}

// Keywords for each category
const CATEGORY_PATTERNS: Record<CoverageCategory, { keywords: string[]; weight: number }[]> = {
  property: [
    { keywords: ['building', 'property', 'contents', 'bpp', 'real property', 'structure'], weight: 1 },
    { keywords: ['business personal', 'equipment breakdown', 'spoilage', 'glass'], weight: 0.9 },
    { keywords: ['flood', 'earthquake', 'wind', 'hail', 'fire'], weight: 0.7 },
    { keywords: ['business income', 'extra expense', 'rental income'], weight: 0.8 },
  ],
  liability: [
    { keywords: ['general liability', 'gl', 'cgl', 'premises liability'], weight: 1 },
    { keywords: ['products liability', 'completed operations', 'personal injury'], weight: 0.9 },
    { keywords: ['advertising injury', 'medical payments', 'med pay'], weight: 0.8 },
    { keywords: ['liability', 'bodily injury', 'bi'], weight: 0.6 },
  ],
  auto: [
    { keywords: ['auto', 'automobile', 'vehicle', 'car', 'truck', 'fleet'], weight: 1 },
    { keywords: ['collision', 'comprehensive', 'comp', 'physical damage'], weight: 0.9 },
    { keywords: ['uninsured motorist', 'um', 'uim', 'underinsured'], weight: 0.9 },
    { keywords: ['pip', 'no-fault', 'medical payments auto'], weight: 0.8 },
    { keywords: ['hired auto', 'non-owned auto', 'drive other car'], weight: 0.8 },
  ],
  workers_comp: [
    { keywords: ['workers comp', 'workers\' comp', 'wc', 'work comp'], weight: 1 },
    { keywords: ['employers liability', 'el', 'occupational'], weight: 0.9 },
    { keywords: ['statutory', 'coverage a', 'coverage b'], weight: 0.7 },
  ],
  professional: [
    { keywords: ['professional liability', 'e&o', 'errors and omissions'], weight: 1 },
    { keywords: ['malpractice', 'professional indemnity', 'pi'], weight: 0.9 },
    { keywords: ['directors and officers', 'd&o', 'management liability'], weight: 0.9 },
    { keywords: ['fiduciary', 'employment practices', 'epli'], weight: 0.8 },
  ],
  cyber: [
    { keywords: ['cyber', 'data breach', 'network security'], weight: 1 },
    { keywords: ['privacy liability', 'ransomware', 'cyber extortion'], weight: 0.9 },
    { keywords: ['media liability', 'digital', 'technology'], weight: 0.7 },
  ],
  marine: [
    { keywords: ['inland marine', 'ocean marine', 'cargo'], weight: 1 },
    { keywords: ['equipment floater', 'contractors equipment', 'builders risk'], weight: 0.9 },
    { keywords: ['installation floater', 'scheduled', 'valuable papers'], weight: 0.8 },
  ],
  umbrella: [
    { keywords: ['umbrella', 'excess liability', 'excess'], weight: 1 },
    { keywords: ['following form', 'drop down'], weight: 0.8 },
  ],
  unknown: [],
};

/**
 * Detect the category and type of a coverage based on its name
 */
export function detectCoverageType(coverageName: string): CoverageDetectionResult {
  const normalized = coverageName.toLowerCase().trim();
  const matchedKeywords: string[] = [];
  
  let bestCategory: CoverageCategory = 'unknown';
  let bestScore = 0;
  let subType: string | undefined;
  
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS) as [CoverageCategory, typeof CATEGORY_PATTERNS['property']][]) {
    let categoryScore = 0;
    
    for (const { keywords, weight } of patterns) {
      for (const keyword of keywords) {
        if (normalized.includes(keyword.toLowerCase())) {
          categoryScore += weight;
          matchedKeywords.push(keyword);
          if (!subType && weight >= 0.8) {
            subType = keyword;
          }
        }
      }
    }
    
    if (categoryScore > bestScore) {
      bestScore = categoryScore;
      bestCategory = category;
    }
  }
  
  // Normalize confidence to 0-1 range
  const confidence = Math.min(bestScore / 2, 1);
  
  return {
    category: bestCategory,
    confidence,
    subType,
    keywords: [...new Set(matchedKeywords)],
  };
}

/**
 * Get recommended limit template IDs based on coverage category
 */
export function getRecommendedLimitTemplates(category: CoverageCategory): string[] {
  switch (category) {
    case 'property':
      return ['property-single', 'property-sublimits'];
    case 'liability':
      return ['gl-occ-agg'];
    case 'auto':
      return ['auto-split', 'auto-csl'];
    case 'marine':
      return ['scheduled-equipment', 'property-single'];
    case 'umbrella':
      return ['gl-occ-agg'];
    case 'professional':
    case 'cyber':
      return ['gl-occ-agg'];
    case 'workers_comp':
      return []; // WC has statutory limits
    default:
      return ['property-single', 'gl-occ-agg'];
  }
}

/**
 * Get recommended deductible template type based on coverage category
 */
export function getRecommendedDeductibleType(category: CoverageCategory): string {
  switch (category) {
    case 'property':
      return 'property';
    case 'liability':
      return 'gl';
    case 'auto':
      return 'auto';
    case 'workers_comp':
      return 'wc';
    default:
      return 'property';
  }
}

