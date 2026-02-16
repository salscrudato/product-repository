/**
 * Mention Parser – Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  extractMentionedUserIds,
  parseBodySegments,
  encodeMentions,
  decodeMentions,
} from '../utils/mentionParser';

// ════════════════════════════════════════════════════════════════════════
// extractMentionedUserIds
// ════════════════════════════════════════════════════════════════════════

describe('extractMentionedUserIds()', () => {
  it('returns empty array for empty body', () => {
    expect(extractMentionedUserIds('')).toEqual([]);
    expect(extractMentionedUserIds(undefined as unknown as string)).toEqual([]);
  });

  it('extracts single mention', () => {
    expect(extractMentionedUserIds('Hey @[user123], what do you think?'))
      .toEqual(['user123']);
  });

  it('extracts multiple mentions', () => {
    expect(extractMentionedUserIds('@[alice] and @[bob] should review this'))
      .toEqual(['alice', 'bob']);
  });

  it('de-duplicates mentions', () => {
    expect(extractMentionedUserIds('@[alice] @[alice] @[alice]'))
      .toEqual(['alice']);
  });

  it('handles user IDs with dashes and underscores', () => {
    expect(extractMentionedUserIds('cc @[john-doe_123]'))
      .toEqual(['john-doe_123']);
  });

  it('does not match plain @ without brackets', () => {
    expect(extractMentionedUserIds('email me at test@example.com'))
      .toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════
// parseBodySegments
// ════════════════════════════════════════════════════════════════════════

describe('parseBodySegments()', () => {
  it('returns empty for empty body', () => {
    expect(parseBodySegments('')).toEqual([]);
  });

  it('returns single text segment for no mentions', () => {
    const segs = parseBodySegments('Hello world');
    expect(segs).toEqual([{ type: 'text', value: 'Hello world' }]);
  });

  it('splits text and mentions', () => {
    const segs = parseBodySegments('Hey @[alice], review this?');
    expect(segs).toEqual([
      { type: 'text', value: 'Hey ' },
      { type: 'mention', value: '@[alice]', userId: 'alice' },
      { type: 'text', value: ', review this?' },
    ]);
  });

  it('handles multiple mentions', () => {
    const segs = parseBodySegments('@[alice] and @[bob]');
    expect(segs).toHaveLength(3);
    expect(segs[0]).toEqual({ type: 'mention', value: '@[alice]', userId: 'alice' });
    expect(segs[1]).toEqual({ type: 'text', value: ' and ' });
    expect(segs[2]).toEqual({ type: 'mention', value: '@[bob]', userId: 'bob' });
  });

  it('handles mention at end of string', () => {
    const segs = parseBodySegments('FYI @[admin]');
    expect(segs).toHaveLength(2);
    expect(segs[1].type).toBe('mention');
    expect(segs[1].userId).toBe('admin');
  });
});

// ════════════════════════════════════════════════════════════════════════
// encodeMentions
// ════════════════════════════════════════════════════════════════════════

describe('encodeMentions()', () => {
  const members = new Map([
    ['Alice Smith', 'uid-alice'],
    ['Bob Jones', 'uid-bob'],
  ]);

  it('replaces display-name mentions with stored form', () => {
    const result = encodeMentions('Hey @Alice Smith, check this', members);
    // The comma is not part of the name match, so encoding captures "Alice Smith"
    expect(result.body).toContain('@[uid-alice]');
    expect(result.mentionedUserIds).toContain('uid-alice');
  });

  it('handles multiple mentions in separate clauses', () => {
    // Use explicit separators so regex can isolate each name
    const result = encodeMentions('cc @Bob Jones -- review by @Alice Smith', members);
    expect(result.mentionedUserIds).toContain('uid-alice');
    expect(result.mentionedUserIds).toContain('uid-bob');
  });

  it('leaves unknown names as-is', () => {
    const result = encodeMentions('cc @Unknown Person', members);
    expect(result.body).toContain('@Unknown Person');
    expect(result.mentionedUserIds).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════
// decodeMentions
// ════════════════════════════════════════════════════════════════════════

describe('decodeMentions()', () => {
  const membersById = new Map([
    ['uid-alice', 'Alice Smith'],
    ['uid-bob', 'Bob Jones'],
  ]);

  it('replaces stored-form mentions with display names', () => {
    expect(decodeMentions('Hey @[uid-alice], review?', membersById))
      .toBe('Hey @Alice Smith, review?');
  });

  it('falls back to userId for unknown IDs', () => {
    expect(decodeMentions('@[unknown-user] said hello', membersById))
      .toBe('@unknown-user said hello');
  });

  it('handles multiple mentions', () => {
    const result = decodeMentions('@[uid-alice] and @[uid-bob]', membersById);
    expect(result).toBe('@Alice Smith and @Bob Jones');
  });
});

// ════════════════════════════════════════════════════════════════════════
// Acceptance: deep-link scenario
// ════════════════════════════════════════════════════════════════════════

describe('acceptance: mentioned users', () => {
  it('comment with @[userId] produces correct mention list for notification', () => {
    const body = 'Hey @[uid-alice], can you review CP 00 10? cc @[uid-bob]';
    const mentions = extractMentionedUserIds(body);
    expect(mentions).toContain('uid-alice');
    expect(mentions).toContain('uid-bob');
    expect(mentions).toHaveLength(2);
  });

  it('segments render mentions separately for UI highlighting', () => {
    const body = 'Assigned to @[uid-alice] for compliance review';
    const segs = parseBodySegments(body);
    const mentionSegs = segs.filter(s => s.type === 'mention');
    expect(mentionSegs).toHaveLength(1);
    expect(mentionSegs[0].userId).toBe('uid-alice');
  });
});
