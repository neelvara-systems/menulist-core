# Help Center — Feature Documentation

> **Status:** DOCUMENTED (Forensic Audit)
> **Last Updated:** 2026-03-01
> **Audit Type:** Codebase-first forensic documentation
> **Feature Scope:** 16 subsystems, 190+ files, 27 Firestore collections

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
| 13  | **FAQ**                        | ✅ `helpCenter/FaqView`                           | —                           | —                             |
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

These routes are the embedded MenuList client support surface for desktop and direct URL access: owner help overview, documentation browsing, store-scoped support tickets, and release notes. The Canonica header includes a Back to MenuList action so mobile/direct-route users can return to the MenuList app without relying on browser history.

### Canonica Operator Routes

- `/canonica/dashboard` → `src/app/(canonica)/canonica/dashboard/page.tsx`
- `/canonica/governance` → `src/app/(canonica)/canonica/governance/page.tsx`
- `/canonica/settings` → `src/app/(canonica)/canonica/settings/page.tsx`
- `/canonica/tickets` → `src/app/(canonica)/canonica/tickets/page.tsx`
- `/canonica/conversations` → `src/app/(canonica)/canonica/conversations/page.tsx`
- `/canonica/knowledge-base` → `src/app/(canonica)/canonica/knowledge-base/page.tsx`
- `/canonica/kb-generation` → `src/app/(canonica)/canonica/kb-generation/page.tsx`
- `/canonica/changelog` → `src/app/(canonica)/canonica/changelog/page.tsx`

The Canonica shell is responsive: desktop uses a fixed Canonica sidebar, while mobile uses a sticky header and drawer navigation. Client sessions see only the client support routes; `PLATFORM` and `PLATFORM_SUPPORT` sessions can also access operator management routes. Governance tables use horizontal scroll on narrow screens, and detail drawers/modals collapse to viewport width.

### MenuList Client Wiring

MenuList is the first embedded Canonica client. Owner support entry points now hand off to Canonica instead of the legacy generic help content:

- Desktop sidebar Help → `/canonica/help`
- Desktop support popover Documentation → `/canonica/docs`
- Desktop support popover Submit a Ticket → `/canonica/support`
- Mobile More tab Help Center → native `canonicaHelp` sub-screen inside `MobileShell`
- Mobile More tab Documentation → native `canonicaDocs` sub-screen inside `MobileShell`
- Mobile More tab Support Tickets → native `canonicaSupport` sub-screen inside `MobileShell`
- Mobile More tab Release Notes → native `canonicaReleaseNotes` sub-screen inside `MobileShell`

The mobile More tab does not route-hop to `/canonica/*`; it renders the same client support surfaces inside the MenuList mobile shell to prevent hash/router fights, accidental desktop fallback, or app reloads. The legacy `/help-center` route remains available for compatibility while MenuList client-facing support moves to Canonica. Canonica operator routes such as `/canonica/dashboard`, `/canonica/knowledge-base`, `/canonica/tickets`, and `/canonica/changelog` stay platform-only management surfaces.

### Canonica Public Routes

- `/sites/canonica` and `__canonica` host rewrites → Canonica marketing site
- `/sites/canonica/get-started` → self-service beta onboarding
- `/sites/canonica/product`, `/pricing`, `/about`, `/contact` → public site pages
- `/widget/[apiKey]` → embeddable end-user help widget

The public widget is mobile-first and uses `100dvh`, 44px launcher/input actions, MIME-safe image preview, canonical answer badges, guided workflow rendering, predictive suggestions from `CanonicaWidget.page()/setContext()`, and fire-and-forget feedback. Widget keys are returned once and stored as hashes only; malformed keys short-circuit before Firestore lookup, rate-limit buckets use key hashes, and existing keys are shown by prefix, not raw value. The public site avoids exposing tenant/store ids and routes completed onboarding to `/canonica/dashboard`.

### API Routes

- `POST /api/helpCenter/search-kb` — Non-streaming RAG search
- `POST /api/helpCenter/search-kb-stream` — Streaming RAG search (SSE)
- `POST /api/helpCenter/article-embedding` — Generate & store article embeddings

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
- `src/database/canonica/canonicalAnswers.ts` — Canonical answer CRUD + governance
- `src/database/canonica/mutationProposals.ts` — Mutation proposal lifecycle
- `src/database/canonica/entityCandidates.ts` — Entity candidate staging + promotion
- `src/database/canonica/signalEvents.ts` — Signal event append-only log
- `src/database/canonica/releases.ts` — Immutable release registry
- `src/database/canonica/auditLogs.ts` — Governance audit trail
- `src/database/canonica/coverageKPI.ts` — Coverage KPI reads

### Cloud Functions

