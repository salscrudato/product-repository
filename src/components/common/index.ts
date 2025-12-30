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
  SkeletonForm,
  SkeletonProductCard,
  SkeletonStats,
  SkeletonPageHeader
} from './Skeleton';

// Typography
export {
  H1, H2, H3, H4,
  Body, BodyLarge, BodySmall,
  TextMuted, TextSecondary, TextError, TextSuccess,
  Label, LabelSmall, Caption, Code, TextLink, TruncatedText
} from './Typography';

// Summary/snapshot components
export { CoverageSnapshot } from './CoverageSnapshot';

// Design System
export {
  // Animations
  fadeInUp,
  fadeIn,
  scaleIn,
  slideDown,
  slideUp,
  pulse,
  shimmer,
  spin,
  glow,
  ripple,
  // Colors
  colors,
  gradients,
  // Statistics Dashboard
  StatsDashboard,
  StatCard,
  StatValue,
  StatLabel,
  StatTrend,
  // Card Components
  EnhancedCard,
  CardHeader,
  CardTitle,
  CardSubtitle,
  CardContent,
  CardFooter,
  CardActions,
  // Buttons
  IconButton,
  // Badges
  TypeBadge,
  CountBadge,
  // Empty State
  EmptyStateContainer,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  // Loading (Note: For LoadingSpinner, use '@/components/ui/LoadingSpinner' instead)
  LoadingContainer,
  LoadingText,
  // Action Bar
  ActionBar,
  ActionBarCount,
  ActionBarButton,
  // Slider
  SliderContainer,
  SliderTrack,
  SliderFill,
  SliderThumb,
  SliderLabels,
  // Quick Amounts
  QuickAmountContainer,
  QuickAmountButton,
  // Section Header
  SectionHeader,
  SectionTitle,
  SectionSubtitle,
  // Filters
  FilterChipsContainer,
  FilterChip,
  // Gradient
  GradientBar,
  // Page Layout Components
  PageActionBar,
  FilterBar,
  FilterSelect,
  CommandBar,
  CommandBarSection
} from './DesignSystem';
