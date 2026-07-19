# KB Generation Pipeline — Product Specification

> **Version:** 1.1.0
> **Last Updated:** 2026-07-18
> **Audience:** CEO, PM, Internal Platform Operations
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Executive Summary

### Goal

Enable platform administrators to generate structured knowledge base articles from raw source files (PDFs, documents, videos, images, websites) using AI, with human review and reconciliation before publishing.

### Scope

- Multi-file upload with progress tracking (drag-and-drop + paste support)
- AI-assisted article generation from source files (Cloud Function trigger)
- Job lifecycle management (pending → processing → needs_review → publishing → published)
- Human review of generated articles with content editing
- Article reconciliation for duplicates (replace existing, discard, keep both)
- Embedding generation on publish (768-dim vectors for RAG pipeline)
- Job history with detailed drawer view
- Real-time job status updates via Firestore listener

### Out of Scope

- Automated publishing (all generated content requires human review)
- Scheduled generation jobs
- Multi-language article generation
- Article quality scoring during generation
- Source file version tracking

---

## 2. Pipeline Stages

### Stage 1: Upload

- Platform admin uploads source files via drag-and-drop or paste
- Supported uploads: bounded documents/text plus image, audio, and video MIME types. Pasted URLs are stored as text evidence; this tool does not crawl or authenticate to them.
- Files uploaded to Firebase Storage: `ingestion_source_files/{tId}/{sId}/{uuid}-{filename}`
- Upload progress tracked per file with visual indicators
- Per job: 1-8 source objects, at most 10 MiB each and 40 MiB total
- Source uploads preserve file fidelity for generation and are tagged with Storage metadata for purpose and retention. Images and screenshots may contain hidden file metadata, so admins are warned at upload time to remove private customer data before adding them.

### Stage 2: Job Creation

- `addIngestionJob()` creates job document in `kb_generation_jobs` collection
- Job status: `pending`
- In development: manually triggers Cloud Function `triggerStartGeneration()`
- In production: Firestore onCreate trigger fires automatically

### Stage 3: AI Processing

- Cloud Function processes source files
- AI generates: categories, sections, articles with TipTap JSON content
- Categories stored as `IngestionJobCategoriesMap` on the job document
- Articles include a bounded list of the job source files; page-level fact attribution is not derived by this runtime
- Job status: `processing`

### Stage 4: Review

- Job status: `needs_review`
- Platform admin opens ReviewModal
- Reviews generated category/section/article structure
- Can edit article content before publishing
- If duplicate articles detected → triggers reconciliation

### Stage 5: Reconciliation

- `articlesToReview` array on job document
- Each article has reconciliation status: `unresolved`, `replace`, `discard`, `keep_both`
- ReconciliationModal shows side-by-side comparison with existing articles
- Admin decides per-article: replace existing, discard new, or keep both
- Only articles with status `unresolved` shown for review

### Stage 6: Publish

- Job status: `publishing`
- Final structure and reconciliation choices are validated transactionally
- New articles and generated FAQs are staged inactive in `kb_articles` and `answerlattice_faqs`
- Existing navigation and approved replacement articles remain live while required embeddings run
- Embedding generation is triggered only for articles whose current vector/version/source hash cannot be reused
- Job stores bounded `embeddingPendingArticleIds`, `embeddingCompletedArticleIds`, and `embeddingFailedArticleIds` sets plus display counters derived from those sets
- The job also stores bounded `replacementArticleIds`; replacements are not deleted during staging
- Job status becomes `published` only when every exact pending ID is completed for the current embedding run, the failed set is empty, and one final transaction activates articles/FAQs, switches `kb_categories`, deletes approved replacements, and writes freshness invalidation

### Stage 7: Embedding

- Every final article must hold a valid current 768-dimension vector; unchanged valid vectors are reused
- Embedding input: `Category: {cat}\nSection: {sec}\nTitle: {title}\nContent: {text}`
- Cloud Function `embedArticleWorker` processes embedding queue
- Uses `genrateEmbedding()` utility from Cloud Functions
- Every task carries the current `embeddingRunId`; missing or stale-run tasks are skipped, and article IDs outside the job cannot change job failure state
- Existing vectors are reusable only when model cache version, dimensions, non-zero finite values, and the normalized category/section/title/content source hash all match

---

## 3. Job Statuses

| Status         | Meaning                                    | Next Action        |
| -------------- | ------------------------------------------ | ------------------ |
| `pending`      | Job created, waiting for processing        | Auto → processing  |
| `processing`   | AI generating articles from source files   | Wait               |
| `needs_review` | Articles generated, awaiting human review  | Admin reviews      |
| `publishing`   | Approved articles being written + embedded | Wait               |
| `published`    | All articles published and embedded        | Done               |
| `failed`       | Processing error occurred                  | Admin investigates |
| `cancelled`    | Admin cancelled the job                    | Done               |

---

## 4. User Role

**Platform Administrator only** — This feature is not accessible to SMB owners.

**Can do:**

