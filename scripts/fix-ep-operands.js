#!/usr/bin/env node
/**
 * Fix: insert bare operand steps between the EP CO factor steps so the
 * UI's pricing calculation chains correctly.
 *
 * The Enthusiast+ Premium Calculation is:
 *   Part A  Base × DriverFactor × Limit × Deductible × GV × MMY × Type ×
 *           Attr × Symbol × SCMI × Usage × AntiqueLU × ZIP × IS × Loss ×
 *           NVD × CS × WOS × SB × MM × SS × PIF × ACH  =  Vehicle Prem
 *   Part C  similar multiplicative chain for policy-level UM/UIM
 *   Part D  sum (+) of endorsement premiums
 *   Part E  sum + ATPA fee = Final
 *
 * Shape per HAR (manual operand creation):
 *   { productId, stepType:"operand", operand:"+", coverages:[…], states:[…], order:N }
 *
 * Strategy: find my EP CO factor steps by section metadata, sort by order,
 * and insert an operand step at the midpoint order between every consecutive
 * pair using the correct symbol for that section (× or +).
 *
 * Usage:
 *   node scripts/fix-ep-operands.js
 *   DRY_RUN=1 node scripts/fix-ep-operands.js
 */

'use strict';
const BASE_URL   = process.env.BASE_URL   || 'https://app-nvi-demo-prohub-insurance-pl.azurewebsites.net';
const PRODUCT_ID = process.env.PRODUCT_ID || 'product-10b39165-cb9e-44c6-ae38-1a3436038fb6';
const DRY_RUN    = process.env.DRY_RUN === '1';

const HDRS = {
  'Accept': '*/*', 'Content-Type': 'application/json',
  'Origin': BASE_URL, 'Referer': `${BASE_URL}/pricing/${PRODUCT_ID}`,
};

async function req(method, path, body) {
  if (DRY_RUN && method !== 'GET') { console.log(`    [dry] ${method} ${path}  ${body ? JSON.stringify(body).slice(0,140) : ''}`); return { id: 'dry' }; }
  const res = await fetch(`${BASE_URL}${path}`, { method, headers: HDRS, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0,180)}`);
  try { return JSON.parse(text); } catch { return text; }
}

// Section → operand symbol (determines what goes between factors in that section)
const SECTION_OPERAND = {
  'Part A — Vehicle Coverage Premium': '*',
  'Part C — Policy Level Coverage (UM/UIM)': '*',
  'Part D — Endorsement Premium Calculation': '+',
  'Part E — Total Premium': '+',
};

async function main() {
  console.log(`▸ Fetching pricing steps for ${PRODUCT_ID}`);
  const allSteps = await req('GET', `/api/pricing-steps?productId=${encodeURIComponent(PRODUCT_ID)}`);
  const mine = allSteps
    .filter(s => s.section && SECTION_OPERAND[s.section] !== undefined)
    .sort((a, b) => a.order - b.order);

  console.log(`  found ${mine.length} EP CO steps (by section metadata)`);
  if (!mine.length) { console.error('  nothing to fix — did the seed run?'); process.exit(1); }

  // Gather coverage list used across these steps (UI usually shows all on operand rows)
  const allCovs = [...new Set(mine.flatMap(s => s.coverages || []))];
  // Also pull all states the UI typically shows on operand rows
  const ALL_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

  // Group into sections so we know where section boundaries are
  const bySection = {};
  for (const s of mine) { (bySection[s.section] = bySection[s.section] || []).push(s); }

  let insertedCount = 0;

  for (const [section, steps] of Object.entries(bySection)) {
    const sym = SECTION_OPERAND[section];
    console.log(`\n→ ${section}  — operand "${sym}" between ${steps.length} steps`);

    for (let i = 0; i < steps.length - 1; i++) {
      const a = steps[i], b = steps[i + 1];
      // Skip if the NEXT step is already an operand step — it self-prefixes
      if (b.stepType === 'operand') {
        console.log(`  (skip) #${a.order}→#${b.order}  next is already operand "${b.operand || '='}"`);
        continue;
      }
      // Likewise, if THIS step is an operand that computes a running total
      // (like Average Driver Factor =), the NEXT factor's preceding operand is
      // still needed — so only skip based on the NEXT step being operand.

      // Midpoint fractional order keeps the operand visually between the pair
      const midOrder = (a.order + b.order) / 2;
      const body = {
        productId: PRODUCT_ID,
        stepType: 'operand',
        operand: sym,
        coverages: allCovs,
        states: ALL_STATES,
        order: midOrder,
      };
      const resp = await req('POST', '/api/pricing-steps', body);
      insertedCount++;
      console.log(`  • between #${String(a.order).padStart(2)} "${(a.stepName||'').slice(0,36).padEnd(38)}"  →  #${String(b.order).padStart(2)} "${(b.stepName||'').slice(0,36).padEnd(38)}"  (order=${midOrder})`);
    }
  }

  console.log(`\n✓ Inserted ${insertedCount} operand steps.`);
  console.log(`  Open: ${BASE_URL}/pricing/${PRODUCT_ID}`);
}

main().catch(e => { console.error('\nFAILED:', e.message); process.exit(1); });
