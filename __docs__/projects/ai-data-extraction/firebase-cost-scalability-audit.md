# AI Data Extraction — Firebase Cost & Scalability Audit

**Original Audit:** March 13, 2026
**Current Codebase Reconciliation:** July 15, 2026
**Scope:** Full extraction pipeline: Client → Job Queue → Cloud Function → AI → Hardening → Firestore → Storage → Monitoring
**Authority:** Current source, shared limits, indexes, focused verifiers, and active production-readiness gates
**Verdict:** Bounded and suitable for the current scale envelope; no queue or data-model redesign is justified

---

## Executive Summary

The AI Data Extraction pipeline has bounded intake, a durable job collection, guarded worker concurrency, capped cleanup queries, seven-day terminal-job retention, compact AI accounting, a single-document client listener, and project-document size protection. Provider usage and retained source Storage grow with successful extraction volume, so target billing exports and bucket measurements—not historical unit-price assumptions in this document—remain the operational cost authority.

**2 Bugs Found & Fixed:**

- **CRITICAL:** `checkExistingActiveJob()` query missing `uId` filter — Firestore security rules reject list queries without `uId == auth.uid`, causing "Missing or insufficient permissions" error on every extraction attempt
- Missing composite index for `MENULIST_AI_OPERATIONS` collection (monitoring dashboard query would fail)

**Current position:** The `MENULIST_AI_OPERATIONS` extraction audit ledger uses compact-not-delete retention. Accounting-only rows retain cost/token fields, response counts, message presence/length, and summarized file metadata instead of raw provider/output payloads. Detailed-mode rows receive `detailExpiresAt` and are pruned by `menulistMaintenanceScheduler.ai_operation_detail_cleanup` when the updated Function is deployed.

---

## 1. HIGH-RISK COST AREAS

### 1.1 `MENULIST_AI_OPERATIONS` Collection — Compact Ledger Retention ⚠️ MEDIUM

| Aspect             | Details                                                                                                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Location**       | `functions/src/logic/processMenuImages.ts` (`addAiOperation()` / `compactAiOperationForStorage()`), `functions/src/schedulers/menulistMaintenanceScheduler.ts` (`ai_operation_detail_cleanup`) |
| **Problem**        | Every extraction still writes one audit row. The current policy keeps the compact row for cost/audit traceability instead of deleting the ledger document. |
| **Document Size**  | Accounting-only rows store cost/token fields, response counts, message presence/length, summarized file metadata, and minimal generation config. Detailed mode is temporary and receives `detailExpiresAt`. |
| **Growth Rate**    | 1,000 extractions/month = 12,000 compact rows/year. 100,000/month = 1.2M compact rows/year. |
| **Storage Cost**   | The previous 100KB/document projection no longer applies in accounting-only mode because raw `clientResponse`, raw provider response, and full file payloads are not retained. |
| **Read Cost**      | The monitoring dashboard (`getExtractionCostMetrics()`) reads up to 100 compact operation docs per cache miss. Access is platform-only and manually refreshed. |
| **Risk**           | The collection still grows by row count. Storage/doc-size risk is mitigated by compaction; query risk remains bounded only while monitoring reads stay capped/platform-only. |
| **Recommendation** | Keep compact-not-delete retention for audit history, keep monitoring reads capped/platform-only, and keep `ai_operation_detail_cleanup` deployed for detailed-mode rows. Do not delete compact ledger rows unless accounting, owner transaction history, and platform audit retention are redesigned. |

### 1.2 Project Document Size — Bounded Append Model ⚠️ MEDIUM

