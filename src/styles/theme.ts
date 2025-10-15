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
  shadow: '0 2px 8px rgba(0,0,0,0.05)',

  /** default font‑family */
  font: `'Inter', sans-serif`,

  /** glass morphism styles */
  glass: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(226, 232, 240, 0.8)',
  },
};
