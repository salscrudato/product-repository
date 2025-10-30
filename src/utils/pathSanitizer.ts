/**
 * Path Sanitizer
 * Sanitizes and validates file paths and URLs to prevent directory traversal and injection attacks
 */

import logger, { LOG_CATEGORIES } from './logger';

/**
 * Dangerous path patterns
 */
const DANGEROUS_PATTERNS = [
  /\.\.\//g,           // Directory traversal
  /\.\.\\/g,           // Windows directory traversal
  /^\/etc\//i,         // System paths
  /^\/proc\//i,        // System paths
  /^\/sys\//i,         // System paths
  /^C:\\Windows/i,     // Windows system paths
  /^C:\\Program Files/i, // Windows program paths
  /[\x00-\x1f]/g,      // Control characters
  /[<>:"|?*]/g         // Invalid filename characters
];

/**
 * Sanitize file path
 */
export function sanitizePath(path: string): string {
  if (!path || typeof path !== 'string') {
    return '';
  }

  let sanitized = path;

  // Remove dangerous patterns
  DANGEROUS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Remove leading/trailing whitespace
  sanitized = sanitized.trim();

  // Normalize path separators
  sanitized = sanitized.replace(/\\/g, '/');

  // Remove multiple consecutive slashes
  sanitized = sanitized.replace(/\/+/g, '/');

  // Remove leading slashes
  sanitized = sanitized.replace(/^\/+/, '');

  return sanitized;
}

/**
 * Validate file path
 */
export interface PathValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitized: string;
}

export function validatePath(path: string): PathValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!path || typeof path !== 'string') {
    errors.push('Path must be a non-empty string');
    return { isValid: false, errors, warnings, sanitized: '' };
  }

  // Check for directory traversal
  if (path.includes('..')) {
    errors.push('Path contains directory traversal attempt');
  }

  // Check for absolute paths
  if (path.startsWith('/') || /^[a-z]:/i.test(path)) {
    warnings.push('Path is absolute, consider using relative paths');
  }

  // Check for system paths
  if (/^(etc|proc|sys|windows|program files)/i.test(path)) {
    errors.push('Path points to system directory');
  }

  // Check for control characters
  if (/[\x00-\x1f]/.test(path)) {
    errors.push('Path contains control characters');
  }

  // Check for invalid filename characters
  if (/[<>:"|?*]/.test(path)) {
    warnings.push('Path contains characters that may be invalid on some systems');
  }

  const sanitized = sanitizePath(path);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitized
  };
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    const urlObj = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      logger.warn(LOG_CATEGORIES.SECURITY, 'Unsupported URL protocol', {
        protocol: urlObj.protocol
      });
      return '';
    }

    // Remove potentially dangerous query parameters
    const dangerousParams = ['javascript', 'data', 'vbscript'];
    dangerousParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });

    return urlObj.toString();
  } catch (error) {
    logger.warn(LOG_CATEGORIES.SECURITY, 'Invalid URL', { url });
    return '';
  }
}

/**
 * Validate URL
 */
export interface UrlValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitized: string;
}

export function validateUrl(url: string): UrlValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!url || typeof url !== 'string') {
    errors.push('URL must be a non-empty string');
    return { isValid: false, errors, warnings, sanitized: '' };
  }

  try {
    const urlObj = new URL(url);

    // Check protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      errors.push(`Unsupported protocol: ${urlObj.protocol}`);
    }

    // Check for suspicious patterns
    if (/javascript:|data:|vbscript:/i.test(url)) {
      errors.push('URL contains suspicious protocol');
    }

    // Check for encoded characters that might hide malicious content
    if (/%[0-9a-f]{2}/i.test(url)) {
      warnings.push('URL contains encoded characters');
    }

    const sanitized = sanitizeUrl(url);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitized
    };
  } catch (error) {
    errors.push('Invalid URL format');
    return { isValid: false, errors, warnings, sanitized: '' };
  }
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'file';
  }

  let sanitized = filename;

  // Remove path separators
  sanitized = sanitized.replace(/[\/\\]/g, '');

  // Remove invalid characters
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '');

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

  // Limit length
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }

  // Ensure not empty
  if (!sanitized) {
    sanitized = 'file';
  }

  return sanitized;
}

/**
 * Join path segments safely
 */
export function joinPaths(...segments: string[]): string {
  const sanitized = segments
    .map(s => sanitizePath(s))
    .filter(s => s.length > 0);

  return sanitized.join('/');
}

/**
 * Get safe file extension
 */
export function getSafeExtension(filename: string): string {
  const sanitized = sanitizeFilename(filename);
  const lastDot = sanitized.lastIndexOf('.');

  if (lastDot === -1 || lastDot === 0) {
    return '';
  }

  const ext = sanitized.substring(lastDot + 1).toLowerCase();

  // Whitelist common safe extensions
  const safeExtensions = [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'txt', 'csv', 'json', 'xml', 'zip', 'rar', '7z',
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg',
    'mp3', 'mp4', 'avi', 'mov', 'mkv'
  ];

  return safeExtensions.includes(ext) ? ext : '';
}

/**
 * Validate file extension
 */
export function isAllowedExtension(filename: string, allowedExtensions: string[]): boolean {
  const ext = getSafeExtension(filename);
  return allowedExtensions.includes(ext);
}

