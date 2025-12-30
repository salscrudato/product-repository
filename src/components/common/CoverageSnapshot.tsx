import React from 'react';
import {
  ShieldCheckIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  MapIcon
} from '@heroicons/react/24/outline';

import {
  EnhancedCard,
  CardHeader,
  CardTitle,
  CardSubtitle,
  CardContent,
  TypeBadge,
  CountBadge
} from './DesignSystem';
import { TextMuted, Code } from './Typography';

interface CoverageSnapshotProps {
  name: string;
  coverageCode?: string | undefined;
  isOptional?: boolean | undefined;
  productName?: string | undefined;
  parentCoverageName?: string | undefined;
  statesCount?: number | undefined;
  formsCount?: number | undefined;
  rulesCount?: number | undefined;
  healthLabel?: string | undefined;
  healthScore?: number | undefined;
  healthTooltip?: string | undefined;
  valuationLabel?: string | undefined;
  territoryLabel?: string | undefined;
  coinsuranceLabel?: string | undefined;
  waitingPeriodLabel?: string | undefined;
}

interface MetricBadgeProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  count?: number;
}

const MetricBadge: React.FC<MetricBadgeProps> = ({ icon: Icon, label, count }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
    <Icon width={16} height={16} />
    <span>{label}</span>
    {typeof count === 'number' && (
      <CountBadge $variant={count > 0 ? 'success' : 'default'}>
        {count}
      </CountBadge>
    )}
  </div>
);

const AttributePill: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 10px',
      borderRadius: 9999,
      background: 'rgba(148, 163, 184, 0.12)',
      color: '#0f172a',
      fontSize: 12,
      fontWeight: 500,
      whiteSpace: 'nowrap'
    }}
  >
    <span style={{ opacity: 0.75 }}>{label}:</span>
    <span>{value}</span>
  </span>
);

export const CoverageSnapshot: React.FC<CoverageSnapshotProps> = ({
  name,
  coverageCode,
  isOptional,
  productName,
  parentCoverageName,
  statesCount,
  formsCount,
  rulesCount,
  healthLabel,
  healthScore,
  healthTooltip,
  valuationLabel,
  territoryLabel,
  coinsuranceLabel,
  waitingPeriodLabel
}) => {
  const hasAttributes = !!(
    valuationLabel ||
    territoryLabel ||
    coinsuranceLabel ||
    waitingPeriodLabel
  );

  return (
    <EnhancedCard $variant="outlined">
      <CardHeader>
        <div>
          <CardTitle>
            <ShieldCheckIcon width={18} height={18} />
            {name}
            {typeof isOptional === 'boolean' && (
              <TypeBadge $color={isOptional ? '#0ea5e9' : '#10b981'}>
                {isOptional ? 'Optional coverage' : 'Required coverage'}
              </TypeBadge>
            )}
          </CardTitle>
          <CardSubtitle>
            {coverageCode && <Code>{coverageCode}</Code>}
            {productName && (
              <>
                {' · '} {productName}
              </>
            )}
            {parentCoverageName && (
              <>
                {' · '} Sub-coverage of {parentCoverageName}
              </>
            )}
          </CardSubtitle>
        </div>

        {healthLabel && typeof healthScore === 'number' && (
          <div style={{ textAlign: 'right' }} title={healthTooltip}>
            <TextMuted>Coverage health</TextMuted>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {healthLabel} · {healthScore}%
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: hasAttributes ? 12 : 0 }}>
          {typeof statesCount === 'number' && (
            <MetricBadge icon={MapIcon} label="States" count={statesCount} />
          )}
          {typeof formsCount === 'number' && (
            <MetricBadge icon={DocumentTextIcon} label="Forms" count={formsCount} />
          )}
          {typeof rulesCount === 'number' && (
            <MetricBadge icon={Cog6ToothIcon} label="Rules" count={rulesCount} />
          )}
        </div>

        {hasAttributes && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {valuationLabel && <AttributePill label="Valuation" value={valuationLabel} />}
            {territoryLabel && <AttributePill label="Territory" value={territoryLabel} />}
            {coinsuranceLabel && <AttributePill label="Coinsurance" value={coinsuranceLabel} />}
            {waitingPeriodLabel && <AttributePill label="Wait" value={waitingPeriodLabel} />}
          </div>
        )}
      </CardContent>
    </EnhancedCard>
  );
};

export default CoverageSnapshot;

