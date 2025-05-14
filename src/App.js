import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import { ThemeProvider } from 'styled-components';
import { GlobalStyle } from './styles/GlobalStyle';
import { theme } from './styles/theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <Router>
        <Routes>
          <Route path="/" element={<ProductHub />} />
          <Route path="/coverage/:productId" element={<CoverageScreen />} />
          <Route path="/coverage/:productId/:parentCoverageId" element={<CoverageScreen />} />
          <Route path="/coverage-states/:productId/:coverageId" element={<CoverageStatesScreen />} />
          <Route path="/forms" element={<FormsScreen />} />
          <Route path="/forms/:productId" element={<FormsScreen />} />
          <Route path="/pricing/:productId" element={<PricingScreen />} />
          <Route path="/states/:productId" element={<StatesScreen />} />
          <Route path="/table/:productId/:stepId" element={<TableScreen />} />
          <Route path="/rules/:productId" element={<RulesScreen title="Rules" />} />
          <Route path="/product-explorer" element={<ProductExplorer />} />
          <Route path="/product-builder" element={<ProductBuilder />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;