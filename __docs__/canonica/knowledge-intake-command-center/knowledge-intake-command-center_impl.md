# Knowledge Intake Command Center — Technical Implementation Contract

> **Status:** PLANNED — Day-one implementation contract
> **Version:** 1.0.0
> **Created:** 2026-05-31
> **Audience:** Engineering / QA / Product

---

## 1. Implementation Objective

Replace the current upload-first KB-generation experience with a Canonica-owned intake command center while preserving the existing KB generation and publishing pipeline as a compatibility output path.

Current route may remain `/canonica/kb-generation` for compatibility, but the implementation should introduce Canonica-owned naming and contracts:

- UI title: **Teach Canonica your product**
- Feature folder: `src/components/templates/canonica/knowledgeIntake/`
- DAL folder: `src/database/canonica/knowledgeIntake/`
- Types: `src/types/canonica/knowledgeIntake.ts`
- APIs: `/api/canonica/knowledge-intake/*`
- Cloud Functions: `functions-canonica/src/canonica/knowledgeIntake/*`

No MenuList-owned screen should become the long-term Canonica intake authority.

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
ENABLE_CANONICA_INTAKE_URL_IMPORT: true,
ENABLE_CANONICA_INTAKE_OCR: true,
ENABLE_CANONICA_INTAKE_MEDIA_TRANSCRIPTION: true,
ENABLE_CANONICA_INTAKE_EXPORT_IMPORTS: true,
ENABLE_CANONICA_INTAKE_NATIVE_CONNECTORS: false,
```

Add server flags in `functions-canonica/src/constants/features.ts`:

```ts
ENABLE_CANONICA_KNOWLEDGE_INTAKE: true,
ENABLE_CANONICA_INTAKE_URL_IMPORT: true,
ENABLE_CANONICA_INTAKE_OCR: true,
ENABLE_CANONICA_INTAKE_MEDIA_TRANSCRIPTION: true,
ENABLE_CANONICA_INTAKE_EXPORT_IMPORTS: true,
ENABLE_CANONICA_INTAKE_NATIVE_CONNECTORS: false,
```

Native connectors stay false until their credential, retention, and provider-rate contracts exist. Export imports cover helpdesk history day-one.

---

## 4. Core Data Contracts

### 4.1 CanonicaKnowledgeSource

Compact Firestore metadata only. Raw and parsed bodies live in Storage.

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
  pId: 'CN';
  tId: number;
  sId: number;
  activeJobId?: string;
  activeJobStatus?: CanonicaKnowledgeIntakeJob['status'];
  activeJobStep?: CanonicaKnowledgeIntakeJob['execution']['currentStep'];
  lastPublishedJobId?: string;
  sourceCounts: { total: number; ready: number; failed: number; highRisk: number };
  linkDiscovery: { discovered: number; eligible: number; selected: number; skipped: number };
  reviewCounts: { open: number; critical: number; highRisk: number; safeBulk: number };
  readiness: Record<string, 'ready' | 'partial' | 'not_ready' | 'needs_review'>;
  urgentReviewPreview: Array<{ id: string; type: string; title: string; riskLevel: string }>;
  allowance: { planId: string; creditsRemaining: number; sourcePageRemaining: number; fileRemaining: number };
  sourceVersion: number;
  outputVersion: number;
  summaryHash: string;
  dirty: boolean;
  updatedAt: unknown;
}
```

### 4.6 CanonicaKnowledgeIntakeDirectoryEntry

`platformSummary/knowledgeIntakeDirectory_{bucket}` is the scheduler/ops discovery read model.

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
- `knowledgeIntakeDirectory_{bucket}`
- `sourceVersions_{tId}_{sId}` with `knowledgeIntakeSources`, `knowledgeIntakeOutputs`, and `knowledgeIntakeReadiness`

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

