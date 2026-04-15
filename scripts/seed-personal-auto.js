#!/usr/bin/env node
/**
 * Seed Script: Personal Auto (ISO PP) Product
 *
 * Populates the app's Firestore with realistic Personal Lines Auto data.
 * Mirrors the conventions used by scripts/seed-homeowners.js so the Product
 * Hub UI renders the product identically to a hand-entered one.
 *
 * What it creates (under orgs/{orgId}/products/{productId}):
 *   - 1 product (Personal Auto — PP 00 01)
 *   - 1 product version
 *   - 15 coverages using the parent/sub-coverage model
 *       Root coverages:  BI, PD, MedPay, UM-BI, UIM-BI, PIP, Collision,
 *                        Comprehensive, Accident Forgiveness
 *       Sub-coverages:   Rental (Collision), Transportation (Collision),
 *                        Full Glass (Comp), Custom Equipment (Comp),
 *                        Towing (Comp), Gap (requires Coll AND Comp)
 *     Each sub-coverage sets `parentCoverageId` + `dependsOnCoverageId`
 *     + `requiredCoverageIds`, and parents carry `subCoverageIds`.
 *     This enforces "sub only applies when parent is purchased" at the
 *     data layer — the UI filters children by parent selection.
 *   - Limits & deductibles as sub-collections with realistic PL auto values
 *   - 14 rating steps (base, age, gender, marital, territory, symbol,
 *     violations, accidents, credit, multi-car, multi-policy, paid-in-full,
 *     total) + rating tables
 *   - 12 underwriting / rating rules
 *   - 51 state programs (50 states + DC) with realistic status mix
 *
 * Usage:
 *   # auth via ADC (preferred):
 *   firebase login
 *   # or point at a service account:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/abs/path/to/key.json
 *
 *   node scripts/seed-personal-auto.js              # seed
 *   node scripts/seed-personal-auto.js --reset      # wipe product first
 *   PROJECT_ID=insurance-product-hub-staging \
 *     node scripts/seed-personal-auto.js            # target a different env
 *
 * Note: the admin SDK bypasses Firestore security rules. This is the whole
 * point — rules enforce RBAC for interactive users; a seed script runs
 * with owner credentials. Never commit the service account key.
 */

const admin = require('../functions/node_modules/firebase-admin');

// ============================================================================
// Init
// ============================================================================
const PROJECT_ID = process.env.PROJECT_ID || 'insurance-product-hub';
admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();
const { Timestamp } = admin.firestore;
const ts = () => Timestamp.now();

const RESET = process.argv.includes('--reset');

// ============================================================================
// IDs / constants
// ============================================================================
const ORG_ID = 'org_acme_insurance';
const USER_ID = 'seed_user_001';
const USER_EMAIL = 'product.manager@acmeinsurance.com';
const USER_NAME = 'Sarah Chen';

const PRODUCT_ID = 'pp_personal_auto';
const PRODUCT_VERSION_ID = 'v1_2026';
const RATE_PROGRAM_ID = 'pp_base_rates';
const RATE_VERSION_ID = 'rv1_2026';

const audit = { createdAt: ts(), createdBy: USER_ID, updatedAt: ts(), updatedBy: USER_ID };

const ALL_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY',
];
const STATE_NAMES = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
  CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',
  LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',
  MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',
  NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',
  OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',
  WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
};

// No-fault states where PIP is required (and MedPay is typically optional/limited)
const NO_FAULT_STATES = ['FL','HI','KS','KY','MA','MI','MN','NJ','NY','ND','PA','UT'];

