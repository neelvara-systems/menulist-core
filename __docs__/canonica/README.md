# Help Center — Feature Documentation

> **Status:** DOCUMENTED (Forensic Audit)
> **Last Updated:** 2026-05-21
> **Audit Type:** Codebase-first forensic documentation
> **Feature Scope:** 16 subsystems, 190+ files, Canonica + Help Center Firestore collections

---

## What Is This

The Help Center is MenuList's **integrated support infrastructure** — a multi-layered system that provides:

- **AI-Powered QnA Bot** — RAG chatbot on uploaded knowledge base docs (Gemini 2.5 Flash)
- **Knowledge Base (KB)** — Hierarchical article system with categories, sections, and articles
- **KB Article Generation Pipeline** — Upload raw files → AI generates articles → review → publish → embed
- **Ticket System** — Full lifecycle support tickets with SLA tracking, messaging, status audit trail
- **Changelog System** — Paginated release notes with feedback (likes/dislikes/comments)
- **Feedback System** — Multi-step owner feedback (general, feature usage, feature requests)
- **Chat Monitoring Dashboard** — Admin conversations list, filters, quality scoring, ROI calculator, weekly AI digest
- **Content Feedback** — Article and changelog feedback with comment threading
- **Embedding Cache** — Query embedding caching for 40-60% performance improvement
- **Search History Cache** — Full response caching for repeated queries
- **AI Intelligence Layer** — Cloud Functions for feedback intelligence, KB quality, weekly narratives

Canonica is now maintained as a separate Support Knowledge Control Plane product. MenuList is one independent client integration for shared support surfaces; Canonica-owned dashboard, onboarding, widget, scheduler, and Firebase data stay under Canonica routes, constants, flags, and product-scoped session data.

## Canonica Product Operating Model

Canonica dashboard navigation is grouped by the product-owner workflow. The groups keep setup, support operations, widget installation, team access, billing, and governance separate while still rolling up to the core Launch Setup, Support Control, and Knowledge Governance operating model.

| Sidebar group | Purpose | Primary routes |
| --- | --- | --- |
| Launch Setup | Activate a new client workspace, manage product details, import starter knowledge, map product surfaces, and review readiness. | `/canonica/activation`, `/canonica/settings`, `/canonica/kb-generation`, `/canonica/product-surfaces`, `/canonica/dashboard` |
| Support Control | Run day-to-day support content and fallback loops: help center, docs, KB, FAQs, release notes, support requests, Support Board, ticket inbox, conversations, and weekly digest. | `/canonica/help`, `/canonica/docs`, `/canonica/release-notes`, `/canonica/support`, `/canonica/knowledge-base`, `/canonica/faqs`, `/canonica/changelog`, `/canonica/support-board`, `/canonica/tickets`, `/canonica/conversations`, `/canonica/weekly-digest` |
| Widget & Hosted Help | Configure widget appearance, install/embed snippets, hosted help domains, allowed origins, blocked routes, and key security. | `/canonica/widget/ui`, `/canonica/widget/install`, `/canonica/widget/hosted-help`, `/canonica/widget/access` |
| Team & Access | Manage workspace members and Canonica roles without mixing them into setup or support content. | `/canonica/team/members`, `/canonica/team/roles` |
| Billing | Manage subscription and payment history. | `/canonica/billing`, `/canonica/transactions` |
| Knowledge Governance | Govern answer quality, product ontology, drift, signal-to-knowledge proposals, coverage, and trust metrics. | `/canonica/governance/answers`, `/canonica/governance/entities`, `/canonica/governance/drift`, `/canonica/governance/signal-queue`, `/canonica/governance/trust` |

