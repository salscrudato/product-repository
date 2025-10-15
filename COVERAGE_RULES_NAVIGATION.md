# Coverage-to-Rules Navigation Implementation

## Overview
This document describes the implementation of coverage-to-rules navigation, allowing users to view and manage rules specific to individual coverages directly from the coverage cards.

## Changes Made

### 1. CoverageScreen.tsx Enhancements

#### Added Imports
- Added `Cog6ToothIcon` from Heroicons for the Rules metric item

#### State Management
- Added `rules` state to store all rules for the product
- Rules are fetched alongside forms and product metadata

#### Data Fetching
- Enhanced `loadMeta()` function to fetch rules from Firestore
- Rules are filtered by `productId` to only load relevant rules
- Query: `collection(db, 'rules'), where('productId', '==', productId)`

#### Helper Functions
- Added `getRuleCount(coverageId)` function:
  - Filters rules where `ruleType === 'Coverage'` AND `targetId === coverageId`
  - Returns the count of rules for a specific coverage
  - Used to display rule counts in the UI

#### UI Updates - Parent Coverage Cards
Added new MetricItem for Rules:
```jsx
<MetricItem onClick={() => navigate(`/rules/${productId}/${parent.id}`)}>
  <Cog6ToothIcon />
  Rules ({getRuleCount(parent.id)})
</MetricItem>
```

#### UI Updates - Sub-Coverage Cards
Added new MetricItem for Rules:
```jsx
<MetricItem onClick={() => navigate(`/rules/${productId}/${child.id}`)}>
  <Cog6ToothIcon />
  Rules ({getRuleCount(child.id)})
</MetricItem>
```

### 2. RulesScreen.tsx Enhancements

#### URL Parameter Support
- Added `coverageId` parameter extraction from URL params
- Updated `useParams()` to destructure both `productId` and `coverageId`

#### State Management
- Added `selectedCoverageName` state to display coverage name in header
- Stores the name of the selected coverage for UI display

#### Data Fetching
- Enhanced data loading to fetch coverage name when `coverageId` is provided
- Queries the coverage document from `products/{productId}/coverages/{coverageId}`
- Sets `selectedCoverageName` for display in the header

#### Filtering Logic
Enhanced `filteredRules` useMemo with coverage filtering:
- **Coverage Filter (Highest Priority)**: When `preselectedCoverageId` exists:
  - Filters rules where `ruleType === 'Coverage'` AND `targetId === preselectedCoverageId`
  - This ensures only rules for the specific coverage are shown
- **Product Filter**: Applied after coverage filter
- **Text Search**: Applied to filtered results
- **Category/Status/Type Filters**: Applied to further refine results

#### UI Updates
- **Header Title**: Shows coverage-specific context
  - Coverage view: `"{CoverageName} Rules"`
  - Product view: `"{ProductName} Rules"`
  - Global view: `"Rules Repository"`
  
- **Search Placeholder**: Context-aware placeholder text
  - Coverage view: `"Search rules for this coverage..."`
  - Product view: `"Search coverage and form rules..."`
  - Global view: `"Search rules by name, category, condition, or outcome..."`

### 3. App.tsx Route Configuration

#### New Route Added
```jsx
<Route
  path="/rules/:productId/:coverageId"
  element={
    <RequireAuth>
      <Suspense fallback={<LoadingSpinner />}>
        <RulesScreen />
      </Suspense>
    </RequireAuth>
  }
/>
```

#### Route Hierarchy
1. `/rules` - Global rules repository (all products)
2. `/rules/:productId` - Product-specific rules
3. `/rules/:productId/:coverageId` - Coverage-specific rules (NEW)

## Data Flow

### Navigation Flow
1. User views coverage in CoverageScreen
2. User clicks "Rules (X)" MetricItem on a coverage card
3. Navigation to `/rules/{productId}/{coverageId}`
4. RulesScreen loads with coverage context
5. Rules are filtered to show only coverage-specific rules
6. Header displays "{Coverage Name} Rules"

### Data Relationships
```
Product (1)
  ├── Coverages (many)
  │   └── Sub-Coverages (many via parentCoverageId)
  └── Rules (many)
      └── Coverage Rules (filtered by ruleType='Coverage' & targetId=coverageId)
```

### Rule Structure
```typescript
interface Rule {
  id: string;
  productId: string;
  ruleType: 'Product' | 'Coverage' | 'Forms' | 'Pricing';
  targetId?: string;  // coverageId when ruleType='Coverage'
  name: string;
  condition: string;
  outcome: string;
  // ... other fields
}
```

## User Experience

### Coverage Card Display
- Each coverage card now shows a "Rules (X)" metric
- The count shows the number of rules specific to that coverage
- Clicking navigates to a filtered view of those rules

### Rules Screen Display
- When accessed from a coverage card:
  - Header shows coverage name
  - Only coverage-specific rules are displayed
  - Search is scoped to those rules
  - Back button returns to coverage screen

### Benefits
1. **Direct Access**: Quick access to coverage-specific rules
2. **Context Awareness**: Clear indication of which coverage's rules are being viewed
3. **Efficient Filtering**: Automatic filtering reduces cognitive load
4. **Consistent UX**: Follows same pattern as States, Forms, and Pricing navigation

## Testing Checklist

- [ ] Coverage cards display rule counts correctly
- [ ] Clicking Rules metric navigates to correct URL
- [ ] RulesScreen filters rules by coverage correctly
- [ ] Header displays coverage name when filtered
- [ ] Search works within filtered coverage rules
- [ ] Back button returns to coverage screen
- [ ] Works for both parent and sub-coverages
- [ ] Rule count updates when rules are added/deleted
- [ ] No console errors or warnings

## Future Enhancements

1. **Add Rule from Coverage**: Quick-add button to create coverage rule from coverage card
2. **Rule Preview**: Hover tooltip showing rule details on coverage card
3. **Rule Categories**: Visual indicators for different rule types on coverage cards
4. **Bulk Operations**: Select multiple coverages to view combined rules
5. **Rule Templates**: Pre-defined rule templates for common coverage scenarios

## Technical Notes

- All changes maintain backward compatibility
- No breaking changes to existing routes or components
- Follows existing code patterns and styling
- Uses existing hooks and utilities
- Properly handles loading and error states
- Optimized with useMemo and useCallback for performance

