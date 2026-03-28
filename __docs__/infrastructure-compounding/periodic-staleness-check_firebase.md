# Periodic Staleness Check — Firebase Cost Analysis

**Feature:** 10.4  
**Status:** 📋 DOCUMENTATION PHASE

---

## Cost Impact: ~$0.01/month per 100 stores

---

## Nightly Computation

### Reads

| Operation | Count | Notes |
|-----------|-------|-------|
| `platformSummary/storeTruthConfidence` | 1 | Read staleFlag per store |
| `messageLogs` query per stale store | 1 per stale store | Idempotency check (was message already sent?) |
| `stores/{sId}` per stale store needing message | 1 per store | Get owner email |

**Key insight:** Most stores will NOT be stale. Only stores with `daysSincePublish > 90` are checked further. Of those, most will have already received a message (skipped by idempotency).

**Realistic estimate per night:**

| Scale | Total Stores | Stale (>90 days) | Need Message | Total New Reads |
|-------|-------------|-------------------|-------------|----------------|
| 10 stores | 10 | 1-2 | 0-1 | 3-5 |
| 100 stores | 100 | 10-15 | 2-3 | 15-20 |
| 1,000 stores | 1,000 | 100-150 | 10-20 | 120-170 |

### Writes

| Operation | Count | Notes |
|-----------|-------|-------|
| `messageLogs/{logId}` | 1 per message sent | Idempotency log |

**Realistic estimate per night:**

| Scale | Messages Sent | Writes |
|-------|--------------|--------|
| 10 stores | 0-1 | 0-1 |
| 100 stores | 2-3 | 2-3 |
| 1,000 stores | 10-20 | 10-20 |

---

## Monthly Cost

| Scale | Reads/month | Writes/month | Read Cost | Write Cost | **Total** |
|-------|------------|-------------|-----------|-----------|-----------|
| 10 stores | 90-150 | 0-30 | $0.0001 | $0.00002 | **$0.0001** |
| 100 stores | 450-600 | 60-90 | $0.0004 | $0.00006 | **$0.0005** |
| 1,000 stores | 3,600-5,100 | 300-600 | $0.003 | $0.0004 | **$0.004** |

**Verdict: Negligible. Cost is dominated by idempotency queries, which are cheap and bounded.**

---

## Email Sending Cost

Email is sent via existing infrastructure (same provider as renewal reminders). Cost per email is typically $0.001-0.01 depending on provider.

| Scale | Emails/month | Email Cost |
|-------|-------------|-----------|
| 10 stores | 0-1 | $0.00-0.01 |
| 100 stores | 2-5 | $0.02-0.05 |
| 1,000 stores | 10-30 | $0.10-0.30 |

---

## Firestore Index Requirements

**Required compound index on `messageLogs`:**
```
messageLogs — (type ASC, recipientStoreId ASC, sentAt DESC)
```

Check if this index exists or can be covered by existing indexes. If not, create it. Single composite index, negligible storage cost.

---

## Cost Safety

- **Feature flag:** `ENABLE_STALENESS_CHECK` — instant disable
- **No new collections:** Uses existing `messageLogs`
- **Throttle:** Max 50 messages per night (prevents burst)
- **Idempotency:** No duplicate messages within 90-day window
- **Dormant skip:** Phase 3 stores skipped (won't respond, don't waste email)
- **Cost telemetry:** Logs reads/writes to `systemTelemetry`
- **Graceful degradation:** If 10.3 truth confidence doc missing, task skips silently

---

**Author:** Cascade (Lead Architect)  
**Created:** February 24, 2026
