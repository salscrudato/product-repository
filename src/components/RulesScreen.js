import React, { useEffect, useState, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/solid';

/* ------------ Grok helper ------------ */
const XAI_KEY =
  'xai-uKF32qVwU1o0BMeaQwwwaz6vsf4kVu521x01eLUwwLvcxVRTi4CmnISLGVQIvtSITZFD82PMlmvTG93t';

async function refineRule(text) {
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
            'You are an expert insurance‑rules assistant. Convert the user rule into concise If/Then/When pseudo‑code.'
        },
        { role: 'user', content: text }
      ]
    })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// Strip MD fences / back‑ticks the model may return
const cleanRuleText = (str = '') =>
  str
    .replace(/```[\s\S]*?```/g, '')   // remove fenced blocks
    .replace(/```|`/g, '')            // stray back‑ticks
    .replace(/^\s*pseudo[:\s-]*/i, '') // leading "pseudo" label
    .trim();

export { cleanRuleText };

/* ------------ styles ------------ */
const Page = styled.div`padding:32px;`;
const Header = styled.div`display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;`;
const H1 = styled.h1`font-size:28px;font-weight:600;`;
const Table = styled.table`
  width:100%;
  border-collapse: collapse;
  thead th{
    position: sticky;
    top: 0;
    background:#f9fafb;
    z-index:2;
    text-align:center;
    padding:12px;
    border-bottom:1px solid #e5e7eb;
    font-weight:600;
  }
  tbody td{
    padding:12px;
    border-bottom:1px solid #f1f3f5;
    text-align:center;
    vertical-align:top;
  }
  tbody tr:hover{background:#f9faff;}
`;
const IconBtn = styled.button`
  background:none;border:none;color:#1d4ed8;cursor:pointer;
  &:hover{color:#4338ca;}
`;
const Modal = styled.div`
  position:fixed;inset:0;display:flex;justify-content:center;align-items:center;
  background:rgba(0,0,0,.6);z-index:1000;
  >div{background:#fff;border-radius:12px;padding:24px;width:480px;position:relative;}
`;
const Field = styled.input`
  width:100%;border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin-bottom:12px;
`;
const TextArea = styled.textarea`
  width:100%;border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin-bottom:12px;resize:vertical;
`;

const Container = styled.div`
  max-width: 1140px;
  margin: 0 auto;
`;

const SearchInput = styled.input`
  width: 280px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 15px;
  &:focus { outline: 2px solid #6366f1; }
`;

const TableWrapper = styled.div`
  margin-top: 24px;
  max-height: 480px;
  overflow: auto;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,.05);
`;

/* Floating Add button */
const Fab = styled.button`
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #7c3aed;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,.15);
  border: none;
  cursor: pointer;
  z-index: 100;
  &:hover { background:#5b21b6; }
`;

