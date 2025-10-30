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
 * Get display name for a coverage
 */
export function getCoverageDisplayName(coverage: Partial<Coverage>): string {
  if (coverage.name && coverage.name.trim()) {
    return coverage.name;
  }
  if (coverage.coverageCode && coverage.coverageCode.trim()) {
    return coverage.coverageCode;
  }
  return 'Unnamed Coverage';
}

/**
 * Get display name for a product
 */
export function getProductDisplayName(product: Partial<Product>): string {
  if (product.name && product.name.trim()) {
    return product.name;
  }
  if (product.productCode && product.productCode.trim()) {
    return product.productCode;
  }
  return 'Unnamed Product';
}

/**
 * Format a currency value
 */
export function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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

/**
 * Format a date and time
 */
export function formatDateTime(date: Date | string | undefined): string {
  if (!date) {
    return 'N/A';
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a number with thousands separator
 */
export function formatNumber(value: number | undefined, decimals: number = 0): string {
  if (value === undefined || value === null) {
    return '0';
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string | undefined, maxLength: number = 50): string {
  if (!text) {
    return '';
  }
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format a list of items as a readable string
 */
export function formatList(items: string[] | undefined, maxItems: number = 3): string {
  if (!items || items.length === 0) {
    return 'None';
  }
  const displayed = items.slice(0, maxItems);
  const remaining = items.length - displayed.length;
  const text = displayed.join(', ');
  return remaining > 0 ? `${text} +${remaining} more` : text;
}

/**
 * Format a state code to full name
 */
export function formatStateName(stateCode: string): string {
  const stateNames: Record<string, string> = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
    CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
    FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
    IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
    KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
    MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
    MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
    NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
    NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
    OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
    SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
    VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
    WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
  };
  return stateNames[stateCode.toUpperCase()] || stateCode;
}

