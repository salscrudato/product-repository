import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import styled from 'styled-components';
import { QueryClientProvider } from '@tanstack/react-query';
import { GlobalStyle } from './styles/GlobalStyle';
import { theme } from './styles/theme';
import ErrorBoundary from './components/ErrorBoundary';
import { initBundleOptimizations, createOptimizedLazyComponent } from './utils/bundleOptimization';
import { ConnectionStatus } from './components/ui/ConnectionStatus';
import { PageLoadingSpinner } from './components/ui/LoadingSpinner';
import { ToastProvider } from './components/common/Toast';
import { StatusAnnouncerProvider } from './components/common/StatusAnnouncer';
import { RouteProgressProvider } from './components/ui/RouteProgress';
import { RoleProvider } from './context/RoleContext';
import { ChangeSetProvider } from './context/ChangeSetContext';
import { queryClient } from './lib/queryClient';

// ── Eager dependency pre-warming ──────────────────────────────────────
// These side-effect-free imports exist solely to force Vite's dependency
// optimizer to discover these packages during its initial module-graph
// scan (i.e., when it processes App.tsx, which is always loaded eagerly).
// Without this, packages only reachable through lazy-loaded chunks
// (React.lazy / createOptimizedLazyComponent) won't be found until the
// lazy chunk is requested, at which point Vite re-optimizes and
// invalidates the old URLs — causing "504 Outdated Optimize Dep" errors.
import 'react-window';
import 'react-simple-maps';
import 'react-markdown';
import 'remark-gfm';
import 'xlsx';
import 'file-saver';

// Skip to content link for accessibility
const SkipLink = styled.a`
  position: absolute;
  top: -40px;
  left: 16px;
  padding: 8px 16px;
  background: ${({ theme }) => theme.colours.primary};
  color: white;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  z-index: 10001;
  text-decoration: none;
  transition: top 0.2s ease;

  &:focus {
    top: 16px;
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.4);
  }
`;

import logger, { LOG_CATEGORIES } from './utils/logger';
import env from './config/env';



/* public */
import Login from './components/Login';

/* protected - Core components loaded immediately */
import Home from './components/Home';
import RequireAuth from './components/RequireAuth';

// Loading component for lazy-loaded routes - using proper PageLoadingSpinner
const LoadingSpinner: React.FC = () => <PageLoadingSpinner label="Loading..." />;

// ProductHub is lazy-loaded to avoid import conflict with bundleOptimization preloading
const ProductHub = createOptimizedLazyComponent(
  () => import('./components/ProductHub'),
  { chunkName: 'ProductHub', fallback: <LoadingSpinner /> }
);

