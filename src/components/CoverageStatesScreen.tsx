import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import styled, { keyframes, css } from 'styled-components';
import {
  ChevronLeftIcon,
  CheckIcon,
  MapPinIcon,
  GlobeAmericasIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  BuildingOffice2Icon,
  SunIcon,
  HomeModernIcon,
  FireIcon,
  CloudIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import { colors, gradients } from '@components/common/DesignSystem';
import { useToast, createToastHelpers } from '@components/common/Toast';

// Region icon components
const RegionIcons: Record<string, React.FC<{ className?: string }>> = {
  Northeast: BuildingOffice2Icon,
  Southeast: SunIcon,
  Midwest: HomeModernIcon,
  Southwest: FireIcon,
  West: CloudIcon,
};

// Region definitions with metadata
const STATE_REGIONS = {
  Northeast: { states: ['CT', 'DE', 'MA', 'MD', 'ME', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT'], color: '#6366f1' },
  Southeast: { states: ['AL', 'AR', 'FL', 'GA', 'KY', 'LA', 'MS', 'NC', 'SC', 'TN', 'VA', 'WV'], color: '#f59e0b' },
  Midwest: { states: ['IA', 'IL', 'IN', 'KS', 'MI', 'MN', 'MO', 'ND', 'NE', 'OH', 'SD', 'WI'], color: '#10b981' },
  Southwest: { states: ['AZ', 'NM', 'OK', 'TX'], color: '#ef4444' },
  West: { states: ['AK', 'CA', 'CO', 'HI', 'ID', 'MT', 'NV', 'OR', 'UT', 'WA', 'WY'], color: '#8b5cf6' },
};

// ============ Animations ============
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const ripple = keyframes`
  0% { transform: scale(0); opacity: 0.5; }
  100% { transform: scale(2.5); opacity: 0; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// ============ Main Layout ============
const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 0;
  position: relative;
  overflow: hidden;
`;

const TopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  animation: ${fadeIn} 0.4s ease-out;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  color: ${colors.gray600};
  cursor: pointer;
  transition: all 0.2s ease;

  svg { width: 20px; height: 20px; }

  &:hover {
    background: rgba(0, 0, 0, 0.04);
    color: ${colors.gray800};
  }
`;

const PageTitle = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  h1 {
    font-size: 20px;
    font-weight: 700;
    color: ${colors.gray900};
    margin: 0;
    letter-spacing: -0.02em;
  }

  span {
    font-size: 13px;
    color: ${colors.gray500};
    font-weight: 500;
  }
`;

const SaveButton = styled.button<{ $saving?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);

  svg { width: 18px; height: 18px; }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  ${({ $saving }) => $saving && css`
    background: ${colors.gray400};
    pointer-events: none;
  `}
`;

// ============ Content Layout ============
const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 0;
  height: calc(100vh - 73px);

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

// ============ Map Section ============
const MapSection = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: linear-gradient(135deg, #667eea08 0%, #764ba208 100%);
  overflow: hidden;
`;

const MapContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 900px;
  animation: ${fadeIn} 0.6s ease-out 0.1s both;

  svg {
    width: 100%;
    height: auto;
    filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.08));
  }
`;

const StateTooltip = styled.div<{ $x: number; $y: number; $visible: boolean }>`
  position: fixed;
  left: ${({ $x }) => $x}px;
  top: ${({ $y }) => $y}px;
  transform: translate(-50%, -120%);
  padding: 10px 16px;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(8px);
  border-radius: 10px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  pointer-events: none;
  z-index: 1000;
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  transition: opacity 0.15s ease;
  white-space: nowrap;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);

  &::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid rgba(15, 23, 42, 0.95);
  }
`;

const MapLegend = styled.div`
  display: flex;
  gap: 24px;
  margin-top: 24px;
  animation: ${fadeIn} 0.6s ease-out 0.2s both;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${colors.gray600};
  font-weight: 500;
`;

const LegendDot = styled.div<{ $color: string; $outline?: boolean }>`
  width: 14px;
  height: 14px;
  border-radius: 4px;
  background: ${({ $color, $outline }) => $outline ? 'transparent' : $color};
  border: ${({ $outline, $color }) => $outline ? `2px dashed ${$color}` : 'none'};
