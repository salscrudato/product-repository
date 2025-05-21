// src/components/CoverageScreen.js
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import _ from 'lodash';
import { useParams, useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  onSnapshot,
  query,
  where,
  limit,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { Page, Container, PageHeader, Title } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';
import VersionControlSidebar, { SIDEBAR_WIDTH } from './VersionControlSidebar';
import styled, { keyframes } from 'styled-components';
import {
  Overlay,
  Modal,
  ModalHeader,
  ModalTitle,
  CloseBtn
} from '../components/ui/Table';
import {
  ArrowUpTrayIcon,
  InformationCircleIcon,
  LinkIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  ClockIcon
} from '@heroicons/react/24/solid';
// lazy imported when needed
import { ArrowDownTrayIcon as DownloadIcon20, ArrowUpTrayIcon as UploadIcon20 } from '@heroicons/react/20/solid';
import { makeCoverageSheet } from '../utils/xlsx';
import { sheetToCoverageObjects } from '../utils/xlsx';
  // XLSX import handler for per-product import (for ProductHub)
  // (no-op here, but present for completeness)

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
  right: calc(16px + var(--vc-offset, 0));
  width: 45px;
  height: 45px;
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

// Transparent backdrop that collapses the sidebar when clicked
const VcBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: transparent;
  z-index: 1090;             /* just beneath sidebar (1100) */
  cursor: default;
`;

/* Wide modal for more spacious editing */
const WideModal = styled(Modal)`
  max-width: 820px;
  width: 90%;
`;

/* Gradient pill‑button used for “Add Coverage” */
const AddFab = styled.button`
  margin: 32px 0 8px;            /* extra breathing room below table */
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

const ExportBtn = styled(AddFab)`
  margin: 0;                 /* align with existing buttons */
  padding: 8px 18px;
  font-size: 14px;
  box-shadow: 0 3px 8px rgba(124, 92, 255, 0.3);
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

// Format a number string as money (e.g., 10000 -> "10,000")
const fmtMoney = n => {
  if (n === '' || n === null || n === undefined) return '';
  const num = Number(String(n).replace(/[^0-9]/g, ''));
  return Number.isFinite(num) ? num.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '';
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
  const fileInputRef = useRef(null);
  const searchRef = useRef(null);
  const [coverages, setCoverages] = useState([]);
  const [forms, setForms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  // memo maps
  const formMap = useMemo(
    () => Object.fromEntries(forms.map(f => [f.id, f.formName || f.formNumber || 'Unnamed Form'])),
    [forms]
  );
  const [rawSearch, setRawSearch] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(rawSearch.trim()), 250);
    return () => clearTimeout(id);
  }, [rawSearch]);
  const filteredCoverages = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return coverages.filter(c =>
      !q ||
      (c.name || '').toLowerCase().includes(q) ||
      (c.coverageCode || '').toLowerCase().includes(q) ||
      (c.category || '').toLowerCase().includes(q)
    );
  }, [coverages, searchQuery]);
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

  // Push VC sidebar width to a CSS var so global fixed elements (e.g. profile icon) can react
  useEffect(() => {
    document.body.style.setProperty('--vc-offset', historyOpen ? `${SIDEBAR_WIDTH}px` : '0');
    return () => document.body.style.removeProperty('--vc-offset');
  }, [historyOpen]);
  const [changeSummary, setChangeSummary] = useState('');
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [deductibleModalOpen, setDeductibleModalOpen] = useState(false);
  const [currentCoverage, setCurrentCoverage] = useState(null);
  const [limitData, setLimitData] = useState([]);
  const [deductibleData, setDeductibleData] = useState([]);
  const [limitItCode, setLimitItCode] = useState('');
  const [deductibleItCode, setDeductibleItCode] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);

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

      /* --- query coverages --- */
      const baseQ = parentCoverageId
        ? query(
            collection(db, `products/${productId}/coverages`),
            where('parentCoverageId', '==', parentCoverageId),
            limit(500)
          )
        : query(
            collection(db, `products/${productId}/coverages`),
            where('parentCoverageId', '==', null),
            limit(500)
          );
      const allSnap = await getDocs(baseQ);
      const allCoverages = allSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      allCoverages.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      // For subCounts, fetch all docs (could be optimized, but keep for now)
      let subCounts = {};
      try {
        const allDocsSnap = await getDocs(collection(db, `products/${productId}/coverages`));
        const allDocs = allDocsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        allDocs.forEach(c => {
          if (c.parentCoverageId) {
            subCounts[c.parentCoverageId] =
              (subCounts[c.parentCoverageId] || 0) + 1;
          }
        });
      } catch {}
      setCoverages(
        allCoverages.map(c => ({
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
      // (removed console.log)

      /* --- product / parent‑coverage names --- */
      const productDoc = await getDoc(doc(db, 'products', productId));
      if (productDoc.exists()) {
        setProductName(productDoc.data().name);
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
      // console.error('Error loading coverages', err);
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
  const openAddModal = () => {
    resetForm();
    setAddModalOpen(true);
  };
  const openEditModal = coverage => {
    setForm({
      name: coverage.name || '',
      coverageCode: coverage.coverageCode || '',
      formIds: coverage.formIds || [],
      limits: coverage.limits || [],
      deductibles: coverage.deductibles || [],
      states: coverage.states || [],
      category: coverage.category || ''
    });
    setEditingId(coverage.id);
    setChangeSummary('');
    setAddModalOpen(true);
  };
  const openLimitModal = coverage => {
    setCurrentCoverage(coverage);
    setLimitData((coverage.limits || []).map(l => String(typeof l === 'object' ? l.value ?? '' : l)));
    setLimitItCode(coverage.limitsItCode || '');
    setLimitModalOpen(true);
  };

  const openDeductibleModal = coverage => {
    setCurrentCoverage(coverage);
    setDeductibleData((coverage.deductibles || []).map(d => String(typeof d === 'object' ? d.value ?? '' : d)));
    setDeductibleItCode(coverage.deductiblesItCode || '');
    setDeductibleModalOpen(true);
  };

  /* ---------- XLSX helpers ---------- */

  // List of all 50 U.S. state abbreviations
  const ALL_STATES = [
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
    'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
    'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
  ];

  const handleExportXLSX = async () => {
    try {
      const XLSXmod = await import('xlsx');
      const XLSX = XLSXmod.default || XLSXmod;
      const fsMod = await import('file-saver');
      const saveAs = fsMod.saveAs || fsMod.default;   // works for both ESM / CJS builds

      const ws = makeCoverageSheet(coverages);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Coverages');
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([buf], { type: 'application/octet-stream' }), `coverages_${productName}.xlsx`);
    } catch (err) {
      alert('Failed to export: ' + err.message);
    }
  };

  const handleImportXLSX = async e => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      /* --- parse workbook --- */
      const XLSXmod = await import('xlsx');
      const XLSX = XLSXmod.default || XLSXmod;
      const buf = await file.arrayBuffer();
      const ws = XLSX.read(buf).Sheets[XLSX.read(buf).SheetNames[0]];
      const rows = sheetToCoverageObjects(ws);           // includes parentCoverageCode

      // enrich rows -> derive `category` + `states[]`
      const enrichedRows = rows.map(r => {
        // category column may be named exactly 'Category' (case‑insensitive)
        const category = r.Category || r.category || '';

        // gather state columns flagged truthy (e.g. "Y", "Yes", "1", true)
        const states = ALL_STATES.filter(st => {
          const cellVal = r[st];
          if (cellVal === undefined || cellVal === null) return false;
          const v = String(cellVal).trim().toLowerCase();
          return v === 'y' || v === 'yes' || v === '1' || v === 'true';
        });

        return {
          ...r,
          category,
          states
        };
      });

      /* --- basic validation --- */
      const bad = enrichedRows.filter(r => !r.name || !r.coverageCode);
      if (bad.length) {
        alert('Rows missing Coverage Name or Coverage Code. Fix sheet and retry.');
        return;
      }

      /* --- 1) pull existing coverages by coverageCode --- */
      const codeToId = {};
      const codes = enrichedRows.map(r => r.coverageCode);
      // Firestore 'in' is max 10 values – chunk array
      const chunk = (arr, n) => {
        const out = [];
        for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
        return out;
      };
      for (const slice of chunk(codes, 10)) {
        const snap = await getDocs(
          query(
            collection(db, `products/${productId}/coverages`),
            where('coverageCode', 'in', slice)
          )
        );
        snap.docs.forEach(d => (codeToId[d.data().coverageCode] = d.id));
      }

      /* --- 2) batch create / update up to 500 per commit --- */
      const makeBatch = () => writeBatch(db);
      let batch = makeBatch();
      let opCount = 0;

      const commitIfFull = async () => {
        if (opCount >= 450) {
          await batch.commit();
          batch = makeBatch();
          opCount = 0;
        }
      };

      for (const r of enrichedRows) {
        const parentId = r.parentCoverageCode
          ? codeToId[r.parentCoverageCode] || null
          : null;

        if (codeToId[r.coverageCode]) {
          // update existing
          batch.set(
            doc(db, `products/${productId}/coverages`, codeToId[r.coverageCode]),
            {
              ...r,
              parentCoverageId: parentId,
              productId,
              updatedAt: serverTimestamp()
            },
            { merge: true }
          );
        } else {
          // create new
          const newRef = doc(collection(db, `products/${productId}/coverages`));
          batch.set(newRef, {
            ...r,
            productId,
            parentCoverageId: parentId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          codeToId[r.coverageCode] = newRef.id; // so later rows can link as parent
        }
        opCount++;
        await commitIfFull();
      }
      await batch.commit();

      alert('Import complete – coverages added/updated!');
      loadCoverages();
    } catch (err) {
      console.error(err);
      alert('Import failed: ' + err.message);
    } finally {
      e.target.value = ''; // reset file input
    }
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

  // --- helpers to persist limits / deductibles ------------------------
  const saveLimits = async () => {
    if (!currentCoverage) return;
    const clean = limitData.filter(v => v !== '');
    await updateDoc(
      doc(db, `products/${productId}/coverages`, currentCoverage.id),
      { limits: clean, limitsItCode: limitItCode }
    );
    await loadCoverages();
    setLimitModalOpen(false);
  };

  const saveDeductibles = async () => {
    if (!currentCoverage) return;
    const clean = deductibleData.filter(v => v !== '');
    await updateDoc(
      doc(db, `products/${productId}/coverages`, currentCoverage.id),
      { deductibles: clean, deductiblesItCode: deductibleItCode }
    );
    await loadCoverages();
    setDeductibleModalOpen(false);
  };

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

        <TextInput
          placeholder="Search coverages by name or code…"
          ref={searchRef}
          value={rawSearch}
          onChange={e => setRawSearch(e.target.value)}
          style={{ marginBottom: 24, width: '100%', maxWidth: 480, borderRadius: 32, paddingLeft: 20 }}
        />

        <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:20 }}>
          <ExportBtn onClick={handleExportXLSX}>
            <DownloadIcon20 width={16} style={{ marginRight: 4 }} />
            Export&nbsp;XLSX
          </ExportBtn>

          {/* --- Import XLSX --- */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xls,.xlsx"
            style={{ display: 'none' }}
            onChange={handleImportXLSX}
          />
          <Button
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            title="Import coverages from Excel"
          >
            <UploadIcon20 width={16} className="mr-1" />
            Import&nbsp;XLSX
          </Button>
        </div>

        {coverages.length > 0 ? (
          <>
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
                {filteredCoverages.map(coverage => (
                  <Tr key={coverage.id}>
                    <Td>{coverage.name}</Td>
                    <Td>{coverage.coverageCode}</Td>
                    <Td>{coverage.category || '-'}</Td>

                    {/* Limits */}
                    <Td align="center">
                      <Button variant="ghost" onClick={() => openLimitModal(coverage)} aria-label="Edit limits">
                        Limits{coverage.limits && coverage.limits.length > 0 ? ` (${coverage.limits.length})` : ''}
                      </Button>
                    </Td>

                    {/* Deductibles */}
                    <Td align="center">
                      <Button variant="ghost" onClick={() => openDeductibleModal(coverage)} aria-label="Edit deductibles">
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

                    {/* Actions */}
                    <Td>
                      <Actions>
                        <Button variant="ghost" onClick={() => openEditModal(coverage)} aria-label="Edit coverage">
                          <PencilIcon width={20} height={20} />
                        </Button>
                        <Button variant="danger" onClick={() => handleDelete(coverage.id)} aria-label="Delete coverage">
                          <TrashIcon width={20} height={20} />
                        </Button>
                      </Actions>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </>
        ) : (
          <>
            <p>No coverages found. {searchQuery ? 'Try a different search term.' : 'Add a coverage to get started.'}</p>
          </>
        )}

        {/* “Add coverage” FAB below table, left‑aligned */}
        <AddFab onClick={openAddModal} aria-label="Add coverage">
          <PlusIcon width={16} height={16} />
          <span>Add&nbsp;Coverage</span>
        </AddFab>

        {/* ----- Limits Modal ----- */}
        {limitModalOpen && (
          <Overlay onClick={() => setLimitModalOpen(false)}>
            <WideModal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Manage Limits for {currentCoverage?.name}</ModalTitle>
                <CloseBtn onClick={() => setLimitModalOpen(false)}>
                  <XMarkIcon width={20} height={20} />
                </CloseBtn>
              </ModalHeader>

              <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 16 }}>
                {limitData.map((lim, idx) => (
                  <div key={idx} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'center' }}>
                    <TextInput
                      value={lim}
                      onChange={e =>
                        setLimitData(d => d.map((row,i)=> i===idx ? e.target.value.replace(/[^0-9]/g,'') : row))
                      }
                      onBlur={() =>
                        setLimitData(d => d.map((row,i)=> i===idx ? fmtMoney(row) : row))
                      }
                      style={{ flex:1 }}
                    />
                    <Button variant="ghost" style={{ color:'#dc2626' }}
                      onClick={()=> setLimitData(d => d.filter((_,i)=> i!==idx))}>
                      <TrashIcon width={16} height={16}/>
                    </Button>
                  </div>
                ))}
              </div>

              <Actions>
                <Button onClick={() => setLimitData(d => [...d, ''])}>
                  Add Limit
                </Button>
                <Button onClick={saveLimits}>Save</Button>
                <Button variant="ghost" onClick={() => setLimitModalOpen(false)}>
                  Cancel
                </Button>
              </Actions>
            </WideModal>
          </Overlay>
        )}

        {/* ----- Deductibles Modal ----- */}
        {deductibleModalOpen && (
          <Overlay onClick={() => setDeductibleModalOpen(false)}>
            <WideModal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Manage Deductibles for {currentCoverage?.name}</ModalTitle>
                <CloseBtn onClick={() => setDeductibleModalOpen(false)}>
                  <XMarkIcon width={20} height={20} />
                </CloseBtn>
              </ModalHeader>

              <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 16 }}>
                {deductibleData.map((ded, idx) => (
                  <div key={idx} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'center' }}>
                    <TextInput
                      value={ded}
                      onChange={e =>
                        setDeductibleData(d => d.map((row,i)=> i===idx ? e.target.value.replace(/[^0-9]/g,'') : row))
                      }
                      onBlur={() =>
                        setDeductibleData(d => d.map((row,i)=> i===idx ? fmtMoney(row) : row))
                      }
                      style={{ flex:1 }}
                    />
                    <Button variant="ghost" style={{ color:'#dc2626' }}
                      onClick={()=> setDeductibleData(d => d.filter((_,i)=> i!==idx))}>
                      <TrashIcon width={16} height={16}/>
                    </Button>
                  </div>
                ))}
              </div>

              <Actions>
                <Button onClick={() => setDeductibleData(d => [...d, ''])}>
                  Add Deductible
                </Button>
                <Button onClick={saveDeductibles}>Save</Button>
                <Button variant="ghost" onClick={() => setDeductibleModalOpen(false)}>
                  Cancel
                </Button>
              </Actions>
            </WideModal>
          </Overlay>
        )}

        {/* ----- Add / Edit Coverage Modal ----- */}
        {addModalOpen && (
          <Overlay onClick={() => setAddModalOpen(false)}>
            <WideModal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>{editingId ? 'Edit Coverage' : 'Add Coverage'}</ModalTitle>
                <CloseBtn onClick={() => setAddModalOpen(false)}>
                  <XMarkIcon width={20} height={20}/>
                </CloseBtn>
              </ModalHeader>

              <div style={{ display:'flex', flexDirection:'column', gap:14, marginTop:8 }}>
                <TextInput
                  placeholder="Coverage Name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
                <TextInput
                  placeholder="Coverage Code"
                  value={form.coverageCode}
                  onChange={e => setForm({ ...form, coverageCode: e.target.value })}
                />
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  style={{ padding:10, borderRadius:6, border:'1px solid #e5e7eb', fontSize:14 }}
                >
                  <option value="Base Coverage">Base Coverage</option>
                  <option value="Endorsement Coverage">Endorsement Coverage</option>
                </select>
                {editingId && (
                  <textarea
                    rows="3"
                    placeholder="Reason for changes (required)"
                    value={changeSummary}
                    onChange={e => setChangeSummary(e.target.value)}
                    style={{ width:'100%', padding:10, borderRadius:6, border:'1px solid #e5e7eb', fontSize:14 }}
                  />
                )}
                <Actions>
                  <Button onClick={handleAddOrUpdate}>{editingId ? 'Update' : 'Add'}</Button>
                  <Button variant="ghost" onClick={() => setAddModalOpen(false)}>Cancel</Button>
                </Actions>
              </div>
            </WideModal>
          </Overlay>
        )}

        <HistoryButton
          onClick={() => setHistoryOpen(o => !o)}
          aria-label="View version history"
        >
          <ClockIcon width={25} height={25} />
        </HistoryButton>
        <VersionControlSidebar
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          productId={productId}
        />
        {historyOpen && (
          <VcBackdrop onClick={() => setHistoryOpen(false)} />
        )}
      </Container>
    </Page>
  );
}