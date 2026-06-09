# Owner Business Assistant Implementation Plan

**Owner-Facing Name:** Business Health
**Internal Slug:** owner-business-assistant
**Product:** MenuList
**Status:** Implemented behind feature flags
**Last Updated:** June 8, 2026

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
  + cached public project/store projection facts only when already present
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
      -> existing screens/domain services for public-truth saves
      -> existing public cache invalidation when public truth changes
```

The answer API reads Business Health facts. It does not rebuild facts.

Read-only owner questions must use `OwnerBusinessAssistantContextPacket` or existing cached projections. The answer resolver may not read raw project, store, feedback, review, analytics, or log collections just because a question mentions that domain. If a fact is missing, the resolver returns an unsupported/needs-more-data answer. Confirmed actions are different: they use existing mutation services, and those services may read the current target inside the write path before committing.

The frontend may pass advisory page context such as current route, selected project, selected item, selected outlet, and visible entity labels. This improves "this item" and "open this screen" prompts, but the server must never trust it as authority. The server resolves the final target from session scope and packet facts before answering or preparing an action.

## 2. Feature Flags

Add flags in `src/config/features.ts`. These flags are runtime controls, not implementation sequencing.

```ts
ENABLE_OWNER_BUSINESS_HEALTH: true,
ENABLE_OWNER_BUSINESS_HEALTH_ANALYTICS_INDEX: true,
ENABLE_OWNER_BUSINESS_HEALTH_TODAY_OVERLAY: true,
ENABLE_OWNER_BUSINESS_HEALTH_DASHBOARD_CARD: true,
ENABLE_OWNER_BUSINESS_HEALTH_PAGE: true,
ENABLE_OWNER_BUSINESS_HEALTH_SUGGESTED_QUESTIONS: true,
ENABLE_OWNER_BUSINESS_HEALTH_FREE_TEXT: true,
ENABLE_OWNER_BUSINESS_HEALTH_AI_ANSWERS: false,
ENABLE_OWNER_BUSINESS_HEALTH_CONTEXT_PACKET_CACHE: true,
ENABLE_OWNER_BUSINESS_HEALTH_UPSTASH_CONTEXT_CACHE: true,
ENABLE_OWNER_BUSINESS_HEALTH_THREADS: true,
ENABLE_OWNER_BUSINESS_HEALTH_USAGE_LOGGING: true,
ENABLE_OWNER_BUSINESS_HEALTH_MULTI_LOCATION: true,
ENABLE_OWNER_BUSINESS_HEALTH_POS_AWARE_ANSWERS: false,
ENABLE_OWNER_BUSINESS_ACTION_SUPPORT: true,
ENABLE_OWNER_BUSINESS_ACTION_NAVIGATION: true,
ENABLE_OWNER_BUSINESS_ACTION_DRAFTS: true,
ENABLE_OWNER_BUSINESS_ACTION_CONFIRMED_WRITES: false,
ENABLE_OWNER_BUSINESS_ACTION_PUBLIC_TRUTH: false,
ENABLE_OWNER_BUSINESS_ACTION_MEDIA: false,
ENABLE_OWNER_BUSINESS_ACTION_PROVIDER_TEXT: false,
ENABLE_OWNER_BUSINESS_ACTION_PROVIDER_IMAGE: false,
ENABLE_OWNER_BUSINESS_ACTION_CHECK_WORKFLOW: true,
```

Cloud Functions/provider-cost flags must be separate when provider-backed answers are enabled. Frontend flags do not protect server-side provider spend. Context-packet cache flags control read cost only; they do not authorize provider calls.

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
	  supportedDomains?: OwnerBusinessAssistantDomainCapability[];
	  answerArtifacts?: OwnerAssistantAnswerArtifact[];
	  unsupportedData: Record<string, 'not_available' | 'not_enabled' | 'insufficient_data'>;
	  sourceRefs: OwnerBusinessHealthSourceRef[];
	  cost: {
    builderReadCount: number;
    builderWriteCount: number;
    chatHotPathReadCount: number;
  };
};
```

Answer artifact shape:

```ts
type OwnerAssistantAnswerArtifact =
  | { type: 'text'; body: string }
  | { type: 'metric_row'; metrics: Array<{ label: string; value: string; deltaLabel?: string }> }
  | { type: 'compact_table'; columns: string[]; rows: string[][]; maxRows: number }
  | { type: 'trend_series'; label: string; points: Array<{ label: string; value: number }> }
  | { type: 'action_options'; actions: OwnerBusinessAssistantActionOption[] };
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
  projectScope?: {
    totalActiveProjects: number;
    indexedProjectCount: number;
    indexedProjectIds: string[];
    overflowProjectCount?: number;
    defaultProjectId?: string;
  };
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
  projectSummaries?: Record<string, OwnerBusinessProjectAnalyticsSummary>;
  unsupportedPeriods: Record<string, 'not_available' | 'not_enabled' | 'insufficient_data'>;
  sourceRefs: OwnerBusinessHealthSourceRef[];
  cost: {
    builderReadCount: number;
    hotPathReadCount: number;
  };
};
```

The analytics index is the answer source for owner questions about today, this week, last week, this month, last month, last 7 days, last 30 days, and overall. Runtime answer code must not aggregate daily docs for arbitrary periods.

Project/store scope rules:

- `ownerBusinessAnalyticsIndex_{tId}_{sId}` remains one store-scoped document.
- `periods` is the aggregate across indexed active projects for the current store.
- `projectSummaries[projectId].periods` contains the selected-menu view.
- The builder indexes active projects default-first and caps indexed projects at 10 to keep the document and scheduler reads bounded.
- If a selected `projectId` is not in `projectSummaries`, the answer resolver returns not-enough-data instead of falling back to the store aggregate.

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
  suggestedQuestions?: OwnerBusinessHealthQuestion[];
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
functions/src/ownerBusinessAssistant/buildOwnerBusinessFeedbackSummary.ts
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
4. Build the analytics index from bounded active project dashboard summaries and optional today daily docs, then aggregate store-level periods from the indexed project periods.
5. Build `feedbackSummary` from recent `guestFeedback` with `MAX_FEEDBACK_DOCS=80`, sanitized snippets, no contact fields, deterministic theme buckets, and capped latest items.
6. Embed `feedbackSummary` in `platformSummary/ownerBusinessHealthCurrent_{tId}_{sId}` and the daily snapshot. Do not create a separate hot-path feedback read model unless the current doc approaches size limits.
7. If no settlement date is pending but the current doc or analytics index is missing/stale, rebuild from the latest summaries.
8. Add the builder result to existing scheduler task results.
9. Invoke the same builder path from `triggerStoreNightlyScheduler`.

Builder rules:

- Read compact summaries first.
- Cap every source that can grow.
- Write only when signature changed unless daily snapshot needs a new local date doc.
- Write current doc and daily snapshot doc.
- Write analytics index doc when the period signature changes.
- Keep guest feedback reads scheduler-only and capped; `/answer`, `/current`, and `/analytics` must not read `guestFeedback`.
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
src/app/api/owner-business-assistant/locations/route.ts
src/app/api/owner-business-assistant/answer/route.ts
src/app/api/owner-business-assistant/thread/[threadId]/route.ts
src/app/api/owner-business-assistant/action/route.ts
src/app/api/owner-business-assistant/feedback/route.ts
src/app/api/platform/owner-business-assistant/monitor/route.ts
```

Route behavior:

| Route | Method | Purpose | Cache/Firebase hot path |
| --- | --- | --- | --- |
| `/current` | GET | Return current Business Health state | Browser/server cache hit = 0 reads; miss = 1 `platformSummary` read |
| `/analytics` | GET | Return standard analytics periods | Cache hit = 0 reads; miss = 1 analytics-index read |
| `/locations` | GET | Return compact multi-location Business Health summary | 1 tenant summary doc + `storesSummary`; filters deactivated outlets and mapped store access; no detailed per-store packet reads |
| `/answer` | POST | Resolve typed/suggested owner question through AI over context packet | Server context-packet cache hit = 0 reads; miss = current + analytics-index; runtime does not read daily docs |
| `/thread/[threadId]` | GET | Load bounded history under the thread flag | 1 thread doc; capped `messages[]` is embedded in that doc |
| `/action` | POST | Navigate, prepare, confirm, cancel, review, dismiss, assign | Depends on operation |
| `/feedback` | POST | Store small answer feedback | 1 compact write under usage/feedback flag |
| `/api/platform/owner-business-assistant/monitor` | GET | Platform-only answer quality, action, feedback, and cost monitor | Reads latest answer events plus capped action/feedback docs |

All routes must derive tenant/store from session or verified selector context. Client-provided scope is advisory only.

The platform monitor route must use `withPlatformAuth`, not owner session scope. It is internal operational tooling and must never become an owner-facing route.

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
src/lib/ownerBusinessAssistant/server/buildOwnerBusinessAssistantContextPacket.ts
src/lib/ownerBusinessAssistant/server/contextPacketCache.ts
src/lib/ownerBusinessAssistant/server/resolveOwnerBusinessAssistantAnswer.ts
src/lib/ownerBusinessAssistant/server/intentClassifier.ts
src/lib/ownerBusinessAssistant/server/factGrounding.ts
src/lib/ownerBusinessAssistant/server/analyticsPeriodResolver.ts
src/lib/ownerBusinessAssistant/server/domainCapabilityMatrix.ts
src/lib/ownerBusinessAssistant/server/aiAnswerClient.ts
src/lib/ownerBusinessAssistant/server/validateAiAnswer.ts
src/lib/ownerBusinessAssistant/server/answerTemplates.ts
src/lib/ownerBusinessAssistant/server/answerArtifacts.ts
src/lib/ownerBusinessAssistant/server/refusals.ts
src/lib/ownerBusinessAssistant/actions/actionTargetResolver.ts
```

Resolver order:

1. Derive tenant/store/project scope from session and verified selector context.
2. Build a stable context-packet cache key from `tId`, `sId`, packet profile, and `projectId` only when the packet includes project-scoped analytics facts. Implemented profiles are `health_card`, `analytics_periods`, `owner_question_actionable`, and `multi_location_summary`.
3. Read `OwnerBusinessAssistantContextPacket` from server cache when present and not past packet `validUntil`; the packet carries local business date and source signatures for response metadata and stale-packet rejection.
4. On cache miss, read only compact docs currently wired into the packet builder: current health doc and analytics index; today overlay facts are already folded into the index by the scheduler.
5. Merge advisory client/page context into target candidates from packet facts.
6. Classify question into approved intent/action/domain candidates.
7. If the domain has no compact source in the packet, return unsupported/needs-more-data without live collection reads.
8. Send the owner question, context packet, allowed schema, and answer rules to the AI model when `ENABLE_OWNER_BUSINESS_HEALTH_AI_ANSWERS` is enabled.
9. Validate structured AI output: source fact IDs, unsupported claims, registered actions, permission scope, target scope, and public-truth guard.
10. Use deterministic/template fallback only when AI answering is disabled, unavailable, or static dashboard rendering does not need provider output.
11. Attach freshness, source fact IDs, cache metadata, route metrics, supported action options, and packet-backed answer artifacts.
12. Return owner-safe response.

The shared server cache value must be the reusable business-facts packet. Store-level packets use `p:_`; selected-menu packets use `p:{projectId}` because analytics periods and teasers differ. Do not store selected item, visible row, or current screen state in the shared cache value or cache key; merge request-time context after cache lookup and revalidate all targets before action preparation.

Dashboard/current and analytics packets omit the action catalog. Only actionable question packets refresh and include the allowed action registry so dashboard/page packets stay smaller and action-flag churn does not invalidate read-only card data unnecessarily.

Every public-truth write path that already invalidates MenuList public cache tags must also clear matching Business Health packet keys. Runtime coverage includes public client cache helpers, `/api/revalidate/menu`, project/outlet saves, temp status, domain changes, public menu claim, messaging publish, subscription entitlement sync, platform entity blocking, and the Functions writer after scheduler rebuilds.

