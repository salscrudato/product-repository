import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { signOut } from 'firebase/auth';
import { auth, prepareFirestoreForLogout } from '../../firebase';
import { UserIcon, Cog6ToothIcon, ArrowLeftOnRectangleIcon, Bars3Icon, XMarkIcon, SparklesIcon, BuildingOffice2Icon, UserGroupIcon, ChevronDownIcon, ClipboardDocumentListIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import logger, { LOG_CATEGORIES } from '../../utils/logger';
import { Tooltip } from './Tooltip';
import CommandPalette, { useCommandPalette } from './CommandPalette';
import { NotificationBell } from '../collaboration';
import { useRoleContext } from '../../context/RoleContext';
import { useChangeSet } from '../../context/ChangeSetContext';
import { ORG_ROLE_DISPLAY_NAMES } from '../../services/orgService';
import { color, neutral, accent, semantic, space, radius, shadow, fontFamily, type as typeScale, transition, duration, easing, z, layout, focusRingStyle, reducedMotion } from '../../ui/tokens';

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
  z-index: ${z.dropdown};
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid ${({ $scrolled }) => $scrolled ? neutral[200] : 'transparent'};
  transition: border-color ${transition.normal};

  @media ${reducedMotion} { transition: none; }
`;

const Navigation = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${space[2]} ${space[10]};
  position: relative;
  z-index: ${z.raised};
  max-width: ${layout.maxWidthWide};
  margin: 0 auto;
  gap: ${space[8]};

  @media (max-width: 1200px) {
    padding: ${space[2]} ${space[6]};
    gap: ${space[5]};
  }

  @media (max-width: 768px) {
    padding: ${space[2]} ${space[4]};
  }
`;

/* ---------- Logo & Brand ---------- */
const LogoSection = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${space[2.5]};
  text-decoration: none;
  padding: ${space[1.5]} ${space[2]};
  margin: -${space[1.5]} -${space[2]};
  border-radius: ${radius.lg};
  transition: all ${transition.fast};
  flex-shrink: 0;

  &:hover {
    background: ${color.accentMuted};
  }

  &:active {
    transform: scale(0.98);
  }

  &:focus-visible {
    ${focusRingStyle}
  }

  @media ${reducedMotion} {
    transition: none;
    &:active { transform: none; }
  }
`;

const LogoIcon = styled.div`
  width: 30px;
  height: 30px;
  border-radius: ${radius.md};
  background: ${accent[600]};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${color.textInverse};
  flex-shrink: 0;

  svg {
    width: 16px;
    height: 16px;
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
  font-weight: ${typeScale.headingSm.weight};
  font-size: ${typeScale.bodyMd.size};
  color: ${color.text};
  letter-spacing: ${typeScale.headingSm.letterSpacing};
  white-space: nowrap;

  @media (max-width: 900px) {
    font-size: ${typeScale.bodySm.size};
  }
`;

const LogoTagline = styled.span`
  font-size: ${typeScale.overline.size};
  font-weight: ${typeScale.overline.weight};
  color: ${neutral[400]};
  letter-spacing: ${typeScale.overline.letterSpacing};
  text-transform: uppercase;
  margin-top: ${space.px};
`;

/* ---------- Nav List ---------- */
const NavList = styled.ul`
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: ${space[0.5]};
  flex: 1;
  justify-content: center;

  @media (max-width: 768px) {
    display: none;
  }
`;

const NavItem = styled.li``;

/* ---------- Mobile Menu Components ---------- */
const MobileMenuButton = styled.button`
  display: none;
  background: ${neutral[100]}cc;
  border: 1px solid ${neutral[200]}99;
  padding: ${space[2]};
  cursor: pointer;
  color: ${color.textMuted};
  border-radius: ${radius.md};
  transition: all ${transition.fast};

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &:hover {
    background: ${accent[50]};
    border-color: ${accent[200]};
    color: ${color.accent};
    transform: scale(1.02);
  }

  &:active {
    transform: scale(0.98);
  }

  &:focus-visible {
    ${focusRingStyle}
  }

  svg {
    width: 22px;
    height: 22px;
  }

  @media ${reducedMotion} {
    transition: none;
    &:hover, &:active { transform: none; }
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
    background: ${color.overlay};
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: ${z.overlay};
    animation: ${fadeIn} ${duration.normal} ${easing.out};
  }

  @media ${reducedMotion} {
    animation: none;
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
    z-index: ${z.modal};
    animation: ${slideIn} ${duration.slow} ${easing.springCalm};
    box-shadow: ${shadow.overlay};
    overflow-y: auto;
  }

  @media ${reducedMotion} {
    animation: none;
  }
`;

const MobileMenuHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${space[4]} ${space[5]};
  border-bottom: 1px solid ${neutral[100]};
`;

const MobileMenuTitle = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[2.5]};
`;

const MobileLogoIcon = styled.div`
  width: 28px;
  height: 28px;
  border-radius: ${radius.md};
  background: ${accent[600]};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${color.textInverse};

  svg { width: 14px; height: 14px; }
`;

const MobileMenuBrand = styled.span`
  font-weight: 700;
  font-size: ${typeScale.bodyMd.size};
  color: ${neutral[800]};
  letter-spacing: ${typeScale.headingSm.letterSpacing};
`;

const MobileCloseButton = styled.button`
  background: ${neutral[100]}cc;
  border: 1px solid ${neutral[200]}99;
  padding: ${space[2]};
  cursor: pointer;
  color: ${color.textMuted};
  border-radius: ${radius.md};
  transition: all ${transition.fast};

  &:hover {
    background: ${color.errorLight};
    border-color: ${semantic.error}33;
    color: ${color.error};
  }

  &:focus-visible {
    ${focusRingStyle}
  }

  svg {
    width: 18px;
    height: 18px;
  }

  @media ${reducedMotion} {
    transition: none;
  }
`;

const MobileNavList = styled.ul`
  list-style: none;
  margin: 0;
  padding: ${space[4]} ${space[3]};
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${space[1]};
`;

const MobileNavItem = styled.li``;

const MobileNavLink = styled(Link)<{ $isActive?: boolean }>`
  display: flex;
  align-items: center;
  padding: ${space[3]} ${space[4]};
  text-decoration: none;
  color: ${({ $isActive }) => $isActive ? accent[500] : neutral[700]};
  font-weight: ${({ $isActive }) => $isActive ? 600 : 500};
  font-size: ${typeScale.bodyMd.size};
  border-radius: ${radius.lg};
  transition: all ${transition.fast};
  background: ${({ $isActive }) => $isActive ? accent[50] : 'transparent'};
  position: relative;

  ${({ $isActive }) => $isActive && css`
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: ${space[1]};
      height: ${space[6]};
      background: ${accent[500]};
      border-radius: 0 ${radius.xs} ${radius.xs} 0;
    }
  `}

  &:hover {
    background: ${accent[50]};
    color: ${accent[500]};
    transform: translateX(${space[1]});
  }

  &:active {
    transform: translateX(${space[0.5]}) scale(0.99);
  }

  &:focus-visible {
    ${focusRingStyle}
  }

  @media ${reducedMotion} {
    transition: none;
    &:hover, &:active { transform: none; }
  }
`;

const MobileMenuFooter = styled.div`
  padding: ${space[4]} ${space[5]};
  border-top: 1px solid ${neutral[100]};
`;

const NavLink = styled(Link)`
  text-decoration: none;
  color: ${neutral[500]};
  font-weight: 400;
  font-size: ${typeScale.bodySm.size};
  padding: ${space[1.5]} ${space[3]};
  border-radius: ${radius.sm};
  transition: color ${transition.fast};
  position: relative;
  letter-spacing: ${typeScale.bodySm.letterSpacing};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${space[1.5]};
  white-space: nowrap;

  &:hover {
    color: ${color.text};
  }

  &.active {
    color: ${color.text};
    font-weight: 500;

    &::before {
      content: '';
      position: absolute;
      bottom: -${space[2]};
      left: 50%;
      transform: translateX(-50%);
      width: 16px;
      height: 2px;
      background: ${accent[500]};
      border-radius: ${radius.full};
    }

    &:hover {
      box-shadow: ${shadow.md};
    }
  }

  &:focus-visible {
    ${focusRingStyle}
  }

  @media (max-width: 1200px) {
    font-size: ${typeScale.labelSm.size};
    padding: ${space[2]} ${space[3]};
  }

  @media (max-width: 1024px) {
    padding: ${space[1.5]} ${space[2.5]};
    font-size: ${typeScale.captionSm.size};
  }

  @media ${reducedMotion} {
    transition: none;
    &:active { transform: none; }
  }
`;

/* ---------- Search Trigger ---------- */
const SearchTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: ${space[2]};
  padding: ${space[1.5]} ${space[3]};
  background: ${neutral[100]};
  border: none;
  border-radius: ${radius.sm};
  cursor: pointer;
  font-family: inherit;
  font-size: ${typeScale.caption.size};
  color: ${neutral[400]};
  transition: background ${transition.fast};
  white-space: nowrap;

  &:hover { background: ${neutral[150]}; }
  &:focus-visible { ${focusRingStyle} }

  svg { width: 15px; height: 15px; }

  @media (max-width: 768px) {
    padding: ${space[1.5]};
    span, kbd { display: none; }
  }
`;

const KbdHint = styled.kbd`
  display: inline-flex;
  align-items: center;
  padding: ${space.px} ${space[1]};
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid ${neutral[200]}cc;
  border-radius: ${radius.xs};
  font-family: inherit;
  font-size: ${typeScale.overline.size};
  font-weight: ${typeScale.label.weight};
  color: ${neutral[400]};
  line-height: 1;
`;

/* ---------- Profile Components ---------- */
const ProfileSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[3]};
  position: relative;
  flex-shrink: 0;

  @media (max-width: 768px) {
    gap: ${space[2]};
  }
