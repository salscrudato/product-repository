/**
 * Ingestion Service
 *
 * Orchestrates the contract truth layer pipeline:
 *   1. Extracts page-level text from PDF (via pdfjs-dist)
 *   2. Runs the ingestion engine (pure computation)
 *   3. Persists chunks, sections, and ingestion metadata to Firestore
 *
 * Firestore paths:
 *   orgs/{orgId}/forms/{formId}/versions/{fvId}                      — ingestion metadata (nested field)
 *   orgs/{orgId}/forms/{formId}/versions/{fvId}/chunks/{chunkId}     — text chunks
 *   orgs/{orgId}/forms/{formId}/versions/{fvId}/sections/{sectionId} — detected sections
 */

import {
  collection, doc, addDoc, getDocs, getDoc, updateDoc, deleteDoc,
  query, orderBy, Timestamp, writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  formVersionsPath, formVersionChunksPath, formVersionSectionsPath,
} from '../repositories/paths';
import { runIngestionPipeline, type PageText, type IngestionInput } from '../engine/ingestionEngine';
import type {
  IngestionMetadata, IngestionPipelineStatus, FormIngestionChunk,
  FormIngestionSection, IngestionReport,
} from '../types/ingestion';
import type { OrgFormVersion } from '../types/form';

// ════════════════════════════════════════════════════════════════════════
// PDF page extraction (browser-side via pdfjs-dist)
// ════════════════════════════════════════════════════════════════════════

let pdfjsLib: any = null;

async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import(/* webpackChunkName: "pdfjs" */ 'pdfjs-dist');
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;
  }
  return pdfjsLib;
}

/**
 * Extract page-level text from a PDF ArrayBuffer.
 * Returns one PageText per page with char count.
 */
export async function extractPagesFromBuffer(buffer: ArrayBuffer): Promise<PageText[]> {
  const pdfjs = await loadPdfJs();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableFontFace: true }).promise;
  const pages: PageText[] = [];

  const maxPages = Math.min(pdf.numPages, 100);
  for (let i = 1; i <= maxPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((item: any) => item.str).join(' ');
      pages.push({ pageNumber: i, text, charCount: text.length });
      page.cleanup();
    } catch {
      pages.push({ pageNumber: i, text: `[Error extracting page ${i}]`, charCount: 0 });
    }
  }

  pdf.destroy();
  return pages;
}

/**
 * Extract page-level text from a Firebase Storage URL.
 */
export async function extractPagesFromUrl(url: string): Promise<PageText[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);
  const buffer = await response.arrayBuffer();
  return extractPagesFromBuffer(buffer);
}

// ════════════════════════════════════════════════════════════════════════
// Firestore persistence
// ════════════════════════════════════════════════════════════════════════

async function updateIngestionMetadata(
  orgId: string, formId: string, versionId: string,
  data: Partial<IngestionMetadata>,
): Promise<void> {
  const versionRef = doc(db, formVersionsPath(orgId, formId), versionId);
  // Store as a nested 'ingestion' field on the form version document
  const updates: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    updates[`ingestion.${key}`] = value;
  }
  await updateDoc(versionRef, updates);
}

async function persistChunks(
  orgId: string, formId: string, versionId: string,
  chunks: Omit<FormIngestionChunk, 'id'>[],
): Promise<string[]> {
  const colRef = collection(db, formVersionChunksPath(orgId, formId, versionId));
  const ids: string[] = [];

  // Use batched writes (max 500 per batch)
  const batchSize = 450;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = writeBatch(db);
    const slice = chunks.slice(i, i + batchSize);
    for (const chunk of slice) {
      const ref = doc(colRef);
      batch.set(ref, chunk);
      ids.push(ref.id);
    }
    await batch.commit();
  }

  return ids;
}

async function persistSections(
  orgId: string, formId: string, versionId: string,
  sections: Omit<FormIngestionSection, 'id'>[],
): Promise<string[]> {
  const colRef = collection(db, formVersionSectionsPath(orgId, formId, versionId));
  const ids: string[] = [];

  const batch = writeBatch(db);
  for (const section of sections) {
    const ref = doc(colRef);
    batch.set(ref, section);
    ids.push(ref.id);
  }
  await batch.commit();

  return ids;
}

