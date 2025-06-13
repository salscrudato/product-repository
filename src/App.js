// src/App.js
import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { GlobalStyle } from './styles/GlobalStyle';
import { createTheme } from './styles/theme';
import ErrorBoundary from './components/ErrorBoundary';
import { DarkModeProvider, useDarkMode } from './contexts/DarkModeContext';
import { initBundleOptimizations, createOptimizedLazyComponent } from './utils/bundleOptimization';
// import AgentAssistant from './components/AgentAssistant';

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

/* protected - Heavy components lazy loaded with optimization */
const DataDictionary = createOptimizedLazyComponent(
  () => import('./components/DataDictionary'),
  { chunkName: 'DataDictionary', fallback: <LoadingSpinner /> }
);
const CoverageScreen = createOptimizedLazyComponent(
  () => import('./components/CoverageScreen'),
  { chunkName: 'CoverageScreen', fallback: <LoadingSpinner /> }
);
const PricingScreen = createOptimizedLazyComponent(
  () => import('./components/PricingScreen'),
  { chunkName: 'PricingScreen', fallback: <LoadingSpinner /> }
);
const TableScreen = createOptimizedLazyComponent(
  () => import('./components/TableScreen'),
  { chunkName: 'TableScreen', fallback: <LoadingSpinner /> }
);
const FormsScreen = createOptimizedLazyComponent(
  () => import('./components/FormsScreen'),
  { chunkName: 'FormsScreen', fallback: <LoadingSpinner /> }
);
const StatesScreen = createOptimizedLazyComponent(
  () => import('./components/StatesScreen'),
  { chunkName: 'StatesScreen', fallback: <LoadingSpinner /> }
);
const RulesScreen = createOptimizedLazyComponent(
  () => import('./components/RulesScreen'),
  { chunkName: 'RulesScreen', fallback: <LoadingSpinner /> }
);
const CoverageStatesScreen = createOptimizedLazyComponent(
  () => import('./components/CoverageStatesScreen'),
  { chunkName: 'CoverageStatesScreen', fallback: <LoadingSpinner /> }
);
const ProductExplorer = createOptimizedLazyComponent(
  () => import('./components/ProductExplorer'),
  { chunkName: 'ProductExplorer', fallback: <LoadingSpinner /> }
);
const ProductBuilder = createOptimizedLazyComponent(
  () => import('./components/ProductBuilder'),
  { chunkName: 'ProductBuilder', fallback: <LoadingSpinner /> }
);
const ClaimsAnalysis = createOptimizedLazyComponent(
  () => import('./components/ClaimsAnalysis'),
  { chunkName: 'ClaimsAnalysis', fallback: <LoadingSpinner /> }
);
const AgentDemo = createOptimizedLazyComponent(
  () => import('./components/AgentDemo'),
  { chunkName: 'AgentDemo', fallback: <LoadingSpinner /> }
);
const TaskManagement = createOptimizedLazyComponent(
  () => import('./components/TaskManagement'),
  { chunkName: 'TaskManagement', fallback: <LoadingSpinner /> }
);
const News = createOptimizedLazyComponent(
  () => import('./components/News'),
  { chunkName: 'News', fallback: <LoadingSpinner /> }
);



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
        <Route
          path="/agent-demo"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <AgentDemo />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/tasks"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <TaskManagement />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/news"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <News />
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

// Theme wrapper component that uses dark mode context
const ThemedApp = () => {
  const { isDarkMode } = useDarkMode();
  const theme = createTheme(isDarkMode);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <HistoryWrapper />
        {/* <AgentAssistant /> */}
      </Router>
    </ThemeProvider>
  );
};

function App() {
  // Initialize bundle optimizations
  useEffect(() => {
    initBundleOptimizations();
  }, []);

  return (
    <ErrorBoundary>
      <DarkModeProvider>
        <ThemedApp />
      </DarkModeProvider>
    </ErrorBoundary>
  );
}

export default App;