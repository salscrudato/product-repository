/**
 * Clause-Grounded Analysis Engine
 *
 * Pure computation: existing analysis output + ingestion sections/anchors
 * → cited conclusions, open questions, decision gates, and comparison.
 *
 * No Firestore or network calls. The service layer handles data loading.
 *
 * Pipeline:
 *   1. Parse existing structured fields from markdown
 *   2. Ground each coverage/exclusion/condition to section anchors
 *   3. Detect open questions from gaps in the analysis
 *   4. Build decision gates skeleton
 *   5. Compare two analyses for delta tracking
 */

import type {
  FormIngestionSection,
  FormIngestionChunk,
  ContentAnchor,
  FormSectionType,
} from '../types/ingestion';
import type {
  AnalysisStructuredFields,
  CoverageDetermination,
  AnalysisCitation,
  FormSourceSnapshot,
} from '../types/claimsAnalysis';
import type {
  ClauseAnchorCitation,
  CitedConclusion,
  ConclusionType,
  OpenQuestion,
  OpenQuestionCategory,
  DecisionGate,
  ClauseGroundedFields,
  AnalysisComparison,
  ConclusionDelta,
  QuestionDelta,
  ComparisonChangeType,
} from '../types/clauseGroundedAnalysis';

// ════════════════════════════════════════════════════════════════════════
// Input types
// ════════════════════════════════════════════════════════════════════════

export interface GroundingInput {
  /** Existing analysis structured fields */
  structuredFields: AnalysisStructuredFields;
  /** Existing flat citations (form-level) */
  existingCitations: AnalysisCitation[];
  /** Ingested sections per form version */
  sectionsByFormVersion: Map<string, FormIngestionSection[]>;
  /** Ingested chunks per form version */
  chunksByFormVersion: Map<string, FormIngestionChunk[]>;
  /** Source snapshots for form labels */
  sources: FormSourceSnapshot[];
  /** Raw analysis markdown for deeper parsing */
  outputMarkdown: string;
}

// ════════════════════════════════════════════════════════════════════════
// 1. Ground conclusions to clause anchors
// ════════════════════════════════════════════════════════════════════════

/**
 * Map a conclusion statement to the best-matching section anchors
 * from the ingested form content.
 */
function findAnchorCitations(
  statement: string,
  conclusionId: string,
  sectionsByFormVersion: Map<string, FormIngestionSection[]>,
  chunksByFormVersion: Map<string, FormIngestionChunk[]>,
  sources: FormSourceSnapshot[],
  sectionTypeFilter?: FormSectionType[],
): ClauseAnchorCitation[] {
  const citations: ClauseAnchorCitation[] = [];
  const stLower = statement.toLowerCase();
  const seen = new Set<string>();

  for (const source of sources) {
    const sections = sectionsByFormVersion.get(source.formVersionId) || [];
    const chunks = chunksByFormVersion.get(source.formVersionId) || [];

    // Score sections by keyword overlap with the conclusion statement
    for (const section of sections) {
      if (sectionTypeFilter && !sectionTypeFilter.includes(section.type)) continue;

      const titleWords = section.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const matchScore = titleWords.reduce((score, word) => {
        return score + (stLower.includes(word) ? 1 : 0);
      }, 0);

      if (matchScore === 0) continue;

      // Find best anchor within this section
      const sectionChunks = chunks.filter(c => c.sectionPath === section.path);
      for (const chunk of sectionChunks) {
        for (const anchor of chunk.anchors) {
          const key = `${source.formVersionId}:${anchor.hash}`;
          if (seen.has(key)) continue;

          // Check if anchor text is relevant to the conclusion
          const anchorWords = anchor.anchorText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          const anchorScore = anchorWords.reduce((s, w) => s + (stLower.includes(w) ? 1 : 0), 0);

          if (anchorScore > 0 || matchScore >= 2) {
            seen.add(key);
            citations.push({
              conclusionId,
              formVersionId: source.formVersionId,
              formLabel: `${source.formNumber} ${source.editionDate}`,
              sectionPath: section.path,
              sectionType: section.type,
              anchorHash: anchor.hash,
              anchorSlug: anchor.slug,
              anchorText: anchor.anchorText,
              page: anchor.page,
              excerpt: chunk.text.slice(anchor.offset, anchor.offset + 300).trim(),
              relevance: anchorScore >= 2 ? 'direct' : matchScore >= 2 ? 'supporting' : 'contextual',
            });
          }
        }
      }
    }
  }

  // Sort by relevance (direct first, then supporting, then contextual)
  const relevanceOrder = { direct: 0, supporting: 1, contextual: 2 };
  citations.sort((a, b) => relevanceOrder[a.relevance] - relevanceOrder[b.relevance]);

  return citations.slice(0, 5); // Cap at 5 per conclusion
}

