import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import {
  collection,
  query,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  getDocs,
  collectionGroup
} from 'firebase/firestore';
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/solid';
import styled from 'styled-components';

// Styled Components
const Container = styled.div`
  min-height: 100vh;
  background: #fff;
  padding: 24px;
  font-family: 'Inter', sans-serif;
  color: #1F2937;
`;
const Wrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;
const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;
const Title = styled.h1`
  font-size: 28px;
  font-weight: 600;
`;
const BackLink = styled.button`
  background: none;
  border: none;
  color: #4F46E5;
  font-size: 16px;
  cursor: pointer;
  &:hover { text-decoration: underline; }
`;
const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(90deg, #A100FF, #4400FF);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  &:hover { background: #3730A3; }
`;
const SearchInput = styled.input`
  width: 100%;
  padding: 12px;
  font-size: 14px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  margin: 16px 0;
  &:focus {
    outline: none;
    border-color: #4F46E5;
    box-shadow: 0 0 0 2px rgba(79,70,229,0.2);
  }
  &::placeholder { color: #9CA3AF; }
`;
const TableContainer = styled.div`
  overflow-x: auto;
  margin-bottom: 24px;
`;
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
`;
const TableHead = styled.thead`
  background: #F9FAFB;
`;
const TableRow = styled.tr`
  border-bottom: 1px solid #E5E7EB;
  &:hover { background: #F3F4F6; }
`;
const TableHeader = styled.th`
  padding: 12px;
  text-align: left;
  color: #6B7280;
`;
const TableCell = styled.td`
  padding: 12px;
  color: #1F2937;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;
const ModalBox = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 600px;
  position: relative;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
`;
const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  cursor: pointer;
  svg { width: 20px; height: 20px; color: #6B7280; }
`;
const ModeToggle = styled.div`
  display: flex;
  gap: 8px;
  margin: 16px 0;
`;
const ToggleBtn = styled.button`
  flex: 1;
  padding: 8px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  background: ${props => (props.active ? 'linear-gradient(90deg, #A100FF, #4400FF)' : '#F9FAFB')};
  color: ${props => (props.active ? '#fff' : '#1F2937')};
  cursor: pointer;
  font-weight: 500;
  &:hover { background: ${props => (props.active ? '#3730A3' : '#F3F4F6')}; }
`;
const FormGroup = styled.div`
  margin-bottom: 16px;
`;
const Label = styled.h4`
  margin-bottom: 8px;
  font-size: 14px;
  color: #1F2937;
`;
const Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  font-size: 14px;
  &:focus { outline: none; border-color: #4F46E5; }
`;
const Textarea = styled.textarea`
  width: 100%;
  padding: 10px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  min-height: 100px;
  &:focus { outline: none; border-color: #4F46E5; }
`;
const Select = styled.select`
  width: 100%;
  padding: 10px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  font-size: 14px;
  &:focus { outline: none; border-color: #4F46E5; }
`;
const LinkedGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;
const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;
const SubmitBtn = styled.button`
  padding: 10px 20px;
  background: linear-gradient(90deg, #A100FF, #4400FF);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  &:hover { background: #3730A3; }
`;
const CancelBtn = styled.button`
  padding: 10px 20px;
  background: #F9FAFB;
  color: #6B7280;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  &:hover { background: #F3F4F6; }
`;

// Main Component
export default function RulesScreen() {
  const navigate = useNavigate();
  const [rules, setRules] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    mode: 'ifthen',
    conditions: [{ field: '', operator: '', value: '' }],
    outcomeText: '',
    freeformText: '',
    proprietary: 'No',
    linkedEntity: { type: '', id: '' }
  });
  const [entities, setEntities] = useState({ products: [], forms: [], pricing: [], coverages: [] });
  const [loadingEntities, setLoadingEntities] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'rules')), snap => {
      setRules(snap.docs.map(d => ({ id: d.id, ...d.data() })));  });
    (async () => {
      setLoadingEntities(true);
      try {
        const [pSnap,fSnap,prSnap,cSnap] = await Promise.all([
          getDocs(collection(db,'products')),
          getDocs(collection(db,'forms')),
          getDocs(collectionGroup(db,'steps')),
          getDocs(collectionGroup(db,'coverages'))
        ]);
        setEntities({
          products: pSnap.docs.map(d=>({ id:d.id,name:d.data().name })),
          forms: fSnap.docs.map(d=>({ id:d.id,name:d.data().formName||d.data().formNumber })),
          pricing: prSnap.docs.map(d=>({ id:d.id,name:d.data().stepName||d.data().operand })),
          coverages: cSnap.docs.map(d=>({ id:d.id,name:d.data().name }))
        });
      } catch(e) { console.error(e); alert('Failed to load entities'); }
      finally { setLoadingEntities(false); }
    })();
    return unsub;
  }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({ name:'', mode:'ifthen', conditions:[{ field:'',operator:'',value:'' }], outcomeText:'', freeformText:'', proprietary:'No', linkedEntity:{type:'',id:''} });
  };
  const openNew = () => { resetForm(); setShowModal(true); };
  const openEdit = r => {
    const free = Boolean(r.freeformText);
    setEditing(r);
    setForm({
      name: r.name || '',
      mode: free?'freeform':'ifthen',
      conditions: r.conditions||[{ field:'',operator:'',value:'' }],
      outcomeText: free?'':r.outcome||'',
      freeformText: free?r.freeformText:'',
      proprietary: r.proprietary?'Yes':'No',
      linkedEntity:{
        type: r.productId?'Product':r.coverageId?'Coverage':r.formId?'Form':r.pricingId?'Pricing':'',
        id: r.productId||r.coverageId||r.formId||r.pricingId||''
      }
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if(!form.name.trim() || (form.mode==='ifthen' && (!form.conditions[0].field||!form.outcomeText.trim())) ||
       (form.mode==='freeform' && !form.freeformText.trim())) {
      alert('Name and content required'); return;
    }
    const data = { name:form.name.trim(), proprietary: form.proprietary==='Yes', mode:form.mode, updatedAt:serverTimestamp() };
    if(form.mode==='ifthen') Object.assign(data,{ conditions:form.conditions, outcome:form.outcomeText.trim() });
    else Object.assign(data,{ freeformText:form.freeformText.trim() });
    if(form.linkedEntity.type&&form.linkedEntity.id) {
      data[form.linkedEntity.type.toLowerCase()+'Id']=form.linkedEntity.id;
    }
    try {
      if(editing) await updateDoc(doc(db,'rules',editing.id), data);
      else await addDoc(collection(db,'rules'),{ ...data, createdAt:serverTimestamp() });
      setShowModal(false); resetForm();
    } catch(e) { console.error(e); alert('Save failed'); }
  };

  const addCondition = () => setForm({ ...form, conditions:[...form.conditions,{ field:'',operator:'',value:'' }] });
  const updateCond = (i,k,v) => { const c=[...form.conditions]; c[i][k]=v; setForm({ ...form, conditions:c }); };
  const removeCond = i => setForm({ ...form, conditions: form.conditions.filter((_,j)=>j!==i) });

  const filtered = rules.filter(r=>r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Container>
      <Wrapper>
        <Header>
          <Title>Rules Repository</Title>
          <div style={{ display:'flex', gap:'12px' }}>
            <BackLink onClick={()=>navigate(-1)}>Back</BackLink>
            {/* <AddButton onClick={openNew}><PlusIcon style={{ width:16,height:16 }}/><span>Add Rule</span></AddButton> */}
          </div>
        </Header>

        <SearchInput placeholder="Search by name..." value={search} onChange={e=>setSearch(e.target.value)} />
                 
                  <button className="ph-submit2" onClick={openNew}>
                      <PlusIcon className="w-5 h-5 inline-block mr-2" />
                      <span>Add Rule</span>
                    </button>

        {filtered.length ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Mode</TableHeader>
                  <TableHeader>Details</TableHeader>
                  <TableHeader>Prop.</TableHeader>
                  <TableHeader>Linked</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <tbody>
                {filtered.map(r=>(
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.mode==='ifthen'?'If/Then':'Freeform'}</TableCell>
                    <TableCell>
                      {r.mode==='ifthen' ? (
                        r.conditions.map((c,i)=><div key={i}>{c.field} {c.operator} {c.value}</div>)
                      ) : <em>{r.freeformText}</em>}
                      {r.mode==='ifthen'&&<div>→ {r.outcome}</div>}
                    </TableCell>
                    <TableCell>{r.proprietary?'Yes':'No'}</TableCell>
                    <TableCell>{(
                      r.productId?'Product:'+r.productId :
                      r.coverageId?'Coverage:'+r.coverageId :
                      r.formId?'Form:'+r.formId :
                      r.pricingId?'Pricing:'+r.pricingId : '—'
                    )}</TableCell>
                    <TableCell>
                      <AddButton style={{ background:'transparent', color:'#4F46E5' }} onClick={()=>openEdit(r)}>
                        <PencilIcon style={{ width:16,height:16 }}/>
                      </AddButton>
                      <AddButton style={{ background:'transparent', color:'#DC2626' }} onClick={()=>deleteDoc(doc(db,'rules',r.id))}>
                        <TrashIcon style={{ width:16,height:16 }}/>
                      </AddButton>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </TableContainer>
        ) : <p>No rules found.</p>}

        {showModal && (
          <ModalOverlay onClick={()=>{ setShowModal(false); resetForm(); }}>
            <ModalBox onClick={e=>e.stopPropagation()}>
              <CloseButton onClick={()=>{ setShowModal(false); resetForm(); }}><XMarkIcon/></CloseButton>
              <Title style={{ fontSize: '20px', marginBottom: '8px' }}>{editing?'Edit Rule':'Add Rule'}</Title>
              <ModeToggle>
                <ToggleBtn active={form.mode==='ifthen'} onClick={()=>setForm({...form,mode:'ifthen'})}>If/Then</ToggleBtn>
                <ToggleBtn active={form.mode==='freeform'} onClick={()=>setForm({...form,mode:'freeform'})}>Freeform</ToggleBtn>
              </ModeToggle>
              <FormGroup>
                <Input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
              </FormGroup>
              {form.mode==='ifthen' ? (
                <>  <FormGroup><Label>If Conditions</Label>
                    {form.conditions.map((c,i)=>(
                      <LinkedGroup key={i}>
                        <Input placeholder="Field" value={c.field} onChange={e=>updateCond(i,'field',e.target.value)} />
                        <Select value={c.operator} onChange={e=>updateCond(i,'operator',e.target.value)}>
                          <option value="">Operator</option>
                          <option value="==">Equals</option>
                          <option value=">">Greater</option>
                          <option value="<">Less</option>
                          <option value=">=">≥</option>
                          <option value="<=">≤</option>
                          <option value="!=">≠</option>
                        </Select>
                        <Input placeholder="Value" value={c.value} onChange={e=>updateCond(i,'value',e.target.value)} />
                        <CancelBtn disabled={form.conditions.length===1} onClick={()=>removeCond(i)}><TrashIcon/></CancelBtn>
                      </LinkedGroup>
                    ))}
                    <AddButton onClick={addCondition}><PlusIcon style={{ width:16,height:16 }}/>Add</AddButton>
                  </FormGroup>
                  <FormGroup><Label>Then Outcome</Label>
                    <Input placeholder="Outcome" value={form.outcomeText} onChange={e=>setForm({...form,outcomeText:e.target.value})} />
                  </FormGroup>
                </>
              ) : (
                <FormGroup><Label>Rule Text</Label>
                  <Textarea placeholder="Write your rule..." value={form.freeformText} onChange={e=>setForm({...form,freeformText:e.target.value})} />
                </FormGroup>
              )}
              <FormGroup>
                <Select value={form.proprietary} onChange={e=>setForm({...form,proprietary:e.target.value})}>
                  <option value="No">Proprietary: No</option>
                  <option value="Yes">Yes</option>
                </Select>
              </FormGroup>
              <FormGroup><Label>Link To</Label>
                <LinkedGroup>
                  <Select value={form.linkedEntity.type} onChange={e=>setForm({...form,linkedEntity:{type:e.target.value,id:''}})}>
                    <option value="">None</option>
                    <option value="Product">Product</option>
                    <option value="Coverage">Coverage</option>
                    <option value="Form">Form</option>
                    <option value="Pricing">Pricing</option>
                  </Select>
                  {form.linkedEntity.type && (
                    <Select value={form.linkedEntity.id} onChange={e=>setForm({...form,linkedEntity:{...form.linkedEntity,id:e.target.value}})}>
                      <option value="">Select {form.linkedEntity.type}</option>
                      {entities[form.linkedEntity.type.toLowerCase()]?.map(ent=>(
                        <option key={ent.id} value={ent.id}>{ent.name}</option>
                      ))}
                    </Select>
                  )}
                </LinkedGroup>
              </FormGroup>
              <FormActions>
                <SubmitBtn onClick={handleSubmit}>{editing?'Save':'Add'}</SubmitBtn>
                <CancelBtn onClick={()=>{ setShowModal(false); resetForm(); }}>Cancel</CancelBtn>
              </FormActions>
            </ModalBox>
          </ModalOverlay>
        )}
      </Wrapper>
    </Container>
  );
}