// ============================================================================
// Coverage catalog — the heart of the seed
//
// Parent/sub model:
//   - parent coverages have parentCoverageId: null
//   - sub-coverages have parentCoverageId: <parent id>
//   - sub-coverages also set requiredCoverageIds + dependsOnCoverageId so
//     the UI and rules engine can enforce "only if parent is purchased"
//     regardless of which field they happen to query.
// ============================================================================
const COVERAGES = [
  // ---- Root: Liability -------------------------------------------------------
  {
    id: 'cov_bi',
    name: 'Bodily Injury Liability',
    coverageCode: 'PP-BI',
    coverageKind: 'coverage',
    coverageCategory: 'Liability',
    description: 'Pays damages for bodily injury for which any insured becomes legally responsible because of an auto accident. Includes defense costs in addition to the limit of liability.',
    type: 'liability',
    isOptional: false,
    scopeOfCoverage: 'Bodily injury to third parties arising out of ownership, maintenance or use of a covered auto',
    perilsCovered: ['Auto accident bodily injury'],
    exclusions: ['Intentional acts', 'Business/commercial use', 'Racing', 'Workers comp exposure', 'Owned vehicles not listed'],
    coverageTrigger: 'occurrence',
    premiumBasis: 'rated',
    territoryType: 'stateSpecific',
    availabilityStates: ALL_STATES,
    displayOrder: 1,
    limits: [
      { limitType: 'split',          amount:  25000, displayValue: '25/50',       description: '$25,000 per person / $50,000 per accident (state minimum)' },
      { limitType: 'split',          amount:  50000, displayValue: '50/100',      description: '$50,000 per person / $100,000 per accident' },
      { limitType: 'split',          amount: 100000, displayValue: '100/300',     description: '$100,000 per person / $300,000 per accident', isDefault: true },
      { limitType: 'split',          amount: 250000, displayValue: '250/500',     description: '$250,000 per person / $500,000 per accident' },
      { limitType: 'combined',       amount: 500000, displayValue: '$500,000 CSL', description: 'Combined single limit' },
    ],
    deductibles: [],
  },
  {
    id: 'cov_pd',
    name: 'Property Damage Liability',
    coverageCode: 'PP-PD',
    coverageKind: 'coverage',
    coverageCategory: 'Liability',
    description: 'Pays damages for property damage for which any insured becomes legally responsible because of an auto accident. Covers damage to other vehicles, buildings, and personal property.',
    type: 'liability',
    isOptional: false,
    scopeOfCoverage: 'Property damage to third parties arising out of ownership, maintenance or use of a covered auto',
    coverageTrigger: 'occurrence',
    premiumBasis: 'rated',
    availabilityStates: ALL_STATES,
    displayOrder: 2,
    limits: [
      { limitType: 'perOccurrence', amount:  15000, displayValue: '$15,000' },
      { limitType: 'perOccurrence', amount:  25000, displayValue: '$25,000' },
      { limitType: 'perOccurrence', amount:  50000, displayValue: '$50,000', isDefault: true },
      { limitType: 'perOccurrence', amount: 100000, displayValue: '$100,000' },
      { limitType: 'perOccurrence', amount: 250000, displayValue: '$250,000' },
    ],
    deductibles: [],
  },

  // ---- Root: Medical / No-Fault ---------------------------------------------
  {
    id: 'cov_medpay',
    name: 'Medical Payments Coverage',
    coverageCode: 'PP-MP',
    coverageKind: 'coverage',
    coverageCategory: 'Medical',
    description: 'Pays reasonable and necessary medical expenses for the insured and passengers injured in an auto accident, regardless of fault. Applies within 3 years of the accident.',
    type: 'medical',
    isOptional: true,
    scopeOfCoverage: 'Medical expenses for insured and passengers',
    coverageTrigger: 'occurrence',
    premiumBasis: 'rated',
    availabilityStates: ALL_STATES.filter(s => !NO_FAULT_STATES.includes(s)),
    displayOrder: 3,
    limits: [
      { limitType: 'perPerson', amount:  1000, displayValue: '$1,000 per person' },
      { limitType: 'perPerson', amount:  5000, displayValue: '$5,000 per person', isDefault: true },
      { limitType: 'perPerson', amount: 10000, displayValue: '$10,000 per person' },
      { limitType: 'perPerson', amount: 25000, displayValue: '$25,000 per person' },
    ],
    deductibles: [],
  },
  {
    id: 'cov_pip',
    name: 'Personal Injury Protection (PIP)',
    coverageCode: 'PP-PIP',
    coverageKind: 'coverage',
    coverageCategory: 'Medical',
    description: 'First-party no-fault coverage for medical expenses, lost wages, and essential services regardless of fault. Required in no-fault states. Coverage limits and benefit structure vary significantly by state.',
    type: 'medical',
    isOptional: false,
    availabilityStates: NO_FAULT_STATES,
    scopeOfCoverage: 'First-party medical, wage-loss, and essential services benefits',
    coverageTrigger: 'occurrence',
    premiumBasis: 'rated',
    displayOrder: 4,
    limits: [
      { limitType: 'perPerson', amount:  10000, displayValue: '$10,000 per person (state minimum in most no-fault states)', isDefault: true },
      { limitType: 'perPerson', amount:  50000, displayValue: '$50,000 per person' },
      { limitType: 'perPerson', amount: 250000, displayValue: '$250,000 per person (NY)', description: 'New York No-Fault statutory benefit' },
    ],
    deductibles: [
      { deductibleType: 'flat', amount:    0, displayValue: '$0', isDefault: true },
      { deductibleType: 'flat', amount:  200, displayValue: '$200' },
      { deductibleType: 'flat', amount:  500, displayValue: '$500' },
      { deductibleType: 'flat', amount: 1000, displayValue: '$1,000' },
    ],
  },

  // ---- Root: Uninsured / Underinsured ---------------------------------------
  {
    id: 'cov_um_bi',
    name: 'Uninsured Motorist — Bodily Injury',
    coverageCode: 'PP-UMBI',
    coverageKind: 'coverage',
    coverageCategory: 'Liability',
    description: 'Pays for bodily injury caused by an at-fault driver who has no liability insurance. Includes hit-and-run losses in most states.',
    type: 'liability',
    isOptional: true,
    requiredCoverageIds: ['cov_bi'], // UM BI limits typically cannot exceed BI limits
    dependsOnCoverageId: ['cov_bi'],
    availabilityStates: ALL_STATES,
    coverageTrigger: 'occurrence',
    premiumBasis: 'rated',
    displayOrder: 5,
    limits: [
      { limitType: 'split', amount:  25000, displayValue: '25/50' },
      { limitType: 'split', amount:  50000, displayValue: '50/100' },
      { limitType: 'split', amount: 100000, displayValue: '100/300', isDefault: true },
      { limitType: 'split', amount: 250000, displayValue: '250/500' },
    ],
    deductibles: [],
  },
  {
    id: 'cov_uim_bi',
    name: 'Underinsured Motorist — Bodily Injury',
    coverageCode: 'PP-UIMBI',
    coverageKind: 'coverage',
    coverageCategory: 'Liability',
    description: 'Pays for bodily injury caused by an at-fault driver whose liability limits are insufficient to cover the loss.',
    type: 'liability',
    isOptional: true,
    requiredCoverageIds: ['cov_um_bi'],
    dependsOnCoverageId: ['cov_um_bi'],
    availabilityStates: ALL_STATES,
    coverageTrigger: 'occurrence',
    premiumBasis: 'rated',
    displayOrder: 6,
    limits: [
      { limitType: 'split', amount:  50000, displayValue: '50/100' },
      { limitType: 'split', amount: 100000, displayValue: '100/300', isDefault: true },
      { limitType: 'split', amount: 250000, displayValue: '250/500' },
    ],
    deductibles: [],
  },

  // ---- Root: Physical Damage (the gateway to most sub-coverages) ------------
  {
    id: 'cov_collision',
    name: 'Collision Coverage',
    coverageCode: 'PP-COLL',
    coverageKind: 'coverage',
    coverageCategory: 'Property',
    description: 'Pays for direct and accidental loss to your covered auto caused by collision with another object or overturn. Subject to a per-loss deductible.',
    type: 'property',
    isOptional: true,
    availabilityStates: ALL_STATES,
    valuationMethod: 'ACV',
    coverageTrigger: 'occurrence',
    premiumBasis: 'rated',
    displayOrder: 7,
    subCoverageIds: ['cov_rental', 'cov_transportation'],
    limits: [
      { limitType: 'perOccurrence', amount: 0, displayValue: 'Actual cash value (ACV) less deductible', isDefault: true },
    ],
    deductibles: [
      { deductibleType: 'flat', amount:  250, displayValue: '$250' },
      { deductibleType: 'flat', amount:  500, displayValue: '$500', isDefault: true },
      { deductibleType: 'flat', amount: 1000, displayValue: '$1,000' },
      { deductibleType: 'flat', amount: 2000, displayValue: '$2,000' },
    ],
  },
  {
    id: 'cov_comprehensive',
    name: 'Comprehensive Coverage (Other Than Collision)',
    coverageCode: 'PP-COMP',
    coverageKind: 'coverage',
    coverageCategory: 'Property',
    description: 'Pays for direct and accidental loss to your covered auto not caused by collision — including theft, fire, vandalism, glass breakage, animal strike, falling objects, flood, and hail.',
    type: 'property',
    isOptional: true,
    availabilityStates: ALL_STATES,
    valuationMethod: 'ACV',
    coverageTrigger: 'occurrence',
    premiumBasis: 'rated',
    perilsCovered: ['Theft', 'Fire', 'Vandalism', 'Glass breakage', 'Animal strike', 'Falling objects', 'Flood', 'Hail', 'Windstorm', 'Riot'],
    displayOrder: 8,
    subCoverageIds: ['cov_full_glass', 'cov_custom_equip', 'cov_towing'],
    limits: [
      { limitType: 'perOccurrence', amount: 0, displayValue: 'Actual cash value (ACV) less deductible', isDefault: true },
    ],
    deductibles: [
      { deductibleType: 'flat', amount:  100, displayValue: '$100' },
      { deductibleType: 'flat', amount:  250, displayValue: '$250' },
      { deductibleType: 'flat', amount:  500, displayValue: '$500', isDefault: true },
      { deductibleType: 'flat', amount: 1000, displayValue: '$1,000' },
    ],
  },

  // ---- Root: Compound dependency --------------------------------------------
  // Gap is technically a root coverage, but it's only meaningful when BOTH
  // Collision AND Comprehensive are purchased (otherwise there's no ACV
  // settlement for the gap to fill). We model that with requiredCoverageIds.
  {
    id: 'cov_gap',
    name: 'Auto Loan/Lease Gap Coverage',
    coverageCode: 'PP-GAP',
    coverageKind: 'endorsement',
    coverageCategory: 'Property',
    description: 'Pays the difference between the actual cash value of the covered auto at the time of a total loss and the outstanding balance on the loan or lease. Requires both Collision and Comprehensive.',
    type: 'property',
    isOptional: true,
    requiredCoverageIds: ['cov_collision', 'cov_comprehensive'],
    dependsOnCoverageId: ['cov_collision', 'cov_comprehensive'],
    availabilityStates: ALL_STATES,
    valuationMethod: 'agreedValue',
    coverageTrigger: 'occurrence',
    premiumBasis: 'flat',
    displayOrder: 9,
    limits: [
      { limitType: 'perOccurrence', amount: 50000, displayValue: 'Up to 25% of ACV or actual gap, whichever is less', isDefault: true },
    ],
    deductibles: [],
  },

  // ---- Sub-coverages of Collision -------------------------------------------
  {
    id: 'cov_rental',
    name: 'Transportation Expenses (Rental Reimbursement)',
    coverageCode: 'PP-RENT',
    coverageKind: 'endorsement',
    coverageCategory: 'Property',
    description: 'Reimburses the cost of a rental car while your covered auto is out of service due to a covered collision or comprehensive loss. Daily limit × max days.',
    type: 'property',
    isOptional: true,
    parentCoverageId: 'cov_collision',
    requiredCoverageIds: ['cov_collision'],
    dependsOnCoverageId: ['cov_collision'],
    availabilityStates: ALL_STATES,
    premiumBasis: 'flat',
    displayOrder: 10,
    limits: [
      { limitType: 'perOccurrence', amount:   900, displayValue: '$30/day × 30 days = $900', isDefault: true },
      { limitType: 'perOccurrence', amount:  1500, displayValue: '$50/day × 30 days = $1,500' },
      { limitType: 'perOccurrence', amount:  2400, displayValue: '$80/day × 30 days = $2,400' },
    ],
    deductibles: [],
  },
  {
    id: 'cov_transportation',
    name: 'Additional Transportation (PP 03 02)',
    coverageCode: 'PP-XPORT',
    coverageKind: 'endorsement',
    coverageCategory: 'Property',
    description: 'Increases the $20/day / $600 max default transportation expense in the base policy. Applies while a covered auto is withdrawn from use after a covered loss.',
    type: 'property',
    isOptional: true,
    parentCoverageId: 'cov_collision',
    requiredCoverageIds: ['cov_collision'],
    dependsOnCoverageId: ['cov_collision'],
    availabilityStates: ALL_STATES,
    premiumBasis: 'flat',
    displayOrder: 11,
    limits: [
      { limitType: 'perOccurrence', amount: 600, displayValue: '$20/day / $600 max (base policy)', description: 'Included by default' },
      { limitType: 'perOccurrence', amount: 1500, displayValue: '$50/day / $1,500 max', isDefault: true },
      { limitType: 'perOccurrence', amount: 3000, displayValue: '$100/day / $3,000 max' },
    ],
    deductibles: [],
  },

  // ---- Sub-coverages of Comprehensive ---------------------------------------
  {
    id: 'cov_full_glass',
    name: 'Full Safety Glass Coverage',
    coverageCode: 'PP-GLASS',
    coverageKind: 'endorsement',
    coverageCategory: 'Property',
    description: 'Waives the comprehensive deductible for glass-only losses (windshield, side, and rear glass). Separate deductible of $0 applies to safety glass repair or replacement.',
    type: 'property',
    isOptional: true,
    parentCoverageId: 'cov_comprehensive',
    requiredCoverageIds: ['cov_comprehensive'],
    dependsOnCoverageId: ['cov_comprehensive'],
    availabilityStates: ALL_STATES,
    premiumBasis: 'flat',
    displayOrder: 12,
    limits: [
      { limitType: 'perOccurrence', amount: 0, displayValue: 'ACV (no separate limit)', isDefault: true },
    ],
    deductibles: [
      { deductibleType: 'flat', amount: 0, displayValue: '$0 (glass-only)', isDefault: true },
    ],
  },
  {
    id: 'cov_custom_equip',
    name: 'Custom Equipment Coverage',
    coverageCode: 'PP-CUSTOM',
    coverageKind: 'endorsement',
    coverageCategory: 'Property',
    description: 'Covers loss to custom furnishings, equipment, or electronic equipment permanently installed in or attached to the covered auto. Base policy provides $1,500; this schedules higher limits.',
    type: 'property',
    isOptional: true,
    parentCoverageId: 'cov_comprehensive',
    requiredCoverageIds: ['cov_comprehensive'],
    dependsOnCoverageId: ['cov_comprehensive'],
    availabilityStates: ALL_STATES,
    valuationMethod: 'ACV',
    premiumBasis: 'rated',
    displayOrder: 13,
    limits: [
      { limitType: 'perOccurrence', amount:  1500, displayValue: '$1,500 (base policy)', description: 'Included by default' },
      { limitType: 'perOccurrence', amount:  5000, displayValue: '$5,000 scheduled', isDefault: true },
      { limitType: 'perOccurrence', amount: 10000, displayValue: '$10,000 scheduled' },
      { limitType: 'perOccurrence', amount: 25000, displayValue: '$25,000 scheduled (U/W approval required)' },
    ],
    deductibles: [
      { deductibleType: 'flat', amount: 500, displayValue: 'Follows Comprehensive deductible', isDefault: true },
    ],
  },
  {
    id: 'cov_towing',
    name: 'Towing and Labor Costs (PP 03 03)',
    coverageCode: 'PP-TOW',
    coverageKind: 'endorsement',
    coverageCategory: 'Property',
    description: 'Reimburses towing and on-scene labor (at the place of disablement) for each disablement of a covered auto, up to a selected per-disablement limit.',
    type: 'property',
    isOptional: true,
    parentCoverageId: 'cov_comprehensive',
    requiredCoverageIds: ['cov_comprehensive'],
    dependsOnCoverageId: ['cov_comprehensive'],
    availabilityStates: ALL_STATES,
    premiumBasis: 'flat',
    displayOrder: 14,
    limits: [
      { limitType: 'perOccurrence', amount:  50, displayValue: '$50 per disablement' },
      { limitType: 'perOccurrence', amount:  75, displayValue: '$75 per disablement', isDefault: true },
      { limitType: 'perOccurrence', amount: 100, displayValue: '$100 per disablement' },
      { limitType: 'perOccurrence', amount: 200, displayValue: '$200 per disablement' },
    ],
    deductibles: [],
  },

  // ---- Root: Standalone endorsement -----------------------------------------
  {
    id: 'cov_accident_forgiveness',
    name: 'Accident Forgiveness',
    coverageCode: 'PP-AF',
    coverageKind: 'endorsement',
    coverageCategory: 'Liability',
    description: 'Waives the surcharge for the first at-fault accident after five continuous years of accident-free driving with the company. Not available in CA.',
    type: 'liability',
    isOptional: true,
    availabilityStates: ALL_STATES.filter(s => s !== 'CA'),
    premiumBasis: 'flat',
    displayOrder: 15,
    limits: [],
    deductibles: [],
  },
];