`;

const ProfileButton = styled.button<{ $isOpen?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${space[2]};
  background: transparent;
  border: none;
  padding: ${space[1]};
  border-radius: ${radius.md};
  cursor: pointer;
  transition: background ${transition.fast};
  color: ${neutral[600]};

  &:hover {
    background: ${neutral[100]};
  }

  &:focus-visible {
    ${focusRingStyle}
  }

  @media (max-width: 768px) {
    span { display: none; }
  }
`;

const UserAvatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: ${radius.full};
  background: ${neutral[200]};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${neutral[600]};
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.02em;
  flex-shrink: 0;
`;

const ProfileName = styled.span`
  font-size: ${typeScale.labelSm.size};
  font-weight: ${typeScale.label.weight};
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ProfileDropdown = styled.div`
  position: absolute;
  top: calc(100% + ${space[2]});
  right: 0;
  min-width: 220px;
  background: ${neutral[0]};
  border: 1px solid ${neutral[200]};
  border-radius: ${radius.lg};
  box-shadow: ${shadow.lg};
  z-index: ${z.popover};
  animation: ${slideDown} ${duration.fast} ${easing.out};
  overflow: hidden;

  @media ${reducedMotion} {
    animation: none;
  }
`;

const DropdownHeader = styled.div`
  padding: ${space[3]} ${space[4]};
  border-bottom: 1px solid ${neutral[100]};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[3]};
`;

const UserDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const UserName = styled.div`
  font-weight: 600;
  color: ${neutral[800]};
  font-size: ${typeScale.bodySm.size};
  line-height: 1.3;
`;

const UserEmail = styled.div`
  font-size: ${typeScale.captionSm.size};
  color: ${color.textMuted};
  margin-top: ${space[0.5]};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const OrgBadge = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[1.5]};
  margin-top: ${space[2]};
  padding: ${space[1.5]} ${space[2.5]};
  background: ${accent[50]};
  border-radius: ${radius.md};
  border: 1px solid ${accent[100]};

  svg { width: 14px; height: 14px; color: ${accent[500]}; }
`;

const OrgName = styled.span`
  font-size: ${typeScale.captionSm.size};
  font-weight: ${typeScale.label.weight};
  color: ${accent[600]};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RoleBadge = styled.span`
  font-size: 10px;
  font-weight: 600;
  padding: ${space[0.5]} ${space[1.5]};
  background: ${accent[100]};
  color: ${accent[600]};
  border-radius: ${radius.xs};
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const DropdownSection = styled.div`
  padding: ${space[2]};
`;

const DropdownItem = styled.button`
  width: 100%;
  background: none;
  border: none;
  padding: ${space[2.5]} ${space[3]};
  text-align: left;
  font-size: ${typeScale.bodySm.size};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${space[2.5]};
  color: ${neutral[600]};
  border-radius: ${radius.md};
  transition: all ${transition.fast};
  position: relative;

  &:hover {
    background: ${accent[50]};
    color: ${neutral[800]};

    svg {
      color: ${accent[500]};
      transform: scale(1.1);
    }
  }

  &:active {
    background: ${accent[100]};
    transform: scale(0.98);
  }

  &:focus-visible {
    ${focusRingStyle}
  }

  svg {
    width: 18px;
    height: 18px;
    color: ${neutral[400]};
    transition: all ${transition.fast};
    flex-shrink: 0;
  }

  @media ${reducedMotion} {
    transition: none;
    &:active { transform: none; }
    svg { transition: none; }
  }
`;

