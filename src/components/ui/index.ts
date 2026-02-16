/**
 * UI Components Index
 * Centralized exports for all UI components
 */

// Layout & Navigation
export { default as Breadcrumb } from './Breadcrumb';
export { Page, Container, PageHeader, Title as LayoutTitle } from './Layout';
export { default as MainNavigation } from './Navigation';
export { PageContainer, PageContent } from './PageContainer';
export { RouteProgressProvider, useRouteProgress } from './RouteProgress';

// Buttons & Inputs
export { Button, IconButton as UIIconButton, ButtonWithLoading } from './Button';
export { TextInput, TextArea, Select, Checkbox, Radio } from './Input';

// Cards
export { Card, CardHeader as UICardHeader, CardTitle as UICardTitle, CardBody, CardFooter as UICardFooter, CardActions as UICardActions, CardGroup, CardBadge } from './Card';
export { default as ProductCard } from './ProductCard';

// Feedback & Status
export { EmptyState } from './EmptyState';
export { default as LoadingSpinner, PageLoadingSpinner } from './LoadingSpinner';
export { ConnectionStatus } from './ConnectionStatus';

// Tooltips & Helpers
export { Tooltip, InfoTooltip } from './Tooltip';

// Modals & Dialogs
export { default as ConfirmationModal } from './ConfirmationModal';

// Data Display
export { Table, TableEmptyState, TableWrapper, THead, TBody, Tr, Th, Td } from './Table';
export { default as VirtualizedGrid } from './VirtualizedGrid';

// Headers
export { default as EnhancedHeader } from './EnhancedHeader';

// AI & Chat Components
export { EnhancedChatMessage } from './EnhancedChatMessage';
export { UnifiedAIResponse } from './UnifiedAIResponse';
