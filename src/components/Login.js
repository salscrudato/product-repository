import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';

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
const Error = styled.p`color:#dc2626;font-size:.8rem;margin-top:10px;min-height:1.2em;`;

/* ---------- component ---------- */
export default function Login() {
  const nav   = useNavigate();
  const [u,setU]=useState('Product');
  const [p,setP]=useState('Repository');
  const [err,setErr]=useState('');

  const handle = e=>{
    e.preventDefault();
    if(u==='Product' && p==='Repository'){
      sessionStorage.setItem('ph-authed', '1');   // valid only for this tab/session
      nav('/');                                // send to hub
    }else{
      setErr('Invalid credentials');
    }
  };

  return (
    <Page>
      <Card onSubmit={handle}>
        <Logo src="/logo.png" alt="Product Hub" />
        <Title>Sign in to Product&nbsp;Repo</Title>
        <Label>Username</Label>
        <Input value={u} onChange={e=>setU(e.target.value)} autoFocus/>
        <Label>Password</Label>
        <Input type="password" value={p} onChange={e=>setP(e.target.value)}/>
        <Button type="submit">Log&nbsp;In</Button>
        <Error>{err}</Error>
      </Card>
    </Page>
  );
}