All routes require authenticated Canonica access and paid entitlement where expensive.

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/canonica/knowledge-intake/preflight` | POST | Validate sources, estimate credits, enforce plan caps before upload/scan. |
| `/api/canonica/knowledge-intake/link-discovery` | POST | Paid, bounded product website discovery that writes candidate manifests, not source docs. |
| `/api/canonica/knowledge-intake/signed-upload` | POST | Return scoped upload targets for approved files. |
| `/api/canonica/knowledge-intake/jobs` | GET/POST | Paginated job list and create job metadata. |
| `/api/canonica/knowledge-intake/jobs/[id]` | GET/PATCH | Read job summary, cancel, retry safe steps. |
| `/api/canonica/knowledge-intake/summary` | GET | Read the compact workspace summary for dashboard/activation. |
| `/api/canonica/knowledge-intake/jobs/[id]/sources` | GET/POST | Paginated source list and add source metadata. |
| `/api/canonica/knowledge-intake/jobs/[id]/review-items` | GET/PATCH | Paginated review queue and decisions. |
| `/api/canonica/knowledge-intake/jobs/[id]/generate-drafts` | POST | Start draft generation after audit/product map acceptance. |
| `/api/canonica/knowledge-intake/jobs/[id]/publish` | POST | Publish approved selected outputs. |
| `/api/canonica/knowledge-intake/jobs/[id]/delete-source` | POST | Delete source, artifacts, and dependent unapproved drafts. |

Do not allow direct client Firestore writes for expensive state transitions.

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
   - resolve DNS and redirects with private-network blocking
   - inspect robots, sitemap, canonical links, llms.txt, and owner-selected paths
   - classify candidate pages by source role
   - write `website-discovery/candidates.json` and `fetch-log.jsonl` to Storage
   - update job counters only; do not create source docs for skipped URLs

3. **Owner source selection**
   - owner chooses support-worthy website/docs pages
   - selected pages count against plan URL caps
   - selected pages become source records with source role and authority defaults

4. **Source registration**
   - creates `canonica_knowledgeSources`
   - stores authority defaults, risk defaults, hash/idempotency key

5. **Upload/fetch**
   - direct upload for files
   - server-side bounded URL fetch for selected pages/docs only
   - transcript extraction or owner-supplied transcript for media

6. **Normalization**
   - parse file/HTML/CSV/XLSX/PPTX/JSON/ZIP/transcript
   - OCR images when enabled
   - write normalized chunks to Storage JSONL
   - update source metadata only

7. **Privacy filter**
   - detect secrets, tokens, credentials, payment data, private customer records, and obvious PII
   - write redacted evidence manifests for provider prompts
   - create review items when high-risk private content cannot be safely redacted
   - block draft generation for unsafe sources until owner action

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
   - selected evidence only
   - bounded prompts
   - no raw corpus prompt
   - write draft bodies to Storage
   - create review items and destination proposals

11. **Publish**
   - verify decisions and high-risk approvals
   - enforce destination limits
   - write approved outputs to existing collections
   - attach `knowledgeLineage`
   - bump cache/source version manifests
   - update compact intake/readiness summaries

12. **Summary/directory update**
   - compute summary hash from counters, readiness, active job, and preview
   - write `knowledgeIntakeSummary_{tId}_{sId}` only when changed
   - update `knowledgeIntakeDirectory_{bucket}` in the same server transition
   - bump source-version fields for selected-source or output changes

---

## 9. Adapters

| Adapter | Required behavior |
| --- | --- |
| Product context | Stores owner answers as high-authority sources. |
| Website link pack | Discover candidate public pages from sitemap, robots, llms.txt, canonical links, and bounded HTML links. Store candidates in Storage. Create Firestore source docs only for selected pages. |
| URL/docs | SSRF-safe fetch, max redirects, private IP block, robots/sitemap-aware, page caps, unchanged-source skip by hash/ETag/Last-Modified. |
| File upload | MIME + extension + size validation, ZIP path traversal protection, dedupe hash. |
| Image/OCR | Extract text/labels only after owner warning; store evidence, not final truth. |
| Media/transcript | Transcript-first; raw media duration cap and paid confirmation. |
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
- credit allowance is reserved before processing and settled after completion
- unused reserved credits are released when the job is cancelled, fails before provider work, or skips unchanged sources
- source batches are processed in capped chunks
- no per-source `onWrite` trigger starts provider calls
- cancellation sets job status and prevents new steps from starting
- retry uses step state and manifests, not fresh upload/fetch unless required

This protects Canonica from cost spikes when one owner uploads many files or adds a large website.

---

## 12. Summary-First Read Model

The implementation should mirror Canonica's existing tenant summary and compiled source-version pattern.

Rules:

- owner dashboard and activation load `knowledgeIntakeSummary_{tId}_{sId}` first
- full source/review/job lists are opened only through paginated tabs
- urgent launch decisions preview is embedded in the summary so the first screen does not need a review-list query
- scheduler and ops discovery read bucketed `knowledgeIntakeDirectory_{bucket}` docs, not `canonica_knowledgeIntakeJobs`
- summary repair runs only for directory entries marked `dirty` or active
- source-version fields let bundle/context rebuilds skip work when intake sources/outputs/readiness are unchanged
- direct client writes are never allowed for summary, directory, lease, or version fields

Implementation helpers:

- `getKnowledgeIntakeSummaryDocId(tId, sId)`
- `getKnowledgeIntakeDirectoryBucket(tId, sId)`
- `getKnowledgeIntakeDirectoryDocId(bucket)`
- `updateKnowledgeIntakeSummaryFromTransition(db, scope, patch)`
- `markKnowledgeIntakeSourceChanged(db, scope, metadata)`
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
/canonica/kb-generation      compatibility redirect or wrapper
/canonica/knowledge-intake   command center route, if route migration is accepted
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

Each major step must be retryable from saved artifacts:

| Failure | Required behavior |
| --- | --- |
| URL scan fails | Keep source record, mark failed, allow retry or manual source label. |
| Link discovery finds too many pages | Store candidate manifest, show top support-worthy pages, require owner selection before processing. |
| Selected URL is unchanged | Update freshness metadata only; no extraction, draft, embedding, or AI call. |
| File parse fails | Preserve original if retention allows, show file-level failure. |
| OCR/transcription fails | Keep source, allow transcript upload fallback. |
| Privacy filter detects secrets/private data | Block provider prompts for that source and create owner review item. |
| AI classification fails | Allow manual classification; no blocking publish if source excluded. |
| Product map generation fails | Retry from normalized artifacts. |
| Draft generation fails | Retry selected drafts without re-upload. |
| Publish partially fails | Publish manifest records succeeded/failed writes; retry idempotently. |
| Limit reached | Pause job with `paused_limit`, no hidden processing continues. |
| Summary repair fails | Mark directory entry dirty and retry through Canonica scheduler with capped attempts. |

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
| Entity candidate | `canonica_entityCandidates` | Candidate concept, evidence, source ids, risk/authority, owner decision state | No runtime search activation until approved. Keep owner review-gated. |
| Approved entity/relation | `canonica_entities`, `canonica_entityRelations`, `canonica_entity_search_index` | Approved entity fields, relationships, aliases/synonyms/search tokens, `knowledgeLineage` where useful | Mark compiled `entities`/`entityRelations`; rebuild deterministic entity search index; refresh graph/coverage summaries only if the relevant flags are enabled. |
| Product surface | `canonica_productSurfaces` | `key`, `label`, `routePatterns`, `feature`, `page`, `workflow`, `entityHints`, `entityIds`, `tags`, `visibility`, `active`, `priority`, `knowledgeLineage` | Mark compiled `surfaces`; rebuild or mark stale `contextContent_{tId}_{sId}` because widget related content depends on it. |
| Changelog entry | `changelog/{tId}/{sId}/page_*` | Existing changelog entry fields, `tags`, `kbSources`/source references where available, `knowledgeLineage` | Invalidate public content cache for `changelog`/`context`; mark compiled `releases` only when release context changed; rebuild or mark stale surface content summary. |
| Release timeline | `canonica_releases` | `versionLabel`, `versionNormalized`, `releasedAt`, owner-approved `entityChanges`, status lifecycle | Mark compiled `releases`; activation remains the drift trigger. Intake should not activate a release until entity changes are owner-approved. |
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
- Changelog/release output marks `releases`.
- Entity and relation output marks `entities` and `entityRelations`.
- Public/hosted help output invalidates the Canonica public content cache tags for the affected content type.
- Product-surface related content rebuilds or marks stale `contextContent_{tId}_{sId}` after article, FAQ, changelog, ticket, or surface changes that should affect page-aware suggestions.

Intake-only freshness fields are allowed, but they must not accidentally rebuild public bundles:

- `knowledgeIntakeSources`
- `knowledgeIntakeOutputs`
- `knowledgeIntakeReadiness`

If these fields are stored on `platformSummary/sourceVersions_{tId}_{sId}`, they must stay outside `CANONICA_CONTEXT_SOURCE_KEYS`, outside `normalizeCompiledSourceVersions`, and outside `compiledSourceVersionsEqual`. Runtime destination writes separately bump the existing compiled source keys listed above.

### 17.4 End-To-End Flow Check

Expected live path after implementation:

1. Owner adds product link/files/policies and approves selected sources.
2. Intake stores raw/heavy artifacts in Storage and compact selected-source metadata in Firestore.
3. Intake creates review items and source-backed drafts.
4. Owner approves destinations.
5. Publisher writes existing runtime destination records with `knowledgeLineage`.
6. Publisher runs destination-specific post-write actions from the matrix above.
7. Hosted help renders approved KB/FAQ/changelog output through existing public content paths.
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
- many-source job that tests lease, cancellation, retry, and credit release
- dirty summary repair through bucketed platformSummary directory
- runtime publish fixture that proves approved intake output appears in hosted help, FAQ retrieval, canonical-first search, vector/RAG fallback, widget related content, and compiled context bundle rebuilds without duplicate retrieval collections

Expected outputs are defined in `knowledge-intake-command-center_test-cases.md`.

---

## 19. Implementation Completion Checklist

- Feature flags added client/server.
- Constants added to app/functions Canonica DB constants.
- Firestore rules deny by default and scope by `pId/tId/sId`.
- Storage rules restrict `canonica_intake/CN/{tId}/{sId}/...`.
- Entitlement check blocks all expensive APIs/functions.
- Intake worker enforces one active expensive job per workspace, lease, idempotency, cancellation, and credit settlement.
- Source preflight estimates cost and caps.
- Source registry and job models implemented.
- No full source bodies in Firestore.
- Website link discovery creates Storage candidate manifests and no Firestore docs for skipped URLs.
- URL fetch adapter has SSRF protection, tracking-param stripping, canonical URL normalization, and unchanged-source skip.
- Privacy filter blocks secrets/private data before provider prompts.
- ZIP adapter has zip-slip protection.
- Review queue enforces high-risk approval.
- Published outputs include `knowledgeLineage`.
- Cache/source version manifests update after selected-source and publish changes.
- Runtime destination post-write actions are implemented for KB articles, FAQs, canonical answers, entities, product surfaces, changelog/release output, public content cache, compiled context source versions, article embeddings, and product-surface summaries.
- Intake-only source/readiness counters do not force public context bundle rebuilds unless approved runtime destination content also changed.
- Published article topics are not marked search-ready until embeddings are current, or readiness explicitly reports partial search coverage.
- Workspace summary doc and bucketed intake directory update from server transitions.
- Scheduler repair reads bucketed directory docs and never scans all intake collections.
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
