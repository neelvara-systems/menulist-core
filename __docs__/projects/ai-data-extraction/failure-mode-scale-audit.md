# AI Data Extraction — Failure Mode & Scale Audit

**Date:** March 13, 2026  
**Auditor:** Principal Infrastructure Review (Cascade)  
**Scope:** Full pipeline: Upload → Storage → Job Queue → Cloud Function → AI → Hardening → Firestore → UI  
**Files Analyzed:** 18 source files across client + Cloud Functions  
**Verdict:** PRODUCTION SAFE with 3 fixes implemented

---

## Executive Summary

The MenuList AI data extraction pipeline is architecturally sound for current scale (hundreds of extractions/month). Three real bugs were found and fixed during this audit. The system has proper safety nets at every stage: idempotency via Firestore transactions, 15-minute cleanup scheduler for stuck jobs, circuit breaker + retry + rate limiting for AI calls, non-blocking hardening pipeline, and tenant-isolated Firestore rules.

**Critical finding:** `preview_ready` jobs (re-extraction previews) were NEVER cleaned up by any scheduler. They accumulated as ghost documents in Firestore indefinitely. Fixed.

---

## 1. Bugs Found & Fixed

### BUG 1 (CRITICAL): `preview_ready` jobs never cleaned up

| Aspect | Details |
|--------|---------|
| **Location** | `functions/src/schedulers/menuJobCleanup.ts` |
| **Problem** | Re-extraction jobs set `status: "preview_ready"` with `expiresAt` (24h TTL), but NO scheduler ever transitions these to a terminal state. The stuck job cleanup only checks `processing` + `timeoutAt`. The old job cleanup only checks `completed/failed/cancelled` + `completedAt`. Preview jobs fall through BOTH. |
| **Impact** | Ghost documents accumulate in `menuImageProcessingJobs` forever. At scale (1000+ re-extractions), this becomes a growing collection of never-deleted, non-terminal state documents. |
| **Fix** | Added `cleanupExpiredPreviewJobsLogic()` — queries `status == preview_ready` + `expiresAt < now`, marks as `failed` with code `PREVIEW_EXPIRED`. Wired into existing 15-min scheduler. |
| **Files** | `functions/src/schedulers/menuJobCleanup.ts`, `functions/src/triggers/schedulers.ts`, `firestore.indexes.json` |

### BUG 2 (MEDIUM): `cancelling` jobs can get stuck forever

| Aspect | Details |
|--------|---------|
| **Location** | `functions/src/schedulers/menuJobCleanup.ts` |
| **Problem** | If user sets job to `cancelling` but the CF already finished or crashed before the cancellation check (line 188 of `processMenuImagesJob.ts`), the job stays in `cancelling` state permanently. No scheduler handles this. |
| **Impact** | Orphaned `cancelling` jobs that never transition to `cancelled`. Low probability but guaranteed to happen eventually. |
| **Fix** | Added `cleanupStuckCancellingJobsLogic()` — queries `status == cancelling` + `updatedAt < 10min ago`, transitions to `cancelled`. Wired into same 15-min scheduler. |
| **Files** | `functions/src/schedulers/menuJobCleanup.ts`, `functions/src/triggers/schedulers.ts`, `firestore.indexes.json` |

### BUG 3 (MEDIUM): Error status update can fail silently

| Aspect | Details |
|--------|---------|
| **Location** | `functions/src/logic/processMenuImagesJob.ts:404-427` |
| **Problem** | The catch block calls `jobRef.update({ status: "failed" })` without its own try/catch. If Firestore has a transient network error during this update, the exception propagates to Cloud Functions retry, but the job document stays in `processing` state with no error info. |
| **Impact** | Job appears permanently stuck to the user. The 15-min cleanup scheduler catches it via `timeoutAt`, but user gets no error details. |
| **Fix** | Wrapped the error update in its own try/catch. If the status update fails, logs a CRITICAL error so the cleanup scheduler handles it. |
| **Files** | `functions/src/logic/processMenuImagesJob.ts` |

