# Knowledge Intake Command Center — Firebase Cost & Operations Contract

> **Status:** IMPLEMENTED — day-one cost-first contract
> **Version:** 2.0.0
> **Created:** 2026-05-31
> **Audience:** Engineering / Firebase / Ops

---

## 1. Cost Doctrine

Answerlattice intake is a licensed, bounded processing feature. Mutating and expensive API actions require an active Answerlattice beta/subscription on the workspace store document before URL fetch, source import, analysis, review updates, or publish.

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
- repeated reply import must stay inside the existing source/review/proposal path with no AI call, Storage upload, scheduler, new collection, or connector

Firestore is for compact metadata, capped extracted source text, review decisions, summaries, usage-ledger rows, and live approved records. Browser-side file extraction and server-side media extraction avoid raw file Storage writes; Storage paths below are reserved for a future native-upload/retained-evidence path.

Repeated reply import is an implemented low-cost subpath. It writes one existing source doc, then at most two review item docs during analysis: FAQ and canonical proposal. It does not create the default KB article draft for that source type.

The repeated-reply entity selector is search-gated. It does not load the ontology on page open. Search requests go through a protected, rate-limited Knowledge Intake API route, query the existing `answerlattice_entitySearchIndex` by tenant/store and prefix token, then read only the matched entity docs needed for labels and active/beta filtering. Older index rows without prefix tokens use a capped tenant/store search-index fallback; the route never fetches the full `answerlattice_entities` list for this form.

---

## 2. Collections

### New Collections

| Collection | Purpose | Growth profile |
| --- | --- | --- |
| `answerlattice_knowledgeIntakeJobs` | One compact job doc per intake run. | Low, one per owner-triggered run. |
| `answerlattice_knowledgeSources` | One compact source doc per selected source. | Bounded by plan/source caps. |
| `answerlattice_intakeReviewItems` | One doc per owner decision, not per fact. | Capped per job; query paginated. |
| `answerlattice_intakeUsageLedger` | Immutable support-credit reservation, settlement, and refund ledger for paid intake OCR/transcription. | Low/medium; one row per paid media extraction attempt. Client read-only; admin writes only. |

### Existing Destination Collections

| Collection | Use |
| --- | --- |
| `kb_articles` | Approved article output with `knowledgeLineage`. |
| `kb_categories` | Approved KB navigation output. |
| `answerlattice_faqs` | Approved short Q&A output. |
| `answerlattice_entityCandidates` | Product concepts needing review. |
| `answerlattice_entities` | Approved product ontology concepts. |
| `answerlattice_canonicalAnswers` | Approved support answers. |
| `answerlattice_mutationProposals` | Reviewable answer/update proposals. |
| `answerlattice_productSurfaces` | Page/workflow support mappings. |
| `answerlattice_supportBoardCards` | Only selected gaps/tasks, never raw facts. |
| `platformSummary` | Compact workspace summary, bucketed intake directory, source versions, readiness rollups, and repair state. |

---

## 3. Storage Paths

Day-one implementation does not upload raw files to Storage. Text-friendly files are parsed in the browser and sent as capped text sources. Screenshots/audio/video are sent to the protected media route, extracted by Gemini, and discarded after extracted support text is stored. Use the paths below only if native upload or retained evidence artifacts are added later.

```text
answerlattice_intake/AL/{tId}/{sId}/{intakeJobId}/sources/{sourceId}/original/{filename}
answerlattice_intake/AL/{tId}/{sId}/{intakeJobId}/sources/{sourceId}/normalized/manifest.json
answerlattice_intake/AL/{tId}/{sId}/{intakeJobId}/sources/{sourceId}/normalized/chunks.jsonl
answerlattice_intake/AL/{tId}/{sId}/{intakeJobId}/sources/{sourceId}/evidence/evidence.jsonl
answerlattice_intake/AL/{tId}/{sId}/{intakeJobId}/website-discovery/candidates.json
answerlattice_intake/AL/{tId}/{sId}/{intakeJobId}/website-discovery/fetch-log.jsonl
answerlattice_intake/AL/{tId}/{sId}/{intakeJobId}/product-map/product-map.json
answerlattice_intake/AL/{tId}/{sId}/{intakeJobId}/drafts/drafts.jsonl
answerlattice_intake/AL/{tId}/{sId}/{intakeJobId}/publish/publish-manifest.json
```

Storage metadata:

- `pId=AL`
- `tId`
- `sId`
- `intakeJobId`
- `sourceId`
- `sourceUse=answerlattice_knowledge_intake`
- `retentionPolicy=owner_selected`
- `containsUserProvidedData=true`

---

## 4. Summary Documents

Use summary documents as the primary read model. Owner dashboards, activation, scheduler repair, and ops monitoring must not discover intake state by scanning jobs, sources, or review items.

### 4.1 Workspace Summary

Implemented one compact workspace summary document:

```text
platformSummary/knowledgeIntakeSummary_{tId}_{sId}
```

Implemented day-one shape:

```ts
{
  schemaVersion: 1,
  pId: 'AL',
  tId: number,
  sId: number,
  activeJobId?: string,
  activeJobTitle?: string | null,
  activeJobs?: number,
  recentJobs?: number,
  readySources?: number,
  reviewItems?: number,
  acceptedItems?: number,
  publishedItems?: number,
  usageUnitsConsumed?: number,
  latestJobStatus?: string,
  summaryHash?: string,
  lastPublishedAt?: Timestamp,
  lastUpdated: Timestamp
}
```

Activation and dashboard pages should read this one doc instead of scanning jobs/sources/review items.

### 4.2 Nightly Intake Summary Refresh

Implemented in the existing Answerlattice nightly scheduler:

- task: `knowledge_intake_summary`
- function: `functions-answerlattice/src/answerlattice/knowledgeIntakeSummary.ts`
- flag: `ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE_SCHEDULER`
- reads: latest 20 `answerlattice_knowledgeIntakeJobs` for the tenant/store using the existing `(tId, sId, modifiedOn desc)` index
- writes: `platformSummary/knowledgeIntakeSummary_{tId}_{sId}` only when `summaryHash` changes
- never retries failed jobs
- never crawls URLs
- never calls AI providers
- never publishes review items

### 4.3 Runtime Signal Alignment

Published intake output flows through the existing KB, FAQ, product-surface, and mutation-proposal destinations. Runtime search records store matched entity IDs and fallback reason even when the final answer comes from FAQ, RAG, or the empty-response path. Widget feedback and escalation-ticket signals bind the first matched entity when available, so nightly mutation can skip unnecessary unresolved-signal update work.

Intake source metadata and usage-ledger metadata are bounded before write. Usage-ledger reservations fail closed unless the action is one of the supported Answerlattice intake actions (`answerlattice_intake_ocr`, `answerlattice_intake_transcription`, or `answerlattice_intake_embedding`), so a future caller cannot accidentally process paid intake work as a zero-unit unknown action. Active-license checks read the store subscription mirror first, then use a direct subscription doc or capped tenant/store subscription query only when the mirror is missing/stale. Canonical answer proposal review items must carry at least one related entity before acceptance/publish so downstream governance approval is never blocked by an entity-less proposal.

This gives activation/dashboard analytics without hidden processing or source/review scans.

### 4.2.1 Platform Intake Monitor

Implemented internal platform-owner monitor:

- route: `/platform/answerlattice-intake`
- API: `/api/platform/answerlattice-intake`
- flag: `ENABLE_ANSWERLATTICE_INTAKE_PLATFORM_MONITOR`
- auth: `platformRole === 'PLATFORM'`
- reads on initial refresh:
  - 1 `platformSummary/answerlatticeTenantsSummary` document for workspace selection
  - up to 8 `answerlattice_schedulerRunLogs` ordered by `startedAt desc`
- reads after a platform admin selects a workspace:
  - 1 `platformSummary/answerlatticeTenantsSummary` document
  - up to 10 scoped `answerlattice_knowledgeIntakeJobs` for the selected `tId/sId` ordered by `modifiedOn desc`
  - up to 10 scoped `answerlattice_intakeUsageLedger` rows for the selected `tId/sId` ordered by `createdOn desc`
  - up to 8 `answerlattice_schedulerRunLogs` ordered by `startedAt desc`
- writes: none
- listeners: none
- provider calls: none
- scheduler triggers: only when a platform admin explicitly clicks **Retry selected nightly**

This monitor is intentionally platform-owned and scoped. It exists so Answerlattice operators can verify intake adoption, failed jobs, paid media usage, refund behavior, and nightly summary health without opening individual tenant dashboards or scanning source/review-item collections. The manual retry action posts the selected `tId/sId` to the existing `triggerAnswerlatticeNightly` function, so recovery runs for one workspace instead of forcing all tenants.