- `functions-canonica/src/index.ts` — Canonica Cloud Functions entry point
- `functions-canonica/src/canonica/canonicaNightly.ts` — Canonica nightly: drift detection, signal mutation, signal resolution, coverage KPI, fallback detection, impact tracking, confidence adjustment, signal TTL, graph rebuild, predictive sync
- `functions-canonica/src/canonica/canonicaNightly.ts` — Persists structured run logs to `canonica_schedulerRunLogs` with per-tenant task results and diagnostics
- `functions-canonica/src/canonica/draftGenerator.ts` — Canonical answer draft generation
- `functions-canonica/src/canonica/resolutionExtractor.ts` — Ticket-resolution knowledge extraction
- `functions-canonica/src/canonica/predictiveTriggerSync.ts` — Predictive support trigger sync
- `functions-canonica/src/integrations/eventProcessor.ts` — Canonica integration event delivery

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
| `ENABLE_CANONICA_ONTOLOGY`          | `src/config/features.ts`                       | `false` | Entity extraction + ontology bootstrap           |
| `ENABLE_CANONICA_CANONICAL_ANSWERS` | `src/config/features.ts`                       | `false` | Canonical-first retrieval + coverage KPI         |
| `ENABLE_CANONICA_DRIFT_DETECTION`   | `src/config/features.ts`                       | `false` | 4-class drift engine                             |
| `ENABLE_CANONICA_SIGNAL_MUTATION`   | `src/config/features.ts`                       | `false` | Signal mutation + proposal review                |
| `ENABLE_CANONICA_PUBLIC_API`        | `src/config/features.ts`                       | `false` | Public canonical answer API (Pillar 5 — future)  |
| `ENABLE_CANONICA_WIDGET`            | `src/config/features.ts`                       | `false` | Embeddable help widget + onboarding gate         |
| `ENABLE_CANONICA_NOTIFICATIONS`     | `src/config/features.ts`                       | `false` | Email notifications for ticket events            |
| `ENABLE_CANONICA_GOVERNANCE_UI`     | `src/config/features.ts`                       | `false` | Governance hub (answer editor, drift, analytics) |
| `ENABLE_CANONICA_SIGNAL_QUALITY`    | `src/config/features.ts`                       | `false` | Severity weighting, time decay, batch queries    |
| `ENABLE_CANONICA_WHITE_LABEL`       | `src/config/features.ts`                       | `false` | Per-tenant branding (colors, logo, company name) |
| `ENABLE_CANONICA_MULTI_LANGUAGE`    | `src/config/features.ts`                       | `false` | Multi-language KB article translations           |
| `ENABLE_CANONICA_NIGHTLY`           | `functions-canonica/src/constants/features.ts` | `false` | Server-side 8-step nightly batch (3:00 AM UTC)   |

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
| `canonica_integrationEvents`     | Workflow integration events             | Tenant+Store scoped, server-written |
| `canonica_integrationDeliveryLogs` | Integration delivery attempt logs      | Tenant+Store scoped, server-written |
| `canonica_predictiveTriggers`    | Predictive support trigger rules        | Tenant+Store scoped                 |

**Rules, auth, and indexes:** Canonica tenant-scoped rules are mirrored in `firestore.rules` for shared-DB local/test mode and `firestore-canonica.rules` for dedicated Canonica Firebase deployments. `/api/auth/set-claims` returns a separate Canonica custom token when `CANONICA_FIREBASE_MODE=separate`, and the client signs into the Canonica Firebase app with the same `platformRole`, `tenantId`, and `storeId` claims. Canonica query and vector indexes are mirrored in `firestore.indexes.json` and `firestore-canonica.indexes.json`, including the `kb_articles` vector search path filtered by `status + tId + sId + embedding`.

---

## Auth & Permission Model

- **Owner-side** (Help Center page): Requires authenticated session via NextAuth. Tenant-isolated (`tId`), store-isolated (`sId`), user-isolated (`uId`).
- **Platform-admin** (Support Tickets, KB Management, Chat Management): Requires `platformRole` check (PLATFORM or PLATFORM_SUPPORT).
- **End-user chat**: The AI search modal (`AISearchModal/`) can be used by any authenticated user within their tenant.
- **KB articles**: Server-side retrieval is tenant/store filtered and fail-closed when `tId` or `sId` is missing or invalid. Write operations require platform auth.
- **Embedding API**: Protected by SAFE_MODE check + rate limiting. No explicit `withAuth()` — relies on session context.

---

## RAG Pipeline Architecture

```
User Query → [Zod Validation] → [Rate Limit Check] → [SAFE_MODE Check]
    ↓
[Image?] → [Gemini 2.5 Pro: Generate search query from image]
    ↓
[Cache Check: aiSearchHistory] → [Hit?] → Return cached response
    ↓ (Miss)
[Embedding Cache: queryEmbeddings] → [Hit?] → Use cached vector
    ↓ (Miss)
[Gemini text-embedding-004] → Generate query vector → Cache it
    ↓
[Firestore Vector Search] → status + tId + sId filtered findNearest(embedding, COSINE, limit=12)
    ↓
[Filter: status=published, similarityScore > 0.4-0.6]
    ↓
[Gemini 2.5 Flash] → Generate answer with document context
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

**Total:** 7 features × 8 docs = **56 sub-feature documents** + 9 parent documents = **65 documents total**

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
| 2026-03-06 | 3.1.0   | ChatGPT domain/launch review — 10 failure modes, entity categories, authoring guidelines added to activation experiment. Archive: `_archive/chatgpt-review-domain-launch-readiness.md` |
| 2026-03-02 | 3.0.0   | Canonica strategic doctrine — 9 governance documents from ChatGPT strategic session                                                                                                    |
| 2026-03-02 | 2.0.0   | Feature-by-feature deep documentation — 7 features × 8 docs = 56 sub-feature documents                                                                                                 |
| 2026-03-01 | 1.0.0   | Initial forensic documentation audit — 15 subsystems, 170+ files                                                                                                                       |
