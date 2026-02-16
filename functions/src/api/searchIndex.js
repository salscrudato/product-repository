/**
 * Search Index – Cloud Function Triggers
 *
 * Firestore triggers that maintain the `orgs/{orgId}/searchIndex/{docId}`
 * collection whenever an artifact or version is created/updated.
 *
 * Supported artifact types:
 *   product, coverage, form, rule, rateProgram, table, changeset, stateProgram
 *
 * Token / prefix generation mirrors src/utils/searchTokens.ts (duplicated
 * here to avoid a shared-code dependency between functions/ and src/).
 */

const admin = require('firebase-admin');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');

const db = admin.firestore();

// ════════════════════════════════════════════════════════════════════════
// Token helpers (mirror of src/utils/searchTokens.ts)
// ════════════════════════════════════════════════════════════════════════

const MAX_TOKENS   = 30;
const MAX_PREFIXES = 80;
const MAX_PFX_LEN  = 8;
const SPLIT_RE     = /[\s\-_\/|:;,.()[\]{}<>'"!@#$%^&*+=~`]+/;
const SHORT_CODE   = /^[A-Z0-9]{2}$/;

function tokenise(raw) {
  if (!raw) return [];
  const parts = String(raw).split(SPLIT_RE).filter(Boolean);
  const seen  = new Set();
  const out   = [];
  for (const p of parts) {
    const isCode = SHORT_CODE.test(p);
    const lower  = p.toLowerCase();
    if (!isCode && lower.length <= 2) continue;
    if (seen.has(lower)) continue;
    seen.add(lower);
    out.push(lower);
  }
  return out;
}

function generateTokens(...inputs) {
  const merged = [];
  for (const i of inputs) if (i) merged.push(...tokenise(i));
  return [...new Set(merged)].slice(0, MAX_TOKENS);
}

function prefixesForToken(tok) {
  const out = [];
  const lim = Math.min(tok.length, MAX_PFX_LEN);
  for (let i = 1; i <= lim; i++) out.push(tok.slice(0, i));
  return out;
}

function generatePrefixes(tokens) {
  const seen = new Set();
  const out  = [];
  for (const t of tokens) {
    for (const p of prefixesForToken(t)) {
      if (seen.has(p)) continue;
      seen.add(p);
      out.push(p);
      if (out.length >= MAX_PREFIXES) return out;
    }
  }
  return out;
}

function buildVectors(...inputs) {
  const tokens   = generateTokens(...inputs);
  const prefixes = generatePrefixes(tokens);
  return { tokens, prefixes };
}

// ════════════════════════════════════════════════════════════════════════
// Upsert helper
// ════════════════════════════════════════════════════════════════════════

/**
 * Write (or delete) a search-index document.
 * docId convention: `{type}_{artifactId}` or `{type}_{artifactId}_{versionId}`
 */
async function upsertIndex(orgId, docId, data) {
  const ref = db.collection(`orgs/${orgId}/searchIndex`).doc(docId);
  if (!data) {
    await ref.delete().catch(() => {}); // ignore "not found"
    return;
  }
  await ref.set({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
}

// ════════════════════════════════════════════════════════════════════════
// Per-artifact indexers
// ════════════════════════════════════════════════════════════════════════

function indexProduct(orgId, productId, d) {
  const { tokens, prefixes } = buildVectors(d.name, d.lineOfBusiness, d.description);
  return upsertIndex(orgId, `product_${productId}`, {
    type: 'product',
    artifactId: productId,
    title: d.name || productId,
    subtitle: [d.lineOfBusiness, d.status].filter(Boolean).join(' · '),
    tokens,
    prefixes,
    route: `/products/${productId}/overview`,
  });
}

function indexCoverage(orgId, productId, coverageId, d) {
  const { tokens, prefixes } = buildVectors(d.name, d.coverageCode, d.description);
  return upsertIndex(orgId, `coverage_${coverageId}`, {
    type: 'coverage',
    artifactId: coverageId,
    title: d.name || coverageId,
    subtitle: [d.coverageCode, d.status].filter(Boolean).join(' · '),
    tokens,
    prefixes,
    route: `/products/${productId}/coverages/${coverageId}`,
    parentId: productId,
    parentType: 'product',
  });
}

function indexForm(orgId, formId, d) {
  const { tokens, prefixes } = buildVectors(d.formNumber, d.title, d.type, d.isoOrManuscript);
  return upsertIndex(orgId, `form_${formId}`, {
    type: 'form',
    artifactId: formId,
    title: d.formNumber ? `${d.formNumber} — ${d.title || ''}`.trim() : (d.title || formId),
    subtitle: [d.isoOrManuscript?.toUpperCase(), d.type, d.latestDraftVersionId ? 'has draft' : null].filter(Boolean).join(' · '),
    tokens,
    prefixes,
    route: `/forms/${formId}`,
  });
}

function indexFormVersion(orgId, formId, versionId, d) {
  const { tokens, prefixes } = buildVectors(d.editionDate, d.status, d.summary, `v${d.versionNumber}`);
  return upsertIndex(orgId, `form_${formId}_${versionId}`, {
    type: 'form',
    artifactId: formId,
    versionId,
    title: `${d.editionDate || 'Edition'} (v${d.versionNumber || '?'})`,
    subtitle: [d.status, d.effectiveStart].filter(Boolean).join(' · '),
    tokens,
    prefixes,
    route: `/forms/${formId}/versions/${versionId}`,
    parentId: formId,
    parentType: 'form',
  });
}

function indexRule(orgId, ruleId, d) {
  const { tokens, prefixes } = buildVectors(d.name, d.ruleCode, d.category, d.type);
  return upsertIndex(orgId, `rule_${ruleId}`, {
    type: 'rule',
    artifactId: ruleId,
    title: d.name || d.ruleCode || ruleId,
    subtitle: [d.category, d.type, d.status].filter(Boolean).join(' · '),
    tokens,
    prefixes,
    route: `/rules/${ruleId}`,
  });
}

function indexRateProgram(orgId, rpId, d) {
  const { tokens, prefixes } = buildVectors(d.name, d.description, d.scope);
  return upsertIndex(orgId, `rateProgram_${rpId}`, {
    type: 'rateProgram',
    artifactId: rpId,
    title: d.name || rpId,
    subtitle: [d.scope, d.status].filter(Boolean).join(' · '),
    tokens,
    prefixes,
    route: `/pricing/${d.productId || rpId}`,
    parentId: d.productId,
    parentType: 'product',
  });
}

function indexTable(orgId, tableId, d) {
  const { tokens, prefixes } = buildVectors(d.name, d.description, d.category, ...(d.tags || []));
  return upsertIndex(orgId, `table_${tableId}`, {
    type: 'table',
    artifactId: tableId,
    title: d.name || tableId,
    subtitle: [d.category, `${d.dimensionCount || '?'}D`].filter(Boolean).join(' · '),
    tokens,
    prefixes,
    route: `/tables/${tableId}`,
  });
}

function indexChangeSet(orgId, csId, d) {
  const { tokens, prefixes } = buildVectors(d.name, d.description, d.status);
  return upsertIndex(orgId, `changeset_${csId}`, {
    type: 'changeset',
    artifactId: csId,
    title: d.name || csId,
    subtitle: [d.status?.replace('_', ' '), d.targetEffectiveStart].filter(Boolean).join(' · '),
    tokens,
    prefixes,
    route: `/changesets/${csId}`,
  });
}

function indexStateProgram(orgId, productId, versionId, stateCode, d) {
  const { tokens, prefixes } = buildVectors(d.stateName, stateCode, d.status, d.filingNumber);
  return upsertIndex(orgId, `stateProgram_${productId}_${stateCode}`, {
    type: 'stateProgram',
    artifactId: stateCode,
    title: `${d.stateName || stateCode} — State Program`,
    subtitle: [d.status?.replace('_', ' '), d.filingNumber].filter(Boolean).join(' · '),
    tokens,
    prefixes,
    route: `/products/${productId}/states/${stateCode}`,
    parentId: productId,
    parentType: 'product',
  });
}

// ════════════════════════════════════════════════════════════════════════
// Firestore triggers
// ════════════════════════════════════════════════════════════════════════

const REGION = 'us-central1';
const opts = { region: REGION, memory: '256MiB' };

// ── Products ──
const onProductWrite = onDocumentWritten(
  { ...opts, document: 'orgs/{orgId}/products/{productId}' },
  async (event) => {
    const { orgId, productId } = event.params;
    const after = event.data?.after?.data();
    if (!after) return upsertIndex(orgId, `product_${productId}`, null);
    return indexProduct(orgId, productId, after);
  }
);

// ── Coverages ──
const onCoverageWrite = onDocumentWritten(
  { ...opts, document: 'orgs/{orgId}/products/{productId}/coverages/{coverageId}' },
  async (event) => {
    const { orgId, productId, coverageId } = event.params;
    const after = event.data?.after?.data();
    if (!after) return upsertIndex(orgId, `coverage_${coverageId}`, null);
    return indexCoverage(orgId, productId, coverageId, after);
  }
);

// ── Forms (top-level) ──
const onFormWrite = onDocumentWritten(
  { ...opts, document: 'orgs/{orgId}/forms/{formId}' },
  async (event) => {
    const { orgId, formId } = event.params;
    const after = event.data?.after?.data();
    if (!after) return upsertIndex(orgId, `form_${formId}`, null);
    return indexForm(orgId, formId, after);
  }
);

// ── Form versions ──
const onFormVersionWrite = onDocumentWritten(
  { ...opts, document: 'orgs/{orgId}/forms/{formId}/versions/{versionId}' },
  async (event) => {
    const { orgId, formId, versionId } = event.params;
    const after = event.data?.after?.data();
    if (!after) return upsertIndex(orgId, `form_${formId}_${versionId}`, null);
    return indexFormVersion(orgId, formId, versionId, after);
  }
);

// ── Rules ──
const onRuleWrite = onDocumentWritten(
  { ...opts, document: 'orgs/{orgId}/rules/{ruleId}' },
  async (event) => {
    const { orgId, ruleId } = event.params;
    const after = event.data?.after?.data();
    if (!after) return upsertIndex(orgId, `rule_${ruleId}`, null);
    return indexRule(orgId, ruleId, after);
  }
);

// ── Rate Programs ──
const onRateProgramWrite = onDocumentWritten(
  { ...opts, document: 'orgs/{orgId}/ratePrograms/{rpId}' },
  async (event) => {
    const { orgId, rpId } = event.params;
    const after = event.data?.after?.data();
    if (!after) return upsertIndex(orgId, `rateProgram_${rpId}`, null);
    return indexRateProgram(orgId, rpId, after);
  }
);

// ── Tables ──
const onTableWrite = onDocumentWritten(
  { ...opts, document: 'orgs/{orgId}/tables/{tableId}' },
  async (event) => {
    const { orgId, tableId } = event.params;
    const after = event.data?.after?.data();
    if (!after) return upsertIndex(orgId, `table_${tableId}`, null);
    return indexTable(orgId, tableId, after);
  }
);

// ── Change Sets ──
const onChangeSetWrite = onDocumentWritten(
  { ...opts, document: 'orgs/{orgId}/changeSets/{csId}' },
  async (event) => {
    const { orgId, csId } = event.params;
    const after = event.data?.after?.data();
    if (!after) return upsertIndex(orgId, `changeset_${csId}`, null);
    return indexChangeSet(orgId, csId, after);
  }
);

// ── State Programs ──
const onStateProgramWrite = onDocumentWritten(
  { ...opts, document: 'orgs/{orgId}/products/{productId}/versions/{versionId}/statePrograms/{stateCode}' },
  async (event) => {
    const { orgId, productId, versionId, stateCode } = event.params;
    const after = event.data?.after?.data();
    if (!after) return upsertIndex(orgId, `stateProgram_${productId}_${stateCode}`, null);
    return indexStateProgram(orgId, productId, versionId, stateCode, after);
  }
);

// ════════════════════════════════════════════════════════════════════════
// Exports
// ════════════════════════════════════════════════════════════════════════

module.exports = {
  onProductWrite,
  onCoverageWrite,
  onFormWrite,
  onFormVersionWrite,
  onRuleWrite,
  onRateProgramWrite,
  onTableWrite,
  onChangeSetWrite,
  onStateProgramWrite,
};
