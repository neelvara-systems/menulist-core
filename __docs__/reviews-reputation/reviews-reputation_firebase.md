# Reviews & Reputation — Firebase Cost Tracking

**Feature:** Silent Reputation Defense Layer  
**Status:** DORMANT SOURCE FRAGMENTS — no ingestion or product write path
**Last Updated:** July 17, 2026
**Priority:** LOW (currently) — Not yet implemented. Document for future cost planning.

---

## Summary

> **Current source truth:** `reviewsState/{reviewId}` is a flat, server-written state contract with embedded `tId`/`sId`, active rules/indexes, and a disabled authenticated read route. No source writes this collection today. The collections and functions below are future planning only.

### July 17, 2026 Cost and Scale Recheck

- Both flags are false, both server routes reject before rate limiting, Firestore, SAFE_MODE, capacity, or provider work, and the unmounted components cannot create browser traffic. Current runtime cost is therefore zero.
- The two `reviewsState` composites exactly match the two bounded `limit(1)` state queries. They are intentionally retained: an empty dormant collection has no growing index fanout, and deleting the query-required definitions would only make an accidental flag activation fail at runtime.
- No cache, summary document, listener, scheduler, TTL policy, or extra collection is justified while there is no ingestion or writer. Activation must define bounded retention and provider polling/webhook economics before any review document is persisted.
- `npm run verify:reviews-reputation-boundary` protects the zero-work-while-disabled ordering, exact rules/index/query shape, missing writer/posting runtime, and publication hold. `npm run test:reviews:rules` remains the local authorization proof.

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

July 6, 2026 review-state session document-ID boundary is cost-neutral for valid requests. `GET /api/reviews/states` validates session tenant/store IDs with the shared Firestore document-ID guard before limiter keys, query filters, or diagnostics, uses normalized document-ID strings only for hashed limiter key material, and preserves the original numeric/string session values for existing `reviewsState` equality filters. This adds no Firestore reads/writes/deletes beyond existing valid state checks, Storage operations, provider calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

June 30, 2026 Review Reply response/request acknowledgement is browser-only hardening. `ReviewReplyTool` submits `/api/reviews/suggest` with same-origin credentials, no-store cache policy, and manual redirect handling, then caps response parsing at 16KB and requires `{ success: true, reply }` before showing a suggestion or incrementing attempts. It adds no Firestore reads/writes/deletes, provider calls, route behavior, AI accounting writes, rules, indexes, Cloud Function logic, Firebase deploy requirement, Vercel deploy action, or owner-facing settings.

June 30, 2026 Review Reply prompt-input normalization is Firebase-cost neutral. `/api/reviews/suggest` still uses the same feature gates, auth, tenant access, 16KB body cap, Zod schema, SAFE_MODE/rate-limit/capacity checks, Gemini call/fallback behavior, AI accounting write, and credit consumption order. The route now caps `businessType`, strips control/template characters from pasted review/business-type prompt inputs, escapes sanitized review text with JSON string serialization, and records sanitized prompt length/business type metadata. This adds no Firestore reads/writes/deletes, Storage operations, provider calls beyond existing valid suggestions, cache invalidations, rules, indexes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

June 30, 2026 Review Reply copy acknowledgement is browser-only hardening. `ReviewReplyTool` shows copied feedback only after Clipboard API success or acknowledged textarea fallback success, and failed copy diagnostics add clipboard/fallback support booleans without logging raw pasted review text or generated reply text. It adds no Firestore reads/writes/deletes, Storage operations, provider calls, route behavior, AI accounting writes, rules, indexes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

July 11, 2026 classification input/keyword hardening is pre-persistence and cost-neutral. The dormant classifier rejects ratings outside the integer 1-5 contract and non-string comments before classification, matches complete words/phrases instead of arbitrary substrings, and preserves discrimination variants through an explicit bounded rule. It changes no Firestore read/write/delete count, rules, indexes, scheduler, provider, cache, deployment, or owner-visible runtime while the parent feature remains disabled.

July 11, 2026 state-path and provider-fallback reconciliation is persistence-cost neutral. The executable contract is one flat `reviewsState/{reviewId}` collection with required embedded `tId`/`sId`; the protected state API applies both equality predicates and active rules authorize from the embedded scope. Reply-provider failures emit bounded diagnostics before returning the existing static, uncharged fallback. No Firestore operation count, rule/index source, AI debit, scheduler, cache, Firebase deploy, or Vercel deploy changed.

July 11, 2026 rules evidence is local and cost-neutral: `npm run test:reviews:rules` proves own-store/multi-store reads, numeric/string embedded identity compatibility, cross-store/cross-tenant/public denial, scoped-query admission, malformed-scope denial, platform reads, and owner/platform client-write denial against the current Firestore rules emulator. It does not prove deployed rules or live data.

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

❌ **Not implemented as a product.** GBP access is only one prerequisite. Re-enter docs-first implementation for ingestion, state writer, retention, DAL/inbox, desktop/mobile mounts, provider behavior, rules/index verification, deployment, and production smoke before activation.