// Normalize the catalog so every document has the same shape.
// Roots get parentCoverageId: null explicitly (required by the schema).
for (const c of COVERAGES) {
  c.parentCoverageId = c.parentCoverageId || null;
  c.subCoverageIds = c.subCoverageIds || [];
  c.requiredCoverageIds = c.requiredCoverageIds || [];
  c.dependsOnCoverageId = c.dependsOnCoverageId || [];
}

// ============================================================================
// Rating steps (12 steps, realistic PL auto)
// ============================================================================
const RATING_STEPS = [
  { id: 'step_base',        order:  1, stepType: 'set',          label: 'Base Rate by Coverage',        field: 'base_rate',        value: 1.00, description: 'Per-coverage base rate from the rating table.' },
  { id: 'step_territory',   order:  2, stepType: 'table_lookup', label: 'Territory Factor',              field: 'territory_factor',   tableName: 'Territory Factors',     lookupField: 'garaging_territory' },
  { id: 'step_age',         order:  3, stepType: 'table_lookup', label: 'Driver Age Factor',             field: 'age_factor',         tableName: 'Age Factors',           lookupField: 'driver_age_band' },
  { id: 'step_gender',      order:  4, stepType: 'table_lookup', label: 'Gender Factor',                 field: 'gender_factor',      tableName: 'Gender Factors',        lookupField: 'driver_gender', description: 'Not used in CA, HI, MA, MI, MT, NC, PA.' },
  { id: 'step_marital',     order:  5, stepType: 'table_lookup', label: 'Marital Status Factor',         field: 'marital_factor',     tableName: 'Marital Factors',       lookupField: 'marital_status' },
  { id: 'step_symbol',      order:  6, stepType: 'table_lookup', label: 'Vehicle Symbol Factor',         field: 'symbol_factor',      tableName: 'Vehicle Symbol Factors', lookupField: 'iso_symbol', description: 'Applies to COLL and COMP only.' },
  { id: 'step_mileage',     order:  7, stepType: 'table_lookup', label: 'Annual Mileage Factor',         field: 'mileage_factor',     tableName: 'Mileage Factors',       lookupField: 'annual_mileage_band' },
  { id: 'step_violations',  order:  8, stepType: 'formula',      label: 'Violation Surcharge',           field: 'violation_factor',   formula: '1 + MIN(violation_points * 0.10, 1.00)', description: 'Capped at +100%.' },
  { id: 'step_accidents',   order:  9, stepType: 'formula',      label: 'At-Fault Accident Surcharge',   field: 'accident_factor',    formula: '1 + MIN(at_fault_accidents_3yr * 0.15, 1.00)', description: 'Capped at +100%. Waived if Accident Forgiveness applies.' },
  { id: 'step_credit',      order: 10, stepType: 'table_lookup', label: 'Insurance Score Factor',        field: 'credit_factor',      tableName: 'Insurance Score Factors', lookupField: 'insurance_score_band', description: 'Prohibited in CA, HI, MA, MI.' },
  { id: 'step_multi_car',   order: 11, stepType: 'formula',      label: 'Multi-Car Discount',            field: 'multi_car_factor',   formula: 'vehicles_on_policy >= 2 ? 0.85 : 1.00' },
  { id: 'step_multi_policy',order: 12, stepType: 'formula',      label: 'Multi-Policy Discount',         field: 'bundle_factor',      formula: 'has_homeowners_with_us ? 0.90 : 1.00' },
  { id: 'step_paid_in_full',order: 13, stepType: 'formula',      label: 'Paid-in-Full Discount',         field: 'pif_factor',         formula: 'pay_plan == "FULL" ? 0.95 : 1.00' },
  { id: 'step_total',       order: 14, stepType: 'multiply',     label: 'Final Coverage Premium',        field: 'coverage_premium',   description: 'Product of base rate and all factors, by coverage.' },
];

