# Knowledge Intake Command Center — Technical Implementation Contract

> **Status:** IMPLEMENTED — day-one owner-triggered implementation
> **Version:** 2.1.0
> **Created:** 2026-05-31
> **Last Updated:** 2026-07-20
> **Audience:** Engineering / QA / Product

---

## 1. Implementation Objective

Knowledge Intake accounting accepts only exact safe-integer credit, byte, token, reservation, charge and refund evidence. Persisted numeric strings, fractions, unsafe integers, invalid billing periods and arithmetic overflow fail before provider work or settlement; no `Number(...)` compatibility coercion is part of the billing contract.

Replace the current upload-first KB-generation experience with an Answerlattice-owned intake command center while preserving Answerlattice's existing KB, FAQ, product-surface, and canonical-governance runtime paths. Changelog remains an owner-managed release-note workflow that intake can read as source context but cannot publish into.

The legacy `/answerlattice/kb-generation` route redirects for compatibility, while `/answerlattice/knowledge-intake` is the Answerlattice-owned naming and contract:

- UI title: **Teach Answerlattice your product**
- Feature folder: `src/components/templates/answerlattice/knowledgeIntake/`
- Server implementation: `src/lib/answerlattice/knowledgeIntake.ts`
- API guard: `src/lib/answerlattice/knowledgeIntakeApi.ts`
- Types: `src/types/answerlattice/index.ts`
- APIs: `/api/answerlattice/knowledge-intake/*`
- Legacy route: `/answerlattice/kb-generation` redirects to `/answerlattice/knowledge-intake`

No MenuList-owned screen should become the long-term Answerlattice intake authority.

The dedicated Answerlattice Functions pipeline treats stored job/article scope as an exact identity contract at generation, publish, embedding dispatch and worker completion. It does not coerce malformed tenant/store aliases. Publishing/embedding transitions are re-read transactionally, and every Gemini provider file uploaded for source generation receives a best-effort retrying delete attempt in the generation `finally` path.

Duplicate-candidate persistence remains compact: `articlesToReview` and article reconciliation metadata store bounded article summaries and IDs. The private reconciliation drawer resolves at most three selected IDs through the scoped article DAL and uses a separate UI-only resolved type for full Tiptap bodies; full article documents are not copied into the ingestion job contract.

### 1.1 Implemented Route And API Map

| Surface | Path |
| --- | --- |
| Owner page | `src/app/(answerlattice)/answerlattice/knowledge-intake/page.tsx` |
| Legacy redirect | `src/app/(answerlattice)/answerlattice/kb-generation/page.tsx` |
| Jobs | `src/app/api/answerlattice/knowledge-intake/jobs/route.ts` |
| Job bundle | `src/app/api/answerlattice/knowledge-intake/jobs/[jobId]/route.ts` |
| Sources | `src/app/api/answerlattice/knowledge-intake/jobs/[jobId]/sources/route.ts` |
| Source governance | `src/app/api/answerlattice/knowledge-intake/jobs/[jobId]/sources/[sourceId]/governance/route.ts` |
| Analyze | `src/app/api/answerlattice/knowledge-intake/jobs/[jobId]/analyze/route.ts` |
| Product-specific starter pack | `src/app/api/answerlattice/knowledge-intake/jobs/[jobId]/launch-pack/route.ts` |
| Review item update | `src/app/api/answerlattice/knowledge-intake/jobs/[jobId]/review-items/[itemId]/route.ts` |
| Publish | `src/app/api/answerlattice/knowledge-intake/jobs/[jobId]/publish/route.ts` |
| URL discovery/fetch | `src/app/api/answerlattice/knowledge-intake/discover/route.ts` |
| Product entity search | `src/app/api/answerlattice/knowledge-intake/entities/route.ts` |
| Screenshot/media extraction | `src/app/api/answerlattice/knowledge-intake/jobs/[jobId]/media/route.ts` |
| Platform intake monitor | `src/app/(main)/platform/answerlattice-intake/page.tsx` |
| Platform intake monitor API | `src/app/api/platform/answerlattice-intake/route.ts` |

Protected job routes use `src/lib/answerlattice/knowledgeIntakeIdBoundary.ts` before any job, source, review-item, media, analysis, or publish read/write. Job route params accept only Firestore auto-ID shaped job IDs, and review-item route params or publish `itemIds` accept only deterministic `kii_` review item IDs. Malformed route/body IDs return fixed invalid job or invalid review item responses before job/review reads, source additions, media extraction, analysis, or publish work starts.

### 1.2 Day-One Scope Boundary

Implemented day one:

- owner-triggered job creation, source import, draft analysis, review, and publish
- browser-side text extraction for common text-friendly file types
- OCR extraction for screenshots/images and support-focused transcription/summary for short audio/video
- bounded public URL discovery and selected-page fetch
- active Answerlattice beta/subscription check on mutating and expensive actions
- Answerlattice support-credit reservation, settlement, refund-on-failure, and intake usage ledger rows for paid media extraction
- AI operation logging for OCR, transcription, and article embedding
- summary-only nightly intake analytics through the existing Answerlattice master scheduler
- platform-admin intake monitor that reads `answerlatticeTenantsSummary`, loads job/ledger details only for a selected workspace, and can trigger a selected-workspace Answerlattice nightly retry
- source-backed draft review items for KB, FAQ, product surfaces, and canonical mutation proposals
- guided repeated reply import that stores a `repeated_reply` source and creates focused FAQ/canonical proposal drafts without creating the default KB article draft
- bounded repeated-reply entity autocomplete backed by the existing ontology search index, with no page-load entity fetch
- publish into existing runtime collections with cache/source-version freshness updates

Not implemented day one:

- native helpdesk/OAuth connectors
- email inbox sync or reply-template queues
- background crawler, hidden failed-job retry, or scheduler import
- raw file retention in Storage
- automatic canonical answer publishing
- direct entity writes without existing governance review

---

## 2. Legacy Migration Evidence

The evidence below records the upload-first runtime that the Answerlattice-owned intake route replaced. It is migration context, not the current Knowledge Intake authority.