### 4.3 Bucketed Intake Directory

Reserved. Not implemented because current scheduler work is summary-only and tenant discovery is already handled by the Answerlattice tenant summary.

If background repair or scheduled intake processing is enabled later, use a bucketed directory so scheduler/ops can find intake work without collection scans:

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
  pId: 'AL',
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

Future rules if this is enabled:

- bucket is `hash(tId_sId) % 32`
- update the directory entry in the same server transition that changes job/source/review state
- remove or mark inactive when workspace is deleted or Answerlattice access is revoked
- scheduler reads the bucket docs instead of scanning `answerlattice_knowledgeIntakeJobs`
- if tenant count grows enough to approach Firestore document limits, increase bucket count before expanding feature availability

### 4.4 Source Version Manifest

Day-one publish uses the existing Answerlattice compiled context pattern directly: runtime output writes mark `kb`, `docsNav`, `surfaces`, or `releases` stale as applicable. Canonical mutation proposals are governance-only and do not mark `canonical`; that happens only when a canonical answer becomes active through the approval workflow.

Reserved intake-only counters may be added later, but they are not written day one:

```text
platformSummary/sourceVersions_{tId}_{sId}
```

Reserved intake fields:

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

Future rules if intake-only counters are added:

- bump `knowledgeIntakeSources` when selected source content changes, not when discovered-but-skipped URLs change
- bump `knowledgeIntakeOutputs` when approved KB/FAQ/surface/runtime outputs are published
- bump `knowledgeIntakeReadiness` when readiness changes
- these intake-only fields may live on the same `sourceVersions_*` document for locality, but they must not be included in compiled context equality checks
- approved runtime output must separately bump the existing compiled context keys: `kb`, `docsNav`, `canonical`, `surfaces`, `releases`, `entities`, and `entityRelations` as applicable
- downstream bundle/context rebuilds compare runtime source versions and skip when unchanged

### 4.5 Summary Write Rules

Summary writes must be deterministic and sparse:

- update summaries in the same API/function transaction as the state transition where possible
- compute `summaryHash` from counters/readiness/active job/open preview
- skip summary writes when the hash is unchanged
- store only the top urgent review preview; full review lists stay paginated
- never rebuild summary by scanning all sources on dashboard load
- nightly summary refresh may rebuild only the compact workspace summary from bounded job docs
- no scheduler task may read source/review-item lists for intake analytics

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
| Read job preflight | 1/source | 0 | 0 | 0 |
| Dedupe by deterministic source id | 1/source | 0 | 0 | 0 |
| Re-check job cap/status in transaction | 1/source | 0 | 0 | 0 |
| Create source docs | 0 | N | 0 | 0 |
| Update job + workspace summary | 0 | 2/source | 0 | 0 |
| Upload source originals | 0 | 0 | 0 in day-one browser extraction | 0 |

The deterministic source id is derived from `{jobId}:{contentHash}`. URL content hashes use the normalized URL after fragment/tracking-param cleanup, not the raw pasted URL. This avoids a growing `answerlattice_knowledgeSources` list read for every add. Duplicate selected sources cost only the bounded job/source document reads and do not write a new source, increment counters, or call providers.

### 5.6 Normalize Sources

| Step | Reads | Writes | Storage | Provider |
| --- | ---: | ---: | ---: | ---: |
| Read job + source metadata | 1 + N | 0 | 0 | 0 |
| Read original source artifacts | 0 | 0 | N reads | 0 |
| Write normalized manifests/chunks | 0 | 0 | N writes | 0 |
| Update source status/counters | 0 | N bounded writes | 0 | 0 |
| Update changed source summary/version | 0 | 0-2 | 0 | 0 |
| OCR/transcription where selected | 1 duplicate source precheck | usage ledger + source writes only for new media | artifact reads/writes | paid provider calls only for new media |

### 5.7 Privacy Filter

| Step | Reads | Writes | Storage | Provider |
| --- | ---: | ---: | ---: | ---: |
| Redact source text before Firestore write | 0 | 0 | 0 | 0 |
| Record redaction count in source metadata | 0 | included in source write | 0 | 0 |
| Media extraction redaction prompt | 0 | 0 | 0 | included in paid media provider call |
| Post-extraction deterministic redaction | 0 | included in source write | 0 | 0 |

