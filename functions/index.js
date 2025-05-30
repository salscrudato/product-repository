const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const fetch = require('node-fetch');
require('dotenv').config();

// Initialize Firebase Admin (only if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const OPENAI_KEY = process.env.OPENAI_API_KEY;
// Get API keys from environment config
const NEWS_KEY = functions.config().newsapi?.key;
const OPENAI_CONFIG_KEY = functions.config().openai?.key;

exports.generateSummary = functions.https.onCall(async (data) => {
  const { formText } = data;
  if (!formText) throw new functions.https.HttpsError('invalid-argument', 'No form text provided');
  try {
    const prompt = `Act as a Property & Casualty Insurance product expert. You must fundamentally understand, from a first priniples basic, insurance products, what defines a coverage, how to identify a coverage from a concept, etc.. Insurance coverage is a defined provision in an insurance policy that protects against a specific peril or risk by covering a designated subject (such as a person, property, or liability) and detailing the compensation or benefits provided for resulting losses. It specifies the coverage limits (per occurrence and aggregate), the conditions and exclusions that restrict or govern the coverage, and any deductible the insured must pay before the coverage applies. Your objective is to review the following text and respond with a definition in the following format: ***Form Name*** <actual form name> (new line) ***Category*** <actual category: Opetions are "Base Coverage Form", "Coverage Endrsement", "Exclusion", "Notice", "Other - Dec, Proposal, etc." (new line) ***Form Summary*** <3-5 sentance overview of the form contents> (new line) ***Coverages*** (new line) (new line per coverage)***<Coverage Name>***: <Name of coverage> (new line) (sub-bullet) <rougly 3 sentance description of the coverage> (new line) ***Key Conditions and Exclustions***: <key conditions and exclustions>\n\n${formText}`;
    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }]
    }, { headers: { Authorization: `Bearer ${OPENAI_KEY}` } });
    return { summary: res.data.choices[0].message.content };
  } catch (err) {
    console.error('OpenAI error', err);
    throw new functions.https.HttpsError('internal', err.message);
  }
});

// Simple test function for news updates
exports.updateNews = functions.https.onRequest(async (req, res) => {
  try {
    // Add CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    console.log('News update function called');

    // For now, just add a test news item
    const testNews = {
      title: "Test Insurance News Article",
      summary: "This is a test article to verify the news feed system is working correctly. The automated news processing system is now operational and ready to fetch real insurance industry updates.",
      source: "Test Source",
      url: "https://example.com/test-news",
      imageUrl: "",
      category: "insurance",
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('newsSummaries').add(testNews);

    res.status(200).json({
      success: true,
      message: 'Test news article added successfully',
      article: testNews.title
    });

  } catch (error) {
    console.error('Error in news update:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});