import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { collection, collectionGroup, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

import styled, { keyframes } from 'styled-components';
import { Page, Container, PageHeader, Title } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';

// Styled components
const SuggestionList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
  background: #fff;
  position: absolute;
  z-index: 10;
  width: 100%;
`;

const SuggestionItem = styled.li`
  padding: 8px 12px;
  cursor: pointer;
  &:hover {
    background: #F9FAFB;
  }
`;

const ResultSection = styled.div`
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ResultCard = styled.div`
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-left: 4px solid transparent;
  background: linear-gradient(90deg, #F9FAFB, #FFFFFF);
`;

const SelectedItemCard = styled(ResultCard)`
  border-left-color: #A100FF;
`;

const RelatedCard = styled(ResultCard)`
  border-left-color: #4400FF;
`;

const CardTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  background: linear-gradient(90deg, #0074E1, #60419F);
  -webkit-background-clip: text;
  color: transparent;
`;

const ItemList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Item = styled.li`
  padding: 8px 12px;
  background: #F9FAFB;
  border-radius: 6px;
  font-size: 14px;
  color: #1F2937;
  transition: background 0.2s ease;
  cursor: pointer;
  &:hover {
    background: #E5E7EB;
  }
`;

const SubItemList = styled.ul`
  list-style: none;
  padding-left: 20px;
  margin-top: 8px;
`;

const SubItem = styled.li`
  padding: 4px 12px;
  font-size: 13px;
  color: #4B5563;
`;

const NoItemsText = styled.p`
  font-size: 14px;
  color: #6B7280;
  font-style: italic;
`;

// loading spinner
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;
const Spinner = styled.div`
  border: 4px solid #f3f3f3;
  border-top: 4px solid #6366f1;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: ${spin} 1s linear infinite;
  margin: 100px auto;
`;

export default function ProductExplorer() {
  const [loading, setLoading] = useState(true);
  const [searchType, setSearchType] = useState('coverage');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [products, setProducts] = useState([]);
  const [coverages, setCoverages] = useState([]);
  const [forms, setForms] = useState([]);
  const [expandedCoverages, setExpandedCoverages] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const productsSnap = await getDocs(collection(db, 'products'));
        setProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const coveragesSnap = await getDocs(collectionGroup(db, 'coverages'));
        setCoverages(coveragesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          productId: doc.ref.parent.parent.id
        })));

        const formsSnap = await getDocs(collection(db, 'forms'));
        setForms(formsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    let items = [];
    if (searchType === 'coverage') {
      items = coverages.filter(cov => cov.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const uniqueItems = [];
      const seenNames = new Set();
      for (const item of items) {
        if (!seenNames.has(item.name)) {
          seenNames.add(item.name);
          uniqueItems.push(item);
        }
      }
      items = uniqueItems;
    } else if (searchType === 'product') {
      items = products.filter(prod => prod.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const uniqueItems = [];
      const seenNames = new Set();
      for (const item of items) {
        if (!seenNames.has(item.name)) {
          seenNames.add(item.name);
          uniqueItems.push(item);
        }
      }
      items = uniqueItems;
    } else if (searchType === 'form') {
      items = forms.filter(form => 
        (form.formName || form.formNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
      const uniqueItems = [];
      const seenNames = new Set();
      for (const item of items) {
        const displayName = item.formName || item.formNumber;
        if (!seenNames.has(displayName)) {
          seenNames.add(displayName);
          uniqueItems.push(item);
        }
      }
      items = uniqueItems;
    }
    setSuggestions(items.slice(0, 20));
  }, [searchType, searchQuery, coverages, products, forms]);

  const handleSelect = (item) => {
    setSelectedItem(item);
    setSearchQuery('');
    setSuggestions([]);
    setExpandedCoverages({});
  };

  const toggleCoverageExpansion = (coverageId) => {
    setExpandedCoverages(prev => ({
      ...prev,
      [coverageId]: !prev[coverageId]
    }));
  };

  const buildHierarchicalCoverages = (coverages, productId) => {
    const productCoverages = coverages.filter(cov => cov.productId === productId);
    const coverageMap = {};
    productCoverages.forEach(cov => {
      coverageMap[cov.id] = { ...cov, subcoverages: [] };
    });
    productCoverages.forEach(cov => {
      if (cov.parentCoverageId && coverageMap[cov.parentCoverageId]) {
        coverageMap[cov.parentCoverageId].subcoverages.push(coverageMap[cov.id]);
      }
    });
    const topLevelCoverages = productCoverages.filter(cov => !cov.parentCoverageId).map(cov => coverageMap[cov.id]);
    return topLevelCoverages;
  };

  const renderRelatedItems = () => {
    if (!selectedItem) return null;

    if (searchType === 'coverage') {
      const relatedProducts = products.filter(prod => 
        coverages.some(cov => cov.productId === prod.id && cov.name === selectedItem.name)
      );
      const relatedForms = forms.filter(form => 
        selectedItem.formIds && selectedItem.formIds.includes(form.id)
      );
      return (
        <ResultSection>
          <RelatedCard>
            <CardTitle>Products containing {selectedItem.name}</CardTitle>
            {relatedProducts.length ? (
              <ItemList>
                {relatedProducts.map(prod => <Item key={prod.id}>{prod.name}</Item>)}
              </ItemList>
            ) : <NoItemsText>No products found.</NoItemsText>}
          </RelatedCard>
          <RelatedCard>
            <CardTitle>Applicable Forms</CardTitle>
            {relatedForms.length ? (
              <ItemList>
                {relatedForms.map(form => <Item key={form.id}>{form.formName || form.formNumber}</Item>)}
              </ItemList>
            ) : <NoItemsText>No forms found.</NoItemsText>}
          </RelatedCard>
        </ResultSection>
      );
    } else if (searchType === 'product') {
      const hierarchicalCoverages = buildHierarchicalCoverages(coverages, selectedItem.id);
      const relatedForms = forms.filter(form => form.productId === selectedItem.id);
      return (
        <ResultSection>
          <RelatedCard>
            <CardTitle>Coverages for {selectedItem.name}</CardTitle>
            {hierarchicalCoverages.length ? (
              <ItemList>
                {hierarchicalCoverages.map(cov => (
                  <div key={cov.id}>
                    <Item onClick={() => toggleCoverageExpansion(cov.id)}>
                      {cov.name}
                      {cov.subcoverages.length > 0 && (
                        <span style={{ marginLeft: '8px' }}>
                          {expandedCoverages[cov.id] ? '▼' : '▶'}
                        </span>
                      )}
                    </Item>
                    {expandedCoverages[cov.id] && cov.subcoverages.length > 0 && (
                      <SubItemList>
                        {cov.subcoverages.map(sub => (
                          <SubItem key={sub.id}>{sub.name}</SubItem>
                        ))}
                      </SubItemList>
                    )}
                  </div>
                ))}
              </ItemList>
            ) : <NoItemsText>No coverages found.</NoItemsText>}
          </RelatedCard>
          <RelatedCard>
            <CardTitle>Forms for {selectedItem.name}</CardTitle>
            {relatedForms.length ? (
              <ItemList>
                {relatedForms.map(form => <Item key={form.id}>{form.formName || form.formNumber}</Item>)}
              </ItemList>
            ) : <NoItemsText>No forms found.</NoItemsText>}
          </RelatedCard>
        </ResultSection>
      );
    } else if (searchType === 'form') {
      const linkedProduct = products.find(prod => prod.id === selectedItem.productId);
      const linkedCoverages = coverages.filter(cov => 
        selectedItem.coverageIds && selectedItem.coverageIds.includes(cov.id)
      );
      return (
        <ResultSection>
          <RelatedCard>
            <CardTitle>Linked Product</CardTitle>
            {linkedProduct ? <Item>{linkedProduct.name}</Item> : <NoItemsText>No linked product.</NoItemsText>}
          </RelatedCard>
          <RelatedCard>
            <CardTitle>Linked Coverages</CardTitle>
            {linkedCoverages.length ? (
              <ItemList>
                {linkedCoverages.map(cov => <Item key={cov.id}>{cov.name}</Item>)}
              </ItemList>
            ) : <NoItemsText>No linked coverages.</NoItemsText>}
          </RelatedCard>
        </ResultSection>
      );
    }
  };

  if (loading) {
    return (
      <Page>
        <Container>
          <Spinner />
        </Container>
      </Page>
    );
  }

  return (
    <Page>
      <Container>
        <PageHeader>
          <Title>Product Explorer</Title>
          <Button variant="ghost" as={RouterLink} to="/">Return Home</Button>
        </PageHeader>
        <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
          <TextInput
            as="select"
            value={searchType}
            onChange={e => setSearchType(e.target.value)}
            style={{ maxWidth:180 }}
          >
            <option value="coverage">Coverage</option>
            <option value="product">Product</option>
            <option value="form">Form</option>
          </TextInput>

          <div style={{ position:'relative', flex:1, minWidth:240 }}>
            <TextInput
              placeholder={`Search for ${searchType}s…`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {suggestions.length > 0 && (
              <SuggestionList>
                {suggestions.map(item => (
                  <SuggestionItem
                    key={item.id}
                    onClick={() => handleSelect(item)}
                  >
                    {searchType === 'coverage' ? item.name :
                     searchType === 'product' ? item.name :
                     item.formName || item.formNumber}
                  </SuggestionItem>
                ))}
              </SuggestionList>
            )}
          </div>
        </div>
        {selectedItem && (
          <ResultSection>
            <SelectedItemCard>
              <CardTitle>Selected {searchType.charAt(0).toUpperCase() + searchType.slice(1)}</CardTitle>
              <Item>
                {searchType === 'coverage' ? selectedItem.name :
                 searchType === 'product' ? selectedItem.name :
                 selectedItem.formName || selectedItem.formNumber}
              </Item>
            </SelectedItemCard>
            {renderRelatedItems()}
          </ResultSection>
        )}
      </Container>
    </Page>
  );
}