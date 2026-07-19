# Knowledge Intake Command Center — Product Specification

> **Status:** IMPLEMENTED — day-one owner-triggered product contract
> **Version:** 1.6.0
> **Created:** 2026-05-31
> **Audience:** CEO / PM / Product / Clients

---

## 1. Goal

Build Answerlattice's long-term intake experience for solo founders, first-time SaaS owners, AI-native builders, and small product teams who need a support layer before they have a support team.

The owner should experience this as:

1. Pay for an Answerlattice workspace.
2. Paste product website and app URL.
3. Add docs, files, policy answers, changelog, support exports, screenshots, or transcripts if available.
4. Answerlattice shows what it found and what it trusts.
5. Answerlattice shows source-backed review drafts and missing evidence.
6. Answerlattice generates source-backed drafts.
7. Owner approves what becomes official.
8. Answerlattice publishes KB, FAQ, approved answers, product page help, and readiness summaries.

Primary owner-facing promise:

**Paste your product link. Confirm the important decisions. Launch support.**

---

## 2. Product Principles

| Principle | Requirement |
| --- | --- |
| Founder-first | Hide enterprise governance language. The owner should see sources, decisions, drafts, approval, and readiness. |
| Paid-first | Every real workspace processing action requires active paid entitlement or paid processing allowance. |
| Source-backed | Drafts and supported published destinations must retain bounded intake job, review item, and source ID lineage. Intake-specific source-version/evidence manifests are a future governance option, not a current requirement. |
| Review-gated | High-risk or authoritative content cannot become live without owner/admin approval. |
| Cost-bounded | No full website crawl, no full nightly crawl, no per-fact Firestore docs, no realtime listener for intake lists. |
| Single engine | Website, files, policies, media, tickets, changelog, and surfaces normalize into one source contract. |
| Link-first | Product website links are treated as source discovery packs, not as blind crawls or pasted text files. |
| Privacy-first | Sources are scanned for secrets and private data before provider prompts are built. |
| Controlled execution | Expensive intake runs through bounded job orchestration, not unbounded per-source fanout. |
| Summary-first | Dashboards, activation, and scheduler repair read compact summary/directory docs before opening detailed lists. |
| Compatibility | Existing KB generation remains available as an output path until the successor publishing path is implemented. |

---

## 3. Primary ICP

Answerlattice intake is for:

- first-time founders launching a SaaS product
- solo founders and indie hackers
- AI-native builders using Cursor, Replit, Lovable, Bolt, Copilot, or similar tools
- product owners who launched fast and have scattered support knowledge
- studios shipping multiple small SaaS products, one Answerlattice workspace per product

Not the default buyer:

- large enterprise support operations needing heavy department approvals
- teams looking for a full helpdesk replacement
- teams wanting AI to answer without human review
- products with no real users, no launch intent, and no repeated support questions

---

## 4. Historical Pre-Implementation Runtime Baseline

Before the dedicated intake route shipped, Answerlattice import was mounted through `/answerlattice/kb-generation` and reused the shared `platform/KBGeneration` component. The gaps below are historical planning evidence, not a statement about the current `/answerlattice/knowledge-intake` runtime.

Historical gaps at that time:

- starts with files instead of product context
- pasted URLs are not crawled/classified
- website, docs/help, pricing, legal, changelog, and app URL are not separated into source roles
- app URL is not distinguished from a public website/docs URL; Answerlattice must not attempt credentialed app crawling
- direct generation happens before source audit/product map
- source trust is not modeled
- no paid processing entitlement check before upload/job execution
- no product map preview before drafts
- no unified launch decision queue
- no source lineage contract for every published output
- no readiness-by-topic output
- active job uses a realtime listener; the intake dashboard should use summary/polling except for short-running active progress

---

## 5. Day-One Source Inputs

Day-one means one permanent intake contract supports these inputs. Individual adapters may have stricter caps and entitlement checks, but they must not require separate pipelines.

