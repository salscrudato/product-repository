// src/components/DataDictionaryModal.tsx

import { useEffect, useState } from 'react';
// Firestore imports for real-time subscription and mutations
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
// Shared UI primitives
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
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';
import styled from 'styled-components';

const WideModal = styled(Modal)`
  max-width: 900px;
  width: 90%;
`;

// Allowed categories for each entry
const CATEGORY_OPTIONS = [
  'Insured',
  'Product',
  'Pricing',
  'Rules',
  'Forms',
  'N/A'
];

// A styled wrapper for the category <select>, matching TextInput look
const CategorySelect = styled(TextInput).attrs({ as: 'select' })`
  width: 100%;
`;

interface DataDictionaryModalProps {
  /** Whether the modal is visible */
  open: boolean;
  /** Callback to close the modal */
  onClose: () => void;
}

interface DataDictionaryRow {
  id: string;
  category: string;
  displayName: string;
  code: string;
}

export default function DataDictionaryModal({ open, onClose }: DataDictionaryModalProps) {
  // Local state for rows fetched from Firestore
  const [rows, setRows] = useState<DataDictionaryRow[]>([]);

  // Subscribe to the 'dataDictionary' collection in Firestore
  useEffect(() => {
    if (!open) return; // only subscribe when modal is open
    const unsubscribe = onSnapshot(
      collection(db, 'dataDictionary'),
      snapshot => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setRows(data);
      },
      error => {
        console.error('Data Dictionary subscription error:', error);
      }
    );
    return unsubscribe;
  }, [open]);

  // Create a new blank row
  const handleAddRow = async () => {
    try {
      await addDoc(collection(db, 'dataDictionary'), {
        category: 'N/A',
        displayName: '',
        code: ''
      });
      // onSnapshot will update local state automatically
    } catch (err) {
      console.error('Failed to add Data Dictionary row:', err);
      alert('Unable to add row. Please try again.');
    }
  };

  // Update a single field in a row
  const handleUpdate = async (id: string, field: keyof Omit<DataDictionaryRow, 'id'>, value: string) => {
    try {
      await updateDoc(doc(db, 'dataDictionary', id), { [field]: value });
      // optimistic UI: local state will reflect Firestore update via onSnapshot
    } catch (err) {
      console.error('Failed to update Data Dictionary row:', err);
      alert('Unable to save changes. Please retry.');
    }
  };

  // Delete a row after confirmation
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await deleteDoc(doc(db, 'dataDictionary', id));
    } catch (err) {
      console.error('Failed to delete Data Dictionary row:', err);
      alert('Unable to delete. Please retry.');
    }
  };

  // If not open, render nothing
  if (!open) return null;

  return (
    <Overlay onClick={onClose}>
      <WideModal onClick={e => e.stopPropagation()}>
        {/* Header with title and close button */}
        <ModalHeader>
          <ModalTitle>Data Dictionary</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>

        {/* Data table */}
        <Table style={{ marginBottom: 24 }}>
          <THead>
            <Tr>
              <Th>Category</Th>
              <Th>Display Name</Th>
              <Th>IT Code</Th>
              <Th align="center" style={{ width: 150 }} />
            </Tr>
          </THead>
          <tbody>
            {rows.map(row => (
              <Tr key={row.id}>
                {/* Category dropdown */}
                <Td>
                  <CategorySelect
                    value={row.category || 'N/A'}
                    onChange={e => handleUpdate(row.id, 'category', e.target.value)}
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </CategorySelect>
                </Td>

                {/* Display Name input */}
                <Td>
                  <TextInput
                    value={row.displayName}
                    onChange={e => handleUpdate(row.id, 'displayName', e.target.value)}
                    placeholder="Display Name"
                  />
                </Td>

                {/* IT Code input */}
                <Td>
                  <TextInput
                    value={row.code}
                    onChange={e => handleUpdate(row.id, 'code', e.target.value)}
                    placeholder="IT Code"
                  />
                </Td>

                {/* Delete button */}
                <Td align="center">
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(row.id)}
                    style={{ padding: '4px 8px' }}
                  >
                    Delete
                  </Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>

        {/* Add Row action */}
        <Button onClick={handleAddRow}>Add Row</Button>
      </WideModal>
    </Overlay>
  );
}