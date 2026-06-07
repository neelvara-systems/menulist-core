# Owner Business Assistant Implementation Plan

**Owner-Facing Name:** Business Health
**Internal Slug:** owner-business-assistant
**Product:** MenuList
**Status:** Planning complete, implementation not started
**Last Updated:** June 7, 2026

---

## 1. Architecture Summary

Owner Business Assistant has two day-one tracks:

```text
Business Health
  Existing settled sources
    -> scheduler-built health + analytics read models
    -> protected owner APIs
    -> dashboard card + analytics strip + desktop/mobile Business Health UI

Action Support
  Approved action registry
    -> protected action API
    -> draft/confirm/audit workflow
    -> existing domain services and public cache invalidation
```

The scheduler builds health facts and a standard analytics period index. APIs filter and resolve facts. UI presents state and analytics before chat. Actions route through an approved registry and existing domain services.

This plan is not split into separate delivery promises. All core capabilities are defined in one architecture. Feature flags only control runtime availability, environment rollout, cost exposure, and emergency disable.

See [owner-business-assistant_architecture.md](./owner-business-assistant_architecture.md) for the end-to-end data ownership and source-reuse cross-check.

## 1.1 End-to-End Data Flow

```text
platformSummary/storesSummary
  + platformSummary/projects_{sId}
  + analytics/*_dashboard_summary
  + analytics/*_daily_{today}
  + analytics/*_weekly_*
  + analytics/*_monthly_*
  + menuIntelligence
  + stores.health / stores.healthSignals
  + capped feedback/review/change/ops summaries
      -> functions/src/ownerBusinessAssistant source adapters
      -> platformSummary/ownerBusinessHealthCurrent_{tId}_{sId}
      -> platformSummary/ownerBusinessAnalyticsIndex_{tId}_{sId}
      -> platformSummary/ownerBusinessHealthSnapshot_{tId}_{sId}_{localDate}
      -> protected owner APIs
      -> BusinessHealthDashboardCard + analytics strip + BusinessHealthPage + MobileBusinessHealthScreen
      -> existing DAL/domain services for confirmed writes
      -> existing public cache invalidation when public truth changes
```

The answer API reads Business Health facts. It does not rebuild facts.

## 2. Feature Flags

Add flags in `src/config/features.ts`. These flags are runtime controls, not implementation sequencing.

```ts
ENABLE_OWNER_BUSINESS_HEALTH: false,
ENABLE_OWNER_BUSINESS_HEALTH_ANALYTICS_INDEX: false,
ENABLE_OWNER_BUSINESS_HEALTH_TODAY_OVERLAY: false,
ENABLE_OWNER_BUSINESS_HEALTH_DASHBOARD_CARD: false,
ENABLE_OWNER_BUSINESS_HEALTH_PAGE: false,
ENABLE_OWNER_BUSINESS_HEALTH_SUGGESTED_QUESTIONS: false,
ENABLE_OWNER_BUSINESS_HEALTH_FREE_TEXT: false,
ENABLE_OWNER_BUSINESS_HEALTH_THREADS: false,
ENABLE_OWNER_BUSINESS_HEALTH_USAGE_LOGGING: false,
ENABLE_OWNER_BUSINESS_HEALTH_MULTI_LOCATION: false,
ENABLE_OWNER_BUSINESS_HEALTH_POS_AWARE_ANSWERS: false,
ENABLE_OWNER_BUSINESS_ACTION_SUPPORT: false,
ENABLE_OWNER_BUSINESS_ACTION_NAVIGATION: false,
ENABLE_OWNER_BUSINESS_ACTION_DRAFTS: false,
ENABLE_OWNER_BUSINESS_ACTION_CONFIRMED_WRITES: false,
ENABLE_OWNER_BUSINESS_ACTION_PUBLIC_TRUTH: false,
ENABLE_OWNER_BUSINESS_ACTION_MEDIA: false,
ENABLE_OWNER_BUSINESS_ACTION_PROVIDER_TEXT: false,
ENABLE_OWNER_BUSINESS_ACTION_PROVIDER_IMAGE: false,
ENABLE_OWNER_BUSINESS_ACTION_CHECK_WORKFLOW: false,
```

Cloud Functions/provider-cost flags must be separate when provider-backed answers are enabled. Frontend flags do not protect server-side provider spend.

