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
| ADR-1 | Special menu = regular project with `_specialMenu` metadata  | Reuses the existing editor, AI extraction, MCE, public link, configured screen paths, and export flows. Downloaded/printed artifacts are regenerated or replaced after changes. Zero new UI for menu building.                 |
| ADR-2 | Metadata lives on project document (not separate collection) | Single read. No joins. Consistent with existing project patterns.                                                                                                |
| ADR-3 | Resolver at `getProjectBySlugOrDefault()` level              | Public menu and OBP resolution use `activeSpecialMenuId`; configured screens use their screen data/version path. Exported PDFs and POS/provider targets require separate export, replacement, or integration evidence.        |
| ADR-4 | Indexed due-work scheduler + nightly recovery                | The consolidated two-minute scheduler queries only summaries whose next boundary is due; the existing nightly pass repairs legacy/missing markers. Immediate owner actions stay in the client DAL. |
| ADR-5 | Transactional clone-from-base flow                           | Replace mode copies the base; overlay mode keeps file/language context but starts with empty special rows. Creation also validates conflicts and lifecycle state atomically. |
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
  displayName: string | Record<string, string>;
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
  specialMenuDisplayName?: string | Record<string, string>;

  /** Special menu status for dashboard display */
  specialMenuStatus?: "scheduled" | "active" | "expired" | "cancelled";

  /** Schedule times for quick dashboard display */
  specialMenuStartsAt?: string;
  specialMenuEndsAt?: string;
}

