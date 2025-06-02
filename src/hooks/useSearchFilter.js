// Custom hook for search and filtering functionality
import { useState, useMemo, useCallback } from 'react';

export function useSearchFilter(data, searchFields = []) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});

  // Helper function to get nested object values
  const getNestedValue = useCallback((obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }, []);

  // Filter data based on search query and filters
  const filteredData = useMemo(() => {
    let result = data;

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => {
        return searchFields.some(field => {
          const value = getNestedValue(item, field);
          if (Array.isArray(value)) {
            return value.some(v =>
              String(v).toLowerCase().includes(query)
            );
          }
          return String(value || '').toLowerCase().includes(query);
        });
      });
    }

    // Apply additional filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        result = result.filter(item => {
          const itemValue = getNestedValue(item, key);
          if (Array.isArray(value)) {
            return value.includes(itemValue);
          }
          return itemValue === value;
        });
      }
    });

    return result;
  }, [data, searchQuery, filters, searchFields, getNestedValue]);

  // Update search query
  const updateSearchQuery = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  // Update specific filter
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFilters({});
  }, []);

  // Clear specific filter
  const clearFilter = useCallback((key) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  return {
    searchQuery,
    filters,
    filteredData,
    updateSearchQuery,
    updateFilter,
    clearFilters,
    clearFilter,
    hasActiveFilters: searchQuery.trim() || Object.keys(filters).length > 0
  };
}
