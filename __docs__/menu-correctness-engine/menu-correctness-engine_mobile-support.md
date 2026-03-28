# Menu Correctness Engine (MCE) — Mobile Support

**Last Updated:** February 16, 2026
**Decision:** ❌ NO UI — Backend validation layer, runs silently on save

---

## Feature Admission Test

Not applicable — MCE is a validation layer that runs on every menu save. It has no separate UI on desktop or mobile.

---

## How MCE Relates to Mobile

MCE validates project data on every `updateProject()` call. Since mobile uses the same `updateProject()` DAL function as desktop, MCE validation runs identically for mobile edits:

- Toggle availability → `updateProject()` → MCE stamps `_mce` metadata ✅
- Edit item → `updateProject()` → MCE validates ✅
- Add/delete item → `updateProject()` → MCE validates ✅

The MCE "Publish-Gate" (validation feedback to owner) only runs in the desktop editor's "Continue" button flow. Mobile edits are live-saved without the publish gate, which is acceptable because mobile edits are simpler (individual item changes, not bulk restructuring).
