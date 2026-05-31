# Knowledge Intake Command Center — Firebase Cost & Operations Contract

> **Status:** PLANNED — Cost-first implementation contract
> **Version:** 1.0.0
> **Created:** 2026-05-31
> **Audience:** Engineering / Firebase / Ops

---

## 1. Cost Doctrine

Canonica intake is a paid, bounded processing feature. It must not run expensive work before payment and must not materialize large AI/source artifacts in Firestore.

Non-negotiable rules:

- no free real source scan
- no free real AI draft generation
- no broad website crawl
- no full nightly crawl
- no Firestore source docs for discovered-but-skipped website URLs
- no per-section Firestore docs
- no per-fact Firestore docs
- no per-draft full-body Firestore docs before publish
- no realtime listener for source/review/job lists
- no native private connector until credential and retention rules are complete
- no per-source function trigger fanout for provider work

Firestore is for metadata, decisions, summaries, and live approved records. Firebase Storage is for raw files, normalized text, chunks, evidence, drafts, manifests, transcripts, and raw provider outputs if retained.

---

## 2. Collections

### New Collections

| Collection | Purpose | Growth profile |
| --- | --- | --- |
| `canonica_knowledgeIntakeJobs` | One compact job doc per intake run. | Low, one per owner-triggered run. |
| `canonica_knowledgeSources` | One compact source doc per selected source. | Bounded by plan/source caps. |
| `canonica_intakeReviewItems` | One doc per owner decision, not per fact. | Capped per job; query paginated. |
| `canonica_intakeUsageLedger` | Immutable credit/allowance reservation and consumption rows. | One/few rows per expensive action. |

### Existing Destination Collections

| Collection | Use |
| --- | --- |
| `kb_articles` | Approved article output with `knowledgeLineage`. |
| `kb_categories` | Approved KB navigation output. |
| `canonica_faqs` | Approved short Q&A output. |
| `canonica_entityCandidates` | Product concepts needing review. |
| `canonica_entities` | Approved product ontology concepts. |
| `canonica_canonicalAnswers` | Approved support answers. |
| `canonica_mutationProposals` | Reviewable answer/update proposals. |
| `canonica_productSurfaces` | Page/workflow support mappings. |
| `canonica_supportBoardCards` | Only selected gaps/tasks, never raw facts. |
| `platformSummary` | Compact workspace summary, bucketed intake directory, source versions, readiness rollups, and repair state. |

---

## 3. Storage Paths

```text
canonica_intake/CN/{tId}/{sId}/{intakeJobId}/sources/{sourceId}/original/{filename}
canonica_intake/CN/{tId}/{sId}/{intakeJobId}/sources/{sourceId}/normalized/manifest.json
canonica_intake/CN/{tId}/{sId}/{intakeJobId}/sources/{sourceId}/normalized/chunks.jsonl
canonica_intake/CN/{tId}/{sId}/{intakeJobId}/sources/{sourceId}/evidence/evidence.jsonl
canonica_intake/CN/{tId}/{sId}/{intakeJobId}/website-discovery/candidates.json
canonica_intake/CN/{tId}/{sId}/{intakeJobId}/website-discovery/fetch-log.jsonl
canonica_intake/CN/{tId}/{sId}/{intakeJobId}/product-map/product-map.json
canonica_intake/CN/{tId}/{sId}/{intakeJobId}/drafts/drafts.jsonl
canonica_intake/CN/{tId}/{sId}/{intakeJobId}/publish/publish-manifest.json
```

Storage metadata:

- `pId=CN`
- `tId`
- `sId`
- `intakeJobId`
- `sourceId`
- `sourceUse=canonica_knowledge_intake`
- `retentionPolicy=owner_selected`
- `containsUserProvidedData=true`

---

## 4. Summary Documents

Use summary documents as the primary read model. Owner dashboards, activation, scheduler repair, and ops monitoring must not discover intake state by scanning jobs, sources, or review items.

### 4.1 Workspace Summary

Use one compact workspace summary document:

```text
platformSummary/knowledgeIntakeSummary_{tId}_{sId}
```

Shape:

```ts
{
  pId: 'CN',
  tId: number,
  sId: number,
  activeJobId?: string,
  activeJobStatus?: string,
  activeJobStep?: string,
  lastPublishedJobId?: string,
  sourceCounts: { total: number; ready: number; failed: number; highRisk: number },
  linkDiscovery: { discovered: number; eligible: number; selected: number; skipped: number },
  reviewCounts: { open: number; critical: number; highRisk: number; safeBulk: number },
  readiness: Record<string, 'ready' | 'partial' | 'not_ready' | 'needs_review'>,
  urgentReviewPreview: Array<{ id: string; type: string; title: string; riskLevel: string }>,
  allowance: { planId: string; creditsRemaining: number; sourcePageRemaining: number; fileRemaining: number },
  sourceVersion: number,
  outputVersion: number,
  summaryHash: string,
  dirty: boolean,
  updatedAt: Timestamp
}
```

