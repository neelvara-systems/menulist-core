# 📝 DOC FEEDBACK AUDIT — Multi-Outlet Brand Consistency

**Feature:** #4 — Multi-Outlet Brand Consistency  
**Document Type:** ChatGPT Feedback Audit (DOCS ONLY)  
**Status:** In Progress  
**Date:** January 19, 2026  
**Mode:** Documentation updates only — NO CODE CHANGES

---

## Summary

| Metric                    | Count |
| ------------------------- | ----- |
| **Total Feedback Points** | 78    |
| **Accepted (✅)**         | 52    |
| **Rejected (❌)**         | 12    |
| **Partial/Clarify (⚠️)**  | 14    |

---

## SECTION A: Architectural Landmines (Critical Fixes)

### A1. LANDMINE #1: `getProjectData(masterProjectId)` is NOT SAFE

| Aspect                | Detail                                                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **ChatGPT Claim**     | `getProjectData()` parses projectId to get `sId`, but masterRef only stores `masterProjectId` — no guaranteed way to find master across stores |
| **Valid?**            | ✅ **VALID**                                                                                                                                   |
| **Codebase Evidence** | `src/app/_client/[[...slug]]/page.tsx:60-65` confirms `getProjectData` uses `projectId.split("-")` to extract tId and sId                      |
| **Action**            | Update impl.md: Add `masterStoreId` to `masterRef` interface                                                                                   |
| **Target Doc**        | multi-outlet-consistency_impl.md §3.1                                                                                                          |

### A2. LANDMINE #2: `getLinkedOutlets()` query is WRONG

| Aspect                | Detail                                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **ChatGPT Claim**     | Query `collection(firebaseClient, COLLECTION, String(session.tId))` won't work because `projects/{tId}` is collection of stores, not projects |
| **Valid?**            | ✅ **VALID**                                                                                                                                  |
| **Codebase Evidence** | `src/database/projects/index.ts` shows structure is `projects/{tId}/{sId}/{projectId}`                                                        |
| **Fix Options**       | 1) Use `collectionGroup("projects")` OR 2) Maintain index document                                                                            |
| **Action**            | Update impl.md: Fix DAL query to use collectionGroup or index approach                                                                        |
| **Target Doc**        | multi-outlet-consistency_impl.md §7.1                                                                                                         |

### A3. Missing Role Enforcement

| Aspect                | Detail                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| **ChatGPT Claim**     | Spec says HQ Admin can edit master, outlet manager cannot — but impl only says "Add role check later" |
| **Valid?**            | ✅ **VALID**                                                                                          |
| **Codebase Evidence** | Current impl.md security checklist has `☐ Role check for master edit` as TODO                         |
| **Action**            | Update impl.md: Add concrete role check implementation                                                |
| **Target Doc**        | multi-outlet-consistency_impl.md §10 Security Checklist                                               |

### A4. HQ Store Definition Missing

| Aspect            | Detail                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| **ChatGPT Claim** | Doc suggests `projects/{tId}/{hqStoreId}/{masterProjectId}` but doesn't define what hqStoreId means  |
| **Valid?**        | ⚠️ **PARTIAL**                                                                                       |
| **Our Approach**  | In our codebase, any store can create a master. We don't require a designated "HQ store"             |
| **Action**        | Clarify in impl.md that master can be created in any store, but masterRef must include masterStoreId |
| **Target Doc**    | multi-outlet-consistency_impl.md §4.2                                                                |

### A5. Resolver `reconstructFiles()` Oversimplified

| Aspect                | Detail                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| **ChatGPT Claim**     | Current code only uses `outlet.files[0]`, may lose languages, metadata, ordering                |
| **Valid?**            | ✅ **VALID**                                                                                    |
| **Codebase Evidence** | `src/components/templates/main-app/projects/types/project.types.ts` shows files can be multiple |
| **Action**            | Update impl.md: Either enforce single-file for master-linked OR preserve all files structure    |
| **Target Doc**        | multi-outlet-consistency_impl.md §6.1                                                           |

---

## SECTION B: Override Resolution Contract (40 Use Cases)

### B1. Cases 1-10 Resolution Rules

