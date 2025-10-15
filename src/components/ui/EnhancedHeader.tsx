import React from 'react';
import styled, { keyframes } from 'styled-components';
import { MagnifyingGlassIcon, ArrowUpIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

/* ---------- Animations ---------- */
const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

/* ---------- Enhanced Header Components ---------- */
const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(12px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  margin-bottom: 16px;
  align-self: flex-start;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.2);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const HeaderSection = styled.section`
  width: 100%;
  padding: 24px 32px;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(12px);
  margin-bottom: 32px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  }

  @media (max-width: 768px) {
    padding: 20px 24px;
    margin-bottom: 24px;
  }
`;

const HeaderContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1400px;
  margin: 0 auto;
  text-align: center;
`;

const TitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const PageTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.2;

  @media (max-width: 768px) {
    font-size: 2rem;
  }

  @media (max-width: 480px) {
    font-size: 1.75rem;
  }
`;

const PageSubtitle = styled.p`
  font-size: 1.125rem;
  color: #6b7280;
  margin: 0;
  font-weight: 500;
  line-height: 1.4;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const float = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-6px);
  }
`;

const IconTitleGroup = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;

  svg {
    width: 32px;
    height: 32px;
    color: #6366f1;
    transition: all 0.3s ease;

    &:hover {
      animation: ${float} 2s ease-in-out infinite;
      color: #8b5cf6;
    }

    @media (max-width: 768px) {
      width: 28px;
      height: 28px;
    }
  }
`;

const ContextInfo = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    gap: 12px;
  }
`;

const ContextBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(59, 130, 246, 0.1);
  color: #1d4ed8;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid rgba(59, 130, 246, 0.2);

  svg {
    width: 14px;
    height: 14px;
  }
`;

const CountBadge = styled.span`
  background: rgba(16, 185, 129, 0.1);
  color: #047857;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid rgba(16, 185, 129, 0.2);
`;

/* ---------- Enhanced Search Components ---------- */
const SearchSection = styled.div`
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  position: relative;
`;

const SearchContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(226, 232, 240, 0.8);
  transition: all 0.3s ease;
  overflow: hidden;

  &:focus-within {
    border-color: #6366f1;
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.15);
    transform: translateY(-1px);
  }
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 16px 20px;
  border: none;
  outline: none;
  font-size: 1rem;
  color: #1f2937;
  background: transparent;

  &::placeholder {
    color: #9ca3af;
    font-weight: 500;
  }

  @media (max-width: 768px) {
    padding: 14px 16px;
    font-size: 0.95rem;
  }
`;

const SearchButton = styled.button`
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  padding: 12px 20px;
  margin: 4px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
  min-width: 80px;
  justify-content: center;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #5b5bf6, #7c3aed);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  svg {
    width: 16px;
    height: 16px;
  }

  @media (max-width: 768px) {
    padding: 10px 16px;
    min-width: 70px;
  }
`;

const SearchIcon = styled(MagnifyingGlassIcon)`
  width: 20px;
  height: 20px;
  color: #9ca3af;
  margin-left: 16px;
  flex-shrink: 0;
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

/* ---------- Main Component ---------- */
interface EnhancedHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType;
  contextInfo?: Array<{type: 'badge' | 'count', text: string, icon?: React.ComponentType}>;
  searchProps?: {
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onSearch?: () => void;
    disabled?: boolean;
    isLoading?: boolean;
  } | null;
  showBackButton?: boolean;
  onBackClick?: () => void;
  backButtonLabel?: string;
  children?: React.ReactNode;
}

const EnhancedHeader: React.FC<EnhancedHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  contextInfo = [],
  searchProps = null,
  showBackButton = false,
  onBackClick,
  backButtonLabel = 'Back',
  children
}) => {
  return (
    <HeaderSection>
      <HeaderContent>
        {showBackButton && onBackClick && (
          <BackButton onClick={onBackClick}>
            <ArrowLeftIcon />
            {backButtonLabel}
          </BackButton>
        )}

        <TitleGroup>
          {Icon && (
            <IconTitleGroup>
              <Icon />
              <PageTitle>{title}</PageTitle>
            </IconTitleGroup>
          )}
          {!Icon && <PageTitle>{title}</PageTitle>}
          {subtitle && <PageSubtitle>{subtitle}</PageSubtitle>}
        </TitleGroup>

        {contextInfo.length > 0 && (
          <ContextInfo>
            {contextInfo.map((info, index) => (
              <React.Fragment key={index}>
                {info.type === 'badge' && (
                  <ContextBadge>
                    {info.icon && <info.icon />}
                    {info.text}
                  </ContextBadge>
                )}
                {info.type === 'count' && (
                  <CountBadge>{info.text}</CountBadge>
                )}
              </React.Fragment>
            ))}
          </ContextInfo>
        )}

        {searchProps && (
          <SearchSection>
            <SearchContainer>
              <SearchIcon />
              <SearchInput
                placeholder={searchProps.placeholder}
                value={searchProps.value}
                onChange={searchProps.onChange}
                onKeyPress={searchProps.onKeyPress}
                disabled={searchProps.disabled}
              />
              {searchProps.onSearch && (
                <SearchButton
                  onClick={searchProps.onSearch}
                  disabled={searchProps.disabled || !searchProps.value?.trim()}
                >
                  {searchProps.isLoading ? (
                    <LoadingSpinner />
                  ) : (
                    <>
                      <ArrowUpIcon />
                      Search
                    </>
                  )}
                </SearchButton>
              )}
            </SearchContainer>
          </SearchSection>
        )}

        {children}
      </HeaderContent>
    </HeaderSection>
  );
};

export default EnhancedHeader;
