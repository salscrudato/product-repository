// src/components/Login.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';
import { getAuth, signInAnonymously } from 'firebase/auth';
import logger, { LOG_CATEGORIES } from '../utils/logger';

/* ============================== Motion =============================== */
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(30px) scale(.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1);   }
`;
const slideIn = keyframes`
  from { transform: translateX(-100%); opacity:0; }
  to   { transform: translateX(0);     opacity:1; }
`;
const gradientShift = keyframes`
  0%,100% { background-position: 0% 50% }
  50%     { background-position: 100% 50% }
`;
const glowPulse = keyframes`
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
`;
const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

/* Enhanced animations for futuristic feel */
const breathe = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
`;

const gradientFlow = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
`;

const ripple = keyframes`
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
`;

const successPulse = keyframes`
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

const particleBurst = keyframes`
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--tx), var(--ty)) scale(0);
    opacity: 0;
  }
`;

/* Misting pulse animation - creates fog effect from behind card */
const mistPulse = keyframes`
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.08;
  }
  33% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0.15;
  }
  66% {
    transform: translate(-50%, -50%) scale(0.95);
    opacity: 0.12;
  }
`;

const mistPulse2 = keyframes`
  0%, 100% {
    transform: translate(-50%, -50%) scale(1.05) rotate(0deg);
    opacity: 0.1;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.25) rotate(180deg);
    opacity: 0.18;
  }
`;

const mistPulse3 = keyframes`
  0%, 100% {
    transform: translate(-50%, -50%) scale(0.98);
    opacity: 0.09;
  }
  40% {
    transform: translate(-50%, -50%) scale(1.15);
    opacity: 0.16;
  }
  80% {
    transform: translate(-50%, -50%) scale(1.02);
    opacity: 0.13;
  }
`;

/* Neural network animations */
const neuralPulse = keyframes`
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.2);
  }
`;

const connectionFlow = keyframes`
  0% {
    stroke-dashoffset: 1000;
    opacity: 0.2;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    stroke-dashoffset: 0;
    opacity: 0.2;
  }
`;

const nodeGlow = keyframes`
  0%, 100% {
    filter: drop-shadow(0 0 2px rgba(99,102,241,0.4));
  }
  50% {
    filter: drop-shadow(0 0 8px rgba(99,102,241,0.8));
  }
`;

/* AI-inspired particle animations */
const aiParticleFloat = keyframes`
  0% {
    transform: translateY(0) translateX(0) scale(1);
    opacity: 0;
  }
  10% {
    opacity: 0.6;
  }
  90% {
    opacity: 0.6;
  }
  100% {
    transform: translateY(-100vh) translateX(var(--drift, 0px)) scale(0.3);
    opacity: 0;
  }
`;

const aiPulseGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 10px rgba(99,102,241,0.4), 0 0 20px rgba(168,85,247,0.2);
  }
  50% {
    box-shadow: 0 0 20px rgba(99,102,241,0.8), 0 0 40px rgba(168,85,247,0.4);
  }
`;

const aiOrbitSpin = keyframes`
  0% {
    transform: rotate(0deg) translateX(60px) rotate(0deg);
  }
  100% {
    transform: rotate(360deg) translateX(60px) rotate(-360deg);
  }
`;

/* Smooth card entrance with subtle scale */
const cardEnter = keyframes`
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

/* Subtle glow pulse for card border */
const borderGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 0 1px rgba(255,255,255,.15),
                0 40px 100px rgba(0,0,0,.7),
                0 0 180px rgba(99,102,241,.3),
                inset 0 2px 0 rgba(255,255,255,.1),
                inset 0 -1px 0 rgba(0,0,0,.3);
  }
  50% {
    box-shadow: 0 0 0 1px rgba(255,255,255,.2),
                0 40px 100px rgba(0,0,0,.7),
                0 0 220px rgba(99,102,241,.4),
                inset 0 2px 0 rgba(255,255,255,.15),
                inset 0 -1px 0 rgba(0,0,0,.3);
  }
