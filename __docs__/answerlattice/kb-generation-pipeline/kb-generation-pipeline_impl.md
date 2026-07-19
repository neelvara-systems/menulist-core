# KB Generation Pipeline — Technical Implementation Blueprint

> **Version:** 1.4.0
> **Last Updated:** 2026-07-18
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

Answerlattice KB generation session lookup diagnostics (July 5, 2026): deprecated `getIngestionJobs()` compatibility reads no longer collapse thrown `getActiveSession()` failures silently. Failed session lookup logs `answerlattice_kb_generation_session_lookup_failed` with bounded operation metadata, and the compatibility helper keeps the existing fail-closed non-platform behavior rather than widening into global job reads.

### 2.2 Database Layer

**File:** `src/database/kb-generation/jobs.ts`

| Function | Reads | Writes | Notes |
|----------|:-----:|:------:|-------|
| `getIngestionJobs()` | N | 0 | Deprecated compatibility helper; non-platform callers are filtered by tenant/store, platform admins can read the administrative list |
| `getIngestionJobCollectionRef(session)` | 0 | 0 | Returns query ref with tId + sId + active status filter |
| `getPreviousIngestionJobs(session)` | N | 0 | Completed/failed/cancelled for tenant |
| `updateJob(jobId, data)` | 1 | 1 | Transactionally updates bounded article-ID/reconciliation fields only; returns acknowledged `{ success, id, updatedFields }` |
| `updateReviewJobNavigation(jobId, operation, mutate)` | 1 | 1 | Applies a deterministic operation to transaction-current review navigation and returns the authoritative categories map |
| `deleteIngestionJob(jobId)` | `3+W+N` | `2+N` on success | Platform-only exact-scope cleanup for unpublished safe states. `W <= 100` workspace jobs are inventoried; unreferenced sources are deleted, shared references are preserved, cleanup failure remains retryable, and final job deletion requires the same `deletionRun`. |
| `retryJob(jobId)` | 1 | 1 | Resets failed job to pending; returns acknowledged job write |
| `cancelJob(jobId)` | 0 | 1 | Marks job cancelled; returns acknowledged job write |
| `addIngestionJob(data)` | 0 | 1 | Creates job and returns acknowledged job write. Dev: calls `triggerStartGeneration()`. Prod: Firestore trigger fires. |

### 2.3 Cloud Functions

The separate Answerlattice package exports the current lifecycle as six bounded entry points:

| Export | Trigger | Current contract |
| --- | --- | --- |
| `startGeneration` | Firestore create | Claims a pending generation job and starts source-backed generation. |
| `retryGeneration` | Firestore update | Restarts an explicitly retried failed generation without adding a second scheduler. |
| `finalizePublish` | Firestore update | Dispatches deterministic current-run tasks and finalizes only after the durable pending ID set is fully represented by the completed set with no failures. |
| `embedArticleWorker` | Cloud Task | Uses deterministic task identity, retry count, a typed embedding lease conflict, and bounded final-attempt failure state. |
| `regenerateEmbedding` | HTTPS callable | Reuses the shared article embedding lease/persistence helper for one article. |
| `publishApprovedJobFn` | HTTPS callable | Validates reviewed output, stages articles and deterministic FAQ IDs inactive, records replacement IDs, and starts the embedding run without changing live navigation. |
| `answerlatticeNightly` -> `expireStaleAnswerlatticeGenerationJobs` | Existing scheduled function | Scans at most 10 processing jobs older than 30 minutes in the dedicated project, rejects malformed/cross-product scope, transactionally revalidates staleness, and settles the matching generation run as failed. |

`functions-answerlattice/src/logic/embeddingSourceBoundary.ts` defines the normalized category/section/title/content input and source hash. `articleEmbedding.ts` owns the lease, provider call, vector validation, and transactional persistence. `kbPublishingLifecycle.ts` strictly parses bounded durable ID sets, dispatches deterministic task IDs, and owns the atomic publication switch: it revalidates the persisted final structure, verifies every staged article and embedding, activates articles and generated FAQs, updates navigation, deletes approved replacements, publishes the job, and bumps cache/source/bundle versions in one transaction. The task queue has three total attempts; only the final or a permanent failure settles terminal failure state. A current-run task must carry the exact run ID, and an article outside the pending set cannot poison the job.

