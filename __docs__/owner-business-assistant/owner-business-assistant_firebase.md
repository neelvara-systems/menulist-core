# Owner Business Assistant Firebase Model

**Owner-Facing Name:** Business Health
**Status:** Compact read-only model
**Last Updated:** August 14, 2026

## Weekly Menu Review Cost Boundary

Weekly Menu Review adds zero Firestore documents, writes, indexes, listeners, Functions, queues, Storage objects, or AI calls. Desktop and mobile derive it from the existing bounded analytics-index and current-health responses. The review itself performs no Firebase operation.

## Cost Position

Business Health must stay compact by default. It is a read model and answer layer, not an event stream or action workflow engine.

`npm run verify:owner-business-health-boundary` is the read-only source gate for the active Business Health route/API/mobile/docs boundary. No public truth writes belong to this feature; remaining writes stay bounded to existing summary, thread, feedback, and answer-event behavior controlled by Business Health flags.

The Public Truth owner fix list is Firebase-cost neutral. It is derived in memory from the existing owner readiness modules and adds no Business Health reads, writes, deletes, Storage operations, Cloud Functions, indexes, rules, provider calls, or public-truth mutations.

## Allowed Firestore Shape

Business Health may use bounded documents for:

- current health summary
- daily health snapshots
- analytics period index
- multi-location summary
- compact owner threads
- answer events
- feedback
- platform monitoring

Every query must be tenant/store scoped and bounded.

The scheduler treats `ownerBusinessHealthCurrent_*`, same-day `ownerBusinessHealthSnapshot_*`, and `ownerBusinessAnalyticsIndex_*` payloads as complete authoritative read models. Each run sanitizes and replaces those documents so an optional teaser, period, project summary, source reference, or legacy field that is no longer produced is removed rather than retained by Firestore merge semantics. `ownerBusinessHealthMultiLocation_*` is intentionally different: it merges only `stores.{sId}` plus current metadata so refreshing one location preserves every sibling location.

The analytics index does not trust deterministic source document paths alone.
Each admitted dashboard row must contain the exact requested tenant, store,
project, `ownerDashboardSummary` kind and local generation date. Each admitted
daily row must contain that exact scope plus `customer`, `daily`, `menu`, and
matching `date`/`localDate` discriminators. A conflicting or incomplete
persisted row is omitted before owner metrics and source references are
constructed. This boundary adds no Firestore operations, indexes or schema
fields.

Server reads do not cast these persisted documents into response types. `src/lib/ownerBusinessAssistant/readModelBoundary.ts` validates every supported nested structure, requires the stored tenant/store identity to match the requested document scope, and returns a schema-projected DTO. Firestore-only `kind`/`expiresAt` fields and unknown legacy fields are not copied into context packets or JSON responses. An invalid current document emits a bounded diagnostic and falls back to `not_ready`; an invalid analytics document becomes unavailable. Redis context-packet reads apply the same schemas and require packet, health, and cache-key tenant/store/project identity to agree before a cached packet is accepted.

The scheduled guest-feedback input is also a persisted-data boundary. `buildOwnerBusinessFeedbackSummary.ts` admits only records whose tenant/store scope matches the query, document and project IDs are canonical, rating/status/attention/source invariants agree, creator is `guest`, timestamps are valid persisted timestamp values with expiry after creation, optional business dates are valid, and optional messages remain within the writer limit. Invalid or legacy-corrupt rows are omitted before counts, themes, source references, or owner-facing snippets are built, and one bounded `OWNER_BUSINESS_FEEDBACK_INVALID_RECORD` warning records only the invalid count, at most three document IDs, and the expected tenant/store scope. The query remains bounded to 81 reads and at most 80 admitted rows; this hardening adds no Firestore reads, writes, indexes, rules, or Storage operations.

## Removed Workflow Storage

Business Health no longer has workflow storage for owner operations. Operation records and operation drafts are removed from the active contract.

They must not be present in active database constants, rules, scheduler cleanup, platform monitor reads, or UI docs.

## Forbidden Cost Patterns

