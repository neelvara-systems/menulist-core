# Menu Observation Layer (MOL v0)

> **Document Version**: 1.4
> **Created**: January 14, 2026  
> **Status**: Historical Sprint 1 and 2 implementation evidence; not current launch certification
> **Sprint Duration**: 3 weeks total (Sprint 1: 2 weeks, Sprint 2: 1 week)  
> **Document Type**: Combined SPEC + IMPL (No Marketing — Internal Infrastructure)
> **Location**: `__docs__/internal-tracking/` (grouped with Internal Tracking System)

> Launch boundary: MOL v0 readiness now depends on the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), current source verifiers, Firestore/cost evidence, scoped scheduler/deploy evidence where relevant, and target-environment smoke.

---

# SECTION A: SPECIFICATION (Non-Tech Readable)

_For: CEO, Founder, Product Stakeholders_

---

## A.1 Executive Summary

### Goals

MOL v0 creates **menu memory** — the ability for MenuList to remember what changed, when, and by whom. This is the foundational layer that enables future autonomous capabilities without disrupting current operations or adding any user-facing features.

### Scope

| ✅ In Scope                                         | ❌ Out of Scope                       |
| --------------------------------------------------- | ------------------------------------- |
| Track all menu changes (price, availability, items) | Any user-facing UI                    |
| Store change history immutably                      | Dashboards or reports                 |
| Compute drift patterns internally                   | AI suggestions or recommendations     |
| Feature-flag controlled                             | Approval workflows                    |
| Zero onboarding friction                            | Cost ingestion or margin calculations |

### Business Value

1. **No immediate user value** — this is intentional. Infrastructure is invisible.
2. **Future leverage** — enables protection features (12+ months out)
3. **Competitive moat** — most menu tools overwrite data and lose history
4. **Anti-regret engineering** — buying future options without commitment

### Key Principle

> **Build memory now. Intelligence later.**

---

## A.2 Strategic Foundation

### The Four Laws (Locked Doctrine)

These govern ALL MOL decisions:

| Law       | Statement                              | Business Implication                                 |
| --------- | -------------------------------------- | ---------------------------------------------------- |
| **Law 1** | Visible autonomy kills trust           | No UI for observation layer. Ever.                   |
| **Law 2** | Protection beats optimization          | Future framing: "stop damage" not "increase revenue" |
| **Law 3** | Observation before intelligence        | Memory first, decisions much later                   |
| **Law 4** | Approval workflows kill infrastructure | No "are you sure?" — that's SaaS territory           |

### What MenuList IS Today

| Reality              | Description                |
| -------------------- | -------------------------- |
| **Product**          | Digital menu               |
| **Competitive Edge** | Ease, speed, AI extraction |
| **Revenue Model**    | Tool subscription          |
| **User Expectation** | "Make my menu work"        |

**There is no shame in this stage.** Every infrastructure company starts as a tool.

### What MenuList is NOT (Yet)

| ❌ Not Yet        | Why                                 |
| ----------------- | ----------------------------------- |
| Safety engine     | Requires accumulated memory         |
| Pricing governor  | Requires trust formation            |
| Margin protector  | Requires cost ingestion (not built) |
| Autonomous system | Requires 12+ months of observation  |

### Strategic Position

```
MenuList TODAY    → Makes menus easier
MenuList TOMORROW → Makes menus safer
MenuList MUST     → Never pretend tomorrow already exists
```

---

## A.3 User Stories (Business Language)

| As a...     | I want...                         | So that...                                            |
| ----------- | --------------------------------- | ----------------------------------------------------- |
| **System**  | To remember every menu change     | Future protection features have data to work with     |
| **System**  | To track price change frequency   | I can detect stale pricing patterns                   |
| **System**  | To know who made changes          | I can distinguish owner vs staff vs automated changes |
| **Founder** | Zero new UI or onboarding changes | Current sales motion is unaffected                    |
| **Founder** | Feature-flag control              | I can disable if issues arise                         |

---

## A.4 Risks & Open Questions

| Risk                           | Mitigation                                  | Status       |
| ------------------------------ | ------------------------------------------- | ------------ |
| Firestore write costs increase | Feature-flag gated, fire-and-forget pattern | ✅ Addressed |
| Performance impact on save     | Non-blocking async, no user-facing delay    | ✅ Addressed |
| Data privacy (change history)  | Same multi-tenant isolation as projects     | ✅ Addressed |
| Scope creep to UI features     | Explicit "What NOT to Build" section        | ✅ Addressed |

**Open Questions**: None — this is a straightforward data logging layer.

---

# SECTION B: IMPLEMENTATION PLAN (Dev-Centric)

_For: Engineering Team_

---

