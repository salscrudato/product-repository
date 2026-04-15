#!/usr/bin/env node
/**
 * Demo Seed: Personal Auto (PP 00 01) via the Azure-hosted REST API
 *
 * Populates a demo of the post-migration Express backend at
 * app-nvi-demo-prohub-insurance-pl.azurewebsites.net with:
 *   - ~15 coverages organized in a parent/sub-coverage tree (sub-coverages
 *     carry parentCoverageId referencing a server-returned parent ID so the
 *     UI can enforce "only applies when parent is purchased")
 *   - 14 rating/pricing steps (multiplicative Personal Auto rating flow)
 *   - 12 underwriting/rating rules (speculative endpoint — /api/rules)
 *   - 10 ISO-style Personal Auto forms as real PDFs, uploaded (speculative
 *     endpoint — /api/forms with pdfUrl/filePath metadata)
 *
 * Endpoints confirmed from captured HAR:
 *    POST   /api/coverages
 *    GET    /api/coverages?productId=…
 *    POST   /api/pricing-steps
 *
 * Endpoints attempted but NOT confirmed in HAR (marked speculative at call
 * time — a 404/400 won't stop the run, and output will make clear which
 * worked). If the server rejects them, capture a HAR of one manual create
 * for that entity and paste it; the payload shape is easy to adjust.
 *    POST   /api/forms
 *    POST   /api/rules
 *
 * Usage:
 *   node scripts/seed-personal-auto-azure.js                # run
 *   node scripts/seed-personal-auto-azure.js --dry-run      # print only
 *   node scripts/seed-personal-auto-azure.js --no-pdfs      # skip PDF gen
 *   SHAPE=structured node scripts/seed-personal-auto-azure.js
 *                                                           # limits/deds as objects
 *   BASE_URL=… PRODUCT_ID=… node scripts/seed-personal-auto-azure.js
 *
 * Safety:
 *   - Never DELETEs. Only POSTs.
 *   - Per-call try/catch: one failed endpoint doesn't abort the rest.
 *   - No auth; the captured HAR showed the API is open. If that changes,
 *     set AUTH_HEADER="Bearer …" in env and it's forwarded on every request.
 *
 * Requires Node 18+ (global fetch) and pdf-lib (devDep in this repo).
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const BASE_URL    = process.env.BASE_URL    || 'https://app-nvi-demo-prohub-insurance-pl.azurewebsites.net';
const PRODUCT_ID  = process.env.PRODUCT_ID  || 'product-10b39165-cb9e-44c6-ae38-1a3436038fb6';
const AUTH_HEADER = process.env.AUTH_HEADER || null;
const DRY_RUN     = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');
const NO_PDFS     = process.env.NO_PDFS === '1' || process.argv.includes('--no-pdfs');
const SHAPE       = process.env.SHAPE       || 'strings'; // 'strings' | 'structured'
const SKIP_COVERAGES = process.env.SKIP_COVERAGES === '1';
const SKIP_STEPS     = process.env.SKIP_STEPS     === '1';
const SKIP_FORMS     = process.env.SKIP_FORMS     === '1';
const SKIP_RULES     = process.env.SKIP_RULES     === '1';
const PDF_DIR     = path.join(__dirname, '..', 'seed-pdfs');

const commonHeaders = {
  'Accept':       '*/*',
  'Content-Type': 'application/json',
  'Origin':       BASE_URL,
  'Referer':      `${BASE_URL}/coverage/${PRODUCT_ID}`,
  ...(AUTH_HEADER ? { Authorization: AUTH_HEADER } : {}),
};

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------
async function apiFetch(method, pathname, body, { allowFail = false } = {}) {
  const url = `${BASE_URL}${pathname}`;
  if (DRY_RUN) {
    console.log(`    [dry-run] ${method} ${pathname}`);
    return { id: `dryrun-${Math.random().toString(36).slice(2, 10)}` };
  }
  try {
    const res = await fetch(url, {
      method,
      headers: commonHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      const msg = `${method} ${pathname} -> ${res.status} ${res.statusText} :: ${text.slice(0, 180)}`;
      if (allowFail) { return { __failed: true, status: res.status, body: text }; }
      throw new Error(msg);
    }
    try { return JSON.parse(text); } catch { return text; }
  } catch (err) {
    if (allowFail) return { __failed: true, error: err.message };
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ALL_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY',
];
const NO_FAULT_STATES = ['FL','HI','KS','KY','MA','MI','MN','NJ','NY','ND','PA','UT'];

// ---------------------------------------------------------------------------
// Coverage catalog — filled out like a senior product manager would
// ---------------------------------------------------------------------------
const COVERAGES = [
  // ─── Root: Liability ─────────────────────────────────────────────────────
  { key: 'bi', parentKey: null, category: 'Liability',
    name: 'Bodily Injury Liability', coverageCode: 'PP-BI',
    description: 'Pays damages for bodily injury for which any insured becomes legally responsible because of an auto accident. Includes defense costs in addition to the limit of liability. Required coverage in all states; limits must meet or exceed state financial responsibility minimums.',
    scopeOfCoverage: 'Third-party bodily injury arising out of the ownership, maintenance, or use of a covered auto.',
    perilsCovered: ['Auto accident bodily injury'],
    exclusions: ['Intentional acts', 'Business/commercial use', 'Racing/speed contest', 'Vehicles used as a public or livery conveyance', 'Workers comp exposure'],
    states: ALL_STATES,
    limits: ['25/50','50/100','100/300 (default)','250/500','$500,000 CSL'],
    deductibles: [],
  },
  { key: 'pd', parentKey: null, category: 'Liability',
    name: 'Property Damage Liability', coverageCode: 'PP-PD',
    description: 'Pays damages for property damage for which any insured becomes legally responsible because of an auto accident. Covers damage to other vehicles, buildings, fences, and personal property of third parties. Required coverage in all states.',
    scopeOfCoverage: 'Third-party property damage arising out of the ownership, maintenance, or use of a covered auto.',
    exclusions: ['Damage to property owned, rented, or in the care/custody of the insured', 'Intentional damage', 'War/nuclear'],
    states: ALL_STATES,
    limits: ['$15,000','$25,000','$50,000 (default)','$100,000','$250,000'],
    deductibles: [],
  },

  // ─── Root: Medical / No-Fault ────────────────────────────────────────────
  { key: 'medpay', parentKey: null, category: 'Medical',
    name: 'Medical Payments Coverage', coverageCode: 'PP-MP',
    description: 'Pays reasonable and necessary medical expenses incurred for bodily injury to an insured or a passenger in the covered auto, regardless of fault. Covers expenses incurred within 3 years of the accident.',
    scopeOfCoverage: 'First-party medical expenses for insured and passengers in a covered auto.',
    exclusions: ['Injury during racing', 'Injury while using a vehicle as a livery', 'Workers comp claims'],
    states: ALL_STATES.filter(s => !NO_FAULT_STATES.includes(s)),
    limits: ['$1,000/person','$5,000/person (default)','$10,000/person','$25,000/person'],
    deductibles: [],
  },
  { key: 'pip', parentKey: null, category: 'Medical',
    name: 'Personal Injury Protection (PIP)', coverageCode: 'PP-PIP',
    description: 'First-party no-fault benefits covering medical expenses, lost wages, essential services, and in some states funeral expenses and survivor benefits, regardless of fault. Mandatory in no-fault states; benefit structure varies materially by state (NY statutory benefits of $50K+; FL $10K basic).',
    scopeOfCoverage: 'First-party medical, wage-loss, and essential services benefits — state-prescribed.',
    states: NO_FAULT_STATES,
    limits: ['$10,000/person (state minimum)','$50,000/person (default)','$250,000/person (NY)'],
    deductibles: ['$0 (default)','$200','$500','$1,000'],
  },

  // ─── Root: Uninsured / Underinsured Motorist ─────────────────────────────
  { key: 'um_bi', parentKey: null, category: 'Liability',
    name: 'Uninsured Motorist — Bodily Injury', coverageCode: 'PP-UMBI',
    description: 'Pays compensatory damages for bodily injury caused by an at-fault driver who has no liability insurance, or by a hit-and-run driver. Limits typically cannot exceed BI limits. May be rejected in writing where state law permits.',
    scopeOfCoverage: 'First-party recovery for bodily injury caused by uninsured or hit-and-run motorists.',
    states: ALL_STATES,
    limits: ['25/50','50/100','100/300 (default)','250/500'],
    deductibles: [],
  },
  { key: 'uim_bi', parentKey: null, category: 'Liability',
    name: 'Underinsured Motorist — Bodily Injury', coverageCode: 'PP-UIMBI',
    description: 'Pays compensatory damages for bodily injury caused by an at-fault driver whose liability limits are insufficient to cover the loss. Typically requires UM BI coverage to be selected.',
    scopeOfCoverage: 'First-party recovery for bodily injury caused by underinsured motorists.',
    states: ALL_STATES,
    limits: ['50/100','100/300 (default)','250/500'],
    deductibles: [],
  },

  // ─── Root: Physical Damage (parents to most sub-coverages) ──────────────
  { key: 'coll', parentKey: null, category: 'Property',
    name: 'Collision Coverage', coverageCode: 'PP-COLL',
    description: 'Pays for direct and accidental loss to your covered auto caused by upset of the auto or impact with another object, less the selected deductible. Loss is settled at actual cash value (ACV) less deductible.',
    scopeOfCoverage: 'First-party physical damage from collision or overturn; ACV loss settlement.',
    perilsCovered: ['Collision with another vehicle or object', 'Upset / overturn'],
    exclusions: ['Wear and tear', 'Mechanical breakdown', 'Damage from racing'],
    states: ALL_STATES,
    limits: ['Actual cash value (ACV) less deductible'],
    deductibles: ['$250','$500 (default)','$1,000','$2,000'],
  },
  { key: 'comp', parentKey: null, category: 'Property',
    name: 'Comprehensive Coverage (Other Than Collision)', coverageCode: 'PP-COMP',
    description: 'Pays for direct and accidental loss to your covered auto from causes other than collision — including theft, fire, vandalism, glass breakage, animal strike, falling objects, flood, hail, and riot. Loss is settled at ACV less deductible.',
    scopeOfCoverage: 'First-party physical damage from named non-collision perils; ACV loss settlement.',
    perilsCovered: ['Theft','Fire','Vandalism','Glass breakage','Animal strike','Falling objects','Flood','Hail','Windstorm','Riot','Explosion'],
    exclusions: ['Wear and tear', 'Mechanical breakdown', 'Intentional damage by an insured'],
    states: ALL_STATES,
    limits: ['Actual cash value (ACV) less deductible'],
    deductibles: ['$100','$250','$500 (default)','$1,000'],
  },

  // ─── Root: compound dependency (requires Coll AND Comp) ─────────────────
  { key: 'gap', parentKey: null, category: 'Property',
    name: 'Auto Loan/Lease Gap Coverage', coverageCode: 'PP-GAP',
    description: 'Pays the difference between the actual cash value of the covered auto at the time of a total loss and the outstanding balance on the loan or lease. Requires both Collision and Comprehensive on the same vehicle. Typical cap: up to 25% of ACV or actual gap, whichever is less.',
    scopeOfCoverage: 'Loan/lease balance in excess of ACV following a total loss.',
    exclusions: ['Overdue lease payments', 'Refinanced negative equity beyond a 25% cap'],
    states: ALL_STATES,
    limits: ['Up to 25% of ACV or actual gap, whichever is less (default)'],
    deductibles: [],
  },

  // ─── Sub-coverages of Collision ─────────────────────────────────────────
  { key: 'rental', parentKey: 'coll', category: 'Property',
    name: 'Transportation Expenses (Rental Reimbursement)', coverageCode: 'PP-RENT',
    description: 'Reimburses the cost of a rental vehicle while the covered auto is out of service due to a covered Collision or Comprehensive loss, subject to a daily limit and maximum number of days. Only meaningful when Collision or Comprehensive is in force.',
    scopeOfCoverage: 'Rental car reimbursement during a covered physical-damage loss.',
    states: ALL_STATES,
    limits: ['$30/day × 30 days = $900 (default)','$50/day × 30 days = $1,500','$80/day × 30 days = $2,400'],
    deductibles: [],
  },
  { key: 'xport', parentKey: 'coll', category: 'Property',
    name: 'Additional Transportation Expenses Coverage (PP 03 02)', coverageCode: 'PP-XPORT',
    description: 'Increases the base $20/day / $600 maximum transportation expense benefit included in the standard policy. Applies while a covered auto is withdrawn from use for more than 24 hours after a covered loss.',
    states: ALL_STATES,
    limits: ['$50/day / $1,500 max (default)','$100/day / $3,000 max'],
    deductibles: [],
  },

  // ─── Sub-coverages of Comprehensive ─────────────────────────────────────
  { key: 'glass', parentKey: 'comp', category: 'Property',
    name: 'Full Safety Glass Coverage', coverageCode: 'PP-GLASS',
    description: 'Waives the Comprehensive deductible for glass-only losses including windshield, side, and rear glass. A $0 deductible applies to safety glass repair or replacement. Only meaningful when Comprehensive is in force.',
    scopeOfCoverage: 'Safety glass repair/replacement, no deductible.',
    states: ALL_STATES,
    limits: ['ACV (no separate limit)'],
    deductibles: ['$0 (glass-only, default)'],
  },
  { key: 'custom', parentKey: 'comp', category: 'Property',
    name: 'Customizing Equipment Coverage', coverageCode: 'PP-CUSTOM',
    description: 'Covers loss to custom furnishings, equipment, or electronic equipment permanently installed in or attached to the covered auto, above the base $1,500 included in the policy. Scheduled limits are available up to $25,000 with underwriter approval.',
    scopeOfCoverage: 'Scheduled custom/after-market equipment on the covered auto.',
    states: ALL_STATES,
    limits: ['$1,500 (included)','$5,000 scheduled (default)','$10,000 scheduled','$25,000 scheduled (U/W approval)'],
    deductibles: ['Follows Comprehensive deductible'],
  },
  { key: 'tow', parentKey: 'comp', category: 'Property',
    name: 'Towing and Labor Costs Coverage (PP 03 03)', coverageCode: 'PP-TOW',
    description: 'Reimburses towing and on-scene labor costs at the place of disablement, per disablement of a covered auto. Per-disablement limit; no per-policy cap beyond number of disablements.',
    scopeOfCoverage: 'Towing and on-scene labor per disablement.',
    states: ALL_STATES,
    limits: ['$50 per disablement','$75 per disablement (default)','$100 per disablement','$200 per disablement'],
    deductibles: [],
  },

  // ─── Root: Standalone endorsement ───────────────────────────────────────
  { key: 'af', parentKey: null, category: 'Liability',
    name: 'Accident Forgiveness', coverageCode: 'PP-AF',
    description: 'Waives the surcharge for the first at-fault accident after five continuous years of accident-free driving with the company. Non-transferable. Not filed in California.',
    scopeOfCoverage: 'First at-fault accident surcharge waiver.',
    states: ALL_STATES.filter(s => s !== 'CA'),
    limits: [],
    deductibles: [],
  },
];

// ---------------------------------------------------------------------------
// Rating steps
// ---------------------------------------------------------------------------
const PRICING_STEPS = [
  { stepName: 'Base Rate by Coverage',        stepType: 'factor',  type: 'Table',      table: 'Base Rate',              operand: '*', value: 1.00, order: 0,  coverages: ['Bodily Injury Liability','Property Damage Liability','Collision Coverage','Comprehensive Coverage (Other Than Collision)'] },
  { stepName: 'Territory Factor',             stepType: 'factor',  type: 'Table',      table: 'Territory Factors',      operand: '*', value: 1.00, order: 1,  coverages: ['Bodily Injury Liability','Property Damage Liability','Collision Coverage','Comprehensive Coverage (Other Than Collision)'] },
  { stepName: 'Driver Age Factor',            stepType: 'factor',  type: 'Table',      table: 'Age Factors',            operand: '*', value: 1.00, order: 2,  coverages: ['Bodily Injury Liability','Property Damage Liability','Collision Coverage','Comprehensive Coverage (Other Than Collision)','Medical Payments Coverage'] },
  { stepName: 'Gender Factor',                stepType: 'factor',  type: 'Table',      table: 'Gender Factors',         operand: '*', value: 1.00, order: 3,  coverages: ['Bodily Injury Liability','Property Damage Liability','Collision Coverage'] },
  { stepName: 'Marital Status Factor',        stepType: 'factor',  type: 'Table',      table: 'Marital Factors',        operand: '*', value: 1.00, order: 4,  coverages: ['Bodily Injury Liability','Property Damage Liability'] },
  { stepName: 'Vehicle Symbol Factor',        stepType: 'factor',  type: 'Table',      table: 'Vehicle Symbol Factors', operand: '*', value: 1.00, order: 5,  coverages: ['Collision Coverage','Comprehensive Coverage (Other Than Collision)'] },
  { stepName: 'Annual Mileage Factor',        stepType: 'factor',  type: 'Table',      table: 'Mileage Factors',        operand: '*', value: 1.00, order: 6,  coverages: ['Bodily Injury Liability','Property Damage Liability','Collision Coverage','Comprehensive Coverage (Other Than Collision)'] },
  { stepName: 'Violation Surcharge',          stepType: 'factor',  type: 'User Input', table: '',                       operand: '*', value: 1.00, order: 7,  coverages: ['Bodily Injury Liability','Property Damage Liability','Collision Coverage'] },
  { stepName: 'At-Fault Accident Surcharge',  stepType: 'factor',  type: 'User Input', table: '',                       operand: '*', value: 1.00, order: 8,  coverages: ['Bodily Injury Liability','Property Damage Liability','Collision Coverage'] },
  { stepName: 'Insurance Score Factor',       stepType: 'factor',  type: 'Table',      table: 'Insurance Score Factors',operand: '*', value: 1.00, order: 9,  coverages: ['Bodily Injury Liability','Property Damage Liability','Collision Coverage','Comprehensive Coverage (Other Than Collision)'] },
  { stepName: 'Multi-Car Discount',           stepType: 'factor',  type: 'User Input', table: '',                       operand: '*', value: 0.85, order: 10, coverages: ['Bodily Injury Liability','Property Damage Liability','Collision Coverage','Comprehensive Coverage (Other Than Collision)','Medical Payments Coverage'] },
  { stepName: 'Multi-Policy Discount',        stepType: 'factor',  type: 'User Input', table: '',                       operand: '*', value: 0.90, order: 11, coverages: ['Bodily Injury Liability','Property Damage Liability','Collision Coverage','Comprehensive Coverage (Other Than Collision)'] },
  { stepName: 'Paid-in-Full Discount',        stepType: 'factor',  type: 'User Input', table: '',                       operand: '*', value: 0.95, order: 12, coverages: ['Bodily Injury Liability','Property Damage Liability','Collision Coverage','Comprehensive Coverage (Other Than Collision)'] },
  { stepName: 'Final Coverage Premium',       stepType: 'operand', type: 'Calculated', table: '',                       operand: '=', value: 0,    order: 13, coverages: ['Bodily Injury Liability','Property Damage Liability','Collision Coverage','Comprehensive Coverage (Other Than Collision)'] },
];

// ---------------------------------------------------------------------------
// Underwriting / rating rules
// ---------------------------------------------------------------------------
const RULES = [
  { name: 'Young Driver Surcharge',           type: 'rating',      reference: 'Co. Manual §2.1', condition: 'driver_age < 25',                           outcome: 'Apply rate factor 1.40 to BI, PD, and Collision.' },
  { name: 'Senior Driver Surcharge',          type: 'rating',      reference: 'Co. Manual §2.2', condition: 'driver_age >= 75',                          outcome: 'Apply rate factor 1.20 to BI and PD.' },
  { name: 'SR-22 Filing Required',            type: 'eligibility', reference: 'State DMV',       condition: 'violation_type IN ["DUI","reckless","no_insurance"] within 36 months', outcome: 'Require SR-22 filing; non-standard tier.' },
  { name: 'Good Student Discount',            type: 'rating',      reference: 'ISO PP-R §4.3',   condition: 'driver_age < 25 AND (gpa >= 3.0 OR top_20_pct_class)', outcome: 'Apply 0.90 factor to BI, PD, COLL, COMP.' },
  { name: 'Defensive Driver Discount',        type: 'rating',      reference: 'ISO PP-R §4.5',   condition: 'completed_defensive_driving_course within 36 months', outcome: 'Apply 0.95 factor to BI, PD, MP.' },
  { name: 'Passive Anti-Theft Discount',      type: 'rating',      reference: 'ISO PP-R §4.8',   condition: 'has_passive_antitheft_device = TRUE',        outcome: 'Apply 0.90 factor to Comprehensive.' },
  { name: 'Coverage Lapse Surcharge',         type: 'rating',      reference: 'Co. Manual §3.4', condition: 'days_since_prior_coverage_lapse < 60 within last 12 months', outcome: 'Apply 1.15 factor to BI and PD.' },
  { name: 'High-Risk Tier Assignment',        type: 'underwriting',reference: 'Co. Manual §5.1', condition: 'violation_points >= 6 OR at_fault_accidents_3yr >= 3', outcome: 'Move to non-standard rating tier; form PP HR 01.' },
  { name: 'State Minimum Liability Limits',   type: 'eligibility', reference: 'State FR law',    condition: 'true',                                       outcome: 'BI/PD cannot be bound below state financial responsibility minimums. System auto-applies binding minimum by garaging state.' },
  { name: 'UM/UIM Rejection Form Required',   type: 'compliance',  reference: 'State statute',   condition: 'applicant_rejects_UM_or_reduces_below_BI_limits', outcome: 'Require signed state-approved UM/UIM rejection form before binding.' },
  { name: 'No-Fault PIP Mandatory',           type: 'eligibility', reference: 'State no-fault',  condition: 'garaging_state IN (FL,HI,KS,KY,MA,MI,MN,NJ,NY,ND,PA,UT)', outcome: 'PIP required at or above state-specified benefit structure.' },
  { name: 'Gap Requires Full Coverage',       type: 'eligibility', reference: 'Co. Manual §4.2', condition: 'gap_selected AND (NOT collision_selected OR NOT comprehensive_selected)', outcome: 'Decline Gap coverage; display message: "Loan/Lease Gap requires both Collision and Comprehensive on the same vehicle."' },
  { name: 'Accident Forgiveness Eligibility', type: 'underwriting',reference: 'Co. Manual §6.1', condition: 'continuous_years_with_company < 5 OR at_fault_accidents_5yr > 0', outcome: 'Decline Accident Forgiveness endorsement. Not filed in CA.' },
];

// ---------------------------------------------------------------------------
// Forms — 10 ISO Personal Auto forms; PDFs generated below with realistic
// policy language so the seeded data looks like an actual product filing.
// ---------------------------------------------------------------------------
const FORMS = [
  { formNumber: 'PP 00 01', editionDate: '09/18', category: 'Base Coverage Form', type: 'ISO',
    title: 'Personal Auto Policy',
    coverageKeys: ['bi','pd','medpay','um_bi','uim_bi','coll','comp'],
    sections: [
      { heading: 'AGREEMENT', body: 'In return for payment of the premium and subject to all the terms of this policy, we agree with you as follows.' },
      { heading: 'DEFINITIONS', body: 'Throughout this policy, "you" and "your" refer to the named insured shown in the Declarations and the spouse if a resident of the same household. "We", "us" and "our" refer to the company providing this insurance. "Bodily injury" means bodily harm, sickness or disease, including death that results. "Property damage" means physical injury to, destruction of or loss of use of tangible property. "Your covered auto" means: (1) any vehicle shown in the Declarations; (2) a newly acquired auto; (3) any trailer you own; (4) any auto or trailer you do not own while used as a temporary substitute.' },
      { heading: 'PART A — LIABILITY COVERAGE', body: 'We will pay damages for bodily injury or property damage for which any insured becomes legally responsible because of an auto accident. Damages include prejudgment interest awarded against the insured. We will settle or defend, as we consider appropriate, any claim or suit asking for these damages. In addition to our limit of liability, we will pay all defense costs we incur.' },
      { heading: 'PART B — MEDICAL PAYMENTS COVERAGE', body: 'We will pay reasonable expenses incurred for necessary medical and funeral services because of bodily injury caused by accident and sustained by an insured. We will pay only those expenses incurred for services rendered within 3 years from the date of the accident.' },
      { heading: 'PART C — UNINSURED MOTORISTS COVERAGE', body: 'We will pay compensatory damages which an insured is legally entitled to recover from the owner or operator of an uninsured motor vehicle because of bodily injury sustained by an insured and caused by an accident. The owner or operator of the uninsured motor vehicle must be legally responsible for the accident.' },
      { heading: 'PART D — COVERAGE FOR DAMAGE TO YOUR AUTO', body: 'We will pay for direct and accidental loss to your covered auto or any non-owned auto, including their equipment, minus any applicable deductible. If loss to more than one your covered auto or non-owned auto results from the same collision, only the highest applicable deductible will apply.' },
      { heading: 'PART E — DUTIES AFTER AN ACCIDENT OR LOSS', body: 'We must be notified promptly of how, when and where the accident or loss happened. A person seeking any coverage must cooperate with us in the investigation, settlement or defense of any claim or suit; promptly send us copies of any notices or legal papers received in connection with the accident or loss; and submit to physical exams at our expense, by doctors we select, as often as we reasonably require.' },
      { heading: 'PART F — GENERAL PROVISIONS', body: 'This policy applies only to accidents and losses which occur during the policy period shown in the Declarations and within the policy territory. We may cancel by mailing to the named insured shown in the Declarations at the address shown in this policy written notice of cancellation at least 10 days in advance if cancellation is for nonpayment of premium; or 20 days in advance in all other cases.' },
    ],
  },
  { formNumber: 'PP 03 02', editionDate: '09/18', category: 'Endorsement', type: 'ISO',
    title: 'Additional Transportation Expenses Coverage',
    coverageKeys: ['xport'],
    sections: [
      { heading: 'SCHEDULE', body: 'Daily Limit: $50  /  Maximum Limit: $1,500. (Limits apply per each disablement of your covered auto.)' },
      { heading: 'COVERAGE', body: 'We will pay, without application of a deductible, up to the limits shown in the Schedule for transportation expenses incurred by you in the event of the total theft of your covered auto or a loss to your covered auto caused by a peril insured against under Part D — Coverage For Damage To Your Auto. Payment will be limited to that period of time reasonably required to repair or replace your covered auto.' },
    ],
  },
  { formNumber: 'PP 03 03', editionDate: '09/18', category: 'Endorsement', type: 'ISO',
    title: 'Towing and Labor Costs Coverage',
    coverageKeys: ['tow'],
    sections: [
      { heading: 'SCHEDULE', body: 'Limit of Liability Per Disablement: $75 (default — see Declarations for selected limit).' },
      { heading: 'COVERAGE', body: 'We will pay for towing and labor costs incurred each time your covered auto is disabled, up to the limit of liability shown in the Schedule. Labor will be paid for only at the place of disablement.' },
    ],
  },
  { formNumber: 'PP 03 06', editionDate: '09/18', category: 'Endorsement', type: 'ISO',
    title: 'Extended Non-Owned Coverage — Vehicles Furnished or Available for Regular Use',
    coverageKeys: ['bi','pd'],
    sections: [
      { heading: 'PURPOSE', body: 'With respect to coverage provided by this endorsement, the provisions of the policy apply unless modified by this endorsement. This endorsement extends Part A — Liability Coverage and Part B — Medical Payments Coverage to include certain non-owned autos that are furnished or available for regular use by the named insured or resident family member.' },
    ],
  },
  { formNumber: 'PP 03 08', editionDate: '09/18', category: 'Endorsement', type: 'ISO',
    title: 'Coverage for Damage to Your Auto (Maximum Limit of Liability)',
    coverageKeys: ['coll','comp'],
    sections: [
      { heading: 'PURPOSE', body: 'Modifies the loss settlement provisions of Part D — Coverage For Damage To Your Auto to establish a stated maximum limit of liability per occurrence for the vehicle(s) shown in the Schedule.' },
    ],
  },
  { formNumber: 'PP 03 22', editionDate: '09/18', category: 'Endorsement', type: 'ISO',
    title: 'Named Non-Owner Coverage',
    coverageKeys: ['bi','pd'],
    sections: [
      { heading: 'COVERAGE', body: 'Provides Part A, B, and C coverage to individuals who do not own an auto but drive non-owned autos. Replaces references to "your covered auto" with references to non-owned autos as outlined herein.' },
    ],
  },
  { formNumber: 'PP 03 34', editionDate: '09/18', category: 'Endorsement', type: 'ISO',
    title: 'Joint Ownership Coverage',
    coverageKeys: ['bi','pd'],
    sections: [
      { heading: 'COVERAGE', body: 'Extends the definition of "you" and "your" to include joint owners of a covered auto other than a spouse, such as a domestic partner or other related/unrelated individual residing in the same household.' },
    ],
  },
  { formNumber: 'PP 03 35', editionDate: '09/18', category: 'Endorsement', type: 'ISO',
    title: 'Auto Loan/Lease Coverage',
    coverageKeys: ['gap'],
    sections: [
      { heading: 'COVERAGE', body: 'In the event of a total loss to your covered auto, we will pay, in addition to the actual cash value of the auto, any unpaid amount due on the lease or loan for your covered auto, less: (a) overdue lease or loan payments; (b) financial penalties; (c) negative equity carried over from a prior loan. Payment is limited to 25% of the actual cash value of the covered auto.' },
    ],
  },
  { formNumber: 'PP 13 01', editionDate: '09/18', category: 'Exclusion', type: 'ISO',
    title: 'Coverage for Damage to Your Auto Exclusion Endorsement',
    coverageKeys: ['coll','comp'],
    sections: [
      { heading: 'EXCLUSION', body: 'Part D — Coverage For Damage To Your Auto is deleted with respect to the vehicle(s) shown in the Schedule. This endorsement is used when only liability coverage is being provided for a scheduled auto.' },
    ],
  },
  { formNumber: 'IL N 001', editionDate: '01/20', category: 'Notice', type: 'ISO',
    title: 'Policyholder Notice — Fraud Warning',
    coverageKeys: [],
    sections: [
      { heading: 'FRAUD WARNING', body: 'Any person who knowingly and with intent to defraud any insurance company or another person files an application for insurance or statement of claim containing any materially false information, or conceals for the purpose of misleading information concerning any fact material thereto, commits a fraudulent insurance act, which is a crime, and subjects such person to criminal and civil penalties.' },
    ],
  },
];

// ---------------------------------------------------------------------------
// PDF generation
// ---------------------------------------------------------------------------
async function generateFormPDF(form) {
  const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
  const pdf = await PDFDocument.create();
  const font     = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdf.embedFont(StandardFonts.TimesRomanBold);

  const margin = 54;
  const pageW = 612, pageH = 792;
  let page = pdf.addPage([pageW, pageH]);
  let y = pageH - margin;

  const addPage = () => { page = pdf.addPage([pageW, pageH]); y = pageH - margin; };
  const wrap = (text, maxChars) => {
    const words = text.split(/\s+/); const lines = []; let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > maxChars) { if (cur) lines.push(cur); cur = w; }
      else cur = (cur ? cur + ' ' : '') + w;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  const draw = (text, opts = {}) => {
    const f = opts.bold ? fontBold : font;
    const size = opts.size || 10;
    const lh = size + 3;
    for (const line of wrap(text, opts.wrap || 92)) {
      if (y < margin + lh) addPage();
      page.drawText(line, { x: margin, y, size, font: f, color: rgb(0,0,0) });
      y -= lh;
    }
  };

  draw(`Form ${form.formNumber}  (Edition ${form.editionDate})`, { bold: true, size: 10 });
  y -= 6;
  draw(form.title.toUpperCase(), { bold: true, size: 14 });
  y -= 10;
  draw('THIS ENDORSEMENT CHANGES THE POLICY. PLEASE READ IT CAREFULLY.', { bold: true, size: 9 });
  y -= 8;

  for (const s of form.sections) {
    y -= 6;
    draw(s.heading, { bold: true, size: 11 });
    y -= 2;
    draw(s.body, { size: 10 });
  }

  y -= 16;
  draw(`Copyright, Insurance Services Office, Inc., 2018. Includes copyrighted material of Insurance Services Office, Inc., with its permission.`, { size: 8 });
  draw(`Form ${form.formNumber}  ${form.editionDate}                                                                                  Page 1`, { size: 8 });

  return pdf.save();
}

async function writePDFs() {
  if (NO_PDFS) { console.log('  → PDF generation skipped (NO_PDFS set).'); return {}; }
  if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });

  const paths = {};
  for (const f of FORMS) {
    const bytes = await generateFormPDF(f);
    const fname = `${f.formNumber.replace(/\s+/g, '_')}.pdf`;
    const out = path.join(PDF_DIR, fname);
    fs.writeFileSync(out, bytes);
    paths[f.formNumber] = out;
    console.log(`    ✓ ${path.relative(process.cwd(), out)}  (${bytes.length.toLocaleString()} bytes)`);
  }
  return paths;
}

