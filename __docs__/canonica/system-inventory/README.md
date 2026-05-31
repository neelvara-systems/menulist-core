# Canonica System Inventory

> **Status:** Codebase-first inventory  
> **Last Updated:** 2026-05-25
> **Source of Truth:** Runtime code, routes, constants, data-access modules, Cloud Functions, Firebase rules/indexes, then existing docs  
> **Product Boundary:** Canonica is a separate product. MenuList is one independent client integration and shared codebase neighbor.

---

## Purpose

This folder records what Canonica actually implements today. It exists because the older Canonica docs were created feature-by-feature, while the product is now a connected system: website, onboarding, dashboard, help center, widget, public API, governance engine, scheduler, and Firebase isolation.

Use this inventory before changing Canonica website copy, onboarding, dashboard navigation, Firebase rules, scheduler behavior, widget runtime, or support flows.

---

## Inventory Method

The inventory was built from these live sources first:

- Canonica doctrine: `__docs__/canonica/doctrine/`
- Canonica source roots: `src/app/(canonica)/`, `src/components/canonica/`, `src/components/templates/canonica/`
- Canonica website: `src/app/sites/canonica/`
- Canonica shared support client surfaces: `src/components/templates/main-app/helpCenter/`
- Canonica APIs: `src/app/api/canonica/`, `src/app/api/widget/`, `src/app/api/helpCenter/`
- Canonica data layer: `src/database/canonica/`, `src/lib/canonica/`, `src/hooks/canonica/`
- Canonica constants/types: `src/constants/canonica/`, `src/types/canonica/`, `src/data/canonica/`
- Canonica Cloud Functions: `functions-canonica/src/`
- Canonica Firebase config: `firebase-canonica.json`, `firestore-canonica.rules`, `firestore-canonica.indexes.json`, `storage-canonica.rules`
- Canonica public widget script and assets: `public/widget/canonica-widget.js`, `public/canonica-*`, `public/canonica.webmanifest`

Docs under `__docs__/canonica/` were cross-checked after code discovery. When docs and code disagree, this inventory follows code.

---

## Environment Target Matrix

| Environment | MenuList URL | MenuList Firebase | Canonica URL | Canonica Firebase |
| --- | --- | --- | --- | --- |
| Local development | `http://localhost:3000/` | `ecomsai` | `http://localhost:3000/__canonica/` | `canonica-qa` |
| Vercel Preview / QA | `https://menulist.online` | `ecomsai` | `https://ecomsai.com` | `canonica-qa` |
| Vercel Production | `https://menulist.ai` | `menulist` | `https://canonica.app` | `canonica` |

`src/constants/deploymentTargets.ts` is the code-level source of truth for this matrix. Domain routing, environment validation, Firebase aliases, and Canonica deploy scripts must stay in sync with it.

## Canonica Operating Model

Canonica is organized around workflow groups that match how a product owner launches and operates support:

| Group | What it owns | Implemented routes |
| --- | --- | --- |
| Launch Setup | Subscription/workspace activation, product details, starter knowledge import, product surface mapping, install handoff, and readiness review. | `/canonica/activation`, `/canonica/install-center`, `/canonica/settings`, `/canonica/kb-generation`, `/canonica/product-surfaces`, `/canonica/dashboard` |
| Support Control | Owner/staff support operations. Customer-facing help, docs, release-note viewing, and ticket submission remain runtime/customer surfaces, not primary owner dashboard navigation. | `/canonica/knowledge-base`, `/canonica/faqs`, `/canonica/changelog`, `/canonica/support-board`, `/canonica/tickets`, `/canonica/conversations`, `/canonica/feedback`, `/canonica/weekly-digest` |
| Widget & Hosted Help | Widget UI, low-level install/embed snippets, hosted help domain setup, allowed origins, blocked routes, and key security. Agent handoff and verification live in Install Center. | `/canonica/install-center`, `/canonica/widget/ui`, `/canonica/widget/install`, `/canonica/widget/hosted-help`, `/canonica/widget/access` |
| Team & Access | Workspace members and role permissions. | `/canonica/team/members`, `/canonica/team/roles` |
| Billing | Subscription and transaction history. | `/canonica/billing`, `/canonica/transactions` |
| Knowledge Governance | Product ontology, canonical answers, drift review, signal-to-knowledge queue, coverage, trust/readiness metrics. | `/canonica/governance/answers`, `/canonica/governance/entities`, `/canonica/governance/drift`, `/canonica/governance/signal-queue`, `/canonica/governance/trust` |

