# Multi-Store Menu Consistency — Product Specification

**Feature:** #4 — Multi-Store Menu Consistency  
**Document Type:** Non-Technical PRD  
**Status:** Implemented source evidence; not current launch certification
**Priority:** P0 (Feature #4 — LOCKED)  
**Original Date:** January 20, 2026  
**Last Reviewed:** July 2, 2026
**Author:** Lead Architect  
**Target ICP:** Premium SMB Groups (2–10 stores)

> **Launch Boundary:** This PRD records implemented Multi-Outlet requirements and source evidence, not current production-launch approval. Current release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, `npm run verify:multi-location-boundary`, desktop/mobile Locations browser QA, linked outlet save QA, Razorpay sandbox evidence where billing is involved, Firebase deploy evidence where rules/functions change, and target-environment smoke.

> **Post-Implementation Notes (Feb 13, 2026):** This spec was written pre-implementation. The core business requirements below remain accurate. The following capabilities were added during implementation and are documented in their respective docs:
>
> - **Store Onboarding (Feature #4C):** Outlet creation, deactivation, billing — see [store-onboarding/](./store-onboarding/)
> - **Chain Control Panel:** Locations page with store table, billing summary — see [store-onboarding/](./store-onboarding/)
> - **Outlet Policy (15 flags):** HQ controls what outlets can do — see [multi-chain-permissions/](../multi-chain-permissions/)
> - **Staff Roles (23 permissions):** Role-based access control — see [roles-permissions/](../roles-permissions/)
> - **Master Updates Awareness (#4.1):** Signal doc pattern for operational change detection — see [master-updates-awareness_impl.md](./master-updates-awareness_impl.md)

> **Final Verification Note (May 19, 2026):** Actual Chrome + Firebase QA verified mobile and desktop outlet menu editing with local-only `L_I_` / `L_C_` records, HQ/outlet switching, Firebase Auth claim refresh, and master-store isolation. Linked outlet saves now route through `/api/projects/outlet-save`, which enforces local ID prefixes and disabled OutletPolicy flags server-side before writing.

---

## Executive Summary

### What Is This?

Multi-Store Menu Consistency enables premium restaurant groups to run **one master menu** across multiple stores with controlled local flexibility—without manual syncing, drift, or menu dilution.

### Why Does This Matter?

Premium groups with 2–10 stores face constant drift:

- Item names differ across stores
- Prices drift silently without HQ knowing
- Items disappear at certain locations
- Store managers make unapproved edits
- HQ cannot trust what guests are seeing

This creates a recurring mental burden:

> "Is every store showing the same tenant menu?"

### The Promise

> **"Run every store from one master menu."**

HQ updates menu once → linked stores inherit the saved changes through the outlet sync/cache path → brand-critical fields stay consistent by default.

---

## Goals

| Goal                              | Success Metric                                   |
| --------------------------------- | ------------------------------------------------ |
| **Eliminate menu drift**          | Zero brand inconsistencies across stores         |
| **Remove HQ mental load**         | HQ never manually "syncs" anything               |
| **Enable controlled flexibility** | Stores can adjust prices/availability safely     |
| **Protect brand integrity**       | Core menu items remain consistent                |
| **Enable silent autonomy**        | System works without explanation or notification |

---

## Who This Is For (ICP)

### ✅ Target Customers

Premium SMB groups:

- **Restaurant groups** (fine-dine + casual, 2–10 stores)
- **Café chains** (premium, multiple branches)
- **Clubs / lounges** (multiple venues)
- **Boutique hospitality groups**

### ❌ Not Designed For

- Low-end single-store SMB
- Franchise networks needing billing/royalty logic
- Heavy enterprise workflows with approval chains
- Independent restaurants (no multi-store need)

---

## Scope

### ✅ In Scope (P0 — Must Ship)

| Capability                          | Description                                     | Status |
| ----------------------------------- | ----------------------------------------------- | ------ |
| **Enable Multi-Store per Tenant**   | Feature flag gated, opt-in per tenant           | NEW    |
| **Create/Designate Master Project** | Mark any project as master menu source          | NEW    |
| **Link Store to Master**            | Connect store project to inherit from master    | NEW    |
| **Instant Propagation**             | Master changes reflect everywhere immediately   | NEW    |
| **Store Price Override**            | Stores can adjust prices locally                | NEW    |
| **Store Availability Override**     | Stores can mark items unavailable               | NEW    |
| **Category Order Override**         | Stores can reorder categories locally           | NEW    |
| **Local-Only Items**                | Stores can add store-specific items             | NEW    |
| **Local-Only Categories**           | Stores can add store-specific categories        | NEW    |
| **Visual Inheritance Badges**       | UI shows inherited vs overridden vs local       | NEW    |
| **Master Protection Rules**         | Brand-critical fields locked on inherited items | NEW    |
| **Audit Logging (MOL)**             | All master/override actions logged              | NEW    |

### ❌ Out of Scope (Explicit Exclusions)

| Excluded                    | Reason                           |
| --------------------------- | -------------------------------- |
| Store vs store analytics    | Violates "silence" doctrine      |
| Franchise billing logic     | Not MenuList domain              |
| Approval workflows          | Creates cognitive load           |
| "Promote local to master"   | HQ-only action, defer to manual  |
| POS integrations expansion  | External system complexity       |
| Swiggy/Zomato sync          | External channel, out of control |
| AI suggestions/explanations | No AI rewrite loops here         |
| Manual sync buttons         | System is autonomous             |

---

## Core Concepts

### 1. Master Store & Master Projects

The **first store** in a chain is the master store. All projects in this store are automatically master projects.

- Master identified at **store level** via `storesSummary.stores[sId].isMaster: true`
- No `isMaster` flag on individual projects — all projects in master store are masters
- Editable by HQ Admin only
- Contains the brand's canonical menu structure(s)
- Each master project can be linked to corresponding store projects

### 2. Store Project

A store's project that **inherits from a master project**.

- Linked using `masterProjectId` field (top-level, not nested)
- `tId` and `sId` extracted from projectId format: `{tId}-{timestamp}-{sId}`
- Shows master menu by default
- Stores only **overrides** and **local-only additions**
- Cannot edit brand-critical fields on inherited items

### 3. Inherited vs Overridden vs Local-Only

MenuList must clearly distinguish:

| Type           | Definition                         | Example                                  |
| -------------- | ---------------------------------- | ---------------------------------------- |
| **Inherited**  | Came from master, unchanged        | "Truffle Pasta" at ₹899 (same as master) |
| **Overridden** | Came from master, modified locally | "Truffle Pasta" at ₹949 (price changed)  |
| **Local-Only** | Created at store, never syncs      | "Chef's Special" (store-specific)        |

---

## User Stories

### US-1: HQ Creates Master Menu

**As a** restaurant group HQ admin  
**I want to** designate one project as our master brand menu  
**So that** all stores start from the same foundation

**Acceptance Criteria:**

- Can mark any project as "Master"
- Master project shows "Master Menu" badge
- Can see list of stores linked to this master
- Editing master propagates to all linked stores

### US-2: Store Inherits Master Menu

**As an** store manager  
**I want to** see our brand's master menu automatically  
**So that** I don't have to manually copy or sync

**Acceptance Criteria:**

- Linking to master shows all master items/categories
- Inherited items show "Inherited from Master" badge
- Store menu is consistent with brand by default

### US-3: Store Overrides Price

**As an** store manager  
**I want to** adjust prices for my location  
**So that** I can account for local costs/demand

**Acceptance Criteria:**

- Can change price on inherited items
- Override shows "Price overridden" badge
- Original master price is still visible for reference
- Master price changes don't overwrite my override

### US-4: Store Adds Local Item

**As an** store manager  
**I want to** add a "Chef's Special" unique to my store  
**So that** I can offer location-specific dishes

**Acceptance Criteria:**

- Can create new items marked as local-only
- Local items show "Local-only" badge
- Local items never sync to master or other stores
- HQ can view local items if they access store

### US-5: Master Update Propagates

**As a** HQ admin  
**I want to** add a new menu item once  
**So that** it appears at all stores automatically

**Acceptance Criteria:**

- Adding item to master appears at all linked stores
- Owner/editor propagation uses read-time resolution; customer menus still follow the current cache refresh window
- No manual sync button needed
- MOL logs propagation event

---

## Functional Requirements

### FR-1: Feature Flag

| Requirement | Detail                                                        |
| ----------- | ------------------------------------------------------------- |
| **FR-1.1**  | Feature gated by `FEATURE_FLAGS.ENABLE_MULTI_OUTLET`          |
| **FR-1.2**  | Default value is `false` (off)                                |
| **FR-1.3**  | When disabled, system behaves as current single-store product |

### FR-2: Master Project Designation

| Requirement | Detail                                               |
| ----------- | ---------------------------------------------------- |
| **FR-2.1**  | HQ Admin can mark any project as "Master"            |
| **FR-2.2**  | Sets `isMaster: true` on project document            |
| **FR-2.3**  | Master project cannot link to another master         |
| **FR-2.4**  | Master uses existing menu editor (no special editor) |

### FR-3: Store Linking

| Requirement | Detail                                              |
| ----------- | --------------------------------------------------- |
| **FR-3.1**  | HQ Admin can link store project to master           |
| **FR-3.2**  | Sets `masterProjectId` on store project (top-level) |
| **FR-3.3**  | Store inherits master menu immediately on link      |
| **FR-3.4**  | HQ Admin can unlink store (becomes standalone)      |

### FR-4: Read-Time Resolution (NOT Write Propagation)

| Requirement | Detail                                                           |
| ----------- | ---------------------------------------------------------------- |
| **FR-4.1**  | Changes reflect via read-time resolution (not write propagation) |
| **FR-4.2**  | No manual sync buttons                                           |
| **FR-4.3**  | No approval workflows                                            |
| **FR-4.4**  | Master changes reflect immediately on next menu render           |

**Clarification:** This is NOT "propagation within 5 seconds globally." Master changes are reflected **immediately** on the next render of any store menu. There is no background sync job — the resolver merges master + store data at read time.

### FR-5: Store Overrides (Allowed)

#### Category Overrides

| Field        | Allowed | Description                                         |
| ------------ | ------- | --------------------------------------------------- |
| `active`     | ✅ Yes  | Hide entire category at this store                  |
| `orderIndex` | ✅ Yes  | Local category ordering for store flow              |
| `timeSlots`  | ✅ Yes  | Store-specific operating hours (defaults to master) |

#### Item Overrides

| Field          | Allowed | Description                                        |
| -------------- | ------- | -------------------------------------------------- |
| `active`       | ✅ Yes  | Permanent hide (store never sells this item)       |
| `available`    | ✅ Yes  | Temporary sold-out status (reverts when restocked) |
| `price`        | ✅ Yes  | Local pricing for cost/demand adjustments          |
| `orderIndex`   | ✅ Yes  | Local item ordering within category                |
| `isBestSeller` | ✅ Yes  | Store can mark local bestsellers                   |
| `duration`     | ✅ Yes  | Prep time may vary by store kitchen                |
| `ownerBoost`   | ✅ Yes  | Store can boost/suppress local favorites           |

#### Attribute Overrides (Item Variants)

| Field        | Allowed | Description                         |
| ------------ | ------- | ----------------------------------- |
| `active`     | ✅ Yes  | Hide specific variant at this store |
| `price`      | ✅ Yes  | Local variant pricing               |
| `orderIndex` | ✅ Yes  | Local variant ordering              |

**Override Precedence Rules:**

| Rule   | Description                                                     |
| ------ | --------------------------------------------------------------- |
| **R1** | Store override ALWAYS wins over master until explicitly cleared |
| **R2** | Master price changes do NOT overwrite store overrides           |
| **R3** | Override deletion reverts to current master value               |
| **R4** | Redundant overrides (value equals master) may be auto-cleaned   |

**Active vs Available Precedence (CRITICAL):**

| Priority    | Condition         | Result                      | Notes                                         |
| ----------- | ----------------- | --------------------------- | --------------------------------------------- |
| 1 (highest) | `active=false`    | Item NOT shown              | Permanent hide — item never appears at store  |
| 2           | `available=false` | Item shown as "Unavailable" | Temporary sold-out — still visible but grayed |
| 3 (lowest)  | Both true         | Item shown normally         | Default state                                 |

**Master Item Deletion Behavior:**

| Scenario                           | Outcome                                           |
| ---------------------------------- | ------------------------------------------------- |
| Master item deleted                | Inherited item disappears from all stores         |
| Store had override on deleted item | Override becomes orphaned (silently ignored)      |
| Store needs replacement            | Store can create local-only item with `L_` prefix |

**Orphaned Override Handling:** When master deletes an item/category, any store overrides for that ID become orphaned. At render time, the resolver only applies overrides for IDs that exist in the master — orphaned overrides are silently ignored. No cleanup job needed; orphans are harmless garbage data.

### FR-6: Master Protection (Locked)

#### Category Locked Fields

| Field    | Locked | Reason                     |
| -------- | ------ | -------------------------- |
| `id`     | 🔒 Yes | Identifier — never changes |
| `name`   | 🔒 Yes | Brand name consistency     |
| `images` | 🔒 Yes | Brand visual identity      |

#### Item Locked Fields

| Field         | Locked | Reason                                       |
| ------------- | ------ | -------------------------------------------- |
| `id`          | 🔒 Yes | Identifier — never changes                   |
| `name`        | 🔒 Yes | Brand name consistency                       |
| `description` | 🔒 Yes | Brand description                            |
| `images`      | 🔒 Yes | Brand visual identity                        |
| `category`    | 🔒 Yes | Item categorization is brand-level           |
| `tags`        | 🔒 Yes | Dietary info (Veg/Non-Veg) is brand-critical |

#### Attribute Locked Fields

| Field  | Locked | Reason                            |
| ------ | ------ | --------------------------------- |
| `id`   | 🔒 Yes | Identifier — never changes        |
| `name` | 🔒 Yes | Variant name (Small/Medium/Large) |

### FR-7: Local-Only Additions

| Requirement | Detail                                                |
| ----------- | ----------------------------------------------------- |
| **FR-7.1**  | Store can add local-only items                        |
| **FR-7.2**  | Store can add local-only categories                   |
| **FR-7.3**  | Local-only content never syncs to master              |
| **FR-7.4**  | Local-only uses unique IDs (no collision with master) |

### FR-8: Visual Clarity (Required)

| Badge                     | When Shown                                |
| ------------------------- | ----------------------------------------- |
| **Inherited from Master** | Item/category came from master, unchanged |
| **Price Overridden**      | Item price differs from master            |
| **Hidden at this store**  | Item `active: false` locally              |
| **Unavailable**           | Item `available: false` locally           |
| **Local-only**            | Item/category created at store            |

### FR-9: Roles & Permissions

| Role              | Can Edit Master | Can Link/Unlink | Can Override | Can Add Local |
| ----------------- | --------------- | --------------- | ------------ | ------------- |
| **HQ Admin**      | ✅              | ✅              | ✅           | ✅            |
| **Store Manager** | ❌              | ❌              | ✅           | ✅            |

### FR-10: Audit Logging (MOL)

| Event                          | When Emitted            | Metadata                                       |
| ------------------------------ | ----------------------- | ---------------------------------------------- |
| `MASTER_MENU_UPDATED`          | Master project edited   | `{ projectId, changes }`                       |
| `STORE_LINKED_TO_MASTER`       | Store linked to master  | `{ storeProjectId, masterProjectId }`          |
| `STORE_UNLINKED_FROM_MASTER`   | Store unlinked          | `{ storeProjectId }`                           |
| `STORE_SWITCHED_MASTER`        | Store switched master   | `{ storeProjectId, newMasterProjectId }`       |
| `STORE_OVERRIDE_APPLIED`       | Store applies override  | `{ itemId, overrideType, oldValue, newValue }` |
| `STORE_OVERRIDE_REMOVED`       | Store clears override   | `{ itemId }`                                   |
| `STORE_LOCAL_ITEM_ADDED`       | Store adds local item   | `{ localItemId }`                              |
| `MASTER_PROPAGATION_COMPLETED` | System propagation done | `{ affectedStores }`                           |

### FR-11: Chain Consistency Constraint (NEW)

| Requirement | Detail                                                                   |
| ----------- | ------------------------------------------------------------------------ |
| **FR-11.1** | When multi-store is enabled for a tenant, at least one master MUST exist |
| **FR-11.2** | Unlinking an store when no other master exists is BLOCKED                |
| **FR-11.3** | Deleting the only master is BLOCKED (must designate another first)       |

### FR-12: Access-Based Store Permissions (NEW)

Master can control what features stores can access. Stored in `storesSummary.stores[sId].permissions`:

| Permission                 | Default | Description                                   |
| -------------------------- | ------- | --------------------------------------------- |
| `canOverrideTheme`         | `false` | Store can change theme/colors                 |
| `canOverrideBrandIdentity` | `false` | Store can change logo/brand images            |
| `canOverrideLayout`        | `false` | Store can change UI layout                    |
| `canUseMenuExtraction`     | `false` | Store can run AI extraction (new files)       |
| `canAddLanguages`          | `true`  | Store can enable languages from master's list |
| `canGenerateDescriptions`  | `true`  | Store can use AI description generation       |
| `canGenerateImages`        | `false` | Store can use AI image generation             |

**Data Model:**

```
storesSummary.stores[sId].permissions = {
  canOverrideTheme: boolean,
  canOverrideBrandIdentity: boolean,
  canOverrideLayout: boolean,
  canUseMenuExtraction: boolean,
  canAddLanguages: boolean,
  canGenerateDescriptions: boolean,
  canGenerateImages: boolean
}
```

**Enforcement:**

- UI: Hide/disable features based on permissions
- API: Validate permissions server-side before executing

**Language Permission Clarification:**

`canAddLanguages` does NOT mean "create new languages". It means:

- **Master store:** Can add any language to `store.activeLanguages` (up to `MAX_LANGUAGES_PER_PROJECT`)
- **Outlet store:** Can enable languages from master's `activeLanguages` only

Outlets CANNOT create new languages — they can only enable/disable languages that already exist in the master store's `activeLanguages` list. See `multi-language-translation_spec.md` → "Multi-Chain Language Governance" for full details.

### FR-13: ID Stability Guarantees (CRITICAL)

| Requirement | Detail                                                       |
| ----------- | ------------------------------------------------------------ |
| **FR-13.1** | Item/Category IDs MUST NEVER change after creation           |
| **FR-13.2** | Re-extraction on master MUST preserve existing IDs           |
| **FR-13.3** | Manual ID editing is BLOCKED in editor UI                    |
| **FR-13.4** | API rejects any payload that attempts to change existing IDs |

**Why this matters:**

- Store overrides are keyed by item ID
- If master re-extracts and AI generates new IDs → all overrides become orphaned
- Stores lose all their customizations silently

**Protection Strategy:**

| Scenario                | Handling                                                          |
| ----------------------- | ----------------------------------------------------------------- |
| Master re-extracts menu | AI must match items by name/similarity and preserve original IDs  |
| Master imports new file | Treat as additive — existing IDs unchanged, new items get new IDs |
| Master deletes item     | Item disappears; store overrides become orphaned (harmless)       |
| Accidental ID change    | Blocked at API level — validation rejects ID mutations            |

**Implementation Note:**
When master re-extracts, the extraction pipeline MUST:

1. Load existing item IDs from current project
2. Match extracted items to existing by name/description similarity
3. Assign existing IDs to matched items
4. Generate new IDs only for genuinely new items

---

## Non-Functional Requirements

### NFR-1: Backwards Compatibility

| Requirement                     | Detail                              |
| ------------------------------- | ----------------------------------- |
| All new fields MUST be optional | Existing projects unchanged         |
| No migrations required          | Zero breaking changes               |
| Single-store tenants unaffected | Behavior identical to current       |
| Project ID format unchanged     | `{tId}-{timestamp}-{sId}` preserved |

### NFR-2: Performance

| Metric               | Target                      |
| -------------------- | --------------------------- |
| Resolved menu render | ≤ 2 Firestore reads         |
| Propagation latency  | Instant (read-time merge)   |
| Master cache         | Server-side caching allowed |

### NFR-3: Security

| Requirement      | Detail                            |
| ---------------- | --------------------------------- |
| Tenant isolation | All queries respect `tId` + `sId` |
| Role enforcement | `canEditMaster` permission check  |
| Audit trail      | MOL logging for all actions       |

---

## Compatibility Requirements

### Data Model (Simplified Architecture)

```
storesSummary (platformSummary/storesSummary)
├── stores: {
│     [sId]: {
│       name: string
│       isMaster?: boolean       // NEW - marks store as master (first store in chain)
│       ...existing fields
│     }
│   }

Project (existing)
├── masterProjectId?: string     // NEW - top-level field for regular store projects
│                                // If present → linked to master; if absent → master project
├── overrides?: {                // NEW - store overrides
│     items: Record<itemId, ItemOverride>
│     categories: Record<catId, CategoryOverride>
│     attributes: Record<attrId, AttributeOverride>
│   }

// ItemOverride: { active?, available?, price?, orderIndex?, isBestSeller?, duration?, ownerBoost? }
// CategoryOverride: { active?, orderIndex?, timeSlots? }
// AttributeOverride: { active?, price?, orderIndex? }
```

**Key Simplifications:**

- `isMaster` at **store level**, not project level — all projects in master store are masters
- `masterProjectId` at **top level** (not nested) — enables direct Firestore querying
- `tId` and `sId` extracted from projectId format: `{tId}-{timestamp}-{sId}`
- No index collection needed — customer render is 2 reads only

**Note:** Project config (theme, settings) is NOT inherited — only menu data is synchronized.

### Storage Paths

- `projects/{tId}/{sId}/{projectId}` — No change
- `platformSummary/storesSummary` — Add `isMaster` flag to store entries
- `platformSummary/projects_{sId}` — No change

### Firebase Read Cost

| Scenario                      | Reads | Notes                                  |
| ----------------------------- | ----- | -------------------------------------- |
| Single-store (90% of clients) | 1     | Project only                           |
| Chain store render            | 2     | Project + Master                       |
| Chain detection               | 0     | Check `project.masterProjectId` exists |

### Multi-File Support

Multi-file projects (e.g., a 4-page PDF menu) are fully supported for both master and store projects:

- **Master project** contains full menu data across all `files[]`
- **Store project** only stores `overrides` (ID-based) — no file-level data
- **At render time:** Load master files → Apply store overrides by item/category ID
- **No file-level merging** — overrides are applied by ID, not by file

This architecture avoids complexity because store projects don't duplicate file structure.

---

## Operational Rules (Doctrine Alignment)

### Rule 1: Silence is a Feature

- No notifications for propagation
- No "sync status" nags
- No daily alerts about consistency

### Rule 2: Authority Transfer

- Master controls brand menu by default
- Store deviations are explicit overrides only
- System assumes master is authoritative

### Rule 3: No Cognitive Load

The system must be obvious:

- What's inherited (show badge)
- What's overridden (show badge)
- What's local-only (show badge/section)

---

## Acceptance Criteria (P0)

Feature #4 is considered complete when:

1. ☐ Multi-store can be enabled per tenant via feature flag
2. ☐ HQ can mark a project as master
3. ☐ Store project can be linked to a master
4. ☐ Store inherits master menu immediately
5. ☐ Store can override price/availability/active safely
6. ☐ Store can reorder categories locally
7. ☐ Store can add local-only categories/items
8. ☐ Inherited items cannot be edited for brand-critical fields
9. ☐ Master updates propagate through read-time resolution and the current outlet sync/cache path
10. ☐ MOL logs exist for all key actions
11. ☐ Single-store tenants remain unchanged

---

## Sales Promise (What We Can Claim)

**Allowed:**

- "Run every store from one master menu."
- "Local changes stay local. Brand stays consistent."
- "No manual syncing."

**Not Allowed:**

- "Full franchise automation"
- "POS replacement"
- "Analytics-driven optimization"

---

## Open Questions

| #   | Question                                          | Status                                                                    |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | How to handle master deletion when stores linked? | **RESOLVED:** Block deletion — must designate new master first (FR-11.3)  |
| 2   | Should stores see master price when overriding?   | **RESOLVED:** Yes, UI shows both master + store price for reference       |
| 3   | Max stores per master?                            | No limit for P0                                                           |
| 4   | Store unlinking behavior?                         | **RESOLVED:** Blocked for chain tenants to maintain consistency (FR-11.2) |

---

## Future Considerations (Post-P0)

These features are explicitly **OUT OF SCOPE** for initial implementation but documented for future planning.

### F1: Master Change Visibility for Stores

**User Request:** Show stores what master changed so there are no surprises.

**Proposed Solution:**

- Add `visibility` field to MOL events: `"platform"` (internal) vs `"client"` (shown to store)
- Store dashboard shows recent master changes relevant to them
- Example: "Master added 'New Dessert' category" → Store sees it in their feed

**Data Model Addition:**

```
molEvent.visibility: "platform" | "client"
molEvent.affectedStores?: number[]  // Which stores should see this
```

**Deferred because:** Adds UI complexity; P0 focuses on core sync functionality.

### F2: Orphaned Override Cleanup

**User Request:** Weekly cleanup job for orphaned overrides (items deleted from master).

**Proposed Solution:**

- Scheduled Cloud Function (weekly)
- For each store project with `masterProjectId`:
  1. Load master items
  2. Compare to store `overrides.items` keys
  3. Delete override entries where item no longer exists in master

**Why it's optional:**

- Orphaned overrides are harmless (silently ignored at render)
- No performance impact (overrides is a small map)
- Cleanup is cosmetic, not functional

**Deferred because:** Zero user impact; purely housekeeping.

---

**DOCUMENT STATUS:** Source evidence only - not current launch certification
**SIGNATURE:** Lead Architect
**TIMESTAMP:** January 21, 2026
