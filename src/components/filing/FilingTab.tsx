/**
 * FilingTab  (Design System v2)
 *
 * Embeddable panel for ChangeSetDetail showing filing package generation,
 * build progress, and download for completed packages.
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  DocumentArrowDownIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  GlobeAmericasIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import {
  color, neutral, accent, semantic,
  space, radius, shadow, fontFamily,
  type as t, border as borderTokens,
  duration, focusRingStyle, reducedMotion,
} from '@/ui/tokens';
import { Badge } from '@/ui/components';
import {
  subscribeToChangeSetPackages,
  requestBuild,
  getPackageDownloadUrl,
} from '@/services/filingPackageService';
import type { FilingPackage, FilingPackageStatus, FILING_PACKAGE_STATUS_CONFIG } from '@/types/filingPackage';

// ════════════════════════════════════════════════════════════════════════
// Styled
// ════════════════════════════════════════════════════════════════════════

const fadeIn = keyframes`from{opacity:0}to{opacity:1}`;

const Panel = styled.div`
  background: ${color.bg};
  border: ${borderTokens.default};
  border-radius: ${radius.xl};
  overflow: hidden;
  animation: ${fadeIn} ${duration.normal} ease;
  @media ${reducedMotion} { animation: none; }
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${space[3]} ${space[4]};
  border-bottom: ${borderTokens.default};
  background: ${neutral[50]};
`;

const PanelTitle = styled.h3`
  margin: 0;
  font-family: ${fontFamily.sans};
  font-size: ${t.bodySm.size};
  font-weight: 600;
  color: ${color.text};
  display: flex;
  align-items: center;
  gap: ${space[2]};

  svg { width: 16px; height: 16px; }
`;

const ActionRow = styled.div`
  display: flex;
  gap: ${space[2]};
  padding: ${space[3]} ${space[4]};
  border-bottom: ${borderTokens.default};
`;

const ActionBtn = styled.button<{ $variant?: 'primary' | 'default' }>`
  display: flex;
  align-items: center;
  gap: ${space[1.5]};
  padding: ${space[1.5]} ${space[3]};
  border-radius: ${radius.md};
  border: 1px solid ${({ $variant }) => $variant === 'primary' ? accent[500] : neutral[200]};
  background: ${({ $variant }) => $variant === 'primary' ? accent[500] : color.bg};
  color: ${({ $variant }) => $variant === 'primary' ? 'white' : color.text};
  font-family: ${fontFamily.sans};
  font-size: ${t.captionSm.size};
  font-weight: 500;
  cursor: pointer;
  transition: all ${duration.fast} ease;

  &:hover {
    background: ${({ $variant }) => $variant === 'primary' ? accent[600] : neutral[50]};
  }
  &:focus-visible { ${focusRingStyle} }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  svg { width: 14px; height: 14px; }
`;

const PackageRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 100px 100px 80px 120px;
  align-items: center;
  gap: ${space[2]};
  padding: ${space[2.5]} ${space[4]};
  border-bottom: 1px solid ${neutral[100]};

  &:last-child { border-bottom: none; }
  &:hover { background: ${neutral[50]}; }
`;

const PackageName = styled.div`
  font-family: ${fontFamily.sans};
  font-size: ${t.captionSm.size};
  font-weight: 500;
  color: ${color.text};
`;

const PackageMeta = styled.div`
  font-size: 11px;
  color: ${color.textMuted};
  margin-top: 1px;
`;

const ProgressBar = styled.div<{ $progress: number }>`
  height: 6px;
  border-radius: 3px;
  background: ${neutral[200]};
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: ${({ $progress }) => $progress}%;
    background: ${accent[500]};
    border-radius: 3px;
    transition: width ${duration.normal} ease;
  }
`;

const DownloadBtn = styled.button`
  display: flex;
  align-items: center;
  gap: ${space[1]};
  padding: ${space[1]} ${space[2]};
  border-radius: ${radius.md};
  border: 1px solid ${accent[300]};
  background: ${accent[50]};
  color: ${accent[700]};
  font-family: ${fontFamily.sans};
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all ${duration.fast} ease;

  &:hover { background: ${accent[100]}; }
  &:focus-visible { ${focusRingStyle} }

  svg { width: 13px; height: 13px; }
`;

const EmptyText = styled.div`
  padding: ${space[6]} ${space[4]};
  text-align: center;
  font-size: ${t.captionSm.size};
  color: ${color.textMuted};
`;

// ════════════════════════════════════════════════════════════════════════
// Config
// ════════════════════════════════════════════════════════════════════════

const STATUS_BADGE: Record<FilingPackageStatus, { variant: 'neutral' | 'warning' | 'success' | 'error'; label: string }> = {
  queued:   { variant: 'neutral', label: 'Queued' },
  building: { variant: 'warning', label: 'Building' },
  complete: { variant: 'success', label: 'Complete' },
  failed:   { variant: 'error',   label: 'Failed' },
};

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════

interface FilingTabProps {
  orgId: string;
  changeSetId: string;
}

const FilingTab: React.FC<FilingTabProps> = ({ orgId, changeSetId }) => {
  const [packages, setPackages] = useState<FilingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [buildingScope, setBuildingScope] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !changeSetId) return;
    setLoading(true);
    const unsub = subscribeToChangeSetPackages(orgId, changeSetId, (pkgs) => {
      setPackages(pkgs);
      setLoading(false);
    });
    return unsub;
  }, [orgId, changeSetId]);

  const handleBuild = useCallback(async (scope: 'full' | 'state', stateCode?: string) => {
    const key = scope === 'state' ? `state-${stateCode}` : 'full';
    setBuildingScope(key);
    try {
      await requestBuild(orgId, changeSetId, scope, stateCode);
    } catch (err) {
      console.error('Build request failed:', err);
    } finally {
      setBuildingScope(null);
    }
  }, [orgId, changeSetId]);

  const handleDownload = useCallback(async (pkg: FilingPackage) => {
    if (!pkg.storagePath) return;
    try {
      const url = await getPackageDownloadUrl(pkg.storagePath);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Download failed:', err);
    }
  }, []);

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>
          <DocumentArrowDownIcon /> Filing Packages
        </PanelTitle>
        <Badge $variant="neutral" $size="sm">{packages.length} package{packages.length !== 1 ? 's' : ''}</Badge>
      </PanelHeader>

      <ActionRow>
        <ActionBtn
          $variant="primary"
          onClick={() => handleBuild('full')}
          disabled={buildingScope !== null}
        >
          <PlayIcon /> Generate Full Package
        </ActionBtn>
      </ActionRow>

      {loading && <EmptyText>Loading packages…</EmptyText>}

      {!loading && packages.length === 0 && (
        <EmptyText>No filing packages yet. Generate one to create a filing-ready export bundle.</EmptyText>
      )}

      {packages.map(pkg => {
        const sb = STATUS_BADGE[pkg.status];
        return (
          <PackageRow key={pkg.id}>
            <div>
              <PackageName>
                {pkg.scope === 'state' && pkg.stateName
                  ? `${pkg.stateName} (${pkg.stateCode})`
                  : 'Full Package'}
              </PackageName>
              <PackageMeta>
                {pkg.artifactCount} artifact{pkg.artifactCount !== 1 ? 's' : ''}
                {pkg.buildDurationMs ? ` · ${(pkg.buildDurationMs / 1000).toFixed(1)}s` : ''}
              </PackageMeta>
            </div>

            <Badge $variant={sb.variant} $size="sm">{sb.label}</Badge>

            {pkg.status === 'building' ? (
              <ProgressBar $progress={pkg.progress} />
            ) : (
              <span style={{ fontSize: 11, color: neutral[400] }}>
                {pkg.exhibits.length} file{pkg.exhibits.length !== 1 ? 's' : ''}
              </span>
            )}

            <span style={{ fontSize: 11, color: neutral[400] }}>
              {pkg.effectiveStart || '—'}
            </span>

            {pkg.status === 'complete' && pkg.storagePath ? (
              <DownloadBtn onClick={() => handleDownload(pkg)} aria-label="Download package">
                <DocumentArrowDownIcon /> Download
              </DownloadBtn>
            ) : pkg.status === 'failed' ? (
              <span style={{ fontSize: 11, color: semantic.error }}>{pkg.error || 'Error'}</span>
            ) : (
              <span />
            )}
          </PackageRow>
        );
      })}
    </Panel>
  );
};

export default FilingTab;
