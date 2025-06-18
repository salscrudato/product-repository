// src/components/News.js
import React, { useState } from 'react';
import styled from 'styled-components';
import {
  NewspaperIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/solid';
import {
  BookmarkIcon as BookmarkOutlineIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import MainNavigation from './ui/Navigation';
import EnhancedHeader from './ui/EnhancedHeader';
import NewsPreferences from './ui/NewsPreferences';
import useNews from '../hooks/useNews';

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
`;

const MainContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px 32px;
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding: 0 4px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
`;

const ActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const SearchGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  max-width: 500px;

  @media (max-width: 768px) {
    max-width: 100%;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 16px 10px 40px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
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
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const FilterGroup = styled.div`
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
  min-width: 140px;

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
  position: relative;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    border-color: #6366f1;
  }

  &:hover::after {
    content: '🔗 Click to read full article';
    position: absolute;
    bottom: 8px;
    right: 12px;
    font-size: 11px;
    color: #6366f1;
    font-weight: 500;
    opacity: 0.8;
    pointer-events: none;
  }

  &:active {
    transform: translateY(0);
  }
`;

const NewsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const CategoryBadge = styled.span.withConfig({
  shouldForwardProp: (prop) => !['category'].includes(prop),
})`
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

const RefreshButton = styled.button.withConfig({
  shouldForwardProp: (prop) => !['refreshing'].includes(prop)
})`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: ${props => props.refreshing ? '#6366f1' : 'white'};
  color: ${props => props.refreshing ? 'white' : '#6366f1'};
  border: 1px solid #6366f1;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: ${props => props.refreshing ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  min-width: 120px;
  justify-content: center;

  &:hover:not(:disabled) {
    background: #6366f1;
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  &:disabled {
    opacity: 0.7;
  }

  svg {
    width: 16px;
    height: 16px;
    animation: ${props => props.refreshing ? 'spin 1s linear infinite' : 'none'};
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const StatusIndicator = styled.div.withConfig({
  shouldForwardProp: (prop) => !['error', 'isFromAPI'].includes(prop)
})`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: ${props => {
    if (props.error) return '#fef2f2';
    if (props.isFromAPI) return '#f0fdf4';
    return '#f8fafc';
  }};
  color: ${props => {
    if (props.error) return '#dc2626';
    if (props.isFromAPI) return '#16a34a';
    return '#64748b';
  }};
  border: 1px solid ${props => {
    if (props.error) return '#fecaca';
    if (props.isFromAPI) return '#bbf7d0';
    return '#e2e8f0';
  }};

  svg {
    width: 14px;
    height: 14px;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const LoadingCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  margin: 20px;

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 8px;
  }

  p {
    color: #6b7280;
    font-size: 14px;
    margin-bottom: 20px;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #e5e7eb;
    border-top: 3px solid #6366f1;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
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

  // P&C news preferences state - Default to Commercial Lines and Regulatory & Compliance
  const [newsPreferences, setNewsPreferences] = useState({
    focusArea: 'commercial',
    minRelevanceScore: 3,
    includeRegulatory: true,
    includeTechnology: true,
    maxArticles: 15
  });

  // Use news hook for data management with P&C preferences
  const {
    articles,
    loading,
    refreshing,
    error,
    source,
    stats,
    refresh,
    isEmpty,
    isFromAPI,
    hasError
  } = useNews({
    enableAI: true,
    enableCache: true,
    fallbackToSample: true,
    ...newsPreferences
  });

  // Filter news based on search and filters
  const filteredNews = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || article.category === categoryFilter;
    const matchesSource = sourceFilter === 'all' || article.source === sourceFilter;

    return matchesSearch && matchesCategory && matchesSource;
  });

  // Get unique categories and sources for filters from current articles
  const categories = [...new Set(articles.map(article => article.category))];
  const sources = [...new Set(articles.map(article => article.source))];

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
  const handleArticleClick = (article, event) => {
    // Prevent click if clicking on action buttons
    if (event.target.closest('button')) {
      return;
    }

    // Open article in new tab if URL is available
    if (article.url && article.url !== '#') {
      window.open(article.url, '_blank', 'noopener,noreferrer');
    } else {
      console.log('No URL available for article:', article.title);
    }
  };

  // Handle refresh with rate limiting awareness
  const handleRefresh = async () => {
    try {
      await refresh();
    } catch (error) {
      console.error('Refresh failed:', error);
      // Error will be handled by the useNews hook and displayed in status
    }
  };

  // Check if we should show rate limit warning
  const isRateLimited = hasError && error.includes('Rate limit');

  // Handle preferences change
  const handlePreferencesChange = (newPreferences) => {
    setNewsPreferences(newPreferences);
    // The useNews hook will automatically refresh with new preferences
  };

  // Get status message with P&C context and rate limiting info
  const getStatusMessage = () => {
    if (hasError) {
      if (error.includes('Rate limit')) {
        return `Rate limited - using cached data`;
      }
      return `Error: ${error}`;
    }
    if (isFromAPI) {
      const focusText = newsPreferences.focusArea !== 'general' ? ` • ${newsPreferences.focusArea}` : '';
      return `Live P&C data${focusText} • ${stats?.enhanced || 0} AI-enhanced`;
    }
    if (source === 'cache') return 'Cached P&C data';
    if (source === 'sample') return 'Sample data';
    if (source === 'fallback') return 'P&C fallback data';
    return 'Loading...';
  };

  // Get status icon
  const getStatusIcon = () => {
    if (hasError) return ExclamationTriangleIcon;
    if (isFromAPI) return CheckCircleIcon;
    return ClockIcon;
  };

  const StatusIcon = getStatusIcon();

  return (
    <Container>
      <MainNavigation />
      <MainContent>
        <EnhancedHeader
          title="Insurance News"
          subtitle={`Stay informed with ${filteredNews.length} latest development${filteredNews.length !== 1 ? 's' : ''} in the insurance industry`}
          icon={NewspaperIcon}
        />

        <ActionBar>
          <ActionGroup>
            <SearchGroup>
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
            </SearchGroup>
          </ActionGroup>

          <ActionGroup>
            <StatusIndicator error={hasError} isFromAPI={isFromAPI}>
              <StatusIcon />
              {getStatusMessage()}
            </StatusIndicator>

            <NewsPreferences
              currentPreferences={newsPreferences}
              onPreferencesChange={handlePreferencesChange}
            />

            <FilterGroup>
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
            </FilterGroup>

            <RefreshButton
              onClick={handleRefresh}
              disabled={refreshing || isRateLimited}
              refreshing={refreshing}
              title={isRateLimited ? 'Rate limited - please wait before refreshing' : 'Refresh news articles'}
            >
              <ArrowPathIcon />
              {refreshing ? 'Refreshing...' : isRateLimited ? 'Rate Limited' : 'Refresh'}
            </RefreshButton>
          </ActionGroup>
        </ActionBar>

        {/* Rate limit info message */}
        {isRateLimited && (
          <div style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '14px',
            color: '#92400e'
          }}>
            <strong>ℹ️ Rate Limit Notice:</strong> The news API has temporary usage limits.
            We're showing cached articles while waiting for the limit to reset.
            Fresh articles will be available shortly.
          </div>
        )}

        {loading && !refreshing ? (
          <EmptyState>
            <div className="spinner" />
            <h3>Loading News</h3>
            <p>Fetching the latest insurance industry updates...</p>
          </EmptyState>
        ) : filteredNews.length === 0 ? (
          <EmptyState>
            <NewspaperIcon />
            <h3>{isEmpty ? 'No articles available' : 'No articles found'}</h3>
            <p>
              {isEmpty
                ? 'Check back later for the latest insurance industry updates.'
                : 'Try adjusting your search terms or filters to find relevant news articles.'
              }
            </p>
          </EmptyState>
        ) : (
          <NewsGrid>
            {filteredNews.map(article => (
              <NewsCard key={article.id} onClick={(e) => handleArticleClick(article, e)}>
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
                      title="Bookmark article"
                    >
                      {bookmarkedArticles.has(article.id) ?
                        <BookmarkSolidIcon /> :
                        <BookmarkOutlineIcon />
                      }
                    </ActionButton>
                    <ActionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        if (navigator.share && article.url && article.url !== '#') {
                          navigator.share({
                            title: article.title,
                            text: article.excerpt,
                            url: article.url
                          });
                        } else {
                          // Fallback: copy to clipboard
                          navigator.clipboard.writeText(article.url || window.location.href);
                        }
                      }}
                      title="Share article"
                    >
                      <ShareIcon />
                    </ActionButton>
                    <ActionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        if (article.url && article.url !== '#') {
                          window.open(article.url, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      title="Open in new tab"
                    >
                      <ArrowTopRightOnSquareIcon />
                    </ActionButton>
                  </NewsActions>
                </NewsHeader>

                <NewsTitle>{article.title}</NewsTitle>
                <NewsExcerpt>
                  {article.excerpt}
                  {article.aiEnhanced && (
                    <span style={{
                      fontSize: '11px',
                      color: '#6366f1',
                      fontWeight: '500',
                      marginLeft: '8px'
                    }}>
                      ✨ AI Enhanced
                    </span>
                  )}
                </NewsExcerpt>

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

        {/* Loading overlay for refresh */}
        {refreshing && (
          <LoadingOverlay>
            <LoadingCard>
              <div className="spinner" />
              <h3>Refreshing News</h3>
              <p>Fetching fresh articles and generating AI summaries...</p>
              {stats?.aiProgress && (
                <p style={{ color: '#6366f1', fontWeight: '500' }}>
                  AI Processing: {stats.aiProgress}%
                </p>
              )}
            </LoadingCard>
          </LoadingOverlay>
        )}
      </MainContent>
    </Container>
  );
}
