/**
 * Search Service
 *
 * Client-side Firestore query layer for cross-artifact search.
 * Queries the `orgs/{orgId}/searchIndex` collection using
 * `array-contains` on the `prefixes[]` field for type-ahead,
 * with optional type filtering.
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import { tokenise } from '../utils/searchTokens';
import type {
  SearchQuery,
  SearchResult,
  SearchIndexDoc,
  SearchableArtifactType,
} from '../types/search';

// ════════════════════════════════════════════════════════════════════════
// Core search
// ════════════════════════════════════════════════════════════════════════

/**
 * Search the index for matching artifacts.
 *
 * Strategy:
 *  1. Tokenise the raw query.
 *  2. Take the first token and use `array-contains` on `prefixes`.
 *     (Firestore only allows one `array-contains` per query.)
 *  3. Client-side filter: check that every remaining token exists
 *     in the document's `tokens[]` or `prefixes[]`.
 *  4. Rank: exact token match > prefix match > partial.
 */
export async function searchArtifacts(params: SearchQuery): Promise<SearchResult[]> {
  const { orgId, query: rawQuery, types, limit: maxResults = 25 } = params;

  if (!orgId || !rawQuery || rawQuery.trim().length === 0) return [];

  const queryTokens = tokenise(rawQuery);
  if (queryTokens.length === 0) return [];

  // Use the first (most specific / longest) token for the Firestore query.
  // Sort by length descending so the longest token is the primary filter.
  const sorted = [...queryTokens].sort((a, b) => b.length - a.length);
  const primaryToken = sorted[0];

  // Build Firestore query
  const colRef = collection(db, `orgs/${orgId}/searchIndex`);
  const constraints: Parameters<typeof query>[1][] = [
    where('prefixes', 'array-contains', primaryToken),
    orderBy('updatedAt', 'desc'),
    firestoreLimit(Math.min(maxResults * 3, 100)), // over-fetch for client filter
  ];

  // Type filter (only if specific types requested)
  if (types && types.length > 0 && types.length <= 10) {
    constraints.push(where('type', 'in', types));
  }

  const q = query(colRef, ...constraints);
  const snap = await getDocs(q);

  // Client-side multi-token filter + scoring
  const scored: Array<SearchResult & { _score: number }> = [];

  snap.forEach((docSnap) => {
    const d = docSnap.data() as SearchIndexDoc;

    // Check all query tokens match
    const allMatch = sorted.every((tok) =>
      d.tokens.includes(tok) || d.prefixes.includes(tok)
    );
    if (!allMatch) return;

    // Score: exact token hits are worth more than prefix hits
    let score = 0;
    for (const tok of sorted) {
      if (d.tokens.includes(tok)) score += 10;
      else if (d.prefixes.includes(tok)) score += 3;
    }
    // Boost exact title match
    if (d.title.toLowerCase().includes(rawQuery.toLowerCase())) score += 20;

    scored.push({
      id: docSnap.id,
      type: d.type,
      artifactId: d.artifactId,
      versionId: d.versionId,
      title: d.title,
      subtitle: d.subtitle,
      route: d.route,
      parentId: d.parentId,
      parentType: d.parentType,
      _score: score,
    });
  });

  // Sort by score descending, then by title
  scored.sort((a, b) => b._score - a._score || a.title.localeCompare(b.title));

  // Strip internal _score and limit
  return scored.slice(0, maxResults).map(({ _score, ...rest }) => rest);
}

// ════════════════════════════════════════════════════════════════════════
// "Where used" helper
// ════════════════════════════════════════════════════════════════════════

/**
 * Find all search-index entries whose parentId matches the given artifact.
 * Useful for answering "where is form CP 00 10 used?"
 */
export async function findWhereUsed(
  orgId: string,
  artifactId: string,
  artifactType?: SearchableArtifactType,
): Promise<SearchResult[]> {
  if (!orgId || !artifactId) return [];

  const colRef = collection(db, `orgs/${orgId}/searchIndex`);
  const constraints: Parameters<typeof query>[1][] = [
    where('parentId', '==', artifactId),
    firestoreLimit(50),
  ];
  if (artifactType) {
    constraints.push(where('parentType', '==', artifactType));
  }

  const q = query(colRef, ...constraints);
  const snap = await getDocs(q);

  const results: SearchResult[] = [];
  snap.forEach((docSnap) => {
    const d = docSnap.data() as SearchIndexDoc;
    results.push({
      id: docSnap.id,
      type: d.type,
      artifactId: d.artifactId,
      versionId: d.versionId,
      title: d.title,
      subtitle: d.subtitle,
      route: d.route,
      parentId: d.parentId,
      parentType: d.parentType,
    });
  });

  return results;
}

// ════════════════════════════════════════════════════════════════════════
// Deep-link builder
// ════════════════════════════════════════════════════════════════════════

/**
 * Build a navigation route from a search result.
 * Falls back to a sensible default if `route` is missing.
 */
export function routeForResult(result: SearchResult): string {
  if (result.route) return result.route;

  switch (result.type) {
    case 'product':     return `/products/${result.artifactId}/overview`;
    case 'coverage':    return `/products/${result.parentId}/coverages/${result.artifactId}`;
    case 'form':        return result.versionId
                           ? `/forms/${result.artifactId}/versions/${result.versionId}`
                           : `/forms/${result.artifactId}`;
    case 'rule':        return `/rules/${result.artifactId}`;
    case 'rateProgram': return `/pricing/${result.parentId || result.artifactId}`;
    case 'table':       return `/tables/${result.artifactId}`;
    case 'changeset':   return `/changesets/${result.artifactId}`;
    case 'stateProgram':return `/products/${result.parentId}/states/${result.artifactId}`;
    case 'task':        return `/tasks/${result.artifactId}`;
    default:            return '/';
  }
}
