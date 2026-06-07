# Owner Business Assistant Architecture Cross-Check

**Owner-Facing Name:** Business Health
**Internal Slug:** owner-business-assistant
**Product:** MenuList
**Status:** Docs-only architecture alignment
**Last Updated:** June 7, 2026

---

## 1. Audit Verdict

The end-to-end architecture is valid only as a summary-first Business Health system.

The final contract is not a chatbot rollout sequence. It is one permanent architecture with two separately flag-gated tracks:

- **Business Health:** card, page, current read model, analytics index, approved question intents, grounded free-text mapping, dashboard analytics, desktop, mobile, usage feedback, and cleanup.
- **Action Support:** action registry, navigation, draft preparation, confirmed writes, media/provider actions, check workflow, audit, public-truth guard, desktop, mobile, and cleanup.

Feature flags control environment availability, cost exposure, and emergency shutdown. They are not delivery tracks and must not be documented as promises outside the day-one build.

## 2. End-to-End System

```text
Existing owner/customer facts
  -> existing store-local scheduler settlement
  -> Business Health source adapters
  -> platformSummary current + analytics index + daily snapshot docs
  -> protected owner APIs
  -> desktop dashboard/page + MobileShell screen
  -> registry-gated Action Support
  -> existing domain services for confirmed actions
  -> existing public cache invalidation for public-truth writes
```

The hot path is one compact current document. Analytics questions use a second deterministic analytics index document only when needed. All expensive or broad reads happen in scheduled/build-time code, not per owner message.

## 3. Permanent Data Ownership

| Data | Current owner | Current storage | Business Health use | Modification needed |
| --- | --- | --- | --- | --- |
| Store metadata, plan, timezone, scheduler hour | Store/platform summary | `platformSummary/storesSummary` | Scope, freshness, branch selector, entitlement hints | Reuse; add only minimal summary fields if missing |
| Active project/public menu state | Project summary sync | `platformSummary/projects_{sId}` | Active/default menu, publish state, project labels | Reuse; do not read all project docs on answer |
| Live today analytics | Customer analytics DAL | `analytics/{tId}_{sId}_{projectId}_daily_{today}` | "Today so far" partial stats | Single-doc overlay only; never range scan |
| Settled menu analytics | Owner dashboard aggregation | `analytics/{tId}_{sId}_{projectId}_dashboard_summary` | Customer attention, top items/categories, recent settled trends | Reuse summary docs; no raw range scans in answer API |
| Weekly/monthly analytics docs | Existing analytics aggregation | `analytics/{tId}_{sId}_{projectId}_weekly_*`, `analytics/{tId}_{sId}_{projectId}_monthly_*` | Last week and last month answers when dashboard summary is insufficient | Scheduler/index builder may read deterministic docs; answer API should not query ranges |
| Customer App analytics | Dashboard aggregation | `analytics/{tId}_{sId}_customerApp_dashboard_summary` | Customer App presence/shortcut signals | Reuse only compact fields |
| OBP analytics | OBP aggregation | `analytics/{tId}_{sId}_obp_dashboard_summary` when enabled | Public presence attention | Reuse when available; mark unsupported when disabled |
| Menu intelligence | Continuous menu intelligence | `menuIntelligence` | Possible item/menu issue hints | Reuse existing state; do not duplicate scoring |
| Menu public health | Menu Health Monitor | `stores/{sId}.health` | Public menu availability block | Reuse field; do not trigger live public fetch in answer API |
| Trust/loyalty/risk health | Health signal computation | `stores/{sId}.healthSignals` | High-level health status, only when visible | Reuse as source; Business Health should not run weekly computation |
| Guest feedback | Feedback DAL/API | `guestFeedback` | Feedback pattern/checks | Scheduler may read capped/summary data; answer API must not scan |
| Review state | Reviews reputation APIs | `reviewsState` | Review block/escalation pattern | Prefer existing boolean/capped state; avoid raw review text in answer packet |
| Menu changes | MOL | `menuChangeLog/{tId}/{sId}` | What changed recently | Scheduler reads capped recent changes or a dedicated summary; no answer-time scan |
| Owner control usage | Authority maturation | `ownerControlUsage/{tId}_{sId}` | Value events and trust signal | Extend deliberately or create server aggregate; current union is insufficient |
| POS delivery | POS sync | `posDeliveryQueue`, `posDeliveryLogs` | POS sync status only | Reuse only status/log summaries; never infer revenue/profit from POS delivery logs |
| Operations | Ops/health/alerts | `systemAlerts`, `systemHealth`, scheduler logs | Latest operational issue/freshness | Scheduler compacts state; owner API returns only owner-safe labels |
| AI accounting | AI system layer | `menulistAiOperations`, subscription/top-up docs | Provider-backed free text only | Add a distinct AI action/unit-cost entry before provider-backed answers ship |
| Business Health current | New read model | `platformSummary/ownerBusinessHealthCurrent_{tId}_{sId}` | Dashboard/page/answer hot path | Required |
| Business analytics index | New read model in existing collection | `platformSummary/ownerBusinessAnalyticsIndex_{tId}_{sId}` | Standard period answers and dashboard analytics strip | Required; no new top-level analytics collection |
| Business Health daily proof | New read model | `platformSummary/ownerBusinessHealthSnapshot_{tId}_{sId}_{localDate}` | Debugging, replay, support | Required with retention/cap |
| Assistant threads/messages | Business Health APIs | `ownerBusinessAssistantThreads`, `ownerBusinessAssistantMessages` | Conversation continuity under the thread flag | Bounded retention; not required for read-only Health |
| Action drafts/actions | Action Support APIs | `ownerBusinessAssistantDrafts`, `ownerBusinessAssistantActions` | Prepare/confirm/cancel/review flows | Day-one Action Support storage; server-only writes under action flags |
| Answer feedback | Business Health APIs | `ownerBusinessAssistantFeedback` or aggregate doc | Quality signal | Compact writes under feedback/usage flags |

