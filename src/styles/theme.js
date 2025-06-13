/**
 * Global theme object with dark mode support
 * NOTE: most components reference `theme.colours.*` (British spelling).
 * We keep an identical `colors` alias so either spelling works.
 */

// Light mode palette
const lightPalette = {
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

// Dark mode palette (inspired by login page)
const darkPalette = {
  /** brand - enhanced for dark mode */
  primary:        '#8b5cf6',
  primaryDark:    '#7c3aed',
  primaryLight:   '#1e1b4b',

  /** greys / text */
  text:           '#ffffff',
  secondaryText:  'rgba(255, 255, 255, 0.9)',

  /** backgrounds & borders */
  background:     'radial-gradient(ellipse at center, #1e1b4b 0%, #0f0f23 50%, #000000 100%)',
  backgroundAlt:  'rgba(255, 255, 255, 0.05)',
  tableHeader:    'rgba(255, 255, 255, 0.08)',
  border:         'rgba(255, 255, 255, 0.1)',
  hover:          'rgba(255, 255, 255, 0.08)',

  /** accents */
  gradient:       'linear-gradient(135deg, rgba(139, 92, 246, 0.8) 0%, rgba(59, 130, 246, 0.8) 50%, rgba(168, 85, 247, 0.8) 100%)',
  danger:         '#ef4444',
  secondaryLight: 'rgba(255, 255, 255, 0.05)',
  buttonBackground: 'rgba(255, 255, 255, 0.08)',
};

// Create theme function that accepts dark mode state
export const createTheme = (isDarkMode = false) => {
  const palette = isDarkMode ? darkPalette : lightPalette;

  return {
    /** main colour map (preferred British spelling) */
    colours: palette,

    /** alias for components that imported `theme.colors` */
    colors: palette,

    /** shared primitives */
    radius: isDarkMode ? '12px' : '8px',
    shadow: isDarkMode
      ? '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 30px rgba(139, 92, 246, 0.2)'
      : '0 2px 8px rgba(0,0,0,0.05)',

    /** default font‑family */
    font: `'Inter', sans-serif`,

    /** dark mode state */
    isDarkMode,

    /** glass morphism styles for dark mode */
    glass: isDarkMode ? {
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    } : {
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(226, 232, 240, 0.8)',
    },
  };
};

// Default theme (light mode)
export const theme = createTheme(false);

