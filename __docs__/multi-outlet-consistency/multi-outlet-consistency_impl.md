# Multi-Outlet Brand Consistency — Implementation Plan

**Feature:** #4 — Multi-Outlet Brand Consistency  
**Document Type:** Technical Blueprint (Dev-Only)  
**Status:** Implemented source evidence; not current launch certification
**Stack:** Next.js 14 + Firebase (Firestore)  
**Constraints:** 3-year architecture freeze • backwards-compatible • feature-flagged  
**Default:** OFF (`ENABLE_MULTI_OUTLET: false`)  
**Original Date:** January 19, 2026  
**Last Reviewed:** July 6, 2026
**Author:** Lead Architect

> **Launch Boundary:** This technical blueprint records Multi-Outlet implementation source evidence, not current production-launch approval. Current release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, `npm run verify:multi-location-boundary`, desktop/mobile Locations browser QA, linked outlet save QA, Razorpay sandbox evidence where billing is involved, Firebase deploy evidence where rules/functions change, and target-environment smoke.

> **Post-Implementation Notes (Feb 13, 2026):** This blueprint was the original technical plan. The core architecture below remains accurate. The following were added during implementation and have their own dedicated docs:
>
> - **Store Onboarding API routes:** `POST /api/outlets/create`, `/deactivate`, `/auth/switch-store` — see [store-onboarding/](./store-onboarding/)
> - **Chain Control Panel UI:** `src/app/(main)/locations/page.tsx` — see [store-onboarding/](./store-onboarding/)
> - **OutletPolicy enforcement:** `src/lib/permissions/applyOutletPolicy.ts` — see [multi-chain-permissions_impl.md](../multi-chain-permissions/multi-chain-permissions_impl.md)
> - **Roles & Permissions:** 23 `RolePermissions` + 15 `OutletPolicy` flags — see [roles-permissions_impl.md](../roles-permissions/roles-permissions_impl.md)
> - **Signal doc pattern (#4.1):** `masterOperationalState/{projectId}` — see [master-updates-awareness_impl.md](./master-updates-awareness_impl.md)
> - **Project propagation:** `propagateNewProjectToOutlets()` — see [propagation.ts](../../src/database/multiOutlet/propagation.ts)
> - **Firebase cost tracking:** see [multi-outlet-consistency_firebase.md](./multi-outlet-consistency_firebase.md)
> - **May 19, 2026 hardening:** linked outlet editor saves now use `/api/projects/outlet-save` for server-side tenant/store validation, local-only menu persistence, OutletPolicy enforcement, and public cache invalidation. Desktop master extraction status uses `/api/projects/master-job-status` instead of a direct outlet-client listener on master job documents.
> - **May 20, 2026 completion pass:** master/local extraction records now persist `extractionIdAliases` for ID stability, outlet-only local changes stamp `outletLocalState` in the same write, public item links fall back cleanly when a deleted local item is requested, and mobile has master-update review/history parity with desktop.
> - **May 27, 2026 outlet policy hardening:** mobile/desktop policy controls share `OUTLET_POLICY_CATEGORIES`, and `processMenuImagesJob` now checks linked outlet `canUseMenuExtraction` before extraction provider processing.
> - **June 11, 2026 production audit:** outlet creation no longer writes subscription quantity when `ENABLE_OUTLET_BILLING` is off; deactivation validates the canonical target `stores/{outletSId}` doc before Admin writes; inactive outlets are excluded from project propagation, brand propagation, and master-delete linked-outlet scans; inactive outlet rename is rejected; desktop/mobile active outlet counters now exclude inactive outlets.
> - **June 29, 2026 master job status response hardening:** `useMasterJobStatus()` calls `/api/projects/master-job-status` with same-origin credentials, no-store cache policy, and manual redirect handling, then parses the response through an 8KB bounded JSON parser and requires the inactive/active response envelope before updating outlet editor blocking state.
> - **July 5, 2026 master job status project ID boundary:** `/api/projects/master-job-status` validates `masterProjectId` and optional `outletProjectId` with the existing multi-outlet project-ID character rule plus the shared Firestore document-ID guard before project-scope parsing, linked outlet project reads, or active master-job queries.
> - **June 29, 2026 diagnostics hardening:** `updateOutletPolicy()` now parses `/api/outlets/policy` acknowledgements through a 16KB bounded JSON parser, logs bounded `multi_outlet_outlet_policy_response_parse_failed` diagnostics for malformed responses, and requires `success: true`, `masterPromoted`, and a complete boolean `outletPolicy` before desktop/mobile policy state updates.
> - **June 29, 2026 linked outlet save response hardening:** `src/lib/multiOutlet/linkedOutletSaveResponse.ts` provides the shared 2MB `/api/projects/outlet-save` acknowledgement parser. `updateProject()`, linked outlet `publishProject()`, and linked-outlet extraction review applies require `success: true` plus matching `projectId` / `masterProjectId` before returning the saved project to editor, publish, or review-apply flows.
> - **June 30, 2026 linked outlet save request hardening:** editor save, linked outlet publish, and extraction review apply now share `LINKED_OUTLET_SAVE_REQUEST_POLICY` so `/api/projects/outlet-save` browser requests use same-origin credentials, no-store cache policy, and manual redirect handling before the existing 2MB response parser and acknowledgement shape guard.
> - **July 5, 2026 linked outlet save ID boundary:** `/api/projects/outlet-save` validates `projectId`, `masterProjectId`, and override map IDs with the existing linked-outlet character rule plus the shared Firestore document-ID guard before parsing store scope, reading `projects/{tId}/{sId}/{projectId}`, writing outlet-local overrides, invalidating public/screen caches, or acknowledging the save.
> - **July 6, 2026 outlet lifecycle session document-ID boundary:** `/api/outlets/create`, `/api/outlets/rename`, `/api/outlets/deactivate`, and `/api/outlets/policy` validate session tenant/store IDs through `src/lib/multiOutlet/outletSessionScope.ts` before tenant access, limiter keys, route diagnostics, Firestore document paths, cache tags, Digital Screens invalidation, or Owner Business Assistant packet-cache invalidation. Rename and deactivate also normalize the requested outlet store ID before target outlet refs/cache work. Existing numeric comparisons, tenant/store equality filters, billing quantity decisions, and valid route behavior are preserved.
> - **July 1, 2026 extraction review apply acknowledgement hardening:** desktop and mobile review applies pass the owner-approved selected-change count into `applyExtractionChanges()`. The shared apply helper refuses no-op or partial apply counts before project/job writes, and both review surfaces require the returned `projectId`, `jobId`, mode, completion flag, and applied count before showing success.
> - **July 1, 2026 multi-location source gate:** Multi-location boundary source gate: `npm run verify:multi-location-boundary` locks outlet create/deactivate/rename/policy route admission, linked outlet project-save policy enforcement, desktop/mobile bounded acknowledgements, MobileShell Locations routing, and docs/audit parity. The gate is source-only and does not run browser, Razorpay, Firebase deploy, or live Firestore smoke.
> - **July 1, 2026 desktop rename failure-path hardening:** Desktop `OutletRenameModal` now parses the bounded `/api/outlets/rename` response before the non-OK branch, records the safe `currentSlug` field for same-slug rejection diagnostics, and keeps fixed owner copy. `verify:multi-location-boundary` also checks required public/screen cache invalidation tags without depending on quote style.
> - **July 2, 2026 active-cap hardening:** `POST /api/outlets/create` now enforces `MAX_OUTLETS_PER_TENANT` against active non-master outlets only, matching billing quantity, desktop/mobile counters, public visibility, and deactivation-as-replacement-slot behavior.
> - **July 5, 2026 active store-context fallback hardening:** `src/providers/sessionProvider.tsx` logs bounded `session_provider_active_store_context_load_failed` diagnostics when a validated target store context cannot finish store/subscription loading, clears stale active-subscription state, resets the active context, and falls back to the login store. This preserves the existing `/api/auth/switch-store` and Firebase Auth claim refresh behavior; it only hardens the provider fallback after a failed target load.
> - **July 6, 2026 Switch-store scope document ID boundary:** `/api/auth/switch-store` now normalizes the session tenant/current-store IDs and target-store ID through the shared store-permission document ID guard before tenant access checks, store/tenant reads, mapped-access checks, or success acknowledgement.

---

## 0. Non-Negotiable Principles

| #   | Principle                           | Rationale                                    |
| --- | ----------------------------------- | -------------------------------------------- |
| 1   | **No migrations**                   | Existing data unchanged                      |
| 2   | **No new collections**              | Use existing `projects/` + `platformSummary` |
| 3   | **No copy-paste master → outlet**   | Reference + override model                   |
| 4   | **All new fields optional**         | Backwards compatible                         |
| 5   | **Single-store behavior unchanged** | Zero regression risk                         |
| 6   | **Read-time resolution**            | Changes reflect on next render               |
| 7   | **Store isolation preserved**       | `tId` + `sId` always respected               |
| 8   | **Minimal reads (2 for chain)**     | Extract storeId from projectId format        |

---

## 1. ChatGPT Analysis & Codebase Cross-Reference

### 1.1 What ChatGPT Got RIGHT ✅

| Suggestion                                | Codebase Evidence                           | Verdict   |
| ----------------------------------------- | ------------------------------------------- | --------- |
| Problem statement (premium groups, drift) | `tenant.ts:49` shows 1:N store relationship | **AGREE** |
| Silent + autonomous propagation           | Matches Law 7: No Feature Without Autonomy  | **AGREE** |
| P0 scope (master, inheritance, overrides) | Fits existing Project structure             | **AGREE** |
| Reference model (not copy-paste)          | Prevents drift by design                    | **AGREE** |
| Feature flag requirement                  | Pattern in `features.ts`                    | **AGREE** |

### 1.2 What ChatGPT Got PARTIALLY RIGHT ⚠️

| Suggestion                     | Issue                  | Adjustment                              |
| ------------------------------ | ---------------------- | --------------------------------------- |
| `FEATURES.ENABLE_MULTI_OUTLET` | Wrong pattern name     | Use `FEATURE_FLAGS.ENABLE_MULTI_OUTLET` |
| `lastSyncedOn: any`            | Loose typing           | Use `Timestamp` from firebase/firestore |
| Cloud Function trigger path    | Needs `isMaster` check | Add condition to trigger                |

### 1.3 Cascade-Discovered Improvements 🔍

| Discovery                           | ChatGPT Missed                         | Implementation                            |
| ----------------------------------- | -------------------------------------- | ----------------------------------------- |
| `PricingIntegrityState` integration | Master price changes trigger staleness | Update outlet PDF/screens flags           |
| Multi-project per store             | Stores can have multiple menus         | Master applies per-project, not per-store |
| Existing `available` field          | Item already has availability toggle   | Reuse for override                        |
| `ExtractedDataItem` structure       | Full type definition                   | Align override fields                     |

---

## 2. Feature Flag Configuration

### 2.1 Add to `src/config/features.ts`

```typescript
// ═══════════════════════════════════════════════════════════════
// MULTI-OUTLET BRAND CONSISTENCY (Feature #4)
// Per spec: 3-YEAR ARCHITECTURE FREEZE - Ship everything at launch!
// ═══════════════════════════════════════════════════════════════

/**
 * Multi-Outlet Brand Consistency (Feature #4)
 *
 * true: Multi-outlet features enabled (master menus, linking, overrides)
 * false: Feature disabled (single-store behavior unchanged)
 *
 * What It Does:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * - Enable master menu designation per tenant
 * - Link outlet projects to master
 * - Allow controlled overrides (price, availability)
 * - Add local-only items/categories
 * - Instant propagation on master update
 *
 * What It Does NOT Do:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * - Franchise billing logic
 * - Approval workflows
 * - Outlet analytics comparisons
 *
 * @see __docs__/multi-outlet-consistency/MULTI_OUTLET_impl.md
 *
 * Production: Enable when ready for multi-outlet tenants
 * Development: Enable to test the feature
 */
ENABLE_MULTI_OUTLET: false, // Default OFF until implementation complete
```

### 2.2 Enforcement Pattern

```typescript
// All multi-outlet code paths MUST check this flag
if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
  // Behave as current single-store system
  return project; // No resolution, no badges, no linking
}
```

---

## 3. Data Model Extension

### 3.1 Project Type Additions

**File:** `src/components/templates/main-app/projects/types/project.types.ts`

```typescript
import { Timestamp } from "firebase/firestore";

/**
 * Multi-Store Override Types (Feature #4)
 *
 * Store projects only contain overrides — no full menu data.
 * At render time: Load master files → Apply store overrides by ID
 */

// Category overrides
export interface CategoryOverride {
  active?: boolean; // Hide category at this store
  orderIndex?: number; // Local category ordering
  timeSlots?: CategoryTimeSlot[]; // Store-specific operating hours
}

// Item overrides
export interface ItemOverride {
  active?: boolean; // Hide item permanently at this store
  available?: boolean; // Temporary sold-out status
  price?: string; // Override master price
  orderIndex?: number; // Local item ordering within category
  isBestSeller?: boolean; // Store can mark local bestsellers
  duration?: number; // Prep time may vary by store
  ownerBoost?: number; // Store can boost/suppress local favorites
}

// Attribute overrides (item variants like Small/Medium/Large)
export interface AttributeOverride {
  active?: boolean; // Hide specific variant at this store
  price?: string; // Override variant price
  orderIndex?: number; // Local variant ordering
}

export interface ProjectOverrides {
  items: Record<string, ItemOverride>;
  categories: Record<string, CategoryOverride>;
  attributes: Record<string, AttributeOverride>; // Key: attributeId
}

/**
 * Extended Project interface with Multi-Outlet fields
 * All new fields are OPTIONAL for backwards compatibility
 */
export interface Project {
  projectId?: string;
  files?: ProjectFileType[];
  languages?: string[];
  config?: ThemeConfig;
  menuSettings?: MenuSettings;
  active?: boolean;
  deleted?: boolean;
  deletedAt?: Timestamp;

  // ══════════════════════════════════════════════════════════
  // MULTI-OUTLET FIELDS (Feature #4) - All OPTIONAL
  // ══════════════════════════════════════════════════════════

  // NOTE: isMaster is NOT stored on project level.
  // Master store is identified via storesSummary.stores[sId].isMaster
  // All projects in master store are considered master projects.

  /**
   * Master project ID (for regular store projects only)
   *
   * If this field EXISTS → regular store project linked to master
   * If this field is ABSENT → master project (or unlinked)
   *
   * storeId can be extracted from projectId format: {tId}-{timestamp}-{sId}
   * Enables direct Firestore querying: where('masterProjectId', '==', 'xxx')
   */
  masterProjectId?: string;

  /** Store-specific overrides for inherited items */
  overrides?: ProjectOverrides;
}
```

### 3.2 Export Types

**File:** `src/types/multiOutlet.types.ts` (NEW)

```typescript
/**
 * Multi-Outlet Types
 *
 * Types for multi-outlet brand consistency feature.
 * @see __docs__/multi-outlet-consistency/MULTI_OUTLET_impl.md
 */

export type {
  ItemOverride,
  CategoryOverride,
  MasterRef,
  ProjectOverrides,
} from "@template/main-app/projects/types/project.types";

/**
 * Resolved item with inheritance state
 */
export interface ResolvedItem {
  item: ExtractedDataItem;
  inheritanceState: "inherited" | "overridden" | "local-only";
  masterPrice?: string; // Original price if overridden
}

/**
 * Resolved category with inheritance state
 */
export interface ResolvedCategory {
  category: ExtractedDataCategory;
  inheritanceState: "inherited" | "overridden" | "local-only";
}

/**
 * Multi-outlet MOL event types
 */
export type MultiOutletMOLEventType =
  | "MASTER_MENU_UPDATED"
  | "OUTLET_LINKED_TO_MASTER"
  | "OUTLET_UNLINKED_FROM_MASTER"
  | "OUTLET_OVERRIDE_APPLIED"
  | "OUTLET_LOCAL_ITEM_ADDED"
  | "MASTER_PROPAGATION_COMPLETED";
```

---

## 4. Storage Paths (Simplified Architecture)

### 4.1 Existing Structure (Unchanged)

```
projects/{tId}/{sId}/{projectId}
  └── Project document with files[], config, menuSettings, etc.
  └── NEW: masterRef?, overrides? (for outlet projects only)

platformSummary/storesSummary
  └── stores: { [sId]: { name, isMaster?, ... } }  // isMaster flag at store level
```

### 4.2 Master Store & Projects

Master is identified at **store level** in storesSummary:

```
platformSummary/storesSummary
  └── stores: {
        101: { name: "HQ", isMaster: true },   // ← Master store
        102: { name: "Outlet 1" },
        103: { name: "Outlet 2" }
      }
```

All projects in master store (sId=101) are automatically master projects.

### 4.3 Store Project Location & Local-Only Storage

Store project references master via `masterProjectId` (top-level):

```
projects/{tId}/{storeId}/{storeProjectId}
  └── masterProjectId: string         // Top-level, not nested
  └── overrides: { items: {...}, categories: {...}, attributes: {...} }
  └── files[] (contains local-only items/categories)
```

#### Local-Only Item/Category Storage (CRITICAL)

**Where local-only items go:** Store's `files[0].extractedData.data`

```typescript
// Store project structure for local-only items
storeProject.files[0].extractedData.data = {
  items: [
    // Local-only items with L_I_ prefix
    { id: "L_I_chef_special_001", name: {...}, price: "₹599", category: "L_C_specials" },
    { id: "L_I_local_drink_002", name: {...}, price: "₹149", category: "Beverages" }
  ],
  categories: [
    // Local-only categories with L_C_ prefix
    { id: "L_C_specials", name: { en: "Chef's Specials" }, active: true }
  ],
  languages: ["en", "hi"]
}
```

**ID Prefix Rules:**
| Type | Prefix | Example |
|------|--------|---------|
| Local item | `L_I_` | `L_I_chef_special_001` |
| Local category | `L_C_` | `L_C_daily_specials` |

**Why first file?**

- Keeps structure consistent with existing editor flow
- No structural changes needed — editor already works with `files[0]`
- Prefixes distinguish local from inherited at render time
- At merge: resolver combines master items + local items (filtered by prefix)

### 4.4 ProjectId Format (Critical for 2-Read Architecture)

```
projectId = `${tId}-${timestamp}-${sId}`
Example: "101-1705678900123-102"
         └─tId─┘ └──timestamp──┘ └sId┘
```

**Helper to extract storeId:**

```typescript
function extractStoreIdFromProjectId(projectId: string): number {
  const parts = projectId.split("-");
  return parseInt(parts[parts.length - 1], 10);
}
```

This eliminates the need for `masterStoreId` field — we extract it from `masterProjectId`.

### 4.5 Project ID Duplicate Check (Defensive)

**Problem:** While `{tId}-{timestamp}-{sId}` collisions are rare, they're catastrophic if they happen.

**Solution:** Check existence before create (1 read cost only if exists):

```typescript
/**
 * Generate unique project ID with collision check
 * Cost: 1 read ONLY if collision detected (extremely rare)
 */
async function generateUniqueProjectId(
  tId: number,
  sId: number,
): Promise<string> {
  const timestamp = Date.now().toString(36);
  const candidateId = `${tId}-${timestamp}-${sId}`;

  // Check if exists (defensive — collision is rare but catastrophic)
  const docRef = doc(
    firebaseClient,
    `${COLLECTION}/${tId}/${sId}`,
    candidateId,
  );
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    // Collision detected — add random suffix
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${tId}-${timestamp}-${suffix}-${sId}`;
  }

  return candidateId;
}
```

**Cost Analysis:**

- 99.99% of cases: 1 read (check) + 1 write (create) = 2 ops
- Collision case: 1 read (collision) + 1 read (retry check) + 1 write = 3 ops
- Worth the cost for data integrity

---

## 5. File Structure (Exact Paths)

### 5.1 New Files to Create

| File                                    | Purpose                  |
| --------------------------------------- | ------------------------ |
| `src/types/multiOutlet.types.ts`        | Type exports             |
| `src/lib/multiOutlet/resolveProject.ts` | Resolved menu builder    |
| `src/lib/multiOutlet/masterUtils.ts`    | Master project utilities |
| `src/lib/multiOutlet/overrideUtils.ts`  | Override application     |
| `src/lib/multiOutlet/molEvents.ts`      | MOL event logging        |
| `src/database/multiOutlet/index.ts`     | DAL for multi-outlet ops |

### 5.2 Files to Modify

| File                                                                | Change                         |
| ------------------------------------------------------------------- | ------------------------------ |
| `src/config/features.ts`                                            | Add `ENABLE_MULTI_OUTLET` flag |
| `src/components/templates/main-app/projects/types/project.types.ts` | Add optional fields            |
| `src/components/templates/main-app/projects/editorView/Editor.tsx`  | Add inheritance badges         |
| `src/app/_client/[[...slug]]/page.tsx`                              | Use resolved project           |

---

## 6. Core Engine: Resolved Project Builder

### 6.1 Resolver Module

**File:** `src/lib/multiOutlet/resolveProject.ts`

```typescript
import { FEATURE_FLAGS } from "@config/features";
import { Project } from "@template/main-app/projects/types/project.types";
import {
  ExtractedDataItem,
  ExtractedDataCategory,
} from "@template/main-app/projects/types/extractedData.types";
import { getProjectData, getProjectDataByStore } from "@database/projects";

