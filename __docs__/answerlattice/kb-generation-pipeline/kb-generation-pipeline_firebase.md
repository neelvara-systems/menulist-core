# KB Generation Pipeline — Firebase Cost & Operations Tracking

> **Version:** 1.1.0
> **Last Updated:** 2026-07-13
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
| Source files | `ingestion_source_files/{tId}/{sId}/{uuid}-{filename}` | Variable (PDFs: 1-50MB, Images: 0.5-10MB) | Retained on job delete until workspace-wide non-reference is proved |

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
| Completed-upload URL failure compensation | 0 | 0 | 0-1 delete per failed UUID attempt | 0 |
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
| Worker requiring a new active embedding | 5 | 4 | 1 `gemini-embedding-2` call |
| Final job/cache/source/bundle transaction | 1 | 4 | 0 |

`A <= 60`, `R <= 20`, and each article owns at most five generated FAQ operations, so the publish transaction is bounded to at most 482 writes. Existing generation-time embeddings are reused only when cache version `gemini-embedding-2:768:v1`, 768 dimensions, a finite non-zero `embedding` vector, and the normalized source hash match. Edits that change category, section, title, or content force re-embedding; unchanged articles do not incur a provider call.

### 3.4 Get Previous Jobs

| Step | Reads | Writes |
|------|:-----:|:------:|
| Query: tId + sId + status in [published, failed, cancelled] | N | 0 |

### 3.5 Delete Unpublished Job (Shared-Reference-Safe Retention)

| Step | Reads | Writes | Storage |
|------|:-----:|:------:|:-------:|
| Read job document | 1 | 0 | 0 |
| Query exact-scope articles by jobId | N | 0 | 0 |
| Claim deletion lease + delete unpublished article drafts | 1 | 1+N | 0 |
| Record bounded source-retention diagnostic | 0 | 0 | 0 |
| Delete job under owned lease | 1 | 1 | 0 |
| **Total** | **3+N** | **2+N** | **0 deletes** |

Deletion is platform-only and accepts only `needs_review`, `failed`, or `cancelled` jobs with exact Answerlattice tenant/store scope. Published/active related articles block deletion so `jobId` provenance remains durable. The DAL accepts a valid source path already present inside the workspace, so one job cannot prove exclusive ownership of a source object. Persisted source media is retained with a bounded diagnostic; the job document is removed only after the final transaction proves the same deletion run. Failed upload-to-job handoff may still clean attempt-owned uploads before persistence.

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

Because this is a pre-launch corpus, the canonical `embedding` field is written directly. There is no embedding backfill scan, migration-state write, duplicate vector index, or dual provider call in the nightly scheduler.

The active runtime is the dedicated Answerlattice Firebase package. The shared MenuList Functions tree remains a documented emulator/legacy compatibility path and mirrors the same durable-set, run-ID, source-hash, vector, and finalization contracts.

Timeout recovery is also dedicated-runtime only. The existing Answerlattice nightly function scans at most 10 `processing` jobs older than 30 minutes, rejects any row without exact numeric `pId: AL`, `tId`, and `sId`, and revalidates status/scope/time inside a transaction before writing fixed failure state. A changed or completed job is skipped. A successful timeout costs the query read plus one transaction read and one write; invalid-scope candidates cost only their bounded query read. The MenuList nightly scheduler performs no `kb_generation_jobs` read or write and retains only a `moved_to_answerlattice_runtime` run-log record.

QA deployment evidence (July 14, 2026): the exact MenuList scheduler trio and dedicated Answerlattice scheduled/manual-nightly pair passed their configured local predeploy lint/build where applicable. Cloud Resource Manager then returned HTTP 403 caller permission for both QA projects before any remote mutation. QA revisions remain unchanged. An authorized operator must repeat `firebase deploy --only functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler --project menulist-qa --non-interactive` and `firebase deploy --only functions:answerlattice:answerlatticeNightly,functions:answerlattice:triggerAnswerlatticeNightly --project answerlattice-qa --config firebase-answerlattice.json --non-interactive`.

Job acknowledgement hardening remains cost-neutral for add/retry/cancel callers. Deletion intentionally adds one transactional job write and final transactional read so draft cleanup and operation ownership remain atomic; persisted source objects are not deleted from one-job truth. General review-field updates already use one transaction read plus one job write. July 13 review-navigation hardening keeps that **1 read + 1 write** profile but moves category/section/article navigation changes to `updateReviewJobNavigation()`, which transforms the transaction-current map instead of persisting a browser snapshot. No collection, document, Storage object, route, rule, index, Cloud Function, Firebase deployment, or Vercel deployment is added.

Source uploads use attempt-unique UUID paths. If bytes upload successfully but download-URL resolution fails, the shared client helper performs one best-effort delete of that exact unreferenced attempt before returning failure. Normal successful uploads add no operation. If cleanup itself fails, bounded diagnostics retain evidence; no Firestore job exists for that failed URL handoff.

July 5 session lookup diagnostics update: `getIngestionJobs()` session lookup failures now log `answerlattice_kb_generation_session_lookup_failed` and continue to return an empty non-platform list instead of opening global job reads. This adds no Firestore reads, writes, deletes, Storage operations, routes, rules, indexes, schema fields, Cloud Functions, owner settings, Firebase deployment, or Vercel deployment.

---

## 5. Firestore Indexes Required

| Collection | Fields | Purpose |
|-----------|--------|---------|
| `kb_generation_jobs` | `tId ASC, sId ASC, status ASC` | Active jobs listener |
| `kb_generation_jobs` | `tId ASC, sId ASC, status IN [published, failed, cancelled]` | Previous jobs query |
| `kb_articles` | `pId ASC, tId ASC, sId ASC, jobId ASC` | Exact-workspace articles by job for safe draft cleanup |
