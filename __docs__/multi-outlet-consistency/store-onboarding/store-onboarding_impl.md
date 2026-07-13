# Store Onboarding Flow — Implementation Plan

**Feature:** #4C — Store Onboarding (Master + Local Outlet) — PATH 2: Internal Flow  
**Status:** Implemented source evidence; not current launch certification
**Original Date:** February 7, 2026 (Updated: February 12, 2026 — Session 3)  
**Last Reviewed:** July 2, 2026
**Author:** Cascade (Primary Master — Full Codebase Access)  
**Inputs:** Cascade spec analysis + ChatGPT architectural review (3 sessions)  
**Governance:** `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md` (overrides all)  
**Companion:** `store-onboarding-billing_impl.md` (PATH 1: Razorpay Billing Flow)

> **Launch Boundary:** This implementation plan records store-onboarding source evidence, not current production-launch approval. Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, `npm run verify:multi-location-boundary`, desktop/mobile Locations browser QA, outlet create/deactivate/rename QA, Razorpay sandbox evidence where billing is involved, Firebase deploy evidence where rules/functions change, and target-environment smoke.

---

## 0. Document Purpose

This document covers **PATH 2 (Internal Flow)** — store creation, project replication, and master linking for multi-outlet onboarding. It:

1. Logs every decision from the ChatGPT conversation with **Cascade's verdict** (AGREE / DISAGREE / PARTIAL / ENHANCE)
2. Maps each decision to **exact codebase locations** (file:line)
3. Defines the **complete implementation plan** with no "Phase 2" or "later" language
4. Follows Law 1 (3-Year Architecture Freeze) — everything ships Day 1, some behind feature flags

**Companion doc:** `store-onboarding-billing_impl.md` covers **PATH 1 (Billing Flow)** — Razorpay quantity-based billing, proration, mandate auto-debit. Billing succeeds FIRST, then this flow executes.

June 29, 2026 hardening note: if outlet creation fails after acquiring `outletCreationLock`, the cleanup path still releases the lock best-effort. A cleanup failure no longer disappears silently; `POST /api/outlets/create` logs `multi_outlet_create_lock_release_failed` with bounded tenant/store and rollback-state metadata before returning the original create failure response.

June 29, 2026 browser response hardening note: desktop Locations, desktop add/rename modals, and `MobileLocationsScreen` now parse `/api/outlets/create`, `/api/outlets/rename`, and `/api/outlets/deactivate` acknowledgements through the shared 16KB `MULTI_OUTLET_ACTION_RESPONSE_JSON_MAX_BYTES` guard. Successful responses must include the expected `success`, store/outlet ID, slug, billing, and previous-slug fields before local tenant/store UI state is updated. Malformed or oversized responses log stable `desktop_location_outlet_action_response_parse_failed` / `mobile_location_outlet_action_response_parse_failed` and `*_response_invalid` diagnostics with bounded outlet context only.

June 30, 2026 browser request hardening note: desktop Locations, desktop add/rename modals, `MobileLocationsScreen`, and the shared `updateOutletPolicy()` DAL now spread `MULTI_OUTLET_ACTION_REQUEST_POLICY` before `/api/outlets/create`, `/api/outlets/rename`, `/api/outlets/deactivate`, and `/api/outlets/policy` calls. This keeps outlet mutations same-origin, uncached, and manual-redirect before the existing route contracts and bounded response guards run.

### Two-Path Execution Model

```
HQ clicks "Add Outlet"
    │
    ├── PATH 1: Billing (store-onboarding-billing_impl.md)
    │   ├── Validate subscription active
    │   ├── Check outletCreationLock
    │   ├── Update Razorpay quantity → prorated charge
    │   └── Update Firestore subscription quantity
    │
    ├── PATH 2: Internal (THIS DOCUMENT)
    │   ├── Create store doc
    │   ├── Replicate master projects
    │   ├── Link to master (snapshot + overrides)
    │   └── Update tenant storesList
    │
    └── DONE: Release lock, return success
```

---

## 1. ChatGPT Discussion Log — Decision Matrix

### 1.1 Architectural Decisions

| #   | ChatGPT Proposal                                                                          | Cascade Verdict                               | Rationale                                                                                                                                                                                                                                                                                                                                              |
| --- | ----------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **"Chain mode activation"** — Separate moment when tenant transitions from single → chain | **PARTIAL**                                   | Concept is sound, but explicit `chainMode` flag is unnecessary. System can derive chain status from `storesList.length > 1 && storesList.some(s => s.isMaster)`. Adding a separate flag creates dual source of truth. See §2.1.                                                                                                                        |
| D2  | **`tenant.masterProjectId`** — Store master reference at tenant level                     | **DISAGREE**                                  | Tenant can have MULTIPLE master projects (food menu + drinks menu). Master authority lives on **project docs** (`isMaster: true`), not tenant. Tenant is billing container, not authority root. Codebase already uses `project.isMaster` — see `src/types/platform/store.ts:120` and `setProjectAsMaster()` at `src/database/multiOutlet/index.ts:56`. |
| D3  | **First store = default master** on signup                                                | **AGREE**                                     | Clean. User never sees complexity. Internally set `store.isMaster = true` during onboarding. Currently NOT set — gap at `src/app/api/onboarding/create-subscription/route.ts:171-186`.                                                                                                                                                                 |
| D4  | **One master store per chain, permanent**                                                 | **AGREE**                                     | Already enforced via feature flags: `ENABLE_CHANGE_MASTER_STORE: false` at `src/config/features.ts:669`. Business decision confirmed permanent.                                                                                                                                                                                                        |
| D5  | **Outlets cannot exist without master link**                                              | **AGREE**                                     | Orchestration function must be atomic-ish. If `linkStoreToMaster()` fails after store creation, rollback or mark as provisioning.                                                                                                                                                                                                                      |
| D6  | **Master structure forced to all outlets** (strict chain consistency)                     | **AGREE**                                     | Core architectural decision. Every master project must auto-propagate to every outlet. New requirement — no existing code handles this.                                                                                                                                                                                                                |
| D7  | **Outlet can only deactivate, never delete inherited project**                            | **AGREE**                                     | Aligns with `deleteProject()` guard at `src/database/projects/index.ts` which already checks `hasLinkedOutlets()`. Extend to block outlet-side deletion of inherited projects.                                                                                                                                                                         |
| D8  | **Master creates new project → auto-propagate to all outlets**                            | **AGREE**                                     | Critical for strict consistency. New DAL hook needed in `addProject()`. No existing code does this.                                                                                                                                                                                                                                                    |
| D9  | **`outletCapabilities` policy on master store doc**                                       | **ENHANCE**                                   | Concept correct, but current override rules are **hardcoded** in `src/lib/multiOutlet/masterUtils.ts:43` (`OVERRIDABLE_ITEM_FIELDS`) and `:21` (`LOCKED_ITEM_FIELDS`). ChatGPT proposes making these configurable per chain via `outletCapabilities`. This is a significant enhancement. See §2.3.                                                     |
| D10 | **One global outlet policy per chain** (not per-outlet)                                   | **AGREE**                                     | Correct for 3-year freeze. Per-outlet complexity is unnecessary for SMB chains. Single policy on master store.                                                                                                                                                                                                                                         |
| D11 | **Store switcher in header**                                                              | **AGREE**                                     | Industry standard. But secondary feature — HQ admin works from master context primarily.                                                                                                                                                                                                                                                               |
| D12 | \*\*`projectType: inherited                                                               | localOnly`\*\* — Mark outlet-created projects | **AGREE**                                                                                                                                                                                                                                                                                                                                              | Clean distinction. Outlet can create `localOnly` projects (e.g., bar menu for licensed branch). These never propagate back to master. New field needed on project type. |
| D13 | **Billing-first orchestration** — Never create outlet without billing success             | **AGREE**                                     | See companion doc `store-onboarding-billing_impl.md`. Razorpay quantity update MUST succeed before `addOutletToMaster()` runs.                                                                                                                                                                                                                         |
| D14 | **`verifyAllOutletsHaveAllMasterProjects()` safety job**                                  | **AGREE**                                     | Periodic integrity check. Runs as background Cloud Function or reconciliation job. Detects missing project links, does NOT auto-fix (logs warning for admin review). See §15.                                                                                                                                                                          |
| D15 | **Idempotent propagation** — Re-running propagation for same master+outlet is safe        | **AGREE**                                     | `linkStoreToMaster()` already validates at `src/database/multiOutlet/index.ts:222`. If outlet already linked, skip silently.                                                                                                                                                                                                                           |
| D16 | **Outlet deactivation instead of deletion**                                               | **AGREE**                                     | Outlets are never hard-deleted. They can be deactivated (`store.active = false`), which hides them from public menus but preserves billing and data integrity.                                                                                                                                                                                         |
| D17 | **Single orchestration endpoint** — `POST /api/outlets/create` handles billing + internal | **AGREE**                                     | One endpoint, one transaction boundary. See companion billing doc §5.                                                                                                                                                                                                                                                                                  |