The Activation Command Center reads compact summary docs only. Generated entity candidates and canonical answer drafts appear in Governance for human approval; drafts are never auto-published.

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
| 10  | `firebase-cost-optimization-audit.md`            | Developers/Ops  | Canonica-wide Firebase read/write/listener cost map and latest optimizations |
| 11  | `deployment/canonica-qa-deployment-runbook.md`   | Developers/Ops  | QA deployment evidence, commands, secret handling, and production checklist |
| 12  | `product-surface-contexts/`                      | Product/Ops/Dev | Route/page/workflow context model for related KB, changelog, ticket, and widget answers |
| 13  | `system-inventory/`                              | Product/Dev/Ops  | Codebase-first Canonica feature map, route map, Firebase map, file inventory, and website truth |
| 14  | `self-sellable-product-strategy.md`              | Product/Sales/Dev | Canonica self-serve positioning, non-enterprise ICP, pricing direction, and execution task list |
| 15  | `faq-management/`                                | Product/Ops/Dev | Owner-reviewed short answers linked to articles and product surfaces |
| 16  | `developer-install-pack/`                        | Product/Sales/Dev | Typed SDK, quickstarts, install verifier, starter surfaces, import starters, ROI, proof, and ops one-pager |
| 17  | `staff-access-control/`                          | Product/Ops/Dev | Canonica team members, workspace roles, permission claims, and rule-level access control |
| 18  | `support-board/`                                 | Product/Ops/Dev | Private owner/staff Support Board, Needs Answer queue, internal notes, and future support-work roadmap |

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
| 13  | **FAQ**                        | ✅ `canonica/faqManagement`                       | ✅ `helpCenter/FaqView`      | ✅ `canonica_faqs` DAL        |
| 14  | **Chat Monitoring**            | —                                                 | —                           | ✅ `chatManagement/`          |
| 15  | **AI Intelligence Layer**      | —                                                 | —                           | ✅ Cloud Functions            |
| 16  | **Canonica Knowledge Plane**   | ✅ `CanonicaCoverageKPI` `MutationProposalReview` | —                           | ✅ `canonicaNightly` CF       |

---

## Key Files Quick Reference

### Pages (Routes)

- `/help-center` → `src/app/(main)/help-center/page.tsx`
- `/platform/support-tickets` → `src/app/(main)/(platform-pages)/platform/support-tickets/page.tsx`
- `/platform/changelog` → `src/app/(main)/platform/changelog/page.tsx`
- `/platform/chat-management` → Chat management dashboard (platform tab)
- `/platform/knowledge-base` → KB management (platform tab)
- `/platform/kb-generation` → KB generation pipeline (platform tab)

### Canonica Client Routes

- `/canonica/help` → `src/app/(canonica)/canonica/help/page.tsx`
- `/canonica/docs` → `src/app/(canonica)/canonica/docs/page.tsx`
- `/canonica/support` → `src/app/(canonica)/canonica/support/page.tsx`
- `/canonica/release-notes` → `src/app/(canonica)/canonica/release-notes/page.tsx`

The `/help-center` surface belongs to the MenuList owner app. Canonica dashboard and management surfaces remain separate product routes. The `/canonica/help` route is a compatibility/direct shell route that reuses the same Help Center home; `/canonica/docs`, `/canonica/support`, and `/canonica/release-notes` remain direct tab/surface routes for documentation, store-scoped support tickets, and release notes.

### Canonica Operator Routes

- `/canonica/activation` → `src/app/(canonica)/canonica/activation/page.tsx`
- `/canonica/dashboard` → `src/app/(canonica)/canonica/dashboard/page.tsx`
- `/canonica/governance` → `src/app/(canonica)/canonica/governance/page.tsx`
- `/canonica/governance/[tab]` → `src/app/(canonica)/canonica/governance/[tab]/page.tsx`
- `/canonica/settings` → `src/app/(canonica)/canonica/settings/page.tsx`
- `/canonica/team` → `src/app/(canonica)/canonica/team/page.tsx`
- `/canonica/team/[tab]` → `src/app/(canonica)/canonica/team/[tab]/page.tsx`
- `/canonica/tickets` → `src/app/(canonica)/canonica/tickets/page.tsx`
- `/canonica/conversations` → `src/app/(canonica)/canonica/conversations/page.tsx`
- `/canonica/knowledge-base` → `src/app/(canonica)/canonica/knowledge-base/page.tsx`
- `/canonica/faqs` → `src/app/(canonica)/canonica/faqs/page.tsx`
- `/canonica/kb-generation` → `src/app/(canonica)/canonica/kb-generation/page.tsx`
- `/canonica/changelog` → `src/app/(canonica)/canonica/changelog/page.tsx`
- `/canonica/support-board` → `src/app/(canonica)/canonica/support-board/page.tsx`
- `/canonica/product-surfaces` → `src/app/(canonica)/canonica/product-surfaces/page.tsx`
- `/canonica/widget` → `src/app/(canonica)/canonica/widget/page.tsx`
- `/canonica/widget/[tab]` → `src/app/(canonica)/canonica/widget/[tab]/page.tsx`
- `/canonica/billing` → `src/app/(canonica)/canonica/billing/page.tsx`
- `/canonica/transactions` → `src/app/(canonica)/canonica/transactions/page.tsx`
- `/canonica/weekly-digest` → `src/app/(canonica)/canonica/weekly-digest/page.tsx`

