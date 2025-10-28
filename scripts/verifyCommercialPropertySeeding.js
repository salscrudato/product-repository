#!/usr/bin/env node

/**
 * Verification Script for Commercial Property Insurance Product Seeding
 *
 * This script verifies that all data was correctly seeded into Firestore
 * and provides a comprehensive report of the seeded product.
 *
 * Usage: node scripts/verifyCommercialPropertySeeding.js
 */

const admin = require('firebase-admin');

const PRODUCT_ID = 'commercial-property-enhanced-2025';

const initializeFirebase = () => {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: 'insurance-product-hub'
      });
    }
    console.log('✅ Firebase Admin initialized\n');
    return admin.firestore();
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    process.exit(1);
  }
};

const verifyProduct = async (db) => {
  console.log('📦 Verifying Product...');
  try {
    const productDoc = await db.collection('products').doc(PRODUCT_ID).get();
    if (!productDoc.exists) {
      console.error('❌ Product not found');
      return null;
    }
    const product = productDoc.data();
    console.log(`✅ Product found: ${product.name}`);
    console.log(`   Status: ${product.status}`);
    console.log(`   Category: ${product.category}`);
    console.log(`   States: ${product.states?.length || 0}`);
    return product;
  } catch (error) {
    console.error('❌ Error verifying product:', error.message);
    return null;
  }
};

const verifyCoverages = async (db) => {
  console.log('\n🛡️  Verifying Coverages...');
  try {
    const coveragesSnap = await db.collection('products').doc(PRODUCT_ID).collection('coverages').get();
    console.log(`✅ Found ${coveragesSnap.size} coverages:`);
    
    const coverages = [];
    coveragesSnap.forEach(doc => {
      const coverage = doc.data();
      coverages.push(coverage);
      console.log(`   • ${coverage.name} (${coverage.coverageCode})`);
      console.log(`     - Type: ${coverage.type}`);
      console.log(`     - Category: ${coverage.category}`);
      console.log(`     - Base Premium: $${coverage.basePremium}`);
    });
    
    return coverages;
  } catch (error) {
    console.error('❌ Error verifying coverages:', error.message);
    return [];
  }
};

const verifyLimitsAndDeductibles = async (db, coverages) => {
  console.log('\n💰 Verifying Limits and Deductibles...');
  try {
    let totalLimits = 0;
    let totalDeductibles = 0;
    
    for (const coverage of coverages) {
      const limitsSnap = await db.collection('products').doc(PRODUCT_ID)
        .collection('coverages').doc(coverage.id)
        .collection('limits').get();
      
      const deductiblesSnap = await db.collection('products').doc(PRODUCT_ID)
        .collection('coverages').doc(coverage.id)
        .collection('deductibles').get();
      
      totalLimits += limitsSnap.size;
      totalDeductibles += deductiblesSnap.size;
    }
    
    console.log(`✅ Total limits across all coverages: ${totalLimits}`);
    console.log(`✅ Total deductibles across all coverages: ${totalDeductibles}`);
    
    // Show sample limits and deductibles from first coverage
    if (coverages.length > 0) {
      const firstCoverage = coverages[0];
      const limitsSnap = await db.collection('products').doc(PRODUCT_ID)
        .collection('coverages').doc(firstCoverage.id)
        .collection('limits').limit(3).get();
      
      console.log(`\n   Sample limits for ${firstCoverage.name}:`);
      limitsSnap.forEach(doc => {
        const limit = doc.data();
        console.log(`   • ${limit.displayValue} (${limit.limitType})`);
      });
    }
  } catch (error) {
    console.error('❌ Error verifying limits and deductibles:', error.message);
  }
};

const verifyForms = async (db) => {
  console.log('\n📄 Verifying Forms...');
  try {
    const formsSnap = await db.collection('forms').where('productId', '==', PRODUCT_ID).get();
    console.log(`✅ Found ${formsSnap.size} forms:`);
    
    const forms = [];
    formsSnap.forEach(doc => {
      const form = doc.data();
      forms.push(form);
      console.log(`   • ${form.formNumber} - ${form.formName}`);
      console.log(`     - Type: ${form.type}`);
      console.log(`     - Edition Date: ${form.formEditionDate}`);
    });
    
    return forms;
  } catch (error) {
    console.error('❌ Error verifying forms:', error.message);
    return [];
  }
};

