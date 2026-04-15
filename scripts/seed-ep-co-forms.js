#!/usr/bin/env node
/**
 * Seed Enthusiast+ Colorado forms as PDFs.
 *
 * Two modes:
 *  --upload (default)
 *      Uploads each local PDF via POST /api/blob/upload (multipart — exact
 *      shape from the Forms page HAR), then creates a form record in
 *      /api/forms with the returned downloadUrl / filePath.
 *
 *  --by-url PUBLIC_BASE
 *      Skips blob upload. Assumes PDFs are already hosted at PUBLIC_BASE/<filename>
 *      (e.g. GitHub raw). Just creates the form records with downloadUrl
 *      pointing there. Use this if /api/blob/upload is down (auth 500) and
 *      you've stashed the PDFs on a public URL you control.
 *
 * Heads-up: as of capture, /api/blob/upload returns HTTP 500 with
 * "Upload failed: Server failed to authenticate the request …" — that's
 * an Azure Storage auth problem in the App Service config, not something
 * this script can fix. --upload will fail until the storage connection
 * string is rotated in App Service Configuration.
 *
 * Usage:
 *   node scripts/seed-ep-co-forms.js                              # upload mode
 *   node scripts/seed-ep-co-forms.js --by-url https://raw.githubusercontent.com/…/ep-co/
 *   DRY_RUN=1 node scripts/seed-ep-co-forms.js
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const BASE_URL   = process.env.BASE_URL   || 'https://app-nvi-demo-prohub-insurance-pl.azurewebsites.net';
const PRODUCT_ID = process.env.PRODUCT_ID || 'product-10b39165-cb9e-44c6-ae38-1a3436038fb6';
const DRY_RUN    = process.env.DRY_RUN === '1';

const args = process.argv.slice(2);
const BY_URL_IDX = args.indexOf('--by-url');
const BY_URL_BASE = BY_URL_IDX >= 0 ? args[BY_URL_IDX + 1] : null;
const MODE = BY_URL_BASE ? 'by-url' : 'upload';

const NOW = new Date().toISOString();

// ── Forms catalog — the EP CO filing documents ──────────────────────────────
// localFile is relative to seed-pdfs/; the first three are stand-ins generated
// by our earlier PDF generator, plus the three client filing PDFs if placed
// manually alongside them.
const FORMS = [
  { formNumber: 'EP CO PC', formName: 'Premium Calculation — CO (2nd Ed.)',       category: 'Base Coverage Form', origin: 'manuscript', localFile: 'EP_CO_Prem_Calculation_04_25_2nd_Ed.pdf', editionDate: '04/25',
    desc: 'Step-by-step algorithm for Parts A–E premium calculation (vehicle, policy UM/UIM, endorsements, total).', coverageKeys: ['BI','PD','MP','UM/UIM','UM PD','OTC','COLL'] },
  { formNumber: 'EP CO Rates', formName: 'Rate Pages — CO (3rd Ed.)',             category: 'Base Coverage Form', origin: 'manuscript', localFile: 'EP_CO_Rates_04_25_3rd_Ed.pdf', editionDate: '04/25',
    desc: 'Filed base rates and factor tables (BR, ILF, DED, GV, MMY, TYPE, ATTR, SYMB, SCMI, USE, ZIP, IS, AGE, PTS, LOSS, NVD, PAY, ARF, MAGE, DISP, MZIP, AMRF, ENDO, AF).', coverageKeys: ['BI','PD','MP','UM/UIM','UM PD','OTC','COLL'] },
  { formNumber: 'EP CO Rules', formName: 'Manual Rules — CO (2nd Ed.)',           category: 'Notice',             origin: 'manuscript', localFile: 'EP_CO_Rules_01_25_2nd_Ed.pdf', editionDate: '01/25',
    desc: 'Eligibility, usage categories, premium determination, discounts, payment plans & fees, UM/UIM & MP mandatory offers, endorsement rules, driving record / loss history, rating territories, personal property.', coverageKeys: [] },
  { formNumber: 'EP Symbols', formName: 'Vehicle Symbol Assignments',             category: 'Notice',             origin: 'manuscript', localFile: 'EP_Symbols_04_25.pdf',       editionDate: '04/25',
    desc: 'Symbol A–F assignment by make × body type. Applies to 1980+ vehicles except motorcycles, pre-1980 replicas, trailers.', coverageKeys: ['BI','PD','MP','OTC','COLL'] },
  // ISO PP policy form — we generated a realistic one in the earlier seed
  { formNumber: 'PP 00 01', formName: 'Personal Auto Policy',                     category: 'Base Coverage Form', origin: 'iso',        localFile: 'PP_00_01.pdf',                editionDate: '09/18',
    desc: 'ISO Personal Auto Policy — Parts A–F base coverage form.', coverageKeys: ['BI','PD','MP','UM/UIM','UM PD','OTC','COLL'] },
];

// ────────────────────────────────────────────────────────────────────────────
// HTTP helpers
// ────────────────────────────────────────────────────────────────────────────
const HDRS = { 'Accept': '*/*', 'Origin': BASE_URL, 'Referer': `${BASE_URL}/forms/${PRODUCT_ID}` };

