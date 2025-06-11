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

    // Validate API key
    if (!process.env.REACT_APP_OPENAI_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    const response = await Promise.race([
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: messages,
          max_tokens: 2000,
          temperature: 0.2 // Lower temperature for more consistent analysis
        })
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('OpenAI API request timeout')), 45000)
      )
    ]);

    if (!response.ok) {
      let errorMessage = `OpenAI API error: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error?.message) {
          errorMessage += ` - ${errorData.error.message}`;
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('No analysis content received from OpenAI');
    }

    return content;

  } catch (error) {
    console.error('Error in claim analysis:', error);

    // Provide more specific error messages
    if (error.message.includes('timeout')) {
      throw new Error('Analysis request timed out. Please try again with fewer forms or a simpler question.');
    } else if (error.message.includes('API key')) {
      throw new Error('AI service configuration error. Please contact support.');
    } else if (error.message.includes('rate limit')) {
      throw new Error('Too many requests. Please wait a moment and try again.');
    } else {
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }
}

/**
 * Analyze claim with intelligent chunking for multiple documents
 * @param {string} claimDescription - Description of the claim scenario
 * @param {Array} formChunks - Array of form chunks
 * @param {Array} conversationHistory - Previous conversation
 * @returns {Promise<string>} - Combined analysis response
 */
export async function analyzeClaimWithChunking(claimDescription, formChunks, conversationHistory = []) {
  console.log(`Starting analysis with ${formChunks.length} form chunks`);

  // Filter out error chunks for initial processing
  const validChunks = formChunks.filter(chunk => !chunk.error);
  const errorChunks = formChunks.filter(chunk => chunk.error);

  if (validChunks.length === 0) {
    throw new Error('No valid form content available for analysis. Please check that the selected forms are accessible and contain readable text.');
  }

  // Group chunks by form to ensure complete form analysis
  const chunksByForm = validChunks.reduce((acc, chunk) => {
    const formKey = `${chunk.formId}-${chunk.formName}`;
    if (!acc[formKey]) {
      acc[formKey] = [];
    }
    acc[formKey].push(chunk);
    return acc;
  }, {});

  const formGroups = Object.values(chunksByForm);
  console.log(`Organized into ${formGroups.length} form groups`);

  // If we have few forms or small total content, process all together
  if (formGroups.length <= 3 && validChunks.length <= 8) {
    console.log('Processing all forms together (small dataset)');
    return await analyzeClaimCoverage(claimDescription, validChunks, conversationHistory);
  }

  // For larger datasets, process by form groups and synthesize
  const analyses = [];

  for (let i = 0; i < formGroups.length; i++) {
    const formGroup = formGroups[i];
    const formName = formGroup[0].formName;

    try {
      console.log(`Analyzing form group ${i + 1}/${formGroups.length}: ${formName}`);
      const analysis = await analyzeClaimCoverage(claimDescription, formGroup, conversationHistory);
      analyses.push({
        analysis,
        formName,
        formNumber: formGroup[0].formNumber,
        category: formGroup[0].category,
        chunkCount: formGroup.length
      });
    } catch (error) {
      console.error(`Failed to analyze form ${formName}:`, error);
      analyses.push({
        analysis: `**Error analyzing ${formName}**: ${error.message}`,
        formName,
        formNumber: formGroup[0].formNumber,
        category: formGroup[0].category,
        chunkCount: formGroup.length,
        error: true
      });
    }

    // Small delay between form analyses to prevent rate limiting
    if (i < formGroups.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Add information about any error chunks
  if (errorChunks.length > 0) {
    const errorSummary = errorChunks.map(chunk =>
      `- ${chunk.formName}: ${chunk.text.replace('[Error: ', '').replace(']', '')}`
    ).join('\n');

    analyses.push({
      analysis: `**Forms with Processing Errors:**\n${errorSummary}\n\nThese forms could not be analyzed due to processing errors.`,
      formName: 'Processing Errors',
      error: true
    });
  }

  // Synthesize all analyses into a final response
  console.log(`Synthesizing ${analyses.length} form analyses`);
  return await synthesizeAnalyses(claimDescription, analyses);
}

/**
 * Synthesize multiple form analyses into a coherent final response
 * @param {string} claimDescription - Original claim description
 * @param {Array} analyses - Array of analysis objects with formName, analysis, etc.
 * @returns {Promise<string>} - Synthesized response
 */
async function synthesizeAnalyses(claimDescription, analyses) {
  // Separate successful analyses from errors
  const successfulAnalyses = analyses.filter(a => !a.error);
  const errorAnalyses = analyses.filter(a => a.error);

  // Create a comprehensive prompt for synthesis
  const formsAnalyzed = successfulAnalyses.map(a =>
    `${a.formName} (${a.formNumber || 'No number'}) - ${a.category || 'Unknown category'}`
  ).join('\n');

  const synthesisPrompt = `
You are synthesizing multiple insurance form analyses into a comprehensive final claim determination.

**CLAIM SCENARIO:**
${claimDescription}

**FORMS ANALYZED:**
${formsAnalyzed}

**INDIVIDUAL FORM ANALYSES:**
${successfulAnalyses.map((analysis) => `
=== ${analysis.formName} ===
Form Number: ${analysis.formNumber || 'Not specified'}
Category: ${analysis.category || 'Unknown'}
Chunks Analyzed: ${analysis.chunkCount || 1}

ANALYSIS:
${analysis.analysis}
`).join('\n\n')}

${errorAnalyses.length > 0 ? `
**FORMS WITH ERRORS:**
${errorAnalyses.map(a => a.analysis).join('\n')}
` : ''}

**SYNTHESIS INSTRUCTIONS:**
Provide a comprehensive final analysis that:
1. **Reconciles** any conflicting determinations between forms
2. **Determines** overall coverage (COVERED/NOT COVERED/PARTIALLY COVERED)
3. **Consolidates** all applicable coverages found across forms
4. **Identifies** all relevant exclusions that apply
5. **Prioritizes** primary vs. excess coverages appropriately
6. **Addresses** any gaps or conflicts between forms
7. **Provides** clear, actionable recommendations

Use the standard structured format with clear sections and specific form references.
`;

  try {
    const response = await Promise.race([
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert insurance claims analyst with deep knowledge of policy interactions and coverage determinations. Synthesize multiple form analyses into a definitive final determination.'
            },
            {
              role: 'user',
              content: synthesisPrompt
            }
          ],
          max_tokens: 3000,
          temperature: 0.1
        })
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Synthesis timeout')), 60000)
      )
    ]);

    if (!response.ok) {
      let errorMessage = `OpenAI API error: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error?.message) {
          errorMessage += ` - ${errorData.error.message}`;
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('No synthesis content received from OpenAI');
    }

    return content;

  } catch (error) {
    console.error('Error synthesizing analyses:', error);

    // Return a structured fallback synthesis
    return `## Coverage Analysis Summary

**Claim:** ${claimDescription}

**Forms Analyzed:** ${successfulAnalyses.length} form(s)

### Individual Form Findings

${successfulAnalyses.map((analysis) => `
#### ${analysis.formName}
${analysis.analysis}
`).join('\n')}

${errorAnalyses.length > 0 ? `
### Processing Issues
${errorAnalyses.map(a => a.analysis).join('\n')}
` : ''}

### Final Determination
**Status:** Requires manual review due to synthesis error: ${error.message}

**Recommendation:** Please review the individual form analyses above and consult with a senior claims examiner for final determination.

*Note: This is a compilation of individual analyses due to a technical issue with the synthesis process.*`;
  }
}
