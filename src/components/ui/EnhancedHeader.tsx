import React, { useCallback, useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { MagnifyingGlassIcon, ArrowUpIcon, ArrowLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import {
  color, neutral, accent, space, radius, shadow,
  border as borderToken, fontFamily, type as typeScale,
  transition, focusRingStyle, reducedMotion, layout,
} from '../../ui/tokens';

/* ---------- Animations ---------- */
const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

/* ---------- Breadcrumb Components ---------- */
interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const BreadcrumbNav = styled.nav`
  display: flex;
  align-items: center;
  gap: ${space[2]};
  margin-bottom: ${space[3]};
  animation: ${fadeIn} 0.3s ease-out;
  @media ${reducedMotion} { animation: none; }
`;

const BreadcrumbList = styled.ol`
  display: flex;
  align-items: center;
  gap: ${space[1]};
  list-style: none;
  margin: 0;
  padding: 0;
  flex-wrap: wrap;
`;

const BreadcrumbItemStyled = styled.li`
  display: flex;
  align-items: center;
  gap: ${space[1]};
`;

const BreadcrumbLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${space[1.5]};
  padding: ${space[1]} ${space[2]};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.bodySm.size};
  font-weight: 500;
  color: ${color.textMuted};
  text-decoration: none;
  border-radius: ${radius.sm};
  transition: color ${transition.fast}, background-color ${transition.fast};

  &:hover {
    color: ${accent[600]};
    background: ${accent[50]};
  }

  &:focus-visible {
    ${focusRingStyle}
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const BreadcrumbCurrent = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${space[1.5]};
  padding: ${space[1]} ${space[2]};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.bodySm.size};
  font-weight: 600;
  color: ${color.text};

  svg {
    width: 14px;
    height: 14px;
    color: ${accent[500]};
  }
`;

const BreadcrumbSeparator = styled(ChevronRightIcon)`
  width: 14px;
  height: 14px;
  color: ${neutral[300]};
  flex-shrink: 0;
`;

/* ---------- Enhanced Header Components ---------- */
const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${space[2]};
  padding: ${space[2]} ${space[3]};
  border: ${borderToken.default};
  border-radius: ${radius.md};
  background: ${color.bg};
  color: ${color.textSecondary};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.bodySm.size};
  font-weight: 500;
  cursor: pointer;
  transition: color ${transition.fast}, background-color ${transition.fast}, border-color ${transition.fast};
  margin-bottom: ${space[3]};
  align-self: flex-start;

  &:hover {
    background: ${accent[50]};
    color: ${accent[600]};
    border-color: ${accent[200]};
  }

  &:focus-visible {
    ${focusRingStyle}
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const HeaderSection = styled.section`
  width: 100%;
  padding: ${space[6]} 0 ${space[5]} 0;
  margin-bottom: ${space[6]};
  border-bottom: ${borderToken.light};
  position: relative;
`;

const HeaderContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space[3]};
  max-width: ${layout.maxWidth};
  margin: 0 auto;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space[4]};
`;

const TitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space[1.5]};
`;

const IconTitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[3]};

  svg {
    width: 28px;
    height: 28px;
    color: ${accent[500]};
    flex-shrink: 0;
  }
`;

const PageTitle = styled.h1`
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.displaySm.size};
  font-weight: ${typeScale.displaySm.weight};
  line-height: ${typeScale.displaySm.lineHeight};
  letter-spacing: ${typeScale.displaySm.letterSpacing};
  color: ${color.text};
  margin: 0;

  @media (max-width: 768px) {
    font-size: ${typeScale.headingLg.size};
  }
`;

const PageSubtitle = styled.p`
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.bodyMd.size};
  font-weight: ${typeScale.bodyMd.weight};
  line-height: ${typeScale.bodyMd.lineHeight};
  letter-spacing: ${typeScale.bodyMd.letterSpacing};
  color: ${color.textSecondary};
  margin: 0;
`;

const ContextInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[3]};
  margin-top: ${space[1]};
  flex-wrap: wrap;
