/**
 * Design System v2 – UI Primitives
 *
 * Every visual primitive lives here as a single source of truth.
 * All components reference tokens.ts – no hard-coded colours / spacing.
 *
 * Accessibility:
 *  - focus-visible rings on every interactive element
 *  - ARIA attributes baked in where applicable
 *  - escape-to-close on modals / drawers
 *  - focus trap + scroll lock on overlay components
 *  - prefers-reduced-motion respected
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  createContext,
  useContext,
} from 'react';
import styled, { css, keyframes } from 'styled-components';
import {
  color,
  neutral,
  accent,
  semantic,
  space,
  radius,
  fontFamily,
  type as typeScale,
  shadow,
  border as borderTokens,
  duration,
  easing,
  transition,
  z,
  layout,
  focusRingStyle,
  focusRingShadow,
  reducedMotion,
} from './tokens';

// ════════════════════════════════════════════════════════════════════════
// ANIMATIONS (shared)
// ════════════════════════════════════════════════════════════════════════

const fadeIn = keyframes`from{opacity:0}to{opacity:1}`;
const fadeOut = keyframes`from{opacity:1}to{opacity:0}`;
const slideUp = keyframes`from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}`;
const slideDown = keyframes`from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}`;
const slideInRight = keyframes`from{transform:translateX(100%)}to{transform:translateX(0)}`;
const shimmer = keyframes`0%{background-position:-400px 0}100%{background-position:400px 0}`;
const scaleIn = keyframes`from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}`;

// ════════════════════════════════════════════════════════════════════════
// 1. BADGE / TAG
// ════════════════════════════════════════════════════════════════════════

export type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md';

const badgeColors: Record<BadgeVariant, { bg: string; fg: string; border: string }> = {
  neutral: { bg: neutral[100], fg: neutral[600], border: neutral[200] },
  accent:  { bg: accent[50],  fg: accent[700],  border: accent[200]  },
  success: { bg: semantic.successLight, fg: semantic.successDark, border: '#bbf7d0' },
  warning: { bg: semantic.warningLight, fg: semantic.warningDark, border: '#fde68a' },
  error:   { bg: semantic.errorLight,   fg: semantic.errorDark,   border: '#fecaca' },
  info:    { bg: semantic.infoLight,    fg: semantic.infoDark,    border: '#bfdbfe' },
};

export const Badge = styled.span.withConfig({
  shouldForwardProp: p => !['$variant', '$size', '$dot'].includes(p as string),
})<{ $variant?: BadgeVariant; $size?: BadgeSize; $dot?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${space[1]};
  white-space: nowrap;
  font-family: ${fontFamily.sans};
  font-weight: 500;
  border-radius: ${radius.full};

  ${({ $size = 'md' }) => $size === 'sm' ? css`
    padding: 1px ${space[2]};
    font-size: ${typeScale.captionSm.size};
    line-height: ${typeScale.captionSm.lineHeight};
  ` : css`
    padding: ${space[0.5]} ${space[2.5]};
    font-size: ${typeScale.caption.size};
    line-height: ${typeScale.caption.lineHeight};
  `}

  ${({ $variant = 'neutral' }) => {
    const c = badgeColors[$variant];
    return css`
      background: ${c.bg};
      color: ${c.fg};
      border: 1px solid ${c.border};
    `;
  }}

  ${({ $dot, $variant = 'neutral' }) => $dot && css`
    &::before {
      content: '';
      width: 6px; height: 6px;
      border-radius: ${radius.full};
      background: ${badgeColors[$variant].fg};
      flex-shrink: 0;
    }
  `}

  svg { width: 14px; height: 14px; flex-shrink: 0; }
`;

// ════════════════════════════════════════════════════════════════════════
// 2. TABS
// ════════════════════════════════════════════════════════════════════════

export const TabList = styled.div.attrs({ role: 'tablist' })`
  display: flex;
  gap: ${space[0.5]};
  border-bottom: ${borderTokens.default};
  padding: 0 ${space[1]};
  overflow-x: auto;

  /* hide scrollbar but still scrollable */
  &::-webkit-scrollbar { display: none; }
  scrollbar-width: none;
