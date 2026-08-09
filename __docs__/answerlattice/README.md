# Help Center — Feature Documentation

> **Status:** DOCUMENTED (Forensic Audit)
> **Last Updated:** 2026-08-05
> **Audit Type:** Codebase-first forensic documentation
> **Feature Scope:** 16 subsystems, 190+ files, Answerlattice + Help Center Firestore collections

---

## What Is This

The Help Center is MenuList's **integrated support infrastructure** — a multi-layered system that provides:

- **Governed support-answer runtime** — approved answers and FAQs first, then source-backed workspace knowledge with safe fallback
- **Knowledge Base (KB)** — Hierarchical article system with categories, sections, and articles
- **KB Article Generation Pipeline** — Upload raw files → AI generates articles → review → publish → embed
- **Ticket System** — Governed human fallback with scoped intake, bounded attachments, append-only replies/status history, operational SLA indicators, and explicit handoff
- **Releases and Changelog** — Ordered release activation, answer-drift propagation, draft-first versioned publication, exact dependency linkage, and public feedback
- **Feedback System** — Multi-step owner feedback (general, feature usage, feature requests)
- **Conversation Monitoring** — Scoped conversation review, bounded quality evidence, feedback, private notes, and knowledge-gap handoff
- **Ticket Email Notifications** — Server-projected created/reply/status notices with scoped authorization, claimed delivery, and Activation verification
- **Content Feedback** — Article and changelog feedback with comment threading
- **Embedding Cache** — Scoped query embedding reuse that avoids repeated provider calls on fresh cache hits
- **Search History Cache** — Full response caching for repeated queries
- **AI Intelligence Layer** — Cloud Functions for feedback intelligence, KB quality, weekly narratives

Answerlattice is now maintained as separate governed answer infrastructure for SaaS support. MenuList is one independent client integration for shared support surfaces; Answerlattice-owned dashboard, onboarding, widget, scheduler, and Firebase data stay under Answerlattice routes, constants, flags, and product-scoped session data.

Firebase assurance and current deployment limits: [Firebase Forensic Audit](./firebase-forensic-audit.md).

## Answerlattice Product Operating Model

Answerlattice dashboard navigation is grouped by the product-owner workflow. The owner presentation uses Get Live, Run Support, and Answer Quality so first-time operators can understand the product without learning internal architecture terms. Technical routes, schemas, and implementation docs continue to use their established names.

| Sidebar group | Purpose | Primary routes |
| --- | --- | --- |
| Get Live | Activate a new client workspace, manage product details, import starter knowledge, map Product Pages & Flows, and review Setup Status. | `/answerlattice/activation`, `/answerlattice/settings`, `/answerlattice/kb-generation`, `/answerlattice/product-surfaces`, `/answerlattice/dashboard` |
| Run Support | Run owner/staff support operations: KB management, FAQs, changelog management, Support Board, ticket inbox, conversations, and weekly digest. End-user help, docs, release notes, and ticket submission are runtime/customer surfaces, not primary owner dashboard navigation. | `/answerlattice/knowledge-base`, `/answerlattice/faqs`, `/answerlattice/changelog`, `/answerlattice/support-board`, `/answerlattice/tickets`, `/answerlattice/conversations`, `/answerlattice/weekly-digest` |
| Widget & Hosted Help | Configure widget appearance, install/embed snippets, hosted help domains, allowed origins, blocked routes, and key security. | `/answerlattice/widget/ui`, `/answerlattice/widget/install`, `/answerlattice/widget/hosted-help`, `/answerlattice/widget/access` |
| Team & Access | Manage workspace members and Answerlattice roles without mixing them into setup or support content. | `/answerlattice/team/members`, `/answerlattice/team/roles` |
| Billing | Manage subscription and payment history. | `/answerlattice/billing`, `/answerlattice/transactions` |
| Answer Quality | Govern Trusted Answers, Product Topics, Answers to Recheck, Suggested Updates, coverage, and trust metrics. | `/answerlattice/governance/answers`, `/answerlattice/governance/entities`, `/answerlattice/governance/drift`, `/answerlattice/governance/signal-queue`, `/answerlattice/governance/trust` |

The Activation Command Center reads compact summary docs only. Generated entity candidates and canonical answer drafts appear in Governance for human approval; drafts are never auto-published.

Owner-facing setup surfaces must stay direct and founder-readable. The dashboard metadata identifies Answerlattice instead of inheriting MenuList social metadata, Activation avoids time-to-launch promises, setup-state messages avoid backend implementation terms, Install Center snippets use an explicit full-key placeholder instead of a saved key prefix, Weekly Digest describes the prepared summary in owner terms, and review queues explain the next useful action when empty. These usability changes add no Firebase reads, writes, listeners, indexes, or scheduler work.

### Owner Decision Wiring

The owner features share validated URL context, not another action store or
analytics collection:

| From | To | Preserved context | Authority |
| --- | --- | --- | --- |
| Daily Brief | Product Friction Evidence | Selected entity ID | Friction summary remains the evidence source. |
| Daily Brief | Canonical Answers | Coverage-repair intent | Canonical Governance owns review and mutation. |
| Product Friction Evidence | Knowledge Map | Selected entity ID | The map remains read-only and does not ingest friction metrics. |
| Knowledge Map | Canonical Answers | Selected entity ID | Canonical Answers filters its existing loaded set. |
| Release impact preview | Canonical Answers | Affected answer ID | The preview remains private and read-only. |
| Release impact preview | Answer Tests | Pending release ID | Answer Tests selects the existing release only after the owner opens it. |
| Failed Answer Test | Canonical Answers | Resolved answer ID | Test results do not modify the answer. |

Entity, answer, and release context is bounded, Firestore-ID validated, and
revalidated by each destination. Creating these links adds no Firestore read,
write, listener, scheduler task, provider call, or support-credit operation;
the destination pays only its existing cost when the owner explicitly opens it.

---

## Document Index

