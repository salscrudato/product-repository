import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { TrashIcon } from '@heroicons/react/24/solid';
import styled, { keyframes } from 'styled-components';
import { Page, Container, PageHeader, Title } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';
import { Table, THead, Tr, Th, Td } from '../components/ui/Table';

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

const allStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

function StatesScreen() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [productName, setProductName] = useState('');
  const [selectedStates, setSelectedStates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newState, setNewState] = useState('');

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
      await updateDoc(doc(db, 'products', productId), {
        availableStates: selectedStates
      });
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
        <div style={{ display: 'flex', flexDirection: 'row', gap: 24, marginBottom: 24, alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 50%', background: '#ffffff', borderRadius: 12, padding: 20, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', marginBottom: 24 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: '#1F2937', marginBottom: 16 }}>US Map</h2>
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
          <div style={{ flex: '1 1 50%', background: '#ffffff', borderRadius: 12, padding: 20, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', marginBottom: 24 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: '#1F2937', marginBottom: 16 }}>Applicable States</h2>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:16 }}>
              <TextInput as="select" value={newState} onChange={e=>setNewState(e.target.value)}>
                <option value="">Select State</option>
                {allStates.map(s=> <option key={s} value={s}>{s}</option>)}
              </TextInput>
              <Button primary onClick={handleAddState}>Add State</Button>
              <Button ghost onClick={handleSelectAll}>Select All</Button>
              <Button ghost onClick={handleClearAll}>Clear All</Button>
              <Button success onClick={handleSave}>Save</Button>
            </div>
            <TextInput
              placeholder="Search States"
              value={searchQuery}
              onChange={e=>setSearchQuery(e.target.value)}
              style={{ marginBottom:16 }}
            />
            {filteredStates.length > 0 ? (
              <div style={{ overflowX:'auto', marginBottom:24 }}>
                <Table>
                  <THead>
                    <Tr>
                      <Th>State</Th>
                      <Th>Action</Th>
                    </Tr>
                  </THead>
                  <tbody>
                    {filteredStates.map(state => (
                      <Tr key={state}>
                        <Td style={{ textAlign: 'center' }}>{state}</Td>
                        <Td style={{ textAlign: 'center' }}>
                          <Button variant="danger" onClick={() => handleRemoveState(state)} title="Remove state">
                            <TrashIcon width={16} height={16} />
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <p style={{ textAlign: 'center', fontSize: 18, color: '#6B7280' }}>No States Selected</p>
            )}
          </div>
        </div>
      </Container>
    </Page>
  );
}

export default StatesScreen;