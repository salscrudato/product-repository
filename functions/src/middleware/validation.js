/**
 * Validation Middleware
 * Validates request data against schemas
 */

const { https } = require('firebase-functions');

/**
 * Validate required fields in data
 * @param {Object} data - Request data
 * @param {string[]} requiredFields - Array of required field names
 * @throws {https.HttpsError} If required fields are missing
 */
const validateRequired = (data, requiredFields) => {
  const missing = requiredFields.filter(field => !data[field]);
  
  if (missing.length > 0) {
    throw new https.HttpsError(
      'invalid-argument',
      `Missing required fields: ${missing.join(', ')}`
    );
  }
};

/**
 * Validate string field
 * @param {*} value - Value to validate
 * @param {string} fieldName - Field name for error messages
 * @param {Object} options - Validation options
 * @throws {https.HttpsError} If validation fails
 */
const validateString = (value, fieldName, options = {}) => {
  if (typeof value !== 'string') {
    throw new https.HttpsError(
      'invalid-argument',
      `${fieldName} must be a string`
    );
  }
  
  if (options.minLength && value.length < options.minLength) {
    throw new https.HttpsError(
      'invalid-argument',
      `${fieldName} must be at least ${options.minLength} characters`
    );
  }
  
  if (options.maxLength && value.length > options.maxLength) {
    throw new https.HttpsError(
      'invalid-argument',
      `${fieldName} must be at most ${options.maxLength} characters`
    );
  }
  
  if (options.pattern && !options.pattern.test(value)) {
    throw new https.HttpsError(
      'invalid-argument',
      `${fieldName} format is invalid`
    );
  }
};

/**
 * Validate array field
 * @param {*} value - Value to validate
 * @param {string} fieldName - Field name for error messages
 * @param {Object} options - Validation options
 * @throws {https.HttpsError} If validation fails
 */
const validateArray = (value, fieldName, options = {}) => {
  if (!Array.isArray(value)) {
    throw new https.HttpsError(
      'invalid-argument',
      `${fieldName} must be an array`
    );
  }
  
  if (options.minLength && value.length < options.minLength) {
    throw new https.HttpsError(
      'invalid-argument',
      `${fieldName} must have at least ${options.minLength} items`
    );
  }
  
  if (options.maxLength && value.length > options.maxLength) {
    throw new https.HttpsError(
      'invalid-argument',
      `${fieldName} must have at most ${options.maxLength} items`
    );
  }
};

/**
 * Validate product data
 * @param {Object} data - Product data to validate
 * @throws {https.HttpsError} If validation fails
 */
const validateProductData = (data) => {
  validateRequired(data, ['name', 'formNumber', 'effectiveDate']);
  validateString(data.name, 'name', { minLength: 1, maxLength: 200 });
  validateString(data.formNumber, 'formNumber', { minLength: 1, maxLength: 50 });
  validateString(data.effectiveDate, 'effectiveDate', { minLength: 1, maxLength: 20 });
  
  if (data.productCode) {
    validateString(data.productCode, 'productCode', { maxLength: 50 });
  }
};

/**
 * Validate coverage data
 * @param {Object} data - Coverage data to validate
 * @throws {https.HttpsError} If validation fails
 */
const validateCoverageData = (data) => {
  validateRequired(data, ['coverageName']);
  validateString(data.coverageName, 'coverageName', { minLength: 1, maxLength: 200 });
  
  if (data.scopeOfCoverage) {
    validateString(data.scopeOfCoverage, 'scopeOfCoverage', { maxLength: 5000 });
  }
  
  if (data.limits) {
    validateString(data.limits, 'limits', { maxLength: 1000 });
  }
};

/**
 * Validate AI request data
 * @param {Object} data - AI request data to validate
 * @throws {https.HttpsError} If validation fails
 */
const validateAIRequest = (data) => {
  if (data.messages) {
    validateArray(data.messages, 'messages', { minLength: 1, maxLength: 50 });
  }
  
  if (data.pdfText) {
    validateString(data.pdfText, 'pdfText', { minLength: 1, maxLength: 500000 });
  }
  
  if (data.model) {
    validateString(data.model, 'model', { maxLength: 50 });
  }
};

module.exports = {
  validateRequired,
  validateString,
  validateArray,
  validateProductData,
  validateCoverageData,
  validateAIRequest
};

