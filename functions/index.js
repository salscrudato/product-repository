const functions = require('firebase-functions');
const axios = require('axios');
require('dotenv').config();

const OPENAI_KEY = process.env.OPENAI_API_KEY;

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