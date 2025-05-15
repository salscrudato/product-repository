import { createGlobalStyle, keyframes } from 'styled-components';

/* -------- Gentle background pulse animation -------- */
const backgroundPulse = keyframes`
  0%   { transform: scale(1);   opacity:.35; filter: blur(80px); }
  50%  { transform: scale(1.05);opacity:.55; filter: blur(100px); }
  100% { transform: scale(1);   opacity:.35; filter: blur(80px); }
`;

/* gentle diagonal wave scroll */
const waveScroll = keyframes`
  from { background-position: 0 0; }
  to   { background-position: 400px 0; }
`;

export const GlobalStyle = createGlobalStyle`
  *,*::before,*::after { box-sizing:border-box; }
  body {
    margin:0;
    font-family:${({ theme }) => theme.font};
    background:#f5f5f5;
    color:${({ theme }) => theme.colours.text};
    -webkit-font-smoothing: antialiased;
  }

  /* subtle animated radial glow – confined to top‑left corner */
  body::before {
    content:'';
    position:fixed;
    top:-20vmax;
    left:-20vmax;
    width:60vmax;
    height:60vmax;
    z-index:-1;
    pointer-events:none;

    background:
      radial-gradient(
        circle at 30% 30%,
        ${({ theme }) => theme.colours.primary}44 0%,
        transparent 60%
      ),
      radial-gradient(
        circle at 70% 70%,
        ${({ theme }) => theme.colours.primaryDark}40 0%,
        transparent 55%
      );

    animation:${backgroundPulse} 12s ease-in-out infinite alternate;
  }

  /* very soft diagonal grid wave – only over top‑left quadrant */
  body::after {
    content:'';
    position:fixed;
    top:-25vmax;
    left:-25vmax;
    width:65vmax;
    height:65vmax;
    z-index:-2;              /* behind the glow */
    pointer-events:none;

    background:
      repeating-linear-gradient(
        120deg,
        ${({ theme }) => theme.colours.primaryDark}15 0px,
        ${({ theme }) => theme.colours.primaryDark}15 2px,
        transparent 2px,
        transparent 12px
      );

    animation:${waveScroll} 24s linear infinite;
    mix-blend-mode: soft-light;
  }

  a { color:inherit; text-decoration:none; }
  button { font-family:inherit; }
`;