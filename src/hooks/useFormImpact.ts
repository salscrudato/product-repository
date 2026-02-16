/**
 * useFormImpact
 *
 * Hook that analyses downstream impact when a form version changes.
 * Integrates with Change Sets: if a form version is updated, it flags
 * affected products, coverages, and states that require re-approval.
 */

import { useState, useCallback } from 'react';
import { getFormImpact, getFormUses } from '../services/formService';
import { useChangeSet } from '../context/ChangeSetContext';
import type { FormImpactResult, FormUse } from '../types/form';

interface UseFormImpactReturn {
  /** Run an impact analysis for a specific form version */
  analyseImpact: (orgId: string, formId: string, formVersionId: string) => Promise<FormImpactResult | null>;
  /** The latest impact result */
  impact: FormImpactResult | null;
  /** Track a form version change in the active Change Set */
  trackFormChange: (
    orgId: string,
    formId: string,
    formVersionId: string,
    formNumber: string,
    action: 'create' | 'update',
  ) => Promise<boolean>;
  /** Get all "where used" records for a specific form */
  loadWhereUsed: (
    orgId: string,
    formId: string,
  ) => Promise<FormUse[]>;
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
}

export function useFormImpact(): UseFormImpactReturn {
  const [impact, setImpact] = useState<FormImpactResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { trackEdit } = useChangeSet();

  const analyseImpact = useCallback(
    async (orgId: string, formId: string, formVersionId: string): Promise<FormImpactResult | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await getFormImpact(orgId, formId, formVersionId);
        setImpact(result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Impact analysis failed';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const trackFormChange = useCallback(
    async (
      orgId: string,
      formId: string,
      formVersionId: string,
      formNumber: string,
      action: 'create' | 'update',
    ): Promise<boolean> => {
      // 1. Run impact analysis
      const impactResult = await analyseImpact(orgId, formId, formVersionId);

      // 2. Track the form version itself in the Change Set
      const tracked = await trackEdit({
        artifactType: 'form',
        artifactId: formId,
        artifactName: formNumber,
        versionId: formVersionId,
        action,
      });

      if (!tracked) return false;

      // 3. If there's downstream impact, surface a re-approval signal
      //    The Change Set system already handles approval routing via APPROVAL_RULES,
      //    so we just need to include the form item. The impact data is attached
      //    for display in the Change Set detail page.
      if (impactResult && impactResult.requiresReApproval) {
        // The impact information is available via the `impact` state for UI display.
        // The compliance role approval (required for forms) will be automatically
        // triggered by the Change Set approval workflow.
        console.info(
          `[FormImpact] Form ${formNumber} version change affects ` +
          `${impactResult.affectedProductVersionIds.length} product(s), ` +
          `${impactResult.affectedStates.length} state(s). Re-approval required.`,
        );
      }

      return true;
    },
    [analyseImpact, trackEdit],
  );

  const loadWhereUsed = useCallback(
    async (orgId: string, formId: string): Promise<FormUse[]> => {
      setLoading(true);
      setError(null);
      try {
        const uses = await getFormUses(orgId, { formId });
        return uses;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load where-used data';
        setError(msg);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    analyseImpact,
    impact,
    trackFormChange,
    loadWhereUsed,
    loading,
    error,
  };
}
