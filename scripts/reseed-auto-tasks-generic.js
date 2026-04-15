#!/usr/bin/env node
/**
 * Reseed Sal Scrudato's Personal Auto tasks at medium priority, styled after
 * Rebecca Freeman's homeowners tasks.
 *
 *  1) DELETE every task where priority == 'high'  (the detailed Enthusiast+
 *     set we seeded earlier). This leaves every medium-priority task alone
 *     (Rebecca's homeowners tasks stay intact).
 *  2) POST 17 new generic, high-level Personal Auto tasks - same phase mix
 *     as Rebecca's tasks (research 4, develop 4, compliance 5, implementation 4)
 *     and the same short-title / brief-description style.
 *
 * Usage:
 *   node scripts/reseed-auto-tasks-generic.js
 *   DRY_RUN=1 node scripts/reseed-auto-tasks-generic.js
 */

'use strict';

const BASE_URL = process.env.BASE_URL || 'https://app-nvi-demo-prohub-insurance-pl.azurewebsites.net';
const DRY_RUN  = process.env.DRY_RUN === '1';
const ASSIGNEE = 'Sal Scrudato';
const PRIORITY = 'medium';
const NOW = new Date().toISOString();

const HDRS = { 'Accept':'*/*', 'Content-Type':'application/json',
  'Origin': BASE_URL, 'Referer': `${BASE_URL}/tasks` };