async function jsonReq(method, apiPath, body) {
  if (DRY_RUN && method !== 'GET') { console.log(`    [dry] ${method} ${apiPath}`); return { id:'dry', downloadUrl:'https://example.invalid/'+Date.now()+'.pdf', filePath:'products/forms/dry.pdf' }; }
  const res = await fetch(`${BASE_URL}${apiPath}`, { method, headers: { ...HDRS, 'Content-Type':'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${apiPath} -> ${res.status}: ${text.slice(0,220)}`);
  try { return JSON.parse(text); } catch { return text; }
}

async function uploadPdf(localAbsPath, remoteFileName) {
  if (DRY_RUN) { console.log(`    [dry] POST /api/blob/upload  ${path.basename(localAbsPath)} → ${remoteFileName}`); return { downloadUrl:`https://example.invalid/${remoteFileName}`, filePath:`products/${remoteFileName}` }; }
  const buf = await fs.promises.readFile(localAbsPath);
  // FormData from global (Node 18+). Blob from undici.
  const { Blob } = require('node:buffer');
  const fd = new FormData();
  fd.append('file', new Blob([buf], { type: 'application/pdf' }), path.basename(localAbsPath));
  fd.append('containerName', 'products');
  fd.append('fileName', remoteFileName);
  const res = await fetch(`${BASE_URL}/api/blob/upload`, { method: 'POST', headers: HDRS, body: fd });
  const text = await res.text();
  if (!res.ok) throw new Error(`POST /api/blob/upload -> ${res.status}: ${text.slice(0,300)}`);
  const parsed = (() => { try { return JSON.parse(text); } catch { return {}; } })();
  // The server response shape isn't visible to us (upload is broken right
  // now), so construct the expected public URL from the convention we saw
  // on existing forms.
  const conventionalUrl = `https://stnvidoprohubinspl.blob.core.windows.net/products/${remoteFileName.replace(/\s/g,'%20')}`;
  return {
    downloadUrl: parsed.url || parsed.downloadUrl || parsed.blobUrl || conventionalUrl,
    filePath:    parsed.filePath || `products/${remoteFileName}`,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Wire coverage keys (BI, PD, …) to the actual coverage IDs we seeded earlier
// ────────────────────────────────────────────────────────────────────────────
async function resolveCoverageIds() {
  const covs = await jsonReq('GET', `/api/coverages?productId=${encodeURIComponent(PRODUCT_ID)}`);
  const byCode = {};
  for (const c of covs) if (c.coverageCode) byCode[c.coverageCode] = c.id;
  return byCode;
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('────────────────────────────────────────────────────────────────');
  console.log(`  EP CO Forms seed`);
  console.log(`  Mode:     ${MODE}${BY_URL_BASE ? `  (${BY_URL_BASE})` : ''}`);
  console.log(`  Target:   ${BASE_URL}`);
  console.log(`  Product:  ${PRODUCT_ID}`);
  console.log('────────────────────────────────────────────────────────────────');
  console.log('');

  const covByCode = await resolveCoverageIds();
  console.log(`→ Resolved ${Object.keys(covByCode).length} coverages by code`);
  console.log('');

  const pdfDir = path.join(__dirname, '..', 'seed-pdfs');

  for (const f of FORMS) {
    console.log(`▸ ${f.formNumber}  —  ${f.formName}`);
    let downloadUrl, filePath;

    if (MODE === 'upload') {
      const localPath = path.join(pdfDir, f.localFile);
      if (!fs.existsSync(localPath)) {
        console.log(`    ✗ local file missing: ${localPath} — skipping`);
        continue;
      }
      try {
        const remote = `forms/${Date.now()}-${f.localFile}`;
        const out = await uploadPdf(localPath, remote);
        downloadUrl = out.downloadUrl;
        filePath    = out.filePath;
        console.log(`    ✓ uploaded → ${filePath}`);
      } catch (err) {
        console.log(`    ✗ upload failed: ${err.message.slice(0, 220)}`);
        console.log('      (blob storage auth must be fixed in Azure App Service config)');
        continue;
      }
    } else {
      // by-url mode: expect PUBLIC_BASE/<localFile> to be pre-hosted
      downloadUrl = BY_URL_BASE.replace(/\/?$/, '/') + encodeURIComponent(f.localFile);
      filePath    = `external/${f.localFile}`;
      console.log(`    ↪ link: ${downloadUrl}`);
    }

    // Create the form record
    const body = {
      productId: PRODUCT_ID,
      formNumber: f.formNumber,
      formName: f.formName,
      title: f.formName,
      formEditionDate: f.editionDate,
      effectiveDate: '2026-01-01',
      category: f.category,
      origin: f.origin,
      isoOrManuscript: f.origin,
      productIds: [PRODUCT_ID],
      coverageIds: (f.coverageKeys || []).map(k => covByCode[k]).filter(Boolean),
      states: ['CO'],
      description: f.desc,
      filePath,
      downloadUrl,
      pdfUrl: downloadUrl,
      archived: false, versionCount: 1,
      uploadedBy: 'seed-script',
      createdAt: NOW, updatedAt: NOW,
    };
    const resp = await jsonReq('POST', '/api/forms', body);
    console.log(`    ✓ form record: ${resp.id}`);
    console.log('');
  }

  console.log('────────────────────────────────────────────────────────────────');
  console.log(`  Open to verify: ${BASE_URL}/forms/${PRODUCT_ID}`);
  console.log('────────────────────────────────────────────────────────────────');
}

main().catch(e => { console.error('\nFAILED:', e.message); process.exit(1); });