| #   | Use Case                                             | ChatGPT Resolution                                 | Valid? | Action                      |
| --- | ---------------------------------------------------- | -------------------------------------------------- | ------ | --------------------------- |
| 1   | Master updates price, outlet has override            | Outlet override wins until explicitly reset        | ✅     | Add to spec FR-5            |
| 2   | Master updates price, outlet has no override         | Outlet reflects new master price instantly         | ✅     | Already in spec             |
| 3   | Outlet overrides price temporarily                   | Override persists until manually reset             | ✅     | Add reset mechanism to spec |
| 4   | Outlet marks item unavailable (sold out)             | Store in `overrides.items[id].available = false`   | ✅     | Already in impl             |
| 5   | Outlet permanently stops selling item                | Store in `overrides.items[id].active = false`      | ✅     | Add distinction to spec     |
| 6   | Master removes item, outlet still sells locally      | Master deletion wins — item disappears everywhere  | ✅     | Add to spec FR-4            |
| 7   | Master renames item, outlet has price override       | Outlet sees new name, override still applies       | ✅     | Add to spec FR-6            |
| 8   | Master changes category structure                    | Outlets follow master category assignment          | ✅     | Add to spec FR-6            |
| 9   | Outlet adds local item resembling master item        | Local items use `L_` prefix to prevent collision   | ✅     | Add to impl §7              |
| 10  | Outlet creates local category, master adds same name | Category collision handled by ID — names can match | ⚠️     | Clarify in spec             |

### B2. Cases 11-20 Resolution Rules

| #   | Use Case                                   | ChatGPT Resolution                               | Valid? | Action                         |
| --- | ------------------------------------------ | ------------------------------------------------ | ------ | ------------------------------ |
| 11  | Outlet unlinks from master                 | ❌ BLOCKED — Chain must always have master       | ✅     | Add to spec as constraint      |
| 12  | Outlet links after having own menu         | Existing outlet items become local-only          | ⚠️     | Add collision handling to impl |
| 13  | Master deleted while outlets linked        | Block deletion OR auto-unlink                    | ✅     | Already in spec Open Questions |
| 14  | Master item ID regenerated                 | **CRITICAL** — Overrides become orphaned         | ✅     | Add ID stability rule to impl  |
| 15  | Outlet overrides item master later removes | Override ignored, item disappears                | ✅     | Add orphan handling to impl    |
| 16  | Master adds item outlet can't sell         | Outlet can immediately override `active: false`  | ✅     | Already covered                |
| 17  | Master changes tax/service note            | Outlet project config inherits OR overrides      | ⚠️     | Out of P0 scope                |
| 18  | Multi-language mismatch                    | Outlet inherits all languages from master        | ⚠️     | Out of P0 scope                |
| 19  | Outlet manager edits locked fields         | Server-side rejection required                   | ✅     | Add to impl security           |
| 20  | Category ordering conflict                 | Master adds → outlet orderIndex override adjusts | ✅     | Already in impl                |

### B3. Cases 21-30 Resolution Rules

| #   | Use Case                                        | ChatGPT Resolution                      | Valid? | Action                  |
| --- | ----------------------------------------------- | --------------------------------------- | ------ | ----------------------- |
| 21  | Outlet has Lunch+Dinner, master only for Dinner | Each project links independently        | ✅     | Already in impl         |
| 22  | Multiple masters (Lunch master + Dinner master) | Each outlet project links to ONE master | ✅     | Already in spec         |
| 23  | Outlet switches from Master A to Master B       | Overrides cleared, fresh inheritance    | ✅     | Add to impl             |
| 24  | Outlet local item, master later adds same item  | ID collision prevented by `L_` prefix   | ✅     | Already in impl         |
| 25  | Outlet hides master item, master updates it     | Override persists — item stays hidden   | ✅     | Add to spec             |
| 26  | Master changes price format                     | Override comparison is string-based     | ⚠️     | Note limitation in impl |
| 27  | Outlet orders categories, master adds new ones  | New categories appear at end by default | ✅     | Add to impl             |
| 28  | Outlet overrides availability, master activates | Outlet override wins                    | ✅     | Already covered         |
| 29  | Outlet deletes local item with QR references    | Safe fallback (item not found)          | ⚠️     | Out of P0 scope         |
| 30  | Master updated twice quickly                    | Last-write-wins, override stable        | ✅     | Already covered         |

