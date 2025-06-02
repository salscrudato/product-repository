// Custom hook for managing pricing steps with optimized performance
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';

export function usePricingSteps(productId) {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real-time subscription to steps
  useEffect(() => {
    if (!productId) return;

    setLoading(true);
    const q = query(
      collection(db, `products/${productId}/pricingSteps`),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const stepsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSteps(stepsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching pricing steps:', err);
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [productId]);

  // Add new step
  const addStep = useCallback(async (stepData) => {
    if (!productId) return;

    try {
      const newStep = {
        ...stepData,
        order: steps.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, `products/${productId}/pricingSteps`), newStep);
      return true;
    } catch (err) {
      console.error('Error adding step:', err);
      setError(err);
      return false;
    }
  }, [productId, steps.length]);

  // Update step
  const updateStep = useCallback(async (stepId, updates) => {
    if (!productId || !stepId) return;

    try {
      const stepRef = doc(db, `products/${productId}/pricingSteps`, stepId);
      await updateDoc(stepRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (err) {
      console.error('Error updating step:', err);
      setError(err);
      return false;
    }
  }, [productId]);

  // Delete step
  const deleteStep = useCallback(async (stepId) => {
    if (!productId || !stepId) return;

    try {
      await deleteDoc(doc(db, `products/${productId}/pricingSteps`, stepId));
      return true;
    } catch (err) {
      console.error('Error deleting step:', err);
      setError(err);
      return false;
    }
  }, [productId]);

  // Bulk update steps (for reordering)
  const reorderSteps = useCallback(async (reorderedSteps) => {
    if (!productId) return;

    try {
      const batch = writeBatch(db);
      
      reorderedSteps.forEach((step, index) => {
        const stepRef = doc(db, `products/${productId}/pricingSteps`, step.id);
        batch.update(stepRef, { 
          order: index,
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      return true;
    } catch (err) {
      console.error('Error reordering steps:', err);
      setError(err);
      return false;
    }
  }, [productId]);

  // Duplicate step
  const duplicateStep = useCallback(async (stepId) => {
    if (!productId || !stepId) return;

    try {
      const originalStep = steps.find(s => s.id === stepId);
      if (!originalStep) return false;

      const duplicatedStep = {
        ...originalStep,
        stepName: `${originalStep.stepName} (Copy)`,
        order: steps.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Remove the id from the duplicated step
      delete duplicatedStep.id;

      await addDoc(collection(db, `products/${productId}/pricingSteps`), duplicatedStep);
      return true;
    } catch (err) {
      console.error('Error duplicating step:', err);
      setError(err);
      return false;
    }
  }, [productId, steps]);

  // Calculate pricing based on steps
  const calculatedPrice = useMemo(() => {
    let result = null;
    let currentOperand = null;

    steps.forEach(step => {
      if (step.stepType === 'factor') {
        const value = parseFloat(step.value) || 0;
        if (result === null) {
          result = value;
        } else if (currentOperand) {
          switch (currentOperand) {
            case '+':
              result += value;
              break;
            case '-':
              result -= value;
              break;
            case '*':
              result *= value;
              break;
            case '/':
              result = value !== 0 ? result / value : result;
              break;
            default:
              break;
          }
        }
      } else if (step.stepType === 'operand') {
        currentOperand = step.operand;
      }
    });

    return result !== null ? result.toFixed(2) : 'N/A';
  }, [steps]);

  // Filter steps by search query
  const filterSteps = useCallback((searchQuery) => {
    if (!searchQuery.trim()) return steps;

    const query = searchQuery.toLowerCase();
    return steps.filter(step => 
      (step.stepName || '').toLowerCase().includes(query) ||
      (step.coverages || []).some(coverage => 
        coverage.toLowerCase().includes(query)
      ) ||
      (step.tableName || '').toLowerCase().includes(query)
    );
  }, [steps]);

  // Validation helpers
  const validateStep = useCallback((stepData) => {
    const errors = {};

    if (!stepData.stepName?.trim()) {
      errors.stepName = 'Step name is required';
    }

    if (stepData.stepType === 'factor') {
      if (!stepData.value || isNaN(parseFloat(stepData.value))) {
        errors.value = 'Valid numeric value is required';
      }
      if (!stepData.coverages || stepData.coverages.length === 0) {
        errors.coverages = 'At least one coverage must be selected';
      }
    }

    if (stepData.stepType === 'operand') {
      if (!stepData.operand) {
        errors.operand = 'Operand is required';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, []);

  return {
    steps,
    loading,
    error,
    calculatedPrice,
    addStep,
    updateStep,
    deleteStep,
    reorderSteps,
    duplicateStep,
    filterSteps,
    validateStep
  };
}
