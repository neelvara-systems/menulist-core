# Menu Command Center — Firebase Cost Tracking

**Version:** 1.1
**Last Updated:** February 14, 2026
**Audience:** Founder, developers, cost auditors
**Status:** ✅ Implementation Complete

---

## Summary

- **Collections Used:** `projectsData` (existing — no new collections)
- **Storage Buckets:** None (no file uploads)
- **Cloud Functions:** None (no server-side logic)
- **Estimated Monthly Cost:** **$0.00 additional** — reuses existing `updateProject()` write

---

## Why Zero Additional Cost

The Menu Command Center is a **100% frontend feature**. All computation (pricing calculations, availability toggles, show/hide toggles, category moves) happens client-side in the browser. The only Firebase interaction is the existing `updateProject()` DAL function that already runs on every editor save.

**Key principle:** All bulk changes are accumulated locally on a `Project` object clone, then sent to Firebase as a **single `updateProject()` call** — not per-item writes. This is the same pattern used by all existing bulk modals.

---

## Firestore Operations

### Reads

| Operation             | Collection       | Trigger          | Frequency        | Docs Read | Indexed? | Notes                                |
| --------------------- | ---------------- | ---------------- | ---------------- | --------- | -------- | ------------------------------------ |
| Load project data     | projectsData     | Editor page load | Once per session | 1         | Yes      | Already happens — no additional read |
| Load project metadata | projectsMetadata | Editor page load | Once per session | 1         | Yes      | Already happens — no additional read |

**No new reads.** The Command Center operates on `projectData` already loaded in `Editor.tsx` state.

### Writes

| Operation         | Collection       | Trigger             | Frequency                         | Docs Written | Fields                           | Notes                                                 |
| ----------------- | ---------------- | ------------------- | --------------------------------- | ------------ | -------------------------------- | ----------------------------------------------------- |
| Save bulk changes | projectsData     | User clicks "Apply" | Per bulk action (1-3 per session) | 1            | merge update                     | Same as existing `updateProject()` — single doc write |
| Update metadata   | projectsMetadata | Auto (with save)    | With each save                    | 1            | `modifiedOn`, `pricingIntegrity` | Same as existing auto-save pattern                    |

**Per bulk action: 1-2 Firestore writes** (same as editing a single item and saving).

### Deletes

| Operation | Collection | Trigger | Frequency | Docs Deleted | Soft/Hard | Notes                                 |
| --------- | ---------- | ------- | --------- | ------------ | --------- | ------------------------------------- |
| None      | —          | —       | —         | —            | —         | Feature does not delete any documents |

---

## Firebase Storage

| Operation | Path Pattern | Trigger | Size | Notes                                 |
| --------- | ------------ | ------- | ---- | ------------------------------------- |
| None      | —            | —       | —    | No file uploads or storage operations |

---

## Cloud Functions

| Function | Trigger | Frequency | Duration | Memory | Notes                       |
| -------- | ------- | --------- | -------- | ------ | --------------------------- |
| None     | —       | —         | —        | —      | No Cloud Functions involved |

---

## Security Rules Impact

- No new security rules needed
- Relies on existing `projectsData` write rules (tenant + store isolation)
- No custom claims or role checks beyond existing auth

---

## Cost Optimization Notes

### Current Optimizations (Built-in)

- **Single batch write**: All bulk changes (even 800 items) are saved in ONE Firestore document write, not 800 individual writes
- **Client-side computation**: Preview calculations, rounding, guardrails all run in browser — zero server cost
- **No additional reads**: Operates on already-loaded project data in React state
- **Undo is client-side**: Undo reverts to stored snapshot in memory, then saves — costs same as one regular write

### Potential Optimizations

- None needed — this feature is inherently cost-efficient because it's frontend-only

### Warnings: Patterns to Watch

- **Do NOT implement per-item saves**: If someone suggests saving each item individually after bulk change → reject. Current single-document pattern is correct.
- **Do NOT add server-side pricing logic**: Keep all computation client-side. No API routes needed.
- **Do NOT add Cloud Functions for bulk operations**: The existing `updateProject()` pattern handles everything.

---

## Cost Estimate (per 1000 active users/month)

Assuming each user does ~4 bulk operations per month (monthly price adjustment, seasonal changes):

| Resource          | Operations/month                         | Unit Cost     | Monthly Cost |
| ----------------- | ---------------------------------------- | ------------- | ------------ |
| Firestore Reads   | 0 (reuses existing)                      | $0.06/100K    | $0.00        |
| Firestore Writes  | 4,000 (1 write × 4 actions × 1000 users) | $0.18/100K    | $0.01        |
| Firestore Deletes | 0                                        | $0.02/100K    | $0.00        |
| Storage           | 0                                        | $0.026/GB     | $0.00        |
| Cloud Functions   | 0                                        | $0.40/million | $0.00        |
| **Total**         |                                          |               | **$0.01**    |

**Verdict:** Effectively free. The cost is negligible — less than 1 cent per 1000 users per month.

---

## DAL Functions Used

| Function        | File                             | Line | Operation Type |
| --------------- | -------------------------------- | ---- | -------------- |
| `updateProject` | `src/database/projects/index.ts` | ~120 | Write (merge)  |

No new DAL functions needed. The feature reuses the existing `updateProject()` function that all editor operations use.

---

## API Routes & Their Firebase Impact

| Route | Method | Firebase Ops | Rate Limited? | Notes                         |
| ----- | ------ | ------------ | ------------- | ----------------------------- |
| None  | —      | —            | —             | No API routes — 100% frontend |

---

## Comparison with Existing Bulk Modals

| Modal                       | Firebase Pattern                                      | Writes per Use     |
| --------------------------- | ----------------------------------------------------- | ------------------ |
| BulkStatusMenuModal         | `onApply(updatedProject)` → `syncChanges()` → 1 write | 1-2                |
| ReorderMenuModal            | `onApply(updatedProject)` → `syncChanges()` → 1 write | 1-2                |
| DecisionBlocksSettingsModal | `onApply(updatedProject)` → `syncChanges()` → 1 write | 1-2                |
| **CommandCenterModal**      | `onApply(updatedProject)` → `syncChanges()` → 1 write | **1-2 per action** |

The Command Center follows the exact same pattern. The only difference is it may trigger 2-3 saves per session (multi-action), but each save is the same cost as any other editor operation.

---

**Document Signature:** Firebase Cost Tracking (Critical Internal)
**Created:** February 13, 2026