### B4. Cases 31-40 Resolution Rules

| #   | Use Case                                  | ChatGPT Resolution                                                    | Valid? | Action                |
| --- | ----------------------------------------- | --------------------------------------------------------------------- | ------ | --------------------- |
| 31  | Outlet tries to edit locked fields anyway | Server-side rejection                                                 | ✅     | Add to impl security  |
| 32  | Override exists, master item deleted      | Orphan override ignored, item disappears                              | ✅     | Already covered in A5 |
| 33  | Master item ID regenerated                | **CRITICAL** — Must stabilize IDs                                     | ✅     | Add stability rule    |
| 34  | HQ bans outlet local category             | ❌ NOT IN SCOPE — HQ doesn't control outlet local content             | ❌     | Reject                |
| 35  | HQ wants mandatory items everywhere       | Use `active: true` at master — outlet can override `available: false` | ✅     | Add to spec           |
| 36  | Outlet override becomes outdated          | UI shows both master + outlet price                                   | ✅     | Add to spec FR-8      |
| 37  | Outlet overrides too many items           | Internal-only drift detection                                         | ⚠️     | Post-P0               |
| 38  | Outlet changes theme while linked         | Project config is NOT inherited — only menu data                      | ✅     | Add to spec           |
| 39  | Two HQ admins edit master simultaneously  | Last-write-wins + MOL trail                                           | ✅     | Already in impl       |
| 40  | Outlet caching shows stale menu           | Cache key includes modifiedOn                                         | ✅     | Add to impl           |

---

## SECTION C: Data Model Updates Required

### C1. MasterRef Interface Update

| Field             | Current    | Required        | Action           |
| ----------------- | ---------- | --------------- | ---------------- |
| `masterProjectId` | ✅ Present | ✅ Keep         | None             |
| `masterStoreId`   | ❌ Missing | ✅ **Required** | Add to impl §3.1 |
| `lastSyncedOn`    | ✅ Present | ✅ Keep         | None             |

### C2. ItemOverride Metadata

| Field        | Current    | ChatGPT Suggestion | Action                    |
| ------------ | ---------- | ------------------ | ------------------------- |
| `itemId`     | ✅ Present | ✅ Keep            | None                      |
| `price`      | ✅ Present | ✅ Keep            | None                      |
| `available`  | ✅ Present | ✅ Keep            | None                      |
| `active`     | ✅ Present | ✅ Keep            | None                      |
| `modifiedOn` | ❌ Missing | ⚠️ Optional        | Add as optional for audit |
| `modifiedBy` | ❌ Missing | ⚠️ Optional        | Add as optional for audit |

---

## SECTION D: Override Resolution Contract (NEW)

ChatGPT provided a comprehensive "Override Resolution Contract" that should be added to both spec and impl docs.

### D1. Core Rules to Document

| Rule       | Description                                                   | Target Doc          |
| ---------- | ------------------------------------------------------------- | ------------------- |
| **Rule A** | Outlet override always wins until explicitly cleared          | spec §FR-5, impl §6 |
| **Rule B** | Check override existence with `!== undefined`, not truthy     | impl §6.1           |
| **Rule C** | Redundant override cleanup is safe (when override === master) | impl §6.1           |
| **Rule D** | Never auto-remove non-redundant overrides                     | spec §FR-5, impl §6 |
| **Rule E** | Render is pure — never write resolved results to Firestore    | impl §6.1           |

### D2. Conflict Scenarios to Document

| Scenario                                | Outcome                   | Target Doc |
| --------------------------------------- | ------------------------- | ---------- |
| Master 499→599→499, Outlet override 699 | Show 699                  | spec §FR-5 |
| Outlet removes override                 | Show current master price | spec §FR-5 |
| Override equals master price            | May auto-clean (safe)     | impl §6.1  |

---

## SECTION E: Write Contract (NEW)

ChatGPT provided detailed Firestore write specifications that should be added to impl.md.

### E1. Operations to Document

