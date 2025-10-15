/**
 * Insurance News - Real-time P&C Insurance News Feed
 * Fetches and displays latest property & casualty insurance news from Insurance Journal RSS feed
 */

import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import MainNavigation from './ui/Navigation';
import { PageContainer, PageContent } from './ui/PageContainer';
import { Breadcrumb } from './ui/Breadcrumb';
import EnhancedHeader from './ui/EnhancedHeader';
import {
  NewspaperIcon,
  ClockIcon,
  TagIcon,
  ArrowTopRightOnSquareIcon,
  FunnelIcon,
  XMarkIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/solid';
import LoadingSpinner from './ui/LoadingSpinner';

// ============================================================================
// Types
// ============================================================================

interface NewsArticle {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  category: string[];
  guid: string;
  imageUrl?: string;
}

// ============================================================================
// P&C Insurance Filtering Logic
// ============================================================================

/**
 * Keywords that indicate P&C insurance relevance
 */
const PC_INSURANCE_KEYWORDS = {
  // Core P&C Insurance Terms
  core: [
    'property insurance', 'casualty insurance', 'p&c', 'p/c',
    'commercial insurance', 'personal lines', 'commercial lines',
    'homeowners', 'auto insurance', 'workers compensation', 'workers comp',
    'general liability', 'professional liability', 'umbrella',
    'business insurance', 'commercial property', 'business owners policy', 'bop'
  ],

  // Coverage Types
  coverage: [
    'coverage', 'claim', 'claims', 'premium', 'deductible', 'limit',
    'underwriting', 'risk', 'peril', 'hazard', 'loss', 'damage',
    'liability', 'indemnity', 'reinsurance', 'catastrophe', 'cat bond'
  ],

  // Industry Entities
  entities: [
    'insurer', 'carrier', 'broker', 'agent', 'mga', 'managing general',
    'insurance company', 'insurance carrier', 'insurance agency',
    'lloyd', 'surplus lines', 'admitted market'
  ],

  // Specific Lines of Business
  linesOfBusiness: [
    'flood insurance', 'earthquake', 'windstorm', 'hurricane',
    'cyber insurance', 'cyber liability', 'data breach',
    'directors and officers', 'd&o', 'errors and omissions', 'e&o',
    'employment practices', 'epli', 'product liability',
    'pollution liability', 'environmental', 'builders risk',
    'inland marine', 'ocean marine', 'cargo', 'transportation',
    'garage liability', 'trucking', 'commercial auto'
  ],

  // Regulatory & Compliance
  regulatory: [
    'insurance commissioner', 'department of insurance', 'doi',
    'naic', 'rate filing', 'form filing', 'surplus lines',
    'admitted', 'non-admitted', 'state insurance', 'insurance regulation'
  ],

  // Events & Disasters (P&C relevant)
  events: [
    'wildfire', 'tornado', 'hail', 'storm', 'flood', 'hurricane',
    'earthquake', 'natural disaster', 'catastrophe loss',
    'property damage', 'business interruption'
  ]
};

/**
 * Keywords that indicate NON-P&C content (to exclude)
 */
const EXCLUDE_KEYWORDS = [
  'life insurance', 'life insurer', 'term life', 'whole life',
  'annuity', 'annuities', 'pension', 'retirement plan',
  'health insurance', 'medical insurance', 'medicare', 'medicaid',
  'dental insurance', 'vision insurance', 'disability insurance',
  'long-term care', 'ltc insurance'
];

/**
 * P&C-relevant categories from Insurance Journal
 */
const PC_RELEVANT_CATEGORIES = [
  'National News',
  'International & Reinsurance News',
  'East News', 'West News', 'Midwest News', 'Southeast News',
  'Texas / South Central News',
  'Agents & Brokers',
  'Business Moves & Mergers',
  'Catastrophes',
  'Claims',
  'Commercial Lines',
  'Personal Lines',
  'Technology',
  'Underwriting',
  'Regulation',
  'Markets',
  'Cyber',
  'Flood Insurance',
  'Wildfire',
  'Hurricane',
  'Earthquake'
];

/**
 * Check if an article is P&C insurance related
 */
const isPCInsuranceRelated = (article: NewsArticle): boolean => {
  const searchText = `${article.title} ${article.description}`.toLowerCase();

  // First, check for exclusions (life, health, etc.)
  const hasExcludedContent = EXCLUDE_KEYWORDS.some(keyword =>
    searchText.includes(keyword.toLowerCase())
  );

  if (hasExcludedContent) {
    return false;
  }

  // Check if any category is P&C relevant
  const hasPCCategory = article.category.some(cat =>
    PC_RELEVANT_CATEGORIES.some(pcCat =>
      cat.toLowerCase().includes(pcCat.toLowerCase())
    )
  );

  if (hasPCCategory) {
    return true;
  }

  // Check for P&C keywords in content
  const allKeywords = [
    ...PC_INSURANCE_KEYWORDS.core,
    ...PC_INSURANCE_KEYWORDS.coverage,
    ...PC_INSURANCE_KEYWORDS.entities,
    ...PC_INSURANCE_KEYWORDS.linesOfBusiness,
    ...PC_INSURANCE_KEYWORDS.regulatory,
    ...PC_INSURANCE_KEYWORDS.events
  ];

  const hasPCKeywords = allKeywords.some(keyword =>
    searchText.includes(keyword.toLowerCase())
  );

  return hasPCKeywords;
};

// ============================================================================
// Styled Components
// ============================================================================

const NewsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 24px;
  margin-top: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const NewsCard = styled.article`
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  height: 100%;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
    border-color: #6366f1;
  }
`;

const NewsImage = styled.div<{ $imageUrl?: string }>`
  width: 100%;
  height: 200px;
  background: ${props => props.$imageUrl 
    ? `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.3)), url(${props.$imageUrl})`
    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
  background-size: cover;
  background-position: center;
  position: relative;
`;