`;


/* ============================== Layout =============================== */
const Page = styled.div`
  --bg-a: #06071a;
  --bg-b: #08091f;
  --bg-c: #000000;

  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  position: relative; overflow: hidden;

  /* Deep, immersive background gradient with richer colors */
  background:
    radial-gradient(ellipse at center, var(--bg-a) 0%, var(--bg-b) 50%, var(--bg-c) 100%);
  background-size: 200% 200%;
  animation: ${gradientShift} 24s ease-in-out infinite;

  /* Enhanced neural mesh with more vibrant colors and refined grid */
  &::before {
    content: '';
    position: absolute; inset: -20%;
    background:
      radial-gradient(120vmax 120vmax at 50% 50%, rgba(255,255,255,.12), transparent 60%),
      repeating-linear-gradient( 0deg, rgba(99,102,241,.1) 0 1px, transparent 1px 24px),
      repeating-linear-gradient(90deg, rgba(99,102,241,.1) 0 1px, transparent 1px 24px);
    mask-image: radial-gradient(70vmin 70vmin at 50% 50%, #000 45%, transparent 100%);
    opacity: .75;
    pointer-events: none;
    z-index: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background-size: auto;
  }
`;

/* ============================== Modern Organic Background =============================== */

/* Morphing blob animations */
const morphBlob1 = keyframes`
  0%, 100% {
    border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
    transform: translate(-50%, -50%) translate3d(0, 0, 0) scale(1);
  }
  25% {
    border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
    transform: translate(-50%, -50%) translate3d(8vmin, -5vmin, 0) scale(1.08);
  }
  50% {
    border-radius: 50% 60% 30% 60% / 30% 50% 70% 40%;
    transform: translate(-50%, -50%) translate3d(-6vmin, 4vmin, 0) scale(0.95);
  }
  75% {
    border-radius: 60% 40% 60% 40% / 70% 30% 50% 60%;
    transform: translate(-50%, -50%) translate3d(4vmin, 6vmin, 0) scale(1.05);
  }
`;

const morphBlob2 = keyframes`
  0%, 100% {
    border-radius: 40% 60% 60% 40% / 60% 40% 60% 40%;
    transform: translate(-50%, -50%) translate3d(0, 0, 0) scale(1) rotate(0deg);
  }
  33% {
    border-radius: 70% 30% 50% 50% / 30% 70% 40% 60%;
    transform: translate(-50%, -50%) translate3d(-7vmin, 6vmin, 0) scale(1.1) rotate(120deg);
  }
  66% {
    border-radius: 50% 50% 30% 70% / 60% 40% 70% 30%;
    transform: translate(-50%, -50%) translate3d(5vmin, -4vmin, 0) scale(0.92) rotate(240deg);
  }
`;

const morphBlob3 = keyframes`
  0%, 100% {
    border-radius: 30% 70% 70% 30% / 30% 50% 50% 70%;
    transform: translate(-50%, -50%) translate3d(0, 0, 0) scale(1);
  }
  40% {
    border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%;
    transform: translate(-50%, -50%) translate3d(6vmin, 7vmin, 0) scale(1.12);
  }
  80% {
    border-radius: 50% 50% 60% 40% / 40% 60% 50% 50%;
    transform: translate(-50%, -50%) translate3d(-5vmin, -6vmin, 0) scale(0.9);
  }
`;

/* Organic gradient background layer */
const OrganicBackground = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;
`;

/* Morphing blob shapes */
const MorphingBlob = styled.div<{ $variant: 1 | 2 | 3 }>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: ${({$variant}) => $variant === 1 ? '70vmin' : $variant === 2 ? '85vmin' : '60vmin'};
  height: ${({$variant}) => $variant === 1 ? '70vmin' : $variant === 2 ? '85vmin' : '60vmin'};
  background: ${({$variant}) =>
    $variant === 1
      ? 'radial-gradient(circle, rgba(99,102,241,.35) 0%, rgba(99,102,241,.15) 40%, transparent 70%)'
      : $variant === 2
      ? 'radial-gradient(circle, rgba(168,85,247,.3) 0%, rgba(168,85,247,.12) 40%, transparent 70%)'
      : 'radial-gradient(circle, rgba(14,165,233,.28) 0%, rgba(14,165,233,.1) 40%, transparent 70%)'
  };
  filter: blur(40px);
  opacity: 0.8;
  animation: ${({$variant}) => $variant === 1 ? morphBlob1 : $variant === 2 ? morphBlob2 : morphBlob3}
             ${({$variant}) => $variant === 1 ? 20 : $variant === 2 ? 25 : 22}s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    border-radius: 50%;
  }
