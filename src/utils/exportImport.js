import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { db } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  serverTimestamp,
  query,
  where,
  orderBy
} from 'firebase/firestore';

// ============================================================================
// EXPORT/IMPORT SYSTEM ARCHITECTURE
// ============================================================================

/**
 * Supported data types for export/import operations
 */
export const DATA_TYPES = {
  PRODUCTS: 'products',
  COVERAGES: 'coverages', 
  FORMS: 'forms',
  RULES: 'rules',
  PRICING: 'pricing',
  STATES: 'states',
  ALL: 'all'
};

/**
 * Supported export formats
 */
export const EXPORT_FORMATS = {
  XLSX: 'xlsx',
  CSV: 'csv', 
  JSON: 'json',
  PDF: 'pdf'
};

/**
 * Export/Import operation status
 */
export const OPERATION_STATUS = {
  IDLE: 'idle',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning'
};

/**
 * Data validation rules for each data type
 */
export const VALIDATION_RULES = {
  [DATA_TYPES.PRODUCTS]: {
    required: ['name', 'formNumber', 'effectiveDate'],
    optional: ['productCode', 'formDownloadUrl'],
    maxLength: { name: 100, formNumber: 50, productCode: 20 }
  },
  [DATA_TYPES.COVERAGES]: {
    required: ['name', 'coverageCode', 'category'],
    optional: ['limits', 'deductibles', 'states', 'parentCoverageId', 'formIds'],
    maxLength: { name: 100, coverageCode: 20, category: 50 }
  },
  [DATA_TYPES.FORMS]: {
    required: ['formNumber', 'effectiveDate'],
    optional: ['formName', 'type', 'category', 'productIds', 'coverageIds', 'states', 'downloadUrl'],
    maxLength: { formName: 100, formNumber: 50, type: 20, category: 50 }
  },
  [DATA_TYPES.RULES]: {
    required: ['name', 'productId', 'ruleType', 'condition', 'outcome'],
    optional: ['ruleCategory', 'targetId', 'reference', 'proprietary', 'status'],
    maxLength: { name: 100, condition: 500, outcome: 500, reference: 200 }
  },
  [DATA_TYPES.PRICING]: {
    required: ['stepName', 'stepType', 'value'],
    optional: ['coverages', 'states', 'rounding', 'order', 'operand', 'table', 'calculation'],
    maxLength: { stepName: 100, stepType: 20, operand: 50 }
  }
};

/**
 * Default export configurations for each data type
 */
export const DEFAULT_EXPORT_CONFIG = {
  [DATA_TYPES.PRODUCTS]: {
    filename: 'products_export',
    sheetName: 'Products',
    includeMetadata: true,
    includeRelated: false
  },
  [DATA_TYPES.COVERAGES]: {
    filename: 'coverages_export', 
    sheetName: 'Coverages',
    includeMetadata: true,
    includeRelated: true
  },
  [DATA_TYPES.FORMS]: {
    filename: 'forms_export',
    sheetName: 'Forms', 
    includeMetadata: true,
    includeRelated: true
  },
  [DATA_TYPES.RULES]: {
    filename: 'rules_export',
    sheetName: 'Rules',
    includeMetadata: true,
    includeRelated: true
  },
  [DATA_TYPES.PRICING]: {
    filename: 'pricing_export',
    sheetName: 'Pricing',
    includeMetadata: true,
    includeRelated: true
  }
};

// ============================================================================
// CORE EXPORT FUNCTIONS
// ============================================================================

/**
 * Universal export function that handles all data types
 * @param {string} dataType - Type of data to export
 * @param {Object} options - Export configuration options
 * @param {Array} data - Optional pre-loaded data array
 * @returns {Promise<Object>} Export result with status and details
 */
export const exportData = async (dataType, options = {}, data = null) => {
  try {
    const config = { ...DEFAULT_EXPORT_CONFIG[dataType], ...options };
    const exportData = data || await fetchDataForExport(dataType, options);
    
    if (!exportData || exportData.length === 0) {
      return {
        status: OPERATION_STATUS.WARNING,
        message: 'No data found to export',
        data: []
      };
    }

    const processedData = await processDataForExport(dataType, exportData, config);
    const result = await generateExportFile(processedData, config);
    
    return {
      status: OPERATION_STATUS.SUCCESS,
      message: `Successfully exported ${exportData.length} ${dataType} records`,
      data: processedData,
      filename: result.filename
    };
  } catch (error) {
    console.error(`Export failed for ${dataType}:`, error);
    return {
      status: OPERATION_STATUS.ERROR,
      message: `Export failed: ${error.message}`,
      error: error
    };
  }
};