`;

// ============ Selection Panel ============
const SelectionPanel = styled.aside`
  background: linear-gradient(180deg, #fafbfc 0%, #ffffff 100%);
  border-left: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${fadeIn} 0.5s ease-out;
`;

const PanelHeader = styled.div`
  padding: 28px 24px 24px;
  background: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
`;

const SelectionStats = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: linear-gradient(135deg, ${colors.primary}08 0%, ${colors.secondary}06 100%);
  border-radius: 16px;
  border: 1px solid ${colors.primary}12;
  margin-bottom: 20px;
`;

const StatCircle = styled.div`
  position: relative;
  width: 88px;
  height: 88px;
  flex-shrink: 0;
`;

const CircleSVG = styled.svg`
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  filter: drop-shadow(0 2px 8px ${colors.primary}25);
`;

const CircleTrack = styled.circle`
  fill: none;
  stroke: rgba(255, 255, 255, 0.9);
  stroke-width: 7;
`;

const CircleProgress = styled.circle<{ $percent: number }>`
  fill: none;
  stroke: url(#progressGradient);
  stroke-width: 7;
  stroke-linecap: round;
  stroke-dasharray: ${Math.PI * 60};
  stroke-dashoffset: ${({ $percent }) => Math.PI * 60 * (1 - $percent / 100)};
  transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);
`;

const CircleCenter = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 50%;
  margin: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
`;

const CircleValue = styled.span`
  font-size: 26px;
  font-weight: 800;
  background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
`;

const CircleLabel = styled.span`
  font-size: 9px;
  color: ${colors.gray500};
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin-top: 2px;
`;

const StatDetails = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const StatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  padding: 4px 0;

  span:first-child {
    color: ${colors.gray500};
    font-weight: 500;
  }
  span:last-child {
    font-weight: 700;
    color: ${colors.gray800};
    font-variant-numeric: tabular-nums;
  }
`;

// ============ Quick Actions ============
const QuickActions = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
`;

const QuickButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'inherit' }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px 12px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  svg {
    width: 20px;
    height: 20px;
    transition: transform 0.2s ease;
  }

  &:hover svg {
    transform: scale(1.1);
  }

  ${({ $variant }) => {
    switch ($variant) {
      case 'primary':
        return css`
          background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
          color: white;
          border: none;
          box-shadow: 0 4px 12px ${colors.primary}30;
          &:hover {
            box-shadow: 0 6px 20px ${colors.primary}40;
            transform: translateY(-1px);
          }
        `;
      case 'inherit':
        return css`
          background: linear-gradient(135deg, ${colors.success}12 0%, ${colors.success}08 100%);
          color: ${colors.success};
          border: 1.5px solid ${colors.success}25;
          &:hover {
            background: ${colors.success}18;
            border-color: ${colors.success}40;
          }
        `;
      default:
        return css`
          background: white;
          color: ${colors.gray600};
          border: 1.5px solid ${colors.gray200};
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          &:hover {
            background: ${colors.gray50};
            border-color: ${colors.gray300};
            color: ${colors.gray800};
          }
        `;
    }
  }}
`;

// ============ Region Selector ============
const PanelContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 4px 20px 32px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: ${colors.gray300};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${colors.gray400};
  }
`;

const SectionTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  font-weight: 700;
  color: ${colors.gray400};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 28px 0 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid ${colors.gray100};

  svg {
    width: 15px;
    height: 15px;
    opacity: 0.6;
    stroke-width: 2;
  }
`;

const RegionGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const RegionCard = styled.div<{ $regionColor: string; $status: 'none' | 'partial' | 'all' }>`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: ${({ $status, $regionColor }) =>
    $status === 'all' ? `linear-gradient(135deg, ${$regionColor}12 0%, ${$regionColor}08 100%)` :
    $status === 'partial' ? `linear-gradient(135deg, ${$regionColor}08 0%, ${$regionColor}04 100%)` :
    'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)'};
  border: 1.5px solid ${({ $status, $regionColor }) =>
    $status === 'all' ? `${$regionColor}35` :
    $status === 'partial' ? `${$regionColor}20` : 'rgba(0,0,0,0.06)'};
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: ${({ $regionColor }) => $regionColor};
    opacity: ${({ $status }) => $status === 'all' ? 1 : $status === 'partial' ? 0.5 : 0};
    transition: opacity 0.2s ease;
  }

  &:hover {
    background: ${({ $regionColor }) => `linear-gradient(135deg, ${$regionColor}15 0%, ${$regionColor}08 100%)`};
    border-color: ${({ $regionColor }) => `${$regionColor}45`};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${({ $regionColor }) => `${$regionColor}18`};

    &::before {
      opacity: 0.7;
    }
  }

  &:active {
    transform: translateY(0);
  }
`;

