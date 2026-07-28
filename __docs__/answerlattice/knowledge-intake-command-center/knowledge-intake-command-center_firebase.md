# Knowledge Intake Command Center — Firebase Cost & Operations Contract

> **Status:** IMPLEMENTED — day-one cost-first contract
> **Version:** 2.2.0
> **Created:** 2026-05-31
> **Last Updated:** 2026-07-26
> **Audience:** Engineering / Firebase / Ops

---

## 1. Cost Doctrine

Answerlattice intake is a licensed, bounded processing feature. Mutating and expensive API actions require an active Answerlattice beta/subscription on the workspace store document before URL fetch, source import, analysis, review updates, or publish.

License and paid-intake fallback reads constrain exact dual `AL` product identity plus agreeing `tenantId/tId` and `storeId/sId` before their five-row limit, and every direct or fallback document is revalidated transactionally. The store summary is only a document-ID hint; exact store and subscription ownership remain authoritative.

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

### Dedicated Functions identity and provider-file boundary

The Answerlattice generation, publishing, embedding, task-dispatch and completion lifecycle admits only exact positive decimal safe-integer `tId`/`sId` values and exact `pId = AL`. Each transition re-reads the stored job/article scope before changing publication state. Coercible legacy values such as whitespace, leading-zero, decimal, exponent, boolean or object representations fail closed.

Source files uploaded to the Gemini File API are tracked for the current generation attempt and deleted through the product-owned AI gateway in `finally` using bounded retry/key rotation. Cleanup failure does not replace the primary generation result, but the provider operation remains visible through the gateway diagnostics. No uploaded source file is intentionally retained as a cache.

Firestore is for compact metadata, capped extracted source text, review decisions, summaries, usage-ledger rows, and live approved records. Browser-side file extraction and server-side media extraction avoid raw file Storage writes; Storage paths below are reserved for a future native-upload/retained-evidence path.

Repeated reply import is an implemented low-cost subpath. It writes one existing source doc, then at most two review item docs during analysis: FAQ and canonical proposal. It does not create the default KB article draft for that source type.

The repeated-reply entity selector is search-gated. It does not load the ontology on page open. Search requests go through a protected, rate-limited Knowledge Intake API route, query the existing `answerlattice_entitySearchIndex` by tenant/store and prefix token, then read only the matched entity docs needed for labels and active/beta filtering. Older index rows without prefix tokens use a capped tenant/store search-index fallback; the route never fetches the full `answerlattice_entities` list for this form.

### Current-versus-reserved boundary

Unless a section below explicitly says implemented, retained Storage artifacts, discovery/evidence/draft/publish manifests, intake-specific source-version counters, source deletion, retention choices, cancellation, background workers, and scheduler repair directories are reserved architecture. The current runtime stores capped extracted text and bounded/redacted metadata in Firestore, does not retain raw media, returns discovery candidates without persisting them, and relies on existing destination cache/source-version invalidation after approved publishing.

Owner review evidence is projected from the sources already returned in the bounded active-job bundle. Showing up to three excerpts and applicability tags adds 0 Firestore reads, 0 writes, 0 listeners, 0 provider calls, and no new evidence collection.

---

## 2. Collections

### New Collections

| Collection | Purpose | Growth profile |
| --- | --- | --- |
| `answerlattice_knowledgeIntakeJobs` | One compact job doc per intake run. | Low, one per owner-triggered run. |
| `answerlattice_knowledgeSources` | One compact source doc per selected source. | Bounded by plan/source caps. |
| `answerlattice_intakeReviewItems` | One doc per owner decision, not per fact. | Capped per job; query paginated. |
| `answerlattice_intakeUsageLedger` | Workspace-bound support-credit reservation, settlement, and refund ledger for paid intake OCR/transcription, including billing-period and actual refunded/expired credit evidence. | Low/medium; one row per paid media extraction attempt. Client read-only; admin writes only. |
| `answerlattice_aiOperations/{tId}/{sId}` | AI operation accounting rows for media extraction and publish-time embedding. | Low/medium; one row per provider-backed intake call. Owner reads are through the billing usage page. |

### Existing Destination Collections

