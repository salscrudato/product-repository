// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { GlobalStyle } from './styles/GlobalStyle';
import { theme } from './styles/theme';

import styled from 'styled-components';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { useNavigate } from 'react-router-dom';
import { FaUserCircle } from 'react-icons/fa';

/* public */
import Login from './components/Login';

/* protected */
import Home from './components/Home';
import ProductHub from './components/ProductHub';
import DataDictionary from './components/DataDictionary';
import CoverageScreen from './components/CoverageScreen';
import PricingScreen from './components/PricingScreen';
import FormsScreen from './components/FormsScreen';
import StatesScreen from './components/StatesScreen';
import TableScreen from './components/TableScreen';
import RulesScreen from './components/RulesScreen';
import CoverageStatesScreen from './components/CoverageStatesScreen';
import ProductExplorer from './components/ProductExplorer';
import ProductBuilder from './components/ProductBuilder';
import VersionControlSidebar, { SIDEBAR_WIDTH } from './components/VersionControlSidebar';

/* wrapper */
import RequireAuth from './components/RequireAuth';

const ProfileWrapper = styled.div`
  position: fixed;
  top: 16px;
  right: ${props => props.shiftRight || 16}px;
  z-index: 1400; /* below VersionControlSidebar (1500) */
  transition: right 0.3s ease;
`;

const ProfileIconBtn = styled.button`
  background: none;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #374151;
  &:hover { color: #1f2937; }
`;

const Dropdown = styled.div`
  position: absolute;
  top: 40px;
  right: 0;
  min-width: 120px;
  background: #ffffff;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1401;
`;

const DropdownItem = styled.button`
  width: 100%;
  background: none;
  border: none;
  padding: 10px 16px;
  text-align: left;
  font-size: 14px;
  cursor: pointer;
  &:hover { background: #F3F4F6; }
`;

// ──────────────────────────────────────────────────────────────
// HistoryWrapper – provides floating toggle + Version sidebar
// ──────────────────────────────────────────────────────────────
const HistoryWrapper = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // close the profile dropdown when clicking outside
  useEffect(() => {
    const handleClick = e => {
      if (profileOpen && !e.target.closest('#profile-menu')) {
        setProfileOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [profileOpen]);

  // Extract productId from any product‑specific route
  const match = location.pathname.match(
    /\/(?:coverage|coverage-states|pricing|states|rules|table|forms)\/([^\/]+)/,
  );
  const productId = match ? match[1] : null;

  return (
    <>
      {/* Floating “history” button (bottom‑right) */}

      {/* hide on login route */}
      {!location.pathname.startsWith('/login') && (
        <ProfileWrapper
          id="profile-menu"
          shiftRight={historyOpen ? SIDEBAR_WIDTH + 16 : 16}
        >
          <ProfileIconBtn onClick={() => setProfileOpen(o => !o)}>
            <FaUserCircle size={30} />
          </ProfileIconBtn>

          {profileOpen && (
            <Dropdown>
              <DropdownItem
                onClick={async () => {
                  try {
                    await signOut(auth);
                    navigate('/login', { replace: true });
                  } catch (err) {
                    console.error('Logout failed', err);
                    alert('Failed to log out');
                  }
                }}
              >
                Log out
              </DropdownItem>
            </Dropdown>
          )}
        </ProfileWrapper>
      )}

      <VersionControlSidebar
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        productId={productId}
      />

      {/* Primary route tree */}
      <Routes>
        {/* public */}
        <Route path="/login" element={<Login />} />

        {/* protected */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />
        <Route
          path="/products"
          element={
            <RequireAuth>
              <ProductHub />
            </RequireAuth>
          }
        />
        <Route
          path="/coverage/:productId/*"
          element={
            <RequireAuth>
              <CoverageScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/coverage-states/:productId/:coverageId"
          element={
            <RequireAuth>
              <CoverageStatesScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/forms/:productId/*"
          element={
            <RequireAuth>
              <FormsScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/pricing/:productId"
          element={
            <RequireAuth>
              <PricingScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/states/:productId"
          element={
            <RequireAuth>
              <StatesScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/table/:productId/:stepId"
          element={
            <RequireAuth>
              <TableScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/rules/:productId"
          element={
            <RequireAuth>
              <RulesScreen title="Rules" />
            </RequireAuth>
          }
        />
        <Route
          path="/product-explorer"
          element={
            <RequireAuth>
              <ProductExplorer />
            </RequireAuth>
          }
        />
        <Route
          path="/product-builder"
          element={
            <RequireAuth>
              <ProductBuilder />
            </RequireAuth>
          }
        />
        <Route
          path="/data-dictionary"
          element={
            <RequireAuth>
              <DataDictionary />
            </RequireAuth>
          }
        />

        {/* catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <Router>
        <HistoryWrapper />
      </Router>
    </ThemeProvider>
  );
}

export default App;