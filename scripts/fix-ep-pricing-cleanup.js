#!/usr/bin/env node
/**
 * Clean up pricing steps on the Auto product so the sequence reads cleanly:
 *   factor → operand → factor → operand → … → (=  at subtotal points)
 *
 * Two cleanup passes:
 *
 *   Pass 1 — remove legacy non-EP-CO pricing steps that were left over from
 *            earlier seeds (no `section` metadata). These include "abc",
 *            "Base Rate by Coverage", "Territory Factor", "Gender Factor",
 *            "Marital Status Factor", "Violation Surcharge", "At-Fault Accident
 *            Surcharge", "Multi-Car Discount", "Multi-Policy Discount",
 *            "Paid-in-Full Discount" (the duplicate), "Final Coverage Premium",
 *            plus the lone user-test "+" operand at order 64.
 *
 *   Pass 2 — remove redundant adjacent-operand separators. If a `*` or `+` we
 *            inserted sits next to a pre-existing `=` or `*` operand, one of
 *            them is redundant. Rule: keep the subtotal `=` if present;
 *            otherwise keep the first operator in order.
 *
 * DELETE endpoint: POST of the DELETE HTTP method to /api/items/single/{id}
 * returns 200 on success. Dry-run with DRY_RUN=1 to print the plan without
 * making changes.
 *
 * Usage:
 *   DRY_RUN=1 node scripts/fix-ep-pricing-cleanup.js
 *   node scripts/fix-ep-pricing-cleanup.js
 */

'use strict';

const BASE_URL   = process.env.BASE_URL   || 'https://app-nvi-demo-prohub-insurance-pl.azurewebsites.net';
const PRODUCT_ID = process.env.PRODUCT_ID || 'product-10b39165-cb9e-44c6-ae38-1a3436038fb6';
const DRY_RUN    = process.env.DRY_RUN === '1';

const HDRS = { 'Accept':'*/*', 'Content-Type':'application/json',
  'Origin': BASE_URL, 'Referer':`${BASE_URL}/pricing/${PRODUCT_ID}` };

async function req(method, path, body) {
  if (DRY_RUN && method !== 'GET') { console.log(`    [dry] ${method} ${path}`); return { ok:true }; }
  const res = await fetch(`${BASE_URL}${path}`, { method, headers: HDRS, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}`);
  const t = await res.text();
  try { return JSON.parse(t); } catch { return t; }
}

const LEGACY_STEP_NAMES = new Set([
  'abc',
  'Base Rate by Coverage',
  'Territory Factor',
  'Gender Factor',
  'Marital Status Factor',
  'Violation Surcharge',
  'At-Fault Accident Surcharge',
  'Multi-Car Discount',
  'Multi-Policy Discount',
  'Final Coverage Premium',
  'Annual Mileage Factor',      // Homeowners-era name — mine is "Supercar Mileage Factor"
  'Insurance Score Factor',     // two exist; keep the EP CO one (has `section`)
  'Vehicle Symbol Factor',      // two exist; keep EP CO
  'Driver Age Factor',          // two exist; keep EP CO
  'Driving Record Points Factor', // two exist; keep EP CO
  'Vehicle Type Factor',        // two exist; keep EP CO
  'Vehicle Attribute Factor',   // two exist; keep EP CO
  'Paid-in-Full Discount',      // two exist; keep EP CO
]);

async function main() {
  console.log('──────────────────────────────────────────────────────────────');
  console.log(`  Pricing cleanup on ${PRODUCT_ID}`);
  console.log(`  Dry run: ${DRY_RUN}`);
  console.log('──────────────────────────────────────────────────────────────');
  console.log('');

  const all = await req('GET', `/api/pricing-steps?productId=${encodeURIComponent(PRODUCT_ID)}`);
  all.sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
  console.log(`▸ Total steps on product: ${all.length}`);

  // Classification:
  //   - "mine" factor step:   has `section` metadata
  //   - "mine" separator:     bare operand (no stepName) at a fractional order
  //   - legacy factor:        stepName matches LEGACY_STEP_NAMES and no section
  //   - legacy bare operand:  no stepName at an INTEGER order (my separators are fractional)
  const isFractional = (o) => typeof o === 'number' && !Number.isInteger(o);
  const isMine = (s) =>
    !!s.section ||
    (s.stepType === 'operand' && !s.stepName && isFractional(s.order));

  const legacy = all.filter(s => !isMine(s) && (
    LEGACY_STEP_NAMES.has(s.stepName) ||
    (!s.stepName && !isFractional(s.order))     // bare operand at integer order (e.g. user's "+" at 64)
  ));
  console.log('');
  console.log(`Pass 1 — legacy steps to remove: ${legacy.length}`);
  for (const s of legacy) {
    console.log(`   · order ${String(s.order).padEnd(6)} ${s.stepType.padEnd(8)} ${s.operand || '  '}  ${(s.stepName || '(bare operand)').slice(0,40)}`);
  }

  // Pass 2: redundant adjacent operands
  // Recompute the ordered list assuming pass 1 deletions happen.
  const kept = all.filter(s => !legacy.find(x => x.id === s.id));
  kept.sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
  const redundant = [];
  for (let i = 0; i < kept.length - 1; i++) {
    const a = kept[i], b = kept[i+1];
    if (a.stepType !== 'operand' || b.stepType !== 'operand') continue;
    // Prefer to keep a named subtotal (has stepName). Drop a BARE operand.
    // If both are named, or both are bare, drop the later-ordered one.
    const aBare = !a.stepName;
    const bBare = !b.stepName;
    if (aBare && !bBare) redundant.push(a);
    else if (!aBare && bBare) redundant.push(b);
    else if (aBare && bBare) redundant.push(b); // two bare separators → drop later
    // else: both named subtotals (e.g. "Total Endorsement" = then "Subtotal A+C+D" +)
    //       — both are meaningful content; keep both.
  }
  console.log('');
  console.log(`Pass 2 — redundant adjacent operands to remove: ${redundant.length}`);
  for (const s of redundant) {
    console.log(`   · order ${String(s.order).padEnd(6)} operand ${s.operand}  ${(s.stepName || '(bare)').slice(0,40)}`);
  }

  // Dedup — one deletion can land in both lists
  const toDelete = new Map();
  for (const s of [...legacy, ...redundant]) toDelete.set(s.id, s);

  console.log('');
  console.log(`▸ Unique deletions: ${toDelete.size}`);
  if (DRY_RUN) { console.log('(dry run — no changes)'); return; }

  let done = 0, failed = 0;
  for (const s of toDelete.values()) {
    try {
      await req('DELETE', `/api/items/single/${s.id}`);
      done++;
      process.stdout.write('.');
    } catch (e) {
      failed++;
      console.log(`\n    ✗ ${s.id}: ${e.message.slice(0,120)}`);
    }
  }
  console.log(`\n  deleted: ${done}    failed: ${failed}`);

  // Final state
  const after = await req('GET', `/api/pricing-steps?productId=${encodeURIComponent(PRODUCT_ID)}`);
  after.sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
  console.log('');
  console.log(`Final sequence — ${after.length} steps:`);
  for (const s of after) {
    const marker = s.stepType === 'operand' ? `  ${s.operand}  ` : '     ';
    console.log(`  ${String(s.order).padStart(5)}  [${s.stepType.padEnd(7)}] ${marker} ${(s.stepName || '(separator)')}`);
  }
  console.log('');
  console.log(`Open: ${BASE_URL}/pricing/${PRODUCT_ID}`);
}

main().catch(e => { console.error('\nFAILED:', e.message); process.exit(1); });
