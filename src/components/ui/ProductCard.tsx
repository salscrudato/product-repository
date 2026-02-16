// src/components/ui/ProductCard.tsx
import React, { memo, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import styled, { css } from 'styled-components';
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
import {
  color, neutral, accent, semantic, space, radius, shadow,
  fontFamily, transition, focusRingStyle,
} from '../../ui/tokens';

/* ---------- Card Container ---------- */
const Card = styled.article<{ $isHovered?: boolean; $archived?: boolean }>`
  background: ${neutral[0]};
  border: 1px solid ${({ $archived }) => $archived ? neutral[300] : neutral[200]};
  border-radius: ${radius.lg};
  padding: 0;
  box-shadow: ${shadow.xs};
  transition: box-shadow ${transition.fast}, border-color ${transition.fast};
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  opacity: ${({ $archived }) => $archived ? 0.65 : 1};

  &:hover {
    ${({ $archived }) => !$archived && css`
      box-shadow: ${shadow.md};
      border-color: ${neutral[300]};
    `}
  }

  &:focus-within {
    outline: 2px solid ${accent[500]};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/* ---------- Card Header ---------- */
const CardHeader = styled.div`
  padding: ${space[5]} ${space[5]} ${space[4]};
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: ${space[3]};
`;

const HeaderLeft = styled.div`
  flex: 1;
  min-width: 0;
`;

const ProductName = styled.h3`
  font-size: 16px;
  font-weight: 600;
  font-family: ${fontFamily.sans};
  color: ${color.text};
  margin: 0 0 ${space[2]} 0;
  line-height: 1.35;
  letter-spacing: -0.015em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const MetaChips = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[2]};
  flex-wrap: wrap;
`;

const MetaChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px ${space[2]};
  background: ${neutral[50]};
  border: 1px solid ${neutral[200]};
  border-radius: ${radius.sm};
  font-size: 11px;
  font-weight: 500;
  color: ${neutral[500]};

  svg { width: 11px; height: 11px; color: ${neutral[400]}; }
`;

const StatusIndicator = styled.span<{ $status?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  background: ${({ $status }) => $status === 'active' ? semantic.successLight : semantic.warningLight};
  border: 1px solid ${({ $status }) => $status === 'active' ? `${semantic.success}33` : `${semantic.warning}33`};
  border-radius: ${radius.full};
  font-size: 11px;
  font-weight: 500;
  color: ${({ $status }) => $status === 'active' ? semantic.successDark : semantic.warningDark};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ $status }) => $status === 'active' ? semantic.success : semantic.warning};
  }
`;

const CardActions = styled.div`
  display: flex;
  gap: ${space[1.5]};
  opacity: 0.6;
  transition: opacity ${transition.fast};

  ${Card}:hover & {
    opacity: 1;
  }
`;

const IconButton = styled.button`
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: ${radius.sm};
  cursor: pointer;
  color: ${neutral[400]};
  transition: background ${transition.fast}, color ${transition.fast};

  &:hover { background: ${neutral[100]}; color: ${neutral[600]}; }
  &.danger:hover { background: ${semantic.errorLight}; color: ${semantic.error}; }
  &:focus-visible { ${focusRingStyle} }

  svg { width: 14px; height: 14px; }
`;

/* ---------- Quick Links Section ---------- */
const QuickLinksContainer = styled.div`
  padding: 0 ${space[4]};
  margin-bottom: ${space[1]};
`;

const QuickLinks = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  padding: ${space[2]};
  background: ${neutral[50]};
  border-radius: ${radius.md};
`;

const QuickLink = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: ${space[2]} ${space[1]};
  font-size: 10px;
  font-weight: 500;
  color: ${neutral[500]};
  text-decoration: none;
  transition: all ${transition.fast};
  border-radius: ${radius.sm};
  text-align: center;

  .icon-wrapper {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${neutral[0]};
    border-radius: ${radius.sm};
    border: 1px solid ${neutral[200]};
    transition: all ${transition.fast};
  }

  svg {
    width: 15px;
    height: 15px;
    color: ${neutral[400]};
    transition: color ${transition.fast};
  }

  &:hover {
    background: ${neutral[0]};
    color: ${accent[600]};

    .icon-wrapper {
      background: ${accent[600]};
      border-color: transparent;
    }

    svg { color: ${neutral[0]}; }
  }

  &:focus-visible { ${focusRingStyle} }
`;

/* ---------- Card Footer / AI Actions ---------- */
const CardFooter = styled.div`
  padding: ${space[3]} ${space[4]} ${space[4]};
  display: flex;
  gap: ${space[2]};
`;

const AIButton = styled.button<{ $primary?: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${space[1.5]};
  padding: ${space[2]} ${space[3]};
  background: ${({ $primary }) => $primary ? accent[600] : neutral[0]};
  color: ${({ $primary }) => $primary ? neutral[0] : neutral[600]};
  border: ${({ $primary }) => $primary ? '1px solid transparent' : `1px solid ${neutral[200]}`};
  border-radius: ${radius.md};
  font-size: 13px;
  font-weight: 500;
  font-family: ${fontFamily.sans};
  cursor: pointer;
  transition: background ${transition.fast};

  svg { width: 14px; height: 14px; flex-shrink: 0; }

  &:hover:not(:disabled) {
    background: ${({ $primary }) => $primary ? accent[700] : neutral[50]};
    ${({ $primary }) => !$primary && css`border-color: ${neutral[300]};`}
  }

  &:disabled { opacity: 0.45; cursor: not-allowed; }
  &:focus-visible { ${focusRingStyle} }
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
              <MetaChip>{formatFirestoreDate(product.effectiveDate as any, 'MM/YY')}</MetaChip>
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
              <LoadingSpinner type="circular" size="15px" color={neutral[0]} />
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
