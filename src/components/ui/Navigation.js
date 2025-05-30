import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';

/* ---------- styled components ---------- */
const Navigation = styled.nav`
  display: flex;
  justify-content: center;
  padding: 24px 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  position: relative;
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const NavList = styled.ul`
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 48px;

  @media (max-width: 768px) {
    gap: 24px;
    flex-wrap: wrap;
    justify-content: center;
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
  transition: all 0.3s ease;
  position: relative;
  letter-spacing: -0.01em;

  &:hover {
    color: #1e293b;
    background: rgba(99, 102, 241, 0.08);
    transform: translateY(-1px);
  }

  &.active {
    color: #6366f1;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);

    &::after {
      content: '';
      position: absolute;
      bottom: -24px;
      left: 50%;
      transform: translateX(-50%);
      width: 4px;
      height: 4px;
      background: #6366f1;
      border-radius: 50%;
    }
  }

  @media (max-width: 768px) {
    font-size: 14px;
    padding: 10px 16px;
  }
`;

/* ---------- component ---------- */
export default function MainNavigation() {
  const location = useLocation();

  return (
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
            to="/data-dictionary"
            className={location.pathname === '/data-dictionary' ? 'active' : ''}
          >
            Data Dictionary
          </NavLink>
        </NavItem>
      </NavList>
    </Navigation>
  );
}
