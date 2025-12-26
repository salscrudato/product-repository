/**
 * Rating Engine Service
 * Comprehensive P&C insurance rating calculations with territory, class codes, and multi-tier rating
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
  orderBy 
} from 'firebase/firestore';
import type { 
  RatingTable, 
  RatingTableRow, 
  Territory, 
  ClassCode, 
  RatingStep,
  RatingCondition 
} from '../types/rating';

// Collection references
const RATING_TABLES_COLLECTION = 'ratingTables';
const TERRITORIES_COLLECTION = 'territories';
const CLASS_CODES_COLLECTION = 'classCodes';
const RATING_STEPS_COLLECTION = 'ratingSteps';

// ============================================================================
// Rating Table Operations
// ============================================================================

export async function getRatingTables(productId: string): Promise<RatingTable[]> {
  const q = query(
    collection(db, RATING_TABLES_COLLECTION),
    where('productId', '==', productId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RatingTable));
}

export async function getRatingTable(tableId: string): Promise<RatingTable | null> {
  const docRef = doc(db, RATING_TABLES_COLLECTION, tableId);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as RatingTable : null;
}

export async function createRatingTable(table: Omit<RatingTable, 'id'>): Promise<RatingTable> {
  const docRef = await addDoc(collection(db, RATING_TABLES_COLLECTION), {
    ...table,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return { id: docRef.id, ...table } as RatingTable;
}

export async function updateRatingTable(tableId: string, updates: Partial<RatingTable>): Promise<void> {
  const docRef = doc(db, RATING_TABLES_COLLECTION, tableId);
  await updateDoc(docRef, { ...updates, updatedAt: new Date() });
}

export async function deleteRatingTable(tableId: string): Promise<void> {
  const docRef = doc(db, RATING_TABLES_COLLECTION, tableId);
  await deleteDoc(docRef);
}

// ============================================================================
// Territory Operations
// ============================================================================

export async function getTerritories(productId: string): Promise<Territory[]> {
  const q = query(
    collection(db, TERRITORIES_COLLECTION),
    where('productId', '==', productId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Territory));
}

export async function getTerritoryByCode(productId: string, code: string): Promise<Territory | null> {
  const q = query(
    collection(db, TERRITORIES_COLLECTION),
    where('productId', '==', productId),
    where('territoryCode', '==', code)
  );
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Territory;
}

export async function getTerritoryByZip(productId: string, zip: string): Promise<Territory | null> {
  const territories = await getTerritories(productId);
  return territories.find(t => t.zipCodes?.includes(zip)) || null;
}

export async function createTerritory(territory: Omit<Territory, 'id'>): Promise<Territory> {
  const docRef = await addDoc(collection(db, TERRITORIES_COLLECTION), territory);
  return { id: docRef.id, ...territory } as Territory;
}

// ============================================================================
// Class Code Operations
// ============================================================================

export async function getClassCodes(productId: string): Promise<ClassCode[]> {
  const q = query(
    collection(db, CLASS_CODES_COLLECTION),
    where('productId', '==', productId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassCode));
}

export async function getClassCodeByCode(productId: string, code: string): Promise<ClassCode | null> {
  const q = query(
    collection(db, CLASS_CODES_COLLECTION),
    where('productId', '==', productId),
    where('classCode', '==', code)
  );
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ClassCode;
}

export async function createClassCode(classCode: Omit<ClassCode, 'id'>): Promise<ClassCode> {
  const docRef = await addDoc(collection(db, CLASS_CODES_COLLECTION), classCode);
  return { id: docRef.id, ...classCode } as ClassCode;
}

// ============================================================================
// Rating Steps Operations
// ============================================================================

export async function getRatingSteps(productId: string): Promise<RatingStep[]> {
  const q = query(
    collection(db, RATING_STEPS_COLLECTION),
    where('productId', '==', productId),
    orderBy('stepOrder', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RatingStep));
}

export async function createRatingStep(step: Omit<RatingStep, 'id'>): Promise<RatingStep> {
  const docRef = await addDoc(collection(db, RATING_STEPS_COLLECTION), {
    ...step,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return { id: docRef.id, ...step } as RatingStep;
}

