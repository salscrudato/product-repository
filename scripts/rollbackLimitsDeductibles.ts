/**
 * Rollback Script: Remove Structured Limits/Deductibles Subcollections
 * 
 * This script removes all limits and deductibles from subcollections,
 * allowing you to rollback the migration if needed.
 * 
 * Usage:
 *   npx ts-node scripts/rollbackLimitsDeductibles.ts
 * 
 * WARNING: This will delete all data in limits and deductibles subcollections!
 * Use with caution and only if you need to rollback the migration.
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  deleteDoc,
  doc
} from 'firebase/firestore';

// Firebase configuration (update with your config)
const firebaseConfig = {
  // Add your Firebase config here
  // This should match your src/firebase.ts configuration
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface RollbackStats {
  productsProcessed: number;
  coveragesProcessed: number;
  limitsDeleted: number;
  deductiblesDeleted: number;
  errors: string[];
}

const stats: RollbackStats = {
  productsProcessed: 0,
  coveragesProcessed: 0,
  limitsDeleted: 0,
  deductiblesDeleted: 0,
  errors: [],
};

/**
 * Delete all limits for a coverage
 */
async function deleteCoverageLimits(
  productId: string,
  coverageId: string,
  dryRun: boolean = false
): Promise<number> {
  const limitsRef = collection(
    db,
    `products/${productId}/coverages/${coverageId}/limits`
  );
  
  const limitsSnap = await getDocs(limitsRef);
  let deleted = 0;

  for (const limitDoc of limitsSnap.docs) {
    if (!dryRun) {
      try {
        await deleteDoc(limitDoc.ref);
        deleted++;
      } catch (error: any) {
        stats.errors.push(
          `Error deleting limit ${limitDoc.id}: ${error.message}`
        );
      }
    } else {
      console.log(`  [DRY RUN] Would delete limit: ${limitDoc.id}`);
      deleted++;
    }
  }

  return deleted;
}

/**
 * Delete all deductibles for a coverage
 */
async function deleteCoverageDeductibles(
  productId: string,
  coverageId: string,
  dryRun: boolean = false
): Promise<number> {
  const deductiblesRef = collection(
    db,
    `products/${productId}/coverages/${coverageId}/deductibles`
  );
  
  const deductiblesSnap = await getDocs(deductiblesRef);
  let deleted = 0;

  for (const deductibleDoc of deductiblesSnap.docs) {
    if (!dryRun) {
      try {
        await deleteDoc(deductibleDoc.ref);
        deleted++;
      } catch (error: any) {
        stats.errors.push(
          `Error deleting deductible ${deductibleDoc.id}: ${error.message}`
        );
      }
    } else {
      console.log(`  [DRY RUN] Would delete deductible: ${deductibleDoc.id}`);
      deleted++;
    }
  }

  return deleted;
}

/**
 * Rollback all coverages for a product
 */
async function rollbackProduct(productId: string, dryRun: boolean = false): Promise<void> {
  console.log(`\nProcessing product: ${productId}`);

  const coveragesRef = collection(db, `products/${productId}/coverages`);
  const coveragesSnap = await getDocs(coveragesRef);

  for (const coverageDoc of coveragesSnap.docs) {
    const coverageId = coverageDoc.id;
    const coverageData = coverageDoc.data();

    console.log(`  Processing coverage: ${coverageData.name || coverageId}`);

    // Delete limits
    const limitsDeleted = await deleteCoverageLimits(productId, coverageId, dryRun);
    stats.limitsDeleted += limitsDeleted;
    if (limitsDeleted > 0) {
      console.log(`    Deleted ${limitsDeleted} limits`);
    }

    // Delete deductibles
    const deductiblesDeleted = await deleteCoverageDeductibles(productId, coverageId, dryRun);
    stats.deductiblesDeleted += deductiblesDeleted;
    if (deductiblesDeleted > 0) {
      console.log(`    Deleted ${deductiblesDeleted} deductibles`);
    }

    stats.coveragesProcessed++;
  }

  stats.productsProcessed++;
}

/**
 * Main rollback function
 */
async function runRollback(dryRun: boolean = false): Promise<void> {
  console.log('='.repeat(60));
  console.log('Coverage Limits & Deductibles Rollback');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  
  if (!dryRun) {
    console.log('\n⚠️  WARNING: This will DELETE all limits and deductibles!');
    console.log('⚠️  Original string arrays in coverage documents will remain.');
    console.log('');
  }

  try {
    // Get all products
    const productsSnap = await getDocs(collection(db, 'products'));
    console.log(`Found ${productsSnap.docs.length} products to process\n`);

    // Process each product
    for (const productDoc of productsSnap.docs) {
      await rollbackProduct(productDoc.id, dryRun);
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('Rollback Summary');
    console.log('='.repeat(60));
    console.log(`Products processed: ${stats.productsProcessed}`);
    console.log(`Coverages processed: ${stats.coveragesProcessed}`);
    console.log(`Limits deleted: ${stats.limitsDeleted}`);
    console.log(`Deductibles deleted: ${stats.deductiblesDeleted}`);
    console.log(`Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\nErrors encountered:');
      stats.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    
    if (dryRun) {
      console.log('DRY RUN COMPLETE - No changes were made');
      console.log('Run without --dry-run flag to perform actual rollback');
    } else {
      console.log('ROLLBACK COMPLETE');
    }
    
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('Fatal error during rollback:', error);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Confirm before running live rollback
if (!dryRun) {
  console.log('\n⚠️  WARNING: You are about to DELETE all limits and deductibles subcollections!');
  console.log('⚠️  This action cannot be undone!');
  console.log('\nTo proceed, run: npx ts-node scripts/rollbackLimitsDeductibles.ts --confirm');
  console.log('To test first, run: npx ts-node scripts/rollbackLimitsDeductibles.ts --dry-run\n');
  
  if (!args.includes('--confirm')) {
    console.log('Rollback cancelled. Add --confirm flag to proceed.');
    process.exit(0);
  }
}

// Run rollback
runRollback(dryRun)
  .then(() => {
    console.log('\nRollback script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nRollback script failed:', error);
    process.exit(1);
  });

