# KB Generation Pipeline — Firebase Cost & Operations Tracking

> **Version:** 1.0.0
> **Last Updated:** 2026-07-05
> **Audience:** Developers, Ops
> **Source:** Codebase forensic audit

---

## 1. Firestore Collections

### 1.1 kb_generation_jobs

| Property | Value |
|----------|-------|
| **Collection** | `kb_generation_jobs` |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.KB_GENERATION_JOBS` |
| **Doc ID** | Auto-generated |
| **Scoping** | `tId` + `sId` fields; non-platform `getIngestionJobs()` reads are tenant/store scoped |
| **Avg Doc Size** | 5-50 KB (grows with generated categories/articles metadata) |
| **Growth Rate** | Per-upload (infrequent) |

### 1.2 Related Collections (Written During Publish)

| Collection | Written By | Purpose |
|-----------|-----------|---------|
| `kb_articles` | Publish pipeline | Generated articles with embeddings |
| `kb_categories` | Publish pipeline | Category/section metadata sync |
| `kb_staging_sections` | Processing pipeline | Staging data during generation |
| `kb_staging_chunks` | Processing pipeline | Source file chunks |
| `kb_review_tasks` | Processing pipeline | Review task tracking |
| `kb_ai_runs` | Processing pipeline | AI processing run logs |

---

## 2. Firebase Storage

| Purpose | Path Pattern | Size | Lifecycle |
|---------|-------------|------|-----------|
| Source files | `ingestion_source_files/{tId}/{sId}/{uuid}-{filename}` | Variable (PDFs: 1-50MB, Images: 0.5-10MB) | Deleted on job delete only |

Source file uploads attach Storage custom metadata for operational inspection:

- `sourceUse`: `knowledge_generation_only`
- `retentionPolicy`: `delete_on_job_delete`
- `sourceMetadataPolicy`: `source_fidelity_preserved` for non-image files, or `source_file_may_include_image_metadata` for image files
- `uploadedVia`: `answerlattice_kb_generation`

This does not add Firestore writes. The pipeline preserves source-file fidelity for generation, so image files are not re-encoded or EXIF-stripped before upload. Admin-facing upload copy warns users to remove private customer data from images and screenshots before importing them.

June 29 browser-handoff hardening changes only new-tab source-file opens in the KB generation UI to use `noopener,noreferrer`. It adds no Firestore reads/writes/deletes, Storage operations, Cloud Functions, provider calls, rules, indexes, schema fields, or job-state changes.

---

## 3. Operations Per Action

### 3.1 Upload + Create Job

| Step | Reads | Writes | Storage | Gemini |
|------|:-----:|:------:|:-------:|:------:|
| Upload N files to Storage | 0 | 0 | N uploads | 0 |
| Create job document | 0 | 1 | 0 | 0 |
| [Dev] Trigger CF manually | 0 | 0 | 0 | 0 |
| **Total** | **0** | **1** | **N uploads** | **0** |

### 3.2 AI Processing (Cloud Function)

| Step | Reads | Writes | Storage | Gemini |
|------|:-----:|:------:|:-------:|:------:|
| Read source files from Storage | N storage reads | 0 | 0 | 0 |
| AI generates articles | 0 | 0 | 0 | 1+ (per file chunk) |
| Update job (status + categories) | 0 | 1-3 | 0 | 0 |
| **Total** | **N storage** | **1-3** | **0** | **1+ Gemini** |

### 3.3 Publish (Per Article)

| Step | Reads | Writes | Gemini |
|------|:-----:|:------:|:------:|
| Write article to kb_articles | 0 | 1 | 0 |
| Update parent in kb_categories | 0 | 1 | 0 |
| Generate embedding | 0 | 1 | 1 (text-embedding-004) |
| Update job counter | 0 | 1 | 0 |
| **Total per article** | **0** | **4** | **1** |
| **Total for 20 articles** | **0** | **80** | **20** |

### 3.4 Get Previous Jobs

| Step | Reads | Writes |
|------|:-----:|:------:|
| Query: tId + sId + status in [published, failed, cancelled] | N | 0 |

### 3.5 Delete Job (Cascade)

| Step | Reads | Writes | Storage |
|------|:-----:|:------:|:-------:|
| Read job document | 1 | 0 | 0 |
| Read master categories | 1 | 0 | 0 |
| Update categories (remove job's) | 0 | 1 | 0 |
| Query articles by jobId | N | 0 | 0 |
| Delete each article | 0 | N | 0 |
| Delete job document | 0 | 1 | 0 |
| Delete source files | 0 | 0 | N deletes |
| **Total** | **2+N** | **2+N** | **N deletes** |

### 3.6 Real-Time Listener (Active Jobs)

| Step | Reads | Writes |
|------|:-----:|:------:|
| Initial snapshot | N (active jobs, usually 0-1) | 0 |
| Per status change | 1 | 0 |

---

## 4. Cost Estimates

### Scenario: 2 jobs/month, 20 articles per job

| Operation | Reads/mo | Writes/mo | Gemini Calls/mo |
|-----------|:--------:|:---------:|:---------------:|
| Create jobs | 0 | 2 | 0 |
| AI processing (CF) | ~10 | ~6 | ~4 |
| Publish articles (40 total) | 0 | 160 | 40 |
| Real-time listener | ~20 | 0 | 0 |
| View history | ~10 | 0 | 0 |
| **Total** | **~40** | **~168** | **~44** |

### Monthly Cost

| Resource | Usage | Cost |
|----------|-------|------|
| Firestore reads | ~40 | $0.00001 |
| Firestore writes | ~168 | $0.0002 |
| Gemini text-embedding-004 | 40 calls | ~$0.002 |
| Gemini processing (articles) | 4 calls | ~$0.01 |
| Storage (source files) | ~100 MB | ~$0.01 |
| **Total** | | **~$0.02/month** |

This is a very low-frequency feature — cost is negligible.

Job acknowledgement hardening is cost-neutral. `addIngestionJob()`, `updateJob()`, `deleteIngestionJob()`, `retryJob()`, and `cancelJob()` still use the same existing job writes, transaction delete, storage cleanup, and dev trigger behavior, but KB Generation upload, job-card, job-history, review, and reconciliation callers now require explicit job write/delete acknowledgements before local job/review state or success copy advances. This adds no reads, writes, deletes, Storage operations, routes, rules, indexes, schema fields, Cloud Functions, owner settings, Firebase deployment, or Vercel deployment.

July 5 session lookup diagnostics update: `getIngestionJobs()` session lookup failures now log `answerlattice_kb_generation_session_lookup_failed` and continue to return an empty non-platform list instead of opening global job reads. This adds no Firestore reads, writes, deletes, Storage operations, routes, rules, indexes, schema fields, Cloud Functions, owner settings, Firebase deployment, or Vercel deployment.

---

## 5. Firestore Indexes Required

| Collection | Fields | Purpose |
|-----------|--------|---------|
| `kb_generation_jobs` | `tId ASC, sId ASC, status ASC` | Active jobs listener |
| `kb_generation_jobs` | `tId ASC, sId ASC, status IN [published, failed, cancelled]` | Previous jobs query |
| `kb_articles` | `jobId ASC` | Articles by job (for cascade delete) |
