import React, { useEffect, useState, useMemo } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';
import MainNavigation from './ui/Navigation';
import {
  MagnifyingGlassIcon,
  Squares2X2Icon,
  TableCellsIcon,
  PlusIcon
} from '@heroicons/react/24/solid';
import styled from 'styled-components';

/* ---------- styled components ---------- */
// Container - Clean gradient background matching other pages
const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
  position: relative;
`;

// Main Content - Modern layout
const MainContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
  position: relative;
  z-index: 1;
`;

// Header Section
const HeaderSection = styled.div`
  margin-bottom: 40px;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b 0%, #475569 50%, #64748b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  text-align: center;
  letter-spacing: -0.02em;
  line-height: 1.1;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

// Search Container
const SearchContainer = styled.div`
  width: 100%;
  max-width: 800px;
  margin: 0 auto 40px;
  position: relative;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  padding: 10px 20px;
  gap: 16px;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
    border-color: rgba(99, 102, 241, 0.3);
  }

  &:focus-within {
    box-shadow: 0 12px 40px rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.5);
  }

  @media (max-width: 768px) {
    max-width: 100%;
    margin-bottom: 24px;
    padding: 8px 16px;
  }
`;

const SearchIcon = styled(MagnifyingGlassIcon)`
  width: 20px;
  height: 20px;
  color: #9ca3af;
  flex-shrink: 0;
`;

const SearchInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 16px;
  color: #1f2937;
  font-weight: 400;

  &::placeholder {
    color: #9ca3af;
  }

  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

// Action Bar
const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  gap: 16px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 12px;
  }
`;

const ActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

// View Toggle
const ViewToggle = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 4px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const ViewToggleButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  background: ${props => props.active ? 'rgba(99, 102, 241, 0.1)' : 'transparent'};
  color: ${props => props.active ? '#6366f1' : '#64748b'};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.05)'};
    color: #6366f1;
  }
`;

// Add Button
const AddButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 14px;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  border: 1px solid rgba(99, 102, 241, 0.2);

  &:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
  }
`;

// Table Container for table view
const TableContainer = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-bottom: 60px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const THead = styled.thead`
  background: #f9fafb;
`;

const Tr = styled.tr`
  border-bottom: 1px solid #e5e7eb;

  &:hover {
    background: #f9fafb;
  }
`;

const Th = styled.th`
  padding: 16px 12px;
  text-align: ${({ align = 'left' }) => align};
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
`;

const Td = styled.td`
  padding: 16px 12px;
  text-align: ${({ align = 'left' }) => align};
  font-size: 14px;
  color: #1f2937;
`;

// Cards Grid for card view
const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
  margin-bottom: 60px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

// Data Dictionary Card
const DictCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    border-color: #6366f1;
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const CardTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  flex: 1;
`;

const CategoryBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  margin-left: 12px;
`;

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const FieldLabel = styled.label`
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const CategorySelect = styled(TextInput).attrs({ as: 'select' })`
  width: 100%;
  font-size: 14px;
  padding: 8px 12px;
`;

const CardActions = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
`;

