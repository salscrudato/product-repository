import { useState, useEffect } from 'react';
import { collection, collectionGroup, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import MainNavigation from './ui/Navigation';
import EnhancedHeader from './ui/EnhancedHeader';

import styled, { keyframes } from 'styled-components';
import { MapIcon } from '@heroicons/react/24/solid';

/* ------------------- Page Layout Components ------------------- */
// Page - Clean gradient background with overlay
const Page = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
  display: flex;
  flex-direction: column;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 300px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%);
    opacity: 0.08;
    z-index: 0;
  }
`;



const MainContent = styled.main`
  flex: 1;
  padding: 32px 32px 80px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    padding: 24px 20px 60px;
  }
`;

// Unused styled components removed to fix ESLint warnings

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
  &:hover{ background:${p=>p.selected?'#8800d1':'#E5E7EB'}; }
`;
const Empty = styled.p`
  font-size:14px;color:#6B7280;font-style:italic;
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
      setLoading(true);
      const proSnap = await getDocs(collection(db,'products'));
      const covSnap = await getDocs(collectionGroup(db,'coverages'));
      setProducts(proSnap.docs.map(d=>({id:d.id,...d.data()})));
      setCoverages(covSnap.docs.map(d=>({
        id:d.id,...d.data(),productId:d.ref.parent.parent.id
      })));
      setLoading(false);
    })();
  },[]);

  /* derive lists with search filtering */
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const productCoverages = coverages.filter(c=>c.productId===selectedProduct?.id);
  const topCoverages     = productCoverages.filter(c=>!c.parentCoverageId).filter(c =>
    searchQuery === '' || c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const subCoverages     = productCoverages.filter(c=>c.parentCoverageId===selectedCoverage?.id).filter(c =>
    searchQuery === '' || c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return(
    <Page>
      <MainNavigation />
      <MainContent><Spinner/></MainContent>
    </Page>
  );

  return (
    <Page>
      <MainNavigation />

      <MainContent>
        <EnhancedHeader
          title="Explorer"
          subtitle={`Navigate through ${filteredProducts.length} products and ${topCoverages.length} coverages`}
          icon={MapIcon}
          searchProps={{
            placeholder: "Search products, coverages, or sub-coverages...",
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value)
          }}
        />

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
            {selectedProduct? (
              topCoverages.length?topCoverages.map(c=>(
                <Item key={c.id}
                      selected={selectedCoverage?.id===c.id}
                      onClick={()=>setSelCoverage(c)}>
                  {c.name}
                </Item>
              )):<Empty>No coverages</Empty>
            ):<Empty>Select a product</Empty>}
          </Column>

          {/* column 3 – sub-coverages */}
          <Column>
            <ColumnTitle>Sub‑Coverages</ColumnTitle>
            {selectedCoverage? (
              subCoverages.length?subCoverages.map(sc=>(
                <Item key={sc.id}>{sc.name}</Item>
              )):<Empty>No sub coverages</Empty>
            ):<Empty>Select a coverage</Empty>}
          </Column>
        </Grid>
      </MainContent>
    </Page>
  );
}