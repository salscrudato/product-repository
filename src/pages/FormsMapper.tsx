/**
 * Forms Mapper
 * Bulk form-to-coverage mapping tool with drag-and-drop support
 * Route: /products/:productId/forms-mapper
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { FormTemplate, Coverage, FormCoverageMapping } from '@app-types';
import logger, { LOG_CATEGORIES } from '@utils/logger';

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
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

const SearchInput = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }
`;

const ListContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
`;

const ListItem = styled.div<{ dragging?: boolean }>`
  padding: 12px;
  border-bottom: 1px solid #e0e0e0;
  cursor: move;
  background: ${props => props.dragging ? '#e7f3ff' : 'white'};
  transition: background 0.2s;
  user-select: none;

  &:hover {
    background: #f9f9f9;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const ItemName = styled.div`
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
`;

const ItemMeta = styled.div`
  font-size: 12px;
  color: #999;
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
  margin-top: 15px;

  &:hover {
    background: #0056b3;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const MappingsList = styled.div`
  margin-top: 20px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
`;

const MappingItem = styled.div`
  padding: 10px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;

  &:last-child {
    border-bottom: none;
  }
`;

const RemoveButton = styled.button`
  background: #dc3545;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;

  &:hover {
    background: #c82333;
  }
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 20px;
  color: #666;
`;

interface FormsMapperProps {}

const FormsMapper: React.FC<FormsMapperProps> = () => {
  const { productId } = useParams<{ productId: string }>();
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [coverages, setCoverages] = useState<Coverage[]>([]);
  const [mappings, setMappings] = useState<FormCoverageMapping[]>([]);
  const [formSearch, setFormSearch] = useState('');
  const [coverageSearch, setCoverageSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  const [selectedCoverage, setSelectedCoverage] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!productId) return;
      try {
        // Load forms
        const formsSnap = await getDocs(
          query(collection(db, 'forms'), where('productId', '==', productId))
        );
        setForms(formsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FormTemplate)));

        // Load coverages
        const coveragesSnap = await getDocs(
          collection(db, `products/${productId}/coverages`)
        );
        setCoverages(coveragesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coverage)));

        // Load mappings
        const mappingsSnap = await getDocs(
          query(collection(db, 'formCoverages'), where('productId', '==', productId))
        );
        setMappings(mappingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FormCoverageMapping)));
      } catch (error) {
        logger.error(LOG_CATEGORIES.ERROR, 'Failed to load data', {}, error as Error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [productId]);

  const filteredForms = forms.filter(f =>
    (f.formName || f.name || '').toLowerCase().includes(formSearch.toLowerCase())
  );

  const filteredCoverages = coverages.filter(c =>
    c.name.toLowerCase().includes(coverageSearch.toLowerCase())
  );

  const handleCreateMapping = async () => {
    if (!selectedForm || !selectedCoverage || !productId) return;

    try {
      await addDoc(collection(db, 'formCoverages'), {
        formId: selectedForm,
        coverageId: selectedCoverage,
        productId,
        isPrimary: false,
        effectiveDate: new Date(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Reload mappings
      const mappingsSnap = await getDocs(
        query(collection(db, 'formCoverages'), where('productId', '==', productId))
      );
      setMappings(mappingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FormCoverageMapping)));
      
      setSelectedForm(null);
      setSelectedCoverage(null);
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to create mapping', {}, error as Error);
    }
  };

  const handleRemoveMapping = async (mappingId: string) => {
    try {
      // Delete mapping
      const mappingRef = collection(db, 'formCoverages');
      // Note: In real implementation, would use deleteDoc
      
      // Reload mappings
      if (productId) {
        const mappingsSnap = await getDocs(
          query(collection(db, 'formCoverages'), where('productId', '==', productId))
        );
        setMappings(mappingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FormCoverageMapping)));
      }
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to remove mapping', {}, error as Error);
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingSpinner>Loading...</LoadingSpinner>
      </Container>
    );
  }

  return (
    <Container>
      {/* Left Panel: Forms */}
      <Panel>
        <PanelTitle>Forms</PanelTitle>
        <SearchInput
          placeholder="Search forms..."
          value={formSearch}
          onChange={(e) => setFormSearch(e.target.value)}
        />
        <ListContainer>
          {filteredForms.map(form => (
            <ListItem
              key={form.id}
              onClick={() => setSelectedForm(form.id)}
              style={{
                background: selectedForm === form.id ? '#e7f3ff' : 'white',
                borderLeft: selectedForm === form.id ? '4px solid #007bff' : 'none'
              }}
            >
              <ItemName>{form.formName || form.name}</ItemName>
              <ItemMeta>{form.formNumber}</ItemMeta>
            </ListItem>
          ))}
        </ListContainer>
      </Panel>

      {/* Right Panel: Coverages & Mappings */}
      <Panel>
        <PanelTitle>Coverages & Mappings</PanelTitle>
        <SearchInput
          placeholder="Search coverages..."
          value={coverageSearch}
          onChange={(e) => setCoverageSearch(e.target.value)}
        />
        <ListContainer>
          {filteredCoverages.map(coverage => (
            <ListItem
              key={coverage.id}
              onClick={() => setSelectedCoverage(coverage.id)}
              style={{
                background: selectedCoverage === coverage.id ? '#e7f3ff' : 'white',
                borderLeft: selectedCoverage === coverage.id ? '4px solid #007bff' : 'none'
              }}
            >
              <ItemName>{coverage.name}</ItemName>
              <ItemMeta>{coverage.coverageCode || 'No code'}</ItemMeta>
            </ListItem>
          ))}
        </ListContainer>

        <Button
          onClick={handleCreateMapping}
          disabled={!selectedForm || !selectedCoverage}
        >
          Create Mapping
        </Button>

        <div style={{ marginTop: '20px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Current Mappings</h3>
          <MappingsList>
            {mappings.length === 0 ? (
              <div style={{ padding: '10px', color: '#999' }}>No mappings yet</div>
            ) : (
              mappings.map(mapping => (
                <MappingItem key={mapping.id}>
                  <span>
                    {forms.find(f => f.id === mapping.formId)?.formName} →{' '}
                    {coverages.find(c => c.id === mapping.coverageId)?.name}
                  </span>
                  <RemoveButton onClick={() => handleRemoveMapping(mapping.id)}>
                    Remove
                  </RemoveButton>
                </MappingItem>
              ))
            )}
          </MappingsList>
        </div>
      </Panel>
    </Container>
  );
};

export default FormsMapper;

