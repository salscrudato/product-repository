import { useState, useEffect } from 'react';
import { collection, collectionGroup, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

import { Page, Container, PageHeader, Title } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import styled, { keyframes } from 'styled-components';
import { Link as RouterLink } from 'react-router-dom';

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

  /* derive lists */
  const productCoverages = coverages.filter(c=>c.productId===selectedProduct?.id);
  const topCoverages     = productCoverages.filter(c=>!c.parentCoverageId);
  const subCoverages     = productCoverages.filter(c=>c.parentCoverageId===selectedCoverage?.id);

  if (loading) return(<Page><Container><Spinner/></Container></Page>);

  return (
    <Page>
      <Container>
        <PageHeader>
          <Title>Product Explorer</Title>
          <Button variant="ghost" as={RouterLink} to="/">Return Home</Button>
        </PageHeader>

        <Grid>
          {/* column 1 – products */}
          <Column>
            <ColumnTitle>Products</ColumnTitle>
            {products.length?products.map(p=>(
              <Item key={p.id}
                    selected={selectedProduct?.id===p.id}
                    onClick={()=>{setSelProduct(p);setSelCoverage(null);}}>
                {p.name}
              </Item>
            )):<Empty>No products</Empty>}
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
      </Container>
    </Page>
  );
}