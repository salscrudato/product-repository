// src/components/Login.tsx
import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { ExclamationCircleIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import logger, { LOG_CATEGORIES } from '@utils/logger';
import {
  color, neutral, accent, semantic, space, radius,
  fontFamily, type as typeScale, transition, duration, easing,
  shadow, focusRingStyle, reducedMotion,
} from '../ui/tokens';

/* ── Animations ── */
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

/* ── Layout ── */
const Page = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${space[6]};
  background: ${neutral[0]};
`;

const Card = styled.div`
  width: 100%;
  max-width: 380px;
  animation: ${fadeIn} ${duration.slow} ${easing.out};
  @media ${reducedMotion} { animation: none; }
`;

/* ── Logo ── */
const LogoMark = styled.div`
  width: 44px;
  height: 44px;
  border-radius: ${radius.lg};
  background: ${accent[600]};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto ${space[6]};
  color: ${neutral[0]};
  font-weight: 700;
  font-size: 20px;
  letter-spacing: -0.04em;
`;

/* ── Typography ── */
const Title = styled.h1`
  font-size: ${typeScale.displaySm.size};
  font-weight: ${typeScale.displaySm.weight};
  letter-spacing: ${typeScale.displaySm.letterSpacing};
  color: ${color.text};
  text-align: center;
  margin: 0 0 ${space[1]};
`;

const Subtitle = styled.p`
  font-size: ${typeScale.bodySm.size};
  color: ${neutral[500]};
  text-align: center;
  margin: 0 0 ${space[8]};
`;

/* ── Form ── */
const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${space[4]};
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space[1.5]};
`;

const Label = styled.label`
  font-size: ${typeScale.label.size};
  font-weight: ${typeScale.label.weight};
  color: ${color.text};
`;

const InputWrapper = styled.div`
  position: relative;
`;

const Input = styled.input`
  width: 100%;
  padding: ${space[2.5]} ${space[3]};
  font-size: ${typeScale.bodySm.size};
  font-family: ${fontFamily.sans};
  color: ${color.text};
  background: ${neutral[0]};
  border: 1px solid ${neutral[200]};
  border-radius: ${radius.md};
  outline: none;
  transition: border-color ${transition.fast}, box-shadow ${transition.fast};

  &::placeholder { color: ${neutral[400]}; }

  &:focus {
    border-color: ${accent[500]};
    box-shadow: 0 0 0 3px ${accent[500]}1a;
  }

  &:disabled { background: ${neutral[50]}; opacity: 0.6; cursor: not-allowed; }
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: ${space[3]};
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: ${neutral[400]};
  cursor: pointer;
  padding: ${space[0.5]};
  display: flex;
  &:hover { color: ${neutral[600]}; }
  svg { width: 16px; height: 16px; }
`;

/* ── Button ── */
const SubmitButton = styled.button`
  width: 100%;
  padding: ${space[2.5]} ${space[4]};
  margin-top: ${space[2]};
  font-size: ${typeScale.bodySm.size};
  font-weight: 500;
  font-family: ${fontFamily.sans};
  color: ${neutral[0]};
  background: ${accent[600]};
  border: none;
  border-radius: ${radius.md};
  cursor: pointer;
  transition: background ${transition.fast};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${space[2]};

  &:hover:not(:disabled) { background: ${accent[700]}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:focus-visible { ${focusRingStyle} }
`;

const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: ${neutral[0]};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;

/* ── Toggle / Messages ── */
const ModeToggle = styled.button`
  display: block;
  width: 100%;
  background: none;
  border: none;
  color: ${accent[600]};
  font-size: ${typeScale.bodySm.size};
  font-family: ${fontFamily.sans};
  cursor: pointer;
  padding: ${space[4]} 0 0;
  text-align: center;
  transition: color ${transition.fast};
  &:hover { color: ${accent[700]}; }
`;

const Message = styled.div<{ $type: 'error' | 'success' }>`
  display: flex;
  align-items: center;
  gap: ${space[2]};
  padding: ${space[3]} ${space[4]};
  margin-top: ${space[4]};
  border-radius: ${radius.md};
  font-size: ${typeScale.bodySm.size};
  animation: ${fadeIn} ${duration.normal} ${easing.out};
  background: ${({ $type }) => $type === 'error' ? semantic.errorLight : semantic.successLight};
  color: ${({ $type }) => $type === 'error' ? semantic.errorDark : semantic.successDark};
  border: 1px solid ${({ $type }) => $type === 'error' ? `${semantic.error}33` : `${semantic.success}33`};

  svg { width: 16px; height: 16px; flex-shrink: 0; }

  @media ${reducedMotion} { animation: none; }
`;

/* ── Component ── */
const Login: React.FC = () => {
  const nav = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const redirectTo = (location.state as { from?: string })?.from || '/';

  const getFirebaseErrorMessage = (code: string): string => {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      default:
        return 'An error occurred. Please try again.';
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !email || !password) return;

    setIsLoading(true);
    setError(null);
    const startTime = Date.now();

    logger.info(LOG_CATEGORIES.AUTH, `${mode === 'login' ? 'Login' : 'Signup'} initiated`, { email });

    try {
      const auth = getAuth();
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        logger.info(LOG_CATEGORIES.AUTH, 'Account created successfully', { duration: Date.now() - startTime });
        setSuccess('Account created successfully.');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        logger.info(LOG_CATEGORIES.AUTH, 'Login successful', { duration: Date.now() - startTime });
        setSuccess('Welcome back.');
      }
      // Wait for auth to fully propagate to Firestore before navigating
      // This matches the 600ms + 300ms delay in useRole.ts
      setTimeout(() => {
        logger.logNavigation('/login', redirectTo, { reason: mode });
        nav(redirectTo, { replace: true });
      }, 1000);
    } catch (err) {
      const firebaseError = err as { code?: string };
      logger.error(LOG_CATEGORIES.AUTH, `${mode} failed`, { duration: Date.now() - startTime, code: firebaseError.code }, err as Error);
      setError(getFirebaseErrorMessage(firebaseError.code || ''));
      setIsLoading(false);
    }
  }, [nav, redirectTo, isLoading, email, password, mode]);

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
    setSuccess(null);
  };

  return (
    <Page>
      <Card role="main" aria-labelledby="login-title">
        <LogoMark aria-hidden="true">P</LogoMark>

        <Title id="login-title">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </Title>
        <Subtitle>Product Reinvention Hub</Subtitle>

        <Form onSubmit={handleSubmit}>
          <FieldGroup>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              autoComplete="email"
            />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="password">Password</Label>
            <InputWrapper>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                style={{ paddingRight: '40px' }}
              />
              <PasswordToggle
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </PasswordToggle>
            </InputWrapper>
          </FieldGroup>

          <SubmitButton
            type="submit"
            disabled={isLoading || !email || !password}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner aria-hidden="true" />
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              mode === 'login' ? 'Sign in' : 'Create account'
            )}
          </SubmitButton>
        </Form>

        <ModeToggle type="button" onClick={toggleMode}>
          {mode === 'login'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Sign in'}
        </ModeToggle>

        {error && (
          <Message $type="error" role="alert">
            <ExclamationCircleIcon />
            {error}
          </Message>
        )}

        {success && (
          <Message $type="success" role="status">
            <CheckCircleIcon />
            {success}
          </Message>
        )}
      </Card>
    </Page>
  );
};

export default Login;
