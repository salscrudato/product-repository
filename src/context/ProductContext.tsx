/**
 * ProductContext - Eliminates prop drilling for product/coverage data
 * 
 * Provides centralized access to:
 * - Current product and its metadata
 * - Coverages, forms, rules, pricing data
 * - Related entities (limits, deductibles, packages)
 * - Caching and state management
 * 
 * Usage:
 * 1. Wrap app with <ProductProvider>
 * 2. Use useProduct() hook in components
 */

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { Product, Coverage, FormTemplate, Rule, PricingStep } from '@types/index';

interface ProductContextType {
  // Current product
  currentProduct: Product | null;
  setCurrentProduct: (product: Product | null) => void;
  
  // Related data
  coverages: Coverage[];
  setCoverages: (coverages: Coverage[]) => void;
  
  forms: FormTemplate[];
  setForms: (forms: FormTemplate[]) => void;
  
  rules: Rule[];
  setRules: (rules: Rule[]) => void;
  
  pricingSteps: PricingStep[];
  setPricingSteps: (steps: PricingStep[]) => void;
  
  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // Error handling
  error: string | null;
  setError: (error: string | null) => void;
  
  // Utility methods
  clearContext: () => void;
  updateProductData: (updates: Partial<Product>) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [coverages, setCoverages] = useState<Coverage[]>([]);
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [pricingSteps, setPricingSteps] = useState<PricingStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Optimized: Clear all context data
  const clearContext = useCallback(() => {
    setCurrentProduct(null);
    setCoverages([]);
    setForms([]);
    setRules([]);
    setPricingSteps([]);
    setError(null);
  }, []);

  // Optimized: Update product with memoization
  const updateProductData = useCallback((updates: Partial<Product>) => {
    setCurrentProduct(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<ProductContextType>(() => ({
    currentProduct,
    setCurrentProduct,
    coverages,
    setCoverages,
    forms,
    setForms,
    rules,
    setRules,
    pricingSteps,
    setPricingSteps,
    isLoading,
    setIsLoading,
    error,
    setError,
    clearContext,
    updateProductData
  }), [
    currentProduct, coverages, forms, rules, pricingSteps,
    isLoading, error, clearContext, updateProductData
  ]);

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};

/**
 * Hook to use ProductContext
 * Throws error if used outside ProductProvider
 */
export const useProduct = (): ProductContextType => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProduct must be used within ProductProvider');
  }
  return context;
};

export default ProductContext;

