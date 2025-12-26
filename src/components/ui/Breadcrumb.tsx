/**
 * Breadcrumb - Navigation breadcrumbs with proper accessibility
 *
 * Enhanced with theme tokens and automatic route detection hook.
 */

import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

const BreadcrumbContainer = styled.nav`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 0;
  font-size: 14px;
  color: ${({ theme }) => theme.colours.textMuted};
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const BreadcrumbItemWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const BreadcrumbLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colours.primary};
  text-decoration: none;
  padding: 4px 8px;
  margin: -4px -8px;
  border-radius: ${({ theme }) => theme.radiusSm};
  transition: all 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colours.primaryDark};
    background: ${({ theme }) => theme.colours.primaryLighter};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colours.primary};
    outline-offset: 2px;
  }

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
`;

const BreadcrumbCurrent = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colours.text};
  font-weight: 500;
  padding: 4px 0;

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
`;

const Separator = styled(ChevronRightIcon)`
  width: 14px;
  height: 14px;
  color: ${({ theme }) => theme.colours.border};
  flex-shrink: 0;
`;

const HomeIconStyled = styled(HomeIcon)`
  width: 14px;
  height: 14px;
`;

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  showHome = true,
  className
}) => {
  const allItems = useMemo(() => {
    if (showHome && items.length > 0 && items[0].path !== '/') {
      return [{ label: 'Home', path: '/', icon: <HomeIconStyled /> }, ...items];
    }
    return items;
  }, [items, showHome]);

  return (
    <BreadcrumbContainer aria-label="Breadcrumb navigation" className={className}>
      <ol style={{ display: 'contents', listStyle: 'none', margin: 0, padding: 0 }}>
        {allItems.map((item, index) => (
          <li key={index} style={{ display: 'contents' }}>
            <BreadcrumbItemWrapper>
              {index > 0 && <Separator aria-hidden="true" />}
              {item.path && index < allItems.length - 1 ? (
                <BreadcrumbLink to={item.path}>
                  {item.icon}
                  {item.label}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbCurrent aria-current="page">
                  {item.icon}
                  {item.label}
                </BreadcrumbCurrent>
              )}
            </BreadcrumbItemWrapper>
          </li>
        ))}
      </ol>
    </BreadcrumbContainer>
  );
};

// Route label mapping for automatic breadcrumbs
const routeLabels: Record<string, string> = {
  '': 'Home',
  'products': 'Products',
  'coverage': 'Coverage',
  'forms': 'Forms',
  'pricing': 'Pricing',
  'states': 'States',
  'rules': 'Rules',
  'builder': 'Builder',
  'ai-builder': 'AI Builder',
  'data-dictionary': 'Data Dictionary',
  'tasks': 'Tasks',
  'claims-analysis': 'Claims Analysis',
  'product-explorer': 'Product Explorer',
  'product-builder': 'Product Builder',
  'packages': 'Packages',
  'overview': 'Overview',
  'forms-mapper': 'Forms Mapper',
  'quote-sandbox': 'Quote Sandbox',
};

// Hook for automatic breadcrumb generation from current route
export const useBreadcrumbs = (customLabels?: Record<string, string>): BreadcrumbItem[] => {
  const location = useLocation();

  return useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];
    let currentPath = '';

    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;

      // Check for custom label first, then route labels, then capitalize segment
      const labels = { ...routeLabels, ...customLabels };
      const label = labels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

      // Skip ID-like segments (UUIDs, numbers) from label but include in path
      const isIdLike = /^[0-9a-f-]{20,}$/i.test(segment) || /^\d+$/.test(segment);

      if (!isIdLike) {
        breadcrumbs.push({
          label,
          path: index < pathSegments.length - 1 ? currentPath : undefined
        });
      }
    });

    return breadcrumbs;
  }, [location.pathname, customLabels]);
};

export default Breadcrumb;