/**
 * Fetch data from Firestore for export
 * @param {string} dataType - Type of data to fetch
 * @param {Object} options - Query options (filters, sorting, etc.)
 * @returns {Promise<Array>} Array of data objects
 */
export const fetchDataForExport = async (dataType, options = {}) => {
  const { productId, filters = {}, sortBy, sortOrder = 'asc' } = options;
  
  let collectionPath = dataType;
  let queryConstraints = [];
  
  // Handle sub-collections (coverages, pricing steps)
  if (dataType === DATA_TYPES.COVERAGES && productId) {
    collectionPath = `products/${productId}/coverages`;
  } else if (dataType === DATA_TYPES.PRICING && productId) {
    collectionPath = `products/${productId}/steps`;
  }
  
  // Apply filters
  Object.entries(filters).forEach(([field, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      queryConstraints.push(where(field, '==', value));
    }
  });
  
  // Apply sorting
  if (sortBy) {
    queryConstraints.push(orderBy(sortBy, sortOrder));
  }
  
  const q = queryConstraints.length > 0 
    ? query(collection(db, collectionPath), ...queryConstraints)
    : collection(db, collectionPath);
    
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Process and transform data for export format
 * @param {string} dataType - Type of data being processed
 * @param {Array} data - Raw data array
 * @param {Object} config - Export configuration
 * @returns {Promise<Array>} Processed data ready for export
 */
export const processDataForExport = async (dataType, data, config) => {
  const processors = {
    [DATA_TYPES.PRODUCTS]: processProductsForExport,
    [DATA_TYPES.COVERAGES]: processCoveragesForExport,
    [DATA_TYPES.FORMS]: processFormsForExport,
    [DATA_TYPES.RULES]: processRulesForExport,
    [DATA_TYPES.PRICING]: processPricingForExport
  };
  
  const processor = processors[dataType];
  if (!processor) {
    throw new Error(`No processor found for data type: ${dataType}`);
  }
  
  return await processor(data, config);
};

// ============================================================================
// DATA PROCESSORS FOR EXPORT
// ============================================================================

/**
 * Process products data for export
 */
export const processProductsForExport = async (data, config) => {
  return data.map(product => ({
    'Product ID': product.id,
    'Product Name': product.name || '',
    'Form Number': product.formNumber || '',
    'Product Code': product.productCode || '',
    'Effective Date': product.effectiveDate || '',
    'Form Download URL': product.formDownloadUrl || '',
    'Created At': product.createdAt?.toDate?.()?.toISOString() || '',
    'Updated At': product.updatedAt?.toDate?.()?.toISOString() || ''
  }));
};

/**
 * Process coverages data for export
 */
export const processCoveragesForExport = async (data, config) => {
  return data.map(coverage => ({
    'Coverage ID': coverage.id,
    'Coverage Name': coverage.name || '',
    'Coverage Code': coverage.coverageCode || '',
    'Category': coverage.category || '',
    'Parent Coverage ID': coverage.parentCoverageId || '',
    'Limits': Array.isArray(coverage.limits) ? coverage.limits.join('; ') : '',
    'Deductibles': Array.isArray(coverage.deductibles) ? coverage.deductibles.join('; ') : '',
    'States': Array.isArray(coverage.states) ? coverage.states.join(', ') : '',
    'Form IDs': Array.isArray(coverage.formIds) ? coverage.formIds.join(', ') : '',
    'Created At': coverage.createdAt?.toDate?.()?.toISOString() || '',
    'Updated At': coverage.updatedAt?.toDate?.()?.toISOString() || ''
  }));
};

/**
 * Process forms data for export
 */
export const processFormsForExport = async (data, config) => {
  return data.map(form => ({
    'Form ID': form.id,
    'Form Name': form.formName || '',
    'Form Number': form.formNumber || '',
    'Effective Date': form.effectiveDate || '',
    'Edition Date': form.formEditionDate || '',
    'Type': form.type || '',
    'Category': form.category || '',
    'Product IDs': Array.isArray(form.productIds) ? form.productIds.join(', ') : '',
    'Coverage IDs': Array.isArray(form.coverageIds) ? form.coverageIds.join(', ') : '',
    'States': Array.isArray(form.states) ? form.states.join(', ') : '',
    'Download URL': form.downloadUrl || '',
    'File Path': form.filePath || '',
    'Created At': form.createdAt?.toDate?.()?.toISOString() || '',
    'Updated At': form.updatedAt?.toDate?.()?.toISOString() || ''
  }));
};

/**
 * Process rules data for export
 */
export const processRulesForExport = async (data, config) => {
  return data.map(rule => ({
    'Rule ID': rule.id,
    'Rule Name': rule.name || '',
    'Product ID': rule.productId || '',
    'Rule Type': rule.ruleType || '',
    'Rule Category': rule.ruleCategory || '',
    'Target ID': rule.targetId || '',
    'Condition': rule.condition || '',
    'Outcome': rule.outcome || '',
    'Reference': rule.reference || '',
    'Proprietary': rule.proprietary ? 'Yes' : 'No',
    'Status': rule.status || 'Active',
    'Created At': rule.createdAt?.toDate?.()?.toISOString() || '',
    'Updated At': rule.updatedAt?.toDate?.()?.toISOString() || ''
  }));
};

/**
 * Process pricing data for export
 */
export const processPricingForExport = async (data, config) => {
  return data.map(step => ({
    'Step ID': step.id,
    'Step Name': step.stepName || '',
    'Step Type': step.stepType || '',
    'Coverages': Array.isArray(step.coverages) ? step.coverages.join(', ') : '',
    'States': Array.isArray(step.states) ? step.states.join(', ') : '',
    'Value': step.value || '',
    'Rounding': step.rounding || '',
    'Order': step.order || '',
    'Operand': step.operand || '',
    'Table': step.table || '',
    'Calculation': step.calculation || '',
    'Created At': step.createdAt?.toDate?.()?.toISOString() || '',
    'Updated At': step.updatedAt?.toDate?.()?.toISOString() || ''
  }));
};

// ============================================================================
// FILE GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate export file in specified format
 * @param {Array} data - Processed data array
 * @param {Object} config - Export configuration
 * @returns {Promise<Object>} File generation result
 */
export const generateExportFile = async (data, config) => {
  const { format = EXPORT_FORMATS.XLSX, filename, sheetName, includeMetadata } = config;

  switch (format) {
    case EXPORT_FORMATS.XLSX:
      return await generateXLSXFile(data, config);
    case EXPORT_FORMATS.CSV:
      return await generateCSVFile(data, config);
    case EXPORT_FORMATS.JSON:
      return await generateJSONFile(data, config);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
};

/**
 * Generate XLSX file
 */
export const generateXLSXFile = async (data, config) => {
  const { filename, sheetName, includeMetadata } = config;
  const timestamp = new Date().toISOString().split('T')[0];
  const finalFilename = `${filename}_${timestamp}.xlsx`;

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();

  // Add metadata if requested
  let startRow = 0;
  if (includeMetadata) {
    const metadata = [
      ['Export Information'],
      ['Generated:', new Date().toLocaleString()],
      ['Records:', data.length],
      [''], // Empty row separator
    ];

    const ws = XLSX.utils.aoa_to_sheet(metadata);
    startRow = metadata.length;

    // Add data starting from the row after metadata
    XLSX.utils.sheet_add_json(ws, data, { origin: `A${startRow + 1}`, skipHeader: false });
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  } else {
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  // Generate and save file
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), finalFilename);

  return { filename: finalFilename, format: EXPORT_FORMATS.XLSX };
};

/**
 * Generate CSV file
 */
export const generateCSVFile = async (data, config) => {
  const { filename } = config;
  const timestamp = new Date().toISOString().split('T')[0];
  const finalFilename = `${filename}_${timestamp}.csv`;

  // Convert data to CSV format
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);

  // Save file
  saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), finalFilename);

  return { filename: finalFilename, format: EXPORT_FORMATS.CSV };
};