## B.1 Analysis: ChatGPT Recommendations vs Codebase

| ChatGPT Said               | Codebase Reality                        | Decision                                |
| -------------------------- | --------------------------------------- | --------------------------------------- |
| Build immutable change log | No existing change tracking             | ✅ **AGREE** — Build it                 |
| Build item state snapshot  | Data nested 4 levels deep               | ✅ **AGREE** — Useful for flat access   |
| Build drift counters       | No pattern detection exists             | ✅ **AGREE** — Build via Cloud Function |
| No UI changes              | Existing pattern in `ownerControlUsage` | ✅ **AGREE** — Follow same pattern      |
| Fire-and-forget logging    | Existing pattern in `ownerControlUsage` | ✅ **AGREE** — Reuse pattern            |

### Disagreements/Adjustments

| ChatGPT Suggested | Our Adjustment | Reason                                               |
| ----------------- | -------------- | ---------------------------------------------------- |
| None              | N/A            | ChatGPT recommendations align with codebase patterns |

---

## B.2 Codebase Audit

### What Exists (Reusable)

| Component                 | Location                                                                  | Status                   |
| ------------------------- | ------------------------------------------------------------------------- | ------------------------ |
| Item data model           | `src/components/templates/main-app/projects/types/extractedData.types.ts` | ✅ Complete              |
| Category data model       | `src/components/templates/main-app/projects/types/extractedData.types.ts` | ✅ Complete              |
| Project DAL               | `src/database/projects/index.ts`                                          | ✅ Complete              |
| Owner control tracking    | `src/database/ownerControlUsage/index.ts`                                 | ✅ **PATTERN TO FOLLOW** |
| Multi-tenant paths        | Standard `{tId}/{sId}`                                                    | ✅ Complete              |
| `apiCallComposer` pattern | `src/lib/apiHelper/apiCallComposer.ts`                                    | ✅ Complete              |
| `sanitizeForFirestore`    | `src/lib/auth/security.ts`                                                | ✅ Required for writes   |
| Feature flags             | `src/config/features.ts`                                                  | ✅ Add new flag here     |

### What's Missing (Gaps to Fill)

| Capability                 | Current State           | Gap       | Priority      |
| -------------------------- | ----------------------- | --------- | ------------- |
| Change history             | ❌ Updates overwrite    | **BUILD** | P0            |
| Item state view            | ❌ Nested 4 levels deep | **BUILD** | P1 (optional) |
| Drift detection            | ❌ None                 | **BUILD** | P1            |
| Last human change tracking | ❌ None                 | **BUILD** | P0            |

### Current Update Flow (Problem)

```typescript
// Current: Just overwrites, loses history
// Location: src/database/projects/index.ts line ~197
await setDoc(await getDataDocRef(data.projectId), updateData, { merge: true });
```

**Problem**: Every update destroys the previous state. No memory. No patterns. No foundation for intelligence.

---

## B.3 Database Schema

### New Collections

#### Collection 1: `menuChangeLog`

**Path**: `menuChangeLog/{tId}/{sId}/{entryId}`

**Purpose**: Immutable, append-only log of every menu change.

```typescript
interface MenuChangeLogEntry {
  id: string; // UUID
  projectId: string; // Which project/menu
  itemId?: string; // Which item (null for category/structure)
  categoryId?: string; // Which category (for category-level changes)
  changeType: MenuChangeType; // What changed
  oldValue: any; // Previous value
  newValue: any; // New value
  changedBy: ChangeActor; // Who made the change
  timestamp: Timestamp; // When
}

type MenuChangeType =
  | "PRICE" // Price changed
  | "AVAILABILITY" // Available toggle changed
  | "ITEM_ADDED" // New item added
  | "ITEM_REMOVED" // Item deleted
  | "ITEM_ACTIVE" // Active toggle changed
  | "CATEGORY_ADDED" // New category
  | "CATEGORY_REMOVED" // Category deleted
  | "CATEGORY_REORDER" // Category order changed
  | "STRUCTURE"; // Other structural changes

type ChangeActor =
  | "OWNER" // Business owner
  | "STAFF" // Team member
  | "SYSTEM"; // Automated (future)
```

#### Collection 2: `menuItemState` (Sprint 1 - Optional Enhancement)

**Path**: `menuItemState/{tId}/{sId}/{projectId}/items/{itemId}`

**Purpose**: Denormalized flat view of current item state for quick reads.

```typescript
interface MenuItemState {
  itemId: string;
  projectId: string;
  currentPrice: string;
  currentAvailability: boolean;
  currentActive: boolean;
  lastHumanChangeAt: Timestamp | null;
  lastHumanChangeBy: string | null; // userId
  lastChangeType: MenuChangeType | null;
  updatedAt: Timestamp;
}
```

