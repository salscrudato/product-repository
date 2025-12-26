/**
 * Global theme object for the application
 * NOTE: Components reference `theme.colours.*` (British spelling).
 * We keep an identical `colors` alias so either spelling works.
 *
 * Enhanced with modern design tokens for micro-interactions,
 * refined shadows, and improved visual hierarchy.
 */

// Color palette - base colors with enhanced semantic variations
const palette = {
  /** brand - refined indigo spectrum */
  primary:        '#6366f1',
  primaryDark:    '#4f46e5',
  primaryDarker:  '#4338ca',
  primaryLight:   '#eef2ff',
  primaryLighter: '#f5f7ff',
  primaryHover:   '#5b5bf6',
  primaryActive:  '#4f46e5',
  primaryGlow:    'rgba(99, 102, 241, 0.5)',
  focusRing:      'rgba(99, 102, 241, 0.25)',

  /** greys / text - improved contrast (WCAG AA compliant) */
  text:           '#0f172a',
  textSecondary:  '#475569',
  textMuted:      '#64748b', // Changed from #94a3b8 for 4.5:1 contrast ratio
  textInverse:    '#ffffff',
  secondaryText:  '#1e293b',

  /** backgrounds & borders - subtle layering */
  background:     '#ffffff',
  backgroundAlt:  '#f8fafc',
  backgroundSubtle: '#f1f5f9',
  backgroundElevated: '#ffffff',
  tableHeader:    '#f8fafc',
  border:         '#e2e8f0',
  borderLight:    '#f1f5f9',
  borderFocus:    '#6366f1',
  hover:          '#f1f5f9',
  hoverSubtle:    'rgba(99, 102, 241, 0.04)',

  /** semantic colors - refined palette */
  success:        '#10b981',
  successLight:   '#d1fae5',
  successLighter: '#ecfdf5',
  successDark:    '#059669',
  warning:        '#f59e0b',
  warningLight:   '#fef3c7',
  warningLighter: '#fffbeb',
  warningDark:    '#d97706',
  error:          '#ef4444',
  errorLight:     '#fee2e2',
  errorLighter:   '#fef2f2',
  errorDark:      '#dc2626',
  info:           '#3b82f6',
  infoLight:      '#dbeafe',
  infoLighter:    '#eff6ff',
  infoDark:       '#2563eb',

  /** accents - modern gradients */
  gradient:       'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
  gradientSubtle: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
  gradientVibrant: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 35%, #06b6d4 100%)',
  danger:         '#dc2626',
  dangerHover:    '#b91c1c',
  secondaryLight: '#f1f5f9',
  buttonBackground: '#ffffff',

  /** interactive states - refined opacity levels */
  focusRingSubtle: 'rgba(99, 102, 241, 0.2)',
  overlay:        'rgba(15, 23, 42, 0.6)',
  overlayLight:   'rgba(15, 23, 42, 0.4)',
  overlaySubtle:  'rgba(15, 23, 42, 0.2)',
  shimmer:        'rgba(255, 255, 255, 0.6)',
};

