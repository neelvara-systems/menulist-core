# Architecture Audit — Multi-Outlet Store Onboarding & Chain Permissions

**Date:** February 12, 2026  
**Auditor:** Cascade (Primary Master — Full Codebase Access)  
**Scope:** All decisions in `store-onboarding-flow_impl.md`, `store-onboarding-billing_impl.md`, `multi-chain-permissions_impl.md`  
**Methodology:** Independent fresh-eyes review — every decision re-evaluated as if designing from scratch  
**Codebase State:** Read all source files, types, DAL functions, providers, and existing implementations  
**Principle:** Performance, Firebase cost, scalability, and alignment with existing system > any ChatGPT suggestion

---

## 0. Executive Summary

**Overall verdict: The architecture is SOUND with 5 issues that MUST be fixed before implementation.**

The multi-outlet onboarding design is well thought out. Most decisions are correct. However, my independent review found:

- **1 CRITICAL BUG** — `linkStoreToMaster()` will fail during outlet creation (session context mismatch)
- **1 CRITICAL CONFLICT** — Two overlapping permission models that must be reconciled
- **3 IMPORTANT improvements** — Outlet subscription fallback optimization, lock atomicity, propagation scaling
- **4 MINOR suggestions** — Type gaps, documentation clarifications, future-proofing

None of these block Day 1 for 2-10 store chains. But the critical bug and permission conflict MUST be resolved before implementation starts.

---

## 1. CRITICAL: `linkStoreToMaster()` Session Context Bug

### The Problem

`linkStoreToMaster()` at `src/database/multiOutlet/index.ts:222` constructs the outlet project path using `session.sId`:

```typescript
// Line 261-264
const storeRef = doc(
  firebaseClient,
  `${COLLECTION}/${session.tId}/${session.sId}`, // ← Uses session's storeId
  storeProjectId,
);
```

During `addOutletToMaster()`, the **master user** is creating the outlet. Their session has `session.sId = masterStoreId`. But the outlet project lives at `projects/{tId}/{outletStoreId}/{projectId}`.

**Result:** The function will try to find the outlet project under the master store's collection. It won't find it. The link operation will fail silently or throw "Project not found."

### Why This Wasn't Caught

`linkStoreToMaster()` was designed for manual linking (user navigates to outlet, clicks "Link to Master"). In that context, `session.sId` IS the outlet's storeId. But `addOutletToMaster()` calls it from the master's context.

### My Fix

Create a server-side variant that accepts explicit parameters:

```typescript
// NEW: Server-side linking (used by addOutletToMaster)
export async function linkOutletProjectToMaster(
  tId: number,
  outletStoreId: number,
  outletProjectId: string,
  masterProjectId: string,
  userId: string,
): Promise<void> {
  // Uses explicit outletStoreId instead of session.sId
  const outletRef = doc(
    firebaseClient,
    `${COLLECTION}/${tId}/${outletStoreId}`,
    outletProjectId,
  );
  // ... same linking logic but with explicit paths
}
```

Keep the existing `linkStoreToMaster()` for future manual linking UI. The new function is called by the server-side outlet creation endpoint.

**Severity:** CRITICAL — Will cause 100% failure of outlet creation if not fixed.  
**Fix complexity:** LOW — Extract linking logic into parameterized function.

---

## 2. CRITICAL: Conflicting Permission Models

### The Problem

Two separate documents define overlapping permission systems:

**`multi-chain-permissions_impl.md` defines (AND already coded at `src/types/multiOutlet.types.ts:142-163`):**

```typescript
interface StorePermissions {
  canUseMenuExtraction: boolean; // AI cost gate
  canGenerateDescriptions: boolean; // AI cost gate
  canGenerateImages: boolean; // AI cost gate
  canOverrideTheme: boolean; // Brand gate
  canOverrideBrandIdentity: boolean; // Brand gate
  canOverrideLayout: boolean; // Brand gate
  canAddLocalCategories: boolean; // Structure gate
}
// Already exists with DEFAULT_STORE_PERMISSIONS (conservative defaults)
// Stored on: each outlet store doc (stores/{sId}.permissions)
// Roles: HQ_ADMIN, STORE_MANAGER (new role types — NOT coded, only in docs)
```

