# Canonica System Inventory

> **Status:** Codebase-first inventory  
> **Last Updated:** 2026-05-21  
> **Source of Truth:** Runtime code, routes, constants, data-access modules, Cloud Functions, Firebase rules/indexes, then existing docs  
> **Product Boundary:** Canonica is a separate product. MenuList is only a client/test host and shared codebase neighbor.

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

## Canonica Operating Model

Canonica is organized around three client modes:

| Mode | What it owns | Implemented routes |
| --- | --- | --- |
| Launch Setup | Subscription/workspace activation, product details, starter knowledge import, product surface mapping, widget install, install verification. | `/canonica/activation`, `/canonica/settings`, `/canonica/kb-generation`, `/canonica/product-surfaces`, `/canonica/widget` |
| Support Control | Customer-facing support surfaces and day-to-day support operations. | `/canonica/help`, `/canonica/docs`, `/canonica/release-notes`, `/canonica/knowledge-base`, `/canonica/changelog`, `/canonica/tickets`, `/canonica/conversations`, `/canonica/weekly-digest` |
| Knowledge Governance | Product ontology, canonical answers, drift review, signal-to-knowledge queue, coverage, trust/readiness metrics. | `/canonica/dashboard`, `/canonica/governance`, `/canonica/governance?tab=signal-queue` |

Management routes are gated by Canonica product scope or platform access. Client support routes can be exposed without giving users management access.

---

## Implemented Feature Map

