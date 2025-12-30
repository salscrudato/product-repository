/**
 * Centralized Animation Library
 *
 * Core keyframe animations used by Button and other components.
 * Components may define their own local keyframes for specific needs.
 */

import { keyframes } from 'styled-components';

// ============ Loading Animations ============
// These are the primary shared animations used across components

export const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

export const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;
