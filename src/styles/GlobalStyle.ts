import { createGlobalStyle, keyframes } from 'styled-components';
// Import shimmer from centralized animations (single source of truth)
import { shimmer } from './animations';

/* -------- Gentle background pulse animation -------- */
const backgroundPulse = keyframes`
  0%   { transform: scale(1);   opacity: 0.6; filter: blur(60px); }
  50%  { transform: scale(1.35); opacity: 0.45; filter: blur(80px); }
  100% { transform: scale(1);   opacity: 0.6; filter: blur(60px); }
`;

/* gentle diagonal wave scroll - optimized */
const waveScroll = keyframes`
  from { background-position: 0 0; }
  to   { background-position: 400px 0; }
`;

export const GlobalStyle = createGlobalStyle`
  /* ---------- Reset & Base Styles ---------- */
  *,*::before,*::after { box-sizing:border-box; }

  html {
    scroll-behavior: smooth;
    text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
    /* Apple-style font feature settings for elegant typography */
    font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1, 'cv01' 1, 'cv02' 1;
    font-optical-sizing: auto;
  }

  body {
    margin: 0;
    /* Apple-inspired system font stack */
    font-family: ${({ theme }) => theme.font};
    font-size: ${({ theme }) => theme.typography.body.size};
    line-height: ${({ theme }) => theme.typography.body.lineHeight};
    letter-spacing: ${({ theme }) => theme.typography.body.letterSpacing};
    font-weight: 400;
    background: linear-gradient(145deg, #f8fafc 0%, #f1f5f9 50%, #f8fafc 100%);
    color: ${({ theme }) => theme.colours.text};
    /* Apple-style font rendering for crisp, elegant text */
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1;
    overflow-x: hidden;
    min-height: 100vh;
  }

  /* ---------- Focus States - Enhanced Accessibility (WCAG 2.1 AA) ---------- */
  /* Only hide outline for mouse users, preserve for keyboard navigation */
  :focus:not(:focus-visible) {
    outline: none;
  }

  /* Show clear focus indicator for keyboard users */
  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.colours.primary};
    outline-offset: 3px;
    border-radius: 6px;
    transition: outline-offset 0.15s ease;
  }

  /* Enhanced interactive element focus with brand colors */
  button:focus-visible,
  a:focus-visible,
  [role="button"]:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colours.focusRing};
    border-color: ${({ theme }) => theme.colours.primary};
  }

  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colours.focusRing};
    border-color: ${({ theme }) => theme.colours.primary};
  }

  /* Skip link for keyboard navigation */
  .skip-link {
    position: absolute;
    top: -100px;
    left: 16px;
    z-index: 10000;
    padding: 12px 24px;
    background: ${({ theme }) => theme.colours.primary};
    color: white;
    font-weight: 600;
    border-radius: ${({ theme }) => theme.radiusMd};
    text-decoration: none;
    transition: top 0.2s ease;

    &:focus {
      top: 16px;
    }
  }

  /* Screen reader only utility */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* ---------- Selection Styles - Enhanced ---------- */
  ::selection {
    background: ${({ theme }) => theme.colours.primary};
    color: white;
    text-shadow: none;
  }

  ::-moz-selection {
    background: ${({ theme }) => theme.colours.primary};
    color: white;
    text-shadow: none;
  }

  /* ---------- Scrollbar Styling - Refined ---------- */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.4);
    border-radius: 4px;
    border: 2px solid transparent;
    background-clip: content-box;
    transition: background 0.2s ease;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: rgba(148, 163, 184, 0.6);
    background-clip: content-box;
  }

  ::-webkit-scrollbar-thumb:active {
    background: rgba(99, 102, 241, 0.5);
    background-clip: content-box;
  }

  /* Scrollbar corner */
  ::-webkit-scrollbar-corner {
    background: transparent;
  }

  /* Firefox scrollbar */
  * {
    scrollbar-width: thin;
    scrollbar-color: rgba(148, 163, 184, 0.4) transparent;
  }

  /* ---------- Typography Reset - Apple-Inspired ---------- */
  h1, h2, h3, h4, h5, h6 {
    margin: 0;
    font-family: ${({ theme }) => theme.fontDisplay};
    font-weight: 600;
    line-height: 1.2;
    color: ${({ theme }) => theme.colours.text};
    letter-spacing: -0.022em;
  }

  h1 {
    font-size: ${({ theme }) => theme.typography.h1.size};
    font-weight: ${({ theme }) => theme.typography.h1.weight};
    line-height: ${({ theme }) => theme.typography.h1.lineHeight};
    letter-spacing: ${({ theme }) => theme.typography.h1.letterSpacing};
  }

  h2 {
    font-size: ${({ theme }) => theme.typography.h2.size};
    font-weight: ${({ theme }) => theme.typography.h2.weight};
    line-height: ${({ theme }) => theme.typography.h2.lineHeight};
    letter-spacing: ${({ theme }) => theme.typography.h2.letterSpacing};
  }

  h3 {
    font-size: ${({ theme }) => theme.typography.h3.size};
    font-weight: ${({ theme }) => theme.typography.h3.weight};
    line-height: ${({ theme }) => theme.typography.h3.lineHeight};
    letter-spacing: ${({ theme }) => theme.typography.h3.letterSpacing};
  }

  h4 {
    font-size: ${({ theme }) => theme.typography.h4.size};
    font-weight: ${({ theme }) => theme.typography.h4.weight};
    line-height: ${({ theme }) => theme.typography.h4.lineHeight};
    letter-spacing: ${({ theme }) => theme.typography.h4.letterSpacing};
  }

  h5 {
    font-size: ${({ theme }) => theme.typography.h5.size};
    font-weight: ${({ theme }) => theme.typography.h5.weight};
    line-height: ${({ theme }) => theme.typography.h5.lineHeight};
    letter-spacing: ${({ theme }) => theme.typography.h5.letterSpacing};
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colours.textSecondary};
    font-size: ${({ theme }) => theme.typography.body.size};
    line-height: ${({ theme }) => theme.typography.body.lineHeight};
  }

  /* Small/caption text */
  small {
    font-size: ${({ theme }) => theme.typography.small.size};
    line-height: ${({ theme }) => theme.typography.small.lineHeight};
    letter-spacing: ${({ theme }) => theme.typography.small.letterSpacing};
  }

  /* ---------- Links - Enhanced ---------- */
  a {
    color: inherit;
    text-decoration: none;
    transition: color ${({ theme }) => theme.transitions.fast},
                opacity ${({ theme }) => theme.transitions.fast};
  }

  a:hover {
    color: ${({ theme }) => theme.colours.primary};
  }

  /* ---------- Buttons & Inputs - Enhanced ---------- */
  button {
    font-family: inherit;
    font-size: inherit;
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
    transition: transform 0.15s ease, opacity 0.15s ease;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  button:active:not(:disabled) {
    transform: scale(0.98);
  }

  input, textarea, select {
    font-family: inherit;
    font-size: inherit;
    color: ${({ theme }) => theme.colours.text};
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  /* Placeholder styling */
  input::placeholder,
  textarea::placeholder {
    color: ${({ theme }) => theme.colours.textMuted};
    opacity: 1;
  }

  /* ---------- Images ---------- */
  img, svg {
    display: block;
    max-width: 100%;
    height: auto;
  }

  /* SVG icon defaults */
  svg {
    flex-shrink: 0;
  }

  /* ---------- Lists ---------- */
  ul, ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* ---------- Tables - Enhanced ---------- */
  table {
    border-collapse: collapse;
    border-spacing: 0;
    width: 100%;
  }

  th, td {
    text-align: left;
    vertical-align: middle;
  }

  /* ---------- Reduced Motion ---------- */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* ---------- Subtle animated radial glow - Refined ---------- */
  body::before {
    content: '';
    position: fixed;
    top: -15vmax;
    left: -15vmax;
    width: 55vmax;
    height: 55vmax;
    z-index: -1;
    pointer-events: none;
    opacity: 0.8;

    background:
      radial-gradient(
        ellipse at 25% 25%,
        ${({ theme }) => theme.colours.primary}18 0%,
        ${({ theme }) => theme.colours.primary}08 35%,
        transparent 65%
      ),
      radial-gradient(
        ellipse at 75% 75%,
        ${({ theme }) => theme.colours.primaryDark}12 0%,
        transparent 50%
      );

    animation: ${backgroundPulse} 8s ease-in-out infinite alternate;
    will-change: transform, opacity;
  }

  /* ---------- Diagonal grid wave - Refined ---------- */
  body::after {
    content: '';
    position: fixed;
    top: -20vmax;
    left: -20vmax;
    width: 60vmax;
    height: 60vmax;
    z-index: -2;
    pointer-events: none;
    opacity: 0.6;

    background:
      repeating-linear-gradient(
        135deg,
        ${({ theme }) => theme.colours.primaryDark}06 0px,
        ${({ theme }) => theme.colours.primaryDark}06 1px,
        transparent 1px,
        transparent 16px
      );

    animation: ${waveScroll} 25s linear infinite;
    mix-blend-mode: multiply;
    will-change: background-position;
  }

  /* ---------- Utility Classes - Extended ---------- */
  .truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Fade in animation utility */
  .fade-in {
    animation: fadeIn 0.3s ease forwards;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Shimmer loading effect */
  .shimmer {
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.colours.backgroundAlt} 0%,
      ${({ theme }) => theme.colours.background} 50%,
      ${({ theme }) => theme.colours.backgroundAlt} 100%
    );
    background-size: 200% 100%;
    animation: ${shimmer} 1.5s ease-in-out infinite;
  }

  /* Glass effect utility */
  .glass {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  /* Hover lift effect */
  .hover-lift {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .hover-lift:hover {
    transform: translateY(-2px);
  }

  /* Interactive card base */
  .interactive-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    cursor: pointer;
  }

  .interactive-card:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadowCardHover};
  }

  .interactive-card:active {
    transform: translateY(0);
  }

  /* ---------- Wizard Animations ---------- */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .animate-fade-in {
    animation: fadeIn 0.3s ease-out forwards;
  }

  .animate-slide-up {
    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .animate-slide-in-right {
    animation: slideInRight 0.2s ease-out forwards;
  }
`;