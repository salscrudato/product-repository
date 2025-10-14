/**
 * Test Utilities
 * 
 * Common testing utilities and helpers for the Product Hub application.
 * Provides custom render functions, mock data, and testing helpers.
 */

import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DarkModeProvider } from '../contexts/DarkModeContext';

/**
 * Custom render function that wraps components with common providers
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @returns {Object} - Render result with additional utilities
 */
export function renderWithProviders(ui, options = {}) {
  const {
    initialDarkMode = false,
    route = '/',
    ...renderOptions
  } = options;

  // Set initial route
  window.history.pushState({}, 'Test page', route);

  function Wrapper({ children }) {
    return (
      <BrowserRouter>
        <DarkModeProvider initialDarkMode={initialDarkMode}>
          {children}
        </DarkModeProvider>
      </BrowserRouter>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Mock Firebase user object
 */
export const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
};

/**
 * Mock product data
 */
export const mockProduct = {
  id: 'product-123',
  name: 'Commercial Auto Insurance',
  formNumber: 'CA-001',
  productCode: 'CA',
  effectiveDate: '2024-01-01',
  status: 'active',
  bureau: 'ISO',
  stateAvailability: ['CA', 'NY', 'TX'],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
};

/**
 * Mock coverage data
 */
export const mockCoverage = {
  id: 'coverage-123',
  name: 'Liability Coverage',
  coverageCode: 'LIAB',
  category: 'Liability',
  limits: ['$100,000', '$250,000', '$500,000', '$1,000,000'],
  deductibles: ['$500', '$1,000', '$2,500'],
  states: ['CA', 'NY', 'TX'],
  parentCoverageId: null,
  formIds: ['form-123'],
};

/**
 * Mock form data
 */
export const mockForm = {
  id: 'form-123',
  formName: 'Commercial Auto Liability Form',
  formNumber: 'CA-LIAB-001',
  productIds: ['product-123'],
  coverageIds: ['coverage-123'],
  downloadUrl: 'https://example.com/forms/ca-liab-001.pdf',
  createdAt: new Date('2024-01-01'),
};

/**
 * Mock pricing step data
 */
export const mockPricingStep = {
  id: 'step-123',
  stepName: 'Base Rate',
  coverages: ['coverage-123'],
  states: ['CA', 'NY', 'TX'],
  value: 1.0,
  rounding: 2,
  order: 1,
  stepType: 'factor',
};

/**
 * Mock task data
 */
export const mockTask = {
  id: 'task-123',
  title: 'Review Product Filing',
  description: 'Review and approve product filing for California',
  phase: 'compliance',
  priority: 'high',
  assignee: 'Test User',
  dueDate: '2024-12-31',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
};

/**
 * Mock news article data
 */
export const mockNewsArticle = {
  id: 1,
  title: 'New Insurance Regulations Announced',
  excerpt: 'State regulators announce new requirements for insurance products',
  category: 'regulation',
  source: 'Insurance Journal',
  publishedAt: '2024-01-15T10:00:00Z',
  url: 'https://example.com/news/regulations',
};

/**
 * Mock earnings report data
 */
export const mockEarningsReport = {
  id: 'earnings-123',
  company: 'Progressive',
  ticker: 'PGR',
  quarter: 'Q4 2024',
  revenue: 15.2,
  netIncome: 2.1,
  eps: 3.45,
  reportDate: '2024-01-15',
};

/**
 * Wait for async operations to complete
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} - Promise that resolves after delay
 */
export const wait = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock Firestore collection query
 */
export const mockFirestoreQuery = (data = []) => ({
  docs: data.map(item => ({
    id: item.id,
    data: () => item,
    exists: () => true,
  })),
  empty: data.length === 0,
  size: data.length,
});

/**
 * Mock Firestore document
 */
export const mockFirestoreDoc = (data = null) => ({
  id: data?.id || 'mock-id',
  data: () => data,
  exists: () => !!data,
});

/**
 * Mock OpenAI API response
 */
export const mockOpenAIResponse = (content = 'Mock AI response') => ({
  choices: [
    {
      message: {
        content,
        role: 'assistant',
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 100,
    completion_tokens: 50,
    total_tokens: 150,
  },
});

/**
 * Mock file for upload testing
 */
export const mockFile = (name = 'test.pdf', type = 'application/pdf', size = 1024) => {
  const blob = new Blob(['test content'], { type });
  blob.name = name;
  blob.size = size;
  blob.lastModified = Date.now();
  return blob;
};

/**
 * Mock PDF text extraction result
 */
export const mockPDFText = `
COMMERCIAL AUTO INSURANCE POLICY

Coverage A: Liability Coverage
Limit: $1,000,000 per occurrence
Deductible: $1,000

Coverage B: Physical Damage
Limit: Actual Cash Value
Deductible: $500

Exclusions:
- Intentional acts
- Racing
- Commercial use of personal vehicle
`;

/**
 * Suppress console errors/warnings in tests
 * @param {Function} callback - Test function to run with suppressed console
 */
export const suppressConsole = async (callback) => {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = jest.fn();
  console.warn = jest.fn();
  
  try {
    await callback();
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
  }
};

/**
 * Create mock localStorage
 */
export const mockLocalStorage = () => {
  const store = {};
  
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
};

/**
 * Create mock sessionStorage
 */
export const mockSessionStorage = mockLocalStorage;

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

