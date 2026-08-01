# Conversation Monitoring Implementation

**Product boundary:** The active monitoring write path is owned by `functions-answerlattice/` and the dedicated Answerlattice Firebase project. Legacy MenuList chat-intelligence workers remain dormant compatibility code and must not be reactivated as an Answerlattice data path.

## Surfaces

| Path | Responsibility |
|---|---|
| `src/app/(answerlattice)/answerlattice/conversations/page.tsx` | Answerlattice management route |
| `src/components/templates/platform/chatManagement/` | List, detail, filters, metadata, internal note, insights, digest, ROI presentation |
| `src/components/templates/main-app/helpChat/` | Help-chat session creation, continuation, feedback, retry, deletion |

## Data access

`src/database/chatSessions/index.ts` owns scoped session CRUD, append/branch operations, feedback linkage, internal note, admin list/statistics, top questions, gap indicators, and volume reads. All authoritative mutations use transactions or validated batches.

`src/lib/answerlattice/chatSessionContracts.ts` validates session fields, messages, feedback, metadata, note content, immutable fields, and the 50-message cap. `src/database/chatAnalytics/index.ts` reads server-owned aggregate documents; `functions-answerlattice/src/answerlattice/chatAnalyticsAggregation.ts` produces bounded summaries.

Help Chat history uses the initiating authenticated session for every read. Its SWR key contains the exact Answerlattice tenant, workspace, and actor, so a later active-session change cannot place another workspace's rows under the former cache identity. Failed pre-persistence image cleanup carries the same initiating session. Session deletion and the development-only bulk clear also carry the initiating Answerlattice scope; the DAL compares it with the fresh active scope before the first transaction/read so an obsolete action cannot delete a same-ID session in a later workspace.

User-owned Help Chat writes use a stricter actor-scope contract. New-session save, message append, retry branch replacement, message feedback, rename, delete, and development clear capture the initiating Answerlattice tenant, workspace, and user. The DAL compares all three with fresh active authority before target I/O and rechecks persisted ownership for user-owned existing-session mutations. Async browser completions require the same mounted actor scope, and the Help Chat subtree is keyed by that identity so drafts, query history, feedback state, loading/typing state, selected session, and optimistic rows are destroyed on a tenant, workspace, or actor transition. Platform conversation metadata remains a separate support-authorized mutation and retains its workspace-only initiating contract.

Hard deletion is a separate derived-state path. A deleted Firestore document cannot appear in the nightly `modifiedOn` cursor, so `answerlatticeChatAnalyticsOnDelete` consumes the trusted pre-delete snapshot and rebuilds that session's exact historical UTC day from surviving sessions. Current-day deletion needs no summary write because live reads already use surviving sessions. Invalid/cross-product snapshots are ignored. Canonical source hashing makes duplicate Eventarc delivery a no-op after the first replacement.

When the changed date falls inside the 14-day intelligence source window, recovery also regenerates deterministic feedback and weekly documents—even when the aggregate was already current, because an earlier delivery may have failed between stages. If any recent daily source is partial/malformed, intelligence correctly cannot be regenerated; both derived insight documents are atomically deleted so retry cannot loop forever or leave stale evidence visible. Other failures propagate for retry. The trigger does not delete images or change the explicit deferred media-cleanup contract.

Platform conversation and report state is keyed from `productAccounts.AL`, never the MenuList root tenant/store. Conversation page responses acknowledge the exact Answerlattice workspace before they can replace or append browser state. Local rows, selection, pagination, pending loads, batch status, metadata edits, notes, Weekly Digest, and ROI results are masked or discarded when that workspace changes. Every conversation mutation also passes the initiating workspace into the DAL; the DAL compares it with the fresh active Answerlattice scope before any target document read or write, preventing a same-ID record in a later workspace from receiving an obsolete action.

Analytics dashboard, live-today, pagination, freshness and period-comparison reads bind to the initiating session supplied by their exact Answerlattice SWR key. The DAL must not discard that session and call `getActiveSession()` later: doing so could query a changed workspace under the former cache key or combine historical and live data from different workspaces. Comparison reads derive scope from the authenticated Answerlattice product account and never accept raw tenant/store props as authority.

Aggregate semantics remain literal. `satisfactionRate` in the legacy internal statistics shape is positive feedback divided by total recorded feedback; owner-facing surfaces and exports call it **Positive Feedback Share**. Feedback events are not unique chat responders, so the dashboard does not divide them by chat sessions or call that result response coverage. Negative-feedback knowledge-gap events and chat-session totals have different units and cannot produce knowledge-base coverage or system-health percentages. The Chat Insights system-health block stays absent until a compatible authoritative health source exists.