| Aspect                   | Details                                                                                                                                                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Location**             | `functions/src/logic/saveFilesToProject.ts:248-255`                                                                                                                                                                                    |
| **Pattern**              | Eligible auto-save destinations append only new file identities. Authenticated desktop/mobile owner uploads use `forceReview: true`, so their extracted draft is not appended until the owner applies it. |
| **Document Size Growth** | Live editor data remains in `files[].extractedData`, so repeated approved additions can grow the project document. Growth depends on the actual extracted menu rather than a fixed per-file estimate. |
| **Firestore Limit**      | 1MB per document.                                                                                                                                                                                                                      |
| **Current Safeguard**    | `saveFilesToProject()` estimates the merged project payload before writing, warns above 700KB, and blocks above 900KB. Desktop/mobile upload caps block over-limit pending batches before Storage upload. The protected job route blocks projected oversize appends before AI work, deletes newly uploaded owner source files on that rejection, and returns reset/create-new copy. Verified by `npm run verify:menu-extraction-pipeline`. |
| **Risk**                 | Repeated approved additions can eventually reach the warning or hard guard. This is a controlled refusal, not an unbounded-write failure. |
| **Recommendation**       | Keep append as the incremental model and replacement explicit through reset/create-new. Do not shard or strip live editor data unless measured projects repeatedly reach the guard and a deliberate data-model migration is approved. |

### 1.3 Job Document Size — Bounded Result Retention ⚠️ LOW

| Aspect              | Details                                                                                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Location**        | `functions/src/logic/processMenuImagesJob.ts`, `functions/src/schedulers/menuJobCleanup.ts` |
| **Pattern**         | Review and extraction-only jobs retain `result.combinedData` while the owner or destination still needs it. Immediately auto-saved project jobs store a compact summary instead of retaining duplicate combined data. |
| **Safeguard**       | Intake is capped at 15 files/pages, provider provenance is bounded, completed auto-save payloads are pruned, preview jobs expire, and terminal job documents are deleted after seven days. |
| **Risk**            | Result size still follows extracted menu complexity, but retention and intake are bounded. |
| **Recommendation**  | Keep the current destination-aware retention. Do not strip review/public/messaging payloads before their consumers finish. |

---

## 2. MEDIUM-RISK COST AREAS

### 2.1 Monitoring Dashboard — Client-Side Aggregation ⚠️ MEDIUM

| Aspect                       | Details                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Location**                 | `src/database/ops/extraction.ts` (4 query functions)                                                                                                                                                                                                                                                                                           |
| **Reads Per Dashboard Load** | **July 1 update:** `/ops/extraction` uses SWR with a five-minute dedupe window and calls `getExtractionDashboardSnapshot()`, which performs one recent-job query plus one cost query. Cache miss, filter change, or explicit Refresh: up to **150 job reads + 100 cost reads**. Duplicate mounts/revalidations inside five minutes: **0 additional reads**. |
| **Current Usage**            | Platform-only at `/ops/extraction`, manually refreshed. |
| **Risk at Scale**            | Duplicate dashboard opens are now deduped for five minutes. Scale risk returns only if automatic refresh or broader operator access is added without server-side pre-aggregation.                                                                                                                                                              |
| **Index Boundary**           | The current snapshot orders the top-level extraction ledger by `createdAt` and filters the bounded result in memory. The historical `action + createdAt` index remains source evidence, not a current dashboard prerequisite. |
| **Recommendation**           | ✅ SWR caching with a five-minute dedupe interval is implemented. If automatic refresh or broader operator access is added, use server-side pre-aggregation before enabling it.                                                                                                                                                                |

### 2.2 Cleanup Scheduler — Capped Recovery Queries ✅

| Aspect                | Details                                                                                                                                                                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Location**          | `functions/src/schedulers/menuJobCleanup.ts`                                                                                                                                                                                                                                      |
| **Pattern**           | Every 15 minutes, `cleanupStuckJobsLogic()`, `cleanupExpiredPreviewJobsLogic()`, and `cleanupStuckCancellingJobsLogic()` each read at most 100 matching jobs. |
| **Normal Reads**      | Usually 0-3 docs per query (stuck jobs are rare). 3 queries × 0-3 docs = ~0-9 reads per run = ~0-864 reads/day.                                                                                                                                                                   |
| **Stress Scenario**   | A backlog larger than 100 drains over later 15-minute runs without producing an oversized batch. |
| **Current Safeguard** | The three recovery queries use `limit(100)` and terminal retention uses `limit(500)`. Each task runs under the unified maintenance scheduler lease. |
| **Recommendation**    | Keep these caps verified. Do not add another scheduler or cursor document unless measured backlog shows the existing cadence cannot converge. |