Activation and dashboard pages should read this one doc instead of scanning jobs/sources/review items.

### 4.2 Bucketed Intake Directory

Use a bucketed directory so scheduler/ops can find intake work without collection scans:

```text
platformSummary/knowledgeIntakeDirectory_00
platformSummary/knowledgeIntakeDirectory_01
...
platformSummary/knowledgeIntakeDirectory_31
```

Each directory document stores compact entries keyed by `{tId}_{sId}`:

```ts
{
  schemaVersion: 1,
  pId: 'CN',
  bucket: number,
  entries: {
    "123_456": {
      tId: 123,
      sId: 456,
      active: true,
      activeJobId?: string,
      activeJobStatus?: string,
      dirty: boolean,
      openReviewCount: number,
      criticalReviewCount: number,
      sourceVersion: number,
      outputVersion: number,
      nextSummaryRepairAt?: Timestamp,
      lastIntakeChangedAt: Timestamp,
      updatedAt: Timestamp
    }
  },
  updatedAt: Timestamp
}
```

Rules:

- bucket is `hash(tId_sId) % 32`
- update the directory entry in the same server transition that changes job/source/review state
- remove or mark inactive when workspace is deleted or Canonica access is revoked
- scheduler reads the bucket docs instead of scanning `canonica_knowledgeIntakeJobs`
- if tenant count grows enough to approach Firestore document limits, increase bucket count before expanding feature availability

### 4.3 Source Version Manifest

Keep intake freshness aligned with the existing Canonica compiled context pattern, but do not confuse intake-only counters with public bundle inputs:

```text
platformSummary/sourceVersions_{tId}_{sId}
```

Required intake fields:

```ts
{
  knowledgeIntakeSources: number,
  knowledgeIntakeOutputs: number,
  knowledgeIntakeReadiness: number,
  updatedAt: Timestamp,
  lastReason?: string,
  lastSourceId?: string,
  lastSourceType?: string
}
```

Rules:

- bump `knowledgeIntakeSources` when selected source content changes, not when discovered-but-skipped URLs change
- bump `knowledgeIntakeOutputs` when approved KB/FAQ/canonical/surface outputs are published
- bump `knowledgeIntakeReadiness` when readiness changes
- these intake-only fields may live on the same `sourceVersions_*` document for locality, but they must not be included in compiled context equality checks
- approved runtime output must separately bump the existing compiled context keys: `kb`, `docsNav`, `canonical`, `surfaces`, `releases`, `entities`, and `entityRelations` as applicable
- downstream bundle/context rebuilds compare runtime source versions and skip when unchanged

### 4.4 Summary Write Rules

Summary writes must be deterministic and sparse:

- update summaries in the same API/function transaction as the state transition where possible
- compute `summaryHash` from counters/readiness/active job/open preview
- skip summary writes when the hash is unchanged
- store only the top urgent review preview; full review lists stay paginated
- never rebuild summary by scanning all sources on dashboard load
- nightly repair may rebuild summaries only for dirty entries from the directory

---

## 5. Operation Cost Model

### 5.1 Preflight

| Step | Reads | Writes | Storage | Provider |
| --- | ---: | ---: | ---: | ---: |
| Read subscription/plan/usage summary | 1-3 | 0 | 0 | 0 |
| Validate source metadata | 0 | 0 | 0 | 0 |
| Estimate credits | 0 | 0 | 0 | 0 |

### 5.2 Create Job

| Step | Reads | Writes | Storage | Provider |
| --- | ---: | ---: | ---: | ---: |
| Reserve allowance ledger | 0-1 | 1 | 0 | 0 |
| Create job doc | 0 | 1 | 0 | 0 |
| Write workspace summary + directory entry | 0 | 1-2 | 0 | 0 |

### 5.3 Lease And Credit Reservation

| Step | Reads | Writes | Storage | Provider |
| --- | ---: | ---: | ---: | ---: |
| Acquire workspace intake lease | 1 | 1 | 0 | 0 |
| Reserve estimated processing credits | 1 | 1 | 0 | 0 |
| Reject competing active expensive job | 1 | 0 | 0 | 0 |

One workspace should run one expensive intake job at a time by default. This avoids duplicate provider calls, write bursts, and accidental parallel imports.

### 5.4 Website Link Discovery