const RegionIconWrapper = styled.div<{ $color: string }>`
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => `linear-gradient(135deg, ${$color}20 0%, ${$color}12 100%)`};
  box-shadow: 0 2px 6px ${({ $color }) => `${$color}15`};

  svg {
    width: 22px;
    height: 22px;
    color: ${({ $color }) => $color};
    stroke-width: 1.5;
  }
`;

const RegionInfo = styled.div`
  flex: 1;
  min-width: 0;

  .name {
    font-size: 14px;
    font-weight: 700;
    color: ${colors.gray900};
    margin-bottom: 2px;
  }

  .count {
    font-size: 12px;
    color: ${colors.gray500};
    font-weight: 500;
  }
`;

const RegionProgress = styled.div<{ $percent: number; $color: string }>`
  width: 56px;
  height: 6px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 3px;
  overflow: hidden;
  flex-shrink: 0;

  &::after {
    content: '';
    display: block;
    width: ${({ $percent }) => $percent}%;
    height: 100%;
    background: ${({ $color }) => `linear-gradient(90deg, ${$color} 0%, ${$color}cc 100%)`};
    border-radius: 3px;
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 4px ${({ $color }) => `${$color}40`};
  }
`;

const RegionCheckbox = styled.div<{ $checked: boolean; $partial: boolean; $color: string }>`
  width: 24px;
  height: 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  justify-content: center;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  ${({ $checked, $partial, $color }) =>
    $checked ? css`
      background: linear-gradient(135deg, ${$color} 0%, ${$color}dd 100%);
      border: none;
      box-shadow: 0 2px 6px ${$color}35;
      svg { color: white; width: 14px; height: 14px; }
    ` : $partial ? css`
      background: ${$color}18;
      border: 2px solid ${$color}60;
      &::after {
        content: '';
        width: 10px;
        height: 2.5px;
        background: ${$color};
        border-radius: 2px;
      }
    ` : css`
      background: white;
      border: 2px solid ${colors.gray200};
    `}
`;

// ============ Search & State List ============
const SearchContainer = styled.div`
  position: relative;
  margin-bottom: 18px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 14px 18px 14px 48px;
  border: 1.5px solid rgba(0, 0, 0, 0.06);
  border-radius: 14px;
  font-size: 14px;
  font-weight: 500;
  color: ${colors.gray900};
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &::placeholder {
    color: ${colors.gray400};
    font-weight: 400;
  }

  &:focus {
    outline: none;
    border-color: ${colors.primary}50;
    background: white;
    box-shadow: 0 0 0 4px ${colors.primary}12, 0 4px 12px rgba(0, 0, 0, 0.04);
  }
`;

const SearchIcon = styled(MagnifyingGlassIcon)`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: ${colors.gray400};
  stroke-width: 2;
  transition: color 0.2s ease;

  ${SearchContainer}:focus-within & {
    color: ${colors.primary};
  }
`;

const ClearSearch = styled.button`
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  border: none;
  background: ${colors.gray200};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  svg { width: 12px; height: 12px; color: ${colors.gray600}; }

  &:hover {
    background: ${colors.gray300};
    transform: translateY(-50%) scale(1.1);
  }
`;

const StateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  padding: 4px;
`;

const StateChip = styled.button<{ $selected: boolean; $available: boolean; $inherited?: boolean }>`
  padding: 10px 6px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  cursor: ${({ $available }) => $available ? 'pointer' : 'not-allowed'};
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  letter-spacing: 0.02em;

  ${({ $selected, $available, $inherited }) => {
    if (!$available) return css`
      background: ${colors.gray50};
      color: ${colors.gray300};
      border: 1px dashed ${colors.gray200};
      opacity: 0.7;
    `;
    if ($selected) return css`
      background: ${$inherited
        ? `linear-gradient(135deg, ${colors.info} 0%, ${colors.info}dd 100%)`
        : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`};
      color: white;
      border: 1px solid transparent;
      box-shadow: 0 3px 10px ${$inherited ? colors.info : colors.primary}35;

      &:hover {
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 5px 16px ${$inherited ? colors.info : colors.primary}45;
      }
    `;
    return css`
      background: white;
      color: ${colors.gray600};
      border: 1.5px solid ${colors.gray200};
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);

      &:hover {
        background: linear-gradient(135deg, ${colors.primary}10 0%, ${colors.secondary}08 100%);
        border-color: ${colors.primary}45;
        color: ${colors.primary};
        transform: translateY(-1px);
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.06);
      }
    `;
  }}
`;