`;

const ContextBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${space[1.5]};
  background: ${accent[50]};
  color: ${accent[700]};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.caption.size};
  font-weight: ${typeScale.caption.weight};
  padding: ${space[1]} ${space[2.5]};
  border-radius: ${radius.full};
  border: 1px solid ${accent[100]};

  svg {
    width: 14px;
    height: 14px;
  }
`;

const CountBadge = styled.span`
  background: ${color.successLight};
  color: ${color.successDark};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.caption.size};
  font-weight: 600;
  padding: ${space[1]} ${space[2.5]};
  border-radius: ${radius.lg};
  border: 1px solid rgba(16, 185, 129, 0.2);
`;

/* ---------- Enhanced Search Components ---------- */
const SearchSection = styled.div`
  width: 100%;
  max-width: 560px;
  position: relative;
  margin-top: ${space[2]};
`;

const SearchContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  background: ${color.bg};
  border-radius: ${radius.lg};
  border: ${borderToken.default};
  transition: border-color ${transition.fast}, box-shadow ${transition.fast};
  overflow: hidden;

  &:focus-within {
    border-color: ${accent[500]};
    box-shadow: ${shadow.focus};
  }
`;

const SearchInput = styled.input`
  flex: 1;
  padding: ${space[3]} ${space[4]};
  border: none;
  outline: none;
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.bodyMd.size};
  color: ${color.text};
  background: transparent;

  &::placeholder {
    color: ${color.textMuted};
    font-weight: 400;
  }

  @media (max-width: 768px) {
    padding: ${space[2.5]} ${space[3]};
    font-size: ${typeScale.bodySm.size};
  }
