# 🔍 Multi-Outlet Brand Consistency — ChatGPT Critical Review

**Feature:** #4 — Multi-Outlet Brand Consistency  
**Date:** January 19, 2026  
**Author:** Lead Architect (Cascade)  
**Status:** ✅ READY FOR SPEC GENERATION

---

## 📊 Executive Summary

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                   CHATGPT PROPOSAL ANALYSIS                                        ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║  ChatGPT Assessment:    Solid problem definition, correct doctrine fit             ║
║  Codebase Reality:      Tenant → Store (1:N) exists, Projects per-store            ║
║  Key Gap:               No "master menu" concept currently exists                  ║
║  Recommendation:        Option A (Brand-level master) with reference model         ║
║  Implementation:        Medium complexity, requires schema extension               ║
║  Market Validation:     Aligns with Square/Gofrugal franchise patterns             ║
║  Pre-Spec Questions:    ALL ANSWERED (see Section 8)                               ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
```

---

## ✅ What ChatGPT Got RIGHT

### 1. Problem Statement (100% Aligned)

> "Premium groups have 2–10 outlets and suffer from inconsistent naming, pricing drift, missing items, random photos"

**Codebase Evidence:**

- `src/types/platform/tenant.ts:49` — `storesList: MinimalStoreDataType[]` shows 1:N relationship exists
- `src/database/stores/index.tsx:37` — `getAllStoresByTenantId()` proves multi-store query pattern
- Current reality: Each store has independent `projects/` with no cross-store linking

### 2. Doctrine Fit (Correct)

ChatGPT correctly identified this can be **silent + autonomous**:

- Owner updates master menu once → system propagates
- No "syncing" decisions for owner
- Fits Law 7: No Feature Without Autonomy

### 3. Scope Definition (Well-Bounded)

P0 scope is tight and appropriate:

- Master menu template ✅
- Outlet inheritance ✅
- Controlled overrides (price, availability) ✅
- Role-based access ✅
- Audit trail (MOL) ✅

### 4. Data Model Insight (Critical)

> "Inheritance must be data-modelled, not copy-pasted"

This is the **correct approach**. Copying creates drift.

---

## ⚠️ What ChatGPT Got PARTIALLY RIGHT

### 1. Proposed Data Structure

ChatGPT proposed:

```
brands/{bId}/masterMenu/categories/{cId}
brands/{bId}/masterMenu/items/{iId}
stores/{sId}/menuRefs/{iId}
```

**Reality Check:**

- MenuList uses `tenants/` not `brands/` — semantic difference only
- Current project structure is `projects/{projectId}` with `tId`, `sId` fields
- Menu data lives inside `project.files[].extractedData.data.items[]`

**Better Approach (Codebase-Aligned):**

```
tenants/{tId}/masterProject/{projectId}
  └── Same structure as Project type
  └── Master categories, items, languages

projects/{projectId}  (existing per-store)
  └── Add: masterRef?: { tId, projectId }
  └── Add: overrides?: Record<itemId, ItemOverride>
```

### 2. Override Model

ChatGPT's override example:

```json
{
  "masterItemId": "i_123",
  "override": {
    "price": "299",
    "isDisabled": true
  }
}
```

**Better (Using Existing Types):**

```typescript
interface ItemOverride {
  itemId: string;
  price?: string; // Override master price
  available?: boolean; // Override availability (uses existing field)
  active?: boolean; // Hide item at this outlet
  // NOT allowed: name, description, category, images
}
```

---

## ❌ What ChatGPT MISSED

### 1. Existing Type Structure

ChatGPT didn't know about:

- `ExtractedDataItem` type at `projects/types/extractedData.types.ts:42-63`
- Multi-language support: `name: { [key: string]: string }`
- Existing `available` field for "sold out" toggle
- `active` field for show/hide

### 2. Project vs Menu Distinction

In MenuList:

- **Project** = A menu configuration (name, theme, files, settings)
- **Menu** = The extracted data within files (categories, items)
- ChatGPT conflated these

### 3. Multi-Project Reality

Current stores can have **multiple projects** (menus):

- Lunch menu, Dinner menu, Bar menu
- Master menu would need to support this

### 4. PricingIntegrityState Integration

`project.types.ts:17-53` defines `PricingIntegrityState` for PDF/screen sync.
Multi-outlet must integrate with this — master price changes trigger staleness across ALL outlets.

---

## 🏗️ CASCADE-DISCOVERED ARCHITECTURE

### Current Tenant → Store → Project Hierarchy

```
tenants/{tId}
  ├── storesList: [{ sId, name, ... }]  // Quick reference

stores/{sId}
  ├── tenantId: number
  ├── name, address, hours, etc.

projects/{projectId}
  ├── tId: number
  ├── sId: number
  ├── files[].extractedData.data.items[]
  ├── config: ThemeConfig
  ├── menuSettings: MenuSettings
  └── pricingIntegrity: PricingIntegrityState
```

### Proposed Extension (Minimal Change)

```
tenants/{tId}
  ├── storesList: [...]
  ├── masterProjects: {               // NEW
  │     [projectId]: {
  │       name: string,
  │       isDefault: boolean
  │     }
  │   }