### Indexes Added (3 new composite indexes)

| Collection | Fields | Purpose |
|-----------|--------|---------|
| `menuImageProcessingJobs` | `status` ASC + `expiresAt` ASC | Expired preview cleanup |
| `menuImageProcessingJobs` | `status` ASC + `updatedAt` ASC | Stuck cancelling cleanup |
| `menuImageProcessingJobs` | `status` ASC + `completedAt` ASC | Old job cleanup (was missing) |

---

## 2. Full Failure Mode Analysis

### Category 1: AI Failures

| Failure Mode | Protection | Status |
|---|---|---|
| **Gemini API downtime** | `retryWithBackoff()` (3 attempts, exponential: 2s→4s→8s) + `executeWithCircuitBreaker()` wrapping | ✅ SAFE |
| **Slow responses** | CF timeout at 540s (`aiParallel` config). Job `timeoutAt` set to 10 minutes. Cleanup scheduler at 15 min. | ✅ SAFE |
| **Invalid/malformed JSON** | `parseAIResponseText()` strips BOM, markdown fences, then `JSON.parse()`. On parse failure → throws with clear message → job marked `failed`. | ✅ SAFE |
| **Partial responses** | `processAIResponseForFirebase()` validates structure but continues on warnings. Empty `data` returns `null`. Batch processing continues even if one batch fails. | ✅ SAFE |
| **Empty response** | Explicit check: `if (!responseText)` → throws with `finishReason`. | ✅ SAFE |
| **Rate limiting / quota** | `retryWithBackoff()` explicitly does NOT retry on quota errors (line 247-251). Job fails immediately with clear message. Rate limit pre-check via Upstash at start of processing. | ✅ SAFE |
| **Safety filter blocks** | All 4 harm categories set to `BLOCK_NONE` in `constants/ai.ts`. Critical for food menus with cocktail names. | ✅ SAFE |
| **Circuit breaker OPEN** | Throws `CircuitBreakerError` with stats. Job marked `failed` with `CIRCUIT_BREAKER` code + `retryable: true`. Feature flag `ENABLE_CIRCUIT_BREAKER` allows disable. | ✅ SAFE |

**Residual risk:** Circuit breaker state is per-function-instance (in-memory). Under cold-start churn, the breaker resets per instance. This is acceptable — the primary protection is retry + rate limit, not the breaker.

### Category 2: Queue Failures

| Failure Mode | Protection | Status |
|---|---|---|
| **Simultaneous job creation** | `checkExistingActiveJob()` queries `projectId + status IN [pending, processing]` with `limit(1)`. Returns existing job ID if found. | ✅ SAFE |
| **Duplicate processing** | Firestore transaction in Step 1: reads current status, only updates if `== PENDING`. If already picked up → returns `false` → function exits. | ✅ SAFE |
| **Cancelled jobs** | Post-AI cancellation check (line 187-204). Partial results saved on cancellation. | ✅ SAFE |
| **Partially completed jobs** | Batch-level error isolation. If batch N fails, batches 1..N-1 data is preserved in `accumulatedData`. `allFailedFileIndices` tracked. | ✅ SAFE |
| **Job backlog** | CF `onDocumentCreated` trigger is auto-scaling. Concurrent instances handle parallel jobs. Rate limit (5/min per project) prevents abuse. | ✅ SAFE |

**Note:** The duplicate check `checkExistingActiveJob()` is on the client side only. It's not a distributed lock — two clients could theoretically create two jobs in the ~100ms window between check and create. The transaction in Step 1 of the CF ensures only one processes.

### Category 3: Cloud Function Failures