/**
 * Generate JSON file
 */
export const generateJSONFile = async (data, config) => {
  const { filename, includeMetadata } = config;
  const timestamp = new Date().toISOString().split('T')[0];
  const finalFilename = `${filename}_${timestamp}.json`;

  let exportData = data;
  if (includeMetadata) {
    exportData = {
      metadata: {
        generated: new Date().toISOString(),
        records: data.length,
        exportedBy: 'Product Hub App'
      },
      data: data
    };
  }

  const json = JSON.stringify(exportData, null, 2);
  saveAs(new Blob([json], { type: 'application/json;charset=utf-8;' }), finalFilename);

  return { filename: finalFilename, format: EXPORT_FORMATS.JSON };
};

// ============================================================================
// CORE IMPORT FUNCTIONS
// ============================================================================

/**
 * Universal import function that handles all data types
 * @param {File} file - File to import
 * @param {string} dataType - Type of data being imported
 * @param {Object} options - Import configuration options
 * @returns {Promise<Object>} Import result with status and details
 */
export const importData = async (file, dataType, options = {}) => {
  try {
    // Validate file
    const fileValidation = validateImportFile(file);
    if (!fileValidation.valid) {
      return {
        status: OPERATION_STATUS.ERROR,
        message: fileValidation.message,
        errors: [fileValidation.message]
      };
    }

    // Parse file data
    const parsedData = await parseImportFile(file);
    if (!parsedData || parsedData.length === 0) {
      return {
        status: OPERATION_STATUS.WARNING,
        message: 'No data found in file',
        data: []
      };
    }

    // Validate data structure
    const validation = await validateImportData(parsedData, dataType, options);
    if (validation.errors.length > 0 && !options.continueOnError) {
      return {
        status: OPERATION_STATUS.ERROR,
        message: `Data validation failed: ${validation.errors.length} errors found`,
        errors: validation.errors,
        warnings: validation.warnings
      };
    }

    // Process and import data
    const importResult = await processImportData(parsedData, dataType, options);

    return {
      status: validation.errors.length > 0 ? OPERATION_STATUS.WARNING : OPERATION_STATUS.SUCCESS,
      message: `Import completed: ${importResult.successful} successful, ${importResult.failed} failed`,
      successful: importResult.successful,
      failed: importResult.failed,
      errors: [...validation.errors, ...importResult.errors],
      warnings: validation.warnings
    };

  } catch (error) {
    console.error(`Import failed for ${dataType}:`, error);
    return {
      status: OPERATION_STATUS.ERROR,
      message: `Import failed: ${error.message}`,
      error: error
    };
  }
};

