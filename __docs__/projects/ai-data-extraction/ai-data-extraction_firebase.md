# AI Data Extraction — Firebase Cost Tracking

**Feature:** OCR & Menu Extraction with Gemini AI  
**Status:** ✅ Production Ready  
**Last Updated:** May 2, 2026
**Priority:** HIGH — Every new project triggers this. Direct cost per user action.

---

## Summary

- **Collections Used:** `menuImageProcessingJobs`, `projects/{tId}/{sId}` (projectsData)
- **Storage Buckets:** `MenuListAi/project/files/{timestamp}-{uid}` (uploaded menu images)
- **Cloud Functions:** `processMenuImagesJob` (onCreate trigger), `dev_triggerProcessMenuImages` (dev callable)
- **Estimated Monthly Cost:** **Medium** — Scales with number of new projects + re-extractions
- **Category Icon Defaults:** No extra Firebase operations. Icon defaults are applied in-memory during extraction finalization and saved with the existing project/job writes.

---

## Firestore Operations

### Reads

| Operation                          | Collection                         | Trigger                 | Frequency              | Docs Read    | Indexed?                     | Notes                                                                                                                                                                          |
| ---------------------------------- | ---------------------------------- | ----------------------- | ---------------------- | ------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Check existing active job          | `menuImageProcessingJobs`          | Before creating new job | Per extraction request | 1-5          | Yes (`projectId` + `status`) | `checkExistingActiveJob()` prevents duplicate processing. File: `src/lib/firebase/menuProcessing.ts`                                                                           |
| Listen to job status               | `menuImageProcessingJobs/{jobId}`  | After job creation      | Real-time (onSnapshot) | 1 per update | Direct doc                   | `useMenuProcessingJob` hook. Reads on every status change (pending → processing → completed). File: `src/components/templates/main-app/projects/hooks/useMenuProcessingJob.ts` |
| Read project data (Cloud Function) | `projects/{tId}/{sId}/{projectId}` | During processing       | Per extraction         | 1            | Direct doc                   | Cloud Function reads current project to merge extracted data. File: `functions/src/logic/saveFilesToProject.ts`                                                                |

### Writes

| Operation                      | Collection                         | Trigger                         | Frequency              | Docs Written | Fields                                   | Notes                                                                                                                                                                |
| ------------------------------ | ---------------------------------- | ------------------------------- | ---------------------- | ------------ | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create processing job          | `menuImageProcessingJobs`          | User clicks "Upload & Continue" | Per extraction request | 1            | Full job doc                             | `createMenuProcessingJob()`. Contains file URLs, projectId, status, and optional `businessType` for deterministic category icon defaults. File: `src/lib/firebase/menuProcessing.ts`                                                       |
| Update job status → processing | `menuImageProcessingJobs/{jobId}`  | Cloud Function start            | Per extraction         | 1            | status, startedAt, timeoutAt             | Cloud Function updates status via transaction. File: `functions/src/logic/processMenuImagesJob.ts`                                                                   |
| Update progress (50%)          | `menuImageProcessingJobs/{jobId}`  | After AI processing             | Per extraction         | 1            | progress, currentStep                    | Single progress update after AI completes (optimized from 3 separate writes).                                                                                        |
| Update job status → completed  | `menuImageProcessingJobs/{jobId}`  | Cloud Function end              | Per extraction         | 1            | status, completedAt, results, provenance | Final status + extracted data + `rawBatchResponses[]` + `promptVersion` + `model` + `confidenceSummary`. Provenance piggybacked on existing write (zero extra cost). |
| Record AI operation            | `MENULIST_AI_OPERATIONS`           | After extraction                | Per extraction         | 1            | Full transaction object                  | Cost tracking, token usage. Written by CF `addAiOperation()`. File: `functions/src/logic/processMenuImages.ts`                                                       |
| Save extracted data to project | `projects/{tId}/{sId}/{projectId}` | After extraction                | Per extraction         | 1            | files[].extractedData                    | Merge update with extracted categories, item data, category icon defaults, prices, languages. Heavy write (~50KB).                                                   |

### Deletes

| Operation                          | Collection                | Trigger                 | Frequency | Docs Deleted | Soft/Hard | Notes                                                                    |
| ---------------------------------- | ------------------------- | ----------------------- | --------- | ------------ | --------- | ------------------------------------------------------------------------ |
| Cleanup old terminal jobs (7d TTL) | `menuImageProcessingJobs` | `menulistMaintenanceScheduler.menu_old_cleanup` task | Daily 3AM | Up to 500    | Hard      | Deletes completed/failed/cancelled jobs older than 7 days inside the unified maintenance scheduler. |

---

## Firebase Storage

| Operation                    | Path Pattern                                 | Trigger              | Size           | Notes                                                                             |
| ---------------------------- | -------------------------------------------- | -------------------- | -------------- | --------------------------------------------------------------------------------- |
| Upload menu images           | `MenuListAi/project/files/{timestamp}-{uid}` | User upload          | 1-5MB per file | JPEG 80% quality, scale 1.5x for PDF pages. Client-side conversion before upload. |
| Read images (Cloud Function) | Same path                                    | During AI processing | —              | Cloud Function reads uploaded images to send to Gemini.                           |

---

## Cloud Functions