// Top-level field on platformSummary/projects_{sId}, not inside a project entry.
// ISO strings retain chronological order for the indexed due query.
interface ProjectsSummaryDocument {
  specialMenuNextTransitionAt?: string;
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

| Function                           | Purpose                                     | Firestore Ops                                      |
| ---------------------------------- | ------------------------------------------- | -------------------------------------------------- |
| `getSpecialMenus()`                | List all special menus from summary         | 2R in parallel (summary + store)                    |
| `createSpecialMenuProject(params)` | Clone base + attach metadata + sync summary | scheduled: 2R + 2W; immediate: 3R + 3W transaction |
| `updateSpecialMenuProject(params)` | Edit metadata/schedule and lifecycle state  | 3R + 2-3W transaction                              |
| `activateSpecialMenu(projectId)`   | Set status=active, update store fields      | 3R + 2-3W transaction; +1 exact read only when a different pointer must be validated |
| `deactivateSpecialMenu(projectId)` | Set status=expired, clear store fields      | 3R + 2-3W transaction                              |
| `cancelSpecialMenu(projectId)`     | Set status=cancelled; best-effort owned store repair | 3-4R + 2-3W including the compatibility preflight |

Create, update, activation, deactivation, and cancellation publish project truth, the compact project summary, and any store pointer/banner change atomically. Firestore may retry a transaction after contention, so operation counts can exceed the baseline, but a failed attempt cannot leave a partial lifecycle state. Temporary special-menu banners include `sourceProjectId`; cleanup deletes only the banner owned by the menu being ended (legacy banners are cleared only while the same project owns `activeSpecialMenuId`).

Activation does not trust a different `store.activeSpecialMenuId` forever. Browser and Admin transactions read that exact project only on the conflict path. A correctly scoped, non-deleted, enabled special project with live `active` metadata and a future end time still blocks. A missing, malformed, inactive, cancelled, expired, or ended target is stale and the activating menu replaces the pointer/banner in the same transaction. The ordinary no-pointer and same-pointer paths retain their existing three transaction reads.

Every create, schedule edit, manual lifecycle action, delete, and Admin transition recomputes `specialMenuNextTransitionAt` from the fresh compact summary. A past marker is retained while work is blocked or interrupted, so the due query retries instead of silently losing the transition. Cancel still succeeds for a legacy/partially provisioned scope whose store document cannot be read; store-pointer cleanup is best-effort in that compatibility case, while project and summary cancellation remain atomic.

The Admin lifecycle helper can return `repaired` when canonical project/store/summary truth needed correction even though no normal activation/expiry transition remained. Both `menulistMaintenanceScheduler.ts` and the nightly recovery in `decisionBlocksScoring.ts` treat that as a public-output mutation: only `noop` skips downstream cache/screen work.

The `useSpecialMenus()` SWR hook in `src/hooks/useSpecialMenus.ts` calls these DAL functions directly. Its cache key includes tenant and store IDs, and the list DAL captures one validated scope before reading summary and store in parallel. The hook must require explicit acknowledgement for create, update, activate, deactivate, and cancel calls before returning success or mutating local SWR state. Create acknowledgements must include the created `projectId` and `summaryData`. Update acknowledgements must include the requested `projectId` and resulting `status`. Lifecycle acknowledgements must include `success: true`, the requested `projectId`, and the expected resulting status (`active`, `expired`, or `cancelled`). The project DAL remains the write authority, but the hook rejects `apiCallComposer()` fallback values such as `[]` through `special_menu_create_rejected`, `special_menu_update_rejected`, `special_menu_activate_rejected`, `special_menu_deactivate_rejected`, or `special_menu_cancel_rejected` before owner UI shows success.

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
const overlayFiles = createSpecialMenuOverlayFiles(baseProject.files);
const publicProjection = mergeSpecialMenuOverlayProjects(baseProject, specialProject);
```

`createSpecialMenuOverlayFiles()` deep-clones the base file shells and clears their category/item rows before the new special-menu project is persisted. This keeps languages and editor context without storing another copy of the base menu.

`mergeSpecialMenuOverlayProjects()` is the only public/configured-screen overlay resolver. It:

1. Never mutates either persisted input.
2. Drops legacy special rows whose category/item IDs already exist in the base project.
3. Accepts each new source category/item identity once.
4. Gives accepted category, item, and attribute rows deterministic runtime-only `sm_*` IDs.
5. Remaps item category references to the namespaced category, or retains an existing base category reference.
6. Omits malformed rows and items referencing an unknown category.
7. Clears extraction aliases that could reconnect overlay rows to base identities.

The projection is computed at render time and is never written back to Firestore. A pure regression test covers legacy clone deduplication, malformed/duplicate rows, category and attribute remapping, deterministic replay, and input immutability.

---

## Activation System

### Indexed Due-Work + Recovery

1. **Two-minute consolidated maintenance task** ✅ IMPLEMENTED (`menulistMaintenanceScheduler.ts`)
   - Queries `platformSummary` only where `specialMenuNextTransitionAt <= now` (bounded to 50 summaries per run).
   - Ended windows are expired before due windows are activated, in deterministic schedule order.
   - The compact project-summary reader accepts the repository's canonical flat keys and legacy nested shape.
   - Each transition transaction revalidates project/store/summary truth and computes the next marker.
   - A different active pointer is validated by one exact project read; real live contention blocks, while stale pointer state is repaired atomically.
   - Activate: set `status: 'active'`, update `store.activeSpecialMenuId`, set temp status banner
   - Deactivate: set `status: 'expired'`, clear `store.activeSpecialMenuId`, clear temp status
   - **Codebase:** `functions/src/schedulers/menulistMaintenanceScheduler.ts` + `functions/src/schedulers/specialMenuLifecycle.ts`
   - **Flag:** `ENABLE_SPECIAL_MENU_SWITCHING` (currently `true` in Cloud Functions and client)
   - Invalidate cache: shared public cache revalidation clears `client-stores`, `menu-store-{sId}`, store, and screen-data tags; scheduled Functions paths also touch initialized screen versions.

2. **Nightly recovery/backfill** (`decisionBlocksScoring.ts`)
   - The existing store maintenance pass repairs missing/stale markers for pre-marker schedules.
   - It keeps the previous lifecycle scan as a low-frequency recovery path.

3. **Client-Side DAL**
   - A menu created/edited with `startsAt <= now` activates in the same owner transaction.
   - Manual End/Cancel actions update canonical state immediately.

### Activation Flow

```
Owner creates special menu (scheduled for future)
    → status: 'scheduled'
    → projectsSummary updated

Consolidated due-work scheduler triggers within the two-minute maintenance cadence
    → In one transaction, set project._specialMenu.status/activatedAt
    → In the same transaction, set store.activeSpecialMenuId
    → In the same transaction, set store.tempStatus with sourceProjectId
    → In the same transaction, set compact-summary status
    → Invalidate cache tags
    → Bump initialized screen contentVersion/safe mirror when a screen token exists

Consolidated due-work scheduler OR owner action handles endsAt
    → In one transaction, set project._specialMenu.status/deactivatedAt
    → In the same transaction, set compact-summary status
    → Clear store.activeSpecialMenuId only when this project owns it
    → Clear only this project's special-menu temp status
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
| `src/data/shared/specialMenuSchedule.ts`                                | Shared next-boundary calculation       | Small    |

### Modified Files

| File                                                                | Change                                                      | Impact |
| ------------------------------------------------------------------- | ----------------------------------------------------------- | ------ |
| `src/components/templates/main-app/projects/types/project.types.ts` | Add `_specialMenu` to Project interface                     | Low    |
| `src/database/projects/index.ts`                                    | Add `createSpecialMenuProject()` (wraps `duplicateProject`) | Low    |
| `src/config/features.ts`                                            | Add `ENABLE_SPECIAL_MENU_SWITCHING` flag                    | Low    |
| `src/types/platform/store.ts`                                       | Add `activeSpecialMenuId`                                   | Low    |
| Client menu page (`src/app/client/[[...slug]]/page.tsx`)            | Validated active-menu resolver and shared overlay call      | Medium |
| `functions/src/schedulers/menulistMaintenanceScheduler.ts`          | Add indexed two-minute due transition task                   | Medium |
| `functions/src/schedulers/specialMenuLifecycle.ts`                  | Maintain marker and transactional lifecycle truth            | Medium |
| `functions/src/decisionBlocksScoring.ts`                            | Keep nightly marker/transition recovery                      | Low    |
| `src/constants/database.ts`                                         | No new collections needed                                   | None   |

---

## Security Checklist

| Check                                     | Status | Details                                                              |
| ----------------------------------------- | ------ | -------------------------------------------------------------------- |
| Client-side DAL with `getActiveSession()` | ✅     | All DAL functions use session for tId/sId scoping                    |
| Feature flag gated                        | ✅     | UI components check `ENABLE_SPECIAL_MENU_SWITCHING` before rendering |
| No cross-tenant access                    | ✅     | `getDataDocRef` scopes to `session.tId/session.sId` automatically    |
| Functions lifecycle uses shared flags    | ✅     | Precise and recovery paths use current Functions feature constants   |
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
- [x] Implement one shared, deterministic, legacy-safe overlay projection for public menus and configured screens
- [x] Add cache invalidation triggers

### Phase 4: Activation System

- [x] Add indexed due marker to existing compact project summary
- [x] Add two-minute task to the consolidated maintenance scheduler
- [x] Keep nightly marker/transition recovery for legacy schedules
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

## Cost Shape

- Create/edit/lifecycle actions use the bounded transaction counts in `special-menu-switching_firebase.md`; retries can raise actual reads.
- The two-minute scheduler performs one indexed due query and reads at most 50 due summary documents per run.
- The existing nightly store pass may read one compact project summary per eligible store for recovery/backfill.
- The resolver adds zero extra reads when no special menu is active because it uses the already-loaded store field.
- Measure deployed query minimum charges, transition retries, cache refreshes, and configured-screen touches before publishing a fixed cost estimate.

---

**Last Updated:** July 16, 2026
