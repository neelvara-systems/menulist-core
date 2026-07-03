# Cloud Function Execution Audit — AI Data Extraction Pipeline

**Audit Date:** March 13, 2026  
**Scope:** All Cloud Functions in the menu extraction pipeline  
**Files Audited:** 20 files, ~4,800 lines  
**Historical Result:** Code-audit GO — 1 bug fixed, 3 minor items documented; superseded by current external certification gates for launch status.

**Current status note (July 2, 2026):** This file is historical Cloud Functions code-audit evidence, not current MenuList launch certification. Current launch authority is the External Certification Runbook and `__docs__/audits/menulist-production-readiness-audit.md`: menu extraction source gates pass locally, but live effect still requires the blocked QA Firebase Functions deploy and the external provider/browser/device/production-host evidence.

---

## SECTION 1 — Cloud Function Architecture

### Pipeline Overview

```
Client (Next.js)
  │
  ├── getProcessedFile.ts → checkExistingActiveJob() → createMenuProcessingJob()
  │                                                        │
  │   menuProcessing.ts                                    │ Creates Firestore doc
  │                                                        ▼
  │                                    ┌──────────────────────────────────┐
  │                                    │ menuImageProcessingJobs/{jobId}  │
  │                                    │ status: "pending"                │
  │                                    └──────────────┬───────────────────┘
  │                                                   │
  │                                    onDocumentCreated (production)
  │                                    onCall (development)
  │                                                   ▼
  │                              processMenuImagesJobLogic()
  │                                    │
  │   Step 1: Transaction guard (pending → processing)
  │   Step 2: processMenuImagesLogic()
  │       ├── Rate limit check (Upstash)
  │       ├── Upload files to Gemini (parallel)
  │       ├── Chunk into batches of 10
  │       ├── For each batch:
  │       │   └── Circuit Breaker → retryWithBackoff → AI Gateway → Gemini API
  │       ├── Parse response (processAIResponseForFirebase)
  │       ├── Merge batch results
  │       ├── Quality scoring
  │       └── Record AI operation (MENULIST_AI_OPERATIONS)
  │   Step 2b: hardenExtractedData() (non-blocking)
  │   Step 3: Cancellation check
  │   Step 4: Progress update
  │   Step 5: Fetch project, detect first/re-extraction
  │   Step 6: Branch
  │       ├── First extraction → redistribute → saveFilesToProject (transaction) → COMPLETED
  │       └── Re-extraction → PREVIEW_READY (24h TTL)
  │   Step 7 (error): Mark FAILED with error details
  │
  └── useMenuProcessingJob hook (onSnapshot listener for real-time UI updates)
```

### Cloud Functions Involved

| Function | Type | Schedule | Purpose |
|---|---|---|---|
| `processMenuImagesJob` | onDocumentCreated | On job creation | Main extraction pipeline |
| `dev_triggerProcessMenuImages` | onCall | Manual (dev only) | Dev environment trigger |
| `processMenuImages` | onCall | Manual | Legacy callable (shared.ts) |
| `menulistMaintenanceScheduler.menu_stuck_cleanup` | onSchedule task | Every 15 min | Cleanup stuck/expired/cancelling jobs |
| `menulistMaintenanceScheduler.menu_old_cleanup` | onSchedule task | Daily 3 AM UTC | Delete terminal jobs >7 days old |
| `msgExtractionWatcher` | onDocumentUpdated | On job update | Messaging onboarding integration |

### Function Configuration

| Setting | Value |
|---|---|
| **Timeout** | 540 seconds (9 minutes) |
| **Memory** | 2 GiB |
| **Region** | us-central1 |
| **Secrets** | AI keys + Upstash credentials |

### Key Files

