# Owner Business Assistant Implementation

**Owner-Facing Name:** Business Health
**Status:** Implemented read-only runtime
**Last Updated:** July 13, 2026

## Implementation Contract

Business Health implements read-only health, analytics, and grounded answers. It does not implement owner actions. Menu, image, theme, publish, special-menu, store, outlet, staff, billing, and external work belong to AI Menu Manager / Menu Manager.

## Feature Flags

The active Business Health flags live in:

- `src/config/features.ts`
- `functions/src/constants/features.ts`

The implementation must include flags for:

- core Business Health visibility
- mobile visibility
- provider-backed answers
- thread/history behavior
- feedback/answer event logging
- platform monitor visibility
- Upstash/server packet cache where configured

The implementation must not include Business Health operation flags.

## API Routes

Active routes:

- `GET /api/owner-business-assistant/current`
- `GET /api/owner-business-assistant/analytics`
- browser callers for current, analytics, locations, thread, and platform monitor read models use `src/lib/ownerBusinessAssistant/clientResponses.ts`, backed by the shared Business Health request policy plus `readJsonResponseWithLimit()` with a 256KB cap. Malformed, oversized, non-OK, or invalid successful read-model responses log `owner_business_assistant_{current|analytics|locations|thread|monitor}_response_{rejected|parse_failed|invalid}` with bounded URL/scope/status metadata before the caller fails closed.
- `POST /api/owner-business-assistant/answer`; browser callers use the same Business Health request policy and parse the answer response through `readOwnerBusinessAssistantAnswerResponseJson()`, backed by `readJsonResponseWithLimit()` with a 32KB cap. Malformed or oversized responses log `owner_business_assistant_answer_response_parse_failed` with bounded project/store/suggested-question/status metadata only, and successful responses must include `data` before the owner answer or thread ID is accepted.
- Business Health project ID boundary: `/business-health?projectId=...`, `OwnerBusinessAssistantScopeSchema`, and `OwnerBusinessAssistantAnswerRequestSchema` all use `src/lib/ownerBusinessAssistant/projectIdBoundary.ts` before selected project IDs can become read-model query scope, answer context-packet scope, browser/server cache keys, or thread message scope. Valid MenuList project IDs keep the existing alphanumeric/underscore/hyphen shape; malformed, whitespace-mutated, path-shaped, or reserved document IDs are dropped from the page query or rejected during request validation. The schema preserves the raw project ID and does not trim before `normalizeOwnerBusinessAssistantProjectId(value) === value`.
- `src/lib/ownerBusinessAssistant/threadIdBoundary.ts`; answer requests, thread persistence, and thread-route reads accept only browser-generated `oba_` runtime thread IDs and reject malformed, whitespace-mutated, reserved, or path-shaped IDs before thread document reads/writes. Browser localStorage recovery replaces stale malformed thread IDs with a fresh `oba_` ID before sending new answer requests. `OwnerBusinessAssistantThreadIdSchema` does not trim before `normalizeOwnerBusinessAssistantThreadId(value) === value`.
- `GET /api/owner-business-assistant/locations`
- session/thread routes where the thread flag is enabled
- feedback routes where feedback logging is enabled; `POST /api/owner-business-assistant/feedback` uses the `DATA_WRITE` limiter with hashed owner, tenant, and store key segments, then an 8KB bounded JSON body before Zod validation, selected-store scope resolution, `VIEW_ANALYTICS` permission, and the feedback document write. The browser feedback hook uses the shared no-store/same-origin/manual-redirect request policy and requires the bounded `{ data: { success: true } }` acknowledgement before returning success.
- selected-store IDs use the shared canonical store-access boundary before mapped-store authorization. A supplied whitespace, leading-zero, exponent, decimal, signed, unsafe or otherwise non-canonical ID returns `400` instead of being coerced to the current or another store.
- Business Health feedback answer ID boundary: feedback `answerId` values use the shared Firestore document-ID guard with an exact raw-value check before the route composes the `ownerBusinessAssistantFeedback` document ID, and the route rechecks the composed feedback doc ID before the write. This blocks whitespace-mutated, path-shaped, or reserved IDs without changing valid server-generated answer IDs.
- Business Health answer-event ID boundary: `src/lib/ownerBusinessAssistant/server/answerEventLogger.ts` rechecks the server-generated answer ID with the shared Firestore document-ID guard and rejects whitespace-mutated IDs before writing `ownerBusinessAssistantAnswerEvents/{answerId}`. Malformed IDs skip only the optional answer-event write; the owner answer and valid thread/feedback behavior stay unchanged.
- `GET /api/platform/owner-business-assistant/monitor`; applies the shared `DATA_READ` gate before answer-event/feedback reads, sanitizes stored answer/feedback text for platform display, and the browser monitor validates the 256KB response envelope before rendering answer-event, source-coverage, feedback, and cost/read metrics. Unexpected route failures log `owner_business_assistant_monitor_route_failed` with bounded request-path metadata and source error name/code/status only.
- Server context-packet cache read, index-read, write, and invalidation failures remain non-blocking but now log bounded `owner_business_assistant_packet_cache_{index_read|read|write|invalidate}_failed` diagnostics with cache-key/index-key and tenant/store/project/profile presence-length metadata, counts, fixed fallback policies, and normalized source error metadata only. They do not log raw Upstash keys, tenant IDs, store IDs, project IDs, context packets, answers, or Redis exception text.

