/**
 * Format Utilities
 * Centralized formatting functions for display and presentation
 */

import { FormTemplate, Coverage, Product } from '@types';

/**
 * Get display name for a form
 * Prefers formName, falls back to formNumber, then name
 */
export function getFormDisplayName(form: Partial<FormTemplate>): string {
  if (form.formName && form.formName.trim()) {
    return form.formName;
  }
  if (form.formNumber && form.formNumber.trim()) {
    return form.formNumber;
  }
  if (form.name && form.name.trim()) {
    return form.name;
  }
  return 'Unnamed Form';
}



/**
 * Format a percentage value
 */
export function formatPercentage(value: number | undefined, decimals: number = 0): string {
  if (value === undefined || value === null) {
    return '0%';
  }
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a date
 */
export function formatDate(date: Date | string | undefined): string {
  if (!date) {
    return 'N/A';
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}