| Behavior | Evidence |
| --- | --- |
| Answerlattice currently reuses platform KBGeneration | `src/app/(answerlattice)/answerlattice/kb-generation/page.tsx:10-17` |
| Empty state says upload source files | `src/components/templates/platform/KBGeneration/index.tsx:95-110` |
| Current title is Import Knowledge | `src/components/templates/platform/KBGeneration/index.tsx:137-141` |
| Upload creates text pseudo-files for URLs and starter answers | `src/components/templates/platform/KBGeneration/UploadModal.tsx:157-180` |
| Files upload directly to Storage from client | `src/components/templates/platform/KBGeneration/UploadModal.tsx:182-188` |
| Job created directly in Firestore | `src/database/kb-generation/jobs.ts:202-220` |
| Generation starts from `job.sourceFiles` | `functions/src/logic/startGeneration.ts:19-23` |
| Generated articles are written before owner approval | `functions/src/logic/startGeneration.ts:50-70`, `117-136` |
| Existing publish creates FAQs and updates KB categories | `functions/src/logic/publishApprovedJob.ts:307-327` |
| Free beta onboarding still exists | `src/app/api/answerlattice/onboard/route.ts:74`, `547-621` |

---

## 3. Required Feature Flags

The current app flags in `src/config/features.ts` are:

```ts
ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE: true,
ENABLE_ANSWERLATTICE_INTAKE_URL_DISCOVERY: true,
ENABLE_ANSWERLATTICE_INTAKE_NATIVE_CONNECTORS: false,
ENABLE_ANSWERLATTICE_INTAKE_MEDIA_EXTRACTION: true,
ENABLE_ANSWERLATTICE_INTAKE_PLATFORM_MONITOR: true,
ENABLE_ANSWERLATTICE_REPEATED_REPLY_IMPORT: true,
ENABLE_ANSWERLATTICE_SOURCE_GOVERNANCE: false,
```

The current server flag in `functions-answerlattice/src/constants/features.ts` is:

```ts
ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE_SCHEDULER: true,
```

`ENABLE_ANSWERLATTICE_INTAKE_NATIVE_CONNECTORS` is a reserved app-side placeholder with no runtime consumer. There is intentionally no matching Functions flag, connector route, OAuth callback, credential store, provider adapter, or sync worker. Adding a mirrored server flag before a real docs-first implementation would create false capability evidence.

`ENABLE_ANSWERLATTICE_REPEATED_REPLY_IMPORT` enables the focused repeated-question/reusable-reply input. `ENABLE_ANSWERLATTICE_SOURCE_GOVERNANCE` is default-off controlled rollout for manual evidence governance; missing governance remains readable as unreviewed evidence, and disabling the flag removes the governance mutation/UI without changing stored source compatibility.

The scheduler flag is true for summary-only analytics: it reads the latest bounded intake job docs and writes `platformSummary/knowledgeIntakeSummary_{tId}_{sId}` only when changed. It does not retry failed jobs, crawl URLs, call AI providers, or publish review items.

`ENABLE_ANSWERLATTICE_INTAKE_PLATFORM_MONITOR` controls the internal `/platform/answerlattice-intake` screen and `/api/platform/answerlattice-intake` API. The monitor is platformRole-only. Initial load reads only `platformSummary/answerlatticeTenantsSummary` and recent scheduler logs. Job and ledger details are loaded only after a platform admin selects one `tId/sId` workspace. The retry action is explicit and posts that selected workspace to `triggerAnswerlatticeNightly`; it does not run all tenants by default, add realtime listeners, or create tenant-facing controls.

Platform monitor load and manual retry failures use fixed platform-admin copy in `src/components/templates/main-app/platform/answerlatticeIntakeMonitor/index.tsx` and `src/app/api/platform/answerlattice-intake/route.ts`; route response text, callable failure text, and browser exception messages are not copied into the UI. The browser caller parses monitor snapshot and retry responses through a 512 KB bounded response reader and requires the documented snapshot/retry envelope, including the sanitized retry result/task summary shape, before replacing table state or showing retry success.

The manual retry API now resolves the configured `triggerAnswerlatticeNightly` target before fetch. Production accepts only the fixed Answerlattice Cloud Functions hosts for `answerlattice-qa` or `answerlattice` with the `/triggerAnswerlatticeNightly` path. Development may use a localhost emulator URL with the same trigger path. The route then validates the target through the app-server DNS guard, fetches only the normalized URL, and uses manual redirect handling so 3xx responses are failed trigger responses rather than followed to a new target. Invalid trigger configuration returns the existing generic configuration failure, and target rejection/manual retry failures log fixed runtime codes with bounded target or tenant/store metadata. The route also caps the Cloud Function trigger response at 512 KB, forwards only a sanitized scheduler summary, and logs `answerlattice_intake_monitor_manual_trigger_response_parse_failed` or `answerlattice_intake_monitor_manual_trigger_response_invalid` before returning fixed invalid-response copy for malformed successful trigger responses.

---

## 4. Core Data Contracts

### 4.1 AnswerlatticeKnowledgeSource

Current Firestore source docs keep capped extracted text because browser extraction and protected media extraction avoid raw-file Storage retention. They may also carry the controlled-rollout manual `governance` map shown below. Automatic authority ranking, conflict discovery/resolution, retained-artifact paths, and intake-specific source-version records remain separate work.

```ts
export interface AnswerlatticeKnowledgeSource {
  id: string;
  pId: typeof PRODUCT_IDS.ANSWERLATTICE;
  tId: number;
  sId: number;
  jobId: string;
  type: AnswerlatticeKnowledgeSourceType;
  title: string;
  status: 'processing' | 'ready' | 'needs_text' | 'failed';
  originUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  contentText?: string | null;
  contentExcerpt?: string;
  contentHash: string;
  tags?: string[];
  contextKeys?: string[];
  entityIds?: string[];
  metadata?: Record<string, unknown>;
  governance?: {
    authority: AnswerlatticeSourceAuthority;
    owner?: string | null;
    approvalStatus: AnswerlatticeSourceApprovalStatus;
    accessScope: AnswerlatticeSourceAccessScope;
    citationEligibility: AnswerlatticeSourceCitationEligibility;
    effectiveDate?: string | null;
    reviewDate?: string | null;
    applicability: {
      products: string[];
      plans: string[];
      roles: string[];
      regions: string[];
      versions: string[];
    };
    conflictSourceIds: string[];
    notes?: string | null;
    reviewedBy: string;
    reviewedOn: unknown;
  };
  processingRun?: {
    id: string;
    status: 'processing' | 'completed' | 'failed';
    startedAt: unknown;
    leaseExpiresAt: unknown;
    completedAt?: unknown | null;
  };
  errorMessage?: string | null;
  createdOn?: unknown;
  modifiedOn?: unknown;
  createdBy?: string;
  modifiedBy?: string;
  uId?: string | number;
}
```

