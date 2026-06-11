# Knowledge Intake Command Center — Product Specification

> **Status:** IMPLEMENTED — day-one owner-triggered product contract
> **Version:** 1.0.0
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
5. Answerlattice builds a product map and asks only important launch decisions.
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
| Source-backed | Drafts and published outputs must point to source ids, source versions, and evidence manifests. |
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

## 4. Current Runtime Baseline

Current Answerlattice import is mounted through `/answerlattice/kb-generation`, which reuses the shared `platform/KBGeneration` component. It supports file upload, pasted URL text, starter text templates, AI-generated articles, article review, duplicate reconciliation, publishing, generated FAQs, and embeddings.

Current gaps:

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
| Product context | product name, website, app URL, support email, product category, billing model, launch policy answers | Highest-value starting point. Required before expensive processing. |
| Website link pack | product website, pricing, feature pages, FAQ, docs/help URL, changelog URL, API docs URL, sitemap.xml, robots.txt, llms.txt when present | Capped source discovery first. Only owner-selected pages become knowledge sources. No full crawl by default. |
| Uploaded docs | Text-based PDF, DOCX, TXT, Markdown, CSV, FAQ CSV, JSON | Client preflight + server validation. Normalize to source evidence before drafts. XLSX, PPTX, YAML, HTML files, and ZIP docs are not public claims until implemented. |
| Images/screenshots | PNG, JPG/JPEG, WebP, GIF | OCR/visual evidence only. Warn about secrets. Costs support credits and never creates automatic authoritative answers. |
| Video/audio/transcripts | MP4, MOV, WebM, M4A, MP3, WAV, OGG, uploaded transcript text | Transcript-first. Raw media transcription is owner-triggered, support-credit charged, byte-capped, and explicitly visible. |
| Changelog/releases | changelog entries, release notes, GitHub release export, release email text | Connects to product surfaces, affected answers, and stale-answer review. |
| Helpdesk history | Zendesk/Intercom/Freshdesk/Help Scout exports, ticket CSV/JSON, support email exports, macros, canned replies, chat transcripts | Export upload path only for day-one. Native OAuth connectors are not required for launch because of credential and privacy risk. |
| Product surfaces | app routes, page names, workflows, roles, plans, error states, starter surface templates | Feeds page-aware widget support and product readiness. |
| Policy pack | refund, cancellation, billing, pricing, security, privacy, data deletion, roles, permissions, API limits | High-authority owner answers. Always high-risk review before publishing. |

---

## 6. Website Link Intake

Product links should be the easiest starting point because many first-time founders have a public website before they have a clean help center.

Owner-facing flow:

1. Owner pastes the main product website link.
2. Owner may optionally add docs/help, pricing, changelog, status, terms, privacy, API docs, and app login URL.
3. Answerlattice runs a cheap discovery pass using sitemap, robots, canonical links, llms.txt, and selected public pages.
4. Answerlattice shows candidate pages grouped as product overview, pricing, docs, FAQ, changelog, legal/security, API, and low-value pages.
5. Owner confirms the pages to process.
6. Only confirmed pages become knowledge sources and consume extraction/draft credits.

Rules:

- app login URL seeds product surfaces and widget setup; it is not crawled behind authentication
- discovered URLs are stored in a Storage manifest, not one Firestore document per URL
- selected pages receive compact source metadata and source lineage
- homepage and marketing pages can explain product positioning, but cannot override pricing, legal, security, policy, or owner-approved answers
- URL query tracking parameters are stripped before dedupe and source hashing
- repeated imports compare source hash, ETag, Last-Modified, canonical URL, and normalized text hash before running extraction again
- if unchanged, Answerlattice updates freshness metadata only and skips AI/provider work

The first screen should say:

**Paste your product link. Answerlattice finds the support-worthy pages. You choose what becomes source material.**

---

## 7. Source Authority

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

If sources conflict, Answerlattice creates a review item instead of guessing.

Example:

Pricing page says API access is Enterprise-only. Old sales deck says API access is included in Pro. Answerlattice recommends the pricing page as higher authority and asks the owner to confirm.

