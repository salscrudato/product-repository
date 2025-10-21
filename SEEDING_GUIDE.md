# Commercial Property Insurance Product Seeding Guide

## Overview

This guide explains how to seed the Firestore database with a production-ready Commercial Property insurance product using industry-standard P&C insurance data.

## Scripts

### 1. `scripts/seedCommercialProperty.js`
**Basic seeding script** - Seeds all product data without PDF generation.

**Usage:**
```bash
node scripts/seedCommercialProperty.js
```

**What it creates:**
- ✅ Product (Commercial Property Insurance)
- ✅ 5 Coverages (Building, BPP, Business Income, Extra Expense, Property of Others)
- ✅ Limits (6 options per coverage)
- ✅ Deductibles (5 options per coverage)
- ✅ Forms (5 ISO forms)
- ✅ Form-Coverage Mappings
- ✅ Pricing Rules (5 rules)
- ✅ Business Rules (5 rules)
- ✅ State Applicability (10 states)

**Requirements:**
- Firebase Admin SDK configured
- `.env` file with `FIREBASE_SERVICE_ACCOUNT_PATH`
- Firestore database accessible

### 2. `scripts/generateFormPDFs.js`
**PDF generation script** - Generates realistic insurance form PDFs.

**Usage:**
```bash
node scripts/generateFormPDFs.js
```

**What it generates:**
- CP 00 10 10 12 - Building and Personal Property Coverage Form
- CP 00 30 10 12 - Business Income Coverage Form
- CP 10 10 10 12 - Causes of Loss - Broad Form
- CP 10 30 10 12 - Causes of Loss - Special Form
- CP 15 05 10 12 - Agreed Value Optional Coverage

**Output:**
- PDFs saved to `public/forms/`
- Professional formatting with headers, footers, and content

### 3. `scripts/seedWithPDFs.js`
**Complete seeding script** - Generates PDFs, uploads to Firebase Storage, and seeds data.

**Usage:**
```bash
node scripts/seedWithPDFs.js
```

**What it does:**
1. Generates all form PDFs
2. Uploads PDFs to Firebase Storage
3. Seeds product data with PDF download URLs
4. Creates all related entities

**Requirements:**
- All requirements from `seedCommercialProperty.js`
- Firebase Storage bucket configured
- `FIREBASE_STORAGE_BUCKET` in `.env`

## Environment Setup

### 1. Install Dependencies

```bash
# Install pdfkit for PDF generation
npm install pdfkit

# Or in functions directory
cd functions
npm install pdfkit
cd ..
```

### 2. Configure Environment Variables

Create or update `.env` file:

```env
# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# Optional: Firebase Emulator
USE_FIREBASE_EMULATORS=false
```

### 3. Get Service Account Key

1. Go to Firebase Console
2. Project Settings → Service Accounts
3. Click "Generate New Private Key"
4. Save as `serviceAccountKey.json`
5. Update `FIREBASE_SERVICE_ACCOUNT_PATH` in `.env`

## Data Structure

### Product
- **ID**: `commercial-property-2025`
- **Status**: Active
- **Version**: 1
- **Effective Date**: 2025-01-01
- **Expiration Date**: 2026-12-31
- **States**: CA, NY, TX, FL, IL, PA, OH, GA, NC, MI

### Coverages (5 total)

#### 1. Building Coverage (Base)
- **Code**: CP-00-10-BLDG
- **Premium**: $5,000
- **Valuation**: Replacement Cost (RC)
- **Coinsurance**: 80%
- **Perils**: Fire, Lightning, Windstorm, Hail, Explosion, Riot, Vandalism

#### 2. Business Personal Property (Base)
- **Code**: CP-00-10-BPP
- **Premium**: $3,000
- **Valuation**: Actual Cash Value (ACV)
- **Coinsurance**: 80%
- **Perils**: Fire, Lightning, Windstorm, Hail, Explosion, Riot, Vandalism

#### 3. Business Income (Optional)
- **Code**: CP-00-30-BI
- **Premium**: $2,000
- **Waiting Period**: 72 hours
- **Perils**: Fire, Lightning, Windstorm, Hail, Explosion, Riot, Vandalism

#### 4. Extra Expense (Optional)
- **Code**: CP-00-50-EE
- **Premium**: $1,500
- **Waiting Period**: 72 hours
- **Perils**: Fire, Lightning, Windstorm, Hail, Explosion, Riot, Vandalism

#### 5. Property of Others (Optional)
- **Code**: CP-00-10-POO
- **Premium**: $500
- **Valuation**: Actual Cash Value (ACV)
- **Coinsurance**: 80%
- **Perils**: Fire, Lightning, Windstorm, Hail, Explosion, Riot, Vandalism

### Limits (per coverage)
- $250,000 (default)
- $500,000
- $1,000,000
- $2,500,000
- $500,000 Annual Aggregate
- $1,000,000 Annual Aggregate

### Deductibles (per coverage)
- $500 (default)
- $1,000
- $2,500
- $5,000
- 2% of Insured Value (min: $1,000, max: $50,000)