| Feature | Runtime status | Primary code | Data dependency | Product purpose |
| --- | --- | --- | --- | --- |
| Canonica public website | Implemented | `src/app/sites/canonica/` | Static site config, onboarding API | Self-sellable website for `canonica.app` / staging host, with product, use-case, demo, widget install, pricing, resources, updates, security, FAQ, legal, and onboarding pages. |
| Product website demo | Implemented | `src/app/sites/canonica/demo/` | Static demo data | Shows page-aware help, canonical answer, fallback, and gap flow without account setup. |
| Self-service onboarding | Implemented | `src/app/api/canonica/onboard/route.ts`, `src/app/sites/canonica/get-started/` | `users`, `stores`, `subscriptions`, `canonica_productSurfaces`, `platformSummary/contextContent_*` | Creates Canonica workspace and routes users to activation. Payment can stay manual/cash until paid flow is added. |
| Product details / workspace profile | Implemented | `src/app/api/canonica/workspace-profile/route.ts`, `src/components/templates/canonica/CanonicaSettings.tsx` | `stores/{sId}.canonicaWorkspaceProfile` | Stores product URL, support email, billing model, and initial product context. |
| Activation Command Center | Implemented | `src/app/(canonica)/canonica/activation/page.tsx`, `src/components/templates/canonica/activation/CanonicaActivationCommandCenter.tsx`, `src/lib/canonica/activationSummary.ts` | Compact store + `platformSummary` docs | Shows launch readiness without scanning large collections at page load. |
| Product surfaces | Implemented | `src/components/templates/canonica/productSurfaces/CanonicaProductSurfaces.tsx`, `src/database/canonica/productSurfaces.ts`, `src/lib/canonica/productSurfaceContent*.ts` | `canonica_productSurfaces`, `platformSummary/contextContent_{tId}_{sId}` | Maps routes/pages/workflows to entities, tags, articles, changelogs, and tickets. |
| Context-aware support mounting | Implemented | `src/components/templates/main-app/helpCenter/HeroSearchBar.tsx`, `src/lib/canonica/productSurfaceContent.ts`, `src/app/api/helpCenter/search-kb/route.ts`, widget APIs | Safe context payload + product surface summary | Passes page/feature/workflow context into Canonica without trusting raw client data as tenant scope. |
| Widget management | Implemented | `src/components/templates/canonica/widgetManagement/CanonicaWidgetManagement.tsx`, `src/app/api/canonica/widget-config/route.ts`, `src/app/api/canonica/widget-key/route.ts`, `src/lib/canonica/widgetConfig.ts` | `stores/{sId}.canonicaWidgetConfig`, key hash fields, runtime status | Configure appearance, install snippet, allowed origins, blocked routes, history, mobile visibility, and runtime status. |
| Embedded public widget runtime | Implemented | `public/widget/canonica-widget.js`, `src/app/widget/[apiKey]/WidgetClient.tsx`, `src/app/api/widget/config/route.ts`, `src/app/api/widget/search/route.ts`, `src/app/api/widget/feedback/route.ts` | Store widget config, API key hash, AI search history, KB/canonical retrieval | Gives client products page-aware support through one embeddable script. |
| Help center | Implemented | `src/app/(main)/help-center/`, `src/components/templates/main-app/helpCenter/`, `/canonica/help` compatibility route | KB, tickets, changelog, search history | Public/customer support home reused by client support surfaces. |
| Knowledge base explorer | Implemented | `src/app/(canonica)/canonica/docs/page.tsx`, `src/app/(canonica)/canonica/knowledge-base/page.tsx`, KB templates | `kb_categories`, `kb_articles` | Browse and manage support documentation. |
| KB generation pipeline | Implemented | `src/app/(canonica)/canonica/kb-generation/page.tsx`, `src/components/templates/platform/KBGeneration/`, `functions-canonica/src/logic/*` | `kb_generation_jobs`, `kb_articles`, `kb_categories`, storage | Upload, generate, review, publish, and embed KB content. |
| Product ontology | Implemented | `src/database/canonica/entities.ts`, `src/lib/canonica/entityExtraction.ts`, `src/components/templates/canonica/governance/EntityManagementDashboard.tsx` | `canonica_entities`, `canonica_entityRelations`, `canonica_entitySearchIndex`, `canonica_entityCandidates` | Models product features, plans, roles, workflows, states, integrations, and errors as first-class concepts. |
| Entity candidates | Implemented | `src/database/canonica/entityCandidates.ts`, `src/components/templates/canonica/EntityCandidateReview.tsx`, `functions-canonica/src/canonica/onboardingBootstrap.ts` | `canonica_entityCandidates` | Stages extracted concepts for human approval before becoming ontology entities. |
| Canonical answer engine | Implemented | `src/database/canonica/canonicalAnswers.ts`, `src/lib/canonica/canonicalRetrieval.ts`, `src/components/templates/canonica/governance/CanonicalAnswerEditor.tsx` | `canonica_canonicalAnswers`, entity search index, releases | Retrieves approved scoped answers before fallback. |
| Guided workflow answer model | Implemented but rollout-gated | `src/lib/canonica/procedureValidation.ts`, canonical answer types | `canonica_canonicalAnswers.content.procedure` | Adds ordered procedures, prerequisites, warnings, and action metadata to canonical answers. |
| Instant cache + freshness manifest | Implemented | `src/lib/canonica/instantCache.ts`, `src/lib/canonica/cacheFreshness.ts`, `src/lib/canonica/cacheVersion*.ts`, `functions-canonica/src/canonica/cacheVersionManifest.ts` | Upstash Redis when configured, `canonica_cacheVersions` | Caches repeated canonical hits while checking compact source versions instead of scanning source docs. |
| Drift governance | Implemented | `src/lib/canonica/driftDetection.ts`, `functions-canonica/src/canonica/canonicaNightly.ts`, `src/components/templates/canonica/governance/DriftDashboard.tsx` | canonical answers, entities, releases, signals | Flags version mismatch, signal anomaly, scope conflict, and deprecated entity drift. |
| Signal mutation engine | Implemented | `src/lib/canonica/signalEmitter.ts`, `src/lib/canonica/signalMutation.ts`, `functions-canonica/src/canonica/canonicaNightly.ts`, `src/components/templates/canonica/MutationProposalReview.tsx` | `canonica_signalEvents`, `canonica_mutationProposals` | Turns repeated tickets, negative feedback, fallback, and escalation signals into reviewable knowledge changes. |
| Auto knowledge drafts | Implemented with caps | `src/lib/canonica/draftGenerator.ts`, `functions-canonica/src/canonica/draftGenerator.ts`, `src/lib/canonica/draftPrompt.ts` | mutation proposals, entities, signals | Generates draft canonical answers for human review; never auto-publishes as authoritative content. |
| Ticket system | Implemented | `src/components/templates/main-app/helpCenter/TicketView.tsx`, `src/app/(canonica)/canonica/support/page.tsx`, `src/app/(canonica)/canonica/tickets/page.tsx` | support tickets collection | Provides ticket fallback and operator review path when content does not answer the user. |
| Ticket knowledge loop | Implemented but disabled by server flag | `functions-canonica/src/canonica/resolutionExtractor.ts`, `src/lib/canonica/signalEmitter.ts` | resolved tickets, signals, mutation proposals | Extracts reusable knowledge from resolved ticket clusters when enabled. |
| Changelog / release notes | Implemented | `src/app/(canonica)/canonica/changelog/page.tsx`, `src/app/(canonica)/canonica/release-notes/page.tsx`, `src/database/canonica/releases.ts`, shared changelog templates | `canonica_releases`, shared changelog collection | Connects release changes to surfaces, tags, entities, and stale-answer review. |
| Weekly digest | Implemented | `src/app/(canonica)/canonica/weekly-digest/page.tsx`, `src/components/templates/canonica/weeklyDigest/CanonicaWeeklyDigest.tsx` | summary-backed support/governance data | Gives owners a review queue summary instead of forcing collection scans. |
| Founder trust/readiness metrics | Implemented | `src/database/canonica/trustMetrics.ts`, `src/components/templates/canonica/governance/FounderTrustDashboard.tsx`, `functions-canonica/src/canonica/canonicaNightly.ts` | `platformSummary/trustMetrics_{tId}_{sId}` | Summarizes coverage, resolution readiness, drift pressure, escalations, and top failing entities. |
| Coverage KPI | Implemented | `src/database/canonica/coverageKPI.ts`, `src/components/templates/canonica/CanonicaCoverageKPI.tsx`, nightly functions | `platformSummary/coverage_{tId}_{sId}` | Tracks canonical coverage without dashboard collection scans. |
| Product friction intelligence | Implemented but disabled by server flag | `functions-canonica/src/canonica/frictionAggregation.ts`, `frictionInsight.ts`, `src/database/canonica/frictionStats.ts`, `FrictionTab.tsx` | `canonica_frictionDailyStats`, `platformSummary/friction*` | Aggregates recurring support friction and optional weekly insight generation. |
| Predictive support | Implemented but disabled by default | `src/lib/canonica/predictiveEngine.ts`, `functions-canonica/src/canonica/predictiveTriggerSync.ts`, `PredictiveTriggerManager.tsx` | `canonica_predictiveTriggers`, `platformSummary/predictiveTriggers_*` | Suggests contextual help before the user asks when trigger rules match. |
| Knowledge graph traversal | Implemented but disabled by default | `src/lib/canonica/graphTraversal.ts`, nightly graph rebuild | `platformSummary/entityGraphIndex_*`, `canonica_entityRelations` | Expands answers through related ontology nodes when enabled. |
| Public API v1 | Implemented but rollout-gated | `src/app/api/canonica/public/v1/answers`, `/entities`, `/signals`, `src/lib/canonica/publicApi.ts` | Public API keys, canonical retrieval, entities, signals | External product integration surface. Feature flag remains off until product rollout is intentional. |
| Workflow integrations | Implemented but disabled by server flag | `functions-canonica/src/integrations/` | `canonica_integrationEvents`, `canonica_integrationDeliveryLogs`, integration config summary doc | Emits governance events to Slack, Email, Linear, and GitHub when enabled. |
| Email notifications | Documented and partially represented | `__docs__/canonica/email-notifications/`, notification flags | Ticket/event data | Product direction exists; default flag is off. Keep website claims conservative. |
| White-label branding | Implemented but disabled by default | `src/database/canonica/branding.ts`, `WhiteLabelBranding.tsx` | `platformSummary/branding_{tId}_{sId}` | Tenant branding controls for support surfaces when enabled. |
| Multi-language articles | Implemented but disabled by default | `src/app/api/canonica/translate/route.ts`, `MultiLanguageArticles.tsx` | `kb_articles.translations` | Article translation workflow behind feature flag. |
| AI failure escalation | Implemented but disabled by default | `src/lib/canonica/escalationEvaluator.ts`, `escalationTypes.ts` | search/retrieval result metadata and signal events | Detects low-confidence or repeated failures that should become support escalation signals. |
| Separate Firebase/project support | Implemented | `src/lib/firebase/canonicaFirebase.ts`, `functions-canonica/src/firebaseAdmin.ts`, Canonica rules/indexes | Canonica Firebase app/admin config | Keeps Canonica data isolated from MenuList when `CANONICA_FIREBASE_MODE=separate`. |

