# KB Generation Pipeline — Firebase Cost & Operations Tracking

> **Version:** 1.2.0
> **Last Updated:** 2026-07-18
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
| `answerlattice_faqs` | Publish pipeline | Deterministic generated FAQ drafts activated at finalization |
| `kb_categories` | Finalization pipeline | Atomic category/section/article navigation switch |
| `answerlattice_cache_versions` | Finalization pipeline | KB cache-version invalidation |
| `platformSummary` | Finalization pipeline | Source-version and compiled-bundle staleness records |

---

## 2. Firebase Storage

| Purpose | Path Pattern | Size | Lifecycle |
|---------|-------------|------|-----------|
| Source files | `ingestion_source_files/{tId}/{sId}/{uuid}-{filename}` | At most 10 MiB each, 40 MiB total per job | Retained on failure/cancellation; explicit deletion removes unreferenced paths and preserves shared paths |

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
| AI generates structured knowledge | 0 | 0 | 0 | 1 text-generation call |
| Generate initial article vectors | bounded article reads/writes in function flow | bounded article writes | 0 | Up to 40 embedding calls |
| Complete job with draft articles/navigation | transaction reads/writes | bounded draft/job writes | 0 | 0 |
| **Total** | **Bounded by 8 sources and 40 articles** | **Bounded by 40 articles** | **0** | **1 text call + up to 40 embedding calls** |

### 3.3 Publish and Embedding

| Step | Reads | Writes | Gemini |
|------|:-----:|:------:|:------:|
| Publish staging transaction: job + A job articles + R replacement checks | `1 + A + R` | Up to `6A + 1`; replacements and live navigation are unchanged | 0 |
| Deterministic task dispatch state | 1 | 1 | 0 |
| Worker with reusable current embedding | 4 | 1 | 0 |
| Worker requiring a new active embedding | 5 | 3 | 1 `gemini-embedding-2` call |
| Atomic final publication: job + navigation + A articles/FAQs + R replacements + freshness | `2 + A + R` | Up to `6A + 6R + 5` | 0 |

`A <= 60`, `R <= 20`, and each article owns at most five generated FAQ operations, so final publication remains below the 500-write transaction limit at a maximum of 485 writes. Existing generation-time embeddings are reused only when cache version `gemini-embedding-2:768:v1`, 768 dimensions, a finite non-zero `embedding` vector, and the normalized source hash match. Edits that change category, section, title, or content force re-embedding; unchanged articles do not incur a second provider call. Articles, generated FAQs, navigation, and replacements remain non-public/unchanged until the final transaction succeeds.

### 3.4 Get Previous Jobs

| Step | Reads | Writes |
|------|:-----:|:------:|
| Query: tId + sId + status in [published, failed, cancelled] | N | 0 |

### 3.5 Delete Unpublished Job (Reference-Aware Cleanup)

| Step | Reads | Writes | Storage |
|------|:-----:|:------:|:-------:|
| Read job document | 1 | 0 | 0 |
| Query exact-workspace jobs for source references (`W <= 100`) | W | 0 | 0 |
| Query exact-scope articles by jobId | N | 0 | 0 |
| Claim deletion lease + delete unpublished article drafts | 1 | 1+N | 0 |
| Delete unreferenced source objects; preserve shared references | 0 | 0 | `U` idempotent deletes |
| Cleanup-failure settlement (failure only) | 1 | 1 | 0 |
| Delete job under owned lease | 1 | 1 | 0 |
| **Success total** | **3+W+N** | **2+N** | **U deletes** |

Deletion is platform-only and accepts only `needs_review`, `failed`, or `cancelled` jobs with exact Answerlattice tenant/store scope. Published/active related articles block deletion so `jobId` provenance remains durable. The DAL reads at most 100 exact-workspace jobs and compares source paths before cleanup. Shared paths are preserved; unreferenced paths are deleted. An oversized/malformed inventory fails closed before deletion ownership is claimed, while Storage cleanup failure leaves a retryable failed `deletionRun`. The job document is removed only after the final transaction proves the same deletion run.

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
| Gemini processing and embeddings | Bounded by source job and changed article counts | Current configured-provider pricing |
| Storage (source files) | Depends on retained failed/cancelled/shared-reference jobs | Current Firebase Storage pricing |
| **Total** | | **Measure from operation ledger; do not publish an unverified fixed estimate** |