/**
 * Validate import file format and size
 * @param {File} file - File to validate
 * @returns {Object} Validation result
 */
export const validateImportFile = (file) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv',
    'application/json'
  ];

  if (!file) {
    return { valid: false, message: 'No file selected' };
  }

  if (file.size > maxSize) {
    return { valid: false, message: 'File size exceeds 10MB limit' };
  }

  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv|json)$/i)) {
    return { valid: false, message: 'Unsupported file format. Please use XLSX, XLS, CSV, or JSON files.' };
  }

  return { valid: true };
};

/**
 * Parse import file based on format
 * @param {File} file - File to parse
 * @returns {Promise<Array>} Parsed data array
 */
export const parseImportFile = async (file) => {
  const fileExtension = file.name.split('.').pop().toLowerCase();

  switch (fileExtension) {
    case 'xlsx':
    case 'xls':
      return await parseExcelFile(file);
    case 'csv':
      return await parseCSVFile(file);
    case 'json':
      return await parseJSONFile(file);
    default:
      throw new Error(`Unsupported file format: ${fileExtension}`);
  }
};

/**
 * Parse Excel file
 */
export const parseExcelFile = async (file) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON, skipping metadata rows if present
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // Find the header row (first row with meaningful data)
  let headerRowIndex = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] && data[i].length > 0 && typeof data[i][0] === 'string' && data[i][0].trim()) {
      // Check if this looks like a header row (contains common field names)
      const firstCell = data[i][0].toLowerCase();
      if (firstCell.includes('id') || firstCell.includes('name') || firstCell.includes('number')) {
        headerRowIndex = i;
        break;
      }
    }
  }

  // Extract headers and data
  const headers = data[headerRowIndex];
  const rows = data.slice(headerRowIndex + 1).filter(row => row && row.some(cell => cell !== null && cell !== ''));

  // Convert to objects
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      if (header) {
        obj[header] = row[index] || '';
      }
    });
    return obj;
  });
};

/**
 * Parse CSV file
 */
