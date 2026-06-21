# Answerlattice System Inventory

> **Status:** Codebase-first inventory  
> **Last Updated:** 2026-05-25
> **Source of Truth:** Runtime code, routes, constants, data-access modules, Cloud Functions, Firebase rules/indexes, then existing docs  
> **Product Boundary:** Answerlattice is a separate product. MenuList is one independent client integration and shared codebase neighbor.

---

## Purpose

This folder records what Answerlattice actually implements today. It exists because the older Answerlattice docs were created feature-by-feature, while the product is now a connected system: website, onboarding, dashboard, help center, widget, public API, governance engine, scheduler, and Firebase isolation.

Use this inventory before changing Answerlattice website copy, onboarding, dashboard navigation, Firebase rules, scheduler behavior, widget runtime, or support flows.

---

## Inventory Method

The inventory was built from these live sources first:

- Answerlattice doctrine: `__docs__/answerlattice/doctrine/`
- Answerlattice source roots: `src/app/(answerlattice)/`, `src/components/answerlattice/`, `src/components/templates/answerlattice/`
- Answerlattice website: `src/app/sites/answerlattice/`
- Answerlattice shared support client surfaces: `src/components/templates/main-app/helpCenter/`
- Answerlattice APIs: `src/app/api/answerlattice/`, `src/app/api/widget/`, `src/app/api/helpCenter/`
- Answerlattice data layer: `src/database/answerlattice/`, `src/lib/answerlattice/`, `src/hooks/answerlattice/`
- Answerlattice constants/types: `src/constants/answerlattice/`, `src/types/answerlattice/`, `src/data/answerlattice/`
- Answerlattice Cloud Functions: `functions-answerlattice/src/`
- Answerlattice Firebase config: `firebase-answerlattice.json`, `firestore-answerlattice.rules`, `firestore-answerlattice.indexes.json`, `storage-answerlattice.rules`
- Answerlattice public widget script and assets: `public/widget/answerlattice-widget.js`, `public/answerlattice-*`, `public/answerlattice.webmanifest`

Docs under `__docs__/answerlattice/` were cross-checked after code discovery. When docs and code disagree, this inventory follows code.

---

## Environment Target Matrix

| Environment | MenuList URL | MenuList Firebase | Answerlattice URL | Answerlattice Firebase |
| --- | --- | --- | --- | --- |
| Local development | `http://localhost:3000/` | `menulist-qa` | `http://localhost:3000/__answerlattice/` | `answerlattice-qa` |
| Vercel Preview / QA | `https://menulist.online` | `menulist-qa` | `https://answerlattice.menulist.online` | `answerlattice-qa` |
| Vercel Production | `https://menulist.ai` | `menulist` | `https://answerlattice.com` | `answerlattice` |

`src/constants/deploymentTargets.ts` is the code-level source of truth for this matrix. Domain routing, environment validation, Firebase aliases, and Answerlattice deploy scripts must stay in sync with it.

## Answerlattice Operating Model

Answerlattice is organized around workflow groups that match how a product owner launches and operates support:

| Group | What it owns | Implemented routes |
| --- | --- | --- |
| Launch Setup | Subscription/workspace activation, product details, starter knowledge import, product surface mapping, install handoff, and readiness review. | `/answerlattice/activation`, `/answerlattice/install-center`, `/answerlattice/settings`, `/answerlattice/kb-generation`, `/answerlattice/product-surfaces`, `/answerlattice/dashboard` |
| Support Control | Owner/staff support operations. Customer-facing help, docs, release-note viewing, and ticket submission remain runtime/customer surfaces, not primary owner dashboard navigation. | `/answerlattice/knowledge-base`, `/answerlattice/faqs`, `/answerlattice/changelog`, `/answerlattice/support-board`, `/answerlattice/tickets`, `/answerlattice/conversations`, `/answerlattice/feedback`, `/answerlattice/weekly-digest` |
| Widget & Hosted Help | Widget UI, low-level install/embed snippets, hosted help domain setup, allowed origins, blocked routes, and key security. Agent handoff and verification live in Install Center. | `/answerlattice/install-center`, `/answerlattice/widget/ui`, `/answerlattice/widget/install`, `/answerlattice/widget/hosted-help`, `/answerlattice/widget/access` |
| Team & Access | Workspace members and role permissions. | `/answerlattice/team/members`, `/answerlattice/team/roles` |
| Billing | Subscription and transaction history. | `/answerlattice/billing`, `/answerlattice/transactions` |
| Knowledge Governance | Product ontology, canonical answers, drift review, signal-to-knowledge queue, coverage, trust/readiness metrics. | `/answerlattice/governance/answers`, `/answerlattice/governance/entities`, `/answerlattice/governance/drift`, `/answerlattice/governance/signal-queue`, `/answerlattice/governance/trust` |

Management routes are gated by Answerlattice product scope or platform access. Client support routes can be exposed without giving users management access, but they should not be mixed into the owner sidebar. Management sessions that open customer shell routes are redirected to owner equivalents instead of rendering the end-user screens inside the dashboard.

---

## Implemented Feature Map

