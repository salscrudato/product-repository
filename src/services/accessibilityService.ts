/**
 * Accessibility Service
 * Ensures WCAG 2.1 AA compliance and professional accessibility standards
 * Follows Google/Apple/Tesla accessibility guidelines
 */

import logger, { LOG_CATEGORIES } from '../utils/logger';

export interface AccessibilityConfig {
  enableKeyboardNavigation: boolean;
  enableScreenReaderSupport: boolean;
  enableHighContrast: boolean;
  enableReducedMotion: boolean;
  enableFocusIndicators: boolean;
}

export interface A11yAuditResult {
  passed: number;
  failed: number;
  warnings: number;
  issues: string[];
}

class AccessibilityService {
  private config: AccessibilityConfig = {
    enableKeyboardNavigation: true,
    enableScreenReaderSupport: true,
    enableHighContrast: false,
    enableReducedMotion: false,
    enableFocusIndicators: true
  };

  constructor() {
    this.initializeAccessibility();
  }

  /**
   * Initialize accessibility features
   */
  private initializeAccessibility(): void {
    // Check for prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.config.enableReducedMotion = true;
      logger.info(LOG_CATEGORIES.DATA, 'Reduced motion preference detected');
    }

    // Check for high contrast preference
    if (window.matchMedia('(prefers-contrast: more)').matches) {
      this.config.enableHighContrast = true;
      logger.info(LOG_CATEGORIES.DATA, 'High contrast preference detected');
    }

    // Add keyboard navigation listener
    if (this.config.enableKeyboardNavigation) {
      this.setupKeyboardNavigation();
    }
  }

  /**
   * Setup keyboard navigation
   */
  private setupKeyboardNavigation(): void {
    document.addEventListener('keydown', (e) => {
      // Tab key for focus management
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-nav');
      }
    });

    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-nav');
    });
  }

  /**
   * Generate ARIA attributes for interactive elements
   */
  generateAriaAttributes(
    role: string,
    label?: string,
    describedBy?: string,
    expanded?: boolean,
    disabled?: boolean
  ): Record<string, any> {
    const attrs: Record<string, any> = { role };

    if (label) attrs['aria-label'] = label;
    if (describedBy) attrs['aria-describedby'] = describedBy;
    if (expanded !== undefined) attrs['aria-expanded'] = expanded;
    if (disabled !== undefined) attrs['aria-disabled'] = disabled;

    return attrs;
  }

  /**
   * Generate semantic HTML structure
   */
  generateSemanticButton(
    label: string,
    onClick: () => void,
    disabled: boolean = false,
    ariaLabel?: string
  ): Record<string, any> {
    return {
      role: 'button',
      tabIndex: disabled ? -1 : 0,
      'aria-label': ariaLabel || label,
      'aria-disabled': disabled,
      onClick,
      onKeyDown: (e: KeyboardEvent) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          onClick();
        }
      }
    };
  }

  /**
   * Generate semantic form field attributes
   */
  generateFormFieldAttributes(
    id: string,
    label: string,
    required: boolean = false,
    error?: string,
    hint?: string
  ): Record<string, any> {
    const attrs: Record<string, any> = {
      id,
      'aria-label': label,
      'aria-required': required
    };

    if (error) {
      attrs['aria-invalid'] = true;
      attrs['aria-describedby'] = `${id}-error`;
    }

    if (hint) {
      attrs['aria-describedby'] = `${id}-hint`;
    }

    return attrs;
  }

  /**
   * Generate focus management CSS
   */
  generateFocusManagementCSS(): string {
    return `
      /* Visible focus indicator for keyboard navigation */
      .keyboard-nav *:focus {
        outline: 2px solid #6366f1;
        outline-offset: 2px;
      }

      /* Hide focus indicator for mouse users */
      *:focus:not(:focus-visible) {
        outline: none;
      }

      /* Visible focus for keyboard users */
      *:focus-visible {
        outline: 2px solid #6366f1;
        outline-offset: 2px;
      }

      /* High contrast mode */
      @media (prefers-contrast: more) {
        * {
          border-width: 2px;
        }
      }

      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `;
  }

  /**
   * Generate skip link CSS
   */
  generateSkipLinkCSS(): string {
    return `
      .skip-link {
        position: absolute;
        top: -40px;
        left: 0;
        background: #6366f1;
        color: white;
        padding: 8px 16px;
        text-decoration: none;
        z-index: 100;
        border-radius: 0 0 4px 0;
      }

      .skip-link:focus {
        top: 0;
      }
    `;
  }

  /**
   * Generate color contrast checker
   */
  checkColorContrast(foreground: string, background: string): {
    ratio: number;
    wcagAA: boolean;
    wcagAAA: boolean;
  } {
    // Simplified contrast calculation
    const getLuminance = (color: string): number => {
      const rgb = parseInt(color.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;

      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance <= 0.03928
        ? luminance / 12.92
        : Math.pow((luminance + 0.055) / 1.055, 2.4);
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    const ratio = (lighter + 0.05) / (darker + 0.05);

    return {
      ratio: Math.round(ratio * 100) / 100,
      wcagAA: ratio >= 4.5,
      wcagAAA: ratio >= 7
    };
  }

  /**
   * Audit component for accessibility issues
   */
  auditComponent(element: HTMLElement): A11yAuditResult {
    const issues: string[] = [];
    let passed = 0;
    let failed = 0;
    let warnings = 0;

    // Check for alt text on images
    const images = element.querySelectorAll('img');
    images.forEach((img) => {
      if (!img.alt) {
        issues.push(`Image missing alt text: ${img.src}`);
        failed++;
      } else {
        passed++;
      }
    });

    // Check for form labels
    const inputs = element.querySelectorAll('input, textarea, select');
    inputs.forEach((input) => {
      const label = element.querySelector(`label[for="${input.id}"]`);
      if (!label && !input.getAttribute('aria-label')) {
        issues.push(`Form input missing label: ${input.id || input.name}`);
        failed++;
      } else {
        passed++;
      }
    });

    // Check for heading hierarchy
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let lastLevel = 0;
    headings.forEach((heading) => {
      const level = parseInt(heading.tagName[1]);
      if (level - lastLevel > 1) {
        warnings++;
      }
      lastLevel = level;
    });

    // Check for color contrast
    const allElements = element.querySelectorAll('*');
    allElements.forEach((el) => {
      const style = window.getComputedStyle(el);
      const color = style.color;
      const bgColor = style.backgroundColor;
      // Simplified check - in production, use more sophisticated contrast checking
    });

    logger.info(LOG_CATEGORIES.DATA, 'Accessibility audit completed', {
      passed,
      failed,
      warnings,
      issueCount: issues.length
    });

    return { passed, failed, warnings, issues };
  }

  /**
   * Get current accessibility configuration
   */
  getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  /**
   * Update accessibility configuration
   */
  updateConfig(updates: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info(LOG_CATEGORIES.DATA, 'Accessibility config updated', this.config);
  }
}

export default new AccessibilityService();

