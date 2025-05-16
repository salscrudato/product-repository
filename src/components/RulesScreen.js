import React, { useEffect, useState } from 'react';
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
  width:100%;border-collapse:collapse;
  th,td{padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;}
  tbody tr:hover{background:#f9faff;}
`;
const IconBtn = styled.button`
  background:none;border:none;color:#1d4ed8;cursor:pointer;
  &:hover{color:#4338ca;}
`;
const AddCard = styled.div`
  width:110px;height:120px;border:2px dashed #d1d5db;border-radius:12px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  cursor:pointer;transition:all .2s ease;
  &:hover{border-color:#7c3aed;background:#f5f3ff;}
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

/* ------------ component ------------ */
export default function RulesScreen() {
  const nav = useNavigate();
  const [rules,setRules] = useState([]);
  const [open,setOpen]   = useState(false);

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
      <Header>
        <H1>Rules Repository</H1>
        <button onClick={()=>nav(-1)} className="text-indigo-600 hover:underline">Back</button>
      </Header>

      <AddCard onClick={()=>setOpen(true)}>
        <PlusIcon className="w-8 h-8"/>
        <span style={{marginTop:4,fontSize:14}}>Add Rule</span>
      </AddCard>

      {rules.length>0 && (
        <Table>
          <thead><tr><th>Name</th><th>Rule&nbsp;ID</th><th>Rule</th><th>Actions</th></tr></thead>
          <tbody>
            {rules.map(r=>(
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
    </Page>
  );
}