| Feature | Runtime status | Primary code | Data dependency | Product purpose |
| --- | --- | --- | --- | --- |
| Answerlattice public website | Implemented | `src/app/sites/answerlattice/` | Static site config, onboarding API | Self-sellable website for `answerlattice.com` / staging host, with product, use-case, demo, widget install, pricing, resources, updates, security, FAQ, legal, and onboarding pages. |
| Product website demo | Implemented | `src/app/sites/answerlattice/demo/` | Static demo data | Shows page-aware help, canonical answer, fallback, and gap flow without account setup. |
| Self-service onboarding | Implemented | `src/app/api/answerlattice/onboard/route.ts`, `src/app/sites/answerlattice/get-started/` | `users`, `stores`, `subscriptions`, `answerlattice_productSurfaces`, `platformSummary/contextContent_*` | Creates Answerlattice workspace and routes users to activation. Payment can stay manual/cash until paid flow is added. |
| Product details / workspace profile | Implemented | `src/app/api/answerlattice/workspace-profile/route.ts`, `src/components/templates/answerlattice/AnswerlatticeSettings.tsx` | `stores/{sId}.answerlatticeWorkspaceProfile` | Stores product URL, support email, billing model, and initial product context. |
| Activation Command Center | Implemented | `src/app/(answerlattice)/answerlattice/activation/page.tsx`, `src/components/templates/answerlattice/activation/AnswerlatticeActivationCommandCenter.tsx`, `src/components/templates/answerlattice/content/AnswerlatticeContentWorkbench.tsx`, `src/components/templates/answerlattice/content/AnswerlatticeCustomerFlowChecklist.tsx`, `src/lib/answerlattice/activationSummary.ts` | Compact store + `platformSummary` docs | Shows launch readiness, first-client launch proof, product-owner content workflow, and customer-path testing without scanning large collections at page load. |
| Product surfaces | Implemented | `src/components/templates/answerlattice/productSurfaces/AnswerlatticeProductSurfaces.tsx`, `src/database/answerlattice/productSurfaces.ts`, `src/lib/answerlattice/productSurfaceContent*.ts` | `answerlattice_productSurfaces`, `platformSummary/contextContent_{tId}_{sId}` | Maps routes/pages/workflows to entities, tags, articles, changelogs, and tickets. |
| Content Control workbench | Implemented | `src/components/templates/answerlattice/content/AnswerlatticeContentWorkbench.tsx`, `/answerlattice/activation`, `/answerlattice/dashboard` | Activation summary read model | Gives product owners one low-cost path into product profile, import, articles, surfaces, changelog, signal queue, widget, and tickets. |
| Surface Readiness matrix | Implemented | `src/components/templates/answerlattice/content/AnswerlatticeSurfaceReadinessMatrix.tsx`, `src/lib/answerlattice/activationSummary.ts`, `/answerlattice/dashboard` | `platformSummary/contextContent_{tId}_{sId}` via activation summary | Shows which product areas are ready, missing mapping, missing content, or carrying open ticket signals using 0 extra dashboard reads. |
| Test-as-Customer checklist | Implemented | `src/components/templates/answerlattice/content/AnswerlatticeCustomerFlowChecklist.tsx`, `/answerlattice/activation`, `/answerlattice/dashboard` | Activation summary read model | Gives product owners a launch-proof checklist for help center, widget, page context, ticket fallback, release notes, and Signal Queue. |
| Install Center | Implemented | `src/app/(answerlattice)/answerlattice/install-center/page.tsx`, `src/components/templates/answerlattice/install/AnswerlatticeInstallCenter.tsx`, `src/lib/answerlattice/installContract/contract.ts`, `/api/answerlattice/widget-config`, `/api/answerlattice/widget-agent-kit` | Widget config/runtime status + optional activation summary | Keeps the AI install packet, current setup snapshot, framework snippets, public docs links, and verification checklist in one dashboard route. |
| Context-aware support mounting | Implemented | `src/components/templates/main-app/helpCenter/HeroSearchBar.tsx`, `src/lib/answerlattice/productSurfaceContent.ts`, `src/app/api/helpCenter/search-kb/route.ts`, widget APIs | Safe context payload + product surface summary | Passes page/feature/workflow context into Answerlattice without trusting raw client data as tenant scope. |
| Widget management | Implemented | `src/components/templates/answerlattice/widgetManagement/AnswerlatticeWidgetManagement.tsx`, `src/app/api/answerlattice/widget-config/route.ts`, `src/app/api/answerlattice/widget-key/route.ts`, `src/app/api/answerlattice/widget-activity/route.ts`, `src/lib/answerlattice/widgetConfig.ts` | `stores/{sId}.answerlatticeWidgetConfig`, key hash fields, runtime status, `aiSearchHistory` widget rows | Configure appearance, install snippet, allowed origins, blocked routes, history, mobile visibility, runtime status, and recent widget questions. |
| Embedded public widget runtime | Implemented | `public/widget/answerlattice-widget.js`, `src/app/widget/[apiKey]/WidgetClient.tsx`, `src/app/api/widget/config/route.ts`, `src/app/api/widget/search/route.ts`, `src/app/api/widget/feedback/route.ts` | Store widget config, API key hash, AI search history with `mountContext`, KB/canonical retrieval | Gives client products page-aware support through one embeddable script. |
| Help center | Implemented | `src/app/(main)/help-center/`, `src/components/templates/main-app/helpCenter/`, `/answerlattice/help` compatibility route, `/api/answerlattice/public-content` | Cached KB, FAQ, changelog, tickets, search history | Public/customer support home reused by client support surfaces. It is not a primary owner dashboard navigation item; owners manage source content through KB, FAQ, Changelog, Tickets, Support Board, and Widget & Hosted Help. KB categories, article reads, FAQ lists, and changelog pages use tenant/store-tagged public cache with owner-write invalidation. |
| Feedback, ratings, and feature requests | Implemented | `src/components/templates/main-app/helpCenter/ShareFeedbackView.tsx`, `src/components/templates/main-app/helpCenter/FeatureRequests.tsx`, `src/components/templates/answerlattice/feedback/AnswerlatticeFeedbackReview.tsx`, `src/database/feedback/index.ts`, `src/app/(answerlattice)/answerlattice/feedback/page.tsx`, `src/app/(main)/platform/feedback-admin/page.tsx`, `/answerlattice/help` | `feedback` in Answerlattice Firebase via `answerlatticeRequestBodyComposer`, `answerlattice_signalEvents(type='feedback')`, `answerlattice_supportBoardCards(sourceType='feedback')`, plus `article_feedback/{tId}/{sId}` and `changelog_feedback/{tId}/{sId}` | Customer help surfaces include a Share Feedback tab for ratings, product-area issues, feature requests, and suggestions. Owners review rows at `/answerlattice/feedback`; important feedback can be added directly to Support Board or synced as a signal, then turned into governed answer proposals after entity linking. |
| Hosted public Help Center | Implemented | `src/app/answerlattice-hosted-help/`, `src/components/templates/answerlattice/hostedHelp/`, `src/app/api/answerlattice/hosted-help-settings/route.ts`, `src/lib/answerlattice/hostedHelpServer.ts` | `stores/{sId}.hostedHelpConfig`, `answerlattice_publicHelpSites/{domain}`, cached KB/FAQ/changelog | Renders anonymous docs, FAQ, changelog, sitemap, and robots on domains such as `help.example.com` without exposing authenticated tickets/chat/user data. |
| Knowledge Intake | Implemented | `src/components/templates/answerlattice/knowledgeIntake/AnswerlatticeKnowledgeIntake.tsx`, `src/lib/answerlattice/knowledgeIntake.ts`, `src/app/api/answerlattice/knowledge-intake/*` | `answerlattice_knowledgeIntakeJobs`, `answerlattice_knowledgeSources`, `answerlattice_intakeReviewItems`, existing KB/FAQ/product surface/mutation proposal destinations | Imports selected links, files, screenshots/media, pasted content, support macros, and repeated replies into reviewed drafts. Repeated replies create FAQ/canonical proposal drafts only and add no connector, Storage, scheduler, or AI call. |
| Knowledge base explorer | Implemented | `src/app/(answerlattice)/answerlattice/docs/page.tsx`, `src/app/(answerlattice)/answerlattice/knowledge-base/page.tsx`, KB templates | `kb_categories`, `kb_articles` | Browse and manage support documentation. |
| KB generation pipeline | Implemented | `src/app/(answerlattice)/answerlattice/kb-generation/page.tsx`, `src/components/templates/platform/KBGeneration/`, `functions-answerlattice/src/logic/*` | `kb_generation_jobs`, `kb_articles`, `kb_categories`, storage | Upload, generate, review, publish, and embed KB content. |
| Product ontology | Implemented | `src/database/answerlattice/entities.ts`, `src/lib/answerlattice/entityExtraction.ts`, `src/components/templates/answerlattice/governance/EntityManagementDashboard.tsx` | `answerlattice_entities`, `answerlattice_entityRelations`, `answerlattice_entitySearchIndex`, `answerlattice_entityCandidates` | Models product features, plans, roles, workflows, states, integrations, and errors as first-class concepts. |
| Entity candidates | Implemented | `src/database/answerlattice/entityCandidates.ts`, `src/components/templates/answerlattice/EntityCandidateReview.tsx`, `functions-answerlattice/src/answerlattice/onboardingBootstrap.ts` | `answerlattice_entityCandidates` | Stages extracted concepts for human approval before becoming ontology entities. |
| Canonical answer engine | Implemented | `src/database/answerlattice/canonicalAnswers.ts`, `src/lib/answerlattice/canonicalRetrieval.ts`, `src/components/templates/answerlattice/governance/CanonicalAnswerEditor.tsx` | `answerlattice_canonicalAnswers`, entity search index, releases | Retrieves approved scoped answers before fallback. |
| Guided workflow answer model | Implemented but rollout-gated | `src/lib/answerlattice/procedureValidation.ts`, canonical answer types | `answerlattice_canonicalAnswers.content.procedure` | Adds ordered procedures, prerequisites, warnings, and action metadata to canonical answers. |
| Instant cache + freshness manifest | Implemented | `src/lib/answerlattice/instantCache.ts`, `src/lib/answerlattice/cacheFreshness.ts`, `src/lib/answerlattice/cacheVersion*.ts`, `functions-answerlattice/src/answerlattice/cacheVersionManifest.ts` | Upstash Redis when configured, `answerlattice_cacheVersions` | Caches repeated canonical hits while checking compact source versions instead of scanning source docs. |
| Compiled context distribution | Implemented | `src/lib/answerlattice/contextBundleBuilderServer.ts`, `src/lib/answerlattice/compiledContext.ts`, `src/app/api/answerlattice/bundles/*`, `functions-answerlattice/src/answerlattice/contextBundleBuilder.ts` | `platformSummary/sourceVersions_*`, `platformSummary/bundleManifest_*`, Firebase Storage `answerlattice-context/*` | Compiles approved read-heavy context into immutable public/private JSON bundles for widget, public API, MCP, and scheduler-safe serving. |
| Centralized scheduler | Implemented | `functions-answerlattice/src/answerlattice/answerlatticeMasterScheduler.ts`, `functions-answerlattice/src/answerlattice/schedulerTime.ts`, `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` | `platformSummary/answerlatticeTenantsSummary`, `platformSummary/answerlatticeSchedulerState`, `platformSummary/answerlatticeNightlyState_*`, `platformSummary/answerlatticeNightlyLock_*` | Keeps one scheduled Answerlattice export while filtering workspaces by local timezone/support-day end time and locking each workspace/date. |
| Drift governance | Implemented | `src/lib/answerlattice/driftDetection.ts`, `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts`, `src/components/templates/answerlattice/governance/DriftDashboard.tsx` | canonical answers, entities, releases, signals | Flags version mismatch, signal anomaly, scope conflict, and deprecated entity drift. |
| Signal mutation engine | Implemented | `src/lib/answerlattice/signalEmitter.ts`, `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts`, `src/components/templates/answerlattice/MutationProposalReview.tsx`; `src/lib/answerlattice/signalMutation.ts` is a reference/manual utility only | `answerlattice_signalEvents`, `answerlattice_mutationProposals` | Turns repeated tickets, negative feedback, feedback, fallback, and escalation signals into reviewable knowledge changes. Production clustering skips unresolved signals until a real entity is linked. |
| Auto knowledge drafts | Implemented with caps | `src/lib/answerlattice/draftGenerator.ts`, `functions-answerlattice/src/answerlattice/draftGenerator.ts`, `src/lib/answerlattice/draftPrompt.ts`, `src/components/templates/answerlattice/MutationProposalReview.tsx` | mutation proposals, entities, signals | Generates draft canonical answers for human review; queue UI supports publish, reject, and explicit generate/regenerate. Never auto-publishes authoritative content. |
| Support Board | Implemented with source sync gated | `src/app/(answerlattice)/answerlattice/support-board/page.tsx`, `src/components/templates/answerlattice/supportBoard/AnswerlatticeSupportBoard.tsx`, `src/hooks/answerlattice/useSupportBoard.ts`, `src/database/answerlattice/supportBoard.ts`, `functions-answerlattice/src/answerlattice/supportBoardSync.ts` | `answerlattice_supportBoardCards`, `platformSummary/supportBoardSummary_*`, support tickets, `answerlattice_signalEvents`, mutation proposals | Private owner/staff Kanban for support gaps, internal notes, status history, Needs Answer workflow, and governed answer-proposal creation. Ticket/signal import and nightly signal-quality prep are implemented but disabled by default to avoid duplicating existing dashboards and Firebase work. |
| Ticket system | Implemented | `src/components/templates/main-app/helpCenter/TicketView.tsx`, `src/app/(answerlattice)/answerlattice/support/page.tsx`, `src/app/(answerlattice)/answerlattice/tickets/page.tsx` | support tickets collection | Provides ticket fallback and operator review path when content does not answer the user. |
| Ticket knowledge loop | Implemented and enabled with caps | `functions-answerlattice/src/answerlattice/resolutionExtractor.ts`, `src/lib/answerlattice/signalEmitter.ts` | resolved tickets, signals, mutation proposals | Extracts reusable knowledge from resolved ticket clusters after 3+ resolved tickets per entity. |
| Changelog / release notes | Implemented | `src/app/(answerlattice)/answerlattice/changelog/page.tsx`, `src/app/(answerlattice)/answerlattice/release-notes/page.tsx`, `src/database/answerlattice/releases.ts`, shared changelog templates | `answerlattice_releases`, shared changelog collection | Connects release changes to surfaces, tags, entities, and stale-answer review. |
| Weekly digest | Implemented | `src/app/(answerlattice)/answerlattice/weekly-digest/page.tsx`, `src/components/templates/answerlattice/weeklyDigest/AnswerlatticeWeeklyDigest.tsx` | summary-backed support/governance data | Gives owners a review queue summary instead of forcing collection scans. |
| Founder trust/readiness metrics | Implemented | `src/database/answerlattice/trustMetrics.ts`, `src/components/templates/answerlattice/governance/FounderTrustDashboard.tsx`, `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` | `platformSummary/trustMetrics_{tId}_{sId}` | Summarizes coverage, resolution readiness, drift pressure, escalations, and top failing entities. |
| Coverage KPI | Implemented | `src/database/answerlattice/coverageKPI.ts`, `src/components/templates/answerlattice/AnswerlatticeCoverageKPI.tsx`, nightly functions | `platformSummary/coverage_{tId}_{sId}` | Tracks canonical coverage without dashboard collection scans. |
| Product friction intelligence | Implemented and enabled with caps | `functions-answerlattice/src/answerlattice/frictionAggregation.ts`, `frictionInsight.ts`, `src/database/answerlattice/frictionStats.ts`, `FrictionTab.tsx` | `answerlattice_frictionDailyStats`, `platformSummary/friction*` | Aggregates recurring support friction and optional weekly insight generation from bounded nightly queries. |
| Public API v1 | Implemented but rollout-gated | `src/app/api/answerlattice/public/v1/answers`, `/entities`, `/signals`, `src/lib/answerlattice/publicApi.ts` | Public API keys, canonical retrieval, entities, signals | External product integration surface. Feature flag remains off until product rollout is intentional; production answer responses suppress internal debug traces and signal ingestion treats explicit external IDs as idempotency keys. |
| Email notifications | Implemented and enabled | `src/lib/notifications/`, `src/app/api/answerlattice/notifications/test/route.ts`, ticket DAL notification triggers | Ticket/event data, `answerlattice_notificationLogs` | Ticket-created/reply/status emails are fire-and-forget, rate-limited, logged in Answerlattice Firebase, and testable from Activation. |
| Widget branding | Implemented | `src/lib/answerlattice/widgetConfig.ts`, `AnswerlatticeWidgetManagement.tsx`, `public/widget/answerlattice-widget.js`, `WidgetClient.tsx` | `stores/{sId}.widgetConfig` | Widget header title, accent color, greeting, launcher, and powered-by visibility are tenant-configurable without extra runtime reads. |
| Advanced white-label branding | Implemented but disabled by default | `src/database/answerlattice/branding.ts`, `WhiteLabelBranding.tsx` | `platformSummary/branding_{tId}_{sId}` | Broader KB/email branding controls remain guarded until all public support surfaces consume the same branding read model. |
| Multi-language articles | Implemented but disabled by default | `src/app/api/answerlattice/translate/route.ts`, `MultiLanguageArticles.tsx`, `src/database/knowledgeBase/articles.ts` | `kb_articles.translations` | Article translation workflow behind feature flag, safe mode, fail-closed rate limits, an 8,000-character article-text prompt cap, scoped category-index loading, and chunked article status reads capped at 500 IDs. |
| AI failure escalation | Implemented but disabled by default | `src/lib/answerlattice/escalationEvaluator.ts`, `escalationTypes.ts` | search/retrieval result metadata and signal events | Detects low-confidence or repeated failures that should become support escalation signals. |
| Separate Firebase/project support | Implemented | `src/lib/firebase/answerlatticeFirebase.ts`, `functions-answerlattice/src/firebaseAdmin.ts`, Answerlattice rules/indexes | Answerlattice Firebase app/admin config | Keeps Answerlattice data isolated from MenuList when `ANSWERLATTICE_FIREBASE_MODE=separate`, including tenant-scoped content reaction rules for `article_feedback/{tId}/{sId}` and `changelog_feedback/{tId}/{sId}`. |