const TERRITORY_FACTORS = {
  'T01': { label: 'Dense Urban',    factor: 1.35 },
  'T02': { label: 'Urban',          factor: 1.20 },
  'T03': { label: 'Suburban',       factor: 1.00 },
  'T04': { label: 'Small City',     factor: 0.92 },
  'T05': { label: 'Rural',          factor: 0.82 },
  'T06': { label: 'Coastal Metro',  factor: 1.28 },
};
const AGE_FACTORS = {
  '16-19': 2.25, '20-24': 1.75, '25-29': 1.20, '30-49': 1.00,
  '50-64': 0.95, '65-74': 1.05, '75+':   1.25,
};
const GENDER_FACTORS = { 'M': 1.05, 'F': 0.97, 'X': 1.00 };
const MARITAL_FACTORS = { 'Single': 1.05, 'Married': 0.93, 'Divorced': 1.00, 'Widowed': 0.95 };
const SYMBOL_FACTORS = {
  '1-10':  0.75, '11-15': 0.85, '16-20': 0.95, '21-25': 1.00,
  '26-30': 1.10, '31-40': 1.25, '41-50': 1.50, '51-75': 2.00,
};
const MILEAGE_FACTORS = {
  '0-7499':     0.88, '7500-9999':   0.95, '10000-12499': 1.00,
  '12500-14999':1.05, '15000-19999': 1.10, '20000+':      1.18,
};
const CREDIT_FACTORS = {
  'Excellent (800+)':   0.82, 'Very Good (740-799)': 0.90,
  'Good (670-739)':     1.00, 'Fair (580-669)':      1.18,
  'Poor (300-579)':     1.45, 'No Hit':              1.10,
};

