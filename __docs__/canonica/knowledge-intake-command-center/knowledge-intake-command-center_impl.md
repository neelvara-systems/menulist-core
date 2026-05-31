# Knowledge Intake Command Center — Technical Implementation Contract

> **Status:** IMPLEMENTED — day-one owner-triggered implementation
> **Version:** 2.0.0
> **Created:** 2026-05-31
> **Audience:** Engineering / QA / Product

---

## 1. Implementation Objective

Replace the current upload-first KB-generation experience with a Canonica-owned intake command center while preserving Canonica's existing KB, FAQ, product-surface, and canonical-governance runtime paths. Changelog remains an owner-managed release-note workflow that intake can read as source context but cannot publish into.

The legacy `/canonica/kb-generation` route redirects for compatibility, while `/canonica/knowledge-intake` is the Canonica-owned naming and contract:

- UI title: **Teach Canonica your product**
- Feature folder: `src/components/templates/canonica/knowledgeIntake/`
- Server implementation: `src/lib/canonica/knowledgeIntake.ts`
- API guard: `src/lib/canonica/knowledgeIntakeApi.ts`
- Types: `src/types/canonica/index.ts`
- APIs: `/api/canonica/knowledge-intake/*`
- Legacy route: `/canonica/kb-generation` redirects to `/canonica/knowledge-intake`

No MenuList-owned screen should become the long-term Canonica intake authority.

### 1.1 Implemented Route And API Map

| Surface | Path |
| --- | --- |
| Owner page | `src/app/(canonica)/canonica/knowledge-intake/page.tsx` |
| Legacy redirect | `src/app/(canonica)/canonica/kb-generation/page.tsx` |
| Jobs | `src/app/api/canonica/knowledge-intake/jobs/route.ts` |
| Job bundle | `src/app/api/canonica/knowledge-intake/jobs/[jobId]/route.ts` |
| Sources | `src/app/api/canonica/knowledge-intake/jobs/[jobId]/sources/route.ts` |
| Analyze | `src/app/api/canonica/knowledge-intake/jobs/[jobId]/analyze/route.ts` |
| Review item update | `src/app/api/canonica/knowledge-intake/jobs/[jobId]/review-items/[itemId]/route.ts` |
| Publish | `src/app/api/canonica/knowledge-intake/jobs/[jobId]/publish/route.ts` |
| URL discovery/fetch | `src/app/api/canonica/knowledge-intake/discover/route.ts` |
| Screenshot/media extraction | `src/app/api/canonica/knowledge-intake/jobs/[jobId]/media/route.ts` |
| Platform intake monitor | `src/app/(main)/platform/canonica-intake/page.tsx` |
| Platform intake monitor API | `src/app/api/platform/canonica-intake/route.ts` |

### 1.2 Day-One Scope Boundary

Implemented day one:

- owner-triggered job creation, source import, draft analysis, review, and publish
- browser-side text extraction for common text-friendly file types
- OCR extraction for screenshots/images and support-focused transcription/summary for short audio/video
- bounded public URL discovery and selected-page fetch
- active Canonica beta/subscription check on mutating and expensive actions
- Canonica support-credit reservation, settlement, refund-on-failure, and intake usage ledger rows for paid media extraction
- AI operation logging for OCR, transcription, and article embedding
- summary-only nightly intake analytics through the existing Canonica master scheduler
- platform-admin intake monitor that reads `canonicaTenantsSummary`, loads job/ledger details only for a selected workspace, and can trigger a selected-workspace Canonica nightly retry
- source-backed draft review items for KB, FAQ, product surfaces, and canonical mutation proposals
- publish into existing runtime collections with cache/source-version freshness updates

Not implemented day one:

- native helpdesk/OAuth connectors
- background crawler, hidden failed-job retry, or scheduler import
- raw file retention in Storage
- automatic canonical answer publishing
- direct entity writes without existing governance review

---

## 2. Current Runtime Evidence

| Behavior | Evidence |
| --- | --- |
| Canonica currently reuses platform KBGeneration | `src/app/(canonica)/canonica/kb-generation/page.tsx:10-17` |
| Empty state says upload source files | `src/components/templates/platform/KBGeneration/index.tsx:95-110` |
| Current title is Import Knowledge | `src/components/templates/platform/KBGeneration/index.tsx:137-141` |
| Upload creates text pseudo-files for URLs and starter answers | `src/components/templates/platform/KBGeneration/UploadModal.tsx:157-180` |
| Files upload directly to Storage from client | `src/components/templates/platform/KBGeneration/UploadModal.tsx:182-188` |
| Job created directly in Firestore | `src/database/kb-generation/jobs.ts:202-220` |
| Generation starts from `job.sourceFiles` | `functions/src/logic/startGeneration.ts:19-23` |
| Generated articles are written before owner approval | `functions/src/logic/startGeneration.ts:50-70`, `117-136` |
| Existing publish creates FAQs and updates KB categories | `functions/src/logic/publishApprovedJob.ts:307-327` |
| Free beta onboarding still exists | `src/app/api/canonica/onboard/route.ts:74`, `547-621` |

