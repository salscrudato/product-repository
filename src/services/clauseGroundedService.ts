/**
 * Clause-Grounded Analysis Service
 *
 * Extends the existing structuredClaimsService with:
 *   - Clause-anchor grounding of existing analyses
 *   - Save/load grounded fields on the existing ClaimsAnalysis document
 *   - Comparison between two analyses over time
 *
 * Uses the existing Firestore path: orgs/{orgId}/claimsAnalyses/{analysisId}
 * Grounded fields are stored as an additional nested object on the document.
 */

import {
  doc, getDoc, getDocs, updateDoc, query, collection,
  orderBy, where, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { orgClaimsAnalysesPath } from '../repositories/paths';
import {
  formVersionChunksPath, formVersionSectionsPath,
} from '../repositories/paths';
import { getClaimsAnalysis, listClaimsAnalyses } from './structuredClaimsService';
import {
  groundAnalysis, compareAnalyses, type GroundingInput,
} from '../engine/clauseGroundedEngine';
import type { ClaimsAnalysis, FormSourceSnapshot } from '../types/claimsAnalysis';
import type { ClauseGroundedFields, AnalysisComparison } from '../types/clauseGroundedAnalysis';
import type { FormIngestionSection, FormIngestionChunk } from '../types/ingestion';
import { getForms, getFormVersion } from './formService';

// ════════════════════════════════════════════════════════════════════════
// Load ingested sections/chunks for form versions
// ════════════════════════════════════════════════════════════════════════

async function loadSections(
  orgId: string, formId: string, versionId: string,
): Promise<FormIngestionSection[]> {
  const snap = await getDocs(
    query(collection(db, formVersionSectionsPath(orgId, formId, versionId)), orderBy('order')),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FormIngestionSection));
}

async function loadChunks(
  orgId: string, formId: string, versionId: string,
): Promise<FormIngestionChunk[]> {
  const snap = await getDocs(
    query(collection(db, formVersionChunksPath(orgId, formId, versionId)), orderBy('index')),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FormIngestionChunk));
}

/**
 * Load ingested data for all form versions in an analysis.
 */
