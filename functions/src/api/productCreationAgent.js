/**
 * Product Creation Agent API
 * Autonomous workflow for creating insurance products from PDF coverage forms
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { withErrorHandling } = require('../middleware/errorHandler');
const { requireAuth, rateLimitAI } = require('../middleware/auth');
const { validateAIRequest } = require('../middleware/validation');
const pdfService = require('../services/pdf');
const openaiService = require('../services/openai');
const { logger } = require('../utils/logger');

const db = admin.firestore();

/**
 * Get the autonomous product creation prompt
 */
function getAutonomousProductCreationPrompt() {
  return `
Persona: You are an expert in P&C insurance products with deep knowledge of policy language, coverage structures, and insurance terminology. Your task is to autonomously create a complete insurance product from a coverage form.

**Your Task:** Analyze the provided insurance document and extract ALL information needed to create a complete, production-ready insurance product.

**Key Definitions:**
- **Coverage**: A specific type of protection provided by the insurance policy
- **Sub-Coverage**: A coverage that is subordinate to or dependent on a parent coverage
- **Peril**: A specific cause of loss that is covered
- **Limit**: The maximum amount the insurer will pay for a covered loss
- **Deductible**: The amount the policyholder must pay before insurance coverage applies
- **Exclusion**: Specific situations, conditions, or types of losses that are not covered
- **Condition**: Requirements that must be met for coverage to apply

**Analysis Process:**
1. Identify the product type and create an appropriate product name
2. Extract all coverages, noting parent-child relationships (hierarchies)
3. For each coverage, identify: scope, limits, deductibles, covered perils, exclusions, conditions
4. Identify general conditions and exclusions that apply to the entire policy
5. Extract any product metadata (effective dates, states, etc.)
6. Assess confidence level for each extraction

**Output Format (JSON):**
{
  "productName": "Derived product name from document",
  "productDescription": "2-3 sentence description of the product",
  "productCode": "Suggested product code if identifiable",
  "category": "Product category (e.g., Commercial Property, Homeowners)",
  "coverages": [
    {
      "name": "Coverage name",
      "description": "Coverage description",
      "code": "Coverage code if available",
      "limits": "Limits description",
      "deductibles": "Deductible description",
      "perilsCovered": ["peril1", "peril2"],
      "exclusions": ["exclusion1", "exclusion2"],
      "conditions": ["condition1", "condition2"],
      "parentCoverageName": "Parent coverage name if sub-coverage",
      "confidence": 0-100
    }
  ],
  "metadata": {
    "effectiveDate": "Date if available",
    "states": ["State codes if available"],
    "lineOfBusiness": "Line of business if identifiable",
    "documentType": "Type of document analyzed"
  },
  "confidence": 0-100,
  "extractionNotes": "Any notes about extraction challenges or ambiguities"
}

**Important:** Extract ALL coverages including sub-coverages. Derive a professional product name from the document content. Flag any ambiguities or unclear language. Provide confidence scores for all extractions. Ensure the output is valid JSON that can be parsed.`;
}

/**
 * Create finalized product from extraction result
 */
