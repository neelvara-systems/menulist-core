# Owner Business Assistant Documentation

**Feature Folder:** `__docs__/owner-business-assistant/`
**Owner-Facing Name:** Business Health
**Internal Slug:** owner-business-assistant
**Product:** MenuList
**Status:** Implemented behind feature flags; Firebase rules/functions deployed
**Last Updated:** June 8, 2026

---

## Decision

MenuList should add Business Health as an owner-facing operating surface, not as a generic chatbot.

The accepted product shape is:

1. A scheduler-built, compact store health read model.
2. A deterministic analytics period index for owner dashboard stats and questions such as today, this week, last week, this month, and last month.
   The index is store-scoped and includes bounded per-menu summaries, so selected-menu questions do not need a new collection or live project scan.
3. A cache-first Business Health context packet served from browser cache or server cache before any Firebase read.
4. Non-analytics questions use compact facts already present in the context packet; when public project/store facts are added, they must come from existing cached projections instead of raw project/store reads.
5. A domain capability matrix covering analytics, menu/project, store profile, public links, QR/share, screens, feedback/reviews, locations, billing, users, POS, compliance, and unsupported external web/local-event questions.
6. A dashboard card, analytics strip, and full Business Health page that show the latest state before any chat.
7. AI answering for typed owner questions, using only the cached context packet and returning structured, server-validated output.
8. Structured answer artifacts: text, metric rows, compact tables, trend series, and action options.
9. Suggested owner questions answered through the same packet contract: starter questions are deterministic and packet-ranked; answer follow-ups reuse the same answer call and deterministic fallback when provider answering is disabled or unavailable.
10. Day-one Action Support with registry-driven navigation, compact draft preparation, existing-screen handoff for public-truth saves, public-truth guards, feedback, and cleanup.
11. Optional bounded owner chat history behind `ENABLE_OWNER_BUSINESS_HEALTH_THREADS`.
12. Compact multi-location Business Health summary for multi-store tenants without loading every store's detailed packet.
13. Internal platform monitoring behind `ENABLE_OWNER_BUSINESS_HEALTH_USAGE_LOGGING` for answer quality, unsupported gaps, source coverage, route reads/writes, action usage, feedback, and provider-cost review.
14. Explicit Business Health packet invalidation tied to public-truth writes and scheduler rebuilds.
15. Separate kill switches: Business Health can remain read-only when Action Support is disabled.

The rejected product shape is:

1. Floating "ask anything" chatbot.
2. Chat-time scans of analytics, menu, feedback, review, or log collections.
3. Assistant-owned direct writes to public menu/store truth.
4. A new analytics collection for Business Health period questions.
5. Firebase-first reads for every owner question when a valid cache packet exists.
6. Live full project/store reads for ordinary read-only questions.
7. Runtime external web/weather/events/competitor search from the answer route.
8. Raw Firebase collection data passed directly to the AI model.
9. Any plan that leaves Action Support outside the day-one implementation contract.
10. Always-on long transcript storage or token-by-token message writes.
11. Public website hype about an assistant before implementation and proof.

## Validation Basis

The ChatGPT conversation was useful as product input, but it is not source of truth. This doc set validates it against:

- MenuList doctrine and language governance.
- Existing owner dashboard and mobile shell architecture.
- Existing scheduler and summary document patterns.
- Existing AI accounting, SAFE_MODE, rate limiting, and public cache invalidation paths.
- Existing SWR/localStorage dashboard cache and existing Upstash dependency.
- Firebase cost priority.
- Official market signals from [Shopify Sidekick](https://help.shopify.com/en/manual/shopify-admin/productivity-tools/sidekick), [Square AI](https://squareup.com/help/us/en/article/8516-use-ask-ai-to-get-insights-about-your-business), [Lightspeed AI](https://www.lightspeedhq.com/news/lightspeed-commerce-launches-lightspeed-ai-a-new-ai-powered-intelligence-layer-for-retail-and-hospitality/), [Wix AI Assistant](https://support.wix.com/en/article/growing-your-site-traffic-with-the-home-ai-assistant), [Meta Business Agent](https://about.fb.com/news/2026/06/meta-business-agent/), [Stanford HAI AI Index 2026](https://hai.stanford.edu/ai-index/2026-ai-index-report/economy), and [IBM 2025 CEO Study](https://newsroom.ibm.com/2025-05-06-ibm-study-ceos-double-down-on-ai-while-navigating-enterprise-hurdles). These links support pattern validation only; they do not justify product claims or public copy by themselves.

## Document Map

| Doc | Purpose |
| --- | --- |
| [owner-business-assistant_spec.md](./owner-business-assistant_spec.md) | Product requirements, scope, guardrails, owner value, accepted/rejected behavior |
| [owner-business-assistant_architecture.md](./owner-business-assistant_architecture.md) | End-to-end architecture cross-check, analytics index, action registry, data ownership, function logic, reuse decisions |
| [owner-business-assistant_business-health.md](./owner-business-assistant_business-health.md) | Dedicated day-one read-only health/analytics track and flags |
| [owner-business-assistant_action-support.md](./owner-business-assistant_action-support.md) | Dedicated day-one action catalog, action flags, reuse rules, mutation guardrails |
| [owner-business-assistant_impl.md](./owner-business-assistant_impl.md) | Implementation blueprint: flags, scheduler, APIs, services, UI, actions, security |
| [owner-business-assistant_firebase.md](./owner-business-assistant_firebase.md) | Firestore, Cloud Functions, Storage, AI, cache, and cost model |
| [owner-business-assistant_mobile-support.md](./owner-business-assistant_mobile-support.md) | MobileShell, touch UX, bottom sheets, route mapping, mobile QA |
| [owner-business-assistant_test-cases.md](./owner-business-assistant_test-cases.md) | Unit, API, scheduler, UI, mobile, red-team, and manual QA |
| [owner-business-assistant_marketing.md](./owner-business-assistant_marketing.md) | Internal positioning, sales narrative, allowed and rejected language |
| [owner-business-assistant_website.md](./owner-business-assistant_website.md) | Public website decision and post-implementation copy constraints |
| [owner-business-assistant_helpdoc.md](./owner-business-assistant_helpdoc.md) | Owner help article draft for after implementation |
| [owner-business-assistant_validation.md](./owner-business-assistant_validation.md) | Implementation validation, deploy notes, cost/security checks |
| [_archive/chatgpt-review.md](./_archive/chatgpt-review.md) | Conversation cross-check and adoption/rejection matrix |

## Source Evidence

| Evidence | Why it matters |
| --- | --- |
| `src/database/ownerDashboard/index.ts:1-23` | Owner dashboard already reads precomputed analytics, not raw live analytics on every view. |
| `functions/src/analytics/dashboardSummaryAggregation.ts:1468-1692` | Existing scheduler summary writes `daily30d`, WTD/MTD, weekly/monthly/overall dashboard packets, and the 7-day intelligence snapshot. |
| `functions/src/aggregateCustomerAnalytics.ts:785-895` | Existing analytics aggregation writes weekly and monthly rollup docs from dashboard-summary cache or bounded rebuilds. |
| `src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx:1-21` | Owner dashboard contract is "Answers, not data. Confidence, not insight." |
| `src/components/templates/main-app/dashboard/OwnerDashboard/HealthSignalCards.tsx:3-17` | Existing Business Health wording already exists as a calm health signal. |
| `functions/src/decisionBlocksScoring.ts:26-55` | Store intelligence is already scheduler-computed into owner/customer output. |
| `functions/src/decisionBlocksScoring.ts:1073-1127` | Scheduler uses `platformSummary/storesSummary` for 1-read store selection. |
| `functions/src/schedulers/menulistMaintenanceScheduler.ts:1-7` | Operational maintenance belongs in one consolidated scheduler with leases. |
| `firestore.rules:137-170` | `platformSummary` direct client access is restricted; Business Health should be read through protected APIs. |
| `src/lib/cache/publicClientCache.ts:19-80` | Client-side public cache invalidation path exists for project/store truth writes. |
| `src/hooks/useOwnerDashboard.ts:55-83` | Owner dashboard already uses 24-hour scheduler-data caching and a 10-minute live-today cache. |
| `src/hooks/useOwnerDashboard.ts:178-220` | Dashboard data reads use cached fetchers with fallback data before new reads. |
| `src/lib/cache/swrLocalStorageProvider.ts:1-14` | SWR cache persists scheduler-generated data across refreshes/sessions. |
| `src/lib/answerlattice/instantCache.ts:2-16` | Existing Upstash-backed instant-cache pattern can inform server-side cache shape without adding a dependency. |
| `src/database/projects/index.ts:830-889` | Project saves already enforce the public-truth invariant and cache invalidation; assistant actions must not bypass it. |
| `src/components/templates/main-app/projects/editorView/CommandCenterModal/utils/bulkOperations.ts:273-414` | Existing pure functions support price, availability, move category, and show/hide transformations without new writes. |
| `src/components/templates/main-app/projects/editorView/CommandCenterModal/index.tsx:484-529` | Existing Command Center applies changes through preview-first action state and editor persistence. |
| `src/components/templates/main-app/projects/editorView/descriptionGeneration.shared.ts:130-160` | Description generation already prepares project updates through the existing project save path. |
| `src/components/templates/main-app/projects/editorView/descriptionGeneration.shared.ts:180-285` | Single-item add/rewrite description flow already protects manual descriptions. |
| `src/database/projects/index.ts:1469-1515` | Existing media upload path prepares and stores item/project images; assistant image actions should reuse it and store references only. |
| `src/components/templates/main-app/projects/editorView/utils/associateItemImages.ts:1-51` | Existing item-image association uploads prepared media and updates the project object for normal persistence. |
| `src/lib/actions/revalidateMenuCache.ts:20-24` | Server cache tags for public menu/store/client store output are known. |
| `src/app/api/revalidate/menu/route.ts:31-78` | Public revalidation API includes menu, store, client-store, and screen-data tags. |
| `src/app/api/menu-card-export/design-advisor/route.ts:88-145` | Protected AI API pattern: feature flags, SAFE_MODE, rate limit, tenant access, validation, security logging. |
| `src/lib/ai/accounting.ts:20-67` | Paid provider calls must be recorded and consume capacity after success. |
| `src/services/ai/balanceSync.ts:1-32` | AI APIs returning `remainingBalance` avoid an extra frontend Firestore read. |
| `src/components/mobile/MobileShell.tsx:34-55` | Owner routes map into MobileShell tab/sub-screen state. |
| `src/components/mobile/MobileShell.tsx:448-520` | Owner mobile screens render inside shared mobile providers. |
| `src/components/mobile/screens/MobileMoreScreen.tsx:146-182` | New mobile More sub-screen requires explicit union and render integration. |
| `src/database/ownerControlUsage/index.ts:61-69` | Current owner usage event types do not include assistant events; docs must not pretend this helper already covers them. |

## Implementation Status

Runtime code is now enabled for owner testing behind separate safety flags.

Implemented surfaces:

1. Feature flags in `src/config/features.ts` and Cloud Functions flags in `functions/src/constants/features.ts`.
2. Shared constants, schemas, types, server context-packet builder, deterministic answer resolver, domain matrix, and action registry/executor.
3. Scheduler-built `platformSummary/ownerBusinessHealthCurrent_{tId}_{sId}`, daily snapshots, and optional `ownerBusinessAnalyticsIndex_{tId}_{sId}`.
4. Protected APIs under `/api/owner-business-assistant/*` with auth, tenant checks, permissions, rate limits, Zod validation, SAFE_MODE for AI answers, and Admin SDK access.
5. Desktop dashboard card, analytics strip, full `/business-health` route, packet-ranked starter questions, answer follow-up questions, source/freshness disclosure, and action chips.
6. MobileShell More sub-screen, `/business-health` route mapping, and mobile Business Health screen.
7. Action Support registry for navigation, drafts, check review/dismiss/cancel, audit logging, permission gates, and public-truth guardrails.
8. Optional bounded thread-doc history, internal answer-event logging, source coverage metrics, and platform monitor at `/platform/owner-business-assistant`.
9. Compact `/api/owner-business-assistant/locations` route backed by `platformSummary/ownerBusinessHealthMultiLocation_{tId}`.
10. Server-only Firestore rules for assistant workflow collections and consolidated maintenance cleanup.

Current default posture:

- Owner-testable Business Health and Action Support flags are enabled; provider-backed AI answers, confirmed writes, public-truth mutation, and image/media actions remain disabled for cost and safety.
- Business Health can be enabled independently from Action Support.
- Action Support can be enabled without public-truth direct mutation.
- Public menu/store writes remain guarded; assistant-owned public-truth writes are blocked and existing MenuList screens remain the save path.
- Public website copy remains unchanged until enablement and runtime QA proof.

Validation record: [owner-business-assistant_validation.md](./owner-business-assistant_validation.md).