- Upload source files
- View active job status with progress indicators
- Review generated articles
- Resolve article duplicates
- View job history (completed/failed/cancelled)
- View job details in drawer (source files, generated content tree, metadata)
- Cancel active jobs
- Delete unpublished terminal/review jobs with recoverable draft and source-file cleanup

---

## 5. Real-Time Updates

Active jobs use Firestore `onSnapshot` listener via `useIngestionJobsListener` hook:

- Listens for jobs with status: pending, processing, needs_review, publishing
- Filtered by tenant + store
- Auto-updates UI when job status changes
- Shows processing progress (articles embedded / total)
- Shows publishing progress

---

## 6. Job Deletion (Reference-Aware Cleanup)

When a job is deleted (`deleteIngestionJob()`):

1. The caller must be a platform administrator and the job must be `needs_review`, `failed`, or `cancelled`. Published/active jobs and embedding-failed jobs are refused.
2. The job, every related article query, and every compatibility read are checked against exact positive-integer `pId`/`tId`/`sId` scope. Coercible or malformed legacy scope does not match.
3. A transaction rechecks job status and `modifiedOn`, refuses active deletion ownership, deletes only unpublished/inactive article drafts, and writes a bounded `deletionRun` lease to the retained job.
4. A bounded exact-workspace job inventory (maximum 100 rows) computes which current source paths are still referenced by another job. If the inventory is too large or malformed, deletion fails closed before claiming the job.
5. Unreferenced source objects are deleted idempotently; referenced objects are preserved with a bounded count-only diagnostic. Any acknowledged or thrown Storage failure leaves the job in a retryable failed `deletionRun` state.
6. A final transaction proves the same deletion-run ownership before deleting the job.

Published jobs and any job with a published/active article remain durable so `jobId` provenance cannot be orphaned. Category documents are not deleted by this DAL path; article publication owns category placement.

---

## 7. Risks & Open Questions

| #   | Item                                                                                                   | Status                                                                              |
| --- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| 1   | Deprecated `getIngestionJobs()` compatibility helper could read globally                              | ✅ RESOLVED — non-platform reads are tenant/store scoped; platform admins keep the administrative list path. |
| 2   | No retry mechanism for failed jobs                                                                     | ✅ RESOLVED — `retryJob()` DAL + UI button implemented                              |
| 3   | No job timeout (stuck in processing forever)                                                           | ✅ RESOLVED — Watchdog in hourly scheduler auto-fails after 30 min                  |
| 4   | Source files not cleaned up on job failure or cancellation                                            | By design — retry/audit evidence is retained. Explicit job deletion now reclaims only paths proven unreferenced by the bounded workspace inventory. |
| 5   | No progress granularity during processing stage                                                        | Status is binary (processing or not)                                                |
| 6   | Dev/prod behavior difference: dev manually triggers CF, prod uses Firestore trigger                    | By design — documented in code                                                      |
| 7   | Failed or stale embedding tasks could previously satisfy a counter-only finalizer                       | ✅ RESOLVED — durable pending/completed/failed ID sets, exact run identity, and set-based finalization prevent incomplete publication. |
| 8   | ReviewModal delete handlers are empty stubs (`onDeleteCategory`, `onDeleteSection`, `onDeleteArticle`) | ✅ RESOLVED — All three delete handlers implemented with confirmation dialogs       |
| 9   | New FAQs/navigation or replacement deletion could become visible before all required embeddings completed | ✅ RESOLVED — publish staging stays inactive and the finalizer performs one atomic visibility/navigation/replacement/freshness switch. |

---

## 8. Suggestions & Discussion Items

> Added during STEP 9C Production Readiness Clearance audit (2026-03-03)

### Bugs Fixed in This Audit

- Removed debug `console.log("categoriesData", ...)` from `ReviewModal.tsx`
- Removed 4x `console.error` calls from `ReviewModal.tsx`, `UploadModal.tsx`, `jobCard/index.tsx`, `reconciliation/index.tsx`
- Added missing `message` import in `KBGeneration/index.tsx`

### Improvements Implemented (2026-03-03)

1. ✅ **Job timeout watchdog:** Added to hourly scheduler — auto-fails jobs stuck in `processing` >30 min
2. ✅ **Retry mechanism:** `retryJob()` DAL + "Retry Job" button on failed job cards
3. ✅ **Cancel mechanism:** `cancelJob()` DAL + "Cancel" button on pending/processing cards
4. ✅ **Delete during review:** `handleDeleteCategory/Section/Article` handlers implemented in ReviewModal
5. ✅ **Article quality scoring:** `qualityScore` field added, calculated during generation (content length + structure + sources)
6. ✅ **Content freshness:** `lastReviewedOn` set on publish + embed for all articles

### Remaining Future Items

- **Answerlattice entity extraction:** Connect `extractEntitiesFromArticles` on publish when `ENABLE_ANSWERLATTICE_ONTOLOGY` is ON
- **Source file cleanup:** Failure and cancellation continue to retain sources. Explicit job deletion removes only source paths not referenced by another bounded exact-workspace job; shared references remain.
