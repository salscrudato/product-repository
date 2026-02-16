import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '@/firebase';
import logger, { LOG_CATEGORIES } from '@/utils/logger';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import styled, { keyframes, css } from 'styled-components';
import {
  ChevronLeftIcon,
  CheckIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import { colors } from '@components/common/DesignSystem';
import { createDirtyState, updateDirtyState, resetDirtyState, buildSaveConfirmation } from '@utils/stateGuards';
import MainNavigation from './ui/Navigation';

// ============ Animations ============
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
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

// Spinner for loading state
const Spinner = styled.div`
  border: 4px solid #f3f3f3;
  border-top: 4px solid #6366f1;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: ${spin} 1s linear infinite;
  margin: 100px auto;
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
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
`;

const QuickButton = styled.button`
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
  background: white;
  color: ${colors.gray600};
  border: 1.5px solid ${colors.gray200};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

  svg {
    width: 20px;
    height: 20px;
    transition: transform 0.2s ease;
  }

  &:hover {
    background: ${colors.gray50};
    border-color: ${colors.gray300};
    color: ${colors.gray800};
    svg { transform: scale(1.1); }
  }
`;

// ============ Panel Content ============
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

const StateChip = styled.button<{ $selected: boolean }>`
  padding: 10px 6px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  letter-spacing: 0.02em;

  ${({ $selected }) => $selected ? css`
    background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
    color: white;
    border: 1px solid transparent;
    box-shadow: 0 3px 10px ${colors.primary}35;

    &:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 5px 16px ${colors.primary}45;
    }
  ` : css`
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
  `}
`;

const allStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

