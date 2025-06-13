// src/components/ui/NewsFeedCard.js
import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import {
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  NewspaperIcon
} from '@heroicons/react/24/solid';

// ============================================================================
// Styled Components
// ============================================================================

const Card = styled.article`
  background: ${({ theme }) => theme.isDarkMode ? theme.colours.cardBackground : 'white'};
  border-radius: 10px;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.isDarkMode ? theme.colours.border : '#e5e7eb'};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  cursor: pointer;
  margin-bottom: 12px;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    border-color: #6366f1;
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const NewsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const CategoryBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  ${props => {
    switch (props.category) {
      case 'regulation':
        return `
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        `;
      case 'market':
        return `
          background: rgba(34, 197, 94, 0.1);
          color: #059669;
        `;
      case 'technology':
        return `
          background: rgba(59, 130, 246, 0.1);
          color: #2563eb;
        `;
      case 'claims':
        return `
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
        `;
      case 'underwriting':
        return `
          background: rgba(139, 92, 246, 0.1);
          color: #7c3aed;
        `;
      default:
        return `
          background: rgba(107, 114, 128, 0.1);
          color: #6b7280;
        `;
    }
  }}
`;

const NewsTitle = styled.h3`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.isDarkMode ? theme.colours.text : '#1f2937'};
  margin: 0 0 6px 0;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const NewsExcerpt = styled.p`
  color: ${({ theme }) => theme.isDarkMode ? theme.colours.textSecondary : '#6b7280'};
  line-height: 1.4;
  margin: 0 0 10px 0;
  font-size: 11px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const NewsFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => theme.isDarkMode ? theme.colours.border : '#f3f4f6'};
`;

const NewsSource = styled.span`
  font-size: 10px;
  font-weight: 500;
  color: ${({ theme }) => theme.isDarkMode ? theme.colours.text : '#374151'};
`;

const NewsDate = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: ${({ theme }) => theme.isDarkMode ? theme.colours.textSecondary : '#6b7280'};

  svg {
    width: 10px;
    height: 10px;
  }
`;

const FeedContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const FeedHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid ${({ theme }) => theme.isDarkMode ? theme.colours.border : '#e5e7eb'};
`;

const FeedTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.isDarkMode ? theme.colours.text : '#1f2937'};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    width: 20px;
    height: 20px;
    color: #6366f1;
  }
`;

const ViewAllLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.15);
    transform: translateY(-1px);
  }

  svg {
    width: 12px;
    height: 12px;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: ${({ theme }) => theme.isDarkMode ? theme.colours.textSecondary : '#6b7280'};

  svg {
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: ${({ theme }) => theme.isDarkMode ? theme.colours.text : '#374151'};
  }

  p {
    font-size: 14px;
    margin: 0;
    line-height: 1.5;
  }
`;

// ============================================================================
// Helper Functions
// ============================================================================

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
  });
};

// ============================================================================
// Individual News Card Component
// ============================================================================

const NewsCard = ({ article, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(article);
    }
  };

  return (
    <Card onClick={handleClick}>
      <NewsHeader>
        <CategoryBadge category={article.category}>
          {article.category}
        </CategoryBadge>
      </NewsHeader>

      <NewsTitle>{article.title}</NewsTitle>
      <NewsExcerpt>{article.excerpt}</NewsExcerpt>

      <NewsFooter>
        <NewsSource>{article.source}</NewsSource>
        <NewsDate>
          <ClockIcon />
          {formatDate(article.publishedAt)}
        </NewsDate>
      </NewsFooter>
    </Card>
  );
};

// ============================================================================
// Main News Feed Component
// ============================================================================

const NewsFeedCard = ({ articles = [], onArticleClick, maxItems = 5 }) => {
  const displayArticles = articles.slice(0, maxItems);

  return (
    <FeedContainer>
      <FeedHeader>
        <FeedTitle>
          <NewspaperIcon />
          Latest News
        </FeedTitle>
        <ViewAllLink to="/news">
          View All
          <ArrowTopRightOnSquareIcon />
        </ViewAllLink>
      </FeedHeader>

      {displayArticles.length === 0 ? (
        <EmptyState>
          <NewspaperIcon />
          <h3>No news available</h3>
          <p>Check back later for the latest insurance industry updates.</p>
        </EmptyState>
      ) : (
        displayArticles.map(article => (
          <NewsCard
            key={article.id}
            article={article}
            onClick={onArticleClick}
          />
        ))
      )}
    </FeedContainer>
  );
};

export default NewsFeedCard;
