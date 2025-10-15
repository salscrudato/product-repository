# Commercial Property Insurance Product - Data Documentation

## Overview

This document describes the comprehensive commercial property insurance product data that has been seeded into your Firestore database. The data represents a professional, industry-standard commercial property insurance product with all necessary components for a complete insurance product management system.

## Product Details

**Product Name:** Commercial Property Coverage  
**Product Code:** CP-001  
**Form Number:** CP 00 10  
**Bureau:** ISO (Insurance Services Office)  
**Status:** Active  
**Effective Date:** 2024-01-01  
**Available States:** All 50 US states  

**Target Market:** Small to Mid-Size Commercial Businesses  
**Minimum Premium:** $500  
**Maximum Premium:** $1,000,000  

---

## Coverages (10 Total)

### Base Coverages (2)

#### 1. Building Coverage (CP-BLD)
- **Description:** Coverage for the building structure and permanently attached fixtures
- **Scope:** Direct physical loss or damage to covered building
- **Category:** Base Coverage (Required)
- **Limits:** $100K, $250K, $500K, $1M, $2.5M, $5M
- **Deductibles:** $1K, $2.5K, $5K, $10K, $25K
- **Base Premium:** $1,200
- **Perils Covered:** Fire, Lightning, Explosion, Windstorm, Hail, Smoke, Vandalism, Theft

#### 2. Business Personal Property (CP-BPP)
- **Description:** Coverage for business contents, equipment, inventory, and furniture
- **Scope:** Direct physical loss or damage to business personal property
- **Category:** Base Coverage (Required)
- **Limits:** $50K, $100K, $250K, $500K, $1M
- **Deductibles:** $500, $1K, $2.5K, $5K, $10K
- **Base Premium:** $800
- **Perils Covered:** Fire, Lightning, Explosion, Windstorm, Hail, Smoke, Vandalism, Theft

### Optional Coverages (2)

#### 3. Business Income Coverage (CP-BI)
- **Description:** Coverage for loss of income due to covered property damage
- **Scope:** Loss of business income during period of restoration
- **Category:** Optional
- **Limits:** $25K, $50K, $100K, $250K, $500K
- **Deductibles:** 72 hours, 168 hours (7 days), 30 days
- **Base Premium:** $450
- **Perils:** Suspension of operations due to covered cause of loss

#### 4. Extra Expense Coverage (CP-EE)
- **Description:** Coverage for additional costs to continue operations after a loss
- **Scope:** Necessary extra expenses to avoid or minimize suspension of business
- **Category:** Optional
- **Limits:** $10K, $25K, $50K, $100K
- **Deductibles:** $500, $1K, $2.5K
- **Base Premium:** $250

### Endorsements (2)

#### 5. Equipment Breakdown Coverage (CP-EB)
- **Description:** Coverage for mechanical and electrical equipment breakdown
- **Scope:** Direct physical loss from breakdown of covered equipment
- **Category:** Endorsement
- **Limits:** $50K, $100K, $250K, $500K
- **Deductibles:** $1K, $2.5K, $5K
- **Base Premium:** $350
- **Perils:** Mechanical breakdown, Electrical breakdown, Pressure system failure

#### 6. Ordinance or Law Coverage (CP-OL)
- **Description:** Coverage for increased costs due to building code requirements
- **Scope:** Increased cost of construction due to enforcement of building codes
- **Category:** Endorsement
- **Limits:** $25K, $50K, $100K, $250K
- **Deductibles:** $1K, $2.5K, $5K
- **Base Premium:** $300

### Sub-Coverages (4)

#### 7. Glass Coverage (Sub-coverage of Building)
- **Description:** Coverage for building glass breakage
- **Limits:** $5K, $10K, $25K
- **Deductibles:** $100, $250, $500
- **Premium:** $75

#### 8. Outdoor Signs Coverage (Sub-coverage of Building)
- **Description:** Coverage for outdoor signs attached to building
- **Limits:** $2.5K, $5K, $10K
- **Deductibles:** $250, $500
- **Premium:** $50

#### 9. Computer Equipment (Sub-coverage of BPP)
- **Description:** Enhanced coverage for computer and electronic equipment
- **Limits:** $25K, $50K, $100K
- **Deductibles:** $500, $1K
- **Premium:** $150

