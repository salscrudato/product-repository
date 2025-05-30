import { useState, useEffect } from 'react';
import { collection, collectionGroup, getDocs, getDoc, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import styled from 'styled-components';
import { XMarkIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';
import MainNavigation from '../components/ui/Navigation';

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

// Header Section - Horizontal layout with title and actions
const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  gap: 24px;

  @media (max-width: 1024px) {
    flex-direction: column;
    align-items: center;
    gap: 32px;
  }
`;

// Page Title - Modern typography matching other pages
const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b 0%, #475569 50%, #64748b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  text-align: center;
  letter-spacing: -0.02em;
  line-height: 1.1;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

// Content Grid - Two column layout with much wider cards
const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-bottom: 40px;
  max-width: 2000px;
  margin-left: auto;
  margin-right: auto;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 24px;
  }
`;

// Section Card - Modern card container with less padding
const SectionCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
    border-color: rgba(99, 102, 241, 0.3);
  }
`;

// Section Title - Modern section headers
const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  background: linear-gradient(135deg, #1e293b 0%, #475569 50%, #64748b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 24px 0;
  letter-spacing: -0.01em;
`;

// Search Container - Modern search input
const SearchContainer = styled.div`
  position: relative;
  margin-bottom: 24px;
`;

// Search Input - Modern styled input
const SearchInput = styled.input`
  width: 100%;
  padding: 12px 20px 12px 56px;
  font-size: 16px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  font-weight: 400;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 8px 32px rgba(99, 102, 241, 0.2), 0 0 0 4px rgba(99, 102, 241, 0.1);
    background: rgba(255, 255, 255, 0.95);
    transform: translateY(-2px);
  }

  &::placeholder {
    color: #94a3b8;
    font-weight: 400;
  }
`;

// Search Icon
const SearchIcon = styled(MagnifyingGlassIcon)`
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: #6366f1;
  pointer-events: none;
`;

// Form Input - Modern styled input
const FormInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  font-weight: 400;
  margin-bottom: 16px;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 8px 32px rgba(99, 102, 241, 0.2), 0 0 0 4px rgba(99, 102, 241, 0.1);
    background: rgba(255, 255, 255, 0.95);
    transform: translateY(-2px);
  }

  &::placeholder {
    color: #94a3b8;
    font-weight: 400;
  }
`;

// File Input Container
const FileInputContainer = styled.div`
  position: relative;
  margin-bottom: 16px;
`;

// File Input - Modern styled file input
const FileInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 8px 32px rgba(99, 102, 241, 0.2), 0 0 0 4px rgba(99, 102, 241, 0.1);
    background: rgba(255, 255, 255, 0.95);
  }

  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
    transform: translateY(-1px);
  }
`;

// Modern Button
const ModernButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    background: #e5e7eb;
    color: #9ca3af;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

// Table Container - Modern table styling with less padding
const TableContainer = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-bottom: 20px;
`;

// Modern Table
const ModernTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

// Table Header
const TableHead = styled.thead`
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
`;

// Table Row
const TableRow = styled.tr`
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.02);
  }

  &:last-child {
    border-bottom: none;
  }
`;

// Table Header Cell
const TableHeaderCell = styled.th`
  padding: 16px 20px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  font-size: 14px;
  letter-spacing: 0.025em;
  text-transform: uppercase;
  border-bottom: 2px solid rgba(226, 232, 240, 0.8);
`;

// Table Cell
const TableCell = styled.td`
  padding: 16px 20px;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.5;
  vertical-align: middle;
`;

// Loading Spinner
const LoadingSpinner = styled.div`
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 100px auto;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// Modal Overlay
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

// Modal Container
const ModalContainer = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 32px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
`;

// Modal Header
const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
`;

