const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

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
exports.agent = functions.https.onCall(async (data, context) => {
  try {
    const { goal, memory = [], sessionId } = data;
    
    if (!goal) {
      throw new functions.https.HttpsError('invalid-argument', 'Goal is required');
    }

    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: AGENT_SYSTEM_PROMPT },
      ...memory,
      { role: 'user', content: goal }
    ];

    // Call OpenAI
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 1000,
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${functions.config().openai.key}`,
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
