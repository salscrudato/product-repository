import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import styled, { keyframes } from 'styled-components';
import { Page, Container, PageHeader, Title } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';


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
          setSelectedStates(data.availableStates || []);
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
      <Page>
        <Container>
          <Spinner />
        </Container>
      </Page>
    );
  }

  const handleAddState = () => {
    if (newState && !selectedStates.includes(newState)) {
      setSelectedStates([...selectedStates, newState]);
      setNewState('');
    }
  };

  const handleRemoveState = (state) => {
    setSelectedStates(selectedStates.filter(s => s !== state));
  };

  const handleSelectAll = () => {
    setSelectedStates([...allStates]);
  };

  const handleClearAll = () => {
    setSelectedStates([]);
  };

  const handleSave = async () => {
    try {
      const productRef = doc(db, 'products', productId);
      const beforeSnap = await getDoc(productRef);
      const beforeStates = beforeSnap.exists() ? (beforeSnap.data().availableStates || []) : [];

      await updateDoc(productRef, { availableStates: selectedStates });

      // Build diff
      const added = selectedStates.filter(s => !beforeStates.includes(s));
      const removed = beforeStates.filter(s => !selectedStates.includes(s));
      const diff = {};
      if (added.length) diff.added = added;
      if (removed.length) diff.removed = removed;


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
    <Page>
      <Container>
        <PageHeader>
          <Title>State Availability for {productName}</Title>
          <Button variant="ghost" onClick={() => navigate('/')}>Return Home</Button>
        </PageHeader>
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

      </Container>
    </Page>
  );
}

export default StatesScreen;