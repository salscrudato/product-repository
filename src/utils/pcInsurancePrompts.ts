/**
 * P&C Insurance Domain-Specific AI Prompts
 * Provides specialized prompts for insurance product management
 * Optimized for generating accurate insurance-related content
 */

/**
 * System prompts for different P&C insurance contexts
 */
export const PCInsuranceSystemPrompts = {
  /**
   * Product builder assistant
   */
  productBuilder: `You are an expert Property and Casualty (P&C) insurance product specialist. 
Your role is to help design and build insurance products with deep knowledge of:
- Commercial and personal insurance lines
- Coverage types (Liability, Property, Medical, Workers Comp, etc.)
- Underwriting principles and risk assessment
- Regulatory compliance requirements
- Pricing methodologies and rate structures
- Claims handling and policy administration

Provide clear, accurate, and practical guidance for product development.
Always consider regulatory requirements and industry best practices.
Format responses with clear sections and actionable recommendations.`,

  /**
   * Coverage advisor
   */
  coverageAdvisor: `You are a P&C insurance coverage specialist with expertise in:
- Coverage design and structure
- Limits and deductibles optimization
- Exclusions and conditions
- Sub-coverage relationships
- Coverage combinations and packages
- Industry-standard coverage types

Help design comprehensive coverage structures that balance protection and affordability.
Provide specific recommendations for limits, deductibles, and exclusions.
Consider both insured needs and insurer profitability.`,

  /**
   * Underwriting rules expert
   */
  underwritingExpert: `You are an expert in P&C insurance underwriting with knowledge of:
- Risk assessment methodologies
- Underwriting guidelines and criteria
- Eligibility requirements
- Risk factors and rating variables
- Approval workflows
- Exception handling

Help create clear, enforceable underwriting rules that manage risk effectively.
Ensure rules are objective, measurable, and compliant with regulations.
Consider both standard and non-standard risks.`,

  /**
   * Pricing specialist
   */
  pricingSpecialist: `You are a P&C insurance pricing expert with expertise in:
- Rate-making methodologies
- Loss ratio analysis
- Expense loading
- Profit margins
- Rate modifiers and adjustments
- Competitive positioning

Help develop pricing strategies that are actuarially sound and competitive.
Consider loss experience, expenses, and market conditions.
Ensure compliance with rating regulations.`,

  /**
   * Claims analyst
   */
  claimsAnalyst: `You are a P&C insurance claims specialist with knowledge of:
- Claims processes and workflows
- Coverage interpretation
- Claim types and handling procedures
- Subrogation opportunities
- Fraud detection indicators
- Claims data analysis

Help analyze claims patterns and improve claims handling processes.
Provide insights on coverage issues and process improvements.
Identify trends and risk indicators.`,
};

/**
 * Template prompts for common P&C tasks
 */
export const PCInsuranceTemplates = {
  /**
   * Generate coverage description
   */
  generateCoverageDescription: (coverageName: string, coverageType: string): string => `
Generate a clear, professional description for a ${coverageType} coverage called "${coverageName}".

The description should:
1. Explain what is covered in simple terms
2. Highlight key benefits
3. Mention typical exclusions
4. Be 2-3 sentences maximum
5. Be suitable for policy documents

Coverage Name: ${coverageName}
Coverage Type: ${coverageType}

Provide only the description text.`,

  /**
   * Generate underwriting criteria
   */
  generateUnderwritingCriteria: (productType: string, riskProfile: string): string => `
Generate underwriting criteria for a ${productType} insurance product targeting ${riskProfile} risks.

The criteria should:
1. Be specific and measurable
2. Include approval thresholds
3. Identify key risk factors
4. Suggest exception handling
5. Be compliant with industry standards

Product Type: ${productType}
Risk Profile: ${riskProfile}

Format as a numbered list with clear criteria.`,

  /**
   * Generate pricing guidance
   */
  generatePricingGuidance: (coverageName: string, marketSegment: string): string => `
Provide pricing guidance for ${coverageName} coverage in the ${marketSegment} market segment.

Consider:
1. Typical loss ratios for this coverage
2. Expense loading recommendations
3. Profit margin targets
4. Competitive positioning
5. Rate adjustment factors

Coverage: ${coverageName}
Market Segment: ${marketSegment}

Provide specific, actionable pricing recommendations.`,

  /**
   * Analyze coverage gaps
   */
  analyzeCoverageGaps: (existingCoverages: string[], productType: string): string => `
Analyze potential coverage gaps for a ${productType} product with these coverages:
${existingCoverages.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Identify:
1. Missing standard coverages
2. Potential customer needs not addressed
3. Competitive gaps
4. Regulatory requirements
5. Recommended additions

Provide specific recommendations with rationale.`,

  /**
   * Generate claims handling guidance
   */
  generateClaimsGuidance: (coverageType: string, claimScenario: string): string => `
Generate claims handling guidance for a ${coverageType} claim with this scenario:
${claimScenario}

Address:
1. Coverage applicability
2. Key questions to ask
3. Documentation needed
4. Potential exclusions
5. Subrogation opportunities
6. Recommended next steps

Provide clear, practical guidance.`,
};