| #   | Document                                         | Audience        | Purpose                                                       |
| --- | ------------------------------------------------ | --------------- | ------------------------------------------------------------- |
| 1   | **README.md** (this file)                        | Everyone        | Master index and navigation                                   |
| 2   | `help-center/help-center_spec.md`                | CEO/PM/Clients  | Business requirements, user flows, feature map                |
| 3   | `help-center/help-center_impl.md`                | Developers      | Technical blueprint — every file, function, dependency        |
| 4   | `help-center/help-center_firebase.md`            | Developers/Ops  | Every Firestore collection, read/write/delete, cost estimates |
| 5   | `help-center/help-center_marketing.md`           | Sales/Marketing | Positioning, pitch points, competitive comparison             |
| 6   | `help-center/help-center_website.md`             | Public website  | Landing page content, SEO meta                                |
| 7   | `help-center/help-center_helpdoc.md`             | End users       | Customer help documentation                                   |
| 8   | `help-center/help-center_mobile-support.md`      | Mobile team     | 4-gate admission test, mobile architecture                    |
| 9   | `help-center/help-center_decoupling-analysis.md` | Strategy/Arch   | Future standalone SaaS readiness assessment                   |
| 10  | `firebase-cost-optimization-audit.md`            | Developers/Ops  | Answerlattice-wide Firebase read/write/listener cost map and latest optimizations |
| 11  | `deployment/answerlattice-qa-deployment-runbook.md`   | Developers/Ops  | QA deployment evidence, commands, secret handling, and production checklist |
| 12  | `product-surface-contexts/`                      | Product/Ops/Dev | Route/page/workflow context model for related KB, changelog, ticket, and widget answers |
| 13  | `system-inventory/`                              | Product/Dev/Ops  | Codebase-first Answerlattice feature map, route map, Firebase map, file inventory, and website truth |
| 14  | `self-sellable-product-strategy.md`              | Product/Sales/Dev | Answerlattice self-serve positioning, founder-first ICP, bounded team fit, pricing direction, and execution task list |
| 14A | `progressive-adoption-operating-guide.md`         | Product/Ops/Sales | One-product Start, Coordinate, and Govern manual for solo founders, small teams, and bounded product groups |
| 14B | `customer-language-contract.md`                   | Product/Design/Dev | Stable owner-facing labels, progressive-disclosure rules, and zero-runtime-cost terminology contract |
| 15  | `faq-management/`                                | Product/Ops/Dev | Owner-reviewed short answers linked to articles and product surfaces |
| 16  | `developer-install-pack/`                        | Product/Sales/Dev | Agent install packet, v1 script quickstarts, install verifier, starter surfaces, import starters, ROI, proof, and ops one-pager |
| 17  | `staff-access-control/`                          | Product/Ops/Dev | Answerlattice team members, workspace roles, permission claims, and rule-level access control |
| 18  | `support-board/`                                 | Product/Ops/Dev | Private owner/staff Support Board, Needs Answer queue, internal notes, and future support-work roadmap |
| 19  | `knowledge-intake-command-center/`               | Product/Ops/Dev | Planned founder-first, paid-gated source intake architecture that sits above the current KB generation pipeline |
| 20  | `cost-read-model-guardrails/`                    | Developers/Ops | Answerlattice-wide summary-doc, bounded-list, listener, and Firebase cost guardrails |
| 21  | `owner-support-assistant/`                       | Product/Ops/Dev | Docs-frozen owner/staff support review and action assistant using existing summaries, tickets, Governance, Support Board, typed action adapters, and cost-bounded AI operation logging |
| 22  | `aidbase-competitor-response_validation.md`      | Product/Dev/Ops | Aidbase fit verdict, implemented response matrix, cross-surface evidence, source gates, and release blockers |
| 23  | `drift-governance/`                             | Product/Ops/Dev | Four-class probable-drift evaluation, release propagation, review queue, human revalidation, Firebase cost, and claim boundaries |
| 24  | `changelog-system/`                            | Product/Ops/Dev | Feature 11 governed release registry, draft-first versioned publication, exact dependency validation, public projection, recovery, and cost boundaries |
| 25  | `compiled-context-distribution/`               | Product/Ops/Dev | Feature 14 immutable bounded bundle build, version, failure, ref-validation, and consumer-rollout contract |
| 26  | `instant-response-infrastructure/`             | Product/Ops/Dev | Feature 14 optional canonical cache, freshness, payload-validation, expiry, and public-claim boundary |
| 27  | `public-api/`                                  | Product/Ops/Dev | Feature 35 server-to-server governed answer/entity/signal distribution and credential lifecycle |
| 28  | `mcp/`                                         | Product/Ops/Dev | Feature 36 rollout-gated MCP session, protocol, tool, compiled-context, signal, and compatibility contract |
| 29  | `support-truth-export/`                        | Product/Ops/Dev | Feature 37 private approved-truth portability, projection, audit, cap, and non-goal contract |
| 30  | `multi-language-articles/`                     | Product/Ops/Dev | Feature 38 disabled translation-draft boundary, source fingerprint, overwrite guard, and customer-delivery non-goal |
| 31  | `advanced-white-label/`                        | Product/Ops/Dev | Feature 39 validated private branding-profile prototype, strict storage, injection boundary, and customer-delivery non-goal |
| 32  | `ai-failure-escalation/`                      | Product/Ops/Dev | Feature 40 active widget fallback plus default-off final-evidence evaluator, server-reserved ticket authority, and Help Chat activation blockers |
| 33  | `native-knowledge-intake-connectors/`         | Product/Ops/Dev | Feature 41 reserved-only connector boundary, evidence gate, and explicit do-not-build-now decision |
| 34  | `signal-quality-scoring/`                    | Product/Ops/Dev | Feature 42 transparent evidence boundary and validation-before-development decision |
| 35  | `native-helpdesk-and-jira-connectors/`       | Product/Ops/Dev | Feature 43 export-first boundary and one-provider paying-client evidence gate |
| 36  | `autonomous-browser-and-account-actions/`    | Product/Ops/Dev | Feature 44 Explain + Guide boundary and explicit account-action non-goal |
| 37  | `system-inventory/answerlattice-final-cross-cutting-audit.md` | Product/Dev/Ops | Final C1-C8 local closure, verification evidence, deploy blocker, and remaining release order |

---

## 15 Subsystems (Verified via Codebase)

| #   | Subsystem                      | Owner-Side                                        | End-User-Side               | Platform-Admin                |
| --- | ------------------------------ | ------------------------------------------------- | --------------------------- | ----------------------------- |
| 1   | **AI QnA Chat Bot**            | —                                                 | ✅ `helpChat/`              | ✅ `chatManagement/`          |
| 2   | **Knowledge Base Explorer**    | —                                                 | ✅ `KnowledgeBaseExplorer/` | ✅ `platform/knowledgeBase/`  |
| 3   | **KB Article Generation**      | —                                                 | —                           | ✅ `platform/KBGeneration/`   |
| 4   | **Article Embedding Pipeline** | —                                                 | —                           | ✅ API route + CF             |
| 5   | **Support Tickets (Owner)**    | ✅ `helpCenter/TicketView`                        | —                           | —                             |
| 6   | **Support Tickets (Platform)** | —                                                 | —                           | ✅ `platform/supportTickets/` |
| 7   | **Changelog (Owner view)**     | ✅ `helpCenter/ChangelogView`                     | —                           | —                             |
| 8   | **Changelog (Platform CRUD)**  | —                                                 | —                           | ✅ `platform/changelog/`      |
| 9   | **Feedback (Owner)**           | ✅ `helpCenter/ShareFeedbackView`                 | —                           | —                             |
| 10  | **Feature Requests**           | ✅ `helpCenter/FeatureRequests`                   | —                           | —                             |
| 11  | **Feature Usage Feedback**     | ✅ `helpCenter/FeatureUsage`                      | —                           | —                             |
| 12  | **Contact Us**                 | ✅ `helpCenter/ContactUsView`                     | —                           | —                             |
| 13  | **FAQ**                        | ✅ `answerlattice/faqManagement`                       | ✅ `helpCenter/FaqView`      | ✅ `answerlattice_faqs` DAL        |
| 14  | **Chat Monitoring**            | —                                                 | —                           | ✅ `chatManagement/`          |
| 15  | **AI Intelligence Layer**      | —                                                 | —                           | ✅ Cloud Functions            |
| 16  | **Answerlattice Knowledge Plane**   | ✅ `AnswerlatticeCoverageKPI` `MutationProposalReview` | —                           | ✅ `answerlatticeNightly` CF       |

