/**
 * useCoverageDraft - Hook for managing coverage draft state and persistence
 * 
 * Provides:
 * - Draft state management with auto-save
 * - Completeness scoring
 * - Validation in draft/publish modes
 * - Firestore persistence to coverageDrafts subcollection
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { doc, setDoc, getDoc, deleteDoc, addDoc, collection, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Coverage, CoverageDraft, CoverageDraftStatus, CoverageDraftSource } from '../types';
import { validateCoverage, calculateCoverageCompleteness, CoverageValidationResult } from '../services/validationService';

interface UseCoverageDraftOptions {
  productId: string;
  draftId?: string;
  initialDraft?: Partial<Coverage>;
  source?: CoverageDraftSource;
  autoSaveDelay?: number;
}

interface UseCoverageDraftReturn {
  draft: Partial<Coverage>;
  draftId: string | null;
  status: CoverageDraftStatus;
  completenessScore: number;
  missingRequiredFields: string[];
  validation: CoverageValidationResult | null;
  isDirty: boolean;
  isSaving: boolean;
  error: string | null;
  
  // Actions
  updateDraft: (patch: Partial<Coverage>) => void;
  saveDraft: () => Promise<void>;
  publishDraft: () => Promise<Coverage | null>;
  discardDraft: () => Promise<void>;
  resetDraft: () => void;
}

export default function useCoverageDraft(options: UseCoverageDraftOptions): UseCoverageDraftReturn {
  const { productId, draftId: initialDraftId, initialDraft = {}, source = 'manual', autoSaveDelay = 2000 } = options;
  
  const [draft, setDraft] = useState<Partial<Coverage>>({ productId, ...initialDraft });
  const [draftId, setDraftId] = useState<string | null>(initialDraftId || null);
  const [status, setStatus] = useState<CoverageDraftStatus>('draft');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDraftRef = useRef<string>('');

  // Calculate completeness
  const completeness = calculateCoverageCompleteness(draft);
  
  // Validate in draft mode
  const validation = validateCoverage(draft, { mode: 'draft' });

  // Load existing draft if draftId provided
  useEffect(() => {
    if (initialDraftId && productId) {
      const loadDraft = async () => {
        try {
          const draftDoc = await getDoc(doc(db, `products/${productId}/coverageDrafts/${initialDraftId}`));
          if (draftDoc.exists()) {
            const data = draftDoc.data() as CoverageDraft;
            setDraft(data.draft);
            setStatus(data.status);
            lastSavedDraftRef.current = JSON.stringify(data.draft);
          }
        } catch (err) {
          console.error('Error loading draft:', err);
          setError('Failed to load draft');
        }
      };
      loadDraft();
    }
  }, [initialDraftId, productId]);

  // Auto-save logic
  useEffect(() => {
    if (!isDirty || !draftId) return;
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft();
    }, autoSaveDelay);
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [isDirty, draft, draftId, autoSaveDelay]);

  const updateDraft = useCallback((patch: Partial<Coverage>) => {
    setDraft(prev => ({ ...prev, ...patch }));
    setIsDirty(true);
    setError(null);
  }, []);

  const saveDraft = useCallback(async () => {
    if (!productId) return;
    
    const currentDraftStr = JSON.stringify(draft);
    if (currentDraftStr === lastSavedDraftRef.current) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      const id = draftId || doc(db, `products/${productId}/coverageDrafts`).id;
      const draftData: CoverageDraft = {
        id,
        productId,
        draft,
        status,
        source,
        completenessScore: completeness.score,
        missingRequiredFields: validation?.missingRequiredFields || [],
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      };
      
      await setDoc(doc(db, `products/${productId}/coverageDrafts/${id}`), draftData, { merge: true });
      
      if (!draftId) setDraftId(id);
      lastSavedDraftRef.current = currentDraftStr;
      setIsDirty(false);
    } catch (err) {
      console.error('Error saving draft:', err);
      setError('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  }, [productId, draftId, draft, status, source, completeness.score, validation?.missingRequiredFields]);

  const publishDraft = useCallback(async (): Promise<Coverage | null> => {
    if (!productId) {
      setError('No product ID provided');
      return null;
    }

    const publishValidation = validateCoverage(draft, { mode: 'publish' });
    if (!publishValidation.isValid) {
      setError(`Cannot publish: ${publishValidation.errors.map(e => e.message).join(', ')}`);
      return null;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Prepare coverage data for Firestore
      const coverageData = {
        ...draft,
        productId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Remove undefined fields
      Object.keys(coverageData).forEach(key => {
        if (coverageData[key as keyof typeof coverageData] === undefined) {
          delete coverageData[key as keyof typeof coverageData];
        }
      });

      let savedCoverage: Coverage;

      // Check if we're editing an existing coverage (has an id that exists in the coverages collection)
      if (draft.id) {
        // Update existing coverage
        const coverageRef = doc(db, `products/${productId}/coverages`, draft.id);
        await updateDoc(coverageRef, {
          ...coverageData,
          updatedAt: serverTimestamp(),
        });
        savedCoverage = { ...draft, id: draft.id } as Coverage;
      } else {
        // Create new coverage in products/{productId}/coverages
        const coveragesRef = collection(db, `products/${productId}/coverages`);
        const docRef = await addDoc(coveragesRef, coverageData);
        savedCoverage = { ...draft, id: docRef.id } as Coverage;
      }

      // Clean up the draft document if it exists
      if (draftId) {
        try {
          await deleteDoc(doc(db, `products/${productId}/coverageDrafts/${draftId}`));
        } catch (cleanupErr) {
          // Non-critical error, just log it
          console.warn('Failed to clean up draft:', cleanupErr);
        }
      }

      setStatus('published');
      setIsDirty(false);

      return savedCoverage;
    } catch (err) {
      console.error('Error publishing coverage:', err);
      setError('Failed to publish coverage: ' + (err instanceof Error ? err.message : 'Unknown error'));
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [draft, productId, draftId]);

  const discardDraft = useCallback(async () => {
    if (draftId && productId) {
      await deleteDoc(doc(db, `products/${productId}/coverageDrafts/${draftId}`));
    }
    resetDraft();
  }, [draftId, productId]);

  const resetDraft = useCallback(() => {
    setDraft({ productId });
    setDraftId(null);
    setStatus('draft');
    setIsDirty(false);
    setError(null);
    lastSavedDraftRef.current = '';
  }, [productId]);

  return {
    draft, draftId, status, completenessScore: completeness.score,
    missingRequiredFields: validation?.missingRequiredFields || [],
    validation, isDirty, isSaving, error,
    updateDraft, saveDraft, publishDraft, discardDraft, resetDraft
  };
}