---

## 3. Required Feature Flags

Add client flags in `src/config/features.ts`:

```ts
ENABLE_CANONICA_KNOWLEDGE_INTAKE: true,
ENABLE_CANONICA_INTAKE_URL_DISCOVERY: true,
ENABLE_CANONICA_INTAKE_NATIVE_CONNECTORS: false,
ENABLE_CANONICA_INTAKE_MEDIA_EXTRACTION: true,
ENABLE_CANONICA_INTAKE_PLATFORM_MONITOR: true,
```

Add server flags in `functions-canonica/src/constants/features.ts`:

```ts
ENABLE_CANONICA_KNOWLEDGE_INTAKE_SCHEDULER: true,
ENABLE_CANONICA_INTAKE_NATIVE_CONNECTORS: false,
```

Native connectors stay false because Canonica does not need private helpdesk/OAuth credentials for this stage. The scheduler flag is true for summary-only analytics: it reads the latest bounded intake job docs and writes `platformSummary/knowledgeIntakeSummary_{tId}_{sId}` only when changed. It does not retry failed jobs, crawl URLs, call AI providers, or publish review items.

`ENABLE_CANONICA_INTAKE_PLATFORM_MONITOR` controls the internal `/platform/canonica-intake` screen and `/api/platform/canonica-intake` API. The monitor is platformRole-only. Initial load reads only `platformSummary/canonicaTenantsSummary` and recent scheduler logs. Job and ledger details are loaded only after a platform admin selects one `tId/sId` workspace. The retry action is explicit and posts that selected workspace to `triggerCanonicaNightly`; it does not run all tenants by default, add realtime listeners, or create tenant-facing controls.

---

## 4. Core Data Contracts

### 4.1 CanonicaKnowledgeSource

Day-one Firestore source docs keep capped extracted text because browser extraction avoids raw-file upload and Storage retention. The original long-term contract below remains the retained-artifact contract if native uploads/transcripts are added later.

```ts
export interface CanonicaKnowledgeSource {
  id: string;
  pId: 'CN';
  tId: number;
  sId: number;
  uId: string;
  intakeJobId: string;
  sourceType: 'product_context' | 'url' | 'file' | 'image' | 'media' | 'transcript' | 'changelog' | 'helpdesk_export' | 'surface' | 'policy_pack' | 'manual_answer';
  sourceSubType?: string;
  sourceRole?: 'product_home' | 'pricing' | 'feature_page' | 'docs' | 'faq' | 'changelog' | 'legal' | 'security' | 'api_docs' | 'app_login' | 'other';
  title: string;
  authorityTier: number;
  riskDomains: string[];
  status: 'added' | 'uploaded' | 'normalizing' | 'ready' | 'needs_review' | 'excluded' | 'failed' | 'deleted';
  sourceHash: string;
  sourceVersion: number;
  originalStoragePath?: string;
  normalizedManifestPath?: string;
  evidenceManifestPath?: string;
  discoveryManifestPath?: string;
  normalizedUrl?: string;
  canonicalUrl?: string;
  rootDomain?: string;
  robotsStatus?: 'allowed' | 'blocked' | 'unknown';
  httpStatus?: number;
  contentType?: string;
  etag?: string;
  lastModifiedHeader?: string;
  normalizedTextHash?: string;
  fileSizeBytes?: number;
  pageCount?: number;
  mediaDurationSeconds?: number;
  discoveredUrlCount?: number;
  selectedUrlCount?: number;
  retainedOriginal: boolean;
  expiresAt?: unknown;
  createdOn: unknown;
  modifiedOn: unknown;
}
```

Discovered website URLs do not become `CanonicaKnowledgeSource` documents until the owner selects them for processing. Candidate URL lists live in Storage manifests.

### 4.2 CanonicaWebsiteDiscoveryManifest

Stored in Storage. Firestore keeps only the manifest pointer and counters.

```ts
export interface CanonicaWebsiteDiscoveryManifest {
  id: string;
  pId: 'CN';
  tId: number;
  sId: number;
  intakeJobId: string;
  rootUrl: string;
  rootDomain: string;
  discoveredOn: string;
  discoveryMode: 'sitemap' | 'robots_sitemap' | 'llms_txt' | 'selected_paths' | 'bounded_html_links';
  candidateCounts: {
    discovered: number;
    eligible: number;
    blockedByRobots: number;
    skippedExternal: number;
    skippedLowValue: number;
    skippedTooLarge: number;
  };
  candidates: Array<{
    key: string;
    url: string;
    canonicalUrl?: string;
    title?: string;
    sourceRole: CanonicaKnowledgeSource['sourceRole'];
    reason: string;
    estimatedAuthorityTier: number;
    estimatedRiskDomains: string[];
    contentHash?: string;
    etag?: string;
    lastModifiedHeader?: string;
  }>;
}
```