export const parseCSVFile = async (file) => {
  const text = await file.text();
  const workbook = XLSX.read(text, { type: 'string' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
};

/**
 * Parse JSON file
 */
export const parseJSONFile = async (file) => {
  const text = await file.text();
  const json = JSON.parse(text);

  // Handle different JSON structures
  if (Array.isArray(json)) {
    return json;
  } else if (json.data && Array.isArray(json.data)) {
    return json.data;
  } else if (typeof json === 'object') {
    return [json];
  }

  throw new Error('Invalid JSON structure. Expected array or object with data property.');
};

/**
 * Validate imported data against schema
 * @param {Array} data - Parsed data array
 * @param {string} dataType - Type of data being validated
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} Validation result with errors and warnings
 */
export const validateImportData = async (data, dataType, options = {}) => {
  const rules = VALIDATION_RULES[dataType];
  if (!rules) {
    return { errors: [`No validation rules found for data type: ${dataType}`], warnings: [] };
  }

  const errors = [];
  const warnings = [];

  data.forEach((row, index) => {
    const rowNumber = index + 1;

    // Check required fields
    rules.required.forEach(field => {
      const value = getFieldValue(row, field);
      if (!value || value.toString().trim() === '') {
        errors.push(`Row ${rowNumber}: Missing required field '${field}'`);
      }
    });

    // Check field lengths
    if (rules.maxLength) {
      Object.entries(rules.maxLength).forEach(([field, maxLen]) => {
        const value = getFieldValue(row, field);
        if (value && value.toString().length > maxLen) {
          warnings.push(`Row ${rowNumber}: Field '${field}' exceeds maximum length of ${maxLen} characters`);
        }
      });
    }

    // Data type specific validations
    if (dataType === DATA_TYPES.PRODUCTS) {
      validateProductRow(row, rowNumber, errors, warnings);
    } else if (dataType === DATA_TYPES.COVERAGES) {
      validateCoverageRow(row, rowNumber, errors, warnings);
    } else if (dataType === DATA_TYPES.FORMS) {
      validateFormRow(row, rowNumber, errors, warnings);
    } else if (dataType === DATA_TYPES.RULES) {
      validateRuleRow(row, rowNumber, errors, warnings);
    } else if (dataType === DATA_TYPES.PRICING) {
      validatePricingRow(row, rowNumber, errors, warnings);
    }
  });

  return { errors, warnings };
};

/**
 * Get field value from row object (handles different field name formats)
 */
const getFieldValue = (row, fieldName) => {
  // Try exact match first
  if (row[fieldName] !== undefined) {
    return row[fieldName];
  }

  // Try common variations
  const variations = [
    fieldName.toLowerCase(),
    fieldName.toUpperCase(),
    fieldName.replace(/([A-Z])/g, ' $1').trim(), // camelCase to space separated
    fieldName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, ''), // camelCase to snake_case
  ];

  for (const variation of variations) {
    if (row[variation] !== undefined) {
      return row[variation];
    }
  }

  return null;
};

// ============================================================================
// DATA TYPE SPECIFIC VALIDATORS
// ============================================================================

/**
 * Validate product row data
 */
const validateProductRow = (row, rowNumber, errors, warnings) => {
  const effectiveDate = getFieldValue(row, 'effectiveDate') || getFieldValue(row, 'Effective Date');
  if (effectiveDate && !isValidDate(effectiveDate)) {
    errors.push(`Row ${rowNumber}: Invalid effective date format`);
  }
};

/**
 * Validate coverage row data
 */
const validateCoverageRow = (row, rowNumber, errors, warnings) => {
  const category = getFieldValue(row, 'category') || getFieldValue(row, 'Category');
  const validCategories = ['Base Coverage', 'Optional Coverage', 'Additional Coverage'];
  if (category && !validCategories.includes(category)) {
    warnings.push(`Row ${rowNumber}: Unknown coverage category '${category}'`);
  }
};

/**
 * Validate form row data
 */
const validateFormRow = (row, rowNumber, errors, warnings) => {
  const type = getFieldValue(row, 'type') || getFieldValue(row, 'Type');
  const validTypes = ['ISO', 'AAIS', 'Proprietary'];
  if (type && !validTypes.includes(type)) {
    warnings.push(`Row ${rowNumber}: Unknown form type '${type}'`);
  }
};

/**
 * Validate rule row data
 */
const validateRuleRow = (row, rowNumber, errors, warnings) => {
  const ruleType = getFieldValue(row, 'ruleType') || getFieldValue(row, 'Rule Type');
  const validRuleTypes = ['Product', 'Coverage', 'Forms'];
  if (ruleType && !validRuleTypes.includes(ruleType)) {
    warnings.push(`Row ${rowNumber}: Unknown rule type '${ruleType}'`);
  }
};

/**
 * Validate pricing row data
 */
const validatePricingRow = (row, rowNumber, errors, warnings) => {
  const stepType = getFieldValue(row, 'stepType') || getFieldValue(row, 'Step Type');
  const validStepTypes = ['factor', 'operand'];
  if (stepType && !validStepTypes.includes(stepType)) {
    errors.push(`Row ${rowNumber}: Invalid step type '${stepType}'. Must be 'factor' or 'operand'`);
  }

  const value = getFieldValue(row, 'value') || getFieldValue(row, 'Value');
  if (stepType === 'factor' && value && isNaN(parseFloat(value))) {
    errors.push(`Row ${rowNumber}: Invalid numeric value for factor step`);
  }
};

/**
 * Check if date string is valid
 */
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

// ============================================================================
// IMPORT PROCESSING FUNCTIONS
// ============================================================================

/**
 * Process and import validated data
 * @param {Array} data - Validated data array
 * @param {string} dataType - Type of data being imported
 * @param {Object} options - Import options
 * @returns {Promise<Object>} Import processing result
 */
export const processImportData = async (data, dataType, options = {}) => {
  const { productId, replaceExisting = false, batchSize = 50 } = options;

  let successful = 0;
  let failed = 0;
  const errors = [];

  try {
    // Process data in batches
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchResult = await processBatch(batch, dataType, { productId, replaceExisting });

      successful += batchResult.successful;
      failed += batchResult.failed;
      errors.push(...batchResult.errors);
    }

    return { successful, failed, errors };
  } catch (error) {
    console.error('Import processing failed:', error);
    return {
      successful,
      failed: data.length - successful,
      errors: [...errors, `Batch processing failed: ${error.message}`]
    };
  }
};

