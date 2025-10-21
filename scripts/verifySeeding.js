#!/usr/bin/env node

/**
 * Verify Commercial Property Insurance Product Seeding
 * 
 * This script verifies that all data has been correctly seeded to Firestore.
 * 
 * Usage: node scripts/verifySeeding.js
 */

const admin = require('firebase-admin');

// ============================================================================
// Configuration
// ============================================================================

const PRODUCT_ID = 'commercial-property-2025';

// ============================================================================
// Initialize Firebase Admin
// ============================================================================

const initializeFirebase = () => {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: 'insurance-product-hub'
      });
    }
    return admin.firestore();
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    process.exit(1);
  }
};

// ============================================================================
// Verification Functions
// ============================================================================

const verifyProduct = async (db) => {
  console.log('\n📦 Verifying Product...');
  
  const doc = await db.collection('products').doc(PRODUCT_ID).get();
  
  if (!doc.exists) {
    console.error('❌ Product not found');
    return false;
  }
  
  const data = doc.data();
  console.log('✅ Product found');
  console.log(`   Name: ${data.name}`);
  console.log(`   Status: ${data.status}`);
  console.log(`   States: ${data.states?.length || 0}`);
  console.log(`   Version: ${data.version}`);
  
  return true;
};

const verifyCoverages = async (db) => {
  console.log('\n🛡️  Verifying Coverages...');
  
  const snapshot = await db.collection('products')
    .doc(PRODUCT_ID)
    .collection('coverages')
    .get();
  
  console.log(`✅ Found ${snapshot.size} coverages`);
  
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`   • ${data.name} (${data.coverageCode})`);
  });
  
  return snapshot.size > 0;
};

const verifyLimits = async (db) => {
  console.log('\n💰 Verifying Limits...');
  
  const coveragesSnapshot = await db.collection('products')
    .doc(PRODUCT_ID)
    .collection('coverages')
    .get();
  
  let totalLimits = 0;
  
  for (const coverageDoc of coveragesSnapshot.docs) {
    const limitsSnapshot = await coverageDoc.ref.collection('limits').get();
    totalLimits += limitsSnapshot.size;
  }
  
  console.log(`✅ Found ${totalLimits} limits across all coverages`);
  
  return totalLimits > 0;
};

const verifyDeductibles = async (db) => {
  console.log('\n💵 Verifying Deductibles...');
  
  const coveragesSnapshot = await db.collection('products')
    .doc(PRODUCT_ID)
    .collection('coverages')
    .get();
  
  let totalDeductibles = 0;
  
  for (const coverageDoc of coveragesSnapshot.docs) {
    const deductiblesSnapshot = await coverageDoc.ref.collection('deductibles').get();
    totalDeductibles += deductiblesSnapshot.size;
  }
  
  console.log(`✅ Found ${totalDeductibles} deductibles across all coverages`);
  
  return totalDeductibles > 0;
};

const verifyForms = async (db) => {
  console.log('\n📄 Verifying Forms...');
  
  const snapshot = await db.collection('forms').get();
  
  console.log(`✅ Found ${snapshot.size} forms`);
  
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`   • ${data.formNumber} - ${data.formName}`);
  });
  
  return snapshot.size > 0;
};

const verifyFormCoverageMappings = async (db) => {
  console.log('\n🔗 Verifying Form-Coverage Mappings...');
  
  const snapshot = await db.collection('formCoverages')
    .where('productId', '==', PRODUCT_ID)
    .get();
  
  console.log(`✅ Found ${snapshot.size} form-coverage mappings`);
  
  return snapshot.size > 0;
};

const verifyPricingRules = async (db) => {
  console.log('\n💵 Verifying Pricing Rules...');
  
  const snapshot = await db.collection('pricingRules')
    .where('productId', '==', PRODUCT_ID)
    .get();
  
  console.log(`✅ Found ${snapshot.size} pricing rules`);
  
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`   • ${data.name} (${data.ruleType})`);
  });
  
  return snapshot.size > 0;
};

const verifyBusinessRules = async (db) => {
  console.log('\n⚙️  Verifying Business Rules...');
  
  const snapshot = await db.collection('rules')
    .where('productId', '==', PRODUCT_ID)
    .get();
  
  console.log(`✅ Found ${snapshot.size} business rules`);
  
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`   • ${data.name} (${data.ruleCategory})`);
  });
  
  return snapshot.size > 0;
};

const verifyStateApplicability = async (db) => {
  console.log('\n🗺️  Verifying State Applicability...');
  
  const snapshot = await db.collection('stateApplicability')
    .where('productId', '==', PRODUCT_ID)
    .get();
  
  console.log(`✅ Found ${snapshot.size} state applicability records`);
  
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`   • ${data.stateName} (${data.state})`);
  });
  
  return snapshot.size > 0;
};

// ============================================================================
// Main Verification Function
// ============================================================================

const verifySeeding = async () => {
  console.log('🔍 Verifying Commercial Property Insurance Product Seeding...');
  
  const db = initializeFirebase();
  
  try {
    const results = {
      product: await verifyProduct(db),
      coverages: await verifyCoverages(db),
      limits: await verifyLimits(db),
      deductibles: await verifyDeductibles(db),
      forms: await verifyForms(db),
      mappings: await verifyFormCoverageMappings(db),
      pricingRules: await verifyPricingRules(db),
      businessRules: await verifyBusinessRules(db),
      stateApplicability: await verifyStateApplicability(db)
    };

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ VERIFICATION COMPLETE - Summary Report');
    console.log('='.repeat(60));
    
    const allPassed = Object.values(results).every(r => r);
    
    if (allPassed) {
      console.log('✅ All verifications PASSED');
    } else {
      console.log('⚠️  Some verifications FAILED');
      Object.entries(results).forEach(([key, value]) => {
        console.log(`   ${value ? '✅' : '❌'} ${key}`);
      });
    }
    
    console.log('='.repeat(60) + '\n');

    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
};

// Run the verification
verifySeeding();

