# AI Data Extraction — Production Audit Report

**Date:** March 13, 2026
**Auditor:** Cascade
**Scope:** End-to-end pipeline (client → job queue → AI → hardening → save → editor)
**Files Audited:** 20 files, ~4,800 lines of code
**Historical Result:** Code-audit GO in March 2026 (80/80); superseded by the current external certification gates for launch status.

**Current status note (July 2, 2026):** This file is historical code-audit evidence, not current MenuList launch certification. Current launch authority is the External Certification Runbook and `__docs__/audits/menulist-production-readiness-audit.md`: menu extraction source gates pass locally, but live production certification still requires the blocked QA Firebase Functions/Storage deploys, provider smoke, authenticated browser/device QA, and production-host evidence.

---

## Audit Summary

| Phase | Area | Score | Notes |
|-------|------|-------|-------|
| 1 | System Consistency | 10/10 | All 20 files exist, imports resolve, constants match |
| 2 | E2E Flow | 10/10 | Happy path + re-extraction path fully traced |
| 3 | Chaos & Failure | 10/10 | 8 error paths verified, 4 cleanup schedulers working |
| 4 | Firebase Cost | 10/10 | 3R + 5W per job, 8 indexes, ~$0 additional cost |
| 5 | CF Reliability | 10/10 | 5 CF exports, 540s timeout, 2GiB memory, secrets wired |
| 6 | Security | 10/10 | Auth + Firestore rules + rate limiting + sanitization |
| 7 | Code Readiness | 10/10 | March 2026 source audit passed; current launch status is governed by external certification gates |
| 8 | Data Integrity | 10/10 | 0 TS errors, schema validation, provenance tracking |

---

## Phase 1: System Consistency (10/10)

### Files Verified (20)

**Cloud Functions (15 files):**
- ✅ `functions/src/logic/parallelProcessingPrompt.ts` — Extraction prompt (v2)
- ✅ `functions/src/logic/processMenuImages.ts` — Main AI processing (batch, upload, scoring)
- ✅ `functions/src/logic/processMenuImagesJob.ts` — Job orchestration
- ✅ `functions/src/logic/aiResponseUtils.ts` — Response parsing, validation, normalization
- ✅ `functions/src/logic/extractionHardening.ts` — Category normalization, integrity, anomaly detection
- ✅ `functions/src/logic/redistributeUtils.ts` — Per-file data redistribution + sanitization
- ✅ `functions/src/logic/saveFilesToProject.ts` — Save to project with auto-merge
- ✅ `functions/src/constants/ai.ts` — Model config, batch settings, safety settings
- ✅ `functions/src/triggers/production.ts` — onDocumentCreated trigger
- ✅ `functions/src/dev-triggers.ts` — Dev-only callable
- ✅ `functions/src/triggers/shared.ts` — Shared callable (legacy path)
- ✅ `functions/src/triggers/schedulers.ts` — Cleanup schedulers
- ✅ `functions/src/schedulers/menuJobCleanup.ts` — 4 cleanup functions
- ✅ `functions/src/lib/circuitBreaker.ts` — Circuit breaker
- ✅ `functions/src/lib/rateLimit.ts` — Upstash rate limiting

**Client (3 files):**
- ✅ `src/lib/firebase/menuProcessing.ts` — Job creation, cancellation
- ✅ `src/hooks/useMenuProcessingJob.ts` — Real-time job status subscription
- ✅ `src/components/templates/main-app/projects/getProcessedFile.ts` — Entry point

**Types (2 files):**
- ✅ `functions/src/types/menuProcessingJob.types.ts`
- ✅ `functions/src/types/menuExtraction.types.ts`

### Constants Verified
- ✅ `DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS = "menuImageProcessingJobs"` (both frontend + backend)
- ✅ `EXTRACTION_PROMPT_VERSION = "parallel_v2"` (bumped this session)
- ✅ `AI_MODEL = "gemini-2.5-flash"`
- ✅ `tsc --noEmit` = 0 errors (both functions/ and main project)

---

## Phase 2: E2E Flow (10/10)

### Happy Path: First Extraction (Auto-Save)
```
Client: getProcessedFile.ts
  → checkExistingActiveJob() (prevent duplicates)
  → createMenuProcessingJob() (creates Firestore doc, status: pending)
  
Server: onDocumentCreated trigger fires
  → processMenuImagesJobLogic()
    → Step 1: Transaction → status: processing (idempotency check)
    → Step 2: processMenuImagesLogic()
      → Upload files to Gemini (parallel)
      → Chunk into batches of 10
      → Sequential batch processing with category continuation
      → Each batch: circuitBreaker → retry → Gemini → parse → validate
      → Merge batch results
      → Score quality
      → Record AI operation
    → Step 2b: hardenExtractedData() (non-blocking)
      → Category synonym normalization (~140 synonyms)
      → Semantic integrity validation
      → Anomaly detection
    → Step 3: Post-AI cancellation check
    → Step 4: Progress update (50%)
    → Step 5: Fetch project, detect first-vs-re-extraction
    → Step 6a: First extraction
      → processParallelResponse() (redistribute by sourceFileIndex + transform IDs)
      → saveFilesToProject() (auto-merge, stamp _extractedAt, languages merge)
      → computeConfidenceSummary()
      → Update job → status: completed (with provenance)

Client: useMenuProcessingJob hook
  → onSnapshot fires with isCompleted = true
  → Editor renders extracted data
```

