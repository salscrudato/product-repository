/**
 * Product 360 Dashboard
 * Comprehensive product management dashboard with KPIs, charts, and quick actions
 * Route: /products/:productId/overview
 *
 * Features:
 * - Product health score with AI insights
 * - Real-time KPI cards with trends
 * - Interactive coverage/form/pricing summaries
 * - Quick action buttons for common tasks
 * - Recent activity timeline
 * - State availability heat map
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { Product, Coverage, Form } from '@types/index';
import logger, { LOG_CATEGORIES } from '@utils/logger';
import { getProduct360Summary, Product360Summary } from '@services/product360ReadModel';
import MainNavigation from '@components/ui/Navigation';
import { PageContainer, PageContent } from '@components/ui/PageContainer';
import {
  ShieldCheckIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  SparklesIcon,
  ArrowRightIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  Squares2X2Icon,
  ArrowLeftIcon,
  BoltIcon,
  LightBulbIcon,
  BeakerIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline';
import { SparklesIcon as SparklesSolid } from '@heroicons/react/24/solid';

/* ========== Animations ========== */
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideIn = keyframes`
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
  50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.5); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
`;

/* ========== Container Styles ========== */
const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
`;

const MainContent = styled.div`
  max-width: 1600px;
  margin: 0 auto;
  padding: 32px 24px 80px;
`;

/* ========== Header Section ========== */
const HeaderSection = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 32px;
  gap: 24px;
  flex-wrap: wrap;
  animation: ${fadeInUp} 0.5s ease-out;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 12px;
  background: white;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
  }

  svg { width: 20px; height: 20px; }
`;

const ProductIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.35);
  animation: ${float} 3s ease-in-out infinite;

  svg { width: 32px; height: 32px; }
`;

const ProductInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ProductName = styled.h1`
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  letter-spacing: -0.03em;
`;

const ProductMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const MetaBadge = styled.span<{ $variant?: 'success' | 'warning' | 'info' | 'default' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
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
          color: #64748b;
          border: 1px solid rgba(100, 116, 139, 0.2);
        `;
    }
  }}

  svg { width: 14px; height: 14px; }
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const QuickActionBtn = styled.button<{ $primary?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ $primary }) => $primary ? css`
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    border: none;
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.45);
    }
  ` : css`
    background: white;
    color: #475569;
    border: 1px solid rgba(226, 232, 240, 0.8);

    &:hover {
      border-color: #6366f1;
      color: #6366f1;
      background: rgba(99, 102, 241, 0.04);
    }
  `}

  svg { width: 18px; height: 18px; }
`;

/* ========== Health Score Card ========== */
const HealthScoreCard = styled.div`
  background: white;
  border-radius: 20px;
  padding: 28px;
  margin-bottom: 32px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 32px;
  animation: ${fadeInUp} 0.5s ease-out 0.1s backwards;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ScoreCircle = styled.div<{ $score: number }>`
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: conic-gradient(
    ${({ $score }) => $score >= 80 ? '#10b981' : $score >= 60 ? '#f59e0b' : '#ef4444'} ${({ $score }) => $score * 3.6}deg,
    #e2e8f0 0deg
  );
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin: 0 auto;

  &::before {
    content: '';
    position: absolute;
    width: 130px;
    height: 130px;
    border-radius: 50%;
    background: white;
  }
`;

const ScoreValue = styled.div`
  position: relative;
  z-index: 1;
  text-align: center;
`;

const ScoreNumber = styled.div<{ $score: number }>`
  font-size: 42px;
  font-weight: 800;
  color: ${({ $score }) => $score >= 80 ? '#10b981' : $score >= 60 ? '#f59e0b' : '#ef4444'};
  line-height: 1;
`;

const ScoreLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 4px;
`;

const InsightsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const InsightsTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;

  svg { width: 20px; height: 20px; color: #6366f1; }
`;

const InsightsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InsightItem = styled.div<{ $type: 'success' | 'warning' | 'info' }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: ${({ $type }) =>
    $type === 'success' ? 'rgba(16, 185, 129, 0.08)' :
    $type === 'warning' ? 'rgba(245, 158, 11, 0.08)' :
    'rgba(99, 102, 241, 0.08)'
  };
  border-left: 3px solid ${({ $type }) =>
    $type === 'success' ? '#10b981' :
    $type === 'warning' ? '#f59e0b' :
    '#6366f1'
  };

  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    margin-top: 2px;
    color: ${({ $type }) =>
      $type === 'success' ? '#10b981' :
      $type === 'warning' ? '#f59e0b' :
      '#6366f1'
    };
  }
`;

const InsightText = styled.div`
  font-size: 14px;
  color: #475569;
  line-height: 1.5;
`;

/* ========== KPI Grid ========== */
const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
`;

const KPICard = styled(Link)<{ $color: string; $delay?: number }>`
  background: white;
  border-radius: 16px;
  padding: 24px;
  text-decoration: none;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: ${fadeInUp} 0.5s ease-out ${({ $delay }) => 0.1 + ($delay || 0) * 0.05}s backwards;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${({ $color }) => $color};
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);

    &::before { opacity: 1; }
  }
`;

const KPIHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const KPIIcon = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${({ $color }) => $color}15;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $color }) => $color};

  svg { width: 24px; height: 24px; }
`;

const KPITrend = styled.div<{ $positive?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ $positive }) => $positive ? '#10b981' : '#ef4444'};

  svg { width: 14px; height: 14px; }
`;

const KPIValue = styled.div`
  font-size: 36px;
  font-weight: 800;
  color: #1e293b;
  line-height: 1;
  margin-bottom: 8px;
`;

const KPILabel = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
`;

const KPISubtext = styled.div`
  font-size: 12px;
  color: #94a3b8;
  margin-top: 8px;
`;

/* ========== Content Grid ========== */
const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  margin-bottom: 32px;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div<{ $delay?: number }>`
  background: white;
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  animation: ${fadeInUp} 0.5s ease-out ${({ $delay }) => 0.2 + ($delay || 0) * 0.1}s backwards;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`;

const CardTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;

  svg { width: 20px; height: 20px; color: #6366f1; }
`;

const ViewAllLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    gap: 10px;
  }

  svg { width: 16px; height: 16px; }
`;

/* ========== Coverage List ========== */
const CoverageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CoverageItem = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-radius: 12px;
  background: #f8fafc;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    transform: translateX(4px);
  }
`;

const CoverageInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const CoverageIcon = styled.div<{ $isParent?: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${({ $isParent }) => $isParent
    ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
    : 'rgba(99, 102, 241, 0.1)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $isParent }) => $isParent ? 'white' : '#6366f1'};

  svg { width: 20px; height: 20px; }
`;

const CoverageDetails = styled.div``;

const CoverageName = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
`;

const CoverageCode = styled.div`
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
`;

const CoverageStats = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const CoverageStat = styled.div`
  text-align: right;
`;

const CoverageStatValue = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
`;

const CoverageStatLabel = styled.div`
  font-size: 11px;
  color: #94a3b8;
`;

/* ========== Activity Timeline ========== */
const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ActivityItem = styled.div`
  display: flex;
  gap: 14px;
  position: relative;

  &:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 17px;
    top: 40px;
    bottom: -16px;
    width: 2px;
    background: #e2e8f0;
  }
`;

const ActivityIcon = styled.div<{ $type: string }>`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ $type }) =>
    $type === 'coverage' ? 'rgba(99, 102, 241, 0.1)' :
    $type === 'form' ? 'rgba(16, 185, 129, 0.1)' :
    $type === 'pricing' ? 'rgba(245, 158, 11, 0.1)' :
    'rgba(100, 116, 139, 0.1)'
  };
  color: ${({ $type }) =>
    $type === 'coverage' ? '#6366f1' :
    $type === 'form' ? '#10b981' :
    $type === 'pricing' ? '#f59e0b' :
    '#64748b'
  };

  svg { width: 18px; height: 18px; }
