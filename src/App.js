// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { GlobalStyle } from './styles/GlobalStyle';
import { theme } from './styles/theme';

/* public */
import Login from './components/Login';

/* protected */
import ProductHub from './components/ProductHub';
import CoverageScreen from './components/CoverageScreen';
import PricingScreen from './components/PricingScreen';
import FormsScreen from './components/FormsScreen';
import StatesScreen from './components/StatesScreen';
import TableScreen from './components/TableScreen';
import RulesScreen from './components/RulesScreen';
import CoverageStatesScreen from './components/CoverageStatesScreen';
import ProductExplorer from './components/ProductExplorer';
import ProductBuilder from './components/ProductBuilder';
import VersionControlSidebar from './components/VersionControlSidebar';

/* wrapper */
import RequireAuth from './components/RequireAuth';

// ──────────────────────────────────────────────────────────────
// HistoryWrapper – provides floating toggle + Version sidebar
// ──────────────────────────────────────────────────────────────
const HistoryWrapper = () => {
  const location = useLocation();
  const [historyOpen, setHistoryOpen] = useState(false);

  // Extract productId from any product‑specific route
  const match = location.pathname.match(
    /\/(?:coverage|coverage-states|pricing|states|rules|table|forms)\/([^\/]+)/,
  );
  const productId = match ? match[1] : null;

  return (
    <>
      {/* Floating “history” button (bottom‑right) */}
      <button
        onClick={() => setHistoryOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: 'none',
          background: '#7c3aed',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '1.25rem',
          boxShadow: '0 4px 12px rgba(0,0,0,.25)',
          zIndex: 1100,
        }}
        aria-label="Open version history"
        title="Version history"
      >
        🕘
      </button>

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