| Operation              | Validation Rules                             | MOL Event                   | Target Doc |
| ---------------------- | -------------------------------------------- | --------------------------- | ---------- |
| Mark Project as Master | `isMaster: true`, remove masterRef/overrides | MASTER_MENU_UPDATED         | impl §7    |
| Link Outlet to Master  | Validate master exists, set overrides {}     | OUTLET_LINKED_TO_MASTER     | impl §7    |
| Unlink Outlet          | ❌ BLOCKED for chain tenants                 | OUTLET_UNLINKED_FROM_MASTER | impl §7    |
| Apply Item Override    | Validate itemId exists in master             | OUTLET_OVERRIDE_APPLIED     | impl §7    |
| Reset Item Override    | Delete overrides.items[itemId]               | OUTLET_OVERRIDE_REMOVED     | impl §7    |
| Create Local Item      | ID must start with `L_`                      | OUTLET_LOCAL_ITEM_ADDED     | impl §7    |

### E2. Invariants to Document

| Invariant | Description                             | Target Doc        |
| --------- | --------------------------------------- | ----------------- |
| **A**     | Chain tenants always have master        | spec §FR-11 (NEW) |
| **B**     | Master cannot link to another master    | spec §FR-2.3      |
| **C**     | Outlet override never edits master data | impl §7           |
| **D**     | Local IDs use `L_` prefix               | impl §7           |

---

## SECTION F: QA Test Matrix (40 Tests)

ChatGPT provided 40 comprehensive tests. These should be added to impl.md or a separate validation doc.

### F1. Critical Tests Summary

| Category                        | Test Count | Status      |
| ------------------------------- | ---------- | ----------- |
| Feature Flag & Backwards Compat | 5          | Add to impl |
| Master Project Rules            | 5          | Add to impl |
| Linking & Chain Consistency     | 5          | Add to impl |
| Resolver Correctness            | 6          | Add to impl |
| Overrides                       | 6          | Add to impl |
| Multi-Project Support           | 3          | Add to impl |
| Pricing Integrity & Staleness   | 5          | Add to impl |
| Security & Abuse                | 5          | Add to impl |

### F2. Release Gate Tests (MUST PASS)

| Test ID | Description                                | Priority |
| ------- | ------------------------------------------ | -------- |
| T1      | Flag OFF = zero behavior change            | P0       |
| T2      | Single-store tenant unchanged              | P0       |
| T6      | Mark project as master sets correct fields | P0       |
| T11     | Link outlet to master works                | P0       |
| T16     | Resolved project returns master items      | P0       |
| T22     | Price override works                       | P0       |
| T24     | Active override hides item                 | P0       |
| T26     | Override precedence locked                 | P0       |
| T31     | Master price update marks outlet stale     | P0       |
| T36     | Outlet cannot override another store       | P0       |
| T39     | Override payload strict schema             | P0       |

---

## SECTION G: Rejected Feedback

| #   | ChatGPT Suggestion                             | Reason for Rejection                         |
| --- | ---------------------------------------------- | -------------------------------------------- |
| 1   | HQ should be able to delete outlet local items | Violates outlet autonomy principle           |
| 2   | Mandatory `hqStoreId` in tenant doc            | Over-engineering — any store can have master |
| 3   | Multi-language selective inheritance           | Out of P0 scope                              |
| 4   | Override drift detection alerts                | Violates "Silence is a Feature" doctrine     |
| 5   | Approval workflows for unlinking               | Creates cognitive load                       |
| 6   | "Promote local to master" feature              | Explicitly excluded in spec                  |
| 7   | Override count threshold alerts                | Violates "Silence" doctrine                  |
| 8   | Tax/service charge override                    | Out of P0 scope                              |
| 9   | Regional language adaptations                  | Out of P0 scope                              |
| 10  | Franchise billing hooks                        | Explicitly excluded                          |
| 11  | Cross-outlet analytics                         | Explicitly excluded                          |
| 12  | Outlet theme inheritance                       | Project config stays independent             |

---

## 🎯 DOC UPDATE PLAN

### Priority 1: CRITICAL (impl.md)

| #   | Change                                                | Section      | Status  |
| --- | ----------------------------------------------------- | ------------ | ------- |
| 1   | Add `masterStoreId` to MasterRef interface            | §3.1         | ✅ Done |
| 2   | Fix `getLinkedOutlets()` query to use collectionGroup | §7.1         | ✅ Done |
| 3   | Add role enforcement to DAL functions                 | §10          | ✅ Done |
| 4   | Improve `reconstructFiles()` to handle multi-file     | §6.1         | ✅ Done |
| 5   | Add Override Resolution Contract section              | §6 (NEW)     | ✅ Done |
| 6   | Add Write Contract section                            | §7 (NEW)     | ✅ Done |
| 7   | Add local ID prefix rule (`L_`)                       | §3.2         | ✅ Done |
| 8   | Add QA Test Matrix                                    | §13 (EXPAND) | ✅ Done |

