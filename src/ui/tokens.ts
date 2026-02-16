/**
 * Design System v2 – Tokens
 *
 * Single source of truth for every visual decision.
 * Apple-inspired: typography-led, calm neutral surfaces, single indigo accent.
 * Light theme only.
 *
 * Naming convention: kebab-case values exported as nested objects.
 * All raw values are plain strings/numbers so they can be interpolated
 * inside styled-components template literals without helpers.
 */

// ════════════════════════════════════════════════════════════════════════
// 1. COLOR
// ════════════════════════════════════════════════════════════════════════

/** Neutral (slate) ramp – used for text, backgrounds, borders */
export const neutral = {
  0:   '#ffffff',
  25:  '#fcfcfd',
  50:  '#f8fafc',
  100: '#f1f5f9',
  150: '#e8ecf1',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  950: '#020617',
} as const;

/** Single accent – indigo */
export const accent = {
  50:  '#eef2ff',
  100: '#e0e7ff',
  200: '#c7d2fe',
  300: '#a5b4fc',
  400: '#818cf8',
  500: '#6366f1',
  600: '#4f46e5',
  700: '#4338ca',
  800: '#3730a3',
  900: '#312e81',
} as const;

/** Semantic colours */
export const semantic = {
  success:      '#10b981',
  successLight: '#ecfdf5',
  successDark:  '#059669',
  warning:      '#f59e0b',
  warningLight: '#fffbeb',
  warningDark:  '#d97706',
  error:        '#ef4444',
  errorLight:   '#fef2f2',
  errorDark:    '#dc2626',
  info:         '#3b82f6',
  infoLight:    '#eff6ff',
  infoDark:     '#2563eb',
} as const;

/** Functional colour aliases (for quick reference in components) */
export const color = {
  // Text
  text:          neutral[900],
  textSecondary: neutral[600],
  textMuted:     neutral[500],
  textInverse:   neutral[0],

  // Surfaces
  bg:            neutral[0],
  bgSubtle:      neutral[50],
  bgMuted:       neutral[100],
  bgElevated:    neutral[0],

  // Borders
  border:        neutral[200],
  borderLight:   neutral[100],
  borderFocus:   accent[500],

  // Interactive
  accent:        accent[500],
  accentHover:   accent[600],
  accentLight:   accent[50],
  accentMuted:   `${accent[500]}14`, // 8 % opacity

  // Focus
  focusRing:     `${accent[500]}40`, // 25 %

  // Overlay
  overlay:       'rgba(15,23,42,0.55)',
  overlayLight:  'rgba(15,23,42,0.3)',

  // Misc
  skeleton:      neutral[200],
  divider:       neutral[200],

  ...semantic,
} as const;

// ════════════════════════════════════════════════════════════════════════
// 2. SPACING (4 px base)
// ════════════════════════════════════════════════════════════════════════

export const space = {
  0:   '0px',
  px:  '1px',
  0.5: '2px',
  1:   '4px',
  1.5: '6px',
  2:   '8px',
  2.5: '10px',
  3:   '12px',
  4:   '16px',
  5:   '20px',
  6:   '24px',
  7:   '28px',
  8:   '32px',
  9:   '36px',
  10:  '40px',
  12:  '48px',
  14:  '56px',
  16:  '64px',
  20:  '80px',
  24:  '96px',
} as const;

// ════════════════════════════════════════════════════════════════════════
// 3. BORDER RADIUS
// ════════════════════════════════════════════════════════════════════════

export const radius = {
  none: '0px',
  xs:   '4px',
  sm:   '6px',
  md:   '8px',
  lg:   '12px',
  xl:   '16px',
  '2xl':'20px',
  full: '9999px',
} as const;

// ════════════════════════════════════════════════════════════════════════
// 4. TYPOGRAPHY
// ════════════════════════════════════════════════════════════════════════

export const fontFamily = {
  sans:  `-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue','Segoe UI',Roboto,system-ui,sans-serif`,
  mono:  `'SF Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace`,
} as const;

/**
 * Apple HIG-inspired type scale.
 * Each key maps to { size, lineHeight, letterSpacing, weight }.
 */
export const type = {
  // Display / Page titles
  displayLg:  { size: '36px', lineHeight: '1.15', letterSpacing: '-0.025em', weight: 700 },
  displaySm:  { size: '30px', lineHeight: '1.2',  letterSpacing: '-0.02em',  weight: 700 },

  // Headings
  headingLg:  { size: '22px', lineHeight: '1.27', letterSpacing: '-0.014em', weight: 600 },
  headingMd:  { size: '18px', lineHeight: '1.33', letterSpacing: '-0.01em',  weight: 600 },
  headingSm:  { size: '16px', lineHeight: '1.38', letterSpacing: '-0.006em', weight: 600 },

  // Body
  bodyLg:     { size: '16px', lineHeight: '1.5',  letterSpacing: '-0.011em', weight: 400 },
  bodyMd:     { size: '15px', lineHeight: '1.53', letterSpacing: '-0.009em', weight: 400 },
  bodySm:     { size: '14px', lineHeight: '1.43', letterSpacing: '-0.006em', weight: 400 },

  // Small / supporting
  caption:    { size: '13px', lineHeight: '1.38', letterSpacing: '-0.003em', weight: 400 },
  captionSm:  { size: '12px', lineHeight: '1.33', letterSpacing: '0em',      weight: 500 },

  // Labels & nav
  label:      { size: '14px', lineHeight: '1.36', letterSpacing: '-0.003em', weight: 500 },
  labelSm:    { size: '13px', lineHeight: '1.38', letterSpacing: '0em',      weight: 500 },
  overline:   { size: '11px', lineHeight: '1.45', letterSpacing: '0.06em',   weight: 600 },
} as const;