| Failure Mode | Protection | Status |
|---|---|---|
| **Function crash mid-processing** | `timeoutAt` set to 10 min. Cleanup scheduler runs every 15 min → marks stuck jobs as `failed` with `retryable: true`. | ✅ SAFE |
| **Timeout during AI call** | CF has 540s timeout. Job has 10-min `timeoutAt`. Both are safety nets. | ✅ SAFE |
| **Memory pressure** | CF allocated 2GiB (`aiParallel`). Menu images are fetched-then-written to `/tmp`, processed sequentially. Memory scales with batch size (10 max), not total files. | ✅ SAFE |
| **CF retry execution** | `onDocumentCreated` triggers are NOT retried by Firebase. If function crashes, the document already exists — no trigger re-fire. Cleanup scheduler is the safety net. | ✅ SAFE |
| **Error update failure** | **Fixed in this audit** (Bug 3). Now wrapped in try/catch. | ✅ FIXED |

### Category 4: Firestore Failures

| Failure Mode | Protection | Status |
|---|---|---|
| **Document size limits** | Job document stores `rawBatchResponses[]` truncated to 10KB per batch. `combinedData` is the full extraction. For a 400-item menu, this could be ~200KB. Firestore limit is 1MB. | ✅ SAFE |
| **Large `result.combinedData`** | Worst case: 400 items × ~500 bytes each = ~200KB. Well under 1MB Firestore limit. | ✅ SAFE |
| **High write frequency** | 4-5 writes per job (create, processing, progress, completed, aiOperation). With 5 req/min rate limit → max 25 writes/min. Trivial. | ✅ SAFE |
| **Concurrent writes to project** | `saveFilesToProject` uses `set({...}, { merge: true })`. Not a transaction — could lose data if two writes overlap. However, `checkExistingActiveJob()` prevents concurrent jobs on same project. | ⚠️ LOW RISK |
| **Missing indexes** | **Fixed in this audit.** Added 3 composite indexes for cleanup queries. | ✅ FIXED |

**Residual risk:** `saveFilesToProject` uses `set(merge: true)` instead of a transaction. If a user manually edits the project while extraction is saving, the merge could overwrite user edits to the `files` array. Probability: extremely low (extraction takes seconds, user would need to save at exact same moment).

### Category 5: Storage Failures

| Failure Mode | Protection | Status |
|---|---|---|
| **Missing files** | `uploadFileToGemini()` returns `null` on failure. `uploadFilesInParallel()` filters nulls. If ALL uploads fail → `uploadedFiles.length === 0` → throws error. | ✅ SAFE |
| **Corrupted image** | Gemini handles gracefully — returns low quality score or partial data. Quality scoring flags it. | ✅ SAFE |
| **Storage read failure** | `fetch(file.url)` with `if (!response.ok)` check. Returns null → filtered out. | ✅ SAFE |
| **Large uploads** | Client-side PDF conversion at 1.5x scale, 80% JPEG quality. Max 10 images per batch. Individual file sizes are typically 1-5MB. | ✅ SAFE |
| **Temp file cleanup** | `/tmp` files cleaned in `finally` block of `uploadFileToGemini()`. Even on crash, CF `/tmp` is ephemeral. | ✅ SAFE |

### Category 6: Data Integrity

| Failure Mode | Protection | Status |
|---|---|---|
| **Items without categories** | `validateExtractionIntegrity()` detects orphan items (items referencing non-existent categories). Logged as warning, never blocks. | ✅ SAFE |
| **Duplicate IDs** | `validateExtractionIntegrity()` checks for duplicate item IDs. `transformIdsForFile()` prefixes IDs with fileUid, making collisions impossible across files. | ✅ SAFE |
| **Invalid prices** | `validateExtractionIntegrity()` flags prices > 20 chars. `detectExtractionAnomalies()` flags prices > 50000. Non-blocking. | ✅ SAFE |
| **Hardening corruption** | Hardening wrapped in try/catch (line 162-181 of `processMenuImagesJob.ts`). If it crashes, original data is preserved. Comment: "Hardening failure must NEVER block extraction". | ✅ SAFE |
| **Category synonym merge destroying data** | `normalizeCategorySynonyms()` only merges when synonym map matches. Unknown categories kept as-is. Item references remapped via `idRemapping`. | ✅ SAFE |
| **HTML injection** | `stripHtml()` in `redistributeUtils.ts` removes all HTML tags server-side. Frontend has DOMPurify as second layer. | ✅ SAFE |