Management routes are gated by Canonica product scope or platform access. Client support routes can be exposed without giving users management access, but they should not be mixed into the owner sidebar. Management sessions that open customer shell routes are redirected to owner equivalents instead of rendering the end-user screens inside the dashboard.

---

## Implemented Feature Map

| Feature | Runtime status | Primary code | Data dependency | Product purpose |
| --- | --- | --- | --- | --- |
| Canonica public website | Implemented | `src/app/sites/canonica/` | Static site config, onboarding API | Self-sellable website for `canonica.app` / staging host, with product, use-case, demo, widget install, pricing, resources, updates, security, FAQ, legal, and onboarding pages. |
| Product website demo | Implemented | `src/app/sites/canonica/demo/` | Static demo data | Shows page-aware help, canonical answer, fallback, and gap flow without account setup. |
| Self-service onboarding | Implemented | `src/app/api/canonica/onboard/route.ts`, `src/app/sites/canonica/get-started/` | `users`, `stores`, `subscriptions`, `canonica_productSurfaces`, `platformSummary/contextContent_*` | Creates Canonica workspace and routes users to activation. Payment can stay manual/cash until paid flow is added. |
| Product details / workspace profile | Implemented | `src/app/api/canonica/workspace-profile/route.ts`, `src/components/templates/canonica/CanonicaSettings.tsx` | `stores/{sId}.canonicaWorkspaceProfile` | Stores product URL, support email, billing model, and initial product context. |
| Activation Command Center | Implemented | `src/app/(canonica)/canonica/activation/page.tsx`, `src/components/templates/canonica/activation/CanonicaActivationCommandCenter.tsx`, `src/components/templates/canonica/content/CanonicaContentWorkbench.tsx`, `src/components/templates/canonica/content/CanonicaCustomerFlowChecklist.tsx`, `src/lib/canonica/activationSummary.ts` | Compact store + `platformSummary` docs | Shows launch readiness, product-owner content workflow, and customer-path testing without scanning large collections at page load. |
| Product surfaces | Implemented | `src/components/templates/canonica/productSurfaces/CanonicaProductSurfaces.tsx`, `src/database/canonica/productSurfaces.ts`, `src/lib/canonica/productSurfaceContent*.ts` | `canonica_productSurfaces`, `platformSummary/contextContent_{tId}_{sId}` | Maps routes/pages/workflows to entities, tags, articles, changelogs, and tickets. |
| Content Control workbench | Implemented | `src/components/templates/canonica/content/CanonicaContentWorkbench.tsx`, `/canonica/activation`, `/canonica/dashboard` | Activation summary read model | Gives product owners one low-cost path into product profile, import, articles, surfaces, changelog, signal queue, widget, and tickets. |
| Surface Readiness matrix | Implemented | `src/components/templates/canonica/content/CanonicaSurfaceReadinessMatrix.tsx`, `src/lib/canonica/activationSummary.ts`, `/canonica/dashboard` | `platformSummary/contextContent_{tId}_{sId}` via activation summary | Shows which product areas are ready, missing mapping, missing content, or carrying open ticket signals using 0 extra dashboard reads. |
| Test-as-Customer checklist | Implemented | `src/components/templates/canonica/content/CanonicaCustomerFlowChecklist.tsx`, `/canonica/activation`, `/canonica/dashboard` | Activation summary read model | Gives product owners a launch-proof checklist for help center, widget, page context, ticket fallback, release notes, and Signal Queue. |
| Install Center | Implemented | `src/app/(canonica)/canonica/install-center/page.tsx`, `src/components/templates/canonica/install/CanonicaInstallCenter.tsx`, `src/lib/canonica/installContract/contract.ts`, `/api/canonica/widget-config`, `/api/canonica/widget-agent-kit` | Widget config/runtime status + optional activation summary | Keeps the AI install packet, current setup snapshot, framework snippets, public docs links, and verification checklist in one dashboard route. |
| Context-aware support mounting | Implemented | `src/components/templates/main-app/helpCenter/HeroSearchBar.tsx`, `src/lib/canonica/productSurfaceContent.ts`, `src/app/api/helpCenter/search-kb/route.ts`, widget APIs | Safe context payload + product surface summary | Passes page/feature/workflow context into Canonica without trusting raw client data as tenant scope. |
| Widget management | Implemented | `src/components/templates/canonica/widgetManagement/CanonicaWidgetManagement.tsx`, `src/app/api/canonica/widget-config/route.ts`, `src/app/api/canonica/widget-key/route.ts`, `src/app/api/canonica/widget-activity/route.ts`, `src/lib/canonica/widgetConfig.ts` | `stores/{sId}.canonicaWidgetConfig`, key hash fields, runtime status, `aiSearchHistory` widget rows | Configure appearance, install snippet, allowed origins, blocked routes, history, mobile visibility, runtime status, and recent widget questions. |
| Embedded public widget runtime | Implemented | `public/widget/canonica-widget.js`, `src/app/widget/[apiKey]/WidgetClient.tsx`, `src/app/api/widget/config/route.ts`, `src/app/api/widget/search/route.ts`, `src/app/api/widget/feedback/route.ts` | Store widget config, API key hash, AI search history with `mountContext`, KB/canonical retrieval | Gives client products page-aware support through one embeddable script. |
| Help center | Implemented | `src/app/(main)/help-center/`, `src/components/templates/main-app/helpCenter/`, `/canonica/help` compatibility route, `/api/canonica/public-content` | Cached KB, FAQ, changelog, tickets, search history | Public/customer support home reused by client support surfaces. It is not a primary owner dashboard navigation item; owners manage source content through KB, FAQ, Changelog, Tickets, Support Board, and Widget & Hosted Help. KB categories, article reads, FAQ lists, and changelog pages use tenant/store-tagged public cache with owner-write invalidation. |
| Feedback, ratings, and feature requests | Implemented | `src/components/templates/main-app/helpCenter/ShareFeedbackView.tsx`, `src/components/templates/main-app/helpCenter/FeatureRequests.tsx`, `src/components/templates/canonica/feedback/CanonicaFeedbackReview.tsx`, `src/database/feedback/index.ts`, `src/app/(canonica)/canonica/feedback/page.tsx`, `src/app/(main)/platform/feedback-admin/page.tsx`, `/canonica/help` | `feedback` in Canonica Firebase via `canonicaRequestBodyComposer`, `canonica_signalEvents(type='feedback')`, `canonica_supportBoardCards(sourceType='feedback')`, plus `article_feedback/{tId}/{sId}` and `changelog_feedback/{tId}/{sId}` | Customer help surfaces include a Share Feedback tab for ratings, product-area issues, feature requests, and suggestions. Owners review rows at `/canonica/feedback`; important feedback can be added directly to Support Board or synced as a signal, then turned into governed answer proposals after entity linking. |
| Hosted public Help Center | Implemented | `src/app/canonica-hosted-help/`, `src/components/templates/canonica/hostedHelp/`, `src/app/api/canonica/hosted-help-settings/route.ts`, `src/lib/canonica/hostedHelpServer.ts` | `stores/{sId}.hostedHelpConfig`, `canonica_publicHelpSites/{domain}`, cached KB/FAQ/changelog | Renders anonymous docs, FAQ, changelog, sitemap, and robots on domains such as `help.example.com` without exposing authenticated tickets/chat/user data. |
| Knowledge base explorer | Implemented | `src/app/(canonica)/canonica/docs/page.tsx`, `src/app/(canonica)/canonica/knowledge-base/page.tsx`, KB templates | `kb_categories`, `kb_articles` | Browse and manage support documentation. |
| KB generation pipeline | Implemented | `src/app/(canonica)/canonica/kb-generation/page.tsx`, `src/components/templates/platform/KBGeneration/`, `functions-canonica/src/logic/*` | `kb_generation_jobs`, `kb_articles`, `kb_categories`, storage | Upload, generate, review, publish, and embed KB content. |
| Product ontology | Implemented | `src/database/canonica/entities.ts`, `src/lib/canonica/entityExtraction.ts`, `src/components/templates/canonica/governance/EntityManagementDashboard.tsx` | `canonica_entities`, `canonica_entityRelations`, `canonica_entitySearchIndex`, `canonica_entityCandidates` | Models product features, plans, roles, workflows, states, integrations, and errors as first-class concepts. |
| Entity candidates | Implemented | `src/database/canonica/entityCandidates.ts`, `src/components/templates/canonica/EntityCandidateReview.tsx`, `functions-canonica/src/canonica/onboardingBootstrap.ts` | `canonica_entityCandidates` | Stages extracted concepts for human approval before becoming ontology entities. |
| Canonical answer engine | Implemented | `src/database/canonica/canonicalAnswers.ts`, `src/lib/canonica/canonicalRetrieval.ts`, `src/components/templates/canonica/governance/CanonicalAnswerEditor.tsx` | `canonica_canonicalAnswers`, entity search index, releases | Retrieves approved scoped answers before fallback. |
| Guided workflow answer model | Implemented but rollout-gated | `src/lib/canonica/procedureValidation.ts`, canonical answer types | `canonica_canonicalAnswers.content.procedure` | Adds ordered procedures, prerequisites, warnings, and action metadata to canonical answers. |
| Instant cache + freshness manifest | Implemented | `src/lib/canonica/instantCache.ts`, `src/lib/canonica/cacheFreshness.ts`, `src/lib/canonica/cacheVersion*.ts`, `functions-canonica/src/canonica/cacheVersionManifest.ts` | Upstash Redis when configured, `canonica_cacheVersions` | Caches repeated canonical hits while checking compact source versions instead of scanning source docs. |
| Compiled context distribution | Implemented | `src/lib/canonica/contextBundleBuilderServer.ts`, `src/lib/canonica/compiledContext.ts`, `src/app/api/canonica/bundles/*`, `functions-canonica/src/canonica/contextBundleBuilder.ts` | `platformSummary/sourceVersions_*`, `platformSummary/bundleManifest_*`, Firebase Storage `canonica-context/*` | Compiles approved read-heavy context into immutable public/private JSON bundles for widget, public API, MCP, and scheduler-safe serving. |
| Centralized scheduler | Implemented | `functions-canonica/src/canonica/canonicaMasterScheduler.ts`, `functions-canonica/src/canonica/schedulerTime.ts`, `functions-canonica/src/canonica/canonicaNightly.ts` | `platformSummary/canonicaTenantsSummary`, `platformSummary/canonicaSchedulerState`, `platformSummary/canonicaNightlyState_*`, `platformSummary/canonicaNightlyLock_*` | Keeps one scheduled Canonica export while filtering workspaces by local timezone/support-day end time and locking each workspace/date. |
| Drift governance | Implemented | `src/lib/canonica/driftDetection.ts`, `functions-canonica/src/canonica/canonicaNightly.ts`, `src/components/templates/canonica/governance/DriftDashboard.tsx` | canonical answers, entities, releases, signals | Flags version mismatch, signal anomaly, scope conflict, and deprecated entity drift. |
| Signal mutation engine | Implemented | `src/lib/canonica/signalEmitter.ts`, `functions-canonica/src/canonica/canonicaNightly.ts`, `src/components/templates/canonica/MutationProposalReview.tsx`; `src/lib/canonica/signalMutation.ts` is a reference/manual utility only | `canonica_signalEvents`, `canonica_mutationProposals` | Turns repeated tickets, negative feedback, feedback, fallback, and escalation signals into reviewable knowledge changes. Production clustering skips unresolved signals until a real entity is linked. |
| Auto knowledge drafts | Implemented with caps | `src/lib/canonica/draftGenerator.ts`, `functions-canonica/src/canonica/draftGenerator.ts`, `src/lib/canonica/draftPrompt.ts`, `src/components/templates/canonica/MutationProposalReview.tsx` | mutation proposals, entities, signals | Generates draft canonical answers for human review; queue UI supports publish, reject, and explicit generate/regenerate. Never auto-publishes authoritative content. |
| Support Board | Implemented with source sync gated | `src/app/(canonica)/canonica/support-board/page.tsx`, `src/components/templates/canonica/supportBoard/CanonicaSupportBoard.tsx`, `src/hooks/canonica/useSupportBoard.ts`, `src/database/canonica/supportBoard.ts`, `functions-canonica/src/canonica/supportBoardSync.ts` | `canonica_supportBoardCards`, `platformSummary/supportBoardSummary_*`, support tickets, `canonica_signalEvents`, mutation proposals | Private owner/staff Kanban for support gaps, internal notes, status history, Needs Answer workflow, and governed answer-proposal creation. Ticket/signal import and nightly signal-quality prep are implemented but disabled by default to avoid duplicating existing dashboards and Firebase work. |
| Ticket system | Implemented | `src/components/templates/main-app/helpCenter/TicketView.tsx`, `src/app/(canonica)/canonica/support/page.tsx`, `src/app/(canonica)/canonica/tickets/page.tsx` | support tickets collection | Provides ticket fallback and operator review path when content does not answer the user. |
| Ticket knowledge loop | Implemented and enabled with caps | `functions-canonica/src/canonica/resolutionExtractor.ts`, `src/lib/canonica/signalEmitter.ts` | resolved tickets, signals, mutation proposals | Extracts reusable knowledge from resolved ticket clusters after 3+ resolved tickets per entity. |
| Changelog / release notes | Implemented | `src/app/(canonica)/canonica/changelog/page.tsx`, `src/app/(canonica)/canonica/release-notes/page.tsx`, `src/database/canonica/releases.ts`, shared changelog templates | `canonica_releases`, shared changelog collection | Connects release changes to surfaces, tags, entities, and stale-answer review. |
| Weekly digest | Implemented | `src/app/(canonica)/canonica/weekly-digest/page.tsx`, `src/components/templates/canonica/weeklyDigest/CanonicaWeeklyDigest.tsx` | summary-backed support/governance data | Gives owners a review queue summary instead of forcing collection scans. |
| Founder trust/readiness metrics | Implemented | `src/database/canonica/trustMetrics.ts`, `src/components/templates/canonica/governance/FounderTrustDashboard.tsx`, `functions-canonica/src/canonica/canonicaNightly.ts` | `platformSummary/trustMetrics_{tId}_{sId}` | Summarizes coverage, resolution readiness, drift pressure, escalations, and top failing entities. |
| Coverage KPI | Implemented | `src/database/canonica/coverageKPI.ts`, `src/components/templates/canonica/CanonicaCoverageKPI.tsx`, nightly functions | `platformSummary/coverage_{tId}_{sId}` | Tracks canonical coverage without dashboard collection scans. |
| Product friction intelligence | Implemented and enabled with caps | `functions-canonica/src/canonica/frictionAggregation.ts`, `frictionInsight.ts`, `src/database/canonica/frictionStats.ts`, `FrictionTab.tsx` | `canonica_frictionDailyStats`, `platformSummary/friction*` | Aggregates recurring support friction and optional weekly insight generation from bounded nightly queries. |
| Public API v1 | Implemented but rollout-gated | `src/app/api/canonica/public/v1/answers`, `/entities`, `/signals`, `src/lib/canonica/publicApi.ts` | Public API keys, canonical retrieval, entities, signals | External product integration surface. Feature flag remains off until product rollout is intentional. |
| Email notifications | Implemented and enabled | `src/lib/notifications/`, `src/app/api/canonica/notifications/test/route.ts`, ticket DAL notification triggers | Ticket/event data, `canonica_notificationLogs` | Ticket-created/reply/status emails are fire-and-forget, rate-limited, logged in Canonica Firebase, and testable from Activation. |
| Widget branding | Implemented | `src/lib/canonica/widgetConfig.ts`, `CanonicaWidgetManagement.tsx`, `public/widget/canonica-widget.js`, `WidgetClient.tsx` | `stores/{sId}.widgetConfig` | Widget header title, accent color, greeting, launcher, and powered-by visibility are tenant-configurable without extra runtime reads. |
| Advanced white-label branding | Implemented but disabled by default | `src/database/canonica/branding.ts`, `WhiteLabelBranding.tsx` | `platformSummary/branding_{tId}_{sId}` | Broader KB/email branding controls remain guarded until all public support surfaces consume the same branding read model. |
| Multi-language articles | Implemented but disabled by default | `src/app/api/canonica/translate/route.ts`, `MultiLanguageArticles.tsx` | `kb_articles.translations` | Article translation workflow behind feature flag. |
| AI failure escalation | Implemented but disabled by default | `src/lib/canonica/escalationEvaluator.ts`, `escalationTypes.ts` | search/retrieval result metadata and signal events | Detects low-confidence or repeated failures that should become support escalation signals. |
| Separate Firebase/project support | Implemented | `src/lib/firebase/canonicaFirebase.ts`, `functions-canonica/src/firebaseAdmin.ts`, Canonica rules/indexes | Canonica Firebase app/admin config | Keeps Canonica data isolated from MenuList when `CANONICA_FIREBASE_MODE=separate`. |

