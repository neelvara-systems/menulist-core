# Answerlattice Ticket, Conversation, and Handoff Specification

> **Status:** Implemented and hardened
> **Last verified:** July 19, 2026

## Product job

This feature preserves a user's unresolved question and the evidence already gathered, then gives an authorized human a bounded thread in which to respond. It is Answerlattice's durable human fallback, not a general-purpose help desk.

The feature must:

1. create one workspace-scoped support record;
2. preserve the original question, safe context, attachments, and escalation evidence;
3. let authorized support staff append replies and valid status changes without rewriting history;
4. notify the requester from persisted ticket truth;
5. feed resolved or repeated issues into governed review without treating a ticket as approved truth.

## Entry paths

| Path | Current behavior |
|---|---|
| `/answerlattice/support` | Workspace ticket intake and ticket history |
| `/answerlattice/conversations` | Workspace conversation monitoring |
| `/help-center` | MenuList reference-client help surface backed by the same scoped ticket DAL |
| `/api/widget/escalation` | Explicit public-widget handoff from an eligible retained search record |
| Guided resolution | **Still stuck** opens the explicit support form; a handoff outcome is recorded only after ticket creation succeeds |
| Help Chat | Optional explicit escalation creates a scoped ticket from failed-answer context |
| `/platform/support-tickets` | Internal platform queue, analytics, reply, status, notes, tags, export, soft-delete, restore, and full-platform hard delete |

## Lifecycle

```text
question or explicit support request
-> exact workspace scope
-> ticket creation
-> open status
-> human reply and/or valid status transition
-> resolved or closed
-> optional one-time satisfaction
-> governed signal/review workflow
```

Allowed transitions are enforced in both the DAL and Firestore Rules:

- Open -> In Progress, Resolved, or Closed
- In Progress -> Open, Resolved, or Closed
- Resolved -> Re-Opened or Closed
- Closed -> Re-Opened
- Re-Opened -> In Progress, Resolved, or Closed

Every effective status change appends one status event and one system message in the same transaction. A no-op status save appends neither.

## Roles and authority

- A workspace member needs Answerlattice support-control permission; membership alone is insufficient.
- `OWNER`, `MANAGER`, permitted `STAFF`, custom `canManageSupport`, `PLATFORM_SUPPORT`, and `PLATFORM` follow the shared Answerlattice support-control contract.
- Tenant users remain bound to the exact `pId: AL`, `tId`, and `sId`.
- `PLATFORM_SUPPORT` may operate the dedicated cross-workspace support flow.
- Only full `PLATFORM` may hard-delete a ticket.
- Notification recipients, message evidence, status evidence, template fields, and idempotency references are projected from the persisted ticket on the server.

## Data contract

The core record is `supportTickets/{ticketId}` with:

- `pId`, `tId`, `sId`, creator identity, timestamps;
- subject, initial message, category, priority, current status;
- append-only `messages` and `statuses`;
- top-level documents and per-message attachments;
- requester contact, private support notes/tags, context keys;
- optional browser-debug context;
- optional AI/widget escalation evidence;
- optional one-time satisfaction;
- soft-delete state.

Limits:

- 50 messages;
- 25 status events;
- four top-level ticket documents on creation;
- four attachments per create or reply action;
- 10 MiB per ticket attachment;
- 2,000 characters per reply;
- 4,000 characters for initial message or private notes.

The 50/25 limits are deliberately below Firestore Rules' expression ceiling and are tested at the accepted boundary in both dedicated and shared rule sets.

## Attachments

- Paths are `supportTickets/documents/{tId}/{sId}/{fileId}` and `supportTickets/messages/{tId}/{sId}/{fileId}`.
- The DAL derives paths from the verified target ticket scope, including cross-workspace platform replies.
- Rules allow only scoped support authority and allowlisted image/document MIME types.
- A failed upload before persistence is cleaned up best effort.
- An ambiguous persistence result retains the upload and logs bounded diagnostics rather than risking deletion of a committed reference.
- Full-platform hard delete collects only owned ticket URLs, deletes the Firestore ticket transactionally, then cleans Storage best effort.

## Conversation monitoring

`chatSessions` is the retained answer/chat evidence flow, distinct from ticket replies. Sessions are workspace-scoped, bounded, transactionally updated, and available to authorized support monitoring. Chat-image references removed by compaction, branch replacement, or session deletion are currently retained because the same image can be referenced by search history or another retained evidence object. Cleanup requires a future reference-counted retention design, not blind deletion.

## Email behavior

Implemented email is outbound only:

- ticket-created confirmation;
- support-reply notification;
- status-change notification;
- workspace test email.

Customer self-replies and system messages do not generate reply email. Templates say not to reply. Inbound email, reply-by-email, mailbox synchronization, and omnichannel ingestion are intentionally excluded.

Email is non-blocking. A successful ticket write can be followed by failed email delivery; the ticket remains authoritative.

## Operational indicators

Priority targets are used for private queue indicators:

| Priority | First response | Resolution |
|---|---:|---:|
| High | 2 hours | 24 hours |
| Normal | 8 hours | 72 hours |
| Low | 24 hours | 168 hours |

The indicator uses the first non-system response from someone other than the requester and the first Resolved/Closed status timestamp. It is a client-side operating target, not server enforcement, an alert, or a contractual customer promise.

## Explicit non-goals

- Full Zendesk/Intercom replacement
- Assignment engine, routing, workforce management, or omnichannel inbox
- Inbound or reply-by-email
- Live chat or guaranteed response-time promise
- Autonomous refunds, subscription changes, permission changes, or other account actions
- Auto-publishing ticket text as a canonical answer
- Using all historical tickets as product truth
- Unbounded message or status history