### Priority 2: IMPORTANT (spec.md)

| #   | Change                                         | Section        | Status  |
| --- | ---------------------------------------------- | -------------- | ------- |
| 1   | Add "Chain must always have master" constraint | FR-11 (NEW)    | ✅ Done |
| 2   | Add override precedence clarity (outlet wins)  | FR-5           | ✅ Done |
| 3   | Add "available vs active" distinction          | FR-5           | ✅ Done |
| 4   | Add master deletion behavior                   | Open Questions | ✅ Done |
| 5   | Add outlet theme/config independence           | FR-6           | ✅ Done |
| 6   | Add MOL events table (expand)                  | FR-10          | ✅ Done |

### Priority 3: MINOR (marketing.md)

| #   | Change              | Section | Status      |
| --- | ------------------- | ------- | ----------- |
| 1   | No changes required | N/A     | ✅ Complete |

---

## 📊 VALIDATION STATUS

| Document      | Current State | After Updates               |
| ------------- | ------------- | --------------------------- |
| spec.md       | 100% Complete | All feedback applied        |
| impl.md       | 100% Complete | All critical fixes applied  |
| marketing.md  | 100% Complete | No changes needed           |
| validation.md | Created       | Doc-code alignment verified |

---

## 🔥 ROUND 2: ChatGPT Critical Review (Jan 19, 2026)

ChatGPT identified 9 additional critical issues after reviewing updated docs.

### Round 2 Fixes Applied

| #   | Issue                                                                 | Fix                                                | Status  |
| --- | --------------------------------------------------------------------- | -------------------------------------------------- | ------- |
| 1   | `linkOutletToMaster()` stores `session.sId` as masterStoreId          | Changed to accept `masterStoreId` as parameter     | ✅ Done |
| 2   | Master validation uses wrong Firestore path (`session.sId`)           | Now uses `masterStoreId` parameter for validation  | ✅ Done |
| 3   | `getProjectData()` unsafe for cross-store master lookup               | Added `getProjectDataByStore(tId, sId, projectId)` | ✅ Done |
| 4   | `unlinkOutletFromMaster()` violates FR-11                             | Blocked by default, requires `adminOverride`       | ✅ Done |
| 5   | `collectionGroup("projects")` won't work (leaf collection is `{sId}`) | Replaced with index doc approach                   | ✅ Done |
| 6   | Resolver breaks multi-file projects                                   | Added single-file constraint enforcement           | ✅ Done |
| 7   | Security only in docs, not enforced                                   | Added explicit server-side enforcement notes       | ✅ Done |
| 8   | Master item deletion behavior unclear                                 | Added explicit contract in spec.md                 | ✅ Done |
| 9   | `active` vs `available` precedence undefined                          | Added precedence table (active=false wins)         | ✅ Done |

### New Structures Added

| Structure      | Path                                               | Purpose                                         |
| -------------- | -------------------------------------------------- | ----------------------------------------------- |
| **Index Doc**  | `tenants/{tId}/multiOutletIndex/{masterProjectId}` | Track linked outlets (replaces collectionGroup) |
| **New DAL**    | `getProjectDataByStore(tId, sId, projectId)`       | Cross-store project lookup                      |
| **Constraint** | Single-file only                                   | Master and outlet must be single-file           |

---

## 🔥 ROUND 3: ChatGPT Final Review (Jan 19, 2026)

ChatGPT identified 7 final issues to fix before implementation-ready.

### Round 3 Fixes Applied

