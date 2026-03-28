# Reviews & Reputation — Firebase Cost Tracking

**Feature:** Silent Reputation Defense Layer  
**Status:** 🔒 SPEC LOCKED — Implementation blocked until GBP API access granted  
**Last Updated:** February 7, 2026  
**Priority:** LOW (currently) — Not yet implemented. Document for future cost planning.

---

## Summary

> **Note:** This feature is spec-locked pending Google Business Profile API access. Firebase operations below are PLANNED, not yet in production.

- **Collections (Planned):** `reviewAlerts/{tId}/{sId}`, `replyDrafts/{tId}/{sId}`, `reputationConfig/{tId}/{sId}`
- **Storage Buckets:** None planned
- **Cloud Functions (Planned):** `reviewMonitor` (webhook/polling), `replyGuard` (validation)
- **Estimated Monthly Cost:** **Low** — Infrequent operations (reviews arrive slowly)

---

## Planned Firestore Operations

### Reads (Planned)

| Operation | Collection | Trigger | Frequency | Notes |
|-----------|-----------|---------|-----------|-------|
| Fetch reputation config | `reputationConfig/{tId}/{sId}` | Owner opens settings | Per settings view | Store-level reply tone, blocked phrases config. |
| Load review alerts | `reviewAlerts/{tId}/{sId}` | New review detected | Per review | Stores review metadata for defensive analysis. |

### Writes (Planned)

| Operation | Collection | Trigger | Frequency | Notes |
|-----------|-----------|---------|-----------|-------|
| Store review alert | `reviewAlerts/{tId}/{sId}` | GBP webhook/poll | Per new review | Incoming review metadata stored for processing. |
| Store reply draft | `replyDrafts/{tId}/{sId}` | Owner writes reply | Per reply attempt | Draft held for validation before posting. |
| Save reputation config | `reputationConfig/{tId}/{sId}` | Owner updates settings | Rare | Reply tone, blocked phrases, escalation rules. |

### Deletes

None planned — reviews and replies are immutable records.

---

## Cloud Functions (Planned)

| Function | Trigger | Frequency | Duration | Notes |
|----------|---------|-----------|----------|-------|
| `reviewMonitor` | GBP webhook or scheduled poll | Per new review | 5-10s | Fetches new reviews, stores alerts, triggers analysis. |
| `replyGuard` | Before reply is posted | Per reply attempt | 2-5s | Validates reply against blocked phrases, emotional tone detection. |

---

## Cost Estimate (Planned)

Minimal — reviews arrive at ~5-20 per store per month. Total Firestore operations extremely low.

| Resource | Operations/month (1000 stores) | Monthly Cost |
|----------|-------------------------------|-------------|
| Firestore Reads | ~20,000 | $0.01 |
| Firestore Writes | ~10,000 | $0.02 |
| Cloud Functions | ~10,000 | $0.01 |
| **Total** | | **~$0.04/month** |

---

## Implementation Status

❌ **Not yet implemented.** Blocked on GBP API access. This document is a pre-implementation cost plan to be updated when implementation begins.
