/**
 * DiscussionPanel  (Design System v2)
 *
 * A self-contained discussion / comment thread that can be embedded
 * in any artifact detail page (Change Set, Product 360, Form, Rate Program, etc.).
 *
 * Props:
 *  - orgId, target (TargetRef): identifies the artifact being discussed
 *  - title: heading for the panel
 *
 * Features:
 *  - Real-time comments via Firestore snapshot
 *  - @mention suggestions dropdown (from org members)
 *  - Watch / unwatch toggle
 *  - Mention rendering with highlight
 *
 * Accessibility:
 *  - Keyboard-navigable mention dropdown
 *  - ARIA live region for new comments
 *  - Focus management
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import styled, { css, keyframes } from 'styled-components';
import {
  ChatBubbleLeftEllipsisIcon,
  PaperAirplaneIcon,
  BellIcon,
  BellSlashIcon,
  AtSymbolIcon,
} from '@heroicons/react/24/outline';
import {
  color, neutral, accent, semantic,
  space, radius, shadow, fontFamily,
  type as t, border as borderTokens,
  duration, easing, transition as transitionToken,
  focusRingStyle, reducedMotion,
} from '@/ui/tokens';
import {
  getOrCreateThread,
  addComment,
  subscribeToComments,
  subscribe as watchTarget,
  unsubscribe as unwatchTarget,
  subscribeToWatchStatus,
} from '@/services/collaborationService';
import { parseBodySegments } from '@/utils/mentionParser';
import { useRoleContext } from '@/context/RoleContext';
import type { Comment, TargetRef } from '@/types/collaboration';
import type { OrgMember } from '@/services/orgService';

// ════════════════════════════════════════════════════════════════════════
// Animations
// ════════════════════════════════════════════════════════════════════════

const fadeIn = keyframes`from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}`;

// ════════════════════════════════════════════════════════════════════════
// Styled components
// ════════════════════════════════════════════════════════════════════════

const Panel = styled.section`
  background: ${color.bg};
  border: ${borderTokens.default};
  border-radius: ${radius.xl};
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${space[4]} ${space[5]};
  border-bottom: ${borderTokens.default};
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[2]};
  font-family: ${fontFamily.sans};
  font-size: ${t.label.size};
  font-weight: 600;
  color: ${color.text};

  svg { width: 18px; height: 18px; color: ${neutral[400]}; }
`;

const CommentCount = styled.span`
  font-weight: 400;
  color: ${color.textMuted};
  font-size: ${t.captionSm.size};
  margin-left: ${space[1]};
`;

const WatchBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${space[1]};
  padding: ${space[1]} ${space[2]};
  border-radius: ${radius.md};
  border: 1px solid ${neutral[200]};
  background: ${({ $active }) => $active ? accent[50] : 'transparent'};
  cursor: pointer;
  font-family: ${fontFamily.sans};
  font-size: ${t.captionSm.size};
  font-weight: 500;
  color: ${({ $active }) => $active ? accent[600] : neutral[500]};
  transition: all ${duration.fast} ease;

  svg { width: 14px; height: 14px; }

  &:hover { background: ${neutral[100]}; }
  &:focus-visible { ${focusRingStyle} }
`;

const CommentsArea = styled.div`
  max-height: 400px;
  overflow-y: auto;
  padding: ${space[3]} ${space[5]};

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: ${neutral[200]}; border-radius: 2px; }
`;

const CommentBubble = styled.div`
  animation: ${fadeIn} ${duration.normal} ${easing.out};
  margin-bottom: ${space[4]};

  @media ${reducedMotion} { animation: none; }
`;

const CommentMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[2]};
  margin-bottom: ${space[1]};
`;

const Avatar = styled.div`
  width: 28px; height: 28px;
  border-radius: 50%;
  background: ${accent[100]};
  color: ${accent[600]};
  display: grid; place-items: center;
  font-size: 12px; font-weight: 600;
  flex-shrink: 0;
`;

const AuthorName = styled.span`
  font-family: ${fontFamily.sans};
  font-size: ${t.captionSm.size};
  font-weight: 600;
  color: ${color.text};
`;

const Timestamp = styled.span`
  font-size: ${t.captionSm.size};
  color: ${neutral[400]};
`;

const CommentBody = styled.div`
  font-family: ${fontFamily.sans};
  font-size: ${t.bodySm.size};
  color: ${color.text};
  line-height: 1.6;
  padding-left: 36px; /* align with avatar */
  white-space: pre-wrap;
  word-break: break-word;
`;

const MentionHighlight = styled.span`
  color: ${accent[600]};
  font-weight: 500;
  background: ${accent[50]};
  border-radius: ${radius.xs};
  padding: 0 2px;
