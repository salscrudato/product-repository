#!/usr/bin/env node
/**
 * Reseed the Enthusiast+ Colorado rules with plain-English conditions and
 * outcomes (instead of the pseudo-code the first pass used).
 *
 * Two passes:
 *   1) Delete every rule on this product whose `reference` starts with "Rule "
 *      (so we only touch the ones our earlier script created; untouched: any
 *      rules a human has added in the UI).
 *   2) POST replacements with `condition` / `outcome` text written the way a
 *      product manager would read it aloud.
 *
 * Usage:
 *   node scripts/reseed-ep-co-rules-plain-english.js
 *   DRY_RUN=1 node scripts/reseed-ep-co-rules-plain-english.js
 */

'use strict';

const BASE_URL   = process.env.BASE_URL   || 'https://app-nvi-demo-prohub-insurance-pl.azurewebsites.net';
const PRODUCT_ID = process.env.PRODUCT_ID || 'product-10b39165-cb9e-44c6-ae38-1a3436038fb6';
const DRY_RUN    = process.env.DRY_RUN === '1';
const NOW        = new Date().toISOString();

const HDRS = { 'Accept':'*/*', 'Content-Type':'application/json',
  'Origin': BASE_URL, 'Referer': `${BASE_URL}/rules/${PRODUCT_ID}` };

