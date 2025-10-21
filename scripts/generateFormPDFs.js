#!/usr/bin/env node

/**
 * Insurance Form PDF Generator
 * 
 * Generates realistic-looking insurance form PDFs for Commercial Property
 * insurance products. Uses PDFKit to create professional-looking forms.
 * 
 * Usage: node scripts/generateFormPDFs.js
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
}

// ============================================================================
// PDF Generation Functions
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
  
  // Reset position
  doc.moveTo(0, 80);
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

const generateBuildingPropertyForm = () => {
  const doc = new PDFDocument({ margin: 50 });
  const filename = path.join(OUTPUT_DIR, 'CP_00_10_10_12.pdf');
  const stream = fs.createWriteStream(filename);
  
  doc.pipe(stream);
  
  // Header
  generateFormHeader(doc, 'CP 00 10 10 12', 'Building and Personal Property Coverage Form', '10/12');
  
  doc.fontSize(11).font('Helvetica-Bold').fill('#000000').text('COVERAGE PROVIDED', 50, 100);
  
  doc.fontSize(10).font('Helvetica').fill('#333333');
  doc.text('We will pay for direct physical loss of or damage to Covered Property at the premises described in the Declarations caused by or resulting from any Covered Cause of Loss.', 50, 125, { width: 500 });
  
  doc.fontSize(11).font('Helvetica-Bold').text('COVERED PROPERTY', 50, 180);
  
  doc.fontSize(10).font('Helvetica').text('Coverage includes:', 50, 205);
  doc.text('• Building structure and permanent fixtures', 70, 225);
  doc.text('• Business personal property including inventory and equipment', 70, 245);
  doc.text('• Improvements and betterments made by the insured', 70, 265);
  doc.text('• Outdoor property including signs and equipment', 70, 285);
  
  doc.fontSize(11).font('Helvetica-Bold').text('EXCLUSIONS', 50, 320);
  
  doc.fontSize(10).font('Helvetica').text('We do not cover loss or damage caused by:', 50, 345);
  doc.text('• Flood, surface water, waves, tidal waves, overflow of any body of water', 70, 365);
  doc.text('• Earthquake, volcanic eruption, or earth movement', 70, 385);
  doc.text('• War, civil war, insurrection, rebellion, revolution', 70, 405);
  doc.text('• Nuclear hazard or radiation', 70, 425);
  
  doc.fontSize(11).font('Helvetica-Bold').text('DEDUCTIBLE', 50, 460);
  
  doc.fontSize(10).font('Helvetica').text('We will not pay for loss or damage in any one occurrence unless the amount of loss or damage exceeds the deductible shown in the Declarations. We will then pay the amount of loss or damage in excess of the deductible.', 50, 485, { width: 500 });
  
  doc.fontSize(11).font('Helvetica-Bold').text('COINSURANCE', 50, 540);
  
  doc.fontSize(10).font('Helvetica').text('If the Limit of Insurance for Building or Personal Property is less than 80% of the replacement cost of the property at the time of loss, we will pay no more than this proportion of any loss.', 50, 565, { width: 500 });
  
  generateFormFooter(doc, 1);
  
  doc.end();
  
  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      console.log(`✅ Generated: CP 00 10 10 12 - Building and Personal Property Coverage Form`);
      resolve(filename);
    });
    stream.on('error', reject);
  });
};

const generateBusinessIncomeForm = () => {
  const doc = new PDFDocument({ margin: 50 });
  const filename = path.join(OUTPUT_DIR, 'CP_00_30_10_12.pdf');
  const stream = fs.createWriteStream(filename);
  
  doc.pipe(stream);
  
  // Header
  generateFormHeader(doc, 'CP 00 30 10 12', 'Business Income (And Extra Expense) Coverage Form', '10/12');
  
  doc.fontSize(11).font('Helvetica-Bold').fill('#000000').text('COVERAGE PROVIDED', 50, 100);
  
  doc.fontSize(10).font('Helvetica').fill('#333333');
  doc.text('We will pay for the actual loss of Business Income you sustain due to the necessary suspension of your business operations during the period of restoration.', 50, 125, { width: 500 });
  
  doc.fontSize(11).font('Helvetica-Bold').text('BUSINESS INCOME', 50, 180);
  
  doc.fontSize(10).font('Helvetica').text('Business Income means the net income (net profit or loss before income taxes) that would have been earned or incurred if no loss had occurred, including continuing normal operating expenses.', 50, 205, { width: 500 });
  
  doc.fontSize(11).font('Helvetica-Bold').text('WAITING PERIOD', 50, 270);
  
  doc.fontSize(10).font('Helvetica').text('We will not pay Business Income for the first 72 hours (3 days) following the beginning of the period of restoration. This waiting period does not apply to Extra Expense Coverage.', 50, 295, { width: 500 });
  
  doc.fontSize(11).font('Helvetica-Bold').text('EXTRA EXPENSE', 50, 350);
  
  doc.fontSize(10).font('Helvetica').text('We will pay reasonable Extra Expense incurred to continue business operations or to minimize the suspension of business, provided such Extra Expense does not exceed the limit shown in the Declarations.', 50, 375, { width: 500 });
  
  doc.fontSize(11).font('Helvetica-Bold').text('PERIOD OF RESTORATION', 50, 430);
  
  doc.fontSize(10).font('Helvetica').text('The period of restoration begins with the date of direct physical loss or damage caused by a Covered Cause of Loss and ends on the earlier of:', 50, 455, { width: 500 });
  doc.text('• The date when the property at the described premises is repaired, rebuilt, or replaced', 70, 475);
  doc.text('• The date when business is resumed at a new permanent location', 70, 495);
  
  generateFormFooter(doc, 1);
  
  doc.end();
  
  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      console.log(`✅ Generated: CP 00 30 10 12 - Business Income Coverage Form`);
      resolve(filename);
    });
    stream.on('error', reject);
  });
};

const generateBroadFormEndorsement = () => {
  const doc = new PDFDocument({ margin: 50 });
  const filename = path.join(OUTPUT_DIR, 'CP_10_10_10_12.pdf');
  const stream = fs.createWriteStream(filename);
  
  doc.pipe(stream);
  
  // Header
  generateFormHeader(doc, 'CP 10 10 10 12', 'Causes of Loss - Broad Form', '10/12');
  
  doc.fontSize(11).font('Helvetica-Bold').fill('#000000').text('COVERED CAUSES OF LOSS', 50, 100);
  
  doc.fontSize(10).font('Helvetica').fill('#333333');
  doc.text('We cover loss or damage caused by the following:', 50, 125);
  
  const causes = [
    'Fire',
    'Lightning',
    'Explosion',
    'Windstorm or Hail',
    'Smoke',
    'Aircraft or Vehicles',
    'Riot or Civil Commotion',
    'Vandalism',
    'Sprinkler Leakage',
    'Sinkhole Collapse',
    'Volcanic Action'
  ];
  
  let yPos = 150;
  causes.forEach((cause, index) => {
    doc.text(`${index + 1}. ${cause}`, 70, yPos);
    yPos += 20;
  });
  
  doc.fontSize(11).font('Helvetica-Bold').text('EXCLUSIONS', 50, yPos + 20);
  
  doc.fontSize(10).font('Helvetica').text('We do not cover loss or damage caused by:', 50, yPos + 45);
  doc.text('• Flood, surface water, waves, or tidal waves', 70, yPos + 65);
  doc.text('• Earthquake or volcanic eruption', 70, yPos + 85);
  doc.text('• War or military action', 70, yPos + 105);
  doc.text('• Nuclear hazard', 70, yPos + 125);
  
  generateFormFooter(doc, 1);
  
  doc.end();
  
  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      console.log(`✅ Generated: CP 10 10 10 12 - Causes of Loss - Broad Form`);
      resolve(filename);
    });
    stream.on('error', reject);
  });
};

const generateSpecialFormEndorsement = () => {
  const doc = new PDFDocument({ margin: 50 });
  const filename = path.join(OUTPUT_DIR, 'CP_10_30_10_12.pdf');
  const stream = fs.createWriteStream(filename);
  
  doc.pipe(stream);
  
  // Header
  generateFormHeader(doc, 'CP 10 30 10 12', 'Causes of Loss - Special Form', '10/12');
  
  doc.fontSize(11).font('Helvetica-Bold').fill('#000000').text('COVERED CAUSES OF LOSS', 50, 100);
  
  doc.fontSize(10).font('Helvetica').fill('#333333');
  doc.text('We cover loss or damage to Covered Property caused by any cause of loss except those specifically excluded.', 50, 125, { width: 500 });
  
  doc.fontSize(11).font('Helvetica-Bold').text('EXCLUSIONS', 50, 180);
  
  doc.fontSize(10).font('Helvetica').text('We do not cover loss or damage caused by:', 50, 205);
  
  const exclusions = [
    'Flood, surface water, waves, tidal waves, or overflow of any body of water',
    'Earthquake, volcanic eruption, or earth movement',
    'War, civil war, insurrection, rebellion, or revolution',
    'Nuclear hazard or radiation',
    'Fungus, wet rot, dry rot, or bacteria',
    'Wear and tear, deterioration, or mechanical breakdown',
    'Artificially generated electricity',
    'Delay, loss of use, or loss of market'
  ];
  
  let yPos = 230;
  exclusions.forEach((exclusion, index) => {
    doc.fontSize(9).text(`${index + 1}. ${exclusion}`, 70, yPos, { width: 430 });
    yPos += 30;
  });
  
  generateFormFooter(doc, 1);
  
  doc.end();
  
  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      console.log(`✅ Generated: CP 10 30 10 12 - Causes of Loss - Special Form`);
      resolve(filename);
    });
    stream.on('error', reject);
  });
};

const generateAgreedValueEndorsement = () => {
  const doc = new PDFDocument({ margin: 50 });
  const filename = path.join(OUTPUT_DIR, 'CP_15_05_10_12.pdf');
  const stream = fs.createWriteStream(filename);
  
  doc.pipe(stream);
  
  // Header
  generateFormHeader(doc, 'CP 15 05 10 12', 'Agreed Value Optional Coverage', '10/12');
  
  doc.fontSize(11).font('Helvetica-Bold').fill('#000000').text('AGREED VALUE COVERAGE', 50, 100);
  
  doc.fontSize(10).font('Helvetica').fill('#333333');
  doc.text('This endorsement modifies the insurance provided under the Building and Personal Property Coverage Form.', 50, 125, { width: 500 });
  
  doc.fontSize(11).font('Helvetica-Bold').text('COVERAGE', 50, 180);
  
  doc.fontSize(10).font('Helvetica').text('The Limit of Insurance shown in the Declarations for Building or Personal Property is agreed to be the value of the property on the date of loss. We will not apply the coinsurance condition to losses.', 50, 205, { width: 500 });
  
  doc.fontSize(11).font('Helvetica-Bold').text('CONDITION', 50, 270);
  
  doc.fontSize(10).font('Helvetica').text('This coverage applies only if:', 50, 295);
  doc.text('• An appraisal or detailed inventory of the property is provided', 70, 315);
  doc.text('• The Limit of Insurance equals or exceeds 100% of the replacement cost', 70, 335);
  doc.text('• The property is maintained in good condition', 70, 355);
  
  doc.fontSize(11).font('Helvetica-Bold').text('PREMIUM', 50, 390);
  
  doc.fontSize(10).font('Helvetica').text('An additional premium will be charged for this coverage based on the agreed value and the applicable rate.', 50, 415, { width: 500 });
  
  generateFormFooter(doc, 1);
  
  doc.end();
  
  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      console.log(`✅ Generated: CP 15 05 10 12 - Agreed Value Optional Coverage`);
      resolve(filename);
    });
    stream.on('error', reject);
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

