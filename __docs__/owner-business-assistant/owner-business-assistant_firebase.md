# Owner Business Assistant Firebase Cost Tracking

**Owner-Facing Name:** Business Health
**Internal Slug:** owner-business-assistant
**Product:** MenuList
**Status:** Planning complete, implementation not started
**Last Updated:** June 7, 2026

---

## Summary

- **Primary collection:** `platformSummary` (existing)
- **Primary docs:** `ownerBusinessHealthCurrent_{tId}_{sId}`, `ownerBusinessAnalyticsIndex_{tId}_{sId}`, `ownerBusinessHealthSnapshot_{tId}_{sId}_{localDate}`
- **New Firestore collections:** None for analytics; separately flag-gated workflow collections for Action Support drafts/actions, threads, and feedback
- **New Firebase Storage paths:** None for Business Health itself; Action Support image flows must use existing media upload paths and store only references in drafts
- **New standalone scheduled functions:** None
- **Scheduler owner:** `functions/src/decisionBlocksScoring.ts` for snapshot generation
- **Maintenance owner:** `functions/src/schedulers/menulistMaintenanceScheduler.ts` for workflow cleanup under thread/action/draft flags
- **Cache posture:** Browser cache first for UI reads; server context-packet cache first for typed answers; Firestore only on cache miss/stale/verified action reload
- **Read posture:** All read-only answer domains must use cached packets, existing cached projections, or scheduler-built summaries. Direct live Firebase is for packet refresh on miss and write-path verification, not normal answering.
- **Cost posture:** Cache-first and summary-first. No chat-time raw analytics ranges, menu scans, raw project scans, feedback/review scans, or assistant-owned public-truth writes.

## Why This Uses `platformSummary`

ChatGPT suggested new top-level snapshot collections. That is not the best cost-first repo fit.

Business Health should use deterministic `platformSummary` documents because:

- The repo already uses `platformSummary` for compact read models.
- `functions/src/decisionBlocksScoring.ts:1073-1127` reads `storesSummary` once to avoid store scans.
- `__docs__/patterns/SUMMARY-DOCUMENT-PATTERN.md` documents the exact cost pattern.
- `firestore.rules:137-170` already restricts direct client access, so protected APIs can read Admin-side and return owner-safe payloads.
- No new index is needed for the hot path.

## Firestore Documents

### Existing Docs Reused

| Document | Operation | Why |
| --- | --- | --- |
| `platformSummary/storesSummary` | READ | Store metadata, scheduler hour, time zone, business-day settings |
| `platformSummary/projects_{sId}` | READ | Active project summary, public state, project labels |
| `analytics/{tId}_{sId}_{projectId}_daily_{today}` | READ optional | Today's partial analytics overlay; one deterministic doc only |
| `analytics/{tId}_{sId}_{projectId}_dashboard_summary` | READ | Settled owner dashboard facts |
| `analytics/{tId}_{sId}_{projectId}_weekly_*` | READ optional | Last week period packet when not already cached |
| `analytics/{tId}_{sId}_{projectId}_monthly_*` | READ optional | Last month period packet when not already cached |
| `menuIntelligence/{docId}` | READ | Existing continuous intelligence state |
| `ownerControlUsage/{tId}_{sId}` | READ optional | Aggregate owner action signal if the usage contract is extended |

### Existing Cached Public/Business Read Contracts Reused

Project, store, and public-screen data already have cache contracts outside Business Health. The assistant should reuse those contracts through sanitized projections in `OwnerBusinessAssistantContextPacket`, not by fetching public pages or reading raw documents per question.

| Existing contract | Reuse decision |
| --- | --- |
| `src/app/client/[[...slug]]/page.tsx` `unstable_cache` wrappers | Reuse underlying cached project/store data shape for public menu/project facts where practical |
| `menu-store-{storeId}` tag | Reuse for project/menu output invalidation |
| `store-{storeId}` tag | Reuse for store-detail invalidation |
| `client-stores` tag | Reuse for public lookup, OBP, PWA shortcut, and compliance lookup invalidation |
| `screen-data` tag | Reuse when confirmed actions affect screen output |
| `platformSummary/projects_{sId}` | Reuse active/default project index instead of reading all project docs |
| `platformSummary/storesSummary` | Reuse store metadata/timezone/business-day context |

If an owner asks about a domain that has no cached projection or compact summary, the answer is unsupported for that question. The fix is to add a compact source adapter/read model, not to add a live collection query to `/answer`.

Domain posture:

| Domain | Read posture | Mutation posture |
| --- | --- | --- |
| Menu/project/store public facts | Cached projection/context packet | Existing project/store domain service only |
| Hours/public info/temp status | Cached store projection/context packet | Temp status may use existing server path; hours/public info default to existing settings screen |
| QR/share/customer app/screen/domain | Cached projection/status where available | Navigate/open by default; confirmed writes only through existing services |
| Feedback/reviews | Compact summary or owner-provided pasted text | Reply draft only; no public posting from assistant |
| Billing/users/POS/integrations | Compact status only | Navigate/open; no payment, role, or POS settings mutation |
| External web/weather/events/competitors | Unsupported without cached connector summary | No runtime web search from `/answer` |

### New Docs

| Document | Operation | Trigger | Notes |
| --- | --- | --- | --- |
| `platformSummary/ownerBusinessHealthCurrent_{tId}_{sId}` | WRITE | Store-local scheduler run | Replaced when compact signature changes |
| `platformSummary/ownerBusinessAnalyticsIndex_{tId}_{sId}` | WRITE | Store-local scheduler run or freshness rebuild | Standard period packets for dashboard analytics and Q&A |
| `platformSummary/ownerBusinessHealthSnapshot_{tId}_{sId}_{localDate}` | WRITE | First successful local-date run | Daily point-in-time proof; retention capped |

### Flag-Gated Workflow Docs

These docs are part of the complete architecture, but they are written only by protected APIs when the matching runtime flag is enabled. No client should write them directly.

| Collection | Operation | Retention | Notes |
| --- | --- | --- | --- |
| `ownerBusinessAssistantThreads` | READ/WRITE | 30 days | Bounded history mode |
| `ownerBusinessAssistantMessages` | READ/WRITE | 30 days | Cap 20 messages per thread |
| `ownerBusinessAssistantActions` | READ/WRITE | 90 days | Action audit for prepare/confirm/cancel/review flows |
| `ownerBusinessAssistantDrafts` | READ/WRITE/DELETE | 7 days | Drafts only; no public truth |
| `ownerBusinessAssistantFeedback` | WRITE | 90 days | Small feedback events |

Suggested-question answers can remain stateless even when the Business Health page is enabled.

## Scheduler Cost Model

### Per Hour

The existing hourly scheduler already:

- Reads `platformSummary/storesSummary` once.
- Filters stores by eligible scheduler window.
- Processes due stores.

Business Health should piggyback on each due store after settled analytics are available.

### Per Due Store

Target read cap:

| Source | Reads | Notes |
| --- | ---: | --- |
| `platformSummary/projects_{sId}` | 1 | Active project/public state summary |
| Dashboard summary docs | 1-3 | Only active/default projects, capped |
| Today daily doc | 0-1 | Optional partial overlay |
| Weekly/monthly period docs | 0-2 | Only if analytics index cannot use dashboard summary fields |
| `menuIntelligence` | 0-1 | Existing per-project intelligence state |
| Store health/account summary | 0-1 | Prefer data already in storesSummary/current store scope |
| Feedback/reviews compact summary | 0-2 | No raw scans |
| Recent changes compact/capped read | 0-1 | Prefer summary/capped recent changes |
| Existing scheduler context | 0 | Reuse loaded store/project data where possible |
| **Target total** | **4-10 reads** | Per due store per local day; must not grow with event volume |

Target writes:

| Write | Count | Notes |
| --- | ---: | --- |
| Current doc | 0-1 | Write only when signature changes or status/freshness changes |
| Analytics index doc | 0-1 | Write only when period signature changes |
| Daily snapshot doc | 0-1 | One per store-local date |
| Scheduler run log | Existing | Do not add noisy per-store logs beyond current scheduler pattern |

## Runtime API Cost Model

### Context Packet Cache

The answer API should use a cache-first packet before Firestore:

```text
owner-business-assistant:packet:v1:{tId}:{sId}:{projectId}:{localBusinessDate}:{packetProfile}:{signature}
```

Recommended storage:

| Cache | Runtime | Purpose | Expiry |
| --- | --- | --- | --- |
| SWR/localStorage | Browser | Dashboard card/page/analytics reuse | Store-local scheduler cache key |
| Server cache/Upstash | Server/API | Reuse context packet across typed questions and devices | Next store-local EOD scheduler window |
| Today overlay cache | Browser/server | Partial "today so far" facts | 10 minutes |
| Exact read-only answer cache | Server/API, optional | Repeat normalized question over same packet signature | Same packet TTL; disabled for actions |

Upstash adds Redis operations, but it can prevent Firestore reads and repeated packet construction on every owner question. It must be feature-flagged and fail open to compact Firestore reads when unavailable.