---

## Key Files Quick Reference

### Pages (Routes)

- `/help-center` → `src/app/(main)/help-center/page.tsx`
- `/platform/support-tickets` → `src/app/(main)/(platform-pages)/platform/support-tickets/page.tsx`
- `/platform/changelog` → `src/app/(main)/platform/changelog/page.tsx`
- `/platform/chat-management` → Chat management dashboard (platform tab)
- `/platform/knowledge-base` → KB management (platform tab)
- `/platform/kb-generation` → KB generation pipeline (platform tab)

### Answerlattice Client / Compatibility Routes

- `/answerlattice/help` → `src/app/(answerlattice)/answerlattice/help/page.tsx`
- `/answerlattice/docs` → `src/app/(answerlattice)/answerlattice/docs/page.tsx`
- `/answerlattice/support` → `src/app/(answerlattice)/answerlattice/support/page.tsx`
- `/answerlattice/release-notes` → `src/app/(answerlattice)/answerlattice/release-notes/page.tsx`

The `/help-center` surface belongs to the MenuList owner app. Answerlattice dashboard and management surfaces remain separate product routes. The `/answerlattice/help` route is a compatibility/direct shell route that reuses the same Help Center home; `/answerlattice/docs`, `/answerlattice/support`, and `/answerlattice/release-notes` remain direct customer/shell routes for documentation, ticket submission, and release-note viewing. These routes are intentionally not part of the owner dashboard sidebar. Management sessions that open them are redirected to the owner equivalent: Knowledge Base, Changelog, Ticket Inbox, or the first permitted owner route.

### Answerlattice Operator Routes

- `/answerlattice/activation` → `src/app/(answerlattice)/answerlattice/activation/page.tsx`
- `/answerlattice/dashboard` → `src/app/(answerlattice)/answerlattice/dashboard/page.tsx`
- `/answerlattice/governance` → `src/app/(answerlattice)/answerlattice/governance/page.tsx`
- `/answerlattice/governance/[tab]` → `src/app/(answerlattice)/answerlattice/governance/[tab]/page.tsx`
- `/answerlattice/settings` → `src/app/(answerlattice)/answerlattice/settings/page.tsx`
- `/answerlattice/team` → `src/app/(answerlattice)/answerlattice/team/page.tsx`
- `/answerlattice/team/[tab]` → `src/app/(answerlattice)/answerlattice/team/[tab]/page.tsx`
- `/answerlattice/tickets` → `src/app/(answerlattice)/answerlattice/tickets/page.tsx`
- `/answerlattice/conversations` → `src/app/(answerlattice)/answerlattice/conversations/page.tsx`
- `/answerlattice/knowledge-base` → `src/app/(answerlattice)/answerlattice/knowledge-base/page.tsx`
- `/answerlattice/faqs` → `src/app/(answerlattice)/answerlattice/faqs/page.tsx`
- `/answerlattice/kb-generation` → `src/app/(answerlattice)/answerlattice/kb-generation/page.tsx`
- `/answerlattice/changelog` → `src/app/(answerlattice)/answerlattice/changelog/page.tsx`
- `/answerlattice/support-board` → `src/app/(answerlattice)/answerlattice/support-board/page.tsx`
- `/answerlattice/product-surfaces` → `src/app/(answerlattice)/answerlattice/product-surfaces/page.tsx`
- `/answerlattice/widget` → `src/app/(answerlattice)/answerlattice/widget/page.tsx`
- `/answerlattice/widget/[tab]` → `src/app/(answerlattice)/answerlattice/widget/[tab]/page.tsx`
- `/answerlattice/billing` → `src/app/(answerlattice)/answerlattice/billing/page.tsx`
- `/answerlattice/transactions` → `src/app/(answerlattice)/answerlattice/transactions/page.tsx`
- `/answerlattice/weekly-digest` → `src/app/(answerlattice)/answerlattice/weekly-digest/page.tsx`
- `/answerlattice/support-assistant` → `src/app/(answerlattice)/answerlattice/support-assistant/page.tsx`

### Answerlattice Owner Support Assistant Read-Only Runtime

The enabled `/answerlattice/support-assistant` management route requires `MANAGE_SUPPORT` and exposes deterministic, summary-only operational guidance. Its protected brief/query APIs strictly parse six compact `platformSummary` documents, report missing/invalid/stale source health, filter links by current permissions, bound request/response parsing, use private/no-store responses, and rate-limit before data-backed admission. The runtime performs no provider call, transcript persistence, assistant write, raw conversation/ticket read, mutation preview, or mutation execution. The action, feedback, AI-assisted, bounded-detail, owner-analytics, and scheduler contracts in the feature docs remain deferred.

The Answerlattice shell is responsive: desktop uses the shared MenuList dashboard chrome for the header/sidebar and Answerlattice-owned navigation, while mobile uses a sticky header and drawer navigation with the same safe-area handling. The sidebar exposes workflow groups and clean tab subroutes for Governance, Widget, and Team. Client support users see only the client support routes; Answerlattice owner/admin/manager sessions and `PLATFORM` / `PLATFORM_SUPPORT` sessions can access management routes. Governance tables use horizontal scroll on narrow screens, and detail drawers/modals collapse to viewport width.

### MenuList Help Center Boundary

MenuList owner support entry points open the MenuList-owned Help Center home. They do not mount Answerlattice management screens or the Answerlattice widget inside the MenuList owner shell:

- Desktop sidebar Help → `/help-center`
- Desktop support popover Help Center → `/help-center`
- Desktop support popover Documentation → `/help-center/kb`
- Desktop support popover Submit a Ticket → `/help-center/ticket`
- Mobile More tab Help Center → existing Help Center home inside `MobileShell`
- Mobile More tab Documentation → existing Help Center `kb` tab inside `MobileShell`
- Mobile More tab Support Tickets → existing Help Center `ticket` tab inside `MobileShell`
- Mobile More tab Release Notes → existing Help Center `changelog` tab inside `MobileShell`

The mobile More tab does not route-hop to `/answerlattice/*`; it renders `src/components/templates/main-app/helpCenter` inside the MenuList mobile shell to prevent hash/router fights, accidental desktop fallback, or app reloads. Direct visits to `/help-center`, `/help-center/kb`, `/help-center/ticket`, `/help-center/changelog`, and legacy `?tab=` URLs resolve to the same Help Center tabs. Nested `/help-center/*` routes are treated as MobileShell routes, so mobile article, ticket, and changelog deep links do not fall back to Today or a blank desktop shell. Article deep links use `/help-center/kb/articles/:articleId`; changelog deep links use `/help-center/changelog/:entryId`. Answerlattice operator routes such as `/answerlattice/dashboard`, `/answerlattice/knowledge-base`, `/answerlattice/tickets`, `/answerlattice/changelog`, and `/answerlattice/widget` stay in the Answerlattice product dashboard.

### Answerlattice Public Routes

