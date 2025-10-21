// src/components/ui/ProductCard.js
import React, { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import {
  TrashIcon,
  PencilIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  ChatBubbleLeftEllipsisIcon,
  DocumentIcon,
  CodeBracketIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/solid';
import LoadingSpinner from './LoadingSpinner';
import { formatFirestoreDate, getRelativeTime } from '../../utils/firestoreHelpers';

// Styled components
const Card = styled.div`
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(226, 232, 240, 0.5);
  border-radius: 18px;
  padding: 28px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.06);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  width: 100%;
  min-height: 320px;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  &:hover {
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
    border-color: rgba(99, 102, 241, 0.25);

    &::before {
      opacity: 1;
    }

    &::after {
      opacity: 1;
    }
  }

  @media (max-width: 640px) {
    padding: 20px;
    min-height: auto;
  }
`;

const CardActions = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;

  ${Card}:hover & {
    opacity: 1;
  }
`;

const IconButton = styled.button`
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #ffffff;
    border-color: #6366f1;
    transform: scale(1.05);
  }

  &.danger:hover {
    background: #fef2f2;
    border-color: #dc2626;
    color: #dc2626;
  }

  svg {
    color: #6b7280;
  }

  &:hover svg {
    color: #6366f1;
  }

  &.danger:hover svg {
    color: #dc2626;
  }
`;

const ProductName = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 20px 0;
  line-height: 1.3;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const StatusBadge = styled.span`
  background: ${props => props.$status === 'active' ? '#dcfce7' : '#fef3c7'};
  color: ${props => props.$status === 'active' ? '#166534' : '#92400e'};
  font-size: 11px;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid ${props => props.$status === 'active' ? '#86efac' : '#fcd34d'};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${props => props.$status === 'active' ? '#22c55e' : '#f59e0b'};
    animation: ${props => props.$status === 'active' ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'};
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

const ProductMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%);
  border-radius: 12px;
  border: 1px solid rgba(99, 102, 241, 0.1);
`;

const MetaItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
`;

const MetaGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    width: 14px;
    height: 14px;
    color: #6366f1;
  }
`;

const MetaLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MetaValue = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: #1f2937;
  background: rgba(99, 102, 241, 0.08);
  padding: 4px 8px;
  border-radius: 6px;
`;

const NavigationButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const NavigationButton = styled(Link)`
  flex: 1;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 36px;
  text-decoration: none;
  min-width: 0;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.1);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);

    &::before {
      opacity: 1;
    }
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 640px) {
    padding: 8px 12px;
    font-size: 11px;
    min-height: 32px;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;

const ActionButton = styled.button`
  flex: 1;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  color: #6366f1;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
    border-color: rgba(99, 102, 241, 0.4);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);

    &::before {
      opacity: 1;
    }
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    background: rgba(156, 163, 175, 0.1);
    color: #9ca3af;
    border-color: rgba(156, 163, 175, 0.2);
  }

  svg {
    width: 14px;
    height: 14px;
    transition: opacity 0.2s ease;
  }

  /* Hide icon when loading */
  &:disabled svg {
    opacity: 0;
  }

  @media (max-width: 640px) {
    padding: 8px 10px;
    font-size: 11px;
    min-height: 32px;
  }
`;



const LastUpdated = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #9ca3af;
  margin-top: auto;

  svg {
    width: 12px;
    height: 12px;
  }
`;

// Memoized ProductCard component
const ProductCard = memo(({ 
  product, 
  onEdit, 
  onDelete, 
  onOpenDetails, 
  onSummary, 
  onChat,
  loadingSummary = false 
}) => {
  // Memoized event handlers to prevent unnecessary re-renders
  const handleEdit = useCallback(() => onEdit(product), [onEdit, product]);
  const handleDelete = useCallback(() => onDelete(product.id), [onDelete, product.id]);
  const handleOpenDetails = useCallback(() => onOpenDetails(product), [onOpenDetails, product]);
  const handleSummary = useCallback(() => onSummary(product.id, product.formDownloadUrl), [onSummary, product.id, product.formDownloadUrl]);
  const handleChat = useCallback(() => onChat(product), [onChat, product]);

  return (
    <Card role="article" aria-label={`Product: ${product.name}`}>
      <CardActions role="group" aria-label="Product actions">
        <IconButton
          onClick={handleOpenDetails}
          aria-label="View product details"
          title="View details"
        >
          <InformationCircleIcon width={16} height={16} />
        </IconButton>
        <IconButton
          onClick={handleEdit}
          aria-label="Edit product"
          title="Edit product"
        >
          <PencilIcon width={16} height={16} />
        </IconButton>
        <IconButton
          className="danger"
          onClick={handleDelete}
          aria-label="Delete product"
          title="Delete product"
        >
          <TrashIcon width={16} height={16} />
        </IconButton>
      </CardActions>

      <ProductName>
        {product.name}
        <StatusBadge $status="active" aria-label="Product status: In Use">In Use</StatusBadge>
      </ProductName>

      <ProductMeta>
        <MetaItem>
          <MetaGroup>
            <DocumentIcon />
            <MetaLabel>Form #</MetaLabel>
          </MetaGroup>
          <MetaValue>{product.formNumber || 'CP0010'}</MetaValue>
        </MetaItem>
        <MetaItem>
          <MetaGroup>
            <CodeBracketIcon />
            <MetaLabel>Code</MetaLabel>
          </MetaGroup>
          <MetaValue>{product.productCode || 'CPP'}</MetaValue>
        </MetaItem>
        <MetaItem>
          <MetaGroup>
            <CalendarIcon />
            <MetaLabel>Effective</MetaLabel>
          </MetaGroup>
          <MetaValue>{formatFirestoreDate(product.effectiveDate) || '01/01/2025'}</MetaValue>
        </MetaItem>
      </ProductMeta>

      <NavigationButtons role="group" aria-label="Product navigation">
        <NavigationButton to={`/coverage/${product.id}`} aria-label="View coverages for this product">Coverages</NavigationButton>
        <NavigationButton to={`/pricing/${product.id}`} aria-label="View pricing for this product">Pricing</NavigationButton>
        <NavigationButton to={`/forms/${product.id}`} aria-label="View forms for this product">Forms</NavigationButton>
        <NavigationButton to={`/states/${product.id}`} aria-label="View state availability for this product">States</NavigationButton>
        <NavigationButton to={`/rules/${product.id}`} aria-label="View rules for this product">Rules</NavigationButton>
      </NavigationButtons>

      <ActionButtons role="group" aria-label="Product actions">
        <ActionButton
          onClick={handleSummary}
          disabled={loadingSummary}
          aria-label={loadingSummary ? 'Generating summary' : 'Generate AI summary'}
          title="Generate AI summary from form"
        >
          {loadingSummary ? (
            <LoadingSpinner type="circular" size="12px" color="#6366f1" />
          ) : (
            <DocumentTextIcon />
          )}
          {loadingSummary ? 'Generating...' : 'Summary'}
        </ActionButton>
        <ActionButton
          onClick={handleChat}
          aria-label="Chat about this product"
          title="Ask questions about this product"
        >
          <ChatBubbleLeftEllipsisIcon />
          Chat
        </ActionButton>
      </ActionButtons>

      <LastUpdated>
        <ClockIcon width={12} height={12} />
        Last updated: May 16 by Sal S.
      </LastUpdated>
    </Card>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
