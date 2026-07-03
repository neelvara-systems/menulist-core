# Special Menu Switching — Implementation Blueprint

**Status:** ✅ IMPLEMENTED — Active behind `ENABLE_SPECIAL_MENU_SWITCHING`; expansion remains governed by `__docs__/constitution/14-feature-lifecycle-doctrine.md`
**Author:** Cascade (Lead Architect)
**Date:** February 20, 2026
**Audience:** Developers, future maintainers

---

## Architecture Overview

Special Menu Switching reuses the existing **project infrastructure** entirely. A special menu IS a project with additional scheduling metadata. No new editor, no new collection, no new menu format.

```
┌─────────────────────────────────────┐
│         PROJECT (Base Menu)         │
│  projectId: "14-abc-15"            │
│  isSpecialMenu: false (default)    │
│  files[], config, languages, etc.  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│     PROJECT (Special Menu)          │
│  projectId: "14-diwali-15"         │
│  _specialMenu: {                   │
│    baseProjectId: "14-abc-15"      │
│    mode: "replace" | "overlay"     │
│    startsAt: Timestamp             │
│    endsAt: Timestamp               │
│    status: "scheduled"|"active"|   │
│            "expired"|"cancelled"   │
│    displayName: string             │
│  }                                 │
│  files[], config, etc. (full menu) │
└─────────────────────────────────────┘

RESOLVER (at data layer):
  getProjectBySlugOrDefault()
    → check for active special menu on this store
    → if mode=replace: return special project
    → if mode=overlay: merge base + special sections
    → if none active: return base project (current behavior)
```

### Key Architectural Decisions

| ADR   | Decision                                                     | Rationale                                                                                                                                                        |
| ----- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADR-1 | Special menu = regular project with `_specialMenu` metadata  | Reuses 100% of editor, AI extraction, MCE, publish, screens, PDF. Zero new UI for menu building.                                                                 |
| ADR-2 | Metadata lives on project document (not separate collection) | Single read. No joins. Consistent with existing project patterns.                                                                                                |
| ADR-3 | Resolver at `getProjectBySlugOrDefault()` level              | All surfaces (menu, OBP, screens, PDF, POS) automatically get resolved menu. Single point of logic.                                                              |
| ADR-4 | Nightly scheduler + client-side DAL for activation           | Nightly handles overnight transitions. Client-side DAL handles immediate activation. No API routes — follows existing `duplicateProject`/`updateStore` patterns. |
| ADR-5 | `duplicateProject()` for "create from base" flow             | Owner gets pre-filled menu. Natural flow. Existing tested function.                                                                                              |
| ADR-6 | `projectsSummary` stores special menu metadata               | Dashboard list shows special menus inline. No extra reads.                                                                                                       |
| ADR-7 | Behavior template derived from `getBusinessCategory()`       | 7 existing categories map to 3 templates. No new taxonomy.                                                                                                       |
| ADR-8 | Auto-set temp status banner on activation                    | Bridges special menu switching with existing Temp Status Layer.                                                                                                  |

---

## Database Schema

### Project Document — New `_specialMenu` Field

```typescript
// Added to existing Project interface
// @see src/components/templates/main-app/projects/types/project.types.ts

interface SpecialMenuMetadata {
  /** ID of the base project this was created from */
  baseProjectId: string;

  /** Display mode */
  mode: "replace" | "overlay";

  /** Scheduled activation time (ISO 8601) */
  startsAt: string;

  /** Scheduled deactivation time (ISO 8601) */
  endsAt: string;

  /** Current lifecycle status */
  status: "scheduled" | "active" | "expired" | "cancelled";

  /** @deprecated No longer stored — derive at runtime via getBehaviorTemplate(store.businessType) */
  behaviorTemplate?: "dynamic" | "occasional" | "minimal";

  /** Timestamp of actual activation (set by system) */
  activatedAt?: string;

  /** Timestamp of actual deactivation (set by system) */
  deactivatedAt?: string;

  /** User-facing name for the special menu period */
  displayName: string;
}

// On Project interface:
interface Project {
  // ... existing fields ...

  /**
   * Special Menu Metadata — only present on special menu projects.
   * When present, this project is a temporary override menu.
   *
   * Feature flag: ENABLE_SPECIAL_MENU_SWITCHING
   * @see __docs__/special-menu-switching/special-menu-switching_impl.md
   */
  _specialMenu?: SpecialMenuMetadata;
}
```

### ProjectsSummary — New Fields

```typescript
// In projectsSummary document, each project entry gets:
interface ProjectSummaryData {
  // ... existing fields (name, description, active, isDefault, slug, previousSlugs) ...

  /** True if this is a special menu project */
  isSpecialMenu?: boolean;

  /** Special menu display name (e.g., "Diwali Menu") */
  specialMenuDisplayName?: string;

  /** Special menu status for dashboard display */
  specialMenuStatus?: "scheduled" | "active" | "expired" | "cancelled";

  /** Schedule times for quick dashboard display */
  specialMenuStartsAt?: string;
  specialMenuEndsAt?: string;
}
```

