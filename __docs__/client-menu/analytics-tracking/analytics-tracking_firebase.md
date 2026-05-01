# Analytics Tracking — Firebase Cost Tracking

**Feature:** Customer Menu Analytics (Internal + GA4 + Facebook Pixel)
**Status:** ✅ Production Ready
**Last Updated:** May 1, 2026
**Priority:** HIGH — Every customer interaction generates analytics writes. Scales with traffic.

---

## Summary

- **Collections Used:** `analytics` (daily aggregated docs)
- **Storage Buckets:** None
- **Cloud Functions:** shared nightly scheduler `computeDecisionBlocksScores` plus analytics helpers in `aggregateCustomerAnalytics.ts`
- **Estimated Monthly Cost:** **Medium** — Write-heavy, scales linearly with customer traffic

---

## Firestore Operations

### Reads

| Operation | Collection | Trigger | Frequency | Docs Read | Notes |
|-----------|-----------|---------|-----------|-----------|-------|
| Read owner dashboard summary | `analytics/{tId}_{sId}_{projectId}_dashboard_summary` | Owner opens Dashboard | Per scheduler cache window | 1 | Settled Overview/Daily/Weekly/Monthly/All-time read from one nightly read-model doc. Cached until after the next store-local scheduler window. |
| Read today analytics | `analytics/{tId}_{sId}_{projectId}_daily_{date}` | Owner opens Dashboard | 10 min TTL | 1 | `Today so far` remains separate because it is partial live activity. |
| Read deep analytics range | `analytics/{tId}_{sId}_{projectId}_dashboard_summary` | Owner opens detailed analytics/date-range view | Per scheduler cache window | 1 for recent settled ranges, 2 when range includes today | Uses compact rolling daily rows inside the dashboard read model. Older/custom ranges outside the read model are not rebuilt from daily docs on the owner client. |
| Read analytics intelligence input | `analytics/{tId}_{sId}_{projectId}_intelligence_7d` | Nightly intelligence job | Per active project | 1 | Decision Blocks + Menu Intelligence read the scheduler-written 7-day input doc. Missing/stale snapshots settle as empty for that run instead of falling back to daily-doc reads. |
| Read settlement docs | `analytics` | Nightly analytics settlement | Per store/date | Existing daily docs for that store/date | Uses queryable daily metadata: `tId`, `sId`, `grain='daily'`, `localDate`. Avoids scanning all analytics docs for a store. |

### Writes

| Operation | Collection | Trigger | Frequency | Docs Written | Notes |
|-----------|-----------|---------|-----------|-------------|-------|
| Increment daily counters | `analytics/{tId}_{sId}_{projectId}_daily_{date}` | Customer menu interactions | Coalesced for passive events; immediate for final actions | 1 per flush/action | Events: MENU_VIEW, ITEM_VIEW, ITEM_CLICK, DECISION_BLOCK_CLICK, SEARCH, UNAVAILABLE_ITEM_ATTEMPT, MENU_ACTION_CLICK. Passive/engagement counters queue for ~3 seconds and merge into one atomic daily-doc write. Final actions such as call, WhatsApp, directions, reserve, order, OBP links, and app install actions write immediately. |
| Aggregate daily stats | `analytics` (aggregated docs) | Shared timezone-aware nightly scheduler | Daily per store-local date | 1 per active project with activity, plus rollup docs when needed | `computeDecisionBlocksScores` runs OBP first, then customer/menu analytics in one locked store/date pass. Summary updates are idempotent and skipped if the date is already aggregated. |
| Write owner dashboard read model | `analytics/{tId}_{sId}_{projectId}_dashboard_summary` | Shared timezone-aware nightly scheduler | Daily per settled project/surface | 1 | Stores settled owner-facing overview, daily, weekly, monthly, all-time, and compact rolling daily rows so dashboards do not rebuild from daily docs. Steady-state updates reuse the existing read model plus the settled day; daily-range rebuilds are only for first deploy/cache gaps. |
| Write intelligence input read model | `analytics/{tId}_{sId}_{projectId}_intelligence_7d` | Shared timezone-aware nightly scheduler | Daily per settled menu project | 1 | Stores compact 7-day item analytics used by Decision Blocks and Menu Intelligence, avoiding repeated 7-day daily-doc reads during the same scheduler flow. |
| Settlement state / lock | `platformSummary/nightlyState_*`, `platformSummary/nightlyLock_*` | Shared timezone-aware nightly scheduler | Per due store/date | 1 state doc + 1 lock doc | Prevents duplicate processing and enables missed-day catch-up from the last settled local date. The completed state also stores a compact store-level analytics index: active project ids, settled surfaces, and summary doc ids. |

