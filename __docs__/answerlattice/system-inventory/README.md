# Answerlattice System Inventory

> **Status:** Codebase-first inventory  
> **Last Updated:** 2026-08-15
> **Source of Truth:** Runtime code, routes, constants, data-access modules, Cloud Functions, Firebase rules/indexes, then existing docs  
> **Product Boundary:** Answerlattice is a separate product. MenuList is one independent client integration and shared codebase neighbor.

---

## Purpose

This folder records what Answerlattice actually implements today. It exists because the older Answerlattice docs were created feature-by-feature, while the product is now a connected system: website, onboarding, dashboard, help center, widget, public API, governance engine, scheduler, and Firebase isolation.

Use this inventory before changing Answerlattice website copy, onboarding, dashboard navigation, Firebase rules, scheduler behavior, widget runtime, or support flows.

The strict feature-by-feature hardening order and completion evidence are maintained in [answerlattice-feature-flow-audit-tracker.md](./answerlattice-feature-flow-audit-tracker.md). That ledger freezes the 44 feature flows and separates local source completion from deployment, provider, browser, device, DNS, IAM, and production proof. All 44 flows completed the local audit order on July 20, 2026; the final C1-C8 result was refreshed on July 26 after the Feature 3 Source Governance hardening overlay, and the remaining release evidence is recorded in [answerlattice-final-cross-cutting-audit.md](./answerlattice-final-cross-cutting-audit.md).

Completed feature dossiers are maintained beside their runtime domain. Feature 1 is documented in [Canonical Answer Governance](../canonical-answer-governance/README.md), including proposal-only writes, scope/version semantics, revision protection, Firestore cost, responsive behavior, public-claim boundaries, and focused tests. Feature 2 is documented in [Answer Retrieval Quality](../answer-retrieval-quality/README.md). Feature 3 uses the maintained [Knowledge Intake Command Center](../knowledge-intake-command-center/README.md) dossier, reconciled to current multi-source evidence, destination lineage, privacy, retrieval, and lifecycle boundaries, plus the default-off [Source Governance](../source-governance/README.md) overlay for human-declared authority, access, citation, applicability, conflicts, audit, and canonical evidence gates. Feature 4 uses the maintained [KB Generation Pipeline](../kb-generation-pipeline/README.md) dossier, reconciled to inactive staging, atomic publication, replacement continuity, embedding settlement, and reference-aware source cleanup. Feature 29 is documented in [Workspace Profile](../workspace-profile/README.md), including strict field and response contracts, exact scope, stale-editor protection, atomic scheduler/runtime synchronization, cost, responsive parity, and focused emulator proof. Feature 30 is documented in [Answerlattice Billing](../billing/README.md), including minimal checkout responses, product-scoped read queries, dedicated/shared rules, provider-hosted URL admission, entitlement/recovery boundaries, cost, and external Razorpay evidence limits. Feature 31 is documented in [Staff Access Control](../staff-access-control/README.md), including multi-workspace membership authority, selected-workspace claims, concurrent role convergence, token-expiry limits, Firebase cost, responsive parity, and focused emulator/contract proof. Feature 32 is documented across [Weekly Digest](../weekly-digest/README.md), [Founder Daily Brief](../founder-daily-brief/README.md), and [Owner Support Assistant](../owner-support-assistant/README.md), including deterministic schedule/manual refresh, strict six-summary health, permission-filtered guidance, and no-provider/no-autonomous-mutation boundaries. Feature 39 is documented in [Advanced White Label](../advanced-white-label/README.md), including strict private-profile validation, exact scope, unsafe styling rejection, working-widget separation, and the explicit absence of customer delivery. Feature 40 is documented in [AI Failure Escalation](../ai-failure-escalation/README.md), separating the active server-authoritative widget fallback from the bounded, default-off automatic evaluator and its missing Help Chat handoff. Feature 41 is documented in [Native Knowledge Intake Connectors](../native-knowledge-intake-connectors/README.md), covering the rollout-gated GitHub Change Intake, verified installation ownership, selected repository scope, signed webhook delivery, compact Firebase routing, and existing governed Knowledge Intake reuse. Feature 42 is documented in [Signal-Quality Scoring](../signal-quality-scoring/README.md), preserving transparent evidence counts and requiring real reviewed-proposal calibration evidence before any ranking is built. Feature 43 is documented in [Native Helpdesk and Jira Connectors](../native-helpdesk-and-jira-connectors/README.md), preserving export-first intake and requiring one-provider paying-client, permission, deletion, cost, and concierge-proof evidence before implementation. Feature 44 is documented in [Autonomous Browser and Account-Changing Actions](../autonomous-browser-and-account-actions/README.md), preserving Explain + Guide behavior and prohibiting host clicks, arbitrary execution, and account mutation.

As of the June 27, 2026 hardening pass, all route files under `src/app/api/answerlattice`, `src/app/api/widget`, and `src/app/api/helpCenter`, plus adjacent Answerlattice routes under `src/app/api/revalidate/answerlattice` and `src/app/api/platform/answerlattice-intake`, use bounded request-body readers. As of the June 28 continuation audit, protected dashboard reads for Activation Summary, Widget Activity, Knowledge Intake entity autocomplete, and the platform Answerlattice Intake monitor apply shared `DATA_READ` gates before protected/platform Firestore read fanout. As of the June 29 continuation audit, Answerlattice app-side protected read/action/AI/onboarding/intake/staff limiter keys use HMAC-hashed user, tenant, store, actor, and fallback request-IP segments through `src/lib/answerlattice/rateLimitKeys.ts`; raw identity values stay out of Upstash key names while limits, windows, and admission order remain unchanged. As of the June 30 security-log continuation audit, Answerlattice access-control denials, protected dashboard read limits, Knowledge Intake limits, staff-management security events, and the platform intake monitor use `getAnswerlatticeSecurityLogContext()` with bounded route/session metadata plus presence/length metadata for dynamic endpoint, method, route-key, permission, user, tenant, and store values. Shared platform KB source-file opens and support-ticket attachment opens now use `noopener,noreferrer` for new-tab browser handoffs without changing KB or ticket data behavior. `npm run verify:answerlattice-runtime-truth` enforces that raw `request.json()`/`req.json()` parsing, protected-read gate ordering, raw identity interpolation in Answerlattice limiter keys, and raw `buildSecurityContext()` spreading in Answerlattice security events are not reintroduced on those surfaces.

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
| Vercel Preview / QA | `https://menulist.digital`; app `https://app.menulist.digital`; customers `*.menulist.digital` | `menulist-qa` | `https://canonica.app` | `answerlattice-qa` |
| Vercel Production | `https://menulist.ai` | `menulist-prod` | `https://answerlattice.com` | `answerlattice` |

`src/constants/deploymentTargets.ts` is the code-level source of truth for this matrix. Domain routing, environment validation, Firebase aliases, and Answerlattice deploy scripts must stay in sync with it.

## Answerlattice Operating Model

Answerlattice is organized around workflow groups that match how a product owner launches and operates support:

| Group | What it owns | Implemented routes |
| --- | --- | --- |
| Launch Setup | Subscription/workspace activation, product details, starter knowledge intake, product surface mapping, install handoff, and readiness review. | `/answerlattice/activation`, `/answerlattice/install-center`, `/answerlattice/settings`, `/answerlattice/knowledge-intake`, `/answerlattice/product-surfaces`, `/answerlattice/dashboard` |
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
| Answerlattice public website | Implemented | `src/app/sites/answerlattice/` | Static site config, onboarding API | Self-sellable website for `answerlattice.com` / staging host, with product, use-case, governance demo, widget install, INR/USD pricing, resources, updates, trust/security, FAQ, legal, and onboarding pages. |
| Product website demo | Implemented | `src/app/sites/answerlattice/demo/` | Static demo data | Runs one deterministic six-stage governance event from source conflict through approval, release drift, safe fallback, correction, and audit evidence without Firebase or AI calls. |
| Self-service onboarding | Implemented | `src/app/api/answerlattice/onboard/route.ts`, `src/lib/answerlattice/onboardingProvisioning*.ts`, `src/app/sites/answerlattice/get-started/` | `users`, `tenants`, `stores`, `subscriptions`, `answerlattice_productSurfaces`, compact summaries | Creates a selected paid monthly plan in INR/USD through request-fingerprinted provisional scope, a durable 15-minute unknown-provider recovery hold, created-only exact provider matching, atomic pending-subscription/widget finalization, strict payment-pending recovery, and exact compensation only before provider creation or after an owned checkout is confirmed terminal. Admission is rate-limited before body/account/provider work. |
| Product details / workspace profile | Implemented and Feature 29 source-hardened | `src/app/api/answerlattice/workspace-profile/route.ts`, `src/lib/answerlattice/workspaceProfileContracts.ts`, `src/lib/answerlattice/workspaceProfileServer.ts`, `src/components/templates/answerlattice/AnswerlatticeSettings.tsx` | Flat profile fields plus `answerlatticeLaunchProfile` and `answerlatticeWorkspaceProfileRevision` on `stores/{sId}`; one tenant-summary shard; compiled source-version and manifest summaries | Stores product identity, support routing, billing context, initial page labels, timezone, and support-day timing with exact scope, stale-editor rejection, and atomic scheduler/runtime invalidation. |
| Subscription, billing, payment recovery, and transactions | Implemented and Feature 30 source-hardened | `src/app/api/razorpay/`, `src/lib/billing/`, `src/database/answerlattice/billing.ts`, `src/components/templates/answerlattice/billing/`, `src/lib/owner-notifications/` | Answerlattice `subscriptions`, `payment_transactions`, `topups`, store entitlement summary, AI operation history, and product-scoped owner-notification ledgers; shared server-only provider coordination | Runs product/workspace-scoped subscription and support-credit flows with current billing permission, minimal browser checkout responses, signed/idempotent recovery, exact product read queries, safe hosted links, bounded diagnostics, and exact payment/refund/top-up/subscription owner notices. Shared Razorpay producers retain `productId: AL`; delivery never falls through to MenuList Firebase. |
| Team, custom roles, permissions, and session controls | Implemented and Feature 31 source-hardened | `src/lib/answerlattice/staffAccess*.ts`, `src/lib/answerlattice/staffClaimsContracts.ts`, `src/app/api/answerlattice/staff/`, `src/app/api/auth/set-claims/route.ts`, `src/components/templates/answerlattice/AnswerlatticeTeamAccess.tsx` | Answerlattice `users`, `stores.answerlatticeRoles`, default-auth `productAccounts.AL`, Firebase Auth claims and refresh-token state | Manages exact workspace memberships and immutable/custom roles, enforces the role-assignment/team-access dependency, keeps sensitive responses private, keeps tokens selected-workspace scoped, converges concurrent role claims against current store truth, revokes refresh access after material changes, and exposes the documented existing-ID-token expiry limit. |
| Workspace closure, recovery, legal hold, and erasure | Implemented as C3 hardening; internal flag disabled pending QA rehearsal | `src/lib/answerlattice/workspaceLifecycle*.ts`, `src/app/api/answerlattice/platform/workspace-lifecycle/route.ts`, staff/summary cleanup helpers, dedicated/shared Firestore and Storage rules | Exact workspace collections/nested paths/Storage prefixes, store lifecycle tombstone, staff memberships/Auth bridge, hosted-help registry, compiled bundles; declared subscription/payment/run-log retention | Denies customer access before public cleanup, supports 30-day access-only recovery, and performs explicit capped erasure with billing/export/legal/scope gates. It is not self-service, scheduled, a billing-action engine, or a new numbered feature. |
| Activation Command Center | Implemented | `src/app/(answerlattice)/answerlattice/activation/page.tsx`, `src/components/templates/answerlattice/activation/AnswerlatticeActivationCommandCenter.tsx`, `src/components/templates/answerlattice/content/AnswerlatticeContentWorkbench.tsx`, `src/components/templates/answerlattice/content/AnswerlatticeCustomerFlowChecklist.tsx`, `src/lib/answerlattice/activationSummary.ts` | Compact store + `platformSummary` docs | Shows launch readiness, first-client launch proof, product-owner content workflow, and customer-path testing without scanning large collections at page load. |
| Product surfaces | Implemented | `src/components/templates/answerlattice/productSurfaces/AnswerlatticeProductSurfaces.tsx`, `src/database/answerlattice/productSurfaces.ts`, `src/lib/answerlattice/productSurfaceContent*.ts` | `answerlattice_productSurfaces`, `platformSummary/contextContent_{tId}_{sId}` | Maps routes/pages/workflows to entities, tags, articles, changelogs, and tickets. |
| Content Control workbench | Implemented | `src/components/templates/answerlattice/content/AnswerlatticeContentWorkbench.tsx`, `/answerlattice/activation`, `/answerlattice/dashboard` | Activation summary read model | Gives product owners one low-cost path into product profile, import, articles, surfaces, changelog, signal queue, widget, and tickets. |
| Surface Readiness matrix | Implemented | `src/components/templates/answerlattice/content/AnswerlatticeSurfaceReadinessMatrix.tsx`, `src/lib/answerlattice/activationSummary.ts`, `/answerlattice/dashboard` | `platformSummary/contextContent_{tId}_{sId}` via activation summary | Shows which product areas are ready, missing mapping, missing content, or carrying open ticket signals using 0 extra dashboard reads. |
| Test-as-Customer checklist | Implemented | `src/components/templates/answerlattice/content/AnswerlatticeCustomerFlowChecklist.tsx`, `/answerlattice/activation`, `/answerlattice/dashboard` | Activation summary read model | Gives product owners a launch-proof checklist for help center, widget, page context, ticket fallback, release notes, and Signal Queue. |
| Install Center | Implemented | `src/app/(answerlattice)/answerlattice/install-center/page.tsx`, `src/components/templates/answerlattice/install/AnswerlatticeInstallCenter.tsx`, `src/lib/answerlattice/installContract/contract.ts`, `/api/answerlattice/widget-config`, `/api/answerlattice/widget-agent-kit` | Widget config/runtime status + optional activation summary | Keeps the AI install packet, current setup snapshot, framework snippets, public docs links, and verification checklist in one dashboard route; setup reads use no-store same-origin manual-redirect browser requests before bounded response parsing. |
| Context-aware support mounting | Implemented | `src/components/templates/main-app/helpCenter/HeroSearchBar.tsx`, `src/lib/answerlattice/productSurfaceContent.ts`, `src/app/api/helpCenter/search-kb/route.ts`, widget APIs | Safe context payload + product surface summary | Passes page/feature/workflow context into Answerlattice without trusting raw client data as tenant scope. Help Center search rate-limits before parsing a 64KB bounded JSON body and invoking `coreSearch`. |
| Widget management | Implemented and Feature 15 source-hardened | `src/components/templates/answerlattice/widgetManagement/AnswerlatticeWidgetManagement.tsx`, `src/app/api/answerlattice/widget-config/route.ts`, `src/app/api/answerlattice/widget-key/route.ts`, `src/app/api/answerlattice/widget-activity/route.ts`, `src/lib/answerlattice/widgetConfig.ts` | `stores/{sId}.widgetConfig`, exact origins, bounded hash-only key records, runtime status, `aiSearchHistory` widget rows, first-runtime owner notification | Configures bounded appearance/behavior, exact origins, strict route patterns, one-time raw-key creation, revocation, install status, and recent widget questions. The first authenticated allowed-origin runtime status write emits one deterministic `WIDGET_CONNECTION_VERIFIED` owner event; later telemetry refreshes do not repeat it. Saves reject malformed access policy and management responses are private/no-store. |
| Embedded public widget runtime | Implemented | `public/widget/answerlattice-widget.js`, `src/app/widget/embed/WidgetEmbedClient.tsx`, `src/app/widget/[apiKey]/WidgetClient.tsx`, `src/app/api/widget/config/route.ts`, `src/app/api/widget/search/route.ts`, `src/app/api/widget/feedback/route.ts`, `src/app/api/widget/guidance-outcome/route.ts` | Store widget config, API key hash, AI search history with `mountContext`, KB/canonical retrieval, existing signal events | Gives client products page-aware support through one embeddable script. The maintained iframe URL is key-free, bootstrap is exact-origin postMessage, terminal admission failures hide the launcher, and canonical-procedure outcomes remain bounded. |
| Help center | Implemented | `src/app/(main)/help-center/`, `src/components/templates/main-app/helpCenter/`, `/answerlattice/help` compatibility route, `/api/answerlattice/public-content` | Cached KB, FAQ, changelog, tickets, search history | Public/customer support home reused by client support surfaces. It is not a primary owner dashboard navigation item; owners manage source content through KB, FAQ, Changelog, Tickets, Support Board, and Widget & Hosted Help. KB categories, article reads, FAQ lists, and changelog pages use tenant/store-tagged public cache with owner-write invalidation. |
| Feedback, ratings, and feature requests | Implemented and Feature 23 source-hardened | `src/components/templates/main-app/helpCenter/ShareFeedbackView.tsx`, `src/components/templates/main-app/helpCenter/FeatureRequests.tsx`, `src/components/templates/answerlattice/feedback/AnswerlatticeFeedbackReview.tsx`, `src/database/feedback/index.ts`, `src/app/api/answerlattice/feedback/route.ts`, `src/lib/answerlattice/feedbackSubmissionServer.ts`, `src/app/(answerlattice)/answerlattice/feedback/page.tsx`, `src/app/(main)/platform/feedback-admin/page.tsx`, `/answerlattice/help` | Deterministic server-owned `feedback`, identity-minimized `answerlattice_signalEvents(type='feedback')`, `answerlattice_supportBoardCards(sourceType='feedback')`, plus server-owned visible `doc1_*` audits and hidden authoritative `state1_*` actor state under article/changelog/FAQ feedback collections | Customer help surfaces include a Share Feedback tab for ratings, product-area issues, feature requests, and suggestions. Submission is authenticated, body/rate bounded, replay-safe, and server-scoped. Published article/changelog/FAQ reactions use one authenticated counter-plus-state-plus-audit transaction, preventing duplicate actor inflation even after browser state is cleared; visible audit evidence retains a bounded 365-day lifecycle. Owners review the latest 200 loaded rows at `/answerlattice/feedback`; important feedback can be added directly to Support Board or synced as a signal, then turned into governed answer proposals after entity linking. |
| Hosted public Help Center | Implemented | `src/app/answerlattice-hosted-help/`, `src/components/templates/answerlattice/hostedHelp/`, `src/app/api/answerlattice/hosted-help-settings/route.ts`, `src/lib/answerlattice/hostedHelpServer.ts` | `stores/{sId}.hostedHelpConfig`, `answerlattice_publicHelpSites/{domain}`, cached KB/FAQ/changelog | Renders anonymous docs, FAQ, changelog, sitemap, and robots on domains such as `help.example.com` without exposing authenticated tickets/chat/user data. Published articles include a deterministic topic map made only from sanitized headings and existing published navigation. |
| Knowledge Intake | Implemented; Source Governance controlled rollout | `src/components/templates/answerlattice/knowledgeIntake/AnswerlatticeKnowledgeIntake.tsx`, `src/lib/answerlattice/knowledgeIntake.ts`, `src/lib/answerlattice/knowledgeIntakeContracts.ts`, `src/lib/answerlattice/knowledgeIntakePrivacy.ts`, `src/lib/answerlattice/releaseEvidenceHandoff.ts`, `src/app/api/answerlattice/knowledge-intake/*` | `answerlattice_knowledgeIntakeJobs`, `answerlattice_knowledgeSources`, `answerlattice_intakeReviewItems`, `answerlattice_auditLogs`, existing KB/FAQ/product surface/mutation proposal destinations | Imports selected links, files, screenshots/media, pasted content, support macros, repeated replies, and release evidence into reviewed drafts. Release evidence can prepare the existing Changelog editor through a scope-bound 30-minute same-tab handoff after server redaction; it creates no provider sync or extra Firebase operation. Bounded multi-source evidence survives dedupe/re-analysis and destination lineage remains private from public citations. The default-off Source Governance gate adds explicit authority, ownership, approval, access, citation, applicability, review dates, and reciprocal same-job conflict links to existing sources; either side remains ineligible until resolution, and canonical proposal acceptance/publication requires approved, conflict-free evidence. It does not infer authority, detect conflicts automatically, or choose a winner. Nested metadata is recursively redacted, URL sources reject credential/sensitive/private destinations, and intake-published FAQs remain retrieval-eligible. Discovery candidates are not persisted, raw media is not retained, and source deletion/cancellation/intake-specific manifests remain reserved. |
| GitHub Change Intake | Source complete; rollout-gated | `src/lib/answerlattice/githubChangeIntakeContracts.ts`, `src/lib/answerlattice/githubChangeIntakeServer.ts`, `src/app/api/answerlattice/knowledge-intake/github/*`, `src/app/api/answerlattice/webhooks/github/route.ts`, `GitHubChangeIntakeCard.tsx` | Existing `platformSummary/integrationConfig_{tId}_{sId}.githubChangeIntake`, existing Knowledge Intake jobs/sources/summaries, server-only `answerlattice_githubIntakeBindings` | An owner with an active subscription verifies a repository-scoped read-only GitHub App, selects up to ten repositories, and admits published releases plus optional merged default-branch PR summaries. Reconnect remains pending until owner confirmation; a compact month/slot pointer avoids rereading prior full jobs. Signed webhooks create private unreviewed evidence only. No polling, clone, source-code/patch retention, event-time model call, automatic analysis, write-back, publication, or public website claim. The app flag stays false until credentials and hosted QA are complete. |
| Native helpdesk and Jira connectors | Not implemented; do not build now | `scripts/verification/verify-answerlattice-native-helpdesk-connectors-boundary.js`, `__docs__/answerlattice/native-helpdesk-and-jira-connectors/` | none | No Zendesk, Intercom, Freshdesk, Help Scout, or Jira source runtime exists. Use selected exports and repeated replies; admit one read-only provider only after concentrated paying demand, measured export friction, selected-scope safety, deletion/revocation design, sustainable cost, and concierge outcome proof. |
| Knowledge base explorer | Implemented and Feature 5 source-hardened | `src/app/(answerlattice)/answerlattice/docs/page.tsx`, `src/app/(answerlattice)/answerlattice/knowledge-base/page.tsx`, KB templates, `src/database/knowledgeBase/articles.ts`, `src/database/knowledgeBase/categories.ts`, `src/lib/answerlattice/contentFeedbackServer.ts` | `kb_categories`, `kb_articles`, `article_feedback/{tId}/{sId}` | Browses and governs support documentation. Live article truth, navigation, linked-FAQ review state, and freshness invalidation commit atomically; changed truth clears the active vector before regeneration; generated review cannot alter live navigation; non-empty categories fail closed on deletion; published-article feedback is retained as non-authoritative evidence for 365 days. Article embedding generation checks safe mode and AI operation limits before a 256KB bounded body parse. |
| KB generation pipeline | Implemented; internal compatibility runtime | `src/app/(main)/platform/kb-generation/page.tsx`, `/answerlattice/kb-generation` redirect, `src/components/templates/platform/KBGeneration/`, dedicated/shared Functions mirrors | `kb_generation_jobs`, `kb_articles`, `answerlattice_faqs`, `kb_categories`, cache/source/bundle summaries, Answerlattice Storage | Internal platform file-first import with review/reconciliation. Staging remains inactive while changed embeddings run; one final transaction activates articles/FAQs, switches navigation, deletes approved replacements, publishes the job, and invalidates freshness. Explicit safe-state deletion inventories at most 100 exact-workspace jobs, removes only unreferenced source objects, and preserves shared paths. |
| FAQ management | Implemented and Feature 6 source-hardened | `src/app/(answerlattice)/answerlattice/faqs/page.tsx`, `src/components/templates/answerlattice/faqManagement/AnswerlatticeFaqManagement.tsx`, `src/database/answerlattice/faqs.ts`, `src/lib/answerlattice/faqContent.ts`, `src/lib/answerlattice/faqRetrieval.ts`, article-generation and content-feedback routes | `answerlattice_faqs`, linked `kb_articles`, product-surface summaries, `faq_feedback/{tId}/{sId}` | Gives owners a governed short-answer layer linked to detailed articles, entities, tags, and product surfaces. Browser authoring cannot forge source, lineage, counters, or feedback state; linked publication requires active published article truth; article-generation output rechecks source fingerprint, capacity, and duplicates transactionally; compact summary matches are re-read before answering; and reactions become retained review evidence rather than automatic truth. |
| Product ontology | Implemented and Feature 7 source-hardened | `src/database/answerlattice/entities.ts`, `src/database/answerlattice/knowledgeMap.ts`, `src/lib/answerlattice/entityExtraction.ts`, `src/lib/answerlattice/ontologyServer.ts`, `src/lib/answerlattice/governanceServer.ts`, `src/components/templates/answerlattice/governance/EntityManagementDashboard.tsx`, `src/components/templates/answerlattice/governance/KnowledgeMapDashboard.tsx` | `answerlattice_entities`, `answerlattice_entityRelations`, `answerlattice_entitySearchIndex`, `answerlattice_entityCandidates`, dependent canonical/KB/FAQ/product-surface records, graph/source/cache summaries | Models product features, plans, roles, workflows, states, integrations, and errors as governed concepts. Post-save extraction uses persisted source truth, rejects source/entity changes after provider latency, projects provider-bound rich text through the shared bounded TipTap reader, preserves distinct Unicode candidate names, and commits changed links with freshness invalidation atomically; ambiguous matches remain candidate review. The dashboard exposes aliases, relation maintenance, same-type bounded merge, and a two-point-read map with directional relationships, answer coverage, drift, review state, source-version freshness, and direct candidate review. Merge transfers dependent answers, articles, FAQs, product surfaces, relations, and search-index truth; deprecation fails while dependencies remain. |
| Entity candidates | Implemented | `src/database/answerlattice/entityCandidates.ts`, `src/components/templates/answerlattice/EntityCandidateReview.tsx`, `functions-answerlattice/src/answerlattice/onboardingBootstrap.ts` | `answerlattice_entityCandidates` | Stages extracted concepts for human approval before becoming ontology entities. |
| Canonical answer engine | Implemented | `src/database/answerlattice/canonicalAnswers.ts`, `src/lib/answerlattice/canonicalRetrieval.ts`, `src/lib/answerlattice/governanceServer.ts`, `/api/answerlattice/governance/actions`, `CanonicalAnswerEditor.tsx` | canonical answers, mutation proposals, audit logs, cache/source/bundle versions, entities, releases | Retrieves approved scoped answers before fallback. Plan, role, and state are strict eligibility constraints; review, missing-context, and out-of-scope states stop before FAQ/RAG. Browser create/update is denied; manual creates/edits become proposals and approval applies canonical truth, audit snapshot, and invalidation state in one server transaction. |
| Answer retrieval quality | Implemented | `src/lib/answerlattice/canonicalRetrieval.ts`, `src/lib/answerlattice/publicAnswerContracts.ts`, `src/lib/search/searchCore.ts`, widget/Help Center/public answer routes | canonical evidence, bounded search history/chat metadata, Redis `canon:v5` | Delivers reviewer-approved public citations separately from KB references, retains private source IDs only for governance/evaluation, derives confidence from validation plus entity evidence, requests missing plan/role/state context, and abstains on governed uncertainty instead of allowing an unverified fallback. |
| Answer Tests and release regression | Implemented | `src/app/(answerlattice)/answerlattice/answer-tests/page.tsx`, `src/components/templates/answerlattice/answerTests/AnswerlatticeAnswerTests.tsx`, `src/lib/answerlattice/answerTestServer.ts`, `src/app/api/answerlattice/answer-tests/*` | `platformSummary/answerTests_{tId}_{sId}`, canonical/FAQ/RAG retrieval, releases, source versions, AI operation accounting | Stores up to 100 governed support cases, runs deterministic canonical or capped full-runtime evaluations, checks expected source/citations/reference IDs, compares mutation proposals, and blocks release proof when critical cases regress. Tests never publish or mutate live answers. |
| First Trusted Answers / product starter pack | Implemented | `src/lib/answerlattice/firstTrustedAnswerPackServer.ts`, `src/lib/answerlattice/answerTestStarterPack.ts`, `src/components/templates/answerlattice/answerTests/AnswerlatticeAnswerTests.tsx` | Existing Answer Tests summary, Knowledge Intake review items, canonical Governance, support-credit accounting | Turns ten priority founder questions into editable tests and review drafts. Product-specific generated answers remain intake drafts and require canonical approval; generic starter questions are prompts, not product truth. External founder recruitment and proof collection remain distribution work, not runtime claims. |
| Guided workflows and resolution runtime | Implemented; workspace opt-in | `src/lib/answerlattice/procedureValidation.ts`, `src/lib/answerlattice/guidedResolutionContracts.ts`, `public/widget/answerlattice-widget.js`, `src/app/widget/[apiKey]/WidgetClient.tsx`, `src/app/api/widget/guidance-outcome/route.ts` | `answerlattice_canonicalAnswers.content.procedure`, `stores.widgetConfig.guidedResolutionEnabled`, canonical widget search history with validated `guidedProcedure` snapshot, existing signal events | Adds approved ordered procedures, bounded asynchronous semantic-target highlighting, exact client-reported event advancement, outcome-evidence binding, and explicit support handoff. It never clicks controls or changes client product state, and completion is not independent backend-state proof. |
| Autonomous browser and account-changing actions | Deliberately not implemented | `public/widget/answerlattice-widget.js`, `packages/answerlattice-web/src/index.ts`, `scripts/verification/verify-answerlattice-autonomous-action-boundary.js` | none beyond existing guided outcome evidence | Procedure actions are instructional labels. No action registry, execution API, arbitrary selector/code path, host click, account mutation, action queue, rule, index, or public action claim exists. |
| Instant cache + freshness manifest | Implemented; configured Redis proof pending | `src/lib/answerlattice/instantCache.ts`, `src/lib/answerlattice/cacheFreshness.ts`, `src/lib/answerlattice/cacheVersion*.ts`, `functions-answerlattice/src/answerlattice/cacheVersionManifest.ts` | Upstash Redis when configured, `answerlattice_cacheVersions`, expiring search history | Uses the `canon:v5` namespace, hashes normalized query, complete context and raw entity/applicability key segments, validates untrusted payloads and UTF-8 bytes, and admits only active reviewer-cleared canonical truth. Graph-aware selection uses live retrieval until graph state is independently versioned. Cache/source failures fall through to live retrieval. Non-canonical history requires references and an unexpired row. No latency, hit-rate, or savings claim is source-certified. |
| Bounded hybrid evidence retrieval | Implemented but disabled by default | `src/lib/answerlattice/hybridEvidenceRetrieval.ts`, `src/lib/search/searchCore.ts`, `src/config/features.ts` | Tenant-scoped entities and active published entity-linked KB articles | After canonical and approved FAQ miss, eligible technical questions can add one exact-literal/entity-linked KB query and deterministic fusion with the existing vector candidates. It stays off until the required index is deployed/read back and representative Answer Tests prove no citation, abstention, or unsupported-claim regression. |
| Compiled context distribution | Implemented and Feature 14 source-hardened | `src/lib/answerlattice/contextBundleBuilderServer.ts`, `src/lib/answerlattice/compiledContext.ts`, `src/lib/answerlattice/compiledSourceVersionsAdmin.ts`, bundle routes/readers, `functions-answerlattice/src/answerlattice/contextBundleBuilder.ts` | `platformSummary/sourceVersions_*`, `platformSummary/bundleManifest_*`, Firebase Storage `answerlattice-context/*` | Compiles approved context into content-immutable public/private objects with cap-plus-one source reads, file-specific byte ceilings, restricted public manifests, exact derived ref paths, source recheck, last-ready preservation, and failed-version cleanup. Public transport requires revalidation and exact object existence before process-cache use so lifecycle deletion revokes the origin. Public API preference is gated by its API flag; MCP is disabled; widget bundle bootstrap is disabled until the widget consumes the files. `branding` and `mcpPolicy` remain reserved invalidation counters: their numeric values are retained only in private source-version metadata, while no builder reads or serializes an advanced-branding profile or MCP authorization policy. |
| MCP | Implemented, source-hardened, and disabled by default | `src/app/api/answerlattice/mcp/route.ts`, `src/app/api/answerlattice/mcp/session/route.ts`, `src/lib/answerlattice/mcpProtocol.ts`, `src/lib/answerlattice/mcpSession.ts`, `src/lib/answerlattice/mcpTools.ts` | Ready private compiled-context bundle; optional retained `answerlattice_signalEvents` missing-context evidence | Exposes bounded approved product, route, entity, canonical-answer, and release context to a trusted server or desktop client. Session exchange requires an explicit server-owned `mcp:read` credential, issues a five-minute audience-bound token, and grants signal reporting only with `signals:write`. The JSON-RPC transport negotiates supported protocol versions and returns stable structured tool results, but it does not implement MCP OAuth, per-user/per-source bundle filtering, SSE, arbitrary data access, or account-changing tools. |
| Centralized scheduler | Implemented | `functions-answerlattice/src/answerlattice/answerlatticeMasterScheduler.ts`, `functions-answerlattice/src/answerlattice/schedulerTime.ts`, `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` | `platformSummary/answerlatticeTenantsSummary`, `platformSummary/answerlatticeSchedulerState`, `platformSummary/answerlatticeNightlyState_*`, `platformSummary/answerlatticeNightlyLock_*` | Keeps one scheduled Answerlattice export while filtering workspaces by local timezone/support-day end time and locking each workspace/date. |
| Drift governance | Implemented | `src/lib/answerlattice/driftDetection.ts`, `src/lib/answerlattice/governanceServer.ts`, `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts`, `DriftDashboard.tsx` | canonical answers, entities, releases, signals, audit/cache/source/bundle versions | Flags version mismatch, signal anomaly, scope conflict, and deprecated entity drift. Detection only sets drift; clearing requires an explicit server-owned validation event. |
| Signal mutation engine | Implemented; separate scoring expansion not implemented | `src/lib/answerlattice/signalEmitter.ts`, `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts`, `src/components/templates/answerlattice/MutationProposalReview.tsx`; `src/lib/answerlattice/signalMutation.ts` is a reference/manual utility only | `answerlattice_signalEvents`, `answerlattice_mutationProposals` | Turns repeated tickets, negative feedback, feedback, fallback, and escalation signals into reviewable knowledge changes. Production clustering skips unresolved signals until a real entity is linked and shows transparent evidence counts. The reserved signal-quality flag has no runtime; legacy severity/time-decay code is not the production scheduler. |
| Auto knowledge drafts | Implemented with caps | `src/lib/answerlattice/draftGenerator.ts`, `functions-answerlattice/src/answerlattice/draftGenerator.ts`, `src/lib/answerlattice/draftPrompt.ts`, `src/components/templates/answerlattice/MutationProposalReview.tsx` | mutation proposals, entities, signals | Generates draft canonical answers for human review; queue UI supports publish, reject, and explicit generate/regenerate. Manual regeneration resolves scope, checks safe mode, rate-limits before permission/body/provider work, and caps JSON bodies at 4KB. Never auto-publishes authoritative content. |
| Support Board | Implemented with source sync gated | `src/app/(answerlattice)/answerlattice/support-board/page.tsx`, `src/components/templates/answerlattice/supportBoard/AnswerlatticeSupportBoard.tsx`, `src/hooks/answerlattice/useSupportBoard.ts`, `src/database/answerlattice/supportBoard.ts`, `functions-answerlattice/src/answerlattice/supportBoardSync.ts` | `answerlattice_supportBoardCards`, `platformSummary/supportBoardSummary_*`, support tickets, `answerlattice_signalEvents`, mutation proposals | Private owner/staff Kanban for support gaps, internal notes, status history, Needs Answer workflow, and governed answer-proposal creation. Ticket/signal import and nightly signal-quality prep are implemented but disabled by default to avoid duplicating existing dashboards and Firebase work. |
| Ticket system | Implemented | `src/components/templates/main-app/helpCenter/TicketView.tsx`, `src/app/(answerlattice)/answerlattice/support/page.tsx`, `src/app/(answerlattice)/answerlattice/tickets/page.tsx` | support tickets collection | Provides ticket fallback and operator review path when content does not answer the user. |
| Ticket knowledge loop | Implemented and enabled with caps | `functions-answerlattice/src/answerlattice/resolutionExtractor.ts`, `src/lib/answerlattice/signalEmitter.ts` | resolved tickets, signals, mutation proposals | Extracts reusable knowledge from resolved ticket clusters after 3+ resolved tickets per entity. |
| Changelog / release notes | Implemented | `src/app/(answerlattice)/answerlattice/changelog/page.tsx`, `src/app/(answerlattice)/answerlattice/release-notes/page.tsx`, `src/database/answerlattice/releases.ts`, `src/lib/answerlattice/releaseEvidenceHandoff.ts`, shared changelog templates | `answerlattice_releases`, shared changelog collection | Connects release changes to surfaces, tags, entities, and stale-answer review. A saved intake release source may prefill an editable draft, but the existing Release Impact Guard, Answer Tests proof, owner confirmation, activation, publication, and cache path remains mandatory. Advisory drift-evaluation failures during activation use fixed audit failure codes with bounded source-error metadata. |
| Support Truth Change Control | Implemented; Source Governance evidence remains rollout-gated | `src/lib/answerlattice/supportTruthChangeControl.ts`, `src/lib/answerlattice/supportTruthChangeControlServer.ts`, `src/lib/answerlattice/releaseServer.ts`, `src/components/templates/platform/changelog/addEditChangelog.tsx` | Existing release/answer query, directly cited Knowledge Intake source metadata, product-surface summary, compiled source versions, and bundle manifest | Extends the pending-release review with direct source freshness, direct surface dependencies, and Answerlattice control-plane distribution proof. It adds no route, collection, listener, scheduler, model call, preview write, automatic edit, or deployment gate. Source reads are field-masked and capped at 50; surface and distribution evidence uses three existing compact documents. |
| Weekly digest | Implemented; deterministic | `src/app/(answerlattice)/answerlattice/weekly-digest/page.tsx`, `src/components/templates/answerlattice/weeklyDigest/AnswerlatticeWeeklyDigest.tsx`, `src/app/api/analytics/weekly-narrative/generate-local/route.ts`, `functions-answerlattice/src/answerlattice/chatIntelligence.ts` | Up to 14 exact-workspace `chatAnalytics` days and `insights/{tId}/stores/{sId}/ai/weekly` | Gives owners a completed-week evidence review with source completeness, stale/partial warnings, export, and governed handoffs. Sunday preparation and manual refresh are deterministic and make no model call. |
| Owner Support Assistant and Founder Daily Brief | Implemented; summary-only | `src/app/(answerlattice)/answerlattice/support-assistant/page.tsx`, `src/components/templates/answerlattice/ownerSupportAssistant/AnswerlatticeOwnerSupportAssistant.tsx`, `src/lib/answerlattice/ownerSupportAssistant.ts`, `src/app/api/answerlattice/support-assistant/*` | Exactly six compact coverage, trust, Support Board, friction, Knowledge Intake, and Activation summary documents | Gives founders a deterministic private plan for what to review next and links to governed screens. It performs no AI call, transcript write, raw-ticket scan, direct mutation, publication, or ticket reply; optional Support Board prefill remains independently disabled. |
| Known Issues | Implemented | `src/app/(answerlattice)/answerlattice/known-issues/page.tsx`, `src/components/templates/answerlattice/knownIssues/AnswerlatticeKnownIssues.tsx`, `src/lib/answerlattice/predictiveSupportContracts.ts`, `src/lib/answerlattice/predictiveEngine.ts` | `answerlattice_predictiveTriggers(kind='known_issue')`, predictive trigger summary | Lets owners publish exact-page, time-bounded service notices through the existing predictive-help runtime. Start/end timestamps and optional public HTTPS status links are validated; notices do not replace canonical answers or turn Answerlattice into a public status-page product. |
| Verified visitor context and bounded evidence links | Implemented | `src/app/api/answerlattice/widget-security/route.ts`, `src/lib/answerlattice/verifiedWidgetContextServer.ts`, `src/app/api/widget/search/route.ts`, `WidgetSecurityControls.tsx` | Store-scoped signing-key metadata and evidence-host allowlist; private widget search activity | Accepts short-lived signed visitor context for plan/role-sensitive support and stores only allowlisted metadata for external evidence links. Invalid signed identity loses signed-only claims rather than falling back to unsigned identity; private evidence URLs are not exposed as public citations. |
| Support Truth Export | Implemented and Feature 37 source-hardened | `src/app/api/answerlattice/support-truth-export/route.ts`, `src/lib/answerlattice/supportTruthExport.ts`, `AnswerlatticeSupportTruthExport.tsx`, `scripts/verification/test-answerlattice-support-truth-export-contracts.ts` | Exact `AL`/tenant/workspace projections of entities, canonical answers with approved evidence, KB/reviewed translations, FAQs, product surfaces, releases, and release-linked changelog; server-reserved metadata audit | Exports governed support truth as a capped private package for portability and review. POST-only generation, exact scope/permission, fail-closed rate enforcement, explicit citation/translation projection, sensitive-field exclusion, exactly-at-cap/overflow behavior, 8 MiB delivery, and audit-before-delivery are verified. It excludes tickets, conversations, embeddings, tenant IDs, raw source context, and unrestricted records; this is not full workspace erasure or a complete legal data export. |
| Founder trust/readiness metrics | Implemented | `src/database/answerlattice/trustMetrics.ts`, `src/components/templates/answerlattice/governance/FounderTrustDashboard.tsx`, `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` | `platformSummary/trustMetrics_{tId}_{sId}` | Summarizes coverage, resolution readiness, drift pressure, escalations, and top failing entities. |
| Coverage KPI | Implemented | `src/database/answerlattice/coverageKPI.ts`, `src/components/templates/answerlattice/AnswerlatticeCoverageKPI.tsx`, nightly functions | `platformSummary/coverage_{tId}_{sId}` | Tracks canonical coverage without dashboard collection scans. |
| Product friction intelligence | Implemented and enabled with caps | `functions-answerlattice/src/answerlattice/frictionAggregation.ts`, `frictionInsight.ts`, `src/database/answerlattice/frictionStats.ts`, `FrictionTab.tsx` | `answerlattice_frictionDailyStats`, `platformSummary/friction*` | Aggregates recurring support friction and optional weekly insight generation from bounded nightly queries. |
| Post-change support evidence review | Implemented; authenticated hosted QA pending | `src/app/api/answerlattice/post-change-evidence/route.ts`, `src/lib/answerlattice/postChangeEvidence*.ts`, `PostChangeSupportEvidenceReview.tsx`, `FrictionTab.tsx` | Existing active releases, implemented mutation proposals, and retained `answerlattice_signalEvents` | Lets a governance owner explicitly compare complete 14-day UTC ticket, negative-feedback, and escalation event windows after a selected release or knowledge correction. It uses direct entity links, strict waiting/insufficient/retention/saturation states, correlation-only language, zero mount reads, no writes, and no new collection, index, listener, scheduler, cache, or model call. |
| Knowledge graph retrieval | Implemented and enabled with caps | `src/lib/answerlattice/graphTraversal.ts`, `src/lib/answerlattice/canonicalRetrieval.ts`, `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` | Existing entity relations plus compact graph/interaction summaries | Adds deterministic one-hop entity expansion, multi-entity answer scoring, interaction explanations, and related entities without a graph database or per-query collection fanout. Nightly rebuild reads cap-plus-one, requires exact `AL` scope, and preserves the previous graph rather than writing truncated or cross-scope input. The governance dashboard's workspace relation list is currently capped at 500 rows without pagination. |
| Predictive support | Implemented and enabled with guards | `src/app/api/answerlattice/predictive-help/route.ts`, `src/app/api/answerlattice/predictive-interaction/route.ts`, `src/lib/answerlattice/predictiveSupportContracts.ts`, `src/lib/answerlattice/predictiveEngine.ts`, `src/database/answerlattice/predictiveTriggers.ts`, `public/widget/answerlattice-widget.js`, `functions-answerlattice/src/answerlattice/predictiveTriggerSync.ts` | `answerlattice_predictiveTriggers`, `platformSummary/predictiveTriggers_*`, optional `answerlattice_signalEvents`, context/friction/canonical summaries, Redis cooldowns | Serves deterministic, dismissible help from exact safe product context and owner-reviewed triggers. Key/product/purpose/scope/origin/runtime-token admission, strict 4 KiB requests, a 200-trigger summary cap, non-PII session cooldowns, bounded public projection, stale-context clearing, and current-trigger interaction validation guard the runtime. Shown/opened/dismissed counts are advisory engagement evidence only and never auto-activate, auto-disable, reprioritize, or publish a trigger. |
| Workflow integrations | Implemented with tiered rollout | `src/app/api/answerlattice/integrations/*`, `functions-answerlattice/src/integrations/*`, `functions-answerlattice/src/index.ts` | Integration configs, immutable event facts, delivery logs | Emits sanitized governance events to self-service Slack/email integrations; Linear/GitHub adapters remain controlled rollout until tenant-secret lifecycle is certified. Answerlattice remains an event producer, not a workflow automation platform or bidirectional sync engine. |
| Staff access control | Implemented | `src/app/(answerlattice)/answerlattice/team/*`, `src/lib/answerlattice/staffAccess*.ts`, `/api/answerlattice/staff/*`, `/api/auth/set-claims` | Answerlattice users, workspace memberships, custom roles on `stores/{sId}.answerlatticeRoles`, Answerlattice Auth claims | Provides Answerlattice-specific members, immutable built-in roles, custom permissions, force sign-out, and multi-workspace membership without inheriting MenuList restaurant roles. |
| Public API v1 | Implemented, Feature 35 source-hardened, rollout-gated | `src/app/api/answerlattice/public-api-key`, `src/app/api/answerlattice/public/v1/answers`, `/entities`, `/signals`, `src/lib/answerlattice/publicApi*.ts` | One hash-only Public API key, credential audits, canonical retrieval, public entity projection, governed signals | Server-to-server governed-answer distribution. Exact AL product/purpose/scopes, active-workspace admission, fail-closed IP/key limits, browser rejection, immediate rotation/revocation, active/beta entities, stable ETags, reserved metadata stripping, and deterministic replay conflict handling are verified. The main flag remains off until a named customer workflow passes quality, security, and usefulness gates. |
| MCP | Implemented, Feature 36 source-hardened, rollout-gated | `src/app/api/answerlattice/mcp/*`, `src/lib/answerlattice/mcpProtocol.ts`, `mcpSession.ts`, `mcpTools.ts` | Hash-only `mcp:read` credential exchange, short signed sessions, ready private compiled context, optional governed signals | Supports bounded MCP Streamable HTTP tool discovery/calls for approved product, route, entity, canonical, and release context. Exact AL credential scope, active workspace, origin, rate, token, argument, bundle-version, output-size, and signal-lifecycle boundaries are verified. It remains disabled pending real-client compatibility, source-access, provider handling, answer-quality, and customer-value proof. |
| Email notifications | Implemented and enabled | `src/lib/notifications/`, `src/app/api/answerlattice/notifications/test/route.ts`, ticket DAL notification triggers | Ticket/event data, `answerlattice_notificationLogs` | Ticket-created/reply/status emails are fire-and-forget, rate-limited, logged in Answerlattice Firebase, and testable from Activation. |
| Widget branding | Implemented | `src/lib/answerlattice/widgetConfig.ts`, `AnswerlatticeWidgetManagement.tsx`, `public/widget/answerlattice-widget.js`, `WidgetClient.tsx` | `stores/{sId}.widgetConfig` | Widget header title, accent color, greeting, launcher, and powered-by visibility are tenant-configurable without extra runtime reads. |
| Advanced white-label branding | Validated private profile prototype; customer delivery absent; disabled by default | `src/lib/answerlattice/advancedBrandingContracts.ts`, `src/database/answerlattice/branding.ts`, `src/components/templates/answerlattice/governance/index.tsx`, `WhiteLabelBranding.tsx` | `platformSummary/branding_{tId}_{sId}` | Exact scope, strict fields, HTTPS links, hex colors, safe stored fallback, and acknowledged writes are verified. Custom CSS/fonts are rejected. Widget, hosted help, KB, email, and public runtimes do not consume this profile; the working widget uses `stores/{sId}.widgetConfig`. |
| Multi-language article drafts | Draft generator source-hardened; customer delivery not implemented; disabled by default | `src/app/api/answerlattice/translate/route.ts`, `src/lib/answerlattice/articleTranslationServer.ts`, `articleTranslationContracts.ts`, `MultiLanguageArticles.tsx` | Private `kb_articles.translations.{locale}` drafts | Exact `AL`/workspace reads, strict provider JSON, source fingerprints, post-provider transaction revalidation, no-overwrite behavior, fail-closed limits, bounded owner reads, explicit draft labeling, and public/export draft exclusion are verified. No locale configuration, approve/publish action, fallback, translated search/widget/help-center projection, or bundle propagation exists. |
| AI failure escalation | Source-hardened automatic evaluator; disabled by default; active widget fallback separate | `src/lib/answerlattice/escalationEvaluator.ts`, `escalationTypes.ts`, `src/lib/search/searchCore.ts`, Help Center projection, ticket lifecycle/rules, widget escalation server | final-answer cited search evidence; active widget fallback uses persisted `aiSearchHistory`, tickets, and signals | Distinguishes healthy source-backed RAG answers from refusals/insufficient evidence, validates bounded context, removes browser Help Chat ticket authority and debug projection, and reserves escalation ticket fields to trusted server writers. Activation requires a server-authoritative, confirmed, deterministic/idempotent Help Chat handoff and representative quality/usefulness proof. |
| Separate Firebase/project support | Implemented | `src/lib/firebase/answerlatticeFirebase.ts`, `functions-answerlattice/src/firebaseAdmin.ts`, Answerlattice rules/indexes | Answerlattice Firebase app/admin config | Keeps Answerlattice data isolated from MenuList when `ANSWERLATTICE_FIREBASE_MODE=separate`, including tenant-scoped content reaction rules for `article_feedback/{tId}/{sId}` and `changelog_feedback/{tId}/{sId}`. Answerlattice Functions Firebase Admin bootstrap failures use stable credential/file-load codes and bounded source metadata instead of raw exception text or raw local credential paths. |