Discovered website URLs do not become `AnswerlatticeKnowledgeSource` documents until the owner selects them for processing. The current API returns the bounded candidate list directly and does not persist it.

### 4.2 AnswerlatticeWebsiteDiscoveryManifest — Reserved

This type records a possible future retained-discovery design. No current Storage manifest or Firestore manifest pointer is written.

```ts
export interface AnswerlatticeWebsiteDiscoveryManifest {
  id: string;
  pId: 'AL';
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
    sourceRole: 'product_home' | 'pricing' | 'feature_page' | 'docs' | 'faq' | 'changelog' | 'legal' | 'security' | 'api_docs' | 'app_login' | 'other';
    reason: string;
    estimatedAuthorityTier: number;
    estimatedRiskDomains: string[];
    contentHash?: string;
    etag?: string;
    lastModifiedHeader?: string;
  }>;
}
```

### 4.3 AnswerlatticeKnowledgeIntakeJob

```ts
export interface AnswerlatticeKnowledgeIntakeJob {
  id: string;
  pId: typeof PRODUCT_IDS.ANSWERLATTICE;
  tId: number;
  sId: number;
  title: string;
  status: AnswerlatticeKnowledgeIntakeStatus;
  description?: string;
  productWebsiteUrl?: string | null;
  appUrl?: string | null;
  targetAudience?: string | null;
  defaultCategoryId?: string;
  defaultCategoryTitle?: string;
  defaultSectionId?: string;
  defaultSectionTitle?: string;
  sourceCount: number;
  readySourceCount?: number;
  reviewItemCount: number;
  acceptedItemCount: number;
  publishedItemCount: number;
  rejectedItemCount?: number;
  usageUnitsConsumed?: number;
  usageSummary?: Record<string, unknown>;
  analysisRun?: AnswerlatticeIntakeRun;
  launchPackRun?: AnswerlatticeLaunchPackRun;
  publishRun?: AnswerlatticePublishRun;
  lastAnalyzedAt?: unknown | null;
  publishedOn?: unknown | null;
  errorMessage?: string | null;
  createdOn?: unknown;
  modifiedOn?: unknown;
  createdBy?: string;
  modifiedBy?: string;
  uId?: string | number;
}
```

`analysisRun`, `launchPackRun`, and `publishRun` are bounded lease/idempotency records on the job. They are not a generic background-worker state machine and do not point to Storage manifests.

### 4.4 AnswerlatticeIntakeReviewItem

Use one document per owner decision, not one document per fact.

```ts
export interface AnswerlatticeIntakeReviewItem {
  id: string;
  pId: typeof PRODUCT_IDS.ANSWERLATTICE;
  tId: number;
  sId: number;
  jobId: string;
  sourceId?: string | null;
  sourceIds?: string[];
  target: AnswerlatticeIntakeReviewTarget;
  status: 'draft' | 'accepted' | 'rejected' | 'published';
  title: string;
  body?: string;
  question?: string;
  answer?: string;
  answerType?: AnswerlatticeAnswerType;
  procedure?: AnswerlatticeProcedure;
  routePath?: string | null;
  versionLabel?: string | null;
  tags?: string[];
  contextKeys?: string[];
  entityIds?: string[];
  confidenceScore?: number;
  reason?: string;
  launchPack?: AnswerlatticeFirstTrustedAnswerPackMetadata;
  publishTargetId?: string | null;
  publishedOn?: unknown | null;
  sortOrder?: number;
  createdOn?: unknown;
  modifiedOn?: unknown;
  createdBy?: string;
  modifiedBy?: string;
  uId?: string | number;
}
```

`sourceIds` is capped at five and is the review evidence link. The system does not store review evidence in a manifest, infer an assigned reviewer role, or create entity/support-board/widget-suggestion destinations from this flow.

### 4.5 AnswerlatticeKnowledgeIntakeSummary

`platformSummary/knowledgeIntakeSummary_{tId}_{sId}` is the compact downstream/ops read model. The owner command center intentionally uses the bounded job list and active-job bundle APIs; it does not scan source/review collections directly.

```ts
export interface AnswerlatticeKnowledgeIntakeSummary {
  pId: typeof PRODUCT_IDS.ANSWERLATTICE;
  tId: number;
  sId: number;
  activeJobId?: string | null;
  activeJobTitle?: string | null;
  activeJobs: number;
  recentJobs: number;
  sourceCount?: number;
  readySources?: number;
  reviewItems: number;
  acceptedItems: number;
  publishedItems: number;
  rejectedItems?: number;
  usageUnitsConsumed?: number;
  lastJobStatus?: AnswerlatticeKnowledgeIntakeStatus | null;
  summaryHash?: string;
  lastPublishedAt?: unknown;
  lastUpdated?: unknown;
}
```

### 4.6 AnswerlatticeKnowledgeIntakeDirectoryEntry

Reserved for future background repair. Current runtime does not need this because the intake flow is owner-triggered and the scheduler performs only summary refresh from known tenant scope.

If background import/repair processing is enabled later, `platformSummary/knowledgeIntakeDirectory_{bucket}` must be the scheduler/ops discovery read model.