function StatesScreen() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productName, setProductName] = useState('');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dirtyState, setDirtyState] = useState(createDirtyState([]));
  const [tooltip, setTooltip] = useState({ visible: false, content: '', x: 0, y: 0 });
  const searchRef = useRef<HTMLInputElement>(null);

  // keyboard shortcut `/` to jump to search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target as HTMLElement).matches('input, textarea, select')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Selection statistics
  const selectionPercent = useMemo(() => {
    return Math.round((selectedStates.length / allStates.length) * 100);
  }, [selectedStates]);

  const stateNameToCode = {
    "Alabama": "AL",
    "Alaska": "AK",
    "Arizona": "AZ",
    "Arkansas": "AR",
    "California": "CA",
    "Colorado": "CO",
    "Connecticut": "CT",
    "Delaware": "DE",
    "Florida": "FL",
    "Georgia": "GA",
    "Hawaii": "HI",
    "Idaho": "ID",
    "Illinois": "IL",
    "Indiana": "IN",
    "Iowa": "IA",
    "Kansas": "KS",
    "Kentucky": "KY",
    "Louisiana": "LA",
    "Maine": "ME",
    "Maryland": "MD",
    "Massachusetts": "MA",
    "Michigan": "MI",
    "Minnesota": "MN",
    "Mississippi": "MS",
    "Missouri": "MO",
    "Montana": "MT",
    "Nebraska": "NE",
    "Nevada": "NV",
    "New Hampshire": "NH",
    "New Jersey": "NJ",
    "New Mexico": "NM",
    "New York": "NY",
    "North Carolina": "NC",
    "North Dakota": "ND",
    "Ohio": "OH",
    "Oklahoma": "OK",
    "Oregon": "OR",
    "Pennsylvania": "PA",
    "Rhode Island": "RI",
    "South Carolina": "SC",
    "South Dakota": "SD",
    "Tennessee": "TN",
    "Texas": "TX",
    "Utah": "UT",
    "Vermont": "VT",
    "Virginia": "VA",
    "Washington": "WA",
    "West Virginia": "WV",
    "Wisconsin": "WI",
    "Wyoming": "WY",
  };

  useEffect(() => {
    if (!productId) return;
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const productDoc = await getDoc(doc(db, 'products', productId));
        if (productDoc.exists()) {
          const data = productDoc.data();
          setProductName(data.name);
          const states = data.availableStates || [];
          setSelectedStates(states);
          setDirtyState(createDirtyState(states));
        } else {
          throw new Error("Product not found");
        }
      } catch (error) {
        logger.error(LOG_CATEGORIES.ERROR, 'Error fetching product', { productId }, error as Error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  // Toggle state selection
  const toggleState = (stateCode: string) => {
    const newStates = selectedStates.includes(stateCode)
      ? selectedStates.filter(s => s !== stateCode)
      : [...selectedStates, stateCode];
    setSelectedStates(newStates);
    setDirtyState(updateDirtyState(dirtyState, newStates, 'states'));
  };

  const handleSelectAll = () => {
    setSelectedStates([...allStates]);
    setDirtyState(updateDirtyState(dirtyState, allStates, 'states'));
  };

  const handleClearAll = () => {
    setSelectedStates([]);
    setDirtyState(updateDirtyState(dirtyState, [], 'states'));
  };

  const handleSave = async () => {
    if (!dirtyState.isDirty) return;

    setSaving(true);
    try {
      const productRef = doc(db, 'products', productId!);
      await updateDoc(productRef, { availableStates: selectedStates });
      setDirtyState(resetDirtyState(dirtyState));
    } catch (error) {
      logger.error(LOG_CATEGORIES.ERROR, 'Error saving states', { productId }, error as Error);
    } finally {
      setSaving(false);
    }
  };

  // Filter states based on search
  const filteredStates = useMemo(() => {
    if (!searchQuery.trim()) return allStates;
    const query = searchQuery.toLowerCase();
    return allStates.filter(code => {
      const fullName = Object.entries(stateNameToCode).find(([, c]) => c === code)?.[0] || '';
      return code.toLowerCase().includes(query) || fullName.toLowerCase().includes(query);
    });
  }, [searchQuery]);

  if (loading) {
    return (
      <PageContainer>
        <MainNavigation />
        <Spinner />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <MainNavigation />
      {/* Top Bar */}
      <TopBar>
        <BackButton onClick={() => navigate(-1)}>
          <ChevronLeftIcon />
          Back
        </BackButton>

        <PageTitle>
          <h1>State Availability</h1>
          <span>{productName}</span>
        </PageTitle>

        <SaveButton
          onClick={handleSave}
          disabled={!dirtyState.isDirty || saving}
          $saving={saving}
        >
          <CheckIcon />
          Save Changes
        </SaveButton>
      </TopBar>

      {/* Content Grid */}
      <ContentGrid>
        {/* Map Section */}
        <MapSection>
          <MapContainer>
            <ComposableMap projection="geoAlbersUsa" style={{ width: '100%', height: 'auto' }}>
              <Geographies geography="https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json">
                {({ geographies }) =>
                  geographies
                    .filter(geo => stateNameToCode[geo.properties.name])
                    .map(geo => {
                      const stateCode = stateNameToCode[geo.properties.name];
                      const stateName = geo.properties.name;
                      const isSelected = selectedStates.includes(stateCode);

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onMouseEnter={(e) => {
                            setTooltip({
                              visible: true,
                              content: `${stateName} (${stateCode}) — ${isSelected ? 'Selected' : 'Available'}`,
                              x: e.clientX,
                              y: e.clientY,
                            });
                          }}
                          onMouseMove={(e) => {
                            setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
                          }}
                          onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                          onClick={() => toggleState(stateCode)}
                          style={{
                            default: {
                              fill: isSelected ? colors.primary : colors.gray200,
                              stroke: '#FFFFFF',
                              strokeWidth: 1.5,
                              outline: 'none',
                              cursor: 'pointer',
                              transition: 'fill 0.2s ease',
                            },
                            hover: {
                              fill: isSelected ? colors.primaryDark : colors.gray300,
                              stroke: '#FFFFFF',
                              strokeWidth: 1.5,
                              outline: 'none',
                              cursor: 'pointer',
                            },
                            pressed: {
                              fill: isSelected ? colors.primaryDark : colors.gray400,
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
              <LegendDot $color={colors.gray200} />
              Available
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
                  <span>{allStates.length} states</span>
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
              {filteredStates.map(stateCode => {
                const isSelected = selectedStates.includes(stateCode);
                return (
                  <StateChip
                    key={stateCode}
                    $selected={isSelected}
                    onClick={() => toggleState(stateCode)}
                  >
                    {stateCode}
                  </StateChip>
                );
              })}
            </StateGrid>
          </PanelContent>
        </SelectionPanel>
      </ContentGrid>

      {/* Tooltip */}
      <StateTooltip $visible={tooltip.visible} $x={tooltip.x} $y={tooltip.y}>
        {tooltip.content}
      </StateTooltip>
    </PageContainer>
  );
}

export default StatesScreen;