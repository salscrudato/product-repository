/**
 * Data Verification Script
 * 
 * This script checks and displays all data in the Firestore database
 * to verify what has been seeded.
 * 
 * Run with: npx tsx scripts/verifyData.ts
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs,
  collectionGroup,
  query,
  where
} from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function verifyData() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 FIRESTORE DATABASE VERIFICATION');
  console.log('='.repeat(70));
  console.log(`\n🔥 Project: ${firebaseConfig.projectId}\n`);

  try {
    // ========================================================================
    // PRODUCTS
    // ========================================================================
    console.log('📦 PRODUCTS');
    console.log('-'.repeat(70));
    const productsSnap = await getDocs(collection(db, 'products'));
    console.log(`Total Products: ${productsSnap.size}\n`);
    
    const products: any[] = [];
    productsSnap.forEach(doc => {
      const data = doc.data();
      products.push({ id: doc.id, ...data });
      console.log(`  ✓ ${data.name || 'Unnamed'}`);
      console.log(`    ID: ${doc.id}`);
      console.log(`    Code: ${data.productCode || 'N/A'}`);
      console.log(`    Status: ${data.status || 'N/A'}`);
      console.log(`    States: ${(data.availableStates || []).length} states`);
      console.log('');
    });

    // ========================================================================
    // COVERAGES (for each product)
    // ========================================================================
    console.log('\n🛡️  COVERAGES');
    console.log('-'.repeat(70));
    
    for (const product of products) {
      const coveragesSnap = await getDocs(
        collection(db, `products/${product.id}/coverages`)
      );
      
      console.log(`\n  Product: ${product.name}`);
      console.log(`  Total Coverages: ${coveragesSnap.size}`);
      
      const mainCoverages = coveragesSnap.docs.filter(doc => !doc.data().parentCoverageId);
      const subCoverages = coveragesSnap.docs.filter(doc => doc.data().parentCoverageId);
      
      console.log(`    - Main Coverages: ${mainCoverages.length}`);
      console.log(`    - Sub-Coverages: ${subCoverages.length}\n`);
      
      mainCoverages.forEach(doc => {
        const data = doc.data();
        console.log(`    ✓ ${data.name}`);
        console.log(`      Code: ${data.coverageCode || 'N/A'}`);
        console.log(`      Category: ${data.category || 'N/A'}`);
        console.log(`      Optional: ${data.isOptional ? 'Yes' : 'No'}`);
        console.log(`      Limits: ${(data.limits || []).length} options`);
        console.log(`      Deductibles: ${(data.deductibles || []).length} options`);
        
        // Show sub-coverages
        const subs = subCoverages.filter(s => s.data().parentCoverageId === doc.id);
        if (subs.length > 0) {
          console.log(`      Sub-Coverages: ${subs.length}`);
          subs.forEach(sub => {
            console.log(`        → ${sub.data().name}`);
          });
        }
        console.log('');
      });
    }

    // ========================================================================
    // FORMS
    // ========================================================================
    console.log('\n📄 FORMS');
    console.log('-'.repeat(70));
    const formsSnap = await getDocs(collection(db, 'forms'));
    console.log(`Total Forms: ${formsSnap.size}\n`);
    
    formsSnap.forEach(doc => {
      const data = doc.data();
      console.log(`  ✓ ${data.formNumber || 'N/A'} - ${data.formName || 'Unnamed'}`);
      console.log(`    Type: ${data.type || 'N/A'}`);
      console.log(`    Category: ${data.category || 'N/A'}`);
      console.log(`    Edition: ${data.formEditionDate || 'N/A'}`);
      console.log(`    States: ${(data.states || []).length} states`);
      console.log('');
    });

    // ========================================================================
    // FORM-COVERAGE MAPPINGS
    // ========================================================================
    console.log('\n🔗 FORM-COVERAGE MAPPINGS');
    console.log('-'.repeat(70));
    const formCovSnap = await getDocs(collection(db, 'formCoverages'));
    console.log(`Total Mappings: ${formCovSnap.size}\n`);
    
    // Group by product
    const mappingsByProduct: Record<string, any[]> = {};
    formCovSnap.forEach(doc => {
      const data = doc.data();
      if (!mappingsByProduct[data.productId]) {
        mappingsByProduct[data.productId] = [];
      }
      mappingsByProduct[data.productId].push(data);
    });
    
    for (const [productId, mappings] of Object.entries(mappingsByProduct)) {
      const product = products.find(p => p.id === productId);
      console.log(`  Product: ${product?.name || productId}`);
      console.log(`  Mappings: ${mappings.length}\n`);
    }

    // ========================================================================
    // PRICING STEPS
    // ========================================================================
    console.log('\n💰 PRICING STEPS');
    console.log('-'.repeat(70));
    
    for (const product of products) {
      const stepsSnap = await getDocs(
        collection(db, `products/${product.id}/steps`)
      );
      
      console.log(`\n  Product: ${product.name}`);
      console.log(`  Total Steps: ${stepsSnap.size}`);
      
      const factors = stepsSnap.docs.filter(doc => doc.data().stepType === 'factor');
      const operands = stepsSnap.docs.filter(doc => doc.data().stepType === 'operand');
      
      console.log(`    - Factors: ${factors.length}`);
      console.log(`    - Operands: ${operands.length}\n`);
      
      // Show first few steps
      const sortedSteps = stepsSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        .slice(0, 10);
      
      sortedSteps.forEach((step: any) => {
        if (step.stepType === 'factor') {
          console.log(`    ${step.order}. ${step.stepName || 'Unnamed'}`);
          if (step.table) console.log(`       Table: ${step.table}`);
        } else {
          console.log(`    ${step.order}. [${step.operand}]`);
        }
      });
      
      if (stepsSnap.size > 10) {
        console.log(`    ... and ${stepsSnap.size - 10} more steps`);
      }
      console.log('');
    }

    // ========================================================================
    // BUSINESS RULES
    // ========================================================================
    console.log('\n📜 BUSINESS RULES');
    console.log('-'.repeat(70));
    const rulesSnap = await getDocs(collection(db, 'rules'));
    console.log(`Total Rules: ${rulesSnap.size}\n`);
    
    // Group by type
    const rulesByType: Record<string, any[]> = {};
    rulesSnap.forEach(doc => {
      const data = doc.data();
      const type = data.ruleType || 'Other';
      if (!rulesByType[type]) {
        rulesByType[type] = [];
      }
      rulesByType[type].push({ id: doc.id, ...data });
    });
    
    for (const [type, rules] of Object.entries(rulesByType)) {
      console.log(`  ${type} Rules: ${rules.length}`);
      rules.forEach((rule: any) => {
        console.log(`    ✓ ${rule.name}`);
        console.log(`      Category: ${rule.ruleCategory || 'N/A'}`);
        console.log(`      Status: ${rule.status || 'N/A'}`);
      });
      console.log('');
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));
    console.log(`\n  Products: ${productsSnap.size}`);
    console.log(`  Forms: ${formsSnap.size}`);
    console.log(`  Form-Coverage Mappings: ${formCovSnap.size}`);
    console.log(`  Business Rules: ${rulesSnap.size}`);
    
    let totalCoverages = 0;
    let totalSteps = 0;
    for (const product of products) {
      const covSnap = await getDocs(collection(db, `products/${product.id}/coverages`));
      const stepsSnap = await getDocs(collection(db, `products/${product.id}/steps`));
      totalCoverages += covSnap.size;
      totalSteps += stepsSnap.size;
    }
    console.log(`  Coverages: ${totalCoverages}`);
    console.log(`  Pricing Steps: ${totalSteps}`);
    
    console.log('\n✅ Verification Complete!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error verifying data:', error);
    process.exit(1);
  }
}

verifyData();

