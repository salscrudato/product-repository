import React, { useState, useEffect } from 'react';
import { collection, collectionGroup, getDocs, getDoc, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import styled, { keyframes } from 'styled-components';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';
import MainNavigation from '../components/ui/Navigation';
import {
  Table,
  THead,
  Tr,
  Th,
  Td,
  Overlay,
  Modal,
  ModalHeader,
  ModalTitle,
  CloseBtn
} from '../components/ui/Table';

// Loading spinner
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

/* -------- navigation tabs reused from ProductHub -------- */
const Tabs = styled.div`
  display: flex;
  gap: 24px;
  align-items: center;
`;

const TabLink = styled(Link)`
  padding: 8px 12px;
  font-weight: 600;
  text-decoration: none;
  border-bottom: 3px solid transparent;
  color: ${({ theme }) => theme.colours.text};

  &.active {
    color: ${({ theme }) => theme.colours.primaryDark};
    border-color: ${({ theme }) => theme.colours.primary};
  }
`;

const TabButton = styled(Button).attrs({ variant: 'ghost' })`
  padding: 8px 12px;
  font-weight: 600;
  border-bottom: 3px solid transparent;

  &:hover {
    border-color: ${({ theme }) => theme.colours.primary};
  }
`;

/* ---------- Modern Styled Components ---------- */

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

// Main Content - Modern layout
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

// Page Title - Modern typography matching Home and ProductHub
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

const ProductBuilder = () => {
  const [coverages, setCoverages] = useState([]);
  const [forms, setForms] = useState([]);
  const [products, setProducts] = useState({});
  const [coverageSearchQuery, setCoverageSearchQuery] = useState('');
  const [selectedCoverages, setSelectedCoverages] = useState({});
  const [newProductName, setNewProductName] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [productCode, setProductCode] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [file, setFile] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cloneLoading, setCloneLoading] = useState(false);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [cloneTargetId, setCloneTargetId] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch all coverages, forms, and products on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch products
        const productsSnap = await getDocs(collection(db, 'products'));
        const productMap = {};
        productsSnap.docs.forEach(doc => {
          productMap[doc.id] = doc.data().name;
        });
        setProducts(productMap);

        // Fetch coverages across all products
        const coveragesSnap = await getDocs(collectionGroup(db, 'coverages'));
        const coverageList = coveragesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          productId: doc.ref.parent.parent.id,
        }));
        setCoverages(coverageList);

        // Fetch all forms
        const formsSnap = await getDocs(collection(db, 'forms'));
        const formList = formsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setForms(formList);
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handle coverage selection
  const handleCoverageSelect = (coverage) => {
    const associatedForms = forms
      .filter(f => f.coverageIds?.includes(coverage.id))
      .map(f => f.id);
    if (selectedCoverages[coverage.id]) {
      // Deselect coverage
      const newSelected = { ...selectedCoverages };
      delete newSelected[coverage.id];
      setSelectedCoverages(newSelected);
    } else if (associatedForms.length <= 1) {
      // Auto-select coverage with its form(s)
      setSelectedCoverages(prev => ({
        ...prev,
        [coverage.id]: associatedForms
      }));
    } else {
      // Open modal for multiple forms
      setModalItem(coverage);
      setModalOpen(true);
    }
  };


  // Handle modal submission for multiple associations
  const handleModalSubmit = (coverageId, formIds) => {
    setSelectedCoverages(prev => ({ ...prev, [coverageId]: formIds }));
    setModalOpen(false);
  };

  // Create the new product
  const handleCreateProduct = async () => {
    // Build map of formId -> [coverageIds]
    const selectedFormsMap = Object.entries(selectedCoverages).reduce((acc, [covId, formIds]) => {
      formIds.forEach(fId => {
        if (!acc[fId]) acc[fId] = [];
        acc[fId].push(covId);
      });
      return acc;
    }, {});
    if (!newProductName || !formNumber || !effectiveDate || !file || Object.keys(selectedCoverages).length === 0 || Object.keys(selectedFormsMap).length === 0) {
      alert('Please fill in all required fields and select at least one coverage and one form.');
      return;
    }
    try {
      // Upload file to Firebase Storage
      const storageRef = ref(storage, `products/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      // Create new product
      const productRef = await addDoc(collection(db, 'products'), {
        name: newProductName,
        formNumber,
        productCode,
        formDownloadUrl: downloadUrl,
        effectiveDate,
      });
      const newProductId = productRef.id;

      // Map old IDs to new IDs
      const newCoverageIds = {};
      const newFormIds = {};

      // Create new coverage documents
      for (const coverageId in selectedCoverages) {
        const coverage = coverages.find(c => c.id === coverageId);
        const newCoverageRef = await addDoc(collection(db, `products/${newProductId}/coverages`), {
          name: coverage.name,
          coverageCode: coverage.coverageCode || '',
          formIds: [],
          limits: coverage.limits || [],
          deductibles: coverage.deductibles || [],
          states: coverage.states || [],
          category: coverage.category || 'Base Coverage',
          parentCoverageId: coverage.parentCoverageId || null,
        });
        newCoverageIds[coverageId] = newCoverageRef.id;
      }

      // Create new form documents
      for (const formId in selectedFormsMap) {
        const form = forms.find(f => f.id === formId);
        const newCoverageIdsForForm = selectedFormsMap[formId].map(cId => newCoverageIds[cId]).filter(id => id);
        const newFormRef = await addDoc(collection(db, 'forms'), {
          formName: form.formName || null,
          formNumber: form.formNumber,
          effectiveDate: form.effectiveDate || '',
          type: form.type || 'ISO',
          category: form.category || 'Base Coverage Form',
          productId: newProductId,
          coverageIds: newCoverageIdsForForm,
          downloadUrl: form.downloadUrl || '',
          filePath: form.filePath || null,
        });
        newFormIds[formId] = newFormRef.id;
      }

      // Update coverage formIds
      for (const coverageId in selectedCoverages) {
        const newCoverageId = newCoverageIds[coverageId];
        const newFormIdsForCoverage = selectedCoverages[coverageId]
          .map(fId => newFormIds[fId])
          .filter(id => id);
        await updateDoc(doc(db, `products/${newProductId}/coverages`, newCoverageId), {
          formIds: newFormIdsForCoverage,
        });

        // Update formCoverages collection for bidirectional linking
        for (const formId of newFormIdsForCoverage) {
          await addDoc(collection(db, 'formCoverages'), {
            formId: formId,
            coverageId: newCoverageId,
            productId: newProductId,
          });
        }
      }

      // Update forms with new coverage IDs
      for (const formId in selectedFormsMap) {
        const newFormId = newFormIds[formId];
        const newCoverageIdsForForm = selectedFormsMap[formId]
          .map(cId => newCoverageIds[cId])
          .filter(id => id);
        await updateDoc(doc(db, 'forms', newFormId), {
          coverageIds: newCoverageIdsForForm,
        });
      }

      alert('Product created successfully! Returning to ProductHub.');
      navigate('/');
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product. Please try again.');
    }
  };

  // Filter coverages based on coverageSearchQuery
  const filteredCoverages = coverages.filter(c =>
    c.name.toLowerCase().includes(coverageSearchQuery.toLowerCase()) ||
    products[c.productId]?.toLowerCase().includes(coverageSearchQuery.toLowerCase())
  );


  // Helper to get form names for a coverage
  // (no longer used)

  // Helper to get coverage names for a form
  const getAssociatedCoverages = (form) => {
    const coverageIds = form.coverageIds || [];
    return coverageIds.map(id => coverages.find(c => c.id === id)?.name || 'Unknown Coverage').join(', ');
  };

  if (cloneLoading) {
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
          <Spinner />
          <p style={{textAlign:'center',marginTop:12}}>Cloning product…</p>
        </MainContent>
      </Page>
    );
  }

  if (loading) {
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
          <Spinner />
        </MainContent>
      </Page>
    );
  }

  // --- CLONE PRODUCT HELPER ---
  const cloneProduct = async (sourceId) => {
    if (!window.confirm('Clone this product and all of its related data?')) return;
    try {
      setCloneLoading(true);

      // 1️⃣ fetch source product
      const srcProdSnap = await getDoc(doc(db, 'products', sourceId));
      if (!srcProdSnap.exists()) throw new Error('Source product not found');
      const srcData = srcProdSnap.data();

      // 2️⃣ create new product (append " – Copy" to name)
      const newProdRef = await addDoc(collection(db, 'products'), {
        ...srcData,
        name: `${srcData.name} – Copy`,
      });
      const newProdId = newProdRef.id;

      // --- helper maps for ID translation ---
      const coverageIdMap = {};
      const formIdMap = {};

      // 3️⃣ clone coverages
      const covSnap = await getDocs(collection(db, `products/${sourceId}/coverages`));
      for (const c of covSnap.docs) {
        const newCovRef = await addDoc(collection(db, `products/${newProdId}/coverages`), {
          ...c.data(),
          formIds: [],                // temp ‑ will patch later
          parentCoverageId: null,     // parent links rebuilt later
        });
        coverageIdMap[c.id] = newCovRef.id;
      }
      // rebuild parentCoverage relationships
      for (const c of covSnap.docs) {
        const parentId = c.data().parentCoverageId;
        if (parentId && coverageIdMap[parentId]) {
          await updateDoc(
            doc(db, `products/${newProdId}/coverages`, coverageIdMap[c.id]),
            { parentCoverageId: coverageIdMap[parentId] }
          );
        }
      }

      // 4️⃣ clone forms
      const formSnap = await getDocs(query(collection(db, 'forms'), where('productId','==',sourceId)));
      for (const f of formSnap.docs) {
        const newCovIds = (f.data().coverageIds || []).map(cid => coverageIdMap[cid]).filter(Boolean);
        const newFormRef = await addDoc(collection(db, 'forms'), {
          ...f.data(),
          productId: newProdId,
          coverageIds: newCovIds,
        });
        formIdMap[f.id] = newFormRef.id;

        // recreate formCoverages docs
        for (const newCovId of newCovIds) {
          await addDoc(collection(db, 'formCoverages'), {
            formId: newFormRef.id,
            coverageId: newCovId,
            productId: newProdId,
          });
        }
      }

      // 5️⃣ patch each cloned coverage.formIds
      for (const [oldCovId,newCovId] of Object.entries(coverageIdMap)) {
        const srcCov = covSnap.docs.find(d=>d.id===oldCovId).data();
        const newFormIds = (srcCov.formIds||[]).map(fid=>formIdMap[fid]).filter(Boolean);
        await updateDoc(doc(db, `products/${newProdId}/coverages`, newCovId), { formIds: newFormIds });
      }

      alert('Product cloned! Redirecting to ProductHub.');
      navigate('/');
    } catch (err) {
      console.error(err);
      alert('Clone failed: '+err.message);
    } finally {
      setCloneLoading(false);
    }
  };

  return (
    <Page>
      <Navigation>
        <NavList>
          <NavItem>
            <NavLink
              to="/"
              className={location.pathname === '/' ? 'active' : ''}
            >
              Home
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              to="/products"
              className={location.pathname === '/products' ? 'active' : ''}
            >
              Products
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              to="/product-builder"
              className={location.pathname.startsWith('/product-builder') ? 'active' : ''}
            >
              Builder
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              to="/product-explorer"
              className={location.pathname.startsWith('/product-explorer') ? 'active' : ''}
            >
              Explorer
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              to="/data-dictionary"
              className={location.pathname === '/data-dictionary' ? 'active' : ''}
            >
              Data Dictionary
            </NavLink>
          </NavItem>
        </NavList>
      </Navigation>

      <MainContent>
        <PageTitle>Product Builder</PageTitle>

        <div style={{ display:'flex', gap:32, marginBottom:32, flexWrap:'wrap' }}>
          {/* Coverage Section (flex:1) */}
          <div style={{ flex:1 }}>
            <h2 style={{
              fontSize: 24,
              fontWeight: 550,
              marginBottom: 16,
              background: 'linear-gradient(90deg, #0074E1, #60419F)',
              WebkitBackgroundClip: 'text',
              color: 'transparent'
            }}>Coverages</h2>
            <TextInput
              placeholder="Search coverages by name..."
              value={coverageSearchQuery}
              onChange={e => setCoverageSearchQuery(e.target.value)}
              style={{ marginBottom: 16 }}
            />
            <div style={{ overflowX:'auto', marginBottom:24 }}>
              <Table>
                <THead>
                  <Tr>
                    <Th>Select</Th>
                    <Th>Name</Th>
                    <Th>Product Name</Th>
                    <Th>Associated Forms</Th>
                  </Tr>
                </THead>
                <tbody>
                  {filteredCoverages.map(coverage => (
                    <Tr key={coverage.id}>
                      <Td>
                        <input
                          type="checkbox"
                          checked={!!selectedCoverages[coverage.id]}
                          onChange={() => handleCoverageSelect(coverage)}
                          style={{ marginRight: 8 }}
                        />
                        {!!selectedCoverages[coverage.id] && (
                      <Button
                        variant="ghost"
                        style={{ padding: 0, marginLeft: 4 }}
                        onClick={e => {
                          e.stopPropagation();
                          handleCoverageSelect(coverage);
                        }}
                        title="Deselect"
                      >
                        <XMarkIcon style={{ width: 18, height: 18 }} />
                      </Button>
                        )}
                      </Td>
                      <Td>{coverage.name}</Td>
                      <Td>{products[coverage.productId] || 'Unknown Product'}</Td>
                      <Td align="center">
                        <Button variant="ghost" onClick={() => {
                          setModalItem(coverage);
                          setModalOpen(true);
                        }}>
                          Forms ({selectedCoverages[coverage.id]?.length || 0})
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
          {/* New Product Details (right column) */}
          <div style={{ flex:1 }}>
            <h2 style={{
              fontSize: 24,
              fontWeight: 550,
              marginBottom: 16,
              background: 'linear-gradient(90deg, #0074E1, #60419F)',
              WebkitBackgroundClip: 'text',
              color: 'transparent'
            }}>New Product Details</h2>
            <TextInput
              placeholder="Enter product name"
              value={newProductName}
              onChange={e => setNewProductName(e.target.value)}
              style={{ marginBottom: 16 }}
            />
            <TextInput
              placeholder="Form Number"
              value={formNumber}
              onChange={e => setFormNumber(e.target.value)}
              style={{ marginBottom: 16 }}
            />
            <TextInput
              placeholder="Product Code"
              value={productCode}
              onChange={e => setProductCode(e.target.value)}
              style={{ marginBottom: 16 }}
            />
            <TextInput
              placeholder="Effective Date (MM/YYYY)"
              value={effectiveDate}
              onChange={e => setEffectiveDate(e.target.value)}
              style={{ marginBottom: 16 }}
            />
            <div style={{ marginBottom: 16 }}>
              <input
                type="file"
                onChange={e => setFile(e.target.files[0])}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ marginTop: 16, marginBottom: 16, width: '100%' }}>
              <Table>
                <THead>
                  <Tr>
                    <Th>Coverage</Th>
                    <Th>Forms</Th>
                  </Tr>
                </THead>
                <tbody>
                  {Object.keys(selectedCoverages).map(coverageId => {
                    const coverage = coverages.find(c => c.id === coverageId);
                    const formNames = selectedCoverages[coverageId]
                      .map(formId => forms.find(f => f.id === formId)?.formName || 'Unknown Form')
                      .join(', ');
                    return (
                      <Tr key={coverageId}>
                        <Td>{coverage?.name}</Td>
                        <Td>{formNames}</Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
            <Button
              onClick={handleCreateProduct}
              disabled={
                !newProductName ||
                !formNumber ||
                !effectiveDate ||
                !file ||
                Object.keys(selectedCoverages).length === 0
              }
            >
              Create Product
            </Button>
          </div>
        </div>


        {/* Modal for Multiple Associations */}
        {modalOpen && (
          <Overlay>
            <Modal>
              <ModalHeader>
                <ModalTitle>
                  Select Forms for {modalItem.name}
                </ModalTitle>
                <CloseBtn onClick={() => setModalOpen(false)}>
                  <XMarkIcon style={{ width: 24, height: 24 }} />
                </CloseBtn>
              </ModalHeader>
              <div style={{ marginTop: 16 }}>
                {forms
                  .filter(f => f.coverageIds?.includes(modalItem.id))
                  .map(form => {
                    const checked = selectedCoverages[modalItem.id]?.includes(form.id) || false;
                    return (
                      <div key={form.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            const currentForms = selectedCoverages[modalItem.id] || [];
                            if (e.target.checked) {
                              handleModalSubmit(modalItem.id, [...currentForms, form.id]);
                            } else {
                              handleModalSubmit(modalItem.id, currentForms.filter(id => id !== form.id));
                            }
                          }}
                          style={{ marginRight: 8 }}
                        />
                        {form.formName || form.formNumber}
                      </div>
                    );
                  })}
              </div>
            </Modal>
          </Overlay>
        )}
        {/* Clone Product Modal */}
        {cloneModalOpen && (
          <Overlay onClick={() => setCloneModalOpen(false)}>
            <Modal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Select Product to Clone</ModalTitle>
                <CloseBtn onClick={() => setCloneModalOpen(false)}>
                  <XMarkIcon width={20} height={20} />
                </CloseBtn>
              </ModalHeader>

              <div style={{ maxHeight: 320, overflowY: 'auto', marginTop: 12 }}>
                {Object.entries(products)
                  .sort((a, b) => a[1].localeCompare(b[1]))
                  .map(([pid, name]) => (
                    <label key={pid} style={{ display: 'block', padding: 6 }}>
                      <input
                        type="radio"
                        name="cloneTarget"
                        value={pid}
                        checked={cloneTargetId === pid}
                        onChange={() => setCloneTargetId(pid)}
                        style={{ marginRight: 8 }}
                      />
                      {name}
                    </label>
                  ))}
              </div>

              <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                <Button
                  disabled={!cloneTargetId}
                  onClick={async () => {
                    await cloneProduct(cloneTargetId);
                    setCloneModalOpen(false);
                  }}
                >
                  Clone
                </Button>
                <Button variant="ghost" onClick={() => setCloneModalOpen(false)}>
                  Cancel
                </Button>
              </div>
            </Modal>
          </Overlay>
        )}
      </MainContent>
    </Page>
  );
};

export default ProductBuilder;