### 2.3 `onSnapshot` Listener Cost — Safe But Worth Noting ⚠️ LOW

| Aspect            | Details                                                                                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Location**      | `src/hooks/useMenuProcessingJob.ts`                                                                                                                                                                                                                     |
| **Pattern**       | Single-document listener on `menuImageProcessingJobs/{jobId}`.                                                                                                                                                                                          |
| **Reads Per Job** | One initial read plus actual job-document changes while the owning screen keeps the job ID active. |
| **Duration**      | React cleanup unsubscribes when the component unmounts or the tracked job ID changes. |
| **Risk**          | There is no collection listener or polling loop. A mounted review flow intentionally keeps its single-job listener while the draft is actionable. |
| **Assessment**    | **SAFE.** Reads are bounded by one job document and real state transitions. |

---

## 3. SAFE COST AREAS

### 3.1 Firestore Writes Per Extraction — Tightly Bounded ✅

| Write                             | Count | Size       | Source                                        |
| --------------------------------- | ----- | ---------- | --------------------------------------------- |
| Create job document               | 1     | Bounded request | Protected `/api/menu-extraction/jobs` route |
| Status → processing (transaction) | 1     | Small state update | `processMenuImagesJobLogic()` |
| Progress update                   | 1     | Small state update | `processMenuImagesJobLogic()` |
| Status → preview/completed        | 1     | Bounded result | `processMenuImagesJobLogic()` |
| Apply/save project                | 0-1   | Extracted menu data | Owner review apply or eligible worker auto-save |
| Record AI operation               | 1     | Compact row | CF `addAiOperation()` / `compactAiOperationForStorage()` |
| **Total before owner review**     | **4 job/accounting writes** | Plus the initial job write | Project remains unchanged |
| **Approved owner draft**          | **1 additional project write** | Existing review path | No second provider call |

Exact billed cost depends on the target project, region, retained bytes, provider usage, and current pricing. Use billing exports and the extraction monitor for operational cost truth.

### 3.2 Job Queue Scaling — Self-Cleaning ✅

| Aspect                       | Assessment                                                                                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Job TTL**                  | Terminal jobs deleted after 7 days by `cleanupOldJobsLogic()` (daily at 3 AM UTC, limit 500).                                                                   |
| **Max Collection Size**      | At 1000 extractions/month × 7-day window = ~233 active/recent jobs at any time. At 100K/month = ~23,333 jobs. Well within Firestore capabilities.               |
| **Concurrent Jobs**          | Duplicate active work is prevented per project and `FUNCTION_OPTIONS.aiParallel` caps worker instances at 5. |
| **Backlog Behavior**         | Additional Firestore jobs remain durable until an instance is available. Provider/capacity/rate-limit controls bound expensive work. |

### 3.3 Storage Costs — Linear and Predictable ✅

| Pattern                      | Size                                  | Frequency      |
| ---------------------------- | ------------------------------------- | -------------- |
| Menu image upload            | Bounded by shared file validation; PDF pages are prepared as JPEG | Per accepted extraction |
| Provider file upload         | Deleted in the worker cleanup path after processing             | Per accepted extraction |
| CF `/tmp` files              | Cleaned in `finally` block            | Ephemeral      |

Active source uploads are retained because project duplication and special-menu projection can share their URLs. Reset clears live project data but is not a safe Storage-delete signal. The repo includes `infra/storage/menulist-storage-lifecycle.json` for the legacy `MenuListAi/project/files/` prefix only; applying that lifecycle remains an owner-controlled infrastructure step and does not cover active tenant-scoped uploads.

### 3.4 Cloud Function Costs — Dominated by AI Wait Time ✅

| Config       | Value                                  |
| ------------ | -------------------------------------- |
| Memory       | 2GiB (`aiParallel`)                    |
| Timeout      | 540s (9 minutes)                       |
| Trigger      | `onDocumentCreated` (no retries)       |
| Runtime      | Variable with provider latency, file count, and retries |