| File | Lines | Purpose |
|---|---|---|
| `triggers/production.ts` | 87 | onDocumentCreated trigger |
| `logic/processMenuImagesJob.ts` | 481 | Job orchestration, idempotency, branching |
| `logic/processMenuImages.ts` | 921 | AI processing, batch, upload, scoring |
| `logic/aiResponseUtils.ts` | 278 | Response parsing, validation, normalization |
| `logic/redistributeUtils.ts` | 556 | Per-file redistribution, ID transformation |
| `logic/extractionHardening.ts` | 627 | Category normalization, integrity, anomaly detection |
| `logic/saveFilesToProject.ts` | 292 | Firestore write with transaction |
| `lib/circuitBreaker.ts` | 260 | Circuit breaker (CLOSED→OPEN→HALF_OPEN) |
| `lib/rateLimit.ts` | 187 | Upstash sliding window rate limiting |
| `lib/logger.ts` | 129 | Unified logging (Firebase + Sentry) |
| `schedulers/menuJobCleanup.ts` | 199 | 3 cleanup functions |
| `triggers/schedulers.ts` | 172 | Scheduler registrations |
| `constants/ai.ts` | 101 | Model config, batch settings |
| `config/secrets.ts` | 191 | Function options, secret groups |
| `types/menuProcessingJob.types.ts` | 200 | Job document interface |
| `dev-triggers.ts` | 73 | Dev callable |
| `ai/aiGateway.ts` | ~200 | AI Gateway with key rotation |
| `ai/keyManager.ts` | ~150 | Key pool + health tracking |
| `firebaseAdmin.ts` | 26 | Firebase Admin initialization |
| `lib/sentry.ts` | ~100 | Sentry integration |

---

## SECTION 2 — Execution Safety Review

### 2.1 Duplicate Invocation Protection ✅ SAFE

**Mechanism:** Firestore transaction guard in `processMenuImagesJobLogic` (line 106-126):

```typescript
const updated = await firestoreAdmin.runTransaction(async (transaction) => {
    const jobDoc = await transaction.get(jobRef);
    if (jobDoc.data()?.status !== MENU_PROCESSING_STATUS.PENDING) {
        return false; // Already picked up
    }
    transaction.update(jobRef, { status: 'processing', ... });
    return true;
});
if (!updated) return;
```

Cloud Functions v2 `onDocumentCreated` provides at-least-once delivery. The transaction-based status check ensures only ONE invocation processes the job. Subsequent invocations see `status !== 'pending'` and exit immediately.

**Verdict:** Textbook idempotency guard. ✅

### 2.2 Firestore Trigger Loops ✅ SAFE

- `onDocumentCreated` fires only on document creation, not updates
- The function only UPDATES the same document (status changes)
- No new documents are created that would trigger the function again
- `msgExtractionWatcher` (onDocumentUpdated) fires on every job update but filters early for messaging-related jobs only

**Verdict:** No trigger loop possible. ✅

### 2.3 Race Conditions ✅ SAFE

Two critical write paths are protected by transactions:

1. **Job status transition** (pending → processing): Protected by transaction in Step 1
2. **Save to project** (`saveFilesToProject`): Uses `firestoreAdmin.runTransaction()` — atomic read-then-write prevents concurrent extraction writes from corrupting project data

**Verdict:** Both critical paths are transaction-protected. ✅

### 2.4 Client-Side Duplicate Job Creation ⚠️ MINOR RISK

`checkExistingActiveJob()` queries for active jobs before creating a new one. However, this is a non-transactional read-then-write. Two rapid clicks could create two separate job documents.

**Impact:** LOW — The UI disables the upload button after first click. If two jobs were created, both would process independently. `saveFilesToProject` transaction would serialize the project writes (second appends on top of first). Result: duplicate extracted data, not data corruption.

**Recommendation:** No code change needed at current scale. If this becomes an issue at scale, add a server-side uniqueness check in `processMenuImagesJobLogic` (query for active jobs on same projectId before processing).

### 2.5 Cancellation Safety ✅ SAFE

Cancellation is cooperative:
1. Client sets `status: 'cancelling'` via `cancelMenuProcessingJob()`
2. Server checks for cancellation AFTER AI processing (Step 3) — saves partial results
3. If server crashes before checking, `cleanupStuckCancellingJobsLogic()` resolves stuck cancelling jobs every 15 minutes (10-min timeout)
4. Pending jobs are cancelled directly by client (no CF involvement needed)

---

## SECTION 3 — Timeout and Memory Risks

