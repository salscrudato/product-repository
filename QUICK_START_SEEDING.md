# Quick Start: Commercial Property Insurance Data Seeding

**Last Updated**: 2025-10-21  
**Status**: ✅ Production Ready

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 22+ installed
- Firebase CLI authenticated (`firebase login`)
- `.firebaserc` configured with project
- Internet connection

### Step 1: Install Dependencies
```bash
cd /Users/salscrudato/Projects/product-repository
npm install firebase-admin --save-dev
```

### Step 2: Run Seeding Script
```bash
node scripts/seedCommercialProperty.js
```

**Expected Output**:
```
🚀 Starting Commercial Property Insurance Product Seeding...
✅ Firebase Admin initialized
📦 Seeding Product...
✅ Product created: commercial-property-2025
[... more output ...]
✅ SEEDING COMPLETE - Summary Report
```

### Step 3: Verify Data
```bash
node scripts/verifySeeding.js
```

**Expected Output**:
```
🔍 Verifying Commercial Property Insurance Product Seeding...
✅ Product found
✅ Found 5 coverages
✅ Found 30 limits across all coverages
[... more output ...]
✅ All verifications PASSED
```

### Step 4: View in Application
```bash
npm run dev
```

Then open http://localhost:3001 in your browser.

---

## 📊 What Gets Seeded

### Product
- **ID**: commercial-property-2025
- **Name**: Commercial Property Insurance
- **Status**: Active
- **Version**: 1
- **States**: 10 (CA, NY, TX, FL, IL, PA, OH, GA, NC, MI)

### Coverages (5)
1. Building Coverage
2. Business Personal Property
3. Business Income Coverage
4. Extra Expense Coverage
5. Property of Others

### Coverage Options
- **Limits**: 6 options per coverage
- **Deductibles**: 5 options per coverage

### Forms (5)
- CP 00 10 10 12 - Building and Personal Property Coverage Form
- CP 00 30 10 12 - Business Income Coverage Form
- CP 10 10 10 12 - Causes of Loss - Broad Form
- CP 10 30 10 12 - Causes of Loss - Special Form
- CP 15 05 10 12 - Agreed Value Optional Coverage

### Rules
- **Pricing Rules**: 5 (base premium, surcharges, discounts)
- **Business Rules**: 5 (eligibility, coverage, compliance)

### Total Records: 111

---

## 🔧 Advanced Usage

### Option 1: Seed Data Only (No PDFs)
```bash
node scripts/seedCommercialProperty.js
```

### Option 2: Generate PDFs Only
```bash
node scripts/generateFormPDFsSimple.js
```

**Output**: PDFs saved to `public/forms/`

### Option 3: Complete Seeding with PDFs
```bash
node scripts/seedWithPDFs.js
```

**Note**: Requires Firebase Storage bucket configured

### Option 4: Verify Existing Data
```bash
node scripts/verifySeeding.js
```

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'firebase-admin'"
**Solution**:
```bash
npm install firebase-admin --save-dev
```

### Issue: "Firebase initialization failed"
**Solution**:
1. Run `firebase login`
2. Check `.firebaserc` has correct project
3. Verify Firebase CLI is authenticated

### Issue: "Firestore connection timeout"
**Solution**:
1. Check internet connection
2. Verify Firebase project is active
3. Check firewall/VPN settings

### Issue: "Data not showing in UI"
**Solution**:
1. Run verification script: `node scripts/verifySeeding.js`
2. Check browser console for errors
3. Refresh page (Ctrl+R or Cmd+R)
4. Clear browser cache

### Issue: "Timestamp rendering error"
**Solution**:
- Already fixed in ProductCard component
- Ensure you have latest code from `src/components/ui/ProductCard.tsx`
- Restart dev server: `npm run dev`

---

## 📋 Verification Checklist

After seeding, verify:

- [ ] Seeding script runs without errors
- [ ] Verification script shows all checks passed
- [ ] Application builds successfully
- [ ] Dev server starts on port 3001
- [ ] Product Hub page loads
- [ ] Commercial Property product visible
- [ ] Coverages display correctly
- [ ] No console errors
- [ ] Dates format correctly (MM/DD/YYYY)

---

## 🔍 Monitoring & Debugging

### Check Firestore Data
```bash
firebase firestore:delete products/commercial-property-2025 --recursive
```

### View Logs
```bash
firebase functions:log
```

### Reset Data (if needed)
```bash
# Delete product and all subcollections
firebase firestore:delete products/commercial-property-2025 --recursive

# Re-seed
node scripts/seedCommercialProperty.js
```

---

## 📚 Documentation

- **Full Report**: `COMMERCIAL_PROPERTY_SEEDING_REPORT.md`
- **Completion Summary**: `DATA_SEEDING_COMPLETION_SUMMARY.md`
- **Seeding Guide**: `SEEDING_GUIDE.md`
- **Firestore Helpers**: `src/utils/firestoreHelpers.ts`

---

## 🎯 Common Tasks

### Add More States
Edit `scripts/seedCommercialProperty.js`:
```javascript
const STATES = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI', 'WA', 'CO'];
```

### Modify Coverage Limits
Edit `scripts/seedCommercialProperty.js`:
```javascript
const limits = [
  { amount: 250000, displayValue: '$250,000' },
  { amount: 500000, displayValue: '$500,000' },
  // Add more...
];
```

### Change Product Name
Edit `scripts/seedCommercialProperty.js`:
```javascript
const productData = {
  name: 'Your Product Name',
  // ...
};
```

### Add New Pricing Rules
Edit `scripts/seedCommercialProperty.js`:
```javascript
const pricingRules = [
  // Existing rules...
  {
    name: 'New Rule',
    ruleType: 'discount',
    value: 15,
    // ...
  }
];
```

---

## 🚀 Deployment

### To Production
1. Verify all data in staging
2. Run verification script
3. Deploy application: `npm run build && firebase deploy`
4. Monitor Firestore for data integrity
5. Test in production environment

### Rollback (if needed)
```bash
firebase firestore:delete products/commercial-property-2025 --recursive
```

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review full documentation
3. Check browser console for errors
4. Verify Firebase project configuration

---

## ✅ Success Indicators

You'll know everything is working when:
- ✅ Seeding script completes without errors
- ✅ Verification script shows all checks passed
- ✅ Product appears in Product Hub
- ✅ All coverages are visible
- ✅ Forms are accessible
- ✅ No console errors
- ✅ Dates display correctly

---

**Status**: ✅ Ready to Use  
**Last Tested**: 2025-10-21  
**Environment**: Production (insurance-product-hub)

