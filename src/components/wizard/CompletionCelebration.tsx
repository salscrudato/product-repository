/**
 * CompletionCelebration - Premium celebration when coverage is published
 *
 * PREMIUM V2 Features:
 * - Multi-layer confetti with varied shapes (squares, circles, ribbons)
 * - Radial burst animation from center
 * - Animated success checkmark with draw effect
 * - Glassmorphism success card
 * - Action buttons for next steps
 */

import React, { useEffect, useState, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { CheckCircleIcon, SparklesIcon, ArrowRightIcon, PlusIcon, DocumentDuplicateIcon } from '@heroicons/react/24/solid';

interface CompletionCelebrationProps {
  isVisible: boolean;
  onComplete?: () => void;
  coverageName?: string;
  onCreateAnother?: () => void;
  onViewCoverage?: () => void;
}

const CONFETTI_COUNT = 80;
const CONFETTI_COLORS = ['#8b5cf6', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#a855f7', '#22c55e'];
const CONFETTI_SHAPES = ['square', 'circle', 'ribbon'] as const;

export const CompletionCelebration: React.FC<CompletionCelebrationProps> = ({
  isVisible,
  onComplete,
  coverageName,
  onCreateAnother,
  onViewCoverage,
}) => {
  const [confetti, setConfetti] = useState<Array<{
    id: number;
    x: number;
    y: number;
    delay: number;
    color: string;
    size: number;
    rotation: number;
    shape: typeof CONFETTI_SHAPES[number];
    angle: number;
    distance: number;
  }>>([]);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Generate confetti particles with burst effect from center
      const particles = Array.from({ length: CONFETTI_COUNT }, (_, i) => {
        const angle = (i / CONFETTI_COUNT) * 360 + Math.random() * 30;
        const distance = 30 + Math.random() * 70;
        return {
          id: i,
          x: 50 + Math.cos(angle * Math.PI / 180) * distance * 0.3,
          y: 50 + Math.sin(angle * Math.PI / 180) * distance * 0.3,
          delay: Math.random() * 300,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          size: 6 + Math.random() * 8,
          rotation: Math.random() * 360,
          shape: CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)],
          angle,
          distance,
        };
      });
      setConfetti(particles);

      // Show action buttons after initial animation
      const actionsTimer = setTimeout(() => setShowActions(true), 800);

      return () => clearTimeout(actionsTimer);
    } else {
      setConfetti([]);
      setShowActions(false);
    }
  }, [isVisible]);

  const handleDismiss = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <Overlay onClick={handleDismiss}>
      {/* Radial glow effect */}
      <RadialGlow />

      {/* Confetti particles with burst effect */}
      {confetti.map((particle) => (
        <ConfettiParticle
          key={particle.id}
          $x={particle.x}
          $y={particle.y}
          $delay={particle.delay}
          $color={particle.color}
          $size={particle.size}
          $rotation={particle.rotation}
          $shape={particle.shape}
          $angle={particle.angle}
          $distance={particle.distance}
        />
      ))}

      {/* Success card */}
      <SuccessCard onClick={(e) => e.stopPropagation()}>
        {/* Animated checkmark */}
        <CheckmarkContainer>
          <CheckmarkCircle>
            <CheckmarkSvg viewBox="0 0 52 52">
              <CheckmarkPath d="M14 27l7 7 16-16" />
            </CheckmarkSvg>
          </CheckmarkCircle>
          <CheckmarkGlow />
        </CheckmarkContainer>

        <Title>Coverage Published!</Title>
        {coverageName && <CoverageName>"{coverageName}"</CoverageName>}

        <Subtitle>
          <SparklesIcon />
          <span>AI-assisted coverage created successfully</span>
        </Subtitle>

        {/* Action buttons */}
        {showActions && (
          <ActionsRow>
            {onCreateAnother && (
              <ActionButton $variant="secondary" onClick={onCreateAnother}>
                <PlusIcon />
                <span>Create Another</span>
              </ActionButton>
            )}
            {onViewCoverage && (
              <ActionButton $variant="primary" onClick={onViewCoverage}>
                <span>View Coverage</span>
                <ArrowRightIcon />
              </ActionButton>
            )}
            {!onCreateAnother && !onViewCoverage && (
              <ActionButton $variant="primary" onClick={handleDismiss}>
                <span>Continue</span>
                <ArrowRightIcon />
              </ActionButton>
            )}
          </ActionsRow>
        )}
      </SuccessCard>
    </Overlay>
  );
};

