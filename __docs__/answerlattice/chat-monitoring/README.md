# Answerlattice Conversation Monitoring

Conversation Monitoring lets authorized support operators review Answerlattice help-chat sessions, inspect answer feedback, classify follow-up, add one private team note, and identify repeated questions or weak answers. It is a support-quality review surface, not an omnichannel live-chat inbox.

**Product boundary:** Conversation sessions, daily aggregates, and weekly summaries run in the isolated Answerlattice Firebase and Functions runtime. Dormant MenuList compatibility workers are not an active source of Answerlattice monitoring truth.

## Implemented capabilities

- Exact `pId=AL`, tenant, and store scoping.
- User chat history with a latest-50 query cap.
- Admin list/detail, date/mode/search/feedback filters, pagination, status, priority, tags, and batch metadata updates.
- One internal note record per conversation.
- Message feedback linked atomically to `aiSearchHistory`.
- Bounded statistics, top questions, knowledge-gap indicators, volume charts, and server-owned daily aggregates.
- Validated chat-image upload under workspace-scoped Storage paths.

## Authority and retention

Conversation and aggregate reads require support control; membership alone is insufficient. `PLATFORM_SUPPORT` can perform support operations across workspaces without receiving unrelated platform-admin powers.

Session deletion removes Firestore truth. Persisted chat images are retained because one session cannot prove that an image is not referenced by another session; the runtime logs deferred cleanup and reports zero deleted storage files. Unpersisted images from failed searches are cleaned immediately.

## Documentation

- [Specification](./chat-monitoring_spec.md)
- [Implementation](./chat-monitoring_impl.md)
- [Firebase](./chat-monitoring_firebase.md)
- [Test cases](./chat-monitoring_test-cases.md)
- [Help](./chat-monitoring_helpdoc.md)
- [Mobile](./chat-monitoring_mobile-support.md)
- [Website](./chat-monitoring_website.md)
- [Marketing](./chat-monitoring_marketing.md)