### Store Document — Active Special Menu Reference

```typescript
// On store document (for fast resolver lookup):
interface StoreDataType {
  // ... existing fields ...

  /**
   * Currently active special menu project ID.
   * Set by activation system, cleared on deactivation.
   * Used by client-side resolver to quickly check for override.
   *
   * Feature flag: ENABLE_SPECIAL_MENU_SWITCHING
   */
  activeSpecialMenuId?: string;
}
```

---

## DAL Functions (Client-Side Firestore)

All special menu operations use the existing DAL pattern (`apiCallComposer` + client-side Firestore SDK).
**No API routes** — follows the same architecture as `duplicateProject`, `updateStore`, `syncProjectToSummary`.

All functions live in `src/database/projects/index.ts`:

| Function                           | Purpose                                     | Firestore Ops             |
| ---------------------------------- | ------------------------------------------- | ------------------------- |
| `getSpecialMenus()`                | List all special menus from summary         | 1R (summary) + 1R (store) |
| `createSpecialMenuProject(params)` | Clone base + attach metadata + sync summary | 2R + 2W                   |
| `activateSpecialMenu(projectId)`   | Set status=active, update store fields      | 2R + 2-3W                 |
| `deactivateSpecialMenu(projectId)` | Set status=expired, clear store fields      | 2R + 2-3W                 |
| `cancelSpecialMenu(projectId)`     | Set status=cancelled (scheduled only)       | 1R + 2W                   |

The `useSpecialMenus()` SWR hook in `src/hooks/useSpecialMenus.ts` calls these DAL functions directly. It must require explicit acknowledgement for create, update, activate, deactivate, and cancel calls before returning success or mutating local SWR state. Create acknowledgements must include the created `projectId` and `summaryData`. Update acknowledgements must include the requested `projectId` and resulting `status`. Lifecycle acknowledgements must include `success: true`, the requested `projectId`, and the expected resulting status (`active`, `expired`, or `cancelled`). The project DAL remains the write authority, but the hook rejects `apiCallComposer()` fallback values such as `[]` through `special_menu_create_rejected`, `special_menu_update_rejected`, `special_menu_activate_rejected`, `special_menu_deactivate_rejected`, or `special_menu_cancel_rejected` before owner UI shows success.

---

## Resolver Logic (Critical)

### Location: Extend `getProjectBySlugOrDefault()`

```typescript
// In src/database/clientMenu/index.ts (or wherever getProjectBySlugOrDefault lives)
// PSEUDOCODE — actual implementation will follow exact patterns

async function getProjectBySlugOrDefault(tId, sId, slug?) {
    // 1. Get store data (already fetched by caller)
    // 2. Check if store has activeSpecialMenuId

    if (FEATURE_FLAGS.ENABLE_SPECIAL_MENU_SWITCHING && store.activeSpecialMenuId) {
        const specialProject = await getProject(store.activeSpecialMenuId);

        if (specialProject?._specialMenu?.status === 'active') {
            const mode = specialProject._specialMenu.mode;

            if (mode === 'replace') {
                // Full replacement — return special menu as the project
                return { projectData: specialProject, ... };
            }

            if (mode === 'overlay') {
                // Get base project too
                const baseProject = await getBaseProject(tId, sId, slug);
                // Merge: base categories + special categories appended
                return { projectData: mergeOverlay(baseProject, specialProject), ... };
            }
        }
    }

    // Default: return base project (existing behavior)
    return getBaseProject(tId, sId, slug);
}
```

### Overlay Merge Logic

```typescript
function mergeOverlay(base: Project, special: Project): Project {
  // Deep clone base
  const merged = deepClone(base);

  // Extract special menu categories
  const specialCategories = extractCategories(special);
  const specialItems = extractItems(special);

  // Append special categories to base menu
  // Mark them with _isSpecialSection: true for potential UI styling
  if (merged.files?.[0]?.extractedData?.data) {
    const baseData = merged.files[0].extractedData.data;
    baseData.categories = [
      ...baseData.categories,
      ...specialCategories.map((cat) => ({ ...cat, _isSpecialSection: true })),
    ];
    baseData.items = [
      ...baseData.items,
      ...specialItems.map((item) => ({ ...item, _isSpecialSection: true })),
    ];
  }

  return merged;
}
```

---

## Activation System

### Hybrid Approach