| Source family | Supported inputs | Processing rule |
| --- | --- | --- |
| Intake context | intake name, product website, app URL, description, and target audience | Creates the bounded intake job context; these fields are not automatically authoritative support truth. |
| Website link pack | product website, pricing, feature pages, FAQ, docs/help URL, changelog URL, API docs URL | Capped starting-page and `/sitemap.xml` discovery. Only owner-selected pages become knowledge sources. No full crawl by default. |
| Uploaded docs | Text-based PDF, DOCX, TXT, Markdown, CSV, FAQ CSV, JSON | Client preflight + server validation. Normalize to source evidence before drafts. XLSX, PPTX, YAML, HTML files, and ZIP docs are not public claims until implemented. |
| Images/screenshots | PNG, JPG/JPEG, WebP, GIF | OCR/visual evidence only. Warn about secrets. Costs support credits and never creates automatic authoritative answers. |
| Video/audio/transcripts | MP4, MOV, WebM, M4A, MP3, WAV, OGG, uploaded transcript text | Transcript-first. Raw media transcription is owner-triggered, support-credit charged, byte-capped, and explicitly visible. |
| Changelog/releases | pasted or uploaded changelog entries, release notes, GitHub release export, release email text | Source evidence for KB/FAQ/surface/canonical-proposal review; intake does not publish changelog or release records. |
| Helpdesk history | Zendesk/Intercom/Freshdesk/Help Scout exports, ticket CSV/JSON, support email exports, macros, canned replies, chat transcripts | Export upload path only for day-one. Native OAuth connectors are not required for launch because of credential and privacy risk. |
| Repeated replies | one repeated customer question, reusable reply, optional route/context/entity hints | Creates focused FAQ and canonical-proposal review drafts without treating the historical reply as approved truth. |
| Product-surface evidence | app routes, page names, workflows, roles, plans, and error-state notes | Can produce a product-surface review item for page-aware support. |
| Policy/owner notes | refund, cancellation, billing, pricing, security, privacy, deletion, roles, permissions, API limits | Stored as review evidence. Authority and approval remain human-governed. |

---

## 6. Website Link Intake

Product links should be the easiest starting point because many first-time founders have a public website before they have a clean help center.

Owner-facing flow:

1. Owner pastes the main product website link.
2. Owner may optionally add docs/help, pricing, changelog, status, terms, privacy, API docs, and app login URL.
3. Answerlattice runs a bounded discovery pass over the starting page and same-origin `/sitemap.xml`.
4. Answerlattice shows candidate pages grouped as product overview, pricing, docs, FAQ, changelog, legal/security, API, and low-value pages.
5. Owner confirms the pages to process.
6. Only confirmed pages become knowledge sources and consume extraction/draft credits.

Rules:

- app login URL is stored as job context; it is not crawled behind authentication
- discovered URLs are returned as bounded candidates and are not persisted unless the owner selects them
- selected pages receive compact source metadata and source lineage
- discovered page classification is an owner-selection aid, not an authority decision
- URL query tracking parameters are stripped before dedupe and source hashing
- fetched URL bodies must be streamed and capped; non-streaming responses are accepted only with a trustworthy safe content length
- an identical normalized URL and extracted-text import resolves to the existing deterministic source within the job
- changed page text creates a distinct source for review; no ETag/Last-Modified poll or silent source replacement is implemented

The first screen should say:

**Paste your product link. Answerlattice finds the support-worthy pages. You choose what becomes source material.**

---

## 7. Recommended Source Authority — Separate Governance Contract

The hierarchy below is the intended source-governance model, not a current first-class field or automatic conflict resolver in Knowledge Intake. Current intake preserves source IDs and requires human review; the later drift/conflict feature audit owns the broader authority lifecycle.

AI confidence never outranks source authority.

Default authority order:

1. Owner-approved canonical answer
2. Owner-entered policy pack / product settings
3. Owner-confirmed pricing, legal, security, privacy, and terms pages
4. Current official docs/help center
5. Current changelog/release notes
6. Owner-selected product website pages
7. Product surfaces/app route map
8. Existing help articles and FAQs
9. Support macros and canned replies
10. Resolved tickets and conversations
11. Videos, demos, transcripts
12. Sales decks, old PDFs, unstructured notes

