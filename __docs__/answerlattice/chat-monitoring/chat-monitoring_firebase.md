# Conversation Monitoring Firebase Contract

| Resource | Access | Purpose |
|---|---|---|
| `chatSessions` | Support-control browser CRUD | Conversation history, feedback copy, admin metadata, internal note |
| `aiSearchHistory` | Existing scoped feedback update contract | Atomic answer-feedback linkage |
| `chatAnalytics` | Support-control read; server write only | Daily aggregate metrics |
| `chatSessions/chatimages/{tId}/{sId}/{imageId}` | Support-control Storage access | User-provided chat images |

## Invariants

- Exact `pId=AL`, `tId`, and `sId` are required.
- A scoped member without support permission cannot read sessions, aggregates, or images.
- `PLATFORM_SUPPORT` can perform support operations across workspaces.
- Session create binds the actor and validates all fields.
- Updates cannot change product, workspace, owner, creator, or creation time.
- Feedback validates both the session message and linked search-history scope in one transaction.
- Aggregate documents are client read-only.

## Retention

The current runtime has no automatic durable chat-session TTL. Session deletion removes the Firestore document. Persisted images remain until a future bounded workspace-wide non-reference process can prove deletion safety. This is a known storage-retention tradeoff and must not be described as immediate media deletion.

## Query costs

Every list and analytics query is capped. Admin summaries derived from raw sessions are bounded to 500 or 1,000 reads depending on the view; the daily aggregate path should be preferred where available. No unbounded listener is permitted.

## ROI metrics query-parameter boundary

The ROI route uses a bounded numeric parser for day and money overrides before calling the existing statistics path. This adds **No additional Firestore read/write/delete** and no provider call; malformed overrides are ignored and valid values are capped server-side.