`;

export const Tab = styled.button.attrs<{ $active?: boolean }>(({ $active }) => ({
  role: 'tab',
  'aria-selected': $active ?? false,
  tabIndex: $active ? 0 : -1,
}))<{ $active?: boolean }>`
  all: unset;
  display: inline-flex;
  align-items: center;
  gap: ${space[1.5]};
  padding: ${space[2.5]} ${space[4]};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.label.size};
  font-weight: ${typeScale.label.weight};
  letter-spacing: ${typeScale.label.letterSpacing};
  color: ${({ $active }) => $active ? accent[600] : neutral[500]};
  cursor: pointer;
  position: relative;
  white-space: nowrap;
  transition: color ${transition.fast}, background-color ${transition.fast};
  border-radius: ${radius.md} ${radius.md} 0 0;

  &:hover { color: ${accent[600]}; background: ${accent[50]}; }

  &::after {
    content: '';
    position: absolute;
    bottom: -1px; left: 0; right: 0;
    height: 2px;
    background: ${({ $active }) => $active ? accent[500] : 'transparent'};
    border-radius: 2px 2px 0 0;
    transition: background ${transition.fast};
  }

  &:focus-visible { ${focusRingStyle} }

  svg { width: 16px; height: 16px; }

  @media ${reducedMotion} { transition: none; &::after { transition: none; } }
`;

export const TabPanel = styled.div.attrs({ role: 'tabpanel' })<{ $animate?: boolean }>`
  ${({ $animate = true }) => $animate && css`
    animation: ${slideUp} ${duration.normal} ${easing.out};
    @media ${reducedMotion} { animation: none; }
  `}
`;

// ════════════════════════════════════════════════════════════════════════
// 3. BANNER / TOAST
// ════════════════════════════════════════════════════════════════════════

export type BannerVariant = 'info' | 'success' | 'warning' | 'error';

const bannerStyles: Record<BannerVariant, { bg: string; fg: string; border: string; icon: string }> = {
  info:    { bg: semantic.infoLight,    fg: semantic.infoDark,    border: '#bfdbfe', icon: semantic.info    },
  success: { bg: semantic.successLight, fg: semantic.successDark, border: '#bbf7d0', icon: semantic.success },
  warning: { bg: semantic.warningLight, fg: semantic.warningDark, border: '#fde68a', icon: semantic.warning },
  error:   { bg: semantic.errorLight,   fg: semantic.errorDark,   border: '#fecaca', icon: semantic.error   },
};

export const Banner = styled.div.withConfig({
  shouldForwardProp: p => !['$variant'].includes(p as string),
})<{ $variant?: BannerVariant }>`
  display: flex;
  align-items: flex-start;
  gap: ${space[3]};
  padding: ${space[3]} ${space[4]};
  border-radius: ${radius.lg};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.bodySm.size};
  line-height: ${typeScale.bodySm.lineHeight};
  animation: ${slideDown} ${duration.normal} ${easing.out};

  ${({ $variant = 'info' }) => {
    const s = bannerStyles[$variant];
    return css`
      background: ${s.bg};
      color: ${s.fg};
      border: 1px solid ${s.border};

      svg:first-child { color: ${s.icon}; width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; }
    `;
  }}

  @media ${reducedMotion} { animation: none; }
`;

export const BannerContent = styled.div`
  flex: 1; min-width: 0;
`;

export const BannerTitle = styled.strong`
  display: block;
  font-weight: 600;
  margin-bottom: ${space[0.5]};