---

## Route Map

### Public Canonica Website

- `/` on Canonica product hosts and `/__canonica` in local/dev rewrite mode.
- `/product`, `/product/launch-setup`, `/product/page-aware-widget`, `/product/support-control`, `/product/knowledge-governance`, `/product/knowledge-base`, `/product/faq-management`, `/product/changelog`, `/product/tickets`, `/use-cases`, `/demo`, `/install`, `/pricing`, `/resources`, `/updates`, `/get-started`, `/security`, `/faq`, `/about`, `/contact`.
- `/integrations` remains only as a redirect alias to `/install` for older links.
- `/privacy-policy`, `/terms-of-service`, `/robots.txt`, `/sitemap.xml`.
- Public website routes intentionally avoid root-level `/docs`, `/help`, `/changelog`, and `/release-notes` because those roots are dashboard/client-support routes on Canonica product hosts. Buyer-facing feature pages live under `/product/*`.

### Canonica Dashboard

- `/canonica` redirects by scope: management users to activation/dashboard, support-only users to client home/help.
- `/canonica/activation`, `/canonica/install-center`, `/canonica/settings`, `/canonica/kb-generation`, `/canonica/product-surfaces`, `/canonica/dashboard`.
- Direct customer/compatibility routes retained outside owner navigation: `/canonica/help`, `/canonica/docs`, `/canonica/release-notes`, `/canonica/support`.
- Owner Support Control routes: `/canonica/knowledge-base`, `/canonica/faqs`, `/canonica/changelog`, `/canonica/support-board`, `/canonica/tickets`, `/canonica/conversations`, `/canonica/feedback`, `/canonica/weekly-digest`.
- `/canonica/widget`, `/canonica/widget/[tab]` for UI, install, hosted help, and access/security subroutes.
- `/canonica/team`, `/canonica/team/[tab]` for members and roles subroutes.
- `/canonica/billing`, `/canonica/transactions`.
- `/canonica/governance`, and `/canonica/governance/[tab]` sidebar subroutes.

