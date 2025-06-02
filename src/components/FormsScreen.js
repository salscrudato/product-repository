import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { db, storage } from '../firebase';
import {
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc,
  query, where, getDoc, writeBatch, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  TrashIcon, DocumentTextIcon, PlusIcon, XMarkIcon,
  LinkIcon, PencilIcon, MagnifyingGlassIcon,
  Squares2X2Icon, TableCellsIcon
} from '@heroicons/react/24/solid';
import { ArrowDownTrayIcon as DownloadIcon20 } from '@heroicons/react/20/solid';

import { makeFormSheet } from '../utils/xlsx';

import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';
import MainNavigation from '../components/ui/Navigation';

import {
  Table, THead, Tr, Th, Td,
  Overlay, Modal, ModalHeader, ModalTitle, CloseBtn
} from '../components/ui/Table';

import styled, { keyframes } from 'styled-components';

/* ---------- styled helpers ---------- */
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

/* Gradient pill‑button reused for “Add Form” */




/* high‑z blurred backdrop */
const OverlayFixed = styled(Overlay)`
  position: fixed !important;
  inset: 0;
  background: rgba(17,24,39,0.55);
  backdrop-filter: blur(2px);
  z-index: 1400;
  display: flex;
  align-items: center;
  justify-content: center;
`;

/* ---------- Modern Styled Components ---------- */

// Container - Clean gradient background without color overlay
const ModernContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
  position: relative;
`;

// Main Content - Modern layout
const MainContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
  position: relative;
  z-index: 1;
`;

// Header Section - Horizontal layout with breadcrumb and title
const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  gap: 24px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
`;

// Breadcrumb navigation - Modern design
const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #64748b;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  padding: 12px 20px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  width: fit-content;

  a {
    color: #6366f1;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s ease;

    &:hover {
      color: #4f46e5;
      text-decoration: underline;
    }
  }

  span {
    color: #94a3b8;
    font-weight: 400;
  }
`;

// Page Title - Modern typography
const PageTitle = styled.h1`
  font-size: 36px;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  letter-spacing: -0.025em;
  white-space: nowrap;

  @media (max-width: 768px) {
    font-size: 28px;
    white-space: normal;
  }
`;

// Search Container - Centered modern design
const SearchContainer = styled.div`
  position: relative;
  max-width: 600px;
  margin: 0 auto 48px;
  display: flex;
  justify-content: center;
`;

const SearchInput = styled(TextInput)`
  width: 100%;
  padding: 12px 20px 12px 56px;
  font-size: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  font-weight: 400;

  &:focus {
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

// Action Bar - Modern design
const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  gap: 20px;
  flex-wrap: wrap;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  padding: 20px 24px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const ActionGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

// View Toggle
const ViewToggle = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const ViewToggleButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: ${({ active }) => active ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent'};
  color: ${({ active }) => active ? '#ffffff' : '#64748b'};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ active }) => active ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'rgba(99, 102, 241, 0.1)'};
    color: ${({ active }) => active ? '#ffffff' : '#6366f1'};
  }
`;

const AddButton = styled.button`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.25);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);

  &:hover {
    transform: translateX(-50%) translateY(-2px) scale(1.02);
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.35);
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  }

  svg {
    width: 12px;
    height: 12px;
  }
`;

// Forms Grid - 3-column layout for cards
const FormsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 120px;

  @media (max-width: 1400px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

// Form Card - Simple clean design matching coverage cards
const FormCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    border-color: #6366f1;
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
`;

const CardTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  flex: 1;
  line-height: 1.3;
  letter-spacing: -0.025em;
`;

const CardCode = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  padding: 6px 12px;
  border-radius: 8px;
  margin-left: 16px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  letter-spacing: 0.025em;
`;

const CardActions = styled.div`
  display: flex;
  gap: 8px;
  margin-left: 12px;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.8);
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
  }

  &.danger:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
  }
`;

// Card Content
const CardContent = styled.div`
  margin-bottom: 16px;
