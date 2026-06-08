# Owner Business Assistant Architecture Cross-Check

**Owner-Facing Name:** Business Health
**Internal Slug:** owner-business-assistant
**Product:** MenuList
**Status:** Implemented alignment record
**Last Updated:** June 8, 2026

---

## 1. Audit Verdict

The end-to-end architecture is valid only as a summary-first Business Health system.

The final contract is not a chatbot rollout sequence. It is one permanent architecture with two separately flag-gated tracks:

- **Business Health:** card, page, current read model, analytics index, approved question intents, grounded free-text mapping, dashboard analytics, desktop, mobile, usage feedback, and cleanup.
- **Action Support:** action registry, navigation, compact draft preparation, existing-screen handoff for public-truth saves, provider/draft flags, check workflow, audit, public-truth guard, desktop, mobile, and cleanup.

Feature flags control environment availability, cost exposure, and emergency shutdown. They are not delivery tracks and must not be documented as promises outside the day-one build.

## 2. End-to-End System

```text
Existing owner/customer facts
  -> existing store-local scheduler settlement
  -> Business Health source adapters
  -> platformSummary current + analytics index + daily snapshot docs
  -> cache-first OwnerBusinessAssistantContextPacket
  -> protected owner APIs + AI answer resolver
  -> desktop dashboard/page + MobileShell screen
  -> registry-gated Action Support
  -> existing domain services for confirmed actions
  -> existing public cache invalidation for public-truth writes
```

The hot path is a cached context packet. A cache hit must not read Firestore. A cache miss may read compact docs/projections: one current document, one deterministic analytics index document, one cached public project/store projection when needed, and one optional today overlay document. All expensive or broad reads happen in scheduled/build-time code, not per owner message.

### Universal Read Policy

Analytics is only one read domain. The permanent rule is broader: read-only owner questions must answer from a cached packet, cached projection, or scheduler-built summary. Direct Firebase reads are allowed only to build or refresh that packet on cache miss, and only from compact sources. Confirmed mutation flows may perform live Firebase reads inside the existing write/domain service path to verify the current target before writing.

For non-analytics questions:

| Owner asks about | Read strategy | Firebase at question time |
| --- | --- | --- |
| Public menu/project facts such as item names, prices, categories, publish state, menu URL | Reuse existing public project/store cache shape and invalidation tags; include a sanitized projection in the context packet | 0 on packet/cache hit; no full project scan |
| Store/business profile such as name, hours, timezone, address, contact, business type | Reuse `platformSummary/storesSummary`, existing store summary/public lookup cache, and public store cache tags | 0 on packet/cache hit; compact summary read only on miss |
| Business Health and platform checks | Reuse `ownerBusinessHealthCurrent` and compact source facts | 0 on packet/cache hit |
| Analytics and customer attention | Reuse `ownerBusinessAnalyticsIndex` plus optional today overlay | 0 on packet/cache hit |
| Feedback, reviews, recent changes, POS, screens, operations | Use only prebuilt/capped summary facts in the packet | Unsupported until a compact cached summary exists |
| Owner-private billing, credits, team, permissions | Use existing session/entitlement/accounting responses or a compact protected summary | No broad live reads for ordinary answers |

The assistant should never fetch the public route HTML to answer a question. It should reuse the same cached data contracts underneath those routes, especially the `menu-store-{storeId}`, `store-{storeId}`, `client-stores`, and `screen-data` invalidation model.

### Comparable Product Pattern Check

The market pattern validates the dashboard-first, action-reviewed direction, but not an unrestricted chatbot.

| Product pattern | What it means for MenuList |
| --- | --- |
| Square AI is embedded in Square Dashboard for natural-language business questions, charts/tables, conversation context, owner/admin access, feedback, and explicit accuracy cautions. | Business Health belongs in the owner dashboard and should support structured answer artifacts, feedback, and source/freshness labels. |
| Shopify Sidekick works from admin context on desktop/mobile, can analyze data and edit products, but presents changes for owner review before applying. | MenuList should carry current page/target context into the packet and require confirmation for all public-truth actions. |
| Lightspeed AI is positioned as a retail/restaurant intelligence layer for plain-language questions, menu performance, and faster decisions. | MenuList should prioritize quick operator answers over a novelty chat surface. |
| Meta Business Agent focuses on customer-message automation, product recommendations, bookings, human handoff, and morning briefings. | MenuList Business Health should stay owner-facing. Customer-facing automation belongs to a separate product/surface decision, not this assistant. |
| Wix's dashboard assistant recommends concrete traffic actions from site analytics. | MenuList should show next actions only when grounded in packet facts and existing action registry entries. |