`;

const ActivityContent = styled.div`
  flex: 1;
`;

const ActivityTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
`;

const ActivityDescription = styled.div`
  font-size: 13px;
  color: #64748b;
  margin-top: 2px;
`;

const ActivityTime = styled.div`
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
`;

/* ========== Quick Actions Grid ========== */
const QuickActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`;

const QuickActionCard = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 16px;
  border-radius: 16px;
  background: #f8fafc;
  text-decoration: none;
  text-align: center;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    transform: translateY(-4px);
  }
`;

const QuickActionIcon = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;

  svg { width: 26px; height: 26px; }
`;

const QuickActionLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
`;

const QuickActionDesc = styled.div`
  font-size: 12px;
  color: #64748b;
`;

/* ========== Loading State ========== */
const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 20px;
`;

const LoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid #e2e8f0;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.div`
  font-size: 16px;
  color: #64748b;
  font-weight: 500;
`;

/* ========== Error State ========== */
const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 16px;
  text-align: center;
`;

const ErrorIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: rgba(239, 68, 68, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;

  svg { width: 32px; height: 32px; }
`;

const ErrorTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
`;

const ErrorMessage = styled.p`
  font-size: 14px;
  color: #64748b;
  margin: 0;
  max-width: 400px;
`;

/* ========== Component ========== */
interface Product360Props {}

const Product360: React.FC<Product360Props> = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [summary, setSummary] = useState<Product360Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) return;
      try {
        const productSummary = await getProduct360Summary(productId);
        if (productSummary) {
          setProduct(productSummary.product);
          setSummary(productSummary);
        } else {
          setError('Product not found');
        }
      } catch (err) {
        logger.error(LOG_CATEGORIES.ERROR, 'Failed to load product', {}, err as Error);
        setError('Failed to load product');
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [productId]);

  // Calculate health score based on product completeness
  const healthScore = useMemo(() => {
    if (!summary) return 0;
    let score = 0;
    const { stats } = summary;

    // Coverages (30 points)
    if (stats.totalCoverages > 0) score += 15;
    if (stats.totalCoverages >= 5) score += 15;

    // Forms (20 points)
    if (stats.totalForms > 0) score += 10;
    if (stats.totalForms >= 3) score += 10;

    // Limits & Deductibles (20 points)
    if (stats.totalLimits > 0) score += 10;
    if (stats.totalDeductibles > 0) score += 10;

    // Rules (15 points)
    if (stats.totalRules > 0) score += 15;

    // States (15 points)
    if (product?.states && product.states.length > 0) score += 15;

    return Math.min(score, 100);
  }, [summary, product]);

  // Generate insights based on product data
  const insights = useMemo(() => {
    if (!summary || !product) return [];
    const items: Array<{ type: 'success' | 'warning' | 'info'; text: string }> = [];

    if (summary.stats.totalCoverages === 0) {
      items.push({ type: 'warning', text: 'No coverages defined. Add coverages to complete your product.' });
    } else if (summary.stats.totalCoverages >= 5) {
      items.push({ type: 'success', text: `${summary.stats.totalCoverages} coverages configured with comprehensive options.` });
    }

    if (summary.stats.totalForms === 0) {
      items.push({ type: 'warning', text: 'No forms linked. Upload policy forms for compliance.' });
    }

    if (summary.stats.totalRules === 0) {
      items.push({ type: 'info', text: 'Consider adding business rules for automated underwriting.' });
    }

    if (!product.states || product.states.length === 0) {
      items.push({ type: 'warning', text: 'No states selected. Define state availability.' });
    } else if (product.states.length >= 10) {
      items.push({ type: 'success', text: `Available in ${product.states.length} states with broad market reach.` });
    }

    return items.slice(0, 4);
  }, [summary, product]);

  // Get top coverages for display
  const topCoverages = useMemo(() => {
    if (!summary) return [];
    return summary.coverages
      .filter(c => !c.parentCoverageId)
      .slice(0, 5);
  }, [summary]);

  // Mock recent activity (would come from audit logs in production)
  const recentActivity = useMemo(() => [
    { type: 'coverage', title: 'Coverage Updated', description: 'Property Damage limits modified', time: '2 hours ago' },
    { type: 'form', title: 'Form Uploaded', description: 'CP 00 10 policy form added', time: '5 hours ago' },
    { type: 'pricing', title: 'Pricing Rule Added', description: 'Territory factor configured', time: '1 day ago' },
    { type: 'coverage', title: 'New Coverage', description: 'Business Income coverage added', time: '2 days ago' },
  ], []);

  if (loading) {
    return (
      <PageContainer>
        <MainNavigation />
        <PageContent>
          <LoadingContainer>
            <LoadingSpinner />
            <LoadingText>Loading product dashboard...</LoadingText>
          </LoadingContainer>
        </PageContent>
      </PageContainer>
    );
  }

  if (error || !product || !summary) {
    return (
      <PageContainer>
        <MainNavigation />
        <PageContent>
          <ErrorContainer>
            <ErrorIcon>
              <ExclamationTriangleIcon />
            </ErrorIcon>
            <ErrorTitle>Unable to Load Product</ErrorTitle>
            <ErrorMessage>{error || 'The product could not be found or loaded.'}</ErrorMessage>
            <QuickActionBtn onClick={() => navigate('/products')}>
              <ArrowLeftIcon />
              Back to Products
            </QuickActionBtn>
          </ErrorContainer>
        </PageContent>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <MainNavigation />
      <PageContent>
        <MainContent>
          {/* Header */}
          <HeaderSection>
            <HeaderLeft>
              <BackButton onClick={() => navigate('/products')}>
                <ArrowLeftIcon />
              </BackButton>
              <ProductIcon>
                <ShieldCheckIcon />
              </ProductIcon>
              <ProductInfo>
                <ProductName>{product.name}</ProductName>
                <ProductMeta>
                  <MetaBadge $variant={product.status === 'active' ? 'success' : 'warning'}>
                    {product.status === 'active' ? <CheckCircleIcon /> : <ClockIcon />}
                    {product.status || 'Draft'}
                  </MetaBadge>
                  {product.productCode && (
                    <MetaBadge $variant="info">{product.productCode}</MetaBadge>
                  )}
                  {product.category && (
                    <MetaBadge>{product.category}</MetaBadge>
                  )}
                </ProductMeta>
              </ProductInfo>
            </HeaderLeft>
            <HeaderRight>
              <QuickActionBtn onClick={() => navigate(`/coverage/${productId}`)}>
                <EyeIcon />
                View Details
              </QuickActionBtn>
              <QuickActionBtn $primary onClick={() => navigate(`/coverage/${productId}`)}>
                <PencilIcon />
                Edit Product
              </QuickActionBtn>
            </HeaderRight>
          </HeaderSection>

          {/* Health Score Card */}
          <HealthScoreCard>
            <ScoreCircle $score={healthScore}>
              <ScoreValue>
                <ScoreNumber $score={healthScore}>{healthScore}</ScoreNumber>
                <ScoreLabel>Health Score</ScoreLabel>
              </ScoreValue>
            </ScoreCircle>
            <InsightsSection>
              <InsightsTitle>
                <SparklesSolid />
                AI Insights
              </InsightsTitle>
              <InsightsList>
                {insights.map((insight, idx) => (
                  <InsightItem key={idx} $type={insight.type}>
                    {insight.type === 'success' ? <CheckCircleIcon /> :
                     insight.type === 'warning' ? <ExclamationTriangleIcon /> :
                     <LightBulbIcon />}
                    <InsightText>{insight.text}</InsightText>
                  </InsightItem>
                ))}
              </InsightsList>
            </InsightsSection>
          </HealthScoreCard>

          {/* KPI Grid */}
          <KPIGrid>
            <KPICard to={`/coverage/${productId}`} $color="#6366f1" $delay={0}>
              <KPIHeader>
                <KPIIcon $color="#6366f1"><ShieldCheckIcon /></KPIIcon>
                <KPITrend $positive><ArrowTrendingUpIcon />+2</KPITrend>
              </KPIHeader>
              <KPIValue>{summary.stats.totalCoverages}</KPIValue>
              <KPILabel>Coverages</KPILabel>
              <KPISubtext>{summary.stats.totalLimits} limits • {summary.stats.totalDeductibles} deductibles</KPISubtext>
            </KPICard>

            <KPICard to={`/forms/${productId}`} $color="#10b981" $delay={1}>
              <KPIHeader>
                <KPIIcon $color="#10b981"><DocumentTextIcon /></KPIIcon>
              </KPIHeader>
              <KPIValue>{summary.stats.totalForms}</KPIValue>
              <KPILabel>Forms</KPILabel>
              <KPISubtext>Policy forms & endorsements</KPISubtext>
            </KPICard>

            <KPICard to={`/pricing/${productId}`} $color="#f59e0b" $delay={2}>
              <KPIHeader>
                <KPIIcon $color="#f59e0b"><CurrencyDollarIcon /></KPIIcon>
              </KPIHeader>
              <KPIValue>{summary.stats.totalPricingRules}</KPIValue>
              <KPILabel>Pricing Rules</KPILabel>
              <KPISubtext>Rating factors & tables</KPISubtext>
            </KPICard>

            <KPICard to={`/states/${productId}`} $color="#8b5cf6" $delay={3}>
              <KPIHeader>
                <KPIIcon $color="#8b5cf6"><MapPinIcon /></KPIIcon>
              </KPIHeader>
              <KPIValue>{product.states?.length || 0}</KPIValue>
              <KPILabel>States</KPILabel>
              <KPISubtext>Market availability</KPISubtext>
            </KPICard>

            <KPICard to={`/rules/${productId}`} $color="#06b6d4" $delay={4}>
              <KPIHeader>
                <KPIIcon $color="#06b6d4"><Cog6ToothIcon /></KPIIcon>
              </KPIHeader>
              <KPIValue>{summary.stats.totalRules}</KPIValue>
              <KPILabel>Business Rules</KPILabel>
              <KPISubtext>Eligibility & validation</KPISubtext>
            </KPICard>
          </KPIGrid>

          {/* Content Grid */}
          <ContentGrid>
            {/* Coverages Card */}
            <Card $delay={0}>
              <CardHeader>
                <CardTitle>
                  <ShieldCheckIcon />
                  Top Coverages
                </CardTitle>
                <ViewAllLink to={`/coverage/${productId}`}>
                  View All <ArrowRightIcon />
                </ViewAllLink>
              </CardHeader>
              <CoverageList>
                {topCoverages.length > 0 ? topCoverages.map((coverage, idx) => (
                  <CoverageItem key={coverage.id} to={`/coverage/${productId}`}>
                    <CoverageInfo>
                      <CoverageIcon $isParent>
                        <ShieldCheckIcon />
                      </CoverageIcon>
                      <CoverageDetails>
                        <CoverageName>{coverage.name}</CoverageName>
                        <CoverageCode>{coverage.coverageCode || 'No code'}</CoverageCode>
                      </CoverageDetails>
                    </CoverageInfo>
                    <CoverageStats>
                      <CoverageStat>
                        <CoverageStatValue>{(coverage.limits as any[])?.length || 0}</CoverageStatValue>
                        <CoverageStatLabel>Limits</CoverageStatLabel>
                      </CoverageStat>
                      <CoverageStat>
                        <CoverageStatValue>{(coverage.deductibles as any[])?.length || 0}</CoverageStatValue>
                        <CoverageStatLabel>Deductibles</CoverageStatLabel>
                      </CoverageStat>
                    </CoverageStats>
                  </CoverageItem>
                )) : (
                  <CoverageItem to={`/coverage/${productId}`}>
                    <CoverageInfo>
                      <CoverageIcon>
                        <PlusIcon />
                      </CoverageIcon>
                      <CoverageDetails>
                        <CoverageName>Add Your First Coverage</CoverageName>
                        <CoverageCode>Click to get started</CoverageCode>
                      </CoverageDetails>
                    </CoverageInfo>
                  </CoverageItem>
                )}
              </CoverageList>
            </Card>

            {/* Activity Card */}
            <Card $delay={1}>
              <CardHeader>
                <CardTitle>
                  <ClockIcon />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <ActivityList>
                {recentActivity.map((activity, idx) => (
                  <ActivityItem key={idx}>
                    <ActivityIcon $type={activity.type}>
                      {activity.type === 'coverage' ? <ShieldCheckIcon /> :
                       activity.type === 'form' ? <DocumentTextIcon /> :
                       <CurrencyDollarIcon />}
                    </ActivityIcon>
                    <ActivityContent>
                      <ActivityTitle>{activity.title}</ActivityTitle>
                      <ActivityDescription>{activity.description}</ActivityDescription>
                      <ActivityTime>{activity.time}</ActivityTime>
                    </ActivityContent>
                  </ActivityItem>
                ))}
              </ActivityList>
            </Card>
          </ContentGrid>

          {/* Quick Actions */}
          <Card $delay={2}>
            <CardHeader>
              <CardTitle>
                <BoltIcon />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <QuickActionsGrid>
              <QuickActionCard to={`/coverage/${productId}`}>
                <QuickActionIcon><PlusIcon /></QuickActionIcon>
                <QuickActionLabel>Add Coverage</QuickActionLabel>
                <QuickActionDesc>Create new coverage option</QuickActionDesc>
              </QuickActionCard>
              <QuickActionCard to={`/forms/${productId}`}>
                <QuickActionIcon><DocumentTextIcon /></QuickActionIcon>
                <QuickActionLabel>Upload Form</QuickActionLabel>
                <QuickActionDesc>Add policy documents</QuickActionDesc>
              </QuickActionCard>
              <QuickActionCard to={`/pricing/${productId}`}>
                <QuickActionIcon><CurrencyDollarIcon /></QuickActionIcon>
                <QuickActionLabel>Configure Pricing</QuickActionLabel>
                <QuickActionDesc>Set up rating factors</QuickActionDesc>
              </QuickActionCard>
              <QuickActionCard to={`/rules/${productId}`}>
                <QuickActionIcon><Cog6ToothIcon /></QuickActionIcon>
                <QuickActionLabel>Add Rule</QuickActionLabel>
                <QuickActionDesc>Define business logic</QuickActionDesc>
              </QuickActionCard>
              <QuickActionCard to={`/states/${productId}`}>
                <QuickActionIcon><MapPinIcon /></QuickActionIcon>
                <QuickActionLabel>Manage States</QuickActionLabel>
                <QuickActionDesc>Set availability</QuickActionDesc>
              </QuickActionCard>
              <QuickActionCard to={`/quote-sandbox/${productId}`}>
                <QuickActionIcon><BeakerIcon /></QuickActionIcon>
                <QuickActionLabel>Quote Sandbox</QuickActionLabel>
                <QuickActionDesc>Test premium calculations</QuickActionDesc>
              </QuickActionCard>
            </QuickActionsGrid>
          </Card>
        </MainContent>
      </PageContent>
    </PageContainer>
  );
};

export default Product360;