```ts
export interface AnswerlatticeKnowledgeIntakeDirectoryEntry {
  pId: 'AL';
  tId: number;
  sId: number;
  active: boolean;
  activeJobId?: string;
  activeJobStatus?: AnswerlatticeKnowledgeIntakeJob['status'];
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

Current destinations use native bounded fields rather than a shared `knowledgeLineage` object:

```ts
intakeJobId?: string;
intakeReviewItemId?: string;
intakeSourceIds?: string[];
```

These fields apply to `kb_articles`, `answerlattice_faqs`, and `answerlattice_productSurfaces`. Canonical proposal lineage is stored on `answerlattice_mutationProposals` through `signalSummary.exampleReferences` and `suggestedChange.proposedEvidence.sourceIds`.

Public citations remain a separate reviewer-approved contract. Private intake source IDs are not citation URLs.

---

## 5. Firestore Collections

Add to Answerlattice constants:

- `ANSWERLATTICE_KNOWLEDGE_SOURCES: 'answerlattice_knowledgeSources'`
- `ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS: 'answerlattice_knowledgeIntakeJobs'`
- `ANSWERLATTICE_INTAKE_REVIEW_ITEMS: 'answerlattice_intakeReviewItems'`
- `ANSWERLATTICE_INTAKE_USAGE_LEDGER: 'answerlattice_intakeUsageLedger'`

Add platform summary document helpers:

- `knowledgeIntakeSummary_{tId}_{sId}`
- `knowledgeIntakeDirectory_{bucket}` reserved only for future scheduler repair
- existing compiled source-version helpers for destination runtime keys (`kb`, `docsNav`, `canonical`, `surfaces`, `releases`)

Current destination collections:

- `kb_articles`
- `kb_categories`
- `answerlattice_faqs`
- `answerlattice_mutationProposals`
- `answerlattice_productSurfaces`
- `platformSummary`

---

## 6. Storage Contract — Reserved Retained-Artifact Design

The current intake flow does not write these paths. Browser-side document extraction sends capped text, media extraction discards raw bytes after processing, and Firestore stores capped source text plus bounded review bodies. These paths remain reserved only for a future approved retained-artifact lifecycle:

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

Current Firestore writes must remain within the enforced source/review text caps and must never retain raw AI provider output or raw media bytes.

---

## 7. APIs

All routes require authenticated Answerlattice access. Mutating and expensive routes also require an active Answerlattice beta/subscription.

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/answerlattice/knowledge-intake/jobs` | GET/POST | Paginated job list and create job metadata. |
| `/api/answerlattice/knowledge-intake/jobs/[id]` | GET | Read job bundle with bounded sources and review items. |
| `/api/answerlattice/knowledge-intake/jobs/[id]/sources` | POST | Add selected URL, pasted text, or browser-extracted file text as a capped source. |
| `/api/answerlattice/knowledge-intake/jobs/[id]/analyze` | POST | Generate deterministic source-backed review drafts. |
| `/api/answerlattice/knowledge-intake/jobs/[id]/review-items/[itemId]` | PATCH | Update review item status/content before publish. |
| `/api/answerlattice/knowledge-intake/jobs/[id]/publish` | POST | Publish approved selected outputs. |
| `/api/answerlattice/knowledge-intake/discover` | POST | Bounded public URL discovery or selected page text fetch. |
| `/api/answerlattice/knowledge-intake/jobs/[id]/media` | POST | Bounded form-data media upload for screenshot/OCR or short audio/video extraction. |

Do not allow direct client Firestore writes for expensive state transitions.

Knowledge Intake route catch paths use a shared owner-safe error helper. Known user-correctable 4xx intake guidance, such as invalid public URLs, private/local URL blocks, source caps, missing accepted items, media type/signature failures, and credit/subscription blocks, can be returned to the owner. Infrastructure failures, provider/fetch failures, and unrecognized exception messages return the route fallback text while details stay in secure server logs.

June 28 follow-up, updated July 1: Knowledge Intake secure diagnostics now route through `src/lib/answerlattice/knowledgeIntakeDiagnostics.ts`. The helper logs tenant/store scope, string identifiers, and owner-provided titles such as job IDs, source IDs, review item IDs, ledger IDs, article IDs, and article titles only as presence/length metadata. `npm run verify:answerlattice-runtime-truth` guards every `[Answerlattice Intake]` secure log/error call in the intake routes and core service.

June 29 follow-up: Knowledge Intake route and core-service failure diagnostics now call `logAnswerlatticeKnowledgeIntakeFailure()` with fixed `answerlattice_intake_*` failure codes, bounded source error name/code/status metadata, and the existing job/source/item/article presence-length context instead of passing caught exception objects directly to `secureError()`. Existing rate limits, bounded body parsing, source/media/analyze/review/publish behavior, cache revalidation, AI operation/accounting, and client-safe response mapping are unchanged.

July 11 follow-up: owner-triggered screenshot/OCR and audio/video extraction imports `src/lib/answerlattice/genAiClient.ts` and uses only `ANSWERLATTICE_GEMINI_AI_KEY*`. It no longer reaches the default MenuList Gemini key pool; missing Answerlattice provider configuration fails before extracted source creation and preserves the existing credit-refund path.

July 11 recovery follow-up: if support-credit reservation fails after the media source claim was acquired, the service still rethrows the reservation error but separately observes a failed source-claim recovery write through `answerlattice_intake_media_reservation_recovery_failed` with bounded workspace/job/source/media metadata. The recovery error can no longer disappear while leaving an unobservable claimed source.

Client-side Knowledge Intake failures display fixed operation-specific copy for job load/create, source add, media extraction, analysis, review update, publish, entity search, and URL inspection failures. The client no longer copies route-returned error text into hook/component toasts or state. Paid media refund records, partial-publish job status, and context-bundle lock failures store stable local failure codes/messages instead of raw exception text.

June 30 follow-up: `src/hooks/answerlattice/useKnowledgeIntake.ts` now parses job, bundle, source, media, discovery, entity, analysis, review-item, and publish route responses through a 64 KB bounded response reader. The hook validates each response shape before updating local jobs/bundle state, caching entity options, refreshing bundles, or showing success copy, and logs fixed `answerlattice_knowledge_intake_response_*` diagnostics for malformed, oversized, rejected, or wrong-shape responses.

June 30 follow-up: the same hook now sends all JSON and media-upload browser requests through `ANSWERLATTICE_KNOWLEDGE_INTAKE_REQUEST_POLICY` with no-store cache, same-origin credentials, and manual redirect handling before the bounded response reader runs. This keeps cached or followed-redirect responses from advancing intake state while preserving the existing fixed-copy failure behavior.

June 30 follow-up: selected-page URL discovery now fails closed when a fetch response has no readable stream and no trustworthy `content-length` within `MAX_DISCOVERY_FETCH_BYTES`. Normal streaming responses still cancel after the cap, and empty `204`/zero-length responses remain accepted as empty text. `npm run verify:answerlattice-runtime-truth` guards the no-stream and streaming cap branches.