// Application theme with enhanced design tokens
export const theme = {
  /** main colour map (preferred British spelling) */
  colours: palette,

  /** alias for components that imported `theme.colors` */
  colors: palette,

  /** shared primitives - refined radius scale */
  radius: '10px',
  radiusXs: '4px',
  radiusSm: '6px',
  radiusMd: '12px',
  radiusLg: '16px',
  radiusXl: '20px',
  radiusXxl: '24px',
  radiusFull: '9999px',

  /** shadows - refined elevation scale with colored shadows */
  shadow: '0 1px 3px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)',
  shadowSm: '0 1px 2px rgba(0,0,0,0.04)',
  shadowMd: '0 4px 12px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)',
  shadowLg: '0 8px 24px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)',
  shadowXl: '0 16px 48px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.06)',
  shadowInner: 'inset 0 2px 4px rgba(0,0,0,0.04)',
  shadowFocus: '0 0 0 3px rgba(99, 102, 241, 0.2)',
  shadowElevated: '0 20px 60px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.06)',
  shadowCard: '0 2px 8px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
  shadowCardHover: '0 8px 24px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
  shadowPrimary: '0 4px 16px rgba(99, 102, 241, 0.25)',
  shadowPrimaryHover: '0 8px 24px rgba(99, 102, 241, 0.35)',

  /** default font‑family - system font stack optimized for readability */
  font: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif`,
  fontMono: `'SF Mono', 'Fira Code', 'JetBrains Mono', Menlo, Consolas, monospace`,

  /** spacing scale (multiples of 4px) - extended */
  spacing: {
    xxs: '2px',
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
    xxxl: '64px',
    '2xl': '48px',
    '3xl': '64px',
    '4xl': '80px',
  },

  /** typography scale - refined for better hierarchy */
  typography: {
    h1: { size: '36px', weight: '700', lineHeight: '1.2', letterSpacing: '-0.03em' },
    h2: { size: '28px', weight: '600', lineHeight: '1.25', letterSpacing: '-0.02em' },
    h3: { size: '22px', weight: '600', lineHeight: '1.35', letterSpacing: '-0.015em' },
    h4: { size: '18px', weight: '600', lineHeight: '1.4', letterSpacing: '-0.01em' },
    h5: { size: '16px', weight: '600', lineHeight: '1.4', letterSpacing: '-0.005em' },
    body: { size: '15px', weight: '400', lineHeight: '1.65', letterSpacing: '0' },
    bodySmall: { size: '14px', weight: '400', lineHeight: '1.55', letterSpacing: '0' },
    small: { size: '13px', weight: '400', lineHeight: '1.5', letterSpacing: '0.005em' },
    caption: { size: '12px', weight: '500', lineHeight: '1.4', letterSpacing: '0.02em' },
    label: { size: '14px', weight: '500', lineHeight: '1.4', letterSpacing: '0.005em' },
    overline: { size: '11px', weight: '600', lineHeight: '1.5', letterSpacing: '0.08em' },
  },

  /** animation timing - enhanced with micro-interaction curves */
  transitions: {
    instant: '100ms ease',
    fast: '150ms ease',
    normal: '220ms ease',
    slow: '300ms ease',
    slower: '400ms ease',
    spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    springSubtle: '250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    bounce: '500ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    enter: '220ms cubic-bezier(0, 0, 0.2, 1)',
    exit: '180ms cubic-bezier(0.4, 0, 1, 1)',
    expand: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  /** z-index scale - extended */
  zIndex: {
    base: 0,
    raised: 10,
    dropdown: 100,
    sticky: 200,
    fixed: 250,
    overlay: 300,
    modal: 400,
    popover: 500,
    tooltip: 600,
    toast: 700,
    max: 9999,
  },

  /** breakpoints - extended */
  breakpoints: {
    xs: '480px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    xxl: '1536px',
    '3xl': '1920px',
  },

  /** glass morphism styles - refined */
  glass: {
    background: 'rgba(255, 255, 255, 0.92)',
    backgroundSubtle: 'rgba(255, 255, 255, 0.75)',
    backgroundStrong: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(24px) saturate(180%)',
    backdropFilterSubtle: 'blur(12px) saturate(150%)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderSubtle: '1px solid rgba(226, 232, 240, 0.5)',
  },

  /** page background gradient - refined */
  pageBackground: 'linear-gradient(145deg, #f8fafc 0%, #eef2f6 50%, #f1f5f9 100%)',

  /** overlay gradient - enhanced */
  overlayGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 45%, #06b6d4 100%)',

  /** focus ring styles - improved accessibility */
  focusRing: `
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
    border-color: #6366f1;
  `,
  focusRingSubtle: `
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
  `,

  /** micro-interaction helpers */
  microInteractions: {
    hoverLift: 'translateY(-2px)',
    hoverLiftSubtle: 'translateY(-1px)',
    pressDown: 'translateY(1px)',
    scaleUp: 'scale(1.02)',
    scaleDown: 'scale(0.98)',
    iconBounce: 'translateY(-1px) scale(1.05)',
  },

  /** input styles - consistent form elements */
  input: {
    height: '44px',
    heightSm: '36px',
    heightLg: '52px',
    padding: '12px 16px',
    paddingSm: '8px 12px',
    paddingLg: '16px 20px',
    borderWidth: '1.5px',
    focusRingWidth: '3px',
  },
};