### Re-Extraction Path (Preview + Review)
```
→ Step 6b: Re-extraction detected (existing items or linked outlet)
  → Write raw combined data to job doc
  → Set status: preview_ready, expiresAt: 24h TTL
  → Client handles comparison, review, and manual save
```

Both paths fully verified. ✅

---

## Phase 3: Chaos & Failure (10/10)

### Error Paths Verified (8)

| # | Scenario | Protection | Status |
|---|----------|-----------|--------|
| 1 | Job already processing | Transaction idempotency check | ✅ |
| 2 | AI batch failure | Only failed batch lost, others preserved | ✅ |
| 3 | Job processing error | Catches error → status: failed + error code | ✅ |
| 4 | Status update itself fails | Inner try/catch → CRITICAL log → cleanup scheduler catches via timeoutAt | ✅ |
| 5 | User cancellation | Post-AI check for `cancelling` → saves partial results | ✅ |
| 6 | Rate limit exceeded | Upstash Redis check before AI call → returns wait time | ✅ |
| 7 | Gemini API failures | Circuit breaker opens after 5 consecutive failures | ✅ |
| 8 | Transient errors | retryWithBackoff (2 retries, exponential) — skips 4xx/quota | ✅ |

### Cleanup Schedulers (4)

| Scheduler | Frequency | What It Catches |
|-----------|-----------|----------------|
| cleanupStuckJobs | Every 15 min | `processing` + `timeoutAt < now()` |
| cleanupExpiredPreviews | Every 15 min | `preview_ready` + `expiresAt < now()` |
| cleanupStuckCancelling | Every 15 min | `cancelling` + `updatedAt < 10 min ago` |
| cleanupOldJobs | Daily 3 AM | Terminal jobs > 7 days old (deletes) |

All `completedAt` set on every terminal status transition. ✅

---

## Phase 4: Firebase Cost (10/10)

### Per-Job Cost

| Operation | First Extraction | Re-Extraction |
|-----------|-----------------|---------------|
| Reads | 3 (idempotency + cancellation + project) | 2 (idempotency + cancellation) |
| Writes | 5 (processing + progress + project save + completed + AI operation) | 4 (processing + progress + preview_ready + AI operation) |

### Optimization Applied
- Existing project passed to `saveFilesToProject()` to avoid duplicate read (saves 1R)
- Single progress update instead of 3 separate ones (saves 2W)
- Hardening runs in-memory, no separate writes

### Indexes (8 composite indexes verified in firestore.indexes.json)
- `status + timeoutAt` — stuck jobs cleanup
- `status + expiresAt` — expired previews cleanup
- `status + updatedAt` — cancelling cleanup
- `status + completedAt` — old jobs cleanup + queries
- `status + createdAt` — job listing queries
- `projectId + status` — duplicate job check
- `tId + status` — tenant-scoped queries
- `sId + status + createdAt` — store-scoped queries

### Cost Estimate
- 50 extractions/month × 8 operations = 400 Firestore operations
- Negligible cost: < $0.01/month

---

## Phase 5: Cloud Functions Reliability (10/10)

### CF Exports Verified (5)

| Export | Type | Config | Guard |
|--------|------|--------|-------|
| `processMenuImagesJob` | onDocumentCreated | aiParallel (540s, 2GiB) | prod only |
| `dev_triggerProcessMenuImages` | onCall | aiParallel | `ensureDevEnvironment()` |
| `processMenuImages` | onCall (shared) | aiParallel | Input validation |
| `menulistMaintenanceScheduler.menu_stuck_cleanup` | onSchedule task (15min) | 1GiB parent scheduler | Per-task Firestore lease |
| `menulistMaintenanceScheduler.menu_old_cleanup` | onSchedule task (daily 3AM) | 1GiB parent scheduler | Per-task Firestore lease |

### Config: `FUNCTION_OPTIONS.aiParallel`
- **Region:** us-central1
- **Timeout:** 540s (9 min) — job timeout 10 min (buffer for cleanup)
- **Memory:** 2GiB
- **Secrets:** `SECRET_GROUPS.AI_WITH_RATE_LIMIT` (Gemini keys + Upstash)