The Upstash/server cache value must contain reusable business facts only. Request-time page context such as selected item, selected screen, or visible row IDs is merged after cache lookup and must not be stored in shared cache keys or values.

### Dashboard Card

| Operation | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Browser cache hit | 0 | 0 | Same scheduler-day packet reused |
| Server cache hit | 0 Firestore + 1 cache op | 0 | Optional API cache |
| Cache miss GET current Business Health | 1 | 0 | Server reads `platformSummary/current`, filters response, writes cache metadata |

### Business Health Page Open

| Operation | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Browser cache hit | 0 | 0 | SWR/localStorage returns card/page packet |
| Current Business Health cache miss | 1 | 0 | Same as card; SWR can reuse |
| Analytics index cache miss | 0-1 | 0 | Only when analytics strip/detail is visible or asked for |
| Flag-gated active thread | 0-2 | 0 | Only under the thread flag |

### Dashboard Analytics Strip

| Operation | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Browser cache hit | 0 | 0 | Reuse cached dashboard/page packet |
| Current Business Health cache miss | 0-1 | 0 | Reuse dashboard card response where possible |
| Analytics index cache miss | 1 | 0 | Returns compact periods: Today, This week, This month |
| Today overlay cache miss | 0-1 | 0 | Optional one daily doc for fresher partial stats |

### Suggested Question

| Operation | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Context packet cache hit | 0 Firestore + 1 cache op | 0-1 | AI/resolver answers from packet; optional aggregate usage write |
| Context packet cache miss | 1-3 | 0-1 | Current doc + analytics index + cached public project/store projection only as needed; then cache packet |

### Analytics Question

| Operation | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Context packet cache hit | 0 Firestore + 1 cache op | 0 | AI/resolver answers from packet |
| Resolve period intent cache miss | 0-1 | 0 | Reuse current doc when already loaded |
| Load analytics index cache miss | 1 | 0 | Standard periods only |
| Today overlay cache miss | 0-1 | 0 | Only for `today` or current-period answers if freshness flag is enabled |

Custom arbitrary periods are not allowed to read N daily docs at question time. They must be refused or pre-added to the analytics index by scheduler work.

### Free-Text Provider Answer

Only under `ENABLE_OWNER_BUSINESS_HEALTH_AI_ANSWERS` / `ENABLE_OWNER_BUSINESS_HEALTH_FREE_TEXT` when provider-backed answering is required.

| Operation | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Context packet cache hit | 0 Firestore + 1 cache op | 0 | Required before provider call |
| Context packet cache miss | 1-3 | 0-1 cache write | Compact docs only; never raw ranges |
| SAFE_MODE check | 1 | 0 | Existing `ops_config/system` read, only when cost protection enabled |
| Capped thread read | 0-2 | 0 | Optional |
| Message persistence | 0 | 0-2 | Optional |
| Usage aggregate | 0 | 0-1 | Value events only |
| AI operation accounting | 0 | 1+ | Only actual provider calls |
| Credit consumption | 0+ | 1+ | Existing AI capacity path |

Provider calls must use:

- `src/lib/ops/safeMode.ts:33-60`
- `src/lib/rateLimit/configs.ts:17-26`
- `src/lib/ai/accounting.ts:20-67`
- `src/lib/ai/operationLog.ts:71-132`
- `src/services/ai/balanceSync.ts:1-32`

## Action Cost Model

### Navigate

| Reads | Writes | Notes |
| ---: | ---: | --- |
| 0-1 | 0-1 flag-gated | Target resolution may read current snapshot; flag-gated aggregate usage write |

### Prepare Draft

| Reads | Writes | Notes |
| ---: | ---: | --- |
| 1-3 | 1-2 | Resolve target, write draft/action docs under prepare/action storage flags |
| 1-2 | 1-2 | Temporary status draft: resolve store target and write draft/action docs |
| 0-1 | 1-2 + AI operation writes | Review reply draft: owner-provided text can avoid Firestore; compact review fact only when cached |

### Confirm Write

| Reads | Writes | Notes |
| ---: | ---: | --- |
| 2-5 | Existing domain writes + 1 flag-gated audit | Reads draft/action/target, writes through existing DAL/API |

### Public-Truth Publish/Update

| Reads | Writes | Notes |
| ---: | ---: | --- |
| Existing domain cost | Existing domain cost | Must use current publish/store/project services and cache invalidation |

Cache paths:

- Browser DAL: `src/lib/cache/publicClientCache.ts:19-80`
- Server cache tags: `src/lib/actions/revalidateMenuCache.ts:20-24`
- Revalidation API: `src/app/api/revalidate/menu/route.ts:31-78`