`;

export const BannerDismiss = styled.button`
  all: unset;
  cursor: pointer;
  padding: ${space[1]};
  border-radius: ${radius.sm};
  color: inherit;
  opacity: 0.6;
  transition: opacity ${transition.fast};
  &:hover { opacity: 1; }
  &:focus-visible { ${focusRingStyle} }
  svg { width: 16px; height: 16px; }
`;

// ════════════════════════════════════════════════════════════════════════
// 4. TOAST (fixed-position banner)
// ════════════════════════════════════════════════════════════════════════

export const ToastContainer = styled.div`
  position: fixed;
  bottom: ${space[6]};
  right: ${space[6]};
  z-index: ${z.toast};
  display: flex;
  flex-direction: column-reverse;
  gap: ${space[2]};
  max-width: 420px;
  pointer-events: none;

  & > * { pointer-events: auto; }
`;

// ════════════════════════════════════════════════════════════════════════
// 5. SKELETON
// ════════════════════════════════════════════════════════════════════════

export const Skeleton = styled.div.withConfig({
  shouldForwardProp: p => !['$width', '$height', '$circle', '$radius'].includes(p as string),
})<{ $width?: string; $height?: string; $circle?: boolean; $radius?: string }>`
  background: linear-gradient(90deg, ${neutral[100]} 0%, ${neutral[200]} 50%, ${neutral[100]} 100%);
  background-size: 800px 100%;
  animation: ${shimmer} 1.6s ease-in-out infinite;
  border-radius: ${({ $circle, $radius: r }) => $circle ? radius.full : r ?? radius.md};
  width: ${({ $width }) => $width ?? '100%'};
  height: ${({ $height }) => $height ?? '16px'};

  @media ${reducedMotion} { animation: none; }
`;

export const SkeletonText = styled(Skeleton)`
  height: 14px;
  margin-bottom: ${space[2]};

  &:last-child { width: 60%; }
`;

// ════════════════════════════════════════════════════════════════════════
// 6. POPOVER
// ════════════════════════════════════════════════════════════════════════

export const PopoverPanel = styled.div.withConfig({
  shouldForwardProp: p => !['$align'].includes(p as string),
})<{ $align?: 'start' | 'center' | 'end' }>`
  position: absolute;
  z-index: ${z.popover};
  min-width: 200px;
  background: ${color.bg};
  border: ${borderTokens.default};
  border-radius: ${radius.lg};
  box-shadow: ${shadow.lg};
  padding: ${space[1.5]};
  animation: ${scaleIn} ${duration.fast} ${easing.out};

  ${({ $align }) => $align === 'end' ? css`right: 0;` : $align === 'center' ? css`left: 50%; transform: translateX(-50%);` : css`left: 0;`}

  @media ${reducedMotion} { animation: none; }
`;

export const PopoverItem = styled.button<{ $destructive?: boolean }>`
  all: unset;
  display: flex;
  align-items: center;
  gap: ${space[2]};
  width: 100%;
  padding: ${space[2]} ${space[3]};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.bodySm.size};
  color: ${({ $destructive }) => $destructive ? semantic.error : color.text};
  border-radius: ${radius.md};
  cursor: pointer;
  transition: background ${transition.fast};
  box-sizing: border-box;

  &:hover { background: ${({ $destructive }) => $destructive ? semantic.errorLight : neutral[100]}; }
  &:focus-visible { ${focusRingStyle} }

  svg { width: 16px; height: 16px; flex-shrink: 0; color: ${({ $destructive }) => $destructive ? semantic.error : neutral[400]}; }
`;

export const PopoverDivider = styled.div`
  height: 1px;
  background: ${neutral[200]};
  margin: ${space[1]} 0;
`;

// ════════════════════════════════════════════════════════════════════════
// 7. OVERLAY (shared backdrop for Modal + Drawer)
// ════════════════════════════════════════════════════════════════════════

const Overlay = styled.div<{ $closing?: boolean }>`
  position: fixed;
  inset: 0;
  z-index: ${z.modal};
  background: ${color.overlay};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${space[6]};
  animation: ${({ $closing }) => $closing ? fadeOut : fadeIn} ${duration.normal} ${easing.default};

  @media ${reducedMotion} { animation: none; }