Existing precedent:

- `src/config/features.ts:903-920` keeps owner analytics provider wording off by default while deterministic read models still write.
- `src/config/features.ts:1571-1589` gates SAFE_MODE checks for expensive operations.

## 3. Constants and Types

Add shared type modules:

```text
src/lib/ownerBusinessAssistant/types.ts
src/lib/ownerBusinessAssistant/schemas.ts
src/lib/ownerBusinessAssistant/constants.ts
functions/src/ownerBusinessAssistant/types.ts
functions/src/ownerBusinessAssistant/constants.ts
```

The core read model uses existing `DB_COLLECTIONS.PLATFORM_SUMMARY`. Workflow collections for threads/actions/drafts/feedback get constants as part of the same day-one contract, but only protected API routes write them and each write path remains behind its dedicated runtime flag.

Primary document IDs:

```ts
export const getOwnerBusinessHealthCurrentDocId = (tId: string | number, sId: string | number) =>
  `ownerBusinessHealthCurrent_${tId}_${sId}`;

export const getOwnerBusinessHealthSnapshotDocId = (
  tId: string | number,
  sId: string | number,
  localDate: string,
) => `ownerBusinessHealthSnapshot_${tId}_${sId}_${localDate}`;

export const getOwnerBusinessAnalyticsIndexDocId = (tId: string | number, sId: string | number) =>
  `ownerBusinessAnalyticsIndex_${tId}_${sId}`;
```

## 4. Read Model Shape

```ts
export type OwnerBusinessHealthStatus =
  | 'stable'
  | 'watch'
  | 'needs_review'
  | 'insufficient_data'
  | 'stale'
  | 'not_ready';

export type OwnerBusinessHealthCurrentDoc = {
  version: 1;
  tId: string;
  sId: string;
  localDate: string;
  generatedAt: FirebaseFirestore.Timestamp;
  validThrough?: FirebaseFirestore.Timestamp;
  sourceWindow: {
    today?: string;
    lastSettledDate?: string;
    last7Days?: { start: string; end: string };
    last30Days?: { start: string; end: string };
    timeZone?: string;
  };
  status: OwnerBusinessHealthStatus;
  summary: {
    headline: string;
    ownerMessage: string;
    noActionNeeded: boolean;
    actionCount: number;
  };
  analyticsTeaser?: {
    today?: OwnerBusinessAnalyticsTeaser;
    thisWeek?: OwnerBusinessAnalyticsTeaser;
    topItem?: OwnerBusinessAnalyticsTeaser;
    analyticsIndexDocId: string;
  };
  blocks: {
    publicTruth?: OwnerBusinessHealthBlock;
    menuAttention?: OwnerBusinessHealthBlock;
    menuQuality?: OwnerBusinessHealthBlock;
    feedbackReviews?: OwnerBusinessHealthBlock;
    recentChanges?: OwnerBusinessHealthBlock;
    operations?: OwnerBusinessHealthBlock;
    account?: OwnerBusinessHealthBlock;
    multiLocation?: OwnerBusinessHealthBlock;
  };
  suggestedChecks: OwnerBusinessHealthCheck[];
  suggestedQuestions: OwnerBusinessHealthQuestion[];
  supportedIntents: OwnerBusinessAssistantIntent[];
  unsupportedData: Record<string, 'not_available' | 'not_enabled' | 'insufficient_data'>;
  sourceRefs: OwnerBusinessHealthSourceRef[];
  cost: {
    builderReadCount: number;
    builderWriteCount: number;
    chatHotPathReadCount: number;
  };
};
```

Analytics index shape:

```ts
export type OwnerBusinessAnalyticsIndexDoc = {
  version: 1;
  tId: string;
  sId: string;
  localDate: string;
  generatedAt: FirebaseFirestore.Timestamp;
  lastSettledLocalDate?: string;
  periods: {
    today?: OwnerBusinessAnalyticsPeriod;
    yesterday?: OwnerBusinessAnalyticsPeriod;
    thisWeek?: OwnerBusinessAnalyticsPeriod;
    lastWeek?: OwnerBusinessAnalyticsPeriod;
    thisMonth?: OwnerBusinessAnalyticsPeriod;
    lastMonth?: OwnerBusinessAnalyticsPeriod;
    last7Days?: OwnerBusinessAnalyticsPeriod;
    last30Days?: OwnerBusinessAnalyticsPeriod;
    overall?: OwnerBusinessAnalyticsPeriod;
  };
  unsupportedPeriods: Record<string, 'not_available' | 'not_enabled' | 'insufficient_data'>;
  sourceRefs: OwnerBusinessHealthSourceRef[];
  cost: {
    builderReadCount: number;
    hotPathReadCount: number;
  };
};
```