---

## Route Map

### Public Answerlattice Website

- `/` on Answerlattice product hosts and `/__answerlattice` in local/dev rewrite mode.
- `/product`, `/product/launch-setup`, `/product/page-aware-widget`, `/product/support-control`, `/product/knowledge-governance`, `/product/knowledge-base`, `/product/faq-management`, `/product/changelog`, `/product/tickets`, `/use-cases`, `/demo`, `/install`, `/integrations`, `/pricing`, `/resources`, `/updates`, `/get-started`, `/trust`, `/security`, `/faq`, `/about`, `/contact`.
- `/integrations` is the implemented Slack/email workflow-notification page; it is not an install redirect.
- `/privacy-policy`, `/terms-of-service`, `/robots.txt`, `/sitemap.xml`.
- Public website routes intentionally avoid root-level `/docs`, `/help`, `/changelog`, and `/release-notes` because those roots are dashboard/client-support routes on Answerlattice product hosts. Buyer-facing feature pages live under `/product/*`.

### Answerlattice Dashboard

- `/answerlattice` redirects by scope: management users to activation/dashboard, support-only users to client home/help.
- `/answerlattice/activation`, `/answerlattice/install-center`, `/answerlattice/settings`, `/answerlattice/knowledge-intake`, `/answerlattice/product-surfaces`, `/answerlattice/dashboard`.
- `/answerlattice/kb-generation` is a compatibility redirect to Knowledge Intake; the actual KB Generation workspace remains under the internal platform route.
- Direct customer/compatibility routes retained outside owner navigation: `/answerlattice/help`, `/answerlattice/docs`, `/answerlattice/release-notes`, `/answerlattice/support`.
- Owner Support Control routes: `/answerlattice/knowledge-base`, `/answerlattice/faqs`, `/answerlattice/changelog`, `/answerlattice/support-board`, `/answerlattice/tickets`, `/answerlattice/conversations`, `/answerlattice/feedback`, `/answerlattice/weekly-digest`.
- `/answerlattice/widget`, `/answerlattice/widget/[tab]` for UI, install, hosted help, and access/security subroutes.
- `/answerlattice/team`, `/answerlattice/team/[tab]` for members and roles subroutes.
- `/answerlattice/billing`, `/answerlattice/transactions`.
- `/answerlattice/governance`, and `/answerlattice/governance/[tab]` sidebar subroutes.