**`store-onboarding-flow_impl.md` defines:**

```typescript
interface OutletCapabilities {
  priceOverride: boolean;
  availabilityOverride: boolean;
  descriptionOverride: boolean;
  imageOverride: boolean;
  allowLocalItems: boolean;
  allowLocalCategories: boolean; // ← OVERLAP
  allowLocalProjects: boolean;
  allowProjectDeactivate: boolean;
}
// Stored on: master store doc only (one policy for chain)
// Roles: uses existing owner/manager/staff
```

### Conflicts

| Issue                 | multi-chain-permissions                     | store-onboarding-flow              |
| --------------------- | ------------------------------------------- | ---------------------------------- |
| **Storage location**  | Per-outlet store doc                        | Master store doc (global)          |
| **Scope**             | Per-outlet customization                    | One policy for all outlets         |
| **Overlapping field** | `canAddLocalCategories`                     | `allowLocalCategories`             |
| **Role system**       | New `HQ_ADMIN`/`STORE_MANAGER`              | Existing `owner`/`manager`/`staff` |
| **Enforcement**       | New `checkAccess()` + `usePermissions` hook | Existing `RolePermissions` system  |

### Why This Matters

- Two sources of truth for "what can an outlet do"
- Two role systems (`HQ_ADMIN`/`STORE_MANAGER` vs `owner`/`manager`/`staff`)
- Two enforcement paths (`checkAccess()` vs existing permission checks)
- Confusing for implementation — which system do we use?

### My Recommendation: Merge Into ONE System

**Use the existing role/permission system.** Do NOT create `HQ_ADMIN`/`STORE_MANAGER` as separate role types. Instead:

1. **Existing `owner` role** = HQ_ADMIN equivalent (already has all permissions)
2. **Existing `manager` role** = STORE_MANAGER equivalent (already has limited permissions)
3. **Existing `staff` role** = Store staff (already exists with minimal permissions)

**Merge the two interfaces into ONE:**

```typescript
interface OutletPolicy {
  // Data-level overrides (from OutletCapabilities)
  priceOverride: boolean;
  availabilityOverride: boolean;
  descriptionOverride: boolean;
  imageOverride: boolean;
  allowLocalItems: boolean;
  allowLocalCategories: boolean;
  allowLocalProjects: boolean;
  allowProjectDeactivate: boolean;

  // Feature-level gates (from StorePermissions)
  canUseMenuExtraction: boolean;
  canGenerateDescriptions: boolean;
  canGenerateImages: boolean;
  canOverrideTheme: boolean;
  canOverrideBrandIdentity: boolean;
  canOverrideLayout: boolean;
}
```

**Store on:** Master store doc ONLY (`stores/{masterStoreId}.outletPolicy`)  
**Scope:** ONE policy for ALL outlets in the chain  
**Enforcement:** Extend existing `isOverridableItemField()` and permission checks  
**No new role types, no new permission hooks, no new `checkAccess()` function needed.**

The existing `RolePermissions` at `src/types/platform/roles.ts:55` already has 22+ permission keys including `canUseAIExtraction`, `canUseAIDescriptions`, `canUseAIImages`, `canAccessBilling`, etc. These cover all the gates that `multi-chain-permissions` was trying to add.

**Severity:** CRITICAL — Must be reconciled before implementation to avoid building two parallel systems.  
**Fix complexity:** MEDIUM — Update docs to merge interfaces, remove `multi-chain-permissions` parallel system.

---

## 3. Decision-by-Decision Audit

### 3.1 Decisions I FULLY AGREE With (If Designing From Scratch)

