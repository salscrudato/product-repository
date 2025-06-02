import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import styled, { keyframes } from 'styled-components';
import { Page, Container, PageHeader, Title } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';

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

// --- NEW UI BITS (match StatesScreen) -----------------------------
const HistoryButton = styled.button`
  position: fixed;
  bottom: 16px;
  right: 16px;
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 50%;
  background: #374151;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  cursor: pointer;
  z-index: 1100;
  &:hover { background: #1f2937; }
`;

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
  right:96px;   /* leave room for history circle */
  display:flex;
  gap:12px;
  z-index:1200;
`;

export default function CoverageStatesScreen() {
  const { productId, coverageId } = useParams();
  const navigate = useNavigate();
  const [coverage, setCoverage] = useState(null);
  const [product, setProduct] = useState(null);
  const [availableStates, setAvailableStates] = useState([]);
  const [selectedStates, setSelectedStates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newState, setNewState] = useState('');
  const [loading, setLoading] = useState(true);

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
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch coverage
        const coverageDoc = await getDoc(doc(db, `products/${productId}/coverages`, coverageId));
        if (!coverageDoc.exists()) throw new Error('Coverage not found');
        const coverageData = { id: coverageDoc.id, ...coverageDoc.data() };
        setCoverage(coverageData);
        setSelectedStates(coverageData.states || []);

        // Fetch product
        const productDoc = await getDoc(doc(db, 'products', productId));
        if (!productDoc.exists()) throw new Error('Product not found');
        const productData = productDoc.data();
        setProduct(productData);

        // Fetch parent coverage if exists
        if (coverageData.parentCoverageId) {
          const parentDoc = await getDoc(doc(db, `products/${productId}/coverages`, coverageData.parentCoverageId));
          if (parentDoc.exists()) {
            setAvailableStates(parentDoc.data().states || []);
          }
        } else {
          setAvailableStates(productData.availableStates || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [productId, coverageId]);

  const handleAddState = () => {
    if (newState && availableStates.includes(newState) && !selectedStates.includes(newState)) {
      setSelectedStates([...selectedStates, newState]);
      setNewState('');
    }
  };

  const handleRemoveState = (state) => {
    setSelectedStates(selectedStates.filter(s => s !== state));
  };

  const handleSelectAll = () => {
    setSelectedStates([...availableStates]);
  };

  const handleClearAll = () => {
    setSelectedStates([]);
  };

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, `products/${productId}/coverages`, coverageId), {
        states: selectedStates,
        updatedAt: serverTimestamp(),
      });
      alert('States saved successfully!');
      navigate(-1);
    } catch (error) {
      console.error('Error saving states:', error);
      alert('Failed to save states.');
    }
  };

  if (loading) {
    return (
      <Page>
        <Container>
          <Spinner />
        </Container>
      </Page>
    );
  }

  if (!coverage || !product) return <div>Loading...</div>;

  const filteredStates = selectedStates.filter(state =>
    state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Page>
      <Container>
        <PageHeader>
          <Title>State Availability for {coverage.name}</Title>
          <Button variant="ghost" onClick={() => navigate(-1)}>Back</Button>
        </PageHeader>
        <div style={{ display:'flex', flexWrap:'wrap', gap:24 }}>
          {/* Map */}
          <div style={{ flex:'1 1 50%', background:'#fff', borderRadius:12, padding:20, boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
            <h2 style={{fontSize:24,fontWeight:600,marginBottom:16}}>US Map</h2>
            <ComposableMap
              projection="geoAlbersUsa"
              style={{ width: '100%', height: 'auto', margin: '0 auto' }}
            >
              <Geographies geography="https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json">
                {({ geographies }) =>
                  geographies
                    .filter(geo => stateNameToCode[geo.properties.name])
                    .map(geo => {
                      const stateCode = stateNameToCode[geo.properties.name];
                      const isAvailable = availableStates.includes(stateCode);
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onClick={() => {
                            if (!isAvailable) return;
                            if (selectedStates.includes(stateCode)) {
                              setSelectedStates(selectedStates.filter(s => s !== stateCode));
                            } else {
                              setSelectedStates([...selectedStates, stateCode]);
                            }
                          }}
                          style={{
                            default: {
                              fill: selectedStates.includes(stateCode) ? '#3B82F6' : isAvailable ? '#E5E7EB' : '#D1D5DB',
                              stroke: '#FFFFFF',
                              strokeWidth: 1,
                              outline: 'none',
                              cursor: isAvailable ? 'pointer' : 'default',
                            },
                            hover: {
                              fill: isAvailable ? (selectedStates.includes(stateCode) ? '#2563EB' : '#D1D5DB') : '#D1D5DB',
                              stroke: '#FFFFFF',
                              strokeWidth: 1,
                              outline: 'none',
                              cursor: isAvailable ? 'pointer' : 'default',
                            },
                            pressed: {
                              fill: isAvailable ? (selectedStates.includes(stateCode) ? '#1E40AF' : '#9CA3AF') : '#D1D5DB',
                              stroke: '#FFFFFF',
                              strokeWidth: 1,
                              outline: 'none',
                              cursor: isAvailable ? 'pointer' : 'default',
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
                    {availableStates.map(s=> <option key={s} value={s}>{s}</option>)}
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
        <HistoryButton aria-label="Back" onClick={()=>navigate(-1)}>
          ↩
        </HistoryButton>
      </Container>
    </Page>
  );
}