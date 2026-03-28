# Phase 3: Experience Polish Implementation

**Status:** ✅ COMPLETE  
**Date:** December 20, 2025  
**Scope:** G08, G10, G12, G13

---

## Overview

Building on Phase 1's constitutional compliance and Phase 2's trust & safety features, Phase 3 adds experience polish that makes the menu feel responsive and professional.

---

## Phase 3 Tasks

### G08: Tap Feedback on Items ✅ COMPLETE

**Enforcement:** Base CSS class on all menu items

- [x] Add `active:scale-[0.98]` for instant scale feedback
- [x] Add `active:opacity-90` for visual response
- [x] Add `transition-transform duration-100` for smooth feel
- [x] Only apply to available items (not sold-out)

**Files Modified:**

- `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`

**Implementation:**

```tsx
// G08 - Tap feedback: instant visual response on touch
className={isAvailable ? 'active:scale-[0.98] active:opacity-90 transition-transform duration-100' : ''}
```

---

### G12: Skeleton Loading ✅ COMPLETE

**Enforcement:** Show skeleton while content loads

- [x] Create `MenuSkeleton.tsx` component
- [x] Match approximate menu structure (header, categories, items)
- [x] Use `animate-pulse` for smooth loading animation
- [x] **NEUTRAL COLORS ONLY** (no mood/brand influence)

**Files Created:**

- `src/components/templates/main-app/projects/b2cView/output/MenuSkeleton.tsx`

**Component Features:**

- Header skeleton (logo + language selector)
- Category header skeletons
- Item skeletons with image placeholder + text lines
- Configurable item and category count

**Constitutional Constraint (FIXED):**

```typescript
// Skeletons are neutral by design.
// They must not reflect brand or mood.
// They signal "loading", not "branding".

const SKELETON_TOKENS = {
  background: "#f5f5f5", // neutral gray-100
  pulse: "rgba(128, 128, 128, 0.15)",
  border: "#e5e5e5", // neutral gray-200
  itemBackground: "#fafafa",
} as const;
```

- ❌ Does NOT consume `moodConfig`
- ✅ Uses hardcoded neutral gray tokens

---

### G10: Image Quota Guards ✅ COMPLETE

**Enforcement:** Layout config limits on image count + **RENDER-TIME ENFORCEMENT**

- [x] Add `maxImagesPerCategory` to `MenuLayoutConfig` interface
- [x] Set quota limits per layout type
- [x] Prevents Pinterest-style endless image galleries
- [x] **Runtime enforcement via index check** (items beyond quota don't show images)

**Files Modified:**

- `src/components/templates/main-app/projects/b2cView/designSystem/index.ts`
- `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`

**Quota Limits:**

| Layout | maxImagesPerCategory | Rationale                |
| ------ | -------------------- | ------------------------ |
| LIST   | 8                    | Text-first, fewer images |
| CARD   | 6                    | Balanced                 |
| GRID   | 8                    | Image-forward but capped |

**Enforcement (FIXED):**

```typescript
// menuPageNew.tsx - G10 ENFORCEMENT
{items.map((item: any, itemIndex: number) => {
    // G10 ENFORCEMENT: Image quota per category
    // Only show images for first N items based on layout quota
    const showItemImage = showImages && itemIndex < layoutConfig.maxImagesPerCategory;

    return (
        <article>
            {showItemImage && item.images?.[0]?.url && (
                // Image renders only within quota
            )}
        </article>
    );
})}
```

- ✅ Quotas **defined** in layout config
- ✅ Quotas **enforced** at render time

---

### G13: Share Preview (OG Tags) ✅ COMPLETE

**Enforcement:** Clean link unfurling on all platforms + **RENDER ORDER GUARANTEE**

- [x] Create `SharePreviewMeta.tsx` component
- [x] Generate Open Graph meta tags
- [x] Generate Twitter Card meta tags
- [x] Clean title format: `{businessName} | Menu`
- [x] Fallback description and image handling
- [x] **Documented render order requirement** (OG meta before skeleton)

**Files Created:**

- `src/components/templates/main-app/projects/b2cView/output/SharePreviewMeta.tsx`

**Meta Tags Generated:**

- `og:title`, `og:description`, `og:image`, `og:url`
- `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- `canonical` URL for SEO

**Critical Render Order (FIXED):**

OG crawlers see initial SSR/SSG output - they don't wait for client hydration.

```tsx
// ✅ CORRECT - OG meta renders outside loading gate
<>
  <SharePreviewMeta ... />
  {isLoading ? <MenuSkeleton /> : <MenuContent />}
</>

// ❌ WRONG - Never inside loading gate
{isLoading ? <MenuSkeleton /> : (
  <>
    <SharePreviewMeta ... />
    <MenuContent />
  </>
)}
```

- ✅ Meta renders **synchronously** on SSR
- ✅ Meta is **deterministic** (no async data dependency)
- ✅ Skeleton doesn't block OG crawlers

---

## Files Summary

### Created

| File                          | Purpose                        |
| ----------------------------- | ------------------------------ |
| `output/MenuSkeleton.tsx`     | G12 skeleton loading component |
| `output/SharePreviewMeta.tsx` | G13 OG meta tags component     |

### Modified

| File                       | Changes                          |
| -------------------------- | -------------------------------- |
| `menuPage/menuPageNew.tsx` | G08 tap feedback classes         |
| `designSystem/index.ts`    | G10 image quota in layout config |

---

## Verification Checklist

- [x] G08: Tap feedback works on touch devices
- [x] G10: Image quotas defined per layout
- [x] G12: Skeleton component created and styled
- [x] G13: Share preview meta tags component created
- [x] No regression in Phase 1 or Phase 2 features

---

## Next: Phase 4 (Advanced)

- G05: Add Offline Resilience (Service Worker)
- G14: Add History Management
- G15: Add Interactive Modifier Pricing
- G16: Add Utility/Fast Mode