When a reviewer detects conflicting evidence, the safe product behavior is to hold the draft for review rather than guess. Automatic source-conflict detection is not a current Knowledge Intake claim.

Example:

Pricing page says API access is Enterprise-only. Old sales deck says API access is included in Pro. Answerlattice recommends the pricing page as higher authority and asks the owner to confirm.

---

## 8. Risk Domains — Governance Principle

These topics should remain owner-reviewed across Answerlattice. Current Knowledge Intake does not infer a complete risk policy from arbitrary source text; canonical proposals still pass through Governance before becoming authoritative.

High-risk topics always require explicit owner/admin approval:

- pricing
- plan limits
- billing
- invoices and failed payments
- refunds
- cancellation
- security
- privacy
- legal/terms
- data deletion
- roles and permissions
- API limits
- destructive actions
- account deletion
- compliance/SLA claims

Support staff can draft or suggest, but owner/admin approval is required for official answers in these domains.

---

## 9. Owner Journey

### 9.1 Paid Workspace Gate

The owner cannot run real intake processing until:

- session is authenticated
- user has access to the Answerlattice workspace
- subscription is active and non-free for processing
- support/processing credits are available
- workspace maps to exactly one product support brain

Static demo and sample preview remain allowed without processing customer data.

### 9.2 Product Context First

The current first form asks:

- intake name
- product website
- app URL
- a short description of what Answerlattice should learn

The owner then adds selected URLs, pasted source content, supported files/media, or one repeated question and reusable reply.

### 9.3 Source Preflight

Current source admission shows or enforces:

- source type
- page/file/media caps
- media credit cost
- privacy and secret-data warnings
- what will be extracted
- candidate website pages and selected page count

Owner explicitly confirms expensive or private sources.

Pasted/fetched text and metadata pass bounded deterministic redaction before Firestore persistence. Raw screenshot/audio/video bytes necessarily reach the configured extraction provider after explicit owner action, file-signature/size checks, entitlement, and credit reservation; the extraction prompt requests redaction and returned text passes deterministic redaction before storage. Owners must not upload secrets or private customer data.

### 9.4 Source Audit

The current intake screen shows:

- bounded source records and status
- aggregate source, ready, accepted, published, and credit-used counts
- selected website candidates before source creation
- source excerpts and missing-evidence warnings on review cards

It does not currently claim a generalized stale-source, source-conflict, or launch-gap audit.

### 9.5 Product Map — Reserved

The following remains a long-term ontology/surface projection, not a current Knowledge Intake screen or persisted manifest:

- features
- subfeatures
- plans
- roles
- permissions
- workflows
- integrations
- error states
- support policies
- product pages/surfaces
- gaps and unknowns

### 9.6 Current Review Queue

The owner does not review every extracted fact.

Current review targets are:

- KB article draft
- FAQ draft
- product-surface draft
- canonical mutation proposal

Each item is accepted, edited, rejected, or published intentionally. Changelog, entity, Support Board, and direct canonical-answer publishing are not intake targets.

### 9.7 Draft Generation

From selected ready source evidence, current deterministic analysis generates:

- KB article drafts
- FAQs and custom Q&A
- canonical mutation proposals
- product-surface suggestions

Drafts stay pending until approval.

### 9.8 Safe Publish

Current destinations are:

- Knowledge Base
- FAQ layer
- Canonical answer proposals
- Product surfaces

The canonical destination creates a mutation proposal, not active canonical truth. KB/FAQ/surface output becomes visible to the existing widget/help/search runtimes through their normal destination paths; those are not separate intake publish targets.

Publish validates:

- selected items approved
- destination plan limits available
- source lineage attached
- existing destination cache/source versions updated where the published destination requires them; no intake-specific publish manifest is required

### 9.9 Runtime Output Contract

