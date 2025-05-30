import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import styled from 'styled-components';
import { NewspaperIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid';

const NewsFeedContainer = styled.aside`
  width: 100%;
  max-width: 400px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  overflow: hidden;

  @media (max-width: 768px) {
    max-width: 100%;
    margin-bottom: 24px;
  }
`;

const NewsHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
`;

const NewsIcon = styled(NewspaperIcon)`
  width: 20px;
  height: 20px;
  color: #6366f1;
  flex-shrink: 0;
`;

const NewsTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  letter-spacing: -0.01em;
`;

const NewsList = styled.div`
  max-height: 400px;
  overflow-y: auto;
  padding: 16px 0;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.3);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.5);
  }
`;

const NewsCard = styled.div`
  padding: 16px 24px;
  border-bottom: 1px solid rgba(243, 244, 246, 0.8);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.02);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const NewsLink = styled.a`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  text-decoration: none;
  color: inherit;
  margin-bottom: 8px;

  &:hover {
    color: #6366f1;
  }
`;

const NewsCardTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.4;
  flex: 1;

  ${NewsLink}:hover & {
    color: #6366f1;
  }
`;

const ExternalIcon = styled(ArrowTopRightOnSquareIcon)`
  width: 12px;
  height: 12px;
  color: #9ca3af;
  flex-shrink: 0;
  margin-top: 2px;
  opacity: 0;
  transition: opacity 0.2s ease;

  ${NewsLink}:hover & {
    opacity: 1;
    color: #6366f1;
  }
`;

const NewsSummary = styled.p`
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
`;

const NewsMetadata = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
`;

const NewsSource = styled.span`
  color: #6366f1;
  font-weight: 600;
`;

const LoadingState = styled.div`
  padding: 40px 24px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
`;

const EmptyState = styled.div`
  padding: 40px 24px;
  text-align: center;
  color: #6b7280;
  font-size: 14px;
`;

export default function InsuranceNewsFeed() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const q = query(
        collection(db, 'newsSummaries'),
        orderBy('timestamp', 'desc'),
        limit(20)
      );

      const unsubscribe = onSnapshot(q,
        (snapshot) => {
          const newsItems = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setItems(newsItems);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching news:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.error('Error setting up news listener:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';

    // Handle Firestore timestamp
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <NewsFeedContainer>
      <NewsHeader>
        <NewsIcon />
        <NewsTitle>Insurance News</NewsTitle>
      </NewsHeader>

      <NewsList>
        {loading ? (
          <LoadingState>Loading latest news...</LoadingState>
        ) : error ? (
          <EmptyState>Unable to load news at this time.</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState>No news available yet.</EmptyState>
        ) : (
          items.map(item => (
            <NewsCard key={item.id}>
              <NewsLink
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <NewsCardTitle>{item.title}</NewsCardTitle>
                <ExternalIcon />
              </NewsLink>

              <NewsSummary>{item.summary}</NewsSummary>

              <NewsMetadata>
                <NewsSource>{item.source}</NewsSource>
                <span>•</span>
                <span>{formatTimestamp(item.timestamp)}</span>
              </NewsMetadata>
            </NewsCard>
          ))
        )}
      </NewsList>
    </NewsFeedContainer>
  );
}
