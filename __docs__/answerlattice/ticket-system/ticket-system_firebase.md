# Answerlattice Ticket and Conversation Firebase Contract

> **Last verified:** July 19, 2026

## Collections and storage

| Target | Purpose | Retention |
|---|---|---|
| `supportTickets` | Durable human fallback, messages, statuses, context, private support fields | Durable until soft/full deletion; no automatic ticket TTL |
| `chatSessions` | Retained user/assistant conversation evidence and support metadata | Durable; no automatic session TTL |
| `chatAnalytics` | Server-owned aggregate conversation analytics | Server-owned |
| `aiSearchHistory` | Widget/search evidence linked to explicit handoff | Governed by the search-history retention contract |
| `answerlattice_notificationLogs` | Email claim, delivery status, and bounded diagnostics | 90 days using `expiresAt` TTL; explicit legacy cleanup fallback |
| Storage `supportTickets/documents/{tId}/{sId}/{fileId}` | Top-level ticket attachments | Removed on full-platform hard delete, best effort |
| Storage `supportTickets/messages/{tId}/{sId}/{fileId}` | Reply attachments | Removed on full-platform hard delete, best effort |
| Storage `chatSessions/chatimages/{tId}/{sId}/{imageId}` | Shared conversation/search image evidence | Retained when session references are removed until reference-safe cleanup exists |

## Operation costs

| Operation | Firestore work | Storage/provider work |
|---|---|---|
| Create ticket | 1 write | 0-4 uploads; signal and email are best effort |
| Append reply | 1 transaction read + 1 write | 0-4 uploads; optional email |
| Change status | 1 transaction read + 1 write | optional email |
| Change priority/category/notes/tags/delete flag | 1 transaction read + 1 write | none |
| Submit satisfaction | 1 transaction read + 1 write | none |
| Hard delete | 1 transaction read + 1 delete | owned attachment deletes best effort |
| Read ticket | 1 read | attachment download only when opened |
| Workspace listener | Up to latest 100 initial reads, then changed-document reads | none |
| Platform listener | Up to latest 500 initial reads, then changed-document reads | none |
| Deleted queue | Up to latest 100 reads | none |
| Conversation page | Bounded paginated reads | chat image downloads only when rendered |
| Ticket notification | access-control reads + 1 exact ticket Admin read + delivery-claim/rate/finalization reads/writes | at most one SMTP attempt per claimed identity |

No new scheduler or collection is required by the 50-message/25-status cap.

## Rules

Firestore:

- exact `AL/tId/sId` scope;
- support-control permission;
- strict create shape and one initial status;
- one message or one status+system-message append per update;
- immutable prior history;
- valid actor identity and allowed status transition;
- 50 messages, 25 statuses, four creation documents;
- uploaded and parsed document metadata is limited to four files and 10 MiB each; Firestore Rules enforce the list cap while the DAL/read parser and trusted-download boundary fail closed on invalid metadata or URLs;
- satisfaction is one-time and only after Resolved/Closed;
- hard delete is full `PLATFORM` only.

Storage:

- support-control role parity in dedicated and shared projects;
- exact path scope for tenant users;
- `PLATFORM_SUPPORT` and `PLATFORM` support-media access;
- images up to 5 MiB for chat;
- allowlisted image/document ticket files up to 10 MiB;
- no arbitrary executable/binary upload.

## Indexes

Maintained support-ticket indexes include:

- `pId, tId, sId, deleted, createdOn`;
- `pId, deleted, createdOn`.

Conversation and notification indexes are maintained in both Answerlattice index configurations according to their bounded query paths.

## Cost and scale decisions

- Embedded histories avoid one read per reply but require strict caps.
- The previous 500-message/200-status declaration was not writable at scale under Firestore Rules' 1,000-expression evaluation ceiling. Runtime, Rules, and emulators now agree on 50/25.
- Ticket creation is a fallback workflow; reaching either cap stops further mutation with an explicit limit error. It does not silently truncate legal/audit history.
- Platform reads are capped at 500; Answerlattice is not building an unbounded help-desk archive query.
- Notifications are asynchronous so SMTP latency or failure cannot hold a ticket transaction open.

## Deployment

Changes to either Firestore Rules or Storage Rules require the matching narrow QA deploy:

```bash
firebase deploy --only firestore:rules --project answerlattice-qa --config firebase-answerlattice.json --non-interactive
firebase deploy --only storage --project answerlattice-qa --config firebase-answerlattice.json --non-interactive
firebase deploy --only firestore:rules --project menulist-qa --config firebase.json --non-interactive
firebase deploy --only storage --project menulist-qa --config firebase.json --non-interactive
```

Vercel deployment remains owner-approved only.
