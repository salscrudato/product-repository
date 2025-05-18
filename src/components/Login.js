import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

/* ---------- styled ---------- */
const glow = keyframes`
  0%,100%{opacity:.5} 50%{opacity:1}
`;
const Page = styled.div`
  min-height:100vh; display:flex; align-items:center; justify-content:center;
  background:#fdfdff;
  &:before{
    content:""; position:fixed; inset:-50%;
    background:radial-gradient(circle at 50% 30%,rgba(130,80,255,.25),transparent 70%);
    filter:blur(120px); animation:${glow} 10s linear infinite;
    z-index:-1;
  }
`;
const Card = styled.form`
  width:100%; max-width:340px; padding:40px 32px;
  background:#ffffffcc; backdrop-filter:blur(10px);
  border-radius:18px; text-align:center; box-shadow:0 24px 40px rgba(0,0,0,.06);
`;
const Logo = styled.img`width:180px; margin:0 auto 28px;`;
const Title = styled.h1`font-size:1.25rem;font-weight:600;margin-bottom:24px;color:#111827`;
const Label = styled.label`
  display:block;text-align:left;font-size:.8rem;font-weight:500;color:#6b7280;margin:6px 0;
`;
const Input = styled.input`
  width:100%;padding:12px 14px;border:1px solid #d1d5db;border-radius:10px;
  font-size:.95rem;margin-bottom:16px;
  &:focus{outline:none;border-color:#7c3aed;box-shadow:0 0 0 2px #a78bfa55;}
`;
const Button = styled.button`
  width:100%;padding:12px 0;border:none;border-radius:10px;
  background:linear-gradient(90deg,#A100FF,#4400FF);color:#fff;font-weight:600;
  cursor:pointer;transition:.1s transform,.2s opacity;
  &:hover{opacity:.9;transform:translateY(-2px);}
`;
const Secondary = styled(Button)`
  background:transparent;
  border:1px solid #7c3aed;
  color:#7c3aed;
  margin-top:8px;
`;
const Error = styled.p`color:#dc2626;font-size:.8rem;margin-top:10px;min-height:1.2em;`;

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

  const handleLogin = async e => {
    e.preventDefault();
    setErr('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      sessionStorage.setItem('ph-authed','1');
      nav('/');
    } catch (error) {
      setErr('Login failed: ' + error.message);
    }
  };

  const handleRegister = async e => {
    e.preventDefault();
    setErr('');
    if (secretKey !== 'acnproduct') {
      setErr('Invalid secret key');
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, regEmail.trim(), regPassword);
      sessionStorage.setItem('ph-authed','1');
      nav('/');
    } catch (error) {
      setErr('Registration failed: ' + error.message);
    }
  };

  return (
    <Page>
      <Card onSubmit={isRegister ? handleRegister : handleLogin}>
        <Logo src="/logo.svg" alt="Cover Cloud" />
        <Title>
          {isRegister ? 'Register for Cover Cloud' : 'Sign in to Cover Cloud'}
        </Title>

        {isRegister ? (
          <>
            <Label>Email</Label>
            <Input
              type="email"
              value={regEmail}
              onChange={e => setRegEmail(e.target.value)}
              autoFocus
            />
            <Label>Password</Label>
            <Input
              type="password"
              value={regPassword}
              onChange={e => setRegPassword(e.target.value)}
            />
            <Label>Secret Key</Label>
            <Input
              type="password"
              value={secretKey}
              onChange={e => setSecretKey(e.target.value)}
            />
            <Button type="submit">Register</Button>
          </>
        ) : (
          <>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
            />
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <Button type="submit">Log In</Button>
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