Publishing is not complete when draft documents are written. Publishing is complete only when the approved output is visible to the existing Answerlattice runtime paths that already serve owners and end users.

Runtime requirements:

- Help center articles are written to `kb_articles` and `kb_categories` with tenant/store scope, lineage, tags, context keys, and entity ids where available.
- Published article text attempts embedding in the publish path. If embedding fails, the article remains visible in hosted help with `embeddingStatus: failed`; no current topic-level partial-readiness record is written.
- FAQ/custom Q&A output is written to `answerlattice_faqs` as `published` and `active`, linked to articles, entities, tags, and context keys when available.
- Canonical answers remain the first retrieval path. Intake can create drafts and mutation proposals, but an answer becomes `active` only after owner/admin approval and destination validation.
- Product surface suggestions write existing `answerlattice_productSurfaces` records with route patterns, feature/page/workflow labels, visibility, entity ids, tags, and lineage.
- Article, FAQ, ticket, and surface changes refresh or mark stale the compact product-surface content summary used for page-aware related content.
- Intake can use release notes or existing changelog entries as source context for support drafts, but it does not write changelog pages or `answerlattice_releases`. Owners publish release notes through the Changelog workflow.
- Published KB/FAQ/surface outputs mark only their existing destination cache/source-version paths. Canonical proposals do not mark canonical runtime freshness until the normal governance workflow approves active truth.
- Intake-only source/readiness counters do not by themselves rebuild public context bundles. Runtime bundles rebuild only when approved runtime destinations changed.

End-user result:

1. Owner imports sources and approves output.
2. Hosted help shows approved articles and FAQs. Changelog entries are shown only when owners publish them through the Changelog workflow.
3. Widget/help search serves active canonical answers first.
4. If no canonical answer matches, published FAQs/custom Q&A can answer repeated questions.
5. If FAQ does not match, vector/RAG fallback can use embedded published articles.
6. Page-aware related content comes from the rebuilt surface summary.
7. Misses remain logged as fallback/signals and do not become authoritative without review.

### 9.10 Readiness

Current Knowledge Intake readiness is aggregate job/source/review/publish state. Topic-specific readiness belongs to the broader Activation and product-surface summary flows and must not be inferred from source count alone.

The following topic-specific readiness model is a future Activation/governance direction, not a current Knowledge Intake output:

Example:

- Onboarding: ready
- Billing: partial, refund policy missing
- Team roles: ready
- API troubleshooting: not ready
- Security: needs owner review

Possible future readiness inputs:

- product profile complete
- paid entitlement active
- trusted source imported
- applicable product/surface mapping reviewed
- material evidence conflicts resolved
- high-risk topics reviewed
- at least one approved answer or article exists for the surface
- embeddings are ready for published article content that should power search
- product-surface content summary includes the latest approved articles, FAQs, owner-managed changelog entries, and surfaces where applicable
- widget install and context verified where applicable
- compact readiness summary updated so dashboards do not scan articles, answers, sources, or review items

---

## 10. Summary-First Owner Experience

The owner dashboard should feel instant even when the workspace has many sources.

The compact summary currently provides:

- active intake job status
- source counts
- ready source count
- review, accepted, rejected, and published counts
- usage units consumed and latest job status where available

This comes from `platformSummary/knowledgeIntakeSummary_{tId}_{sId}`.

Detailed intake state is loaded through bounded job bundles and owner actions:

- source registry and selected links
- review drafts and destination status
- scoped usage/credit evidence in the platform monitor

Intake processing is owner-triggered. Scheduler/ops do not discover active intake work for retries or imports. The existing Answerlattice nightly scheduler may refresh compact intake analytics from the latest bounded job docs and must skip provider calls, failed-job retry, crawling, and publishing.

---

## 11. Success Metrics