### 1.1b Architectural Decisions — Session 3

| #   | ChatGPT Proposal                                                                                                                                        | Cascade Verdict                 | Rationale                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D18 | **Flat hierarchy only** — no regional grouping, sub-masters, or franchise trees                                                                         | **AGREE**                       | One brand → one master → all outlets equal. No nested hierarchy. Dramatically reduces complexity. SMB chains (our market) don't need regional management. If needed later, add as optional grouping layer (tag-based), not structural hierarchy.                                                             |
| D19 | **No deep per-outlet audit history** — only latest state tracked                                                                                        | **AGREE**                       | Only current state matters. No per-outlet change timeline, version restore, or rollback system. Internal MOL logs (`src/database/multiOutlet/index.ts`) already provide operational event tracking for debugging. No user-facing audit history needed.                                                       |
| D20 | **One-by-one outlet creation only** — no CSV import, no bulk creation                                                                                   | **AGREE**                       | Manual creation = deliberate billing decisions. Each outlet addition triggers billing update (prorated charge). Bulk import would bypass deliberate billing review. Aligns with premium control positioning.                                                                                                 |
| D21 | **Two permission roles only** — Master/HQ and Outlet Manager                                                                                            | **AGREE**                       | Maps to existing role system: `owner` role = Master/HQ access, `manager` role = Outlet Manager access. Already at `src/data/defaultRoles.ts`. No new role infrastructure needed. Permission differences handled by existing `RolePermissions` at `src/types/platform/roles.ts:55`.                           |
| D22 | **Outlet Manager allowed:** price, availability, sold out, local items, local categories, hours, phone, temp closure                                    | **AGREE**                       | Maps directly to existing `OVERRIDABLE_ITEM_FIELDS` at `src/lib/multiOutlet/masterUtils.ts:43` + store-level settings (hours, phone). Outlet managers use existing `manager` role permissions. No new permission keys needed — existing `canManageContent`, `canManagePrices` cover this.                    |
| D23 | **Outlet Manager NOT allowed:** billing, creating outlets, master menu structure, global delete, translations, AI image gen, AI credits, brand settings | **AGREE**                       | Maps to existing permission restrictions: `canAccessBilling: false`, `canManageSubscription: false`, `canAddStore: false` on `manager` role. AI features gated by `canUseAIExtraction`, `canUseAIDescriptions`, `canUseAIImages`. See `src/constants/permissions.ts` for full list.                          |
| D24 | **Master impersonation mode** for store switching                                                                                                       | **AGREE**                       | When master user switches to outlet context, they retain ALL master permissions. Context changes (`activeStoreContext`) but authority doesn't. Show indicator: "Viewing: [Outlet Name] (HQ access)". Never hide billing, chain panel, or other outlets when switched. See §8 (enhanced).                     |
| D25 | **Override labeling in UI** — every outlet edit shows "LOCAL override" indicator                                                                        | **AGREE**                       | Partially covered by `InheritanceBadge` at `src/components/atoms/InheritanceBadge/index.tsx`. Needs enhancement: top banner "Changes here affect only this outlet", item-row badge "Local override", edit modal header "Local override for this outlet". See §17.3 (UX Rules).                               |
| D26 | **Chain Control Panel** — centralized HQ-only outlet management screen                                                                                  | **AGREE**                       | New sidebar item: "Locations" (visible only when `isMaster && storesList.length > 1`). Shows all outlets with status, billing impact panel, per-outlet actions. Central command center for chain operations. See §17.                                                                                        |
| D27 | **Instant propagation — no approval system**                                                                                                            | **AGREE** — Already implemented | Master edits reflect instantly everywhere via read-time resolution (`resolveProjectForRender()` at `src/lib/multiOutlet/resolveProject.ts:145`). No "accept update" flow. Outlets see banner via `useMasterUpdateAwareness` hook but changes are already live.                                               |
| D28 | **Overrides always allowed by default** (flexible mode)                                                                                                 | **PARTIAL**                     | Our `outletCapabilities` system (§2.3) is more nuanced — allows HQ to selectively disable specific overrides. ChatGPT's "always allowed" is the **default** state (`DEFAULT_OUTLET_CAPABILITIES` has `priceOverride: true`, `availabilityOverride: true`). UI to toggle capabilities is behind feature flag. |

### 1.2 Edge Cases Logged

| #   | Edge Case                                                               | ChatGPT Proposal                                            | Cascade Verdict                                                  | Existing Coverage                                                                                                       |
| --- | ----------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| E1  | Master project created after outlets exist                              | Auto-propagate to all outlets                               | **AGREE** — Must be DAL-level                                    | ❌ Not implemented                                                                                                      |
| E2  | Master project deleted with linked outlets                              | Block deletion                                              | **AGREE** — Already partial                                      | ✅ `hasLinkedOutlets()` guard exists at `src/database/multiOutlet/index.ts:~870`                                        |
| E3  | Master renamed/reordered/categories changed                             | Outlets inherit automatically                               | **AGREE**                                                        | ✅ Read-time resolution handles this via `resolveProjectForRender()` at `src/lib/multiOutlet/resolveProject.ts:145-361` |
| E4  | Outlet creation fails mid-process                                       | Rollback or retry                                           | **AGREE** — Add `outletStatus`                                   | ✅ Implemented — `api/outlets/create/route.ts:237-249` reverts Razorpay quantity on failure (BE1 pattern)               |
| E5  | Outlet tries to delete inherited project                                | Block in DAL                                                | **AGREE**                                                        | ✅ Implemented — `deleteProject()` at `src/database/projects/index.ts:1078-1086` blocks if `masterProjectId` exists     |
| E6  | Inactive outlet project + master updates                                | Still receives structure updates                            | **AGREE**                                                        | ✅ Read-time resolution unaffected by status flag                                                                       |
| E7  | Outlet local items + master category delete                             | Local items preserved                                       | **PARTIAL** — Needs testing                                      | ✅ Resolver filters by master structure, local items prefixed `L_I_` survive                                            |
| E8  | Master switch request                                                   | Block permanently                                           | **AGREE**                                                        | ✅ `ENABLE_CHANGE_MASTER_STORE: false` at `src/config/features.ts:669`                                                  |
| E9  | HQ admin with 20 outlets                                                | Session must access all                                     | **AGREE**                                                        | ❌ `session.user.storeId` is single value — gap at `src/providers/sessionProvider.tsx:73`                               |
| E10 | Outlet manager sees only their store                                    | Role + store binding                                        | **AGREE**                                                        | ✅ Existing role system binds user to `stores[]` array                                                                  |
| E11 | Concurrent master edit + outlet override                                | Override always wins locally                                | **AGREE**                                                        | ✅ Resolver applies overrides on top of master at read time                                                             |
| E12 | 200 outlets listening to signal doc                                     | Debounce + small doc                                        | **AGREE**                                                        | ✅ Signal doc is tiny (`operationalVersion` + `lastUpdated`), debounce at 5s                                            |
| E13 | Orphan outlet project (invalid masterProjectId)                         | Periodic integrity check                                    | **PARTIAL** — Log warning, don't auto-fix                        | ❌ Not implemented                                                                                                      |
| E14 | Duplicate linking attempt                                               | Block if `masterProjectId` already set                      | **AGREE**                                                        | ✅ `linkStoreToMaster()` validates at `src/database/multiOutlet/index.ts:222`                                           |
| E15 | 500+ items menu performance                                             | Snapshot/diff must stay fast                                | **AGREE** — Monitor                                              | ✅ Diff engine is O(n) scan, acceptable                                                                                 |
| E16 | Master project archive (instead of delete)                              | Soft archive, not hard delete                               | **AGREE**                                                        | ❌ Not implemented (future enhancement)                                                                                 |
| E17 | 50 outlets created rapidly                                              | Sequential ID generation                                    | **AGREE**                                                        | ✅ Outlet transaction serializes on canonical `platformSummary/summary`, reconciles legacy/store-summary floors, and probes occupied store IDs before creation |
| E18 | Billing succeeds but internal creation fails                            | Quantity updated in Razorpay, no outlet exists              | **AGREE** — Mark `provisioning`, reconciliation detects mismatch | ✅ Implemented — `api/outlets/create/route.ts:237-249` reverts Razorpay quantity on failure                             |
| E19 | Outlet removal (future)                                                 | Quantity -1, then deactivate outlet                         | **AGREE** — Future feature behind flag                           | ❌ Not implemented                                                                                                      |
| E20 | Orphan outlet project integrity check                                   | Periodic job: verify all outlets have all master projects   | **AGREE** — Background safety net                                | ❌ Not implemented (see §15)                                                                                            |
| E21 | Master project archive instead of delete                                | Soft archive → outlets inherit deactivated state            | **AGREE**                                                        | ❌ Not implemented (future enhancement)                                                                                 |
| E22 | Outlet user tries to create project matching master name                | Block — name collision with inherited project               | **AGREE**                                                        | ❌ Not implemented                                                                                                      |
| E23 | Network failure during multi-project propagation (project 2 of 5 fails) | Projects 1 linked, 2-5 retry-able. Outlet in `provisioning` | **AGREE** — Partial success = provisioning status                | ❌ Handled by provisioning pattern (§6.3)                                                                               |

