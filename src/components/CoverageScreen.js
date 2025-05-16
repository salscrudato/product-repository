import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, getDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Page, Container, PageHeader, Title } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';
import { Link as RouterLink } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { PencilIcon, TrashIcon, XMarkIcon, PlusIcon, InformationCircleIcon, LinkIcon } from '@heroicons/react/24/solid';
import GlobalSearch from './GlobalSearch';
// --- ProductHub shared styled components ---
const Table = styled.table`
  width: 100%;
  background: ${({ theme }) => theme.colours.bg};
  border-radius: ${({ theme }) => theme.radius};
  border-collapse: collapse;
  box-shadow: ${({ theme }) => theme.shadow};
`;
const THead = styled.thead`
  background: ${({ theme }) => theme.colours.tableHeader};
`;
const Tr = styled.tr`
  border-bottom: 1px solid #e5e7eb;
`;
const Th = styled.th`
  padding: 12px;
  text-align: ${({ align = 'left' }) => align};
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
`;
const Td = styled.td`
  padding: 12px;
  text-align: ${({ align = 'left' }) => align};
  font-size: 14px;
`;
const Actions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
`;

// Overlay, Modal, ModalHeader, ModalTitle, CloseBtn (from ProductHub)
const Overlay = styled.div`
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.18);
  display: flex;
  align-items: center;
  justify-content: center;
`;
const Modal = styled.div`
  background: ${({ theme }) => theme.colours.bg};
  border-radius: ${({ theme }) => theme.radius};
  box-shadow: ${({ theme }) => theme.shadow};
  padding: 32px 32px 24px 32px;
  min-width: 360px;
  max-width: 95vw;
  min-height: 0;
  position: relative;
