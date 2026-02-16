/**
 * Dependency Traversal Service
 *
 * Provides upstream/downstream/where-used/impact traversal for any
 * versioned artifact in the product repository.
 *
 * Dependency graph:
 *   Product → Coverages → Forms (via formUses)
 *   Product → RatePrograms
 *   Product → Rules
 *   Product → StatePrograms
 *   Form → Coverages (reverse: where-used)
 *   Coverage → Product (upstream)
 *   RateProgram → Product (upstream)
 *   StateProgram → Product (upstream)
 */

import {
  collection, collectionGroup, getDocs, query, where, orderBy, doc, getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { VersionedEntityType } from '../types/versioning';

// ════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════

export type ExplorerNodeType =
  | 'product'
  | 'coverage'
  | 'form'
  | 'rule'
  | 'rateProgram'
  | 'table'
  | 'stateProgram'
  | 'endorsement';

export interface ExplorerNode {
  id: string;
  type: ExplorerNodeType;
  name: string;
  /** Parent entity (e.g. productId for coverage) */
  parentId?: string;
  parentName?: string;
  /** Version info if available */
  versionCount?: number;
  latestStatus?: string;
  /** Additional metadata */
  meta: Record<string, unknown>;
}

export interface DependencyEdge {
  fromId: string;
  fromType: ExplorerNodeType;
  toId: string;
  toType: ExplorerNodeType;
  relationship: 'contains' | 'uses' | 'attached_to' | 'filed_in' | 'linked';
  label: string;
}

export interface DependencyGraph {
  upstream: ExplorerNode[];
  downstream: ExplorerNode[];
  whereUsed: ExplorerNode[];
  edges: DependencyEdge[];
}

export interface ImpactResult {
  node: ExplorerNode;
  impactedProducts: ExplorerNode[];
  impactedCoverages: ExplorerNode[];
  impactedStates: ExplorerNode[];
  impactedForms: ExplorerNode[];
  totalImpacted: number;
}

// ════════════════════════════════════════════════════════════════════════
// Node loaders
// ════════════════════════════════════════════════════════════════════════

export async function loadProducts(orgId: string): Promise<ExplorerNode[]> {
  const snap = await getDocs(collection(db, `orgs/${orgId}/products`));
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      type: 'product' as const,
      name: data.name || d.id,
      meta: { category: data.category, status: data.status, coverageCount: data.coverageCount },
    };
  });
}

export async function loadCoverages(orgId: string, productId: string): Promise<ExplorerNode[]> {
  const snap = await getDocs(collection(db, `orgs/${orgId}/products/${productId}/coverages`));
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      type: 'coverage' as const,
      name: data.name || d.id,
      parentId: productId,
      meta: {
        coverageKind: data.coverageKind || 'coverage',
        isOptional: data.isOptional,
        parentCoverageId: data.parentCoverageId,
      },
    };
  });
}

export async function loadForms(orgId: string): Promise<ExplorerNode[]> {
  const snap = await getDocs(collection(db, `orgs/${orgId}/forms`));
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      type: 'form' as const,
      name: data.title || data.formName || d.id,
      versionCount: data.versionCount || 0,
      meta: { formNumber: data.formNumber, type: data.type, isoOrManuscript: data.isoOrManuscript },
    };
  });
}

export async function loadRatePrograms(orgId: string): Promise<ExplorerNode[]> {
  const snap = await getDocs(collection(db, `orgs/${orgId}/ratePrograms`));
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      type: 'rateProgram' as const,
      name: data.name || d.id,
      meta: { lineOfBusiness: data.lineOfBusiness },
    };
  });
}

export async function loadRules(orgId: string, productId: string): Promise<ExplorerNode[]> {
  const snap = await getDocs(collection(db, `orgs/${orgId}/products/${productId}/rules`));
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      type: 'rule' as const,
      name: data.name || d.id,
      parentId: productId,
      meta: { ruleType: data.ruleType, status: data.status },
    };
  });
}

export async function loadStatePrograms(
  orgId: string,
  productId: string,
  versionId: string,
): Promise<ExplorerNode[]> {
  const snap = await getDocs(
    collection(db, `orgs/${orgId}/products/${productId}/versions/${versionId}/statePrograms`),
  );
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      type: 'stateProgram' as const,
      name: `${d.id} – ${data.stateName || d.id}`,
      parentId: productId,
      meta: { stateCode: d.id, status: data.status, filingStatus: data.filingStatus },
    };
  });
}

export async function loadFormUses(orgId: string, formId: string): Promise<ExplorerNode[]> {
  const snap = await getDocs(
    query(collection(db, `orgs/${orgId}/formUses`), where('formId', '==', formId)),
  );
  const nodes: ExplorerNode[] = [];
  for (const d of snap.docs) {
    const data = d.data();
    nodes.push({
      id: d.id,
      type: 'coverage' as const,
      name: data.coverageName || data.coverageId || d.id,
      parentId: data.productId,
      parentName: data.productName,
      meta: { formUseType: data.useType, productId: data.productId, coverageId: data.coverageId },
    });
  }
  return nodes;
}

