/**
 * Comprehensive Insurance Product Data Seeding Script
 * 
 * This script:
 * 1. Clears all existing data from the database
 * 2. Seeds Commercial Property product with comprehensive data
 * 3. Seeds Commercial Auto product with comprehensive data
 * 
 * Products include:
 * - Product definitions with metadata
 * - Coverages and sub-coverages (hierarchical)
 * - Forms (ISO and proprietary) with form-coverage mappings
 * - Pricing steps with multi-dimensional rating tables
 * - Business rules (eligibility, underwriting, pricing)
 * - State availability
 * 
 * Run with: npm run seed:comprehensive
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
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
if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
  console.error('❌ Missing Firebase configuration!');
  console.error('Please ensure .env.local has all VITE_FIREBASE_* variables');
  process.exit(1);
}

console.log(`🔥 Firebase Project: ${firebaseConfig.projectId}\n`);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// US States
const ALL_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// State groups
const CAT_STATES = ['FL', 'LA', 'TX', 'SC', 'NC', 'GA', 'AL', 'MS'];
const EARTHQUAKE_STATES = ['CA', 'OR', 'WA', 'AK', 'NV', 'UT'];
const WIND_HAIL_STATES = ['TX', 'OK', 'KS', 'NE', 'SD', 'ND', 'MO', 'IA'];
const NO_FAULT_STATES = ['FL', 'HI', 'KS', 'KY', 'MA', 'MI', 'MN', 'NJ', 'NY', 'ND', 'PA', 'UT'];

interface SeedResult {
  productId: string;
  coverageIds: Record<string, string>;
  formIds: Record<string, string>;
  stepIds: string[];
  ruleIds: string[];
}

/**
 * Clear all data from the database
 */
async function clearDatabase(): Promise<void> {
  console.log('\n🗑️  CLEARING DATABASE...\n');
  
  const collections = [
    'products',
    'forms',
    'formCoverages',
    'rules',
    'tasks',
    'news',
    'dataDictionary',
    'businessRules',
    'pricingSteps'
  ];
  
  let totalDeleted = 0;
  
  for (const collectionName of collections) {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      
      if (snapshot.size > 0) {
        console.log(`  Deleting ${snapshot.size} documents from ${collectionName}...`);
        
        // Use batched deletes for better performance
        const batches: any[] = [];
        let currentBatch = writeBatch(db);
        let operationCount = 0;
        
        snapshot.docs.forEach((document) => {
          currentBatch.delete(document.ref);
          operationCount++;
          
          // Firestore batch limit is 500 operations
          if (operationCount === 500) {
            batches.push(currentBatch);
            currentBatch = writeBatch(db);
            operationCount = 0;
          }
        });
        
        // Add the last batch if it has operations
        if (operationCount > 0) {
          batches.push(currentBatch);
        }
        
        // Commit all batches
        for (const batch of batches) {
          await batch.commit();
        }
        
        totalDeleted += snapshot.size;
        console.log(`  ✅ Deleted ${snapshot.size} documents from ${collectionName}`);
      } else {
        console.log(`  ⏭️  ${collectionName} is already empty`);
      }
    } catch (error) {
      console.error(`  ❌ Error clearing ${collectionName}:`, error);
    }
  }
  
  // Also clear subcollections for products
  try {
    const productsSnapshot = await getDocs(collection(db, 'products'));
    for (const productDoc of productsSnapshot.docs) {
      const productId = productDoc.id;
      
      // Clear coverages subcollection
      const coveragesSnapshot = await getDocs(collection(db, `products/${productId}/coverages`));
      for (const coverageDoc of coveragesSnapshot.docs) {
        await deleteDoc(coverageDoc.ref);
        totalDeleted++;
      }
      
      // Clear steps subcollection
      const stepsSnapshot = await getDocs(collection(db, `products/${productId}/steps`));
      for (const stepDoc of stepsSnapshot.docs) {
        // Clear dimensions subcollection
        const dimensionsSnapshot = await getDocs(collection(db, `products/${productId}/steps/${stepDoc.id}/dimensions`));
        for (const dimDoc of dimensionsSnapshot.docs) {
          await deleteDoc(dimDoc.ref);
          totalDeleted++;
        }
        await deleteDoc(stepDoc.ref);
        totalDeleted++;
      }
    }
  } catch (error) {
    console.error('  ❌ Error clearing product subcollections:', error);
  }
  
  console.log(`\n✅ Database cleared! Total documents deleted: ${totalDeleted}\n`);
}

/**
 * Seed Commercial Property Product
 */