// ---------------------------------------------------------------------------
// Helpers: payload shape conversion
// ---------------------------------------------------------------------------
const toLimits = (ls) => SHAPE === 'strings' ? ls : ls.map(l => ({ displayValue: l, limitType: 'perOccurrence' }));
const toDeds   = (ds) => SHAPE === 'strings' ? ds : ds.map(d => ({ displayValue: d, deductibleType: 'flat' }));

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------
async function main() {
  const now = new Date().toISOString();
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Personal Auto demo seed (Azure Express backend)            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`  Target : ${BASE_URL}`);
  console.log(`  Product: ${PRODUCT_ID}`);
  console.log(`  Auth   : ${AUTH_HEADER ? 'forwarded from env' : 'none'}`);
  console.log(`  Dry run: ${DRY_RUN ? 'yes' : 'no'}`);
  console.log(`  PDFs   : ${NO_PDFS ? 'disabled' : 'enabled'}`);
  console.log(`  Shape  : limits/deductibles as ${SHAPE}`);
  console.log('');

  // Pre-flight so we fail loudly before writing if the product is wrong
  console.log('→ Pre-flight: GET /api/coverages');
  const existing = await apiFetch('GET', `/api/coverages?productId=${encodeURIComponent(PRODUCT_ID)}`);
  const count = Array.isArray(existing) ? existing.length : (existing?.items?.length ?? '?');
  console.log(`   existing coverages on product: ${count}`);
  console.log('');

  // Generate PDFs locally (doesn't touch the API)
  console.log('→ Generating form PDFs…');
  const pdfPaths = await writePDFs();
  console.log('');

  // ─── Coverages (roots first, then subs wired to server-assigned IDs) ───
  const idByKey = {};
  const roots = COVERAGES.filter(c => !c.parentKey);
  const subs  = COVERAGES.filter(c =>  c.parentKey);

  // If skipping coverage writes (e.g., re-running just forms/rules), rehydrate
  // idByKey from the server so downstream form/coverageIds wiring still works.
  if (SKIP_COVERAGES && !DRY_RUN) {
    const list = Array.isArray(existing) ? existing : [];
    for (const c of COVERAGES) {
      const hit = list.find(x => x.name === c.name);
      if (hit) idByKey[c.key] = hit.id;
    }
    console.log(`   (rehydrated ${Object.keys(idByKey).length}/${COVERAGES.length} coverage IDs from existing data)`);
  }

  console.log(`→ POST /api/coverages  —  ${SKIP_COVERAGES ? 'SKIPPED (SKIP_COVERAGES=1)' : roots.length + ' roots'}`);
  if (!SKIP_COVERAGES) for (const c of roots) {
    const body = buildCoverageBody(c, null, now);
    const resp = await apiFetch('POST', '/api/coverages', body);
    idByKey[c.key] = resp?.id || resp?._id || resp?.coverageId || `dryrun-${c.key}`;
    console.log(`   • ${c.name.padEnd(52)} -> ${idByKey[c.key]}`);
  }

  console.log('');
  console.log(`→ POST /api/coverages  —  ${SKIP_COVERAGES ? 'SKIPPED' : subs.length + ' sub-coverages'}`);
  if (!SKIP_COVERAGES) for (const c of subs) {
    const parentId = idByKey[c.parentKey];
    const body = buildCoverageBody(c, parentId, now);
    const resp = await apiFetch('POST', '/api/coverages', body);
    idByKey[c.key] = resp?.id || resp?._id || resp?.coverageId || `dryrun-${c.key}`;
    console.log(`   └─ ${c.name.padEnd(50)} parent=${parentId.slice(0, 16)}… -> ${idByKey[c.key]}`);
  }

  // ─── Forms ────────────────────────────────────────────────────────────
  // NOTE: do NOT send `type` — the server uses it as the Cosmos document
  // discriminator ("form"). Using `origin`/`category` instead.
  console.log('');
  console.log(`→ POST /api/forms  —  ${SKIP_FORMS ? 'SKIPPED' : FORMS.length + ' forms'}`);
  const formsFailed = [];
  if (!SKIP_FORMS) for (const f of FORMS) {
    const pdfAbs = pdfPaths[f.formNumber];
    const body = {
      productId:       PRODUCT_ID,
      formNumber:      f.formNumber,
      formName:        f.title,
      title:           f.title,
      formEditionDate: f.editionDate,
      effectiveDate:   '2026-01-01',
      category:        f.category,
      origin:          f.type === 'ISO' ? 'iso' : 'manuscript',
      isoOrManuscript: f.type === 'ISO' ? 'iso' : 'manuscript',
      productIds:      [PRODUCT_ID],
      coverageIds:     f.coverageKeys.map(k => idByKey[k]).filter(Boolean),
      states:          ALL_STATES,
      pdfPath:         pdfAbs ? path.relative(path.join(__dirname, '..'), pdfAbs) : null,
      pdfUrl:          null,
      filePath:        pdfAbs ? path.relative(path.join(__dirname, '..'), pdfAbs) : null,
      downloadUrl:     null,
      archived:        false,
      versionCount:    1,
      uploadedBy:      'seed-script',
      createdAt:       now,
      updatedAt:       now,
    };
    const resp = await apiFetch('POST', '/api/forms', body, { allowFail: true });
    if (resp?.__failed) { formsFailed.push(f.formNumber); console.log(`   ✗ ${f.formNumber.padEnd(10)} ${f.title.slice(0, 50).padEnd(50)}  ${resp.status || 'err'}`); }
    else { console.log(`   • ${f.formNumber.padEnd(10)} ${f.title.slice(0, 50).padEnd(50)}  ${resp?.id || 'ok'}`); }
  }

  // ─── Rules ────────────────────────────────────────────────────────────
  // Same `type` caveat as forms: Cosmos discriminator is "rule"; we send
  // ruleCategory/ruleType instead.
  console.log('');
  console.log(`→ POST /api/rules  —  ${SKIP_RULES ? 'SKIPPED' : RULES.length + ' rules'}`);
  const rulesFailed = [];
  if (!SKIP_RULES) for (const r of RULES) {
    const body = {
      productId:    PRODUCT_ID,
      name:         r.name,
      ruleCategory: r.type,     // was `type`
      ruleType:     r.type,
      reference:    r.reference,
      condition:    r.condition,
      outcome:      r.outcome,
      proprietary:  false,
      status:       'active',
      states:       ALL_STATES,
      createdAt:    now,
      updatedAt:    now,
    };
    const resp = await apiFetch('POST', '/api/rules', body, { allowFail: true });
    if (resp?.__failed) { rulesFailed.push(r.name); console.log(`   ✗ ${r.name.slice(0, 44).padEnd(46)} ${resp.status || 'err'}`); }
    else { console.log(`   • ${r.name.slice(0, 44).padEnd(46)} ${resp?.id || 'ok'}`); }
  }

  // ─── Pricing steps (confirmed endpoint) ────────────────────────────────
  console.log('');
  console.log(`→ POST /api/pricing-steps  —  ${SKIP_STEPS ? 'SKIPPED' : PRICING_STEPS.length + ' steps'}`);
  if (!SKIP_STEPS) for (const s of PRICING_STEPS) {
    const body = {
      productId:  PRODUCT_ID,
      stepType:   s.stepType,
      coverages:  s.coverages,
      stepName:   s.stepName,
      type:       s.type,
      table:      s.table,
      rounding:   'none',
      states:     ALL_STATES,
      upstreamId: '',
      operand:    s.operand,
      value:      s.value,
      order:      s.order,
    };
    const resp = await apiFetch('POST', '/api/pricing-steps', body);
    console.log(`   • #${String(s.order).padStart(2,'0')} ${s.stepName.padEnd(38)} ${resp?.id || '(ok)'}`);
  }

  // ─── Summary ───────────────────────────────────────────────────────────
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Seed complete.                                             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`  Coverages root : ${roots.length}`);
  console.log(`  Coverages sub  : ${subs.length}  (parentCoverageId wired to real server IDs)`);
  console.log(`  Pricing steps  : ${PRICING_STEPS.length}`);
  console.log(`  Forms posted   : ${FORMS.length - formsFailed.length}/${FORMS.length}  ${formsFailed.length ? '(failed: ' + formsFailed.join(', ') + ')' : ''}`);
  console.log(`  Rules posted   : ${RULES.length - rulesFailed.length}/${RULES.length}  ${rulesFailed.length ? '(failed: ' + rulesFailed.length + ')' : ''}`);
  console.log(`  PDFs written   : ${NO_PDFS ? 'skipped' : Object.keys(pdfPaths).length + ' in ' + path.relative(process.cwd(), PDF_DIR)}`);
  console.log('');
  if (formsFailed.length || rulesFailed.length) {
    console.log('  One or more speculative endpoints rejected. To fix: capture a HAR');
    console.log('  of one manual form/rule create in the UI and share the POST body;');
    console.log('  the payload shape above is easy to adjust.');
    console.log('');
  }
  console.log('  Open in the UI:');
  console.log(`    ${BASE_URL}/coverage/${PRODUCT_ID}`);
  console.log(`    ${BASE_URL}/pricing/${PRODUCT_ID}`);
  console.log(`    ${BASE_URL}/forms/${PRODUCT_ID}`);
  console.log(`    ${BASE_URL}/rules/${PRODUCT_ID}`);
}

function buildCoverageBody(c, parentCoverageId, now) {
  return {
    productId:        PRODUCT_ID,
    name:             c.name,
    coverageCode:     c.coverageCode,
    category:         c.category,
    description:      c.description,        // speculative rich field
    scopeOfCoverage:  c.scopeOfCoverage,    // speculative rich field
    perilsCovered:    c.perilsCovered || [], // speculative rich field
    exclusions:       c.exclusions || [],    // speculative rich field
    formIds:          [],
    limits:           toLimits(c.limits),
    deductibles:      toDeds(c.deductibles),
    states:           c.states,
    parentCoverageId: parentCoverageId,
    createdAt:        now,
    updatedAt:        now,
  };
}

main().catch(err => {
  console.error('\nSeed failed:\n', err.message);
  process.exit(1);
});
