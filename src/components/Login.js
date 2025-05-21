import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';
import { auth } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';

/**
 * Login.js
 * 
 * This component handles user authentication including login and registration.
 * Built with React, styled-components, Firebase Authentication, and React Router.
 * It provides form inputs with validation, password visibility toggles, and guest access.
 * Includes loading states and error handling with user-friendly messages.
 */

/* ---------- animation for glow effect ---------- */
const glow = keyframes`
  0%,100%{opacity:.5} 50%{opacity:1}
`;
/* ---------- animation for spinner rotation ---------- */
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;
/* ---------- spinner component for loading indicator ---------- */
const Spinner = styled.div`
  width: 18px;
  height: 18px;
  border: 2px solid #ffffff55;
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  margin: 0 auto;
`;
/* ---------- main page container with background glow ---------- */
const Page = styled.div`
  min-height:100vh; display:flex; align-items:center; justify-content:center;
  background:#fdfdff;
  &:before{
    content:""; position:fixed; inset:-50%;
    background:radial-gradient(circle at 50% 30%,rgba(130,80,255,.25),transparent 70%);
    filter:blur(80px); animation:${glow} 10s linear infinite;
    z-index:-1;
  }
`;
/* ---------- card container for the login/register form ---------- */
const Card = styled.form`
  width:100%; max-width:340px; padding:40px 32px;
  background:#ffffffcc; backdrop-filter:blur(10px);
  border-radius:18px; text-align:center; box-shadow:0 24px 40px rgba(0,0,0,.06);
`;
/* ---------- logo image at the top of the form ---------- */
const Logo = styled.img`width:180px; margin:0 auto 28px;`;
/* ---------- form title ---------- */
const Title = styled.h1`font-size:1.25rem;font-weight:600;margin-bottom:24px;color:#111827`;
/* ---------- label for form inputs ---------- */
const Label = styled.label`
  display:block;text-align:left;font-size:.8rem;font-weight:500;color:#6b7280;margin:6px 0;
`;
/* ---------- styled input fields ---------- */
const Input = styled.input`
  width:100%;padding:12px 14px;border:1px solid #d1d5db;border-radius:10px;
  font-size:.95rem;margin-bottom:16px;
  &:focus{outline:none;border-color:#7c3aed;box-shadow:0 0 0 2px #a78bfa55;}
`;
/* ---------- primary button for login/register ---------- */
const Button = styled.button`
  width:100%;padding:12px 0;border:none;border-radius:10px;
  background:linear-gradient(90deg,#A100FF,#4400FF);color:#fff;font-weight:600;
  cursor:pointer;transition:.1s transform,.2s opacity;
  &:hover{opacity:.9;transform:translateY(-2px);}
`;
/* ---------- secondary button for toggling forms ---------- */
const Secondary = styled(Button)`
  background:transparent;
  border:1px solid #7c3aed;
  color:#7c3aed;
  margin-top:8px;
`;
/* ---------- ghost style button for guest access ---------- */
const Ghost = styled(Secondary)`
  border-color:#9ca3af;
  color:#6b7280;
`;
/* ---------- error message display ---------- */
const Error = styled.p`color:#dc2626;font-size:.8rem;margin-top:10px;min-height:1.2em;`;

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
  const [isRegister, setIsRegister] = useState(false);
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [err, setErr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

  const handleLogin = useCallback(async e => {
    e.preventDefault();
    setErr('');
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      sessionStorage.setItem('ph-authed','1');
      nav('/');
    } catch (error) {
      setErr('Login failed: ' + prettyError(error.code));
    } finally {
      setIsLoading(false);
    }
  }, [email, password, nav]);

  const handleRegister = useCallback(async e => {
    e.preventDefault();
    setErr('');
    if (secretKey !== 'acnproduct') {
      setErr('Invalid secret key');
      return;
    }
    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, regEmail.trim(), regPassword);
      sessionStorage.setItem('ph-authed','1');
      nav('/');
    } catch (error) {
      setErr('Registration failed: ' + prettyError(error.code));
    } finally {
      setIsLoading(false);
    }
  }, [regEmail, regPassword, secretKey, nav]);

  const continueAsGuest = useCallback(() => {
    setErr('');
    sessionStorage.setItem('ph-authed', 'guest');
    nav('/');
  }, [nav]);

  return (
    <Page>
      <Card onSubmit={isRegister ? handleRegister : handleLogin}>
        <Logo src="/logo.svg" alt="Cover Cloud" />
        <Title>{isRegister ? 'Register for Cover Cloud' : 'Sign in to Cover Cloud'}</Title>

        {isRegister ? (
          <>
            <Label htmlFor="regEmail">Email</Label>
            <Input
              id="regEmail"
              type="email"
              value={regEmail}
              onChange={e => setRegEmail(e.target.value)}
              autoFocus
              autoComplete="username"
            />
            <Label htmlFor="regPassword">Password</Label>
            <div style={{ position: 'relative' }}>
              <Input
                id="regPassword"
                type={showPwd ? 'text' : 'password'}
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd(p => !p)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
                style={{ position:'absolute', right:12, top: '50%', transform:'translateY(-50%)',
                         background:'none', border:'none', padding:0, cursor:'pointer' }}
              >
                {showPwd ? <EyeSlashIcon width={18} /> : <EyeIcon width={18} />}
              </button>
            </div>
            <Label htmlFor="secret">Secret Key</Label>
            <Input
              id="secret"
              type="password"
              value={secretKey}
              onChange={e => setSecretKey(e.target.value)}
            />
            <Button type="submit" disabled={isLoading || !regEmail || !regPassword || !secretKey}>{isLoading ? <Spinner /> : 'Register'}</Button>
          </>
        ) : (
          <>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              autoComplete="username"
            />
            <Label htmlFor="password">Password</Label>
            <div style={{ position: 'relative' }}>
              <Input
                id="password"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd(p => !p)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
                style={{ position:'absolute', right:12, top: '50%', transform:'translateY(-50%)',
                         background:'none', border:'none', padding:0, cursor:'pointer' }}
              >
                {showPwd ? <EyeSlashIcon width={18} /> : <EyeIcon width={18} />}
              </button>
            </div>
            <Button type="submit" disabled={isLoading || !email || !password}>{isLoading ? <Spinner /> : 'Log In'}</Button>
            <Ghost
              type="button"
              style={{ marginTop: 12 }}
              onClick={continueAsGuest}
            >
              Continue as Guest
            </Ghost>
          </>
        )}

        <Error>{err}</Error>

        <Secondary
          type="button"
          onClick={() => {
            setErr('');
            setIsRegister(prev => !prev);
          }}
        >
          {isRegister ? 'Back to Login' : 'Create New Account'}
        </Secondary>
      </Card>
    </Page>
  );
}
// Component optimized for re-render performance and accessibility.