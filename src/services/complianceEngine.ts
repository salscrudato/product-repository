/**
 * Compliance Engine Service
 * State filing tracker, compliance management, and regulatory monitoring
 */

import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import type { 
  StateFiling, 
  StateComplianceStatus, 
  ComplianceIssue,
  FilingObjection,
  RegulatoryBulletin,
  FilingStatus,
  ComplianceStatus
} from '../types/compliance';

// Collection references
const STATE_FILINGS_COLLECTION = 'stateFilings';
const COMPLIANCE_STATUS_COLLECTION = 'complianceStatus';
const REGULATORY_BULLETINS_COLLECTION = 'regulatoryBulletins';

// US States with insurance regulatory info
export const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' }
];

// ============================================================================
// State Filing Operations
// ============================================================================

export async function getStateFilings(productId: string): Promise<StateFiling[]> {
  const q = query(
    collection(db, STATE_FILINGS_COLLECTION),
    where('productId', '==', productId),
    orderBy('state', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StateFiling));
}

export async function getStateFiling(filingId: string): Promise<StateFiling | null> {
  const docRef = doc(db, STATE_FILINGS_COLLECTION, filingId);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as StateFiling : null;
}

export async function getFilingsByState(state: string): Promise<StateFiling[]> {
  const q = query(
    collection(db, STATE_FILINGS_COLLECTION),
    where('state', '==', state)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StateFiling));
}

export async function getFilingsByStatus(status: FilingStatus): Promise<StateFiling[]> {
  const q = query(
    collection(db, STATE_FILINGS_COLLECTION),
    where('filingStatus', '==', status)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StateFiling));
}

export async function createStateFiling(filing: Omit<StateFiling, 'id'>): Promise<StateFiling> {
  const docRef = await addDoc(collection(db, STATE_FILINGS_COLLECTION), {
    ...filing,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return { id: docRef.id, ...filing } as StateFiling;
}

export async function updateStateFiling(filingId: string, updates: Partial<StateFiling>): Promise<void> {
  const docRef = doc(db, STATE_FILINGS_COLLECTION, filingId);
  await updateDoc(docRef, { ...updates, updatedAt: Timestamp.now() });
}

export async function addFilingObjection(
  filingId: string, 
  objection: Omit<FilingObjection, 'id'>
): Promise<void> {
  const filing = await getStateFiling(filingId);
  if (!filing) throw new Error('Filing not found');
  
  const objectionWithId = { ...objection, id: crypto.randomUUID() };
  const objections = [...(filing.objections || []), objectionWithId];
  
  await updateStateFiling(filingId, { 
    objections, 
    filingStatus: 'Objection' 
  });
}

// ============================================================================
// Compliance Status Operations
// ============================================================================

export async function getComplianceStatus(productId: string): Promise<StateComplianceStatus[]> {
  const q = query(
    collection(db, COMPLIANCE_STATUS_COLLECTION),
    where('productId', '==', productId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StateComplianceStatus));
}

export async function getComplianceStatusByState(
  productId: string, 
  state: string
): Promise<StateComplianceStatus | null> {
  const q = query(
    collection(db, COMPLIANCE_STATUS_COLLECTION),
    where('productId', '==', productId),
    where('state', '==', state)
  );
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as StateComplianceStatus;
}

export async function updateComplianceStatus(
  productId: string,
  state: string,
  status: Partial<StateComplianceStatus>
): Promise<void> {
  const existing = await getComplianceStatusByState(productId, state);
  if (existing) {
    const docRef = doc(db, COMPLIANCE_STATUS_COLLECTION, existing.id);
    await updateDoc(docRef, { ...status, updatedAt: Timestamp.now() });
  } else {
    await addDoc(collection(db, COMPLIANCE_STATUS_COLLECTION), {
      productId,
      state,
      ...status,
      updatedAt: Timestamp.now()
    });
  }
}