## 4. Source Adapter Contract

Business Health should not let the snapshot builder become a pile of direct Firestore reads scattered through the scheduler.

Create source adapters:

```text
functions/src/ownerBusinessAssistant/sources/loadStoreContext.ts
functions/src/ownerBusinessAssistant/sources/loadProjectSummaryContext.ts
functions/src/ownerBusinessAssistant/sources/loadDashboardSummaryContext.ts
functions/src/ownerBusinessAssistant/sources/loadAnalyticsPeriodContext.ts
functions/src/ownerBusinessAssistant/sources/loadMenuIntelligenceContext.ts
functions/src/ownerBusinessAssistant/sources/loadPublicHealthContext.ts
functions/src/ownerBusinessAssistant/sources/loadFeedbackReviewContext.ts
functions/src/ownerBusinessAssistant/sources/loadRecentChangeContext.ts
functions/src/ownerBusinessAssistant/sources/loadOperationsContext.ts
functions/src/ownerBusinessAssistant/sources/loadPosContext.ts
```

Each adapter returns:

```ts
type OwnerBusinessHealthSourceResult<T> = {
  status: 'available' | 'missing' | 'disabled' | 'stale' | 'error';
  facts: T | null;
  sourceRefs: OwnerBusinessHealthSourceRef[];
  readCount: number;
  warnings?: string[];
};
```

The builder composes adapters into one current doc and records unsupported data instead of guessing.

## 5. Owner Analytics Architecture

Owner analytics needs two surfaces:

- A small dashboard signal that tells the owner what happened recently.
- Grounded answers for questions such as "today", "this week", "last week", "this month", and "last month".

The long-term cost decision is: **do not add a new analytics collection for Business Health**. Reuse the existing `analytics` collection and write one assistant-ready period index into `platformSummary`.

### Analytics Read Models

```text
platformSummary/ownerBusinessHealthCurrent_{tId}_{sId}
platformSummary/ownerBusinessAnalyticsIndex_{tId}_{sId}
```

