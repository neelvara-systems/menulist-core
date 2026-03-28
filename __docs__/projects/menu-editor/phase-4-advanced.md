# Phase 4: Advanced Features — Implementation Documentation

**Status:** ✅ COMPLETE (except G05 - deferred)
**Date:** December 21, 2025

---

## Overview

Phase 4 addresses advanced UX features that enhance mobile-native feel and operational efficiency.

| Item | Description        | Status               |
| ---- | ------------------ | -------------------- |
| G14  | History Management | ✅ COMPLETE          |
| G16  | Utility/Fast Mode  | ✅ COMPLETE (exists) |
| G05  | Offline Resilience | ⏸️ DEFERRED          |
| G15  | Modifier Pricing   | ❌ NOT APPLICABLE    |

---

## G14: History Management (Stateful PDP Deep Linking) ✅ COMPLETE

**Constitutional Requirement:**

> Back button must always go one step up, never kick you out.

**Problem Solved:**

- User taps item → Modal opens → Back button → ❌ Browser exits/reloads
- This breaks mobile muscle memory and feels "buggy"

**Implementation:**

### Files Modified:

- `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`

### Key Features:

#### 1. Silent URL Change on PDP Open

```typescript
// G14: Push history state for back button support
// Path-based URLs (not hash) for future SEO optionality
window.history.pushState(
  { modal: "item", itemId: item.id },
  "",
  `/menu/item/${item.id}`
);
```

#### 2. Back Button Closes Modal (NOT exits page)

```typescript
// Track selected item for popstate handler (avoids stale closure)
const selectedItemRef = useRef<any>(null);
useEffect(() => {
  selectedItemRef.current = selectedItem;
}, [selectedItem]);

useEffect(() => {
  const handlePopState = () => {
    // Intent-based: only close if PDP is actually open
    // Future-proof for other modals (language picker, filters, etc.)
    if (selectedItemRef.current) {
      setSelectedItem(null);
    }
  };

  window.addEventListener("popstate", handlePopState);
  return () => window.removeEventListener("popstate", handlePopState);
}, []);
```

#### 3. Direct Link Support (Shareable URLs)

```typescript
// G14 - Direct link load: Open PDP if URL contains item path
useEffect(() => {
  // Segment-based parsing (robust against query params, trailing slashes, locale prefixes)
  const pathSegments = window.location.pathname.split("/");
  const itemIndex = pathSegments.indexOf("item");
  if (itemIndex !== -1 && pathSegments[itemIndex + 1]) {
    const itemId = pathSegments[itemIndex + 1];
    const item = allItems.find((i: any) => i.id === itemId);
    if (item) setSelectedItem(item);
  }
}, [allItems]);
```

#### 4. Modal Close Uses History

```typescript
const handleModalClose = useCallback(() => {
  if (historyPushedRef.current) {
    window.history.back(); // Triggers popstate
  } else {
    setSelectedItem(null);
  }
}, []);
```

### UX Flow (After Fix):

```
Scan QR
→ Scroll menu
→ Tap item (URL: /menu/item/123)
→ Back button
→ Menu (same scroll position, URL: /menu)
→ Back button
→ Exit
```

### Sharing Support:

- URLs like `/menu/item/123` are shareable (path-based for SEO)
- Opening shared link auto-opens the item PDP
- Back button still works correctly
- Hash URLs avoided for future crawler compatibility

### Constitutional Guardrails:

- ❌ No Next.js router navigation
- ❌ No full page reload
- ❌ No refetch of menu data
- ✅ Pure browser history API
- ✅ Scroll position preserved

---

## G16: Utility/Fast Mode ✅ ALREADY EXISTS

**Constitutional Requirement:**

> QSRs, food courts, high-volume venues need dense, speed-first layouts.

**Status:** Already implemented as `MenuMood.FAST`

**Location:** `src/components/templates/main-app/projects/b2cView/designSystem/index.ts`

**Key Differences from Other Moods:**

| Property             | CLEAN      | FAST                  |
| -------------------- | ---------- | --------------------- |
| Spacing              | relaxed    | **tight**             |
| Border Radius        | 8px        | **4px**               |
| Image Radius         | 6px        | **3px**               |
| Price Style          | plain      | **badge** (prominent) |
| Layout Compatibility | LIST, GRID | **LIST only**         |

**Structural Enforcement:**

```typescript
[MenuMood.FAST]: {
    spacing: 'tight',  // Dense for speed
    categoryStyle: {
        borderRadius: 4,  // Minimal decoration
    },
    itemStyle: {
        borderRadius: 4,
        imageRadius: 3,
        priceStyle: 'badge',  // Always prominent
    },
}

// Layout lock
MOOD_LAYOUT_COMPATIBILITY[MenuMood.FAST] = [MenuLayout.LIST];
```

---

## G05: Offline Resilience ⏸️ DEFERRED

**Constitutional Requirement:**

> If connection drops after load, menu remains usable.

**Decision:** Deferred to PWA implementation phase.

**Rationale:**

- Requires service worker configuration
- Tied to `next-pwa` dependency already in project
- Should be bundled with full PWA features (install prompt, etc.)

**Future Implementation Path:**

1. Configure `next.config.js` for PWA
2. Create service worker for menu caching
3. Add offline indicator UI

---

## G15: Modifier Pricing ❌ NOT APPLICABLE

**Constitutional Requirement:**

> Add-ons must show price; size changes must update price live.

**Decision:** Deferred by product strategy.

**Rationale:**

> MenuList AI is a **display-first system**, not a transactional engine.

Modifier pricing implies:

- Cart functionality
- Price recomputation
- Tax logic
- POS integration

This changes the product category from "digital menu" to "ordering system."

**When to Revisit:**

- Only if ordering is introduced
- Only if POS integration is built
- Only if restaurants explicitly demand it

**Documentation:**

> G15 — Deferred by Product Strategy
> Rationale: MenuList AI is a display-first system, not a transactional engine.

---

## Files Summary

### Modified

| File                       | Changes                               |
| -------------------------- | ------------------------------------- |
| `menuPage/menuPageNew.tsx` | G14 history management implementation |

### Pre-Existing (No Changes Needed)

| File                    | Status                        |
| ----------------------- | ----------------------------- |
| `designSystem/index.ts` | G16 FAST mood already defined |

---

## Verification Checklist

### G14 — History Management

- [x] Tap item → URL changes to `/menu/item/{id}` (path-based)
- [x] Back button closes PDP (not exit page)
- [x] Second back exits page
- [x] Scroll position preserved after back
- [x] Direct link opens correct item
- [x] X button closes modal correctly

### G16 — Fast Mode

- [x] FAST mood exists in enum
- [x] FAST config uses tight spacing
- [x] FAST only allows LIST layout
- [x] FAST price style is badge

---

## Phase 4 Ship Gate

| Item | Status      | Ship?  |
| ---- | ----------- | ------ |
| G14  | ✅ COMPLETE | ✅ YES |
| G16  | ✅ EXISTS   | ✅ YES |
| G05  | ⏸️ DEFERRED | N/A    |
| G15  | ❌ N/A      | N/A    |

**Phase 4 = SHIP READY** ✅