Server packet cache writes add each packet key to `owner-business-assistant:packet-index:v1:{tId}:{sId}`. Invalidation deletes exact indexed keys first, then runs a bounded legacy pattern sweep so old unindexed packets from before the key-index rollout cannot survive until their 24-hour TTL. Browser read-model caches for current, analytics, and locations also use a 10-minute stale guard in addition to immediate client-side public cache clearing from shared owner save helpers.

Action target validation:

- Action execution derives project scope from `projectId`, `targetKind='project'`, selected client context, or compact payload fields only for project-aware action definitions.
- Project/menu-item/category actions validate membership through `platformSummary/projects_{sId}` first and fall back to `projects/{tId}/{sId}/{projectId}`.
- Invalid, deleted, inactive, or missing projects are blocked before navigation, draft preparation, or workflow writes.
- Store-level actions such as settings, billing, users, and feedback do not pay the project-summary read just because the frontend has a selected project.

Suggested-question handling:

- `/answer` validates every `suggestedQuestionId` against `src/data/shared/ownerBusinessHealthQuestionSuggestions.ts`.
- When a valid suggested ID is present, the server replaces the submitted question with the catalog question before resolution, thread persistence, and answer-event logging.
- Unknown suggested IDs return 400.
- Free-text-disabled mode only allows valid catalog suggestions; arbitrary text cannot be smuggled through a suggestion ID.

AI response schema:

```ts
type OwnerBusinessAssistantAiResponse = {
  status: 'answered' | 'needs_more_data' | 'unsupported' | 'needs_confirmation';
	  answer: string;
	  freshnessLabel: string;
	  sourceFactIds: string[];
	  artifacts?: OwnerAssistantAnswerArtifact[];
	  cards?: OwnerAssistantCard[];
	  actions?: OwnerAssistantActionOption[];
	  suggestedQuestions?: OwnerBusinessHealthQuestion[];
	  confidence: 'high' | 'medium' | 'low';
};
```

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
  targetKinds: Array<'project' | 'menu_item' | 'category' | 'store' | 'media' | 'feedback' | 'review' | 'outlet' | 'billing' | 'domain' | 'screen' | 'customer_app' | 'qr' | 'pos' | 'team' | 'compliance'>;
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
- Requires existing domain services before any confirmed public write can be exposed.
- Requires public cache invalidation before any confirmed public write can be exposed.

Implemented registry entries:

| Action | Owner request | Execution contract |
| --- | --- | --- |
| `navigate_business_health` / `open_business_health_detail` | "Show me more" | Navigate to `/business-health`, preserving `projectId` when the owner is scoped to a selected menu |
| `navigate_analytics` / `open_dashboard_analytics` | "Show analytics" | Navigate to `/dashboard` |
| `navigate_menu` / `open_menu_editor_target` / `open_publish_screen` | "Open this item" / "Make it live" | Navigate to existing project editor path |
| `open_qr_share` / `open_customer_app_settings` / `open_digital_screen_settings` | "Show QR/app/screen link" | Navigate to existing Share, Customer App, or Digital Screen surface |
| `open_domain_settings` / `open_pos_sync_settings` / `open_billing` / `open_users_permissions` / `open_locations` | "Check domain/POS/credits/users/outlet" | Navigate only; no payment, DNS, role, or POS settings mutation |
| `open_feedback_reviews` | "Show feedback" | Navigate to existing feedback surface |
| `open_business_settings` / `open_hours_settings` / `open_public_info_settings` / `open_compliance_pages` | "Update business details" | Navigate to existing business settings surface |
| `prepare_description_rewrite` / `menu_item_description_prepare` | "Rewrite this description" | Registered but disabled while `ENABLE_OWNER_BUSINESS_ACTION_PROVIDER_TEXT=false`; do not expose until provider text generation and billing accounting are wired |
| `prepare_review_reply` / `review_reply_prepare` | "Reply to this review" | Registered but disabled while `ENABLE_OWNER_BUSINESS_ACTION_PROVIDER_TEXT=false`; no public posting |
| `store_temp_status_set` / `store_temp_status_clear` | "Mark us closed today" / "Clear the notice" | Write a compact draft; existing temp-status path remains the public write path |
| `mark_health_check_reviewed` / `dismiss_health_check` | "Done" / "Ignore this" | Write one compact action audit doc under the check-workflow flag; desktop/mobile suppress the check locally for the current business date |