---

## Route Map

### Public Answerlattice Website

- `/` on Answerlattice product hosts and `/__answerlattice` in local/dev rewrite mode.
- `/product`, `/product/launch-setup`, `/product/page-aware-widget`, `/product/support-control`, `/product/knowledge-governance`, `/product/knowledge-base`, `/product/faq-management`, `/product/changelog`, `/product/tickets`, `/use-cases`, `/demo`, `/install`, `/pricing`, `/resources`, `/updates`, `/get-started`, `/security`, `/faq`, `/about`, `/contact`.
- `/integrations` remains only as a redirect alias to `/install` for older links.
- `/privacy-policy`, `/terms-of-service`, `/robots.txt`, `/sitemap.xml`.
- Public website routes intentionally avoid root-level `/docs`, `/help`, `/changelog`, and `/release-notes` because those roots are dashboard/client-support routes on Answerlattice product hosts. Buyer-facing feature pages live under `/product/*`.

### Answerlattice Dashboard

- `/answerlattice` redirects by scope: management users to activation/dashboard, support-only users to client home/help.
- `/answerlattice/activation`, `/answerlattice/install-center`, `/answerlattice/settings`, `/answerlattice/kb-generation`, `/answerlattice/product-surfaces`, `/answerlattice/dashboard`.
- Direct customer/compatibility routes retained outside owner navigation: `/answerlattice/help`, `/answerlattice/docs`, `/answerlattice/release-notes`, `/answerlattice/support`.
- Owner Support Control routes: `/answerlattice/knowledge-base`, `/answerlattice/faqs`, `/answerlattice/changelog`, `/answerlattice/support-board`, `/answerlattice/tickets`, `/answerlattice/conversations`, `/answerlattice/feedback`, `/answerlattice/weekly-digest`.
- `/answerlattice/widget`, `/answerlattice/widget/[tab]` for UI, install, hosted help, and access/security subroutes.
- `/answerlattice/team`, `/answerlattice/team/[tab]` for members and roles subroutes.
- `/answerlattice/billing`, `/answerlattice/transactions`.
- `/answerlattice/governance`, and `/answerlattice/governance/[tab]` sidebar subroutes.

