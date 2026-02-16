import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useParams } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Coverage, CoveragePackage } from '../types';
import { useCoveragePackages, generatePackageRecommendations } from '../hooks/useCoveragePackages';
import { PackageCard } from './packages/PackageCard';
import { PackageBuilder } from './packages/PackageBuilder';
import { PlusIcon, SparklesIcon } from '@heroicons/react/24/outline';
import MainNavigation from './ui/Navigation';

const PackagesScreen: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { packages, loading, createPackage, updatePackage, deletePackage } = useCoveragePackages(productId);
  
  const [coverages, setCoverages] = useState<Coverage[]>([]);
  const [loadingCoverages, setLoadingCoverages] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CoveragePackage | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [showRecommendations] = useState(false);
  const [selectedCoverageIds] = useState<string[]>([]);

  // Load coverages
  useEffect(() => {
    if (!productId) return;

    const loadCoverages = async () => {
      try {
        const coveragesRef = collection(db, 'products', productId, 'coverages');
        const snapshot = await getDocs(coveragesRef);
        const coveragesList: Coverage[] = [];
        snapshot.forEach((doc) => {
          coveragesList.push({ id: doc.id, ...doc.data() } as Coverage);
        });
        setCoverages(coveragesList);
      } catch (err) {
        console.error('Error loading coverages:', err);
      } finally {
        setLoadingCoverages(false);
      }
    };

    loadCoverages();
  }, [productId]);

  const handleCreatePackage = async (packageData: Omit<CoveragePackage, 'id'>) => {
    await createPackage(packageData);
    setShowBuilder(false);
  };

  const handleUpdatePackage = async (packageData: Omit<CoveragePackage, 'id'>) => {
    if (!editingPackage) return;
    await updatePackage(editingPackage.id, packageData);
    setEditingPackage(null);
    setShowBuilder(false);
  };

  const handleDeletePackage = async (packageId: string) => {
    if (window.confirm('Are you sure you want to delete this package?')) {
      await deletePackage(packageId);
    }
  };

  const handleEditPackage = (pkg: CoveragePackage) => {
    setEditingPackage(pkg);
    setShowBuilder(true);
  };

  const filteredPackages = filterType === 'all' 
    ? packages 
    : packages.filter((pkg) => pkg.packageType === filterType);

  const recommendations = showRecommendations 
    ? generatePackageRecommendations(selectedCoverageIds, packages)
    : [];

  if (!productId) {
    return <ErrorMessage>No product selected</ErrorMessage>;
  }

  if (loading || loadingCoverages) {
    return <LoadingMessage>Loading packages...</LoadingMessage>;
  }

  if (showBuilder) {
    return (
      <>
      <MainNavigation />
      <Container>
        <PackageBuilder
          availableCoverages={coverages}
          initialData={editingPackage || undefined}
          onSave={editingPackage ? handleUpdatePackage : handleCreatePackage}
          onCancel={() => {
            setShowBuilder(false);
            setEditingPackage(null);
          }}
          productId={productId}
        />
      </Container>
      </>
    );
  }

  return (
    <>
    <MainNavigation />
    <Container>
      <Header>
        <HeaderLeft>
          <Title>Coverage Packages</Title>
          <Subtitle>Bundle coverages together with discounts and special pricing</Subtitle>
        </HeaderLeft>
        <HeaderRight>
          <CreateButton onClick={() => setShowBuilder(true)}>
            <PlusIcon width={20} height={20} />
            Create Package
          </CreateButton>
        </HeaderRight>
      </Header>

      <FilterBar>
        <FilterButton 
          $active={filterType === 'all'} 
          onClick={() => setFilterType('all')}
        >
          All Packages ({packages.length})
        </FilterButton>
        <FilterButton 
          $active={filterType === 'required'} 
          onClick={() => setFilterType('required')}
        >
          Required
        </FilterButton>
        <FilterButton 
          $active={filterType === 'recommended'} 
          onClick={() => setFilterType('recommended')}
        >
          Recommended
        </FilterButton>
        <FilterButton 
          $active={filterType === 'popular'} 
          onClick={() => setFilterType('popular')}
        >
          Popular
        </FilterButton>
        <FilterButton 
          $active={filterType === 'custom'} 
          onClick={() => setFilterType('custom')}
        >
          Custom
        </FilterButton>
      </FilterBar>

      {filteredPackages.length === 0 ? (
        <EmptyState>
          <EmptyStateTitle>No packages found</EmptyStateTitle>
          <EmptyStateText>
            {filterType === 'all' 
              ? 'Create your first coverage package to bundle coverages together'
              : `No ${filterType} packages available`
            }
          </EmptyStateText>
          {filterType === 'all' && (
            <CreateButton onClick={() => setShowBuilder(true)}>
              <PlusIcon width={20} height={20} />
              Create Package
            </CreateButton>
          )}
        </EmptyState>
      ) : (
        <PackagesGrid>
          {filteredPackages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              package={pkg}
              coverages={coverages}
              onEdit={() => handleEditPackage(pkg)}
              onDelete={() => handleDeletePackage(pkg.id)}
            />
          ))}
        </PackagesGrid>
      )}

      {recommendations.length > 0 && (
        <RecommendationsSection>
          <RecommendationsHeader>
            <SparklesIcon width={24} height={24} />
            <RecommendationsTitle>Recommended Packages</RecommendationsTitle>
          </RecommendationsHeader>
          <PackagesGrid>
            {recommendations.slice(0, 3).map((pkg) => (
              <PackageCard
                key={pkg.id}
                package={pkg}
                coverages={coverages}
              />
            ))}
          </PackagesGrid>
        </RecommendationsSection>
      )}
    </Container>
    </>
  );
};

const Container = styled.div`
  padding: 32px;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
`;

const HeaderLeft = styled.div``;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px 0;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #6b7280;
  margin: 0;
`;

const HeaderRight = styled.div``;

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  svg {
    flex-shrink: 0;
  }
`;

const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
`;

const FilterButton = styled.button<{ $active: boolean }>`
  padding: 8px 16px;
  background: ${({ $active }) => $active ? '#3b82f6' : 'white'};
  border: 1px solid ${({ $active }) => $active ? '#3b82f6' : '#d1d5db'};
  border-radius: 6px;
  color: ${({ $active }) => $active ? 'white' : '#374151'};
  font-size: 14px;
  font-weight: ${({ $active }) => $active ? '600' : '500'};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${({ $active }) => $active ? '#2563eb' : '#f9fafb'};
    border-color: ${({ $active }) => $active ? '#2563eb' : '#9ca3af'};
  }
`;

const PackagesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
`;

const EmptyStateIcon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
`;

const EmptyStateTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
`;

const EmptyStateText = styled.p`
  font-size: 16px;
  color: #6b7280;
  margin: 0 0 24px 0;
  max-width: 400px;
`;

const LoadingMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  font-size: 18px;
  color: #6b7280;
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  font-size: 18px;
  color: #dc2626;
`;

const RecommendationsSection = styled.div`
  margin-top: 48px;
  padding-top: 32px;
  border-top: 2px solid #e5e7eb;
`;

const RecommendationsHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;

  svg {
    color: #f59e0b;
  }
`;

const RecommendationsTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

export default PackagesScreen;