async function seedCommercialProperty(): Promise<SeedResult> {
  console.log('═'.repeat(70));
  console.log('🏢 SEEDING COMMERCIAL PROPERTY PRODUCT');
  console.log('═'.repeat(70) + '\n');

  const result: SeedResult = {
    productId: '',
    coverageIds: {},
    formIds: {},
    stepIds: [],
    ruleIds: []
  };

  // ============================================================================
  // 1. CREATE PRODUCT
  // ============================================================================
  console.log('📦 Creating Commercial Property Product...');
  
  const productRef = await addDoc(collection(db, 'products'), {
    name: 'Commercial Property Coverage',
    description: 'Comprehensive commercial property insurance covering buildings, business personal property, and loss of income',
    category: 'Property',
    productCode: 'CP-001',
    formNumber: 'CP 00 10',
    status: 'active',
    bureau: 'ISO',
    effectiveDate: '2024-01-01',
    availableStates: ALL_STATES,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    metadata: {
      lineOfBusiness: 'Commercial Property',
      targetMarket: 'Small to Mid-Size Commercial Businesses',
      minimumPremium: 500,
      maximumPremium: 1000000,
      riskType: 'Property',
      underwritingTier: 'Standard'
    }
  });

  result.productId = productRef.id;
  console.log(`✅ Product created: ${result.productId}\n`);

  // ============================================================================
  // 2. CREATE COVERAGES
  // ============================================================================
  console.log('🛡️  Creating Coverages...');

  const coverages = [
    {
      key: 'building',
      name: 'Building Coverage',
      description: 'Coverage for the building structure and permanently attached fixtures',
      category: 'base',
      coverageCode: 'CP-BLD',
      scopeOfCoverage: 'Direct physical loss or damage to covered building',
      limits: ['$100,000', '$250,000', '$500,000', '$1,000,000', '$2,500,000', '$5,000,000'],
      deductibles: ['$1,000', '$2,500', '$5,000', '$10,000', '$25,000'],
      basePremium: 1200,
      isOptional: false,
      states: ALL_STATES,
      perilsCovered: ['Fire', 'Lightning', 'Explosion', 'Windstorm', 'Hail', 'Smoke', 'Vandalism', 'Theft'],
      valuationMethod: 'RC',
      coinsurancePercentage: 80
    },
    {
      key: 'bpp',
      name: 'Business Personal Property',
      description: 'Coverage for business contents, equipment, inventory, and furniture',
      category: 'base',
      coverageCode: 'CP-BPP',
      scopeOfCoverage: 'Direct physical loss or damage to business personal property',
      limits: ['$50,000', '$100,000', '$250,000', '$500,000', '$1,000,000'],
      deductibles: ['$500', '$1,000', '$2,500', '$5,000', '$10,000'],
      basePremium: 800,
      isOptional: false,
      states: ALL_STATES,
      perilsCovered: ['Fire', 'Lightning', 'Explosion', 'Windstorm', 'Hail', 'Smoke', 'Vandalism', 'Theft'],
      valuationMethod: 'RC',
      coinsurancePercentage: 80
    },
    {
      key: 'businessIncome',
      name: 'Business Income Coverage',
      description: 'Coverage for loss of income due to covered property damage',
      category: 'optional',
      coverageCode: 'CP-BI',
      scopeOfCoverage: 'Loss of business income during period of restoration',
      limits: ['$25,000', '$50,000', '$100,000', '$250,000', '$500,000'],
      deductibles: ['72 hours', '168 hours (7 days)', '30 days'],
      basePremium: 450,
      isOptional: true,
      states: ALL_STATES,
      perilsCovered: ['Suspension of operations due to covered cause of loss'],
      waitingPeriod: 72,
      waitingPeriodUnit: 'hours'
    },
    {
      key: 'extraExpense',
      name: 'Extra Expense Coverage',
      description: 'Coverage for additional costs to continue operations after a loss',
      category: 'optional',
      coverageCode: 'CP-EE',
      scopeOfCoverage: 'Necessary extra expenses to avoid or minimize suspension of business',
      limits: ['$10,000', '$25,000', '$50,000', '$100,000'],
      deductibles: ['$500', '$1,000', '$2,500'],
      basePremium: 250,
      isOptional: true,
      states: ALL_STATES,
      perilsCovered: ['Extra costs due to covered cause of loss']
    },
    {
      key: 'equipmentBreakdown',
      name: 'Equipment Breakdown Coverage',
      description: 'Coverage for mechanical and electrical equipment breakdown',
      category: 'endorsement',
      coverageCode: 'CP-EB',
      scopeOfCoverage: 'Direct physical loss from breakdown of covered equipment',
      limits: ['$50,000', '$100,000', '$250,000', '$500,000'],
      deductibles: ['$1,000', '$2,500', '$5,000'],
      basePremium: 350,
      isOptional: true,
      states: ALL_STATES,
      perilsCovered: ['Mechanical breakdown', 'Electrical breakdown', 'Pressure system failure']
    },
    {
      key: 'ordinanceLaw',
      name: 'Ordinance or Law Coverage',
      description: 'Coverage for increased costs due to building code requirements',
      category: 'endorsement',
      coverageCode: 'CP-OL',
      scopeOfCoverage: 'Increased cost of construction due to enforcement of building codes',
      limits: ['$25,000', '$50,000', '$100,000', '$250,000'],
      deductibles: ['$1,000', '$2,500', '$5,000'],
      basePremium: 300,
      isOptional: true,
      states: ALL_STATES,
      perilsCovered: ['Enforcement of building codes and ordinances']
    }
  ];

  for (const coverage of coverages) {
    const { key, ...coverageData } = coverage;
    const coverageRef = await addDoc(
      collection(db, `products/${result.productId}/coverages`),
      {
        ...coverageData,
        productId: result.productId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
    );
    result.coverageIds[key] = coverageRef.id;
    console.log(`  ✓ ${coverage.name}`);
  }

  // ============================================================================
  // 3. CREATE SUB-COVERAGES
  // ============================================================================
  console.log('\n📋 Creating Sub-Coverages...');

  const subCoverages = [
    {
      key: 'buildingGlass',
      parentKey: 'building',
      name: 'Glass Coverage',
      description: 'Coverage for building glass breakage',
      coverageCode: 'CP-BLD-GL',
      limits: ['$5,000', '$10,000', '$25,000'],
      deductibles: ['$100', '$250', '$500'],
      basePremium: 75
    },
    {
      key: 'buildingSignage',
      parentKey: 'building',
      name: 'Outdoor Signs Coverage',
      description: 'Coverage for outdoor signs attached to building',
      coverageCode: 'CP-BLD-SG',
      limits: ['$2,500', '$5,000', '$10,000'],
      deductibles: ['$250', '$500'],
      basePremium: 50
    },
    {
      key: 'bppComputers',
      parentKey: 'bpp',
      name: 'Computer Equipment',
      description: 'Enhanced coverage for computer and electronic equipment',
      coverageCode: 'CP-BPP-CE',
      limits: ['$25,000', '$50,000', '$100,000'],
      deductibles: ['$500', '$1,000'],
      basePremium: 150
    },
    {
      key: 'bppValuablePapers',
      parentKey: 'bpp',
      name: 'Valuable Papers and Records',
      description: 'Coverage for cost to research and replace valuable papers',
      coverageCode: 'CP-BPP-VP',
      limits: ['$10,000', '$25,000', '$50,000'],
      deductibles: ['$500', '$1,000'],
      basePremium: 100
    }
  ];

  for (const subCov of subCoverages) {
    const { key, parentKey, ...subCovData } = subCov;
    const subCovRef = await addDoc(
      collection(db, `products/${result.productId}/coverages`),
      {
        ...subCovData,
        productId: result.productId,
        parentCoverageId: result.coverageIds[parentKey],
        category: 'optional',
        isOptional: true,
        states: ALL_STATES,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
    );
    result.coverageIds[key] = subCovRef.id;
    console.log(`  ✓ ${subCov.name} (sub-coverage of ${parentKey})`);
  }

  console.log(`\n✅ Created ${Object.keys(result.coverageIds).length} coverages\n`);

  // ============================================================================
  // 4. CREATE FORMS
  // ============================================================================
  console.log('📄 Creating Forms...');

  const forms = [
    {
      key: 'cp0010',
      formNumber: 'CP 00 10',
      formName: 'Building and Personal Property Coverage Form',
      formEditionDate: '10/12',
      type: 'ISO',
      category: 'Base Coverage Form',
      description: 'Standard ISO commercial property coverage form',
      states: ALL_STATES,
      coverageKeys: ['building', 'bpp']
    },
    {
      key: 'cp0030',
      formNumber: 'CP 00 30',
      formName: 'Business Income (and Extra Expense) Coverage Form',
      formEditionDate: '10/12',
      type: 'ISO',
      category: 'Coverage Form',
      description: 'Business income and extra expense coverage',
      states: ALL_STATES,
      coverageKeys: ['businessIncome', 'extraExpense']
    },
    {
      key: 'cp0417',
      formNumber: 'CP 04 17',
      formName: 'Electronic Data Processing Equipment Coverage',
      formEditionDate: '10/12',
      type: 'ISO',
      category: 'Endorsement',
      description: 'Enhanced coverage for computer equipment',
      states: ALL_STATES,
      coverageKeys: ['bppComputers']
    },
    {
      key: 'cp1030',
      formNumber: 'CP 10 30',
      formName: 'Causes of Loss - Special Form',
      formEditionDate: '10/12',
      type: 'ISO',
      category: 'Causes of Loss Form',
      description: 'All-risk coverage form',
      states: ALL_STATES,
      coverageKeys: ['building', 'bpp']
    },
    {
      key: 'cp1032',
      formNumber: 'CP 10 32',
      formName: 'Causes of Loss - Earthquake Form',
      formEditionDate: '10/12',
      type: 'ISO',
      category: 'Causes of Loss Form',
      description: 'Earthquake coverage',
      states: EARTHQUAKE_STATES,
      coverageKeys: ['building', 'bpp']
    },
    {
      key: 'cp0440',
      formNumber: 'CP 04 40',
      formName: 'Ordinance or Law Coverage',
      formEditionDate: '10/12',
      type: 'ISO',
      category: 'Endorsement',
      description: 'Coverage for increased costs due to building codes',
      states: ALL_STATES,
      coverageKeys: ['ordinanceLaw']
    }
  ];

  for (const form of forms) {
    const { key, coverageKeys, ...formData } = form;
    const formRef = await addDoc(collection(db, 'forms'), {
      ...formData,
      productId: result.productId,
      isActive: true,
      effectiveDate: '2024-01-01',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    result.formIds[key] = formRef.id;

    // Create form-coverage mappings
    for (const covKey of coverageKeys) {
      if (result.coverageIds[covKey]) {
        await addDoc(collection(db, 'formCoverages'), {
          formId: formRef.id,
          coverageId: result.coverageIds[covKey],
          productId: result.productId,
          createdAt: Timestamp.now()
        });
      }
    }

    console.log(`  ✓ ${form.formNumber} - ${form.formName}`);
  }

  console.log(`\n✅ Created ${Object.keys(result.formIds).length} forms\n`);

  // ============================================================================
  // 5. CREATE PRICING STEPS
  // ============================================================================
  console.log('💰 Creating Pricing Steps...');

  const pricingSteps = [
    // Building Coverage Pricing
    { stepType: 'factor', stepName: 'Building Base Rate', coverages: ['Building Coverage'], table: 'BuildingBaseRate', states: ALL_STATES, value: 0.15, rounding: 'none', order: 0 },
    { stepType: 'operand', operand: '*', coverages: ['Building Coverage'], states: ALL_STATES, order: 1 },
    { stepType: 'factor', stepName: 'Construction Type Factor', coverages: ['Building Coverage'], table: 'ConstructionType', states: ALL_STATES, value: 1.0, rounding: 'none', order: 2 },
    { stepType: 'operand', operand: '*', coverages: ['Building Coverage'], states: ALL_STATES, order: 3 },
    { stepType: 'factor', stepName: 'Protection Class Factor', coverages: ['Building Coverage'], table: 'ProtectionClass', states: ALL_STATES, value: 1.0, rounding: 'none', order: 4 },
    { stepType: 'operand', operand: '*', coverages: ['Building Coverage'], states: ALL_STATES, order: 5 },
    { stepType: 'factor', stepName: 'Territory Factor', coverages: ['Building Coverage', 'Business Personal Property'], table: 'Territory', states: ALL_STATES, value: 1.0, rounding: 'none', order: 6 },
    { stepType: 'operand', operand: '*', coverages: ['Building Coverage', 'Business Personal Property'], states: ALL_STATES, order: 7 },

    // BPP Pricing
    { stepType: 'factor', stepName: 'BPP Base Rate', coverages: ['Business Personal Property'], table: 'BPPBaseRate', states: ALL_STATES, value: 0.20, rounding: 'none', order: 8 },
    { stepType: 'operand', operand: '*', coverages: ['Business Personal Property'], states: ALL_STATES, order: 9 },
    { stepType: 'factor', stepName: 'Occupancy Factor', coverages: ['Business Personal Property'], table: 'Occupancy', states: ALL_STATES, value: 1.0, rounding: 'none', order: 10 },
    { stepType: 'operand', operand: '+', coverages: ['Building Coverage', 'Business Personal Property'], states: ALL_STATES, order: 11 },

    // Catastrophe Surcharges
    { stepType: 'factor', stepName: 'Hurricane Surcharge', coverages: ['Building Coverage', 'Business Personal Property'], table: '', states: CAT_STATES, value: 1.25, rounding: 'none', order: 12 },
    { stepType: 'operand', operand: '*', coverages: ['Building Coverage', 'Business Personal Property'], states: CAT_STATES, order: 13 },
    { stepType: 'factor', stepName: 'Earthquake Surcharge', coverages: ['Building Coverage', 'Business Personal Property'], table: '', states: EARTHQUAKE_STATES, value: 1.35, rounding: 'none', order: 14 },
    { stepType: 'operand', operand: '*', coverages: ['Building Coverage', 'Business Personal Property'], states: EARTHQUAKE_STATES, order: 15 },

    // Deductible Credits
    { stepType: 'factor', stepName: 'Deductible Credit', coverages: ['Building Coverage', 'Business Personal Property'], table: 'DeductibleCredit', states: ALL_STATES, value: 0.90, rounding: 'none', order: 16 },
    { stepType: 'operand', operand: '*', coverages: ['Building Coverage', 'Business Personal Property'], states: ALL_STATES, order: 17 },
    { stepType: 'factor', stepName: 'Final Premium', coverages: ['Building Coverage', 'Business Personal Property'], table: '', states: ALL_STATES, value: 1.0, rounding: 'nearest_dollar', order: 18 }
  ];

  for (const step of pricingSteps) {
    const stepRef = await addDoc(
      collection(db, `products/${result.productId}/steps`),
      {
        ...step,
        productId: result.productId,
        createdAt: Timestamp.now()
      }
    );
    result.stepIds.push(stepRef.id);
  }

  console.log(`  ✓ Created ${result.stepIds.length} pricing steps`);

  // ============================================================================
  // 6. CREATE PRICING TABLE DIMENSIONS
  // ============================================================================
  console.log('\n📊 Creating Pricing Table Dimensions...');

  const tables = [
    {
      stepName: 'Building Base Rate',
      dimensions: [
        { name: 'Construction Type', values: 'Frame;Joisted Masonry;Non-Combustible;Masonry Non-Combustible;Modified Fire Resistive;Fire Resistive', technicalCode: 'CONST_TYPE' },
        { name: 'Building Square Footage', values: '0-5000;5001-10000;10001-25000;25001-50000;50001-100000;100001+', technicalCode: 'BLDG_SQ_FT' }
      ]
    },
    {
      stepName: 'Protection Class',
      dimensions: [
        { name: 'ISO Protection Class', values: '1;2;3;4;5;6;7;8;9;10', technicalCode: 'PROT_CLASS' }
      ]
    },
    {
      stepName: 'Territory',
      dimensions: [
        { name: 'Territory Code', values: '1;2;3;4;5;6;7;8;9;10', technicalCode: 'TERRITORY' }
      ]
    },
    {
      stepName: 'Occupancy',
      dimensions: [
        { name: 'Occupancy Class', values: 'Office;Retail;Restaurant;Manufacturing - Light;Manufacturing - Heavy;Warehouse;Apartment;Hotel/Motel', technicalCode: 'OCCUPANCY' }
      ]
    },
    {
      stepName: 'Deductible Credit',
      dimensions: [
        { name: 'Deductible Amount', values: '$500;$1,000;$2,500;$5,000;$10,000;$25,000', technicalCode: 'DEDUCTIBLE' }
      ]
    }
  ];

  for (const table of tables) {
    const stepSnapshot = await getDocs(collection(db, `products/${result.productId}/steps`));
    const step = stepSnapshot.docs.find(doc => doc.data().stepName === table.stepName);

    if (step) {
      for (const dimension of table.dimensions) {
        await addDoc(
          collection(db, `products/${result.productId}/steps/${step.id}/dimensions`),
          { ...dimension, createdAt: Timestamp.now() }
        );
      }
      console.log(`  ✓ ${table.stepName}: ${table.dimensions.length} dimension(s)`);
    }
  }

  console.log(`\n✅ Pricing structure complete\n`);

  // ============================================================================
  // 7. CREATE BUSINESS RULES
  // ============================================================================
  console.log('📜 Creating Business Rules...');

  const businessRules = [
    { name: 'Minimum Building Value', productId: result.productId, ruleType: 'Eligibility', ruleCategory: 'Underwriting', condition: 'Building value must be at least $50,000', outcome: 'Decline if building value < $50,000', reference: 'Underwriting Guidelines Section 3.1', proprietary: true, status: 'Active' },
    { name: 'Maximum Building Age - Frame Construction', productId: result.productId, ruleType: 'Eligibility', ruleCategory: 'Underwriting', condition: 'Frame construction buildings must be less than 50 years old', outcome: 'Refer to underwriting if frame building > 50 years', reference: 'Underwriting Guidelines Section 3.2', proprietary: true, status: 'Active' },
    { name: 'Sprinkler System Discount', productId: result.productId, ruleType: 'Pricing', ruleCategory: 'Discount', condition: 'Building has automatic sprinkler system covering 100% of building', outcome: 'Apply 15% discount to building premium', reference: 'Rating Manual Section 5.4', proprietary: false, status: 'Active' },
    { name: 'Central Station Alarm Discount', productId: result.productId, ruleType: 'Pricing', ruleCategory: 'Discount', condition: 'Building has central station burglar and fire alarm', outcome: 'Apply 10% discount to building and BPP premium', reference: 'Rating Manual Section 5.5', proprietary: false, status: 'Active' },
    { name: 'Coastal Wind Restriction', productId: result.productId, ruleType: 'Coverage', ruleCategory: 'Restriction', condition: 'Property located within 1 mile of coast in FL, SC, NC, GA, AL, MS, LA, TX', outcome: 'Wind/Hail coverage requires separate wind deductible of 2% or 5%', reference: 'Coastal Wind Guidelines', proprietary: true, status: 'Active' },
    { name: 'Earthquake Deductible Requirement', productId: result.productId, ruleType: 'Coverage', ruleCategory: 'Requirement', condition: 'Earthquake coverage in CA, OR, WA, AK, NV, UT', outcome: 'Minimum earthquake deductible of 10% applies', reference: 'Earthquake Coverage Guidelines', proprietary: false, status: 'Active' },
    { name: 'Vacant Building Restriction', productId: result.productId, ruleType: 'Eligibility', ruleCategory: 'Underwriting', condition: 'Building has been vacant for more than 60 consecutive days', outcome: 'Decline coverage or apply vacant building endorsement with 85% coinsurance', reference: 'Underwriting Guidelines Section 4.1', proprietary: true, status: 'Active' },
    { name: 'Coinsurance Requirement', productId: result.productId, ruleType: 'Coverage', ruleCategory: 'Requirement', condition: 'All building coverage requires coinsurance clause', outcome: 'Apply 80%, 90%, or 100% coinsurance clause', reference: 'ISO CP 00 10 Form', proprietary: false, status: 'Active' },
    { name: 'Business Income Waiting Period', productId: result.productId, ruleType: 'Coverage', ruleCategory: 'Requirement', condition: 'Business Income coverage selected', outcome: 'Minimum 72-hour waiting period applies before coverage begins', reference: 'ISO CP 00 30 Form', proprietary: false, status: 'Active' },
    { name: 'Equipment Breakdown Inspection', productId: result.productId, ruleType: 'Coverage', ruleCategory: 'Requirement', condition: 'Equipment Breakdown coverage exceeds $250,000', outcome: 'Annual inspection by qualified engineer required', reference: 'Equipment Breakdown Guidelines', proprietary: true, status: 'Active' },
    { name: 'Ordinance or Law Limit', productId: result.productId, ruleType: 'Coverage', ruleCategory: 'Limitation', condition: 'Ordinance or Law coverage selected', outcome: 'Maximum limit is 25% of building coverage limit', reference: 'ISO CP 04 40 Endorsement', proprietary: false, status: 'Active' },
    { name: 'High-Value Property Inspection', productId: result.productId, ruleType: 'Underwriting', ruleCategory: 'Requirement', condition: 'Total insured value exceeds $5,000,000', outcome: 'Physical inspection and detailed risk assessment required', reference: 'Underwriting Guidelines Section 2.3', proprietary: true, status: 'Active' }
  ];

  for (const rule of businessRules) {
    const ruleRef = await addDoc(collection(db, 'rules'), {
      ...rule,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    result.ruleIds.push(ruleRef.id);
    console.log(`  ✓ ${rule.name}`);
  }

  console.log(`\n✅ Created ${result.ruleIds.length} business rules\n`);

  return result;
}

/**
 * Seed Commercial Auto Product
 */
async function seedCommercialAuto(): Promise<SeedResult> {
  console.log('═'.repeat(70));
  console.log('🚗 SEEDING COMMERCIAL AUTO PRODUCT');
  console.log('═'.repeat(70) + '\n');

  const result: SeedResult = {
    productId: '',
    coverageIds: {},
    formIds: {},
    stepIds: [],
    ruleIds: []
  };

  // ============================================================================
  // 1. CREATE PRODUCT
  // ============================================================================
  console.log('📦 Creating Commercial Auto Product...');

  const productRef = await addDoc(collection(db, 'products'), {
    name: 'Commercial Auto Coverage',
    description: 'Comprehensive commercial automobile insurance for business vehicles including liability, physical damage, and medical payments',
    category: 'Auto',
    productCode: 'CA-001',
    formNumber: 'CA 00 01',
    status: 'active',
    bureau: 'ISO',
    effectiveDate: '2024-01-01',
    availableStates: ALL_STATES,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    metadata: {
      lineOfBusiness: 'Commercial Auto',
      targetMarket: 'Small to Mid-Size Commercial Fleets',
      minimumPremium: 750,
      maximumPremium: 500000,
      riskType: 'Auto',
      underwritingTier: 'Standard'
    }
  });

  result.productId = productRef.id;
  console.log(`✅ Product created: ${result.productId}\n`);

  // ============================================================================
  // 2. CREATE COVERAGES
  // ============================================================================
  console.log('🛡️  Creating Coverages...');

  const coverages = [
    {
      key: 'liability',
      name: 'Auto Liability Coverage',
      description: 'Bodily injury and property damage liability for covered autos',
      category: 'base',
      coverageCode: 'CA-LIAB',
      scopeOfCoverage: 'Bodily injury or property damage caused by accident and resulting from ownership, maintenance, or use of covered auto',
      limits: ['$100,000/$300,000', '$250,000/$500,000', '$500,000/$1,000,000', '$1,000,000 CSL'],
      deductibles: ['None'],
      basePremium: 1500,
      isOptional: false,
      states: ALL_STATES,
      perilsCovered: ['Bodily Injury', 'Property Damage'],
      coverageTrigger: 'occurrence'
    },
    {
      key: 'physicalDamage',
      name: 'Physical Damage Coverage',
      description: 'Comprehensive and collision coverage for covered autos',
      category: 'base',
      coverageCode: 'CA-PD',
      scopeOfCoverage: 'Direct and accidental loss to covered auto',
      limits: ['Actual Cash Value', 'Stated Amount'],
      deductibles: ['$250', '$500', '$1,000', '$2,500', '$5,000'],
      basePremium: 1200,
      isOptional: true,
      states: ALL_STATES,
      perilsCovered: ['Collision', 'Comprehensive', 'Fire', 'Theft', 'Vandalism'],
      valuationMethod: 'ACV'
    },
    {
      key: 'medicalPayments',
      name: 'Medical Payments Coverage',
      description: 'Medical expenses for injuries sustained in auto accident',
      category: 'optional',
      coverageCode: 'CA-MED',
      scopeOfCoverage: 'Medical expenses for bodily injury caused by accident',
      limits: ['$1,000', '$2,000', '$5,000', '$10,000'],
      deductibles: ['None'],
      basePremium: 150,
      isOptional: true,
      states: ALL_STATES,
      perilsCovered: ['Medical expenses from auto accident']
    },
    {
      key: 'uninsuredMotorist',
      name: 'Uninsured Motorist Coverage',
      description: 'Coverage for injuries caused by uninsured or underinsured motorists',
      category: 'optional',
      coverageCode: 'CA-UM',
      scopeOfCoverage: 'Bodily injury caused by uninsured or underinsured motorist',
      limits: ['$25,000/$50,000', '$50,000/$100,000', '$100,000/$300,000'],
      deductibles: ['None'],
      basePremium: 200,
      isOptional: true,
      states: ALL_STATES,
      perilsCovered: ['Uninsured motorist bodily injury']
    },
    {
      key: 'pip',
      name: 'Personal Injury Protection (PIP)',
      description: 'No-fault medical and wage loss coverage',
      category: 'optional',
      coverageCode: 'CA-PIP',
      scopeOfCoverage: 'Medical expenses, lost wages, and other expenses regardless of fault',
      limits: ['$10,000', '$25,000', '$50,000'],
      deductibles: ['None', '$250', '$500'],
      basePremium: 300,
      isOptional: true,
      states: NO_FAULT_STATES,
      perilsCovered: ['Medical expenses', 'Lost wages', 'Funeral expenses']
    },
    {
      key: 'hiredAuto',
      name: 'Hired Auto Liability',
      description: 'Liability coverage for hired or rented vehicles',
      category: 'endorsement',
      coverageCode: 'CA-HIRED',
      scopeOfCoverage: 'Liability for hired or rented autos',
      limits: ['$100,000/$300,000', '$500,000/$1,000,000', '$1,000,000 CSL'],
      deductibles: ['None'],
      basePremium: 400,
      isOptional: true,
      states: ALL_STATES,
      perilsCovered: ['Bodily Injury', 'Property Damage']
    },
    {
      key: 'nonOwnedAuto',
      name: 'Non-Owned Auto Liability',
      description: 'Liability coverage for employee-owned vehicles used for business',
      category: 'endorsement',
      coverageCode: 'CA-NON',
      scopeOfCoverage: 'Liability for non-owned autos used in business',
      limits: ['$100,000/$300,000', '$500,000/$1,000,000', '$1,000,000 CSL'],
      deductibles: ['None'],
      basePremium: 350,
      isOptional: true,
      states: ALL_STATES,
      perilsCovered: ['Bodily Injury', 'Property Damage']
    }
  ];

  for (const coverage of coverages) {
    const { key, ...coverageData } = coverage;
    const coverageRef = await addDoc(
      collection(db, `products/${result.productId}/coverages`),
      {
        ...coverageData,
        productId: result.productId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
    );
    result.coverageIds[key] = coverageRef.id;
    console.log(`  ✓ ${coverage.name}`);
  }

  // ============================================================================
  // 3. CREATE SUB-COVERAGES
  // ============================================================================
  console.log('\n📋 Creating Sub-Coverages...');

  const subCoverages = [
    {
      key: 'liabilityBI',
      parentKey: 'liability',
      name: 'Bodily Injury Liability',
      description: 'Coverage for bodily injury to others',
      coverageCode: 'CA-LIAB-BI',
      limits: ['$100,000 per person', '$300,000 per accident'],
      deductibles: ['None'],
      basePremium: 900
    },
    {
      key: 'liabilityPD',
      parentKey: 'liability',
      name: 'Property Damage Liability',
      description: 'Coverage for damage to property of others',
      coverageCode: 'CA-LIAB-PD',
      limits: ['$50,000', '$100,000', '$250,000'],
      deductibles: ['None'],
      basePremium: 600
    },
    {
      key: 'comprehensive',
      parentKey: 'physicalDamage',
      name: 'Comprehensive Coverage',
      description: 'Coverage for non-collision losses',
      coverageCode: 'CA-PD-COMP',
      limits: ['Actual Cash Value'],
      deductibles: ['$250', '$500', '$1,000'],
      basePremium: 500
    },
    {
      key: 'collision',
      parentKey: 'physicalDamage',
      name: 'Collision Coverage',
      description: 'Coverage for collision losses',
      coverageCode: 'CA-PD-COLL',
      limits: ['Actual Cash Value'],
      deductibles: ['$500', '$1,000', '$2,500'],
      basePremium: 700
    }
  ];

  for (const subCov of subCoverages) {
    const { key, parentKey, ...subCovData } = subCov;
    const subCovRef = await addDoc(
      collection(db, `products/${result.productId}/coverages`),
      {
        ...subCovData,
        productId: result.productId,
        parentCoverageId: result.coverageIds[parentKey],
        category: 'optional',
        isOptional: true,
        states: ALL_STATES,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
    );
    result.coverageIds[key] = subCovRef.id;
    console.log(`  ✓ ${subCov.name} (sub-coverage of ${parentKey})`);
  }

  console.log(`\n✅ Created ${Object.keys(result.coverageIds).length} coverages\n`);

  // ============================================================================
  // 4. CREATE FORMS
  // ============================================================================
  console.log('📄 Creating Forms...');

  const forms = [
    {
      key: 'ca0001',
      formNumber: 'CA 00 01',
      formName: 'Business Auto Coverage Form',
      formEditionDate: '10/13',
      type: 'ISO',
      category: 'Base Coverage Form',
      description: 'Standard ISO commercial auto coverage form',
      states: ALL_STATES,
      coverageKeys: ['liability', 'physicalDamage', 'medicalPayments']
    },
    {
      key: 'ca0005',
      formNumber: 'CA 00 05',
      formName: 'Business Auto Physical Damage Coverage Form',
      formEditionDate: '10/13',
      type: 'ISO',
      category: 'Coverage Form',
      description: 'Physical damage coverage for business autos',
      states: ALL_STATES,
      coverageKeys: ['physicalDamage', 'comprehensive', 'collision']
    },
    {
      key: 'ca9948',
      formNumber: 'CA 99 48',
      formName: 'Hired Auto Physical Damage Coverage',
      formEditionDate: '10/13',
      type: 'ISO',
      category: 'Endorsement',
      description: 'Physical damage coverage for hired autos',
      states: ALL_STATES,
      coverageKeys: ['hiredAuto']
    },
    {
      key: 'ca2048',
      formNumber: 'CA 20 48',
      formName: 'Designated Insured',
      formEditionDate: '10/13',
      type: 'ISO',
      category: 'Endorsement',
      description: 'Adds additional designated insureds',
      states: ALL_STATES,
      coverageKeys: ['liability']
    },
    {
      key: 'ca0320',
      formNumber: 'CA 03 20',
      formName: 'Personal Injury Protection Coverage',
      formEditionDate: '10/13',
      type: 'ISO',
      category: 'Coverage Form',
      description: 'PIP coverage for no-fault states',
      states: NO_FAULT_STATES,
      coverageKeys: ['pip']
    }
  ];

  for (const form of forms) {
    const { key, coverageKeys, ...formData } = form;
    const formRef = await addDoc(collection(db, 'forms'), {
      ...formData,
      productId: result.productId,
      isActive: true,
      effectiveDate: '2024-01-01',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    result.formIds[key] = formRef.id;

    // Create form-coverage mappings
    for (const covKey of coverageKeys) {
      if (result.coverageIds[covKey]) {
        await addDoc(collection(db, 'formCoverages'), {
          formId: formRef.id,
          coverageId: result.coverageIds[covKey],
          productId: result.productId,
          createdAt: Timestamp.now()
        });
      }
    }

    console.log(`  ✓ ${form.formNumber} - ${form.formName}`);
  }

  console.log(`\n✅ Created ${Object.keys(result.formIds).length} forms\n`);

  // ============================================================================
  // 5. CREATE PRICING STEPS
  // ============================================================================
  console.log('💰 Creating Pricing Steps...');

  const pricingSteps = [
    // Liability Pricing
    { stepType: 'factor', stepName: 'Liability Base Rate', coverages: ['Auto Liability Coverage'], table: 'LiabilityBaseRate', states: ALL_STATES, value: 0.85, rounding: 'none', order: 0 },
    { stepType: 'operand', operand: '*', coverages: ['Auto Liability Coverage'], states: ALL_STATES, order: 1 },
    { stepType: 'factor', stepName: 'Vehicle Class Factor', coverages: ['Auto Liability Coverage'], table: 'VehicleClass', states: ALL_STATES, value: 1.0, rounding: 'none', order: 2 },
    { stepType: 'operand', operand: '*', coverages: ['Auto Liability Coverage'], states: ALL_STATES, order: 3 },
    { stepType: 'factor', stepName: 'Territory Factor', coverages: ['Auto Liability Coverage', 'Physical Damage Coverage'], table: 'Territory', states: ALL_STATES, value: 1.0, rounding: 'none', order: 4 },
    { stepType: 'operand', operand: '*', coverages: ['Auto Liability Coverage', 'Physical Damage Coverage'], states: ALL_STATES, order: 5 },
    { stepType: 'factor', stepName: 'Driver Experience Factor', coverages: ['Auto Liability Coverage'], table: 'DriverExperience', states: ALL_STATES, value: 1.0, rounding: 'none', order: 6 },
    { stepType: 'operand', operand: '*', coverages: ['Auto Liability Coverage'], states: ALL_STATES, order: 7 },

    // Physical Damage Pricing
    { stepType: 'factor', stepName: 'Physical Damage Base Rate', coverages: ['Physical Damage Coverage'], table: 'PhysicalDamageRate', states: ALL_STATES, value: 0.65, rounding: 'none', order: 8 },
    { stepType: 'operand', operand: '*', coverages: ['Physical Damage Coverage'], states: ALL_STATES, order: 9 },
    { stepType: 'factor', stepName: 'Vehicle Age Factor', coverages: ['Physical Damage Coverage'], table: 'VehicleAge', states: ALL_STATES, value: 1.0, rounding: 'none', order: 10 },
    { stepType: 'operand', operand: '+', coverages: ['Auto Liability Coverage', 'Physical Damage Coverage'], states: ALL_STATES, order: 11 },

    // Deductible Credits
    { stepType: 'factor', stepName: 'Deductible Credit', coverages: ['Physical Damage Coverage'], table: 'DeductibleCredit', states: ALL_STATES, value: 0.85, rounding: 'none', order: 12 },
    { stepType: 'operand', operand: '*', coverages: ['Physical Damage Coverage'], states: ALL_STATES, order: 13 },
    { stepType: 'factor', stepName: 'Final Premium', coverages: ['Auto Liability Coverage', 'Physical Damage Coverage'], table: '', states: ALL_STATES, value: 1.0, rounding: 'nearest_dollar', order: 14 }
  ];

  for (const step of pricingSteps) {
    const stepRef = await addDoc(
      collection(db, `products/${result.productId}/steps`),
      {
        ...step,
        productId: result.productId,
        createdAt: Timestamp.now()
      }
    );
    result.stepIds.push(stepRef.id);
  }

  console.log(`  ✓ Created ${result.stepIds.length} pricing steps`);

  console.log(`\n✅ Pricing structure complete\n`);

  // ============================================================================
  // 6. CREATE BUSINESS RULES
  // ============================================================================
  console.log('📜 Creating Business Rules...');

  const businessRules = [
    { name: 'Minimum Liability Limits', productId: result.productId, ruleType: 'Eligibility', ruleCategory: 'Underwriting', condition: 'Minimum liability limits of $100,000/$300,000 required', outcome: 'Decline if limits below minimum', reference: 'Underwriting Guidelines Section 2.1', proprietary: true, status: 'Active' },
    { name: 'Driver Age Restriction', productId: result.productId, ruleType: 'Eligibility', ruleCategory: 'Underwriting', condition: 'All drivers must be at least 21 years old', outcome: 'Refer to underwriting if driver under 21', reference: 'Underwriting Guidelines Section 2.3', proprietary: true, status: 'Active' },
    { name: 'Fleet Size Discount', productId: result.productId, ruleType: 'Pricing', ruleCategory: 'Discount', condition: 'Fleet of 5 or more vehicles', outcome: 'Apply 10% fleet discount', reference: 'Rating Manual Section 4.2', proprietary: false, status: 'Active' },
    { name: 'Safety Equipment Discount', productId: result.productId, ruleType: 'Pricing', ruleCategory: 'Discount', condition: 'Vehicle equipped with anti-lock brakes and airbags', outcome: 'Apply 5% safety discount', reference: 'Rating Manual Section 4.5', proprietary: false, status: 'Active' },
    { name: 'Clean Driving Record Discount', productId: result.productId, ruleType: 'Pricing', ruleCategory: 'Discount', condition: 'No accidents or violations in past 3 years', outcome: 'Apply 15% safe driver discount', reference: 'Rating Manual Section 4.7', proprietary: true, status: 'Active' },
    { name: 'High-Risk Vehicle Surcharge', productId: result.productId, ruleType: 'Pricing', ruleCategory: 'Surcharge', condition: 'Vehicle used for hazardous operations (towing, dump truck, etc.)', outcome: 'Apply 25% surcharge', reference: 'Rating Manual Section 5.3', proprietary: true, status: 'Active' },
    { name: 'PIP Requirement - No Fault States', productId: result.productId, ruleType: 'Coverage', ruleCategory: 'Requirement', condition: 'Vehicle garaged in no-fault state', outcome: 'PIP coverage required per state minimums', reference: 'State Regulatory Requirements', proprietary: false, status: 'Active' },
    { name: 'Uninsured Motorist Requirement', productId: result.productId, ruleType: 'Coverage', ruleCategory: 'Requirement', condition: 'Certain states require UM/UIM coverage', outcome: 'UM/UIM coverage required unless rejected in writing', reference: 'State Regulatory Requirements', proprietary: false, status: 'Active' },
    { name: 'Vehicle Inspection Requirement', productId: result.productId, ruleType: 'Underwriting', ruleCategory: 'Requirement', condition: 'Fleet exceeds 10 vehicles or high-value vehicles', outcome: 'Annual vehicle inspection required', reference: 'Underwriting Guidelines Section 3.4', proprietary: true, status: 'Active' },
    { name: 'Driver MVR Review', productId: result.productId, ruleType: 'Underwriting', ruleCategory: 'Requirement', condition: 'All drivers must have acceptable MVR', outcome: 'Decline if driver has DUI or 3+ violations in 3 years', reference: 'Underwriting Guidelines Section 2.5', proprietary: true, status: 'Active' },
    { name: 'Hired Auto Limit Restriction', productId: result.productId, ruleType: 'Coverage', ruleCategory: 'Limitation', condition: 'Hired auto coverage selected', outcome: 'Hired auto limits cannot exceed primary liability limits', reference: 'ISO CA 00 01 Form', proprietary: false, status: 'Active' },
    { name: 'Physical Damage Deductible Minimum', productId: result.productId, ruleType: 'Coverage', ruleCategory: 'Requirement', condition: 'Physical damage coverage selected', outcome: 'Minimum deductible of $250 for comprehensive, $500 for collision', reference: 'Underwriting Guidelines Section 4.1', proprietary: true, status: 'Active' }
  ];

  for (const rule of businessRules) {
    const ruleRef = await addDoc(collection(db, 'rules'), {
      ...rule,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    result.ruleIds.push(ruleRef.id);
    console.log(`  ✓ ${rule.name}`);
  }

  console.log(`\n✅ Created ${result.ruleIds.length} business rules\n`);

  return result;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('\n' + '═'.repeat(70));
    console.log('🚀 COMPREHENSIVE INSURANCE DATA SEEDING');
    console.log('═'.repeat(70));

    const startTime = Date.now();

    // Step 1: Clear database
    await clearDatabase();

    // Step 2: Seed Commercial Property
    const cpResult = await seedCommercialProperty();

    // Step 3: Seed Commercial Auto
    const caResult = await seedCommercialAuto();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    console.log('\n' + '═'.repeat(70));
    console.log('✨ DATA SEEDING COMPLETE!');
    console.log('═'.repeat(70));

    console.log('\n📊 SUMMARY STATISTICS\n');

    console.log('🏢 COMMERCIAL PROPERTY PRODUCT');
    console.log('─'.repeat(70));
    console.log(`   Product ID: ${cpResult.productId}`);
    console.log(`   Coverages: ${Object.keys(cpResult.coverageIds).length} total`);
    console.log(`     - Base Coverages: 2 (Building, Business Personal Property)`);
    console.log(`     - Optional Coverages: 2 (Business Income, Extra Expense)`);
    console.log(`     - Endorsements: 2 (Equipment Breakdown, Ordinance/Law)`);
    console.log(`     - Sub-Coverages: 4`);
    console.log(`   Forms: ${Object.keys(cpResult.formIds).length} ISO forms`);
    console.log(`   Pricing Steps: ${cpResult.stepIds.length} steps`);
    console.log(`   Business Rules: ${cpResult.ruleIds.length} rules`);
    console.log(`   States: ${ALL_STATES.length} (all US states)`);

    console.log('\n🚗 COMMERCIAL AUTO PRODUCT');
    console.log('─'.repeat(70));
    console.log(`   Product ID: ${caResult.productId}`);
    console.log(`   Coverages: ${Object.keys(caResult.coverageIds).length} total`);
    console.log(`     - Base Coverages: 2 (Auto Liability, Physical Damage)`);
    console.log(`     - Optional Coverages: 3 (Medical Payments, UM, PIP)`);
    console.log(`     - Endorsements: 2 (Hired Auto, Non-Owned Auto)`);
    console.log(`     - Sub-Coverages: 4`);
    console.log(`   Forms: ${Object.keys(caResult.formIds).length} ISO forms`);
    console.log(`   Pricing Steps: ${caResult.stepIds.length} steps`);
    console.log(`   Business Rules: ${caResult.ruleIds.length} rules`);
    console.log(`   States: ${ALL_STATES.length} (all US states)`);

    console.log('\n📈 OVERALL TOTALS');
    console.log('─'.repeat(70));
    console.log(`   Products: 2`);
    console.log(`   Coverages: ${Object.keys(cpResult.coverageIds).length + Object.keys(caResult.coverageIds).length}`);
    console.log(`   Forms: ${Object.keys(cpResult.formIds).length + Object.keys(caResult.formIds).length}`);
    console.log(`   Pricing Steps: ${cpResult.stepIds.length + caResult.stepIds.length}`);
    console.log(`   Business Rules: ${cpResult.ruleIds.length + caResult.ruleIds.length}`);
    console.log(`   Form-Coverage Mappings: Created`);
    console.log(`   Pricing Table Dimensions: Created`);

    console.log('\n⏱️  PERFORMANCE');
    console.log('─'.repeat(70));
    console.log(`   Total Time: ${duration} seconds`);
    console.log(`   Database: ${firebaseConfig.projectId}`);

    console.log('\n✅ SUCCESS!');
    console.log('─'.repeat(70));
    console.log('   All data has been successfully seeded to Firestore.');
    console.log('   You can now view these products in the application.');
    console.log('   Navigate to /products to see the product catalog.\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding data:', error);
    console.error('\nStack trace:', (error as Error).stack);
    process.exit(1);
  }
}

main();

