// src/services/claimsAnalysisService.js

const CLAIMS_ANALYSIS_SYSTEM_PROMPT = `
You are an expert P&C insurance claims analyst. Your role is to analyze claim scenarios against insurance policy forms and determine coverage.

**Your Analysis Process:**
1. **Understand the Claim**: Carefully read the claim description provided by the user
2. **Review Policy Forms**: Analyze the provided insurance form content for relevant coverages, exclusions, and conditions
3. **Determine Coverage**: Assess whether the claim is covered based on the policy language
4. **Identify Applicable Coverages**: List specific coverages that apply to this claim
5. **Note Exclusions**: Identify any exclusions that might apply
6. **Provide Reasoning**: Explain your analysis with specific references to policy language

**Response Format:**
Provide your analysis in the following structured format:

## Coverage Determination: [COVERED/NOT COVERED/PARTIALLY COVERED]

## Summary
[Brief 2-3 sentence summary of your determination]

## Applicable Coverages
[List specific coverages that apply, with form references and section numbers]

## Relevant Exclusions
[List any exclusions that might apply, with specific form references]

## Analysis Details
[Concise explanation of your reasoning, citing specific policy language and form sections]

## Recommendations
[Brief recommendations for claim handling or additional information needed]

**Important Guidelines:**
- Be concise and precise - avoid unnecessary elaboration
- Always cite specific form names, sections, and policy language when possible
- Reference the actual forms provided in your analysis (e.g., "Per Form CG0001, Section II...")
- If information is insufficient, clearly state what additional details are needed
- Consider both coverage grants and exclusions
- Pay attention to policy conditions, limits, and deductibles
- If multiple forms are provided, consider how they interact
- Be conservative in your analysis - when in doubt, note the uncertainty
- Keep responses focused and professional
`;

/**
 * Analyze a claim against selected forms using OpenAI
 * @param {string} claimDescription - Description of the claim scenario
 * @param {Array} formChunks - Array of form chunks with metadata
 * @param {Array} conversationHistory - Previous messages in the conversation
 * @returns {Promise<string>} - AI analysis response
 */
export async function analyzeClaimCoverage(claimDescription, formChunks, conversationHistory = []) {
  try {
    // Prepare context from form chunks
    const formsContext = formChunks.map(chunk => {
      return `=== FORM: ${chunk.formName} ===
Form Number: ${chunk.formNumber || 'Not specified'}
Category: ${chunk.category || 'Not specified'}
Section: Part ${chunk.chunkIndex + 1} of ${chunk.totalChunks}

FORM CONTENT:
${chunk.text}

---`;
    }).join('\n\n');

    // Create forms summary
    const uniqueForms = [...new Set(formChunks.map(chunk => chunk.formName))];
    const formsSummary = `FORMS BEING ANALYZED:
${uniqueForms.map(formName => {
  const formChunk = formChunks.find(chunk => chunk.formName === formName);
  return `- ${formName} (${formChunk.formNumber || 'No number'}) - ${formChunk.category || 'Unknown category'}`;
}).join('\n')}

TOTAL FORMS: ${uniqueForms.length}
TOTAL SECTIONS: ${formChunks.length}

`;

    // Build messages array
    const messages = [
      {
        role: 'system',
        content: CLAIMS_ANALYSIS_SYSTEM_PROMPT
      },
      {
        role: 'system',
        content: `${formsSummary}DETAILED POLICY FORMS CONTENT:\n\n${formsContext}`
      }
    ];

    // Add conversation history
    messages.push(...conversationHistory);

    // Add current claim question
    messages.push({
      role: 'user',
      content: `Please analyze the following claim scenario:\n\n${claimDescription}`
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messages,
        max_tokens: 2000,
        temperature: 0.2 // Lower temperature for more consistent analysis
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || 'No analysis generated';

  } catch (error) {
    console.error('Error in claim analysis:', error);
    throw new Error(`Failed to analyze claim: ${error.message}`);
  }
}

/**
 * Analyze claim with chunked processing for large forms
 * @param {string} claimDescription - Description of the claim scenario
 * @param {Array} formChunks - Array of form chunks
 * @param {Array} conversationHistory - Previous conversation
 * @returns {Promise<string>} - Combined analysis response
 */
export async function analyzeClaimWithChunking(claimDescription, formChunks, conversationHistory = []) {
  // If we have a reasonable number of chunks, process them all at once
  if (formChunks.length <= 5) {
    return await analyzeClaimCoverage(claimDescription, formChunks, conversationHistory);
  }

  // For many chunks, we need to process in batches and synthesize
  const batchSize = 3;
  const analyses = [];

  for (let i = 0; i < formChunks.length; i += batchSize) {
    const batch = formChunks.slice(i, i + batchSize);
    try {
      const analysis = await analyzeClaimCoverage(claimDescription, batch, conversationHistory);
      analyses.push({
        analysis,
        forms: batch.map(chunk => `${chunk.formName} (Part ${chunk.chunkIndex + 1}/${chunk.totalChunks})`)
      });
    } catch (error) {
      console.error(`Failed to analyze batch ${i / batchSize + 1}:`, error);
      analyses.push({
        analysis: `Error analyzing forms: ${error.message}`,
        forms: batch.map(chunk => chunk.formName)
      });
    }
  }

  // Synthesize all analyses into a final response
  return await synthesizeAnalyses(claimDescription, analyses);
}

/**
 * Synthesize multiple analyses into a coherent final response
 * @param {string} claimDescription - Original claim description
 * @param {Array} analyses - Array of analysis objects
 * @returns {Promise<string>} - Synthesized response
 */
async function synthesizeAnalyses(claimDescription, analyses) {
  const synthesisPrompt = `
You are synthesizing multiple claim analyses into a final determination. 

Original Claim: ${claimDescription}

Individual Analyses:
${analyses.map((analysis, index) => `
Analysis ${index + 1} (Forms: ${analysis.forms.join(', ')}):
${analysis.analysis}
`).join('\n\n')}

Please provide a comprehensive final analysis that:
1. Reconciles any conflicting determinations
2. Provides a clear overall coverage determination
3. Lists all applicable coverages found across all forms
4. Notes any exclusions that apply
5. Gives specific recommendations

Use the same structured format as individual analyses.
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert insurance claims analyst synthesizing multiple form analyses into a final determination.'
          },
          {
            role: 'user',
            content: synthesisPrompt
          }
        ],
        max_tokens: 2500,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || 'Failed to synthesize analyses';

  } catch (error) {
    console.error('Error synthesizing analyses:', error);
    // Return a basic synthesis if AI fails
    return `## Coverage Analysis Summary

Based on analysis of multiple forms, here are the key findings:

${analyses.map((analysis, index) => `
### Analysis ${index + 1}
${analysis.analysis}
`).join('\n')}

**Note**: This is a compilation of individual analyses. Please review each section for specific coverage determinations.`;
  }
}