1. **Nightly Scheduler** ✅ IMPLEMENTED (extend existing `decisionBlocksScoring.ts`)
   - At 2:30 AM UTC: check all stores for special menus that should activate/deactivate today
   - Activate: set `status: 'active'`, update `store.activeSpecialMenuId`, set temp status banner
   - Deactivate: set `status: 'expired'`, clear `store.activeSpecialMenuId`, clear temp status
   - **Codebase:** `functions/src/decisionBlocksScoring.ts:801-920` — full activate/deactivate logic
   - **Flag:** `ENABLE_SPECIAL_MENU_SWITCHING` (currently `true` in Cloud Functions and client)
   - Invalidate cache: shared public cache revalidation clears `client-stores`, `menu-store-{sId}`, store, and screen-data tags; scheduled Functions paths also touch initialized screen versions.

2. **Client-Side DAL** (for same-day precision)
   - When owner creates a special menu starting "now" or within the hour
   - Client-side DAL directly activates (no waiting for nightly job)
   - Same logic as scheduler but triggered immediately

### Activation Flow

```
Owner creates special menu (scheduled for future)
    → status: 'scheduled'
    → projectsSummary updated

Nightly scheduler OR client-side DAL triggers at startsAt
    → Set project._specialMenu.status = 'active'
    → Set project._specialMenu.activatedAt = now
    → Set store.activeSpecialMenuId = projectId
    → Set store.tempStatus = { type: 'special_menu', message: displayName, expiresAt: endsAt }
    → Invalidate cache tags
    → Bump initialized screen contentVersion/safe mirror when a screen token exists

Nightly scheduler OR auto-check at endsAt
    → Set project._specialMenu.status = 'expired'
    → Set project._specialMenu.deactivatedAt = now
    → Clear store.activeSpecialMenuId
    → Clear store.tempStatus (if it was special_menu type)
    → Invalidate cache tags
    → Bump initialized screen contentVersion/safe mirror when a screen token exists
```

---

## Behavior Templates

### Mapping (Internal — Derived from `getBusinessCategory()`)

```typescript
// src/config/specialMenuConfig.ts

import { getBusinessCategory } from "@data/shared/businessTypes";

type BehaviorTemplate = "dynamic" | "occasional" | "minimal";

const CATEGORY_TEMPLATE_MAP: Record<string, BehaviorTemplate> = {
  food: "dynamic",
  service: "occasional",
  retail: "minimal",
  health: "occasional",
  creative: "occasional",
  professional: "minimal",
  specialty: "occasional",
};

export function getBehaviorTemplate(businessType?: string): BehaviorTemplate {
  const category = getBusinessCategory(businessType);
  return CATEGORY_TEMPLATE_MAP[category || ""] || "occasional";
}

export const TEMPLATE_CAPABILITIES: Record<
  BehaviorTemplate,
  {
    allowReplace: boolean;
    allowOverlay: boolean;
    allowTimeScheduling: boolean;
  }
> = {
  dynamic: {
    allowReplace: true,
    allowOverlay: true,
    allowTimeScheduling: true,
  },
  occasional: {
    allowReplace: false,
    allowOverlay: true,
    allowTimeScheduling: false,
  },
  minimal: {
    allowReplace: false,
    allowOverlay: true,
    allowTimeScheduling: false,
  },
};
```

---

## File Inventory

### New Files

| File                                                                    | Purpose                               | Est. LOC |
| ----------------------------------------------------------------------- | ------------------------------------- | -------- |
| `src/config/specialMenuConfig.ts`                                       | Behavior templates, capability map    | ~60      |
| `src/database/projects/index.ts`                                        | Special menu DAL functions            | ~200     |
| `src/hooks/useSpecialMenus.ts`                                          | SWR hook for special menu data        | ~60      |
| `src/components/templates/main-app/projects/SpecialMenuCard.tsx`        | Dashboard card for special menus      | ~150     |
| `src/components/templates/main-app/projects/CreateSpecialMenuModal.tsx` | Creation modal (name, mode, schedule) | ~200     |
| `src/components/templates/main-app/projects/SpecialMenuStatusBadge.tsx` | Status indicator atom                 | ~40      |
| `src/components/mobile/screens/MobileSpecialMenuScreen.tsx`             | Mobile management screen              | ~200     |

### Modified Files

| File                                                                | Change                                                      | Impact |
| ------------------------------------------------------------------- | ----------------------------------------------------------- | ------ |
| `src/components/templates/main-app/projects/types/project.types.ts` | Add `_specialMenu` to Project interface                     | Low    |
| `src/database/projects/index.ts`                                    | Add `createSpecialMenuProject()` (wraps `duplicateProject`) | Low    |
| `src/config/features.ts`                                            | Add `ENABLE_SPECIAL_MENU_SWITCHING` flag                    | Low    |
| `src/types/platform/store.ts`                                       | Add `activeSpecialMenuId`                                   | Low    |
| Client menu page (`src/app/_client/[[...slug]]/page.tsx`)           | Resolver check in `getProjectBySlugOrDefault` call          | Medium |
| `functions/src/decisionBlocksScoring.ts`                            | Add special menu activation/deactivation check              | Medium |
| `src/constants/database.ts`                                         | No new collections needed                                   | None   |