async function req(method, path, body) {
  if (DRY_RUN && method !== 'GET') { console.log(`    [dry] ${method} ${path}`); return { id:'dry' }; }
  const res = await fetch(`${BASE_URL}${path}`, { method, headers: HDRS, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${(await res.text()).slice(0,200)}`);
  const t = await res.text();
  try { return JSON.parse(t); } catch { return t; }
}

// ────────────────────────────────────────────────────────────────────────────
// 17 generic Personal Auto tasks, mirroring Rebecca's 4/4/5/4 phase mix
// ────────────────────────────────────────────────────────────────────────────
const TASKS = [
  // research - 4
  { phase:'research',       dueDate:'2026-05-01', title:'Personal Auto Product - Market Analysis and Competitive Assessment', description:'Personal Auto Product - Market Analysis and Competitive Assessment' },
  { phase:'research',       dueDate:'2026-05-08', title:'Personal Auto Product - Business Case',                              description:'Business Case' },
  { phase:'research',       dueDate:'2026-05-15', title:'Personal Auto - Target Segment and Persona Definition',              description:'Target Segment and Persona Definition' },
  { phase:'research',       dueDate:'2026-05-22', title:'Personal Auto - Stage Gate Approval',                                description:'Approve to advance Personal Auto product' },

  // develop - 4
  { phase:'develop',        dueDate:'2026-05-29', title:'Personal Auto - Coverage and Endorsement Design',                    description:'Coverage and Endorsement Design' },
  { phase:'develop',        dueDate:'2026-06-05', title:'Personal Auto - Rating Plan and Factor Development',                 description:'Rating Plan and Factor Development' },
  { phase:'develop',        dueDate:'2026-06-12', title:'Personal Auto - Form Drafting and Peer Review',                      description:'Form Drafting and Peer Review' },
  { phase:'develop',        dueDate:'2026-06-19', title:'Personal Auto - Underwriting Rules Manual',                          description:'Underwriting Rules Manual' },

  // compliance - 5
  { phase:'compliance',     dueDate:'2026-07-03', title:'Personal Auto - Rate Filing Preparation',                            description:'Rate Filing Preparation' },
  { phase:'compliance',     dueDate:'2026-07-10', title:'Personal Auto - Form Filing Preparation',                            description:'Form Filing Preparation' },
  { phase:'compliance',     dueDate:'2026-07-17', title:'Personal Auto - State DOI Coordination',                             description:'State Department of Insurance Coordination' },
  { phase:'compliance',     dueDate:'2026-07-24', title:'Personal Auto - Compliance Sign-Off',                                description:'Compliance Sign-Off' },
  { phase:'compliance',     dueDate:'2026-07-31', title:'Personal Auto - Regulatory Pre-Launch Review',                       description:'Regulatory Pre-Launch Review' },

  // implementation - 4
  { phase:'implementation', dueDate:'2026-08-14', title:'Personal Auto - Policy Admin System Configuration',                  description:'Policy Admin System Configuration' },
  { phase:'implementation', dueDate:'2026-08-28', title:'Personal Auto - Claims Handling SOPs',                               description:'Claims Handling SOPs' },
  { phase:'implementation', dueDate:'2026-09-11', title:'Personal Auto - Producer Training and Enablement',                   description:'Producer Training and Enablement' },
  { phase:'implementation', dueDate:'2026-09-25', title:'Personal Auto - Go-Live and Monitoring',                             description:'Go-Live and Monitoring' },
];

async function main() {
  console.log('──────────────────────────────────────────────────────────────');
  console.log(`  Reseed Personal Auto tasks for ${ASSIGNEE} at ${PRIORITY} priority`);
  console.log(`  Dry run: ${DRY_RUN}`);
  console.log('──────────────────────────────────────────────────────────────');
  console.log('');

  // ── Step 1: delete every HIGH-priority task (preserve all medium) ───────
  const all = await req('GET', '/api/items/task');
  const highs = all.filter(t => t.priority === 'high');
  const mediums = all.filter(t => t.priority === 'medium');
  console.log(`Step 1: inventory`);
  console.log(`  high-priority (to delete): ${highs.length}`);
  console.log(`  medium-priority (keep):    ${mediums.length}`);
  console.log('');

  console.log(`Step 2: DELETE /api/items/single/:id x ${highs.length}`);
  for (const t of highs) {
    try { await req('DELETE', `/api/items/single/${t.id}`); process.stdout.write('.'); }
    catch (e) { console.log(`\n  ! ${t.id}: ${e.message.slice(0,120)}`); }
  }
  console.log('');
  console.log('');

  // ── Step 3: seed the 17 new medium-priority Personal Auto tasks ─────────
  console.log(`Step 3: seeding ${TASKS.length} medium-priority tasks for ${ASSIGNEE}`);
  const byPhase = {};
  for (const t of TASKS) (byPhase[t.phase] = byPhase[t.phase] || []).push(t);

  for (const phase of ['research','develop','compliance','implementation']) {
    const group = byPhase[phase] || [];
    if (!group.length) continue;
    console.log(`  [${phase}]`);
    for (const t of group) {
      await req('POST', '/api/items/task', {
        title:       t.title,
        description: t.description,
        priority:    PRIORITY,
        assignee:    ASSIGNEE,
        dueDate:     t.dueDate,
        phase:       t.phase,
        createdAt:   NOW,
        updatedAt:   NOW,
      });
      console.log(`    ${t.dueDate}  ${t.title}`);
    }
  }
  console.log('');

  // ── Verify ──────────────────────────────────────────────────────────────
  const after = await req('GET', '/api/items/task');
  const sal = after.filter(t => t.assignee === ASSIGNEE);
  const stillHigh = after.filter(t => t.priority === 'high');
  console.log('──────────────────────────────────────────────────────────────');
  console.log(`  Final state:`);
  console.log(`    total tasks:                ${after.length}`);
  console.log(`    medium (Rebecca + Sal):     ${after.filter(t=>t.priority==='medium').length}`);
  console.log(`    high priority (should be 0):${stillHigh.length}`);
  console.log(`    tasks assigned to Sal:      ${sal.length}`);
  console.log(`    tasks assigned to Rebecca:  ${after.filter(t=>t.assignee==='Rebecca Freeman').length}`);
  console.log('');
  console.log(`  Open: ${BASE_URL}/tasks`);
  console.log('──────────────────────────────────────────────────────────────');
}

main().catch(e => { console.error('\nFAILED:', e.message); process.exit(1); });