| Decision                                                          | Why It's Correct                                                                              | Firebase Impact                    |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Derive chain status, don't store it** (`storesList.length > 1`) | Zero sync burden. Eliminates `chainMode` field. One source of truth.                          | Saves 1 write per chain activation |
| **Master authority on project doc, not tenant**                   | Tenant can have multiple master projects. Correct data model.                                 | No impact                          |
| **First store = default master (implicit)**                       | Zero cognitive load. User never sees infrastructure.                                          | 1 extra field on store creation    |
| **One master store per chain, permanent**                         | Eliminates complex migration paths. Locked by `ENABLE_CHANGE_MASTER_STORE: false`.            | No impact                          |
| **Read-time resolution** (`resolveProjectForRender()`)            | Brilliant. Avoids write amplification. 200 outlets × master edit = 0 writes (instead of 200). | Saves massive writes               |
| **Signal doc + operationalVersion**                               | Tiny doc, debounced listeners. Excellent for scale.                                           | 1 write per master edit            |
| **Billing-first orchestration**                                   | Prevents unpaid outlets. Clean failure handling.                                              | No impact                          |
| **No mid-cycle refund on outlet removal**                         | Industry standard. Prevents abuse. Simplifies billing.                                        | No impact                          |
| **`quantity` on subscription, not separate outlet subscriptions** | One subscription doc vs N. Massive Firebase savings.                                          | Saves N-1 subscription docs        |
| **Flat hierarchy** (no regional grouping)                         | Right for SMB. Eliminates tree traversal complexity.                                          | No impact                          |
| **No deep audit history**                                         | Prevents document size bloat. MOL logs cover debugging.                                       | Saves significant storage          |
| **Owner-controlled billing**                                      | No auto-deactivation edge cases. Clean model.                                                 | No impact                          |
| **`scheduledForBillingRemoval` pattern**                          | Clean next-cycle reduction. Reactivation window. No Razorpay mid-cycle hackery.               | 2 fields on store doc              |
| **`provisioning` status for partial failures**                    | Pragmatic. Better than complex rollback for Firestore.                                        | No impact                          |
| **Auto-propagation on master project creation**                   | Essential for consistency. No manual step = no forgotten outlets.                             | N writes per new project           |
| **`isMasterUser` derived, not stored**                            | Avoids sync issues. Computed from existing data.                                              | Saves 1 field + sync logic         |

### 3.2 Decisions I PARTIALLY AGREE With (Need Refinement)

#### 3.2a `outletCreationLock` — Race Condition Risk

**Current design:** Read tenant → check lock → set lock → do work → clear lock.

**Problem:** Steps 1-3 are non-atomic. Two concurrent requests could both pass the check.

**My refinement:** Use a Firestore transaction for lock acquisition:

```typescript
// In the API route (server-side, Admin SDK)
await adminDb.runTransaction(async (t) => {
  const tenantRef = adminDb.doc(`tenants/${tenantId}`);
  const tenantDoc = await t.get(tenantRef);
  const data = tenantDoc.data();

  if (data.outletCreationLock) {
    const lockAge = Date.now() - data.outletCreationLockAt?.toMillis();
    if (lockAge < 300000) throw new Error("Locked");
  }
  t.update(tenantRef, {
    outletCreationLock: true,
    outletCreationLockAt: admin.firestore.Timestamp.now(),
  });
});
```

**Impact:** LOW — For 2-10 store SMB chains, race conditions are nearly impossible. But this is an architecture doc, so let's get it right.

#### 3.2b Outlet Subscription Fallback — Unnecessary Extra Read

**Current design:** `getActiveSubscriptionForStore()` → miss for outlet → `getMasterStoreIdForTenant()` → reads tenant doc AGAIN → fetches master subscription.

**Problem:** SessionProvider already loads the tenant doc at `src/providers/sessionProvider.tsx:91`. The fallback re-reads the same document.

**My refinement:** Pass `tenantDetails` (already in context) to avoid the extra read:

```typescript
export const getActiveSubscriptionForStore = async (
  tenantId: number,
  storeId: number,
  tenantStoresList?: MinimalStoreDataType[], // Pass if available
): Promise<FirestoreSubscriptionDoc | null> => {
  const raw = await fetchSubscriptionRaw(tenantId, storeId);
  if (raw) return await expireIfGracePeriodEnded(raw);

  if (FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
    // Use passed storesList to avoid extra read
    const masterStoreId = tenantStoresList
      ? tenantStoresList.find((s) => (s as any).isMaster)?.storeId
      : await getMasterStoreIdForTenant(tenantId); // fallback
    if (masterStoreId && masterStoreId !== storeId) {
      const masterSub = await fetchSubscriptionRaw(tenantId, masterStoreId);
      if (masterSub) return await expireIfGracePeriodEnded(masterSub);
    }
  }
  return null;
};
```

**Impact:** Saves 1 Firestore read per session init for every outlet user. At 200 outlet users × 10 sessions/day = 2,000 saved reads/day = ~$0.001/day. Small individually, but correct practice.

#### 3.2c Project Propagation — Synchronous at Scale

**Current design:** When master creates a new project, `addProject()` hook synchronously creates + links project in ALL outlets inline.

**Problem:** At 200 outlets with 3 operations each = 600 Firestore operations inline. Takes 10-30 seconds. Risks API timeout.

**My refinement:**

- **Day 1 (2-10 outlets):** Synchronous inline is fine. Fast enough (<1s).
- **Scale path (10+ outlets):** Add feature flag `ENABLE_ASYNC_PROPAGATION`. When enabled, `addProject()` writes a `pendingPropagation` doc. A Cloud Function picks it up and processes outlets asynchronously.

```
// Day 1: Inline (2-10 outlets)
if (!FEATURE_FLAGS.ENABLE_ASYNC_PROPAGATION || outletCount <= 10) {
    // Inline propagation
    for (const outlet of outlets) {
        await createAndLinkOutletProject(outlet, masterProject);
    }
} else {
    // Async: Write propagation job, Cloud Function handles it
    await createPropagationJob(masterProjectId, outlets);
}
```

**Impact:** Non-blocking for Day 1. Architecture-ready for scale.

### 3.3 Decisions I DISAGREE With

#### 3.3a `MinimalStoreDataType` Missing `isMaster` Field

**Current type:**

```typescript
export type MinimalStoreDataType = Pick<
  StoreDataType,
  "name" | "storeKey" | "storeId"
> & {
  storeDetails?: StoreDataType;
};
```

**Problem:** `canHaveLinkedOutlets()` checks `storesList.some(s => s.isMaster === true)`, but `MinimalStoreDataType` doesn't declare `isMaster`. This works at runtime (Firestore doesn't enforce types) but is a TypeScript gap.

**My fix:** Add `isMaster` to the type:

```typescript
export type MinimalStoreDataType = Pick<
  StoreDataType,
  "name" | "storeKey" | "storeId"
> & {
  isMaster?: boolean;
  storeDetails?: StoreDataType;
};
```

**Impact:** Type safety. No runtime cost.

#### 3.3b `TenantDataType` Missing `outletCreationLock` Fields

**Current type at `src/types/platform/tenant.ts`** doesn't include `outletCreationLock` or `outletCreationLockAt`. The billing impl doc §5 describes these as required for the lock mechanism, but neither field is declared in the type.

**My fix:** Add to `TenantDataType`:

```typescript
outletCreationLock?: boolean;
outletCreationLockAt?: Timestamp;
```

**Impact:** Type safety. Required before implementing the outlet creation lock.

#### 3.3c `FirestoreSubscriptionDoc` Missing `quantity` Field

**Current type at `src/types/razorpay.ts:47-110`** doesn't include `quantity`. Both subscription creation routes pass `quantity: 1` to Razorpay but don't store it in Firestore.

**My fix:** Add to `FirestoreSubscriptionDoc`:

```typescript
quantity?: number; // Number of billable stores. Default: 1. Master + outlets.
```

**Impact:** Type safety. Enables reconciliation. Already planned (BT1) but the type gap exists NOW. Note: `quantity: 1` IS passed to Razorpay at `src/app/api/onboarding/create-subscription/route.ts:244` but never stored in the Firestore document.

---

## 4. Firebase Cost Deep Analysis

### 4.1 One-Time: Outlet Creation