/**
 * Convert structured fields into cited conclusions.
 */
export function buildCitedConclusions(input: GroundingInput): CitedConclusion[] {
  const { structuredFields: sf, sectionsByFormVersion, chunksByFormVersion, sources } = input;
  const conclusions: CitedConclusion[] = [];
  let order = 0;

  // Coverage grants
  for (const coverage of sf.applicableCoverages) {
    const id = `conc-${order}`;
    conclusions.push({
      id,
      order: order++,
      type: 'coverage_grant',
      statement: coverage,
      reasoning: `This coverage applies based on the policy language. ${coverage}`,
      citations: findAnchorCitations(coverage, id, sectionsByFormVersion, chunksByFormVersion, sources, ['coverage', 'insuring_agreement']),
      confidence: sf.determination === 'covered' ? 'high' : 'medium',
    });
  }

  // Exclusions
  for (const exclusion of sf.relevantExclusions) {
    const id = `conc-${order}`;
    conclusions.push({
      id,
      order: order++,
      type: 'exclusion_applies',
      statement: exclusion,
      reasoning: `This exclusion may limit or bar coverage. ${exclusion}`,
      citations: findAnchorCitations(exclusion, id, sectionsByFormVersion, chunksByFormVersion, sources, ['exclusion']),
      confidence: 'medium',
    });
  }

  // Conditions and limitations
  for (const condition of sf.conditionsAndLimitations) {
    const isLimitation = condition.toLowerCase().includes('limit');
    const id = `conc-${order}`;
    conclusions.push({
      id,
      order: order++,
      type: isLimitation ? 'limitation_applies' : 'condition_met',
      statement: condition,
      reasoning: `This ${isLimitation ? 'limitation' : 'condition'} affects the coverage analysis. ${condition}`,
      citations: findAnchorCitations(condition, id, sectionsByFormVersion, chunksByFormVersion, sources, ['condition', 'limits', 'deductibles']),
      confidence: 'medium',
    });
  }

  // If no coverage found
  if (sf.determination === 'not_covered' && sf.applicableCoverages.length === 0) {
    const id = `conc-${order}`;
    conclusions.push({
      id,
      order: order++,
      type: 'no_coverage',
      statement: sf.summary || 'No applicable coverage found in the reviewed forms.',
      reasoning: 'Based on the analysis of all provided forms, no coverage grant applies to this claim scenario.',
      citations: findAnchorCitations(sf.summary, id, sectionsByFormVersion, chunksByFormVersion, sources),
      confidence: sf.determination === 'not_covered' ? 'high' : 'low',
    });
  }

  return conclusions;
}

// ════════════════════════════════════════════════════════════════════════
// 2. Detect open questions
// ════════════════════════════════════════════════════════════════════════

/**
 * Detect open questions ("What I still need to know") from the analysis.
 */
