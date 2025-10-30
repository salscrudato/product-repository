/**
 * Product 360 Overview
 * Comprehensive product management dashboard with tabs for all aspects
 * Route: /products/:productId/overview
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { Product } from '@types/index';
import logger, { LOG_CATEGORIES } from '@utils/logger';
import { getProduct360Summary, Product360Summary } from '@services/product360ReadModel';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
`;

const Header = styled.div`
  background: white;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`;

const Title = styled.h1`
  margin: 0 0 10px 0;
  font-size: 28px;
  color: #333;
`;

const Subtitle = styled.p`
  margin: 0;
  color: #666;
  font-size: 14px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-top: 15px;
`;

const StatCard = styled.div`
  background: #f9f9f9;
  padding: 15px;
  border-radius: 6px;
  border-left: 4px solid #007bff;
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
  text-transform: uppercase;
  font-weight: 600;
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #333;
`;

const TabBar = styled.div`
  display: flex;
  background: white;
  border-bottom: 2px solid #e0e0e0;
  padding: 0 20px;
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 15px 20px;
  border: none;
  background: transparent;
  border-bottom: ${props => props.active ? '3px solid #007bff' : 'none'};
  cursor: pointer;
  font-size: 14px;
  font-weight: ${props => props.active ? '600' : '500'};
  color: ${props => props.active ? '#007bff' : '#666'};
  transition: all 0.2s;

  &:hover {
    color: #007bff;
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
`;

const TabContent = styled.div`
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
`;

const ErrorMessage = styled.div`
  background: #f8d7da;
  color: #721c24;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
`;

interface Product360Props {}

const Product360: React.FC<Product360Props> = () => {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [summary, setSummary] = useState<Product360Summary | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'coverages' | 'forms' | 'pricing' | 'packages'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) return;
      try {
        const productSummary = await getProduct360Summary(productId);

        if (productSummary) {
          setProduct(productSummary.product);
          setSummary(productSummary);
        } else {
          setError('Product not found');
        }
      } catch (err) {
        logger.error(LOG_CATEGORIES.ERROR, 'Failed to load product', {}, err as Error);
        setError('Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [productId]);

  if (loading) {
    return (
      <Container>
        <LoadingSpinner>Loading product...</LoadingSpinner>
      </Container>
    );
  }

  if (error || !product) {
    return (
      <Container>
        <Header>
          <Title>Product 360</Title>
        </Header>
        <Content>
          <ErrorMessage>{error || 'Product not found'}</ErrorMessage>
        </Content>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>{product.name}</Title>
        <Subtitle>{product.description}</Subtitle>
        <StatsGrid>
          <StatCard>
            <StatLabel>Coverages</StatLabel>
            <StatValue>{summary?.stats.totalCoverages || 0}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Forms</StatLabel>
            <StatValue>{summary?.stats.totalForms || 0}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Rules</StatLabel>
            <StatValue>{summary?.stats.totalRules || 0}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Limits</StatLabel>
            <StatValue>{summary?.stats.totalLimits || 0}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Deductibles</StatLabel>
            <StatValue>{summary?.stats.totalDeductibles || 0}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Status</StatLabel>
            <StatValue style={{ fontSize: '14px' }}>{product.status || 'draft'}</StatValue>
          </StatCard>
        </StatsGrid>
      </Header>

      <TabBar>
        <Tab active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
          Overview
        </Tab>
        <Tab active={activeTab === 'coverages'} onClick={() => setActiveTab('coverages')}>
          Coverages
        </Tab>
        <Tab active={activeTab === 'forms'} onClick={() => setActiveTab('forms')}>
          Forms
        </Tab>
        <Tab active={activeTab === 'pricing'} onClick={() => setActiveTab('pricing')}>
          Pricing
        </Tab>
        <Tab active={activeTab === 'packages'} onClick={() => setActiveTab('packages')}>
          Packages
        </Tab>
      </TabBar>

      <Content>
        <TabContent>
          {activeTab === 'overview' && (
            <div>
              <h3>Product Overview</h3>
              <p><strong>Product Code:</strong> {product.productCode || 'N/A'}</p>
              <p><strong>Category:</strong> {product.category || 'N/A'}</p>
              <p><strong>Status:</strong> {product.status || 'draft'}</p>
              <p><strong>Available States:</strong> {product.states?.join(', ') || 'All'}</p>
              {product.effectiveDate && (
                <p><strong>Effective Date:</strong> {new Date(product.effectiveDate as any).toLocaleDateString()}</p>
              )}
              {product.expirationDate && (
                <p><strong>Expiration Date:</strong> {new Date(product.expirationDate as any).toLocaleDateString()}</p>
              )}
            </div>
          )}

          {activeTab === 'coverages' && (
            <div>
              <h3>Coverages</h3>
              <p>Coverage management interface would be displayed here</p>
            </div>
          )}

          {activeTab === 'forms' && (
            <div>
              <h3>Forms</h3>
              <p>Form management interface would be displayed here</p>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div>
              <h3>Pricing</h3>
              <p>Pricing steps and rules would be displayed here</p>
            </div>
          )}

          {activeTab === 'packages' && (
            <div>
              <h3>Packages</h3>
              <p>Coverage packages would be displayed here</p>
            </div>
          )}
        </TabContent>
      </Content>
    </Container>
  );
};

export default Product360;

