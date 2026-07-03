# Store Onboarding Flow — Specification & Gap Analysis

**Feature:** #4C — Store Onboarding (Master + Local Outlet)  
**Status:** Implemented source evidence; not current launch certification
**Original Date:** February 7, 2026  
**Last Reviewed:** July 2, 2026
**Analyst:** Cascade (Full Codebase Access)  
**ICP:** Premium SMB Groups (2–10 stores)

> **Launch Boundary:** This spec records store-onboarding implementation evidence, not current production-launch approval. Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, `npm run verify:multi-location-boundary`, desktop/mobile Locations browser QA, outlet create/deactivate/rename QA, Razorpay sandbox evidence where billing is involved, Firebase deploy evidence where rules/functions change, and target-environment smoke.

---

## Executive Summary

**The multi-outlet DAL layer is 100% complete. The UI layer is ✅ BUILT (verified Feb 24, 2026).**

All database operations AND UI components for multi-outlet onboarding are implemented:

1. **Flow A:** Master/Single Store (existing — works today)
2. **Flow B:** Local Outlet Addition by Master (✅ BUILT — `AddOutletModal`, `api/outlets/create/route.ts`, `locations/page.tsx`, mobile `MobileLocationsScreen.tsx`)

> **STALE DOC NOTE (Feb 24, 2026):** This spec was written when UI was 0%. It has since been fully implemented. See codebase: `src/components/organisms/AddOutletModal/`, `src/app/api/outlets/create/route.ts`, `src/app/api/outlets/deactivate/route.ts`, `src/app/(main)/locations/page.tsx`, `src/components/mobile/screens/MobileLocationsScreen.tsx`.

---

## 1. Current Store Creation Flows (What Exists Today)

### 1.1 Flow A: New User Onboarding (First Store)

**Trigger:** User signs up → selects plan → pays  
**Path:** `src/app/api/onboarding/create-subscription/route.ts:127-222`  
**Type:** Server-side atomic transaction (Admin SDK)

```
User Signs Up
    ↓
POST /api/onboarding/create-subscription
    ↓
Firestore Transaction (atomic):
    ├── 1. Create tenant doc          → tenants/{tId}
    ├── 2. Create store doc           → stores/{sId}  (name: "{business} - Main Store")
    ├── 3. Update user doc            → users/{uId}   (tenantId, storeId, stores[])
    ├── 4. Update platform summary    → platformSummary/summary (counts)
    └── 5. Sync store to summary     → platformSummary/storesSummary
    ↓
Create Razorpay subscription
    ↓
Create subscription record
    ↓
Return { tenantId, storeId } → session updated
```

**What this creates:**
| Document | Key Fields | Multi-Outlet Fields |
|----------|-----------|-------------------|
| `tenants/{tId}` | name, storesList: [{storeId, name}] | ❌ No `isMaster` in storesList |
| `stores/{sId}` | name, businessType, roles, timeSlotPresets | ❌ No `isMaster: true` set |
| `users/{uId}` | tenantId, storeId, stores: [{storeId, role}] | — |

**What this does NOT create:**

- ❌ No project doc (created later when user visits Projects page)
- ❌ No `isMaster` flag on store
- ❌ No multi-outlet setup

**Codebase evidence:** `src/app/api/onboarding/create-subscription/route.ts:171-186` — store created without `isMaster` field.

### 1.2 Flow A2: Additional Store via Business Settings

**Trigger:** Owner navigates to Business Settings → fills form → saves (when no storeId exists on current view)  
**Path:** `src/components/templates/main-app/businessSettings/index.tsx:389-417`  
**Type:** Client-side DAL call

```
Business Settings Page (no storeId = new store)
    ↓
getPlatformSummary() → get next storeId
    ↓
addStore(changesToUpload)
    ├── Creates store doc              → stores/{newSId}
    ├── Updates platform summary count → platformSummary/summary
    └── Syncs to storesSummary         → platformSummary/storesSummary
    ↓
updateTenantsStoreslist(tenantData)
    └── Appends {storeId, name} to tenant.storesList
```