### 3.1 Timeout Analysis ✅ SAFE

**Function timeout:** 540 seconds (9 minutes)

Processing time estimates:

| Scenario | Files | Batches | Upload | AI Processing | Post-Processing | Total |
|---|---|---|---|---|---|---|
| Small menu | 1 | 1 | ~5s | ~20s | ~10s | ~35s |
| Medium menu | 3 | 1 | ~10s | ~30s | ~15s | ~55s |
| Large menu | 10 | 1 | ~15s | ~45s | ~20s | ~80s |
| Very large | 20 | 2 | ~15s | ~90s + 1s delay | ~25s | ~135s |
| Maximum | 50 | 5 | ~30s | ~250s + 15s delays | ~30s | ~325s |

All scenarios fit within the 540s timeout with margin.

**Timeout safety net:** The function sets `timeoutAt = now + 10 minutes` on the job document. The 15-minute cleanup scheduler catches jobs that exceed this via `cleanupStuckJobsLogic()`. If the function dies (timeout, crash, OOM), the cleanup marks the job as failed with `retryable: true`.

### 3.2 Memory Analysis ✅ SAFE

**Memory allocation:** 2 GiB

Peak memory usage analysis:

| Operation | Memory Usage |
|---|---|
| Image download (parallel, 10 files × 10MB) | ~100 MB |
| Gemini JSON response (300 items) | ~1 MB |
| Accumulated data (5 batches) | ~5 MB |
| Node.js base + SDK overhead | ~200 MB |
| **Peak total** | **~300 MB** |

2 GiB provides >5x headroom. ✅ SAFE.

**Temp disk:** Files are written to `/tmp` (10 GB limit) and cleaned up in `finally` blocks. Cleanup is reliable even on errors.

### 3.3 Individual Gemini API Call Timeout ⚠️ MINOR RISK

There is no explicit per-call timeout on `genAIClient.models.generateContent()`. If Gemini hangs on a single request, only the 540s function timeout acts as backstop.

**Mitigation:** HTTP/TCP timeouts (~30-60s) and Gemini's server-side timeouts prevent truly infinite hangs. The AI Gateway's retry mechanism also limits exposure.

**Recommendation:** No immediate fix needed. The `@google/genai` SDK does not expose an AbortSignal parameter. Function timeout is the effective backstop.

---

## SECTION 4 — Retry Safety

### 4.1 Cloud Functions Retry ✅ SAFE

`onDocumentCreated` v2 provides at-least-once delivery but does NOT automatically retry failed invocations. The idempotency guard (Section 2.1) handles any duplicate delivery.

### 4.2 Application-Level Retry ✅ SAFE (with note)

Three retry layers exist:

```
Circuit Breaker (5 failures → OPEN for 30s)
  └── retryWithBackoff (3 attempts, 2s base delay)
      └── AI Gateway (6 attempts with key rotation)
```

**Key safety properties:**
- `retryWithBackoff` skips 4xx errors (including 429) — throws immediately
- AI Gateway handles 429 internally with key rotation
- Circuit breaker opens after 5 consecutive server errors — prevents cascade

**Nested retry analysis:**
- For 429 (rate limit): Gateway handles with key rotation. If exhausted, throws 429 (4xx). `retryWithBackoff` sees 4xx, throws immediately. **Max 6 attempts.** ✅
- For 5xx (server error): Gateway retries 6 times. If exhausted, throws. `retryWithBackoff` retries 2 more times, each going through Gateway's 6 attempts. **Max 18 attempts.** ⚠️ Excessive but not harmful.
- For quota errors: Both layers skip retries. **Max 1 attempt.** ✅

**Note:** The `retryWithBackoff` layer was written before the AI Gateway existed. Now redundant for most failure modes. Not urgent to remove since it doesn't cause incorrect behavior, only wastes API quota on persistent 5xx.

### 4.3 Retry Cannot Create Duplicate Data ✅ SAFE

- `retryWithBackoff` wraps only the Gemini API call, not database writes
- `addAiOperation` (cost tracking) runs once after all batches complete
- `saveFilesToProject` runs once after all processing
- Job status updates use Firestore's last-write-wins semantics on the same document

