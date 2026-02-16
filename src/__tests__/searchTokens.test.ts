/**
 * Search Token & Prefix Generation – Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  tokenise,
  generateTokens,
  prefixesForToken,
  generatePrefixes,
  buildSearchVectors,
} from '../utils/searchTokens';
import {
  MAX_TOKENS_PER_DOC,
  MAX_PREFIXES_PER_DOC,
  MAX_PREFIX_LENGTH,
} from '../types/search';

// ════════════════════════════════════════════════════════════════════════
// tokenise()
// ════════════════════════════════════════════════════════════════════════

describe('tokenise()', () => {
  it('returns empty array for empty / null input', () => {
    expect(tokenise('')).toEqual([]);
    expect(tokenise(undefined as unknown as string)).toEqual([]);
  });

  it('lowercases and splits on whitespace', () => {
    expect(tokenise('Hello World')).toEqual(['hello', 'world']);
  });

  it('splits on punctuation and special chars', () => {
    expect(tokenise('CG 00 01 – General Liability')).toEqual(
      expect.arrayContaining(['general', 'liability'])
    );
    // "CG" is a 2-char uppercase code → kept
    expect(tokenise('CG 00 01')).toContain('cg');
  });

  it('keeps 2-char uppercase codes (state codes)', () => {
    expect(tokenise('CA NY TX')).toEqual(['ca', 'ny', 'tx']);
  });

  it('keeps 2-char numeric codes', () => {
    const tokens = tokenise('00 01 99');
    expect(tokens).toContain('00');
    expect(tokens).toContain('01');
    expect(tokens).toContain('99');
  });

  it('drops 2-char lowercase noise words', () => {
    // "is", "on", "of" are all <=2 chars lowercase, not short codes → all dropped
    const tokens = tokenise('is on of');
    expect(tokens).toEqual([]);
  });

  it('de-duplicates tokens', () => {
    const tokens = tokenise('form Form FORM');
    expect(tokens.filter(t => t === 'form').length).toBe(1);
  });

  it('handles form numbers with dashes/slashes', () => {
    const tokens = tokenise('CP 00 10 04/2002');
    expect(tokens).toContain('cp');
    expect(tokens).toContain('00');
    expect(tokens).toContain('10');
    expect(tokens).toContain('04');
    expect(tokens).toContain('2002');
  });
});

// ════════════════════════════════════════════════════════════════════════
// generateTokens()
// ════════════════════════════════════════════════════════════════════════

describe('generateTokens()', () => {
  it('merges tokens from multiple inputs', () => {
    const tokens = generateTokens('Product Alpha', 'published');
    expect(tokens).toContain('product');
    expect(tokens).toContain('alpha');
    expect(tokens).toContain('published');
  });

  it('skips undefined and null inputs', () => {
    const tokens = generateTokens('hello', undefined, null, 'world');
    expect(tokens).toEqual(['hello', 'world']);
  });

  it('enforces MAX_TOKENS_PER_DOC bound', () => {
    const longInput = Array.from({ length: 100 }, (_, i) => `word${i}`).join(' ');
    const tokens = generateTokens(longInput);
    expect(tokens.length).toBeLessThanOrEqual(MAX_TOKENS_PER_DOC);
  });

  it('de-duplicates across inputs', () => {
    const tokens = generateTokens('Alpha Beta', 'beta gamma');
    expect(tokens).toContain('alpha');
    expect(tokens).toContain('beta');
    expect(tokens).toContain('gamma');
    // Only one instance of 'beta'
    expect(tokens.filter(t => t === 'beta').length).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════
// prefixesForToken()
// ════════════════════════════════════════════════════════════════════════

describe('prefixesForToken()', () => {
  it('produces prefixes from 1..length', () => {
    expect(prefixesForToken('hello')).toEqual(['h', 'he', 'hel', 'hell', 'hello']);
  });

  it('caps at MAX_PREFIX_LENGTH', () => {
    const result = prefixesForToken('abcdefghijklmnop');
    expect(result.length).toBe(MAX_PREFIX_LENGTH);
    expect(result[result.length - 1]).toBe('abcdefgh');
  });

  it('handles short tokens', () => {
    expect(prefixesForToken('ab')).toEqual(['a', 'ab']);
    expect(prefixesForToken('x')).toEqual(['x']);
  });
});

// ════════════════════════════════════════════════════════════════════════
// generatePrefixes()
// ════════════════════════════════════════════════════════════════════════

describe('generatePrefixes()', () => {
  it('produces unique prefixes across all tokens', () => {
    const prefixes = generatePrefixes(['hello', 'help']);
    // "h", "he", "hel" are shared; "hell", "hello", "help" are unique
    expect(prefixes).toContain('h');
    expect(prefixes).toContain('he');
    expect(prefixes).toContain('hel');
    expect(prefixes).toContain('hell');
    expect(prefixes).toContain('hello');
    expect(prefixes).toContain('help');
    // No duplicates
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it('enforces MAX_PREFIXES_PER_DOC bound', () => {
    const manyTokens = Array.from({ length: 50 }, (_, i) => `uniqueword${i}`);
    const prefixes = generatePrefixes(manyTokens);
    expect(prefixes.length).toBeLessThanOrEqual(MAX_PREFIXES_PER_DOC);
  });
});

// ════════════════════════════════════════════════════════════════════════
// buildSearchVectors()
// ════════════════════════════════════════════════════════════════════════

describe('buildSearchVectors()', () => {
  it('produces both tokens and prefixes', () => {
    const { tokens, prefixes } = buildSearchVectors('CP 00 10', 'Commercial Property');
    expect(tokens.length).toBeGreaterThan(0);
    expect(prefixes.length).toBeGreaterThan(0);
    expect(tokens).toContain('cp');
    expect(tokens).toContain('commercial');
    expect(tokens).toContain('property');
    // prefixes should include "c", "cp", "co", "com", etc.
    expect(prefixes).toContain('c');
    expect(prefixes).toContain('cp');
    expect(prefixes).toContain('co');
    expect(prefixes).toContain('com');
  });

  it('can find "CP0010" via prefix of "cp0010"', () => {
    const { prefixes } = buildSearchVectors('CP0010');
    expect(prefixes).toContain('cp0010');
    expect(prefixes).toContain('cp001');
    expect(prefixes).toContain('cp00');
    expect(prefixes).toContain('cp0');
    expect(prefixes).toContain('cp');
    expect(prefixes).toContain('c');
  });

  it('respects bounds', () => {
    const { tokens, prefixes } = buildSearchVectors(
      Array.from({ length: 100 }, (_, i) => `word${i}`).join(' '),
    );
    expect(tokens.length).toBeLessThanOrEqual(MAX_TOKENS_PER_DOC);
    expect(prefixes.length).toBeLessThanOrEqual(MAX_PREFIXES_PER_DOC);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Integration: searching "CP0010" should produce findable vectors
// ════════════════════════════════════════════════════════════════════════

describe('acceptance: search CP0010', () => {
  it('form title with "CP 00 10" is findable by query "CP0010"', () => {
    // Index side: form has title "CP 00 10 — Building and Personal Property"
    const { tokens: docTokens, prefixes: docPrefixes } = buildSearchVectors(
      'CP 00 10',
      'Building and Personal Property Coverage Form',
      '04/2002',
    );

    // Query side: user types "CP0010"
    const queryTokens = tokenise('CP0010');
    expect(queryTokens).toContain('cp0010');

    // The query token "cp0010" should appear in the document's prefixes
    // because "cp0010" is generated as a prefix of itself
    expect(docPrefixes).toContain('cp0010');
  });

  it('form title with "CP 00 10" is findable by query "cp 00 10"', () => {
    const { tokens: docTokens } = buildSearchVectors(
      'CP 00 10',
      'Building and Personal Property',
    );

    // Query "cp 00 10" tokenises to ["cp", "00", "10"]
    const queryTokens = tokenise('cp 00 10');
    // All query tokens should exist in docTokens
    for (const qt of queryTokens) {
      expect(docTokens).toContain(qt);
    }
  });

  it('partial query "cp00" matches via prefixes', () => {
    const { prefixes: docPrefixes } = buildSearchVectors('CP0010 Coverage Form');
    expect(docPrefixes).toContain('cp00');
  });
});