- `/sites/answerlattice` and `__answerlattice` host rewrites → Answerlattice marketing site
- `/sites/answerlattice/demo` and `__answerlattice/demo` → static page-aware product demo
- `/sites/answerlattice/get-started` → self-service onboarding
- `/sites/answerlattice/product`, `/product/team-access`, `/pricing`, `/security`, `/faq`, `/about`, `/contact` → public site pages
- `/sites/answerlattice/quickstarts` → framework examples for the v1 widget script contract
- `/sites/answerlattice/roi-calculator` → static repeated-question support planning calculator
- `/sites/answerlattice/proof` → example Answerlattice workloads for buyer evaluation
- `/sites/answerlattice/security-one-pager` → shareable security and operations summary
- `/sites/answerlattice/privacy-policy`, `/sites/answerlattice/terms-of-service` → public legal/support policy pages
- `/sites/answerlattice/sitemap.xml`, `/sites/answerlattice/robots.txt` → Answerlattice product-domain SEO metadata routes
- `/widget/embed` → maintained key-free iframe shell used by the public loader
- `/widget/[apiKey]` → legacy-compatible iframe route; not the maintained installation path

The public widget is mobile-first and uses `100dvh`, 44px launcher/input actions, MIME-safe image preview, canonical answer badges, structured procedure rendering, safe page context from `AnswerlatticeWidget.page()/setContext()`, and fire-and-forget feedback. Workspace-opted-in Guided Resolution can highlight exact `data-answerlattice-target` controls and wait for allowlisted `emitWorkflowEvent()` events for approved canonical procedures; it never clicks controls, executes client actions, captures the DOM, or changes product data. Widget keys are managed as bounded named keys on `stores/{sId}.answerlatticeWidgetApi`; malformed keys short-circuit before Firestore lookup, runtime validation uses key hashes, raw keys are shown only once at creation time, and widget search/feedback/guidance JSON bodies are byte-capped after API key, rate-limit, product, purpose, scope, and origin admission. The iframe client also bounds and shape-validates widget search responses before rendering assistant messages. The public site avoids exposing tenant/store ids and routes completed onboarding to `/answerlattice/activation`.

Widget iframe frame headers are relaxed only on Answerlattice product hosts resolved by middleware or on local development hosts outside Vercel. `/widget/*` on MenuList and other product hosts must not inherit the Answerlattice embeddable frame policy by path alone.

### API Routes

- `POST /api/helpCenter/search-kb` — Authenticated JSON wrapper for the shared canonical-first search runtime
- `POST /api/helpCenter/article-embedding` — Generate & store article embeddings
- `GET /api/widget/config`, `POST /api/widget/search`, `POST /api/widget/feedback` — Public widget runtime with key, scope, origin/runtime-token, rate-limit, and bounded-payload admission
- `POST /api/widget/guidance-outcome` — Workspace-opted-in terminal Guided Resolution outcome; requires canonical widget search-history proof and emits at most one deduplicated existing signal
- `GET /api/answerlattice/activation/summary` — Cost-optimized client readiness summary from compact store/platformSummary docs
- `POST /api/answerlattice/onboard` — Self-service Answerlattice workspace provisioning
- `GET/PUT /api/answerlattice/workspace-profile` — Product URL, support email, billing model, scheduler timezone/support-day end time, and initial surface profile
- `GET/PUT /api/answerlattice/widget-config` — Protected widget configuration, allowed origins, blocked routes, and runtime status
- `GET /api/answerlattice/operations/status` — Protected Activation Daily Governance status from compact scheduler summaries and capped run logs
- `POST /api/answerlattice/widget-key` — Protected widget key create/rename/revoke management with a legacy delete alias; raw keys are shown only once on create
- `POST /api/answerlattice/tenant-summary` — Authenticated server-side sync for `platformSummary/answerlatticeTenantsSummary` after client-side entity creation
- `POST /api/answerlattice/product-surfaces/rebuild-summary` — Authenticated rebuild of compact `platformSummary/contextContent_{tId}_{sId}` for route-aware related content

- `GET /api/answerlattice/support-assistant/brief` — Protected six-summary operational brief with strict source-health contracts and a bounded in-process cache
- `POST /api/answerlattice/support-assistant/query` — Protected, rate-limited deterministic ten-intent classifier over the same summary packet

No `/api/answerlattice/support-assistant/actions/*`, feedback, or owner-analytics endpoint is live.

### Database Layer (DAL)

- `src/database/knowledgeBase/articles.ts` — KB articles CRUD
- `src/database/knowledgeBase/categories.ts` — KB categories/sections CRUD
- `src/database/chatSessions/index.ts` — Chat sessions CRUD + admin methods
- `src/database/chatAnalytics/index.ts` — Aggregated analytics + optimized queries
- `src/database/tickets/index.ts` — Support tickets CRUD + real-time listeners
- `src/database/changelog/index.ts` — Paginated changelog with transactions
- `src/database/feedback/index.ts` — General/feature feedback
- `src/database/contentFeedback/index.ts` — Article & changelog feedback
- `src/database/aiSearchHistory/index.ts` — Search cache + history
- `src/database/queryEmbeddings/index.ts` — Embedding vector cache
- `src/database/kb-generation/jobs.ts` — Ingestion job lifecycle
- `src/database/answerlattice/entities.ts` — Answerlattice entity CRUD + search index
- `src/lib/answerlattice/tenantSummaryClient.ts` — Fire-and-forget entity-registry sync after manual entity creation
- `src/database/answerlattice/canonicalAnswers.ts` — Canonical answer CRUD + governance
- `src/database/answerlattice/mutationProposals.ts` — Mutation proposal lifecycle
- `src/database/answerlattice/entityCandidates.ts` — Entity candidate staging + promotion
- `src/database/answerlattice/signalEvents.ts` — Signal event append-only log
- `src/database/answerlattice/releases.ts` — Immutable release registry
- `src/database/answerlattice/auditLogs.ts` — Governance audit trail
- `src/database/answerlattice/coverageKPI.ts` — Coverage KPI reads
- `src/database/answerlattice/productSurfaces.ts` — Product surface CRUD and compact related-content summary reads
- `src/data/answerlattice/surfaceTemplates.ts` — Bounded starter surface templates for common SaaS pages

### Cloud Functions

- `functions-answerlattice/src/index.ts` — Answerlattice Cloud Functions entry point
- `functions-answerlattice/src/answerlattice/answerlatticeMasterScheduler.ts` — Centralized Answerlattice scheduler: task registry, hourly EOD filtering, task lease, workspace/date locks, and master scheduler state
- `functions-answerlattice/src/answerlattice/schedulerTime.ts` — Workspace timezone/support-day settlement helpers
- `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` — Answerlattice governance batch: summary-based tenant discovery, drift detection, signal mutation, signal resolution, coverage KPI, trust metrics, fallback detection, impact tracking, confidence adjustment, and signal TTL
- `functions-answerlattice/src/answerlattice/tenantSummary.ts` — Cost-optimized `platformSummary/answerlatticeTenantsSummary` registry used by the scheduler before legacy entity-scan fallback
- `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` — Persists structured run logs to `answerlattice_schedulerRunLogs` with per-tenant task results and diagnostics
- `functions-answerlattice/src/answerlattice/draftGenerator.ts` — Canonical answer draft generation
- `functions-answerlattice/src/answerlattice/resolutionExtractor.ts` — Ticket-resolution knowledge extraction

### Types