---

## Security Checklist

| Check                                     | Status | Details                                                              |
| ----------------------------------------- | ------ | -------------------------------------------------------------------- |
| Client-side DAL with `getActiveSession()` | ✅     | All DAL functions use session for tId/sId scoping                    |
| Feature flag gated                        | ✅     | UI components check `ENABLE_SPECIAL_MENU_SWITCHING` before rendering |
| No cross-tenant access                    | ✅     | `getDataDocRef` scopes to `session.tId/session.sId` automatically    |
| Nightly scheduler uses `FUNCTION_FLAGS`   | ✅     | CF checks `ENABLE_SPECIAL_MENU_SWITCHING` before processing          |
| No new Firestore collections              | ✅     | Reuses `projects`, `platformSummary`, `stores`                       |

---

## Implementation Phases

### Phase 1: Core Infrastructure (~400 LOC)

- [x] Add `_specialMenu` to Project types
- [x] Add `activeSpecialMenuId` to Store types
- [x] Create `src/config/specialMenuConfig.ts` (behavior templates)
- [x] Add `ENABLE_SPECIAL_MENU_SWITCHING` feature flag
- [x] Create `createSpecialMenuProject()` in projects DAL (wraps `duplicateProject`)

### Phase 2: DAL Functions (~350 LOC)

- [x] Add `getSpecialMenus()` to `src/database/projects/index.ts`
- [x] Add `createSpecialMenuProject()` to `src/database/projects/index.ts`
- [x] Add `activateSpecialMenu()` to `src/database/projects/index.ts`
- [x] Add `deactivateSpecialMenu()` to `src/database/projects/index.ts`
- [x] Add `cancelSpecialMenu()` to `src/database/projects/index.ts`

### Phase 3: Resolver Integration (~150 LOC)

- [x] Modify `getProjectBySlugOrDefault()` to check `activeSpecialMenuId`
- [x] Implement `mergeOverlay()` for overlay mode
- [x] Add cache invalidation triggers

### Phase 4: Activation System (~200 LOC)

- [x] Extend nightly scheduler with special menu check
- [x] Auto-set/clear temp status on activation/deactivation
- [x] Auto-clear expired special menus
- [x] Cache invalidation + menuVersion bump

### Phase 5: Dashboard UI (~600 LOC)

- [x] Create `SpecialMenuCard.tsx` (shows active/scheduled status)
- [x] Create `CreateSpecialMenuModal.tsx` (name, mode, schedule)
- [x] Create `SpecialMenuStatusBadge.tsx`
- [x] Create `useSpecialMenus.ts` hook
- [x] Wire into projects list view

### Phase 6: Mobile UI (~200 LOC)

- [x] Create `MobileSpecialMenuScreen.tsx`
- [x] Wire into MobileMoreScreen navigation

---

## One-Active Constraint

### Enforcement Strategy

```typescript
// Before creating a new special menu:
async function validateNoConflict(
  storeId: string,
  startsAt: Date,
  endsAt: Date,
) {
  // Query all non-expired special menus for this store
  const existing = await getSpecialMenusForStore(storeId);
  const conflicts = existing.filter(
    (sm) =>
      sm.status !== "expired" &&
      sm.status !== "cancelled" &&
      datesOverlap(sm.startsAt, sm.endsAt, startsAt, endsAt),
  );

  if (conflicts.length > 0) {
    throw new Error(
      `Schedule conflicts with "${conflicts[0].displayName}" ` +
        `(${formatDate(conflicts[0].startsAt)} - ${formatDate(conflicts[0].endsAt)})`,
    );
  }
}
```

---

## Cost Estimation

| Operation           | Frequency       | Reads                                         | Writes                        | Monthly Cost (50 stores) |
| ------------------- | --------------- | --------------------------------------------- | ----------------------------- | ------------------------ |
| Create special menu | 2/store/month   | 2 (base + summary)                            | 3 (project + summary + store) | ~₹0.50                   |
| Activate            | 2/store/month   | 1 (project)                                   | 2 (project + store)           | ~₹0.30                   |
| Deactivate          | 2/store/month   | 1 (project)                                   | 2 (project + store)           | ~₹0.30                   |
| Resolver check      | Every page view | 0 (uses store.activeSpecialMenuId from cache) | 0                             | ₹0.00                    |
| Nightly check       | 1/day           | 1 per store with scheduled menus              | 0-2 (only on transitions)     | ~₹0.50                   |
| **Total**           |                 |                                               |                               | **~₹1.60/month**         |

**Negligible cost.** Resolver adds zero extra reads (uses cached store field).

---

**Last Updated:** June 28, 2026
