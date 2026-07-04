# KB Generation Pipeline — Technical Implementation Blueprint

> **Version:** 1.0.0
> **Last Updated:** 2026-06-29
> **Audience:** Developers
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Architecture Overview

The KB Generation Pipeline is a **hybrid client + Cloud Functions feature**:
- **Client-side:** Upload UI, job management, review UI, reconciliation UI (Firestore client SDK via DAL)
- **Cloud Functions:** AI processing (Firestore triggers), article embedding (task queue workers)
- **Real-time:** Firestore `onSnapshot` for active job status tracking

---

## 2. Complete File Map

### 2.1 UI Components

**Root:** `src/components/templates/platform/KBGeneration/`

| File | Lines | Purpose |
|------|:-----:|---------|
| `index.tsx` | 155 | Main dashboard — Shows active job (via `useIngestionJobsListener`), upload button, job history. Handles review/reconciliation modal flow. Lazy-loads job history on demand. |
| `UploadModal.tsx` | 170 | Multi-file upload — Drag-and-drop + paste support. Files uploaded to `ingestion_source_files/{tId}/{sId}/{uuid}-{filename}`. Per-file progress tracking. Creates `addIngestionJob()` after upload. Dev: manually triggers CF. |
| `ReviewModal.tsx` | — | Article review interface — Shows generated categories/sections/articles for admin approval |

**Job Card:** `jobCard/`

| File | Purpose |
|------|---------|
| `index.tsx` | Job status card — Shows status, source files, progress indicators |
| `JobProcessingProgress.tsx` | Processing stage progress (articles being generated) |
| `JobPublishingProgress.tsx` | Publishing stage progress (articles embedded count / total) |
| `jobStatusTag.tsx` | Status badge with color coding per `getIngestionJobStatusData()` |

**Job History:** `jobHistory/`

| File | Purpose |
|------|---------|
| `index.tsx` | History list of completed/failed/cancelled jobs |
| `JobDetailsDrawer.tsx` | Full job details in side drawer |
| `JobDetailItem.tsx` | Detail row component |
| `JobDetailsSection.tsx` | Detail section grouping |
| `JobPreviewCard.tsx` | Job preview card for history list |
| `JobActionMenu.tsx` | Actions dropdown (view, delete) |
| `GeneratedContentTree.tsx` | Tree view of generated categories/sections/articles |

**Reconciliation:** `reconciliation/`

| File | Purpose |
|------|---------|
| `index.tsx` | Reconciliation dashboard for duplicate articles |
| `ComparisonView.tsx` | Side-by-side comparison of new vs existing article |
| `ReconciliationArticleCard.tsx` | Individual article comparison card |
| `ArticleMetadata.tsx` | Article metadata display for comparison |

KB source-file links in the active job card, job details drawer, and reconciliation metadata open in a new tab with `noopener,noreferrer`, check the returned browser window, and log `answerlattice_kb_source_open_failed` if the browser blocks or rejects the handoff. Diagnostics use bounded job/article/source URL/name/type presence-length metadata only, and the UI shows fixed `Unable to open source` copy. This is a browser-handoff boundary only; it does not change source upload, job processing, article reconciliation, or publish behavior.

KB job status rendering is shared through `getIngestionJobStatusData()` in the active job card, status tag, history preview card, and job details drawer. That shared map covers the seven persisted `INGESTION_JOB_STATUS` values, including `cancelled`. Each renderer keeps an `Unknown` fallback so malformed or older status strings do not crash the job history or detail views.

The active job card and processing progress component must not keep commented test-only progress or status override code. Runtime progress and status displays come only from the persisted `IngestionJob` fields, and the progress component bounds malformed or missing article counts before computing percentage text.

### 2.2 Database Layer

**File:** `src/database/kb-generation/jobs.ts`

| Function | Reads | Writes | Notes |
|----------|:-----:|:------:|-------|
| `getIngestionJobs()` | N | 0 | Deprecated compatibility helper; non-platform callers are filtered by tenant/store, platform admins can read the administrative list |
| `getIngestionJobCollectionRef(session)` | 0 | 0 | Returns query ref with tId + sId + active status filter |
| `getPreviousIngestionJobs(session)` | N | 0 | Completed/failed/cancelled for tenant |
| `updateJob(jobId, data)` | 0 | 1 | Merge update; returns acknowledged `{ success, id, updatedFields }` |
| `deleteIngestionJob(jobId)` | 1+N | 1+N+storage | Transaction: delete job + articles + categories + storage files; returns acknowledged `{ success, jobId, deleted }` |
| `retryJob(jobId)` | 1 | 1 | Resets failed job to pending; returns acknowledged job write |
| `cancelJob(jobId)` | 0 | 1 | Marks job cancelled; returns acknowledged job write |
| `addIngestionJob(data)` | 0 | 1 | Creates job and returns acknowledged job write. Dev: calls `triggerStartGeneration()`. Prod: Firestore trigger fires. |

