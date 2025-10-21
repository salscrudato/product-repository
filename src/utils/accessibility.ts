/**
 * Accessibility Utility
 * ARIA labels, keyboard navigation, focus management, screen reader support
 */

export interface AccessibilityConfig {
  enableKeyboardNavigation: boolean;
  enableScreenReaderSupport: boolean;
  enableFocusIndicators: boolean;
  enableSwipeGestures: boolean;
  reducedMotion: boolean;
}

/**
 * Get default accessibility config
 */
export function getDefaultAccessibilityConfig(): AccessibilityConfig {
  return {
    enableKeyboardNavigation: true,
    enableScreenReaderSupport: true,
    enableFocusIndicators: true,
    enableSwipeGestures: true,
    reducedMotion: prefersReducedMotion()
  };
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers dark mode
 */
export function prefersDarkMode(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: more)').matches;
}

/**
 * Generate ARIA label for article
 */
export function generateArticleAriaLabel(
  title: string,
  source: string,
  category: string,
  date?: string
): string {
  let label = `Article: ${title}`;
  if (source) label += ` from ${source}`;
  if (category) label += ` in ${category}`;
  if (date) label += ` published ${date}`;
  return label;
}

/**
 * Generate ARIA label for button
 */
export function generateButtonAriaLabel(
  action: string,
  context?: string
): string {
  let label = action;
  if (context) label += ` ${context}`;
  return label;
}

/**
 * Generate ARIA label for pagination
 */
export function generatePaginationAriaLabel(
  currentPage: number,
  totalPages: number
): string {
  return `Page ${currentPage} of ${totalPages}`;
}

/**
 * Generate ARIA label for category
 */
export function generateCategoryAriaLabel(
  category: string,
  count?: number
): string {
  let label = `Category: ${category}`;
  if (count !== undefined) label += ` (${count} articles)`;
  return label;
}

/**
 * Generate ARIA label for search
 */
export function generateSearchAriaLabel(query: string, resultCount: number): string {
  return `Search results for "${query}": ${resultCount} articles found`;
}

/**
 * Generate ARIA label for filter
 */
export function generateFilterAriaLabel(filterName: string, value: string): string {
  return `Filter by ${filterName}: ${value}`;
}

/**
 * Get keyboard shortcut help text
 */
export function getKeyboardShortcutHelp(): Record<string, string> {
  return {
    'Tab': 'Navigate to next element',
    'Shift+Tab': 'Navigate to previous element',
    'Enter': 'Activate button or link',
    'Space': 'Toggle checkbox or button',
    'Escape': 'Close modal or menu',
    'Arrow Up': 'Previous item',
    'Arrow Down': 'Next item',
    'Arrow Left': 'Previous page',
    'Arrow Right': 'Next page',
    'Home': 'First item',
    'End': 'Last item',
    'Ctrl+F': 'Search',
    'Ctrl+S': 'Save/Share'
  };
}

/**
 * Handle keyboard navigation
 */
export function handleKeyboardNavigation(
  event: KeyboardEvent,
  callbacks: {
    onEnter?: () => void;
    onEscape?: () => void;
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
    onHome?: () => void;
    onEnd?: () => void;
    onSpace?: () => void;
  }
): void {
  switch (event.key) {
    case 'Enter':
      event.preventDefault();
      callbacks.onEnter?.();
      break;
    case 'Escape':
      event.preventDefault();
      callbacks.onEscape?.();
      break;
    case 'ArrowUp':
      event.preventDefault();
      callbacks.onArrowUp?.();
      break;
    case 'ArrowDown':
      event.preventDefault();
      callbacks.onArrowDown?.();
      break;
    case 'ArrowLeft':
      event.preventDefault();
      callbacks.onArrowLeft?.();
      break;
    case 'ArrowRight':
      event.preventDefault();
      callbacks.onArrowRight?.();
      break;
    case 'Home':
      event.preventDefault();
      callbacks.onHome?.();
      break;
    case 'End':
      event.preventDefault();
      callbacks.onEnd?.();
      break;
    case ' ':
      event.preventDefault();
      callbacks.onSpace?.();
      break;
  }
}

/**
 * Announce to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Focus management
 */
export function setFocus(element: HTMLElement | null): void {
  if (element) {
    element.focus();
    // Announce focus change to screen readers
    announceToScreenReader(`Focused on ${element.getAttribute('aria-label') || element.textContent}`);
  }
}

/**
 * Get focusable elements
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  return Array.from(container.querySelectorAll(selector));
}

/**
 * Trap focus within element
 */
export function trapFocus(
  container: HTMLElement,
  event: KeyboardEvent
): void {
  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  if (event.key === 'Tab') {
    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }
}

/**
 * Handle swipe gestures
 */
export function handleSwipeGesture(
  element: HTMLElement,
  callbacks: {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
  }
): void {
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  element.addEventListener('touchstart', (e: TouchEvent) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  });

  element.addEventListener('touchend', (e: TouchEvent) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const threshold = 50;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > threshold) {
        callbacks.onSwipeRight?.();
      } else if (deltaX < -threshold) {
        callbacks.onSwipeLeft?.();
      }
    } else {
      if (deltaY > threshold) {
        callbacks.onSwipeDown?.();
      } else if (deltaY < -threshold) {
        callbacks.onSwipeUp?.();
      }
    }
  });
}

/**
 * Get color contrast ratio
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 0;

  const lum1 = getRelativeLuminance(rgb1);
  const lum2 = getRelativeLuminance(rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
}

/**
 * Get relative luminance
 */
function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Check WCAG compliance
 */
export function checkWCAGCompliance(
  color1: string,
  color2: string
): { AA: boolean; AAA: boolean } {
  const ratio = getContrastRatio(color1, color2);

  return {
    AA: ratio >= 4.5,
    AAA: ratio >= 7
  };
}

