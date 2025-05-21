import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import { db, storage } from '../firebase';
import {
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc,
  query, where, getDoc, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  TrashIcon, DocumentTextIcon, PlusIcon, XMarkIcon,
  LinkIcon, ClockIcon, PencilIcon
} from '@heroicons/react/24/solid';
import VersionControlSidebar, { SIDEBAR_WIDTH } from './VersionControlSidebar';
import { auth } from '../firebase';
import { Page, Container, PageHeader, Title } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';
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
const AddFab = styled.button`
  margin: 32px 0 8px;            /* breathing room below table */
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #7C5CFF 0%, #AA5CFF 48%, #C15CFF 100%);
  border: none;
  border-radius: 9999px;         /* pill */
  box-shadow: 0 4px 12px rgba(124, 92, 255, 0.35);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 14px rgba(124, 92, 255, 0.45);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 3px 8px rgba(124, 92, 255, 0.35);
  }
`;

const HistoryButton = styled.button`
  position: fixed;
  bottom: 16px;
  right: 16px;
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 50%;
  background: #374151;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  cursor: pointer;
  z-index: 1100;
  &:hover { background: #1f2937; }
`;

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

// --- generic diff + version‑history helpers (mirrors CoverageScreen) ---
const computeDiff = (before = {}, after = {}) => {
  const diff = {};
  Object.keys({ ...before, ...after }).forEach(k => {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      diff[k] = { before: before[k], after: after[k] };
    }
  });
  return diff;
};

const logVersionChange = async (
  productId,
  { entityId, entityName, action, diff = {}, comment = '' }
) => {
  await addDoc(
    collection(db, 'products', productId, 'versionHistory'),
    {
      userEmail: auth.currentUser?.email || 'unknown',
      ts: serverTimestamp(),
      entityType: 'Form',
      entityId,
      entityName,
      action,
      diff,
      ...(comment && { comment })
    }
  );
};