/** Delete all existing chunks and sections before re-ingestion */
async function clearPreviousIngestion(
  orgId: string, formId: string, versionId: string,
): Promise<void> {
  const chunksSnap = await getDocs(collection(db, formVersionChunksPath(orgId, formId, versionId)));
  const sectionsSnap = await getDocs(collection(db, formVersionSectionsPath(orgId, formId, versionId)));

  if (chunksSnap.size + sectionsSnap.size === 0) return;

  const batchSize = 450;
  const allDocs = [...chunksSnap.docs, ...sectionsSnap.docs];
  for (let i = 0; i < allDocs.length; i += batchSize) {
    const batch = writeBatch(db);
    allDocs.slice(i, i + batchSize).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

// ════════════════════════════════════════════════════════════════════════
// Main pipeline orchestration
// ════════════════════════════════════════════════════════════════════════

export interface RunIngestionOptions {
  orgId: string;
  formId: string;
  formVersionId: string;
  /** Provide either a buffer or a URL */
  pdfBuffer?: ArrayBuffer;
  pdfUrl?: string;
}

/**
 * Run the full ingestion pipeline for a form version:
 *   1. Update status → 'extracting'
 *   2. Extract pages from PDF
 *   3. Update status → 'chunking'
 *   4. Run engine pipeline
 *   5. Clear previous chunks/sections
 *   6. Persist new chunks/sections
 *   7. Update status → 'completed' (or 'failed')
 */
export async function runIngestion(options: RunIngestionOptions): Promise<IngestionReport | null> {
  const { orgId, formId, formVersionId, pdfBuffer, pdfUrl } = options;
  const uid = auth.currentUser?.uid || 'system';

  try {
    // 1. Mark extracting
    await updateIngestionMetadata(orgId, formId, formVersionId, {
      status: 'extracting' as IngestionPipelineStatus,
      startedAt: Timestamp.now(),
      triggeredBy: uid,
    });

    // 2. Extract pages
    let pages: PageText[];
    if (pdfBuffer) {
      pages = await extractPagesFromBuffer(pdfBuffer);
    } else if (pdfUrl) {
      pages = await extractPagesFromUrl(pdfUrl);
    } else {
      throw new Error('No PDF source provided (buffer or URL required)');
    }

    // 3. Mark chunking
    await updateIngestionMetadata(orgId, formId, formVersionId, {
      status: 'chunking' as IngestionPipelineStatus,
    });

    // 4. Run engine
    const input: IngestionInput = { pages, formId, formVersionId };
    const result = runIngestionPipeline(input);

    // 5. Clear previous
    await clearPreviousIngestion(orgId, formId, formVersionId);

    // 6. Persist
    const chunkIds = await persistChunks(orgId, formId, formVersionId, result.chunks);
    const sectionIds = await persistSections(orgId, formId, formVersionId, result.sections);

    // Also store combined extracted text on the version doc for legacy compatibility
    const combinedText = result.chunks.map(c => c.text).join('\n\n');
    const versionRef = doc(db, formVersionsPath(orgId, formId), formVersionId);
    await updateDoc(versionRef, {
      extractedText: combinedText,
      indexingStatus: 'completed',
    });

    // 7. Mark completed
    const metadata: Partial<IngestionMetadata> = {
      status: 'completed',
      qualityScore: result.qualityScore,
      warnings: result.warnings,
      totalPages: result.totalPages,
      totalCharacters: result.totalCharacters,
      chunkCount: result.chunks.length,
      sectionCount: result.sections.length,
      completedAt: Timestamp.now(),
    };
    await updateIngestionMetadata(orgId, formId, formVersionId, metadata);

    // Build report (in-memory, for UI)
    const versionSnap = await getDoc(versionRef);
    const version = versionSnap.exists() ? (versionSnap.data() as any) : {};

    const sectionTypeCounts: Record<string, number> = {};
    for (const s of result.sections) {
      sectionTypeCounts[s.type] = (sectionTypeCounts[s.type] || 0) + 1;
    }

    return {
      formId,
      formNumber: version.formNumber || '',
      formTitle: version.title || '',
      formVersionId,
      editionDate: version.editionDate || '',
      ingestion: metadata as IngestionMetadata,
      chunks: result.chunks.map((c, i) => ({ ...c, id: chunkIds[i] || `chunk-${i}` })),
      sections: result.sections.map((s, i) => ({ ...s, id: sectionIds[i] || `section-${i}` })),
      totalAnchors: result.chunks.reduce((sum, c) => sum + c.anchors.length, 0),
      sectionTypeCounts: sectionTypeCounts as any,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await updateIngestionMetadata(orgId, formId, formVersionId, {
      status: 'failed' as IngestionPipelineStatus,
      errorMessage,
      completedAt: Timestamp.now(),
    });
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════════
// Read helpers
// ════════════════════════════════════════════════════════════════════════

export async function getIngestionReport(
  orgId: string, formId: string, formVersionId: string,
): Promise<IngestionReport | null> {
  const versionRef = doc(db, formVersionsPath(orgId, formId), formVersionId);
  const versionSnap = await getDoc(versionRef);
  if (!versionSnap.exists()) return null;

  const versionData = versionSnap.data() as any;
  const ingestion = versionData.ingestion as IngestionMetadata | undefined;
  if (!ingestion || ingestion.status === 'pending') return null;

  // Load chunks
  const chunksSnap = await getDocs(
    query(collection(db, formVersionChunksPath(orgId, formId, formVersionId)), orderBy('index')),
  );
  const chunks = chunksSnap.docs.map(d => ({ id: d.id, ...d.data() } as FormIngestionChunk));

  // Load sections
  const sectionsSnap = await getDocs(
    query(collection(db, formVersionSectionsPath(orgId, formId, formVersionId)), orderBy('order')),
  );
  const sections = sectionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as FormIngestionSection));

  const sectionTypeCounts: Record<string, number> = {};
  for (const s of sections) {
    sectionTypeCounts[s.type] = (sectionTypeCounts[s.type] || 0) + 1;
  }

  return {
    formId,
    formNumber: versionData.formNumber || '',
    formTitle: versionData.title || '',
    formVersionId,
    editionDate: versionData.editionDate || '',
    ingestion,
    chunks,
    sections,
    totalAnchors: chunks.reduce((sum, c) => sum + (c.anchors?.length || 0), 0),
    sectionTypeCounts: sectionTypeCounts as any,
  };
}
