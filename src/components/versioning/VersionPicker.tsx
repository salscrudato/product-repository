/**
 * VersionPicker Component
 * Shared dropdown for selecting a version across all versioned modules
 */

import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import {
  ChevronDownIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  ArchiveBoxIcon,
  EyeIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { VersionedDocument, VersionStatus, VERSION_STATUS_CONFIG } from '@/types/versioning';
import { formatVersionNumber } from '@/utils/versioningUtils';
import { colors } from '@/components/common/DesignSystem';

// ============================================================================
// Types
// ============================================================================

interface VersionPickerProps<T> {
  versions: VersionedDocument<T>[];
  selectedVersionId: string | null;
  onSelectVersion: (versionId: string) => void;
  onCreateDraft?: () => void;
  disabled?: boolean;
  compact?: boolean;
}

// ============================================================================
// Status Icons
// ============================================================================

const statusIcons: Record<VersionStatus, React.ReactNode> = {
  draft: <PencilSquareIcon />,
  review: <EyeIcon />,
  approved: <CheckCircleIcon />,
  filed: <PaperAirplaneIcon />,
  published: <CheckCircleIcon />,
  archived: <ArchiveBoxIcon />,
};

// ============================================================================
// Component
// ============================================================================

function VersionPicker<T>({
  versions,
  selectedVersionId,
  onSelectVersion,
  onCreateDraft,
  disabled = false,
  compact = false,
}: VersionPickerProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedVersion = versions.find(v => v.id === selectedVersionId);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (versionId: string) => {
    onSelectVersion(versionId);
    setIsOpen(false);
  };

  return (
    <Container ref={containerRef}>
      <Trigger
        onClick={() => !disabled && setIsOpen(!isOpen)}
        $disabled={disabled}
        $compact={compact}
      >
        {selectedVersion ? (
          <>
            <StatusBadge $status={selectedVersion.status} $compact={compact}>
              {statusIcons[selectedVersion.status]}
              {formatVersionNumber(selectedVersion.versionNumber)}
            </StatusBadge>
            <StatusLabel $compact={compact}>
              {VERSION_STATUS_CONFIG[selectedVersion.status].label}
            </StatusLabel>
          </>
        ) : (
          <Placeholder>Select version...</Placeholder>
        )}
        <ChevronIcon $open={isOpen}>
          <ChevronDownIcon />
        </ChevronIcon>
      </Trigger>

      {isOpen && (
        <Dropdown>
          <DropdownHeader>Versions</DropdownHeader>
          <VersionList>
            {versions.map(version => (
              <VersionItem
                key={version.id}
                $selected={version.id === selectedVersionId}
                $status={version.status}
                onClick={() => handleSelect(version.id)}
              >
                <VersionIcon $status={version.status}>
                  {statusIcons[version.status]}
                </VersionIcon>
                <VersionInfo>
                  <VersionLabel>
                    {formatVersionNumber(version.versionNumber)}
                    <StatusTag $status={version.status}>
                      {VERSION_STATUS_CONFIG[version.status].label}
                    </StatusTag>
                  </VersionLabel>
                  {version.summary && (
                    <VersionSummary>{version.summary}</VersionSummary>
                  )}
                </VersionInfo>
              </VersionItem>
            ))}
          </VersionList>
          {onCreateDraft && (
            <>
              <Divider />
              <CreateDraftButton onClick={() => { onCreateDraft(); setIsOpen(false); }}>
                <DocumentDuplicateIcon />
                Create Draft from Current
              </CreateDraftButton>
            </>
          )}
        </Dropdown>
      )}
    </Container>
  );
}

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div`
  position: relative;
  display: inline-block;
`;

const Trigger = styled.button<{ $disabled: boolean; $compact: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ $compact }) => $compact ? '6px' : '10px'};
  padding: ${({ $compact }) => $compact ? '6px 10px' : '10px 14px'};
  background: white;
  border: 1.5px solid ${colors.gray200};
  border-radius: 10px;
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ $disabled }) => $disabled ? 0.6 : 1};
  transition: all 0.2s ease;
  min-width: ${({ $compact }) => $compact ? '140px' : '200px'};

  &:hover:not(:disabled) {
    border-color: ${colors.primary};
    background: ${colors.gray50};
  }
`;

const StatusBadge = styled.div<{ $status: VersionStatus; $compact: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: ${({ $compact }) => $compact ? '2px 6px' : '4px 8px'};
  background: ${({ $status }) => `${VERSION_STATUS_CONFIG[$status].color}15`};
  color: ${({ $status }) => VERSION_STATUS_CONFIG[$status].color};
  border-radius: 6px;
  font-size: ${({ $compact }) => $compact ? '11px' : '12px'};
  font-weight: 600;

  svg {
    width: ${({ $compact }) => $compact ? '12px' : '14px'};
    height: ${({ $compact }) => $compact ? '12px' : '14px'};
  }
`;

const StatusLabel = styled.span<{ $compact: boolean }>`
  font-size: ${({ $compact }) => $compact ? '12px' : '13px'};
  color: ${colors.gray600};
  font-weight: 500;
`;

const Placeholder = styled.span`
  font-size: 13px;
  color: ${colors.gray400};
`;

const ChevronIcon = styled.div<{ $open: boolean }>`
  margin-left: auto;
  width: 16px;
  height: 16px;
  color: ${colors.gray400};
  transform: rotate(${({ $open }) => $open ? '180deg' : '0deg'});
  transition: transform 0.2s ease;
  svg { width: 100%; height: 100%; }
`;

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 280px;
  background: white;
  border: 1px solid ${colors.gray200};
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  overflow: hidden;
`;

const DropdownHeader = styled.div`
  padding: 12px 16px;
  font-size: 11px;
  font-weight: 600;
  color: ${colors.gray500};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid ${colors.gray100};
`;

const VersionList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  padding: 8px;
`;

const VersionItem = styled.div<{ $selected: boolean; $status: VersionStatus }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  background: ${({ $selected }) => $selected ? `${colors.primary}08` : 'transparent'};
  border: 1px solid ${({ $selected }) => $selected ? `${colors.primary}30` : 'transparent'};
  transition: all 0.15s ease;

  &:hover {
    background: ${({ $selected }) => $selected ? `${colors.primary}12` : colors.gray50};
  }
`;

const VersionIcon = styled.div<{ $status: VersionStatus }>`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: ${({ $status }) => `${VERSION_STATUS_CONFIG[$status].color}15`};
  color: ${({ $status }) => VERSION_STATUS_CONFIG[$status].color};
  svg { width: 14px; height: 14px; }
`;

const VersionInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const VersionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${colors.gray800};
`;

const StatusTag = styled.span<{ $status: VersionStatus }>`
  font-size: 10px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${({ $status }) => `${VERSION_STATUS_CONFIG[$status].color}15`};
  color: ${({ $status }) => VERSION_STATUS_CONFIG[$status].color};
`;

const VersionSummary = styled.div`
  font-size: 12px;
  color: ${colors.gray500};
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Divider = styled.div`
  height: 1px;
  background: ${colors.gray100};
  margin: 4px 0;
`;

const CreateDraftButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  background: transparent;
  border: none;
  font-size: 13px;
  font-weight: 500;
  color: ${colors.primary};
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: ${colors.gray50};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

export default VersionPicker;