| Collection | Use |
| --- | --- |
| `kb_articles` | Approved article output with intake job/review/source ID lineage fields. |
| `kb_categories` | Approved KB navigation output. |
| `answerlattice_faqs` | Approved short Q&A output. |
| `answerlattice_mutationProposals` | Reviewable answer/update proposals. |
| `answerlattice_productSurfaces` | Page/workflow support mappings. |
| `platformSummary` | Compact workspace intake summary plus existing runtime destination source versions. Bucketed intake directories and intake-specific source-version counters are reserved. |

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

Use summary documents as compact downstream/activation/ops read models. The owner command center uses the capped job-list API and one bounded active-job bundle API; it does not scan source or review collections directly. Scheduler and ops monitoring must not discover intake state through unbounded jobs, sources, or review-item scans.

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
  sourceCount?: number,
  readySources?: number,
  reviewItems?: number,
  acceptedItems?: number,
  publishedItems?: number,
  rejectedItems?: number,
  usageUnitsConsumed?: number,
  lastJobStatus?: string,
  summaryHash?: string,
  lastPublishedAt?: Timestamp,
  lastUpdated: Timestamp
}
```

Activation and aggregate operational views may read this document. The owner command center intentionally uses the bounded job list plus selected active-job bundle because the summary does not contain source/review detail.

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

Answerlattice App Billing Document ID Boundary: Knowledge Intake active-license checks and support-credit reservation, settlement, and refund code normalize subscription summary IDs and intake usage ledger IDs before Admin Firestore document refs. Malformed subscription summary IDs fall through to the scoped subscription query, and malformed ledger IDs return before finalize/refund document refs.

Knowledge Intake routes that pass a `rateLimitKey` through `requireAnswerlatticeKnowledgeIntakeContext()` keep their existing workspace-scoped throttle values, but blocked requests now return private no-store retry metadata and write a bounded security event before any paid or mutating intake work continues.

Knowledge Intake route ID admission is cost-neutral for valid traffic and fail-closed for malformed traffic. `src/lib/answerlattice/knowledgeIntakeIdBoundary.ts` accepts only Firestore auto-ID shaped job IDs for protected job routes, deterministic `kis_` source IDs for source refs, and deterministic `kii_` review item IDs for review-item updates or publish `itemIds`; malformed route/body IDs return fixed invalid job or invalid review item responses before Firestore reads/writes, Storage reads/writes, provider calls, AI-operation rows, support-credit ledgers, summary writes, or cache/source-version updates. The shared service ref helpers in `src/lib/answerlattice/knowledgeIntake.ts` enforce the same ID boundary before direct job/source/review document refs.

Paid media extraction now writes both ledgers:

Reservation failure recovery attempts to move the claimed media source to its failed state before returning the primary error. If that marker write also fails, a bounded `answerlattice_intake_media_reservation_recovery_failed` diagnostic is emitted. This changes no normal-path operation count; it makes the already-attempted recovery failure visible so lease/claim expiry or manual retry can be investigated.

- `answerlattice_intakeUsageLedger` remains the support-credit reservation, settlement, and refund source of truth, including monthly-vs-top-up debit source, reservation/refund billing periods, actual refunded versus expired monthly credits, before/after balances, token counts, and token count source. Finalize/refund are transaction-serialized and reject a ledger whose workspace does not match the supplied scope.
- `answerlattice_aiOperations/{tId}/{sId}` records action, model, processing time, units, support-credit debit breakdown, provider/estimated token counts, and token count source for billing visibility and ops cost tracking.

Publish-time embedding logs a zero-unit internal `answerlattice_intake_embedding` operation with token metadata. It does not charge support credits separately.

This gives activation/dashboard analytics without hidden processing or source/review scans.

### 4.2.1 Platform Intake Monitor

Implemented internal platform-owner monitor:

- route: `/platform/answerlattice-intake`
- API: `/api/platform/answerlattice-intake`
- flag: `ENABLE_ANSWERLATTICE_INTAKE_PLATFORM_MONITOR`
- auth: `platformRole === 'PLATFORM'`
- read admission: shared `DATA_READ` gate after query validation and before tenant summary, scheduler-log, job, or usage-ledger reads
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
- browser response validation: 0 Firestore reads/writes; monitor snapshot and retry responses are parsed through a 512 KB bounded reader before UI state changes
- scheduler triggers: only when a platform admin explicitly clicks **Retry selected nightly**

This monitor is intentionally platform-owned and scoped. It exists so Answerlattice operators can verify intake adoption, failed jobs, paid media usage, refund behavior, and nightly summary health without opening individual tenant dashboards or scanning source/review-item collections. The manual retry action posts the selected `tId/sId` to the existing `triggerAnswerlatticeNightly` function, so recovery runs for one workspace instead of forcing all tenants.

The manual retry API validates the configured trigger target before the outbound fetch. Production accepts only `https://us-central1-answerlattice-qa.cloudfunctions.net/triggerAnswerlatticeNightly` or `https://us-central1-answerlattice.cloudfunctions.net/triggerAnswerlatticeNightly`; development may use a localhost emulator URL with the same trigger path. The target then passes through the app-server DNS guard, and the route fetches the normalized URL only with manual redirect handling. Target rejection, redirect responses, and manual retry failures log or return fixed runtime responses with bounded target or tenant/store metadata. The manual trigger response body is capped at 512 KB, sanitized to scheduler status/run/task-count metadata, and required for successful retry acknowledgement. This adds one DNS lookup per valid manual retry and no Firestore reads/writes beyond the existing workspace-summary read, no new collections, no Cloud Function logic changes, no retry queue, no public route, no owner setting, and no Firebase deploy requirement.

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