async function req(method, path, body) {
  if (DRY_RUN && method !== 'GET') { console.log(`    [dry] ${method} ${path}`); return { id:'dry' }; }
  const res = await fetch(`${BASE_URL}${path}`, { method, headers: HDRS, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${(await res.text()).slice(0,200)}`);
  const t = await res.text();
  try { return JSON.parse(t); } catch { return t; }
}

// ────────────────────────────────────────────────────────────────────────────
// Plain-English rule catalog
// ────────────────────────────────────────────────────────────────────────────
const RULES = [
  // ─── Definitions & Eligibility ───────────────────────────────────────────
  { name:'Enthusiast Vehicle Definition', cat:'Eligibility', ref:'Rule 1',
    condition:'The vehicle is at least 25 years old and not used for any commercial or business purposes, OR it is a motor vehicle of unique or rare design and limited production that is an object of curiosity and not used commercially, OR it is an exotic or special-interest vehicle (typically manufactured within the past 14 years) whose specific make, model year, and exceptional condition mean it is appreciating rather than depreciating in value. Also qualifying: collector motorcycles (including high-performance and touring), electric vehicle conversions, highly modified vehicles, hot rods / street rods originally manufactured before 1950, and restomods.',
    outcome:'The vehicle qualifies as an "enthusiast vehicle" and is eligible for the Enthusiast+ program.' },

  { name:'Vehicle Usage Eligibility', cat:'Eligibility', ref:'Rule 2.A-C',
    condition:'The vehicle is used primarily for daily driving, auto-club activities, exhibits, parades, or a private collection, and it is NOT used for business or commercial purposes (unless the company has given prior approval). Auto-club activities and exhibitions explicitly exclude racing, rallies, and any speed or timed events.',
    outcome:'The vehicle is eligible for the program. If more than 50% of its use is business, or if it carries people or property for a fee, it is not eligible.' },

  { name:'Usage Category Selection', cat:'Rating', ref:'Rule 2.D',
    condition:'Pick the usage category that best describes how the vehicle is driven: Pleasure/Hobby, Commute (0–3 miles one way), Commute (4–14 miles), Commute (15+ miles), or Occasional Business. If more than one category applies, use the one that produces the highest rate.',
    outcome:'The selected usage category is used in the Usage Factor step of the premium calculation.' },

  // ─── Premium Determination ───────────────────────────────────────────────
  { name:'Policy Term and Minimum Premium', cat:'Other', ref:'Rule 3.1',
    condition:'Every policy has a one-year term.',
    outcome:'The minimum total written premium across all coverages is $125 per policy.' },

  { name:'Auto Theft Prevention Authority Fee', cat:'Other', ref:'Rule 3.2',
    condition:'The policy covers any registered, licensed motor vehicle in Colorado with a gross vehicle weight under 26,000 lbs.',
    outcome:'Charge $1 per vehicle per year. The fee is fully earned — it is not refunded on cancellation.' },

  // ─── Discounts ───────────────────────────────────────────────────────────
  { name:'Mass Marketing Discount', cat:'Rating', ref:'Rule 4.B',
    condition:'The insured is part of an eligible mass-marketing program that the company has approved, where service-related cost savings or other transactional/distribution expense reductions apply.',
    outcome:'Apply a 5% discount (factor 0.95) to BI, PD, MP, OTC, and Collision.' },

  { name:'Paid-in-Full Discount', cat:'Rating', ref:'Rule 4.C',
    condition:'The insured pays the full premium at policy inception (new business) or by the renewal effective date. If on a payment plan, the insured pays the balance in full within 90 days of inception/renewal.',
    outcome:'Apply a 10% discount (factor 0.90) to all coverages.' },

  { name:'Recurring ACH Payment Discount', cat:'Rating', ref:'Rule 4.D',
    condition:'The insured is on a payment plan other than full-pay AND signs up for automatic recurring ACH payments.',
    outcome:'Apply a 5% discount (factor 0.95) to all coverages.' },

  { name:'Motorcycle Safety Course Discount', cat:'Rating', ref:'Rule 4.E',
    condition:'The insured provides proof of a Motorcycle Safety Foundation (MSF) course completion certificate.',
    outcome:'Apply a 10% discount (factor 0.90) to all motorcycle coverages.' },

  { name:'Secure Storage Discount', cat:'Rating', ref:'Rule 4.F',
    condition:'The insured vehicle is customarily stored in a secure enclosed location such as a private garage, barn, pole building, dedicated rental storage unit, or car condo. Public parking garages do NOT qualify.',
    outcome:'Apply a 25% discount (factor 0.75) to Other Than Collision coverage only.' },

  { name:'Accident Prevention Course Discount (55+)', cat:'Rating', ref:'Rule 4.G',
    condition:'The principal operator is age 55 or older, has completed a Department-of-Revenue-approved driver-education course in the past 36 months (not because of a court order), and can provide the certificate of completion.',
    outcome:'Apply a 5% discount (factor 0.95) to BI, PD, MP, and Collision on the vehicle the qualifying driver principally operates. If that driver has an at-fault accident in the following 3 years, the discount is removed at the next renewal and may be withheld for another 3 years.' },

  // ─── Changes, Cancellation, Payment ──────────────────────────────────────
  { name:'Policy Changes — Pro-Rata', cat:'Other', ref:'Rule 5',
    condition:'A change to the policy (adding a vehicle, coverage change, etc.) requires a premium adjustment.',
    outcome:'Compute the adjustment pro-rata using the rates in effect on the policy\'s original effective date. If a vehicle or coverage was cancelled and is reinstated within 30 days, charge the same premium that was returned at cancellation. Adjustments under $5: reductions stay on account (refundable on request); a $5 minimum charge applies to increases.' },

  { name:'Cancellation — Pro-Rata', cat:'Other', ref:'Rule 6',
    condition:'The policy or a specific coverage is cancelled (except for coverages that carry a minimum earned premium).',
    outcome:'Compute return premium pro-rata on a 365-day year.' },

  { name:'Payment Plans and Fees', cat:'Other', ref:'Rule 7',
    condition:'This rule applies to every policy.',
    outcome:'Four payment plans are available: Full (100% up front), Semi-Annual (50% / 50%), Quarterly (4 × 25%), and Monthly (16.67% down + 10 × 8.33%). Fees are fully earned: Non-Sufficient Funds $25, Late $10, Reinstatement $15, Installment $3.50 per installment (non-Full plans only). The Late fee is waived when a Reinstatement fee is charged.' },

  // ─── Mandatory Coverage Offers ───────────────────────────────────────────
  { name:'UM/UIM Bodily Injury — Mandatory Offer', cat:'Compliance', ref:'Rule 8.1.A',
    condition:'The insured vehicle is registered or principally garaged in Colorado AND the policy provides Bodily Injury and Property Damage Liability.',
    outcome:'UM/UIM Bodily Injury must be offered at the Colorado financial-responsibility minimum. The Named Insured may reject in writing — once rejected, the insurer does not need to re-notify on renewal, replacement, reinstatement, or vehicle transfers. The insured may request higher or broader limits (up to the policy\'s BI limit) in writing at any time.' },

  { name:'UM Property Damage — When Available', cat:'Eligibility', ref:'Rule 8.1.B',
    condition:'The insured purchases UM/UIM Bodily Injury AND does NOT purchase Collision on the vehicle.',
    outcome:'UM Property Damage is available at a limit equal to the vehicle\'s Guaranteed Value® or Stated Value. The Named Insured may reject this coverage in writing.' },

  { name:'Medical Payments — Mandatory Offer', cat:'Compliance', ref:'Rule 8.3',
    condition:'The policy provides Bodily Injury and Property Damage Liability.',
    outcome:'$5,000 of Medical Payments coverage must be offered. The Named Insured may reject in writing. The insurer must keep proof of rejection on file for at least 3 years; otherwise, the policy is treated as if $5,000 of Medical Payments is in force.' },

  // ─── Endorsements ────────────────────────────────────────────────────────
  { name:'Custom Features Eligibility', cat:'Eligibility', ref:'Rule 9.3',
    condition:'The vehicle is valued using Guaranteed Value® (not Stated Value).',
    outcome:'Custom Features coverage may be added up to $10,000. This limit counts against the vehicle\'s Guaranteed Value® — it is NOT additional coverage on top. Vehicles written on a Stated Value basis are not eligible.' },

  { name:'Named Driver Exclusion', cat:'Eligibility', ref:'Rule 9.7',
    condition:'A household member would otherwise cause the risk to be declined, and the Named Insured is willing to exclude that person from coverage.',
    outcome:'Attach the Named Driver Exclusion endorsement. The Named Insured must sign it and the signature is kept on file. The exclusion stays in effect for the full policy term, all vehicles on the policy (including replacements/adds), and across all future renewals, reinstatements, and endorsements until the company discontinues it. The excluded driver\'s record and experience are NOT used in rating, and the excluded driver is not listed as an operator. If a loss payee is shown in the Declarations, they receive notice that the policy contains the exclusion.' },

  { name:'Vehicle Under Construction Eligibility', cat:'Eligibility', ref:'Rule 9.10',
    condition:'The vehicle is under active restoration or is a new build, AND it is not being written on Stated Value, AND Special Build Coverage is not also being purchased.',
    outcome:'Attach the Vehicle Under Construction endorsement ($20 per vehicle). Coverage adds quarterly Guaranteed Value® increases during the restoration and adds coverage for Automotive Tools (personal hand tools and portable equipment used to maintain the vehicle, plus carts/cases that store them and accessories whether attached or not). At policy expiration the limit reverts to the Guaranteed Value® shown in the Declarations.' },

  { name:'Cherished Salvage® Eligibility', cat:'Eligibility', ref:'Rule 9.11',
    condition:'The vehicle is 10 model years or older AND it is not being written on Stated Value AND Special Build Coverage is not also being purchased.',
    outcome:'The insured may retain the vehicle salvage in the event of a total loss or constructive total loss.' },

  { name:'Stated Value Incompatibilities', cat:'Eligibility', ref:'Rule 9.14',
    condition:'The vehicle is being written on Stated Value (typically a closed-end lease or where a Guaranteed Value® cannot be established due to ongoing depreciation).',
    outcome:'The following endorsements are NOT available on the vehicle: Cherished Salvage®, Custom Features, Special Build Coverage, and Vehicle Under Construction.' },

  { name:'Special Build Coverage Eligibility', cat:'Eligibility', ref:'Rule 9.15',
    condition:'The insured is rebuilding the vehicle (or its replacement) to its pre-loss condition and appearance using materials of similar kind and quality, AND will provide bills, receipts, and related documents to justify costs beyond Guaranteed Value®. The vehicle must not be on Stated Value, Vehicle Under Construction, or Cherished Salvage®.',
    outcome:'Reimbursement is available up to $500,000 per vehicle beyond the Guaranteed Value® for rebuilding to pre-loss condition.' },

  { name:'Auto Segment — Off Road Endorsement', cat:'Coverage', ref:'Rule 9.16.A',
    condition:'The vehicle is a Truck, Jeep, or SUV.',
    outcome:'Attach the Off Road Endorsement automatically at no additional premium. It adds: Automotive Tools $250 (subject to a $25 deductible), Spare Parts $1,500, Fire Extinguisher and Automatic Extinguisher System Recovery $250, and Offroad Safety Equipment $500. The endorsement also includes specific offroad-activity exclusions.' },

  { name:'Auto Segment — Enjoy The Ride Endorsement', cat:'Coverage', ref:'Rule 9.16.B',
    condition:'The vehicle is a passenger Auto body type AND has a model year of 2000 or newer.',
    outcome:'Attach the Enjoy The Ride Endorsement automatically at no additional premium. It adds: Motorsports Medical Payments $5,000, Limited Physical Damage for autocross participation up to $10,000 (subject to a $250 minimum deductible), Finder\'s Fee $500, and Branded Merchandise $750.' },

  { name:'Overlander Endorsement Eligibility', cat:'Eligibility', ref:'Rule 9.17',
    condition:'The vehicle carries liability coverage (it is NOT a vehicle with Other Than Collision only).',
    outcome:'The Overlander Endorsement may be added for $25 per vehicle. It bundles: Vacation Site Liability $10,000, Vacation Site Medical Payments $5,000, Vehicle Camping Accessories $5,000, and Offroad Recovery Reimbursement $250.' },

  { name:'Rental Reimbursement Eligibility', cat:'Eligibility', ref:'Rule 9.18',
    condition:'The vehicle has both Bodily Injury and Property Damage Liability coverage.',
    outcome:'Rental Reimbursement is available in two tiers: $50/day with a $1,500 maximum at $50 per vehicle, or $125/day with a $3,750 maximum at $125 per vehicle. Reimbursement is contingent on the insured providing bills and receipts for the replacement transportation.' },

  // ─── Rating ──────────────────────────────────────────────────────────────
  { name:'Driving Record Points — Assignment', cat:'Rating', ref:'Rule 10.1.A',
    condition:'A resident household driver has at least one violation in the previous 3 years AND at least one violation in the 15 months immediately before the next renewal date.',
    outcome:'Assign points per the Driving Record Points table. Major violations (e.g., DUI, reckless driving, hit-and-run, 25+ over the speed limit) carry 6 points each. Moderate violations (e.g., 20–24 over, careless driving, open container by passenger) carry 3–4 points. Minor moving violations (seat belt excepted) carry 2 points. Points expire at the first renewal after the conviction date is 3 years old. If a violation occurs with an at-fault accident, only the at-fault-accident (loss-history) surcharge applies — unless it would result in no surcharge at all, in which case the driving-record points are used instead.' },

  { name:'At-Fault Accident — Loss History', cat:'Rating', ref:'Rule 10.1.B',
    condition:'An accident in the previous 3 years meets ANY of: (a) the insured driver was 50% or more at fault; (b) a payment was made under Property Damage Liability; or (c) a single-vehicle accident resulted in a Collision payment. The following do NOT count: losses under $3,000 total; insured vehicle was lawfully parked (not rolling from parked); payouts solely under Medical Payments, UM/UIM, Other Than Collision, or Towing & Labor; the insured was reimbursed by the at-fault party; rear-ended with no citation issued to the insured; hit-and-run if reported to police promptly; damage from animals, flying gravel, missiles, or falling objects; operator responsible is not listed on the policy; the other driver was cited and the insured was not; and accidents while responding to duty as paid/volunteer police, fire, first-aid, or law enforcement.',
    outcome:'Apply the Loss History surcharge from LOSS-1 based on the number of vehicles with a surcharge, the number of at-fault accidents in the last 3 years, and each additional accident. Surcharges do NOT apply to trailers.' },

  { name:'Insurance Score — Application', cat:'Rating', ref:'Rule 10.2.A',
    condition:'This rule applies to every policy.',
    outcome:'Apply an insurance score factor to all vehicles on all policies. Renewals refresh scores at least every 36 months. A score is re-ordered when the primary insured is replaced. The first Named Insured may request one new score per policy term.' },

  { name:'Vehicle Symbol — Application', cat:'Rating', ref:'Rule 10.2.B',
    condition:'The vehicle\'s model year is 1980 or newer AND it is NOT a motorcycle, a replica of a pre-1980 vehicle, or a trailer.',
    outcome:'Apply the Vehicle Symbol factor (A through F) looked up by make × body type from EP Symbols 04 25. Any make/body combination not listed in the symbol table is assigned symbol F.' },

  { name:'Rating Territory — ZIP Assignment', cat:'Rating', ref:'Rule 11',
    condition:'This rule applies to every vehicle.',
    outcome:'Use the vehicle\'s garaging-address ZIP code for rating. For new ZIPs that did not exist when the rate pages were filed: (1) if a new ZIP was split off from an old one, use the old one\'s rate; (2) if a new ZIP combines old ZIPs, use one of the source ZIPs; (3) otherwise use the adjacent ZIP with the lowest rate.' },

  { name:'Personal Property Blanket Coverage', cat:'Coverage', ref:'Rule 13',
    condition:'The insured wants blanket coverage on spare parts and/or automotive tools personally owned for the maintenance of a collector vehicle.',
    outcome:'Attach the Blanket Personal Property endorsement at the limits/rates on the Rate pages, with optional deductibles. Non-collectible personal property (other than qualifying spare parts or tools), dealer stock, and business property are NOT eligible.' },
];

// ────────────────────────────────────────────────────────────────────────────
// Run
// ────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('──────────────────────────────────────────────────────────────');
  console.log(`  Reseed EP CO rules in plain English`);
  console.log(`  Product: ${PRODUCT_ID}`);
  console.log(`  Dry run: ${DRY_RUN}`);
  console.log('──────────────────────────────────────────────────────────────');
  console.log('');

  // ── Step 1: delete my existing rules (identified by "Rule N" reference) ──
  const all = await req('GET', '/api/rules');
  const mine = all.filter(r =>
    r.productId === PRODUCT_ID &&
    typeof r.reference === 'string' &&
    /^Rule\b/i.test(r.reference)
  );
  console.log(`▸ Existing EP CO rules to delete: ${mine.length}`);
  for (const r of mine) {
    try {
      await req('DELETE', `/api/items/single/${r.id}`);
      process.stdout.write('.');
    } catch (e) {
      console.log(`\n    ✗ ${r.id}: ${e.message.slice(0,100)}`);
    }
  }
  console.log('');
  console.log('');

  // ── Step 2: POST plain-English replacements ─────────────────────────────
  console.log(`▸ Seeding ${RULES.length} plain-English rules:`);
  for (const r of RULES) {
    const body = {
      productId: PRODUCT_ID,
      name: r.name,
      ruleCategory: r.cat,     // NOT `type` — Cosmos uses that as discriminator
      ruleType: r.cat,
      reference: r.ref,
      condition: r.condition,
      outcome: r.outcome,
      proprietary: false,
      status: 'active',
      states: ['CO'],
      createdAt: NOW, updatedAt: NOW,
    };
    await req('POST', '/api/rules', body);
    console.log(`  • ${r.cat.padEnd(11)} ${r.ref.padEnd(10)} ${r.name}`);
  }
  console.log('');

  console.log('──────────────────────────────────────────────────────────────');
  console.log(`  Done. Replaced with ${RULES.length} plain-English rules.`);
  console.log(`  Open: ${BASE_URL}/rules/${PRODUCT_ID}`);
  console.log('──────────────────────────────────────────────────────────────');
}

main().catch(e => { console.error('\nFAILED:', e.message); process.exit(1); });