const DropdownItemLabel = styled.span`
  flex: 1;
`;

const DropdownItemHint = styled.span`
  font-size: ${typeScale.overline.size};
  color: ${neutral[400]};
  font-weight: ${typeScale.label.weight};
`;

const Divider = styled.div`
  height: ${space.px};
  background: linear-gradient(90deg, transparent, ${neutral[200]}cc, transparent);
  margin: ${space[1]} ${space[4]};
`;

/* ---------- Active ChangeSet Pill ---------- */
const ChangeSetPill = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${space[2]};
  padding: ${space[1.5]} ${space[3]};
  background: ${accent[50]};
  border: 1px solid ${accent[200]};
  border-radius: ${radius.full};
  text-decoration: none;
  transition: all ${transition.fast};
  margin-right: ${space[3]};

  &:hover {
    background: ${accent[100]};
    border-color: ${accent[300]};
    transform: translateY(-1px);
    box-shadow: 0 2px 8px ${accent[500]}26;
  }

  &:focus-visible {
    ${focusRingStyle}
  }

  svg {
    width: ${space[4]};
    height: ${space[4]};
    color: ${accent[500]};
  }

  @media (max-width: 900px) {
    padding: ${space[1]} ${space[2.5]};
    margin-right: ${space[2]};

    span { display: none; }
  }

  @media ${reducedMotion} {
    transition: none;
    &:hover { transform: none; }
  }
`;

const ChangeSetPillText = styled.span`
  font-size: ${typeScale.captionSm.size};
  font-weight: 600;
  color: ${accent[500]};
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ChangeSetItemCount = styled.span`
  font-size: 10px;
  font-weight: 700;
  background: ${accent[500]};
  color: ${color.textInverse};
  padding: ${space[0.5]} ${space[1.5]};
  border-radius: ${radius.full};
  min-width: 18px;
  text-align: center;
`;

