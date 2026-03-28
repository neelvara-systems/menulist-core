# AI Data Extraction — Firebase Cost & Scalability Audit

**Date:** March 13, 2026  
**Auditor:** Firebase Infrastructure Engineer (Cascade)  
**Scope:** Full extraction pipeline: Client → Job Queue → Cloud Function → AI → Hardening → Firestore → Storage → Monitoring  
**Files Analyzed:** 22 source files across client + Cloud Functions + monitoring  
**Verdict:** COST-SAFE with 2 bugs fixed (1 CRITICAL security rule violation, 1 missing index)

---

## Executive Summary

The AI Data Extraction pipeline is **economically sustainable at scale**. Firebase costs are negligible compared to Gemini API costs, which dominate the bill. At 100,000 extractions/month, Firebase costs ~$35/month while Gemini API costs ~$300/month. The system has proper cleanup (7-day TTL deletes terminal jobs), bounded queries (all paginated/limited), and short-lived listeners (auto-unsubscribe on job completion).

**2 Bugs Found & Fixed:**

- **CRITICAL:** `checkExistingActiveJob()` query missing `uId` filter — Firestore security rules reject list queries without `uId == auth.uid`, causing "Missing or insufficient permissions" error on every extraction attempt
- Missing composite index for `MENULIST_AI_OPERATIONS` collection (monitoring dashboard query would fail)

**Key Risk:** The `MENULIST_AI_OPERATIONS` collection has no TTL/cleanup — it grows unbounded at 1 doc per extraction forever.

---

## 1. HIGH-RISK COST AREAS

### 1.1 `MENULIST_AI_OPERATIONS` Collection — Unbounded Growth ⚠️ HIGH

| Aspect             | Details                                                                                                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Location**       | `functions/src/logic/processMenuImages.ts:317-333` (`addAiOperation()`)                                                                                                                                         |
| **Problem**        | Every extraction writes 1 document to `MENULIST_AI_OPERATIONS`. **No TTL, no cleanup, no archival.** Documents contain full `clientResponse` (extracted data), `geminiResponse`, `files[]`, `generationConfig`. |
| **Document Size**  | ~50-200KB per doc (includes `clientResponse` with full extracted menu data)                                                                                                                                     |
| **Growth Rate**    | 1,000 extractions/month = 12,000 docs/year. 100,000/month = 1.2M docs/year.                                                                                                                                     |
| **Storage Cost**   | At 100K/month: ~1.2M docs × 100KB avg = ~120GB/year = **~$3.12/month storage**                                                                                                                                  |
| **Read Cost**      | The monitoring dashboard (`getExtractionCostMetrics()`) reads up to 50 docs per load. Currently founder-only, so negligible. But if exposed to all users: expensive.                                            |
| **Risk**           | At 1M+ docs, single-field index scans become slow. Collection becomes a storage cost sink.                                                                                                                      |
| **Recommendation** | Add TTL cleanup: delete docs older than 90 days in the nightly scheduler. OR strip `clientResponse` (heavy field) after 7 days, keeping only cost/token metadata.                                               |

### 1.2 Project Document Size — Grows With Every Re-Upload ⚠️ MEDIUM-HIGH

| Aspect                   | Details                                                                                                                                                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Location**             | `functions/src/logic/saveFilesToProject.ts:248-255`                                                                                                                                                                                    |
| **Problem**              | `saveFilesToProject()` APPENDS new file entries to `files[]` array. Each file entry contains full `extractedData` (categories, items, prices, descriptions). Files are NEVER removed — even re-extractions append, they don't replace. |
| **Document Size Growth** | Per file: ~20-100KB of extracted data. A restaurant uploading 5 menu photos = ~250KB. After 3 re-extractions = ~750KB. After 10 re-uploads = potentially approaching 1MB limit.                                                        |
| **Firestore Limit**      | 1MB per document.                                                                                                                                                                                                                      |
| **Current Safeguard**    | None. No check on accumulated `files[]` array size before write.                                                                                                                                                                       |
| **Risk**                 | A restaurant that frequently re-uploads menus (e.g., seasonal updates) could eventually hit the 1MB limit, causing writes to fail silently or crash.                                                                                   |
| **Recommendation**       | Either: (a) Mark old file entries as `deleted: true` and strip their `extractedData` after the new extraction succeeds, or (b) Add a pre-write size check with a warning when approaching 800KB.                                       |