// ============================================================================
// Underwriting / rating rules
// ============================================================================
const RULES = [
  { id: 'rule_young_driver',        name: 'Young Driver Surcharge',         type: 'rating',      description: 'Drivers under age 25 receive a surcharge factor on BI, PD, and Collision coverages.' },
  { id: 'rule_senior_driver',       name: 'Senior Driver Surcharge',        type: 'rating',      description: 'Drivers age 75+ receive a moderate surcharge on BI and PD.' },
  { id: 'rule_sr22',                name: 'SR-22 Filing Required',          type: 'eligibility', description: 'DUI, reckless driving, or driving without insurance in the prior 36 months requires SR-22 filing and assigns non-standard tier.' },
  { id: 'rule_good_student',        name: 'Good Student Discount',          type: 'rating',      description: 'Drivers under 25 with GPA ≥ 3.0 or top-20% class rank receive a 10% discount on BI, PD, COLL, and COMP.' },
  { id: 'rule_defensive_driver',    name: 'Defensive Driver Discount',      type: 'rating',      description: 'Completion of an approved defensive driving course in the prior 36 months yields a 5% discount.' },
  { id: 'rule_antitheft',           name: 'Passive Anti-Theft Discount',    type: 'rating',      description: 'Vehicles equipped with a passive anti-theft device receive a 5–15% discount on Comprehensive.' },
  { id: 'rule_lapse_surcharge',     name: 'Coverage Lapse Surcharge',       type: 'rating',      description: 'Applicants with a lapse in prior insurance coverage of 60+ days in the last 12 months receive a 15% surcharge on BI and PD.' },
  { id: 'rule_non_standard_tier',   name: 'High-Risk Tier Assignment',      type: 'underwriting',description: 'Applicants with 6+ violation points or 3+ at-fault accidents in the prior 3 years are moved to the non-standard rating tier.' },
  { id: 'rule_state_min_limits',    name: 'State Minimum Liability Limits', type: 'eligibility', description: 'BI and PD limits must meet or exceed state financial responsibility minimums. System auto-applies the binding minimum by garaging state.' },
  { id: 'rule_um_rejection',        name: 'UM Rejection Form Required',     type: 'compliance',  description: 'Where state law allows rejection of UM coverage, applicants must sign a state-approved UM/UIM rejection form before UM can be declined or reduced.' },
  { id: 'rule_no_fault_pip',        name: 'No-Fault PIP Mandatory',         type: 'eligibility', description: 'In no-fault states (FL, HI, KS, KY, MA, MI, MN, NJ, NY, ND, PA, UT) Personal Injury Protection is mandatory with state-specified benefits.' },
  { id: 'rule_gap_dependency',      name: 'Gap Requires Full Coverage',     type: 'eligibility', description: 'Auto Loan/Lease Gap coverage can only be bound when both Collision and Comprehensive are also bound on the same vehicle.' },
  { id: 'rule_accident_forgiveness',name: 'Accident Forgiveness Eligibility',type:'underwriting',description: 'Accident Forgiveness endorsement may be added only after five continuous years accident-free with the company. Not filed in CA.' },
];