### Widget Runtime

- `/widget/embed` is the maintained iframe shell. The loader transfers the `al_*` key through exact-origin parent-to-iframe bootstrap after the iframe is ready, so the raw key is not part of the iframe request URL.
- `/widget/[apiKey]` remains a legacy-compatible route and is not emitted by the maintained loader.
- `/widget/answerlattice-widget.js` is the public embeddable script.
- `/api/widget/config`, `/api/widget/search`, `/api/widget/feedback`, and `/api/widget/guidance-outcome` are public widget runtime endpoints protected by key hash and allowed-origin/runtime-token checks. Guidance outcomes also require owner opt-in and an exact scoped canonical widget search-history record.
- `/api/answerlattice/widget-activity` is the protected dashboard read for recent widget questions.
- In separated Firebase mode, `al_` widget/API key validation reads Answerlattice Firestore through `answerlatticeFirestoreAdmin` and fails closed if Answerlattice Admin credentials are missing. Widget runtime endpoints opt out of MenuList `publicApi` fallback, validate active keys through `stores.answerlatticeWidgetApi.keyHashes` with legacy `apiKeyHash` fallback, while MenuList public API endpoints only accept `ml_` keys.
- `/api/answerlattice/bundles/public/[...path]` proxies public-safe compiled bundle files from opaque Storage paths with per-request fail-closed rate limiting and Storage-existence revalidation before bounded process-cache use, metadata/download byte guards, mandatory-revalidation responses, and bounded failure diagnostics.