| #   | Issue                                                   | Fix                                                                         | Status  |
| --- | ------------------------------------------------------- | --------------------------------------------------------------------------- | ------- |
| A   | Principle #2 "No new collections" contradicts index doc | Updated to "No new top-level collections (except tenant-scoped index docs)" | ✅ Done |
| B   | `unlinkOutletFromMaster()` is a footgun                 | Replaced with `switchOutletMaster()`, internal unlink is admin-only         | ✅ Done |
| C   | `reconstructFiles` may wipe extractedData fields        | Now preserves ALL existing data, only replaces items/categories             | ✅ Done |
| D   | Local ID rules incomplete (no category prefix)          | Added `L_I_` for items, `L_C_` for categories                               | ✅ Done |
| E   | "Propagation < 5 seconds" wording incorrect             | Changed to "read-time resolution" — reflects on next render                 | ✅ Done |
| F   | Override on non-existent item creates garbage           | Now validates item exists in master before writing                          | ✅ Done |
| G   | Index array allows duplicates via arrayUnion            | Changed to MAP keyed by `outletProjectId` — no duplicates                   | ✅ Done |

### Architecture Improvements

| Improvement             | Before                       | After                          |
| ----------------------- | ---------------------------- | ------------------------------ |
| **Index structure**     | Array with `arrayUnion()`    | Map keyed by `outletProjectId` |
| **Master switching**    | Unlink + Link (gap possible) | Atomic `switchOutletMaster()`  |
| **extractedData merge** | Replace languages only       | Preserve ALL existing fields   |
| **Override validation** | Blind write                  | Verify item exists in master   |

---

## 🎯 ROUND 4: Architecture Simplification (Jan 20, 2026)

User-driven simplification to reduce Firebase reads and eliminate unnecessary complexity.

### Key Decisions

| Decision                                       | Rationale                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| `isMaster` at store level, not project         | All projects in master store are masters by definition              |
| Extract `storeId` from `projectId` format      | ProjectId = `{tId}-{timestamp}-{sId}` — no need to store separately |
| No `masterStoreId` field needed                | Extracted from `masterProjectId` at runtime                         |
| No index collection needed                     | Customer render = 2 reads; admin scan is acceptable for cold path   |
| Chain detection via `tenant.storesList.length` | Already available, no new flag needed                               |

### Round 4 Simplifications Applied

| #   | Before                                       | After                                  | Benefit                |
| --- | -------------------------------------------- | -------------------------------------- | ---------------------- |
| 1   | `isMaster` on project                        | `isMaster` on store in `storesSummary` | Single source of truth |
| 2   | `masterRef.masterStoreId` stored             | Extract from `masterProjectId`         | No redundant field     |
| 3   | `tenants/{tId}/multiOutletIndex/` collection | No index collection                    | No new collections     |
| 4   | 3 reads for chain render                     | 2 reads (project + master)             | 33% fewer reads        |
| 5   | Fetch storesSummary for render               | Not needed for customer render         | Optimized hot path     |

### Firebase Read Cost (Final)

| Scenario             | Reads | Notes                         |
| -------------------- | ----- | ----------------------------- |
| Single-store (90%)   | 1     | Project only — no chain logic |
| Chain outlet         | 2     | Project + Master              |
| Admin "show outlets" | N     | Cold path, acceptable         |

### Data Model (Round 4)

```
storesSummary.stores[sId].isMaster: boolean  // Store-level flag
project.masterRef.masterProjectId: string     // Only field needed
project.overrides: { items, categories }      // Store overrides
```

---

## 🎯 ROUND 5: Final Simplifications (Jan 20, 2026)

User-driven final refinements for consistency and future-proofing.

### Key Changes

| #   | Change                                                     | Rationale                                                                |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | `masterProjectId` at top level (not nested in `masterRef`) | Enables direct Firestore querying: `where('masterProjectId', '==', xxx)` |
| 2   | Remove `lastSyncedOn` field                                | Not needed — read-time resolution, no sync tracking                      |
| 3   | Replace "outlet" → "store" terminology                     | Consistency with existing codebase terminology                           |
| 4   | Replace "brand" → "tenant" terminology                     | Consistency with existing codebase terminology                           |
| 5   | Extract both `tId` and `sId` from projectId                | `parseProjectId()` helper for consistency                                |
| 6   | Add `ENABLE_CHANGE_MASTER_STORE` feature flag              | Future-proof: first store is master by default, toggle later if needed   |
| 7   | Add `ENABLE_UNLINK_FROM_MASTER` feature flag               | Future-proof: disabled by default, enable if client requests             |

### Feature Flags (Final)