`;

const CardCategory = styled.div`
  display: inline-block;
  background: ${({ category }) => {
    switch (category) {
      case 'Base Coverage Form': return 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)';
      case 'Endorsement': return 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.1) 100%)';
      case 'Exclusion': return 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%)';
      default: return 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)';
    }
  }};
  color: ${({ category }) => {
    switch (category) {
      case 'Base Coverage Form': return '#3b82f6';
      case 'Endorsement': return '#22c55e';
      case 'Exclusion': return '#f59e0b';
      default: return '#6366f1';
    }
  }};
  border: ${({ category }) => {
    switch (category) {
      case 'Base Coverage Form': return '1px solid rgba(59, 130, 246, 0.2)';
      case 'Endorsement': return '1px solid rgba(34, 197, 94, 0.2)';
      case 'Exclusion': return '1px solid rgba(245, 158, 11, 0.2)';
      default: return '1px solid rgba(99, 102, 241, 0.2)';
    }
  }};
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const CardMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-top: 20px;
`;

const MetricItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(248, 250, 252, 0.8);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(226, 232, 240, 0.5);
  font-weight: 500;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.2);
  }

  svg {
    width: 18px;
    height: 18px;
    opacity: 0.8;
  }
`;

// Table Container
const TableContainer = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-bottom: 32px;
`;

// Empty State
const EmptyState = styled.div`
  text-align: center;
  padding: 80px 20px;
  color: #64748b;
`;

const EmptyStateTitle = styled.h3`
  font-size: 24px;
  font-weight: 600;
  color: #475569;
  margin: 0 0 12px 0;
`;

const EmptyStateText = styled.p`
  font-size: 16px;
  color: #64748b;
  margin: 0 0 24px 0;