/* ---------- component ---------- */
export default function FormsScreen() {
  const { productId } = useParams();
  const location = useLocation();
  const { coverageId } = location.state || {};
  const navigate = useNavigate();

  /* data state */
  const [forms, setForms] = useState([]);
  const [products, setProducts] = useState([]);
  const [coverages, setCoverages] = useState([]);

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
  const [historyOpen, setHistoryOpen] = useState(false);

  /* push VC sidebar width to a CSS var for global fixed elements */
  useEffect(() => {
    document.body.style.setProperty('--vc-offset', historyOpen ? `${SIDEBAR_WIDTH}px` : '0');
    return () => document.body.style.removeProperty('--vc-offset');
  }, [historyOpen]);

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
        const beforeSnap = await getDoc(doc(db, 'forms', editingId));
        await updateDoc(doc(db, 'forms', editingId), payload);
        formId = editingId;
        const diff = computeDiff(beforeSnap.data() || {}, payload);
        await logVersionChange(selectedProduct, {
          entityId: formId,
          entityName: formName || formNumber,
          action: 'update',
          diff,
          comment: changeSummary.trim()
        });
      } else {
        const docRef = await addDoc(collection(db, 'forms'), {
          ...payload,
          filePath,
          downloadUrl
        });
        formId = docRef.id;
        await logVersionChange(selectedProduct, {
          entityId: formId,
          entityName: formName || formNumber,
          action: 'create'
        });
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

        /* version */
        await addDoc(
          collection(db, 'products', formDoc.productId, 'versionHistory'),
          {
            userEmail: auth.currentUser?.email || 'unknown',
            ts: serverTimestamp(),
            entityType: 'Form',
            entityId: id,
            entityName: formDoc.formName || formDoc.formNumber,
            action: 'delete'
          }
        );
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
    try {
      const formId = selectedForm.id;
      const productId = selectedForm.productId;

      /* delete old links */
      const existingLinksSnap = await getDocs(
        query(collection(db, 'formCoverages'), where('formId', '==', formId))
      );
      for (const linkDoc of existingLinksSnap.docs) {
        const { coverageId } = linkDoc.data();
        const covDoc = await getDoc(
          doc(db, `products/${productId}/coverages`, coverageId)
        );
        if (covDoc.exists()) {
          const formIds = (covDoc.data().formIds || []).filter(fid => fid !== formId);
          await updateDoc(
            doc(db, `products/${productId}/coverages`, coverageId),
            { formIds }
          );
        }
        await deleteDoc(doc(db, 'formCoverages', linkDoc.id));
      }

      /* add new links */
      for (const coverageId of linkCoverageIds) {
        await addDoc(collection(db, 'formCoverages'), {
          formId,
          coverageId,
          productId,
        });

        const covDoc = await getDoc(
          doc(db, `products/${productId}/coverages`, coverageId)
        );
        if (covDoc.exists()) {
          const formIds = covDoc.data().formIds || [];
          if (!formIds.includes(formId)) {
            await updateDoc(
              doc(db, `products/${productId}/coverages`, coverageId),
              { formIds: [...formIds, formId] }
            );
          }
        }
      }

      /* update form doc */
      await updateDoc(doc(db, 'forms', formId), { coverageIds: linkCoverageIds });

      /* version */
      await addDoc(
        collection(db, 'products', productId, 'versionHistory'),
        {
          userEmail: auth.currentUser?.email || 'unknown',
          ts: serverTimestamp(),
          entityType: 'Form',
          entityId: formId,
          entityName: selectedForm.formName || selectedForm.formNumber,
          action: 'update',
          comment: 'Updated coverage links'
        }
      );

      setLinkCoverageModalOpen(false);
      setSelectedForm(null);
      setLinkCoverageIds([]);

      /* refresh forms */
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
      alert('Failed to link coverages to form.');
    }
  };

  /* ---------- render ---------- */
  if (loading) {
    return (
      <Page>
        <Container><Spinner /></Container>
      </Page>
    );
  }
  if (error) {
    return (
      <Page>
        <Container>{error}</Container>
      </Page>
    );
  }

  const title =
    coverageId && coverageMap[coverageId]
      ? `Forms for ${coverageMap[coverageId]}`
      : productId && productMap[productId]
        ? `Forms for ${productMap[productId]}`
        : 'Forms';

  return (
    <Page>
      <Container>
        {/* header */}
        <PageHeader>
          <Title>{title}</Title>
          <Button variant="ghost" onClick={() => navigate('/')}>
            Return Home
          </Button>
        </PageHeader>

        {/* search & actions */}
        <TextInput
          placeholder="Search forms by name or number..."
          ref={searchRef}
          value={rawSearch}
          onChange={e => setRawSearch(e.target.value)}
          style={{ marginBottom: 24 }}
        />
        {/* Add New Form button replaced by AddFab below table */}

        {/* table */}
        {filteredForms.length ? (
          <div style={{ overflowX: 'auto', marginBottom: 24 }}>
            <Table>
              <THead>
                <Tr>
                  <Th style={{ width:'15%' }}>Name</Th>
                  <Th style={{ width:'20%' }}>Number&nbsp;–&nbsp;Edition</Th>
                  <Th style={{ width:'10%' }}>Type</Th>
                  <Th style={{ width:'15%' }}>Category</Th>
                  <Th style={{ width:'15%' }}>Products</Th>
                  <Th style={{ width:'15%' }}>Coverages</Th>
                  <Th style={{ width:'10%' }}>Link</Th>
                  <Th style={{ width:'10%' }}>Edit</Th>
                  <Th style={{ width:'10%' }}>Delete</Th>
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
                          style={{ color:'#2563eb', textDecoration:'underline' }}
                        >
                          {f.formName || '—'}
                        </a>
                      ) : (
                        <span style={{ color:'#6B7280' }}>{f.formName || '—'}</span>
                      )}
                    </Td>
                    <Td>{`${f.formNumber || '—'} – ${f.effectiveDate || '—'}`}</Td>
                    <Td>{f.type}</Td>
                    <Td>{f.category}</Td>
                    <Td align="center">
                      <Button variant="ghost" onClick={() => openLinkProductModal(f)}>
                        Products{f.productIds?.length ? ` (${f.productIds.length})` : ''}
                      </Button>
                    </Td>
                    <Td align="center">
                      {f.coverageIds?.length ? `Coverages (${f.coverageIds.length})` : '—'}
                    </Td>
                    <Td>
                      <Button variant="ghost" onClick={() => openLinkCoverageModal(f)} title="Link coverages">
                        <LinkIcon width={16} height={16} />
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
          </div>
        ) : (
          <p style={{ textAlign:'center', fontSize:16, color:'#6B7280' }}>No forms found</p>
        )}

        {/* Add Form gradient button below table */}
        <AddFab onClick={() => { setEditingId(null); setShowModal(true); }}>
          <PlusIcon width={16} height={16}/>
          <span>Add&nbsp;Form</span>
        </AddFab>

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
                  <TextInput
                    as="select"
                    multiple
                    value={selectedCoverages}
                    onChange={e => setSelectedCoverages(
                      Array.from(e.target.selectedOptions, o => o.value)
                    )}
                  >
                    {coverages
                      .filter(c => !productId || c.productId === productId)
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </TextInput>
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
                    onChange={e => setEffectiveDate(e.target.value)}
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
                    Upload PDF*
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
                    {file ? file.name : 'Upload PDF'}
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

              <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                <Button variant="ghost" onClick={() => setLinkProductIds(products.map(p => p.id))}>Select All</Button>
                <Button variant="ghost" onClick={() => setLinkProductIds([])}>Clear All</Button>
              </div>

              <div style={{ maxHeight:220, overflowY:'auto', border:'1px solid #E5E7EB', borderRadius:4, padding:8 }}>
                {products.map(p => (
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

        {/* ---------- version history ---------- */}
        {historyOpen && (
          <VersionControlSidebar
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            width={SIDEBAR_WIDTH}
          />
        )}

        <HistoryButton
          style={{ right: historyOpen ? SIDEBAR_WIDTH + 24 : 16 }}
          onClick={() => setHistoryOpen(!historyOpen)}
          aria-label="View version history"
        >
          <ClockIcon width={25} height={25} />
        </HistoryButton>
      </Container>
    </Page>
  );
}