### MenuList Client Integration

- MenuList `/help-center` acts as an Answerlattice client route only when the signed-in user has `productAccounts.AL`.
- Client Help Center search, ticket creation, changelog/release-note reads, and Firebase Auth claim sync use the Answerlattice product account `tId/sId`; the originating MenuList product scope is retained in Answerlattice `sourceContext`.
- This integration is product-account driven. There is no dedicated MenuList client-test flag, one-off widget host, or fallback to MenuList Firebase for Answerlattice-owned support data.

### Protected Answerlattice APIs

- Answerlattice dashboard routes wait for `ensureFirebaseAuthForSession()` before mounting Firestore-backed children, so separate Firebase reads/listeners use Answerlattice Auth claims rather than stale MenuList/default Firebase Auth state. Platform/support users keep their platform claims even when the same email also has a tenant-level Answerlattice account. Dashboard access context loads through `/api/answerlattice/access` with no-store cache, same-origin credentials, manual redirect handling, and a bounded `{ access }` response guard before permissions are exposed to child routes.
- `/api/answerlattice/onboard`
- `/api/answerlattice/governance/actions`
- `/api/answerlattice/access`
- `/api/answerlattice/workspace-profile`
- `/api/answerlattice/activation/summary`
- `/api/answerlattice/operations/status`
- `/api/answerlattice/widget-config`
- `/api/answerlattice/widget-key`
- `/api/answerlattice/public-api-key`
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

