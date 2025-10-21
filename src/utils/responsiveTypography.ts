/**
 * Responsive Typography Utility
 * Fluid typography, responsive font sizes, and readability optimization
 */

export interface TypographyScale {
  xs: { mobile: number; tablet: number; desktop: number };
  sm: { mobile: number; tablet: number; desktop: number };
  base: { mobile: number; tablet: number; desktop: number };
  lg: { mobile: number; tablet: number; desktop: number };
  xl: { mobile: number; tablet: number; desktop: number };
  '2xl': { mobile: number; tablet: number; desktop: number };
  '3xl': { mobile: number; tablet: number; desktop: number };
  '4xl': { mobile: number; tablet: number; desktop: number };
}

export interface ResponsiveTypographyConfig {
  scale: TypographyScale;
  lineHeights: Record<string, number>;
  letterSpacing: Record<string, string>;
  fontWeights: Record<string, number>;
}

/**
 * Default responsive typography scale (in pixels)
 */
export const DEFAULT_TYPOGRAPHY_SCALE: TypographyScale = {
  xs: { mobile: 11, tablet: 12, desktop: 12 },
  sm: { mobile: 12, tablet: 13, desktop: 14 },
  base: { mobile: 14, tablet: 15, desktop: 16 },
  lg: { mobile: 16, tablet: 17, desktop: 18 },
  xl: { mobile: 18, tablet: 19, desktop: 20 },
  '2xl': { mobile: 20, tablet: 22, desktop: 24 },
  '3xl': { mobile: 24, tablet: 27, desktop: 30 },
  '4xl': { mobile: 28, tablet: 32, desktop: 36 }
};

/**
 * Default line heights
 */
export const DEFAULT_LINE_HEIGHTS: Record<string, number> = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2
};

/**
 * Default letter spacing
 */
export const DEFAULT_LETTER_SPACING: Record<string, string> = {
  tight: '-0.02em',
  normal: '0em',
  wide: '0.02em',
  wider: '0.05em',
  widest: '0.1em'
};

/**
 * Default font weights
 */
export const DEFAULT_FONT_WEIGHTS: Record<string, number> = {
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800
};

/**
 * Calculate fluid font size
 */
export function calculateFluidFontSize(
  minSize: number,
  maxSize: number,
  minViewport: number = 320,
  maxViewport: number = 1280
): string {
  const slope = (maxSize - minSize) / (maxViewport - minViewport);
  const intercept = minSize - slope * minViewport;

  return `clamp(${minSize}px, ${intercept}px + ${slope * 100}vw, ${maxSize}px)`;
}

/**
 * Get responsive font size CSS
 */
export function getResponsiveFontSizeCSS(
  scale: TypographyScale,
  size: keyof TypographyScale
): string {
  const sizes = scale[size];

  return `
    font-size: ${sizes.mobile}px;

    @media (min-width: 640px) {
      font-size: ${sizes.tablet}px;
    }

    @media (min-width: 1024px) {
      font-size: ${sizes.desktop}px;
    }
  `;
}

/**
 * Get fluid typography CSS
 */
export function getFluidTypographyCSS(
  scale: TypographyScale,
  size: keyof TypographyScale
): string {
  const sizes = scale[size];
  const fluidSize = calculateFluidFontSize(sizes.mobile, sizes.desktop);

  return `font-size: ${fluidSize};`;
}

/**
 * Calculate optimal line height
 */
export function calculateOptimalLineHeight(fontSize: number): number {
  // Optimal line height is typically 1.4-1.6 for body text
  // Tighter for headings (1.2-1.3), looser for small text (1.6-1.8)
  if (fontSize < 14) return 1.6;
  if (fontSize < 18) return 1.5;
  if (fontSize < 24) return 1.4;
  return 1.3;
}

/**
 * Calculate optimal line length
 */
export function calculateOptimalLineLength(fontSize: number): number {
  // Optimal line length is 50-75 characters
  // Approximately 2.5-3 times the font size in pixels
  return Math.round(fontSize * 2.75);
}

/**
 * Get heading styles
 */
export function getHeadingStyles(
  level: 1 | 2 | 3 | 4 | 5 | 6,
  scale: TypographyScale = DEFAULT_TYPOGRAPHY_SCALE,
  lineHeights: Record<string, number> = DEFAULT_LINE_HEIGHTS
): {
  fontSize: string;
  lineHeight: number;
  fontWeight: number;
  marginTop: string;
  marginBottom: string;
} {
  const sizeMap: Record<number, keyof TypographyScale> = {
    1: '4xl',
    2: '3xl',
    3: '2xl',
    4: 'xl',
    5: 'lg',
    6: 'base'
  };

  const marginMap: Record<number, { top: string; bottom: string }> = {
    1: { top: '2rem', bottom: '1rem' },
    2: { top: '1.5rem', bottom: '0.875rem' },
    3: { top: '1.25rem', bottom: '0.75rem' },
    4: { top: '1rem', bottom: '0.625rem' },
    5: { top: '0.875rem', bottom: '0.5rem' },
    6: { top: '0.75rem', bottom: '0.5rem' }
  };

  const size = sizeMap[level];
  const margins = marginMap[level];

  return {
    fontSize: getFluidTypographyCSS(scale, size),
    lineHeight: lineHeights.tight,
    fontWeight: level <= 3 ? 700 : 600,
    marginTop: margins.top,
    marginBottom: margins.bottom
  };
}

