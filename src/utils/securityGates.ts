/**
 * Security Gates
 * Provides permission-based action gating and security checks
 */

import logger, { LOG_CATEGORIES } from './logger';
import { Permission, UserRole, getPermissionsForRole } from '@hooks/useRole';

/**
 * Action gate result
 */
export interface ActionGateResult {
  allowed: boolean;
  reason?: string;
  requiresConfirmation?: boolean;
}

/**
 * Security context
 */
export interface SecurityContext {
  userId: string;
  role: UserRole;
  timestamp: number;
  action: string;
  resource?: string;
  metadata?: Record<string, any>;
}

/**
 * Gate action based on permission
 */
export function gateAction(
  role: UserRole,
  permission: Permission
): ActionGateResult {
  const permissions = getPermissionsForRole(role);

  if (!permissions.includes(permission)) {
    logger.warn(LOG_CATEGORIES.AUTH, 'Permission denied', {
      role,
      permission
    });

    return {
      allowed: false,
      reason: `User role '${role}' does not have permission '${permission}'`
    };
  }

  return { allowed: true };
}

/**
 * Gate action with confirmation for sensitive operations
 */
export function gateSensitiveAction(
  role: UserRole,
  permission: Permission,
  isSensitive: boolean = true
): ActionGateResult {
  const permissionGate = gateAction(role, permission);

  if (!permissionGate.allowed) {
    return permissionGate;
  }

  if (isSensitive && role !== UserRole.ADMIN) {
    return {
      allowed: true,
      requiresConfirmation: true,
      reason: 'This is a sensitive operation and requires confirmation'
    };
  }

  return { allowed: true };
}

/**
 * Validate action context
 */
export function validateActionContext(
  context: SecurityContext,
  allowedRoles: UserRole[]
): ActionGateResult {
  if (!allowedRoles.includes(context.role)) {
    logger.warn(LOG_CATEGORIES.AUTH, 'Action not allowed for role', {
      role: context.role,
      action: context.action,
      allowedRoles
    });

    return {
      allowed: false,
      reason: `Action '${context.action}' is not allowed for role '${context.role}'`
    };
  }

  return { allowed: true };
}

/**
 * Rate limit check
 */
export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

const rateLimitStore: Map<string, number[]> = new Map();

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): ActionGateResult {
  const now = Date.now();
  const attempts = rateLimitStore.get(key) || [];

  // Remove old attempts outside the window
  const recentAttempts = attempts.filter(time => now - time < config.windowMs);

  if (recentAttempts.length >= config.maxAttempts) {
    logger.warn(LOG_CATEGORIES.AUTH, 'Rate limit exceeded', {
      key,
      attempts: recentAttempts.length,
      limit: config.maxAttempts
    });

    return {
      allowed: false,
      reason: `Rate limit exceeded: ${config.maxAttempts} attempts per ${config.windowMs}ms`
    };
  }

  // Add current attempt
  recentAttempts.push(now);
  rateLimitStore.set(key, recentAttempts);

  return { allowed: true };
}

/**
 * Clear rate limit
 */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Audit log action
 */
export interface AuditLogEntry {
  timestamp: number;
  userId: string;
  role: UserRole;
  action: string;
  resource?: string;
  result: 'SUCCESS' | 'FAILURE' | 'DENIED';
  reason?: string;
  metadata?: Record<string, any>;
}

const auditLog: AuditLogEntry[] = [];

export function logAuditEntry(entry: AuditLogEntry): void {
  auditLog.push(entry);

  // Keep only recent entries (last 1000)
  if (auditLog.length > 1000) {
    auditLog.shift();
  }

  logger.info(LOG_CATEGORIES.AUTH, 'Audit log entry', {
    userId: entry.userId,
    action: entry.action,
    result: entry.result
  });
}

/**
 * Get audit log
 */
export function getAuditLog(
  filter?: {
    userId?: string;
    action?: string;
    result?: 'SUCCESS' | 'FAILURE' | 'DENIED';
    startTime?: number;
    endTime?: number;
  }
): AuditLogEntry[] {
  let filtered = [...auditLog];

  if (filter?.userId) {
    filtered = filtered.filter(e => e.userId === filter.userId);
  }

  if (filter?.action) {
    filtered = filtered.filter(e => e.action === filter.action);
  }

  if (filter?.result) {
    filtered = filtered.filter(e => e.result === filter.result);
  }

  if (filter?.startTime) {
    filtered = filtered.filter(e => e.timestamp >= filter.startTime!);
  }

  if (filter?.endTime) {
    filtered = filtered.filter(e => e.timestamp <= filter.endTime!);
  }

  return filtered;
}

/**
 * Clear audit log
 */
export function clearAuditLog(): void {
  auditLog.length = 0;
}

/**
 * Combine multiple gates
 */
export function combineGates(...gates: ActionGateResult[]): ActionGateResult {
  for (const gate of gates) {
    if (!gate.allowed) {
      return gate;
    }
  }

  return { allowed: true };
}

/**
 * Create action gate middleware
 */
export function createActionGate(
  role: UserRole,
  requiredPermissions: Permission[]
): ActionGateResult {
  const gates = requiredPermissions.map(permission =>
    gateAction(role, permission)
  );

  return combineGates(...gates);
}

