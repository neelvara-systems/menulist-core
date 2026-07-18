# SignalDesk Outcome Bridge - Implementation Plan

**Status:** Implemented runtime contract; local emulator verified
**Created:** June 23, 2026
**Runtime reconciled:** July 15, 2026

## Runtime Modules

```txt
src/app/api/signaldesk/outcomes/route.ts
src/lib/signaldesk/outcomeBridgeServer.ts
src/app/api/signaldesk/actions/route.ts
src/lib/signaldesk/workflowServer.ts
src/constants/signaldesk/integrations.ts
```

## Data Flow

```txt
approved action
  -> create actor-bound, idempotent scoped route token
  -> transaction verifies active retained target truth, source-policy/run lineage, current evidence, and owner-qualified conversation
  -> prospect uses MenuList-controlled route
  -> MenuList or operator emits outcome event
  -> bounded route verifies timestamp plus raw-body HMAC
  -> strict payload validation rejects unknown fields
  -> outcome transaction checks exact replay first
  -> transaction resolves an exact accepted replay before current lifecycle/revocation checks
  -> new events revalidate active retained target truth, source-policy/run lineage, current evidence, and source-specific event authority
  -> route events revalidate token scope, hash, target, channel, policy/run lineage, active state, revocation, and expiry
  -> append immutable outcome event/claim/touch, replace the source-scoped summary, update target/route usage, audit, and cost summary atomically
  -> optional activation-watch reconciliation reads strict summary/event authority transactionally and reports pending on failure
```

## Route Token Contract

Route tokens are:

- opaque,
- scoped to one target/action/channel,
- expiring,
- revocable,
- bearer material that must be treated as sensitive until consumed,
- safe to include only in the intended MenuList-controlled route.

Only the one-time raw token is returned to the authorized caller. It is deterministically reproducible only from the server-held bridge secret plus the actor-bound operation key and validated authority fingerprint. Firestore stores its SHA-256 hash, versioned scope `menulist-activation-outcomes-v1`, source action, target, channel, source-policy/run lineage, owner-qualified timestamp, expiry, status, and revocation metadata. The configure-only `revoke-route-token` action is transactionally audited and idempotent.

Token admission is also transactional. The bridge pause, target suppression and lifecycle, target source-policy/run lineage, source-policy status/retention/use authority, latest current evidence, and owner-qualified `interested` conversation state are read inside the same transaction that creates the route token, its immutable idempotency claim, audit event, and cost entry. Firestore retries that decision when any authority document changes, so stale pre-read eligibility cannot create an active token. An exact claim replay is checked first and returns the original token even if the target later enters retention cleanup or the route is revoked; a changed intent under the same actor/key fails closed.

## Outcome Authority Contract

- Every outcome carries explicit `targetId`, `evidenceRef`, and an actor-bound operation key.
- New outcomes require target lifecycle `active`, unexpired target source data, exact target/source-policy expiry lineage, exact target/source-run lineage, and a current evidence packet permitted for evidence use.
- Demand outcomes require a canonical existing `signaldeskDemandSignals` event for the same target; invented source IDs are rejected.
- Route outcomes require the canonical signed route event ID and the persisted route authority described above.
- Manual outcomes cannot claim a demand or route source event.
- Summary identity includes target, outcome type, source, channel, and day. Manual, demand, and route results therefore cannot collapse into one aggregate.
- The summary UTC day and immutable event timestamp derive from the same transaction-attempt millisecond, including requests that begin at midnight rollover.
- Each summary stores `latestOutcomeEventId`; every read validates and couples that event before projecting the public summary DTO. The linkage field itself is not exposed to clients.
- Revenue qualification and activation-watch refresh read current target, policy, account/opportunity, and strict summary/event authority inside their settlement transaction. Their bounded four-page fill-through prevents malformed legacy rows at the head of a query from hiding older valid activation truth.
- Exact accepted replays are resolved from the immutable claim and event before current lifecycle or route revocation checks. New events always use current authority.
- A retention-completed route remains a strict revoked tombstone only when all scheduler lifecycle fields form the exact completed tuple. Its hash/claim can still prove an already accepted replay, while it cannot admit a new event.
- Retained conversation summaries likewise accept only the exact completed lifecycle tuple plus a legal-review marker. Scheduler `conversation-record` and later post-retention rights/inbound reasons remain parseable, while lifecycle tokens and legal-review reasons are omitted from client DTOs.

## MenuList Boundary

SignalDesk can:

- generate route metadata,
- receive outcome events,
- link to MenuList records,
- show attribution summaries.

SignalDesk cannot:

- create or edit MenuList stores,
- publish menus,
- approve owner content,
- change billing,
- write customer-facing public output.

## Failure Handling

| Failure | Handling |
| --- | --- |
| Pause, suppression, policy, or qualification changes during token creation | Transaction retries against current authority and rejects token creation if eligibility no longer holds. |
| Target lifecycle is `pending`, `failed`, or `completed`, or source data is expired | Reject new route tokens and outcomes; preserve exact accepted replays. |
| Target policy/run lineage or current evidence is missing or stale | Reject before route/outcome persistence. |
| Invalid, expired, or revoked token used for a new event | Reject with bounded 401 response; do not write outcome state. |
| Exact outcome retry | Return `duplicate`; preserve the first event and summary count. |
| Same idempotency key with changed facts | Reject with 409 conflict. |
| Manual or demand-signal outcome omits its operation key | Reject before any event, summary, target, attribution, audit, or cost write. |
| Demand outcome names an absent or cross-target source event | Reject before outcome persistence. |
| Persisted route/event/summary/claim/touch authority is malformed | Fail closed with a bounded retryable server response; do not expose internal shape details. |
| Malformed recent summaries precede valid activation evidence | Skip malformed rows with bounded diagnostics and fill through at most four pages inside the revenue transaction. |
| Retention completes for a route or conversation | Preserve exact strict tombstone authority for audit/replay or post-retention inbound review; reject partial, malformed, or non-system lifecycle metadata. |
| Unknown target | Reject before outcome writes. |
| Firestore or rate-limit infrastructure unavailable | Return retryable 503 with `Retry-After`; do not acknowledge success. |
| Suppressed target converts | Record outcome, but do not allow further outreach without admin review. |
