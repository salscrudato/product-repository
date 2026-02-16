/**
 * Organization Service
 * Client-side service for multi-tenant organization management
 */

import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, getDocFromCache, setDoc, collection, query, where, getDocs, DocumentReference, DocumentSnapshot } from 'firebase/firestore';
import { functions, db, auth, isAuthReady, isFirestoreTerminated, safeOnSnapshot } from '../firebase';

import logger, { LOG_CATEGORIES } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export type OrgRole = 'admin' | 'product_manager' | 'actuary' | 'underwriter' | 'compliance' | 'viewer';
export type MemberStatus = 'active' | 'invited' | 'disabled';

export interface Organization {
  id: string;
  name: string;
  createdAt: Date;
  createdBy: string;
  settings?: {
    allowInvites?: boolean;
    defaultRole?: OrgRole;
  };
}

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  email: string;
  displayName?: string;
  role: OrgRole;
  status: MemberStatus;
  createdAt: Date;
  createdBy: string;
  invitedAt?: Date;
  joinedAt?: Date;
}

export interface UserProfile {
  id: string;
  primaryOrgId: string | null;
  displayName: string;
  email: string;
  createdAt: Date;
  lastOrgSwitch?: Date;
}

export interface OrgInvite {
  id: string;
  orgId: string;
  orgName: string;
  email: string;
  role: OrgRole;
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

// ============================================================================
// Role Configuration
// ============================================================================

export const ORG_ROLES: OrgRole[] = ['admin', 'product_manager', 'actuary', 'underwriter', 'compliance', 'viewer'];

export const ORG_ROLE_DISPLAY_NAMES: Record<OrgRole, string> = {
  admin: 'Administrator',
  product_manager: 'Product Manager',
  actuary: 'Actuary',
  underwriter: 'Underwriter',
  compliance: 'Compliance',
  viewer: 'Viewer',
};

export const ORG_ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  admin: 'Full access including member management, publishing, and approvals',
  product_manager: 'Can manage products, coverages, forms, and pricing',
  actuary: 'Can manage pricing models and actuarial data',
  underwriter: 'Can manage underwriting rules and risk assessments',
  compliance: 'Can review and approve compliance-related changes',
  viewer: 'Read-only access to all product data',
};

export interface OrgRolePermissions {
  canRead: boolean;
  canWriteProductConfig: boolean;
  canWriteUnderwriting: boolean;
  canWritePricing: boolean;
  canApprove: boolean;
  canPublish: boolean;
  canManageMembers: boolean;
  canManageOrg: boolean;
}

export const getOrgPermissionsForRole = (role: OrgRole): OrgRolePermissions => {
  const permissions: Record<OrgRole, OrgRolePermissions> = {
    admin: {
      canRead: true,
      canWriteProductConfig: true,
      canWriteUnderwriting: true,
      canWritePricing: true,
      canApprove: true,
      canPublish: true,
      canManageMembers: true,
      canManageOrg: true,
    },
    product_manager: {
      canRead: true,
      canWriteProductConfig: true,
      canWriteUnderwriting: true,
      canWritePricing: true,
      canApprove: false,
      canPublish: false,
      canManageMembers: false,
      canManageOrg: false,
    },
    actuary: {
      canRead: true,
      canWriteProductConfig: false,
      canWriteUnderwriting: false,
      canWritePricing: true,
      canApprove: false,
      canPublish: false,
      canManageMembers: false,
      canManageOrg: false,
    },
    underwriter: {
      canRead: true,
      canWriteProductConfig: false,
      canWriteUnderwriting: true,
      canWritePricing: false,
      canApprove: false,
      canPublish: false,
      canManageMembers: false,
      canManageOrg: false,
    },
    compliance: {
      canRead: true,
      canWriteProductConfig: false,
      canWriteUnderwriting: false,
      canWritePricing: false,
      canApprove: true,
      canPublish: false,
      canManageMembers: false,
      canManageOrg: false,
    },
    viewer: {
      canRead: true,
      canWriteProductConfig: false,
      canWriteUnderwriting: false,
      canWritePricing: false,
      canApprove: false,
      canPublish: false,
      canManageMembers: false,
      canManageOrg: false,
    },
  };
  return permissions[role];
};

