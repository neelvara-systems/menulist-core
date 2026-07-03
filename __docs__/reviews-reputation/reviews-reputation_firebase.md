# Reviews & Reputation — Firebase Cost Tracking

**Feature:** Silent Reputation Defense Layer  
**Status:** 🔒 SPEC LOCKED — Implementation blocked until GBP API access granted  
**Last Updated:** July 1, 2026
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

### Browser Response Diagnostics

June 30, 2026 review-state request/response hardening is cost-neutral. `ReputationGuard` calls `/api/reviews/states` with no-store cache policy, same-origin credentials, and manual redirect handling, caps response JSON at 16KB, and requires `success: true` plus boolean `hasBlockActive` / `hasEscalationActive` values before updating passive warning state. This adds no Firestore reads/writes/deletes beyond existing valid state checks, Storage operations, provider calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

June 30, 2026 Review Reply response/request acknowledgement is browser-only hardening. `ReviewReplyTool` submits `/api/reviews/suggest` with same-origin credentials, no-store cache policy, and manual redirect handling, then caps response parsing at 16KB and requires `{ success: true, reply }` before showing a suggestion or incrementing attempts. It adds no Firestore reads/writes/deletes, provider calls, route behavior, AI accounting writes, rules, indexes, Cloud Function logic, Firebase deploy requirement, Vercel deploy action, or owner-facing settings.

June 30, 2026 Review Reply prompt-input normalization is Firebase-cost neutral. `/api/reviews/suggest` still uses the same feature gates, auth, tenant access, 16KB body cap, Zod schema, SAFE_MODE/rate-limit/capacity checks, Gemini call/fallback behavior, AI accounting write, and credit consumption order. The route now caps `businessType`, strips control/template characters from pasted review/business-type prompt inputs, escapes sanitized review text with JSON string serialization, and records sanitized prompt length/business type metadata. This adds no Firestore reads/writes/deletes, Storage operations, provider calls beyond existing valid suggestions, cache invalidations, rules, indexes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

June 30, 2026 Review Reply copy acknowledgement is browser-only hardening. `ReviewReplyTool` shows copied feedback only after Clipboard API success or acknowledged textarea fallback success, and failed copy diagnostics add clipboard/fallback support booleans without logging raw pasted review text or generated reply text. It adds no Firestore reads/writes/deletes, Storage operations, provider calls, route behavior, AI accounting writes, rules, indexes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

July 1, 2026 Review Reply source acknowledgement is browser-only hardening. `ReviewReplyTool` now requires the successful suggestion envelope to include `source: "ai" | "fallback"` before showing a reply, setting the source badge, syncing balance, or incrementing attempts. It adds no Firestore reads/writes/deletes, Storage operations, provider calls, route behavior, AI accounting writes, rules, indexes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

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