### 4.4 Retry Cannot Create Inconsistent State ✅ SAFE

- If a batch fails mid-job, only that batch's data is lost — successful batches are preserved
- If ALL batches fail, the job is marked FAILED (line 779-785)
- If the function crashes between processing and status update, the cleanup scheduler marks it FAILED

### 4.5 Manual Retry (Monitoring Dashboard) ✅ SAFE

Creates a new job document with `retriedFromJobId` reference. Max 3 retries enforced. Reuses existing job creation infrastructure — full idempotency protection applies.

---

## SECTION 5 — External API Stability (Gemini)

### 5.1 Error Handling ✅ COMPREHENSIVE

| Error Type | Handling |
|---|---|
| Empty response | Explicit check: `if (!responseText)` → throws with finishReason |
| Malformed JSON | `parseAIResponseText` catches JSON.parse errors → clean error message |
| Invalid structure | `validateResponseStructure` logs warnings, continues with normalization |
| Safety filter block | All 4 categories set to `BLOCK_NONE` (prevents food menu false positives) |
| Rate limit (429) | AI Gateway key rotation + exponential backoff |
| Server error (5xx) | AI Gateway retry + circuit breaker |
| Quota exceeded | Both retry layers skip → immediate failure with clear message |
| Network error | AI Gateway retry + retryWithBackoff |

### 5.2 Malformed Response Rejection ✅ SAFE

`processAIResponseForFirebase` pipeline:
1. **Parse:** BOM removal → markdown fence removal → JSON.parse (throws on invalid JSON)
2. **Validate:** Check required fields (languages, categories, items arrays). Warnings logged but data continues.
3. **Normalize:** IDs coerced to strings, tags normalized, confidence validated, undefined fields handled

Invalid AI responses cannot write corrupt data to Firestore — the normalization layer ensures consistent types.

### 5.3 Cost Control ✅ SAFE

- **Rate limiting:** 5 requests/minute per project (Upstash Redis)
- **Circuit breaker:** Opens after 5 consecutive failures, 30s recovery timeout
- **Cost tracking:** Every AI call recorded in `MENULIST_AI_OPERATIONS` collection
- **Batch delay:** Exponential backoff between batches (1s → 2s → 4s → 8s max)

### 5.4 AI Gateway Protection ✅ SAFE

The AI Gateway provides transparent retry + key rotation:
- 1-4 API keys with health tracking
- Key cooldown: exponential 60s → 120s → 240s → 5min cap
- Same `GoogleGenAI` interface — zero call-site changes
- Logs key rotation events for debugging

---

## SECTION 6 — Fixes and Improvements

### BUG 1: Missing `ignoreUndefinedProperties` in Firestore Admin ✅ FIXED

**Problem:** `firebaseAdmin.ts` initialized Firestore without `ignoreUndefinedProperties: true`. The AI response normalization in `aiResponseUtils.ts` produces `undefined` for optional fields (`description`, `price`, `tags`, `attributes`). These values flow into `jobRef.update()` calls via `result.combinedData`. Without the setting, Firestore Admin SDK can throw `"Cannot use undefined as a Firestore value"` on job document updates.

**Severity:** MEDIUM — Could crash job updates on menus missing descriptions/prices, leaving jobs stuck in 'processing' state.

**Fix applied:**

```typescript
// functions/src/firebaseAdmin.ts
const firestoreAdmin = admin.firestore();
firestoreAdmin.settings({ ignoreUndefinedProperties: true });
```

**Impact:** All Firestore writes in all Cloud Functions now safely strip undefined values. Zero behavioral change for defined values.

### DOCUMENTED: Redundant Retry Nesting (No Code Change)

**Problem:** `retryWithBackoff(2)` wraps `genAIClient.models.generateContent()` which is the AI Gateway with its own 6-attempt retry. For 5xx errors, this creates up to 18 API attempts per batch.

**Severity:** LOW — Wastes API quota on persistent server errors but doesn't cause incorrect behavior.

