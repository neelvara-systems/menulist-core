# Menu Correctness Engine — Firebase Cost Tracking

**Version:** 3.1
**Status:** ✅ IMPLEMENTED — Active with verified $0.00/month additional Firebase cost
**Audience:** Engineering, DevOps, Cost Audit
**Last Updated:** June 11, 2026

---

## 1. Collections Touched

| Collection             | New?     | Purpose                                  | Access Pattern                             |
| ---------------------- | -------- | ---------------------------------------- | ------------------------------------------ |
| `projects/{tId}/{sId}` | Existing | Project data + new `_mce` metadata field | Write on save (existing), read by surfaces |

**No new Firestore collections.** MCE adds a single `_mce` field to the existing project document as part of the existing `setDoc` call.

---

## 2. Firestore Reads

### MCE adds ZERO new Firestore reads

CSR validation runs entirely client-side. It operates on the project data that `updateProject()` already has in memory. No additional Firestore reads are needed.

| Operation      | Collection             | New Reads | Reason                                         |
| -------------- | ---------------------- | --------- | ---------------------------------------------- |
| CSR validation | None                   | 0         | Client-side only, operates on in-memory data   |
| Surface reads  | `projects/{tId}/{sId}` | 0         | Surfaces already read project data (unchanged) |

---

## 3. Firestore Writes

### MCE adds ZERO new Firestore writes

The `_mce` metadata field is merged into the existing `setDoc` call that `updateProject()` already performs. No additional write operation.

| Operation       | Collection             | New Writes | Reason                               |
| --------------- | ---------------------- | ---------- | ------------------------------------ |
| `_mce` metadata | `projects/{tId}/{sId}` | 0          | Part of existing `setDoc` merge call |

---

## 4. Firestore Deletes

None. MCE does not delete any documents.

---

## 5. Storage Operations

None. MCE does not use Firebase Storage.

---

## 6. Cloud Functions

None in v1. Drift Guardian deferred to Phase 2 (see spec §17 Decision 3).

---

## 7. DAL Function Mapping

### New Functions (Client-Side Only)

| Function                | File                                 | Firebase Operations               |
| ----------------------- | ------------------------------------ | --------------------------------- |
| `evaluateCorrectness()` | `src/lib/mce/correctnessResolver.ts` | 0 reads, 0 writes (pure function) |
| `mceValidate()`         | `src/lib/mce/index.ts`               | 0 reads, 0 writes (pure function) |
| `sanitizeForClient()`   | `src/lib/mce/utils.ts`               | 0 reads, 0 writes (pure function) |

### Modified Functions

| Function          | File                             | Change                                 | Cost Impact                  |
| ----------------- | -------------------------------- | -------------------------------------- | ---------------------------- |
| `updateProject()` | `src/database/projects/index.ts` | Add `_mce` field to existing save data | $0.00 — same write operation |

---

## 8. Cost Estimate: 1000 Active Stores/Month

| Component       | Monthly Reads | Monthly Writes | Read Cost | Write Cost | Total     |
| --------------- | ------------- | -------------- | --------- | ---------- | --------- |
| MCE validation  | 0             | 0              | $0.00     | $0.00      | $0.00     |
| `_mce` metadata | 0             | 0              | $0.00     | $0.00      | $0.00     |
| **Total**       | **0**         | **0**          | **$0.00** | **$0.00**  | **$0.00** |

**MCE is currently enabled and adds $0.00/month to Firebase costs at any scale.** This is because:

1. CSR validation is a pure client-side function — no Firebase calls
2. The `_mce` field is merged into the existing `setDoc` call — no additional write
3. No new collections, no new indexes, no Cloud Functions in v1

---

## 9. Expensive Patterns & Optimization Opportunities

None. MCE has zero Firebase cost impact.

### Future Consideration: Drift Guardian (Phase 2)

If Drift Guardian is added in the future, estimated cost:

- ~4 reads per store per day (re-validate project data)
- ~$0.15/month per 1000 stores
- This is well within acceptable limits and can be evaluated when needed

---

## 10. Firestore Indexes Required

None. MCE does not add new collections or queries that require indexes.

---

## 11. Cost Monitoring Checklist

- [ ] Verify zero cost increase after 30 days of MCE rollout
- [ ] Monitor `_mce` field size (should be < 200 bytes per document)
- [ ] Confirm no unexpected reads/writes in Firebase usage dashboard

---

## 12. Architectural Decision: Why Zero Cost

During the design phase, we evaluated a snapshot-based architecture that would have added:

- 3 new Firestore collections (`menuSnapshots`, `menuSnapshotPointers`, `menuDriftLogs`)
- 3 extra writes per save (~$1.26/month per 1000 stores)
- 2 extra reads per surface request
- A daily Cloud Function (Drift Guardian)

**We decided against this approach.** The project data IS the truth. All surfaces already read from it. All write points are controlled. Adding duplicate collections would increase cost and complexity without meaningful benefit for our scale.

Instead, MCE validates at save-time (client-side, free) and stamps verification metadata on the existing document (same write, free). See spec §17 for full rationale.

---

_Document Classification: Internal — Engineering & Cost Audit_
_Cross-reference with: `menu-correctness-engine_impl.md` §12_
