/**
 * UI Enhancement Service
 * Provides utilities for consistent, professional-grade UI/UX across the application
 * Follows Google/Apple/Tesla design standards
 */

import logger, { LOG_CATEGORIES } from '../utils/logger';

export interface UITheme {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  neutral: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
}

export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
}

export interface ToastConfig {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface SkeletonConfig {
  lines?: number;
  width?: string;
  height?: string;
  animated?: boolean;
}

class UIEnhancementService {
  private theme: UITheme = {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    neutral: '#64748b',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: 'rgba(226, 232, 240, 0.6)'
  };

  /**
   * Get the current theme
   */
  getTheme(): UITheme {
    return { ...this.theme };
  }

  /**
   * Generate smooth transition CSS
   */
  generateTransition(
    properties: string[] = ['all'],
    config: AnimationConfig = { duration: 300, easing: 'ease' }
  ): string {
    const { duration, easing, delay = 0 } = config;
    return properties
      .map(prop => `${prop} ${duration}ms ${easing} ${delay}ms`)
      .join(', ');
  }

  /**
   * Generate hover effect CSS
   */
  generateHoverEffect(
    intensity: 'subtle' | 'moderate' | 'strong' = 'moderate'
  ): string {
    const effects = {
      subtle: `
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      `,
      moderate: `
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(99, 102, 241, 0.15);
      `,
      strong: `
        transform: translateY(-4px);
        box-shadow: 0 12px 32px rgba(99, 102, 241, 0.25);
      `
    };
    return effects[intensity];
  }

  /**
   * Generate focus state CSS for accessibility
   */
  generateFocusState(): string {
    return `
      outline: none;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
      border-color: ${this.theme.primary};
    `;
  }

  /**
   * Generate loading skeleton CSS
   */
  generateSkeletonCSS(config: SkeletonConfig = {}): string {
    const {
      lines = 3,
      width = '100%',
      height = '12px',
      animated = true
    } = config;

    const animation = animated
      ? `
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `
      : '';

    return `
      background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
      background-size: 200% 100%;
      border-radius: 8px;
      width: ${width};
      height: ${height};
      ${animation}
    `;
  }

  /**
   * Generate responsive grid CSS
   */
  generateResponsiveGrid(
    minColumnWidth: string = '300px',
    gap: string = '24px'
  ): string {
    return `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(${minColumnWidth}, 1fr));
      gap: ${gap};
      
      @media (max-width: 1024px) {
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 20px;
      }
      
      @media (max-width: 768px) {
        grid-template-columns: 1fr;
        gap: 16px;
      }
    `;
  }

  /**
   * Generate card CSS with modern styling
   */
  generateCardCSS(elevated: boolean = false): string {
    const shadow = elevated
      ? '0 12px 48px rgba(0, 0, 0, 0.12)'
      : '0 4px 16px rgba(0, 0, 0, 0.08)';

    return `
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(20px);
      border: 1px solid ${this.theme.border};
      border-radius: 16px;
      padding: 24px;
      box-shadow: ${shadow};
      transition: ${this.generateTransition(['box-shadow', 'border-color', 'transform'])};
      
      &:hover {
        ${this.generateHoverEffect('moderate')}
        border-color: rgba(99, 102, 241, 0.3);
      }
    `;
  }

  /**
   * Generate button CSS with variants
   */
  generateButtonCSS(
    variant: 'primary' | 'secondary' | 'ghost' = 'primary'
  ): string {
    const variants = {
      primary: `
        background: linear-gradient(135deg, ${this.theme.primary} 0%, ${this.theme.secondary} 100%);
        color: white;
        border: none;
        box-shadow: 0 4px 16px rgba(99, 102, 241, 0.25);
        
        &:hover {
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.35);
          transform: translateY(-2px);
        }
      `,
      secondary: `
        background: rgba(255, 255, 255, 0.9);
        color: ${this.theme.primary};
        border: 1px solid rgba(99, 102, 241, 0.2);
        
        &:hover {
          background: rgba(99, 102, 241, 0.1);
          border-color: rgba(99, 102, 241, 0.3);
        }
      `,
      ghost: `
        background: transparent;
        color: ${this.theme.primary};
        border: none;
        
        &:hover {
          background: rgba(99, 102, 241, 0.08);
        }
      `
    };

    return `
      padding: 12px 20px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: ${this.generateTransition(['all'])};
      letter-spacing: -0.01em;
      ${variants[variant]}
    `;
  }

  /**
   * Generate input CSS with modern styling
   */
  generateInputCSS(): string {
    return `
      padding: 12px 16px;
      border: 1px solid ${this.theme.border};
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      font-family: inherit;
      transition: ${this.generateTransition(['border-color', 'box-shadow'])};
      
      &:focus {
        ${this.generateFocusState()}
      }
      
      &::placeholder {
        color: ${this.theme.textSecondary};
      }
    `;
  }

  /**
   * Generate badge CSS
   */
  generateBadgeCSS(
    variant: 'success' | 'warning' | 'error' | 'info' = 'info'
  ): string {
    const colors = {
      success: { bg: 'rgba(16, 185, 129, 0.1)', text: '#059669' },
      warning: { bg: 'rgba(245, 158, 11, 0.1)', text: '#d97706' },
      error: { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626' },
      info: { bg: 'rgba(99, 102, 241, 0.1)', text: '#4f46e5' }
    };

    const { bg, text } = colors[variant];

    return `
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: ${bg};
      color: ${text};
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;
    `;
  }

  /**
   * Log UI enhancement metrics
   */
  logUIMetrics(componentName: string, metrics: Record<string, any>): void {
    logger.info(LOG_CATEGORIES.PERFORMANCE, `UI Metrics: ${componentName}`, metrics);
  }
}

export default new UIEnhancementService();

