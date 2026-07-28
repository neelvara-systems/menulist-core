# AI Data Extraction — Firebase Cost Tracking

**Feature:** OCR & Menu Extraction with Gemini AI
**Status:** Controlled owner testing ready; production deploy pending for the legacy callable hardening
**Last Updated:** July 15, 2026
**Priority:** HIGH — Every new project triggers this. Direct cost per user action.

---

## Summary

- **Collections Used:** `menuImageProcessingJobs`, `projects/{tId}/{sId}` (projectsData)
- **Storage Buckets:** Active uploads use `projects/files/{tId}/{sId}/{fileId}`. Legacy uploaded menu images may still exist under `MenuListAi/project/files/{timestamp}-{uid}`.
- **Cloud Functions:** `processMenuImagesJob` (onCreate trigger), `dev_triggerProcessMenuImages` (dev callable), `processMenuImages` (legacy callable, fails closed in code)
- **Estimated Monthly Cost:** **Medium** — Scales with number of new projects + re-extractions
- **Category Icon Defaults:** No extra Firebase operations. Icon defaults are applied in-memory during extraction finalization and saved with the existing project/job writes.

---

## Firestore Operations

### Reads

| Operation                          | Collection                         | Trigger                 | Frequency              | Docs Read    | Indexed?                     | Notes                                                                                                                                                                          |
| ---------------------------------- | ---------------------------------- | ----------------------- | ---------------------- | ------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Check existing active job          | `menuImageProcessingJobs`          | Before creating new job | Per extraction request | Bounded query | Yes (`projectId` + `uId` + `status`) | Protected admission and the client helper prevent duplicate processing for the owned project. File: `src/app/api/menu-extraction/jobs/route.ts`, `src/lib/firebase/menuProcessing.ts` |
| Listen to job status               | `menuImageProcessingJobs/{jobId}`  | After job creation      | Real-time (onSnapshot) | 1 per update | Direct doc                   | `useMenuProcessingJob` listens to one owned job document and unsubscribes on job-ID change or unmount. File: `src/hooks/useMenuProcessingJob.ts` |
| Read project data (Cloud Function) | `projects/{tId}/{sId}/{projectId}` | During processing       | Per extraction         | 1            | Direct doc                   | Cloud Function reads current project to merge extracted data. File: `functions/src/logic/saveFilesToProject.ts`                                                                |

### Writes

| Operation                      | Collection                         | Trigger                         | Frequency              | Docs Written | Fields                                   | Notes                                                                                                                                                                |
| ------------------------------ | ---------------------------------- | ------------------------------- | ---------------------- | ------------ | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create processing job          | `menuImageProcessingJobs`          | User clicks "Upload & Continue" | Per extraction request | 1            | Full job doc                             | `createMenuProcessingJob()`. Contains file URLs, projectId, fixed `image_processing` action, status, and canonical business context when available. Persisted project identity wins over the bounded legacy request fallback. File: `src/lib/firebase/menuProcessing.ts`                                                       |
| Update job status → processing | `menuImageProcessingJobs/{jobId}`  | Cloud Function start            | Per extraction         | 1            | status, startedAt, timeoutAt             | Cloud Function updates status via transaction. File: `functions/src/logic/processMenuImagesJob.ts`                                                                   |
| Update progress (50%)          | `menuImageProcessingJobs/{jobId}`  | After AI processing             | Per extraction         | 1            | progress, currentStep                    | Single progress update after AI completes (optimized from 3 separate writes).                                                                                        |
| Update job status → preview/completed | `menuImageProcessingJobs/{jobId}` | Cloud Function end | Per extraction | 1 | status, result, provenance | Authenticated owner uploads become `preview_ready`; extraction-only or explicitly eligible auto-save work may complete directly. |
| Record AI operation            | `MENULIST_AI_OPERATIONS`           | After extraction                | Per extraction         | 1            | Compact accounting/audit row by default | Cost tracking, token usage, response counts, message presence/length, and summarized file metadata. `AI_OPERATION_LOG_MODE="accounting_only"` avoids raw provider response storage; detailed-mode rows are pruned by `ai_operation_detail_cleanup` when the scheduler is deployed. File: `functions/src/logic/processMenuImages.ts` |
| Save extracted data to project | `projects/{tId}/{sId}/{projectId}` | Eligible auto-save only         | Per eligible extraction | 1           | files[].extractedData                    | Authenticated desktop/mobile owner uploads do not use this direct first-save path because the shared client requests review.                                         |
| Apply reviewed extraction      | `projects/{tId}/{sId}/{projectId}` | Owner approves preview          | Per review apply       | 1            | files/overrides                          | Single-store/master applies update the project directly after job ownership/status validation. Linked outlets route through `/api/projects/outlet-save` for server-side local-only ID and outlet-policy validation. |