### Forms (5 total)
1. CP 00 10 10 12 - Building and Personal Property Coverage Form
2. CP 00 30 10 12 - Business Income Coverage Form
3. CP 10 10 10 12 - Causes of Loss - Broad Form
4. CP 10 30 10 12 - Causes of Loss - Special Form
5. CP 15 05 10 12 - Agreed Value Optional Coverage

### Pricing Rules (5 total)
1. Base Building Premium (100 fixed)
2. Building Age Surcharge (15% for buildings > 30 years)
3. Sprinkler System Discount (10%)
4. Alarm System Discount (5%)
5. Multi-Coverage Discount (10%)

### Business Rules (5 total)
1. Building Coverage Required
2. Coinsurance Penalty
3. Business Income Waiting Period
4. Proof of Loss Deadline (90 days)
5. Underwriter Approval for High Limits (> $5M)

### State Applicability (10 states)
- California (CA)
- New York (NY)
- Texas (TX)
- Florida (FL)
- Illinois (IL)
- Pennsylvania (PA)
- Ohio (OH)
- Georgia (GA)
- North Carolina (NC)
- Michigan (MI)

All states have:
- Filing Status: Approved
- Rate Approval Status: Approved
- Compliance Status: Compliant

## Execution Steps

### Option 1: Basic Seeding (No PDFs)

```bash
# 1. Ensure environment is configured
cat .env

# 2. Run seeding script
node scripts/seedCommercialProperty.js

# 3. Verify in Firebase Console
# - Check products collection
# - Check coverages subcollection
# - Check forms collection
```

### Option 2: Complete Seeding (With PDFs)

```bash
# 1. Install pdfkit
npm install pdfkit

# 2. Ensure environment is configured
cat .env

# 3. Run complete seeding
node scripts/seedWithPDFs.js

# 4. Verify in Firebase Console
# - Check products collection
# - Check forms with downloadUrl
# - Check Firebase Storage for PDFs
```

### Option 3: Generate PDFs Only

```bash
# 1. Install pdfkit
npm install pdfkit

# 2. Generate PDFs
node scripts/generateFormPDFs.js

# 3. PDFs saved to public/forms/
ls public/forms/
```

## Verification

### Check Firestore Data

```javascript
// In Firebase Console or using Firebase CLI

// Check product
db.collection('products').doc('commercial-property-2025').get()

// Check coverages
db.collection('products')
  .doc('commercial-property-2025')
  .collection('coverages')
  .get()

// Check forms
db.collection('forms').get()

// Check form-coverage mappings
db.collection('formCoverages').get()

// Check pricing rules
db.collection('pricingRules').get()

// Check business rules
db.collection('rules').get()

// Check state applicability
db.collection('stateApplicability').get()
```

### Check Firebase Storage

```bash
# Using Firebase CLI
firebase storage:download forms/commercial-property-2025/CP_00_10_10_12.pdf

# Or check in Firebase Console
# Storage → forms/commercial-property-2025/
```

## Data Integrity

The seeding script ensures:
- ✅ All relationships are valid
- ✅ All IDs are unique
- ✅ All required fields are populated
- ✅ All timestamps are consistent
- ✅ All audit trail fields are set
- ✅ All state applicability is consistent

## Troubleshooting

### Issue: "FIREBASE_SERVICE_ACCOUNT_PATH not set"
**Solution**: Add to `.env` file:
```env
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json
```

### Issue: "Cannot find module 'pdfkit'"
**Solution**: Install pdfkit:
```bash
npm install pdfkit
```

### Issue: "Storage bucket not configured"
**Solution**: Add to `.env` file:
```env
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

### Issue: "Permission denied" on Firebase Storage
**Solution**: Update Firebase Storage rules to allow uploads:
```
allow write: if request.auth != null;
```

## Idempotency

All scripts are idempotent - they can be run multiple times safely:
- Existing documents are overwritten with same data
- No duplicate entries are created
- Safe to re-run for updates

## Performance

**Seeding Time Estimates:**
- Basic seeding: ~5-10 seconds
- PDF generation: ~3-5 seconds
- PDF upload: ~2-5 seconds (depends on network)
- Complete seeding: ~10-20 seconds

**Data Size:**
- Product: ~1 KB
- Coverages: ~25 KB (5 coverages × 5 KB each)
- Forms: ~10 KB (5 forms × 2 KB each)
- Mappings: ~15 KB (25 mappings × 600 bytes each)
- Rules: ~20 KB (10 rules × 2 KB each)
- Total: ~70 KB

## Next Steps

After seeding:
1. ✅ Verify data in Firebase Console
2. ✅ Test product builder with seeded data
3. ✅ Test form downloads
4. ✅ Test pricing calculations
5. ✅ Test business rule validation
6. ✅ Deploy to production

## Support

For issues or questions:
1. Check Firestore logs
2. Check Firebase Storage logs
3. Review script output for errors
4. Check `.env` configuration
5. Verify Firebase permissions

---

**Last Updated**: 2025-10-21  
**Version**: 1.0  
**Status**: Production Ready