`ownerBusinessHealthCurrent` stays small and dashboard-card friendly. It may include 2-3 teaser facts such as today visits, top item, and last checked time.

`ownerBusinessAnalyticsIndex` stores compact period packets for analytics Q&A and richer dashboard analytics modules:

```ts
type OwnerBusinessAnalyticsIndexDoc = {
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

type OwnerBusinessAnalyticsPeriod = {
  periodId: string;
  label: string;
  status: 'complete' | 'partial' | 'settled' | 'missing';
  startDate?: string;
  endDate?: string;
  daysWithData?: number;
  metrics: {
    menuVisits?: number;
    itemViews?: number;
    itemClicks?: number;
    engagedSessions?: number;
    actionSessions?: number;
    searches?: number;
    unavailableItemTaps?: number;
  };
  topItems?: Array<{ itemId: string; name: string; value: number; signal: 'views' | 'clicks' | 'attention' }>;
  topCategories?: Array<{ categoryId: string; name: string; value: number }>;
  topSearches?: Array<{ term: string; count: number }>;
  sourceQuality?: Array<{ source: string; visits: number; actionRate?: number }>;
  freshnessLabel: string;
  sourceFactIds: string[];
};
```

### Period Rules

| Owner asks | Source strategy | Answer behavior |
| --- | --- | --- |
| Today / today's stats | One current daily analytics doc, cached as `today` overlay | Mark as partial and show freshness |
| Yesterday | Dashboard summary `daily`/`overview.yesterday` | Settled answer |
| This week | Dashboard summary `wtd`/`weekly`, plus optional today overlay | Say whether today is included |
| Last week | Existing weekly doc, or scheduler/index builder derives from `daily30d` when enough rows exist | Settled answer if available |
| This month | Dashboard summary `mtd`/`monthly`, plus optional today overlay | Say whether today is included |
| Last month | Existing monthly doc, or scheduler/index builder marks unavailable when not enough rows exist | Settled answer if available |
| Last 7 / 30 days | Dashboard summary `daily30d` compact rows | Scheduler/index builder only |
| Custom arbitrary dates | Not supported by answer API by default | Refuse or offer supported periods |

The answer API may read:

- `ownerBusinessHealthCurrent` for health context.
- `ownerBusinessAnalyticsIndex` for analytics intents.
- One live daily doc for the current local date when `today` freshness is required and the flag allows the overlay.

It must not read N daily docs for a message. If a new custom period becomes important, the scheduler/index builder must add that period to the index first.

### Dashboard Placement

The owner dashboard should show Business Health near the existing dashboard analytics, not as a disconnected chat widget.

Recommended desktop placement:

1. Existing dashboard remains the detailed analytics surface.
2. `BusinessHealthDashboardCard` appears near the top with status and 2-3 analytics facts.
3. A compact `BusinessHealthAnalyticsStrip` can show `Today`, `This week`, and `This month`.
4. The full `/business-health` page reads the current doc first, then the analytics index when the owner opens analytics questions or period cards.

Recommended mobile placement:

1. Business Health entry inside `MobileShell`.
2. Compact analytics period cards below the health summary.
3. Tapping a period opens a bottom sheet or full-screen detail, not a separate route reload.

## 6. Function Logic Alignment

### Snapshot Generation

Business Health generation belongs in `functions/src/decisionBlocksScoring.ts`.

Reason:

- `computeDecisionBlocksScores` already runs hourly at `:30`, filters eligible stores, settles store-local analytics, and writes summary docs.
- Store-local analytics docs are available after the existing settlement loop writes dashboard summaries.
- Manual recovery exports already route through `triggerStoreNightlyScheduler`.

Insertion rule:

1. Load active projects through the existing scheduler helper.
2. Settle pending store-local dates.
3. After dashboard summaries are written and `platformSummary/nightlyState_*` is updated, call the Business Health builder for that store.
4. Build or refresh `ownerBusinessAnalyticsIndex_{tId}_{sId}` from dashboard summaries, `daily30d`, weekly/monthly docs, and the optional today single-doc overlay.
5. If no settlement date is pending but the current Business Health doc or analytics index is missing/stale, rebuild from the latest available summaries.
6. Record builder success/failure in existing scheduler task results, not a new scheduler function.
7. Manual store recovery must invoke the same builder path.

Do not run Business Health from `masterScheduler` or a standalone scheduled function.

### Cleanup

Cleanup belongs in `functions/src/schedulers/menulistMaintenanceScheduler.ts`.

Add static task definitions for separately flag-gated workflow storage:

- `owner_business_health_thread_cleanup`
- `owner_business_health_action_draft_cleanup`
- `owner_business_health_snapshot_cleanup`

Each task needs its own cadence, lease, cap, and cost note. It must not scan unbounded collections.

### Provider-Backed Free Text

Provider-backed answer formatting is part of the complete architecture, but it is not required for deterministic suggested questions.

Before any provider-backed route is enabled:

1. Add an `AI_ACTIONS_TYPES` value for owner business assistant answers.
2. Add real cost and unit cost entries.
3. Use SAFE_MODE, AI rate limits, accounting, and `remainingBalance` propagation.
4. Return deterministic/template answers without provider calls when the intent is already supported.

## 7. API Alignment

The route set stays grouped:

```text
GET  /api/owner-business-assistant/current
GET  /api/owner-business-assistant/analytics
POST /api/owner-business-assistant/answer
GET  /api/owner-business-assistant/thread/[threadId]
POST /api/owner-business-assistant/action
POST /api/owner-business-assistant/feedback
```

The `/action` route owns operation dispatch:

```ts
type Operation =
  | 'navigate'
  | 'prepare'
  | 'confirm'
  | 'cancel'
  | 'mark_reviewed'
  | 'dismiss'
  | 'assign';
```

This reduces route sprawl without weakening security because every operation still uses the same server-side validation, target resolver, permission gate, and public-truth guard.

## 8. Day-One Action Support Architecture

The Action Support system must not be "the bot can do anything." It must be a registry of approved business actions.

Owners can ask in natural language, but only registered actions can prepare or mutate anything. Everything else returns a safe answer, a navigation option, or an unsupported response.

### Action Registry

Each action definition must include:

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

### Day-One Action Catalog Summary

| Owner asks | Action type | Existing system to reuse | Storage needed | Write behavior |
| --- | --- | --- | --- | --- |
| Open the detailed health view | `open_business_health_detail` | `/business-health` route | None | Navigation only |
| Show analytics | `open_dashboard_analytics` | Existing dashboard analytics | None | Navigation only |
| Open this item | `open_menu_editor_target` | Existing editor route/context | None | Navigation only |
| Change this item's price | `menu_item_price_set` | Project mutation adapter over `updateProject()` invariants, MCE, menu change log, cache invalidation | Draft + action audit | Confirmed write only |
| Increase selected prices | `menu_item_price_bulk_adjust` | Command Center pricing pure functions | Draft + action audit | Confirmed write only |
| Mark item sold out/show/hide/move category | `menu_item_availability_set`, `menu_item_visibility_set`, `menu_item_move_category` | Command Center pure functions and project mutation path | Draft + action audit | Confirmed write only |
| Rewrite this description | `menu_item_description_prepare` | Existing description generation prompt/accounting and project update path | Draft + action audit; AI operation only if provider called | Prepare generated text, confirm before save |
| Add missing descriptions | `menu_missing_descriptions_prepare` | Existing description generation and repair flow | Draft + action audit; AI operation only if provider called | Confirm before save |
| Update this item image | `menu_item_image_upload_open`, `menu_item_image_generate_prepare`, `menu_item_image_attach_confirm` | Existing media prep/upload, image generation, and item-image association path | Draft stores media reference only | Confirm before public image changes |
| Make this menu live | `open_publish_screen` plus guarded public-truth action | Existing publish screen/API/cache path | Action audit if confirmed in assistant | Prefer navigation unless public-truth flag allows in-assistant confirmation |
| Mark or dismiss a check | `check_mark_reviewed`, `check_dismiss` | Assistant check workflow storage | Compact action/check write | Confirm state change |

