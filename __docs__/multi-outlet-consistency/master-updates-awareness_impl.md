# Master Updates Awareness Layer — Implementation Plan

**Feature:** #4.1 — Master Updates Awareness Layer  
**Document Type:** Technical Blueprint (Dev-Only)  
**Status:** ✅ IMPLEMENTED (February 2026)  
**Stack:** Next.js 14 + Firebase (Firestore) + Ant Design + Redux  
**Parent Feature:** #4 — Multi-Outlet Brand Consistency  
**Constraints:** 3-year architecture freeze • backwards-compatible • feature-flagged  
**Date:** January 2026  
**Author:** Cascade (Codebase Authority)

---

## 0. Problem Statement

### The Operational Trust Risk

When a master project owner updates the menu (adds items, changes prices, disables categories), outlet owners have **zero visibility** into what changed. The current architecture uses **read-time resolution** (`resolveProjectForRender()` in `src/lib/multiOutlet/resolveProject.ts:159`), which means master changes propagate silently and instantly.

**Result:** Outlet operations become misaligned. A price change at HQ means the outlet's printed menu, staff training, and customer expectations are suddenly wrong — and the outlet owner doesn't know.

> "Master changes menu → outlet operations not aligned → MenuList looks unreliable"

### Why This Matters Now

The existing multi-outlet system (Feature #4) handles **data consistency** perfectly via the resolver. But it has no mechanism for **operational awareness**. This is the gap between "data is correct" and "humans know data changed."

---

## 1. Solution Philosophy: Calm Awareness

### Core Principle

> **Calm > Speed.** Inform, don't alarm. Persist until acknowledged, don't nag.

This is NOT a notification system. It is an **awareness layer** — a persistent, calm banner that appears on the outlet dashboard when the master has made operational changes. It stays until the outlet owner explicitly acknowledges it.

### What It IS

- A **persistent banner** visible on the projects route for outlet projects
- A **structured diff** of operational changes (not raw data dumps)
- **Outlet-context-aware** (shows impact relative to outlet's overrides)
- **Frontend-computed** at runtime (no backend diff engine)
- **Snapshot-based** (stores last-acknowledged state per outlet)
- A **quiet "Last changes" reference link** always visible for outlet projects (reopenable history)

### What It Is NOT

- ❌ Push notifications or emails
- ❌ Real-time toast/popup alerts
- ❌ Approval workflow (outlet cannot reject master changes)
- ❌ Blocking UI (outlet can continue working)
- ❌ Analytics or comparison dashboard
- ❌ Badge/dot/highlight on the history link (no attention-grabbing after acknowledgment)

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    MASTER PROJECT                                 │
│  projects/{tId}/{masterSId}/{masterProjectId}                    │
│  ├── files[].extractedData.data.items[]                         │
│  ├── files[].extractedData.data.categories[]                    │
│  └── modifiedOn: Timestamp  ← updated on every save             │
└──────────────────────┬───────────────────────────────────────────┘
                       │
          ┌────────────┤ (batch write on operational change)
          │            │
          ▼            │ masterProjectId reference
┌─────────────────┐    ▼
│ SIGNAL DOC (NEW)│   ┌────────────────────────────────────────────┐
│ masterOpState/  │   │              OUTLET PROJECT                 │
│ {masterProjId}  │   │  projects/{tId}/{outletSId}/{outletProjId} │
│                 │   │  ├── masterProjectId: string                │
│ operationalVer  │   │  ├── overrides: { items, categories, ... } │
│ lastUpdatedAt   │   │  │                                          │
│                 │   │  │  ┌── NEW FIELDS ──────────────────────┐ │
│ ~100 bytes      │   │  │  │ masterSnapshot?: {                  │ │
│ Fires ONLY on   │   │  │  │   acknowledgedOn: Timestamp         │ │
│ operational     │   │  │  │   acknowledgedBy: string            │ │
│ changes         │   │  │  │   operationalVersion: number        │ │
└────────┬────────┘   │  │  │   items: SnapshotItem[]             │ │
         │            │  │  │   categories: SnapshotCategory[]    │ │
         │ onSnapshot │  │  │   lastDiff?: MasterUpdateDiff       │ │
         │ listener   │  │  │ }                                   │ │
         ▼            │  │  └─────────────────────────────────────┘ │
┌──────────────────┐  │  └── modifiedOn: Timestamp                  │
│  OUTLET LISTENER │  └────────────────────────────────────────────┘
│  (per outlet)    │
│                  │
│  version changed?│
│  YES → fetch     │
│  master + diff   │
│  NO  → ignore    │
└──────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│              FRONTEND (Outlet Dashboard)                          │
│                                                                  │
│  useMasterUpdateAwareness() hook                                 │
│  ├── 1. Check: Is this an outlet? (masterProjectId exists)      │
│  ├── 2. Attach onSnapshot listener to signal doc                │
│  ├── 3. Compare signal.operationalVersion vs snapshot version   │
│  ├── 4. If version changed: fetch master, compute diff (5s deb) │
│  ├── 5. Return diff + banner + hasHistory + acknowledge()       │
│  └── 6. Cleanup: detach listener on unmount / tab hidden        │
│                                                                  │
│  MasterUpdateBanner component (projects route only)              │
│  ├── Banner: "Main menu updated — N changes" + [Review] [Got it]│
│  ├── Detail modal with outlet context (grouped, fixed order)    │
│  ├── "Got it" → writes snapshot + lastDiff → banner hides       │
│  │                                                               │
│  └── "Last main menu changes" (quiet text link, always visible) │
│      ├── No badge, no icon, no color — just calm text           │
│      ├── Opens same modal showing last acknowledged diff        │
│      └── Persists as long as outlet is linked to master         │
└──────────────────────────────────────────────────────────────────┘
```

### 2.1 Three-Layer Separation

| Layer                    | Collection / Field                         | Purpose                                               | Size       |
| ------------------------ | ------------------------------------------ | ----------------------------------------------------- | ---------- |
| **Truth Layer**          | `projects/{tId}/{sId}/{projectId}`         | Full menu data (items, categories, config)            | 200-400 KB |
| **Signal Layer**         | `masterOperationalState/{masterProjectId}` | Pure trigger — `operationalVersion` + `lastUpdatedAt` | ~100 bytes |
| **Acknowledgment Layer** | `outlet.masterSnapshot`                    | Last-seen state for diff computation                  | ~24 KB     |

This separation ensures outlets listen to a **tiny signal doc** (not the heavy project doc), and the signal fires **only** on operational changes (not UI/theme/config saves).

---

## 3. Feature Flag

### 3.1 Add to `src/config/features.ts`

**File:** `src/config/features.ts`  
**Location:** After `ENABLE_UNLINK_FROM_MASTER` (line ~680)

```typescript
/**
 * Master Updates Awareness Layer (Feature #4.1)
 *
 * true: Show awareness banner on outlet dashboards when master changes
 * false: No awareness banner (outlet still gets master changes via resolver)
 *
 * What It Does:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * - Persistent banner on outlet dashboard when master menu changes
 * - Structured diff of operational changes (items, prices, categories)
 * - Outlet-context-aware (shows impact on local overrides)
 * - Banner persists until explicitly acknowledged by outlet owner
 *
 * What It Does NOT Do:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * - Push notifications or emails
 * - Block outlet from working
 * - Approval workflows
 *
 * Depends on: ENABLE_MULTI_OUTLET must be true
 *
 * @see __docs__/multi-outlet-consistency/master-updates-awareness_impl.md
 *
 * Production: Enable when ready for outlet awareness
 * Development: Enable to test the feature
 */
ENABLE_MASTER_UPDATE_AWARENESS: false, // Default OFF until implementation complete
```

### 3.2 Guard Pattern

```typescript
// Every awareness code path MUST check BOTH flags
if (
  !FEATURE_FLAGS.ENABLE_MULTI_OUTLET ||
  !FEATURE_FLAGS.ENABLE_MASTER_UPDATE_AWARENESS
) {
  return; // No awareness, no banner
}
```

---

## 4. Data Model Extension

### 4.1 Snapshot Types

**File:** `src/types/multiOutlet.types.ts` (EXTEND existing file)  
**Location:** After `DEFAULT_STORE_PERMISSIONS` (line ~161)

```typescript
// ══════════════════════════════════════════════════════════════════════════
// MASTER UPDATE AWARENESS (Feature #4.1)
// Per-outlet snapshot of master menu state at time of acknowledgment
// ══════════════════════════════════════════════════════════════════════════

/**
 * Minimal snapshot of a master item — only operational fields
 *
 * Why minimal: Firestore 1MB document limit. A menu with 200 items
 * at ~100 bytes each = ~20KB. Well within limits.
 */
export interface SnapshotItem {
  id: string;
  name: string; // Primary language name only (en)
  price: string; // e.g., "₹899"
  categoryId: string; // Category this item belongs to
  active: boolean; // Whether item is active in master
}

/**
 * Minimal snapshot of a master category — only operational fields
 */
export interface SnapshotCategory {
  id: string;
  name: string; // Primary language name only (en)
  active: boolean; // Whether category is active in master
}

/**
 * Signal document stored in masterOperationalState/{masterProjectId}.
 * Updated ONLY on operational changes (items/categories/prices).
 * Outlets listen to this via onSnapshot — fires ONLY when real change happens.
 *
 * Collection: masterOperationalState (top-level, NOT nested under tenants)
 * Doc ID: masterProjectId
 */
export interface MasterOperationalState {
  /** Monotonically increasing counter — increments ONLY on operational change */
  operationalVersion: number;

  /** When the last operational change occurred */
  lastUpdatedAt: Timestamp;
}

export interface MasterSnapshot {
  /** When the outlet owner last acknowledged master changes */
  acknowledgedOn: Timestamp;

  /** User ID who acknowledged */
  acknowledgedBy: string;

  /** operationalVersion at time of acknowledgment — sole trigger for awareness */
  operationalVersion: number;

  /** Minimal snapshot of master items at acknowledgment time */
  items: SnapshotItem[];

  /** Minimal snapshot of master categories at acknowledgment time */
  categories: SnapshotCategory[];

  /**
   * Persisted diff from last acknowledgment — enables "Last changes" re-view.
   * Stored so outlet owner can reopen the modal anytime without re-computing.
   * Set to null on initial link (no diff yet).
   */
  lastDiff?: MasterUpdateDiff | null;
}

/**
 * Operational change types that trigger the awareness banner.
 * Cosmetic changes (theme, images, descriptions) are EXCLUDED.
 */
export type OperationalChangeType =
  | "ITEM_ADDED" // New item in master
  | "ITEM_REMOVED" // Item deleted from master
  | "ITEM_PRICE_CHANGED" // Price changed
  | "ITEM_DISABLED" // Item set to active=false
  | "ITEM_ENABLED" // Item set back to active=true
  | "CATEGORY_ADDED" // New category
  | "CATEGORY_REMOVED" // Category deleted
  | "CATEGORY_DISABLED" // Category set to active=false
  | "CATEGORY_ENABLED" // Category set back to active=true
  | "ITEM_MOVED_CATEGORY"; // Item changed category

/**
 * Single operational change with outlet context
 */
export interface OperationalChange {
  type: OperationalChangeType;

  /** Item or category ID */
  entityId: string;

  /** Display name (primary language) */
  entityName: string;

  /** Previous value (for changes, not adds/removes) */
  oldValue?: string;

  /** New value */
  newValue?: string;

  /** Outlet-specific context */
  outletContext?: {
    /** Whether outlet has an override on this item */
    hasOverride: boolean;
    /** What the outlet's override value is (e.g., outlet price) */
    overrideValue?: string;
    /** Human-readable impact description */
    impactNote?: string;
  };
}

/**
 * Complete diff result from awareness computation
 */
export interface MasterUpdateDiff {
  /** Whether there are any operational changes */
  hasChanges: boolean;

  /** Individual changes grouped by type */
  changes: OperationalChange[];

  /** Summary counts for banner display */
  summary: {
    itemsAdded: number;
    itemsRemoved: number;
    priceChanges: number;
    itemsDisabled: number;
    itemsEnabled: number;
    categoriesAdded: number;
    categoriesRemoved: number;
    categoriesDisabled: number;
    categoriesEnabled: number;
    itemsMovedCategory: number;
  };

  /** When the master was last modified */
  masterModifiedOn: Timestamp;

  /** Total count of all changes */
  totalChanges: number;
}
```

### 4.2 Project Type Extension

**File:** `src/components/templates/main-app/projects/types/project.types.ts`  
**Location:** After `overrides?: ProjectOverrides;` (line ~235)

```typescript
// Add to Project interface:

/**
 * Per-outlet snapshot of master menu at last acknowledgment (Feature #4.1)
 * Written when outlet owner clicks "I've seen this" on the awareness banner.
 * Used to compute diff against current master state.
 */
masterSnapshot?: MasterSnapshot;
```

**Import required:** Add `MasterSnapshot` import from `@type/multiOutlet.types`.

### 4.3 Firestore Document Size Analysis

**Worst case estimate (200-item menu):**

| Field                    | Size per entry                                           | Count      | Total      |
| ------------------------ | -------------------------------------------------------- | ---------- | ---------- |
| `SnapshotItem`           | ~80 bytes (id + name + price + categoryId + active)      | 200        | ~16 KB     |
| `SnapshotCategory`       | ~50 bytes (id + name + active)                           | 30         | ~1.5 KB    |
| `lastDiff`               | ~120 bytes per change (type + entityId + name + context) | 50 (worst) | ~6 KB      |
| Metadata fields          | ~200 bytes                                               | 1          | 200 bytes  |
| **Total masterSnapshot** |                                                          |            | **~24 KB** |

**Firestore 1MB limit:** 24 KB is **2.4%** of the limit. Even a 500-item menu with 100 changes (~55 KB) is well within bounds. The existing project document with full `files[]` data is typically 200-400 KB, so adding 24 KB is negligible.

> **Why no hash fields or modifiedOn?** The `operationalVersion` from the signal doc is the sole change trigger.
> `modifiedOn` changes on every save (including UI config/theme) — too noisy. `operationalVersion` changes ONLY on operational saves.
> Hashes would be dead code — stored but never compared. Removed to keep snapshot minimal.

---

## 5. Core Logic: Diff Computation

### 5.1 Diff Engine

**File:** `src/lib/multiOutlet/masterUpdateDiff.ts` (NEW)

This is a **pure function** — no Firestore calls, no side effects. Takes snapshot + current master data and returns a structured diff.

```typescript
/**
 * Master Update Diff Engine
 *
 * Computes operational differences between the stored snapshot
 * and the current master menu state. Runs in the browser at runtime.
 *
 * Design decisions:
 * - Pure function (testable, no side effects)
 * - Only tracks OPERATIONAL changes (not cosmetic)
 * - Includes outlet context (override awareness)
 * - Returns structured data for UI rendering
 *
 * @see __docs__/multi-outlet-consistency/master-updates-awareness_impl.md
 */

import {
  ExtractedDataCategory,
  ExtractedDataItem,
} from "@template/main-app/projects/types/extractedData.types";
import { ProjectOverrides } from "@template/main-app/projects/types/project.types";
import {
  MasterUpdateDiff,
  OperationalChange,
  SnapshotCategory,
  SnapshotItem,
} from "@type/multiOutlet.types";

/**
 * Compute operational diff between snapshot and current master state
 *
 * @param snapshotItems - Items from outlet's masterSnapshot
 * @param snapshotCategories - Categories from outlet's masterSnapshot
 * @param currentItems - Current master project items
 * @param currentCategories - Current master project categories
 * @param outletOverrides - Outlet's current overrides (for context)
 * @param masterModifiedOn - Master's current modifiedOn timestamp
 */
export function computeMasterUpdateDiff(
  snapshotItems: SnapshotItem[],
  snapshotCategories: SnapshotCategory[],
  currentItems: ExtractedDataItem[],
  currentCategories: ExtractedDataCategory[],
  outletOverrides: ProjectOverrides | undefined,
  masterModifiedOn: Timestamp,
): MasterUpdateDiff {
  const changes: OperationalChange[] = [];
  const overrides = outletOverrides || {
    items: {},
    categories: {},
    attributes: {},
  };

  // Build lookup maps
  const snapshotItemMap = new Map(snapshotItems.map((i) => [i.id, i]));
  const currentItemMap = new Map(currentItems.map((i) => [i.id, i]));
  const snapshotCatMap = new Map(snapshotCategories.map((c) => [c.id, c]));
  const currentCatMap = new Map(currentCategories.map((c) => [c.id, c]));

  // ── ITEM CHANGES ──────────────────────────────────────────────

  // Items added (in current but not in snapshot)
  for (const [id, item] of currentItemMap) {
    if (!snapshotItemMap.has(id)) {
      changes.push({
        type: "ITEM_ADDED",
        entityId: id,
        entityName: getItemPrimaryName(item),
        newValue: item.price || "",
        outletContext: {
          hasOverride: false,
          impactNote: "New item will appear in your menu",
        },
      });
    }
  }

  // Items removed (in snapshot but not in current)
  for (const [id, snapItem] of snapshotItemMap) {
    if (!currentItemMap.has(id)) {
      const hasOverride = Boolean(overrides.items[id]);
      changes.push({
        type: "ITEM_REMOVED",
        entityId: id,
        entityName: snapItem.name,
        oldValue: snapItem.price,
        outletContext: {
          hasOverride,
          impactNote: hasOverride
            ? "This item had local overrides which are now orphaned"
            : "Item removed from your menu",
        },
      });
    }
  }

  // Items changed (present in both)
  for (const [id, currentItem] of currentItemMap) {
    const snapItem = snapshotItemMap.get(id);
    if (!snapItem) continue;

    const currentName = getItemPrimaryName(currentItem);
    const currentPrice = currentItem.price || "";
    const itemOverride = overrides.items[id];

    // Price change
    if (currentPrice !== snapItem.price) {
      changes.push({
        type: "ITEM_PRICE_CHANGED",
        entityId: id,
        entityName: currentName,
        oldValue: snapItem.price,
        newValue: currentPrice,
        outletContext: {
          hasOverride: Boolean(itemOverride?.price),
          overrideValue: itemOverride?.price,
          impactNote: itemOverride?.price
            ? `Your outlet price (${itemOverride.price}) is unaffected`
            : `Your menu will show the new price: ${currentPrice}`,
        },
      });
    }

    // Active state change
    if (currentItem.active !== snapItem.active) {
      changes.push({
        type: currentItem.active ? "ITEM_ENABLED" : "ITEM_DISABLED",
        entityId: id,
        entityName: currentName,
        oldValue: String(snapItem.active),
        newValue: String(currentItem.active),
        outletContext: {
          hasOverride: Boolean(itemOverride?.active !== undefined),
          impactNote: currentItem.active
            ? "Item is now visible in your menu"
            : "Item is now hidden from your menu",
        },
      });
    }

    // Category change (item moved to different category)
    if (currentItem.category !== snapItem.categoryId) {
      changes.push({
        type: "ITEM_MOVED_CATEGORY",
        entityId: id,
        entityName: currentName,
        oldValue: snapItem.categoryId,
        newValue: currentItem.category,
        outletContext: {
          hasOverride: false,
          impactNote: "Item moved to a different category",
        },
      });
    }
  }

  // ── CATEGORY CHANGES ──────────────────────────────────────────

  // Categories added
  for (const [id, cat] of currentCatMap) {
    if (!snapshotCatMap.has(id)) {
      changes.push({
        type: "CATEGORY_ADDED",
        entityId: id,
        entityName: getCategoryPrimaryName(cat),
        outletContext: {
          hasOverride: false,
          impactNote: "New category will appear in your menu",
        },
      });
    }
  }

  // Categories removed
  for (const [id, snapCat] of snapshotCatMap) {
    if (!currentCatMap.has(id)) {
      const hasOverride = Boolean(overrides.categories[id]);
      changes.push({
        type: "CATEGORY_REMOVED",
        entityId: id,
        entityName: snapCat.name,
        outletContext: {
          hasOverride,
          impactNote: hasOverride
            ? "This category had local overrides which are now orphaned"
            : "Category removed from your menu",
        },
      });
    }
  }

  // Categories changed (active state)
  for (const [id, currentCat] of currentCatMap) {
    const snapCat = snapshotCatMap.get(id);
    if (!snapCat) continue;

    if (currentCat.active !== snapCat.active) {
      changes.push({
        type: currentCat.active ? "CATEGORY_ENABLED" : "CATEGORY_DISABLED",
        entityId: id,
        entityName: getCategoryPrimaryName(currentCat),
        oldValue: String(snapCat.active),
        newValue: String(currentCat.active),
        outletContext: {
          hasOverride: Boolean(overrides.categories[id]?.active !== undefined),
          impactNote: currentCat.active
            ? "Category is now visible in your menu"
            : "Category is now hidden from your menu",
        },
      });
    }
  }

  // ── BUILD SUMMARY ─────────────────────────────────────────────

  const summary = {
    itemsAdded: changes.filter((c) => c.type === "ITEM_ADDED").length,
    itemsRemoved: changes.filter((c) => c.type === "ITEM_REMOVED").length,
    priceChanges: changes.filter((c) => c.type === "ITEM_PRICE_CHANGED").length,
    itemsDisabled: changes.filter((c) => c.type === "ITEM_DISABLED").length,
    itemsEnabled: changes.filter((c) => c.type === "ITEM_ENABLED").length,
    categoriesAdded: changes.filter((c) => c.type === "CATEGORY_ADDED").length,
    categoriesRemoved: changes.filter((c) => c.type === "CATEGORY_REMOVED")
      .length,
    categoriesDisabled: changes.filter((c) => c.type === "CATEGORY_DISABLED")
      .length,
    categoriesEnabled: changes.filter((c) => c.type === "CATEGORY_ENABLED")
      .length,
    itemsMovedCategory: changes.filter((c) => c.type === "ITEM_MOVED_CATEGORY")
      .length,
  };

  return {
    hasChanges: changes.length > 0,
    changes,
    summary,
    masterModifiedOn,
    totalChanges: changes.length,
  };
}

// ══════════════════════════════════════════════════════════════════
// SNAPSHOT CREATION
// Build minimal snapshot from current master data
// ══════════════════════════════════════════════════════════════════

/**
 * Create a minimal snapshot from master project data
 * Called when outlet owner acknowledges changes
 *
 * @param operationalVersion - Current operationalVersion from signal doc
 * @param lastDiff - The computed diff to persist for "Last changes" re-view.
 *                   Pass null on initial link (no diff yet).
 */
export function createMasterSnapshot(
  masterItems: ExtractedDataItem[],
  masterCategories: ExtractedDataCategory[],
  operationalVersion: number,
  acknowledgedBy: string,
  lastDiff: MasterUpdateDiff | null = null,
): MasterSnapshot {
  const items: SnapshotItem[] = masterItems.map((item) => ({
    id: item.id,
    name: getItemPrimaryName(item),
    price: item.price || "",
    categoryId: item.category,
    active: item.active,
  }));

  const categories: SnapshotCategory[] = masterCategories.map((cat) => ({
    id: cat.id,
    name: getCategoryPrimaryName(cat),
    active: cat.active,
  }));

  return {
    acknowledgedOn: Timestamp.now(),
    acknowledgedBy,
    operationalVersion,
    items,
    categories,
    lastDiff,
  };
}

// ══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// Extract primary language names from multilingual objects
// ══════════════════════════════════════════════════════════════════

/**
 * Get primary language name from an ExtractedDataItem
 * Falls back through: en → first available key → 'Unknown'
 */
function getItemPrimaryName(item: ExtractedDataItem): string {
  if (!item.name) return "Unknown";
  return item.name["en"] || Object.values(item.name)[0] || "Unknown";
}

/**
 * Get primary language name from an ExtractedDataCategory
 */
function getCategoryPrimaryName(cat: ExtractedDataCategory): string {
  if (!cat.name) return "Unknown";
  return cat.name["en"] || Object.values(cat.name)[0] || "Unknown";
}
```

### 5.2 What Counts as "Operational" vs "Cosmetic"

| Change Type             | Operational? | Reason                                                  |
| ----------------------- | :----------: | ------------------------------------------------------- |
| Item added/removed      |      ✅      | Staff needs to know what's on the menu                  |
| Price changed           |      ✅      | Directly affects customer billing                       |
| Item active toggled     |      ✅      | Item appears/disappears from menu                       |
| Category added/removed  |      ✅      | Menu structure changed                                  |
| Category active toggled |      ✅      | Entire section appears/disappears                       |
| Item moved category     |      ✅      | Menu organization changed                               |
| Item name changed       |      ❌      | Brand consistency (locked field, outlet can't override) |
| Description changed     |      ❌      | Brand consistency (locked field)                        |
| Image changed           |      ❌      | Visual only, no operational impact                      |
| Tags changed            |      ❌      | Dietary info (locked field)                             |
| Theme/config changed    |      ❌      | Not inherited by outlets anyway                         |

---

## 6. Awareness Hook

### 6.1 Hook Implementation

**File:** `src/hooks/useMasterUpdateAwareness.ts` (NEW)

This hook is the core runtime engine. It listens to the `masterOperationalState` signal doc via `onSnapshot`, fetches master data on version change, computes diffs against the stored snapshot, and manages banner state.

**Pattern reference:** Follows the same `onSnapshot` architecture as `useMasterJobStatus.ts` (`src/hooks/useMasterJobStatus.ts:43`), which already uses Firestore listeners for real-time multi-outlet state.

```typescript
"use client";

/**
 * Master Update Awareness Hook
 *
 * Listens to masterOperationalState signal doc via onSnapshot.
 * When operationalVersion increases, fetches master project,
 * computes diff against outlet's stored snapshot, and shows banner.
 *
 * Architecture:
 * 1. Attach onSnapshot listener to masterOperationalState/{masterProjectId}
 * 2. Compare signal.operationalVersion vs snapshot.operationalVersion
 * 3. If version changed: fetch master project (debounced 5s)
 * 4. Compute structured diff (items added/removed, prices, etc.)
 * 5. Show banner with diff summary
 * 6. On acknowledge: write new snapshot + lastDiff to outlet project
 * 7. Cleanup: detach listener on unmount or tab hidden
 *
 * Why onSnapshot on signal doc (not polling master project):
 * - Signal doc is ~100 bytes (vs 200-400KB master project)
 * - Fires ONLY on operational changes (not UI config/theme saves)
 * - At 500 outlets: ~5,000 reads/day vs ~120,000 reads/day with polling
 * - Instant awareness (no 2-minute delay)
 * - No stability window needed (operationalVersion doesn't change on autosave noise)
 *
 * @see __docs__/multi-outlet-consistency/master-updates-awareness_impl.md
 */

import { FEATURE_FLAGS } from "@config/features";
import { getProjectDataByStore } from "@database/projects";
import { parseProjectId } from "@lib/multiOutlet/resolveProject";
import {
  computeMasterUpdateDiff,
  createMasterSnapshot,
} from "@lib/multiOutlet/masterUpdateDiff";
import {
  ExtractedDataCategory,
  ExtractedDataItem,
} from "@template/main-app/projects/types/extractedData.types";
import { Project } from "@template/main-app/projects/types/project.types";
import {
  MasterSnapshot,
  MasterUpdateDiff,
  MasterOperationalState,
} from "@type/multiOutlet.types";
import { Timestamp } from "firebase/firestore";
import { updateDoc, doc, onSnapshot } from "firebase/firestore";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { DB_COLLECTIONS } from "@constant/database";
import getActiveSession from "@lib/auth/getActiveSession";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Debounce for listener callback — prevents wasted computation
 * if master makes rapid operational changes (e.g., adding 5 items quickly).
 * Much simpler than old 30s stability window because operationalVersion
 * only changes on intentional operational saves, not noisy autosaves.
 */
const LISTENER_DEBOUNCE_MS = 5 * 1000;

export interface MasterUpdateAwarenessState {
  /** Whether the banner should be visible */
  showBanner: boolean;

  /** The computed diff (null if no changes or still loading) */
  diff: MasterUpdateDiff | null;

  /** Whether the hook is currently checking for changes */
  isChecking: boolean;

  /** Error message if check failed */
  error: string | null;

  /** Function to acknowledge changes (writes snapshot, hides banner) */
  acknowledge: () => Promise<void>;

  /** Whether acknowledge is in progress */
  isAcknowledging: boolean;

  /** Force re-check for changes */
  recheck: () => void;

  /** Whether there is a previously acknowledged diff available for re-viewing */
  hasHistory: boolean;

  /** The last acknowledged diff (for "Last changes" link re-view) */
  lastDiff: MasterUpdateDiff | null;
}

/**
 * Hook to detect and display master menu changes for outlet projects.
 *
 * @param outletProject - The current outlet project (null if not loaded)
 * @returns Awareness state for UI rendering
 */
export function useMasterUpdateAwareness(
  outletProject: Project | null,
): MasterUpdateAwarenessState {
  const [showBanner, setShowBanner] = useState(false);
  const [diff, setDiff] = useState<MasterUpdateDiff | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  // Refs for debounce timer, master project cache, and latest signal version
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const masterProjectRef = useRef<Project | null>(null);
  const latestVersionRef = useRef<number>(0);

  // ── FETCH MASTER + COMPUTE DIFF ───────────────────────────────

  const computeAndShowDiff = useCallback(async () => {
    // Gate: Must be an outlet project with masterProjectId
    if (!outletProject?.masterProjectId || !outletProject?.projectId) {
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      // 1. Fetch current master project
      const { tId, sId: masterStoreId } = parseProjectId(
        outletProject.masterProjectId,
      );

      const masterProject = await getProjectDataByStore(
        tId,
        masterStoreId,
        outletProject.masterProjectId,
      );

      masterProjectRef.current = masterProject;

      if (!masterProject?.files?.length) {
        setShowBanner(false);
        setDiff(null);
        setIsChecking(false);
        return;
      }

      // 2. Get outlet's stored snapshot
      const snapshot = outletProject.masterSnapshot as
        | MasterSnapshot
        | undefined;

      // If no snapshot exists — no banner (initial snapshot created on link)
      if (!snapshot) {
        setShowBanner(false);
        setDiff(null);
        setIsChecking(false);
        return;
      }

      // 3. Compute full diff against snapshot
      const currentItems = extractItemsFromProject(masterProject);
      const currentCategories = extractCategoriesFromProject(masterProject);
      const masterModifiedOn = (masterProject as any).modifiedOn as Timestamp;

      const computedDiff = computeMasterUpdateDiff(
        snapshot.items,
        snapshot.categories,
        currentItems,
        currentCategories,
        outletProject.overrides,
        masterModifiedOn,
      );

      // 4. Update state
      if (computedDiff.hasChanges) {
        setDiff(computedDiff);
        setShowBanner(true);
      } else {
        // Version changed but no operational diff detected
        // (edge case: could happen if changes cancel out)
        setDiff(null);
        setShowBanner(false);
      }
    } catch (err) {
      console.error("[MasterUpdateAwareness] Check failed:", err);
      setError("Failed to check for master updates");
      // Fail open — don't show banner on error
      setShowBanner(false);
    } finally {
      setIsChecking(false);
    }
  }, [outletProject]);

  // ── ACKNOWLEDGE CHANGES ───────────────────────────────────────

  const acknowledge = useCallback(async () => {
    if (!outletProject?.projectId || !masterProjectRef.current) return;

    setIsAcknowledging(true);

    try {
      const session = await getActiveSession();
      const masterProject = masterProjectRef.current;

      // Create new snapshot from current master state
      const currentItems = extractItemsFromProject(masterProject);
      const currentCategories = extractCategoriesFromProject(masterProject);

      // Persist the current diff so "Last changes" link can re-show it
      const diffToStore = diff;

      const newSnapshot = createMasterSnapshot(
        currentItems,
        currentCategories,
        latestVersionRef.current, // Store current operationalVersion
        session?.uId || "unknown",
        diffToStore, // Persist diff for "Last changes" re-view
      );

      // Write snapshot to outlet project document
      const { tId, sId } = parseProjectId(outletProject.projectId);
      const projectRef = doc(
        firebaseClient,
        `${DB_COLLECTIONS.PROJECTS}/${tId}/${sId}`,
        outletProject.projectId,
      );

      await updateDoc(projectRef, {
        masterSnapshot: newSnapshot,
      });

      // Hide banner but keep lastDiff accessible for "Last changes" link
      setShowBanner(false);
      setDiff(null);
    } catch (err) {
      console.error("[MasterUpdateAwareness] Acknowledge failed:", err);
      setError("Failed to acknowledge changes");
    } finally {
      setIsAcknowledging(false);
    }
  }, [outletProject, diff]);

  // ── RECHECK ───────────────────────────────────────────────────

  const recheck = useCallback(() => {
    computeAndShowDiff();
  }, [computeAndShowDiff]);

  // ── LIFECYCLE: onSnapshot LISTENER ────────────────────────────

  useEffect(() => {
    // Gate: Feature flags
    if (
      !FEATURE_FLAGS.ENABLE_MULTI_OUTLET ||
      !FEATURE_FLAGS.ENABLE_MASTER_UPDATE_AWARENESS
    ) {
      return;
    }

    // Gate: Must be an outlet project with masterProjectId
    if (!outletProject?.masterProjectId || !outletProject?.projectId) {
      setShowBanner(false);
      setDiff(null);
      return;
    }

    const snapshot = outletProject.masterSnapshot as MasterSnapshot | undefined;
    const acknowledgedVersion = snapshot?.operationalVersion ?? 0;

    // Attach listener to signal doc
    const signalDocRef = doc(
      firebaseClient,
      DB_COLLECTIONS.MASTER_OPERATIONAL_STATE,
      outletProject.masterProjectId,
    );

    const unsubscribe = onSnapshot(
      signalDocRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          // Signal doc doesn't exist yet (master hasn't been set up)
          setShowBanner(false);
          return;
        }

        const signalData = docSnap.data() as MasterOperationalState;
        const incomingVersion = signalData.operationalVersion;
        latestVersionRef.current = incomingVersion;

        // Compare against acknowledged version
        if (incomingVersion <= acknowledgedVersion) {
          // No new changes since last acknowledgment
          setShowBanner(false);
          setDiff(null);
          return;
        }

        // Version changed — debounce the fetch + diff computation
        // This handles rapid operational edits (e.g., adding 5 items quickly)
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          computeAndShowDiff();
        }, LISTENER_DEBOUNCE_MS);
      },
      (err) => {
        console.error("[MasterUpdateAwareness] Listener error:", err);
        // Fail open — don't show banner on error
        setShowBanner(false);
      },
    );

    // Cleanup: detach listener
    return () => {
      unsubscribe();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [outletProject?.projectId, outletProject?.masterProjectId]);

  // Derive history state from outlet project's persisted snapshot
  const snapshot = outletProject?.masterSnapshot as MasterSnapshot | undefined;
  const hasHistory = Boolean(snapshot?.lastDiff);
  const persistedLastDiff = snapshot?.lastDiff || null;

  return {
    showBanner,
    diff,
    isChecking,
    error,
    acknowledge,
    isAcknowledging,
    recheck,
    hasHistory,
    lastDiff: persistedLastDiff,
  };
}

