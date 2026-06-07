# Owner Business Assistant Firebase Cost Tracking

**Owner-Facing Name:** Business Health
**Internal Slug:** owner-business-assistant
**Product:** MenuList
**Status:** Planning complete, implementation not started
**Last Updated:** June 7, 2026

---

## Summary

- **Primary collection:** `platformSummary` (existing)
- **Primary docs:** `ownerBusinessHealthCurrent_{tId}_{sId}`, `ownerBusinessHealthSnapshot_{tId}_{sId}_{localDate}`
- **New Storage paths:** None
- **New standalone scheduled functions:** None
- **Scheduler owner:** `functions/src/decisionBlocksScoring.ts` for snapshot generation
- **Maintenance owner:** `functions/src/schedulers/menulistMaintenanceScheduler.ts` for workflow cleanup when thread/action/draft storage is enabled
- **Cost posture:** Summary-first. No chat-time raw analytics or menu scans.

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
| `analytics/{tId}_{sId}_{projectId}_dashboard_summary` | READ | Settled owner dashboard facts |
| `menuIntelligence/{docId}` | READ | Existing continuous intelligence state |
| `ownerControlUsage/{tId}_{sId}` | READ conditional | Aggregate owner action signal if the usage contract is extended |

### New Docs

| Document | Operation | Trigger | Notes |
| --- | --- | --- | --- |
| `platformSummary/ownerBusinessHealthCurrent_{tId}_{sId}` | WRITE | Store-local scheduler run | Replaced when compact signature changes |
| `platformSummary/ownerBusinessHealthSnapshot_{tId}_{sId}_{localDate}` | WRITE | First successful local-date run | Daily point-in-time proof; retention capped |

### Conditional Workflow Docs

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
| `menuIntelligence` | 0-1 | Existing per-project intelligence state |
| Store health/account summary | 0-1 | Prefer data already in storesSummary/current store scope |
| Feedback/reviews compact summary | 0-2 | No raw scans |
| Recent changes compact/capped read | 0-1 | Prefer summary/capped recent changes |
| Existing scheduler context | 0 | Reuse loaded store/project data where possible |
| **Target total** | **3-8 reads** | Per due store per local day |

Target writes:

| Write | Count | Notes |
| --- | ---: | --- |
| Current doc | 0-1 | Write only when signature changes or status/freshness changes |
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
| Conditional active thread | 0-2 | 0 | Only when thread mode is enabled |

### Suggested Question

| Operation | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Resolve approved intent | 0-1 | 0-1 | Reuse loaded current doc where possible; conditional aggregate usage update |

### Free-Text Provider Answer

Only when `ENABLE_OWNER_BUSINESS_HEALTH_FREE_TEXT` is enabled and provider-backed formatting is required.

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
| 0-1 | 0-1 conditional | Target resolution may read current snapshot; conditional aggregate usage write |

### Prepare Draft

| Reads | Writes | Notes |
| ---: | ---: | --- |
| 1-3 | 1-2 | Resolve target, write draft/action docs when prepare/action storage is enabled |

### Confirm Write

| Reads | Writes | Notes |
| ---: | ---: | --- |
| 2-5 | Existing domain writes + 1 conditional audit | Reads draft/action/target, writes through existing DAL/API |

### Public-Truth Publish/Update

| Reads | Writes | Notes |
| ---: | ---: | --- |
| Existing domain cost | Existing domain cost | Must use current publish/store/project services and cache invalidation |

Cache paths:

- Browser DAL: `src/lib/cache/publicClientCache.ts:19-80`
- Server cache tags: `src/lib/actions/revalidateMenuCache.ts:20-24`
- Revalidation API: `src/app/api/revalidate/menu/route.ts:31-78`

## Storage Cost

No Storage operations.

Business Health must not upload prompt logs, generated files, screenshots, or transcripts to Storage.

## Cloud Functions Cost

No new standalone scheduled Cloud Function.

Function changes, if implemented:

| Function | Change |
| --- | --- |
| `computeDecisionBlocksScores` | Add Business Health snapshot build inside existing store-local scheduler path |
| `triggerStoreNightlyScheduler` | Include Business Health rebuild in manual store recovery |
| `menulistMaintenanceScheduler` | Add cleanup tasks when workflow docs are enabled |

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
| Current doc > 850 KB | Compact facts or split conditional blocks |
| Provider calls for suggested questions | Disable free-text/provider path |
| Thread writes per session > 20 messages | Cap or disable persistence |
| Snapshot build reads grow with raw events | Rework to use summaries |

## Monthly Cost Estimate

Assumptions:

- 100 active stores.
- 1 scheduler snapshot per store per local day.
- 20 Business Health opens per store per month.
- 40 suggested question answers per store per month.
- Free-text provider path off by default.

| Resource | Operations/month | Rough cost posture |
| --- | ---: | --- |
| Scheduler reads | 9,000-24,000 | Low, summary/capped reads only |
| Scheduler writes | 3,000-6,000 | Low |
| Card/page reads | 2,000 | Low |
| Suggested answer reads | 0-4,000 | Low, mostly cached |
| Suggested answer writes | 0-4,000 | Conditional usage aggregate only |
| Provider calls | 0 default | Disabled unless flag enabled |
| Storage | 0 | None |

Verdict: acceptable only if the summary-first contract is preserved.
