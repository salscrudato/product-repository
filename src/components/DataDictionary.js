import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
import styled from 'styled-components';

/* ---------- styled components ---------- */
// Page - Clean gradient background with overlay
const Page = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
  display: flex;
  flex-direction: column;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 300px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%);
    opacity: 0.08;
    z-index: 0;
  }
`;

const Navigation = styled.nav`
  display: flex;
  justify-content: center;
  padding: 24px 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  position: relative;
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const NavList = styled.ul`
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 48px;

  @media (max-width: 768px) {
    gap: 24px;
    flex-wrap: wrap;
    justify-content: center;
  }
`;

const NavItem = styled.li``;

const NavLink = styled(Link)`
  text-decoration: none;
  color: #64748b;
  font-weight: 600;
  font-size: 15px;
  padding: 12px 20px;
  border-radius: 12px;
  transition: all 0.3s ease;
  position: relative;
  letter-spacing: -0.01em;

  &:hover {
    color: #1e293b;
    background: rgba(99, 102, 241, 0.08);
    transform: translateY(-1px);
  }

  &.active {
    color: #6366f1;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);

    &::after {
      content: '';
      position: absolute;
      bottom: -24px;
      left: 50%;
      transform: translateX(-50%);
      width: 4px;
      height: 4px;
      background: #6366f1;
      border-radius: 50%;
    }
  }

  @media (max-width: 768px) {
    font-size: 14px;
    padding: 10px 16px;
  }
`;

const MainContent = styled.main`
  flex: 1;
  padding: 60px 32px 80px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    padding: 40px 20px 60px;
  }
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b 0%, #475569 50%, #64748b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 32px 0;
  text-align: center;
  letter-spacing: -0.02em;
  line-height: 1.1;

  @media (max-width: 768px) {
    font-size: 1.5rem;
    margin-bottom: 24px;
  }
`;

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

const CategorySelect = styled(TextInput).attrs({ as: 'select' })`
  width: 100%;
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
  const location = useLocation();

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

  return (
    <Page>
      <Navigation>
        <NavList>
          <NavItem>
            <NavLink
              to="/"
              className={location.pathname === '/' ? 'active' : ''}
            >
              Home
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              to="/products"
              className={location.pathname === '/products' ? 'active' : ''}
            >
              Products
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              to="/product-builder"
              className={location.pathname.startsWith('/product-builder') ? 'active' : ''}
            >
              Builder
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              to="/product-explorer"
              className={location.pathname.startsWith('/product-explorer') ? 'active' : ''}
            >
              Explorer
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              to="/data-dictionary"
              className={location.pathname === '/data-dictionary' ? 'active' : ''}
            >
              Data Dictionary
            </NavLink>
          </NavItem>
        </NavList>
      </Navigation>

      <MainContent>
        <PageTitle>Data Dictionary</PageTitle>

          <Table style={{ marginBottom: 24 }}>
            <THead>
              <Tr>
                <Th>Category</Th>
                <Th>Display Name</Th>
                <Th>IT Code</Th>
                <Th align="center" style={{ width: 150 }}>Actions</Th>
              </Tr>
            </THead>
            <tbody>
              {rows.map(row => (
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

          <Button onClick={handleAddRow}>Add Row</Button>
      </MainContent>
    </Page>
  );
}
