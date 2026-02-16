/**
 * Task Automation – Cloud Function Triggers
 *
 * 1. ChangeSet → ready_for_review: auto-create review tasks per required role
 * 2. StateProgram → pending_filing: auto-create filing-package task
 * 3. Publish gating: getPublishPreflight checks for blocking tasks
 */

const admin = require('firebase-admin');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');

const db = admin.firestore();
const REGION = 'us-central1';
const opts = { region: REGION, memory: '256MiB' };

// Approval rules by artifact type (mirrors client-side APPROVAL_RULES)
const APPROVAL_RULES = {
  product: ['product_manager'],
  coverage: ['product_manager'],
  form: ['compliance'],
  rule: ['underwriter', 'compliance'],
  rateProgram: ['actuary'],
  table: ['actuary'],
  dataDictionary: ['product_manager'],
  stateProgram: ['compliance'],
};

const ROLE_LABELS = {
  admin: 'Administrator',
  product_manager: 'Product Manager',
  actuary: 'Actuary',
  underwriter: 'Underwriter',
  compliance: 'Compliance',
  viewer: 'Viewer',
};

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

async function createTaskDoc(orgId, data) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = db.collection(`orgs/${orgId}/tasks`).doc();

  await ref.set({
    orgId,
    status: 'open',
    priority: data.priority || 'high',
    phase: data.phase || 'general',
    dueDate: data.dueDate || null,
    assigneeUserId: data.assigneeUserId || null,
    assigneeName: data.assigneeName || null,
    links: data.links || [],
    blocking: data.blocking ?? true,
    source: data.source || 'manual',
    title: data.title,
    description: data.description || '',
    createdAt: now,
    createdBy: data.createdBy || 'system',
    updatedAt: now,
    updatedBy: data.createdBy || 'system',
  });

  // Activity log
  await ref.collection('activity').add({
    taskId: ref.id,
    type: 'created',
    actorUserId: data.createdBy || 'system',
    actorName: 'System Automation',
    summary: `Task auto-created: ${data.title}`,
    before: null,
    after: null,
    createdAt: now,
  });

  return ref.id;
}

/** Find a member with a specific role in the org (for assignment) */
async function findMemberByRole(orgId, role) {
  const snap = await db.collection(`orgs/${orgId}/members`)
    .where('role', '==', role)
    .where('status', '==', 'active')
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0].data();
  return { userId: snap.docs[0].id, displayName: d.displayName || d.email || role };
}

// ════════════════════════════════════════════════════════════════════════
// 1. ChangeSet → ready_for_review: auto-create review tasks
// ════════════════════════════════════════════════════════════════════════

const onChangeSetReview = onDocumentUpdated(
  { ...opts, document: 'orgs/{orgId}/changeSets/{changeSetId}' },
  async (event) => {
    const { orgId, changeSetId } = event.params;
    const before = event.data?.before?.data();
    const after  = event.data?.after?.data();
    if (!before || !after) return;

    // Only fire on transition to ready_for_review
    if (before.status === after.status) return;
    if (after.status !== 'ready_for_review') return;

    const csName = after.name || `Change Set ${changeSetId.slice(0, 8)}`;

    // Get items to determine required review roles
    const itemsSnap = await db.collection(`orgs/${orgId}/changeSets/${changeSetId}/items`).get();
    const requiredRoles = new Set();
    itemsSnap.docs.forEach(doc => {
      const item = doc.data();
      const rules = APPROVAL_RULES[item.artifactType] || [];
      rules.forEach(r => requiredRoles.add(r));
    });

    // Check for existing auto-review tasks to avoid duplicates
    const existingSnap = await db.collection(`orgs/${orgId}/tasks`)
      .where('source', '==', 'auto_review')
      .get();
    const existingForCS = existingSnap.docs
      .map(d => d.data())
      .filter(t => t.links?.some(l => l.changeSetId === changeSetId))
      .filter(t => t.status !== 'cancelled' && t.status !== 'done');

    const existingRoles = new Set(
      existingForCS.map(t => {
        // Extract role from title pattern: "Review: ... (role)"
        const match = t.title?.match(/\(([^)]+)\)$/);
        return match ? match[1].toLowerCase().replace(/ /g, '_') : null;
      }).filter(Boolean)
    );

    const actorUserId = after.updatedBy || after.ownerUserId || 'system';

    for (const role of requiredRoles) {
      if (existingRoles.has(role)) continue; // Already has a task for this role

      const member = await findMemberByRole(orgId, role);
      const roleLabel = ROLE_LABELS[role] || role;

      await createTaskDoc(orgId, {
        title: `Review: ${csName} (${roleLabel})`,
        description: `Review and approve "${csName}" as ${roleLabel}. This task was auto-created when the change set was submitted for review.`,
        priority: 'high',
        phase: 'review',
        assigneeUserId: member?.userId || null,
        assigneeName: member?.displayName || null,
        links: [{
          type: 'changeset',
          artifactId: changeSetId,
          changeSetId,
          label: csName,
        }],
        blocking: true,
        source: 'auto_review',
        createdBy: actorUserId,
      });
    }
  }
);

// ════════════════════════════════════════════════════════════════════════
// 2. StateProgram → pending_filing: auto-create filing package task
// ════════════════════════════════════════════════════════════════════════

const onStateProgramFiling = onDocumentUpdated(
  { ...opts, document: 'orgs/{orgId}/products/{productId}/versions/{versionId}/statePrograms/{stateCode}' },
  async (event) => {
    const { orgId, productId, versionId, stateCode } = event.params;
    const before = event.data?.before?.data();
    const after  = event.data?.after?.data();
    if (!before || !after) return;

    // Only fire on transition to pending_filing
    if (before.status === after.status) return;
    if (after.status !== 'pending_filing') return;

    const stateName = after.stateName || stateCode;

    // Check for existing filing task
    const existingSnap = await db.collection(`orgs/${orgId}/tasks`)
      .where('source', '==', 'auto_filing')
      .get();
    const alreadyExists = existingSnap.docs.some(d => {
      const t = d.data();
      return t.links?.some(l => l.stateCode === stateCode && l.artifactId === productId) &&
             t.status !== 'cancelled' && t.status !== 'done';
    });

    if (alreadyExists) return;

    const complianceMember = await findMemberByRole(orgId, 'compliance');
    const actorUserId = after.updatedBy || 'system';

    await createTaskDoc(orgId, {
      title: `Prepare Filing Package: ${stateName}`,
      description: `Prepare and submit the regulatory filing package for ${stateName}. Required forms, rates, and rules must be assembled per state requirements.`,
      priority: 'high',
      phase: 'filing',
      assigneeUserId: complianceMember?.userId || null,
      assigneeName: complianceMember?.displayName || null,
      links: [
        {
          type: 'stateProgram',
          artifactId: productId,
          stateCode,
          label: `${stateName} — Filing`,
        },
        {
          type: 'product',
          artifactId: productId,
          versionId,
          label: 'Product Version',
        },
      ],
      blocking: true,
      source: 'auto_filing',
      createdBy: actorUserId,
    });
  }
);

// ════════════════════════════════════════════════════════════════════════
// Exports
// ════════════════════════════════════════════════════════════════════════

module.exports = {
  onChangeSetReview,
  onStateProgramFiling,
};