| Step | Reads | Writes | Storage | Provider |
| --- | ---: | ---: | ---: | ---: |
| Read job/subscription/cap summary | 1-3 | 0 | 0 | 0 |
| Fetch robots/sitemap/llms.txt/root pages | 0 | 0 | bounded network fetches | 0 |
| Write candidate manifest and fetch log | 0 | 0 | 1-2 writes | 0 |
| Update job counters, summary, directory | 0 | 1-3 | 0 | 0 |
| Create source docs for skipped URLs | 0 | 0 | 0 | 0 |

Discovery is paid processing. It is cheaper than extraction, but it still performs network and Storage work, so it must respect plan caps.

### 5.5 Add N Selected Sources

| Step | Reads | Writes | Storage | Provider |
| --- | ---: | ---: | ---: | ---: |
| Dedupe by supplied hash/idempotency key | 0-1 | 0 | 0 | 0 |
| Create source docs | 0 | N | 0 | 0 |
| Upload source originals | 0 | 0 | N uploads | 0 |
| Summary + source version update | 0 | 1-2 | 0 | 0 |

### 5.6 Normalize Sources

| Step | Reads | Writes | Storage | Provider |
| --- | ---: | ---: | ---: | ---: |
| Read job + source metadata | 1 + N | 0 | 0 | 0 |
| Read original source artifacts | 0 | 0 | N reads | 0 |
| Write normalized manifests/chunks | 0 | 0 | N writes | 0 |
| Update source status/counters | 0 | N bounded writes | 0 | 0 |
| Update changed source summary/version | 0 | 0-2 | 0 | 0 |
| OCR/transcription where selected | 0 | 0 | artifact reads/writes | paid provider calls |

### 5.7 Privacy Filter

| Step | Reads | Writes | Storage | Provider |
| --- | ---: | ---: | ---: | ---: |
| Read normalized manifests | 0 | 0 | N bounded reads | 0 |
| Write redacted evidence manifests | 0 | 0 | N bounded writes | 0 |
| Create private-data review items | 0 | capped writes | 0 | 0 |
| Update source/job counters and summary | 0 | bounded writes | 0 | 0 |

Provider prompts must use redacted, selected evidence. Unsafe raw sources do not enter draft generation by default.

### 5.8 Source Audit + Product Map

| Step | Reads | Writes | Storage | Provider |
| --- | ---: | ---: | ---: | ---: |
| Read source metadata | N bounded | 0 | 0 | 0 |
| Read normalized manifests | 0 | 0 | N storage reads | 0 |
| LLM classification/extraction | 0 | 0 | 0 | bounded calls |
| Write product map/evidence manifests | 0 | 0 | 1-3 writes | 0 |
| Create review items | 0 | capped writes | 0 | 0 |
| Update job + summary + directory | 0 | 2-3 | 0 | 0 |

### 5.9 Draft Generation

| Step | Reads | Writes | Storage | Provider |
| --- | ---: | ---: | ---: | ---: |
| Read selected review/source metadata | capped | 0 | 0 | 0 |
| Read selected evidence manifests | 0 | 0 | capped storage reads | 0 |
| Generate drafts | 0 | 0 | 0 | bounded LLM calls |
| Store draft bodies | 0 | 0 | 1 JSONL write | 0 |
| Create/update review items | 0 | capped writes | 0 | 0 |

### 5.10 Publish

| Step | Reads | Writes | Storage | Provider |
| --- | ---: | ---: | ---: | ---: |
| Read job + selected review items | capped | 0 | 0 | 0 |
| Read draft manifest | 0 | 0 | 1 read | 0 |
| Write approved outputs | 0 | bounded by selected items | 0 | 0 |
| Embedding for published KB article outputs | 0 | one update/article | 0 | embedding calls |
| Update source versions/cache manifests | 0 | 1-3 | 0 | 0 |
| Update summary/readiness/directory if changed | 0 | 1-2 | 0 | 0 |

### 5.11 Runtime Destination Post-Write Cost

Approved output must pay the small deterministic write cost needed to make the output visible in existing Canonica runtimes. Skipping these writes creates stale widget/search/help-center behavior and shifts the cost into manual repair.

