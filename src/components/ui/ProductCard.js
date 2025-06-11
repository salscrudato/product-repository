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

// Styled components
const Card = styled.div`
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(226, 232, 240, 0.5);
  border-radius: 18px;
  padding: 28px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.06);
  transition: all 0.25s ease;
  position: relative;
  width: 100%;
  min-height: 300px;
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

  &:hover {
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
    border-color: rgba(99, 102, 241, 0.25);

    &::before {
      opacity: 1;
    }
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
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ProductMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
`;

const MetaItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MetaGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    width: 14px;
    height: 14px;
    color: #6b7280;
  }
`;

const MetaLabel = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
`;

const MetaValue = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #374151;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
`;

const ActionButton = styled.button`
  flex: 1;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  position: relative;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.8;
    cursor: not-allowed;
    transform: none;
    background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
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
`;

const QuickLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  font-size: 12px;

  span {
    color: #d1d5db;
  }
`;

const QuickLink = styled(Link)`
  color: #6366f1;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;

  &:hover {
    color: #4f46e5;
    text-decoration: underline;
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
    <Card>
      <CardActions>
        <IconButton onClick={handleOpenDetails}>
          <InformationCircleIcon width={16} height={16} />
        </IconButton>
        <IconButton onClick={handleEdit}>
          <PencilIcon width={16} height={16} />
        </IconButton>
        <IconButton className="danger" onClick={handleDelete}>
          <TrashIcon width={16} height={16} />
        </IconButton>
      </CardActions>

      <ProductName>
        {product.name}
        <StatusBadge $status="active">In Use</StatusBadge>
      </ProductName>

      <ProductMeta>
        <MetaItem>
          <MetaGroup>
            <DocumentIcon />
            <MetaLabel>Form #:</MetaLabel>
          </MetaGroup>
          <MetaValue>{product.formNumber || 'CP0010'}</MetaValue>
        </MetaItem>
        <MetaItem>
          <MetaGroup>
            <CodeBracketIcon />
            <MetaLabel>Code:</MetaLabel>
          </MetaGroup>
          <MetaValue>{product.productCode || 'CPP'}</MetaValue>
        </MetaItem>
        <MetaItem>
          <MetaGroup>
            <CalendarIcon />
            <MetaLabel>Effective:</MetaLabel>
          </MetaGroup>
          <MetaValue>{product.effectiveDate || '05/16'}</MetaValue>
        </MetaItem>
      </ProductMeta>

      <ActionButtons>
        <ActionButton onClick={handleSummary} disabled={loadingSummary}>
          {loadingSummary ? (
            <LoadingSpinner type="circular" size="14px" color="white" />
          ) : (
            <DocumentTextIcon />
          )}
          {loadingSummary ? 'Generating...' : 'Summary'}
        </ActionButton>
        <ActionButton onClick={handleChat}>
          <ChatBubbleLeftEllipsisIcon />
          Chat
        </ActionButton>
      </ActionButtons>

      <QuickLinks>
        <QuickLink to={`/coverage/${product.id}`}>Coverages</QuickLink>
        <span>•</span>
        <QuickLink to={`/pricing/${product.id}`}>Pricing</QuickLink>
        <span>•</span>
        <QuickLink to={`/forms/${product.id}`}>Forms</QuickLink>
        <span>•</span>
        <QuickLink to={`/states/${product.id}`}>States</QuickLink>
        <span>•</span>
        <QuickLink to={`/rules/${product.id}`}>Rules</QuickLink>
      </QuickLinks>

      <LastUpdated>
        <ClockIcon width={12} height={12} />
        Last updated: May 16 by Sal S.
      </LastUpdated>
    </Card>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
