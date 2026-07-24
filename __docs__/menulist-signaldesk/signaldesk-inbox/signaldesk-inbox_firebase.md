# SignalDesk Inbox - Firebase and Cost

**Status:** Current deployed-contract documentation; local code changes still require normal app release
**Last reviewed:** July 21, 2026

SignalDesk uses its separate Firebase project. Browser clients are denied direct access by `firestore.rules`; authenticated server routes and the dedicated SignalDesk Functions project own writes.

## Collections Used

| Collection | Role |
| --- | --- |
| `signaldeskConversationSummaries` | Bounded Inbox list and current conversation state. |
| `signaldeskMessages` | Normalized inbound/outbound message evidence. |
| `signaldeskReplyClassifications` | Deterministic rules result and confidence. |
| `signaldeskWebhookEvents` | Provider-scoped idempotency and normalized event evidence. |
| `signaldeskIdempotencyKeys` | Actor-scoped manual reply replay claim. |
| `signaldeskTargetSummaries` | Current target lifecycle, next action, suppression, and conversation pointer. |
| `signaldeskTargets` | Private contact authority used to hash suppression identity. |
| `signaldeskSuppressionLedger` | Immediate DNC/wrong-contact/complaint/privacy/legal evidence. |
| `signaldeskIncidents` | Complaint/privacy/legal review item. |
| `signaldeskKillSwitches` | Channel or global outbound pause. |
| `signaldeskQueueSummaries` | Exact actionable Inbox count. |
| `signaldeskAuditEvents` | Bounded operator/system action evidence. |
| `signaldeskCostDailySummaries` | Estimated write effects. |

There are no `signaldeskConversations`, `signaldeskMessageEvents`, or `signaldeskInboxWorkItems` collections.

## Read Cost

An Inbox workspace load performs three bounded conversation-summary queries: up to 30 safety rows, up to 30 interested/review rows, and up to 30 recent rows. It does not read `signaldeskMessages` or `signaldeskReplyClassifications`. The state-only actionable queries use normal single-field indexes; no new composite index is required.

## Manual Write Cost

Base capture writes seven documents/effects including the daily cost summary. A queue-boundary transition adds one write. A suppression classification adds one. Complaint/privacy/legal handling adds four circuit-breaker writes, plus two when a pending daily mission is refreshed. The estimate is derived from those actual branches.

## Provider Write Cost

Signed webhook processing creates one normalized webhook event and conditionally adds message, classification, current summary, queue, target, suppression, incident, kill-switch, control-room, audit, and cost effects. Duplicate events do not repeat effects.

## Lifecycle

`functions-signaldesk/src/schedulers/sourceDataLifecycle.ts` includes conversation summaries, messages, and reply classifications in the target-dependent lifecycle reconciliation. Legal/safety evidence is marked for legal retention review rather than silently erased. This feature adds no new scheduler, collection, TTL, or index.