### Widget Runtime

- `/widget/[apiKey]` hosts the iframe/widget app.
- `/widget/canonica-widget.js` is the public embeddable script.
- `/api/widget/config`, `/api/widget/search`, `/api/widget/feedback` are public widget runtime endpoints protected by key hash and allowed-origin checks.
- `/api/canonica/widget-activity` is the protected dashboard read for recent widget questions.
- In separated Firebase mode, `cn_` widget/API key validation reads Canonica Firestore through `canonicaFirestoreAdmin` and fails closed if Canonica Admin credentials are missing. Widget runtime endpoints opt out of MenuList `publicApi` fallback, validate active keys through `stores.canonicaWidgetApi.keyHashes` with legacy `apiKeyHash` fallback, while MenuList public API endpoints only accept `ml_` keys.
- `/api/canonica/bundles/public/[...path]` proxies public-safe compiled bundle files from opaque Storage paths.

### MenuList Client Integration

- MenuList `/help-center` acts as a Canonica client route only when the signed-in user has `productAccounts.CN`.
- Client Help Center search, ticket creation, changelog/release-note reads, and Firebase Auth claim sync use the Canonica product account `tId/sId`; the originating MenuList product scope is retained in Canonica `sourceContext`.
- This integration is product-account driven. There is no dedicated MenuList client-test flag, one-off widget host, or fallback to MenuList Firebase for Canonica-owned support data.