#### 10. Valuable Papers and Records (Sub-coverage of BPP)
- **Description:** Coverage for cost to research and replace valuable papers
- **Limits:** $10K, $25K, $50K
- **Deductibles:** $500, $1K
- **Premium:** $100

---

## Forms (7 Total)

All forms are ISO standard forms with proper edition dates and coverage mappings.

### 1. CP 00 10 - Building and Personal Property Coverage Form
- **Edition:** 10/12
- **Type:** ISO Base Coverage Form
- **Coverages:** Building, Business Personal Property
- **States:** All 50 states

### 2. CP 00 30 - Business Income (and Extra Expense) Coverage Form
- **Edition:** 10/12
- **Type:** ISO Coverage Form
- **Coverages:** Business Income, Extra Expense
- **States:** All 50 states

### 3. CP 04 17 - Electronic Data Processing Equipment Coverage
- **Edition:** 10/12
- **Type:** ISO Endorsement
- **Coverages:** Computer Equipment
- **States:** All 50 states

### 4. CP 10 30 - Causes of Loss - Special Form
- **Edition:** 10/12
- **Type:** ISO Causes of Loss Form
- **Description:** All-risk coverage form
- **Coverages:** Building, Business Personal Property
- **States:** All 50 states

### 5. CP 10 32 - Causes of Loss - Earthquake Form
- **Edition:** 10/12
- **Type:** ISO Causes of Loss Form
- **Coverages:** Building, Business Personal Property
- **States:** CA, OR, WA, AK, NV, UT (Earthquake-prone states)

### 6. CP 04 40 - Ordinance or Law Coverage
- **Edition:** 10/12
- **Type:** ISO Endorsement
- **Coverages:** Ordinance or Law
- **States:** All 50 states

### 7. CP 04 69 - Utility Services - Direct Damage
- **Edition:** 10/12
- **Type:** ISO Endorsement
- **Description:** Coverage for loss from utility service interruption
- **Coverages:** Business Income
- **States:** All 50 states

---

## Pricing Structure (19 Steps)

The pricing structure follows industry-standard rating methodology with proper calculation flow.

### Base Rating Steps

1. **Building Base Rate** (Factor) - Table: BuildingBaseRate
2. **Multiply** (Operand)
3. **Construction Type Factor** (Factor) - Table: ConstructionType
4. **Multiply** (Operand)
5. **Protection Class Factor** (Factor) - Table: ProtectionClass
6. **Multiply** (Operand)
7. **Territory Factor** (Factor) - Table: Territory
8. **Multiply** (Operand)
9. **BPP Base Rate** (Factor) - Table: BPPBaseRate
10. **Multiply** (Operand)
11. **Occupancy Factor** (Factor) - Table: Occupancy
12. **Add** (Operand) - Combines Building and BPP premiums

### Catastrophe Surcharges

13. **Hurricane Surcharge** (Factor) - 1.25x for FL, LA, TX, SC, NC, GA, AL, MS
14. **Multiply** (Operand)
15. **Earthquake Surcharge** (Factor) - 1.35x for CA, OR, WA, AK, NV, UT
16. **Multiply** (Operand)

### Credits and Final Premium

17. **Deductible Credit** (Factor) - Table: DeductibleCredit
18. **Multiply** (Operand)
19. **Final Premium** (Factor) - Rounding: Nearest Dollar

### Pricing Tables with Dimensions

#### Building Base Rate Table
- **Dimension 1:** Construction Type (Frame, Joisted Masonry, Non-Combustible, Masonry Non-Combustible, Modified Fire Resistive, Fire Resistive)
- **Dimension 2:** Building Square Footage (0-5K, 5K-10K, 10K-25K, 25K-50K, 50K-100K, 100K+)

#### Protection Class Table
- **Dimension:** ISO Protection Class (1-10)

#### Territory Table
- **Dimension:** Territory Code (1-10)

#### Occupancy Table
- **Dimension:** Occupancy Class (Office, Retail, Restaurant, Manufacturing - Light, Manufacturing - Heavy, Warehouse, Apartment, Hotel/Motel)

#### Deductible Credit Table
- **Dimension:** Deductible Amount ($500, $1K, $2.5K, $5K, $10K, $25K)

---

## Business Rules (12 Total)

### Eligibility Rules (3)

1. **Minimum Building Value**
   - Condition: Building value must be at least $50,000
   - Outcome: Decline if building value < $50,000
   - Reference: Underwriting Guidelines Section 3.1