### 2.3 Cloud Functions

| File | Trigger | Purpose |
|------|---------|---------|
| `functions/src/logic/embedArticleWorker.ts` | Task queue | Re-embeds articles when category/section titles change. Reads article, generates embedding via `genrateEmbedding()`, updates article + increments job counter. |
| `functions/src/logic/regenerateEmbedding.ts` and `functions-answerlattice/src/logic/regenerateEmbedding.ts` | HTTPS callable | Re-generates embedding for single article by ID. Uses `FieldValue.vector()` for storage. |
| `functions/src/triggers/shared` | Firestore triggers | `embedArticleWorker`, `processMenuImages`, `publishApprovedJobFn`, `regenerateEmbedding` — exported from index.ts |

Client callable failures from `src/lib/firebase/functions.ts` use bounded secure diagnostics. `regenerateEmbedding` and `publishApprovedJobFn` failures record normalized `answerlattice_regenerate_embedding_callable_failed` / `answerlattice_publish_approved_job_callable_failed` codes with bounded article/job metadata and source error name/code/status only. The wrapper keeps the existing generic caller-facing errors and does not log raw Firebase callable/provider errors or publish payload contents.

Server callable, task worker, and publish finalizer failures in the shared/local Functions tree and the separate `functions-answerlattice/` tree use stable `ANSWERLATTICE_REGENERATE_EMBEDDING_*`, `ANSWERLATTICE_PUBLISH_APPROVED_JOB_*`, `ANSWERLATTICE_EMBED_ARTICLE_WORKER_*`, and `ANSWERLATTICE_FINALIZE_PUBLISH_*` codes with bounded article/job ID length and source error metadata only. Failed approved-job records keep the existing `errorMessage` field but store fixed `Publishing failed` / `Finalize publish failed` text.

Shared production and dev trigger wrappers for KB generation/finalization log bounded job/request context only. `functions/src/triggers/production.ts` uses `FUNCTIONS_PRODUCTION_TRIGGER_DATA_MISSING` for missing event snapshots, and `functions/src/dev-triggers.ts` uses fixed dev-trigger failure codes without logging raw job IDs or request payloads.

The lower KB generation and embedding layer is bounded as well. `functions/src/logic/startGeneration.ts` stores fixed `Knowledge generation failed` text on failed jobs, `functions/src/utils/aiUtils.ts` and `functions-answerlattice/src/utils/aiUtils.ts` log stable generation/upload/embedding/similar-article failure codes, and shared/separate KB task/callable wrappers log ID lengths and caller metadata lengths only. Generated KB payloads, raw AI response text, provider exception messages, raw article/job IDs, raw temp paths, and raw callable caller IDs are not logged or persisted as diagnostics.

`JobDetailsDrawer.tsx` renders source files only from the persisted `job.sourceFiles` array. It must not retain dummy icon-review source arrays or temporary preview blocks in the active drawer module, because the same component is mounted in both platform and Answerlattice KB generation routes. The Job ID copy action uses the shared Answerlattice support clipboard helper, waits for Clipboard API success or acknowledged textarea fallback success, and logs `answerlattice_kb_job_id_copy_failed` with bounded job/status/support metadata only before fixed failure copy; raw job IDs are not logged.

### 2.4 Hooks

| File | Purpose |
|------|---------|
| `src/hooks/useIngestionJobsListener.ts` | Real-time Firestore listener for active jobs. Filters: `tId + sId + status in [pending, processing, needs_review, publishing]`. Returns `activeJob` object. |

### 2.5 Types (from `src/types/knowledgeBase.ts`)

- `IngestionJob` — Full job with status, sourceFiles, categories, articlesToReview, embedding counts
- `IngestionJobCategory` — Category within job (id, title, description, active, sections[], articles[])
- `IngestionJobSection` — Section within job category
- `IngestionJobArticle` — Article within job (id, title, content as TipTap JSON, reEmbedding flag, optional `generatedFaqs`)
- `IngestionJobSourceFile` — Uploaded file metadata (storagePath, fileName, type, gsUri, downloadURL)
- `IngestionJobArticleToReview` — Reconciliation item (id, title, status, similarArticles[])
- `IngestionJobCategoriesMap` — `Record<string, IngestionJobCategory>`
- `INGESTION_JOB_STATUS` — 7 statuses: pending, processing, needs_review, publishing, published, failed, cancelled
- `ARTICLE_RECONCILIATION_STATUS` — 4 states: unresolved, replace, discard, keep_both

