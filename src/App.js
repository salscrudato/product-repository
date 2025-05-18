// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

/* wrapper */
import RequireAuth from './components/RequireAuth';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <Router>
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
            path="/forms/*"
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
      </Router>
    </ThemeProvider>
  );
}

export default App;