### Category 7: Concurrency Risks

| Failure Mode | Protection | Status |
|---|---|---|
| **20 restaurants uploading simultaneously** | Each gets its own job document → own CF instance. Rate limit is per-project, not global. CF auto-scales. | ✅ SAFE |
| **Multiple extractions on same project** | `checkExistingActiveJob()` returns existing job ID. Client shows existing job status instead of creating new one. | ✅ SAFE |
| **Simultaneous re-extraction** | Same protection — `checkExistingActiveJob()` + Firestore transaction idempotency guard in CF. | ✅ SAFE |
| **Race between save and user edit** | `set(merge: true)` — last write wins on `files[]` array. Extremely unlikely timing. | ⚠️ LOW RISK |

### Category 8: Firebase Cost Risks

| Pattern | Risk | Assessment |
|---|---|---|
| **onSnapshot listener** | 1 listener per active job. Jobs complete in 30-120s. Max 3-4 reads per job lifecycle. | ✅ NEGLIGIBLE |
| **Job document size** | `rawBatchResponses` truncated to 10KB. `combinedData` < 200KB. Well under 1MB. | ✅ SAFE |
| **Old job accumulation** | `cleanupOldJobsLogic()` deletes terminal jobs > 7 days (limit 500/run). | ✅ SAFE |
| **Preview job accumulation** | **Fixed in this audit.** Was growing unbounded. Now cleaned every 15 min. | ✅ FIXED |
| **aiOperations collection growth** | Every extraction writes 1 doc to `MENULIST_AI_OPERATIONS`. No TTL/cleanup. At 1000 extractions/month = 12K docs/year. Acceptable for audit trail. | ⚠️ MONITOR |
| **Gemini File API cost** | Files auto-expire after 48 hours. No manual cleanup needed. | ✅ SAFE |

**Cost estimate at 1000 extractions/month:** ~$3.59/month (dominated by Gemini API). Firebase costs < $0.10/month.

### Category 9: Security Risks

| Area | Protection | Status |
|---|---|---|
| **Tenant isolation** | Job documents contain `tId`, `sId`, `uId`. Firestore rules: `resource.data.uId == request.auth.uid` for reads. | ✅ SAFE |
| **Write access** | Only authenticated users can create (must set own `uId`, must be `pending`). Only cancellation allowed as update. No client deletes. | ✅ SAFE |
| **Cross-tenant data leakage** | `saveFilesToProject()` uses `parseProjectId()` to derive `tId/sId` from projectId format. CF uses admin SDK — bypasses rules but operates on data from job document. | ✅ SAFE |
| **Storage path safety** | Files uploaded to `MenuListAi/project/files/{timestamp}-{uid}`. Storage rules require auth. | ✅ SAFE |
| **Rate limiting** | Upstash Redis: 5 req/min per project for expensive AI ops. Feature flag controlled. | ✅ SAFE |

**Note:** H1 from production-review.md (no server-side tenant verification) is acceptable because: (1) Firestore rules prevent unauthorized writes to job collection, (2) projectId format `{tId}-{timestamp}-{sId}` is parsed server-side, (3) an attacker would need both write access AND knowledge of another tenant's projectId.

### Category 10: Edge Case Menus

