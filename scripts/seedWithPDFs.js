#!/usr/bin/env node

/**
 * Commercial Property Insurance Product Seeding with PDF Upload
 * 
 * This script:
 * 1. Generates insurance form PDFs
 * 2. Uploads them to Firebase Storage
 * 3. Seeds the product data with form download URLs
 * 
 * Usage: node scripts/seedWithPDFs.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

// ============================================================================
// Configuration
// ============================================================================

const PRODUCT_ID = 'commercial-property-2025';
const FORMS_DIR = path.join(__dirname, '../public/forms');
const CREATED_BY = 'system-seed-script';
const TIMESTAMP = new Date();

// ============================================================================
// Initialize Firebase Admin
// ============================================================================

const initializeFirebase = () => {
  try {
    if (!admin.apps.length) {
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      
      if (!serviceAccountPath) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH environment variable not set');
      }

      const serviceAccount = JSON.parse(
        fs.readFileSync(serviceAccountPath, 'utf8')
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
    }

    console.log('✅ Firebase Admin initialized');
    return {
      db: admin.firestore(),
      storage: admin.storage()
    };
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    process.exit(1);
  }
};

// ============================================================================
// PDF Generation
// ============================================================================

const generatePDFs = async () => {
  console.log('\n📄 Generating Form PDFs...');
  
  try {
    // Run the PDF generation script
    execSync('node scripts/generateFormPDFs.js', { stdio: 'inherit' });
    console.log('✅ PDFs generated successfully');
    return true;
  } catch (error) {
    console.error('❌ PDF generation failed:', error.message);
    return false;
  }
};

// ============================================================================
// PDF Upload to Firebase Storage
// ============================================================================

const uploadPDFsToStorage = async (storage) => {
  console.log('\n☁️  Uploading PDFs to Firebase Storage...');
  
  const bucket = storage.bucket();
  const uploadedFiles = {};
  
  if (!fs.existsSync(FORMS_DIR)) {
    console.warn('⚠️  Forms directory not found:', FORMS_DIR);
    return uploadedFiles;
  }

  const files = fs.readdirSync(FORMS_DIR).filter(f => f.endsWith('.pdf'));
  
  for (const file of files) {
    const filePath = path.join(FORMS_DIR, file);
    const storagePath = `forms/${PRODUCT_ID}/${file}`;
    
    try {
      await bucket.upload(filePath, {
        destination: storagePath,
        metadata: {
          contentType: 'application/pdf',
          cacheControl: 'public, max-age=3600'
        }
      });
      
      // Get download URL
      const downloadUrl = `https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET}/${storagePath}`;
      uploadedFiles[file] = downloadUrl;
      
      console.log(`✅ Uploaded: ${file}`);
    } catch (error) {
      console.error(`❌ Failed to upload ${file}:`, error.message);
    }
  }
  
  return uploadedFiles;
};

// ============================================================================
// Data Seeding with URLs
// ============================================================================

const seedProductWithPDFs = async (db, uploadedFiles) => {
  console.log('\n📦 Seeding Product with PDF URLs...');
  
  const STATES = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
  
  const productData = {
    name: 'Commercial Property Insurance',
    description: 'Comprehensive commercial property coverage for buildings, business personal property, and business income protection',
    category: 'Commercial Property',
    status: 'active',
    version: 1,
    effectiveDate: new Date('2025-01-01'),
    expirationDate: new Date('2026-12-31'),
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

const seedCoveragesWithPDFs = async (db, productId) => {
  console.log('\n🛡️  Seeding Coverages...');
  
  const STATES = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
  
  const coverages = [
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
  ];

  const coverageIds = {};
  
  for (const coverage of coverages) {
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

const seedFormsWithPDFs = async (db, productId, uploadedFiles) => {
  console.log('\n📄 Seeding Forms with PDF URLs...');
  
  const STATES = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
  
  const forms = [
    {
      formNumber: 'CP 00 10 10 12',
      formName: 'Building and Personal Property Coverage Form',
      formEditionDate: '10/12',
      type: 'coverage',
      description: 'Standard ISO form for building and business personal property coverage',
      pdfFile: 'CP_00_10_10_12.pdf'
    },
    {
      formNumber: 'CP 00 30 10 12',
      formName: 'Business Income (And Extra Expense) Coverage Form',
      formEditionDate: '10/12',
      type: 'coverage',
      description: 'Standard ISO form for business income and extra expense coverage',
      pdfFile: 'CP_00_30_10_12.pdf'
    },
    {
      formNumber: 'CP 10 10 10 12',
      formName: 'Causes of Loss - Broad Form',
      formEditionDate: '10/12',
      type: 'endorsement',
      description: 'Broad form causes of loss endorsement',
      pdfFile: 'CP_10_10_10_12.pdf'
    },
    {
      formNumber: 'CP 10 30 10 12',
      formName: 'Causes of Loss - Special Form',
      formEditionDate: '10/12',
      type: 'endorsement',
      description: 'Special form causes of loss endorsement',
      pdfFile: 'CP_10_30_10_12.pdf'
    },
    {
      formNumber: 'CP 15 05 10 12',
      formName: 'Agreed Value Optional Coverage',
      formEditionDate: '10/12',
      type: 'endorsement',
      description: 'Agreed value optional coverage endorsement',
      pdfFile: 'CP_15_05_10_12.pdf'
    }
  ];

  const formIds = {};
  
  for (const form of forms) {
    const formId = `form-${form.formNumber.replace(/\s+/g, '-').toLowerCase()}`;
    const downloadUrl = uploadedFiles[form.pdfFile] || null;
    
    const formData = {
      ...form,
      id: formId,
      productId,
      states: STATES,
      downloadUrl,
      filePath: downloadUrl ? `forms/${productId}/${form.pdfFile}` : null,
      isActive: true,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
      createdBy: CREATED_BY,
      updatedBy: CREATED_BY
    };

    await db.collection('forms').doc(formId).set(formData);
    formIds[form.formNumber] = formId;
    console.log(`✅ Form created: ${form.formName}${downloadUrl ? ' (with PDF)' : ' (PDF pending)'}`);
  }
  
  return formIds;
};

// ============================================================================
// Main Seeding Function
// ============================================================================

const seedWithPDFs = async () => {
  console.log('🚀 Starting Commercial Property Seeding with PDFs...\n');
  
  const { db, storage } = initializeFirebase();
  
  try {
    // Step 1: Generate PDFs
    const pdfGenerated = await generatePDFs();
    
    // Step 2: Upload PDFs to Firebase Storage
    const uploadedFiles = await uploadPDFsToStorage(storage);
    
    // Step 3: Seed product data
    const productId = await seedProductWithPDFs(db, uploadedFiles);
    
    // Step 4: Seed coverages
    const coverageIds = await seedCoveragesWithPDFs(db, productId);
    
    // Step 5: Seed forms with PDF URLs
    const formIds = await seedFormsWithPDFs(db, productId, uploadedFiles);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ SEEDING COMPLETE - Summary Report');
    console.log('='.repeat(60));
    console.log(`Product ID: ${productId}`);
    console.log(`Coverages: ${Object.keys(coverageIds).length}`);
    console.log(`Forms: ${Object.keys(formIds).length}`);
    console.log(`PDFs Uploaded: ${Object.keys(uploadedFiles).length}`);
    console.log(`PDFs Generated: ${pdfGenerated ? 'Yes' : 'No'}`);
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run the seeding script
seedWithPDFs();

