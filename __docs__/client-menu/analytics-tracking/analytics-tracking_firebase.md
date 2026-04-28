# Analytics Tracking — Firebase Cost Tracking

**Feature:** Customer Menu Analytics (Internal + GA4 + Facebook Pixel)
**Status:** ✅ Production Ready
**Last Updated:** April 28, 2026
**Priority:** HIGH — Every customer interaction generates analytics writes. Scales with traffic.

---

## Summary

- **Collections Used:** `analytics` (daily aggregated docs)
- **Storage Buckets:** None
- **Cloud Functions:** `aggregateCustomerAnalytics` (scheduled daily)
- **Estimated Monthly Cost:** **Medium** — Write-heavy, scales linearly with customer traffic

---

## Firestore Operations

### Reads

| Operation | Collection | Trigger | Frequency | Docs Read | Notes |
|-----------|-----------|---------|-----------|-----------|-------|
| Read daily analytics | `analytics` | Owner views dashboard | Per dashboard view | 7-30 | Date-range query for analytics period. |
| Read analytics (scoring) | `analytics` | Nightly intelligence job | Per active project | 7-30 | Decision blocks + intelligence scoring reads daily docs. |

### Writes

| Operation | Collection | Trigger | Frequency | Docs Written | Notes |
|-----------|-----------|---------|-----------|-------------|-------|
| Increment daily counters | `analytics/{tId}_{sId}_{projectId}_daily_{date}` | Customer menu interactions | Per event | 1 (merge/increment) | Events: MENU_VIEW, ITEM_VIEW, ITEM_CLICK, DECISION_BLOCK_CLICK, SEARCH, UNAVAILABLE_ITEM_ATTEMPT, MENU_ACTION_CLICK. Uses atomic `increment()` operations. |
| Aggregate daily stats | `analytics` (aggregated docs) | Scheduled Cloud Function | Daily | 1 per project | `aggregateCustomerAnalytics` rolls up daily data, including search demand, unavailable-item demand, and final menu CTA clicks into summary / weekly / monthly docs. |

### Deletes

None — analytics data is append-only / increment-only.

---

## Cloud Functions

| Function | Trigger | Frequency | Duration | Memory | Notes |
|----------|---------|-----------|----------|--------|-------|
| `aggregateCustomerAnalytics` | Scheduled (daily) | 1x/day | 10-30s | 256MB | Aggregates daily counters into summary docs. |

---

## Cost Estimate (per 1000 stores, 100 customer scans/store/month)

| Resource | Operations/month | Unit Cost | Monthly Cost |
|----------|-----------------|-----------|-------------|
| Firestore Writes (events) | 100,000 (1 per scan, merged) | $0.18/100K | $0.18 |
| Firestore Reads (dashboard) | 50,000 | $0.06/100K | $0.03 |
| Firestore Reads (scoring) | 900,000 | $0.06/100K | $0.54 |
| Cloud Functions | 30,000 | $0.40/M | $0.01 |
| **Total** | | | **~$0.76/month** |

> **Note:** Scoring reads dominate cost. Customer write cost is modest due to atomic increment pattern (1 write per event, not per field).

## Cost Discipline Rules

- **Allowed:** explicit, low-frequency intent signals such as menu opens, item opens, unique search terms, recommendation taps, unavailable-item taps, and final CTA clicks.
- **Rejected:** scroll depth, per-keystroke search, hover tracking, heartbeat/session pings, and any passive event that would create steady write volume.
- **Search rule:** one unique search term per store/project/session. This preserves demand signals without turning typing into write spam.
- **Storage rule:** all new metrics must be additive fields on the existing daily analytics doc. No new collection unless nightly aggregation cannot reuse the current pattern.