The Canonica shell is responsive: desktop uses the shared MenuList dashboard chrome for the header/sidebar and Canonica-owned navigation, while mobile uses a sticky header and drawer navigation with the same safe-area handling. The sidebar exposes workflow groups and clean tab subroutes for Governance, Widget, and Team. Client support users see only the client support routes; Canonica owner/admin/manager sessions and `PLATFORM` / `PLATFORM_SUPPORT` sessions can access management routes. Governance tables use horizontal scroll on narrow screens, and detail drawers/modals collapse to viewport width.

### MenuList Help Center Boundary

MenuList owner support entry points open the MenuList-owned Help Center home. They do not mount Canonica management screens or the Canonica widget inside the MenuList owner shell:

- Desktop sidebar Help → `/help-center`
- Desktop support popover Help Center → `/help-center`
- Desktop support popover Documentation → `/help-center/kb`
- Desktop support popover Submit a Ticket → `/help-center/ticket`
- Mobile More tab Help Center → existing Help Center home inside `MobileShell`
- Mobile More tab Documentation → existing Help Center `kb` tab inside `MobileShell`
- Mobile More tab Support Tickets → existing Help Center `ticket` tab inside `MobileShell`
- Mobile More tab Release Notes → existing Help Center `changelog` tab inside `MobileShell`

The mobile More tab does not route-hop to `/canonica/*`; it renders `src/components/templates/main-app/helpCenter` inside the MenuList mobile shell to prevent hash/router fights, accidental desktop fallback, or app reloads. Direct visits to `/help-center`, `/help-center/kb`, `/help-center/ticket`, `/help-center/changelog`, and legacy `?tab=` URLs resolve to the same Help Center tabs. Nested `/help-center/*` routes are treated as MobileShell routes, so mobile article, ticket, and changelog deep links do not fall back to Today or a blank desktop shell. Article deep links use `/help-center/kb/articles/:articleId`; changelog deep links use `/help-center/changelog/:entryId`. Canonica operator routes such as `/canonica/dashboard`, `/canonica/knowledge-base`, `/canonica/tickets`, `/canonica/changelog`, and `/canonica/widget` stay in the Canonica product dashboard.

### Canonica Public Routes

- `/sites/canonica` and `__canonica` host rewrites → Canonica marketing site
- `/sites/canonica/demo` and `__canonica/demo` → static page-aware product demo
- `/sites/canonica/get-started` → self-service onboarding
- `/sites/canonica/product`, `/product/team-access`, `/pricing`, `/security`, `/faq`, `/about`, `/contact` → public site pages
- `/sites/canonica/quickstarts` → framework examples and typed web helper usage
- `/sites/canonica/roi-calculator` → static repeated-question support planning calculator
- `/sites/canonica/proof` → example Canonica workloads for buyer evaluation
- `/sites/canonica/security-one-pager` → shareable security and operations summary
- `/sites/canonica/privacy-policy`, `/sites/canonica/terms-of-service` → public legal/support policy pages
- `/sites/canonica/sitemap.xml`, `/sites/canonica/robots.txt` → Canonica product-domain SEO metadata routes
- `/widget/[apiKey]` → embeddable end-user help widget