// ============================================================================
// Helpers
// ============================================================================
async function deleteCollectionRecursive(path, batchSize = 250) {
  const ref = db.collection(path);
  const snap = await ref.limit(batchSize).get();
  if (snap.empty) return;
  for (const doc of snap.docs) {
    const subs = await doc.ref.listCollections();
    for (const sub of subs) {
      await deleteCollectionRecursive(`${sub.path}`, batchSize);
    }
  }
  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  if (snap.size === batchSize) return deleteCollectionRecursive(path, batchSize);
}

async function resetProduct() {
  console.log('  → Reset: deleting existing product and related docs...');
  const productPath = `orgs/${ORG_ID}/products/${PRODUCT_ID}`;
  const productRef = db.doc(productPath);

  const subs = await productRef.listCollections();
  for (const sub of subs) {
    await deleteCollectionRecursive(sub.path);
  }
  await productRef.delete().catch(() => {});

  // Orphaned rate program + tables for this product
  const rp = db.doc(`orgs/${ORG_ID}/ratePrograms/${RATE_PROGRAM_ID}`);
  const rpSubs = await rp.listCollections();
  for (const sub of rpSubs) await deleteCollectionRecursive(sub.path);
  await rp.delete().catch(() => {});

  for (const ruleId of RULES.map(r => r.id)) {
    const ruleDoc = db.doc(`orgs/${ORG_ID}/rules/${ruleId}`);
    const ruleSubs = await ruleDoc.listCollections();
    for (const sub of ruleSubs) await deleteCollectionRecursive(sub.path);
    await ruleDoc.delete().catch(() => {});
  }

  for (const tblId of ['tbl_pa_territory','tbl_pa_age','tbl_pa_gender','tbl_pa_marital','tbl_pa_symbol','tbl_pa_mileage','tbl_pa_credit']) {
    const tblDoc = db.doc(`orgs/${ORG_ID}/tables/${tblId}`);
    const tblSubs = await tblDoc.listCollections();
    for (const sub of tblSubs) await deleteCollectionRecursive(sub.path);
    await tblDoc.delete().catch(() => {});
  }
}

