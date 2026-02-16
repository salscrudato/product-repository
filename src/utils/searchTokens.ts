/**
 * Search Token & Prefix Generation
 *
 * Pure utility functions (no Firebase dependency) for generating
 * the `tokens[]` and `prefixes[]` arrays stored in searchIndex docs.
 *
 * Design constraints:
 *  - Tokens are lower-cased, split on whitespace + punctuation.
 *  - Short noise words (<=2 chars) are dropped unless they look like a code ("CA", "NY").
 *  - Prefixes are the leading 1..MAX_PREFIX_LENGTH characters of each token.
 *  - Both arrays are bounded to prevent Firestore doc bloat.
 */

import {
  MAX_TOKENS_PER_DOC,
  MAX_PREFIXES_PER_DOC,
  MAX_PREFIX_LENGTH,
} from '../types/search';

// ════════════════════════════════════════════════════════════════════════
// Tokenise
// ════════════════════════════════════════════════════════════════════════

/** Characters that act as token separators (regex class) */
const SPLIT_RE = /[\s\-_\/|:;,.()[\]{}<>'"!@#$%^&*+=~`]+/;

/** Looks like a US state code or short meaningful abbreviation */
const SHORT_CODE_RE = /^[A-Z0-9]{2}$/;

/**
 * Tokenise a raw string into an array of lower-cased, de-duped tokens.
 * Drops tokens <= 2 chars unless they match SHORT_CODE_RE (before lowering).
 *
 * Also generates a concatenated "slug" when the input contains short code
 * segments (e.g. "CP 00 10" → also produces "cp0010") so that users can
 * search with or without spaces.
 */
export function tokenise(raw: string): string[] {
  if (!raw) return [];

  const parts = raw.split(SPLIT_RE).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];

  for (const part of parts) {
    // Keep short codes like "CA", "CP", "NY", "01"
    const isShortCode = SHORT_CODE_RE.test(part);
    const lower = part.toLowerCase();

    if (!isShortCode && lower.length <= 2) continue;
    if (seen.has(lower)) continue;

    seen.add(lower);
    out.push(lower);
  }

  // Concatenated slug for code-like patterns.
  // e.g. "CP 00 10" → "cp0010", "CG 00 01" → "cg0001"
  // Heuristic: all segments <=4 chars alphanumeric, at least one has a letter,
  // and at least one has a digit (indicates a structured code, not prose).
  const allParts = raw.split(SPLIT_RE).filter(Boolean);
  const codeSegments = allParts.filter(p => p.length <= 4 && /^[A-Za-z0-9]+$/.test(p));
  const hasLetter = codeSegments.some(p => /[A-Za-z]/.test(p));
  const hasDigit  = codeSegments.some(p => /[0-9]/.test(p));
  if (codeSegments.length >= 2 && hasLetter && hasDigit) {
    const slug = codeSegments.map(p => p.toLowerCase()).join('');
    if (slug.length > 2 && !seen.has(slug)) {
      seen.add(slug);
      out.push(slug);
    }
  }

  return out;
}

/**
 * Generate bounded tokens from one or more input strings.
 * Returns at most MAX_TOKENS_PER_DOC unique tokens.
 */
export function generateTokens(...inputs: (string | undefined | null)[]): string[] {
  const merged: string[] = [];
  for (const input of inputs) {
    if (input) merged.push(...tokenise(input));
  }

  // De-dup across all inputs
  const unique = [...new Set(merged)];
  return unique.slice(0, MAX_TOKENS_PER_DOC);
}

// ════════════════════════════════════════════════════════════════════════
// Prefixes
// ════════════════════════════════════════════════════════════════════════

/**
 * Generate prefix strings for a single token.
 * "hello" → ["h","he","hel","hell","hello"]
 * Bounded to MAX_PREFIX_LENGTH chars.
 */
export function prefixesForToken(token: string): string[] {
  const out: string[] = [];
  const limit = Math.min(token.length, MAX_PREFIX_LENGTH);
  for (let i = 1; i <= limit; i++) {
    out.push(token.slice(0, i));
  }
  return out;
}

/**
 * Generate bounded prefix array from a set of tokens.
 * Returns at most MAX_PREFIXES_PER_DOC unique prefix strings.
 */
export function generatePrefixes(tokens: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const token of tokens) {
    for (const prefix of prefixesForToken(token)) {
      if (seen.has(prefix)) continue;
      seen.add(prefix);
      out.push(prefix);
      if (out.length >= MAX_PREFIXES_PER_DOC) return out;
    }
  }

  return out;
}

// ════════════════════════════════════════════════════════════════════════
// Convenience: build both at once
// ════════════════════════════════════════════════════════════════════════

export interface TokensAndPrefixes {
  tokens: string[];
  prefixes: string[];
}

/**
 * One-shot helper: produce both `tokens` and `prefixes` arrays
 * from raw input strings (title, subtitle, extra keywords, etc.).
 */
export function buildSearchVectors(
  ...inputs: (string | undefined | null)[]
): TokensAndPrefixes {
  const tokens = generateTokens(...inputs);
  const prefixes = generatePrefixes(tokens);
  return { tokens, prefixes };
}