`;

/* Light “mist” dots that drift subtly to add depth without filters */
// Replaced by ParticleField and Particle components below
// const MistLayer = styled.div`...
// const MistDot = styled.div<{ $variant: 'a'|'b'|'c' }>`...

/* Floating orb particles with depth */
const floatOrb = keyframes`
  0%, 100% {
    transform: translate3d(0, 0, 0);
    opacity: 0.4;
  }
  25% {
    transform: translate3d(15px, -20px, 0);
    opacity: 0.7;
  }
  50% {
    transform: translate3d(-10px, 10px, 0);
    opacity: 0.5;
  }
  75% {
    transform: translate3d(20px, 15px, 0);
    opacity: 0.6;
  }
`;

const FloatingOrbs = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  overflow: hidden;
`;

const Orb = styled.div<{ $x: number; $y: number; $size: number; $delay: number; $duration: number }>`
  position: absolute;
  left: ${({$x}) => $x}%;
  top: ${({$y}) => $y}%;
  width: ${({$size}) => $size}px;
  height: ${({$size}) => $size}px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.8), rgba(99,102,241,.4));
  box-shadow:
    0 0 20px rgba(99,102,241,.6),
    0 0 40px rgba(168,85,247,.3),
    inset 0 0 10px rgba(255,255,255,.5);
  animation: ${floatOrb} ${({$duration}) => $duration}s ease-in-out infinite;
  animation-delay: ${({$delay}) => $delay}s;
  filter: blur(1px);
  opacity: 0.5;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* AI-inspired particle field for innovative background */
const AIParticleField = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  overflow: hidden;
`;

const AIParticle = styled.div<{ $duration: number; $delay: number; $drift: number }>`
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(99,102,241,0.8), rgba(168,85,247,0.4));
  box-shadow: 0 0 8px rgba(99,102,241,0.6), 0 0 16px rgba(168,85,247,0.3);
  animation: ${aiParticleFloat} ${({$duration}) => $duration}s linear ${({$delay}) => $delay}s infinite;
  --drift: ${({$drift}) => $drift}px;
  will-change: transform, opacity;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.3;
  }
`;

/* AI orbital nodes - creates a sense of intelligent movement */
const AIOrbitalNode = styled.div`
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, rgba(99,102,241,0.9), rgba(168,85,247,0.5));
  box-shadow: 0 0 12px rgba(99,102,241,0.8), 0 0 24px rgba(168,85,247,0.4);
  animation: ${aiPulseGlow} 3s ease-in-out infinite;
  will-change: box-shadow;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* Modern gradient mesh layer */
const meshShift = keyframes`
  0%, 100% {
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
    opacity: 0.3;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1) rotate(5deg);
    opacity: 0.5;
  }
`;

const GradientMesh = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
  overflow: hidden;
`;

const MeshLayer = styled.div<{ $variant: 1 | 2 }>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 140vmin;
  height: 140vmin;
  transform: translate(-50%, -50%);
  background: ${({$variant}) =>
    $variant === 1
      ? `conic-gradient(
          from 0deg at 50% 50%,
          transparent 0deg,
          rgba(99,102,241,.15) 90deg,
          transparent 180deg,
          rgba(168,85,247,.12) 270deg,
          transparent 360deg
        )`
      : `conic-gradient(
          from 180deg at 50% 50%,
          transparent 0deg,
          rgba(14,165,233,.12) 90deg,
          transparent 180deg,
          rgba(99,102,241,.15) 270deg,
          transparent 360deg
        )`
  };
  animation: ${meshShift} ${({$variant}) => $variant === 1 ? 30 : 35}s ease-in-out infinite;
  animation-delay: ${({$variant}) => $variant === 1 ? 0 : 5}s;
  mix-blend-mode: screen;
  filter: blur(60px);

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* ============================== Misting Pulse Layers =============================== */

const MistingLayer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MistCloud = styled.div<{ $variant: 1 | 2 | 3 }>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: ${({$variant}) => $variant === 1 ? '600px' : $variant === 2 ? '700px' : '550px'};
  height: ${({$variant}) => $variant === 1 ? '600px' : $variant === 2 ? '700px' : '550px'};
  border-radius: 50%;
  background: ${({$variant}) =>
    $variant === 1
      ? 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0.08) 30%, transparent 70%)'
      : $variant === 2
      ? 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(168,85,247,0.06) 30%, transparent 70%)'
      : 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, rgba(14,165,233,0.05) 30%, transparent 70%)'
  };
  filter: blur(100px);
  animation: ${({$variant}) => $variant === 1 ? mistPulse : $variant === 2 ? mistPulse2 : mistPulse3}
             ${({$variant}) => $variant === 1 ? 8 : $variant === 2 ? 10 : 9}s ease-in-out infinite;
  animation-delay: ${({$variant}) => $variant === 1 ? 0 : $variant === 2 ? 2 : 4}s;
  mix-blend-mode: screen;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.08;
  }
`;

