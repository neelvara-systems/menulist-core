# SignalDesk Control Room - Firebase And Cost

**Status:** Current implementation
**Revalidated:** July 21, 2026

## Existing Collections

| Collection | Use |
| --- | --- |
| `signaldeskControlRoomSummaries` | One canonical aggregate status/counter row. |
| `signaldeskQueueSummaries` | Approval, inbox, review and overdue counts. |
| `signaldeskCostDailySummaries` | Strict daily AI/provider and Firestore estimates. |
| `signaldeskKillSwitches` | Eleven deterministic current scope documents. |
| `signaldeskIncidents` | Producer-owned incident truth. |
| `signaldeskIdempotencyKeys` | Actor/request-bound pause replay claims. |
| `signaldeskAuditEvents` | Classification-only pause and producer audit history. |

No Control Room-specific collection, Storage object, listener, API cache,
scheduler, or client write exists.

## Read Cost

The base overview performs three summary point reads, eleven kill-switch point
reads, and one unresolved-incident query. Incident documents are billed reads and
are bounded to 501 attempted matches: more than 500 fails visibly. At most 50
strict incidents enter the browser DTO.

The dedicated Controls section adds four bounded collection queries for budget
policies, provider accounts, run timelines and self-service CTAs. It no longer
loads the dashboard's research/lead collections.

## Write Cost

| Mutation | Estimated writes |
| --- | ---: |
| New pause activation/clear | 4 |
| Exact idempotent replay | 0 |
| Blocked mobile mutation | Existing bounded blocked-action audit after rate limiting |

The four successful writes are switch, audit, claim and cost summary. The cost
summary counts itself. Existing producer flows own incident and health-summary
write costs.

## Query/Index Posture

- Kill switches use deterministic point reads; no query index is needed.
- Unresolved incidents use `pId == SD` and `status in [open, acknowledged]`,
  ordered by document ID with a strict ceiling.
- No new index is introduced by this hardening pass.
- Client Firestore writes remain denied; protected server routes own mutations.

## Retention

Current scope documents retain current pause state and audit records retain
transition evidence. Resolved incidents remain producer-owned historical truth.
There is no Control Room-specific incident deletion or pause-expiry job. Any
future retention change must preserve active safety and idempotency evidence.