Day-one publish uses the existing Answerlattice compiled context pattern directly: articles/FAQs update KB freshness, articles mark `docsNav`, and product surfaces mark `surfaces`. Intake never marks `releases`. Canonical mutation proposals are governance-only and do not mark `canonical`; that happens only when a canonical answer becomes active through the approval workflow.

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
- approved runtime output must separately bump only the existing compiled-context keys owned by its destination workflow. Current intake owns KB freshness/`docsNav` for articles, KB freshness for FAQs, and `surfaces` for product surfaces; canonical activation, releases, entities, and entity relations remain owned by their separate approval workflows
- downstream bundle/context rebuilds compare runtime source versions and skip when unchanged

### 4.5 Summary Write Rules

Summary writes must be deterministic and sparse:

- update summaries in the same API/function transaction as the state transition where possible
- normal job/source/review transitions write bounded counter and active-job patches in their owning server transactions
- the nightly aggregate refresh computes `summaryHash` from bounded recent-job counters/status and skips its write when unchanged
- do not embed review-item previews in the summary; the owner reads review detail only through the bounded active-job bundle
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
| Read current workspace intake summary in transaction | 1 | 0 | 0 | 0 |
| Create job doc | 0 | 1 | 0 | 0 |
| Merge workspace intake summary | 0 | 1 | 0 | 0 |

Job creation does not reserve support credits. Credit reservation occurs only for the provider-backed media-extraction and first-trusted-answer-pack paths that declare a supported intake action.

### 5.3 Current Leases And Credit Reservation

| Step | Reads | Writes | Storage | Provider |
| --- | ---: | ---: | ---: | ---: |
| Claim media source processing run | transactional source/job reads | source processing-run write | 0 | 0 |
| Claim analysis, launch-pack, or publish run | transactional job read | job run-state write | 0 | 0 |
| Reserve credits for media extraction or launch pack | subscription/ledger transaction reads | bounded subscription + ledger writes | 0 | 0 |
| Reject overlapping unexpired run | job/source read already required | 0 | 0 | 0 |

The runtime serializes overlapping work through source-level or job-level run leases. It does not maintain a separate workspace-wide intake lock collection or reserve credits for deterministic analysis/publish work.

### 5.4 Website Link Discovery

| Step | Reads | Writes | Storage | Provider |
| --- | ---: | ---: | ---: | ---: |
| Read job/subscription/cap summary | 1-3 | 0 | 0 | 0 |
| Fetch starting page and same-origin `/sitemap.xml` | 0 | 0 | bounded network fetches | 0 |
| Return bounded candidate list | 0 | 0 | 0 | 0 |
| Create source docs for skipped URLs | 0 | 0 | 0 | 0 |