#### Edge Cases — Session 3

| #   | Edge Case                                                       | ChatGPT Proposal                                                                | Cascade Verdict                                               | Existing Coverage                                                                                             |
| --- | --------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| E24 | Master user switches to outlet context                          | Retain all master permissions, show HQ badge                                    | **AGREE**                                                     | ✅ Implemented — `activeStoreContext` drives client DAL context, effective `storeDetails`, desktop banner, and mobile banner while `isMasterUser` remains based on the login/HQ store |
| E25 | Outlet manager tries to access Chain Control Panel              | Block — 404 or redirect                                                         | **AGREE**                                                     | ❌ Not implemented — sidebar guard needed: `if (!isMaster) hide "Locations"` menu item                        |
| E26 | Outlet manager tries to access billing page                     | Block by permissions                                                            | **AGREE**                                                     | ✅ Existing: `canAccessBilling: false` on `manager` role at `src/data/defaultRoles.ts`                        |
| E27 | Owner deactivates outlet, reactivates before next billing cycle | Clean reversal — `store.active = true`, billing unchanged                       | **AGREE**                                                     | ❌ Not implemented (see billing doc §10.3)                                                                    |
| E28 | Outlet with local items gets deactivated                        | Local items preserved (archived with store)                                     | **AGREE**                                                     | ✅ `store.active = false` doesn't delete projects or items                                                    |
| E29 | Master user viewing outlet context tries to edit master menu    | Should edit master project directly (not outlet override)                       | **AGREE** — Must route master edits to master project context | ❌ Not implemented — needs context-aware routing in editor                                                    |
| E30 | Chain Control Panel with 50+ outlets                            | Pagination, search, filter by status                                            | **AGREE** — Day 1: list only. Pagination when >20 outlets     | ❌ Not implemented                                                                                            |
| E31 | Outlet manager creates local-only project                       | Allowed. `projectType: localOnly`. Never propagates to master or other outlets. | **AGREE**                                                     | ❌ Not implemented — needs `projectType` guard in propagation logic                                           |

### 1.3 Product Decisions (Owner-Confirmed)

| #   | Decision                       | Owner Choice                              | Cascade Alignment               |
| --- | ------------------------------ | ----------------------------------------- | ------------------------------- |
| P1  | Scale target                   | 200+ outlets from Day 1                   | ✅ Architecture supports this   |
| P2  | "Add Outlet" location          | Projects page                             | ✅ Master lives there           |
| P3  | Wizard vs modal                | Single modal                              | ✅ Law 6: No Cognitive Load     |
| P4  | Store switching                | Header dropdown (secondary)               | ✅ Industry standard            |
| P5  | Outlet staff creation          | Separate flow                             | ✅ Users section already exists |
| P6  | Auto-create project + link     | Mandatory, zero friction                  | ✅ Correct                      |
| P7  | Outlet policy scope            | One global policy per chain               | ✅ Correct for 3-year freeze    |
| P8  | Policy storage                 | Master store doc                          | ✅ See §2.3                     |
| P9  | Strict chain consistency       | Master structure forced to ALL outlets    | ✅ Core architectural law       |
| P10 | Billing-first flow             | No outlet without successful billing      | ✅ Razorpay quantity model      |
| P11 | Auto-debit (no payment popup)  | Mandate covers quantity changes           | ✅ Industry standard            |
| P12 | Informational modal before add | Show proration estimate, not payment page | ✅ Clean UX                     |

---

## 2. Cascade Expert Analysis — Where ChatGPT Was Wrong or Incomplete

### 2.1 DISAGREE: `tenant.chainMode` Is Unnecessary

**ChatGPT proposed:**

```
tenant.chainMode = single | multi
tenant.masterProjectId = currentProject
```

**Cascade verdict: DISAGREE on `chainMode`, DISAGREE on `tenant.masterProjectId`**

**Why:**

1. `chainMode` creates a **dual source of truth**. The system already knows if a tenant is multi-outlet by checking `tenantDetails.storesList.length > 1`. Adding another field means two things can disagree.

2. `tenant.masterProjectId` assumes ONE master project per tenant. But a tenant can have multiple projects (food menu, drinks menu, catering menu) — ALL of which are master projects. Master authority lives on the **project doc** (`project.isMaster = true`), not the tenant.

3. The existing `canHaveLinkedOutlets()` function already derives chain status:

```typescript
// src/database/multiOutlet/index.ts:985
export function canHaveLinkedOutlets(tenantDetails) {
  if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) return false;
  if (!tenantDetails?.storesList) return false;
  if (tenantDetails.storesList.length <= 1) return false;
  const hasMasterStore = tenantDetails.storesList.some(
    (s) => s.isMaster === true,
  );
  return hasMasterStore;
}
```

**Cascade approach:** Derive chain status, don't store it. Set `store.isMaster = true` on first store during onboarding. That's sufficient.

**One exception:** We DO need a lightweight helper to check if tenant is in chain mode for UI gating:

```typescript
// New utility function (derive, don't store)
export function isChainMode(tenantDetails): boolean {
  return canHaveLinkedOutlets(tenantDetails);
}
```

### 2.2 DISAGREE: "Chain Mode Activation" as Separate Step

**ChatGPT proposed:** An explicit "Enable multi-location control" button that performs a structural shift.

**Cascade verdict: DISAGREE — Unnecessary cognitive load**

**Why:** This violates **Law 6: No Cognitive Load**. The user should never think about "activating chain mode." When they click "Add Outlet," the system silently handles everything:

1. First store already has `isMaster: true` (set during onboarding, invisible to user)
2. User clicks "Add Outlet" → system creates store + projects + links
3. Chain mode is now active — derived from `storesList.length > 1`

No separate activation step. No structural questions. Zero decisions exposed.

**ChatGPT's concern was valid** (the transition moment matters architecturally), but the solution is **silent infrastructure, not user action**. The onboarding API already sets up the master — the "activation" happens implicitly when the first outlet is added.

### 2.3 ENHANCE: `outletCapabilities` vs Current Hardcoded Fields

**Current state:** Override rules are hardcoded:

```typescript
// src/lib/multiOutlet/masterUtils.ts:43
export const OVERRIDABLE_ITEM_FIELDS = [
  "price",
  "available",
  "active",
  "isBestSeller",
  "duration",
  "orderIndex",
  "timeSlots",
];

// src/lib/multiOutlet/masterUtils.ts:21
export const LOCKED_ITEM_FIELDS = [
  "name",
  "description",
  "images",
  "foodType",
  "allergens",
  "nutritionalInfo",
  "tags",
];
```

**ChatGPT proposed:** Make these configurable per chain via `outletCapabilities` on master store doc.

