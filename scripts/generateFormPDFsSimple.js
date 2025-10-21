#!/usr/bin/env node

/**
 * Simple Insurance Form PDF Generator (No Dependencies)
 * 
 * Generates realistic-looking insurance form PDFs using PDFKit.
 * This is a standalone script that can be run independently.
 * 
 * Usage: node scripts/generateFormPDFsSimple.js
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const OUTPUT_DIR = path.join(__dirname, '../public/forms');
const INSURER_NAME = 'Insurance Solutions Inc.';
const INSURER_ADDRESS = '123 Insurance Plaza, New York, NY 10001';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`📁 Created directory: ${OUTPUT_DIR}`);
}

// ============================================================================
// Utility Functions
// ============================================================================

const generateFormHeader = (doc, formNumber, formName, editionDate) => {
  // Header background
  doc.rect(0, 0, doc.page.width, 80).fill('#003366');
  
  // Insurer name
  doc.fontSize(14).font('Helvetica-Bold').fill('#FFFFFF').text(INSURER_NAME, 50, 15);
  
  // Form number and name
  doc.fontSize(10).font('Helvetica').fill('#FFFFFF').text(`Form ${formNumber}`, 50, 35);
  doc.fontSize(12).font('Helvetica-Bold').fill('#FFFFFF').text(formName, 50, 50);
  
  // Edition date
  doc.fontSize(9).font('Helvetica').fill('#CCCCCC').text(`Edition: ${editionDate}`, doc.page.width - 200, 50);
};

const generateFormFooter = (doc, pageNumber) => {
  const footerY = doc.page.height - 30;
  
  // Footer line
  doc.strokeColor('#CCCCCC').lineWidth(1).moveTo(50, footerY).lineTo(doc.page.width - 50, footerY).stroke();
  
  // Footer text
  doc.fontSize(8).font('Helvetica').fill('#666666');
  doc.text(`Page ${pageNumber}`, 50, footerY + 10);
  doc.text(`© ${new Date().getFullYear()} ${INSURER_NAME}. All rights reserved.`, doc.page.width / 2 - 100, footerY + 10, { align: 'center' });
};

const addSection = (doc, title, content, startY) => {
  doc.fontSize(11).font('Helvetica-Bold').fill('#000000').text(title, 50, startY);
  doc.fontSize(10).font('Helvetica').fill('#333333').text(content, 50, startY + 25, { width: 500 });
  return startY + 60;
};

// ============================================================================
// PDF Generation Functions
// ============================================================================

const generateBuildingPropertyForm = () => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const filename = path.join(OUTPUT_DIR, 'CP_00_10_10_12.pdf');
      const stream = fs.createWriteStream(filename);
      
      doc.pipe(stream);
      
      // Header
      generateFormHeader(doc, 'CP 00 10 10 12', 'Building and Personal Property Coverage Form', '10/12');
      
      let yPos = 100;
      
      yPos = addSection(doc, 'COVERAGE PROVIDED', 
        'We will pay for direct physical loss of or damage to Covered Property at the premises described in the Declarations caused by or resulting from any Covered Cause of Loss.', yPos);
      
      yPos = addSection(doc, 'COVERED PROPERTY',
        'Coverage includes: (1) Building structure and permanent fixtures; (2) Business personal property including inventory and equipment; (3) Improvements and betterments made by the insured; (4) Outdoor property including signs and equipment.', yPos);
      
      yPos = addSection(doc, 'EXCLUSIONS',
        'We do not cover loss or damage caused by: (1) Flood, surface water, waves, tidal waves, overflow of any body of water; (2) Earthquake, volcanic eruption, or earth movement; (3) War, civil war, insurrection, rebellion, revolution; (4) Nuclear hazard or radiation.', yPos);
      
      yPos = addSection(doc, 'DEDUCTIBLE',
        'We will not pay for loss or damage in any one occurrence unless the amount of loss or damage exceeds the deductible shown in the Declarations. We will then pay the amount of loss or damage in excess of the deductible.', yPos);
      
      yPos = addSection(doc, 'COINSURANCE',
        'If the Limit of Insurance for Building or Personal Property is less than 80% of the replacement cost of the property at the time of loss, we will pay no more than this proportion of any loss.', yPos);
      
      generateFormFooter(doc, 1);
      
      doc.end();
      
      stream.on('finish', () => {
        console.log(`✅ Generated: CP 00 10 10 12 - Building and Personal Property Coverage Form`);
        resolve(filename);
      });
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

const generateBusinessIncomeForm = () => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const filename = path.join(OUTPUT_DIR, 'CP_00_30_10_12.pdf');
      const stream = fs.createWriteStream(filename);
      
      doc.pipe(stream);
      
      generateFormHeader(doc, 'CP 00 30 10 12', 'Business Income (And Extra Expense) Coverage Form', '10/12');
      
      let yPos = 100;
      
      yPos = addSection(doc, 'COVERAGE PROVIDED',
        'We will pay for the actual loss of Business Income you sustain due to the necessary suspension of your business operations during the period of restoration.', yPos);
      
      yPos = addSection(doc, 'BUSINESS INCOME',
        'Business Income means the net income (net profit or loss before income taxes) that would have been earned or incurred if no loss had occurred, including continuing normal operating expenses.', yPos);
      
      yPos = addSection(doc, 'WAITING PERIOD',
        'We will not pay Business Income for the first 72 hours (3 days) following the beginning of the period of restoration. This waiting period does not apply to Extra Expense Coverage.', yPos);
      
      yPos = addSection(doc, 'EXTRA EXPENSE',
        'We will pay reasonable Extra Expense incurred to continue business operations or to minimize the suspension of business, provided such Extra Expense does not exceed the limit shown in the Declarations.', yPos);
      
      generateFormFooter(doc, 1);
      
      doc.end();
      
      stream.on('finish', () => {
        console.log(`✅ Generated: CP 00 30 10 12 - Business Income Coverage Form`);
        resolve(filename);
      });
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

const generateBroadFormEndorsement = () => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const filename = path.join(OUTPUT_DIR, 'CP_10_10_10_12.pdf');
      const stream = fs.createWriteStream(filename);
      
      doc.pipe(stream);
      
      generateFormHeader(doc, 'CP 10 10 10 12', 'Causes of Loss - Broad Form', '10/12');
      
      doc.fontSize(11).font('Helvetica-Bold').fill('#000000').text('COVERED CAUSES OF LOSS', 50, 100);
      doc.fontSize(10).font('Helvetica').fill('#333333').text('We cover loss or damage caused by the following:', 50, 125);
      
      const causes = ['Fire', 'Lightning', 'Explosion', 'Windstorm or Hail', 'Smoke', 'Aircraft or Vehicles', 'Riot or Civil Commotion', 'Vandalism', 'Sprinkler Leakage', 'Sinkhole Collapse', 'Volcanic Action'];
      
      let yPos = 150;
      causes.forEach((cause, index) => {
        doc.text(`${index + 1}. ${cause}`, 70, yPos);
        yPos += 20;
      });
      
      yPos += 20;
      doc.fontSize(11).font('Helvetica-Bold').text('EXCLUSIONS', 50, yPos);
      doc.fontSize(10).font('Helvetica').text('We do not cover loss or damage caused by: (1) Flood, surface water, waves, or tidal waves; (2) Earthquake or volcanic eruption; (3) War or military action; (4) Nuclear hazard.', 50, yPos + 25, { width: 500 });
      
      generateFormFooter(doc, 1);
      
      doc.end();
      
      stream.on('finish', () => {
        console.log(`✅ Generated: CP 10 10 10 12 - Causes of Loss - Broad Form`);
        resolve(filename);
      });
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

const generateSpecialFormEndorsement = () => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const filename = path.join(OUTPUT_DIR, 'CP_10_30_10_12.pdf');
      const stream = fs.createWriteStream(filename);
      
      doc.pipe(stream);
      
      generateFormHeader(doc, 'CP 10 30 10 12', 'Causes of Loss - Special Form', '10/12');
      
      doc.fontSize(11).font('Helvetica-Bold').fill('#000000').text('COVERED CAUSES OF LOSS', 50, 100);
      doc.fontSize(10).font('Helvetica').fill('#333333').text('We cover loss or damage to Covered Property caused by any cause of loss except those specifically excluded.', 50, 125, { width: 500 });
      
      doc.fontSize(11).font('Helvetica-Bold').text('EXCLUSIONS', 50, 180);
      doc.fontSize(10).font('Helvetica').text('We do not cover loss or damage caused by: (1) Flood, surface water, waves, tidal waves, or overflow of any body of water; (2) Earthquake, volcanic eruption, or earth movement; (3) War, civil war, insurrection, rebellion, or revolution; (4) Nuclear hazard or radiation; (5) Fungus, wet rot, dry rot, or bacteria; (6) Wear and tear, deterioration, or mechanical breakdown; (7) Artificially generated electricity; (8) Delay, loss of use, or loss of market.', 50, 205, { width: 500 });
      
      generateFormFooter(doc, 1);
      
      doc.end();
      
      stream.on('finish', () => {
        console.log(`✅ Generated: CP 10 30 10 12 - Causes of Loss - Special Form`);
        resolve(filename);
      });
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

const generateAgreedValueEndorsement = () => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const filename = path.join(OUTPUT_DIR, 'CP_15_05_10_12.pdf');
      const stream = fs.createWriteStream(filename);
      
      doc.pipe(stream);
      
      generateFormHeader(doc, 'CP 15 05 10 12', 'Agreed Value Optional Coverage', '10/12');
      
      let yPos = 100;
      
      yPos = addSection(doc, 'AGREED VALUE COVERAGE',
        'This endorsement modifies the insurance provided under the Building and Personal Property Coverage Form.', yPos);
      
      yPos = addSection(doc, 'COVERAGE',
        'The Limit of Insurance shown in the Declarations for Building or Personal Property is agreed to be the value of the property on the date of loss. We will not apply the coinsurance condition to losses.', yPos);
      
      yPos = addSection(doc, 'CONDITION',
        'This coverage applies only if: (1) An appraisal or detailed inventory of the property is provided; (2) The Limit of Insurance equals or exceeds 100% of the replacement cost; (3) The property is maintained in good condition.', yPos);
      
      yPos = addSection(doc, 'PREMIUM',
        'An additional premium will be charged for this coverage based on the agreed value and the applicable rate.', yPos);
      
      generateFormFooter(doc, 1);
      
      doc.end();
      
      stream.on('finish', () => {
        console.log(`✅ Generated: CP 15 05 10 12 - Agreed Value Optional Coverage`);
        resolve(filename);
      });
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

// ============================================================================
// Main Function
// ============================================================================

const generateAllForms = async () => {
  console.log('📄 Generating Insurance Form PDFs...\n');
  
  try {
    await generateBuildingPropertyForm();
    await generateBusinessIncomeForm();
    await generateBroadFormEndorsement();
    await generateSpecialFormEndorsement();
    await generateAgreedValueEndorsement();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ PDF Generation Complete');
    console.log('='.repeat(60));
    console.log(`Output Directory: ${OUTPUT_DIR}`);
    console.log('Forms Generated:');
    console.log('  • CP 00 10 10 12 - Building and Personal Property Coverage Form');
    console.log('  • CP 00 30 10 12 - Business Income Coverage Form');
    console.log('  • CP 10 10 10 12 - Causes of Loss - Broad Form');
    console.log('  • CP 10 30 10 12 - Causes of Loss - Special Form');
    console.log('  • CP 15 05 10 12 - Agreed Value Optional Coverage');
    console.log('='.repeat(60) + '\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ PDF generation failed:', error);
    process.exit(1);
  }
};

// Run the PDF generation
generateAllForms();

