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
- **Cost posture:** Summary-first. No chat-time raw analytics ranges, menu scans, or assistant-owned public-truth writes.

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

### Dashboard Card

| Operation | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| GET current Business Health | 1 | 0 | Server reads `platformSummary/current` and filters response |

### Business Health Page Open

| Operation | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Current Business Health | 1 | 0 | Same as card; SWR can reuse |
| Analytics index | 0-1 | 0 | Only when analytics strip/detail is visible or asked for |
| Flag-gated active thread | 0-2 | 0 | Only under the thread flag |

### Dashboard Analytics Strip

| Operation | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Current Business Health | 0-1 | 0 | Reuse dashboard card response where possible |
| Analytics index | 1 | 0 | Returns compact periods: Today, This week, This month |
| Today overlay | 0-1 | 0 | Optional one daily doc for fresher partial stats |

### Suggested Question

| Operation | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Resolve approved intent | 0-1 | 0-1 | Reuse loaded current doc where possible; flag-gated aggregate usage update |

### Analytics Question

| Operation | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Resolve period intent | 0-1 | 0 | Reuse current doc when already loaded |
| Load analytics index | 1 | 0 | Standard periods only |
| Today overlay | 0-1 | 0 | Only for `today` or current-period answers if freshness flag is enabled |

Custom arbitrary periods are not allowed to read N daily docs at question time. They must be refused or pre-added to the analytics index by scheduler work.

### Free-Text Provider Answer

Only under `ENABLE_OWNER_BUSINESS_HEALTH_FREE_TEXT` when provider-backed formatting is required.

| Operation | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| SAFE_MODE check | 1 | 0 | Existing `ops_config/system` read, only when cost protection enabled |
| Current doc | 1 | 0 | Grounding packet |
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

- Any chat answer path that queries raw analytics ranges.
- Any analytics question that reads N daily docs at runtime.
- Any chat answer path that scans menu items.
- Any chat answer path that scans raw reviews/feedback.
- Any persistent write per token/typing event.
- Any assistant provider call for stable/template answers.
- Any public-truth write outside existing domain services.
- Any new standalone scheduled function.

Monitoring thresholds:

| Metric | Alert |
| --- | --- |
| Average answer reads > 5 | Investigate raw-source fallback |
| Analytics question reads > 3 | Check for range scans or missing index |
| Current doc > 850 KB | Compact facts or split optional blocks |
| Analytics index > 850 KB | Reduce period payload/top-list caps |
| Provider calls for suggested questions | Disable free-text/provider path |
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

| Resource | Operations/month | Rough cost posture |
| --- | ---: | --- |
| Scheduler reads | 9,000-24,000 | Low, summary/capped reads only |
| Scheduler writes | 6,000-9,000 | Low; current + analytics index + capped daily snapshot |
| Card/page reads | 2,000 | Low |
| Analytics index reads | 2,000-4,000 | Low |
| Suggested answer reads | 0-4,000 | Low, mostly cached |
| Analytics answer reads | 2,000-6,000 | Low; index plus optional today overlay |
| Suggested answer writes | 0-4,000 | Conditional usage aggregate only |
| Provider calls | 0 default | Disabled unless flag enabled |
| Storage | 0 | Core Business Health; Action Support image actions use existing media paths only when invoked |

Verdict: acceptable only if the summary-first contract is preserved.