### Protected Canonica APIs

- Canonica dashboard routes wait for `ensureFirebaseAuthForSession()` before mounting Firestore-backed children, so separate Firebase reads/listeners use Canonica Auth claims rather than stale MenuList/default Firebase Auth state. Platform/support users keep their platform claims even when the same email also has a tenant-level Canonica account.
- `/api/canonica/onboard`
- `/api/canonica/workspace-profile`
- `/api/canonica/activation/summary`
- `/api/canonica/operations/status`
- `/api/canonica/widget-config`
- `/api/canonica/widget-key`
- `/api/canonica/product-surfaces/rebuild-summary`
- `/api/canonica/bundles/rebuild`
- `/api/canonica/mcp/session`
- `/api/canonica/mcp`
- `/api/canonica/tenant-summary`
- `/api/canonica/translate`

### Public API v1

- `/api/canonica/public/v1/answers`
- `/api/canonica/public/v1/entities`
- `/api/canonica/public/v1/signals`

These routes exist, validate API scope, and are controlled by `ENABLE_CANONICA_PUBLIC_API`.

---

## Backend and Scheduler Map

| Backend unit | Trigger | Purpose | Cost posture |
| --- | --- | --- | --- |
| `canonicaNightly` | Scheduled Cloud Function | Compatibility export for the centralized Canonica scheduler. Runs hourly and delegates to `runCanonicaMasterScheduler()`. | Reads `platformSummary/canonicaTenantsSummary`, filters by workspace-local EOD, then runs governance only for due tenants. |
| `triggerCanonicaNightly` | HTTP manual trigger with secret | Manual recovery path for the same centralized scheduler. | Uses the same task registry and locks as scheduled runs, with force-all tenant processing for recovery. |
| `/api/canonica/operations/status` | Protected owner API | Activation Daily Governance panel status. | Reads one store doc, two platformSummary docs, and five capped scheduler logs; filters run logs to the current workspace. |
| `embedArticleWorker` | Cloud Tasks | Generates/stores KB article embeddings after article generation. | Async work, separated from UI. |
| `regenerateEmbedding` | Callable | Manual article embedding regeneration. | Admin/protected callable; expensive only on demand. |
| `publishApprovedJobFn` | Callable | Publishes reviewed KB generation job output. | Transactional publishing and cache version bump. |
| `contextBundleBuilder` | Nightly task inside `canonicaNightly` plus owner-triggered API | Repairs stale compiled context bundles after source-version changes. | Reads bounded approved sources only when stale; runtime paths use Storage/server cache instead of collection fanout. |

