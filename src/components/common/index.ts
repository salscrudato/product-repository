/**
 * Common Components Index
 * 
 * Central export for all common/shared UI components.
 * Import from '@/components/common' for convenience.
 */

// Status and Notifications
export { StatusAnnouncerProvider, useStatusAnnouncer } from './StatusAnnouncer';
export { ToastProvider, useToast } from './Toast';

// Loading and Progress
export { 
  Skeleton, 
  SkeletonText, 
  SkeletonHeading, 
  SkeletonAvatar, 
  SkeletonButton,
  SkeletonCard,
  SkeletonTable,
  SkeletonCardList,
  SkeletonForm
} from './Skeleton';
export { ProgressBar, StepProgress } from './ProgressBar';

// Typography
export {
  H1, H2, H3, H4,
  Body, BodyLarge, BodySmall,
  TextMuted, TextSecondary, TextError, TextSuccess,
  Label, LabelSmall, Caption, Code, TextLink, TruncatedText
} from './Typography';

// Badges
export { Badge, StatusBadge, CountBadge } from './Badge';

// Navigation
export { CommandPalette, useCommandPalette } from './CommandPalette';
