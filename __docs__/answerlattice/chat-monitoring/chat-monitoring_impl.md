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

The authenticated ROI endpoint uses strict bounded numeric parsing. It ignores malformed money overrides, clamps valid overrides to finite server caps, and does not change the optimized chat statistics read path. Client-supplied values can adjust only the bounded calculation inputs; they cannot expand tenant scope or query volume.

## Conversation CSV spreadsheet formula boundary

Conversation export uses the shared `escapeCSVValue()` helper for every header and row cell. Values beginning with spreadsheet formula prefixes are neutralized before normal CSV quoting, so customer questions, names, tags, or internal metadata cannot become executable formulas when the file is opened in spreadsheet software. The conversation screen must not restore a private CSV escaping implementation.
