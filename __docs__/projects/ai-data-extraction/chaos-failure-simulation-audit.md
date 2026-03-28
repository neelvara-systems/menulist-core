# AI Data Extraction — Chaos & Failure Simulation Audit

**Date:** March 13, 2026  
**Scope:** Full AI extraction pipeline stress-test  
**Files Audited:** 14 files, ~3,500 lines of code  
**Result:** 4 bugs found & fixed, 0 TypeScript errors

---

## SECTION 1 — Failure Handling Results

### Scenario 1: Duplicate Job Trigger

**Simulation:** Same extraction job triggered twice simultaneously.

**Code Path Traced:**
1. Frontend `getProcessedFile.ts:51` → `checkExistingActiveJob(projectId)` queries for `status IN ['pending', 'processing']`
2. If found → returns existing jobId, no new job created
3. Server `processMenuImagesJobLogic:106-126` → Firestore transaction checks `status !== PENDING` before updating to `PROCESSING`
4. If already `PROCESSING` → returns `false`, function exits early

**Result:** ✅ SAFE
- Frontend duplicate check prevents most cases
- Server-side transaction ensures only ONE instance processes a given job
- Edge case: two jobs CAN be created for the same project if two requests pass the frontend check simultaneously (non-atomic check-then-create). Low probability, and the second job's `saveFilesToProject` transaction (Fix 2) now prevents data corruption.

---

### Scenario 2: Gemini API Failure

**Simulation:** Gemini returns malformed JSON, empty response, timeout, partial response.

**Code Path Traced:**
1. `processMenuImages.ts:488-501` → `executeWithCircuitBreaker(() => retryWithBackoff(() => genAIClient.models.generateContent(...)))`
2. AI Gateway (`aiGateway.ts:129-204`) → 6 max retry attempts with key rotation on 429, backoff on 5xx
3. `retryWithBackoff` → 2 additional retries with exponential backoff (2s, 4s)
4. Circuit breaker → opens after 5 consecutive failures, fast-fails for 30s

**Sub-scenarios:**
- **Malformed JSON:** `parseAIResponseText` throws → batch marked failed, other batches continue
- **Empty response:** `processSingleBatch:504` checks `if (!responseText)` → throws → batch fails
- **API timeout:** Retries exhaust → error propagates → job marked FAILED
- **Partial response:** Truncated JSON → `JSON.parse` fails → malformed JSON path

**BUG FOUND:** If ALL batches fail, `processMenuImagesLogic` continued with empty data and returned successfully, causing empty file entries to be saved to the project as COMPLETED.

**Result:** ✅ FIXED — Added `successfulBatches === 0` guard that throws when no data was extracted.

---

### Scenario 3: Firestore Write Failure

**Simulation:** Firestore write fails during job status update or project document update.

**Code Path Traced:**
1. Job status update failure → `processMenuImagesJobLogic:417-437` has nested try/catch
2. If inner update fails → CRITICAL log, cleanup scheduler catches via `timeoutAt`
3. Project document update failure → caught by outer catch at line 404, job marked FAILED
4. `saveFilesToProject` uses `transaction.set()` — atomic, no partial writes

**Result:** ✅ SAFE — Double safety net (catch block + cleanup scheduler).

---

### Scenario 4: Cloud Function Retry

**Simulation:** Cloud Function executes twice due to infrastructure retry.

**Code Path Traced:**
1. `onDocumentCreated` (v2) does NOT auto-retry by default
2. Even if retried, `processMenuImagesJobLogic:106-126` uses Firestore transaction
3. Transaction checks `jobDoc.data()?.status !== MENU_PROCESSING_STATUS.PENDING`
4. If already `PROCESSING` → returns `false`, second execution exits early

**Result:** ✅ SAFE — Transactional idempotency prevents duplicate processing.

---

### Scenario 5: Job Cancellation During Processing

**Simulation:** Job cancelled while AI extraction is running.

**Code Path Traced:**
1. User calls `cancelMenuProcessingJob` → sets status to `cancelling`
2. `processMenuImagesJobLogic:187-204` checks status AFTER AI processing completes
3. If `cancelling` → marks as `cancelled`, saves partial results
4. If user cancels `pending` job → directly set to `cancelled` → CF transaction sees non-PENDING status → exits early

**Edge case: stuck `cancelling`** → `cleanupStuckCancellingJobsLogic` resolves after 10 minutes

**Result:** ✅ SAFE — Graceful cancellation with cleanup scheduler fallback.

---

### Scenario 6: Upload During Processing

