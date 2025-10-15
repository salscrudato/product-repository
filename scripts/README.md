# Data Seeding Scripts

This directory contains scripts for populating the Firestore database with comprehensive insurance product data.

## Commercial Property Seeding Script

### Overview
The `seedCommercialProperty.ts` script creates a complete commercial property insurance product with:

- **Product Definition**: Commercial Property Coverage (CP-001)
- **Coverages**: 6 main coverages + 4 sub-coverages
  - Building Coverage
  - Business Personal Property
  - Business Income Coverage
  - Extra Expense Coverage
  - Equipment Breakdown Coverage
  - Ordinance or Law Coverage
  - Plus sub-coverages for glass, signage, computers, and valuable papers

- **Forms**: 7 ISO forms with proper coverage mappings
  - CP 00 10 - Building and Personal Property Coverage Form
  - CP 00 30 - Business Income Coverage Form
  - CP 04 17 - Electronic Data Processing Equipment
  - CP 10 30 - Causes of Loss - Special Form
  - CP 10 32 - Causes of Loss - Earthquake Form
  - CP 04 40 - Ordinance or Law Coverage
  - CP 04 69 - Utility Services - Direct Damage

- **Pricing Structure**: 19 pricing steps with multi-dimensional rating
  - Base rates for building and BPP
  - Construction type factors
  - Protection class factors
  - Territory factors
  - Occupancy factors
  - Catastrophe surcharges (hurricane, earthquake)
  - Deductible credits
  - Proper operands for calculations

- **Pricing Tables**: 5 rating tables with dimensions
  - Building Base Rate (by construction type and square footage)
  - Protection Class (ISO 1-10)
  - Territory (1-10)
  - Occupancy (8 classes)
  - Deductible Credit (6 levels)

- **Business Rules**: 12 comprehensive rules
  - Eligibility rules (minimum values, age restrictions, vacancy)
  - Pricing rules (sprinkler discount, alarm discount)
  - Coverage requirements (coinsurance, waiting periods, inspections)
  - Geographic restrictions (coastal wind, earthquake)

- **State Availability**: All 50 US states with special handling for:
  - Catastrophe-prone states (FL, LA, TX, SC, NC, GA, AL, MS)
  - Earthquake states (CA, OR, WA, AK, NV, UT)
  - Wind/hail states (TX, OK, KS, NE, SD, ND, MO, IA)

### Prerequisites

1. Firebase project configured in `.env.local`
2. Required npm packages installed:
   ```bash
   npm install
   ```

### Running the Script

```bash
# Run the commercial property seeding script
npm run seed:commercial-property
```

Or directly with tsx:
```bash
npx tsx scripts/seedCommercialProperty.ts
```

### What Gets Created

The script will create the following in your Firestore database:

1. **1 Product** in `products` collection
2. **10 Coverages** in `products/{productId}/coverages` subcollection
   - 6 main coverages
   - 4 sub-coverages (with parentCoverageId)
3. **7 Forms** in `forms` collection
4. **Form-Coverage Mappings** in `formCoverages` collection
5. **19 Pricing Steps** in `products/{productId}/steps` subcollection
6. **Pricing Dimensions** in `products/{productId}/steps/{stepId}/dimensions` subcollection
7. **12 Business Rules** in `rules` collection

### Data Model Compliance

This script follows the application's data model exactly:

- **Products**: Top-level collection with metadata
- **Coverages**: Subcollection under products, hierarchical with parentCoverageId
- **Forms**: Top-level collection with productId reference
- **FormCoverages**: Junction table for many-to-many relationships
- **Pricing Steps**: Subcollection under products with proper ordering
- **Dimensions**: Subcollection under steps for multi-dimensional rating
- **Rules**: Top-level collection with productId reference

### Insurance Industry Accuracy

As a P&C insurance expert, this script includes:

- **ISO Standard Forms**: Actual ISO form numbers and names
- **Realistic Coverage Limits**: Industry-standard limit options
- **Proper Deductibles**: Common deductible structures
- **Rating Factors**: Real-world rating variables
  - Construction type (6 ISO classes)
  - Protection class (ISO 1-10)
  - Territory rating
  - Occupancy classification
- **Catastrophe Modeling**: Geographic risk differentiation
- **Underwriting Rules**: Industry-standard eligibility criteria
- **Coinsurance**: Standard 80/90/100% options
- **Waiting Periods**: Standard 72-hour BI waiting period

### Customization

To modify the data:

1. Edit the arrays in `seedCommercialProperty.ts`
2. Add/remove coverages, forms, or rules
3. Adjust pricing steps and factors
4. Modify state availability
5. Re-run the script

### Safety

- The script checks existing data before seeding
- Each run creates NEW documents (doesn't update existing)
- To reset, manually delete the product from Firestore UI
- Consider backing up your database before running

### Next Steps

After seeding:

1. View the product in the Product Hub
2. Explore coverages in Product Explorer
3. Review pricing structure in Pricing Screen
4. Check business rules in Rules Screen
5. View forms in Forms Screen
6. Test the complete product workflow

### Troubleshooting

**Error: Missing Firebase configuration**
- Ensure `.env.local` has all required VITE_FIREBASE_* variables

**Error: Permission denied**
- Check Firestore security rules
- Ensure you're authenticated (if required)

**Error: Module not found**
- Run `npm install` to install dependencies

**Duplicate data**
- Each run creates new documents
- Delete old products manually if needed

### Future Enhancements

Potential additions:
- Additional product lines (Auto, GL, WC)
- More complex rating algorithms
- State-specific forms and rules
- Historical rate changes
- Competitor rate comparisons
- Loss cost data
- Actuarial tables

