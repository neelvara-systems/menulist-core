# SignalDesk Inbox - Implementation

**Status:** Current code truth
**Last reviewed:** July 21, 2026

## Entry Points

| Surface | Implementation |
| --- | --- |
| Desktop Inbox | `src/components/signaldesk/SignalDeskWorkspace.tsx` |
| Manual action API | `src/app/api/signaldesk/actions/route.ts` action `capture-reply` |
| Provider webhook API | `src/app/api/signaldesk/webhooks/[provider]/route.ts` |
| Manual transaction | `captureSignalDeskReplyServer()` in `src/lib/signaldesk/workflowServer.ts` |
| Signed webhook transaction | `processSignalDeskProviderWebhook()` in `src/lib/signaldesk/webhookServer.ts` |
| Shared reply contract | `src/lib/signaldesk/webhookContracts.ts` |
| Strict workspace projection | `src/lib/signaldesk/workspaceContracts.ts` |

## Manual Flow

```text
desktop target + channel + reply
  -> Zod action envelope
  -> auth, rate limit, target.review, desktop-only gate
  -> actor/key idempotency claim + current conversation read
  -> shared deterministic classification
  -> normalized message + classification
  -> conversation + target transition
  -> optional suppression + incident + kill switch
  -> transition-aware queue summary + audit + cost summary
  -> optional interested-reply revenue qualification
```

Exact replay returns the durable claim. Changed facts under the same key fail. The UI retains the key after an ambiguous failure and clears it only after success.

## Provider Flow

Provider routes accept `email`, `whatsapp`, `instagram`, `messenger`, and `apify`. Inbound message processing applies only to messaging providers. Verification and normalization occur before the Firestore transaction. Stored contact or delivery authority must resolve the target; conflicting caller/provider facts fail closed.

The provider event ID is provider-scoped and deterministic. Exact repeats return duplicate truth. Changed facts under the same event identity return conflict. Out-of-order events retain message/classification evidence with `isOutOfOrder` but do not rewrite current state.

## Read Model

`readConversationSummaryList()` performs two bounded reads in parallel:

1. safety states `complaint`, `privacy_request`, and `legal_request`, limited to 30;
2. ordinary actionable states `interested` and `needs_review`, limited to 30;
3. newest summaries by `updatedAt`, limited to 30.

Results are strictly projected, priority-sorted, and deduplicated. No message-body query occurs during an Inbox load.

## Safety and Revenue

Safety state is sticky against later non-safety manual or provider input. Only an authoritative future suppression-resolution design may reopen it. Revenue qualification runs only when the resulting current state is `interested`, never when a complaint/DNC/privacy/legal state remains authoritative.

## Current UI Limit

The desktop panel shows summary rows and supports manual contact/reply capture. It does not expose full message history, classifier override, assignment, or reply composition/sending. Documentation and support material must not claim those controls exist.
