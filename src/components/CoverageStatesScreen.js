import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { TrashIcon } from '@heroicons/react/24/solid';

import styled, { keyframes } from 'styled-components';
import { Page, Container, PageHeader, Title } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Input';
import { Table, THead, Tr, Th, Td } from '../components/ui/Table';

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

export default function CoverageStatesScreen() {
  const { productId, coverageId } = useParams();
  const navigate = useNavigate();
  const [coverage, setCoverage] = useState(null);
  const [product, setProduct] = useState(null);
  const [parentCoverage, setParentCoverage] = useState(null);
  const [availableStates, setAvailableStates] = useState([]);
  const [selectedStates, setSelectedStates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newState, setNewState] = useState('');
  const [loading, setLoading] = useState(true);

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
            setParentCoverage(parentDoc.data());
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

          {/* States panel */}
          <div style={{ flex:'1 1 50%', background:'#fff', borderRadius:12, padding:20, boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
            <h2 style={{fontSize:24,fontWeight:600,marginBottom:16}}>Applicable States</h2>
            <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:16 }}>
              <TextInput as="select" value={newState} onChange={e=>setNewState(e.target.value)} style={{ minWidth:160 }}>
                <option value="">Select State</option>
                {availableStates.map(s=> <option key={s} value={s}>{s}</option>)}
              </TextInput>
              <Button onClick={handleAddState}>Add State</Button>
              <Button variant="ghost" onClick={handleSelectAll}>Select All</Button>
              <Button variant="ghost" onClick={handleClearAll}>Clear All</Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
            <TextInput
              placeholder="Search States"
              value={searchQuery}
              onChange={e=>setSearchQuery(e.target.value)}
              style={{ marginBottom:16 }}
            />
            {filteredStates.length > 0 ? (
              <div style={{ maxHeight: '24rem', overflowY:'auto', borderRadius:8 }}>
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
                        <Td align="center">{state}</Td>
                        <Td align="center">
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
              <p style={{ textAlign:'center', fontSize:16, color:'#6B7280' }}>No States Selected</p>
            )}
            <p style={{ marginTop:16, fontSize:14, color:'#6B7280' }}>
              {parentCoverage
                ? `Available states are limited to those of the parent coverage: ${parentCoverage.states?.join(', ') || 'None'}`
                : `Available states are limited to those of the product: ${product.availableStates?.join(', ') || 'None'}`}
            </p>
          </div>
        </div>
      </Container>
    </Page>
  );
}