- `src/types/knowledgeBase.ts` — KB articles, categories, sections, ingestion jobs
- `src/types/chatSession.ts` — Chat messages, sessions, admin filters
- `src/types/supportTicket.ts` — Ticket types, statuses, SLA config
- `src/types/changelog.ts` — Changelog entries and pages
- `src/types/feedback.ts` — General/feature feedback
- `src/types/aiFeedback.ts` — AI chat feedback types
- `src/types/answerlattice.ts` — Answerlattice entities, canonical answers, drift, mutations, releases, search index, audit logs

### Core Libraries

- `src/lib/vectorEmbeddings/index.ts` — Gemini embedding + chat (RAG core)
- `src/lib/vectorEmbeddings/articleEmbeddings.ts` — Text extraction from TipTap JSON
- `src/lib/validation/chatSchemas.ts` — Zod validation for search API
- `src/lib/rateLimit/` — Upstash rate limiting
- `src/lib/answerlattice/canonicalRetrieval.ts` — Canonical-first 3-layer retrieval
- `src/lib/answerlattice/driftDetection.ts` — 4-class drift engine
- `src/lib/answerlattice/entityExtraction.ts` — AI entity extraction pipeline
- `src/lib/answerlattice/signalEmitter.ts` — Fire-and-forget signal emission
- `src/lib/answerlattice/signalMutation.ts` — Signal clustering + mutation proposals
- `src/lib/answerlattice/diagnostics.ts` — Bounded runtime diagnostics for signal, mutation, entity extraction, draft, and billing fallback paths
- `src/lib/answerlattice/tokenizer.ts` — Deterministic tokenizer (frozen)

---

## Feature Flags

| Flag                                | Location                                       | Default | Purpose                                          |
| ----------------------------------- | ---------------------------------------------- | ------- | ------------------------------------------------ |
| `ENABLE_ANSWERLATTICE_ONTOLOGY`          | `src/config/features.ts`                       | `true`  | Entity extraction + ontology bootstrap           |
| `ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS` | `src/config/features.ts`                       | `true`  | Canonical-first retrieval + coverage KPI         |
| `ENABLE_ANSWERLATTICE_HYBRID_EVIDENCE_RETRIEVAL` | `src/config/features.ts`              | `false` | Bounded exact technical-token/entity evidence lane after canonical and FAQ miss |
| `ENABLE_ANSWERLATTICE_DRIFT_DETECTION`   | `src/config/features.ts`                       | `true`  | 4-class drift engine                             |
| `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION`   | `src/config/features.ts`                       | `true`  | Signal mutation + proposal review                |
| `ENABLE_ANSWERLATTICE_PUBLIC_API`        | `src/config/features.ts`                       | `false` | Server-to-server canonical answers, active/beta entities, governed signals, and owner-controlled hash-only key lifecycle (implemented and rollout-gated) |
| `ENABLE_ANSWERLATTICE_WIDGET`            | `src/config/features.ts`                       | `true`  | Embeddable help widget + onboarding gate         |
| `ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS`  | `src/config/features.ts`                       | `true`  | Structured approved canonical procedures         |
| `ENABLE_ANSWERLATTICE_GUIDED_RESOLUTION` | `src/config/features.ts`                       | `true`  | Controlled semantic target/event runtime; workspace opt-in defaults off |
| `ENABLE_ANSWERLATTICE_ACTIVATION_COMMAND_CENTER` | `src/config/features.ts`              | `true`  | Client launch/readiness home                     |
| `ENABLE_ANSWERLATTICE_NOTIFICATIONS`     | `src/config/features.ts`                       | `true`  | Email notifications for ticket events and Activation test-send |
| `ENABLE_ANSWERLATTICE_GOVERNANCE_UI`     | `src/config/features.ts`                       | `true`  | Governance hub (answer editor, drift, analytics) |
| `ENABLE_ANSWERLATTICE_INTAKE_NATIVE_CONNECTORS` | `src/config/features.ts`                | `false` | Reserved only; no connector, OAuth, credential, sync, or Functions runtime |
| `ENABLE_ANSWERLATTICE_SIGNAL_QUALITY`    | `src/config/features.ts`                       | `false` | Reserved only; no scoring runtime or Functions flag |
| `ENABLE_ANSWERLATTICE_WHITE_LABEL`       | `src/config/features.ts`                       | `false` | Private validated branding-profile prototype; no customer-surface delivery |
| `ENABLE_ANSWERLATTICE_MULTI_LANGUAGE`    | `src/config/features.ts`                       | `false` | Multi-language KB article translations           |
| `ENABLE_ANSWERLATTICE_CONTEXT_AWARE`     | `src/config/features.ts`                       | `true`  | Route/page/workflow context-aware retrieval      |
| `ENABLE_ANSWERLATTICE_PRODUCT_SURFACES`  | `src/config/features.ts`                       | `true`  | Route/page/workflow surface mapping              |
| `ENABLE_ANSWERLATTICE_INSTANT_CACHE`     | `src/config/features.ts`                       | `true`  | Redis cache for canonical answer hits; no-op without Upstash env |
| `ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE`    | `src/config/features.ts` / `functions-answerlattice/src/constants/features.ts` | `true` | Capped draft generation for new answer proposals |
| `ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE` | `src/config/features.ts` / `functions-answerlattice/src/constants/features.ts` | `true` | Capped nightly product friction summaries |
| `ENABLE_ANSWERLATTICE_TICKET_KNOWLEDGE`  | `src/config/features.ts` / `functions-answerlattice/src/constants/features.ts` | `true` | Capped resolved-ticket to knowledge proposals |
| `ENABLE_ANSWERLATTICE_FOUNDER_ONBOARDING` | `src/config/features.ts` / `functions-answerlattice/src/constants/features.ts` | `true` | Capped initial entity/draft bootstrap after KB publish |
| `ENABLE_ANSWERLATTICE_TRUST_METRICS`     | `src/config/features.ts` / `functions-answerlattice/src/constants/features.ts` | `true` | Compact trust metrics summary                    |
| `ENABLE_ANSWERLATTICE_NIGHTLY`           | `functions-answerlattice/src/constants/features.ts` | `true`  | Server-side nightly batch (3:00 AM UTC)          |
| `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT` | `src/config/features.ts` | `true` | Private summary-only assistant; no AI call or autonomous mutation path |
| `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT_ACTIONS` | `src/config/features.ts` | `false` | Owner-confirmed Support Board form prefill for selected launch/release review items; opening the form performs no write |

---

## Firestore Collections (27 Total)

