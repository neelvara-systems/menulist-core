# B2C Menu Layout Constitution Implementation

## July 16, 2026 current code-truth addendum

The maintained B2C specification and implementation are now `../b2c-view/b2c-view_spec.md` and `../b2c-view/b2c-view_impl.md`. This older implementation summary remains historical evidence and does not override them.

The current code enforces the constitution at these material boundaries:

- exact mood/layout compatibility: Clean List/Grid; Warm List/Card/Grid; Premium List/Card; Bold Card/Grid; Fast List;
- category tabs as navigation rather than a structural layout, including safe legacy-tabs migration;
- owned-key and malformed-boolean normalization before owner preview and again before public rendering;
- WCAG-AA baseline accent/price contrast, readable metadata/warning badges, full-opacity prices, and readable unavailable items;
- base/range plus every active priced option before item interaction, with inactive/unpriced/non-finite options removed and variant analytics prevented from using stale base price;
- HTTPS/root-relative public backgrounds, preview-only data images, and scroll attachment on mobile;
- stable full item addressability for search, category navigation, and direct links after removing the estimated-height 150-item placeholder.

`npm run verify:menu-design-presentation-boundary` locks these source/runtime contracts. This is not current launch certification: the External Certification Runbook, Digital Menu Output Constitution checks, browser/mobile customer-menu QA, public cache/deploy evidence, and target production smoke remain required.

**Date:** December 21, 2024  
**Status:** Historical implementation note; not current launch certification

---

## Current Launch Boundary

This document records a December 2024 B2C menu layout implementation slice. It is not current launch certification or current production certification. Current customer-facing menu launch approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, Digital Menu Output Constitution checks, `npm run verify:menu-design-presentation-boundary`, browser/mobile customer-menu QA, public cache/deploy evidence, and target production smoke.

---

## Cross-Check Report

| Check          | Status      | Notes                                     |
| -------------- | ----------- | ----------------------------------------- |
| TypeScript     | ✅ Pass     | No errors in modified files               |
| ESLint         | ✅ Pass     | No warnings or errors                     |
| Architecture   | ✅ Verified | 3-layer pattern correctly implemented     |
| Filter Logic   | ✅ Fixed    | Added BOTH-exist rule for forMen/forWomen |
| useEffect Deps | ✅ Fixed    | MenuHeader language restore dependency    |
| AI Prompt      | ✅ Verified | Extended for audience tags                |

---

## Overview

Implementation of the B2C menu layout constitutional rules covering:

- Language selector enhancement
- Search bar relocation
- Category tabs/FAB mutual exclusivity
- Filter chips (system-only)
- Footer enhancement with social links

---

## Files Created

| File                                 | Purpose                                |
| ------------------------------------ | -------------------------------------- |
| `b2cView/output/MenuSearchBar.tsx`   | Search bar below header (NEVER sticky) |
| `b2cView/output/MenuFilterChips.tsx` | Veg/Non-Veg/Popular filter chips       |

---

## Files Modified

| File                               | Changes                                                      |
| ---------------------------------- | ------------------------------------------------------------ |
| `b2cView/output/MenuHeader.tsx`    | Globe icon, native language names, localStorage persistence  |
| `b2cView/output/MenuFilters.tsx`   | Converted to FAB-only (removed search from bottom bar)       |
| `b2cView/output/MenuFooter.tsx`    | Added social links + read-only language indicator            |
| `b2cView/menuPage/menuPageNew.tsx` | Integrated all components, sticky tabs, tabs/FAB exclusivity |
| `types/extractedData.types.ts`     | Added `isBestSeller` field, documented `tags` usage          |

---

## Implementation Details

### Phase A: Language Selector Enhancement

**File:** `MenuHeader.tsx`

**Changes:**

- Added globe icon (`LuGlobe`) next to language code
- Display compact language code (e.g., "EN", "HI") instead of full name
- Dropdown shows native names (e.g., "हिंदी" instead of "Hindi")
- Added RTL support via `dir` attribute
- localStorage persistence for language preference
- Min 44px tap targets for accessibility

**Constitutional Rules Enforced:**

- L1: Always visible, cannot be hidden
- L2: Instant switch, no reload
- L3: Persist preference (localStorage)
- L4: No mixed-language states
- L5: Default priority (URL → Browser → Owner → English)

---

### Phase B: Search Bar Relocation

**File:** `MenuSearchBar.tsx` (NEW)

**Changes:**