const NewsContent = styled.div`
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const NewsTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 12px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const NewsDescription = styled.p`
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
  margin: 0 0 16px 0;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const NewsFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
  margin-top: auto;
`;

const NewsDate = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #9ca3af;
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const ReadMoreLink = styled.a`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #6366f1;
  text-decoration: none;
  transition: color 0.2s;
  
  svg {
    width: 16px;
    height: 16px;
  }
  
  &:hover {
    color: #4f46e5;
  }
`;

const CategoryTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
`;

const CategoryTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #f3f4f6;
  color: #4b5563;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  
  svg {
    width: 12px;
    height: 12px;
  }
`;

const FilterSection = styled.div`
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 20px;
  margin-bottom: 24px;
`;

const FilterTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  
  svg {
    width: 20px;
    height: 20px;
    color: #6366f1;
  }
`;

const FilterTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const FilterTag = styled.button<{ $active?: boolean }>`
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${props => props.$active ? '#6366f1' : '#e5e7eb'};
  background: ${props => props.$active ? '#6366f1' : 'white'};
  color: ${props => props.$active ? 'white' : '#4b5563'};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &:hover {
    border-color: #6366f1;
    background: ${props => props.$active ? '#4f46e5' : '#f9fafb'};
  }
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 20px;
  color: #6b7280;
`;

const ErrorState = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 24px;
  margin: 24px 0;
  color: #991b1b;
  text-align: center;
`;

const StatsBar = styled.div`
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  position: relative;
`;

const PCFilterBadge = styled.div`
  position: absolute;
  top: 16px;
  right: 20px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;

  svg {
    width: 14px;
    height: 14px;
  }

  @media (max-width: 768px) {
    position: static;
    margin-top: 12px;
    width: fit-content;
  }
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const StatLabel = styled.div`
  font-size: 13px;
  opacity: 0.9;
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 700;
`;

// ============================================================================
// Component
// ============================================================================