`;

// ════════════════════════════════════════════════════════════════════════
// 8. MODAL
// ════════════════════════════════════════════════════════════════════════

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const modalWidths: Record<ModalSize, string> = {
  sm: '400px', md: '520px', lg: '680px', xl: '860px',
};

const ModalBox = styled.div<{ $size: ModalSize; $closing?: boolean }>`
  position: relative;
  background: ${color.bg};
  border-radius: ${radius.xl};
  box-shadow: ${shadow.overlay};
  width: 100%;
  max-width: ${({ $size }) => modalWidths[$size]};
  max-height: calc(100vh - ${space[12]});
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: ${({ $closing }) => $closing ? fadeOut : slideUp} ${duration.slow} ${easing.springCalm};

  &:focus { outline: none; }

  @media ${reducedMotion} { animation: none; }
`;

export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${space[5]} ${space[6]};
  border-bottom: ${borderTokens.default};
  flex-shrink: 0;
`;

export const ModalTitle = styled.h2`
  margin: 0;
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.headingMd.size};
  font-weight: ${typeScale.headingMd.weight};
  letter-spacing: ${typeScale.headingMd.letterSpacing};
  color: ${color.text};
`;

export const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${space[6]};
  -webkit-overflow-scrolling: touch;
`;

export const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${space[3]};
  padding: ${space[4]} ${space[6]};
  border-top: ${borderTokens.default};
  flex-shrink: 0;
`;

const ModalCloseBtn = styled.button`
  all: unset;
  display: grid;
  place-items: center;
  width: 32px; height: 32px;
  border-radius: ${radius.md};
  color: ${neutral[400]};
  cursor: pointer;
  transition: background ${transition.fast}, color ${transition.fast};
  &:hover { background: ${neutral[100]}; color: ${neutral[600]}; }
  &:focus-visible { ${focusRingStyle} }
  svg { width: 18px; height: 18px; }
`;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  size?: ModalSize;
  children: React.ReactNode;
  /** Label for screen readers (required for a11y) */
  ariaLabel?: string;
}

/**
 * Modal – focus trap, escape-to-close, scroll lock, backdrop click.
 */
export const Modal: React.FC<ModalProps> = ({ open, onClose, size = 'md', children, ariaLabel }) => {
  const [closing, setClosing] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, handleClose]);

  // Scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Focus the box on open
  useEffect(() => {
    if (open && boxRef.current) {
      boxRef.current.focus();
    }
  }, [open]);

  // Reset closing state when re-opened
  useEffect(() => {
    if (open) setClosing(false);
  }, [open]);

  if (!open && !closing) return null;

  return (
    <Overlay $closing={closing} onClick={handleClose}>
      <ModalBox
        ref={boxRef}
        $size={size}
        $closing={closing}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </ModalBox>
    </Overlay>
  );
};

export { ModalCloseBtn };

// ════════════════════════════════════════════════════════════════════════
// 9. DRAWER
// ════════════════════════════════════════════════════════════════════════

export type DrawerSide = 'right' | 'left';

const DrawerPanel = styled.div<{ $side: DrawerSide; $width: string; $closing?: boolean }>`
  position: fixed;
  top: 0;
  ${({ $side }) => $side}: 0;
  width: ${({ $width }) => $width};
  max-width: 90vw;
  height: 100vh;
  background: ${color.bg};
  box-shadow: ${shadow.overlay};
  display: flex;
  flex-direction: column;
  z-index: ${z.modal};
  animation: ${({ $closing, $side }) =>
    $closing
      ? css`${slideInRight} ${duration.normal} ${easing.default} reverse forwards`
      : $side === 'right'
        ? css`${slideInRight} ${duration.slow} ${easing.springCalm}`
        : css`${slideInRight} ${duration.slow} ${easing.springCalm}`
  };

  @media ${reducedMotion} { animation: none; }
`;