/* ============================== Neural Network =============================== */

const NeuralNetworkLayer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 4;
  overflow: hidden;
  opacity: 0.25;
`;

const NeuralSVG = styled.svg`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
`;

const NeuralNode = styled.circle<{ $delay: number }>`
  fill: rgba(99,102,241,0.4);
  animation: ${neuralPulse} 4s ease-in-out infinite, ${nodeGlow} 4s ease-in-out infinite;
  animation-delay: ${({$delay}) => $delay}s;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.3;
  }
`;

const NeuralConnection = styled.line<{ $delay: number }>`
  stroke: rgba(99,102,241,0.2);
  stroke-width: 0.5;
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: ${connectionFlow} 12s linear infinite;
  animation-delay: ${({$delay}) => $delay}s;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    stroke-dasharray: none;
    stroke-dashoffset: 0;
    opacity: 0.15;
  }
`;


/* ============================== Card ==================================== */

const Card = styled.div`
  width: 100%; max-width: 420px; padding: 40px 44px 40px;
  background: rgba(4,4,12,.92);
  backdrop-filter: blur(80px) saturate(240%);
  -webkit-backdrop-filter: blur(80px) saturate(240%);
  border-radius: 32px;
  position: relative; z-index: 10; text-align: center;
  animation: ${cardEnter} 0.9s cubic-bezier(0.16, 1, 0.3, 1), ${float} 6s ease-in-out infinite;
  animation-delay: 0s, 1s;
  box-shadow:
    0 0 0 1px rgba(255,255,255,.15),
    0 40px 100px rgba(0,0,0,.7),
    0 0 180px rgba(99,102,241,.3),
    inset 0 2px 0 rgba(255,255,255,.1),
    inset 0 -1px 0 rgba(0,0,0,.3);
  transition: transform 0.3s ease-out, box-shadow 0.3s ease-out;
  transform-style: preserve-3d;
  perspective: 1000px;
  will-change: transform;

  /* Animated gradient border - more vibrant and refined */
  &::before{
    content:''; position:absolute; inset:-2px; border-radius:34px; padding:2px;
    background: linear-gradient(
      135deg,
      rgba(99,102,241,.9),
      rgba(168,85,247,.8),
      rgba(14,165,233,.8),
      rgba(99,102,241,.9)
    );
    background-size: 300% 300%;
    animation: ${gradientShift} 8s ease infinite;
    -webkit-mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events:none;
    opacity:1;
  }

  /* Inner glow effect - enhanced with holographic feel */
  &::after{
    content:''; position:absolute; inset:0; border-radius:32px;
    box-shadow:
      inset 0 3px 0 rgba(255,255,255,.18),
      inset 0 -2px 0 rgba(0,0,0,.6);
    pointer-events:none;
  }

  @media (max-width: 480px){
    padding: 36px 32px 36px;
    max-width: 360px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: ${cardEnter} 0.9s cubic-bezier(0.16, 1, 0.3, 1);
  }
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28px;
  position: relative;
  opacity: 0;
  animation: ${fadeInUp} 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