| Metric | Target |
| --- | --- |
| Time to first ready source | <3 minutes for a small pasted-text or selected-URL import |
| Time to first review drafts | One focused setup session for a small starter import |
| Owner review decisions | 5-15 decisions for the first focused support pack |
| Time to first approved answer | One focused setup session for small starter imports, after human review |
| Source coverage | At least top 2-5 product pages mapped in first session |
| Draft approval rate | >60% approved with minor edits |
| Fallback reduction after launch | Tracked through existing signal/trust metrics |
| Cost overrun | 0 jobs exceed configured plan/cap limits |
| Unselected URL Firestore writes | 0 source documents for skipped/discovered-only URLs |
| Identical source re-import | 0 duplicate source/counter/review writes within the same job |
| First dashboard read | 1 summary doc before detailed tabs are opened |
| Scheduler analytics | Latest bounded job reads and one compact summary write only when changed |

---

## 12. Explicit Non-Goals

- No auto-publishing authoritative support answers.
- No free real workspace scanning/generation.
- No generic CMS/importer detached from Answerlattice support outputs.
- No full website crawl by default.
- No credentialed crawling of app dashboards, demo accounts, admin areas, or private customer data.
- No LLM-only answer authority.
- No native private helpdesk/OAuth connector requirement for day-one.
- No demo-account credential scanner.
- No full project-management board.
- No unbounded nightly crawl.
- No per-section/per-fact Firestore materialization.
- No scheduler collection scan to discover retry/import work. Summary-only analytics may read bounded recent jobs for known tenant/store scope.

---

## 13. Current Implementation Acceptance Criteria

The implementation is complete only when:

- paid entitlement blocks every expensive job before work begins
- only one expensive intake job per workspace runs at a time unless an explicit plan/concurrency cap allows more
- source registry exists and all adapters write through it
- capped extracted source text and metadata are stored in Firestore; raw/heavy source artifacts are not retained by the current intake path
- source metadata and summary reads are bounded and scoped by `pId`, `tId`, `sId`
- high-risk destinations remain review-gated; first-class intake source authority, ownership, effective-date, and expiry fields are deferred to the source-governance audit
- review queue is unified and founder-friendly
- generated outputs retain source lineage
- publishing uses existing Answerlattice destination systems instead of duplicate content models
- aggregate intake progress is updated in compact summary docs; topic readiness is separate work
- dashboard and activation use the workspace intake summary before detailed list queries
- scheduler analytics use already-known tenant/store scope and bounded recent job reads; no intake directory is required today
- source-level delete/retention controls are explicitly unavailable until a governed lifecycle is implemented
- website link intake returns discovered candidates without persisting a manifest and creates Firestore source docs only for owner-selected pages
- identical selected-page content deduplicates within the same job; no background freshness metadata workflow is claimed
- app URL is stored as intake context, not used as a credentialed crawler target
- text/metadata is redacted before persistence; raw media reaches the configured extraction provider only after explicit owner action and bounded safety/entitlement checks
- focused tests prove current URL/file/media/repeated-reply intake, evidence lineage, review/publish destinations, privacy bounds, retrieval eligibility, rules, and summary behavior; future connectors/deletion/cancellation remain separate validation work

---

## 14. Version History

| Date | Version | Change |
| --- | --- | --- |
| 2026-05-31 | 1.0.0 | Initial founder-first, paid-gated intake product spec. |
| 2026-05-31 | 1.1.0 | Added first-class website link intake, selected-page processing, and unchanged-source skip rules. |
| 2026-05-31 | 1.2.0 | Added privacy preflight and bounded job orchestration requirements. |
| 2026-05-31 | 1.3.0 | Added summary-first owner experience and scheduler discovery requirements. |
| 2026-05-31 | 1.4.0 | Added end-to-end runtime output contract for hosted help, FAQ, canonical-first retrieval, vector search, surface summaries, changelog, and compiled context source versions. |
| 2026-07-18 | 1.5.0 | Reconciled historical planning language with the current evidence-lineage, URL discovery, raw-media, source-governance, deletion, and manifest boundaries. |
| 2026-07-18 | 1.6.0 | Removed unimplemented product-map, topic-readiness, freshness-poll, app-setup, and pre-provider raw-media claims. |