| Collection                       | Purpose                                 | Scoping                             |
| -------------------------------- | --------------------------------------- | ----------------------------------- |
| `kb_articles`                    | Knowledge base articles with embeddings | Tenant+Store scoped                 |
| `kb_categories`                  | Category/section hierarchy (`categories_{tId}_{sId}` doc; legacy `categories` fallback is platform-only/filtered) | Tenant+Store scoped                 |
| `kb_generation_jobs`             | AI article generation jobs              | Tenant+Store scoped                 |
| `kb_staging_sections`            | Staging for article generation          | Global                              |
| `kb_staging_chunks`              | Staging chunks for processing           | Global                              |
| `kb_review_tasks`                | Article review tasks                    | Global                              |
| `kb_ai_runs`                     | AI processing run logs                  | Global                              |
| `kb_sections`                    | KB sections                             | Global                              |
| `chatSessions`                   | User chat conversations                 | Tenant+User scoped                  |
| `chatAnalytics`                  | Daily aggregated chat stats             | Tenant+Store scoped                 |
| `queryEmbeddings`                | Cached embedding vectors                | Tenant+Store scoped by cache key    |
| `aiSearchHistory`                | Cached search responses and feedback linkage | Tenant+Store scoped                 |
| `supportTickets`                 | Support tickets                         | Tenant+Store scoped                 |
| `feedback`                       | Owner feedback (general/feature)        | Tenant+Store+User scoped            |
| `changelog/{tId}/{sId}`          | Paginated changelog pages               | Tenant+Store scoped (subcollection) |
| `changelog_feedback/{tId}/{sId}` | Changelog entry feedback                | Tenant+Store scoped (subcollection) |
| `article_feedback/{tId}/{sId}`   | Article feedback                        | Tenant+Store scoped (subcollection) |
| `answerlattice_entities`              | Product ontology entities               | Tenant+Store scoped                 |
| `answerlattice_entityRelations`       | Entity relationships                    | Tenant+Store scoped                 |
| `answerlattice_canonicalAnswers`      | Governed canonical answers              | Tenant+Store scoped                 |
| `answerlattice_entityCandidates`      | AI-extracted entity candidates          | Tenant+Store scoped                 |
| `answerlattice_signalEvents`          | Friction signal events (append-only)    | Tenant+Store scoped                 |
| `answerlattice_mutationProposals`     | Governed mutation queue                 | Tenant+Store scoped                 |
| `answerlattice_releases`              | Immutable release timeline              | Tenant+Store scoped                 |
| `answerlattice_entitySearchIndex`     | Deterministic entity search index       | Tenant+Store scoped                 |
| `answerlattice_auditLogs`             | Governance audit trail (append-only)    | Tenant+Store scoped                 |
| `answerlattice_frictionDailyStats`    | Daily friction aggregates               | Tenant+Store scoped                 |
| `answerlattice_schedulerRunLogs`      | Answerlattice nightly run logs and diagnostics | Platform-only read, server-written |
| `answerlattice_aiOperations`          | Answerlattice AI operation/cost logs           | Tenant+Store scoped, server-written |
| `answerlattice_notificationLogs`      | Direct Answerlattice ticket notification delivery claims and outcomes | Platform-only read, server-written |
| `platformSummary/answerlatticeTenantsSummary` | Scheduler tenant/store registry | Server-written, platform-only summary |
| `platformSummary/trustMetrics_{tId}_{sId}` | Founder trust metrics dashboard read model | Tenant+Store scoped summary |
| `answerlattice_productSurfaces`       | Route/page/workflow context definitions | Tenant+Store scoped                 |
| `platformSummary/contextContent_{tId}_{sId}` | Compact related-content surface summary | Tenant+Store scoped summary |

Owner Support Assistant adds no assistant-owned Firestore collection, action queue, or dedicated owner analytics collection. The live summary-only route reuses the existing coverage, trust, Support Board, friction, Knowledge Intake, and Activation compact summaries through one bounded `getAll()` call. An independent flag, disabled by default, can let selected launch/release actions prefill the existing Support Board create form; opening that form performs no write, and the owner must use the existing Create action to persist a card. Direct ticket/reply/governance adapters, action audit records, AI operation paths, and the compact `ownerSupportAssistantSummary` / `ownerSupportAnalyticsSummary` read models remain deferred and are not written by the current runtime.

**Rules, auth, and indexes:** Answerlattice tenant-scoped rules are mirrored in `firestore.rules` for explicit shared-mode/emulator recovery and `firestore-answerlattice.rules` for the active Answerlattice Firebase targets (`answerlattice-qa` locally/in Preview, `answerlattice` in Production). `/api/auth/set-claims` returns a separate Answerlattice custom token when `ANSWERLATTICE_FIREBASE_MODE=separate` and the request is Answerlattice-scoped with `productId: 'AL'`; normal MenuList auth sync must not mint Answerlattice tokens. The client signs into the Answerlattice Firebase app with Answerlattice-scoped `platformRole`, `tenantId`, `storeId`, and Answerlattice permission claims resolved from the default user document's `productAccounts.AL` bridge, the Answerlattice `users` document, and `stores/{sId}.answerlatticeRoles`. Platform/support fallback claims must still use the `productAccounts.AL` tenant/store scope, not the default MenuList store. If separate Answerlattice Firebase Auth cannot mint the custom token, the route returns a controlled service-unavailable response rather than silently falling back to MenuList Firebase credentials. Answerlattice query and vector indexes are mirrored in `firestore.indexes.json` and `firestore-answerlattice.indexes.json`, including the `kb_articles` vector search path filtered by `status + tId + sId + embedding`.

---

## Auth & Permission Model

- **Answerlattice owner-side** (dashboard, widget, KB, tickets, changelog): Requires authenticated NextAuth session plus an Answerlattice product account (`productAccounts.AL`) or Answerlattice `users` document. Tenant-isolated (`tId`), store-isolated (`sId`), user-isolated (`uId`) against the Answerlattice Firebase project in separate mode.
- **Answerlattice staff access** (`/answerlattice/team`): Uses Answerlattice-only roles in `stores/{sId}.answerlatticeRoles`. Dashboard navigation, protected Answerlattice APIs, and `firestore-answerlattice.rules` enforce role permissions; same-tenant access alone is not enough for managed collections. Staff login follows the MenuList email/password or owner-passcode model with owner reset and force sign-out controls.
- **MenuList Help Center** (`/help-center`): Remains a MenuList owner support surface. It can use Answerlattice-backed components where explicitly wired, but it does not make MenuList an Answerlattice management dashboard.
- **Platform-admin** (Support Tickets, KB Management, Chat Management): Requires `platformRole` check (PLATFORM or PLATFORM_SUPPORT).
- **End-user chat**: The AI search modal (`AISearchModal/`) can be used by any authenticated user within their tenant.
- **KB articles**: Server-side retrieval is tenant/store filtered and fail-closed when `tId` or `sId` is missing or invalid. Write operations require platform auth.
- **Embedding API**: Protected by SAFE_MODE check + rate limiting. No explicit `withAuth()` — relies on session context.

---

## RAG Pipeline Architecture

```
User Query → [Zod Validation] → [Rate Limit Check] → [SAFE_MODE Check]
    ↓
[Image?] → [Gemini 2.5 Flash: extract bounded visual search context]
    ↓
[Cache Check: aiSearchHistory] → [Hit?] → Return cached response
    ↓ (Miss)
[Embedding Cache: queryEmbeddings] → [Hit?] → Use cached vector
    ↓ (Miss)
[Gemini gemini-embedding-2] → Generate the canonical 768-dimension query vector → Cache it
    ↓
[Firestore Vector Search] → status + tId + sId filtered findNearest(embedding, COSINE, limit=12)
    ↓
[Filter: status=published, similarityScore > 0.4-0.6]
    ↓
[Gemini 2.5 Flash] → Generate answer with document context and bounded visual context
    ↓
[Save to aiSearchHistory] → Return response with references
```