Discovery is paid-gated processing. It performs bounded network work but does not write a discovery manifest to Storage.

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
| Read capped source text/metadata | N bounded | 0 | 0 | 0 |
| Write normalized source fields when changed | 0 | N bounded writes | 0 | 0 |
| Update source status/counters | 0 | N bounded writes | 0 | 0 |
| Update changed source/job summary | 0 | bounded writes | 0 | 0 |
| OCR/transcription where selected | 1 duplicate source precheck | usage ledger + source writes only for new media | 0 | paid provider calls only for new media |

### 5.7 Privacy Filter

| Step | Reads | Writes | Storage | Provider |
| --- | ---: | ---: | ---: | ---: |
| Redact source text before Firestore write | 0 | 0 | 0 | 0 |
| Record redaction count in source metadata | 0 | included in source write | 0 | 0 |
| Media extraction redaction prompt | 0 | 0 | 0 | included in paid media provider call |
| Post-extraction deterministic redaction | 0 | included in source write | 0 | 0 |

Text-friendly sources do not call a provider during draft generation. Media files are hash-checked before credit reservation; duplicates return the existing source without ledger writes or provider work. New media files are sent to the provider only for owner-triggered OCR/transcription after credit reservation; extracted text is redacted again before storage. Raw media is not retained.

### 5.8 Deterministic Source-To-Review Analysis

| Step | Reads | Writes | Storage | Provider |
| --- | ---: | ---: | ---: | ---: |
| Read source metadata | N bounded | 0 | 0 | 0 |
| Read capped normalized source records | N bounded | 0 | 0 | 0 |
| Deterministic source-to-review analysis | 0 | 0 | 0 | 0 |
| Write bounded review evidence/source links | 0 | capped review-item writes | 0 | 0 |
| Create review items | 0 | capped writes | 0 | 0 |
| Update job + summary | 0 | bounded writes | 0 | 0 |

### 5.9 Draft Generation

| Step | Reads | Writes | Storage | Provider |
| --- | ---: | ---: | ---: | ---: |
| Read selected review/source metadata | capped | 0 | 0 | 0 |
| Read selected bounded source/review evidence | capped | 0 | 0 | 0 |
| Generate deterministic review drafts | 0 | 0 | 0 | 0 |
| Store review-item draft bodies | 0 | capped writes | 0 | 0 |
| Create/update review items | 0 | capped writes | 0 | 0 |

### 5.10 Publish

| Step | Reads | Writes | Storage | Provider |
| --- | ---: | ---: | ---: | ---: |
| Read job + selected review items | capped | 0 | 0 | 0 |
| Read accepted review items and destination state | capped | 0 | 0 | 0 |
| Write approved outputs | 0 | bounded by selected items | 0 | 0 |
| Rebuild required product-surface context summary | bounded capped destination/source reads | 1 summary replacement | 0 | 0 |
| Embedding for published KB article outputs | 0 | one update/article | 0 | embedding calls |
| Update existing destination cache/source versions | 0 | bounded writes | 0 | 0 |
| Update aggregate intake/job summary | bounded transaction reads | bounded writes | 0 | 0 |

### 5.11 Runtime Destination Post-Write Cost

Approved output must pay the small deterministic write cost needed to make the output visible in existing Answerlattice runtimes. Skipping these writes creates stale widget/search/help-center behavior and shifts the cost into manual repair.

| Destination changed | Required low-cost follow-up | Cost control |
| --- | --- | --- |
| KB article body/title/category/section | Bump KB cache version, update `kb_categories`, mark `kb`/`docsNav`, enqueue/perform embedding, invalidate `kb`/`context` public cache. | Batch article/category writes; embed only changed article text hash; deterministic destination IDs prevent duplicate records on retry. |
| FAQ/custom Q&A | Require the batch product-surface summary rebuild, bump KB cache version, and invalidate `faqs`/`kb`/`context`. | Use the existing FAQ cache pattern instead of adding a FAQ cache source; deterministic destination IDs prevent duplicates. |
| Canonical answer | Bump canonical cache version, mark `canonical`. | Only owner-approved active answers bump canonical runtime; drafts/proposals do not. |
| Product surface | Require one batch rebuild of `contextContent_{tId}_{sId}`, then mark `surfaces` and invalidate `context`. | Rebuild summary once per publish batch, not once per surface. |
| Release-note source context | No changelog or release-timeline writes from intake. Use release notes only to prepare support drafts. | Owner-managed changelog writes own the `changelog`/`context` invalidation and release activation path. |

