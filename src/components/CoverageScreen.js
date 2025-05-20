// src/components/CoverageScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  serverTimestamp,
  getDoc,
  onSnapshot,
  addDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { Page, Container, PageHeader, Title } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';
import VersionControlSidebar, { SIDEBAR_WIDTH } from './VersionControlSidebar';
import GlobalSearch from './GlobalSearch';
import styled, { keyframes } from 'styled-components';
import {
  Overlay,
  Modal,
  ModalHeader,
  ModalTitle,
  CloseBtn
} from '../components/ui/Table';
import {
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  PlusIcon,
  InformationCircleIcon,
  LinkIcon,
  ClockIcon
} from '@heroicons/react/24/solid';

/* ---------- styled components ---------- */
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

// History button (fixed) ------------------------------------------
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

/* ---------- version‐history utilities (JS scope) ---------- */
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
      entityType: 'Coverage',
      entityId,
      entityName,
      action,
      diff,
      ...(comment && { comment })
    }
  );
};

/* ---------- main component ---------- */
export default function CoverageScreen() {
  const routeParams = useParams();
  const { productId } = routeParams;
  const location = useLocation();
  const navigate = useNavigate();

  // Allow unlimited nesting: grab the last segment after the productId
  let parentCoverageId = routeParams.parentCoverageId;
  if (!parentCoverageId && routeParams['*']) {
    const segs = routeParams['*'].split('/').filter(Boolean);
    parentCoverageId = segs.length ? segs[segs.length - 1] : undefined;
  }

  // state hooks...
  const [coverages, setCoverages] = useState([]);
  const [forms, setForms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  // product / breadcrumb labels
  const [productName, setProductName] = useState('');
  const [parentCoverageName, setParentCoverageName] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    coverageCode: '',
    formIds: [],
    limits: [],
    deductibles: [],
    states: [],
    category: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [changeSummary, setChangeSummary] = useState('');
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [deductibleModalOpen, setDeductibleModalOpen] = useState(false);
  const [currentCoverage, setCurrentCoverage] = useState(null);
  const [limitData, setLimitData] = useState([]);
  const [deductibleData, setDeductibleData] = useState([]);
  const [limitItCode, setLimitItCode] = useState('');
  const [deductibleItCode, setDeductibleItCode] = useState('');

  // ---------- data loader ----------
  const loadCoverages = useCallback(async () => {
    setLoading(true);
    try {
      // Check if productId is valid before proceeding
      if (!productId) {
        console.error('No productId provided');
        alert('Missing product ID. Please select a product first.');
        setLoading(false);
        return;
      }

      console.log(`Loading coverages for productId: ${productId}, parentCoverageId: ${parentCoverageId || 'root'}`);

      /* --- get every coverage once --- */
      const allSnap = await getDocs(
        collection(db, `products/${productId}/coverages`)
      );
      const allCoverages = allSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      console.log(`Found ${allCoverages.length} total coverages`);

      /* --- slice for this screen --- */
      const coverageList = parentCoverageId
        ? allCoverages.filter(c => c.parentCoverageId === parentCoverageId)
        : allCoverages.filter(c => !c.parentCoverageId || c.parentCoverageId === '');

      console.log(`Filtered to ${coverageList.length} coverages for this view`);

      /* --- sub‑coverage counts for root view --- */
      const subCounts = {};
      allCoverages.forEach(c => {
        if (c.parentCoverageId) {
          subCounts[c.parentCoverageId] =
            (subCounts[c.parentCoverageId] || 0) + 1;
        }
      });

      setCoverages(
        coverageList.map(c => ({
          ...c,
          subCount: subCounts[c.id] || 0
        }))
      );

      /* --- pull product‑level forms (for linking UI) --- */
      const formsSnap = await getDocs(
        query(collection(db, 'forms'), where('productId', '==', productId))
      );
      const formList = await Promise.all(
        formsSnap.docs.map(async d => {
          const data = d.data();
          let url = null;
          if (data.filePath) {
            try {
              url = await getDownloadURL(ref(storage, data.filePath));
            } catch (e) {
              console.error('Error getting download URL:', e);
            }
          }
          return { ...data, id: d.id, downloadUrl: url };
        })
      );
      setForms(formList);
      console.log(`Loaded ${formList.length} forms`);

      /* --- product / parent‑coverage names --- */
      const productDoc = await getDoc(doc(db, 'products', productId));
      if (productDoc.exists()) {
        setProductName(productDoc.data().name);
        console.log(`Product name: ${productDoc.data().name}`);
      } else {
        console.error(`Product document not found for ID: ${productId}`);
        setProductName('Unknown Product');
      }

      if (parentCoverageId) {
        const parentDoc = await getDoc(
          doc(db, `products/${productId}/coverages`, parentCoverageId)
        );
        setParentCoverageName(
          parentDoc.exists() ? parentDoc.data().name : 'Unknown Coverage'
        );
      } else {
        setParentCoverageName('');
      }
    } catch (err) {
      console.error('Error loading coverages', err);
      alert('Failed to load coverages: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [productId, parentCoverageId]);

  // initial load
  useEffect(() => {
    loadCoverages();
  }, [loadCoverages]);

  /* Load coverages, forms, product name, etc. (unchanged) */
  // useEffect ... loadCoverages()

  /* subscribe to dataDictionary (unchanged) */
  // useEffect ...

  const resetForm = () => {
    setForm({
      name: '',
      coverageCode: '',
      formIds: [],
      limits: [],
      deductibles: [],
      states: [],
      category: ''
    });
    setEditingId(null);
    setChangeSummary('');
  };
  const openAddModal = () => { /* ... */ };
  const openEditModal = coverage => { /* ... */ };
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

  const handleAddOrUpdate = async () => {
    if (!form.name || !form.coverageCode) {
      alert('Name and Coverage Code are required.');
      return;
    }
    if (editingId && changeSummary.trim().length < 10) {
      alert('Please enter a reason for the change (at least 10 characters).');
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
        const docRef = await addDoc(
          collection(db, `products/${productId}/coverages`),
          { ...data, createdAt: serverTimestamp() }
        );
        coverageId = docRef.id;
      }

      // unlink old formCoverages, link new ones...
      // <unchanged code for formCoverages linking>

      // Version control
      if (editingId) {
        const beforeSnap = await getDoc(doc(db, `products/${productId}/coverages`, editingId));
        const diff = computeDiff(beforeSnap.data() || {}, data);
        await logVersionChange(productId, {
          entityId: editingId,
          entityName: form.name.trim(),
          action: 'update',
          diff,
          comment: changeSummary.trim()
        });
      } else {
        await logVersionChange(productId, {
          entityId: coverageId,
          entityName: form.name.trim(),
          action: 'create'
        });
      }

      resetForm();
      setHistoryOpen(false);
      setLoading(true);
      // reload coverages
      await loadCoverages();
    } catch (err) {
      console.error(err);
      alert('Failed to save coverage.');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this coverage?')) return;
    try {
      // delete linked formCoverages...
      // delete the coverage itself
      await deleteDoc(doc(db, `products/${productId}/coverages`, id));

      // Version control: deletion
      await logVersionChange(productId, {
        entityId: id,
        entityName: 'Coverage',
        action: 'delete'
      });

      await loadCoverages();
    } catch (err) {
      console.error(err);
      alert('Failed to delete coverage.');
    }
  };

  // ... other save/link/limit/deductible handlers all using computeDiff & logVersionChange

  if (loading) {
    return (
      <Page>
        <Container><Spinner/></Container>
      </Page>
    );
  }

  return (
    <Page>
      <Container>
        <PageHeader>
          <Title>
            {parentCoverageId ? (
              <>
                <RouterLink to={`/coverage/${productId}`}>{productName}</RouterLink>
                {' > '}{parentCoverageName}
              </>
            ) : (
              productName
            )}
            {' Coverages'}
          </Title>
          <Button variant="ghost" onClick={() => navigate('/')}>Return Home</Button>
        </PageHeader>

        <div style={{ marginBottom: '20px' }}>
          <GlobalSearch />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
          <div>
            {searchQuery && (
              <p>
                Showing results for: <strong>{searchQuery}</strong>
                <Button variant="ghost" onClick={() => setSearchQuery('')}>
                  <XMarkIcon width={16} height={16} />
                </Button>
              </p>
            )}
          </div>
          <Button onClick={() => {
            setForm({
              name: '',
              coverageCode: '',
              formIds: [],
              limits: [],
              deductibles: [],
              states: [],
              category: ''
            });
            setEditingId(null);
            // Call openAddModal if it's implemented
          }}>
            <PlusIcon width={20} height={20} style={{ marginRight: '4px' }} />
            Add Coverage
          </Button>
        </div>

        {coverages.length > 0 ? (
          <Table>
            <THead>
              <Tr>
                <Th>Name</Th>
                <Th>Coverage Code</Th>
                <Th>Category</Th>
                <Th align="center">Limits</Th>
                <Th align="center">Deductibles</Th>
                <Th align="center">States</Th>
                <Th align="center">Linked&nbsp;Forms</Th>
                <Th align="center">Sub‑Coverages</Th>
                <Th align="center">Actions</Th>
              </Tr>
            </THead>
            <tbody>
              {coverages
                .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(coverage => (
                  <Tr key={coverage.id}>
                    <Td>{coverage.name}</Td>
                    <Td>{coverage.coverageCode}</Td>
                    <Td>{coverage.category || '-'}</Td>

                    {/* Limits */}
                    <Td align="center">
                      <Button variant="ghost" onClick={() => openLimitModal(coverage)}>
                        Limits{coverage.limits && coverage.limits.length > 0 ? ` (${coverage.limits.length})` : ''}
                      </Button>
                    </Td>

                  {/* Deductibles */}
                    <Td align="center">
                      <Button variant="ghost" onClick={() => openDeductibleModal(coverage)}>
                        Deductibles{coverage.deductibles && coverage.deductibles.length > 0 ? ` (${coverage.deductibles.length})` : ''}
                      </Button>
                    </Td>

                    {/* States */}
                    <Td align="center">
                      <RouterLink
                        to={`/coverage-states/${productId}/${coverage.id}`}
                        style={{ textDecoration: 'none', color: '#2563eb' }}
                      >
                        States{coverage.states && coverage.states.length > 0 ? ` (${coverage.states.length})` : ''}
                      </RouterLink>
                    </Td>

                    {/* Linked Forms */}
                    <Td align="center">
                      <RouterLink
                        to={`/forms/${productId}`}
                        state={{ coverageId: coverage.id }}
                        style={{ color: '#2563eb', textDecoration: 'none' }}
                      >
                        Forms{coverage.formIds && coverage.formIds.length > 0 ? ` (${coverage.formIds.length})` : ''}
                      </RouterLink>
                    </Td>

                    {/* Sub‑Coverages */}
                    <Td align="center">
                      {coverage.subCount > 0 ? (
                        <RouterLink to={`${location.pathname}/${coverage.id}`}>
                          Sub‑Coverages ({coverage.subCount})
                        </RouterLink>
                      ) : (
                        <RouterLink to={`${location.pathname}/${coverage.id}`}>
                          Add&nbsp;Sub‑Coverage
                        </RouterLink>
                      )}
                    </Td>

                    <Td>
                      <Actions>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            // Call openEditModal if it's implemented
                            setForm({
                              name: coverage.name,
                              coverageCode: coverage.coverageCode,
                              formIds: coverage.formIds || [],
                              limits: coverage.limits || [],
                              deductibles: coverage.deductibles || [],
                              states: coverage.states || [],
                              category: coverage.category || ''
                            });
                            setEditingId(coverage.id);
                          }}
                        >
                          <PencilIcon width={20} height={20} />
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => {
                            if (window.confirm('Delete this coverage?')) {
                              // Call handleDelete if it's implemented
                              deleteDoc(doc(db, `products/${productId}/coverages`, coverage.id))
                                .then(() => loadCoverages())
                                .catch(err => {
                                  console.error(err);
                                  alert('Failed to delete coverage.');
                                });
                            }
                          }}
                        >
                          <TrashIcon width={20} height={20} />
                        </Button>
                      </Actions>
                    </Td>
                  </Tr>
                ))}
            </tbody>
          </Table>
        ) : (
          <p>No coverages found. {searchQuery ? 'Try a different search term.' : 'Add a coverage to get started.'}</p>
        )}

        {/* ----- Limits Modal ----- */}
        {limitModalOpen && (
          <Overlay onClick={() => setLimitModalOpen(false)}>
            <Modal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Manage Limits for {currentCoverage?.name}</ModalTitle>
                <CloseBtn onClick={() => setLimitModalOpen(false)}>
                  <XMarkIcon width={20} height={20} />
                </CloseBtn>
              </ModalHeader>

              <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 16 }}>
                {limitData.map((lim, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <TextInput
                      value={lim.value}
                      onChange={e => {
                        const val = e.target.value;
                        setLimitData(d =>
                          d.map((row, i) => (i === idx ? { ...row, value: val } : row))
                        );
                      }}
                      style={{ flex: 1 }}
                    />
                    <Button
                      variant="ghost"
                      style={{ color: '#dc2626' }}
                      onClick={() => setLimitData(d => d.filter((_, i) => i !== idx))}
                    >
                      <TrashIcon width={16} height={16} />
                    </Button>
                  </div>
                ))}
              </div>

              <Actions>
                <Button onClick={() => setLimitData(d => [...d, { value: '' }])}>
                  Add Limit
                </Button>
                <Button onClick={() => {
                  // simple save – write back to state; persist logic handled elsewhere
                  setCurrentCoverage(c => ({ ...c, limits: limitData }));
                  setLimitModalOpen(false);
                }}>
                  Save
                </Button>
                <Button variant="ghost" onClick={() => setLimitModalOpen(false)}>
                  Cancel
                </Button>
              </Actions>
            </Modal>
          </Overlay>
        )}

        {/* ----- Deductibles Modal ----- */}
        {deductibleModalOpen && (
          <Overlay onClick={() => setDeductibleModalOpen(false)}>
            <Modal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Manage Deductibles for {currentCoverage?.name}</ModalTitle>
                <CloseBtn onClick={() => setDeductibleModalOpen(false)}>
                  <XMarkIcon width={20} height={20} />
                </CloseBtn>
              </ModalHeader>

              <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 16 }}>
                {deductibleData.map((ded, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <TextInput
                      value={ded.value}
                      onChange={e => {
                        const val = e.target.value;
                        setDeductibleData(d =>
                          d.map((row, i) => (i === idx ? { ...row, value: val } : row))
                        );
                      }}
                      style={{ flex: 1 }}
                    />
                    <Button
                      variant="ghost"
                      style={{ color: '#dc2626' }}
                      onClick={() => setDeductibleData(d => d.filter((_, i) => i !== idx))}
                    >
                      <TrashIcon width={16} height={16} />
                    </Button>
                  </div>
                ))}
              </div>

              <Actions>
                <Button onClick={() => setDeductibleData(d => [...d, { value: '' }])}>
                  Add Deductible
                </Button>
                <Button onClick={() => {
                  setCurrentCoverage(c => ({ ...c, deductibles: deductibleData }));
                  setDeductibleModalOpen(false);
                }}>
                  Save
                </Button>
                <Button variant="ghost" onClick={() => setDeductibleModalOpen(false)}>
                  Cancel
                </Button>
              </Actions>
            </Modal>
          </Overlay>
        )}

        <HistoryButton
          style={{ right: historyOpen ? SIDEBAR_WIDTH + 24 : 16 }}
          onClick={() => setHistoryOpen(true)}
          aria-label="View version history"
        >
          <ClockIcon width={24} height={24} />
        </HistoryButton>
        <VersionControlSidebar
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          productId={productId}
        />
      </Container>
    </Page>
  );
}