export function detectOpenQuestions(input: GroundingInput): OpenQuestion[] {
  const { structuredFields: sf, outputMarkdown, sources } = input;
  const questions: OpenQuestion[] = [];
  let order = 0;

  // Check for insufficient information determination
  if (sf.determination === 'insufficient_information') {
    questions.push({
      id: `oq-${order}`,
      order: order++,
      category: 'missing_facts',
      question: 'The available information is insufficient for a definitive coverage determination. What additional facts are needed?',
      impact: 'Cannot make a final determination without additional information.',
      affectedConclusionIds: [],
      resolved: false,
    });
  }

  // Check if any recommendations suggest needing more info
  for (const rec of sf.recommendations) {
    const lower = rec.toLowerCase();
    if (lower.includes('verify') || lower.includes('confirm') || lower.includes('obtain') ||
        lower.includes('review additional') || lower.includes('check whether')) {
      questions.push({
        id: `oq-${order}`,
        order: order++,
        category: 'missing_facts',
        question: rec,
        impact: 'Recommended action may affect the final coverage determination.',
        affectedConclusionIds: [],
        resolved: false,
      });
    }
  }

  // Check markdown for explicit uncertainty markers
  const uncertaintyPatterns = [
    /(?:it is unclear|cannot determine|insufficient information|not enough|unable to assess|further review needed|more information is needed)([^.]*\.)/gi,
    /(?:if the (?:insured|policy|endorsement)|depending on whether)([^.]*\.)/gi,
  ];

  for (const pattern of uncertaintyPatterns) {
    let match;
    while ((match = pattern.exec(outputMarkdown)) !== null) {
      const text = (match[0] + (match[1] || '')).trim();
      if (text.length > 20 && !questions.some(q => q.question === text)) {
        questions.push({
          id: `oq-${order}`,
          order: order++,
          category: 'ambiguous_language',
          question: text,
          impact: 'This ambiguity could change the coverage determination.',
          affectedConclusionIds: [],
          resolved: false,
        });
      }
    }
  }

  // Check for missing endorsements/forms
  if (outputMarkdown.toLowerCase().includes('endorsement') &&
      (outputMarkdown.toLowerCase().includes('not provided') || outputMarkdown.toLowerCase().includes('not available'))) {
    questions.push({
      id: `oq-${order}`,
      order: order++,
      category: 'endorsement_unknown',
      question: 'One or more endorsements may modify coverage but were not included in the reviewed forms.',
      impact: 'Endorsements can significantly expand or restrict coverage.',
      affectedConclusionIds: [],
      resolved: false,
    });
  }

  // Check for jurisdiction-specific concerns
  if (outputMarkdown.toLowerCase().includes('state') &&
      (outputMarkdown.toLowerCase().includes('may vary') || outputMarkdown.toLowerCase().includes('jurisdiction'))) {
    questions.push({
      id: `oq-${order}`,
      order: order++,
      category: 'jurisdiction_specific',
      question: 'Coverage may be affected by state-specific regulations or mandates not reflected in the base forms.',
      impact: 'Jurisdictional requirements could override policy terms.',
      affectedConclusionIds: [],
      resolved: false,
    });
  }

  // If only one form was analyzed, note missing forms
  if (sources.length <= 1) {
    questions.push({
      id: `oq-${order}`,
      order: order++,
      category: 'missing_forms',
      question: 'Only one form was analyzed. Are there additional policy forms, endorsements, or schedules that apply?',
      impact: 'Additional forms could grant or restrict coverage.',
      affectedConclusionIds: [],
      resolved: false,
    });
  }

  return questions;
}

// ════════════════════════════════════════════════════════════════════════
// 3. Build decision gates
// ════════════════════════════════════════════════════════════════════════

/**
 * Build default decision gates based on the analysis.
 */
export function buildDecisionGates(
  determination: CoverageDetermination,
  hasOpenQuestions: boolean,
): DecisionGate[] {
  const gates: DecisionGate[] = [
    {
      id: 'gate-initial-review',
      name: 'Initial Analysis Review',
      status: 'pending',
      assigneeRole: 'claims_analyst',
    },
  ];

  if (hasOpenQuestions) {
    gates.push({
      id: 'gate-open-questions',
      name: 'Open Questions Resolution',
      status: 'pending',
      assigneeRole: 'claims_analyst',
    });
  }

  if (determination === 'partially_covered' || determination === 'not_covered') {
    gates.push({
      id: 'gate-supervisor-review',
      name: 'Supervisor Review',
      status: 'pending',
      assigneeRole: 'claims_supervisor',
    });
  }

  gates.push({
    id: 'gate-final-determination',
    name: 'Final Determination',
    status: 'pending',
    assigneeRole: 'coverage_counsel',
  });

  return gates;
}

// ════════════════════════════════════════════════════════════════════════
// 4. Full grounding pipeline
// ════════════════════════════════════════════════════════════════════════

/**
 * Run the full clause-grounding pipeline.
 * Pure function: analysis + ingestion data → grounded fields.
 */
