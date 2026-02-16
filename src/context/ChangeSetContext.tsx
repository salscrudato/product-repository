/**
 * ChangeSetContext - Global context for managing the active ChangeSet
 * Provides active change set tracking and functions to add items to it.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ChangeSet, ChangeSetItem } from '../types/changeSet';
import { VersionedEntityType } from '../types/versioning';
import {
  subscribeToChangeSets,
  getOrCreateActiveChangeSet,
  addItemToChangeSet,
  getChangeSetItems,
  createChangeSet,
} from '../services/changeSetService';
import { useRoleContext } from './RoleContext';
import { auth, isAuthReady } from '../firebase';
import logger, { LOG_CATEGORIES } from '../utils/logger';

// ============ Types ============
interface ChangeSetContextValue {
  /** The currently active (draft) change set, or null if none */
  activeChangeSet: ChangeSet | null;
  /** Items in the active change set */
  activeItems: ChangeSetItem[];
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Get or create an active change set */
  ensureActiveChangeSet: () => Promise<ChangeSet | null>;
  /** Add an item to the active change set */
  trackEdit: (params: TrackEditParams) => Promise<boolean>;
  /** Refresh the active change set */
  refresh: () => Promise<void>;
  /** Clear the active change set (user wants to start fresh) */
  clearActive: () => void;
}

interface TrackEditParams {
  artifactType: VersionedEntityType | 'stateProgram';
  artifactId: string;
  artifactName?: string;
  versionId?: string;
  action: 'create' | 'update' | 'deprecate' | 'delete_requested';
}

const defaultContextValue: ChangeSetContextValue = {
  activeChangeSet: null,
  activeItems: [],
  loading: false,
  error: null,
  ensureActiveChangeSet: async () => null,
  trackEdit: async () => false,
  refresh: async () => {},
  clearActive: () => {},
};

// ============ Context ============
const ChangeSetContext = createContext<ChangeSetContextValue>(defaultContextValue);

// ============ Hook ============
export const useChangeSet = () => {
  const context = useContext(ChangeSetContext);
  if (!context) {
    throw new Error('useChangeSet must be used within a ChangeSetProvider');
  }
  return context;
};

// ============ Provider ============
interface ChangeSetProviderProps {
  children: ReactNode;
}

export const ChangeSetProvider: React.FC<ChangeSetProviderProps> = ({ children }) => {
  const { currentOrgId, loading: roleLoading } = useRoleContext();
  const [activeChangeSet, setActiveChangeSet] = useState<ChangeSet | null>(null);
  const [activeItems, setActiveItems] = useState<ChangeSetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to draft change sets for the current user
  useEffect(() => {
    // Wait for auth to fully propagate before subscribing
    if (!isAuthReady() || !currentOrgId || roleLoading) {
      setActiveChangeSet(null);
      setActiveItems([]);
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setActiveChangeSet(null);
      return;
    }

    // Subscribe to the user's draft change sets
    const unsubscribe = subscribeToChangeSets(
      currentOrgId,
      (changeSets) => {
        // Get the most recent draft owned by this user
        const userDrafts = changeSets.filter(
          cs => cs.status === 'draft' && cs.ownerUserId === user.uid
        );
        const active = userDrafts[0] || null;
        setActiveChangeSet(active);

        // Load items for the active change set
        if (active) {
          getChangeSetItems(currentOrgId, active.id)
            .then(setActiveItems)
            .catch(err => logger.warn(LOG_CATEGORIES.DATA, 'Failed to load change set items', { error: String(err) }));
        } else {
          setActiveItems([]);
        }
      },
      ['draft']
    );

    return () => unsubscribe();
  }, [currentOrgId, roleLoading]);

  // Ensure we have an active change set (create if needed)
  const ensureActiveChangeSet = useCallback(async (): Promise<ChangeSet | null> => {
    if (!currentOrgId) return null;

    if (activeChangeSet) {
      return activeChangeSet;
    }

    setLoading(true);
    setError(null);
    try {
      const cs = await getOrCreateActiveChangeSet(currentOrgId);
      setActiveChangeSet(cs);
      return cs;
    } catch (err) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to get/create active change set', {}, err as Error);
      setError('Failed to create change set');
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentOrgId, activeChangeSet]);

  // Track an edit by adding it to the active change set
  const trackEdit = useCallback(async (params: TrackEditParams): Promise<boolean> => {
    if (!currentOrgId) return false;

    setLoading(true);
    setError(null);
    try {
      // Ensure we have an active change set
      let cs = activeChangeSet;
      if (!cs) {
        cs = await getOrCreateActiveChangeSet(currentOrgId);
        setActiveChangeSet(cs);
      }
      if (!cs) return false;

      // Add the item to the change set
      await addItemToChangeSet(currentOrgId, cs.id, {
        ...params,
        versionId: params.versionId ?? '',
      });
      // Refresh items
      const items = await getChangeSetItems(currentOrgId, cs.id);
      setActiveItems(items);
      return true;
    } catch (err) {
      logger.error(LOG_CATEGORIES.ERROR, 'Failed to track edit', {}, err as Error);
      setError('Failed to add to change set');
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentOrgId, activeChangeSet]);

  // Refresh the active change set and items
  const refresh = useCallback(async (): Promise<void> => {
    if (!currentOrgId || !activeChangeSet) return;
    try {
      const items = await getChangeSetItems(currentOrgId, activeChangeSet.id);
      setActiveItems(items);
    } catch (err) {
      logger.warn(LOG_CATEGORIES.DATA, 'Failed to refresh change set', { error: String(err) });
    }
  }, [currentOrgId, activeChangeSet]);

  // Clear the active change set reference (won't delete it)
  const clearActive = useCallback(() => {
    setActiveChangeSet(null);
    setActiveItems([]);
    setError(null);
  }, []);

  const contextValue: ChangeSetContextValue = {
    activeChangeSet,
    activeItems,
    loading,
    error,
    ensureActiveChangeSet,
    trackEdit,
    refresh,
    clearActive,
  };

  return (
    <ChangeSetContext.Provider value={contextValue}>
      {children}
    </ChangeSetContext.Provider>
  );
};

export default ChangeSetContext;

