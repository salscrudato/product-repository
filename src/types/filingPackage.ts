/**
 * Filing Package Types
 *
 * Filing-ready export bundles per Change Set (optionally scoped to a state).
 *
 * Firestore: orgs/{orgId}/filingPackages/{packageId}
 * Storage:   /orgs/{orgId}/filingPackages/{packageId}/package.zip
 */

import { Timestamp } from 'firebase/firestore';
import type { VersionedEntityType } from './versioning';
import type { ChangeSetItemAction } from './changeSet';

// ════════════════════════════════════════════════════════════════════════
// Package Status
// ════════════════════════════════════════════════════════════════════════

export type FilingPackageStatus =
  | 'queued'      // Build requested, waiting to start
  | 'building'    // Cloud Function is generating exhibits
  | 'complete'    // Zip is ready in Storage
  | 'failed';     // Build errored out

export const FILING_PACKAGE_STATUS_CONFIG: Record<FilingPackageStatus, {
  label: string; color: string;
}> = {
  queued:   { label: 'Queued',   color: '#6B7280' },
  building: { label: 'Building', color: '#F59E0B' },
  complete: { label: 'Complete', color: '#10B981' },
  failed:   { label: 'Failed',   color: '#EF4444' },
};

// ════════════════════════════════════════════════════════════════════════
// Scope
// ════════════════════════════════════════════════════════════════════════

export type FilingPackageScope = 'full' | 'state';

// ════════════════════════════════════════════════════════════════════════
// Artifact Snapshot
// ════════════════════════════════════════════════════════════════════════

/**
 * A frozen reference to one versioned artifact included in the package.
 * Ensures reproducibility: the exact version IDs are recorded.
 */
export interface ArtifactSnapshot {
  artifactType: VersionedEntityType | 'stateProgram';
  artifactId: string;
  artifactName: string;
  versionId: string;
  versionNumber: number;
  status: string;
  action: ChangeSetItemAction;
  /** JSON hash of the version data at build time (for tamper detection) */
  contentHash: string;
}

// ════════════════════════════════════════════════════════════════════════
// Exhibit Manifest
// ════════════════════════════════════════════════════════════════════════

/**
 * Each generated file inside the zip.
 */
export interface ExhibitEntry {
  /** File name inside the zip, e.g. "forms_schedule.json" */
  fileName: string;
  /** Human-readable title */
  title: string;
  /** MIME type */
  mimeType: string;
  /** Size in bytes (after generation) */
  sizeBytes: number;
}

// ════════════════════════════════════════════════════════════════════════
// Filing Package document
// ════════════════════════════════════════════════════════════════════════

export interface FilingPackage {
  id: string;
  orgId: string;
  changeSetId: string;
  changeSetName: string;
  /** Product this filing is associated with (denormalized from change set) */
  productId?: string | null;
  productName?: string | null;
  scope: FilingPackageScope;
  /** If scope === 'state', which state */
  stateCode?: string | null;
  stateName?: string | null;
  status: FilingPackageStatus;
  /** Progress 0-100 during build */
  progress: number;
  /** Number of artifacts included */
  artifactCount: number;
  /** Frozen artifact references */
  artifactsSnapshot: ArtifactSnapshot[];
  /** Files in the zip */
  exhibits: ExhibitEntry[];
  /** Storage path to the zip */
  storagePath: string | null;
  /** Download URL (signed, temporary) */
  downloadUrl: string | null;
  /** Error message if status === 'failed' */
  error: string | null;
  /** Effective date range from the change set */
  effectiveStart: string | null;
  effectiveEnd: string | null;
  /** Build metadata */
  buildStartedAt: Timestamp | null;
  buildCompletedAt: Timestamp | null;
  /** Build duration in ms */
  buildDurationMs: number | null;
  /** Provenance */
  requestedBy: string;
  requestedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ════════════════════════════════════════════════════════════════════════
// Build request (sent to Cloud Function)
// ════════════════════════════════════════════════════════════════════════

export interface BuildFilingPackageRequest {
  orgId: string;
  changeSetId: string;
  scope: FilingPackageScope;
  stateCode?: string;
}

export interface BuildFilingPackageResponse {
  success: boolean;
  packageId: string;
  storagePath?: string;
  error?: string;
}