const InheritedBadge = styled.div`
  position: absolute;
  top: -5px;
  right: -5px;
  width: 14px;
  height: 14px;
  background: linear-gradient(135deg, ${colors.info} 0%, ${colors.info}cc 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  box-shadow: 0 2px 4px ${colors.info}40;

  svg { width: 8px; height: 8px; color: white; stroke-width: 3; }
`;

// ============ Floating Command Bar ============
const CommandBar = styled.div<{ $visible: boolean }>`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) ${({ $visible }) => $visible ? 'translateY(0)' : 'translateY(100px)'};
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
`;

const CommandText = styled.span`
  font-size: 14px;
  color: white;
  font-weight: 500;
`;

const CommandDivider = styled.div`
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.2);
`;

const CommandButton = styled.button<{ $variant?: 'primary' | 'ghost' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ $variant }) => $variant === 'primary' ? css`
    background: white;
    color: ${colors.gray900};
    border: none;

    &:hover { background: ${colors.gray100}; }
  ` : css`
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: none;

    &:hover { background: rgba(255, 255, 255, 0.2); }
  `}
`;

const KeyboardHint = styled.kbd`
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  font-size: 11px;
  font-family: inherit;
`;

// ============ Loading State ============
const LoadingContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
`;

const LoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 3px solid ${colors.gray200};
  border-top-color: ${colors.primary};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const LoadingText = styled.p`
  font-size: 15px;
  color: ${colors.gray500};
  font-weight: 500;
`;

// State code to name mapping
const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

const ALL_STATE_CODES = Object.keys(STATE_NAMES);