June 30 follow-up: Knowledge Intake shared admission now logs rate-limit denials through `getAnswerlatticeSecurityLogContext()` with bounded route/session metadata and rate-limit key, tenant, and store presence-length fields. The platform intake monitor uses the same bounded security-log helper for manual-monitor rate limits. Valid intake permission checks, subscription checks, rate-limit windows, Retry-After headers, and owner-facing fixed copy are unchanged.

July 5 follow-up: Knowledge Intake route ID admission now uses `src/lib/answerlattice/knowledgeIntakeIdBoundary.ts` for all protected job routes. Job params must match the Firestore auto-ID shaped job IDs created by the intake job writer, source refs must match deterministic `kis_` source IDs, review item params and publish `itemIds` must match deterministic `kii_` IDs, and malformed IDs return fixed invalid job/review item responses before protected Firestore document reads, provider work, or publish mutations. The core `src/lib/answerlattice/knowledgeIntake.ts` shared service ref helpers also normalize-or-throw job, source, and review item IDs before direct Firestore document refs, so future callers cannot bypass route ID admission accidentally.

Implemented now: media extraction request-body and file-size preflight caps, support-credit reservation, ledger settlement, AI operation logging, and refund-on-failure for paid OCR/transcription. Still reserved for later: signed native uploads, raw artifact retention, source deletion, cancellation APIs, native connectors, and background import workers.

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
   - selected pages count against the bounded per-job source cap
   - selected pages become source records only after the protected fetch and source admission checks pass

4. **Source registration**
   - creates `answerlattice_knowledgeSources`
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
   - unsupported high-risk workflows remain owner/manual; Answerlattice does not make raw source text authoritative

8. **Deterministic review generation**
   - deterministic draft review items from selected ready source text
   - no LLM prompt for text-source draft generation in the day-one implementation
   - no raw corpus prompt
   - create bounded KB, FAQ, product-surface, or canonical-proposal review items with source IDs
   - merge duplicate drafts without overwriting the owner's existing status or edited content

9. **Publish**
   - verify accepted review state and destination-specific admission, including related entities and approved conflict-free evidence for canonical proposals when source governance is enabled
   - enforce destination limits
   - write approved outputs to existing collections
   - attach destination-native intake job/review/source lineage
   - bump existing destination cache/source versions where required
   - update compact aggregate intake and destination summaries

10. **Summary update**
   - write `knowledgeIntakeSummary_{tId}_{sId}` with compact counters
   - rebuild existing context-content summary after publish
   - mark existing destination source-version fields stale only for the outputs that changed
   - Answerlattice nightly can refresh the summary from the latest bounded job docs without touching sources, review items, providers, or publish state

---

## 9. Adapters

| Adapter | Required behavior |
| --- | --- |
| Product context | Stores bounded owner-provided product notes as review evidence. A reviewer may record manual source governance when enabled; intake does not assign an automatic authority tier. |
| Website link pack | Discovers a bounded set of same-origin public pages from the submitted page and sitemap hints. Candidates stay in the response; Firestore source docs are created only for owner-selected pages. |
| URL/docs | SSRF-safe public fetch, redirect/private-IP/content-type/response-size guards, normalized final URL, capped extracted text, and deterministic source dedupe. |
| File upload | Browser-side supported-file validation and bounded text extraction; no raw intake Storage upload. |
| Image/OCR | Extract support-relevant text/labels after owner warning; store extracted support text as source evidence, not final truth. Costs 1 Answerlattice support credit. |
| Media/transcript | Transcript-first where available; raw short audio/video extraction is owner-triggered, capped, paid, and stores extracted support text only. Costs 2 Answerlattice support credits. |
| Helpdesk export | CSV/JSON/txt exports only; PII warning and redaction pass. |
| Changelog/release notes | Stores release-note text as evidence for review drafts; intake does not publish changelog pages or activate releases. |
| Product surfaces | Creates reviewable route/page/workflow mappings when a product-surface review item is accepted. |
| Policy/owner notes | Stores bounded owner-provided text as evidence; approval and authority remain human-governed. |

---

## 10. URL Dedupe And Re-Import

URL imports are normalized and content-hash driven within an intake job.

Rules:

- normalize and validate the submitted URL before fetch, then store the validated final public URL
- compute the source content hash from source type, normalized final URL, file name, and capped redacted text
- derive the source document ID from job ID plus content hash
- an identical re-import returns the existing source without incrementing counters or creating duplicate review evidence
- changed page text produces a distinct source record for owner review; the current intake flow does not silently replace the earlier source
- no ETag/Last-Modified freshness poll, automatic whole-site refresh, or source-version scheduler is implemented

This keeps website link support useful without turning Answerlattice into a crawler.

---

## 11. Processing Orchestration

Current expensive work runs through owner-triggered, bounded server operations tied to an intake job; no Firestore trigger fans provider work out per source.

Rules:

- analysis, first-trusted-answer-pack, and publish operations use bounded run records on the selected job
- media extraction uses a bounded processing run on the deterministic source record
- overlapping unexpired runs for the same job/source are rejected
- destination writes use deterministic IDs and source/media dedupe prevents duplicate paid work where supported
- Answerlattice support credits are reserved before paid OCR/transcription and first-trusted-answer-pack generation, then settled after completion
- reserved media credits are refunded when extraction fails
- source batches are processed in capped chunks
- no per-source `onWrite` trigger starts provider calls
- no cancellation API is implemented; adding one requires explicit job-state and credit-release semantics
- failed jobs are retried only when the owner explicitly runs the action again; there is no hidden failed-job retry loop

This protects Answerlattice from cost spikes when one owner uploads many files or adds a large website.

---

## 12. Summary-First Read Model

The implementation should mirror Answerlattice's existing tenant summary and compiled source-version pattern.

Rules:

- owner dashboard and activation can read `knowledgeIntakeSummary_{tId}_{sId}` for compact status
- full source/review/job lists are opened through bounded API reads
- no realtime listener is used for source/review/job lists
- scheduler work is summary-only: it reads the latest bounded intake job docs and writes one compact summary if the summary hash changed
- existing destination cache/source-version fields let runtime bundle/context rebuilds skip work when approved output is unchanged
- direct client writes are never required for summary or version fields

