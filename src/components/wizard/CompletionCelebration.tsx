/**
 * CompletionCelebration - Confetti celebration when coverage is published
 */

import React, { useEffect, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/solid';

interface CompletionCelebrationProps {
  isVisible: boolean;
  onComplete?: () => void;
}

const CONFETTI_COUNT = 50;
const CONFETTI_COLORS = ['#8b5cf6', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

export const CompletionCelebration: React.FC<CompletionCelebrationProps> = ({
  isVisible,
  onComplete,
}) => {
  const [confetti, setConfetti] = useState<Array<{
    id: number;
    x: number;
    delay: number;
    color: string;
    size: number;
    rotation: number;
  }>>([]);

  useEffect(() => {
    if (isVisible) {
      // Generate confetti particles
      const particles = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 500,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 6 + Math.random() * 6,
        rotation: Math.random() * 360,
      }));
      setConfetti(particles);

      // Auto-complete after animation
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      setConfetti([]);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <Overlay>
      {/* Confetti particles */}
      {confetti.map((particle) => (
        <ConfettiParticle
          key={particle.id}
          $x={particle.x}
          $delay={particle.delay}
          $color={particle.color}
          $size={particle.size}
          $rotation={particle.rotation}
        />
      ))}

      {/* Success message */}
      <SuccessCard>
        <IconWrapper>
          <CheckCircleIcon />
        </IconWrapper>
        <Title>Coverage Published!</Title>
        <Subtitle>
          <SparklesIcon />
          <span>AI-assisted coverage created successfully</span>
        </Subtitle>
      </SuccessCard>
    </Overlay>
  );
};

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
`;

const fall = keyframes`
  0% {
    opacity: 1;
    transform: translateY(-100vh) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: translateY(100vh) rotate(720deg);
  }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const checkmark = keyframes`
  0% { stroke-dashoffset: 100; opacity: 0; }
  50% { opacity: 1; }
  100% { stroke-dashoffset: 0; opacity: 1; }
`;

// Styled Components
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  animation: ${fadeIn} 0.3s ease-out;
`;

const ConfettiParticle = styled.div<{
  $x: number;
  $delay: number;
  $color: string;
  $size: number;
  $rotation: number;
}>`
  position: absolute;
  top: 0;
  left: ${({ $x }) => $x}%;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  background: ${({ $color }) => $color};
  border-radius: 2px;
  animation: ${fall} 3s ease-in forwards;
  animation-delay: ${({ $delay }) => $delay}ms;
  transform: rotate(${({ $rotation }) => $rotation}deg);
`;

const SuccessCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 64px;
  background: white;
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: ${fadeIn} 0.4s ease-out, ${pulse} 2s ease-in-out infinite;
  animation-delay: 0s, 0.4s;
`;

const IconWrapper = styled.div`
  display: flex;
  padding: 16px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 50%;
  margin-bottom: 24px;
  svg { width: 48px; height: 48px; color: white; }
`;

const Title = styled.h2`
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 12px;
`;

const Subtitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  color: #6b7280;
  svg { width: 18px; height: 18px; color: #8b5cf6; }
`;

export default CompletionCelebration;