**Cascade analysis:** This is a **valid enhancement** but must be implemented carefully:

- **Day 1:** Ship with hardcoded defaults (current behavior). Add `outletCapabilities` field to master store doc with defaults matching current hardcoded values.
- **Day 1 (behind flag):** UI for HQ admin to toggle capabilities. Feature flag: `ENABLE_OUTLET_CAPABILITIES_UI`.
- **Resolution:** When checking if a field is overridable, check `outletCapabilities` first, fall back to hardcoded defaults.

```typescript
// Enhanced check (backward compatible)
export function isOverridableItemField(
  field: string,
  outletCapabilities?: OutletCapabilities,
): boolean {
  if (outletCapabilities) {
    // Dynamic check from master store config
    return outletCapabilities[`${field}Override`] === true;
  }
  // Fallback to hardcoded defaults
  return (OVERRIDABLE_ITEM_FIELDS as readonly string[]).includes(field);
}
```

### 2.4 ENHANCE: Project Propagation Hook

**ChatGPT correctly identified** that when master creates a new project after outlets exist, the system must auto-propagate. This is the **single most important new capability** needed.

**Current state:** `addProject()` at `src/database/projects/index.ts` creates a project for one store only. No propagation logic exists.

**Required:** After `addProject()` succeeds for a master store, check if outlets exist and auto-create linked projects for each.

This must be **DAL-level logic** (not UI-triggered), ensuring it works regardless of how the project is created (auto-create, manual, future API).

### 2.5 ChatGPT Claims That Are Already Implemented

| Claim                                           | Status           | Evidence                                                                                     |
| ----------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------- |
| "Override always wins locally"                  | ✅ Already works | `resolveProjectForRender()` at `src/lib/multiOutlet/resolveProject.ts:145-361`               |
| "Read-time resolution prevents sync nightmares" | ✅ Already works | Same file — merges master + overrides at render time                                         |
| "Snapshot awareness tracks changes"             | ✅ Already works | `useMasterUpdateAwareness` hook at `src/hooks/useMasterUpdateAwareness.ts`                   |
| "Debounce + small signal doc handles scale"     | ✅ Already works | 5s debounce, signal doc is `{ operationalVersion, lastUpdated }` only                        |
| "Delete protection for master projects"         | ✅ Already works | `hasLinkedOutlets()` guard in `deleteProject()`                                              |
| "Local items preserved when master changes"     | ✅ Already works | `L_I_` prefix items handled separately by resolver                                           |
| "Master change detection and notification"      | ✅ Already works | `detectOperationalChange()` in `updateProject()` at `src/database/projects/index.ts:450-480` |

---

## 3. Data Schema Changes

### 3.1 Store Document — New Fields

**File:** `src/types/platform/store.ts`  
**Location:** `StoreDataType` interface, after line 120

```typescript
// Existing (line 120):
isMaster?: boolean;

// NEW fields to add:
outletCapabilities?: OutletCapabilities;
```

### 3.2 New Type: `OutletCapabilities`

**File:** `src/types/multiOutlet.types.ts` (add to existing file)

```typescript
/**
 * Global outlet capability policy — defined on master store.
 * Controls what ALL outlets in the chain can override or create.
 * One policy per chain. Applied uniformly.
 *
 * @see store-onboarding-flow_impl.md §2.3
 */
export interface OutletCapabilities {
  // Item-level override permissions
  priceOverride: boolean; // Can outlets change item prices?
  availabilityOverride: boolean; // Can outlets toggle item availability?
  descriptionOverride: boolean; // Can outlets edit item descriptions?
  imageOverride: boolean; // Can outlets replace item images?

  // Structure creation permissions
  allowLocalItems: boolean; // Can outlets add L_I_* local items?
  allowLocalCategories: boolean; // Can outlets add L_C_* local categories?
  allowLocalProjects: boolean; // Can outlets create localOnly projects?

  // Project-level permissions
  allowProjectDeactivate: boolean; // Can outlets deactivate inherited projects?
}

/**
 * Default outlet capabilities — used when outletCapabilities
 * not yet configured on master store.
 */
export const DEFAULT_OUTLET_CAPABILITIES: OutletCapabilities = {
  priceOverride: true,
  availabilityOverride: true,
  descriptionOverride: false,
  imageOverride: false,
  allowLocalItems: true,
  allowLocalCategories: false,
  allowLocalProjects: false,
  allowProjectDeactivate: true,
};
```

### 3.3 Project Document — New Fields

**File:** `src/components/templates/main-app/projects/types/project.types.ts`

```typescript
// Add to Project interface:
projectType?: 'inherited' | 'localOnly';  // inherited = linked to master, localOnly = outlet-only
outletStatus?: 'active' | 'inactive';     // Outlet can deactivate inherited project (not delete)
```

### 3.4 Tenant storesList — isMaster Flag

**Current structure** (from `src/providers/sessionProvider.tsx:81`):

```typescript
storesList: [{ storeId: number, name: string }];
```

**Required:**

```typescript
storesList: [{ storeId: number, name: string, isMaster?: boolean }]
```

This field is already checked by `canHaveLinkedOutlets()` but never written. Must be set during:

- Onboarding (first store: `isMaster: true`)
- Outlet addition (new store: no `isMaster` flag)

---

## 4. Feature Flags

**File:** `src/config/features.ts`

```typescript
// Store Onboarding — Multi-Outlet
ENABLE_ADD_OUTLET: true,                    // "Add Outlet" button on Projects page
ENABLE_OUTLET_CAPABILITIES_UI: false,       // HQ admin can configure outletCapabilities
ENABLE_PROJECT_PROPAGATION: true,           // Auto-propagate master projects to all outlets
ENABLE_STORE_SWITCHER: true,                // Header dropdown for store switching
ENABLE_OUTLET_PROJECT_DEACTIVATE: true,     // Outlets can deactivate inherited projects
```

---

## 5. Implementation Tasks (File-Level)

### 5.1 Data Foundation

| #   | Task                                                        | File                                                                | Line/Location                | Change                                    |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------- | ----------------------------------------- |
| T1  | Set `isMaster: true` on first store during onboarding       | `src/app/api/onboarding/create-subscription/route.ts`               | Line 171 (store transaction) | Add `isMaster: true` to store doc         |
| T2  | Set `isMaster: true` in tenant storesList during onboarding | Same file                                                           | Line 190 (storesList entry)  | Add `isMaster: true` to storesList entry  |
| T3  | Add `OutletCapabilities` type                               | `src/types/multiOutlet.types.ts`                                    | End of file                  | New interface + defaults                  |
| T4  | Add `outletCapabilities` to `StoreDataType`                 | `src/types/platform/store.ts`                                       | After line 120               | New optional field                        |
| T5  | Add `projectType` and `outletStatus` to `Project` type      | `src/components/templates/main-app/projects/types/project.types.ts` | Project interface            | Two new optional fields                   |
| T6  | Set `isMaster: true` on auto-created default project        | `src/database/projects/index.ts`                                    | Line 688-710 (auto-create)   | Add `isMaster: true` when store is master |

### 5.2 Orchestration — `addOutletToMaster()`

| #   | Task                                        | File                                | Line/Location                       | Change                                                                       |
| --- | ------------------------------------------- | ----------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------- | ---------- |
| T7  | Create `addOutletToMaster()` function       | `src/database/multiOutlet/index.ts` | New function                        | Chains: create store → create projects → link all → update tenant            |
| T8  | Add project propagation in `addProject()`   | `src/database/projects/index.ts`    | After line 376 (addProject success) | If master store + outlets exist → auto-create linked projects in all outlets |
| T9  | Block outlet deletion of inherited projects | `src/database/projects/index.ts`    | `deleteProject()` function          | If `project.projectType === 'inherited'` → reject deletion                   |
| T10 | Add `outletStatus` toggle function          | `src/database/multiOutlet/index.ts` | New function                        | `toggleOutletProjectStatus(projectId, active                                 | inactive)` |

### 5.3 Session & Store Switching

| #   | Task                           | File                                               | Line/Location   | Change                                                     |
| --- | ------------------------------ | -------------------------------------------------- | --------------- | ---------------------------------------------------------- |
| T11 | Add store switch API endpoint  | `src/app/api/auth/switch-store/route.ts`           | New file        | Validates user has access to target store, updates session |
| T12 | Add store switcher component   | `src/components/molecules/StoreSwitcher/index.tsx` | New file        | Header dropdown showing all accessible stores              |
| T13 | Integrate switcher into layout | Layout header component                            | Existing header | Render `StoreSwitcher` when `storesList.length > 1`        |