Implementation helpers and destination primitives:

- `getKnowledgeIntakeSummaryDocId(tId, sId)`
- `buildSummaryPatch(scope, patch)`
- `refreshJobCounters(scope, jobId)`
- existing compiled-source-version helpers for destination runtime freshness
- `markAnswerlatticeCompiledContextSourceChangedAdmin(...)`
- `revalidateAnswerlatticePublicCache(...)`
- `rebuildProductSurfaceContentSummaryServer(...)`

---

## 13. Permissions

The current route and navigation contract uses the existing `MANAGE_KNOWLEDGE` permission for viewing jobs, adding sources, running analysis, editing review items, and publishing accepted items. Every protected API additionally verifies the session tenant/store scope; mutating or provider-backed operations can require an active Answerlattice license and rate limit.

There is no current intake-specific low-risk/high-risk reviewer-role matrix or source-delete permission. More granular approval separation must be introduced only with a verified role model and matching route, navigation, rule, and test changes.

Source-governance mutation is separately feature-flagged, uses the existing `MANAGE_KNOWLEDGE` mutation admission, requires one UUID request identifier, validates the complete bounded governance object, and transactionally updates reciprocal conflict links only among reviewed sources in the same job and exact workspace. Idempotent replay returns the prior bounded patch; reuse of a request ID for different input fails closed.

---

## 14. UI Structure

Route layout:

```text
/answerlattice/kb-generation      compatibility redirect
/answerlattice/knowledge-intake   command center route
```

Current single-screen structure:

- bounded intake job list and create action
- four-step progress indicator: create, add sources, review drafts, publish
- aggregate sources/ready/accepted/published/credits-used cards
- selected public URL discovery
- repeated-reply import when enabled
- pasted source and supported file/media intake
- bounded source list and source-backed review cards
- accepted-item publish action

Founder copy:

- "Teach Answerlattice your product"
- "Product and docs URLs"
- "Add selected pages"
- "Add repeated reply"
- "Generate review drafts"
- "Publish accepted"
- "Evidence still needed"

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

Each major step must be owner-retryable from saved artifacts where artifacts exist. Answerlattice must not run hidden failed-job retries for intake.

| Failure | Required behavior |
| --- | --- |
| URL discovery or selected-page fetch fails | Return fixed safe failure copy; do not create a source record for a fetch that never passed admission/extraction. Owner may retry or paste reviewed text. |
| Link discovery finds too many pages | Return a bounded candidate list, show top support-worthy pages, and require owner selection before processing; do not persist skipped candidates. |
| Selected URL is re-imported with identical normalized content | Return the existing deterministic source without counter or review duplication. |
| File parse fails | Show a file-level failure; the current browser-extraction path does not retain the original. |
| OCR/transcription fails | Refund reserved support credits, keep no raw media artifact, and let the owner upload a transcript or retry manually. |
| Privacy filter detects common secrets/private data | Redact supported patterns before persistence, record a bounded redaction count, and require the owner to review the remaining evidence. |
| First trusted answer pack generation fails | Set the bounded run failure state, settle/refund the usage reservation as applicable, and allow an explicit owner retry. |
| Draft generation fails | Let the owner rerun selected draft analysis without re-upload. |
| Publish partially fails | Keep published item ids where available and let the owner rerun publish idempotently. |
| Limit reached | Reject the bounded operation with fixed owner-correctable copy; do not create additional source/review/publish records. |
| Summary refresh fails | Record the scheduler task failure; next nightly/manual scheduler run can refresh the compact summary. No source extraction or publish retry is attempted. |

---

## 16. Integration With Existing KB Pipeline

The legacy `kb_generation_jobs` pipeline remains a separate compatibility/runtime inventory item and is audited independently. The Answerlattice `/answerlattice/kb-generation` route redirects to `/answerlattice/knowledge-intake`; Knowledge Intake does not create a compatibility generation job or reuse the platform upload/reconciliation modals.

Accepted Knowledge Intake KB review items publish directly into the existing `kb_articles` and `kb_categories` destinations through the intake publisher, with destination-native lineage and the existing embedding/cache invalidation paths.

---

## 17. Runtime Destination Alignment

Knowledge Intake must reuse Answerlattice's existing destination collections and runtime invalidation paths. Do not introduce a second search index, second FAQ store, second surface map, or intake-only content collection that the widget/search runtime does not already read.

### 17.1 Destination Publish Matrix

| Destination | Existing collection/path | Required intake fields | Required post-write actions |
| --- | --- | --- | --- |
| Help article | `kb_articles` | `pId`, `tId`, `sId`, `title`, article body, `status`, category/section, tags/context/entities, `intakeJobId`, `intakeReviewItemId`, `intakeSourceIds` | Update `kb_categories`; enqueue or run article embedding; bump `ANSWERLATTICE_CACHE_SOURCES.KB`; mark compiled sources `kb` and `docsNav`; invalidate public content cache for `kb`/`context`; rebuild or mark stale `contextContent_{tId}_{sId}`. |
| KB navigation | `kb_categories` | Tenant/store-scoped category and section references to approved articles | Mark compiled source `docsNav`; invalidate public content cache for `kb`/`context`. |
| FAQ/custom Q&A | `answerlattice_faqs` | `status: published`, `active: true`, declared `source: knowledge_intake`, question/answer/links/tags/context/entities, `intakeJobId`, `intakeReviewItemId`, `intakeSourceIds` | Follow the existing FAQ behavior: bump KB cache version, mark compiled `kb`, invalidate `faqs`/`kb`/`context`, and rebuild or mark stale surface content summary. |
| Canonical answer proposal | `answerlattice_mutationProposals` | Intake draft, related entities, bounded private source evidence, pending-review status | Governance-only. Do not mark compiled `canonical`, invalidate public runtime context, or make the answer authoritative until the normal canonical-answer approval path publishes it. |
| Product surface | `answerlattice_productSurfaces` | key/label/routes, feature/page/workflow fields, entity hints/ids, tags/visibility/priority, `intakeJobId`, `intakeReviewItemId`, `intakeSourceIds` | Mark compiled `surfaces`; rebuild or mark stale `contextContent_{tId}_{sId}` because widget related content depends on it. |
| Release-note source context | Existing changelog entries, release notes, GitHub release export, release email text | Source evidence only. Intake can use this context to draft KB, FAQ, product-surface, and canonical proposal output. | No changelog page writes, no release-timeline writes, and no `releases` source-version mark from intake. Owner-managed changelog writes own public cache invalidation and release activation. |
| Release timeline | `answerlattice_releases` | `versionLabel`, `versionNormalized`, `releasedAt`, owner-approved `entityChanges`, status lifecycle | Mark compiled `releases`; activation remains the drift trigger. Intake must not write or activate a release timeline. |