// ══════════════════════════════════════════════════════════════════
// HELPER: Extract items/categories from project
// Reuses same logic as resolveProject.ts
// ══════════════════════════════════════════════════════════════════

function extractItemsFromProject(project: Project): ExtractedDataItem[] {
  return (
    project.files?.flatMap((f) => f.extractedData?.data?.items || []) || []
  );
}

function extractCategoriesFromProject(
  project: Project,
): ExtractedDataCategory[] {
  return (
    project.files?.flatMap((f) => f.extractedData?.data?.categories || []) || []
  );
}

export default useMasterUpdateAwareness;
```

### 6.2 Why onSnapshot on Signal Doc (Not Polling, Not Listener on Master Doc)

**Decision: Firestore `onSnapshot` listener on `masterOperationalState/{masterProjectId}` signal doc**

**Decision History:** Originally designed as polling (every 2 min). Changed to signal doc + listener after analyzing scale requirements (500+ outlets) and the `modifiedOn` noise problem.

| Approach                       | Cost (500 outlets, 8hr/day) | Reliability       | False Triggers                 |
| ------------------------------ | --------------------------- | ----------------- | ------------------------------ |
| Polling master doc (2 min)     | ~120,000 reads/day          | Good (2min delay) | ⚠️ All saves trigger           |
| `onSnapshot` on master doc     | ~25,000 reads/day           | Instant           | ⚠️ All saves trigger           |
| **`onSnapshot` on signal doc** | **~5,000 reads/day**        | **Instant**       | **✅ Zero (operational only)** |

**Why signal doc + listener wins:**

1. **No false positives** — `operationalVersion` only increments on operational changes (items/prices/categories). UI config, theme, description, image changes do NOT trigger the listener. With `modifiedOn`, every save triggers — causing false banners.
2. **Instant awareness** — No 2-minute polling delay. The moment master makes an operational change, outlets know.
3. **24x cheaper than polling at scale** — Listener fires only on real changes (~10/day), not every 2 minutes (~720/day).
4. **Tiny doc** — Signal doc is ~100 bytes vs master project's 200-400KB. Less network, memory, and parsing cost per listener fire.
5. **No stability window needed** — `operationalVersion` doesn't increment on autosave noise (theme/config changes). A simple 5s debounce handles rapid operational edits.
6. **Existing pattern** — `useMasterJobStatus.ts` (`src/hooks/useMasterJobStatus.ts:65`) already uses `onSnapshot` for multi-outlet awareness. Same architecture.

**The root cause the signal doc solves:**
`modifiedOn` (set by `requestBodyComposer()` at `src/lib/apiHelper/index.ts:113`) changes on **every** `updateProject()` call — including non-operational saves. The old stability window was a workaround for this noise. `operationalVersion` eliminates the noise at the source.

### 6.3 Listener Lifecycle Rules

**Attach listener when:**

- Outlet project is loaded AND
- `masterProjectId` exists AND
- Feature flags are enabled AND
- Tab is active (`document.visibilityState === 'visible'`)

**Detach listener when:**

- Leaving projects route
- Logging out
- Tab becomes hidden (optional optimization — reduces idle connections)
- Component unmounts

**At 500+ outlets:** Each idle tab = 1 open connection. Detaching on tab hidden prevents connection waste.

---

## 7. Snapshot Write Rules

> **🔒 SNAPSHOT WRITE RULE (Locked):**
> The snapshot is written in exactly **two** scenarios:
>
> 1. **Initial link** — when outlet is first linked to master (baseline, no banner)
> 2. **"Got it" click** — when outlet owner explicitly acknowledges changes
>
> **NEVER** auto-write snapshot during polling, on first change detection, or in the background.
> This is an **acknowledgment system**, not a sync system.

### 7.1 When To Create The First Snapshot

The first snapshot must be created when an outlet is **first linked to a master** (via `linkStoreToMaster()` in `src/database/multiOutlet/index.ts:722`).

**File:** `src/database/multiOutlet/index.ts`  
**Location:** Inside `linkStoreToMaster()`, after writing `masterProjectId` (line ~769)

```typescript
// After: await updateDoc(storeRef, { masterProjectId, overrides: ... });

