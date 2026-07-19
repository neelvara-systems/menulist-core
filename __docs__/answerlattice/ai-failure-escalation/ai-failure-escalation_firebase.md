# AI Failure Escalation - Firebase Operations

> **Version:** 2.1.0
> **Last Updated:** 2026-07-18
> **Firestore Project:** Dedicated Answerlattice project

## Collections

No new collection, index, rule, Storage path, scheduler, or Cloud Function is introduced by the explicit widget support-request flow.

| Collection | Active use |
| --- | --- |
| `aiSearchHistory` | Source-of-record read, ticket linkage, unresolved outcome, and escalation timestamp |
| `supportTickets` | Deterministic asynchronous support ticket |
| `answerlattice_signalEvents` | Optional deterministic review signal through the existing emitter |

## Initial Request Operation Shape

The ticket transaction performs:

- two exact-document reads: search history and deterministic ticket ID;
- one ticket create when absent;
- one search-history merge;
- after commit, at most one deterministic signal create when signal mutation is enabled.

The signal is best effort and does not control ticket success. There is no notification write in this flow.

## Replay Operation Shape

A replay still checks the two exact documents, reasserts the history linkage, and reuses the existing ticket. The deterministic signal contract prevents a duplicate signal. Do not market replay as zero-cost; measure the actual Firestore and rate-limit-provider operations.

## Search And Feedback Costs

Search cost depends on canonical/FAQ/RAG selection, cache state, image context, logging, and enabled evidence lanes. Feedback retains its existing bounded search-history update and optional signal behavior. Fixed per-conversation or monthly cost claims require measured production usage and current provider pricing.

## Retention

- `aiSearchHistory`: 90-day expiry/TTL plus bounded legacy cleanup.
- escalation ticket: existing support-ticket lifecycle; hard delete follows the ticket deletion path.
- escalation signal: existing signal expiry/TTL contract.

Ticket and signal retention are not extended by the widget route. Long-term analytics should use compact summaries rather than retaining raw search history indefinitely.

## Security

- Admin Firestore access occurs only after public key, scope, origin/runtime-token, rate-limit, body-size, and schema admission.
- The transaction rechecks exact product/workspace/mount scope from persisted data.
- Reply email and optional details are bounded and sanitized before persistence.
- The client cannot supply internal source IDs, retrieval traces, tenant IDs, status, priority, or authorization decisions.
- Responses are private/no-store and runtime logs use bounded metadata.