Compute cost scales with actual invocation duration and memory allocation. The five-instance cap bounds simultaneous worker compute; current provider and Firebase billing exports remain the price authority.

### 3.5 Maintenance Scheduler Costs

| Scheduler | Frequency | Invocations/month | Cost |
|---|---:|---:|---:|
| `menulistMaintenanceScheduler` | Every 2 min | 21,600 | Invocation cost normally within free tier; scheduler job count reduced |

Extraction cleanup now runs as guarded registry tasks inside the maintenance scheduler:

- `menu_stuck_cleanup` every 15 minutes
- `menu_old_cleanup` daily at 3 AM UTC

Each task uses a lightweight Firestore lease under `_system` so overlapping 2-minute ticks cannot duplicate cleanup writes or alerts.

---

## 4. INDEX REQUIREMENTS

### Relevant `menuImageProcessingJobs` Indexes

| #   | Fields                         | Used By                                                                                                                                    |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `projectId` + `uId` + `status` | `checkExistingActiveJob()` — duplicate prevention (UPDATED: added `uId` for security rule compliance)                                      |
| 2   | `status` + `createdAt DESC`    | `getRecentExtractionJobs()` — monitoring dashboard                                                                                         |
| 3   | `createdAt DESC`               | `getExtractionHealthMetrics()` — 24h health overview                                                                                       |
| 4   | `status` + `expiresAt`         | `cleanupExpiredPreviewJobsLogic()` — preview TTL                                                                                           |
| 5   | `status` + `updatedAt`         | `cleanupStuckCancellingJobsLogic()` — stuck cancelling                                                                                     |
| 6   | `status` + `completedAt`       | `cleanupOldJobsLogic()` — 7-day TTL delete                                                                                                 |
| 7   | `status` + `timeoutAt`         | `cleanupStuckJobsLogic()` — stuck processing (implicit, no composite needed since `timeoutAt` is range on same field as `status` equality) |

### Historical Fix: `MENULIST_AI_OPERATIONS` Composite Index

| Aspect       | Details                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| **Query**    | `where('action', '==', 'image_processing')` + `where('createdAt', '>=', ...)` + `orderBy('createdAt', 'desc')` |
| **Historical query** | `action == image_processing` plus a `createdAt` range/order |
| **Historical fix** | Added composite index `action ASC + createdAt DESC` to `firestore.indexes.json` |
| **Current query** | `getExtractionCostMetrics()` orders by `createdAt`, limits to 100, and filters the bounded result in memory. The composite index is no longer required by this monitor path. |
| **Release boundary** | Deploy only the rules/indexes required by the active production-readiness runbook; do not infer a deploy from this historical fix. |

### Current Monitor Query Boundary

`getExtractionDashboardSnapshot()` performs one bounded `createdAt DESC` job query, then derives health, quality, and the filtered list in memory. `getExtractionCostMetrics()` performs one bounded `createdAt DESC` operation query. No current monitor query is unbounded.

---

## 5. REALTIME LISTENERS — Full Trace

| Listener               | Collection                        | Scope      | Duration               | Reads/Lifecycle                | File                                   |
| ---------------------- | --------------------------------- | ---------- | ---------------------- | ------------------------------ | -------------------------------------- |
| `useMenuProcessingJob` | `menuImageProcessingJobs/{jobId}` | Single doc | While the owner flow tracks the job ID | Initial read plus actual document changes | `src/hooks/useMenuProcessingJob.ts` |

**Only 1 listener in the entire extraction pipeline.** It subscribes to a single document (direct doc reference, not a collection query). It auto-unsubscribes via React `useEffect` cleanup when the component unmounts or `jobId` changes.

**Verdict:** SAFE. No collection-level listeners, no query-based listeners, no unbounded reads.

---

## 6. CLOUD FUNCTION COST ANALYSIS

### `processMenuImagesJob` (Production Trigger)