// ============================================================================
// Firestore getDoc Serialization
// ============================================================================
//
// In Firebase JS SDK v12.x, getDoc() internally uses readDocumentViaSnapshotListener
// which creates a temporary watch target on a shared gRPC stream. When multiple
// getDoc() calls are in flight simultaneously, their targets share the stream.
// If the server acknowledges one target and sends a snapshot version update, the
// WatchChangeAggregator applies it to ALL targets — including ones not yet
// acknowledged (TargetState version = -1). This triggers:
//
//   INTERNAL ASSERTION FAILED: Unexpected state (ID: ca9) CONTEXT: {"ve":-1}
//
// The serializer below ensures only ONE getDoc is in flight at any time,
// preventing concurrent watch targets from existing on the stream.
// ============================================================================

let _getDocQueue: Promise<void> = Promise.resolve();

/**
 * Serialized getDoc that ensures only one Firestore watch target is active
 * at a time, preventing the ca9 internal assertion failure.
 */
const serializedGetDoc = async (ref: DocumentReference): Promise<DocumentSnapshot> => {
  // Wait for any previous getDoc to complete before starting a new one.
  const previous = _getDocQueue;
  let resolveQueue!: () => void;
  _getDocQueue = new Promise<void>((r) => { resolveQueue = r; });

  await previous;
  try {
    return await getDoc(ref);
  } finally {
    resolveQueue();
  }
};

/**
 * Check if an error is a Firestore SDK internal assertion failure (ca9 bug).
 * These are transient SDK state corruption errors, not application errors.
 */
const isFirestoreInternalAssertionError = (error: unknown): boolean => {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes('INTERNAL ASSERTION FAILED');
};

// ============================================================================
// User Profile Functions
// ============================================================================

/**
 * Get current user's profile.
 *
 * Strategy: Try cache first, then serialized getDoc.
 * serializedGetDoc ensures only one Firestore read is in flight at a time,
 * preventing the ca9 assertion bug from concurrent watch targets.
 * The Firestore SDK handles auth token propagation internally.
 */
export const getUserProfile = async (): Promise<UserProfile | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  const userRef = doc(db, 'users', user.uid);

  const parseUserDoc = (docData: Record<string, unknown>): UserProfile => ({
    id: user.uid,
    primaryOrgId: (docData.primaryOrgId as string) || null,
    displayName: (docData.displayName as string) || user.displayName || '',
    email: (docData.email as string) || user.email || '',
    createdAt: (docData.createdAt as { toDate?: () => Date })?.toDate?.() ?? (docData.createdAt as Date) ?? new Date(),
    lastOrgSwitch: (docData.lastOrgSwitch as { toDate?: () => Date })?.toDate?.() ?? (docData.lastOrgSwitch as Date | undefined),
  });

  // 1. Try cache first (no server auth needed, avoids race condition)
  try {
    const cachedDoc = await getDocFromCache(userRef);
    if (cachedDoc.exists()) {
      return parseUserDoc(cachedDoc.data());
    }
  } catch {
    // Cache miss or unavailable - this is expected for new users
  }

  // 2. Serialized getDoc (one at a time to prevent ca9 assertion bug)
  try {
    const serverDoc = await serializedGetDoc(userRef);
    if (!serverDoc.exists()) return null;
    return parseUserDoc(serverDoc.data());
  } catch (error) {
    if (isFirestoreInternalAssertionError(error)) {
      logger.warn(LOG_CATEGORIES.DATA, 'Firestore SDK internal assertion in getUserProfile (transient)', { uid: user.uid });
      return null;
    }
    const firebaseError = error as { code?: string };
    if (firebaseError.code === 'permission-denied') {
      logger.warn(LOG_CATEGORIES.AUTH, 'User profile not accessible yet (auth propagation)', { uid: user.uid });
    } else {
      logger.error(LOG_CATEGORIES.DATA, 'Error fetching user profile', {}, error as Error);
    }
    return null;
  }
};

