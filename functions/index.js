/**
 * Firebase Cloud Functions - Main Entry Point
 * Modernized architecture with modular structure
 */

const functions = require('firebase-functions');
const { onCall } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const axios = require('axios');

// Define the secret
const openaiKey = defineSecret('OPENAI_KEY');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Import modular API functions
const aiAPI = require('./src/api/ai');
const productCreationAgentAPI = require('./src/api/productCreationAgent');

// Get OpenAI API key from environment
const getOpenAIKey = () => {
  if (process.env.OPENAI_KEY) {
    return process.env.OPENAI_KEY;
  }
  if (functions.config().openai && functions.config().openai.key) {
    return functions.config().openai.key;
  }
  throw new Error('OpenAI API key not configured');
};

// Agent system prompt
const AGENT_SYSTEM_PROMPT = `
You are InsuranceAgent, an expert AI assistant for the Product Hub insurance management system.

You have access to the following tools to help insurance product managers:
- fetchProduct(id) - Get product details and associated data
- createProduct(data) - Create a new insurance product
- updateProduct(id, data) - Update existing product information
- fetchCoverages(productId) - Get all coverages for a product
- createCoverage(productId, data) - Add new coverage to a product
- updateCoverage(productId, coverageId, data) - Update existing coverage
- fetchForms(productId) - Get all forms for a product
- createForm(data) - Create a new form
- linkFormToCoverage(formId, productId, coverageId) - Associate form with coverage
- fetchPricingSteps(productId) - Get pricing steps for a product
- createPricingStep(productId, data) - Add new pricing step
- updatePricingStep(productId, stepId, data) - Update pricing step
- fetchRules(productId) - Get rules for a product
- createRule(data) - Create a new business rule
- searchProducts(query) - Search products by name or code

Always return JSON in this exact format:
{
  "thought": "Your reasoning about what to do next",
  "action": "tool_name_to_call",
  "args": { "key": "value" },
  "done": false,
  "final": "Final response when done is true"
}

Be helpful, accurate, and always explain what you're doing. When done is true, provide a comprehensive summary.
`;