// Create initial master snapshot so awareness layer has a baseline
if (FEATURE_FLAGS.ENABLE_MASTER_UPDATE_AWARENESS) {
  try {
    const { createMasterSnapshot } =
      await import("@lib/multiOutlet/masterUpdateDiff");
    const masterItems =
      masterProject.files?.flatMap(
        (f: any) => f.extractedData?.data?.items || [],
      ) || [];
    const masterCategories =
      masterProject.files?.flatMap(
        (f: any) => f.extractedData?.data?.categories || [],
      ) || [];

    // Read current operationalVersion from signal doc (or default to 0)
    let currentVersion = 0;
    try {
      const signalDocRef = doc(
        firebaseClient,
        DB_COLLECTIONS.MASTER_OPERATIONAL_STATE,
        masterProjectId,
      );
      const signalSnap = await getDoc(signalDocRef);
      if (signalSnap.exists()) {
        currentVersion = signalSnap.data().operationalVersion || 0;
      }
    } catch {
      // Signal doc may not exist yet — version 0 is correct baseline
    }

    const initialSnapshot = createMasterSnapshot(
      masterItems,
      masterCategories,
      currentVersion, // operationalVersion as baseline
      session.uId,
    );

    await updateDoc(storeRef, {
      masterSnapshot: initialSnapshot,
    });
  } catch (e) {
    // Silent fail — don't block linking
    console.warn(
      "[MasterUpdateAwareness] Failed to create initial snapshot:",
      e,
    );
  }
}
```

### 7.2 Migration: Existing Linked Outlets Without Snapshot

For outlets already linked before this feature ships, `masterSnapshot` will be `undefined`. The hook handles this in step 3:

```typescript
// If no snapshot exists, this is the first time — don't show banner
if (!snapshot) {
  setShowBanner(false);
  return;
}
```

**The first acknowledge** (triggered manually or via a one-time "Set baseline" action in settings) creates the initial snapshot. Until then, no banner appears — which is the correct behavior (outlet owner hasn't opted into awareness yet).

**Alternative:** Auto-create snapshot on first hook run for existing outlets. This can be added as a silent one-time operation:

```typescript
// In useMasterUpdateAwareness, after detecting no snapshot:
if (!snapshot && FEATURE_FLAGS.ENABLE_MASTER_UPDATE_AWARENESS) {
  // Auto-create baseline snapshot silently
  await acknowledge(); // Creates snapshot without showing banner
  return;
}
```

---

## 8. Signal Doc Collection & Master Save Pipeline

### 8.1 New Firestore Collection: `masterOperationalState`

**Collection:** `masterOperationalState` (top-level, NOT nested under tenants)  
**Doc ID:** `{masterProjectId}`  
**Purpose:** Pure trigger — tiny signal document that outlets listen to via `onSnapshot`

```
masterOperationalState/
└── {masterProjectId}/
    ├── operationalVersion: number    // Monotonically increasing
    └── lastUpdatedAt: Timestamp      // When last operational change occurred
