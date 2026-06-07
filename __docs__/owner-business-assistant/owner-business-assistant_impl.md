# Owner Business Assistant Implementation Plan

**Owner-Facing Name:** Business Health
**Internal Slug:** owner-business-assistant
**Product:** MenuList
**Status:** Planning complete, implementation not started
**Last Updated:** June 7, 2026

---

## 1. Architecture Summary

Business Health has four layers:

```text
Existing settled sources
  -> scheduler-built Business Health read model
  -> protected owner APIs
  -> desktop/mobile Business Health UI
```

The scheduler builds facts. APIs filter and resolve facts. UI presents state before chat. Actions route through existing domain services.

This plan is not split into product phases. All core capabilities are defined in one architecture. Feature flags only control runtime availability, environment rollout, cost exposure, and emergency disable.

See [owner-business-assistant_architecture.md](./owner-business-assistant_architecture.md) for the end-to-end data ownership and source-reuse cross-check.

## 1.1 End-to-End Data Flow

```text
platformSummary/storesSummary
  + platformSummary/projects_{sId}
  + analytics/*_dashboard_summary
  + menuIntelligence
  + stores.health / stores.healthSignals
  + capped feedback/review/change/ops summaries
      -> functions/src/ownerBusinessAssistant source adapters
      -> platformSummary/ownerBusinessHealthCurrent_{tId}_{sId}
      -> platformSummary/ownerBusinessHealthSnapshot_{tId}_{sId}_{localDate}
      -> protected owner APIs
      -> BusinessHealthDashboardCard + BusinessHealthPage + MobileBusinessHealthScreen
      -> existing DAL/domain services for confirmed writes
      -> existing public cache invalidation when public truth changes
```

The answer API reads Business Health facts. It does not rebuild facts.

## 2. Feature Flags

Add flags in `src/config/features.ts`. These flags are runtime controls, not implementation phases.

```ts
ENABLE_OWNER_BUSINESS_HEALTH: false,
ENABLE_OWNER_BUSINESS_HEALTH_DASHBOARD_CARD: false,
ENABLE_OWNER_BUSINESS_HEALTH_PAGE: false,
ENABLE_OWNER_BUSINESS_HEALTH_SUGGESTED_QUESTIONS: false,
ENABLE_OWNER_BUSINESS_HEALTH_FREE_TEXT: false,
ENABLE_OWNER_BUSINESS_HEALTH_ACTIONS: false,
ENABLE_OWNER_BUSINESS_HEALTH_PREPARE_ACTIONS: false,
ENABLE_OWNER_BUSINESS_HEALTH_CONFIRMED_WRITES: false,
ENABLE_OWNER_BUSINESS_HEALTH_PUBLIC_TRUTH_PUBLISH: false,
ENABLE_OWNER_BUSINESS_HEALTH_THREADS: false,
ENABLE_OWNER_BUSINESS_HEALTH_USAGE_LOGGING: false,
ENABLE_OWNER_BUSINESS_HEALTH_MULTI_LOCATION: false,
ENABLE_OWNER_BUSINESS_HEALTH_POS_AWARE_ANSWERS: false,
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

The core read model uses existing `DB_COLLECTIONS.PLATFORM_SUMMARY`. Workflow collections for threads/actions/drafts/feedback get constants only when their protected API routes are implemented and rules/retention are documented in the same pass.

Primary document IDs:

```ts
export const getOwnerBusinessHealthCurrentDocId = (tId: string | number, sId: string | number) =>
  `ownerBusinessHealthCurrent_${tId}_${sId}`;

