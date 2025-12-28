/**
 * useAutoDraftCoverage - Hook for AI-powered auto-drafting of coverage fields
 * 
 * Uses a lightweight LLM call to auto-populate the next step's fields
 * based on the coverage name and current draft state
 */

import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { Coverage } from '../types';

interface AutoDraftResult {
  fields: Partial<Coverage>;
  confidence: number;
  suggestions?: string[];
}

interface UseAutoDraftOptions {
  productId: string;
  onFieldsGenerated?: (fields: Partial<Coverage>) => void;
}

export function useAutoDraftCoverage({ productId, onFieldsGenerated }: UseAutoDraftOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<Partial<Coverage> | null>(null);

  const generateFieldsForStep = useCallback(async (
    stepId: string,
    currentDraft: Partial<Coverage>
  ): Promise<AutoDraftResult | null> => {
    // Only generate if we have a coverage name
    if (!currentDraft.name) {
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const autoDraftCoverage = httpsCallable<unknown, AutoDraftResult>(
        functions, 
        'autoDraftCoverageFields'
      );

      const response = await autoDraftCoverage({
        productId,
        stepId,
        coverageName: currentDraft.name,
        coverageCode: currentDraft.coverageCode,
        currentDraft
      });

      const result = response.data;
      setLastGenerated(result.fields);

      if (onFieldsGenerated && result.fields) {
        onFieldsGenerated(result.fields);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to auto-generate fields';
      console.error('Auto-draft error:', err);
      setError(errorMessage);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [productId, onFieldsGenerated]);

  const clearGenerated = useCallback(() => {
    setLastGenerated(null);
    setError(null);
  }, []);

  return {
    generateFieldsForStep,
    isGenerating,
    error,
    lastGenerated,
    generatedFields: lastGenerated, // Alias for clarity
    clearGenerated
  };
}

export default useAutoDraftCoverage;