/* ---------- Navigation Items Config ---------- */
const navItems = [
  { path: '/', label: 'Home', tooltip: 'AI assistant' },
  { path: '/products', label: 'Products', tooltip: 'Products, coverages, and pricing' },
  { path: '/forms-repository', label: 'Forms', tooltip: 'Form editions and jurisdictions', matchPrefix: true },
  { path: '/underwriting-rules', label: 'Rules', tooltip: 'Underwriting rules' },
  { path: '/clauses', label: 'Clauses', tooltip: 'Reusable clause library' },
  { path: '/changesets', label: 'Changes', tooltip: 'Change sets and approvals' },
  { path: '/filings', label: 'Filings', tooltip: 'Filing packages' },
  { path: '/tasks', label: 'Tasks', tooltip: 'Workflow tasks' },
  { path: '/analytics', label: 'Analytics', tooltip: 'Portfolio analytics' },
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

  // Get org and role context
  const { currentOrg, orgRole, user, isOrgAdmin, hasOrg } = useRoleContext();

  // Get active change set from context
  const { activeChangeSet, activeItems } = useChangeSet();

  // Command palette
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();

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
    if (user?.displayName) {
      return user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getUserEmail = () => {
    return user?.email || '';
  };

  const getUserName = () => {
    return user?.displayName || user?.email?.split('@')[0] || 'User';
  };

  const handleSignOut = async () => {
    logger.logUserAction('Logout attempt started', {
      userEmail: user?.email,
      timestamp: new Date().toISOString()
    });

    try {
      logger.info(LOG_CATEGORIES.AUTH, 'Firebase logout', {
        userEmail: user?.email
      });

      // Block new Firestore subscriptions BEFORE signOut.
      // This prevents new listeners from being created while auth is clearing.
      // We do NOT terminate the Firestore client — it is a module singleton
      // and cannot be re-created after termination.
      await prepareFirestoreForLogout();
      await signOut(auth);

      logger.info(LOG_CATEGORIES.AUTH, 'Firebase logout successful');
      logger.logNavigation(location.pathname, '/login', { reason: 'logout' });
      navigate('/login', { replace: true });
    } catch (error) {
      logger.error(LOG_CATEGORIES.AUTH, 'Logout failed', {
        userEmail: user?.email
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

          {/* Global Search Trigger */}
          <Tooltip content="Search everything (⌘K)" position="bottom">
            <SearchTrigger
              onClick={() => setPaletteOpen(true)}
              aria-label="Open search (⌘K)"
            >
              <MagnifyingGlassIcon />
              <span>Search…</span>
              <KbdHint>⌘K</KbdHint>
            </SearchTrigger>
          </Tooltip>

          {/* Notification Bell */}
          <NotificationBell />

          {/* Active ChangeSet Pill */}
          {activeChangeSet && (
            <Tooltip content={`Active Change Set: ${activeChangeSet.name}`} position="bottom">
              <ChangeSetPill to={`/changesets/${activeChangeSet.id}`}>
                <ClipboardDocumentListIcon />
                <ChangeSetPillText>{activeChangeSet.name}</ChangeSetPillText>
                {activeItems.length > 0 && (
                  <ChangeSetItemCount>{activeItems.length}</ChangeSetItemCount>
                )}
              </ChangeSetPill>
            </Tooltip>
          )}

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
                      {hasOrg && currentOrg && (
                        <OrgBadge>
                          <BuildingOffice2Icon />
                          <OrgName>{currentOrg.name}</OrgName>
                          {orgRole && <RoleBadge>{ORG_ROLE_DISPLAY_NAMES[orgRole]}</RoleBadge>}
                        </OrgBadge>
                      )}
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
                  {isOrgAdmin && (
                    <DropdownItem
                      onClick={() => { setProfileOpen(false); navigate('/admin/members'); }}
                      role="menuitem"
                    >
                      <UserGroupIcon />
                      <DropdownItemLabel>Team Members</DropdownItemLabel>
                    </DropdownItem>
                  )}
                  {hasOrg && (
                    <DropdownItem
                      onClick={() => { setProfileOpen(false); navigate('/org/select'); }}
                      role="menuitem"
                    >
                      <BuildingOffice2Icon />
                      <DropdownItemLabel>Switch Organization</DropdownItemLabel>
                    </DropdownItem>
                  )}
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
              {hasOrg && currentOrg && (
                <OrgBadge>
                  <BuildingOffice2Icon />
                  <OrgName>{currentOrg.name}</OrgName>
                  {orgRole && <RoleBadge>{ORG_ROLE_DISPLAY_NAMES[orgRole]}</RoleBadge>}
                </OrgBadge>
              )}
            </UserDetails>
          </UserInfo>
        </MobileMenuFooter>
      </MobileMenu>

      {/* Command Palette (⌘K) */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