const InsuranceNews: React.FC = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch RSS feed via CORS proxy
  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      setError(null);

      try {
        // Using corsproxy.io as a reliable CORS proxy
        const RSS_URL = 'https://www.insurancejournal.com/feed/';
        const PROXY_URL = `https://corsproxy.io/?${encodeURIComponent(RSS_URL)}`;

        const response = await fetch(PROXY_URL);

        if (!response.ok) {
          throw new Error('Failed to fetch news feed');
        }

        const text = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        
        const items = xml.querySelectorAll('item');
        const newsArticles: NewsArticle[] = [];
        
        items.forEach((item) => {
          const title = item.querySelector('title')?.textContent || '';
          const link = item.querySelector('link')?.textContent || '';
          const description = item.querySelector('description')?.textContent || '';
          const pubDate = item.querySelector('pubDate')?.textContent || '';
          const guid = item.querySelector('guid')?.textContent || '';
          
          // Extract categories
          const categories: string[] = [];
          item.querySelectorAll('category').forEach((cat) => {
            const catText = cat.textContent;
            if (catText) categories.push(catText);
          });
          
          // Extract image URL from enclosure
          const enclosure = item.querySelector('enclosure');
          const imageUrl = enclosure?.getAttribute('url') || undefined;
          
          const article: NewsArticle = {
            title,
            link,
            description,
            pubDate,
            category: categories,
            guid,
            imageUrl
          };

          // Only include P&C insurance related articles
          if (isPCInsuranceRelated(article)) {
            newsArticles.push(article);
          }
        });

        console.log(`Filtered ${newsArticles.length} P&C insurance articles from RSS feed`);
        setArticles(newsArticles);
      } catch (err) {
        console.error('Error fetching news:', err);
        setError('Unable to load news feed. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchNews();
    
    // Refresh every 15 minutes
    const interval = setInterval(fetchNews, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Extract unique categories
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    articles.forEach(article => {
      article.category.forEach(cat => cats.add(cat));
    });
    return Array.from(cats).sort();
  }, [articles]);

  // Filter articles
  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const matchesCategory = !selectedCategory || article.category.includes(selectedCategory);
      const matchesSearch = !searchQuery || 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCategory && matchesSearch;
    });
  }, [articles, selectedCategory, searchQuery]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <PageContainer>
        <MainNavigation />
        <PageContent>
          <LoadingSpinner />
        </PageContent>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <MainNavigation />
      <PageContent>
        <Breadcrumb
          items={[
            { label: 'Home', path: '/' },
            { label: 'P&C News' }
          ]}
        />

        <EnhancedHeader
          title="Property & Casualty Insurance News"
          subtitle="Real-time P&C industry news from Insurance Journal • Intelligently filtered for property and casualty insurance content"
          icon={NewspaperIcon}
          searchProps={{
            placeholder: "Search P&C news articles...",
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value)
          }}
        />

        {error && (
          <ErrorState>
            <strong>Error:</strong> {error}
          </ErrorState>
        )}

        {!error && (
          <>
            <StatsBar>
              <StatItem>
                <StatLabel>P&C Articles</StatLabel>
                <StatValue>{articles.length}</StatValue>
              </StatItem>
              <StatItem>
                <StatLabel>Filtered Results</StatLabel>
                <StatValue>{filteredArticles.length}</StatValue>
              </StatItem>
              <StatItem>
                <StatLabel>Categories</StatLabel>
                <StatValue>{allCategories.length}</StatValue>
              </StatItem>
              <PCFilterBadge>
                <ShieldCheckIcon />
                P&C Filtered
              </PCFilterBadge>
            </StatsBar>

            {allCategories.length > 0 && (
              <FilterSection>
                <FilterTitle>
                  <FunnelIcon />
                  Filter by Category
                </FilterTitle>
                <FilterTags>
                  <FilterTag
                    $active={!selectedCategory}
                    onClick={() => setSelectedCategory(null)}
                  >
                    All News
                  </FilterTag>
                  {allCategories.slice(0, 15).map(category => (
                    <FilterTag
                      key={category}
                      $active={selectedCategory === category}
                      onClick={() => setSelectedCategory(
                        selectedCategory === category ? null : category
                      )}
                    >
                      {selectedCategory === category && <XMarkIcon />}
                      {category}
                    </FilterTag>
                  ))}
                </FilterTags>
              </FilterSection>
            )}

            {filteredArticles.length > 0 ? (
              <NewsGrid>
                {filteredArticles.map((article) => (
                  <NewsCard key={article.guid}>
                    <NewsImage $imageUrl={article.imageUrl} />
                    <NewsContent>
                      <NewsTitle>{article.title}</NewsTitle>
                      {article.category.length > 0 && (
                        <CategoryTags>
                          {article.category.slice(0, 2).map((cat, idx) => (
                            <CategoryTag key={idx}>
                              <TagIcon />
                              {cat}
                            </CategoryTag>
                          ))}
                        </CategoryTags>
                      )}
                      <NewsDescription 
                        dangerouslySetInnerHTML={{ __html: article.description }}
                      />
                      <NewsFooter>
                        <NewsDate>
                          <ClockIcon />
                          {formatDate(article.pubDate)}
                        </NewsDate>
                        <ReadMoreLink 
                          href={article.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          Read More
                          <ArrowTopRightOnSquareIcon />
                        </ReadMoreLink>
                      </NewsFooter>
                    </NewsContent>
                  </NewsCard>
                ))}
              </NewsGrid>
            ) : (
              <EmptyState>
                <NewspaperIcon style={{ width: 64, height: 64, margin: '0 auto 16px', opacity: 0.3 }} />
                <h3>No articles found</h3>
                <p>Try adjusting your search or filter criteria</p>
              </EmptyState>
            )}
          </>
        )}
      </PageContent>
    </PageContainer>
  );
};

export default InsuranceNews;

