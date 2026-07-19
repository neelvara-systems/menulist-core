# Answerlattice Ticket, Conversation, and Handoff Implementation

> **Last verified:** July 19, 2026

## Runtime map

| Boundary | Primary files |
|---|---|
| Workspace ticket surface | `src/app/(answerlattice)/answerlattice/support/page.tsx`, `src/components/templates/main-app/helpCenter/TicketView.tsx` |
| Ticket creation | `src/components/organisms/addSupportTicket/index.tsx`, `src/database/tickets/index.ts` |
| Platform queue | `src/components/templates/platform/supportTickets/*`, `src/hooks/useTicketCache.ts` |
| Ticket schema/lifecycle | `src/types/supportTicket.ts`, `src/lib/answerlattice/supportTicketLifecycle.ts` |
| Attachment admission | `src/lib/answerlattice/supportTicketAttachmentBoundary.ts`, `storage-answerlattice.rules`, `storage.rules` |
| Widget handoff | `src/app/api/widget/escalation/route.ts`, `src/lib/answerlattice/widgetEscalationServer.ts`, `src/app/widget/[apiKey]/WidgetClient.tsx` |
| Guided handoff | `src/lib/answerlattice/guidedResolutionContracts.ts`, widget guidance runtime |
| Help Chat handoff | `src/components/templates/main-app/helpChat/hooks/useChatHandlers.ts` |
| Conversation monitoring | `src/app/(answerlattice)/answerlattice/conversations/page.tsx`, `src/components/templates/platform/chatManagement/*`, `src/database/chatSessions/index.ts` |
| Email | `src/lib/notifications/*`, `src/app/api/notifications/send/route.ts` |
| Ticket-to-knowledge | `src/lib/answerlattice/signalEmitter.ts`, `functions-answerlattice/src/answerlattice/ticketKnowledgeExtractor.ts` |
| Rules/indexes | `firestore-answerlattice.rules`, `firestore.rules`, both Answerlattice index files |

## Ticket DAL

`src/database/tickets/index.ts` is the ticket mutation/read boundary.

### Create

1. Load the current Answerlattice session.
2. Compose `pId/tId/sId/uId` and bounded creation metadata.
3. Normalize the exact resulting scope.
4. Validate and upload up to four files into that scope.
5. Parse the complete ticket contract.
6. Write one Firestore document.
7. Emit a best-effort ticket/escalation signal.
8. Request a non-blocking creation notification.

### Update

`updateTicket()` reads and parses the current ticket in a transaction. It projects only mutable fields. A status change validates the transition and both bounded histories, then appends one status and one system message. The returned persisted result is the UI acknowledgement and the central status-email trigger source.

### Reply

`addTicketMessage()`:

- ignores caller-supplied current history as authority;
- uploads attachments against the verified target ticket scope;
- reads the ticket transactionally;
- accepts an exact same-message replay as a no-op;
- rejects a reused message ID with different content through persisted parsing/rules;
- appends one validated message;
- requests email only when the sender differs from the requester and the message is not a system event.

### Delete and restore

Normal UI deletion is a reversible `deleted: true` update. Restore clears that flag. Full hard delete requires `PLATFORM`, reads the exact ticket transactionally, deletes it, and then cleans only attachment URLs proven to belong to its workspace paths.

## Public widget handoff

The public route requires:

- widget feature enablement;
- valid `al_` credential with `widget:feedback`;
- fail-closed pre-auth and key rate limits;
- allowed-origin or runtime-token authorization;
- strict 4 KiB JSON;
- exact retained widget search history that is still interaction-eligible.

The browser can send only search-history ID, reply email, optional name, and optional details. The server derives workspace, question, context key, surface, retrieval evidence, canonical confidence, and deterministic ticket ID from the stored history. Ticket creation and search-history linkage occur in one Admin transaction. Replays return the same ticket only when persisted ownership matches.

## Conversation sessions

`src/database/chatSessions/index.ts` validates session IDs, actor, scope, message shape, image ownership, feedback linkage, and mutation acknowledgements. Append and branch replacement are transaction-owned. Monitoring reads are bounded and scoped. Internal notes remain private support metadata.

Compaction and deletion currently call `deferPersistedChatImageCleanup()` and return `storageFilesDeleted: 0`; they do not blindly delete images because other retained evidence can share the URL.

## SLA utility

`calculateSupportTicketSLAStatus()` in `src/types/supportTicket.ts` uses:

- exact creation time;
- `getFirstSupportTicketResponse()` based on requester email, then creator ID fallback;
- first Resolved/Closed status timestamp;
- current time only while the relevant event has not occurred.

This prevents the previous false behavior where one staff reply could remain “unanswered” and every resolved ticket appeared on time.

## Notification authority

The browser trigger contains event, ticket/message IDs, and exact target scope. `/api/notifications/send`:

1. authenticates;
2. applies a fail-closed 120/hour user limiter;
3. reads a strict 16 KiB body;
4. authorizes `canManageSupport` for the supplied exact target scope;
5. Admin-reads and reparses the ticket against that same scope;
6. derives recipient/content/reference from persisted truth;
7. transactionally claims the delivery identity;
8. enforces 20/day recipient rate limit;
9. sends through deadline-bounded SMTP;
10. claim-checks finalization in `answerlattice_notificationLogs`.

Browser-supplied recipient, template, product, metadata, reference, or dedupe bypass is rejected by the strict schema.

## Permission parity

Both Firestore rule files and both Storage rule files follow the same support role matrix. `PLATFORM_SUPPORT` can operate support-controlled records/media but cannot hard-delete tickets. A tenant `VIEWER` without support permission and another tenant fail.

## Failure behavior

- Invalid scope/schema/actor/transition fails closed.
- Message/status limit errors are explicit before mutation.
- Notification failure never rolls back a committed support action.
- Signal/summary refresh failure is diagnostic and non-blocking.
- Pre-persistence file failure cleans uploaded files best effort.
- Ambiguous persistence retains files and logs; it does not risk deleting committed evidence.
- Public handoff rate-limit-provider failure returns temporary unavailability.

## Verification

- `npm run test:answerlattice-ticket-contracts`
- `npm run test:answerlattice-tickets:rules`
- `npm run test:answerlattice-tickets:shared-rules`
- `npm run test:answerlattice-chat-session-contracts`
- `npm run test:answerlattice-chat-sessions:rules`
- `npm run test:answerlattice-chat-sessions:shared-rules`
- `npm run test:answerlattice-storage:rules`
- `npm run test:answerlattice-storage:shared-rules`
- `npm run verify:ticket-notification-boundary`
- `npm run verify:answerlattice-ticket-conversation-handoff`