---

## Extending This Feature

When adding to the Help Center:

1. Check this README for existing subsystems
2. Read `_impl.md` for technical patterns
3. Read `_firebase.md` for cost implications
4. Follow DAL pattern (`DB_COLLECTIONS`, `apiCallComposer`, `answerlatticeRequestBodyComposer` for Answerlattice-owned writes)
5. All AI routes need SAFE_MODE + rate limiting
6. All new collections need entries in `src/constants/database.ts`

---

## Sub-Feature Documentation (Deep Dive)

Each subsystem has its own complete documentation suite (8 docs per feature):

| #   | Feature                                                          | Folder                    | Files  | Key Metric                                    |
| --- | ---------------------------------------------------------------- | ------------------------- | :----: | --------------------------------------------- |
| 1   | **[Ticket System](./ticket-system/README.md)**                   | `ticket-system/`          | 9 docs | Ticket, conversation, handoff, attachment, email, and rule contracts |
| 2   | **[AI QnA Chatbot](./ai-qna-chatbot/README.md)**                 | `ai-qna-chatbot/`         | 8 docs | 59 files, 25 DAL functions, 3 API routes      |
| 3   | **[Knowledge Base](./knowledge-base/README.md)**                 | `knowledge-base/`         | 8 docs | 23 files, 15 DAL functions                    |
| 4   | **[KB Generation Pipeline](./kb-generation-pipeline/README.md)** | `kb-generation-pipeline/` | 8 docs | 30+ files, 5 DAL functions, 2 Cloud Functions |
| 5   | **[Releases and Changelog](./changelog-system/README.md)**       | `changelog-system/`       | 9 docs | Server-owned release lifecycle, intake evidence handoff, Release Impact Guard, public projection, bundle propagation, and focused contracts |
| 6   | **[Feedback System](./feedback-system/README.md)**               | `feedback-system/`        | 8 docs | 9 files, 5 DAL functions                      |
| 7   | **[Chat Monitoring](./chat-monitoring/README.md)**               | `chat-monitoring/`        | 8 docs | 35 items, 13 DAL functions, 4 Cloud Functions |
| 8   | **[FAQ Management](./faq-management/README.md)**                 | `faq-management/`         | 7 docs | Bounded FAQ DAL, import generation, public FAQ tab |
| 9   | **[Knowledge Intake Command Center](./knowledge-intake-command-center/README.md)** | `knowledge-intake-command-center/` | 10 docs | Implemented bounded source intake, release evidence preparation, review queue, governed destination publishing, and cost contract |
| 10  | **[Repeated Reply Import](./repeated-reply-import/README.md)** | `repeated-reply-import/` | 8 docs | Repeated founder replies become FAQ and canonical proposal drafts through Knowledge Intake |
| 11  | **[Owner Support Assistant](./owner-support-assistant/README.md)** | `owner-support-assistant/` | 15 docs | Live deterministic six-summary guidance with strict source health, permission-filtered routes, and no assistant-owned transcript/event/action collection; broader action/analytics architecture remains deferred |
| 12  | **[Founder Daily Brief](./founder-daily-brief/README.md)** | `founder-daily-brief/` | 9 docs | Summary-only daily action plan plus a disabled-by-default, owner-confirmed Support Board prefill handoff |
| 13  | **[First Trusted Answers](./first-trusted-answers/README.md)** | `first-trusted-answers/` | 11 docs | First-ten question setup, governed tests, explicit resolution evidence, proof controls, and distribution runbook |
| 14  | **[Email Notifications](./email-notifications/README.md)** | `email-notifications/` | 9 docs | Scoped ticket projection, deterministic delivery claim, bounded SMTP, and Activation test boundary |
| 15  | **[Weekly Digest](./weekly-digest/README.md)** | `weekly-digest/` | 9 docs | Deterministic completed-week evidence, source completeness, freshness, manual prepare, and governed review handoff |
| 16  | **[Client Activation Command Center](./client-activation-command-center/README.md)** | `client-activation-command-center/` | 10 docs | Four-group evidence-derived launch path, deferred technical diagnostics, and manual customer-path verification |

**Total:** 16 deep-dive feature folders, including FAQ Management, Knowledge Intake Command Center, Repeated Reply Import, Owner Support Assistant, Founder Daily Brief, First Trusted Answers, Email Notifications, Weekly Digest, and Client Activation Command Center.

Each sub-feature folder contains:

- `README.md` — Feature index
- `{feature}_spec.md` — Business requirements (CEO/PM readable)
- `{feature}_impl.md` — Technical blueprint (every file, every function)
- `{feature}_firebase.md` — Firestore operations + cost estimates
- `{feature}_marketing.md` — Sales/marketing collateral
- `{feature}_website.md` — Public landing page content
- `{feature}_helpdoc.md` — Customer help article
- `{feature}_mobile-support.md` — Mobile 4-gate admission test

---

## Version History