| Aspect             | Value                                                                     |
| ------------------ | ------------------------------------------------------------------------- |
| Trigger            | `onDocumentCreated` on `menuImageProcessingJobs/{jobId}`                  |
| Memory             | 2GiB                                                                      |
| Timeout            | 540s                                                                      |
| Runtime            | Variable with provider latency, file count, and retries                   |
| Firestore Reads    | 3 per invocation (transaction read, cancellation check, project read)     |
| Firestore Writes   | 4-5 per invocation                                                        |
| External API Calls | 1-4 Gemini calls (1 per batch of 10 images)                               |
| File I/O           | Parallel fetch from Storage → write to `/tmp` → upload to Gemini File API |

**Cost Scaling:**

- Linear with extraction volume
- No recursive triggers (onCreate, not onUpdate)
- No unnecessary re-invocations (idempotency via transaction)
- CF auto-scales horizontally for concurrent jobs

### Cleanup Tasks

| Task | Parent Function | Schedule | Avg Duration | Reads |
|---|---|---:|---:|---:|
| `menu_stuck_cleanup` | `menulistMaintenanceScheduler` | Every 15 min | Variable | Three capped 100-row queries plus lease |
| `menu_old_cleanup` | `menulistMaintenanceScheduler` | Daily 3 AM | Variable | Capped pruning/retention work plus lease |

**Verdict:** The refactor primarily reduces Cloud Scheduler job sprawl and operational drift. Firestore lease reads/writes are intentionally tiny compared with extraction job writes.

---

## 7. STORAGE COST ANALYSIS

### Upload Pattern

| Path                                         | Size            | Retention       | Cleanup                 |
| -------------------------------------------- | --------------- | --------------- | ----------------------- |
| `projects/files/{tId}/{sId}/{fileId}`        | Bounded by upload validation | Retained while project-derived references may exist | Project duplication and special-menu projection can share URLs; reset alone is not a delete signal |
| Legacy `MenuListAi/project/files/{timestamp}-{uid}` | 1-5MB per image | 365d then `COLDLINE` when lifecycle config is applied | No delete rule; compatibility path pending app deploy and Storage rules cutover |
| Gemini File API temp uploads                 | Same images     | 48h auto-expire | Automatic               |
| CF `/tmp`                                    | Same images     | Ephemeral       | `finally` block cleanup |

### Compression Already Applied

- Client-side PDF conversion: 1.5x scale, 80% JPEG quality
- Client-side image optimization before upload (via `optimizeImage()`)

### Storage Growth Boundary

- Storage grows with accepted source bytes, not merely extraction count.
- Failed owner uploads are cleaned up when job admission is rejected before durable work begins.
- Direct deletion during reset is intentionally not implemented because another duplicated or projected project may still reference the same URL.
- A future active-prefix cleanup is justified only when bucket measurements show material unreferenced growth and the implementation can prove global cross-project/outlet reference safety with a grace period. It must run as a bounded task in `menulistMaintenanceScheduler`, not as a new standalone scheduler.
- SG-1 covers only the legacy prefix through a checked-in lifecycle artifact. QA application and production approval remain external steps.

---

## 8. JOB QUEUE SCALING SIMULATION

### Scenario: Burst of Simultaneous Menu Uploads

| Step                                          | What Happens                                            | Firebase Impact               |
| --------------------------------------------- | ------------------------------------------------------- | ----------------------------- |
| 1. Owners submit uploads                      | Protected admission validates scope, limits, project headroom, dedupe, capacity, and rate limits | Bounded request work |
| 2. Accepted job documents are created         | One durable job per accepted request | Linear writes |
| 3. Firestore triggers become eligible         | `aiParallel.maxInstances = 5` prevents an unbounded worker fan-out | At most five worker instances |
| 4. Remaining jobs wait durably                 | Jobs stay in Firestore until worker capacity is available | Queue depth is observable |
| 5. Each client tracks only its job             | One document listener per active owner flow | No collection listener |

**Decision:** Do not introduce Cloud Tasks or another queue pre-emptively. Reconsider only if target telemetry shows sustained queue delay or provider throttling that the five-instance worker and current retry/capacity controls cannot absorb.

### Sustained Volume