They are trusted-server endpoints, not browser APIs. The authenticated `/answerlattice/public-api` page manages one workspace credential when the main flag is enabled; the raw key is shown once, only its hash is persisted, and rotation/revocation is immediate and audited. Answer retrieval is canonical-only, entities expose active/beta public projection, and signals are governed evidence with exact idempotency conflict handling.

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

`platformSummary/mcpSignal_{tId}_{sId}_{dateKey}` is a legacy-reserved identifier only. The active MCP runtime does not write or read it; missing-context evidence uses retained, redacted, idempotent `answerlattice_signalEvents`.

Dashboard and scheduler flows should prefer summary docs over scanning growing collections. Detail lists must stay tenant-scoped and bounded; realtime listeners are exceptional and require a documented cost reason. See [Cost Read-Model Guardrails](../cost-read-model-guardrails/README.md).

---

## Feature Flags

### Enabled in app by default

- `ENABLE_ANSWERLATTICE_INTAKE_PLATFORM_MONITOR`
- `ENABLE_ANSWERLATTICE_ONTOLOGY`
- `ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS`
- `ENABLE_ANSWERLATTICE_DRIFT_DETECTION`
- `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION`
- `ENABLE_ANSWERLATTICE_WIDGET`
- `ENABLE_ANSWERLATTICE_SELF_REPORTED_DISCOVERY`
- `ENABLE_ANSWERLATTICE_AGENT_INSTALL`
- `ENABLE_ANSWERLATTICE_HOSTED_HELP_CENTER`
- `ENABLE_ANSWERLATTICE_ACTIVATION_COMMAND_CENTER`
- `ENABLE_ANSWERLATTICE_STAFF_ACCESS`
- `ENABLE_ANSWERLATTICE_WEEKLY_DIGEST`
- `ENABLE_ANSWERLATTICE_FEEDBACK_REVIEW`
- `ENABLE_ANSWERLATTICE_SUPPORT_BOARD`
- `ENABLE_ANSWERLATTICE_ANSWER_TESTS`
- `ENABLE_ANSWERLATTICE_SCOPE_COVERAGE_MATRIX`
- `ENABLE_ANSWERLATTICE_ANSWER_TRACE`
- `ENABLE_ANSWERLATTICE_PRODUCT_STARTER_PACK`
- `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT`
- `ENABLE_ANSWERLATTICE_FOUNDER_DAILY_BRIEF`
- `ENABLE_ANSWERLATTICE_KNOWN_ISSUES`
- `ENABLE_ANSWERLATTICE_VERIFIED_CONTEXT`
- `ENABLE_ANSWERLATTICE_EXTERNAL_EVIDENCE_LINKS`
- `ENABLE_ANSWERLATTICE_SUPPORT_TRUTH_EXPORT`
- `ENABLE_ANSWERLATTICE_SUPPORT_TRUTH_CHANGE_CONTROL`
- `ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE`
- `ENABLE_ANSWERLATTICE_REPEATED_REPLY_IMPORT`
- `ENABLE_ANSWERLATTICE_INTAKE_URL_DISCOVERY`
- `ENABLE_ANSWERLATTICE_INTAKE_MEDIA_EXTRACTION`
- `ENABLE_ANSWERLATTICE_NOTIFICATIONS`
- `ENABLE_ANSWERLATTICE_GOVERNANCE_UI`
- `ENABLE_ANSWERLATTICE_CONTEXT_AWARE`
- `ENABLE_ANSWERLATTICE_PRODUCT_SURFACES`
- `ENABLE_ANSWERLATTICE_FAQ_MANAGEMENT`
- `ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS`
- `ENABLE_ANSWERLATTICE_GUIDED_RESOLUTION`
- `ENABLE_ANSWERLATTICE_INSTANT_CACHE`
- `ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES`
- `ENABLE_ANSWERLATTICE_BUNDLE_BUILDER`
- `ENABLE_ANSWERLATTICE_PUBLIC_API_BUNDLE_READS`
- `ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE`
- `ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE`
- `ENABLE_ANSWERLATTICE_POST_CHANGE_EVIDENCE_REVIEW`
- `ENABLE_ANSWERLATTICE_FOUNDER_ONBOARDING`
- `ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS`
- `ENABLE_ANSWERLATTICE_TICKET_KNOWLEDGE`
- `ENABLE_ANSWERLATTICE_TRUST_METRICS`
- `ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH`
- `ENABLE_ANSWERLATTICE_KNOWLEDGE_MAP`
- `ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT`

