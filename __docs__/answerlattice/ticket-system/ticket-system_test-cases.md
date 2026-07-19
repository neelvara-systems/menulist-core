# Answerlattice Ticket, Conversation, and Handoff Test Cases

> **Last verified:** July 19, 2026

## Automated contract coverage

| Case | Expected result |
|---|---|
| Create exact `AL/tId/sId` ticket with one initial status | Allowed |
| Create preloaded client message history | Denied |
| Create forged status actor or wrong product | Denied |
| Create four top-level documents | Allowed |
| Create five top-level documents | Denied |
| Read malformed or oversized document metadata through the runtime parser | Ticket rejected |
| Tenant without support permission | Read/write denied |
| Other tenant | Read/write denied |
| Support-control staff | Scoped read/write allowed |
| `PLATFORM_SUPPORT` | Cross-workspace support read/write allowed; hard delete denied |
| `PLATFORM` | Cross-workspace support and hard delete allowed |
| Append exactly one valid reply | Allowed |
| Rewrite prior reply/status or append multiple entries | Denied |
| Valid status transition with one status and system message | Allowed |
| Invalid transition or status without audit pair | Denied |
| 50th message while 25 statuses are retained | Allowed |
| 51st message | Denied |
| 25th status with paired system message | Allowed |
| 26th status | Denied |
| One satisfaction after Resolved/Closed | Allowed |
| Satisfaction before resolution or rewrite | Denied |
| Ticket media by authorized support | Allowed in both Storage rules |
| Ticket media by viewer/other tenant | Denied |
| Support reply from requester email | Saved without reply-email trigger |
| Support reply from a different actor | Saved and eligible for persisted projection |
| Status change through generic `updateTicket()` | Central status notification requested once |
| Public widget escalation replay | Returns the deterministic owned ticket |
| Widget escalation against solved/expired/foreign history | Denied |
| Late first response and late resolution | Operational indicator remains breached |
| Chat session deletion with shared images | Session deleted; image cleanup explicitly deferred |

## Focused commands

```bash
npm run test:answerlattice-ticket-contracts
npm run test:answerlattice-tickets:rules
npm run test:answerlattice-tickets:shared-rules
npm run test:answerlattice-chat-session-contracts
npm run test:answerlattice-chat-sessions:rules
npm run test:answerlattice-chat-sessions:shared-rules
npm run test:answerlattice-storage:rules
npm run test:answerlattice-storage:shared-rules
npm run verify:ticket-notification-boundary
npm run verify:answerlattice-ticket-conversation-handoff
```

## Manual QA

1. Create a workspace ticket with and without an attachment.
2. Confirm it appears in the workspace and authorized support queue.
3. Reply as the requester; verify no requester-reply email is projected.
4. Reply as support; verify one email projection and no duplicate on exact replay.
5. Change status through the generic ticket edit path; verify one status event, one system message, and one notification request.
6. Soft-delete and restore.
7. Hard-delete as `PLATFORM`; verify owned ticket files are cleaned best effort.
8. Submit an unresolved widget question and confirm the reference maps to the exact stored search history.
9. Run a guided workflow, choose **Still stuck**, and confirm escalation is recorded only after ticket acknowledgement.
10. Check queue, export, and analytics first-response/resolution indicators using a one-reply ticket and a late-resolved ticket.
11. Delete a chat session containing an image and verify the UI does not claim that shared image storage was deleted.

## External evidence

SMTP delivery, spam placement, provider retry behavior, authenticated QA UI roles, mobile browser attachments, and production Storage cleanup remain deployment/runtime evidence rather than source-only proof.
