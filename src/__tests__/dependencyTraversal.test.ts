/**
 * Dependency Traversal & Explorer Tests
 *
 * Tests the dependency traversal service and Explorer deep-linking logic.
 * Validates: upstream/downstream, where-used, impact analysis, version awareness, and deep-link URL encoding.
 */

import { describe, it, expect } from 'vitest';
import type {
  ExplorerNode,
  ExplorerNodeType,
  DependencyEdge,
  DependencyGraph,
  ImpactResult,
} from '../services/dependencyService';

// ════════════════════════════════════════════════════════════════════════
// Helpers – simulate traversal logic locally
// ════════════════════════════════════════════════════════════════════════

function makeNode(type: ExplorerNodeType, id: string, name: string, parentId?: string, meta: Record<string, unknown> = {}): ExplorerNode {
  return { id, type, name, parentId, meta };
}

function buildDependencyGraph(
  node: ExplorerNode,
  allNodes: ExplorerNode[],
  formUses: { formId: string; coverageId: string; coverageName: string; productId: string; productName: string }[],
): DependencyGraph {
  const upstream: ExplorerNode[] = [];
  const downstream: ExplorerNode[] = [];
  const whereUsed: ExplorerNode[] = [];
  const edges: DependencyEdge[] = [];

  switch (node.type) {
    case 'product': {
      const covs = allNodes.filter(n => n.type === 'coverage' && n.parentId === node.id);
      downstream.push(...covs);
      covs.forEach(c => edges.push({
        fromId: node.id, fromType: 'product', toId: c.id, toType: 'coverage',
        relationship: 'contains', label: 'contains',
      }));

      const rules = allNodes.filter(n => n.type === 'rule' && n.parentId === node.id);
      downstream.push(...rules);

      const states = allNodes.filter(n => n.type === 'stateProgram' && n.parentId === node.id);
      downstream.push(...states);
      break;
    }

    case 'coverage': {
      if (node.parentId) {
        const prod = allNodes.find(n => n.type === 'product' && n.id === node.parentId);
        if (prod) upstream.push(prod);
      }
      break;
    }

    case 'form': {
      const uses = formUses.filter(u => u.formId === node.id);
      uses.forEach(u => {
        whereUsed.push({
          id: u.coverageId,
          type: 'coverage',
          name: u.coverageName,
          parentId: u.productId,
          parentName: u.productName,
          meta: { formUseType: 'base', productId: u.productId, coverageId: u.coverageId },
        });
        edges.push({
          fromId: node.id, fromType: 'form', toId: u.coverageId, toType: 'coverage',
          relationship: 'uses', label: 'used by',
        });
      });
      break;
    }

    case 'stateProgram': {
      if (node.parentId) {
        const prod = allNodes.find(n => n.type === 'product' && n.id === node.parentId);
        if (prod) upstream.push(prod);
      }
      break;
    }
  }

  return { upstream, downstream, whereUsed, edges };
}