/**
 * Process a batch of data records
 */
const processBatch = async (batch, dataType, options) => {
  const writeBatchRef = writeBatch(db);
  let successful = 0;
  let failed = 0;
  const errors = [];

  try {
    for (const row of batch) {
      try {
        const processedData = await transformImportRow(row, dataType, options);
        const docRef = await getDocumentReference(dataType, processedData, options);

        writeBatchRef.set(docRef, {
          ...processedData,
          importedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: !options.replaceExisting });

        successful++;
      } catch (error) {
        failed++;
        errors.push(`Failed to process row: ${error.message}`);
      }
    }

    await writeBatchRef.commit();
    return { successful, failed, errors };
  } catch (error) {
    return {
      successful: 0,
      failed: batch.length,
      errors: [`Batch commit failed: ${error.message}`]
    };
  }
};

/**
 * Transform import row to Firestore document format
 */
const transformImportRow = async (row, dataType, options) => {
  const transformers = {
    [DATA_TYPES.PRODUCTS]: transformProductRow,
    [DATA_TYPES.COVERAGES]: transformCoverageRow,
    [DATA_TYPES.FORMS]: transformFormRow,
    [DATA_TYPES.RULES]: transformRuleRow,
    [DATA_TYPES.PRICING]: transformPricingRow
  };

  const transformer = transformers[dataType];
  if (!transformer) {
    throw new Error(`No transformer found for data type: ${dataType}`);
  }

  return await transformer(row, options);
};

/**
 * Get document reference for import data
 */
const getDocumentReference = async (dataType, data, options) => {
  const { productId } = options;

  switch (dataType) {
    case DATA_TYPES.PRODUCTS:
      return doc(collection(db, 'products'));
    case DATA_TYPES.COVERAGES:
      if (!productId) throw new Error('Product ID required for coverage import');
      return doc(collection(db, `products/${productId}/coverages`));
    case DATA_TYPES.FORMS:
      return doc(collection(db, 'forms'));
    case DATA_TYPES.RULES:
      return doc(collection(db, 'rules'));
    case DATA_TYPES.PRICING:
      if (!productId) throw new Error('Product ID required for pricing import');
      return doc(collection(db, `products/${productId}/steps`));
    default:
      throw new Error(`Unknown data type: ${dataType}`);
  }
};

// ============================================================================
// ROW TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Transform product row for import
 */