| Operation                                    | Reads   | Writes   | Cost         |
| -------------------------------------------- | ------- | -------- | ------------ |
| Validate master store                        | 1       | 0        | —            |
| Check subscription                           | 1       | 0        | —            |
| Check/set lock (tenant)                      | 1       | 1        | —            |
| Update Razorpay quantity                     | 0       | 0        | 1 API call   |
| Update Firestore subscription                | 0       | 1        | —            |
| Create outlet store doc                      | 0       | 1        | —            |
| Sync to storesSummary                        | 0       | 1        | —            |
| Update tenant storesList                     | 0       | 1        | —            |
| Per master project: create + link + snapshot | N       | N        | —            |
| Release lock                                 | 0       | 1        | —            |
| MOL event log                                | 0       | 1        | —            |
| **Total (N master projects)**                | **3+N** | **7+2N** | **~$0.0002** |

Typical (1 project): 4 reads + 9 writes = **$0.00002**. Negligible.

### 4.2 Ongoing: Per Outlet Per Month (Active Use)

| Operation                                    | Reads/mo                     | Writes/mo | Cost/mo      |
| -------------------------------------------- | ---------------------------- | --------- | ------------ |
| Session init (tenant + store + subscription) | 90 (3/session × 30 sessions) | 0         | $0.00005     |
| Project resolution (master cached 30s)       | 60                           | 0         | $0.00004     |
| Signal doc listener                          | ~30 snapshots                | 0         | $0.00002     |
| Editor operations (overrides)                | ~50                          | ~20       | $0.00005     |
| **Total per outlet**                         | **~230**                     | **~20**   | **~$0.0002** |

At 200 outlets: **~$0.04/month**. Negligible.

### 4.3 Document Size Analysis

| Document                                  | Current Size | After Multi-Outlet | Concern?          |
| ----------------------------------------- | ------------ | ------------------ | ----------------- |
| Tenant doc (200 outlets in storesList)    | ~2KB         | ~12KB              | ✅ No (limit 1MB) |
| Store doc (master, with outletPolicy)     | ~3KB         | ~3.5KB             | ✅ No             |
| Store doc (outlet, with overrides fields) | ~3KB         | ~3.2KB             | ✅ No             |
| Subscription doc (with quantity)          | ~2KB         | ~2.1KB             | ✅ No             |
| Project doc (outlet, with snapshot)       | ~50-200KB    | +5-20KB            | ✅ No             |
| storesSummary (200 entries)               | ~5KB         | ~15KB              | ✅ No             |
| Signal doc (operationalVersion)           | ~0.1KB       | ~0.1KB             | ✅ No             |

**No document size concerns at 200 outlets.**

### 4.4 Query Pattern Analysis

| Query                                        | Index Needed?       | Cost       | Frequency                    |
| -------------------------------------------- | ------------------- | ---------- | ---------------------------- |
| `fetchSubscriptionRaw(tenantId, storeId)`    | Existing composite  | 1 read     | Per session                  |
| Outlet fallback (master subscription lookup) | Same index          | 1-2 reads  | Per outlet session           |
| `getLinkedStores(masterProjectId)`           | None (scans stores) | N reads    | Rare (propagation only)      |
| Signal doc listener                          | None (single doc)   | 1 snapshot | Continuous                   |
| `canHaveLinkedOutlets()`                     | None (in-memory)    | 0 reads    | Per page load (from context) |

**No new indexes needed.** All queries use existing patterns.

---

## 5. Performance & Scalability Analysis

### 5.1 Scalability Matrix