/**
 * Extract tId and sId from projectId format: {tId}-{timestamp}-{sId}
 * This eliminates the need for passing these values separately.
 */
function parseProjectId(projectId: string): { tId: number; sId: number } {
  const parts = projectId.split("-");
  return {
    tId: parseInt(parts[0], 10),
    sId: parseInt(parts[parts.length - 1], 10),
  };
}

/**
 * DAL function for cross-store project lookup
 * MUST be created in src/database/projects/index.ts
 */
// export const getProjectDataByStore = async (tId, sId, projectId) => {...}

interface ResolveParams {
  projectId: string; // tId and sId extracted from projectId
}

interface ResolvedProject extends Project {
  _resolved?: {
    isMasterLinked: boolean;
    masterProjectId?: string;
    itemStates: Record<string, "inherited" | "overridden" | "local-only">;
    categoryStates: Record<string, "inherited" | "overridden" | "local-only">;
  };
}

/**
 * Resolve a project for rendering
 *
 * If store is linked to master:
 * 1. Load master project
 * 2. Merge master items with store overrides
 * 3. Append store local-only items
 * 4. Return resolved project (not persisted)
 */
export async function resolveProjectForRender(
  params: ResolveParams,
): Promise<ResolvedProject> {
  // Feature flag check
  if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
    const project = await getProjectData(params.projectId);
    return project as ResolvedProject;
  }

  // Load store project
  const storeProject = await getProjectData(params.projectId);

  // If no masterProjectId, return as-is (master store or single-store)
  if (!storeProject.masterProjectId) {
    return {
      ...storeProject,
      _resolved: {
        isMasterLinked: false,
        itemStates: {},
        categoryStates: {},
      },
    };
  }

  // 2-READ ARCHITECTURE: Extract tId and sId from masterProjectId format
  const { tId, sId: masterStoreId } = parseProjectId(
    storeProject.masterProjectId,
  );

  const masterProject = await getProjectDataByStore(
    tId,
    masterStoreId,
    storeProject.masterProjectId,
  );

  // Build resolved project
  return mergeProjects(masterProject, storeProject);
}