```

**Why top-level (not nested under tenants)?**

- The `masterProjectId` is globally unique (includes `tId` and `sId`)
- Outlets already have the `masterProjectId` — no need to know tenant path
- Simpler `onSnapshot` reference: `doc(firebaseClient, "masterOperationalState", masterProjectId)`
- Follows same pattern as `menuImageProcessingJobs` (top-level, queried by `projectId`)

**Doc size:** ~100 bytes. Firestore minimum charge = 1 read regardless of size, so tiny doc = minimal network/parsing cost.

### 8.2 Add to DB_COLLECTIONS

**File:** `src/constants/database.ts`  
**Location:** After `MENU_CHANGE_LOG` (line ~70)

```typescript
// Master Updates Awareness Layer (Feature #4.1)
// Signal doc for operational version — outlets listen via onSnapshot
// @see __docs__/multi-outlet-consistency/master-updates-awareness_impl.md
MASTER_OPERATIONAL_STATE: "masterOperationalState",
```

### 8.3 Operational Change Detection in Master Save Pipeline

**File:** `src/database/projects/index.ts`  
**Location:** Inside `updateProject()`, after the master cache invalidation block (line ~420)

The key insight: `updateProject()` already fetches `oldProject` (line 386-397) and detects master vs outlet (line 412). We add operational change detection **here**, using the existing `oldProject` and `data` comparison.

**What counts as an operational change** (same as Section 5.3 diff inclusion rules):

| Field                                                          | Operational? | Reason                                 |
| -------------------------------------------------------------- | ------------ | -------------------------------------- |
| `files[].extractedData.data.items[]` (add/remove/price/active) | ✅ YES       | Directly affects outlet menu           |
| `files[].extractedData.data.categories[]` (add/remove/active)  | ✅ YES       | Affects menu structure                 |
| Theme, config, description, images                             | ❌ NO        | Not inherited or no operational impact |

```typescript
// Inside updateProject(), after master cache invalidation block:

// Master Updates Awareness: Increment operationalVersion on operational changes
// This fires ONLY when items/categories/prices change — NOT on UI config saves.
// Outlets listen to this signal doc via onSnapshot for instant awareness.
if (
  FEATURE_FLAGS.ENABLE_MULTI_OUTLET &&
  FEATURE_FLAGS.ENABLE_MASTER_UPDATE_AWARENESS &&
  data.projectId &&
  oldProject &&
  !oldProject.masterProjectId // This IS a master project
) {
  try {
    const hasOperationalChange = detectOperationalChange(oldProject, data);

    if (hasOperationalChange) {
      const {
        doc: firestoreDoc,
        setDoc,
        increment,
        Timestamp,
      } = await import("firebase/firestore");

      const signalDocRef = firestoreDoc(
        firebaseClient,
        DB_COLLECTIONS.MASTER_OPERATIONAL_STATE,
        data.projectId as string,
      );

      // Atomic increment — no read needed, handles concurrent saves safely.
      // setDoc with merge: creates doc if absent (version starts at 1).
      // increment() is a Firestore field transform — server-side atomic operation.
      await setDoc(
        signalDocRef,
        {
          operationalVersion: increment(1),
          lastUpdatedAt: Timestamp.now(),
        },
        { merge: true },
      );
    }
  } catch (e) {
    // Silent fail — don't block master save
    console.warn(
      "[MasterUpdateAwareness] Signal doc update failed (non-blocking):",
      e,
    );
  }
}
```

> **Note:** `increment()` is a Firestore server-side atomic operation. If the doc doesn't exist yet, `setDoc` with `merge: true` creates it with `operationalVersion: 1`. If it exists, `increment(1)` atomically adds 1 to the current value. This eliminates the read-then-write race condition where two concurrent saves could skip a version.

### 8.4 Operational Change Detection Function

**File:** `src/lib/multiOutlet/masterUpdateDiff.ts` (same file as diff engine)  
**Location:** After the `computeMasterUpdateDiff` function

This is a **lightweight comparison** — not a full diff, just a boolean "did anything operational change?"

```typescript
/**
 * Detect if a project update contains operational changes.
 *
 * Operational = items/categories added/removed, prices, active status.
 * NON-operational = theme, config, description, images.
 *
 * This is intentionally lightweight — just checks if items/categories
 * arrays differ in length or key operational fields. No full diff needed.
 *
 * @param oldProject - Project state before save
 * @param newData - Partial project data being saved
 * @returns true if operational change detected
 */
export function detectOperationalChange(
  oldProject: Project,
  newData: Partial<Project>,
): boolean {
  // If newData doesn't include files, no operational change
  if (!newData.files) return false;

  const oldItems = extractItemsFromProject(oldProject);
  const newItems = newData.files.flatMap(
    (f) => f.extractedData?.data?.items || [],
  );

  const oldCategories = extractCategoriesFromProject(oldProject);
  const newCategories = newData.files.flatMap(
    (f) => f.extractedData?.data?.categories || [],
  );

  // Quick check: count changed?
  if (oldItems.length !== newItems.length) return true;
  if (oldCategories.length !== newCategories.length) return true;

  // Deep check: operational fields changed?
  const oldItemMap = new Map(oldItems.map((i) => [i.id, i]));
  for (const newItem of newItems) {
    const old = oldItemMap.get(newItem.id);
    if (!old) return true; // New item
    if (old.price !== newItem.price) return true;
    if (old.active !== newItem.active) return true;
    if (old.category !== newItem.category) return true;
  }

  const oldCatMap = new Map(oldCategories.map((c) => [c.id, c]));
  for (const newCat of newCategories) {
    const old = oldCatMap.get(newCat.id);
    if (!old) return true; // New category
    if (old.active !== newCat.active) return true;
  }

  return false;
}
```

### 8.5 Why Not Batch Write (Project + Signal Doc)?

**Considered:** Using `writeBatch()` to atomically write both the project doc and signal doc in one transaction.

**Decision: Separate writes (fire-and-forget signal update)**

Reason:

- The project save is the **critical path** — it must never fail due to signal doc issues
- If signal doc write fails, worst case = outlet doesn't see banner until next operational save (acceptable)
- `writeBatch()` would require both docs to be in the same Firestore database (they are, but adds coupling)
- The `updateProject()` function already uses `setDoc` with merge — changing to batch would require refactoring the entire save flow
- Fire-and-forget with `try/catch` is the established pattern in this codebase (see MOL logging at `src/database/projects/index.ts:422`)

**Consistency guarantee:** The signal doc may lag by one save in rare failure cases, but the next operational save will correct it. This is acceptable for an awareness feature (not a transactional system).

---

## 9. UI Components

### 9.1 Banner Component

**File:** `src/components/organisms/MasterUpdateBanner/index.tsx` (NEW)

The banner renders **on the projects route** for outlet projects. It appears at the top of the projects content area.

**Placement:** Inside `ProjectsDataProvider` wrapper in `src/components/templates/main-app/projects/index.tsx`, before the main content.

```tsx
// In projects/index.tsx, inside ProjectsDataProvider:
<ProjectsDataProvider contextData={...}>
  <MasterUpdateBanner />   {/* ← NEW: Awareness banner + quiet history link */}
  {/* existing content */}
</ProjectsDataProvider>
```

**Component structure:**

```tsx
/**
 * Master Update Awareness Banner (Feature #4.1)
 *
 * Two-part component:
 * 1. BANNER — Persistent alert when new master changes exist (until "Got it")
 * 2. QUIET LINK — "Last main menu changes" text, always visible for outlet projects
 *
 * Design principles:
 * - Calm, not alarming (info color, not warning/error)
 * - Persistent until acknowledged (not dismissible by X button)
 * - Shows summary in banner, details in expandable modal
 * - Outlet context: shows impact on local overrides
 * - After acknowledgment: quiet text link remains for re-viewing last diff
 *   (no badge, no icon, no color — just calm availability)
 */

import { FEATURE_FLAGS } from "@config/features";
import useMasterUpdateAwareness from "@hook/useMasterUpdateAwareness";
import { ProjectsDataContext } from "@providers/projectsDataProvider";
import { Alert, Button, Space, Typography } from "antd";
import { useContext, useState } from "react";
import { LuBell, LuCheck } from "react-icons/lu";
import { MasterUpdateDiff } from "@type/multiOutlet.types";

const { Text } = Typography;

