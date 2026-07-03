# Owner Business Assistant Firebase Model

**Owner-Facing Name:** Business Health
**Status:** Compact read-only model
**Last Updated:** June 30, 2026

## Cost Position

Business Health must stay compact by default. It is a read model and answer layer, not an event stream or action workflow engine.

`npm run verify:owner-business-health-boundary` is the read-only source gate for the active Business Health route/API/mobile/docs boundary. No public truth writes belong to this feature; remaining writes stay bounded to existing summary, thread, feedback, and answer-event behavior controlled by Business Health flags.

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

## Scheduler Discipline

Business Health scheduled work belongs in existing consolidated MenuList scheduler discipline with bounded reads, leases, and explicit cost notes. No standalone cleanup scheduler should exist for Business Health action records because those records are no longer produced.

## Storage

Core Business Health uses no Firebase Storage. Generated images, imports, and heavy operation artifacts belong to Menu Manager or their existing feature-specific systems, not Business Health.

## Rules

Firestore rules should keep Business Health read models protected behind APIs unless an existing safe client-read pattern is explicitly documented.

Direct client writes to Business Health monitor/thread/feedback docs must remain blocked unless the route is explicitly designed for that write. The feedback API route is the designed owner feedback write path: it rate-limits first, rejects bodies above 8KB before schema validation, verifies selected-store scope and `VIEW_ANALYTICS`, then writes one `ownerBusinessAssistantFeedback` document with a 90-day expiry.

July 1 feedback response acknowledgement hardening adds no Firestore reads/writes/deletes beyond the existing feedback route write, no Storage operations, no Cloud Functions, no rules, no indexes, no schema changes, and no owner-facing settings. It only changes the browser hook to use the shared request policy and a 16KB bounded response parser, requiring `{ data: { success: true } }` before returning saved feedback success.

June 29 shared guard hardening is Firebase-cost neutral. The Business Health API guard keeps the same route-specific prefixes, limiter profiles, and request ordering, but hashes owner, tenant, and store key segments before storage in Upstash and records only presence/length metadata for rate-limit and selected-store violation scope diagnostics. June 30 follow-up: the same guard now uses bounded route security metadata for selected-store, tenant-access, and rate-limit security events instead of raw `buildSecurityContext()` output. This resets existing Business Health owner-route buckets once and changes no Firestore reads/writes/deletes, provider calls, cache invalidations, rules, indexes, schema fields, Cloud Function logic, or owner UI behavior.

There are no active Firestore rules for removed Business Health operation records or operation drafts.

Platform monitor diagnostics are cost-neutral. `GET /api/platform/owner-business-assistant/monitor` applies the shared `DATA_READ` gate before answer-event and feedback reads, and stores only HMAC-hashed platform user key material in the limiter key. Rate-limited requests perform no monitor Firestore reads. Unexpected route failures log `owner_business_assistant_monitor_route_failed` through runtime diagnostics with bounded request-path/source-error metadata only. Browser monitor responses are parsed through the shared 256KB `clientResponses` reader and log `owner_business_assistant_monitor_response_{rejected|parse_failed|invalid}` with bounded endpoint/status metadata when the envelope is rejected, oversized, malformed, or invalid. This adds no Firestore writes, indexes, rules, cache tags, provider calls, Cloud Functions, or deploy requirement.

Browser answer request/response diagnostics are cost-neutral. `useOwnerBusinessAssistantAnswer()` sends `/api/owner-business-assistant/answer` with same-origin credentials, no browser cache, and manual redirect handling, caps response parsing at 32KB, and logs `owner_business_assistant_answer_response_parse_failed` or `owner_business_assistant_answer_response_invalid` with bounded project/store/suggested-question/status metadata only. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, API routes, rules, indexes, schema changes, Cloud Function logic, owner settings, Firebase deploy requirement, or Vercel deploy action.

Browser read-model request/response diagnostics are cost-neutral. `useOwnerBusinessHealthCurrent()`, `useOwnerBusinessAnalyticsIndex()`, `useOwnerBusinessLocationsSummary()`, `useOwnerBusinessAssistantThread()`, and the platform monitor send current, analytics, locations, thread, and monitor requests with same-origin credentials, no browser cache, and manual redirect handling, then parse responses through the shared 256KB `clientResponses` reader before SWR caching or platform state updates. Non-OK, malformed, oversized, or invalid successful envelopes log bounded response-kind/URL/scope/status metadata only. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, API routes, rules, indexes, schema changes, Cloud Function logic, owner settings, Firebase deploy requirement, or Vercel deploy action.

## Cost Acceptance

Opening Business Health should use cached data or a bounded current-health read. Asking a question should reuse context packets where possible and write at most the bounded thread/event records enabled by flags. Submitting answer feedback writes at most one capped feedback document after bounded body admission and permission checks. It must not create action workflow documents.