Conversation-detail tags and CSV/transcript exports follow the same boundary. They show the positive-feedback share or the exact helpful/not-helpful counts and never label message feedback as customer satisfaction. A tie is represented by its counts, not coerced into a negative outcome.

Period comparison also preserves units. Conversation/message movement is a relative percentage. Positive Feedback Share movement is an absolute percentage-point difference and is unavailable when either period has no recorded feedback; the generic trend component carries the unit instead of blindly adding `%`.

Deterministic `insights/.../ai/{feedback,weekly}` writes use schema version 2 and replace the complete derived document rather than merging stale fields. Weekly comparison fields are literal: `volumeChangePercent` is a percentage change and `positiveFeedbackSharePointChange` is a percentage-point change. Either is `null` when its denominator is absent; a missing baseline is never reported as zero change. The client parser maps legacy `volumeChange` / `satisfactionChange` documents into the precise read DTO until the next scheduled rewrite. Feedback insight themes are derived from negative-feedback answer gaps; the document does not mislabel that count as total feedback analyzed.

The platform-only historical backfill surface uses `src/hooks/answerlattice/useAnswerlatticePlatformWorkspaceOptions.ts` and the private `/api/answerlattice/platform/workspaces` control-plane route. That route admits only a current persisted MenuList platform operator who also has a current active/verified `PLATFORM` user in the dedicated Answerlattice project, then reads only Answerlattice `platformSummary/storesSummary`. It never projects MenuList store-summary IDs into the Answerlattice callable. Before a confirmed run, the browser mints a fresh Answerlattice token for the captured workspace and validates its product, role, and store claims. The callable rereads `users/{uId}` and requires matching email, platform role, and durable access revision before it reads the target store. Lease acquisition then rereads that same durable user inside the transaction that performs the first write, so a concurrent revision/role/lifecycle change aborts before the lease is created. The response parser requires the exact requested tenant/workspace/day acknowledgement, unique real calendar dates, bounded counters, and no unknown fields before rendering success.

## Images

New images must be allowlisted image data URLs, maximum 5 MiB, with declared MIME matching encoded content. Files use:

```text
chatSessions/chatimages/{tId}/{sId}/{imageId}
```

Persisted media cleanup is deliberately deferred after compaction, branch replacement, or session deletion because a single session does not prove non-reference across the workspace. Failed search uploads that were never persisted are deleted immediately.

## Permissions

Dedicated and shared Firestore rules require support control for `chatSessions` and `chatAnalytics`. Dedicated and shared Storage rules require the same authority for chat images. `PLATFORM_SUPPORT` is admitted only through the support-operator predicate.

## Cost boundaries

User history is capped at 50 sessions. Admin pages cap at 100 per page, broad statistics/top-question/gap scans at 500, and volume charts at 1,000 sessions across at most 90 days. Complex text search is client-side over the bounded page, not a full-corpus search engine.

## ROI metrics query-parameter boundary

The authenticated ROI endpoint derives `productAccounts.AL` scope before rate limiting or analytics reads, requires current `canManageSupport` authority, uses the scoped session for its exact-workspace aggregate read, and returns the exact tenant/workspace acknowledgement through private response headers. A requested trailing range contains exactly that many UTC buckets: `days - 1` completed daily documents plus today's bounded live bucket; a one-day request performs no historical query. It uses strict bounded numeric parsing, ignores malformed money overrides, and clamps valid overrides to finite server caps. The browser accepts only an exact allowlisted metrics/parameters/date DTO with reconciled counts and the requested workspace; raw internal analytics input is not serialized. Client-supplied values can adjust only the bounded calculation inputs; they cannot expand tenant scope or query volume.

The report is an illustrative planning scenario. Observed inputs are limited to total, Q&A, assistant, positive-feedback and negative-feedback counts from the aggregate contract. Time and cost values use an explicit, returned `assumedMinutesSavedPerConversation` plus hourly support cost and platform cost. The API and UI must not manufacture resolved-conversation counts, response/resolution time, automation rate, customer retention, churn reduction, or revenue protection from these aggregates. Every estimated output is labelled as an estimate; no-payback scenarios serialize `null`, never a non-finite JSON value.

## Conversation CSV spreadsheet formula boundary

Conversation export uses the shared `escapeCSVValue()` helper for every header and row cell. Values beginning with spreadsheet formula prefixes are neutralized before normal CSV quoting, so customer questions, names, tags, or internal metadata cannot become executable formulas when the file is opened in spreadsheet software. The conversation screen must not restore a private CSV escaping implementation.