### 4.3 CanonicaKnowledgeIntakeJob

```ts
export interface CanonicaKnowledgeIntakeJob {
  id: string;
  pId: 'CN';
  tId: number;
  sId: number;
  uId: string;
  status:
    | 'draft'
    | 'awaiting_payment'
    | 'preflight'
    | 'queued'
    | 'normalizing'
    | 'source_audit_ready'
    | 'product_map_ready'
    | 'needs_review'
    | 'generating_drafts'
    | 'ready_to_publish'
    | 'publishing'
    | 'published'
    | 'paused_limit'
    | 'failed'
    | 'cancelled';
  inputSummary: {
    sourceCount: number;
    urlCount: number;
    discoveredUrlCount: number;
    selectedUrlCount: number;
    fileCount: number;
    imageCount: number;
    mediaCount: number;
    helpdeskExportCount: number;
  };
  counters: {
    normalizedSources: number;
    failedSources: number;
    conflicts: number;
    gaps: number;
    reviewItems: number;
    draftArticles: number;
    draftFaqs: number;
    draftAnswers: number;
    surfaceSuggestions: number;
  };
  allowance: {
    planId: string;
    creditsReserved: number;
    creditsConsumed: number;
    creditsReleased: number;
    sourcePageCap: number;
    fileCap: number;
    mediaMinuteCap: number;
  };
  execution: {
    leaseId?: string;
    leaseExpiresAt?: unknown;
    currentStep?: 'discovery' | 'fetch' | 'normalize' | 'privacy_filter' | 'audit' | 'product_map' | 'drafts' | 'publish';
    retryCount: number;
    idempotencyKey: string;
  };
  storage: {
    auditManifestPath?: string;
    productMapManifestPath?: string;
    draftsManifestPath?: string;
    publishManifestPath?: string;
    websiteDiscoveryManifestPath?: string;
  };
  errorMessage?: string;
  createdOn: unknown;
  modifiedOn: unknown;
}
```

### 4.4 CanonicaIntakeReviewItem

Use one document per owner decision, not one document per fact.

```ts
export interface CanonicaIntakeReviewItem {
  id: string;
  pId: 'CN';
  tId: number;
  sId: number;
  intakeJobId: string;
  type: 'source_conflict' | 'knowledge_gap' | 'product_concept' | 'high_risk_draft' | 'answer_draft' | 'surface_suggestion' | 'safe_bulk_group';
  status: 'open' | 'approved' | 'rejected' | 'deferred' | 'resolved';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  ownerPrompt: string;
  sourceIds: string[];
  evidenceManifestPath?: string;
  proposedAction?: Record<string, unknown>;
  destination?: 'kb' | 'faq' | 'canonical_answer' | 'entity_candidate' | 'product_surface' | 'widget_suggestion' | 'support_board';
  assignedRole: 'owner_admin' | 'support_manager' | 'product_manager' | 'any_admin';
  createdOn: unknown;
  modifiedOn: unknown;
}
```

### 4.5 CanonicaKnowledgeIntakeSummary

`platformSummary/knowledgeIntakeSummary_{tId}_{sId}` is the primary UI read model.

```ts
export interface CanonicaKnowledgeIntakeSummary {
  schemaVersion: 1;
  pId: 'CN';
  tId: number;
  sId: number;
  activeJobId?: string | null;
  activeJobTitle?: string | null;
  activeJobs?: number;
  recentJobs?: number;
  readySources?: number;
  reviewItems?: number;
  acceptedItems?: number;
  publishedItems?: number;
  usageUnitsConsumed?: number;
  latestJobStatus?: string | null;
  summaryHash?: string;
  lastPublishedAt?: unknown;
  lastUpdated: unknown;
}
```

### 4.6 CanonicaKnowledgeIntakeDirectoryEntry

Reserved for future background repair. Current runtime does not need this because the intake flow is owner-triggered and the scheduler performs only summary refresh from known tenant scope.

If background import/repair processing is enabled later, `platformSummary/knowledgeIntakeDirectory_{bucket}` must be the scheduler/ops discovery read model.

```ts
export interface CanonicaKnowledgeIntakeDirectoryEntry {
  pId: 'CN';
  tId: number;
  sId: number;
  active: boolean;
  activeJobId?: string;
  activeJobStatus?: CanonicaKnowledgeIntakeJob['status'];
  dirty: boolean;
  openReviewCount: number;
  criticalReviewCount: number;
  sourceVersion: number;
  outputVersion: number;
  nextSummaryRepairAt?: unknown;
  lastIntakeChangedAt: unknown;
  updatedAt: unknown;
}
```