/**
 * Merge master + store into resolved view
 *
 * ⚠️ CONSTRAINT: Master-linked projects MUST be single-file menus.
 * Multi-file projects with master inheritance create complex merge scenarios
 * that risk dropping languages, images, or item ordering.
 *
 * Enforcement: linkStoreToMaster() validates both master and store are single-file.
 */
function mergeProjects(master: Project, store: Project): ResolvedProject {
  const overrides = store.overrides || { items: {}, categories: {} };
  const masterItems = extractItems(master);
  const masterCategories = extractCategories(master);
  const masterItemIds = new Set(masterItems.map((i) => i.id));
  const masterCategoryIds = new Set(masterCategories.map((c) => c.id));

  // Apply item overrides with CORRECT precedence:
  // 1. active=false → item hidden (highest priority)
  // 2. available=false → shown as unavailable
  // 3. else → shown normally
  const resolvedItems = masterItems
    .map((item) => {
      const override = overrides.items[item.id];
      if (!override) return item;

      return {
        ...item,
        price: override.price ?? item.price,
        description: override.description ?? item.description,
        images: override.images ?? item.images,
        available: override.available ?? item.available,
        active: override.active ?? item.active,
        orderIndex: override.orderIndex ?? item.orderIndex,
        isBestSeller: override.isBestSeller ?? item.isBestSeller,
        duration: override.duration ?? item.duration,
        ownerBoost: override.ownerBoost ?? item.ownerBoost,
      };
    })
    // Filter out items where active=false (hidden at this store)
    .filter((item) => item.active !== false);

  // Get local-only items from store
  const storeItems = extractItems(store);
  const localOnlyItems = storeItems.filter(
    (item) => !masterItemIds.has(item.id),
  );

  // Apply category overrides
  const resolvedCategories = masterCategories.map((cat) => {
    const override = overrides.categories[cat.id];
    if (!override) return cat;

    return {
      ...cat,
      active: override.active ?? cat.active,
    };
  });

  // Get local-only categories
  const storeCategories = extractCategories(store);
  const localOnlyCategories = storeCategories.filter(
    (cat) => !masterCategoryIds.has(cat.id),
  );

  // Sort categories by override orderIndex if present.
  // Items are also sorted within their category by item orderIndex so outlet
  // item reordering reaches the public customer menu.
  const sortedCategories = [...resolvedCategories, ...localOnlyCategories].sort(
    (a, b) => {
      const orderA = overrides.categories[a.id]?.orderIndex ?? Infinity;
      const orderB = overrides.categories[b.id]?.orderIndex ?? Infinity;
      return orderA - orderB;
    },
  );
  const categoryRenderOrder = new Map(
    sortedCategories.map((category, index) => [String(category.id), index]),
  );
  const sortedItems = sortItemsWithinCategoryByOrder(
    [...resolvedItems, ...localOnlyItems],
    categoryRenderOrder,
  );

  // Build item states
  const itemStates: Record<string, "inherited" | "overridden" | "local-only"> =
    {};
  masterItems.forEach((item) => {
    const hasOverride = overrides.items[item.id];
    itemStates[item.id] = hasOverride ? "overridden" : "inherited";
  });
  localOnlyItems.forEach((item) => {
    itemStates[item.id] = "local-only";
  });

  // Build category states
  const categoryStates: Record<
    string,
    "inherited" | "overridden" | "local-only"
  > = {};
  masterCategories.forEach((cat) => {
    const hasOverride = overrides.categories[cat.id];
    categoryStates[cat.id] = hasOverride ? "overridden" : "inherited";
  });
  localOnlyCategories.forEach((cat) => {
    categoryStates[cat.id] = "local-only";
  });

  // Return resolved project with merged data
  return {
    ...store,
    files: reconstructFiles(
      store,
      sortedItems,
      sortedCategories,
    ),
    _resolved: {
      isMasterLinked: true,
      masterProjectId: store.masterProjectId,
      itemStates,
      categoryStates,
    },
  };
}

