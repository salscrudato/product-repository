import { useState, useEffect } from 'react';
import { collection, collectionGroup, getDocs, addDoc, updateDoc, doc, writeBatch, serverTimestamp, query, where, getDoc } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import styled from 'styled-components';
import {
  XMarkIcon,
  PlusIcon,
  WrenchScrewdriverIcon,
  DocumentDuplicateIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon
} from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';
import MainNavigation from '../components/ui/Navigation';
import EnhancedHeader from '../components/ui/EnhancedHeader';
import ConfirmationModal from '../components/ui/ConfirmationModal';

/* ---------- Styled Components (reused from ProductBuilder) ---------- */
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

const ProductBuilderGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 40px;
  max-width: 2000px;
  margin-left: auto;
  margin-right: auto;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
    & > *:last-child {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

const CoverageBrowserContainer = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
    border-color: rgba(99, 102, 241, 0.3);
  }
`;

const CoverageBrowserHeader = styled.div`
  padding: 24px 24px 16px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
`;

const SearchFilterContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 40px;
  font-size: 14px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  transition: all 0.3s ease;
  position: relative;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const SearchIconWrapper = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
`;

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 8px;
  background: white;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
  }
`;

const CoverageCardsGrid = styled.div`
  padding: 16px;
  max-height: 600px;
  overflow-y: auto;
  display: grid;
  gap: 12px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(226, 232, 240, 0.3);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.3);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(99, 102, 241, 0.5);
  }
`;

const CoverageCard = styled.div`
  padding: 16px;
  border: 1px solid ${props => props.selected ? '#6366f1' : 'rgba(226, 232, 240, 0.6)'};
  border-radius: 12px;
  background: ${props => props.selected ? 'rgba(99, 102, 241, 0.05)' : 'white'};
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.02);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  ${props => props.selected && `
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.2);
  `}
`;

const CoverageCardHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const CoverageCardTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  line-height: 1.3;
  flex: 1;
`;

const CoverageCardBadge = styled.span`
  padding: 2px 8px;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  margin-left: 8px;
`;

const CoverageCardMeta = styled.div`
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
`;

const CoverageCardActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
`;

const FormCount = styled.span`
  font-size: 11px;
  color: #6b7280;
  background: rgba(107, 114, 128, 0.1);
  padding: 2px 6px;
  border-radius: 8px;
`;

const SelectButton = styled.button`
  padding: 4px 12px;
  background: ${props => props.selected ? '#6366f1' : 'transparent'};
  color: ${props => props.selected ? 'white' : '#6366f1'};
  border: 1px solid #6366f1;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.selected ? '#4f46e5' : 'rgba(99, 102, 241, 0.1)'};
  }
`;

const ProductBuilderPanel = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
    border-color: rgba(99, 102, 241, 0.3);
  }
`;

const ProductBuilderHeader = styled.div`
  padding: 24px 24px 16px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
`;

const ProductBuilderContent = styled.div`
  padding: 24px;
`;

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

const SelectedCoveragesContainer = styled.div`
  margin-bottom: 24px;
`;

const SelectedCoveragesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  padding: 12px;
  background: rgba(248, 250, 252, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.6);
`;

const SelectedCoverageItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
    background: rgba(99, 102, 241, 0.02);
  }
`;

const SelectedCoverageInfo = styled.div`
  flex: 1;
`;

const SelectedCoverageName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 4px;
`;

const SelectedCoverageDetails = styled.div`
  font-size: 11px;
  color: #6b7280;
  display: flex;
  gap: 12px;
`;

const RemoveCoverageButton = styled.button`
  padding: 4px 8px;
  background: rgba(239, 68, 68, 0.1);
  border: none;
  color: #ef4444;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-size: 12px;
  font-weight: 500;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
  }
`;

const CoverageDetailsPanel = styled.div`
  background: rgba(248, 250, 252, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  padding: 16px;
  margin-top: 16px;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.4);

  &:last-child {
    border-bottom: none;
  }
`;

const DetailLabel = styled.span`
  font-weight: 600;
  color: #374151;
`;

const DetailValue = styled.span`
  color: #6b7280;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const FormLabel = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
`;

const FormInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 8px;
  font-size: 13px;
  background: white;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const FileInput = styled.input`
  display: none;
`;

const FileInputLabel = styled.label`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border: 2px dashed rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  background: rgba(99, 102, 241, 0.02);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  color: #6366f1;
  font-weight: 500;

  &:hover {
    border-color: rgba(99, 102, 241, 0.5);
    background: rgba(99, 102, 241, 0.05);
  }