Product-surface summary rebuild is intentionally bounded by the existing caps for active surfaces, published articles, published FAQs, recent changelog pages, and recent tickets. The intake publisher requires it once after staging a non-canonical publish batch and before cache/source/public freshness plus terminal review settlement. A failed rebuild rejects the attempt and leaves exact deterministic target markers retryable; there is no intake scheduler-repair fallback.

---

## 6. Plan Caps

Current day-one limits are shared static Knowledge Intake constraints, not plan-configured per-tier fields. A future plan-specific allowance design may introduce fields such as:

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

These fields are reserved and are not current plan-schema claims. No job should continue hidden processing after a current shared cap is reached. Day-one implementation rejects capped actions before they run; a future usage-allowance implementation may use `paused_limit` for resumable paid-processing jobs.

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
- review/governance mutations require the existing `MANAGE_KNOWLEDGE` permission; there is no separate intake-specific high-risk role matrix
- lease/worker fields are server-write only
- credit reservation/settlement fields are server-write only

Future retained-artifact Storage rules:

- restrict `answerlattice_intake/AL/{tId}/{sId}/...` to authorized workspace users
- enforce size/content-type where rules can help
- block public reads
- deletion would require owner/admin or source owner with permission; no current intake source-delete path depends on this rule

Expensive processing routes/functions must enforce server-side auth regardless of rules.

---

## 9. Retention And TTL — Reserved

The current Knowledge Intake feature has no source-level delete/cancel API or per-source retention selector. Raw media is discarded after extraction. The rules below are a future lifecycle contract and must not be presented as implemented behavior.

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
- cap total fetch wall time
- reject credential-bearing URLs and never attach cookies or login credentials
- strip common tracking parameters before dedupe
- prefer starting page links, sitemap links, and owner-selected paths in the day-one implementation
- store only owner-selected useful pages as Firestore sources
- compute content hash for selected source idempotency

No background full-site crawl.

### 10.1 Current Re-Import Cost Rules

No selected-link freshness poll or source-version refresh workflow is implemented. An owner-triggered selected-page import fetches the page, normalizes/caps/redacts the text, and derives a deterministic source ID from the job and content hash. Identical content returns the existing source without counter/review duplication; changed content creates a distinct source for review. Discovered-but-skipped URLs are never refreshed or persisted.

---

## 11. Firebase Cost Estimate

Do not publish fixed per-intake read/write estimates until production telemetry is available. Current cost is bounded by the documented source, review-item, publish-item, and list caps:

- job creation: one summary read plus one job write and one summary write
- each new source: bounded job/source transaction reads plus one source write and job/summary counter updates
- identical source re-import: bounded job/source reads and no new source/counter write
- analysis: bounded ready-source and existing-review reads plus capped review/job/summary writes
- publish: bounded job/review/destination reads plus selected destination writes, destination cache/source-version updates, and one article embedding attempt per published KB article
- Storage uploads/downloads: zero for the current Knowledge Intake path
- provider calls: owner-triggered media extraction, first trusted answer pack generation, and published article embeddings only

The expensive part is provider work and repeated destination writes, not raw-file Storage. Paid preflight, deterministic IDs, leases, and caps are mandatory.

Scheduler/ops cost:

- Owner command center reads the capped job list and selected active-job bundle; aggregate/activation/ops views may read the workspace summary.
- Nightly analytics receives already-known tenant/store scope, reads bounded recent job docs, and writes only when the summary hash changes.
- No scheduler collection scan of sources, discovered URLs, or review items.

---

## 12. Scheduler And Summary Repair

Use the existing Answerlattice master scheduler pattern. Do not create a separate scheduled function for intake.

Allowed scheduler work:

- refresh the compact intake summary from bounded recent job docs

Not allowed scheduler work by default:

- full website crawl
- broad selected-link refresh
- AI draft generation from intake sources
- source extraction for dormant workspaces
- collection scans over all intake jobs/sources/review items

If selected-link freshness checks are added for paid plans, they require a new approved discovery contract and per-run caps. The current scheduler does not inspect sources or manifests.

---

## 13. Cost Impact Summary

When implemented with this contract:

- owner command-center load uses the capped job list and selected active-job bundle; it does not scan collections or open realtime listeners
- intake scheduler analytics read the latest bounded job docs from already-discovered tenant scope
- summary refresh skips writes when `summaryHash` is unchanged
- source bodies are capped/redacted before Firestore persistence so document growth remains bounded
- no realtime listener is needed for job/history/review lists
- refresh remains explicit through the current owner flow; no active-job listener or background polling is implemented
- no scheduler crawl runs by default
- discovered-but-skipped website URLs are not persisted as Storage manifests or Firestore source documents
- selected URL fetch bodies are streamed and capped before text normalization; non-streaming responses fail closed unless they declare a safe content length
- identical selected-page sources avoid duplicate source/counter/review writes after the bounded fetch/hash step
- source/job run leases reject overlapping unexpired work for the same media source or job operation
- credit reservation/settlement prevents hidden overrun and releases unused reserved credits
- bounded redaction keeps supported common secret/PII patterns out of stored extracted text and metadata; owners must still avoid uploading sensitive raw media
- runtime output writes reuse existing KB/canonical/source-version/cache paths instead of creating duplicate retrieval collections
- intake summary counters do not rebuild public bundles because no intake-only compiled source-version keys are written
- product-surface summary rebuild happens once per affected publish batch, not once per output item
- nightly intake analytics use bounded recent job docs and do not inspect source-version manifests

Knowledge Intake client response validation and request-policy hardening add no Firestore reads, writes, deletes, listeners, API routes, provider calls, Storage operations, scheduler work, cache invalidations, or support-credit ledger changes. The browser calls now pin no-store cache, same-origin credentials, and manual redirect handling, then reject malformed, oversized, rejected, or wrong-shape responses before local intake state, entity-option cache, bundle refresh, or success copy advances.

Knowledge Intake route ID admission and shared service ref helper normalization add no Firestore reads, writes, deletes, listeners, API routes, provider calls, Storage operations, scheduler work, cache invalidations, or support-credit ledger changes for valid traffic. Invalid job/source/review item IDs stop before the existing job/source/review reads and before any mutating/provider-backed intake work.

---

## 14. Version History

| Date | Version | Change |
| --- | --- | --- |
| 2026-07-05 | 2.1.4 | Documented cost-neutral Knowledge Intake route and shared service ID admission for Firestore auto-ID shaped job params, deterministic `kis_` source IDs, and deterministic `kii_` review item IDs. |
| 2026-06-30 | 2.1.3 | Documented shared Knowledge Intake browser request policy with no Firebase cost-shape change. |
| 2026-06-30 | 2.1.2 | Documented bounded Knowledge Intake client response validation with no Firebase cost-shape change. |
| 2026-06-20 | 2.1.1 | Added token count source and support-credit debit breakdown to media extraction accounting notes. |
| 2026-05-31 | 1.0.0 | Initial Firebase/cost contract for Knowledge Intake Command Center. |
| 2026-05-31 | 1.1.0 | Added website link discovery cost model, selected-source Firestore rules, and unchanged-link refresh skip rules. |
| 2026-05-31 | 1.2.0 | Added lease/concurrency, credit reservation/settlement, and privacy-filter cost controls. |
| 2026-05-31 | 1.3.0 | Added summary-first read model, bucketed intake directory, source-version manifest, and scheduler repair contract. |
| 2026-05-31 | 1.4.0 | Added runtime destination post-write cost matrix and clarified that intake-only counters must not force public bundle rebuilds. |
| 2026-05-31 | 1.5.0 | Added runtime fallback signal alignment and deterministic intake publish IDs to reduce duplicate writes and unresolved-signal repair work. |
| 2026-07-18 | 2.1.5 | Reconciled cost/storage tables with the current no-manifest, no-raw-retention, bounded-Firestore runtime and marked deletion, cancellation, intake-specific source versions, and retained artifacts as reserved. |
| 2026-07-18 | 2.1.6 | Corrected job creation, run leases, URL discovery/re-import, provider, Storage, and scheduler cost claims to the current implementation. |
| 2026-07-26 | 2.2.0 | Reconciled owner versus aggregate read models, exact summary fields, current static caps/permissions, required publish-summary recovery, source-version keys and cost tables. |