const transformProductRow = async (row, options) => {
  return {
    name: getFieldValue(row, 'name') || getFieldValue(row, 'Product Name') || '',
    formNumber: getFieldValue(row, 'formNumber') || getFieldValue(row, 'Form Number') || '',
    productCode: getFieldValue(row, 'productCode') || getFieldValue(row, 'Product Code') || '',
    effectiveDate: getFieldValue(row, 'effectiveDate') || getFieldValue(row, 'Effective Date') || '',
    formDownloadUrl: getFieldValue(row, 'formDownloadUrl') || getFieldValue(row, 'Form Download URL') || '',
    createdAt: serverTimestamp()
  };
};

/**
 * Transform coverage row for import
 */
const transformCoverageRow = async (row, options) => {
  const limits = getFieldValue(row, 'limits') || getFieldValue(row, 'Limits') || '';
  const deductibles = getFieldValue(row, 'deductibles') || getFieldValue(row, 'Deductibles') || '';
  const states = getFieldValue(row, 'states') || getFieldValue(row, 'States') || '';
  const formIds = getFieldValue(row, 'formIds') || getFieldValue(row, 'Form IDs') || '';

  return {
    name: getFieldValue(row, 'name') || getFieldValue(row, 'Coverage Name') || '',
    coverageCode: getFieldValue(row, 'coverageCode') || getFieldValue(row, 'Coverage Code') || '',
    category: getFieldValue(row, 'category') || getFieldValue(row, 'Category') || 'Base Coverage',
    parentCoverageId: getFieldValue(row, 'parentCoverageId') || getFieldValue(row, 'Parent Coverage ID') || null,
    limits: limits ? limits.split(';').map(l => l.trim()).filter(Boolean) : [],
    deductibles: deductibles ? deductibles.split(';').map(d => d.trim()).filter(Boolean) : [],
    states: states ? states.split(',').map(s => s.trim()).filter(Boolean) : [],
    formIds: formIds ? formIds.split(',').map(f => f.trim()).filter(Boolean) : [],
    productId: options.productId,
    createdAt: serverTimestamp()
  };
};

/**
 * Transform form row for import
 */
const transformFormRow = async (row, options) => {
  const productIds = getFieldValue(row, 'productIds') || getFieldValue(row, 'Product IDs') || '';
  const coverageIds = getFieldValue(row, 'coverageIds') || getFieldValue(row, 'Coverage IDs') || '';
  const states = getFieldValue(row, 'states') || getFieldValue(row, 'States') || '';

  return {
    formName: getFieldValue(row, 'formName') || getFieldValue(row, 'Form Name') || null,
    formNumber: getFieldValue(row, 'formNumber') || getFieldValue(row, 'Form Number') || '',
    effectiveDate: getFieldValue(row, 'effectiveDate') || getFieldValue(row, 'Effective Date') || '',
    formEditionDate: getFieldValue(row, 'formEditionDate') || getFieldValue(row, 'Edition Date') || '',
    type: getFieldValue(row, 'type') || getFieldValue(row, 'Type') || 'ISO',
    category: getFieldValue(row, 'category') || getFieldValue(row, 'Category') || 'Base Coverage Form',
    productIds: productIds ? productIds.split(',').map(p => p.trim()).filter(Boolean) : [],
    coverageIds: coverageIds ? coverageIds.split(',').map(c => c.trim()).filter(Boolean) : [],
    states: states ? states.split(',').map(s => s.trim()).filter(Boolean) : [],
    downloadUrl: getFieldValue(row, 'downloadUrl') || getFieldValue(row, 'Download URL') || '',
    filePath: getFieldValue(row, 'filePath') || getFieldValue(row, 'File Path') || null,
    createdAt: serverTimestamp()
  };
};

/**
 * Transform rule row for import
 */
const transformRuleRow = async (row, options) => {
  const proprietary = getFieldValue(row, 'proprietary') || getFieldValue(row, 'Proprietary') || '';

  return {
    name: getFieldValue(row, 'name') || getFieldValue(row, 'Rule Name') || '',
    productId: getFieldValue(row, 'productId') || getFieldValue(row, 'Product ID') || '',
    ruleType: getFieldValue(row, 'ruleType') || getFieldValue(row, 'Rule Type') || '',
    ruleCategory: getFieldValue(row, 'ruleCategory') || getFieldValue(row, 'Rule Category') || '',
    targetId: getFieldValue(row, 'targetId') || getFieldValue(row, 'Target ID') || '',
    condition: getFieldValue(row, 'condition') || getFieldValue(row, 'Condition') || '',
    outcome: getFieldValue(row, 'outcome') || getFieldValue(row, 'Outcome') || '',
    reference: getFieldValue(row, 'reference') || getFieldValue(row, 'Reference') || '',
    proprietary: proprietary.toLowerCase() === 'yes' || proprietary.toLowerCase() === 'true',
    status: getFieldValue(row, 'status') || getFieldValue(row, 'Status') || 'Active',
    createdAt: serverTimestamp()
  };
};