/**
 * Create or update user profile
 */
export const updateUserProfile = async (updates: Partial<UserProfile>): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      ...updates,
      email: user.email,
      updatedAt: new Date(),
    }, { merge: true });

    logger.info(LOG_CATEGORIES.DATA, 'User profile updated', { userId: user.uid });
  } catch (error) {
    logger.error(LOG_CATEGORIES.DATA, 'Error updating user profile', {}, error as Error);
    throw error;
  }
};

/**
 * Set user's primary organization
 */
export const setPrimaryOrg = async (orgId: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  try {
    logger.info(LOG_CATEGORIES.DATA, 'Setting primary org', { orgId, userId: user.uid, isAnonymous: user.isAnonymous });
    await setDoc(doc(db, 'users', user.uid), {
      primaryOrgId: orgId,
      lastOrgSwitch: new Date(),
    }, { merge: true });

    logger.info(LOG_CATEGORIES.DATA, 'Primary org set', { orgId });
  } catch (error) {
    logger.error(LOG_CATEGORIES.DATA, 'Error setting primary org', { orgId, userId: user.uid, errorCode: (error as { code?: string }).code }, error as Error);
    throw error;
  }
};

// ============================================================================
// Organization Functions (via Cloud Functions)
// ============================================================================

/**
 * Create a new organization
 */
export const createOrganization = async (name: string): Promise<Organization> => {
  try {
    const callable = httpsCallable<{ name: string }, { org: Organization }>(
      functions,
      'createOrganization'
    );
    const result = await callable({ name });
    logger.info(LOG_CATEGORIES.DATA, 'Organization created', { orgId: result.data.org.id });
    return result.data.org;
  } catch (error) {
    logger.error(LOG_CATEGORIES.DATA, 'Error creating organization', { name }, error as Error);
    throw error;
  }
};

/**
 * Get organization by ID.
 * Uses cache first, then serialized getDoc.
 */
export const getOrganization = async (orgId: string): Promise<Organization | null> => {
  const orgRef = doc(db, 'orgs', orgId);

  const parseOrgDoc = (data: Record<string, unknown>): Organization => ({
    id: orgId,
    name: data.name as string,
    createdAt: (data.createdAt as { toDate: () => Date })?.toDate() || new Date(),
    createdBy: data.createdBy as string,
    settings: data.settings as Organization['settings'],
  });

  // 1. Try cache first
  try {
    const cachedDoc = await getDocFromCache(orgRef);
    if (cachedDoc.exists()) {
      return parseOrgDoc(cachedDoc.data());
    }
  } catch {
    // Cache miss - fall through
  }

  // 2. Serialized getDoc (one at a time to prevent ca9 assertion bug)
  try {
    const serverDoc = await serializedGetDoc(orgRef);
    if (!serverDoc.exists()) return null;
    return parseOrgDoc(serverDoc.data());
  } catch (error) {
    if (isFirestoreInternalAssertionError(error)) {
      logger.warn(LOG_CATEGORIES.DATA, 'Firestore SDK internal assertion in getOrganization (transient)', { orgId });
      return null;
    }
    const firebaseError = error as { code?: string };
    if (firebaseError.code === 'permission-denied') {
      logger.warn(LOG_CATEGORIES.AUTH, 'Organization not accessible yet (auth propagation)', { orgId });
    } else {
      logger.error(LOG_CATEGORIES.DATA, 'Error fetching organization', { orgId }, error as Error);
    }
    return null;
  }
};

/**
 * Get current user's membership in an org.
 * Uses cache first, then serialized getDoc.
 */
