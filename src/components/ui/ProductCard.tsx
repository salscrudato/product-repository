// src/components/ui/ProductCard.tsx
import React, { memo, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import {
  PencilIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  DocumentDuplicateIcon,
  MapPinIcon,
  Cog6ToothIcon,
  ArchiveBoxIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { SparklesIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/solid';
import LoadingSpinner from './LoadingSpinner';
import { formatFirestoreDate } from '../../utils/firestoreHelpers';

/* ---------- Animations ---------- */
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(0.95); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-3px); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.15); }
  50% { box-shadow: 0 0 30px rgba(99, 102, 241, 0.25); }
`;

const gradientShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

/* ---------- Card Container ---------- */
const Card = styled.article<{ $isHovered?: boolean; $archived?: boolean }>`
  background: ${({ $archived }) => $archived
    ? 'linear-gradient(165deg, #f5f5f5 0%, #efefef 100%)'
    : 'linear-gradient(165deg, #ffffff 0%, #fafbff 100%)'};
  border: 1px solid ${({ $archived }) => $archived
    ? 'rgba(100, 100, 100, 0.15)'
    : 'rgba(99, 102, 241, 0.08)'};
  border-radius: 20px;
  padding: 0;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.02),
    0 4px 12px ${({ $archived }) => $archived
      ? 'rgba(0, 0, 0, 0.04)'
      : 'rgba(99, 102, 241, 0.04)'},
    0 8px 24px rgba(0, 0, 0, 0.02);
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform-style: preserve-3d;
  will-change: transform, box-shadow;
  opacity: ${({ $archived }) => $archived ? 0.7 : 1};

  /* Subtle top accent line */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 24px;
    right: 24px;
    height: 3px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7);
    background-size: 200% 100%;
    border-radius: 0 0 4px 4px;
    opacity: 0;
    transform: scaleX(0.3);
    transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  /* Glass reflection effect */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.4) 0%,
      rgba(255, 255, 255, 0) 100%
    );
    pointer-events: none;
    border-radius: 20px 20px 0 0;
  }

  &:hover {
    ${({ $archived }) => !$archived && css`
      transform: translateY(-4px) scale(1.01);
      box-shadow:
        0 8px 24px rgba(99, 102, 241, 0.12),
        0 16px 48px rgba(99, 102, 241, 0.08),
        0 24px 64px rgba(0, 0, 0, 0.04);
      border-color: rgba(99, 102, 241, 0.2);

      &::before {
        opacity: 1;
        transform: scaleX(1);
        animation: ${gradientShift} 3s ease infinite;
      }
    `}
  }

  &:focus-within {
    outline: 2px solid rgba(99, 102, 241, 0.4);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
`;

/* ---------- Card Header ---------- */
const CardHeader = styled.div`
  padding: 24px 24px 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  position: relative;
  z-index: 1;
`;

const HeaderLeft = styled.div`
  flex: 1;
  min-width: 0;
`;

const ProductName = styled.h3`
  font-size: 18px;
  font-weight: 650;
  color: #0f172a;
  margin: 0 0 12px 0;
  line-height: 1.4;
  letter-spacing: -0.025em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.2s ease;

  ${Card}:hover & {
    color: #4f46e5;
  }
`;

const MetaChips = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const MetaChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid rgba(99, 102, 241, 0.06);
  border-radius: 8px;
  font-size: 11.5px;
  font-weight: 550;
  color: #475569;
  letter-spacing: -0.01em;
  transition: all 0.2s ease;

  svg {
    width: 12px;
    height: 12px;
    color: #94a3b8;
  }

  ${Card}:hover & {
    background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
    border-color: rgba(99, 102, 241, 0.12);
    color: #4338ca;

    svg {
      color: #6366f1;
    }
  }
`;

const StatusIndicator = styled.span<{ $status?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: ${({ $status }) =>
    $status === 'active'
      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(22, 163, 74, 0.08) 100%)'
      : 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.08) 100%)'
  };
  border: 1px solid ${({ $status }) =>
    $status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)'
  };
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ $status }) => $status === 'active' ? '#15803d' : '#b45309'};
  text-transform: uppercase;
  letter-spacing: 0.03em;

  &::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${({ $status }) => $status === 'active' ? '#22c55e' : '#f59e0b'};
    box-shadow: 0 0 8px ${({ $status }) => $status === 'active' ? '#22c55e' : '#f59e0b'};
    animation: ${pulse} 2s ease-in-out infinite;
  }
