/**
 * Dark Mode Theme Utility
 * Manage dark mode theme switching and persistence
 */

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  theme: Theme;
  isDarkMode: boolean;
  supportsColorScheme: boolean;
}

const THEME_STORAGE_KEY = 'app-theme-preference';
const THEME_CLASS = 'dark-mode';

/**
 * Get current theme preference
 */
export function getThemePreference(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (stored && ['light', 'dark', 'system'].includes(stored)) {
    return stored;
  }
  return 'system';
}

/**
 * Set theme preference
 */
export function setThemePreference(theme: Theme): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
}

/**
 * Check if system prefers dark mode
 */
export function systemPrefersDarkMode(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Get effective theme (resolves 'system' to actual theme)
 */
export function getEffectiveTheme(preference: Theme = getThemePreference()): 'light' | 'dark' {
  if (preference === 'system') {
    return systemPrefersDarkMode() ? 'dark' : 'light';
  }
  return preference;
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
  const effectiveTheme = getEffectiveTheme(theme);
  const isDark = effectiveTheme === 'dark';

  // Update document class
  if (isDark) {
    document.documentElement.classList.add(THEME_CLASS);
  } else {
    document.documentElement.classList.remove(THEME_CLASS);
  }

  // Update meta theme-color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      'content',
      isDark ? '#111827' : '#ffffff'
    );
  }

  // Dispatch custom event
  window.dispatchEvent(
    new CustomEvent('themechange', {
      detail: { theme: effectiveTheme, isDark }
    })
  );
}

/**
 * Initialize theme
 */
export function initializeTheme(): ThemeConfig {
  const preference = getThemePreference();
  const effectiveTheme = getEffectiveTheme(preference);
  const isDarkMode = effectiveTheme === 'dark';
  const supportsColorScheme = CSS.supports('color-scheme', 'dark');

  applyTheme(preference);

  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', (e) => {
    if (getThemePreference() === 'system') {
      applyTheme('system');
    }
  });

  return {
    theme: preference,
    isDarkMode,
    supportsColorScheme
  };
}

/**
 * Toggle between light and dark mode
 */
export function toggleTheme(): Theme {
  const current = getThemePreference();
  let next: Theme;

  if (current === 'light') {
    next = 'dark';
  } else if (current === 'dark') {
    next = 'system';
  } else {
    next = 'light';
  }

  setThemePreference(next);
  return next;
}

/**
 * Get theme colors
 */
export function getThemeColors(isDark: boolean = getEffectiveTheme() === 'dark') {
  return {
    background: isDark ? '#111827' : '#ffffff',
    surface: isDark ? '#1f2937' : '#f9fafb',
    border: isDark ? '#374151' : '#e5e7eb',
    text: isDark ? '#f9fafb' : '#111827',
    textSecondary: isDark ? '#d1d5db' : '#6b7280',
    primary: '#6366f1',
    primaryLight: '#818cf8',
    primaryDark: '#4f46e5',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
  };
}

/**
 * Get CSS variables for theme
 */
export function getThemeCSSVariables(isDark: boolean = getEffectiveTheme() === 'dark'): Record<string, string> {
  const colors = getThemeColors(isDark);

  return {
    '--color-background': colors.background,
    '--color-surface': colors.surface,
    '--color-border': colors.border,
    '--color-text': colors.text,
    '--color-text-secondary': colors.textSecondary,
    '--color-primary': colors.primary,
    '--color-primary-light': colors.primaryLight,
    '--color-primary-dark': colors.primaryDark,
    '--color-success': colors.success,
    '--color-warning': colors.warning,
    '--color-error': colors.error,
    '--color-info': colors.info
  };
}

/**
 * Apply CSS variables to document
 */
export function applyThemeCSSVariables(isDark?: boolean): void {
  const variables = getThemeCSSVariables(isDark);
  const root = document.documentElement;

  for (const [key, value] of Object.entries(variables)) {
    root.style.setProperty(key, value);
  }
}

/**
 * Get contrast-safe color pair
 */
export function getContrastSafeColors(isDark: boolean = getEffectiveTheme() === 'dark') {
  return {
    text: isDark ? '#f9fafb' : '#111827',
    background: isDark ? '#111827' : '#ffffff',
    border: isDark ? '#374151' : '#e5e7eb',
    hover: isDark ? '#1f2937' : '#f3f4f6'
  };
}

/**
 * Create theme stylesheet
 */
export function createThemeStylesheet(isDark: boolean = getEffectiveTheme() === 'dark'): string {
  const colors = getThemeColors(isDark);
  const contrastColors = getContrastSafeColors(isDark);

  return `
    :root {
      --color-background: ${colors.background};
      --color-surface: ${colors.surface};
      --color-border: ${colors.border};
      --color-text: ${colors.text};
      --color-text-secondary: ${colors.textSecondary};
      --color-primary: ${colors.primary};
      --color-primary-light: ${colors.primaryLight};
      --color-primary-dark: ${colors.primaryDark};
      --color-success: ${colors.success};
      --color-warning: ${colors.warning};
      --color-error: ${colors.error};
      --color-info: ${colors.info};
    }

    body {
      background-color: ${contrastColors.background};
      color: ${contrastColors.text};
      transition: background-color 200ms ease-in-out, color 200ms ease-in-out;
    }

    a {
      color: ${colors.primary};
    }

    a:hover {
      color: ${colors.primaryDark};
    }

    button, input, select, textarea {
      background-color: ${contrastColors.background};
      color: ${contrastColors.text};
      border-color: ${contrastColors.border};
    }

    button:hover, input:hover, select:hover, textarea:hover {
      background-color: ${contrastColors.hover};
    }

    .card, .modal {
      background-color: ${colors.surface};
      border-color: ${contrastColors.border};
    }
  `;
}

/**
 * Listen for theme changes
 */
export function onThemeChange(callback: (theme: 'light' | 'dark', isDark: boolean) => void): () => void {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent;
    callback(customEvent.detail.theme, customEvent.detail.isDark);
  };

  window.addEventListener('themechange', handler);

  return () => {
    window.removeEventListener('themechange', handler);
  };
}

/**
 * Get theme statistics
 */
export function getThemeStats(): {
  currentTheme: Theme;
  effectiveTheme: 'light' | 'dark';
  systemPreference: 'light' | 'dark';
  isDarkMode: boolean;
  supportsColorScheme: boolean;
} {
  const currentTheme = getThemePreference();
  const effectiveTheme = getEffectiveTheme(currentTheme);
  const systemPreference = systemPrefersDarkMode() ? 'dark' : 'light';
  const isDarkMode = effectiveTheme === 'dark';
  const supportsColorScheme = CSS.supports('color-scheme', 'dark');

  return {
    currentTheme,
    effectiveTheme,
    systemPreference,
    isDarkMode,
    supportsColorScheme
  };
}