The public widget is mobile-first and uses `100dvh`, 44px launcher/input actions, MIME-safe image preview, canonical answer badges, guided workflow rendering, safe page context from `CanonicaWidget.page()/setContext()`, and fire-and-forget feedback. Widget keys are managed as bounded named keys on `stores/{sId}.canonicaWidgetApi`; malformed keys short-circuit before Firestore lookup, runtime validation uses key hashes, and copy-anytime is available only for encrypted widget keys when the Canonica widget-key encryption secret is configured. The public site avoids exposing tenant/store ids and routes completed onboarding to `/canonica/activation`.

### API Routes

- `POST /api/helpCenter/search-kb` — Non-streaming RAG search
- `POST /api/helpCenter/search-kb-stream` — Streaming RAG search (SSE)
- `POST /api/helpCenter/article-embedding` — Generate & store article embeddings
- `GET /api/canonica/activation/summary` — Cost-optimized client readiness summary from compact store/platformSummary docs
- `POST /api/canonica/onboard` — Self-service Canonica workspace provisioning
- `GET/PUT /api/canonica/workspace-profile` — Product URL, support email, billing model, scheduler timezone/support-day end time, and initial surface profile
- `GET/PUT /api/canonica/widget-config` — Protected widget configuration, allowed origins, blocked routes, and runtime status
- `GET /api/canonica/operations/status` — Protected Activation Daily Governance status from compact scheduler summaries and capped run logs
- `POST /api/canonica/widget-key` — Protected widget key create/rename/copy/delete management
- `POST /api/canonica/tenant-summary` — Authenticated server-side sync for `platformSummary/canonicaTenantsSummary` after client-side entity creation
- `POST /api/canonica/product-surfaces/rebuild-summary` — Authenticated rebuild of compact `platformSummary/contextContent_{tId}_{sId}` for route-aware related content

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
- `src/database/canonica/entities.ts` — Canonica entity CRUD + search index
- `src/lib/canonica/tenantSummaryClient.ts` — Fire-and-forget entity-registry sync after manual entity creation
- `src/database/canonica/canonicalAnswers.ts` — Canonical answer CRUD + governance
- `src/database/canonica/mutationProposals.ts` — Mutation proposal lifecycle
- `src/database/canonica/entityCandidates.ts` — Entity candidate staging + promotion
- `src/database/canonica/signalEvents.ts` — Signal event append-only log
- `src/database/canonica/releases.ts` — Immutable release registry
- `src/database/canonica/auditLogs.ts` — Governance audit trail
- `src/database/canonica/coverageKPI.ts` — Coverage KPI reads
- `src/database/canonica/productSurfaces.ts` — Product surface CRUD and compact related-content summary reads
- `src/data/canonica/surfaceTemplates.ts` — Bounded starter surface templates for common SaaS pages

### Cloud Functions

- `functions-canonica/src/index.ts` — Canonica Cloud Functions entry point
- `functions-canonica/src/canonica/canonicaMasterScheduler.ts` — Centralized Canonica scheduler: task registry, hourly EOD filtering, task lease, workspace/date locks, and master scheduler state
- `functions-canonica/src/canonica/schedulerTime.ts` — Workspace timezone/support-day settlement helpers
- `functions-canonica/src/canonica/canonicaNightly.ts` — Canonica governance batch: summary-based tenant discovery, drift detection, signal mutation, signal resolution, coverage KPI, trust metrics, fallback detection, impact tracking, confidence adjustment, and signal TTL
- `functions-canonica/src/canonica/tenantSummary.ts` — Cost-optimized `platformSummary/canonicaTenantsSummary` registry used by the scheduler before legacy entity-scan fallback
- `functions-canonica/src/canonica/canonicaNightly.ts` — Persists structured run logs to `canonica_schedulerRunLogs` with per-tenant task results and diagnostics
- `functions-canonica/src/canonica/draftGenerator.ts` — Canonical answer draft generation
- `functions-canonica/src/canonica/resolutionExtractor.ts` — Ticket-resolution knowledge extraction

### Types