`;

const SearchButton = styled.button<{ $isLoading?: boolean }>`
  background: ${accent[500]};
  color: ${color.textInverse};
  border: none;
  padding: ${space[2.5]} ${space[4]};
  margin: ${space[1]};
  border-radius: ${radius.md};
  font-family: ${fontFamily.sans};
  font-weight: 600;
  font-size: ${typeScale.bodySm.size};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${space[1.5]};
  transition: background-color ${transition.fast}, box-shadow ${transition.fast};
  min-width: 80px;
  justify-content: center;
  position: relative;

  &:hover:not(:disabled) {
    background: ${accent[600]};
    box-shadow: ${shadow.sm};
  }

  &:focus-visible {
    ${focusRingStyle}
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  ${({ $isLoading }) => $isLoading && css`
    background: linear-gradient(90deg, ${accent[500]}, ${accent[400]}, ${accent[500]});
    background-size: 200% auto;
    animation: ${shimmer} 1.5s linear infinite;
  `}

  svg {
    width: 16px;
    height: 16px;
  }

  @media (max-width: 768px) {
    padding: ${space[2]} ${space[3]};
    min-width: 70px;
  }
`;

const SearchIcon = styled(MagnifyingGlassIcon)`
  width: 18px;
  height: 18px;
  color: ${color.textMuted};
  margin-left: ${space[3]};
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

const SearchHint = styled.span`
  position: absolute;
  bottom: -22px;
  left: 0;
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.captionSm.size};
  color: ${color.textMuted};
  display: flex;
  align-items: center;
  gap: ${space[1]};

  kbd {
    background: ${color.bgMuted};
    padding: ${space[0.5]} ${space[1.5]};
    border-radius: ${radius.xs};
    font-family: ${fontFamily.mono};
    font-size: 11px;
    border: 1px solid ${neutral[200]};
  }

  @media (max-width: 768px) {
    display: none;
  }
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
    showHint?: boolean;
    inputId?: string;
    ariaLabel?: string;
  } | null;
  breadcrumbs?: BreadcrumbItem[];
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
  breadcrumbs = [],
  showBackButton = false,
  onBackClick,
  backButtonLabel = 'Back',
  children
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchProps?.onSearch && searchProps.value?.trim()) {
      e.preventDefault();
      searchProps.onSearch();
    }
    searchProps?.onKeyPress?.(e);
  }, [searchProps]);

  return (
    <HeaderSection role="banner" aria-labelledby="page-title">
      <HeaderContent>
        {/* Breadcrumb Navigation */}
        {breadcrumbs.length > 0 && (
          <BreadcrumbNav aria-label="Breadcrumb">
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                const IconComponent = crumb.icon;

                return (
                  <BreadcrumbItemStyled key={crumb.path || crumb.label}>
                    {!isLast && crumb.path ? (
                      <>
                        <BreadcrumbLink to={crumb.path}>
                          {IconComponent && <IconComponent />}
                          {crumb.label}
                        </BreadcrumbLink>
                        <BreadcrumbSeparator aria-hidden="true" />
                      </>
                    ) : (
                      <BreadcrumbCurrent aria-current="page">
                        {IconComponent && <IconComponent />}
                        {crumb.label}
                      </BreadcrumbCurrent>
                    )}
                  </BreadcrumbItemStyled>
                );
              })}
            </BreadcrumbList>
          </BreadcrumbNav>
        )}

        {/* Back Button (alternative to breadcrumbs) */}
        {showBackButton && onBackClick && breadcrumbs.length === 0 && (
          <BackButton
            onClick={onBackClick}
            aria-label={`Go back: ${backButtonLabel}`}
          >
            <ArrowLeftIcon />
            {backButtonLabel}
          </BackButton>
        )}

        <TitleRow>
          <TitleGroup>
            {Icon ? (
              <IconTitleGroup>
                <Icon aria-hidden="true" />
                <PageTitle id="page-title">{title}</PageTitle>
              </IconTitleGroup>
            ) : (
              <PageTitle id="page-title">{title}</PageTitle>
            )}
            {subtitle && <PageSubtitle>{subtitle}</PageSubtitle>}

            {contextInfo.length > 0 && (
              <ContextInfo role="status" aria-label="Page context information">
                {contextInfo.map((info, index) => (
                  <React.Fragment key={index}>
                    {info.type === 'badge' && (
                      <ContextBadge>
                        {info.icon && <info.icon aria-hidden="true" />}
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
          </TitleGroup>

          {/* Action slot — children render right-aligned */}
          {children && <div style={{ display: 'flex', alignItems: 'center', gap: space[2], flexShrink: 0 }}>{children}</div>}
        </TitleRow>

        {searchProps && (
          <SearchSection role="search" aria-label={searchProps.ariaLabel || 'Search'}>
            <SearchContainer>
              <SearchIcon aria-hidden="true" />
              <SearchInput
                ref={searchInputRef}
                id={searchProps.inputId}
                placeholder={searchProps.placeholder}
                value={searchProps.value}
                onChange={searchProps.onChange}
                onKeyDown={handleKeyDown}
                disabled={searchProps.disabled || searchProps.isLoading}
                aria-label={searchProps.ariaLabel || searchProps.placeholder}
                aria-busy={searchProps.isLoading}
              />
              {searchProps.onSearch && (
                <SearchButton
                  onClick={searchProps.onSearch}
                  disabled={searchProps.disabled || searchProps.isLoading || !searchProps.value?.trim()}
                  $isLoading={searchProps.isLoading}
                  aria-label={searchProps.isLoading ? 'Searching...' : 'Search'}
                >
                  {searchProps.isLoading ? (
                    <>
                      <LoadingSpinner aria-hidden="true" />
                      <span className="sr-only">Searching...</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpIcon aria-hidden="true" />
                      Search
                    </>
                  )}
                </SearchButton>
              )}
            </SearchContainer>
            {searchProps.showHint && !searchProps.isLoading && (
              <SearchHint>
                Press <kbd>Enter</kbd> to search
              </SearchHint>
            )}
          </SearchSection>
        )}
      </HeaderContent>
    </HeaderSection>
  );
};

export default EnhancedHeader;

// Export breadcrumb type for consumers
export type { BreadcrumbItem };
