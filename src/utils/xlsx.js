import * as XLSX from 'xlsx';
import { db } from '../firebase';
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';

export const STATE_COLS = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY'
];

// XLSX Import Configuration
export const SHEET_HANDLERS = {
  'Product': 'handleProductsSheet',
  'Forms': 'handleFormsSheet',
  'ProductCoverageUpload': 'handleFormCoverageMapping',
  'Pricing': 'handlePricingSheet',
  'Rules': 'handleRulesSheet',
  'Data Dictionary': 'handleDataDictionary'
};

// Column mapping for normalization
export const COLUMN_MAPPINGS = {
  'FORM NUMBER': 'formNumber',
  'FORM NAME': 'formName',
  'FORM EDITION DATE': 'formEditionDate',
  'FORM EFFECTIVE DATE': 'effectiveDate',
  'FORM EXPIRATION DATE': 'expirationDate',
  'FORM CATEGORY': 'category',
  'COVERAGE CODE': 'coverageCode',
  'COVERAGE CATEGORY': 'coverageCategory',
  'SUB COVERAGE': 'subCoverage',
  'STATE AVAILABILITY': 'stateAvailability',
  'PRODUCT FRAMEWORK ID': 'productFrameworkId',
  'RULE SUB-CATEGORY': 'ruleSubCategory',
  'RULE CONDITION': 'ruleCondition',
  'RULE OUTCOME': 'ruleOutcome',
  'DYNAMIC / STATIC': 'dynamicStatic',
  'ATTACHMENT CONDITIONS': 'attachmentConditions'
};

/* ---------- XLSX Import Core Functions ---------- */

// Main XLSX import orchestrator
export const processXLSXFile = async (file, options = {}) => {
  try {
    console.log('🚀 Starting XLSX import process...');

    // Validate file type
    if (!validateFileType(file)) {
      throw new Error('Invalid file type. Please upload an Excel file (.xlsx or .xls)');
    }

    // Parse workbook
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const results = {
      success: [],
      errors: [],
      warnings: [],
      summary: {}
    };

    // Create lookup maps for cross-referencing
    const lookupMaps = {
      productMap: {},
      coverageMap: {},
      formMap: {},
      ruleMap: {}
    };

    // Process sheets in dependency order
    const processingOrder = ['Product', 'Forms', 'ProductCoverageUpload', 'Pricing', 'Rules'];

    for (const sheetName of processingOrder) {
      if (workbook.SheetNames.includes(sheetName)) {
        console.log(`📊 Processing sheet: ${sheetName}`);
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        try {
          const sheetResult = await processSheet(sheetName, jsonData, lookupMaps, options);
          results.success.push({
            sheet: sheetName,
            recordsProcessed: sheetResult.recordsProcessed,
            recordsCreated: sheetResult.recordsCreated,
            recordsUpdated: sheetResult.recordsUpdated
          });
          results.summary[sheetName] = sheetResult;
        } catch (error) {
          console.error(`❌ Error processing sheet ${sheetName}:`, error);
          results.errors.push({
            sheet: sheetName,
            error: error.message,
            details: error.details || null
          });
        }
      }
    }

    console.log('✅ XLSX import process completed');
    return results;

  } catch (error) {
    console.error('❌ XLSX import failed:', error);
    throw error;
  }
};

// File type validation
const validateFileType = (file) => {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  return validTypes.includes(file.type) || file.name.match(/\.(xlsx|xls)$/i);
};

// Sheet processor router
const processSheet = async (sheetName, jsonData, lookupMaps, options) => {
  const handlers = {
    'Product': handleProductsSheet,
    'Forms': handleFormsSheet,
    'ProductCoverageUpload': handleFormCoverageMapping,
    'Pricing': handlePricingSheet,
    'Rules': handleRulesSheet
  };

  const handler = handlers[sheetName];
  if (!handler) {
    throw new Error(`No handler found for sheet: ${sheetName}`);
  }

  return await handler(jsonData, lookupMaps, options);
};