- `src/types/knowledgeBase.ts` — KB articles, categories, sections, ingestion jobs
- `src/types/chatSession.ts` — Chat messages, sessions, admin filters
- `src/types/supportTicket.ts` — Ticket types, statuses, SLA config
- `src/types/changelog.ts` — Changelog entries and pages
- `src/types/feedback.ts` — General/feature feedback
- `src/types/aiFeedback.ts` — AI chat feedback types
- `src/types/canonica.ts` — Canonica entities, canonical answers, drift, mutations, releases, search index, audit logs

### Core Libraries

- `src/lib/vectorEmbeddings/index.ts` — Gemini embedding + chat (RAG core)
- `src/lib/vectorEmbeddings/articleEmbeddings.ts` — Text extraction from TipTap JSON
- `src/lib/validation/chatSchemas.ts` — Zod validation for search API
- `src/lib/rateLimit/` — Upstash rate limiting
- `src/lib/canonica/canonicalRetrieval.ts` — Canonical-first 3-layer retrieval
- `src/lib/canonica/driftDetection.ts` — 4-class drift engine
- `src/lib/canonica/entityExtraction.ts` — AI entity extraction pipeline
- `src/lib/canonica/signalEmitter.ts` — Fire-and-forget signal emission
- `src/lib/canonica/signalMutation.ts` — Signal clustering + mutation proposals
- `src/lib/canonica/tokenizer.ts` — Deterministic tokenizer (frozen)

---

## Feature Flags

