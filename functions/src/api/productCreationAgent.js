/**
 * Product Creation Agent API
 * Autonomous workflow for creating insurance products from PDF coverage forms
 */

const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const axios = require('axios');
const pdfParse = require('pdf-parse');

const db = admin.firestore();
const openaiKey = defineSecret('OPENAI_KEY');

/**
 * Get the system prompt for autonomous product creation
 */
function getAutonomousProductCreationPrompt() {
  return `You are an expert insurance product architect. Your task is to analyze PDF coverage forms and create comprehensive insurance products.

When analyzing a PDF, extract:
1. Product name and code
2. All coverages with their details (limits, deductibles, scope)
3. Coverage relationships and hierarchies
4. Form associations
5. Pricing structure if available

Return a JSON object with this structure:
{
  "productName": "string",
  "productCode": "string",
  "productType": "string",
  "description": "string",
  "coverages": [
    {
      "name": "string",
      "code": "string",
      "type": "string",
      "scopeOfCoverage": "string",
      "limits": "string",
      "deductible": "string"
    }
  ],
  "forms": ["form names"],
  "metadata": {
    "effectiveDate": "string",
    "expirationDate": "string",
    "jurisdiction": "string"
  }
}`;
}

/**
 * Create finalized product in Firestore
 */
async function createFinalizedProduct(productData, userId) {
  try {
    const productsRef = db.collection('products');
    
    // Create product document
    const productDoc = await productsRef.add({
      name: productData.productName,
      code: productData.productCode,
      type: productData.productType,
      description: productData.description,
      createdAt: new Date(),
      createdBy: userId || 'anonymous',
      status: 'active',
      metadata: productData.metadata || {}
    });

    // Create coverages
    if (productData.coverages && Array.isArray(productData.coverages)) {
      const coveragesRef = productDoc.collection('coverages');
      for (const coverage of productData.coverages) {
        await coveragesRef.add({
          name: coverage.name,
          coverageName: coverage.name,
          code: coverage.code,
          coverageCode: coverage.code,
          type: coverage.type,
          coverageType: coverage.type,
          scopeOfCoverage: coverage.scopeOfCoverage,
          limits: coverage.limits,
          deductible: coverage.deductible,
          createdAt: new Date()
        });
      }
    }

    return {
      success: true,
      productId: productDoc.id,
      message: `Product "${productData.productName}" created successfully`
    };
  } catch (error) {
    console.error('Error creating finalized product:', error);
    throw error;
  }
}

/**
 * Create product from PDF using AI analysis
 */
exports.createProductFromPDF = onCall({ secrets: [openaiKey] }, async (request) => {
  // Authentication required
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  try {
    const { storagePath } = request.data;
    const userId = request.auth.uid;

    if (!storagePath) {
      throw new Error('storagePath is required');
    }

    console.log('Creating product from PDF:', { storagePath, userId });

    // Download PDF from Firebase Storage
    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);
    const [buffer] = await file.download();

    // Extract text from PDF
    const pdfData = await pdfParse(buffer);
    const pdfText = pdfData.text;

    if (!pdfText || pdfText.trim().length === 0) {
      throw new Error('No text extracted from PDF');
    }

    console.log('PDF text extracted:', { length: pdfText.length });

    // Call OpenAI to analyze PDF and extract product structure
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: getAutonomousProductCreationPrompt()
          },
          {
            role: 'user',
            content: `Analyze this insurance coverage form and extract the product structure:\n\n${pdfText}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${openaiKey.value()}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiResponse = response.data.choices[0].message.content;
    console.log('AI response received:', { length: aiResponse.length });

    // Parse AI response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response as JSON');
    }

    const productData = JSON.parse(jsonMatch[0]);
    console.log('Product data parsed:', { productName: productData.productName });

    // Create product in Firestore
    const result = await createFinalizedProduct(productData, userId);

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error in createProductFromPDF:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

