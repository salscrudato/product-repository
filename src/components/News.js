// src/components/News.js
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  NewspaperIcon,
  ClockIcon,
  TagIcon,
  ArrowTopRightOnSquareIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/solid';
import {
  BookmarkIcon as BookmarkOutlineIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import MainNavigation from './ui/Navigation';
import { sampleNews } from '../data/sampleNews';

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
`;

const Content = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 40px;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #6b7280;
  margin-bottom: 32px;
`;

const Controls = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;

  @media (max-width: 768px) {
    max-width: 100%;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 44px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  font-size: 14px;
  background: white;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;

  svg {
    width: 18px;
    height: 18px;
  }
`;

const FilterContainer = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const FilterSelect = styled.select`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  color: #374151;
  cursor: pointer;
  min-width: 120px;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const NewsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const NewsCard = styled.article`
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    border-color: #6366f1;
  }
`;

const NewsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const CategoryBadge = styled.span`
  background: ${props => {
    switch (props.category) {
      case 'regulation': return '#fef3c7';
      case 'market': return '#dbeafe';
      case 'technology': return '#f3e8ff';
      case 'claims': return '#fecaca';
      case 'underwriting': return '#d1fae5';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.category) {
      case 'regulation': return '#d97706';
      case 'market': return '#2563eb';
      case 'technology': return '#7c3aed';
      case 'claims': return '#dc2626';
      case 'underwriting': return '#059669';
      default: return '#6b7280';
    }
  }};
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
`;

const NewsActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    color: #6366f1;
    background: rgba(99, 102, 241, 0.1);
  }

  &.bookmarked {
    color: #f59e0b;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const NewsTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 12px;
  line-height: 1.4;
`;

const NewsExcerpt = styled.p`
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 16px;
  font-size: 14px;
`;

const NewsFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
`;

const NewsSource = styled.div`
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
`;

const NewsDate = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #9ca3af;

  svg {
    width: 12px;
    height: 12px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;

  svg {
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
    color: #d1d5db;
  }

  h3 {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
    color: #374151;
  }

  p {
    font-size: 14px;
  }
`;

// ============================================================================
// Main Component
// ============================================================================

export default function News() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [bookmarkedArticles, setBookmarkedArticles] = useState(new Set());

  // Filter news based on search and filters
  const filteredNews = sampleNews.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || article.category === categoryFilter;
    const matchesSource = sourceFilter === 'all' || article.source === sourceFilter;

    return matchesSearch && matchesCategory && matchesSource;
  });

  // Get unique categories and sources for filters
  const categories = [...new Set(sampleNews.map(article => article.category))];
  const sources = [...new Set(sampleNews.map(article => article.source))];

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Handle bookmark toggle
  const toggleBookmark = (articleId) => {
    setBookmarkedArticles(prev => {
      const newBookmarks = new Set(prev);
      if (newBookmarks.has(articleId)) {
        newBookmarks.delete(articleId);
      } else {
        newBookmarks.add(articleId);
      }
      return newBookmarks;
    });
  };

  // Handle article click
  const handleArticleClick = (article) => {
    // In a real implementation, this would navigate to the full article
    console.log('Opening article:', article.title);
  };

  return (
    <Container>
      <MainNavigation />
      <Content>
        <Header>
          <Title>
            <NewspaperIcon style={{ width: 32, height: 32 }} />
            Insurance News
          </Title>
          <Subtitle>
            Stay informed with the latest developments in the insurance industry
          </Subtitle>
        </Header>

        <Controls>
          <SearchContainer>
            <SearchIcon>
              <MagnifyingGlassIcon />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="Search news articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchContainer>

          <FilterContainer>
            <FunnelIcon style={{ width: 16, height: 16, color: '#6b7280' }} />
            <FilterSelect
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="all">All Sources</option>
              {sources.map(source => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </FilterSelect>
          </FilterContainer>
        </Controls>

        {filteredNews.length === 0 ? (
          <EmptyState>
            <NewspaperIcon />
            <h3>No articles found</h3>
            <p>Try adjusting your search terms or filters to find relevant news articles.</p>
          </EmptyState>
        ) : (
          <NewsGrid>
            {filteredNews.map(article => (
              <NewsCard key={article.id} onClick={() => handleArticleClick(article)}>
                <NewsHeader>
                  <CategoryBadge category={article.category}>
                    {article.category}
                  </CategoryBadge>
                  <NewsActions>
                    <ActionButton
                      className={bookmarkedArticles.has(article.id) ? 'bookmarked' : ''}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(article.id);
                      }}
                    >
                      {bookmarkedArticles.has(article.id) ?
                        <BookmarkSolidIcon /> :
                        <BookmarkOutlineIcon />
                      }
                    </ActionButton>
                    <ActionButton onClick={(e) => e.stopPropagation()}>
                      <ShareIcon />
                    </ActionButton>
                    <ActionButton onClick={(e) => e.stopPropagation()}>
                      <ArrowTopRightOnSquareIcon />
                    </ActionButton>
                  </NewsActions>
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
              </NewsCard>
            ))}
          </NewsGrid>
        )}
      </Content>
    </Container>
  );
}