// Data normalization utility
export const normalizeColumnNames = (data) => {
  return data.map(row => {
    const normalizedRow = {};
    Object.keys(row).forEach(key => {
      const normalizedKey = COLUMN_MAPPINGS[key] || key.toLowerCase().replace(/\s+/g, '');
      normalizedRow[normalizedKey] = row[key];
    });
    return normalizedRow;
  });
};

// State parsing utility
export const parseStateAvailability = (stateData, row) => {
  if (typeof stateData === 'string') {
    if (stateData.trim().toUpperCase() === 'X') {
      return STATE_COLS; // All states
    }
    // Parse comma-separated state codes
    return stateData.split(',').map(s => s.trim().toUpperCase()).filter(s => STATE_COLS.includes(s));
  }

  // Check individual state columns
  const availableStates = [];
  STATE_COLS.forEach(state => {
    if (row[state] && (row[state].toString().trim().toUpperCase() === 'X' || row[state] === 1)) {
      availableStates.push(state);
    }
  });

  return availableStates.length > 0 ? availableStates : STATE_COLS;
};

// Validation utilities
export const validateRequiredFields = (data, requiredFields, sheetName) => {
  const errors = [];

  data.forEach((row, index) => {
    requiredFields.forEach(field => {
      if (!row[field] || row[field].toString().trim() === '') {
        errors.push({
          sheet: sheetName,
          row: index + 2, // +2 for header and 0-based index
          field,
          message: `Required field '${field}' is missing or empty`
        });
      }
    });
  });

  return errors;
};

// Type inference utility
export const inferDataType = (value) => {
  if (value === null || value === undefined || value === '') return null;

  const str = value.toString().trim();

  // Number detection
  if (!isNaN(str) && !isNaN(parseFloat(str))) {
    return parseFloat(str);
  }

  // Boolean detection
  if (['true', 'false', 'yes', 'no', 'y', 'n'].includes(str.toLowerCase())) {
    return ['true', 'yes', 'y'].includes(str.toLowerCase());
  }

  // Date detection (basic)
  if (str.match(/^\d{4}-\d{2}-\d{2}/) || str.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
    const date = new Date(str);
    return isNaN(date.getTime()) ? str : date.toISOString();
  }

  return str;
};

/* ---------- Sheet Handler Functions ---------- */

