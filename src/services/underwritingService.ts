/**
 * Underwriting Service
 * Handles risk scoring, referral workflows, and underwriting authority management
 */

import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import type { 
  RiskScore, 
  RiskScoreComponent,
  UnderwritingWorkitem, 
  UnderwritingAuthority,
  ReferralAction,
  UnderwritingDecision,
  RiskTier,
  ReferralReason
} from '../types/underwriting';

// Collection references
const WORKITEMS_COLLECTION = 'underwritingWorkitems';
const AUTHORITY_COLLECTION = 'underwritingAuthority';

// ============================================================================
// Risk Scoring
// ============================================================================

interface RiskInput {
  productId: string;
  classCode?: string;
  territory?: string;
  yearsInBusiness?: number;
  lossHistory?: { years: number; losses: number; claims: number };
  tiv?: number;
  premium?: number;
}

export async function calculateRiskScore(input: RiskInput): Promise<RiskScore> {
  const components: RiskScoreComponent[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  // Class code scoring
  if (input.classCode) {
    const classScore = getClassCodeScore(input.classCode);
    components.push({ factor: 'Class Code', weight: 25, rawScore: classScore, weightedScore: classScore * 0.25 });
    totalScore += classScore * 0.25;
    totalWeight += 0.25;
  }

  // Loss history scoring
  if (input.lossHistory) {
    const lossScore = getLossHistoryScore(input.lossHistory);
    components.push({ factor: 'Loss History', weight: 30, rawScore: lossScore, weightedScore: lossScore * 0.30 });
    totalScore += lossScore * 0.30;
    totalWeight += 0.30;
  }

  // Years in business scoring
  if (input.yearsInBusiness !== undefined) {
    const expScore = Math.min(100, input.yearsInBusiness * 10);
    components.push({ factor: 'Experience', weight: 15, rawScore: expScore, weightedScore: expScore * 0.15 });
    totalScore += expScore * 0.15;
    totalWeight += 0.15;
  }

  // Normalize score
  const overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;
  const riskTier = getRiskTier(overallScore);
  const { requiresReferral, referralReasons, referralLevel } = checkReferralRequirements(input, overallScore);

  return {
    id: '',
    productId: input.productId,
    overallScore,
    riskTier,
    componentScores: components,
    requiresReferral,
    referralReasons,
    referralLevel,
    calculatedAt: Timestamp.now()
  };
}

function getClassCodeScore(classCode: string): number {
  // Simplified class code scoring - in production, lookup from database
  const highHazard = ['7219', '7382', '9015', '9016'];
  const lowHazard = ['8810', '8742', '8820'];
  if (highHazard.includes(classCode)) return 30;
  if (lowHazard.includes(classCode)) return 90;
  return 60;
}

function getLossHistoryScore(history: { years: number; losses: number; claims: number }): number {
  if (history.claims === 0) return 100;
  const frequency = history.claims / history.years;
  if (frequency > 2) return 20;
  if (frequency > 1) return 40;
  if (frequency > 0.5) return 60;
  return 80;
}

function getRiskTier(score: number): RiskTier {
  if (score >= 80) return 'Preferred';
  if (score >= 60) return 'Standard';
  if (score >= 40) return 'NonStandard';
  if (score >= 20) return 'Substandard';
  return 'Declined';
}

function checkReferralRequirements(
  input: RiskInput, 
  score: number
): { requiresReferral: boolean; referralReasons: ReferralReason[]; referralLevel?: string } {
  const reasons: ReferralReason[] = [];
  
  if (score < 40) reasons.push('OutsideAppetite');
  if (input.tiv && input.tiv > 10000000) reasons.push('HighTIV');
  if (input.premium && input.premium > 500000) reasons.push('LargePremium');
  if (input.lossHistory && input.lossHistory.claims > 3) reasons.push('PoorLossHistory');

  const requiresReferral = reasons.length > 0;
  const referralLevel = reasons.includes('HighTIV') || reasons.includes('LargePremium') 
    ? 'VP' 
    : requiresReferral ? 'Underwriter' : undefined;

  return { requiresReferral, referralReasons: reasons, referralLevel };
}

// ============================================================================
// Workitem Operations
// ============================================================================

export async function getWorkitems(filters?: { 
  status?: string; 
  assignedTo?: string;
  queue?: string 
}): Promise<UnderwritingWorkitem[]> {
  let q = query(collection(db, WORKITEMS_COLLECTION), orderBy('receivedAt', 'desc'));
  
  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }
  if (filters?.assignedTo) {
    q = query(q, where('assignedTo', '==', filters.assignedTo));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UnderwritingWorkitem));
}

export async function createWorkitem(workitem: Omit<UnderwritingWorkitem, 'id'>): Promise<UnderwritingWorkitem> {
  const docRef = await addDoc(collection(db, WORKITEMS_COLLECTION), {
    ...workitem,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return { id: docRef.id, ...workitem } as UnderwritingWorkitem;
}

export async function updateWorkitem(id: string, updates: Partial<UnderwritingWorkitem>): Promise<void> {
  const docRef = doc(db, WORKITEMS_COLLECTION, id);
  await updateDoc(docRef, { ...updates, updatedAt: Timestamp.now() });
}

export async function makeDecision(
  workitemId: string, 
  decision: UnderwritingDecision
): Promise<void> {
  await updateWorkitem(workitemId, {
    decision,
    status: decision.decision === 'Approved' ? 'Approved' : 
            decision.decision === 'ConditionallyApproved' ? 'ConditionallyApproved' : 'Declined',
    completedAt: Timestamp.now()
  });
}

