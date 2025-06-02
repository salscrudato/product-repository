// src/utils/pdfChunking.js
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../firebase';

// Lazy load pdfjs to avoid bundle bloat
let pdfjsLib = null;
const loadPdfJs = async () => {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import(/* webpackChunkName: "pdfjs" */ 'pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  return pdfjsLib;
};

/**
 * Extract text from a PDF file (either from Firebase Storage or File object)
 * @param {string|File} source - Firebase storage path or File object
 * @returns {Promise<string>} - Extracted text
 */
export async function extractPdfText(source) {
  await loadPdfJs();
  
  let pdfData;
  
  if (typeof source === 'string') {
    // Firebase Storage path
    const url = await getDownloadURL(ref(storage, source));
    const response = await fetch(url);
    pdfData = await response.arrayBuffer();
  } else {
    // File object
    pdfData = await source.arrayBuffer();
  }
  
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfData) }).promise;
  let text = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    text += pageText + '\n\n';
  }
  
  return text.trim();
}

/**
 * Split text into chunks suitable for AI processing
 * @param {string} text - Text to chunk
 * @param {number} maxTokens - Maximum tokens per chunk (approximate)
 * @param {number} overlap - Number of words to overlap between chunks
 * @returns {Array<string>} - Array of text chunks
 */
export function chunkText(text, maxTokens = 3000, overlap = 200) {
  // Rough approximation: 1 token ≈ 0.75 words
  const maxWords = Math.floor(maxTokens * 0.75);
  const words = text.split(/\s+/);
  
  if (words.length <= maxWords) {
    return [text];
  }
  
  const chunks = [];
  let startIndex = 0;
  
  while (startIndex < words.length) {
    const endIndex = Math.min(startIndex + maxWords, words.length);
    const chunk = words.slice(startIndex, endIndex).join(' ');
    chunks.push(chunk);
    
    // Move start index forward, accounting for overlap
    startIndex = endIndex - overlap;
    
    // Prevent infinite loop if overlap is too large
    if (startIndex <= (chunks.length > 1 ? startIndex - overlap : 0)) {
      startIndex = endIndex;
    }
  }
  
  return chunks;
}

/**
 * Process multiple forms and create chunks with metadata
 * @param {Array} forms - Array of form objects with filePath or downloadUrl
 * @returns {Promise<Array>} - Array of chunks with form metadata
 */
export async function processFormsForAnalysis(forms) {
  const allChunks = [];
  
  for (const form of forms) {
    try {
      let text = '';
      
      if (form.filePath) {
        text = await extractPdfText(form.filePath);
      } else if (form.downloadUrl) {
        // Extract from URL directly
        const response = await fetch(form.downloadUrl);
        const arrayBuffer = await response.arrayBuffer();
        await loadPdfJs();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map(item => item.str).join(' ');
          text += pageText + '\n\n';
        }
      }
      
      if (text.trim()) {
        const chunks = chunkText(text);
        
        chunks.forEach((chunk, index) => {
          allChunks.push({
            text: chunk,
            formId: form.id,
            formName: form.formName || form.formNumber || 'Unnamed Form',
            formNumber: form.formNumber,
            category: form.category,
            chunkIndex: index,
            totalChunks: chunks.length
          });
        });
      }
    } catch (error) {
      console.error(`Failed to process form ${form.id}:`, error);
      // Continue with other forms even if one fails
    }
  }
  
  return allChunks;
}

/**
 * Create a summary of all forms for context
 * @param {Array} forms - Array of form objects
 * @returns {string} - Summary text for AI context
 */
export function createFormsSummary(forms) {
  const summary = forms.map(form => {
    return `Form: ${form.formName || form.formNumber || 'Unnamed'}
Number: ${form.formNumber || 'N/A'}
Category: ${form.category || 'Unknown'}
Type: ${form.type || 'Unknown'}`;
  }).join('\n\n');
  
  return `Available Forms for Analysis:\n\n${summary}`;
}

/**
 * Estimate token count for text (rough approximation)
 * @param {string} text - Text to estimate
 * @returns {number} - Estimated token count
 */
export function estimateTokenCount(text) {
  // Rough approximation: 1 token ≈ 0.75 words
  const words = text.split(/\s+/).length;
  return Math.ceil(words / 0.75);
}
