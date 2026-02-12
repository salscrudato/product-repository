/**
 * Product Repository
 * Typed repository for Product documents
 */

import { query, where, orderBy, QueryConstraint } from 'firebase/firestore';
import { BaseRepository } from './baseRepository';
import { ProductSchema, ValidatedProduct } from '../schemas';
import { COLLECTIONS } from './paths';

/**
 * Normalizer for legacy product fields
 */
function normalizeProduct(data: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...data };
  
  // Normalize status field
  if (normalized.status === undefined) {
    normalized.status = 'active';
  }
  
  // Normalize archived field
  if (normalized.archived === undefined) {
    normalized.archived = false;
  }
  
  // Normalize states array
  if (!Array.isArray(normalized.states)) {
    normalized.states = [];
  }
  
  // Ensure counts are numbers
  if (typeof normalized.coverageCount !== 'number') {
    normalized.coverageCount = 0;
  }
  if (typeof normalized.formCount !== 'number') {
    normalized.formCount = 0;
  }
  if (typeof normalized.ruleCount !== 'number') {
    normalized.ruleCount = 0;
  }
  
  return normalized;
}

class ProductRepositoryClass extends BaseRepository<ValidatedProduct> {
  constructor() {
    super(COLLECTIONS.PRODUCTS, ProductSchema, normalizeProduct);
  }

  /**
   * Get all active products
   */
  async getActiveProducts(): Promise<ValidatedProduct[]> {
    return this.getAll([
      where('archived', '!=', true),
      orderBy('archived'),
      orderBy('name'),
    ]);
  }

  /**
   * Get products by status
   */
  async getByStatus(status: 'active' | 'inactive' | 'draft'): Promise<ValidatedProduct[]> {
    return this.getAll([
      where('status', '==', status),
      orderBy('name'),
    ]);
  }

  /**
   * Search products by name
   */
  async searchByName(searchTerm: string): Promise<ValidatedProduct[]> {
    // Firestore doesn't support full-text search, so we get all and filter
    const products = await this.getActiveProducts();
    const lowerSearch = searchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerSearch) ||
      p.productCode?.toLowerCase().includes(lowerSearch)
    );
  }
}

// Export singleton instance
export const ProductRepository = new ProductRepositoryClass();