### Deletes

None — analytics data is append-only / increment-only.

---

## Cloud Functions

| Function | Trigger | Frequency | Duration | Memory | Notes |
|----------|---------|-----------|----------|--------|-------|
| `computeDecisionBlocksScores` | Scheduled (hourly, timezone-aware) | 24x/day scheduler, but each store settles once at its local nightly hour | 10-30s typical per batch | 256MB | Runs decision blocks, menu intelligence, OBP analytics, and customer analytics in one store-scoped nightly flow. |

---

## Cost Estimate (per 1000 stores, 100 customer scans/store/month)

| Resource | Operations/month | Unit Cost | Monthly Cost |
|----------|-----------------|-----------|-------------|
| Firestore Writes (events) | Up to 100,000 before coalescing; lower when customers generate multiple passive events in one short session | $0.18/100K | <= $0.18 |
| Firestore Reads (dashboard) | 50,000 | $0.06/100K | $0.03 |
| Firestore Reads (scoring) | 60,000-90,000 | $0.06/100K | ~$0.04-$0.05 |
| Cloud Functions | 30,000 | $0.40/M | $0.01 |
| **Total** | | | **~$0.27/month before client-side coalescing savings** |

> **Note:** Public customer writes remain the main traffic-based cost lever. Scoring reads are now bounded by compact read-model docs instead of hidden daily-range rebuilds.

## Cost Discipline Rules

- **Allowed:** explicit, low-frequency intent signals such as menu opens, item opens, unique search terms, recommendation taps, unavailable-item taps, and final CTA clicks.
- **Rejected:** scroll depth, per-keystroke search, hover tracking, heartbeat/session pings, and any passive event that would create steady write volume.
- **Search rule:** one unique search term per store/project/session. This preserves demand signals without turning typing into write spam.
- **Write coalescing rule:** passive/engagement counters may queue for a short client-side window and flush together. Final conversion actions must write immediately.
- **Storage rule:** all raw tracking metrics must be additive fields on the existing daily analytics doc. Owner dashboards may use nightly read-model docs in the same `analytics` collection to avoid repeated daily-range reads.
- **Dashboard read-model rule:** settled owner-facing Dashboard and recent deep analytics data must be read from `{tId}_{sId}_{projectId}_dashboard_summary`. Do not rebuild settled dashboard cards from daily docs on the owner client.
- **Custom range rule:** do not precompute every possible owner-selected range. Keep one compact rolling daily read model; older/custom ranges outside that window are not fetched from daily docs by default.
- **Intelligence input rule:** Decision Blocks and Menu Intelligence must use `{tId}_{sId}_{projectId}_intelligence_7d`. Missing/stale snapshots return empty for that run; they must not trigger hidden daily-doc reads.
- **Owner-visible rule:** Firestore tracking is reserved for metrics shown in owner dashboards or required by scheduler decisions. Generic ecommerce/auth/share/location/ops events stay GA4-only until they have a real owner-facing read model.
- **Cache rule:** scheduler-backed owner data is cached by store-local scheduler cycle, not by midnight. It invalidates after the next expected local scheduler completion window; partial `Today so far` data keeps a 10-minute TTL.
- **Date rule:** daily analytics docs and hourly buckets use the **store timezone**. Analytics no longer rely on UTC day keys for owner-facing menu / OBP / Customer App reporting.
- **Daily metadata rule:** every daily analytics write must include `tId`, `sId`, `projectId`, `grain`, `surface`, `localDate`, and `storeTimeZone` in the same write as the counters. This enables store/date settlement queries without extra event writes.
- **Settlement rule:** nightly aggregation is idempotent. Lifetime totals must never increment when the target local date is already recorded as settled on the summary/state documents.
- **Catch-up rule:** if the scheduler misses a night, the next local nightly run processes pending store-local dates in order, capped per run to protect Firebase cost.
