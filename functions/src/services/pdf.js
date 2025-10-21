/**
 * PDF Processing Service
 * Handles PDF text extraction on the backend
 */

const pdfParseModule = require('pdf-parse');
// pdf-parse v2.3.10 exports PDFParse class
const PDFParse = pdfParseModule.PDFParse;
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { logger } = require('../utils/logger');

/**
 * Extract text from PDF buffer
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<string>} Extracted text
 */
const extractTextFromBuffer = async (pdfBuffer) => {
  let tempFilePath = null;
  try {
    logger.debug('Extracting text from PDF buffer', {
      bufferSize: pdfBuffer.length
    });

    // pdf-parse v2.3.10 requires file:// URL, so write buffer to temp file
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `pdf-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`);

    logger.debug('Writing PDF buffer to temp file', { tempFilePath });
    fs.writeFileSync(tempFilePath, pdfBuffer);

    // Create parser with file:// URL
    const fileUrl = `file://${tempFilePath}`;
    const parser = new PDFParse({ url: fileUrl });
    const result = await parser.getText();

    logger.info('PDF text extraction successful', {
      textLength: result.text ? result.text.length : 0,
      textPreview: result.text ? result.text.substring(0, 100) : 'empty'
    });

    return result.text || '';
  } catch (error) {
    logger.error('PDF text extraction failed', {
      error: error.message
    });
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  } finally {
    // Clean up temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        logger.debug('Cleaned up temp PDF file', { tempFilePath });
      } catch (cleanupError) {
        logger.warn('Failed to clean up temp PDF file', {
          tempFilePath,
          error: cleanupError.message
        });
      }
    }
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

