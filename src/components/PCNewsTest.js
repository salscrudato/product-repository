// src/components/PCNewsTest.js
// Test component to verify strict P&C insurance filtering

import React, { useState } from 'react';
import styled from 'styled-components';

const TestContainer = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const Button = styled.button`
  background: #3b82f6;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  margin-right: 10px;
  margin-bottom: 10px;
  
  &:hover {
    background: #2563eb;
  }
  
  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const TestCard = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const ArticleCard = styled.div`
  background: ${props => props.excluded ? '#fef2f2' : props.relevance >= 3 ? '#f0fdf4' : '#fefce8'};
  border: 1px solid ${props => props.excluded ? '#fecaca' : props.relevance >= 3 ? '#bbf7d0' : '#fde68a'};
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: ${props => props.hasUrl ? 'pointer' : 'default'};
  transition: all 0.2s ease;

  &:hover {
    ${props => props.hasUrl && `
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    `}
  }
`;

const ScoreDisplay = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
  font-size: 12px;
  
  .score {
    padding: 2px 6px;
    border-radius: 4px;
    background: #f3f4f6;
    color: #374151;
  }
  
  .high { background: #dcfce7; color: #166534; }
  .medium { background: #fef3c7; color: #92400e; }
  .low { background: #fee2e2; color: #991b1b; }
`;

const PCNewsTest = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const testPCFiltering = async () => {
    setLoading(true);
    setResults([]);

    try {
      // Import the news service
      const { fetchNewsArticles } = await import('../services/newsApiService');
      
      console.log('🔍 Testing strict P&C filtering...');
      
      // Test with different focus areas
      const testCases = [
        { focusArea: 'pc', label: 'P&C Combined' },
        { focusArea: 'property', label: 'Property Insurance' },
        { focusArea: 'casualty', label: 'Casualty Insurance' },
        { focusArea: 'commercial', label: 'Commercial Lines' },
        { focusArea: 'personal', label: 'Personal Lines' }
      ];

      for (const testCase of testCases) {
        try {
          console.log(`Testing ${testCase.label}...`);
          
          const articles = await fetchNewsArticles({
            focusArea: testCase.focusArea,
            minRelevanceScore: 1, // Start with low threshold to see filtering
            maxArticles: 8
          });

          setResults(prev => [...prev, {
            testCase: testCase.label,
            articles: articles,
            success: true,
            error: null
          }]);

        } catch (error) {
          console.error(`Error testing ${testCase.label}:`, error);
          setResults(prev => [...prev, {
            testCase: testCase.label,
            articles: [],
            success: false,
            error: error.message
          }]);
        }

        // Add delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error('Test failed:', error);
      setResults([{
        testCase: 'General Test',
        articles: [],
        success: false,
        error: error.message
      }]);
    } finally {
      setLoading(false);
    }
  };

  const testExclusionFiltering = () => {
    // Test the exclusion logic with sample content
    const testArticles = [
      { title: 'Property Insurance Rates Rise Due to Climate Risk', description: 'Commercial property insurance rates continue to increase as insurers assess climate-related risks.' },
      { title: 'Life Insurance Sales Reach Record High', description: 'Life insurance companies report record sales as consumers focus on financial protection.' },
      { title: 'Workers Compensation Claims Technology Advances', description: 'New technology platforms are streamlining workers compensation claims processing.' },
      { title: 'Health Insurance Marketplace Updates', description: 'The health insurance marketplace introduces new features for better coverage selection.' },
      { title: 'Auto Insurance Telematics Programs Expand', description: 'Usage-based auto insurance programs using telematics are gaining popularity among drivers.' },
      { title: 'Dental Insurance Benefits Enhanced', description: 'Dental insurance providers are expanding coverage options and benefits for subscribers.' }
    ];

    const mockResults = testArticles.map((article, index) => {
      // Simulate the exclusion logic
      const content = `${article.title.toLowerCase()} ${article.description.toLowerCase()}`;
      const exclusionTerms = ['life insurance', 'health insurance', 'dental insurance'];
      const hasExclusions = exclusionTerms.some(term => content.includes(term));
      
      // Simulate P&C relevance scoring
      const pcTerms = ['property insurance', 'workers compensation', 'auto insurance', 'commercial property'];
      const pcRelevanceScore = pcTerms.reduce((score, term) => {
        return content.includes(term) ? score + 2 : score;
      }, 0);

      return {
        ...article,
        id: `test_${index}`,
        category: hasExclusions ? 'excluded' : 'property',
        source: 'Test Source',
        publishedAt: new Date().toISOString(),
        url: '#',
        pcRelevanceScore: hasExclusions ? 0 : pcRelevanceScore,
        excluded: hasExclusions,
        exclusionReason: hasExclusions ? 'Non-P&C insurance content detected' : null
      };
    });

    setResults([{
      testCase: 'Exclusion Filter Test',
      articles: mockResults,
      success: true,
      error: null
    }]);
  };

  return (
    <TestContainer>
      <h1>P&C Insurance News Filtering Test</h1>
      
      <TestCard>
        <h3>Test Controls</h3>
        <Button onClick={testPCFiltering} disabled={loading}>
          {loading ? 'Testing API...' : 'Test Live P&C Filtering'}
        </Button>
        <Button onClick={testExclusionFiltering} disabled={loading}>
          Test Exclusion Logic
        </Button>
      </TestCard>

      {results.map((result, index) => (
        <TestCard key={index}>
          <h3>{result.testCase}</h3>
          
          {!result.success ? (
            <div style={{ color: '#dc2626' }}>
              ❌ Error: {result.error}
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '12px' }}>
                ✅ Found {result.articles.length} articles
                {result.articles.length > 0 && (
                  <>
                    <br />
                    📊 Relevance Range: {Math.min(...result.articles.map(a => a.pcRelevanceScore))} - {Math.max(...result.articles.map(a => a.pcRelevanceScore))}
                    <br />
                    🚫 Excluded: {result.articles.filter(a => a.excluded).length}
                  </>
                )}
              </div>
              
              {result.articles.map((article, articleIndex) => {
                const hasValidUrl = article.url && article.url !== '#';

                return (
                  <ArticleCard
                    key={articleIndex}
                    excluded={article.excluded}
                    relevance={article.pcRelevanceScore}
                    hasUrl={hasValidUrl}
                    onClick={() => {
                      if (hasValidUrl) {
                        window.open(article.url, '_blank', 'noopener,noreferrer');
                      }
                    }}
                  >
                    <div style={{
                      fontWeight: '600',
                      marginBottom: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start'
                    }}>
                      <span>{article.title}</span>
                      {hasValidUrl && (
                        <span style={{
                          fontSize: '12px',
                          color: '#6366f1',
                          marginLeft: '8px',
                          flexShrink: 0
                        }}>
                          🔗 Click to open
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                      {article.excerpt || article.description}
                    </div>
                    {hasValidUrl && (
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                        <strong>URL:</strong> {article.url.substring(0, 60)}...
                      </div>
                    )}
                    <ScoreDisplay>
                      <span className={`score ${article.pcRelevanceScore >= 3 ? 'high' : article.pcRelevanceScore >= 1 ? 'medium' : 'low'}`}>
                        P&C Score: {article.pcRelevanceScore}
                      </span>
                      <span className="score">Category: {article.category}</span>
                      {article.excluded && (
                        <span className="score low">
                          ❌ {article.exclusionReason}
                        </span>
                      )}
                    </ScoreDisplay>
                  </ArticleCard>
                );
              })}
            </>
          )}
        </TestCard>
      ))}
    </TestContainer>
  );
};

export default PCNewsTest;
