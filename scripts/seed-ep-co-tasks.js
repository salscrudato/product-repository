#!/usr/bin/env node
/**
 * Seed Personal Auto tasks for Sal Scrudato.
 *
 * Mirrors the shape Rebecca's tasks use on the Tasks page (confirmed via
 * HAR): POST /api/items/task with
 *   { title, description, priority, assignee, dueDate, phase, createdAt, updatedAt }
 *
 * Phases observed in use: research, develop, compliance, implementation.
 * All tasks here are high-priority and tailored to the Enthusiast+ /
 * Personal Auto product filing & launch.
 *
 * Usage:
 *   node scripts/seed-ep-co-tasks.js
 *   DRY_RUN=1 node scripts/seed-ep-co-tasks.js
 */

'use strict';

const BASE_URL = process.env.BASE_URL || 'https://app-nvi-demo-prohub-insurance-pl.azurewebsites.net';
const DRY_RUN  = process.env.DRY_RUN === '1';
const ASSIGNEE = 'Sal Scrudato';
const PRIORITY = 'high';
const NOW = new Date().toISOString();

const HDRS = { 'Accept':'*/*', 'Content-Type':'application/json',
  'Origin': BASE_URL, 'Referer': `${BASE_URL}/tasks` };

async function req(method, path, body) {
  if (DRY_RUN && method !== 'GET') { console.log(`    [dry] ${method} ${path}`); return { id:'dry' }; }
  const res = await fetch(`${BASE_URL}${path}`, { method, headers: HDRS, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${(await res.text()).slice(0,200)}`);
  return JSON.parse(await res.text());
}

// ────────────────────────────────────────────────────────────────────────────
// Tasks — 16 high-priority items across the 4 observed phases
// ────────────────────────────────────────────────────────────────────────────
const TASKS = [
  // ─── Phase 1: research ───────────────────────────────────────────────────
  { phase:'research',       dueDate:'2026-04-30', title:'Personal Auto Product — Market Analysis & Competitive Assessment',
    description:'Benchmark the Enthusiast+ Personal Auto program vs. Hagerty, American Modern, State Farm Classic, Grundy, and Heacock. Capture target-segment pricing bands, coverage depth (Guaranteed Value®, Cherished Salvage®, Motorsports, Overlander), eligibility thresholds, and distribution footprint.' },
  { phase:'research',       dueDate:'2026-05-08', title:'Personal Auto Product — Business Case & 5-Year Pro Forma',
    description:'Build the business case: addressable market (CO registered enthusiast vehicles), expected written premium, target loss ratio, expense load, combined ratio, and contribution margin. 5-year projection with sensitivity around symbol mix and territory concentration.' },
  { phase:'research',       dueDate:'2026-05-15', title:'Enthusiast Segment Loss Ratio Study — Colorado',
    description:'Analyze 3-year loss experience for CO enthusiast/classic auto segment: frequency by coverage (BI/PD/MP/UM-UIM/OTC/COLL), severity distribution, wind/hail concentration by territory, theft loss (Supercar attribute), and track-day exposure (Motorsports endorsement).' },
  { phase:'research',       dueDate:'2026-05-22', title:'Customer Persona & Segmentation Study',
    description:'Define the 6 PCM vehicle categories from the filing: Antique (25+ yr), Classic (unique/rare), Exotic (<14 yr appreciating), Collector Motorcycle (Touring/High-Perf), Electric Conversion, and Highly Modified/Restomod/Hot-Rod/Street-Rod. Map persona to usage (Pleasure / Commute 0-3 / 4-14 / 15+ / Occasional Business).' },

  // ─── Phase 2: develop ────────────────────────────────────────────────────
  { phase:'develop',        dueDate:'2026-05-29', title:'Coverage / Sub-Coverage Architecture per PCM',
    description:'Finalize Coverage → Sub-Coverage hierarchy: 7 root coverages (BI, PD, MP, UM/UIM, OTC, COLL, UM PD under UM/UIM) plus endorsement sub-coverages (Full Glass, Cherished Salvage®, Waiver of Subrogation, Special Build, Custom Features, Increased Limits — Spare Parts, VUC, Motorsports, Rental, Overlander, Value-Added, Stated Value). Document which sub-coverages gate on parent purchase.' },
  { phase:'develop',        dueDate:'2026-06-05', title:'Rating Algorithm Build-out — Parts A / C / D / E',
    description:'Implement the 24-step Part A vehicle premium chain, 9-step Part C policy-level UM/UIM, Part D endorsement premiums (Custom Features, Spare Parts, Value-Added, VUC, Motorsports, Rental, Overlander), and Part E totals with $125 minimum premium and $1/vehicle Auto Theft Prevention Authority fee.' },
  { phase:'develop',        dueDate:'2026-06-12', title:'Base Rate Indication & Loss Cost Analysis by Coverage',
    description:'Validate filed CO base rates: BI 346.4159, PD 254.6268, MP 24.1807, UM/UIM 691.2548, UM PD 60.6585, OTC 146.0778, COLL 98.4824. Review loss cost trends, on-level adjustments, and credibility-weighted indication for re-filing cycle.' },
  { phase:'develop',        dueDate:'2026-06-19', title:'Rating Factor Tables — Validation & Peer Review',
    description:'Peer review all factor tables against filing (EP CO Rates 04 25 — 3rd Ed.): Driver Age (16→90+), Driving Record Points, ZIP Code Factors (CO 80xxx / 81xxx), Insurance Score (<=520 → 991-997 + No Hit / Thin File), Loss History, NVD, Modified/Model Year, Vehicle Type/Attribute/Symbol, Supercar Mileage, Usage, GV, Deductible (OTC / OTC Full Glass / Collision).' },
  { phase:'develop',        dueDate:'2026-06-26', title:'Vehicle Symbol Assignment Maintenance Process',
    description:'Establish process for maintaining EP Symbols 04 25 tables (140+ makes × 12 body types → A–F symbol). Define symbol review cadence, new-make onboarding workflow, and defaulting rule (any unlisted vehicle → symbol F).' },
  { phase:'develop',        dueDate:'2026-07-03', title:'Form Authoring — Manuscript Base Policy + Endorsement Library',
    description:'Draft the manuscript base policy + endorsements library matching the coverage model: Section I (liability), Section II (physical damage), plus 18 endorsements (Cherished Salvage®, Custom Features, Special Build, VUC, Motorsports, Rental, Overlander, Value-Added [Plus/Premium/Ultimate], Stated Value, Named Driver Exclusion/Coverage, Additional Insured-Lessor, Loss Payable, Business Use, Collector Motorcycle, Off Road, Enjoy The Ride, Personal Property Blanket).' },

  // ─── Phase 3: compliance ─────────────────────────────────────────────────
  { phase:'compliance',     dueDate:'2026-07-10', title:'Rate Filing Preparation — Colorado DOI (SERFF)',
    description:'Package rate filing for CO DOI via SERFF: Premium Calculation algorithm (Parts A–E), all factor tables, base rate justification, indication support, and Explanatory Memorandum. Target 60-day effective prior-approval.' },
  { phase:'compliance',     dueDate:'2026-07-17', title:'Form Filing Preparation — Colorado DOI',
    description:'Prepare form filing submission with side-by-side filing for base policy and each endorsement. Include readability scores (Flesch-Kincaid), side-by-side vs. ISO PP 00 01 09 18, and CO-specific amendatory endorsements.' },
  { phase:'compliance',     dueDate:'2026-07-24', title:'UM/UIM Offer & Rejection Compliance (Rule 8.1)',
    description:'Confirm policy machinery for mandatory UM/UIM BI offer at CO FR minimum on every policy providing BI/PD; insured may reject in writing and rejection carries forward to renewals/replacements (no re-notify required). Validate rejection form with CO DOI. Rule 8.1.A filing manual.' },
  { phase:'compliance',     dueDate:'2026-07-31', title:'Medical Payments Offer Compliance — 3-Year Rejection Retention',
    description:'Implement Rule 8.3 workflow: offer $5K MP under every BI/PD policy; insurer must retain proof of rejection 3+ years (else $5K MP is presumed in force). Build audit trail + record retention in policy admin.' },

  // ─── Phase 4: implementation ─────────────────────────────────────────────
  { phase:'implementation', dueDate:'2026-08-14', title:'Duck Creek Configuration — Product Component Model Mapping',
    description:'Map PCM hierarchy (Product / LOB / Coverage / Sub-Coverage / Forms / Rates / Rules) into Duck Creek Policy configuration. Validate state applicability, manuscript/bureau designation, claims basis, and design standards as the single source of truth feeding Duck Creek.' },
  { phase:'implementation', dueDate:'2026-09-15', title:'Go-Live: Colorado Pilot Rollout — Enthusiast+ Personal Auto',
    description:'Execute CO pilot: producer onboarding, quote-to-bind walkthrough, claims SOPs (classic-vehicle appraisal network, Cherished Salvage® handling), reinsurance binder confirmation, and first 30-day monitoring dashboard (bind rate, hit ratio, premium by territory/symbol, early loss notifications).' },
];

// ────────────────────────────────────────────────────────────────────────────
// Run
// ────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('──────────────────────────────────────────────────────────────');
  console.log(`  Personal Auto tasks — assignee: ${ASSIGNEE}, priority: ${PRIORITY}`);
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Dry run: ${DRY_RUN}`);
  console.log('──────────────────────────────────────────────────────────────');
  console.log('');

  const byPhase = {};
  for (const t of TASKS) (byPhase[t.phase] = byPhase[t.phase] || []).push(t);

  let created = 0;
  for (const phase of ['research','develop','compliance','implementation']) {
    const group = byPhase[phase] || [];
    if (!group.length) continue;
    console.log(`▸ ${phase.toUpperCase()} — ${group.length} task${group.length===1?'':'s'}`);
    for (const t of group) {
      const body = {
        title: t.title,
        description: t.description,
        priority: PRIORITY,
        assignee: ASSIGNEE,
        dueDate: t.dueDate,
        phase: t.phase,
        createdAt: NOW,
        updatedAt: NOW,
      };
      const r = await req('POST', '/api/items/task', body);
      created++;
      console.log(`  ✓ ${t.dueDate}  ${t.title.slice(0,74)}`);
    }
    console.log('');
  }

  console.log('──────────────────────────────────────────────────────────────');
  console.log(`  Done. Created ${created} task${created===1?'':'s'}.`);
  console.log(`  Open: ${BASE_URL}/tasks`);
  console.log('──────────────────────────────────────────────────────────────');
}

main().catch(e => { console.error('\nFAILED:', e.message); process.exit(1); });