`;

const CardActions = styled.div`
  display: flex;
  gap: 6px;
  opacity: 0.6;
  transition: opacity 0.2s ease;

  ${Card}:hover & {
    opacity: 1;
  }
`;

const IconButton = styled.button`
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 10px;
  cursor: pointer;
  color: #94a3b8;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:hover {
    background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
    border-color: rgba(99, 102, 241, 0.2);
    color: #6366f1;
    transform: scale(1.08);
  }

  &.danger:hover {
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    border-color: rgba(239, 68, 68, 0.2);
    color: #dc2626;
  }

  &:focus-visible {
    outline: 2px solid rgba(99, 102, 241, 0.4);
    outline-offset: 2px;
  }

  svg {
    width: 15px;
    height: 15px;
  }
`;

/* ---------- Quick Links Section ---------- */
const QuickLinksContainer = styled.div`
  padding: 0 16px;
  margin-bottom: 4px;
`;

const QuickLinks = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  padding: 12px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 14px;
  border: 1px solid rgba(99, 102, 241, 0.04);
`;

const QuickLink = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 6px;
  font-size: 10.5px;
  font-weight: 550;
  color: #64748b;
  text-decoration: none;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  border-radius: 10px;
  text-align: center;
  letter-spacing: -0.01em;
  position: relative;

  .icon-wrapper {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    border-radius: 8px;
    border: 1px solid rgba(99, 102, 241, 0.06);
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  svg {
    width: 15px;
    height: 15px;
    color: #94a3b8;
    transition: all 0.2s ease;
  }

  .arrow {
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%) translateX(-4px);
    width: 10px;
    height: 10px;
    opacity: 0;
    color: #6366f1;
    transition: all 0.2s ease;
  }

  &:hover {
    background: #ffffff;
    color: #4f46e5;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
    transform: translateY(-2px);

    .icon-wrapper {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border-color: transparent;
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
    }

    svg {
      color: #ffffff;
    }

    .arrow {
      opacity: 1;
      transform: translateY(-50%) translateX(0);
    }
  }

  &:focus-visible {
    outline: 2px solid rgba(99, 102, 241, 0.4);
    outline-offset: 2px;
  }
`;

/* ---------- Card Footer / AI Actions ---------- */
const CardFooter = styled.div`
  padding: 16px 16px 20px;
  display: flex;
  gap: 10px;
  position: relative;
`;

const AIButton = styled.button<{ $primary?: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: ${({ $primary }) => $primary
    ? 'linear-gradient(135deg, #6366f1 0%, #7c3aed 50%, #8b5cf6 100%)'
    : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'};
  background-size: 200% 200%;
  color: ${({ $primary }) => $primary ? '#ffffff' : '#475569'};
  border: ${({ $primary }) => $primary
    ? 'none'
    : '1px solid rgba(99, 102, 241, 0.12)'};
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
  letter-spacing: -0.01em;

  svg {
    width: 16px;
    height: 16px;
    transition: transform 0.2s ease;
  }

  ${({ $primary }) => $primary && css`
    box-shadow:
      0 2px 8px rgba(99, 102, 241, 0.25),
      0 4px 16px rgba(139, 92, 246, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  `}

  &:hover:not(:disabled) {
    ${({ $primary }) => $primary
      ? css`
          background-position: 100% 100%;
          box-shadow:
            0 4px 16px rgba(99, 102, 241, 0.35),
            0 8px 32px rgba(139, 92, 246, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
          animation: ${glow} 2s ease infinite;
        `
      : css`
          background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
          border-color: rgba(99, 102, 241, 0.2);
          color: #4338ca;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
        `}

    svg {
      transform: scale(1.1);
      ${({ $primary }) => $primary && css`
        animation: ${float} 1.5s ease infinite;
      `}
    }
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    filter: grayscale(0.2);
  }

  &:focus-visible {
    outline: 2px solid rgba(99, 102, 241, 0.4);
    outline-offset: 2px;
  }

  /* Enhanced shimmer effect for AI button */
  ${({ $primary }) => $primary && css`
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.15) 50%,
        transparent 100%
      );
      transition: left 0.4s ease;
    }

    &:hover::before {
      left: 100%;
    }
  `}
`;

