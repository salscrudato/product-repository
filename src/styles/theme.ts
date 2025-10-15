/**
 * Global theme object for the application
 * NOTE: Components reference `theme.colours.*` (British spelling).
 * We keep an identical `colors` alias so either spelling works.
 */

// Color palette
const palette = {
  /** brand */
  primary:        '#4f46e5',
  primaryDark:    '#4338ca',
  primaryLight:   '#eef2ff',

  /** greys / text */
  text:           '#111827',
  secondaryText:  '#0f172a',

  /** backgrounds & borders */
  background:     '#ffffff',
  backgroundAlt:  '#f9fafc',
  tableHeader:    '#F9FAFB',
  border:         '#e5e7eb',
  hover:          '#f3f4f6',

  /** accents */
  gradient:       'linear-gradient(90deg, #A100FF, #4400FF)',
  danger:         '#DC2626',
  secondaryLight: '#f1f5f9',
  buttonBackground: '#ffffff',
};

// Application theme
export const theme = {
  /** main colour map (preferred British spelling) */
  colours: palette,

  /** alias for components that imported `theme.colors` */
  colors: palette,

  /** shared primitives */
  radius: '8px',
  radiusLg: '12px',
  radiusXl: '16px',
  shadow: '0 2px 8px rgba(0,0,0,0.05)',
  shadowMd: '0 4px 16px rgba(0,0,0,0.08)',
  shadowLg: '0 8px 32px rgba(0,0,0,0.12)',

  /** default font‑family */
  font: `'Inter', sans-serif`,

  /** spacing scale (multiples of 4px) */
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },

  /** typography scale */
  typography: {
    h1: { size: '32px', weight: '700', lineHeight: '1.2' },
    h2: { size: '24px', weight: '600', lineHeight: '1.3' },
    h3: { size: '20px', weight: '600', lineHeight: '1.4' },
    h4: { size: '18px', weight: '600', lineHeight: '1.4' },
    body: { size: '15px', weight: '400', lineHeight: '1.6' },
    small: { size: '13px', weight: '400', lineHeight: '1.5' },
  },

  /** glass morphism styles */
  glass: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(226, 232, 240, 0.8)',
  },

  /** page background gradient */
  pageBackground: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)',

  /** overlay gradient */
  overlayGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
};
