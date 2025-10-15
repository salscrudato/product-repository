/**
 * Migration Script: Convert String Arrays to Structured Limits/Deductibles
 * 
 * This script migrates existing coverage limits and deductibles from simple string arrays
 * to structured subcollections with proper types and metadata.
 * 
 * Usage:
 *   npx ts-node scripts/migrateLimitsDeductibles.ts
 * 
 * Safety Features:
 * - Dry run mode available
 * - Progress logging
 * - Validation checks
 * - Rollback script available
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore';

// Firebase configuration (update with your config)
const firebaseConfig = {
  // Add your Firebase config here
  // This should match your src/firebase.ts configuration
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface MigrationStats {
  productsProcessed: number;
  coveragesProcessed: number;
  limitsCreated: number;
  deductiblesCreated: number;
  errors: string[];
}

const stats: MigrationStats = {
  productsProcessed: 0,
  coveragesProcessed: 0,
  limitsCreated: 0,
  deductiblesCreated: 0,
  errors: [],
};

/**
 * Parse a dollar amount string to a number
 * Examples: '$100,000' -> 100000, '$1,000' -> 1000
 */
function parseDollarAmount(value: string): number {
  const cleaned = value.replace(/[$,]/g, '');
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : amount;
}

/**
 * Migrate limits for a single coverage
 */
async function migrateCoverageLimits(
  productId: string,
  coverageId: string,
  limits: string[],
  dryRun: boolean = false
): Promise<number> {
  if (!limits || limits.length === 0) {
    return 0;
  }

  let created = 0;

  for (let i = 0; i < limits.length; i++) {
    const limitValue = limits[i];
    const amount = parseDollarAmount(limitValue);

    const limitData = {
      coverageId,
      productId,
      limitType: 'perOccurrence' as const, // Default to per occurrence
      amount,
      displayValue: limitValue,
      isDefault: i === 0, // First limit is default
      isRequired: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    if (!dryRun) {
      try {
        await addDoc(
          collection(db, `products/${productId}/coverages/${coverageId}/limits`),
          limitData
        );
        created++;
      } catch (error: any) {
        stats.errors.push(
          `Error creating limit for coverage ${coverageId}: ${error.message}`
        );
      }
    } else {
      console.log(`  [DRY RUN] Would create limit:`, limitData);
      created++;
    }
  }

  return created;
}

/**
 * Migrate deductibles for a single coverage
 */
async function migrateCoverageDeductibles(
  productId: string,
  coverageId: string,
  deductibles: string[],
  dryRun: boolean = false
): Promise<number> {
  if (!deductibles || deductibles.length === 0) {
    return 0;
  }

  let created = 0;

  for (let i = 0; i < deductibles.length; i++) {
    const deductibleValue = deductibles[i];
    
    // Determine if it's a percentage or flat amount
    const isPercentage = deductibleValue.includes('%');
    const amount = isPercentage ? 0 : parseDollarAmount(deductibleValue);
    const percentage = isPercentage ? parseFloat(deductibleValue.replace('%', '')) : undefined;

    const deductibleData = {
      coverageId,
      productId,
      deductibleType: isPercentage ? ('percentage' as const) : ('flat' as const),
      amount: isPercentage ? undefined : amount,
      percentage,
      displayValue: deductibleValue,
      isDefault: i === 0, // First deductible is default
      isRequired: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    if (!dryRun) {
      try {
        await addDoc(
          collection(db, `products/${productId}/coverages/${coverageId}/deductibles`),
          deductibleData
        );
        created++;
      } catch (error: any) {
        stats.errors.push(
          `Error creating deductible for coverage ${coverageId}: ${error.message}`
        );
      }
    } else {
      console.log(`  [DRY RUN] Would create deductible:`, deductibleData);
      created++;
    }
  }

  return created;
}

/**
 * Migrate all coverages for a product
 */
async function migrateProduct(productId: string, dryRun: boolean = false): Promise<void> {
  console.log(`\nProcessing product: ${productId}`);

  const coveragesRef = collection(db, `products/${productId}/coverages`);
  const coveragesSnap = await getDocs(coveragesRef);

  for (const coverageDoc of coveragesSnap.docs) {
    const coverageId = coverageDoc.id;
    const coverageData = coverageDoc.data();

    console.log(`  Processing coverage: ${coverageData.name || coverageId}`);

    // Migrate limits
    if (coverageData.limits && Array.isArray(coverageData.limits)) {
      const limitsCreated = await migrateCoverageLimits(
        productId,
        coverageId,
        coverageData.limits,
        dryRun
      );
      stats.limitsCreated += limitsCreated;
      console.log(`    Created ${limitsCreated} limits`);
    }

    // Migrate deductibles
    if (coverageData.deductibles && Array.isArray(coverageData.deductibles)) {
      const deductiblesCreated = await migrateCoverageDeductibles(
        productId,
        coverageId,
        coverageData.deductibles,
        dryRun
      );
      stats.deductiblesCreated += deductiblesCreated;
      console.log(`    Created ${deductiblesCreated} deductibles`);
    }

    stats.coveragesProcessed++;
  }

  stats.productsProcessed++;
}

/**
 * Main migration function
 */
async function runMigration(dryRun: boolean = false): Promise<void> {
  console.log('='.repeat(60));
  console.log('Coverage Limits & Deductibles Migration');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  console.log('');

  try {
    // Get all products
    const productsSnap = await getDocs(collection(db, 'products'));
    console.log(`Found ${productsSnap.docs.length} products to process\n`);

    // Process each product
    for (const productDoc of productsSnap.docs) {
      await migrateProduct(productDoc.id, dryRun);
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('Migration Summary');
    console.log('='.repeat(60));
    console.log(`Products processed: ${stats.productsProcessed}`);
    console.log(`Coverages processed: ${stats.coveragesProcessed}`);
    console.log(`Limits created: ${stats.limitsCreated}`);
    console.log(`Deductibles created: ${stats.deductiblesCreated}`);
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
      console.log('Run without --dry-run flag to perform actual migration');
    } else {
      console.log('MIGRATION COMPLETE');
    }
    
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('Fatal error during migration:', error);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Run migration
runMigration(dryRun)
  .then(() => {
    console.log('\nMigration script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration script failed:', error);
    process.exit(1);
  });