---

## Route Map

### Public Canonica Website

- `/` on Canonica product hosts and `/__canonica` in local/dev rewrite mode.
- `/product`, `/use-cases`, `/demo`, `/install`, `/pricing`, `/resources`, `/updates`, `/get-started`, `/security`, `/faq`, `/about`, `/contact`.
- `/integrations` remains only as a redirect alias to `/install` for older links.
- `/privacy-policy`, `/terms-of-service`, `/robots.txt`, `/sitemap.xml`.
- Public website routes intentionally avoid `/docs`, `/help`, `/changelog`, and `/release-notes` because those roots are dashboard/client-support routes on Canonica product hosts.

### Canonica Dashboard

- `/canonica` redirects by scope: management users to activation/dashboard, support-only users to client home/help.
- `/canonica/activation`, `/canonica/settings`, `/canonica/kb-generation`, `/canonica/product-surfaces`, `/canonica/widget`.
- `/canonica/help`, `/canonica/docs`, `/canonica/release-notes`, `/canonica/support`.
- `/canonica/knowledge-base`, `/canonica/changelog`, `/canonica/tickets`, `/canonica/conversations`, `/canonica/weekly-digest`.
- `/canonica/dashboard`, `/canonica/governance` and governance tabs.

### Widget Runtime

- `/widget/[apiKey]` hosts the iframe/widget app.
- `/widget/canonica-widget.js` is the public embeddable script.
- `/api/widget/config`, `/api/widget/search`, `/api/widget/feedback` are public widget runtime endpoints protected by key hash and allowed-origin checks.