### Widget Runtime

- `/widget/[apiKey]` hosts the iframe/widget app.
- `/widget/answerlattice-widget.js` is the public embeddable script.
- `/api/widget/config`, `/api/widget/search`, `/api/widget/feedback` are public widget runtime endpoints protected by key hash and allowed-origin checks.
- `/api/answerlattice/widget-activity` is the protected dashboard read for recent widget questions.
- In separated Firebase mode, `al_` widget/API key validation reads Answerlattice Firestore through `answerlatticeFirestoreAdmin` and fails closed if Answerlattice Admin credentials are missing. Widget runtime endpoints opt out of MenuList `publicApi` fallback, validate active keys through `stores.answerlatticeWidgetApi.keyHashes` with legacy `apiKeyHash` fallback, while MenuList public API endpoints only accept `ml_` keys.
- `/api/answerlattice/bundles/public/[...path]` proxies public-safe compiled bundle files from opaque Storage paths.

### MenuList Client Integration

- MenuList `/help-center` acts as an Answerlattice client route only when the signed-in user has `productAccounts.AL`.
- Client Help Center search, ticket creation, changelog/release-note reads, and Firebase Auth claim sync use the Answerlattice product account `tId/sId`; the originating MenuList product scope is retained in Answerlattice `sourceContext`.
- This integration is product-account driven. There is no dedicated MenuList client-test flag, one-off widget host, or fallback to MenuList Firebase for Answerlattice-owned support data.

