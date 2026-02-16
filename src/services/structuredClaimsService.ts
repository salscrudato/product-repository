/**
 * Structured Claims Analysis Service
 *
 * Stores defensible claims analyses with form-version grounding and citations.
 * Uses published FormVersion extracted text as the retrieval source.
 *
 * Paths:
 *   orgs/{orgId}/claimsAnalyses/{analysisId}
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { orgClaimsAnalysesPath } from '../repositories/paths';
import { getFormVersion, getForms, getFormVersions } from './formService';
import type {
  ClaimsAnalysis,
  ClaimScenario,
  AnalysisCitation,
  AnalysisStructuredFields,
  FormSourceSnapshot,
} from '../types/claimsAnalysis';
import { hashExcerpt, createEmptyStructuredFields } from '../types/claimsAnalysis';
import type { OrgForm, OrgFormVersion } from '../types/form';
import logger, { LOG_CATEGORIES } from '../utils/logger';

// ============================================================================
// Load published form text for analysis
// ============================================================================

/**
 * Load published form versions and their extracted text for use as analysis source.
 * Only published versions are eligible for defensible analysis.
 */
export async function loadPublishedFormSources(
  orgId: string,
  formVersionIds: string[],
): Promise<FormSourceSnapshot[]> {
  const forms = await getForms(orgId, { archived: false });
  const snapshots: FormSourceSnapshot[] = [];

  for (const fvId of formVersionIds) {
    // Find which form this version belongs to
    for (const form of forms) {
      const version = await getFormVersion(orgId, form.id, fvId);
      if (version && version.status === 'published') {
        snapshots.push({
          formId: form.id,
          formVersionId: version.id,
          formNumber: form.formNumber,
          formTitle: form.title,
          editionDate: version.editionDate,
          extractedText: version.extractedText || '',
          status: version.status,
        });
        break;
      }
    }
  }

  return snapshots;
}

/**
 * Get all published form versions for an org (for the picker UI).
 */
export async function getPublishedFormVersionsForPicker(
  orgId: string,
): Promise<Array<{ form: OrgForm; version: OrgFormVersion }>> {
  const forms = await getForms(orgId, { archived: false });
  const result: Array<{ form: OrgForm; version: OrgFormVersion }> = [];

  for (const form of forms) {
    const versions = await getFormVersions(orgId, form.id, 'published');
    for (const v of versions) {
      result.push({ form, version: v });
    }
  }

  return result;
}

// ============================================================================
// Run structured analysis
// ============================================================================

/**
 * Build the system prompt for structured claims analysis.
 * Includes form text and instructs the model to produce citations.
 */
function buildAnalysisPrompt(
  sources: FormSourceSnapshot[],
  scenario: ClaimScenario,
): { systemPrompt: string; userPrompt: string } {
  const formContext = sources.map(s => {
    return `=== FORM: ${s.formNumber} – ${s.formTitle} (Edition ${s.editionDate}) ===
Form Version ID: ${s.formVersionId}

${s.extractedText || '[No extracted text available for this form version.]'}

--- END OF FORM ---`;
  }).join('\n\n');

  const formList = sources.map(s =>
    `- ${s.formNumber} – ${s.formTitle} (Edition ${s.editionDate}, ID: ${s.formVersionId})`
  ).join('\n');

  const systemPrompt = `You are an expert P&C insurance claims analyst. Analyse the claim scenario against ONLY the policy form text provided below. Your analysis must be grounded in the actual form language.

IMPORTANT RULES:
- ONLY reference provisions that appear in the provided form text.
- When citing form language, include the form number, section, and a brief excerpt.
- Do not speculate about provisions not present in the provided text.
- If the forms lack sufficient information for a determination, state that explicitly.
- Use bounded, factual interpretation of form language.

FORMS PROVIDED:
${formList}

DETAILED FORM TEXT:
${formContext}

RESPONSE FORMAT:
Provide your analysis in this exact structure:

## Coverage Determination: [COVERED / NOT COVERED / PARTIALLY COVERED / INSUFFICIENT INFORMATION]

## Summary
[2-3 sentence summary]

## Applicable Coverages
[Bulleted list with form citations, e.g. "Per ${sources[0]?.formNumber || 'form'}, Section I – Coverage A: ..."]

## Relevant Exclusions
[Bulleted list with citations, or "None identified in the provided forms."]

## Conditions and Limitations
[Bulleted list or "None identified."]

## Analysis Details
[Detailed analysis referencing specific form language with section identifiers]

## Recommendations
[Bulleted actionable recommendations]

## Sources
[List each form version used, e.g. "${sources[0]?.formNumber || 'Form'} (${sources[0]?.editionDate || 'Edition'}) – Section X, Y, Z referenced"]`;

  const scenarioText = [
    `Loss Date: ${scenario.lossDate}`,
    `Cause of Loss: ${scenario.causeOfLoss}${scenario.causeOfLossDetail ? ` – ${scenario.causeOfLossDetail}` : ''}`,
    `Damage Types: ${scenario.damageTypes.join(', ')}`,
    scenario.estimatedDamages ? `Estimated Damages: $${scenario.estimatedDamages.toLocaleString()}` : null,
    scenario.lossLocation ? `Location: ${scenario.lossLocation}` : null,
    scenario.claimantName ? `Claimant: ${scenario.claimantName}` : null,
    scenario.policyNumber ? `Policy #: ${scenario.policyNumber}` : null,
    '',
    'Facts / Narrative:',
    scenario.factsNarrative,
  ].filter(Boolean).join('\n');

  if (scenario.additionalFacts && Object.keys(scenario.additionalFacts).length > 0) {
    const additional = Object.entries(scenario.additionalFacts)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    const userPrompt = `Analyse the following claim scenario:\n\n${scenarioText}\n\nAdditional Facts:\n${additional}`;
    return { systemPrompt, userPrompt };
  }

  const userPrompt = `Analyse the following claim scenario:\n\n${scenarioText}`;
  return { systemPrompt, userPrompt };
}