### Protected Canonica APIs

- `/api/canonica/onboard`
- `/api/canonica/workspace-profile`
- `/api/canonica/activation/summary`
- `/api/canonica/widget-config`
- `/api/canonica/widget-key`
- `/api/canonica/product-surfaces/rebuild-summary`
- `/api/canonica/tenant-summary`
- `/api/canonica/translate`
- `/api/canonica/predictive-help`

### Public API v1

- `/api/canonica/public/v1/answers`
- `/api/canonica/public/v1/entities`
- `/api/canonica/public/v1/signals`

These routes exist, validate API scope, and are controlled by `ENABLE_CANONICA_PUBLIC_API`.

---

## Backend and Scheduler Map

| Backend unit | Trigger | Purpose | Cost posture |
| --- | --- | --- | --- |
| `canonicaNightly` | Scheduled Cloud Function | Runs drift, signal mutation, coverage, trust metrics, optional friction, optional graph, optional ticket knowledge, optional predictive sync, optional integrations. | Uses `platformSummary/canonicaTenantsSummary` before legacy discovery; logs structured run results. |
| `triggerCanonicaNightly` | HTTP manual trigger with secret | Manual backfill/recovery for scheduler work. | Supports tenant/store targeting and dry-run style diagnostics. |
| `embedArticleWorker` | Cloud Tasks | Generates/stores KB article embeddings after article generation. | Async work, separated from UI. |
| `regenerateEmbedding` | Callable | Manual article embedding regeneration. | Admin/protected callable; expensive only on demand. |
| `publishApprovedJobFn` | Callable | Publishes reviewed KB generation job output. | Transactional publishing and cache version bump. |
| `processIntegrationEvent` | Firestore create trigger | Delivers enabled integration events. | Integration flags and config gate delivery. |

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
- `canonica_aiOperations`
- `canonica_cacheVersions`
- `canonica_integrationEvents`
- `canonica_integrationDeliveryLogs`
- `canonica_predictiveTriggers`
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
- `platformSummary/entityGraphIndex_{tId}_{sId}`
- `platformSummary/predictiveTriggers_{tId}_{sId}`

Dashboard and scheduler flows should prefer summary docs over scanning growing collections.

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
- `ENABLE_CANONICA_FOUNDER_ONBOARDING`
- `ENABLE_CANONICA_TRUST_METRICS`

### Disabled / rollout-gated by default

- `ENABLE_CANONICA_PUBLIC_API`
- `ENABLE_CANONICA_NOTIFICATIONS`
- `ENABLE_CANONICA_SIGNAL_QUALITY`
- `ENABLE_CANONICA_WHITE_LABEL`
- `ENABLE_CANONICA_MULTI_LANGUAGE`
- `ENABLE_CANONICA_GUIDED_WORKFLOWS`
- `ENABLE_CANONICA_FRICTION_INTELLIGENCE`
- `ENABLE_CANONICA_WORKFLOW_INTEGRATIONS`
- `ENABLE_CANONICA_AI_ESCALATION`
- `ENABLE_CANONICA_TICKET_KNOWLEDGE`
- `ENABLE_CANONICA_KNOWLEDGE_GRAPH`
- `ENABLE_CANONICA_PREDICTIVE_SUPPORT`

### Enabled in Cloud Functions by default

- `ENABLE_CANONICA_NIGHTLY`
- `ENABLE_CANONICA_AUTO_KNOWLEDGE`
- `ENABLE_CANONICA_TRUST_METRICS`
- `ENABLE_CANONICA_FOUNDER_ONBOARDING`

Higher-cost or integration-heavy server features stay disabled until explicitly enabled.

---

## Public Website Truth

The Canonica website can safely claim these implemented capabilities:

- Page-aware support through product surfaces and widget context.
- Product ontology, canonical answer engine, drift governance, and signal mutation.
- Launch setup with workspace profile, knowledge import, product surfaces, widget install, and activation readiness.
- Help center, KB, changelog/release notes, tickets, and widget as support surfaces.
- Summary-backed coverage/readiness/trust metrics.
- Cost-conscious scheduler and dashboard design using compact summary docs.
- Widget install, allowed origins, blocked routes, runtime verification, and safe page context as the default client integration path.

The website should not claim:

- Enterprise helpdesk replacement.
- CRM, task management, project management, or full customer support inbox replacement.
- Fully automated publishing without owner review.
- Always-on email/workflow integrations unless the relevant flags and production config are enabled.
- Public API or workflow adapters as default package features while their rollout flags remain disabled.
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

The following remain intentional rollout controls:

- public API
- workflow integrations
- predictive support
- ticket knowledge extraction
- friction intelligence
- knowledge graph traversal
- multi-language
- white-label branding
- notifications

Those features exist in code but should stay conservative in website copy unless enabled for a client.