// ════════════════════════════════════════════════════════════════════════
// Dependency graph traversal
// ════════════════════════════════════════════════════════════════════════

export async function getDependencyGraph(
  orgId: string,
  node: ExplorerNode,
  productVersionId?: string,
): Promise<DependencyGraph> {
  const upstream: ExplorerNode[] = [];
  const downstream: ExplorerNode[] = [];
  const whereUsed: ExplorerNode[] = [];
  const edges: DependencyEdge[] = [];

  switch (node.type) {
    case 'product': {
      // Downstream: coverages, rules, rate programs, state programs
      const covs = await loadCoverages(orgId, node.id);
      downstream.push(...covs);
      covs.forEach(c => edges.push({
        fromId: node.id, fromType: 'product', toId: c.id, toType: 'coverage',
        relationship: 'contains', label: 'contains',
      }));

      const rules = await loadRules(orgId, node.id);
      downstream.push(...rules);
      rules.forEach(r => edges.push({
        fromId: node.id, fromType: 'product', toId: r.id, toType: 'rule',
        relationship: 'contains', label: 'has rule',
      }));

      if (productVersionId) {
        const states = await loadStatePrograms(orgId, node.id, productVersionId);
        downstream.push(...states);
        states.forEach(s => edges.push({
          fromId: node.id, fromType: 'product', toId: s.id, toType: 'stateProgram',
          relationship: 'filed_in', label: 'filed in',
        }));
      }
      break;
    }

    case 'coverage': {
      // Upstream: product
      if (node.parentId) {
        const prodSnap = await getDoc(doc(db, `orgs/${orgId}/products/${node.parentId}`));
        if (prodSnap.exists()) {
          const pData = prodSnap.data();
          const prodNode: ExplorerNode = {
            id: prodSnap.id, type: 'product', name: pData.name || prodSnap.id,
            meta: { category: pData.category },
          };
          upstream.push(prodNode);
          edges.push({
            fromId: prodNode.id, fromType: 'product', toId: node.id, toType: 'coverage',
            relationship: 'contains', label: 'contains',
          });
        }
      }
      break;
    }

    case 'form': {
      // Where-used: coverages that use this form (via formUses)
      const uses = await loadFormUses(orgId, node.id);
      whereUsed.push(...uses);
      uses.forEach(u => edges.push({
        fromId: node.id, fromType: 'form', toId: u.id, toType: 'coverage',
        relationship: 'uses', label: 'used by',
      }));
      break;
    }

    case 'rateProgram': {
      // Rate programs are org-level; where-used would be products that reference them
      break;
    }

    case 'stateProgram': {
      // Upstream: product
      if (node.parentId) {
        const prodSnap = await getDoc(doc(db, `orgs/${orgId}/products/${node.parentId}`));
        if (prodSnap.exists()) {
          const pData = prodSnap.data();
          upstream.push({
            id: prodSnap.id, type: 'product', name: pData.name || prodSnap.id,
            meta: { category: pData.category },
          });
        }
      }
      break;
    }
  }

  return { upstream, downstream, whereUsed, edges };
}

// ════════════════════════════════════════════════════════════════════════
// Impact analysis
// ════════════════════════════════════════════════════════════════════════

export async function computeImpact(
  orgId: string,
  node: ExplorerNode,
  allProducts: ExplorerNode[],
): Promise<ImpactResult> {
  const impactedProducts: ExplorerNode[] = [];
  const impactedCoverages: ExplorerNode[] = [];
  const impactedStates: ExplorerNode[] = [];
  const impactedForms: ExplorerNode[] = [];

  if (node.type === 'form') {
    // From a form, find every coverage/product/state impacted
    const uses = await loadFormUses(orgId, node.id);

    // Collect unique product IDs
    const productIds = new Set<string>();
    uses.forEach(u => {
      if (u.meta.productId) productIds.add(u.meta.productId as string);
      impactedCoverages.push(u);
    });

    // Resolve product names
    for (const pid of productIds) {
      const prod = allProducts.find(p => p.id === pid);
      if (prod) impactedProducts.push(prod);
    }

    // For each impacted product, load its state programs (latest version)
    for (const prod of impactedProducts) {
      try {
        const versionsSnap = await getDocs(
          query(collection(db, `orgs/${orgId}/products/${prod.id}/versions`), orderBy('versionNumber', 'desc')),
        );
        if (!versionsSnap.empty) {
          const latestVersionId = versionsSnap.docs[0].id;
          const states = await loadStatePrograms(orgId, prod.id, latestVersionId);
          impactedStates.push(...states);
        }
      } catch {
        // version collection may not exist
      }
    }
  } else if (node.type === 'coverage') {
    // From a coverage, find the product and sibling states
    if (node.parentId) {
      const prod = allProducts.find(p => p.id === node.parentId);
      if (prod) impactedProducts.push(prod);
    }
  } else if (node.type === 'product') {
    impactedProducts.push(node);
  }

  return {
    node,
    impactedProducts,
    impactedCoverages,
    impactedStates,
    impactedForms,
    totalImpacted: impactedProducts.length + impactedCoverages.length + impactedStates.length + impactedForms.length,
  };
}