// Products Sheet Handler
const handleProductsSheet = async (jsonData, lookupMaps, options = {}) => {
  console.log('📦 Processing Products sheet...');

  const normalizedData = normalizeColumnNames(jsonData);
  const requiredFields = ['PRODUCT', 'COVERAGE', 'coverageCode'];

  // Validate required fields
  const validationErrors = validateRequiredFields(normalizedData, requiredFields, 'Product');
  if (validationErrors.length > 0 && !options.skipValidation) {
    throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
  }

  const batch = writeBatch(db);
  let recordsProcessed = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;
  const processedProducts = new Set();
  const processedCoverages = new Set();

  for (const row of normalizedData) {
    try {
      recordsProcessed++;

      // Process Product
      const productKey = row.PRODUCT || row.product;
      if (productKey && !processedProducts.has(productKey)) {
        const productRef = doc(collection(db, 'products'));
        const productData = {
          name: productKey,
          status: inferDataType(row.STATUS || row.status) || 'Active',
          bureau: row.BUREAU || row.bureau || 'ISO',
          stateAvailability: parseStateAvailability(row.stateAvailability || row['STATE AVAILABILITY'], row),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        // Add optional fields
        if (row.formNumber || row['FORM NUMBER']) {
          productData.formNumber = row.formNumber || row['FORM NUMBER'];
        }
        if (row.productCode || row['PRODUCT CODE']) {
          productData.productCode = row.productCode || row['PRODUCT CODE'];
        }
        if (row.effectiveDate || row['EFFECTIVE DATE']) {
          productData.effectiveDate = inferDataType(row.effectiveDate || row['EFFECTIVE DATE']);
        }

        batch.set(productRef, productData);
        lookupMaps.productMap[productKey] = productRef.id;
        processedProducts.add(productKey);
        recordsCreated++;
      }

      // Process Coverage
      const coverageKey = `${productKey}-${row.COVERAGE || row.coverage}`;
      if ((row.COVERAGE || row.coverage) && !processedCoverages.has(coverageKey)) {
        const productId = lookupMaps.productMap[productKey];
        if (productId) {
          const coverageRef = doc(collection(db, `products/${productId}/coverages`));
          const coverageData = {
            name: row.COVERAGE || row.coverage,
            coverageCode: row.coverageCode || row['COVERAGE CODE'],
            category: row.coverageCategory || row['COVERAGE CATEGORY'] || 'Base Coverage',
            description: row.subCoverage || row['SUB COVERAGE'] || '',
            type: 'Base coverage',
            states: parseStateAvailability(row.stateAvailability || row['STATE AVAILABILITY'], row),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };

          // Add optional fields
          if (row.formNumber || row['FORM NUMBER']) {
            coverageData.formNumber = row.formNumber || row['FORM NUMBER'];
          }
          if (row.limits) {
            coverageData.limits = Array.isArray(row.limits) ? row.limits : [row.limits];
          }
          if (row.deductibles) {
            coverageData.deductibles = Array.isArray(row.deductibles) ? row.deductibles : [row.deductibles];
          }

          batch.set(coverageRef, coverageData);
          lookupMaps.coverageMap[coverageKey] = coverageRef.id;
          processedCoverages.add(coverageKey);
          recordsCreated++;
        }
      }

    } catch (error) {
      console.error(`Error processing product row ${recordsProcessed}:`, error);
      if (!options.continueOnError) {
        throw error;
      }
    }
  }

  // Commit batch
  await batch.commit();
  console.log(`✅ Products sheet processed: ${recordsCreated} records created`);

  return {
    recordsProcessed,
    recordsCreated,
    recordsUpdated,
    productMap: lookupMaps.productMap,
    coverageMap: lookupMaps.coverageMap
  };
};

// Forms Sheet Handler
const handleFormsSheet = async (jsonData, lookupMaps, options = {}) => {
  console.log('📄 Processing Forms sheet...');

  const normalizedData = normalizeColumnNames(jsonData);
  const requiredFields = ['formNumber', 'formName'];

  // Validate required fields
  const validationErrors = validateRequiredFields(normalizedData, requiredFields, 'Forms');
  if (validationErrors.length > 0 && !options.skipValidation) {
    throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
  }

  const batch = writeBatch(db);
  let recordsProcessed = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;

  for (const row of normalizedData) {
    try {
      recordsProcessed++;

      const formRef = doc(collection(db, 'forms'));
      const formData = {
        formName: row.formName || row['FORM NAME'],
        formNumber: row.formNumber || row['FORM NUMBER'],
        effectiveDate: inferDataType(row.effectiveDate || row['FORM EFFECTIVE DATE']) || '',
        expirationDate: inferDataType(row.expirationDate || row['FORM EXPIRATION DATE']) || '9999-12-31',
        type: row.bureau || row.BUREAU || 'ISO',
        category: row.category || row['FORM CATEGORY'] || 'Base Coverage Form',
        formEditionDate: row.formEditionDate || row['FORM EDITION DATE'] || '',
        dynamicStatic: row.dynamicStatic || row['DYNAMIC / STATIC'] || 'Static',
        attachmentConditions: row.attachmentConditions || row['ATTACHMENT CONDITIONS'] || '',
        productIds: [],
        coverageIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Link to product if specified
      const productKey = row.product || row.PRODUCT || row['PRODUCT ID'];
      if (productKey && lookupMaps.productMap[productKey]) {
        formData.productIds = [lookupMaps.productMap[productKey]];
        formData.productId = lookupMaps.productMap[productKey]; // Legacy field
      }

      batch.set(formRef, formData);
      lookupMaps.formMap[formData.formNumber] = formRef.id;
      recordsCreated++;

    } catch (error) {
      console.error(`Error processing form row ${recordsProcessed}:`, error);
      if (!options.continueOnError) {
        throw error;
      }
    }
  }

  // Commit batch
  await batch.commit();
  console.log(`✅ Forms sheet processed: ${recordsCreated} records created`);

  return {
    recordsProcessed,
    recordsCreated,
    recordsUpdated,
    formMap: lookupMaps.formMap
  };
};

// Form Coverage Mapping Sheet Handler
const handleFormCoverageMapping = async (jsonData, lookupMaps, options = {}) => {
  console.log('🔗 Processing ProductCoverageUpload sheet...');

  const normalizedData = normalizeColumnNames(jsonData);
  const requiredFields = ['PRODUCT', 'COVERAGE', 'formNumber'];

  // Validate required fields
  const validationErrors = validateRequiredFields(normalizedData, requiredFields, 'ProductCoverageUpload');
  if (validationErrors.length > 0 && !options.skipValidation) {
    throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
  }

  const batch = writeBatch(db);
  let recordsProcessed = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;

  for (const row of normalizedData) {
    try {
      recordsProcessed++;

      const productKey = row.PRODUCT || row.product;
      const coverageKey = `${productKey}-${row.COVERAGE || row.coverage}`;
      const formNumber = row.formNumber || row['FORM NUMBER'];

      const productId = lookupMaps.productMap[productKey];
      const coverageId = lookupMaps.coverageMap[coverageKey];
      const formId = lookupMaps.formMap[formNumber];

      if (productId && coverageId && formId) {
        const linkRef = doc(collection(db, 'formCoverages'));
        const linkData = {
          productId,
          coverageId,
          formId,
          createdAt: serverTimestamp()
        };

        batch.set(linkRef, linkData);
        recordsCreated++;
      } else {
        console.warn(`Skipping link - missing references: Product(${productId}), Coverage(${coverageId}), Form(${formId})`);
      }

    } catch (error) {
      console.error(`Error processing form coverage mapping row ${recordsProcessed}:`, error);
      if (!options.continueOnError) {
        throw error;
      }
    }
  }

  // Commit batch
  await batch.commit();
  console.log(`✅ Form Coverage Mapping sheet processed: ${recordsCreated} records created`);

  return {
    recordsProcessed,
    recordsCreated,
    recordsUpdated
  };
};

// Pricing Sheet Handler
const handlePricingSheet = async (jsonData, lookupMaps, options = {}) => {
  console.log('💰 Processing Pricing sheet...');

  const normalizedData = normalizeColumnNames(jsonData);
  const requiredFields = ['Coverage', 'Step Name'];

  // Validate required fields
  const validationErrors = validateRequiredFields(normalizedData, requiredFields, 'Pricing');
  if (validationErrors.length > 0 && !options.skipValidation) {
    throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
  }

  const batch = writeBatch(db);
  let recordsProcessed = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;

  for (const row of normalizedData) {
    try {
      recordsProcessed++;

      // Find the product ID from coverage
      const coverageName = row.Coverage || row.coverage;
      let productId = null;

      // Try to find product ID from coverage mapping
      for (const [key] of Object.entries(lookupMaps.coverageMap)) {
        if (key.includes(coverageName)) {
          const productKey = key.split('-')[0];
          productId = lookupMaps.productMap[productKey];
          break;
        }
      }

      if (productId) {
        const stepRef = doc(collection(db, `products/${productId}/steps`));
        const stepData = {
          stepName: row['Step Name'] || row.stepName,
          stepType: 'factor', // Default type
          calculation: row.CALCULATION || row.calculation || '+',
          rounding: row.ROUNDING || row.rounding || 'none',
          value: inferDataType(row.Value || row.value) || 0,
          coverages: [coverageName],
          states: parseStateAvailability(row.stateAvailability || row['STATE AVAILABILITY'], row),
          table: row['Table Name'] || row.tableName || '',
          proprietary: inferDataType(row.PROPRIETARY || row.proprietary) || false,
          rules: row.RULES || row.rules || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        batch.set(stepRef, stepData);
        recordsCreated++;

        // Create dimensions if needed
        if (row['COVERAGE NAME'] || row.coverageName) {
          const dimensionRef = doc(collection(db, `products/${productId}/steps/${stepRef.id}/dimensions`));
          const dimensionData = {
            name: row['COVERAGE NAME'] || row.coverageName,
            technicalCode: row['TABLE NAME'] || row.tableName || '',
            values: row['EXAMPLE VALUES'] || row.exampleValues || '',
            type: 'Row',
            createdAt: serverTimestamp()
          };

          batch.set(dimensionRef, dimensionData);
        }
      } else {
        console.warn(`Skipping pricing step - no product found for coverage: ${coverageName}`);
      }

    } catch (error) {
      console.error(`Error processing pricing row ${recordsProcessed}:`, error);
      if (!options.continueOnError) {
        throw error;
      }
    }
  }

  // Commit batch
  await batch.commit();
  console.log(`✅ Pricing sheet processed: ${recordsCreated} records created`);

  return {
    recordsProcessed,
    recordsCreated,
    recordsUpdated
  };
};

// Rules Sheet Handler
const handleRulesSheet = async (jsonData, lookupMaps, options = {}) => {
  console.log('📋 Processing Rules sheet...');

  const normalizedData = normalizeColumnNames(jsonData);
  const requiredFields = ['ruleSubCategory', 'ruleCondition', 'ruleOutcome'];

  // Validate required fields
  const validationErrors = validateRequiredFields(normalizedData, requiredFields, 'Rules');
  if (validationErrors.length > 0 && !options.skipValidation) {
    throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
  }

  const batch = writeBatch(db);
  let recordsProcessed = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;

  for (const row of normalizedData) {
    try {
      recordsProcessed++;

      const ruleRef = doc(collection(db, 'rules'));
      const ruleData = {
        name: row.ruleSubCategory || row['RULE SUB-CATEGORY'],
        condition: row.ruleCondition || row['RULE CONDITION'],
        outcome: row.ruleOutcome || row['RULE OUTCOME'],
        proprietary: inferDataType(row.PROPRIETARY || row.proprietary) === 'YES' || false,
        reference: row.SOURCE || row.source || row.formNumber || row['FORM NUMBER'] || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Link to product if framework ID is provided
      const frameworkId = row.productFrameworkId || row['PRODUCT FRAMEWORK ID'];
      if (frameworkId && lookupMaps.productMap[frameworkId]) {
        ruleData.productId = lookupMaps.productMap[frameworkId];
      }

      batch.set(ruleRef, ruleData);
      lookupMaps.ruleMap[ruleData.name] = ruleRef.id;
      recordsCreated++;

    } catch (error) {
      console.error(`Error processing rule row ${recordsProcessed}:`, error);
      if (!options.continueOnError) {
        throw error;
      }
    }
  }

  // Commit batch
  await batch.commit();
  console.log(`✅ Rules sheet processed: ${recordsCreated} records created`);

  return {
    recordsProcessed,
    recordsCreated,
    recordsUpdated,
    ruleMap: lookupMaps.ruleMap
  };
};

/* ---------- Enhanced XLSX Export Functions ---------- */

// Helper function to apply professional styling to worksheets
const applyWorksheetStyling = (ws, headerRow = 1) => {
  const range = XLSX.utils.decode_range(ws['!ref']);

  // Set column widths for better readability
  const colWidths = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRow - 1, c: col });
    const cell = ws[cellAddress];
    if (cell && cell.v) {
      const headerLength = String(cell.v).length;
      colWidths.push({ wch: Math.max(headerLength + 2, 12) });
    } else {
      colWidths.push({ wch: 12 });
    }
  }
  ws['!cols'] = colWidths;

  // Apply header styling
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRow - 1, c: col });
    if (ws[cellAddress]) {
      ws[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "6366F1" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
    }
  }

  // Apply alternating row colors for data rows
  for (let row = headerRow; row <= range.e.r; row++) {
    const isEvenRow = (row - headerRow) % 2 === 0;
    const fillColor = isEvenRow ? "F8FAFC" : "FFFFFF";

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          fill: { fgColor: { rgb: fillColor } },
          alignment: { horizontal: "left", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "E2E8F0" } },
            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
            left: { style: "thin", color: { rgb: "E2E8F0" } },
            right: { style: "thin", color: { rgb: "E2E8F0" } }
          }
        };
      }
    }
  }

  return ws;
};