| Destination changed | Required low-cost follow-up | Cost control |
| --- | --- | --- |
| KB article body/title/category/section | Bump KB cache version, update `kb_categories`, mark `kb`/`docsNav`, enqueue/perform embedding, invalidate `kb`/`context` public cache. | Batch article/category writes; embed only changed article text hash; skip cache/source writes when publish manifest hash is unchanged. |
| FAQ/custom Q&A | Bump KB cache version, invalidate `faqs`/`kb`/`context`, mark surface summary stale. | Use existing FAQ cache pattern instead of adding a FAQ cache source; batch FAQ writes by publish selection. |
| Canonical answer | Bump canonical cache version, mark `canonical`. | Only owner-approved active answers bump canonical runtime; drafts/proposals do not. |
| Product surface | Mark `surfaces`, rebuild or mark stale `contextContent_{tId}_{sId}`. | Rebuild summary once per publish batch, not once per surface. |
| Changelog/release | Invalidate `changelog`/`context`, mark `releases` when release context changes, run release activation only after approval. | Keep recent changelog pages bounded; do not scan old pages on publish. |
| Entity/relation | Mark `entities`/`entityRelations`, update search index and graph summaries only when relevant flags are enabled. | Write entity candidates first; only approved ontology changes touch runtime indexes. |

Product-surface summary rebuild is intentionally bounded by the existing caps for active surfaces, published articles, published FAQs, recent changelog pages, and recent tickets. The intake publisher should call it once after a publish batch that affects related content, or mark it stale for scheduler repair when immediate rebuild is not needed.

---

## 6. Plan Caps

Exact values must be stored in plan config, but the implementation must support these fields:

```ts
intakeLimits: {
  maxSourcesPerJob: number;
  maxFilesPerJob: number;
  maxFileSizeMb: number;
  maxZipFiles: number;
  maxUrlPagesPerJob: number;
  maxUrlCandidatesPerDiscovery: number;
  maxMediaMinutesPerJob: number;
  maxReviewItemsPerJob: number;
  maxDraftsPerJob: number;
  maxPublishedArticlesPerJob: number;
  maxPublishedAnswersPerJob: number;
  maxActiveIntakeJobsPerWorkspace: number;
}
```

No job should continue hidden processing after a cap is reached. Status becomes `paused_limit`.

---

## 7. Indexes

Required indexes:

| Collection | Fields | Purpose |
| --- | --- | --- |
| `canonica_knowledgeIntakeJobs` | `pId ASC, tId ASC, sId ASC, status ASC, createdOn DESC` | Active/recent job list |
| `canonica_knowledgeIntakeJobs` | `pId ASC, tId ASC, sId ASC, createdOn DESC` | Paginated job history |
| `canonica_knowledgeSources` | `pId ASC, tId ASC, sId ASC, intakeJobId ASC, status ASC, createdOn DESC` | Job source list |
| `canonica_knowledgeSources` | `pId ASC, tId ASC, sId ASC, sourceHash ASC` | Dedupe/idempotency |
| `canonica_intakeReviewItems` | `pId ASC, tId ASC, sId ASC, intakeJobId ASC, status ASC, riskLevel DESC, createdOn ASC` | Review queue |
| `canonica_intakeUsageLedger` | `pId ASC, tId ASC, sId ASC, intakeJobId ASC, createdOn DESC` | Cost audit |

Lease state can live on the active job document and compact summary. Avoid a separate high-churn lock collection unless implementation proves it is needed.

No index should be required for scheduler discovery. Scheduler discovery uses bucketed `platformSummary/knowledgeIntakeDirectory_*` docs.

---

## 8. Rules Requirements

Firestore rules:

- default deny
- require authenticated Canonica workspace user
- require matching `pId == "CN"`
- require matching `tId` and `sId` access
- disallow client writes for system-owned fields and expensive state transitions
- allow owner/staff reads according to Canonica staff permission claims
- high-risk approval writes require owner/admin role
- lease/worker fields are server-write only
- credit reservation/settlement fields are server-write only

Storage rules:

- restrict `canonica_intake/CN/{tId}/{sId}/...` to authorized workspace users
- enforce size/content-type where rules can help
- block public reads
- delete requires owner/admin or source owner with permission

Expensive processing routes/functions must enforce server-side auth regardless of rules.

---

## 9. Retention And TTL

Owner choices:

- keep original files
- delete originals after processing
- keep only evidence snippets
- delete source and dependent unapproved drafts

Default:

- raw originals kept only when owner chooses it or when required for retry/audit
- raw AI responses expire quickly
- normalized artifacts retained while source is active
- deleted source removes originals, normalized artifacts, evidence, draft references, and unapproved dependent review items

Use Firestore TTL only for temporary logs/ledger rows where exact deletion timing does not matter. Use Storage lifecycle rules for temporary raw artifacts.

Usage ledger rows should keep enough retained history for billing dispute review. Temporary worker logs can expire faster than billing ledgers.

---

## 10. URL Import Protections

Server-side URL fetch must:

- allow only `http` and `https`
- block localhost, private IP ranges, link-local, metadata IPs, and internal DNS resolutions
- re-resolve DNS after every redirect before fetching
- cap redirects
- cap page count
- cap candidate URL count
- cap response size
- cap crawl depth
- cap total fetch wall time
- block credentialed dashboard crawling, login forms, admin paths, and URLs requiring cookies
- strip common tracking parameters before dedupe
- respect robots where applicable
- prefer sitemap, llms.txt, canonical links, and owner-selected paths
- write discovered candidates to Storage manifest
- store only owner-selected useful pages as Firestore sources
- compute ETag, Last-Modified, content hash, and normalized text hash for freshness

No background full-site crawl.

### 10.1 Link Refresh Cost Rules

Selected website pages are checked only when the owner triggers refresh or when a source-version workflow explicitly asks for freshness.

Refresh checks must:

- read only the compact source metadata needed for selected URLs
- use ETag/Last-Modified and content hash to skip unchanged sources
- update freshness metadata only when unchanged
- avoid source audit, product map extraction, draft generation, embeddings, and AI/provider calls when unchanged
- never refresh discovered-but-skipped URLs

---

## 11. Firebase Cost Estimate

Illustrative Launch-plan intake:

- 1 product context
- 1 website/docs scan with 20 selected pages
- 5 uploaded files
- 12 review items
- 20 draft outputs
- 10 published articles/FAQs/answers

Expected Firestore:

- Reads: ~60-120
- Writes: ~80-180
- Storage uploads/downloads: depends on file count and normalized artifacts
- Provider calls: bounded classification/extraction/draft/embedding only

The expensive part is AI/transcription/storage size, not Firestore. That is why paid preflight and processing caps are mandatory.

Scheduler/ops discovery cost:

- Small scale: read 32 bucket directory docs, then process only dirty/active entries.
- Workspace UI: read one workspace summary doc.
- Summary repair: read one workspace summary, bounded recent job/source/review docs only for dirty workspaces, write summary only if hash changed.
- No scheduler collection scan of jobs, sources, discovered URLs, or review items.

---

## 12. Scheduler And Summary Repair

Use the existing Canonica master scheduler pattern. Do not create a separate scheduled function for intake.

Allowed scheduler work:

- repair summaries for dirty directory entries
- release expired intake leases
- settle cancelled/failed credit reservations
- mark stale summaries when source versions changed
- verify source-version manifests and skip unchanged work

Not allowed scheduler work by default:

- full website crawl
- broad selected-link refresh
- AI draft generation from intake sources
- source extraction for dormant workspaces
- collection scans over all intake jobs/sources/review items

If selected-link freshness checks are added for paid plans, scheduler must discover candidates from the directory/source-version manifests and respect per-run caps. It must still skip unchanged URLs before extraction/provider work.

---

## 13. Cost Impact Summary

When implemented with this contract:

- dashboard load reads one summary doc plus paginated lists only when opened
- scheduler discovery reads bucketed directory docs instead of scanning growing collections
- summary repair only processes dirty/active workspaces
- source bodies do not inflate Firestore documents
- no realtime listener is needed for job/history/review lists
- active progress can use polling or one short-lived active-job listener only
- no scheduler crawl runs by default
- discovered-but-skipped website URLs live in Storage manifests, not Firestore
- unchanged selected URLs skip AI/provider work and most writes
- one active expensive job per workspace avoids accidental provider/function fanout
- credit reservation/settlement prevents hidden overrun and releases unused reserved credits
- privacy filtering keeps unsafe raw source material out of provider prompts by default
- runtime output writes reuse existing KB/canonical/source-version/cache paths instead of creating duplicate retrieval collections
- intake-only freshness counters are excluded from public bundle equality, so readiness-only changes do not rebuild Storage bundles
- product-surface summary rebuild happens once per affected publish batch, not once per output item
- nightly jobs use source-version manifests only when a source changed

---

## 14. Version History

| Date | Version | Change |
| --- | --- | --- |
| 2026-05-31 | 1.0.0 | Initial Firebase/cost contract for Knowledge Intake Command Center. |
| 2026-05-31 | 1.1.0 | Added website link discovery cost model, selected-source Firestore rules, and unchanged-link refresh skip rules. |
| 2026-05-31 | 1.2.0 | Added lease/concurrency, credit reservation/settlement, and privacy-filter cost controls. |
| 2026-05-31 | 1.3.0 | Added summary-first read model, bucketed intake directory, source-version manifest, and scheduler repair contract. |
| 2026-05-31 | 1.4.0 | Added runtime destination post-write cost matrix and clarified that intake-only counters must not force public bundle rebuilds. |
