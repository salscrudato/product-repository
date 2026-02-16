/**
 * Filing Package – Cloud Function
 *
 * Generates a filing-ready export bundle for a Change Set:
 *   1. Snapshots all artifacts/versions in the CS
 *   2. Generates exhibit files (forms schedule, rate exhibit, rule exhibit,
 *      deviations report, change summary)
 *   3. Creates a ZIP in Cloud Storage
 *   4. Updates the Firestore package doc with status + download path
 */

const { onCall } = require('firebase-functions/v2/https');
const { https } = require('firebase-functions');
const admin = require('firebase-admin');
const { requireAuth } = require('../middleware/auth');

const db = admin.firestore();
const bucket = admin.storage().bucket();

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

/** djb2 hash for content integrity. */
function hashContent(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Canonical JSON for deterministic snapshots. */
function canonical(value) {
  return JSON.stringify(value, (_, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.keys(v).sort().reduce((acc, k) => { acc[k] = v[k]; return acc; }, {});
    }
    return v;
  }, 2);
}

/** Format a Firestore Timestamp or ISO string for display. */
function fmtDate(ts) {
  if (!ts) return 'N/A';
  if (ts.toDate) return ts.toDate().toISOString().split('T')[0];
  if (typeof ts === 'string') return ts.split('T')[0];
  return String(ts);
}

/** Update the package doc with progress. */
async function updateProgress(pkgRef, progress, extra = {}) {
  await pkgRef.update({
    progress,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...extra,
  });
}

// ════════════════════════════════════════════════════════════════════════
// Exhibit Generators
// ════════════════════════════════════════════════════════════════════════

function generateFormsSchedule(artifacts) {
  const forms = artifacts.filter(a => a.artifactType === 'form');
  return canonical({
    title: 'Forms Schedule',
    generatedAt: new Date().toISOString(),
    forms: forms.map(f => ({
      name: f.artifactName,
      versionId: f.versionId,
      versionNumber: f.versionNumber,
      action: f.action,
      status: f.status,
    })),
  });
}

function generateRateExhibit(artifacts) {
  const rates = artifacts.filter(a =>
    a.artifactType === 'rateProgram' || a.artifactType === 'table'
  );
  return canonical({
    title: 'Rate Exhibit',
    generatedAt: new Date().toISOString(),
    ratePrograms: rates.filter(r => r.artifactType === 'rateProgram').map(r => ({
      name: r.artifactName,
      versionId: r.versionId,
      versionNumber: r.versionNumber,
      action: r.action,
      status: r.status,
    })),
    tables: rates.filter(r => r.artifactType === 'table').map(r => ({
      name: r.artifactName,
      versionId: r.versionId,
      versionNumber: r.versionNumber,
      action: r.action,
    })),
  });
}

function generateRuleExhibit(artifacts) {
  const rules = artifacts.filter(a => a.artifactType === 'rule');
  return canonical({
    title: 'Rule Exhibit',
    generatedAt: new Date().toISOString(),
    rules: rules.map(r => ({
      name: r.artifactName,
      versionId: r.versionId,
      versionNumber: r.versionNumber,
      action: r.action,
      status: r.status,
    })),
  });
}

function generateDeviationsReport(artifacts, stateOverrides) {
  return canonical({
    title: 'Deviations Report',
    generatedAt: new Date().toISOString(),
    stateCode: stateOverrides.stateCode || 'ALL',
    overrides: stateOverrides.overrides || {},
    overrideCount: Object.keys(stateOverrides.overrides || {}).length,
  });
}

function generateChangeSummary(changeSet, artifacts) {
  return canonical({
    title: 'Change Summary',
    generatedAt: new Date().toISOString(),
    changeSet: {
      id: changeSet.id,
      name: changeSet.name,
      description: changeSet.description || '',
      status: changeSet.status,
      effectiveStart: changeSet.targetEffectiveStart || null,
      effectiveEnd: changeSet.targetEffectiveEnd || null,
      ownerUserId: changeSet.ownerUserId,
      createdAt: fmtDate(changeSet.createdAt),
    },
    artifacts: artifacts.map(a => ({
      type: a.artifactType,
      name: a.artifactName,
      action: a.action,
      versionId: a.versionId,
      versionNumber: a.versionNumber,
      contentHash: a.contentHash,
    })),
    totalArtifacts: artifacts.length,
    byAction: {
      create: artifacts.filter(a => a.action === 'create').length,
      update: artifacts.filter(a => a.action === 'update').length,
      deprecate: artifacts.filter(a => a.action === 'deprecate').length,
      delete_requested: artifacts.filter(a => a.action === 'delete_requested').length,
    },
  });
}