---

## Firebase Collections and Summary Docs

### Canonica-owned collections

- `canonica_entities`
- `canonica_entityRelations`
- `canonica_canonicalAnswers`
- `canonica_releases`
- `canonica_mutationProposals`
- `canonica_signalEvents`
- `canonica_auditLogs`
- `canonica_entitySearchIndex`
- `canonica_entityCandidates`
- `canonica_frictionDailyStats`
- `canonica_schedulerRunLogs`
- `platformSummary/canonicaSchedulerState`
- `platformSummary/canonicaSchedulerTaskLock_*`
- `platformSummary/canonicaNightlyState_*`
- `platformSummary/canonicaNightlyLock_*`
- `canonica_aiOperations`
- `canonica_cacheVersions`
- `canonica_notificationLogs`
- `canonica_productSurfaces`

### Shared support collections used by Canonica surfaces

- `kb_articles`
- `kb_categories`
- `kb_generation_jobs`
- `menuImageProcessingJobs`
- `aiSearchHistory`
- support ticket/changelog collections used by shared Help Center and product-surface summaries

### Compact summary docs

- `platformSummary/canonicaTenantsSummary`
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

- `ENABLE_CANONICA_ONTOLOGY`
- `ENABLE_CANONICA_CANONICAL_ANSWERS`
- `ENABLE_CANONICA_DRIFT_DETECTION`
- `ENABLE_CANONICA_SIGNAL_MUTATION`
- `ENABLE_CANONICA_WIDGET`
- `ENABLE_CANONICA_ACTIVATION_COMMAND_CENTER`
- `ENABLE_CANONICA_WEEKLY_DIGEST`
- `ENABLE_CANONICA_GOVERNANCE_UI`
- `ENABLE_CANONICA_CONTEXT_AWARE`
- `ENABLE_CANONICA_PRODUCT_SURFACES`
- `ENABLE_CANONICA_INSTANT_CACHE`
- `ENABLE_CANONICA_AUTO_KNOWLEDGE`
- `ENABLE_CANONICA_NOTIFICATIONS`
- `ENABLE_CANONICA_FRICTION_INTELLIGENCE`
- `ENABLE_CANONICA_TICKET_KNOWLEDGE`
- `ENABLE_CANONICA_FOUNDER_ONBOARDING`
- `ENABLE_CANONICA_TRUST_METRICS`
- `ENABLE_CANONICA_CONTEXT_BUNDLES`
- `ENABLE_CANONICA_BUNDLE_BUILDER`
- `ENABLE_CANONICA_WIDGET_BUNDLE_BOOTSTRAP`
- `ENABLE_CANONICA_PUBLIC_API_BUNDLE_READS`

