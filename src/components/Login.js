import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import {
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/solid';
import logger, { LOG_CATEGORIES } from '../utils/logger';

/* ---------- animations ---------- */
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

const slideIn = keyframes`
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const moveThrough = keyframes`
  0% {
    transform: translate3d(-100vw, 0, 0) scale(0.1);
    opacity: 0;
  }
  50% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate3d(100vw, 0, 0) scale(0.1);
    opacity: 0;
  }
`;





/* ---------- main page container ---------- */
const Page = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, #1e1b4b 0%, #0f0f23 50%, #000000 100%);
  padding: 20px;
  position: relative;
  overflow: hidden;
  perspective: 1000px;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background:
      radial-gradient(circle at 20% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, rgba(168, 85, 247, 0.05) 0%, transparent 50%);
    pointer-events: none;
  }
`;

/* ---------- animated space circles ---------- */
// eslint-disable-next-line no-unused-vars
const SpaceCircle = styled.div.withConfig({
  shouldForwardProp: (prop) => !['duration', 'delay', 'blur', 'color'].includes(prop),
})`
  position: absolute;
  border-radius: 50%;
  background: ${props => props.color || 'rgba(139, 92, 246, 0.6)'};
  animation: ${moveThrough} ${props => props.duration || '8s'} linear infinite;
  animation-delay: ${props => props.delay || '0s'};
  filter: blur(${props => props.blur || '0px'});
  will-change: transform, opacity;
  backface-visibility: hidden;
  transform-style: preserve-3d;

  &:nth-child(odd) {
    animation-direction: reverse;
  }
`;

// eslint-disable-next-line no-unused-vars


/* ---------- card container ---------- */
const Card = styled.form`
  width: 100%;
  max-width: 420px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.05),
    0 0 30px rgba(139, 92, 246, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  text-align: center;
  animation: ${fadeInUp} 0.8s ease-out;
  position: relative;
  z-index: 10;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg,
      rgba(139, 92, 246, 0.1) 0%,
      rgba(59, 130, 246, 0.05) 50%,
      rgba(168, 85, 247, 0.1) 100%
    );
    border-radius: 24px;
    z-index: -1;
  }

  @media (max-width: 480px) {
    padding: 32px 24px;
    margin: 20px;
    max-width: 360px;
  }
`;

/* ---------- title ---------- */
const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 12px;
  color: #ffffff;
  text-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
  background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #c7d2fe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
`;

const Subtitle = styled.p`
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 32px;
  font-weight: 400;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
`;

/* ---------- input wrapper ---------- */
const InputWrapper = styled.div`
  position: relative;
  margin-bottom: 24px;
  text-align: left;
`;

/* ---------- floating label ---------- */
const Label = styled.label`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  padding: 0 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1rem;
  font-weight: 500;
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
  border-radius: 4px;
`;

/* ---------- modern input field ---------- */
const Input = styled.input`
  width: 100%;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  font-size: 0.95rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  color: #ffffff;
  transition: all 0.3s ease;
  position: relative;

  &:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.5);
    box-shadow:
      0 0 0 3px rgba(139, 92, 246, 0.1),
      0 0 20px rgba(139, 92, 246, 0.2);
    background: rgba(255, 255, 255, 0.08);
  }

  &:focus + ${Label},
  &:not(:placeholder-shown) + ${Label} {
    top: 0;
    transform: translateY(-50%);
    font-size: 0.75rem;
    color: rgba(139, 92, 246, 0.9);
    font-weight: 600;
    background: rgba(139, 92, 246, 0.1);
  }

  &:-webkit-autofill {
    box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.05) inset !important;
    -webkit-text-fill-color: #ffffff !important;
  }

  &::placeholder {
    color: transparent;
  }
`;

/* ---------- password container ---------- */
const PasswordContainer = styled.div`
  position: relative;
`;

/* ---------- eye toggle button ---------- */
const EyeButton = styled.button`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  transition: all 0.3s ease;
  z-index: 2;

  &:hover {
    color: rgba(139, 92, 246, 0.9);
    background: rgba(139, 92, 246, 0.1);
    transform: translateY(-50%) scale(1.1);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3);
  }
`;

/* ---------- loading spinner ---------- */
const LoadingSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: ${pulse} 1s linear infinite;
  margin-right: 8px;
`;