Text-friendly sources do not call a provider during draft generation. Media files are hash-checked before credit reservation; duplicates return the existing source without ledger writes or provider work. New media files are sent to the provider only for owner-triggered OCR/transcription after credit reservation; extracted text is redacted again before storage. Raw media is not retained.

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

Approved output must pay the small deterministic write cost needed to make the output visible in existing Answerlattice runtimes. Skipping these writes creates stale widget/search/help-center behavior and shifts the cost into manual repair.

| Destination changed | Required low-cost follow-up | Cost control |
| --- | --- | --- |
| KB article body/title/category/section | Bump KB cache version, update `kb_categories`, mark `kb`/`docsNav`, enqueue/perform embedding, invalidate `kb`/`context` public cache. | Batch article/category writes; embed only changed article text hash; skip cache/source writes when publish manifest hash is unchanged. |
| FAQ/custom Q&A | Bump KB cache version, invalidate `faqs`/`kb`/`context`, mark surface summary stale. | Use existing FAQ cache pattern instead of adding a FAQ cache source; batch FAQ writes by publish selection. |
| Canonical answer | Bump canonical cache version, mark `canonical`. | Only owner-approved active answers bump canonical runtime; drafts/proposals do not. |
| Product surface | Mark `surfaces`, rebuild or mark stale `contextContent_{tId}_{sId}`. | Rebuild summary once per publish batch, not once per surface. |
| Release-note source context | No changelog or release-timeline writes from intake. Use release notes only to prepare support drafts. | Owner-managed changelog writes own the `changelog`/`context` invalidation and release activation path. |
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

No job should continue hidden processing after a cap is reached. Day-one implementation rejects capped actions before they run; a future usage-allowance implementation may use `paused_limit` for resumable paid-processing jobs.

---

## 7. Indexes

Implemented day-one indexes:

| Collection | Fields | Purpose |
| --- | --- | --- |
| `answerlattice_knowledgeIntakeJobs` | `tId ASC, sId ASC, modifiedOn DESC` | Bounded job list |
| `answerlattice_knowledgeSources` | `tId ASC, sId ASC, jobId ASC, createdOn DESC` | Job source list |
| `answerlattice_knowledgeSources` | `tId ASC, sId ASC, jobId ASC, status ASC, createdOn ASC` | Analyze ready sources |
| `answerlattice_intakeReviewItems` | `tId ASC, sId ASC, jobId ASC, createdOn DESC` | Job review list |
| `answerlattice_intakeReviewItems` | `tId ASC, sId ASC, jobId ASC, status ASC` | Publish accepted items |

Lease state can live on the active job document and compact summary. Avoid a separate high-churn lock collection unless implementation proves it is needed.

No extra index is required for the summary scheduler because it reuses the bounded job-list index. If background import/repair processing is added later, discovery must use bucketed `platformSummary/knowledgeIntakeDirectory_*` docs.

---

## 8. Rules Requirements

Firestore rules:

- default deny
- require authenticated Answerlattice workspace user
- require matching `pId == "AL"`
- require matching `tId` and `sId` access
- disallow client writes for system-owned fields and expensive state transitions
- allow owner/staff reads according to Answerlattice staff permission claims
- high-risk approval writes require owner/admin role
- lease/worker fields are server-write only
- credit reservation/settlement fields are server-write only

Storage rules:

- restrict `answerlattice_intake/AL/{tId}/{sId}/...` to authorized workspace users
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
- validate and re-resolve DNS before fetching every redirected target
- cap redirects
- cap page count through owner-selected links
- cap candidate URL count
- cap response size
- stream response bodies only up to the byte cap instead of buffering full pages
- reject non-text content types
- cap crawl depth
- cap total fetch wall time
- block credentialed dashboard crawling, login forms, admin paths, and URLs requiring cookies
- strip common tracking parameters before dedupe
- prefer starting page links, sitemap links, and owner-selected paths in the day-one implementation
- store only owner-selected useful pages as Firestore sources
- compute content hash for selected source idempotency

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

Use the existing Answerlattice master scheduler pattern. Do not create a separate scheduled function for intake.

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
- intake scheduler analytics read the latest bounded job docs from already-discovered tenant scope
- summary refresh skips writes when `summaryHash` is unchanged
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
| 2026-05-31 | 1.5.0 | Added runtime fallback signal alignment and deterministic intake publish IDs to reduce duplicate writes and unresolved-signal repair work. |