export default function CoverageStatesScreen() {
  const { productId, coverageId } = useParams();
  const navigate = useNavigate();
  const { showToast: showToastBase } = useToast();
  const toast = useMemo(() => createToastHelpers(showToastBase), [showToastBase]);

  const [coverage, setCoverage] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [parentCoverage, setParentCoverage] = useState<any>(null);
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inheritFromParent, setInheritFromParent] = useState(false);
  const [parentStates, setParentStates] = useState<string[]>([]);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, text: '' });
  const [hasChanges, setHasChanges] = useState(false);
  const [initialStates, setInitialStates] = useState<string[]>([]);

  const searchRef = useRef<HTMLInputElement>(null);

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify([...selectedStates].sort()) !== JSON.stringify([...initialStates].sort());
    setHasChanges(changed);
  }, [selectedStates, initialStates]);

  // Get region status
  const getRegionStatus = useCallback((region: keyof typeof STATE_REGIONS): 'none' | 'partial' | 'all' => {
    const regionData = STATE_REGIONS[region];
    const availableInRegion = regionData.states.filter(s => availableStates.includes(s));
    const selectedInRegion = availableInRegion.filter(s => selectedStates.includes(s));

    if (selectedInRegion.length === 0) return 'none';
    if (selectedInRegion.length === availableInRegion.length) return 'all';
    return 'partial';
  }, [selectedStates, availableStates]);

  // Get region progress percentage
  const getRegionProgress = useCallback((region: keyof typeof STATE_REGIONS): number => {
    const regionData = STATE_REGIONS[region];
    const availableInRegion = regionData.states.filter(s => availableStates.includes(s));
    if (availableInRegion.length === 0) return 0;
    const selectedInRegion = availableInRegion.filter(s => selectedStates.includes(s));
    return Math.round((selectedInRegion.length / availableInRegion.length) * 100);
  }, [selectedStates, availableStates]);

  // Toggle region
  const toggleRegion = useCallback((region: keyof typeof STATE_REGIONS) => {
    const regionData = STATE_REGIONS[region];
    const availableInRegion = regionData.states.filter(s => availableStates.includes(s));
    const status = getRegionStatus(region);

    if (status === 'all') {
      setSelectedStates(prev => prev.filter(s => !availableInRegion.includes(s)));
    } else {
      setSelectedStates(prev => [...new Set([...prev, ...availableInRegion])]);
    }
    setInheritFromParent(false);
  }, [availableStates, getRegionStatus]);

  // Toggle state
  const toggleState = useCallback((stateCode: string) => {
    if (!availableStates.includes(stateCode)) return;

    setSelectedStates(prev =>
      prev.includes(stateCode)
        ? prev.filter(s => s !== stateCode)
        : [...prev, stateCode]
    );
    setInheritFromParent(false);
  }, [availableStates]);

  // Handle inherit toggle
  const handleInheritToggle = useCallback(() => {
    if (!inheritFromParent) {
      setSelectedStates([...parentStates]);
      setInheritFromParent(true);
    } else {
      setInheritFromParent(false);
    }
  }, [inheritFromParent, parentStates]);

  // Handle select all / clear all
  const handleSelectAll = useCallback(() => {
    setSelectedStates([...availableStates]);
    setInheritFromParent(false);
  }, [availableStates]);

  const handleClearAll = useCallback(() => {
    setSelectedStates([]);
    setInheritFromParent(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target as HTMLElement).matches('input, textarea, select')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape' && searchRef.current === document.activeElement) {
        setSearchQuery('');
        searchRef.current?.blur();
      }
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && !saving) handleSave();
      }
      // Cmd/Ctrl + A to select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && !(e.target as HTMLElement).matches('input, textarea')) {
        e.preventDefault();
        handleSelectAll();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hasChanges, saving]);

  // State name to code mapping for map
  const stateNameToCode: Record<string, string> = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
    "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
    "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
    "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO",
    "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ",
    "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
    "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
    "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT",
    "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY",
  };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const coverageDoc = await getDoc(doc(db, `products/${productId}/coverages`, coverageId!));
        if (!coverageDoc.exists()) throw new Error('Coverage not found');
        const coverageData = { id: coverageDoc.id, ...coverageDoc.data() } as any;
        setCoverage(coverageData);
        const states = coverageData.states || [];
        setSelectedStates(states);
        setInitialStates(states);
        setInheritFromParent(coverageData.inheritStatesFromParent || false);

        const productDoc = await getDoc(doc(db, 'products', productId!));
        if (!productDoc.exists()) throw new Error('Product not found');
        const productData = productDoc.data();
        setProduct(productData);

        if (coverageData.parentCoverageId) {
          const parentDoc = await getDoc(doc(db, `products/${productId}/coverages`, coverageData.parentCoverageId));
          if (parentDoc.exists()) {
            const parentData = parentDoc.data();
            setParentCoverage({ id: parentDoc.id, ...parentData });
            setAvailableStates(parentData.states || []);
            setParentStates(parentData.states || []);
          }
        } else {
          const prodStates = productData?.availableStates || [];
          setAvailableStates(prodStates);
          setParentStates(prodStates);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    if (productId && coverageId) fetchData();
  }, [productId, coverageId, toast]);

  // Save handler
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (selectedStates.length === 0) {
        toast.warning('Please select at least one state');
        setSaving(false);
        return;
      }
      await updateDoc(doc(db, `products/${productId}/coverages`, coverageId!), {
        states: selectedStates,
        inheritStatesFromParent: inheritFromParent,
        updatedAt: serverTimestamp(),
      });
      setInitialStates([...selectedStates]);
      toast.success(`Saved ${selectedStates.length} states`);
      navigate(-1);
    } catch (error) {
      console.error('Error saving states:', error);
      toast.error('Failed to save states');
    } finally {
      setSaving(false);
    }
  };

  // Computed values
  const selectionPercent = availableStates.length > 0
    ? Math.round((selectedStates.length / availableStates.length) * 100)
    : 0;

  // Filter states for display
  const filteredDisplayStates = useMemo(() => {
    if (!searchQuery) return ALL_STATE_CODES;
    const q = searchQuery.toLowerCase();
    return ALL_STATE_CODES.filter(code =>
      code.toLowerCase().includes(q) ||
      STATE_NAMES[code]?.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Loading state
  if (loading) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
        <LoadingText>Loading state configuration...</LoadingText>
      </LoadingContainer>
    );
  }

  if (!coverage || !product) return null;

  return (
    <PageContainer>
      {/* Top Navigation Bar */}
      <TopBar>
        <BackButton onClick={() => navigate(-1)}>
          <ChevronLeftIcon />
          Back
        </BackButton>

        <PageTitle>
          <h1>State Availability</h1>
          <span>{coverage.name} • {product.name}</span>
        </PageTitle>

        <SaveButton
          onClick={handleSave}
          disabled={saving || !hasChanges}
          $saving={saving}
        >
          {saving ? (
            <>
              <LoadingSpinner style={{ width: 16, height: 16, borderWidth: 2 }} />
              Saving...
            </>
          ) : (
            <>
              <CheckIcon style={{ width: 18, height: 18 }} />
              Save Changes
            </>
          )}
        </SaveButton>
      </TopBar>

      <ContentGrid>
        {/* Interactive Map Section */}
        <MapSection>
          <MapContainer>
            <ComposableMap
              projection="geoAlbersUsa"
              style={{ width: '100%', height: 'auto' }}
            >
              <defs>
                <linearGradient id="selectedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={colors.primary} />
                  <stop offset="100%" stopColor={colors.secondary} />
                </linearGradient>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={colors.primary} />
                  <stop offset="100%" stopColor={colors.secondary} />
                </linearGradient>
              </defs>
              <Geographies geography="https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json">
                {({ geographies }) =>
                  geographies
                    .filter(geo => stateNameToCode[geo.properties.name])
                    .map(geo => {
                      const stateCode = stateNameToCode[geo.properties.name];
                      const isAvailable = availableStates.includes(stateCode);
                      const isSelected = selectedStates.includes(stateCode);
                      const isInherited = inheritFromParent && parentStates.includes(stateCode);

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onMouseEnter={(e) => {
                            const rect = (e.target as Element).getBoundingClientRect();
                            setTooltip({
                              visible: true,
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                              text: `${STATE_NAMES[stateCode]} (${stateCode})${!isAvailable ? ' — Not available' : isSelected ? ' — Selected' : ''}`
                            });
                          }}
                          onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                          onClick={() => toggleState(stateCode)}
                          style={{
                            default: {
                              fill: isSelected
                                ? (isInherited ? colors.info : colors.primary)
                                : isAvailable ? colors.gray200 : colors.gray100,
                              stroke: '#FFFFFF',
                              strokeWidth: 1.5,
                              outline: 'none',
                              cursor: isAvailable ? 'pointer' : 'not-allowed',
                              transition: 'fill 0.2s ease',
                            },
                            hover: {
                              fill: isSelected
                                ? (isInherited ? colors.infoDark : colors.primaryDark)
                                : isAvailable ? colors.gray300 : colors.gray100,
                              stroke: '#FFFFFF',
                              strokeWidth: 1.5,
                              outline: 'none',
                              cursor: isAvailable ? 'pointer' : 'not-allowed',
                            },
                            pressed: {
                              fill: isSelected
                                ? colors.primaryDark
                                : isAvailable ? colors.gray400 : colors.gray100,
                              stroke: '#FFFFFF',
                              strokeWidth: 1.5,
                              outline: 'none',
                            },
                          }}
                        />
                      );
                    })
                }
              </Geographies>
            </ComposableMap>
          </MapContainer>

          <MapLegend>
            <LegendItem>
              <LegendDot $color={colors.primary} />
              Selected
            </LegendItem>
            <LegendItem>
              <LegendDot $color={colors.info} />
              Inherited
            </LegendItem>
            <LegendItem>
              <LegendDot $color={colors.gray200} />
              Available
            </LegendItem>
            <LegendItem>
              <LegendDot $color={colors.gray100} $outline />
              Unavailable
            </LegendItem>
          </MapLegend>
        </MapSection>

        {/* Selection Panel */}
        <SelectionPanel>
          <PanelHeader>
            {/* Selection Progress */}
            <SelectionStats>
              <StatCircle>
                <CircleSVG viewBox="0 0 80 80">
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={colors.primary} />
                      <stop offset="100%" stopColor={colors.secondary} />
                    </linearGradient>
                  </defs>
                  <CircleTrack cx="40" cy="40" r="30" />
                  <CircleProgress cx="40" cy="40" r="30" $percent={selectionPercent} />
                </CircleSVG>
                <CircleCenter>
                  <CircleValue>{selectedStates.length}</CircleValue>
                  <CircleLabel>States</CircleLabel>
                </CircleCenter>
              </StatCircle>

              <StatDetails>
                <StatRow>
                  <span>Available</span>
                  <span>{availableStates.length} states</span>
                </StatRow>
                <StatRow>
                  <span>Selected</span>
                  <span>{selectedStates.length} states</span>
                </StatRow>
                <StatRow>
                  <span>Coverage</span>
                  <span>{selectionPercent}%</span>
                </StatRow>
              </StatDetails>
            </SelectionStats>

            {/* Quick Actions */}
            <QuickActions>
              <QuickButton onClick={handleSelectAll}>
                <CheckCircleSolidIcon />
                All
              </QuickButton>
              <QuickButton onClick={handleClearAll}>
                <XMarkIcon />
                Clear
              </QuickButton>
              <QuickButton
                $variant={inheritFromParent ? 'inherit' : undefined}
                onClick={handleInheritToggle}
              >
                <ArrowPathIcon />
                {inheritFromParent ? 'Inherited' : 'Inherit'}
              </QuickButton>
            </QuickActions>
          </PanelHeader>

          <PanelContent>
            {/* Individual States */}
            <SectionTitle>
              <MapPinIcon />
              All States
            </SectionTitle>

            <SearchContainer>
              <SearchIcon />
              <SearchInput
                ref={searchRef}
                placeholder="Search states... (Press /)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <ClearSearch onClick={() => setSearchQuery('')}>
                  <XMarkIcon />
                </ClearSearch>
              )}
            </SearchContainer>

            <StateGrid>
              {filteredDisplayStates.map(stateCode => {
                const isAvailable = availableStates.includes(stateCode);
                const isSelected = selectedStates.includes(stateCode);
                const isInherited = inheritFromParent && parentStates.includes(stateCode);

                return (
                  <StateChip
                    key={stateCode}
                    $selected={isSelected}
                    $available={isAvailable}
                    $inherited={isInherited}
                    onClick={() => toggleState(stateCode)}
                    title={`${STATE_NAMES[stateCode]}${!isAvailable ? ' (not available)' : ''}`}
                  >
                    {stateCode}
                    {isInherited && isSelected && (
                      <InheritedBadge>
                        <ArrowPathIcon />
                      </InheritedBadge>
                    )}
                  </StateChip>
                );
              })}
            </StateGrid>

            {/* Region Selection */}
            <SectionTitle>
              <GlobeAmericasIcon />
              Regions
            </SectionTitle>
            <RegionGrid>
              {(Object.keys(STATE_REGIONS) as Array<keyof typeof STATE_REGIONS>).map(region => {
                const regionData = STATE_REGIONS[region];
                const availableInRegion = regionData.states.filter(s => availableStates.includes(s));
                const selectedInRegion = availableInRegion.filter(s => selectedStates.includes(s));
                const status = getRegionStatus(region);
                const progress = getRegionProgress(region);
                const IconComponent = RegionIcons[region];

                if (availableInRegion.length === 0) return null;

                return (
                  <RegionCard
                    key={region}
                    $regionColor={regionData.color}
                    $status={status}
                    onClick={() => toggleRegion(region)}
                  >
                    <RegionIconWrapper $color={regionData.color}>
                      <IconComponent />
                    </RegionIconWrapper>
                    <RegionInfo>
                      <div className="name">{region}</div>
                      <div className="count">{selectedInRegion.length} of {availableInRegion.length}</div>
                    </RegionInfo>
                    <RegionProgress $percent={progress} $color={regionData.color} />
                    <RegionCheckbox
                      $checked={status === 'all'}
                      $partial={status === 'partial'}
                      $color={regionData.color}
                    >
                      {status === 'all' && <CheckIcon />}
                    </RegionCheckbox>
                  </RegionCard>
                );
              })}
            </RegionGrid>
          </PanelContent>
        </SelectionPanel>
      </ContentGrid>

      {/* Tooltip */}
      <StateTooltip $x={tooltip.x} $y={tooltip.y} $visible={tooltip.visible}>
        {tooltip.text}
      </StateTooltip>

      {/* Floating Command Bar */}
      <CommandBar $visible={hasChanges}>
        <CommandText>
          {selectedStates.length} states selected
        </CommandText>
        <CommandDivider />
        <CommandButton onClick={handleClearAll}>
          Clear All
        </CommandButton>
        <CommandButton onClick={handleSelectAll}>
          Select All
        </CommandButton>
        <CommandButton $variant="primary" onClick={handleSave}>
          Save <KeyboardHint>⌘S</KeyboardHint>
        </CommandButton>
      </CommandBar>
    </PageContainer>
  );
}