---

## 8. Risk Domains

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

First form asks:

- product name
- product website
- app URL
- docs/help URL
- pricing URL
- changelog URL
- terms/privacy/security URLs when available
- support email
- billing model
- most important support pages
- what Answerlattice should not answer
- escalation rules

If the owner has no docs, they continue with policy pack + product surface templates.

### 9.3 Source Preflight

Before processing, Answerlattice shows:

- source type
- expected processing cost/credits
- page/file/media cap
- privacy warnings
- secret/private-data warnings
- authority default
- retention choice
- what will be extracted
- candidate website pages and selected page count

Owner explicitly confirms expensive or private sources.

Before any provider prompt is created, normalized source material must pass a secret/private-data classification and redaction step. If risky content remains, Answerlattice creates a review item instead of sending that material to drafting prompts by default.

### 9.4 Source Audit

After normalization, Answerlattice shows:

- sources found
- usable sources
- duplicates
- unsupported files
- stale/old sources
- high-risk sources
- conflicting sources
- missing launch-critical areas
- selected website pages and skipped low-value pages

### 9.5 Product Map

Answerlattice builds a product map:

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

Owner sees a plain-language preview:

**Answerlattice found 28 product concepts, 6 workflows, 4 plans, and 9 launch decisions.**

### 9.6 Launch Decision Queue

The owner does not review every extracted fact.

Queue buckets:

- critical blockers
- source conflicts
- missing launch info
- high-risk draft
- product concept
- approved answer draft
- safe bulk approval
- resolved

Target first-launch review burden: 5-15 decisions.

### 9.7 Draft Generation

After audit and product map, Answerlattice generates:

- KB article drafts
- FAQs and custom Q&A
- canonical answer drafts
- guided workflow drafts when the guided workflow flag is enabled
- product-surface suggestions
- widget suggested prompts
- ticket macro drafts
- changelog-linked support review items
- support gap tasks

Drafts stay pending until approval.

### 9.8 Safe Publish

Owner chooses destinations:

- Knowledge Base
- FAQ layer
- Canonical answers
- Product ontology / entity candidates
- Product surfaces
- Widget suggestions
- Hosted help
- Support Board / review tasks

Publish validates:

- selected items approved
- high-risk items explicitly approved
- conflicts resolved or excluded
- destination plan limits available
- source lineage attached
- cache/source-version manifests updated

### 9.9 Runtime Output Contract

Publishing is not complete when draft documents are written. Publishing is complete only when the approved output is visible to the existing Answerlattice runtime paths that already serve owners and end users.

Runtime requirements:

- Help center articles are written to `kb_articles` and `kb_categories` with tenant/store scope, lineage, tags, context keys, and entity ids where available.
- Published article text is embedded before the related topic is marked search-ready. If embedding fails, the article may remain visible in hosted help, but widget/search readiness is `partial` until embedding succeeds or an owner excludes that source from search.
- FAQ/custom Q&A output is written to `answerlattice_faqs` as `published` and `active`, linked to articles, entities, tags, and context keys when available.
- Canonical answers remain the first retrieval path. Intake can create drafts and mutation proposals, but an answer becomes `active` only after owner/admin approval and destination validation.
- Product surface suggestions write existing `answerlattice_productSurfaces` records with route patterns, feature/page/workflow labels, visibility, entity ids, tags, and lineage.
- Article, FAQ, ticket, and surface changes refresh or mark stale the compact product-surface content summary used for page-aware related content.
- Intake can use release notes or existing changelog entries as source context for support drafts, but it does not write changelog pages or `answerlattice_releases`. Owners publish release notes through the Changelog workflow.
- Published outputs mark existing runtime source versions stale: `kb`, `docsNav`, `canonical`, `surfaces`, `entities`, and `entityRelations` as applicable.
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

Readiness is topic-specific, not generic.

Example:

- Onboarding: ready
- Billing: partial, refund policy missing
- Team roles: ready
- API troubleshooting: not ready
- Security: needs owner review

Readiness rules:

- product profile complete
- paid entitlement active
- trusted source imported
- product map accepted
- critical conflicts resolved
- high-risk topics reviewed
- at least one approved answer or article exists for the surface
- embeddings are ready for published article content that should power search
- product-surface content summary includes the latest approved articles, FAQs, owner-managed changelog entries, and surfaces where applicable
- widget install and context verified where applicable
- compact readiness summary updated so dashboards do not scan articles, answers, sources, or review items

---

## 10. Summary-First Owner Experience

The owner dashboard should feel instant even when the workspace has many sources.

First screen reads:

- active intake job status
- source counts
- selected website page counts
- open/critical launch decisions
- top urgent review items
- topic readiness
- remaining allowance

This comes from `platformSummary/knowledgeIntakeSummary_{tId}_{sId}`.

Detailed lists open only when the owner clicks a tab:

- source registry
- selected product links
- review queue
- generated drafts
- publish manifest
- usage ledger

Intake processing is owner-triggered. Scheduler/ops do not discover active intake work for retries or imports. The existing Answerlattice nightly scheduler may refresh compact intake analytics from the latest bounded job docs and must skip provider calls, failed-job retry, crawling, and publishing.

---

## 11. Success Metrics

| Metric | Target |
| --- | --- |
| Time to first useful source audit | <3 minutes for small URL/docs import |
| Time to first product map | <7 minutes for starter import |
| Owner launch decisions | 5-15 decisions for first launch |
| Time to first approved answer | One focused setup session for small starter imports, after human review |
| Source coverage | At least top 2-5 product pages mapped in first session |
| High-risk unresolved count | Zero before support is marked ready for that topic |
| Draft approval rate | >60% approved with minor edits |
| Fallback reduction after launch | Tracked through existing signal/trust metrics |
| Cost overrun | 0 jobs exceed configured plan/cap limits |
| Unselected URL Firestore writes | 0 source documents for skipped/discovered-only URLs |
| Unchanged link reprocess | 0 AI/provider calls when source hashes are unchanged |
| First dashboard read | 1 summary doc before detailed tabs are opened |
| Scheduler discovery | Bucketed summary docs, no collection scan over intake jobs/sources/review items |

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

## 13. Acceptance Criteria

The implementation is complete only when:

- paid entitlement blocks every expensive job before work begins
- only one expensive intake job per workspace runs at a time unless an explicit plan/concurrency cap allows more
- source registry exists and all adapters write through it
- raw/heavy source artifacts are stored in Storage, not Firestore
- source metadata and summary reads are bounded and scoped by `pId`, `tId`, `sId`
- source authority and high-risk domains are enforced
- review queue is unified and founder-friendly
- generated outputs retain source lineage
- publishing uses existing Answerlattice destination systems instead of duplicate content models
- readiness is updated from compact summary docs
- dashboard and activation use the workspace intake summary before detailed list queries
- scheduler/ops discovery uses bucketed intake directory summaries
- source delete/retention controls exist
- website link intake stores discovered candidates in Storage and creates Firestore source docs only for owner-selected pages
- unchanged selected links skip extraction/drafting and update freshness metadata only
- app URL is treated as product surface/setup context, not as a credentialed crawler target
- provider prompts use redacted, selected evidence only; raw source bodies and private data are not sent by default
- test workspaces prove clean docs, no-docs, conflicts, media, helpdesk exports, and large import limits

---

## 14. Version History

| Date | Version | Change |
| --- | --- | --- |
| 2026-05-31 | 1.0.0 | Initial founder-first, paid-gated intake product spec. |
| 2026-05-31 | 1.1.0 | Added first-class website link intake, selected-page processing, and unchanged-source skip rules. |
| 2026-05-31 | 1.2.0 | Added privacy preflight and bounded job orchestration requirements. |
| 2026-05-31 | 1.3.0 | Added summary-first owner experience and scheduler discovery requirements. |
| 2026-05-31 | 1.4.0 | Added end-to-end runtime output contract for hosted help, FAQ, canonical-first retrieval, vector search, surface summaries, changelog, and compiled context source versions. |