---

## 3. Data Flow

### 3.1 Upload → Job Creation
```
UploadModal.handleStartGeneration()
  → Validate fileList.length > 0
  → Upload each file to Firebase Storage:
    → Path: ingestion_source_files/{tId}/{sId}/{uuid}-{filename}
    → uploadFile() with progress callback and Storage metadata for source use, retention, and image metadata policy
  → addIngestionJob({ sourceFiles: uploadedFiles, status: 'pending' })
    → requestBodyComposer injects tId, sId, uId, timestamps
    → addDoc to kb_generation_jobs
    → assertIngestionJobWriteSucceeded()
    → [Dev only] triggerStartGeneration(jobId, job) — manually calls Cloud Function
    → [Prod] Firestore onCreate trigger fires automatically
```

### 3.2 AI Processing (Cloud Function)
```
Firestore trigger: onCreate on kb_generation_jobs (status=pending)
  → Read source files from Firebase Storage (gsUri paths)
  → AI processes files → generates categories/sections/articles
  → Update job: status='processing', then status='needs_review'
  → Store generated content in job.categories field
  → Store up to 5 source-backed FAQ suggestions per article in `generatedFaqs`
  → If duplicate articles detected: populate job.articlesToReview
```

### 3.3 Review + Reconciliation

Review category, section, article, and duplicate-resolution edits call `updateJob()` and must require `assertIngestionJobWriteSucceeded()` before local review state, modal close, or success copy advances. Job-card delete/retry/cancel and job-history delete actions must require `assertIngestionJobWriteSucceeded()` or `assertIngestionJobDeleteSucceeded()` before success copy. Rejected acknowledgement codes use the `kb_generation_*_rejected` pattern and are guarded by `npm run verify:answerlattice-runtime-truth`.
```
KBGenerationTemplate detects activeJob.status === 'needs_review'
  → Check articlesToReview for unresolved items
  → If unresolved: show ReconciliationModal first
    → Admin resolves each: replace / discard / keep_both
  → Then: show ReviewModal
    → Admin reviews generated content and optional FAQ suggestions
    → Can edit articles before publishing
    → Approve → publish
```

### 3.4 Publish + Embed
```
Publish approved
  → Job status: 'publishing'
  → Articles written to kb_articles collection
  → Generated FAQs written to answerlattice_faqs and mirrored to kb_articles.faqIds
  → Article metadata synced to kb_categories document
  → Each article queued for embedding generation
  → embedArticleWorker processes queue:
    → Read article content
    → genrateEmbedding() → text-embedding-004
    → Update article with embedding vector
    → Increment job.articlesEmbeddedCount
  → When articlesEmbeddedCount === articlesToEmbedCount:
    → Job status: 'published'
```

### 3.5 Job Deletion (Cascade)
```
deleteIngestionJob(jobId)
  → Firestore transaction:
    1. Read job document
    2. Remove job categories from master kb_categories/categories doc
    3. Query all articles with jobId → delete each
    4. Delete job document
  → Post-transaction: delete source files from Storage
```

---

## 4. Storage Paths

| Purpose | Path Pattern | Lifecycle |
|---------|-------------|-----------|
| Source files | `ingestion_source_files/{tId}/{sId}/{uuid}-{filename}` | Deleted on job delete |
| Generated articles | Written to `kb_articles` collection (no storage) | Deleted on job delete |

---

## 5. Identified Issues

| # | Issue | Severity | File:Line | Notes |
|---|-------|----------|-----------|-------|
| 1 | Deprecated `getIngestionJobs()` compatibility helper could read globally | Resolved | `jobs.ts` | Non-platform reads are tenant/store scoped; platform admins keep the administrative list path |
| 2 | Dev/prod behavior difference in `addIngestionJob` | Low | `jobs.ts:140` | Dev manually triggers CF, prod uses Firestore trigger |
| 3 | No job timeout/retry for stuck processing | Medium | — | Job could stay in `processing` forever |
| 4 | Source files not cleaned up on failure | Low | — | Only deleted on explicit job delete |
| 5 | `console.error` used instead of `secureError` | Low | `index.tsx:72` | Debug logging |
| 6 | No pagination on job history | Low | `getPreviousIngestionJobs` | Fetches all completed jobs |

---

## 6. Reverse Engineering Validation

| Category | Count | Verified |
|----------|:-----:|:--------:|
| UI components | 21 | ✅ |
| DAL functions | 5 (+1 query ref) | ✅ |
| Cloud Functions | 2 | ✅ |
| Hooks | 1 | ✅ |
| Types | 9 interfaces + 3 constants | ✅ |
| **Total** | **30+ items** | **✅ 100%** |