// Helper functions
function extractItems(project: Project): ExtractedDataItem[] {
  return (
    project.files?.flatMap((f) => f.extractedData?.data?.items || []) || []
  );
}

function extractCategories(project: Project): ExtractedDataCategory[] {
  return (
    project.files?.flatMap((f) => f.extractedData?.data?.categories || []) || []
  );
}

/**
 * Reconstruct files array with merged items/categories
 *
 * CRITICAL: Preserve all file metadata to avoid breaking downstream consumers.
 * This function only replaces extractedData content, keeping all other fields.
 *
 * Implementation Notes:
 * - Uses store's file structure as base (preserves fileId, uploadInfo, etc.)
 * - Merges resolved items/categories into first file only
 * - Preserves languages from store (may differ from master)
 * - Multi-file projects: Only first file gets resolved data
 */
function reconstructFiles(
  store: Project,
  items: ExtractedDataItem[],
  categories: ExtractedDataCategory[],
): ProjectFileType[] {
  if (!store.files?.length) return [];

  // Preserve first file with all its metadata, only replace extractedData.data
  const firstFile = store.files[0];
  const resolvedFirstFile = {
    ...firstFile,
    extractedData: {
      ...firstFile.extractedData,
      data: {
        items,
        categories,
        // Preserve store's language configuration
        languages: firstFile.extractedData?.data?.languages || [],
      },
    },
  };

  // If store has multiple files, keep remaining files unchanged
  // (they may contain local-only data or store-specific content)
  if (store.files.length > 1) {
    return [resolvedFirstFile, ...store.files.slice(1)];
  }

  return [resolvedFirstFile];
}
```

---

## 7. DAL Functions

### 7.1 Multi-Outlet DAL

**File:** `src/database/multiOutlet/index.ts`

```typescript
import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { getActiveSession } from "@lib/auth";
import { updateDoc, doc, getDoc } from "firebase/firestore";
import { logMultiOutletEvent } from "@lib/multiOutlet/molEvents";
import { getProjectDataByStore } from "@database/projects";

const COLLECTION = DB_COLLECTIONS.PROJECTS;

/**
 * Extract tId and sId from projectId format: {tId}-{timestamp}-{sId}
 */
function parseProjectId(projectId: string): { tId: number; sId: number } {
  const parts = projectId.split("-");
  return {
    tId: parseInt(parts[0], 10),
    sId: parseInt(parts[parts.length - 1], 10),
  };
}

/**
 * Set store as master store
 *
 * ⚠️ FEATURE FLAG GATED: ENABLE_CHANGE_MASTER_STORE
 * By default, first store is master. This enables changing master store later.
 *
 * NOTE: isMaster is stored at STORE level in storesSummary, not project level.
 * All projects in the master store are automatically considered master projects.
 */
export const setStoreAsMaster = async (storeId: number) => {
  if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
    throw new Error("Multi-store feature is disabled");
  }

  if (!FEATURE_FLAGS.ENABLE_CHANGE_MASTER_STORE) {
    throw new Error("Changing master store is disabled. Contact support.");
  }

  // Implementation: Update storesSummary.stores[storeId].isMaster = true
  // See platformSummary DAL for actual implementation
};

/**
 * Link store project to master project
 *
 * NOTE: tId and sId extracted from masterProjectId format.
 * No need to pass them separately.
 */
export const linkStoreToMaster = async (
  storeProjectId: string,
  masterProjectId: string,
) => {
  if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
    throw new Error("Multi-store feature is disabled");
  }

  return await apiCallComposer(
    async () => {
      const session = await getActiveSession();

      // Extract tId and sId from masterProjectId format: {tId}-{timestamp}-{sId}
      const { tId, sId: masterStoreId } = parseProjectId(masterProjectId);

      // Validate master exists at extracted store
      const masterProject = await getProjectDataByStore(
        tId,
        masterStoreId,
        masterProjectId,
      );

      if (!masterProject) {
        throw new Error("Master project not found");
      }

      // CONSTRAINT: Master must be single-file menu
      if (masterProject.files?.length > 1) {
        throw new Error(
          "Master project must be single-file. Multi-file projects cannot be masters.",
        );
      }

      // Validate store project is in current session's store
      const storeRef = doc(
        firebaseClient,
        `${COLLECTION}/${session.tId}/${session.sId}`,
        storeProjectId,
      );

      // CONSTRAINT: Store project must also be single-file
      const storeSnap = await getDoc(storeRef);
      if (storeSnap.exists() && storeSnap.data()?.files?.length > 1) {
        throw new Error("Store project must be single-file to link to master.");
      }

      // Store only masterProjectId at top level — tId/sId extracted at read time
      await updateDoc(storeRef, {
        masterProjectId,
        overrides: { items: {}, categories: {} },
      });

      await logMultiOutletEvent({
        type: "STORE_LINKED_TO_MASTER",
        tId: session.tId,
        sId: session.sId,
        projectId: storeProjectId,
        actorUserId: session.uId,
        metadata: { masterProjectId },
      });

      return { success: true };
    },
    { storeProjectId, masterProjectId },
    "linkStoreToMaster",
  );
};

/**
 * Switch store from one master to another
 *
 * ✅ FR-11 COMPLIANT: Chain invariant maintained — store always has a master.
 * This is the ONLY way to change a store's master.
 */
export const switchStoreMaster = async (
  storeProjectId: string,
  newMasterProjectId: string,
) => {
  if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
    throw new Error("Multi-store feature is disabled");
  }

  return await apiCallComposer(
    async () => {
      const session = await getActiveSession();

      // Extract tId and sId from newMasterProjectId
      const { tId, sId: newMasterStoreId } = parseProjectId(newMasterProjectId);

      // Validate new master exists
      const newMasterProject = await getProjectDataByStore(
        tId,
        newMasterStoreId,
        newMasterProjectId,
      );

      if (!newMasterProject) {
        throw new Error("New master project not found");
      }

      // Single-file constraint
      if (newMasterProject.files?.length > 1) {
        throw new Error("New master must be single-file menu");
      }

      const storeRef = doc(
        firebaseClient,
        `${COLLECTION}/${session.tId}/${session.sId}`,
        storeProjectId,
      );

      // Update store to point to new master (clears old overrides)
      await updateDoc(storeRef, {
        masterProjectId: newMasterProjectId,
        overrides: { items: {}, categories: {} }, // Fresh start with new master
      });

      await logMultiOutletEvent({
        type: "STORE_SWITCHED_MASTER",
        tId: session.tId,
        sId: session.sId,
        projectId: storeProjectId,
        actorUserId: session.uId,
        metadata: { newMasterProjectId },
      });

      return { success: true };
    },
    { storeProjectId, newMasterProjectId },
    "switchStoreMaster",
  );
};

/**
 * Unlink store from master
 *
 * ⚠️ FEATURE FLAG GATED: ENABLE_UNLINK_FROM_MASTER
 * By default, stores cannot unlink from master (chain invariant).
 * Enable only if client requests standalone store capability.
 */
export const unlinkStoreFromMaster = async (storeProjectId: string) => {
  if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
    throw new Error("Multi-store feature is disabled");
  }

  if (!FEATURE_FLAGS.ENABLE_UNLINK_FROM_MASTER) {
    throw new Error("Unlinking from master is disabled. Contact support.");
  }

  return await apiCallComposer(
    async () => {
      const session = await getActiveSession();

      const storeRef = doc(
        firebaseClient,
        `${COLLECTION}/${session.tId}/${session.sId}`,
        storeProjectId,
      );

      // Remove masterProjectId — store becomes standalone
      await updateDoc(storeRef, {
        masterProjectId: null,
        // Keep overrides in case they re-link later
      });

      await logMultiOutletEvent({
        type: "STORE_UNLINKED_FROM_MASTER",
        tId: session.tId,
        sId: session.sId,
        projectId: storeProjectId,
        actorUserId: session.uId,
      });

      return { success: true };
    },
    { storeProjectId },
    "unlinkStoreFromMaster",
  );
};

