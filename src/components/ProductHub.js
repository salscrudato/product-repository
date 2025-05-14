import { useEffect, useState, useRef } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  PencilIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  XMarkIcon,
  WrenchIcon,
  ChatBubbleLeftEllipsisIcon
} from '@heroicons/react/24/solid';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Page,
  Container,
  PageHeader,
  Title
} from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';

import GlobalSearch from '../components/GlobalSearch';
import styled, { keyframes } from 'styled-components';


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

// Make sure pdf.worker.min.js is copied to /public
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

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

const SuggestionList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  position: absolute;
  width: 100%;
  background: ${({ theme }) => theme.colours.bg};
  border: 1px solid #e5e7eb;
  border-radius: ${({ theme }) => theme.radius};
  max-height: 200px;
  overflow-y: auto;
  z-index: 20;
`;

const SuggestionItem = styled.li`
  padding: 8px 12px;
  cursor: pointer;
  &:hover {
    background: #f9fafb;
  }
`;

/* Simple modal primitives (Add / Edit only for now) ----------------- */
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.colours.bg};
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

const TopActions = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  & > button {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    padding: 0 12px;
    font-size: 14px;
  }
`;

const ExplorerButton = styled(Button).attrs({ variant: 'ghost' })`
  border: 1.5px solid ${({ theme }) => theme.colours.primary};
  &:hover {
    background: rgba(29, 78, 216, 0.1);
  }
`;

const ModalLink = styled.a`
  color: ${({ theme }) => theme.colours.primary};
  text-decoration: underline;
  cursor: pointer;
`;

const SummaryButton = styled(Button)`
  height: 36px;
  padding: 0 12px;
  min-width: 100px;
`;

const ActionGroup = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
`;

const NavLinkStyled = styled(Link)`
  transition: transform 0.1s ease, color 0.2s ease;
  &:hover {
    transform: scale(1.05);
    color: ${({ theme }) => theme.colours.primaryDark};
  }
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

/* ------------------------------------------------------------------ */