The pre-launch canonical embedding registry is `gemini-embedding-2`, 768 dimensions, cache version `gemini-embedding-2:768:v1`, and Firestore field `embedding`. The same registry file is mirrored byte-for-byte into the root app, shared Functions compatibility tree, and dedicated Answerlattice Functions. Document and query formatting omit the old `taskType` option, and query-cache keys include the registry cache version. New or changed articles write exactly one canonical vector. There is no legacy model, dual-write path, corpus backfill task, migration-state document, or second vector index because no launched corpus requires migration.

| File | Trigger | Purpose |
|------|---------|---------|
| `functions/src/logic/embedArticleWorker.ts` | Task queue | Shared-mode compatibility worker. Verifies product/workspace/job/run ownership, reuses or generates a validated embedding, and records durable completion. It does not make the article public; finalization owns visibility. |
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
    → completed upload + failed download-URL lookup deletes the exact UUID attempt before returning generic failure
  → addIngestionJob({ sourceFiles: uploadedFiles, status: 'pending' })
    → requestBodyComposer injects tId, sId, uId, timestamps
    → addDoc to kb_generation_jobs
    → assertIngestionJobWriteSucceeded()
    → [Dev only] triggerStartGeneration(jobId, job) — manually calls Cloud Function
    → [Prod] Firestore onCreate trigger fires automatically
```

The URL-resolution cleanup is safe only because every source object uses a fresh UUID path. Partial upload failure removes successful pre-job uploads. Once job persistence has been attempted, uploaded source files are retained because the Firestore outcome may be ambiguous and a durable job may reference them.

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

Review category, section, and article-navigation edits call `updateReviewJobNavigation()` and apply an immutable operation to the categories map read inside the Firestore transaction. Duplicate-resolution and article-ID edits continue through `updateJob()`. Every caller requires `assertIngestionJobWriteSucceeded()` before local review state, modal close, or success copy advances. Job-card delete/retry/cancel and job-history delete actions require `assertIngestionJobWriteSucceeded()` or `assertIngestionJobDeleteSucceeded()` before success copy. Rejected acknowledgement codes use the `kb_generation_*_rejected` pattern and are guarded by `npm run verify:answerlattice-runtime-truth`.

`updateJob()` accepts only `articleIds` and `articlesToReview`; it rejects caller-held `categories` snapshots. `updateReviewJobNavigation()` validates the stored map before applying the operation, validates the resulting map again, enforces bounded document IDs/strings/navigation nesting/duplicate IDs and a 700 KiB UTF-8 limit, and writes only while the job remains `needs_review` and has no deletion lease. The transaction may retry the pure operation against newer navigation, preventing concurrent review actions from silently replacing each other. `ReviewModal` adapts the staging navigation shape explicitly for the strict Knowledge Base panes and never JSON-clones Firestore-shaped data or mutates React state before persistence acknowledgement.

Job deletion is visible only for `needs_review`, `failed`, and `cancelled` active-card states and only for `failed`/`cancelled` history rows. The DAL remains authoritative: it refuses published or active article provenance, embedding-failed jobs, malformed or excessive source-file lists, stale `modifiedOn`, concurrent deletion ownership, and workspaces whose bounded job inventory cannot prove source references safely. Draft article deletion and the job's deletion lease are atomic. Source cleanup removes only paths not referenced by another exact-workspace job. A fulfilled Storage response with `success: false` is a failure; the retained job records a retryable failed deletion instead of being removed while source files remain.
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
  → Generated articles and deterministic generated FAQs are staged inactive
  → Final category/section/article IDs and reconciliation state are runtime-validated
  → Navigation URLs are derived from validated IDs; client-supplied paths are not persisted as authority
  → Generated FAQs are mirrored to kb_articles.faqIds with status needs_review and active=false
  → Existing kb_categories navigation and approved replacement articles remain live
  → Bounded replacementArticleIds are stored on the publishing job
  → Each article queued with deterministic Cloud Task identity for embedding generation
  → embedArticleWorker processes queue:
    → Claim or reject the typed embedding lease
    → Require the exact current embedding run and pending article membership
    → Hash the current embedding input and reuse only an exact current-version/dimension/hash vector, otherwise generate the configured vector
    → Transactionally persist only if the article/source hash still matches
    → Add the article ID to the durable completed set and remove it from the failure set; do not activate it
  → Firestore finalizer validates durable sets:
    → every pending ID completed and no failed IDs → revalidate final navigation and every article
    → atomically activate articles/FAQs, switch navigation, delete approved replacements, publish job, and bump KB/source/bundle versions
    → terminal embedding failure → job stays failed with fixed bounded copy
```