**What this creates:**
| Document | Key Fields | Multi-Outlet Fields |
|----------|-----------|-------------------|
| `stores/{sId}` | name, businessType, roles, timeSlotPresets | ❌ No `isMaster` set |
| `tenants/{tId}` | storesList updated | ❌ No `isMaster` in entry |

**What this does NOT create:**

- ❌ No project doc
- ❌ No `masterProjectId` link
- ❌ No initial snapshot
- ❌ No overrides structure

### 1.3 Project Creation (Separate Flow)

**Trigger:** User visits Projects page  
**Path A (auto):** `src/database/projects/index.ts:688-710` — `getProjectsList()` auto-creates default "Menu" project if none exist  
**Path B (manual):** `src/components/templates/main-app/projects/index.tsx:376` — User clicks "New Catalog" → `addProject()`

```
User visits Projects page
    ↓
getProjectsList() (SWR fetch)
    ↓
No projects exist? → Auto-create default:
    ├── projectId: "{tId}-default-{sId}"
    ├── name: "Menu"
    ├── files: []
    └── Syncs to projectsSummary
```

**What this does NOT set:**

- ❌ No `masterProjectId`
- ❌ No `isMaster: true`
- ❌ No `overrides`
- ❌ No `masterSnapshot`

---

## 2. Multi-Outlet DAL Functions (What's Built But Unused)

### 2.1 DAL Inventory

| Function                  | File                                | Line | UI Consumer          | Status                              |
| ------------------------- | ----------------------------------- | ---- | -------------------- | ----------------------------------- |
| `setProjectAsMaster()`    | `src/database/multiOutlet/index.ts` | 56   | **NONE**             | ⚠️ Dead code                        |
| `unsetProjectAsMaster()`  | `src/database/multiOutlet/index.ts` | 145  | **NONE**             | ⚠️ Dead code                        |
| `linkStoreToMaster()`     | `src/database/multiOutlet/index.ts` | 222  | **NONE**             | ⚠️ Dead code                        |
| `switchStoreMaster()`     | `src/database/multiOutlet/index.ts` | 354  | **NONE**             | ⚠️ Dead code (flag permanently off) |
| `unlinkStoreFromMaster()` | `src/database/multiOutlet/index.ts` | 480  | **NONE**             | ⚠️ Dead code (flag permanently off) |
| `applyItemOverride()`     | `src/database/multiOutlet/index.ts` | ~530 | Editor UI            | ✅ Used                             |
| `removeItemOverride()`    | `src/database/multiOutlet/index.ts` | ~600 | Editor UI            | ✅ Used                             |
| `getLinkedStores()`       | `src/database/multiOutlet/index.ts` | 996  | **NONE**             | ⚠️ Dead code                        |
| `hasLinkedOutlets()`      | `src/database/multiOutlet/index.ts` | ~870 | Delete project guard | ✅ Used                             |
| `canHaveLinkedOutlets()`  | `src/database/multiOutlet/index.ts` | 985  | Delete project guard | ✅ Used                             |

**Key insight:** Override application works (Editor calls it). But the 3 setup functions (`setProjectAsMaster`, `linkStoreToMaster`, `getLinkedStores`) have **zero UI consumers**.

### 2.2 What Each Setup Function Does

**`setProjectAsMaster(projectId)`** — Designates a project as master:

- Sets `isMaster: true` on project doc
- Removes `masterProjectId` (master can't link to another master)
- Removes `overrides` (master never has overrides)
- Validates single-file constraint

**`linkStoreToMaster(storeProjectId, masterProjectId)`** — Links outlet project to master:

- Validates master exists and is same tenant
- Validates both are single-file
- Sets `masterProjectId` on outlet project
- Creates `overrides: { items: {}, categories: {}, attributes: {} }`
- Creates initial `masterSnapshot` (awareness baseline)
- Reads current `operationalVersion` from signal doc
- Logs MOL event

**`getLinkedStores(masterProjectId)`** — Lists all outlets linked to a master:

- Scans all stores in tenant (except master's store)
- Checks each store's projects for matching `masterProjectId`
- Returns `Array<{ sId, projectId }>`

### 2.3 What `linkStoreToMaster()` Creates (The Snapshot Flow)

This is the code at `src/database/multiOutlet/index.ts:273-318` that the user highlighted:

```
linkStoreToMaster(outletProjectId, masterProjectId)
    ↓
Validate master exists, same tenant, single-file
    ↓
IF ENABLE_MASTER_UPDATE_AWARENESS:
    ├── Extract master items + categories from master project files
    ├── Read operationalVersion from signal doc
    └── createMasterSnapshot(items, cats, version, userId, null)
        → Returns: { acknowledgedOn, acknowledgedBy, operationalVersion, items[], categories[], lastDiff: null }
    ↓
updateDoc(outletProjectRef, {
    masterProjectId,
    overrides: { items: {}, categories: {}, attributes: {} },
    masterSnapshot   // ← Initial baseline
})
    ↓
logMultiOutletEvent(STORE_LINKED_TO_MASTER)
```

**This flow is complete and correct.** Nothing wrong with it. It just needs a UI to call it.

---

## 3. Session & Store Context Architecture

### 3.1 How User Is Bound to a Store

**Path:** `src/providers/sessionProvider.tsx:56-116`

```
User logs in → NextAuth session created
    ↓
session.user = {
    id, email, name,
    tenantId,       // ← Set during onboarding
    storeId,        // ← Set during onboarding (SINGLE store)
    stores: [       // ← Array of {storeId, name, role}
        { storeId: 1, name: "Main Store", role: "owner" }
    ]
}
    ↓
SessionProvider reads session.user.storeId
    ↓
Fetches store doc + tenant doc
    ↓
Provides via PlatformGlobalDataContext:
    - storeDetails (current store)
    - tenantDetails (tenant + storesList)
```

**Critical finding:** `session.user.storeId` is a **single value** set at login time. There is **no store-switching UI** in the main app. The user is locked to one store per session.

### 3.2 Store Switching

- **Platform Admin** (`src/components/templates/platform/stores/index.tsx`): Platform-level store management exists but is for platform admins, not tenant users.
- **Main App**: No store switcher exists. User sees only their assigned store.
- **Session update**: To switch stores, user would need to update `session.user.storeId` and re-login or have a session update mechanism.

### 3.3 Tenant storesList Structure

```typescript
// tenants/{tId}
{
  storesList: [
    { storeId: 1, name: "Main Store" }, // ← No isMaster flag
    { storeId: 2, name: "Branch Store" }, // ← No isMaster flag
  ];
}
```

**Gap:** The `isMaster` field exists in the spec (`multi-outlet-consistency_spec.md:494`) and in `canHaveLinkedOutlets()` check, but is **never written** to `storesList` entries during store creation.

---

## 4. Gap Analysis: What's Missing for Local Outlet Onboarding

### 4.1 Missing Pieces (Ordered by Dependency)

| #   | Gap                                                                                          | Category         | Blocks     |
| --- | -------------------------------------------------------------------------------------------- | ---------------- | ---------- |
| G1  | **Master designation during onboarding** — First store created without `isMaster: true`      | Data             | G2, G3, G4 |
| G2  | **"Add Outlet" UI** — No screen for HQ admin to add a new outlet store linked to master      | UI               | G3, G4     |
| G3  | **Auto-link flow** — When outlet store + project created, `linkStoreToMaster()` never called | Orchestration    | G4         |
| G4  | **Store switcher** — HQ admin can't navigate between master and outlet stores                | Navigation       | —          |
| G5  | **`isMaster` in storesList** — Never written to tenant.storesList entries                    | Data consistency | G2         |
| G6  | **Outlet user session** — Outlet staff need `session.user.storeId` pointing to their outlet  | Auth             | —          |
| G7  | **HQ admin multi-store access** — HQ admin needs access to all stores, not just one          | Auth             | G4         |

### 4.2 What Works Without Changes

| Feature                                          | Why It Works                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| Override application (price, availability, etc.) | Editor already calls DAL override functions                            |
| Resolve project for rendering                    | `resolveProjectForRender()` merges master + overrides at read time     |
| Master update awareness (banner + diff)          | `useMasterUpdateAwareness` hook fully implemented                      |
| Acknowledge changes                              | Hook writes snapshot + MOL log                                         |
| Inheritance badges in editor                     | `InheritanceBadge` component renders based on `_resolved.itemStates`   |
| Local item addition                              | Editor handles `L_I_` prefixed items                                   |
| Delete protection                                | `deleteProject()` checks `hasLinkedOutlets()` before allowing deletion |

---

## 5. Proposed Implementation: Local Outlet Onboarding Flow

### 5.1 Flow B: "Add Local Outlet" (NEW)

**Actor:** HQ Admin (owner of master store)  
**Precondition:** Tenant has at least one store with a master project  
**Location:** Projects page or dedicated multi-outlet management section

```
HQ Admin clicks "Add Outlet" (from master store context)
    ↓
Step 1: Outlet Details Form
    ├── Outlet name (e.g., "Downtown Branch")
    ├── City / Location
    ├── Contact person
    └── Currency (inherited from master by default)
    ↓
Step 2: System creates outlet (orchestrated sequence):
    ├── 2a. addStore({ ...outletDetails, tenantId })          → stores/{newSId}
    ├── 2b. Set isMaster: false on new store
    ├── 2c. updateTenantsStoreslist({ storesList: [..., { storeId, name }] })
    ├── 2d. addProject({ name: "Menu" }) for new store        → projects/{tId}/{newSId}/{pId}
    ├── 2e. setProjectAsMaster(masterProjectId) if not already master
    ├── 2f. linkStoreToMaster(newProjectId, masterProjectId)  → Links + snapshot + overrides
    └── 2g. Create outlet user account (or assign existing user to outlet)
    ↓
Step 3: Success confirmation
    ├── "Outlet created and linked to master menu"
    ├── Show QR code / menu URL for new outlet
    └── Option: "Manage this outlet" (switch store context)
```

### 5.2 Data Flow Diagram

```
BEFORE (Single Store):
┌─────────────────────────────────────────┐
│ Tenant (tId: 1)                         │
│ storesList: [{ sId: 1, name: "Main" }] │
│                                         │
│ Store 1: "Joe's Pizza - Main Store"     │
│   └── Project: "Menu" (pId: 1-xxx-1)   │
│       └── files: [{ items, categories }]│
└─────────────────────────────────────────┘

AFTER (Multi-Outlet):
┌───────────────────────────────────────────────────────┐
│ Tenant (tId: 1)                                       │
│ storesList: [                                         │
│   { sId: 1, name: "Main", isMaster: true },          │
│   { sId: 2, name: "Downtown Branch" }                 │
│ ]                                                     │
│                                                       │
│ Store 1: "Joe's Pizza - Main Store"  (isMaster: true) │
│   └── Project: "Menu" (pId: 1-xxx-1, isMaster: true) │
│       └── files: [{ items, categories }]              │
│                                                       │
│ Store 2: "Joe's Pizza - Downtown"                     │
│   └── Project: "Menu" (pId: 1-yyy-2)                  │
│       ├── masterProjectId: "1-xxx-1"                  │
│       ├── overrides: { items: {}, categories: {} }    │
│       └── masterSnapshot: { ... }                     │
│                                                       │
│ Signal Doc: masterOperationalState/1-xxx-1             │
│   └── operationalVersion: 0                           │
└───────────────────────────────────────────────────────┘
```

### 5.3 Orchestration Function (NEW — to be created)

**Location:** `src/database/multiOutlet/index.ts`  
**Name:** `addOutletToMaster()`

This is the single orchestration function that chains the 3 separate DAL calls into one user-facing action:

```typescript
/**
 * Add a new outlet store linked to an existing master project.
 *
 * Orchestrates: store creation → project creation → master linking
 * All 3 steps are sequential (not atomic transaction due to cross-collection).
 * Partial failure is handled: if linking fails, store + project exist but aren't linked.
 * Admin can retry linking via UI.
 *
 * @param masterProjectId - The master project to link the new outlet to
 * @param outletDetails - Store details for the new outlet
 */
export async function addOutletToMaster(
  masterProjectId: string,
  outletDetails: {
    name: string;
    city: string;
    // ...other store fields
  },
): Promise<{ storeId: number; projectId: string; success: boolean }> {
  // 1. Create store doc
  // 2. Ensure master project has isMaster: true
  // 3. Create empty project for outlet store
  // 4. Link outlet project to master (creates snapshot + overrides)
  // 5. Update tenant storesList
  // 6. Return IDs for session update
}
```

### 5.4 Session Update for Multi-Store

When HQ admin creates an outlet, they need to:

1. Stay on their current master store session
2. Be able to switch to the outlet store to configure it

**Approach:** Add `stores[]` array to session with all accessible stores. Add store switcher dropdown in the app header that calls a session update endpoint to change `session.user.storeId`.

---

## 6. Implementation Plan (Phases)

### Phase 1: Data Foundation (Low Risk)

| Task                                                  | File                                                               | Change                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Set `isMaster: true` on first store during onboarding | `src/app/api/onboarding/create-subscription/route.ts`              | Add `isMaster: true` to store transaction                           |
| Add `isMaster` to storesList entries                  | Same file                                                          | Add to storesList entry                                             |
| Set `isMaster: true` on auto-created default project  | `src/database/projects/index.ts` → `getProjectsList()` auto-create | Set `isMaster: true` when creating default project for master store |

### Phase 2: Orchestration (Medium Risk)

| Task                                                   | File                                | Change                                       |
| ------------------------------------------------------ | ----------------------------------- | -------------------------------------------- |
| Create `addOutletToMaster()` orchestration function    | `src/database/multiOutlet/index.ts` | New function chaining store + project + link |
| Handle partial failure (store created but link failed) | Same file                           | Error handling + retry capability            |

### Phase 3: UI (High Effort)

| Task                                 | File                                                   | Change                        |
| ------------------------------------ | ------------------------------------------------------ | ----------------------------- |
| "Add Outlet" button on Projects page | `src/components/templates/main-app/projects/index.tsx` | Visible only for master store |
| Outlet creation modal/wizard         | New component                                          | Multi-step form               |
| Store switcher in app header         | Layout component                                       | Dropdown for HQ admin         |
| Session store switch endpoint        | `src/app/api/auth/`                                    | Update `session.user.storeId` |

### Phase 4: Polish

| Task                      | Description                                                |
| ------------------------- | ---------------------------------------------------------- |
| Outlet management list    | Show all linked outlets with status                        |
| Per-outlet QR/URL display | Each outlet gets its own menu URL                          |
| Outlet permissions setup  | Apply `StorePermissions` from multi-chain-permissions spec |

---

## 7. Questions for Product Owner

Before implementation, these decisions need to be made:

### Q1: Where should "Add Outlet" live in the UI?

**Option A:** Projects page — "Add Outlet" button next to "New Catalog"  
**Option B:** Business Settings — New "Outlets" tab  
**Option C:** Dedicated "Multi-Outlet Management" page (sidebar nav item)

**Cascade recommendation:** Option A (Projects page) for P0 since the outlet is fundamentally a linked project. Option C for P1 if chain management becomes a primary workflow.

### Q2: Should outlet creation be a single-step or multi-step wizard?

**Option A:** Single modal (name, city, contact — create immediately)  
**Option B:** Multi-step wizard (details → confirm master → configure permissions → done)

**Cascade recommendation:** Option A for P0. Keep it minimal per MenuList doctrine (Law 6: No Cognitive Load). Permissions can be configured after creation.

### Q3: How should store switching work?

**Option A:** Dropdown in header → page reload with new store context  
**Option B:** Full page navigation → "My Stores" list → click to switch  
**Option C:** No switching — HQ admin manages outlets from master store context only

**Cascade recommendation:** Option A. It's the industry standard (every multi-location SaaS uses header dropdown — TouchBistro, Square, Toast all do this). Reload is acceptable since store context affects everything.

### Q4: Should outlet staff user creation be part of this flow?

**Option A:** Yes — create a store manager user as part of outlet creation  
**Option B:** No — outlet creation is store + project + link only. User management is separate.

**Cascade recommendation:** Option B for P0. User management already exists in the Users section. Bundling it adds complexity. The HQ admin can add outlet staff separately after creation.

### Q5: Auto-create project vs manual?

When an outlet store is created, should a "Menu" project be auto-created and linked?

**Option A:** Yes — auto-create project + auto-link (zero-step for admin)  
**Option B:** No — admin must manually create project then link

**Cascade recommendation:** Option A. The entire point is reducing friction. The orchestration function should handle everything in one click.

---

## 8. Cost Analysis

### 8.1 Outlet Creation Cost (One-Time)

| Operation                                        | Firestore Cost         |
| ------------------------------------------------ | ---------------------- |
| Create store doc                                 | 1 write                |
| Sync store to storesSummary                      | 1 write                |
| Update tenant storesList                         | 1 write                |
| Create project doc                               | 1 write                |
| Sync project to projectsSummary                  | 1 write                |
| Set master isMaster (if first time)              | 1 write                |
| Link: set masterProjectId + overrides + snapshot | 1 write                |
| Read master project (for snapshot)               | 1 read                 |
| Read signal doc (for operationalVersion)         | 1 read                 |
| MOL log event                                    | 1 write                |
| **Total per outlet creation**                    | **8 writes + 2 reads** |

At Firestore pricing ($0.18/100K writes): Creating 10 outlets costs $0.000014. **Negligible.**

### 8.2 Ongoing Cost Per Outlet

| Operation                        | Frequency                 | Cost/Month    |
| -------------------------------- | ------------------------- | ------------- |
| onSnapshot listener (signal doc) | Continuous while tab open | 1 read/change |
| Master fetch on version change   | Per master edit           | 1 read/change |
| Snapshot write on acknowledge    | Per acknowledge           | 1 write       |
| MOL log on acknowledge           | Per acknowledge           | 1 write       |
| **Total per outlet/month**       | ~100 reads + ~10 writes   | $0.0002       |

---

## 9. Industry Research: Multi-Location Onboarding Patterns

### 9.1 How Competitors Handle This

| Platform        | Outlet Creation Pattern                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| **TouchBistro** | Centralized cloud dashboard. Admin creates locations from HQ view. Menu changes pushed to all locations instantly. |
| **Square**      | Header dropdown store switcher. "Add Location" button in settings. Each location inherits from a template.         |
| **Toast**       | Multi-location management hub. Create new location → assign menu template → customize per location.                |
| **CaterLord**   | Centralized POS dashboard. Menu/pricing changes pushed live across all outlets instantly.                          |

### 9.2 Common Patterns Across Industry

1. **One-click outlet creation** — Admin provides basic details, system handles the rest
2. **Menu inheritance is automatic** — New outlet gets master menu immediately, no manual sync
3. **Header store switcher** — Admin can switch between locations from any page
4. **Per-location customization** — Prices, availability, local specials can differ per outlet
5. **Centralized management view** — See all outlets at a glance from master context

**MenuList alignment:** Our read-time resolution architecture already delivers #2 and #4. We need to build #1, #3, and #5.

---

## 10. Existing DAL Functions Call Chain (For Reference)

### What Already Works End-to-End

```
Master edits menu → updateProject() → detectOperationalChange()
    ↓ (if operational change detected)
operationalVersion incremented (signal doc)
    ↓
Outlet's onSnapshot fires → useMasterUpdateAwareness hook
    ↓ (5s debounce)
Fetch master project → computeMasterUpdateDiff()
    ↓
Banner shown → "Master updated 3 items"
    ↓ (user clicks "Got it")
acknowledge() → createMasterSnapshot() → write to outlet project
    ↓
logMultiOutletEvent(MASTER_UPDATE_ACKNOWLEDGED)
    ↓
Banner hidden. Snapshot updated. Next change starts fresh.
```

**This entire chain works.** The only missing piece is the initial setup: making a store master and linking outlets to it.

---

**DOCUMENT STATUS:** Implemented source evidence - not current launch certification
**NEXT STEPS:** Current release approval follows the Launch Boundary above.
**ESTIMATED EFFORT:** Phase 1 (2 hours), Phase 2 (4 hours), Phase 3 (2-3 days), Phase 4 (1 day)