### Deletes

| Operation                          | Collection                | Trigger                 | Frequency | Docs Deleted | Soft/Hard | Notes                                                                    |
| ---------------------------------- | ------------------------- | ----------------------- | --------- | ------------ | --------- | ------------------------------------------------------------------------ |
| Cleanup old terminal jobs (7d TTL) | `menuImageProcessingJobs` | `menulistMaintenanceScheduler.menu_old_cleanup` task | Daily 3AM | Up to 500    | Hard      | Deletes completed/failed/cancelled jobs older than 7 days inside the unified maintenance scheduler. |

---

## Firebase Storage

| Operation                    | Path Pattern                                 | Trigger              | Size           | Notes                                                                             |
| ---------------------------- | -------------------------------------------- | -------------------- | -------------- | --------------------------------------------------------------------------------- |
| Upload menu images           | `projects/files/{tId}/{sId}/{fileId}`        | User upload          | 1-5MB per file | JPEG 80% quality, scale 1.5x for PDF pages. Client-side conversion before upload. Legacy files may still exist under `MenuListAi/project/files/`. |
| Read images (Cloud Function) | Same path                                    | During AI processing | —              | Cloud Function reads uploaded images to send to Gemini.                           |

Reset clears the project's live `files[]` state but does not delete these Storage objects. This is intentional: duplicated projects and special-menu projections can share source URLs. Any active-prefix cleanup must first prove that no current or restorable project references the object, apply a grace period, and run as bounded work inside `menulistMaintenanceScheduler`.

---

## Cloud Functions

| Function                       | Trigger                                         | Frequency              | Duration                        | Memory | Notes                                                                                                                                                       |
| ------------------------------ | ----------------------------------------------- | ---------------------- | ------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `processMenuImagesJob`         | Firestore onCreate on `menuImageProcessingJobs` | Per extraction request | Variable; 540s timeout | 2GiB | Uses `FUNCTION_OPTIONS.aiParallel` with `maxInstances: 5`. Parallel provider-file upload, sequential extraction batches, and bounded job context. File: `functions/src/triggers/production.ts`, `functions/src/config/secrets.ts` |
| `dev_triggerProcessMenuImages` | Callable (dev only)                             | Dev testing            | Same as above                   | 2GiB   | Same logic, manually triggered. Not deployed to production. Dev wrapper logs bounded request context only. File: `functions/src/dev-triggers.ts`                                                           |
| `processMenuImages`            | Callable                                        | Compatibility only     | N/A                             | 2GiB   | Direct AI processing is disabled in code and returns `failed-precondition`; extraction must use the job queue. The June 11, 2026 `ecomsai` deploy blocker is historical evidence only; current retry evidence must use External Certification Gate 1 against `menulist-qa`, with production gated on QA evidence and explicit production deploy approval. |

---

## Security Rules Impact

- `menuImageProcessingJobs`: Write requires auth + tenant match. Read requires auth + own tenant.
- `projects`: Write requires auth + tenant isolation (`{tId}/{sId}`). Cloud Function uses admin SDK (bypasses rules).
- Storage: Active upload paths require auth, tenant/store path shape, and `belongsToStore(tId, sId)` on `projects/files/{tId}/{sId}/{fileId}`. Legacy `MenuListAi/project/files/*` paths deny direct client access because they cannot prove tenant/store ownership; retained objects require tokenized or server-mediated compatibility access.
- Rate limiting: protected admission uses the shared expensive-AI limit keyed by user, tenant, and store; the worker repeats the expensive-AI limit by project.
- Preview review apply/discard rejects missing jobs, non-`preview_ready` jobs, project mismatches, tenant/store mismatches, and user mismatches before updating project or job state.