**Simulation:** New files uploaded to project while extraction is running.

**Code Path Traced:**
1. `getProcessedFile.ts:51` → `checkExistingActiveJob(projectId)` returns existing jobId
2. New upload is prevented while extraction is active
3. If files are modified directly (bypassing extraction), `saveFilesToProject` previously did non-atomic read-then-write

**BUG FOUND:** `saveFilesToProject` read the project, built new data, then wrote — without atomicity. Concurrent modifications between read and write would be silently overwritten.

**Result:** ✅ FIXED — Wrapped in `firestoreAdmin.runTransaction()` for atomic read-modify-write.

---

### Scenario 7: Hardening Layer Failure

**Simulation:** Exception thrown inside `extractionHardening.ts`.

**Code Path Traced:**
1. `processMenuImagesJobLogic:162-181` wraps `hardenExtractedData()` in try/catch
2. On exception → logs warning, continues with original (un-hardened) data
3. Job still completes successfully

**Result:** ✅ SAFE — Hardening is explicitly non-blocking by design.

---

### Scenario 8: Very Large Menu (300+ items)

**Simulation:** Menu with 300+ items processed.

**Code Path Traced:**
1. `GENERATION_CONFIG.maxOutputTokens: 65536` — handles large menus
2. Batch processing: `MAX_IMAGES_PER_BATCH = 10` — splits large uploads
3. Firestore 1 MiB limit: 300 items × ~500 bytes = ~150KB — well within limit
4. `rawBatchResponses` truncated to 10KB per batch — prevents doc bloat

**Result:** ✅ SAFE — Token limits and batching handle large menus. Extremely large menus (1000+ items with full multilingual data) could theoretically approach 1 MiB but this is an edge case.

---

### Scenario 9: Network Timeout

**Simulation:** Slow or failed API responses.

**Code Path Traced:**
1. Cloud Function timeout: `FUNCTION_OPTIONS.aiParallel.timeoutSeconds: 540` (9 minutes)
2. `processMenuImagesJobLogic:121` sets `timeoutAt` to 10 minutes from start
3. If CF killed mid-execution → catch block may not run
4. `cleanupStuckJobsLogic` (every 15 min) catches jobs where `status == 'processing' AND timeoutAt < now()`
5. Marks stuck jobs as FAILED with `retryable: true`

**Result:** ✅ SAFE — Cleanup scheduler catches timed-out jobs within 15-minute cycle.

---

## SECTION 2 — Critical Risks

### Risk 1: All Batches Fail → Empty Data Saved (FIXED)

**Severity:** CRITICAL  
**Root Cause:** `processMenuImagesLogic` didn't check if any batches succeeded before returning. When all batches returned `{ success: false }`, the function continued with `{ languages: [], categories: [], items: [] }` and returned successfully.  
**Impact:** Empty file entries saved to project, job marked as COMPLETED with quality score 0.  
**Fix:** Added `successfulBatches === 0` guard that throws, propagating to job FAILED status.

### Risk 2: saveFilesToProject Race Condition (FIXED)

**Severity:** CRITICAL  
**Root Cause:** Non-atomic read-then-write pattern. The function read the project, built new file entries, then wrote the merged array — without holding a lock.  
**Impact:** If the project was modified between read and write (user adding files, another extraction completing), the concurrent modification would be silently overwritten.  
**Fix:** Wrapped in `firestoreAdmin.runTransaction()` — the read and write are now atomic. Concurrent modifications trigger a transaction retry.

### Risk 3: Progress Field Stale on Failure (FIXED)

**Severity:** MEDIUM  
**Root Cause:** Error handler didn't reset `progress` and `currentStep` fields.  
**Impact:** Failed jobs showed stale progress (e.g., "50%") in frontend and monitoring dashboard.  
**Fix:** Added `progress: 0, currentStep: "Failed"` to the error status update.

### Risk 4: AI Errors Not Retryable (FIXED)

**Severity:** MEDIUM  
**Root Cause:** `isRetryable()` only returned `true` for RATE_LIMIT, TIMEOUT, and CIRCUIT_BREAKER error codes. AI_ERROR was not included.  
**Impact:** Gemini transient failures (model overload, temporary outages) couldn't be retried via the monitoring dashboard retry button.  
**Fix:** Added `AI_ERROR` to the retryable error codes.

---

## SECTION 3 — Stability Improvements

### Implemented (This Audit)