- Moved search from bottom bar to below header
- **NEVER sticky** (scrolls away naturally per constitution feedback)
- Placeholder adapts to business type:
  - Restaurant: "Search dishes..."
  - Salon/Spa: "Search services..."
  - Clinic: "Search consultations..."

**File:** `MenuFilters.tsx`

**Changes:**

- Removed search input from bottom bar
- Converted to FAB-only component
- FAB positioned at bottom-right corner

---

### Phase B.1: Category Tabs/FAB Mutual Exclusivity

**File:** `menuPageNew.tsx`

**Changes:**

- Added `IntersectionObserver` to track tabs visibility
- FAB only shows when category tabs are scrolled out of view
- Category tabs are now sticky with `position: sticky; top: 0`

**Logic:**

```typescript
// FAB shows when tabs are NOT visible (scrolled out of view)
hideFAB={categoryTabsVisible || !showCategoryTabs}
```

---

### Phase C: Filter Chips (3-Layer Architecture)

**Architectural Principle:**

> AI produces signals → System normalizes them → UI enforces rules

This ensures zero AI/UI coupling and deterministic behavior.

#### Layer 1: AI (UNCHANGED)

AI extracts raw tags from visual markers. No changes needed.

#### Layer 2: System Normalization

**Files Created/Modified:**

- `b2cView/utils/normalizeItemAttributes.ts` (NEW)
- `constants/common.ts` (added `FILTER_ALLOWLIST`, `getBusinessCategory`)
- `MenuFilterChips.tsx` (REWRITTEN)
- `menuPageNew.tsx` (uses normalizeTags)
- `functions/src/logic/parallelProcessingPrompt.ts` (extended for audience tags)

```typescript
function normalizeTags(tags?: string[], isBestSeller?: boolean): NormalizedAttributes {
    return {
        veg: item.dietaryTags/decisionFacts/tags includes vegetarian keywords,
        nonveg: item.dietaryTags/decisionFacts/tags includes non-vegetarian keywords,
        popular: isBestSeller === true,
    };
}
```

This is the ONLY place where item dietary/filter tags are interpreted for public filter chips.

#### Layer 3: Filter Allowlist

**File:** `constants/common.ts`

```typescript
export const FILTER_ALLOWLIST: Record<string, SystemFilter[]> = {
  food: ["popular", "veg", "nonveg"],
  service: ["popular"],
  health: ["popular"],
  retail: ["popular"],
  creative: ["popular"],
  professional: [], // No filters
  specialty: ["popular"],
};
```

Uses `BUSINESS_TYPES.category` as a gate - no keyword matching, no inference.

#### Layer 4: Filter Rendering

**File:** `MenuFilterChips.tsx` (REWRITTEN)

```typescript
const businessCategory = getBusinessCategory(businessType);
const allowedFilters = FILTER_ALLOWLIST[businessCategory || ""] ?? [];

const visibleFilters = allowedFilters.filter((filter) =>
  items.some((item) => normalizeTags(item.tags, item.isBestSeller)[filter])
);
```

Filter is visible if: allowed for category AND items with that attribute exist.

---

**Constitutional Rules Enforced:**

- ✅ Filters gated by `BUSINESS_TYPES.category`
- ✅ No keyword matching in UI layer
- ✅ No AI-driven filter discovery
- ✅ No editor-configurable filters
- ✅ Single-select toggle
- ✅ Auto-hide when search is active

---

### Phase D: Footer Enhancement

**File:** `MenuFooter.tsx`

**Changes:**

- Added social media links (icons only)
- Supports: Facebook, Instagram, Twitter, LinkedIn, YouTube, WhatsApp
- Added read-only language indicator
- Clicking language indicator scrolls to top (to access header selector)
- **Does NOT directly switch language** (prevents desync with header)

**Social Links Source:**
Uses `storeDetails.socialMedia` (Record<string, string>) from business settings.

---

## Data Flow

### Dietary Tags

```
1. Menu image uploaded
   ↓
2. AI extraction (parallelProcessingPrompt.ts)
   - Looks for visual markers: V, VG, GF, 🌶️, Green dot, Red dot
   - Extracts to canonical dietaryTags: ["vegetarian"] or ["non-vegetarian"]
   ↓
3. Stored in item.dietaryTags (string[]), with decisionFacts.dietaryTags/legacy tags fallback
   ↓
4. MenuFilterChips reads normalized item filter attributes
   - Checks for veg keywords
   - Checks for non-veg keywords
   ↓
5. Filter applied to menu display
```