/* ---------- Product Interface ---------- */
interface Product {
  id: string;
  name: string;
  formNumber?: string;
  productCode?: string;
  effectiveDate?: unknown;
  formDownloadUrl?: string;
  archived?: boolean;
}

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onArchive: (productId: string) => void;
  onOpenDetails: (product: Product) => void;
  onSummary: (productId: string, formDownloadUrl?: string) => void;
  onChat: (product: Product) => void;
  loadingSummary?: boolean;
}

/* ---------- Quick Link Config ---------- */
const quickLinkConfig = [
  { path: 'coverage', label: 'Coverages', Icon: ShieldCheckIcon },
  { path: 'pricing', label: 'Pricing', Icon: CurrencyDollarIcon },
  { path: 'forms', label: 'Forms', Icon: DocumentDuplicateIcon },
  { path: 'states', label: 'States', Icon: MapPinIcon },
  { path: 'rules', label: 'Rules', Icon: Cog6ToothIcon },
];

/* ---------- Memoized ProductCard Component ---------- */
const ProductCard = memo(({
  product,
  onEdit,
  onArchive,
  onSummary,
  onChat,
  loadingSummary = false
}: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  // Memoized event handlers
  const handleEdit = useCallback(() => onEdit(product), [onEdit, product]);
  const handleArchive = useCallback(() => onArchive(product.id), [onArchive, product.id]);
  const handleSummary = useCallback(() => onSummary(product.id, product.formDownloadUrl), [onSummary, product.id, product.formDownloadUrl]);
  const handleChat = useCallback(() => onChat(product), [onChat, product]);
  const handleViewPDF = useCallback(() => {
    if (product.formDownloadUrl) {
      window.open(product.formDownloadUrl, '_blank');
    }
  }, [product.formDownloadUrl]);

  return (
    <Card
      aria-label={`Product: ${product.name}`}
      $isHovered={isHovered}
      $archived={product.archived}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header: Product info + Actions */}
      <CardHeader>
        <HeaderLeft>
          <ProductName>{product.name}</ProductName>
          <MetaChips>
            <StatusIndicator $status={product.archived ? "inactive" : "active"}>
              {product.archived ? 'Archived' : 'Active'}
            </StatusIndicator>
            {product.formNumber && (
              <MetaChip>
                <DocumentDuplicateIcon />
                {product.formNumber}
              </MetaChip>
            )}
            {product.productCode && (
              <MetaChip>
                <ShieldCheckIcon />
                {product.productCode}
              </MetaChip>
            )}
            {product.effectiveDate && (
              <MetaChip>{formatFirestoreDate(product.effectiveDate, 'MM/YY')}</MetaChip>
            )}
          </MetaChips>
        </HeaderLeft>
        <CardActions>
          {!product.archived && (
            <IconButton onClick={handleEdit} aria-label="Edit product" title="Edit">
              <PencilIcon />
            </IconButton>
          )}
          {product.formDownloadUrl && (
            <IconButton onClick={handleViewPDF} aria-label="View PDF form" title="View PDF">
              <EyeIcon />
            </IconButton>
          )}
          <IconButton className="danger" onClick={handleArchive} aria-label={product.archived ? "Unarchive product" : "Archive product"} title={product.archived ? "Unarchive" : "Archive"}>
            <ArchiveBoxIcon />
          </IconButton>
        </CardActions>
      </CardHeader>

      {/* Quick Links: Navigation to sub-pages */}
      {!product.archived && (
        <QuickLinksContainer>
          <QuickLinks>
            {quickLinkConfig.map(({ path, label, Icon }) => (
              <QuickLink key={path} to={`/${path}/${product.id}`}>
                <span className="icon-wrapper">
                  <Icon />
                </span>
                {label}
                <ChevronRightIcon className="arrow" />
              </QuickLink>
            ))}
          </QuickLinks>
        </QuickLinksContainer>
      )}

      {/* Footer: AI Actions */}
      {!product.archived && (
        <CardFooter>
          <AIButton
            $primary
            onClick={handleSummary}
            disabled={loadingSummary}
            aria-label={loadingSummary ? 'Generating summary' : 'Generate AI summary'}
          >
            {loadingSummary ? (
              <LoadingSpinner type="circular" size="15px" color="#ffffff" />
            ) : (
              <SparklesIcon />
            )}
            {loadingSummary ? 'Analyzing...' : 'AI Summary'}
          </AIButton>
          <AIButton onClick={handleChat} aria-label="Chat about this product">
            <ChatBubbleLeftEllipsisIcon />
            Chat
          </AIButton>
        </CardFooter>
      )}
    </Card>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