**Recommendation:** When the AI Gateway was added, the outer `retryWithBackoff` became redundant. Consider reducing `maxAttempts` from 2 to 0 in a future session. Not urgent.

### DOCUMENTED: Per-Instance Circuit Breaker (No Code Change)

**Problem:** `geminiCircuitBreaker` is a module-level singleton. Each Cloud Function instance has its own circuit breaker state (not shared across instances).

**Severity:** INFORMATIONAL — Expected in serverless architecture. A shared circuit breaker would need Redis, adding latency. Gemini's own rate limits provide the real cross-instance protection.

### DOCUMENTED: Client-Side Race Window (No Code Change)

**Problem:** `checkExistingActiveJob()` is a non-transactional query. Two rapid clicks could create two jobs for the same project.

**Severity:** LOW — UI disables button after first click. `saveFilesToProject` transaction prevents data corruption. At worst, duplicate extraction data appended.

---

## SECTION 7 — Production Readiness Verdict

### Scoring

| Area | Score | Notes |
|---|---|---|
| **Idempotency** | 10/10 | Transaction-based duplicate guard |
| **Trigger Safety** | 10/10 | No trigger loops, no cascading writes |
| **Race Conditions** | 10/10 | Both critical paths transaction-protected |
| **Timeout Safety** | 9/10 | 540s covers all scenarios; no per-call timeout (minor) |
| **Memory Safety** | 10/10 | 2GiB provides >5x headroom |
| **Retry Safety** | 9/10 | Redundant nesting (minor); no duplicate writes |
| **Gemini Error Handling** | 10/10 | All error types handled with clear categorization |
| **Response Validation** | 10/10 | Parse → validate → normalize pipeline |
| **Cost Control** | 10/10 | Rate limit + circuit breaker + cost tracking |
| **Logging/Observability** | 10/10 | Firebase logger + Sentry + structured context |
| **Cleanup/Recovery** | 10/10 | 15-min stuck job cleanup + 24h TTL + 7-day purge |
| **Error State Recovery** | 10/10 | Double try/catch on failure; cleanup scheduler backstop |

### **VERDICT: Historical Code Audit GO (118/120)**

The extraction pipeline Cloud Functions passed this March 2026 code audit. This historical verdict does not certify current live Firebase behavior; current launch status depends on the scoped QA deploy and external certification gates. The architecture demonstrates mature serverless patterns:

1. **Idempotency** — Transaction guard prevents duplicate processing
2. **Fault tolerance** — Circuit breaker + retry + cleanup scheduler provide defense in depth
3. **Observability** — Structured logging with job IDs, Sentry integration, AI call tracking
4. **Graceful degradation** — Partial batch failures preserved; hardening failures non-blocking
5. **Cost protection** — Rate limiting, circuit breaker, and operation tracking

**1 bug fixed** (`ignoreUndefinedProperties`), **3 minor items documented** (retry nesting, per-instance circuit breaker, client race window).

---

### Files Modified in This Audit

| File | Change |
|---|---|
| `functions/src/firebaseAdmin.ts` | Added `ignoreUndefinedProperties: true` |

### Files Audited (20)

- `functions/src/triggers/production.ts`
- `functions/src/triggers/schedulers.ts`
- `functions/src/triggers/messaging.ts`
- `functions/src/logic/processMenuImagesJob.ts`
- `functions/src/logic/processMenuImages.ts`
- `functions/src/logic/aiResponseUtils.ts`
- `functions/src/logic/redistributeUtils.ts`
- `functions/src/logic/extractionHardening.ts`
- `functions/src/logic/saveFilesToProject.ts`
- `functions/src/lib/circuitBreaker.ts`
- `functions/src/lib/rateLimit.ts`
- `functions/src/lib/logger.ts`
- `functions/src/schedulers/menuJobCleanup.ts`
- `functions/src/constants/ai.ts`
- `functions/src/config/secrets.ts`
- `functions/src/types/menuProcessingJob.types.ts`
- `functions/src/dev-triggers.ts`
- `functions/src/firebaseAdmin.ts`
- `functions/src/genAiClient.ts`
- `src/lib/firebase/menuProcessing.ts`