| Function                       | Trigger                                         | Frequency              | Duration                        | Memory | Notes                                                                                                                                                       |
| ------------------------------ | ----------------------------------------------- | ---------------------- | ------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `processMenuImagesJob`         | Firestore onCreate on `menuImageProcessingJobs` | Per extraction request | 30-120s (depends on file count) | 2GiB   | Calls Gemini 2.5 Flash. Parallel upload, sequential batch processing. Hardening pipeline. Provenance tracking. File: `functions/src/triggers/production.ts` |
| `dev_triggerProcessMenuImages` | Callable (dev only)                             | Dev testing            | Same as above                   | 2GiB   | Same logic, manually triggered. Not deployed to production. File: `functions/src/dev-triggers.ts`                                                           |

---

## Security Rules Impact

- `menuImageProcessingJobs`: Write requires auth + tenant match. Read requires auth + own tenant.
- `projects`: Write requires auth + tenant isolation (`{tId}/{sId}`). Cloud Function uses admin SDK (bypasses rules).
- Storage: Upload requires auth. Path must match `MenuListAi/project/files/*`.
- Rate limiting: `checkExpensiveAILimit()` — 5 requests per minute per user.

---

## Cost Optimization Notes

### Current Optimizations

- **Duplicate prevention**: `checkExistingActiveJob()` prevents re-processing same files
- **Client-side PDF conversion**: PDF → images happens in browser (no Cloud Function cost for conversion)
- **Sequential processing**: Files processed one at a time (prevents Gemini rate limits)
- **Quality scoring**: Low-quality extractions flagged for manual review (prevents re-extraction loops)
- **Category icon defaults**: Deterministic in-memory enrichment; no extra reads, writes, or AI calls.

### Potential Optimizations

- **Batch Gemini calls**: If Gemini supports batch API, could reduce function runtime
- **Image compression before upload**: Smaller images = less Storage cost + faster Gemini processing
- **Job TTL**: Auto-cleanup old completed jobs after 30 days

### Warnings: Expensive Patterns

- **Re-extraction**: Each re-extraction costs full Gemini API + Cloud Function runtime
- **Large PDFs**: 10-page PDF = 10 Gemini calls = 10x cost per extraction
- **onSnapshot listener**: Real-time listener on job doc. If client stays open, reads accumulate (but minimal since job completes quickly)
- **`MENULIST_AI_OPERATIONS` unbounded growth**: 1 doc per extraction, no TTL/cleanup. See `firebase-cost-scalability-audit.md` for details.
- **Project document `files[]` array growth**: Appends never removed. Risk of 1MB limit at heavy re-upload frequency.

### Full Cost & Scalability Audit

See `firebase-cost-scalability-audit.md` (March 13, 2026) for comprehensive analysis covering:

- 10-area deep trace (reads, writes, doc size, indexes, listeners, CF, storage, job queue, monitoring, cost simulation)
- Cost simulation at 1K / 10K / 100K extractions/month
- 2 bugs found & fixed:
  - **CRITICAL:** `checkExistingActiveJob()` missing `uId` filter — Firestore security rules reject list queries without `uId == auth.uid`
  - Missing `MENULIST_AI_OPERATIONS` composite index
- 8 prioritized recommendations

---

## Cost Estimate (per 1000 extractions/month)

| Resource                          | Operations/month              | Unit Cost         | Monthly Cost     |
| --------------------------------- | ----------------------------- | ----------------- | ---------------- |
| Firestore Reads (job checks)      | 5,000                         | $0.06/100K        | $0.00            |
| Firestore Reads (onSnapshot)      | 3,000 (avg 3 updates/job)     | $0.06/100K        | $0.00            |
| Firestore Writes (job creation)   | 1,000                         | $0.18/100K        | $0.00            |
| Firestore Writes (status updates) | 3,000                         | $0.18/100K        | $0.01            |
| Firestore Writes (project data)   | 1,000                         | $0.18/100K        | $0.00            |
| Storage (uploads)                 | 3GB (avg 3MB × 1000)          | $0.026/GB         | $0.08            |
| Cloud Functions (processing)      | 1,000 invocations × 60s avg   | $0.40/M + compute | ~$0.50           |
| **Gemini API** (external)         | 3,000 calls (avg 3 files/job) | ~$0.001/call      | ~$3.00           |
| **Total**                         |                               |                   | **~$3.59/month** |

> **Note:** Gemini API cost dominates. Firebase costs are minimal. Cost scales linearly with extraction volume.

---

## DAL Functions Used

| Function                    | File                                                                       | Operation Type           |
| --------------------------- | -------------------------------------------------------------------------- | ------------------------ |
| `createMenuProcessingJob`   | `src/lib/firebase/menuProcessing.ts`                                       | Write (addDoc)           |
| `checkExistingActiveJob`    | `src/lib/firebase/menuProcessing.ts`                                       | Read (getDocs query)     |
| `useMenuProcessingJob`      | `src/components/templates/main-app/projects/hooks/useMenuProcessingJob.ts` | Read (onSnapshot)        |
| `processMenuImagesJobLogic` | `functions/src/logic/processMenuImagesJob.ts`                              | Read + Write (admin SDK) |
| `updateProject`             | `src/database/projects/index.ts`                                           | Write (setDoc merge)     |

## API Routes & Their Firebase Impact

| Route                          | Method | Firebase Ops | Rate Limited?                           | Notes                                                                                                                                                                 |
| ------------------------------ | ------ | ------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N/A (client-side job creation) | —      | 1R + 1W      | Yes (5/min via `checkExpensiveAILimit`) | Job created directly from client via Firebase SDK                                                                                                                     |
| Cloud Function (onCreate)      | —      | 1R + 4-5W    | N/A (server-side)                       | Reads project, writes status (transaction) + progress + completion + aiOperation. Re-extraction: 4W (no project write). First extraction: 5W (includes project save). |
