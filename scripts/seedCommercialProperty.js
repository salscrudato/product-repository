#!/usr/bin/env node

/**
 * Commercial Property Insurance Product Seeding Script
 *
 * This script loads a production-ready Commercial Property insurance product
 * into Firestore with all related entities following industry-standard P&C
 * insurance practices.
 *
 * Usage: node scripts/seedCommercialProperty.js
 *
 * Requirements:
 * - Firebase CLI authenticated (firebase login)
 * - Firestore database accessible
 * - .firebaserc configured with project
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// Configuration
// ============================================================================

const PRODUCT_ID = 'commercial-property-2025';
const CREATED_BY = 'system-seed-script';
const TIMESTAMP = new Date();

// States to seed (representative sample)
const STATES = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];

// ============================================================================
// Initialize Firebase Admin
// ============================================================================

const initializeFirebase = () => {
  try {
    if (!admin.apps.length) {
      // Use default credentials from Firebase CLI
      admin.initializeApp({
        projectId: 'insurance-product-hub'
      });
    }

    console.log('✅ Firebase Admin initialized');
    return admin.firestore();
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    process.exit(1);
  }
};

// ============================================================================
// Data Definitions
// ============================================================================

const COMMERCIAL_PROPERTY_DATA = {
  product: {
    name: 'Commercial Property Insurance',
    description: 'Comprehensive commercial property coverage for buildings, business personal property, and business income protection',
    category: 'Commercial Property',
    status: 'active',
    version: 1,
    effectiveDate: new Date('2025-01-01'),
    expirationDate: new Date('2026-12-31')
  },

  coverages: [
    {
      name: 'Building Coverage',
      description: 'Coverage for the building structure and permanent fixtures',
      coverageCode: 'CP-00-10-BLDG',
      category: 'base',
      type: 'property',
      scopeOfCoverage: 'Building structure, permanent fixtures, and improvements',
      perilsCovered: ['fire', 'lightning', 'windstorm', 'hail', 'explosion', 'riot', 'vandalism'],
      basePremium: 5000,
      premiumBasis: 'rated',
      valuationMethod: 'RC',
      depreciationMethod: 'none',
      coinsurancePercentage: 80,
      hasCoinsurancePenalty: true,
      coverageTrigger: 'occurrence',
      territoryType: 'stateSpecific',
      requiresUnderwriterApproval: false,
      hasSubrogationRights: true,
      hasSalvageRights: true,
      claimsReportingPeriod: 30,
      proofOfLossDeadline: 90,
      displayOrder: 1
    },
    {
      name: 'Business Personal Property',
      description: 'Coverage for business personal property including inventory, equipment, and supplies',
      coverageCode: 'CP-00-10-BPP',
      category: 'base',
      type: 'property',
      scopeOfCoverage: 'Business personal property, inventory, equipment, and supplies',
      perilsCovered: ['fire', 'lightning', 'windstorm', 'hail', 'explosion', 'riot', 'vandalism'],
      basePremium: 3000,
      premiumBasis: 'rated',
      valuationMethod: 'ACV',
      depreciationMethod: 'straightLine',
      coinsurancePercentage: 80,
      hasCoinsurancePenalty: true,
      coverageTrigger: 'occurrence',
      territoryType: 'stateSpecific',
      requiresUnderwriterApproval: false,
      hasSubrogationRights: true,
      hasSalvageRights: true,
      claimsReportingPeriod: 30,
      proofOfLossDeadline: 90,
      displayOrder: 2
    },
    {
      name: 'Business Income Coverage',
      description: 'Coverage for loss of business income due to covered perils',
      coverageCode: 'CP-00-30-BI',
      category: 'optional',
      type: 'business-interruption',
      scopeOfCoverage: 'Loss of business income and continuing expenses',
      perilsCovered: ['fire', 'lightning', 'windstorm', 'hail', 'explosion', 'riot', 'vandalism'],
      basePremium: 2000,
      premiumBasis: 'rated',
      coverageTrigger: 'occurrence',
      waitingPeriod: 72,
      waitingPeriodUnit: 'hours',
      territoryType: 'stateSpecific',
      requiresUnderwriterApproval: false,
      hasSubrogationRights: true,
      claimsReportingPeriod: 30,
      proofOfLossDeadline: 90,
      displayOrder: 3,
      isOptional: true
    },
    {
      name: 'Extra Expense Coverage',
      description: 'Coverage for extra expenses incurred to continue business operations',
      coverageCode: 'CP-00-50-EE',
      category: 'optional',
      type: 'business-interruption',
      scopeOfCoverage: 'Extra expenses to continue business operations',
      perilsCovered: ['fire', 'lightning', 'windstorm', 'hail', 'explosion', 'riot', 'vandalism'],
      basePremium: 1500,
      premiumBasis: 'rated',
      coverageTrigger: 'occurrence',
      waitingPeriod: 72,
      waitingPeriodUnit: 'hours',
      territoryType: 'stateSpecific',
      requiresUnderwriterApproval: false,
      hasSubrogationRights: true,
      claimsReportingPeriod: 30,
      proofOfLossDeadline: 90,
      displayOrder: 4,
      isOptional: true
    },
    {
      name: 'Property of Others',
      description: 'Coverage for property of others in the insured\'s care, custody, or control',
      coverageCode: 'CP-00-10-POO',
      category: 'optional',
      type: 'property',
      scopeOfCoverage: 'Property of others in care, custody, or control',
      perilsCovered: ['fire', 'lightning', 'windstorm', 'hail', 'explosion', 'riot', 'vandalism'],
      basePremium: 500,
      premiumBasis: 'rated',
      valuationMethod: 'ACV',
      depreciationMethod: 'straightLine',
      coinsurancePercentage: 80,
      coverageTrigger: 'occurrence',
      territoryType: 'stateSpecific',
      requiresUnderwriterApproval: false,
      hasSubrogationRights: true,
      hasSalvageRights: true,
      claimsReportingPeriod: 30,
      proofOfLossDeadline: 90,
      displayOrder: 5,
      isOptional: true
    }
  ],

  limits: [
    { limitType: 'perOccurrence', amount: 250000, displayValue: '$250,000', isDefault: true },
    { limitType: 'perOccurrence', amount: 500000, displayValue: '$500,000' },
    { limitType: 'perOccurrence', amount: 1000000, displayValue: '$1,000,000' },
    { limitType: 'perOccurrence', amount: 2500000, displayValue: '$2,500,000' },
    { limitType: 'aggregate', amount: 500000, displayValue: '$500,000 Annual Aggregate' },
    { limitType: 'aggregate', amount: 1000000, displayValue: '$1,000,000 Annual Aggregate' }
  ],

  deductibles: [
    { deductibleType: 'flat', amount: 500, displayValue: '$500', isDefault: true },
    { deductibleType: 'flat', amount: 1000, displayValue: '$1,000' },
    { deductibleType: 'flat', amount: 2500, displayValue: '$2,500' },
    { deductibleType: 'flat', amount: 5000, displayValue: '$5,000' },
    { deductibleType: 'percentage', percentage: 2, displayValue: '2% of Insured Value', minimumRetained: 1000, maximumRetained: 50000 }
  ],

  forms: [
    {
      formNumber: 'CP 00 10 10 12',
      formName: 'Building and Personal Property Coverage Form',
      formEditionDate: '10/12',
      type: 'coverage',
      description: 'Standard ISO form for building and business personal property coverage'
    },
    {
      formNumber: 'CP 00 30 10 12',
      formName: 'Business Income (And Extra Expense) Coverage Form',
      formEditionDate: '10/12',
      type: 'coverage',
      description: 'Standard ISO form for business income and extra expense coverage'
    },
    {
      formNumber: 'CP 10 10 10 12',
      formName: 'Causes of Loss - Broad Form',
      formEditionDate: '10/12',
      type: 'endorsement',
      description: 'Broad form causes of loss endorsement'
    },
    {
      formNumber: 'CP 10 30 10 12',
      formName: 'Causes of Loss - Special Form',
      formEditionDate: '10/12',
      type: 'endorsement',
      description: 'Special form causes of loss endorsement'
    },
    {
      formNumber: 'CP 15 05 10 12',
      formName: 'Agreed Value Optional Coverage',
      formEditionDate: '10/12',
      type: 'endorsement',
      description: 'Agreed value optional coverage endorsement'
    }
  ],

  pricingRules: [
    {
      name: 'Base Building Premium',
      description: 'Base premium calculation for building coverage',
      ruleType: 'base',
      value: 100,
      valueType: 'fixed',
      priority: 1
    },
    {
      name: 'Building Age Surcharge',
      description: 'Surcharge for buildings over 30 years old',
      ruleType: 'surcharge',
      value: 15,
      valueType: 'percentage',
      priority: 2
    },
    {
      name: 'Sprinkler System Discount',
      description: 'Discount for buildings with automatic sprinkler systems',
      ruleType: 'discount',
      value: 10,
      valueType: 'percentage',
      priority: 3
    },
    {
      name: 'Alarm System Discount',
      description: 'Discount for monitored alarm systems',
      ruleType: 'discount',
      value: 5,
      valueType: 'percentage',
      priority: 4
    },
    {
      name: 'Multi-Coverage Discount',
      description: 'Discount when purchasing multiple coverages',
      ruleType: 'discount',
      value: 10,
      valueType: 'percentage',
      priority: 5
    }
  ],

  businessRules: [
    {
      name: 'Building Coverage Required',
      ruleType: 'Coverage',
      ruleCategory: 'Eligibility',
      condition: 'Product = Commercial Property',
      outcome: 'Building Coverage must be selected',
      reference: 'CP 00 10 - Building and Personal Property Coverage Form'
    },
    {
      name: 'Coinsurance Penalty',
      ruleType: 'Coverage',
      ruleCategory: 'Coverage',
      condition: 'Insured value < 80% of replacement cost',
      outcome: 'Apply coinsurance penalty to claim payment',
      reference: 'Standard coinsurance clause'
    },
    {
      name: 'Business Income Waiting Period',
      ruleType: 'Coverage',
      ruleCategory: 'Coverage',
      condition: 'Business Income Coverage selected',
      outcome: 'Apply 72-hour waiting period',
      reference: 'CP 00 30 - Business Income Coverage Form'
    },
    {
      name: 'Proof of Loss Deadline',
      ruleType: 'Coverage',
      ruleCategory: 'Compliance',
      condition: 'Claim filed',
      outcome: 'Proof of loss must be submitted within 90 days',
      reference: 'Standard policy conditions'
    },
    {
      name: 'Underwriter Approval for High Limits',
      ruleType: 'Pricing',
      ruleCategory: 'Eligibility',
      condition: 'Requested limit > $5,000,000',
      outcome: 'Require underwriter approval',
      reference: 'Underwriting guidelines'
    }
  ],

  stateApplicability: [
    {
      state: 'CA',
      stateName: 'California',
      filingStatus: 'approved',
      rateApprovalStatus: 'approved',
      complianceStatus: 'compliant'
    },
    {
      state: 'NY',
      stateName: 'New York',
      filingStatus: 'approved',
      rateApprovalStatus: 'approved',
      complianceStatus: 'compliant'
    },
    {
      state: 'TX',
      stateName: 'Texas',
      filingStatus: 'approved',
      rateApprovalStatus: 'approved',
      complianceStatus: 'compliant'
    },
    {
      state: 'FL',
      stateName: 'Florida',
      filingStatus: 'approved',
      rateApprovalStatus: 'approved',
      complianceStatus: 'compliant'
    },
    {
      state: 'IL',
      stateName: 'Illinois',
      filingStatus: 'approved',
      rateApprovalStatus: 'approved',
      complianceStatus: 'compliant'
    },
    {
      state: 'PA',
      stateName: 'Pennsylvania',
      filingStatus: 'approved',
      rateApprovalStatus: 'approved',
      complianceStatus: 'compliant'
    },
    {
      state: 'OH',
      stateName: 'Ohio',
      filingStatus: 'approved',
      rateApprovalStatus: 'approved',
      complianceStatus: 'compliant'
    },
    {
      state: 'GA',
      stateName: 'Georgia',
      filingStatus: 'approved',
      rateApprovalStatus: 'approved',
      complianceStatus: 'compliant'
    },
    {
      state: 'NC',
      stateName: 'North Carolina',
      filingStatus: 'approved',
      rateApprovalStatus: 'approved',
      complianceStatus: 'compliant'
    },
    {
      state: 'MI',
      stateName: 'Michigan',
      filingStatus: 'approved',
      rateApprovalStatus: 'approved',
      complianceStatus: 'compliant'
    }
  ]
};

// ============================================================================
// Seeding Functions
// ============================================================================

const seedProduct = async (db) => {
  console.log('\n📦 Seeding Product...');
  
  const productData = {
    ...COMMERCIAL_PROPERTY_DATA.product,
    states: STATES,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    createdBy: CREATED_BY,
    updatedBy: CREATED_BY
  };

  await db.collection('products').doc(PRODUCT_ID).set(productData);
  console.log(`✅ Product created: ${PRODUCT_ID}`);
  
  return PRODUCT_ID;
};

const seedCoverages = async (db, productId) => {
  console.log('\n🛡️  Seeding Coverages...');
  
  const coverageIds = {};
  
  for (const coverage of COMMERCIAL_PROPERTY_DATA.coverages) {
    const coverageId = `${productId}-${coverage.coverageCode.toLowerCase().replace(/\s+/g, '-')}`;
    
    const coverageData = {
      ...coverage,
      id: coverageId,
      productId,
      states: STATES,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
      createdBy: CREATED_BY,
      updatedBy: CREATED_BY
    };

    await db.collection('products').doc(productId).collection('coverages').doc(coverageId).set(coverageData);
    coverageIds[coverage.coverageCode] = coverageId;
    console.log(`✅ Coverage created: ${coverage.name}`);
  }
  
  return coverageIds;
};

const seedLimitsAndDeductibles = async (db, productId, coverageIds) => {
  console.log('\n💰 Seeding Limits and Deductibles...');
  
  for (const coverageCode of Object.keys(coverageIds)) {
    const coverageId = coverageIds[coverageCode];
    
    // Add limits
    for (let i = 0; i < COMMERCIAL_PROPERTY_DATA.limits.length; i++) {
      const limit = COMMERCIAL_PROPERTY_DATA.limits[i];
      const limitId = `limit-${i + 1}`;
      
      const limitData = {
        ...limit,
        id: limitId,
        coverageId,
        productId,
        displayOrder: i + 1,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
        createdBy: CREATED_BY
      };

      await db.collection('products').doc(productId)
        .collection('coverages').doc(coverageId)
        .collection('limits').doc(limitId).set(limitData);
    }
    
    // Add deductibles
    for (let i = 0; i < COMMERCIAL_PROPERTY_DATA.deductibles.length; i++) {
      const deductible = COMMERCIAL_PROPERTY_DATA.deductibles[i];
      const deductibleId = `deductible-${i + 1}`;
      
      const deductibleData = {
        ...deductible,
        id: deductibleId,
        coverageId,
        productId,
        displayOrder: i + 1,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
        createdBy: CREATED_BY
      };

      await db.collection('products').doc(productId)
        .collection('coverages').doc(coverageId)
        .collection('deductibles').doc(deductibleId).set(deductibleData);
    }
    
    console.log(`✅ Limits and deductibles added for: ${coverageId}`);
  }
};

const seedForms = async (db, productId) => {
  console.log('\n📄 Seeding Forms...');
  
  const formIds = {};
  
  for (const form of COMMERCIAL_PROPERTY_DATA.forms) {
    const formId = `form-${form.formNumber.replace(/\s+/g, '-').toLowerCase()}`;
    
    const formData = {
      ...form,
      id: formId,
      productId,
      states: STATES,
      isActive: true,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
      createdBy: CREATED_BY,
      updatedBy: CREATED_BY
    };

    await db.collection('forms').doc(formId).set(formData);
    formIds[form.formNumber] = formId;
    console.log(`✅ Form created: ${form.formName}`);
  }
  
  return formIds;
};

const seedFormCoverageMappings = async (db, productId, coverageIds, formIds) => {
  console.log('\n🔗 Seeding Form-Coverage Mappings...');
  
  const mappings = [
    { formNumber: 'CP 00 10 10 12', coverageCodes: ['CP-00-10-BLDG', 'CP-00-10-BPP', 'CP-00-10-POO'] },
    { formNumber: 'CP 00 30 10 12', coverageCodes: ['CP-00-30-BI', 'CP-00-50-EE'] },
    { formNumber: 'CP 10 10 10 12', coverageCodes: ['CP-00-10-BLDG', 'CP-00-10-BPP'] },
    { formNumber: 'CP 10 30 10 12', coverageCodes: ['CP-00-10-BLDG', 'CP-00-10-BPP'] },
    { formNumber: 'CP 15 05 10 12', coverageCodes: ['CP-00-10-BLDG', 'CP-00-10-BPP'] }
  ];

  for (const mapping of mappings) {
    const formId = formIds[mapping.formNumber];
    
    for (const coverageCode of mapping.coverageCodes) {
      const coverageId = coverageIds[coverageCode];
      const mappingId = `${formId}-${coverageId}`;
      
      const mappingData = {
        id: mappingId,
        formId,
        coverageId,
        productId,
        isPrimary: true,
        states: STATES,
        displayOrder: 1,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
        createdBy: CREATED_BY
      };

      await db.collection('formCoverages').doc(mappingId).set(mappingData);
    }
    
    console.log(`✅ Mappings created for form: ${mapping.formNumber}`);
  }
};

const seedPricingRules = async (db, productId) => {
  console.log('\n💵 Seeding Pricing Rules...');
  
  for (let i = 0; i < COMMERCIAL_PROPERTY_DATA.pricingRules.length; i++) {
    const rule = COMMERCIAL_PROPERTY_DATA.pricingRules[i];
    const ruleId = `pricing-rule-${i + 1}`;
    
    const ruleData = {
      ...rule,
      id: ruleId,
      productId,
      states: STATES,
      isActive: true,
      version: 1,
      effectiveDate: TIMESTAMP,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
      createdBy: CREATED_BY
    };

    await db.collection('pricingRules').doc(ruleId).set(ruleData);
    console.log(`✅ Pricing rule created: ${rule.name}`);
  }
};

const seedBusinessRules = async (db, productId) => {
  console.log('\n⚙️  Seeding Business Rules...');
  
  for (let i = 0; i < COMMERCIAL_PROPERTY_DATA.businessRules.length; i++) {
    const rule = COMMERCIAL_PROPERTY_DATA.businessRules[i];
    const ruleId = `business-rule-${i + 1}`;
    
    const ruleData = {
      ...rule,
      id: ruleId,
      productId,
      states: STATES,
      status: 'Active',
      priority: i + 1,
      version: 1,
      effectiveDate: TIMESTAMP,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
      createdBy: CREATED_BY
    };

    await db.collection('rules').doc(ruleId).set(ruleData);
    console.log(`✅ Business rule created: ${rule.name}`);
  }
};

const seedStateApplicability = async (db, productId) => {
  console.log('\n🗺️  Seeding State Applicability...');
  
  for (const state of COMMERCIAL_PROPERTY_DATA.stateApplicability) {
    const stateId = `${productId}-${state.state}`;
    
    const stateData = {
      ...state,
      id: stateId,
      productId,
      effectiveDate: TIMESTAMP,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
      createdBy: CREATED_BY
    };

    await db.collection('stateApplicability').doc(stateId).set(stateData);
    console.log(`✅ State applicability created: ${state.stateName}`);
  }
};

// ============================================================================
// Main Seeding Function
// ============================================================================

const seedCommercialProperty = async () => {
  console.log('🚀 Starting Commercial Property Insurance Product Seeding...\n');
  
  const db = initializeFirebase();
  
  try {
    // Seed in order of dependencies
    const productId = await seedProduct(db);
    const coverageIds = await seedCoverages(db, productId);
    await seedLimitsAndDeductibles(db, productId, coverageIds);
    const formIds = await seedForms(db, productId);
    await seedFormCoverageMappings(db, productId, coverageIds, formIds);
    await seedPricingRules(db, productId);
    await seedBusinessRules(db, productId);
    await seedStateApplicability(db, productId);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ SEEDING COMPLETE - Summary Report');
    console.log('='.repeat(60));
    console.log(`Product ID: ${productId}`);
    console.log(`Coverages: ${Object.keys(coverageIds).length}`);
    console.log(`Forms: ${Object.keys(formIds).length}`);
    console.log(`Pricing Rules: ${COMMERCIAL_PROPERTY_DATA.pricingRules.length}`);
    console.log(`Business Rules: ${COMMERCIAL_PROPERTY_DATA.businessRules.length}`);
    console.log(`States: ${COMMERCIAL_PROPERTY_DATA.stateApplicability.length}`);
    console.log(`Limits per Coverage: ${COMMERCIAL_PROPERTY_DATA.limits.length}`);
    console.log(`Deductibles per Coverage: ${COMMERCIAL_PROPERTY_DATA.deductibles.length}`);
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run the seeding script
seedCommercialProperty();