// Enhanced coverage sheet with professional styling
export const makeCoverageSheet = (coverages = []) => {
  // Add metadata header
  const currentDate = new Date().toLocaleDateString();
  const metadata = [
    ['Coverage Export Report'],
    [`Generated on: ${currentDate}`],
    [`Total Coverages: ${coverages.length}`],
    [''], // Empty row for spacing
    ['Coverage Name', 'Coverage Code', 'Category', 'Parent Coverage Code', 'Sub-Coverages', 'States Count', ...STATE_COLS]
  ];

  const rows = coverages.map(c => {
    const row = {
      'Coverage Name': c.name || '',
      'Coverage Code': c.coverageCode || '',
      'Category': c.category || 'Base Coverage',
      'Parent Coverage Code': c.parentCoverageId || '',
      'Sub-Coverages': c.subCount || 0,
      'States Count': c.states?.length || 0
    };

    // Add state columns with Yes/No instead of 1/0
    STATE_COLS.forEach(s => {
      row[s] = c.states?.includes(s) ? 'Yes' : 'No';
    });

    return row;
  });

  // Create worksheet with metadata
  const ws = XLSX.utils.aoa_to_sheet(metadata);

  // Add data rows
  XLSX.utils.sheet_add_json(ws, rows, {
    origin: 'A6',
    skipHeader: false
  });

  // Apply professional styling
  applyWorksheetStyling(ws, 5); // Header is on row 5 (0-indexed)

  // Style the title and metadata
  ws['A1'].s = {
    font: { bold: true, size: 16, color: { rgb: "1E293B" } },
    alignment: { horizontal: "center" }
  };

  ws['A2'].s = {
    font: { italic: true, color: { rgb: "64748B" } }
  };

  ws['A3'].s = {
    font: { bold: true, color: { rgb: "059669" } }
  };

  return ws;
};

