# Coverage Limits & Deductibles Migration Guide

**Version:** 1.0  
**Date:** 2025-10-15  
**Status:** Ready for Execution

---

## Overview

This guide provides step-by-step instructions for migrating coverage limits and deductibles from simple string arrays to structured subcollections.

### What This Migration Does

**Before:**
```typescript
coverage: {
  limits: ['$100,000', '$250,000', '$500,000'],
  deductibles: ['$1,000', '$2,500', '$5,000']
}
```

**After:**
```typescript
coverage: {
  limits: ['$100,000', '$250,000', '$500,000'],  // Kept for backward compatibility
  deductibles: ['$1,000', '$2,500', '$5,000']    // Kept for backward compatibility
}

// NEW: Structured subcollections
products/{productId}/coverages/{coverageId}/limits/{limitId}
  - limitType: 'perOccurrence'
  - amount: 100000
  - displayValue: '$100,000'
  - isDefault: true

products/{productId}/coverages/{coverageId}/deductibles/{deductibleId}
  - deductibleType: 'flat'
  - amount: 1000
  - displayValue: '$1,000'
  - isDefault: true
```

---

## Prerequisites

### 1. Backup Your Data

**CRITICAL:** Always backup your Firestore database before running migrations.

```bash
# Using Firebase CLI
firebase firestore:export gs://your-bucket/backups/pre-migration-$(date +%Y%m%d)
```

### 2. Update Firebase Configuration

Edit `scripts/migrateLimitsDeductibles.ts` and add your Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

### 3. Install Dependencies

```bash
npm install
```

---

## Migration Steps

### Step 1: Dry Run (Test Mode)

**Always run in dry-run mode first to see what will happen:**

```bash
npx ts-node scripts/migrateLimitsDeductibles.ts --dry-run
```

**Expected Output:**
```
============================================================
Coverage Limits & Deductibles Migration
============================================================
Mode: DRY RUN (no changes will be made)

Found 3 products to process

Processing product: product-123
  Processing coverage: Building Coverage
    [DRY RUN] Would create limit: { limitType: 'perOccurrence', amount: 100000, ... }
    [DRY RUN] Would create limit: { limitType: 'perOccurrence', amount: 250000, ... }
    Created 2 limits
    [DRY RUN] Would create deductible: { deductibleType: 'flat', amount: 1000, ... }
    Created 1 deductibles

============================================================
Migration Summary
============================================================
Products processed: 3
Coverages processed: 15
Limits created: 45
Deductibles created: 30
Errors: 0

DRY RUN COMPLETE - No changes were made
```

### Step 2: Review Dry Run Results

Check the output for:
- ✅ Correct number of products and coverages
- ✅ Limits and deductibles are being parsed correctly
- ✅ No errors reported
- ✅ Amounts are correct (e.g., '$100,000' → 100000)

### Step 3: Run Live Migration

**Once dry run looks good, run the actual migration:**

```bash
npx ts-node scripts/migrateLimitsDeductibles.ts
```

**Monitor the output for errors.** The migration will:
1. Process each product
2. Process each coverage in the product
3. Create limit documents in subcollections
4. Create deductible documents in subcollections
5. Keep original string arrays intact

### Step 4: Verify Migration

After migration completes, verify the data:

```bash
# Check a sample coverage in Firebase Console
# Navigate to: Firestore > products > {productId} > coverages > {coverageId} > limits

# You should see documents with structure:
# - limitType: 'perOccurrence'
# - amount: 100000
# - displayValue: '$100,000'
# - isDefault: true
# - createdAt: timestamp
# - updatedAt: timestamp
```

### Step 5: Test Application

1. **Start the application:**
   ```bash
   npm start
   ```

2. **Test coverage screens:**
   - Navigate to a product's coverage screen
   - Verify limits and deductibles display correctly
   - Try adding a new limit
   - Try adding a new deductible
   - Verify counts are accurate

3. **Check for errors:**
   - Open browser console
   - Look for any Firestore errors
   - Verify no data loading issues

---

## Rollback Procedure

If something goes wrong, you can rollback the migration:

### Option 1: Delete Subcollections (Keep String Arrays)

```bash
# Dry run first
npx ts-node scripts/rollbackLimitsDeductibles.ts --dry-run

# If dry run looks good, run actual rollback
npx ts-node scripts/rollbackLimitsDeductibles.ts --confirm
```