/* ------------ component ------------ */
export default function RulesScreen() {
  const nav = useNavigate();
  const [rules,setRules] = useState([]);
  const [open,setOpen]   = useState(false);

  /* search */
  const [rawSearch,setRaw] = useState('');
  const [search,setSearch] = useState('');
  const searchRef = useRef(null);

  /* debounce search */
  useEffect(()=>{
    const t = setTimeout(()=>setSearch(rawSearch.trim().toLowerCase()),250);
    return ()=>clearTimeout(t);
  },[rawSearch]);

  /* '/' shortcut */
  useEffect(()=>{
    const h = e=>{
      if(e.key==='/' && !e.target.matches('input,textarea')){ e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown',h);
    return ()=>window.removeEventListener('keydown',h);
  },[]);

  /* modal state */
  const [name,setName]   = useState('');
  const [ruleId,setRuleId]=useState('');
  const [text,setText]   = useState('');
  const [readonly,setRO] = useState(false);
  const [refined,setRef] = useState('');
  const [busy,setBusy]   = useState(false);

  useEffect(()=>{
    (async()=>{
      const snap = await getDocs(collection(db,'rules'));
      setRules(snap.docs.map(d=>({id:d.id,...d.data()})));
    })();
  },[]);

  const filteredRules = useMemo(()=>{
    if(!search) return rules;
    return rules.filter(r=>
      (r.name||'').toLowerCase().includes(search) ||
      (r.ruleId||'').toLowerCase().includes(search) ||
      (r.refinedRule||'').toLowerCase().includes(search)
    );
  },[rules,search]);

  const reset = ()=>{setName('');setRuleId('');setText('');setRef('');setRO(false);};

  const generate = async ()=>{
    if(!text.trim()) return;
    setBusy(true);
    try{
      const out = await refineRule(text);
      setRef(cleanRuleText(out));setRO(true);
    }catch(e){alert(e.message);}
    setBusy(false);
  };

  const save = async ()=>{
    const payload={ name,ruleId,originalText:text,refinedRule:refined||text };
    const ref = await addDoc(collection(db,'rules'),payload);
    setRules([...rules,{id:ref.id,...payload}]);
    setOpen(false);reset();
  };

  const remove = async id=>{
    if(!window.confirm('Delete rule?')) return;
    await deleteDoc(doc(db,'rules',id));
    setRules(rules.filter(r=>r.id!==id));
  };

  return(
    <Page>
      <Container>
        <Header>
          <H1>Rules Repository</H1>
          <div style={{display:'flex',gap:16,alignItems:'center'}}>
            <SearchInput
              ref={searchRef}
              placeholder="Search / ..."
              value={rawSearch}
              onChange={e=>setRaw(e.target.value)}
            />
            <button onClick={()=>nav(-1)} className="text-indigo-600 hover:underline">Back</button>
          </div>
        </Header>

        {filteredRules.length>0 && (
          <TableWrapper>
            <Table>
              <thead><tr><th>Name</th><th>Rule&nbsp;ID</th><th>Rule</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredRules.map(r=>(
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.ruleId}</td>
                    <td style={{ whiteSpace: 'pre-wrap' }}>
                      {cleanRuleText(r.refinedRule)}
                    </td>
                    <td>
                      <IconBtn onClick={()=>remove(r.id)}>
                        <TrashIcon className="w-5 h-5"/>
                      </IconBtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        )}

        {open && (
          <Modal onClick={()=>{setOpen(false);reset();}}>
            <div onClick={e=>e.stopPropagation()}>
              <button className="absolute top-3 right-3 text-slate-500" onClick={()=>{setOpen(false);reset();}}>
                <XMarkIcon className="w-5 h-5"/>
              </button>
              <h2 className="text-lg font-semibold mb-4">New Rule</h2>

              <Field placeholder="Rule Name" value={name} onChange={e=>setName(e.target.value)}/>
              <Field placeholder="Rule ID" value={ruleId} onChange={e=>setRuleId(e.target.value)}/>

              <TextArea
                rows={4}
                placeholder="Write your rule…"
                value={text}
                readOnly={readonly}
                onChange={e=>setText(e.target.value)}
              />
              {readonly && (
                <TextArea
                  rows={3}
                  placeholder="Revised Rule"
                  value={refined}
                  onChange={e=>setRef(e.target.value)}
                />
              )}

              <div className="flex justify-end gap-3 mt-2">
                {!readonly?(
                  <button
                    disabled={busy}
                    onClick={generate}
                    className="px-5 py-2 rounded-md bg-indigo-600 text-white"
                  >
                    {busy?'Generating…':'Generate'}
                  </button>
                ):(
                  <button
                    onClick={save}
                    className="px-5 py-2 rounded-md bg-purple-600 text-white"
                  >
                    Save
                  </button>
                )}
              </div>
            </div>
          </Modal>
        )}
        <Fab onClick={()=>setOpen(true)}>
          <PlusIcon className="w-6 h-6"/>
        </Fab>
      </Container>
    </Page>
  );
}
