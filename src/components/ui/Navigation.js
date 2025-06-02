import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { FaUser, FaCog, FaSignOutAlt, FaMoon, FaSun } from 'react-icons/fa';

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

const underlineExpand = keyframes`
  from {
    width: 0;
  }
  to {
    width: 100%;
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

  @media (max-width: 1024px) {
    padding: 12px 24px;
  }

  @media (max-width: 768px) {
    padding: 10px 16px;
  }
`;

const NavList = styled.ul`
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 8px;

  @media (max-width: 1024px) {
    gap: 4px;
  }

  @media (max-width: 768px) {
    display: none; /* Will implement hamburger menu later */
  }
`;

const NavItem = styled.li``;

const NavLink = styled(Link)`
  text-decoration: none;
  color: #64748b;
  font-weight: 600;
  font-size: 15px;
  padding: 12px 20px;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  letter-spacing: -0.01em;
  cursor: pointer;
  display: block;

  &:hover {
    color: #1e293b;
    background: rgba(99, 102, 241, 0.08);
    transform: translateY(-1px);

    &::before {
      animation: ${underlineExpand} 0.3s ease forwards;
    }
  }

  &::before {
    content: '';
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    height: 2px;
    width: 0;
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
    border-radius: 1px;
    transition: width 0.3s ease;
  }

  &.active {
    color: #6366f1;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.12) 100%);
    box-shadow: 0 2px 12px rgba(99, 102, 241, 0.2);
    font-weight: 700;
    border: 2px solid rgba(99, 102, 241, 0.2);

    &::before {
      width: 60%;
    }
  }

  @media (max-width: 1024px) {
    font-size: 14px;
    padding: 10px 16px;
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
  border: none;
  padding: 8px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #64748b;
  font-weight: 500;

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    color: #1e293b;
    transform: translateY(-1px);
  }

  &:focus {
    outline: 2px solid rgba(99, 102, 241, 0.3);
    outline-offset: 2px;
  }
`;

const UserAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
`;

const ProfileDropdown = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  min-width: 200px;
  background: white;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  animation: ${slideDown} 0.3s ease;
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
  padding: 12px 16px;
  text-align: left;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #374151;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    color: #1e293b;
  }

  &:focus {
    outline: none;
    background: rgba(99, 102, 241, 0.08);
  }

  svg {
    width: 16px;
    height: 16px;
    opacity: 0.7;
  }
`;

const Divider = styled.div`
  height: 1px;
  background: rgba(226, 232, 240, 0.6);
  margin: 4px 0;
`;

/* ---------- Mobile Menu Components ---------- */
// MobileMenuButton removed - unused styled component

/* ---------- component ---------- */
export default function MainNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Handle scroll effect for sticky nav
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileOpen && !event.target.closest('[data-profile-menu]')) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  // Get user initials for avatar
  const getUserInitials = () => {
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
    const user = auth.currentUser;
    return user?.email || 'Guest User';
  };

  const getUserName = () => {
    const user = auth.currentUser;
    return user?.displayName || user?.email?.split('@')[0] || 'Guest User';
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <NavigationWrapper $scrolled={scrolled}>
      <Navigation>
        <NavList>
          <NavItem>
            <NavLink
              to="/"
              className={location.pathname === '/' ? 'active' : ''}
            >
              Home
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              to="/products"
              className={location.pathname === '/products' ? 'active' : ''}
            >
              Products
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              to="/product-builder"
              className={location.pathname.startsWith('/product-builder') ? 'active' : ''}
            >
              Builder
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              to="/product-explorer"
              className={location.pathname.startsWith('/product-explorer') ? 'active' : ''}
            >
              Explorer
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              to="/claims-analysis"
              className={location.pathname === '/claims-analysis' ? 'active' : ''}
            >
              Claims Analysis
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              to="/data-dictionary"
              className={location.pathname === '/data-dictionary' ? 'active' : ''}
            >
              Data Dictionary
            </NavLink>
          </NavItem>
        </NavList>

        <ProfileSection data-profile-menu>
          <ProfileButton onClick={() => setProfileOpen(!profileOpen)}>
            <UserAvatar>{getUserInitials()}</UserAvatar>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>
              {getUserName()}
            </span>
          </ProfileButton>

          {profileOpen && (
            <ProfileDropdown>
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
                <DropdownItem onClick={() => {/* TODO: Implement profile view */}}>
                  <FaUser />
                  View Profile
                </DropdownItem>
                <DropdownItem onClick={() => {/* TODO: Implement settings */}}>
                  <FaCog />
                  Account Settings
                </DropdownItem>
                <DropdownItem onClick={() => setDarkMode(!darkMode)}>
                  {darkMode ? <FaSun /> : <FaMoon />}
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </DropdownItem>
              </DropdownSection>

              <Divider />

              <DropdownSection>
                <DropdownItem onClick={handleSignOut}>
                  <FaSignOutAlt />
                  Sign Out
                </DropdownItem>
              </DropdownSection>
            </ProfileDropdown>
          )}
        </ProfileSection>
      </Navigation>
    </NavigationWrapper>
  );
}
