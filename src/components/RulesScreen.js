// src/components/RulesScreen.js
import React, { useEffect, useState, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/solid';

import { Page, Container, PageHeader, Title } from '../components/ui/Layout';
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

/* ---------- local styles ---------- */
const TableWrapper = styled.div`
  margin-top: 24px;
  max-height: 480px;
  overflow: auto;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
`;

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
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  border: none;
  cursor: pointer;
  z-index: 100;
  &:hover { background: #5b21b6; }
`;

export default function RulesScreen() {
  const nav = useNavigate();

  // rules list + UI state
  const [rules, setRules] = useState([]);
  const [open, setOpen] = useState(false);

  // new-rule form
  const [name, setName] = useState('');
  const [ruleId, setRuleId] = useState('');
  const [ruleText, setRuleText] = useState('');

  // search
  const [rawSearch, setRawSearch] = useState('');
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);

  // load rules from Firestore on mount
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, 'rules'));
      setRules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    })();
  }, []);

  // debounce search input
  useEffect(() => {
    const id = setTimeout(() => setSearch(rawSearch.trim().toLowerCase()), 250);
    return () => clearTimeout(id);
  }, [rawSearch]);

  // “/” key focuses search
  useEffect(() => {
    const handler = e => {
      if (e.key === '/' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // filtered list
  const filteredRules = useMemo(() => {
    if (!search) return rules;
    return rules.filter(r =>
      (r.name || '').toLowerCase().includes(search) ||
      (r.ruleId || '').toLowerCase().includes(search) ||
      (r.ruleText || '').toLowerCase().includes(search)
    );
  }, [rules, search]);

  const resetForm = () => {
    setName('');
    setRuleId('');
    setRuleText('');
  };

  const handleSave = async () => {
    if (!ruleText.trim()) {
      alert('Please enter some rule text.');
      return;
    }
    const payload = {
      name: name.trim(),
      ruleId: ruleId.trim(),
      ruleText: ruleText.trim(),
    };
    const docRef = await addDoc(collection(db, 'rules'), payload);
    setRules(rs => [...rs, { id: docRef.id, ...payload }]);
    setOpen(false);
    resetForm();
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this rule?')) return;
    await deleteDoc(doc(db, 'rules', id));
    setRules(rs => rs.filter(r => r.id !== id));
  };

  return (
    <Page>
      <Container>
        <PageHeader>
          <Title>Rules Repository</Title>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <TextInput
              ref={searchRef}
              placeholder="Search rules..."
              value={rawSearch}
              onChange={e => setRawSearch(e.target.value)}
              style={{ width: 240 }}
            />
            <Button variant="ghost" onClick={() => nav(-1)}>Back</Button>
          </div>
        </PageHeader>

        {filteredRules.length > 0 && (
          <TableWrapper>
            <Table>
              <THead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Rule ID</Th>
                  <Th>Rule Text</Th>
                  <Th>Actions</Th>
                </Tr>
              </THead>
              <tbody>
                {filteredRules.map(r => (
                  <Tr key={r.id}>
                    <Td>{r.name}</Td>
                    <Td>{r.ruleId}</Td>
                    <Td align="left">
                      <pre style={{
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'monospace',
                        fontSize: 13
                      }}>
                        {r.ruleText}
                      </pre>
                    </Td>
                    <Td>
                      <Button
                        variant="danger"
                        onClick={() => handleDelete(r.id)}
                        title="Delete"
                      >
                        <TrashIcon width={16} height={16}/>
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        )}

        {open && (
          <Overlay onClick={() => { setOpen(false); resetForm(); }}>
            <Modal onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>New Rule</ModalTitle>
                <CloseBtn onClick={() => { setOpen(false); resetForm(); }}>
                  <XMarkIcon width={20} height={20}/>
                </CloseBtn>
              </ModalHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <TextInput
                  placeholder="Rule Name (optional)"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
                <TextInput
                  placeholder="Rule ID (optional)"
                  value={ruleId}
                  onChange={e => setRuleId(e.target.value)}
                />
                <TextInput
                  as="textarea"
                  rows={6}
                  placeholder="Enter rule text..."
                  value={ruleText}
                  onChange={e => setRuleText(e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <Button onClick={handleSave}>Save</Button>
                  <Button variant="ghost" onClick={() => { setOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </Modal>
          </Overlay>
        )}

        <Fab aria-label="Add rule" onClick={() => setOpen(true)}>
          <PlusIcon width={24} height={24}/>
        </Fab>
      </Container>
    </Page>
  );
}