async function loadIngestionData(
  orgId: string,
  formVersionIds: string[],
): Promise<{
  sectionsByFormVersion: Map<string, FormIngestionSection[]>;
  chunksByFormVersion: Map<string, FormIngestionChunk[]>;
  sources: FormSourceSnapshot[];
}> {
  const forms = await getForms(orgId, { archived: false });
  const sectionsByFormVersion = new Map<string, FormIngestionSection[]>();
  const chunksByFormVersion = new Map<string, FormIngestionChunk[]>();
  const sources: FormSourceSnapshot[] = [];

  for (const fvId of formVersionIds) {
    for (const form of forms) {
      const version = await getFormVersion(orgId, form.id, fvId);
      if (version) {
        const [sections, chunks] = await Promise.all([
          loadSections(orgId, form.id, fvId),
          loadChunks(orgId, form.id, fvId),
        ]);
        sectionsByFormVersion.set(fvId, sections);
        chunksByFormVersion.set(fvId, chunks);
        sources.push({
          formId: form.id,
          formVersionId: fvId,
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

  return { sectionsByFormVersion, chunksByFormVersion, sources };
}

// ════════════════════════════════════════════════════════════════════════
// Ground an existing analysis
// ════════════════════════════════════════════════════════════════════════

/**
 * Ground an existing ClaimsAnalysis with clause-anchor citations,
 * open questions, and decision gates. Saves the grounded fields
 * back to the same document.
 */
export async function groundExistingAnalysis(
  orgId: string,
  analysisId: string,
  options?: { priorAnalysisId?: string },
): Promise<ClauseGroundedFields> {
  const analysis = await getClaimsAnalysis(orgId, analysisId);
  if (!analysis) throw new Error(`Analysis ${analysisId} not found`);

  // Load ingestion data for all form versions used
  const { sectionsByFormVersion, chunksByFormVersion, sources } =
    await loadIngestionData(orgId, analysis.formVersionIds);

  // Determine version number
  let analysisVersion = 1;
  if (options?.priorAnalysisId) {
    const prior = await getClaimsAnalysis(orgId, options.priorAnalysisId);
    const priorGrounded = (prior as any)?.clauseGroundedFields as ClauseGroundedFields | undefined;
    if (priorGrounded) {
      analysisVersion = priorGrounded.analysisVersion + 1;
    }
  }

  const input: GroundingInput = {
    structuredFields: analysis.structuredFields,
    existingCitations: analysis.citations,
    sectionsByFormVersion,
    chunksByFormVersion,
    sources,
    outputMarkdown: analysis.outputMarkdown,
  };

  const grounded = groundAnalysis(input, analysisVersion, options?.priorAnalysisId);

  // Save grounded fields back to the document
  const docRef = doc(db, orgClaimsAnalysesPath(orgId), analysisId);
  await updateDoc(docRef, {
    clauseGroundedFields: grounded,
  });

  return grounded;
}

// ════════════════════════════════════════════════════════════════════════
// Read grounded analysis
// ════════════════════════════════════════════════════════════════════════

/**
 * Get a clause-grounded analysis (analysis + grounded fields).
 */
export async function getGroundedAnalysis(
  orgId: string,
  analysisId: string,
): Promise<{ analysis: ClaimsAnalysis; grounded: ClauseGroundedFields | null }> {
  const analysis = await getClaimsAnalysis(orgId, analysisId);
  if (!analysis) throw new Error(`Analysis ${analysisId} not found`);

  const grounded = (analysis as any).clauseGroundedFields as ClauseGroundedFields | undefined;
  return { analysis, grounded: grounded || null };
}

/**
 * List analyses with their grounded status.
 */
export async function listGroundedAnalyses(
  orgId: string,
  limit?: number,
): Promise<Array<{ analysis: ClaimsAnalysis; isGrounded: boolean; version: number }>> {
  const analyses = await listClaimsAnalyses(orgId, { limit });
  return analyses.map(a => {
    const grounded = (a as any).clauseGroundedFields as ClauseGroundedFields | undefined;
    return {
      analysis: a,
      isGrounded: !!grounded,
      version: grounded?.analysisVersion || 0,
    };
  });
}

// ════════════════════════════════════════════════════════════════════════
// Update grounded fields (resolve questions, advance gates)
// ════════════════════════════════════════════════════════════════════════

/**
 * Resolve an open question on a grounded analysis.
 */
export async function resolveOpenQuestion(
  orgId: string,
  analysisId: string,
  questionId: string,
  resolution: string,
): Promise<void> {
  const { analysis, grounded } = await getGroundedAnalysis(orgId, analysisId);
  if (!grounded) throw new Error('Analysis is not clause-grounded');

  const question = grounded.openQuestions.find(q => q.id === questionId);
  if (!question) throw new Error(`Question ${questionId} not found`);

  question.resolved = true;
  question.resolution = resolution;

  const docRef = doc(db, orgClaimsAnalysesPath(orgId), analysisId);
  await updateDoc(docRef, { clauseGroundedFields: grounded });
}

/**
 * Advance a decision gate.
 */
export async function advanceDecisionGate(
  orgId: string,
  analysisId: string,
  gateId: string,
  status: 'approved' | 'rejected' | 'needs_review',
  userId: string,
  notes?: string,
): Promise<void> {
  const { analysis, grounded } = await getGroundedAnalysis(orgId, analysisId);
  if (!grounded) throw new Error('Analysis is not clause-grounded');

  const gate = grounded.decisionGates.find(g => g.id === gateId);
  if (!gate) throw new Error(`Gate ${gateId} not found`);

  gate.status = status;
  gate.decidedBy = userId;
  gate.decidedAt = new Date().toISOString();
  if (notes) gate.notes = notes;

  const docRef = doc(db, orgClaimsAnalysesPath(orgId), analysisId);
  await updateDoc(docRef, { clauseGroundedFields: grounded });
}

// ════════════════════════════════════════════════════════════════════════
// Compare analyses over time
// ════════════════════════════════════════════════════════════════════════

/**
 * Compare two analyses and return the delta.
 */
export async function compareGroundedAnalyses(
  orgId: string,
  leftAnalysisId: string,
  rightAnalysisId: string,
): Promise<AnalysisComparison> {
  const [left, right] = await Promise.all([
    getGroundedAnalysis(orgId, leftAnalysisId),
    getGroundedAnalysis(orgId, rightAnalysisId),
  ]);

  if (!left.grounded) throw new Error(`Left analysis ${leftAnalysisId} is not clause-grounded`);
  if (!right.grounded) throw new Error(`Right analysis ${rightAnalysisId} is not clause-grounded`);

  return compareAnalyses(
    { id: leftAnalysisId, determination: left.analysis.structuredFields.determination, grounded: left.grounded },
    { id: rightAnalysisId, determination: right.analysis.structuredFields.determination, grounded: right.grounded },
  );
}