This is a platform-admin, low-frequency feature. Do not hard-code a currency estimate in this contract because Firebase and model pricing can change; operation bounds and provider-call avoidance are the durable cost controls.

Because this is a pre-launch corpus, the canonical `embedding` field is written directly. There is no embedding backfill scan, migration-state write, duplicate vector index, or dual provider call in the nightly scheduler.

The active runtime is the dedicated Answerlattice Firebase package. The shared MenuList Functions tree remains a documented emulator/legacy compatibility path and mirrors the same durable-set, run-ID, source-hash, vector, and finalization contracts.

Timeout recovery is also dedicated-runtime only. The existing Answerlattice nightly function scans at most 10 `processing` jobs older than 30 minutes, rejects any row without exact numeric `pId: AL`, `tId`, and `sId`, and revalidates status/scope/time inside a transaction before writing fixed failure state. A changed or completed job is skipped. A successful timeout costs the query read plus one transaction read and one write; invalid-scope candidates cost only their bounded query read. The MenuList nightly scheduler performs no `kb_generation_jobs` read or write and retains only a `moved_to_answerlattice_runtime` run-log record.

QA deployment evidence (July 14, 2026): the exact MenuList scheduler trio and dedicated Answerlattice scheduled/manual-nightly pair passed their configured local predeploy lint/build where applicable. Cloud Resource Manager then returned HTTP 403 caller permission for both QA projects before any remote mutation. QA revisions remain unchanged. An authorized operator must repeat `firebase deploy --only functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler --project menulist-qa --non-interactive` and `firebase deploy --only functions:answerlattice:answerlatticeNightly,functions:answerlattice:triggerAnswerlatticeNightly --project answerlattice-qa --config firebase-answerlattice.json --non-interactive`.

Job acknowledgement hardening remains cost-neutral for add/retry/cancel callers. July 18 deletion hardening adds a bounded exact-workspace job inventory plus deletes for source paths proven unreferenced; shared references remain. July 18 publication hardening moves live navigation, article/FAQ activation, replacement deletion, job publication, and freshness writes into the final transaction. General review-field updates remain one transaction read plus one job write. July 13 review-navigation hardening keeps that **1 read + 1 write** profile but transforms the transaction-current map instead of persisting a browser snapshot.

Source uploads use attempt-unique UUID paths. If bytes upload successfully but download-URL resolution fails, the shared client helper performs one best-effort delete of that exact unreferenced attempt before returning failure. Normal successful uploads add no operation. If cleanup itself fails, bounded diagnostics retain evidence; no Firestore job exists for that failed URL handoff.

July 5 session lookup diagnostics update: `getIngestionJobs()` session lookup failures now log `answerlattice_kb_generation_session_lookup_failed` and continue to return an empty non-platform list instead of opening global job reads. This adds no Firestore reads, writes, deletes, Storage operations, routes, rules, indexes, schema fields, Cloud Functions, owner settings, Firebase deployment, or Vercel deployment.

---

## 5. Firestore Indexes Required

| Collection | Fields | Purpose |
|-----------|--------|---------|
| `kb_generation_jobs` | `tId ASC, sId ASC, status ASC` | Active jobs listener |
| `kb_generation_jobs` | `tId ASC, sId ASC, status IN [published, failed, cancelled]` | Previous jobs query |
| `kb_generation_jobs` | Existing single-field indexes on `pId`, `tId`, and `sId` | Equality-filter index merge for bounded workspace source-reference inventory; no new composite index was added |
| `kb_articles` | `pId ASC, tId ASC, sId ASC, jobId ASC` | Exact-workspace articles by job for safe draft cleanup |