### Protected Answerlattice APIs

- Answerlattice dashboard routes wait for `ensureFirebaseAuthForSession()` before mounting Firestore-backed children, so separate Firebase reads/listeners use Answerlattice Auth claims rather than stale MenuList/default Firebase Auth state. Platform/support users keep their platform claims even when the same email also has a tenant-level Answerlattice account.
- `/api/answerlattice/onboard`
- `/api/answerlattice/workspace-profile`
- `/api/answerlattice/activation/summary`
- `/api/answerlattice/operations/status`
- `/api/answerlattice/widget-config`
- `/api/answerlattice/widget-key`
- `/api/answerlattice/product-surfaces/rebuild-summary`
- `/api/answerlattice/bundles/rebuild`
- `/api/answerlattice/mcp/session`
- `/api/answerlattice/mcp`
- `/api/answerlattice/tenant-summary`
- `/api/answerlattice/translate`

### Public API v1

- `/api/answerlattice/public/v1/answers`
- `/api/answerlattice/public/v1/entities`
- `/api/answerlattice/public/v1/signals`

These routes exist, validate API scope, and are controlled by `ENABLE_ANSWERLATTICE_PUBLIC_API`.

---

## Backend and Scheduler Map

| Backend unit | Trigger | Purpose | Cost posture |
| --- | --- | --- | --- |
| `answerlatticeNightly` | Scheduled Cloud Function | Compatibility export for the centralized Answerlattice scheduler. Runs hourly and delegates to `runAnswerlatticeMasterScheduler()`. | Reads `platformSummary/answerlatticeTenantsSummary`, filters by workspace-local EOD, then runs governance only for due tenants. |
| `triggerAnswerlatticeNightly` | HTTP manual trigger with secret | Manual recovery path for the same centralized scheduler. | Uses the same task registry and locks as scheduled runs, with force-all tenant processing for recovery. |
| `/api/answerlattice/operations/status` | Protected owner API | Activation Daily Governance panel status. | Reads one store doc, two platformSummary docs, and five capped scheduler logs; filters run logs to the current workspace. |
| `embedArticleWorker` | Cloud Tasks | Generates/stores KB article embeddings after article generation. | Async work, separated from UI. |
| `regenerateEmbedding` | Callable | Manual article embedding regeneration. | Admin/protected callable; expensive only on demand. |
| `publishApprovedJobFn` | Callable | Publishes reviewed KB generation job output. | Transactional publishing and cache version bump. |
| `contextBundleBuilder` | Nightly task inside `answerlatticeNightly` plus owner-triggered API | Repairs stale compiled context bundles after source-version changes. | Reads bounded approved sources only when stale; runtime paths use Storage/server cache instead of collection fanout. |