Removed route class:

- Business Health operation execution route

Route requirements:

- authenticate the owner session
- require `VIEW_ANALYTICS` for the desktop `/business-health` route, matching the mobile Business Health entry gate
- validate tenant/store/project access
- validate payloads with schemas before reads/provider calls
- rate-limit provider-backed answers before model calls
- keep errors generic
- avoid sensitive logs
- keep browser answer response parsing bounded and fail closed on malformed answer payloads
- keep read/write metrics compact

## Server Library

Active server pieces:

- context packet builder
- shared persisted read-model schemas/projectors for Firestore and Redis packets
- context packet cache and invalidation
- answer resolver and deterministic fallbacks
- domain capability matrix
- refusals and analytics-period resolver
- thread store
- answer event logger
- feedback handling

Removed server pieces:

- operation registry
- operation access
- operation executor
- operation schemas
- operation target resolver
- operation draft builder
- public-truth operation guard
- check workflow service

## Types and Schemas

Business Health answer artifacts are read-only. Supported artifacts include text, metrics, tables, trend series, and source/freshness information.

Types and schemas must not expose:

- operation definition types
- operation-option artifacts
- operation catalogs
- operation target kinds
- operation request payloads

## Desktop UI

Desktop surfaces:

- owner dashboard Business Health card
- Business Health analytics strip
- full `/business-health` route
- project scope selector
- location summary
- question composer
- read-only priority checks
- Public Truth readiness card with eight read-only modules: basics, QR link health, menu/service clarity, WhatsApp action link, hours, photo/visual identity, Google profile handoff, and menu freshness
- source/freshness disclosure

Removed desktop surface:

- Business Health operation sheet

Priority checks can show what to inspect, but not Open/Reviewed/Dismiss action controls.

## Mobile UI

Mobile surfaces:

- MobileShell More entry
- MobileShell Business Health sub-screen
- mobile project selector
- mobile analytics strip
- mobile question composer
- read-only checks and answers
- compact Public Truth readiness modules from the shared owner hook, including Google profile handoff and menu freshness

Removed mobile surface:

- Business Health operation sheet

Mobile Business Health must stay inside `MobileShell` and must not route-bypass to desktop.

## Firestore and Storage

Active collections are compact read/monitoring collections only. Removed workflow collections:

- Business Health operation records
- Business Health operation drafts

Business Health must not store generated media or base64 payloads. Heavy artifacts are not part of the current Business Health runtime.

The current-health, daily-snapshot, and analytics-index writers replace their complete sanitized documents. They must not use merge writes because optional facts legitimately disappear as source availability and project scope change. The multi-location writer alone keeps a merge write for its single-store map entry, preserving sibling store summaries.

The context-packet builder parses stored current-health and analytics-index documents through `readModelBoundary.ts` with expected tenant/store identity. It never forwards a raw `DocumentData` object. Unknown/storage-only fields are stripped recursively by the schema, invalid persisted documents use bounded fallbacks, and cached packets are accepted only when their packet, health, and cache-key tenant/store/project identities match.

## Platform Monitor

The platform monitor can show:

- answer events
- unsupported domains
- source coverage
- feedback
- route read/write metrics
- provider cost where available

The platform monitor must not show operation usage or recent operation records.

## Verification

`npm run verify:owner-business-assistant` must prove:

- operation support files remain removed
- operation endpoint is absent from constants
- operation flags are absent
- operation schemas/types are absent
- desktop/mobile operation sheets are absent
- context packets do not include an operation catalog
- Business Health remains cache-first and bounded
- current, analytics, locations, thread, and platform monitor callers use the shared bounded read-model response parser and do not call `response.json()` directly
- thread route params and answer request thread IDs use the shared `oba_` runtime ID boundary before `ownerBusinessAssistantThreads` reads/writes
- answer hook response parsing is capped, logs `owner_business_assistant_answer_response_parse_failed`, rejects invalid response shape through the owner-safe error sentinel, and does not use `response.json().catch(() => null)`
- platform monitor route and browser response failures use bounded runtime diagnostics
