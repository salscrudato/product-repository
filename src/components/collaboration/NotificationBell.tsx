/**
 * NotificationBell + NotificationList  (Design System v2)
 *
 * Global notification indicator for the header.
 * Opens a popover dropdown with recent notifications, each deep-linking
 * to the relevant artifact.
 *
 * Accessibility:
 *  - Escape to close
 *  - Keyboard navigable list
 *  - ARIA live region for count badge
 *  - Click outside to close
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import {
  BellIcon,
  CheckIcon,
  ChatBubbleLeftEllipsisIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  XCircleIcon,
  MegaphoneIcon,
  UserIcon,
  AtSymbolIcon,
} from '@heroicons/react/24/outline';
import {
  color, neutral, accent, semantic,
  space, radius, shadow, fontFamily,
  type as t, border as borderTokens,
  duration, easing, z, focusRingStyle, reducedMotion,
} from '@/ui/tokens';
import {
  subscribeToNotifications,
  subscribeToUnreadCount,
  markRead,
  markAllRead,
} from '@/services/collaborationService';
import { useRoleContext } from '@/context/RoleContext';
import type { AppNotification, NotificationType } from '@/types/collaboration';

// ════════════════════════════════════════════════════════════════════════
// Animations
// ════════════════════════════════════════════════════════════════════════

const fadeIn = keyframes`from{opacity:0;transform:translateY(-4px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}`;
const bounce = keyframes`0%{transform:scale(1)}50%{transform:scale(1.15)}100%{transform:scale(1)}`;

// ════════════════════════════════════════════════════════════════════════
// Styled components
// ════════════════════════════════════════════════════════════════════════

const BellWrapper = styled.div`
  position: relative;
`;

const BellButton = styled.button`
  position: relative;
  display: grid;
  place-items: center;
  width: 36px; height: 36px;
  border-radius: ${radius.md};
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${neutral[500]};
  transition: background ${duration.fast} ease, color ${duration.fast} ease;

  svg { width: 20px; height: 20px; }

  &:hover { background: ${neutral[100]}; color: ${color.text}; }
  &:focus-visible { ${focusRingStyle} }
`;

const Badge = styled.span`
  position: absolute;
  top: 4px; right: 4px;
  min-width: 16px; height: 16px;
  border-radius: 8px;
  background: ${semantic.error};
  color: white;
  font-family: ${fontFamily.sans};
  font-size: 10px;
  font-weight: 700;
  display: grid; place-items: center;
  padding: 0 4px;
  line-height: 1;
  animation: ${bounce} ${duration.normal} ${easing.springCalm};

  @media ${reducedMotion} { animation: none; }
`;

const Dropdown = styled.div<{ $open: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 380px;
  max-height: 480px;
  background: ${color.bg};
  border: ${borderTokens.default};
  border-radius: ${radius.xl};
  box-shadow: ${shadow.overlay};
  z-index: ${z.popover};
  display: ${({ $open }) => $open ? 'flex' : 'none'};
  flex-direction: column;
  animation: ${fadeIn} ${duration.fast} ${easing.out};

  @media ${reducedMotion} { animation: none; }
  @media (max-width: 480px) { width: calc(100vw - 24px); right: -8px; }
`;

const DropdownHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${space[3]} ${space[4]};
  border-bottom: ${borderTokens.default};
`;

const DropdownTitle = styled.span`
  font-family: ${fontFamily.sans};
  font-size: ${t.label.size};
  font-weight: 600;
  color: ${color.text};
`;

const MarkAllBtn = styled.button`
  font-family: ${fontFamily.sans};
  font-size: ${t.captionSm.size};
  font-weight: 500;
  color: ${accent[600]};
  background: none;
  border: none;
  cursor: pointer;
  padding: ${space[1]} ${space[2]};
  border-radius: ${radius.sm};

  &:hover { background: ${accent[50]}; }
  &:focus-visible { ${focusRingStyle} }
`;

const NotifList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${space[1]} 0;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: ${neutral[200]}; border-radius: 2px; }
`;

const NotifRow = styled.div<{ $unread?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${space[3]};
  padding: ${space[2.5]} ${space[4]};
  cursor: pointer;
  transition: background ${duration.fast} ease;

  ${({ $unread }) => $unread && css`
    background: ${accent[50]};
  `}

  &:hover { background: ${neutral[100]}; }
`;

const NotifIcon = styled.div<{ $color?: string }>`
  width: 32px; height: 32px;
  border-radius: ${radius.md};
  display: grid; place-items: center;
  background: ${({ $color }) => $color || neutral[100]};
  flex-shrink: 0;

  svg { width: 16px; height: 16px; color: white; }
`;

const NotifContent = styled.div`
  flex: 1; min-width: 0;
`;

const NotifTitle = styled.div`
  font-family: ${fontFamily.sans};
  font-size: ${t.bodySm.size};
  font-weight: 500;
  color: ${color.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const NotifBody = styled.div`
  font-size: ${t.captionSm.size};
  color: ${color.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
`;

const NotifTime = styled.div`
  font-size: 10px;
  color: ${neutral[400]};
  flex-shrink: 0;
  margin-top: 2px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${space[10]} ${space[4]};
  color: ${color.textMuted};
  font-size: ${t.bodySm.size};
`;

const UnreadDot = styled.div`
  width: 6px; height: 6px;
  border-radius: 3px;
  background: ${accent[500]};
  flex-shrink: 0;
  margin-top: 6px;
`;

// ════════════════════════════════════════════════════════════════════════
// Type → icon / colour
// ════════════════════════════════════════════════════════════════════════

function notifMeta(type: NotificationType): { icon: React.ReactNode; bg: string } {
  switch (type) {
    case 'mention':            return { icon: <AtSymbolIcon />,             bg: accent[500] };
    case 'comment':            return { icon: <ChatBubbleLeftEllipsisIcon />, bg: '#06b6d4' };
    case 'approval_requested': return { icon: <MegaphoneIcon />,            bg: semantic.warning };
    case 'approved':           return { icon: <CheckIcon />,                bg: semantic.success };
    case 'rejected':           return { icon: <XCircleIcon />,              bg: semantic.error };
    case 'published':          return { icon: <ShieldCheckIcon />,          bg: accent[600] };
    case 'status_change':      return { icon: <ArrowPathIcon />,            bg: neutral[500] };
    default:                   return { icon: <BellIcon />,                 bg: neutral[400] };
  }
}

function relativeTime(ts: { toDate?: () => Date; seconds?: number } | null | undefined): string {
  if (!ts) return '';
  const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date((ts.seconds || 0) * 1000);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrgId, loading: authLoading } = useRoleContext();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // ── Subscribe to notifications (wait for auth loading to complete) ──
  useEffect(() => {
    if (authLoading || !currentOrgId) return;
    const unsub1 = subscribeToNotifications(currentOrgId, setNotifications);
    const unsub2 = subscribeToUnreadCount(currentOrgId, setUnreadCount);
    return () => { unsub1(); unsub2(); };
  }, [authLoading, currentOrgId]);

  // ── Close on outside click ──
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── Close on Escape ──
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleClick = useCallback((notif: AppNotification) => {
    setOpen(false);
    // Mark as read
    if (!notif.readAt && currentOrgId) {
      markRead(currentOrgId, notif.id).catch(() => {});
    }
    // Navigate to deep link
    if (notif.route) navigate(notif.route);
  }, [currentOrgId, navigate]);

  const handleMarkAllRead = useCallback(() => {
    if (currentOrgId) markAllRead(currentOrgId).catch(() => {});
  }, [currentOrgId]);

  return (
    <BellWrapper ref={wrapperRef}>
      <BellButton
        onClick={() => setOpen(v => !v)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <Badge aria-live="polite">{unreadCount > 99 ? '99+' : unreadCount}</Badge>
        )}
      </BellButton>

      <Dropdown $open={open} role="dialog" aria-label="Notifications">
        <DropdownHeader>
          <DropdownTitle>Notifications</DropdownTitle>
          {unreadCount > 0 && (
            <MarkAllBtn onClick={handleMarkAllRead}>Mark all read</MarkAllBtn>
          )}
        </DropdownHeader>

        <NotifList>
          {notifications.length === 0 && (
            <EmptyState>No notifications yet</EmptyState>
          )}

          {notifications.map(n => {
            const meta = notifMeta(n.type);
            const isUnread = !n.readAt;

            return (
              <NotifRow key={n.id} $unread={isUnread} onClick={() => handleClick(n)}>
                <NotifIcon $color={meta.bg}>{meta.icon}</NotifIcon>
                <NotifContent>
                  <NotifTitle>{n.title}</NotifTitle>
                  <NotifBody>{n.body}</NotifBody>
                </NotifContent>
                <NotifTime>{relativeTime(n.createdAt)}</NotifTime>
                {isUnread && <UnreadDot />}
              </NotifRow>
            );
          })}
        </NotifList>
      </Dropdown>
    </BellWrapper>
  );
};

export default NotificationBell;