async function createFinalizedProduct(extractionResult, context, fileName) {
  // Validate extraction result
  if (!extractionResult.productName || !extractionResult.coverages || extractionResult.coverages.length === 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid extraction result: missing product name or coverages'
    );
  }

  // Get user ID (optional auth)
  const userId = context.auth?.uid || 'anonymous';

  // Create product in Firestore
  let productId;
  try {
    const productRef = await db.collection('products').add({
      name: extractionResult.productName,
      description: extractionResult.productDescription,
      productCode: extractionResult.productCode || '',
      category: extractionResult.category || 'General',
      formFileName: fileName || 'user-provided',
      formUploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: userId,
      metadata: extractionResult.metadata || {}
    });

    productId = productRef.id;
    logger.info('Finalized product created', { productId, userId });

    // Create coverages
    const coverageMap = {};
    for (const coverage of extractionResult.coverages) {
      const coverageRef = await db.collection('products').doc(productId)
        .collection('coverages').add({
          name: coverage.name,
          description: coverage.description || '',
          coverageCode: coverage.code || '',
          limits: coverage.limits || '',
          deductibles: coverage.deductibles || '',
          perilsCovered: coverage.perilsCovered || [],
          exclusions: coverage.exclusions || [],
          conditions: coverage.conditions || [],
          parentCoverageName: coverage.parentCoverageName || null,
          confidence: coverage.confidence || 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      coverageMap[coverage.name] = coverageRef.id;
    }

    // Link sub-coverages to parent coverages
    const coverages = await db.collection('products').doc(productId)
      .collection('coverages').get();

    for (const doc of coverages.docs) {
      const coverage = doc.data();
      if (coverage.parentCoverageName) {
        const parentId = coverageMap[coverage.parentCoverageName];
        if (parentId) {
          await doc.ref.update({ parentCoverageId: parentId });
        }
      }
    }

    logger.info('Finalized coverages created', {
      productId,
      count: extractionResult.coverages.length
    });

  } catch (error) {
    logger.error('Finalized product creation failed', { error: error.message });
    throw new functions.https.HttpsError(
      'internal',
      'Failed to create product in database'
    );
  }

  return {
    success: true,
    productId,
    extractionResult,
    message: `Product "${extractionResult.productName}" created successfully with ${extractionResult.coverages.length} coverages`
  };
}

/**
 * Create product from PDF using autonomous agent
 */
const createProductFromPDF = functions.https.onCall(
  withErrorHandling(async (data, context) => {
    // Note: Authentication is optional for this endpoint
    // Users can create products without authentication
    const userId = context.auth?.uid || 'anonymous';

    const { pdfBase64, fileName, extractionResult, isFinalized } = data;

    logger.info('Product creation from PDF requested', {
      userId,
      fileName,
      isFinalized: isFinalized || false,
      hasPdfBase64: !!pdfBase64,
      pdfBase64Length: pdfBase64 ? pdfBase64.length : 0,
      dataKeys: Object.keys(data)
    });

    // If finalized, skip extraction and go straight to product creation
    if (isFinalized && extractionResult) {
      return createFinalizedProduct(extractionResult, context, fileName);
    }

    if (!pdfBase64 || pdfBase64.length === 0) {
      logger.error('Invalid pdfBase64', {
        hasPdfBase64: !!pdfBase64,
        pdfBase64Length: pdfBase64 ? pdfBase64.length : 0,
        pdfBase64Type: typeof pdfBase64
      });
      throw new functions.https.HttpsError(
        'invalid-argument',
        'pdfBase64 is required and must not be empty'
      );
    }

    // Extract text from PDF
    let extractedText;
    try {
      extractedText = await pdfService.extractTextFromBase64(pdfBase64);
    } catch (error) {
      logger.error('PDF extraction failed', { error: error.message });
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Failed to extract text from PDF'
      );
    }

    if (!extractedText) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'PDF appears to be empty or unreadable'
      );
    }

    // Validate and truncate text
    validateAIRequest({ pdfText: extractedText });
    const truncatedText = pdfService.truncateText(extractedText, 100000);

    // Get autonomous product creation prompt
    const systemPrompt = getAutonomousProductCreationPrompt();

    // Generate extraction using OpenAI
    let extractedResult;
    try {
      const result = await openaiService.generateProductSummary(
        truncatedText,
        systemPrompt
      );

      // Parse the response
      const content = result.content
        .replace(/```json\n?/g, '')
        .replace(/\n?```/g, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .trim();

      extractedResult = JSON.parse(content);
    } catch (error) {
      logger.error('AI extraction failed', { error: error.message });
      throw new functions.https.HttpsError(
        'internal',
        'Failed to extract product information from PDF'
      );
    }

    // Validate extraction result
    if (!extractedResult.productName || !extractedResult.coverages || extractedResult.coverages.length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Could not extract valid product information from PDF'
      );
    }

    logger.info('Extraction complete, returning for review', {
      userId: context.auth.uid,
      productName: extractedResult.productName,
      coverageCount: extractedResult.coverages.length
    });

    // Return extraction result for user review (don't create product yet)
    return {
      success: true,
      extractionResult: extractedResult,
      message: `Extracted ${extractedResult.coverages.length} coverages from PDF. Please review and confirm.`
    };
  }, 'createProductFromPDF')
);

module.exports = {
  createProductFromPDF,
  createFinalizedProduct
};