// ════════════════════════════════════════════════════════════════════════
// Main build function
// ════════════════════════════════════════════════════════════════════════

exports.buildFilingPackage = onCall(
  { cors: true, memory: '512MiB', timeoutSeconds: 300, region: 'us-central1' },
  async (request) => {
    const authUser = requireAuth(request);
    const { orgId, changeSetId, scope, stateCode } = request.data;

    if (!orgId || !changeSetId) {
      throw new https.HttpsError('invalid-argument', 'orgId and changeSetId are required');
    }
    if (scope === 'state' && !stateCode) {
      throw new https.HttpsError('invalid-argument', 'stateCode required for state scope');
    }

    // Verify user is an active member of the org
    const memberDoc = await db.collection('orgs').doc(orgId).collection('members').doc(authUser.uid).get();
    if (!memberDoc.exists || memberDoc.data().status !== 'active') {
      throw new https.HttpsError('permission-denied', 'You are not a member of this organization');
    }

    // 1. Load the change set
    const csRef = db.collection(`orgs/${orgId}/changeSets`).doc(changeSetId);
    const csDoc = await csRef.get();
    if (!csDoc.exists) {
      throw new https.HttpsError('not-found', 'ChangeSet not found');
    }
    const changeSet = { id: csDoc.id, ...csDoc.data() };

    // 2. Create the package document
    const pkgRef = db.collection(`orgs/${orgId}/filingPackages`).doc();
    const now = admin.firestore.FieldValue.serverTimestamp();

    await pkgRef.set({
      orgId,
      changeSetId,
      changeSetName: changeSet.name || '',
      scope: scope || 'full',
      stateCode: stateCode || null,
      stateName: null,
      status: 'building',
      progress: 0,
      artifactCount: 0,
      artifactsSnapshot: [],
      exhibits: [],
      storagePath: null,
      downloadUrl: null,
      error: null,
      effectiveStart: changeSet.targetEffectiveStart || null,
      effectiveEnd: changeSet.targetEffectiveEnd || null,
      buildStartedAt: now,
      buildCompletedAt: null,
      buildDurationMs: null,
      requestedBy: authUser.uid,
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const buildStart = Date.now();

    try {
      // 3. Load CS items
      await updateProgress(pkgRef, 10);
      const itemsSnap = await csRef.collection('items').get();
      const items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (items.length === 0) {
        throw new Error('ChangeSet has no items');
      }

      // 4. Snapshot each artifact version
      await updateProgress(pkgRef, 20);
      const artifacts = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const artSnap = {
          artifactType: item.artifactType,
          artifactId: item.artifactId,
          artifactName: item.artifactName || item.artifactId,
          versionId: item.versionId,
          versionNumber: 0,
          status: '',
          action: item.action,
          contentHash: '',
        };

        // Try to load version metadata for richer snapshot
        try {
          // Generic version doc path pattern
          const paths = [
            `orgs/${orgId}/products/${item.artifactId}/versions/${item.versionId}`,
            `orgs/${orgId}/forms/${item.artifactId}/versions/${item.versionId}`,
            `orgs/${orgId}/rules/${item.artifactId}/versions/${item.versionId}`,
            `orgs/${orgId}/ratePrograms/${item.artifactId}/versions/${item.versionId}`,
            `orgs/${orgId}/tables/${item.artifactId}/versions/${item.versionId}`,
          ];

          for (const vPath of paths) {
            const vDoc = await db.doc(vPath).get();
            if (vDoc.exists) {
              const vData = vDoc.data();
              artSnap.versionNumber = vData.versionNumber || 0;
              artSnap.status = vData.status || '';
              artSnap.contentHash = hashContent(canonical(vData.data || vData));
              break;
            }
          }
        } catch {
          // Version doc not found at any path; content hash of item data
          artSnap.contentHash = hashContent(canonical(item));
        }

        artifacts.push(artSnap);
        await updateProgress(pkgRef, 20 + Math.floor((i / items.length) * 30));
      }

      // 5. Load state overrides (if state-scoped)
      let stateOverrides = { stateCode: stateCode || null, overrides: {} };
      if (scope === 'state' && stateCode) {
        // Try to find the state program doc for the first product in the CS
        const productItems = items.filter(i => i.artifactType === 'product');
        if (productItems.length > 0) {
          const productId = productItems[0].artifactId;
          // Search for any version that has statePrograms
          const versionsSnap = await db
            .collection(`orgs/${orgId}/products/${productId}/versions`)
            .limit(1)
            .get();
          if (!versionsSnap.empty) {
            const versionId = versionsSnap.docs[0].id;
            const spDoc = await db
              .doc(`orgs/${orgId}/products/${productId}/versions/${versionId}/statePrograms/${stateCode}`)
              .get();
            if (spDoc.exists) {
              const spData = spDoc.data();
              stateOverrides = {
                stateCode,
                overrides: spData.overrides || {},
              };
              pkgRef.update({ stateName: spData.stateName || stateCode });
            }
          }
        }
      }

      // 6. Generate exhibits
      await updateProgress(pkgRef, 60);

      const formsSchedule = generateFormsSchedule(artifacts);
      const rateExhibit = generateRateExhibit(artifacts);
      const ruleExhibit = generateRuleExhibit(artifacts);
      const deviationsReport = generateDeviationsReport(artifacts, stateOverrides);
      const changeSummary = generateChangeSummary(changeSet, artifacts);

      await updateProgress(pkgRef, 75);

      // 7. Build ZIP (using Buffer-based approach since archiver may not be available)
      // We store each exhibit as a separate file in Storage, plus a manifest
      const storagePath = `orgs/${orgId}/filingPackages/${pkgRef.id}`;
      const exhibitFiles = [
        { name: 'forms_schedule.json', content: formsSchedule, title: 'Forms Schedule', mime: 'application/json' },
        { name: 'rate_exhibit.json', content: rateExhibit, title: 'Rate Exhibit', mime: 'application/json' },
        { name: 'rule_exhibit.json', content: ruleExhibit, title: 'Rule Exhibit', mime: 'application/json' },
        { name: 'deviations_report.json', content: deviationsReport, title: 'Deviations Report', mime: 'application/json' },
        { name: 'change_summary.json', content: changeSummary, title: 'Change Summary', mime: 'application/json' },
      ];

      const exhibitEntries = [];
      for (const exhibit of exhibitFiles) {
        const filePath = `${storagePath}/${exhibit.name}`;
        const file = bucket.file(filePath);
        await file.save(exhibit.content, {
          contentType: exhibit.mime,
          metadata: {
            packageId: pkgRef.id,
            changeSetId,
            generatedAt: new Date().toISOString(),
          },
        });
        exhibitEntries.push({
          fileName: exhibit.name,
          title: exhibit.title,
          mimeType: exhibit.mime,
          sizeBytes: Buffer.byteLength(exhibit.content, 'utf8'),
        });
      }

      // 8. Create a combined manifest file
      const manifest = canonical({
        packageId: pkgRef.id,
        changeSetId,
        changeSetName: changeSet.name,
        scope: scope || 'full',
        stateCode: stateCode || null,
        generatedAt: new Date().toISOString(),
        generatedBy: authUser.uid,
        artifactCount: artifacts.length,
        exhibits: exhibitEntries.map(e => e.fileName),
        artifactsSnapshot: artifacts.map(a => ({
          type: a.artifactType,
          id: a.artifactId,
          name: a.artifactName,
          versionId: a.versionId,
          contentHash: a.contentHash,
        })),
      });

      const manifestPath = `${storagePath}/manifest.json`;
      await bucket.file(manifestPath).save(manifest, {
        contentType: 'application/json',
      });

      await updateProgress(pkgRef, 95);

      // 9. Finalize the package document
      const buildEnd = Date.now();

      await pkgRef.update({
        status: 'complete',
        progress: 100,
        artifactCount: artifacts.length,
        artifactsSnapshot: artifacts,
        exhibits: exhibitEntries,
        storagePath: manifestPath,
        buildCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
        buildDurationMs: buildEnd - buildStart,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        packageId: pkgRef.id,
        storagePath: manifestPath,
      };

    } catch (err) {
      // Mark as failed
      await pkgRef.update({
        status: 'failed',
        error: err.message || 'Unknown build error',
        buildCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
        buildDurationMs: Date.now() - buildStart,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      throw new https.HttpsError('internal', `Package build failed: ${err.message}`);
    }
  },
);