The analytics index is the answer source for owner questions about today, this week, last week, this month, last month, last 7 days, last 30 days, and overall. Runtime answer code must not aggregate daily docs for arbitrary periods.

Each answer must carry:

```ts
type OwnerAssistantAnswer = {
  answerId: string;
  status: 'answered' | 'refused' | 'needs_more_data';
  text: string;
  freshnessLabel: string;
  sourceFactIds: string[];
  cards?: OwnerAssistantCard[];
  actions?: OwnerAssistantActionOption[];
};
```

## 5. Scheduler Integration

Snapshot generation belongs in `functions/src/decisionBlocksScoring.ts` because this is store-local end-of-day analytics/intelligence work.

Existing evidence:

- `functions/src/decisionBlocksScoring.ts:26-55` owns precomputed store intelligence output.
- `functions/src/decisionBlocksScoring.ts:1073-1127` reads `platformSummary/storesSummary` once and filters stores.
- `functions/src/decisionBlocksScoring.ts:2044-2135` has manual store-level recovery for scheduler reruns.

Add modules:

```text
functions/src/ownerBusinessAssistant/buildOwnerBusinessHealthSnapshot.ts
functions/src/ownerBusinessAssistant/buildOwnerBusinessAnalyticsIndex.ts
functions/src/ownerBusinessAssistant/ownerBusinessHealthBlocks.ts
functions/src/ownerBusinessAssistant/ownerBusinessHealthSources.ts
functions/src/ownerBusinessAssistant/ownerBusinessHealthWriters.ts
functions/src/ownerBusinessAssistant/ownerBusinessHealthIntentFixtures.ts
functions/src/ownerBusinessAssistant/__tests__/buildOwnerBusinessHealthSnapshot.test.ts
```

Call the builder from the existing store scheduler path after settled analytics are available and before run completion logging.

Required insertion behavior:

1. Reuse the active project list loaded by the scheduler.
2. Reuse dashboard summary doc IDs and active/default project context already handled by the scheduler.
3. Build Business Health after pending settlement dates complete.
4. Build the analytics index from dashboard summary, `daily30d`, existing weekly/monthly docs, and optional today single-doc overlay.
5. If no settlement date is pending but the current doc or analytics index is missing/stale, rebuild from the latest summaries.
6. Add the builder result to existing scheduler task results.
7. Invoke the same builder path from `triggerStoreNightlyScheduler`.

Builder rules:

- Read compact summaries first.
- Cap every source that can grow.
- Write only when signature changed unless daily snapshot needs a new local date doc.
- Write current doc and daily snapshot doc.
- Write analytics index doc when the period signature changes.
- Record source availability and unsupported data explicitly.
- Never call provider models inside the snapshot builder by default.

## 6. Maintenance Scheduler Integration

Cleanup belongs in `functions/src/schedulers/menulistMaintenanceScheduler.ts`.

Existing evidence:

- `functions/src/schedulers/menulistMaintenanceScheduler.ts:1-7` owns lightweight maintenance with per-task cadence and leases.
- `functions/src/schedulers/menulistMaintenanceScheduler.ts:604-684` shows the static task registry and run loop.

Add maintenance tasks for workflow storage when those flags are enabled:

```text
owner_business_health_thread_cleanup
owner_business_health_action_draft_cleanup
owner_business_health_snapshot_cleanup
```

Do not add a new standalone scheduled Cloud Function.

## 7. API Routes

Use one protected route group with fewer endpoints than the ChatGPT proposal.

```text
src/app/api/owner-business-assistant/current/route.ts
src/app/api/owner-business-assistant/analytics/route.ts
src/app/api/owner-business-assistant/answer/route.ts
src/app/api/owner-business-assistant/thread/[threadId]/route.ts
src/app/api/owner-business-assistant/action/route.ts
src/app/api/owner-business-assistant/feedback/route.ts
```