### Disabled / rollout-gated by default

- `ENABLE_CANONICA_PUBLIC_API`
- `ENABLE_CANONICA_SIGNAL_QUALITY`
- `ENABLE_CANONICA_WHITE_LABEL`
- `ENABLE_CANONICA_MULTI_LANGUAGE`
- `ENABLE_CANONICA_GUIDED_WORKFLOWS`
- `ENABLE_CANONICA_AI_ESCALATION`
- `ENABLE_CANONICA_MCP`

### Enabled in Cloud Functions by default

- `ENABLE_CANONICA_NIGHTLY`
- `ENABLE_CANONICA_AUTO_KNOWLEDGE`
- `ENABLE_CANONICA_FRICTION_INTELLIGENCE`
- `ENABLE_CANONICA_TICKET_KNOWLEDGE`
- `ENABLE_CANONICA_TRUST_METRICS`
- `ENABLE_CANONICA_FOUNDER_ONBOARDING`
- `ENABLE_CANONICA_CONTEXT_BUNDLES`
- `ENABLE_CANONICA_BUNDLE_BUILDER`

Enabled nightly intelligence loops are capped and summary-backed. Predictive support, workflow notifications, and knowledge graph traversal are active expansion paths and must stay guarded by cooldown storage, event caps, sanitized delivery payloads, and compact `platformSummary` reads.