### Safety Settings
All 4 harm categories set to `BLOCK_NONE` — critical for food menus with names like "Sex on the Beach", "Death by Chocolate". ✅

### Conditional Export
`isDeployed` check prevents prod triggers in emulator and dev callables in production. ✅

---

## Phase 6: Security (10/10)

### Authentication
- ✅ `getActiveSession()` required for job creation (client-side)
- ✅ Firestore rules enforce `uId == request.auth.uid` for read/write
- ✅ Create restricted to `status == 'pending'`
- ✅ Update restricted to `processing → cancelling` only
- ✅ Delete disabled (`false`)

### Rate Limiting
- ✅ Upstash Redis: 5 req/min per project (expensive AI)
- ✅ Checked in `processMenuImagesLogic()` before any AI call
- ✅ Returns wait time in error message

### Input Validation
- ✅ File URL: must be HTTPS or data URI
- ✅ Files array: must be non-empty
- ✅ targetLanguages: must be array

### Data Sanitization
- ✅ Server-side `stripHtml()` on all text fields
- ✅ Tag normalization (multilingual object → array)
- ✅ Response parsing handles BOM, markdown fences, invalid JSON
- ✅ `responseMimeType: 'application/json'` forces valid JSON from Gemini

### No Key Exposure
- ✅ Gemini API keys via Firebase secrets only
- ✅ No client-side AI keys

---

## Phase 7: Production Readiness (10/10)

### Feature Flags
- Core extraction: Always available (no flag — core feature)
- `ENABLE_EXTRACTION_MONITORING_DASHBOARD`: Gates ops UI (OFF)
- `ENABLE_CIRCUIT_BREAKER`: Gates circuit breaker behavior

### Environment Variables Required
- `GEMINI_AI_KEY` (+ _2, _3, _4 for rotation) — AI Gateway
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — Rate limiting

### Deploy Prerequisites
- `firebase deploy --only firestore:indexes` — 8 indexes for menuImageProcessingJobs
- CF deployment — production triggers + cleanup schedulers
- No additional manual setup

### Prompt Version
- `EXTRACTION_PROMPT_VERSION = "parallel_v2"` — updated this session
- Stored in every job result for debugging

---

## Phase 8: Data Integrity (10/10)

### Type Safety
- `tsc --noEmit` = **0 errors** on both functions/ and main project
- All interfaces defined: `MenuImageProcessingJob`, `ProcessMenuImagesRequest`, `ProcessMenuImagesResponse`, `ExtractedMenuData`, `ConfidenceSummary`

### Schema Validation Pipeline
```
AI Response (raw text/JSON)
  → parseAIResponseText() — BOM removal, markdown cleanup, JSON parse
  → validateResponseStructure() — required fields + types
  → normalizeResponseData() — ID strings, tag normalization, confidence normalization
  → hardenExtractedData() — synonym normalization, integrity, anomaly detection
  → redistributeExtractedData() — per-file split + sanitization
  → transformIdsForFile() — prefixed IDs for editor compatibility
```

### Provenance Tracking
- ✅ Raw AI responses preserved (truncated 10KB per batch)
- ✅ `promptVersion` + `model` stored in job result
- ✅ Enables future reprocessing and quality debugging

### Code-Doc Parity
- ✅ `ai-data-extraction_impl.md` matches actual file structure
- ✅ Updated this session with prompt v2 changes
- ✅ All file paths in docs verified against codebase

---

## Bugs Found & Fixed During Audit

| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 1 | `saveFilesToProject.ts` hardcoded `"projects"` instead of `DB_COLLECTIONS.PROJECTS` | LOW | Replaced with import from `../constants/database` |

**Total bugs: 1 (LOW severity, fixed immediately)**

---

## Final Historical Verdict: Code Audit GO

The AI Data Extraction feature passed this March 2026 code audit. This historical verdict does not certify current live production behavior; use the External Certification Runbook and production-readiness audit for launch approval.

### Strengths
- **Robust error handling:** 8 error paths, 4 cleanup schedulers, circuit breaker, retry logic
- **Cost efficient:** 3-5 reads + 4-5 writes per job, negligible cost
- **Well-structured:** Clean separation (prompt → processing → hardening → redistribution → save)
- **Observable:** Provenance tracking, quality scoring, confidence summaries, anomaly detection
- **Secure:** Auth + Firestore rules + rate limiting + sanitization

### No Blocking Issues
- All known issues documented in impl.md are feature-flagged OFF or P3 priority
- Monitoring dashboard has known Firestore rule issue but is gated by feature flag

---

_Audit completed: March 13, 2026_
_TypeScript verification: 0 errors (functions/ + main project)_
_20 files audited, ~4,800 lines of code_
