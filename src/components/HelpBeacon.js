import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { QuestionMarkCircleIcon, XMarkIcon } from '@heroicons/react/24/solid';

/* ---------- styled ---------- */
const pulse = keyframes`
  0%   { transform: scale(1);   opacity: 1; }
  70%  { transform: scale(1.3); opacity: 0; }
  100% { transform: scale(1);   opacity: 0; }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: transparent;      /* keep page visible */
  z-index: 1250;
  cursor: pointer;
`;

const Fab = styled.button`
  position: fixed;
  top: 16px;
  right: 72px;         /* left of the profile avatar */
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #4F46E5; /* indigo‑600 */
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  cursor: pointer;

  &::after {          /* subtle ping animation */
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: #6366F1;
    animation: ${pulse} 2.5s cubic-bezier(0.4,0,0.2,1) infinite;
  }

  svg { width: 20px; height: 20px; position: relative; z-index: 1; }
`;

const Panel = styled.aside`
  position: fixed;
  top: 0;
  right: ${({ open }) => (open ? 0 : '-320px')};
  width: 320px;
  height: 100%;
  background: #fff;
  box-shadow: -2px 0 8px rgba(0,0,0,0.1);
  transition: right .25s ease;
  z-index: 1300;
  display: flex;
  flex-direction: column;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  font-weight: 600;
  font-size: 18px;
  border-bottom: 1px solid #E5E7EB;
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  color: #6B7280;

  svg { width: 18px; height: 18px; }
`;

const SectionList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 12px 20px;
  flex: 1;
  overflow-y: auto;
`;

const SectionItem = styled.li`
  margin-bottom: 20px;
`;

const Headline = styled.h4`
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
`;

const Body = styled.p`
  margin: 0 0 8px;
  font-size: 13px;
  color: #374151;
  line-height: 1.35;
`;

const ActionBtn = styled.button`
  border: none;
  background: #EEF2FF;
  color: #4F46E5;
  padding: 6px 10px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
`;

export default function HelpBeacon({ sections = [] }) {
  const [open, setOpen] = useState(false);

  // Spotlight effect: briefly add .spotlight to target element
  const spotlight = selector => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.add('spotlight');
    setTimeout(() => el.classList.remove('spotlight'), 1600);
  };

  return (
    <>
      <Fab onClick={() => setOpen(true)} title="Quick help">
        <QuestionMarkCircleIcon />
      </Fab>

      {open && <Overlay onClick={() => setOpen(false)} />}

      <Panel open={open}>
        <PanelHeader>
          Quick Guide
          <CloseBtn onClick={() => setOpen(false)}>
            <XMarkIcon />
          </CloseBtn>
        </PanelHeader>

        <SectionList>
          {sections.map(sec => (
            <SectionItem key={sec.id}>
              <Headline>{sec.title}</Headline>
              <Body>{sec.body}</Body>
              {sec.selector && (
                <ActionBtn onClick={() => spotlight(sec.selector)}>
                  Show me
                </ActionBtn>
              )}
            </SectionItem>
          ))}
        </SectionList>
      </Panel>
    </>
  );
}

/* ---------- global spotlight style (injected once) ---------- */
const styleTagId = 'help-beacon-spotlight-style';
if (!document.getElementById(styleTagId)) {
  const s = document.createElement('style');
  s.id = styleTagId;
  s.innerHTML = `
    .spotlight {
      position: relative;
      z-index: 1500;
      box-shadow: 0 0 0 4px rgba(99,102,241,.6), 0 0 0 8px rgba(99,102,241,.3);
      transition: box-shadow .3s ease;
    }
  `;
  document.head.appendChild(s);
}