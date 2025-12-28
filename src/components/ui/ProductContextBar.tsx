// src/components/ui/ProductContextBar.tsx
import React, { memo, useMemo } from 'react';
import { NavLink, useLocation, useParams } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import {
  ShieldCheckIcon,
  CurrencyDollarIcon,
  DocumentDuplicateIcon,
  MapPinIcon,
  Cog6ToothIcon,
  ChevronRightIcon,
  HomeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';

/* ---------- Animations ---------- */
const slideIn = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

/* ---------- Container ---------- */
const ContextBarWrapper = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02);
  animation: ${slideIn} 0.3s ease-out;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4);
    opacity: 0.8;
  }
`;

const ContextBarContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;

  @media (max-width: 1024px) {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
`;

/* ---------- Product Info Section ---------- */
const ProductInfoSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
`;

const ProductIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);

  svg {
    width: 24px;
    height: 24px;
  }
`;

const ProductDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ProductName = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ProductMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const MetaBadge = styled.span<{ $variant?: 'default' | 'success' | 'warning' | 'info' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  
  ${({ $variant = 'default' }) => {
    switch ($variant) {
      case 'success':
        return css`
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.2);
        `;
      case 'warning':
        return css`
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
          border: 1px solid rgba(245, 158, 11, 0.2);
        `;
      case 'info':
        return css`
          background: rgba(99, 102, 241, 0.1);
          color: #6366f1;
          border: 1px solid rgba(99, 102, 241, 0.2);
        `;
      default:
        return css`
          background: rgba(100, 116, 139, 0.1);
          color: #475569;
          border: 1px solid rgba(100, 116, 139, 0.2);
        `;
    }
  }}

  svg {
    width: 12px;
    height: 12px;
  }
`;

const UnsavedIndicator = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(245, 158, 11, 0.15);
  color: #b45309;
  border: 1px solid rgba(245, 158, 11, 0.3);
  animation: ${pulse} 2s ease-in-out infinite;

  svg {
    width: 12px;
    height: 12px;
  }
`;

/* ---------- Navigation Tabs ---------- */
const NavTabs = styled.nav`
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(241, 245, 249, 0.8);
  padding: 4px;
  border-radius: 12px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }
`;

const NavTab = styled(NavLink)<{ $isActive?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  color: #64748b;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  white-space: nowrap;

  svg {
    width: 16px;
    height: 16px;
    transition: transform 0.2s ease;
  }

  &:hover {
    color: #6366f1;
    background: rgba(99, 102, 241, 0.08);

    svg {
      transform: scale(1.1);
    }
  }

  &.active {
    color: #6366f1;
    background: white;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);

    &::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 50%;
      transform: translateX(-50%);
      width: 20px;
      height: 3px;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      border-radius: 2px;
    }
  }

  &:focus-visible {
    outline: 2px solid rgba(99, 102, 241, 0.4);
    outline-offset: 2px;
  }
`;

const TabBadge = styled.span<{ $variant?: 'default' | 'warning' | 'success' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;

  ${({ $variant = 'default' }) => {
    switch ($variant) {
      case 'warning':
        return css`
          background: rgba(245, 158, 11, 0.2);
          color: #b45309;
        `;
      case 'success':
        return css`
          background: rgba(16, 185, 129, 0.2);
          color: #059669;
        `;
      default:
        return css`
          background: rgba(99, 102, 241, 0.15);
          color: #6366f1;
        `;
    }
  }}
`;

/* ---------- Quick Actions ---------- */
const QuickActionsSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const QuickActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ $variant = 'secondary' }) =>
    $variant === 'primary'
      ? css`
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border: none;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
          }

          &:active {
            transform: translateY(0);
          }
        `
      : css`
          background: white;
          color: #475569;
          border: 1px solid rgba(226, 232, 240, 0.8);

          &:hover {
            border-color: #6366f1;
            color: #6366f1;
            background: rgba(99, 102, 241, 0.04);
          }
        `}

  svg {
    width: 16px;
    height: 16px;
  }

  &:focus-visible {
    outline: 2px solid rgba(99, 102, 241, 0.4);
    outline-offset: 2px;
  }
