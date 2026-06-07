# Owner Business Assistant Documentation

**Feature Folder:** `__docs__/owner-business-assistant/`
**Owner-Facing Name:** Business Health
**Internal Slug:** owner-business-assistant
**Product:** MenuList
**Status:** Final plan freeze, implementation not started
**Last Updated:** June 7, 2026

---

## Decision

MenuList should add Business Health as an owner-facing operating surface, not as a generic chatbot.

The accepted product shape is:

1. A scheduler-built, compact store health read model.
2. A deterministic analytics period index for owner dashboard stats and questions such as today, this week, last week, this month, and last month.
3. A dashboard card, analytics strip, and full Business Health page that show the latest state before any chat.
4. Suggested owner questions answered from compact read models.
5. Free-text intent mapping only when the response can be grounded in approved facts.
6. Day-one Action Support with registry-driven navigation, draft preparation, confirmed writes, public-truth guards, feedback, and cleanup.
7. Separate kill switches: Business Health can remain read-only when Action Support is disabled.

The rejected product shape is:

1. Floating "ask anything" chatbot.
2. Chat-time scans of analytics, menu, feedback, review, or log collections.
3. Assistant-owned direct writes to public menu/store truth.
4. A new analytics collection for Business Health period questions.
5. Any plan that leaves Action Support outside the day-one implementation contract.
6. Public website hype about an assistant before implementation and proof.

## Validation Basis

The ChatGPT conversation was useful as product input, but it is not source of truth. This doc set validates it against:

- MenuList doctrine and language governance.
- Existing owner dashboard and mobile shell architecture.
- Existing scheduler and summary document patterns.
- Existing AI accounting, SAFE_MODE, rate limiting, and public cache invalidation paths.
- Firebase cost priority.
- Official market signals from [Stanford HAI AI Index 2026](https://hai.stanford.edu/ai-index/2026-ai-index-report/economy), [IBM 2025 CEO Study](https://newsroom.ibm.com/2025-05-06-ibm-study-ceos-double-down-on-ai-while-navigating-enterprise-hurdles), and [Meta Business Agent](https://about.fb.com/news/2026/06/meta-business-agent/). These links support the category trend only; they do not justify product claims or public copy by themselves.

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

## Implementation Readiness

This is a docs-only planning package. The implementation contract is complete, but no runtime code is changed by this package. The next implementation run must:

1. Add feature flags in `src/config/features.ts` and matching Cloud Functions flags where provider cost is possible.
2. Add shared constants/types without creating unnecessary Firestore collections.
3. Extend the scheduler-owned health read model and analytics period index.
4. Build protected current/analytics/answer APIs before frontend calls.
5. Build Action Support registry, draft, confirm, audit, permission, and cache paths in the same implementation.
6. Integrate desktop and mobile together.
7. Verify both kill-switch modes: read-only Business Health and Business Health with Action Support.
8. Run `npx tsc --noEmit --incremental false` and targeted QA before enablement.