Confirmed writes from assistant code must not perform raw Firestore `setDoc()` to project/store public truth. If in-assistant confirmed writes are enabled, create a server-safe mutation adapter that preserves the current `updateProject()` invariants: validation, sanitization, MCE/change detection, multi-outlet behavior, menu change logging, and public cache invalidation.

## 11. Flag-Gated Action/Thread Storage

Core Business Health does not require chat transcripts for suggested questions. To minimize Firebase cost:

- Starter suggestions are built by `src/data/shared/ownerBusinessHealthQuestionSuggestions.ts`, mirrored byte-for-byte to `functions/src/sharedData/ownerBusinessHealthQuestionSuggestions.ts`, and ranked from existing packet facts only.
- Guest feedback suggestions are exposed only when the current Health packet supports `feedback_reviews`. The answer resolver uses `health.feedbackSummary`; it must not query `guestFeedback` at answer time.
- Suggested-question answers can be stateless.
- Answer-level follow-up suggestions are returned in the same answer response. They must not trigger a separate AI call or Firestore read.
- Usage can be aggregate-only.
- Thread persistence is a flag-gated path controlled by `ENABLE_OWNER_BUSINESS_HEALTH_THREADS`; writes occur only when the client supplies a bounded `threadId`.
- When thread history is enabled, follow-up suggestions are embedded in the assistant message inside the existing `messages[]` array.
- Action draft/audit writes are controlled by `ENABLE_OWNER_BUSINESS_ACTION_*` flags.

Use compact collections:

```text
ownerBusinessAssistantThreads/{threadId} // includes capped messages[]
ownerBusinessAssistantAnswerEvents/{answerId}
ownerBusinessAssistantActions/{actionId}
ownerBusinessAssistantDrafts/{draftId}
ownerBusinessAssistantFeedback/{feedbackId}
```

Retention:

- Threads: 30 days, including embedded messages.
- Answer events: 180 days, internal monitoring only.
- Drafts: 7 days or until confirmed/cancelled.
- Actions: 90 days compact audit, unless tied to public-truth audit.
- Feedback: 90 days aggregate after review.

The read-only Business Health track must not depend on action, draft, or message writes.
Owner chat history and internal answer-event logging are separate concerns. Thread storage powers optional owner continuity; answer-event storage powers platform observation and cost review.

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

Implemented platform observation:

- `src/lib/ownerBusinessAssistant/server/answerEventLogger.ts` writes compact answer events only when `ENABLE_OWNER_BUSINESS_HEALTH_USAGE_LOGGING` is enabled.
- Deterministic/template answers record zero units and zero owner charge.
- Provider-backed answers may record configured units/costs in the answer event, but the billing ledger remains `menulistAiOperations` through existing AI operation accounting.
- `src/app/api/platform/owner-business-assistant/monitor/route.ts` reads answer events, actions, and feedback for internal review.

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
src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthProjectScopeSelector.tsx
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

Owner chat history:

- `useOwnerBusinessAssistantAnswer()` creates a local bounded `threadId` only when `ENABLE_OWNER_BUSINESS_HEALTH_THREADS` is enabled.
- `/answer` persists the exchange only when the thread flag is enabled and the request carries `threadId`; it updates one thread document with a capped `messages[]` array.
- The hook creates or reuses the local thread ID before the first `/answer` request, so the first exchange can persist.
- `OwnerAssistantPanel` reads `/thread/[threadId]` and shows the latest bounded messages when available.
- Desktop and mobile message lists render the pending owner question and latest answer from hook state while the one-doc thread history refreshes, then suppress duplicates by question text and answer ID.

Dashboard placement:

- Add `BusinessHealthDashboardCard` near the top of the owner dashboard.
- The card is useful without chat and shows current Health status, owner message, and freshness.
- Add `BusinessHealthAnalyticsStrip` near the existing owner dashboard analytics area when the analytics index flag is enabled; analytics facts load from the scoped analytics-index hook instead of the Health card packet.
- It opens `/business-health`.

Business Health project scope:

- The full Business Health page owns a local scope selector with `All menus` plus selectable menu projects for the active store.
- This selector must not mutate the global dashboard/mobile selected project. It only controls Business Health analytics, owner questions, project-aware actions, and check-state local storage on this screen.
- Current Health remains store-scoped even when a menu is selected. Analytics and answer packets include `projectId` only when the owner chooses a single menu.
- If the selected menu id is no longer present after active-store or project-list changes, the screen clears Business Health scope back to `All menus` instead of sending stale project ids.

Existing fit:

- `src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx:1-21` already defines owner dashboard as answers and confidence, not raw analytics.
- `src/components/templates/main-app/dashboard/OwnerDashboard/HealthSignalCards.tsx:139-157` already uses Business Health as a calm signal.

## 13.1 Internal Platform Monitor UI

Route:

```text
src/app/(main)/platform/owner-business-assistant/page.tsx
```

Component:

```text
src/components/templates/main-app/platform/ownerBusinessAssistantMonitor/index.tsx
```

Navigation:

```text
src/app/(main)/platform/owner-business-assistant/page.tsx
  -> PlatformSettings initialTab="owner-business-assistant"
src/components/templates/platform/settings/index.tsx
  -> Platform tab: Business Health Monitor
src/components/mobile/screens/MobileMoreScreen.tsx
  -> More tab, Platform Monitoring section: Business Health Monitor
src/components/mobile/screens/MobilePlatformInternalScreen.tsx
  -> ownerBusinessAssistantMonitor wrapper for the same monitor component
src/components/mobile/MobileShell.tsx
  -> /platform/owner-business-assistant deep link maps to ownerBusinessAssistantMonitor on mobile
```

The monitor shows:

- Recent questions and answers.
- Answer status, intent, cache source, packet profile, route read/write counts, packet age, source coverage, and confidence.
- Unsupported and needs-more-data counts.
- Provider call count, units, internal paise cost, and owner paise charge.
- Cache hit/fresh packet counts, average/max Firestore reads, and thread-write counts.
- Recent Action Support records.
- Recent answer feedback.

Navigation:

- Link from `src/components/templates/main-app/platform/opsControlRoom/index.tsx`.
- Link to `/transactions` so platform review can compare Business Health provider operations with the existing transaction dashboard when provider-backed billing is enabled.

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
src/hooks/ownerBusinessAssistant/useOwnerBusinessContextPacket.ts
src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantAnswer.ts
src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantThread.ts
src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantAction.ts
src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantFeedback.ts
```

Use SWR/local component state and the existing scheduler-day localStorage cache pattern. Do not put messages in Redux unless an existing global route contract forces it.

Dashboard card, analytics strip, and full page hooks should read cached values first, matching `src/hooks/useOwnerDashboard.ts` and `src/lib/cache/swrLocalStorageProvider.ts`. Current Health is store-scoped and should not fragment the browser/SWR cache by selected menu. Analytics, answer, and project-aware action hooks keep selected-menu scope. The page-level Health hook should only gate current Health state; analytics loads through the analytics-index hook/strip so a slow or missing analytics index does not block the Health summary. The answer hook may pass a valid cached context packet or packet signature to `/answer`, but the server must still verify scope and freshness.

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
4. Add current and analytics APIs with server-side read/filter plus browser-cache metadata.
5. Add context-packet builder and cache adapter with SWR/localStorage and optional Upstash-backed server cache.
6. Add AI structured-answer resolver for typed and suggested questions over the context packet; answer follow-up suggestions use the same answer call or deterministic packet fallback.
7. Add deterministic fallback/refusal renderer for AI-disabled or provider-unavailable cases.
8. Add desktop dashboard card, analytics strip, and full page.
9. Add MobileShell mapping and mobile screen.
10. Add action registry and route for navigate/prepare/cancel/review/dismiss.
11. Keep public-truth saves as existing-screen handoffs unless a verified server mutation adapter is present.
12. Add provider-backed answering with SAFE_MODE, rate limit, accounting, unit-cost metadata, and balance sync.
13. Add cleanup tasks for persistent thread/action docs under their flags.
14. Update docs from implementation truth.

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
