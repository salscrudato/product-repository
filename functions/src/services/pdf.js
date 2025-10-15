/**
 * PDF Processing Service
 * Handles PDF text extraction on the backend
 */

const pdfParse = require('pdf-parse');
const axios = require('axios');
const { logger } = require('../utils/logger');

/**
 * Extract text from PDF buffer
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<string>} Extracted text
 */
const extractTextFromBuffer = async (pdfBuffer) => {
  try {
    logger.debug('Extracting text from PDF buffer', {
      bufferSize: pdfBuffer.length
    });

    const data = await pdfParse(pdfBuffer);
    
    logger.info('PDF text extraction successful', {
      pages: data.numpages,
      textLength: data.text.length
    });

    return data.text;
  } catch (error) {
    logger.error('PDF text extraction failed', {
      error: error.message
    });
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};

/**
 * Download PDF from URL and extract text
 * @param {string} url - PDF file URL
 * @returns {Promise<string>} Extracted text
 */
const extractTextFromUrl = async (url) => {
  try {
    logger.debug('Downloading PDF from URL', { url });

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      maxContentLength: 50 * 1024 * 1024 // 50MB max
    });

    const buffer = Buffer.from(response.data);
    return extractTextFromBuffer(buffer);
  } catch (error) {
    logger.error('PDF download failed', {
      url,
      error: error.message
    });
    throw new Error(`Failed to download PDF: ${error.message}`);
  }
};

/**
 * Extract text from base64 encoded PDF
 * @param {string} base64Data - Base64 encoded PDF data
 * @returns {Promise<string>} Extracted text
 */
const extractTextFromBase64 = async (base64Data) => {
  try {
    // Remove data URL prefix if present
    const base64String = base64Data.replace(/^data:application\/pdf;base64,/, '');
    
    logger.debug('Extracting text from base64 PDF', {
      dataLength: base64String.length
    });

    const buffer = Buffer.from(base64String, 'base64');
    return extractTextFromBuffer(buffer);
  } catch (error) {
    logger.error('Base64 PDF extraction failed', {
      error: error.message
    });
    throw new Error(`Failed to extract text from base64 PDF: ${error.message}`);
  }
};

/**
 * Truncate text to maximum length
 * @param {string} text - Text to truncate
 * @param {number} maxWords - Maximum number of words
 * @returns {string} Truncated text
 */
const truncateText = (text, maxWords = 100000) => {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) {
    return text;
  }
  
  logger.info('Truncating text', {
    originalWords: words.length,
    maxWords
  });
  
  return words.slice(0, maxWords).join(' ');
};

module.exports = {
  extractTextFromBuffer,
  extractTextFromUrl,
  extractTextFromBase64,
  truncateText
};

