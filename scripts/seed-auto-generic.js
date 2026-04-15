#!/usr/bin/env node
/**
 * Seed: Generic Personal Auto (ISO PP 00 01 style, 50-state)
 *
 * Patterned after the Enthusiast+ CO seed but tuned for mass-market standard
 * personal auto. Loads a clean PCM hierarchy into the product "Auto - Generic":
 *
 *   Product (Auto - Generic)
 *    |- LOB:        Personal Auto
 *    |- Coverages:  7 root + 10 sub-coverages / endorsements
 *    |- Rates:      single-vehicle multiplicative chain with real ISO-style
 *                   factor tables embedded on each step + dimensions + operand
 *                   separators between factor rows
 *    |- Rules:      28 plain-English, ASCII-only manual rules
 *    |- Dict:       30 data-dictionary fields (every input the algorithm uses)
 *
 * Endpoints used (all confirmed via prior HAR captures):
 *   POST  /api/coverages              (create coverage; parentCoverageId wires the tree)
 *   POST  /api/pricing-steps          (step body accepts extra fields incl. tableData)
 *   POST  /api/items/dimension        (populate table axes under a step)
 *   POST  /api/rules                  (plain-text rule bodies)
 *   POST  /api/data-dictionary        (field catalog)
 *   DELETE /api/coverages/:id         (full clean of coverages on product)
 *   DELETE /api/items/single/:id      (universal delete for rules / pricing / dimensions / dd)
 *
 * Safe: scoped to one PRODUCT_ID. Wipes that product's coverages / rules /
 * pricing-steps / dimensions / data-dictionary entries and reseeds. Does not
 * touch other products on the demo.
 *
 * Usage:
 *   PRODUCT_ID=product-4903e336-36e2-40fd-864e-624e5878559c node scripts/seed-auto-generic.js
 *   DRY_RUN=1 node scripts/seed-auto-generic.js
 */

'use strict';

const BASE_URL   = process.env.BASE_URL   || 'https://app-nvi-demo-prohub-insurance-pl.azurewebsites.net';
const PRODUCT_ID = process.env.PRODUCT_ID || 'product-4903e336-36e2-40fd-864e-624e5878559c';
const DRY_RUN    = process.env.DRY_RUN === '1';
const NOW        = new Date().toISOString();

const HDRS = { 'Accept':'*/*', 'Content-Type':'application/json',
  'Origin': BASE_URL, 'Referer': `${BASE_URL}/coverage/${PRODUCT_ID}` };

