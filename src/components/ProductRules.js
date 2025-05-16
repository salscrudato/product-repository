import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import {
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';

/* ----------------  GROK CONFIG ---------------- */
const XAI_KEY =
  'xai-uKF32qVwU1o0BMeaQwwwaz6vsf4kVu521x01eLUwwLvcxVRTi4CmnISLGVQIvtSITZFD82PMlmvTG93t';

async function callGrok(prompt) {
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${XAI_KEY}`
    },
    body: JSON.stringify({
      model: 'grok-beta',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful insurance‑rules assistant. Return concise If/Then/When pseudo‑code.'
        },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

/* ----------------  STYLES ---------------- */
const Page = styled.div`
  padding: 32px;
`;
const H1 = styled.h1`
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 24px;
`;
const AddCard = styled.div`
  width: 110px;
  height: 120px;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    border-color: #7c3aed;
    background: #f5f3ff;
  }
`;
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 24px;
`;
const Th = styled.th`
  text-align: left;
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
`;
const Td = styled.td`
  padding: 12px;
  border-bottom: 1px solid #f3f4f6;
`;
const IconBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #1d4ed8;
  &:hover {
    color: #4338ca;
  }
`;

/* ----------------  COMPONENT ---------------- */
export default function ProductRules() {
  const nav = useNavigate();

  /* ---------- data ---------- */
  const [rules, setRules] = useState([]);
  const [products, setProducts] = useState([]);
  const [coverages, setCoverages] = useState([]);
  const [forms, setForms] = useState([]);

  const [loading, setLoading] = useState(true);

  /* ---------- modal ---------- */
  const [showModal, setShowModal] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleId, setRuleId] = useState('');
  const [ruleText, setRuleText] = useState('');
  const [ruleReadonly, setRuleReadonly] = useState(false);
  const [revisedRule, setRevisedRule] = useState('');
  const [proprietary, setProprietary] = useState(false);
  const [linkType, setLinkType] = useState('None');
  const [linkTarget, setLinkTarget] = useState('');
  const [generating, setGenerating] = useState(false);

  /* ---------- fetch ---------- */
  useEffect(() => {
    const fetchAll = async () => {
      const ruleSnap = await getDocs(collection(db, 'productRules'));
      setRules(ruleSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const prodSnap = await getDocs(collection(db, 'products'));
      setProducts(prodSnap.docs.map(d => ({ id: d.id, name: d.data().name })));

      const covSnap = await getDocs(collection(db, 'coverages'));
      setCoverages(
        covSnap.docs.map(d => ({ id: d.id, name: d.data().name }))
      );

      const formSnap = await getDocs(collection(db, 'forms'));
      setForms(formSnap.docs.map(d => ({ id: d.id, name: d.data().name })));

      setLoading(false);
    };
    fetchAll();
  }, []);

  /* ---------- helpers ---------- */
  const resetModal = () => {
    setRuleName('');
    setRuleId('');
    setRuleText('');
    setRevisedRule('');
    setRuleReadonly(false);
    setProprietary(false);
    setLinkType('None');
    setLinkTarget('');
  };

  const currentTargets =
    linkType === 'Product'
      ? products
      : linkType === 'Coverage'
      ? coverages
      : linkType === 'Form'
      ? forms
      : [];

  /* ---------- CRUD ---------- */
  const handleGenerate = async () => {
    if (!ruleText.trim()) return;
    setGenerating(true);
    try {
      const prompt = `Convert the following free‑form insurance rule into concise If/Then/When pseudo‑code suitable for modern rules engines.\n\n"${ruleText}"`;
      const ai = await callGrok(prompt);
      setRevisedRule(ai);
      setRuleReadonly(true);
    } catch (e) {
      alert(`AI error: ${e.message}`);
    }
    setGenerating(false);
  };

  const handleSaveRule = async () => {
    const newRule = {
      name: ruleName,
      ruleId,
      originalText: ruleText,
      refinedRule: revisedRule || ruleText,
      proprietary,
      linkType,
      linkTarget
    };
    const docRef = await addDoc(collection(db, 'productRules'), newRule);
    setRules([...rules, { id: docRef.id, ...newRule }]);
    setShowModal(false);
    resetModal();
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this rule?')) return;
    await deleteDoc(doc(db, 'productRules', id));
    setRules(rules.filter(r => r.id !== id));
  };

  /* ---------- UI ---------- */
  return (
    <Page>
      <H1>Rules Repository</H1>

      <AddCard onClick={() => setShowModal(true)}>
        <PlusIcon className="w-8 h-8" />
        <span style={{ marginTop: 4, fontSize: 14 }}>Add Rule</span>
      </AddCard>

      {!loading && rules.length > 0 && (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Rule&nbsp;ID</Th>
              <Th>Rule</Th>
              <Th>Link</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id}>
                <Td>{r.name}</Td>
                <Td>{r.ruleId}</Td>
                <Td style={{ whiteSpace: 'pre-wrap' }}>{r.refinedRule}</Td>
                <Td>
                  {r.linkType !== 'None'
                    ? `${r.linkType}: ${r.linkTarget}`
                    : '—'}
                </Td>
                <Td>
                  <IconBtn onClick={() => handleDelete(r.id)}>
                    <TrashIcon className="w-5 h-5" />
                  </IconBtn>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* ------------- MODAL ------------- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[480px] p-6 relative">
            <button
              className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
              onClick={() => {
                resetModal();
                setShowModal(false);
              }}
            >
              &times;
            </button>

            {/* Freeform header */}
            <div className="flex gap-2 mb-4">
              <button className="flex-1 py-2 rounded-lg text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold cursor-default">
                Freeform
              </button>
            </div>

            <input
              placeholder="Rule Name"
              value={ruleName}
              onChange={e => setRuleName(e.target.value)}
              className="w-full border rounded-md px-3 py-2 mb-3"
            />

            <input
              placeholder="Rule ID"
              value={ruleId}
              onChange={e => setRuleId(e.target.value)}
              className="w-full border rounded-md px-3 py-2 mb-3"
            />

            <textarea
              placeholder="Write your rule..."
              value={ruleText}
              readOnly={ruleReadonly}
              onChange={e => setRuleText(e.target.value)}
              rows={4}
              className="w-full border rounded-md px-3 py-2 mb-3"
            />

            {ruleReadonly && (
              <textarea
                placeholder="Revised Rule"
                value={revisedRule}
                onChange={e => setRevisedRule(e.target.value)}
                rows={3}
                className="w-full border rounded-md px-3 py-2 mb-3"
              />
            )}

            <select
              value={proprietary ? 1 : 0}
              onChange={e => setProprietary(e.target.value === '1')}
              className="w-full border rounded-md px-3 py-2 mb-3"
            >
              <option value={0}>Proprietary: No</option>
              <option value={1}>Proprietary: Yes</option>
            </select>

            <div className="flex gap-2 mb-3">
              <select
                value={linkType}
                onChange={e => {
                  setLinkType(e.target.value);
                  setLinkTarget('');
                }}
                className="flex-[0.4] border rounded-md px-3 py-2"
              >
                <option>None</option>
                <option>Product</option>
                <option>Coverage</option>
                <option>Form</option>
              </select>

              <select
                value={linkTarget}
                disabled={linkType === 'None'}
                onChange={e => setLinkTarget(e.target.value)}
                className="flex-1 border rounded-md px-3 py-2"
              >
                <option value="">
                  Select {linkType === 'None' ? 'Target' : linkType}
                </option>
                {currentTargets.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              {!ruleReadonly ? (
                <button
                  disabled={generating}
                  onClick={handleGenerate}
                  className="px-6 py-2 rounded-md bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold"
                >
                  {generating ? 'Generating…' : 'Generate'}
                </button>
              ) : (
                <button
                  onClick={handleSaveRule}
                  className="px-6 py-2 rounded-md bg-purple-600 text-white font-semibold"
                >
                  Save
                </button>
              )}

              <button
                onClick={() => {
                  resetModal();
                  setShowModal(false);
                }}
                className="px-5 py-2 rounded-md border"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}