`;



/* ---------- component ---------- */
export default function FormsScreen() {
  const { productId } = useParams();
  const location = useLocation();
  const { coverageId } = location.state || {};


  /* data state */
  const [forms, setForms] = useState([]);
  const [products, setProducts] = useState([]);
  const [coverages, setCoverages] = useState([]);

  // --- filter/search state for modals
  const [coverageSearch, setCoverageSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  /* search state (debounced) */
  const [rawSearch, setRawSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef(null);

  /* ui state */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* add‑form modal */
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [type, setType] = useState('ISO');
  const [category, setCategory] = useState('Base Coverage Form');
  const [selectedProduct, setSelectedProduct] = useState(productId || '');
  const [selectedCoverages, setSelectedCoverages] = useState([]);
  const [file, setFile] = useState(null);

  /* link‑coverage modal */
  const [linkCoverageModalOpen, setLinkCoverageModalOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [linkCoverageIds, setLinkCoverageIds] = useState([]);

  /* link‑product modal */
  const [linkProductModalOpen, setLinkProductModalOpen] = useState(false);
  const [linkProductIds, setLinkProductIds] = useState([]);

  /* version sidebar */
  const [editingId, setEditingId] = useState(null);
  const [changeSummary, setChangeSummary] = useState('');


  /* view toggle */
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'



  /* ---------- side‑effects ---------- */
  /* debounce rawSearch */
  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(rawSearch.trim()), 250);
    return () => clearTimeout(id);
  }, [rawSearch]);

  /* `/` shortcut to focus */
  useEffect(() => {
    const handler = e => {
      if (e.key === '/' && !e.target.matches('input,textarea,select')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* fetch data */
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        /* products */
        const pSnap = await getDocs(collection(db, 'products'));
        const productList = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        productList.sort((a, b) => a.name.localeCompare(b.name));
        setProducts(productList);

        /* coverages */
        let coverageList = [];
        if (productId) {
          const cSnap = await getDocs(collection(db, `products/${productId}/coverages`));
          coverageList = cSnap.docs.map(d => ({ id: d.id, ...d.data(), productId }));
        } else {
          for (const product of productList) {
            const cSnap = await getDocs(collection(db, `products/${product.id}/coverages`));
            coverageList = [
              ...coverageList,
              ...cSnap.docs.map(d => ({ id: d.id, ...d.data(), productId: product.id }))
            ];
          }
        }
        coverageList.sort((a, b) => a.name.localeCompare(b.name));
        setCoverages(coverageList);

        /* forms */
        const fSnap = await getDocs(collection(db, 'forms'));
        const formList = await Promise.all(
          fSnap.docs.map(async d => {
            const data = d.data();
            let url = null;
            if (data.filePath) {
              try { url = await getDownloadURL(ref(storage, data.filePath)); } catch {}
            }
            return {
              ...data,
              id: d.id,
              downloadUrl: url,
              productIds: data.productIds || (data.productId ? [data.productId] : [])
            };
          })
        );
        setForms(formList);
      } catch (err) {
        console.error(err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [productId]);

  /* maps */
  const productMap = useMemo(() =>
    Object.fromEntries(products.map(p => [p.id, p.name])), [products]);

  const coverageMap = useMemo(() =>
    Object.fromEntries(coverages.map(c => [c.id, c.name])), [coverages]);

  /* filtered forms – memoised */
  const filteredForms = useMemo(() => {
    return forms.filter(f => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (f.formName || '').toLowerCase().includes(q) ||
        f.formNumber.toLowerCase().includes(q);
      const matchesProduct = productId ? (f.productIds || []).includes(productId) : true;
      return matchesSearch && matchesProduct;
    });
  }, [forms, searchQuery, productId]);

  /* ---------- handlers (add, delete, link) ---------- */
  // open the modal pre‑filled for editing an existing form
  const openEditModal = formObj => {
    setFormName(formObj.formName || '');
    setFormNumber(formObj.formNumber);
    setEffectiveDate(formObj.effectiveDate);
    setType(formObj.type);
    setCategory(formObj.category);
    setSelectedProduct(formObj.productIds?.[0] || formObj.productId || '');
    setSelectedCoverages(formObj.coverageIds || []);
    setFile(null);            // user can (re)upload if desired
    setEditingId(formObj.id);
    setChangeSummary('');
    setShowModal(true);
  };
  const openLinkProductModal = form => {
    setSelectedForm(form);
    setLinkProductIds(form.productIds || (form.productId ? [form.productId] : []));
    setLinkProductModalOpen(true);
  };

  const handleLinkProducts = async () => {
    if (!selectedForm) return;
    try {
      const formId = selectedForm.id;
      await updateDoc(doc(db, 'forms', formId), {
        productIds: linkProductIds,
        /* keep legacy single‑ID field for older code paths */
        productId: linkProductIds[0] || null
      });
      setForms(fs => fs.map(f =>
        f.id === formId ? { ...f, productIds: linkProductIds } : f
      ));
      setLinkProductModalOpen(false);
      setSelectedForm(null);
      setLinkProductIds([]);
    } catch (err) {
      console.error(err);
      alert('Failed to link products.');
    }
  };
  const handleSaveForm = async () => {
    if (!formNumber || !effectiveDate || !selectedProduct) {
      alert('Form Number, Effective Date, and Product are required.');
      return;
    }
    if (editingId && changeSummary.trim().length < 10) {
      alert('Please provide a reason for the change (at least 10 characters).');
      return;
    }
    try {
      const basePayload = {
        formName: formName || null,
        formNumber,
        formEditionDate: effectiveDate,
        effectiveDate,
        type,
        category,
        productIds: selectedProduct ? [selectedProduct] : [],
        productId: selectedProduct,
        coverageIds: selectedCoverages
      };
      let filePath = null;
      let downloadUrl = null;
      if (file) {
        const storageRef = ref(storage, `forms/${file.name}`);
        await uploadBytes(storageRef, file);
        downloadUrl = await getDownloadURL(storageRef);
        filePath = storageRef.fullPath;
      }
      const payload = {
        ...basePayload,
        ...(filePath && { filePath, downloadUrl })
      };
      let formId;
      if (editingId) {

        await updateDoc(doc(db, 'forms', editingId), payload);
        formId = editingId;

      } else {
        const docRef = await addDoc(collection(db, 'forms'), {
          ...payload,
          filePath,
          downloadUrl
        });
        formId = docRef.id;

      }
      // link to coverages
      for (const coverageId of selectedCoverages) {
        await addDoc(collection(db, 'formCoverages'), {
          formId,
          coverageId,
          productId: selectedProduct,
        });

        const coverageDoc = await getDoc(
          doc(db, `products/${selectedProduct}/coverages`, coverageId)
        );
        if (coverageDoc.exists()) {
          const currentFormIds = coverageDoc.data().formIds || [];
          if (!currentFormIds.includes(formId)) {
            await updateDoc(
              doc(db, `products/${selectedProduct}/coverages`, coverageId),
              { formIds: [...currentFormIds, formId] }
            );
          }
        }
      }
      // reset ui
      setFormName('');
      setFormNumber('');
      setEffectiveDate('');
      setType('ISO');
      setCategory('Base Coverage Form');
      setSelectedProduct(productId || '');
      setSelectedCoverages([]);
      setFile(null);
      setEditingId(null);
      setChangeSummary('');
      setShowModal(false);

      // refresh forms list
      const snap = await getDocs(collection(db, 'forms'));
      const formList = await Promise.all(
        snap.docs.map(async d => {
          const data = d.data();
          let url = null;
          if (data.filePath) {
            try { url = await getDownloadURL(ref(storage, data.filePath)); } catch {}
          }
          return { ...data, id: d.id, downloadUrl: url };
        })
      );
      setForms(formList);
    } catch (err) {
      console.error(err);
      alert('Failed to save form.');
    }
  };

  const handleDeleteForm = async id => {
    if (!window.confirm('Delete this form?')) return;
    try {
      const formDoc = forms.find(f => f.id === id);
      if (formDoc) {
        /* remove link docs and update coverages */
        const linksSnap = await getDocs(
          query(collection(db, 'formCoverages'), where('formId', '==', id))
        );
        for (const linkDoc of linksSnap.docs) {
          const { coverageId } = linkDoc.data();
          const covDoc = await getDoc(
            doc(db, `products/${formDoc.productId}/coverages`, coverageId)
          );
          if (covDoc.exists()) {
            const formIds = (covDoc.data().formIds || []).filter(fid => fid !== id);
            await updateDoc(
              doc(db, `products/${formDoc.productId}/coverages`, coverageId),
              { formIds }
            );
          }
          await deleteDoc(doc(db, 'formCoverages', linkDoc.id));
        }


      }
      await deleteDoc(doc(db, 'forms', id));
      setForms(forms.filter(f => f.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete form.');
    }
  };

  const openLinkCoverageModal = form => {
    setSelectedForm(form);
    setLinkCoverageIds(form.coverageIds || []);
    setLinkCoverageModalOpen(true);
  };

  const handleLinkCoverage = async () => {
    if (!selectedForm) return;
    // map coverageId -> owning productId for quick look‑up
    const covIdToProductId = Object.fromEntries(coverages.map(c => [c.id, c.productId]));
    try {
      const formId = selectedForm.id;
      const productId = selectedForm.productId;
      const batch = writeBatch(db);
      // 1) delete old links for this product only
      const existingLinksSnap = await getDocs(
        query(
          collection(db, 'formCoverages'),
          where('formId', '==', formId),
          where('productId', '==', productId)
        )
      );
      existingLinksSnap.docs.forEach(linkDoc => {
        // delete link doc
        batch.delete(doc(db, 'formCoverages', linkDoc.id));
        // remove formId from coverage.formIds
        const covId = linkDoc.data().coverageId;
        const covProdId = covIdToProductId[covId];
        batch.update(
          doc(db, `products/${covProdId}/coverages`, covId),
          { formIds: arrayRemove(formId) }
        );
      });
      // 2) add new links
      linkCoverageIds.forEach(coverageId => {
        const owningProductId = covIdToProductId[coverageId];
        if (!owningProductId) return; // safety: skip if we can't resolve product
        const newRef = doc(collection(db, 'formCoverages'));
        batch.set(newRef, { formId, coverageId, productId: owningProductId });
        // add formId to the coverage document under the correct product path (if it exists)
        batch.update(
          doc(db, `products/${owningProductId}/coverages`, coverageId),
          { formIds: arrayUnion(formId) }
        );
      });
      // 3) update the form document's coverageIds field
      batch.update(
        doc(db, 'forms', formId),
        { coverageIds: linkCoverageIds }
      );
      await batch.commit();
      // update local state without re-fetching URLs
      setForms(fs =>
        fs.map(f =>
          f.id === formId
            ? { ...f, coverageIds: linkCoverageIds }
            : f
        )
      );
      setLinkCoverageModalOpen(false);
      setSelectedForm(null);
      setLinkCoverageIds([]);
    } catch (err) {
      console.error(err);
      alert('Failed to link coverages to form.');
    }
  };

  // XLSX Export functionality
  const handleExportXLSX = async () => {
    try {
      const XLSXmod = await import('xlsx');
      const XLSX = XLSXmod.default || XLSXmod;
      const fsMod = await import('file-saver');
      const saveAs = fsMod.saveAs || fsMod.default;

      const ws = makeFormSheet(filteredForms);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Forms');
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      const filename = productId && productMap[productId]
        ? `forms_${productMap[productId]}.xlsx`
        : 'forms_export.xlsx';

      saveAs(new Blob([buf], { type: 'application/octet-stream' }), filename);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  /* ---------- render ---------- */
  if (loading) {
    return (
      <ModernContainer>
        <MainNavigation />
        <MainContent><Spinner /></MainContent>
      </ModernContainer>
    );
  }
  if (error) {
    return (
      <ModernContainer>
        <MainNavigation />
        <MainContent>{error}</MainContent>
      </ModernContainer>
    );
  }

  const title =
    coverageId && coverageMap[coverageId]
      ? `Forms for ${coverageMap[coverageId]}`
      : productId && productMap[productId]
        ? `Forms for ${productMap[productId]}`
        : 'Forms';

  return (
    <ModernContainer>
      <MainNavigation />
      <MainContent>
        <HeaderSection>
          <Breadcrumb>
            <Link to="/">Home</Link>
            <span>›</span>
            <Link to="/products">Products</Link>
            <span>›</span>
            <span>Forms</span>
          </Breadcrumb>
          <PageTitle>{title}</PageTitle>
        </HeaderSection>

        <SearchContainer>
          <SearchIcon />
          <SearchInput
            placeholder="Search forms by name, number, or category..."
            ref={searchRef}
            value={rawSearch}
            onChange={e => setRawSearch(e.target.value)}
          />
        </SearchContainer>

        {/* Action Bar */}
        <ActionBar>
          <ActionGroup>
            <ViewToggle>
              <ViewToggleButton
                active={viewMode === 'cards'}
                onClick={() => setViewMode('cards')}
              >
                <Squares2X2Icon width={16} height={16} />
                Cards
              </ViewToggleButton>
              <ViewToggleButton
                active={viewMode === 'table'}
                onClick={() => setViewMode('table')}
              >
                <TableCellsIcon width={16} height={16} />
                Table
              </ViewToggleButton>
            </ViewToggle>
          </ActionGroup>

          <ActionGroup>
            <Button variant="ghost" onClick={handleExportXLSX}>
              <DownloadIcon20 width={16} height={16} />
              Export XLSX
            </Button>
          </ActionGroup>
        </ActionBar>

        {/* Forms Display */}
        {filteredForms.length ? (
          viewMode === 'cards' ? (
            <FormsGrid>
              {filteredForms.map(f => (
                <FormCard key={f.id}>
                  <CardHeader>
                    <CardTitle>
                      <DocumentTextIcon width={20} height={20} />
                      {f.downloadUrl ? (
                        <a
                          href={f.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                          {(f.formName || f.formNumber || 'Unnamed Form').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                        </a>
                      ) : (
                        <span>
                          {(f.formName || f.formNumber || 'Unnamed Form').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      )}
                    </CardTitle>
                    <CardCode>{f.formNumber}</CardCode>
                    <CardActions>
                      <IconButton onClick={() => openEditModal(f)} title="Edit">
                        <PencilIcon width={16} height={16} />
                      </IconButton>
                      <IconButton className="danger" onClick={() => handleDeleteForm(f.id)} title="Delete">
                        <TrashIcon width={16} height={16} />
                      </IconButton>
                    </CardActions>
                  </CardHeader>

                  <CardContent>
                    <CardCategory category={f.category}>
                      {f.category}
                    </CardCategory>

                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', fontSize: '14px', color: '#64748b' }}>
                      <span><strong>Type:</strong> {f.type}</span>
                      <span><strong>Edition:</strong> {f.effectiveDate || '—'}</span>
                    </div>

                    <CardMetrics>
                      <MetricItem onClick={() => openLinkProductModal(f)}>
                        <Squares2X2Icon />
                        Products {f.productIds?.length ? `(${f.productIds.length})` : '(0)'}
                      </MetricItem>
                      <MetricItem onClick={() => openLinkCoverageModal(f)}>
                        <LinkIcon />
                        Coverages {f.coverageIds?.length ? `(${f.coverageIds.length})` : '(0)'}
                      </MetricItem>
                    </CardMetrics>
                  </CardContent>
                </FormCard>
              ))}
            </FormsGrid>
          ) : (
            <TableContainer>
              <Table>
                <THead>
                  <Tr>
                    <Th style={{ width: '15%' }}>Name</Th>
                    <Th style={{ width: '12%' }}>Number</Th>
                    <Th style={{ width: '12%' }}>Edition</Th>
                    <Th style={{ width: '10%' }}>Type</Th>
                    <Th style={{ width: '15%' }}>Category</Th>
                    <Th style={{ width: '15%' }}>Products</Th>
                    <Th style={{ width: '15%' }}>Coverages</Th>
                    <Th style={{ width: '10%' }}>Edit</Th>
                    <Th style={{ width: '10%' }}>Delete</Th>
                  </Tr>
                </THead>
                <tbody>
                  {filteredForms.map(f => (
                    <Tr key={f.id}>
                      <Td>
                        {f.downloadUrl ? (
                          <a
                            href={f.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none', color: '#2563eb', opacity: 0.85 }}
                          >
                            {(f.formName || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                          </a>
                        ) : (
                          <span style={{ color: '#6B7280' }}>
                            {(f.formName || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                          </span>
                        )}
                      </Td>
                      <Td>{f.formNumber || '—'}</Td>
                      <Td>{f.effectiveDate || '—'}</Td>
                      <Td>{f.type}</Td>
                      <Td>{f.category}</Td>
                      <Td align="center">
                        <Button variant="ghost" onClick={() => openLinkProductModal(f)}>
                          Products{f.productIds?.length ? ` (${f.productIds.length})` : ''}
                        </Button>
                      </Td>
                      <Td align="center">
                        <Button
                          variant="ghost"
                          onClick={() => openLinkCoverageModal(f)}
                          title="Link coverages"
                        >
                          Coverages{f.coverageIds?.length ? ` (${f.coverageIds.length})` : ''}
                        </Button>
                      </Td>
                      <Td>
                        <Button variant="ghost" onClick={() => openEditModal(f)} title="Edit">
                          <PencilIcon width={16} height={16}/>
                        </Button>
                      </Td>
                      <Td>
                        <Button variant="ghost" onClick={() => handleDeleteForm(f.id)} title="Delete">
                          <TrashIcon width={16} height={16} />
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableContainer>
          )
        ) : (
          <EmptyState>
            <EmptyStateTitle>No forms found</EmptyStateTitle>
            <EmptyStateText>
              {searchQuery ? 'Try adjusting your search terms' : 'Get started by adding your first form'}
            </EmptyStateText>
          </EmptyState>
        )}

        {/* Add Form Button */}
        <AddButton onClick={() => { setEditingId(null); setShowModal(true); }}>
          <PlusIcon width={14} height={14}/>
          Add Form
        </AddButton>

        {/* ---------- Add Form Modal ---------- */}
        {showModal && (
          <OverlayFixed>
            <Modal onClick={e => e.stopPropagation()}>
              <CloseBtn onClick={() => setShowModal(false)}>
                <XMarkIcon width={16} height={16} />
              </CloseBtn>
              <ModalTitle>{editingId ? 'Edit Form' : 'Add New Form'}</ModalTitle>
              {/* ---------- form fields ---------- */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:16, marginBottom:16 }}>
                <div style={{ flex:1, minWidth:140 }}>
                  <label style={{ display:'block', fontSize:14, fontWeight:500, color:'#1F2937', marginBottom:8 }}>
                    Product*
                  </label>
                  <TextInput
                    as="select"
                    value={selectedProduct}
                    onChange={e => setSelectedProduct(e.target.value)}
                    disabled={!!productId}
                  >
                    <option value="">Select Product</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </TextInput>
                </div>
                <div style={{ flex:1, minWidth:140 }}>
                  <label style={{ display:'block', fontSize:14, fontWeight:500, color:'#1F2937', marginBottom:8 }}>
                    Link Coverages (optional)
                  </label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <Button variant="ghost" onClick={() => setSelectedCoverages(
                      coverages.filter(c => !productId || c.productId === (selectedProduct || productId)).map(c => c.id)
                    )}>Select All</Button>
                    <Button variant="ghost" onClick={() => setSelectedCoverages([])}>Clear All</Button>
                  </div>
                  <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 4, padding: 8 }}>
                    {(coverages.filter(c => !productId || c.productId === (selectedProduct || productId))).map(c => (
                      <label key={c.id} style={{ display: 'block', padding: 4 }}>
                        <input
                          type="checkbox"
                          value={c.id}
                          checked={selectedCoverages.includes(c.id)}
                          onChange={e => {
                            const val = e.target.value;
                            setSelectedCoverages(prev =>
                              prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
                            );
                          }}
                        />{' '}
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display:'flex', flexWrap:'wrap', gap:16, marginBottom:16 }}>
                <div style={{ flex:1, minWidth:140 }}>
                  <label style={{ display:'block', fontSize:14, fontWeight:500, color:'#1F2937', marginBottom:8 }}>
                    Form Name (optional)
                  </label>
                  <TextInput
                    placeholder="Form Name"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                  />
                </div>
                <div style={{ flex:1, minWidth:140 }}>
                  <label style={{ display:'block', fontSize:14, fontWeight:500, color:'#1F2937', marginBottom:8 }}>
                    Form Number*
                  </label>
                  <TextInput
                    placeholder="Form Number"
                    value={formNumber}
                    onChange={e => setFormNumber(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display:'flex', flexWrap:'wrap', gap:16, marginBottom:16 }}>
                <div style={{ flex:1, minWidth:140 }}>
                  <label style={{ display:'block', fontSize:14, fontWeight:500, color:'#1F2937', marginBottom:8 }}>
                    Effective Date (MM/YY)*
                  </label>
                  <TextInput
                    placeholder="MM/YY"
                    value={effectiveDate}
                    onChange={e => {
                      let v = e.target.value.replace(/[^0-9]/g, '');
                      if (v.length > 4) v = v.slice(0, 4);
                      if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
                      setEffectiveDate(v);
                    }}
                  />
                </div>
                <div style={{ flex:1, minWidth:140 }}>
                  <label style={{ display:'block', fontSize:14, fontWeight:500, color:'#1F2937', marginBottom:8 }}>
                    Type
                  </label>
                  <TextInput
                    as="select"
                    value={type}
                    onChange={e => setType(e.target.value)}
                  >
                    <option value="ISO">ISO</option>
                    <option value="Proprietary">Proprietary</option>
                    <option value="NAICS">NAICS</option>
                    <option value="Other">Other</option>
                  </TextInput>
                </div>
                <div style={{ flex:1, minWidth:140 }}>
                  <label style={{ display:'block', fontSize:14, fontWeight:500, color:'#1F2937', marginBottom:8 }}>
                    Category
                  </label>
                  <TextInput
                    as="select"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  >
                    <option value="Base Coverage Form">Base Coverage Form</option>
                    <option value="Endorsement">Endorsement</option>
                    <option value="Exclusion">Exclusion</option>
                    <option value="Dec/Quote Letter">Dec/Quote Letter</option>
                    <option value="Notice">Notice</option>
                    <option value="Other">Other</option>
                  </TextInput>
                </div>
              </div>

              <div style={{ display:'flex', flexWrap:'wrap', gap:16, marginBottom:16 }}>
                <div style={{ flex:1, minWidth:140 }}>
                  <label style={{ display:'block', fontSize:14, fontWeight:500, color:'#1F2937', marginBottom:8 }}>
                    Upload PDF (optional)
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf"
                    style={{ display:'none' }}
                    onChange={e => setFile(e.target.files[0])}
                  />
                  <label
                    htmlFor="file-upload"
                    style={{
                      width:'100%',
                      display:'flex',
                      alignItems:'center',
                      gap:8,
                      padding:12,
                      border:'1px dashed #D1D5DB',
                      borderRadius:8,
                      cursor:'pointer',
                      color:'#6B7280',
                      fontSize:14,
                      ...(file ? { color:'#1D4ED8', borderColor:'#1D4ED8' } : {})
                    }}
                  >
                    <DocumentTextIcon width={20} height={20} />
                    {file ? file.name : 'Upload PDF (optional)'}
                  </label>
                </div>
              </div>

              {editingId && (
                <textarea
                  rows="3"
                  placeholder="Reason for changes (required)"
                  value={changeSummary}
                  onChange={e => setChangeSummary(e.target.value)}
                  style={{ width:'100%', padding:10, borderRadius:6, border:'1px solid #e5e7eb', fontSize:14, marginBottom:16 }}
                />
              )}

              <Button onClick={handleSaveForm}>Save Form</Button>
            </Modal>
          </OverlayFixed>
        )}

        {/* Link Coverage Modal */}
        {linkCoverageModalOpen && (
          <OverlayFixed onClick={() => setLinkCoverageModalOpen(false)}>
            <Modal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Link Form to Coverages</ModalTitle>
                <CloseBtn onClick={() => setLinkCoverageModalOpen(false)}>✕</CloseBtn>
              </ModalHeader>
              <p style={{ margin:'8px 0 12px' }}>
                Form:&nbsp;<strong>{selectedForm?.formName || selectedForm?.formNumber}</strong>
              </p>
              <div style={{ marginBottom: 8 }}>
                <TextInput
                  placeholder="Search coverages..."
                  value={coverageSearch}
                  onChange={e => setCoverageSearch(e.target.value)}
                />
              </div>
              <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                <Button variant="ghost" onClick={() => setLinkCoverageIds(
                  coverages
                    .filter(c => (!productId || c.productId === selectedForm.productId))
                    .filter(c => c.name.toLowerCase().includes(coverageSearch.toLowerCase()))
                    .map(c => c.id)
                )}>Select All</Button>
                <Button variant="ghost" onClick={() => setLinkCoverageIds([])}>Clear All</Button>
              </div>
              <div style={{ maxHeight:220, overflowY:'auto', border:'1px solid #E5E7EB', borderRadius:4, padding:8 }}>
                {coverages
                  .filter(c => (!productId || c.productId === selectedForm.productId))
                  .filter(c => c.name.toLowerCase().includes(coverageSearch.toLowerCase()))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(c => (
                    <label key={c.id} style={{ display:'block', padding:4 }}>
                      <input
                        type="checkbox"
                        value={c.id}
                        checked={linkCoverageIds.includes(c.id)}
                        onChange={e => {
                          const val = e.target.value;
                          setLinkCoverageIds(prev =>
                            prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
                          );
                        }}
                      />{' '}
                      {c.name}
                    </label>
                ))}
              </div>
              <div style={{ marginTop:16, display:'flex', gap:12 }}>
                <Button onClick={handleLinkCoverage}>Save</Button>
                <Button variant="ghost" onClick={() => setLinkCoverageModalOpen(false)}>Cancel</Button>
              </div>
            </Modal>
          </OverlayFixed>
        )}

        {/* Link Products Modal */}
        {linkProductModalOpen && (
          <OverlayFixed onClick={() => setLinkProductModalOpen(false)}>
            <Modal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Link Form to Products</ModalTitle>
                <CloseBtn onClick={() => setLinkProductModalOpen(false)}>✕</CloseBtn>
              </ModalHeader>

              <p style={{ margin:'8px 0 12px' }}>
                Form:&nbsp;<strong>{selectedForm?.formName || selectedForm?.formNumber}</strong>
              </p>

              <div style={{ marginBottom: 8 }}>
                <TextInput
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                />
              </div>

              <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                <Button variant="ghost" onClick={() => setLinkProductIds(
                  products
                    .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                    .map(p => p.id)
                )}>Select All</Button>
                <Button variant="ghost" onClick={() => setLinkProductIds([])}>Clear All</Button>
              </div>

              <div style={{ maxHeight:220, overflowY:'auto', border:'1px solid #E5E7EB', borderRadius:4, padding:8 }}>
                {products
                  .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(p => (
                    <label key={p.id} style={{ display:'block', padding:4 }}>
                      <input
                        type="checkbox"
                        value={p.id}
                        checked={linkProductIds.includes(p.id)}
                        onChange={e => {
                          const val = e.target.value;
                          setLinkProductIds(prev =>
                            prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
                          );
                        }}
                      />{' '}
                      {p.name}
                    </label>
                ))}
              </div>

              <div style={{ marginTop:16, display:'flex', gap:12 }}>
                <Button onClick={handleLinkProducts}>Save</Button>
                <Button variant="ghost" onClick={() => setLinkProductModalOpen(false)}>Cancel</Button>
              </div>
            </Modal>
          </OverlayFixed>
        )}




      </MainContent>
    </ModernContainer>
  );
}