const DeleteButton = styled(Button)`
  padding: 6px 12px;
  font-size: 12px;
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
  border: 1px solid rgba(220, 38, 38, 0.2);

  &:hover {
    background: rgba(220, 38, 38, 0.15);
    border-color: rgba(220, 38, 38, 0.3);
  }
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

export default function DataDictionary() {
  const [rows, setRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

  // Subscribe to the 'dataDictionary' collection in Firestore
  useEffect(() => {
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
  }, []);

  // Create a new blank row
  const handleAddRow = async () => {
    try {
      await addDoc(collection(db, 'dataDictionary'), {
        category: 'N/A',
        displayName: '',
        code: ''
      });
    } catch (err) {
      console.error('Failed to add Data Dictionary row:', err);
      alert('Unable to add row. Please try again.');
    }
  };

  // Update a single field in a row
  const handleUpdate = async (id, field, value) => {
    try {
      await updateDoc(doc(db, 'dataDictionary', id), { [field]: value });
    } catch (err) {
      console.error('Failed to update Data Dictionary row:', err);
      alert('Unable to save changes. Please retry.');
    }
  };

  // Delete a row after confirmation
  const handleDelete = async id => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await deleteDoc(doc(db, 'dataDictionary', id));
    } catch (err) {
      console.error('Failed to delete Data Dictionary row:', err);
      alert('Unable to delete. Please retry.');
    }
  };

  // Filter rows based on search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;

    const query = searchQuery.toLowerCase();
    return rows.filter(row =>
      (row.displayName || '').toLowerCase().includes(query) ||
      (row.code || '').toLowerCase().includes(query) ||
      (row.category || '').toLowerCase().includes(query)
    );
  }, [rows, searchQuery]);

  return (
    <Container>
      <MainNavigation />
      <MainContent>
        <HeaderSection>
          <PageTitle>Data Dictionary</PageTitle>
        </HeaderSection>

        <SearchContainer>
          <SearchIcon />
          <SearchInput
            placeholder="Search by display name, code, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchContainer>

        {/* Action Bar with View Toggle */}
        <ActionBar>
          <ActionGroup>
            <ViewToggle>
              <ViewToggleButton
                active={viewMode === 'cards'}
                onClick={() => setViewMode('cards')}
              >
                <Squares2X2Icon width={16} height={16} />
                Cards
              </ViewToggleButton>
              <ViewToggleButton
                active={viewMode === 'table'}
                onClick={() => setViewMode('table')}
              >
                <TableCellsIcon width={16} height={16} />
                Table
              </ViewToggleButton>
            </ViewToggle>
          </ActionGroup>
          <AddButton onClick={handleAddRow}>
            <PlusIcon width={16} height={16} />
            Add Entry
          </AddButton>
        </ActionBar>

        {/* Data Display */}
        {filteredRows.length ? (
          viewMode === 'cards' ? (
            <CardsGrid>
              {filteredRows.map(row => (
                <DictCard key={row.id}>
                  <CardHeader>
                    <CardTitle>
                      {row.displayName || 'Unnamed Entry'}
                    </CardTitle>
                    <CategoryBadge>{row.category || 'N/A'}</CategoryBadge>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <FieldLabel>Category</FieldLabel>
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
                    </FieldGroup>
                    <FieldGroup>
                      <FieldLabel>Display Name</FieldLabel>
                      <TextInput
                        value={row.displayName}
                        onChange={e => handleUpdate(row.id, 'displayName', e.target.value)}
                        placeholder="Display Name"
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <FieldLabel>IT Code</FieldLabel>
                      <TextInput
                        value={row.code}
                        onChange={e => handleUpdate(row.id, 'code', e.target.value)}
                        placeholder="IT Code"
                      />
                    </FieldGroup>
                  </CardContent>
                  <CardActions>
                    <DeleteButton onClick={() => handleDelete(row.id)}>
                      Delete
                    </DeleteButton>
                  </CardActions>
                </DictCard>
              ))}
            </CardsGrid>
          ) : (
            <TableContainer>
              <Table>
                <THead>
                  <Tr>
                    <Th>Category</Th>
                    <Th>Display Name</Th>
                    <Th>IT Code</Th>
                    <Th align="center" style={{ width: 150 }}>Actions</Th>
                  </Tr>
                </THead>
                <tbody>
                  {filteredRows.map(row => (
                    <Tr key={row.id}>
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
                      <Td>
                        <TextInput
                          value={row.displayName}
                          onChange={e => handleUpdate(row.id, 'displayName', e.target.value)}
                          placeholder="Display Name"
                        />
                      </Td>
                      <Td>
                        <TextInput
                          value={row.code}
                          onChange={e => handleUpdate(row.id, 'code', e.target.value)}
                          placeholder="IT Code"
                        />
                      </Td>
                      <Td align="center">
                        <DeleteButton onClick={() => handleDelete(row.id)}>
                          Delete
                        </DeleteButton>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableContainer>
          )
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#6b7280',
            fontSize: '16px'
          }}>
            {searchQuery ? 'No entries match your search.' : 'No data dictionary entries yet.'}
          </div>
        )}
      </MainContent>
    </Container>
  );
}