| Flag                                | Location                                       | Default | Purpose                                          |
| ----------------------------------- | ---------------------------------------------- | ------- | ------------------------------------------------ |
| `ENABLE_STREAMING_RESPONSES`        | `src/config/features.ts`                       | `false` | Toggle streaming vs non-streaming RAG            |
| `ENABLE_RATE_LIMITING`              | `src/config/features.ts`                       | `true`  | Upstash rate limiting                            |
| `ENABLE_CANONICA_ONTOLOGY`          | `src/config/features.ts`                       | `true`  | Entity extraction + ontology bootstrap           |
| `ENABLE_CANONICA_CANONICAL_ANSWERS` | `src/config/features.ts`                       | `true`  | Canonical-first retrieval + coverage KPI         |
| `ENABLE_CANONICA_DRIFT_DETECTION`   | `src/config/features.ts`                       | `true`  | 4-class drift engine                             |
| `ENABLE_CANONICA_SIGNAL_MUTATION`   | `src/config/features.ts`                       | `true`  | Signal mutation + proposal review                |
| `ENABLE_CANONICA_PUBLIC_API`        | `src/config/features.ts`                       | `false` | Public answers, entities, and signal ingestion API (Pillar 5; implemented and rollout-gated) |
| `ENABLE_CANONICA_WIDGET`            | `src/config/features.ts`                       | `true`  | Embeddable help widget + onboarding gate         |
| `ENABLE_CANONICA_ACTIVATION_COMMAND_CENTER` | `src/config/features.ts`              | `true`  | Client launch/readiness home                     |
| `ENABLE_CANONICA_NOTIFICATIONS`     | `src/config/features.ts`                       | `true`  | Email notifications for ticket events and Activation test-send |
| `ENABLE_CANONICA_GOVERNANCE_UI`     | `src/config/features.ts`                       | `true`  | Governance hub (answer editor, drift, analytics) |
| `ENABLE_CANONICA_SIGNAL_QUALITY`    | `src/config/features.ts`                       | `false` | Severity weighting, time decay, batch queries    |
| `ENABLE_CANONICA_WHITE_LABEL`       | `src/config/features.ts`                       | `false` | Per-tenant branding (colors, logo, company name) |
| `ENABLE_CANONICA_MULTI_LANGUAGE`    | `src/config/features.ts`                       | `false` | Multi-language KB article translations           |
| `ENABLE_CANONICA_CONTEXT_AWARE`     | `src/config/features.ts`                       | `true`  | Route/page/workflow context-aware retrieval      |
| `ENABLE_CANONICA_PRODUCT_SURFACES`  | `src/config/features.ts`                       | `true`  | Route/page/workflow surface mapping              |
| `ENABLE_CANONICA_INSTANT_CACHE`     | `src/config/features.ts`                       | `true`  | Redis cache for canonical answer hits; no-op without Upstash env |
| `ENABLE_CANONICA_AUTO_KNOWLEDGE`    | `src/config/features.ts` / `functions-canonica/src/constants/features.ts` | `true` | Capped draft generation for new answer proposals |
| `ENABLE_CANONICA_FRICTION_INTELLIGENCE` | `src/config/features.ts` / `functions-canonica/src/constants/features.ts` | `true` | Capped nightly product friction summaries |
| `ENABLE_CANONICA_TICKET_KNOWLEDGE`  | `src/config/features.ts` / `functions-canonica/src/constants/features.ts` | `true` | Capped resolved-ticket to knowledge proposals |
| `ENABLE_CANONICA_FOUNDER_ONBOARDING` | `src/config/features.ts` / `functions-canonica/src/constants/features.ts` | `true` | Capped initial entity/draft bootstrap after KB publish |
| `ENABLE_CANONICA_TRUST_METRICS`     | `src/config/features.ts` / `functions-canonica/src/constants/features.ts` | `true` | Compact trust metrics summary                    |
| `ENABLE_CANONICA_NIGHTLY`           | `functions-canonica/src/constants/features.ts` | `true`  | Server-side nightly batch (3:00 AM UTC)          |

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
| `canonica_entities`              | Product ontology entities               | Tenant+Store scoped                 |
| `canonica_entityRelations`       | Entity relationships                    | Tenant+Store scoped                 |
| `canonica_canonicalAnswers`      | Governed canonical answers              | Tenant+Store scoped                 |
| `canonica_entityCandidates`      | AI-extracted entity candidates          | Tenant+Store scoped                 |
| `canonica_signalEvents`          | Friction signal events (append-only)    | Tenant+Store scoped                 |
| `canonica_mutationProposals`     | Governed mutation queue                 | Tenant+Store scoped                 |
| `canonica_releases`              | Immutable release timeline              | Tenant+Store scoped                 |
| `canonica_entitySearchIndex`     | Deterministic entity search index       | Tenant+Store scoped                 |
| `canonica_auditLogs`             | Governance audit trail (append-only)    | Tenant+Store scoped                 |
| `canonica_frictionDailyStats`    | Daily friction aggregates               | Tenant+Store scoped                 |
| `canonica_schedulerRunLogs`      | Canonica nightly run logs and diagnostics | Platform-only read, server-written |
| `canonica_aiOperations`          | Canonica AI operation/cost logs           | Tenant+Store scoped, server-written |
| `canonica_notificationLogs`      | Canonica ticket/test notification delivery logs | Platform-only read, server-written |
| `platformSummary/canonicaTenantsSummary` | Scheduler tenant/store registry | Server-written, platform-only summary |
| `platformSummary/trustMetrics_{tId}_{sId}` | Founder trust metrics dashboard read model | Tenant+Store scoped summary |
| `canonica_productSurfaces`       | Route/page/workflow context definitions | Tenant+Store scoped                 |
| `platformSummary/contextContent_{tId}_{sId}` | Compact related-content surface summary | Tenant+Store scoped summary |

**Rules, auth, and indexes:** Canonica tenant-scoped rules are mirrored in `firestore.rules` for explicit shared-mode/emulator recovery and `firestore-canonica.rules` for the active Canonica Firebase targets (`canonica-qa` locally/in Preview, `canonica` in Production). `/api/auth/set-claims` returns a separate Canonica custom token when `CANONICA_FIREBASE_MODE=separate`. The client signs into the Canonica Firebase app with Canonica-scoped `platformRole`, `tenantId`, `storeId`, and Canonica permission claims resolved from the default user document's `productAccounts.CN` bridge, the Canonica `users` document, and `stores/{sId}.canonicaRoles`. Canonica query and vector indexes are mirrored in `firestore.indexes.json` and `firestore-canonica.indexes.json`, including the `kb_articles` vector search path filtered by `status + tId + sId + embedding`.

---