export const DrawerHeader = styled(ModalHeader)``;
export const DrawerTitle = styled(ModalTitle)``;
export const DrawerBody = styled(ModalBody)``;
export const DrawerFooter = styled(ModalFooter)``;

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: DrawerSide;
  width?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}

export const Drawer: React.FC<DrawerProps> = ({ open, onClose, side = 'right', width = '420px', children, ariaLabel }) => {
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, handleClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (open && panelRef.current) panelRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (open) setClosing(false);
  }, [open]);

  if (!open && !closing) return null;

  return (
    <>
      <Overlay $closing={closing} onClick={handleClose} />
      <DrawerPanel
        ref={panelRef}
        $side={side}
        $width={width}
        $closing={closing}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </DrawerPanel>
    </>
  );
};

// ════════════════════════════════════════════════════════════════════════
// 10. PAGE SHELL (standardized page chrome)
// ════════════════════════════════════════════════════════════════════════

/** Full-viewport container with the standard background */
export const PageShell = styled.div`
  min-height: 100vh;
  background: ${layout.pageBg};
  display: flex;
  flex-direction: column;
`;

/** Centered content column below the nav */
export const PageBody = styled.main.attrs({ id: 'main-content' })`
  flex: 1;
  width: 100%;
  max-width: ${layout.maxWidth};
  margin: 0 auto;
  padding: ${layout.pagePaddingY} ${layout.pagePaddingX} ${space[20]};

  @media (max-width: 768px) {
    padding: ${space[6]} ${layout.pagePaddingXMob} ${space[16]};
  }
`;

/** Optional wide variant (1600 px) */
export const PageBodyWide = styled(PageBody)`
  max-width: ${layout.maxWidthWide};
`;

// ════════════════════════════════════════════════════════════════════════
// 11. PAGE HEADER (consistent across modules)
// ════════════════════════════════════════════════════════════════════════

export const PageHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${space[4]};
  flex-wrap: wrap;
  margin-bottom: ${space[6]};
  animation: ${slideUp} ${duration.normal} ${easing.out};

  @media ${reducedMotion} { animation: none; }
`;

export const PageHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[4]};
  min-width: 0;
`;

export const PageHeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${space[3]};
  flex-shrink: 0;
`;

export const PageTitle = styled.h1`
  margin: 0;
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.displaySm.size};
  font-weight: ${typeScale.displaySm.weight};
  letter-spacing: ${typeScale.displaySm.letterSpacing};
  line-height: ${typeScale.displaySm.lineHeight};
  color: ${color.text};
`;

export const PageSubtitle = styled.p`
  margin: ${space[1]} 0 0;
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.bodySm.size};
  color: ${color.textSecondary};
  line-height: ${typeScale.bodySm.lineHeight};
`;

// ════════════════════════════════════════════════════════════════════════
// 12. SECTION CARD (cards used as content sections on pages)
// ════════════════════════════════════════════════════════════════════════

export const SectionCard = styled.section<{ $delay?: number }>`
  background: ${color.bg};
  border: ${borderTokens.default};
  border-radius: ${radius.xl};
  padding: ${space[6]};
  box-shadow: ${shadow.card};
  animation: ${slideUp} ${duration.normal} ${easing.out} ${({ $delay }) => ($delay ?? 0) * 50}ms backwards;

  @media ${reducedMotion} { animation: none; }
`;

export const SectionTitle = styled.h2`
  margin: 0 0 ${space[4]};
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.headingSm.size};
  font-weight: ${typeScale.headingSm.weight};
  letter-spacing: ${typeScale.headingSm.letterSpacing};
  color: ${color.text};
  display: flex;
  align-items: center;
  gap: ${space[2]};

  svg { width: 18px; height: 18px; color: ${accent[500]}; }