---

## Cost Optimization Notes

### Current Optimizations

- **Duplicate prevention**: `checkExistingActiveJob()` prevents re-processing same files
- **Client-side PDF conversion**: PDF → images happens in browser (no Cloud Function cost for conversion)
- **Bounded batching**: Provider-file uploads can run in parallel; extraction batches run sequentially with at most 10 images per provider generation request.
- **Quality scoring**: Low-quality extractions flagged for manual review (prevents re-extraction loops)
- **Category icon defaults**: Deterministic in-memory enrichment; no extra reads, writes, or AI calls.

### Evidence-Triggered Changes

- Add monitoring summary documents only before automatic refresh or broader operator access.
- Revisit worker concurrency or add Cloud Tasks only after sustained queue-age or provider-throttling evidence.
- Shard project menu data only if real projects repeatedly reach the 700KB warning or 900KB hard block.
- Add active source cleanup only with global cross-project/outlet reference protection, a grace period, and measured orphan growth.

### Warnings: Expensive Patterns

- **Re-extraction**: Each re-extraction costs full Gemini API + Cloud Function runtime
- **Large PDFs**: More converted pages increase provider-file work and can require an additional extraction batch; the shared intake cap still applies.
- **onSnapshot listener**: One direct job-document listener remains active while its owner flow tracks that job; there is no collection listener or polling loop.
- **`MENULIST_AI_OPERATIONS` compact ledger retention**: 1 compact accounting/audit row per extraction is retained for platform cost review and traceability. Heavy response details are compacted by default and detailed-mode fields are pruned by `ai_operation_detail_cleanup` when the scheduler is deployed. See `firebase-cost-scalability-audit.md` for details.
- **Project document `files[]` array growth**: Approved additions can grow live editor data, but the 700KB warning, 900KB hard block, review-first owner path, and reset/create-new replacement keep writes controlled.

### Full Cost & Scalability Audit

See `firebase-cost-scalability-audit.md` (reconciled July 15, 2026) for current analysis covering:

- 10-area deep trace (reads, writes, document size, indexes, listeners, Functions, Storage, job queue, monitoring, and source-backed cost units)
- Source-backed cost units and evidence-triggered scale decisions
- 2 bugs found & fixed:
  - **CRITICAL:** `checkExistingActiveJob()` missing `uId` filter — Firestore security rules reject list queries without `uId == auth.uid`
  - Missing `MENULIST_AI_OPERATIONS` composite index
- Current, owner-pending, evidence-triggered, and rejected scale decisions

---

## Cost Measurement

Do not use a hardcoded per-1,000 estimate as target cost truth. Current billing depends on provider tokens, accepted file/page batches, actual Function duration, retained Storage bytes, Firestore operations, region, and current vendor pricing. Use target billing exports together with the bounded-operation map above and the platform extraction monitor.

---

## DAL Functions Used

| Function                    | File                                                                       | Operation Type           |
| --------------------------- | -------------------------------------------------------------------------- | ------------------------ |
| `createMenuProcessingJob`   | `src/lib/firebase/menuProcessing.ts`                                       | Protected API request    |
| `checkExistingActiveJob`    | `src/lib/firebase/menuProcessing.ts`                                       | Read (getDocs query)     |
| `useMenuProcessingJob`      | `src/hooks/useMenuProcessingJob.ts`                                       | Read (onSnapshot)        |
| `processMenuImagesJobLogic` | `functions/src/logic/processMenuImagesJob.ts`                              | Read + Write (admin SDK) |
| `updateProject`             | `src/database/projects/index.ts`                                           | Write (setDoc merge)     |

## API Routes & Their Firebase Impact

| Route                          | Method | Firebase Ops | Rate Limited?                           | Notes                                                                                                                                                                 |
| ------------------------------ | ------ | ------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/menu-extraction/jobs`    | POST   | Project/job reads + job write | Yes | Authenticates and normalizes scope, validates files/project/capacity, prevents duplicate active jobs, and creates the server-owned job. |
| Cloud Function (onCreate)      | —      | 1R + 4-5W    | N/A (server-side) | Reads project and writes processing/progress/result/accounting state. Authenticated owner uploads stop at `preview_ready`; approved project mutation is a separate review apply. |
