/**
 * Utilities Index
 * Centralized exports for all utility modules
 * 
 * Organization:
 * - core/: System utilities (logging, timeouts, PDF processing)
 * - data/: Data manipulation (Firestore, storage, cloning, versioning)
 * - ui/: UI utilities (performance, markdown, state guards)
 * - validation/: Validation logic (moved to services/validationService)
 */

// Core utilities
export * from './core';

// Data utilities
export * from './data';

// UI utilities
export * from './ui';