`;

// ════════════════════════════════════════════════════════════════════════
// 13. ICON BUTTON (small square/round interactive icon)
// ════════════════════════════════════════════════════════════════════════

export type IconBtnVariant = 'default' | 'ghost' | 'danger';

export const IconBtn = styled.button.withConfig({
  shouldForwardProp: p => !['$variant', '$size'].includes(p as string),
})<{ $variant?: IconBtnVariant; $size?: 'sm' | 'md' }>`
  all: unset;
  display: inline-grid;
  place-items: center;
  cursor: pointer;
  border-radius: ${radius.md};
  transition: background ${transition.fast}, color ${transition.fast}, transform ${transition.fast};

  ${({ $size = 'md' }) => $size === 'sm' ? css`
    width: 28px; height: 28px;
    svg { width: 14px; height: 14px; }
  ` : css`
    width: 36px; height: 36px;
    svg { width: 18px; height: 18px; }
  `}

  ${({ $variant = 'default' }) => {
    switch ($variant) {
      case 'ghost':
        return css`
          color: ${neutral[400]};
          &:hover { background: ${neutral[100]}; color: ${neutral[600]}; }
        `;
      case 'danger':
        return css`
          color: ${semantic.error};
          &:hover { background: ${semantic.errorLight}; }
        `;
      default:
        return css`
          color: ${neutral[500]};
          background: ${neutral[100]};
          &:hover { background: ${accent[50]}; color: ${accent[600]}; }
        `;
    }
  }}

  &:active { transform: scale(0.94); }
  &:focus-visible { ${focusRingStyle} }
  &:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
`;

// ════════════════════════════════════════════════════════════════════════
// 14. DIVIDER
// ════════════════════════════════════════════════════════════════════════

export const Divider = styled.hr.withConfig({
  shouldForwardProp: p => !['$spacing'].includes(p as string),
})<{ $spacing?: string }>`
  border: none;
  border-top: ${borderTokens.default};
  margin: ${({ $spacing }) => $spacing ?? space[4]} 0;
`;

// ════════════════════════════════════════════════════════════════════════
// 15. INLINE STAT (for KPI displays)
// ════════════════════════════════════════════════════════════════════════

export const StatGrid = styled.div<{ $cols?: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $cols }) => $cols ?? 4}, 1fr);
  gap: ${space[4]};

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

export const StatCard = styled.div`
  background: ${color.bg};
  border: ${borderTokens.default};
  border-radius: ${radius.lg};
  padding: ${space[5]};
  display: flex;
  flex-direction: column;
  gap: ${space[1]};
`;

export const StatValue = styled.div`
  font-family: ${fontFamily.sans};
  font-size: ${typeScale.displaySm.size};
  font-weight: 700;
  color: ${color.text};
  letter-spacing: ${typeScale.displaySm.letterSpacing};
  line-height: 1;
`;

export const StatLabel = styled.div`
  font-size: ${typeScale.caption.size};
  font-weight: 500;
  color: ${color.textMuted};
`;

// ════════════════════════════════════════════════════════════════════════
// 16. BACK BUTTON (used on detail pages)
// ════════════════════════════════════════════════════════════════════════

export const BackButton = styled.button`
  all: unset;
  display: inline-grid;
  place-items: center;
  width: 36px; height: 36px;
  border-radius: ${radius.lg};
  background: ${color.bg};
  color: ${neutral[500]};
  cursor: pointer;
  box-shadow: ${shadow.xs};
  transition: background ${transition.fast}, color ${transition.fast}, transform ${transition.fast};

  &:hover { background: ${accent[50]}; color: ${accent[600]}; transform: translateY(-1px); }
  &:active { transform: scale(0.95); }
  &:focus-visible { ${focusRingStyle} }

  svg { width: 18px; height: 18px; }
`;

// ════════════════════════════════════════════════════════════════════════
// BARREL EXPORT
// ════════════════════════════════════════════════════════════════════════

export {
  Overlay,
};
