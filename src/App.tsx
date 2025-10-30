import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { GlobalStyle } from './styles/GlobalStyle';
import { theme } from './styles/theme';
import ErrorBoundary from './components/ErrorBoundary';
import { initBundleOptimizations, createOptimizedLazyComponent } from './utils/bundleOptimization';
import { ConnectionStatus } from './components/ui/ConnectionStatus';

import logger, { LOG_CATEGORIES } from './utils/logger';
import env from './config/env';

/* public */
import Login from './components/Login';

/* protected - Core components loaded immediately */
import Home from './components/Home';
import RequireAuth from './components/RequireAuth';

// Loading component for lazy-loaded routes (must be defined before use)
const LoadingSpinner: React.FC = () => (
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

// ProductHub is lazy-loaded to avoid import conflict with bundleOptimization preloading
const ProductHub = createOptimizedLazyComponent(
  () => import('./components/ProductHub'),
  { chunkName: 'ProductHub', fallback: <LoadingSpinner /> }
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
const PackagesScreen = createOptimizedLazyComponent(
  () => import('./components/PackagesScreen'),
  { chunkName: 'PackagesScreen', fallback: <LoadingSpinner /> }
);
const ProductExplorer = createOptimizedLazyComponent(
  () => import('./components/ProductExplorer'),
  { chunkName: 'ProductExplorer', fallback: <LoadingSpinner /> }
);
const ProductBuilder = createOptimizedLazyComponent(
  () => import('./components/ProductBuilder'),
  { chunkName: 'ProductBuilder', fallback: <LoadingSpinner /> }
);
const AIBuilder = createOptimizedLazyComponent(
  () => import('./components/AIBuilder'),
  { chunkName: 'AIBuilder', fallback: <LoadingSpinner /> }
);
const Builder = createOptimizedLazyComponent(
  () => import('./components/Builder'),
  { chunkName: 'Builder', fallback: <LoadingSpinner /> }
);
const ClaimsAnalysis = createOptimizedLazyComponent(
  () => import('./components/ClaimsAnalysis'),
  { chunkName: 'ClaimsAnalysis', fallback: <LoadingSpinner /> }
);
const TaskManagement = createOptimizedLazyComponent(
  () => import('./components/TaskManagement'),
  { chunkName: 'TaskManagement', fallback: <LoadingSpinner /> }
);
const Product360 = createOptimizedLazyComponent(
  () => import('./pages/Product360'),
  { chunkName: 'Product360', fallback: <LoadingSpinner /> }
);
const FormsMapper = createOptimizedLazyComponent(
  () => import('./pages/FormsMapper'),
  { chunkName: 'FormsMapper', fallback: <LoadingSpinner /> }
);
const PricingBuilder = createOptimizedLazyComponent(
  () => import('./pages/PricingBuilder'),
  { chunkName: 'PricingBuilder', fallback: <LoadingSpinner /> }
);
const QuoteSandbox = createOptimizedLazyComponent(
  () => import('./pages/QuoteSandbox'),
  { chunkName: 'QuoteSandbox', fallback: <LoadingSpinner /> }
);

// ──────────────────────────────────────────────────────────────
// HistoryWrapper – provides floating toggle + Version sidebar
// ──────────────────────────────────────────────────────────────
const HistoryWrapper: React.FC = () => {
  return (
    <>
      {/* Floating "history" button (bottom‑right) */}
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
          path="/rules/:productId/:coverageId"
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
          path="/ai-builder"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <AIBuilder />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/builder"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <Builder />
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
          path="/products/:productId/packages"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <PackagesScreen />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/products/:productId/overview"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <Product360 />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/products/:productId/forms-mapper"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <FormsMapper />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/products/:productId/pricing"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <PricingBuilder />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/quote-sandbox/:productId"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <QuoteSandbox />
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

const App: React.FC = () => {
  // Initialize bundle optimizations and performance monitoring
  useEffect(() => {
    logger.info(LOG_CATEGORIES.DATA, 'App initialization started');

    try {
      initBundleOptimizations();
      logger.info(LOG_CATEGORIES.DATA, 'Bundle optimizations initialized');

      // Performance monitor is automatically initialized on import
      logger.info(LOG_CATEGORIES.PERFORMANCE, 'Performance monitoring active');
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'App initialization failed', {
        environment: env.NODE_ENV
      }, error as Error);
    }
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <ConnectionStatus />
        <Router>
          <HistoryWrapper />
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;