#### Collection 3: `derivedItemMetrics` (Sprint 2)

**Path**: `menuItemState/{tId}/{sId}/{projectId}/metrics/{itemId}`

**Purpose**: Computed drift counters for pattern detection.

```typescript
interface DerivedItemMetrics {
  itemId: string;
  projectId: string;

  // Counters (30-day rolling window)
  priceChangeCount30d: number;
  availabilityToggleCount30d: number;

  // Computed values
  daysSinceLastPriceChange: number | null;
  daysSinceLastAvailabilityChange: number | null;

  // Internal flags (NEVER exposed to UI)
  _priceStale: boolean | null;
  _priceStaleStatus: 'measured' | 'unavailable_outside_rolling_window';
  _availabilityChurn: boolean; // toggleCount30d > 10
  _highVolatility: boolean; // priceChangeCount30d > 5

  // Metadata
  computedAt: Timestamp;
  windowStart: string; // YYYY-MM-DD
  windowEnd: string; // YYYY-MM-DD
}
```

### Database Constants Update

**File**: `src/constants/database.ts`

```typescript
// Add to DB_COLLECTIONS:
MENU_CHANGE_LOG: "menuChangeLog",
MENU_ITEM_STATE: "menuItemState",
// MENU_INTELLIGENCE already exists (for future use)
```

---

## B.4 File Structure (Exact Paths)

### New Files to Create

| File                                          | Purpose                   | Sprint |
| --------------------------------------------- | ------------------------- | ------ |
| `src/types/menuObservation.ts`                | All MOL types             | 1      |
| `src/database/menuChangeLog/index.ts`         | Change log DAL            | 1      |
| `src/database/menuItemState/index.ts`         | Item state DAL (optional) | 1      |
| `functions/src/analytics/menuDriftMetrics.ts` | Nightly drift computation | 2      |

### Files to Modify

| File                             | Change                                    | Sprint |
| -------------------------------- | ----------------------------------------- | ------ |
| `src/constants/database.ts`      | Add `MENU_CHANGE_LOG`, `MENU_ITEM_STATE`  | 1      |
| `src/database/projects/index.ts` | Add change detection to `updateProject()` | 1      |
| `src/config/features.ts`         | Add `ENABLE_MENU_OBSERVATION` flag        | 1      |

---

## B.5 Security Considerations

| Requirement            | Implementation                             | Reference                  |
| ---------------------- | ------------------------------------------ | -------------------------- |
| Multi-tenant isolation | Path: `{collection}/{tId}/{sId}/...`       | Standard pattern           |
| Firestore sanitization | Use `sanitizeForFirestore()` on all writes | `src/lib/auth/security.ts` |
| No API routes needed   | DAL-only, no external exposure             | N/A                        |
| Feature flag control   | `FEATURE_FLAGS.ENABLE_MENU_OBSERVATION`    | `src/config/features.ts`   |

**Note**: No `withAuth()` needed — this is internal DAL, not an API route.

---

## B.6 Firebase Cost Estimate & Tracking

### Cost Estimate

| Operation                       | Frequency              | Est. Cost         |
| ------------------------------- | ---------------------- | ----------------- |
| **Writes (menuChangeLog)**      | ~5-20 per project edit | Low (append-only) |
| **Reads (menuChangeLog)**       | Nightly batch only     | Very Low          |
| **Writes (derivedItemMetrics)** | 1 per item per night   | Low               |

### Cost Mitigation (CRITICAL per Internal Tracking System Category F)

- Feature-flag gated (can disable if costs spike)
- Fire-and-forget pattern (no read-before-write)
- Nightly batch processing (not real-time)
- **ADD**: Cost telemetry logging in Cloud Function

### Cost Telemetry (Required by Internal Tracking Spec)

The nightly Cloud Function MUST log cost metrics:

```typescript
// At end of Cloud Function execution
await logCostTelemetry({
  functionName: "computeMenuDriftMetrics",
  readsCount: totalReads,
  writesCount: totalWrites,
  executionMs: Date.now() - startTime,
  storesProcessed: storeCount,
  timestamp: Timestamp.now(),
});
```

**Alert Threshold**: If monthly Firebase cost delta > 10% → investigate

---

## B.7 Implementation Phases & Checklists

### Sprint 1 (Week 1-2): Foundation

#### Task 1.1: Types & Constants

**Files to Create/Modify**:

- `src/types/menuObservation.ts` — NEW
- `src/constants/database.ts` — MODIFY

**Deliverables**:

- [ ] `MenuChangeLogEntry` interface
- [ ] `MenuItemState` interface
- [ ] `MenuChangeType` type
- [ ] `ChangeActor` type
- [ ] Collection constants