// ════════════════════════════════════════════════════════════════════════
// 5. SHADOWS
// ════════════════════════════════════════════════════════════════════════

export const shadow = {
  xs:       '0 1px 2px rgba(0,0,0,0.03)',
  sm:       '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
  md:       '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03)',
  lg:       '0 10px 15px -3px rgba(0,0,0,0.06), 0 4px 6px -4px rgba(0,0,0,0.03)',
  xl:       '0 20px 25px -5px rgba(0,0,0,0.07), 0 8px 10px -6px rgba(0,0,0,0.03)',
  inner:    'inset 0 1px 2px rgba(0,0,0,0.03)',
  focus:    `0 0 0 3px ${accent[500]}33`,
  card:     '0 1px 3px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)',
  cardHover:'0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.03)',
  overlay:  '0 24px 48px -12px rgba(0,0,0,0.16), 0 12px 24px -8px rgba(0,0,0,0.06)',
} as const;

// ════════════════════════════════════════════════════════════════════════
// 6. BORDERS
// ════════════════════════════════════════════════════════════════════════

export const border = {
  default:    `1px solid ${neutral[200]}`,
  light:      `1px solid ${neutral[100]}`,
  strong:     `1px solid ${neutral[300]}`,
  focus:      `1.5px solid ${accent[500]}`,
  accent:     `1px solid ${accent[200]}`,
  error:      `1.5px solid ${semantic.error}`,
  success:    `1.5px solid ${semantic.success}`,
  warning:    `1.5px solid ${semantic.warning}`,
  none:       '1px solid transparent',
} as const;

// ════════════════════════════════════════════════════════════════════════
// 7. MOTION
// ════════════════════════════════════════════════════════════════════════

export const duration = {
  instant: '75ms',
  fast:    '120ms',
  normal:  '200ms',
  slow:    '300ms',
  slower:  '450ms',
} as const;

export const easing = {
  default:    'cubic-bezier(0.4, 0, 0.2, 1)',
  in:         'cubic-bezier(0.4, 0, 1, 1)',
  out:        'cubic-bezier(0, 0, 0.2, 1)',
  spring:     'cubic-bezier(0.34, 1.56, 0.64, 1)',
  springCalm: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

/** Shorthand transitions for the most common property groups */
export const transition = {
  fast:    `${duration.fast} ${easing.default}`,
  normal:  `${duration.normal} ${easing.default}`,
  slow:    `${duration.slow} ${easing.default}`,
  spring:  `${duration.slow} ${easing.spring}`,
  colors:  `color ${duration.fast} ${easing.default}, background-color ${duration.fast} ${easing.default}, border-color ${duration.fast} ${easing.default}`,
  shadow:  `box-shadow ${duration.normal} ${easing.default}`,
  transform: `transform ${duration.normal} ${easing.spring}`,
} as const;

// ════════════════════════════════════════════════════════════════════════
// 8. Z-INDEX
// ════════════════════════════════════════════════════════════════════════

export const z = {
  base:     0,
  raised:   1,
  dropdown: 100,
  sticky:   200,
  overlay:  300,
  modal:    400,
  popover:  500,
  tooltip:  600,
  toast:    700,
} as const;

// ════════════════════════════════════════════════════════════════════════
// 9. BREAKPOINTS
// ════════════════════════════════════════════════════════════════════════

export const breakpoint = {
  sm:  '640px',
  md:  '768px',
  lg:  '1024px',
  xl:  '1280px',
  xxl: '1536px',
} as const;

// ════════════════════════════════════════════════════════════════════════
// 10. LAYOUT
// ════════════════════════════════════════════════════════════════════════

export const layout = {
  maxWidth:        '1400px',
  maxWidthWide:    '1600px',
  pagePaddingX:    space[8],     // 32px
  pagePaddingY:    space[8],
  pagePaddingXMob: space[5],     // 20px
  sidebarWidth:    '260px',
  navHeight:       '56px',
  pageBg:          neutral[50],
} as const;

// ════════════════════════════════════════════════════════════════════════
// 11. FOCUS RING (a11y)
// ════════════════════════════════════════════════════════════════════════

/**
 * CSS string for focus-visible outlines.
 * Use inside &:focus-visible { ${focusRingStyle} }
 */
export const focusRingStyle = `
  outline: 2px solid ${accent[500]};
  outline-offset: 2px;
`;

/** Box-shadow alternative when outline is clipped */
export const focusRingShadow = `0 0 0 3px ${accent[500]}40`;

// ════════════════════════════════════════════════════════════════════════
// 12. REDUCED MOTION
// ════════════════════════════════════════════════════════════════════════

/**
 * Media query string for users who prefer reduced motion.
 * Usage:  @media ${reducedMotion} { transition: none; }
 */
export const reducedMotion = '(prefers-reduced-motion: reduce)';

// ════════════════════════════════════════════════════════════════════════
// BARREL
// ════════════════════════════════════════════════════════════════════════

const tokens = {
  neutral,
  accent,
  semantic,
  color,
  space,
  radius,
  fontFamily,
  type,
  shadow,
  border,
  duration,
  easing,
  transition,
  z,
  breakpoint,
  layout,
  focusRingStyle,
  focusRingShadow,
  reducedMotion,
} as const;

export default tokens;