Route behavior:

| Route | Method | Purpose | Firebase hot path |
| --- | --- | --- | --- |
| `/current` | GET | Return current Business Health state | 1 `platformSummary` read |
| `/analytics` | GET | Return standard analytics periods | 1 analytics-index read, optional 1 today doc |
| `/answer` | POST | Resolve suggested/free-text question | 1 current read; analytics intents add 1 analytics-index read and optional 1 today doc |
| `/thread/[threadId]` | GET | Load bounded history under the thread flag | 1 thread doc + capped messages query |
| `/action` | POST | Navigate, prepare, confirm, cancel, review, dismiss, assign | Depends on operation |
| `/feedback` | POST | Store small answer feedback | 1 compact write under usage/feedback flag |

All routes must derive tenant/store from session or verified selector context. Client-provided scope is advisory only.

## 8. API Security Pattern

Follow existing protected AI route pattern from `src/app/api/menu-card-export/design-advisor/route.ts:88-145`:

- Feature flag check.
- Valid session scope.
- SAFE_MODE only for provider/free-text expensive paths.
- Rate limit before provider or expensive action.
- `verifyTenantAccess()`.
- Zod validation.
- Security logging on invalid scope, tenant violation, and validation failures.

For provider-backed answers, follow `src/app/api/menu-card-export/design-advisor/route.ts:216-278`:

- Add a distinct `AI_ACTIONS_TYPES` value and unit-cost entries before enabling the route.
- Run provider.
- Finalize AI operation accounting.
- Return `remainingBalance`.
- Frontend service calls `syncBalanceFromResponse()` per `src/services/ai/balanceSync.ts:1-32`.

Do not write AI operation records for deterministic template answers with no provider call.

## 9. Answer Resolver

Add:

```text
src/lib/ownerBusinessAssistant/server/resolveOwnerBusinessAssistantAnswer.ts
src/lib/ownerBusinessAssistant/server/intentClassifier.ts
src/lib/ownerBusinessAssistant/server/factGrounding.ts
src/lib/ownerBusinessAssistant/server/analyticsPeriodResolver.ts
src/lib/ownerBusinessAssistant/server/answerTemplates.ts
src/lib/ownerBusinessAssistant/server/refusals.ts
```

Resolver order:

1. Load current health doc.
2. Check freshness.
3. Classify question into approved intent.
4. For analytics intents, load the analytics index and optional today overlay.
5. Verify required fact blocks or periods exist.
6. Render deterministic answer if possible.
7. Use provider formatting only when free-text flag, SAFE_MODE, rate limit, and accounting are all satisfied.
8. Attach freshness and source fact IDs.
9. Return supported action options.

Refusal examples:

- "MenuList does not have enough data for that yet."
- "MenuList can show customer attention, but it cannot estimate profit from the available data."
- "Open the publish screen to complete this change."

## 10. Action Service

Add:

```text
src/lib/ownerBusinessAssistant/actions/actionSchemas.ts
src/lib/ownerBusinessAssistant/actions/actionRegistry.ts
src/lib/ownerBusinessAssistant/actions/actionAccess.ts
src/lib/ownerBusinessAssistant/actions/actionTargetResolver.ts
src/lib/ownerBusinessAssistant/actions/actionDraftBuilder.ts
src/lib/ownerBusinessAssistant/actions/actionExecutor.ts
src/lib/ownerBusinessAssistant/actions/publicTruthActionGuard.ts
src/lib/ownerBusinessAssistant/actions/actionAuditLogger.ts
src/lib/ownerBusinessAssistant/actions/checkWorkflowService.ts
```

Action definitions must be registry-driven:

```ts
type OwnerBusinessActionDefinition = {
  actionType: string;
  ownerLabel: string;
  riskLevel: 'navigate' | 'draft' | 'confirmed_write' | 'public_truth' | 'blocked';
  requiredPermissions: string[];
  requiredFlags: string[];
  targetKinds: Array<'project' | 'menu_item' | 'category' | 'store' | 'media' | 'feedback' | 'review' | 'outlet' | 'billing'>;
  resolver: 'summary' | 'project_doc' | 'store_doc' | 'existing_api' | 'screen_route';
  draftSchema?: string;
  executor: string;
  cacheImpact: 'none' | 'project_public' | 'store_public' | 'screen_public';
  aiCostAction?: string;
};
```