### Disabled / rollout-gated by default

- `ENABLE_ANSWERLATTICE_PUBLIC_API`
- `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SOURCE_SYNC`
- `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_NIGHTLY_SUMMARY`
- `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT_ACTIONS`
- `ENABLE_ANSWERLATTICE_INTAKE_NATIVE_CONNECTORS`
- `ENABLE_ANSWERLATTICE_SIGNAL_QUALITY`
- `ENABLE_ANSWERLATTICE_SOURCE_GOVERNANCE`
- `ENABLE_ANSWERLATTICE_WORKSPACE_LIFECYCLE`
- `ENABLE_ANSWERLATTICE_WHITE_LABEL`
- `ENABLE_ANSWERLATTICE_MULTI_LANGUAGE`
- `ENABLE_ANSWERLATTICE_HYBRID_EVIDENCE_RETRIEVAL`
- `ENABLE_ANSWERLATTICE_AI_ESCALATION`
- `ENABLE_ANSWERLATTICE_MCP`
- `ENABLE_ANSWERLATTICE_WIDGET_BUNDLE_BOOTSTRAP`
- `ENABLE_ANSWERLATTICE_EMAIL_OS_PROVIDER_SEND`
- `ENABLE_ANSWERLATTICE_WHATSAPP_OS_OWNER_NOTIFICATIONS`