| Flag                         | Default | Purpose                              |
| ---------------------------- | ------- | ------------------------------------ |
| `ENABLE_MULTI_OUTLET`        | `false` | Master feature flag for multi-store  |
| `ENABLE_CHANGE_MASTER_STORE` | `false` | Allow changing which store is master |
| `ENABLE_UNLINK_FROM_MASTER`  | `false` | Allow stores to unlink from master   |

### Data Model (Final)

```
storesSummary.stores[sId].isMaster: boolean  // Store-level flag
project.masterProjectId?: string              // Top-level (not nested!)
project.overrides?: { items, categories }     // Store overrides
```

### Terminology (Final)

| Old Term                    | New Term              | Reason                        |
| --------------------------- | --------------------- | ----------------------------- |
| Outlet                      | Store                 | Matches existing codebase     |
| Brand                       | Tenant                | Matches existing codebase     |
| `masterRef.masterProjectId` | `masterProjectId`     | Flattened for direct querying |
| `linkOutletToMaster()`      | `linkStoreToMaster()` | Terminology alignment         |
| `OUTLET_*` events           | `STORE_*` events      | Terminology alignment         |

---

## 🎯 ROUND 6: Complete Field Classification & Multi-File Support (Jan 21, 2026)

User-driven comprehensive review of all fields and removal of architectural constraints.

### Key Changes

| #   | Change                                                      | Rationale                                                       |
| --- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | Added `orderIndex` to Category, Item, Attribute types       | Enable store-level reordering (supports `ReorderMenuModal.tsx`) |
| 2   | Expanded FR-5 (Store Overrides) with ALL overridable fields | Complete field coverage                                         |
| 3   | Expanded FR-6 (Locked Fields) with ALL locked fields        | Complete field coverage                                         |
| 4   | Added `AttributeOverride` interface                         | Store can override variant prices/active/order                  |
| 5   | Added `isMaster` to `store.ts` type                         | Type consistency with spec                                      |
| 6   | **REMOVED single-file constraint**                          | Files = PDF pages, not separate menus                           |
| 7   | Clarified orphaned override behavior                        | Silently ignored at render time                                 |
| 8   | Added `timeSlots` as overridable                            | Stores have different operating hours                           |

### Field Classification (Final)

#### Category Fields

| Field        | Override? | Reason                  |
| ------------ | --------- | ----------------------- |
| `id`         | 🔒 Locked | Identifier              |
| `name`       | 🔒 Locked | Brand consistency       |
| `images`     | 🔒 Locked | Brand visual identity   |
| `active`     | ✅ Yes    | Store can hide category |
| `orderIndex` | ✅ Yes    | Store can reorder       |
| `timeSlots`  | ✅ Yes    | Store-specific hours    |

#### Item Fields

| Field          | Override? | Reason                         |
| -------------- | --------- | ------------------------------ |
| `id`           | 🔒 Locked | Identifier                     |
| `name`         | 🔒 Locked | Brand consistency              |
| `description`  | 🔒 Locked | Brand description              |
| `images`       | 🔒 Locked | Brand visual identity          |
| `category`     | 🔒 Locked | Brand-level categorization     |
| `tags`         | 🔒 Locked | Dietary info is brand-critical |
| `active`       | ✅ Yes    | Store can hide item            |
| `available`    | ✅ Yes    | Temporary sold-out             |
| `price`        | ✅ Yes    | Local pricing                  |
| `orderIndex`   | ✅ Yes    | Store can reorder              |
| `isBestSeller` | ✅ Yes    | Store local bestsellers        |
| `duration`     | ✅ Yes    | Prep time varies               |
| `ownerBoost`   | ✅ Yes    | Store boost/suppress           |

#### Attribute Fields

| Field        | Override? | Reason                 |
| ------------ | --------- | ---------------------- |
| `id`         | 🔒 Locked | Identifier             |
| `name`       | 🔒 Locked | Variant name           |
| `active`     | ✅ Yes    | Hide variant at store  |
| `price`      | ✅ Yes    | Local variant pricing  |
| `orderIndex` | ✅ Yes    | Local variant ordering |

### Multi-File Support (NEW)

**Removed Constraint:** Single-file requirement was incorrect.

**Why:** "File" means PDF page, not separate menu. A pizza menu with 4 pages = 4 files. The constraint would break 99% of real menus.