`;

const AILogo = styled.div`
  width: 72px;
  height: 72px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${breathe} 4s ease-in-out infinite;
  will-change: transform;

  /* Outer glow ring - enhanced with multiple layers and more vibrant */
  &::before {
    content: '';
    position: absolute;
    inset: -14px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(99,102,241,.6) 0%,
      rgba(168,85,247,.5) 25%,
      rgba(14,165,233,.4) 50%,
      rgba(99,102,241,.2) 75%,
      transparent 100%
    );
    animation: ${glowPulse} 3s ease-in-out infinite;
    filter: blur(8px);
    will-change: opacity, transform;
  }

  /* Core orb - larger and more vibrant with holographic effect */
  &::after {
    content: '';
    position: absolute;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #a855f7, #0ea5e9, #6366f1);
    background-size: 300% 300%;
    animation: ${gradientShift} 6s ease infinite;
    box-shadow:
      0 0 60px rgba(99,102,241,.9),
      0 0 120px rgba(168,85,247,.7),
      0 0 180px rgba(14,165,233,.5),
      inset 0 4px 12px rgba(255,255,255,.6),
      inset 0 -4px 12px rgba(0,0,0,.4);
    will-change: background-position;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;

    &::before {
      animation: none;
    }

    &::after {
      animation: none;
    }
  }
`;

const AIIcon = styled.svg`
  width: 36px;
  height: 36px;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,.6));
`;

const Title = styled.h1`
  font-size: 2.8rem;
  font-weight: 800;
  margin: 0 0 12px;
  color: #ffffff;
  letter-spacing: -0.04em;
  line-height: 1;
  position: relative;
  text-shadow:
    0 0 40px rgba(99,102,241,.5),
    0 2px 4px rgba(0,0,0,.3);
  background: linear-gradient(
    135deg,
    #ffffff 0%,
    #e0e7ff 30%,
    #c7d2fe 60%,
    #a5b4fc 100%
  );
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  opacity: 0;
  animation: ${fadeInUp} 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards,
             ${gradientFlow} 8s ease infinite;
  will-change: opacity, transform;

  @media (max-width: 480px){
    font-size: 2.4rem;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: ${fadeInUp} 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards;
    background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

const Subtitle = styled.p`
  font-size: 0.8rem;
  color: rgba(255,255,255,.7);
  margin: 0 0 32px;
  font-weight: 600;
  letter-spacing: 0.12em;
  line-height: 1.5;
  text-transform: uppercase;
  opacity: 0;
  position: relative;
  animation: ${fadeInUp} 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.6s forwards;
  will-change: opacity, transform;

  /* Enhanced glow effect */
  text-shadow:
    0 0 24px rgba(99,102,241,.3),
    0 1px 2px rgba(0,0,0,.2);

  /* Animated underline accent - more refined */
  &::after {
    content: '';
    position: absolute;
    bottom: -14px;
    left: 50%;
    transform: translateX(-50%) scaleX(0);
    width: 60px;
    height: 3px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(99,102,241,.9),
      rgba(168,85,247,.9),
      transparent
    );
    border-radius: 3px;
    box-shadow:
      0 0 16px rgba(99,102,241,.7),
      0 0 32px rgba(168,85,247,.4);
    animation: scaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.8s forwards;
  }

  @keyframes scaleIn {
    from { transform: translateX(-50%) scaleX(0); }
    to { transform: translateX(-50%) scaleX(1); }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: ${fadeInUp} 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.6s forwards;

    &::after {
      animation: none;
      transform: translateX(-50%) scaleX(1);
    }
  }
`;

const Divider = styled.div`
  height: 2px;
  width: 100%;
  margin: 24px 0;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(99,102,241,.5) 20%,
      rgba(168,85,247,.5) 50%,
      rgba(14,165,233,.5) 80%,
      transparent
    );
    opacity: .7;
    border-radius: 2px;
  }

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #a855f7);
    box-shadow:
      0 0 16px rgba(99,102,241,.7),
      0 0 32px rgba(168,85,247,.4);
  }
`;

/* ============================== Controls =============================== */
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const spinGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(99,102,241,.6);
  }
  50% {
    box-shadow: 0 0 30px rgba(168,85,247,.8);
  }
`;

const LoadingSpinner = styled.div`
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(255,255,255,.15);
  border-top: 2.5px solid #fff;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite, ${spinGlow} 1.6s ease-in-out infinite;
  margin-right: 10px;

  @media (prefers-reduced-motion: reduce){
    animation: none;
    border-top-color: rgba(255,255,255,.7);
  }
