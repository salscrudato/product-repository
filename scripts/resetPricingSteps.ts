/**
 * Reset Pricing Steps Script
 *
 * This script clears all existing pricing steps and reloads the database
 * with a valid commercial property insurance pricing calculation.
 *
 * Usage:
 *   npm run reset:pricing
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
  addDoc
} from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✅ Loaded environment from .env.local\n');
} else {
  dotenv.config();
  console.log('⚠️  .env.local not found, using default .env\n');
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

// Validate configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Firebase configuration is incomplete. Please check your .env.local file.');
  process.exit(1);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// All US states
const ALL_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

/**
 * Commercial Property Insurance Pricing Formula
 * 
 * Premium = Base Rate × Building Value × Construction Factor × Protection Class Factor 
 *           × Territory Factor × Occupancy Factor + Deductible Credit
 * 
 * Example Calculation:
 * - Base Rate: $0.50 per $100 of building value
 * - Building Value: $1,000,000
 * - Construction Factor: 1.0 (Frame)
 * - Protection Class Factor: 0.85 (Class 3)
 * - Territory Factor: 1.15 (Urban)
 * - Occupancy Factor: 1.0 (Office)
 * - Deductible Credit: -$50
 * 
 * Result: ($0.50 × 10,000) × 1.0 × 0.85 × 1.15 × 1.0 - $50 = $4,887.50
 */

const pricingSteps = [
  // Step 1: Base Rate per $100
  {
    stepType: 'factor',
    stepName: 'Base Rate per $100',
    coverages: ['Building Coverage', 'Business Personal Property'],
    states: ALL_STATES,
    value: 0.50,
    type: 'Table',
    table: 'BaseRates',
    rounding: '2 Decimals',
    upstreamId: 'BASE_RATE',
    order: 0
  },
  
  // Step 2: Multiply
  {
    stepType: 'operand',
    operand: '*',
    coverages: ['Building Coverage', 'Business Personal Property'],
    states: ALL_STATES,
    order: 1
  },
  
  // Step 3: Building Value (in hundreds)
  {
    stepType: 'factor',
    stepName: 'Building Value (per $100)',
    coverages: ['Building Coverage', 'Business Personal Property'],
    states: ALL_STATES,
    value: 10000, // $1,000,000 / 100
    type: 'User Input',
    table: '',
    rounding: 'Whole Number',
    upstreamId: 'BUILDING_VALUE',
    order: 2
  },
  
  // Step 4: Multiply
  {
    stepType: 'operand',
    operand: '*',
    coverages: ['Building Coverage', 'Business Personal Property'],
    states: ALL_STATES,
    order: 3
  },
  
  // Step 5: Construction Type Factor
  {
    stepType: 'factor',
    stepName: 'Construction Type Factor',
    coverages: ['Building Coverage'],
    states: ALL_STATES,
    value: 1.0, // Frame construction
    type: 'Table',
    table: 'ConstructionType',
    rounding: '2 Decimals',
    upstreamId: 'CONSTRUCTION_TYPE',
    order: 4
  },
  
  // Step 6: Multiply
  {
    stepType: 'operand',
    operand: '*',
    coverages: ['Building Coverage'],
    states: ALL_STATES,
    order: 5
  },
  
  // Step 7: Protection Class Factor
  {
    stepType: 'factor',
    stepName: 'Protection Class Factor',
    coverages: ['Building Coverage', 'Business Personal Property'],
    states: ALL_STATES,
    value: 0.85, // ISO Protection Class 3
    type: 'Table',
    table: 'ProtectionClass',
    rounding: '2 Decimals',
    upstreamId: 'PROTECTION_CLASS',
    order: 6
  },
  
  // Step 8: Multiply
  {
    stepType: 'operand',
    operand: '*',
    coverages: ['Building Coverage', 'Business Personal Property'],
    states: ALL_STATES,
    order: 7
  },
  
  // Step 9: Territory Factor
  {
    stepType: 'factor',
    stepName: 'Territory Factor',
    coverages: ['Building Coverage', 'Business Personal Property'],
    states: ALL_STATES,
    value: 1.15, // Urban territory
    type: 'Table',
    table: 'Territory',
    rounding: '2 Decimals',
    upstreamId: 'TERRITORY',
    order: 8
  },
  
  // Step 10: Multiply
  {
    stepType: 'operand',
    operand: '*',
    coverages: ['Building Coverage', 'Business Personal Property'],
    states: ALL_STATES,
    order: 9
  },
  
  // Step 11: Occupancy Factor
  {
    stepType: 'factor',
    stepName: 'Occupancy Factor',
    coverages: ['Building Coverage', 'Business Personal Property'],
    states: ALL_STATES,
    value: 1.0, // Office occupancy
    type: 'Table',
    table: 'Occupancy',
    rounding: '2 Decimals',
    upstreamId: 'OCCUPANCY',
    order: 10
  },
  
  // Step 12: Subtract (for deductible credit)
  {
    stepType: 'operand',
    operand: '-',
    coverages: ['Building Coverage', 'Business Personal Property'],
    states: ALL_STATES,
    order: 11
  },
  
  // Step 13: Deductible Credit
  {
    stepType: 'factor',
    stepName: 'Deductible Credit',
    coverages: ['Building Coverage', 'Business Personal Property'],
    states: ALL_STATES,
    value: 50, // $50 credit for higher deductible
    type: 'Table',
    table: 'DeductibleCredits',
    rounding: 'Whole Number',
    upstreamId: 'DEDUCTIBLE_CREDIT',
    order: 12
  }
];