### 4.7 Published Output Lineage

Every destination write adds a compact lineage object:

```ts
knowledgeLineage: {
  intakeJobId: string;
  sourceIds: string[];
  sourcePageRefs?: string[];
  sourceVersions: Record<string, number>;
  evidenceManifestPath: string;
  publishManifestId: string;
  lastVerifiedOn: Timestamp;
}
```

Apply to:

- `kb_articles`
- `canonica_faqs`
- `canonica_canonicalAnswers`
- `canonica_entityCandidates`
- `canonica_productSurfaces`
- support board cards created from intake gaps

---

## 5. Firestore Collections

Add to Canonica constants:

- `CANONICA_KNOWLEDGE_SOURCES: 'canonica_knowledgeSources'`
- `CANONICA_KNOWLEDGE_INTAKE_JOBS: 'canonica_knowledgeIntakeJobs'`
- `CANONICA_INTAKE_REVIEW_ITEMS: 'canonica_intakeReviewItems'`
- `CANONICA_INTAKE_USAGE_LEDGER: 'canonica_intakeUsageLedger'`

Add platform summary document helpers:

- `knowledgeIntakeSummary_{tId}_{sId}`
- `knowledgeIntakeDirectory_{bucket}` reserved only for future scheduler repair
- existing compiled source-version helpers for destination runtime keys (`kb`, `docsNav`, `canonical`, `surfaces`, `releases`)

Use existing destination collections:

- `kb_articles`
- `kb_categories`
- `canonica_faqs`
- `canonica_entities`
- `canonica_entityCandidates`
- `canonica_canonicalAnswers`
- `canonica_mutationProposals`
- `canonica_productSurfaces`
- `canonica_supportBoardCards`
- `platformSummary`

---

## 6. Storage Contract

All heavy artifacts use Storage:

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

Firestore must not store:

- full parsed text
- full video transcript bodies
- every extracted fact
- every source section
- full draft bodies when not yet selected for publishing
- raw AI provider output

---

## 7. APIs

