# Decision Intelligence — Firebase Cost Tracking

**Feature:** Decision Blocks (Smart Menu Recommendations)
**Status:** Controlled owner testing ready in audited slice; full MenuList certification pending
**Last Updated:** June 11, 2026
**Priority:** HIGH — Timezone-aware Cloud Function scoring + project-embedded customer-facing read model.

---

## Summary

- **Collections Used:** `projects/{tId}/{sId}/{projectId}`, `analytics`, `platformSummary`, `schedulerRunLogs`
- **Storage Buckets:** None
- **Cloud Functions:** `computeDecisionBlocksScores` (scheduled hourly, timezone-aware) and `triggerDecisionBlocksScoring` (manual platform-only recovery)
- **Estimated Monthly Cost:** **Medium** — Scales with number of active projects

---

## Firestore Operations

### Reads

| Operation                          | Collection                               | Trigger              | Frequency                  | Docs Read | Indexed?         | Notes                                                                                                   |
| ---------------------------------- | ---------------------------------------- | -------------------- | -------------------------- | --------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| Customer: fetch precomputed blocks | `projects/{tId}/{sId}/{projectId}.publicDecisionBlocks` | Customer page load | Per menu cache miss | 0 additional | Project read | Public menu uses the embedded valid projection already loaded with project data. If missing or expired, runtime falls back to owner-pinned/no automatic ranking without another Firestore read. File: `src/app/client/[[...slug]]/page.tsx` |
| Scoring: read project data         | `projects/{tId}/{sId}/{projectId}`       | Scheduled scoring    | Per active project         | 1         | Direct doc       | Cloud Function reads full project for item analysis.                                                    |
| Scoring: read analytics snapshot   | `analytics/{tId}_{sId}_{projectId}_intelligence_7d` | Scheduled scoring and manual platform recovery | Per active project | 1 | Direct doc | Uses the scheduler-written compact 7-day snapshot; missing/stale snapshots score as empty instead of running hidden daily range reads. |
| Scoring: read active project list  | `platformSummary/projects_{sId}`         | Scheduled scoring    | Per store                  | 1         | Direct doc       | Used to resolve active project IDs before nested project reads.                                          |
| Scoring: read store summary        | `platformSummary/storesSummary`          | Scheduled run        | 1 per scheduler invocation | 1         | Direct doc       | Used for store scheduling, tenant/store IDs, business category, timezone, and active status.             |
| Owner: read block config           | `projects/{tId}/{sId}/{projectId}`       | Owner opens editor/settings | Existing project load | 0 additional | Direct doc | Pins and toggles are part of already-loaded project data.                                                |

### Writes

| Operation                      | Collection                               | Trigger                  | Frequency          | Docs Written | Fields                                                | Notes                                       |
| ------------------------------ | ---------------------------------------- | ------------------------ | ------------------ | ------------ | ----------------------------------------------------- | ------------------------------------------- |
| Scoring: write computed blocks | `projects/{tId}/{sId}/{projectId}.publicDecisionBlocks` | Scheduled scoring complete | Per active project | 1 project merge | popular, quickPick, bestValue candidates + computedAt | Cloud Function writes the compact public projection into the project doc; there is no separate Decision Blocks document. |
| Scoring: write run log         | `schedulerRunLogs/{autoId}`              | Scheduled scoring complete | 1 per run          | 1            | status, tasks[], errors[], durations, counts          | Persisted for Scheduler Monitor Dashboard.  |
| Owner: update pin controls     | `projects/{tId}/{sId}/{projectId}`       | Owner saves Smart Recommendations | Per save | 1 | `menuSettings.decisionBlocks` | Saved through `updateProject()`, which strips generated `publicDecisionBlocks` from owner payloads and invalidates public menu/OBP cache tags. |

### Deletes

None — project `publicDecisionBlocks` projections are overwritten during scoring, never deleted.

---

## Cloud Functions

| Function                      | Trigger                       | Frequency                 | Duration           | Memory | Notes                                                                                                      |
| ----------------------------- | ----------------------------- | ------------------------- | ------------------ | ------ | ---------------------------------------------------------------------------------------------------------- |
| `computeDecisionBlocksScores` | Scheduled (`30 * * * *`, UTC) | Hourly trigger; only due stores are processed | Store/project dependent | 256MB | Reads project + compact analytics snapshot, computes scores, writes results. File: `functions/src/decisionBlocksScoring.ts` |
| `triggerDecisionBlocksScoring` | Callable manual recovery | On platform-owner action only | Store/project dependent | 256MB | Requires authenticated `PLATFORM` role; recomputes Decision Blocks without running all global scheduler tasks and uses the same compact analytics snapshot path as scheduled scoring. |

---

## Cost Optimization Notes

### Current Optimizations

- **Precomputed results**: Scoring runs in the nightly scheduler window for each store. Customer menu renders use the project-embedded `publicDecisionBlocks` projection when valid, with no separate Firestore read.
- **60s Vercel cache**: Customer-facing reads cached, reducing Firestore reads significantly.
- **Store-scoped scoring**: Hourly trigger filters stores by local settlement window, avoiding one large global daily run.
- **Compact analytics input**: Decision Blocks consume the 7-day intelligence snapshot instead of opening daily range reads during scheduled or platform-manual scoring.
- **Runtime availability filter**: Blocks filtered client-side for sold-out items (no extra read).

### Warnings: Expensive Patterns

- **Analytics snapshot dependency**: If the 7-day intelligence snapshot is missing or stale, scoring proceeds with empty analytics for that run. This protects cost, but output quality depends on the aggregation step being healthy.
- **Manual recovery scope**: Platform manual scoring is still linear in selected project/store count, but it no longer fans out over daily analytics documents.
- **Scaling**: Cost grows linearly with active project count.

---

## Cost Estimate (per 1000 active projects)

Assumption: $1 = ₹83.

| Resource                   | Operations/month                   | Unit Cost      | Monthly Cost |
| -------------------------- | ---------------------------------- | -------------- | ------------ |
| Firestore Reads (customer) | 0 additional Decision Blocks reads | ~₹4.98/100K    | ₹0.00        |
| Firestore Reads (scoring)  | ~30 × 1,000 projects × 2 reads     | ~₹4.98/100K    | ~₹3.00       |
| Firestore Writes (scoring) | 30,000 (1/day × 1000 projects)     | ~₹14.94/100K   | ~₹4.50       |
| Cloud Functions            | Store-scoped hourly scheduler runs | ~₹33.20/M      | <₹1.00       |
| **Total**                  |                                    |                | **~₹9/month** |

---

## DAL Functions Used

| Function                      | File                                     | Operation Type |
| ----------------------------- | ---------------------------------------- | -------------- |
| `getUsableEmbeddedDecisionBlocks` | `src/app/client/[[...slug]]/page.tsx` | Project-field read from loaded data |
| `computeDecisionBlocksScores` | `functions/src/decisionBlocksScoring.ts` | Read + project merge write (admin SDK) |
