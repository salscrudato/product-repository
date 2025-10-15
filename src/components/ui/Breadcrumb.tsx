import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { ChevronRightIcon } from '@heroicons/react/24/solid';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const BreadcrumbContainer = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 16px;
`;

const BreadcrumbLink = styled(Link)`
  color: #6366f1;
  text-decoration: none;
  transition: color 0.2s ease;
  
  &:hover {
    color: #4f46e5;
    text-decoration: underline;
  }
`;

const BreadcrumbCurrent = styled.span`
  color: #1f2937;
  font-weight: 500;
`;

const Separator = styled(ChevronRightIcon)`
  width: 14px;
  height: 14px;
  color: #d1d5db;
`;

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <BreadcrumbContainer aria-label="Breadcrumb">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <Separator />}
          {item.path ? (
            <BreadcrumbLink to={item.path}>{item.label}</BreadcrumbLink>
          ) : (
            <BreadcrumbCurrent>{item.label}</BreadcrumbCurrent>
          )}
        </React.Fragment>
      ))}
    </BreadcrumbContainer>
  );
};