All routes require authenticated Canonica access. Mutating and expensive routes also require an active Canonica beta/subscription.

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/canonica/knowledge-intake/jobs` | GET/POST | Paginated job list and create job metadata. |
| `/api/canonica/knowledge-intake/jobs/[id]` | GET | Read job bundle with bounded sources and review items. |
| `/api/canonica/knowledge-intake/jobs/[id]/sources` | POST | Add selected URL, pasted text, or browser-extracted file text as a capped source. |
| `/api/canonica/knowledge-intake/jobs/[id]/analyze` | POST | Generate deterministic source-backed review drafts. |
| `/api/canonica/knowledge-intake/jobs/[id]/review-items/[itemId]` | PATCH | Update review item status/content before publish. |
| `/api/canonica/knowledge-intake/jobs/[id]/publish` | POST | Publish approved selected outputs. |
| `/api/canonica/knowledge-intake/discover` | POST | Bounded public URL discovery or selected page text fetch. |

Do not allow direct client Firestore writes for expensive state transitions.

Implemented now: media extraction preflight caps, support-credit reservation, ledger settlement, AI operation logging, and refund-on-failure for paid OCR/transcription. Still reserved for later: signed native uploads, raw artifact retention, source deletion, cancellation APIs, native connectors, and background import workers.

---

## 8. Processing Pipeline

The pipeline is one engine with adapters:

1. **Entitlement preflight**
   - active paid subscription
   - plan/credit allowance
   - workspace/product ownership
   - feature flags
   - source caps

2. **Website link discovery**
   - validate root URL and domain
   - resolve DNS before the first fetch and before every redirected fetch
   - reject localhost, private/link-local/metadata hosts, unsafe redirects, non-text responses, oversized responses, and redirect chains beyond the cap
   - inspect the starting page and sitemap links with bounded same-origin discovery
   - classify candidate pages by source role
   - keep candidates in the browser response; do not create source docs for skipped URLs

3. **Owner source selection**
   - owner chooses support-worthy website/docs pages
   - selected pages count against plan URL caps
   - selected pages become source records with source role and authority defaults

4. **Source registration**
   - creates `canonica_knowledgeSources`
   - stores capped source text, tags/context/entity hints, deterministic content hash, and deterministic source id
   - computes URL source hashes from the normalized URL, not raw tracking-param variants, so duplicate imports do not bypass dedupe
   - uses the deterministic source id for duplicate detection instead of scanning the full source list

5. **Upload/fetch**
   - browser extraction for text-friendly files with local file-size guard and source-text cap before API submission
   - server-side bounded URL fetch for selected pages/docs only
   - server-side OCR/transcription for supported media with raw-media hash dedupe before credit reservation
   - owner-supplied transcript path for unsupported/large media

6. **Normalization**
   - parse TXT/Markdown/CSV/JSON/DOCX/text-PDF/transcript
   - extract OCR/transcription text for supported images/audio/video
   - store capped source text in Firestore for current implementation
   - update source metadata only

7. **Privacy filter**
   - deterministically redacts obvious emails, payment-card-like numbers, API keys, tokens, JWTs, and password/secret assignments before source text is stored
   - records `privacyRedactionCount` in source metadata when redaction occurs
   - media extraction prompts instruct the model to redact private data, and the extracted text still passes through the deterministic redaction step before storage
   - unsupported high-risk workflows remain owner/manual; Canonica does not make raw source text authoritative

8. **Source audit**
   - classify source type
   - detect duplicates
   - compute source hash
   - identify high-risk content
   - find obvious conflicts and missing policies

9. **Product map**
   - extract product concepts, plans, roles, workflows, integrations, errors, pages
   - write map manifest to Storage
   - create review items for owner decisions

10. **Draft generation**
   - deterministic draft review items from selected ready source text
   - no LLM prompt for text-source draft generation in the day-one implementation
   - no raw corpus prompt
   - create review items and destination proposals

11. **Publish**
   - verify decisions and high-risk approvals
   - enforce destination limits
   - write approved outputs to existing collections
   - attach `knowledgeLineage`
   - bump cache/source version manifests
   - update compact intake/readiness summaries

12. **Summary update**
   - write `knowledgeIntakeSummary_{tId}_{sId}` with compact counters
   - rebuild existing context-content summary after publish
   - mark existing destination source-version fields stale only for the outputs that changed
   - Canonica nightly can refresh the summary from the latest bounded job docs without touching sources, review items, providers, or publish state

---

## 9. Adapters

| Adapter | Required behavior |
| --- | --- |
| Product context | Stores owner answers as high-authority sources. |
| Website link pack | Discover candidate public pages from sitemap, robots, llms.txt, canonical links, and bounded HTML links. Store candidates in Storage. Create Firestore source docs only for selected pages. |
| URL/docs | SSRF-safe fetch, max redirects, private IP block, robots/sitemap-aware, page caps, unchanged-source skip by hash/ETag/Last-Modified. |
| File upload | MIME + extension + size validation, ZIP path traversal protection, dedupe hash. |
| Image/OCR | Extract support-relevant text/labels after owner warning; store extracted support text as source evidence, not final truth. Costs 1 Canonica support credit. |
| Media/transcript | Transcript-first where available; raw short audio/video extraction is owner-triggered, capped, paid, and stores extracted support text only. Costs 2 Canonica support credits. |
| Helpdesk export | CSV/JSON/txt exports only; PII warning and redaction pass. |
| Changelog | Links changes to surfaces/entities and drift review. |
| Product surfaces | Seeds route/page/workflow mappings from starter templates or app URL context. |
| Policy pack | Owner-entered answers become high-authority but high-risk sources. |

---

## 10. Link Freshness And Reprocessing

URL imports must be idempotent and hash-driven.

Rules:

- normalize URLs before hashing by lowercasing host, removing fragments, stripping common tracking parameters, and resolving canonical links
- compute `sourceHash` from normalized URL, content hash, source role, and authority tier
- compute `normalizedTextHash` from extracted useful text after boilerplate removal
- when `etag`, `lastModifiedHeader`, content hash, and normalized text hash are unchanged, skip normalization, source audit, product map extraction, draft generation, embeddings, and provider calls for that source
- update only freshness metadata and summary counters on unchanged sources
- do not run automatic whole-site refresh; owner-triggered refresh and source-version manifests decide when selected links are checked

This keeps website link support useful without turning Canonica into a crawler.

---

## 11. Processing Orchestration

Expensive work must run through a bounded job worker, not one Firestore trigger per source.

Rules:

- one active expensive intake job per workspace by default
- per-job lease stored on the job document with `leaseId` and `leaseExpiresAt`
- every processing step is idempotent and can restart from Storage manifests
- Canonica support credits are reserved before paid OCR/transcription and settled after completion
- reserved credits are refunded when media extraction fails before a source is created
- source batches are processed in capped chunks
- no per-source `onWrite` trigger starts provider calls
- cancellation sets job status and prevents new steps from starting
- failed jobs are retried only when the owner explicitly runs the action again; there is no hidden failed-job retry loop

This protects Canonica from cost spikes when one owner uploads many files or adds a large website.

---

## 12. Summary-First Read Model

The implementation should mirror Canonica's existing tenant summary and compiled source-version pattern.

Rules:

- owner dashboard and activation can read `knowledgeIntakeSummary_{tId}_{sId}` for compact status
- full source/review/job lists are opened through bounded API reads
- no realtime listener is used for source/review/job lists
- scheduler work is summary-only: it reads the latest bounded intake job docs and writes one compact summary if the summary hash changed
- source-version fields let bundle/context rebuilds skip work when published outputs are unchanged
- direct client writes are never required for summary or version fields

Implementation helpers:

- `getKnowledgeIntakeSummaryDocId(tId, sId)`
- `buildSummaryPatch(scope, patch)`
- `refreshJobCounters(scope, jobId)`
- existing compiled-source-version helpers for destination runtime freshness
- `markKnowledgeIntakeOutputChanged(db, scope, metadata)`
- `repairKnowledgeIntakeSummary(db, scope)`

---

## 13. Permissions

Suggested permissions:

- `canonica.intake.view`
- `canonica.intake.manageSources`
- `canonica.intake.runProcessing`
- `canonica.intake.reviewLowRisk`
- `canonica.intake.reviewHighRisk`
- `canonica.intake.publish`
- `canonica.intake.deleteSources`

Approval rules:

- Owner/admin can approve all.
- Support manager can approve low/medium-risk articles, FAQs, and macros.
- Product manager can approve product concepts, workflows, and surfaces.
- Owner/admin only for high-risk domains.

---

## 14. UI Structure

Route layout:

```text
/canonica/kb-generation      compatibility redirect
/canonica/knowledge-intake   command center route
```

Tabs:

- Overview
- Sources
- Product Links
- Scan Results
- Product Map
- Decisions
- Drafts
- Publish
- Readiness

Founder copy:

- "Teach Canonica your product"
- "Add product link"
- "Canonica found 12 support-worthy pages"
- "Process selected pages"
- "Add anything you already have"
- "Canonica needs 7 decisions before launch"
- "Ready for onboarding"
- "Needs refund policy"
- "Approve answers"

Avoid owner-facing:

- chunks
- RAG
- embeddings
- ontology
- mutation proposals
- entity candidates
- materialization

---

## 15. Error And Retry Contract

Each major step must be owner-retryable from saved artifacts where artifacts exist. Canonica must not run hidden failed-job retries for intake.

| Failure | Required behavior |
| --- | --- |
| URL scan fails | Keep source record, mark failed, allow retry or manual source label. |
| Link discovery finds too many pages | Store candidate manifest, show top support-worthy pages, require owner selection before processing. |
| Selected URL is unchanged | Update freshness metadata only; no extraction, draft, embedding, or AI call. |
| File parse fails | Preserve original if retention allows, show file-level failure. |
| OCR/transcription fails | Refund reserved support credits, keep no raw media artifact, and let the owner upload a transcript or retry manually. |
| Privacy filter detects secrets/private data | Block provider prompts for that source and create owner review item. |
| AI classification fails | Allow manual classification; no blocking publish if source excluded. |
| Product map generation fails | Let the owner rerun analysis from saved sources. |
| Draft generation fails | Let the owner rerun selected draft analysis without re-upload. |
| Publish partially fails | Keep published item ids where available and let the owner rerun publish idempotently. |
| Limit reached | Pause job with `paused_limit`, no hidden processing continues. |
| Summary refresh fails | Record the scheduler task failure; next nightly/manual scheduler run can refresh the compact summary. No source extraction or publish retry is attempted. |

---

## 16. Integration With Existing KB Pipeline

Current `kb_generation_jobs` should not be deleted.

Implementation options:

1. Intake creates selected article drafts through a new destination publisher that writes to `kb_articles` with `status: needs_review`.
2. Intake can also create a compatibility `kb_generation_jobs` job when owner explicitly selects "Generate KB articles".
3. Existing ReviewModal/ReconciliationModal can be reused only if they are adapted to source lineage and high-risk review rules.

The final owner workflow should not start by uploading files into `platform/KBGeneration/UploadModal`.

---

## 17. Runtime Destination Alignment

Knowledge Intake must reuse Canonica's existing destination collections and runtime invalidation paths. Do not introduce a second search index, second FAQ store, second surface map, or intake-only content collection that the widget/search runtime does not already read.

### 17.1 Destination Publish Matrix

| Destination | Existing collection/path | Required intake fields | Required post-write actions |
| --- | --- | --- | --- |
| Help article | `kb_articles` | `pId`, `tId`, `sId`, `title`, article body, `status`, `categoryTitle`, `sectionTitle`, `tags`, `contextKeys`, `entityIds`, `knowledgeLineage` | Update `kb_categories`; enqueue or run article embedding; bump `CANONICA_CACHE_SOURCES.KB`; mark compiled sources `kb` and `docsNav`; invalidate public content cache for `kb`/`context`; rebuild or mark stale `contextContent_{tId}_{sId}`. |
| KB navigation | `kb_categories` | Tenant/store-scoped category and section references to approved articles | Mark compiled source `docsNav`; invalidate public content cache for `kb`/`context`. |
| FAQ/custom Q&A | `canonica_faqs` | `status: published`, `active: true`, `source`, `question`, `answer`, `articleId`, `articleTitle`, `canonicalAnswerId`, `entityIds`, `contextKeys`, `tags`, `knowledgeLineage` | Follow the existing FAQ DAL behavior: bump KB cache version, mark compiled `kb`, invalidate `faqs`/`kb`/`context`, and rebuild or mark stale surface content summary. |
| Canonical answer | `canonica_canonicalAnswers` | `status: active` only after approval, `scope.entityIds`, product binding, content, validation, signal metrics, governance, `knowledgeLineage` | Bump `CANONICA_CACHE_SOURCES.CANONICAL`; mark compiled `canonical`; never bypass approval/mutation rules for high-risk or authoritative answers. |
| Canonical answer proposal | `canonica_mutationProposals` | Intake draft title, structured summary, explanation, entity hints, source evidence, pending-review status | Governance-only. Do not mark compiled `canonical`, invalidate public runtime context, or make the answer authoritative until the normal canonical-answer approval path publishes it. |
| Entity candidate | `canonica_entityCandidates` | Candidate concept, evidence, source ids, risk/authority, owner decision state | No runtime search activation until approved. Keep owner review-gated. |
| Approved entity/relation | `canonica_entities`, `canonica_entityRelations`, `canonica_entity_search_index` | Approved entity fields, relationships, aliases/synonyms/search tokens, `knowledgeLineage` where useful | Mark compiled `entities`/`entityRelations`; rebuild deterministic entity search index; refresh graph/coverage summaries only if the relevant flags are enabled. |
| Product surface | `canonica_productSurfaces` | `key`, `label`, `routePatterns`, `feature`, `page`, `workflow`, `entityHints`, `entityIds`, `tags`, `visibility`, `active`, `priority`, `knowledgeLineage` | Mark compiled `surfaces`; rebuild or mark stale `contextContent_{tId}_{sId}` because widget related content depends on it. |
| Release-note source context | Existing changelog entries, release notes, GitHub release export, release email text | Source evidence only. Intake can use this context to draft KB, FAQ, product-surface, and canonical proposal output. | No changelog page writes, no release-timeline writes, and no `releases` source-version mark from intake. Owner-managed changelog writes own public cache invalidation and release activation. |
| Release timeline | `canonica_releases` | `versionLabel`, `versionNormalized`, `releasedAt`, owner-approved `entityChanges`, status lifecycle | Mark compiled `releases`; activation remains the drift trigger. Intake must not write or activate a release timeline. |
| Support Board card | `canonica_supportBoardCards` | Selected gap/task only, linked source/review item, private notes metadata | Feature-flag gated. Do not mirror every raw source, fact, ticket, or signal into the board. |

### 17.2 Search Runtime Contract

Current search behavior is the source of truth:

1. Canonical retrieval runs before FAQ and RAG.
2. FAQ/custom Q&A retrieval runs after canonical miss and before vector/RAG fallback.
3. RAG fallback uses embeddings on published `kb_articles`.
4. Product surface context can enrich retrieval and related content when context-aware flags are enabled.
5. Image-assisted search turns image evidence into a text query/context, then uses the same canonical/FAQ/RAG runtime path.

Implementation rules:

- Intake must not publish a topic as search-ready until every selected article that should power RAG has a current embedding.
- If embedding fails, keep the article visible in hosted help if approved, but mark search readiness as `partial` and expose the failed embedding item in the owner review/readiness summary.
- Intake screenshot/OCR output is source evidence. It becomes searchable only after it is converted into approved article, FAQ, canonical answer, entity, or surface output.
- Owner manual Q&A and generated FAQs must share the same `canonica_faqs` model so latency and retrieval behavior stay consistent.

### 17.3 Cache, Source-Version, And Bundle Rules

The existing runtime has two different freshness concepts:

1. Search/public content cache versions: currently `CANONICA_CACHE_SOURCES.KB` and `CANONICA_CACHE_SOURCES.CANONICAL`.
2. Compiled context source versions: `workspaceProfile`, `widgetConfig`, `kb`, `docsNav`, `entities`, `entityRelations`, `canonical`, `surfaces`, `releases`, `branding`, `mcpPolicy`, and `predictiveTriggers`.

Intake implementation must handle both:

- Article and FAQ output bumps KB cache and marks `kb`/`docsNav` where applicable.
- Canonical answer output bumps canonical cache and marks `canonical`.
- Surface output marks `surfaces`.
- Release-note source context does not mark `releases`; owner-managed changelog/release publishing owns that source-version path.
- Entity and relation output marks `entities` and `entityRelations`.
- Public/hosted help output invalidates the Canonica public content cache tags for the affected content type.
- Product-surface related content rebuilds or marks stale `contextContent_{tId}_{sId}` after article, FAQ, ticket, or surface changes that should affect page-aware suggestions. Owner-managed changelog changes use their own publish path.

Intake-only freshness fields are allowed, but they must not accidentally rebuild public bundles:

- `knowledgeIntakeSources`
- `knowledgeIntakeOutputs`
- `knowledgeIntakeReadiness`

If these fields are stored on `platformSummary/sourceVersions_{tId}_{sId}`, they must stay outside `CANONICA_CONTEXT_SOURCE_KEYS`, outside `normalizeCompiledSourceVersions`, and outside `compiledSourceVersionsEqual`. Runtime destination writes separately bump the existing compiled source keys listed above.

### 17.4 End-To-End Flow Check

Expected live path after implementation:

1. Owner adds product link/files/policies and approves selected sources.
2. Intake stores capped selected-source text/metadata in Firestore; raw file retention is reserved for a future native-upload path.
3. Intake creates review items and source-backed drafts.
4. Owner approves destinations.
5. Publisher writes existing runtime destination records with `knowledgeLineage`.
6. Publisher runs destination-specific post-write actions from the matrix above.
7. Hosted help renders approved KB/FAQ output through existing public content paths. Owner-published changelog entries continue to render through the Changelog workflow.
8. Widget/help search answers through canonical-first retrieval, FAQ retrieval, and embedded article fallback.
9. Page-aware related content uses the refreshed product-surface summary.
10. Misses, negative feedback, and low confidence remain signal/governance input, not auto-published truth.

---

## 18. Evaluation Harness

Create QA workspaces and fixtures:

- clean SaaS docs
- no-docs product with only product link + policy pack
- conflicting pricing docs
- old PDF with stale plan
- large website with many low-value pages
- website with sitemap, llms.txt, and pricing/docs/legal pages
- repeated website import with unchanged hashes
- billing-heavy product
- API/developer product
- image/screenshot import
- transcript import
- helpdesk CSV export
- source containing API keys/private customer records
- many-source job that tests source caps, bounded review generation, manual retry, and credit refund
- summary-only scheduler refresh through bounded latest-job reads
- runtime publish fixture that proves approved intake output appears in hosted help, FAQ retrieval, canonical-first search, vector/RAG fallback, widget related content, and compiled context bundle rebuilds without duplicate retrieval collections

Expected outputs are defined in `knowledge-intake-command-center_test-cases.md`.

---

## 19. Implementation Completion Checklist

- Feature flags added client/server.
- Constants added to app/functions Canonica DB constants.
- Firestore rules deny by default and scope by `pId/tId/sId`.
- Storage retained-artifact path is reserved; day-one browser extraction and media extraction avoid raw upload/retention.
- Entitlement check blocks mutating and expensive APIs.
- Day-one processing is owner-triggered and bounded; no intake worker, lease, cancellation, or credit settlement is enabled.
- API and type constraints enforce source/review/publish caps.
- Source registry and job models implemented.
- Full source bodies are capped in Firestore; no raw original files are retained day one.
- Website link discovery returns bounded candidates and creates Firestore source docs only for owner-selected pages.
- URL fetch adapter has SSRF/private-network protection and size/time caps.
- Review queue keeps canonical answer drafts as mutation proposals; no authoritative answer is auto-published.
- Published outputs include source metadata/lineage where the destination supports it.
- Runtime destination post-write actions are implemented for KB articles, FAQs, product surfaces, public content cache, compiled context source versions, article embeddings, and product-surface summaries. Canonical mutation proposals remain governance-only until approved through the canonical-answer workflow, and changelog publishing remains owner-managed outside intake.
- No intake-only source/readiness counters are written day one.
- Published article embeddings are attempted during publish; failures leave `embeddingStatus: failed` without blocking help-center publication.
- Workspace summary doc updates from owner-triggered server transitions and from summary-only Canonica nightly analytics.
- No intake scheduler crawls, failed-job retries, provider calls, or publish retries are added.
- Existing KB generation still works or redirects safely.
- Docs, website, help docs, and changelog updated from code truth before launch.

---

## 20. Version History

| Date | Version | Change |
| --- | --- | --- |
| 2026-05-31 | 1.0.0 | Initial technical contract for Canonica Knowledge Intake Command Center. |
| 2026-05-31 | 1.1.0 | Added first-class website link discovery, selected URL source creation, and hash-driven reprocessing rules. |
| 2026-05-31 | 1.2.0 | Added bounded job orchestration, lease/idempotency rules, credit settlement, and privacy filtering. |
| 2026-05-31 | 1.3.0 | Added summary-first read model, bucketed intake directory, source-version fields, and summary repair helpers. |
| 2026-05-31 | 1.4.0 | Added runtime destination matrix and search/cache/bundle alignment rules for existing Canonica KB, FAQ, canonical, surface, release, widget, and hosted-help flows. |