### Enabled in Cloud Functions by default

- `ENABLE_ANSWERLATTICE_EMAIL_OS`
- `ENABLE_ANSWERLATTICE_WHATSAPP_OS`
- `ENABLE_ANSWERLATTICE_CHAT_ANALYTICS`
- `ENABLE_ANSWERLATTICE_NIGHTLY`
- `ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE`
- `ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE`
- `ENABLE_ANSWERLATTICE_TRUST_METRICS`
- `ENABLE_ANSWERLATTICE_FOUNDER_ONBOARDING`
- `ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS`
- `ENABLE_ANSWERLATTICE_TICKET_KNOWLEDGE`
- `ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH`
- `ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT`
- `ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE_SCHEDULER`
- `ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES`
- `ENABLE_ANSWERLATTICE_BUNDLE_BUILDER`

### Disabled in Cloud Functions by default

- `ENABLE_ANSWERLATTICE_EMAIL_OS_PROVIDER_SEND`
- `ENABLE_ANSWERLATTICE_WHATSAPP_OS_PROVIDER_SEND`
- `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SYNC`

`ENABLE_ANSWERLATTICE_INTAKE_NATIVE_CONNECTORS` and `ENABLE_ANSWERLATTICE_SIGNAL_QUALITY` have no runtime consumer in the audited source tree. Treat them as reserved placeholders, not implemented capabilities, until code and verification evidence exist. The EmailOS and WhatsAppOS owner-delivery flags have guarded runtime consumers but remain off until product-scoped provider onboarding and QA certification. All other disabled flags represent implemented or partially implemented surfaces that still require an explicit rollout decision and their documented gates.

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
- Compiled context bundles as the governed read distribution layer for enabled consumers. Public API preference is implemented behind rollout gates; MCP has a controlled explicit-scope runtime but remains disabled; widget bundle bootstrap remains disabled until the widget consumes those files.
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

**Source-Verified for Controlled Staging; Production Certification Pending**

Core Answerlattice flows are implemented and locally verifiable enough for controlled staging use:

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
- guided resolution (implemented; per-workspace widget opt-in remains off by default)
- multi-language
- advanced cross-surface white-label branding
- Jira integration
- native helpdesk connectors

Those features remain behind intentional rollout controls and should stay conservative in website copy unless enabled for a client.

Source implementation is not production evidence. The current production blockers are:

- the Answerlattice CI workflow is source-controlled, but no successful remote workflow run has been verified on this worktree;
- backup/recovery tooling and the runbook are source-controlled, but no cloud schedule, ready backup, or isolated restore rehearsal has been verified;
- the root full and production dependency audits require zero vulnerabilities after stable Next 16.3.0 moved its private PostCSS dependency to patched 8.5.23 and the compatible brace-expansion/fast-uri refresh closed the remaining new advisories. Fabric 7.4.0, Firebase Admin 14.2.0, Sharp 0.35.3, and the UUID 11.1.1 override remain guarded. `functions-answerlattice` stays separate on the stable modular Firebase Admin 13.10.0 / Firebase Functions 7.3.0 pair;
- QA Firebase deployment and Firebase-console TTL/migration state require cloud IAM and operator verification;
- browser/device/accessibility, live payment/provider, DNS/OAuth callback, and production telemetry journeys remain externally unverified;
- workspace closure/recovery/erasure is source-implemented behind a disabled internal flag, but QA deployment, cross-service rule readback, dedicated-Auth deletion, and disposable-workspace rehearsal are not yet production evidence;
- App Check remains an explicit external-client onboarding decision rather than a verified deployed control;
- the centralized scheduler is designed for the current small-workspace range but is not load-proven for 1,000+ simultaneously due workspaces.

### Hardening Priority Order

| Priority | Area | Current evidence | Required next action |
| --- | --- | --- | --- |
| P0 | Dependency and release gate | Stable Next 16.3.0 carries patched PostCSS 8.5.23; both root full and production audits are required to stay at zero. `.github/workflows/answerlattice-quality.yml` runs freeze, security, recovery, Functions, typecheck, readiness, runtime, rules, and emulator gates. | Obtain one successful remote CI run and keep the exact validated stable dependency freeze; do not force-downgrade Next or adopt a canary/preview. |
| P0 | Backup and recovery | Source tool and dedicated runbook enforce QA/prod project mapping, explicit apply confirmation, daily 14-week schedule intent, and new-database-only restores. No deployed schedule or restore evidence exists. | Install/authenticate `gcloud`, configure QA managed backups, rehearse an isolated restore, validate tenant and canonical lineage, reapply TTL, and record measured RPO/RTO plus separate Storage/Auth evidence. |
| P0 | Deployed-state proof | Source and emulator evidence exist; QA/prod rules, indexes, TTL, Functions, secrets, and migrations are not confirmed here | Restore Firebase access, run the scoped deployment/readback runbook, and verify deployed hashes/state before enabling client traffic. |
| P1 | Real-client answer evaluation | Answer Tests and quality controls are implemented; representative customer evaluation data is not repository-verifiable | Run a 50-100 question first-client set covering canonical hits, conflicts, abstention, citations, plan/version context, and regression blockers. |
| P1 | Workspace lifecycle rollout proof | Reviewed source, contract/rule tests, and a Firestore/Storage service emulator cover closure, access-only recovery, retained evidence, foreign-row preservation, and resumable erasure | Keep the flag off; deploy dedicated QA Firestore/Storage rules, verify Storage-to-Firestore rule access, and rehearse close/recover/erase with disposable workspace and dedicated staff Auth identities. |
| P1 | Browser and integration proof | Deterministic source tests exist; real browser, accessibility, widget-host, payment, email, DNS, OAuth, and provider journeys remain external | Complete controlled QA journeys on desktop/mobile and the first real client product before general availability. |
| P2 | Scheduler scale | Bounded single-instance scheduler is appropriate for current scale; 1,000+ due-workspace load is unproven | Add load evidence before replacing it with task fan-out; do not redesign early. |
| P2 | Rollout-gated surfaces | Public API, MCP, hybrid evidence, AI escalation, native connectors, autonomous actions, multilingual, and advanced white label remain off | Keep off until a named ICP workflow, security contract, quality gate, and paying-client evidence justify each rollout. |

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
- Manual draft regeneration and Product Surface summary rebuild browser requests now pin no-store cache, same-origin credentials, and manual redirect handling before existing bounded response acknowledgement checks.