async function req(method, path, body) {
  if (DRY_RUN && method !== 'GET') { console.log(`    [dry] ${method} ${path}`); return { id:'dry' }; }
  const res = await fetch(`${BASE_URL}${path}`, { method, headers: HDRS, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${(await res.text()).slice(0,200)}`);
  const t = await res.text();
  try { return JSON.parse(t); } catch { return t; }
}

function assertAscii(label, s) {
  if (typeof s !== 'string') return;
  const m = s.match(/[^\x20-\x7E\t\r\n]/g);
  if (m) throw new Error(`Non-ASCII in ${label}: ${JSON.stringify(m)} :: ${s.slice(0,120)}`);
}

const ALL_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
const NO_FAULT   = ['FL','HI','KS','KY','MA','MI','MN','NJ','NY','ND','PA','UT'];

// ============================================================================
// Rating tables (ISO-style generic PPA factors)
// ============================================================================

const T_BASE = {                          // per-coverage annual base rate
  'BI': 385.00, 'PD': 275.00, 'MP': 32.00, 'PIP': 48.00,
  'UM BI': 62.00, 'UIM BI': 48.00, 'UM PD': 22.00,
  'COMP': 168.00, 'COLL': 198.00,
};

const T_LIMIT_SPLIT = {                   // BI / UM / UIM split-limit ILF
  '25/50':   { BI: 0.70, 'UM BI': 0.60, 'UIM BI': 0.60 },
  '50/100':  { BI: 0.88, 'UM BI': 0.78, 'UIM BI': 0.78 },
  '100/300': { BI: 1.00, 'UM BI': 1.00, 'UIM BI': 1.00 },
  '250/500': { BI: 1.32, 'UM BI': 1.42, 'UIM BI': 1.42 },
  '500/500': { BI: 1.60, 'UM BI': 2.50, 'UIM BI': 2.50 },
};
const T_LIMIT_PD = {                      // PD single-limit ILF
  '15000':  0.84, '25000':  0.90, '50000':  0.95, '100000': 1.00, '250000': 1.12, '500000': 1.26,
};
const T_LIMIT_MP_PIP = {                  // MP / PIP per-person
  '1000': 0.70, '2000': 0.82, '5000': 1.00, '10000': 1.25, '25000': 1.70, '50000': 2.25,
};
const T_LIMIT_UMPD = {                    // UM PD limit amounts
  '10000': 0.80, '25000': 1.00, '50000': 1.20, '100000': 1.35,
};

const T_DED_COMP = {                      // Comprehensive deductible factor
  '100': 1.15, '250': 1.00, '500': 0.85, '1000': 0.68, '2500': 0.50,
};
const T_DED_COLL = {                      // Collision deductible factor
  '250': 1.15, '500': 1.00, '1000': 0.82, '1500': 0.72, '2500': 0.58,
};

const T_DRIVER_AGE = {                    // multi-coverage by driver age
  '16-19':[2.50, 2.50, 1.80, 1.90, 2.30], '20-24':[1.75, 1.75, 1.50, 1.60, 1.80],
  '25-29':[1.20, 1.20, 1.15, 1.20, 1.20], '30-49':[1.00, 1.00, 1.00, 1.00, 1.00],
  '50-64':[0.92, 0.92, 0.95, 0.95, 0.88], '65-74':[1.00, 1.00, 1.05, 1.05, 0.95],
  '75+':  [1.22, 1.22, 1.20, 1.20, 1.15],
};
const DRIVER_AGE_COVS = ['BI','PD','COMP','COLL','MP/PIP'];

const T_GENDER = { 'M': 1.05, 'F': 0.97, 'X': 1.00 };
const T_MARITAL = { 'Single': 1.05, 'Married': 0.93, 'Divorced': 1.00, 'Widowed': 0.96 };

const T_SYMBOL = {                        // ISO vehicle symbol (generic 1-30 banded)
  '1-5':   0.72, '6-10':  0.82, '11-15': 0.92, '16-20': 1.00, '21-25': 1.12, '26-30+':1.28,
};

const T_TERRITORY = {                     // 6 generic territory buckets (urban -> rural)
  'T1-Metro-Urban':     1.35, 'T2-Urban':             1.18, 'T3-Suburban':          1.00,
  'T4-Small-City':      0.92, 'T5-Rural':             0.82, 'T6-Coastal-Metro':     1.28,
};

const T_MILEAGE = {                       // annual mileage bands
  '0-7499':      0.88, '7500-9999':   0.96, '10000-14999': 1.00,
  '15000-19999': 1.08, '20000+':      1.18,
};

const T_USAGE = {                         // vehicle usage
  'Pleasure':           0.94, 'Commute-to-Work':    1.00, 'Business':           1.15, 'Farm':               0.86,
};

const T_VEHICLE_AGE = {                   // model-year age (for COMP/COLL)
  '0-1':  1.05, '2-3':  1.00, '4-6':  0.92, '7-10': 0.80, '11-15':0.68, '16+':  0.55,
};

const T_POINTS = {                        // moving-violation points
  '0': 1.00, '1': 1.08, '2': 1.20, '3': 1.38, '4': 1.65, '5': 1.95, '6+':2.30,
};

const T_ACCIDENTS = {                     // at-fault accidents in last 3 years
  '0': 1.00, '1': 1.35, '2': 1.80, '3+':2.35,
};

const T_CREDIT = {                        // insurance score band
  'Excellent (800+)':   0.80, 'Very Good (740-799)':0.90, 'Good (670-739)':     1.00,
  'Fair (580-669)':     1.20, 'Poor (300-579)':     1.48, 'No Hit':             1.10,
  'Thin File':          1.20,
};

const T_ANTI_THEFT = { 'None': 1.00, 'Passive': 0.92, 'Active': 0.88 };
const T_SAFETY    = { 'Basic': 1.00, 'ABS+Airbags': 0.96, 'Advanced (AEB/LDW/BSM)': 0.92 };

// Discounts (each a single multiplier per coverage)
const D_MULTI_CAR    = 0.85;   // 2+ vehicles
const D_MULTI_POLICY = 0.88;   // bundle with Home / Renters / Umbrella
const D_PAID_IN_FULL = 0.92;
const D_PAPERLESS    = 0.97;
const D_GOOD_STUDENT = 0.90;   // under 25 and >= 3.0 GPA
const D_DEFENSIVE   = 0.95;    // completed defensive-driving course within 3 yrs
const D_HOMEOWNER   = 0.95;    // owns home
const D_LOYALTY     = 0.93;    // 5+ years with company
const D_SAFE_DRIVER = 0.92;    // 3+ years claim-free
const D_EFT         = 0.97;    // electronic funds transfer for recurring payments

// ============================================================================
// Data Dictionary
// ============================================================================
const DD = [
  { fieldCode:'driver_age',           label:'Driver Age',                 dataType:'integer', category:'driver',   description:'Age of the listed driver in years. Drives Driver Age Factor (16-19 through 75+).' },
  { fieldCode:'driver_gender',        label:'Driver Gender',              dataType:'enum',    category:'driver',   description:'M / F / X. Not used in states that prohibit gender-based rating (CA, HI, MA, MI, MT, NC, PA).', values:['M','F','X'] },
  { fieldCode:'driver_marital_status',label:'Marital Status',             dataType:'enum',    category:'driver',   description:'Single / Married / Divorced / Widowed.', values:['Single','Married','Divorced','Widowed'] },
  { fieldCode:'driver_points',        label:'Driving Record Points',      dataType:'integer', category:'driver',   description:'Moving violation points in the last 3 years (0 through 6+).' },
  { fieldCode:'at_fault_accidents_3yr',label:'At-Fault Accidents (3yr)',  dataType:'integer', category:'driver',   description:'Chargeable at-fault accidents in the preceding 3 years (0 through 3+).' },
  { fieldCode:'insurance_score',      label:'Insurance Score',            dataType:'integer', category:'driver',   description:'Credit-based insurance score used for rating where permitted by state law.' },
  { fieldCode:'good_student',         label:'Good Student',               dataType:'boolean', category:'driver',   description:'Driver under age 25 with GPA >= 3.0 or equivalent class rank.' },
  { fieldCode:'defensive_driver_course',label:'Defensive Driver Course',  dataType:'boolean', category:'driver',   description:'Completed a state-approved defensive-driving course in the last 3 years.' },

  { fieldCode:'vehicle_symbol',       label:'Vehicle Symbol',             dataType:'integer', category:'vehicle',  description:'ISO vehicle symbol (1 through 30+). Drives Symbol Factor.' },
  { fieldCode:'vehicle_model_year',   label:'Model Year',                 dataType:'integer', category:'vehicle',  description:'Model year of the vehicle. Combined with current year to derive Vehicle Age band.' },
  { fieldCode:'vehicle_make',         label:'Make',                       dataType:'string',  category:'vehicle',  description:'Vehicle manufacturer (e.g. Toyota, Ford).' },
  { fieldCode:'vehicle_model',        label:'Model',                      dataType:'string',  category:'vehicle',  description:'Vehicle model (e.g. Camry, F-150).' },
  { fieldCode:'garaging_zip',         label:'Garaging ZIP',               dataType:'string',  category:'vehicle',  description:'5-digit ZIP where the vehicle is primarily garaged. Determines territory.' },
  { fieldCode:'territory',            label:'Rating Territory',           dataType:'enum',    category:'vehicle',  description:'Territory bucket derived from garaging ZIP.', values:['T1-Metro-Urban','T2-Urban','T3-Suburban','T4-Small-City','T5-Rural','T6-Coastal-Metro'] },
  { fieldCode:'vehicle_usage',        label:'Vehicle Usage',              dataType:'enum',    category:'vehicle',  description:'How the vehicle is primarily used.', values:['Pleasure','Commute-to-Work','Business','Farm'] },
  { fieldCode:'annual_mileage',       label:'Annual Mileage',             dataType:'integer', category:'vehicle',  description:'Estimated annual mileage. Drives Mileage Factor band.' },
  { fieldCode:'anti_theft_device',    label:'Anti-Theft Device',          dataType:'enum',    category:'vehicle',  description:'None / Passive (alarm, immobilizer) / Active (LoJack, GPS tracking).', values:['None','Passive','Active'] },
  { fieldCode:'safety_equipment',     label:'Safety Equipment',           dataType:'enum',    category:'vehicle',  description:'Basic / ABS+Airbags / Advanced (includes AEB, LDW, BSM).', values:['Basic','ABS+Airbags','Advanced (AEB/LDW/BSM)'] },
  { fieldCode:'vehicle_new_purchase', label:'New Vehicle Purchase',       dataType:'boolean', category:'vehicle',  description:'Vehicle purchased new within the last 12 months. Required for New Car Replacement endorsement.' },

  { fieldCode:'limit_bi',             label:'BI Liability Limit',         dataType:'string',  category:'coverage', description:'Bodily Injury limit - split (25/50 through 500/500) or combined single limit.' },
  { fieldCode:'limit_pd',             label:'PD Liability Limit',         dataType:'integer', category:'coverage', description:'Property Damage limit (15,000 through 500,000).' },
  { fieldCode:'limit_medpay_pip',     label:'Medical Payments / PIP Limit',dataType:'integer',category:'coverage', description:'Per-person limit (1,000 through 50,000). Uses PIP in no-fault states.' },
  { fieldCode:'limit_um_uim',         label:'UM/UIM Limit',               dataType:'string',  category:'coverage', description:'UM/UIM BI limit - split or CSL. Typically at or below BI limit.' },
  { fieldCode:'deductible_comp',      label:'Comprehensive Deductible',   dataType:'integer', category:'coverage', description:'100, 250, 500, 1,000, or 2,500 dollars.' },
  { fieldCode:'deductible_coll',      label:'Collision Deductible',       dataType:'integer', category:'coverage', description:'250, 500, 1,000, 1,500, or 2,500 dollars.' },

  { fieldCode:'num_vehicles',         label:'Number of Vehicles on Policy',dataType:'integer',category:'policy',   description:'Count of vehicles on the policy. 2+ triggers Multi-Car Discount.' },
  { fieldCode:'bundled_with_home',    label:'Bundled With Home Policy',   dataType:'boolean', category:'policy',   description:'Active Homeowners/Renters/Condo/Umbrella policy with same carrier. Triggers Multi-Policy Discount.' },
  { fieldCode:'is_homeowner',         label:'Homeowner',                  dataType:'boolean', category:'policy',   description:'Named Insured owns a primary residence.' },
  { fieldCode:'tenure_years',         label:'Years With Company',         dataType:'integer', category:'policy',   description:'Continuous years insured with company. 5+ triggers Loyalty Discount.' },
  { fieldCode:'years_claim_free',     label:'Years Claim-Free',           dataType:'integer', category:'policy',   description:'Years since last chargeable claim. 3+ triggers Safe Driver Discount.' },
  { fieldCode:'payment_plan',         label:'Payment Plan',               dataType:'enum',    category:'policy',   description:'Full / Semi-Annual / Quarterly / Monthly.', values:['Full','Semi-Annual','Quarterly','Monthly'] },
  { fieldCode:'paperless',            label:'Paperless Enrollment',       dataType:'boolean', category:'policy',   description:'Insured opts into paperless documents and billing.' },
  { fieldCode:'eft_enrolled',         label:'Electronic Funds Transfer',  dataType:'boolean', category:'policy',   description:'Recurring payments via ACH/EFT.' },
];

// ============================================================================
// Coverages - PCM hierarchy
// ============================================================================
const COVERAGES = [
  // Root
  { key:'bi', parent:null, name:'Bodily Injury Liability', code:'BI',
    category:'Liability',
    description:"Pays damages for bodily injury for which the insured is legally responsible arising out of the use of the insured auto. Required in all states at the financial-responsibility minimum.",
    limits:['25/50','50/100','100/300 (default)','250/500','500/500'], deductibles:[] },
  { key:'pd', parent:null, name:'Property Damage Liability', code:'PD',
    category:'Liability',
    description:"Pays damages for property damage for which the insured is legally responsible arising out of the use of the insured auto. Required in all states.",
    limits:['$15,000','$25,000','$50,000 (default)','$100,000','$250,000','$500,000'], deductibles:[] },
  { key:'medpay', parent:null, name:'Medical Payments', code:'MP',
    category:'Medical',
    description:"Pays reasonable and necessary medical expenses for the insured and passengers injured in an auto accident, regardless of fault. Not available in no-fault states (PIP replaces).",
    limits:['$1,000','$2,000','$5,000 (default)','$10,000','$25,000','$50,000'], deductibles:[] },
  { key:'pip', parent:null, name:'Personal Injury Protection (PIP)', code:'PIP',
    category:'Medical',
    description:"First-party no-fault benefits including medical expenses, lost wages, and essential services. Required in no-fault states; benefit structure varies by state.",
    limits:['State minimum','$10,000 (default)','$25,000','$50,000'], deductibles:['$0 (default)','$200','$500','$1,000'] },
  { key:'um_bi', parent:null, name:'Uninsured Motorist - Bodily Injury', code:'UM BI',
    category:'Liability',
    description:"Pays compensatory damages for bodily injury caused by an at-fault uninsured or hit-and-run driver. Typically offered at or below the BI limit.",
    limits:['25/50','50/100','100/300 (default)','250/500'], deductibles:[] },
  { key:'uim_bi', parent:'um_bi', name:'Underinsured Motorist - Bodily Injury', code:'UIM BI',
    category:'Liability',
    description:"Pays compensatory damages for bodily injury caused by an at-fault driver whose liability limits are insufficient. Requires UM BI to be in force.",
    limits:['50/100','100/300 (default)','250/500'], deductibles:[] },
  { key:'um_pd', parent:'um_bi', name:'Uninsured Motorist - Property Damage', code:'UM PD',
    category:'Property',
    description:"Pays for property damage to the insured auto caused by an uninsured at-fault driver, in states where this coverage is offered alongside UM BI.",
    limits:['$10,000','$25,000 (default)','$50,000','$100,000'], deductibles:['$0','$200','$500'] },
  { key:'comp', parent:null, name:'Comprehensive (Other Than Collision)', code:'COMP',
    category:'Property',
    description:"Pays for direct and accidental loss to the insured auto not caused by collision or overturn - including theft, fire, vandalism, glass breakage, animal strike, falling objects, flood, and hail. Loss settled at actual cash value.",
    limits:['Actual cash value less deductible'],
    deductibles:['$100','$250','$500 (default)','$1,000','$2,500'] },
  { key:'coll', parent:null, name:'Collision', code:'COLL',
    category:'Property',
    description:"Pays for direct and accidental loss to the insured auto caused by collision with another object or overturn. Loss settled at actual cash value.",
    limits:['Actual cash value less deductible'],
    deductibles:['$250','$500 (default)','$1,000','$1,500','$2,500'] },

  // Sub-coverages / endorsements
  { key:'full_glass', parent:'comp', name:'Full Glass Coverage', code:'GLASS',
    category:'Endorsement',
    description:"Waives the Comprehensive deductible for glass-only losses (windshield, side, and rear). Requires Comprehensive.",
    limits:[], deductibles:['$0 (glass-only)'] },
  { key:'towing', parent:'comp', name:'Towing and Labor', code:'TOW',
    category:'Endorsement',
    description:"Reimburses towing and on-scene labor per disablement up to a per-occurrence limit. Typically bundled with Roadside Assistance.",
    limits:['$50','$75 (default)','$100','$200'], deductibles:[] },
  { key:'roadside', parent:'comp', name:'Roadside Assistance', code:'RSA',
    category:'Endorsement',
    description:"24-hour roadside services: towing, battery jump, flat tire change, lockout, fuel delivery, and winch-out from minor off-road situations.",
    limits:['Basic','Premium'], deductibles:[] },
  { key:'ncr', parent:'comp', name:'New Car Replacement', code:'NCR',
    category:'Endorsement',
    description:"If the insured vehicle is totaled within a specified period (typically first 24 months or 15,000 miles) of new-vehicle purchase, pays to replace with a comparable new model instead of paying ACV.",
    limits:[], deductibles:[] },
  { key:'rental', parent:'coll', name:'Rental Reimbursement', code:'RR',
    category:'Endorsement',
    description:"Reimburses the cost of a rental vehicle while the insured auto is out of service due to a covered loss. Requires Collision (and typically Comprehensive).",
    limits:['$30/day x 30 days','$50/day x 30 days (default)','$75/day x 30 days'], deductibles:[] },
  { key:'gap', parent:'coll', name:'Loan/Lease Gap', code:'GAP',
    category:'Endorsement',
    description:"Pays the difference between the actual cash value of the insured auto at total loss and the outstanding balance on the loan or lease. Requires both Collision and Comprehensive.",
    limits:['Up to 25% of ACV or actual gap, whichever is less'], deductibles:[] },
  { key:'af', parent:'bi', name:'Accident Forgiveness', code:'AF',
    category:'Endorsement',
    description:"Waives the premium surcharge for the first at-fault accident after a qualifying claim-free period. Not filed in every state.",
    limits:[], deductibles:[] },
  { key:'dd', parent:'coll', name:'Disappearing Deductible', code:'DD',
    category:'Endorsement',
    description:"Reduces the Collision deductible by a fixed amount (commonly $50) for every claim-free year, down to a minimum of zero.",
    limits:[], deductibles:[] },
  { key:'rideshare', parent:'bi', name:'Rideshare / TNC Coverage', code:'TNC',
    category:'Endorsement',
    description:"Extends personal auto coverage during Period 1 (app on, no passenger accepted) for drivers working for a transportation network company such as Uber or Lyft. Excluded by the base policy.",
    limits:[], deductibles:[] },
  { key:'custom_equip', parent:'comp', name:'Custom Equipment', code:'CEQ',
    category:'Endorsement',
    description:"Covers aftermarket equipment permanently installed in or attached to the insured auto (sound systems, custom paint, custom wheels) above the $1,500 base policy inclusion. Requires Comprehensive.",
    limits:['$1,500 (included)','$5,000','$10,000','$25,000'], deductibles:['Follows Comprehensive deductible'] },
];

// ============================================================================
// Pricing Steps - ISO-style multiplicative Personal Auto algorithm
// Parts A (vehicle premium), B (policy adjustments + discounts), C (total)
// ============================================================================
const PRIMARY_COVS = ['Bodily Injury Liability','Property Damage Liability','Medical Payments','Personal Injury Protection (PIP)','Uninsured Motorist - Bodily Injury','Underinsured Motorist - Bodily Injury','Uninsured Motorist - Property Damage','Comprehensive (Other Than Collision)','Collision'];
const COLL_COMP   = ['Comprehensive (Other Than Collision)','Collision'];
const LIAB_COVS   = ['Bodily Injury Liability','Property Damage Liability','Medical Payments','Personal Injury Protection (PIP)','Uninsured Motorist - Bodily Injury','Underinsured Motorist - Bodily Injury','Uninsured Motorist - Property Damage'];

function step(order, name, stepType, stepFormType, coverages, table, tableData, operand, value, description, extra={}) {
  return {
    productId: PRODUCT_ID,
    stepType,                           // 'factor' or 'operand'
    type: stepFormType,                 // UI "Type" - renamed server-side to stepFormType
    stepName: name,
    coverages,
    table,
    tableData,
    rounding: extra.rounding || 'none',
    states: extra.states || ALL_STATES,
    upstreamId: '',
    operand,
    value,
    order,
    description,
    section: extra.section || 'Part A - Vehicle Premium',
    createdAt: NOW, updatedAt: NOW,
  };
}

const PRICING_STEPS = [
  // Part A: base and primary factors (integer orders; operand separators interleaved at N.5)
  step( 0, 'Base Rate',                  'factor', 'Table',      PRIMARY_COVS, 'Base Rates',            T_BASE,         '*', 1.0, "Per-coverage filed annual base rate.", { rounding:'0.01' }),
  step( 1, 'Driver Age Factor',          'factor', 'Table',      PRIMARY_COVS, 'Driver Age Factors',    { rows:T_DRIVER_AGE, cols:DRIVER_AGE_COVS }, '*', 1.0, "Straight-averaged across rated drivers. Factor differs by coverage (BI/PD vs COMP/COLL vs MP/PIP)." ),
  step( 2, 'Gender Factor',              'factor', 'Table',      ['Bodily Injury Liability','Property Damage Liability','Collision'], 'Gender Factors', T_GENDER, '*', 1.0, "Not applied in CA, HI, MA, MI, MT, NC, PA.", { states: ALL_STATES.filter(s => !['CA','HI','MA','MI','MT','NC','PA'].includes(s)) }),
  step( 3, 'Marital Status Factor',      'factor', 'Table',      ['Bodily Injury Liability','Property Damage Liability'], 'Marital Factors', T_MARITAL, '*', 1.0, "By driver marital status."),
  step( 4, 'Driving Record Points',      'factor', 'Table',      ['Bodily Injury Liability','Property Damage Liability','Collision'], 'Points Factors', T_POINTS, '*', 1.0, "Moving violation points in last 3 years. 0 is neutral; capped at 6+."),
  step( 5, 'At-Fault Accident Factor',   'factor', 'Table',      ['Bodily Injury Liability','Property Damage Liability','Collision'], 'Accident Factors', T_ACCIDENTS, '*', 1.0, "Chargeable at-fault accidents in prior 3 years. Waived if Accident Forgiveness qualifies."),
  step( 6, 'Insurance Score Factor',     'factor', 'Table',      PRIMARY_COVS, 'Insurance Score Factors', T_CREDIT, '*', 1.0, "Applied where state law permits. Prohibited in CA, HI, MA, MI.", { states: ALL_STATES.filter(s => !['CA','HI','MA','MI'].includes(s)) }),
  step( 7, 'Vehicle Symbol Factor',      'factor', 'Table',      COLL_COMP, 'Symbol Factors',          T_SYMBOL,       '*', 1.0, "ISO symbol banded 1-5 through 26-30+. Applied to physical damage."),
  step( 8, 'Vehicle Age Factor',         'factor', 'Table',      COLL_COMP, 'Vehicle Age Factors',     T_VEHICLE_AGE,  '*', 1.0, "Model year age band. Applied to physical damage only."),
  step( 9, 'Anti-Theft Device Factor',   'factor', 'Table',      ['Comprehensive (Other Than Collision)'], 'Anti-Theft Factors', T_ANTI_THEFT, '*', 1.0, "Passive devices: alarms, immobilizers. Active: GPS tracking."),
  step(10, 'Safety Equipment Factor',    'factor', 'Table',      ['Bodily Injury Liability','Property Damage Liability','Medical Payments','Personal Injury Protection (PIP)','Collision'], 'Safety Factors', T_SAFETY, '*', 1.0, "ABS/airbags and advanced safety features (AEB, LDW, BSM)."),
  step(11, 'Territory Factor',           'factor', 'Table',      PRIMARY_COVS, 'Territory Factors',    T_TERRITORY,    '*', 1.0, "Derived from garaging ZIP."),
  step(12, 'Annual Mileage Factor',      'factor', 'Table',      PRIMARY_COVS, 'Mileage Factors',      T_MILEAGE,      '*', 1.0, "By annual mileage band."),
  step(13, 'Usage Factor',               'factor', 'Table',      PRIMARY_COVS, 'Usage Factors',        T_USAGE,        '*', 1.0, "Pleasure / Commute-to-Work / Business / Farm."),
  step(14, 'Limit Factor',               'factor', 'Table',      ['Bodily Injury Liability','Property Damage Liability','Medical Payments','Personal Injury Protection (PIP)','Uninsured Motorist - Bodily Injury','Underinsured Motorist - Bodily Injury','Uninsured Motorist - Property Damage'], 'Limit Factors', { split:T_LIMIT_SPLIT, pd:T_LIMIT_PD, mp_pip:T_LIMIT_MP_PIP, umpd:T_LIMIT_UMPD }, '*', 1.0, "Selected limit lookup per coverage (split / single / CSL)."),
  step(15, 'Deductible Factor',          'factor', 'Table',      COLL_COMP, 'Deductible Factors',       { comp:T_DED_COMP, coll:T_DED_COLL }, '*', 1.0, "Deductible factor for Comprehensive and Collision."),
  step(16, 'Vehicle Premium',            'operand','Calculated', PRIMARY_COVS, '',                     null,           '=', 0,   "End of Part A: product of base rate and all applicable factors, by coverage.", { rounding:'0.01' }),

  // Part B: policy-level discounts / adjustments
  step(17, 'Multi-Car Discount',         'factor', 'User Input', PRIMARY_COVS, 'Discount',             { allCoverages: D_MULTI_CAR },    '*', D_MULTI_CAR,    "2 or more vehicles on the policy.",                             { section:'Part B - Discounts and Adjustments' }),
  step(18, 'Multi-Policy (Bundle) Discount','factor','User Input', PRIMARY_COVS, 'Discount',           { allCoverages: D_MULTI_POLICY }, '*', D_MULTI_POLICY, "Active companion Home / Renters / Condo / Umbrella policy.",    { section:'Part B - Discounts and Adjustments' }),
  step(19, 'Homeowner Discount',         'factor', 'User Input', LIAB_COVS,    'Discount',             { liabCoverages: D_HOMEOWNER },   '*', D_HOMEOWNER,    "Insured owns a primary residence.",                             { section:'Part B - Discounts and Adjustments' }),
  step(20, 'Good Student Discount',      'factor', 'User Input', ['Bodily Injury Liability','Property Damage Liability','Collision','Comprehensive (Other Than Collision)'], 'Discount', { students: D_GOOD_STUDENT }, '*', D_GOOD_STUDENT, "Driver under 25 with GPA >= 3.0 or top-20% class rank.",     { section:'Part B - Discounts and Adjustments' }),
  step(21, 'Defensive Driver Discount',  'factor', 'User Input', ['Bodily Injury Liability','Property Damage Liability','Medical Payments','Personal Injury Protection (PIP)'], 'Discount', { drivers: D_DEFENSIVE }, '*', D_DEFENSIVE, "Completed state-approved defensive-driving course within 3 years.", { section:'Part B - Discounts and Adjustments' }),
  step(22, 'Safe Driver Discount',       'factor', 'User Input', PRIMARY_COVS, 'Discount',             { claimFree: D_SAFE_DRIVER },     '*', D_SAFE_DRIVER,  "3+ consecutive years claim-free.",                              { section:'Part B - Discounts and Adjustments' }),
  step(23, 'Loyalty Discount',           'factor', 'User Input', PRIMARY_COVS, 'Discount',             { loyalty: D_LOYALTY },           '*', D_LOYALTY,      "5+ continuous years with the company.",                          { section:'Part B - Discounts and Adjustments' }),
  step(24, 'Paid-in-Full Discount',      'factor', 'User Input', PRIMARY_COVS, 'Discount',             { paidInFull: D_PAID_IN_FULL },   '*', D_PAID_IN_FULL, "Full premium paid at inception or renewal.",                    { section:'Part B - Discounts and Adjustments' }),
  step(25, 'EFT Discount',               'factor', 'User Input', PRIMARY_COVS, 'Discount',             { eft: D_EFT },                   '*', D_EFT,          "Recurring payments via ACH / EFT.",                             { section:'Part B - Discounts and Adjustments' }),
  step(26, 'Paperless Discount',         'factor', 'User Input', PRIMARY_COVS, 'Discount',             { paperless: D_PAPERLESS },       '*', D_PAPERLESS,    "Paperless documents and billing.",                              { section:'Part B - Discounts and Adjustments' }),
  step(27, 'Adjusted Vehicle Premium',   'operand','Calculated', PRIMARY_COVS, '',                     null,                             '=', 0,              "End of Part B: vehicle premium after all applicable discounts.",{ section:'Part B - Discounts and Adjustments', rounding:'0.01' }),

  // Part C: Total
  step(28, 'Policy Premium (Sum of Vehicle Premiums)','operand','Calculated', PRIMARY_COVS, '',        { minPremium: 200 },              '+', 0,              "Sum Adjusted Vehicle Premiums for all vehicles on the policy. Subject to a $200 minimum.", { section:'Part C - Total Premium' }),
  step(29, 'Final Premium',              'operand','Calculated', PRIMARY_COVS, '',                     null,                             '=', 0,              "Final policy premium.",                                         { section:'Part C - Total Premium', rounding:'0.01' }),
];

// Rating-table dimensions to create under each step
const STEP_DIMENSIONS = {
  0:  [{ n:'Coverage',       v:'BI, PD, MP, PIP, UM BI, UIM BI, UM PD, COMP, COLL' }],
  1:  [{ n:'Driver Age',     v:'16-19, 20-24, 25-29, 30-49, 50-64, 65-74, 75+' },
       { n:'Coverage',       v:'BI, PD, COMP, COLL, MP/PIP' }],
  2:  [{ n:'Gender',         v:'M, F, X' }],
  3:  [{ n:'Marital Status', v:'Single, Married, Divorced, Widowed' }],
  4:  [{ n:'Points',         v:'0, 1, 2, 3, 4, 5, 6+' }],
  5:  [{ n:'At-Fault Accidents (3yr)', v:'0, 1, 2, 3+' }],
  6:  [{ n:'Insurance Score',v:'Excellent (800+), Very Good (740-799), Good (670-739), Fair (580-669), Poor (300-579), No Hit, Thin File' }],
  7:  [{ n:'Symbol Band',    v:'1-5, 6-10, 11-15, 16-20, 21-25, 26-30+' }],
  8:  [{ n:'Vehicle Age',    v:'0-1, 2-3, 4-6, 7-10, 11-15, 16+' }],
  9:  [{ n:'Anti-Theft',     v:'None, Passive, Active' }],
  10: [{ n:'Safety Equipment', v:'Basic, ABS+Airbags, Advanced (AEB/LDW/BSM)' }],
  11: [{ n:'Territory',      v:'T1-Metro-Urban, T2-Urban, T3-Suburban, T4-Small-City, T5-Rural, T6-Coastal-Metro' }],
  12: [{ n:'Annual Mileage', v:'0-7499, 7500-9999, 10000-14999, 15000-19999, 20000+' }],
  13: [{ n:'Usage',          v:'Pleasure, Commute-to-Work, Business, Farm' }],
  14: [{ n:'Limit Type',     v:'Split, PD single, MP/PIP per-person, UM PD' },
       { n:'Limit',          v:'25/50, 50/100, 100/300, 250/500, 500/500, 15000, 25000, 50000, 100000, 250000, 500000, 1000, 2000, 5000, 10000, 25000, 50000, 10000, 25000, 50000, 100000' }],
  15: [{ n:'Deductible',     v:'100, 250, 500, 1000, 1500, 2500' },
       { n:'Coverage',       v:'COMP, COLL' }],
};

// ============================================================================
// Rules - plain-English, ASCII only
// ============================================================================
const RULES = [
  { name:'Eligibility - Licensed Driver',           cat:'Eligibility', ref:'Rule 1.1',
    condition:"Every rated operator must hold a valid driver license from a US state or US territory.",
    outcome:"An applicant whose household contains an unlicensed regular operator is not eligible for the program unless that operator is added as an excluded driver." },
  { name:'Eligibility - Registered Vehicle',         cat:'Eligibility', ref:'Rule 1.2',
    condition:"Every covered vehicle must be registered and titled in the Named Insured's name (or that of a resident household member) in the state of garaging.",
    outcome:"Vehicles registered to a business, titled to a non-resident, or used for livery / ride-for-hire (outside of a permitted Rideshare endorsement) are not eligible." },
  { name:'Policy Term and Minimum Premium',          cat:'Other',       ref:'Rule 1.3',
    condition:"Every policy has a 6-month or 12-month term as selected by the Named Insured at binding.",
    outcome:"The minimum total written premium is 200 dollars for a 12-month policy and 100 dollars for a 6-month policy." },
  { name:'BI / PD - Required at Financial Responsibility Limits', cat:'Compliance', ref:'Rule 2.1',
    condition:"Every auto policy must provide Bodily Injury and Property Damage Liability at or above the state financial-responsibility minimum on every rated vehicle.",
    outcome:"If requested limits are below the state minimum, the system auto-increases to the state minimum before quoting." },
  { name:'UM/UIM - Offer and Rejection',             cat:'Compliance', ref:'Rule 2.2',
    condition:"Every policy in every state must offer UM BI (and UIM BI where filed) at the state-required minimum. In states where the Named Insured may reject or reduce this coverage, rejection must be captured in writing using the state-approved form.",
    outcome:"A signed rejection form is retained for the life of the policy plus 5 years. Absent a valid rejection, the policy is issued with UM / UIM at the BI limit." },
  { name:'UM PD Availability',                       cat:'Eligibility', ref:'Rule 2.3',
    condition:"UM Property Damage is offered in states where filed AND only when the insured has not elected Collision on the vehicle.",
    outcome:"When available, UM PD limit is the vehicle's actual cash value up to the state maximum. Otherwise it is not issued." },
  { name:'Medical Payments - Offer (Non No-Fault States)', cat:'Compliance', ref:'Rule 2.4',
    condition:"In tort / choice-no-fault states, 5,000 dollars of Medical Payments coverage is offered on every policy providing BI / PD.",
    outcome:"The insured may reject in writing. Proof of rejection is retained on file at least 3 years. Absent proof, 5,000 dollars MP is presumed in force." },
  { name:'PIP - Mandatory in No-Fault States',       cat:'Compliance', ref:'Rule 2.5',
    condition:"In no-fault states (FL, HI, KS, KY, MA, MI, MN, NJ, NY, ND, PA, UT) PIP is required at the state-specified benefit structure.",
    outcome:"Medical Payments is not written as a separate coverage in these states. PIP benefits are issued at state-minimum limit by default, higher on request." },
  { name:'Driver Age - Young Driver',                cat:'Rating',      ref:'Rule 3.1',
    condition:"A rated driver is under age 25.",
    outcome:"Apply the Driver Age factor from band 16-19, 20-24, or 25-29. Young Operator Surcharge applies until age 25." },
  { name:'Driver Age - Senior Driver',               cat:'Rating',      ref:'Rule 3.2',
    condition:"A rated driver is age 75 or older.",
    outcome:"Apply the 75+ Driver Age factor. Senior drivers may qualify for the Defensive Driver Discount if they complete an approved course." },
  { name:'Driving Record Points',                    cat:'Rating',      ref:'Rule 3.3',
    condition:"A rated driver has one or more moving violations in the prior 3 years.",
    outcome:"Assign points per the Driving Record Points table. Major violations (DUI, reckless, 25 mph over) carry 6 points; moderate (16-24 mph over, careless) carry 3-4; minor carry 2. Points expire at the renewal after the conviction date is 3 years old." },
  { name:'At-Fault Accident Surcharge',              cat:'Rating',      ref:'Rule 3.4',
    condition:"A rated driver was 50 percent or more at fault in an accident in the prior 3 years AND the company paid under Property Damage Liability, or the accident was a single-vehicle claim paid under Collision.",
    outcome:"Apply the At-Fault Accident factor. Losses below 3,000 dollars total, lawful-parked, animal strikes, rear-ended with no citation, and hit-and-run promptly reported are excluded. Waived if Accident Forgiveness qualifies." },
  { name:'Accident Forgiveness Eligibility',         cat:'Eligibility', ref:'Rule 3.5',
    condition:"The Named Insured has been continuously insured with the company for at least 5 years AND has had zero at-fault accidents in the prior 5 years.",
    outcome:"The first at-fault accident at renewal after qualifying does NOT generate the at-fault surcharge. Benefit is one-time per policy and resets after use. Not filed in CA." },
  { name:'Insurance Score - Where Permitted',        cat:'Rating',      ref:'Rule 3.6',
    condition:"The garaging state permits credit-based insurance scoring (all states except CA, HI, MA, MI).",
    outcome:"Order a score at new business and at least every 36 months on renewal. The Named Insured may request one re-score per policy term. Not applied in prohibited states." },
  { name:'Vehicle Symbol Factor - Physical Damage',  cat:'Rating',      ref:'Rule 3.7',
    condition:"Comprehensive or Collision is elected on the vehicle.",
    outcome:"Apply the Symbol Factor from the vehicle's ISO symbol (banded 1-5 through 26-30+). Does not apply to liability-only coverages." },
  { name:'New Car Replacement Eligibility',          cat:'Eligibility', ref:'Rule 4.1',
    condition:"The vehicle is a brand-new model-year vehicle purchased by the insured within the last 12 months AND both Comprehensive and Collision are in force.",
    outcome:"Attach the New Car Replacement endorsement. Benefit pays replacement-cost new within the first 24 months or 15,000 miles (whichever comes first)." },
  { name:'Gap Coverage Eligibility',                 cat:'Eligibility', ref:'Rule 4.2',
    condition:"The insured holds a loan or lease on the vehicle AND both Comprehensive and Collision are in force.",
    outcome:"Attach the Loan/Lease Gap endorsement. Benefit is capped at 25 percent of actual cash value or the actual financing gap, whichever is less." },
  { name:'Rental Reimbursement Eligibility',         cat:'Eligibility', ref:'Rule 4.3',
    condition:"The vehicle has Collision coverage (and typically Comprehensive).",
    outcome:"Offer Rental Reimbursement in three tiers: 30 dollars / 50 dollars / 75 dollars per day, each for up to 30 days. Reimbursement requires receipts." },
  { name:'Disappearing Deductible Eligibility',      cat:'Eligibility', ref:'Rule 4.4',
    condition:"The vehicle has Collision coverage AND the Named Insured has 3+ years claim-free with the company.",
    outcome:"Attach the Disappearing Deductible endorsement. The Collision deductible is reduced by 50 dollars for every claim-free year, down to a minimum of zero." },
  { name:'Rideshare / TNC Endorsement',              cat:'Eligibility', ref:'Rule 4.5',
    condition:"A rated driver drives for a transportation network company (Uber, Lyft, etc.). Without this endorsement, personal auto coverage is excluded while the app is on.",
    outcome:"Attach the Rideshare / TNC endorsement. It extends Period 1 coverage (app on, no ride accepted) but does NOT extend to Period 2 or 3 (ride accepted or passenger in car) - those require commercial coverage." },
  { name:'Custom Equipment - Basic Coverage',        cat:'Coverage',    ref:'Rule 4.6',
    condition:"Comprehensive is in force.",
    outcome:"The base policy includes 1,500 dollars of custom-equipment coverage (aftermarket sound systems, wheels, paint). Higher limits (5,000 / 10,000 / 25,000) are available by endorsement." },
  { name:'Multi-Car Discount',                       cat:'Rating',      ref:'Rule 5.1',
    condition:"The policy has 2 or more rated vehicles of the Private Passenger class.",
    outcome:"Apply a 15 percent discount (factor 0.85) to all coverages." },
  { name:'Multi-Policy (Bundle) Discount',           cat:'Rating',      ref:'Rule 5.2',
    condition:"The Named Insured has an active Homeowners, Renters, Condo, or Umbrella policy with the company.",
    outcome:"Apply a 12 percent discount (factor 0.88) to all coverages." },
  { name:'Good Student Discount',                    cat:'Rating',      ref:'Rule 5.3',
    condition:"A rated driver is under age 25 AND maintains a GPA of 3.0 or higher (or equivalent top-20% class rank). Proof (report card or letter from registrar) is required at new business and at each renewal.",
    outcome:"Apply a 10 percent discount (factor 0.90) to BI, PD, Collision, and Comprehensive on the vehicle that driver principally operates." },
  { name:'Paid-in-Full Discount',                    cat:'Rating',      ref:'Rule 5.4',
    condition:"The Named Insured pays the full term premium at policy inception or by the renewal effective date.",
    outcome:"Apply an 8 percent discount (factor 0.92) to all coverages." },
  { name:'Loyalty Discount',                         cat:'Rating',      ref:'Rule 5.5',
    condition:"The Named Insured has been continuously insured with the company for 5 or more years.",
    outcome:"Apply a 7 percent discount (factor 0.93) to all coverages. Increases to 10 percent at 10-year tenure." },
  { name:'Safe Driver Discount',                     cat:'Rating',      ref:'Rule 5.6',
    condition:"The Named Insured has been claim-free for 3 or more consecutive years.",
    outcome:"Apply an 8 percent discount (factor 0.92) to all coverages. Claim counted for this test excludes comprehensive-only losses under 500 dollars and not-at-fault claims." },
  { name:'Paperless and EFT Discounts',              cat:'Rating',      ref:'Rule 5.7',
    condition:"The Named Insured enrolls in paperless documents / billing AND / OR enrolls in recurring ACH / EFT payments.",
    outcome:"Apply a 3 percent Paperless discount and a 3 percent EFT discount (each factor 0.97). Both can stack." },
];

// Build-time ASCII check
for (const r of RULES) {
  assertAscii(`${r.ref} name`, r.name);
  assertAscii(`${r.ref} condition`, r.condition);
  assertAscii(`${r.ref} outcome`, r.outcome);
}

// ============================================================================
// Run
// ============================================================================
async function wipeProductScoped(label, getUrl, makeDeleteUrl) {
  const list = await req('GET', getUrl);
  const mine = list.filter(x => x.productId === PRODUCT_ID);
  if (!mine.length) { console.log(`  (${label}: nothing to clean)`); return; }
  for (const x of mine) {
    try { await req('DELETE', makeDeleteUrl(x.id)); process.stdout.write('.'); }
    catch (e) { console.log(`\n  ! ${label} ${x.id}: ${e.message.slice(0,100)}`); }
  }
  console.log(` (${label}: removed ${mine.length})`);
}

async function main() {
  console.log('────────────────────────────────────────────────────────────');
  console.log(`  Seeding Auto - Generic into ${PRODUCT_ID}`);
  console.log(`  Dry run: ${DRY_RUN}`);
  console.log('────────────────────────────────────────────────────────────');
  console.log('');

  // 1) Wipe scoped
  console.log('Step 1: clean this product (coverages / rules / pricing-steps / dimensions / data-dictionary)');
  await wipeProductScoped('coverages',       '/api/coverages?productId='+encodeURIComponent(PRODUCT_ID), id => `/api/coverages/${id}`);
  await wipeProductScoped('rules',           '/api/rules',                                               id => `/api/items/single/${id}`);
  await wipeProductScoped('pricing-steps',   '/api/pricing-steps?productId='+encodeURIComponent(PRODUCT_ID), id => `/api/items/single/${id}`);
  await wipeProductScoped('dimensions',      '/api/items/dimension',                                     id => `/api/items/single/${id}`);
  await wipeProductScoped('data-dictionary', '/api/data-dictionary',                                     id => `/api/items/single/${id}`);
  console.log('');

  // 2) Data dictionary
  console.log(`Step 2: data dictionary (${DD.length} fields)`);
  for (const d of DD) {
    await req('POST', '/api/data-dictionary', { productId: PRODUCT_ID, fieldCode:d.fieldCode, name:d.fieldCode, label:d.label, dataType:d.dataType, category:d.category, description:d.description, values:d.values || null, createdAt:NOW, updatedAt:NOW });
  }
  console.log(`  ok`);
  console.log('');

  // 3) Coverages - roots then subs
  console.log(`Step 3: coverages (${COVERAGES.length} - ${COVERAGES.filter(c=>!c.parent).length} root, ${COVERAGES.filter(c=>c.parent).length} sub)`);
  const idByKey = {};
  for (const c of COVERAGES.filter(c => !c.parent)) {
    const r = await req('POST', '/api/coverages', {
      productId: PRODUCT_ID,
      name: c.name, coverageCode: c.code, category: c.category, description: c.description,
      formIds:[], limits:c.limits, deductibles:c.deductibles, states: ALL_STATES,
      parentCoverageId: null, createdAt:NOW, updatedAt:NOW,
    });
    idByKey[c.key] = r.id;
    console.log(`  root  ${c.name}`);
  }
  for (const c of COVERAGES.filter(c => c.parent)) {
    const r = await req('POST', '/api/coverages', {
      productId: PRODUCT_ID,
      name: c.name, coverageCode: c.code, category: c.category, description: c.description,
      formIds:[], limits:c.limits, deductibles:c.deductibles, states: ALL_STATES,
      parentCoverageId: idByKey[c.parent], createdAt:NOW, updatedAt:NOW,
    });
    idByKey[c.key] = r.id;
    console.log(`  sub   ${c.name}  (parent: ${c.parent})`);
  }
  console.log('');

  // 4) Pricing steps + dimensions
  console.log(`Step 4: pricing steps (${PRICING_STEPS.length}) + dimensions`);
  const postedSteps = [];
  for (const s of PRICING_STEPS) {
    const r = await req('POST', '/api/pricing-steps', s);
    postedSteps.push({ order: s.order, id: r.id, section: s.section, stepType: s.stepType });
    const dims = STEP_DIMENSIONS[s.order] || [];
    for (const d of dims) {
      await req('POST', '/api/items/dimension', { productId: PRODUCT_ID, stepId: r.id, name: d.n, values: d.v, technicalCode: '' });
    }
    console.log(`  #${String(s.order).padStart(2)} ${s.stepName.padEnd(44)} ${s.section.split(' - ')[0]}`);
  }
  console.log('');

  // 5) Insert operand separators between adjacent factor steps
  console.log('Step 5: operand separators at N.5 between adjacent factor steps');
  const bySection = {};
  for (const s of postedSteps) (bySection[s.section] = bySection[s.section] || []).push(s);
  let sepCount = 0;
  const sep = { Pa:'*', Pb:'*', Pc:'+' };
  const symbol = (section) => section.startsWith('Part A') ? sep.Pa : section.startsWith('Part B') ? sep.Pb : sep.Pc;
  for (const [section, steps] of Object.entries(bySection)) {
    steps.sort((a,b) => a.order - b.order);
    for (let i = 0; i < steps.length - 1; i++) {
      const a = steps[i], b = steps[i+1];
      if (a.stepType === 'operand' || b.stepType === 'operand') continue;
      const mid = (a.order + b.order) / 2;
      await req('POST', '/api/pricing-steps', {
        productId: PRODUCT_ID, stepType:'operand', operand: symbol(section), coverages: PRIMARY_COVS, states: ALL_STATES, order: mid,
      });
      sepCount++;
    }
  }
  console.log(`  ok (${sepCount} separators)`);
  console.log('');

  // 6) Rules
  console.log(`Step 6: rules (${RULES.length} plain-English, ASCII)`);
  for (const r of RULES) {
    await req('POST', '/api/rules', {
      productId: PRODUCT_ID,
      name: r.name, ruleCategory: r.cat, ruleType: r.cat, reference: r.ref,
      condition: r.condition, outcome: r.outcome,
      proprietary:false, status:'active', states: ALL_STATES,
      createdAt: NOW, updatedAt: NOW,
    });
    console.log(`  ${r.cat.padEnd(11)} ${r.ref.padEnd(10)} ${r.name}`);
  }
  console.log('');

  console.log('────────────────────────────────────────────────────────────');
  console.log('  Seed complete.');
  console.log(`    Coverages      : ${COVERAGES.length}  (${COVERAGES.filter(c=>!c.parent).length} root + ${COVERAGES.filter(c=>c.parent).length} sub)`);
  console.log(`    Data Dict      : ${DD.length}`);
  console.log(`    Pricing steps  : ${PRICING_STEPS.length} factor/operand + ${sepCount} separators`);
  console.log(`    Rules          : ${RULES.length}`);
  console.log('');
  console.log(`    Open: ${BASE_URL}/coverage/${PRODUCT_ID}`);
  console.log('────────────────────────────────────────────────────────────');
}

main().catch(e => { console.error('\nFAILED:', e.message); process.exit(1); });