### Confirmed Write Rule

The current project DAL has a hard invariant that customer-facing truth passes through `updateProject()`. A server-side assistant route must not bypass that by writing raw Firestore project documents.

Confirmed writes have two acceptable strategies:

1. **Prepare and navigate:** Business Health creates a draft and opens the existing editor/settings screen. The existing UI performs the save through the current path.
2. **Server mutation adapter:** factor the shared validation, sanitization, MCE/change detection, multi-outlet handling, and public cache invalidation into a server-safe mutation service, then call that from the assistant action route.

Raw `setDoc()` from assistant action code is not allowed for menu/store public truth.

### Draft and Audit Storage

Action storage is separate from analytics storage:

```text
ownerBusinessAssistantDrafts/{draftId}
ownerBusinessAssistantActions/{actionId}
```

Drafts store compact patches, target IDs, old target fingerprints, proposed values, generated text/media references, and expiry. They do not store base64 images, raw project copies, or long chat transcripts.

On confirm:

1. Re-read target.
2. Verify tenant/store/role/permission.
3. Verify target fingerprint still matches or require owner review.
4. Execute through existing domain path or approved server mutation adapter.
5. Invalidate public cache when public output changes.
6. Mark action confirmed with compact metadata.

## 9. Reuse vs New Build

Reuse:

- Existing owner dashboard summaries.
- Existing live daily analytics doc for today's partial stats.
- Existing weekly/monthly/overall analytics docs.
- Existing summary document pattern.
- Existing store-local scheduler.
- Existing maintenance scheduler.
- Existing MobileShell state/callback contract.
- Existing domain services for project/store/publish writes.
- Existing public cache invalidation paths.
- Existing SAFE_MODE/rate-limit/accounting/balance sync patterns.

Modify:

- Add Business Health source adapters to functions.
- Add current, analytics-index, and daily `platformSummary` read model docs.
- Add `platformSummary/ownerBusinessAnalyticsIndex_{tId}_{sId}` for standard owner analytics periods.
- Add protected API service layer.
- Add MobileShell mapping and mobile screen.
- Add action registry and target resolver contract.
- Extend or replace owner usage logging for assistant value events.
- Add AI action/unit-cost metadata before provider-backed answers.

Do not reuse directly:

- Existing help chat domain logic as Business Health business logic.
- Raw owner dashboard hooks for the assistant answer API.
- Direct Firestore client writes for assistant actions.
- Existing `ownerControlUsage` union without extending it.

## 10. Data Size and Retention

Current doc target:

- Under 250 KB.
- Hard warning at 850 KB.
- Compact facts only, no long transcripts, no raw reviews, no raw menu documents.

Analytics index target:

- Under 350 KB.
- Hard warning at 850 KB.
- Store only standard periods and capped top lists.
- No per-customer, per-session, raw event, or arbitrary-date payloads.

Daily snapshot retention:

- Keep 30-90 days depending on support/debug need.
- Delete through maintenance scheduler with bounded batches.

Threads/messages:

- Max 20 messages per active thread.
- 30-day retention.
- No token-by-token persistence.

Drafts:

- 7-day retention.
- Cancelled/confirmed drafts can be compacted or removed.

## 11. Final Strategy

Business Health should be implemented as a durable owner operating layer over existing MenuList truth:

- The scheduler prepares the truth packet.
- The scheduler prepares a standard analytics period index.
- APIs answer from the truth packet.
- Analytics questions read the period index and at most one live today overlay.
- UI presents health before chat.
- Actions use an approved registry, drafts, confirmation, and existing services.
- Cache invalidation remains centralized.
- Mobile is first-class through `MobileShell`.
- Provider-backed answering is a controlled runtime path inside the same architecture, not the architecture itself.