| Metric                     | 2-10 Outlets | 50 Outlets | 200 Outlets | Concern                                |
| -------------------------- | ------------ | ---------- | ----------- | -------------------------------------- |
| Outlet creation time       | <1s          | <1s        | <1s         | ✅ None                                |
| Master project propagation | <1s          | ~5s        | ~20s        | ⚠️ Needs async at 50+                  |
| Tenant doc load time       | <50ms        | <50ms      | <100ms      | ✅ None                                |
| storesSummary load         | <50ms        | <50ms      | <100ms      | ✅ None                                |
| Signal doc listeners       | Trivial      | Trivial    | Trivial     | ✅ Firestore handles millions          |
| Store switcher dropdown    | <10 items    | <50 items  | 200 items   | ⚠️ Needs search/pagination at 50+      |
| Chain Control Panel list   | <10 rows     | <50 rows   | 200 rows    | ⚠️ Needs pagination at 20+             |
| `getLinkedStores()` scan   | <100ms       | ~500ms     | ~2s         | ⚠️ Rare, but optimize if frequent      |
| Reconciliation job         | <1s          | ~5s        | ~20s        | ✅ Background job, time doesn't matter |

### 5.2 The 200-Outlet Reality Check

The docs claim "200+ outlets from Day 1." But the ICP is "Premium SMB Groups (2-10 stores)." Let's be honest:

- **Day 1 customers:** 2-10 outlets. All designs work perfectly.
- **Growth customers:** 10-50 outlets. Minor UX issues (pagination needed).
- **Enterprise customers:** 50-200 outlets. Async propagation needed. UI pagination needed.

**My verdict:** Design for 2-10 (Day 1 reality), ensure no blockers for 50, document scaling path for 200+. Don't over-engineer for 200 outlets that may never happen for SMB chains.

---

## 6. Security Analysis

| Concern               | Status              | Notes                                                        |
| --------------------- | ------------------- | ------------------------------------------------------------ |
| Cross-tenant access   | ✅ Covered          | `linkStoreToMaster()` validates `tId === session.tId`        |
| Outlet impersonation  | ✅ Covered          | Master user validated via `user.stores[]` + owner role check |
| Billing bypass        | ✅ Covered          | Server-side `quantity <= activeStores` guard                 |
| Rate limiting         | ✅ Covered          | `DATA_WRITE` config on outlet creation endpoint              |
| Input validation      | ✅ Covered          | Zod schema for outlet creation                               |
| Lock bypass           | ⚠️ Race condition   | See §3.2a — use transaction for atomic lock                  |
| Permission escalation | ⚠️ Dual system risk | See §2 — reconcile permission models                         |

---

## 7. Recommendations Summary

### MUST FIX Before Implementation

| #   | Issue                                     | Severity     | Effort                     | Section |
| --- | ----------------------------------------- | ------------ | -------------------------- | ------- |
| 1   | `linkStoreToMaster()` session context bug | **CRITICAL** | Low (1-2 hours)            | §1      |
| 2   | Reconcile dual permission models          | **CRITICAL** | Medium (doc update, 1 day) | §2      |

### SHOULD FIX Before Implementation

| #   | Issue                                                | Severity      | Effort            | Section |
| --- | ---------------------------------------------------- | ------------- | ----------------- | ------- |
| 3   | Outlet subscription fallback — pass tenantStoresList | **IMPORTANT** | Low (30 min)      | §3.2b   |
| 4   | Lock atomicity — use Firestore transaction           | **IMPORTANT** | Low (1 hour)      | §3.2a   |
| 5   | Add `isMaster` to `MinimalStoreDataType`             | **IMPORTANT** | Trivial (1 line)  | §3.3a   |
| 5b  | Add `outletCreationLock` fields to `TenantDataType`  | **IMPORTANT** | Trivial (2 lines) | §3.3b   |

### SHOULD PLAN For Scale

| #   | Issue                                          | Severity   | Effort | Section |
| --- | ---------------------------------------------- | ---------- | ------ | ------- |
| 6   | Async propagation for 50+ outlets              | **FUTURE** | Medium | §3.2c   |
| 7   | Store switcher pagination for 50+ stores       | **FUTURE** | Low    | §5.1    |
| 8   | Chain Control Panel pagination for 20+ outlets | **FUTURE** | Low    | §5.1    |

---

## 8. What I Would Do Differently (Fresh Design)

If I were designing this from absolute scratch, knowing what I know about the codebase:

### 8.1 Same Decisions (I wouldn't change)

