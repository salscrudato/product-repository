/**
 * Pricing Builder
 * Create and manage pricing steps and rules
 * Route: /products/:productId/pricing
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import MainNavigation from '../components/ui/Navigation';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { PricingStep, PricingRule } from '../types';
import logger, { LOG_CATEGORIES } from '../utils/logger';

const PageWrapper = styled.div`
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
`;

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 20px;
  flex: 1;
`;

const Panel = styled.div`
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const PanelTitle = styled.h2`
  margin: 0 0 15px 0;
  font-size: 18px;
  color: #333;
  border-bottom: 2px solid #007bff;
  padding-bottom: 10px;
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: #333;
  font-size: 14px;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  min-height: 80px;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }
`;

const Button = styled.button`
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;

  &:hover {
    background: #0056b3;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const StepsList = styled.div`
  flex: 1;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin-top: 15px;
`;

const StepItem = styled.div`
  padding: 12px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #f9f9f9;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const StepName = styled.div`
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
`;

const StepMeta = styled.div`
  font-size: 12px;
  color: #999;
`;

const RulesList = styled.div`
  flex: 1;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin-top: 15px;
`;

const RuleItem = styled.div`
  padding: 10px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
  font-size: 13px;

  &:last-child {
    border-bottom: none;
  }
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 20px;
  color: #666;
`;

interface PricingBuilderProps {}

const PricingBuilder: React.FC<PricingBuilderProps> = () => {
  const { productId } = useParams<{ productId: string }>();
  const [steps, setSteps] = useState<PricingStep[]>([]);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [stepName, setStepName] = useState('');
  const [stepScope, setStepScope] = useState<'product' | 'coverage'>('product');
  const [stepOrder, setStepOrder] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      if (!productId) return;
      try {
        // Load pricing steps
        const stepsSnap = await getDocs(
          query(
            collection(db, `products/${productId}/pricingSteps`),
            where('productId', '==', productId)
          )
        );
        setSteps(stepsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PricingStep)));

        // Load pricing rules
        const rulesSnap = await getDocs(
          query(collection(db, 'rules'), where('productId', '==', productId))
        );
        setRules(rulesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PricingRule)));
      } catch (error) {
        logger.error(LOG_CATEGORIES.ERROR, 'Failed to load pricing data', {}, error as Error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [productId]);

  const handleCreateStep = async () => {
    if (!stepName || !productId) return;

    try {
      await addDoc(collection(db, `products/${productId}/pricingSteps`), {
        productId,
        name: stepName,
        scope: stepScope,
        order: stepOrder,
        rules: [],
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Reload steps
      const stepsSnap = await getDocs(
        query(
          collection(db, `products/${productId}/pricingSteps`),
          where('productId', '==', productId)
        )
      );
      setSteps(stepsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PricingStep)));

      setStepName('');
      setStepOrder(stepOrder + 1);
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to create pricing step', {}, error as Error);
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <MainNavigation />
        <Container>
          <LoadingSpinner>Loading...</LoadingSpinner>
        </Container>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
    <MainNavigation />
    <Container>
      {/* Left Panel: Create Step */}
      <Panel>
        <PanelTitle>Create Pricing Step</PanelTitle>

        <FormGroup>
          <Label>Step Name</Label>
          <Input
            value={stepName}
            onChange={(e) => setStepName(e.target.value)}
            placeholder="e.g., Base Rate"
          />
        </FormGroup>

        <FormGroup>
          <Label>Scope</Label>
          <Select value={stepScope} onChange={(e) => setStepScope(e.target.value as 'product' | 'coverage')}>
            <option value="product">Product-wide</option>
            <option value="coverage">Coverage-specific</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>Execution Order</Label>
          <Input
            type="number"
            value={stepOrder}
            onChange={(e) => setStepOrder(Number(e.target.value))}
          />
        </FormGroup>

        <Button onClick={handleCreateStep} disabled={!stepName}>
          Create Step
        </Button>

        <PanelTitle style={{ marginTop: '30px' }}>Pricing Steps</PanelTitle>
        <StepsList>
          {steps.length === 0 ? (
            <div style={{ padding: '10px', color: '#999' }}>No steps created yet</div>
          ) : (
            steps
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map(step => (
                <StepItem key={step.id}>
                  <StepName>{step.name}</StepName>
                  <StepMeta>
                    Order: {step.order} | Scope: {step.scope} | Rules: {(step.rules || []).length}
                  </StepMeta>
                </StepItem>
              ))
          )}
        </StepsList>
      </Panel>

      {/* Right Panel: Rules */}
      <Panel>
        <PanelTitle>Pricing Rules</PanelTitle>
        <RulesList>
          {rules.length === 0 ? (
            <div style={{ padding: '10px', color: '#999' }}>No rules created yet</div>
          ) : (
            rules.map(rule => (
              <RuleItem key={rule.id}>
                <strong>{rule.name}</strong>
                <div style={{ marginTop: '4px', color: '#666' }}>
                  Type: {rule.ruleType} | Value: {rule.value} {rule.valueType}
                </div>
              </RuleItem>
            ))
          )}
        </RulesList>
      </Panel>
    </Container>
    </PageWrapper>
  );
};

export default PricingBuilder;