This will:
- Delete all limits subcollections
- Delete all deductibles subcollections
- Keep original string arrays intact
- Application will fall back to using string arrays

### Option 2: Restore from Backup

```bash
# Using Firebase CLI
firebase firestore:import gs://your-bucket/backups/pre-migration-20251015
```

---

## Dual-Write Period

After migration, the application will use **dual-write** mode:

### What is Dual-Write?

When saving a coverage:
1. ✅ Write to new subcollections (limits, deductibles)
2. ✅ Write to old string arrays (for backward compatibility)

When reading a coverage:
1. ✅ Try to read from new subcollections first
2. ✅ If empty, fall back to old string arrays
3. ✅ Seamless transition for users

### Duration

Keep dual-write mode for **2-4 weeks** to ensure:
- All data has been migrated
- No issues are discovered
- All users have updated to new version

---

## Removing Old Fields (Future)

After dual-write period is complete and you're confident:

### Step 1: Update Code

Remove dual-write logic and old field references:

```typescript
// Remove these from Coverage interface
limits?: string[];  // DELETE
deductibles?: string[];  // DELETE
```

### Step 2: Clean Up Database

Create a cleanup script to remove old fields:

```typescript
// Future cleanup script
await updateDoc(coverageRef, {
  limits: deleteField(),
  deductibles: deleteField()
});
```

### Step 3: Deploy

Deploy the updated code without old field support.

---

## Troubleshooting

### Issue: Migration Script Fails

**Error:** `Cannot find module 'firebase/firestore'`

**Solution:**
```bash
npm install firebase
```

---

### Issue: Permission Denied

**Error:** `Missing or insufficient permissions`

**Solution:**
- Ensure Firebase config is correct
- Check Firestore security rules
- Verify you have admin access

---

### Issue: Amounts Not Parsing Correctly

**Error:** Limits showing as `0` or `NaN`

**Solution:**
- Check the `parseDollarAmount` function
- Verify your limit format (e.g., '$100,000' vs '100000')
- Update parsing logic if needed

---

### Issue: Duplicate Limits Created

**Error:** Multiple limits with same value

**Solution:**
- Run rollback script
- Fix migration script
- Re-run migration

---

## Monitoring

### During Migration

Watch for:
- ✅ Progress logs
- ❌ Error messages
- ⏱️ Performance (should be fast)

### After Migration

Monitor:
- 📊 Firestore read/write operations
- 🐛 Application errors
- 👥 User feedback
- 💰 Firestore costs

---

## Success Criteria

Migration is successful when:

- [x] All products processed without errors
- [x] All coverages have limits subcollections
- [x] All coverages have deductibles subcollections
- [x] Application loads coverage data correctly
- [x] Users can add/edit/delete limits
- [x] Users can add/edit/delete deductibles
- [x] No console errors
- [x] No data loss
- [x] Performance is acceptable

---

## Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| **Preparation** | 1 day | Backup data, update config, test dry run |
| **Migration** | 1 hour | Run live migration, verify results |
| **Testing** | 1-2 days | Thorough testing of all features |
| **Monitoring** | 1 week | Watch for issues, gather feedback |
| **Dual-Write** | 2-4 weeks | Keep both old and new structures |
| **Cleanup** | 1 day | Remove old fields (future) |

---

## Support

If you encounter issues:

1. **Check the logs** - Migration script provides detailed output
2. **Review this guide** - Most issues are covered here
3. **Run rollback** - If needed, rollback and investigate
4. **Check documentation** - Review `COVERAGE_DATA_MODEL_ANALYSIS.md`

---

## Checklist

Before running migration:
- [ ] Backup Firestore database
- [ ] Update Firebase config in migration script
- [ ] Run dry-run mode
- [ ] Review dry-run output
- [ ] Verify no errors in dry-run
- [ ] Schedule maintenance window (optional)

During migration:
- [ ] Run live migration
- [ ] Monitor output for errors
- [ ] Verify completion message

After migration:
- [ ] Verify data in Firebase Console
- [ ] Test application thoroughly
- [ ] Check browser console for errors
- [ ] Monitor Firestore operations
- [ ] Gather user feedback

---

**Ready to migrate? Start with Step 1: Dry Run!** 🚀