**Architecture:**

- Master project: Full menu data in `files[]` (multi-file OK)
- Store project: Only `overrides` (ID-based, no file data)
- Render: Load master files → Apply overrides by ID → Done

No file-level merging needed because overrides are ID-based.

### Type Updates

**`extractedData.types.ts`:**

```typescript
// Added to ExtractedDataCategory
orderIndex?: number;

// Added to ExtractedDataItem
orderIndex?: number;

// Added to ExtractedDataAttribute
orderIndex?: number;
// Updated comment: active is overridable by store
```

**`store.ts`:**

```typescript
// Added to StoreDataType
isMaster?: boolean; // Multi-Store Consistency (Feature #4)
```

### Orphaned Override Handling

When master deletes item X:

1. Master no longer has item X
2. Store override for X becomes orphaned
3. At render: resolver only applies overrides for IDs in master
4. Orphaned overrides = silently ignored (harmless garbage)

**No `isDeleted` flag needed.** No cleanup job needed.

---

## 🎯 ROUND 7: Architecture Hardening & Future Planning (Jan 21, 2026)

User-driven review of edge cases, access control, and ID stability.

### Key Changes

| #   | Change                                                | Rationale                                                                       |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | Added **4.5 Project ID Duplicate Check** to impl.md   | Defensive — collision rare but catastrophic                                     |
| 2   | Clarified **local-only storage structure** in impl.md | Where local items go: `files[0].extractedData.data` with `L_I_`/`L_C_` prefixes |
| 3   | Added **FR-12: Access-Based Store Permissions**       | Master controls what features stores can use                                    |
| 4   | Added **FR-13: ID Stability Guarantees**              | IDs MUST NEVER change — critical for override integrity                         |
| 5   | Added **Future Considerations** section               | Points 3 & 6 documented for post-P0                                             |

### Point 1: Project ID Duplicate Check

**Problem:** `{tId}-{timestamp}-{sId}` collisions are rare but catastrophic.

**Solution:** Check existence before create:

```typescript
const docSnap = await getDoc(docRef);
if (docSnap.exists()) {
  // Add random suffix
  return `${tId}-${timestamp}-${suffix}-${sId}`;
}
```

**Cost:** 1 read per create (acceptable for data integrity).

### Point 2: Local-Only Storage Clarified

**Location:** `storeProject.files[0].extractedData.data`

**ID Prefixes:**

- Local items: `L_I_chef_special_001`
- Local categories: `L_C_daily_specials`

**Why first file:** No structural changes needed — editor already works with `files[0]`.

### Point 4: FR-12 — Access-Based Store Permissions

Master controls what stores can do:

| Permission                 | Default | Description       |
| -------------------------- | ------- | ----------------- |
| `canOverrideTheme`         | `false` | Theme/colors      |
| `canOverrideBrandIdentity` | `false` | Logo/brand images |
| `canOverrideLayout`        | `false` | UI layout         |
| `canUseMenuExtraction`     | `false` | AI extraction     |
| `canAddLanguages`          | `true`  | Translations      |
| `canGenerateDescriptions`  | `true`  | AI descriptions   |
| `canGenerateImages`        | `false` | AI image gen      |

Stored in: `storesSummary.stores[sId].permissions`

### Point 5: FR-13 — ID Stability (CRITICAL)

**Rule:** Item/Category IDs MUST NEVER change after creation.

**Why:** Store overrides are keyed by ID. If master re-extracts and AI generates new IDs → all overrides orphaned.

**Protection:**

1. Re-extraction must preserve existing IDs (match by name/similarity)
2. Manual ID editing blocked in UI
3. API rejects ID mutations

### Future Considerations (Points 3 & 6)

**F1: Master Change Visibility** — Add `visibility: "client"` to MOL events so stores see what changed. Deferred: adds UI complexity.

**F2: Orphan Cleanup Job** — Weekly cleanup of orphaned overrides. Deferred: zero user impact (orphans are harmless).

---

**DOCUMENT STATUS:** ✅ ROUND 7 COMPLETE — ARCHITECTURE HARDENED  
**NEXT STEP:** Proceed to implementation per impl.md Phase 1  
**TIMESTAMP:** January 21, 2026