/**
 * Apply override to store project
 *
 * ⚠️ CRITICAL: Validates item exists in master before writing override.
 * This prevents garbage overrides for non-existent items.
 */
export const applyItemOverride = async (
  storeProjectId: string,
  itemId: string,
  override: { price?: string; available?: boolean; active?: boolean },
) => {
  if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
    throw new Error("Multi-store feature is disabled");
  }

  return await apiCallComposer(
    async () => {
      const session = await getActiveSession();

      // Get store project to find master reference
      const storeRef = doc(
        firebaseClient,
        `${COLLECTION}/${session.tId}/${session.sId}`,
        storeProjectId,
      );
      const storeSnap = await getDoc(storeRef);

      if (!storeSnap.exists()) {
        throw new Error("Store project not found");
      }

      const storeData = storeSnap.data();
      const masterProjectId = storeData.masterProjectId;

      if (!masterProjectId) {
        throw new Error("Store is not linked to a master");
      }

      // Extract tId and sId from masterProjectId format
      const { tId, sId: masterStoreId } = parseProjectId(masterProjectId);

      // CRITICAL: Validate item exists in master before allowing override
      const masterProject = await getProjectDataByStore(
        tId,
        masterStoreId,
        masterProjectId,
      );

      const masterItems =
        masterProject.files?.flatMap(
          (f: any) => f.extractedData?.data?.items || [],
        ) || [];
      const masterItemIds = new Set(masterItems.map((i: any) => i.id));

      if (!masterItemIds.has(itemId)) {
        throw new Error(
          `Cannot override item "${itemId}": Item does not exist in master. ` +
            `For local-only items, add directly to store's extractedData.`,
        );
      }

      await updateDoc(storeRef, {
        [`overrides.items.${itemId}`]: { itemId, ...override },
      });

      await logMultiOutletEvent({
        type: "STORE_OVERRIDE_APPLIED",
        tId: session.tId,
        sId: session.sId,
        projectId: storeProjectId,
        actorUserId: session.uId,
        metadata: { itemId, override },
      });

      return { success: true };
    },
    { storeProjectId, itemId, override },
    "applyItemOverride",
  );
};

/**
 * Get all stores linked to a master (Admin UI only)
 *
 * SIMPLIFIED ARCHITECTURE: No index collection needed.
 *
 * For customer-facing render: Only 2 reads (store + master)
 * For admin "show all stores": Scan stores from storesSummary
 *
 * This is acceptable because:
 * 1. Customer render is the hot path (optimized to 2 reads)
 * 2. Admin "show stores" is cold path (infrequent, can tolerate N reads)
 * 3. Typical chain has 2-10 stores, so N is small
 */
export const getLinkedStores = async (masterProjectId: string) => {
  if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
    return { stores: [] };
  }

  return await apiCallComposer(
    async () => {
      const session = await getActiveSession();

      // Get all stores from storesSummary (already cached)
      const storesSummary = await getStoresSummary();
      const { sId: masterStoreId } = parseProjectId(masterProjectId);

      // Filter to regular stores (not master store)
      const regularStoreIds = Object.keys(storesSummary?.stores || {})
        .map(Number)
        .filter((sId) => sId !== masterStoreId);

      // Scan each store for projects linked to this master
      const linkedStores: Array<{ sId: number; projectId: string }> = [];

      for (const sId of regularStoreIds) {
        const projectsSummary = await getProjectsSummary(sId);
        const projects = projectsSummary?.projects || {};

        for (const [projectId, projectData] of Object.entries(projects)) {
          // Check if this project links to the master (flattened masterProjectId)
          if ((projectData as any).masterProjectId === masterProjectId) {
            linkedStores.push({ sId, projectId });
          }
        }
      }

      return { stores: linkedStores };
    },
    { masterProjectId },
    "getLinkedStores",
  );
};
```

---

## 8. MOL Event Logging

### 8.1 Multi-Outlet Events

**File:** `src/lib/multiOutlet/molEvents.ts`

```typescript
import { FEATURE_FLAGS } from "@config/features";
import { secureLog } from "@lib/security/secureLogger";
import { sanitizeForFirestore } from "@lib/auth/security";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { DB_COLLECTIONS } from "@constant/database";

interface MultiStoreMOLEvent {
  type:
    | "MASTER_MENU_UPDATED"
    | "STORE_LINKED_TO_MASTER"
    | "STORE_UNLINKED_FROM_MASTER"
    | "STORE_SWITCHED_MASTER"
    | "STORE_OVERRIDE_APPLIED"
    | "STORE_LOCAL_ITEM_ADDED"
    | "MASTER_PROPAGATION_COMPLETED";
  tId: number;
  sId: number;
  projectId: string;
  actorUserId: string;
  metadata?: Record<string, any>;
}

/**
 * Log multi-outlet event to MOL
 * Fire-and-forget, non-blocking
 */
export async function logMultiOutletEvent(
  event: MultiOutletMOLEvent,
): Promise<void> {
  // Check both feature flags
  if (
    !FEATURE_FLAGS.ENABLE_MULTI_OUTLET ||
    !FEATURE_FLAGS.ENABLE_MENU_OBSERVATION
  ) {
    secureLog("[MOL] Multi-outlet event skipped (feature flag off)", {
      type: event.type,
    });
    return;
  }

  try {
    const logEntry = sanitizeForFirestore({
      ...event,
      createdOn: Timestamp.now(),
      source: "multi-outlet",
    });

    // Fire-and-forget write
    addDoc(
      collection(firebaseClient, DB_COLLECTIONS.MENU_CHANGE_LOG),
      logEntry,
    ).catch((err) => {
      secureLog("[MOL] Failed to log multi-outlet event", {
        error: err.message,
      });
    });
  } catch (error) {
    // Silent failure - MOL is non-critical
    secureLog("[MOL] Error preparing multi-outlet event", { error });
  }
}
```

---

## 9. UI Implementation

### 9.1 Inheritance Badges Component

**File:** `src/components/atoms/InheritanceBadge/index.tsx`

```typescript
import { Tag } from "antd";
import { FaLink, FaEdit, FaMapMarkerAlt } from "react-icons/fa";

interface InheritanceBadgeProps {
    state: 'inherited' | 'overridden' | 'local-only';
    overrideType?: 'price' | 'availability' | 'hidden';
}

export const InheritanceBadge: React.FC<InheritanceBadgeProps> = ({ state, overrideType }) => {
    switch (state) {
        case 'inherited':
            return (
                <Tag icon={<FaLink />} color="default">
                    Inherited from Master
                </Tag>
            );
        case 'overridden':
            return (
                <Tag icon={<FaEdit />} color="blue">
                    {overrideType === 'price' && 'Price Overridden'}
                    {overrideType === 'availability' && 'Availability Changed'}
                    {overrideType === 'hidden' && 'Hidden at this outlet'}
                    {!overrideType && 'Overridden'}
                </Tag>
            );
        case 'local-only':
            return (
                <Tag icon={<FaMapMarkerAlt />} color="green">
                    Local-only
                </Tag>
            );
        default:
            return null;
    }
};
```

### 9.2 Editor Integration Points

In `src/components/templates/main-app/projects/editorView/Editor.tsx`:

```typescript
// Add to item row rendering
{FEATURE_FLAGS.ENABLE_MULTI_OUTLET && resolvedProject._resolved?.isMasterLinked && (
    <InheritanceBadge
        state={resolvedProject._resolved.itemStates[item.id]}
        overrideType={getOverrideType(item.id)}
    />
)}

// Lock inherited fields
const isFieldLocked = (itemId: string, field: string) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) return false;
    if (!resolvedProject._resolved?.isMasterLinked) return false;

    const state = resolvedProject._resolved.itemStates[itemId];
    if (state === 'local-only') return false;

    // Lock brand-critical fields for inherited items
    return ['name', 'description', 'images', 'category'].includes(field);
};
```

---

## 10. Security Checklist

| Requirement                      | Implementation                | File                               |
| -------------------------------- | ----------------------------- | ---------------------------------- |
| ☐ `withAuth()` on all API routes | Add to multi-outlet endpoints | `src/app/api/multiOutlet/`         |
| ☐ `verifyTenantAccess()`         | Check tId matches session     | `src/database/multiOutlet/`        |
| ☐ Zod validation                 | Validate projectId, overrides | `src/lib/validation/`              |
| ☐ Rate limiting                  | Add to expensive operations   | API routes                         |
| ☐ MOL logging                    | All actions logged            | `src/lib/multiOutlet/molEvents.ts` |
| ☐ Role check for master edit     | `canEditMaster` permission    | DAL functions                      |

### 10.1 Role Enforcement Implementation

```typescript
/**
 * Check if user can edit master project
 * HQ Admin = can edit master
 * Outlet Manager = cannot edit master
 */