/* ---------- primary button ---------- */
const Button = styled.button`
  width: 100%;
  height: 50px;
  padding: 0 24px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg,
    rgba(139, 92, 246, 0.8) 0%,
    rgba(59, 130, 246, 0.8) 50%,
    rgba(168, 85, 247, 0.8) 100%
  );
  backdrop-filter: blur(10px);
  color: white;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 4px 20px rgba(139, 92, 246, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: left 0.5s ease;
  }

  &:hover:not(:disabled) {
    background: linear-gradient(135deg,
      rgba(139, 92, 246, 1) 0%,
      rgba(59, 130, 246, 1) 50%,
      rgba(168, 85, 247, 1) 100%
    );
    box-shadow:
      0 8px 32px rgba(139, 92, 246, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);

    &::before {
      left: 100%;
    }
  }

  &:active:not(:disabled) {
    transform: translateY(0px);
    box-shadow:
      0 4px 16px rgba(139, 92, 246, 0.3),
      0 0 0 1px rgba(255, 255, 255, 0.1);
  }

  &:focus {
    outline: none;
    box-shadow:
      0 4px 20px rgba(139, 92, 246, 0.3),
      0 0 0 3px rgba(139, 92, 246, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;

    &::before {
      display: none;
    }
  }
`;

/* ---------- guest button ---------- */
const GuestButton = styled.button`
  width: 100%;
  height: 50px;
  padding: 0 24px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
    transition: left 0.5s ease;
  }

  &:hover:not(:disabled) {
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 1);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(255, 255, 255, 0.1);

    &::before {
      left: 100%;
    }
  }

  &:active:not(:disabled) {
    transform: translateY(0px);
    box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;

    &::before {
      display: none;
    }
  }
`;

/* ---------- divider ---------- */
const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 20px 0 16px 0;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
  font-weight: 500;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
  }

  &::before {
    margin-right: 16px;
  }

  &::after {
    margin-left: 16px;
  }
`;



/* ---------- error/success message ---------- */
const Message = styled.div`
  display: flex;
  align-items: center;
  padding: 14px 18px;
  border-radius: 16px;
  font-size: 0.9rem;
  font-weight: 500;
  margin-top: 20px;
  min-height: 48px;
  animation: ${slideIn} 0.4s ease-out;
  backdrop-filter: blur(10px);

  ${props => props.type === 'error' && css`
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.3);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
  `}

  ${props => props.type === 'success' && css`
    background: rgba(34, 197, 94, 0.15);
    color: #86efac;
    border: 1px solid rgba(34, 197, 94, 0.3);
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.1);
  `}

  svg {
    margin-right: 10px;
    flex-shrink: 0;
  }