- Firestore write per token
- Firestore document per message fragment
- Firestore document per provider chunk
- Firestore document per card render
- unbounded listener over all sessions/proposals/history
- opening Business Health by scanning historical daily sessions
- raw project/menu/store scans at answer time
- base64 images in Firestore
- Business Health generated-media storage
- action/draft workflow writes

## Context Packet Cache

Context packet cache keys must include tenant, store, packet profile, and selected project where the packet is project scoped.

Active packet profiles:

- `health_card`
- `analytics_periods`
- `owner_question_basic`
- `multi_location_summary`

Context packets must not include an action catalog.

Server packet cache diagnostics are cost-neutral. Upstash context-packet cache read/index-read/write/invalidation failures still fall back to Firestore-backed packets, skipped cache writes, empty indexes, or best-effort invalidation, but now log bounded `owner_business_assistant_packet_cache_index_read_failed`, `owner_business_assistant_packet_cache_read_failed`, `owner_business_assistant_packet_cache_write_failed`, and `owner_business_assistant_packet_cache_invalidate_failed` diagnostics. This adds no Firestore reads/writes/deletes, no Storage operations, no provider calls, no API routes, no rules, no indexes, no schema fields, no Cloud Function source changes, no owner settings, and no deploy requirement.

Malformed, extra-field, or scope-mismatched Redis packets are treated as cache misses and emit `owner_business_assistant_packet_cache_invalid` with bounded cache metadata. This validation performs no Firestore operation and prevents a packet stored under the wrong cache identity from crossing owner request scope.

## Scheduler Discipline

Business Health scheduled work belongs in existing consolidated MenuList scheduler discipline with bounded reads, leases, and explicit cost notes. No standalone cleanup scheduler should exist for Business Health action records because those records are no longer produced.

Retention is independent of feature activation. The existing daily `owner_business_assistant_cleanup` task always processes expiry markers for Business Health snapshots, answer events, feedback, and threads, even when the corresponding feature/write flags are disabled. Disabling an owner surface stops new writes but must not extend the declared retention of already-persisted private conversation or telemetry rows. Each family remains capped at 50 expiry-matched rows per leased run; no standalone scheduler or new index is required.

Malformed persisted guest feedback is skipped inside the existing scoring run rather than failing the complete store job or becoming Business Health truth. This normalization executes after the tenant/store-scoped bounded query and before any derived read-model write.

## Storage

Core Business Health uses no Firebase Storage. Generated images, imports, and heavy operation artifacts belong to Menu Manager or their existing feature-specific systems, not Business Health.

## Rules

Firestore rules should keep Business Health read models protected behind APIs unless an existing safe client-read pattern is explicitly documented.

Direct client writes to Business Health monitor/thread/feedback docs must remain blocked unless the route is explicitly designed for that write. The feedback API route is the designed owner feedback write path: it rate-limits first, rejects bodies above 8KB before schema validation, verifies selected-store scope and `VIEW_ANALYTICS`, then writes one `ownerBusinessAssistantFeedback` document with a 90-day expiry.

The deterministic answer/user feedback row is an exact replacement, not a merge. The server writes only the current validated `answerId`, `rating`, optional current `reason`/`question`, exact selected tenant/store/user identity, source, creation time and expiry. Re-submitting without optional text removes the former text instead of retaining it until cleanup. This changes no read count and retains one write per accepted submission.

Thread ID admission is shape-bound. Browser-created thread IDs use the shared `oba_` runtime ID helper; answer requests, thread persistence, and `/api/owner-business-assistant/thread/{threadId}` reads reject malformed, whitespace-mutated, reserved, or path-shaped thread IDs before `ownerBusinessAssistantThreads` document reads/writes. `OwnerBusinessAssistantThreadIdSchema` does not trim before `normalizeOwnerBusinessAssistantThreadId(value) === value`. If localStorage contains a stale malformed thread ID, the browser hook replaces it with a fresh `oba_` ID before sending the answer request. This changes no normal thread read/write counts.