function MasterUpdateBanner() {
  const { activeProject } = useContext(ProjectsDataContext);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Hook only activates for outlet projects
  const {
    showBanner,
    diff,
    acknowledge,
    isAcknowledging,
    hasHistory,
    lastDiff,
  } = useMasterUpdateAwareness(activeProject);

  // Gate: feature flags
  if (
    !FEATURE_FLAGS.ENABLE_MULTI_OUTLET ||
    !FEATURE_FLAGS.ENABLE_MASTER_UPDATE_AWARENESS
  ) {
    return null;
  }

  // Gate: must be an outlet project
  if (!activeProject?.masterProjectId) {
    return null;
  }

  // Determine which diff to show in the modal
  const modalDiff = diff || lastDiff;

  return (
    <>
      {/* ── BANNER (only when new unacknowledged changes exist) ── */}
      {showBanner && diff && (
        <Alert
          type="info"
          showIcon
          icon={<LuBell />}
          closable={false} // Persists until "Got it" — no X dismiss
          message={
            <Space>
              <Text strong>Main menu updated</Text>
              <Text type="secondary">{buildSummaryText(diff)}</Text>
            </Space>
          }
          action={
            <Space>
              <Button size="small" onClick={() => setDetailModalOpen(true)}>
                Review
              </Button>
              <Button
                size="small"
                type="primary"
                onClick={acknowledge}
                loading={isAcknowledging}
                icon={<LuCheck />}
              >
                Got it
              </Button>
            </Space>
          }
          style={{
            margin: "0 0 10px 0",
            borderRadius: 8,
          }}
        />
      )}

      {/* ── QUIET HISTORY LINK (always visible when history exists) ── */}
      {/* 
        This renders AFTER banner is dismissed (via "Got it").
        No badge. No icon. No color. Just calm text.
        Opens the same modal showing the last acknowledged diff.
        
        Rules (from ChatGPT discussion — locked):
        - Never show badge/dot on this link
        - Never use attention-grabbing colors
        - Frame as "history", not "alert"
        - Visible only for outlet stores with acknowledged history
      */}
      {!showBanner && hasHistory && (
        <Text
          type="secondary"
          style={{
            fontSize: 12,
            cursor: "pointer",
            marginBottom: 8,
            display: "inline-block",
          }}
          onClick={() => setDetailModalOpen(true)}
        >
          Last main menu changes
        </Text>
      )}

      {/* ── DETAIL MODAL (shared by banner Review + history link) ── */}
      {modalDiff && (
        <MasterUpdateDetailModal
          open={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          diff={modalDiff}
          onAcknowledge={showBanner ? acknowledge : undefined}
          isAcknowledging={isAcknowledging}
          isHistoryView={!showBanner}
        />
      )}
    </>
  );
}

/**
 * Build human-readable summary text for the banner
 * e.g., "3 items added, 2 price changes, 1 category removed"
 */
function buildSummaryText(diff: MasterUpdateDiff): string {
  const parts: string[] = [];
  const s = diff.summary;

  if (s.itemsAdded > 0)
    parts.push(`${s.itemsAdded} item${s.itemsAdded > 1 ? "s" : ""} added`);
  if (s.itemsRemoved > 0)
    parts.push(
      `${s.itemsRemoved} item${s.itemsRemoved > 1 ? "s" : ""} removed`,
    );
  if (s.priceChanges > 0)
    parts.push(
      `${s.priceChanges} price change${s.priceChanges > 1 ? "s" : ""}`,
    );
  if (s.itemsDisabled > 0)
    parts.push(
      `${s.itemsDisabled} item${s.itemsDisabled > 1 ? "s" : ""} disabled`,
    );
  if (s.itemsEnabled > 0)
    parts.push(
      `${s.itemsEnabled} item${s.itemsEnabled > 1 ? "s" : ""} enabled`,
    );
  if (s.categoriesAdded > 0) parts.push(`${s.categoriesAdded} category added`);
  if (s.categoriesRemoved > 0)
    parts.push(`${s.categoriesRemoved} category removed`);
  if (s.itemsMovedCategory > 0)
    parts.push(
      `${s.itemsMovedCategory} item${s.itemsMovedCategory > 1 ? "s" : ""} recategorized`,
    );

  return parts.join(", ") || "Changes detected";
}

export default MasterUpdateBanner;
```

### 9.2 Detail Modal Component

**File:** `src/components/organisms/MasterUpdateBanner/MasterUpdateDetailModal.tsx` (NEW)

```tsx
/**
 * Master Update Detail Modal
 *
 * Shows structured, grouped list of operational changes
 * with outlet-specific context (override awareness).
 *
 * Used in TWO modes:
 * 1. Active banner mode — shows "Got it" button to acknowledge
 * 2. History mode — read-only, just "Close" (opened via "Last changes" link)
 *
 * Section order is FIXED (per ChatGPT discussion):
 *   Removed → Added → Price Changes → Availability → Category Changes
 * Removals first = most operationally critical.
 *
 * 50+ changes in a group: collapsed with "Many items updated" summary.
 */

import { MasterUpdateDiff, OperationalChange } from "@type/multiOutlet.types";
import {
  Button,
  Collapse,
  Divider,
  Empty,
  List,
  Modal,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  LuCheck,
  LuMinus,
  LuPlus,
  LuDollarSign,
  LuEyeOff,
  LuFolderOpen,
} from "react-icons/lu";

const { Text } = Typography;

/** Max items shown per group before collapsing */
const COLLAPSE_THRESHOLD = 50;

interface Props {
  open: boolean;
  onClose: () => void;
  diff: MasterUpdateDiff;
  onAcknowledge?: () => Promise<void>; // undefined in history mode
  isAcknowledging: boolean;
  isHistoryView?: boolean; // true when opened from "Last changes" link
}

function MasterUpdateDetailModal({
  open,
  onClose,
  diff,
  onAcknowledge,
  isAcknowledging,
  isHistoryView = false,
}: Props) {
  const handleAcknowledge = async () => {
    if (onAcknowledge) {
      await onAcknowledge();
      onClose();
    }
  };

  // Group changes by type — FIXED order (Removed first = most critical)
  const grouped = groupChanges(diff.changes);

  // Modal title changes based on mode
  const title = isHistoryView
    ? "Last changes from main menu"
    : "Updates from main menu";

  const subtitle = isHistoryView
    ? `${diff.totalChanges} change${diff.totalChanges > 1 ? "s" : ""} from last master update`
    : `These changes may affect your store`;

  // Footer: "Got it" only in active banner mode, "Close" always
  const footer = isHistoryView
    ? [
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]
    : [
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button
          key="ack"
          type="primary"
          onClick={handleAcknowledge}
          loading={isAcknowledging}
          icon={<LuCheck />}
        >
          Got it
        </Button>,
      ];

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      width={640}
      footer={footer}
    >
      <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
        {subtitle}
      </Text>

      {grouped.map((group) => (
        <div key={group.label} style={{ marginBottom: 16 }}>
          <Space style={{ marginBottom: 8 }}>
            {group.icon}
            <Text strong>{group.label}</Text>
            <Tag>{group.changes.length}</Tag>
          </Space>

          {/* Collapse large groups to avoid long scrolling */}
          {group.changes.length > COLLAPSE_THRESHOLD ? (
            <Collapse
              size="small"
              items={[
                {
                  key: group.label,
                  label: `Many items updated (${group.changes.length})`,
                  children: renderChangeList(group.changes),
                },
              ]}
            />
          ) : (
            renderChangeList(group.changes)
          )}
          <Divider style={{ margin: "8px 0" }} />
        </div>
      ))}

      {diff.totalChanges === 0 && (
        <Empty description="No operational changes detected" />
      )}
    </Modal>
  );
}

/** Render the list of changes (shared between collapsed and expanded) */
function renderChangeList(changes: OperationalChange[]) {
  return (
    <List
      size="small"
      dataSource={changes}
      renderItem={(change: OperationalChange) => (
        <List.Item>
          <List.Item.Meta
            title={change.entityName}
            description={
              <Space direction="vertical" size={0}>
                {change.oldValue && change.newValue && (
                  <Text type="secondary">
                    {change.oldValue} → {change.newValue}
                  </Text>
                )}
                {change.outletContext?.impactNote && (
                  <Text
                    type={
                      change.outletContext.hasOverride ? "warning" : "secondary"
                    }
                    style={{ fontSize: 12 }}
                  >
                    {change.outletContext.hasOverride && "⚠ "}
                    {change.outletContext.impactNote}
                  </Text>
                )}
              </Space>
            }
          />
          {change.outletContext?.hasOverride && (
            <Tag color="orange" style={{ fontSize: 11 }}>
              Has Override
            </Tag>
          )}
        </List.Item>
      )}
    />
  );
}

interface ChangeGroup {
  label: string;
  icon: React.ReactNode;
  changes: OperationalChange[];
}

/**
 * Group changes by type in FIXED display order:
 * 1. Removed items/categories (most critical — staff needs to know immediately)
 * 2. Added items/categories
 * 3. Price changes
 * 4. Availability/status changes
 * 5. Category reassignments
 */
function groupChanges(changes: OperationalChange[]): ChangeGroup[] {
  const groups: ChangeGroup[] = [];

  const removed = changes.filter(
    (c) => c.type === "ITEM_REMOVED" || c.type === "CATEGORY_REMOVED",
  );
  const added = changes.filter(
    (c) => c.type === "ITEM_ADDED" || c.type === "CATEGORY_ADDED",
  );
  const priceChanges = changes.filter((c) => c.type === "ITEM_PRICE_CHANGED");
  const statusChanges = changes.filter((c) =>
    [
      "ITEM_DISABLED",
      "ITEM_ENABLED",
      "CATEGORY_DISABLED",
      "CATEGORY_ENABLED",
    ].includes(c.type),
  );
  const moved = changes.filter((c) => c.type === "ITEM_MOVED_CATEGORY");

  // FIXED ORDER: Removed → Added → Price → Status → Moved
  if (removed.length > 0)
    groups.push({
      label: "Removed",
      icon: <LuMinus color="red" />,
      changes: removed,
    });
  if (added.length > 0)
    groups.push({
      label: "Added",
      icon: <LuPlus color="green" />,
      changes: added,
    });
  if (priceChanges.length > 0)
    groups.push({
      label: "Price Changes",
      icon: <LuDollarSign color="blue" />,
      changes: priceChanges,
    });
  if (statusChanges.length > 0)
    groups.push({
      label: "Availability Changes",
      icon: <LuEyeOff color="orange" />,
      changes: statusChanges,
    });
  if (moved.length > 0)
    groups.push({
      label: "Category Changes",
      icon: <LuFolderOpen color="purple" />,
      changes: moved,
    });

  return groups;
}

export default MasterUpdateDetailModal;
```

### 9.3 UX Behavior Rules (Locked)

These rules are **non-negotiable** — derived from product design discussion.

**Banner rules:**

- Banner appears **only** when new unacknowledged operational changes exist
- Banner persists until outlet owner clicks **"Got it"** — no auto-dismiss, no timer
- Banner is **not dismissible via X** (`closable={false}`) — must be explicitly acknowledged
- Banner text: "Main menu updated" + summary count + [Review] + [Got it]
- Banner never blocks workflow — outlet can continue working with banner visible

**History link rules:**

- After "Got it", a **quiet text link** appears: "Last main menu changes"
- Link has **no badge, no icon, no dot, no color, no highlight** — just neutral secondary text
- Link opens the **same modal** in read-only history mode (no "Got it" button)
- Link shows the **persisted `lastDiff`** from the snapshot (not recomputed)
- Link visible **only for outlet stores** with at least one acknowledged diff
- Frame as **history/reference**, never as alert/notification

**Modal rules:**

- Title changes by mode: "Updates from main menu" (banner) / "Last changes from main menu" (history)
- Subtitle: "These changes may affect your store" (banner) / "N changes from last master update" (history)
- Section order is **fixed**: Removed → Added → Price Changes → Availability → Category Changes
- 50+ items in a group → collapse with "Many items updated (N)" label
- Footer: [Close] + [Got it] in banner mode, [Close] only in history mode
- "Got it" writes snapshot + lastDiff atomically, then closes modal

**Reappearance rules:**

- Banner reappears **only** when `signal.operationalVersion > snapshot.operationalVersion`
- Each operational master update increments version; old diff is replaced
- Header link always shows **latest acknowledged** diff, not historical log

**What to NEVER build:**

- ❌ Badge/dot on the history link
- ❌ Push notifications or emails
- ❌ Activity feed or audit trail UI
- ❌ Analytics tracking on this feature
- ❌ "Sync now" or forced action buttons
- ❌ Scheduler or backend diff jobs

---

## 10. Integration Points

### 10.1 Projects Page Integration (Banner + History Link)

**File:** `src/components/templates/main-app/projects/index.tsx`  
**Location:** Inside the JSX return, after `ProjectsDataProvider` and before main content

```diff
+ import MasterUpdateBanner from '@organisms/MasterUpdateBanner';

  <ProjectsDataProvider contextData={...}>
+   <MasterUpdateBanner />
    {/* existing content */}
  </ProjectsDataProvider>