/* protected - Heavy components lazy loaded with optimization */
const DataDictionaryPage = createOptimizedLazyComponent(
  () => import('./pages/DataDictionaryPage'),
  { chunkName: 'DataDictionaryPage', fallback: <LoadingSpinner /> }
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
const AIBuilderPlan = createOptimizedLazyComponent(
  () => import('./pages/AIBuilderPlan'),
  { chunkName: 'AIBuilderPlan', fallback: <LoadingSpinner /> }
);
const Builder = createOptimizedLazyComponent(
  () => import('./components/Builder'),
  { chunkName: 'Builder', fallback: <LoadingSpinner /> }
);
const ClaimsAnalysis = createOptimizedLazyComponent(
  () => import('./components/ClaimsAnalysis'),
  { chunkName: 'ClaimsAnalysis', fallback: <LoadingSpinner /> }
);
const StructuredClaimsAnalysis = createOptimizedLazyComponent(
  () => import('./pages/StructuredClaimsAnalysis'),
  { chunkName: 'StructuredClaimsAnalysis', fallback: <LoadingSpinner /> }
);
const GroundedAnalysisDetail = createOptimizedLazyComponent(
  () => import('./pages/GroundedAnalysisDetail'),
  { chunkName: 'GroundedAnalysisDetail', fallback: <LoadingSpinner /> }
);
const SimulatePage = createOptimizedLazyComponent(
  () => import('./pages/SimulatePage'),
  { chunkName: 'SimulatePage', fallback: <LoadingSpinner /> }
);
const AnalyticsDashboard = createOptimizedLazyComponent(
  () => import('./pages/AnalyticsDashboard'),
  { chunkName: 'AnalyticsDashboard', fallback: <LoadingSpinner /> }
);
const IngestionReportPage = createOptimizedLazyComponent(
  () => import('./pages/IngestionReportPage'),
  { chunkName: 'IngestionReportPage', fallback: <LoadingSpinner /> }
);
const ClauseBrowser = createOptimizedLazyComponent(
  () => import('./pages/ClauseBrowser'),
  { chunkName: 'ClauseBrowser', fallback: <LoadingSpinner /> }
);
const CompareEditions = createOptimizedLazyComponent(
  () => import('./pages/CompareEditions'),
  { chunkName: 'CompareEditions', fallback: <LoadingSpinner /> }
);
const TaskManagement = createOptimizedLazyComponent(
  () => import('./components/TaskManagement'),
  { chunkName: 'TaskManagement', fallback: <LoadingSpinner /> }
);
const TaskBoard = createOptimizedLazyComponent(
  () => import('./components/tasks/TaskBoard'),
  { chunkName: 'TaskBoard', fallback: <LoadingSpinner /> }
);
const Product360 = createOptimizedLazyComponent(
  () => import('./pages/Product360'),
  { chunkName: 'Product360', fallback: <LoadingSpinner /> }
);
const FormsMapper = createOptimizedLazyComponent(
  () => import('./pages/FormsMapper'),
  { chunkName: 'FormsMapper', fallback: <LoadingSpinner /> }
);
const GovernedProposalDetail = createOptimizedLazyComponent(
  () => import('./pages/GovernedProposalDetail'),
  { chunkName: 'GovernedProposalDetail', fallback: <LoadingSpinner /> }
);
const PricingBuilder = createOptimizedLazyComponent(
  () => import('./pages/PricingBuilder'),
  { chunkName: 'PricingBuilder', fallback: <LoadingSpinner /> }
);
const QuoteSandbox = createOptimizedLazyComponent(
  () => import('./pages/QuoteSandbox'),
  { chunkName: 'QuoteSandbox', fallback: <LoadingSpinner /> }
);
const RoleManagement = createOptimizedLazyComponent(
  () => import('./components/admin/RoleManagement'),
  { chunkName: 'RoleManagement', fallback: <LoadingSpinner /> }
);
const OrgSelect = createOptimizedLazyComponent(
  () => import('./pages/OrgSelect'),
  { chunkName: 'OrgSelect', fallback: <LoadingSpinner /> }
);
const AdminMembers = createOptimizedLazyComponent(
  () => import('./pages/AdminMembers'),
  { chunkName: 'AdminMembers', fallback: <LoadingSpinner /> }
);
const ChangeSets = createOptimizedLazyComponent(
  () => import('./pages/ChangeSets'),
  { chunkName: 'ChangeSets', fallback: <LoadingSpinner /> }
);
const ChangeSetDetail = createOptimizedLazyComponent(
  () => import('./pages/ChangeSetDetail'),
  { chunkName: 'ChangeSetDetail', fallback: <LoadingSpinner /> }
);
const StatePrograms = createOptimizedLazyComponent(
  () => import('./pages/StatePrograms'),
  { chunkName: 'StatePrograms', fallback: <LoadingSpinner /> }
);
const UnderwritingRules = createOptimizedLazyComponent(
  () => import('./pages/UnderwritingRules'),
  { chunkName: 'UnderwritingRules', fallback: <LoadingSpinner /> }
);
const FormsRepository = createOptimizedLazyComponent(
  () => import('./pages/FormsRepository'),
  { chunkName: 'FormsRepository', fallback: <LoadingSpinner /> }
);
const ExportCenter = createOptimizedLazyComponent(
  () => import('./pages/ExportCenter'),
  { chunkName: 'ExportCenter', fallback: <LoadingSpinner /> }
);
const ProductAssemblyWizard = createOptimizedLazyComponent(
  () => import('./pages/ProductAssemblyWizard'),
  { chunkName: 'ProductAssemblyWizard', fallback: <LoadingSpinner /> }
);
const CoverageLibrary = createOptimizedLazyComponent(
  () => import('./pages/CoverageLibrary'),
  { chunkName: 'CoverageLibrary', fallback: <LoadingSpinner /> }
);
const FormWhereUsed = createOptimizedLazyComponent(
  () => import('./pages/FormWhereUsed'),
  { chunkName: 'FormWhereUsed', fallback: <LoadingSpinner /> }
);

// Lazy load CommandPalette
const CommandPalette = createOptimizedLazyComponent(
  () => import('./components/CommandPalette'),
  { chunkName: 'CommandPalette', fallback: null }
);

// ──────────────────────────────────────────────────────────────
// HistoryWrapper – provides floating toggle + Version sidebar
// ──────────────────────────────────────────────────────────────
const HistoryWrapper: React.FC = () => {
  return (
    <>
      {/* Command Palette - Global Search */}
      <Suspense fallback={null}>
        <CommandPalette />
      </Suspense>

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
          path="/ai-builder/plan"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <AIBuilderPlan />
              </Suspense>
            </RequireAuth>
          }
        />

        {/* Governed AI Proposal Detail — traceability, diffs, clause refs, change set */}
        <Route
          path="/ai-proposals/:suggestionId"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <GovernedProposalDetail />
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
                <StructuredClaimsAnalysis />
              </Suspense>
            </RequireAuth>
          }
        />

        {/* Clause-Grounded Analysis Detail – defensible coverage memo with citations */}
        <Route
          path="/claims-analysis/:analysisId/grounded"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <GroundedAnalysisDetail />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/claims-analysis-legacy"
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
                <DataDictionaryPage />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/tasks"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <TaskBoard />
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

        {/* State Programs - filing statuses, dependencies, and gating */}
        <Route
          path="/products/:productId/versions/:productVersionId/states"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <StatePrograms />
              </Suspense>
            </RequireAuth>
          }
        />

        {/* Org selection - requires auth but not org membership */}
        <Route
          path="/org/select"
          element={
            <RequireAuth requireOrg={false}>
              <Suspense fallback={<LoadingSpinner />}>
                <OrgSelect />
              </Suspense>
            </RequireAuth>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin/roles"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <RoleManagement />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/members"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <AdminMembers />
              </Suspense>
            </RequireAuth>
          }
        />

        {/* Change Sets - Governed approval/publish workflow */}
        <Route
          path="/changesets"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <ChangeSets />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/changesets/:changeSetId"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <ChangeSetDetail />
              </Suspense>
            </RequireAuth>
          }
        />

        {/* Coverage Library – Templates & Endorsements */}
        <Route
          path="/coverage-library"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <CoverageLibrary />
              </Suspense>
            </RequireAuth>
          }
        />

        {/* Product Assembly Wizard – Governed builder */}
        <Route
          path="/wizard/product"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <ProductAssemblyWizard />
              </Suspense>
            </RequireAuth>
          }
        />

        {/* Export Center – Filing Packages */}
        <Route
          path="/filings"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <ExportCenter />
              </Suspense>
            </RequireAuth>
          }
        />

        {/* Underwriting Rules */}
        <Route
          path="/underwriting-rules"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <UnderwritingRules />
              </Suspense>
            </RequireAuth>
          }
        />

        {/* Forms Repository */}
        <Route
          path="/forms-repository"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <FormsRepository />
              </Suspense>
            </RequireAuth>
          }
        />

        {/* Form Where-Used */}
        <Route
          path="/forms-where-used"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <FormWhereUsed />
              </Suspense>
            </RequireAuth>
          }
        />

        {/* Clause Library – browse, tag, reuse clauses */}
        <Route
          path="/clauses"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <ClauseBrowser />
              </Suspense>
            </RequireAuth>
          }
        />

        {/* Redline Compare – section-aware diff between form editions */}
        <Route
          path="/forms/:formId/compare"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <CompareEditions />
              </Suspense>
            </RequireAuth>
          }
        />

        {/* Ingestion Report – contract truth layer per form edition */}
        <Route
          path="/forms/:formId/versions/:versionId/ingestion"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <IngestionReportPage />
              </Suspense>
            </RequireAuth>
          }
        />

        {/* Analytics Dashboard – readiness, cycle time, blockers */}
        <Route
          path="/analytics"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <AnalyticsDashboard />
              </Suspense>
            </RequireAuth>
          }
        />

        {/* Simulator – end-to-end UW + Premium + Forms */}
        <Route
          path="/simulate"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <SimulatePage />
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

// Track initialization to prevent duplicate logs in StrictMode
let appInitialized = false;

const App: React.FC = () => {
  // Optimized: Initialize bundle optimizations and performance monitoring
  useEffect(() => {
    if (appInitialized) return;
    appInitialized = true;

    try {
      initBundleOptimizations();
      // Single consolidated log for app initialization
      console.log(`[OK] App initialized (${env.NODE_ENV})`);
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'App initialization failed', {
        environment: env.NODE_ENV
      }, error as Error);
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <GlobalStyle />
          <SkipLink href="#main-content">Skip to main content</SkipLink>
          <RoleProvider>
            <ChangeSetProvider>
              <StatusAnnouncerProvider>
                <ToastProvider>
                  <RouteProgressProvider>
                    <ConnectionStatus />
                    <Router>
                      <HistoryWrapper />
                    </Router>
                  </RouteProgressProvider>
                </ToastProvider>
              </StatusAnnouncerProvider>
            </ChangeSetProvider>
          </RoleProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;