async function canEditMaster(
  session: SessionData,
  projectId: string,
): Promise<boolean> {
  // Get project to check if it's a master
  const project = await getProjectData(projectId);
  if (!project.isMaster) return true; // Not a master, allow edit

  // Check user role - must be admin or owner
  const userRole = session.role; // Assumes role is in session
  return userRole === "admin" || userRole === "owner";
}

/**
 * Guard function for master operations
 */
async function requireMasterEditPermission(
  session: SessionData,
  projectId: string,
): Promise<void> {
  if (!(await canEditMaster(session, projectId))) {
    throw new Error("Insufficient permissions to edit master project");
  }
}
```

### 10.2 Locked Fields Server-Side Validation

```typescript
const LOCKED_FIELDS = ["name", "description", "images", "category"] as const;

/**
 * Validate that outlet edit doesn't modify locked fields
 */
function validateOutletEdit(
  originalItem: ExtractedDataItem,
  editedItem: Partial<ExtractedDataItem>,
  isInheritedItem: boolean,
): void {
  if (!isInheritedItem) return; // Local items can edit anything

  for (const field of LOCKED_FIELDS) {
    if (field in editedItem && editedItem[field] !== originalItem[field]) {
      throw new Error(
        `Cannot modify locked field "${field}" on inherited item`,
      );
    }
  }
}
```

---

## 11. Firebase Cost Analysis

### 11.1 Master Project Cache

The resolver includes an in-memory cache for master projects to reduce Firestore reads when multiple outlets render against the same master in quick succession.

**Implementation:** `src/lib/multiOutlet/resolveProject.ts`

```typescript
// Cache TTL: 30 seconds
const MASTER_CACHE_TTL_MS = 30 * 1000;

// Usage: getCachedMasterProject(tId, masterStoreId, masterProjectId)

// Invalidation (call when master is updated):
invalidateMasterCache(masterProjectId);
clearMasterCache(); // For admin operations
```

**Behavior:**

- First request fetches from Firestore and caches
- Subsequent requests within 30s return cached data
- Cache auto-cleans when size exceeds 100 entries
- 30s staleness acceptable per spec (user refreshes get latest)

### 11.2 Read Costs

| Operation           | Reads | When                       |
| ------------------- | ----- | -------------------------- |
| Resolve outlet menu | 1-2   | 1 if cached, 2 if cold     |
| Get linked outlets  | N     | Admin views linked list    |
| Cache hit           | 0     | Master cache or SWR reused |

**Estimated Monthly (100 outlets):**

- ~1.5 reads × 100 outlets × 1000 renders = 150,000 reads (with cache)
- Cost: ~$0.09/month (negligible)

### 11.3 Write Costs

| Operation      | Writes | When                   |
| -------------- | ------ | ---------------------- |
| Link outlet    | 1      | One-time setup         |
| Apply override | 1      | Owner action           |
| MOL event      | 1      | Per action (debounced) |

**Estimated Monthly:**

- 100 outlets × 10 overrides × 30 days = 30,000 writes
- Cost: ~$0.05/month (negligible)

---

## 12. Phase Checklist

### Phase 1: Foundation (Week 1)

| Task                                         | Status |
| -------------------------------------------- | ------ |
| ✅ Add `ENABLE_MULTI_OUTLET` feature flag    | Done   |
| ✅ Extend Project types with optional fields | Done   |
| ✅ Create `src/types/multiOutlet.types.ts`   | Done   |
| ✅ Create `src/lib/multiOutlet/` module      | Done   |
| ✅ Implement `resolveProjectForRender()`     | Done   |
| ✅ Add MOL event logging                     | Done   |

### Phase 2: DAL & API (Week 2)

| Task                                          | Status                  |
| --------------------------------------------- | ----------------------- |
| ✅ Create `src/database/multiOutlet/index.ts` | Done                    |
| ☐ Implement `setProjectAsMaster()`            | N/A (via storesSummary) |
| ✅ Implement `linkStoreToMaster()`            | Done                    |
| ✅ Implement `unlinkStoreFromMaster()`        | Done                    |

### Phase 3: UI Integration (Week 3)

| Task                                           | Status             |
| ---------------------------------------------- | ------------------ |
| Create `InheritanceBadge` component            | Done               |
| Update EditorContent.tsx with badges           | Done               |
| Update Editor.tsx with resolved data           | Done               |
| Update AdvancedView with multi-outlet          | Done               |
| Update FocusView with multi-outlet             | Done               |
| Update TraditionalView with badges             | Done               |
| Lock inherited fields in editor                | Done               |
| Delete protection for inherited items          | Done               |
| **Lock fields in EditItemModal**               | Done (Feb 5, 2026) |
| **Lock fields in EditCategoryModal**           | Done (Feb 5, 2026) |
| **Pass governance to TraditionalView modals**  | Done (Feb 5, 2026) |
| **Add isBestSeller toggle to EditItemModal**   | Done (Feb 5, 2026) |
| **Create StoreCustomizationModal for outlets** | Done (Feb 5, 2026) |
| Add "Mark as Master" UI                        | Future             |
| Add "Link to Master" UI                        | Future             |
| Update B2C view with resolved project          | Future             |

---

## 13. Backwards Compatibility Tests

### Test A: Single-Store Unchanged

```typescript
// Project without masterRef renders normally
const project = await getProjectData(projectId);
// No masterRef → resolveProjectForRender returns unchanged
expect(resolved._resolved.isMasterLinked).toBe(false);
```

### Test B: Master Link Works

```typescript
// Outlet linked to master shows inherited items
await linkOutletToMaster(outletId, masterId);
const resolved = await resolveProjectForRender({ projectId: outletId });
expect(resolved._resolved.isMasterLinked).toBe(true);
expect(resolved._resolved.itemStates["item1"]).toBe("inherited");
```

### Test C: Override Works

```typescript
// Override applied correctly
await applyItemOverride(outletId, "item1", { price: "999" });
const resolved = await resolveProjectForRender({ projectId: outletId });
expect(resolved._resolved.itemStates["item1"]).toBe("overridden");
```

### Test D: Local-Only Works

```typescript
// Local item appears only at outlet
const localItem = { id: "local1", name: { en: "Chef's Special" } };
// Add to outlet extractedData
const resolved = await resolveProjectForRender({ projectId: outletId });
expect(resolved._resolved.itemStates["local1"]).toBe("local-only");
```

---

## 14. Failure Modes (Guardrails)

| Failure                      | Prevention                               |
| ---------------------------- | ---------------------------------------- |
| Outlet linked to non-master  | Validate `isMaster: true` before linking |
| Cross-tenant linking         | `tId` check in DAL                       |
| ItemId collision             | Local items use `L_` prefix              |
| Override on missing item     | Ignore + log warning                     |
| Master deletion with outlets | Block deletion (FR-11.3)                 |
| Master item ID regenerated   | Stabilize IDs — never regenerate         |

---

## 15. Override Resolution Contract (NEW)

### 15.1 Core Rules

| Rule  | Description                                            | Implementation                                 |
| ----- | ------------------------------------------------------ | ---------------------------------------------- |
| **A** | Outlet override ALWAYS wins until explicitly cleared   | Check `!== undefined` not truthy               |
| **B** | Master price changes do NOT overwrite outlet overrides | Override persists across master updates        |
| **C** | Redundant override cleanup is safe                     | If override.price === master.price, may delete |
| **D** | Never auto-remove non-redundant overrides              | Only user action clears overrides              |
| **E** | Render is pure — never write resolved results          | `_resolved` is ephemeral, not persisted        |

### 15.2 Conflict Resolution Table

| Scenario           | Master Value | Override Value | Displayed Value | Notes               |
| ------------------ | ------------ | -------------- | --------------- | ------------------- |
| No override        | ₹499         | —              | ₹499            | Inherited           |
| Price override     | ₹499         | ₹699           | ₹699            | Override wins       |
| Master changes     | ₹499→₹599    | ₹699           | ₹699            | Override still wins |
| Override cleared   | ₹599         | (deleted)      | ₹599            | Reverts to master   |
| Available override | true         | false          | false           | Sold out locally    |
| Active override    | true         | false          | (hidden)        | Not shown at outlet |

### 15.3 Write Contract

| Operation      | Firestore Changes                                        | Validation                            | MOL Event                 |
| -------------- | -------------------------------------------------------- | ------------------------------------- | ------------------------- |
| Mark as Master | `isMaster: true`, delete `masterRef`, delete `overrides` | Not already master                    | `MASTER_MENU_UPDATED`     |
| Link to Master | `masterRef: {...}`, `overrides: {}`                      | Master exists, is master, same tenant | `OUTLET_LINKED_TO_MASTER` |
| Apply Override | `overrides.items[id]: {...}`                             | Item exists in master                 | `OUTLET_OVERRIDE_APPLIED` |
| Clear Override | delete `overrides.items[id]`                             | Override exists                       | `OUTLET_OVERRIDE_REMOVED` |
| Add Local Item | Add to `files[0].extractedData.data.items`               | ID starts with `L_`                   | `OUTLET_LOCAL_ITEM_ADDED` |

### 15.4 Local ID Convention (Items & Categories)

```typescript
// Local-only IDs MUST use prefixes to prevent collision with master IDs
const LOCAL_ITEM_PREFIX = "L_I_"; // For local-only items
const LOCAL_CATEGORY_PREFIX = "L_C_"; // For local-only categories