1. Read-time resolution (no write amplification) — **perfect**
2. Signal doc pattern — **perfect**
3. Billing-first orchestration — **correct**
4. Flat hierarchy — **correct for SMB**
5. One subscription with quantity — **correct**
6. `isMaster` on store doc — **correct**
7. Derived chain status — **correct**
8. No audit history — **correct**
9. `provisioning` status for partial failures — **pragmatic**
10. Next-cycle billing reduction — **industry standard**

### 8.2 Different Decisions

#### 8.2a Single Permission Interface (not two)

I would define ONE `OutletPolicy` interface from the start (see §2), stored on master store doc, combining data-level and feature-level gates. No parallel permission system.

#### 8.2b `addOutletToMaster()` as Admin SDK Function

I would build the outlet creation flow entirely on the Admin SDK (server-side API route), not using client-side DAL functions. Reasons:

- Avoids session context issues (§1)
- Enables atomic transactions for lock
- Can use batch writes for project propagation
- Better error handling and logging

The existing client-side DAL functions (`linkStoreToMaster`, `setProjectAsMaster`) stay for manual UI operations. The creation flow uses dedicated server-side logic.

#### 8.2c `masterStoreId` on Tenant (Not Each Store)

The docs reject `masterStoreId` on store docs as redundant. I agree. But I would add ONE field:

```typescript
// On tenant doc (not store doc)
masterStoreId?: number;
```

Why: `tenant.storesList.find(s => s.isMaster)` requires loading the full storesList array and scanning it. A direct `tenant.masterStoreId` is O(1). At 200 outlets, scanning 200 entries on every permission check is wasteful.