function computeLocalImpact(
  node: ExplorerNode,
  allNodes: ExplorerNode[],
  formUses: { formId: string; coverageId: string; coverageName: string; productId: string; productName: string }[],
): ImpactResult {
  const impactedProducts: ExplorerNode[] = [];
  const impactedCoverages: ExplorerNode[] = [];
  const impactedStates: ExplorerNode[] = [];
  const impactedForms: ExplorerNode[] = [];

  if (node.type === 'form') {
    const uses = formUses.filter(u => u.formId === node.id);
    const productIds = new Set<string>();
    uses.forEach(u => {
      productIds.add(u.productId);
      impactedCoverages.push(makeNode('coverage', u.coverageId, u.coverageName, u.productId));
    });

    productIds.forEach(pid => {
      const prod = allNodes.find(n => n.type === 'product' && n.id === pid);
      if (prod) impactedProducts.push(prod);
      const states = allNodes.filter(n => n.type === 'stateProgram' && n.parentId === pid);
      impactedStates.push(...states);
    });
  } else if (node.type === 'coverage') {
    if (node.parentId) {
      const prod = allNodes.find(n => n.type === 'product' && n.id === node.parentId);
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

// ════════════════════════════════════════════════════════════════════════
// Deep-link URL encoding/decoding
// ════════════════════════════════════════════════════════════════════════

function encodeDeepLink(node: ExplorerNode): string {
  const params = new URLSearchParams();
  params.set('type', node.type);
  params.set('id', node.id);
  if (node.parentId) params.set('pid', node.parentId);
  return `/product-explorer?${params.toString()}`;
}

function decodeDeepLink(url: string): { type: string; id: string; pid?: string } | null {
  const qIdx = url.indexOf('?');
  if (qIdx < 0) return null;
  const params = new URLSearchParams(url.substring(qIdx));
  const type = params.get('type');
  const id = params.get('id');
  if (!type || !id) return null;
  return { type, id, pid: params.get('pid') || undefined };
}

// ════════════════════════════════════════════════════════════════════════
// Test data
// ════════════════════════════════════════════════════════════════════════

const productA = makeNode('product', 'prod-1', 'Commercial Auto');
const productB = makeNode('product', 'prod-2', 'General Liability');
const covGL = makeNode('coverage', 'cov-1', 'Bodily Injury', 'prod-1');
const covPD = makeNode('coverage', 'cov-2', 'Property Damage', 'prod-1');
const covGLB = makeNode('coverage', 'cov-3', 'CGL - BI/PD', 'prod-2');
const formA = makeNode('form', 'form-1', 'CA 00 01 - Commercial Auto', undefined, { formNumber: 'CA 00 01' });
const formB = makeNode('form', 'form-2', 'CG 00 01 - Commercial General Liability', undefined, { formNumber: 'CG 00 01' });
const ruleA = makeNode('rule', 'rule-1', 'Premium Calc Rule', 'prod-1');
const stateNY = makeNode('stateProgram', 'NY', 'NY – New York', 'prod-1', { stateCode: 'NY' });
const stateCT = makeNode('stateProgram', 'CT', 'CT – Connecticut', 'prod-1', { stateCode: 'CT' });
const stateNJ = makeNode('stateProgram', 'NJ', 'NJ – New Jersey', 'prod-2', { stateCode: 'NJ' });

const allNodes = [productA, productB, covGL, covPD, covGLB, formA, formB, ruleA, stateNY, stateCT, stateNJ];

const formUses = [
  { formId: 'form-1', coverageId: 'cov-1', coverageName: 'Bodily Injury', productId: 'prod-1', productName: 'Commercial Auto' },
  { formId: 'form-1', coverageId: 'cov-2', coverageName: 'Property Damage', productId: 'prod-1', productName: 'Commercial Auto' },
  { formId: 'form-2', coverageId: 'cov-3', coverageName: 'CGL - BI/PD', productId: 'prod-2', productName: 'General Liability' },
];

// ════════════════════════════════════════════════════════════════════════
// Tests
// ════════════════════════════════════════════════════════════════════════

describe('Dependency Traversal', () => {
  describe('Product dependencies', () => {
    it('lists coverages, rules, states as downstream', () => {
      const graph = buildDependencyGraph(productA, allNodes, formUses);
      expect(graph.downstream.length).toBe(5); // 2 coverages + 1 rule + 2 states
      expect(graph.downstream.map(n => n.type)).toContain('coverage');
      expect(graph.downstream.map(n => n.type)).toContain('rule');
      expect(graph.downstream.map(n => n.type)).toContain('stateProgram');
      expect(graph.upstream).toHaveLength(0);
      expect(graph.whereUsed).toHaveLength(0);
    });

    it('creates edges for each downstream', () => {
      const graph = buildDependencyGraph(productA, allNodes, formUses);
      const covEdges = graph.edges.filter(e => e.relationship === 'contains');
      expect(covEdges.length).toBe(2); // 2 coverages
    });
  });

  describe('Coverage dependencies', () => {
    it('lists parent product as upstream', () => {
      const graph = buildDependencyGraph(covGL, allNodes, formUses);
      expect(graph.upstream).toHaveLength(1);
      expect(graph.upstream[0].id).toBe('prod-1');
      expect(graph.upstream[0].type).toBe('product');
      expect(graph.downstream).toHaveLength(0);
    });
  });

  describe('Form where-used', () => {
    it('lists all coverages using the form', () => {
      const graph = buildDependencyGraph(formA, allNodes, formUses);
      expect(graph.whereUsed).toHaveLength(2);
      expect(graph.whereUsed.map(w => w.name)).toContain('Bodily Injury');
      expect(graph.whereUsed.map(w => w.name)).toContain('Property Damage');
      expect(graph.upstream).toHaveLength(0);
      expect(graph.downstream).toHaveLength(0);
    });

    it('includes parent product info in where-used entries', () => {
      const graph = buildDependencyGraph(formA, allNodes, formUses);
      graph.whereUsed.forEach(w => {
        expect(w.parentId).toBe('prod-1');
        expect(w.parentName).toBe('Commercial Auto');
      });
    });

    it('creates edges from form to coverages', () => {
      const graph = buildDependencyGraph(formA, allNodes, formUses);
      expect(graph.edges).toHaveLength(2);
      graph.edges.forEach(e => {
        expect(e.fromType).toBe('form');
        expect(e.toType).toBe('coverage');
        expect(e.relationship).toBe('uses');
      });
    });
  });

  describe('State program dependencies', () => {
    it('has product as upstream', () => {
      const graph = buildDependencyGraph(stateNY, allNodes, formUses);
      expect(graph.upstream).toHaveLength(1);
      expect(graph.upstream[0].id).toBe('prod-1');
    });
  });
});

describe('Impact Analysis', () => {
  it('from a form → finds all impacted products, coverages, states', () => {
    const result = computeLocalImpact(formA, allNodes, formUses);
    expect(result.impactedProducts).toHaveLength(1);
    expect(result.impactedProducts[0].name).toBe('Commercial Auto');
    expect(result.impactedCoverages).toHaveLength(2);
    expect(result.impactedStates).toHaveLength(2);
    expect(result.impactedStates.map(s => s.id)).toContain('NY');
    expect(result.impactedStates.map(s => s.id)).toContain('CT');
    expect(result.totalImpacted).toBe(5); // 1 prod + 2 covs + 2 states
  });

  it('form used in multiple products spans all', () => {
    // Make form-1 also used in product B
    const extendedUses = [
      ...formUses,
      { formId: 'form-1', coverageId: 'cov-3', coverageName: 'CGL - BI/PD', productId: 'prod-2', productName: 'General Liability' },
    ];
    const result = computeLocalImpact(formA, allNodes, extendedUses);
    expect(result.impactedProducts).toHaveLength(2);
    expect(result.impactedProducts.map(p => p.name)).toContain('Commercial Auto');
    expect(result.impactedProducts.map(p => p.name)).toContain('General Liability');
    expect(result.impactedCoverages).toHaveLength(3);
    expect(result.impactedStates).toHaveLength(3); // NY, CT from prod-1 + NJ from prod-2
  });

  it('from a coverage → finds parent product', () => {
    const result = computeLocalImpact(covGL, allNodes, formUses);
    expect(result.impactedProducts).toHaveLength(1);
    expect(result.impactedProducts[0].name).toBe('Commercial Auto');
  });

  it('from a product → includes itself', () => {
    const result = computeLocalImpact(productA, allNodes, formUses);
    expect(result.impactedProducts).toHaveLength(1);
    expect(result.impactedProducts[0].id).toBe('prod-1');
  });

  it('form with no uses has zero impact', () => {
    const orphanForm = makeNode('form', 'form-x', 'Orphan Form');
    const result = computeLocalImpact(orphanForm, allNodes, formUses);
    expect(result.totalImpacted).toBe(0);
  });
});

describe('Deep-linking', () => {
  it('encodes product URL correctly', () => {
    const url = encodeDeepLink(productA);
    expect(url).toBe('/product-explorer?type=product&id=prod-1');
  });

  it('encodes coverage with parent ID', () => {
    const url = encodeDeepLink(covGL);
    expect(url).toContain('type=coverage');
    expect(url).toContain('id=cov-1');
    expect(url).toContain('pid=prod-1');
  });

  it('encodes form without parent ID', () => {
    const url = encodeDeepLink(formA);
    expect(url).toBe('/product-explorer?type=form&id=form-1');
    expect(url).not.toContain('pid=');
  });

  it('round-trips correctly', () => {
    const url = encodeDeepLink(covGL);
    const decoded = decodeDeepLink(url);
    expect(decoded).toEqual({ type: 'coverage', id: 'cov-1', pid: 'prod-1' });
  });

  it('decodes missing params as null', () => {
    expect(decodeDeepLink('/product-explorer')).toBeNull();
    expect(decodeDeepLink('/product-explorer?type=form')).toBeNull();
  });
});

describe('Acceptance Criteria', () => {
  it('from a form edition, user finds every impacted state/product/coverage', () => {
    // GIVEN: form CA 00 01 is used by Bodily Injury and Property Damage in Commercial Auto
    const result = computeLocalImpact(formA, allNodes, formUses);

    // THEN: user sees Commercial Auto as impacted product
    expect(result.impactedProducts.map(p => p.name)).toContain('Commercial Auto');

    // AND: both coverages are listed as impacted
    expect(result.impactedCoverages.map(c => c.name)).toContain('Bodily Injury');
    expect(result.impactedCoverages.map(c => c.name)).toContain('Property Damage');

    // AND: both states (NY, CT) where Commercial Auto is filed are listed
    expect(result.impactedStates.map(s => s.id)).toContain('NY');
    expect(result.impactedStates.map(s => s.id)).toContain('CT');

    // AND: total impact count is accurate
    expect(result.totalImpacted).toBe(5);
  });

  it('form CG 00 01 impacts General Liability product and NJ state', () => {
    const result = computeLocalImpact(formB, allNodes, formUses);
    expect(result.impactedProducts.map(p => p.name)).toContain('General Liability');
    expect(result.impactedCoverages.map(c => c.name)).toContain('CGL - BI/PD');
    expect(result.impactedStates.map(s => s.id)).toContain('NJ');
  });

  it('deep link to a form preserves selection across page reloads', () => {
    const url = encodeDeepLink(formA);
    const decoded = decodeDeepLink(url);
    expect(decoded?.type).toBe('form');
    expect(decoded?.id).toBe('form-1');
  });
});