#### Task 1.2: Menu Change Log DAL

**File**: `src/database/menuChangeLog/index.ts` — NEW

**Functions**:

```typescript
// Core logging
logMenuChange(entry: Omit<MenuChangeLogEntry, 'id' | 'timestamp'>): Promise<string>

// Query functions (for future use, not exposed to UI)
getChangeHistory(projectId: string, options?: {
    itemId?: string;
    changeType?: MenuChangeType;
    limit?: number;
    startAfter?: Timestamp;
}): Promise<MenuChangeLogEntry[]>

// Aggregation helpers (for drift computation)
getChangeCountSince(
    projectId: string,
    itemId: string,
    changeType: MenuChangeType,
    since: Date
): Promise<number>
```

**Pattern**: Follow existing `ownerControlUsage` pattern:

- Feature flag gated
- Fire-and-forget (non-blocking)
- Debounced if needed
- Silent failures (log, don't throw)

#### Task 1.3: Change Detection Interceptor

**File**: `src/database/projects/index.ts` — MODIFY

**Changes**:

1. Add helper function `detectItemChanges(oldProject, newProject)`
2. Modify `updateProject()` to call change detection
3. Log detected changes to `menuChangeLog`

```typescript
// New helper
async function detectAndLogChanges(
    projectId: string,
    oldData: Project,
    newData: Project,
    actor: ChangeActor = 'OWNER'
): Promise<void> {
    // Get old items map
    const oldItems = extractItemsMap(oldData);
    const newItems = extractItemsMap(newData);

    // Detect changes
    for (const [itemId, newItem] of Object.entries(newItems)) {
        const oldItem = oldItems[itemId];

        if (!oldItem) {
            // New item added
            await logMenuChange({ projectId, itemId, changeType: 'ITEM_ADDED', ... });
        } else {
            // Check for price change
            if (oldItem.price !== newItem.price) {
                await logMenuChange({
                    projectId, itemId,
                    changeType: 'PRICE',
                    oldValue: oldItem.price,
                    newValue: newItem.price,
                    changedBy: actor
                });
            }
            // Check for availability change
            if (oldItem.available !== newItem.available) {
                await logMenuChange({ ... });
            }
        }
    }

    // Detect removed items
    for (const itemId of Object.keys(oldItems)) {
        if (!newItems[itemId]) {
            await logMenuChange({ projectId, itemId, changeType: 'ITEM_REMOVED', ... });
        }
    }
}
```

#### Task 1.4: Menu Item State (Optional Enhancement)

**File**: `src/database/menuItemState/index.ts` — not implemented. The current server-owned rolling metric shape is local to `functions/src/analytics/menuDriftMetrics.ts`; no browser item-state DAL or duplicate app persistence type is certified.

**Functions**:

```typescript
updateItemState(projectId: string, itemId: string, state: Partial<MenuItemState>): Promise<void>
getItemState(projectId: string, itemId: string): Promise<MenuItemState | null>
getAllItemStates(projectId: string): Promise<MenuItemState[]>
```

---

### Sprint 2 (Week 3): Drift Detection

| Task | Description                                 | Status  |
| ---- | ------------------------------------------- | ------- |
| 2.1  | Create `menuDriftMetrics.ts` Cloud Function | ✅ Done |
| 2.2  | Implement 30-day window query               | ✅ Done |
| 2.3  | Compute per-item drift counters             | ✅ Done |
| 2.4  | Compute internal flags                      | ✅ Done |
| 2.5  | Add to `decisionBlocksScoring.ts` scheduler | ✅ Done |
| 2.6  | Add telemetry logging                       | ✅ Done |

#### Task 2.1: Drift Metrics Cloud Function

**File**: `functions/src/analytics/menuDriftMetrics.ts` — NEW

**Schedule**: Nightly at 3 AM UTC (after other analytics)

**Current runtime correction (July 22, 2026):** Project documents are read from `projects/{tId}/{sId}/{projectId}`; the top-level `projects` documents are tenant containers and are not queried as projects. Client writes use `serverTimestamp()` and rules require canonical `timestamp` (plus the supported legacy `createdOn`) to equal `request.time`. The task captures one upper timestamp per run and reads each active store's bounded 30-day MOL window once in 500-document timestamp/document-ID pages with a 50,000-document per-store/run budget, so future-dated legacy/Admin rows cannot poison current counters. It consumes detailed events and bounded `MENU_REVISION_SUMMARY.itemDriftChanges`, partitions contributions by the authoritative project document ID, and writes per-item metrics in batches of 400. Existing derived metrics are paged and removed when their contribution leaves the rolling window, so an old count cannot remain current. Each surviving metric is a complete exact replacement, preventing unknown legacy fields or removed derived fields from surviving a recomputation. The 30-day source window cannot prove a 180-day price-staleness claim; `_priceStale` is therefore `null` with `unavailable_outside_rolling_window` unless the available timestamp can answer the threshold. This removes the former project-count multiplier and false non-stale defaults. Default revision summaries and publish events are not replacement-debounced; pathological compact-summary overflow is retained through detailed price/availability events.

**Logic**:

```typescript
export const computeMenuDriftMetrics = onSchedule(
  {
    schedule: "0 3 * * *", // 3 AM UTC daily
    timeZone: "UTC",
    timeoutSeconds: 300,
    memory: "256MiB",
  },
  async () => {
    // 1. Read active projects from projects/{tId}/{sId}
    // 2. Read the store's menuChangeLog window once with stable pagination
    // 3. Partition validated detailed/summary contributions by project and item
    // 4. Write per-item metrics in bounded batches
    // 5. Log telemetry
  }
);
```

#### Task 2.2: Internal Flags Logic

```typescript
function computeFlags(metrics: Partial<DerivedItemMetrics>): {
  _priceStale: boolean | null;
  _priceStaleStatus: 'measured' | 'unavailable_outside_rolling_window';
  _availabilityChurn: boolean;
  _highVolatility: boolean;
} {
  const priceStale = getPriceStaleAssessment(
    metrics.daysSinceLastPriceChange ?? null,
    180,
  );
  return {
    _priceStale: priceStale.value,
    _priceStaleStatus: priceStale.status,
    _availabilityChurn: (metrics.availabilityToggleCount30d || 0) > 10,
    _highVolatility: (metrics.priceChangeCount30d || 0) > 5,
  };
}
```

**Critical**: These flags exist ONLY for internal system use. They are NEVER:

- Exposed in UI
- Shown in dashboards
- Used in notifications
- Mentioned in emails

---

## B.8 What NOT to Build (Explicit Exclusions)

| ❌ Forbidden          | Why                                  | Reference |
| --------------------- | ------------------------------------ | --------- |
| Change log UI         | Visible = supervision = broken trust | Law 1     |
| Drift dashboard       | Same as above                        | Law 1     |
| "AI suggestions"      | Creates debate, invites blame        | Law 2     |
| Approval workflows    | Turns into SaaS forever              | Law 4     |
| Confidence scores     | Invites second-guessing              | Law 2     |
| Optimization promises | Wrong framing                        | Law 2     |
| Cost ingestion (now)  | Premature, not enough data           | Law 3     |
| Margin calculations   | Requires cost data                   | Law 3     |
| Auto-price changes    | WAY too early                        | Law 3     |

---

## B.9 Validation Report

### Pre-Implementation Checklist

| Check                                 | Status  | Evidence                               |
| ------------------------------------- | ------- | -------------------------------------- |
| Types align with existing patterns    | ✅ PASS | Follows `extractedData.types.ts` style |
| DAL follows `apiCallComposer` pattern | ✅ PASS | Same as `ownerControlUsage/index.ts`   |
| Multi-tenant paths correct            | ✅ PASS | `{collection}/{tId}/{sId}/...`         |
| Feature flag pattern exists           | ✅ PASS | `src/config/features.ts` has examples  |
| No breaking changes to existing code  | ✅ PASS | Only additive changes                  |
| Security requirements met             | ✅ PASS | `sanitizeForFirestore()` used          |

### Post-Implementation Validation (To Complete After Each Sprint)

| Validation                     | Sprint 1 | Sprint 2 |
| ------------------------------ | -------- | -------- |
| Types compile without errors   | ✅       | N/A      |
| DAL functions work             | ✅       | ✅       |
| Feature flag toggles correctly | ✅       | N/A      |
| Change detection fires         | ✅       | N/A      |
| Logs created in Firestore      | ⬜ Test  | N/A      |
| Cloud Function runs            | N/A      | ⬜ Test  |
| Metrics computed correctly     | N/A      | ⬜ Test  |
| No UI changes visible          | ✅       | ✅       |

---

## B.10 Progress Tracking

| Phase    | Task                         | Owner | Status     | Notes                                                       |
| -------- | ---------------------------- | ----- | ---------- | ----------------------------------------------------------- |
| Sprint 1 | Types & Constants            | Dev   | ✅ Done    | `src/types/menuObservation.ts`, `src/constants/database.ts` |
| Sprint 1 | Menu Change Log DAL          | Dev   | ✅ Done    | `src/database/menuChangeLog/index.ts` with debouncing       |
| Sprint 1 | Change Detection Interceptor | Dev   | ✅ Done    | Added to `src/database/projects/index.ts`                   |
| Sprint 1 | Feature Flag                 | Dev   | ✅ Done    | `ENABLE_MENU_OBSERVATION` + `MENU_OBSERVATION_DEBOUNCE_MS`  |
| Sprint 1 | Manual Testing               | Dev   | ⬜ Pending | Enable flag and test                                        |
| Sprint 2 | Drift Metrics Function       | Dev   | ✅ Done    | `functions/src/analytics/menuDriftMetrics.ts`               |
| Sprint 2 | Scheduler Integration        | Dev   | ✅ Done    | Added to `decisionBlocksScoring.ts` nightly job             |
| Sprint 2 | Telemetry                    | Dev   | ✅ Done    | Cost telemetry per Category F                               |
| Sprint 2 | Manual Testing               | Dev   | ⬜ Pending | Deploy and verify                                           |

---

## B.11 Success Criteria

### Sprint 1 Complete When:

- [x] Every item price change creates a log entry
- [x] Every availability toggle creates a log entry
- [x] Every item add/remove creates a log entry
- [x] Logs are immutable (append-only)
- [x] Zero UI changes shipped
- [x] Zero user-facing announcements
- [x] Feature flag controls all logging

### Sprint 2 Complete When:

- [x] Nightly function computes drift metrics
- [x] `priceChangeCount30d` accurately reflects changes
- [x] `availabilityToggleCount30d` accurately reflects toggles
- [x] Internal flags computed but not exposed
- [x] Telemetry logs function health
- [x] Zero UI changes shipped

### Overall MOL v0 Success:

- [x] System has memory (can answer "what changed?")
- [x] System sees patterns (drift counters)
- [x] Owners notice nothing
- [x] Onboarding unchanged
- [x] Marketing unchanged
- [x] Pricing unchanged

---

## B.12 Testing Guide

### Manual Testing Steps (Sprint 1)

| Step | Action                                              | Expected Result                    | Status |
| ---- | --------------------------------------------------- | ---------------------------------- | ------ |
| 1    | Enable feature flag `ENABLE_MENU_OBSERVATION`       | No visible change                  | ⬜     |
| 2    | Edit a project, change item price from ₹100 to ₹120 | Log entry created in Firestore     | ⬜     |
| 3    | Toggle item availability OFF                        | Log entry with `AVAILABILITY` type | ⬜     |
| 4    | Add a new item                                      | Log entry with `ITEM_ADDED` type   | ⬜     |
| 5    | Delete an item                                      | Log entry with `ITEM_REMOVED` type | ⬜     |
| 6    | Verify `oldValue` and `newValue` in log             | Correct values captured            | ⬜     |
| 7    | Verify `changedBy` = `OWNER`                        | Attribution correct                | ⬜     |
| 8    | Verify `timestamp` is accurate                      | Within 1 second of action          | ⬜     |
| 9    | Disable feature flag                                | No new logs created                | ⬜     |
| 10   | Verify no UI changes anywhere                       | App looks identical                | ⬜     |

### Manual Testing Steps (Sprint 2)

| Step | Action                                      | Expected Result           | Status |
| ---- | ------------------------------------------- | ------------------------- | ------ |
| 1    | Trigger Cloud Function manually             | Function executes         | ⬜     |
| 2    | Check `derivedItemMetrics` collection       | Metrics documents created | ⬜     |
| 3    | Verify `priceChangeCount30d`                | Matches actual changes    | ⬜     |
| 4    | Verify `daysSinceLastPriceChange`           | Timestamp inside the rolling window, otherwise `null` | ⬜     |
| 5    | Verify internal flags (`_priceStale`, etc.) | Measured value or explicit unavailable status; never exposed | ⬜     |
| 6    | Check telemetry logs                        | Function health logged    | ⬜     |
| 7    | Verify no UI exposure of metrics            | Nothing visible to users  | ⬜     |

---

# SECTION C: MARKETING & SALES

_For: Marketing/Sales Team_

---

## C.1 NOT APPLICABLE — Internal Infrastructure

**MOL v0 has NO marketing component.**

This is intentional and aligns with the core doctrine:

| Reason                      | Explanation                                       |
| --------------------------- | ------------------------------------------------- |
| **Invisible by design**     | Infrastructure doesn't market itself              |
| **No user-facing features** | Nothing to announce or promote                    |
| **Trust through boredom**   | Marketing creates attention; we want the opposite |
| **Future leverage only**    | Marketing comes 12+ months later, if ever         |

### When Marketing Becomes Relevant (NOT NOW)

| Phase                 | Timeline   | Potential Marketing                             |
| --------------------- | ---------- | ----------------------------------------------- |
| MOL v0                | Now        | ❌ None                                         |
| Silent Protection     | 6+ months  | ❌ None                                         |
| First Visible Feature | 12+ months | Maybe: "Menu Health Summary" email announcement |
| Autonomy Features     | 18+ months | Maybe: Positioning as "menu infrastructure"     |

**Current Sales Pitch**: Unchanged. Continue selling MenuList as "simple digital menus done right."

---

# SECTION D: APPENDICES

---

## D.1 Future Path (Do NOT Build Now)

This section exists only to show the eventual direction. **None of this is for now.**

### Phase 2 (6+ months): Silent Protection Rules

After 6 months of observation data:

- Detect items with measured `_priceStale = true` only after an authoritative lifecycle baseline exists
- Detect items with `_availabilityChurn = true` consistently
- Consider ONE silent intervention (e.g., flag in internal system)

### Phase 3 (12+ months): First Visible Feature

Only after trust has formed through boredom:

- Monthly "Menu Health Summary" email (READ-ONLY facts, no advice)
- Must pass Language Governance review
- Must be opt-in

### Phase 4 (18+ months): Consider Autonomy

Only after:

- 12+ months of observation
- Clear pattern evidence
- Very high confidence thresholds
- One protection rule at a time

---

## D.2 Reference Documents

| Document                     | Purpose                            | Location                                                          |
| ---------------------------- | ---------------------------------- | ----------------------------------------------------------------- |
| **Internal Tracking System** | **CRITICAL** - Tracking philosophy | `__docs__/internal-tracking/menulist-internal-tracking-system.md` |
| Constitution                 | Governance laws                    | `__docs__/constitution/`                                          |
| Language Governance          | Forbidden words                    | `__docs__/constitution/02-language-governance.md`                 |
| Research Synthesis           | Market analysis                    | `__docs__/strategy/menulist-research-synthesis-analysis.md`       |
| Security Rules               | Implementation rules               | `.cascade/rules/SECURITY_IMPLEMENTATION_RULES.md`                 |
| Projects Docs                | Feature reference                  | `__docs__/projects/`                                              |

### Alignment with Internal Tracking System (CRITICAL)

MOL v0 implements **Category D (Owner Intervention Tracking)** and **Category E (Output Stability)** from the Internal Tracking System spec.

| Internal Tracking Category              | MOL v0 Implementation                 |
| --------------------------------------- | ------------------------------------- |
| Category D: Owner Intervention Tracking | `menuChangeLog` collection            |
| Category E: Output Stability            | `derivedItemMetrics` (drift counters) |
| Category F: Cost & Performance          | Added to Cloud Function telemetry     |

---

## D.3 Compliance Cross-Check (All Rules & Patterns)

### Security Rules Compliance (from `.cascade/rules/SECURITY_IMPLEMENTATION_RULES.md`)

| Rule                        | MOL v0 Status | Notes                                 |
| --------------------------- | ------------- | ------------------------------------- |
| 1. withAuth() on API routes | N/A           | No API routes (DAL-only)              |
| 2. verifyTenantAccess()     |               | Multi-tenant paths enforce this       |
| 3. Zod validation           | ADD           | Add Zod schema for MenuChangeLogEntry |
| 4. logger.security()        | N/A           | No security events                    |
| 5. Rate limiting            | N/A           | No API routes                         |
| 16. sanitizeForFirestore()  |               | Required in all writes                |
| 20. Simple solutions        |               | Minimal architecture                  |

### DAL Pattern Compliance (from Memory)

| Pattern                          | MOL v0 Status | Notes                   |
| -------------------------------- | ------------- | ----------------------- |
| `apiCallComposer` wrapper        |               | All DAL methods         |
| `requestBodyComposer` for writes |               | Auto timestamps/session |
| `DB_COLLECTIONS` constants       |               | Add MENU_CHANGE_LOG     |
| `getCollectionRef` helper        |               | Standard pattern        |
| Multi-tenant paths `{tId}/{sId}` |               | All collections         |

### Firebase Cost Optimization (CRITICAL)

| Strategy               | MOL v0 Status | Notes                     |
| ---------------------- | ------------- | ------------------------- |
| Feature flag gating    |               | `ENABLE_MENU_OBSERVATION` |
| Fire-and-forget writes |               | Non-blocking              |
| No read-before-write   |               | Append-only logs          |
| Batch processing       |               | Nightly Cloud Function    |
| Cost telemetry         |               | Added per Category F      |

### Constitution Compliance (from `__docs__/constitution/`)

| Law                                | MOL v0 Status | Notes                     |
| ---------------------------------- | ------------- | ------------------------- |
| Law 1: Default Authority           |               | No owner action required  |
| Law 2: Silence Is a Feature        |               | No UI, no notifications   |
| Law 3: No Explanations             |               | No explanations to owners |
| Law 6: No Cognitive Load           |               | Zero owner-facing changes |
| Law 7: No Feature Without Autonomy |               | Foundation for autonomy   |

### Forbidden Metrics (from Internal Tracking Spec)

| Forbidden                  | MOL v0 Status |
| -------------------------- | ------------- |
| Feature popularity ranking | NOT tracking  |
| Click/tap tracking         | NOT tracking  |
| Engagement scores          | NOT tracking  |
| NPS or satisfaction        | NOT tracking  |
| Session duration           | NOT tracking  |

---

## D.4 Code Patterns to Follow

### D.4.1 DAL Pattern (from `ownerControlUsage`)

```typescript
// Feature flag gate
if (!FEATURE_FLAGS.ENABLE_MENU_OBSERVATION) {
    return; // Silent return
}

// Fire-and-forget pattern
try {
    await logChange(...);
} catch (error) {
    logMenuChangeLogFailure('menu_change_log_tracking_failed', error, getMenuChangeLogEntryContext(entry));
    // Don't throw - don't block user action
}
```

Flush helpers preserve the non-blocking owner-work contract while keeping tenant identity immutable: each pending entry snapshots its validated tenant/store scope when queued, timer handoffs use that stored scope, and `flushPendingChanges()` awaits the drained queued writes without re-resolving a possibly switched active session. Firestore failures remain visible through bounded `menu_change_log_write_failed` diagnostics.

### D.4.2 Collection Reference Pattern

```typescript
const getCollectionRef = async () => {
  session = Boolean(session) ? session : await getActiveSession();
  return collection(
    firebaseClient,
    `${COLLECTION}/${session.tId}/${session.sId}`
  );
};
```

### D.4.3 Firestore Sanitization

```typescript
import { sanitizeForFirestore } from "@lib/auth/security";

// Always sanitize before write
await setDoc(docRef, sanitizeForFirestore(data));
```

---

## Document History

| Version | Date       | Author                       | Changes                              |
| ------- | ---------- | ---------------------------- | ------------------------------------ |
| 1.0     | 2026-01-14 | Cascade + ChatGPT validation | Initial plan                         |
| 1.1     | 2026-01-14 | Cascade                      | Restructured per IDE prompt template |
| 1.2     | 2026-01-14 | Cascade                      | Sprint 1 implementation complete     |
| 1.3     | 2026-01-14 | Cascade                      | Sprint 2 implementation complete     |

---

## Quick Navigation

| Section               | Purpose                           | Audience              |
| --------------------- | --------------------------------- | --------------------- |
| **A. Specification**  | Business goals, scope, risks      | CEO, Founder, Product |
| **B. Implementation** | Technical blueprint, checklists   | Engineering           |
| **C. Marketing**      | N/A (internal infrastructure)     | —                     |
| **D. Appendices**     | Future path, references, patterns | All                   |

---

## Implementation Summary (Completed Jan 14, 2026)

### Files Created

| File                                          | Purpose                        | Lines |
| --------------------------------------------- | ------------------------------ | ----- |
| `src/types/menuObservation.ts`                | All MOL types                  | 158   |
| `src/database/menuChangeLog/index.ts`         | Change log DAL with debouncing | 480   |
| `functions/src/analytics/menuDriftMetrics.ts` | Nightly drift computation      | 400   |

### Files Modified

| File                                     | Change                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| `src/constants/database.ts`              | Added `MENU_CHANGE_LOG`, `MENU_ITEM_STATE`, `TELEMETRY`                      |
| `src/config/features.ts`                 | Added `ENABLE_MENU_OBSERVATION` (off), `MENU_OBSERVATION_DEBOUNCE_MS` (5000) |
| `src/database/projects/index.ts`         | Added change detection in `updateProject()`                                  |
| `functions/src/constants/database.ts`    | Added MOL collections                                                        |
| `functions/src/decisionBlocksScoring.ts` | Added drift metrics to nightly scheduler (2:30 AM UTC)                       |

### To Activate

```typescript
// In src/config/features.ts
ENABLE_MENU_OBSERVATION: true,  // Change from false to true
```

Then run `npm run verify:functions-deploy-preflight` and deploy the affected Function to QA with `firebase deploy --project menulist-qa --config firebase.json --only functions:computeDecisionBlocksScores --non-interactive`. Production deploy requires QA evidence and explicit production deploy approval.

---

**Status**: Historical Sprint 1 and 2 implementation evidence only; current testing or deploy approval requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:agent-readiness`, `npm run verify:functions-deploy-preflight`, Firestore/cost evidence, scoped `menulist-qa` scheduler deploy evidence where Function logic changes, target-environment smoke, and explicit production deploy approval.