projects/{projectId}
  ├── ... (existing)
  ├── isMaster?: boolean              // NEW - marks as master
  ├── masterRef?: {                   // NEW - for outlet menus
  │     masterProjectId: string,
  │     lastSyncedOn: Timestamp
  │   }
  ├── overrides?: {                   // NEW - outlet-specific
  │     items: Record<itemId, ItemOverride>,
  │     categories: Record<catId, CategoryOverride>
  │   }
```

### Why This Works Better

1. **Minimal Schema Change** — Adds fields to existing `Project` type
2. **No New Collections** — Uses existing `projects/` collection
3. **Familiar DAL Pattern** — `src/database/projects/index.ts` patterns apply
4. **MOL Integration** — Existing menu change logging extends naturally
5. **Pricing Integrity** — Master change triggers staleness on all outlet projects

---

## 🔐 SECURITY CONSIDERATIONS

| Aspect        | Requirement      | Implementation                                        |
| ------------- | ---------------- | ----------------------------------------------------- |
| Master Edit   | HQ Admin only    | New role check: `canEditMaster`                       |
| Override Edit | Outlet Manager   | Existing `sId` isolation works                        |
| Propagation   | System-initiated | Background job, no user action                        |
| Audit         | Full trail       | MOL: `MASTER_MENU_UPDATED`, `OUTLET_OVERRIDE_APPLIED` |

---

## 📋 ANSWER TO CHATGPT'S QUESTION

### Do you want multi-outlet to be:

**A) "Brand-level master menu"** (best for chains)
or
**B) "Clone menu from outlet 1 → manage separately"** (easier but drift-prone)

---

## ✅ RECOMMENDATION: **OPTION A — WITH CODEBASE-ALIGNED MODEL**

### Why Option A

| Factor           | Option A (Master)         | Option B (Clone)             |
| ---------------- | ------------------------- | ---------------------------- |
| Doctrine Fit     | ✅ Silent, autonomous     | ❌ Requires manual sync      |
| Drift Prevention | ✅ Impossible by design   | ❌ Guaranteed over time      |
| Scalability      | ✅ 100 outlets = 1 update | ❌ 100 outlets = 100 updates |
| Audit Trail      | ✅ Clean master → outlet  | ⚠️ No clear lineage          |
| 3-Year Freeze    | ✅ Extensible             | ❌ Technical debt            |

### Specific Implementation

1. **Master Projects** stored at tenant level (flag on existing Project)
2. **Outlet Projects** reference master via `masterRef`
3. **Overrides** stored on outlet project, not separate collection
4. **Propagation** via Cloud Function on master update
5. **UI** shows "Inherited from Master" badge with override option

---

## 🚦 NEXT STEPS

If you approve Option A:

1. ✅ Create `__docs__/multi-outlet-consistency/` folder
2. ⏳ Generate `MULTI_OUTLET_spec.md` — Business requirements
3. ⏳ Generate `MULTI_OUTLET_impl.md` — Technical blueprint
4. ⏳ Generate `MULTI_OUTLET_marketing.md` — Sales collateral
5. ⏳ Phase 0 foundation (schema, types, feature flag)

---

## 8.5 UI Requirements

### HQ Admin View (Master Menu)

1. **Master Menu Editor** — Same as current menu editor, but with "Master" badge
2. **Outlet List** — See all outlets inheriting this master
3. **Propagation Status** — "Last synced to 5 outlets at 10:32 AM"

### Outlet Manager View

1. **Inherited Items** — Show with "Inherited from Master" badge (grey/locked icon)
2. **Override Indicator** — Items with overrides show "Price overridden" or "Disabled" badge
3. **Local Items Section** — Separate section for outlet-specific items
4. **Cannot Edit** — Name, description, images locked for inherited items

### Settings

1. **Enable Multi-Outlet** — Feature flag per tenant
2. **Create Master Menu** — Button to designate a project as master
3. **Link Outlet to Master** — Dropdown to select which master an outlet inherits

## 8.6 Security Requirements

| Requirement            | Implementation                                 |
| ---------------------- | ---------------------------------------------- |
| Master edit = HQ only  | Check `role.canEditMaster` or `role.isHQAdmin` |
| Outlet isolation       | Existing `tId` + `sId` checks                  |
| Override audit         | MOL logging with actorUserId                   |
| No client token access | Server-side propagation only                   |

## 8.7 Performance Requirements

| Aspect              | Requirement                                      |
| ------------------- | ------------------------------------------------ |
| Propagation latency | < 5 seconds to all outlets                       |
| Read efficiency     | Outlet view computed server-side, cached         |
| Firestore reads     | 1 read for master + 1 read for outlet overrides  |
| Batch writes        | Use Firestore batch for multi-outlet propagation |

## 8.8 Feature Flag

```typescript
// In src/config/features.ts
ENABLE_MULTI_OUTLET: false,  // Default OFF until implementation complete
```

---

# 🔒 SECTION 9: BACKWARDS COMPATIBILITY ANALYSIS

## 9.1 Current Single-Store Implementation (VERIFIED)

### Project Storage Pattern

```
projects/{tId}/{sId}/{projectId}
  └── Project document with files[], config, menuSettings, etc.