---

## Firebase Collections and Summary Docs

### Answerlattice-owned collections

- `answerlattice_entities`
- `answerlattice_entityRelations`
- `answerlattice_canonicalAnswers`
- `answerlattice_releases`
- `answerlattice_mutationProposals`
- `answerlattice_signalEvents`
- `answerlattice_auditLogs`
- `answerlattice_entitySearchIndex`
- `answerlattice_entityCandidates`
- `answerlattice_frictionDailyStats`
- `answerlattice_schedulerRunLogs`
- `platformSummary/answerlatticeSchedulerState`
- `platformSummary/answerlatticeSchedulerTaskLock_*`
- `platformSummary/answerlatticeNightlyState_*`
- `platformSummary/answerlatticeNightlyLock_*`
- `answerlattice_aiOperations`
- `answerlattice_cacheVersions`
- `answerlattice_notificationLogs`
- `answerlattice_productSurfaces`

### Shared support collections used by Answerlattice surfaces

- `kb_articles`
- `kb_categories`
- `kb_generation_jobs`
- `menuImageProcessingJobs`
- `aiSearchHistory`
- support ticket/changelog collections used by shared Help Center and product-surface summaries

### Compact summary docs

- `platformSummary/answerlatticeTenantsSummary`
- `platformSummary/contextContent_{tId}_{sId}`
- `platformSummary/coverage_{tId}_{sId}`
- `platformSummary/trustMetrics_{tId}_{sId}`
- `platformSummary/frictionSnapshot_{tId}_{sId}`
- `platformSummary/friction_{tId}_{sId}`
- `platformSummary/sourceVersions_{tId}_{sId}`
- `platformSummary/bundleManifest_{tId}_{sId}`
- `platformSummary/bundleBuildLock_{tId}_{sId}`
- `platformSummary/supportBoardSummary_{tId}_{sId}`
- `platformSummary/knowledgeIntakeSummary_{tId}_{sId}`
- `platformSummary/predictiveTriggers_{tId}_{sId}`
- `platformSummary/integrationHealth_{tId}_{sId}`
- `platformSummary/mcpSignal_{tId}_{sId}_{dateKey}`