### 3.5 Job Deletion (Cascade)
```
deleteIngestionJob(jobId)
  → Require platform access, exact Answerlattice scope, and a safe unpublished terminal/review state
  → Read at most 100 exact-workspace jobs and build a path-level reference inventory
  → Query bounded exact-scope job articles and refuse any published/active provenance
  → Transactionally claim a deletion lease and delete only unpublished article drafts
  → Delete only source files not referenced by another workspace job; preserve shared references
  → Inspect thrown plus acknowledged-failure Storage results
  → On cleanup failure: retain the job with retryable failed deletion state
  → On success: transactionally prove operation ownership and delete the job
```

---

## 4. Storage Paths

| Purpose | Path Pattern | Lifecycle |
|---------|-------------|-----------|
| Source files | `ingestion_source_files/{tId}/{sId}/{uuid}-{filename}` | Retained on failure/cancellation; explicit job delete removes paths proven unreferenced and preserves shared paths |
| Generated articles | Written to `kb_articles` collection (no storage) | Deleted on job delete |

---

## 5. Identified Issues

| # | Issue | Severity | File:Line | Notes |
|---|-------|----------|-----------|-------|
| 1 | Deprecated `getIngestionJobs()` compatibility helper could read globally | Resolved | `jobs.ts` | Non-platform reads are tenant/store scoped; platform admins keep the administrative list path |
| 2 | Dev/prod behavior difference in `addIngestionJob` | Low | `jobs.ts:140` | Dev manually triggers CF, prod uses Firestore trigger |
| 3 | No job timeout/retry for stuck processing | Resolved | dedicated Answerlattice scheduler + `retryJob()` | Stuck exact-scope jobs are transactionally failed by the bounded watchdog and can be retried through the lifecycle; the MenuList scheduler records only a migrated/skipped compatibility task |
| 4 | Source files retained on failure/cancellation | Low | — | Intentional for retry/audit; explicit job deletion uses bounded reference-aware cleanup |
| 5 | Raw server/provider diagnostics could leak payload context | Resolved | shared + dedicated Functions | Stable codes and bounded metadata only |
| 6 | Job history could grow without a read bound | Resolved | `getPreviousIngestionJobs` | Query is ordered and capped |

---

## 6. Reverse Engineering Validation

| Category | Count | Verified |
|----------|:-----:|:--------:|
| UI components | 21 | ✅ |
| DAL functions | 5 (+1 query ref) | ✅ |
| Cloud Functions lifecycle | 6 exported entry points plus shared helpers | ✅ |
| Hooks | 1 | ✅ |
| Types | 9 interfaces + 3 constants | ✅ |
| **Overall** | **Current paths and contracts above** | **✅ Source checked** |

---

## 7. Version History

| Date | Version | Change |
| --- | --- | --- |
| 2026-07-18 | 1.4.0 | Added bounded cross-job source-reference cleanup and moved article/FAQ visibility, navigation replacement, replacement deletion, job publication, and freshness invalidation into one final transaction. |
| 2026-07-17 | 1.3.0 | Simplified the pre-launch Embedding 2 runtime to one canonical field/cache/index and removed migration-only reads, writes, provider calls, and scheduler work. |
| 2026-07-13 | 1.2.0 | Added the initial Embedding 2 direction; the temporary migration design was superseded before launch. |
| 2026-07-11 | 1.1.0 | Aligned the separate Answerlattice generation/publish/embedding lifecycle, typed embedding leases, deterministic task/FAQ identity, retry settlement, and finalizer behavior to current Functions source. |
| 2026-07-05 | 1.0.0 | Initial codebase forensic blueprint. |
