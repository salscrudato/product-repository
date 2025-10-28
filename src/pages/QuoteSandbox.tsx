/**
 * Quote Sandbox
 * Interactive pricing calculator for testing coverage rates
 * Route: /quote-sandbox/:productId
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { DataDictionaryField, RatingInput } from '../types/pricing';
import dataDictionaryService from '../services/dataDictionaryService';
import logger, { LOG_CATEGORIES } from '../utils/logger';

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
  padding: 20px;
  height: 100vh;
  background: #f5f5f5;
`;

const Panel = styled.div`
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
`;

const PanelTitle = styled.h2`
  margin: 0 0 20px 0;
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
  font-weight: 500;
  color: #555;
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

const BreakdownTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;

  th, td {
    padding: 10px;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }

  th {
    background: #f9f9f9;
    font-weight: 600;
    color: #333;
  }

  tr:hover {
    background: #f9f9f9;
  }
`;

const TotalRow = styled.tr`
  font-weight: 600;
  background: #f0f0f0;
  font-size: 16px;
`;

const ErrorMessage = styled.div`
  background: #f8d7da;
  color: #721c24;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 15px;
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 20px;
  color: #666;
`;

interface QuoteSandboxProps {}

const QuoteSandbox: React.FC<QuoteSandboxProps> = () => {
  const { productId } = useParams<{ productId: string }>();
  const [fields, setFields] = useState<DataDictionaryField[]>([]);
  const [inputs, setInputs] = useState<RatingInput>({});
  const [selectedCoverageId, setSelectedCoverageId] = useState<string>('');
  const [breakdown, setBreakdown] = useState<Record<string, number> | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Load data dictionary fields
  useEffect(() => {
    const loadFields = async () => {
      if (!productId) return;
      try {
        const loadedFields = await dataDictionaryService.getProductFields(productId);
        setFields(loadedFields);
        
        // Initialize inputs with defaults
        const defaultInputs: RatingInput = {};
        for (const field of loadedFields) {
          if (field.defaultValue !== undefined) {
            defaultInputs[field.name] = field.defaultValue;
          }
        }
        setInputs(defaultInputs);

        // Load from localStorage
        const saved = localStorage.getItem(`quoteSandbox_${productId}`);
        if (saved) {
          setInputs(JSON.parse(saved));
        }
      } catch (err) {
        logger.error(LOG_CATEGORIES.ERROR, 'Failed to load data dictionary', {}, err as Error);
        setError('Failed to load rating fields');
      }
    };

    loadFields();
  }, [productId]);

  // Handle input change
  const handleInputChange = (fieldName: string, value: string | number | boolean) => {
    const newInputs = { ...inputs, [fieldName]: value };
    setInputs(newInputs);
    
    // Save to localStorage
    if (productId) {
      localStorage.setItem(`quoteSandbox_${productId}`, JSON.stringify(newInputs));
    }
  };

  // Calculate rate
  const handleCalculateRate = async () => {
    if (!productId || !selectedCoverageId) {
      setError('Please select a coverage');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const rateCoverage = httpsCallable(functions, 'rateCoverage');
      const result = await rateCoverage({
        productId,
        coverageId: selectedCoverageId,
        inputs
      });

      const data = result.data as any;
      setBreakdown(data.stepBreakdown);
      setTotal(data.total);
    } catch (err) {
      logger.error(LOG_CATEGORIES.ERROR, 'Rating calculation failed', {}, err as Error);
      setError('Failed to calculate rate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      {/* Left Panel: Inputs */}
      <Panel>
        <PanelTitle>Rating Inputs</PanelTitle>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        
        {fields.length === 0 ? (
          <LoadingSpinner>No rating fields configured</LoadingSpinner>
        ) : (
          <>
            {fields.map(field => (
              <FormGroup key={field.id}>
                <Label>{field.label}</Label>
                {field.type === 'enum' && field.enumOptions ? (
                  <Select
                    value={inputs[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                  >
                    <option value="">Select...</option>
                    {field.enumOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </Select>
                ) : field.type === 'boolean' ? (
                  <Select
                    value={inputs[field.name] ? 'true' : 'false'}
                    onChange={(e) => handleInputChange(field.name, e.target.value === 'true')}
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </Select>
                ) : (
                  <Input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={inputs[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, 
                      field.type === 'number' ? Number(e.target.value) : e.target.value
                    )}
                    min={field.min}
                    max={field.max}
                    placeholder={field.description}
                  />
                )}
              </FormGroup>
            ))}
          </>
        )}
      </Panel>

      {/* Middle Panel: Coverage Selection */}
      <Panel>
        <PanelTitle>Coverage Selection</PanelTitle>
        <FormGroup>
          <Label>Select Coverage</Label>
          <Select
            value={selectedCoverageId}
            onChange={(e) => setSelectedCoverageId(e.target.value)}
          >
            <option value="">Choose a coverage...</option>
            {/* Coverage options would be loaded from product */}
          </Select>
        </FormGroup>
        <Button onClick={handleCalculateRate} disabled={loading || !selectedCoverageId}>
          {loading ? 'Calculating...' : 'Calculate Rate'}
        </Button>
      </Panel>

      {/* Right Panel: Premium Breakdown */}
      <Panel>
        <PanelTitle>Premium Breakdown</PanelTitle>
        {breakdown ? (
          <BreakdownTable>
            <thead>
              <tr>
                <th>Step</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(breakdown).map(([stepId, amount]) => (
                <tr key={stepId}>
                  <td>{stepId}</td>
                  <td>${amount.toFixed(2)}</td>
                </tr>
              ))}
              <TotalRow>
                <td>Total Premium</td>
                <td>${total.toFixed(2)}</td>
              </TotalRow>
            </tbody>
          </BreakdownTable>
        ) : (
          <LoadingSpinner>Select a coverage and click "Calculate Rate"</LoadingSpinner>
        )}
      </Panel>
    </Container>
  );
};

export default QuoteSandbox;

