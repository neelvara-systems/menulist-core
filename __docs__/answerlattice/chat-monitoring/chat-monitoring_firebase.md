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
- Platform backfill workspace options come only from the dedicated Answerlattice `platformSummary/storesSummary`; MenuList `storesSummary` is not a valid Answerlattice scope source.
- The private workspace-list route requires current persisted platform authority in both the shared operator account and the Answerlattice user record.
- `backfillChatAnalytics` requires a fresh dedicated-project token and rereads the exact Answerlattice `users/{uId}` record. Disabled, unverified, deleted, blocked, role-revoked, email-mismatched, or stale-`accessRevision` callers fail before store reads, lease writes, or analytics work.
- Persisted store scope must have consistent Answerlattice product, tenant, and workspace aliases and an active/unblocked lifecycle.
- Conversation list cache keys, pagination acknowledgement, local rows, selections, and mutations use exact Answerlattice tenant/workspace scope. MenuList root scope is never a cache or mutation authority for these surfaces.
- Metadata, batch-status, and internal-note mutations compare the initiating workspace with the freshly resolved active workspace before reading a target session.
- `answerlatticeChatAnalyticsOnDelete` rebuilds a deleted historical session's exact UTC aggregate day from the pre-delete snapshot and surviving exact-workspace sessions. Retry uses the canonical source hash and cannot double-decrement counters. Recent changes also refresh both deterministic insight documents; partial/malformed recent source atomically removes both insights instead of preserving false truth or poisoning retries.
- Deterministic feedback/weekly insight documents use exact schema-versioned replacement writes. Weekly volume movement is percent, positive-feedback-share movement is percentage points, and unavailable denominators persist as `null`; the feedback document contains no false all-feedback counter.

## Retention

The current runtime has no automatic durable chat-session TTL. Session deletion removes the Firestore document. Persisted images remain until a future bounded workspace-wide non-reference process can prove deletion safety. This is a known storage-retention tradeoff and must not be described as immediate media deletion.

## Query costs

Every list and analytics query is capped. Admin summaries derived from raw sessions are bounded to 500 or 1,000 reads depending on the view; the daily aggregate path should be preferred where available. No unbounded listener is permitted.

The backfill workspace list adds one shared-project current-operator user read, one bounded Answerlattice user lookup (limit 2), and one Answerlattice compact-summary read. Each admitted backfill callable performs one Answerlattice current-user read before the store read and a second current-user read inside the lease transaction that performs the first write; the transaction also reads the scoped lease state before its single lease-state write. This duplicate authority read is deliberate: it binds durable authority to mutation ordering when role, lifecycle, or access revision changes concurrently. Callers already stale at admission stop after the first user read; callers revoked between admission and lease acquisition abort during the transaction with no lease write.

A valid historical chat-session hard delete triggers one exact-day bounded rebuild: up to 2,001 `chatSessions` reads, one existing-summary read, and at most one replacement `chatAnalytics` write. If the date is within the recent intelligence window, recovery adds up to 14 aggregate reads, two insight reads, and up to two writes; incomplete recent source instead performs one atomic two-document insight delete. Duplicate delivery repeats bounded reads but source hashes skip writes. Current-day deletion performs no aggregate/intelligence work. Deletion is user-initiated and rare; the cost avoids permanent false derived truth and adds no scheduler or provider call.

The insight schema correction changes no read or write count. Its versioned source hash causes at most one replacement of each derived feedback/weekly document on the next eligible sync; later identical runs remain zero-write.

## ROI metrics query-parameter boundary

The ROI route resolves the Answerlattice product account before rate limiting and calls the existing statistics path with that same scope. Its bounded numeric parser for day, hourly-cost, minutes-saved and platform-cost overrides adds **No additional Firestore read/write/delete** and no provider call; malformed overrides are ignored and valid values are capped server-side. Removing unused raw analytics input, adding tenant/workspace acknowledgement, and separating observed aggregate counts from explicit scenario assumptions are serialization/calculation-only changes. No resolution, retention, churn, revenue, or manual-response-time field exists in the current persisted aggregate contract, so the report cannot claim one.