```

**Why the projects route, not global layout:**

- `ProjectsDataContext` provides `activeProject` — only available inside the projects page tree
- Banner + "Last changes" link appear where the outlet owner actively works with their menu
- Avoids extra Firestore reads that a global-level hook would need
- Can be expanded to global layout later if needed (Option C: lift state to Redux)

**What renders:**

- **When new changes exist:** Alert banner with "Main menu updated" + [Review] + [Got it]
- **After "Got it":** Quiet "Last main menu changes" text link (no badge, no color)
- **When link clicked:** Same detail modal opens showing the persisted `lastDiff`

### 10.2 Acknowledge on Link (Initial Snapshot)

**File:** `src/database/multiOutlet/index.ts`  
**Function:** `linkStoreToMaster()` (line ~722)  
**See:** Section 7.1 above

### 10.3 Export from multiOutlet barrel

**File:** `src/lib/multiOutlet/index.ts`  
**Add export:**

```typescript
export {
  computeMasterUpdateDiff,
  createMasterSnapshot,
} from "./masterUpdateDiff";
```

---

## 11. File Inventory

### 11.1 New Files

| File                                                                      | Purpose                        | Size Est.  |
| ------------------------------------------------------------------------- | ------------------------------ | ---------- |
| `src/lib/multiOutlet/masterUpdateDiff.ts`                                 | Pure diff computation engine   | ~250 lines |
| `src/hooks/useMasterUpdateAwareness.ts`                                   | React hook for awareness state | ~200 lines |
| `src/components/organisms/MasterUpdateBanner/index.tsx`                   | Banner + quiet history link    | ~150 lines |
| `src/components/organisms/MasterUpdateBanner/MasterUpdateDetailModal.tsx` | Detail modal (dual-mode)       | ~200 lines |

### 11.2 Modified Files

| File                                                                | Change                                                 | Lines Affected                         |
| ------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------- |
| `src/config/features.ts`                                            | Add `ENABLE_MASTER_UPDATE_AWARENESS` flag              | +30 lines (after line ~680)            |
| `src/types/multiOutlet.types.ts`                                    | Add snapshot, diff, and `MasterOperationalState` types | +130 lines (after line ~161)           |
| `src/components/templates/main-app/projects/types/project.types.ts` | Add `masterSnapshot` to `Project`                      | +6 lines (after line ~235)             |
| `src/components/templates/main-app/projects/index.tsx`              | Add `MasterUpdateBanner`                               | +2 lines (import + JSX)                |
| `src/database/multiOutlet/index.ts`                                 | Create initial snapshot on link                        | +20 lines (inside `linkStoreToMaster`) |
| `src/database/projects/index.ts`                                    | Signal doc update on operational changes               | +30 lines (inside `updateProject`)     |
| `src/constants/database.ts`                                         | Add `MASTER_OPERATIONAL_STATE` collection constant     | +3 lines                               |
| `src/lib/multiOutlet/index.ts`                                      | Add exports                                            | +1 line                                |

### 11.3 Files NOT Modified

| File                                                               | Reason                                            |
| ------------------------------------------------------------------ | ------------------------------------------------- |
| `src/lib/multiOutlet/resolveProject.ts`                            | Resolver is for data merging, not awareness       |
| `src/components/antdComponent/layoutWrapper/index.tsx`             | Banner placed in projects page, not global layout |
| `src/providers/projectsDataProvider.tsx`                           | No changes needed                                 |
| `src/components/templates/main-app/projects/editorView/Editor.tsx` | Editor doesn't need changes for awareness         |

---

## 12. Data Flow Walkthrough

### 12.1 Happy Path: Master Updates → Outlet Sees Banner

```
1. Master owner edits menu in Editor
   └── Editor auto-saves via updateProject()
       └── requestBodyComposer() sets modifiedOn = Timestamp.now()
           File: src/lib/apiHelper/index.ts:113
       └── detectOperationalChange(oldProject, data) → true (item added)
       └── Increments operationalVersion in masterOperationalState/{projectId}
           File: src/database/projects/index.ts (inside updateProject)

2. Outlet owner has their dashboard open (projects page)
   └── useMasterUpdateAwareness(activeProject) is active
       └── onSnapshot listener on masterOperationalState/{masterProjectId}
       └── Listener fires: signal.operationalVersion (5) > snapshot.operationalVersion (4)
       └── Debounce timer starts (5 seconds)
       └── After 5s: computeAndShowDiff() fires
           └── Fetches master via getProjectDataByStore()
               File: src/database/projects/index.ts:737
           └── Calls computeMasterUpdateDiff()
               File: src/lib/multiOutlet/masterUpdateDiff.ts
           └── Returns diff with hasChanges=true
           └── Sets showBanner=true, diff=computed

3. MasterUpdateBanner renders
   └── Shows: "Main menu updated — 3 items added, 2 price changes"
   └── [Review] → Opens MasterUpdateDetailModal
   └── [Got it] → Calls acknowledge()

4. acknowledge()
   └── Creates new snapshot from current master state
   └── Stores operationalVersion=5 in snapshot (new baseline)
   └── Persists current diff as lastDiff in snapshot
   └── Writes to outlet: { masterSnapshot: { ...newSnapshot, lastDiff } }
   └── Sets showBanner=false
   └── Banner disappears
   └── Quiet "Last main menu changes" text link appears in its place

5. Later: Outlet owner wants to re-check
   └── Clicks "Last main menu changes" link
   └── Opens same modal in history mode (read-only, no "Got it" button)
   └── Shows persisted lastDiff from snapshot
```

### 12.2 Edge Case: Master Makes Rapid Operational Edits (Debounce)

```
1. Master owner adds 5 items rapidly (auto-save fires after each)
   └── Each save: detectOperationalChange() → true
   └── operationalVersion increments: 4 → 5 → 6 → 7 → 8 → 9

2. Outlet's onSnapshot listener fires for each version change
   └── Version 5: debounce timer starts (5s)
   └── Version 6 (2s later): timer reset → new 5s debounce
   └── Version 7 (1s later): timer reset → new 5s debounce
   └── Version 8 (1s later): timer reset → new 5s debounce
   └── Version 9 (1s later): timer reset → new 5s debounce

3. Master owner stops editing
   └── 5s pass with no new version change...
   └── Debounce timer fires → computeAndShowDiff()
   └── Fetches master (now has all 5 items)
   └── Computes diff → Shows banner with "5 items added"
   └── Only 1 master project fetch (not 5)

Why this works better than old stability window:
- Old approach: 30s fixed wait regardless of change type
- New approach: 5s debounce, fires only for operational changes
- Non-operational saves (theme, config) don't trigger debounce at all
```

### 12.3 Edge Case: No Snapshot (First Link / Migration)

```
1. Outlet linked before feature exists (no masterSnapshot field)
   └── Hook detects: snapshot === undefined
   └── Does NOT show banner
   └── Returns silently (no baseline to diff against)

2. Auto-baseline option: Hook creates initial snapshot silently
   └── Next master change → diff computed against auto-baseline
   └── Banner appears for first time
```

### 12.4 Edge Case: Outlet Has Overrides on Changed Items

```
1. Master changes price of "Truffle Pasta" from ₹899 to ₹999

2. Outlet has price override: ₹949

3. Diff computation:
   └── ITEM_PRICE_CHANGED: "Truffle Pasta" ₹899 → ₹999
   └── outletContext: {
         hasOverride: true,
         overrideValue: "₹949",
         impactNote: "Your outlet price (₹949) is unaffected"
       }

4. Detail modal shows:
   └── "Truffle Pasta: ₹899 → ₹999"
   └── ⚠ "Your outlet price (₹949) is unaffected" [Has Override]
