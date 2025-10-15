import React from 'react';
import styled from 'styled-components';
import { CoveragePackage, Coverage } from '../../types';
import { PencilIcon, TrashIcon, SparklesIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface PackageCardProps {
  package: CoveragePackage;
  coverages: Coverage[];
  onEdit?: () => void;
  onDelete?: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
}

export const PackageCard: React.FC<PackageCardProps> = ({
  package: pkg,
  coverages,
  onEdit,
  onDelete,
  onSelect,
  isSelected,
}) => {
  const packageCoverages = coverages.filter((c) => pkg.coverageIds.includes(c.id));
  
  const getPackageTypeColor = (type: string) => {
    switch (type) {
      case 'required':
        return { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' };
      case 'recommended':
        return { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' };
      case 'popular':
        return { bg: '#fef3c7', color: '#92400e', border: '#fbbf24' };
      default:
        return { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' };
    }
  };

  const typeColors = getPackageTypeColor(pkg.packageType);

  return (
    <Card $selected={isSelected} onClick={onSelect}>
      <CardHeader>
        <HeaderTop>
          <PackageInfo>
            <PackageName>{pkg.name}</PackageName>
            <PackageTypeBadge $colors={typeColors}>
              {pkg.packageType}
            </PackageTypeBadge>
          </PackageInfo>
          
          {(onEdit || onDelete) && (
            <CardActions>
              {onEdit && (
                <IconButton onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Edit">
                  <PencilIcon width={16} height={16} />
                </IconButton>
              )}
              {onDelete && (
                <IconButton 
                  className="danger" 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                  title="Delete"
                >
                  <TrashIcon width={16} height={16} />
                </IconButton>
              )}
            </CardActions>
          )}
        </HeaderTop>

        {pkg.description && (
          <PackageDescription>{pkg.description}</PackageDescription>
        )}
      </CardHeader>

      <CardBody>
        <Section>
          <SectionTitle>Included Coverages ({packageCoverages.length})</SectionTitle>
          <CoverageList>
            {packageCoverages.map((coverage) => (
              <CoverageItem key={coverage.id}>
                <CheckCircleIcon width={16} height={16} />
                <CoverageName>{coverage.name}</CoverageName>
                <CoverageType>{coverage.coverageType}</CoverageType>
              </CoverageItem>
            ))}
          </CoverageList>
        </Section>

        {(pkg.discountPercentage || pkg.packagePremium) && (
          <PricingSection>
            {pkg.discountPercentage && pkg.discountPercentage > 0 && (
              <DiscountBadge>
                <SparklesIcon width={16} height={16} />
                <DiscountText>{pkg.discountPercentage}% Discount</DiscountText>
              </DiscountBadge>
            )}
            
            {pkg.packagePremium && (
              <PremiumDisplay>
                <PremiumLabel>Package Premium:</PremiumLabel>
                <PremiumValue>${pkg.packagePremium.toFixed(2)}</PremiumValue>
              </PremiumDisplay>
            )}
          </PricingSection>
        )}
      </CardBody>

      {isSelected && (
        <SelectedIndicator>
          <CheckCircleIcon width={20} height={20} />
          Selected
        </SelectedIndicator>
      )}
    </Card>
  );
};

const Card = styled.div<{ $selected?: boolean }>`
  background: white;
  border: 2px solid ${({ $selected }) => $selected ? '#3b82f6' : '#e5e7eb'};
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;
  cursor: ${({ onClick }) => onClick ? 'pointer' : 'default'};
  position: relative;

  &:hover {
    border-color: ${({ $selected }) => $selected ? '#2563eb' : '#d1d5db'};
    box-shadow: ${({ onClick }) => onClick ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'};
  }
`;

const CardHeader = styled.div`
  margin-bottom: 16px;
`;

const HeaderTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const PackageInfo = styled.div`
  flex: 1;
`;

const PackageName = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
`;

const PackageTypeBadge = styled.span<{ $colors: { bg: string; color: string; border: string } }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${({ $colors }) => $colors.bg};
  color: ${({ $colors }) => $colors.color};
  border: 1px solid ${({ $colors }) => $colors.border};
`;

const PackageDescription = styled.p`
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
  margin: 8px 0 0 0;
`;

const CardActions = styled.div`
  display: flex;
  gap: 8px;
`;

const IconButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: white;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: #f9fafb;
    border-color: #d1d5db;
    color: #111827;
  }

  &.danger:hover {
    background: #fee2e2;
    border-color: #fca5a5;
    color: #dc2626;
  }
`;

const CardBody = styled.div``;

const Section = styled.div`
  margin-bottom: 16px;
`;

const SectionTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
`;

const CoverageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CoverageItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;

  svg {
    color: #22c55e;
    flex-shrink: 0;
  }
`;

const CoverageName = styled.span`
  flex: 1;
  font-weight: 500;
  color: #111827;
`;

const CoverageType = styled.span`
  font-size: 12px;
  color: #6b7280;
  padding: 2px 8px;
  background: white;
  border-radius: 4px;
`;

const PricingSection = styled.div`
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
`;

const DiscountBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;

  svg {
    flex-shrink: 0;
  }
`;

const DiscountText = styled.span``;

const PremiumDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const PremiumLabel = styled.span`
  font-size: 14px;
  color: #6b7280;
`;

const PremiumValue = styled.span`
  font-size: 24px;
  font-weight: 700;
  color: #111827;
`;

const SelectedIndicator = styled.div`
  position: absolute;
  top: -1px;
  right: -1px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #3b82f6;
  color: white;
  border-radius: 0 10px 0 10px;
  font-size: 12px;
  font-weight: 600;

  svg {
    flex-shrink: 0;
  }
`;