### Owner Domain Coverage Matrix

Owners will ask about the whole business, not only analytics. Every domain gets an explicit answer stance:

| Domain | Common owner question | Answer source | Action stance |
| --- | --- | --- | --- |
| Business Health | "Is everything okay?" | `ownerBusinessHealthCurrent` | Show checks, navigate, mark reviewed/dismiss under check flag |
| Customer/menu analytics | "How was today / this week / last week?" | `ownerBusinessAnalyticsIndex` + optional today overlay | Show metric cards/tables; no raw range scans |
| Menu/project/catalog | "What is the price of this item?" / "Which menu is live?" | Cached public project/store projection + `platformSummary/projects_{sId}` | Navigate or prepare compact draft; public save stays in existing editor |
| Store profile and public info | "What phone number/hours/address are shown?" | Store summary/public projection | Navigate to settings; no direct assistant public write |
| Temporary status | "Mark us closed today" | Store public projection + existing temp-status API target | Prepare compact draft; existing temp-status path performs public save |
| Official Business Page / public links | "What is my public page link?" | Public store projection and route helpers | Navigate/share/copy link; no content mutation unless registered |
| Customer App / PWA | "Is the app install link working?" | Public store/PWA projection | Navigate to Customer App settings/share surface |
| QR/share/print assets | "Where is my QR code?" | Existing share/QR surface state | Navigate/open; generation stays in existing screen |
| Digital screens | "Is my screen running?" | Screen summary/status projection | Navigate/open screen settings; screen writes stay in existing screen service |
| Feedback/reviews | "Any bad feedback?" / "Help reply to this review" | Compact feedback/review state; pasted owner review text | Navigate to feedback/reviews; prepare reply suggestion if owner supplies text or compact source exists |
| Domains/subdomain | "Is my domain verified?" | Compact domain status/public lookup | Navigate to domain settings; do not add/remove domains inside assistant by default |
| Locations/outlets | "Which outlet needs attention?" | Compact store/outlet health comparison | Navigate/switch only within verified permission scope |
| Billing/credits/account | "Do I have credits?" / "Why is billing blocked?" | Existing account/access summary only | Navigate to billing; no payment/subscription mutation |
| Users/team/permissions | "Can my manager publish?" | Compact role/permission summary only | Navigate to users/roles; no staff mutation by assistant |
| POS/integrations | "Is POS connected?" | POS status summary only | Navigate/test only through existing integration screen; no forced delivery/settings mutation |
| Compliance/legal pages | "Are policy links shown?" | Public store/compliance projection | Navigate to compliance editor; no legal text generation without registered action |
| External web/local events/competitors | "What is happening nearby?" | No MenuList-owned source by default | Unsupported unless a cached connector summary is explicitly added |

### Page Context and Target Resolution

The assistant should understand "this item", "this menu", or "this screen" only through explicit UI context, not guessing.

`OwnerBusinessAssistantContextPacket` should include a small `clientContext` block:

```ts
type OwnerBusinessAssistantClientContext = {
  currentRoute?: string;
  mobileTab?: 'today' | 'menu' | 'share' | 'more';
  selectedProjectId?: string;
  selectedItemId?: string;
  selectedCategoryId?: string;
  selectedOutletId?: string;
  visibleEntityRefs?: Array<{
    kind: 'project' | 'menu_item' | 'category' | 'store' | 'screen' | 'feedback' | 'review';
    id: string;
    label: string;
  }>;
};
```

Client context is advisory. The server still resolves and verifies every target from tenant/store scope before answering or preparing an action. If the target is ambiguous, the assistant must ask the owner to pick from packet-backed candidates instead of running a broad search.

Shared server cache entries must store business facts, not page-selection state. Request-time `clientContext` is merged into the packet after the cache lookup and omitted from durable/shared cache keys. Browser memory may carry page context for the active view, but it must not become the source of authority for target writes.

### Answer Artifacts

Answers should be structured for owner scanning, not only free text:

```ts
type OwnerAssistantAnswerArtifact =
  | { type: 'text'; body: string }
  | { type: 'metric_row'; metrics: Array<{ label: string; value: string; deltaLabel?: string }> }
  | { type: 'compact_table'; columns: string[]; rows: string[][]; maxRows: number }
  | { type: 'trend_series'; label: string; points: Array<{ label: string; value: number }> }
  | { type: 'action_options'; actions: OwnerAssistantActionOption[] };
```