`;

/* ---------- Health Score Ring ---------- */
const HealthScoreRing = styled.div<{ $score: number }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: conic-gradient(
    ${({ $score }) => $score >= 80 ? '#10b981' : $score >= 60 ? '#f59e0b' : '#ef4444'} ${({ $score }) => $score * 3.6}deg,
    rgba(226, 232, 240, 0.5) 0deg
  );
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;

  &::before {
    content: '';
    position: absolute;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: white;
  }

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const HealthScoreValue = styled.span<{ $score: number }>`
  position: relative;
  z-index: 1;
  font-size: 12px;
  font-weight: 700;
  color: ${({ $score }) => $score >= 80 ? '#10b981' : $score >= 60 ? '#f59e0b' : '#ef4444'};
`;

const HealthScoreTooltip = styled.div`
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 8px;
  padding: 12px 16px;
  background: #1e293b;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 100;
  min-width: 200px;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;

  ${HealthScoreRing}:hover & {
    opacity: 1;
    visibility: visible;
  }

  &::before {
    content: '';
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-bottom-color: #1e293b;
  }
`;

const TooltipTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: white;
  margin-bottom: 8px;
`;

const TooltipItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 4px;

  &:last-child { margin-bottom: 0; }

  svg { width: 12px; height: 12px; }
`;

/* ---------- Quick Insight Pill ---------- */
const InsightPill = styled.div<{ $type: 'success' | 'warning' | 'info' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  animation: ${slideIn} 0.3s ease-out;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ $type }) => {
    switch ($type) {
      case 'success':
        return css`
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.2);
        `;
      case 'warning':
        return css`
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
          border: 1px solid rgba(245, 158, 11, 0.2);
        `;
      default:
        return css`
          background: rgba(99, 102, 241, 0.1);
          color: #6366f1;
          border: 1px solid rgba(99, 102, 241, 0.2);
        `;
    }
  }}

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  svg { width: 14px; height: 14px; }
`;

/* ---------- Dashboard Link ---------- */
const DashboardLink = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.2);
  transition: all 0.2s ease;
  margin-right: 8px;

  &:hover {
    background: rgba(99, 102, 241, 0.15);
    transform: translateY(-1px);
  }

  svg { width: 16px; height: 16px; }
