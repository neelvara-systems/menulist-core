# SignalDesk Outcome Bridge - Implementation Plan

**Status:** Implemented runtime contract; local emulator verified
**Created:** June 23, 2026
**Runtime reconciled:** July 13, 2026

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
  -> create scoped route token
  -> prospect uses MenuList-controlled route
  -> MenuList or operator emits outcome event
  -> bounded route verifies timestamp plus raw-body HMAC
  -> strict payload validation rejects unknown fields
  -> outcome transaction checks exact replay first
  -> transaction revalidates token scope, hash, target, active state, revocation, and expiry
  -> append outcome event, update summary/target, create direct attribution touch, update route usage, audit, and cost summary atomically
  -> optional activation-watch reconciliation runs after commit and reports pending on failure
```

## Route Token Contract

Route tokens are:

- opaque,
- scoped to one target/action/channel,
- expiring,
- revocable,
- non-sensitive,
- safe to include in links.

Only the one-time raw token is returned to the authorized caller. Firestore stores its SHA-256 hash, versioned scope `menulist-activation-outcomes-v1`, source action, target, channel, expiry, status, and revocation metadata. The configure-only `revoke-route-token` action is transactionally audited and idempotent.

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
| Invalid, expired, or revoked token used for a new event | Reject with bounded 401 response; do not write outcome state. |
| Exact outcome retry | Return `duplicate`; preserve the first event and summary count. |
| Same idempotency key with changed facts | Reject with 409 conflict. |
| Unknown target | Reject before outcome writes. |
| Firestore or rate-limit infrastructure unavailable | Return retryable 503 with `Retry-After`; do not acknowledge success. |
| Suppressed target converts | Record outcome, but do not allow further outreach without admin review. |