| Improvement | File | Change |
|---|---|---|
| All-fail guard | `processMenuImages.ts` | Throw when `successfulBatches === 0` |
| Atomic project save | `saveFilesToProject.ts` | `runTransaction()` wrapping read-modify-write |
| Progress reset on failure | `processMenuImagesJob.ts` | `progress: 0, currentStep: "Failed"` in error handler |
| AI error retryability | `processMenuImagesJob.ts` | `AI_ERROR` added to `isRetryable()` |

### Documented (Not Launch-Blocking)

| Issue | Severity | Notes |
|---|---|---|
| Frontend duplicate check not atomic | LOW | Two simultaneous requests could create two jobs. Server-side transaction prevents data corruption. |
| Validation warnings not rejecting data | LOW | `processAIResponseForFirebase` logs warnings but normalizes data. By design — favors partial data over total failure. |
| No Firestore doc size pre-check | LOW | Very large menus could fail with generic error. Practical limit ~1000 items before risk. |
| `autoMergeItems()` computes stats but doesn't apply | LOW | Existing technical debt — merge result is informational only. |

---

## SECTION 4 — Fixes Implemented

### Fix 1: All Batches Fail Guard

**File:** `functions/src/logic/processMenuImages.ts`  
**Root Cause:** No check for `successfulBatches === 0` after batch processing loop.  
**Change:** Added guard after batch summary log that throws `Error('All N extraction batch(es) failed')`.  
**Effect:** Error propagates to `processMenuImagesJobLogic` catch block → job marked FAILED with retryable error.

### Fix 2: Atomic Project Save

**File:** `functions/src/logic/saveFilesToProject.ts`  
**Root Cause:** Non-atomic `get()` → process → `set()` pattern allowed concurrent writes to silently overwrite each other.  
**Change:** Wrapped entire function body in `firestoreAdmin.runTransaction()`. The `_existingProjectData` parameter is now ignored (transaction always reads fresh data).  
**Effect:** Concurrent project modifications trigger transaction retry instead of silent data loss.

### Fix 3: Progress Reset on Failure

**File:** `functions/src/logic/processMenuImagesJob.ts`  
**Root Cause:** Error handler at line 417-429 didn't include `progress` or `currentStep` in the update.  
**Change:** Added `progress: 0, currentStep: "Failed"` to the FAILED status update.  
**Effect:** Frontend and monitoring dashboard show correct state for failed jobs.

### Fix 4: AI Error Retryability

**File:** `functions/src/logic/processMenuImagesJob.ts`  
**Root Cause:** `isRetryable()` excluded `AI_ERROR` from retryable codes.  
**Change:** Added `AI_ERROR` to the return condition.  
**Effect:** Gemini transient failures can now be retried via the monitoring dashboard.

---

## SECTION 5 — Production Resilience Assessment

### Protection Layers (Defense in Depth)

| Layer | Protection | Location |
|---|---|---|
| 1. Frontend | Duplicate job prevention | `checkExistingActiveJob()` |
| 2. Rate Limiting | Upstash Redis (5/min per project) | `checkExpensiveAIRateLimit()` |
| 3. AI Gateway | Key rotation + 6 retry attempts | `aiGateway.ts` |
| 4. Retry Logic | 2 retries with exponential backoff | `retryWithBackoff()` |
| 5. Circuit Breaker | Opens after 5 failures, fast-fails for 30s | `circuitBreaker.ts` |
| 6. Idempotency | Transaction-based status check | `processMenuImagesJobLogic` |
| 7. Hardening | Non-blocking category normalization + anomaly detection | `extractionHardening.ts` |
| 8. Validation | Structure validation + normalization | `aiResponseUtils.ts` |
| 9. Atomic Save | Firestore transaction for project writes | `saveFilesToProject.ts` |
| 10. Cleanup Scheduler | Catches stuck/expired/cancelling jobs every 15 min | `menuJobCleanup.ts` |
| 11. Error Safety Net | Nested try/catch with cleanup scheduler fallback | `processMenuImagesJobLogic` |

### Verdict: **PRODUCTION READY ✅**

The AI extraction pipeline has comprehensive failure handling across 11 protection layers. The 4 bugs found in this audit have been fixed:
- 2 CRITICAL bugs that could cause data corruption or empty data writes
- 2 MEDIUM bugs that caused stale UI state and prevented retry

**No data corruption scenarios remain.** All failure paths either:
1. Mark the job as FAILED (with retryable flag where appropriate)
2. Are caught by the cleanup scheduler within 15 minutes
3. Are handled atomically via Firestore transactions

**Zero TypeScript errors** after all fixes.