export function groundAnalysis(
  input: GroundingInput,
  analysisVersion: number = 1,
  priorAnalysisId?: string,
): ClauseGroundedFields {
  const conclusions = buildCitedConclusions(input);
  const openQuestions = detectOpenQuestions(input);
  const decisionGates = buildDecisionGates(
    input.structuredFields.determination,
    openQuestions.length > 0,
  );

  return {
    conclusions,
    openQuestions,
    decisionGates,
    analysisVersion,
    priorAnalysisId,
  };
}

// ════════════════════════════════════════════════════════════════════════
// 5. Compare two analyses
// ════════════════════════════════════════════════════════════════════════

/**
 * Compare two clause-grounded analyses to track changes over time.
 */
export function compareAnalyses(
  left: {
    id: string;
    determination: CoverageDetermination;
    grounded: ClauseGroundedFields;
  },
  right: {
    id: string;
    determination: CoverageDetermination;
    grounded: ClauseGroundedFields;
  },
): AnalysisComparison {
  // Conclusion deltas
  const leftConcMap = new Map(left.grounded.conclusions.map(c => [c.statement, c]));
  const rightConcMap = new Map(right.grounded.conclusions.map(c => [c.statement, c]));
  const conclusionDeltas: ConclusionDelta[] = [];

  // Check right conclusions (added or unchanged)
  for (const rc of right.grounded.conclusions) {
    const lc = leftConcMap.get(rc.statement);
    if (!lc) {
      conclusionDeltas.push({
        conclusionId: rc.id,
        type: rc.type,
        statement: rc.statement,
        changeType: 'added',
      });
    } else if (lc.type !== rc.type || lc.confidence !== rc.confidence) {
      conclusionDeltas.push({
        conclusionId: rc.id,
        type: rc.type,
        statement: rc.statement,
        changeType: 'changed',
        previousStatement: lc.statement,
        previousConfidence: lc.confidence,
      });
    } else {
      conclusionDeltas.push({
        conclusionId: rc.id,
        type: rc.type,
        statement: rc.statement,
        changeType: 'unchanged',
      });
    }
  }

  // Check for removed conclusions
  for (const lc of left.grounded.conclusions) {
    if (!rightConcMap.has(lc.statement)) {
      conclusionDeltas.push({
        conclusionId: lc.id,
        type: lc.type,
        statement: lc.statement,
        changeType: 'removed',
      });
    }
  }

  // Question deltas
  const leftQMap = new Map(left.grounded.openQuestions.map(q => [q.question, q]));
  const rightQMap = new Map(right.grounded.openQuestions.map(q => [q.question, q]));
  const questionDeltas: QuestionDelta[] = [];

  for (const rq of right.grounded.openQuestions) {
    const lq = leftQMap.get(rq.question);
    if (!lq) {
      questionDeltas.push({
        questionId: rq.id,
        question: rq.question,
        changeType: 'added',
        newlyResolved: false,
      });
    } else {
      questionDeltas.push({
        questionId: rq.id,
        question: rq.question,
        changeType: rq.resolved !== lq.resolved ? 'changed' : 'unchanged',
        newlyResolved: rq.resolved && !lq.resolved,
      });
    }
  }

  for (const lq of left.grounded.openQuestions) {
    if (!rightQMap.has(lq.question)) {
      questionDeltas.push({
        questionId: lq.id,
        question: lq.question,
        changeType: 'removed',
        newlyResolved: false,
      });
    }
  }

  return {
    leftAnalysisId: left.id,
    rightAnalysisId: right.id,
    leftVersion: left.grounded.analysisVersion,
    rightVersion: right.grounded.analysisVersion,
    determinationChanged: left.determination !== right.determination,
    leftDetermination: left.determination,
    rightDetermination: right.determination,
    conclusionDeltas,
    questionDeltas,
    stats: {
      conclusionsAdded: conclusionDeltas.filter(d => d.changeType === 'added').length,
      conclusionsRemoved: conclusionDeltas.filter(d => d.changeType === 'removed').length,
      conclusionsChanged: conclusionDeltas.filter(d => d.changeType === 'changed').length,
      conclusionsUnchanged: conclusionDeltas.filter(d => d.changeType === 'unchanged').length,
      questionsResolved: questionDeltas.filter(d => d.newlyResolved).length,
      questionsAdded: questionDeltas.filter(d => d.changeType === 'added').length,
      questionsRemoved: questionDeltas.filter(d => d.changeType === 'removed').length,
    },
  };
}