`;



/* ---------- helper function to map Firebase error codes to messages ---------- */
const prettyError = code => {
  switch (code) {
    case 'auth/user-not-found':    return 'No account matches that username.';
    case 'auth/wrong-password':    return 'Incorrect password.';
    case 'auth/weak-password':     return 'Choose a stronger password.';
    case 'auth/email-already-in-use': return 'Username is already registered.';
    case 'auth/invalid-credentials': return 'Invalid username or password.';
    default: return 'Something went wrong. Please try again.';
  }
};

/* ---------- component ---------- */
export default function Login() {
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);


  const isLoginValid = username.trim() !== '' && password !== '';

  // Clear messages when user starts typing
  useEffect(() => {
    if (username || password) {
      setErr('');
      setSuccess('');
    }
  }, [username, password]);

  const handleSubmit = useCallback(async e => {
    e.preventDefault();
    const startTime = Date.now();

    logger.logUserAction('Login attempt started', {
      username: username.trim(),
      hasPassword: !!password,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });

    setErr('');
    setSuccess('');
    setIsLoading(true);

    try {
      // Check for admin credentials
      if (username.trim() === 'admin' && password === 'admin') {
        logger.info(LOG_CATEGORIES.AUTH, 'Admin login attempt', {
          username: 'admin',
          loginType: 'admin'
        });

        // Admin login - bypass Firebase and set session directly
        sessionStorage.setItem('ph-authed', 'admin');
        sessionStorage.setItem('ph-username', 'admin');
        logger.setUserId('admin');

        setSuccess('Admin login successful! Redirecting...');

        const duration = Date.now() - startTime;
        logger.logPerformance('Admin login', duration, {
          success: true,
          loginType: 'admin'
        });

        // Small delay to show success message
        setTimeout(() => {
          logger.logNavigation('/login', '/', { reason: 'successful_admin_login' });
          nav('/');
        }, 1000);
      } else {
        logger.warn(LOG_CATEGORIES.AUTH, 'Invalid login attempt', {
          username: username.trim(),
          reason: 'non_admin_credentials'
        });

        // For other users, we'll need to handle differently since Firebase expects email
        // For now, we'll show an error for non-admin users
        setErr('Only admin login is currently supported. Use username: admin, password: admin');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(LOG_CATEGORIES.AUTH, 'Login failed', {
        username: username.trim(),
        duration,
        errorCode: error.code
      }, error);

      setErr(prettyError(error.code));
    } finally {
      setIsLoading(false);
    }
  }, [username, password, nav]);

  const handleGuestLogin = useCallback(async () => {
    const startTime = Date.now();

    logger.logUserAction('Guest login attempt started', {
      loginType: 'guest',
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });

    setErr('');
    setSuccess('');
    setIsLoading(true);

    try {
      logger.info(LOG_CATEGORIES.AUTH, 'Guest login attempt', {
        loginType: 'guest'
      });

      // Guest login - set session directly
      sessionStorage.setItem('ph-authed', 'guest');
      sessionStorage.setItem('ph-username', 'guest');
      logger.setUserId('guest');

      setSuccess('Guest login successful! Redirecting...');

      const duration = Date.now() - startTime;
      logger.logPerformance('Guest login', duration, {
        success: true,
        loginType: 'guest'
      });

      // Small delay to show success message
      setTimeout(() => {
        logger.logNavigation('/login', '/', { reason: 'successful_guest_login' });
        nav('/');
      }, 1000);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(LOG_CATEGORIES.AUTH, 'Guest login failed', {
        duration,
        loginType: 'guest'
      }, error);

      setErr('An error occurred during guest login');
    } finally {
      setIsLoading(false);
    }
  }, [nav]);

  return (
    <Page>
      {/* Animated space elements */}
      <SpaceCircle
        style={{
          width: '100px',
          height: '100px',
          top: '10%',
          left: '10%'
        }}
        color="rgba(139, 92, 246, 0.4)"
        duration="12s"
        delay="0s"
        blur="2px"
      />
      <SpaceCircle
        style={{
          width: '60px',
          height: '60px',
          top: '70%',
          right: '15%'
        }}
        color="rgba(59, 130, 246, 0.5)"
        duration="10s"
        delay="2s"
        blur="1px"
      />
      <SpaceCircle
        style={{
          width: '80px',
          height: '80px',
          top: '30%',
          right: '20%'
        }}
        color="rgba(168, 85, 247, 0.3)"
        duration="15s"
        delay="4s"
        blur="3px"
      />

      <Card onSubmit={handleSubmit} noValidate>
        <Title>Welcome Back</Title>
        <Subtitle>Sign in to your account to continue</Subtitle>

        <InputWrapper>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username"
            autoFocus
            autoComplete="username"
            required
            aria-describedby={err ? "error-message" : undefined}
          />
          <Label htmlFor="username">Username</Label>
        </InputWrapper>

        <InputWrapper as={PasswordContainer}>
          <Input
            id="password"
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
            aria-describedby={err ? "error-message" : undefined}
          />
          <Label htmlFor="password">Password</Label>
          <EyeButton
            type="button"
            onClick={() => setShowPwd(p => !p)}
            aria-label={showPwd ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPwd ? <EyeSlashIcon width={20} /> : <EyeIcon width={20} />}
          </EyeButton>
        </InputWrapper>

        <Button
          type="submit"
          disabled={isLoading || !isLoginValid}
          style={{ marginTop: '8px' }}
        >
          {isLoading ? (
            <>
              <LoadingSpinner />
              Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </Button>

        <Divider>or</Divider>

        <GuestButton
          type="button"
          onClick={handleGuestLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <LoadingSpinner />
              Continuing as Guest...
            </>
          ) : (
            'Continue as Guest'
          )}
        </GuestButton>

        {err && (
          <Message type="error" id="error-message" role="alert">
            <ExclamationCircleIcon width={20} />
            {err}
          </Message>
        )}

        {success && (
          <Message type="success" role="status">
            <CheckCircleIcon width={20} />
            {success}
          </Message>
        )}
      </Card>
    </Page>
  );
}