// Modal Title
const ModalTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
`;

// Close Button
const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: scale(1.05);
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


  if (cloneLoading) {
    return (
      <Page>
        <MainNavigation />
        <MainContent>
          <LoadingSpinner />
          <p style={{textAlign:'center',marginTop:12, color: '#6b7280'}}>Cloning product…</p>
        </MainContent>
      </Page>
    );
  }

  if (loading) {
    return (
      <Page>
        <MainNavigation />
        <MainContent>
          <LoadingSpinner />
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
      <MainNavigation />

      <MainContent>
        <HeaderSection>
          <PageTitle>Product Builder</PageTitle>
        </HeaderSection>

        <ContentGrid>
          {/* Coverage Section */}
          <SectionCard>
            <SectionTitle>Coverages</SectionTitle>
            <SearchContainer>
              <SearchIcon />
              <SearchInput
                placeholder="Search coverages by name..."
                value={coverageSearchQuery}
                onChange={e => setCoverageSearchQuery(e.target.value)}
              />
            </SearchContainer>
            <TableContainer>
              <ModernTable>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Select</TableHeaderCell>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Product Name</TableHeaderCell>
                    <TableHeaderCell>Associated Forms</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <tbody>
                  {filteredCoverages.map(coverage => (
                    <TableRow key={coverage.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={!!selectedCoverages[coverage.id]}
                          onChange={() => handleCoverageSelect(coverage)}
                          style={{ marginRight: 8 }}
                        />
                        {!!selectedCoverages[coverage.id] && (
                          <button
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              marginLeft: 4,
                              cursor: 'pointer',
                              color: '#ef4444'
                            }}
                            onClick={e => {
                              e.stopPropagation();
                              handleCoverageSelect(coverage);
                            }}
                            title="Deselect"
                          >
                            <XMarkIcon style={{ width: 18, height: 18 }} />
                          </button>
                        )}
                      </TableCell>
                      <TableCell>{coverage.name}</TableCell>
                      <TableCell>{products[coverage.productId] || 'Unknown Product'}</TableCell>
                      <TableCell style={{ textAlign: 'center' }}>
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#6366f1',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                          onClick={() => {
                            setModalItem(coverage);
                            setModalOpen(true);
                          }}
                        >
                          Forms ({selectedCoverages[coverage.id]?.length || 0})
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </ModernTable>
            </TableContainer>
          </SectionCard>
          {/* New Product Details */}
          <SectionCard>
            <SectionTitle>New Product Details</SectionTitle>
            <FormInput
              placeholder="Enter product name"
              value={newProductName}
              onChange={e => setNewProductName(e.target.value)}
            />
            <FormInput
              placeholder="Form Number"
              value={formNumber}
              onChange={e => setFormNumber(e.target.value)}
            />
            <FormInput
              placeholder="Product Code"
              value={productCode}
              onChange={e => setProductCode(e.target.value)}
            />
            <FormInput
              placeholder="Effective Date (MM/YYYY)"
              value={effectiveDate}
              onChange={e => setEffectiveDate(e.target.value)}
            />
            <FileInputContainer>
              <FileInput
                type="file"
                onChange={e => setFile(e.target.files[0])}
              />
            </FileInputContainer>

            {Object.keys(selectedCoverages).length > 0 && (
              <TableContainer>
                <ModernTable>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Coverage</TableHeaderCell>
                      <TableHeaderCell>Forms</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <tbody>
                    {Object.keys(selectedCoverages).map(coverageId => {
                      const coverage = coverages.find(c => c.id === coverageId);
                      const formNames = selectedCoverages[coverageId]
                        .map(formId => forms.find(f => f.id === formId)?.formName || 'Unknown Form')
                        .join(', ');
                      return (
                        <TableRow key={coverageId}>
                          <TableCell>{coverage?.name}</TableCell>
                          <TableCell>{formNames}</TableCell>
                        </TableRow>
                      );
                    })}
                  </tbody>
                </ModernTable>
              </TableContainer>
            )}

            <ModernButton
              onClick={handleCreateProduct}
              disabled={
                !newProductName ||
                !formNumber ||
                !effectiveDate ||
                !file ||
                Object.keys(selectedCoverages).length === 0
              }
            >
              <PlusIcon style={{ width: 20, height: 20 }} />
              Create Product
            </ModernButton>
          </SectionCard>
        </ContentGrid>


        {/* Modal for Multiple Associations */}
        {modalOpen && (
          <ModalOverlay onClick={() => setModalOpen(false)}>
            <ModalContainer onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>
                  Select Forms for {modalItem.name}
                </ModalTitle>
                <CloseButton onClick={() => setModalOpen(false)}>
                  <XMarkIcon style={{ width: 20, height: 20 }} />
                </CloseButton>
              </ModalHeader>
              <div style={{ marginTop: 16 }}>
                {forms
                  .filter(f => f.coverageIds?.includes(modalItem.id))
                  .map(form => {
                    const checked = selectedCoverages[modalItem.id]?.includes(form.id) || false;
                    return (
                      <div key={form.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: 12,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: checked ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                        border: '1px solid rgba(226, 232, 240, 0.6)',
                        transition: 'all 0.2s ease'
                      }}>
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
                          style={{ marginRight: 12 }}
                        />
                        <span style={{
                          color: '#374151',
                          fontWeight: checked ? '600' : '400'
                        }}>
                          {form.formName || form.formNumber}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </ModalContainer>
          </ModalOverlay>
        )}
        {/* Clone Product Modal */}
        {cloneModalOpen && (
          <ModalOverlay onClick={() => setCloneModalOpen(false)}>
            <ModalContainer onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Select Product to Clone</ModalTitle>
                <CloseButton onClick={() => setCloneModalOpen(false)}>
                  <XMarkIcon width={20} height={20} />
                </CloseButton>
              </ModalHeader>

              <div style={{ maxHeight: 320, overflowY: 'auto', marginTop: 12 }}>
                {Object.entries(products)
                  .sort((a, b) => a[1].localeCompare(b[1]))
                  .map(([pid, name]) => (
                    <label key={pid} style={{
                      display: 'block',
                      padding: '12px 16px',
                      margin: '4px 0',
                      borderRadius: '8px',
                      background: cloneTargetId === pid ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                      border: '1px solid rgba(226, 232, 240, 0.6)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="radio"
                        name="cloneTarget"
                        value={pid}
                        checked={cloneTargetId === pid}
                        onChange={() => setCloneTargetId(pid)}
                        style={{ marginRight: 12 }}
                      />
                      <span style={{
                        color: '#374151',
                        fontWeight: cloneTargetId === pid ? '600' : '400'
                      }}>
                        {name}
                      </span>
                    </label>
                  ))}
              </div>

              <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                <ModernButton
                  disabled={!cloneTargetId}
                  onClick={async () => {
                    await cloneProduct(cloneTargetId);
                    setCloneModalOpen(false);
                  }}
                >
                  Clone
                </ModernButton>
                <button
                  style={{
                    padding: '12px 24px',
                    border: '1px solid rgba(226, 232, 240, 0.6)',
                    borderRadius: '12px',
                    background: 'transparent',
                    color: '#6b7280',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setCloneModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </ModalContainer>
          </ModalOverlay>
        )}
      </MainContent>
    </Page>
  );
};

export default ProductBuilder;