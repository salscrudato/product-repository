/**
 * ProductHub – main workspace for product managers.
 *
 * Responsibilities
 *  • Display a searchable list of insurance products
 *  • Offer AI‑powered utilities (summary, chat, rules extraction, form comparison)
 *  • CRUD operations backed by Firebase (Firestore + Storage)
 *  • Real‑time collaboration via `onSnapshot`
 *  • Multiple modal workflows & a version‑history sidebar
 *
 * NOTE: File is intentionally verbose.  In production you would break this
 *       monolith into smaller hooks/components and leverage code‑splitting.
 */
import { useEffect, useState, useRef, useMemo } from 'react';
import VersionControlSidebar, { SIDEBAR_WIDTH } from './VersionControlSidebar';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Link, useLocation } from 'react-router-dom';
import {
  TrashIcon,
  PencilIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  ChatBubbleLeftEllipsisIcon,
  DocumentMagnifyingGlassIcon,
  ClockIcon,
  PlusIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/solid';
import {
  Page,
  Container,
  PageHeader,
} from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';
import GlobalSearch from '../components/GlobalSearch';
import styled, { keyframes } from 'styled-components';
import DataDictionaryModal from './DataDictionaryModal';
import BulkFormUploadModal from './BulkFormUploadModal';

/* --- lazy-load pdfjs only when needed -------------------------------- */
let pdfjsLib = null;
const loadPdfJs = async () => {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import(/* webpackChunkName: "pdfjs" */ 'pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  return pdfjsLib;
};


/* -------------------------------------------------- */
/*  Claude system instructions (passed to the helper) */
const SYSTEM_INSTRUCTIONS = `
Persona: You are an expert in P&C insurance products. Your task is to analyze the provided insurance document text and extract key information into a structured JSON format.

**Understand the following definitions:**

- **Product:** The name of the insurance product, representing a distinct insurance offering or line. It is typically defined by a base coverage form (e.g., Commercial Property product uses base form CP 00 10) that encompasses one or more core coverages. It may also include additional endorsement coverages offered under the same product but not included in the base form.
- **Coverage:** A specific provision within an insurance policy that offers protection against designated perils or risks to particular subjects, such as property, persons, or liabilities. It outlines the extent of the insurer’s obligation to compensate for covered losses, including maximum limits per occurrence and in aggregate, conditions under which coverage applies, exclusions that limit its scope, and any deductibles the insured must meet before benefits are paid.

**Instructions:**

1. **Determine the Form Category:**
   - **Base Coverage Form:** Contains one or more coverages, does not amend another document, and includes policy language such as definitions and conditions.
   - **Coverage Endorsement:** Modifies an existing insurance document, such as the base coverage form, to add new coverage to the policy.
   - **Exclusion:** Excludes coverages, terms of coverages, and other items from the policy, reducing coverage offered.
   - **Notice:** A policyholder notice explaining certain revisions and other mandatory legal disclaimers.
   - **Dec/Quote:** The cover letter of the policy explaining all the policyholder information, coverages, limits, deductibles, list of forms attached, etc.

2. **Identify All Coverages:** 
   - For each coverage, extract the following details:
     - **coverageName:** The name of the coverage. If not explicitly stated, infer based on context.
     - **scopeOfCoverage:** A description of what is covered, including specific items or scenarios.
     - **limits:** Any monetary or other limits applied to the coverage. Include specific values if available.
     - **perilsCovered:** An array of perils or risks that are covered under this coverage.
     - **enhances:** (For endorsements) An array of coverage names that this endorsement modifies or enhances. Leave empty if not applicable.
   - If the form is an endorsement, ensure to identify which coverages it enhances or modifies.

3. **Extract General Conditions and Exclusions:**
   - **generalConditions:** An array of conditions that apply to the entire document or policy.
   - **generalExclusions:** An array of exclusions that apply to the entire document or policy.
   - These should be distinct from conditions and exclusions specific to individual coverages.

**Important Guidelines:**
- Use your knowledge of insurance to interpret the text conceptually. Do not rely solely on exact wording, as phrasing can vary across insurers.
- Read the entire document, ignoring any irrelevant formatting or sections that do not pertain to coverages or general conditions/exclusions.
- Be thorough and ensure all coverages are captured, including any endorsements.
- If a coverage name is not explicitly stated, infer it based on the context.
- Do not include any information not supported by the document.
- For fields that are not applicable or not found, use an empty array for lists or an empty string for text fields.

**Output Format:**
{
  "category": "document_type",
  "coverages": [
    {
      "coverageName": "name",
      "scopeOfCoverage": "description",
      "limits": "limits_description",
      "perilsCovered": ["peril1", "peril2"],
      "enhances": ["coverage1", "coverage2"]
    }
  ],
  "generalConditions": ["condition1", "condition2"],
  "generalExclusions": ["exclusion1", "exclusion2"]
}
`;

/* ---------- system prompt for RULE extraction ---------- */
const RULES_SYSTEM_PROMPT = `
You are an insurance policy analysis assistant. Extract all **Product Rules** and **Rating Rules** from the provided document text and output them in JSON.

**Definitions**
• *Product Rules* – Eligibility / underwriting / issuance criteria or restrictions for an insurance product.  
• *Rating Rules*  – Instructions that determine premium, such as base rates, surcharges, credits, modifiers, discounts.

**Output format**
{
  "rules":[
    {
      "ruleType":"Product",
      "description":"short sentence",
      "conditions":["condition1","condition2"],
      "appliesTo":"context"
    }
  ]
}

Return **only** the JSON object. No commentary. Be concise.
`;


/* ---------- system prompt for FORM COMPARISON ---------- */
const COMPARE_SYSTEM_PROMPT = `
You are an insurance coverage-analysis assistant.

**Task**
Given two insurance policy documents (the product’s original form and an uploaded form), list all coverages, then indicate:
• coverages unique to the original form
• coverages unique to the uploaded form
• coverages common to both (treat different wording for the same concept as the same).

**Return ONLY this JSON:**
{
  "originalUnique": ["Coverage X"],
  "uploadedUnique": ["Coverage Y"],
  "commonCoverages": ["Coverage Z"]
}
Return empty arrays when a section has none.
`;

/* ---------- prompt to extract only coverage names ---------- */
const COVERAGE_LIST_PROMPT = `
You are an insurance coverage‑extraction assistant.

**Task**  
Read the supplied insurance policy text (all lines already concatenated) and return a JSON object with one key **"coverages"** whose value is an array of distinct coverage names found.  
• Omit duplicates and obvious aliases (e.g. “Debris Removal Coverage” → “Debris Removal”).  
• Do not include exclusions or conditions.  
• When you do not find any coverages return an empty array.  

**Return *only* the JSON – no markdown fencing, comments or prose.**
`;


/* ------------------------------------------------------------------ */
/* styled helpers local to this file -------------------------------- */
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

  /* subtle zebra‑striping & hover highlight */
  &:nth-child(even) {
    background: #f9fafb;
  }
  &:hover {
    background: #eef2ff;
  }
`;

const Th = styled.th`
  padding: 12px;
  text-align: ${({ align = 'center' }) => align};
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
`;

const Td = styled.td`
  padding: 12px;
  text-align: ${({ align = 'center' }) => align};
  font-size: 14px;
`;

export const TdAI = styled(Td)`
  width: 160px;
  text-align: center;
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
`;


/**
 * Modal backdrop for ProductHub modals: white with opacity and blur to
 * keep the context visible while focusing on the modal content.
 */
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: #ffffff;
  border-radius: ${({ theme }) => theme.radius};
  padding: 24px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
`;

const CloseBtn = styled(Button).attrs({ variant: 'ghost' })`
  padding: 4px 8px;
`;

/* ------------------------------------------------------------------ */


/* ---------- navigation tabs ---------- */
const Tabs = styled.div`
  display: flex;
  gap: 24px;
  align-items: center;
`;

const BaseTab = `
  padding: 8px 14px;
  font-weight: 600;
  border-bottom: 2px solid transparent;
  border-radius: 6px 6px 0 0;
  color: ${({ theme }) => theme.colours.text};
  transition: color 0.18s ease, border-color 0.18s ease, background 0.18s ease;

  &:hover {
    color: ${({ theme }) => theme.colours.primaryLight};
    background: rgba(139, 92, 246, 0.07);          /* subtle purple tint on hover */
    border-color: ${({ theme }) => theme.colours.primaryLight};
  }
`;

const TabLink = styled(Link)`
  ${BaseTab}
  text-decoration: none;

  &.active {
    color: ${({ theme }) => theme.colours.primaryDark};
    background: rgba(139, 92, 246, 0.12);          /* persists subtle tint */
    border-color: ${({ theme }) => theme.colours.primary};
  }
`;

const TabButton = styled(Button).attrs({ variant: 'ghost' })`
  ${BaseTab}
`;

const FieldInput = styled(TextInput)`
  margin-bottom: 16px;
`;



const HistoryButton = styled.button`
  position: fixed;
  bottom: 16px;
  right: 16px;
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
  transition: right 0.3s ease, background 0.25s ease;
  &:hover { background: #1f2937; }
`;

/** Floating Action‑Button (consistent with CoverageScreen) */
const AddFab = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg,#7e5bef 0%,#8b5cf6 50%,#a855f7 100%);
  color: #fff;
  border: none;
  border-radius: 28px;
  padding: 10px 18px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0,0,0,0.12);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 14px rgba(0,0,0,0.16);
  }
  &:active { transform: translateY(0); }
