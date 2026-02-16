/**
 * useRole Hook
 * React hook for managing user roles and permissions with org context
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, enableFirestoreLogs, setAuthReady } from '../firebase';
import {
  UserRole,
  ROLES,
  getPermissionsForRole,
  RolePermissions,
  ROLE_DISPLAY_NAMES,
} from '../services/roleService';
import {
  OrgRole,
  OrgMember,
  Organization,
  UserProfile,
  getOrgPermissionsForRole,
  OrgRolePermissions,
  ORG_ROLE_DISPLAY_NAMES,
  getUserProfile,
  getOrganization,
  getOrgMembership,
  subscribeToOrgMembership,
  listUserOrgs,
  setPrimaryOrg,
} from '../services/orgService';
import logger, { LOG_CATEGORIES } from '../utils/logger';

interface UseRoleResult {
  // Current user info
  user: User | null;
  role: UserRole;
  roleName: string;

  // Org context
  currentOrg: Organization | null;
  orgRole: OrgRole | null;
  orgRoleName: string;
  orgMembership: OrgMember | null;
  userProfile: UserProfile | null;
  userOrgs: Array<{ org: Organization; membership: OrgMember }>;
  hasOrg: boolean;

  // Permissions (org-scoped)
  permissions: RolePermissions;
  orgPermissions: OrgRolePermissions | null;

  // Permission checks
  isAdmin: boolean;
  isProductManager: boolean;
  isUnderwriter: boolean;
  isViewer: boolean;

  // Org role checks
  isOrgAdmin: boolean;
  isOrgProductManager: boolean;
  canManageMembers: boolean;
  canWriteProducts: boolean;
  canApprove: boolean;
  canPublish: boolean;

  // Convenience methods
  hasRole: (requiredRole: UserRole) => boolean;
  canPerform: (action: keyof RolePermissions) => boolean;
  hasOrgRole: (requiredRole: OrgRole) => boolean;
  canPerformOrgAction: (action: keyof OrgRolePermissions) => boolean;

  // Loading state
  loading: boolean;
  orgLoading: boolean;

  // Refresh
  refreshRole: () => Promise<void>;
  refreshOrg: () => Promise<void>;
  switchOrg: (orgId: string) => Promise<void>;
}

// Org role hierarchy (higher index = higher privilege)
const ORG_ROLE_HIERARCHY: OrgRole[] = ['viewer', 'compliance', 'underwriter', 'actuary', 'product_manager', 'admin'];

/**
 * Hook to get current user's role and permissions with org context
 */
