import { createGlobalStyle, keyframes } from 'styled-components';

/* -------- Gentle background pulse animation -------- */
const backgroundPulse = keyframes`
  0%   { transform: scale(1);   opacity:1; filter: blur(60px); }
  50%  { transform: scale(1.50);opacity:.75; filter: blur(100px); }
  100% { transform: scale(1);   opacity:.15; filter: blur(80px); }
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
    background: ${({ theme }) => theme.isDarkMode
      ? theme.colours.background
      : 'linear-gradient(135deg,#f7f8fc 0%,#ffffff 35%,#f7f8fc 100%)'
    };
    color:${({ theme }) => theme.colours.text};
    -webkit-font-smoothing: antialiased;
    transition: background 0.3s ease, color 0.3s ease;
  }

  /* subtle animated radial glow – confined to top‑left corner */
  body::before {
    content:'';
    position:fixed;
    top:-10vmax;
    left:-10vmax;
    width:60vmax;
    height:60vmax;
    z-index:-1;
    pointer-events:none;
    opacity: ${({ theme }) => theme.isDarkMode ? '0.3' : '1'};

    background: ${({ theme }) => theme.isDarkMode
      ? `
        radial-gradient(
          circle at 20% 80%,
          rgba(139, 92, 246, 0.15) 0%,
          transparent 50%
        ),
        radial-gradient(
          circle at 80% 20%,
          rgba(59, 130, 246, 0.15) 0%,
          transparent 50%
        ),
        radial-gradient(
          circle at 40% 40%,
          rgba(168, 85, 247, 0.1) 0%,
          transparent 50%
        )
      `
      : `
        radial-gradient(
          circle at 30% 30%,
          ${({ theme }) => theme.colours.primary}20 25%,
          transparent 60%
        ),
        radial-gradient(
          circle at 70% 70%,
          ${({ theme }) => theme.colours.primaryDark}1A 0%,
          transparent 55%
        )
      `
    };

    animation:${backgroundPulse} 4s ease-in-out infinite alternate;
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
    opacity: ${({ theme }) => theme.isDarkMode ? '0.2' : '1'};

    background: ${({ theme }) => theme.isDarkMode
      ? `
        repeating-linear-gradient(
          120deg,
          rgba(139, 92, 246, 0.05) 0px,
          rgba(139, 92, 246, 0.05) 2px,
          transparent 2px,
          transparent 12px
        )
      `
      : `
        repeating-linear-gradient(
          120deg,
          ${({ theme }) => theme.colours.primaryDark}08 0px,
          ${({ theme }) => theme.colours.primaryDark}08 2px,
          transparent 2px,
          transparent 12px
        )
      `
    };

    animation:${waveScroll} 2s linear infinite;
    mix-blend-mode: ${({ theme }) => theme.isDarkMode ? 'overlay' : 'soft-light'};
  }

  a { color:inherit; text-decoration:none; }
  button { font-family:inherit; }
`;