`;


const ModalLink = styled.a`
  color: ${({ theme }) => theme.colours.primary};
  text-decoration: underline;
  cursor: pointer;
`;

const SummaryButton = styled(Button).attrs({ variant: 'ghost' })`
  height: 36px;
  padding: 0 12px;
`;

const ActionGroup = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
`;

const NavLinkStyled = styled(Link)`
  font-weight: 600;
  padding: 2px 0;
  transition: color 0.25s ease, opacity 0.25s ease;
  opacity: 0.9;
  &:hover { opacity: 1; color: ${({ theme }) => theme.colours.primaryDark}; }
  &.active { color: ${({ theme }) => theme.colours.primaryDark}; }
`;

const HiddenFileInput = styled.input.attrs({ type: 'file' })`
  display: none;
`;

const FileUploader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
`;

// Spinner for loading state
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

/* Animated AI "working" dots --------------------------------------- */
const dotWave = keyframes`
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
`;
const AILoader = styled.div`
  display: inline-block;
  position: relative;
  width: 32px;
  height: 8px;
  & div {
    position: absolute;
    top: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colours.primary};
    animation: ${dotWave} 1s infinite ease-in-out both;
  }
  & div:nth-child(1) { left: 0; animation-delay: 0s; }
  & div:nth-child(2) { left: 10px; animation-delay: 0.15s; }
  & div:nth-child(3) { left: 20px; animation-delay: 0.3s; }
