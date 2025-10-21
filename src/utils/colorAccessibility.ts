/**
 * Color Accessibility Utility
 * Verify WCAG compliance and generate accessible color palettes
 */

export interface ColorAccessibilityReport {
  color1: string;
  color2: string;
  contrastRatio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
  wcagLargeTextAA: boolean;
  wcagLargeTextAAA: boolean;
  status: 'pass' | 'fail' | 'partial';
  recommendations: string[];
}

export interface ColorPalette {
  name: string;
  colors: Record<string, string>;
  accessibility: Record<string, ColorAccessibilityReport>;
}

/**
 * Convert hex to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
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
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Get relative luminance
 */
export function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check WCAG compliance
 */
export function checkWCAGCompliance(
  color1: string,
  color2: string
): {
  AA: boolean;
  AAA: boolean;
  largeTextAA: boolean;
  largeTextAAA: boolean;
} {
  const ratio = calculateContrastRatio(color1, color2);

  return {
    AA: ratio >= 4.5,
    AAA: ratio >= 7,
    largeTextAA: ratio >= 3,
    largeTextAAA: ratio >= 4.5
  };
}

/**
 * Generate accessibility report
 */
export function generateAccessibilityReport(
  color1: string,
  color2: string
): ColorAccessibilityReport {
  const ratio = calculateContrastRatio(color1, color2);
  const compliance = checkWCAGCompliance(color1, color2);

  const recommendations: string[] = [];

  if (!compliance.AA) {
    recommendations.push('Does not meet WCAG AA standard for normal text');
  }
  if (!compliance.AAA) {
    recommendations.push('Does not meet WCAG AAA standard for normal text');
  }
  if (!compliance.largeTextAA) {
    recommendations.push('Does not meet WCAG AA standard for large text');
  }
  if (!compliance.largeTextAAA) {
    recommendations.push('Does not meet WCAG AAA standard for large text');
  }

  if (recommendations.length === 0) {
    recommendations.push('Meets all WCAG standards');
  }

  let status: 'pass' | 'fail' | 'partial' = 'fail';
  if (compliance.AA) status = 'partial';
  if (compliance.AAA) status = 'pass';

  return {
    color1,
    color2,
    contrastRatio: Math.round(ratio * 100) / 100,
    wcagAA: compliance.AA,
    wcagAAA: compliance.AAA,
    wcagLargeTextAA: compliance.largeTextAA,
    wcagLargeTextAAA: compliance.largeTextAAA,
    status,
    recommendations
  };
}

/**
 * Find accessible text color for background
 */
export function findAccessibleTextColor(
  backgroundColor: string,
  lightColor: string = '#ffffff',
  darkColor: string = '#000000'
): string {
  const lightRatio = calculateContrastRatio(backgroundColor, lightColor);
  const darkRatio = calculateContrastRatio(backgroundColor, darkColor);

  return lightRatio > darkRatio ? lightColor : darkColor;
}

/**
 * Generate color variants
 */
export function generateColorVariants(baseColor: string): Record<string, string> {
  const rgb = hexToRgb(baseColor);
  if (!rgb) return {};

  const variants: Record<string, string> = {
    base: baseColor
  };

  // Lighter variants
  for (let i = 1; i <= 3; i++) {
    const factor = i * 0.2;
    variants[`light-${i}`] = rgbToHex(
      Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor)),
      Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor)),
      Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor))
    );
  }

  // Darker variants
  for (let i = 1; i <= 3; i++) {
    const factor = i * 0.2;
    variants[`dark-${i}`] = rgbToHex(
      Math.max(0, Math.round(rgb.r * (1 - factor))),
      Math.max(0, Math.round(rgb.g * (1 - factor))),
      Math.max(0, Math.round(rgb.b * (1 - factor)))
    );
  }

  return variants;
}

/**
 * Verify palette accessibility
 */
export function verifyPaletteAccessibility(
  palette: Record<string, string>,
  backgroundColor: string
): Record<string, ColorAccessibilityReport> {
  const reports: Record<string, ColorAccessibilityReport> = {};

  for (const [name, color] of Object.entries(palette)) {
    reports[name] = generateAccessibilityReport(color, backgroundColor);
  }

  return reports;
}

/**
 * Get color accessibility statistics
 */
export function getColorAccessibilityStats(
  reports: Record<string, ColorAccessibilityReport>
): {
  total: number;
  passAA: number;
  passAAA: number;
  failAA: number;
  averageContrast: number;
} {
  const reportArray = Object.values(reports);

  return {
    total: reportArray.length,
    passAA: reportArray.filter(r => r.wcagAA).length,
    passAAA: reportArray.filter(r => r.wcagAAA).length,
    failAA: reportArray.filter(r => !r.wcagAA).length,
    averageContrast: Math.round(
      (reportArray.reduce((sum, r) => sum + r.contrastRatio, 0) / reportArray.length) * 100
    ) / 100
  };
}

/**
 * Generate color accessibility documentation
 */
export function generateColorDocumentation(
  palette: Record<string, string>,
  backgroundColor: string
): string {
  const reports = verifyPaletteAccessibility(palette, backgroundColor);
  const stats = getColorAccessibilityStats(reports);

  let doc = '# Color Accessibility Report\n\n';
  doc += `**Background Color**: ${backgroundColor}\n`;
  doc += `**Total Colors**: ${stats.total}\n`;
  doc += `**WCAG AA Pass**: ${stats.passAA}/${stats.total}\n`;
  doc += `**WCAG AAA Pass**: ${stats.passAAA}/${stats.total}\n`;
  doc += `**Average Contrast**: ${stats.averageContrast}:1\n\n`;

  doc += '## Color Details\n\n';

  for (const [name, report] of Object.entries(reports)) {
    doc += `### ${name}\n`;
    doc += `- **Color**: ${report.color1}\n`;
    doc += `- **Contrast Ratio**: ${report.contrastRatio}:1\n`;
    doc += `- **WCAG AA**: ${report.wcagAA ? '✅' : '❌'}\n`;
    doc += `- **WCAG AAA**: ${report.wcagAAA ? '✅' : '❌'}\n`;
    doc += `- **Status**: ${report.status.toUpperCase()}\n`;
    doc += `- **Recommendations**: ${report.recommendations.join('; ')}\n\n`;
  }

  return doc;
}

/**
 * Create accessible color palette
 */
export function createAccessiblePalette(
  baseColors: Record<string, string>,
  backgroundColor: string
): ColorPalette {
  const allColors: Record<string, string> = {};
  const accessibility: Record<string, ColorAccessibilityReport> = {};

  for (const [name, color] of Object.entries(baseColors)) {
    const variants = generateColorVariants(color);
    for (const [variantName, variantColor] of Object.entries(variants)) {
      const fullName = variantName === 'base' ? name : `${name}-${variantName}`;
      allColors[fullName] = variantColor;
      accessibility[fullName] = generateAccessibilityReport(variantColor, backgroundColor);
    }
  }

  return {
    name: 'Accessible Color Palette',
    colors: allColors,
    accessibility
  };
}

/**
 * Export palette as CSS
 */
export function exportPaletteAsCSS(palette: ColorPalette): string {
  let css = ':root {\n';

  for (const [name, color] of Object.entries(palette.colors)) {
    css += `  --color-${name}: ${color};\n`;
  }

  css += '}\n';

  return css;
}

/**
 * Export palette as JSON
 */
export function exportPaletteAsJSON(palette: ColorPalette): string {
  return JSON.stringify(palette, null, 2);
}

