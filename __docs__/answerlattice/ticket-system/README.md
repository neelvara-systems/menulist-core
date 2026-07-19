# Answerlattice Ticket System

The ticket system is the durable human fallback for Answerlattice support. It accepts direct customer requests, widget escalation, and guided-resolution handoff; preserves the exact workspace scope and support context; then lets authorized support operators reply, change status, add private notes/tags, review SLA indicators, and close the loop without treating ticket text as approved product truth.

## Implemented flow

1. A customer or authorized operator creates a scoped ticket.
2. Up to four validated attachments are uploaded under the ticket workspace path.
3. Firestore stores the ticket, initial status history, creator, context keys, and optional escalation evidence.
4. Authorized support operators can append one message or one status transition at a time.
5. Server-derived email notifications may be requested after successful persistence.
6. Resolution can collect one satisfaction response.
7. Ticket evidence may feed the governed knowledge-review loop, but never auto-publishes an answer.

## Authority boundary

- Workspace access requires Answerlattice support control, not membership alone.
- `PLATFORM_SUPPORT` can read and operate support flows across workspaces.
- Only `PLATFORM` can hard-delete a ticket.
- Attachments require the same support authority in dedicated and shared Storage rules.
- Widget and guided-resolution handoff are explicit user actions; neither path silently creates a ticket.

## Important limits

- Ticket documents: four maximum on creation; four attachments per reply action.
- Ticket messages: 50 maximum.
- Status history: 25 maximum.
- Each attachment: 10 MiB maximum and allowlisted MIME only.
- Store ticket reads: latest 100; platform reads: latest 500; deleted list: latest 100.
- SLA values are UI calculations, not contractual timers or server-side enforcement.

## Documentation

- [Specification](./ticket-system_spec.md)
- [Implementation](./ticket-system_impl.md)
- [Firebase](./ticket-system_firebase.md)
- [Test cases](./ticket-system_test-cases.md)
- [Help](./ticket-system_helpdoc.md)
- [Mobile](./ticket-system_mobile-support.md)
- [Website](./ticket-system_website.md)
- [Marketing](./ticket-system_marketing.md)

Connected dossiers: [Conversation Monitoring](../chat-monitoring/README.md), [Email Notifications](../email-notifications/README.md), and [Ticket Knowledge Loop](../ticket-knowledge-loop/README.md).