/**
 * Generate unique local item ID
 */
function generateLocalItemId(): string {
  return `${LOCAL_ITEM_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generate unique local category ID
 */
function generateLocalCategoryId(): string {
  return `${LOCAL_CATEGORY_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Check if ID is local-only (item or category)
 */
function isLocalItem(itemId: string): boolean {
  return itemId.startsWith(LOCAL_ITEM_PREFIX);
}

function isLocalCategory(categoryId: string): boolean {
  return categoryId.startsWith(LOCAL_CATEGORY_PREFIX);
}

/**
 * Validate local item references valid category
 * Local items can reference: master categories OR local categories
 */
function validateLocalItemCategory(
  itemCategoryId: string,
  masterCategoryIds: Set<string>,
  localCategoryIds: Set<string>,
): boolean {
  return (
    masterCategoryIds.has(itemCategoryId) ||
    localCategoryIds.has(itemCategoryId)
  );
}
```

**ID Prefix Rules:**

| Type            | Prefix | Example                 | Notes                  |
| --------------- | ------ | ----------------------- | ---------------------- |
| Local Item      | `L_I_` | `L_I_1705678900_a3f2b1` | Outlet-only menu items |
| Local Category  | `L_C_` | `L_C_1705678900_x9y8z7` | Outlet-only categories |
| Master Item     | (none) | `item_abc123`           | From master, no prefix |
| Master Category | (none) | `cat_def456`            | From master, no prefix |

---

## 16. QA Test Matrix (Expanded)

### 16.1 Release Gate Tests (MUST PASS)

| ID  | Category          | Test Case                                | Expected Result                       | Priority |
| --- | ----------------- | ---------------------------------------- | ------------------------------------- | -------- |
| T1  | Feature Flag      | Flag OFF = zero behavior change          | Single-store unchanged                | P0       |
| T2  | Feature Flag      | Flag OFF = no masterRef/overrides fields | Fields not present                    | P0       |
| T6  | Master Rules      | Mark project as master                   | `isMaster: true` set                  | P0       |
| T7  | Master Rules      | Master cannot link to another master     | Error thrown                          | P0       |
| T11 | Linking           | Link outlet to master                    | `masterRef` set correctly             | P0       |
| T12 | Linking           | Link validates master exists             | Error if invalid masterProjectId      | P0       |
| T16 | Resolver          | Resolve outlet returns master items      | All master items visible              | P0       |
| T17 | Resolver          | Resolve outlet with override             | Override value displayed              | P0       |
| T22 | Overrides         | Price override persists                  | Override not cleared by master change | P0       |
| T24 | Overrides         | Active override hides item               | Item not in resolved menu             | P0       |
| T31 | Pricing Integrity | Master price change marks outlet stale   | `pricingIntegrity.status: STALE`      | P0       |
| T36 | Security          | Outlet cannot modify another store       | Error thrown                          | P0       |
| T39 | Security          | Override payload strict schema           | Zod validation rejects invalid        | P0       |

### 16.2 Backwards Compatibility Tests

| ID  | Test Case                           | Expected Result       |
| --- | ----------------------------------- | --------------------- |
| BC1 | Single-store tenant with flag ON    | No change in behavior |
| BC2 | Project without masterRef           | Renders normally      |
| BC3 | Project without overrides           | Renders normally      |
| BC4 | Existing projects after flag enable | No migration needed   |

### 16.3 Edge Case Tests

| ID  | Test Case                                 | Expected Result                      |
| --- | ----------------------------------------- | ------------------------------------ |
| EC1 | Master deleted while outlets exist        | Deletion blocked                     |
| EC2 | Master item removed, outlet has override  | Override orphaned, item disappears   |
| EC3 | Two HQ admins edit master simultaneously  | Last-write-wins + MOL trail          |
| EC4 | Outlet switches from Master A to Master B | Overrides cleared, fresh inheritance |
| EC5 | Local item with same name as master item  | Both exist (different IDs)           |

---

## 17. Progress Tracking

| Phase             | Status      | Completed    |
| ----------------- | ----------- | ------------ |
| 1. Foundation     | ✅ Complete | Jan 25, 2026 |
| 2. DAL & API      | ✅ Complete | Jan 25, 2026 |
| 3. UI Integration | ✅ Complete | Jan 25, 2026 |
| 4. Testing        | 🔄 Ready    | Pending QA   |
| 5. Documentation  | ✅ Complete | Jan 25, 2026 |

> **Note:** Implementation complete. Feature flag `ENABLE_MULTI_OUTLET` set to `true`. Ready for QA testing.

---

## 18. Decision Rationale & Architecture History

> **Purpose:** Document WHY decisions were made for future reference. This section captures ChatGPT discussions, rejected alternatives, and final resolutions.

### 18.1 Architecture Decisions

#### AD-1: Why `masterStoreId` Was Rejected

**ChatGPT Proposed:** Store `masterRef: { masterProjectId, masterStoreId, lastSyncedOn }`

**Final Decision:** Store only `masterProjectId` at top-level (not nested)

**Rationale:**

- ProjectId format is `{tId}-{timestamp}-{sId}` — storeId extractable at runtime
- `parseProjectId()` function handles extraction
- Eliminates redundant field, reduces storage
- Enables direct Firestore querying: `where('masterProjectId', '==', 'xxx')`

**Code Evidence:** `src/lib/multiOutlet/resolveProject.ts:32-41`

---

#### AD-2: Why No New Collections (multiOutletIndex Rejected)

**ChatGPT Proposed:** `tenants/{tId}/multiOutletIndex/{masterProjectId}` for listing linked outlets

**Final Decision:** No new collections — use direct doc reads only

**Rationale:**

- Violates Non-Negotiable Principle #2: "No new collections"
- 2-read architecture sufficient: 1 store project + 1 master project
- Admin "list outlets" is cold path — acceptable to scan
- Future: Can add `where('masterProjectId', '==', xxx)` query if needed

**Spec Reference:** impl.md §0 Principle #2

---

#### AD-3: Why Client-Side Comparison (Not Server-Side)

**ChatGPT Proposed:** Server-side comparison in Cloud Function

**Final Decision:** Client-side comparison engine

**Rationale:**
| Factor | Server-Side | Client-Side ✅ |
|--------|-------------|----------------|
| Data availability | Needs extra Firestore reads | Already has project data in React state |
| Iteration speed | Redeploy Cloud Functions | Frontend-only changes |
| Timeout risk | Cloud Functions have 540s limit | No timeout constraints |
| User experience | Wait for server comparison | Instant local comparison |

**Code Evidence:** `src/lib/extraction/comparisonEngine.ts`

---

#### AD-4: Why Read-Time Resolution (Not Sync/Copy)

**ChatGPT Proposed:** Copy master data to outlets on update

**Final Decision:** Reference model with read-time resolution

**Rationale:**

- Copy creates drift (the exact problem we're solving)
- Read-time = always current master data
- No background sync jobs needed
- Changes reflect on next render (instant)

**Code Evidence:** `src/lib/multiOutlet/resolveProject.ts:84-136`

---

#### AD-5: Why `isMaster` at Store Level (Not Project Level)

**ChatGPT Proposed:** `isMaster: boolean` on each project document

**Final Decision:** `storesSummary.stores[sId].isMaster` at store level

**Rationale:**

- All projects in master store are masters by definition
- Single source of truth (not per-project)
- Simpler querying pattern
- Aligns with existing `storesSummary` structure

**Spec Reference:** impl.md §4.2

---

#### AD-6: Why `combinedWithFileId` Was Removed

**Original Purpose:** Defensive fallback when AI doesn't return `sourceFileIndex`

**Final Decision:** Remove — fail fast if `sourceFileIndex` missing

**Rationale:**

- Dead code — never triggered in practice
- AI prompt always includes `sourceFileIndex` instructions
- Adds complexity for scenario that doesn't happen
- If AI fails, should fail fast with clear error

**Session Reference:** CASCADE-FULL-SESSION-JAN24-2026.md Phase 4

---

### 18.2 ChatGPT Feedback Rounds Summary

| Round | Date   | Key Issues Identified     | Resolution                                    |
| ----- | ------ | ------------------------- | --------------------------------------------- |
| 1     | Jan 19 | 5 architectural landmines | All fixed in spec/impl                        |
| 2     | Jan 19 | 9 critical issues         | storeId extraction, index approach            |
| 3     | Jan 19 | 7 final issues            | Principle #2 clarified, prefix rules          |
| 4     | Jan 20 | Simplification            | Removed `masterStoreId`, no index collection  |
| 5     | Jan 20 | Terminology               | "outlet" → "store", flatten `masterProjectId` |
| 6     | Jan 21 | Field classification      | All overridable/locked fields documented      |
| 7     | Jan 21 | Architecture hardening    | ID stability, access permissions              |

**Total Feedback Points:** 78 analyzed

- Accepted: 52 (67%)
- Rejected: 12 (15%)
- Partial/Clarified: 14 (18%)

---

### 18.3 Rejected Features (Permanent)

Per MenuList Constitution — these violate core doctrine:

| Feature                  | Rejection Reason                   | Law Violated                       |
| ------------------------ | ---------------------------------- | ---------------------------------- |
| Override Audit Trail UI  | Creates "audit mindset"            | Law 8: Trust > Engagement          |
| Analytics Dashboard      | Pre-rejected category              | Pre-Rejected List                  |
| Approval Workflows       | ADDS decisions instead of removing | Law 6: No Cognitive Load           |
| POS/Inventory Sync       | "We're not a connector"            | Pre-Rejected List                  |
| Franchise Royalties      | Out of scope                       | Not MenuList domain                |
| Bulk Actions UI          | "Mass control" mindset             | Law 7: No Feature Without Autonomy |
| Version Control/Rollback | Creates audit/revert mindset       | Law 8: Trust > Engagement          |

**Architect Note:** Most ChatGPT suggestions reflect traditional SaaS thinking (more features = more value). MenuList philosophy is opposite: fewer decisions = more trust.

---

### 18.4 Validated Future Features (Post-P0)

These passed the Feature Rejection Gate but are deferred:

| Feature                    | Status   | Implementation                     |
| -------------------------- | -------- | ---------------------------------- |
| SKU field support          | APPROVED | Schema addition, optional field    |
| Auto item matching on link | APPROVED | Silent, no UI                      |
| Price variance limits      | APPROVED | Silent enforcement, support-config |
| Language inheritance       | APPROVED | Already in current design          |

---

## 19. Implementation Validation Checklist

### 19.1 Files Created (Verified)

| File                                              | Purpose          | Lines | Status     |
| ------------------------------------------------- | ---------------- | ----- | ---------- |
| `src/config/features.ts`                          | Feature flags    | +55   | ✅ Created |
| `src/types/multiOutlet.types.ts`                  | Type exports     | 156   | ✅ Created |
| `src/lib/multiOutlet/index.ts`                    | Public API       | 65    | ✅ Created |
| `src/lib/multiOutlet/resolveProject.ts`           | Core resolver    | 352   | ✅ Created |
| `src/lib/multiOutlet/masterUtils.ts`              | Master utilities | 165   | ✅ Created |
| `src/lib/multiOutlet/overrideUtils.ts`            | Override helpers | 280   | ✅ Created |
| `src/lib/multiOutlet/molEvents.ts`                | MOL logging      | 278   | ✅ Created |
| `src/database/multiOutlet/index.ts`               | DAL functions    | 868   | ✅ Created |
| `src/components/atoms/InheritanceBadge/index.tsx` | UI badge         | 108   | ✅ Created |

### 19.2 AI Extraction Integration Files

| File                                           | Purpose                  | Lines | Status     |
| ---------------------------------------------- | ------------------------ | ----- | ---------- |
| `src/lib/extraction/normalize.ts`              | Name normalization       | 60    | ✅ Created |
| `src/lib/extraction/similarity.ts`             | Levenshtein matching     | 160   | ✅ Created |
| `src/lib/extraction/validation.ts`             | Price/item validation    | 160   | ✅ Created |
| `src/lib/extraction/redistribute.ts`           | Client-side redistribute | 340   | ✅ Created |
| `src/lib/extraction/comparisonEngine.ts`       | Main comparison          | 919   | ✅ Created |
| `src/lib/extraction/comparisonEngine.types.ts` | Type definitions         | 280   | ✅ Created |
| `src/lib/extraction/applyChanges.ts`           | Firestore writes         | 250   | ✅ Created |
| `src/lib/extraction/schemas.ts`                | Zod validation           | 180   | ✅ Created |

### 19.3 Firebase Functions Modified

| File                                             | Change                                                  | Status  |
| ------------------------------------------------ | ------------------------------------------------------- | ------- |
| `functions/src/types/menuProcessingJob.types.ts` | Added `PREVIEW_READY`, `isFirstExtraction`, `expiresAt` | ✅ Done |
| `functions/src/logic/processMenuImagesJob.ts`    | First extraction detection, branching, and linked outlet extraction policy guard | ✅ Done |

### 19.4 Hooks Added

| Hook                   | Purpose             | File                                | Status     |
| ---------------------- | ------------------- | ----------------------------------- | ---------- |
| `useMenuProcessingJob` | Job status listener | `src/hooks/useMenuProcessingJob.ts` | ✅ Updated |
| `useMasterJobStatus`   | Master job blocking | `src/hooks/useMasterJobStatus.ts`   | ✅ Created |

---

## 20. Editor CRUD Flow (Multi-Outlet)

### 20.1 ID Generation Logic

When creating items/categories in editor:

```typescript
// File: src/components/templates/main-app/projects/editorView/utils/editorOperations.ts

export const createNewItem = (
  file: ProjectFileType,
  categoryId: string,
  languages: string[],
  masterProjectId?: string, // ← Multi-outlet check
): ExtractedDataItem => {
  let itemId: string;

  if (masterProjectId) {
    // Linked store: use local-only prefix (L_I_)
    itemId = generateLocalItemId(); // e.g., "L_I_1705123456789_xyz789"
  } else {
    // Standalone store: use file-based sequential ID
    itemId = `${file.uid}i${sequenceId}`; // e.g., "file123i1"
  }

  return { id: itemId, ... };
};
```

### 20.2 Data Flow (No Extra Fetches)

```
INITIAL LOAD (ONE TIME)
━━━━━━━━━━━━━━━━━━━━━━━
ProjectSelector → selectedProject (metadata)
                        ↓
SWR Fetch → activeProject (full data) [1 Firestore read]
                        ↓
Editor.tsx → projectData = removeObjRef(activeProject) [local copy]
                        ↓
If masterProjectId → resolveProjectForRender() [0-1 Firestore read]
                        ↓
Sets: itemStates, isMasterLinked (for UI badges)

EDITING (ALL LOCAL - NO FETCHES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User Action → Handler → setProjectData() → Local State Update
                              ↓
                   hasChanges = true
                              ↓
              Debounced Autosave (5s delay, 30s min interval)
                              ↓
                   syncChanges() → updateProject() [1 Firestore write]
```

---

## 21. Chain Extraction Scenarios (Cases 42-69)

> **Added:** January 25, 2026  
> **Source:** ChatGPT Deep Analysis — Chain Extraction Edge Cases

### 21.1 Linked Outlet Extraction Rules

| Scenario                             | Resolution                           | Status     |
| ------------------------------------ | ------------------------------------ | ---------- |
| Outlet extracts, master job running  | Block with `useMasterJobStatus`      | ✅ Handled |
| Master extracts, outlet job running  | Continue (outlet job independent)    | ✅ Handled |
| Outlet extracts, matches master item | Create override (price only)         | ✅ Handled |
| Outlet extracts, no match            | Create local-only item (L*I* prefix) | ✅ Handled |
| Outlet extracts, master has no menu  | Allow (create local items)           | ✅ Handled |

### 21.2 Key Design Decisions

| Decision                   | Resolution                                | Rationale                         |
| -------------------------- | ----------------------------------------- | --------------------------------- |
| Master lock inheritance    | Real-time listener (`useMasterJobStatus`) | No Firestore field, no stale data |
| Orphan override validation | Handle at read-time, not write-time       | Extra read = cost + latency       |
| Multi-reviewer lock        | Last write wins                           | Complexity vs value tradeoff      |
| Category matching          | Tie-breaker bonus, not hard gate          | Handles slight name variations    |

---

**DOCUMENT STATUS:** Historical implementation blueprint/source evidence - not current launch certification
**LAST UPDATED:** January 25, 2026
**VERSION:** 3.0
**SIGNATURE:** Lead Architect