### 5.4 UI — "Add Outlet" Flow

| #   | Task                                     | File                                                   | Line/Location       | Change                                      |
| --- | ---------------------------------------- | ------------------------------------------------------ | ------------------- | ------------------------------------------- |
| T14 | Add "Add Outlet" button on Projects page | `src/components/templates/main-app/projects/index.tsx` | Header actions area | Visible only if `store.isMaster === true`   |
| T15 | Create outlet creation modal             | `src/components/organisms/AddOutletModal/index.tsx`    | New file            | Single-step: name, city, contact → create   |
| T16 | Create outlet management list            | `src/components/organisms/OutletsList/index.tsx`       | New file            | Shows all linked outlets with status badges |

### 5.5 Enhanced Override Resolution

| #   | Task                                                   | File                                 | Line/Location  | Change                                                                 |
| --- | ------------------------------------------------------ | ------------------------------------ | -------------- | ---------------------------------------------------------------------- |
| T17 | Make `isOverridableItemField()` capabilities-aware     | `src/lib/multiOutlet/masterUtils.ts` | Line 84        | Accept optional `outletCapabilities` param, check dynamic config first |
| T18 | Make `isOverridableCategoryField()` capabilities-aware | Same file                            | Line 91        | Same pattern                                                           |
| T19 | Pass `outletCapabilities` from store context to editor | Editor component chain               | Multiple files | Thread capabilities through to field-level lock/unlock                 |

---

## 6. `addOutletToMaster()` — Orchestration Design

### 6.1 Function Signature

```typescript
/**
 * Create a new outlet store linked to master.
 * Atomic-ish: creates store, replicates ALL master projects, links each.
 * If any link fails, marks outlet as provisioning for retry.
 *
 * @param masterStoreId - The master store ID
 * @param outletDetails - Basic outlet info (name, city, contact)
 * @returns Created outlet IDs and status
 */
export async function addOutletToMaster(
  masterStoreId: number,
  outletDetails: {
    name: string;
    city?: string;
    contactPerson?: string;
  },
): Promise<{
  storeId: number;
  projectIds: string[];
  status: "active" | "provisioning";
}>;
```

### 6.2 Execution Flow

```
addOutletToMaster(masterStoreId, outletDetails)
    │
    ├── 1. Validate master exists + isMaster === true
    │       → Read stores/{masterStoreId}
    │       → If !isMaster → throw "Not a master store"
    │
    ├── 2. Get all master projects
    │       → Query projects where storeId === masterStoreId
    │       → Filter: only isMaster === true projects
    │
    ├── 3. Allocate new outlet storeId in the creation transaction
    │       → canonical/legacy/store-summary floor + occupied-document probes
    │
    ├── 4. Create outlet store doc
    │       → addStore({ ...outletDetails, tenantId, isMaster: false })
    │       → stores/{newStoreId}
    │
    ├── 5. Update tenant storesList
    │       → Append { storeId: newStoreId, name: outletDetails.name }
    │
    ├── 6. For EACH master project:
    │       ├── Create outlet project doc
    │       │   → addProject({ name: masterProject.name, storeId: newStoreId })
    │       │   → Set projectType: 'inherited'
    │       │   → Set outletStatus: 'active'
    │       │
    │       ├── Ensure master has isMaster: true
    │       │   → setProjectAsMaster(masterProjectId) if not already
    │       │
    │       └── Link outlet project to master
    │           → linkStoreToMaster(outletProjectId, masterProjectId)
    │           → Creates: masterProjectId, overrides{}, masterSnapshot
    │           → Logs: STORE_LINKED_TO_MASTER event
    │
    ├── 7. Set outlet status
    │       → If all links succeeded: status = 'active'
    │       → If any link failed: status = 'provisioning'
    │       → Log: OUTLET_CREATED event
    │
    └── 8. Return { storeId, projectIds, status }
```

### 6.3 Error Handling

| Failure Point                    | Behavior                      | Recovery                               |
| -------------------------------- | ----------------------------- | -------------------------------------- |
| Master validation fails          | Reject immediately            | No cleanup needed                      |
| Store creation fails             | Reject immediately            | No cleanup needed                      |
| Project creation fails           | Mark outlet as `provisioning` | Admin can retry from outlet management |
| Link fails after project created | Mark outlet as `provisioning` | Admin can retry linking                |
| All succeed                      | Mark as `active`              | —                                      |

**Why not full rollback:** Cross-collection Firestore transactions are expensive and complex. A `provisioning` status with retry capability is simpler and sufficient. The admin can see "1 outlet needs attention" and click retry.

---

## 7. Project Propagation — When Master Creates New Project

### 7.1 Trigger Point

**File:** `src/database/projects/index.ts` — `addProject()` function

After a project is successfully created for a master store, check if outlets exist and propagate:

```
addProject() succeeds for master store
    │
    ├── Check: Is this store isMaster?
    │   → Read store doc or check from context
    │   → If no → done (normal project creation)
    │
    ├── Check: Does tenant have outlets?
    │   → Check storesList.length > 1
    │   → If no → done (single store)
    │
    ├── Get all outlet stores
    │   → storesList.filter(s => s.storeId !== masterStoreId)
    │
    └── For EACH outlet store:
        ├── Create linked project (same name)
        ├── Set masterProjectId
        ├── Set projectType: 'inherited'
        ├── Set outletStatus: 'active'
        ├── Create overrides + snapshot
        └── Log MOL event
```

### 7.2 Feature Flag Gate

```typescript
if (!FEATURE_FLAGS.ENABLE_PROJECT_PROPAGATION) return;
```

This allows disabling propagation if issues arise without code changes.

---

## 8. Store Switcher — Session Architecture (Enhanced: Session 3)

### 8.1 Current State

```typescript
// src/providers/sessionProvider.tsx:73
session.user.storeId; // Single value — user locked to one store
```

### 8.2 Required Changes