`;

const GuestButton = styled.button`
  width: 100%;
  height: 52px;
  padding: 0 36px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6, #0ea5e9, #6366f1);
  background-size: 300% 300%;
  color: #ffffff;
  font-weight: 700;
  letter-spacing: 0.08em;
  font-size: 0.95rem;
  text-transform: uppercase;
  cursor: pointer;
  transition: all .4s cubic-bezier(0.16, 1, 0.3, 1), letter-spacing .3s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  opacity: 0;
  animation: ${fadeInUp} 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.8s forwards;
  box-shadow:
    0 0 0 1px rgba(255,255,255,.2),
    0 16px 40px rgba(99,102,241,.5),
    0 0 80px rgba(99,102,241,.4),
    inset 0 2px 0 rgba(255,255,255,.3),
    inset 0 -1px 0 rgba(0,0,0,.2);
  will-change: transform, box-shadow;

  /* Shimmer effect overlay - always visible */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      120deg,
      transparent 0%,
      rgba(255,255,255,.35) 50%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: ${shimmer} 3.5s linear infinite;
    opacity: 0.75;
    transition: opacity .4s ease;
    pointer-events: none;
  }

  /* Glow effect on hover */
  &::after {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 22px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6, #0ea5e9, #6366f1);
    background-size: 300% 300%;
    z-index: -1;
    opacity: 0;
    filter: blur(24px);
    transition: opacity .4s ease;
    animation: ${gradientShift} 6s ease infinite;
  }

  &:hover:not(:disabled) {
    transform: translateY(-4px) scale(1.02);
    background-position: 100% 50%;
    letter-spacing: 0.12em;
    box-shadow:
      0 0 0 1px rgba(255,255,255,.35),
      0 20px 50px rgba(99,102,241,.6),
      0 0 100px rgba(99,102,241,.5),
      inset 0 2px 0 rgba(255,255,255,.4),
      inset 0 -1px 0 rgba(0,0,0,.3);

    &::before { opacity: 1; }
    &::after { opacity: 1; }
  }

  &:active:not(:disabled) {
    transform: translateY(-2px) scale(1.01);
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 4px rgba(99,102,241,.7),
      0 16px 40px rgba(99,102,241,.55);
  }

  &:disabled {
    opacity: .7;
    cursor: not-allowed;
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: ${fadeInUp} 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.8s forwards;

    &::before {
      animation: none;
    }

    &::after {
      animation: none;
    }
  }
`;

/* Ripple effect container */
const RippleContainer = styled.span`
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 16px;
  pointer-events: none;
`;

const RippleEffect = styled.span`
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  animation: ${ripple} 0.6s ease-out;
  pointer-events: none;
`;

type MessageProps = { $type: 'error' | 'success' };
const Message = styled.div<MessageProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: .875rem;
  font-weight: 600;
  margin-top: 20px;
  min-height: 48px;
  animation: ${slideIn} .4s cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(16px);
  position: relative;
  overflow: hidden;
  will-change: opacity, transform;

  ${(p)=>p.$type==='error' && css`
    background: rgba(239,68,68,.15);
    color: #fecaca;
    border: 1px solid rgba(239,68,68,.35);
    box-shadow:
      0 6px 20px rgba(239,68,68,.15),
      inset 0 1px 0 rgba(255,255,255,.1);
  `}
  ${(p)=>p.$type==='success' && css`
    background: rgba(34,197,94,.15);
    color: #bbf7d0;
    border: 1px solid rgba(34,197,94,.35);
    box-shadow:
      0 6px 20px rgba(34,197,94,.15),
      inset 0 1px 0 rgba(255,255,255,.1);

    /* Success pulse animation */
    &::before {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: 18px;
      background: linear-gradient(135deg, rgba(34,197,94,.4), rgba(34,197,94,.2));
      animation: ${successPulse} 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: -1;
    }
  `}

  svg {
    margin-right: 12px;
    flex-shrink: 0;
    animation: ${(p) => p.$type === 'success' ? successPulse : 'none'} 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @media (prefers-reduced-motion: reduce) {
    animation: ${slideIn} .4s cubic-bezier(0.16, 1, 0.3, 1);

    &::before {
      animation: none;
    }

    svg {
      animation: none;
    }
  }
`;

/* Success particle burst */
const ParticleBurst = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