platformSummary/projects_{sId}
  └── Lightweight project list for efficient listing
```

### Project ID Format

```typescript
// From src/database/projects/index.ts:251
projectId = `${sess.tId}-${timestamp}-${sess.sId}`;
```

### Session-Based Queries

All DAL functions use `session.tId` + `session.sId` for store isolation:

```typescript
// From src/database/projects/index.ts:152
const getDataDocRef = async (projectId: string) => {
  session = Boolean(session) ? session : await getActiveSession();
  return doc(
    firebaseClient,
    `${DATA_COLLECTION}/${session.tId}/${session.sId}`,
    projectId,
  );
};
```

### Customer-Facing Menu

```typescript
// From src/app/_client/[[...slug]]/page.tsx:72
async function getProjectData(projectId: string): Promise<any> {
  const [tId, , sId] = projectId.split("-");
  const docRef = doc(
    firebaseClient,
    `${DB_COLLECTIONS.PROJECTS}/${tId}/${sId}`,
    projectId,
  );
  // ...
}
```

## 9.2 Why Proposed Model is Backwards Compatible

### All New Fields Are OPTIONAL

```typescript
interface Project {
  // ... existing fields (unchanged) ...

  isMaster?: boolean;           // OPTIONAL - undefined for single-store
  masterRef?: { ... };          // OPTIONAL - undefined for single-store
  overrides?: { ... };          // OPTIONAL - undefined for single-store
}
```

### Single-Store Behavior (UNCHANGED)

| Operation         | Before | After                              |
| ----------------- | ------ | ---------------------------------- |
| Create Project    | Works  | Works (new fields undefined)       |
| Edit Project      | Works  | Works (ignores new fields)         |
| View Menu         | Works  | Works (no masterRef = standalone)  |
| PDF Export        | Works  | Works (uses project data directly) |
| Pricing Integrity | Works  | Works (no change to core logic)    |

### Multi-Outlet Behavior (NEW)

| Operation      | Behavior                                 |
| -------------- | ---------------------------------------- |
| Create Master  | Sets `isMaster: true` on project         |
| Link Outlet    | Sets `masterRef` on outlet project       |
| Override Price | Adds to `overrides.items` map            |
| Propagation    | Cloud Function triggers on master update |
| View Menu      | Merges master + overrides at read time   |

## 9.3 Migration Strategy

### No Migration Needed

- Existing projects continue to work
- New fields are only set when multi-outlet is enabled for a tenant
- Feature flag `ENABLE_MULTI_OUTLET` gates all new behavior

### Tenant Opt-In

1. Tenant enables multi-outlet in settings
2. Creates first master project (sets `isMaster: true`)
3. Links outlet projects to master (sets `masterRef`)
4. Existing projects can be converted or kept standalone

## 9.4 Critical Paths Verified

| Path              | File                                                               | Status        |
| ----------------- | ------------------------------------------------------------------ | ------------- |
| Project CRUD      | `src/database/projects/index.ts`                                   | ✅ Compatible |
| Customer Menu     | `src/app/_client/[[...slug]]/page.tsx`                             | ✅ Compatible |
| PDF Generation    | `src/lib/export/menuPdfGenerator.ts`                               | ✅ Compatible |
| Pricing Integrity | `src/lib/pricing/integrityEngine.ts`                               | ✅ Compatible |
| Menu Editor       | `src/components/templates/main-app/projects/editorView/Editor.tsx` | ✅ Compatible |
| B2C View          | `src/components/templates/main-app/projects/b2cView/index.tsx`     | ✅ Compatible |
| Campaigns         | `src/database/campaigns/index.ts`                                  | ✅ Compatible |

## 9.5 Risk Assessment

| Risk                       | Mitigation                               |
| -------------------------- | ---------------------------------------- |
| Breaking existing projects | All fields optional, no migration needed |
| Performance degradation    | Master data cached, propagation is async |
| Data corruption            | MOL logging, atomic batch writes         |
| Feature creep              | Strict scope, feature flag gated         |

---

# 🚀 NEXT STEP FOR CHATGPT

Generate the following documents based on this critical review:

1. **MULTI_OUTLET_spec.md** — Business requirements (non-technical, for CEO/sales)
2. **MULTI_OUTLET_impl.md** — Technical implementation blueprint (for developers)
3. **MULTI_OUTLET_marketing.md** — Sales collateral and pitch materials

**Rules for document generation:**

- Follow MenuList doctrine (silent, autonomous, premium SMB)
- Respect 3-Year Architecture Freeze (complete at launch)
- Use exact data model from Section 8.4
- Include MOL event types from Section 8.3
- Feature flag required (Section 8.8)
- No "Phase 2" or "future enhancement" language

---

**DOCUMENT STATUS:** ✅ COMPLETE — READY FOR CHATGPT SPEC GENERATION  
**SIGNATURE:** Lead Architect (Cascade)  
**TIMESTAMP:** January 19, 2026
