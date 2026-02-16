/**
 * Redline Service
 *
 * Orchestrates the comparison between two form editions:
 *   1. Loads ingestion data (sections + chunks) for both versions
 *   2. Loads form-use links and clause links for impact analysis
 *   3. Feeds everything into the redline engine
 *   4. Returns the RedlineComparisonResult
 */

import {
  collection, getDocs, query, where, orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  formVersionChunksPath, formVersionSectionsPath, orgFormUsesPath, orgClauseLinksPath,
} from '../repositories/paths';
import { getForm, getFormVersion } from './formService';
import { runRedlineComparison, type RedlineInput } from '../engine/redlineEngine';
import type { FormIngestionChunk, FormIngestionSection } from '../types/ingestion';
import type { FormUse } from '../types/form';
import type { ClauseLink } from '../types/clause';
import type { RedlineComparisonResult } from '../types/redline';

// ════════════════════════════════════════════════════════════════════════
// Data loaders
// ════════════════════════════════════════════════════════════════════════

async function loadChunks(
  orgId: string, formId: string, versionId: string,
): Promise<FormIngestionChunk[]> {
  const snap = await getDocs(
    query(collection(db, formVersionChunksPath(orgId, formId, versionId)), orderBy('index')),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FormIngestionChunk));
}

async function loadSections(
  orgId: string, formId: string, versionId: string,
): Promise<FormIngestionSection[]> {
  const snap = await getDocs(
    query(collection(db, formVersionSectionsPath(orgId, formId, versionId)), orderBy('order')),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FormIngestionSection));
}

async function loadFormUses(orgId: string, formId: string): Promise<FormUse[]> {
  const snap = await getDocs(
    query(collection(db, orgFormUsesPath(orgId)), where('formId', '==', formId)),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FormUse));
}

async function loadClauseLinksForForm(
  orgId: string, leftVersionId: string, rightVersionId: string,
): Promise<ClauseLink[]> {
  // Load links referencing either form version
  const snap = await getDocs(collection(db, orgClauseLinksPath(orgId)));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as ClauseLink))
    .filter(l =>
      l.formVersionId === leftVersionId || l.formVersionId === rightVersionId,
    );
}

// ════════════════════════════════════════════════════════════════════════
// Main comparison
// ════════════════════════════════════════════════════════════════════════

export interface CompareEditionsOptions {
  orgId: string;
  formId: string;
  leftVersionId: string;
  rightVersionId: string;
}

/**
 * Compare two form editions and return a full redline result.
 */
export async function compareFormEditions(
  options: CompareEditionsOptions,
): Promise<RedlineComparisonResult> {
  const { orgId, formId, leftVersionId, rightVersionId } = options;

  // Load form metadata + both versions in parallel
  const [form, leftVersion, rightVersion] = await Promise.all([
    getForm(orgId, formId),
    getFormVersion(orgId, formId, leftVersionId),
    getFormVersion(orgId, formId, rightVersionId),
  ]);

  // Load ingestion data and links in parallel
  const [
    leftChunks, leftSections,
    rightChunks, rightSections,
    formUses, clauseLinks,
  ] = await Promise.all([
    loadChunks(orgId, formId, leftVersionId),
    loadSections(orgId, formId, leftVersionId),
    loadChunks(orgId, formId, rightVersionId),
    loadSections(orgId, formId, rightVersionId),
    loadFormUses(orgId, formId),
    loadClauseLinksForForm(orgId, leftVersionId, rightVersionId),
  ]);

  const input: RedlineInput = {
    formId,
    formNumber: form?.formNumber || '',
    formTitle: form?.title || '',
    leftVersionId,
    leftEditionDate: leftVersion?.editionDate || '',
    rightVersionId,
    rightEditionDate: rightVersion?.editionDate || '',
    leftSections,
    rightSections,
    leftChunks,
    rightChunks,
    formUses,
    clauseLinks,
  };

  return runRedlineComparison(input);
}
