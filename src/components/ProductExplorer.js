import { useState, useEffect } from 'react';
import { collection, collectionGroup, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

import { Button } from '../components/ui/Button';
import styled, { keyframes } from 'styled-components';
import { Link, useLocation } from 'react-router-dom';

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

const Navigation = styled.nav`
  display: flex;
  justify-content: center;
  padding: 24px 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  position: relative;
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const NavList = styled.ul`
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 48px;

  @media (max-width: 768px) {
    gap: 24px;
    flex-wrap: wrap;
    justify-content: center;
  }
`;

const NavItem = styled.li``;

const NavLink = styled(Link)`
  text-decoration: none;
  color: #64748b;
  font-weight: 600;
  font-size: 15px;
  padding: 12px 20px;
  border-radius: 12px;
  transition: all 0.3s ease;
  position: relative;
  letter-spacing: -0.01em;

  &:hover {
    color: #1e293b;
    background: rgba(99, 102, 241, 0.08);
    transform: translateY(-1px);
  }

  &.active {
    color: #6366f1;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);

    &::after {
      content: '';
      position: absolute;
      bottom: -24px;
      left: 50%;
      transform: translateX(-50%);
      width: 4px;
      height: 4px;
      background: #6366f1;
      border-radius: 50%;
    }
  }

  @media (max-width: 768px) {
    font-size: 14px;
    padding: 10px 16px;
  }
`;

const MainContent = styled.main`
  flex: 1;
  padding: 60px 32px 80px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    padding: 40px 20px 60px;
  }
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b 0%, #475569 50%, #64748b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 32px 0;
  text-align: center;
  letter-spacing: -0.02em;
  line-height: 1.1;

  @media (max-width: 768px) {
    font-size: 1.5rem;
    margin-bottom: 24px;
  }
`;

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

  const location = useLocation();

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

  if (loading) return(
    <Page>
      <Navigation>
        <NavList>
          <NavItem>
            <NavLink to="/" className={location.pathname === '/' ? 'active' : ''}>
              Home
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink to="/products" className={location.pathname === '/products' ? 'active' : ''}>
              Products
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink to="/product-builder" className={location.pathname.startsWith('/product-builder') ? 'active' : ''}>
              Builder
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink to="/product-explorer" className={location.pathname.startsWith('/product-explorer') ? 'active' : ''}>
              Explorer
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink to="/data-dictionary" className={location.pathname === '/data-dictionary' ? 'active' : ''}>
              Data Dictionary
            </NavLink>
          </NavItem>
        </NavList>
      </Navigation>
      <MainContent><Spinner/></MainContent>
    </Page>
  );

  return (
    <Page>
      <Navigation>
        <NavList>
          <NavItem>
            <NavLink to="/" className={location.pathname === '/' ? 'active' : ''}>
              Home
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink to="/products" className={location.pathname === '/products' ? 'active' : ''}>
              Products
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink to="/product-builder" className={location.pathname.startsWith('/product-builder') ? 'active' : ''}>
              Builder
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink to="/product-explorer" className={location.pathname.startsWith('/product-explorer') ? 'active' : ''}>
              Explorer
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink to="/data-dictionary" className={location.pathname === '/data-dictionary' ? 'active' : ''}>
              Data Dictionary
            </NavLink>
          </NavItem>
        </NavList>
      </Navigation>

      <MainContent>
        <PageTitle>Product Explorer</PageTitle>

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
      </MainContent>
    </Page>
  );
}