`;

/* ---- Chat UI (iMessage‑style) ----------------------------------- */
const ChatContainer = styled.div`
  height: 55vh;
  overflow-y: auto;
  padding: 0 4px 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ChatBubble = styled.div`
  max-width: 78%;
  padding: 10px 14px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.45;
  white-space: pre-wrap;
  color: ${({ isUser }) => (isUser ? '#fff' : '#111827')};
  background: ${({ isUser }) =>
    isUser
      ? 'linear-gradient(135deg,#7e5bef 0%,#8b5cf6 50%,#a855f7 100%)'
      : '#f3f4f6'};
  align-self: ${({ isUser }) => (isUser ? 'flex-end' : 'flex-start')};
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
`;

const ChatBar = styled.div`
  display: flex;
  gap: 8px;
`;

const SendBtn = styled(Button)`
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

/* ------------------------------------------------------------------ */

export default function ProductHub() {
  /* ---------- React state -------------------------------------------------- */
  // Anything related to server‑data is grouped first, followed by UI & modal state.
  // This ordering makes the render‑tree easier to scan.
  const [products, setProducts] = useState([]);
  // add history sidebar state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [rawSearch, setRawSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const [loadingSummary, setLoadingSummary] = useState({});
  const [summaryError, setSummaryError] = useState('');
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  /* modal state ---------------------------------------------------- */
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  /* form state */
  const [name, setName] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [productCode, setProductCode] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(true);

  const location = useLocation();

  const fileInputRef = useRef();

  const formatMMYY = value => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length < 3) return digits;
    return digits.slice(0, 2) + '/' + digits.slice(2);
  };

  /* chat modal */
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);   // {role:'user'|'assistant', content:''}
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatPdfText, setChatPdfText] = useState('');   // cached pdf text for the selected product
  const chatEndRef = useRef(null);
  useEffect(() => {
    if (chatModalOpen) {
      // scroll on open or new message
      chatEndRef.current?.scrollIntoView({ behaviour: 'smooth' });
    }
  }, [chatModalOpen, chatMessages]);

  /* compare modal */
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareProduct, setCompareProduct] = useState(null);
  const [compareResult, setCompareResult] = useState(null);
  const [compareError, setCompareError] = useState('');
  const [compareWorking, setCompareWorking] = useState(false);
  const compareInputRef = useRef();

  /* ---------- Data‑Dictionary (Firestore‑backed) ---------- */
  const [dictModalOpen, setDictModalOpen] = useState(false);

  /* ---- CHAT HISTORY persistence helpers ---- */
  const loadChatHistory = async (productId) => {
    try {
      const snap = await getDoc(doc(db, 'productChats', productId));
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.messages)) {
          setChatMessages(data.messages);
        }
      }
    } catch (err) {
      console.error('Load chat history failed', err);
    }
  };

  const saveChatHistory = async (productId, msgs) => {
    try {
      await setDoc(doc(db, 'productChats', productId), { messages: msgs });
    } catch (err) {
      console.error('Save chat history failed', err);
    }
  };

  // ----- rules extraction modal -----
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [rulesProduct, setRulesProduct] = useState(null);
  const [rulesFile, setRulesFile] = useState(null);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesData, setRulesData] = useState(null);   // array of extracted rules

  // 2. Initial products fetch (no live listener to avoid N× reads – poll/refresh on demand)
  /* fetch once ----------------------------------------------------- */
  useEffect(() => {
    setLoading(true);
    getDocs(collection(db, 'products'))
      .then(snap => {
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      })
      .catch(err => {
        alert('Failed to load products');
        setLoading(false);
      });
  }, []);

  /* suggestions ---------------------------------------------------- */
  useEffect(() => {
    if (!searchTerm.trim()) return setSuggestions([]);
    const lower = searchTerm.toLowerCase();
    setSuggestions(
      [...new Set(products.map(p => p.name).filter(n => n.toLowerCase().includes(lower)))]
        .slice(0, 10)
    );
  }, [searchTerm, products]);

  /* --- debounce rawSearch -> searchTerm (250 ms) --- */
  useEffect(() => {
    const id = setTimeout(() => setSearchTerm(rawSearch.trim()), 250);
    return () => clearTimeout(id);
  }, [rawSearch]);

  /* helpers -------------------------------------------------------- */
  const resetForm = () => {
    setEditingId(null);
    setName('');
    setFormNumber('');
    setProductCode('');
    setEffectiveDate('');
    setFile(null);
  };

  const refresh = async () => {
    const snap = await getDocs(collection(db, 'products'));
    setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  /* ---------- CRUD handlers ------------------------------------------------- */
  /**
   * Save (create or update) a product and optionally upload a PDF form.
   * Handles both create and update flows, then refreshes the product list.
   */
  const handleSave = async () => {
    if (!name || !formNumber || !effectiveDate) {
      alert('Name, Form # and Effective Date are required');
      return;
    }
    try {
      let downloadUrl = '';
      if (file) {
        const sref = ref(storage, `forms/${file.name}`);
        await uploadBytes(sref, file);
        downloadUrl = await getDownloadURL(sref);
      }

      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), {
          name,
          formNumber,
          productCode,
          formDownloadUrl: downloadUrl || undefined
        });
      } else {
        await addDoc(collection(db, 'products'), {
          name,
          formNumber,
          productCode,
          effectiveDate,
          formDownloadUrl: downloadUrl
        });
      }
      await refresh();
      setModalOpen(false);
      resetForm();
    } catch {
      alert('Save failed');
    }
  };

  /**
   * Delete a product by ID after user confirmation.
   * Removes the product from Firestore and updates local state.
   */
  const handleDelete = async id => {
    if (!window.confirm('Delete product?')) return;
    await deleteDoc(doc(db, 'products', id));
    setProducts(ps => ps.filter(p => p.id !== id));
  };

  const handleOpenDetails = product => {
    setSelectedProduct(product);
    setDetailsModalOpen(true);
  };

  /**
   * Generate and display an AI summary of the selected product's PDF form.
   * Extracts text from the PDF, sends it to OpenAI, and shows the structured result.
   */
  const handleSummary = async (id, url) => {
    if (!url) {
      alert('No form uploaded for this product.');
      return;
    }
    setLoadingSummary(prev => ({ ...prev, [id]: true }));
    setSummaryError('');
    setModalData(null);

    try {
      // -------- extract text from the PDF --------
      await loadPdfJs();
      const loadingTask = pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map(item => item.str);
        text += strings.join(' ') + '\n';
      }

      // Keep first ~100k tokens to stay safely under GPT‑4o limit
      const snippet = text.split(/\s+/).slice(0, 100000).join(' ');

      // -------- call OpenAI GPT‑4o --------
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: SYSTEM_INSTRUCTIONS.trim() },
            { role: 'user', content: snippet }
          ]
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const { choices } = await res.json();

      // Clean ```json fences if present
      const cleaned = choices[0].message.content
        .replace(/```json\n?/, '')
        .replace(/\n?```/, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .trim();

      let summaryJson;
      try {
        summaryJson = JSON.parse(cleaned);
      } catch {
        throw new Error('Failed to parse AI response');
      }

      if (!summaryJson.category || !Array.isArray(summaryJson.coverages)) {
        throw new Error('Invalid AI response format');
      }

      setModalData(summaryJson);
      setSummaryModalOpen(true);
    } catch (err) {
      console.error(err);
      setSummaryError(err.message || 'Summary failed.');
    } finally {
      setLoadingSummary(prev => ({ ...prev, [id]: false }));
    }
  };

  // --- open chat ---------------------------------------------------
  const openChat = async (product) => {
    try {
      setChatModalOpen(true);
      setChatMessages([]);               // reset
      setChatInput('');
      setChatLoading(false);

      await loadChatHistory(product.id);

      // if we already pulled text for this product in this session keep it
      if (chatPdfText && selectedProduct?.id === product.id) return;

      setSelectedProduct(product);

      if (!product.formDownloadUrl) {
        setChatPdfText('');
        return;
      }
      // pull pdf text (same logic as summary)
      await loadPdfJs();
      const loadingTask = pdfjsLib.getDocument(product.formDownloadUrl);
      const pdf = await loadingTask.promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(it => it.str).join(' ') + '\n';
      }
      // keep a large slice but stay safe
      setChatPdfText(text.split(/\s+/).slice(0, 100000).join(' '));
    } catch (err) {
      console.error(err);
      alert('Failed to load document for chat.');
    }
  };

  /* ===== Rules extraction helpers (top‑level) ===== */
  const openRulesModal = (product) => {
    setRulesProduct(product);
    setRulesFile(null);
    setRulesData(null);
    setRulesModalOpen(true);
  };

  const handleRulesFile = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setRulesFile(file);
    } else {
      alert('Please choose a PDF.');
    }
  };

  const extractRules = async () => {
    if (!rulesFile) return;
    setRulesLoading(true);
    try {
      /* --- read PDF file into text (client side) --- */
      await loadPdfJs();
      const arrayBuffer = await rulesFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let rawText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const { items } = await page.getTextContent();
        rawText += items.map(it => it.str).join(' ') + '\n';
      }
      const snippet = rawText.split(/\s+/).slice(0, 100000).join(' ');

      /* --- call OpenAI (same pattern as summary/chat) --- */
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: RULES_SYSTEM_PROMPT.trim() },
            { role: 'user', content: snippet }
          ]
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const { choices } = await res.json();

      /* --- clean and parse JSON --- */
      const cleaned = choices[0].message.content
        .replace(/```json\n?/, '')
        .replace(/\n?```/, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .trim();

      const parsed = JSON.parse(cleaned);
      setRulesData(Array.isArray(parsed.rules) ? parsed.rules : []);
    } catch (err) {
      console.error(err);
      alert('Failed to extract rules.');
    } finally {
      setRulesLoading(false);
    }
  };


  const openCompareModal = (product) => {
    setCompareProduct(product);
    setCompareResult(null);
    setCompareError('');
    setCompareModalOpen(true);
  };

  // ---- helper: extract coverage list with a small OpenAI call ----
  const extractCoverageNames = async (plainText) => {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.REACT_APP_OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',          // cheaper + lower context
          messages: [
            { role: 'system', content: COVERAGE_LIST_PROMPT.trim() },
            { role: 'user',   content: plainText.slice(0, 15000) } // ~3‑4k tokens
          ]
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const { choices } = await res.json();
      const cleaned = choices[0].message.content
        .replace(/```json\n?|\n?```/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);
      return Array.isArray(parsed.coverages) ? parsed.coverages : [];
    } catch (err) {
      console.error('Coverage extraction failed', err);
      return [];
    }
  };

  const compareForms = async (file) => {
    if (!file || !compareProduct?.formDownloadUrl) return;
    setCompareWorking(true);
    try {
      await loadPdfJs();
      /* --- pull original form text --- */
      const origPdf = await pdfjsLib.getDocument(compareProduct.formDownloadUrl).promise;
      let origText = '';
      for (let i = 1; i <= origPdf.numPages; i++) {
        const pg = await origPdf.getPage(i);
        const tc = await pg.getTextContent();
        origText += tc.items.map(t => t.str).join(' ') + '\n';
      }

      /* --- pull uploaded form text --- */
      const buf = await file.arrayBuffer();
      const upPdf = await pdfjsLib.getDocument({ data: buf }).promise;
      let upText = '';
      for (let i = 1; i <= upPdf.numPages; i++) {
        const pg = await upPdf.getPage(i);
        const tc = await pg.getTextContent();
        upText += tc.items.map(t => t.str).join(' ') + '\n';
      }

      /* --- extract coverage names with two small calls --- */
      const [origCov, upCov] = await Promise.all([
        extractCoverageNames(origText),
        extractCoverageNames(upText)
      ]);

      /* --- compare locally --- */
      const origSet = new Set(origCov);
      const upSet   = new Set(upCov);

      const originalUnique = [...origSet].filter(c => !upSet.has(c));
      const uploadedUnique = [...upSet].filter(c => !origSet.has(c));
      const commonCoverages = [...origSet].filter(c => upSet.has(c));

      setCompareResult({ originalUnique, uploadedUnique, commonCoverages });
    } catch (err) {
      console.error(err);
      setCompareError(err.message || 'Compare failed');
    } finally {
      setCompareWorking(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatMessages(msgs => {
      const updated = [...msgs, { role: 'user', content: userMsg }];
      saveChatHistory(selectedProduct.id, updated);
      return updated;
    });
    setChatInput('');
    setChatLoading(true);

    try {
      const systemPrompt = `${SYSTEM_INSTRUCTIONS.trim()}

      When responding to the user, adopt a concise, conversational tone and answer the question **directly**. 
      Reference the document only as needed, avoid long JSON unless explicitly requested, and prefer short sentences or bullet‑points suitable for a chat bubble.`;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: `${systemPrompt}\n\nDocument text:\n${chatPdfText}` },
            { role: 'user', content: userMsg }
          ]
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const { choices } = await res.json();
      setChatMessages(msgs => {
        const updated = [
          ...msgs,
          { role: 'assistant', content: choices[0].message.content.trim() }
        ];
        saveChatHistory(selectedProduct.id, updated);
        return updated;
      });
    } catch (err) {
      console.error(err);
      alert('Chat failed');
    } finally {
      setChatLoading(false);
    }
  };

  /* ---------- Render -------------------------------------------------------- */
  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, searchTerm]);

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
      {/* Log-out button wrapper (top-right corner) */}
      <div style={{ position:'fixed', top:16, right: historyOpen ? SIDEBAR_WIDTH + 24 : 16, zIndex:1050 }}>
        {/* Place your logout button here, or wrap the existing logout button with this div if it's elsewhere */}
        {/* ...logout button... */}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <Container>
        <PageHeader>
          {/* Primary navigation */}
          <Tabs>
            <TabLink
              to="/"
              className={location.pathname === '/' ? 'active' : ''}
            >
              Products
            </TabLink>

            <TabLink
              to="/product-builder"
              className={location.pathname.startsWith('/product-builder') ? 'active' : ''}
            >
              Builder
            </TabLink>

            <TabLink
              to="/product-explorer"
              className={location.pathname.startsWith('/product-explorer') ? 'active' : ''}
            >
              Explorer
            </TabLink>
            <TabLink onClick={() => setDictModalOpen(true)}>
              Dictionary
            </TabLink>
            {/* HistoryTab removed */}
          </Tabs>
        </PageHeader>
        <GlobalSearch value={rawSearch} onChange={setRawSearch} />
        {filtered.length ? (
          <Table>
            <THead>
              <Tr>
                <Th>Name</Th>
                <Th style={{ width: 400 }} align="center">AI</Th>
                <Th style={{ width: 20 }}>Details</Th>
                <Th style={{ width: 400 }}>Navigation</Th>
                <Th align="center">Actions</Th>
              </Tr>
            </THead>
            <tbody>
              {filtered.map(p => (
                <Tr key={p.id}>
                  <Td align="left">{p.name}</Td>
                  <TdAI>
                    <ActionGroup>
                      <SummaryButton
                        onClick={() => handleSummary(p.id, p.formDownloadUrl)}
                        disabled={loadingSummary[p.id]}
                      >
                        {loadingSummary[p.id] ? (
                          <AILoader><div /><div /><div /></AILoader>
                        ) : (
                          <>
                            <DocumentTextIcon width={20} height={20} style={{ marginRight: 4 }} />
                            Summary
                          </>
                        )}
                      </SummaryButton>

                      <Button
                        variant="ghost"
                        onClick={() => openChat(p)}
                        title="Chat about this form">
                        <ChatBubbleLeftEllipsisIcon width={20} height={20} />
                        <span style={{ marginLeft: 4 }}>Chat</span>
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => openRulesModal(p)}
                        title="Extract rules from PDF">
                        <DocumentMagnifyingGlassIcon width={20} height={20} />
                        <span style={{ marginLeft: 4 }}>Rules</span>
                      </Button>
                    </ActionGroup>
                    {summaryError && <p style={{ color: 'red' }}>{summaryError}</p>}
                  </TdAI>
                  <Td>
                    <Button variant="ghost" title="Details" onClick={() => handleOpenDetails(p)}>
                      <InformationCircleIcon width={22} height={22} />
                    </Button>
                  </Td>
                  <Td>
                    <NavLinkStyled to={`/coverage/${p.id}`}>Coverages</NavLinkStyled> |{' '}
                    <NavLinkStyled to={`/pricing/${p.id}`}>Pricing</NavLinkStyled> |{' '}
                    <NavLinkStyled to={`/forms/${p.id}`}>Forms</NavLinkStyled> |{' '}
                    <NavLinkStyled to={`/states/${p.id}`}>States</NavLinkStyled> |{' '}
                    <NavLinkStyled to={`/rules/${p.id}`}>Rules</NavLinkStyled>
                  </Td>
                  <Td align="center">
                    <Actions>
                      <Link to={`/coverage/${p.id}`}>
                        <Button variant="ghost">
                          <PencilIcon width={20} height={20} />
                        </Button>
                      </Link>
                      <Button variant="danger" onClick={() => handleDelete(p.id)}>
                        <TrashIcon width={20} height={20} />
                      </Button>
                    </Actions>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p>No products found.</p>
        )}
        {/* Action FABs (below table, left‑aligned) */}
        <div style={{ display:'flex', gap:16, marginTop:32 }}>
          <AddFab onClick={() => setModalOpen(true)}>
            <PlusIcon width={16} height={16} />
            Add&nbsp;Product
          </AddFab>
          <AddFab onClick={() => setBulkOpen(true)}>
            <PlusIcon width={16} height={16} />
            Bulk&nbsp;Upload&nbsp;Forms
          </AddFab>
        </div>
          </Container>
        </div>
        {/* Floating history button */}
        <HistoryButton
          style={{ right: historyOpen ? SIDEBAR_WIDTH + 24 : 16 }}
          onClick={() => setHistoryOpen(o => !o)}
          aria-label="Version history"
        >
          <ClockIcon width={24} height={24} />
        </HistoryButton>
        <VersionControlSidebar
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          // optional: pass filters or userEmail if needed
        />
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <Overlay onClick={() => { setModalOpen(false); resetForm(); }}>
          <Modal onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{editingId ? 'Edit' : 'Add'} Product</ModalTitle>
              <CloseBtn variant="ghost" onClick={() => { setModalOpen(false); resetForm(); }}>
                ✕
              </CloseBtn>
            </ModalHeader>

            <FieldInput placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
            <FieldInput placeholder="Form Number" value={formNumber} onChange={e => setFormNumber(e.target.value)} />
            <FieldInput placeholder="Product Code" value={productCode} onChange={e => setProductCode(e.target.value)} />
            <FieldInput
              placeholder="Effective Date (MM/YY)"
              value={effectiveDate}
              onChange={e => setEffectiveDate(formatMMYY(e.target.value))}
            />
            <FileUploader>
              <HiddenFileInput ref={fileInputRef} onChange={e => setFile(e.target.files[0])} />
              <Button onClick={() => fileInputRef.current.click()}>
                Upload File
              </Button>
              {file && <span>{file.name}</span>}
            </FileUploader>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <Button onClick={handleSave}>{editingId ? 'Update' : 'Create'}</Button>
              <Button variant="ghost" onClick={() => { setModalOpen(false); resetForm(); }}>
                Cancel
              </Button>
            </div>
          </Modal>
        </Overlay>
      )}

      {/* ---- Rules Extraction Modal ---- */}
      {rulesModalOpen && (
        <Overlay onClick={() => setRulesModalOpen(false)}>
          <Modal onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <ModalHeader>
              <ModalTitle>Extract Rules</ModalTitle>
              <CloseBtn onClick={() => setRulesModalOpen(false)}>✕</CloseBtn>
            </ModalHeader>

            <p>Please upload the PDF rules manual for <strong>{rulesProduct?.name}</strong>.</p>
            <input
              type="file"
              accept=".pdf"
              onChange={handleRulesFile}
              style={{ marginBottom: 12 }}
            />
            {rulesFile && <p>Selected: {rulesFile.name}</p>}

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <Button
                onClick={extractRules}
                disabled={!rulesFile || rulesLoading}
              >
                {rulesLoading ? 'Extracting…' : 'Send'}
              </Button>
              <Button variant="ghost" onClick={() => setRulesModalOpen(false)}>Cancel</Button>
            </div>

            {rulesData && rulesData.length > 0 && (
              <div style={{ marginTop: 24, maxHeight: '45vh', overflowY: 'auto' }}>
                <strong>Extracted Rules</strong>
                <ul style={{ paddingLeft: 20, lineHeight: 1.5 }}>
                  {rulesData.map((r, i) => (
                    <li key={i} style={{ marginBottom: 8 }}>
                      <strong>{r.ruleType}:</strong> {r.description}
                      {r.conditions?.length > 0 && (
                        <ul style={{ paddingLeft: 18, margin: '4px 0' }}>
                          {r.conditions.map((c, j) => <li key={j}>{c}</li>)}
                        </ul>
                      )}
                      {r.appliesTo && <em>Applies to: {r.appliesTo}</em>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Modal>
        </Overlay>
      )}

      {/* ---- Compare Modal ---- */}
      {compareModalOpen && (
        <Overlay onClick={() => setCompareModalOpen(false)}>
          <Modal onClick={e => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <ModalHeader>
              <ModalTitle>Compare Forms</ModalTitle>
              <CloseBtn onClick={() => setCompareModalOpen(false)}>✕</CloseBtn>
            </ModalHeader>

            {!compareResult ? (
              <>
                <p>
                  Upload a PDF to compare with{' '}
                  <strong>{compareProduct?.name}</strong>.
                </p>
                {compareError && (
                  <p style={{ color: 'red' }}>{compareError}</p>
                )}
                <input
                  type="file"
                  accept="application/pdf"
                  ref={compareInputRef}
                  disabled={compareWorking}
                  onChange={e =>
                    e.target.files[0] && compareForms(e.target.files[0])
                  }
                />
                {compareWorking && (
                  <p style={{ marginTop: 12 }}>Comparing…</p>
                )}
              </>
            ) : (
              <div style={{ lineHeight: 1.5 }}>
                <strong>This product has these unique coverages:</strong>
                <ul>
                  {compareResult.originalUnique.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>

                <strong>The uploaded form has these unique coverages:</strong>
                <ul>
                  {compareResult.uploadedUnique.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>

                <strong>Common coverages:</strong>
                <ul>
                  {compareResult.commonCoverages.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </Modal>
        </Overlay>
      )}

      {/* ---- Summary Modal ---- */}
      {summaryModalOpen && (
        <Overlay onClick={() => setSummaryModalOpen(false)}>
          <Modal onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>AI Summary</ModalTitle>
              <CloseBtn onClick={() => setSummaryModalOpen(false)}>✕</CloseBtn>
            </ModalHeader>
            {modalData ? (
              <div style={{ lineHeight: 1.5 }}>
                <p>
                  <strong>Form&nbsp;Category:</strong> {modalData.category || '-'}
                </p>

                {Array.isArray(modalData.coverages) && modalData.coverages.length > 0 && (
                  <>
                    <strong>Coverages</strong>
                    <ul style={{ paddingLeft: 20 }}>
                      {modalData.coverages.map((c, idx) => (
                        <li key={idx} style={{ marginBottom: 12 }}>
                          <p style={{ margin: 0 }}>
                            <strong>{c.coverageName || 'Unnamed Coverage'}</strong>
                          </p>
                          {c.scopeOfCoverage && (
                            <p style={{ margin: '4px 0 0' }}>{c.scopeOfCoverage}</p>
                          )}
                          {c.limits && (
                            <p style={{ margin: '4px 0 0' }}>
                              <em>Limits:</em> {c.limits}
                            </p>
                          )}
                          {Array.isArray(c.perilsCovered) && c.perilsCovered.length > 0 && (
                            <p style={{ margin: '4px 0 0' }}>
                              <em>Perils Covered:</em> {c.perilsCovered.join(', ')}
                            </p>
                          )}
                          {Array.isArray(c.enhances) && c.enhances.length > 0 && (
                            <p style={{ margin: '4px 0 0' }}>
                              <em>Enhances:</em> {c.enhances.join(', ')}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {Array.isArray(modalData.generalConditions) && modalData.generalConditions.length > 0 && (
                  <>
                    <strong>General Conditions</strong>
                    <ul style={{ paddingLeft: 20 }}>
                      {modalData.generalConditions.map((cond, idx) => (
                        <li key={idx}>{cond}</li>
                      ))}
                    </ul>
                  </>
                )}

                {Array.isArray(modalData.generalExclusions) && modalData.generalExclusions.length > 0 && (
                  <>
                    <strong>General Exclusions</strong>
                    <ul style={{ paddingLeft: 20 }}>
                      {modalData.generalExclusions.map((exc, idx) => (
                        <li key={idx}>{exc}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ) : (
              <p>Loading…</p>
            )}
          </Modal>
        </Overlay>
      )}

      {/* ---- Chat Modal ---- */}
      {chatModalOpen && (
        <Overlay onClick={() => setChatModalOpen(false)}>
          <Modal onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <ModalHeader>
              <ModalTitle>AI Chat</ModalTitle>
              <CloseBtn onClick={() => setChatModalOpen(false)}>✕</CloseBtn>
            </ModalHeader>
            <ChatContainer>
              {chatMessages.map((m, idx) => (
                <ChatBubble key={idx} isUser={m.role === 'user'}>
                  {m.content}
                </ChatBubble>
              ))}
              {chatLoading && (
                <ChatBubble isUser={false}>AI is typing…</ChatBubble>
              )}
              <div ref={chatEndRef} />
            </ChatContainer>
            <ChatBar>
              <TextInput
                placeholder="Message…"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendChat(); }}
                style={{ flex: 1 }}
              />
              <SendBtn
                onClick={sendChat}
                disabled={chatLoading || !chatInput.trim()}
                title="Send"
              >
                <PaperAirplaneIcon width={20} height={20} style={{ transform:'rotate(45deg)' }} />
              </SendBtn>
            </ChatBar>
          </Modal>
        </Overlay>
      )}

      {/* ---- Data‑Dictionary Modal ---- */}
      <DataDictionaryModal
        open={dictModalOpen}
        onClose={() => setDictModalOpen(false)}
      />

      <BulkFormUploadModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        products={products}
      />

      {/* ---- Details Modal ---- */}
      {detailsModalOpen && (
        <Overlay onClick={() => setDetailsModalOpen(false)}>
          <Modal onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Product Details</ModalTitle>
              <CloseBtn onClick={() => setDetailsModalOpen(false)}>✕</CloseBtn>
            </ModalHeader>
            {selectedProduct && (
              <div>
                <p>
                  <strong>Form #:</strong>{' '}
                  {selectedProduct.formDownloadUrl ? (
                    <ModalLink href={selectedProduct.formDownloadUrl} target="_blank" rel="noopener noreferrer">
                      {selectedProduct.formNumber || 'Download'}
                    </ModalLink>
                  ) : (
                    selectedProduct.formNumber || '-'
                  )}
                </p>
                <p><strong>Product Code:</strong> {selectedProduct.productCode || '-'}</p>
                <p><strong>Effective Date:</strong> {selectedProduct.effectiveDate || '-'}</p>
              </div>
            )}
          </Modal>
        </Overlay>
      )}
    </Page>
  );
}
// ensure tree‑shaking removes if unused