2. **Maximum Building Age - Frame Construction**
   - Condition: Frame construction buildings must be less than 50 years old
   - Outcome: Refer to underwriting if frame building > 50 years
   - Reference: Underwriting Guidelines Section 3.2

3. **Vacant Building Restriction**
   - Condition: Building has been vacant for more than 60 consecutive days
   - Outcome: Decline coverage or apply vacant building endorsement with 85% coinsurance
   - Reference: Underwriting Guidelines Section 4.1

### Pricing Rules (2)

4. **Sprinkler System Discount**
   - Condition: Building has automatic sprinkler system covering 100% of building
   - Outcome: Apply 15% discount to building premium
   - Reference: Rating Manual Section 5.4

5. **Central Station Alarm Discount**
   - Condition: Building has central station burglar and fire alarm
   - Outcome: Apply 10% discount to building and BPP premium
   - Reference: Rating Manual Section 5.5

### Coverage Requirements and Restrictions (7)

6. **Coastal Wind Restriction**
   - Condition: Property located within 1 mile of coast in FL, SC, NC, GA, AL, MS, LA, TX
   - Outcome: Wind/Hail coverage requires separate wind deductible of 2% or 5%

7. **Earthquake Deductible Requirement**
   - Condition: Earthquake coverage in CA, OR, WA, AK, NV, UT
   - Outcome: Minimum earthquake deductible of 10% applies

8. **Coinsurance Requirement**
   - Condition: All building coverage requires coinsurance clause
   - Outcome: Apply 80%, 90%, or 100% coinsurance clause
   - Reference: ISO CP 00 10 Form

9. **Business Income Waiting Period**
   - Condition: Business Income coverage selected
   - Outcome: Minimum 72-hour waiting period applies before coverage begins
   - Reference: ISO CP 00 30 Form

10. **Equipment Breakdown Inspection**
    - Condition: Equipment Breakdown coverage exceeds $250,000
    - Outcome: Annual inspection by qualified engineer required

11. **Ordinance or Law Limit**
    - Condition: Ordinance or Law coverage selected
    - Outcome: Maximum limit is 25% of building coverage limit
    - Reference: ISO CP 04 40 Endorsement

12. **High-Value Property Inspection**
    - Condition: Total insured value exceeds $5,000,000
    - Outcome: Physical inspection and detailed risk assessment required
    - Reference: Underwriting Guidelines Section 2.3

---

## Geographic Considerations

### All States (50)
Standard coverage available in all US states with base rating.

### Catastrophe-Prone States (8)
**FL, LA, TX, SC, NC, GA, AL, MS**
- Hurricane surcharge: 1.25x
- Coastal wind restrictions apply
- Special deductibles for wind/hail

### Earthquake States (6)
**CA, OR, WA, AK, NV, UT**
- Earthquake surcharge: 1.35x
- Minimum 10% earthquake deductible
- Earthquake form CP 10 32 available

### Wind/Hail States (8)
**TX, OK, KS, NE, SD, ND, MO, IA**
- Enhanced wind/hail considerations
- Tornado risk factored into territory rating

---

## Data Model Compliance

This seeded data fully complies with the application's data model:

✅ **Products** - Top-level collection with complete metadata  
✅ **Coverages** - Subcollection under products with hierarchical structure  
✅ **Sub-Coverages** - Use parentCoverageId for hierarchy  
✅ **Forms** - Top-level collection with productId references  
✅ **FormCoverages** - Junction table for many-to-many relationships  
✅ **Pricing Steps** - Subcollection under products with proper ordering  
✅ **Dimensions** - Subcollection under steps for multi-dimensional rating  
✅ **Business Rules** - Top-level collection with productId references  

---

## Next Steps

1. **View in Application:** Navigate to Product Hub to see the product
2. **Explore Coverages:** Use Product Explorer to view coverage hierarchy
3. **Review Pricing:** Check Pricing Screen for rating structure
4. **Examine Rules:** View Rules Screen for business logic
5. **Check Forms:** Review Forms Screen for form-coverage mappings
6. **Test Workflows:** Create quotes and test the complete product

---

## Re-running the Script

To seed additional products or reset data:

```bash
npm run seed:commercial-property
```

**Note:** Each run creates NEW documents. Delete old products manually if needed.

---

**Created:** October 15, 2025  
**Script:** `scripts/seedCommercialProperty.ts`  
**Product ID:** pofEPlolUyY8lLL2K4Zo

