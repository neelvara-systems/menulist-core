# SignalDesk Inbox - Implementation Plan

**Status:** Initial implementation blueprint
**Created:** June 23, 2026

## Suggested Future Modules

```txt
signaldesk/
  inbox/
    inboxTypes.ts
    replyClassifier.ts
    inboxDal.ts
    inboxSelectors.ts
    suppressionBridge.ts
    inboxWorkItems.ts
    InboxList.tsx
    ConversationDetail.tsx
    ReplyClassificationPanel.tsx
```

Names are planning placeholders. Match the eventual runtime repo layout when implementation starts.

## Data Flow

```txt
channel event or manual note
  -> normalize message event
  -> append message
  -> update conversation summary
  -> classify reply if inbound
  -> create inbox work item
  -> apply suppression when required
  -> update control-room summaries
```

## State Model

| State | Meaning |
| --- | --- |
| `open` | Conversation has unresolved operator work. |
| `waiting_on_operator` | Needs manual classification or decision. |
| `suppressed` | Contact/channel/target is blocked from future outreach. |
| `waiting_on_prospect` | Approved reply/follow-up was sent and no response yet. |
| `routed_to_outcome` | Prospect moved into MenuList outcome bridge. |
| `closed` | No more SignalDesk action is expected. |

## Implementation Order

1. Define conversation, message, classification, and work-item types.
2. Implement append-only message event ingestion.
3. Implement summary updater for cheap list reads.
4. Implement deterministic suppression bridge.
5. Add classifier suggestion path.
6. Add operator override path.
7. Add inbox list and detail views.
8. Add control-room summary updates.

## Integration Points

| Feature | Integration |
| --- | --- |
| Approval queue | Approved outbound actions create conversation context. |
| Email rail | Email sends, bounces, complaints, and replies append events. |
| Draft control | Suggested replies must use approved templates only. |
| Outcome bridge | Interested conversations can create route tokens or outcome work items. |
| Control room | Complaint, backlog, classifier, and suppression metrics feed summaries. |

## Guardrails

- Classifier suggestions never send a message.
- Suppression writes are synchronous with unsafe classifications.
- Conversation detail fetch is explicit and paginated.
- Raw provider webhook payloads are not stored as-is.
- Operator override requires reason and audit event.
