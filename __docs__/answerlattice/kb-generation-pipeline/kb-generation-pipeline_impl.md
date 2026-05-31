# KB Generation Pipeline — Technical Implementation Blueprint

> **Version:** 1.0.0
> **Last Updated:** 2026-05-24
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

### 2.2 Database Layer

**File:** `src/database/kb-generation/jobs.ts` (151 lines)

| Function | Reads | Writes | Notes |
|----------|:-----:|:------:|-------|
| `getIngestionJobs()` | N | 0 | ALL jobs, NO tenant filter |
| `getIngestionJobCollectionRef(session)` | 0 | 0 | Returns query ref with tId + sId + active status filter |
| `getPreviousIngestionJobs(session)` | N | 0 | Completed/failed/cancelled for tenant |
| `updateJob(jobId, data)` | 0 | 1 | Merge update |
| `deleteIngestionJob(jobId)` | 1+N | 1+N+storage | Transaction: delete job + articles + categories + storage files |
| `addIngestionJob(data)` | 0 | 1 | Creates job. Dev: calls `triggerStartGeneration()`. Prod: Firestore trigger fires. |

### 2.3 Cloud Functions

| File | Trigger | Purpose |
|------|---------|---------|
| `functions/src/logic/embedArticleWorker.ts` | Task queue | Re-embeds articles when category/section titles change. Reads article, generates embedding via `genrateEmbedding()`, updates article + increments job counter. |
| `functions/src/logic/regenerateEmbedding.ts` | HTTPS callable | Re-generates embedding for single article by ID. Uses `FieldValue.vector()` for storage. |
| `functions/src/triggers/shared` | Firestore triggers | `embedArticleWorker`, `processMenuImages`, `publishApprovedJobFn`, `regenerateEmbedding` — exported from index.ts |

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
| 1 | `getIngestionJobs()` fetches ALL jobs (no tenant filter) | Medium | `jobs.ts:26` | Should filter by tId+sId |
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
