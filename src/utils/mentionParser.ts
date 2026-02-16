/**
 * Mention Parser
 *
 * Parses @mention syntax in comment bodies and resolves them to user IDs.
 *
 * Syntax:
 *   @[userId]          — raw user-ID mention (stored form)
 *   @displayName       — human-readable mention (input form, resolved before save)
 *
 * The stored form in Firestore always uses @[userId].
 * The display form shown in the UI replaces @[userId] with @DisplayName.
 */

// ════════════════════════════════════════════════════════════════════════
// Extraction
// ════════════════════════════════════════════════════════════════════════

/**
 * Extract all user IDs from a stored comment body.
 * Matches @[userId] patterns.
 */
const MENTION_RE = /@\[([a-zA-Z0-9_-]+)\]/g;

export function extractMentionedUserIds(body: string): string[] {
  if (!body) return [];
  const ids = new Set<string>();
  let match: RegExpExecArray | null;
  // Reset regex state
  MENTION_RE.lastIndex = 0;
  while ((match = MENTION_RE.exec(body)) !== null) {
    ids.add(match[1]);
  }
  return [...ids];
}

// ════════════════════════════════════════════════════════════════════════
// Rendering helpers
// ════════════════════════════════════════════════════════════════════════

export interface MentionSegment {
  type: 'text' | 'mention';
  value: string;
  /** Only for 'mention' type: the raw user ID */
  userId?: string;
}

/**
 * Parse a stored comment body into segments for rendering.
 * Text parts and mention parts are separated so the UI can style them differently.
 */
export function parseBodySegments(body: string): MentionSegment[] {
  if (!body) return [];

  const segments: MentionSegment[] = [];
  let lastIdx = 0;

  MENTION_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MENTION_RE.exec(body)) !== null) {
    // Text before this mention
    if (match.index > lastIdx) {
      segments.push({ type: 'text', value: body.slice(lastIdx, match.index) });
    }
    segments.push({ type: 'mention', value: match[0], userId: match[1] });
    lastIdx = match.index + match[0].length;
  }

  // Trailing text
  if (lastIdx < body.length) {
    segments.push({ type: 'text', value: body.slice(lastIdx) });
  }

  return segments;
}

// ════════════════════════════════════════════════════════════════════════
// Encoding helpers (used at input time)
// ════════════════════════════════════════════════════════════════════════

/**
 * Replace display-name mentions with stored-form mentions.
 * The members map is { displayName → userId }.
 */
export function encodeMentions(
  rawBody: string,
  membersByName: Map<string, string>,
): { body: string; mentionedUserIds: string[] } {
  const mentionedUserIds: string[] = [];

  // Build a sorted list of known names (longest first for greedy match)
  const knownNames = [...membersByName.keys()].sort((a, b) => b.length - a.length);

  let body = rawBody;
  for (const name of knownNames) {
    // Escape special regex chars in the name, match @name boundaries
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`@${escaped}(?=[^A-Za-z0-9]|$)`, 'gi');
    const userId = membersByName.get(name)!;

    body = body.replace(pattern, () => {
      if (!mentionedUserIds.includes(userId)) mentionedUserIds.push(userId);
      return `@[${userId}]`;
    });
  }

  return { body, mentionedUserIds };
}

/**
 * Replace stored-form mentions with display names for rendering.
 * The members map is { userId → displayName }.
 */
export function decodeMentions(
  storedBody: string,
  membersById: Map<string, string>,
): string {
  MENTION_RE.lastIndex = 0;
  return storedBody.replace(MENTION_RE, (_full, userId: string) => {
    const name = membersById.get(userId);
    return name ? `@${name}` : `@${userId}`;
  });
}
