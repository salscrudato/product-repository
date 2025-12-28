import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { db } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import styled, { keyframes } from 'styled-components';
import { Page, Container } from '@components/ui/Layout';
import { Button } from '@components/ui/Button';
import { TextInput } from '@components/ui/Input';
import { ArrowLeftIcon, MapIcon } from '@heroicons/react/24/solid';
import MainNavigation from '@components/ui/Navigation';

import { createDirtyState, updateDirtyState, resetDirtyState, buildSaveConfirmation } from '@utils/stateGuards';


// Modern Container
const ModernContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
  display: flex;
  flex-direction: column;
`;

const MainContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
  position: relative;
  z-index: 1;
  width: 100%;
`;

// Header Section - Consistent with other pages
const HeaderSection = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 32px;
  gap: 16px;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid rgba(226, 232, 240, 0.6);

  &:hover {
    background: rgba(255, 255, 255, 1);
    color: #374151;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const TitleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
`;

const TitleIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;

  svg {
    width: 24px;
    height: 24px;
  }
`;

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b 0%, #475569 50%, #64748b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  letter-spacing: -0.02em;
`;

// Spinner for loading state
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;
const Spinner = styled.div`
  border: 4px solid #f3f3f3;
  border-top: 4px solid #6366f1;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: ${spin} 1s linear infinite;
  margin: 100px auto;
`;

// States Stats Dashboard
const slideIn = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const StatesStatsDashboard = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
  animation: ${slideIn} 0.4s ease-out;
`;

const StatesStatCard = styled.div<{ $color?: string }>`
  background: white;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${({ $color }) => $color || 'linear-gradient(90deg, #6366f1, #8b5cf6)'};
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
    border-color: transparent;
  }
`;

const StatesStatValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
  letter-spacing: -0.02em;
`;

const StatesStatLabel = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;

  svg {
    width: 14px;
    height: 14px;
    opacity: 0.7;
  }
`;

// --- NEW UI BITS --------------------------------------------------
const Panel = styled.div`
  flex: 1 1 360px;
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  max-width: ${props => (props.collapsed ? '48px' : '420px')};
  transition: max-width 0.25s ease;
  overflow: hidden;
`;

const TogglePanelBtn = styled.button`
  position: absolute;
  top: 16px;
  right: -20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #7c3aed;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  &:hover { background:#5b21b6; }
`;

const Chip = styled.span`
  display:inline-flex;
  align-items:center;
  gap:4px;
  background:#f3f4f6;
  color:#374151;
  border-radius:16px;
  padding:4px 10px;
  font-size:14px;
  margin:4px;
`;

const ChipDelete = styled.button`
  background:none;
  border:none;
  color:#ef4444;
  cursor:pointer;
  line-height:1;
`;

const FloatingBar = styled.div`
  position:fixed;
  bottom:24px;
  right:96px;   /* leave 72px gap (56px circle + 16px margin) */
  display:flex;
  gap:12px;
  z-index:1200;
`;

const allStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

function StatesScreen() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [productName, setProductName] = useState('');
  const [selectedStates, setSelectedStates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newState, setNewState] = useState('');
  const [dirtyState, setDirtyState] = useState(createDirtyState([]));

  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const searchRef = useRef(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // keyboard shortcut `/` to jump to search
  useEffect(() => {
    const handler = e => {
      if (e.key === '/' && !e.target.matches('input, textarea, select')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(debouncedQuery), 250);
    return () => clearTimeout(t);
  }, [debouncedQuery]);

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
        console.error("Error fetching product:", error);
        alert("Failed to load product data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  if (loading) {
    return (
      <ModernContainer>
        <MainNavigation />
        <MainContent>
          <Spinner />
        </MainContent>
      </ModernContainer>
    );
  }

  const handleAddState = () => {
    if (newState && !selectedStates.includes(newState)) {
      const newStates = [...selectedStates, newState];
      setSelectedStates(newStates);
      setDirtyState(updateDirtyState(dirtyState, newStates, 'states'));
      setNewState('');
    }
  };

  const handleRemoveState = (state) => {
    const newStates = selectedStates.filter(s => s !== state);
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
    if (!dirtyState.isDirty) {
      alert('No changes to save.');
      return;
    }

    const confirmation = buildSaveConfirmation(
      dirtyState.originalValue,
      selectedStates,
      productName
    );

    if (!window.confirm(confirmation)) {
      return;
    }

    try {
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, { availableStates: selectedStates });

      setDirtyState(resetDirtyState(dirtyState));
      alert("State availability saved successfully!");
    } catch (error) {
      console.error("Error saving states:", error);
      alert("Failed to save state availability. Please try again.");
    }
  };

  const filteredStates = selectedStates.filter(state =>
    state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ModernContainer>
      <MainNavigation />
      <MainContent>
        <HeaderSection>
          <BackButton onClick={() => navigate(-1)}>
            <ArrowLeftIcon />
          </BackButton>
          <TitleContainer>
            <TitleIcon>
              <MapIcon />
            </TitleIcon>
            <PageTitle>
              State Availability for {productName}
            </PageTitle>
          </TitleContainer>
        </HeaderSection>

        {/* States Stats Dashboard */}
        <StatesStatsDashboard>
          <StatesStatCard $color="linear-gradient(90deg, #6366f1, #8b5cf6)">
            <StatesStatValue>{selectedStates.length}</StatesStatValue>
            <StatesStatLabel>
              <MapIcon />
              Selected States
            </StatesStatLabel>
          </StatesStatCard>
          <StatesStatCard $color="linear-gradient(90deg, #10b981, #059669)">
            <StatesStatValue>{allStates.length - selectedStates.length}</StatesStatValue>
            <StatesStatLabel>
              <MapIcon />
              Available to Add
            </StatesStatLabel>
          </StatesStatCard>
          <StatesStatCard $color="linear-gradient(90deg, #f59e0b, #d97706)">
            <StatesStatValue>{Math.round((selectedStates.length / allStates.length) * 100)}%</StatesStatValue>
            <StatesStatLabel>
              <MapIcon />
              US Coverage
            </StatesStatLabel>
          </StatesStatCard>
          <StatesStatCard $color={dirtyState.isDirty ? "linear-gradient(90deg, #ef4444, #dc2626)" : "linear-gradient(90deg, #06b6d4, #0891b2)"}>
            <StatesStatValue>{dirtyState.isDirty ? 'Yes' : 'No'}</StatesStatValue>
            <StatesStatLabel>
              <MapIcon />
              Unsaved Changes
            </StatesStatLabel>
          </StatesStatCard>
        </StatesStatsDashboard>

        <div style={{ display:'flex', flexDirection:'row', gap:24, alignItems:'flex-start', position:'relative' }}>
          {/* MAP AREA (grows) */}
          <div style={{ flex:'1 1 auto', background:'#ffffff', borderRadius:12, padding:20, boxShadow:'0 4px 12px rgba(0,0,0,0.1)', marginBottom:24 }}>
            <h2 style={{ fontSize:24, fontWeight:600, color:'#1F2937', marginBottom:16 }}>US Map</h2>
            <ComposableMap projection="geoAlbersUsa" style={{ width:'100%', height:'auto', margin:'0 auto' }}>
              <Geographies geography="https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json">
                {({ geographies }) =>
                  geographies
                    .filter(geo => stateNameToCode[geo.properties.name])
                    .map(geo => {
                      const stateCode = stateNameToCode[geo.properties.name];
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onClick={() => {
                            if (selectedStates.includes(stateCode)) {
                              setSelectedStates(selectedStates.filter(s => s !== stateCode));
                            } else {
                              setSelectedStates([...selectedStates, stateCode]);
                            }
                          }}
                          style={{
                            default: {
                              fill: selectedStates.includes(stateCode) ? '#3B82F6' : '#E5E7EB',
                              stroke: '#FFFFFF',
                              strokeWidth: 1,
                              outline: 'none',
                              cursor: 'pointer',
                            },
                            hover: {
                              fill: selectedStates.includes(stateCode) ? '#2563EB' : '#D1D5DB',
                              stroke: '#FFFFFF',
                              strokeWidth: 1,
                              outline: 'none',
                              cursor: 'pointer',
                            },
                            pressed: {
                              fill: selectedStates.includes(stateCode) ? '#1E40AF' : '#9CA3AF',
                              stroke: '#FFFFFF',
                              strokeWidth: 1,
                              outline: 'none',
                              cursor: 'pointer',
                            },
                          }}
                        />
                      );
                    })
                }
              </Geographies>
            </ComposableMap>
          </div>

          {/* CONTROL PANEL */}
          <Panel collapsed={panelCollapsed}>
            <TogglePanelBtn onClick={() => setPanelCollapsed(c=>!c)}>
              {panelCollapsed ? '⟨' : '⟩'}
            </TogglePanelBtn>
            {!panelCollapsed && (
              <>
                <h2 style={{ fontSize:24, fontWeight:600, color:'#1F2937', marginBottom:16 }}>Applicable States</h2>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:16 }}>
                  <TextInput as="select" value={newState} onChange={e=>setNewState(e.target.value)}>
                    <option value="">Select State</option>
                    {allStates.map(s=> <option key={s} value={s}>{s}</option>)}
                  </TextInput>
                  <Button primary onClick={handleAddState}>Add</Button>
                </div>
                <TextInput
                  ref={searchRef}
                  placeholder="Search States"
                  value={debouncedQuery}
                  onChange={e=>setDebouncedQuery(e.target.value)}
                  style={{ marginBottom:16 }}
                />
                {filteredStates.length > 0 ? (
                  <div style={{ maxHeight:260, overflowY:'auto' }}>
                    {filteredStates.map(state=>(
                      <Chip key={state}>
                        {state}
                        <ChipDelete onClick={()=>handleRemoveState(state)}>×</ChipDelete>
                      </Chip>
                    ))}
                  </div>
                ) : (
                  <p style={{ textAlign:'center', fontSize:18, color:'#6B7280' }}>No States Selected</p>
                )}
              </>
            )}
          </Panel>
        </div>
        <FloatingBar>
          <Button ghost onClick={handleSelectAll}>Select&nbsp;All</Button>
          <Button ghost onClick={handleClearAll}>Clear&nbsp;All</Button>
          <Button success onClick={handleSave}>Save</Button>
        </FloatingBar>

      </MainContent>
    </ModernContainer>
  );
}

export default StatesScreen;