Assistant confirmed writes must use one of two patterns:

- Prepare and navigate to the existing editor/settings screen, where the current UI performs the save.
- Use a server mutation adapter that preserves the same validation, MCE/change detection, multi-outlet behavior, menu change logging, sanitization, and cache invalidation as the existing project/store update path.

Raw assistant `setDoc()` writes to public menu/store truth are a cost and correctness blocker.

## Storage Cost

Core Business Health has no Storage operations.

Action Support image actions may upload or generate media only through existing media/image systems. Assistant docs may store only compact references such as target IDs, media URLs, checksums, or prepared upload IDs. Business Health must not upload prompt logs, screenshots, base64 images, or transcripts to Storage.

## Cloud Functions Cost

No new standalone scheduled Cloud Function.

Function changes, if implemented:

| Function | Change |
| --- | --- |
| `computeDecisionBlocksScores` | Add Business Health snapshot build inside existing store-local scheduler path |
| `triggerStoreNightlyScheduler` | Include Business Health rebuild in manual store recovery |
| `menulistMaintenanceScheduler` | Add cleanup tasks under workflow doc flags |

If any of these function files change, deploy the matching Firebase Functions target after validation per repo rule.

## Rules and Indexes

Core read model:

- No new Firestore rule needed if APIs read `platformSummary` via Admin SDK.
- Do not make Business Health `platformSummary` docs directly client-readable unless a separate security review changes the access model.

Optional persistent collections:

- Need tenant-scoped create/read/update rules if used.
- Client should still write through APIs, so rules can be strict or server-only.
- No broad indexes unless product requires querying history; deterministic document IDs are preferred.

## Cost Guardrails

Hard blockers:

- Any typed-answer path that reads Firestore before checking a valid context-packet cache.
- Any chat answer path that queries raw analytics ranges.
- Any analytics question that reads N daily docs at runtime.
- Any chat answer path that scans menu items.
- Any read-only question that reads full project/store docs when a cached projection is missing.
- Any chat answer path that scans raw reviews/feedback.
- Any runtime external web/weather/events/competitor search from the answer route.
- Any persistent write per token/typing event.
- Any assistant provider call before context-packet cache lookup.
- Any provider call for static dashboard card/strip rendering.
- Any public-truth write outside existing domain services.
- Any new standalone scheduled function.

Monitoring thresholds:

| Metric | Alert |
| --- | --- |
| Context packet cache hit rate < 70% after warmup | Check cache key, TTL, or signature churn |
| Average answer reads > 5 | Investigate raw-source fallback |
| Analytics question reads > 3 | Check for range scans or missing index |
| Cache hit with stale `generatedAt` past local EOD | Invalidate packet cache and inspect scheduler key |
| Current doc > 850 KB | Compact facts or split optional blocks |
| Analytics index > 850 KB | Reduce period payload/top-list caps |
| Provider calls without cache lookup/accounting | Disable AI answer path |
| Thread writes per session > 20 messages | Cap or disable persistence |
| Snapshot build reads grow with raw events | Rework to use summaries |

## Monthly Cost Estimate

Assumptions:

- 100 active stores.
- 1 scheduler snapshot per store per local day.
- 20 Business Health opens per store per month.
- 20 analytics strip/detail opens per store per month.
- 40 suggested question answers per store per month.
- 20 analytics questions per store per month.
- Free-text provider path off by default.
- 70-90% context-packet cache hit rate after first page/question per store-local day.

| Resource | Operations/month | Rough cost posture |
| --- | ---: | --- |
| Scheduler reads | 9,000-24,000 | Low, summary/capped reads only |
| Scheduler writes | 6,000-9,000 | Low; current + analytics index + capped daily snapshot |
| Card/page Firestore reads | 0-2,000 | Low; cache hits are 0 reads |
| Analytics index Firestore reads | 0-4,000 | Low; cache hits are 0 reads |
| Suggested/typed answer Firestore reads | 400-4,000 | Depends on cache hit rate; packet hits are 0 reads |
| Analytics answer Firestore reads | 600-6,000 | Depends on cache hit rate; index plus optional today overlay only on miss |
| Server cache operations | 4,000-8,000 | Upstash/server cache ops; feature-flagged optimization |
| Suggested answer writes | 0-4,000 | Conditional usage aggregate only |
| Provider calls | Typed questions only when AI answer flag enabled | Always after context packet lookup and AI accounting guard |
| Storage | 0 | Core Business Health; Action Support image actions use existing media paths only when invoked |

Verdict: acceptable only if the cache-first and summary-first contracts are preserved.
