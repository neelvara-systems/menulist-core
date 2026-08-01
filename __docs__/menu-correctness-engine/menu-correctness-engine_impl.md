# Menu Correctness Engine — Implementation Blueprint

**Version:** 3.2
**Status:** ✅ IMPLEMENTED — Active (`ENABLE_MCE: true`)
**Audience:** Developers
**Last Updated:** July 29, 2026

> **Current runtime boundary:** Standalone update and standalone publish transactions stamp `_mce` in their existing write. The editor gate validates its in-memory project, including resolved linked outlets. The authenticated linked-outlet route enforces schema, policy, scope, and concurrency but does not persist `_mce`; do not interpret older blueprint wording below as a claim that every linked save is stamped.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Core Components](#2-core-components)
3. [Database Schema](#3-database-schema)
4. [File Inventory](#4-file-inventory)
5. [Integration Points](#5-integration-points)
6. [Validation Rules](#6-validation-rules)
7. [Multi-Outlet Handling](#7-multi-outlet-handling)
8. [Feature Flag Strategy](#8-feature-flag-strategy)
9. [Security Checklist](#9-security-checklist)
10. [Implementation Phases](#10-implementation-phases)
11. [Testing Guide](#11-testing-guide)
12. [Firebase Cost Estimation](#12-firebase-cost-estimation)
13. [Architecture Decision Records](#13-architecture-decision-records)

---

## 1. Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    OWNER DASHBOARD                           │
│                                                              │
│  Editor (syncChanges) ──► updateProject() ──┐               │
│  Command Center ──────► updateProject() ──┤               │
│  Bulk Status Modal ───► updateProject() ──┤               │
│                                              │               │
│                                              ▼               │
│                    ┌───────────────────────────────┐         │
│                    │  MCE: CSR Validation           │         │
│                    │  evaluateCorrectness(data)     │         │
│                    └──────────┬────────────────────┘         │
│                               │                              │
│                               ▼                              │
│                    ┌───────────────────────────────┐         │
│                    │  Stamp _mce metadata on        │         │
│                    │  project document              │         │
│                    │  (part of same setDoc call)    │         │
│                    └───────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                               │
            Same project document served to all surfaces:
                               │
        ┌──────────┬───────────┼───────────┬──────────┐
        ▼          ▼           ▼           ▼          ▼
     QR/Web     Screen       PDF        Staff       POS
     Menu        TV         Export      Prompt     Webhook
  (Firestore) (campaigns)  (on-demand) (Firestore) (webhook)
```

### Data Flow

```
1. Owner saves in editor
2. updateProject() called (existing DAL)
3. IF ENABLE_MCE:
   a. CSR validates the project data (client-side, < 100ms)
   b. Validation result merged into save data as _mce field
   c. setDoc() writes project data + _mce metadata together
4. IF !ENABLE_MCE:
   a. Existing flow unchanged (direct Firestore write, no _mce field)
5. Surfaces read from same project document (unchanged behavior)
```

### Design Principles

- **Frontend-first:** CSR validation runs entirely client-side. Zero Firebase calls for validation.
- **Non-blocking:** MCE never blocks the raw data write. `_mce` metadata is merged into the same `setDoc` call.
- **Failure-safe:** If MCE fails (try/catch), the raw project data is still written without `_mce` metadata. MCE failure never blocks the owner.
- **Zero MCE collections:** MCE adds only `_mce`; the separate canonical-truth flow already has short-term `menuSnapshots`.
- **Zero cost increase:** No additional Firebase reads or writes beyond what already exists.

---

## 2. Core Components

### 2.1 Correctness State Resolver (CSR)

The CSR is the validation engine. It evaluates menu data against deterministic correctness rules and returns a verification result. Runs entirely client-side with zero Firebase calls.

```typescript
// src/lib/mce/correctnessResolver.ts

interface CSRInput {
  projectData: Project;
  isOutlet: boolean;
  masterProjectId?: string;
}

interface CSRResult {
  verified: boolean; // Did all critical rules pass?
  warnings: CSRWarning[]; // Non-blocking issues (medium/low severity)
  errors: CSRError[]; // Blocking issues (high/critical severity)
  validatedAt: number; // Timestamp
  rulesEvaluated: number;
  rulesPassed: number;
}

interface CSRWarning {
  ruleId: string; // e.g., 'SUSPICIOUS_PRICE_CHANGE'
  message: string;
  severity: "low" | "medium";
  affectedItems: string[];
}

interface CSRError {
  ruleId: string; // e.g., 'REQUIRED_NAME'
  message: string;
  severity: "high" | "critical";
  affectedItems: string[];
  suggestedFix?: string;
}

function evaluateCorrectness(input: CSRInput): CSRResult;
```

### 2.2 Verification Metadata (`_mce` field)

Instead of a separate snapshot collection, MCE stamps verification results directly on the existing project document as part of the same `setDoc` call.

```typescript
// src/lib/mce/types.ts

interface MCEMetadata {
  verified: boolean; // Did all critical rules pass?
  verifiedAt: number; // Timestamp of last verification
  warnings: string[]; // Non-blocking warning rule IDs (e.g., ['SUSPICIOUS_PRICE_CHANGE'])
}

// Usage: merged into project data before setDoc()
// data._mce = { verified: true, verifiedAt: Date.now(), warnings: [] }
```

### 2.3 Centralized Sanitization Utility

`sanitizeForClient()` now lives in `src/lib/mce/utils.ts` and is used by the current public client projection.

```typescript
// src/lib/mce/utils.ts

function sanitizeForClient(projectData: any): any;
// Projects the public project shell and every category, item, variant,
// language, time-slot, nutrition, decision-fact and image row through explicit
// field allowlists before data reaches customer-facing surfaces.
```

> **INVARIANT:** Any customer-facing render MUST pass through `sanitizeForClient()`. No surface may read project data and expose it to customers without calling this function. This is a permanent rule — if a new surface is added in the future, it must use this utility.

The nested allowlists are part of that invariant. A newly added owner,
workflow, extraction, billing or AI field remains server/editor-only until its
public contract is deliberately admitted. Inactive rows remain excluded;
decision facts retain only a runtime-valid public value and images retain only
the public URL/variant projection.

### 2.4 Publish-Gate Integration

The Publish-Gate is a UX enforcement layer that reads `_mce` metadata to block certain owner actions when critical validation fails. It is **separate from MCE core validation** (which is silent).

**Trigger:** Owner clicks "Continue to UI Editor" in the editor.

**Behavior:**

- Reads `_mce.verified` from the current project data
- If `true` → proceed normally
- If `false` → show blocking message listing critical errors from `_mce` metadata
- Owner must fix issues and re-save before proceeding

**Important distinction:**

- **MCE core (CSR)** is silent — stamps metadata, no toasts, no popups, no notifications
- **Publish-Gate** is the only place where the owner sees validation feedback
- **Publish-Gate copy is bounded** — locally generated MCE validation messages pass through `getSafeUiErrorMessage(..., { allowTrustedPlainText: true })` with fixed fallback copy before owner display
- This separation ensures MCE authority rule #4 ("Silent authority, zero notifications") is preserved while still giving the owner actionable feedback at the right moment

```typescript
// Pseudocode — in the editor's "Continue to UI Editor" handler
if (FEATURE_FLAGS.ENABLE_MCE && projectData._mce?.verified === false) {
  // Show blocking modal with _mce validation issues
  // Owner must fix and re-save before proceeding
  return;
}
// Proceed to UI Editor
```

---

## 3. Database Schema

### No New Collections

MCE adds zero new Firestore collections. Verification metadata is stored on the existing project document.

### `_mce` Field on Existing Project Document

**Collection:** `projects/{tId}/{sId}` (existing)
**Field:** `_mce` (new field added to existing document)

```typescript
{
    // ... existing project fields unchanged ...

    // MCE Verification Metadata (new)
    _mce: {
        verified: boolean,        // true if all critical rules passed
        verifiedAt: number,       // Date.now() timestamp
        warnings: string[],       // Non-blocking warning rule IDs
    }
}
```

### No New Indexes Required

The `_mce` field is a nested object on the existing project document. No composite indexes needed — CSR reads the project data that's already being fetched.

---

## 4. File Inventory

### New Files

| File                                 | Purpose                                   | Lines |
| ------------------------------------ | ----------------------------------------- | ----- |
| `src/lib/mce/types.ts`               | MCEMetadata, CSRInput, CSRResult, etc.    | 144   |
| `src/lib/mce/correctnessResolver.ts` | CSR — all 17 validation rules             | 727   |
| `src/lib/mce/utils.ts`               | Extracted `sanitizeForClient()` + helpers | 89    |
| `src/lib/mce/index.ts`               | MCE entry point — `mceValidate()`         | 55    |
| `src/lib/mce/diagnostics.ts`         | Bounded validation result/failure logging | 47    |

### Modified Files

| File                                                                | Change                                       | Impact                             |
| ------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------- |
| `src/database/projects/index.ts`                                    | Add MCE validation hook in `updateProject()` plus bounded diagnostics | Low — conditional call behind flag |
| `src/config/features.ts`                                            | Add `ENABLE_MCE` flag                        | Minimal                            |
| `src/components/templates/main-app/projects/types/project.types.ts` | Add `_mce` field to `Project` interface      | Minimal — optional field           |
| `src/components/templates/main-app/projects/editorView/Editor.tsx`  | Publish-Gate in `onContinueClick()`          | Low — conditional behind flag      |
| `src/lib/mce/utils.ts`                                             | Strip `_mce` from the public client projection | Internal metadata stays private  |

**Total: 5 new files (1,062 lines), 5 modified files.**

No new Firestore collections. No new Cloud Functions. No new API routes.

---

## 5. Integration Points

### 5.1 Editor Save Flow

**Current flow** (`src/components/templates/main-app/projects/editorView/Editor.tsx`):

```
syncChanges() → updateProject(projectData) → Firestore write → done
```

**MCE flow:**

```
syncChanges() → updateProject(projectData)
                    │
                    ├─► MCE: evaluateCorrectness(projectData)
                    │         → returns CSRResult
                    │
                    ├─► Merge _mce metadata into save data
                    │
                    └─► setDoc() writes project data + _mce together
```

**Integration point in `updateProject()`:**

`updateProject()` in `src/database/projects/index.ts` already has several fire-and-forget hooks after the Firestore write:

1. Vercel cache revalidation (`revalidateMenuCache`) — line ~442
2. Multi-outlet master cache invalidation (`invalidateMasterCache`) — line ~461
3. Master Updates Awareness (`operationalVersion` increment) — line ~468
4. MOL change detection (`detectAndLogChanges`) — line ~515
5. Multi-outlet event logging (`logMultiOutletEvent`) — line ~525

MCE validation runs **BEFORE the setDoc() call** (unlike existing post-save hooks). It merges `_mce` metadata into the save data:

```typescript
// src/database/projects/index.ts:413-438 — inside updateProject()

// INVARIANT: All customer-facing truth must pass through updateProject().
// MCE validation assumes no direct Firestore writes bypass this path.
// @see __docs__/menu-correctness-engine/menu-correctness-engine_spec.md §19

// BEFORE the setDoc() call
if (FEATURE_FLAGS.ENABLE_MCE && data.projectId) {
  try {
    const { mceValidate, toMCEMetadata } = await import("@lib/mce");
    const result = mceValidate({
      projectData: data as Record<string, any>,
      isOutlet: !!oldProject?.masterProjectId,
      masterProjectId: oldProject?.masterProjectId,
      oldProjectData: oldProject as Record<string, any> | undefined,
    });
    // Merge verification metadata into save data
    (data as any)._mce = toMCEMetadata(result);
    logMCEValidationResult(result);
  } catch (e) {
    // Silent fail — MCE failure never blocks owner
    logMCEValidationFailure(e, {
      isOutlet: Boolean(oldProject?.masterProjectId),
      oldProjectPresent: Boolean(oldProject),
    });
  }
}

// Existing setDoc() call writes project data + _mce together
const updateData = await requestBodyComposer(data, { isNew: false });
await setDoc(await getDataDocRef(data.projectId), updateData, { merge: true });
```

**Key difference from old architecture:** MCE runs BEFORE the write, not after. The `_mce` field is part of the same `setDoc` call — zero extra Firebase operations.

**Diagnostics contract:** `src/lib/mce/diagnostics.ts` records only bounded validation counts and normalized source error name/code/status. It does not log menu text, project payloads, project IDs, owner input, Firestore document data, or raw browser/provider exceptions. The validation result summary is development-only; validation failures remain non-blocking and use secure diagnostics.

`src/components/templates/main-app/projects/utils/editorDiagnostics.ts` is the bounded client-side diagnostics helper for the surrounding menu editor workflow. It covers linked-outlet resolution, Publish-Gate validation, Menu Quality publish-intercept failures, editor save/sync, item content generation, category time-slot preset creation, and uploaded image deletion failures. Editor modal diagnostics record only project/file/item/category/store/image presence and length metadata, counts, booleans, and normalized source error name/code/status. They must not direct-console raw menu text, image URLs, owner-entered item/category names, project/store IDs, Firestore documents, Storage provider responses, or browser/provider exceptions.

Publish-Gate owner-visible validation messages are also routed through the shared safe UI message helper. If a future validation rule ever produces technical-looking text, URLs, structured data, or provider/runtime wording, the owner modal falls back to fixed local copy instead of rendering the raw message.

### 5.2 Surface Data Paths (Unchanged)

All surfaces continue reading from the same project document. MCE does NOT modify any surface data paths:

| Surface        | Data Path                                              | MCE Change |
| -------------- | ------------------------------------------------------ | ---------- |
| QR/Web Menu    | `_client/[[...slug]]/page.tsx` → Firestore project doc | None       |
| Digital Screen | `screen/[token]/page.tsx` → `getMenuItemsForScreenServer()` | None |
| PDF Export     | `menuPdfGenerator.ts` → project data passed in         | None       |
| Staff Prompt   | Firestore project doc (live read)                      | None       |
| POS Webhook    | `triggerPosSyncDebounced()` → project data             | None       |

### 5.3 Multi-Outlet Resolution

**Current** (`src/lib/multiOutlet/resolveProject.ts`): `resolveProjectForRender()` merges master + outlet data.

**MCE:** The editor Publish-Gate validates resolved output. Standalone transactions persist `_mce`; linked outlet persistence relies on the outlet-save route's stricter schema/policy transaction and does not stamp `_mce`.

---

## 6. Validation Rules (Organized by 5 Correctness Laws)

### Law 1 — Price Integrity

| Rule ID                   | Check                                               | Severity | Blocks Verification? |
| ------------------------- | --------------------------------------------------- | -------- | -------------------- |
| `VALID_PRICE_FORMAT`      | Price matches the shared stored display-price schema | high    | Yes                  |
| `NO_NEGATIVE_PRICE`       | No item has a negative price                        | critical | Yes                  |
| `NO_ZERO_PRICE_ACTIVE`    | Active items with price field must have price > 0   | high     | Yes                  |
| `SUSPICIOUS_PRICE_CHANGE` | Price changed by more than 200% from previous value | medium   | No (warning)         |

### Law 2 — Availability Integrity

| Rule ID                         | Check                                                           | Severity | Blocks Verification? |
| ------------------------------- | --------------------------------------------------------------- | -------- | -------------------- |
| `DISABLED_ITEM_HIDDEN`          | Items with `active: false` not included in customer-facing data | high     | Yes                  |
| `OUTLET_AVAILABILITY_RESPECTED` | Outlet local availability override takes precedence over master | high     | Yes                  |

### Law 3 — Hours Data Consistency

| Rule ID              | Check                                                              | Severity | Blocks Verification? |
| -------------------- | ------------------------------------------------------------------ | -------- | -------------------- |
| `HOURS_DATA_PRESENT` | If store has `workingHours` configured, data is structurally valid | low      | No (warning)         |

### Law 4 — Data Completeness

| Rule ID             | Check                                                     | Severity | Blocks Verification? |
| ------------------- | --------------------------------------------------------- | -------- | -------------------- |
| `FILE_HAS_DATA`     | At least one file has extracted data with items           | critical | Yes                  |
| `REQUIRED_NAME`     | Every active item has a name in primary language          | critical | Yes                  |
| `REQUIRED_CATEGORY` | Every active item has a category assignment               | critical | Yes                  |
| `CATEGORY_EXISTS`   | Every item's category ID matches an existing category     | high     | Yes                  |
| `NO_DUPLICATE_IDS`  | No duplicate item or category IDs within a project        | critical | Yes                  |
| `LANGUAGE_COMPLETE` | All declared languages have translations for active items | medium   | No (warning)         |
| `MAX_ITEMS_LIMIT`   | Project doesn't exceed 500 active items                   | low      | No (warning)         |

### Law 5 — Structural Integrity (Multi-Outlet)

| Rule ID                        | Check                                                 | Severity | Blocks Verification? |
| ------------------------------ | ----------------------------------------------------- | -------- | -------------------- |
| `OUTLET_MASTER_SYNC`           | Outlet data based on latest master version            | medium   | No (warning)         |
| `OVERRIDE_PRESERVED`           | Local outlet overrides preserved after master edit    | high     | Yes                  |
| `NO_ORPHAN_ITEMS`              | No items reference nonexistent categories after merge | high     | Yes                  |
| `OUTLET_STRUCTURALLY_COMPLETE` | Outlet has at least one file with items after merge   | critical | Yes                  |

### Rule Evaluation Order

1. **Law 4 — Data Completeness** (must have basic data structure first)
2. **Law 1 — Price Integrity** (validate prices on existing items)
3. **Law 2 — Availability Integrity** (check availability logic)
4. **Law 3 — Hours Data Consistency** (optional validation)
5. **Law 5 — Structural Integrity** (multi-outlet rules, only if outlet)

---

## 7. Multi-Outlet Handling

### Master Project

When a master project is saved:

1. CSR validates the master project data
2. `_mce` metadata stamped on master project document
3. **No automatic outlet re-validation** — outlets validate on their next save

### Outlet Project

When an outlet project is edited and saved:

1. `resolveProjectForRender()` supplies the merged editor view.
2. The editor gate validates that resolved view before continuing.
3. The save payload is reduced to outlet-local state and crosses `/api/projects/outlet-save`, which rechecks scope, permissions, linkage, policy, shape, and concurrency.
4. The outlet document is updated transactionally without a second `_mce` write.

### Master Update Awareness Integration

The existing `ENABLE_MASTER_UPDATE_AWARENESS` system (`operationalVersion` signal doc) notifies outlets of master changes. MCE does not replace this — it validates the result after resolution.

```
Master saves → _mce stamped on master project
                    │
                    └─► operationalVersion incremented (existing)
                              │
                              └─► Outlet editor detects change (existing)
                                        │
                                        └─► Owner re-resolves → MCE validates → _mce stamped on outlet
```

---

## 8. Feature Flag Strategy

```typescript
// src/config/features.ts

/**
 * Menu Correctness Engine (MCE)
 *
 * Pure validation layer used by supported project mutations and the editor gate.
 * Stamps _mce verification metadata on project document.
 *
 * When enabled:
 * - All saves go through CSR validation
 * - _mce field added to project document
 * - sanitizeForClient() available as shared utility
 *
 * When disabled:
 * - Existing save flow unchanged
 * - No _mce field written
 * - No validation overhead
 */
ENABLE_MCE: true,
```

### Rollout Status

| Phase   | Scope                | Duration | Success Criteria                             |
| ------- | -------------------- | -------- | -------------------------------------------- |
| Phase 0 | Internal stores only | Complete | No architecture change required              |
| Phase 1 | 10% of active stores | Complete | No extra Firebase cost                       |
| Phase 2 | 100% rollout         | Active   | Runtime flag is `true` in `src/config/features.ts` |

---

## 9. Security Checklist

| #   | Check                                            | Status                 |
| --- | ------------------------------------------------ | ---------------------- |
| 1   | MCE validation runs client-side only             | ✅ By design           |
| 2   | `_mce` field cannot be spoofed (Firestore rules) | ⚠️ Low risk — see note |
| 3   | No new API routes exposed                        | ✅ By design           |
| 4   | Feature flag allows instant disable              | ✅ By design           |
| 5   | MCE failure never blocks save                    | ✅ try/catch           |
| 6   | No sensitive data in `_mce` metadata             | ✅ By design           |
| 7   | Sanitization utility strips internal metadata    | ✅ Same logic          |

### Firestore Security Rule for `_mce`

> **Decision (Feb 24, 2026):** Structural validation of `_mce` in Firestore rules is **deferred**.
> **Risk assessment:** LOW. Only tenant admins (`isTenantAdmin()`) can write to `projectsData`. The `_mce` field is the owner's own quality score — spoofing it only harms their own menu. The field is stripped by `sanitizeForClient()` before any customer-facing exposure. No security boundary depends on `_mce` values.
> **If needed later**, add the structural rule below:

```javascript
// firestore.rules — add to projects collection write rule
// Allow _mce field only with correct structure
allow write: if !('_mce' in request.resource.data) ||
    (request.resource.data._mce.keys().hasAll(['verified', 'verifiedAt', 'warnings']) &&
     request.resource.data._mce.verified is bool &&
     request.resource.data._mce.verifiedAt is number &&
     request.resource.data._mce.warnings is list);
```

---

## 10. Implementation Phases

### Phase 1: Foundation + CSR ✅ DONE

- [x] Create `src/lib/mce/` directory
- [x] Implement `types.ts` — all type definitions
- [x] Implement `correctnessResolver.ts` — all 18 validation rules
- [x] Implement `utils.ts` — `sanitizeForClient()` shared utility
- [x] Implement `index.ts` — `mceValidate()` + `toMCEMetadata()` entry points
- [x] Add `ENABLE_MCE` flag to `src/config/features.ts` (enabled: `true` as of Session 13)
- [ ] Unit tests for every CSR rule (deferred — manual testing done)

### Phase 2: Integration ✅ DONE

- [x] Add MCE validation hook in `updateProject()` (before setDoc) — `src/database/projects/index.ts:524`
- [x] `_mce` Firestore rule — deferred (low risk, see §9 note)
- [x] Publish-Gate integration — blocks "Continue to UI Editor" on critical MCE failures
- [x] Integration tested: save → `_mce` field written correctly

### Phase 3: Rollout ✅ DONE

- [x] `ENABLE_MCE: true` enabled for all stores (Session 13, Feb 24, 2026)
- [x] Zero Firebase cost increase confirmed (same setDoc call)
- [ ] Monitor validation pass rate over first week

---

## 11. Testing Guide

### Unit Tests

```typescript
// src/lib/mce/__tests__/correctnessResolver.test.ts

describe("CSR — Law 1: Price Integrity", () => {
  test("VALID_PRICE_FORMAT: accepts currency/text/range values and rejects unsafe format", () => {});
  test("NO_NEGATIVE_PRICE: rejects -50", () => {});
  test("NO_ZERO_PRICE_ACTIVE: rejects active item with price 0", () => {});
  test("SUSPICIOUS_PRICE_CHANGE: warns on >200% change", () => {});
});

describe("CSR — Law 4: Data Completeness", () => {
  test("REQUIRED_NAME: fails if active item has no name", () => {});
  test("REQUIRED_CATEGORY: fails if active item has no category", () => {});
  test("CATEGORY_EXISTS: fails if category ID not found", () => {});
  test("NO_DUPLICATE_IDS: fails on duplicate item IDs", () => {});
  test("FILE_HAS_DATA: fails if no files have items", () => {});
});

describe("CSR — Law 5: Structural Integrity", () => {
  test("OVERRIDE_PRESERVED: detects lost override after merge", () => {});
  test("NO_ORPHAN_ITEMS: detects items with broken category refs", () => {});
});
```

### Integration Test

```typescript
// Manual verification:
// 1. Confirm ENABLE_MCE flag is true
// 2. Save a valid menu → check _mce.verified === true
// 3. Save menu with empty item name → check _mce.verified === false
// 4. Disable flag → verify no _mce field written
```

---

## 12. Firebase Cost Estimation

### Per Save (When MCE Enabled)

| Operation                    | Reads | Writes | Cost      |
| ---------------------------- | ----- | ------ | --------- |
| CSR validation (client-side) | 0     | 0      | $0.00     |
| `_mce` field (same setDoc)   | 0     | 0      | $0.00     |
| **Total per save**           | **0** | **0**  | **$0.00** |

### Monthly Cost at Scale

| Stores | Saves/Day | Monthly Cost |
| ------ | --------- | ------------ |
| 100    | 500       | $0.00        |
| 1,000  | 5,000     | $0.00        |
| 10,000 | 50,000    | $0.00        |

**MCE adds zero Firebase cost.** CSR runs client-side. The `_mce` field is part of the existing `setDoc` call that already happens.

---

## 13. Architecture Decision Records

### ADR-1: No Separate Snapshot Collection

**Decision:** Validate project data in-place. No `menuSnapshots` collection.

**Rationale:** Project data IS the truth. All surfaces already read from it. All write points are controlled through `updateProject()`. A separate collection would add 3 extra writes per save and extra reads per surface. See spec §17 Decision 1 for full rationale.

### ADR-2: Client-Side Validation Only

**Decision:** CSR runs entirely client-side. No server-side validation component.

**Rationale:** Following the existing DAL pattern where `updateProject()` does a direct Firestore write from the client. CSR adds validation before the write. Zero Firebase cost for validation.

**Trade-off:** Client-side validation can be bypassed by a malicious client. Mitigation: Firestore security rules enforce `_mce` field structure.

### ADR-3: Verification Metadata on Existing Document

**Decision:** Add `_mce` field to existing project document instead of separate collection.

**Rationale:** Zero extra Firebase writes, zero extra reads, zero new collections. Provides foundation for future Drift Guardian if ever needed.

### ADR-4: No Drift Guardian in v1

**Decision:** Defer background monitoring to Phase 2.

**Rationale:** Current validation is mutation-local and adds no provider work. Background validation is not justified by current evidence; any future monitor must use the existing consolidated maintenance scheduler and a bounded read model rather than a new standalone Function.

### ADR-5: No Surface Exposure Controller

**Decision:** Don't build a routing layer. Surfaces continue reading project data directly.

**Rationale:** Without snapshots, there's no routing problem. All surfaces already read from the correct data source.

### ADR-6: Deterministic Rules Only — No AI in CSR

**Decision:** CSR uses only deterministic, hard-coded validation rules. No AI, no probabilistic scoring.

**Rationale:** Infrastructure must be predictable. A rule that "sometimes passes, sometimes fails" for the same input destroys trust. Given identical input, CSR always produces identical output.

---

_Document Classification: Internal — Engineering Team_
_Prerequisite: Read `menu-correctness-engine_spec.md` first_