`;
const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;
const ModalTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
`;
const CloseBtn = styled(Button).attrs(() => ({
  variant: 'ghost',
  'aria-label': 'Close'
}))`
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 4px;
  min-width: unset;
  min-height: unset;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

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

export default function CoverageScreen() {
  const { productId, parentCoverageId } = useParams();
  const navigate = useNavigate();
  const [coverages, setCoverages] = useState([]);
  const [forms, setForms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    coverageCode: '',
    formIds: [],
    limits: [],
    deductibles: [],
    states: [],
    category: 'Base Coverage',
  });
  const [editingId, setEditingId] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [linkFormModalOpen, setLinkFormModalOpen] = useState(false);
  const [selectedCoverage, setSelectedCoverage] = useState(null);
  const [linkFormIds, setLinkFormIds] = useState([]);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [deductibleModalOpen, setDeductibleModalOpen] = useState(false);
  const [currentCoverage, setCurrentCoverage] = useState(null);
  const [limitData, setLimitData] = useState([]);
  const [deductibleData, setDeductibleData] = useState([]);
  const [moreDetailsModalOpen, setMoreDetailsModalOpen] = useState(false);
  const [selectedCoverageDetails, setSelectedCoverageDetails] = useState(null);
  const [productName, setProductName] = useState('');
  const [parentCoverageName, setParentCoverageName] = useState('');

  // Data‑dictionary IT codes used for the “Upstream ID” dropdown
  const [itCodes, setItCodes] = useState([]);
  // Single IT Code selectors for limits/deductibles
  const [limitItCode, setLimitItCode] = useState('');
  const [deductibleItCode, setDeductibleItCode] = useState('');

  const loadCoverages = async () => {
    setLoading(true);
    try {
      let q;
      if (parentCoverageId) {
        q = query(
          collection(db, `products/${productId}/coverages`),
          where('parentCoverageId', '==', parentCoverageId)
        );
      } else {
        q = query(
          collection(db, `products/${productId}/coverages`),
          where('parentCoverageId', '==', null)
        );
      }
      const querySnapshot = await getDocs(q);
      const coverageList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // compute sub-coverage counts for each root coverage
      let subCounts = {};
      if (!parentCoverageId) {
        const allCovSnap = await getDocs(collection(db, `products/${productId}/coverages`));
        allCovSnap.docs.forEach(d => {
          const data = d.data();
          if (data.parentCoverageId) {
            subCounts[data.parentCoverageId] = (subCounts[data.parentCoverageId] || 0) + 1;
          }
        });
      }
      const coverageListWithCounts = coverageList.map(c => ({
        ...c,
        subCount: subCounts[c.id] || 0
      }));
      setCoverages(coverageListWithCounts);

      const formsQuery = query(collection(db, 'forms'), where('productId', '==', productId));
      const formsSnap = await getDocs(formsQuery);
      const formList = await Promise.all(formsSnap.docs.map(async d => {
        const data = d.data();
        let url = null;
        if (data.filePath) {
          try { url = await getDownloadURL(ref(storage, data.filePath)); } catch {}
        }
        return { ...data, id: d.id, downloadUrl: url };
      }));
      setForms(formList);

      const productDoc = await getDoc(doc(db, 'products', productId));
      setProductName(productDoc.exists() ? productDoc.data().name : 'Unknown Product');

      if (parentCoverageId) {
        const parentCoverageDoc = await getDoc(doc(db, `products/${productId}/coverages`, parentCoverageId));
        setParentCoverageName(parentCoverageDoc.exists() ? parentCoverageDoc.data().name : 'Unknown Coverage');
      } else {
        setParentCoverageName('');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading coverages:', error);
      alert('Failed to load coverages.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoverages();
  }, [productId, parentCoverageId]);

  // subscribe once – cleans up on unmount
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'dataDictionary'), snap => {
      const codes = snap.docs
        .map(d => {
          const data = d.data();
          // prefer “code”, fall back to “itCode” for backward‑compat
          return data.code || data.itCode || null;
        })
        .filter(Boolean);
      setItCodes([...new Set(codes)].sort());
    }, err => console.error('dataDictionary listener', err));
    return unsub;
  }, []);

  const resetForm = () => {
    setForm({
      name: '',
      coverageCode: '',
      formIds: [],
      limits: [],
      deductibles: [],
      states: [],
      category: 'Base Coverage',
    });
    setEditingId(null);
  };

  const openAddModal = () => {
    resetForm();
    setAddModalOpen(true);
  };

  const openEditModal = coverage => {
    setEditingId(coverage.id);
    setForm({
      name: coverage.name || '',
      coverageCode: coverage.coverageCode || '',
      formIds: coverage.formIds || [],
      limits: coverage.limits || [],
      deductibles: coverage.deductibles || [],
      states: coverage.states || [],
      category: coverage.category || 'Base Coverage',
    });
    setAddModalOpen(true);
  };

  const openLinkFormModal = coverage => {
    setSelectedCoverage(coverage);
    setLinkFormIds(coverage.formIds || []);
    setLinkFormModalOpen(true);
  };

  const handleAddOrUpdate = async () => {
    if (!form.name || !form.coverageCode) {
      alert('Name and Coverage Code are required.');
      return;
    }
    try {
      const data = {
        name: form.name.trim(),
        coverageCode: form.coverageCode.trim(),
        formIds: form.formIds,
        productId,
        parentCoverageId: parentCoverageId || null,
        limits: form.limits,
        deductibles: form.deductibles,
        states: form.states,
        category: form.category,
        updatedAt: serverTimestamp(),
      };
      let coverageId;
      if (editingId) {
        await updateDoc(doc(db, `products/${productId}/coverages`, editingId), data);
        coverageId = editingId;
      } else {
        const docRef = await addDoc(collection(db, `products/${productId}/coverages`), {
          ...data,
          createdAt: serverTimestamp(),
        });
        coverageId = docRef.id;
      }

      const existingLinksQuery = query(
        collection(db, 'formCoverages'),
        where('coverageId', '==', coverageId)
      );
      const existingLinksSnap = await getDocs(existingLinksQuery);
      existingLinksSnap.forEach(async linkDoc => {
        await deleteDoc(doc(db, 'formCoverages', linkDoc.id));
      });

      for (const formId of form.formIds) {
        await addDoc(collection(db, 'formCoverages'), {
          formId,
          coverageId,
          productId,
        });
      }

      setAddModalOpen(false);
      resetForm();
      loadCoverages();
    } catch (error) {
      console.error('Error adding/updating coverage:', error);
      alert('Failed to save coverage.');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this coverage?')) return;
    try {
      const linksQuery = query(
        collection(db, 'formCoverages'),
        where('coverageId', '==', id)
      );
      const linksSnap = await getDocs(linksQuery);
      linksSnap.forEach(async linkDoc => {
        await deleteDoc(doc(db, 'formCoverages', linkDoc.id));
      });

      await deleteDoc(doc(db, `products/${productId}/coverages`, id));
      loadCoverages();
    } catch (error) {
      console.error('Error deleting coverage:', error);
      alert('Failed to delete coverage.');
    }
  };

  const handleLinkForm = async () => {
    if (!selectedCoverage) return;
    try {
      const existingLinksQuery = query(
        collection(db, 'formCoverages'),
        where('coverageId', '==', selectedCoverage.id)
      );
      const existingLinksSnap = await getDocs(existingLinksQuery);
      existingLinksSnap.forEach(async linkDoc => {
        await deleteDoc(doc(db, 'formCoverages', linkDoc.id));
      });

      for (const formId of linkFormIds) {
        await addDoc(collection(db, 'formCoverages'), {
          formId,
          coverageId: selectedCoverage.id,
          productId,
        });
      }

      await updateDoc(doc(db, `products/${productId}/coverages`, selectedCoverage.id), {
        formIds: linkFormIds,
      });

      setLinkFormModalOpen(false);
      setSelectedCoverage(null);
      setLinkFormIds([]);
      loadCoverages();
    } catch (error) {
      console.error('Error linking forms to coverage:', error);
      alert('Failed to link forms to coverage.');
    }
  };

  const openLimitModal = coverage => {
    setCurrentCoverage(coverage);
    setLimitData(coverage.limits || []);
    setLimitItCode(coverage.limitsItCode || '');
    setLimitModalOpen(true);
  };

  const openDeductibleModal = coverage => {
    setCurrentCoverage(coverage);
    setDeductibleData(coverage.deductibles || []);
    setDeductibleItCode(coverage.deductiblesItCode || '');
    setDeductibleModalOpen(true);
  };

  const formatNumber = (value) => {
    const number = parseFloat(value.replace(/,/g, ''));
    if (isNaN(number)) return '';
    return number.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  const handleLimitChange = (e, index) => {
    const { value } = e.target;
    const formattedValue = formatNumber(value);
    const newLimits = [...limitData];
    newLimits[index].value = formattedValue;
    setLimitData(newLimits);
  };

  const handleDeductibleChange = (e, index) => {
    const { value } = e.target;
    const formattedValue = formatNumber(value);
    const newDeductibles = [...deductibleData];
    newDeductibles[index].value = formattedValue;
    setDeductibleData(newDeductibles);
  };

  const handleLimitPaste = (e, index) => {
    const pastedData = e.clipboardData.getData('Text').trim();
    const rows = pastedData.split('\n').map(row => row.split('\t'));
    const newLimits = [...limitData];
    rows.forEach((row, rowIndex) => {
      const formattedValue = formatNumber(row[0]);
      if (index + rowIndex < newLimits.length) {
        newLimits[index + rowIndex].value = formattedValue;
      } else if (row[0]) {
        newLimits.push({ value: formattedValue, itCode: '', ruleId: null });
      }
    });
    setLimitData(newLimits);
  };


  const handleDeductiblePaste = (e, index) => {
    const pastedData = e.clipboardData.getData('Text').trim();
    const rows = pastedData.split('\n').map(row => row.split('\t'));
    const newDeductibles = [...deductibleData];
    rows.forEach((row, rowIndex) => {
      const formattedValue = formatNumber(row[0]);
      if (index + rowIndex < newDeductibles.length) {
        newDeductibles[index + rowIndex].value = formattedValue;
      } else if (row[0]) {
        newDeductibles.push({ value: formattedValue, itCode: '', ruleId: null });
      }
    });
    setDeductibleData(newDeductibles);
  };

  const saveLimits = async () => {
    try {
      await updateDoc(doc(db, `products/${productId}/coverages`, currentCoverage.id), {
        limits: limitData,
        limitsItCode: limitItCode,
        updatedAt: serverTimestamp(),
      });
      setLimitModalOpen(false);
      loadCoverages();
    } catch (error) {
      console.error('Error saving limits:', error);
      alert('Failed to save limits.');
    }
  };

  const saveDeductibles = async () => {
    try {
      await updateDoc(doc(db, `products/${productId}/coverages`, currentCoverage.id), {
        deductibles: deductibleData,
        deductiblesItCode: deductibleItCode,
        updatedAt: serverTimestamp(),
      });
      setDeductibleModalOpen(false);
      loadCoverages();
    } catch (error) {
      console.error('Error saving deductibles:', error);
      alert('Failed to save deductibles.');
    }
  };

  const handleOpenMoreDetails = coverage => {
    setSelectedCoverageDetails(coverage);
    setMoreDetailsModalOpen(true);
  };

  const filtered = coverages
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const formMap = Object.fromEntries(
    forms.map(f => [f.id, f.formName || f.formNumber || 'Unnamed Form'])
  );

  if (loading) {
    return (
      <Page>
        <Container>
          <Spinner />
        </Container>
      </Page>
    );
  }

  return (
    <Page>
      <Container>
        <PageHeader>
          <Title>
            {parentCoverageId
              ? `Sub Coverages for ${parentCoverageName}`
              : `Coverages for ${productName}`}
          </Title>
          <Button variant="ghost" onClick={() => navigate('/')}>Return Home</Button>
        </PageHeader>

        <TextInput
          placeholder="Search coverages by name…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ marginBottom: 16 }}
        />

        <Button onClick={openAddModal} style={{ marginBottom: 24 }}>
          <PlusIcon width={16} height={16} style={{ marginRight: 4 }}/>
          {parentCoverageId ? 'Add Sub Coverage' : 'Add Coverage'}
        </Button>

        {filtered.length ? (
          <div style={{ marginBottom: 32, overflowX: 'auto' }}>
            <Table>
              <THead>
                <Tr>
                  <Th>Coverage Name</Th>
                  <Th align="center">Details</Th>
                  <Th align="center">Limits</Th>
                  <Th align="center">Deductibles</Th>
                  <Th align="center">States</Th>
                  {!parentCoverageId && <Th align="center">Sub Coverages</Th>}
                  <Th align="center">Linked Forms</Th>
                  <Th align="center">Actions</Th>
                </Tr>
              </THead>
              <tbody>
                {filtered.map(c => (
                  <Tr key={c.id}>
                    <Td>
                      <span>{c.name}</span>
                    </Td>
                    <Td align="center">
                      <Button variant="ghost" onClick={() => handleOpenMoreDetails(c)}>
                        <InformationCircleIcon width={16} height={16} style={{ marginRight: 4 }}/>
                        Details
                      </Button>
                    </Td>
                    <Td align="center">
                      <Button variant="ghost" onClick={() => openLimitModal(c)}>
                        Limits{c.limits && c.limits.length > 0 ? ` (${c.limits.length})` : ''}
                      </Button>
                    </Td>
                    <Td align="center">
                      <Button variant="ghost" onClick={() => openDeductibleModal(c)}>
                        Deductibles{c.deductibles && c.deductibles.length > 0 ? ` (${c.deductibles.length})` : ''}
                      </Button>
                    </Td>
                    <Td align="center">
                      <RouterLink to={`/coverage-states/${productId}/${c.id}`} style={{ textDecoration: 'none', color: '#2563eb' }}>
                        States{c.states && c.states.length > 0 ? ` (${c.states.length})` : ''}
                      </RouterLink>
                    </Td>
                    {!parentCoverageId && (
                      <Td align="center">
                        <RouterLink to={`/coverage/${productId}/${c.id}`} style={{ textDecoration: 'none', color: '#2563eb' }}>
                          Sub Coverages{c.subCount > 0 ? ` (${c.subCount})` : ''}
                        </RouterLink>
                      </Td>
                    )}
                    <Td align="center">
                      <RouterLink
                        to={`/forms/${productId}`}
                        state={{ coverageId: c.id }}
                        style={{ color: '#2563eb', textDecoration: 'none' }}
                      >
                        Linked Forms{c.formIds && c.formIds.length > 0 ? ` (${c.formIds.length})` : ''}
                      </RouterLink>
                    </Td>
                    <Td align="center">
                      <Actions>
                        <Button variant="ghost" onClick={() => openEditModal(c)}>
                          <PencilIcon width={16} height={16} />
                        </Button>
                        <Button variant="ghost" style={{ color: '#dc2626' }} onClick={() => handleDelete(c.id)}>
                          <TrashIcon width={16} height={16} />
                        </Button>
                      </Actions>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <div style={{ padding: 32, color: '#888' }}>No coverages found.</div>
        )}

        {/* Add/Edit Coverage Modal */}
        {addModalOpen && (
          <Overlay onClick={() => setAddModalOpen(false)}>
            <Modal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>
                  {editingId ? 'Edit Coverage' : parentCoverageId ? 'Add Sub Coverage' : 'Add New Coverage'}
                </ModalTitle>
                <CloseBtn onClick={() => setAddModalOpen(false)}>
                  <XMarkIcon width={20} height={20} />
                </CloseBtn>
              </ModalHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <TextInput
                  placeholder="Coverage Name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
                <select
                  value={form.coverageCode}
                  onChange={e => setForm({ ...form, coverageCode: e.target.value })}
                  style={{ padding: 10, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 14 }}
                >
                  <option value="">Select IT Code</option>
                  {itCodes.map(code => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  style={{ padding: 10, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 14 }}
                >
                  <option value="Base Coverage">Base Coverage</option>
                  <option value="Endorsement Coverage">Endorsement Coverage</option>
                </select>
                <select
                  multiple
                  value={form.formIds}
                  onChange={e => setForm({ ...form, formIds: Array.from(e.target.selectedOptions, option => option.value) })}
                  style={{ padding: 10, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 14, minHeight: 80 }}
                >
                  {forms.map(f => (
                    <option key={f.id} value={f.id}>{f.formName || f.formNumber}</option>
                  ))}
                </select>
                <Actions>
                  <Button onClick={handleAddOrUpdate}>{editingId ? 'Update' : 'Add'}</Button>
                  <Button variant="ghost" onClick={() => setAddModalOpen(false)}>Cancel</Button>
                </Actions>
              </div>
            </Modal>
          </Overlay>
        )}

        {/* Link Form Modal */}
        {linkFormModalOpen && (
          <Overlay onClick={() => setLinkFormModalOpen(false)}>
            <Modal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Link Coverage to Forms</ModalTitle>
                <CloseBtn onClick={() => setLinkFormModalOpen(false)}>
                  <XMarkIcon width={20} height={20} />
                </CloseBtn>
              </ModalHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 14, color: '#444', marginBottom: 2 }}>
                  Coverage: <b>{selectedCoverage?.name}</b>
                </div>
                <select
                  multiple
                  value={linkFormIds}
                  onChange={e => setLinkFormIds(Array.from(e.target.selectedOptions, option => option.value))}
                  style={{ padding: 10, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 14, minHeight: 80 }}
                >
                  {forms.map(f => (
                    <option key={f.id} value={f.id}>{f.formName || f.formNumber}</option>
                  ))}
                </select>
                <Actions>
                  <Button onClick={handleLinkForm}>Link Forms</Button>
                  <Button variant="ghost" onClick={() => setLinkFormModalOpen(false)}>Cancel</Button>
                </Actions>
              </div>
            </Modal>
          </Overlay>
        )}

        {/* Limits Modal */}
        {limitModalOpen && (
          <Overlay onClick={() => setLimitModalOpen(false)}>
            <Modal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Manage Limits for {currentCoverage?.name}</ModalTitle>
                <CloseBtn onClick={() => setLimitModalOpen(false)}>
                  <XMarkIcon width={20} height={20} />
                </CloseBtn>
              </ModalHeader>
              {/* Single IT Code selector */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: '#444' }}>IT Code&nbsp;</label>
                <select
                  value={limitItCode}
                  onChange={e => setLimitItCode(e.target.value)}
                  style={{ padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 13, minWidth: 140 }}
                >
                  <option value="">Select</option>
                  {itCodes.map(code => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 16, overflowX: 'auto' }}>
                <Table>
                  <THead>
                    <Tr>
                      <Th>Amount</Th>
                      <Th align="center">Actions</Th>
                    </Tr>
                  </THead>
                  <tbody>
                    {limitData.map((limit, index) => (
                      <Tr key={index}>
                        <Td>
                          <TextInput
                            value={limit.value}
                            onChange={e => handleLimitChange(e, index)}
                            onPaste={e => handleLimitPaste(e, index)}
                          />
                        </Td>
                        <Td align="center">
                          <Button variant="ghost" style={{ color: '#dc2626' }}
                            onClick={() => {
                              const newLimits = limitData.filter((_, i) => i !== index);
                              setLimitData(newLimits);
                            }}
                          >
                            <TrashIcon width={16} height={16} />
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <Actions>
                <Button onClick={() => setLimitData([...limitData, { value: '', ruleId: null }])}>
                  Add Limit
                </Button>
                <Button onClick={saveLimits}>Save Limits</Button>
                <Button variant="ghost" onClick={() => setLimitModalOpen(false)}>Cancel</Button>
              </Actions>
            </Modal>
          </Overlay>
        )}

        {/* Deductibles Modal */}
        {deductibleModalOpen && (
          <Overlay onClick={() => setDeductibleModalOpen(false)}>
            <Modal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Manage Deductibles for {currentCoverage?.name}</ModalTitle>
                <CloseBtn onClick={() => setDeductibleModalOpen(false)}>
                  <XMarkIcon width={20} height={20} />
                </CloseBtn>
              </ModalHeader>
              {/* Single IT Code selector */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: '#444' }}>IT Code&nbsp;</label>
                <select
                  value={deductibleItCode}
                  onChange={e => setDeductibleItCode(e.target.value)}
                  style={{ padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 13, minWidth: 140 }}
                >
                  <option value="">Select</option>
                  {itCodes.map(code => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 16, overflowX: 'auto' }}>
                <Table>
                  <THead>
                    <Tr>
                      <Th>Amount</Th>
                      <Th align="center">Actions</Th>
                    </Tr>
                  </THead>
                  <tbody>
                    {deductibleData.map((deductible, index) => (
                      <Tr key={index}>
                        <Td>
                          <TextInput
                            value={deductible.value}
                            onChange={e => handleDeductibleChange(e, index)}
                            onPaste={e => handleDeductiblePaste(e, index)}
                          />
                        </Td>
                        <Td align="center">
                          <Button variant="ghost" style={{ color: '#dc2626' }}
                            onClick={() => {
                              const newDeductibles = deductibleData.filter((_, i) => i !== index);
                              setDeductibleData(newDeductibles);
                            }}
                          >
                            <TrashIcon width={16} height={16} />
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <Actions>
                <Button onClick={() => setDeductibleData([...deductibleData, { value: '', ruleId: null }])}>
                  Add Deductible
                </Button>
                <Button onClick={saveDeductibles}>Save Deductibles</Button>
                <Button variant="ghost" onClick={() => setDeductibleModalOpen(false)}>Cancel</Button>
              </Actions>
            </Modal>
          </Overlay>
        )}

        {/* More Details Modal */}
        {moreDetailsModalOpen && selectedCoverageDetails && (
          <Overlay onClick={() => setMoreDetailsModalOpen(false)}>
            <Modal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Coverage Details</ModalTitle>
                <CloseBtn onClick={() => setMoreDetailsModalOpen(false)}>
                  <XMarkIcon width={20} height={20} />
                </CloseBtn>
              </ModalHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ minWidth: 130, color: '#6b7280' }}>Coverage Name:</span>
                  <span>{selectedCoverageDetails.name || '-'}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ minWidth: 130, color: '#6b7280' }}>Coverage Code:</span>
                  <span>{selectedCoverageDetails.coverageCode || '-'}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ minWidth: 130, color: '#6b7280' }}>Coverage Category:</span>
                  <span>{selectedCoverageDetails.category || 'Base Coverage'}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ minWidth: 130, color: '#6b7280' }}>Forms:</span>
                  <span>
                    {selectedCoverageDetails.formIds && selectedCoverageDetails.formIds.length > 0 ? (
                      selectedCoverageDetails.formIds.map((formId, index) => (
                        <RouterLink
                          key={index}
                          to={`/forms/${productId}`}
                          state={{ coverageId: selectedCoverageDetails.id }}
                          style={{ marginRight: 6, color: '#2563eb', textDecoration: 'none', fontSize: 13 }}
                        >
                          {formMap[formId]}
                        </RouterLink>
                      ))
                    ) : (
                      'No forms linked'
                    )}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ minWidth: 130, color: '#6b7280' }}>States:</span>
                  <span>
                    {selectedCoverageDetails.states?.length > 0 ? selectedCoverageDetails.states.join(', ') : 'N/A'}
                  </span>
                </div>
              </div>
            </Modal>
          </Overlay>
        )}
      </Container>
    </Page>
  );
}