import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import { db, storage } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { TrashIcon, DocumentTextIcon, PlusIcon, XMarkIcon, LinkIcon, ClockIcon } from '@heroicons/react/24/solid';
import VersionControlSidebar, { SIDEBAR_WIDTH } from './VersionControlSidebar';
import { auth } from '../firebase';
import { Page, Container } from '../components/ui/Layout';
import { PageHeader, Title } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';
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

import styled, { keyframes } from 'styled-components';

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


export default function FormsScreen() {
  const { productId } = useParams();
  const location = useLocation();
  const { coverageId } = location.state || {};
  const navigate = useNavigate();

  const [forms, setForms] = useState([]);
  const [products, setProducts] = useState([]);
  const [coverages, setCoverages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal & form state for adding a new form
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [type, setType] = useState('ISO');
  const [category, setCategory] = useState('Base Coverage Form');
  const [selectedProduct, setSelectedProduct] = useState(productId || '');
  const [selectedCoverages, setSelectedCoverages] = useState([]);
  const [file, setFile] = useState(null);

  // State for linking coverages to an existing form
  const [linkCoverageModalOpen, setLinkCoverageModalOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [linkCoverageIds, setLinkCoverageIds] = useState([]);

  // Version history sidebar
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        // Fetch products
        const pSnap = await getDocs(collection(db, 'products'));
        const productList = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setProducts(productList);

        // Fetch coverages
        let coverageList = [];
        if (productId) {
          const cSnap = await getDocs(collection(db, `products/${productId}/coverages`));
          coverageList = cSnap.docs.map(d => ({ id: d.id, ...d.data(), productId }));
        } else {
          for (const product of productList) {
            const cSnap = await getDocs(collection(db, `products/${product.id}/coverages`));
            const productCoverages = cSnap.docs.map(d => ({ id: d.id, ...d.data(), productId: product.id }));
            coverageList = [...coverageList, ...productCoverages];
          }
        }
        setCoverages(coverageList);

        // Fetch forms
        const fSnap = await getDocs(collection(db, 'forms'));
        const formList = await Promise.all(fSnap.docs.map(async d => {
          const data = d.data();
          let url = null;
          if (data.filePath) {
            try { url = await getDownloadURL(ref(storage, data.filePath)); } catch {}
          }
          return { ...data, id: d.id, downloadUrl: url };
        }));
        setForms(formList);
      } catch (err) {
        console.error(err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [productId]);

  const productMap = Object.fromEntries(products.map(p => [p.id, p.name]));
  const coverageMap = Object.fromEntries(coverages.map(c => [c.id, c.name]));

  const filteredForms = forms.filter(f => {
    const matchesSearch = (f.formName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         f.formNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProduct = productId ? f.productId === productId : true;
    return matchesSearch && matchesProduct;
  });

  const handleAddForm = async () => {
    if (!formNumber || !effectiveDate || !selectedProduct || !file) {
      alert('Please fill in Form Number, Effective Date, Product, and upload a file.');
      return;
    }
    try {
      const storageRef = ref(storage, `forms/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      const payload = {
        formName: formName || null,
        formNumber,
        formEditionDate: effectiveDate,
        effectiveDate,
        type,
        category,
        productId: selectedProduct,
        coverageIds: selectedCoverages,
        filePath: storageRef.fullPath,
        downloadUrl
      };
      const docRef = await addDoc(collection(db, 'forms'), payload);
      const formId = docRef.id;

      // Version history log – create
      await addDoc(
        collection(db, 'products', selectedProduct, 'versionHistory'),
        {
          userEmail: auth.currentUser?.email || 'unknown',
          ts: serverTimestamp(),
          entityType: 'Form',
          entityId: formId,
          entityName: formName || formNumber,
          action: 'create'
        }
      );

      for (const coverageId of selectedCoverages) {
        await addDoc(collection(db, 'formCoverages'), {
          formId,
          coverageId,
          productId: selectedProduct,
        });

        const coverageDoc = await getDoc(doc(db, `products/${selectedProduct}/coverages`, coverageId));
        if (coverageDoc.exists()) {
          const currentFormIds = coverageDoc.data().formIds || [];
          if (!currentFormIds.includes(formId)) {
            await updateDoc(doc(db, `products/${selectedProduct}/coverages`, coverageId), {
              formIds: [...currentFormIds, formId]
            });
          }
        }
      }

      setFormName('');
      setFormNumber('');
      setEffectiveDate('');
      setType('ISO');
      setCategory('Base Coverage Form');
      setSelectedProduct(productId || '');
      setSelectedCoverages([]);
      setFile(null);
      setShowModal(false);

      const snap = await getDocs(collection(db, 'forms'));
      const formList = await Promise.all(snap.docs.map(async d => {
        const data = d.data();
        let url = null;
        if (data.filePath) {
          try { url = await getDownloadURL(ref(storage, data.filePath)); } catch {}
        }
        return { ...data, id: d.id, downloadUrl: url };
      }));
      setForms(formList);
    } catch (err) {
      console.error(err);
      alert('Failed to add form.');
    }
  };

  const handleDeleteForm = async id => {
    if (!window.confirm('Are you sure you want to delete this form?')) return;
    try {
      const formDoc = forms.find(f => f.id === id);
      if (formDoc) {
        const linksQuery = query(
          collection(db, 'formCoverages'),
          where('formId', '==', id)
        );
        const linksSnap = await getDocs(linksQuery);
        for (const linkDoc of linksSnap.docs) {
          const linkData = linkDoc.data();
          const coverageId = linkData.coverageId;
          const coverageDoc = await getDoc(doc(db, `products/${formDoc.productId}/coverages`, coverageId));
          if (coverageDoc.exists()) {
            const currentFormIds = coverageDoc.data().formIds || [];
            await updateDoc(doc(db, `products/${formDoc.productId}/coverages`, coverageId), {
              formIds: currentFormIds.filter(fid => fid !== id)
            });
          }
          await deleteDoc(doc(db, 'formCoverages', linkDoc.id));
        }
        // Version history log – delete
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

  const openLinkCoverageModal = async (form) => {
    setSelectedForm(form);
    setLinkCoverageIds(form.coverageIds || []);
    setLinkCoverageModalOpen(true);
  };

  const handleLinkCoverage = async () => {
    if (!selectedForm) return;
    try {
      const formId = selectedForm.id;
      const productId = selectedForm.productId;

      // Delete existing linkages for this form
      const existingLinksQuery = query(
        collection(db, 'formCoverages'),
        where('formId', '==', formId)
      );
      const existingLinksSnap = await getDocs(existingLinksQuery);
      for (const linkDoc of existingLinksSnap.docs) {
        const linkData = linkDoc.data();
        const coverageId = linkData.coverageId;
        const coverageDoc = await getDoc(doc(db, `products/${productId}/coverages`, coverageId));
        if (coverageDoc.exists()) {
          const currentFormIds = coverageDoc.data().formIds || [];
          await updateDoc(doc(db, `products/${productId}/coverages`, coverageId), {
            formIds: currentFormIds.filter(fid => fid !== formId)
          });
        }
        await deleteDoc(doc(db, 'formCoverages', linkDoc.id));
      }

      // Add new linkages
      for (const coverageId of linkCoverageIds) {
        await addDoc(collection(db, 'formCoverages'), {
          formId,
          coverageId,
          productId,
        });

        const coverageDoc = await getDoc(doc(db, `products/${productId}/coverages`, coverageId));
        if (coverageDoc.exists()) {
          const currentFormIds = coverageDoc.data().formIds || [];
          if (!currentFormIds.includes(formId)) {
            await updateDoc(doc(db, `products/${productId}/coverages`, coverageId), {
              formIds: [...currentFormIds, formId]
            });
          }
        }
      }

      // Update the form's coverageIds
      await updateDoc(doc(db, 'forms', formId), {
        coverageIds: linkCoverageIds
      });

      // Version history log – update
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

      // Refresh forms
      const snap = await getDocs(collection(db, 'forms'));
      const formList = await Promise.all(snap.docs.map(async d => {
        const data = d.data();
        let url = null;
        if (data.filePath) {
          try { url = await getDownloadURL(ref(storage, data.filePath)); } catch {}
        }
        return { ...data, id: d.id, downloadUrl: url };
      }));
      setForms(formList);
    } catch (err) {
      console.error(err);
      alert('Failed to link coverages to form.');
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
  if (error) {
    return (
      <Page>
        <Container>
          {error}
        </Container>
      </Page>
    );
  }

  const title = coverageId && coverageMap[coverageId]
    ? `Forms for ${coverageMap[coverageId]}`
    : productId && productMap[productId]
      ? `Forms for ${productMap[productId]}`
      : 'Forms';

  return (
    <Page>
      <Container>
        <PageHeader>
          <Title>{title}</Title>
          <Button variant="ghost" onClick={() => navigate('/')}>
            Return Home
          </Button>
        </PageHeader>
        <TextInput
          placeholder="Search forms by name or number..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ marginBottom: 24 }}
        />
        <Button onClick={() => setShowModal(true)} style={{ marginBottom: 24 }}>
          <PlusIcon width={16} height={16} style={{ marginRight: 4 }}/> Add New Form
        </Button>
        {filteredForms.length > 0 ? (
          <div style={{ overflowX: 'auto', marginBottom: 24 }}>
            <Table>
              <THead>
                <Tr>
                  <Th style={{ width: '15%' }}>Name</Th>
                  <Th style={{ width: '20%' }}>Number&nbsp;–&nbsp;Edition</Th>
                  <Th style={{ width: '10%' }}>Type</Th>
                  <Th style={{ width: '15%' }}>Category</Th>
                  <Th style={{ width: '15%' }}>Product</Th>
                  <Th style={{ width: '15%' }}>Coverages</Th>
                  <Th style={{ width: '10%' }}>Link to Coverages</Th>
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
                    <Td>{productMap[f.productId] || '—'}</Td>
                    <Td align="center">
                      {f.coverageIds && f.coverageIds.length > 0
                        ? `Coverages (${f.coverageIds.length})`
                        : '—'}
                    </Td>
                    <Td>
                      <Button variant="ghost" onClick={() => openLinkCoverageModal(f)} title="Link to Coverages">
                        <LinkIcon width={16} height={16}/>
                      </Button>
                    </Td>
                    <Td>
                      <Button variant="ghost" onClick={() => handleDeleteForm(f.id)} title="Delete form">
                        <TrashIcon width={16} height={16}/>
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', fontSize: 16, color: '#6B7280' }}>No forms found</p>
        )}
        {showModal && (
          <Overlay>
            <Modal>
              <CloseBtn onClick={() => setShowModal(false)}>
                <XMarkIcon width={16} height={16}/>
              </CloseBtn>
              <ModalTitle>Add New Form</ModalTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#1F2937', marginBottom: 8 }}>
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
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#1F2937', marginBottom: 8 }}>
                    Link Coverages (optional)
                  </label>
                  <TextInput
                    as="select"
                    multiple
                    value={selectedCoverages}
                    onChange={e => setSelectedCoverages(Array.from(e.target.selectedOptions, option => option.value))}
                  >
                    {coverages
                      .filter(c => !productId || c.productId === productId)
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </TextInput>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#1F2937', marginBottom: 8 }}>
                    Form Name (optional)
                  </label>
                  <TextInput
                    placeholder="Form Name"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#1F2937', marginBottom: 8 }}>
                    Form Number*
                  </label>
                  <TextInput
                    placeholder="Form Number"
                    value={formNumber}
                    onChange={e => setFormNumber(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#1F2937', marginBottom: 8 }}>
                    Effective Date (MM/YY)*
                  </label>
                  <TextInput
                    placeholder="MM/YY"
                    value={effectiveDate}
                    onChange={e => setEffectiveDate(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#1F2937', marginBottom: 8 }}>
                    Type
                  </label>
                  <TextInput as="select" value={type} onChange={e => setType(e.target.value)}>
                    <option value="ISO">ISO</option>
                    <option value="Proprietary">Proprietary</option>
                    <option value="NAICS">NAICS</option>
                    <option value="Other">Other</option>
                  </TextInput>
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#1F2937', marginBottom: 8 }}>
                    Category
                  </label>
                  <TextInput as="select" value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="Base Coverage Form">Base Coverage Form</option>
                    <option value="Endorsement">Endorsement</option>
                    <option value="Exclusion">Exclusion</option>
                    <option value="Dec/Quote Letter">Dec/Quote Letter</option>
                    <option value="Notice">Notice</option>
                    <option value="Other">Other</option>
                  </TextInput>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#1F2937', marginBottom: 8 }}>
                    Upload PDF*
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf"
                    style={{ display: 'none' }}
                    onChange={e => setFile(e.target.files[0])}
                  />
                  <label
                    htmlFor="file-upload"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: 12,
                      border: '1px dashed #D1D5DB',
                      borderRadius: 8,
                      cursor: 'pointer',
                      color: '#6B7280',
                      fontSize: 14,
                      ...(file ? { color: '#1D4ED8', borderColor: '#1D4ED8' } : {}),
                    }}
                  >
                    <DocumentTextIcon width={20} height={20}/>
                    {file ? file.name : 'Upload PDF'}
                  </label>
                </div>
              </div>
              <Button onClick={handleAddForm}>Save Form</Button>
            </Modal>
          </Overlay>
        )}
        {linkCoverageModalOpen && (
          <Overlay>
            <Modal>
              <CloseBtn onClick={() => setLinkCoverageModalOpen(false)}>
                <XMarkIcon width={16} height={16}/>
              </CloseBtn>
              <ModalTitle>Link Form to Coverages</ModalTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#1F2937', marginBottom: 8 }}>
                    Form: {selectedForm?.formName || selectedForm?.formNumber}
                  </label>
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#1F2937', marginBottom: 8 }}>
                    Select Coverages
                  </label>
                  {/* Select All / Clear All */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <Button variant="ghost" onClick={() => setLinkCoverageIds(coverages.map(c => c.id))}>
                      Select All
                    </Button>
                    <Button variant="ghost" onClick={() => setLinkCoverageIds([])}>
                      Clear All
                    </Button>
                  </div>
                  {/* Checkbox list */}
                  <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 4 }}>
                    {coverages
                      .filter(c => !productId || c.productId === productId)
                      .map(c => (
                        <label key={c.id} style={{ display:'block', padding:8 }}>
                          <input
                            type="checkbox"
                            value={c.id}
                            checked={linkCoverageIds.includes(c.id)}
                            onChange={e => {
                              const val = e.target.value;
                              setLinkCoverageIds(prev =>
                                prev.includes(val)
                                  ? prev.filter(x => x !== val)
                                  : [...prev, val]
                              );
                            }}
                          />
                          <span style={{ marginLeft:8 }}>{c.name}</span>
                        </label>
                      ))}
                  </div>
                </div>
              </div>
              <Button onClick={handleLinkCoverage}>Link Coverages</Button>
            </Modal>
          </Overlay>
        )}
        <HistoryButton
          style={{ right: historyOpen ? SIDEBAR_WIDTH + 24 : 16 }}
          onClick={() => setHistoryOpen(true)}
          aria-label="Version history"
        >
          <ClockIcon width={24} height={24}/>
        </HistoryButton>
        <VersionControlSidebar
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          productId={productId || selectedProduct}
        />
      </Container>
    </Page>
  );
}