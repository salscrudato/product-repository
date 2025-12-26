import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { UserIcon, Cog6ToothIcon, ArrowLeftOnRectangleIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
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

const underlineExpand = keyframes`
  from {
    width: 0;
  }
  to {
    width: 100%;
  }
`;

/* ---------- Skip Link for Accessibility ---------- */
const SkipLink = styled.a`
  position: absolute;
  top: -100px;
  left: 16px;
  background: ${({ theme }) => theme.colours.primary};
  color: white;
  padding: 12px 24px;
  border-radius: 0 0 8px 8px;
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
  z-index: 10000;
  transition: top 0.2s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);

  &:focus {
    top: 0;
    outline: none;
  }
`;

/* ---------- styled components ---------- */
const NavigationWrapper = styled.div`
  position: sticky;
  top: 0;
  z-index: 100;
  transition: box-shadow 0.3s ease;

  ${props => props.$scrolled && `
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  `}
`;

const Navigation = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 32px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  position: relative;
  z-index: 10;
  max-width: 1400px;
  margin: 0 auto;
  transition: background 0.3s ease, border-color 0.3s ease;

  @media (max-width: 1024px) {
    padding: 12px 24px;
  }

  @media (max-width: 768px) {
    padding: 10px 16px;
  }
`;

const NavList = styled.ul<{ $mobileOpen?: boolean }>`
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 8px;

  @media (max-width: 1024px) {
    gap: 4px;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const NavItem = styled.li``;

/* ---------- Mobile Menu Components ---------- */
const MobileMenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #64748b;
  border-radius: 8px;
  transition: all 0.2s ease;

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    color: #1e293b;
  }

  &:focus-visible {
    outline: 2px solid rgba(99, 102, 241, 0.4);
    outline-offset: 2px;
  }

  svg {
    width: 24px;
    height: 24px;
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
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 998;
    animation: ${fadeIn} 0.2s ease-out;
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
    width: 280px;
    max-width: 85vw;
    background: white;
    flex-direction: column;
    z-index: 999;
    animation: ${slideIn} 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.15);
    overflow-y: auto;
  }
`;

const MobileMenuHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
`;

const MobileMenuTitle = styled.span`
  font-weight: 600;
  font-size: 16px;
  color: #1e293b;
`;

const MobileCloseButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #64748b;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    color: #1e293b;
  }

  &:focus-visible {
    outline: 2px solid rgba(99, 102, 241, 0.4);
    outline-offset: 2px;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const MobileNavList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 12px 0;
  flex: 1;
`;

const MobileNavItem = styled.li``;

const MobileNavLink = styled(Link)<{ $isActive?: boolean }>`
  display: block;
  padding: 14px 20px;
  text-decoration: none;
  color: ${({ $isActive }) => $isActive ? '#6366f1' : '#374151'};
  font-weight: ${({ $isActive }) => $isActive ? '600' : '500'};
  font-size: 15px;
  transition: all 0.2s ease;
  border-left: 3px solid ${({ $isActive }) => $isActive ? '#6366f1' : 'transparent'};
  background: ${({ $isActive }) => $isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent'};

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    color: #6366f1;
  }

  &:focus-visible {
    outline: none;
    background: rgba(99, 102, 241, 0.12);
    border-left-color: #6366f1;
  }
`;

const MobileMenuFooter = styled.div`
  padding: 16px 20px;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
  background: rgba(248, 250, 252, 0.8);
`;

const NavLink = styled(Link)`
  text-decoration: none;
  color: #64748b;
  font-weight: 500;
  font-size: 14px;
  padding: 10px 18px;
  border-radius: 10px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  letter-spacing: -0.005em;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1.5px solid transparent;

  &:hover {
    color: #1e293b;
    background: rgba(99, 102, 241, 0.06);
    transform: translateY(-1px);
    border-color: rgba(99, 102, 241, 0.1);

    &::after {
      transform: scaleX(1);
      opacity: 1;
    }
  }

  &:active {
    transform: translateY(0) scale(0.98);
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 6px;
    left: 50%;
    transform: translateX(-50%) scaleX(0);
    height: 2px;
    width: 40%;
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
    border-radius: 2px;
    transition: transform 0.2s ease, opacity 0.2s ease;
    opacity: 0;
  }

  &.active {
    color: #6366f1;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.08) 100%);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15), inset 0 0 0 1.5px rgba(99, 102, 241, 0.2);
    font-weight: 600;
    border-color: transparent;

    &::after {
      transform: translateX(-50%) scaleX(1);
      opacity: 1;
      width: 50%;
    }

    &:hover {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.14) 0%, rgba(139, 92, 246, 0.1) 100%);
      transform: translateY(-1px);
    }
  }

  @media (max-width: 1024px) {
    font-size: 13px;
    padding: 8px 14px;
  }
`;

/* ---------- Profile Components ---------- */
const ProfileSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
`;

const ProfileButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: 1.5px solid transparent;
  padding: 6px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #64748b;
  font-weight: 500;

  &:hover {
    background: rgba(99, 102, 241, 0.06);
    color: #1e293b;
    transform: translateY(-1px);
    border-color: rgba(99, 102, 241, 0.1);
  }

  &:active {
    transform: translateY(0) scale(0.98);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  }
`;

const UserAvatar = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  ${ProfileButton}:hover & {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
  }
`;

const ProfileDropdown = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  min-width: 220px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06);
  z-index: 1000;
  animation: ${slideDown} 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: hidden;
`;

const DropdownHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05));
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const UserDetails = styled.div`
  flex: 1;
`;

const UserName = styled.div`
  font-weight: 600;
  color: #1e293b;
  font-size: 14px;
`;

const UserEmail = styled.div`
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
`;

const DropdownSection = styled.div`
  padding: 8px 0;
`;

const DropdownItem = styled.button`
  width: 100%;
  background: none;
  border: none;
  padding: 10px 16px;
  text-align: left;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #475569;
  transition: all 0.15s ease;
  position: relative;

  &:hover {
    background: rgba(99, 102, 241, 0.06);
    color: #1e293b;
    padding-left: 20px;

    svg {
      opacity: 1;
      transform: scale(1.1);
    }
  }

  &:active {
    background: rgba(99, 102, 241, 0.1);
  }

  &:focus-visible {
    outline: none;
    background: rgba(99, 102, 241, 0.08);
    box-shadow: inset 3px 0 0 #6366f1;
  }

  svg {
    width: 16px;
    height: 16px;
    opacity: 0.6;
    transition: all 0.15s ease;
    flex-shrink: 0;
  }
`;

const Divider = styled.div`
  height: 1px;
  background: rgba(226, 232, 240, 0.6);
  margin: 4px 0;
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
      {/* Skip to main content link for accessibility */}
      <SkipLink href="#main-content">Skip to main content</SkipLink>

      <NavigationWrapper $scrolled={scrolled}>
        <Navigation role="navigation" aria-label="Main navigation">
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
              aria-expanded={profileOpen}
              aria-haspopup="true"
            >
              <UserAvatar>{getUserInitials()}</UserAvatar>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                {getUserName()}
              </span>
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
                    <UserIcon width={16} height={16} />
                    View Profile
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => console.info('Account settings - Coming soon')}
                    role="menuitem"
                  >
                    <Cog6ToothIcon width={16} height={16} />
                    Account Settings
                  </DropdownItem>
                </DropdownSection>

                <Divider />

                <DropdownSection>
                  <DropdownItem onClick={handleSignOut} role="menuitem">
                    <ArrowLeftOnRectangleIcon width={16} height={16} />
                    Sign Out
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
          <MobileMenuTitle>Menu</MobileMenuTitle>
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
