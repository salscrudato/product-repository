import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { UserIcon, Cog6ToothIcon, ArrowLeftOnRectangleIcon, Bars3Icon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import logger, { LOG_CATEGORIES } from '../../utils/logger';
import { Tooltip } from './Tooltip';

/* ---------- animations ---------- */
const slideDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

const gradientFlow = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

/* ---------- styled components ---------- */
const NavigationWrapper = styled.div<{ $scrolled?: boolean }>`
  position: sticky;
  top: 0;
  z-index: 100;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.95));
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  ${props => props.$scrolled && css`
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.04),
      0 4px 24px rgba(0, 0, 0, 0.06);
    background: rgba(255, 255, 255, 0.92);
  `}

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(99, 102, 241, 0.15) 20%,
      rgba(139, 92, 246, 0.2) 50%,
      rgba(99, 102, 241, 0.15) 80%,
      transparent 100%
    );
    opacity: ${props => props.$scrolled ? 1 : 0.5};
    transition: opacity 0.3s ease;
  }
`;

const Navigation = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 40px;
  position: relative;
  z-index: 10;
  max-width: 1600px;
  margin: 0 auto;
  gap: 32px;

  @media (max-width: 1200px) {
    padding: 8px 24px;
    gap: 20px;
  }

  @media (max-width: 768px) {
    padding: 8px 16px;
  }
`;

/* ---------- Logo & Brand ---------- */
const LogoSection = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  padding: 6px 8px;
  margin: -6px -8px;
  border-radius: 12px;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: rgba(99, 102, 241, 0.04);
  }

  &:active {
    transform: scale(0.98);
  }
`;

const LogoIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
  background-size: 200% 200%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow:
    0 2px 8px rgba(99, 102, 241, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;

  ${LogoSection}:hover & {
    animation: ${gradientFlow} 3s ease infinite;
    box-shadow:
      0 4px 16px rgba(99, 102, 241, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
  }

  svg {
    width: 20px;
    height: 20px;
  }

  @media (max-width: 768px) {
    width: 32px;
    height: 32px;

    svg {
      width: 18px;
      height: 18px;
    }
  }
`;

const LogoText = styled.div`
  display: flex;
  flex-direction: column;
  line-height: 1.1;

  @media (max-width: 640px) {
    display: none;
  }
`;

const LogoBrand = styled.span`
  font-weight: 600;
  font-size: 15px;
  background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.015em;
  white-space: nowrap;

  @media (max-width: 900px) {
    font-size: 14px;
  }
`;

const LogoTagline = styled.span`
  font-size: 9px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-top: 1px;
`;

/* ---------- Nav List ---------- */
const NavList = styled.ul`
  display: flex;
  list-style: none;
  margin: 0;
  padding: 5px 6px;
  gap: 2px;
  background: rgba(241, 245, 249, 0.7);
  border-radius: 14px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  flex: 1;
  justify-content: center;
  max-width: 800px;

  @media (max-width: 1200px) {
    max-width: 680px;
  }

  @media (max-width: 1024px) {
    gap: 0;
    padding: 4px;
    max-width: 580px;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const NavItem = styled.li``;

/* ---------- Mobile Menu Components ---------- */
const MobileMenuButton = styled.button`
  display: none;
  background: rgba(241, 245, 249, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.6);
  padding: 8px;
  cursor: pointer;
  color: #64748b;
  border-radius: 10px;
  transition: all 0.2s ease;

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    border-color: rgba(99, 102, 241, 0.2);
    color: #6366f1;
    transform: scale(1.02);
  }

  &:active {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  }

  svg {
    width: 22px;
    height: 22px;
  }
`;

const MobileMenuOverlay = styled.div<{ $isOpen: boolean }>`
  display: none;

  @media (max-width: 768px) {
    display: ${({ $isOpen }) => $isOpen ? 'block' : 'none'};
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.5);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 998;
    animation: ${fadeIn} 0.25s ease-out;
  }
`;

const MobileMenu = styled.div<{ $isOpen: boolean }>`
  display: none;

  @media (max-width: 768px) {
    display: ${({ $isOpen }) => $isOpen ? 'flex' : 'none'};
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 300px;
    max-width: 85vw;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    flex-direction: column;
    z-index: 999;
    animation: ${slideIn} 0.35s cubic-bezier(0.22, 1, 0.36, 1);
    box-shadow:
      -16px 0 48px rgba(0, 0, 0, 0.12),
      -4px 0 16px rgba(0, 0, 0, 0.06);
    overflow-y: auto;
  }
`;

const MobileMenuHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  background: linear-gradient(to bottom, white, rgba(248, 250, 252, 0.5));
`;

const MobileMenuTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const MobileLogoIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);

  svg {
    width: 18px;
    height: 18px;
  }
`;

const MobileMenuBrand = styled.span`
  font-weight: 700;
  font-size: 15px;
  color: #1e293b;
  letter-spacing: -0.01em;
`;

const MobileCloseButton = styled.button`
  background: rgba(241, 245, 249, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.6);
  padding: 8px;
  cursor: pointer;
  color: #64748b;
  border-radius: 10px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const MobileNavList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 16px 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MobileNavItem = styled.li``;

const MobileNavLink = styled(Link)<{ $isActive?: boolean }>`
  display: flex;
  align-items: center;
  padding: 14px 16px;
  text-decoration: none;
  color: ${({ $isActive }) => $isActive ? '#6366f1' : '#374151'};
  font-weight: ${({ $isActive }) => $isActive ? '600' : '500'};
  font-size: 15px;
  border-radius: 12px;
  transition: all 0.2s ease;
  background: ${({ $isActive }) => $isActive ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)' : 'transparent'};
  position: relative;

  ${({ $isActive }) => $isActive && css`
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 24px;
      background: linear-gradient(180deg, #6366f1, #8b5cf6);
      border-radius: 0 4px 4px 0;
    }
  `}

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    color: #6366f1;
    transform: translateX(4px);
  }

  &:active {
    transform: translateX(2px) scale(0.99);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  }
`;

const MobileMenuFooter = styled.div`
  padding: 20px 24px;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
  background: linear-gradient(to top, rgba(248, 250, 252, 0.9), white);
`;

const NavLink = styled(Link)`
  text-decoration: none;
  color: #6b7280;
  font-weight: 500;
  font-size: 14px;
  padding: 9px 16px;
  border-radius: 10px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  letter-spacing: -0.01em;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;

  &:hover {
    color: #1f2937;
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  &:active {
    transform: scale(0.98);
  }

  &.active {
    color: #111827;
    background: white;
    font-weight: 600;
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.08),
      0 2px 8px rgba(0, 0, 0, 0.04);

    &::before {
      content: '';
      position: absolute;
      bottom: 5px;
      left: 50%;
      transform: translateX(-50%);
      width: 18px;
      height: 3px;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      border-radius: 2px;
    }

    &:hover {
      box-shadow:
        0 2px 6px rgba(0, 0, 0, 0.1),
        0 4px 12px rgba(0, 0, 0, 0.05);
    }
  }

  @media (max-width: 1200px) {
    font-size: 13px;
    padding: 8px 12px;
  }

  @media (max-width: 1024px) {
    padding: 7px 10px;
    font-size: 12px;
  }
`;

/* ---------- Profile Components ---------- */
const ProfileSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  flex-shrink: 0;

  @media (max-width: 768px) {
    gap: 8px;
  }
`;

const ProfileButton = styled.button<{ $isOpen?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  background: ${props => props.$isOpen ? 'rgba(99, 102, 241, 0.08)' : 'rgba(241, 245, 249, 0.6)'};
  border: 1px solid ${props => props.$isOpen ? 'rgba(99, 102, 241, 0.2)' : 'rgba(226, 232, 240, 0.6)'};
  padding: 5px 12px 5px 5px;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #475569;

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    border-color: rgba(99, 102, 241, 0.2);
    color: #1e293b;
  }

  &:active {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  }

  @media (max-width: 768px) {
    padding: 4px;
    border-radius: 12px;

    span {
      display: none;
    }
  }
`;

const UserAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
  background-size: 200% 200%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.02em;
  box-shadow:
    0 2px 6px rgba(99, 102, 241, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 50%;
    border: 2px solid transparent;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3)) border-box;
    -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  ${ProfileButton}:hover &::after {
    opacity: 1;
  }
`;

const ProfileName = styled.span`
  font-size: 13px;
  font-weight: 500;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ProfileDropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 240px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 16px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.12),
    0 8px 24px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  z-index: 1000;
  animation: ${slideDown} 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  overflow: hidden;
`;

const DropdownHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.8), white);
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const UserDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const UserName = styled.div`
  font-weight: 600;
  color: #1e293b;
  font-size: 14px;
  line-height: 1.3;
`;

const UserEmail = styled.div`
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const DropdownSection = styled.div`
  padding: 8px;
`;

const DropdownItem = styled.button`
  width: 100%;
  background: none;
  border: none;
  padding: 10px 12px;
  text-align: left;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #475569;
  border-radius: 10px;
  transition: all 0.15s ease;
  position: relative;

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    color: #1e293b;

    svg {
      color: #6366f1;
      transform: scale(1.1);
    }
  }

  &:active {
    background: rgba(99, 102, 241, 0.12);
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
  }

  svg {
    width: 18px;
    height: 18px;
    color: #94a3b8;
    transition: all 0.15s ease;
    flex-shrink: 0;
  }