Entity candidates, approved entities/relations, Support Board cards, changelog pages, release timelines, and direct active canonical answers are not current intake publish targets.

### 17.2 Search Runtime Contract

Current search behavior is the source of truth:

1. Canonical retrieval runs before FAQ and RAG.
2. FAQ/custom Q&A retrieval runs after canonical miss and before vector/RAG fallback.
3. RAG fallback uses embeddings on published `kb_articles`.
4. Product surface context can enrich retrieval and related content when context-aware flags are enabled.
5. Image-assisted search turns image evidence into a text query/context, then uses the same canonical/FAQ/RAG runtime path.

Implementation rules:

- Published KB articles attempt embedding during the publish path. An embedding failure leaves the approved article visible in hosted help with `embeddingStatus: failed`; no current topic-level `partial` readiness object is written.
- Intake screenshot/OCR output is source evidence. It becomes searchable only after it is converted into approved article, FAQ, canonical answer, entity, or surface output.
- Owner manual Q&A and generated FAQs must share the same `answerlattice_faqs` model so latency and retrieval behavior stay consistent.

### 17.3 Cache, Source-Version, And Bundle Rules

The existing runtime has two different freshness concepts:

1. Search/public content cache versions: currently `ANSWERLATTICE_CACHE_SOURCES.KB` and `ANSWERLATTICE_CACHE_SOURCES.CANONICAL`.
2. Compiled context source versions: `workspaceProfile`, `widgetConfig`, `kb`, `docsNav`, `entities`, `entityRelations`, `canonical`, `surfaces`, `releases`, `branding`, `mcpPolicy`, and `predictiveTriggers`.

Intake implementation must handle both:

- Article and FAQ output bumps KB cache and marks `kb`/`docsNav` where applicable.
- Canonical mutation proposals do not bump canonical runtime freshness; the normal canonical approval workflow owns that transition.
- Surface output marks `surfaces`.
- Release-note source context does not mark `releases`; owner-managed changelog/release publishing owns that source-version path.
- Public/hosted help output invalidates the Answerlattice public content cache tags for the affected content type.
- Product-surface related content rebuilds or marks stale `contextContent_{tId}_{sId}` after article, FAQ, ticket, or surface changes that should affect page-aware suggestions. Owner-managed changelog changes use their own publish path.

No intake-only source/readiness keys are currently written to the compiled source-version document. Runtime destination writes bump only the existing keys required by the destination matrix.

### 17.4 End-To-End Flow Check

Current live path:

1. Owner adds product link/files/policies and approves selected sources.
2. Intake stores capped selected-source text/metadata in Firestore; raw file retention is reserved for a future native-upload path.
3. Intake creates review items and source-backed drafts.
4. Owner approves destinations.
5. Publisher writes existing runtime destination records with destination-native intake lineage fields.
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

The owner review card now resolves up to three linked sources from the already-loaded intake bundle. It shows bounded source excerpts, source type/title, public HTTPS origin where available, launch-pack applicability, and missing-evidence warnings before Accept/Reject. The edit modal reuses the same evidence projection. This is a UI projection only: it adds no source query, listener, provider call, or review status.