/**
 * Parse structured fields from the analysis markdown output.
 */
function parseStructuredFields(markdown: string): AnalysisStructuredFields {
  const fields = createEmptyStructuredFields();

  // Determination
  const detMatch = markdown.match(/##\s*Coverage Determination:\s*(.*)/i);
  if (detMatch) {
    const raw = detMatch[1].trim().toLowerCase();
    if (raw.includes('not covered')) fields.determination = 'not_covered';
    else if (raw.includes('partially')) fields.determination = 'partially_covered';
    else if (raw.includes('covered')) fields.determination = 'covered';
    else if (raw.includes('insufficient')) fields.determination = 'insufficient_information';
  }

  // Summary
  const summaryMatch = markdown.match(/##\s*Summary\s*\n([\s\S]*?)(?=\n##\s|\n$)/i);
  if (summaryMatch) fields.summary = summaryMatch[1].trim();

  // Helper to extract bullet lists
  const extractBullets = (sectionName: string): string[] => {
    const regex = new RegExp(`##\\s*${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
    const match = markdown.match(regex);
    if (!match) return [];
    return match[1]
      .split('\n')
      .map(l => l.replace(/^[-*•]\s*/, '').trim())
      .filter(l => l.length > 0 && !l.toLowerCase().startsWith('none'));
  };

  fields.applicableCoverages = extractBullets('Applicable Coverages');
  fields.relevantExclusions = extractBullets('Relevant Exclusions');
  fields.conditionsAndLimitations = extractBullets('Conditions and Limitations');
  fields.recommendations = extractBullets('Recommendations');

  return fields;
}

/**
 * Extract citations from the analysis markdown and source text.
 */
function extractCitations(
  markdown: string,
  sources: FormSourceSnapshot[],
): AnalysisCitation[] {
  const citations: AnalysisCitation[] = [];

  // Match patterns like "Per CG 00 01, Section I" or "Form CG 00 01, Coverage A"
  const citationPatterns = [
    /(?:Per|per|See|see|Form|form|Under|under)\s+([\w\s]+\d{2}\s+\d{2})[,.]?\s*(?:Section|section|Coverage|coverage|Exclusion|exclusion|Condition|condition)?\s*([^.;\n]{3,80})/g,
    /\b([\w]{2}\s+\d{2}\s+\d{2})\b[,:]?\s*(?:Section|section)?\s*([IVXLC]+[\s–-]*[A-Z]?[^.;\n]{0,60})/g,
  ];

  for (const pattern of citationPatterns) {
    let match;
    while ((match = pattern.exec(markdown)) !== null) {
      const formRef = match[1].trim();
      const sectionRef = match[2]?.trim() || '';

      // Find matching source
      const source = sources.find(s =>
        s.formNumber.replace(/\s+/g, ' ').includes(formRef.replace(/\s+/g, ' ')) ||
        formRef.replace(/\s+/g, ' ').includes(s.formNumber.replace(/\s+/g, ' '))
      );

      if (source) {
        // Try to find excerpt in form text
        let excerptText = '';
        let locationHint = sectionRef;
        if (source.extractedText && sectionRef) {
          const idx = source.extractedText.toLowerCase().indexOf(sectionRef.toLowerCase().slice(0, 20));
          if (idx >= 0) {
            excerptText = source.extractedText.slice(idx, idx + 200).trim();
            locationHint = sectionRef;
          }
        }

        // Avoid duplicates
        const key = `${source.formVersionId}:${sectionRef}`;
        if (!citations.some(c => `${c.formVersionId}:${c.section}` === key)) {
          citations.push({
            formVersionId: source.formVersionId,
            formLabel: `${source.formNumber} ${source.editionDate}`,
            section: sectionRef,
            excerptHash: hashExcerpt(excerptText || sectionRef),
            locationHint,
            excerptText: excerptText || undefined,
          });
        }
      }
    }
  }

  // Also parse the Sources section if present
  const sourcesMatch = markdown.match(/##\s*Sources\s*\n([\s\S]*?)$/i);
  if (sourcesMatch) {
    const sourceLines = sourcesMatch[1].split('\n').filter(l => l.trim().length > 0);
    for (const line of sourceLines) {
      const source = sources.find(s => line.includes(s.formNumber));
      if (source) {
        const sectionMatch = line.match(/Section[s]?\s+([\w,\s–-]+)/i);
        if (sectionMatch && !citations.some(c => c.formVersionId === source.formVersionId && c.section === sectionMatch[1].trim())) {
          citations.push({
            formVersionId: source.formVersionId,
            formLabel: `${source.formNumber} ${source.editionDate}`,
            section: sectionMatch[1].trim(),
            excerptHash: hashExcerpt(sectionMatch[1].trim()),
            locationHint: sectionMatch[1].trim(),
          });
        }
      }
    }
  }

  return citations;
}

/**
 * Run a structured claims analysis.
 *
 * 1. Loads published form text as source.
 * 2. Sends structured prompt to the AI model.
 * 3. Parses structured fields and citations from the output.
 * 4. Persists the analysis to Firestore.
 *
 * Returns the saved ClaimsAnalysis document.
 */
export async function runStructuredAnalysis(
  orgId: string,
  scenario: ClaimScenario,
  formVersionIds: string[],
  userId: string,
  options?: {
    productVersionId?: string;
    stateCode?: string;
  },
): Promise<ClaimsAnalysis> {
  const requestId = `ca-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startTime = Date.now();

  // 1. Load published form sources
  const sources = await loadPublishedFormSources(orgId, formVersionIds);
  if (sources.length === 0) {
    throw new Error('No published form versions found for the selected IDs. Only published editions can be used for analysis.');
  }

  // 2. Build prompt
  const { systemPrompt, userPrompt } = buildAnalysisPrompt(sources, scenario);

  // 3. Call AI via Cloud Function
  const analyzeClaim = httpsCallable(functions, 'analyzeClaim');
  let outputMarkdown = '';
  let modelId = 'gpt-4o-mini';
  let tokenUsage: { prompt: number; completion: number; total: number } | undefined;

  try {
    const result = await Promise.race([
      analyzeClaim({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        model: modelId,
        maxTokens: 3000,
        temperature: 0.1,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Analysis request timed out after 120 seconds')), 120000)
      ),
    ]) as { data: { success: boolean; content?: string; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } } };

    if (!result.data.success || !result.data.content) {
      throw new Error('AI service returned an unsuccessful or empty response');
    }

    outputMarkdown = result.data.content.trim();

    if (result.data.usage) {
      tokenUsage = {
        prompt: result.data.usage.prompt_tokens,
        completion: result.data.usage.completion_tokens,
        total: result.data.usage.total_tokens,
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    logger.error(LOG_CATEGORIES.AI, 'Claims analysis AI call failed', { requestId }, err as Error);
    throw new Error(`Analysis failed: ${msg}`);
  }

  const latencyMs = Date.now() - startTime;

  // 4. Parse structured fields and citations
  const structuredFields = parseStructuredFields(outputMarkdown);
  const citations = extractCitations(outputMarkdown, sources);

  // 5. Persist to Firestore
  const colRef = collection(db, orgClaimsAnalysesPath(orgId));
  const now = Timestamp.now();

  const docData = {
    orgId,
    productVersionId: options?.productVersionId || null,
    stateCode: options?.stateCode || null,
    formVersionIds,
    scenario,
    outputMarkdown,
    structuredFields,
    citations,
    requestId,
    latencyMs,
    modelId,
    tokenUsage: tokenUsage || null,
    createdAt: now,
    createdBy: userId,
  };

  const docRef = await addDoc(colRef, docData);

  logger.info(LOG_CATEGORIES.AI, 'Structured claims analysis completed', {
    analysisId: docRef.id,
    requestId,
    latencyMs,
    citationCount: citations.length,
    determination: structuredFields.determination,
  });

  return { id: docRef.id, ...docData } as ClaimsAnalysis;
}

// ============================================================================
// Read / list analyses
// ============================================================================

export async function getClaimsAnalysis(
  orgId: string,
  analysisId: string,
): Promise<ClaimsAnalysis | null> {
  const docRef = doc(db, orgClaimsAnalysesPath(orgId), analysisId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ClaimsAnalysis;
}

export async function listClaimsAnalyses(
  orgId: string,
  filters?: { limit?: number },
): Promise<ClaimsAnalysis[]> {
  const colRef = collection(db, orgClaimsAnalysesPath(orgId));
  let q = query(colRef, orderBy('createdAt', 'desc'));
  if (filters?.limit) {
    q = query(colRef, orderBy('createdAt', 'desc'), firestoreLimit(filters.limit));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ClaimsAnalysis));
}

// ============================================================================
// Exported helpers for testing
// ============================================================================

export { parseStructuredFields, extractCitations, buildAnalysisPrompt };