`;

const InputArea = styled.div`
  padding: ${space[3]} ${space[5]} ${space[4]};
  border-top: ${borderTokens.default};
  display: flex;
  gap: ${space[2]};
  align-items: flex-end;
  position: relative;
`;

const TextArea = styled.textarea`
  flex: 1;
  min-height: 40px;
  max-height: 120px;
  resize: vertical;
  border: 1px solid ${neutral[200]};
  border-radius: ${radius.lg};
  padding: ${space[2]} ${space[3]};
  font-family: ${fontFamily.sans};
  font-size: ${t.bodySm.size};
  color: ${color.text};
  background: ${neutral[50]};
  outline: none;
  transition: border-color ${duration.fast} ease;

  &::placeholder { color: ${neutral[400]}; }
  &:focus { border-color: ${accent[400]}; background: ${color.bg}; }
`;

const SendBtn = styled.button`
  display: grid;
  place-items: center;
  width: 36px; height: 36px;
  border-radius: ${radius.md};
  border: none;
  background: ${accent[500]};
  color: white;
  cursor: pointer;
  transition: background ${duration.fast} ease;
  flex-shrink: 0;

  svg { width: 16px; height: 16px; }

  &:hover { background: ${accent[600]}; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &:focus-visible { ${focusRingStyle} }
`;

// Mention suggestions
const SuggestionDropdown = styled.div`
  position: absolute;
  bottom: calc(100% + 4px);
  left: ${space[5]};
  right: ${space[5]};
  max-height: 180px;
  overflow-y: auto;
  background: ${color.bg};
  border: ${borderTokens.default};
  border-radius: ${radius.lg};
  box-shadow: ${shadow.lg};
  z-index: 10;
`;

const SuggestionItem = styled.div<{ $active?: boolean }>`
  padding: ${space[2]} ${space[3]};
  cursor: pointer;
  font-family: ${fontFamily.sans};
  font-size: ${t.bodySm.size};
  display: flex;
  align-items: center;
  gap: ${space[2]};

  ${({ $active }) => $active && css`background: ${accent[50]};`}
  &:hover { background: ${neutral[100]}; }
`;

const SuggestionName = styled.span`
  font-weight: 500;
  color: ${color.text};
`;

const SuggestionEmail = styled.span`
  font-size: ${t.captionSm.size};
  color: ${neutral[400]};
`;

const EmptyComments = styled.div`
  text-align: center;
  padding: ${space[8]} ${space[4]};
  color: ${color.textMuted};
  font-size: ${t.bodySm.size};
`;

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

function initials(name?: string): string {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function relativeTime(ts: { seconds?: number; toDate?: () => Date } | null | undefined): string {
  if (!ts) return '';
  const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date((ts.seconds || 0) * 1000);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

interface DiscussionPanelProps {
  orgId: string;
  target: TargetRef;
  title?: string;
  /** Org members for @mention suggestions */
  members?: OrgMember[];
}

const DiscussionPanel: React.FC<DiscussionPanelProps> = ({
  orgId,
  target,
  title = 'Discussion',
  members = [],
}) => {
  const { user } = useRoleContext();
  const [comments, setComments] = useState<Comment[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [watching, setWatching] = useState(false);

  // Mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // ── Get or create thread ──
  useEffect(() => {
    if (!orgId || !target.artifactId) return;
    getOrCreateThread(orgId, target, title).then(t => setThreadId(t.id)).catch(() => {});
  }, [orgId, target.type, target.artifactId, target.versionId, target.changeSetId, title]);

  // ── Subscribe to comments ──
  useEffect(() => {
    if (!orgId || !threadId) return;
    return subscribeToComments(orgId, threadId, setComments);
  }, [orgId, threadId]);

  // ── Watch status ──
  useEffect(() => {
    if (!orgId || !target.artifactId) return;
    return subscribeToWatchStatus(orgId, target, setWatching);
  }, [orgId, target.type, target.artifactId]);

  // ── Auto-scroll ──
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  // ── Send comment ──
  const handleSend = useCallback(async () => {
    if (!threadId || !body.trim() || sending) return;
    setSending(true);
    try {
      await addComment(orgId, threadId, body.trim(), user?.displayName || user?.email || undefined);
      setBody('');
    } catch (err) {
      console.error('Failed to send comment:', err);
    } finally {
      setSending(false);
    }
  }, [orgId, threadId, body, sending, user]);

  // ── Toggle watch ──
  const toggleWatch = useCallback(async () => {
    if (!user) return;
    try {
      if (watching) {
        await unwatchTarget(orgId, target, user.uid);
      } else {
        await watchTarget(orgId, target, user.uid);
      }
    } catch {}
  }, [orgId, target, user, watching]);

  // ── Mention suggestions ──
  const filteredMembers = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return members
      .filter(m => {
        if (m.userId === user?.uid) return false;
        const name = (m.displayName || m.email || '').toLowerCase();
        return name.includes(q);
      })
      .slice(0, 6);
  }, [mentionQuery, members, user]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBody(val);

    // Detect @mention trigger
    const cursor = e.target.selectionStart || 0;
    const textBefore = val.slice(0, cursor);
    const atMatch = textBefore.match(/@([A-Za-z0-9 _.'-]*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionIdx(0);
    } else {
      setMentionQuery(null);
    }
  }, []);

  const insertMention = useCallback((member: OrgMember) => {
    if (!textAreaRef.current) return;
    const cursor = textAreaRef.current.selectionStart || 0;
    const textBefore = body.slice(0, cursor);
    const atPos = textBefore.lastIndexOf('@');
    if (atPos === -1) return;

    const before = body.slice(0, atPos);
    const after = body.slice(cursor);
    const mention = `@[${member.userId}]`;
    const newBody = `${before}${mention} ${after}`;
    setBody(newBody);
    setMentionQuery(null);

    // Refocus
    setTimeout(() => {
      if (textAreaRef.current) {
        const newCursor = before.length + mention.length + 1;
        textAreaRef.current.focus();
        textAreaRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  }, [body]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Mention navigation
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIdx(i => Math.min(i + 1, filteredMembers.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIdx(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMembers[mentionIdx]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    // Ctrl+Enter to send
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }, [mentionQuery, filteredMembers, mentionIdx, insertMention, handleSend]);

  // ── Build member ID → name map for rendering ──
  const memberMap = useMemo(() => {
    const m = new Map<string, string>();
    members.forEach(mem => m.set(mem.userId, mem.displayName || mem.email || mem.userId));
    return m;
  }, [members]);

  // ── Render ──
  return (
    <Panel>
      <Header>
        <HeaderLeft>
          <ChatBubbleLeftEllipsisIcon />
          {title}
          {comments.length > 0 && <CommentCount>({comments.length})</CommentCount>}
        </HeaderLeft>
        <WatchBtn $active={watching} onClick={toggleWatch} aria-label={watching ? 'Stop watching' : 'Watch for updates'}>
          {watching ? <BellSlashIcon /> : <BellIcon />}
          {watching ? 'Watching' : 'Watch'}
        </WatchBtn>
      </Header>

      <CommentsArea aria-live="polite" aria-label="Comments">
        {comments.length === 0 && (
          <EmptyComments>No comments yet. Start the discussion.</EmptyComments>
        )}

        {comments.map(c => (
          <CommentBubble key={c.id}>
            <CommentMeta>
              <Avatar>{initials(c.createdByName)}</Avatar>
              <AuthorName>{c.createdByName || c.createdBy}</AuthorName>
              <Timestamp>{relativeTime(c.createdAt)}</Timestamp>
            </CommentMeta>
            <CommentBody>
              {parseBodySegments(c.body).map((seg, i) =>
                seg.type === 'mention' ? (
                  <MentionHighlight key={i}>
                    @{memberMap.get(seg.userId || '') || seg.userId}
                  </MentionHighlight>
                ) : (
                  <React.Fragment key={i}>{seg.value}</React.Fragment>
                )
              )}
            </CommentBody>
          </CommentBubble>
        ))}
        <div ref={commentsEndRef} />
      </CommentsArea>

      <InputArea>
        {/* Mention dropdown */}
        {mentionQuery !== null && filteredMembers.length > 0 && (
          <SuggestionDropdown role="listbox" aria-label="Mention suggestions">
            {filteredMembers.map((m, i) => (
              <SuggestionItem
                key={m.userId}
                $active={i === mentionIdx}
                role="option"
                aria-selected={i === mentionIdx}
                onClick={() => insertMention(m)}
                onMouseEnter={() => setMentionIdx(i)}
              >
                <Avatar>{initials(m.displayName || m.email)}</Avatar>
                <SuggestionName>{m.displayName || m.email}</SuggestionName>
                {m.displayName && <SuggestionEmail>{m.email}</SuggestionEmail>}
              </SuggestionItem>
            ))}
          </SuggestionDropdown>
        )}

        <TextArea
          ref={textAreaRef}
          value={body}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment… (use @ to mention)"
          aria-label="Comment input"
          rows={1}
        />
        <SendBtn onClick={handleSend} disabled={!body.trim() || sending} aria-label="Send comment">
          <PaperAirplaneIcon />
        </SendBtn>
      </InputArea>
    </Panel>
  );
};

export default DiscussionPanel;