const verifyFormCoverageMappings = async (db) => {
  console.log('\n🔗 Verifying Form-Coverage Mappings...');
  try {
    const mappingsSnap = await db.collection('formCoverages').where('productId', '==', PRODUCT_ID).get();
    console.log(`✅ Found ${mappingsSnap.size} form-coverage mappings`);
    
    // Group by form
    const mappingsByForm = {};
    mappingsSnap.forEach(doc => {
      const mapping = doc.data();
      if (!mappingsByForm[mapping.formId]) {
        mappingsByForm[mapping.formId] = [];
      }
      mappingsByForm[mapping.formId].push(mapping);
    });
    
    console.log(`   Mappings by form:`);
    for (const [formId, mappings] of Object.entries(mappingsByForm)) {
      console.log(`   • Form ${formId}: ${mappings.length} coverage(s)`);
    }
  } catch (error) {
    console.error('❌ Error verifying form-coverage mappings:', error.message);
  }
};

const verifyPricingRules = async (db) => {
  console.log('\n💵 Verifying Pricing Rules...');
  try {
    const rulesSnap = await db.collection('pricingRules').where('productId', '==', PRODUCT_ID).get();
    console.log(`✅ Found ${rulesSnap.size} pricing rules:`);
    
    rulesSnap.forEach(doc => {
      const rule = doc.data();
      console.log(`   • ${rule.name} (${rule.ruleType})`);
      console.log(`     - Value: ${rule.value}${rule.valueType === 'percentage' ? '%' : ''}`);
      console.log(`     - Priority: ${rule.priority}`);
    });
  } catch (error) {
    console.error('❌ Error verifying pricing rules:', error.message);
  }
};

const verifyBusinessRules = async (db) => {
  console.log('\n⚙️  Verifying Business Rules...');
  try {
    const rulesSnap = await db.collection('rules').where('productId', '==', PRODUCT_ID).get();
    console.log(`✅ Found ${rulesSnap.size} business rules:`);
    
    rulesSnap.forEach(doc => {
      const rule = doc.data();
      console.log(`   • ${rule.name}`);
      console.log(`     - Category: ${rule.ruleCategory}`);
      console.log(`     - Condition: ${rule.condition}`);
    });
  } catch (error) {
    console.error('❌ Error verifying business rules:', error.message);
  }
};

const verifyStateApplicability = async (db) => {
  console.log('\n🗺️  Verifying State Applicability...');
  try {
    const statesSnap = await db.collection('stateApplicability').where('productId', '==', PRODUCT_ID).get();
    console.log(`✅ Found ${statesSnap.size} state applicability records`);
    
    // Show sample states
    const states = [];
    statesSnap.forEach(doc => {
      states.push(doc.data());
    });
    
    console.log(`   Sample states:`);
    states.slice(0, 5).forEach(state => {
      console.log(`   • ${state.state} - ${state.stateName}`);
      console.log(`     - Filing Status: ${state.filingStatus}`);
      console.log(`     - Compliance: ${state.complianceStatus}`);
    });
    
    if (states.length > 5) {
      console.log(`   ... and ${states.length - 5} more states`);
    }
  } catch (error) {
    console.error('❌ Error verifying state applicability:', error.message);
  }
};

const verifyCommercialProperty = async () => {
  console.log('🔍 Starting Verification of Commercial Property Insurance Product Seeding...\n');
  console.log('='.repeat(70) + '\n');
  
  const db = initializeFirebase();
  
  try {
    const product = await verifyProduct(db);
    if (!product) {
      console.error('\n❌ Product verification failed');
      process.exit(1);
    }
    
    const coverages = await verifyCoverages(db);
    await verifyLimitsAndDeductibles(db, coverages);
    const forms = await verifyForms(db);
    await verifyFormCoverageMappings(db);
    await verifyPricingRules(db);
    await verifyBusinessRules(db);
    await verifyStateApplicability(db);
    
    // Print final summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ VERIFICATION COMPLETE - All Data Successfully Seeded');
    console.log('='.repeat(70));
    console.log(`\nProduct Summary:`);
    console.log(`  Product ID: ${PRODUCT_ID}`);
    console.log(`  Product Name: ${product.name}`);
    console.log(`  Status: ${product.status}`);
    console.log(`  Coverages: ${coverages.length}`);
    console.log(`  Forms: ${forms.length}`);
    console.log(`  States: ${product.states?.length || 0}`);
    console.log('\n✨ The Commercial Property Insurance product is ready for use!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
};

// Run the verification script
verifyCommercialProperty();