// Enhanced forms sheet with professional styling
export const makeFormSheet = (forms = []) => {
  // Add metadata header
  const currentDate = new Date().toLocaleDateString();
  const metadata = [
    ['Forms Export Report'],
    [`Generated on: ${currentDate}`],
    [`Total Forms: ${forms.length}`],
    [''], // Empty row for spacing
    ['Form Name', 'Form Number', 'Edition Date', 'Type', 'Category', 'Products', 'Coverages', 'Download URL']
  ];

  const rows = forms.map(f => ({
    'Form Name': f.formName || 'Unnamed Form',
    'Form Number': f.formNumber || '',
    'Edition Date': f.effectiveDate || '',
    'Type': f.type || 'ISO',
    'Category': f.category || 'Base Coverage Form',
    'Products': (f.productIds || []).length,
    'Coverages': (f.coverageIds || []).length,
    'Download URL': f.downloadUrl || 'Not Available'
  }));

  // Create worksheet with metadata
  const ws = XLSX.utils.aoa_to_sheet(metadata);

  // Add data rows
  XLSX.utils.sheet_add_json(ws, rows, {
    origin: 'A6',
    skipHeader: false
  });

  // Apply professional styling
  applyWorksheetStyling(ws, 5); // Header is on row 5 (0-indexed)

  // Style the title and metadata
  ws['A1'].s = {
    font: { bold: true, size: 16, color: { rgb: "1E293B" } },
    alignment: { horizontal: "center" }
  };

  ws['A2'].s = {
    font: { italic: true, color: { rgb: "64748B" } }
  };

  ws['A3'].s = {
    font: { bold: true, color: { rgb: "059669" } }
  };

  return ws;
};

/* ---------- import ---------- */
export const sheetToCoverageObjects = ws => {
  const json = XLSX.utils.sheet_to_json(ws, { defval:'' });
  return json.map(r => ({
    name: r['Coverage Name'].trim(),
    coverageCode: r['Coverage Code'].trim(),
    category: r['Category'].trim() || 'Base Coverage',
    parentCoverageCode: r['Parent Coverage Code'].trim() || null,
    states: STATE_COLS.filter(s => String(r[s]).trim() === '1')
  }));
};

