import { useState, useEffect } from 'react';
import { collection, collectionGroup, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import MainNavigation from './ui/Navigation';
import EnhancedHeader from './ui/EnhancedHeader';
import { PageContainer, PageContent } from './ui/PageContainer';
import { Breadcrumb } from './ui/Breadcrumb';

import styled, { keyframes } from 'styled-components';
import { MapIcon } from '@heroicons/react/24/solid';

/* ------------------- Styled Components ------------------- */

/* ------------------- tiny spinner ------------------- */
const spin = keyframes`0%{transform:rotate(0)}100%{transform:rotate(360deg)}`;
const Spinner = styled.div`
  margin:120px auto;width:40px;height:40px;border-radius:50%;
  border:4px solid #e5e7eb;border-top-color:#6366f1;animation:${spin}1s linear infinite;
`;
/* ---------------------------------------------------- */

/* layout columns */
const Grid = styled.div`
  display:grid;
  grid-template-columns:1fr 1fr 1fr;
  gap:24px;
  @media(max-width:900px){ grid-template-columns:1fr; }
`;
const Column = styled.div`
  background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.05);
  padding:16px;min-height:300px;overflow-y:auto;
`;
const ColumnTitle = styled.h2`
  font-size:18px;font-weight:600;margin-bottom:12px;
  background:linear-gradient(90deg,#0074E1,#60419F);
  -webkit-background-clip:text;color:transparent;
`;
const Item = styled.div`
  padding:8px 12px;margin-bottom:6px;border-radius:6px;cursor:pointer;
  background:${p=>p.selected?'#A100FF':'#F9FAFB'};
  color:${p=>p.selected?'#fff':'#1F2937'};
  transition: all 0.2s ease;
  border: 1px solid ${p=>p.selected?'#A100FF':'transparent'};
  &:hover{
    background:${p=>p.selected?'#8800d1':'#E5E7EB'};
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
`;
const Empty = styled.p`
  font-size:14px;color:#6B7280;font-style:italic;
`;

const SearchInfo = styled.div`
  background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%);
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #1e40af;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ClearSearchButton = styled.button`
  background: none;
  border: none;
  color: #6366f1;
  cursor: pointer;
  font-size: 12px;
  text-decoration: underline;

  &:hover {
    color: #4f46e5;
  }
`;



export default function ProductExplorer() {
  const [loading,setLoading]      = useState(true);
  const [products,setProducts]    = useState([]);
  const [coverages,setCoverages]  = useState([]);
  const [selectedProduct,setSelProduct]   = useState(null);
  const [selectedCoverage,setSelCoverage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // location variable removed - unused

  /* fetch everything once */
  useEffect(()=>{
    (async()=>{
      try {
        setLoading(true);
        const proSnap = await getDocs(collection(db,'products'));
        const covSnap = await getDocs(collectionGroup(db,'coverages'));
        setProducts(proSnap.docs.map(d=>({id:d.id,...d.data()})));
        setCoverages(covSnap.docs.map(d=>({
          id:d.id,...d.data(),productId:d.ref.parent.parent.id
        })));
      } catch (error) {
        console.error('Error fetching products and coverages:', error);
        // Continue with empty data if fetch fails
        setProducts([]);
        setCoverages([]);
      } finally {
        setLoading(false);
      }
    })();
  },[]);

  /* Enhanced search filtering with intelligent cross-filtering */
  const searchLower = searchQuery.toLowerCase();

  // Get all coverages (top-level and sub-coverages)
  const allTopCoverages = coverages.filter(c => !c.parentCoverageId);
  const allSubCoverages = coverages.filter(c => c.parentCoverageId);

  // Find matches across all entities
  const matchingProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchLower)
  );

  const matchingTopCoverages = allTopCoverages.filter(c =>
    c.name.toLowerCase().includes(searchLower)
  );

  const matchingSubCoverages = allSubCoverages.filter(c =>
    c.name.toLowerCase().includes(searchLower)
  );

  // Get related entities based on matches
  const getRelatedProductIds = () => {
    const productIds = new Set();

    // Add directly matching products
    matchingProducts.forEach(p => productIds.add(p.id));

    // Add products that have matching coverages
    matchingTopCoverages.forEach(c => productIds.add(c.productId));
    matchingSubCoverages.forEach(c => productIds.add(c.productId));

    return Array.from(productIds);
  };

  const getRelatedCoverageIds = () => {
    const coverageIds = new Set();

    // Add directly matching top coverages
    matchingTopCoverages.forEach(c => coverageIds.add(c.id));

    // Add parent coverages of matching sub-coverages
    matchingSubCoverages.forEach(sc => {
      if (sc.parentCoverageId) {
        coverageIds.add(sc.parentCoverageId);
      }
    });

    return Array.from(coverageIds);
  };

  // Apply filtering based on search query
  const filteredProducts = searchQuery === ''
    ? products
    : products.filter(p => getRelatedProductIds().includes(p.id));

  // Show coverages based on selection and search
  const getDisplayCoverages = () => {
    if (searchQuery === '') {
      // No search - show coverages for selected product only
      return selectedProduct
        ? coverages.filter(c => c.productId === selectedProduct.id && !c.parentCoverageId)
        : [];
    } else {
      // With search - show all related coverages
      const relatedCoverageIds = getRelatedCoverageIds();
      const relatedProductIds = getRelatedProductIds();

      return allTopCoverages.filter(c =>
        relatedCoverageIds.includes(c.id) ||
        (selectedProduct && c.productId === selectedProduct.id) ||
        relatedProductIds.includes(c.productId)
      );
    }
  };

  const topCoverages = getDisplayCoverages();

  // Show sub-coverages based on selection and search
  const getDisplaySubCoverages = () => {
    if (searchQuery === '') {
      // No search - show sub-coverages for selected coverage only
      return selectedCoverage
        ? coverages.filter(c => c.parentCoverageId === selectedCoverage.id)
        : [];
    } else {
      // With search - show all matching sub-coverages and related ones
      const result = [...matchingSubCoverages];

      // Add sub-coverages of selected coverage if any
      if (selectedCoverage) {
        const selectedSubCoverages = coverages.filter(c => c.parentCoverageId === selectedCoverage.id);
        selectedSubCoverages.forEach(sc => {
          if (!result.find(r => r.id === sc.id)) {
            result.push(sc);
          }
        });
      }

      return result;
    }
  };

  const subCoverages = getDisplaySubCoverages();

  if (loading) return(
    <PageContainer withOverlay={true}>
      <MainNavigation />
      <PageContent><Spinner/></PageContent>
    </PageContainer>
  );

  return (
    <PageContainer withOverlay={true}>
      <MainNavigation />

      <PageContent>
        <Breadcrumb
          items={[
            { label: 'Home', path: '/' },
            { label: 'Products', path: '/products' },
            { label: 'Explorer' }
          ]}
        />

        <EnhancedHeader
          title="Product Explorer"
          subtitle={searchQuery
            ? `Found ${filteredProducts.length} products, ${topCoverages.length} coverages, ${subCoverages.length} sub-coverages matching "${searchQuery}"`
            : `Navigate through ${products.length} products, ${allTopCoverages.length} coverages, ${allSubCoverages.length} sub-coverages`
          }
          icon={MapIcon}
          searchProps={{
            placeholder: "Search products, coverages, or sub-coverages...",
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value)
          }}
        />

        {searchQuery && (
          <SearchInfo>
            <span>
              🔍 Showing all related items for "{searchQuery}" - click any item to auto-select its dependencies
            </span>
            <ClearSearchButton onClick={() => setSearchQuery('')}>
              Clear search
            </ClearSearchButton>
          </SearchInfo>
        )}

        <Grid>
          {/* column 1 – products */}
          <Column>
            <ColumnTitle>Products</ColumnTitle>
            {filteredProducts.length?filteredProducts.map(p=>(
              <Item key={p.id}
                    selected={selectedProduct?.id===p.id}
                    onClick={()=>{setSelProduct(p);setSelCoverage(null);}}>
                {p.name}
              </Item>
            )):<Empty>No products found</Empty>}
          </Column>

          {/* column 2 – coverages */}
          <Column>
            <ColumnTitle>Coverages</ColumnTitle>
            {searchQuery === '' ? (
              // No search - require product selection
              selectedProduct ? (
                topCoverages.length ? topCoverages.map(c => (
                  <Item key={c.id}
                        selected={selectedCoverage?.id === c.id}
                        onClick={() => setSelCoverage(c)}>
                    {c.name}
                    {searchQuery && c.productId !== selectedProduct?.id && (
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        from {products.find(p => p.id === c.productId)?.name}
                      </div>
                    )}
                  </Item>
                )) : <Empty>No coverages</Empty>
              ) : <Empty>Select a product</Empty>
            ) : (
              // With search - show all matching coverages
              topCoverages.length ? topCoverages.map(c => (
                <Item key={c.id}
                      selected={selectedCoverage?.id === c.id}
                      onClick={() => {
                        setSelCoverage(c);
                        // Auto-select the product if not already selected
                        if (!selectedProduct || selectedProduct.id !== c.productId) {
                          const product = products.find(p => p.id === c.productId);
                          if (product) setSelProduct(product);
                        }
                      }}>
                  {c.name}
                  {c.productId !== selectedProduct?.id && (
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                      from {products.find(p => p.id === c.productId)?.name}
                    </div>
                  )}
                </Item>
              )) : <Empty>No matching coverages</Empty>
            )}
          </Column>

          {/* column 3 – sub-coverages */}
          <Column>
            <ColumnTitle>Sub‑Coverages</ColumnTitle>
            {searchQuery === '' ? (
              // No search - require coverage selection
              selectedCoverage ? (
                subCoverages.length ? subCoverages.map(sc => (
                  <Item key={sc.id}>{sc.name}</Item>
                )) : <Empty>No sub coverages</Empty>
              ) : <Empty>Select a coverage</Empty>
            ) : (
              // With search - show all matching sub-coverages
              subCoverages.length ? subCoverages.map(sc => {
                const parentCoverage = coverages.find(c => c.id === sc.parentCoverageId);
                const product = products.find(p => p.id === sc.productId);
                return (
                  <Item key={sc.id}
                        onClick={() => {
                          // Auto-select parent coverage and product
                          if (parentCoverage && (!selectedCoverage || selectedCoverage.id !== parentCoverage.id)) {
                            setSelCoverage(parentCoverage);
                          }
                          if (product && (!selectedProduct || selectedProduct.id !== product.id)) {
                            setSelProduct(product);
                          }
                        }}>
                    {sc.name}
                    {(sc.parentCoverageId !== selectedCoverage?.id || sc.productId !== selectedProduct?.id) && (
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        under {parentCoverage?.name} • {product?.name}
                      </div>
                    )}
                  </Item>
                );
              }) : <Empty>No matching sub-coverages</Empty>
            )}
          </Column>
        </Grid>
      </PageContent>
    </PageContainer>
  );
}