Thread ownership is actor-bound. Compact and nested tenant/store/actor session aliases must agree before Business Health scope admission. Existing `ownerBusinessAssistantThreads/{threadId}` must match exact `tId`, `sId`, and `userId` before append or read; legacy rows without actor ownership fail closed. The API returns only allowlisted thread metadata and message fields, so unknown persistence-only fields cannot reach the browser. Valid operations retain one thread read and, for append, one transaction write; no rule, index, collection, Function, Storage, or cache change applies.

The browser creates its valid `oba_` ID before the first answer write. A read of that not-yet-persisted ID and a read of any foreign-scope row now return the same private empty envelope after selected-store permission admission and the one exact document read. This prevents existence enumeration while keeping first use out of an error state; owned persisted rows still receive allowlisted metadata and messages only.

Browser thread ownership mirrors that server contract. `src/lib/ownerBusinessAssistant/clientScope.ts` requires exact agreement between compact and nested actor aliases in addition to numeric tenant/store scope. Local thread keys include encoded actor and project components, thread SWR identity includes the actor, and every personal hook memoization watches actor aliases. Changing accounts inside the same tenant/store cannot reuse the previous actor's thread ID or personal response state. This changes no Firestore reads/writes, collection shape, rule, index, Storage object, Function, server packet-cache key, or deployment requirement.

Business Health project ID admission is cost-neutral. `/business-health?projectId=...`, `OwnerBusinessAssistantScopeSchema`, and `OwnerBusinessAssistantAnswerRequestSchema` validate selected project IDs through `src/lib/ownerBusinessAssistant/projectIdBoundary.ts` before those values can become current/analytics query scope, answer context-packet scope, browser/server cache keys, or thread message project scope. The schema preserves raw values and does not trim before `normalizeOwnerBusinessAssistantProjectId(value) === value`. Malformed, whitespace-mutated, path-shaped, or reserved IDs stop before scoped Business Health reads, context-packet cache lookups/writes, thread writes, answer-event writes, feedback writes, provider calls, or owner-facing cache keys. This adds no Firestore reads/writes/deletes for valid requests, no Storage operations, no Cloud Functions, no provider calls, no cache invalidations, no rules/indexes/schema-field changes, no owner-facing setting, no Firebase deploy requirement, and no Vercel deploy action.

Business Health feedback answer-ID admission is cost-neutral. Feedback `answerId` values now use the shared Firestore document-ID guard plus an exact raw-value check before the route composes the `ownerBusinessAssistantFeedback` document ID, and the route rechecks the composed doc ID before writing. Malformed, whitespace-mutated, path-shaped, or reserved IDs stop before the feedback write. This adds no Firestore reads/writes/deletes beyond the existing valid feedback write, Storage operations, provider calls, cache invalidations, rules, indexes, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action.

The feedback document identity is `v2_` plus a SHA-256 digest of the exact
tenant, store, answer, and actor tuple. This retains one replacement write per
scoped answer/actor while preventing a shared actor and answer ID from
colliding across stores or tenants. Existing pre-v2 documents are not migrated
or rewritten; the platform monitor may show them until the maintained 90-day
TTL cleanup removes them.

Business Health answer-event ID admission is cost-neutral. `src/lib/ownerBusinessAssistant/server/answerEventLogger.ts` rechecks the server-generated answer ID with the shared Firestore document-ID guard plus an exact raw-value check before writing `ownerBusinessAssistantAnswerEvents/{answerId}`. Malformed or whitespace-mutated IDs skip only the optional answer-event write before Firestore access. This adds no Firestore reads/writes/deletes for valid requests, Storage operations, provider calls, cache invalidations, rules, indexes, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action.

July 1 feedback response acknowledgement hardening adds no Firestore reads/writes/deletes beyond the existing feedback route write, no Storage operations, no Cloud Functions, no rules, no indexes, no schema changes, and no owner-facing settings. It only changes the browser hook to use the shared request policy and a 16KB bounded response parser, requiring `{ data: { success: true } }` before returning saved feedback success.