`;

const CreateButton = styled.button`
  width: 100%;
  padding: 12px 16px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #5b5bf6 0%, #7c3aed 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Builder = () => {
  const [coverages, setCoverages] = useState([]);
  const [forms, setForms] = useState([]);
  const [products, setProducts] = useState({});
  const [selectedCoverages, setSelectedCoverages] = useState({});
  const [coverageDetails, setCoverageDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductFilter, setSelectedProductFilter] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');

  // Product creation state
  const [newProductName, setNewProductName] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [productCode, setProductCode] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [file, setFile] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const navigate = useNavigate();

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const productsSnap = await getDocs(collection(db, 'products'));
        const productMap = {};
        productsSnap.docs.forEach(doc => {
          productMap[doc.id] = doc.data().name;
        });
        setProducts(productMap);

        const coveragesSnap = await getDocs(collectionGroup(db, 'coverages'));
        const coverageList = coveragesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          productId: doc.ref.parent.parent.id,
        }));
        setCoverages(coverageList);

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

  // Fetch coverage details including sub-coverages, limits, deductibles, and forms
  const fetchCoverageDetails = async (coverageId, productId) => {
    try {
      // Get sub-coverages
      const subCoveragesSnap = await getDocs(
        query(
          collection(db, `products/${productId}/coverages`),
          where('parentCoverageId', '==', coverageId)
        )
      );
      const subCoverages = subCoveragesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get limits
      const limitsSnap = await getDocs(
        collection(db, `products/${productId}/coverages/${coverageId}/limits`)
      );
      const limits = limitsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get deductibles
      const deductiblesSnap = await getDocs(
        collection(db, `products/${productId}/coverages/${coverageId}/deductibles`)
      );
      const deductibles = deductiblesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get linked forms
      const formsSnap = await getDocs(
        query(
          collection(db, 'formCoverages'),
          where('coverageId', '==', coverageId),
          where('productId', '==', productId)
        )
      );
      const linkedFormIds = formsSnap.docs.map(doc => doc.data().formId);

      setCoverageDetails(prev => ({
        ...prev,
        [coverageId]: {
          subCoverages,
          limits,
          deductibles,
          linkedFormIds
        }
      }));
    } catch (error) {
      console.error('Error fetching coverage details:', error);
    }
  };

  const filteredCoverages = coverages.filter(c => {
    const matchesSearch = !searchTerm || 
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.coverageCode || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProduct = !selectedProductFilter || c.productId === selectedProductFilter;
    const matchesCategory = !selectedCategoryFilter || c.category === selectedCategoryFilter;
    
    return matchesSearch && matchesProduct && matchesCategory;
  });

  const uniqueProducts = [...new Set(coverages.map(c => c.productId))].map(pid => ({
    id: pid,
    name: products[pid] || 'Unknown'
  }));

  const uniqueCategories = [...new Set(coverages.map(c => c.category).filter(Boolean))];

  const handleSmartCoverageSelect = async (coverage) => {
    setSelectedCoverages(prev => {
      const newSelected = { ...prev };
      if (newSelected[coverage.id]) {
        delete newSelected[coverage.id];
        // Clean up details when deselecting
        setCoverageDetails(prevDetails => {
          const newDetails = { ...prevDetails };
          delete newDetails[coverage.id];
          return newDetails;
        });
      } else {
        newSelected[coverage.id] = coverage;
        // Fetch coverage details when selecting
        fetchCoverageDetails(coverage.id, coverage.productId);
      }
      return newSelected;
    });
  };

  const handleRemoveCoverage = (coverageId) => {
    setSelectedCoverages(prev => {
      const newSelected = { ...prev };
      delete newSelected[coverageId];
      return newSelected;
    });
    setCoverageDetails(prev => {
      const newDetails = { ...prev };
      delete newDetails[coverageId];
      return newDetails;
    });
  };

  // Create product with form auto-add
  const handleCreateProduct = async () => {
    if (!newProductName || !formNumber || !effectiveDate || Object.keys(selectedCoverages).length === 0) {
      alert('Please fill in all required fields and select at least one coverage.');
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirmCreateProduct = async () => {
    setIsCreating(true);
    try {
      let formDownloadUrl = '';
      let formFilePath = '';

      // Upload form file if provided
      if (file) {
        const storageRef = ref(storage, `forms/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        formDownloadUrl = await getDownloadURL(storageRef);
        formFilePath = storageRef.fullPath;
      }

      // Create new product
      const productRef = await addDoc(collection(db, 'products'), {
        name: newProductName,
        formNumber,
        productCode: productCode || '',
        effectiveDate,
        createdAt: serverTimestamp(),
      });
      const newProductId = productRef.id;

      // Create coverages for new product (with sub-coverages, limits, and deductibles)
      const newCoverageIds = {};

      // Helper function to recursively clone a coverage and all its related data
      const cloneCoverage = async (sourceCoverageId, sourceProductId, newProductId, parentCoverageId = null) => {
        // Get source coverage data
        const sourceCoverageRef = doc(db, `products/${sourceProductId}/coverages`, sourceCoverageId);
        const sourceCoverageSnap = await getDoc(sourceCoverageRef);
        if (!sourceCoverageSnap.exists()) return null;

        const sourceCoverageData = sourceCoverageSnap.data();

        // Create new coverage
        const newCoverageRef = await addDoc(
          collection(db, `products/${newProductId}/coverages`),
          {
            name: sourceCoverageData.name || 'Unnamed Coverage',
            coverageCode: sourceCoverageData.coverageCode || '',
            coverageName: sourceCoverageData.coverageName || '',
            scopeOfCoverage: sourceCoverageData.scopeOfCoverage || '',
            category: sourceCoverageData.category || 'Base Coverage',
            parentCoverageId: parentCoverageId,
            createdAt: serverTimestamp(),
          }
        );
        const newCoverageId = newCoverageRef.id;

        // Clone limits
        const limitsSnap = await getDocs(collection(db, `products/${sourceProductId}/coverages/${sourceCoverageId}/limits`));
        if (limitsSnap.docs.length > 0) {
          const batch = writeBatch(db);
          limitsSnap.docs.forEach(limitDoc => {
            const limitRef = doc(collection(db, `products/${newProductId}/coverages/${newCoverageId}/limits`));
            batch.set(limitRef, limitDoc.data());
          });
          await batch.commit();
        }

        // Clone deductibles
        const deductiblesSnap = await getDocs(collection(db, `products/${sourceProductId}/coverages/${sourceCoverageId}/deductibles`));
        if (deductiblesSnap.docs.length > 0) {
          const batch = writeBatch(db);
          deductiblesSnap.docs.forEach(deductibleDoc => {
            const deductibleRef = doc(collection(db, `products/${newProductId}/coverages/${newCoverageId}/deductibles`));
            batch.set(deductibleRef, deductibleDoc.data());
          });
          await batch.commit();
        }

        // Clone states
        if (sourceCoverageData.states && sourceCoverageData.states.length > 0) {
          await updateDoc(doc(db, `products/${newProductId}/coverages`, newCoverageId), {
            states: sourceCoverageData.states
          });
        }

        // Clone sub-coverages recursively
        const subCoveragesSnap = await getDocs(
          query(
            collection(db, `products/${sourceProductId}/coverages`),
            where('parentCoverageId', '==', sourceCoverageId)
          )
        );
        for (const subCoverageDoc of subCoveragesSnap.docs) {
          await cloneCoverage(subCoverageDoc.id, sourceProductId, newProductId, newCoverageId);
        }

        return newCoverageId;
      };

      // Clone all selected coverages
      for (const coverageId in selectedCoverages) {
        const sourceProductId = selectedCoverages[coverageId].productId;
        const newCoverageId = await cloneCoverage(coverageId, sourceProductId, newProductId);
        newCoverageIds[coverageId] = newCoverageId;
      }

      // Clone pricing steps from source product
      const sourceProductId = Object.values(selectedCoverages)[0]?.productId;
      if (sourceProductId) {
        const pricingSnap = await getDocs(collection(db, `products/${sourceProductId}/steps`));
        if (pricingSnap.docs.length > 0) {
          const batch = writeBatch(db);
          pricingSnap.docs.forEach(pricingDoc => {
            const pricingRef = doc(collection(db, `products/${newProductId}/steps`));
            batch.set(pricingRef, pricingDoc.data());
          });
          await batch.commit();
        }
      }

      // Clone rules from source product
      if (sourceProductId) {
        const rulesSnap = await getDocs(
          query(collection(db, 'rules'), where('productId', '==', sourceProductId))
        );
        if (rulesSnap.docs.length > 0) {
          const batch = writeBatch(db);
          rulesSnap.docs.forEach(ruleDoc => {
            const ruleData = ruleDoc.data();
            const ruleRef = doc(collection(db, 'rules'));
            batch.set(ruleRef, {
              ...ruleData,
              productId: newProductId,
              createdAt: serverTimestamp()
            });
          });
          await batch.commit();
        }
      }

      // ✅ AUTO-ADD FORM: If form was uploaded, create form document and link to coverages
      if (file && formDownloadUrl) {
        const newFormRef = await addDoc(collection(db, 'forms'), {
          formName: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
          formNumber: formNumber,
          effectiveDate: effectiveDate,
          type: 'Custom',
          category: 'Product Form',
          productId: newProductId,
          downloadUrl: formDownloadUrl,
          filePath: formFilePath,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isActive: true,
          edition: new Date().toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })
        });
        const newFormId = newFormRef.id;

        // Create form-coverage links for all selected coverages
        const batch = writeBatch(db);
        const newCoverageIdsList = Object.values(newCoverageIds);

        for (let i = 0; i < newCoverageIdsList.length; i++) {
          const newCoverageId = newCoverageIdsList[i];
          const mappingRef = doc(collection(db, 'formCoverages'));
          batch.set(mappingRef, {
            formId: newFormId,
            coverageId: newCoverageId,
            productId: newProductId,
            isPrimary: i === 0, // First coverage is primary
            displayOrder: i,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        await batch.commit();

        console.log(`✅ Form auto-added: ${newFormId} linked to ${newCoverageIdsList.length} coverages`);
      }

      // Navigate to product hub with the new product ID
      navigate(`/product-hub?productId=${newProductId}`, { replace: true });
      // Force a small delay to ensure navigation completes
      setTimeout(() => {
        window.location.reload();
      }, 500);
      setShowConfirmation(false);
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product. Please try again.');
      setShowConfirmation(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Page>
      <MainNavigation />
      <MainContent>
        <EnhancedHeader
          title="Product Builder"
          subtitle="Select coverages and build your insurance product"
          icon={WrenchScrewdriverIcon}
        />

        <ProductBuilderGrid>
          <CoverageBrowserContainer>
            <CoverageBrowserHeader>
              <SectionTitle style={{ margin: '0 0 16px 0' }}>Coverage Library</SectionTitle>
              <SearchFilterContainer>
                <div style={{ position: 'relative' }}>
                  <SearchInput
                    placeholder="Search coverages by name, code, or scope..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <SearchIconWrapper>
                    <MagnifyingGlassIcon width={16} height={16} />
                  </SearchIconWrapper>
                </div>
                <FilterRow>
                  <FilterSelect
                    value={selectedProductFilter}
                    onChange={(e) => setSelectedProductFilter(e.target.value)}
                  >
                    <option value="">All Products</option>
                    {uniqueProducts.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </FilterSelect>
                  <FilterSelect
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {uniqueCategories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </FilterSelect>
                </FilterRow>
              </SearchFilterContainer>
            </CoverageBrowserHeader>

            <CoverageCardsGrid>
              {filteredCoverages.map(coverage => {
                const isSelected = !!selectedCoverages[coverage.id];
                return (
                  <CoverageCard
                    key={coverage.id}
                    selected={isSelected}
                    onClick={() => handleSmartCoverageSelect(coverage)}
                  >
                    <CoverageCardHeader>
                      <CoverageCardTitle>
                        {coverage.name || coverage.coverageName || 'Unnamed Coverage'}
                      </CoverageCardTitle>
                      {coverage.category && (
                        <CoverageCardBadge>{coverage.category}</CoverageCardBadge>
                      )}
                    </CoverageCardHeader>

                    <CoverageCardMeta>
                      <div>Product: {products[coverage.productId] || 'Unknown'}</div>
                      {coverage.coverageCode && <div>Code: {coverage.coverageCode}</div>}
                    </CoverageCardMeta>

                    <CoverageCardActions>
                      <FormCount>0 forms</FormCount>
                      <SelectButton selected={isSelected}>
                        {isSelected ? 'Selected' : 'Select'}
                      </SelectButton>
                    </CoverageCardActions>
                  </CoverageCard>
                );
              })}
            </CoverageCardsGrid>
          </CoverageBrowserContainer>

          <ProductBuilderPanel>
            <ProductBuilderHeader>
              <SectionTitle style={{ margin: '0 0 8px 0' }}>Product Builder</SectionTitle>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                {Object.keys(selectedCoverages).length} coverages selected
              </div>
            </ProductBuilderHeader>

            <ProductBuilderContent>
              {Object.keys(selectedCoverages).length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '14px' }}>
                  Select coverages from the library to get started building your product.
                </p>
              ) : (
                <>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Product Details
                  </h4>
                  <FormGroup>
                    <FormLabel>Product Name *</FormLabel>
                    <FormInput
                      type="text"
                      placeholder="e.g., Homeowners Insurance"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel>Form Number *</FormLabel>
                    <FormInput
                      type="text"
                      placeholder="e.g., HO-001"
                      value={formNumber}
                      onChange={(e) => setFormNumber(e.target.value)}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel>Product Code</FormLabel>
                    <FormInput
                      type="text"
                      placeholder="e.g., HO"
                      value={productCode}
                      onChange={(e) => setProductCode(e.target.value)}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel>Effective Date *</FormLabel>
                    <FormInput
                      type="date"
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel>Upload Form (PDF)</FormLabel>
                    <FileInput
                      id="form-file"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <FileInputLabel htmlFor="form-file">
                      {file ? `✓ ${file.name}` : '📄 Click to upload PDF form'}
                    </FileInputLabel>
                  </FormGroup>

                  <CreateButton
                    onClick={handleCreateProduct}
                    disabled={isCreating || !newProductName || !formNumber || !effectiveDate}
                  >
                    {isCreating ? 'Creating...' : 'Create Product'}
                  </CreateButton>

                  <SelectedCoveragesContainer style={{ marginTop: '24px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Selected Coverages
                  </h4>
                  <SelectedCoveragesList>
                    {Object.entries(selectedCoverages).map(([covId, coverage]) => {
                      const details = coverageDetails[covId];
                      return (
                        <SelectedCoverageItem key={covId}>
                          <SelectedCoverageInfo>
                            <SelectedCoverageName>
                              {coverage.name || coverage.coverageName || 'Unnamed'}
                            </SelectedCoverageName>
                            <SelectedCoverageDetails>
                              {details && (
                                <>
                                  <span>{details.subCoverages?.length || 0} sub-coverages</span>
                                  <span>{details.limits?.length || 0} limits</span>
                                  <span>{details.deductibles?.length || 0} deductibles</span>
                                  <span>{details.linkedFormIds?.length || 0} forms</span>
                                </>
                              )}
                            </SelectedCoverageDetails>
                          </SelectedCoverageInfo>
                          <RemoveCoverageButton onClick={() => handleRemoveCoverage(covId)}>
                            Remove
                          </RemoveCoverageButton>
                        </SelectedCoverageItem>
                      );
                    })}
                  </SelectedCoveragesList>

                  {Object.keys(selectedCoverages).length > 0 && Object.values(coverageDetails).some(d => d) && (
                    <CoverageDetailsPanel>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                        Coverage Details
                      </h4>
                      {Object.entries(selectedCoverages).map(([covId, coverage]) => {
                        const details = coverageDetails[covId];
                        if (!details) return null;
                        return (
                          <div key={covId} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(226, 232, 240, 0.6)' }}>
                            <DetailRow>
                              <DetailLabel>{coverage.name || 'Coverage'}</DetailLabel>
                              <DetailValue>{coverage.coverageCode || 'N/A'}</DetailValue>
                            </DetailRow>
                            <DetailRow>
                              <DetailLabel>Sub-Coverages</DetailLabel>
                              <DetailValue>{details.subCoverages?.length || 0}</DetailValue>
                            </DetailRow>
                            <DetailRow>
                              <DetailLabel>Limits</DetailLabel>
                              <DetailValue>{details.limits?.length || 0}</DetailValue>
                            </DetailRow>
                            <DetailRow>
                              <DetailLabel>Deductibles</DetailLabel>
                              <DetailValue>{details.deductibles?.length || 0}</DetailValue>
                            </DetailRow>
                            <DetailRow>
                              <DetailLabel>Linked Forms</DetailLabel>
                              <DetailValue>{details.linkedFormIds?.length || 0}</DetailValue>
                            </DetailRow>
                          </div>
                        );
                      })}
                    </CoverageDetailsPanel>
                  )}
                  </SelectedCoveragesContainer>
                </>
              )}
            </ProductBuilderContent>
          </ProductBuilderPanel>
        </ProductBuilderGrid>

        {/* Create Product Confirmation Modal */}
        <ConfirmationModal
          isOpen={showConfirmation}
          title="Create Product"
          message={`Create product "${newProductName}" with ${Object.keys(selectedCoverages).length} coverage(s)? All related data including sub-coverages, limits, deductibles, pricing, and rules will be cloned.`}
          confirmText="Create"
          cancelText="Cancel"
          isDangerous={false}
          isLoading={isCreating}
          onConfirm={handleConfirmCreateProduct}
          onCancel={() => setShowConfirmation(false)}
        />
      </MainContent>
    </Page>
  );
};

export default Builder;