/**
 * P&C Insurance terminology and definitions
 */
export const PCInsuranceTerminology = {
  coverageTypes: {
    'General Liability': 'Protection against bodily injury and property damage claims',
    'Property': 'Coverage for physical damage to buildings and contents',
    'Workers Compensation': 'Coverage for employee injuries and illnesses',
    'Commercial Auto': 'Coverage for business vehicles',
    'Cyber Liability': 'Protection against data breaches and cyber attacks',
    'Professional Liability': 'Coverage for professional errors and omissions',
    'Umbrella': 'Additional liability coverage above primary policies',
  },

  deductibleTypes: {
    'Fixed': 'A set dollar amount the insured pays per claim',
    'Percentage': 'A percentage of the claim amount or policy limit',
    'Aggregate': 'A total amount per policy period',
    'Franchise': 'Amount below which no payment is made; above which full claim is paid',
  },

  riskFactors: {
    'Location': 'Geographic area and exposure to natural disasters',
    'Operations': 'Type and nature of business operations',
    'Loss History': 'Past claims and loss experience',
    'Safety Measures': 'Risk mitigation and safety programs',
    'Management': 'Quality of management and controls',
  },
};

/**
 * Generate context-aware P&C prompt
 */
export function generatePCPrompt(
  context: 'product' | 'coverage' | 'underwriting' | 'pricing' | 'claims',
  task: string,
  additionalContext?: Record<string, any>
): string {
  const systemPrompt = PCInsuranceSystemPrompts[
    context === 'product' ? 'productBuilder' :
    context === 'coverage' ? 'coverageAdvisor' :
    context === 'underwriting' ? 'underwritingExpert' :
    context === 'pricing' ? 'pricingSpecialist' :
    'claimsAnalyst'
  ];

  let userPrompt = task;

  if (additionalContext) {
    userPrompt += '\n\nAdditional Context:\n';
    for (const [key, value] of Object.entries(additionalContext)) {
      userPrompt += `${key}: ${JSON.stringify(value)}\n`;
    }
  }

  return `${systemPrompt}\n\n${userPrompt}`;
}

/**
 * Validate P&C insurance data
 */
export function validatePCData(
  dataType: 'coverage' | 'limit' | 'deductible' | 'rule',
  data: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (dataType) {
    case 'coverage':
      if (!data.name || data.name.trim().length === 0) {
        errors.push('Coverage name is required');
      }
      if (!data.coverageType) {
        errors.push('Coverage type is required');
      }
      break;

    case 'limit':
      if (!data.amount || data.amount <= 0) {
        errors.push('Limit amount must be positive');
      }
      if (!data.currency || data.currency.length !== 3) {
        errors.push('Valid currency code is required');
      }
      break;

    case 'deductible':
      if (data.amount === undefined || data.amount < 0) {
        errors.push('Deductible amount must be non-negative');
      }
      if (!data.deductibleType) {
        errors.push('Deductible type is required');
      }
      break;

    case 'rule':
      if (!data.name || data.name.trim().length === 0) {
        errors.push('Rule name is required');
      }
      if (!data.ruleType) {
        errors.push('Rule type is required');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  PCInsuranceSystemPrompts,
  PCInsuranceTemplates,
  PCInsuranceTerminology,
  generatePCPrompt,
  validatePCData,
};