Dashboard and scheduler flows should prefer summary docs over scanning growing collections. Detail lists must stay tenant-scoped and bounded; realtime listeners are exceptional and require a documented cost reason. See [Cost Read-Model Guardrails](../cost-read-model-guardrails/README.md).

---

## Feature Flags

### Enabled in app by default

- `ENABLE_ANSWERLATTICE_ONTOLOGY`
- `ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS`
- `ENABLE_ANSWERLATTICE_DRIFT_DETECTION`
- `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION`
- `ENABLE_ANSWERLATTICE_WIDGET`
- `ENABLE_ANSWERLATTICE_ACTIVATION_COMMAND_CENTER`
- `ENABLE_ANSWERLATTICE_WEEKLY_DIGEST`
- `ENABLE_ANSWERLATTICE_GOVERNANCE_UI`
- `ENABLE_ANSWERLATTICE_CONTEXT_AWARE`
- `ENABLE_ANSWERLATTICE_PRODUCT_SURFACES`
- `ENABLE_ANSWERLATTICE_INSTANT_CACHE`
- `ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE`
- `ENABLE_ANSWERLATTICE_NOTIFICATIONS`
- `ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE`
- `ENABLE_ANSWERLATTICE_TICKET_KNOWLEDGE`
- `ENABLE_ANSWERLATTICE_FOUNDER_ONBOARDING`
- `ENABLE_ANSWERLATTICE_TRUST_METRICS`
- `ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES`
- `ENABLE_ANSWERLATTICE_BUNDLE_BUILDER`
- `ENABLE_ANSWERLATTICE_WIDGET_BUNDLE_BOOTSTRAP`
- `ENABLE_ANSWERLATTICE_PUBLIC_API_BUNDLE_READS`

### Disabled / rollout-gated by default

- `ENABLE_ANSWERLATTICE_PUBLIC_API`
- `ENABLE_ANSWERLATTICE_SIGNAL_QUALITY`
- `ENABLE_ANSWERLATTICE_WHITE_LABEL`
- `ENABLE_ANSWERLATTICE_MULTI_LANGUAGE`
- `ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS`
- `ENABLE_ANSWERLATTICE_AI_ESCALATION`
- `ENABLE_ANSWERLATTICE_MCP`

### Enabled in Cloud Functions by default

- `ENABLE_ANSWERLATTICE_NIGHTLY`
- `ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE`
- `ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE`
- `ENABLE_ANSWERLATTICE_TICKET_KNOWLEDGE`
- `ENABLE_ANSWERLATTICE_TRUST_METRICS`
- `ENABLE_ANSWERLATTICE_FOUNDER_ONBOARDING`
- `ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES`
- `ENABLE_ANSWERLATTICE_BUNDLE_BUILDER`

Enabled nightly intelligence loops are capped and summary-backed. Predictive support, workflow notifications, and knowledge graph traversal are active expansion paths and must stay guarded by cooldown storage, event caps, sanitized delivery payloads, and compact `platformSummary` reads.

---

## Public Website Truth

The Answerlattice website can safely claim these implemented capabilities:

- Page-aware support through product surfaces and widget context.
- Product ontology, canonical answer engine, drift governance, and signal mutation.
- Launch setup with workspace profile, knowledge import, product surfaces, widget install, and activation readiness.
- Help center, KB, changelog/release notes, tickets, feedback, ratings, feature requests, and widget as support surfaces.
- Summary-backed coverage/readiness/trust metrics.
- Cost-conscious scheduler and dashboard design using compact summary docs.
- Compiled context bundles as the permanent read distribution layer for approved widget/API/MCP context.
- Widget install, allowed origins, blocked routes, runtime verification, safe page context, and tenant-level widget branding as the default client integration path.
- Ticket notification delivery readiness with test-send verification and Answerlattice-scoped failure logs.
- Product friction intelligence and ticket-to-knowledge extraction as controlled, capped governance loops.

The website should not claim:

- Enterprise helpdesk replacement.
- CRM, task management, project management, or full customer support inbox replacement.
- Fully automated publishing without owner review.
- Always-on external workflow adapters as default package features.
- Public API as a default package feature while its rollout flag remains disabled.
- MCP as a default package feature while its rollout flag remains disabled.
- MenuList-specific hardcoded behavior.

---

## Current Product Readiness Verdict

**Production Ready with Controlled Rollout Flags**

Core Answerlattice flows are implemented and documented enough for staging use:

- onboarding
- activation
- product details
- product surfaces
- widget management/runtime
- KB generation
- help center
- tickets
- changelog/release notes
- ontology
- canonical answers
- drift
- signal mutation
- trust metrics
- nightly scheduler
- compiled context distribution

The following remain intentional rollout controls:

- public API
- MCP
- AI escalation
- guided workflows
- multi-language
- advanced cross-surface white-label branding
- Jira integration
- native helpdesk connectors

Those features remain behind intentional rollout controls and should stay conservative in website copy unless enabled for a client.

---

## Expansion Execution Order

The safe next step is not another connector. The safe next step is first-client proof of the governed answer loop:

1. Fresh account completes onboarding and reaches Activation.
2. Workspace profile captures product URL, support email, billing model, and starting context.
3. Knowledge Intake or KB-generation compatibility path imports source-backed product material.
4. Product surfaces map routes, pages, workflows, entities, tags, articles, changelogs, and tickets.
5. Entity candidates and canonical answer drafts appear in Governance.
6. Owner approves canonical answers before they become active.
7. Widget install is verified on a separate client page with safe page context.
8. Feedback, fallback, ticket, and escalation signals create reviewable mutation proposals.
9. Weekly digest, coverage, trust, drift, and friction surfaces read compact summaries.
10. Activation exposes `summary.launchProof` so setup, knowledge, ontology, widget, governance summary, and signal-source blockers are visible before connector rollout.

Expansion gates:

- Public API v1 routes exist, but `ENABLE_ANSWERLATTICE_PUBLIC_API` stays off until approved canonical coverage, `al_*` keys, rate limits, usage logs, and public docs are verified for a target tenant.
- Workflow integrations stay event-producer-only. Slack/email are self-service; Linear/GitHub are controlled rollout; Jira is not implemented.
- Jira must be a docs-first feature that converts resolved issues into entity-bound knowledge proposals, not basic ticket sync.
- Native Zendesk, Intercom, Freshdesk, or Help Scout connectors are not implemented. Start with export/import through Knowledge Intake before considering OAuth/API sync.
- White-label and multi-language are market expansion controls, not the core launch proof.
- Distribution expansion should wait until canonical coverage and governance queues are stable.

---

## Implemented-But-Hidden Audit — 2026-05-22

This pass checked route constants, Answerlattice dashboard pages, governance tabs, APIs, widget runtime/config, DAL modules, Cloud Functions, and the feature map for code that existed but was not practically exposed.

Findings:

- Dashboard route constants and `/answerlattice/*` page files are aligned: no route constant is missing a page, and no page is missing a route constant.
- Ticket browser-log capture was implemented in DAL/types/modal but was not fully exposed. The runtime now starts sanitized last-5 browser-log capture for authenticated app sessions, ticket creation clears logs only after a successful write, and platform ticket details expose a Logs button.
- Auto-knowledge manual draft regeneration was implemented in `src/lib/answerlattice/draftGenerator.ts` but not reachable from the Signal-to-Knowledge Queue. The queue now exposes explicit Generate/Regenerate actions, preserves the one-click human review model, and shows draft evidence/context.
- `src/lib/answerlattice/signalMutation.ts` is a reference/manual utility, not the production batch path. The production mutation pipeline remains in `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` to avoid broad client-side signal scans.
- Widget blocked routes, allowed origins, mobile visibility, history mode, and remote runtime config are wired in both management UI and public widget loader.

Intentional rollout-gated features still found in code:

- Public API v1
- Multi-language articles
- Advanced cross-surface white-label branding
- AI escalation

These should not be enabled merely because code exists. They add integration surface, AI cost, scheduler work, or client-facing scope, so they remain behind `ENABLE_ANSWERLATTICE_*` flags until a product rollout decision enables them.

Launch-hardening changes enabled in the 2026-05-22 pass:

- Ticket/email notification verification is enabled and visible in Activation.
- Widget install/runtime verification remains in Activation and is centralized in `/answerlattice/install-center`; `/answerlattice/widget/install` keeps low-level snippets/settings handoff and links to Install Center. Branding controls include header title and powered-by visibility.
- Signal-to-Knowledge Queue manual draft generation/regeneration remains reachable from governance.
- Ticket browser-log capture stays on ticket creation and is visible in ticket details.
- Ticket-to-knowledge extraction and product friction intelligence are enabled with nightly caps.
- Basic usage/readiness stays summary-backed; raw cache/cost/internal logs are not exposed to Answerlattice clients.
- Product-owner content management is now surfaced as a single Content Control workbench on Activation and Readiness Metrics. It links profile, import, articles, product surfaces, changelog, signal queue, widget, and tickets from the existing summary read model instead of adding new dashboard reads.
- Surface Readiness and Test-as-Customer projections now tell owners which product areas are ready, what to test before launch, and where repeated ticket signals need review, all from the existing activation summary.
- Ticket details now include operator-only Knowledge Loop guidance so resolved tickets can become reviewed knowledge proposals without adding a new ticket workflow.
- Knowledge Base, article editor, changelog, and Signal-to-Knowledge Queue were tightened for mobile/product-owner use: stacked mobile content panes, responsive article modal, mobile changelog actions, clearer empty states, and less internal technical wording.
