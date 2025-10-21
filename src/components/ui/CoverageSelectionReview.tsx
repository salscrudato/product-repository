/**
 * Coverage Selection and Product Review Component
 * Allows users to select/deselect coverages and edit product information
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import { ExtractionResult, CoverageExtraction } from '../../services/productCreationAgent';

interface CoverageSelectionReviewProps {
  extractionResult: ExtractionResult;
  onConfirm: (updatedResult: ExtractionResult, selectedCoverageIndices: number[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-height: 70vh;
  overflow-y: auto;
  padding: 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;

    &:hover {
      background: #94a3b8;
    }
  }
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SectionTitle = styled.h3`
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
`;

const ProductInfoSection = styled(Section)`
  background: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const Input = styled.input`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:hover {
    border-color: #9ca3af;
  }
`;

const TextArea = styled.textarea`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:hover {
    border-color: #9ca3af;
  }
`;

const CoveragesSection = styled(Section)`
  background: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`;

const CoverageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CoverageItem = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: white;
  border: 2px solid ${props => props.$selected ? '#3b82f6' : '#e5e7eb'};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
    background: #f0f9ff;
  }
`;

const Checkbox = styled.input`
  width: 20px;
  height: 20px;
  margin-top: 2px;
  cursor: pointer;
  accent-color: #3b82f6;
  flex-shrink: 0;
`;

const CoverageContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const CoverageName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
`;

const CoverageDescription = styled.div`
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
`;

const CoverageDetails = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
`;

const DetailBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 4px;
`;

const ConfidenceBadge = styled(DetailBadge)<{ $confidence: number }>`
  background: ${props => {
    if (props.$confidence >= 80) return '#dcfce7';
    if (props.$confidence >= 60) return '#fef3c7';
    return '#fee2e2';
  }};
  color: ${props => {
    if (props.$confidence >= 80) return '#16a34a';
    if (props.$confidence >= 60) return '#d97706';
    return '#dc2626';
  }};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
`;

const Button = styled.button<{ $primary?: boolean }>`
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  ${props => props.$primary ? `
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    &:active {
      transform: translateY(0);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
  ` : `
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;

    &:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }

    &:active {
      background: #f3f4f6;
    }
  `}
`;

const SelectionStats = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #6b7280;
  background: #f0f9ff;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #bfdbfe;
`;

const StatBadge = styled.span`
  font-weight: 600;
  color: #3b82f6;
`;

export const CoverageSelectionReview: React.FC<CoverageSelectionReviewProps> = ({
  extractionResult,
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  const [productName, setProductName] = useState(extractionResult.productName);
  const [productDescription, setProductDescription] = useState(extractionResult.productDescription);
  const [productCode, setProductCode] = useState(extractionResult.productCode || '');
  const [selectedCoverages, setSelectedCoverages] = useState<Set<number>>(
    new Set(extractionResult.coverages.map((_, i) => i))
  );

  const handleCoverageToggle = (index: number) => {
    const newSelected = new Set(selectedCoverages);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedCoverages(newSelected);
  };

  const handleConfirm = () => {
    const updatedResult: ExtractionResult = {
      ...extractionResult,
      productName,
      productDescription,
      productCode,
      coverages: extractionResult.coverages.filter((_, i) => selectedCoverages.has(i))
    };
    onConfirm(updatedResult, Array.from(selectedCoverages));
  };

  const selectedCount = selectedCoverages.size;
  const totalCount = extractionResult.coverages.length;

  return (
    <Container>
      <ProductInfoSection>
        <SectionTitle>Product Information</SectionTitle>
        
        <FormGroup>
          <Label>Product Name</Label>
          <Input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Enter product name"
          />
        </FormGroup>

        <FormGroup>
          <Label>Product Code</Label>
          <Input
            type="text"
            value={productCode}
            onChange={(e) => setProductCode(e.target.value)}
            placeholder="Enter product code (optional)"
          />
        </FormGroup>

        <FormGroup>
          <Label>Description</Label>
          <TextArea
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            placeholder="Enter product description"
          />
        </FormGroup>
      </ProductInfoSection>

      <CoveragesSection>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionTitle>Select Coverages to Include</SectionTitle>
          <SelectionStats>
            <span>Selected:</span>
            <StatBadge>{selectedCount}</StatBadge>
            <span>of</span>
            <StatBadge>{totalCount}</StatBadge>
          </SelectionStats>
        </div>

        <CoverageList>
          {extractionResult.coverages.map((coverage, index) => (
            <CoverageItem
              key={`coverage-${index}`}
              $selected={selectedCoverages.has(index)}
              onClick={() => handleCoverageToggle(index)}
            >
              <Checkbox
                type="checkbox"
                checked={selectedCoverages.has(index)}
                onChange={() => handleCoverageToggle(index)}
                onClick={(e) => e.stopPropagation()}
              />
              <CoverageContent>
                <CoverageName>{coverage.name}</CoverageName>
                {coverage.description && (
                  <CoverageDescription>{coverage.description}</CoverageDescription>
                )}
                <CoverageDetails>
                  <ConfidenceBadge $confidence={coverage.confidence}>
                    Confidence: {coverage.confidence}%
                  </ConfidenceBadge>
                  {coverage.code && (
                    <DetailBadge>Code: {coverage.code}</DetailBadge>
                  )}
                  {coverage.perilsCovered && coverage.perilsCovered.length > 0 && (
                    <DetailBadge>
                      {coverage.perilsCovered.length} perils
                    </DetailBadge>
                  )}
                </CoverageDetails>
              </CoverageContent>
            </CoverageItem>
          ))}
        </CoverageList>
      </CoveragesSection>

      <ButtonGroup>
        <Button onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          $primary
          onClick={handleConfirm}
          disabled={isLoading || selectedCount === 0 || !productName.trim()}
        >
          {isLoading ? 'Creating...' : 'Create Product'}
        </Button>
      </ButtonGroup>
    </Container>
  );
};

export default CoverageSelectionReview;