// Agent tools implementation
const agentTools = {
  async fetchProduct(id) {
    try {
      const productDoc = await db.collection('products').doc(id).get();
      if (!productDoc.exists) {
        throw new Error(`Product ${id} not found`);
      }
      
      const productData = { id: productDoc.id, ...productDoc.data() };
      
      // Fetch associated coverages
      const coveragesSnap = await db.collection(`products/${id}/coverages`).get();
      productData.coverages = coveragesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      return productData;
    } catch (error) {
      throw new Error(`Failed to fetch product: ${error.message}`);
    }
  },

  async createProduct(data) {
    try {
      const productRef = await db.collection('products').add({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { id: productRef.id, ...data };
    } catch (error) {
      throw new Error(`Failed to create product: ${error.message}`);
    }
  },

  async updateProduct(id, data) {
    try {
      await db.collection('products').doc(id).update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { id, ...data };
    } catch (error) {
      throw new Error(`Failed to update product: ${error.message}`);
    }
  },

  async fetchCoverages(productId) {
    try {
      const coveragesSnap = await db.collection(`products/${productId}/coverages`).get();
      return coveragesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Failed to fetch coverages: ${error.message}`);
    }
  },

  async createCoverage(productId, data) {
    try {
      const coverageRef = await db.collection(`products/${productId}/coverages`).add({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { id: coverageRef.id, ...data };
    } catch (error) {
      throw new Error(`Failed to create coverage: ${error.message}`);
    }
  },

  async updateCoverage(productId, coverageId, data) {
    try {
      await db.collection(`products/${productId}/coverages`).doc(coverageId).update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { id: coverageId, ...data };
    } catch (error) {
      throw new Error(`Failed to update coverage: ${error.message}`);
    }
  },

  async fetchForms(productId) {
    try {
      const formsSnap = await db.collection('forms').where('productIds', 'array-contains', productId).get();
      return formsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Failed to fetch forms: ${error.message}`);
    }
  },

  async createForm(data) {
    try {
      const formRef = await db.collection('forms').add({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { id: formRef.id, ...data };
    } catch (error) {
      throw new Error(`Failed to create form: ${error.message}`);
    }
  },

  async linkFormToCoverage(formId, productId, coverageId) {
    try {
      const linkRef = await db.collection('formCoverages').add({
        formId,
        productId,
        coverageId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { id: linkRef.id, formId, productId, coverageId };
    } catch (error) {
      throw new Error(`Failed to link form to coverage: ${error.message}`);
    }
  },

  async fetchPricingSteps(productId) {
    try {
      const stepsSnap = await db.collection(`products/${productId}/steps`).orderBy('order').get();
      return stepsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Failed to fetch pricing steps: ${error.message}`);
    }
  },

  async createPricingStep(productId, data) {
    try {
      const stepRef = await db.collection(`products/${productId}/steps`).add({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { id: stepRef.id, ...data };
    } catch (error) {
      throw new Error(`Failed to create pricing step: ${error.message}`);
    }
  },

  async updatePricingStep(productId, stepId, data) {
    try {
      await db.collection(`products/${productId}/steps`).doc(stepId).update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { id: stepId, ...data };
    } catch (error) {
      throw new Error(`Failed to update pricing step: ${error.message}`);
    }
  },

  async fetchRules(productId) {
    try {
      const rulesSnap = await db.collection('rules').where('productId', '==', productId).get();
      return rulesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Failed to fetch rules: ${error.message}`);
    }
  },

  async createRule(data) {
    try {
      const ruleRef = await db.collection('rules').add({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { id: ruleRef.id, ...data };
    } catch (error) {
      throw new Error(`Failed to create rule: ${error.message}`);
    }
  },

  async searchProducts(query) {
    try {
      const productsSnap = await db.collection('products').get();
      const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Simple text search (in production, use Algolia or similar)
      const filtered = products.filter(product => 
        product.name?.toLowerCase().includes(query.toLowerCase()) ||
        product.productCode?.toLowerCase().includes(query.toLowerCase()) ||
        product.formNumber?.toLowerCase().includes(query.toLowerCase())
      );
      
      return filtered;
    } catch (error) {
      throw new Error(`Failed to search products: ${error.message}`);
    }
  }
};

// Main agent function
exports.agent = onCall({ secrets: [openaiKey] }, async (request) => {
  try {
    const { goal, memory = [], sessionId } = request.data;

    if (!goal) {
      throw new functions.https.HttpsError('invalid-argument', 'Goal is required');
    }

    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: AGENT_SYSTEM_PROMPT },
      ...memory,
      { role: 'user', content: goal }
    ];

    const apiKey = openaiKey.value()?.trim();

    if (!apiKey) {
      throw new functions.https.HttpsError('internal', 'OpenAI API key not configured');
    }

    // Call OpenAI
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 1000,
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const aiResponse = response.data.choices[0].message.content;
    
    // Parse the JSON response
    let agentStep;
    try {
      agentStep = JSON.parse(aiResponse);
    } catch (parseError) {
      throw new functions.https.HttpsError('internal', 'Failed to parse agent response');
    }

    // Execute the action if specified
    if (agentStep.action && agentTools[agentStep.action]) {
      try {
        const toolResult = await agentTools[agentStep.action](agentStep.args || {});
        agentStep.toolResult = toolResult;
      } catch (toolError) {
        agentStep.toolError = toolError.message;
      }
    }

    return {
      ...agentStep,
      sessionId,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

  } catch (error) {
    console.error('Agent function error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ============================================================================
// OpenAI Proxy Functions (Secure API calls from frontend)
// ============================================================================

/**
 * Generate product summary from PDF text
 * Updated: 2025-10-15 - Enhanced validation and logging
 */
exports.generateProductSummary = onCall({ secrets: [openaiKey] }, async (request) => {
  try {
    const { pdfText, systemPrompt } = request.data;

    // Enhanced logging for debugging
    console.log('generateProductSummary called with:', {
      hasPdfText: !!pdfText,
      pdfTextType: typeof pdfText,
      pdfTextLength: pdfText?.length || 0,
      pdfTextTrimmedLength: pdfText?.trim?.()?.length || 0,
      hasSystemPrompt: !!systemPrompt,
      firstChars: pdfText?.substring?.(0, 100) || 'N/A'
    });

    // Validate pdfText
    if (!pdfText) {
      console.error('pdfText is missing or null');
      throw new functions.https.HttpsError('invalid-argument', 'PDF text is required');
    }

    if (typeof pdfText !== 'string') {
      console.error('pdfText is not a string:', typeof pdfText);
      throw new functions.https.HttpsError('invalid-argument', 'PDF text must be a string');
    }

    if (pdfText.trim().length === 0) {
      console.error('pdfText is empty after trimming');
      throw new functions.https.HttpsError('invalid-argument', 'PDF text cannot be empty');
    }

    console.log('✅ PDF text validation passed, calling OpenAI...');

    const apiKey = openaiKey.value()?.trim();

    if (!apiKey) {
      console.error('OpenAI API key not found in secrets');
      throw new functions.https.HttpsError('internal', 'OpenAI API key not configured');
    }

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt || 'You are an expert insurance analyst.' },
        { role: 'user', content: pdfText }
      ],
      max_tokens: 2000,
      temperature: 0.2
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 45000
    });

    console.log('✅ OpenAI response received successfully');

    return {
      success: true,
      content: response.data.choices[0].message.content,
      usage: response.data.usage
    };

  } catch (error) {
    console.error('Product summary error:', error.response?.data || error.message);
    throw new functions.https.HttpsError(
      'internal',
      error.response?.data?.error?.message || error.message
    );
  }
});

/**
 * Generate chat response
 */
exports.generateChatResponse = onCall({ secrets: [openaiKey] }, async (request) => {
  try {
    const { messages, model = 'gpt-4o-mini', maxTokens = 1000, temperature = 0.7 } = request.data;

    console.log('generateChatResponse called with:', {
      messagesCount: messages?.length,
      model,
      maxTokens,
      temperature
    });

    if (!messages || !Array.isArray(messages)) {
      throw new functions.https.HttpsError('invalid-argument', 'Messages array is required');
    }

    // Access the secret value and clean it
    const apiKey = openaiKey.value()?.trim();

    if (!apiKey) {
      console.error('OpenAI API key not found in secrets');
      throw new functions.https.HttpsError('internal', 'OpenAI API key not configured');
    }

    console.log('API key found, length:', apiKey.length, 'starts with:', apiKey.substring(0, 10));

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model,
      messages,
      max_tokens: maxTokens,
      temperature
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return {
      success: true,
      content: response.data.choices[0].message.content,
      usage: response.data.usage
    };

  } catch (error) {
    console.error('Chat response error:', error.response?.data || error.message);
    throw new functions.https.HttpsError(
      'internal',
      error.response?.data?.error?.message || error.message
    );
  }
});

/**
 * Extract rules from PDF text
 */
exports.extractRules = onCall({ secrets: [openaiKey] }, async (request) => {
  try {
    const { pdfText, systemPrompt } = request.data;

    if (!pdfText) {
      throw new functions.https.HttpsError('invalid-argument', 'PDF text is required');
    }

    const apiKey = openaiKey.value()?.trim();

    if (!apiKey) {
      throw new functions.https.HttpsError('internal', 'OpenAI API key not configured');
    }

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt || 'Extract all business rules, conditions, and logic from this insurance document. Format as a clear, structured list.'
        },
        { role: 'user', content: pdfText }
      ],
      max_tokens: 2000,
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return {
      success: true,
      content: response.data.choices[0].message.content,
      usage: response.data.usage
    };

  } catch (error) {
    console.error('Rules extraction error:', error.response?.data || error.message);
    throw new functions.https.HttpsError(
      'internal',
      error.response?.data?.error?.message || error.message
    );
  }
});

/**
 * Claims analysis
 */
exports.analyzeClaim = onCall({ secrets: [openaiKey] }, async (request) => {
  try {
    const { messages, model = 'gpt-4o', maxTokens = 2000, temperature = 0.2 } = request.data;

    if (!messages || !Array.isArray(messages)) {
      throw new functions.https.HttpsError('invalid-argument', 'Messages array is required');
    }

    const apiKey = openaiKey.value()?.trim();

    if (!apiKey) {
      throw new functions.https.HttpsError('internal', 'OpenAI API key not configured');
    }

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model,
      messages,
      max_tokens: maxTokens,
      temperature
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    return {
      success: true,
      content: response.data.choices[0].message.content,
      usage: response.data.usage
    };

  } catch (error) {
    console.error('Claims analysis error:', error.response?.data || error.message);
    throw new functions.https.HttpsError(
      'internal',
      error.response?.data?.error?.message || error.message
    );
  }
});

// ============================================================================
// MODERNIZED API EXPORTS
// ============================================================================

// AI-powered features (using new modular architecture)
exports.generateProductSummaryV2 = aiAPI.generateProductSummary;
exports.generateChatResponseV2 = aiAPI.generateChatResponse;
exports.analyzeClaimV2 = aiAPI.analyzeClaim;

// Product Creation Agent
exports.createProductFromPDF = productCreationAgentAPI.createProductFromPDF;
