// src/App.js
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { GlobalStyle } from './styles/GlobalStyle';
import { theme } from './styles/theme';
import ErrorBoundary from './components/ErrorBoundary';

/* public */
import Login from './components/Login';

/* protected - Core components loaded immediately */
import Home from './components/Home';
import ProductHub from './components/ProductHub';
import RequireAuth from './components/RequireAuth';

// Loading component for lazy-loaded routes
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '16px',
    color: '#6b7280'
  }}>
    Loading...
  </div>
);

/* protected - Heavy components lazy loaded */
const DataDictionary = lazy(() => import('./components/DataDictionary'));
const CoverageScreen = lazy(() => import('./components/CoverageScreen'));
const PricingScreen = lazy(() => import('./components/PricingScreen'));
const TableScreen = lazy(() => import('./components/TableScreen'));
const FormsScreen = lazy(() => import('./components/FormsScreen'));
const StatesScreen = lazy(() => import('./components/StatesScreen'));
const RulesScreen = lazy(() => import('./components/RulesScreen'));
const CoverageStatesScreen = lazy(() => import('./components/CoverageStatesScreen'));
const ProductExplorer = lazy(() => import('./components/ProductExplorer'));
const ProductBuilder = lazy(() => import('./components/ProductBuilder'));
const ClaimsAnalysis = lazy(() => import('./components/ClaimsAnalysis'));



// ──────────────────────────────────────────────────────────────
// HistoryWrapper – provides floating toggle + Version sidebar
// ──────────────────────────────────────────────────────────────
const HistoryWrapper = () => {
  return (
    <>
      {/* Floating “history” button (bottom‑right) */}

      {/* hide on login route */}




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
              <Suspense fallback={<LoadingSpinner />}>
                <CoverageScreen />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/coverage-states/:productId/:coverageId"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <CoverageStatesScreen />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/forms/:productId/*"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <FormsScreen />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/pricing/:productId"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <PricingScreen />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/states/:productId"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <StatesScreen />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/table/:productId/:stepId"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <TableScreen />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/rules"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <RulesScreen />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/rules/:productId"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <RulesScreen />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/product-explorer"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <ProductExplorer />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/product-builder"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <ProductBuilder />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/claims-analysis"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <ClaimsAnalysis />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/data-dictionary"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <DataDictionary />
              </Suspense>
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
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <HistoryWrapper />
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;