Artifacts must be generated from packet facts only. No CSV/export/raw-row download belongs in this feature unless the data already exists in a compact cached report and the export path is explicitly registered.

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
| Assistant threads/messages | Business Health APIs | `ownerBusinessAssistantThreads.messages[]` | Conversation continuity under the thread flag | One doc per chat, bounded message array, not required for read-only Health |
| Assistant answer events | Platform monitoring APIs | `ownerBusinessAssistantAnswerEvents` | Internal answer quality, unsupported-gap, action-usage, and cost review | Compact, server-only, usage-logging flag, not owner chat history |
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

On a context-packet cache miss, the answer API may read:

- `ownerBusinessHealthCurrent` for health context.
- `ownerBusinessAnalyticsIndex` for analytics intents.
- Cached public project/store projection for public menu or business-profile facts.
- One live daily doc for the current local date when `today` freshness is required and the flag allows the overlay.

It must not read N daily docs for a message. If a new custom period becomes important, the scheduler/index builder must add that period to the index first. Cache hits should serve answers with zero Firestore reads.

### Cache-First Context Packet

The answer API should not read Firestore first. It should ask for an owner-safe packet first:

```text
question + scope
  -> context packet cache lookup
  -> cache hit: AI/resolver receives packet with 0 Firestore reads
  -> cache miss: read compact docs, build packet, write cache, answer
```

The packet is the only data shape the AI answer layer receives.

```ts
type OwnerBusinessAssistantContextPacket = {
  version: 1;
  packetId: string;
  cacheKey: string;
  cacheSource: 'browser' | 'server' | 'fresh_firestore';
  tId: string;
  sId: string;
  projectId?: string;
  localBusinessDate: string;
  validUntil: string;
  generatedAt: string;
  sourceSignatures: {
    healthCurrent?: string;
    analyticsIndex?: string;
    todayOverlay?: string;
    publicProjection?: string;
    domainFacts?: string;
    actionCatalog?: string;
  };
  health: OwnerBusinessHealthCurrentDoc;
  analytics?: Pick<OwnerBusinessAnalyticsIndexDoc, 'periods' | 'unsupportedPeriods' | 'sourceRefs'>;
  todayOverlay?: OwnerBusinessAnalyticsPeriod;
  domainFacts?: {
    menu?: Record<string, unknown>;
    store?: Record<string, unknown>;
    publicLinks?: Record<string, unknown>;
    screens?: Record<string, unknown>;
    feedback?: Record<string, unknown>;
    reviews?: Record<string, unknown>;
    domains?: Record<string, unknown>;
    outlets?: Record<string, unknown>;
    billing?: Record<string, unknown>;
    users?: Record<string, unknown>;
    integrations?: Record<string, unknown>;
    compliance?: Record<string, unknown>;
  };
  clientContext?: OwnerBusinessAssistantClientContext;
  allowedActions: OwnerBusinessActionDefinition[];
  answerRules: {
    refuseUnsupported: true;
    sourceFactIdsRequired: true;
    noRevenueProfitWithoutSource: true;
    noPublicMutationWithoutConfirmation: true;
  };
};
```

Cache keys must include tenant, store, active project, local business date, packet profile, and source signature when available:

```text
owner-business-assistant:packet:v1:{tId}:{sId}:{projectId}:{localBusinessDate}:{packetProfile}:{signature}
```

Recommended cache layers:

| Layer | Use | Expiry |
| --- | --- | --- |
| Browser SWR/localStorage | Dashboard card, analytics strip, full page first render | Store-local scheduler cache key, matching existing owner dashboard behavior |
| Server cache/Upstash | Answer API context packet shared across typed questions/devices | Until next store-local EOD scheduler window |
| Today overlay cache | "Today so far" facts | 10 minutes |
| Action target cache | Draft display only | Short-lived; never used for final confirm |

Upstash is acceptable for the server context-packet cache because the dependency already exists. It must remain an optimization, not a correctness dependency: when cache is unavailable, the API falls back to compact Firestore reads and returns a cache miss metric.

### AI Answer Layer

Owner-typed questions should use AI over the context packet. The model does not receive raw Firebase collections.

```text
owner question
  + OwnerBusinessAssistantContextPacket
  + allowed intent/action schema
  + answer rules
  -> AI structured response
  -> server validation
  -> owner response
```

The AI must return structured JSON:

```ts
type OwnerBusinessAssistantAiResponse = {
  status: 'answered' | 'needs_more_data' | 'unsupported' | 'needs_confirmation';
  answer: string;
  freshnessLabel: string;
  sourceFactIds: string[];
  artifacts?: OwnerAssistantAnswerArtifact[];
  cards?: OwnerAssistantCard[];
  actions?: OwnerAssistantActionOption[];
  confidence: 'high' | 'medium' | 'low';
};
```

The server must validate that source fact IDs exist in the packet, unsupported claims are not present, actions are registered, and permissions/public-truth guards still pass. Invalid model output becomes a refusal or a safe retry response.

Deterministic/template answers remain allowed only as a fallback for feature-off, provider-unavailable, or fixed dashboard rendering. The product answering layer for typed owner questions is AI over the cached packet.

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

### Provider-Backed Answering

AI-backed answering is part of the complete architecture for typed owner questions. Deterministic responses are fallback paths, not the primary typed-question experience.

Before any provider-backed route is enabled:

1. Add an `AI_ACTIONS_TYPES` value for owner business assistant answers.
2. Add real cost and unit cost entries.
3. Use SAFE_MODE, AI rate limits, accounting, and `remainingBalance` propagation.
4. Build the context packet cache first so provider calls do not also cause repeated Firestore reads.
5. Return deterministic/template answers only when provider answering is disabled, unavailable, or not needed for static dashboard rendering.

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
  targetKinds: Array<'project' | 'menu_item' | 'category' | 'store' | 'media' | 'feedback' | 'review' | 'outlet' | 'billing' | 'domain' | 'screen' | 'customer_app' | 'qr' | 'pos' | 'team' | 'compliance'>;
  resolver: 'summary' | 'project_doc' | 'store_doc' | 'existing_api' | 'screen_route';
  draftSchema?: string;
  executor: string;
  cacheImpact: 'none' | 'project_public' | 'store_public' | 'screen_public';
  aiCostAction?: string;
};
```

### Implemented Action Catalog Summary

| Owner asks | Action type | Existing system to reuse | Storage needed | Write behavior |
| --- | --- | --- | --- | --- |
| Open the detailed health view | `open_business_health_detail` | `/business-health` route | None | Navigation only |
| Show analytics | `open_dashboard_analytics` | Existing dashboard analytics | None | Navigation only |
| Open this item | `open_menu_editor_target` | Existing editor route/context | None | Navigation only |
| Show QR/app/screen/public link | `open_qr_share`, `open_customer_app_settings`, `open_digital_screen_settings` | Existing Share, Customer App, and Digital Screen surfaces | None | Navigation/copy only |
| Check domain/POS/billing/users/locations/compliance | `open_domain_settings`, `open_pos_sync_settings`, `open_billing`, `open_users_permissions`, `open_locations`, `open_compliance_pages` | Existing settings, billing, users, locations, integrations, compliance surfaces | None | Navigation only |
| Rewrite this description | `prepare_description_rewrite`, `menu_item_description_prepare` | Compact draft storage; existing editor remains the save path | Draft + action audit | No direct public write |
| Mark the store closed/opening late | `store_temp_status_set`, `store_temp_status_clear` | Compact draft storage; existing temp-status screen/API remains the save path | Draft + action audit | No direct public write |
| Draft a review reply | `prepare_review_reply`, `review_reply_prepare` | Compact review-reply draft storage | Draft + action audit | Owner reviews/copies; no public posting |
| Make this menu live | `open_publish_screen` | Existing publish/editor screen | None | Navigation only |
| Mark or dismiss a check | `mark_health_check_reviewed`, `dismiss_health_check` | Assistant action audit storage | Compact action write | Confirm state change |

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
- Add cache-first context packet builder and cache adapter.
- Add protected API service layer.
- Add AI structured-answer resolver over the context packet.
- Add MobileShell mapping and mobile screen.
- Add action registry and target resolver contract.
- Extend or replace owner usage logging for assistant value events; use compact answer-event logging for internal platform observation when the usage logging flag is enabled.
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

- Max 20 messages per active thread doc.
- Messages are embedded in `ownerBusinessAssistantThreads/{threadId}.messages[]`; do not create one Firestore document per message.
- 30-day retention.
- No token-by-token persistence.

Answer events:

- 180-day retention.
- Store trimmed question/answer text and cost/status metadata only.
- Internal monitor only; do not use as owner-facing long-term transcript storage.

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
