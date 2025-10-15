/**
 * Commercial Property Insurance Product Data Seeding Script
 * 
 * This script populates comprehensive commercial property insurance data including:
 * - Product definition
 * - Coverages and sub-coverages
 * - Forms (ISO and proprietary)
 * - Pricing steps and tables
 * - Business rules
 * - State availability
 * - Form-coverage mappings
 * 
 * Run with: npx tsx scripts/seedCommercialProperty.ts
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  Timestamp,
  doc,
  setDoc
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
if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
  console.error('❌ Missing Firebase configuration!');
  console.error('Please ensure .env.local has all VITE_FIREBASE_* variables');
  process.exit(1);
}

console.log(`🔥 Firebase Project: ${firebaseConfig.projectId}\n`);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// US States for commercial property
const ALL_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// Catastrophe-prone states
const CAT_STATES = ['FL', 'LA', 'TX', 'SC', 'NC', 'GA', 'AL', 'MS'];
const EARTHQUAKE_STATES = ['CA', 'OR', 'WA', 'AK', 'NV', 'UT'];
const WIND_HAIL_STATES = ['TX', 'OK', 'KS', 'NE', 'SD', 'ND', 'MO', 'IA'];

interface SeedResult {
  productId: string;
  coverageIds: Record<string, string>;
  formIds: Record<string, string>;
  stepIds: string[];
  ruleIds: string[];
}

async function checkExistingData(): Promise<void> {
  console.log('\n📊 Checking existing database data...\n');
  
  const collections = ['products', 'forms', 'rules'];
  
  for (const collectionName of collections) {
    const snapshot = await getDocs(collection(db, collectionName));
    console.log(`  ${collectionName}: ${snapshot.size} documents`);
    
    if (snapshot.size > 0 && snapshot.size <= 5) {
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`    - ${data.name || data.formName || data.formNumber || doc.id}`);
      });
    }
  }
  
  console.log('\n');
}

async function seedCommercialPropertyProduct(): Promise<SeedResult> {
  console.log('🏢 Starting Commercial Property Insurance Data Seeding...\n');

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
      maximumPremium: 1000000
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
      premium: 1200,
      isOptional: false,
      states: ALL_STATES,
      perilsCovered: ['Fire', 'Lightning', 'Explosion', 'Windstorm', 'Hail', 'Smoke', 'Vandalism', 'Theft']
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
      premium: 800,
      isOptional: false,
      states: ALL_STATES,
      perilsCovered: ['Fire', 'Lightning', 'Explosion', 'Windstorm', 'Hail', 'Smoke', 'Vandalism', 'Theft']
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
      premium: 450,
      isOptional: true,
      states: ALL_STATES,
      perilsCovered: ['Suspension of operations due to covered cause of loss']
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
      premium: 250,
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
      premium: 350,
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
      premium: 300,
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
      limits: ['$5,000', '$10,000', '$25,000'],
      deductibles: ['$100', '$250', '$500'],
      premium: 75
    },
    {
      key: 'buildingSignage',
      parentKey: 'building',
      name: 'Outdoor Signs Coverage',
      description: 'Coverage for outdoor signs attached to building',
      limits: ['$2,500', '$5,000', '$10,000'],
      deductibles: ['$250', '$500'],
      premium: 50
    },
    {
      key: 'bppComputers',
      parentKey: 'bpp',
      name: 'Computer Equipment',
      description: 'Enhanced coverage for computer and electronic equipment',
      limits: ['$25,000', '$50,000', '$100,000'],
      deductibles: ['$500', '$1,000'],
      premium: 150
    },
    {
      key: 'bppValuablePapers',
      parentKey: 'bpp',
      name: 'Valuable Papers and Records',
      description: 'Coverage for cost to research and replace valuable papers',
      limits: ['$10,000', '$25,000', '$50,000'],
      deductibles: ['$500', '$1,000'],
      premium: 100
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
    },
    {
      key: 'cp0469',
      formNumber: 'CP 04 69',
      formName: 'Utility Services - Direct Damage',
      formEditionDate: '10/12',
      type: 'ISO',
      category: 'Endorsement',
      description: 'Coverage for loss from utility service interruption',
      states: ALL_STATES,
      coverageKeys: ['businessIncome']
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
    // Base rates
    {
      stepType: 'factor',
      stepName: 'Building Base Rate',
      coverages: ['Building Coverage'],
      table: 'BuildingBaseRate',
      states: ALL_STATES,
      value: 0.15,
      rounding: 'none',
      order: 0
    },
    {
      stepType: 'operand',
      operand: '*',
      coverages: ['Building Coverage'],
      states: ALL_STATES,
      order: 1
    },
    {
      stepType: 'factor',
      stepName: 'Construction Type Factor',
      coverages: ['Building Coverage'],
      table: 'ConstructionType',
      states: ALL_STATES,
      value: 1.0,
      rounding: 'none',
      order: 2
    },
    {
      stepType: 'operand',
      operand: '*',
      coverages: ['Building Coverage'],
      states: ALL_STATES,
      order: 3
    },
    {
      stepType: 'factor',
      stepName: 'Protection Class Factor',
      coverages: ['Building Coverage'],
      table: 'ProtectionClass',
      states: ALL_STATES,
      value: 1.0,
      rounding: 'none',
      order: 4
    },
    {
      stepType: 'operand',
      operand: '*',
      coverages: ['Building Coverage'],
      states: ALL_STATES,
      order: 5
    },
    {
      stepType: 'factor',
      stepName: 'Territory Factor',
      coverages: ['Building Coverage', 'Business Personal Property'],
      table: 'Territory',
      states: ALL_STATES,
      value: 1.0,
      rounding: 'none',
      order: 6
    },
    {
      stepType: 'operand',
      operand: '*',
      coverages: ['Building Coverage', 'Business Personal Property'],
      states: ALL_STATES,
      order: 7
    },
    // BPP rates
    {
      stepType: 'factor',
      stepName: 'BPP Base Rate',
      coverages: ['Business Personal Property'],
      table: 'BPPBaseRate',
      states: ALL_STATES,
      value: 0.20,
      rounding: 'none',
      order: 8
    },
    {
      stepType: 'operand',
      operand: '*',
      coverages: ['Business Personal Property'],
      states: ALL_STATES,
      order: 9
    },
    {
      stepType: 'factor',
      stepName: 'Occupancy Factor',
      coverages: ['Business Personal Property'],
      table: 'Occupancy',
      states: ALL_STATES,
      value: 1.0,
      rounding: 'none',
      order: 10
    },
    {
      stepType: 'operand',
      operand: '+',
      coverages: ['Building Coverage', 'Business Personal Property'],
      states: ALL_STATES,
      order: 11
    },
    // Catastrophe surcharges
    {
      stepType: 'factor',
      stepName: 'Hurricane Surcharge',
      coverages: ['Building Coverage', 'Business Personal Property'],
      table: '',
      states: CAT_STATES,
      value: 1.25,
      rounding: 'none',
      order: 12
    },
    {
      stepType: 'operand',
      operand: '*',
      coverages: ['Building Coverage', 'Business Personal Property'],
      states: CAT_STATES,
      order: 13
    },
    {
      stepType: 'factor',
      stepName: 'Earthquake Surcharge',
      coverages: ['Building Coverage', 'Business Personal Property'],
      table: '',
      states: EARTHQUAKE_STATES,
      value: 1.35,
      rounding: 'none',
      order: 14
    },
    {
      stepType: 'operand',
      operand: '*',
      coverages: ['Building Coverage', 'Business Personal Property'],
      states: EARTHQUAKE_STATES,
      order: 15
    },
    // Deductible credits
    {
      stepType: 'factor',
      stepName: 'Deductible Credit',
      coverages: ['Building Coverage', 'Business Personal Property'],
      table: 'DeductibleCredit',
      states: ALL_STATES,
      value: 0.90,
      rounding: 'none',
      order: 16
    },
    {
      stepType: 'operand',
      operand: '*',
      coverages: ['Building Coverage', 'Business Personal Property'],
      states: ALL_STATES,
      order: 17
    },
    // Final rounding
    {
      stepType: 'factor',
      stepName: 'Final Premium',
      coverages: ['Building Coverage', 'Business Personal Property'],
      table: '',
      states: ALL_STATES,
      value: 1.0,
      rounding: 'nearest_dollar',
      order: 18
    }
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
  // 6. CREATE PRICING TABLE DIMENSIONS
  // ============================================================================
  console.log('📊 Creating Pricing Table Dimensions...');

  const tables = [
    {
      stepName: 'Building Base Rate',
      dimensions: [
        {
          name: 'Construction Type',
          values: 'Frame;Joisted Masonry;Non-Combustible;Masonry Non-Combustible;Modified Fire Resistive;Fire Resistive',
          technicalCode: 'CONST_TYPE'
        },
        {
          name: 'Building Square Footage',
          values: '0-5000;5001-10000;10001-25000;25001-50000;50001-100000;100001+',
          technicalCode: 'BLDG_SQ_FT'
        }
      ]
    },
    {
      stepName: 'Protection Class',
      dimensions: [
        {
          name: 'ISO Protection Class',
          values: '1;2;3;4;5;6;7;8;9;10',
          technicalCode: 'PROT_CLASS'
        }
      ]
    },
    {
      stepName: 'Territory',
      dimensions: [
        {
          name: 'Territory Code',
          values: '1;2;3;4;5;6;7;8;9;10',
          technicalCode: 'TERRITORY'
        }
      ]
    },
    {
      stepName: 'Occupancy',
      dimensions: [
        {
          name: 'Occupancy Class',
          values: 'Office;Retail;Restaurant;Manufacturing - Light;Manufacturing - Heavy;Warehouse;Apartment;Hotel/Motel',
          technicalCode: 'OCCUPANCY'
        }
      ]
    },
    {
      stepName: 'Deductible Credit',
      dimensions: [
        {
          name: 'Deductible Amount',
          values: '$500;$1,000;$2,500;$5,000;$10,000;$25,000',
          technicalCode: 'DEDUCTIBLE'
        }
      ]
    }
  ];

  for (const table of tables) {
    // Find the step with this name
    const stepSnapshot = await getDocs(
      collection(db, `products/${result.productId}/steps`)
    );

    const step = stepSnapshot.docs.find(doc => doc.data().stepName === table.stepName);

    if (step) {
      for (const dimension of table.dimensions) {
        await addDoc(
          collection(db, `products/${result.productId}/steps/${step.id}/dimensions`),
          {
            ...dimension,
            createdAt: Timestamp.now()
          }
        );
      }
      console.log(`  ✓ ${table.stepName}: ${table.dimensions.length} dimension(s)`);
    }
  }

  console.log(`\n✅ Pricing tables configured\n`);

  // ============================================================================
  // 7. CREATE BUSINESS RULES
  // ============================================================================
  console.log('📜 Creating Business Rules...');

  const businessRules = [
    {
      name: 'Minimum Building Value',
      productId: result.productId,
      ruleType: 'Eligibility',
      ruleCategory: 'Underwriting',
      condition: 'Building value must be at least $50,000',
      outcome: 'Decline if building value < $50,000',
      reference: 'Underwriting Guidelines Section 3.1',
      proprietary: true,
      status: 'Active'
    },
    {
      name: 'Maximum Building Age - Frame Construction',
      productId: result.productId,
      ruleType: 'Eligibility',
      ruleCategory: 'Underwriting',
      condition: 'Frame construction buildings must be less than 50 years old',
      outcome: 'Refer to underwriting if frame building > 50 years',
      reference: 'Underwriting Guidelines Section 3.2',
      proprietary: true,
      status: 'Active'
    },
    {
      name: 'Sprinkler System Discount',
      productId: result.productId,
      ruleType: 'Pricing',
      ruleCategory: 'Discount',
      condition: 'Building has automatic sprinkler system covering 100% of building',
      outcome: 'Apply 15% discount to building premium',
      reference: 'Rating Manual Section 5.4',
      proprietary: false,
      status: 'Active'
    },
    {
      name: 'Central Station Alarm Discount',
      productId: result.productId,
      ruleType: 'Pricing',
      ruleCategory: 'Discount',
      condition: 'Building has central station burglar and fire alarm',
      outcome: 'Apply 10% discount to building and BPP premium',
      reference: 'Rating Manual Section 5.5',
      proprietary: false,
      status: 'Active'
    },
    {
      name: 'Coastal Wind Restriction',
      productId: result.productId,
      ruleType: 'Coverage',
      ruleCategory: 'Restriction',
      condition: 'Property located within 1 mile of coast in FL, SC, NC, GA, AL, MS, LA, TX',
      outcome: 'Wind/Hail coverage requires separate wind deductible of 2% or 5%',
      reference: 'Coastal Wind Guidelines',
      proprietary: true,
      status: 'Active'
    },
    {
      name: 'Earthquake Deductible Requirement',
      productId: result.productId,
      ruleType: 'Coverage',
      ruleCategory: 'Requirement',
      condition: 'Earthquake coverage in CA, OR, WA, AK, NV, UT',
      outcome: 'Minimum earthquake deductible of 10% applies',
      reference: 'Earthquake Coverage Guidelines',
      proprietary: false,
      status: 'Active'
    },
    {
      name: 'Vacant Building Restriction',
      productId: result.productId,
      ruleType: 'Eligibility',
      ruleCategory: 'Underwriting',
      condition: 'Building has been vacant for more than 60 consecutive days',
      outcome: 'Decline coverage or apply vacant building endorsement with 85% coinsurance',
      reference: 'Underwriting Guidelines Section 4.1',
      proprietary: true,
      status: 'Active'
    },
    {
      name: 'Coinsurance Requirement',
      productId: result.productId,
      ruleType: 'Coverage',
      ruleCategory: 'Requirement',
      condition: 'All building coverage requires coinsurance clause',
      outcome: 'Apply 80%, 90%, or 100% coinsurance clause',
      reference: 'ISO CP 00 10 Form',
      proprietary: false,
      status: 'Active'
    },
    {
      name: 'Business Income Waiting Period',
      productId: result.productId,
      ruleType: 'Coverage',
      ruleCategory: 'Requirement',
      condition: 'Business Income coverage selected',
      outcome: 'Minimum 72-hour waiting period applies before coverage begins',
      reference: 'ISO CP 00 30 Form',
      proprietary: false,
      status: 'Active'
    },
    {
      name: 'Equipment Breakdown Inspection',
      productId: result.productId,
      ruleType: 'Coverage',
      ruleCategory: 'Requirement',
      condition: 'Equipment Breakdown coverage exceeds $250,000',
      outcome: 'Annual inspection by qualified engineer required',
      reference: 'Equipment Breakdown Guidelines',
      proprietary: true,
      status: 'Active'
    },
    {
      name: 'Ordinance or Law Limit',
      productId: result.productId,
      ruleType: 'Coverage',
      ruleCategory: 'Limitation',
      condition: 'Ordinance or Law coverage selected',
      outcome: 'Maximum limit is 25% of building coverage limit',
      reference: 'ISO CP 04 40 Endorsement',
      proprietary: false,
      status: 'Active'
    },
    {
      name: 'High-Value Property Inspection',
      productId: result.productId,
      ruleType: 'Underwriting',
      ruleCategory: 'Requirement',
      condition: 'Total insured value exceeds $5,000,000',
      outcome: 'Physical inspection and detailed risk assessment required',
      reference: 'Underwriting Guidelines Section 2.3',
      proprietary: true,
      status: 'Active'
    }
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

// Main execution
async function main() {
  try {
    await checkExistingData();

    const result = await seedCommercialPropertyProduct();

    console.log('\n' + '='.repeat(60));
    console.log('✨ COMMERCIAL PROPERTY DATA SEEDING COMPLETE!');
    console.log('='.repeat(60));
    console.log(`\n📦 Product ID: ${result.productId}`);
    console.log(`🛡️  Coverages: ${Object.keys(result.coverageIds).length} (including sub-coverages)`);
    console.log(`📄 Forms: ${Object.keys(result.formIds).length}`);
    console.log(`💰 Pricing Steps: ${result.stepIds.length}`);
    console.log(`📜 Business Rules: ${result.ruleIds.length}`);
    console.log(`\n🎯 Coverage Breakdown:`);
    console.log(`   - Base Coverages: 2 (Building, BPP)`);
    console.log(`   - Optional Coverages: 2 (Business Income, Extra Expense)`);
    console.log(`   - Endorsements: 2 (Equipment Breakdown, Ordinance/Law)`);
    console.log(`   - Sub-Coverages: 4`);
    console.log(`\n📊 Pricing Structure:`);
    console.log(`   - Base rating factors with territory, construction, protection class`);
    console.log(`   - Catastrophe surcharges for hurricane and earthquake zones`);
    console.log(`   - Deductible credits`);
    console.log(`   - Multi-dimensional rating tables`);
    console.log(`\n📜 Business Rules:`);
    console.log(`   - Eligibility rules: 3`);
    console.log(`   - Pricing rules: 2`);
    console.log(`   - Coverage requirements: 7`);
    console.log(`\n✅ All data successfully seeded to Firestore!`);
    console.log(`\nYou can now view this product in the application.\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding data:', error);
    process.exit(1);
  }
}

main();