### 1.3 Job Document Size — `result.combinedData` Can Be Large ⚠️ MEDIUM

| Aspect              | Details                                                                                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Location**        | `functions/src/logic/processMenuImagesJob.ts:301-334` (completed job update)                                                                                                                                 |
| **Problem**         | The completed job document stores `result.combinedData` (full extracted menu), `result.rawBatchResponses[]` (truncated to 10KB/batch), `transaction`, `fileResults`, `files[]` (input files with URLs), etc. |
| **Worst Case**      | 400 items × ~500 bytes = ~200KB for combinedData. + 10KB × 4 batches = 40KB for provenance. + 20KB for other fields. = ~260KB per job doc.                                                                   |
| **Firestore Limit** | 1MB. Current worst case is ~260KB — safe.                                                                                                                                                                    |
| **Safeguard**       | `rawBatchResponses` truncated to 10KB per batch. But `combinedData` has no cap.                                                                                                                              |
| **Risk**            | LOW for now. Would need a 1000+ item menu to approach danger zone.                                                                                                                                           |
| **Recommendation**  | Monitor. Consider stripping `combinedData` from jobs after they reach terminal state (it's already saved to the project document).                                                                           |

---

## 2. MEDIUM-RISK COST AREAS

### 2.1 Monitoring Dashboard — Client-Side Aggregation ⚠️ MEDIUM

| Aspect                       | Details                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Location**                 | `src/database/ops/extraction.ts` (4 query functions)                                                                                                                                                                                                                                                                                           |
| **Reads Per Dashboard Load** | `getExtractionHealthMetrics()`: up to **100 reads** (last 24h jobs). `getExtractionQualityMetrics()`: up to **50 reads** (last 50 completed jobs). `getRecentExtractionJobs()`: up to **20 reads** (recent job feed). `getExtractionCostMetrics()`: up to **50 reads** (today's AI operations). **Total: up to 220 reads per dashboard load.** |
| **Current Usage**            | Founder-only at `/ops/extraction`. 1 user, infrequent access. **Cost: negligible.**                                                                                                                                                                                                                                                            |
| **Risk at Scale**            | If dashboard is opened by multiple users or auto-refreshes: 220 reads × 10 loads/day × 30 days = 66,000 reads/month. Still under free tier (50K free reads/day).                                                                                                                                                                               |
| **Missing Index**            | **FIXED**: `MENULIST_AI_OPERATIONS` needed composite index for `action + createdAt` query. Added in this audit.                                                                                                                                                                                                                                |
| **Recommendation**           | Add SWR caching with 5-minute dedup interval. Consider server-side pre-aggregation if dashboard usage increases.                                                                                                                                                                                                                               |

### 2.2 Cleanup Scheduler — 3 Unbounded Queries Every 15 Minutes ⚠️ LOW-MEDIUM

| Aspect                | Details                                                                                                                                                                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Location**          | `functions/src/schedulers/menuJobCleanup.ts`                                                                                                                                                                                                                                      |
| **Pattern**           | Every 15 minutes, 3 queries run without `limit()`: `cleanupStuckJobsLogic()` (status=processing + timeoutAt < now), `cleanupExpiredPreviewJobsLogic()` (status=preview_ready + expiresAt < now), `cleanupStuckCancellingJobsLogic()` (status=cancelling + updatedAt < 10min ago). |
| **Normal Reads**      | Usually 0-3 docs per query (stuck jobs are rare). 3 queries × 0-3 docs = ~0-9 reads per run = ~0-864 reads/day.                                                                                                                                                                   |
| **Stress Scenario**   | If system is down for hours and hundreds of jobs pile up stuck: queries could return hundreds of docs at once. Batch commit limit is 500 ops.                                                                                                                                     |
| **Current Safeguard** | `cleanupOldJobsLogic()` has `limit(500)`. The 15-min cleanups do NOT have limits.                                                                                                                                                                                                 |
| **Recommendation**    | Add `limit(100)` to all 3 cleanup queries. If more than 100 stuck jobs exist, the next 15-min run catches the rest. Prevents batch commit limit issues.                                                                                                                           |

### 2.3 `onSnapshot` Listener Cost — Safe But Worth Noting ⚠️ LOW

| Aspect            | Details                                                                                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Location**      | `src/hooks/useMenuProcessingJob.ts:76-93`                                                                                                                                                                                                               |
| **Pattern**       | Single-document listener on `menuImageProcessingJobs/{jobId}`.                                                                                                                                                                                          |
| **Reads Per Job** | Initial read (1) + status changes: pending→processing→completed = 3 updates = **4 reads total per extraction lifecycle.**                                                                                                                               |
| **Duration**      | Listener active for 30-120 seconds (typical job duration). Auto-unsubscribes via React cleanup.                                                                                                                                                         |
| **Risk**          | If user leaves browser tab open with an active job and navigates away, React cleanup fires. If component stays mounted but job is in terminal state, listener still fires on any field update. However, terminal jobs are not updated after completion. |
| **Assessment**    | **SAFE.** 4 reads per extraction is negligible.                                                                                                                                                                                                         |

---

## 3. SAFE COST AREAS

### 3.1 Firestore Writes Per Extraction — Tightly Bounded ✅

| Write                             | Count | Size       | Source                                        |
| --------------------------------- | ----- | ---------- | --------------------------------------------- |
| Create job document               | 1     | ~2KB       | `createMenuProcessingJob()` client            |
| Status → processing (transaction) | 1     | ~200B      | CF `processMenuImagesJobLogic()` line 106-126 |
| Progress update (50%)             | 1     | ~100B      | CF line 210-214                               |
| Status → completed (with results) | 1     | ~50-200KB  | CF line 301-334                               |
| Save to project (merge)           | 1     | ~50-200KB  | CF `saveFilesToProject()` line 255            |
| Record AI operation               | 1     | ~50-200KB  | CF `addAiOperation()` line 327                |
| **Total per first extraction**    | **6** | ~150-600KB |                                               |
| **Total per re-extraction**       | **5** | ~100-400KB | (no project save — preview_ready)             |

**Cost at 1,000 extractions/month:** 6,000 writes × $0.18/100K = **$0.01/month**. Negligible.

### 3.2 Job Queue Scaling — Self-Cleaning ✅

| Aspect                       | Assessment                                                                                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Job TTL**                  | Terminal jobs deleted after 7 days by `cleanupOldJobsLogic()` (daily at 3 AM UTC, limit 500).                                                                   |
| **Max Collection Size**      | At 1000 extractions/month × 7-day window = ~233 active/recent jobs at any time. At 100K/month = ~23,333 jobs. Well within Firestore capabilities.               |
| **Concurrent Jobs**          | `checkExistingActiveJob()` prevents duplicate jobs per project. CF auto-scales for multiple tenants.                                                            |
| **100 Simultaneous Uploads** | Each gets its own job → own CF instance. Rate limit (5/min per project) prevents single-tenant abuse. Global rate limit via Upstash prevents system-wide abuse. |

### 3.3 Storage Costs — Linear and Predictable ✅

| Pattern                      | Size                                  | Frequency      |
| ---------------------------- | ------------------------------------- | -------------- |
| Menu image upload            | 1-5MB per file (JPEG 80%, 1.5x scale) | Per extraction |
| Gemini File API temp storage | Auto-expires after 48h                | No cost        |
| CF `/tmp` files              | Cleaned in `finally` block            | Ephemeral      |

**Cost at 1,000 extractions/month:** 3 files avg × 3MB avg × 1000 = 9GB = **$0.23/month**.
**Cost at 100,000/month:** 900GB = **$23.40/month**.

**Note:** Old images are NOT cleaned up. A restaurant with 50 uploads has 150+ images in Storage forever. At massive scale, consider a Storage lifecycle rule to move images > 1 year to Coldline (~$0.004/GB).

### 3.4 Cloud Function Costs — Dominated by AI Wait Time ✅

| Config       | Value                                  |
| ------------ | -------------------------------------- |
| Memory       | 2GiB (`aiParallel`)                    |
| Timeout      | 540s (9 minutes)                       |
| Trigger      | `onDocumentCreated` (no retries)       |
| Avg Duration | 30-120s (mostly waiting on Gemini API) |

**Cost formula:** CF cost = invocations × (duration × memory price + invocation price)

- 2GiB × 60s avg = 120 GiB-seconds per invocation
- Price: $0.0000025/GiB-second + $0.40/million invocations
- Per invocation: 120 × $0.0000025 = $0.0003 + $0.0000004 = **~$0.0003/invocation**

**Cost at 1,000/month:** $0.30. **At 100,000/month:** $30.00.

### 3.5 Cleanup Scheduler Costs ✅

| Scheduler              | Frequency    | Invocations/month | Cost   |
| ---------------------- | ------------ | ----------------- | ------ |
| `cleanupStuckMenuJobs` | Every 15 min | 2,880             | ~$0.00 |
| `cleanupOldMenuJobs`   | Daily 3 AM   | 30                | ~$0.00 |

Scheduler reads are negligible (0-9 docs per run, usually 0).

---

## 4. INDEX REQUIREMENTS

### Existing Indexes (7 for `menuImageProcessingJobs`)

| #   | Fields                         | Used By                                                                                                                                    |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `projectId` + `uId` + `status` | `checkExistingActiveJob()` — duplicate prevention (UPDATED: added `uId` for security rule compliance)                                      |
| 2   | `status` + `createdAt DESC`    | `getRecentExtractionJobs()` — monitoring dashboard                                                                                         |
| 3   | `createdAt DESC`               | `getExtractionHealthMetrics()` — 24h health overview                                                                                       |
| 4   | `status` + `expiresAt`         | `cleanupExpiredPreviewJobsLogic()` — preview TTL                                                                                           |
| 5   | `status` + `updatedAt`         | `cleanupStuckCancellingJobsLogic()` — stuck cancelling                                                                                     |
| 6   | `status` + `completedAt`       | `cleanupOldJobsLogic()` — 7-day TTL delete                                                                                                 |
| 7   | `status` + `timeoutAt`         | `cleanupStuckJobsLogic()` — stuck processing (implicit, no composite needed since `timeoutAt` is range on same field as `status` equality) |

### **BUG FIXED: Missing Index for `MENULIST_AI_OPERATIONS`**

| Aspect       | Details                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| **Query**    | `where('action', '==', 'IMAGE_PROCESSING')` + `where('createdAt', '>=', ...)` + `orderBy('createdAt', 'desc')` |
| **Location** | `src/database/ops/extraction.ts:308-313` (`getExtractionCostMetrics()`)                                        |
| **Impact**   | Monitoring dashboard's cost tab would throw "Missing index" error at runtime                                   |
| **Fix**      | Added composite index `action ASC + createdAt DESC` to `firestore.indexes.json`                                |
| **Deploy**   | `firebase deploy --only firestore:indexes`                                                                     |

### Missing Index Analysis for `getExtractionQualityMetrics()`

Query: `where('status', 'in', ['completed', 'preview_ready'])` + `orderBy('createdAt', 'desc')`.
**Status:** Covered by existing index `status + createdAt DESC` (Firestore handles `in` queries by expanding to multiple equality queries on the same index).

### Missing Index Analysis for `getExtractionHealthMetrics()`

Query: `where('createdAt', '>=', cutoff)` + `orderBy('createdAt', 'desc')`.
**Status:** Covered by single-field index on `createdAt` (auto-created by Firestore).

---

## 5. REALTIME LISTENERS — Full Trace

| Listener               | Collection                        | Scope      | Duration               | Reads/Lifecycle                | File                                   |
| ---------------------- | --------------------------------- | ---------- | ---------------------- | ------------------------------ | -------------------------------------- |
| `useMenuProcessingJob` | `menuImageProcessingJobs/{jobId}` | Single doc | 30-120s (job duration) | 4 (initial + 3 status changes) | `src/hooks/useMenuProcessingJob.ts:76` |

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
| Avg Duration       | 30-120s                                                                   |
| Firestore Reads    | 3 per invocation (transaction read, cancellation check, project read)     |
| Firestore Writes   | 4-5 per invocation                                                        |
| External API Calls | 1-4 Gemini calls (1 per batch of 10 images)                               |
| File I/O           | Parallel fetch from Storage → write to `/tmp` → upload to Gemini File API |

**Cost Scaling:**

- Linear with extraction volume
- No recursive triggers (onCreate, not onUpdate)
- No unnecessary re-invocations (idempotency via transaction)
- CF auto-scales horizontally for concurrent jobs

### Cleanup Schedulers

| Function               | Memory           | Schedule     | Avg Duration | Reads |
| ---------------------- | ---------------- | ------------ | ------------ | ----- |
| `cleanupStuckMenuJobs` | Default (256MiB) | Every 15 min | <5s          | 0-9   |
| `cleanupOldMenuJobs`   | Default (256MiB) | Daily 3 AM   | <10s         | 0-500 |

**Verdict:** Scheduler cost is virtually zero (~$0.01/month for all scheduler invocations combined).

---

## 7. STORAGE COST ANALYSIS

### Upload Pattern

| Path                                         | Size            | Retention       | Cleanup                 |
| -------------------------------------------- | --------------- | --------------- | ----------------------- |
| `MenuListAi/project/files/{timestamp}-{uid}` | 1-5MB per image | Forever         | None                    |
| Gemini File API temp uploads                 | Same images     | 48h auto-expire | Automatic               |
| CF `/tmp`                                    | Same images     | Ephemeral       | `finally` block cleanup |

### Compression Already Applied

- Client-side PDF conversion: 1.5x scale, 80% JPEG quality
- Client-side image optimization before upload (via `optimizeImage()`)

### Storage Growth Model

| Scenario            | Images/Month | Monthly Growth | Annual Storage | Annual Cost |
| ------------------- | ------------ | -------------- | -------------- | ----------- |
| 1,000 extractions   | ~3,000       | ~9GB           | ~108GB         | $2.81/yr    |
| 10,000 extractions  | ~30,000      | ~90GB          | ~1.08TB        | $28.08/yr   |
| 100,000 extractions | ~300,000     | ~900GB         | ~10.8TB        | $280.80/yr  |

**Risk:** At 100K/month, storage is the second-largest cost after Gemini API. Consider lifecycle rules for images > 12 months.

---

## 8. JOB QUEUE SCALING SIMULATION

### Scenario: 100 Simultaneous Menu Uploads

| Step                                          | What Happens                                            | Firebase Impact               |
| --------------------------------------------- | ------------------------------------------------------- | ----------------------------- |
| 1. 100 users click upload                     | 100 `checkExistingActiveJob()` queries (1-5 reads each) | ~500 reads                    |
| 2. 100 job documents created                  | 100 writes                                              | 100 writes                    |
| 3. 100 `onDocumentCreated` triggers fire      | 100 CF instances spin up                                | Auto-scaled                   |
| 4. 100 CF instances process concurrently      | Each reads 3 docs, writes 4-5 docs                      | 300 reads, 500 writes         |
| 5. 100 `onSnapshot` listeners receive updates | 100 × ~4 reads = 400 reads                              | 400 reads                     |
| **Total**                                     |                                                         | **~1,200 reads, ~600 writes** |

**Cost:** ~1,200 reads × $0.06/100K = $0.00. ~600 writes × $0.18/100K = $0.00. **Negligible.**

### Scenario: 1,000 Daily Uploads (Sustained)

| Metric                         | Value                                     |
| ------------------------------ | ----------------------------------------- |
| Jobs created/day               | 1,000                                     |
| Active jobs at any time        | ~30-50 (each takes 30-120s)               |
| Collection size (7-day window) | ~7,000 docs                               |
| Firestore reads/day            | ~8,000 (queries + listeners + cleanup)    |
| Firestore writes/day           | ~6,000                                    |
| CF invocations/day             | ~1,000                                    |
| CF compute/day                 | ~1,000 × 60s × 2GiB = 120,000 GiB-seconds |

**All well within Firestore and CF free tiers.** Paid costs start at scale but remain linear and predictable.

---

## 9. MONITORING DASHBOARD COST

### Dashboard: `/ops/extraction`

| Function                        | Reads/Load | Query Pattern                                    | Indexed?                 |
| ------------------------------- | ---------- | ------------------------------------------------ | ------------------------ |
| `getExtractionHealthMetrics()`  | ≤100       | `createdAt >= 24h ago`, limit 100                | ✅ (single-field)        |
| `getExtractionQualityMetrics()` | ≤50        | `status in [completed, preview_ready]`, limit 50 | ✅ (composite)           |
| `getRecentExtractionJobs()`     | ≤20        | `orderBy createdAt desc`, limit 20               | ✅ (composite)           |
| `getExtractionCostMetrics()`    | ≤50        | `action == IMAGE_PROCESSING, createdAt >= today` | ✅ (FIXED in this audit) |
| **Total per load**              | **≤220**   |                                                  |                          |

**Usage Pattern:** Founder-only, opened a few times per week. Cost: effectively $0.00.

**If Auto-Refresh Added:** With 60s refresh interval, 24h active = 1,440 loads × 220 reads = 316,800 reads/day. Still under Firestore free tier (50K free reads/day... this would EXCEED free tier). **Recommendation:** If auto-refresh is added, use 5-minute intervals minimum, or implement server-side aggregation.

---

## 10. COST SIMULATION

### Pricing Reference (Firebase Blaze Plan, us-central1)

| Resource                    | Free Tier          | Price After Free Tier  |
| --------------------------- | ------------------ | ---------------------- |
| Firestore Reads             | 50,000/day         | $0.06 per 100,000      |
| Firestore Writes            | 20,000/day         | $0.18 per 100,000      |
| Firestore Deletes           | 20,000/day         | $0.02 per 100,000      |
| Firestore Storage           | 1 GiB              | $0.18 per GiB/month    |
| Cloud Functions Invocations | 2M/month           | $0.40 per million      |
| Cloud Functions Compute     | 400K GiB-sec/month | $0.0000025 per GiB-sec |
| Firebase Storage            | 5 GB               | $0.026 per GB          |

### Scenario A: 1,000 Extractions/Month

| Resource                  | Calculation                                                                                                | Monthly Cost      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------- |
| **Firestore Reads**       | Job checks (5K) + listeners (4K) + CF reads (3K) + cleanup (900) + monitoring (2K) = ~15K reads            | $0.00 (free tier) |
| **Firestore Writes**      | Job writes (6K) + cleanup deletes (~1K) = ~7K writes                                                       | $0.00 (free tier) |
| **Firestore Storage**     | Jobs: 7-day window × ~143 jobs × 100KB = ~14MB. AI Ops: 1K × 100KB = ~100MB. Projects: grows with uploads. | $0.02             |
| **Cloud Functions**       | 1K invocations × 60s × 2GiB = 120K GiB-sec                                                                 | $0.00 (free tier) |
| **Firebase Storage**      | 3 files × 3MB × 1K = 9GB                                                                                   | $0.10             |
| **Gemini API** (external) | 3K calls × ~$0.001/call                                                                                    | ~$3.00            |
| **Total**                 |                                                                                                            | **~$3.12/month**  |

### Scenario B: 10,000 Extractions/Month

| Resource                  | Calculation                                               | Monthly Cost      |
| ------------------------- | --------------------------------------------------------- | ----------------- |
| **Firestore Reads**       | ~150K reads/month                                         | $0.06             |
| **Firestore Writes**      | ~70K writes/month                                         | $0.09             |
| **Firestore Storage**     | Jobs: ~1,430 active docs. AI Ops: 10K docs × 100KB = 1GB. | $0.20             |
| **Cloud Functions**       | 10K × 60s × 2GiB = 1.2M GiB-sec                           | $2.00             |
| **Firebase Storage**      | 90GB new/month                                            | $2.34             |
| **Gemini API** (external) | 30K calls                                                 | ~$30.00           |
| **Total**                 |                                                           | **~$34.69/month** |

### Scenario C: 100,000 Extractions/Month

| Resource                  | Calculation                                                              | Monthly Cost       |
| ------------------------- | ------------------------------------------------------------------------ | ------------------ |
| **Firestore Reads**       | ~1.5M reads/month                                                        | $0.84              |
| **Firestore Writes**      | ~700K writes/month                                                       | $1.08              |
| **Firestore Storage**     | Jobs: ~14,300 active docs. AI Ops: 100K × 100KB = 10GB. Projects: grows. | $1.80              |
| **Cloud Functions**       | 100K × 60s × 2GiB = 12M GiB-sec                                          | $28.50             |
| **Firebase Storage**      | 900GB new/month                                                          | $23.40             |
| **Gemini API** (external) | 300K calls                                                               | ~$300.00           |
| **Total**                 |                                                                          | **~$355.62/month** |

### Cost Breakdown Visualization

```
Scenario A (1K/mo):    ████████████████████████████████████████ Gemini $3.00 (96%)
                       ██ Firebase $0.12 (4%)

Scenario B (10K/mo):   ████████████████████████████████████████ Gemini $30.00 (86%)
                       █████ Firebase $4.69 (14%)

Scenario C (100K/mo):  ████████████████████████████████████████ Gemini $300.00 (84%)
                       ██████ Firebase $55.62 (16%)
```

**Key insight:** Gemini API cost dominates at every scale. Firebase costs are 4-16% of total. Optimizing Firebase saves dollars; optimizing Gemini calls saves tens or hundreds of dollars.

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
| **Location** | `src/database/ops/extraction.ts:308-313`                                                                       |
| **Query**    | `where('action', '==', 'IMAGE_PROCESSING')` + `where('createdAt', '>=', ...)` + `orderBy('createdAt', 'desc')` |
| **Fix**      | Added composite index `action ASC + createdAt DESC` on `MENULIST_AI_OPERATIONS` to `firestore.indexes.json`    |
| **Deploy**   | `firebase deploy --only firestore:indexes`                                                                     |

---

## 12. OPTIMIZATIONS ALREADY IN PLACE

| Optimization                   | Impact                                                                         | File                                              |
| ------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------- |
| **Duplicate job prevention**   | Prevents re-processing same project. Saves 1 full CF invocation per duplicate. | `checkExistingActiveJob()` in `menuProcessing.ts` |
| **Client-side PDF conversion** | Zero CF cost for PDF → image conversion.                                       | Browser-side in upload flow                       |
| **Batch processing**           | 10 images per Gemini call reduces invocation overhead.                         | `MAX_IMAGES_PER_BATCH = 10` in `constants/ai.ts`  |
| **Single progress update**     | Optimized from 3 writes to 1 write per job.                                    | `processMenuImagesJob.ts:210-214`                 |
| **Existing project reuse**     | `existingProject` passed to `saveFilesToProject()` to avoid duplicate read.    | `processMenuImagesJob.ts:286-293`                 |
| **Job TTL (7 days)**           | Terminal jobs deleted automatically. Collection doesn't grow unbounded.        | `cleanupOldJobsLogic()` limit 500                 |
| **Preview TTL (24h)**          | Unapproved re-extraction jobs cleaned up.                                      | `cleanupExpiredPreviewJobsLogic()`                |
| **Raw response truncation**    | Provenance text capped at 10KB/batch to prevent doc bloat.                     | `processMenuImages.ts:511-514`                    |
| **Rate limiting**              | 5 req/min per project via Upstash Redis.                                       | `checkExpensiveAIRateLimit()`                     |
| **Circuit breaker**            | Stops cascading failures to Gemini API.                                        | `executeWithCircuitBreaker()`                     |

---

## 13. ADDITIONAL RECOMMENDATIONS

### Priority 1 — Implement Before 10K/month

| #   | Recommendation                                                                                                                                                                            | Effort  | Impact                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------ |
| 1   | **Add TTL cleanup for `MENULIST_AI_OPERATIONS`** — delete docs > 90 days in nightly scheduler. Or strip `clientResponse` field after 7 days.                                              | Low     | Prevents unbounded storage growth (120GB/year at 100K/month scale) |
| 2   | **Add `limit(100)` to 3 cleanup scheduler queries** — `cleanupStuckJobsLogic()`, `cleanupExpiredPreviewJobsLogic()`, `cleanupStuckCancellingJobsLogic()`. Prevents batch commit overflow. | Trivial | Safety at scale                                                    |
| 3   | **Deploy the new `MENULIST_AI_OPERATIONS` index** — `firebase deploy --only firestore:indexes`                                                                                            | Trivial | Fixes monitoring dashboard crash                                   |

### Priority 2 — Implement Before 100K/month

| #   | Recommendation                                                                                                                                                                  | Effort | Impact                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------- |
| 4   | **Add project document size guard** — Before `saveFilesToProject()` writes, estimate doc size. If > 800KB, warn. If > 950KB, refuse write and notify user to clean old uploads. | Medium | Prevents 1MB document limit crash                   |
| 5   | **Storage lifecycle rules** — Move images older than 12 months to Coldline Storage ($0.004/GB vs $0.026/GB).                                                                    | Low    | 85% storage cost reduction for old images           |
| 6   | **Server-side aggregation for monitoring** — If dashboard auto-refresh is added, pre-compute health metrics in a summary doc updated by the nightly scheduler.                  | Medium | Prevents 300K+ reads/day if dashboard used actively |

### Priority 3 — Nice to Have

| #   | Recommendation                                                                                                                                                            | Effort | Impact                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------- |
| 7   | **Strip `result.combinedData` from terminal jobs** — After job data is saved to project, the job doesn't need the full extraction data anymore. Strip it to save storage. | Low    | ~50% reduction in job doc size        |
| 8   | **Gemini cost optimization** — Use Gemini 2.0 Flash Lite for simple menus (1-2 pages), reserve 2.5 Flash for complex multi-page menus.                                    | Medium | Potentially 50% Gemini cost reduction |

---

## 14. SUMMARY TABLE

| Area                               | Risk Level       | Status                                            |
| ---------------------------------- | ---------------- | ------------------------------------------------- |
| Firestore reads (extraction flow)  | ✅ SAFE          | 15K reads/1K extractions                          |
| Firestore writes (extraction flow) | ✅ SAFE          | 6K writes/1K extractions                          |
| `onSnapshot` listener              | ✅ SAFE          | Single-doc, 4 reads/job, auto-cleanup             |
| Job queue scaling                  | ✅ SAFE          | 7-day TTL, ~233 active docs at 1K/month           |
| Cloud Function costs               | ✅ SAFE          | Linear, $0.30/1K extractions                      |
| Firebase Storage                   | ✅ SAFE          | Linear, $0.10-23/month at scale                   |
| Indexes                            | ✅ FIXED         | 1 missing index added                             |
| Cleanup schedulers                 | ⚠️ LOW           | Need `limit(100)` on 3 queries                    |
| `MENULIST_AI_OPERATIONS` growth    | ⚠️ HIGH          | No TTL — 120GB/year at 100K/month                 |
| Project document size              | ⚠️ MEDIUM-HIGH   | Files array grows unbounded                       |
| Monitoring dashboard reads         | ⚠️ LOW           | OK for founder-only; risky with auto-refresh      |
| **Overall System**                 | **✅ COST-SAFE** | Gemini API (84-96%) dominates. Firebase is cheap. |

---

_Audit completed: March 13, 2026 (updated with Bug 1 fix)_  
_Bugs fixed: 2 (1 CRITICAL: checkExistingActiveJob security rule violation, 1 MEDIUM: missing MENULIST_AI_OPERATIONS index)_  
_Files modified: 2 (src/lib/firebase/menuProcessing.ts, firestore.indexes.json)_  
_Deploy prerequisite: `firebase deploy --only firestore:indexes`_