export const getOrgMembership = async (orgId: string): Promise<OrgMember | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  const memberRef = doc(db, 'orgs', orgId, 'members', user.uid);

  const parseMemberDoc = (data: Record<string, unknown>): OrgMember => ({
    id: user.uid,
    orgId,
    userId: user.uid,
    email: (data.email as string) || user.email || '',
    displayName: data.displayName as string | undefined,
    role: data.role as OrgRole,
    status: data.status as MemberStatus,
    createdAt: (data.createdAt as { toDate: () => Date })?.toDate() || new Date(),
    createdBy: data.createdBy as string,
    invitedAt: (data.invitedAt as { toDate: () => Date })?.toDate(),
    joinedAt: (data.joinedAt as { toDate: () => Date })?.toDate(),
  });

  // 1. Try cache first
  try {
    const cachedDoc = await getDocFromCache(memberRef);
    if (cachedDoc.exists()) {
      return parseMemberDoc(cachedDoc.data());
    }
  } catch {
    // Cache miss - fall through
  }

  // 2. Serialized getDoc (one at a time to prevent ca9 assertion bug)
  try {
    const serverDoc = await serializedGetDoc(memberRef);
    if (!serverDoc.exists()) return null;
    return parseMemberDoc(serverDoc.data());
  } catch (error) {
    if (isFirestoreInternalAssertionError(error)) {
      logger.warn(LOG_CATEGORIES.DATA, 'Firestore SDK internal assertion in getOrgMembership (transient)', { orgId });
      return null;
    }
    const firebaseError = error as { code?: string };
    if (firebaseError.code === 'permission-denied') {
      logger.warn(LOG_CATEGORIES.AUTH, 'Membership not accessible yet (auth propagation)', { orgId });
    } else {
      logger.error(LOG_CATEGORIES.DATA, 'Error fetching membership', { orgId }, error as Error);
    }
    return null;
  }
};

/**
 * List all orgs the current user is a member of
 */
export const listUserOrgs = async (): Promise<Array<{ org: Organization; membership: OrgMember }>> => {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const callable = httpsCallable<void, { orgs: Array<{ org: Organization; membership: OrgMember }> }>(
      functions,
      'listUserOrgs'
    );
    const result = await callable();
    return result.data.orgs;
  } catch (error) {
    logger.error(LOG_CATEGORIES.DATA, 'Error listing user orgs', {}, error as Error);
    return [];
  }
};

/**
 * List members of an organization (admin only)
 */
export const listOrgMembers = async (orgId: string): Promise<OrgMember[]> => {
  try {
    const callable = httpsCallable<{ orgId: string }, { members: OrgMember[] }>(
      functions,
      'listOrgMembers'
    );
    const result = await callable({ orgId });
    return result.data.members;
  } catch (error) {
    logger.error(LOG_CATEGORIES.DATA, 'Error listing org members', { orgId }, error as Error);
    throw error;
  }
};

/**
 * Invite a user to an organization
 */
export const inviteMember = async (
  orgId: string,
  email: string,
  role: OrgRole
): Promise<OrgInvite> => {
  try {
    const callable = httpsCallable<
      { orgId: string; email: string; role: OrgRole },
      { invite: OrgInvite }
    >(functions, 'inviteOrgMember');
    const result = await callable({ orgId, email, role });
    logger.info(LOG_CATEGORIES.DATA, 'Member invited', { orgId, email, role });
    return result.data.invite;
  } catch (error) {
    logger.error(LOG_CATEGORIES.DATA, 'Error inviting member', { orgId, email }, error as Error);
    throw error;
  }
};

/**
 * Accept an organization invite
 */
export const acceptInvite = async (inviteId: string): Promise<void> => {
  try {
    const callable = httpsCallable<{ inviteId: string }, void>(functions, 'acceptOrgInvite');
    await callable({ inviteId });
    logger.info(LOG_CATEGORIES.DATA, 'Invite accepted', { inviteId });
  } catch (error) {
    logger.error(LOG_CATEGORIES.DATA, 'Error accepting invite', { inviteId }, error as Error);
    throw error;
  }
};

/**
 * Update a member's role
 */
