# Phase 2: Trust & Safety Implementation

**Status:** ✅ COMPLETE  
**Date:** December 20, 2025  
**Scope:** G04, G06, G07, G09

---

## Overview

Building on Phase 1's constitutional compliance, Phase 2 adds trust-critical features and safety guardrails that prevent customer complaints and legal issues.

---

## Phase 2 Tasks

### G06: Service Charges Display ✅ COMPLETE

**Data Location:** `projectData.menuSettings.serviceChargeNote`

> **CONSTITUTIONAL:** Service charge is **pricing truth**, NOT design.
> It must live in `menuSettings`, NOT `ThemeConfig`.
> This ensures styling-immunity for legal disclosures.

- [x] Create `ServiceChargeNote.tsx` component
- [x] Add `MenuSettings` interface to `project.types.ts`
- [x] Add `menuSettings` to `Project` interface
- [x] Integrate into `menuPageNew.tsx` footer trust zone
- [x] Add editor UI in Menu Settings (Advanced section)
- [x] 140 character hard limit enforcement (truncate + trim)
- [x] Whitespace protection (`.trim()` prevents silent abuse)
- [x] Constitutional order comment locked in render file

**Files Modified:**

- `src/components/templates/main-app/projects/types/project.types.ts` (MenuSettings interface)
- `src/components/templates/main-app/projects/b2cView/output/ServiceChargeNote.tsx`
- `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`
- `src/components/templates/main-app/projects/b2cView/menuPage/menuPageSettingsNew.tsx`

**Component Specs:**

```typescript
// Fixed styling - cannot be overridden by moods/layouts
// Minimum 12px font size
// Neutral gray color (#6B7280)
// No animations, no accent colors, no hide toggles
// No mood tokens, no layout conditionals
```

**Data Structure:**

```typescript
// project.types.ts
export interface MenuSettings {
  serviceChargeNote?: string; // Max 140 chars, pricing truth
}

export interface Project {
  // ...
  menuSettings?: MenuSettings;
}
```

**Constitutional Order (Locked):**

```typescript
// menuPageNew.tsx - DO NOT CHANGE ORDER
// 1. Pricing disclosures (G06) - ServiceChargeNote
// 2. Business identity (G09) - MenuFooter
```

---

### G04: Image Quality Validation ✅ COMPLETE

**Enforcement:** Upload-time + Runtime fallback

- [x] Define quality thresholds (400×300px, aspect 0.8-1.8)
- [x] Create `imageQualityGuard.ts` utility
- [x] Integrate into background upload flow (`backgroundSettings.tsx`)
- [x] Add rejection messaging
- [x] Add runtime fallback (`onError` hides broken images)

**Files Created:**

- `src/lib/imageQualityGuard.ts`

**Files Modified:**

- `src/components/templates/main-app/projects/b2cView/menuPage/backgroundSettings.tsx`
- `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`

**Quality Rules:**

```typescript
export const IMAGE_QUALITY_RULES = {
  MIN_WIDTH: 400,
  MIN_HEIGHT: 300,
  ACCEPTABLE_ASPECT_RATIOS: [
    { min: 0.8, max: 1.25, name: "Square-ish" },
    { min: 1.25, max: 1.8, name: "Landscape" },
  ],
};
```

---

### G09: Contact/Location Display ✅ COMPLETE

**Enforcement:** Business name always shown with "Menu" fallback

- [x] Define contact data model (uses existing `StoreDataType`)
- [x] Create `MenuFooter.tsx` component
- [x] Add to menu footer (after ServiceChargeNote)
- [x] Design cross-vertical safe layout
- [x] Business name enforcement with `'Menu'` fallback

**Files Created:**

- `src/components/templates/main-app/projects/b2cView/output/MenuFooter.tsx`

**Files Modified:**

- `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`

**Enforcement Logic:**

```typescript
// G09 ENFORCEMENT: Business name is required
// Legacy fallback: Show "Menu" if no store name provided
const businessName = storeDetails?.name || "Menu";
```

---

### G07: Back-to-Top Control ✅ COMPLETE

**Enforcement:** Auto-injected, cannot be disabled

- [x] Create `BackToTop.tsx` component
- [x] Add scroll position detection (300px threshold)
- [x] Design mobile-first placement (bottom-right, fixed)
- [x] Integrate into menu page
- [x] Add `aria-label="Back to top"` for accessibility
- [x] Verify no overlap with MenuFilters (80px > 60px bar)

**Files Created:**

- `src/components/templates/main-app/projects/b2cView/output/BackToTop.tsx`

**Files Modified:**

- `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`

**Positioning:**

```typescript
style={{
    position: 'fixed',
    bottom: '80px', // Above MenuFilters (~60px)
    right: '16px',
    width: '48px',
    height: '48px',
    zIndex: 999,
}}
```

---

## Verification Checklist

- [x] All 4 Phase 2 items implemented
- [x] No regression in Phase 1 features
- [x] Cross-check against constitution
- [x] `COMPLIANCE-AUDIT.md` updated

---

## Files Summary

### Created

| File                           | Purpose                        |
| ------------------------------ | ------------------------------ |
| `output/ServiceChargeNote.tsx` | G06 trust disclosure component |
| `output/MenuFooter.tsx`        | G09 contact/location component |
| `output/BackToTop.tsx`         | G07 navigation component       |
| `lib/imageQualityGuard.ts`     | G04 quality validation utility |

### Modified

| File                               | Changes                                              |
| ---------------------------------- | ---------------------------------------------------- |
| `types/theme.types.ts`             | Added `serviceChargeNote` to `ThemeConfig`           |
| `menuPage/menuPageNew.tsx`         | Integrated all Phase 2 components + runtime fallback |
| `menuPage/menuPageSettingsNew.tsx` | Added service charge editor UI                       |
| `menuPage/backgroundSettings.tsx`  | Added image quality validation                       |

---

## Next: Phase 3 (Experience Polish)

- G08: Add Tap Feedback on Items
- G10: Add Image Quota Guards
- G12: Add Skeleton Loading
- G13: Add Share Preview (OG Tags)