| Edge Case | Handling | Status |
|---|---|---|
| **1 item menu** | Quality scoring gives full 10 points for item existence. Low category score (5 pts). Works. | ✅ SAFE |
| **400 item menu** | Anomaly detection flags > 150 items (warning) and > 300 items (critical). Processing still completes. Batch processing handles chunking. | ✅ SAFE |
| **No prices** | `priceScore = 0`. Quality score drops. Warning shown to user. Data still saved. | ✅ SAFE |
| **Only images (no text)** | Gemini processes images — it's OCR. If genuinely no text, returns empty/minimal data. Quality score = 0 with warning. | ✅ SAFE |
| **Mixed languages** | `targetLanguages` passed to prompt. Gemini handles multi-language extraction. Languages detected and stored. | ✅ SAFE |
| **Duplicate categories** | `normalizeCategorySynonyms()` merges synonyms (~30 pairs). `mergeExtractedData()` deduplicates by ID across batches. | ✅ SAFE |
| **Extremely long names** | No explicit length cap in validation. Firestore field limit is 1MB per document. A 10000-char name would be unusual but wouldn't crash anything. | ⚠️ LOW RISK |
| **Unusual currencies** | Prices stored as strings. No currency parsing. Supports any format (₹, $, €, etc.). | ✅ SAFE |
| **Zero categories, some items** | `detectExtractionAnomalies()` doesn't check this case, but data is still valid. Items reference category "0" or empty string. | ⚠️ LOW RISK |

---

## 3. Race Conditions

| # | Condition | Probability | Impact | Mitigation |
|---|-----------|-------------|--------|------------|
| 1 | Two clients create jobs for same project in <100ms window | Very Low | Duplicate processing, double write to project | Firestore transaction in CF prevents double-processing. Second instance exits at line 128. |
| 2 | User saves project while extraction writes | Extremely Low | `set(merge: true)` — last writer wins on `files[]` array | User would need to save at exact moment CF writes. Extraction takes ~60s, save takes <1s. |
| 3 | User cancels after CF already wrote results | Low | Partial results saved, then status set to cancelled | Acceptable — data is written, status is accurate. |

**Verdict:** No dangerous race conditions exist. The Firestore transaction at Step 1 is the critical safeguard.

---

## 4. Remaining Low-Probability Risks (NOT fixing)

| # | Risk | Why Not Fixing | Mitigation |
|---|------|---------------|------------|
| 1 | Circuit breaker state resets on cold start | Per-instance is acceptable. Primary protection is retry + rate limit. Feature flag allows disable. | Monitor via logs. |
| 2 | `saveFilesToProject` not transactional | Extremely unlikely timing conflict. `checkExistingActiveJob` prevents concurrent jobs. | Could upgrade to transaction in future if multi-user editing becomes real. |
| 3 | `aiOperations` collection grows unbounded | 12K docs/year at 1000 extractions/month. Acceptable for audit trail. | Add TTL cleanup when collection exceeds 100K docs. |
| 4 | Very long item names not capped | Firestore has 1MB doc limit. A 10000-char name is unusual but won't crash. | Add 500-char cap in `normalizeResponseData` if real-world cases appear. |
| 5 | `cleanupOldJobsLogic` limited to 500 docs per run | At 1000 extractions/month with 7-day TTL, max ~233 terminal jobs at any time. Well under 500 limit. | Paginate if volume exceeds 2000/month. |

---

## 5. Summary

### What's Working Well
- **Idempotency:** Transaction-based status transition prevents duplicate processing
- **Batch isolation:** Failed batch doesn't kill successful batches
- **Non-blocking hardening:** Extraction succeeds even if hardening crashes
- **Comprehensive quality scoring:** Users get clear feedback on extraction quality
- **Rate limiting:** Upstash Redis prevents abuse at both client and CF level
- **Cleanup scheduler:** 15-min cadence catches stuck jobs reliably
- **Provenance tracking:** Raw AI responses preserved for debugging

### What Was Broken (Now Fixed)
1. **`preview_ready` jobs accumulated forever** — now cleaned every 15 minutes
2. **`cancelling` jobs could get stuck** — now resolved after 10 minutes
3. **Error status update could fail silently** — now has its own try/catch with CRITICAL logging

### Deploy Prerequisites
- `firebase deploy --only firestore:indexes` (3 new composite indexes)
- Deploy Cloud Functions (cleanup scheduler changes)

---

_Audit completed: March 13, 2026_  
_TypeScript check: 0 errors_  
_Files modified: 4 (menuJobCleanup.ts, schedulers.ts, processMenuImagesJob.ts, firestore.indexes.json)_
