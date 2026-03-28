# Decision Intelligence — Firebase Cost Tracking

**Feature:** Decision Blocks (Smart Menu Recommendations)  
**Status:** ✅ Production Ready  
**Last Updated:** February 7, 2026  
**Priority:** HIGH — Nightly Cloud Function scoring + customer-facing reads on every menu view.

---

## Summary

- **Collections Used:** `decisionBlocks`, `projects/{tId}/{sId}`, `analytics`, `stores`
- **Storage Buckets:** None
- **Cloud Functions:** `decisionBlocksScoring` (scheduled nightly)
- **Estimated Monthly Cost:** **Medium** — Scales with number of active projects

---

## Firestore Operations

### Reads

| Operation                          | Collection                               | Trigger              | Frequency                  | Docs Read | Indexed?         | Notes                                                                                                   |
| ---------------------------------- | ---------------------------------------- | -------------------- | -------------------------- | --------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| Customer: fetch precomputed blocks | `decisionBlocks/{tId}_{sId}_{projectId}` | Customer page load   | Per menu view (cached 60s) | 1         | Direct doc       | Read by client menu page. Cached via `unstable_cache`. File: `src/app/_client/[[...slug]]/page.tsx:138` |
| Scoring: read project data         | `projects/{tId}/{sId}/{projectId}`       | Nightly scoring job  | Per active project         | 1         | Direct doc       | Cloud Function reads full project for item analysis.                                                    |
| Scoring: read analytics            | `analytics`                              | Nightly scoring job  | Per active project         | 7-30      | Yes (date range) | Reads daily analytics docs for scoring period (7-30 days).                                              |
| Scoring: read store config         | `stores/{storeId}`                       | Nightly scoring job  | Per store                  | 1         | Direct doc       | Reads business type for category-specific config.                                                       |
| Owner: read block config           | `decisionBlocks/{tId}_{sId}_{projectId}` | Owner opens settings | Per settings view          | 1         | Direct doc       | Owner viewing pin controls and block configuration.                                                     |

### Writes

| Operation                      | Collection                               | Trigger                  | Frequency          | Docs Written | Fields                                                | Notes                                       |
| ------------------------------ | ---------------------------------------- | ------------------------ | ------------------ | ------------ | ----------------------------------------------------- | ------------------------------------------- |
| Scoring: write computed blocks | `decisionBlocks/{tId}_{sId}_{projectId}` | Nightly scoring complete | Per active project | 1            | popular, quickPick, bestValue candidates + computedAt | Cloud Function writes full scoring results. |
| Scoring: write run log         | `schedulerRunLogs/{autoId}`              | Nightly scoring complete | 1 per run          | 1            | status, tasks[], errors[], durations, counts          | Persisted for Scheduler Monitor Dashboard.  |
| Owner: update pin controls     | `decisionBlocks/{tId}_{sId}_{projectId}` | Owner pins/unpins items  | Per pin action     | 1            | Merge update                                          | Owner manually pins items to blocks.        |

### Deletes

None — decision blocks documents are overwritten nightly, never deleted.

---

## Cloud Functions

| Function                      | Trigger                       | Frequency                 | Duration           | Memory | Notes                                                                                                      |
| ----------------------------- | ----------------------------- | ------------------------- | ------------------ | ------ | ---------------------------------------------------------------------------------------------------------- |
| `computeDecisionBlocksScores` | Scheduled (nightly 02:30 UTC) | 1x/day per active project | 10-30s per project | 256MB  | Reads project + analytics, computes scores, writes results. File: `functions/src/decisionBlocksScoring.ts` |

---

## Cost Optimization Notes

### Current Optimizations

- **Precomputed results**: Scoring runs nightly, results cached. Customer reads are instant getDoc.
- **60s Vercel cache**: Customer-facing reads cached, reducing Firestore reads significantly.
- **Batch scoring**: All projects scored in one Cloud Function run.
- **Runtime availability filter**: Blocks filtered client-side for sold-out items (no extra read).

### Warnings: Expensive Patterns

- **Analytics reads**: 7-30 daily docs per project per scoring run. 1000 projects × 30 docs = 30,000 reads/night.
- **Scaling**: Cost grows linearly with active project count.

---

## Cost Estimate (per 1000 active projects)

| Resource                   | Operations/month          | Unit Cost  | Monthly Cost     |
| -------------------------- | ------------------------- | ---------- | ---------------- |
| Firestore Reads (customer) | 100,000 ÷ cache ≈ 10,000  | $0.06/100K | $0.01            |
| Firestore Reads (scoring)  | 30 × 1,000 × 30 = 900,000 | $0.06/100K | $0.54            |
| Firestore Writes (scoring) | 30,000 (1/day × 1000)     | $0.18/100K | $0.05            |
| Cloud Functions            | 30,000 invocations        | $0.40/M    | $0.01            |
| **Total**                  |                           |            | **~$0.61/month** |

---

## DAL Functions Used

| Function                       | File                                       | Operation Type           |
| ------------------------------ | ------------------------------------------ | ------------------------ |
| `getPrecomputedDecisionBlocks` | `src/app/_client/[[...slug]]/page.tsx:138` | Read (getDoc)            |
| `computeDecisionBlocksScores`  | `functions/src/decisionBlocksScoring.ts`   | Read + Write (admin SDK) |