// Premium Animations
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
`;

const burst = keyframes`
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(0);
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) translateX(var(--tx)) translateY(var(--ty)) rotate(var(--rot)) scale(1);
  }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  50% { transform: scale(1.02); box-shadow: 0 0 30px 10px rgba(16, 185, 129, 0.2); }
`;

const drawCheck = keyframes`
  0% { stroke-dashoffset: 50; }
  100% { stroke-dashoffset: 0; }
`;

const circleGrow = keyframes`
  0% { transform: scale(0); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

const glowPulse = keyframes`
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const radialExpand = keyframes`
  from { opacity: 0.8; transform: scale(0); }
  to { opacity: 0; transform: scale(3); }
`;

// Styled Components - Premium V2
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  animation: ${fadeIn} 0.3s ease-out;
  cursor: pointer;
`;

const RadialGlow = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%);
  transform: translate(-50%, -50%);
  animation: ${radialExpand} 1s ease-out forwards;
  pointer-events: none;
`;

const ConfettiParticle = styled.div<{
  $x: number;
  $y: number;
  $delay: number;
  $color: string;
  $size: number;
  $rotation: number;
  $shape: string;
  $angle: number;
  $distance: number;
}>`
  position: absolute;
  top: ${({ $y }) => $y}%;
  left: ${({ $x }) => $x}%;
  width: ${({ $size, $shape }) => $shape === 'ribbon' ? $size * 0.4 : $size}px;
  height: ${({ $size, $shape }) => $shape === 'ribbon' ? $size * 2 : $size}px;
  background: ${({ $color }) => $color};
  border-radius: ${({ $shape }) => $shape === 'circle' ? '50%' : $shape === 'ribbon' ? '2px' : '3px'};
  --tx: ${({ $angle, $distance }) => Math.cos($angle * Math.PI / 180) * $distance * 3}px;
  --ty: ${({ $angle, $distance }) => Math.sin($angle * Math.PI / 180) * $distance * 3}px;
  --rot: ${({ $rotation }) => $rotation + 720}deg;
  animation: ${burst} 2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  animation-delay: ${({ $delay }) => $delay}ms;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const SuccessCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56px 72px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  animation: ${scaleIn} 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: default;
  position: relative;
  z-index: 1;
`;

const CheckmarkContainer = styled.div`
  position: relative;
  margin-bottom: 28px;
`;

const CheckmarkCircle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  border-radius: 50%;
  animation: ${circleGrow} 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  box-shadow: 0 8px 24px rgba(22, 197, 94, 0.4);
`;

const CheckmarkSvg = styled.svg`
  width: 44px;
  height: 44px;
  fill: none;
`;

const CheckmarkPath = styled.path`
  stroke: white;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 50;
  stroke-dashoffset: 50;
  animation: ${drawCheck} 0.5s ease-out 0.3s forwards;
`;

const CheckmarkGlow = styled.div`
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(22, 197, 94, 0.3) 0%, transparent 70%);
  animation: ${glowPulse} 2s ease-in-out infinite;
  z-index: -1;
`;

const Title = styled.h2`
  font-size: 32px;
  font-weight: 800;
  color: #1f2937;
  margin: 0 0 8px;
  letter-spacing: -0.02em;
  animation: ${slideUp} 0.4s ease-out 0.2s both;
`;

const CoverageName = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #6366f1;
  margin-bottom: 12px;
  animation: ${slideUp} 0.4s ease-out 0.3s both;
`;

const Subtitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: #6b7280;
  animation: ${slideUp} 0.4s ease-out 0.4s both;

  svg {
    width: 18px;
    height: 18px;
    color: #8b5cf6;
  }
`;

const ActionsRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 32px;
  animation: ${slideUp} 0.4s ease-out 0.5s both;
`;

const ActionButton = styled.button<{ $variant: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);

  svg {
    width: 16px;
    height: 16px;
  }

  ${({ $variant }) => $variant === 'primary' ? css`
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border: none;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
    }
  ` : css`
    background: white;
    color: #374151;
    border: 1px solid #e5e7eb;

    &:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }
  `}

  &:active {
    transform: translateY(0);
  }
`;

export default CompletionCelebration;