## Auth & Permission Model

- **Canonica owner-side** (dashboard, widget, KB, tickets, changelog): Requires authenticated NextAuth session plus a Canonica product account (`productAccounts.CN`) or Canonica `users` document. Tenant-isolated (`tId`), store-isolated (`sId`), user-isolated (`uId`) against the Canonica Firebase project in separate mode.
- **Canonica staff access** (`/canonica/team`): Uses Canonica-only roles in `stores/{sId}.canonicaRoles`. Dashboard navigation, protected Canonica APIs, and `firestore-canonica.rules` enforce role permissions; same-tenant access alone is not enough for managed collections. Staff login follows the MenuList email/password or owner-passcode model with owner reset and force sign-out controls.
- **MenuList Help Center** (`/help-center`): Remains a MenuList owner support surface. It can use Canonica-backed components where explicitly wired, but it does not make MenuList a Canonica management dashboard.
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
[Gemini gemini-embedding-001] → Generate query vector → Cache it
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
4. Follow DAL pattern (`DB_COLLECTIONS`, `apiCallComposer`, `canonicaRequestBodyComposer` for Canonica-owned writes)
5. All AI routes need SAFE_MODE + rate limiting
6. All new collections need entries in `src/constants/database.ts`

---

## Sub-Feature Documentation (Deep Dive)

Each subsystem has its own complete documentation suite (8 docs per feature):

| #   | Feature                                                          | Folder                    | Files  | Key Metric                                    |
| --- | ---------------------------------------------------------------- | ------------------------- | :----: | --------------------------------------------- |
| 1   | **[Ticket System](./ticket-system/README.md)**                   | `ticket-system/`          | 8 docs | 21 files, 10 DAL functions                    |
| 2   | **[AI QnA Chatbot](./ai-qna-chatbot/README.md)**                 | `ai-qna-chatbot/`         | 8 docs | 59 files, 25 DAL functions, 3 API routes      |
| 3   | **[Knowledge Base](./knowledge-base/README.md)**                 | `knowledge-base/`         | 8 docs | 23 files, 15 DAL functions                    |
| 4   | **[KB Generation Pipeline](./kb-generation-pipeline/README.md)** | `kb-generation-pipeline/` | 8 docs | 30+ files, 5 DAL functions, 2 Cloud Functions |
| 5   | **[Changelog System](./changelog-system/README.md)**             | `changelog-system/`       | 8 docs | 14+ files, 7 DAL functions                    |
| 6   | **[Feedback System](./feedback-system/README.md)**               | `feedback-system/`        | 8 docs | 9 files, 5 DAL functions                      |
| 7   | **[Chat Monitoring](./chat-monitoring/README.md)**               | `chat-monitoring/`        | 8 docs | 35 items, 13 DAL functions, 4 Cloud Functions |
| 8   | **[FAQ Management](./faq-management/README.md)**                 | `faq-management/`         | 7 docs | Bounded FAQ DAL, import generation, public FAQ tab |

**Total:** 8 deep-dive feature folders, including FAQ Management.

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
| 2026-05-22 | 3.3.0   | Added FAQ Management as a first-class Canonica owner/public feature with import generation, article links, product-surface context, and cost-bounded Firebase reads.                   |
| 2026-05-21 | 3.2.0   | Updated Canonica separate-product auth/Firebase notes: `productAccounts.CN`, dedicated widget credentials, Canonica AI operation logs, and enabled core widget flag.                   |
| 2026-03-06 | 3.1.0   | ChatGPT domain/launch review — 10 failure modes, entity categories, authoring guidelines added to activation experiment. Archive: `_archive/chatgpt-review-domain-launch-readiness.md` |
| 2026-03-02 | 3.0.0   | Canonica strategic doctrine — 9 governance documents from ChatGPT strategic session                                                                                                    |
| 2026-03-02 | 2.0.0   | Feature-by-feature deep documentation — 7 features × 8 docs = 56 sub-feature documents                                                                                                 |
| 2026-03-01 | 1.0.0   | Initial forensic documentation audit — 15 subsystems, 170+ files                                                                                                                       |