export const updateMemberRole = async (
  orgId: string,
  userId: string,
  newRole: OrgRole
): Promise<void> => {
  try {
    const callable = httpsCallable<
      { orgId: string; userId: string; role: OrgRole },
      void
    >(functions, 'updateOrgMemberRole');
    await callable({ orgId, userId, role: newRole });
    logger.info(LOG_CATEGORIES.DATA, 'Member role updated', { orgId, userId, newRole });
  } catch (error) {
    logger.error(LOG_CATEGORIES.DATA, 'Error updating member role', { orgId, userId }, error as Error);
    throw error;
  }
};

/**
 * Remove a member from an organization
 */
export const removeMember = async (orgId: string, userId: string): Promise<void> => {
  try {
    const callable = httpsCallable<{ orgId: string; userId: string }, void>(
      functions,
      'removeOrgMember'
    );
    await callable({ orgId, userId });
    logger.info(LOG_CATEGORIES.DATA, 'Member removed', { orgId, userId });
  } catch (error) {
    logger.error(LOG_CATEGORIES.DATA, 'Error removing member', { orgId, userId }, error as Error);
    throw error;
  }
};

/**
 * Get pending invites for current user.
 * No retry on permission-denied to avoid triggering Firestore SDK internal assertion.
 * Handles permission-denied gracefully during auth race condition.
 */
export const getPendingInvites = async (): Promise<OrgInvite[]> => {
  const user = auth.currentUser;
  if (!user?.email) return [];

  try {
    const invitesQuery = query(
      collection(db, 'orgInvites'),
      where('email', '==', user.email),
      where('status', '==', 'pending')
    );
    const snapshot = await getDocs(invitesQuery);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        orgId: data.orgId,
        orgName: data.orgName,
        email: data.email,
        role: data.role,
        invitedBy: data.invitedBy,
        invitedAt: data.invitedAt?.toDate() || new Date(),
        expiresAt: data.expiresAt?.toDate() || new Date(),
        status: data.status,
      };
    });
  } catch (error) {
    if (isFirestoreInternalAssertionError(error)) {
      logger.warn(LOG_CATEGORIES.DATA, 'Firestore SDK internal assertion in getPendingInvites (transient)');
      return [];
    }
    // Suppress errors when Firestore is shutting down (logout in progress)
    if (isFirestoreTerminated()) return [];
    // Handle permission-denied gracefully during auth race condition
    const firebaseError = error as { code?: string };
    if (firebaseError.code === 'permission-denied') {
      logger.warn(LOG_CATEGORIES.AUTH, 'Pending invites not accessible yet (auth propagation)');
    } else {
      // Also suppress "already terminated" errors that can arrive after logout
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('terminated')) {
        return [];
      }
      logger.error(LOG_CATEGORIES.DATA, 'Error fetching pending invites', {}, error as Error);
    }
    return [];
  }
};

/**
 * Subscribe to org membership changes.
 * Includes error handling for auth race conditions during fresh login.
 */
export const subscribeToOrgMembership = (
  orgId: string,
  callback: (membership: OrgMember | null) => void
): (() => void) => {
  // Prevent subscription before auth is fully propagated
  if (!isAuthReady()) {
    callback(null);
    return () => {};
  }

  const user = auth.currentUser;
  if (!user) {
    callback(null);
    return () => {};
  }

  const memberRef = doc(db, 'orgs', orgId, 'members', user.uid);
  return safeOnSnapshot(
    memberRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      const data = snapshot.data();
      callback({
        id: user.uid,
        orgId,
        userId: user.uid,
        email: data.email || user.email || '',
        displayName: data.displayName,
        role: data.role,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
        createdBy: data.createdBy,
        invitedAt: data.invitedAt?.toDate(),
        joinedAt: data.joinedAt?.toDate(),
      });
    },
    (error) => {
      if (isFirestoreTerminated()) {
        callback(null);
        return;
      }
      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'permission-denied') {
        logger.warn(LOG_CATEGORIES.AUTH, 'Membership subscription auth race - will retry on next auth state', { orgId });
      } else {
        logger.error(LOG_CATEGORIES.DATA, 'Error in membership subscription', { orgId }, error);
      }
      callback(null);
    }
  );
};
