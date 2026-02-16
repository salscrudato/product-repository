import { createGlobalStyle } from 'styled-components';
import {
  color, neutral, accent, space, radius, shadow,
  fontFamily, type as typeScale, transition, duration, easing,
  layout, focusRingStyle, reducedMotion,
} from '../ui/tokens';

export const GlobalStyle = createGlobalStyle`
  /* ── Reset ── */
  *, *::before, *::after { box-sizing: border-box; }

  html {
    scroll-behavior: smooth;
    text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
    font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1;
    font-optical-sizing: auto;
  }

  body {
    margin: 0;
    font-family: ${fontFamily.sans};
    font-size: ${typeScale.bodyMd.size};
    line-height: ${typeScale.bodyMd.lineHeight};
    letter-spacing: ${typeScale.bodyMd.letterSpacing};
    font-weight: ${typeScale.bodyMd.weight};
    background: ${layout.pageBg};
    color: ${color.text};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    overflow-x: hidden;
    min-height: 100vh;
  }

  /* ── Focus ── */
  :focus:not(:focus-visible) { outline: none; }

  :focus-visible {
    ${focusRingStyle}
    border-radius: ${radius.sm};
  }

  button:focus-visible,
  a:focus-visible,
  [role="button"]:focus-visible {
    outline: none;
    box-shadow: ${shadow.focus};
  }

  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    outline: none;
    box-shadow: ${shadow.focus};
    border-color: ${color.borderFocus};
  }

  /* ── Skip link (a11y) ── */
  .skip-link {
    position: absolute;
    top: -100px;
    left: ${space[4]};
    z-index: 10000;
    padding: ${space[3]} ${space[6]};
    background: ${accent[600]};
    color: ${color.textInverse};
    font-weight: 600;
    border-radius: ${radius.md};
    text-decoration: none;
    transition: top ${transition.fast};
    &:focus { top: ${space[4]}; }
  }

  .sr-only {
    position: absolute;
    width: 1px; height: 1px;
    padding: 0; margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap; border: 0;
  }

  /* ── Selection ── */
  ::selection {
    background: ${accent[100]};
    color: ${accent[900]};
  }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: ${neutral[300]};
    border-radius: ${radius.full};
    &:hover { background: ${neutral[400]}; }
  }
  ::-webkit-scrollbar-corner { background: transparent; }
  * { scrollbar-width: thin; scrollbar-color: ${neutral[300]} transparent; }

  /* ── Typography ── */
  h1, h2, h3, h4, h5, h6 {
    margin: 0;
    font-family: ${fontFamily.sans};
    color: ${color.text};
  }

  h1 {
    font-size: ${typeScale.displayLg.size};
    font-weight: ${typeScale.displayLg.weight};
    line-height: ${typeScale.displayLg.lineHeight};
    letter-spacing: ${typeScale.displayLg.letterSpacing};
  }
  h2 {
    font-size: ${typeScale.displaySm.size};
    font-weight: ${typeScale.displaySm.weight};
    line-height: ${typeScale.displaySm.lineHeight};
    letter-spacing: ${typeScale.displaySm.letterSpacing};
  }
  h3 {
    font-size: ${typeScale.headingLg.size};
    font-weight: ${typeScale.headingLg.weight};
    line-height: ${typeScale.headingLg.lineHeight};
    letter-spacing: ${typeScale.headingLg.letterSpacing};
  }
  h4 {
    font-size: ${typeScale.headingMd.size};
    font-weight: ${typeScale.headingMd.weight};
    line-height: ${typeScale.headingMd.lineHeight};
    letter-spacing: ${typeScale.headingMd.letterSpacing};
  }
  h5 {
    font-size: ${typeScale.headingSm.size};
    font-weight: ${typeScale.headingSm.weight};
    line-height: ${typeScale.headingSm.lineHeight};
    letter-spacing: ${typeScale.headingSm.letterSpacing};
  }

  p {
    margin: 0;
    color: ${color.textSecondary};
    font-size: ${typeScale.bodyMd.size};
    line-height: ${typeScale.bodyMd.lineHeight};
  }

  small {
    font-size: ${typeScale.caption.size};
    line-height: ${typeScale.caption.lineHeight};
    letter-spacing: ${typeScale.caption.letterSpacing};
  }

  /* ── Links ── */
  a {
    color: inherit;
    text-decoration: none;
    transition: color ${transition.fast};
    &:hover { color: ${accent[600]}; }
  }

  /* ── Inputs/Buttons ── */
  button {
    font-family: inherit;
    font-size: inherit;
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
  }
  button:disabled { cursor: not-allowed; opacity: 0.45; }

  input, textarea, select {
    font-family: inherit;
    font-size: inherit;
    color: ${color.text};
  }

  input::placeholder,
  textarea::placeholder {
    color: ${neutral[400]};
    opacity: 1;
  }

  /* ── Media ── */
  img, svg { display: block; max-width: 100%; height: auto; }
  svg { flex-shrink: 0; }

  /* ── Lists / Tables ── */
  ul, ol { margin: 0; padding: 0; list-style: none; }
  table { border-collapse: collapse; border-spacing: 0; width: 100%; }
  th, td { text-align: left; vertical-align: middle; }

  /* ── Reduced motion ── */
  @media ${reducedMotion} {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* ── Utilities ── */
  .truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