// ============================================================================
// Seeders
// ============================================================================
async function seedOrgAndUser() {
  console.log('  → Org / user profile (idempotent)...');
  await db.doc(`orgs/${ORG_ID}`).set({
    id: ORG_ID,
    name: 'Acme Insurance Company',
    settings: { allowInvites: true, defaultRole: 'viewer' },
    createdAt: ts(),
    createdBy: USER_ID,
  }, { merge: true });

  await db.doc(`orgs/${ORG_ID}/members/${USER_ID}`).set({
    orgId: ORG_ID, userId: USER_ID, email: USER_EMAIL,
    displayName: USER_NAME, role: 'admin', status: 'active',
    joinedAt: ts(), ...audit,
  }, { merge: true });

  await db.doc(`users/${USER_ID}`).set({
    primaryOrgId: ORG_ID, displayName: USER_NAME,
    email: USER_EMAIL, createdAt: ts(),
  }, { merge: true });
}

async function seedProduct() {
  console.log('  → Product + version...');
  await db.doc(`orgs/${ORG_ID}/products/${PRODUCT_ID}`).set({
    orgId: ORG_ID,
    productCode: 'PP',
    name: 'Personal Auto',
    description: 'ISO Personal Auto Policy (PP 00 01 09 18). Provides liability, uninsured/underinsured motorist, medical/no-fault, and physical damage coverages for private passenger autos.',
    category: 'Personal Lines',
    lineOfBusiness: 'Personal Auto',
    status: 'active',
    states: ALL_STATES,
    version: 1,
    formNumber: 'PP 00 01',
    effectiveDate: '09/18',
    coverageCount: COVERAGES.length,
    ruleCount: RULES.length,
    ...audit,
  });

  await db.doc(`orgs/${ORG_ID}/products/${PRODUCT_ID}/versions/${PRODUCT_VERSION_ID}`).set({
    entityId: PRODUCT_ID,
    versionNumber: 1,
    status: 'published',
    effectiveStart: '2026-01-01',
    effectiveEnd: '2026-12-31',
    summary: 'Personal Auto 2026 — initial filing',
    notes: 'Base PP filing with 2026 ISO circular updates and refreshed territory/symbol factors.',
    publishedAt: ts(),
    publishedBy: USER_ID,
    ...audit,
  });
}

async function seedCoverages() {
  console.log(`  → ${COVERAGES.length} coverages (parent/sub-coverage model)...`);
  for (const cov of COVERAGES) {
    const { limits, deductibles, ...coreFields } = cov;
    const covRef = db.doc(`orgs/${ORG_ID}/products/${PRODUCT_ID}/coverages/${cov.id}`);
    await covRef.set({
      ...coreFields,
      productId: PRODUCT_ID,
      limitCount:        limits.length,
      deductibleCount:   deductibles.length,
      subCoverageCount:  coreFields.subCoverageIds.length,
      ...audit,
    });

    for (let i = 0; i < limits.length; i++) {
      const limId = `${cov.id}_lim_${i}`;
      await db.doc(`orgs/${ORG_ID}/products/${PRODUCT_ID}/coverages/${cov.id}/limits/${limId}`).set({
        id: limId, coverageId: cov.id, productId: PRODUCT_ID,
        ...limits[i], displayOrder: i, ...audit,
      });
    }
    for (let i = 0; i < deductibles.length; i++) {
      const dedId = `${cov.id}_ded_${i}`;
      await db.doc(`orgs/${ORG_ID}/products/${PRODUCT_ID}/coverages/${cov.id}/deductibles/${dedId}`).set({
        id: dedId, coverageId: cov.id, productId: PRODUCT_ID,
        ...deductibles[i], displayOrder: i, ...audit,
      });
    }

    const marker = cov.parentCoverageId ? '    └─' : '  •';
    console.log(`    ${marker} ${cov.name} (${cov.coverageCode})`);
  }
}

async function seedRules() {
  console.log(`  → ${RULES.length} rules...`);
  for (const r of RULES) {
    await db.doc(`orgs/${ORG_ID}/rules/${r.id}`).set({
      orgId: ORG_ID,
      name: r.name,
      description: r.description,
      type: r.type,
      versionCount: 1,
      archived: false,
      latestPublishedVersionId: `${r.id}_v1`,
      ...audit,
    });
    await db.doc(`orgs/${ORG_ID}/rules/${r.id}/versions/${r.id}_v1`).set({
      ruleId: r.id,
      versionNumber: 1,
      status: 'published',
      conditions: { operator: 'AND', conditions: [] },
      outcome: { action: 'flag', message: r.description },
      scope: { productIds: [PRODUCT_ID] },
      effectiveStart: '2026-01-01',
      effectiveEnd: null,
      summary: r.name,
      publishedAt: ts(),
      publishedBy: USER_ID,
      ...audit,
    });
  }
}