### Language Preference

```
1. User opens menu
   ↓
2. Check localStorage for saved preference
   ↓
3. If saved & valid → use it
   ↓
4. On language change → save to localStorage
   ↓
5. Footer shows current language (read-only)
```

---

## Target Layout Structure

```
┌──────────────────────────────────────────┐
│ Store Name                    🌐 EN ▼    │ ← Header
├──────────────────────────────────────────┤
│ 🔍 Search dishes...                       │ ← Scrolls away (NEVER sticky)
├──────────────────────────────────────────┤
│ Starters | Mains | Drinks     ← STICKY   │ ← Category Tabs
├──────────────────────────────────────────┤
│ 🟢 Veg (12)  ⭐ Popular (5)              │ ← Auto-hide filter chips
├──────────────────────────────────────────┤
│                                          │
│              Menu Items                  │
│                                          │
├──────────────────────────────────────────┤
│ Store Name                               │
│ 📍 Address   📞 Phone                    │
│ [FB] [IG] [WA]                           │ ← Social icons
│ English • हिंदी • العربية                 │ ← Read-only (click → scroll top)
└──────────────────────────────────────────┘

(When category tabs scroll out of view)
                              [📋 Menu] ← FAB appears
```

---

## Constitutional Compliance Checklist

| Rule                           | Status |
| ------------------------------ | ------ |
| Search NEVER sticky            | ✅     |
| Tabs/FAB mutual exclusivity    | ✅     |
| Filter chips system-only       | ✅     |
| Filter chips auto-hide         | ✅     |
| Footer language read-only      | ✅     |
| 44px tap targets               | ✅     |
| localStorage persistence       | ✅     |
| Native language names          | ✅     |
| RTL support                    | ✅     |
| Social links from storeDetails | ✅     |

---

## Important Notes

### Why No `isVeg` Field?

The dietary information (Vegetarian/Non-Vegetarian) is already extracted by the AI as canonical `dietaryTags` values, mirrored through decision facts when the owner edits it, and read with legacy `tags` as a fallback. This is documented in:

- `functions/src/logic/parallelProcessingPrompt.ts` - Extraction rules
- `src/components/templates/main-app/projects/types/extractedData.types.ts` - Item metadata contract
- `src/lib/menu/itemDecisionFacts.ts` - Owner edit mirror between decision facts and top-level metadata

The AI looks for visual markers in menu images:

- Green dot (Vegetarian in India)
- Red dot (Non-Vegetarian in India)
- Text labels: "Vegetarian", "Vegan", "Non-Vegetarian", etc.

Adding a separate `isVeg` boolean would be redundant and could cause data inconsistency.

### Filter Chip Visibility Logic

```typescript
// Veg filter only shows if:
// 1. Business is restaurant/cafe/food
// 2. Menu has BOTH veg AND non-veg items with tags

// Popular filter only shows if:
// 1. Some items have isBestSeller: true
// 2. Less than 80% of items are popular (otherwise it's meaningless)

// All filters hidden when search is active
```

---

## Testing Checklist

- [ ] Language selector shows globe icon + code (EN, HI, etc.)
- [ ] Language dropdown shows native names (हिंदी, العربية)
- [ ] Language preference persists across page reloads
- [ ] Search bar scrolls away (not sticky)
- [ ] Category tabs are sticky
- [ ] FAB hidden when tabs visible
- [ ] FAB appears when tabs scrolled away
- [ ] Filter chips appear for restaurant menus with mixed veg/non-veg
- [ ] Filter chips hidden when search is active
- [ ] Social links appear in footer if storeDetails.socialMedia exists
- [ ] Footer language indicator scrolls to top when clicked

---

## Files Reference

```
src/components/templates/main-app/projects/
├── b2cView/
│   ├── output/
│   │   ├── MenuHeader.tsx        # Language selector
│   │   ├── MenuSearchBar.tsx     # NEW - Search below header
│   │   ├── MenuFilterChips.tsx   # NEW - Veg/Popular filters
│   │   ├── MenuFilters.tsx       # FAB only (search removed)
│   │   └── MenuFooter.tsx        # Social + language indicator
│   └── menuPage/
│       └── menuPageNew.tsx       # Main integration
└── types/
    └── extractedData.types.ts    # isBestSeller field added

functions/src/logic/
└── parallelProcessingPrompt.ts   # AI extraction rules for tags
```