| Metric                         | Value                                     |
| ------------------------------ | ----------------------------------------- |
| Collection size | Approximately accepted terminal jobs from the latest seven days plus active jobs |
| Worker concurrency | At most five instances under the current shared Function options |
| Recovery | Capped 100-row recovery queries every 15 minutes and capped 500-row terminal deletion daily |
| Provider work | Up to two provider batches for the current 15-file intake because `MAX_IMAGES_PER_BATCH = 10` |
| Scale trigger | Measure queue age, failure/retry rate, provider throttling, retained Storage bytes, and project-size refusals |

These boundaries make growth predictable without claiming a target free-tier or price outcome. Billing exports and production telemetry decide whether configuration changes are needed.

---

## 9. MONITORING DASHBOARD COST

### Dashboard: `/ops/extraction`

| Function | Reads/Load | Query Pattern | Boundary |
| -------- | ---------- | ------------- | -------- |
| `getExtractionDashboardSnapshot()` | Up to 150 recent jobs | `orderBy createdAt desc`, bounded `limit(readLimit)` | One job query supplies list, health, and quality |
| `getExtractionCostMetrics()` | Up to 100 compact operations | Fixed action plus current-day range | Platform-only indexed query |
| **Total cache miss** | **Up to 250 documents** | Two bounded queries | Five-minute SWR dedupe; no automatic refresh |

**Usage Pattern:** Platform-only and manually refreshed. Cost remains bounded per load.

**Aggregation Trigger:** Add a summary document only before automatic refresh or broader operational access is enabled. The current five-minute SWR dedupe protects duplicate mounts/revalidations; it is not permission to add a forced refresh loop.

---

## 10. COST MODEL AND SCALE TRIGGERS

Do not use hardcoded vendor prices or historical free-tier assumptions as release authority. For each target environment, calculate cost from current billing exports and these source-backed units:

| Resource | Scale Unit | Current Bound |
| -------- | ---------- | ------------- |
| Provider usage | Accepted file/page batches and measured tokens | 15 files/pages per job; 10 images per provider batch |
| Worker compute | Actual invocation duration at 2GiB | At most five worker instances |
| Firestore writes | Job lifecycle, compact operation row, optional project apply | Fixed lifecycle; no per-item document fan-out |
| Firestore reads | Admission, worker state, single-job listener, bounded monitor queries | No unbounded extraction query |
| Job storage | Active plus latest seven days of terminal jobs | Daily capped deletion |
| Source Storage | Accepted bytes retained under active scoped paths | Measure bucket bytes; reset is not a delete signal |
| Project storage | Live `files[].extractedData` | Warning at 700KB; hard block at 900KB |

Revisit architecture only when production evidence shows one of these conditions:

1. Queue age or provider throttling remains elevated despite the five-instance cap and existing retry/capacity controls.
2. Active project documents repeatedly reach the size warning or hard block.
3. Platform monitoring needs automatic refresh or broader access.
4. Active scoped Storage shows material unreferenced growth and a reference-safe, grace-period cleanup can be proven.

Until one of those conditions exists, another queue, summary collection, sharded project model, or Storage deletion ledger would add cost and failure modes without improving the owner flow.

---

## 11. BUGS FOUND & FIXED

### BUG 1 (CRITICAL): `checkExistingActiveJob()` Missing `uId` Filter — Security Rule Violation

| Aspect                     | Details                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**               | **CRITICAL** — every extraction attempt would fail with "Missing or insufficient permissions"                                                                                                                                                                                                                                                                         |
| **Location**               | `src/lib/firebase/menuProcessing.ts:245-255`                                                                                                                                                                                                                                                                                                                          |
| **Root Cause**             | Firestore security rule (`firestore.rules:451-454`) requires `resource.data.uId == request.auth.uid` for reads. The `checkExistingActiveJob()` query used `where('projectId', '==', ...)` + `where('status', 'in', ...)` but **did NOT include** `where('uId', '==', ...)`. Firestore rejects list queries that don't constrain on fields required by security rules. |
| **Impact**                 | `getProcessedFile.ts → checkExistingActiveJob()` is called on EVERY extraction. Without the fix, Firestore rejects the query → the catch block re-throws → extraction fails for all users.                                                                                                                                                                            |
| **Fix**                    | Added `const session = await getActiveSession()` + `where('uId', '==', session.uId)` to the query. Updated composite index from `projectId + status` to `projectId + uId + status` in `firestore.indexes.json`.                                                                                                                                                       |
| **Files Modified**         | `src/lib/firebase/menuProcessing.ts`, `firestore.indexes.json`                                                                                                                                                                                                                                                                                                        |
| **Deploy**                 | `firebase deploy --only firestore:indexes`                                                                                                                                                                                                                                                                                                                            |
| **Why Not Caught Earlier** | Single-document reads (`getDoc`, `onSnapshot(doc(...))`) evaluate security rules against actual document data — they work fine. Only list queries (getDocs with `query()`) require constraints matching security rules. This query was the only list query in the main extraction flow.                                                                               |

