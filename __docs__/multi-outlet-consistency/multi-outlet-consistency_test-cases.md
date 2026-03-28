# Multi-Outlet Consistency — Test Cases & Scenarios

> **Status:** ✅ Production Ready  
> **Original Date:** 2026-01-22  
> **Last Reviewed:** 2026-02-13  
> **Source:** ChatGPT Deep Analysis + Codebase Cross-Check  
> **Purpose:** Comprehensive test matrix for stability and scalability

> **Post-Implementation Note (Feb 13, 2026):** The 124 test cases below cover the core multi-outlet feature (master/outlet linking, overrides, AI extraction). The following areas were added during implementation and need test case expansion in a future session:
>
> - **Store Onboarding (Feature #4C):** Outlet creation/deactivation, billing, Chain Control Panel — see [store-onboarding/](./store-onboarding/)
> - **Outlet Policy (15 flags):** Policy enforcement, `applyOutletPolicy()` — see [multi-chain-permissions/](../multi-chain-permissions/)
> - **Staff Roles (23 permissions):** Permission resolution, `hasPermission()` — see [roles-permissions/](../roles-permissions/)
> - **Master Updates Awareness (#4.1):** Signal doc, operational change detection — see [master-updates-awareness_impl.md](./master-updates-awareness_impl.md)

---

## Executive Summary

This document captures **40 real-world multi-outlet scenarios** and a **QA test matrix (40 tests)** to ensure the multi-outlet feature is production-ready. Each scenario is reviewed against the current codebase implementation.

**Legend:**

- ✅ **HANDLED** — Implemented in codebase
- ⚠️ **PARTIAL** — Partially implemented, needs attention
- ❌ **NOT HANDLED** — Not implemented, needs work
- 🔒 **BY DESIGN** — Intentionally not implemented per MenuList philosophy

---

## Part 1: Real-World Scenarios (Cases 1-40)

### Set #1 — Core Operations (Cases 1-10)

#### Case 1: Master changes price, outlet has override

| Aspect              | Detail                                                        |
| ------------------- | ------------------------------------------------------------- |
| **HQ Intent**       | Brand price updated everywhere                                |
| **Outlet Reality**  | My rent is higher, I need different pricing                   |
| **Risk**            | Silent conflict + confusion                                   |
| **Resolution Rule** | Outlet override ALWAYS wins until removed                     |
| **Status**          | ✅ HANDLED                                                    |
| **Evidence**        | `resolveProject.ts:148-161` — Override price takes precedence |
| **Notes**           | `override.price ?? item.price` ensures outlet wins            |

#### Case 2: Master changes price, outlet has no override

| Aspect              | Detail                                                    |
| ------------------- | --------------------------------------------------------- |
| **HQ Intent**       | Update should apply to all outlets instantly              |
| **Outlet Reality**  | We didn't touch anything                                  |
| **Risk**            | None (ideal flow)                                         |
| **Resolution Rule** | Master price used when no override                        |
| **Status**          | ✅ HANDLED                                                |
| **Evidence**        | `resolveProject.ts:151-156` — Falls back to master values |

#### Case 3: Outlet overrides price temporarily (festival/surge)

| Aspect              | Detail                                                         |
| ------------------- | -------------------------------------------------------------- |
| **HQ Intent**       | Pricing should be stable                                       |
| **Outlet Reality**  | Demand spikes, we adjust                                       |
| **Risk**            | Override becomes permanent drift if not managed                |
| **Resolution Rule** | Override persists until explicitly cleared                     |
| **Status**          | ✅ HANDLED                                                     |
| **Evidence**        | `multiOutlet/index.ts:407-446` — `removeItemOverride()` clears |
| **Notes**           | No auto-expiry implemented (by design - simplicity)            |

#### Case 4: Outlet marks item unavailable (sold out) for today

| Aspect              | Detail                                                                      |
| ------------------- | --------------------------------------------------------------------------- |
| **HQ Intent**       | Menu should be consistent                                                   |
| **Outlet Reality**  | Kitchen ran out                                                             |
| **Risk**            | Guests see wrong availability                                               |
| **Resolution Rule** | Outlet availability override wins                                           |
| **Status**          | ✅ HANDLED                                                                  |
| **Evidence**        | `resolveProject.ts:156` — `available: override.available ?? item.available` |

#### Case 5: Outlet permanently stops selling an item (discontinue locally)

| Aspect              | Detail                                                                   |
| ------------------- | ------------------------------------------------------------------------ |
| **HQ Intent**       | Brand menu stays intact                                                  |
| **Outlet Reality**  | We removed this item forever                                             |
| **Risk**            | If master later updates that item, outlet must stay hidden               |
| **Resolution Rule** | Outlet active=false override wins, item filtered out                     |
| **Status**          | ✅ HANDLED                                                               |
| **Evidence**        | `resolveProject.ts:163-164` — `.filter((item) => item.active !== false)` |

#### Case 6: Master removes an item, but outlet still sells it locally

| Aspect              | Detail                                                               |
| ------------------- | -------------------------------------------------------------------- |
| **HQ Intent**       | We killed this item across brand                                     |
| **Outlet Reality**  | It's a top seller here                                               |
| **Risk**            | Brand integrity conflict                                             |
| **Resolution Rule** | Master deletion wins. Outlet must add as local-only if needed        |
| **Status**          | ✅ HANDLED                                                           |
| **Evidence**        | `resolveProject.ts:141` — `masterItemIds` set determines inheritance |
| **Notes**           | Outlet can recreate as local-only item with `L_I_` prefix            |

#### Case 7: Master renames an item, outlet has local pricing override

| Aspect              | Detail                                                        |
| ------------------- | ------------------------------------------------------------- |
| **HQ Intent**       | Rename should reflect everywhere                              |
| **Outlet Reality**  | We only changed price                                         |
| **Risk**            | Outlet sees new name but old override still applies           |
| **Resolution Rule** | Name from master (locked), price from override                |
| **Status**          | ✅ HANDLED                                                    |
| **Evidence**        | `masterUtils.ts:21-29` — `LOCKED_ITEM_FIELDS` includes `name` |
| **Notes**           | Override only contains price/available/active, not name       |

#### Case 8: Master changes category structure (moves item to another category)

| Aspect              | Detail                                                               |
| ------------------- | -------------------------------------------------------------------- |
| **HQ Intent**       | Menu layout improved                                                 |
| **Outlet Reality**  | We want our own flow                                                 |
| **Risk**            | Category order override + category membership changes collide        |
| **Resolution Rule** | Category assignment from master (locked), ordering can be overridden |
| **Status**          | ✅ HANDLED                                                           |
| **Evidence**        | `masterUtils.ts:26` — `category` in LOCKED_ITEM_FIELDS               |
| **Notes**           | `overrides.categories[].orderIndex` allows local ordering            |

#### Case 9: Outlet adds a local-only item that looks like a master item

| Aspect              | Detail                                                      |
| ------------------- | ----------------------------------------------------------- |
| **HQ Intent**       | Don't dilute naming                                         |
| **Outlet Reality**  | Local demand needs variation                                |
| **Risk**            | Duplicates confuse customers + staff                        |
| **Resolution Rule** | Local-only IDs are namespaced with `L_I_` prefix            |
| **Status**          | ✅ HANDLED                                                  |
| **Evidence**        | `multiOutlet.types.ts:95-96` — `LOCAL_ITEM_PREFIX = "L_I_"` |
| **Notes**           | No automatic duplicate detection (scope creep)              |

#### Case 10: Outlet creates local-only category, master later adds same category name

| Aspect              | Detail                                                       |
| ------------------- | ------------------------------------------------------------ |
| **HQ Intent**       | We're launching Chef Specials everywhere                     |
| **Outlet Reality**  | We already had it                                            |
| **Risk**            | Category collision + ordering confusion                      |
| **Resolution Rule** | IDs are unique by prefix. Name collision allowed             |
| **Status**          | ✅ HANDLED                                                   |
| **Evidence**        | `multiOutlet.types.ts:96` — `LOCAL_CATEGORY_PREFIX = "L_C_"` |
| **Notes**           | Both categories appear (no auto-merge)                       |

---

### Set #2 — Linking & Unlinking (Cases 11-20)

#### Case 11: Master updates price multiple times, outlet has override

| Aspect              | Detail                                                       |
| ------------------- | ------------------------------------------------------------ |
| **Scenario**        | Master: 499→599→499, Outlet override: 699                    |
| **Final Price**     | 699 (outlet wins)                                            |
| **Risk**            | Override might get lost                                      |
| **Resolution Rule** | Outlet override ALWAYS wins until explicitly removed         |
| **Status**          | ✅ HANDLED                                                   |
| **Evidence**        | `resolveProject.ts:155` — Override checked first             |
| **Notes**           | Critical rule: override never auto-deleted by master changes |

#### Case 12: HQ wants to "reset outlet overrides" back to master

| Aspect              | Detail                                                  |
| ------------------- | ------------------------------------------------------- |
| **HQ Intent**       | Remove all local changes                                |
| **Resolution Rule** | Remove override entry = revert to master                |
| **Status**          | ✅ HANDLED                                              |
| **Evidence**        | `multiOutlet/index.ts:407-446` — `removeItemOverride()` |
| **Notes**           | Per-item reset. Full reset not exposed in UI yet        |

#### Case 13: Outlet override refers to missing item (master deleted)

| Aspect              | Detail                                                  |
| ------------------- | ------------------------------------------------------- |
| **Risk**            | Orphan overrides clutter DB                             |
| **Resolution Rule** | Ignore orphan overrides at read-time                    |
| **Status**          | ✅ HANDLED                                              |
| **Evidence**        | `resolveProject.ts:148-161` — Only iterates masterItems |
| **Notes**           | Orphan overrides remain in DB but are harmless          |

#### Case 14: Master changes category name, outlet had category order override

| Aspect              | Detail                                              |
| ------------------- | --------------------------------------------------- |
| **Resolution Rule** | Name from master, orderIndex override still applies |
| **Status**          | ✅ HANDLED                                          |
| **Evidence**        | `masterUtils.ts:34-38` — Category name is locked    |
| **Notes**           | `overrides.categories[].orderIndex` preserved       |

#### Case 15: Outlet tries to change item category assignment

| Aspect              | Detail                                                    |
| ------------------- | --------------------------------------------------------- |
| **Resolution Rule** | Not allowed for inherited items (category is locked)      |
| **Status**          | ✅ HANDLED                                                |
| **Evidence**        | `masterUtils.ts:26` — `category` in LOCKED_ITEM_FIELDS    |
| **Notes**           | Server-side enforcement via `validateInheritedItemEdit()` |

#### Case 16: Master changes item description, outlet wants different local language tone

| Aspect              | Detail                                                    |
| ------------------- | --------------------------------------------------------- |
| **Resolution Rule** | Description is locked. Outlet cannot modify               |
| **Status**          | ✅ HANDLED                                                |
| **Evidence**        | `masterUtils.ts:23` — `description` in LOCKED_ITEM_FIELDS |
| **Notes**           | Outlet can add local-only variant if needed               |

#### Case 17: Outlet marks inherited item unavailable, master later marks it available

| Aspect              | Detail                                                           |
| ------------------- | ---------------------------------------------------------------- |
| **Resolution Rule** | Outlet availability override wins                                |
| **Status**          | ✅ HANDLED                                                       |
| **Evidence**        | `resolveProject.ts:156` — `override.available ?? item.available` |

#### Case 18: Outlet hides a category locally (active=false)

| Aspect              | Detail                                                            |
| ------------------- | ----------------------------------------------------------------- |
| **Resolution Rule** | Outlet category active override wins                              |
| **Status**          | ✅ HANDLED                                                        |
| **Evidence**        | `resolveProject.ts:179` — `active: override.active ?? cat.active` |

#### Case 19: Outlet creates local-only item with same name as master item

| Aspect              | Detail                                                   |
| ------------------- | -------------------------------------------------------- |
| **Risk**            | Name collision                                           |
| **Resolution Rule** | Name collision allowed, IDs must be unique               |
| **Status**          | ✅ HANDLED                                               |
| **Evidence**        | `multiOutlet.types.ts:114-117` — `generateLocalItemId()` |
| **Notes**           | No warning UI implemented (scope creep)                  |

#### Case 20: Outlet creates local-only category with same name as master category

| Aspect              | Detail                                                       |
| ------------------- | ------------------------------------------------------------ |
| **Resolution Rule** | Name collision allowed, IDs must be unique                   |
| **Status**          | ✅ HANDLED                                                   |
| **Evidence**        | `multiOutlet.types.ts:122-124` — `generateLocalCategoryId()` |

---

### Set #3 — Multi-Menu & Relinking (Cases 21-30)

#### Case 21: One outlet has multiple menus but master exists only for one

| Aspect              | Detail                                                                |
| ------------------- | --------------------------------------------------------------------- |
| **Resolution Rule** | Chain must always have master. Every published project must be linked |
| **Status**          | ⚠️ PARTIAL                                                            |
| **Evidence**        | `multiOutlet/index.ts:82-87` — Single-file constraint enforced        |
| **Gap**             | No enforcement that every outlet project MUST have masterProjectId    |
| **Action**          | Add validation on publish to require masterProjectId                  |

#### Case 22: Master has multiple projects (Lunch master + Dinner master)

| Aspect              | Detail                                                        |
| ------------------- | ------------------------------------------------------------- |
| **Resolution Rule** | Master is per-project, not per-store                          |
| **Status**          | ✅ HANDLED                                                    |
| **Evidence**        | `project.types.ts:188` — `masterProjectId` is per-project     |
| **Notes**           | Each outlet project links to its corresponding master project |

#### Case 23: Outlet switches from Master A → Master B (brand restructure)

| Aspect              | Detail                                                                  |
| ------------------- | ----------------------------------------------------------------------- |
| **Resolution Rule** | Clear overrides when switching master                                   |
| **Status**          | ✅ HANDLED                                                              |
| **Evidence**        | `multiOutlet/index.ts:180-184` — `switchStoreMaster()` clears overrides |

#### Case 24: Outlet has local-only item, master later introduces same item officially

| Aspect              | Detail                                                            |
| ------------------- | ----------------------------------------------------------------- |
| **Risk**            | Duplicate items                                                   |
| **Resolution Rule** | Never auto-merge. Both exist. HQ can manually delete local        |
| **Status**          | ✅ HANDLED                                                        |
| **Evidence**        | `resolveProject.ts:166-170` — Local-only filtered by ID, not name |
| **Notes**           | No duplicate warning UI (scope creep per roadmap rejection)       |

#### Case 25: Outlet hides master item permanently, master later updates it heavily

| Aspect              | Detail                                                  |
| ------------------- | ------------------------------------------------------- |
| **Resolution Rule** | Outlet hide persists. Item stays hidden                 |
| **Status**          | ✅ HANDLED                                              |
| **Evidence**        | `resolveProject.ts:163-164` — `active !== false` filter |

#### Case 26: Outlet overrides price + master changes formatting/pricing rules

| Aspect              | Detail                                              |
| ------------------- | --------------------------------------------------- |
| **Risk**            | Price comparison issues                             |
| **Resolution Rule** | Override price remains untouched. String comparison |
| **Status**          | ✅ HANDLED                                          |
| **Evidence**        | Price stored as string, no normalization needed     |
| **Notes**           | Existing Pricing Integrity validates format         |

#### Case 27: Outlet overrides category order, master adds 5 new categories

| Aspect              | Detail                                                             |
| ------------------- | ------------------------------------------------------------------ |
| **Resolution Rule** | Outlet ordering applies where defined. New categories appear after |
| **Status**          | ✅ HANDLED                                                         |
| **Evidence**        | `resolveProject.ts:191-197` — Sort with Infinity fallback          |

#### Case 28: Outlet overrides availability (sold out), master marks item available again

| Aspect              | Detail                  |
| ------------------- | ----------------------- |
| **Resolution Rule** | Outlet override wins    |
| **Status**          | ✅ HANDLED              |
| **Evidence**        | `resolveProject.ts:156` |

#### Case 29: Outlet deletes a local-only item that had QR references

| Aspect              | Detail                                           |
| ------------------- | ------------------------------------------------ |
| **Risk**            | Old links show missing item                      |
| **Resolution Rule** | Item removed immediately. B2C handles gracefully |
| **Status**          | ⚠️ PARTIAL                                       |
| **Evidence**        | Local items can be deleted                       |
| **Gap**             | No explicit "item not found" fallback in B2C     |
| **Action**          | Verify B2C handles missing items gracefully      |

#### Case 30: Propagation race: master updated twice quickly

| Aspect              | Detail                                                  |
| ------------------- | ------------------------------------------------------- |
| **Resolution Rule** | Last write wins. Outlet overrides remain stable         |
| **Status**          | ✅ HANDLED                                              |
| **Evidence**        | Read-time resolution always uses latest master snapshot |

---

### Set #4 — Hard Edge Cases (Cases 31-40)

#### Case 31: Master item ID changes (re-extraction)

| Aspect              | Detail                                                      |
| ------------------- | ----------------------------------------------------------- |
| **Risk**            | #1 silent killer — overrides become orphaned                |
| **Resolution Rule** | Master IDs must be stable. No re-extract chaos              |
| **Status**          | ⚠️ PARTIAL                                                  |
| **Evidence**        | No explicit ID stability enforcement                        |
| **Gap**             | Re-extraction could generate new IDs                        |
| **Action**          | Add ID mapping layer or block re-extract on master projects |

#### Case 32: Outlet overrides refer to missing item (master deleted)

| Aspect              | Detail                                                  |
| ------------------- | ------------------------------------------------------- |
| **Resolution Rule** | Master deletion wins. Override becomes orphan (ignored) |
| **Status**          | ✅ HANDLED                                              |
| **Evidence**        | `resolveProject.ts:148` — Only masterItems are iterated |

#### Case 33: Outlet local-only item accidentally uses same ID as master item

| Aspect              | Detail                                                    |
| ------------------- | --------------------------------------------------------- |
| **Risk**            | Collisions and unpredictable merges                       |
| **Resolution Rule** | Local IDs must be namespaced                              |
| **Status**          | ✅ HANDLED                                                |
| **Evidence**        | `multiOutlet.types.ts:95-96` — `L_I_` and `L_C_` prefixes |

#### Case 34: Outlet tries to edit locked fields via API (bypass UI)

| Aspect              | Detail                                                  |
| ------------------- | ------------------------------------------------------- |
| **Resolution Rule** | Server-side enforcement required                        |
| **Status**          | ✅ HANDLED                                              |
| **Evidence**        | `masterUtils.ts:99-117` — `validateInheritedItemEdit()` |
| **Notes**           | Must be called in API routes                            |

#### Case 35: HQ edits master while outlet manager edits overrides (concurrency)

| Aspect              | Detail                                                     |
| ------------------- | ---------------------------------------------------------- |
| **Resolution Rule** | Both can happen safely (different documents)               |
| **Status**          | ✅ HANDLED                                                 |
| **Evidence**        | Master writes to master doc, override writes to outlet doc |

#### Case 36: Outlet wants to "reset to master" for one item

| Aspect              | Detail                                                  |
| ------------------- | ------------------------------------------------------- |
| **Resolution Rule** | Reset = delete override entry                           |
| **Status**          | ✅ HANDLED                                              |
| **Evidence**        | `multiOutlet/index.ts:407-446` — `removeItemOverride()` |

#### Case 37: Outlet wants to reset ALL overrides to master

| Aspect              | Detail                                                 |
| ------------------- | ------------------------------------------------------ |
| **Resolution Rule** | Clear entire overrides map                             |
| **Status**          | ✅ HANDLED                                             |
| **Evidence**        | `multiOutlet/index.ts:567-593` — `clearAllOverrides()` |
| **Notes**           | Resets overrides to empty, preserves local-only items  |

#### Case 38: Master deletes a category that outlet has reordered

| Aspect              | Detail                                                       |
| ------------------- | ------------------------------------------------------------ |
| **Resolution Rule** | Ignore missing category overrides                            |
| **Status**          | ✅ HANDLED                                                   |
| **Evidence**        | `resolveProject.ts:172-182` — Only iterates masterCategories |

#### Case 39: Performance: 1 master linked to 100 outlets, heavy traffic

| Aspect              | Detail                                                                      |
| ------------------- | --------------------------------------------------------------------------- |
| **Resolution Rule** | Max 1 read per render (master only). Store data passed from React state     |
| **Status**          | ✅ HANDLED                                                                  |
| **Evidence**        | `resolveProject.ts:84-87` — Accepts storeProject param, only fetches master |
| **Gap**             | No explicit master caching layer                                            |
| **Notes**           | 0 reads if not linked, 1 read if linked (master fetch only)                 |

#### Case 40: New outlet with empty menu must link to master

| Aspect              | Detail                                         |
| ------------------- | ---------------------------------------------- |
| **Resolution Rule** | Cannot publish until linked                    |
| **Status**          | ⚠️ PARTIAL                                     |
| **Evidence**        | No publish-time validation for masterProjectId |
| **Gap**             | Missing validation on publish                  |
| **Action**          | Add `masterProjectId` check on project publish |

#### Case 41: Customer views linked store's public menu

| Aspect              | Detail                                                                 |
| ------------------- | ---------------------------------------------------------------------- |
| **HQ Intent**       | Customers see consistent branded menu                                  |
| **Outlet Reality**  | Store has local overrides + inherited items                            |
| **Risk**            | Customers see incomplete menu (missing inherited items)                |
| **Resolution Rule** | Resolve linked store before rendering to customer                      |
| **Status**          | ✅ HANDLED                                                             |
| **Evidence**        | `_client/[[...slug]]/page.tsx:161-176` — Calls resolveProjectForRender |
| **Notes**           | Graceful degradation if resolution fails (shows raw store data)        |

---

## Part 2: QA Test Matrix (41 Tests)

### A) Feature Flag & Backwards Compatibility (T1-T5)

| ID  | Test                                 | Expected                       | Status | Evidence                     |
| --- | ------------------------------------ | ------------------------------ | ------ | ---------------------------- |
| T1  | Flag OFF = zero behavior change      | Resolver returns project as-is | ✅     | `resolveProject.ts:83-87`    |
| T2  | Existing single-store tenant works   | No regression                  | ✅     | All fields optional          |
| T3  | Old project docs without new fields  | No crashes                     | ✅     | Optional fields pattern      |
| T4  | Multi-outlet UI hidden when flag OFF | No buttons visible             | ✅     | Feature flag checks in UI    |
| T5  | APIs fail when flag OFF              | Error returned                 | ✅     | All DAL functions check flag |

### B) Master Project Rules (T6-T10)

| ID  | Test                                      | Expected             | Status | Evidence                                                 |
| --- | ----------------------------------------- | -------------------- | ------ | -------------------------------------------------------- |
| T6  | Mark project as master                    | `isMaster` field set | ✅     | `multiOutlet/index.ts:56-129` — `setProjectAsMaster()`   |
| T7  | Master cannot link to another master      | Reject               | ✅     | Implicit - master has no masterProjectId                 |
| T8  | Outlet manager cannot edit master         | 403 reject           | ⚠️     | No role-based check in DAL                               |
| T9  | Master deletion blocked if outlets linked | Block with error     | ✅     | `projects/index.ts:719-728` — `hasLinkedOutlets()` check |
| T10 | Master edits log MOL                      | Event emitted        | ✅     | `projects/index.ts:409-430` — MASTER_MENU_UPDATED event  |

### C) Linking & Chain Consistency (T11-T15)

| ID  | Test                            | Expected              | Status | Evidence                                         |
| --- | ------------------------------- | --------------------- | ------ | ------------------------------------------------ |
| T11 | Link outlet to master           | masterProjectId saved | ✅     | `linkStoreToMaster()`                            |
| T12 | Linking validates master exists | Reject if not found   | ✅     | `multiOutlet/index.ts:72-80`                     |
| T13 | Cross-tenant linking blocked    | Reject                | ✅     | `multiOutlet/index.ts:66-69`                     |
| T14 | Chain must have master enforced | Block publish         | ✅     | `projects/index.ts:496-517` — Publish validation |
| T15 | Outlet cannot unlink itself     | Reject                | ✅     | `ENABLE_UNLINK_FROM_MASTER` flag                 |

### D) Resolver Correctness (T16-T21)

| ID  | Test                                   | Expected                        | Status | Evidence                                                     |
| --- | -------------------------------------- | ------------------------------- | ------ | ------------------------------------------------------------ |
| T16 | Resolved project returns master items  | Correct items                   | ✅     | `resolveProject.ts:148-164`                                  |
| T17 | Local-only items appear only at outlet | Isolation                       | ✅     | `resolveProject.ts:166-170`                                  |
| T18 | Inheritance states correct             | inherited/overridden/local-only | ✅     | `resolveProject.ts:200-217`                                  |
| T19 | Category ordering override applies     | Sorted correctly                | ✅     | `resolveProject.ts:191-197`                                  |
| T20 | Forbidden edits blocked                | Write rejected                  | ✅     | `validateInheritedItemEdit()`                                |
| T21 | Resolver handles missing master        | Fail-safe                       | ✅     | `resolveProject.ts:115-129` — Graceful fallback with warning |

### E) Overrides (T22-T27)

| ID  | Test                              | Expected              | Status | Evidence                                |
| --- | --------------------------------- | --------------------- | ------ | --------------------------------------- |
| T22 | Price override works              | Store price shown     | ✅     | `resolveProject.ts:155`                 |
| T23 | Availability override works       | Unavailable shown     | ✅     | `resolveProject.ts:156`                 |
| T24 | Active override hides item        | Item filtered         | ✅     | `resolveProject.ts:163-164`             |
| T25 | Reset override restores master    | Delete override entry | ✅     | `removeItemOverride()`                  |
| T26 | Override precedence locked        | Outlet wins always    | ✅     | Tested in Case 11                       |
| T27 | Override cannot target local-only | Reject                | ✅     | `applyItemOverride` checks master items |

### F) Multi-Project Support (T28-T30)

| ID  | Test                             | Expected           | Status | Evidence                      |
| --- | -------------------------------- | ------------------ | ------ | ----------------------------- |
| T28 | Lunch/Dinner masters independent | Correct linking    | ✅     | Per-project masterProjectId   |
| T29 | Different overrides per project  | Correct resolution | ✅     | Overrides in each project doc |
| T30 | Wrong master linking blocked     | Reject if mismatch | 🔒     | Not implemented (by design)   |

### G) Pricing Integrity & Staleness (T31-T35)

| ID  | Test                                                | Expected          | Status | Evidence                                          |
| --- | --------------------------------------------------- | ----------------- | ------ | ------------------------------------------------- |
| T31 | Master price update marks outlets stale             | Staleness set     | ✅     | Alternative: `InheritanceBadge` shows masterPrice |
| T32 | Outlet override marks only that outlet stale        | Correct isolation | ⚠️     | Partial - no staleness propagation                |
| T33 | Local-only item change marks only that outlet stale | Correct isolation | ⚠️     | No staleness integration                          |
| T34 | No extra writes on read-time resolution             | Zero writes       | ✅     | Resolver is read-only                             |
| T35 | Linked outlet index updates correctly               | Index accurate    | ❌     | No linked outlet index                            |

### H) Security & Abuse (T36-T40)

| ID  | Test                                           | Expected            | Status | Evidence                                 |
| --- | ---------------------------------------------- | ------------------- | ------ | ---------------------------------------- |
| T36 | Outlet cannot override another store's project | Reject              | ✅     | Session-based sId check                  |
| T37 | Cross-tenant read of master blocked            | Reject/null         | ✅     | Tenant validation                        |
| T38 | Price validation enforced                      | Reject bad format   | ⚠️     | No explicit price validation in override |
| T39 | Override payload must be strict schema         | Reject extra fields | ⚠️     | No Zod schema validation                 |
| T40 | MOL logging never blocks user actions          | Fire-and-forget     | ✅     | `molEvents.ts:50-57`                     |

---

## Part 3: Write Contract (Firestore SSOT)

### Required Invariants

| #   | Invariant                               | Status     | Evidence               |
| --- | --------------------------------------- | ---------- | ---------------------- |
| A   | Chain tenants always have master        | ⚠️ PARTIAL | No publish enforcement |
| B   | Master cannot link to another master    | ✅         | Implicit by design     |
| C   | Outlet override never edits master data | ✅         | Separate documents     |
| D   | IDs must never collide                  | ✅         | `L_I_`/`L_C_` prefixes |

### Write Operations Status

| Operation                  | Status         | Evidence                                                |
| -------------------------- | -------------- | ------------------------------------------------------- |
| Mark Project as Master     | ✅ IMPLEMENTED | `setProjectAsMaster()`                                  |
| Link Outlet to Master      | ✅ IMPLEMENTED | `linkStoreToMaster()`                                   |
| Unlink (internal only)     | ✅ IMPLEMENTED | `unlinkStoreFromMaster()`                               |
| Apply Item Override        | ✅ IMPLEMENTED | `applyItemOverride()`                                   |
| Apply Category Override    | ✅ IMPLEMENTED | `applyCategoryOverride()`                               |
| Remove Item Override       | ✅ IMPLEMENTED | `removeItemOverride()`                                  |
| Remove Category Override   | ✅ IMPLEMENTED | `removeCategoryOverride()`                              |
| Switch Master              | ✅ IMPLEMENTED | `switchStoreMaster()`                                   |
| Clear All Overrides        | ✅ IMPLEMENTED | `clearAllOverrides()`                                   |
| Create Local-Only Item     | ✅ IMPLEMENTED | `editorOperations.createNewItem()` with L*I* prefix     |
| Create Local-Only Category | ✅ IMPLEMENTED | `editorOperations.createNewCategory()` with L*C* prefix |

---

## Part 4: Gap Summary & Action Items

### Critical Gaps (Must Fix)

| Gap                                           | Severity   | Action                          | File                   |
| --------------------------------------------- | ---------- | ------------------------------- | ---------------------- |
| ~~No `setProjectAsMaster()`~~                 | ~~HIGH~~   | ✅ FIXED                        | `multiOutlet/index.ts` |
| ~~No publish validation for masterProjectId~~ | ~~HIGH~~   | ✅ FIXED                        | `projects/index.ts`    |
| ~~No master deletion protection~~             | ~~HIGH~~   | ✅ FIXED                        | `projects/index.ts`    |
| ~~No pricing staleness propagation~~          | ~~MEDIUM~~ | ✅ ADDRESSED (InheritanceBadge) | N/A                    |
| No price validation in override               | MEDIUM     | Add Zod schema                  | `multiOutlet/index.ts` |

### Recommended Additions (P1)

| Gap                                | Action                                     | Status     |
| ---------------------------------- | ------------------------------------------ | ---------- |
| ~~`clearAllOverrides()` function~~ | Add bulk reset capability                  | ✅ FIXED   |
| Master ID stability on re-extract  | Add mapping layer or block re-extract      | ⚠️ PENDING |
| ~~`getLinkedOutlets()` function~~  | Add query to find outlets linked to master | ✅ FIXED   |
| Zod validation on override payload | Reject extra/invalid fields                | ⚠️ PENDING |

### By Design (No Action)

| Item                             | Reason                            |
| -------------------------------- | --------------------------------- |
| No duplicate name warning        | Scope creep per roadmap rejection |
| No auto-merge of duplicates      | Scope creep per roadmap rejection |
| No menu type mismatch validation | Low value, high complexity        |

---

## Part 5: Test Checklist Summary

### Implementation Coverage

| Category          | Total  | ✅ Handled   | ⚠️ Partial   | ❌ Missing |
| ----------------- | ------ | ------------ | ------------ | ---------- |
| Scenarios (1-40)  | 40     | 33           | 5            | 2          |
| QA Tests (T1-T40) | 40     | 30           | 7            | 3          |
| Write Operations  | 11     | 10           | 1            | 0          |
| **Overall**       | **91** | **73 (80%)** | **13 (14%)** | **5 (5%)** |

### Release Blockers

Before enabling `ENABLE_MULTI_OUTLET: true`, these MUST be fixed:

1. ✅ ~~**T9** — Master deletion protection~~ (FIXED)
2. ✅ ~~**T6** — `setProjectAsMaster()` function~~ (FIXED)
3. ✅ ~~**T14** — Publish validation for masterProjectId~~ (FIXED)
4. ✅ ~~**T31** — Pricing staleness~~ (ADDRESSED via InheritanceBadge)
5. ✅ ~~**Local-only DAL**~~ (FIXED — addLocalItem/Category)

---

## Part 6: Detailed Implementation Notes (Jan 22, 2026)

This section provides detailed explanations, approaches, and status for each pending item reviewed during the final implementation pass.

### T14 — Publish Validation ✅ IMPLEMENTED

**Problem:** Outlet projects linked to a master could be published even if the master project was deleted or no longer exists, leading to broken references.

**Solution:** Added validation in `publishProject()` that:

1. Checks if `ENABLE_MULTI_OUTLET` is enabled AND project has `masterProjectId`
2. Uses `parseProjectId()` to extract correct tId/sId from masterProjectId (master may be in different store)
3. Validates cross-tenant access is blocked
4. Validates master project actually exists in Firestore
5. Blocks publish with clear error if master is missing or deleted

**Implementation:** `src/database/projects/index.ts:520-545`

```typescript
if (FEATURE_FLAGS.ENABLE_MULTI_OUTLET && data.masterProjectId) {
  const { parseProjectId } = await import("@lib/multiOutlet/resolveProject");
  const { tId: masterTId, sId: masterSId } = parseProjectId(
    data.masterProjectId,
  );

  // Security: Validate master is within same tenant
  if (masterTId !== session.tId) {
    throw new Error(
      "Publish blocked: Cross-tenant master reference is not allowed.",
    );
  }

  const masterRef = doc(
    firebaseClient,
    `${COLLECTION}/${masterTId}/${masterSId}`,
    data.masterProjectId,
  );
  const masterSnap = await getDoc(masterRef);
  if (!masterSnap.exists() || masterSnap.data()?.deleted) {
    throw new Error("Publish blocked: Linked master project no longer exists.");
  }
}
```

**Key Design Decisions:**

- No redundant Firebase reads — uses `data.masterProjectId` directly (already in React state)
- Correct path resolution — master may be in different sId than current session
- Cross-tenant security check added

**Status:** ✅ FIXED — Release blocker resolved

---

### T10 — Master Edits Log MOL ✅ IMPLEMENTED

**Problem:** When HQ edits the master menu, no MOL event was logged. This meant outlet managers couldn't see what changed at master level.

**Solution:** Added MOL logging in `updateProject()` that:

1. Checks if `ENABLE_MULTI_OUTLET` is enabled
2. Checks if project has NO `masterProjectId` (meaning it's a master or standalone project)
3. Logs `MASTER_MENU_UPDATED` event using correct `MultiStoreMOLEvent` type
4. Includes list of changed fields in metadata

**Implementation:** `src/database/projects/index.ts:409-437`

**Key Design Decisions:**

- Uses `!oldProject.masterProjectId` check (avoids extra read to check store-level isMaster)
- Uses correct `MultiStoreMOLEvent` fields: `type`, `tId`, `sId`, `actorUserId`
- Fire-and-forget pattern (non-blocking)

**Status:** ✅ FIXED

---

### T8 — Role-Based Master Protection 🔒 DEFERRED

**Problem:** Outlet managers could potentially edit master project data if they have access.

**Current State:** No role-based check in DAL functions.

**Decision:** DEFERRED until role-based access control (RBAC) is fully implemented across the platform. This is a security enhancement, not a data integrity issue.

**Priority:** P2 — Implement after RBAC foundation is ready

---

### T31 — Pricing Staleness Propagation ✅ ADDRESSED (Alternative Approach)

**Problem:** When master updates a price, outlets with overrides don't know the master price changed.

**Original ChatGPT Suggestion:**

- Add `stalePriceItems: string[]` to outlet metadata
- On master price change, push item ID to linked outlets' stale list
- Show warning badge in admin UI

**Why We Rejected This:**

- **Expensive:** Requires fetching ALL outlet menus on every master price change
- **Firebase Cost:** N reads for N outlets on every master edit
- **Complexity:** Requires write hooks and notification system

**Our Approach:**
The `InheritanceBadge` component already has `masterPrice` prop that shows:

- Badge with "Modified" state for overridden items
- Tooltip: "This item is inherited but has local modifications (Master price: $X)"

This allows outlet owners to:

1. See at a glance which items have overrides
2. See the master price in tooltip
3. Decide if their override is still appropriate

**Status:** ✅ ADDRESSED via existing `InheritanceBadge` component

**File:** `src/components/atoms/InheritanceBadge/index.tsx:79-81`

---

### Local-Only Item/Category Creation ✅ IMPLEMENTED

**Problem:** ID generators for local items (`L_I_`) and categories (`L_C_`) existed, but not integrated into the UI flow.

**Solution:** Modified the existing UI flow to use local prefixes for linked stores:

| File                  | Function              | Change                                            |
| --------------------- | --------------------- | ------------------------------------------------- |
| `editorOperations.ts` | `createNewItem()`     | Uses `L_I_` prefix when `masterProjectId` present |
| `editorOperations.ts` | `createNewCategory()` | Uses `L_C_` prefix when `masterProjectId` present |

**Key Design Decisions:**

1. **No separate DAL functions** — Local items/categories flow through the existing `updateProject` DAL
2. **No redundant Firestore reads** — Project data is already in React state
3. **Integrates with existing sync flow** — `Editor.tsx` → `syncChanges()` → `updateProject()`

**Updated Files:**

- `src/components/templates/main-app/projects/editorView/utils/editorOperations.ts` — ID generation
- `src/components/templates/main-app/projects/editorView/views/TraditionalView.tsx` — Passes `masterProjectId`
- `src/components/templates/main-app/projects/editorView/EditorContent.tsx` — Passes `masterProjectId`
- `src/components/templates/main-app/projects/editorView/hooks/useEditorLogic.ts` — Accepts `masterProjectId`
- `src/components/templates/main-app/projects/editorView/hooks/useEditorKeyboardShortcuts.ts` — Passes `masterProjectId`

**Status:** ✅ FIXED — P0 blocker resolved

---

### T24 — Outlet Can See Override Diff ✅ ALREADY HANDLED

**Problem:** Outlet owner needs to see when an item is overridden and what the master value is.

**Current Implementation:** `InheritanceBadge` component provides this:

- **inherited** (blue) — Item from master, no changes
- **overridden** (orange) — Item has local modifications
- **local-only** (green) — Item exists only at this outlet

With `masterPrice` prop, tooltip shows: `"(Master price: $X)"`

**Status:** ✅ ALREADY HANDLED

---

### T27 — Override Limit Per Outlet 🔒 DEFERRED

**Problem:** No limit on how many items an outlet can override.

**Decision:** DEFERRED — Low priority, no current business need. Could be added later if abuse detected.

**Status:** 🔒 DEFERRED

---

### T32 — Orphaned Category Detection 🔒 DEFERRED

**Problem:** If master deletes a category, outlet items in that category become orphans.

**Decision:** DEFERRED until RBAC implementation. This is an edge case that can be handled during RBAC review.

**Status:** 🔒 DEFERRED

---

### T35 — Master "Forced Push" to Outlets

**Problem:** HQ wants to push a change to ALL outlets, overriding their local overrides.

**Is This Required?** MAYBE — Depends on business case.

**Proposed Approach (if needed):**

```typescript
export const forcePushToOutlets = async (
  masterProjectId: string,
  itemId: string,
) => {
  // 1. Get all linked outlets via getLinkedOutletStoreIds()
  // 2. For each outlet, remove the override for this item
  // 3. Log MOL event for each outlet
};
```

**Concerns:**

- Expensive (N writes for N outlets)
- May upset outlet managers who had overrides for good reason
- Violates "outlet override wins" principle

**Decision:** 🔒 DEFERRED — Not implementing unless explicit business need. Current "outlet wins" model is safer.

**Status:** 🔒 DEFERRED

---

### T38 — Bulk Apply Override Template

**Explanation:** Allow HQ to create "override templates" that outlets can apply in bulk.

**Example Use Case:**

- "Festival Pricing Template" with +10% on all items
- "Winter Hours Template" with modified availability
- Outlet clicks "Apply Template" instead of overriding items one by one

**Approach (if needed):**

1. Create `overrideTemplates` collection at tenant level
2. Template contains: `{ items: { [itemId]: OverrideData } }`
3. `applyTemplate(storeProjectId, templateId)` function merges template into outlet overrides

**Complexity:** MEDIUM — Requires template CRUD + apply logic

**Decision:** 🔒 DEFERRED — Nice-to-have, not MVP

**Status:** 🔒 DEFERRED

---

### T40 — Outlet Sees Diff From Master

**Problem:** Outlet owner wants a side-by-side comparison of their menu vs master.

**Expectation:**

- UI showing "Master has X, You have Y" for each difference
- Visual diff highlighting changes

**Current State:** Partial — `InheritanceBadge` shows override state, but no full diff view.

**Proposed Approach:**

1. Create `<MasterDiffView>` component
2. Fetch master project data
3. Compare with resolved outlet data
4. Show table: Item | Master Value | Your Value | Action

**Complexity:** MEDIUM — Requires additional UI component

**Decision:** 🔒 DEFERRED — P2 enhancement, implement after core feature is stable

**Status:** 🔒 DEFERRED (will do last as per user request)

---

## Part 7: Updated Implementation Summary

### Final Status After Jan 22, 2026 Fixes

| Category          | Total  | ✅ Handled   | ⚠️ Partial | 🔒 Deferred |
| ----------------- | ------ | ------------ | ---------- | ----------- |
| Scenarios (1-40)  | 40     | 35           | 3          | 2           |
| QA Tests (T1-T40) | 40     | 33           | 2          | 5           |
| Write Operations  | 15     | 14           | 0          | 1           |
| **Overall**       | **95** | **82 (86%)** | **5 (5%)** | **8 (8%)**  |

### Release Blockers — All Resolved ✅

| Blocker                         | Status   |
| ------------------------------- | -------- |
| T9 — Master deletion protection | ✅ FIXED |
| T6 — `setProjectAsMaster()`     | ✅ FIXED |
| T14 — Publish validation        | ✅ FIXED |
| Local-only DAL functions        | ✅ FIXED |

### Deferred Items (Non-Blockers)

| Item                              | Reason                           | Priority |
| --------------------------------- | -------------------------------- | -------- |
| T8 — Role-based master protection | Awaiting RBAC implementation     | P2       |
| T27 — Override limit per outlet   | No business need                 | P3       |
| T32 — Orphaned category detection | Edge case, post-RBAC             | P2       |
| T35 — Master forced push          | Violates "outlet wins" principle | P3       |
| T38 — Bulk override templates     | Nice-to-have                     | P3       |
| T40 — Full diff view              | UI enhancement                   | P2       |

---

## References

- `multi-outlet-consistency_impl.md` — Technical blueprint
- `multi-outlet-consistency_validation.md` — Implementation validation
- `multi-outlet-consistency_roadmap.md` — Filtered feature roadmap
- `constitution/08-feature-rejection-gate.md` — Feature approval criteria

---

**Document Status:** Implementation Complete  
**Last Codebase Check:** January 25, 2026  
**Next Review:** Before enabling `ENABLE_MULTI_OUTLET: true`

---

## Part 8: Chain Extraction + Review Lock Scenarios (Cases 42-56)

> **Added:** January 25, 2026  
> **Source:** ChatGPT Deep Analysis — Chain Extraction Edge Cases  
> **Purpose:** Document extraction job interactions with multi-outlet chains

### Overview

When AI extraction runs on a master project, outlets must be blocked until review is complete. These scenarios ensure chain integrity during extraction workflows.

---

### Set #5 — Master Review Lock Inheritance (Cases 42-47)

#### Case 42: Master re-extract → outlet must be blocked

| Aspect              | Detail                                                                  |
| ------------------- | ----------------------------------------------------------------------- |
| **Scenario**        | Master uploads new file, job becomes `preview_ready` (review pending)   |
| **Outlet Behavior** | Must see hard-block screen, no editor, no publish, no AI tools          |
| **Risk**            | Outlet edits while master SSOT is unstable → data corruption            |
| **Resolution Rule** | Block outlet when `isMasterJobActive = true`                            |
| **Status**          | ✅ HANDLED                                                              |
| **Evidence**        | `useMasterJobStatus.ts:1-98` — Real-time listener for master job status |
| **Notes**           | `ExtractionJobBlockingOverlay` shows "Master menu update in progress"   |

#### Case 43: Outlet opens different project while master review pending (same chain)

| Aspect       | Detail                                                          |
| ------------ | --------------------------------------------------------------- |
| **Scenario** | Master has pending review for Project P1, outlet opens P2       |
| **Expected** | P2 is allowed — lock is per-project, not per-tenant             |
| **Status**   | ✅ HANDLED                                                      |
| **Evidence** | `useMasterJobStatus` only listens to specific `masterProjectId` |

#### Case 44: Outlet tries to publish while master review pending

| Aspect       | Detail                                                       |
| ------------ | ------------------------------------------------------------ |
| **Scenario** | Master review pending, outlet hits Publish                   |
| **Expected** | Block publish — menu state is unstable                       |
| **Status**   | ✅ HANDLED                                                   |
| **Evidence** | `ExtractionJobBlockingOverlay` blocks all UI when job active |
| **Notes**    | User cannot access publish button while overlay is shown     |

#### Case 45: Outlet tries to create overrides while master review pending

| Aspect       | Detail                                                    |
| ------------ | --------------------------------------------------------- |
| **Scenario** | Master review pending, outlet tries to override price     |
| **Expected** | Block override actions — no writes to `overrides.items.*` |
| **Status**   | ✅ HANDLED                                                |
| **Evidence** | Hard-block overlay prevents any interaction               |

#### Case 46: Master cancels review (Discard)

| Aspect       | Detail                                                       |
| ------------ | ------------------------------------------------------------ |
| **Scenario** | Master preview_ready, master hits Discard                    |
| **Expected** | Job becomes `cancelled`, lock removed, outlets regain access |
| **Status**   | ✅ HANDLED                                                   |
| **Evidence** | `discardExtractionChanges()` sets job status to `cancelled`  |
| **Notes**    | `useMasterJobStatus` auto-detects status change, unblocks UI |

#### Case 47: Master approves review (Save)

| Aspect       | Detail                                                          |
| ------------ | --------------------------------------------------------------- |
| **Scenario** | Master preview_ready, master hits Save                          |
| **Expected** | Job becomes `completed`, lock removed, outlets see updated menu |
| **Status**   | ✅ HANDLED                                                      |
| **Evidence** | `applyExtractionChanges()` sets job status to `completed`       |
| **Notes**    | Outlet menu refreshes on next load with resolved master data    |

---

### Set #6 — Job Ownership & Scope (Cases 48-50)

#### Case 48: Master pending review should lock outlets via masterProjectId (not outlet projectId)

| Aspect         | Detail                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------- |
| **Scenario**   | Master job pending for `masterProjectId`, outlet opens project                           |
| **Bug Risk**   | Outlet not blocked if checking only outlet's `projectId`                                 |
| **Resolution** | Check both local job AND master job                                                      |
| **Status**     | ✅ HANDLED                                                                               |
| **Evidence**   | `projects/index.tsx:210-214` — Uses both `useMenuProcessingJob` and `useMasterJobStatus` |

#### Case 49: Outlet pending review must NOT lock master

| Aspect       | Detail                                                                    |
| ------------ | ------------------------------------------------------------------------- |
| **Scenario** | Outlet uploads extraction → preview_ready on outlet project               |
| **Expected** | Master is NOT blocked — outlet review is isolated                         |
| **Status**   | ✅ HANDLED                                                                |
| **Evidence** | Master has no `masterProjectId`, so `useMasterJobStatus` returns inactive |

#### Case 50: Two outlets extract same project type at same time (different stores)

| Aspect       | Detail                                                       |
| ------------ | ------------------------------------------------------------ |
| **Scenario** | Outlet A and Outlet B both extract their linked projects     |
| **Expected** | Both allowed — jobs are per-project, not per-chain           |
| **Status**   | ✅ HANDLED                                                   |
| **Evidence** | Each outlet has separate `projectId`, separate job documents |

---

### Set #7 — One Active Job Per Project (Cases 51-53)

#### Case 51: Master tries to start 2nd extraction while first is pending/processing/preview_ready

| Aspect       | Detail                                                                            |
| ------------ | --------------------------------------------------------------------------------- |
| **Scenario** | Start extraction, before it finishes, upload again                                |
| **Expected** | Reject new job creation                                                           |
| **Status**   | ✅ HANDLED                                                                        |
| **Evidence** | `useMenuProcessingJob` tracks active job; UI prevents new upload while job active |
| **Notes**    | Upload button disabled when `jobIsProcessing` or `jobIsPreviewReady`              |

#### Case 52: Outlet tries to start extraction while outlet already has preview_ready

| Aspect       | Detail                               |
| ------------ | ------------------------------------ |
| **Expected** | Same rejection — one job per project |
| **Status**   | ✅ HANDLED                           |
| **Evidence** | Same logic as Case 51                |

#### Case 53: Outlet tries extraction while master is pending review

| Aspect       | Detail                                                      |
| ------------ | ----------------------------------------------------------- |
| **Expected** | Block job creation — outlet is locked by master job         |
| **Status**   | ✅ HANDLED                                                  |
| **Evidence** | `ExtractionJobBlockingOverlay` prevents access to upload UI |

---

### Set #8 — TTL / Expiry Safety (Cases 54-55)

#### Case 54: Master preview_ready expires after 24h

| Aspect       | Detail                                                    |
| ------------ | --------------------------------------------------------- |
| **Scenario** | Master extraction preview_ready, no action for 24h        |
| **Expected** | Job auto-marked `expired`, chain unlocks, no data changed |
| **Status**   | ✅ HANDLED                                                |
| **Evidence** | `processMenuImagesJob.ts` sets `expiresAt` = now + 24h    |
| **Notes**    | Backend scheduler cleans up expired jobs                  |

#### Case 55: Outlet preview_ready expires after 24h

| Aspect       | Detail                                 |
| ------------ | -------------------------------------- |
| **Expected** | Only outlet unlocks, master unaffected |
| **Status**   | ✅ HANDLED                             |
| **Evidence** | Job expiry is per-job, not per-chain   |

---

### Set #9 — Override Integrity & Orphan Protection (Cases 56-58)

#### Case 56: Outlet saves override but master item no longer exists

| Aspect         | Detail                                                       |
| -------------- | ------------------------------------------------------------ |
| **Scenario**   | Outlet preview proposes override for `masterItemId=X`        |
|                | Before save, master removes item X                           |
| **Risk**       | Orphan override saved for non-existent item                  |
| **Resolution** | Orphan overrides are harmless — ignored at read-time         |
| **Status**     | ✅ HANDLED (graceful)                                        |
| **Evidence**   | `resolveProject.ts:148` — Only iterates `masterItems`        |
| **Notes**      | No write-time validation needed. Extra Firestore read = cost |

#### Case 57: Master disables item (active=false) → outlet override price exists

| Aspect       | Detail                                                                   |
| ------------ | ------------------------------------------------------------------------ |
| **Scenario** | Outlet has override price on item X, master sets X `active=false`        |
| **Expected** | Item hidden everywhere — master rule wins                                |
| **Status**   | ✅ HANDLED                                                               |
| **Evidence** | `resolveProject.ts:163-164` — `.filter((item) => item.active !== false)` |
| **Notes**    | Override remains stored but not rendered                                 |

#### Case 58: Master changes price while outlet override exists

| Aspect       | Detail                                                   |
| ------------ | -------------------------------------------------------- |
| **Scenario** | Master 499→599, outlet override 699, master 599→499      |
| **Expected** | Outlet shows 699 always until override removed           |
| **Status**   | ✅ HANDLED                                               |
| **Evidence** | `resolveProject.ts:155` — `override.price ?? item.price` |
| **Notes**    | Critical: override never auto-deleted by master changes  |

---

### Set #10 — Duplicate Names & Ambiguity (Cases 59-60)

#### Case 59: Same item name appears twice in master under different categories

| Aspect         | Detail                                                                |
| -------------- | --------------------------------------------------------------------- |
| **Scenario**   | Master has "Fries" in Starters + Combos, extraction finds "Fries"     |
| **Risk**       | Wrong match → duplicate created or wrong item updated                 |
| **Resolution** | Category is **tie-breaker** (+0.05 bonus), not hard gate              |
| **Status**     | ✅ HANDLED                                                            |
| **Evidence**   | `comparisonEngine.ts:167` — `CATEGORY_MATCH_BONUS = 0.05`             |
| **Notes**      | Same-category match wins; cross-category only if significantly better |

#### Case 60: Similar names: "Sandwich" vs "Sandwiches"

| Aspect       | Detail                                                     |
| ------------ | ---------------------------------------------------------- |
| **Scenario** | Existing item "Sandwich", extraction returns "Sandwiches"  |
| **Expected** | Similarity match triggers, preserves old ID (no duplicate) |
| **Status**   | ✅ HANDLED                                                 |
| **Evidence** | `similarity.ts:108` — `SIMILARITY_THRESHOLD: 0.90`         |
| **Notes**    | Warning shown if score in 0.90-0.95 band (weak match)      |

---

### Set #11 — Multi-Project Reality (Cases 61-62)

#### Case 61: Outlet wants independent menu → must create separate project not linked to master

| Aspect       | Detail                                                            |
| ------------ | ----------------------------------------------------------------- |
| **Scenario** | Outlet creates new project "Outlet Specials", extracts, publishes |
| **Expected** | No master linkage, full freedom, no chain lock dependency         |
| **Status**   | ✅ HANDLED                                                        |
| **Evidence** | `masterProjectId` is optional per-project                         |

#### Case 62: Outlet linked project must always have master (chain rule)

| Aspect       | Detail                                                  |
| ------------ | ------------------------------------------------------- |
| **Scenario** | Outlet project has `masterProjectId` but master deleted |
| **Expected** | Publish blocked — no "half-chain" allowed               |
| **Status**   | ✅ HANDLED                                              |
| **Evidence** | `projects/index.ts:520-545` — Publish validation        |

---

### Set #12 — UI Hard-Block Behavior (Cases 63-64)

#### Case 63: Review screen cannot be closed without action

| Aspect       | Detail                                                     |
| ------------ | ---------------------------------------------------------- |
| **Scenario** | preview_ready appears, try back, tab switch, navigate away |
| **Expected** | Hard block: user must Save or Discard                      |
| **Status**   | ✅ HANDLED                                                 |
| **Evidence** | `ExtractionJobReviewModal` is modal with no close button   |
| **Notes**    | User can only proceed via Save or Discard buttons          |

#### Case 64: App reload during preview_ready

| Aspect       | Detail                                                           |
| ------------ | ---------------------------------------------------------------- |
| **Scenario** | preview_ready shown, reload browser                              |
| **Expected** | On load, job listener detects preview_ready, shows review screen |
| **Status**   | ✅ HANDLED                                                       |
| **Evidence** | `useMenuProcessingJob` re-subscribes on mount                    |

---

### Set #13 — Edge Cases Not Implemented (By Design)

#### Case 65: Two master users review same extraction simultaneously

| Aspect                 | Detail                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------- |
| **ChatGPT Suggestion** | Add `reviewLockBy=uId` and `reviewLockAt` to prevent conflict                      |
| **Status**             | 🔒 REJECTED                                                                        |
| **Reason**             | Adds complexity. Per MenuList constitution: "If it makes owner think, don't ship." |
| **Notes**              | Last write wins. Acceptable for MVP.                                               |

#### Case 66: Master extraction changes category name slightly → outlet matching affected

| Aspect              | Detail                                                        |
| ------------------- | ------------------------------------------------------------- |
| **ChatGPT Concern** | "Starters" → "Starter" might break item matching              |
| **Status**          | ✅ HANDLED (not a problem)                                    |
| **Evidence**        | Category is tie-breaker, not gate. Items still match by name. |

#### Case 67: Outlet extraction when master has no menu

| Aspect                 | Detail                                                    |
| ---------------------- | --------------------------------------------------------- |
| **ChatGPT Suggestion** | Block extraction if master is empty                       |
| **Status**             | 🔒 REJECTED                                               |
| **Reason**             | Valid use case: outlet can extract before master is ready |
| **Notes**              | Extracted items become local-only or new items            |

#### Case 68: Outlet override conflicts with pricing integrity system

| Aspect                 | Detail                                             |
| ---------------------- | -------------------------------------------------- |
| **ChatGPT Suggestion** | Add "pricing integrity drift" telemetry            |
| **Status**             | 🔒 DEFERRED to P1                                  |
| **Reason**             | Nice-to-have telemetry, not breaking functionality |

#### Case 69: Master approves, outlets show stale cache

| Aspect                 | Detail                                               |
| ---------------------- | ---------------------------------------------------- |
| **ChatGPT Suggestion** | Real-time listener or force refresh                  |
| **Status**             | 🔒 DEFERRED                                          |
| **Reason**             | React SWR handles most cases. Real-time = overkill   |
| **Notes**              | Page refresh shows updated data. Acceptable for MVP. |

---

## Part 9: Updated Test Summary (Jan 25, 2026)

### Final Implementation Coverage

| Category                 | Total   | ✅ Handled    | ⚠️ Partial | 🔒 Deferred/Rejected |
| ------------------------ | ------- | ------------- | ---------- | -------------------- |
| Scenarios (1-41)         | 41      | 35            | 4          | 2                    |
| Chain Extraction (42-69) | 28      | 23            | 0          | 5                    |
| QA Tests (T1-T40)        | 40      | 33            | 2          | 5                    |
| Write Operations         | 15      | 14            | 0          | 1                    |
| **Overall**              | **124** | **105 (85%)** | **6 (5%)** | **13 (10%)**         |

### New Components Added (Jan 25, 2026)

| Component                      | Purpose                                  | File                                                  |
| ------------------------------ | ---------------------------------------- | ----------------------------------------------------- |
| `useMasterJobStatus`           | Real-time listener for master job status | `src/hooks/useMasterJobStatus.ts`                     |
| `ExtractionJobBlockingOverlay` | Hard-block UI when job active            | `src/components/.../ExtractionJobBlockingOverlay.tsx` |

### Key Design Decisions

| Decision                      | Resolution                                | Rationale                         |
| ----------------------------- | ----------------------------------------- | --------------------------------- |
| Master lock inheritance       | Real-time listener (`useMasterJobStatus`) | No Firestore field, no stale data |
| Orphan override validation    | Handle at read-time, not write-time       | Extra read = cost + latency       |
| Multi-reviewer lock           | Last write wins                           | Complexity vs value tradeoff      |
| Category matching             | Tie-breaker bonus, not hard gate          | Handles slight name variations    |
| Stale cache after master save | SWR handles, defer real-time              | Overkill for MVP                  |

---

## Part 10: Chain Permission & Governance Cases (70-90)

> **Added:** January 26, 2026  
> **Source:** ChatGPT Deep Analysis — Chain Permission & Governance Edge Cases  
> **Purpose:** Document permission enforcement, Firestore security, and operational edge cases

### Overview

These cases cover permission enforcement, Firestore security rules, similarity matching safety, and operational edge cases for chain stores.

---

### Set #9 — Permission & Governance (Cases 70-72)

#### Case 70: Outlet user tries to use AI tools indirectly (API/cached UI)

| Aspect              | Detail                                                                               |
| ------------------- | ------------------------------------------------------------------------------------ |
| **ChatGPT Concern** | Outlet can trigger extraction/description/image gen via API even if UI hides buttons |
| **Status**          | ⚠️ PARTIAL                                                                           |
| **Evidence**        | Types exist: `StorePermissions` in `multiOutlet.types.ts:136-144`                    |
| **Gap**             | Server-side enforcement NOT implemented in API routes                                |
| **Priority**        | P1 — Not blocking for launch if store managers are trusted                           |

#### Case 71: Outlet changes theme/branding/layout → brand breaks

| Aspect              | Detail                                                                     |
| ------------------- | -------------------------------------------------------------------------- |
| **ChatGPT Concern** | Outlet modifies theme/colors/logo → brand inconsistency                    |
| **Status**          | ⚠️ PARTIAL                                                                 |
| **Evidence**        | Types exist: `canOverrideTheme/canOverrideBrandIdentity/canOverrideLayout` |
| **Gap**             | UI enforcement NOT implemented (editor not disabled based on permissions)  |
| **Priority**        | P1 — Defer to post-launch                                                  |

#### Case 72: Outlet edits master-linked project via direct Firestore write

| Aspect              | Detail                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------- |
| **ChatGPT Concern** | Weak Firestore rules allow outlet to write to `extractedData.*` or `files[]`           |
| **Status**          | ✅ HANDLED                                                                             |
| **Evidence**        | `firestore.rules:23-37` — `isValidOutletUpdate()` blocks writes to `files[]`           |
| **Implementation**  | If `masterProjectId` exists, only allow writes that don't modify `files` or `masterId` |
| **Notes**           | Added Jan 26, 2026                                                                     |

---

### Set #10 — Linking & Project Alignment (Cases 73-75)

#### Case 73: Outlet links wrong project type (Food menu linked to Bar master)

| Aspect                 | Detail                                                |
| ---------------------- | ----------------------------------------------------- |
| **ChatGPT Suggestion** | Add `projectKind` field (Food/Bar/Dessert)            |
| **Status**             | 🔒 REJECTED                                           |
| **Reason**             | Low value, high complexity. Already rejected.         |
| **Notes**              | Per existing test cases: "low value, high complexity" |

#### Case 74: Outlet switches master → local-only items remain

| Aspect                 | Detail                                      |
| ---------------------- | ------------------------------------------- |
| **ChatGPT Suggestion** | Show "Local items exist" badge after switch |
| **Status**             | 🔒 DEFERRED                                 |
| **Reason**             | Nice-to-have polish, not P0                 |
| **Priority**           | P2                                          |

#### Case 75: Master has 2 projects with same name

| Aspect                 | Detail                                                    |
| ---------------------- | --------------------------------------------------------- |
| **ChatGPT Suggestion** | Show created date, modified date, item count in selection |
| **Status**             | 🔒 DEFERRED                                               |
| **Reason**             | UX enhancement, not functional gap                        |
| **Priority**           | P2                                                        |

---

### Set #11 — Publishing & Customer-Facing (Cases 76-78)

#### Case 76: Outlet published menu while master becomes pending review

| Aspect              | Detail                                                                            |
| ------------------- | --------------------------------------------------------------------------------- |
| **ChatGPT Concern** | Public menu traffic while master is pending review                                |
| **Status**          | ✅ HANDLED                                                                        |
| **Evidence**        | Preview gating exists — extraction stored in job draft, not applied until Approve |
| **Notes**           | Customers see last stable master menu. Outlet UI blocked during review.           |

#### Case 77: Master pending review for 12+ hours blocks outlets

| Aspect                 | Detail                                 |
| ---------------------- | -------------------------------------- |
| **ChatGPT Suggestion** | Add banner reminder for pending review |
| **Status**             | 🔒 DEFERRED                            |
| **Evidence**           | TTL auto-unlock (24h) already exists   |
| **Reason**             | Optional polish, not functional gap    |
| **Priority**           | P3                                     |

#### Case 78: Outlet override exists but master item becomes inactive

| Aspect              | Detail                                                                   |
| ------------------- | ------------------------------------------------------------------------ |
| **ChatGPT Concern** | Override data stored forever                                             |
| **Status**          | ✅ HANDLED                                                               |
| **Evidence**        | `resolveProject.ts:163-164` — `.filter((item) => item.active !== false)` |
| **Notes**           | Resolver ignores inactive items. Override data harmless.                 |

---

### Set #12 — Extraction Similarity Safety (Cases 79-82)

#### Case 79: Similarity mismatch causes wrong overrides

| Aspect              | Detail                                                               |
| ------------------- | -------------------------------------------------------------------- |
| **ChatGPT Concern** | Weak similarity match → override applied to wrong item               |
| **Status**          | ✅ HANDLED                                                           |
| **Evidence**        | `comparisonEngine.ts:327-330` — `matchType === 'weak'` shows warning |
| **Implementation**  | Matches in 0.90-0.95 band flagged as "Needs Attention" in preview    |
| **Notes**           | `weakMatches` counter in stats, severity: MEDIUM in warnings         |

#### Case 80: Outlet extraction introduces 20 overrides accidentally

| Aspect                 | Detail                                                      |
| ---------------------- | ----------------------------------------------------------- |
| **ChatGPT Suggestion** | Show "High impact change" label if overrides > X            |
| **Status**             | ✅ HANDLED                                                  |
| **Evidence**           | `comparisonEngine.types.ts:302` — `weakMatches` in stats    |
| **Notes**              | Preview shows override count. User decides before applying. |

#### Case 81: Outlet extraction includes invalid price override

| Aspect              | Detail                                                  |
| ------------------- | ------------------------------------------------------- |
| **ChatGPT Concern** | AI misreads price → override with empty/invalid price   |
| **Status**          | ✅ HANDLED                                              |
| **Evidence**        | `comparisonEngine.ts:444` — `isValidPrice()` validation |
| **Implementation**  | Invalid prices skipped, not applied as override         |

#### Case 82: Master extraction changes IDs due to similarity miss

| Aspect              | Detail                                                  |
| ------------------- | ------------------------------------------------------- |
| **ChatGPT Concern** | ID instability → orphaned overrides                     |
| **Status**          | ⚠️ PARTIAL                                              |
| **Evidence**        | Case 31 already documented this as partial              |
| **Gap**             | No explicit ID mapping layer                            |
| **Priority**        | P1 — Monitor in production, add mapping if issues arise |

---

### Set #13 — Chain Operational Edge Cases (Cases 83-90)

#### Case 83: Outlet is closed permanently

| Aspect                 | Detail                                         |
| ---------------------- | ---------------------------------------------- |
| **ChatGPT Suggestion** | Keep data, disable publishing, mark inactive   |
| **Status**             | ✅ HANDLED                                     |
| **Evidence**           | Store `active` flag exists in store data model |
| **Notes**              | Soft delete pattern. Data retained for audit.  |

#### Case 84: Outlet temporarily pauses operations (renovation)

| Aspect                 | Detail                             |
| ---------------------- | ---------------------------------- |
| **ChatGPT Suggestion** | "Pause Menu" toggle                |
| **Status**             | ✅ HANDLED                         |
| **Evidence**           | Reuse store `active` flag          |
| **Notes**              | Already exists in store data model |

#### Case 85: Outlet manager tries to override 500 items

| Aspect              | Detail                                                              |
| ------------------- | ------------------------------------------------------------------- |
| **ChatGPT Concern** | Document size growth                                                |
| **Status**          | 🔒 NOT NEEDED                                                       |
| **Reason**          | Firestore doc size self-limiting. Redundant overrides auto-cleaned. |
| **Notes**           | `isAvailabilityOverrideRedundant`/`isPriceOverrideRedundant` exist  |

#### Case 86: Outlet creates local-only category and later deletes it

| Aspect              | Detail                                                                    |
| ------------------- | ------------------------------------------------------------------------- |
| **ChatGPT Concern** | Local-only items inside become orphan                                     |
| **Status**          | ✅ HANDLED                                                                |
| **Evidence**        | `editorOperations.ts:101-118` — `deleteCategory()` also deletes its items |
| **Notes**           | Confirmation modal warns: "This will also delete X items."                |

#### Case 87: Outlet wants local-only menu project (never link)

| Aspect                 | Detail                                               |
| ---------------------- | ---------------------------------------------------- |
| **ChatGPT Suggestion** | Block linking forever for "Local Menu Only" projects |
| **Status**             | 🔒 NOT NEEDED                                        |
| **Reason**             | Scope creep, creates edge case complexity            |
| **Notes**              | User can simply not link. No enforcement needed.     |

#### Case 88: Master wants to see what outlets changed

| Aspect                 | Detail                                            |
| ---------------------- | ------------------------------------------------- |
| **ChatGPT Suggestion** | Dashboard showing outlet changes                  |
| **Status**             | 🔒 BY DESIGN                                      |
| **Reason**             | Violates MenuList silence doctrine                |
| **Notes**              | MOL is internal only. No UI surface per doctrine. |

#### Case 89: Outlet overrides price but master changes currency formatting

| Aspect              | Detail                                                  |
| ------------------- | ------------------------------------------------------- |
| **ChatGPT Concern** | ₹499 → 499 INR breaks string compare                    |
| **Status**          | 🔒 NOT NEEDED                                           |
| **Reason**          | Existing Pricing Integrity validates format at input    |
| **Notes**           | Price stored as validated string. No normalization gap. |

#### Case 90: Chain-wide outage: master project missing

| Aspect              | Detail                                                        |
| ------------------- | ------------------------------------------------------------- |
| **ChatGPT Concern** | Master doc deleted/corrupted → outlets unusable               |
| **Status**          | ✅ HANDLED                                                    |
| **Evidence**        | `resolveProject.ts:117-131` — Graceful fallback               |
| **Implementation**  | If master missing → return store as standalone with warning   |
| **Notes**           | No crash. Shows outlet raw data. Banner: "Master unavailable" |

---

## Part 11: Updated Test Summary (Jan 26, 2026)

### Final Implementation Coverage

| Category                 | Total   | ✅ Handled    | ⚠️ Partial | 🔒 Deferred/Rejected |
| ------------------------ | ------- | ------------- | ---------- | -------------------- |
| Scenarios (1-41)         | 41      | 35            | 4          | 2                    |
| Chain Extraction (42-69) | 28      | 23            | 0          | 5                    |
| Chain Permission (70-90) | 21      | 13            | 3          | 5                    |
| QA Tests (T1-T40)        | 40      | 33            | 2          | 5                    |
| Write Operations         | 15      | 14            | 0          | 1                    |
| **Overall**              | **145** | **118 (81%)** | **9 (6%)** | **18 (12%)**         |

### New Security Rules Added (Jan 26, 2026)

| Rule                    | Purpose                                       | File              |
| ----------------------- | --------------------------------------------- | ----------------- |
| `isValidOutletUpdate()` | Block outlet writes to `files[]` & `masterId` | `firestore.rules` |

### Partial Items Requiring P1 Attention

| Case | Description                    | Gap                              |
| ---- | ------------------------------ | -------------------------------- |
| 70   | AI tool permission enforcement | Server-side checks not in routes |
| 71   | Theme/branding lock            | UI not disabled based on perms   |
| 82   | Master ID stability            | No explicit mapping layer        |

---

## Part 12: Deep E2E Review Summary (Jan 26, 2026)

### Review Scope

Comprehensive review of the entire multi-outlet implementation including:

- E2E workflow and data flow verification
- Docs ↔ codebase alignment check
- Firebase cost analysis
- Scalability and optimization assessment

### E2E Flow Verification ✅

| Component              | Integration Point                        | Status     |
| ---------------------- | ---------------------------------------- | ---------- |
| **Editor.tsx**         | `resolveProjectForRender()` on mount     | ✅ Working |
| **B2C Client Page**    | Server-side resolution for customer view | ✅ Working |
| **Comparison Engine**  | OUTLET_LINKED mode for AI extraction     | ✅ Working |
| **useMasterJobStatus** | Blocks outlet UI during master jobs      | ✅ Working |

### Docs ↔ Code Alignment ✅

All spec requirements verified against implementation:

- FR-4.1 Read-time resolution ✅
- FR-5 Override fields ✅
- FR-6 Locked fields ✅
- FR-7 Local-only prefixes ✅
- FR-11 Chain consistency ✅
- FR-13 ID stability ✅

### Firebase Optimization Added (Jan 26, 2026)

**Master Project Cache** implemented in `resolveProject.ts`:

| Feature      | Detail                                            |
| ------------ | ------------------------------------------------- |
| TTL          | 30 seconds                                        |
| Scope        | Per masterProjectId                               |
| Invalidation | `invalidateMasterCache(id)`, `clearMasterCache()` |
| Cleanup      | Auto-purge when cache > 100 entries               |

**Cost Reduction:**

- Before: 2 reads per outlet render
- After: 1-2 reads (1 if cached)
- Monthly savings: ~$0.03 (25% reduction)

### ChatGPT "Blockers" Validation

| Blocker                 | ChatGPT Claim                  | Actual Status                           | Decision        |
| ----------------------- | ------------------------------ | --------------------------------------- | --------------- |
| Case 70: Server guard   | API needs permission check     | LOW risk — Firestore rules block        | Skip            |
| Case 71: UI permissions | Buttons not disabled           | UX polish only                          | Defer P1        |
| Case 82: ID stability   | IDs change on re-extract       | **FALSE** — Comparison engine preserves | Already handled |
| Price validation        | Overrides not validated        | **FALSE** — `isValidPrice()` used       | Already handled |
| Master lock             | Outlets edit during master job | **FALSE** — `useMasterJobStatus` blocks | Already handled |

### Final Assessment

| Metric               | Status                                         |
| -------------------- | ---------------------------------------------- |
| Feature completeness | ✅ Production ready                            |
| Security             | ✅ Tenant isolation + Firestore rules          |
| Performance          | ✅ 2-read architecture + cache                 |
| Firebase costs       | ✅ Negligible (~$0.18/month for 100 outlets)   |
| Scalability          | ✅ No bottlenecks for target ICP (2-10 stores) |

### Code Quality Observations

**Strengths:**

- Feature flag gating on all paths
- Cross-tenant validation in DAL
- Strong typing with `InheritanceState`, `ProjectOverrides`
- MOL audit logging

**Minor improvements made:**

- Added master cache (30s TTL) to reduce reads
- Updated "5 second propagation" → "instant" in docs

---

## References

- `multi-outlet-consistency_impl.md` — Technical blueprint
- `multi-outlet-consistency_validation.md` — Implementation validation
- `multi-outlet-consistency_roadmap.md` — Filtered feature roadmap
- `ai-extraction-integration.md` — AI extraction workflow documentation
- `constitution/08-feature-rejection-gate.md` — Feature approval criteria
