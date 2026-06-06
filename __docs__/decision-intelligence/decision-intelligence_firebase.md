# Decision Intelligence — Firebase Cost Tracking

**Feature:** Decision Blocks (Smart Menu Recommendations)  
**Status:** ✅ Production Ready  
**Last Updated:** May 7, 2026
**Priority:** HIGH — Timezone-aware Cloud Function scoring + customer-facing server-side reads on menu views.

---

## Summary

- **Collections Used:** `decisionBlocks`, `projects/{tId}/{sId}/{projectId}`, `analytics`, `platformSummary`, `schedulerRunLogs`
- **Storage Buckets:** None
- **Cloud Functions:** `computeDecisionBlocksScores` (scheduled hourly, timezone-aware) and `triggerDecisionBlocksScoring` (manual platform-only recovery)
- **Estimated Monthly Cost:** **Medium** — Scales with number of active projects

---

## Firestore Operations

### Reads

| Operation                          | Collection                               | Trigger              | Frequency                  | Docs Read | Indexed?         | Notes                                                                                                   |
| ---------------------------------- | ---------------------------------------- | -------------------- | -------------------------- | --------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| Customer: fetch precomputed blocks | `projects/{tId}/{sId}/{projectId}.publicDecisionBlocks`, fallback `decisionBlocks/{tId}_{sId}_{projectId}` | Customer page load | Per menu cache miss | 0-1 | Direct doc | Public menu prefers the embedded valid projection already loaded with project data. If missing or expired, it falls back to the canonical `decisionBlocks` doc. File: `src/app/client/[[...slug]]/page.tsx` |
| Scoring: read project data         | `projects/{tId}/{sId}/{projectId}`       | Scheduled scoring    | Per active project         | 1         | Direct doc       | Cloud Function reads full project for item analysis.                                                    |
| Scoring: read analytics snapshot   | `analytics/{tId}_{sId}_{projectId}_intelligence_7d` | Scheduled scoring | Per active project | 1 | Direct doc | Uses the scheduler-written compact 7-day snapshot; missing/stale snapshots score as empty instead of running hidden daily range reads. |
| Scoring: read active project list  | `platformSummary/projects_{sId}`         | Scheduled scoring    | Per store                  | 1         | Direct doc       | Used to resolve active project IDs before nested project reads.                                          |
| Scoring: read store summary        | `platformSummary/storesSummary`          | Scheduled run        | 1 per scheduler invocation | 1         | Direct doc       | Used for store scheduling, tenant/store IDs, business category, timezone, and active status.             |
| Owner: read block config           | `projects/{tId}/{sId}/{projectId}`       | Owner opens editor/settings | Existing project load | 0 additional | Direct doc | Pins and toggles are part of already-loaded project data.                                                |

### Writes

| Operation                      | Collection                               | Trigger                  | Frequency          | Docs Written | Fields                                                | Notes                                       |
| ------------------------------ | ---------------------------------------- | ------------------------ | ------------------ | ------------ | ----------------------------------------------------- | ------------------------------------------- |
| Scoring: write computed blocks | `decisionBlocks/{tId}_{sId}_{projectId}` + project `publicDecisionBlocks` mirror | Scheduled scoring complete | Per active project | 1 canonical + 1 best-effort mirror | popular, quickPick, bestValue candidates + computedAt | Cloud Function keeps `decisionBlocks` canonical and mirrors the same compact public projection into the project doc to avoid an extra public read. |
| Scoring: write run log         | `schedulerRunLogs/{autoId}`              | Scheduled scoring complete | 1 per run          | 1            | status, tasks[], errors[], durations, counts          | Persisted for Scheduler Monitor Dashboard.  |
| Owner: update pin controls     | `projects/{tId}/{sId}/{projectId}`       | Owner saves Smart Recommendations | Per save | 1 | `menuSettings.decisionBlocks` | Saved through `updateProject()`, which also invalidates public menu/OBP cache tags. |

### Deletes

None — decision blocks documents are overwritten nightly, never deleted.

---

## Cloud Functions

| Function                      | Trigger                       | Frequency                 | Duration           | Memory | Notes                                                                                                      |
| ----------------------------- | ----------------------------- | ------------------------- | ------------------ | ------ | ---------------------------------------------------------------------------------------------------------- |
| `computeDecisionBlocksScores` | Scheduled (`30 * * * *`, UTC) | Hourly trigger; only due stores are processed | Store/project dependent | 256MB | Reads project + compact analytics snapshot, computes scores, writes results. File: `functions/src/decisionBlocksScoring.ts` |
| `triggerDecisionBlocksScoring` | Callable manual recovery | On platform-owner action only | Store/project dependent | 256MB | Requires authenticated `PLATFORM` role; recomputes Decision Blocks without running all global scheduler tasks. |

---

## Cost Optimization Notes

### Current Optimizations

- **Precomputed results**: Scoring runs in the nightly scheduler window for each store, results cached. Customer menu renders use the project-embedded `publicDecisionBlocks` projection when valid, with the old `decisionBlocks` document as fallback.
- **60s Vercel cache**: Customer-facing reads cached, reducing Firestore reads significantly.
- **Store-scoped scoring**: Hourly trigger filters stores by local settlement window, avoiding one large global daily run.
- **Compact analytics input**: Decision Blocks consume the 7-day intelligence snapshot instead of opening daily range reads during normal scheduled scoring.
- **Runtime availability filter**: Blocks filtered client-side for sold-out items (no extra read).

### Warnings: Expensive Patterns

- **Analytics snapshot dependency**: If the 7-day intelligence snapshot is missing or stale, scoring proceeds with empty analytics for that run. This protects cost, but output quality depends on the aggregation step being healthy.
- **Scaling**: Cost grows linearly with active project count.

---

## Cost Estimate (per 1000 active projects)

Assumption: $1 = ₹83.

| Resource                   | Operations/month                   | Unit Cost      | Monthly Cost |
| -------------------------- | ---------------------------------- | -------------- | ------------ |
| Firestore Reads (customer) | 100,000 views ÷ cache ≈ 10,000     | ~₹4.98/100K    | ~₹0.50       |
| Firestore Reads (scoring)  | ~30 × 1,000 projects × 2 reads     | ~₹4.98/100K    | ~₹3.00       |
| Firestore Writes (scoring) | 30,000 (1/day × 1000 projects)     | ~₹14.94/100K   | ~₹4.50       |
| Cloud Functions            | Store-scoped hourly scheduler runs | ~₹33.20/M      | <₹1.00       |
| **Total**                  |                                    |                | **~₹9/month** |

---

## DAL Functions Used

| Function                       | File                                       | Operation Type           |
| ------------------------------ | ------------------------------------------ | ------------------------ |
| `getPrecomputedDecisionBlocks` | `src/app/client/[[...slug]]/page.tsx` | Read (Admin SDK get)     |
| `computeDecisionBlocksScores`  | `functions/src/decisionBlocksScoring.ts`   | Read + Write (admin SDK) |