`;

const DropdownItemLabel = styled.span`
  flex: 1;
`;

const DropdownItemHint = styled.span`
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
`;

const Divider = styled.div`
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(226, 232, 240, 0.8), transparent);
  margin: 4px 16px;
`;

/* ---------- Navigation Items Config ---------- */
const navItems = [
  { path: '/', label: 'Home', tooltip: 'AI-powered product assistant and insights dashboard' },
  { path: '/products', label: 'Products', tooltip: 'Manage insurance products, coverages, and forms' },
  { path: '/ai-builder', label: 'AI Builder', tooltip: 'AI-powered product builder' },
  { path: '/builder', label: 'Builder', tooltip: 'Build new insurance products' },
  { path: '/product-explorer', label: 'Explorer', tooltip: 'Explore product hierarchies and relationships', matchPrefix: true },
  { path: '/tasks', label: 'Tasks', tooltip: 'Manage workflow tasks and assignments' },
  { path: '/data-dictionary', label: 'Data Dictionary', tooltip: 'Browse insurance terminology and definitions' },
  { path: '/claims-analysis', label: 'Claims Analysis', tooltip: 'Analyze claims data and policy coverage' },
];

/* ---------- component ---------- */
export default function MainNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  // Handle scroll effect for sticky nav
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle escape key for mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
          mobileMenuButtonRef.current?.focus();
        }
        if (profileOpen) {
          setProfileOpen(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, profileOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileOpen && !(event.target as Element).closest('[data-profile-menu]')) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  // Check if nav item is active
  const isNavItemActive = useCallback((item: typeof navItems[0]) => {
    if (item.matchPrefix) {
      return location.pathname.startsWith(item.path);
    }
    return location.pathname === item.path;
  }, [location.pathname]);

  // Get user initials for avatar
  const getUserInitials = () => {
    // Check for admin or guest session first
    const sessionStatus = sessionStorage.getItem('ph-authed');
    const storedUsername = sessionStorage.getItem('ph-username');

    if (sessionStatus === 'admin' && storedUsername) {
      return storedUsername.substring(0, 2).toUpperCase();
    }

    if (sessionStatus === 'guest') {
      return 'GU';
    }

    const user = auth.currentUser;
    if (user?.displayName) {
      return user.displayName.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getUserEmail = () => {
    // Check for admin or guest session first
    const sessionStatus = sessionStorage.getItem('ph-authed');
    const storedUsername = sessionStorage.getItem('ph-username');

    if (sessionStatus === 'admin' && storedUsername) {
      return `${storedUsername}@admin.local`;
    }

    if (sessionStatus === 'guest') {
      return 'guest@temporary.local';
    }

    const user = auth.currentUser;
    return user?.email || 'Guest User';
  };

  const getUserName = () => {
    // Check for admin or guest session first
    const sessionStatus = sessionStorage.getItem('ph-authed');
    const storedUsername = sessionStorage.getItem('ph-username');

    if (sessionStatus === 'admin' && storedUsername) {
      return storedUsername;
    }

    if (sessionStatus === 'guest') {
      return 'Guest User';
    }

    const user = auth.currentUser;
    return user?.displayName || user?.email?.split('@')[0] || 'Guest User';
  };

  const handleSignOut = async () => {
    const startTime = Date.now();
    const sessionStatus = sessionStorage.getItem('ph-authed');
    const username = sessionStorage.getItem('ph-username');

    logger.logUserAction('Logout attempt started', {
      sessionType: sessionStatus,
      username: username,
      timestamp: new Date().toISOString()
    });

    try {
      // Check if this is an admin or guest session
      if (sessionStatus === 'admin' || sessionStatus === 'guest') {
        logger.info(LOG_CATEGORIES.AUTH, 'Session logout', {
          sessionType: sessionStatus,
          username: username
        });

        // Admin/Guest logout - just clear session storage
        sessionStorage.removeItem('ph-authed');
        sessionStorage.removeItem('ph-username');

        logger.info(LOG_CATEGORIES.AUTH, 'Session logout successful', {
          sessionType: sessionStatus
        });

        logger.logNavigation(location.pathname, '/login', { reason: 'logout' });
        navigate('/login', { replace: true });
      } else {
        logger.info(LOG_CATEGORIES.AUTH, 'Firebase logout', {
          userEmail: auth.currentUser?.email
        });

        // Firebase logout
        await signOut(auth);

        logger.info(LOG_CATEGORIES.AUTH, 'Firebase logout successful');

        logger.logNavigation(location.pathname, '/login', { reason: 'firebase_logout' });
        navigate('/login', { replace: true });
      }
    } catch (error) {
      logger.error(LOG_CATEGORIES.AUTH, 'Logout failed', {
        sessionType: sessionStatus,
        duration
      }, error);
    }
  };

  return (
    <>
      <NavigationWrapper $scrolled={scrolled}>
        <Navigation role="navigation" aria-label="Main navigation">
          {/* Logo & Brand */}
          <LogoSection to="/" aria-label="Home">
            <LogoIcon>
              <SparklesIcon />
            </LogoIcon>
            <LogoText>
              <LogoBrand>Product Reinvention Hub</LogoBrand>
              <LogoTagline>P&C Insurance</LogoTagline>
            </LogoText>
          </LogoSection>

          {/* Desktop Navigation */}
          <NavList>
            {navItems.map((item) => (
              <NavItem key={item.path}>
                <Tooltip content={item.tooltip} position="bottom">
                  <NavLink
                    to={item.path}
                    className={isNavItemActive(item) ? 'active' : ''}
                    aria-current={isNavItemActive(item) ? 'page' : undefined}
                  >
                    {item.label}
                  </NavLink>
                </Tooltip>
              </NavItem>
            ))}
          </NavList>

          {/* Mobile Menu Button */}
          <MobileMenuButton
            ref={mobileMenuButtonRef}
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            <Bars3Icon />
          </MobileMenuButton>

          <ProfileSection data-profile-menu>
            <ProfileButton
              onClick={() => setProfileOpen(!profileOpen)}
              $isOpen={profileOpen}
              aria-expanded={profileOpen}
              aria-haspopup="true"
            >
              <UserAvatar>{getUserInitials()}</UserAvatar>
              <ProfileName>{getUserName()}</ProfileName>
            </ProfileButton>

            {profileOpen && (
              <ProfileDropdown role="menu" aria-label="User menu">
                <DropdownHeader>
                  <UserInfo>
                    <UserAvatar>{getUserInitials()}</UserAvatar>
                    <UserDetails>
                      <UserName>{getUserName()}</UserName>
                      <UserEmail>{getUserEmail()}</UserEmail>
                    </UserDetails>
                  </UserInfo>
                </DropdownHeader>

                <DropdownSection>
                  <DropdownItem
                    onClick={() => console.info('Profile view - Coming soon')}
                    role="menuitem"
                  >
                    <UserIcon />
                    <DropdownItemLabel>View Profile</DropdownItemLabel>
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => console.info('Account settings - Coming soon')}
                    role="menuitem"
                  >
                    <Cog6ToothIcon />
                    <DropdownItemLabel>Account Settings</DropdownItemLabel>
                  </DropdownItem>
                </DropdownSection>

                <Divider />

                <DropdownSection>
                  <DropdownItem onClick={handleSignOut} role="menuitem">
                    <ArrowLeftOnRectangleIcon />
                    <DropdownItemLabel>Sign Out</DropdownItemLabel>
                  </DropdownItem>
                </DropdownSection>
              </ProfileDropdown>
            )}
          </ProfileSection>
        </Navigation>
      </NavigationWrapper>

      {/* Mobile Menu Overlay */}
      <MobileMenuOverlay
        $isOpen={mobileMenuOpen}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Menu */}
      <MobileMenu
        ref={mobileMenuRef}
        $isOpen={mobileMenuOpen}
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <MobileMenuHeader>
          <MobileMenuTitle>
            <MobileLogoIcon>
              <SparklesIcon />
            </MobileLogoIcon>
            <MobileMenuBrand>Reinvention Hub</MobileMenuBrand>
          </MobileMenuTitle>
          <MobileCloseButton
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
          >
            <XMarkIcon />
          </MobileCloseButton>
        </MobileMenuHeader>

        <MobileNavList role="menu">
          {navItems.map((item) => (
            <MobileNavItem key={item.path} role="none">
              <MobileNavLink
                to={item.path}
                $isActive={isNavItemActive(item)}
                role="menuitem"
                aria-current={isNavItemActive(item) ? 'page' : undefined}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </MobileNavLink>
            </MobileNavItem>
          ))}
        </MobileNavList>

        <MobileMenuFooter>
          <UserInfo>
            <UserAvatar>{getUserInitials()}</UserAvatar>
            <UserDetails>
              <UserName>{getUserName()}</UserName>
              <UserEmail>{getUserEmail()}</UserEmail>
            </UserDetails>
          </UserInfo>
        </MobileMenuFooter>
      </MobileMenu>
    </>
  );
}