export const useRole = (): UseRoleResult => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('viewer');
  const [loading, setLoading] = useState(true);

  // Org state
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [orgMembership, setOrgMembership] = useState<OrgMember | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userOrgs, setUserOrgs] = useState<Array<{ org: Organization; membership: OrgMember }>>([]);
  const [orgLoading, setOrgLoading] = useState(true);

  // Fetch role from token (legacy global role)
  const fetchRole = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setRole('viewer');
      return;
    }

    try {
      const tokenResult = await currentUser.getIdTokenResult();
      const tokenRole = tokenResult.claims.role as UserRole;
      setRole(tokenRole && ROLES.includes(tokenRole) ? tokenRole : 'viewer');
    } catch (error) {
      logger.error(LOG_CATEGORIES.AUTH, 'Error fetching role from token', {}, error as Error);
      setRole('viewer');
    }
  }, []);

  // Fetch org data.
  // After loading the user profile, tries to load the primary org.  If the
  // first attempt returns null (e.g. permission-denied during auth-token
  // propagation), retries once after a short delay before giving up.
  // Returns true if the primary org was successfully loaded (or user has no
  // primary org), false otherwise.
  const fetchOrgData = useCallback(async (currentUser: User | null): Promise<boolean> => {
    if (!currentUser) {
      setCurrentOrg(null);
      setOrgMembership(null);
      setUserProfile(null);
      setUserOrgs([]);
      setOrgLoading(false);
      return true;
    }

    try {
      setOrgLoading(true);

      // Fetch user profile and orgs in parallel
      const [profile, orgs] = await Promise.all([
        getUserProfile(),
        listUserOrgs(),
      ]);

      setUserProfile(profile);
      setUserOrgs(orgs);

      // If user has a primary org, load it.
      // IMPORTANT: These must be sequential (not Promise.all) to avoid creating
      // concurrent Firestore watch targets. getDoc() in Firebase v12.x uses
      // readDocumentViaSnapshotListener internally, and concurrent targets can
      // trigger the ca9 assertion failure in WatchChangeAggregator.
      if (profile?.primaryOrgId) {
        let org = await getOrganization(profile.primaryOrgId);

        // Retry once after a brief delay — the first attempt may fail with
        // permission-denied while the Firebase Auth token propagates to
        // Firestore security rules.
        if (!org) {
          await new Promise((r) => setTimeout(r, 1500));
          org = await getOrganization(profile.primaryOrgId);
        }

        const membership = org ? await getOrgMembership(profile.primaryOrgId) : null;
        setCurrentOrg(org);
        setOrgMembership(membership);

        // Return false if we still couldn't load the org
        return !!org;
      } else {
        setCurrentOrg(null);
        setOrgMembership(null);
        return true; // No primary org is a valid state
      }
    } catch (error) {
      logger.error(LOG_CATEGORIES.DATA, 'Error fetching org data', {}, error as Error);
      return false;
    } finally {
      setOrgLoading(false);
    }
  }, []);

  // Listen to auth state changes.
  //
  // IMPORTANT: onAuthStateChanged can fire multiple times in rapid succession
  // (e.g., auth persistence restores the cached user, then the explicit login
  // completes via _updateCurrentUser). Each callback invocation creates getDoc
  // calls that spawn temporary Firestore watch targets. If two invocations
  // overlap, their targets coexist on the shared watch stream, and when the
  // server acknowledges one target and sends a snapshot version update, it
  // applies to ALL targets — including ones not yet acknowledged (version -1).
  // This triggers the Firestore SDK "INTERNAL ASSERTION FAILED: Unexpected
  // state (ID: ca9)" error.
  //
  // The `authGeneration` counter ensures only the LATEST invocation proceeds
  // past any async boundary. Earlier invocations detect a newer generation and
  // bail out before creating Firestore targets.
  useEffect(() => {
    let cancelled = false;
    let authGeneration = 0;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (cancelled) return;

      // Bump generation so any in-flight earlier callback will bail out.
      const generation = ++authGeneration;

      // Reset loading state and auth-ready flag for each auth state change.
      // This must happen synchronously to prevent any effects from subscribing.
      setLoading(true);
      setAuthReady(false);
      setUser(currentUser);

      if (currentUser) {
        // Ensure Firestore gets a fresh auth token (important after login).
        try {
          await currentUser.getIdToken(true);
        } catch {
          // Token refresh failed - continue with current token
        }
        if (cancelled || generation !== authGeneration) return;
        // Brief delay for the token to propagate through Firebase SDK internals.
        await new Promise((r) => setTimeout(r, 150));
        if (cancelled || generation !== authGeneration) return;
      }

      // Fetch role/org data. getDoc calls are serialized inside fetchOrgData
      // to avoid creating concurrent Firestore watch targets.
      await Promise.all([
        fetchRole(currentUser),
        fetchOrgData(currentUser),
      ]);

      if (!cancelled && generation === authGeneration) {
        // IMPORTANT: Set authReady BEFORE loading=false so that effects triggered
        // by loading becoming false will see isAuthReady() === true.
        setAuthReady(true);
        setLoading(false);
        enableFirestoreLogs();
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [fetchRole, fetchOrgData]);

  // Subscribe to org membership changes.
  // Wait until loading is complete to ensure auth has fully propagated to Firestore.
  useEffect(() => {
    if (loading || !user || !userProfile?.primaryOrgId) return;

    const unsubscribe = subscribeToOrgMembership(userProfile.primaryOrgId, (membership) => {
      setOrgMembership(membership);
    });

    return () => unsubscribe();
  }, [loading, user, userProfile?.primaryOrgId]);

  // Refresh role (useful after role change)
  const refreshRole = useCallback(async () => {
    if (user) {
      await user.getIdToken(true);
      await fetchRole(user);
    }
  }, [user, fetchRole]);

  // Refresh org data
  const refreshOrg = useCallback(async () => {
    await fetchOrgData(user);
  }, [user, fetchOrgData]);

  // Switch to different org.
  // After setting the primary org and reloading data, verify the org was
  // actually loaded. If not (e.g. permission-denied because user isn't a
  // member), revert to the previous org and throw so the caller can show
  // an error message instead of navigating into a broken state.
  const switchOrg = useCallback(async (orgId: string) => {
    if (!user) return;

    const previousOrgId = userProfile?.primaryOrgId;

    try {
      await setPrimaryOrg(orgId);
      const success = await fetchOrgData(user);

      if (!success) {
        // Org couldn't be loaded (permission-denied, doesn't exist, etc.)
        // Revert to previous org so user doesn't get stuck.
        logger.warn(LOG_CATEGORIES.DATA, 'Org not accessible after switch, reverting', { orgId, previousOrgId });
        if (previousOrgId && previousOrgId !== orgId) {
          try { await setPrimaryOrg(previousOrgId); await fetchOrgData(user); } catch { /* best effort */ }
        }
        throw new Error('Unable to access this organization. You may not be a member.');
      }

      logger.info(LOG_CATEGORIES.DATA, 'Switched org', { orgId });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unable to access')) {
        throw error; // Re-throw our own error
      }
      logger.error(LOG_CATEGORIES.DATA, 'Error switching org', { orgId }, error as Error);
      if (previousOrgId && previousOrgId !== orgId) {
        try { await setPrimaryOrg(previousOrgId); await fetchOrgData(user); } catch { /* best effort */ }
      }
      throw error;
    }
  }, [user, userProfile?.primaryOrgId, fetchOrgData]);

  // Memoized permissions
  const permissions = useMemo(() => getPermissionsForRole(role), [role]);
  const orgRole = orgMembership?.role || null;
  const orgPermissions = useMemo(
    () => (orgRole ? getOrgPermissionsForRole(orgRole) : null),
    [orgRole]
  );

  // Legacy role checks
  const hasRoleCheck = useCallback(
    (requiredRole: UserRole) => ROLES.indexOf(role) >= ROLES.indexOf(requiredRole),
    [role]
  );

  const canPerform = useCallback(
    (action: keyof RolePermissions) => permissions[action],
    [permissions]
  );

  // Org role checks
  const hasOrgRole = useCallback(
    (requiredRole: OrgRole) => {
      if (!orgRole) return false;
      return ORG_ROLE_HIERARCHY.indexOf(orgRole) >= ORG_ROLE_HIERARCHY.indexOf(requiredRole);
    },
    [orgRole]
  );

  const canPerformOrgAction = useCallback(
    (action: keyof OrgRolePermissions) => orgPermissions?.[action] ?? false,
    [orgPermissions]
  );

  return {
    // User
    user,
    role,
    roleName: ROLE_DISPLAY_NAMES[role],

    // Org context
    currentOrg,
    orgRole,
    orgRoleName: orgRole ? ORG_ROLE_DISPLAY_NAMES[orgRole] : '',
    orgMembership,
    userProfile,
    userOrgs,
    hasOrg: !!currentOrg,

    // Permissions
    permissions,
    orgPermissions,

    // Legacy role checks
    isAdmin: role === 'admin',
    isProductManager: hasRoleCheck('product_manager'),
    isUnderwriter: hasRoleCheck('underwriter'),
    isViewer: hasRoleCheck('viewer'),

    // Org role checks
    isOrgAdmin: orgRole === 'admin',
    isOrgProductManager: hasOrgRole('product_manager'),
    canManageMembers: orgPermissions?.canManageMembers ?? false,
    canWriteProducts: orgPermissions?.canWriteProductConfig ?? false,
    canApprove: orgPermissions?.canApprove ?? false,
    canPublish: orgPermissions?.canPublish ?? false,

    // Methods
    hasRole: hasRoleCheck,
    canPerform,
    hasOrgRole,
    canPerformOrgAction,

    // Loading
    loading,
    orgLoading,

    // Actions
    refreshRole,
    refreshOrg,
    switchOrg,
  };
};

export default useRole;