export const getOwnerBusinessHealthSnapshotDocId = (
  tId: string | number,
  sId: string | number,
  localDate: string,
) => `ownerBusinessHealthSnapshot_${tId}_${sId}_${localDate}`;
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
functions/src/ownerBusinessAssistant/ownerBusinessHealthBlocks.ts
functions/src/ownerBusinessAssistant/ownerBusinessHealthSources.ts
functions/src/ownerBusinessAssistant/ownerBusinessHealthWriters.ts
functions/src/ownerBusinessAssistant/ownerBusinessHealthIntentFixtures.ts
functions/src/ownerBusinessAssistant/__tests__/buildOwnerBusinessHealthSnapshot.test.ts
```

Call the builder from the existing store scheduler path after settled analytics are available and before run completion logging.

Required insertion behavior:

1. Reuse the active project list loaded by the scheduler.
2. Reuse dashboard summary doc IDs recorded in the existing analytics index.
3. Build Business Health after pending settlement dates complete.
4. If no settlement date is pending but the current doc is missing/stale, rebuild from the latest settled summaries.
5. Add the builder result to existing scheduler task results.
6. Invoke the same builder path from `triggerStoreNightlyScheduler`.

Builder rules:

- Read compact summaries first.
- Cap every source that can grow.
- Write only when signature changed unless daily snapshot needs a new local date doc.
- Write current doc and daily snapshot doc.
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
src/app/api/owner-business-assistant/answer/route.ts
src/app/api/owner-business-assistant/thread/[threadId]/route.ts
src/app/api/owner-business-assistant/action/route.ts
src/app/api/owner-business-assistant/feedback/route.ts
```

Route behavior:

| Route | Method | Purpose | Firebase hot path |
| --- | --- | --- | --- |
| `/current` | GET | Return current Business Health state | 1 `platformSummary` read |
| `/answer` | POST | Resolve suggested/free-text question | 1 current read, conditional bounded thread read/write |
| `/thread/[threadId]` | GET | Load bounded history when thread mode is enabled | 1 thread doc + capped messages query |
| `/action` | POST | Navigate, prepare, confirm, cancel, review, dismiss, assign | Depends on operation |
| `/feedback` | POST | Store small answer feedback | 1 write if enabled |

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
src/lib/ownerBusinessAssistant/server/answerTemplates.ts
src/lib/ownerBusinessAssistant/server/refusals.ts
```

Resolver order:

1. Load current health doc.
2. Check freshness.
3. Classify question into approved intent.
4. Verify required fact blocks exist.
5. Render deterministic answer if possible.
6. Use provider formatting only when free-text flag, SAFE_MODE, rate limit, and accounting are all satisfied.
7. Attach freshness and source fact IDs.
8. Return supported action options.

Refusal examples:

- "MenuList does not have enough data for that yet."
- "MenuList can show customer attention, but it cannot estimate profit from the available data."
- "Open the publish screen to complete this change."

## 10. Action Service

Add:

```text
src/lib/ownerBusinessAssistant/actions/actionSchemas.ts
src/lib/ownerBusinessAssistant/actions/actionAccess.ts
src/lib/ownerBusinessAssistant/actions/actionTargetResolver.ts
src/lib/ownerBusinessAssistant/actions/actionDraftBuilder.ts
src/lib/ownerBusinessAssistant/actions/actionExecutor.ts
src/lib/ownerBusinessAssistant/actions/publicTruthActionGuard.ts
src/lib/ownerBusinessAssistant/actions/actionAuditLogger.ts
src/lib/ownerBusinessAssistant/actions/checkWorkflowService.ts
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

- Blocks if `ENABLE_OWNER_BUSINESS_HEALTH_PUBLIC_TRUTH_PUBLISH` is false.
- Requires owner/admin publish permission.
- Shows affected surface.
- Revalidates target.
- Uses existing domain services.
- Ensures cache invalidation is invoked.

## 11. Conditional Action/Thread Storage

Core Business Health does not require chat transcripts for suggested questions. To minimize Firebase cost:

- Suggested-question answers can be stateless.
- Usage can be aggregate-only.
- Thread persistence is a runtime mode controlled by flags.

When enabled, use compact collections:

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

The implementation may reduce this further if all launch behavior can be stateless plus aggregate logs.

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
- The card is useful without chat.
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

This is an engineering order, not a product phase plan.

1. Add docs-approved flags and constants.
2. Add shared schema/types.
3. Add scheduler builder with unit tests.
4. Add current API with server-side read/filter.
5. Add deterministic answer resolver for suggested questions.
6. Add desktop dashboard card and full page.
7. Add MobileShell mapping and mobile screen.
8. Add action route for navigate/prepare.
9. Add confirmed writes only after public-truth guard tests.
10. Add provider-backed free text with SAFE_MODE, rate limit, accounting, unit-cost metadata, and balance sync.
11. Add cleanup tasks if persistent thread/action docs are enabled.
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