```

---

## 13. Cost Analysis

### 13.1 Firestore Reads (Signal Doc + Listener Architecture)

**Per outlet tab (8-hour workday):**

| Scenario                                 | Reads   | Calculation                                |
| ---------------------------------------- | ------- | ------------------------------------------ |
| `onSnapshot` listener attach             | 1       | On page load                               |
| Listener fires (operational changes/day) | ~10     | Avg master makes ~10 operational edits/day |
| Master project fetch (on version change) | ~10     | 1 per debounced listener fire              |
| Signal doc read (on initial snapshot)    | 1       | One-time on link                           |
| **Total per outlet/day**                 | **~22** |                                            |

**At scale (500 outlets, 8hr/day):**

| Architecture                   | Reads/day  | Cost/month (@ $0.06/100K reads) |
| ------------------------------ | ---------- | ------------------------------- |
| Polling (2 min interval)       | ~120,000   | $2.16                           |
| `onSnapshot` on master doc     | ~25,000    | $0.45                           |
| **`onSnapshot` on signal doc** | **~5,000** | **$0.09**                       |

**Why signal doc is 24x cheaper than polling:**

- Polling: 500 outlets × 240 polls/day (every 2 min, 8hr) = 120,000 reads
- Signal doc: 500 outlets × 10 fires/day = 5,000 reads (+ 5,000 master fetches on version change = 10,000 total)
- Signal doc listeners are charged 1 read per fire, but the doc is ~100 bytes vs 200-400KB master project

**Firebase free tier (50K reads/day):** Signal doc architecture stays well within free tier even at 500 outlets. Polling would exceed it at ~210 outlets.

### 13.2 Firestore Writes

| Action                          | Writes | Frequency                           |
| ------------------------------- | ------ | ----------------------------------- |
| Initial snapshot on link        | 1      | One-time per outlet                 |
| Signal doc update (master save) | 1      | Per operational change (~10/day)    |
| Acknowledge (outlet "Got it")   | 1      | Per master change batch (~2-3/week) |

**Master-side writes:** ~10 signal doc writes/day (only on operational changes). Non-operational saves (theme, config, images) produce zero signal doc writes.

### 13.3 Document Size Increase

The `masterSnapshot` field adds ~18 KB to the outlet project document (for a 200-item menu). Current project documents are typically 200-400 KB. This is a ~5-9% increase — well within Firestore's 1 MB limit.

The `masterOperationalState` signal doc is ~100 bytes — negligible storage cost.

---

## 14. Testing Strategy

### 14.1 Unit Tests

| Test                                             | What It Verifies                                |
| ------------------------------------------------ | ----------------------------------------------- |
| `computeMasterUpdateDiff` with empty snapshot    | Returns no changes                              |
| `computeMasterUpdateDiff` with added items       | Detects ITEM_ADDED correctly                    |
| `computeMasterUpdateDiff` with removed items     | Detects ITEM_REMOVED correctly                  |
| `computeMasterUpdateDiff` with price changes     | Detects ITEM_PRICE_CHANGED with old/new values  |
| `computeMasterUpdateDiff` with active toggles    | Detects ITEM_DISABLED/ENABLED                   |
| `computeMasterUpdateDiff` with category moves    | Detects ITEM_MOVED_CATEGORY                     |
| `computeMasterUpdateDiff` with outlet overrides  | Shows correct outletContext                     |
| `createMasterSnapshot`                           | Creates minimal snapshot with correct structure |
| `buildSummaryText`                               | Generates correct human-readable summary        |
| `detectOperationalChange` with no file changes   | Returns false (no operational change)           |
| `detectOperationalChange` with item added        | Returns true                                    |
| `detectOperationalChange` with price change      | Returns true                                    |
| `detectOperationalChange` with active toggle     | Returns true                                    |
| `detectOperationalChange` with category change   | Returns true                                    |
| `detectOperationalChange` with only theme/config | Returns false (non-operational)                 |
| `detectOperationalChange` with only description  | Returns false (locked field, non-operational)   |

### 14.2 Integration Tests

| Test                                              | What It Verifies                         |
| ------------------------------------------------- | ---------------------------------------- |
| Feature flag off → no banner, no listener         | Guard works correctly                    |
| Non-outlet project → no banner, no listener       | Only activates for outlets               |
| No snapshot → no banner                           | Migration safety                         |
| Signal version unchanged → no banner              | Version comparison works                 |
| Signal version > snapshot version → banner shows  | Full listener flow works                 |
| Rapid version changes → only 1 fetch (debounce)   | 5s debounce prevents wasted fetches      |
| Non-operational save → no signal doc update       | `detectOperationalChange` filters noise  |
| Acknowledge → banner disappears                   | Write + state update                     |
| Acknowledge → snapshot.operationalVersion updated | Snapshot stores correct version baseline |
| Acknowledge → lastDiff persisted                  | lastDiff stored in snapshot              |
| After acknowledge → hasHistory = true             | History link appears                     |
| History link → opens modal read-only              | No "Got it" button in history            |
| Tab hidden → listener detached (if implemented)   | No idle connections                      |
| Component unmount → listener cleanup              | No memory leaks                          |

### 14.3 Manual QA Checklist

- [ ] Link outlet to master → no banner appears (initial snapshot created with current operationalVersion)
- [ ] Master adds item → outlet sees banner within ~5s with "1 item added"
- [ ] Master changes theme/config only → NO banner appears (non-operational change)
- [ ] Master changes price → outlet with override sees "your price unaffected"
- [ ] Master changes price → outlet without override sees "new price: ₹X"
- [ ] Master adds 5 items rapidly → outlet sees 1 banner with "5 items added" (debounce works)
- [ ] Click "Review" → modal shows grouped changes (Removed → Added → Price → Availability → Category)
- [ ] Click "Got it" → banner disappears, quiet "Last main menu changes" link appears
- [ ] Click "Last main menu changes" → modal opens in history mode (read-only, no "Got it")
- [ ] Navigate away and back → banner stays if not acknowledged
- [ ] Navigate away and back after acknowledge → "Last main menu changes" link still visible
- [ ] Master makes 10 changes → outlet sees all 10 in summary
- [ ] Master makes 50+ changes → group collapses with "Many items updated" label
- [ ] Feature flag off → no banner, no history link, no listener attached, no errors
- [ ] Non-outlet project → no banner, no history link
- [ ] "Last main menu changes" link has NO badge, NO icon, NO color (calm text only)
- [ ] Verify `masterOperationalState/{masterProjectId}` doc exists after first operational master save
- [ ] Verify signal doc `operationalVersion` increments only on operational changes

---

## 15. Rejected Alternatives

| Alternative                                 | Why Rejected                                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Polling master doc (every 2 min)**        | 24x more expensive than signal doc at scale; 2-min delay; false triggers from `modifiedOn` noise              |
| **`onSnapshot` on master project doc**      | Master doc is 200-400KB; ALL saves trigger listener (not just operational); 5x more expensive than signal doc |
| **Polling `modifiedOn` + stability window** | Complex 30s stability window needed to filter autosave noise; still fires on non-operational changes          |
| **Cloud Function to push diffs**            | Over-engineering — frontend can compute diffs cheaply                                                         |
| **Store diff in separate collection**       | Unnecessary — snapshot + runtime diff is simpler; diff is ephemeral                                           |
| **Notification bell/inbox**                 | Goes against "calm infrastructure" — too noisy                                                                |
| **Auto-dismiss after 24h**                  | Owner might miss critical changes (price change)                                                              |
| **Block outlet until acknowledged**         | Violates "non-blocking" principle from spec                                                                   |
| **Diff stored in backend**                  | Unnecessary complexity — snapshot + runtime diff is simpler                                                   |
| **Track all changes (cosmetic too)**        | Creates noise — only operational changes matter                                                               |
| **Hash-based change detection**             | Hashes never used for triggering; `operationalVersion` is simpler and cheaper                                 |

---

## 16. Future Considerations (Explicit Out-of-Scope)

These are acknowledged but **NOT part of this implementation:**

| Feature                                               | Why Deferred                                |
| ----------------------------------------------------- | ------------------------------------------- |
| Email/push notifications for critical changes         | Adds external dependency complexity         |
| Historical change log for outlet                      | Needs new collection, UI complexity         |
| "Undo last master change" for outlet                  | Requires versioning system                  |
| Change categorization (critical/minor)                | Adds decision complexity for P0             |
| Multi-project awareness (outlets with multiple menus) | Per-project snapshot handles this naturally |

---

## 17. Implementation Order

| Phase                         | What                                                                                                                        | Verify                                                    | Dependencies  |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------- |
| **Phase 1: Types**            | Add snapshot + diff + `MasterOperationalState` types to `multiOutlet.types.ts`; `masterSnapshot` to `Project`               | Types compile, no import errors                           | None          |
| **Phase 2: Feature Flag**     | Add `ENABLE_MASTER_UPDATE_AWARENESS` to `features.ts`                                                                       | Flag accessible, guard pattern works                      | None          |
| **Phase 3: DB Constant**      | Add `MASTER_OPERATIONAL_STATE` to `DB_COLLECTIONS` in `database.ts`                                                         | Constant accessible, no import errors                     | None          |
| **Phase 4: Diff Engine**      | Create `masterUpdateDiff.ts` (pure functions: `computeMasterUpdateDiff`, `createMasterSnapshot`, `detectOperationalChange`) | Test in console with mock data                            | Phase 1       |
| **Phase 5: Signal Doc Write** | Add operational change detection + signal doc write to `updateProject()` in `src/database/projects/index.ts`                | Signal doc increments on operational save only            | Phase 2, 3, 4 |
| **Phase 6: Hook**             | Create `useMasterUpdateAwareness.ts` (onSnapshot listener + debounce + diff compute)                                        | Console.log diff output on outlet project                 | Phase 4, 5    |
| **Phase 7: Banner**           | Create `MasterUpdateBanner` — banner alert with [Review] [Got it]                                                           | Banner renders, "Got it" writes snapshot                  | Phase 6       |
| **Phase 8: Detail Modal**     | Create `MasterUpdateDetailModal` — grouped changes, dual-mode                                                               | Modal opens from banner, sections in correct order        | Phase 7       |
| **Phase 9: Acknowledge**      | Wire acknowledge write + lastDiff persistence                                                                               | Snapshot written, banner hides, lastDiff persisted        | Phase 8       |
| **Phase 10: History Link**    | Add "Last main menu changes" quiet link + history modal mode                                                                | Link appears after "Got it", opens read-only modal        | Phase 9       |
| **Phase 11: Integration**     | Wire into projects page, add initial snapshot to `linkStoreToMaster`                                                        | Full flow: link → master edit → banner → Got it → history | Phase 10      |

---

**DOCUMENT STATUS:** ✅ IMPLEMENTED — February 2026  
**SIGNATURE:** Cascade (Codebase Authority)  
**SOURCE OF TRUTH:** This document reflects the implemented codebase. See `verification.md` for review findings.

### Implementation Notes (Post-Implementation Deviations)

The following intentional deviations from the original plan were made during implementation:

1. **`Map.forEach` instead of `for...of`** — TS config has no `downlevelIteration`, so `Map` iteration uses `.forEach()` throughout `masterUpdateDiff.ts`. Functionally identical.
2. **`buildSummaryText` moved to diff engine** — Originally in Banner component (§9.1). Moved to `masterUpdateDiff.ts` as an exported pure function for better separation of concerns. Banner imports it.
3. **`buildSummaryText` caps at 3 parts** — Added "cap at 3 + N more" logic for banner brevity. Not in original plan.
4. **`buildSummaryText` order: Removed first** — Matches modal section order (most critical first). Doc had Added first.
5. **Initial snapshot in single write** — Doc suggested two writes (masterProjectId, then snapshot). Code combines them into one `updateDoc` via spread. Saves 1 Firestore write per link.
6. **`switchStoreMaster` also creates snapshot** — Not in original doc. Added during review to maintain consistent baseline when switching masters.
7. **`unlinkStoreFromMaster` clears snapshot** — Not in original doc. Added during review to clean up stale data.
8. **`acknowledgedVersionRef`** — Added ref-based version tracking to fix stale closure bug where post-acknowledge signal fires could show old diff before SWR re-fetches.
9. **Helper functions exported** — `extractItemsFromProject` and `extractCategoriesFromProject` exported from diff engine to eliminate duplication in hook.
10. **Expanded operational coverage** — Cross-checked against FR-5 override keys and full `ExtractedDataItem`/`ExtractedDataCategory` structures. Added tracking for:
    - `available` (sold-out status) — `ITEM_AVAILABILITY_CHANGED`
    - `isBestSeller` (bestseller marker) — `ITEM_BESTSELLER_CHANGED`
    - `duration` (prep time) — `ITEM_DURATION_CHANGED`
    - `attributes[]` (item variants) — `ATTRIBUTE_ADDED`, `ATTRIBUTE_REMOVED`, `ATTRIBUTE_PRICE_CHANGED`, `ATTRIBUTE_DISABLED`, `ATTRIBUTE_ENABLED`
    - New `SnapshotAttribute` type for variant snapshots
    - All override context checks include outlet's attribute overrides
    - Modal groups expanded: Removed → Added → Price → Availability (Sold Out) → Visibility → Bestseller → Prep Time → Category
    - `detectOperationalChange` updated to check all new fields + attribute arrays
    - Snapshot creation optimized: optional fields only stored when non-default (keeps size minimal)
11. **Fields intentionally NOT tracked** (per analysis):
    - `ownerBoost` — Internal scoring, not visible to staff/customers
    - `orderIndex` (item/category/attribute) — Display ordering only
    - `timeSlots` (category) — Complex array, typically per-store setting
    - `description`, `images`, `tags` — Cosmetic, not operationally impactful
