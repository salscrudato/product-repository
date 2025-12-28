// src/components/Login.tsx
// Modern, clean, AI-inspired login page with subtle animations
import { useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { CheckCircleIcon, ExclamationCircleIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { getAuth, signInAnonymously } from 'firebase/auth';
import logger, { LOG_CATEGORIES } from '@utils/logger';

/* ============================== Animations =============================== */
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.02); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(100vh); opacity: 0; }
  10% { opacity: 0.6; }
  90% { opacity: 0.6; }
  100% { transform: translateY(-20px); opacity: 0; }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 30px rgba(99, 102, 241, 0.15), 0 0 60px rgba(99, 102, 241, 0.05); }
  50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.25), 0 0 80px rgba(99, 102, 241, 0.1); }
`;

const gridPulse = keyframes`
  0%, 100% { opacity: 0.02; }
  50% { opacity: 0.05; }
`;

const orbFloat = keyframes`
  0%, 100% { transform: translate(0, 0); }
  33% { transform: translate(20px, -15px); }
  66% { transform: translate(-15px, 10px); }
`;

/* ============================== Layout =============================== */
const Page = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background: #030712;

  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.01ms !important; }
  }
`;

/* Subtle grid background */
const GridBackground = styled.div`
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
  background-size: 80px 80px;
  animation: ${gridPulse} 8s ease-in-out infinite;
  pointer-events: none;
`;

/* Gradient orbs */
const GradientOrb = styled.div<{ $variant: 1 | 2 | 3 }>`
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
  
  ${({ $variant }) => $variant === 1 && css`
    width: 600px;
    height: 600px;
    top: -200px;
    right: -150px;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%);
    animation: ${orbFloat} 20s ease-in-out infinite;
  `}
  
  ${({ $variant }) => $variant === 2 && css`
    width: 500px;
    height: 500px;
    bottom: -150px;
    left: -100px;
    background: radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%);
    animation: ${orbFloat} 25s ease-in-out infinite reverse;
  `}
  
  ${({ $variant }) => $variant === 3 && css`
    width: 400px;
    height: 400px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, rgba(14, 165, 233, 0.1) 0%, transparent 70%);
    animation: ${pulse} 6s ease-in-out infinite;
  `}
`;

/* Floating particles */
const ParticleContainer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
`;

const Particle = styled.div<{ $delay: number; $x: number; $duration: number }>`
  position: absolute;
  width: 3px;
  height: 3px;
  background: rgba(99, 102, 241, 0.5);
  border-radius: 50%;
  left: ${({ $x }) => $x}%;
  bottom: -10px;
  animation: ${float} ${({ $duration }) => $duration}s linear infinite;
  animation-delay: ${({ $delay }) => $delay}s;
`;

/* Card */
const Card = styled.div`
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 420px;
  padding: 56px 48px;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 32px;
  animation: ${fadeInUp} 0.8s ease-out, ${glow} 6s ease-in-out infinite;
  animation-delay: 0s, 0.8s;

  &::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 33px;
    padding: 1px;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.4), transparent 40%, transparent 60%, rgba(168, 85, 247, 0.4));
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
    pointer-events: none;
  }
`;

/* Logo */
const LogoContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
`;

const Logo = styled.div`
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%);
  border-radius: 20px;
  border: 1px solid rgba(99, 102, 241, 0.3);

  svg {
    width: 36px;
    height: 36px;
    color: #a5b4fc;
  }
`;

/* Typography */
const Title = styled.h1`
  font-size: 32px;
  font-weight: 600;
  color: #f8fafc;
  text-align: center;
  margin: 0 0 8px 0;
  letter-spacing: -0.02em;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #94a3b8;
  text-align: center;
  margin: 0 0 40px 0;
`;

/* Button */
const Button = styled.button`
  width: 100%;
  padding: 16px 24px;
  font-size: 16px;
  font-weight: 500;
  color: #fff;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  border-radius: 14px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(99, 102, 241, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    background-size: 200% 100%;
    animation: ${shimmer} 2s linear infinite;
    opacity: 0;
    transition: opacity 0.3s;
  }

  &:hover::before {
    opacity: 1;
  }
`;

/* Loading spinner */
const LoadingSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

/* Messages */
const Message = styled.div<{ $type: 'error' | 'success' }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  margin-top: 20px;
  border-radius: 12px;
  font-size: 14px;
  animation: ${fadeInUp} 0.3s ease-out;

  ${({ $type }) => $type === 'error' && css`
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: #fca5a5;

    svg { color: #ef4444; }
  `}

  ${({ $type }) => $type === 'success' && css`
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.2);
    color: #86efac;

    svg { color: #22c55e; }
  `}
`;

/* Version badge */
const VersionBadge = styled.div`
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: #475569;
  letter-spacing: 0.05em;
`;

/* ============================== Component =============================== */
const Login: React.FC = () => {
  const nav = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get redirect path from location state
  const redirectTo = (location.state as { from?: string })?.from || '/';

  // Generate particles once
  const particles = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 15 + Math.random() * 10,
    }))
  ).current;

  const handleLaunch = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    const startTime = Date.now();

    logger.info(LOG_CATEGORIES.AUTH, 'Guest login initiated');

    try {
      const auth = getAuth();
      await signInAnonymously(auth);

      const duration = Date.now() - startTime;
      logger.info(LOG_CATEGORIES.AUTH, 'Guest login successful', { duration });

      setSuccess('Welcome! Launching platform...');

      setTimeout(() => {
        logger.logNavigation('/login', redirectTo, { reason: 'guest_login' });
        nav(redirectTo, { replace: true });
      }, 600);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.error(LOG_CATEGORIES.AUTH, 'Guest login failed', { duration }, err as Error);
      setError('Unable to start session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [nav, redirectTo, isLoading]);

  return (
    <Page>
      {/* Background elements */}
      <GridBackground aria-hidden="true" />
      <GradientOrb $variant={1} aria-hidden="true" />
      <GradientOrb $variant={2} aria-hidden="true" />
      <GradientOrb $variant={3} aria-hidden="true" />

      {/* Floating particles */}
      <ParticleContainer aria-hidden="true">
        {particles.map((p) => (
          <Particle key={p.id} $x={p.x} $delay={p.delay} $duration={p.duration} />
        ))}
      </ParticleContainer>

      {/* Main card */}
      <Card role="main" aria-labelledby="login-title">
        <LogoContainer>
          <Logo>
            <SparklesIcon />
          </Logo>
        </LogoContainer>

        <Title id="login-title">Welcome</Title>
        <Subtitle>AI-Powered Insurance Platform</Subtitle>

        <Button
          type="button"
          onClick={handleLaunch}
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <LoadingSpinner aria-hidden="true" />
              Initializing...
            </>
          ) : (
            'Launch Platform'
          )}
        </Button>

        {error && (
          <Message $type="error" role="alert">
            <ExclamationCircleIcon width={18} />
            {error}
          </Message>
        )}

        {success && (
          <Message $type="success" role="status">
            <CheckCircleIcon width={18} />
            {success}
          </Message>
        )}

        <VersionBadge>Platform v2.0</VersionBadge>
      </Card>
    </Page>
  );
};

export default Login;