/**
 * Get body text styles
 */
export function getBodyTextStyles(
  scale: TypographyScale = DEFAULT_TYPOGRAPHY_SCALE,
  lineHeights: Record<string, number> = DEFAULT_LINE_HEIGHTS
): {
  fontSize: string;
  lineHeight: number;
  letterSpacing: string;
} {
  return {
    fontSize: getFluidTypographyCSS(scale, 'base'),
    lineHeight: lineHeights.normal,
    letterSpacing: '0em'
  };
}

/**
 * Get small text styles
 */
export function getSmallTextStyles(
  scale: TypographyScale = DEFAULT_TYPOGRAPHY_SCALE,
  lineHeights: Record<string, number> = DEFAULT_LINE_HEIGHTS
): {
  fontSize: string;
  lineHeight: number;
  letterSpacing: string;
} {
  return {
    fontSize: getFluidTypographyCSS(scale, 'sm'),
    lineHeight: lineHeights.relaxed,
    letterSpacing: '0.02em'
  };
}

/**
 * Generate typography CSS
 */
export function generateTypographyCSS(
  scale: TypographyScale = DEFAULT_TYPOGRAPHY_SCALE,
  lineHeights: Record<string, number> = DEFAULT_LINE_HEIGHTS,
  fontWeights: Record<string, number> = DEFAULT_FONT_WEIGHTS
): string {
  let css = '';

  // Headings
  for (let i = 1; i <= 6; i++) {
    const styles = getHeadingStyles(i as 1 | 2 | 3 | 4 | 5 | 6, scale, lineHeights);
    css += `
      h${i} {
        ${styles.fontSize}
        line-height: ${styles.lineHeight};
        font-weight: ${styles.fontWeight};
        margin-top: ${styles.marginTop};
        margin-bottom: ${styles.marginBottom};
      }
    `;
  }

  // Body text
  const bodyStyles = getBodyTextStyles(scale, lineHeights);
  css += `
    body, p {
      ${bodyStyles.fontSize}
      line-height: ${bodyStyles.lineHeight};
      letter-spacing: ${bodyStyles.letterSpacing};
    }
  `;

  // Small text
  const smallStyles = getSmallTextStyles(scale, lineHeights);
  css += `
    small, .text-sm {
      ${smallStyles.fontSize}
      line-height: ${smallStyles.lineHeight};
      letter-spacing: ${smallStyles.letterSpacing};
    }
  `;

  // Font weights
  for (const [name, weight] of Object.entries(fontWeights)) {
    css += `
      .font-${name} {
        font-weight: ${weight};
      }
    `;
  }

  return css;
}

/**
 * Calculate reading time
 */
export function calculateReadingTime(text: string, wordsPerMinute: number = 200): number {
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

/**
 * Format reading time
 */
export function formatReadingTime(text: string, wordsPerMinute: number = 200): string {
  const minutes = calculateReadingTime(text, wordsPerMinute);

  if (minutes < 1) return 'Less than 1 min read';
  if (minutes === 1) return '1 min read';
  return `${minutes} min read`;
}

/**
 * Get typography config
 */
export function getTypographyConfig(
  scale: TypographyScale = DEFAULT_TYPOGRAPHY_SCALE,
  lineHeights: Record<string, number> = DEFAULT_LINE_HEIGHTS,
  letterSpacing: Record<string, string> = DEFAULT_LETTER_SPACING,
  fontWeights: Record<string, number> = DEFAULT_FONT_WEIGHTS
): ResponsiveTypographyConfig {
  return {
    scale,
    lineHeights,
    letterSpacing,
    fontWeights
  };
}

/**
 * Export typography as CSS variables
 */
export function exportTypographyAsCSS(
  config: ResponsiveTypographyConfig
): string {
  let css = ':root {\n';

  // Font sizes
  for (const [size, values] of Object.entries(config.scale)) {
    css += `  --font-size-${size}: ${values.desktop}px;\n`;
  }

  // Line heights
  for (const [name, value] of Object.entries(config.lineHeights)) {
    css += `  --line-height-${name}: ${value};\n`;
  }

  // Letter spacing
  for (const [name, value] of Object.entries(config.letterSpacing)) {
    css += `  --letter-spacing-${name}: ${value};\n`;
  }

  // Font weights
  for (const [name, value] of Object.entries(config.fontWeights)) {
    css += `  --font-weight-${name}: ${value};\n`;
  }

  css += '}\n';

  return css;
}

