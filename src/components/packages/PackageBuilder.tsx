import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { CoveragePackage, Coverage, PackageType } from '../../types';
import { validatePackage, calculatePackagePremium } from '../../hooks/useCoveragePackages';

interface PackageBuilderProps {
  availableCoverages: Coverage[];
  initialData?: CoveragePackage;
  onSave: (packageData: Omit<CoveragePackage, 'id'>) => Promise<void>;
  onCancel: () => void;
  productId: string;
}

export const PackageBuilder: React.FC<PackageBuilderProps> = ({
  availableCoverages,
  initialData,
  onSave,
  onCancel,
  productId,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [packageType, setPackageType] = useState<PackageType>(initialData?.packageType || 'custom');
  const [selectedCoverageIds, setSelectedCoverageIds] = useState<string[]>(initialData?.coverageIds || []);
  const [discountPercentage, setDiscountPercentage] = useState<number>(initialData?.discountPercentage || 0);
  const [packagePremium, setPackagePremium] = useState<number | undefined>(initialData?.packagePremium);
  const [useCustomPremium, setUseCustomPremium] = useState(!!initialData?.packagePremium);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const packageTypeOptions = [
    { value: 'required', label: 'Required' },
    { value: 'recommended', label: 'Recommended' },
    { value: 'popular', label: 'Popular' },
    { value: 'custom', label: 'Custom' },
  ];

  const coverageOptions = availableCoverages.map((coverage) => ({
    value: coverage.id,
    label: coverage.name,
  }));

  const selectedCoverages = availableCoverages.filter((c) => 
    selectedCoverageIds.includes(c.id)
  );

  // Calculate estimated premium
  const estimatedPremium = React.useMemo(() => {
    // This is a placeholder - in real implementation, you'd fetch actual premiums
    const individualPremiums = selectedCoverages.map(() => 100); // Placeholder
    return calculatePackagePremium(individualPremiums, discountPercentage);
  }, [selectedCoverages, discountPercentage]);

  const handleSave = async () => {
    const packageData: Omit<CoveragePackage, 'id'> = {
      productId,
      name,
      description,
      packageType,
      coverageIds: selectedCoverageIds,
      discountPercentage: discountPercentage > 0 ? discountPercentage : undefined,
      packagePremium: useCustomPremium ? packagePremium : undefined,
      createdAt: initialData?.createdAt,
      updatedAt: new Date(),
    };

    const validationErrors = validatePackage(packageData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setErrors([]);

    try {
      await onSave(packageData);
    } catch (err: any) {
      setErrors([err.message]);
      setSaving(false);
    }
  };

  return (
    <BuilderContainer>
      <BuilderTitle>{initialData ? 'Edit Package' : 'Create Package'}</BuilderTitle>

      {errors.length > 0 && (
        <ErrorBox>
          {errors.map((error, idx) => (
            <ErrorItem key={idx}>{error}</ErrorItem>
          ))}
        </ErrorBox>
      )}

      <FormSection>
        <SectionTitle>Basic Information</SectionTitle>
        
        <FormGroup>
          <Label>Package Name *</Label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Essential Coverage Bundle"
          />
        </FormGroup>

        <FormGroup>
          <Label>Description</Label>
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this package includes and who it's for..."
            rows={3}
          />
        </FormGroup>

        <FormGroup>
          <Label>Package Type *</Label>
          <select
            value={packageType}
            onChange={(e) => setPackageType(e.target.value as PackageType)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #d1d5db' }}
          >
            {packageTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </FormGroup>
      </FormSection>

      <FormSection>
        <SectionTitle>Coverages</SectionTitle>
        
        <FormGroup>
          <Label>Select Coverages *</Label>
          <select
            multiple
            value={selectedCoverageIds}
            onChange={(e) => setSelectedCoverageIds(Array.from(e.target.selectedOptions, option => option.value))}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #d1d5db', minHeight: '100px' }}
          >
            {coverageOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </FormGroup>

        {selectedCoverages.length > 0 && (
          <SelectedCoveragesList>
            <ListTitle>Selected Coverages ({selectedCoverages.length})</ListTitle>
            {selectedCoverages.map((coverage) => (
              <CoverageItem key={coverage.id}>
                <CoverageName>{coverage.name}</CoverageName>
                <CoverageType>{coverage.coverageType}</CoverageType>
              </CoverageItem>
            ))}
          </SelectedCoveragesList>
        )}
      </FormSection>

      <FormSection>
        <SectionTitle>Pricing</SectionTitle>
        
        <FormGroup>
          <Label>Discount Percentage</Label>
          <InputWithUnit>
            <Input
              type="number"
              value={discountPercentage}
              onChange={(e) => setDiscountPercentage(Number(e.target.value))}
              min="0"
              max="100"
              step="0.1"
            />
            <Unit>%</Unit>
          </InputWithUnit>
          <HelpText>
            Discount applied to the total of individual coverage premiums
          </HelpText>
        </FormGroup>

        <CheckboxGroup>
          <Checkbox
            type="checkbox"
            checked={useCustomPremium}
            onChange={(e) => setUseCustomPremium(e.target.checked)}
          />
          <CheckboxLabel>Use custom package premium (override calculated premium)</CheckboxLabel>
        </CheckboxGroup>

        {useCustomPremium && (
          <FormGroup>
            <Label>Custom Package Premium</Label>
            <InputWithUnit>
              <Unit>$</Unit>
              <Input
                type="number"
                value={packagePremium || ''}
                onChange={(e) => setPackagePremium(Number(e.target.value))}
                min="0"
                step="0.01"
              />
            </InputWithUnit>
          </FormGroup>
        )}

        {!useCustomPremium && selectedCoverages.length > 0 && (
          <PremiumEstimate>
            <EstimateLabel>Estimated Package Premium:</EstimateLabel>
            <EstimateValue>${estimatedPremium.toFixed(2)}</EstimateValue>
            {discountPercentage > 0 && (
              <DiscountBadge>{discountPercentage}% discount applied</DiscountBadge>
            )}
          </PremiumEstimate>
        )}
      </FormSection>

      <FormActions>
        <CancelButton onClick={onCancel} disabled={saving}>
          Cancel
        </CancelButton>
        <SaveButton onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : (initialData ? 'Update Package' : 'Create Package')}
        </SaveButton>
      </FormActions>
    </BuilderContainer>
  );
};

const BuilderContainer = styled.div`
  background: white;
  border-radius: 8px;
  padding: 24px;
`;

const BuilderTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 24px 0;
`;

const ErrorBox = styled.div`
  padding: 12px 16px;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  margin-bottom: 24px;
`;

const ErrorItem = styled.div`
  color: #991b1b;
  font-size: 14px;
  margin-bottom: 4px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const FormSection = styled.div`
  margin-bottom: 32px;
  padding-bottom: 32px;
  border-bottom: 1px solid #e5e7eb;

  &:last-of-type {
    border-bottom: none;
  }
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #111827;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #111827;
  font-family: inherit;
  resize: vertical;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const InputWithUnit = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Unit = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
`;

const HelpText = styled.div`
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  font-size: 14px;
  color: #374151;
  cursor: pointer;
`;

const SelectedCoveragesList = styled.div`
  margin-top: 16px;
  padding: 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
`;

const ListTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
`;

const CoverageItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const CoverageName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #111827;
`;

const CoverageType = styled.div`
  font-size: 12px;
  color: #6b7280;
  padding: 2px 8px;
  background: #f3f4f6;
  border-radius: 4px;
`;

const PremiumEstimate = styled.div`
  padding: 16px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const EstimateLabel = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #0c4a6e;
`;

const EstimateValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: #0369a1;
`;

const DiscountBadge = styled.div`
  padding: 4px 12px;
  background: #22c55e;
  color: white;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
`;

const CancelButton = styled.button`
  padding: 10px 20px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f9fafb;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SaveButton = styled.button`
  padding: 10px 20px;
  background: #3b82f6;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #2563eb;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

