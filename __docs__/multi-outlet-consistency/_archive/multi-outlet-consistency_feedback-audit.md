> **Historical archive evidence; not current launch certification.** This file is retained for historical context only and is not current production approval, deploy approval, launch approval, or release certification. Current readiness is decided by the active production-readiness audit, External Certification Runbook evidence, current source verifiers, browser/device QA, provider/deploy evidence, and production-host smoke.

# 📋 CHATGPT FEEDBACK AUDIT REPORT

**Feature:** #4 — Multi-Store Brand Consistency  
**Document Type:** Post-Implementation Feedback Audit  
**Date:** January 22, 2026  
**Auditor:** Cascade (Codebase Authority)

---

## Summary: 1/7 Valid | 4 Rejected | 2 Clarify

| #   | ChatGPT Point                           | Status     | Spec Reference          | Action         | Code Changes           |
| --- | --------------------------------------- | ---------- | ----------------------- | -------------- | ---------------------- |
| 1   | MasterStoreId must exist in masterRef   | ❌ Reject  | impl.md §4.3-4.4        | None           | N/A                    |
| 2   | Server-side access control enforcement  | 🔄 Clarify | impl.md §7              | Phase 2 scope  | Future integration     |
| 3   | MultiOutletIndex collection needed      | ❌ Reject  | impl.md §0 Principle #2 | None           | N/A                    |
| A   | ProjectId parsing security risk         | ✅ Valid   | Security rules          | Add validation | `multiOutlet/index.ts` |
| B   | Pricing Integrity staleness propagation | 🔄 Clarify | impl.md §1.3            | Phase 2 scope  | Future integration     |
| C   | Override cleanup rules                  | ❌ Reject  | Already implemented     | None           | N/A                    |
| D   | Theme inheritance rule                  | ❌ Reject  | Not in spec             | None           | N/A                    |

---

## 🎯 DETAILED ANALYSIS

### Critical Gap #1: MasterStoreId must exist in masterRef

**ChatGPT Claim:**

> Spec required `masterRef: { masterProjectId, masterStoreId, lastSyncedOn }` but implementation uses `linkStoreToMaster("storeProjectId", "masterProjectId")` without `masterStoreId`.

**Cascade Verdict: ❌ REJECTED**

**Evidence:**

- User explicitly confirmed: _"we have decided that we store masterProjectId on top level in project datastructure no object nothing plain single key masterProjectId"_
- `@/src/components/templates/main-app/projects/types/project.types.ts:217`:
  ```typescript
  masterProjectId?: string;
  ```
- impl.md §4.4 specifies projectId format: `{tId}-{timestamp}-{sId}`
- `@/src/lib/multiOutlet/resolveProject.ts:32-41` extracts `tId` and `sId` from projectId:
  ```typescript
  export function parseProjectId(projectId: string): {
    tId: number;
    sId: number;
  } {
    const parts = projectId.split("-");
    return {
      tId: parseInt(parts[0], 10),
      sId: parseInt(parts[parts.length - 1], 10),
    };
  }
  ```
- `@/src/database/multiOutlet/index.ts:63-64` uses this pattern correctly:
  ```typescript
  const { tId, sId: masterStoreId } = parseProjectId(masterProjectId);
  ```

**Rationale:** The projectId format `{tId}-{timestamp}-{sId}` allows extracting storeId at read time. No need for redundant `masterStoreId` field. This is explicitly designed in impl.md §4.4: _"This eliminates the need for `masterStoreId` field — we extract it from `masterProjectId`."_

---

### Critical Gap #2: Access control at write-level

**ChatGPT Claim:**

> Locked field validation exists but needs proof that outlet cannot edit inherited name/desc/images/category, run AI generation on inherited items, or change theme for chain tenant.

**Cascade Verdict: 🔄 CLARIFY (Phase 2 Scope)**

**Evidence:**

- `@/src/lib/multiOutlet/masterUtils.ts` contains locked field validation utilities (ready to use)
- These utilities are not yet integrated into API routes (Phase 2: UI Integration work)

**Rationale:** Phase 1 is foundation only. API route integration is Phase 2 work when the editor is connected to multi-outlet. The validation helpers are production-ready and waiting for integration.

**Spec Reference:** impl.md §5.2 Files to Modify lists `Editor.tsx` as Phase 2 work.

---

### Critical Gap #3: MultiOutletIndex collection needed

**ChatGPT Claim:**

> Need `tenants/{tId}/multiOutletIndex/{masterProjectId}` to list linked outlets because Firestore can't `collectionGroup("projects")`.

**Cascade Verdict: ❌ REJECTED**

**Evidence:**

- impl.md §0 Non-Negotiable Principle #2: **"No new collections"**
- impl.md §4.1: _"Use existing `projects/` + `platformSummary`"_
- Current architecture uses direct doc reads (2-read max) — no collection queries needed