`;

/* ---------- Navigation Config ---------- */
const navConfig = [
  { path: 'coverage', label: 'Coverages', Icon: ShieldCheckIcon },
  { path: 'pricing', label: 'Pricing', Icon: CurrencyDollarIcon },
  { path: 'forms', label: 'Forms', Icon: DocumentDuplicateIcon },
  { path: 'states', label: 'States', Icon: MapPinIcon },
  { path: 'rules', label: 'Rules', Icon: Cog6ToothIcon },
];

/* ---------- Component Props ---------- */
interface ProductContextBarProps {
  productId: string;
  productName: string;
  productCode?: string;
  formNumber?: string;
  effectiveDate?: string;
  status?: 'active' | 'pending' | 'archived';
  hasUnsavedChanges?: boolean;
  counts?: {
    coverages?: number;
    pricing?: number;
    forms?: number;
    states?: number;
    rules?: number;
  };
  healthScore?: number;
  quickInsight?: {
    type: 'success' | 'warning' | 'info';
    text: string;
  };
  onAISummary?: () => void;
  isLoadingSummary?: boolean;
  showDashboardLink?: boolean;
}

/* ---------- Main Component ---------- */
const ProductContextBar: React.FC<ProductContextBarProps> = memo(({
  productId,
  productName,
  productCode,
  formNumber,
  effectiveDate,
  status = 'active',
  hasUnsavedChanges = false,
  counts = {},
  healthScore,
  quickInsight,
  onAISummary,
  isLoadingSummary = false,
  showDashboardLink = true,
}) => {
  const location = useLocation();

  const getStatusVariant = (s: string): 'success' | 'warning' | 'default' => {
    switch (s) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (s: string) => {
    switch (s) {
      case 'active': return CheckCircleIcon;
      case 'pending': return ClockIcon;
      default: return ExclamationTriangleIcon;
    }
  };

  // Calculate health score from counts if not provided
  const calculatedHealthScore = useMemo(() => {
    if (healthScore !== undefined) return healthScore;
    let score = 0;
    if (counts.coverages && counts.coverages > 0) score += 25;
    if (counts.forms && counts.forms > 0) score += 20;
    if (counts.pricing && counts.pricing > 0) score += 20;
    if (counts.states && counts.states > 0) score += 20;
    if (counts.rules && counts.rules > 0) score += 15;
    return score;
  }, [healthScore, counts]);

  // Generate quick insight if not provided
  const displayInsight = useMemo(() => {
    if (quickInsight) return quickInsight;
    if (!counts.coverages || counts.coverages === 0) {
      return { type: 'warning' as const, text: 'Add coverages to get started' };
    }
    if (!counts.forms || counts.forms === 0) {
      return { type: 'info' as const, text: 'Upload policy forms' };
    }
    if (calculatedHealthScore >= 80) {
      return { type: 'success' as const, text: 'Product ready for market' };
    }
    return null;
  }, [quickInsight, counts, calculatedHealthScore]);

  const StatusIcon = getStatusIcon(status);

  return (
    <ContextBarWrapper>
      <ContextBarContent>
        <ProductInfoSection>
          {/* Health Score Ring */}
          <HealthScoreRing $score={calculatedHealthScore}>
            <HealthScoreValue $score={calculatedHealthScore}>
              {calculatedHealthScore}
            </HealthScoreValue>
            <HealthScoreTooltip>
              <TooltipTitle>Product Health Score</TooltipTitle>
              <TooltipItem>
                <CheckCircleIcon style={{ color: counts.coverages ? '#10b981' : '#64748b' }} />
                Coverages: {counts.coverages || 0}
              </TooltipItem>
              <TooltipItem>
                <CheckCircleIcon style={{ color: counts.forms ? '#10b981' : '#64748b' }} />
                Forms: {counts.forms || 0}
              </TooltipItem>
              <TooltipItem>
                <CheckCircleIcon style={{ color: counts.pricing ? '#10b981' : '#64748b' }} />
                Pricing Rules: {counts.pricing || 0}
              </TooltipItem>
              <TooltipItem>
                <CheckCircleIcon style={{ color: counts.states ? '#10b981' : '#64748b' }} />
                States: {counts.states || 0}
              </TooltipItem>
            </HealthScoreTooltip>
          </HealthScoreRing>

          <ProductDetails>
            <ProductName>
              {productName}
              {hasUnsavedChanges && (
                <UnsavedIndicator>
                  <ExclamationTriangleIcon />
                  Unsaved
                </UnsavedIndicator>
              )}
            </ProductName>
            <ProductMeta>
              <MetaBadge $variant={getStatusVariant(status)}>
                <StatusIcon />
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </MetaBadge>
              {productCode && (
                <MetaBadge $variant="info">
                  {productCode}
                </MetaBadge>
              )}
              {formNumber && (
                <MetaBadge>
                  {formNumber}
                </MetaBadge>
              )}
              {effectiveDate && (
                <MetaBadge>
                  <ClockIcon />
                  {effectiveDate}
                </MetaBadge>
              )}
              {/* Quick Insight Pill */}
              {displayInsight && (
                <InsightPill $type={displayInsight.type}>
                  <SparklesIcon />
                  {displayInsight.text}
                </InsightPill>
              )}
            </ProductMeta>
          </ProductDetails>
        </ProductInfoSection>

        <NavTabs aria-label="Product navigation">
          {/* Dashboard Link */}
          {showDashboardLink && (
            <DashboardLink to={`/products/${productId}/overview`}>
              <HomeIcon />
              Dashboard
            </DashboardLink>
          )}
          {navConfig.map(({ path, label, Icon }) => (
            <NavTab
              key={path}
              to={`/${path}/${productId}`}
              aria-current={location.pathname.includes(`/${path}/`) ? 'page' : undefined}
            >
              <Icon />
              {label}
              {counts[path as keyof typeof counts] !== undefined && (
                <TabBadge
                  $variant={counts[path as keyof typeof counts] === 0 ? 'warning' : 'default'}
                >
                  {counts[path as keyof typeof counts]}
                </TabBadge>
              )}
            </NavTab>
          ))}
        </NavTabs>

        {onAISummary && (
          <QuickActionsSection>
            <QuickActionButton
              $variant="primary"
              onClick={onAISummary}
              disabled={isLoadingSummary}
              aria-label="Generate AI Summary"
            >
              <SparklesIcon />
              {isLoadingSummary ? 'Analyzing...' : 'AI Summary'}
            </QuickActionButton>
          </QuickActionsSection>
        )}
      </ContextBarContent>
    </ContextBarWrapper>
  );
});

ProductContextBar.displayName = 'ProductContextBar';

export default ProductContextBar;