async function seedRateProgram() {
  console.log('  → Rate program, steps, and rating tables...');
  await db.doc(`orgs/${ORG_ID}/ratePrograms/${RATE_PROGRAM_ID}`).set({
    orgId: ORG_ID,
    name: 'Personal Auto Base Rating Program',
    description: 'Per-coverage multiplicative rating with driver, vehicle, territory, and household factors.',
    status: 'active',
    ...audit,
  });

  await db.doc(`orgs/${ORG_ID}/ratePrograms/${RATE_PROGRAM_ID}/versions/${RATE_VERSION_ID}`).set({
    rateProgramId: RATE_PROGRAM_ID,
    versionNumber: 1,
    status: 'published',
    publishedAt: ts(),
    publishedBy: USER_ID,
    effectiveStart: ts(),
    effectiveEnd: null,
    ...audit,
  });

  for (const step of RATING_STEPS) {
    await db.doc(`orgs/${ORG_ID}/ratePrograms/${RATE_PROGRAM_ID}/versions/${RATE_VERSION_ID}/steps/${step.id}`).set({
      rateProgramVersionId: RATE_VERSION_ID,
      ...step,
      createdAt: ts(),
    });
  }

  const tables = [
    { id: 'tbl_pa_territory', name: 'Territory Factors',       dimName: 'Territory Code', data: TERRITORY_FACTORS, cellFn: (v) => ({ value: v.factor, label: v.label }) },
    { id: 'tbl_pa_age',       name: 'Age Factors',             dimName: 'Age Band',        data: AGE_FACTORS },
    { id: 'tbl_pa_gender',    name: 'Gender Factors',          dimName: 'Gender',          data: GENDER_FACTORS },
    { id: 'tbl_pa_marital',   name: 'Marital Factors',         dimName: 'Marital Status',  data: MARITAL_FACTORS },
    { id: 'tbl_pa_symbol',    name: 'Vehicle Symbol Factors',  dimName: 'ISO Symbol Band', data: SYMBOL_FACTORS },
    { id: 'tbl_pa_mileage',   name: 'Mileage Factors',         dimName: 'Annual Mileage',  data: MILEAGE_FACTORS },
    { id: 'tbl_pa_credit',    name: 'Insurance Score Factors', dimName: 'Score Band',      data: CREDIT_FACTORS },
  ];
  for (const t of tables) {
    await db.doc(`orgs/${ORG_ID}/tables/${t.id}`).set({
      orgId: ORG_ID, name: t.name, description: `${t.name} for Personal Auto`, ...audit,
    });
    const cells = Object.fromEntries(Object.entries(t.data).map(([k, v]) => [k, t.cellFn ? t.cellFn(v) : { value: v }]));
    await db.doc(`orgs/${ORG_ID}/tables/${t.id}/versions/${t.id}_v1`).set({
      tableId: t.id,
      versionNumber: 1,
      status: 'published',
      dimensions: [{ name: t.dimName, type: 'discrete', values: Object.keys(t.data) }],
      cellStorage: { cells, storageType: 'sparse' },
      publishedAt: ts(),
      publishedBy: USER_ID,
      effectiveStart: ts(),
      effectiveEnd: null,
      ...audit,
    });
  }
}

async function seedStatePrograms() {
  console.log(`  → ${ALL_STATES.length} state programs...`);
  // Realistic mix: most active, a couple filed-pending, a few in draft
  const filedPending = ['CA', 'NY', 'FL', 'TX'];
  const draft = ['MA', 'NJ'];
  const notOffered = ['HI'];

  for (const stateCode of ALL_STATES) {
    let status = 'active';
    if (notOffered.includes(stateCode)) status = 'not_offered';
    else if (draft.includes(stateCode)) status = 'draft';
    else if (filedPending.includes(stateCode)) status = 'filed';

    const doc = {
      stateCode, stateName: STATE_NAMES[stateCode], status,
      requiredArtifacts: {
        ruleVersionIds: RULES.map(r => `${r.id}_v1`),
        rateProgramVersionIds: [RATE_VERSION_ID],
      },
      validationErrors: [],
      ...audit,
    };
    if (status === 'filed') doc.filingDate = ts();
    if (status === 'active') { doc.filingDate = ts(); doc.approvalDate = ts(); doc.activationDate = ts(); }

    await db.doc(`orgs/${ORG_ID}/products/${PRODUCT_ID}/versions/${PRODUCT_VERSION_ID}/statePrograms/${stateCode}`).set(doc);
  }
}

// ============================================================================
// Main
// ============================================================================
async function main() {
  console.log('');
  console.log('============================================================');
  console.log('  Seeding Personal Auto (PP 00 01) into Firestore');
  console.log(`  Project : ${PROJECT_ID}`);
  console.log(`  Org     : ${ORG_ID}`);
  console.log(`  Product : ${PRODUCT_ID}`);
  console.log(`  Reset   : ${RESET ? 'yes' : 'no'}`);
  console.log('============================================================');

  try {
    if (RESET) await resetProduct();

    await seedOrgAndUser();
    await seedProduct();
    await seedCoverages();
    await seedRules();
    await seedRateProgram();
    await seedStatePrograms();

    const roots = COVERAGES.filter(c => !c.parentCoverageId).length;
    const subs  = COVERAGES.length - roots;

    console.log('');
    console.log('------------------------------------------------------------');
    console.log('  Seed complete.');
    console.log('------------------------------------------------------------');
    console.log(`  Coverages     : ${COVERAGES.length}  (root: ${roots}, sub: ${subs})`);
    console.log(`  Rating steps  : ${RATING_STEPS.length}`);
    console.log(`  Rating tables : 7`);
    console.log(`  Rules         : ${RULES.length}`);
    console.log(`  State programs: ${ALL_STATES.length}`);
    console.log('');
    console.log(`  Open in the app:`);
    console.log(`    /product/${PRODUCT_ID}  (scoped to ${ORG_ID})`);
    console.log('');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
  process.exit(0);
}

main();