**Rationale:** The spec explicitly forbids new collections. If chain-grade listing is needed later, it can query by `masterProjectId` field (supported by Firestore) or be added as an optional enhancement. This is not Phase 1 scope.

---

### Risk Check A: ProjectId parsing = security risk

**ChatGPT Claim:**

> Parsing projectId to extract tId/sId is a footgun. Malicious user could craft projectId to point to another store. Must validate against session permissions.

**Cascade Verdict: ✅ VALID (Minor Enhancement)**

**Evidence:**

- `@/src/database/multiOutlet/index.ts:85-87` uses `session.tId` and `session.sId` for store project authorization ✅
- However, we should add explicit validation that parsed `tId` from `masterProjectId` matches `session.tId`

**Current Code (line 63-70):**

```typescript
const { tId, sId: masterStoreId } = parseProjectId(masterProjectId);

const masterProject = await getProjectDataByStore(
  tId,
  masterStoreId,
  masterProjectId,
);
```

**Required Fix:** Add tenant validation before cross-store read:

```typescript
const { tId, sId: masterStoreId } = parseProjectId(masterProjectId);

// SECURITY: Validate master is within same tenant
if (tId !== session.tId) {
  throw new Error("Cross-tenant master reference is not allowed");
}
```

---

### Risk Check B: Master updates trigger Pricing Integrity staleness

**ChatGPT Claim:**

> If master price changes, outlet PDFs/screens must become stale. Without this, chains will show wrong prices.

**Cascade Verdict: 🔄 CLARIFY (Phase 2 Scope)**

**Evidence:**

- impl.md §1.3 Cascade-Discovered Improvements explicitly mentions this:
  > _"`PricingIntegrityState` integration - Master price changes trigger staleness"_

**Rationale:** This is acknowledged in the impl.md as Phase 2 integration work. The foundation is in place (Pricing Integrity feature #1 already exists). Connection happens when multi-outlet is enabled and integrated with existing systems.

---

### Risk Check C: Override cleanup rules

**ChatGPT Claim:**

> Must enforce that outlet override wins until cleared. Optional: auto-clean if override equals master value.

**Cascade Verdict: ❌ REJECTED (Already Implemented)**

**Evidence:**

- `@/src/database/multiOutlet/index.ts:392-431` - `removeItemOverride()` function exists
- `@/src/database/multiOutlet/index.ts:437-477` - `removeCategoryOverride()` function exists
- Overrides are stored in `overrides.items[itemId]` and explicitly removed when called

**Code:**

```typescript
export const removeItemOverride = async (
  storeProjectId: string,
  itemId: string,
) => {
  // ... removes override, reverts to master value
};
```

**Rationale:** Manual cleanup is implemented. Auto-cleanup (if override equals master) is an optional optimization not required for Phase 1.

---

### Risk Check D: Theme inheritance rule

**ChatGPT Claim:**

> Must define if outlet inherits theme from master or keeps its own. For premium chains, theme must be HQ-owned.

**Cascade Verdict: ❌ REJECTED (Not in Spec)**

**Evidence:**

- Neither spec.md nor impl.md mention theme inheritance
- Theme is stored in `project.config` which is a store-level concern
- No business requirement for theme locking in P0 scope

**Rationale:** This is scope creep. Theme inheritance can be added as a future enhancement if business requires it. Not Phase 1 scope.

---

## 🎯 IMPLEMENTATION PLAN

### Priority 1: Ship Blocker (Must Fix)

| #   | Fix                                         | File                                | Lines                   |
| --- | ------------------------------------------- | ----------------------------------- | ----------------------- |
| A   | Add tenant validation for cross-store reads | `src/database/multiOutlet/index.ts` | 63-70, 141-148, 294-301 |

### Priority 2: Phase 2 Scope (Not Now)

| #   | Enhancement                                           | When                        |
| --- | ----------------------------------------------------- | --------------------------- |
| 2   | Integrate locked field validation in API routes       | Phase 2: UI Integration     |
| B   | Connect Pricing Integrity staleness to master updates | Phase 2: System Integration |

### Priority 3: Rejected (No Action)

| #   | Reason                                                                    |
| --- | ------------------------------------------------------------------------- |
| 1   | Architecture decision: projectId format eliminates need for masterStoreId |
| 3   | Violates non-negotiable principle #2: "No new collections"                |
| C   | Already implemented (removeItemOverride, removeCategoryOverride)          |
| D   | Scope creep: theme inheritance not in spec                                |

---

## ✅ EXECUTION: STAGE 2 (Valid Corrections Only)

Only implementing **Risk Check A** - tenant validation for cross-store reads.

---

**DOCUMENT STATUS:** ✅ AUDIT COMPLETE  
**AUDITOR:** Cascade  
**TIMESTAMP:** January 22, 2026