The `session.user.stores[]` array already exists (it's set during onboarding for role mapping). The switcher needs:

1. **API endpoint** (`/api/auth/switch-store`) — Validates user belongs to target store, checks canonical target-store eligibility, calls NextAuth session update
2. **UI component** — Header dropdown showing `tenantDetails.storesList`
3. **Page reload** — After switch, reload to re-initialize `SessionProvider` with new `storeId`

> **Current runtime authority note (July 13, 2026):** Browser `activeStoreContext` is only a local selection hint, never store authority. It is structured JSON with exact numeric `tenantId`, `baseStoreId`, and target `storeId`. The reader requires coherent top-level and nested signed-session tenant/store aliases, exact base/tenant agreement, and target membership in the signed `storeIds`/`stores` mappings. Contradictory, inaccessible, malformed, legacy scalar, or stale values leave the signed base session unchanged and are removed. Protected reads and writes must still re-establish server/rules authority.

> `SessionProvider` applies the same fail-closed rule to denormalized tenant data. A tenant summary target must have a canonical active store ID. Embedded or freshly read `storeDetails` must independently match the signed tenant and selected store through every present alias and must not be inactive, deleted, auth-disabled, or blocked. Malformed numeric summary IDs cannot select an outlet or satisfy legacy single-store master inference.

### 8.3 Master Impersonation Mode (Session 3)

When a **master user** (owner role on master store) switches to an outlet context, they operate in **impersonation mode**:

```
Master user switches to "Downtown Branch"
    │
    ├── session.user.storeId → updated to outletStoreId
    ├── session.user.activeStoreContext → outletStoreId  (NEW)
    ├── session.user.isMasterUser → true                 (NEW — derived, never changes)
    │
    ├── Permissions: RETAIN ALL master permissions
    │   → canAccessBilling: true (still visible)
    │   → canAddStore: true (still visible)
    │   → canManageSubscription: true (still visible)
    │   → All sidebar items remain visible
    │
    ├── UI Indicator:
    │   → Header shows: "Downtown Branch" with badge "(HQ Access)"
    │   → Subtle top bar: "Viewing as HQ — Changes here affect only this outlet"
    │
    └── Navigation:
        → Chain Control Panel: still accessible
        → Billing page: still accessible
        → Other outlets: still switchable from dropdown
        → Menu editor: shows outlet's resolved view (master + overrides)
```

**Key distinction:**

- **Master user → outlet context** = impersonation (all master permissions retained)
- **Outlet manager → their store** = normal access (only manager permissions)

### 8.4 How `isMasterUser` is Derived

```typescript
// In SessionProvider or auth callback:
const isMasterUser = session.user.stores?.some(
  (s: any) => s.storeId === masterStoreId && s.role === "owner",
);
// masterStoreId derived from tenantDetails.storesList.find(s => s.isMaster)
```

This is **derived at session init**, not stored in DB. Avoids sync issues.

### 8.5 Security

- Validate `targetStoreId` belongs to same tenant
- Read `stores/{targetStoreId}` and reject missing, cross-tenant, inactive, soft-deleted, or platform-blocked target stores before switch success
- Reject platform-blocked tenant documents before target selection
- Validate user has access to target store (check `user.stores[]`)
- Rate limit: `AUTH_LOGIN` config (5 per 5 min)
- **Master impersonation**: only if user has `owner` role on master store
- **Outlet manager**: can only switch to stores listed in their `user.stores[]`

---

## 9. Outlet Capabilities — Resolution Flow

### 9.1 How Capabilities Flow Through the System

```
HQ admin configures outletCapabilities on master store
    → stores/{masterStoreId}.outletCapabilities = { priceOverride: true, ... }
    │
    ↓ (Outlet user opens editor)
    │
SessionProvider fetches store doc + tenant doc
    → tenantDetails.storesList has masterStoreId reference
    │
    ↓ (If outlet store context)
    │
Fetch master store's outletCapabilities
    → Either from cached tenantDetails or separate fetch
    │
    ↓ (Editor renders item)
    │
isOverridableItemField('price', outletCapabilities)
    → true → field editable, show override UI
    → false → field locked, show InheritanceBadge
```

### 9.2 Default Behavior (No Capabilities Configured)

If `outletCapabilities` is undefined on master store → use `DEFAULT_OUTLET_CAPABILITIES` constant. This matches current hardcoded behavior, ensuring backward compatibility.

---

## 10. Permanent Architectural Laws (From Discussion)

These are **locked decisions** — never revisited:

### LAW: One Master Store Per Chain

```
- First store created is master (set during onboarding)
- Cannot be changed (ENABLE_CHANGE_MASTER_STORE: false)
- Cannot be disabled or transferred
- If extreme case needed: manual migration by platform admin only
```

### LAW: Master Structure Forced to All Outlets

```
- Every master project MUST exist in every outlet
- Auto-created, auto-linked, no user choice
- Outlet can deactivate (hide from public) but NOT delete
- Inactive still receives structure updates
- New master project → auto-propagate to all existing outlets
```

### LAW: One Global Outlet Policy Per Chain

```
- outletCapabilities defined on master store doc
- Same policy applies to ALL outlets uniformly
- No per-outlet custom permissions
- HQ (master) can edit policy; outlets cannot
```

### LAW: Outlets Cannot Break Inheritance

```
- Cannot unlink from master (ENABLE_UNLINK_FROM_MASTER: false)
- Cannot delete inherited project
- Cannot modify master structure
- Can only: override allowed fields, add local items, deactivate project
```

### LAW: Surface Simplicity, Structural Rigidity

```
- User NEVER sees infrastructure complexity
- No "enable chain mode" button
- No "choose master" question
- No "which projects to inherit" selection
- System decides structure. User operates business.
```

---

## 11. Existing Codebase Assets (Already Built)

These need NO changes — they work as-is once onboarding connects them:

| Asset                       | File                                              | What It Does                                                   |
| --------------------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| `setProjectAsMaster()`      | `src/database/multiOutlet/index.ts:56`            | Designates project as master (sets isMaster, clears overrides) |
| `linkStoreToMaster()`       | `src/database/multiOutlet/index.ts:222`           | Links outlet to master (creates snapshot + overrides)          |
| `getLinkedStores()`         | `src/database/multiOutlet/index.ts:996`           | Lists all outlets linked to a master project                   |
| `hasLinkedOutlets()`        | `src/database/multiOutlet/index.ts:~870`          | Guard: checks if master has linked outlets                     |
| `canHaveLinkedOutlets()`    | `src/database/multiOutlet/index.ts:985`           | Derives chain status from storesList                           |
| `resolveProjectForRender()` | `src/lib/multiOutlet/resolveProject.ts:145`       | Merges master + overrides at read time                         |
| `useMasterUpdateAwareness`  | `src/hooks/useMasterUpdateAwareness.ts`           | Detects master changes, shows banner, handles acknowledge      |
| `detectOperationalChange()` | `src/database/projects/index.ts:450`              | Increments signal doc on master edit                           |
| `OVERRIDABLE_ITEM_FIELDS`   | `src/lib/multiOutlet/masterUtils.ts:43`           | Hardcoded override rules (Day 1 defaults)                      |
| `LOCKED_ITEM_FIELDS`        | `src/lib/multiOutlet/masterUtils.ts:21`           | Hardcoded lock rules (Day 1 defaults)                          |
| `InheritanceBadge`          | `src/components/atoms/InheritanceBadge/index.tsx` | UI badge showing inherited/overridden state                    |
| `applyItemOverride()`       | `src/database/multiOutlet/index.ts:~530`          | Writes item-level override                                     |
| `removeItemOverride()`      | `src/database/multiOutlet/index.ts:~600`          | Removes item-level override                                    |
| `addStore()`                | `src/database/stores/index.tsx:100`               | Creates store doc with defaults                                |
| `addProject()`              | `src/database/projects/index.ts`                  | Creates project doc                                            |

---

## 12. Cost Analysis

### 12.1 One-Time: Outlet Creation (Per Outlet)

| Operation                                | Writes     | Reads |
| ---------------------------------------- | ---------- | ----- |
| Create store doc                         | 1          | 0     |
| Sync to storesSummary                    | 1          | 0     |
| Update tenant storesList                 | 1          | 0     |
| Create project(s) — per master project   | N          | 0     |
| Sync project(s) to projectsSummary       | N          | 0     |
| Set master isMaster (if first time)      | 0-1        | 0     |
| Link each project (overrides + snapshot) | N          | N     |
| MOL log per link                         | N          | 0     |
| **Total (N master projects)**            | **3 + 3N** | **N** |

For typical case (1 master project): **6 writes + 1 read** = negligible.  
For 3 master projects: **12 writes + 3 reads** = still negligible.

### 12.2 Ongoing: Per Outlet Per Month

Same as documented in `store-onboarding-flow_spec.md §8.2`:  
~100 reads + ~10 writes = **$0.0002/month** per outlet.

---

## 13. Testing Strategy

### 13.1 Critical Test Scenarios

| #    | Scenario                                   | Expected Result                                                      |
| ---- | ------------------------------------------ | -------------------------------------------------------------------- |
| TC1  | New user onboarding                        | Store created with `isMaster: true`, storesList has `isMaster: true` |
| TC2  | Add first outlet                           | Store + project(s) created, all linked, snapshot baseline exists     |
| TC3  | Add outlet with 3 master projects          | 3 outlet projects created, all linked with correct masterProjectId   |
| TC4  | Master creates new project (outlets exist) | New project auto-created in all outlets, linked                      |
| TC5  | Outlet deactivates inherited project       | `outletStatus: 'inactive'`, not deleted, still linked                |
| TC6  | Outlet tries to delete inherited project   | Rejected by DAL guard                                                |
| TC7  | Master edits menu (outlets exist)          | operationalVersion increments, outlets see banner                    |
| TC8  | Outlet acknowledges master changes         | Snapshot updated, banner hidden                                      |
| TC9  | Store switcher — switch to outlet          | Session updated, page reloads with outlet context                    |
| TC10 | Store switcher — switch back to master     | Session updated, page reloads with master context                    |
| TC11 | Outlet creation fails mid-process          | Status = `provisioning`, retry available                             |
| TC12 | 50 outlets created sequentially            | All get unique IDs, all linked correctly                             |

### 13.2 Edge Case Tests

| #   | Scenario                                 | Expected Result                                      |
| --- | ---------------------------------------- | ---------------------------------------------------- |
| EC1 | Outlet with `provisioning` status        | Shows warning in outlet list, retry button available |
| EC2 | Master project deleted (has outlets)     | Blocked by `hasLinkedOutlets()` guard                |
| EC3 | Inactive outlet project + master updates | Snapshot still updates, structure preserved          |
| EC4 | Outlet creates `localOnly` project       | Created without masterProjectId, no propagation      |
| EC5 | Two admins add outlets simultaneously    | Sequential ID generation prevents conflicts          |

### 13.3 Session 3 Test Scenarios

| #    | Scenario                                           | Expected Result                                                                   |
| ---- | -------------------------------------------------- | --------------------------------------------------------------------------------- |
| TC13 | Master user switches to outlet (impersonation)     | All master permissions retained, HQ badge shown, outlet data loaded               |
| TC14 | Outlet manager tries to access Chain Control Panel | Redirected / 404 — menu item not visible                                          |
| TC15 | Chain Control Panel — billing summary display      | Correct outlet count, cost per outlet, next invoice estimate                      |
| TC16 | Deactivate outlet from Chain Control Panel         | `store.active = false`, `scheduledForBillingRemoval = true`, staff access revoked |
| TC17 | Reactivate outlet before next billing cycle        | `store.active = true`, flags cleared, no billing impact                           |
| TC18 | Master user in outlet context edits price          | Override applied to outlet only, "Local Override" badge shown                     |
| TC19 | Outlet context banner visibility                   | "Changes here affect only this outlet" shown when in outlet context               |
| TC20 | "Locations" sidebar visibility                     | Visible only when `isMaster && storesList.length > 1`                             |

---

## 14. File Inventory (Session 1-2 — see §20 for cumulative)

### New Files

| File                                                | Purpose                  | Est. Lines |
| --------------------------------------------------- | ------------------------ | ---------- |
| `src/app/api/auth/switch-store/route.ts`            | Store switching endpoint | ~60        |
| `src/components/molecules/StoreSwitcher/index.tsx`  | Header store dropdown    | ~80        |
| `src/components/organisms/AddOutletModal/index.tsx` | Outlet creation modal    | ~120       |
| `src/components/organisms/OutletsList/index.tsx`    | Outlet management list   | ~100       |

### Modified Files

| File                                                                | Change                                                         | Impact              |
| ------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------- |
| `src/app/api/onboarding/create-subscription/route.ts`               | Add `isMaster: true` to store + storesList                     | Low (2 lines)       |
| `src/types/multiOutlet.types.ts`                                    | Add `OutletCapabilities` type + defaults                       | Low (~30 lines)     |
| `src/types/platform/store.ts`                                       | Add `outletCapabilities` field                                 | Low (1 line)        |
| `src/components/templates/main-app/projects/types/project.types.ts` | Add `projectType`, `outletStatus`                              | Low (2 lines)       |
| `src/database/multiOutlet/index.ts`                                 | Add `addOutletToMaster()`, `toggleOutletProjectStatus()`       | Medium (~150 lines) |
| `src/database/projects/index.ts`                                    | Add propagation hook in `addProject()`, block inherited delete | Medium (~50 lines)  |
| `src/lib/multiOutlet/masterUtils.ts`                                | Make override checks capabilities-aware                        | Low (~15 lines)     |
| `src/config/features.ts`                                            | Add 5 new feature flags                                        | Low (5 lines)       |
| `src/components/templates/main-app/projects/index.tsx`              | Add "Add Outlet" button                                        | Low (~10 lines)     |

**Total new code estimate:** ~460 lines new files + ~260 lines modifications = **~720 lines**

---

## 15. Safety Job — `verifyAllOutletsHaveAllMasterProjects()`

### 15.1 Purpose

Background integrity check that ensures every outlet has a linked project for every master project. This catches:

- Failed propagation during outlet creation (E23)
- Billing success + internal failure (E18)
- Any future bugs in propagation logic

### 15.2 Design

```typescript
/**
 * SAFETY NET — Run as periodic Cloud Function or part of reconciliation.
 * Does NOT auto-fix. Logs warnings for admin review.
 *
 * Frequency: Daily (runs with existing nightly scheduler)
 * Location: functions/src/multiOutlet/verifyOutletIntegrity.ts
 */
async function verifyAllOutletsHaveAllMasterProjects(): Promise<IntegrityReport> {
  const report: IntegrityReport = { checked: 0, mismatches: [], healthy: 0 };

  // 1. Get all tenants with multi-outlet (storesList.length > 1)
  // 2. For each tenant:
  //    a. Find master store (isMaster === true)
  //    b. Get all master projects (isMaster === true)
  //    c. For each outlet store:
  //       - Get all outlet projects with masterProjectId set
  //       - Compare: every master project should have a corresponding outlet project
  //       - If missing: log warning, add to mismatches (do NOT create)
  // 3. Return report

  return report;
}
```

### 15.3 What It Does NOT Do

- Does NOT auto-create missing projects (could mask real bugs)
- Does NOT modify any data
- Does NOT block any user operations
- Only logs warnings + returns report for admin dashboard

### 15.4 Feature Flag

```typescript
ENABLE_OUTLET_INTEGRITY_CHECK: true; // In functions/src/constants/features.ts
```

---

## 16. Lifecycle Phases — End-to-End Outlet Journey

### Phase 0: Fresh Signup

```
User signs up → tenant + store created → store.isMaster = true (implicit)
No chain infrastructure visible. User operates as single-store.
```

### Phase 1: First Outlet Addition

```
HQ clicks "Add Outlet" → billing modal → confirm
  → PATH 1: Razorpay quantity 1→2, prorated charge
  → PATH 2: Create store + replicate projects + link
Chain mode now derivable: storesList.length > 1
Store switcher appears in header.
```

### Phase 2: Growth (2-50 outlets)

```
Each new outlet follows same flow.
Master structure always forced to all outlets.
New master projects auto-propagate.
Billing quantity grows automatically.
```

### Phase 3: Steady State

```
HQ manages menu from master store context.
Outlets override prices/availability as allowed.
Master edits → operationalVersion increments → outlets see banner.
One invoice, one billing cycle, one payer.
```

### Phase 4: Outlet Deactivation

```
Behind feature flag: ENABLE_OUTLET_DEACTIVATE
Owner deactivates outlet from Chain Control Panel or store settings:
  → store.active = false (immediate)
  → Outlet hidden from public menus
  → Outlet staff lose access
  → store.scheduledForBillingRemoval = true
  → Data preserved for potential reactivation
  → Billing quantity decremented at NEXT cycle (see billing doc §10)
```

### Phase 5: Outlet Reactivation (Before Next Cycle)

```
Owner reactivates from Chain Control Panel:
  → store.active = true
  → scheduledForBillingRemoval cleared
  → No billing impact (was never removed from quantity)
  → Clean reversal
```

---

## 17. Chain Control Panel — HQ Command Center (Session 3)

### 17.1 Overview

New sidebar menu item: **"Locations"** — visible only when `store.isMaster === true && tenantDetails.storesList.length > 1`.

This is the centralized screen where master/HQ users manage all outlets, view billing impact, and perform chain-wide actions.

### 17.2 Layout

```
┌─────────────────────────────────────────────────┐
│ Chain Control Panel                              │
├─────────────────────────────────────────────────┤
│                                                  │
│  📊 BILLING SUMMARY                              │
│  ┌───────────────────────────────────────────┐  │
│  │ Active Outlets: 4                          │  │
│  │ Cost per Outlet: ₹3,000/month             │  │
│  │ Total Chain Cost: ₹15,000/month           │  │
│  │ (Master + 4 outlets)                      │  │
│  │ Next Invoice: March 12, 2026 — ₹15,000   │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  🏪 OUTLETS                    [+ Add Outlet]    │
│  ┌───────────────────────────────────────────┐  │
│  │ ⭐ Master HQ          Active    ──────    │  │
│  │ 🏠 Downtown Branch    Active    [Manage]  │  │
│  │ 🏠 Airport Location   Active    [Manage]  │  │
│  │ 🏠 Mall Branch        Active    [Manage]  │  │
│  │ 🏠 Railway Station    Inactive  [Manage]  │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  Day 1: Simple list. Pagination when >20.        │
│  Future: search, filter by status, map view.     │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 17.3 UX Rules for Outlet Override Labeling

When an HQ user is viewing an outlet context (via store switcher), the UI must make it unmistakably clear that edits are local overrides:

1. **Top banner** (persistent, not dismissible):

   ```
   "You are viewing Downtown Branch — Changes here affect only this outlet"
   ```

   Style: `bg-amber-50 border-amber-200 text-amber-800`

2. **Item-row badge** — when an item has a local override:

   ```
   [Local Override] next to item name
   ```

   Uses existing `InheritanceBadge` at `src/components/atoms/InheritanceBadge/index.tsx`

3. **Edit modal header** — when editing an overridable field in outlet context:

   ```
   "Editing for Downtown Branch only"
   ```

4. **Master fields** — non-overridable fields show lock icon:
   ```
   🔒 Item Name (set by HQ — contact headquarters to change)
   ```

### 17.4 Chain Control Panel — Per-Outlet Actions

Each outlet row in the Chain Control Panel has:

| Action         | Description                                            | Gate                                   |
| -------------- | ------------------------------------------------------ | -------------------------------------- |
| **View**       | Switch to outlet context (impersonation mode)          | Always available                       |
| **Manage**     | Open outlet settings (name, contact, hours)            | `canManageStore` permission            |
| **Deactivate** | Set `store.active = false` + schedule billing removal  | `canManageStore` + confirmation dialog |
| **Reactivate** | Set `store.active = true` + clear billing removal flag | Only if `active === false`             |

### 17.5 Permissions — Who Sees What (Session 3)

| Role                 | Chain Control Panel | Billing Page   | Add Outlet | Store Switcher    | Override Prices | AI Features |
| -------------------- | ------------------- | -------------- | ---------- | ----------------- | --------------- | ----------- |
| **Owner (Master)**   | ✅ Full access      | ✅ Full access | ✅         | ✅ All stores     | ✅              | ✅          |
| **Manager (Master)** | ✅ Read-only        | ❌             | ❌         | ✅ All stores     | ✅              | Per config  |
| **Staff (Master)**   | ❌                  | ❌             | ❌         | ❌                | Per config      | ❌          |
| **Manager (Outlet)** | ❌                  | ❌             | ❌         | ❌ Own store only | ✅ Own store    | Per config  |
| **Staff (Outlet)**   | ❌                  | ❌             | ❌         | ❌                | Per config      | ❌          |

**Key:** Permissions map directly to existing `RolePermissions` at `src/types/platform/roles.ts:55`. No new permission infrastructure needed. Access gated by:

- `canAccessBilling` → Billing page visibility
- `canAddStore` → "Add Outlet" button visibility
- `canManageStore` → Chain Control Panel visibility + outlet management
- `isMasterUser` (derived) → determines if master permissions apply in outlet context

---

## 18. New Architectural Laws (Session 3)

### LAW: Flat Hierarchy Only

```
- One brand → one master → all outlets equal
- No regional grouping, sub-masters, or franchise trees
- No multi-master chains
- If grouping needed later: add as optional tag-based layer, not structural
```

### LAW: No Deep Per-Outlet Audit History

```
- Only current state tracked (latest overrides, latest status)
- No per-outlet change timeline, version restore, or rollback
- MOL event logs (src/database/multiOutlet/index.ts) cover operational debugging
- No user-facing audit history
```

### LAW: Owner-Controlled Billing

```
- Owner explicitly decides which outlets exist (create/deactivate)
- System never auto-deactivates billing based on usage or inactivity
- Outlet creation = immediate billing. Outlet removal = next-cycle reduction.
- No "free trial" for outlets. No paused-but-free state.
```

### LAW: Two Roles Only for Multi-Outlet

```
- Master/HQ: Full access (owner role on master store)
- Outlet Manager: Limited access (manager role on outlet store)
- No custom roles, no per-outlet role customization Day 1
- Permission differences handled by existing RolePermissions system
```

---

## 19. Additional Implementation Tasks (Session 3)

| #   | Task                                             | File                                                 | Change                                                       |
| --- | ------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------ |
| T20 | Add `isMasterUser` derivation to SessionProvider | `src/providers/sessionProvider.tsx`                  | Derive from `stores[]` + master store lookup (see §8.4)      |
| T21 | Add `activeStoreContext` to session data         | `src/providers/sessionProvider.tsx`                  | Track which store user is viewing (separate from auth store) |
| T22 | Create Chain Control Panel page                  | `src/app/(main)/locations/page.tsx`                  | New page — outlets list, billing summary, per-outlet actions |
| T23 | Add "Locations" sidebar item                     | Sidebar navigation component                         | Visible when `isMaster && storesList.length > 1`             |
| T24 | Add outlet override context banner               | `src/components/atoms/OutletContextBanner/index.tsx` | Top banner: "Changes here affect only this outlet"           |
| T25 | Enhance `InheritanceBadge` for outlet context    | `src/components/atoms/InheritanceBadge/index.tsx`    | Add "Local Override" variant + edit modal header text        |

---

## 20. Updated File Inventory (Cumulative)

### New Files (Session 1-3)

| File                                                 | Purpose                           | Est. Lines |
| ---------------------------------------------------- | --------------------------------- | ---------- |
| `src/app/api/auth/switch-store/route.ts`             | Store switching endpoint          | ~60        |
| `src/app/api/outlets/deactivate/route.ts`            | Outlet deactivation endpoint      | ~80        |
| `src/components/molecules/StoreSwitcher/index.tsx`   | Header store dropdown             | ~80        |
| `src/components/organisms/AddOutletModal/index.tsx`  | Outlet creation modal             | ~120       |
| `src/components/organisms/OutletsList/index.tsx`     | Outlet management list            | ~100       |
| `src/components/atoms/OutletContextBanner/index.tsx` | "Changes affect only this outlet" | ~40        |
| `src/app/(main)/locations/page.tsx`                  | Chain Control Panel page          | ~200       |

**Total new files estimate:** ~680 lines

### Modified Files (Session 1-3)

| File                                                                | Change                                                         | Impact              |
| ------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------- |
| `src/app/api/onboarding/create-subscription/route.ts`               | Add `isMaster: true` to store + storesList                     | Low (2 lines)       |
| `src/types/multiOutlet.types.ts`                                    | Add `OutletCapabilities` type + defaults                       | Low (~30 lines)     |
| `src/types/platform/store.ts`                                       | Add `outletCapabilities`, `scheduledForBillingRemoval` fields  | Low (3 lines)       |
| `src/components/templates/main-app/projects/types/project.types.ts` | Add `projectType`, `outletStatus`                              | Low (2 lines)       |
| `src/database/multiOutlet/index.ts`                                 | Add `addOutletToMaster()`, `toggleOutletProjectStatus()`       | Medium (~150 lines) |
| `src/database/projects/index.ts`                                    | Add propagation hook in `addProject()`, block inherited delete | Medium (~50 lines)  |
| `src/lib/multiOutlet/masterUtils.ts`                                | Make override checks capabilities-aware                        | Low (~15 lines)     |
| `src/config/features.ts`                                            | Add 7 new feature flags                                        | Low (7 lines)       |
| `src/components/templates/main-app/projects/index.tsx`              | Add "Add Outlet" button                                        | Low (~10 lines)     |
| `src/providers/sessionProvider.tsx`                                 | Add `isMasterUser` derivation + `activeStoreContext`           | Medium (~30 lines)  |
| `src/components/atoms/InheritanceBadge/index.tsx`                   | Add "Local Override" variant                                   | Low (~15 lines)     |
| Sidebar navigation component                                        | Add "Locations" menu item (conditional)                        | Low (~5 lines)      |

**Total modified files estimate:** ~320 lines modifications

**Grand total code estimate:** ~1,000 lines (new + modified)

---

**DOCUMENT STATUS:** Implemented source evidence - not current launch certification
**PREREQUISITE:** `store-onboarding-flow_spec.md` (gap analysis)  
**COMPANION:** `store-onboarding-billing_impl.md` (PATH 1: Razorpay Billing)  
**EXECUTION ORDER:** Billing tasks (BT1-BT15) THEN internal tasks (T1-T25)  
**GOVERNANCE:** All decisions aligned with MenuList Constitution + Security Rules + 3-Year Freeze  
**SESSIONS:** Incorporates decisions from ChatGPT sessions 1-3
