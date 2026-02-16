# Pre-Production UI/UX Changes — Pass 2

**Date:** 2026-02-13

## Design System Consolidation

Migrated all core UI primitives from legacy `theme.*` references and hardcoded values to the canonical design token system at `src/ui/tokens.ts`.

### Token System (Single Source of Truth)
- **Colors:** Neutral (slate ramp 0–950), Accent (indigo 50–900), Semantic (success/warning/error/info), Functional aliases
- **Spacing:** 4px base scale (space[1]=4px through space[24]=96px)
- **Typography:** Apple HIG-inspired type scale with SF Pro system font stack
- **Shadows:** Graduated scale (xs through xl) plus card-specific shadows
- **Motion:** Standardized durations (75ms–450ms) with Apple-standard easings
- **Layout:** 1400px max-width, 56px nav height, 260px sidebar

---

## Components Migrated

### 1. Navigation (`src/components/ui/Navigation.tsx`)
- Replaced ~80+ hardcoded hex colors with token references
- Replaced all pixel spacing with `space[*]` tokens
- Replaced shadows with `shadow.md`, `shadow.sm`, `shadow.overlay`
- Replaced border-radius with `radius.md`, `radius.lg`, `radius.xl`, `radius.full`
- Replaced transitions with `transition.fast`, `transition.slow`
- Replaced z-index values with `z.dropdown`, `z.modal`, `z.popover`
- Added `focus-visible` styles using `focusRingStyle`
- Added `@media (prefers-reduced-motion)` blocks
- Simplified logo gradient from flashy 3-stop to clean 2-stop accent

### 2. Global Styles (`src/styles/GlobalStyle.ts`)
- Body uses `fontFamily.sans`, `typeScale.bodyMd`, `layout.pageBg`
- Focus-visible defaults use `focusRingStyle` and `shadow.focus`
- Selection color references `accent[500]`
- Typography reset uses typeScale tokens
- Scrollbar colors use `neutral[400]`
- Reduced-motion media query uses `reducedMotion` token

### 3. Button (`src/components/ui/Button.tsx`)
- **Flat, no gradients** (Apple style)
- Primary: solid `accent[500]`, hover `accent[600]`
- Secondary: white bg, `neutral[200]` border
- Ghost: transparent, accent text
- Danger: `semantic.error` background
- Sizes: sm=32px, md=36px, lg=40px
- Focus ring using `focusRingStyle`
- Disabled: `opacity: 0.4`
- Loading state with opacity
- Removed pseudo-element shine/ripple effects

### 4. Input (`src/components/ui/Input.tsx`)
- Borders: `neutral[200]` default, `accent[500]` focus
- Error/success states use `semantic.*` tokens
- Focus ring: `3px ${color.focusRing}`
- Labels use `typeScale.label`, helpers use `typeScale.caption`
- Checkbox/Radio: token-driven borders and checked states

### 5. Card (`src/components/ui/Card.tsx`)
- `shadow.card` at rest, `shadow.cardHover` on hover
- `radius.lg` (12px) corners
- `space[6]` internal padding
- Title uses `typeScale.headingSm`, body uses `typeScale.bodyMd`
- Badge colors from tokens
- Transition uses `transition.spring`

### 6. Table (`src/components/ui/Table.tsx`)
- Header: `color.bgSubtle`, `typeScale.labelSm`
- Row borders: `neutral[100]`
- Hover: `color.bgSubtle`
- Cells: `typeScale.bodySm`
- Clean scrollbar styling

### 7. EnhancedHeader (`src/components/ui/EnhancedHeader.tsx`)
- Removed gradient background and backdrop-filter effects
- Clean, typography-led: `typeScale.displaySm` title
- Subtle bottom border only
- Simplified breadcrumbs
- Flat accent button (no gradient)

### 8. Layout (`src/components/ui/Layout.tsx`)
- `layout.pagePaddingX/Y`, `layout.maxWidth`
- Responsive padding using breakpoints
- Clean title without gradient text effect

### 9. Loading Spinner (`src/components/ui/LoadingSpinner.tsx`)
- Token-based sizing and colors
- Respects `prefers-reduced-motion`

### 10. Empty State (`src/components/ui/EmptyState.tsx`)
- Typography-led with proper token hierarchy
- Subtle icon container
- Clean action button
- Reduced-motion support

---

## Accessibility Improvements
- All interactive elements have `focus-visible` styles
- `@media (prefers-reduced-motion)` respected across all animated components
- ARIA-compatible patterns in navigation, modals, inputs
- Keyboard navigation improvements with focus ring tokens