### BUG 2: Missing Composite Index for `MENULIST_AI_OPERATIONS`

| Aspect       | Details                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| **Severity** | MEDIUM — monitoring dashboard cost tab would fail at runtime                                                   |
| **Historical Location** | Earlier `getExtractionCostMetrics()` query shape in `src/database/ops/extraction.ts` |
| **Query**    | `where('action', '==', 'image_processing')` + `where('createdAt', '>=', ...)` + `orderBy('createdAt', 'desc')` |
| **Fix**      | Added composite index `action ASC + createdAt DESC` on `MENULIST_AI_OPERATIONS` to `firestore.indexes.json`    |
| **Current Status** | Historical fix retained. The current monitor query no longer depends on this composite index. |

---

## 12. OPTIMIZATIONS ALREADY IN PLACE

| Optimization                   | Impact                                                                         | File                                              |
| ------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------- |
| **Duplicate job prevention**   | Prevents re-processing same project. Saves 1 full CF invocation per duplicate. | `checkExistingActiveJob()` in `menuProcessing.ts` |
| **Client-side PDF conversion** | Zero CF cost for PDF → image conversion.                                       | Browser-side in upload flow                       |
| **Batch processing**           | 10 images per Gemini call reduces invocation overhead.                         | `MAX_IMAGES_PER_BATCH = 10` in `constants/ai.ts`  |
| **Single progress update**     | Optimized from 3 writes to 1 write per job.                                    | `processMenuImagesJob.ts:210-214`                 |
| **Transaction-current save**   | The save helper reads the latest project inside its transaction; it does not trust a stale caller snapshot. | `saveFilesToProject.ts`                           |
| **Job TTL (7 days)**           | Terminal jobs deleted automatically. Collection doesn't grow unbounded.        | `cleanupOldJobsLogic()` limit 500                 |
| **Preview TTL (24h)**          | Unapproved re-extraction jobs cleaned up.                                      | `cleanupExpiredPreviewJobsLogic()`                |
| **Raw response truncation**    | Provenance text capped at 10KB/batch to prevent doc bloat.                     | `processMenuImages.ts:511-514`                    |
| **Project job payload pruning** | Completed first-extraction project jobs prune `result.combinedData` after the saved project has had time to consume it; public, messaging, and review jobs are skipped. | `pruneCompletedProjectJobPayloadsLogic()` |
| **Rate limiting**              | 5 req/min per project via Upstash Redis.                                       | `checkExpensiveAIRateLimit()`                     |
| **Circuit breaker**            | Stops cascading failures to Gemini API.                                        | `executeWithCircuitBreaker()`                     |
| **Owner upload fingerprint reuse** | Repeat owner uploads can reuse a recent completed project job based on server-trusted Storage metadata instead of spending another provider extraction. | `POST /api/menu-extraction/jobs` |
| **Pre-AI project document size gate and reset policy** | Project append jobs reserve 100KB for one incoming file and cap larger-batch headroom at 200KB against the shared 900KB save limit before expensive extraction. This keeps the supported 15 file/page intake usable for normal projects while still rejecting projects that lack minimum save headroom. Desktop and mobile upload flows also block pending batches above the shared cap before Storage upload; mobile passes remaining PDF page slots into conversion before canvas rendering. Oversized owner uploads that reach the route are rejected before AI work, the newly uploaded source files are deleted, and owner-facing copy instructs reset or create-new. The worker transaction measures the actual merged document before save. The existing project reset flow is the replacement cleanup path and writes `files: []`. | `POST /api/menu-extraction/jobs`; `menuExtractionProjectSize.ts`; `projects/index.tsx`; `ProjectConfirmModal.tsx`; `MenuUploadSheet.tsx` |