/**
 * Transform pricing row for import
 */
const transformPricingRow = async (row, options) => {
  const coverages = getFieldValue(row, 'coverages') || getFieldValue(row, 'Coverages') || '';
  const states = getFieldValue(row, 'states') || getFieldValue(row, 'States') || '';

  return {
    stepName: getFieldValue(row, 'stepName') || getFieldValue(row, 'Step Name') || '',
    stepType: getFieldValue(row, 'stepType') || getFieldValue(row, 'Step Type') || 'factor',
    coverages: coverages ? coverages.split(',').map(c => c.trim()).filter(Boolean) : [],
    states: states ? states.split(',').map(s => s.trim()).filter(Boolean) : [],
    value: parseFloat(getFieldValue(row, 'value') || getFieldValue(row, 'Value') || '1'),
    rounding: getFieldValue(row, 'rounding') || getFieldValue(row, 'Rounding') || 'none',
    order: parseInt(getFieldValue(row, 'order') || getFieldValue(row, 'Order') || '0'),
    operand: getFieldValue(row, 'operand') || getFieldValue(row, 'Operand') || '',
    table: getFieldValue(row, 'table') || getFieldValue(row, 'Table') || '',
    calculation: getFieldValue(row, 'calculation') || getFieldValue(row, 'Calculation') || '',
    createdAt: serverTimestamp()
  };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate import template for a specific data type
 * @param {string} dataType - Type of data template to generate
 * @returns {Promise<Object>} Template generation result
 */
export const generateImportTemplate = async (dataType) => {
  const templates = {
    [DATA_TYPES.PRODUCTS]: [
      {
        'Product Name': 'Sample Product',
        'Form Number': 'SP-001',
        'Product Code': 'SP001',
        'Effective Date': '2024-01-01',
        'Form Download URL': 'https://example.com/form.pdf'
      }
    ],
    [DATA_TYPES.COVERAGES]: [
      {
        'Coverage Name': 'General Liability',
        'Coverage Code': 'GL',
        'Category': 'Base Coverage',
        'Parent Coverage ID': '',
        'Limits': '$1M; $2M',
        'Deductibles': '$1000; $2500',
        'States': 'CA, NY, TX',
        'Form IDs': 'form1, form2'
      }
    ],
    [DATA_TYPES.FORMS]: [
      {
        'Form Name': 'General Liability Coverage Form',
        'Form Number': 'CG-001',
        'Effective Date': '2024-01-01',
        'Edition Date': '2024-01-01',
        'Type': 'ISO',
        'Category': 'Base Coverage Form',
        'Product IDs': 'product1',
        'Coverage IDs': 'coverage1',
        'States': 'CA, NY, TX',
        'Download URL': 'https://example.com/form.pdf'
      }
    ],
    [DATA_TYPES.RULES]: [
      {
        'Rule Name': 'Minimum Premium Rule',
        'Product ID': 'product1',
        'Rule Type': 'Product',
        'Rule Category': 'Pricing',
        'Target ID': '',
        'Condition': 'Premium < $500',
        'Outcome': 'Set minimum premium to $500',
        'Reference': 'Underwriting Guidelines',
        'Proprietary': 'No',
        'Status': 'Active'
      }
    ],
    [DATA_TYPES.PRICING]: [
      {
        'Step Name': 'Base Rate',
        'Step Type': 'factor',
        'Coverages': 'General Liability',
        'States': 'CA, NY, TX',
        'Value': '1.0',
        'Rounding': 'none',
        'Order': '1',
        'Operand': '',
        'Table': '',
        'Calculation': ''
      }
    ]
  };

  const templateData = templates[dataType];
  if (!templateData) {
    throw new Error(`No template available for data type: ${dataType}`);
  }

  const config = {
    ...DEFAULT_EXPORT_CONFIG[dataType],
    filename: `${dataType}_import_template`,
    includeMetadata: true
  };

  return await generateExportFile(templateData, config);
};
