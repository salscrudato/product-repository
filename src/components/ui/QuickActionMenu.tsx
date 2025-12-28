// src/components/ui/QuickActionMenu.tsx
import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  EllipsisVerticalIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  LinkIcon,
  CheckIcon,
  StarIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';

/* ---------- Animations ---------- */
const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.95) translateY(-4px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
`;

const fadeOut = keyframes`
  from { opacity: 1; transform: scale(1) translateY(0); }
  to { opacity: 0; transform: scale(0.95) translateY(-4px); }
`;

/* ---------- Container ---------- */
const MenuContainer = styled.div`
  position: relative;
  display: inline-flex;
`;

const TriggerButton = styled.button<{ $isOpen?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: ${({ $isOpen }) => $isOpen ? 'rgba(99, 102, 241, 0.1)' : 'transparent'};
  color: ${({ $isOpen }) => $isOpen ? '#6366f1' : '#64748b'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
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

/* ---------- Dropdown ---------- */
const DropdownWrapper = styled.div<{ $isOpen: boolean; $position?: 'left' | 'right' }>`
  position: absolute;
  top: calc(100% + 4px);
  ${({ $position }) => $position === 'left' ? 'left: 0;' : 'right: 0;'}
  min-width: 200px;
  background: white;
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08);
  z-index: 1000;
  overflow: hidden;
  animation: ${({ $isOpen }) => $isOpen ? fadeIn : fadeOut} 0.15s ease-out forwards;
  pointer-events: ${({ $isOpen }) => $isOpen ? 'auto' : 'none'};
`;

const MenuSection = styled.div`
  padding: 6px;

  &:not(:last-child) {
    border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  }
`;

const SectionLabel = styled.div`
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const MenuItem = styled.button<{ $variant?: 'default' | 'danger' | 'success' }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;

  ${({ $variant = 'default' }) => {
    switch ($variant) {
      case 'danger':
        return css`
          color: #ef4444;

          &:hover {
            background: rgba(239, 68, 68, 0.1);
          }
        `;
      case 'success':
        return css`
          color: #10b981;

          &:hover {
            background: rgba(16, 185, 129, 0.1);
          }
        `;
      default:
        return css`
          color: #374151;

          &:hover {
            background: rgba(99, 102, 241, 0.08);
            color: #6366f1;
          }
        `;
    }
  }}

  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  &:focus-visible {
    outline: 2px solid rgba(99, 102, 241, 0.4);
    outline-offset: -2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;

    &:hover {
      background: transparent;
      color: inherit;
    }
  }
`;

const MenuItemLabel = styled.span`
  flex: 1;
`;

const MenuItemShortcut = styled.span`
  font-size: 12px;
  color: #94a3b8;
  font-weight: 400;
`;

/* ---------- Preset Action Types ---------- */
export interface ActionItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success';
  shortcut?: string;
  disabled?: boolean;
}

export interface ActionSection {
  label?: string;
  items: ActionItem[];
}

/* ---------- Common Action Presets ---------- */
export const commonActions = {
  view: (onClick: () => void): ActionItem => ({
    id: 'view',
    label: 'View Details',
    icon: EyeIcon,
    onClick,
    shortcut: 'Enter',
  }),
  edit: (onClick: () => void): ActionItem => ({
    id: 'edit',
    label: 'Edit',
    icon: PencilIcon,
    onClick,
    shortcut: 'E',
  }),
  duplicate: (onClick: () => void): ActionItem => ({
    id: 'duplicate',
    label: 'Duplicate',
    icon: DocumentDuplicateIcon,
    onClick,
    shortcut: '⌘D',
  }),
  delete: (onClick: () => void): ActionItem => ({
    id: 'delete',
    label: 'Delete',
    icon: TrashIcon,
    onClick,
    variant: 'danger' as const,
  }),
  download: (onClick: () => void): ActionItem => ({
    id: 'download',
    label: 'Download',
    icon: ArrowDownTrayIcon,
    onClick,
  }),
  copyLink: (onClick: () => void): ActionItem => ({
    id: 'copyLink',
    label: 'Copy Link',
    icon: LinkIcon,
    onClick,
    shortcut: '⌘L',
  }),
  archive: (onClick: () => void): ActionItem => ({
    id: 'archive',
    label: 'Archive',
    icon: ArchiveBoxIcon,
    onClick,
  }),
  favorite: (onClick: () => void, isFavorite = false): ActionItem => ({
    id: 'favorite',
    label: isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
    icon: StarIcon,
    onClick,
    variant: isFavorite ? 'success' : 'default',
  }),
  markComplete: (onClick: () => void, isComplete = false): ActionItem => ({
    id: 'markComplete',
    label: isComplete ? 'Mark Incomplete' : 'Mark Complete',
    icon: CheckIcon,
    onClick,
    variant: isComplete ? 'default' : 'success',
  }),
};

/* ---------- Component Props ---------- */
interface QuickActionMenuProps {
  sections: ActionSection[];
  position?: 'left' | 'right';
  triggerIcon?: React.ComponentType<{ className?: string }>;
  onOpenChange?: (isOpen: boolean) => void;
}

/* ---------- Main Component ---------- */
const QuickActionMenu: React.FC<QuickActionMenuProps> = memo(({
  sections,
  position = 'right',
  triggerIcon: TriggerIcon = EllipsisVerticalIcon,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => {
    const newState = !isOpen;
    setIsOpen(newState);
    onOpenChange?.(newState);
  }, [isOpen, onOpenChange]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  const handleItemClick = useCallback((action: () => void) => {
    action();
    handleClose();
  }, [handleClose]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, handleClose]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const buttons = menuRef.current.querySelectorAll('button:not(:disabled)');
    if (buttons.length > 0) {
      (buttons[0] as HTMLButtonElement).focus();
    }
  }, [isOpen]);

  return (
    <MenuContainer ref={containerRef}>
      <TriggerButton
        $isOpen={isOpen}
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Actions menu"
      >
        <TriggerIcon />
      </TriggerButton>

      {isOpen && (
        <DropdownWrapper
          ref={menuRef}
          $isOpen={isOpen}
          $position={position}
          role="menu"
          aria-orientation="vertical"
        >
          {sections.map((section, sectionIndex) => (
            <MenuSection key={sectionIndex}>
              {section.label && <SectionLabel>{section.label}</SectionLabel>}
              {section.items.map((item) => (
                <MenuItem
                  key={item.id}
                  $variant={item.variant}
                  onClick={() => handleItemClick(item.onClick)}
                  disabled={item.disabled}
                  role="menuitem"
                >
                  {item.icon && <item.icon />}
                  <MenuItemLabel>{item.label}</MenuItemLabel>
                  {item.shortcut && <MenuItemShortcut>{item.shortcut}</MenuItemShortcut>}
                </MenuItem>
              ))}
            </MenuSection>
          ))}
        </DropdownWrapper>
      )}
    </MenuContainer>
  );
});

QuickActionMenu.displayName = 'QuickActionMenu';

export default QuickActionMenu;