---

## 13. DECISIONS

### Necessary Now

| Decision | Status | Reason |
| -------- | ------ | ------ |
| Keep compact AI operation retention and detailed-field cleanup | Implemented; target scheduler deploy remains pending | Preserves owner/platform transaction truth without retaining heavy details indefinitely |
| Keep the three recovery queries capped at 100 and terminal cleanup capped at 500 | Implemented | Backlogs drain across runs without oversized batches |
| Keep project warning/block, review-first owner flow, and explicit reset/create-new replacement | Implemented | Prevents provider spend and Firestore limit failures without deleting live menu data |
| Keep monitoring platform-only, manually refreshed, and deduped for five minutes | Implemented | Existing bounded reads are sufficient |
| Keep source uploads on reset | Intentional | Duplicated and projected projects can share URLs; direct deletion could break an existing menu |

### Owner/Release Pending

- Complete the scoped QA Functions, Storage rules, lifecycle, and required index deployment evidence from the External Certification Runbook.
- Run provider smoke, authenticated desktop/mobile review/apply/discard QA, and target production-host smoke before release certification.

### Evidence-Triggered Only

- Add Cloud Tasks or change worker concurrency only after sustained queue-age/provider-throttling evidence.
- Add monitoring summary documents only before automatic refresh or broader access.
- Shard project menu data only after repeated real project-size guard events.
- Add active-prefix Storage cleanup only with global cross-project/outlet reference protection, a grace period, bounded scheduler work, and measured orphan growth.

### Rejected as Premature

- Model-tier routing based only on page count.
- Blanket lifecycle migration for active owner source files.
- Cross-tenant extraction-result caching.
- A second queue, scheduler, event bus, or owner-facing scale setting.

---

## 14. SUMMARY TABLE

| Area                               | Risk Level       | Status                                            |
| ---------------------------------- | ---------------- | ------------------------------------------------- |
| Firestore reads (extraction flow)  | ✅ BOUNDED       | Direct reads, single-job listener, and capped monitor/cleanup queries |
| Firestore writes (extraction flow) | ✅ BOUNDED       | Fixed job lifecycle, compact accounting, optional approved project apply |
| `onSnapshot` listener              | ✅ SAFE          | Single job document; React cleanup on job change/unmount |
| Job queue scaling                  | ✅ BOUNDED       | Five worker instances, durable backlog, seven-day terminal retention |
| Cloud Function costs               | ✅ CONTROLLED    | Fixed memory/timeout/maxInstances; billing export is price authority |
| Firebase Storage                   | ⚠️ MEASURE       | Active sources retained because URLs may be shared; legacy lifecycle is deploy-pending |
| Indexes                            | ✅ SOURCE READY  | Required index exists in source; target deployment evidence remains pending |
| Cleanup schedulers                 | ✅ BOUNDED       | Recovery limit 100; terminal deletion limit 500; shared scheduler leases |
| `MENULIST_AI_OPERATIONS` growth    | ⚠️ MEDIUM        | Compact ledger rows retained; heavy details compacted/pruned by policy |
| Project document size              | ⚠️ CONTROLLED    | 700KB warning, 900KB hard block, explicit replacement path |
| Monitoring dashboard reads         | ✅ MITIGATED     | Two bounded queries and five-minute dedupe; no automatic refresh |
| **Overall System**                 | **✅ SCALE-READY WITHIN CURRENT BOUNDS** | No redesign warranted; external deploy and runtime evidence still pending |

---

_Original audit evidence: March 13, 2026. Current codebase reconciliation: July 15, 2026._
_Historical bugs remain documented above; current release authority is the active production-readiness audit and External Certification Runbook._
