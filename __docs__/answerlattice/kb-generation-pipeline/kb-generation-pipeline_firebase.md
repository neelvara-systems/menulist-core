# KB Generation Pipeline — Firebase Cost & Operations Tracking

> **Version:** 1.1.0
> **Last Updated:** 2026-07-12
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

### 3.3 Publish and Embedding

| Step | Reads | Writes | Gemini |
|------|:-----:|:------:|:------:|
| Publish transaction: job + navigation + A job articles + R replacement articles | `2 + A + R` | Up to `6A + 6R + 2` | 0 |
| Deterministic task dispatch state | 1 | 1 | 0 |
| Worker with reusable current embedding | 4 | 2 | 0 |
| Worker requiring a new active embedding | 5 | 4 | 1 `gemini-embedding-2` call; legacy v1 is reused or best-effort dual-written only when rollback coverage is missing/stale |
| Final job/cache/source/bundle transaction | 1 | 4 | 0 |

`A <= 60`, `R <= 20`, and each article owns at most five generated FAQ operations, so the publish transaction is bounded to at most 482 writes. Existing generation-time embeddings are reused only when the active v2 cache version, 768 dimensions, finite non-zero `embeddingV2` vector, and normalized source hash match. Edits that change category, section, title, or content force v2 re-embedding; unchanged articles do not incur a provider call. During migration, a valid legacy `embedding` with the same source hash is retained without a second v1 call.

### 3.4 Get Previous Jobs

| Step | Reads | Writes |
|------|:-----:|:------:|
| Query: tId + sId + status in [published, failed, cancelled] | N | 0 |

### 3.5 Delete Unpublished Job (Recoverable Cleanup)

| Step | Reads | Writes | Storage |
|------|:-----:|:------:|:-------:|
| Read job document | 1 | 0 | 0 |
| Query exact-scope articles by jobId | N | 0 | 0 |
| Claim deletion lease + delete unpublished article drafts | 1 | 1+N | 0 |
| Delete source files | 0 | 0 | N deletes |
| Persist failed cleanup or delete job under owned lease | 1 | 1 | 0 |
| **Total** | **3+N** | **2+N** | **N deletes** |

Deletion is platform-only and accepts only `needs_review`, `failed`, or `cancelled` jobs with exact Answerlattice tenant/store scope. Published/active related articles block deletion so `jobId` provenance remains durable. Storage helpers return acknowledged result objects; fulfilled `{ success: false }` results are counted. Any failure retains the job with a retryable `deletionRun.status = failed`; the job document is removed only after every source cleanup succeeds and the final transaction still owns the same deletion run.

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
| Publish articles (40 total) | workload-dependent | bounded transactions + completion writes | 0-40 |
| Real-time listener | ~20 | 0 | 0 |
| View history | ~10 | 0 | 0 |
| **Total** | **~40** | **~168** | **~44** |

### Monthly Cost

| Resource | Usage | Cost |
|----------|-------|------|
| Firestore reads | Low-frequency bounded workload | Project pricing dependent |
| Firestore writes | Low-frequency bounded workload | Project pricing dependent |
| Gemini embedding | Only stale/changed articles | Current configured-model pricing |
| Gemini processing (articles) | 4 calls | ~$0.01 |
| Storage (source files) | ~100 MB | ~$0.01 |
| **Total** | | **~$0.02/month** |

This is a platform-admin, low-frequency feature. Do not hard-code a currency estimate in this contract because Firebase and model pricing can change; operation bounds and provider-call avoidance are the durable cost controls.

The one-time v2 backfill belongs to `answerlatticeNightly`: at most 101 published active article reads, 100 article processes with concurrency 3, up to 100 provider calls and article writes when no reusable v2 vector exists, plus one migration-state write per batch. The state document is `platformSummary/answerlatticeEmbeddingV2Migration`; completed state with the current cache version makes later scheduler runs no-op.

The active runtime is the dedicated Answerlattice Firebase package. The shared MenuList Functions tree remains a documented emulator/legacy compatibility path and mirrors the same durable-set, run-ID, source-hash, vector, and finalization contracts.

Job acknowledgement hardening remains cost-neutral for add/update/retry/cancel callers. The later recoverable deletion repair intentionally adds one transactional job write and final transactional read so failed Storage cleanup can remain observable and retryable instead of losing its recovery record. Review updates add no reads and now validate their exact persisted shape plus UTF-8 size before the existing write.

July 5 session lookup diagnostics update: `getIngestionJobs()` session lookup failures now log `answerlattice_kb_generation_session_lookup_failed` and continue to return an empty non-platform list instead of opening global job reads. This adds no Firestore reads, writes, deletes, Storage operations, routes, rules, indexes, schema fields, Cloud Functions, owner settings, Firebase deployment, or Vercel deployment.

---

## 5. Firestore Indexes Required

| Collection | Fields | Purpose |
|-----------|--------|---------|
| `kb_generation_jobs` | `tId ASC, sId ASC, status ASC` | Active jobs listener |
| `kb_generation_jobs` | `tId ASC, sId ASC, status IN [published, failed, cancelled]` | Previous jobs query |
| `kb_articles` | `pId ASC, tId ASC, sId ASC, jobId ASC` | Exact-workspace articles by job for safe draft cleanup |
