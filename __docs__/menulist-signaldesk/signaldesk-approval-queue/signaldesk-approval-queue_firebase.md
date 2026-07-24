# SignalDesk Approval Queue - Firebase

**Status:** Implemented; no Feature 10 infrastructure deploy required
**Last Updated:** July 21, 2026

## Existing Collections

| Collection | Stored purpose |
| --- | --- |
| `signaldeskApprovalQueue` | Compact queue and terminal decision state. |
| `signaldeskApprovalPackets` | Owner-ready exact action snapshot. |
| `signaldeskDraftSummaries` | Exact message unit and bound authorities. |
| `signaldeskTargetSummaries` | Current workflow progression. |
| `signaldeskQueueSummaries` | Compact backlog counters. |
| `signaldeskAuditEvents` | Immutable operator decision evidence. |
| `signaldeskCostDailySummaries` | Bounded Firestore operation estimates. |

There are no `signaldeskApprovalDetails` or `signaldeskApprovalEvents`
collections. There is no approval expiry job or real-time all-queue listener.

## Cost Model

| Flow | Bounded behavior |
| --- | --- |
| Approvals workspace | One pending query plus one recent query; packet and draft lists use existing bounded recent queries. |
| Exact packet replay | Current authority reads; zero writes when content is identical. |
| Packet refresh | Current authority reads; packet, optional approval link, timeline, audit, and cost writes. |
| Terminal approval | Transaction-current authority reads and seven bounded writes/effects. |
| Terminal rejection | Bounded queue-unit reads and the same atomic terminal write set. |
| Exact terminal replay | One approval read; zero writes, counter changes, audits, or cost effects. |

## Rules, Indexes, And Isolation

- `firestore-signaldesk.rules` permits SD platform-authorized reads and denies all client writes.
- Server writes use the dedicated SignalDesk Firebase Admin boundary.
- Pending-first reads use Firestore's automatic single-field `status` index.
- The existing `status + priority + dueAt` composite remains available; Feature 10 adds no index.
- Approval source-derived payload participates in the consolidated source-data lifecycle scrubber. Packet message/evidence fields are removed or held; non-sent draft text is scrubbed; queue counters reconcile once.

## Deployment

Feature 10 changes only the Next.js server/client runtime, docs, and local
verifiers. It changes no Function, Firestore rule/index, or Storage rule, so no
Firebase deployment is required. A Vercel/app release remains owner-controlled.
