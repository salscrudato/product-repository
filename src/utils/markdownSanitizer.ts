/**
 * Markdown Sanitizer
 * Sanitizes markdown content to prevent XSS attacks while preserving formatting
 */

/**
 * Dangerous patterns that could lead to XSS
 */
const DANGEROUS_PATTERNS = [
  /<script[^>]*>[\s\S]*?<\/script>/gi,
  /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /javascript:/gi,
  /data:text\/html/gi,
  /<embed[^>]*>/gi,
  /<object[^>]*>/gi,
  /<link[^>]*>/gi,
  /<style[^>]*>[\s\S]*?<\/style>/gi,
  /<!--[\s\S]*?-->/g
];

/**
 * Sanitize markdown content
 * Removes potentially dangerous HTML/JavaScript while preserving markdown formatting
 */
export function sanitizeMarkdown(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  let sanitized = content;

  // Remove dangerous patterns
  DANGEROUS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Remove any remaining HTML tags except markdown-safe ones
  sanitized = sanitized.replace(/<(?!br\s*\/?|hr\s*\/?|p\s*\/?|\/p>|div\s*\/?|\/div>)[^>]+>/g, '');

  // Escape special characters that could be interpreted as HTML
  sanitized = sanitized
    .replace(/&(?!amp;|lt;|gt;|quot;|#)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Unescape markdown-safe content
  sanitized = sanitized
    .replace(/&lt;br\s*\/?&gt;/g, '<br />')
    .replace(/&lt;hr\s*\/?&gt;/g, '<hr />')
    .replace(/&lt;p&gt;/g, '<p>')
    .replace(/&lt;\/p&gt;/g, '</p>')
    .replace(/&lt;div&gt;/g, '<div>')
    .replace(/&lt;\/div&gt;/g, '</div>');

  return sanitized.trim();
}

/**
 * Sanitize markdown with length limit
 */
export function sanitizeMarkdownWithLimit(
  content: string,
  maxLength: number = 10000
): string {
  const sanitized = sanitizeMarkdown(content);
  
  if (sanitized.length > maxLength) {
    return sanitized.substring(0, maxLength) + '...';
  }
  
  return sanitized;
}

/**
 * Extract plain text from markdown
 */
export function extractPlainText(markdown: string): string {
  let text = markdown;

  // Remove markdown formatting
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');  // Bold
  text = text.replace(/\*(.+?)\*/g, '$1');      // Italic
  text = text.replace(/`(.+?)`/g, '$1');        // Code
  text = text.replace(/\[(.+?)\]\(.+?\)/g, '$1'); // Links
  text = text.replace(/#+\s+/g, '');            // Headers
  text = text.replace(/[-*]\s+/g, '');          // Lists
  text = text.replace(/\n\n+/g, '\n');          // Multiple newlines

  return text.trim();
}

/**
 * Validate markdown structure
 */
export interface MarkdownValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateMarkdown(content: string): MarkdownValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!content || typeof content !== 'string') {
    errors.push('Content must be a non-empty string');
    return { isValid: false, errors, warnings };
  }

  // Check for unmatched brackets
  const openBrackets = (content.match(/\[/g) || []).length;
  const closeBrackets = (content.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    warnings.push('Unmatched square brackets detected');
  }

  // Check for unmatched parentheses
  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    warnings.push('Unmatched parentheses detected');
  }

  // Check for unmatched asterisks (bold/italic)
  const asterisks = (content.match(/\*/g) || []).length;
  if (asterisks % 2 !== 0) {
    warnings.push('Unmatched asterisks detected');
  }

  // Check for unmatched backticks
  const backticks = (content.match(/`/g) || []).length;
  if (backticks % 2 !== 0) {
    warnings.push('Unmatched backticks detected');
  }

  // Check for suspicious patterns
  if (/<script|javascript:|on\w+\s*=/i.test(content)) {
    errors.push('Suspicious patterns detected');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Compact markdown by removing excessive whitespace
 */
export function compactMarkdown(content: string): string {
  let compacted = content;

  // Remove leading/trailing whitespace from lines
  compacted = compacted
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  // Reduce multiple newlines to max 2
  compacted = compacted.replace(/\n{3,}/g, '\n\n');

  return compacted;
}

/**
 * Truncate markdown at word boundary
 */
export function truncateMarkdown(
  content: string,
  maxLength: number = 500
): string {
  if (content.length <= maxLength) {
    return content;
  }

  const truncated = content.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