| Date       | Version | Change                                                                                                                                                                                 |
| ---------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-07 | 3.4.36  | Added a compact founder-first navigation projection with permission-aware All tools disclosure, kept every existing route reachable, promoted the existing coding-agent packet as Install Support, and added zero-cost/mobile verification contracts. |
| 2026-08-06 | 3.4.35  | Added the shared customer-language contract, simplified owner navigation and Answer Quality labels, and added a five-step support-system snapshot to Activation without changing routes, schemas, permissions, reads, writes, or AI calls. |
| 2026-08-05 | 3.4.34  | Added a server-redacted release-evidence handoff from Knowledge Intake to the existing Changelog editor while preserving Release Impact Guard and the zero-runtime native GitHub connector boundary. |
| 2026-08-05 | 3.4.33  | Compressed Activation into four evidence-derived owner goals, preserved full diagnostics behind deferred technical details, reduced the launch-critical customer checklist to three manual paths, and avoided new Firebase state or reads. |
| 2026-07-20 | 3.4.32  | Completed the 44-feature and final C1-C8 local audit, fixed missing shared ratio-helper imports in Slack/email integration adapters, passed the complete runtime/emulator aggregate, and recorded cloud/recovery/client evidence still required. |
| 2026-07-20 | 3.4.31  | Completed Feature 44 as a deliberate non-goal: Guided Resolution remains Explain + Guide, procedure actions are instructional only, loader messages are origin/source bound, host clicks/form submission/arbitrary code stay prohibited, and client-reported completion is not presented as independent backend proof. |
| 2026-07-20 | 3.4.30  | Completed Feature 43 as a do-not-build-now connector boundary: no Zendesk, Intercom, Freshdesk, Help Scout, or Jira runtime/claim exists; export-first intake remains supported, generic-file provider logic is source-gated, sensitive provider data is excluded by default, and one read-only provider requires paying-client and concierge proof. |
| 2026-07-20 | 3.4.29  | Reclassified advanced white label as a disabled private profile prototype; added strict scope/schema/rule validation, removed custom CSS/free-form fonts, corrected write acknowledgement, and documented absent customer delivery. |
| 2026-07-20 | 3.4.28  | Reclassified multi-language as a disabled private draft generator; added strict provider parsing, source fingerprints, transactional source/overwrite protection, explicit draft approval boundaries, no draft cache propagation, and executable public-delivery exclusion tests. |
| 2026-07-20 | 3.4.27  | Hardened Support Truth Export with exact `AL` scope, explicit citation projection, approved reviewed translations only, release-linked changelog output, POST-only generation, server-reserved metadata audits, executable completeness/privacy/cap tests, and portability rather than legal-export boundaries. |
| 2026-07-20 | 3.4.26  | Source-hardened controlled MCP distribution with strict protocol negotiation, non-null request IDs, explicit `mcp:read`, five-minute audience-bound sessions, closed tool schemas, bounded structured results, governed missing-context signals, and honest OAuth/permission/rollout boundaries. |
| 2026-07-20 | 3.4.25  | Source-hardened Public API v1 credential lifecycle, exact answer/entity/signal contracts, deterministic replay handling, server-owned browser protection, key/rule verification, and disabled-by-default rollout truth. |
| 2026-07-19 | 3.4.24  | Source-hardened Weekly Digest, Founder Daily Brief, and Owner Support Assistant with deterministic completed-week generation, source-completeness and freshness evidence, strict six-summary health, permission-filtered routes/capabilities, fail-closed browser contracts, and shared-rule readiness parity. |
| 2026-07-19 | 3.4.23  | Hardened Support Board source deduplication, direct-write semantics, one-way copied-source redaction, exact live core summaries, bounded nightly completeness evidence, proposal partial-success handling, and maintained documentation. |
| 2026-07-18 | 3.4.22  | Hardened ticket, conversation, attachment, handoff, and email authority across dedicated/shared Firestore and Storage rules; aligned support-role access, platform-only hard delete, scoped notification projection, deferred shared chat-image cleanup, and maintained dossiers. |
| 2026-07-18 | 3.4.21  | Hardened compiled context and instant cache with transactional non-destructive initialization, source overflow failure, public/private projection, file-specific byte ceilings, exact derived refs, failed-version cleanup, `canon:v4` hashed key segments, untrusted Redis payload validation, and truthful widget/API/MCP rollout status. |
| 2026-07-18 | 3.4.20  | Hardened releases and changelog propagation with canonical version consistency, draft-first versioned publication, exact active-release dependency checks, explicit published-only delivery, scoped public projection, bounded draft-page skipping, and retry-safe recovery. |
| 2026-07-18 | 3.4.18  | Hardened Answer Tests with exact persisted identity, input-bound request idempotency, suite-revision freshness, strict release parsing, rollback proposal/audit pair integrity, and explicit deterministic-proof limits. |
| 2026-07-18 | 3.4.17  | Hardened Product Surfaces with immutable transaction-backed keys, exact/wildcard route resolution, state/version SDK parity, non-persistent raw paths, fail-closed summary caps, duplicate rejection, and complete summary replacement. |
| 2026-07-18 | 3.4.16  | Added default-off bounded hybrid evidence retrieval, fail-closed entity-link synchronization, and entity-merge article dependency rewrites; rollout remains gated on representative Answer Tests and remote index deployment/readback. |
| 2026-07-11 | 3.4.15  | Added the maintained Aidbase competitor-response validation matrix and aligned strict canonical scope, cache freshness, resumable paid setup, public demo/trust, and KB publish lifecycle documentation to current source. |
| 2026-07-11 | 3.4.14  | Added Founder Daily Brief as a read-only Support Assistant extension computed from existing coverage, trust, Support Board, friction, and Knowledge Intake summaries. |
| 2026-06-28 | 3.4.13  | Hardened public API/widget runtime diagnostics with fixed failure codes and bounded tenant/store metadata while preserving existing auth, admission, cache, and response contracts. |
| 2026-06-27 | 3.4.12  | Completed bounded request-body admission across Answerlattice, widget, and Help Center route files, including public APIs, widget runtime, MCP, protected AI routes, config saves, onboarding, rebuild actions, and Knowledge Intake. |
| 2026-06-11 | 3.4.11  | Hardened founder/operator usability across Answerlattice setup surfaces: product-scoped dashboard metadata, safer widget-key placeholders, clearer intake/governance empty states, mobile file selection, and owner-readable digest copy. |
| 2026-06-07 | 3.4.10  | Marked Owner Support Assistant docs frozen after final codebase-truth cross-check across storage, routes, permissions, tickets, Support Board, analytics, actions, and Firebase cost. |
| 2026-06-07 | 3.4.9   | Added Owner Support Assistant supported cases/actions catalogue covering handled prompts, permission gates, confirmed actions, and unsupported boundaries. |
| 2026-06-07 | 3.4.8   | Added Owner Support Assistant action-support architecture: typed preview/execute adapters over existing ticket, Support Board, Knowledge Intake, and Governance write paths with no action queue. |
| 2026-06-07 | 3.4.7   | Added Owner Support Assistant docs after validating the ChatGPT proposal against Answerlattice doctrine, existing systems, and Firebase cost-first summary read-model guardrails. |
| 2026-06-06 | 3.4.6   | Added Repeated Reply Import as a Knowledge Intake subpath and documented the SupportLayer-derived support expansion sequence. |
| 2026-06-06 | 3.4.5   | Added Activation `summary.launchProof` as the first-client launch proof read model before connector/distribution rollout.            |
| 2026-06-06 | 3.4.4   | Reconciled the build priority roadmap with current runtime truth: first-client governed answer loop first, Public API rollout-gated, Jira/helpdesk connectors docs-first and deferred.            |
| 2026-05-31 | 3.4.0   | Added Knowledge Intake Command Center documentation for the planned founder-first, paid-gated, source-backed intake architecture that supersedes upload-first KB generation.            |
| 2026-05-31 | 3.4.1   | Expanded Knowledge Intake docs with selected-page website discovery, app URL crawl boundaries, unchanged-source skip, bounded execution, and provider-safe evidence rules.            |
| 2026-05-31 | 3.4.2   | Added summary-first intake read model, bucketed scheduler directory, source-version fields, and dirty-summary repair requirements.            |
| 2026-05-31 | 3.4.3   | Aligned Knowledge Intake docs with existing Answerlattice runtime paths: article embeddings, FAQ retrieval, canonical-first search, product-surface summaries, public cache, releases, and compiled context source versions. |
| 2026-05-22 | 3.3.0   | Added FAQ Management as a first-class Answerlattice owner/public feature with import generation, article links, product-surface context, and cost-bounded Firebase reads.                   |
| 2026-05-21 | 3.2.0   | Updated Answerlattice separate-product auth/Firebase notes: `productAccounts.AL`, dedicated widget credentials, Answerlattice AI operation logs, and enabled core widget flag.                   |
| 2026-03-06 | 3.1.0   | ChatGPT domain/launch review — 10 failure modes, entity categories, authoring guidelines added to activation experiment. Archive: `_archive/chatgpt-review-domain-launch-readiness.md` |
| 2026-03-02 | 3.0.0   | Answerlattice strategic doctrine — 9 governance documents from ChatGPT strategic session                                                                                                    |
| 2026-03-02 | 2.0.0   | Feature-by-feature deep documentation — 7 features × 8 docs = 56 sub-feature documents                                                                                                 |
| 2026-03-01 | 1.0.0   | Initial forensic documentation audit — 15 subsystems, 170+ files                                                                                                                       |