- Feature flags added client/server.
- Constants added to app/functions Answerlattice DB constants.
- Firestore rules deny by default and scope by `pId/tId/sId`.
- Storage retained-artifact path is reserved; day-one browser extraction and media extraction avoid raw upload/retention.
- Entitlement check blocks mutating and expensive APIs.
- Day-one processing is owner-triggered and bounded. Job leases/idempotent IDs and media credit reservation/settlement are enabled where required; cancellation and background import workers are not.
- API and type constraints enforce source/review/publish caps.
- Source registry and job models implemented.
- Full source bodies are capped in Firestore; no raw original files are retained day one.
- Website link discovery returns bounded candidates and creates Firestore source docs only for owner-selected pages.
- URL fetch adapter has SSRF/private-network protection and size/time caps.
- Review queue keeps canonical answer drafts as mutation proposals; no authoritative answer is auto-published.
- Review items retain a bounded multi-source evidence union, and KB, FAQ, product-surface, and canonical-proposal destinations retain intake job/review/source lineage in destination-native fields.
- Private intake source IDs never become public citation URLs; public citations remain a separate reviewer-approved contract.
- Nested source/usage metadata is bounded and recursively redacted before persistence, and public URL admission rejects credentials, sensitive query keys, and local/private/reserved destinations even when source text is supplied directly.
- Intake-published FAQs use the declared `knowledge_intake` source and remain eligible for normal FAQ retrieval.
- Runtime destination post-write actions are implemented for KB articles, FAQs, product surfaces, public content cache, compiled context source versions, article embeddings, and product-surface summaries. Canonical mutation proposals remain governance-only until approved through the canonical-answer workflow, and changelog publishing remains owner-managed outside intake.
- Article, FAQ and product-surface destination writes keep the review item accepted with its deterministic target marker until the required product-surface context summary rebuild, cache/source-version effects, and public-cache revalidation succeed. A failed or lost post-write attempt therefore resumes the exact target and cannot settle the review item as published while required derived/public freshness work is stale.
- Publish selection has distinct semantics: omitted `itemIds` means all accepted items, while an explicitly supplied list must be non-empty, unique, valid and within the publish cap. The route and service both reject `[]`; it can never fall through to publish-all.
- Intake-published KB articles and canonical mutation proposals use deterministic destination IDs from the review item, so retry or double-click publish cannot create duplicate destination records for the same approved intake item.
- Non-canonical runtime search history now carries canonical miss context (`matchedEntityIds`, confidence, and fallback reason) into FAQ/RAG/empty results, so recurring fallback, trust metrics, and mutation signals can connect misses back to product entities without extra runtime reads.
- Canonical proposal review items require at least one related product entity before they can be accepted or published into the governance queue.
- Intake source and usage metadata is key-count, depth, array, and string length bounded before Firestore writes.
- Intake usage reservations are allowlisted to Answerlattice intake OCR, transcription, and embedding actions so unsupported future actions fail closed instead of silently recording zero-unit processing.
- Intake API licensing checks use the store subscription mirror first, then a direct subscription document or capped tenant/store subscription query when the mirror is stale. Credit-shortage errors return a credits/payment status instead of a generic server failure.
- Intake API catch responses return only allowlisted owner-correctable 4xx messages or generic route fallbacks. Raw provider, fetch, Firebase, and unexpected exception text stays in secure server logs.
- No intake-only source/readiness counters are written day one.
- Published article embeddings are attempted during publish; failures leave `embeddingStatus: failed` without blocking help-center publication.
- Workspace summary doc updates from owner-triggered server transitions and from summary-only Answerlattice nightly analytics.
- No intake scheduler crawls, failed-job retries, provider calls, or publish retries are added.
- Existing KB generation still works or redirects safely.
- Docs, website, help docs, and changelog updated from code truth before launch.
- Browser jobs, bundles, active selection, entity options and pending governance attempts are owned by the active Answerlattice tenant/workspace key. Scope transitions clear former state and invalidate in-flight reads; only the latest exact-scope response settles. Concurrent job/bundle reads and mutations retain accurate loading/saving state.
- Component-local URL discovery, entity results, pasted/repeated-reply forms, source-governance snapshots and review-edit snapshots are also owned by the active workspace and job. Transitions clear them and invalidate late discovery/entity settlement.
- Browser PDF extraction loads the pinned local PDF.js main module and its version-matched worker handler together on demand; it does not rely on the removed `disableWorker` option or an external CDN.
- Server runtime scope accepts positive safe-integer numbers only; string, boolean, fractional and nonfinite values cannot be coerced into tenant/workspace authority. Persisted timestamp-like values are read through one failure-contained normalizer, so malformed legacy getters or conversions cannot crash lease admission or be mistaken for an active lease.
- The required product-surface summary uses its shared failure-contained timestamp projector for article, FAQ, changelog and ticket ordering; malformed legacy/provider timestamp members degrade to unavailable ordering instead of blocking publication recovery.
- URL discovery resolves relative links against the fetched page URL while retaining the original allowed origin and public-URL safety boundary. API serialization converts timestamp-like values through the same failure-contained contract and contains hostile getters, invalid conversions and cycles.
- DOCX expansion safety requires exact nonnegative safe-integer archive metadata; coercible strings/booleans and throwing getters fail closed. Metadata persistence converts invalid Dates/non-finite numbers to `null`, contains hostile objects, and diagnostic counters accept finite numbers only.

---

## 20. Version History

| Date | Version | Change |
| --- | --- | --- |
| 2026-05-31 | 1.0.0 | Initial technical contract for Answerlattice Knowledge Intake Command Center. |
| 2026-05-31 | 1.1.0 | Added first-class website link discovery, selected URL source creation, and hash-driven reprocessing rules. |
| 2026-05-31 | 1.2.0 | Added bounded job orchestration, lease/idempotency rules, credit settlement, and privacy filtering. |
| 2026-05-31 | 1.3.0 | Added summary-first read model, bucketed intake directory, source-version fields, and summary repair helpers. |
| 2026-05-31 | 1.4.0 | Added runtime destination matrix and search/cache/bundle alignment rules for existing Answerlattice KB, FAQ, canonical, surface, release, widget, and hosted-help flows. |
| 2026-05-31 | 1.5.0 | Added publish idempotency and runtime fallback signal alignment after the end-to-end intake-to-mutation review. |
| 2026-06-27 | 1.6.0 | Added the shared Knowledge Intake safe-error response boundary and verifier guard. |
| 2026-06-28 | 2.0.1 | Bounded Knowledge Intake UI, media refund, partial-publish status, and context-bundle lock failure diagnostics. |
| 2026-06-28 | 2.0.2 | Tightened client-side Knowledge Intake failure copy to fixed operation messages only. |
| 2026-06-29 | 2.0.3 | Routed Knowledge Intake route and core-service failure diagnostics through fixed intake failure codes and bounded source-error metadata. |
| 2026-06-30 | 2.0.4 | Added bounded Knowledge Intake client response validation before local state or success copy advances. |
| 2026-06-30 | 2.0.5 | Added shared Knowledge Intake browser request policy before bounded response validation. |
| 2026-06-30 | 2.0.6 | Bounded Knowledge Intake and platform intake-monitor security-log metadata for shared rate-limit denials. |
| 2026-07-05 | 2.0.7 | Added protected Knowledge Intake route ID admission for Firestore auto-ID job params and deterministic `kii_` review item IDs. |
| 2026-07-17 | 2.0.8 | Added bounded linked-source evidence and applicability to owner review decisions without additional reads. |
| 2026-07-18 | 2.0.9 | Hardened evidence union, destination lineage, privacy, URL admission, and FAQ retrieval; corrected cancellation, manifest, retained-artifact, and lease completion claims. |
| 2026-07-18 | 2.1.0 | Replaced speculative source/job/review contracts and product-map/freshness/permission claims with current bounded runtime behavior. |
| 2026-07-26 | 2.1.1 | Added exact workspace-owned browser state, latest-request settlement, cache cleanup and concurrent loading/saving accounting. |
| 2026-07-26 | 2.1.2 | Added strict server scope admission and failure-contained persisted timestamp/lease normalization. |
| 2026-07-26 | 2.1.3 | Made destination publication resumable until required context-summary, cache/source-version, public-cache and final review settlement complete. |
| 2026-07-26 | 2.1.4 | Corrected page-relative discovery resolution and failure-contained intake response serialization. |
| 2026-07-26 | 2.1.5 | Prevented explicit empty or duplicate publish selections from becoming publish-all or silently truncated work. |
| 2026-07-26 | 2.1.6 | Tightened DOCX archive metadata, persisted metadata scalars and diagnostic metric normalization. |
| 2026-07-26 | 2.1.7 | Contained malformed persisted timestamp values used by the required product-surface summary ordering path. |