---

## Public Website Truth

The Canonica website can safely claim these implemented capabilities:

- Page-aware support through product surfaces and widget context.
- Product ontology, canonical answer engine, drift governance, and signal mutation.
- Launch setup with workspace profile, knowledge import, product surfaces, widget install, and activation readiness.
- Help center, KB, changelog/release notes, tickets, feedback, ratings, feature requests, and widget as support surfaces.
- Summary-backed coverage/readiness/trust metrics.
- Cost-conscious scheduler and dashboard design using compact summary docs.
- Compiled context bundles as the permanent read distribution layer for approved widget/API/MCP context.
- Widget install, allowed origins, blocked routes, runtime verification, safe page context, and tenant-level widget branding as the default client integration path.
- Ticket notification delivery readiness with test-send verification and Canonica-scoped failure logs.
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

Core Canonica flows are implemented and documented enough for staging use:

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
- multi-language
- advanced cross-surface white-label branding

Those features remain behind intentional rollout controls and should stay conservative in website copy unless enabled for a client.

---

## Implemented-But-Hidden Audit — 2026-05-22

This pass checked route constants, Canonica dashboard pages, governance tabs, APIs, widget runtime/config, DAL modules, Cloud Functions, and the feature map for code that existed but was not practically exposed.

Findings:

- Dashboard route constants and `/canonica/*` page files are aligned: no route constant is missing a page, and no page is missing a route constant.
- Ticket browser-log capture was implemented in DAL/types/modal but was not fully exposed. The runtime now starts sanitized last-5 browser-log capture for authenticated app sessions, ticket creation clears logs only after a successful write, and platform ticket details expose a Logs button.
- Auto-knowledge manual draft regeneration was implemented in `src/lib/canonica/draftGenerator.ts` but not reachable from the Signal-to-Knowledge Queue. The queue now exposes explicit Generate/Regenerate actions, preserves the one-click human review model, and shows draft evidence/context.
- `src/lib/canonica/signalMutation.ts` is a reference/manual utility, not the production batch path. The production mutation pipeline remains in `functions-canonica/src/canonica/canonicaNightly.ts` to avoid broad client-side signal scans.
- Widget blocked routes, allowed origins, mobile visibility, history mode, and remote runtime config are wired in both management UI and public widget loader.

Intentional rollout-gated features still found in code:

- Public API v1
- Multi-language articles
- Advanced cross-surface white-label branding
- AI escalation

These should not be enabled merely because code exists. They add integration surface, AI cost, scheduler work, or client-facing scope, so they remain behind `ENABLE_CANONICA_*` flags until a product rollout decision enables them.

Launch-hardening changes enabled in the 2026-05-22 pass:

- Ticket/email notification verification is enabled and visible in Activation.
- Widget install/runtime verification remains in Activation and is centralized in `/canonica/install-center`; `/canonica/widget/install` keeps low-level snippets/settings handoff and links to Install Center. Branding controls include header title and powered-by visibility.
- Signal-to-Knowledge Queue manual draft generation/regeneration remains reachable from governance.
- Ticket browser-log capture stays on ticket creation and is visible in ticket details.
- Ticket-to-knowledge extraction and product friction intelligence are enabled with nightly caps.
- Basic usage/readiness stays summary-backed; raw cache/cost/internal logs are not exposed to Canonica clients.
- Product-owner content management is now surfaced as a single Content Control workbench on Activation and Readiness Metrics. It links profile, import, articles, product surfaces, changelog, signal queue, widget, and tickets from the existing summary read model instead of adding new dashboard reads.
- Surface Readiness and Test-as-Customer projections now tell owners which product areas are ready, what to test before launch, and where repeated ticket signals need review, all from the existing activation summary.
- Ticket details now include operator-only Knowledge Loop guidance so resolved tickets can become reviewed knowledge proposals without adding a new ticket workflow.
- Knowledge Base, article editor, changelog, and Signal-to-Knowledge Queue were tightened for mobile/product-owner use: stacked mobile content panes, responsive article modal, mobile changelog actions, clearer empty states, and less internal technical wording.