/**
 * Clear all pricing steps for a product
 */
async function clearPricingSteps(productId: string): Promise<void> {
  console.log(`\n🗑️  Clearing existing pricing steps for product: ${productId}`);
  
  const stepsRef = collection(db, `products/${productId}/steps`);
  const snapshot = await getDocs(stepsRef);
  
  console.log(`   Found ${snapshot.size} existing steps to delete`);
  
  const deletePromises = snapshot.docs.map(docSnapshot => 
    deleteDoc(doc(db, `products/${productId}/steps`, docSnapshot.id))
  );
  
  await Promise.all(deletePromises);
  console.log(`   ✅ Deleted ${snapshot.size} steps`);
}

/**
 * Load new pricing steps for a product
 */
async function loadPricingSteps(productId: string): Promise<void> {
  console.log(`\n📥 Loading new pricing steps for product: ${productId}`);
  
  const stepsRef = collection(db, `products/${productId}/steps`);
  
  for (const step of pricingSteps) {
    await addDoc(stepsRef, {
      ...step,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  console.log(`   ✅ Loaded ${pricingSteps.length} pricing steps`);
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting Pricing Steps Reset Script\n');
  console.log('=' .repeat(60));
  
  try {
    // Get all products
    const productsRef = collection(db, 'products');
    const productsSnapshot = await getDocs(productsRef);
    
    if (productsSnapshot.empty) {
      console.log('❌ No products found in database');
      return;
    }
    
    console.log(`\n📦 Found ${productsSnapshot.size} product(s) in database:\n`);
    
    productsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`   ${index + 1}. ${data.name} (ID: ${doc.id})`);
    });
    
    // Process each product
    for (const productDoc of productsSnapshot.docs) {
      const productData = productDoc.data();
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Processing: ${productData.name}`);
      console.log('='.repeat(60));
      
      await clearPricingSteps(productDoc.id);
      await loadPricingSteps(productDoc.id);
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ Pricing Steps Reset Complete!');
    console.log('='.repeat(60));
    
    console.log('\n📊 Summary:');
    console.log(`   - Products processed: ${productsSnapshot.size}`);
    console.log(`   - Steps per product: ${pricingSteps.length}`);
    console.log(`   - Total steps created: ${productsSnapshot.size * pricingSteps.length}`);
    
    console.log('\n💡 Expected Premium Calculation:');
    console.log('   Base Rate: $0.50 per $100');
    console.log('   Building Value: $1,000,000 (10,000 units of $100)');
    console.log('   Construction Factor: 1.0');
    console.log('   Protection Class Factor: 0.85');
    console.log('   Territory Factor: 1.15');
    console.log('   Occupancy Factor: 1.0');
    console.log('   Deductible Credit: -$50');
    console.log('   ');
    console.log('   Formula: ($0.50 × 10,000) × 1.0 × 0.85 × 1.15 × 1.0 - $50');
    console.log('   Result: $4,887.50');
    
    console.log('\n✨ You can now view the pricing page to see the new calculation!\n');
    
  } catch (error) {
    console.error('\n❌ Error during execution:', error);
    throw error;
  }
}

// Run the script
main()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