export default function ProductHub() {
  /* data ----------------------------------------------------------- */
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
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

  /* form state */
  const [name, setName] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [productCode, setProductCode] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(true);

  const fileInputRef = useRef();

  const formatMMYY = value => {
    const digits = value.replace(/\D/g, '').slice(0,4);
    if (digits.length < 3) return digits;
    return digits.slice(0,2) + '/' + digits.slice(2);
  };

  /* chat modal */
  const [chatModalOpen, setChatModalOpen]   = useState(false);
  const [chatMessages, setChatMessages]     = useState([]);   // {role:'user'|'assistant', content:''}
  const [chatInput, setChatInput]           = useState('');
  const [chatLoading, setChatLoading]       = useState(false);
  const [chatPdfText, setChatPdfText]       = useState('');   // cached pdf text for the selected product

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

  /* crud ----------------------------------------------------------- */
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

  const handleDelete = async id => {
    if (!window.confirm('Delete product?')) return;
    await deleteDoc(doc(db, 'products', id));
    setProducts(ps => ps.filter(p => p.id !== id));
  };

  const handleOpenDetails = product => {
    setSelectedProduct(product);
    setDetailsModalOpen(true);
  };

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

      // if we already pulled text for this product in this session keep it
      if (chatPdfText && selectedProduct?.id === product.id) return;

      setSelectedProduct(product);

      if (!product.formDownloadUrl) {
        setChatPdfText('');
        return;
      }
      // pull pdf text (same logic as summary)
      const loadingTask = pdfjsLib.getDocument(product.formDownloadUrl);
      const pdf = await loadingTask.promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(it => it.str).join(' ') + '\n';
      }
      // keep a large slice but stay safe
      setChatPdfText( text.split(/\s+/).slice(0, 100000).join(' ') );
    } catch (err) {
      console.error(err);
      alert('Failed to load document for chat.');
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatMessages(msgs => [...msgs, { role: 'user', content: userMsg }]);
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
      setChatMessages(msgs => [
        ...msgs,
        { role: 'assistant', content: choices[0].message.content.trim() }
      ]);
    } catch (err) {
      console.error(err);
      alert('Chat failed');
    } finally {
      setChatLoading(false);
    }
  };

  /* render --------------------------------------------------------- */
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
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
          <Title>Product Repository</Title>
          <TopActions>
            <Link to="/product-builder">
              <Button>
                <WrenchIcon width={20} height={20} style={{ marginRight: 4 }}/> Builder
              </Button>
            </Link>
            <Link to="/product-explorer">
              <ExplorerButton>
                <MagnifyingGlassIcon width={20} height={20} style={{ marginRight: 4 }}/> Explorer
              </ExplorerButton>
            </Link>
            <Button onClick={() => setModalOpen(true)}>
              <PlusIcon width={20} height={20} style={{ marginRight: 4 }}/> Add Product
            </Button>
          </TopActions>
        </PageHeader>

        <GlobalSearch />

        {/* table */}
        {filtered.length ? (
          <Table>
            <THead>
              <Tr>
                <Th>Name</Th>
                <Th>Details</Th>
                <Th>Navigation</Th>
                <Th>AI Summary</Th>
                <Th align="center">Actions</Th>
              </Tr>
            </THead>
            <tbody>
              {filtered.map(p => (
                <Tr key={p.id}>
                  <Td>{p.name}</Td>
                  <Td>
                    <Button variant="ghost" onClick={() => handleOpenDetails(p)}>
                      <InformationCircleIcon width={20} height={20} style={{ marginRight: 4 }} />
                      Details
                    </Button>
                  </Td>
                  <Td>
                    <NavLinkStyled to={`/coverage/${p.id}`}>Coverages</NavLinkStyled> |{' '}
                    <NavLinkStyled to={`/pricing/${p.id}`}>Pricing</NavLinkStyled> |{' '}
                    <NavLinkStyled to="/forms">Forms</NavLinkStyled> |{' '}
                    <NavLinkStyled to={`/states/${p.id}`}>States</NavLinkStyled>
                  </Td>
                  <Td>
                    <ActionGroup>
                      <SummaryButton
                        variant="primary"
                        onClick={() => handleSummary(p.id, p.formDownloadUrl)}
                        disabled={loadingSummary[p.id]}
                      >
                        {loadingSummary[p.id] ? (
                          <AILoader><div/><div/><div/></AILoader>
                        ) : (
                          <>
                            <DocumentTextIcon width={20} height={20} style={{ marginRight: 4 }}/>
                            Summarize
                          </>
                        )}
                      </SummaryButton>

                      <Button
                        variant="ghost"
                        onClick={() => openChat(p)}
                        title="Chat about this form">
                        <ChatBubbleLeftEllipsisIcon width={20} height={20}/>
                      </Button>
                    </ActionGroup>
                    {summaryError && <p style={{ color: 'red' }}>{summaryError}</p>}
                  </Td>
                  <Td align="center">
                    <Actions>
                      <Link to={`/coverage/${p.id}`}>
                        <Button variant="ghost">
                          <PencilIcon width={20} height={20}/>
                        </Button>
                      </Link>
                      <Button variant="danger" onClick={() => handleDelete(p.id)}>
                        <TrashIcon width={20} height={20}/>
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
      </Container>

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

            <TextInput placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
            <TextInput placeholder="Form Number" value={formNumber} onChange={e => setFormNumber(e.target.value)} />
            <TextInput placeholder="Product Code" value={productCode} onChange={e => setProductCode(e.target.value)} />
            <TextInput
              placeholder="Effective Date (MM/YY)"
              value={effectiveDate}
              onChange={e => setEffectiveDate(formatMMYY(e.target.value))}
            />
            <FileUploader>
              <HiddenFileInput ref={fileInputRef} onChange={e => setFile(e.target.files[0])}/>
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

            <div style={{height:'50vh', overflowY:'auto', marginBottom:16, paddingRight:4}}>
              {chatMessages.map((m, idx) => {
                // rudimentary formatting for assistant replies
                const isUser = m.role === 'user';
                let html = m.content
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')     // **bold**
                  .replace(/^-\\s+/gm, '• ')                                // dash bullets to dots
                  .replace(/\n/g, '<br/>');                                // new lines

                return (
                  <div
                    key={idx}
                    style={{
                      background: isUser ? '#EEF2FF' : '#F1F5F9',
                      padding: 8,
                      borderRadius: 6,
                      margin: '4px 0',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    <strong>{isUser ? 'You' : 'AI'}:&nbsp;</strong>
                    {isUser ? (
                      m.content
                    ) : (
                      /* render formatted HTML for AI response */
                      <span dangerouslySetInnerHTML={{ __html: html }} />
                    )}
                  </div>
                );
              })}
              {chatLoading && <p>AI is typing…</p>}
            </div>

            <div style={{display:'flex', gap:6}}>
              <TextInput
                placeholder="How can I help you?"
                value={chatInput}
                onChange={e=>setChatInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter') sendChat();}}
                style={{flex:1}}
              />
              <Button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>
                ↑
              </Button>
            </div>
          </Modal>
        </Overlay>
      )}

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