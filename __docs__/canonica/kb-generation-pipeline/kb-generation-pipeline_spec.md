# KB Generation Pipeline — Product Specification

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Audience:** CEO, PM, Clients
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Executive Summary

### Goal

Enable platform administrators to generate structured knowledge base articles from raw source files (PDFs, documents, videos, images, websites) using AI, with human review and reconciliation before publishing.

### Scope

- Multi-file upload with progress tracking (drag-and-drop + paste support)
- AI-powered article generation from source files (Cloud Function trigger)
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
- Supported types: PDF, Image, Video, Audio, Document, Website URL, YouTube URL, Google Drive, Copied Text
- Files uploaded to Firebase Storage: `ingestion_source_files/{tId}/{sId}/{uuid}-{filename}`
- Upload progress tracked per file with visual indicators
- No file count limit (multiple files per job)

### Stage 2: Job Creation

- `addIngestionJob()` creates job document in `kb_generation_jobs` collection
- Job status: `pending`
- In development: manually triggers Cloud Function `triggerStartGeneration()`
- In production: Firestore onCreate trigger fires automatically

### Stage 3: AI Processing

- Cloud Function processes source files
- AI generates: categories, sections, articles with TipTap JSON content
- Categories stored as `IngestionJobCategoriesMap` on the job document
- Articles include source provenance (which file, which page)
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
- Articles written to `kb_articles` collection
- Article metadata synced to `kb_categories` parent document
- Embedding generation triggered per article
- Job tracks: `articlesToEmbedCount` and `articlesEmbeddedCount`
- Job status: `published` when all embeddings complete

### Stage 7: Embedding

- Each published article gets a 768-dimension vector embedding
- Embedding input: `Category: {cat}\nSection: {sec}\nTitle: {title}\nContent: {text}`
- Cloud Function `embedArticleWorker` processes embedding queue
- Uses `genrateEmbedding()` utility from Cloud Functions

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
- Delete jobs (with cascade: removes articles + categories + storage files)

---

## 5. Real-Time Updates

Active jobs use Firestore `onSnapshot` listener via `useIngestionJobsListener` hook:

- Listens for jobs with status: pending, processing, needs_review, publishing
- Filtered by tenant + store
- Auto-updates UI when job status changes
- Shows processing progress (articles embedded / total)
- Shows publishing progress

---

## 6. Job Deletion (Cascade)

When a job is deleted (`deleteIngestionJob()`):

1. **Transaction:** Remove job categories from master `kb_categories` document
2. **Transaction:** Delete all articles associated with this jobId from `kb_articles`
3. **Transaction:** Delete the job document itself
4. **Post-transaction:** Delete source files from Firebase Storage

This ensures no orphaned articles or categories remain.

---

## 7. Risks & Open Questions

| #   | Item                                                                                                   | Status                                                                              |
| --- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| 1   | `getIngestionJobs()` fetches ALL jobs with no tenant filter                                            | Dead code — never called. Harmless but should be removed or scoped.                 |
| 2   | No retry mechanism for failed jobs                                                                     | ✅ RESOLVED — `retryJob()` DAL + UI button implemented                              |
| 3   | No job timeout (stuck in processing forever)                                                           | ✅ RESOLVED — Watchdog in hourly scheduler auto-fails after 30 min                  |
| 4   | Source files not cleaned up on job failure                                                             | By design — preserves files for retry. Cleaned on delete/cancel.                    |
| 5   | No progress granularity during processing stage                                                        | Status is binary (processing or not)                                                |
| 6   | Dev/prod behavior difference: dev manually triggers CF, prod uses Firestore trigger                    | By design — documented in code                                                      |
| 7   | `embedArticleWorker` increments counter on error — failed embeddings count as "done"                   | Risk: job marked "published" with missing embeddings. Low frequency mitigates risk. |
| 8   | ReviewModal delete handlers are empty stubs (`onDeleteCategory`, `onDeleteSection`, `onDeleteArticle`) | ✅ RESOLVED — All three delete handlers implemented with confirmation dialogs       |

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

- **Canonica entity extraction:** Connect `extractEntitiesFromArticles` on publish when `ENABLE_CANONICA_ONTOLOGY` is ON
- **Source file cleanup:** Not on failure (preserves retry). Only on explicit delete/cancel.
