/**
 * useFieldValidation Hook
 * Provides field validation capabilities for Pricing, Rules, and Tables
 * Enforces that only valid dictionary field codes can be used
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { orgDataDictionaryService } from '../services/orgDataDictionaryService';
import {
  DataDictionaryField,
  FieldReferenceValidation,
  FieldReferenceError,
  FieldReferenceWarning
} from '../types/dataDictionary';

// ============================================================================
// Types
// ============================================================================

export interface UseFieldValidationResult {
  /** All active fields in the dictionary */
  fields: DataDictionaryField[];
  /** Loading state */
  loading: boolean;
  /** Error if any */
  error: Error | null;
  /** Validate a single field code - returns true if valid and active */
  validateFieldCode: (code: string) => boolean;
  /** Check if a field is deprecated */
  isDeprecated: (code: string) => boolean;
  /** Get deprecation info for a field */
  getDeprecationInfo: (code: string) => { message?: string; replacedBy?: string } | null;
  /** Get field by code */
  getField: (code: string) => DataDictionaryField | undefined;
  /** Get field suggestions for autocomplete */
  getSuggestions: (partial: string) => DataDictionaryField[];
  /** Validate multiple field codes at once */
  validateFieldCodes: (codes: string[], location: string) => FieldReferenceValidation;
  /** Get all active field codes */
  getActiveFieldCodes: () => string[];
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useFieldValidation(orgId: string | undefined): UseFieldValidationResult {
  const [fields, setFields] = useState<DataDictionaryField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Create field maps for O(1) lookups
  const fieldByCode = useMemo(() => {
    return new Map(fields.map(f => [f.code, f]));
  }, [fields]);

  // Subscribe to fields
  useEffect(() => {
    if (!orgId) {
      setFields([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = orgDataDictionaryService.subscribeToFields(
      orgId,
      (data) => {
        setFields(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orgId]);

  // Validate a single field code
  const validateFieldCode = useCallback((code: string): boolean => {
    const field = fieldByCode.get(code);
    return field !== undefined && field.status === 'active';
  }, [fieldByCode]);

  // Check if field is deprecated
  const isDeprecated = useCallback((code: string): boolean => {
    const field = fieldByCode.get(code);
    return field?.status === 'deprecated';
  }, [fieldByCode]);

  // Get deprecation info
  const getDeprecationInfo = useCallback((code: string) => {
    const field = fieldByCode.get(code);
    if (!field || field.status !== 'deprecated') return null;
    return {
      message: field.deprecationMessage,
      replacedBy: field.replacedBy
    };
  }, [fieldByCode]);

  // Get field by code
  const getField = useCallback((code: string) => {
    return fieldByCode.get(code);
  }, [fieldByCode]);

  // Get suggestions for autocomplete
  const getSuggestions = useCallback((partial: string): DataDictionaryField[] => {
    if (!partial) return fields.filter(f => f.status === 'active').slice(0, 10);
    const lowerPartial = partial.toLowerCase();
    return fields
      .filter(f => 
        f.status === 'active' && (
          f.code.toLowerCase().includes(lowerPartial) ||
          f.displayName.toLowerCase().includes(lowerPartial)
        )
      )
      .slice(0, 10);
  }, [fields]);

  // Validate multiple field codes
  const validateFieldCodes = useCallback((
    codes: string[],
    location: string
  ): FieldReferenceValidation => {
    const errors: FieldReferenceError[] = [];
    const warnings: FieldReferenceWarning[] = [];

    for (const code of codes) {
      const field = fieldByCode.get(code);

      if (!field) {
        errors.push({
          fieldCode: code,
          location,
          message: `Field "${code}" does not exist in the data dictionary`,
          linkTo: '/data-dictionary'
        });
      } else if (field.status === 'deprecated') {
        warnings.push({
          fieldCode: code,
          location,
          message: field.deprecationMessage || `Field "${code}" is deprecated`,
          suggestedReplacement: field.replacedBy
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }, [fieldByCode]);

  // Get all active field codes
  const getActiveFieldCodes = useCallback((): string[] => {
    return fields.filter(f => f.status === 'active').map(f => f.code);
  }, [fields]);

  return {
    fields,
    loading,
    error,
    validateFieldCode,
    isDeprecated,
    getDeprecationInfo,
    getField,
    getSuggestions,
    validateFieldCodes,
    getActiveFieldCodes
  };
}

export default useFieldValidation;

