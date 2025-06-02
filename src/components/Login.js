import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import {
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/solid';
import { auth } from '../firebase';
import {
  signInWithEmailAndPassword,
  signInAnonymously
} from 'firebase/auth';

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

/* ---------- main page container ---------- */
const Page = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 20px;
  position: relative;
`;

/* ---------- card container ---------- */
const Card = styled.form`
  width: 100%;
  max-width: 400px;
  padding: 32px;
  background: white;
  border-radius: 12px;
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.05),
    0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
  animation: ${fadeInUp} 0.6s ease-out;
  border: 1px solid rgba(226, 232, 240, 0.8);

  @media (max-width: 480px) {
    padding: 24px;
    margin: 20px;
  }
`;

/* ---------- logo ---------- */
const Logo = styled.img`
  width: 160px;
  margin: 0 auto 24px;
  display: block;
`;

/* ---------- title ---------- */
const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: #111827;
`;

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 24px;
  font-weight: 400;
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
  background: rgba(255, 255, 255, 0.9);
  padding: 0 8px;
  color: #6b7280;
  font-size: 1rem;
  font-weight: 500;
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
`;

/* ---------- modern input field ---------- */
const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  color: #111827;
  transition: all 0.2s ease;
  position: relative;

  &:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }

  &:focus + ${Label},
  &:not(:placeholder-shown) + ${Label} {
    top: 0;
    transform: translateY(-50%);
    font-size: 0.75rem;
    color: #4f46e5;
    font-weight: 500;
  }

  &:-webkit-autofill {
    box-shadow: 0 0 0 1000px white inset !important;
    -webkit-text-fill-color: #111827 !important;
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
  padding: 4px;
  cursor: pointer;
  color: #9ca3af;
  border-radius: 4px;
  transition: all 0.2s ease;
  z-index: 2;

  &:hover {
    color: #4f46e5;
    background: rgba(79, 70, 229, 0.05);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
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
  height: 44px;
  padding: 0 20px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  color: white;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

/* ---------- outline button ---------- */
const OutlineButton = styled(Button)`
  background: transparent;
  border: 1px solid #d1d5db;
  color: #374151;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
    color: #111827;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(156, 163, 175, 0.1);
    border-color: #6b7280;
  }
`;

/* ---------- error/success message ---------- */
const Message = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-top: 16px;
  min-height: 44px;
  animation: ${slideIn} 0.3s ease-out;

  ${props => props.type === 'error' && css`
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
    border: 1px solid rgba(239, 68, 68, 0.2);
  `}

  ${props => props.type === 'success' && css`
    background: rgba(34, 197, 94, 0.1);
    color: #059669;
    border: 1px solid rgba(34, 197, 94, 0.2);
  `}

  svg {
    margin-right: 8px;
    flex-shrink: 0;
  }
`;

/* ---------- divider ---------- */
const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 24px 0;
  color: #6b7280;
  font-size: 0.875rem;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e5e7eb;
  }

  &::before {
    margin-right: 16px;
  }

  &::after {
    margin-left: 16px;
  }
`;

/* ---------- helper function to map Firebase error codes to messages ---------- */
const prettyError = code => {
  switch (code) {
    case 'auth/user-not-found':    return 'No account matches that email.';
    case 'auth/wrong-password':    return 'Incorrect password.';
    case 'auth/weak-password':     return 'Choose a stronger password.';
    case 'auth/email-already-in-use': return 'Email is already registered.';
    default: return 'Something went wrong. Please try again.';
  }
};

/* ---------- component ---------- */
export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);


  const isLoginValid = email.trim() !== '' && password !== '';

  // Clear messages when user starts typing
  useEffect(() => {
    if (email || password) {
      setErr('');
      setSuccess('');
    }
  }, [email, password]);

  const handleSubmit = useCallback(async e => {
    e.preventDefault();
    setErr('');
    setSuccess('');
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setSuccess('Login successful! Redirecting...');

      // Small delay to show success message
      setTimeout(() => {
        nav('/');
      }, 1000);
    } catch (error) {
      setErr(prettyError(error.code));
    } finally {
      setIsLoading(false);
    }
  }, [email, password, nav]);

  const handleGuest = useCallback(async () => {
    setGuestLoading(true);
    setErr('');
    setSuccess('');

    try {
      await signInAnonymously(auth);
      setSuccess('Signed in as guest! Redirecting...');

      // Small delay to show success message
      setTimeout(() => {
        nav('/');
      }, 1000);
    } catch (e) {
      console.error('Guest sign‑in failed', e);
      setErr('Failed to sign in as guest. Please try again.');
    } finally {
      setGuestLoading(false);
    }
  }, [nav]);

  return (
    <Page>
      <Card onSubmit={handleSubmit} noValidate>
        <Logo src="/logo.svg" alt="Product Hub Logo" />
        <Title>Welcome Back</Title>
        <Subtitle>Sign in to your account to continue</Subtitle>

        <InputWrapper>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            autoFocus
            autoComplete="email"
            required
            aria-describedby={err ? "error-message" : undefined}
          />
          <Label htmlFor="email">Email Address</Label>
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

        <OutlineButton
          type="button"
          onClick={handleGuest}
          disabled={guestLoading || isLoading}
        >
          {guestLoading ? (
            <>
              <LoadingSpinner />
              Signing in as Guest...
            </>
          ) : (
            'Continue as Guest'
          )}
        </OutlineButton>

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