const Particle = styled.div<{ $angle: number; $distance: number; $delay: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: linear-gradient(135deg, #22c55e, #10b981);
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.8);
  --tx: calc(cos(${p => p.$angle}deg) * ${p => p.$distance}px);
  --ty: calc(sin(${p => p.$angle}deg) * ${p => p.$distance}px);
  animation: ${particleBurst} 1s ease-out ${p => p.$delay}s forwards;
`;

const VersionBadge = styled.div`
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(99,102,241,.15);
  font-size: 0.65rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255,255,255,.4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &::before {
    content: '';
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(99,102,241,.5);
    box-shadow: 0 0 8px rgba(99,102,241,.4);
  }

  &::after {
    content: '';
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(99,102,241,.5);
    box-shadow: 0 0 8px rgba(99,102,241,.4);
  }
`;

/* ============================== Component =============================== */
const Login: React.FC = () => {
  const nav = useNavigate();
  const location = useLocation() as { state?: { from?: Location } };
  const redirectTo = (location.state?.from as any)?.pathname || '/';

  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [showParticles, setShowParticles] = useState(false);

  // Pointer-parallax (cheap, throttled via rAF, disabled for reduced-motion)
  const pageRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const prefersReduced = useRef<boolean>(false);

  useEffect(() => {
    prefersReduced.current =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const handleGuestLogin = useCallback(async () => {
    const startTime = Date.now();

    logger.logUserAction('Guest login attempt started', {
      loginType: 'guest',
      userAgent: navigator.userAgent,
      ts: new Date().toISOString(),
    });

    setErr('');
    setSuccess('');
    setIsLoading(true);

    try {
      // Secure anonymous session
      const auth = getAuth();
      const cred = await signInAnonymously(auth);

      logger.setUserId(cred.user.uid || 'anon');
      logger.info(LOG_CATEGORIES.AUTH, 'Anonymous session established', { uid: cred.user.uid });

      // Back-compat for any legacy gates still reading sessionStorage
      sessionStorage.setItem('ph-authed', 'guest');
      sessionStorage.setItem('ph-username', 'guest');

      setSuccess('Guest login successful. Redirecting…');

      // Trigger particle burst on success
      if (!prefersReduced.current) {
        setShowParticles(true);
        setTimeout(() => setShowParticles(false), 1000);
      }

      setTimeout(() => {
        logger.logNavigation('/login', redirectTo, { reason: 'guest_login' });
        nav(redirectTo, { replace: true });
      }, 650);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        LOG_CATEGORIES.AUTH,
        'Guest/anonymous login failed',
        { duration, loginType: 'guest' },
        error as Error
      );
      setErr('Unable to start a guest session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [nav, redirectTo]);

  // Handle button click ripple effect
  const handleButtonClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (prefersReduced.current || isLoading) return;

    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple = { id: Date.now(), x, y };
    setRipples(prev => [...prev, newRipple]);

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);

    handleGuestLogin();
  }, [handleGuestLogin, isLoading]);

  return (
    <Page ref={pageRef}>
      {/* Modern organic background with morphing blobs */}
      <OrganicBackground aria-hidden="true">
        <MorphingBlob $variant={1} />
        <MorphingBlob $variant={2} />
      </OrganicBackground>

      {/* Gradient mesh layer */}
      <GradientMesh aria-hidden="true">
        <MeshLayer $variant={1} />
        <MeshLayer $variant={2} />
      </GradientMesh>

      {/* Floating orb particles */}
      <FloatingOrbs aria-hidden="true">
        <Orb $x={15} $y={20} $size={8} $delay={0} $duration={12} />
        <Orb $x={85} $y={30} $size={6} $delay={1} $duration={15} />
        <Orb $x={25} $y={70} $size={10} $delay={2} $duration={13} />
        <Orb $x={75} $y={75} $size={7} $delay={3} $duration={14} />
        <Orb $x={40} $y={15} $size={6} $delay={0.5} $duration={17} />
        <Orb $x={60} $y={85} $size={9} $delay={2.8} $duration={15} />
      </FloatingOrbs>

      {/* AI-inspired particle field - innovative background animation */}
      <AIParticleField aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <AIParticle
            key={`particle-${i}`}
            $duration={8 + Math.random() * 6}
            $delay={Math.random() * 4}
            $drift={-40 + Math.random() * 80}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${100 + Math.random() * 20}%`
            }}
          />
        ))}
        {/* Orbital nodes for intelligent feel */}
        <AIOrbitalNode style={{ left: '20%', top: '30%' }} />
        <AIOrbitalNode style={{ left: '80%', top: '40%' }} />
        <AIOrbitalNode style={{ left: '50%', top: '60%' }} />
      </AIParticleField>

      {/* Neural Network Layer - Subtle animated network in background */}
      <NeuralNetworkLayer aria-hidden="true">
        <NeuralSVG viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
          {/* Neural connections - lines between nodes */}
          <NeuralConnection x1="200" y1="150" x2="600" y2="200" $delay={0} />
          <NeuralConnection x1="600" y1="200" x2="1000" y2="250" $delay={0.5} />
          <NeuralConnection x1="1000" y1="250" x2="1400" y2="300" $delay={1} />
          <NeuralConnection x1="1400" y1="300" x2="1720" y2="350" $delay={1.5} />

          <NeuralConnection x1="300" y1="600" x2="700" y2="650" $delay={0.3} />
          <NeuralConnection x1="700" y1="650" x2="1100" y2="700" $delay={0.8} />
          <NeuralConnection x1="1100" y1="700" x2="1500" y2="750" $delay={1.3} />

          {/* Cross connections for network effect */}
          <NeuralConnection x1="200" y1="150" x2="300" y2="600" $delay={0.2} />
          <NeuralConnection x1="1000" y1="250" x2="1100" y2="700" $delay={1.2} />

          {/* Neural nodes - glowing circles at connection points */}
          <NeuralNode cx="200" cy="150" r="4" $delay={0} />
          <NeuralNode cx="600" cy="200" r="5" $delay={0.4} />
          <NeuralNode cx="1000" cy="250" r="5" $delay={0.8} />
          <NeuralNode cx="1400" cy="300" r="5" $delay={1.2} />
          <NeuralNode cx="1720" cy="350" r="4" $delay={1.6} />

          <NeuralNode cx="300" cy="600" r="5" $delay={0.3} />
          <NeuralNode cx="700" cy="650" r="5" $delay={0.7} />
          <NeuralNode cx="1100" cy="700" r="4" $delay={1.1} />
          <NeuralNode cx="1500" cy="750" r="5" $delay={1.5} />
        </NeuralSVG>
      </NeuralNetworkLayer>

      {/* Misting Pulse Layers - Creates fog effect from behind card */}
      <MistingLayer aria-hidden="true">
        <MistCloud $variant={1} />
        <MistCloud $variant={2} />
      </MistingLayer>

      <Card ref={cardRef} role="region" aria-labelledby="login-title" aria-describedby="login-desc">
        <LogoContainer aria-hidden="true">
          <AILogo>
            <AIIcon viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                fill="white"
                fillOpacity="0.9"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.9"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.9"
              />
            </AIIcon>
          </AILogo>
        </LogoContainer>

        <Title id="login-title">Welcome</Title>
        <Subtitle id="login-desc">AI-Powered Insurance Platform</Subtitle>

        <GuestButton
          ref={buttonRef}
          type="button"
          onClick={handleButtonClick}
          disabled={isLoading}
          aria-disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <LoadingSpinner aria-hidden="true" />
              Initializing…
            </>
          ) : (
            'Launch Platform'
          )}
          {/* Ripple effects */}
          {ripples.map(ripple => (
            <RippleContainer key={ripple.id}>
              <RippleEffect
                style={{
                  left: ripple.x,
                  top: ripple.y,
                }}
              />
            </RippleContainer>
          ))}
        </GuestButton>

        {(err || success) && <Divider />}

        {err && (
          <Message $type="error" id="error-message" role="alert" aria-live="assertive">
            <ExclamationCircleIcon width={20} />
            {err}
          </Message>
        )}
        {success && (
          <Message $type="success" role="status" aria-live="polite">
            <CheckCircleIcon width={20} />
            {success}
            {/* Success particle burst */}
            {showParticles && (
              <ParticleBurst>
                {Array.from({ length: 12 }).map((_, i) => (
                  <Particle
                    key={i}
                    $angle={i * 30}
                    $distance={60}
                    $delay={i * 0.02}
                  />
                ))}
              </ParticleBurst>
            )}
          </Message>
        )}

        <VersionBadge aria-label="Platform version">
          Platform v2.0
        </VersionBadge>
      </Card>
    </Page>
  );
};

export default Login;