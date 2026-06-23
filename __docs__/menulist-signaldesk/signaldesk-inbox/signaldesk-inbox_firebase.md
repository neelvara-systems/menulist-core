# SignalDesk Inbox - Firebase Plan

**Status:** Initial Firebase design
**Created:** June 23, 2026

## Collections

| Collection | Purpose | Read Pattern |
| --- | --- | --- |
| `signaldeskConversationSummaries` | Cheap inbox list and filters. | Default inbox read. |
| `signaldeskConversations` | Conversation metadata and state. | Detail open only. |
| `signaldeskMessages` | Normalized message bodies and operator notes. | Paginated detail read. |
| `signaldeskMessageEvents` | Append-only send/reply/bounce/complaint events. | Audit/debug only. |
| `signaldeskReplyClassifications` | Classifier output and operator overrides. | Detail and eval reads. |
| `signaldeskInboxWorkItems` | Operator tasks created from replies. | Queue read by status. |

## Required Fields

| Object | Required fields |
| --- | --- |
| Conversation summary | `conversationId`, `targetId`, `channel`, `state`, `lastInboundAt`, `classification`, `operatorStatus`, `suppressionState`, `updatedAt` |
| Message | `messageId`, `conversationId`, `direction`, `channel`, `bodyRefOrBody`, `normalizedAt`, `sourceEventId`, `createdAt` |
| Classification | `classificationId`, `conversationId`, `messageId`, `label`, `confidence`, `reasonCodes`, `modelVersion`, `operatorOverride`, `createdAt` |
| Work item | `workItemId`, `conversationId`, `type`, `status`, `ownerId`, `dueAt`, `createdAt` |

## Indexes

| Query | Index |
| --- | --- |
| Inbox by state | `state`, `updatedAt desc` |
| Inbox by operator status | `operatorStatus`, `updatedAt desc` |
| Inbound needing review | `classification`, `operatorStatus`, `lastInboundAt desc` |
| Conversation messages | `conversationId`, `createdAt asc` |
| Work items by owner | `ownerId`, `status`, `dueAt asc` |

## Cost Rules

- Inbox list must not read `signaldeskMessages`.
- Message bodies load only after opening a detail view.
- Event payloads are normalized before storage.
- Summaries update in the same write path as message append when practical.
- Classifier eval jobs read sampled classifications, not all conversations.

## Retention

| Data | Default |
| --- | --- |
| Message events | Retain while target is active; archive or purge per policy. |
| Full message bodies | Minimize retention; keep only what is required for audit and follow-up. |
| Summaries | Retain for reporting while target/campaign is active. |
| Complaint/DNC evidence | Retain as long as suppression proof is required. |