Single `/action` route operation enum:

```ts
type OwnerBusinessAssistantActionOperation =
  | 'navigate'
  | 'prepare'
  | 'confirm'
  | 'cancel'
  | 'mark_reviewed'
  | 'dismiss'
  | 'assign';
```

Public-truth guard:

- Blocks if `ENABLE_OWNER_BUSINESS_ACTION_PUBLIC_TRUTH` is false.
- Requires owner/admin publish permission.
- Shows affected surface.
- Revalidates target.
- Uses existing domain services.
- Ensures cache invalidation is invoked.

Example registry entries:

| Action | Owner request | Execution contract |
| --- | --- | --- |
| `menu_item_price_set` | "Change Paneer Tikka to 220" | Resolve project/item, prepare patch, require confirm, save through existing project mutation path |
| `menu_item_price_bulk_adjust` | "Increase selected prices by 10%" | Reuse Command Center pricing transformation, show preview, require confirm |
| `menu_item_availability_set` | "Mark this sold out" | Reuse Command Center availability transformation, show preview, require confirm |
| `menu_item_visibility_set` | "Hide this item" | Reuse Command Center active/inactive transformation, show preview, require confirm |
| `menu_item_move_category` | "Move these to Specials" | Reuse Command Center move-category transformation, show preview, require confirm |
| `menu_item_description_prepare` | "Rewrite this description" | Use existing description generation/accounting, prepare text draft, require confirm before project save |
| `menu_item_image_generate_prepare` | "Generate image for this item" | Use existing image generation/accounting, store media reference only, require confirm before attach |
| `menu_item_image_attach_confirm` | "Use this image" | Use existing media upload/association path, require confirm |
| `open_publish_screen` | "Make it live" | Navigate to existing publish path unless public-truth flag allows in-assistant confirmation |
| `check_mark_reviewed` / `check_dismiss` | "Done" / "Ignore this" | Update compact assistant check workflow state under the check-workflow flag |

Confirmed writes from assistant code must not perform raw Firestore `setDoc()` to project/store public truth. If in-assistant confirmed writes are enabled, create a server-safe mutation adapter that preserves the current `updateProject()` invariants: validation, sanitization, MCE/change detection, multi-outlet behavior, menu change logging, and public cache invalidation.

## 11. Flag-Gated Action/Thread Storage

Core Business Health does not require chat transcripts for suggested questions. To minimize Firebase cost:

- Suggested-question answers can be stateless.
- Usage can be aggregate-only.
- Thread persistence is a flag-gated path controlled by `ENABLE_OWNER_BUSINESS_HEALTH_THREADS`.
- Action draft/audit writes are controlled by `ENABLE_OWNER_BUSINESS_ACTION_*` flags.

Use compact collections:

```text
ownerBusinessAssistantThreads/{threadId}
ownerBusinessAssistantMessages/{threadId}_{messageId}
ownerBusinessAssistantActions/{actionId}
ownerBusinessAssistantDrafts/{draftId}
ownerBusinessAssistantFeedback/{feedbackId}
```

Retention:

- Threads: 30 days.
- Messages: 30 days.
- Drafts: 7 days or until confirmed/cancelled.
- Actions: 90 days compact audit, unless tied to public-truth audit.
- Feedback: 90 days aggregate after review.

The read-only Business Health track must not depend on action, draft, or message writes.

## 12. Usage Logging

Do not directly reuse `trackOwnerControlUsage()` without extending its type contract.

Current evidence:

- `src/database/ownerControlUsage/index.ts:61-69` only supports decision-block/screen control types.
- `src/database/ownerControlUsage/index.ts:116-170` debounces writes and gates on `ENABLE_OWNER_ANALYTICS`.

Options:

1. Extend `OwnerControlType` with assistant action events and document the change.
2. Add a separate server-side aggregate usage writer for Business Health.

Cost-first usage implementation:

- Server-side aggregate usage update only for value events.
- Do not log every message as success.
- Track: card opened, check opened, question answered, action prepared, action confirmed, feedback submitted.

## 13. Desktop UI

Route:

```text
src/app/(main)/business-health/page.tsx
```

Components:

```text
src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthDashboardCard.tsx
src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthAnalyticsStrip.tsx
src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthPage.tsx
src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthHeader.tsx
src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthSummaryCard.tsx
src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthPriorityChecks.tsx
src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthSuggestedQuestions.tsx
src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantPanel.tsx
src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantMessageList.tsx
src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantInput.tsx
src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantActionSheet.tsx
src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantFreshnessLabel.tsx
src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantSourceDisclosure.tsx
```

Dashboard placement:

- Add `BusinessHealthDashboardCard` near the top of the owner dashboard.
- The card is useful without chat and includes 2-3 compact analytics facts.
- Add `BusinessHealthAnalyticsStrip` near the existing owner dashboard analytics area when the analytics index flag is enabled.
- It opens `/business-health`.

Existing fit:

- `src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx:1-21` already defines owner dashboard as answers and confidence, not raw analytics.
- `src/components/templates/main-app/dashboard/OwnerDashboard/HealthSignalCards.tsx:139-157` already uses Business Health as a calm signal.

## 14. Mobile UI

Mobile route mapping must stay inside `MobileShell`.

Add:

- `/business-health` to `OWNER_PATH_TO_MOBILE_ROUTE` in `src/components/mobile/MobileShell.tsx`.
- `businessHealth` to `MoreSubScreen` in `src/components/mobile/screens/MobileMoreScreen.tsx`, or add a Today sub-screen if the final placement is Today.
- A mobile Business Health screen that uses the existing mobile provider contract.

Evidence:

- `src/components/mobile/MobileShell.tsx:34-55` maps owner routes into mobile state.
- `src/components/mobile/MobileShell.tsx:217-260` builds hash state and controls selected project loading.
- `src/components/mobile/MobileShell.tsx:448-520` renders mobile screens inside shared mobile providers.

See [owner-business-assistant_mobile-support.md](./owner-business-assistant_mobile-support.md).

## 15. Frontend Hooks

Add:

```text
src/hooks/ownerBusinessAssistant/useOwnerBusinessHealthCurrent.ts
src/hooks/ownerBusinessAssistant/useOwnerBusinessAnalyticsIndex.ts
src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantAnswer.ts
src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantThread.ts
src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantAction.ts
src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantFeedback.ts
```

Use SWR/local component state. Do not put messages in Redux unless an existing global route contract forces it.

Frontend must not write directly to assistant/action/thread collections. All writes go through protected API routes.

## 16. Public Cache Invalidation

For confirmed writes touching public output:

- Project/browser DAL paths must use `revalidatePublicClientCacheForProject()` or existing equivalent.
- Store/server paths must revalidate `menu-store-{storeId}`, `store-{storeId}`, `client-stores`, and `screen-data` when applicable.
- Assistant code must not create a new cache path.

Evidence:

- `src/lib/cache/publicClientCache.ts:19-80`
- `src/lib/actions/revalidateMenuCache.ts:20-24`
- `src/app/api/revalidate/menu/route.ts:31-78`

## 17. Public Website and Routes

Do not add routes under:

- `src/app/client/*`
- `src/app/(website)/*`
- `src/app/sites/answerlattice/*`
- `src/app/sites/canonica/*`

The feature is authenticated owner/admin app only.

## 18. Implementation Order

This is an engineering order. Every item belongs to the day-one implementation contract.

1. Add docs-approved flags and constants.
2. Add shared schema/types.
3. Add scheduler health builder and analytics-index builder with unit tests.
4. Add current and analytics APIs with server-side read/filter.
5. Add deterministic answer resolver for suggested and analytics questions.
6. Add desktop dashboard card, analytics strip, and full page.
7. Add MobileShell mapping and mobile screen.
8. Add action registry and route for navigate/prepare/confirm/cancel/review/dismiss.
9. Add confirmed writes with public-truth guard and server mutation adapter tests.
10. Add provider-backed free text with SAFE_MODE, rate limit, accounting, unit-cost metadata, and balance sync.
11. Add cleanup tasks for persistent thread/action docs under their flags.
12. Update docs from implementation truth.

## 19. Verification Commands

After implementation:

```bash
npx tsc --noEmit --incremental false
npm run lint
```

Targeted tests should include:

```bash
npm test -- ownerBusinessHealth
```

If Firebase Functions code changes, deploy the matching Firebase function target after validation per repo rule.
