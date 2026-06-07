# Owner Business Assistant Architecture Cross-Check

**Owner-Facing Name:** Business Health
**Internal Slug:** owner-business-assistant
**Product:** MenuList
**Status:** Docs-only architecture alignment
**Last Updated:** June 7, 2026

---

## 1. Audit Verdict

The end-to-end architecture is valid only as a summary-first Business Health system.

The complete long-term contract is not a staged chatbot rollout. It is one permanent architecture with runtime flags:

- Business Health card and page.
- Current and daily compact read models.
- Approved question intents.
- Free-text intent mapping only when grounded.
- Action routing, draft preparation, confirmed writes, and public-truth guard.
- Desktop and mobile surfaces.
- Usage feedback and cleanup.

Feature flags control environment availability, cost exposure, and emergency shutdown. They are not product phases and must not be documented as promises to build later.

## 2. End-to-End System

```text
Existing owner/customer facts
  -> existing store-local scheduler settlement
  -> Business Health source adapters
  -> platformSummary current + daily snapshot docs
  -> protected owner APIs
  -> desktop dashboard/page + MobileShell screen
  -> existing domain services for confirmed actions
  -> existing public cache invalidation for public-truth writes
```

The hot path is one compact current document. All expensive or broad reads happen in scheduled/build-time code, not per owner message.

## 3. Permanent Data Ownership

| Data | Current owner | Current storage | Business Health use | Modification needed |
| --- | --- | --- | --- | --- |
| Store metadata, plan, timezone, scheduler hour | Store/platform summary | `platformSummary/storesSummary` | Scope, freshness, branch selector, entitlement hints | Reuse; add only minimal summary fields if missing |
| Active project/public menu state | Project summary sync | `platformSummary/projects_{sId}` | Active/default menu, publish state, project labels | Reuse; do not read all project docs on answer |
| Settled menu analytics | Owner dashboard aggregation | `analytics/{tId}_{sId}_{projectId}_dashboard_summary` | Customer attention, top items/categories, recent settled trends | Reuse summary docs; no raw range scans in answer API |
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
| Business Health daily proof | New read model | `platformSummary/ownerBusinessHealthSnapshot_{tId}_{sId}_{localDate}` | Debugging, replay, support | Required with retention/cap |
| Assistant threads/messages | Business Health APIs | `ownerBusinessAssistantThreads`, `ownerBusinessAssistantMessages` | Conversation continuity when enabled | Conditional runtime mode, bounded retention |
| Action drafts/actions | Business Health APIs | `ownerBusinessAssistantDrafts`, `ownerBusinessAssistantActions` | Prepare/confirm/cancel/review flows | Conditional runtime mode, server-only writes |
| Answer feedback | Business Health APIs | `ownerBusinessAssistantFeedback` or aggregate doc | Quality signal | Conditional runtime mode, compact writes |

## 4. Source Adapter Contract

Business Health should not let the snapshot builder become a pile of direct Firestore reads scattered through the scheduler.

Create source adapters:

```text
functions/src/ownerBusinessAssistant/sources/loadStoreContext.ts
functions/src/ownerBusinessAssistant/sources/loadProjectSummaryContext.ts
functions/src/ownerBusinessAssistant/sources/loadDashboardSummaryContext.ts
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

## 5. Function Logic Alignment

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
4. If no settlement date is pending but the current Business Health doc is missing/stale, rebuild from the latest available settled summaries.
5. Record builder success/failure in existing scheduler task results, not a new scheduler function.
6. Manual store recovery must invoke the same builder path.

Do not run Business Health from `masterScheduler` or a standalone scheduled function.

### Cleanup

Cleanup belongs in `functions/src/schedulers/menulistMaintenanceScheduler.ts`.

Add static task definitions only for conditional workflow storage:

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

## 6. API Alignment

The route set stays grouped:

```text
GET  /api/owner-business-assistant/current
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

## 7. Reuse vs New Build

Reuse:

- Existing owner dashboard summaries.
- Existing summary document pattern.
- Existing store-local scheduler.
- Existing maintenance scheduler.
- Existing MobileShell state/callback contract.
- Existing domain services for project/store/publish writes.
- Existing public cache invalidation paths.
- Existing SAFE_MODE/rate-limit/accounting/balance sync patterns.

Modify:

- Add Business Health source adapters to functions.
- Add current/daily `platformSummary` read model docs.
- Add protected API service layer.
- Add MobileShell mapping and mobile screen.
- Extend or replace owner usage logging for assistant value events.
- Add AI action/unit-cost metadata before provider-backed answers.

Do not reuse directly:

- Existing help chat domain logic as Business Health business logic.
- Raw owner dashboard hooks for the assistant answer API.
- Direct Firestore client writes for assistant actions.
- Existing `ownerControlUsage` union without extending it.

## 8. Data Size and Retention

Current doc target:

- Under 250 KB.
- Hard warning at 850 KB.
- Compact facts only, no long transcripts, no raw reviews, no raw menu documents.

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

## 9. Final Strategy

Business Health should be implemented as a durable owner operating layer over existing MenuList truth:

- The scheduler prepares the truth packet.
- APIs answer from the truth packet.
- UI presents health before chat.
- Actions use existing services.
- Cache invalidation remains centralized.
- Mobile is first-class through `MobileShell`.
- Provider-backed answering is a controlled runtime path inside the same architecture, not the architecture itself.