**Cost:** 1 extra field on tenant doc. Set once during onboarding. Never changes (master is permanent). No sync burden (it's the single source).

This is different from putting `masterStoreId` on EVERY store doc (which I agree is redundant). It's ONE field on ONE doc.

#### 8.2d Capability Check Caching

I would add a 60-second in-memory cache for `outletPolicy` in the SessionProvider, similar to the master project cache pattern already used in `resolveProject.ts`. This avoids re-fetching the master store doc every time a permission check runs.

```typescript
// In SessionProvider or a dedicated context
const [outletPolicy, setOutletPolicy] = useState<OutletPolicy | null>(null);

// Fetch once on session init, cache for 60s
useEffect(() => {
  if (storeDetails && !storeDetails.isMaster && tenantDetails) {
    const masterStoreId = tenantDetails.masterStoreId;
    if (masterStoreId) {
      getStoreById(masterStoreId).then((masterStore) => {
        setOutletPolicy(masterStore.outletPolicy || DEFAULT_OUTLET_POLICY);
      });
    }
  }
}, [storeDetails]);
```

**Cost:** 1 extra Firestore read per outlet session init. Cached for entire session.

---

## 9. Alignment Check — Existing System Compatibility

| Existing System                           | Multi-Outlet Impact                                  | Compatible?          |
| ----------------------------------------- | ---------------------------------------------------- | -------------------- |
| `SessionProvider`                         | Add `isMasterUser` derivation + `activeStoreContext` | ✅ Additive          |
| `PlatformGlobalDataProvider`              | No changes needed                                    | ✅ No impact         |
| `RolePermissions` system                  | Reuse as-is for multi-outlet roles                   | ✅ No changes        |
| `DB_COLLECTIONS` constants                | No new collections needed                            | ✅ No changes        |
| `apiCallComposer` / `requestBodyComposer` | Used by all new DAL functions                        | ✅ Standard pattern  |
| Razorpay webhook handler                  | Add `quantity` sync to existing handlers             | ✅ Additive (1 line) |
| Reconciliation job                        | Add quantity mismatch check                          | ✅ Additive          |
| `addStore()` DAL                          | Called by `addOutletToMaster()`                      | ✅ No changes needed |
| `addProject()` DAL                        | Add propagation hook (feature-flagged)               | ⚠️ Modification      |
| `deleteProject()` DAL                     | Add inherited project guard                          | ⚠️ Modification      |
| Editor components                         | Thread `outletPolicy` for field locking              | ⚠️ Modification      |
| Sidebar navigation                        | Add conditional "Locations" item                     | ⚠️ Modification      |

**All modifications are additive and feature-flagged.** No breaking changes to existing functionality.

---

## 10. Final Verdict

### Architecture Quality Score: 8.5/10

**Strengths:**

- Read-time resolution is architecturally excellent (avoids write amplification)
- Signal doc pattern scales beautifully
- Billing-first orchestration prevents data inconsistency
- Feature flags allow incremental rollout
- Cost analysis is thorough and accurate

**Weaknesses:**

- `linkStoreToMaster()` session bug would have caused day-1 failure
- Dual permission system creates confusion and tech debt
- Lock mechanism has theoretical race condition
- Subscription fallback does unnecessary Firestore read

### Ready for Implementation?

**After fixing items 1-5 from §7: YES.**

The architecture is fundamentally sound. The fixes are surgical, not structural. The core design patterns (read-time resolution, signal doc, billing-first) are the RIGHT choices for Firebase + Firestore.

---

---

## Appendix: Self-Verification Pass

**Date:** February 12, 2026  
**Method:** Re-read every referenced source file and line number against audit claims.

| Finding                          | Verified Against                                                                 | Result                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| §1 `session.sId` bug             | `multiOutlet/index.ts:261-264`                                                   | ✅ CONFIRMED — `session.sId` hardcoded in path                                   |
| §2 Permission overlap            | `multiOutlet.types.ts:142-163` + `roles.ts:10-49` + `defaultRoles.ts`            | ✅ CONFIRMED — `StorePermissions` already coded, overlaps with `RolePermissions` |
| §2 Redundant roles               | `defaultRoles.ts:20-24` (owner/manager/staff)                                    | ✅ CONFIRMED — `HQ_ADMIN`/`STORE_MANAGER` not needed                             |
| §3.2a Lock atomicity             | `tenant.ts:1-50`                                                                 | ✅ CONFIRMED — `outletCreationLock` not even in type yet                         |
| §3.2b Subscription fallback      | `subscriptions/index.ts:105-114`                                                 | ✅ CONFIRMED — no multi-outlet fallback exists yet; planned                      |
| §3.3a `MinimalStoreDataType` gap | `store.ts:223-230`                                                               | ✅ CONFIRMED — only picks `name \| storeKey \| storeId`                          |
| §3.3b `TenantDataType` lock gap  | `tenant.ts:1-50`                                                                 | ✅ CONFIRMED — fields not declared (NEW finding)                                 |
| §3.3c `quantity` gap             | `razorpay.ts:47-110` vs `create-subscription/route.ts:244`                       | ✅ CONFIRMED — passed to Razorpay, not stored in type                            |
| §4 Cost numbers                  | Firestore pricing ($0.06/100K reads, $0.18/100K writes)                          | ✅ CONFIRMED — math checks out                                                   |
| §5 Scalability claims            | Signal doc: `DB_COLLECTIONS.MASTER_OPERATIONAL_STATE` exists at `database.ts:85` | ✅ CONFIRMED                                                                     |
| §8.2c `masterStoreId` on tenant  | `tenant.ts:1-50`                                                                 | ✅ CONFIRMED — field doesn't exist, recommendation valid                         |

**Missed in original audit (now added):**

- `outletCreationLock`/`outletCreationLockAt` type gap on `TenantDataType` (§3.3b)
- `StorePermissions` already coded in `multiOutlet.types.ts` (updated §2 note)
- `quantity: 1` passed to Razorpay but not persisted (updated §3.3c note)

**Verification verdict:** All original findings CONFIRMED CORRECT. Three minor additions made. No findings were incorrect or misaligned with the codebase.

---

**AUDIT STATUS:** COMPLETE (VERIFIED)  
**NEXT STEPS:**

1. Fix `linkStoreToMaster()` session context issue (§1) — update flow doc
2. Reconcile permission models (§2) — update both docs
3. Apply SHOULD-FIX items (§7 items 3-5b) — update docs
4. Then proceed to implementation: BT1-BT15 (billing) → T1-T25 (internal)