June 29 shared guard hardening is Firebase-cost neutral. The Business Health API guard keeps the same route-specific prefixes, limiter profiles, and request ordering, but hashes owner, tenant, and store key segments before storage in Upstash and records only presence/length metadata for rate-limit and selected-store violation scope diagnostics. June 30 follow-up: the same guard now uses bounded route security metadata for selected-store, tenant-access, and rate-limit security events instead of raw `buildSecurityContext()` output. This resets existing Business Health owner-route buckets once and changes no Firestore reads/writes/deletes, provider calls, cache invalidations, rules, indexes, schema fields, Cloud Function logic, or owner UI behavior.

July 11 selected-store admission is also Firebase-cost neutral. The scope schema and server guard reuse `normalizeStoreSwitchStoreId()` and reject a supplied non-canonical store ID before mapped-store authorization, permission reads, context-packet work, thread/feedback writes or answer work. Valid canonical selected-store requests retain their existing reads/writes and response behavior.

There are no active Firestore rules for removed Business Health operation records or operation drafts.

Platform monitor diagnostics are cost-neutral. `GET /api/platform/owner-business-assistant/monitor` applies the shared `DATA_READ` gate before answer-event and feedback reads, and stores only HMAC-hashed platform user key material in the limiter key. Rate-limited requests perform no monitor Firestore reads. Unexpected route failures log `owner_business_assistant_monitor_route_failed` through runtime diagnostics with bounded request-path/source-error metadata only. Browser monitor responses are parsed through the shared 256KB `clientResponses` reader and log `owner_business_assistant_monitor_response_{rejected|parse_failed|invalid}` with bounded endpoint/status metadata when the envelope is rejected, oversized, malformed, or invalid. This adds no Firestore writes, indexes, rules, cache tags, provider calls, Cloud Functions, or deploy requirement.

Browser answer request/response diagnostics are cost-neutral. `useOwnerBusinessAssistantAnswer()` sends `/api/owner-business-assistant/answer` with same-origin credentials, no browser cache, and manual redirect handling, caps response parsing at 32KB, and logs `owner_business_assistant_answer_response_parse_failed` or `owner_business_assistant_answer_response_invalid` with bounded project/store/suggested-question/status metadata only. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, API routes, rules, indexes, schema changes, Cloud Function logic, owner settings, Firebase deploy requirement, or Vercel deploy action.

Browser read-model request/response diagnostics are cost-neutral. `useOwnerBusinessHealthCurrent()`, `useOwnerBusinessAnalyticsIndex()`, `useOwnerBusinessLocationsSummary()`, `useOwnerBusinessAssistantThread()`, and the platform monitor send current, analytics, locations, thread, and monitor requests with same-origin credentials, no browser cache, and manual redirect handling, then parse responses through the shared 256KB `clientResponses` reader before SWR caching or platform state updates. Non-OK, malformed, oversized, or invalid successful envelopes log bounded response-kind/URL/scope/status metadata only. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, API routes, rules, indexes, schema changes, Cloud Function logic, owner settings, Firebase deploy requirement, or Vercel deploy action.

Persisted browser read models use the same runtime response projectors. Current, analytics, and locations hooks load cached values as `unknown`; malformed DTOs are removed and become ordinary cache misses before SWR fallback admission. Valid cache hits keep the same read savings, while invalid entries may cause the already-expected bounded API refresh. This changes no server cache key, Firestore document, write, rule, index, Storage object, Function, or deployment requirement.

July 16 mobile/answer admission hardening is Firebase-cost neutral for valid requests. Desktop and MobileShell permission gates stop unauthorized UI reads, while every Business Health API retains its independent `VIEW_ANALYTICS` check. The answer route now performs optional SAFE_MODE access only after bounded body, selected-store, and permission admission; rejected requests therefore avoid that configuration read. If provider-backed answering is enabled later, an unavailable AI rate-limit provider fails closed with 503 before model work. Deterministic answers remain `DATA_READ`, the provider client remains inactive, and no Firestore document, rule, index, Storage object, Function, cache invalidation, or deployment requirement was added.

## Cost Acceptance

Opening Business Health should use cached data or a bounded current-health read. Asking a question should reuse context packets where possible and write at most the bounded thread/event records enabled by flags. Submitting answer feedback writes at most one capped feedback document after bounded body admission and permission checks. It must not create action workflow documents.
